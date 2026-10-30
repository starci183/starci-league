/** Keep viewport-based overlay coordinates while cropping effects to the 16:9 game frame. */
export function bindGameOverlayClip(overlay: HTMLElement): () => void {
    const frame = document.querySelector<HTMLElement>(".cg-viewport .forest-game")
    if (!frame) return () => {}
    const sync = () => {
        const rect = frame.getBoundingClientRect()
        const inset = [rect.top,
            window.innerWidth - rect.right,
            window.innerHeight - rect.bottom,
            rect.left].map((value) => `${Math.max(0,
            value).toFixed(3)}px`).join(" ")
        overlay.style.clipPath = `inset(${inset})`
    }
    sync()
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(sync)
    observer?.observe(frame)
    if (frame.parentElement) observer?.observe(frame.parentElement)
    window.addEventListener("resize",
        sync)
    return () => {
        observer?.disconnect()
        window.removeEventListener("resize",
            sync)
        overlay.style.clipPath = ""
    }
}
