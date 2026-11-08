import {
    useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode
} from "react"
import {
    ART_FRAME_ASSETS, loadArtFrameMask, type MaskData
} from "./alphaMask"
import "./art-frame.css"

export type ArtFrameKind = keyof typeof ART_FRAME_ASSETS
export type ArtFrameProps = {
    kind: ArtFrameKind; width?: number | string; height?: number | string; className?: string; style?: CSSProperties;
    children?: ReactNode; image?: string; fill?: ReactNode; material?: ReactNode; showMask?: boolean; label?: string;
    contentClassName?: string; surfaceClassName?: string; fitLabel?: boolean
}

/** Fit the visible PNG pixels uniformly; alpha-derived masks and safe bounds share its native coordinate space. */
export function ArtFrame(p: ArtFrameProps) {
    const [data,
            setData] = useState<MaskData | null>(null), [error,
            setError] = useState("")
    const ref = useRef<HTMLDivElement>(null)
    const safeRef = useRef<HTMLDivElement>(null), labelRef = useRef<HTMLDivElement>(null)
    const fitLabel = p.fitLabel ?? (p.kind === "name" || p.kind === "title" || p.kind === "meter")
    const [slot,
        setSlot] = useState({
        width: typeof p.width === "number" ? p.width : 0, height: typeof p.height === "number" ? p.height : 0
    })
    const file = ART_FRAME_ASSETS[p.kind]
    useEffect(() => { let live = true; loadArtFrameMask(file).then(d => { if (live) setData(d) }).catch(e => { if (live) setError(String(e)) }); return () => { live = false } },
        [file])
    useLayoutEffect(() => {
        const el = ref.current
        if (!el) return
        const measure = () => setSlot({
            width: el.clientWidth, height: el.clientHeight
        })
        const observer = new ResizeObserver(measure); observer.observe(el); measure()
        return () => observer.disconnect()
    },
    [])
    const fit = data ? Math.min(slot.width / data.outer.width,
        slot.height / data.outer.height) : 1
    const w = data ? data.outer.width * fit : slot.width, h = data ? data.outer.height * fit : slot.height
    useLayoutEffect(() => {
        const safe = safeRef.current, label = labelRef.current
        if (!fitLabel || !safe || !label) return
        const measure = () => {
            label.style.transform = "none"
            const box = label.getBoundingClientRect(), walker = document.createTreeWalker(label,
                NodeFilter.SHOW_TEXT)
            let node: Node | null, left = box.right, top = box.bottom, right = box.left, bottom = box.top
            while ((node = walker.nextNode())) {
                if (!node.textContent?.trim()) continue
                const range = document.createRange(); range.selectNodeContents(node)
                for (const rect of range.getClientRects()) { left = Math.min(left,
                    rect.left); top = Math.min(top,
                    rect.top); right = Math.max(right,
                    rect.right); bottom = Math.max(bottom,
                    rect.bottom) }
            }
            const stageScale = box.width / Math.max(1,
                label.offsetWidth)
            const glyphWidth = Math.max(0,
                    right - left) / stageScale, glyphHeight = Math.max(0,
                    bottom - top) / stageScale
            const scale = Math.min(1,
                safe.clientWidth / Math.max(1,
                    label.scrollWidth,
                    glyphWidth),
                safe.clientHeight / Math.max(1,
                    label.scrollHeight,
                    glyphHeight))
            const dx = right >= left ? ((box.left + box.right - left - right) / 2) / stageScale * scale : 0
            const dy = bottom >= top ? ((box.top + box.bottom - top - bottom) / 2) / stageScale * scale : 0
            label.style.transform = `translate(${dx}px,${dy}px) scale(${scale})`; label.dataset.labelScale = String(scale)
        }
        const observer = new ResizeObserver(measure); observer.observe(safe); observer.observe(label)
        document.fonts.ready.then(measure); measure()
        return () => observer.disconnect()
    },
    [fitLabel,
        data,
        p.children,
        slot.width,
        slot.height])
    const contentStyle: CSSProperties | undefined = data ? {
        left: `${(data.safe.x - data.outer.x) / data.outer.width * 100}%`, top: `${(data.safe.y - data.outer.y) / data.outer.height * 100}%`,
        width: `${data.safe.width / data.outer.width * 100}%`, height: `${data.safe.height / data.outer.height * 100}%`
    } : undefined
    return <div ref={ref} className={`af-asset ${p.className ?? ""}`} style={{
        ...p.style, width: p.width ?? p.style?.width ?? "100%", height: p.height ?? p.style?.height ?? "100%"
    }} data-asset={p.kind} data-mask-ready={!!data} data-mask-kind={data?.region} aria-label={p.label}>
        {data ? <div className="af-frame-box" style={{
            width: w, height: h,
            "--af-aperture-left": `${((data.aperture ?? data.safe).x - data.outer.x) / data.outer.width * 100}%`,
            "--af-aperture-top": `${((data.aperture ?? data.safe).y - data.outer.y) / data.outer.height * 100}%`,
            "--af-aperture-width": `${(data.aperture ?? data.safe).width / data.outer.width * 100}%`,
            "--af-aperture-height": `${(data.aperture ?? data.safe).height / data.outer.height * 100}%`
        } as CSSProperties} data-visible-bounds={JSON.stringify(data.outer)} data-safe-bounds={JSON.stringify(data.safe)}>
            <div className={`af-surface ${p.surfaceClassName ?? ""}`} style={{
                maskImage: data.mask, WebkitMaskImage: data.mask
            }}>
                {p.image ? <img className="af-art" src={p.image} alt="" /> : null}{p.material}{p.fill}
            </div>
            <svg className="af-frame-image" viewBox={`${data.outer.x} ${data.outer.y} ${data.outer.width} ${data.outer.height}`} aria-hidden="true"><image href={`/ui/modular-mask-v1/${file}`} width={data.width} height={data.height} /></svg>
            {p.showMask ? <div className="af-mask-proof" style={{
                maskImage: data.mask, WebkitMaskImage: data.mask
            }} /> : null}
            {p.children ? <div ref={safeRef} className={`af-safe-content ${p.contentClassName ?? ""}`} style={contentStyle}>{fitLabel ? <div ref={labelRef} className="af-label-inner">{p.children}</div> : p.children}</div> : null}
        </div> : error ? <span className="af-error" role="alert">{error}</span> : <span className="af-loading" aria-hidden="true" />}
    </div>
}
