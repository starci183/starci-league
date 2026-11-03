// Ô vuông giữ chỗ cho ảnh tướng, món đồ, chiêu (thầy chốt 2026-11-04: ô vuông, thầy tự thêm ảnh).
// Code nạp ảnh theo mã từ assets/resources/art/<loại>/<mã>; thiếu ảnh thì ô hiện khung trống có dấu thoi mờ.
import {
    Color, Graphics, Node
} from "cc"
import {
    C, withAlpha
} from "../dna/theme"
import {
    image
} from "./assets"
import {
    Frame, box
} from "./kit"

export type SlotKind = "heroes" | "items" | "skills" | "cards"

export interface SlotStyle {
    edge?: Color;
    glow?: Color | null;
    dim?: boolean;
}

/** Ô vuông `size` có khung vàng mảnh; ảnh nạp từ art/<kind>/<id> nếu có */
export function slot(parent: Node, kind: SlotKind, id: string, size: number, x = 0, y = 0, s: SlotStyle = {
}): Frame {
    const f = new Frame(parent,
        size,
        size,
        x,
        y,
        {
            fill: withAlpha(C.bg,
                235),
            stroke: s.edge ?? C.gold,
            inner: null,
            glow: s.glow ?? null,
            chamfer: Math.max(4,
                Math.round(size / 14)),
        })
    const mark = box("Mark",
        f.node,
        size,
        size).addComponent(Graphics)
    const r = Math.max(5,
        size * 0.09)
    mark.strokeColor = withAlpha(C.goldDark,
        200)
    mark.lineWidth = 1.5
    mark.moveTo(0,
        r)
    mark.lineTo(r,
        0)
    mark.lineTo(0,
        -r)
    mark.lineTo(-r,
        0)
    mark.close()
    mark.stroke()
    if (id) image(f.node,
        `art/${kind}/${id}`,
        size - 6,
        size - 6)
    if (s.dim) {
        const veil = box("Dim",
            f.node,
            size,
            size).addComponent(Graphics)
        veil.fillColor = withAlpha(C.bg,
            150)
        veil.rect(-size / 2,
            -size / 2,
            size,
            size)
        veil.fill()
    }
    return f
}

/** Mã ảnh chiêu: "<tướng>_<p|q|e|r>" */
export const skillArt = (hero: string, key: string) => `${hero}_${key.toLowerCase()}`
