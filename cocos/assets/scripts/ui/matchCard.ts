// Lá bài trong trận (tay bài, chuỗi), cùng kiểu với lá ở màn xếp bộ (card.ts, card-anatomy.png): khung vát góc theo nhóm,
// ô tranh, dải tên, dòng loại, mô tả, ngọc đỉnh/đáy. Thêm kiểu khung lá chiêu của tướng (viền vàng, dải xanh lam đậm,
// huy hiệu mana tròn góc trên-trái, nhãn Q/E/R góc trên-phải). Tên, mô tả, mana do engine tính trên state hiện tại.
import {
    Color, Graphics, Node, Tween, Vec3, tween
} from "cc"
import {
    C, GROUP_FRAME, withAlpha
} from "../dna/theme"
import {
    cardText, manaCostOf, type CardView
} from "../net/game"
import {
    cg
} from "../shared"
import {
    image
} from "./assets"
import {
    Frame, box, drawGem, setOpacity, text
} from "./kit"

const SKILL_FRAME = {
    edge: new Color().fromHEX("#c8aa6e"), inner: new Color().fromHEX("#1f3f7a")
}

/** Nhóm khung của lá trong trận */
export function cardGroup(card: cg.Card): "skill" | "basic" | "spell" | "gold" | "item" {
    if (card.hero && card.kind !== "support") return "skill"
    if (card.id === "gold") return "gold"
    if (card.id === "item" || card.id === "legend") return "item"
    if (card.id === "basic") return "basic"
    return "spell"
}

/** Đường tranh của lá: lá trong bộ dùng tranh đã duyệt; đồ huyền thoại và chiêu là ô ảnh vuông thầy tự thêm */
export function cardArtPath(card: cg.Card): string {
    if (card.id === "legend" && card.item) return `art/items/${card.item}`
    if (card.id === "item" && card.item) return `art/items/${card.item}`
    if (card.hero && card.kind !== "support") {
        const key = cg.skillOfCard(card)?.key ?? card.id
        return `art/skills/${card.hero}_${String(key).toLowerCase()}`
    }
    return `art/cards/${card.id.replace(":",
        "_")}`
}

export interface MatchCardOpts {
    /** Lá dùng được lúc này: nâng lên, viền ngọc */
    usable?: boolean;
    /** Lá đang chọn */
    selected?: boolean;
    /** Không dùng được: mờ */
    dim?: boolean;
    /** Lá đối thủ úp: vẽ lưng bài */
    back?: boolean;
    onPick?: () => void;
    /** Nhãn nhỏ dưới lá (ví dụ "Quick play") */
    badge?: string;
    /** Rê chuột vào / ra khỏi lá (để mở khung phóng to) */
    onHover?: (on: boolean) => void;
}

/** Lưng bài (lá đối thủ úp, bộ bài) */
export function cardBack(parent: Node, w: number, h: number, x = 0, y = 0): Node {
    const f = new Frame(parent,
        w,
        h,
        x,
        y,
        {
            fill: C.tealDeep, stroke: C.gold, inner: C.goldDark, chamfer: Math.round(w / 14), gems: "both"
        })
    const g = box("Mark",
        f.node,
        w,
        h).addComponent(Graphics)
    drawGem(g,
        0,
        0,
        Math.round(w / 5))
    return f.node
}

