import {
    useEffect, useState, type ReactNode
} from "react"
import {
    ArtFrame
} from "./ArtFrame"
import "./game-card.css"

export interface GameCardVisualProps {
    name: string; srcs: string[]; actor?: string; detail?: ReactNode; kind?: string; letter?: string; className?: string
}

/** One printed-card face for the hand, chain, archives, deck and travelling sprites. */
export function GameCardVisual(p: GameCardVisualProps) {
    const [index,
        setIndex] = useState(0)
    const key = p.srcs.join("|")
    useEffect(() => setIndex(0),
        [key])
    return <div className={`game-card cv ${p.kind ?? ""} ${p.className ?? ""}`}>
        <ArtFrame kind="portrait" width="100%" height="100%" className="game-card-frame" contentClassName="game-card-content" surfaceClassName="game-card-surface" fill={<>
            {index < p.srcs.length ? <img className="af-art game-card-image" src={p.srcs[index]} alt="" draggable={false} onError={() => setIndex(index + 1)} /> : <span className="game-card-fallback">{p.letter ?? p.name.slice(0,
                1)}</span>}
            <div className="game-card-shade" />
        </>}>
            {p.actor ? <div className="game-card-actor">{p.actor}</div> : <span className="game-card-top-spacer" />}
            <div className="game-card-copy"><b className="game-card-name">{p.name}</b>{p.detail ? <div className="game-card-detail">{p.detail}</div> : null}</div>
        </ArtFrame>
    </div>
}
