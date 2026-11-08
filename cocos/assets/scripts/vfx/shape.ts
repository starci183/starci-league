// Công cụ vẽ hình khối dùng chung cho VFX (theo docs/VFX_RULES.md): lớp Graphics vẽ lại mỗi khung, dải thon, ngẫu nhiên có
// hạt giống để hình đứng yên giữa các khung. Hạt sáng, mảnh vỡ, bụi vẫn dùng particles.ts.
import {
    Color, Graphics, Node, UITransform
} from "cc"
import {
    angleOf, type Pt
} from "./particles"

export const TAU = Math.PI * 2
/** Hướng lên trong toạ độ Cocos (y hướng lên) */
export const UP = Math.PI / 2

/** Màu 0xRRGGBB với độ đậm 0..1 (tự kẹp) */
export const col = (hex: number, a: number) => new Color((hex >> 16) & 255,
    (hex >> 8) & 255,
    hex & 255,
    Math.max(0, Math.min(255, Math.round(a * 255))))

export const polar = (at: Pt, a: number, r: number, squash = 1): Pt => ({
    x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r * squash
})

/** Một lớp vẽ Graphics phủ màn; `additive` hoà màu cộng cho phần sáng, tắt cho phần tối/đục. Gọi done() khi xong */
export function canvas(layer: Node, additive = true) {
    const n = new Node("ShapeGfx")
    n.layer = layer.layer
    n.addComponent(UITransform).setContentSize(1920, 1080)
    layer.addChild(n)
    const g = n.addComponent(Graphics)
    if (additive) {
        // Graphics là UIRenderer, nhận cặp hoà màu như Sprite trong particles.ts (SRC_ALPHA, ONE)
        const blend = g as unknown as { srcBlendFactor: number; dstBlendFactor: number }
        blend.srcBlendFactor = 2
        blend.dstBlendFactor = 1
    }
    return {
        g, done: () => { if (n.isValid) n.destroy() }
    }
}

/** Số ngẫu nhiên có hạt giống: cùng seed thì cùng chuỗi */
export function seeded(seed: number) {
    let x = Math.floor(seed * 9973) % 2147483647 || 1
    return () => {
        x = x * 16807 % 2147483647
        return (x - 1) / 2147483646
    }
}

/** Điểm trên đường cong bậc hai a -> b, võng `bend` px sang trái hướng đi */
export function arcPt(a: Pt, b: Pt, bend: number, t: number): Pt {
    const d = angleOf(a, b)
    const mx = (a.x + b.x) / 2 - Math.sin(d) * bend, my = (a.y + b.y) / 2 + Math.cos(d) * bend
    const u = 1 - t
    return { x: u * u * a.x + 2 * u * t * mx + t * t * b.x, y: u * u * a.y + 2 * u * t * my + t * t * b.y }
}

/** Dải thon theo chuỗi điểm: rộng `w0` ở đầu chuỗi, `w1` ở cuối; tô một màu */
export function taper(g: Graphics, pts: Pt[], w0: number, w1: number, c: Color) {
    if (pts.length < 2) return
    const left: Pt[] = [], right: Pt[] = []
    for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)]
        const d = Math.atan2(q.y - o.y, q.x - o.x)
        const w = (w0 + (w1 - w0) * i / (pts.length - 1)) / 2
        left.push({ x: p.x - Math.sin(d) * w, y: p.y + Math.cos(d) * w })
        right.push({ x: p.x + Math.sin(d) * w, y: p.y - Math.cos(d) * w })
    }
    g.fillColor = c
    g.moveTo(left[0].x, left[0].y)
    for (const p of left) g.lineTo(p.x, p.y)
    for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i].x, right[i].y)
    g.close()
    g.fill()
}

/** Nét mảnh theo chuỗi điểm */
export function polyline(g: Graphics, pts: Pt[], w: number, c: Color) {
    if (pts.length < 2) return
    g.lineWidth = w
    g.strokeColor = c
    g.moveTo(pts[0].x, pts[0].y)
    for (const p of pts) g.lineTo(p.x, p.y)
    g.stroke()
}
