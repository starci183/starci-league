import {
    useLayoutEffect, useState
} from "react"
import {
    viewportToCanvasPoint
} from "./GameCanvas"

interface TargetRect { id: string; x: number; y: number; width: number; height: number }

/** Presentation only: targets are supplied by the canonical legal-action selection. */
export function TargetGuide(p: { actor?: string; hovered?: string; eligible: string[] }) {
    const [rects,
        setRects] = useState<TargetRect[]>([])
    const signature = [...p.eligible,
        p.actor ?? ""].join("|")
    useLayoutEffect(() => {
        const measure = () => setRects([...new Set([...p.eligible,
            ...(p.actor ? [p.actor] : [])])].flatMap((id) => {
            const el = document.querySelector<HTMLElement>(`[data-unit-id="${CSS.escape(id)}"]`)
            if (!el) return []
            const r = el.getBoundingClientRect()
            const a = viewportToCanvasPoint({
                    x: r.left, y: r.top
                }), b = viewportToCanvasPoint({
                    x: r.right, y: r.bottom
                })
            return [{
                id, x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y
            }]
        }))
        measure()
        const observer = new ResizeObserver(measure)
        const stage = document.querySelector(".game-canvas-stage")
        if (stage) observer.observe(stage)
        window.addEventListener("resize",
            measure)
        return () => { observer.disconnect(); window.removeEventListener("resize",
            measure) }
    },
    [signature,
        p.hovered])
    const actor = rects.find(r => r.id === p.actor)
    const target = rects.find(r => r.id === p.hovered && p.eligible.includes(r.id))
    const start = actor ? {
        x: actor.x + actor.width / 2, y: actor.y + 12
    } : null
    const end = target ? {
        x: target.x + target.width / 2, y: target.y + target.height - 20
    } : null
    return <svg className="target-guide" viewBox="0 0 1920 1080" aria-hidden="true" data-target-guide data-choosing-actor={!p.actor || undefined}>
        <defs><linearGradient id="attack-preview-gold" x1="0" y1="1" x2="0" y2="0"><stop stopColor="#f0b944"/><stop offset="1" stopColor="#fff4a1"/></linearGradient><marker id="attack-preview-arrow" viewBox="0 0 18 18" refX="13" refY="9" markerWidth="6" markerHeight="6" orient="auto"><path d="M2 2L15 9L2 16L6 9Z" fill="#fff2a0" stroke="#a87620"/></marker></defs>
        {rects.filter(r => p.eligible.includes(r.id)).map(r => <g key={r.id} className={`target-reticle${p.hovered === r.id ? " hovered" : ""}`}>
            <ellipse cx={r.x + r.width / 2} cy={r.y + r.height - 4} rx={r.width * .6} ry="11"/>
            <path d={`M${r.x - 4},${r.y + 16}v-20h20 M${r.x + r.width - 16},${r.y - 4}h20v20 M${r.x - 4},${r.y + r.height - 16}v20h20 M${r.x + r.width - 16},${r.y + r.height + 4}h20v-20`}/>
        </g>)}
        {actor ? <rect className="target-actor-rim" x={actor.x - 5} y={actor.y - 5} width={actor.width + 10} height={actor.height + 10} rx="5"/> : null}
        {start && end ? <path className="target-preview-path" d={`M${start.x},${start.y} C${start.x + (end.x - start.x) * .6 + 70},${start.y - 80} ${end.x + 60},${end.y + 100} ${end.x},${end.y}`} markerEnd="url(#attack-preview-arrow)"/> : null}
    </svg>
}
