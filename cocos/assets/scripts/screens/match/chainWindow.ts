// Cửa sổ phản ứng chuỗi (giữa bàn) và cột "Chuỗi kỹ năng hiện tại" đầy đủ, bóc từ docs/mockups/match/chain.png.
// Hành vi gốc: packages/client/src/card/ChainPanel.tsx. Server không giới hạn thời gian phản ứng, nên đồng hồ chỉ hiện khi có số giây.
import {
    _decorator, Component, Graphics, Node
} from "cc"
import {
    C, at, withAlpha
} from "../../dna/theme"
import {
    gameOf, heroName, type CardView
} from "../../net/game"
import {
    cg
} from "../../shared"
import {
    Button, Frame, box, text
} from "../../ui/kit"
import {
    skillArt, slot
} from "../../ui/slot"

const { ccclass } = _decorator

/** Vẽ lại đồng hồ mỗi khung hình theo thời gian còn lại */
@ccclass("ReactionTicker")
export class ReactionTicker extends Component {
    tick: ((dt: number) => void) | null = null
    update(dt: number) { this.tick?.(dt) }
}

const CLOCK_R = 38

/** Hộp hỏi phản ứng: tiêu đề, đồng hồ tròn đếm ngược (nếu có giới hạn), nút Bỏ qua */
export class ReactionWindow {
    private frame: Frame | null = null

    constructor(private readonly layer: Node) {}

    show(o: { title: string; seconds: number | null; onPass: () => void }): void {
        this.hide()
        const clock = o.seconds !== null && o.seconds > 0
        const w = 545, h = clock ? 190 : 135
        const f = new Frame(this.layer,
            w,
            h,
            at(938,
                0).x,
            at(0,
                500).y,
            {
                fill: withAlpha(C.bg,
                    245), stroke: C.gold, inner: C.goldDark, chamfer: 16, gems: "top"
            })
        this.frame = f
        text(f.node,
            o.title,
            0,
            h / 2 - 36,
            {
                font: "textMedium", bold: true, size: 28, width: w - 25, upper: false
            })
        if (clock) this.buildClock(f.node, o.seconds as number, -w / 2 + 90, -18)
        new Button(f.node,
            "Bỏ qua",
            150,
            44,
            clock ? 80 : 0,
            clock ? -22 : -26,
            o.onPass,
            "gold",
            24)
    }

    hide(): void {
        this.frame?.node.destroy()
        this.frame = null
    }

    private buildClock(parent: Node, seconds: number, x: number, y: number) {
        const holder = box("Clock",
            parent,
            CLOCK_R * 2 + 12,
            CLOCK_R * 2 + 12,
            x,
            y)
        const ring = box("Ring",
            holder,
            CLOCK_R * 2 + 12,
            CLOCK_R * 2 + 12).addComponent(Graphics)
        const arc = box("Arc",
            holder,
            CLOCK_R * 2 + 12,
            CLOCK_R * 2 + 12).addComponent(Graphics)
        ring.lineWidth = 3
        ring.strokeColor = withAlpha(C.goldDark,
            200)
        ring.circle(0,
            0,
            CLOCK_R)
        ring.stroke()
        const label = text(holder,
            String(Math.ceil(seconds)),
            0,
            0,
            {
                font: "number", size: 34, width: 60, height: 48
            })
        let left = seconds
        const paint = () => {
            arc.clear()
            const ratio = Math.max(0, left / seconds)
            if (ratio <= 0) return
            arc.lineWidth = 6
            arc.strokeColor = C.teal
            // Vòng cung bắt đầu ở đỉnh, ngắn dần theo chiều kim đồng hồ
            const a0 = Math.PI / 2
            arc.arc(0,
                0,
                CLOCK_R,
                a0,
                a0 - Math.PI * 2 * ratio,
                false)
            arc.stroke()
            label.string = String(Math.ceil(left))
        }
        paint()
        const ticker = holder.addComponent(ReactionTicker)
        ticker.tick = (dt: number) => {
            left -= dt
            paint()
        }
    }
}

