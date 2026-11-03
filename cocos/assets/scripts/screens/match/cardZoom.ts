// Khung xem phóng to lá bài khi rê chuột trên tay bài / mắt xích chuỗi: lá cỡ lớn (matchCard) cạnh lá đang rê, kèm khung
// phụ ghi tên, loại, mana và mô tả đầy đủ. Bóc từ docs/mockups/cocos/card-anatomy.png.
import {
    Node, Tween, UIOpacity, Vec3, tween
} from "cc"
import {
    C, GROUP_FRAME, withAlpha
} from "../../dna/theme"
import {
    cardText, heroName, manaCostOf, type CardView
} from "../../net/game"
import {
    cg
} from "../../shared"
import {
    Frame, box, setOpacity, text
} from "../../ui/kit"
import {
    cardGroup, matchCard
} from "../../ui/matchCard"

const STAGE_W = 1920
const STAGE_H = 1080
const CARD_W = 300
const CARD_H = 430
const INFO_W = 300
const GAP = 14
const MARGIN = 12
/** Nửa bề rộng lá đang rê (chừa để khung zoom không che lá đó) */
const ANCHOR_HALF_W = 110
const OPEN_TIME = 0.12

export class CardZoom {
    private readonly layer: Node
    private root: Node | null = null

    constructor(layer: Node) {
        this.layer = layer
    }

    /** Mở khung zoom cạnh lá có tâm ở `anchor` (toạ độ sân khấu) */
    show(view: CardView, card: cg.Card, anchor: { x: number; y: number }): void {
        this.hide()
        const totalW = CARD_W + GAP + INFO_W
        const limitX = STAGE_W / 2 - MARGIN
        const limitY = STAGE_H / 2 - MARGIN
        // Ưu tiên bên phải lá đang rê; không đủ chỗ thì sang bên trái
        let left = anchor.x + ANCHOR_HALF_W
        if (left + totalW > limitX) left = anchor.x - ANCHOR_HALF_W - totalW
        left = Math.max(-limitX, Math.min(left, limitX - totalW))
        const cy = Math.max(-limitY + CARD_H / 2, Math.min(anchor.y, limitY - CARD_H / 2))
        const root = box("CardZoom", this.layer, totalW, CARD_H, left + totalW / 2, cy)
        this.root = root
        matchCard(root, view, card, CARD_W, CARD_H, -totalW / 2 + CARD_W / 2, 0)
        this.drawInfo(root, view, card, -totalW / 2 + CARD_W + GAP + INFO_W / 2)
        // Mở nhẹ: mờ dần và phóng từ 0.94 lên 1
        setOpacity(root, 0)
        root.setScale(0.94, 0.94, 1)
        const op = root.getComponent(UIOpacity)!
        tween(op).to(OPEN_TIME, {
            opacity: 255
        }).start()
        tween(root).to(OPEN_TIME, {
            scale: new Vec3(1, 1, 1)
        }).start()
    }

    hide(): void {
        const root = this.root
        if (!root) return
        this.root = null
        const op = root.getComponent(UIOpacity)
        if (op) Tween.stopAllByTarget(op)
        Tween.stopAllByTarget(root)
        if (root.isValid) root.destroy()
    }

    private drawInfo(parent: Node, view: CardView, card: cg.Card, x: number) {
        const group = cardGroup(card)
        const tone = group === "skill" ? {
            edge: C.gold, inner: C.goldDark
        } : GROUP_FRAME[group]
        const info = cardText(view, card)
        const cost = manaCostOf(view, card)
        const frame = new Frame(parent, INFO_W, CARD_H, x, 0, {
            fill: withAlpha(C.panel, 250), stroke: tone.edge, inner: tone.inner, chamfer: 14, gems: "both"
        })
        const pad = 20
        const inner = INFO_W - pad * 2
        let top = CARD_H / 2 - 26
        text(frame.node, info.name, 0, top - 22, {
            font: "title", size: 28, width: inner, height: 44
        })
        top -= 60
        const kind = group === "skill" ? "Chiêu" : info.type
        text(frame.node, kind, 0, top - 14, {
            size: 22, color: C.textMuted, width: inner, height: 28
        })
        top -= 34
        if (group === "skill" && card.hero) {
            text(frame.node, `Tướng: ${heroName(card.hero)}`, 0, top - 14, {
                size: 22, color: C.goldLight, width: inner, height: 28
            })
            top -= 34
        }
        if (cost !== undefined) {
            text(frame.node, `Mana: ${cost}`, 0, top - 14, {
                font: "number", size: 22, color: C.teal, width: inner, height: 28
            })
            top -= 34
        }
        top -= 8
        const bottom = -CARD_H / 2 + 26
        text(frame.node, info.desc.replace(/\s+/g, " "), 0, (top - 10 + bottom) / 2, {
            size: 22, color: C.text, width: inner, height: top - 10 - bottom, wrap: true
        })
    }
}
