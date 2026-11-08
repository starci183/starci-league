// Lá bài chuẩn game thẻ bài, bóc từ docs/mockups/cocos/card-anatomy.png: lá đứng, khung vát góc theo nhóm, ô tranh ~60%,
// dải tên, dòng loại, mô tả ngắn, huy hiệu n/max. Trạng thái: thường, hover (nhấc lên + ánh ngọc), có trong bộ,
// đủ tối đa (dải ĐỦ), chưa có trong bộ (mờ).
import {
    Graphics, Node, Tween, tween, Vec3
} from "cc"
import {
    C, GROUP_FRAME, GROUP_NAME, withAlpha
} from "../dna/theme"
import type {
    PoolCard
} from "../net/api"
import {
    image
} from "./assets"
import {
    Frame, box, drawGem, setOpacity, text
} from "./kit"

/** Mã tranh: "spell:heal" -> art/cards/spell_heal, "item:kiem_dai" -> art/cards/item_kiem_dai */
export const cardArt = (id: string) => id.startsWith("item:") ? `art/items/${id.slice(5)}` : `art/cards/${id.replace(":",
    "_")}`

export interface CardView { node: Node; setCount(n: number): void }

/** Lá bài w × h (tỉ lệ ~ 5:7.5 như mockup), bấm để gọi onPick */
export function gameCard(parent: Node, card: PoolCard, w: number, h: number, x: number, y: number, count: number, onPick: () => void): CardView {
    const root = box(`Card ${card.id}`,
        parent,
        w,
        h,
        x,
        y)
    const lift = box("Lift",
        root,
        w,
        h)
    const tone = GROUP_FRAME[card.group] ?? GROUP_FRAME.basic
    const base = new Frame(lift,
        w,
        h,
        0,
        0,
        {
            fill: withAlpha(C.panel,
                250), stroke: tone.edge, inner: null, chamfer: 9
        })

    const artW = w - 14, artH = Math.round(h * 0.52)
    const artY = h / 2 - 7 - artH / 2
    const well = box("ArtWell",
        lift,
        artW,
        artH,
        0,
        artY).addComponent(Graphics)
    well.fillColor = withAlpha(tone.inner,
        120)
    well.rect(-artW / 2,
        -artH / 2,
        artW,
        artH)
    well.fill()
    image(lift,
        cardArt(card.id),
        artW,
        artH,
        0,
        artY)

    const plateY = artY - artH / 2 + 2, plateH = Math.round(h * 0.105)
    const plate = new Frame(lift,
        w - 10,
        plateH,
        0,
        plateY,
        {
            fill: withAlpha(C.bg,
                240), stroke: tone.edge, inner: null, chamfer: 6
        })
    text(plate.node,
        card.name,
        0,
        0,
        {
            font: "title", size: Math.round(h * 0.062), width: w - 22, height: plateH
        })
    // Dòng loại ngay dưới dải tên, mô tả chiếm phần còn lại tới trên huy hiệu (tối đa 3 dòng)
    const typeH = Math.round(h * 0.075)
    const typeY = plateY - plateH / 2 - typeH / 2 - 2
    text(lift,
        GROUP_NAME[card.group] ?? card.group,
        0,
        typeY,
        {
            size: Math.round(h * 0.052), color: C.textMuted, width: w - 16, height: typeH
        })
    const descTop = typeY - typeH / 2, descBottom = -h / 2 + h * 0.11
    text(lift,
        card.desc,
        0,
        (descTop + descBottom) / 2,
        {
            size: Math.round(h * 0.048), color: C.text, width: w - 16, height: descTop - descBottom, wrap: true
        })

    const badgeW = Math.round(w * 0.36), badgeH = Math.round(h * 0.09)
    const badge = new Frame(lift,
        badgeW,
        badgeH,
        w / 2 - badgeW / 2 - 6,
        -h / 2 + badgeH / 2 + 6,
        {
            fill: withAlpha(C.bg,
                245), stroke: tone.edge, inner: null, chamfer: 5
        })
    const badgeText = text(badge.node,
        "",
        0,
        0,
        {
            font: "number", size: Math.round(h * 0.07), width: badgeW, height: badgeH
        })

    const ribbon = box("Full",
        lift,
        w * 0.32,
        h * 0.085,
        w / 2 - w * 0.16 - 4,
        h / 2 + 2)
    const ribbonG = ribbon.addComponent(Graphics)
    ribbonG.fillColor = C.tealDeep
    ribbonG.strokeColor = C.teal
    ribbonG.lineWidth = 1.5
    ribbonG.rect(-w * 0.16,
        -h * 0.0425,
        w * 0.32,
        h * 0.085)
    ribbonG.fill()
    ribbonG.stroke()
    text(ribbon,
        "Đủ",
        0,
        0,
        {
            font: "title", size: Math.round(h * 0.06), width: w * 0.3, height: h * 0.085, color: C.goldLight
        })

    const gems = box("Gems",
        lift,
        w,
        h).addComponent(Graphics)
    drawGem(gems,
        0,
        h / 2,
        7,
        tone.edge)
    drawGem(gems,
        0,
        -h / 2,
        7,
        tone.edge)

    let n = count
    let hover = false
    const paint = () => {
        const full = n >= card.max
        badgeText.string = `${n}/${card.max}`
        badgeText.color = n > 0 ? C.goldLight : C.textMuted
        ribbon.active = full
        base.draw({
            fill: withAlpha(C.panel,
                250),
            stroke: hover ? C.teal : tone.edge,
            line: hover || n > 0 ? 3 : 2,
            inner: tone.inner,
            glow: hover ? C.teal : n > 0 && card.group === "spell" ? tone.edge : null,
            chamfer: 9,
        })
        setOpacity(lift,
            n === 0 && !hover ? 150 : 255)
        Tween.stopAllByTarget(lift)
        tween(lift).to(0.12,
            {
                position: new Vec3(0,
                    hover ? 10 : 0,
                    0)
            }).start()
    }
    root.on(Node.EventType.MOUSE_ENTER,
        () => { hover = true; paint() })
    root.on(Node.EventType.MOUSE_LEAVE,
        () => { hover = false; paint() })
    root.on(Node.EventType.TOUCH_END,
        onPick)
    paint()
    return {
        node: root,
        setCount(value: number) { n = value; paint() },
    }
}
