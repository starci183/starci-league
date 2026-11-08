import {
    createContext, useContext, useLayoutEffect, useState, type CSSProperties, type ReactNode
} from "react"

export const GAME_CANVAS_WIDTH = 1920
export const GAME_CANVAS_HEIGHT = 1080
const GameOverlayContext = createContext<HTMLDivElement | null>(null)

/** All game coordinates stay in reference pixels; only this outer stage scales. */
export function GameCanvas(p: { children: ReactNode }) {
    const fit = () => Math.min(window.innerWidth / GAME_CANVAS_WIDTH,
        window.innerHeight / GAME_CANVAS_HEIGHT)
    const [scale,
        setScale] = useState(fit)
    const [overlay,
        setOverlay] = useState<HTMLDivElement | null>(null)
    useLayoutEffect(() => {
        const resize = () => setScale(fit())
        window.addEventListener("resize",
            resize)
        window.visualViewport?.addEventListener("resize",
            resize)
        resize()
        return () => {
            window.removeEventListener("resize",
                resize)
            window.visualViewport?.removeEventListener("resize",
                resize)
        }
    },
    [])
    return <div className="game-canvas-viewport" data-game-canvas-viewport>
        <div className="game-canvas-stage" data-game-canvas-scale={scale} style={{
            "--game-canvas-scale": scale
        } as CSSProperties}>
            <GameOverlayContext.Provider value={overlay}>
                {p.children}
                <div className="game-canvas-overlays" ref={setOverlay} />
            </GameOverlayContext.Provider>
        </div>
    </div>
}

export const useGameOverlay = () => useContext(GameOverlayContext)

/** Convert a measured viewport displacement before animating a staged DOM node. */
export function gameCanvasScale(el?: Element | null): number {
    const stage = el?.closest<HTMLElement>(".game-canvas-stage") ?? document.querySelector<HTMLElement>(".game-canvas-stage")
    return Math.max(.01,
        Number(stage?.dataset.gameCanvasScale) || 1)
}

/** For DOM tooltips anchored by getBoundingClientRect within the reference stage. */
export function viewportToCanvasPoint(point: { x: number; y: number }) {
    const stage = document.querySelector<HTMLElement>(".game-canvas-stage")
    if (!stage) return point
    const rect = stage.getBoundingClientRect(), scale = gameCanvasScale(stage)
    return {
        x: (point.x - rect.left) / scale, y: (point.y - rect.top) / scale
    }
}
