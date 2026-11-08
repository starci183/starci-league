export type Rect = { x: number; y: number; width: number; height: number }
export type MaskData = { width: number; height: number; outer: Rect; safe: Rect; aperture?: Rect; mask: string; region: "hole" | "face"; area: number }
const cache = new Map<string, Promise<MaskData>>()
export const ART_FRAME_ASSETS = {
    portrait: "m01-portrait-ring.png", icon: "m02-icon-ring.png", name: "m03-name-plaque.png",
    meter: "m04-meter-ring.png", panel: "m05-panel-ring.png", title: "m06-title-plaque.png"
} as const

/** Read the PNG at native resolution. The source image is never resampled or edited. */
function analyseAsset(file: string): Promise<MaskData> {
    const pending = new Promise<MaskData>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            try {
                const width = img.naturalWidth, height = img.naturalHeight
                const canvas = document.createElement("canvas")
                canvas.width = width; canvas.height = height
                const ctx = canvas.getContext("2d",
                    {
                        willReadFrequently: true
                    })!
                ctx.drawImage(img,
                    0,
                    0)
                const rgba = ctx.getImageData(0,
                    0,
                    width,
                    height).data
                let left = width, right = -1, top = height, bottom = -1
                for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (rgba[(y * width + x) * 4 + 3] >= 200) {
                    left = Math.min(left,
                        x); right = Math.max(right,
                        x); top = Math.min(top,
                        y); bottom = Math.max(bottom,
                        y)
                }
                if (right < left) throw Error(`Asset has no opaque frame: ${file}`)
                const outer = {
                    x: left, y: top, width: right - left + 1, height: bottom - top + 1
                }
                const seed = Math.floor(height / 2) * width + Math.floor(width / 2)
                const region = rgba[seed * 4 + 3] < 96 ? "hole" : "face"
                const inside = (index: number) => {
                    const i = index * 4, a = rgba[i + 3]
                    return region === "hole" ? a < 96 : a >= 128 && rgba[i] * .2126 + rgba[i + 1] * .7152 + rgba[i + 2] * .0722 < 95
                }
                const visited = new Uint8Array(width * height), queue = new Uint32Array(width * height)
                let head = 0, tail = 0, touchesEdge = false
                if (!inside(seed)) throw Error(`No central content region in ${file}`)
                queue[tail++] = seed; visited[seed] = 1
                const visit = (index: number) => { if (!visited[index] && inside(index)) { visited[index] = 1; queue[tail++] = index } }
                while (head < tail) {
                    const index = queue[head++], x = index % width, y = Math.floor(index / width)
                    if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touchesEdge = true
                    if (x > 0) visit(index - 1)
                    if (x < width - 1) visit(index + 1)
                    if (y > 0) visit(index - width)
                    if (y < height - 1) visit(index + width)
                }
                if (touchesEdge || tail < width * height * .005) throw Error(`Frame does not enclose a usable mask: ${file}`)
                // Largest all-inside rectangle gives labels a safe content region inside the actual pixels.
                const bars = new Uint32Array(width), stack: number[] = []
                let best: Rect = {
                    x: 0, y: 0, width: 0, height: 0
                }
                const runs: string[] = []
                for (let y = 0; y < height; y++) {
                    let run = -1
                    for (let x = 0; x <= width; x++) {
                        const on = x < width && visited[y * width + x] === 1
                        if (x < width) bars[x] = on ? bars[x] + 1 : 0
                        if (on && run < 0) run = x
                        if (!on && run >= 0) { const n = x - run; runs.push(`M${run} ${y}h${n}v1h-${n}z`); run = -1 }
                    }
                    stack.length = 0
                    for (let x = 0; x <= width; x++) {
                        const h = x < width ? bars[x] : 0
                        while (stack.length && bars[stack[stack.length - 1]] > h) {
                            const bh = bars[stack.pop()!], bx = stack.length ? stack[stack.length - 1] + 1 : 0, bw = x - bx
                            if (bw * bh > best.width * best.height) best = {
                                x: bx, y: y - bh + 1, width: bw, height: bh
                            }
                        }
                        stack.push(x)
                    }
                }
                const inset = Math.max(4,
                    Math.round(Math.min(best.width,
                        best.height) * .035))
                const safe = {
                    x: best.x + inset, y: best.y + inset, width: best.width - inset * 2, height: best.height - inset * 2
                }
                const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${outer.x} ${outer.y} ${outer.width} ${outer.height}"><path fill="white" d="${runs.join("")}"/></svg>`
                resolve({
                    width, height, outer, safe, region, area: tail, mask: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
                })
            } catch (error) { reject(error) }
        }
        img.onerror = () => reject(Error(`Cannot load modular frame: ${file}`))
        img.src = `/ui/modular-mask-v1/${file}`
    })
    return pending
}

let manifest: Promise<Record<string, MaskData>> | undefined
/** Shipped metadata/SVG masks avoid pixel analysis in production; analysis is a development fallback. */
export function loadArtFrameMask(file: string): Promise<MaskData> {
    const existing = cache.get(file)
    if (existing) return existing
    manifest ??= fetch("/ui/modular-mask-v1/manifest.json").then(response => {
        if (!response.ok) throw Error("No precomputed art frame manifest")
        return response.json() as Promise<Record<string, MaskData>>
    }).catch(() => ({
    }))
    const pending = manifest.then(data => data[file] ?? analyseAsset(file))
    cache.set(file,
        pending)
    return pending
}

