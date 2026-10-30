// Hoạt hình giải quyết Chuỗi: view.chain đã null khi chainResolve đến, nên ta dựng lại các mắt xích từ sự kiện chainAdd.
import {
    useEffect, useRef, useState
} from "react"
import {
    cg
} from "@starci/shared"
import {
    useCard
} from "../store"

export interface LinkView {
    n: number
    side: cg.Side
    kind: "card" | "attack"
    card?: cg.Card
    actor?: string
    targets: string[]
    quick: boolean
    /** Đấu sĩ đánh không cần lá */
    mode?: "cardless"
}

export interface ChainAnim {
    links: LinkView[]
    /** mắt xích đang giải quyết */
    resolving: number | null
    done: number[]
    cancelled: number[]
    /** Thứ tự giải quyết (cuối về đầu) */
    order: number[]
}

const END_MS = 450

export const linksOf = (c: cg.Chain): LinkView[] => c.links.map((l) => ({
    n: l.n, side: l.side, kind: l.kind, card: l.card, actor: l.actor, targets: l.targets, quick: l.quick, mode: l.mode,
}))

/** Trả về hoạt hình đang chạy (null khi không có) */
export function useChainAnim(): ChainAnim | null {
    const { view, log } = useCard()
    const known = useRef<LinkView[]>([])
    const timers = useRef<number[]>([])
    const seen = useRef(0)
    const resolved = useRef<number[]>([])
    const cancelled = useRef<number[]>([])
    const [anim,
        setAnim] = useState<ChainAnim | null>(null)
    useEffect(() => {
        if (view?.chain) known.current = linksOf(view.chain)
    },
    [view?.chain])
    useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)),
        [])
    useEffect(() => {
        for (const entry of log) {
            if (entry.n <= seen.current) continue
            seen.current = entry.n
            const e = entry.e
            if (e.t === "chainAdd") {
                if (e.n === 1) {
                    timers.current.forEach((t) => window.clearTimeout(t))
                    timers.current = []
                    known.current = []
                    resolved.current = []
                    cancelled.current = []
                    setAnim(null)
                }
                const link: LinkView = {
                    n: e.n, side: e.side, kind: e.kind, card: e.card, actor: e.actor, targets: e.targets, quick: e.n > 1
                }
                known.current = [...known.current.filter((x) => x.n !== e.n),
                    link].sort((a, b) => a.n - b.n)
            } else if (e.t === "chainCancel") {
                cancelled.current.push(e.n)
                setAnim((old) => old ? {
                    ...old, cancelled: [...cancelled.current]
                } : old)
            } else if (e.t === "chainResolve") {
                const done = [...resolved.current]
                resolved.current.push(e.n)
                setAnim({
                    links: [...known.current], resolving: e.n, done, cancelled: [...cancelled.current], order: [...known.current].reverse().map((x) => x.n)
                })
            } else if (e.t === "chainEnd") {
                setAnim({
                    links: [...known.current], resolving: null, done: [...resolved.current], cancelled: [...cancelled.current], order: [...resolved.current]
                })
                timers.current.push(window.setTimeout(() => { setAnim(null); known.current = []; resolved.current = [] },
                    END_MS))
            }
        }
    },
    [log])

    return anim
}
