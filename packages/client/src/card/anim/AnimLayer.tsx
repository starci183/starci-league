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
    finishPresentation, getCard, setDisplayLag, startPresentation, subscribePresentations, type PresentationBatch
} from "../store"
import {
    CardFace, HeroFace
} from "./CardFace"
import {
    reducedMotion
} from "./helpers"
import {
    bindGameOverlayClip
} from "../vfx/gameClip"
import {
    memoHandRects, runBatch, type Fx, type SpriteSpec
} from "./plan"
import {
    holdCards, releaseAll
} from "./pending"
import {
    landImpacts, queueImpacts
} from "./impacts"
import "./anim.css"

type GameEvent = cg.GameEvent
type Sprite = SpriteSpec & { id: number }

const BETWEEN_ACTIONS_MS = 180

/** uid các lá vào tay trong lô (rút, trả về tay, tạo vào tay, trộm) */
function arrivingUids(batch: GameEvent[]): string[] {
    const out: string[] = []
    const owner = getCard().view?.you ?? "A"
    for (const e of batch) {
        if ((e.t === "draw" || e.t === "drawAuto" || e.t === "returnToHand" || e.t === "prize") && e.side === owner) out.push(e.card.uid)
        else if (e.t === "create" && e.zone === "hand" && e.side === owner) out.push(e.card.uid)
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
    const layer = useRef<HTMLDivElement>(null)
    const [sprites,
        setSprites] = useState<Sprite[]>([])
    const waiting = useRef(new Map<number, (el: HTMLElement) => void>())
    const queue = useRef<PresentationBatch[]>([])
    const running = useRef(false)
    const alive = useRef(true)
    const epoch = useRef(0)
    const seq = useRef(0)
    const speed = useRef(1)

    useEffect(() => layer.current ? bindGameOverlayClip(layer.current) : undefined,
        [])

    useEffect(() => {
        alive.current = true
        setDisplayLag(!reducedMotion())
        return () => {
            alive.current = false
            epoch.current++
            running.current = false
            queue.current = []
            for (const resolve of waiting.current.values()) resolve(document.createElement("div"))
            waiting.current.clear()
            releaseAll()
            setDisplayLag(false)
        }
    },
    [])

    const spawn = useCallback((spec: SpriteSpec) => new Promise<HTMLElement>((resolve) => {
        if (!alive.current) { resolve(document.createElement("div")); return }
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
        const generation = epoch.current
        try {
            while (queue.current.length && alive.current && generation === epoch.current) {
                speed.current = 1
                const item = queue.current.shift()!
                const batch = item.events
                startPresentation(item)
                try {
                    if (!reducedMotion()) await runBatch(batch,
                        {
                            ...fx.current, active: () => alive.current && generation === epoch.current
                        },
                        () => alive.current && generation === epoch.current)
                } catch (error) {
                    console.warn("Animation batch failed; continuing presentation",
                        error)
                } finally {
                    if (generation === epoch.current) {
                        setSprites([])
                        landImpacts(batch)
                        finishPresentation(item)
                    }
                }
                if (generation !== epoch.current) break
                if (queue.current.length) await new Promise<void>((resolve) => window.setTimeout(resolve,
                    BETWEEN_ACTIONS_MS))
            }
        } finally {
            if (generation === epoch.current) {
                running.current = false
                releaseAll()
            }
        }

    },
    [])

    useEffect(() => subscribePresentations((item) => {
        const batch = item.events
        queueImpacts(batch)
        memoHandRects(batch)
        holdCards(arrivingUids(batch))
        queue.current.push(item)
        void pump()
    }),
    [pump])

    return (
        <div ref={layer} className="an-layer" aria-hidden="true">
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
