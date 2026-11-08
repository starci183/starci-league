/** Raster icons authored in ImageGen; text and accessible labels stay in the DOM. */
export function ForestIcon(p: { name: "switch" | "standby" | "lock"; className?: string }) {
    return <img className={`forest-icon ${p.className ?? ""}`} src={`/ui/forest-v2/icon-${p.name}.png`} width={64} height={64} alt="" aria-hidden="true" draggable={false} />
}