/** Lá bài w × h dựng từ cg.Card trên state `view` */
export function matchCard(parent: Node, view: CardView, card: cg.Card, w: number, h: number, x: number, y: number, o: MatchCardOpts = {
}): Node {
    if (o.back) return cardBack(parent,
        w,
        h,
        x,
        y)
    const group = cardGroup(card)
    const tone = group === "skill" ? SKILL_FRAME : GROUP_FRAME[group]
    const info = cardText(view,
        card)
    const root = box(`Card ${card.uid}`,
        parent,
        w,
        h,
        x,
        y)
    const lift = box("Lift",
        root,
        w,
        h)
    const frame = new Frame(lift,
        w,
        h,
        0,
        0,
        {
            fill: withAlpha(C.panel,
                250),
            stroke: o.selected || o.usable ? C.teal : tone.edge,
            line: o.selected || o.usable ? 3 : 2,
            inner: tone.inner,
            glow: o.selected ? C.teal : o.usable ? C.tealDark : null,
            chamfer: Math.round(w / 15),
        })
    const artW = w - 12, artH = Math.round(h * 0.5)
    const artY = h / 2 - 6 - artH / 2
    const well = box("Well",
        lift,
        artW,
        artH,
        0,
        artY).addComponent(Graphics)
    well.fillColor = withAlpha(tone.inner,
        140)
    well.rect(-artW / 2,
        -artH / 2,
        artW,
        artH)
    well.fill()
    // Chưa có ảnh: vòng sáng + chữ cái (phím Q/E/R với lá chiêu) cho lá không trống rỗng; ảnh đè lên khi có
    const glow = box("Glow",
        lift,
        artW,
        artH,
        0,
        artY).addComponent(Graphics)
    for (const [k, a] of [[0.46,
        18],
    [0.34,
        26],
    [0.22,
        36]] as const) {
        glow.fillColor = withAlpha(tone.edge,
            a)
        glow.circle(0,
            0,
            artH * k)
        glow.fill()
    }
    const glyph = group === "skill" ? String(cg.skillOfCard(card)?.key ?? "") : info.name.slice(0,
        1).toUpperCase()
    if (glyph) text(lift,
        glyph,
        0,
        artY,
        {
            font: "title", size: Math.round(artH * 0.55), width: artW, height: artH, color: withAlpha(tone.edge,
                120)
        })
    image(lift,
        cardArtPath(card),
        artW,
        artH,
        0,
        artY)
    const plateH = Math.round(h * 0.11), plateY = artY - artH / 2 + 2
    const plate = new Frame(lift,
        w - 8,
        plateH,
        0,
        plateY,
        {
            fill: withAlpha(C.bg,
                240), stroke: tone.edge, inner: null, chamfer: 5
        })
    text(plate.node,
        info.name,
        0,
        0,
        {
            font: "title", size: Math.round(h * 0.07), width: w - 18, height: plateH
        })
    const typeH = Math.round(h * 0.08)
    const typeY = plateY - plateH / 2 - typeH / 2 - 1
    text(lift,
        group === "skill" ? `Chiêu · ${cg.getHero(card.hero ?? "")?.name ?? ""}` : info.type,
        0,
        typeY,
        {
            size: Math.round(h * 0.055), color: C.textMuted, width: w - 14, height: typeH
        })
    const descTop = typeY - typeH / 2, descBottom = -h / 2 + 8
    text(lift,
        info.desc.replace(/\s+/g,
            " "),
        0,
        (descTop + descBottom) / 2,
        {
            size: Math.round(h * 0.05), color: C.text, width: w - 14, height: descTop - descBottom, wrap: true
        })
    const gems = box("Gems",
        lift,
        w,
        h).addComponent(Graphics)
    drawGem(gems,
        0,
        h / 2,
        6,
        tone.edge)
    drawGem(gems,
        0,
        -h / 2,
        6,
        tone.edge)
    const cost = manaCostOf(view,
        card)
    if (cost !== undefined) {
        const badge = box("Mana",
            lift,
            40,
            40,
            -w / 2 + 16,
            h / 2 - 16)
        const bg = badge.addComponent(Graphics)
        bg.fillColor = new Color().fromHEX("#123a7a")
        bg.strokeColor = C.gold
        bg.lineWidth = 2
        bg.circle(0,
            0,
            15)
        bg.fill()
        bg.stroke()
        text(badge,
            String(cost),
            0,
            0,
            {
                font: "number", size: 20, width: 34, height: 30, color: C.goldLight
            })
    }
    if (group === "skill") {
        const key = cg.skillOfCard(card)?.key
        if (key) text(lift,
            key,
            w / 2 - 14,
            h / 2 - 14,
            {
                font: "title", size: 20, width: 26, height: 26, color: C.goldLight
            })
    }
    if (o.badge) {
        const rib = new Frame(lift,
            Math.round(w * 0.74),
            20,
            0,
            -h / 2 - 11,
            {
                fill: C.tealDeep, stroke: C.teal, inner: null, chamfer: 6, sheen: false, line: 2
            })
        text(rib.node,
            o.badge,
            0,
            0,
            {
                font: "textMedium", bold: true, size: 14, width: w, height: 20, color: C.goldLight
            })
    }
    if (o.dim) setOpacity(lift,
        140)
    if (o.usable || o.selected) lift.setPosition(0,
        o.selected ? 22 : 12)
    if (o.onPick) {
        root.on(Node.EventType.MOUSE_ENTER,
            () => {
                o.onHover?.(true)
                Tween.stopAllByTarget(lift)
                tween(lift).to(0.1,
                    {
                        position: new Vec3(0,
                            28,
                            0), scale: new Vec3(1.06,
                            1.06,
                            1)
                    }).start()
                frame.draw({
                    fill: withAlpha(C.panel,
                        250), stroke: C.teal, line: 3, inner: tone.inner, glow: C.teal, chamfer: Math.round(w / 15)
                })
            })
        root.on(Node.EventType.MOUSE_LEAVE,
            () => {
                o.onHover?.(false)
                Tween.stopAllByTarget(lift)
                tween(lift).to(0.1,
                    {
                        position: new Vec3(0,
                            o.selected ? 22 : o.usable ? 12 : 0,
                            0), scale: new Vec3(1,
                            1,
                            1)
                    }).start()
                frame.draw({
                    fill: withAlpha(C.panel,
                        250), stroke: o.selected || o.usable ? C.teal : tone.edge, line: o.selected || o.usable ? 3 : 2, inner: tone.inner, glow: o.selected ? C.teal : o.usable ? C.tealDark : null, chamfer: Math.round(w / 15)
                })
            })
        root.on(Node.EventType.TOUCH_END,
            o.onPick)
    }
    return root
}
