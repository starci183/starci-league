// Ô vuông giữ chỗ cho ảnh tướng, món đồ, chiêu (thầy chốt 2026-11-04: ô vuông, thầy tự thêm ảnh).
// Code nạp ảnh theo mã từ assets/resources/art/<loại>/<mã>; thiếu ảnh thì ô hiện khung trống có dấu thoi mờ.
import {
    Color, Graphics, Node
} from "cc"
import {
    C, withAlpha
} from "../dna/theme"
import {
    cg
} from "../shared"
import {
    image
} from "./assets"
import {
    Frame, box, text
} from "./kit"

const sameColor = (a: Color, b: Color) => a.r === b.r && a.g === b.g && a.b === b.b

/** Mảnh skin ô vuông theo màu viền: xanh lam (phe mình), đỏ (phe địch), ngọc (đang chọn), còn lại vàng */
function slotSkin(edge: Color | undefined): string {
    if (!edge) return "slot-gold"
    if (sameColor(edge,
        C.ally)) return "slot-ally"
    if (sameColor(edge,
        C.enemy)) return "slot-enemy"
    if (sameColor(edge,
        C.teal)) return "slot-teal"
    return "slot-gold"
}

/** Chữ giữ chỗ khi chưa có ảnh: tướng lấy 2 chữ đầu của tên, chiêu lấy phím P/Q/E/R, đồ và lá lấy chữ đầu các từ */
function placeholderLabel(kind: string, id: string): string {
    if (kind === "heroes") return (cg.getHero(id)?.name ?? id).slice(0,
        2)
    if (kind === "skills") return id.slice(id.lastIndexOf("_") + 1).toUpperCase().slice(0,
        1)
    return id.split(/[_:]/).filter(Boolean).map((w) => w[0]).join("").toUpperCase().slice(0,
        2)
}

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
            fill: withAlpha(C.panelRaised,
                245),
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
    if (id && size >= 40) {
        // Nền giữ chỗ có chiều sâu (vòng sáng đồng tâm + chữ cái) để ô chưa có ảnh vẫn nhận ra được; ảnh đè lên khi thầy thêm
        mark.clear()
        const glow = box("Glow",
            f.node,
            size,
            size).addComponent(Graphics)
        for (const [k, a] of [[0.42,
            16],
        [0.32,
            22],
        [0.2,
            30]] as const) {
            glow.fillColor = withAlpha(s.edge ?? C.gold,
                a)
            glow.circle(0,
                0,
                size * k)
            glow.fill()
        }
        text(f.node,
            placeholderLabel(kind,
                id),
            0,
            0,
            {
                font: "title", size: Math.round(size * 0.4), width: size, height: size, color: withAlpha(s.edge ?? C.gold,
                    185), upper: kind !== "heroes"
            })
    }
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
