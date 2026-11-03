// Các lớp phủ trên bàn 10 ô mà MatchScreen chưa vẽ: tướng úp bước gọi, khoá đường chưa mở, đếm ngược hồi sinh, huy hiệu dấu trên đường.
// Bóc từ docs/mockups/match/*.png; toạ độ tính trong node bàn (1095×730), mỗi hàm vẽ vào layer đã clear sẵn.
import {
    Graphics, Node
} from "cc"
import {
    C, withAlpha
} from "../../dna/theme"
import {
    cg
} from "../../shared"
import {
    heroName, type CardView
} from "../../net/game"
import {
    Frame, box, text
} from "../../ui/kit"
import {
    slot
} from "../../ui/slot"

type Side = cg.Side

const LANE_X = [-430,
    -214,
    0,
    211,
    425]
const ROW_Y = {
    foe: 207, mine: -169
}
const PAD_X = [-214,
    211]
const SLOT = 86
const CELL_W = 150
const CELL_H = 200
const ELEMENT_NAME: Record<string, string> = {
    earth: "Đất", water: "Nước", grass: "Cỏ"
}

/** Các trường công khai mà CardView của net/game.ts chưa khai báo nhưng server gửi kèm */
interface ExtraView {
    markers?: Record<Side, string[][]>;
    laneStacks?: Record<Side, Record<number, Record<string, number>>>;
    laneElements?: string[];
}

const other = (s: Side): Side => s === "A" ? "B" : "A"
const rowY = (v: CardView, side: Side) => side === (v.you ?? "A") ? ROW_Y.mine : ROW_Y.foe

/** Chip nhỏ: nền tối viền vàng mảnh, chữ ở giữa */
function chip(parent: Node, caption: string, x: number, y: number, w: number, edge = C.goldDark, color = C.goldLight, size = 14) {
    const f = new Frame(parent,
        w,
        22,
        x,
        y,
        {
            fill: withAlpha(C.bg,
                235), stroke: edge, inner: null, chamfer: 5, line: 1.5
        })
    text(f.node,
        caption,
        0,
        0,
        {
            size, width: w - 6, height: 20, color
        })
    return f
}

/** Bước gọi tướng úp: tướng mình chọn úp hiện mờ ở đường đã chọn, dấu sẵn sàng của hai phe, đếm đã chọn / cap */
export function renderBlindPicks(layer: Node, view: CardView) {
    const b = view.blind
    if (view.phase !== "blind" || !b) return
    const you = view.you ?? "A"
    const mine = b.picks[you] ?? []
    for (const p of mine) {
        if (p.lane < 0 || p.lane > 4) continue
        const x = LANE_X[p.lane], y = ROW_Y.mine
        text(layer,
            heroName(p.hero),
            x,
            y + 58,
            {
                font: "titleMedium", size: 20, width: CELL_W, upper: false, color: C.textMuted
            })
        const s = slot(layer,
            "heroes",
            p.hero,
            SLOT,
            x,
            y,
            {
                edge: C.ally, dim: true
            })
        // Tấm úp: phủ mờ và nhãn "Úp" ở giữa ô
        const veil = box("Veil",
            s.node,
            SLOT,
            SLOT).addComponent(Graphics)
        veil.fillColor = withAlpha(C.panel,
            120)
        veil.rect(-SLOT / 2,
            -SLOT / 2,
            SLOT,
            SLOT)
        veil.fill()
        chip(s.node,
            "Úp",
            0,
            0,
            48,
            C.teal,
            C.goldLight,
            16)
    }
    const dy = 330
    for (const side of [you,
        other(you)] as Side[]) {
        const mineSide = side === you
        const y = mineSide ? -dy : dy + 5
        if (b.ready[side]) chip(layer,
            "Đã sẵn sàng",
            LANE_X[0],
            y,
            120,
            C.teal,
            C.teal,
            15)
    }
    chip(layer,
        `Đã chọn ${mine.length} / ${b.cap}`,
        LANE_X[4],
        -dy,
        130,
        mine.length >= b.cap ? C.teal : C.goldDark,
        C.goldLight,
        15)
}

/** Ổ khoá vẽ bằng Graphics: quai (đường gấp khúc tròn) và thân (hình chữ nhật), mỗi thứ một node */
function drawLock(parent: Node, x: number, y: number) {
    const shackle = box("Shackle",
        parent,
        60,
        60,
        x,
        y + 12).addComponent(Graphics)
    shackle.lineWidth = 5
    shackle.strokeColor = C.gold
    const r = 13
    shackle.moveTo(-r,
        0)
    shackle.lineTo(-r,
        6)
    const steps = 10
    for (let i = 0; i <= steps; i++) {
        const a = Math.PI - (Math.PI * i) / steps
        shackle.lineTo(Math.cos(a) * r,
            6 + Math.sin(a) * r)
    }
    shackle.lineTo(r,
        0)
    shackle.stroke()
    const body = box("Body",
        parent,
        60,
        60,
        x,
        y).addComponent(Graphics)
    body.fillColor = C.goldDark
    body.rect(-20,
        -14,
        40,
        28)
    body.fill()
    body.fillColor = C.gold
    body.rect(-18,
        -12,
        36,
        24)
    body.fill()
    // Lỗ khoá
    body.fillColor = C.bg
    body.circle(0,
        2,
        4)
    body.fill()
    body.rect(-1.5,
        -8,
        3,
        8)
    body.fill()
}

