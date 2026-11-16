// Màn Hướng dẫn (ngoài trận): bên trái lưới 6 tướng (chân dung, tên, vai trò) và tóm tắt "Lối chơi" (data/heroGuides.ts);
// bên phải 5 ô của tướng đang chọn (Nội tại, Q, E, R, Đánh thường: tên chiêu, mô tả ngắn, số tình huống), dưới cùng là các tình huống
// (biến thể) của ô đang chọn, mỗi cái một thẻ: tên, lời dặn và nút "Vào thử" riêng, mở màn trận thật với thế cờ dựng sẵn (tutorial/TutorialMatch.ts). Kịch bản: tutorial/scenarios.ts.
import {
    Node
} from "cc"
import {
    heroGuide
} from "../data/heroGuides"
import {
    C, withAlpha
} from "../dna/theme"
import {
    cg
} from "../shared"
import {
    Button, Frame, box, clear, rule, text
} from "../ui/kit"
import {
    skillArt, slot
} from "../ui/slot"
import {
    SLOT_KEYS, SLOT_TAG, TUTORIAL_HEROES, parseSlot, slotDesc, slotName, variantsOf, type SlotKey
} from "../tutorial/scenarios"
import {
    topBar
} from "./LobbyScreen"
import type {
    Nav
} from "./nav"

const ROLE: Record<string, string> = {
    fighter: "Đấu sĩ", tank: "Đỡ đòn", assassin: "Sát thủ", marksman: "Xạ thủ", mage: "Pháp sư", support: "Hỗ trợ"
}
const LEFT_X = -560
const RIGHT_X = 330
const ROW_W = 1040
const ROW_H = 84

