import {
    ART_FRAME_ASSETS, loadArtFrameMask
} from "./alphaMask"
import "./art-frame-html.css"

/** Vanilla lobby counterpart of ArtFrame: one intact PNG, its alpha mask and native safe rectangle. */
export function mountHtmlArtFrames(scope: HTMLElement): () => void {
    let live = true
    const observers: ResizeObserver[] = []
    for (const el of scope.querySelectorAll<HTMLElement>("[data-html-art]")) {
        const kind = el.dataset.htmlArt as keyof typeof ART_FRAME_ASSETS
        const file = ART_FRAME_ASSETS[kind]
        if (!file) continue
        void loadArtFrameMask(file).then((data) => {
            if (!live || !el.isConnected) return
            const box = document.createElement("span"), surface = document.createElement("span"), safe = document.createElement("span")
            box.className = "haf-frame-box"; surface.className = "haf-surface"; safe.className = "haf-safe"
            if (el.dataset.htmlContentClass) safe.classList.add(...el.dataset.htmlContentClass.split(" ").filter(Boolean))
            if (el.dataset.htmlSurfaceClass) surface.classList.add(...el.dataset.htmlSurfaceClass.split(" ").filter(Boolean))
            surface.style.maskImage = data.mask; surface.style.webkitMaskImage = data.mask
            const aperture = data.aperture ?? data.safe
            if (el.dataset.htmlImage) {
                const art = document.createElement("img")
                art.className = "haf-art"; art.src = el.dataset.htmlImage; art.alt = ""
                if (el.dataset.htmlFallback) art.onerror = () => {
                    if (art.dataset.fallbackUsed) { art.style.visibility = "hidden"; return }
                    art.dataset.fallbackUsed = "true"; art.src = el.dataset.htmlFallback!
                }
                art.style.left = `${(aperture.x - data.outer.x) / data.outer.width * 100}%`
                art.style.top = `${(aperture.y - data.outer.y) / data.outer.height * 100}%`
                art.style.width = `${aperture.width / data.outer.width * 100}%`
                art.style.height = `${aperture.height / data.outer.height * 100}%`
                surface.append(art)
            }
            if (el.dataset.htmlShadeClass) {
                const shade = document.createElement("span")
                shade.className = el.dataset.htmlShadeClass; surface.append(shade)
            }
            const svg = document.createElementNS("http://www.w3.org/2000/svg",
                    "svg"), image = document.createElementNS("http://www.w3.org/2000/svg",
                    "image")
            svg.classList.add("haf-png"); svg.setAttribute("viewBox",
                `${data.outer.x} ${data.outer.y} ${data.outer.width} ${data.outer.height}`); svg.setAttribute("aria-hidden",
                "true")
            image.setAttribute("href",
                `/ui/modular-mask-v1/${file}`); image.setAttribute("width",
                String(data.width)); image.setAttribute("height",
                String(data.height)); svg.append(image)
            safe.style.left = `${(data.safe.x - data.outer.x) / data.outer.width * 100}%`
            safe.style.top = `${(data.safe.y - data.outer.y) / data.outer.height * 100}%`
            safe.style.width = `${data.safe.width / data.outer.width * 100}%`
            safe.style.height = `${data.safe.height / data.outer.height * 100}%`
            const label = document.createElement("span")
            const fit = el.dataset.htmlFit !== "false" && ["name",
                "title",
                "meter"].includes(kind)
            if (fit) label.className = "haf-label"
            const content = fit ? label : safe
            while (el.firstChild) content.append(el.firstChild)
            if (fit) safe.append(label)
            box.append(surface,
                svg,
                safe); el.append(box); el.classList.add("haf-asset"); el.dataset.maskReady = "true"
            box.dataset.visibleBounds = JSON.stringify(data.outer); box.dataset.safeBounds = JSON.stringify(data.safe)
            const measure = () => {
                const scale = Math.min(el.clientWidth / data.outer.width,
                    el.clientHeight / data.outer.height)
                const width = data.outer.width * scale, height = data.outer.height * scale
                box.style.width = `${width}px`; box.style.height = `${height}px`; box.style.left = `${(el.clientWidth - width) / 2}px`; box.style.top = `${(el.clientHeight - height) / 2}px`
                if (!fit || !safe.clientWidth || !safe.clientHeight) return
                label.style.transform = "none"
                const bounds = label.getBoundingClientRect(), walker = document.createTreeWalker(label,
                    NodeFilter.SHOW_TEXT)
                let node: Node | null, left = bounds.right, right = bounds.left, top = bounds.bottom, bottom = bounds.top
                while ((node = walker.nextNode())) {
                    if (!node.textContent?.trim()) continue
                    const range = document.createRange(); range.selectNodeContents(node)
                    for (const rect of range.getClientRects()) { left = Math.min(left,
                        rect.left); right = Math.max(right,
                        rect.right); top = Math.min(top,
                        rect.top); bottom = Math.max(bottom,
                        rect.bottom) }
                }
                const stage = bounds.width / Math.max(1,
                    label.offsetWidth)
                const factor = Math.min(1,
                    safe.clientWidth / Math.max(1,
                        label.scrollWidth,
                        (right - left) / stage),
                    safe.clientHeight / Math.max(1,
                        label.scrollHeight,
                        (bottom - top) / stage))
                const dx = right >= left ? (bounds.left + bounds.right - left - right) / 2 / stage * factor : 0
                const dy = bottom >= top ? (bounds.top + bounds.bottom - top - bottom) / 2 / stage * factor : 0
                label.style.transform = `translate(${dx}px,${dy}px) scale(${factor})`; label.dataset.labelScale = String(factor)
            }
            const observer = new ResizeObserver(measure); observer.observe(el); observers.push(observer)
            document.fonts.ready.then(() => { if (live) measure() }); measure()
        }).catch(() => { if (live) el.dataset.maskReady = "error" })
    }
    return () => { live = false; observers.forEach((observer) => observer.disconnect()) }
}