/** Đường chưa mở: phủ tối cả hai hàng, ổ khoá và "Mở vòng N" */
export function renderLaneLocks(layer: Node, view: CardView) {
    for (let lane = 0; lane < 5; lane++) {
        if (view.openLanes.includes(lane)) continue
        const openRound = cg.RULES.laneOpenRound[lane]
        for (const y of [ROW_Y.foe,
            ROW_Y.mine]) {
            const x = LANE_X[lane]
            const dim = box("LaneDim",
                layer,
                CELL_W,
                CELL_H,
                x,
                y).addComponent(Graphics)
            dim.fillColor = withAlpha(C.bg,
                200)
            dim.rect(-CELL_W / 2,
                -CELL_H / 2,
                CELL_W,
                CELL_H)
            dim.fill()
            drawLock(layer,
                x,
                y + 14)
            text(layer,
                `Mở vòng ${openRound}`,
                x,
                y - 28,
                {
                    font: "titleMedium", size: 18, width: CELL_W - 10, upper: false, color: C.goldLight
                })
        }
    }
}

/** Vòng đếm ngược: nét mờ cả vòng, cung sáng theo số vòng còn lại trên tổng thời gian hồi sinh */
function drawRing(parent: Node, x: number, y: number, r: number, frac: number) {
    const g = box("Ring",
        parent,
        r * 2 + 8,
        r * 2 + 8,
        x,
        y).addComponent(Graphics)
    g.lineWidth = 4
    g.strokeColor = withAlpha(C.goldDark,
        200)
    g.circle(0,
        0,
        r)
    g.stroke()
    const steps = 40
    const n = Math.max(1,
        Math.round(steps * Math.min(1,
            Math.max(0,
                frac))))
    g.strokeColor = C.teal
    g.moveTo(0,
        r)
    for (let i = 1; i <= n; i++) {
        const a = Math.PI / 2 - (Math.PI * 2 * i) / steps
        g.lineTo(Math.cos(a) * r,
            Math.sin(a) * r)
    }
    g.stroke()
}

/** Tướng chết giữ đường: vòng đếm ngược số vòng còn lại và "Hồi sinh vòng N" ngay trên ô tướng */
export function renderRespawn(layer: Node, view: CardView) {
    const total = Math.max(1,
        cg.RULES.respawnRounds)
    for (const side of ["A",
        "B"] as Side[]) {
        const y = rowY(view,
            side)
        view.lanes[side].forEach((id, lane) => {
            const u = id ? view.units[id] : undefined
            if (!u || u.status !== "dead") return
            const x = LANE_X[lane]
            const left = Math.max(0,
                u.respawnRound - view.round)
            drawRing(layer,
                x,
                y + 8,
                22,
                left / total)
            text(layer,
                String(left),
                x,
                y + 8,
                {
                    font: "number", size: 22, width: 40, color: C.goldLight
                })
            text(layer,
                `Hồi sinh vòng ${u.respawnRound}`,
                x,
                y - 26,
                {
                    size: 13, width: SLOT - 4, color: C.goldLight
                })
        })
    }
}

/** Huy hiệu dưới ô: Nguyên Tố của đường, dấu mốc (markers) và chồng hiệu ứng ô (laneStacks), xếp ngang giữa đường */
export function renderLaneMarkers(layer: Node, view: CardView) {
    const ex = view as CardView & ExtraView
    for (const side of ["A",
        "B"] as Side[]) {
        const y = rowY(view,
            side) - 118
        for (let lane = 0; lane < 5; lane++) {
            const items: { caption: string; edge: typeof C.gold }[] = []
            const element = ex.laneElements?.[lane]
            if (element) items.push({
                caption: ELEMENT_NAME[element] ?? element, edge: C.teal
            })
            for (const id of ex.markers?.[side]?.[lane] ?? []) items.push({
                caption: id, edge: C.gold
            })
            const stacks = ex.laneStacks?.[side]?.[lane] ?? {
            }
            for (const [id, n] of Object.entries(stacks)) if (n > 0) items.push({
                caption: `${id} x${n}`, edge: C.goldDark
            })
            if (!items.length) continue
            // Tối đa 3 huy hiệu mỗi đường, mỗi huy hiệu 46 px rộng; chồng dồn theo hàng dọc khi nhiều hơn
            const w = 66
            items.slice(0,
                4).forEach((it, i) => chip(layer,
                it.caption,
                LANE_X[lane],
                y - i * 24,
                w,
                it.edge,
                C.goldLight,
                12))
        }
    }
}

/** Bệ triệu hồi phụ trên sông: hiện chỗ cho các lớp phủ cần neo; lead dùng để đặt thêm huy hiệu nếu cần */
export const RIVER_PADS = PAD_X.map((x) => ({
    x, y: 0
}))
