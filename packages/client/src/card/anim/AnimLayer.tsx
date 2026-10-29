// Lớp hoạt ảnh phủ lên sân thẻ bài: xếp hàng các lô sự kiện (snap.lastEvents) và chạy lần lượt.
// Không chặn thao tác (pointer-events: none); chỉ dùng transform/opacity; tôn trọng prefers-reduced-motion.
import {
    RichText
} from "../RichText"
import {
    useCallback, useEffect, useRef, useState, type CSSProperties
} from "react"
import {
    cg
} from "@starci/shared"
import {
    applyToDisplay, setDisplayLag, snapDisplay, useCard
} from "../store"
import {
    CardFace, HeroFace
} from "./CardFace"
import {
    reducedMotion
} from "./helpers"
import {
    memoHandRects, runBatch, type Fx, type SpriteSpec
} from "./plan"
import {
    holdCards, releaseAll, releaseCard
} from "./pending"
import {
    landImpacts, queueImpacts
} from "./impacts"
import "./anim.css"

type GameEvent = cg.GameEvent
type Sprite = SpriteSpec & { id: number }

const MAX_QUEUE = 4

/** uid các lá vào tay trong lô (rút, trả về tay, tạo vào tay, trộm) */
function arrivingUids(batch: GameEvent[]): string[] {
    const out: string[] = []
    for (const e of batch) {
        if (e.t === "draw" || e.t === "drawAuto" || e.t === "returnToHand" || e.t === "steal") out.push(e.card.uid)
        else if (e.t === "create" && e.zone === "hand") out.push(e.card.uid)
    }
    return out
}

function SpriteView({ sp }: { sp: Sprite }) {
    switch (sp.kind) {
    case "card": return <div className={`an-sp an-card${sp.tone ? ` tone-${sp.tone}` : ""}`}><CardFace card={sp.card} name={sp.name} /></div>
    case "hero": return <div className="an-sp an-card"><HeroFace hero={sp.hero} name={sp.name} /></div>
    case "heroflip": return (
        <div className="an-sp an-flip">
            <div className="an-flip-in">
                <img className="an-fl-b" src="/ui/card_back.png" alt="" draggable={false} />
                <div className="an-fl-f"><HeroFace hero={sp.hero} name={sp.name} /></div>
            </div>
        </div>
    )
    case "orb": return (
        <div className={`an-sp an-orb t-${sp.tint}`}>
            {sp.icon ? <img src={sp.icon} alt="" draggable={false} onError={(e) => e.currentTarget.remove()} /> : null}
        </div>
    )
    case "text": return <div className={`an-sp an-text t-${sp.tint}`}>{sp.text}</div>
    case "burst": return <div className={`an-sp an-burst t-${sp.tint}`} />
    case "icon": return <div className="an-sp an-icon"><img src={sp.src} alt="" draggable={false} onError={(e) => { e.currentTarget.style.visibility = "hidden" }} /></div>
    case "back": return (
        <div className="an-sp an-mini">
            <img className="an-back" src="/ui/card_back.png" alt="" draggable={false} />
        </div>
    )
    case "show": return (
        <div className="an-sp an-show">
            <div className="an-show-card"><CardFace card={sp.card} name={sp.name} /></div>
            <div className="an-show-txt">
                <b className="an-show-bn">{sp.banner}</b>
                {sp.desc ? <span className="an-show-desc"><RichText text={sp.desc} /></span> : null}
            </div>
        </div>
    )
    case "flip": return (
        <div className={`an-sp an-flip${sp.tone ? ` tone-${sp.tone}` : ""}`}>
            <div className="an-flip-in">
                <img className="an-fl-b" src="/ui/card_back.png" alt="" draggable={false} />
                <div className="an-fl-f">{sp.face ? <CardFace card={sp.face} name={sp.name ?? ""} /> : null}</div>
            </div>
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
        setDisplayLag(!reducedMotion())
        return () => {
            alive.current = false
            releaseAll()
            setDisplayLag(false)
        }
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
            if (queue.current.length > MAX_QUEUE) {
                queue.current.splice(0,
                    queue.current.length - MAX_QUEUE)
                    .forEach((b) => {
                        arrivingUids(b).forEach(releaseCard)
                        landImpacts(b)
                        applyToDisplay(b)
                    })
            }
            speed.current = queue.current.length > 3 ? .6 : 1 // chỉ tua nhẹ khi dồn quá nhiều, còn lại chạy đủ nhịp
            const batch = queue.current.shift()!
            if (!reducedMotion()) {
                await runBatch(batch,
                    fx.current,
                    () => alive.current)
                setSprites([])
            }
            landImpacts(batch) // phần chưa trúng trong hoạt ảnh (hoặc tắt hoạt ảnh) thì hiện ngay
            applyToDisplay(batch) // sự kiện còn sót của lô hiện nốt; sự kiện lạ chờ tới snapDisplay
        }
        running.current = false
        releaseAll()
        snapDisplay() // hết hàng đợi: hiển thị = trạng thái thật
    },
    [])

    useEffect(() => {
        if (tick === lastTick.current) return
        lastTick.current = tick
        if (!lastEvents.length) return
        if (reducedMotion()) {
            queueImpacts(lastEvents)
            landImpacts(lastEvents)
            snapDisplay()
            return
        }
        queueImpacts(lastEvents)
        memoHandRects(lastEvents)
        holdCards(arrivingUids(lastEvents))
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