const HEAD_H = 22
const FOOT_H = 22
const COLUMN_W = 295
const MAX_H = 300

/**
 * Cột chuỗi đầy đủ. `top` là toạ độ y (trong `parent`, y hướng lên) của mép trên cột; cột canh giữa theo x = 0,
 * rộng 295, cao tối đa 300. Mắt xích cuối giải trước nên nằm trên cùng.
 */
export function renderChainLinks(parent: Node, view: CardView, top: number): void {
    const links = [...(view.chain?.links ?? [])].reverse()
    const you = view.you ?? "A"
    if (!links.length) {
        text(parent,
            "Chưa có chuỗi",
            0,
            top - 70,
            {
                size: 22, width: 280, color: C.textMuted
            })
        return
    }
    const game = gameOf(view)
    const avail = MAX_H - HEAD_H - FOOT_H
    const pitch = Math.min(100, Math.floor(avail / links.length))
    const rowH = Math.max(40, pitch - 8)
    const compact = rowH < 70
    const art = rowH - 14

    text(parent,
        "Giải trước",
        0,
        top - HEAD_H / 2,
        {
            size: 16, width: COLUMN_W, align: "left", color: C.teal, height: HEAD_H
        })
    links.forEach((l, i) => {
        const y = top - HEAD_H - pitch * i - pitch / 2 + 4
        const first = i === 0
        const f = new Frame(parent,
            COLUMN_W,
            rowH,
            0,
            y,
            {
                fill: withAlpha(first ? C.tealDeep : C.bg,
                    230), stroke: first ? C.teal : C.gold, inner: null, glow: first ? C.teal : null, chamfer: 8
            })
        const skillKey = l.card?.hero ? cg.skillOfCard(l.card)?.key : undefined
        slot(f.node,
            l.card?.hero ? "skills" : "cards",
            l.card ? l.card.hero ? skillArt(l.card.hero,
                skillKey ?? "q") : l.card.id.replace(":",
                "_") : "",
            art,
            -COLUMN_W / 2 + art / 2 + 8,
            0)
        const left = -COLUMN_W / 2 + art + 18
        const textW = COLUMN_W - art - 74
        const cardName = l.card ? cg.cardInfo(game,
            l.card).name : l.mode === "cardless" ? "Đòn không cần lá" : "Đòn đánh"
        const actor = l.actor ? heroName(view.units[l.actor]?.hero ?? "") : l.side === you ? "Bạn" : "Đối thủ"
        const targets = l.targets.map((t) => heroName(view.units[t]?.hero ?? "")).filter((s) => !!s).join(", ")
        const who = `${actor}${targets ? ` → ${targets}` : ""}`
        const nameSize = compact ? 17 : 20
        const subSize = compact ? 13 : 15
        const nameY = compact ? 9 : 16
        const nameLabel = text(f.node,
            cardName,
            left + textW / 2,
            nameY,
            {
                font: "textMedium", bold: true, size: nameSize, width: textW, align: "left", upper: false
            })
        nameLabel.color = first ? C.goldLight : C.gold
        text(f.node,
            who,
            left + textW / 2,
            compact ? -9 : -12,
            {
                size: subSize, width: textW, align: "left", color: C.text
            })
        text(f.node,
            `#${String(l.n).padStart(3,
                "0")}`,
            COLUMN_W / 2 - 28,
            0,
            {
                font: "number", size: compact ? 15 : 17, width: 52, color: first ? C.teal : C.textMuted
            })
    })
    text(parent,
        "Giải sau",
        0,
        top - HEAD_H - pitch * links.length - FOOT_H / 2 + 8,
        {
            size: 16, width: COLUMN_W, align: "left", color: C.textMuted, height: FOOT_H
        })
}
