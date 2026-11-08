import {
    useEffect, useId, useRef, useState, type ReactNode, type MutableRefObject, type KeyboardEvent
} from "react"
import "./scroll-area.css"
import {
    gameCanvasScale
} from "./GameCanvas"

/** Native scrolling content, with a game-rendered rail instead of browser chrome. */
export function ScrollArea(p: { children: ReactNode; className?: string; label?: string; viewportRef?: MutableRefObject<HTMLDivElement | null>; onScroll?(): void; onWheel?(): void; onPointerDown?(): void; onKeyDown?(event: KeyboardEvent<HTMLDivElement>): void }) {
    const id = useId()
    const viewport = useRef<HTMLDivElement | null>(null)
    const content = useRef<HTMLDivElement>(null)
    const track = useRef<HTMLDivElement>(null)
    const drag = useRef<{ y: number; top: number } | null>(null)
    const [position,
        setPosition] = useState({
        top: 0, max: 0, thumb: 1, track: 0
    })
    const measure = () => {
        const el = viewport.current
        if (!el) return
        const height = track.current?.clientHeight ?? 0
        setPosition({
            top: el.scrollTop, max: Math.max(0,
                el.scrollHeight - el.clientHeight), thumb: Math.min(1,
                Math.max(36 / Math.max(1,
                    height),
                el.clientHeight / Math.max(1,
                    el.scrollHeight))), track: height
        })
    }
    useEffect(() => {
        const observer = new ResizeObserver(measure)
        for (const el of [viewport.current,
            content.current,
            track.current]) if (el) observer.observe(el)
        measure()
        return () => observer.disconnect()
    },
    [])
    const scroll = (delta: number) => viewport.current?.scrollBy({
        top: delta
    })
    const travel = position.track * (1 - position.thumb)
    return <div className={`game-scroll ${p.className ?? ""}`} onWheel={p.onWheel} onPointerDown={p.onPointerDown} onKeyDown={p.onKeyDown}>
        <div id={id} ref={(el) => { viewport.current = el; if (p.viewportRef) p.viewportRef.current = el }} className="game-scroll-viewport" tabIndex={0} aria-label={p.label} onScroll={() => { measure(); p.onScroll?.() }}>
            <div ref={content} className="game-scroll-content">{p.children}</div>
        </div>
        <div className={`game-scroll-rail${position.max > 1 ? " scrollable" : ""}`} aria-hidden={position.max <= 1 || undefined}>
            <button type="button" className="game-scroll-arrow up" aria-label="Cuộn lên" disabled={position.top <= 0} onClick={() => scroll(-100)} tabIndex={position.max > 1 ? 0 : -1}><i /></button>
            <div ref={track} className="game-scroll-track" onPointerDown={(e) => {
                if (e.target !== e.currentTarget) return
                scroll(((e.clientY - e.currentTarget.getBoundingClientRect().top) / gameCanvasScale(e.currentTarget) < position.top / Math.max(1,
                    position.max) * travel ? -1 : 1) * (viewport.current?.clientHeight ?? 100) * .85)
            }}>
                <div className="game-scroll-thumb" role="scrollbar" aria-label={p.label ?? "Cuộn nội dung"} aria-controls={id} aria-orientation="vertical" aria-valuemin={0} aria-valuemax={Math.round(position.max)} aria-valuenow={Math.round(position.top)} tabIndex={position.max > 1 ? 0 : -1}
                    style={{
                        height: `${position.thumb * 100}%`, top: `${position.top / Math.max(1,
                            position.max) * (1 - position.thumb) * 100}%`
                    }}
                    onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); drag.current = {
                        y: e.clientY, top: viewport.current?.scrollTop ?? position.top
                    }; e.currentTarget.setPointerCapture(e.pointerId) }}
                    onPointerMove={(e) => { if (drag.current && viewport.current) viewport.current.scrollTop = drag.current.top + (e.clientY - drag.current.y) / gameCanvasScale(e.currentTarget) / Math.max(1,
                        travel) * position.max }}
                    onPointerUp={(e) => { drag.current = null; e.currentTarget.releasePointerCapture(e.pointerId) }}
                    onLostPointerCapture={() => { drag.current = null }}
                    onKeyDown={(e) => {
                        if (!viewport.current) return
                        const page = viewport.current.clientHeight * .85
                        const delta = {
                            ArrowDown: 40, ArrowUp: -40, PageDown: page, PageUp: -page, Home: -position.max, End: position.max
                        }[e.key]
                        if (delta !== undefined) { e.preventDefault(); scroll(delta) }
                    }}><i /></div>
            </div>
            <button type="button" className="game-scroll-arrow down" aria-label="Cuộn xuống" disabled={position.top >= position.max - 1} onClick={() => scroll(100)} tabIndex={position.max > 1 ? 0 : -1}><i /></button>
        </div>
    </div>
}