/** Cắt chuỗi dài cho vừa khung (Label không tự thêm dấu …) */
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0,
    n - 1).trimEnd()}…` : s)

export function buildTutorialSelect(root: Node, nav: Nav, startHero?: string, startSlot?: string): () => void {
    let hero = TUTORIAL_HEROES.includes(startHero ?? "") ? startHero! : TUTORIAL_HEROES[0]
    let chosen: SlotKey = parseSlot(startSlot) ?? "q"

    topBar(root,
        nav,
        "")
    text(root,
        "Hướng dẫn",
        -130,
        503,
        {
            font: "title", size: 34, width: 500
        })
    const left = box("Heroes",
        root,
        700,
        900,
        LEFT_X,
        0)
    const right = box("Slots",
        root,
        ROW_W + 40,
        900,
        RIGHT_X,
        0)

    const draw = () => {
        drawHeroes()
        drawSlots()
    }

    // ---- trái: 6 tướng (3 x 2) + Lối chơi ----
    const drawHeroes = () => {
        clear(left)
        text(left,
            "Chọn tướng",
            0,
            400,
            {
                font: "title", size: 22, width: 600
            })
        rule(left,
            520,
            0,
            376,
            true,
            C.gold)
        TUTORIAL_HEROES.forEach((id, i) => {
            const def = cg.getHero(id)
            const x = ((i % 3) - 1) * 215, y = 250 - Math.floor(i / 3) * 250
            const sel = id === hero
            const card = new Frame(left,
                200,
                235,
                x,
                y,
                {
                    fill: withAlpha(sel ? C.tealDeep : C.panel,
                        240), stroke: sel ? C.teal : C.gold, glow: sel ? C.teal : null, inner: null, chamfer: 8,
                })
            slot(card.node,
                "heroes",
                id,
                128,
                0,
                30,
                {
                    edge: sel ? C.teal : C.gold
                })
            text(card.node,
                def?.name ?? id,
                0,
                -60,
                {
                    font: "textMedium", bold: true, size: 22, width: 190, upper: false
                })
            text(card.node,
                ROLE[def?.role ?? ""] ?? def?.role ?? "",
                0,
                -90,
                {
                    size: 14, width: 190, color: sel ? C.teal : C.textMuted
                })
            card.node.on(Node.EventType.TOUCH_END,
                () => {
                    if (hero === id) return
                    hero = id
                    chosen = "q"
                    draw()
                })
        })
        // Lối chơi (tóm tắt)
        const g = heroGuide(hero)
        const guide = new Frame(left,
            640,
            290,
            0,
            -290,
            {
                fill: withAlpha(C.panel,
                    235), stroke: C.goldDark, inner: null, chamfer: 0
            })
        text(guide.node,
            `Lối chơi · ${cg.getHero(hero)?.name ?? hero}`,
            0,
            118,
            {
                font: "title", size: 22, width: 600
            })
        if (!g) {
            text(guide.node,
                "Chưa có nội dung.",
                0,
                40,
                {
                    size: 14, color: C.textMuted, width: 600
                })
            return
        }
        text(guide.node,
            g.role,
            0,
            92,
            {
                size: 18, color: C.goldLight, width: 600, upper: false
            })
        text(guide.node,
            clip(g.howToPlay,
                300),
            0,
            30,
            {
                size: 14, color: C.text, width: 600, height: 96, wrap: true, align: "left", upper: false
            })
        text(guide.node,
            `Mạnh: ${clip(g.strengths[0] ?? "",
                110)}`,
            0,
            -52,
            {
                size: 14, color: C.teal, width: 600, height: 40, wrap: true, align: "left", upper: false
            })
        text(guide.node,
            `Yếu: ${clip(g.weaknesses[0] ?? "",
                110)}`,
            0,
            -102,
            {
                size: 14, color: C.danger, width: 600, height: 40, wrap: true, align: "left", upper: false
            })
    }

    // ---- phải: 5 ô chiêu + tình huống + Vào thử ----
    const drawSlots = () => {
        clear(right)
        const def = cg.getHero(hero)
        text(right,
            `${def?.name ?? hero} · chọn chiêu để thử`,
            0,
            400,
            {
                font: "title", size: 22, width: ROW_W
            })
        rule(right,
            700,
            0,
            376,
            true,
            C.gold)
        SLOT_KEYS.forEach((k, i) => {
            const y = 320 - i * (ROW_H + 8)
            const sel = k === chosen
            const row = new Frame(right,
                ROW_W,
                ROW_H,
                0,
                y,
                {
                    fill: withAlpha(sel ? C.tealDeep : C.panel,
                        240), stroke: sel ? C.teal : C.gold, inner: null, chamfer: 0,
                })
            const ix = -ROW_W / 2 + 48
            const icon = 64
            if (k === "basic") slot(row.node,
                "heroes",
                hero,
                icon,
                ix,
                0,
                {
                    edge: sel ? C.teal : C.gold
                })
            else if (k === "p") slot(row.node,
                "skills",
                `${hero}_p`,
                icon,
                ix,
                0,
                {
                    edge: sel ? C.teal : C.gold
                })
            else slot(row.node,
                "skills",
                skillArt(hero,
                    k),
                icon,
                ix,
                0,
                {
                    edge: sel ? C.teal : C.gold
                })
            const tx = -ROW_W / 2 + 96
            text(row.node,
                SLOT_TAG[k],
                tx + 70,
                22,
                {
                    font: "title", size: 20, width: 140, align: "left", color: sel ? C.teal : C.goldLight
                })
            text(row.node,
                slotName(hero,
                    k),
                tx + 360,
                22,
                {
                    font: "textMedium", bold: true, size: 17, width: 420, align: "left", upper: false
                })
            const n = variantsOf(hero,
                k).length
            if (n > 1) text(row.node,
                `${n} tình huống`,
                ROW_W / 2 - 90,
                22,
                {
                    size: 14, width: 160, align: "right", upper: false, color: sel ? C.teal : C.textMuted
                })
            text(row.node,
                clip(slotDesc(hero,
                    k),
                190),
            tx + 464,
            -14,
            {
                size: 13, color: C.text, width: 928, height: 40, wrap: true, align: "left", upper: false
            })
            row.node.on(Node.EventType.TOUCH_END,
                () => {
                    if (chosen === k) return
                    chosen = k
                    drawSlots()
                })
        })
        // Tình huống của ô đang chọn: mỗi biến thể một thẻ (tên, lời dặn, nút Vào thử riêng)
        const list = variantsOf(hero,
            chosen)
        const areaTop = 320 - SLOT_KEYS.length * (ROW_H + 8) + ROW_H / 2 - 4
        text(right,
            `Tình huống · ${SLOT_TAG[chosen]}${list.length > 1 ? ` (${list.length})` : ""}`,
            -ROW_W / 2 + 160,
            areaTop - 18,
            {
                font: "title", size: 18, width: 320, align: "left"
            })
        if (!list.length) {
            text(right,
                "Chưa có tình huống cho chiêu này.",
                0,
                areaTop - 70,
                {
                    size: 14, color: C.textMuted, width: ROW_W - 40
                })
            return
        }
        // vùng còn lại (tới mép dưới -445) chia đều cho các thẻ, tối đa 120 mỗi thẻ
        const room = areaTop - 36 - -445
        const gapV = 8
        const cardH = Math.min(120,
            (room - gapV * (list.length - 1)) / list.length)
        const btnW = 170
        list.forEach((sc, i) => {
            const cy = areaTop - 36 - cardH / 2 - i * (cardH + gapV)
            const card = new Frame(right,
                ROW_W,
                cardH,
                0,
                cy,
                {
                    fill: withAlpha(C.panel,
                        235), stroke: C.goldDark, inner: null, chamfer: 0
                })
            const textW = ROW_W - btnW - 50
            const lx = -ROW_W / 2 + 20
            text(card.node,
                sc.title ? `${i + 1} · ${sc.title}` : SLOT_TAG[chosen],
                lx + textW / 2,
                cardH / 2 - 16,
                {
                    font: "textMedium", bold: true, size: 16, width: textW, align: "left", upper: false, color: C.teal
                })
            text(card.node,
                sc.hint,
                lx + textW / 2,
                -10,
                {
                    size: 13, color: C.text, width: textW, height: cardH - 34, wrap: true, align: "left", upper: false
                })
            new Button(card.node,
                "Vào thử",
                btnW,
                Math.min(52,
                    cardH - 20),
                ROW_W / 2 - btnW / 2 - 16,
                0,
                () => nav.startTutorial(hero,
                    chosen,
                    sc.variant),
                "primary",
                20)
        })
    }

    new Button(root,
        "Về sảnh",
        220,
        52,
        -800,
        -470,
        () => nav.showLobby(),
        "ghost",
        22)
    draw()
    return () => undefined
}
