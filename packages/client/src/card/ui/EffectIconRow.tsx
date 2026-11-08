import {
    useEffect, useId, useRef, useState, type ReactNode
} from "react"
import {
    createPortal
} from "react-dom"
import {
    ArtFrame
} from "./ArtFrame"
import {
    useGameOverlay
} from "./GameCanvas"
import {
    ScrollArea
} from "./ScrollArea"
import "./effect-icon-row.css"

export interface EffectIconEntry {
    id: string; icon: string; name: string; count?: number | string; description?: string; details?: ReactNode
}

/** Three cells maximum. Detail belongs to the canvas corner, never floating over a champion. */
export function EffectIconRow(p: { effects: EffectIconEntry[]; className?: string }) {
    const [active,
        setActive] = useState<string | null>(null)
    const closeTimer = useRef<number | undefined>(undefined)
    const overlay = useGameOverlay()
    const id = useId()
    useEffect(() => () => window.clearTimeout(closeTimer.current),
        [])
    const keep = () => window.clearTimeout(closeTimer.current)
    const close = () => { keep(); closeTimer.current = window.setTimeout(() => setActive(null),
        120) }
    const open = (key: string) => { keep(); setActive(key) }
    const visible = p.effects.length > 3 ? p.effects.slice(0,
        2) : p.effects
    const current = active === "__overflow" ? p.effects : p.effects.filter(effect => effect.id === active)
    if (!p.effects.length) return null
    return <>
        <div className={`effect-icon-row ${p.className ?? ""}`} onMouseLeave={close}>
            {visible.map(effect => <button type="button" className="effect-icon-cell" key={effect.id} data-effect-id={effect.id} aria-label={`${effect.name}${effect.count === undefined ? "" : `: ${effect.count}`}`} aria-describedby={active === effect.id ? id : undefined} onMouseEnter={() => open(effect.id)} onFocus={() => open(effect.id)} onBlur={close} onClick={event => { event.stopPropagation(); open(effect.id) }}>
                <img src={effect.icon} alt="" draggable={false} />{effect.count === undefined ? null : <b>{effect.count}</b>}
            </button>)}
            {p.effects.length > 3 ? <button type="button" className="effect-icon-cell effect-icon-overflow" aria-label={`${p.effects.length - 2} hiệu ứng khác`} aria-describedby={active === "__overflow" ? id : undefined} onMouseEnter={() => open("__overflow")} onFocus={() => open("__overflow")} onBlur={close} onClick={event => { event.stopPropagation(); open("__overflow") }}>{`+${p.effects.length - 2}`}</button> : null}
        </div>
        {current.length && overlay ? createPortal(<aside id={id} className="effect-detail-panel" role="tooltip" onMouseEnter={keep} onMouseLeave={close}>
            <ArtFrame kind="panel" width={480} height={360} contentClassName="effect-detail-safe" material={<span className="effect-detail-material" />} fitLabel={false}>
                <ScrollArea className="effect-detail-scroll" label="Chi tiết hiệu ứng">
                    {current.map(effect => <section className="effect-detail-entry" key={effect.id}>
                        <header><ArtFrame kind="icon" width={56} height={56} image={effect.icon} /><strong>{effect.name}</strong>{effect.count === undefined ? null : <b>{effect.count}</b>}</header>
                        {effect.description ? <p>{effect.description}</p> : null}{effect.details}
                    </section>)}
                </ScrollArea>
            </ArtFrame>
        </aside>,
        overlay) : null}
    </>
}
