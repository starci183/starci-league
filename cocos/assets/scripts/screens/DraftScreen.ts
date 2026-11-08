// Cấm / Chọn tướng, bóc từ docs/mockups/match/draft.png: tiêu đề, luật, dải lượt có đồng hồ; giữa là lưới tướng (ô vuông,
// trạng thái Đã cấm / Đã chọn / đang chọn); trái Đội của bạn + Ô cấm; phải Đội địch + ô cấm + Phân tích đối thủ;
// đáy nút Cấm / Chọn / Xác nhận. Dữ liệu từ cg:draft (pool, thứ tự cấm/chọn, lượt, hạn giờ).
// Nhãn gợi ý trên ô tướng (Khắc chế / Combo / Bị khắc / Nên cấm), Phân tích đối thủ và tooltip tướng tính bằng cg.SYNERGY
// và cg.countersOf như HeroTile / ScoutBlock / HeroBrief của bản web (packages/client/src/card/Screens.tsx).
import {
    Node
} from "cc"
import {
    C, at, withAlpha
} from "../dna/theme"
import {
    cg
} from "../shared"
import {
    gameActions, getGame, onGame, type DraftInfo
} from "../net/game"
import {
    Button, Frame, box, clear, panel, rule, text
} from "../ui/kit"
import {
    slot
} from "../ui/slot"
import {
    topBar
} from "./LobbyScreen"
import type {
    Nav
} from "./nav"

const ROLE: Record<string, string> = {
    fighter: "Đấu sĩ", tank: "Đỡ đòn", assassin: "Sát thủ", marksman: "Xạ thủ", mage: "Pháp sư", support: "Hỗ trợ"
}
const COLS = 8
const CELL = {
    size: 86, dx: 108, dy: 116
}

const syn = (id: string) => cg.SYNERGY[id] as cg.HeroSynergy | undefined
const list = (names: string[], max = 4) => names.length > max ? `${names.slice(0,
    max).join(", ")}…` : names.join(", ")

