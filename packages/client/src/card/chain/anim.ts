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
    /** Đòn đánh: free = miễn phí từ buff, cardless = Đấu sĩ đánh nhanh không cần lá */
    mode?: "free" | "cardless"
}

export interface ChainAnim {
    links: LinkView[]
    /** mắt xích đang giải quyết */
    resolving: number | null
    done: number[]
    /** Thứ tự giải quyết (cuối về đầu) */
    order: number[]
}

const STEP_MS = 1000
const END_MS = 1100

export const linksOf = (c: cg.Chain): LinkView[] => c.links.map((l) => ({
    n: l.n, side: l.side, kind: l.kind, card: l.card, actor: l.actor, targets: l.targets, quick: l.quick, mode: l.mode,
}))

/** Trả về hoạt hình đang chạy (null khi không có) */
export function useChainAnim(): ChainAnim | null {
    const { view, lastEvents, tick } = useCard()
    const known = useRef<LinkView[]>([])
    const timers = useRef<number[]>([])
    const [anim,
        setAnim] = useState<ChainAnim | null>(null)

    // nhớ các mắt xích từ view
    useEffect(() => {
        if (view?.chain) known.current = linksOf(view.chain)
    },
    [view?.chain])

    useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)),
        [])

    useEffect(() => {
        if (!tick) return
        const resolves: number[] = []
        for (const e of lastEvents) {
            if (e.t === "chainAdd") {
                if (e.n === 1) known.current = []
                const l: LinkView = {
                    n: e.n, side: e.side, kind: e.kind, card: e.card, actor: e.actor, targets: e.targets, quick: e.n > 1,
                }
                known.current = [...known.current.filter((x) => x.n !== e.n),
                    l].sort((a, b) => a.n - b.n)
            } else if (e.t === "chainResolve") resolves.push(e.n)
        }
        if (!resolves.length) return
        timers.current.forEach((t) => window.clearTimeout(t))
        timers.current = []
        const links = [...known.current]
        const order = resolves
        const at = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn,
            ms)) }
        setAnim({
            links, resolving: order[0], done: [], order,
        })
        order.forEach((n, i) => {
            if (i === 0) return
            at(i * STEP_MS,
                () => setAnim({
                    links, resolving: n, done: order.slice(0,
                        i), order,
                }))
        })
        at(order.length * STEP_MS,
            () => setAnim({
                links, resolving: null, done: order, order,
            }))
        at(order.length * STEP_MS + END_MS,
            () => { setAnim(null); known.current = [] })
    },
    [tick])

    return anim
}
