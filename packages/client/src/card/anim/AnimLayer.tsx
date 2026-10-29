// Lớp hoạt ảnh phủ lên sân thẻ bài: xếp hàng các lô sự kiện (snap.lastEvents) và chạy lần lượt.
// Không chặn thao tác (pointer-events: none); chỉ dùng transform/opacity; tôn trọng prefers-reduced-motion.
import {
    useCallback, useEffect, useRef, useState, type CSSProperties
} from "react"
import {
    cg
} from "@starci/shared"
import {
    useCard
} from "../store"
import {
    CardFace, HeroFace
} from "./CardFace"
import {
    reducedMotion
} from "./helpers"
import {
    runBatch, type Fx, type SpriteSpec
} from "./plan"
import "./anim.css"

type GameEvent = cg.GameEvent
type Sprite = SpriteSpec & { id: number }

const MAX_QUEUE = 3

function SpriteView({ sp }: { sp: Sprite }) {
    switch (sp.kind) {
    case "card": return <div className="an-sp an-card"><CardFace card={sp.card} name={sp.name} /></div>
    case "hero": return <div className="an-sp an-card"><HeroFace hero={sp.hero} name={sp.name} /></div>
    case "orb": return (
        <div className={`an-sp an-orb t-${sp.tint}`}>
            {sp.icon ? <img src={sp.icon} alt="" draggable={false} onError={(e) => e.currentTarget.remove()} /> : null}
        </div>
    )
    case "burst": return <div className={`an-sp an-burst t-${sp.tint}`} />
    case "icon": return <div className="an-sp an-icon"><img src={sp.src} alt="" draggable={false} onError={(e) => { e.currentTarget.style.visibility = "hidden" }} /></div>
    case "back": return (
        <div className="an-sp an-mini">
            <img className="an-back" src="/ui/card_back.png" alt="" draggable={false} />
            {sp.face ? <div className="an-front"><CardFace card={sp.face} name={sp.name ?? ""} /></div> : null}
        </div>
    )
    }
}

export function AnimLayer() {
    const { tick, lastEvents } = useCard()
    const [sprites,
        setSprites] = useState<Sprite[]>([])
    const waiting = useRef(new Map<number, (el: HTMLElement) => void>())
    const queue = useRef<GameEvent[][]>([])
    const running = useRef(false)
    const alive = useRef(true)
    const seq = useRef(0)
    const lastTick = useRef(tick)
    const speed = useRef(1)

    useEffect(() => {
        alive.current = true
        return () => { alive.current = false }
    },
    [])

    const spawn = useCallback((spec: SpriteSpec) => new Promise<HTMLElement>((resolve) => {
        const id = ++seq.current
        waiting.current.set(id,
            resolve)
        setSprites((s) => [...s,
            {
                ...spec, id
            }])
    }),
    [])
    const drop = useCallback((el: HTMLElement) => {
        const id = Number(el.dataset.anId)
        setSprites((s) => s.filter((x) => x.id !== id))
    },
    [])

    const fx = useRef<Fx>({
        spawn, drop, t: (ms) => ms * speed.current
    })

    const pump = useCallback(async () => {
        if (running.current) return
        running.current = true
        while (queue.current.length && alive.current) {
            if (queue.current.length > MAX_QUEUE) queue.current.splice(0,
                queue.current.length - MAX_QUEUE)
            speed.current = queue.current.length > 1 ? .45 : 1
            const batch = queue.current.shift()!
            if (reducedMotion()) continue
            await runBatch(batch,
                fx.current,
                () => alive.current)
            setSprites([])
        }
        running.current = false
    },
    [])

    useEffect(() => {
        if (tick === lastTick.current) return
        lastTick.current = tick
        if (!lastEvents.length || reducedMotion()) return
        queue.current.push(lastEvents)
        void pump()
    },
    [tick,
        lastEvents,
        pump])

    return (
        <div className="an-layer" aria-hidden="true">
            {sprites.map((sp) => (
                <div
                    key={sp.id}
                    className="an-wrap"
                    data-an-id={sp.id}
                    ref={(el) => {
                        const r = waiting.current.get(sp.id)
                        if (el && r) {
                            waiting.current.delete(sp.id)
                            const inner = el.firstElementChild as HTMLElement
                            inner.dataset.anId = String(sp.id)
                            r(inner)
                        }
                    }}
                    style={{
                        display: "contents"
                    } as CSSProperties}
                >
                    <SpriteView sp={sp} />
                </div>
            ))}
        </div>
    )
}