export function buildDraft(root: Node, nav: Nav, deckName: string): () => void {
    topBar(root,
        nav,
        deckName)
    text(root,
        "Cấm / Chọn tướng",
        0,
        at(0,
            127).y,
        {
            font: "textMedium", bold: true, size: 76, width: 900, upper: false
        })
    rule(root,
        700,
        0,
        at(0,
            182).y,
        true,
        C.gold)
    text(root,
        "Mỗi đội 5 tướng. Tướng đã bị cấm hoặc đã được chọn thì không ai lấy được nữa.",
        0,
        at(0,
            215).y,
        {
            size: 26, color: C.goldLight, width: 900
        })
    const banner = new Frame(root,
        520,
        56,
        0,
        at(0,
            273).y,
        {
            fill: withAlpha(C.tealDeep,
                220), stroke: C.gold, inner: C.tealDark, chamfer: 14
        })
    const bannerText = text(banner.node,
        "",
        0,
        0,
        {
            font: "textMedium", bold: true, size: 32, width: 500, height: 52, upper: false
        })

    const grid = panel(root,
        900,
        610,
        0,
        at(0,
            610).y)
    const gridBody = box("Body",
        grid,
        900,
        610)

    const mine = panel(root,
        350,
        515,
        at(300,
            0).x,
        at(0,
            452).y)
    text(mine,
        "Đội của bạn",
        0,
        222,
        {
            font: "textMedium", bold: true, size: 36, width: 320, upper: false
        })
    const mineBody = box("Body",
        mine,
        350,
        515)
    const myBans = panel(root,
        335,
        212,
        at(302,
            0).x,
        at(0,
            844).y)
    text(myBans,
        "Ô cấm",
        0,
        76,
        {
            font: "textMedium", bold: true, size: 32, width: 300, upper: false
        })
    const myBansBody = box("Body",
        myBans,
        335,
        212)

    const foe = panel(root,
        350,
        535,
        at(1620,
            0).x,
        at(0,
            462).y)
    text(foe,
        "Đội địch",
        0,
        232,
        {
            font: "textMedium", bold: true, size: 36, width: 320, upper: false
        })
    const foeBody = box("Body",
        foe,
        350,
        535)
    const scout = panel(root,
        365,
        200,
        at(1622,
            0).x,
        at(0,
            850).y)
    text(scout,
        "Phân tích đối thủ",
        0,
        70,
        {
            font: "textMedium", bold: true, size: 30, width: 340, upper: false
        })
    const scoutText = text(scout,
        "",
        0,
        -22,
        {
            size: 19, width: 335, height: 130, wrap: true, align: "left"
        })

    let selected: string | null = null
    let scoutId: string | null = null
    let receivedAt = Date.now()
    let lastDraft: DraftInfo | null = null
    const banBtn = new Button(root,
        "Cấm",
        190,
        62,
        at(612,
            0).x,
        at(0,
            1000).y,
        () => send("ban"),
        "gold",
        32)
    const pickBtn = new Button(root,
        "Chọn",
        190,
        62,
        at(827,
            0).x,
        at(0,
            1000).y,
        () => send("pick"),
        "gold",
        32)
    const confirmBtn = new Button(root,
        "Xác nhận",
        465,
        76,
        at(1180,
            0).x,
        at(0,
            1000).y,
        () => send(lastDraft?.turn?.action ?? "pick"),
        "primary",
        40)

    function send(action: "ban" | "pick") {
        const d = lastDraft
        if (!d || !selected || d.turn?.side !== d.you || d.turn.action !== action) return
        gameActions.draftAct(selected)
        selected = null
    }

    function render() {
        const d = getGame().draft
        if (!d) return
        if (d !== lastDraft) receivedAt = Date.now()
        lastDraft = d
        const you = d.you ?? "A", them = you === "A" ? "B" : "A"
        const taken = new Set([...d.bans,
            ...d.picks.A,
            ...d.picks.B])
        if (selected && taken.has(selected)) selected = null
        const myTurn = d.turn?.side === you
        const action = d.turn?.action

        clear(gridBody)
        tip.active = false
        const gridY = at(0,
            610).y
        const rows = Math.ceil(d.pool.length / COLS)
        d.pool.forEach((h, i) => {
            const col = i % COLS, row = Math.floor(i / COLS)
            const x = (col - (COLS - 1) / 2) * CELL.dx
            const y = ((rows - 1) / 2 - row) * CELL.dy + 10
            const banned = d.bans.includes(h.id)
            const mineP = d.picks[you].includes(h.id), foeP = d.picks[them].includes(h.id)
            const isSel = selected === h.id
            const cell = slot(gridBody,
                "heroes",
                h.id,
                CELL.size,
                x,
                y,
                {
                    edge: banned || foeP ? C.enemy : mineP ? C.ally : isSel ? C.teal : C.gold,
                    glow: isSel ? C.teal : null,
                    dim: banned || foeP,
                })
            const sy = syn(h.id)
            const mark = {
                counter: d.picks[them].some((e) => !!syn(e)?.counteredBy.includes(h.id)),
                countered: d.picks[them].some((e) => !!sy?.counteredBy.includes(e)),
                combo: d.picks[you].some((a) => !!sy?.combos.includes(a) || !!syn(a)?.combos.includes(h.id)),
                ban: action === "ban" && myTurn && d.picks[you].some((a) => !!syn(a)?.counteredBy.includes(h.id)),
            }
            if (!taken.has(h.id)) {
                const hints: { label: string; good: boolean }[] = []
                if (mark.ban) hints.push({
                    label: "Nên cấm", good: false
                })
                if (mark.counter) hints.push({
                    label: "Khắc chế", good: true
                })
                if (mark.countered) hints.push({
                    label: "Bị khắc", good: false
                })
                if (mark.combo) hints.push({
                    label: "Combo", good: true
                })
                hints.forEach((hint, k) => {
                    const strip = new Frame(cell.node,
                        CELL.size - 6,
                        16,
                        0,
                        CELL.size / 2 - 11 - k * 17,
                        {
                            fill: hint.good ? withAlpha(C.tealDeep,
                                245) : withAlpha(C.dangerDeep,
                                245), stroke: hint.good ? C.teal : C.enemy, inner: null, chamfer: 2, gems: "none"
                        })
                    text(strip.node,
                        hint.label,
                        0,
                        0,
                        {
                            size: 13, width: CELL.size - 8, height: 16, color: hint.good ? C.teal : C.goldLight
                        })
                })
            }
            cell.node.on(Node.EventType.MOUSE_ENTER,
                () => showTip(h.id,
                    x,
                    gridY + y,
                    row === 0))
            cell.node.on(Node.EventType.MOUSE_LEAVE,
                () => { tip.active = false })
            if (banned || mineP || foeP) {
                const tag = new Frame(cell.node,
                    CELL.size - 6,
                    22,
                    0,
                    -CELL.size / 2 + 13,
                    {
                        fill: banned || foeP ? withAlpha(C.dangerDeep,
                            240) : withAlpha(C.tealDeep,
                            240), stroke: banned || foeP ? C.enemy : C.ally, inner: null, chamfer: 3
                    })
                text(tag.node,
                    banned ? "Đã cấm" : "Đã chọn",
                    0,
                    0,
                    {
                        size: 15, width: CELL.size, height: 22, color: C.goldLight
                    })
            }
            text(gridBody,
                h.name,
                x,
                y - CELL.size / 2 - 13,
                {
                    size: 18, width: CELL.dx - 4, height: 24
                })
            if (!taken.has(h.id)) cell.node.on(Node.EventType.TOUCH_END,
                () => { selected = h.id; render() })
        })

        const nameOf = (id: string) => d.pool.find((h) => h.id === id)?.name ?? id
        clear(mineBody)
        for (let i = 0; i < d.size; i++) {
            const id = d.picks[you][i]
            const y = 139 - i * 84
            slot(mineBody,
                "heroes",
                id ?? "",
                64,
                -110,
                y,
                {
                    edge: id ? C.gold : C.disabledText
                })
            text(mineBody,
                id ? nameOf(id) : "Chưa chọn",
                40,
                y,
                {
                    size: 26, width: 220, align: "left", color: id ? C.goldLight : C.textMuted
                })
        }
        clear(foeBody)
        for (let i = 0; i < d.size; i++) {
            const id = d.picks[them][i]
            const y = 167 - i * 64
            slot(foeBody,
                "heroes",
                id ?? "",
                52,
                -112,
                y,
                {
                    edge: id ? C.enemy : C.disabledText
                })
            const foeName = text(foeBody,
                id ? nameOf(id) : "Chưa chọn",
                30,
                y,
                {
                    size: 24, width: 220, align: "left", color: id ? C.goldLight : C.textMuted
                })
            if (id) foeName.node.on(Node.EventType.TOUCH_END,
                () => { scoutId = id; render() })
        }
        // Thứ tự cấm: lượt cấm thứ i thuộc bên trong order
        const banSides = d.order.filter((t) => t.action === "ban").map((t) => t.side)
        const bansOf = (side: string) => d.bans.filter((_, i) => banSides[i] === side)
        clear(myBansBody)
        const myBanList = bansOf(you)
        for (let i = 0; i < 2; i++) {
            slot(myBansBody,
                "heroes",
                myBanList[i] ?? "",
                80,
                i ? 78 : -70,
                0,
                {
                    edge: C.enemy, dim: !!myBanList[i]
                })
            text(myBansBody,
                myBanList[i] ? nameOf(myBanList[i]) : "",
                i ? 78 : -70,
                -58,
                {
                    size: 18, width: 140, color: C.enemy
                })
        }
        const foeBanList = bansOf(them)
        for (let i = 0; i < 2; i++) {
            slot(foeBody,
                "heroes",
                foeBanList[i] ?? "",
                72,
                i ? 75 : -67,
                -170,
                {
                    edge: C.enemy, dim: !!foeBanList[i]
                })
            text(foeBody,
                foeBanList[i] ? nameOf(foeBanList[i]) : "",
                i ? 75 : -67,
                -222,
                {
                    size: 17, width: 140, color: C.enemy
                })
        }

        const foePicks = d.picks[them]
        if (!scoutId || !foePicks.includes(scoutId)) scoutId = foePicks[foePicks.length - 1] ?? null
        if (!scoutId) scoutText.string = "Đối thủ chưa chọn tướng nào."
        else {
            const weak = syn(scoutId)?.counteredBy ?? []
            const strong = cg.countersOf(scoutId)
            const mineTeam = d.picks[you]
            const warn = strong.filter((x) => mineTeam.includes(x))
            const usable = weak.filter((x) => !taken.has(x)).map(nameOf)
            const have = weak.filter((x) => mineTeam.includes(x))
            const beat = usable.length ? `Chọn ${usable.slice(0,
                3).join(", ")}` : have.length ? `✓ ${have.map(nameOf).join(", ")}` : "Hết tướng khắc chế: chơi theo mục đích của đội mình"
            scoutText.string = [
                `${nameOf(scoutId)}${foePicks.length > 1 ? " (chạm tên để đổi)" : ""}`,
                `Yếu trước: ${weak.length ? list(weak.map(nameOf)) : "—"}`,
                `Khắc chế: ${strong.length ? list(strong.map(nameOf)) : "—"}`,
                warn.length ? `Khắc đồng đội của bạn! (${list(warn.map(nameOf))})` : "",
                `Cách đánh bại: ${beat}`
            ].filter(Boolean).join("\n")
        }

        banBtn.setEnabled(myTurn && action === "ban" && !!selected)
        pickBtn.setEnabled(myTurn && action === "pick" && !!selected)
        confirmBtn.setEnabled(myTurn && !!selected)
        confirmBtn.setText(action === "ban" ? "Xác nhận cấm" : "Xác nhận chọn")
        tick()
    }

    function tick() {
        const d = lastDraft
        if (!d) return
        const you = d.you ?? "A"
        const left = d.deadlineMs > 0 ? Math.max(0,
            Math.ceil((d.deadlineMs - (Date.now() - receivedAt)) / 1000)) : 0
        const clock = left ? ` · 00:${String(left).padStart(2,
            "0")}` : ""
        if (!d.turn) bannerText.string = "Đã đủ đội hình, đang vào trận…"
        else if (d.turn.side === you) bannerText.string = `${d.turn.action === "ban" ? "Lượt cấm" : "Lượt chọn"} của bạn${clock}`
        else bannerText.string = `Đối thủ đang ${d.turn.action === "ban" ? "cấm" : "chọn"}${clock}`
    }

    // Tooltip tướng khi rê chuột: dựng một lần ở cuối root để nằm trên cùng, nội dung đổi theo ô đang rê
    const TIP = {
        w: 330, h: 124
    }
    const tipFrame = new Frame(root,
        TIP.w,
        TIP.h,
        0,
        0,
        {
            fill: withAlpha(C.bg,
                245), stroke: C.gold, inner: C.goldDark, chamfer: 8, gems: "none"
        })
    const tip = tipFrame.node
    tip.active = false
    const tipName = text(tip,
        "",
        0,
        38,
        {
            font: "textMedium", bold: true, size: 28, width: TIP.w - 24, height: 36, upper: false
        })
    const tipRole = text(tip,
        "",
        0,
        8,
        {
            size: 20, width: TIP.w - 24, height: 26, color: C.teal
        })
    const tipStats = text(tip,
        "",
        0,
        -20,
        {
            size: 20, width: TIP.w - 24, height: 26
        })
    const tipDmg = text(tip,
        "",
        0,
        -46,
        {
            size: 20, width: TIP.w - 24, height: 26, color: C.goldLight
        })

    function showTip(id: string, cx: number, cy: number, below: boolean) {
        const h = lastDraft?.pool.find((p) => p.id === id)
        if (!h) return
        tipName.string = h.name.toUpperCase()
        tipRole.string = ROLE[h.role] ?? h.role
        tipStats.string = `Máu ${h.hp} · Công ${h.atk} · Giáp ${h.armor} · Kháng phép ${h.mr}`
        tipDmg.string = `Sát thương ${h.damage === "magic" ? "phép" : "vật lý"}`
        const half = 960 - TIP.w / 2 - 8
        tip.setPosition(Math.max(-half,
            Math.min(half,
                cx)),
            below ? cy - CELL.size / 2 - TIP.h / 2 - 30 : cy + CELL.size / 2 + TIP.h / 2 + 8,
            0)
        tip.setSiblingIndex(root.children.length - 1)
        tip.active = true
    }

    const off = onGame(render)
    const timer = setInterval(tick,
        500)
    render()
    return () => {
        off()
        clearInterval(timer)
    }
}
