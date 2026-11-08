// Tooltip khi rê lên tướng trên bàn, bóc từ docs/mockups/match/targeting.png: khung vàng, tên, Máu x/y, Khiên, hiệu ứng
// có tên và số vòng còn lại, đồ đang đeo. Tự né mép sân khấu 1920x1080.
import {
    Color, Node
} from "cc"
import {
    cg
} from "../../shared"
import {
    C, STAGE, withAlpha
} from "../../dna/theme"
import {
    Frame, clear, text
} from "../../ui/kit"
import {
    gameOf, heroName, type CardView
} from "../../net/game"
import {
    unitEffects
} from "./statusText"

const W = 300
const PAD = 16
const TITLE_H = 38
const LINE_H = 28

export class UnitTooltip {
    private root: Node | null = null

    constructor(private readonly layer: Node) {
    }

    /** Hiện tooltip của tướng `unitId` cạnh điểm `anchor` (toạ độ sân khấu, gốc ở giữa) */
    show(view: CardView, unitId: string, anchor: { x: number; y: number }): void {
        this.hide()
        const u = view.units[unitId]
        if (!u) return
        const shield = gameOf(view).totalShield(u)
        const rows: { s: string; color: Color; size: number }[] = []
        rows.push({
            s: `Máu ${Math.round(u.hp)}/${Math.round(u.maxHp)}${shield ? `  ·  Khiên ${Math.round(shield)}` : ""}`, color: C.text, size: 20
        })
        const fx = unitEffects(view, u)
        for (const e of fx.slice(0, 6)) rows.push({
            s: `${e.name}${e.turns ? ` · còn ${e.turns} vòng` : ""}`, color: e.good ? C.teal : C.danger, size: 18
        })
        if (fx.length > 6) rows.push({
            s: `+${fx.length - 6} hiệu ứng khác`, color: C.textMuted, size: 16
        })
        if (!fx.length) rows.push({
            s: "Hiệu ứng: không có", color: C.textMuted, size: 18
        })
        for (const it of u.items.slice(0, 3)) rows.push({
            s: `Đồ: ${cg.itemText(it, "vi")?.name ?? it}`, color: C.goldLight, size: 17
        })
        const h = PAD * 2 + TITLE_H + rows.length * LINE_H
        const hx = STAGE.w / 2
        const hy = STAGE.h / 2
        // Mặc định bên phải tướng; hết chỗ thì sang trái. Kẹp lại trong sân khấu.
        let x = anchor.x + 40 + W / 2
        if (x + W / 2 > hx - 8) x = anchor.x - 40 - W / 2
        x = Math.min(hx - 8 - W / 2, Math.max(-hx + 8 + W / 2, x))
        const y = Math.min(hy - 8 - h / 2, Math.max(-hy + 8 + h / 2, anchor.y + 20))
        const f = new Frame(this.layer, W, h, x, y, {
            fill: withAlpha(C.bg, 245), stroke: C.gold, inner: C.goldDark, chamfer: 10, gems: "none"
        })
        this.root = f.node
        const top = h / 2 - PAD
        text(f.node, u.token ? u.token.name : heroName(u.hero), 0, top - TITLE_H / 2, {
            font: "title", size: 24, width: W - PAD * 2, height: TITLE_H
        })
        rows.forEach((r, i) => text(f.node, r.s, 0, top - TITLE_H - LINE_H * (i + 0.5), {
            size: r.size, width: W - PAD * 2, height: LINE_H, align: "left", color: r.color
        }))
    }

    hide(): void {
        if (this.root?.isValid) {
            clear(this.root)
            this.root.destroy()
        }
        this.root = null
    }
}
