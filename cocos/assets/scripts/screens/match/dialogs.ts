// Hộp thoại trong trận, bóc từ docs/mockups/match/: chọn vũ khí / đổi thế (weapon-pick.png, form-switch.png), cướp chiêu
// cuối (steal.png), ghép đồ (craft.png), và hộp chọn chung khi một lá có nhiều cách đánh. Đặt đè lên màn trận đã làm tối.
import {
    Graphics, Node
} from "cc"
import {
    C, withAlpha
} from "../../dna/theme"
import {
    gameOf, heroName, type CardView
} from "../../net/game"
import {
    cg
} from "../../shared"
import {
    itemText
} from "../../shared/cardgame/items"
import {
    Button, Frame, box, panel, rule, text
} from "../../ui/kit"
import {
    skillArt, slot
} from "../../ui/slot"

/** Tên dạng / vũ khí của tướng hai thế (giống ChampionModeDialog của bản web) */
const MODE_NAME: Record<string, string> = {
    minigun: "Bằng Chíu", rocket: "Xương Cá", hammer: "Búa Thủy Ngân", cannon: "Pháo Thủy Ngân"
}
export const modeName = (mode: string) => MODE_NAME[mode] ?? mode

/** Lớp phủ tối + panel giữa màn; trả node thân để dựng nội dung và hàm đóng */
function modal(root: Node, w: number, h: number, title: string, subtitle = ""): { body: Node; close: () => void } {
    const veil = box("Veil",
        root,
        1920,
        1080)
    const g = veil.addComponent(Graphics)
    g.fillColor = withAlpha(C.bg,
        170)
    g.rect(-960,
        -540,
        1920,
        1080)
    g.fill()
    veil.on(Node.EventType.TOUCH_END,
        (e: { propagationStopped: boolean }) => { e.propagationStopped = true })
    const p = panel(veil,
        w,
        h,
        0,
        0,
        "both")
    text(p,
        title,
        0,
        h / 2 - 56,
        {
            font: "titleMedium", size: 48, width: w - 120, upper: false
        })
    rule(p,
        w - 300,
        0,
        h / 2 - 92,
        true,
        C.gold)
    if (subtitle) text(p,
        subtitle,
        0,
        h / 2 - 116,
        {
            size: 28, color: C.goldLight, width: w - 120
        })
    return {
        body: p, close: () => veil.destroy()
    }
}

/**
 * Chọn vũ khí khi ra sân / Đổi thế: mỗi lựa chọn (mode) một cột: ô biểu tượng, tên, nhãn Đang dùng / Xem trước,
 * danh sách chiêu Q / E / R (ô vuông, mana, tên). Bấm cột để xem trước, Xác nhận để gửi.
 */
export function modeDialog(root: Node, hero: string, options: { mode: string; action: cg.Action }[], kind: "weapon" | "form", current: string | undefined, onPick: (a: cg.Action) => void) {
    const W = 820, H = 700
    const { body, close } = modal(root,
        W,
        H,
        kind === "weapon" ? "Chọn vũ khí khi ra sân" : "Đổi thế",
        heroName(hero))
    const def = cg.getHero(hero)
    let chosen = options.find((o) => o.mode === current) ?? options[0]
    const colW = Math.min(360,
        (W - 80) / options.length - 20)
    const cols: Frame[] = []
    const paint = () => cols.forEach((f, i) => {
        const on = options[i] === chosen
        f.draw({
            fill: withAlpha(on ? C.tealDeep : C.bg,
                235), stroke: on ? C.teal : C.gold, inner: on ? C.tealDark : C.goldDark, glow: on ? C.teal : null, chamfer: 14
        })
    })
    options.forEach((o, i) => {
        const x = (i - (options.length - 1) / 2) * (colW + 26)
        const f = new Frame(body,
            colW,
            410,
            x,
            30)
        cols.push(f)
        slot(f.node,
            "skills",
            `${hero}_${o.mode}`,
            96,
            -colW / 2 + 70,
            140)
        text(f.node,
            modeName(o.mode),
            50,
            160,
            {
                font: "titleMedium", size: 32, width: colW - 150, upper: false
            })
        const tag = new Frame(f.node,
            140,
            40,
            50,
            110,
            {
                fill: withAlpha(o.mode === current ? C.tealDeep : C.bg,
                    240), stroke: o.mode === current ? C.teal : C.gold, inner: null, chamfer: 8
            })
        text(tag.node,
            o.mode === current ? "Đang dùng" : "Xem trước",
            0,
            0,
            {
                size: 22, width: 130, height: 38, color: C.goldLight
            })
        rule(f.node,
            colW - 40,
            0,
            70,
            false)
        ;(["Q",
            "E",
            "R"] as const).forEach((k, j) => {
            const y = 20 - j * 72
            slot(f.node,
                "skills",
                skillArt(hero,
                    k),
                52,
                -colW / 2 + 46,
                y)
            const s = def?.skills[k]
            text(f.node,
                `${k} · ${s?.name ?? ""}`,
                30,
                y,
                {
                    size: 24, width: colW - 110, align: "left", color: C.goldLight
                })
        })
        f.node.on(Node.EventType.TOUCH_END,
            () => { chosen = o; paint() })
    })
    paint()
    text(body,
        kind === "weapon" ? "Đổi vũ khí là bị động, không tốn mana" : "Đổi thế là bị động, không tốn mana",
        0,
        -205,
        {
            size: 26, color: C.goldLight, width: W - 100
        })
    new Button(body,
        "Huỷ",
        220,
        60,
        -125,
        -290,
        close,
        "gold",
        30)
    new Button(body,
        kind === "weapon" ? "Xác nhận" : "Đổi thế",
        220,
        60,
        125,
        -290,
        () => { close(); onPick(chosen.action) },
        "primary",
        30)
}

/** Cướp chiêu cuối: mỗi dòng một tướng địch (ô tướng, tên, ô tuyệt chiêu, tên + mô tả, mana) */
export function stealDialog(root: Node, view: CardView, options: cg.Action[], onPick: (a: cg.Action) => void) {
    const W = 820, H = 120 + 90 * options.length + 230
    const you = view.you ?? "A"
    const { body, close } = modal(root,
        W,
        H,
        "Cướp chiêu cuối",
        "Chọn một tướng địch trên sân")
    text(body,
        `Mana của bạn: ${view.teamMana?.[you] ?? 0}/${view.rules.teamManaMax ?? 200}`,
        0,
        H / 2 - 160,
        {
            size: 26, color: C.goldLight, width: 400
        })
    let chosen = options[0]
    const rows: Frame[] = []
    const g = gameOf(view)
    const paint = () => rows.forEach((f, i) => f.draw({
        fill: withAlpha(options[i] === chosen ? C.tealDeep : C.bg,
            235), stroke: options[i] === chosen ? C.teal : C.gold, inner: null, glow: options[i] === chosen ? C.teal : null, chamfer: 10
    }))
    options.forEach((a, i) => {
        const target = a.t === "play" || a.t === "chain" ? a.args?.target : undefined
        const unit = target ? view.units[target] : undefined
        const hero = unit?.hero ?? ""
        const r = cg.getHero(hero)?.skills.R
        let cost = ""
        try { cost = unit && r ? `${g.manaCost(unit, r, { uid: "x", kind: "skill", id: "R", hero, side: you } as cg.Card)} mana` : "" } catch { /* chiêu không có giá cố định */ }
        const y = H / 2 - 230 - i * 90
        const row = new Frame(body,
            W - 70,
            80,
            0,
            y)
        rows.push(row)
        slot(row.node,
            "heroes",
            hero,
            62,
            -(W - 70) / 2 + 50,
            0)
        text(row.node,
            heroName(hero),
            -(W - 70) / 2 + 190,
            0,
            {
                font: "titleMedium", size: 28, width: 200, align: "left", upper: false
            })
        slot(row.node,
            "skills",
            skillArt(hero,
                "r"),
            58,
            -40,
            0)
        text(row.node,
            r?.name ?? "",
            110,
            12,
            {
                size: 26, width: 240, align: "left", color: C.goldLight
            })
        text(row.node,
            (r?.desc ?? "").replace(/\{[^}]*\}/g,
                "…").slice(0,
                48),
            110,
            -16,
            {
                size: 18, width: 240, align: "left", color: C.textMuted
            })
        text(row.node,
            cost,
            (W - 70) / 2 - 80,
            0,
            {
                font: "number", size: 24, width: 140, align: "right", color: C.goldLight
            })
        row.node.on(Node.EventType.TOUCH_END,
            () => { chosen = a; paint() })
    })
    paint()
    text(body,
        "Cướp xong dùng ngay theo luật của tướng cướp chiêu",
        0,
        -H / 2 + 130,
        {
            size: 24, color: C.goldLight, width: W - 100
        })
    new Button(body,
        "Huỷ",
        220,
        58,
        -125,
        -H / 2 + 66,
        close,
        "gold",
        30)
    new Button(body,
        "Cướp",
        220,
        58,
        125,
        -H / 2 + 66,
        () => { close(); onPick(chosen) },
        "primary",
        30)
}

/** Hộp chọn chung: lá có nhiều cách đánh cho cùng mục tiêu (chọn chế độ, lá cần bỏ...) */
export function choiceDialog(root: Node, title: string, choices: { label: string; action: cg.Action }[], onPick: (a: cg.Action) => void) {
    const W = 700, H = 260 + choices.length * 76
    const { body, close } = modal(root,
        W,
        H,
        title)
    choices.forEach((c, i) => {
        new Button(body,
            c.label,
            W - 140,
            60,
            0,
            H / 2 - 170 - i * 76,
            () => { close(); onPick(c.action) },
            "gold",
            26)
    })
    new Button(body,
        "Huỷ",
        220,
        56,
        0,
        -H / 2 + 60,
        close,
        "ghost",
        28)
}

/** Ghép đồ: bảng 8×8 mảnh Đồ; ô ghép được ngay sáng ngọc; khung món đang chọn; nút Ghép */
export function craftDialog(root: Node, view: CardView, crafts: cg.Action[], onPick: (a: cg.Action) => void) {
    const W = 1240, H = 810
    const { body, close } = modal(root,
        W,
        H,
        "Ghép đồ")
    const hand = view.players[view.you ?? "A"].hand ?? []
    const itemOfUid = (uid: string) => hand.find((c) => c.uid === uid)?.item
    const comps = cg.COMPONENTS as readonly string[]
    const actionFor = (a: string, b: string) => crafts.find((x) => {
        if (x.t !== "craft") return false
        const [i1, i2] = x.items.map(itemOfUid)
        return (i1 === a && i2 === b) || (i1 === b && i2 === a)
    })
    const name = (id: string) => itemText(id,
        "vi")?.name ?? id
    const gridX = -170, cell = 70, gap = 80
    const ox = gridX - (comps.length - 1) * gap / 2 + 60, oy = 200
    comps.forEach((c, i) => {
        text(body,
            name(c),
            ox + i * gap,
            oy + 115,
            {
                size: 17, width: 78, height: 44, wrap: true
            })
        slot(body,
            "items",
            c,
            46,
            ox + i * gap,
            oy + 68)
        text(body,
            name(c),
            ox - 140,
            oy - i * gap,
            {
                size: 18, width: 90, height: 44, wrap: true, align: "left"
            })
        slot(body,
            "items",
            c,
            42,
            ox - 78,
            oy - i * gap)
    })
    let picked: { a: string; b: string } | null = null
    const detail = new Frame(body,
        330,
        600,
        W / 2 - 200,
        -10)
    const detailBody = box("Body",
        detail.node,
        330,
        600)
    const renderDetail = () => {
        for (const c of [...detailBody.children]) c.destroy()
        text(detailBody,
            "Món đang chọn",
            0,
            265,
            {
                font: "titleMedium", size: 32, width: 300, upper: false
            })
        if (!picked) {
            text(detailBody,
                "Chọn một ô trong bảng",
                0,
                0,
                {
                    size: 24, width: 300, color: C.textMuted
                })
            return
        }
        const item = cg.cardCombine(picked.a,
            picked.b) ?? ""
        const info = itemText(item,
            "vi")
        slot(detailBody,
            "items",
            item,
            120,
            0,
            165)
        text(detailBody,
            info?.name ?? item,
            0,
            80,
            {
                font: "titleMedium", size: 32, width: 310, upper: false
            })
        text(detailBody,
            info?.stats ?? "",
            0,
            30,
            {
                size: 22, width: 300, height: 50, wrap: true, color: C.goldLight
            })
        text(detailBody,
            info?.passive ? `Nội tại: ${info.passive}` : "Nội tại: Không có",
            0,
            -12,
            {
                size: 20, width: 300, height: 30, color: C.text
            })
        text(detailBody,
            "Nguyên liệu",
            0,
            -62,
            {
                font: "titleMedium", size: 26, width: 300, upper: false
            })
        ;[picked.a,
            picked.b].forEach((c, i) => {
            slot(detailBody,
                "items",
                c,
                62,
                i ? 60 : -60,
                -118)
            text(detailBody,
                name(c),
                i ? 60 : -60,
                -166,
                {
                    size: 18, width: 120
                })
        })
        const can = !!actionFor(picked.a,
            picked.b)
        text(detailBody,
            "Chi phí: 2 mảnh + 1 Vàng",
            0,
            -208,
            {
                size: 22, width: 300, color: C.goldLight
            })
        text(detailBody,
            can ? "Đủ nguyên liệu" : "Thiếu mảnh hoặc Vàng",
            0,
            -246,
            {
                size: 22, width: 300, color: can ? C.teal : C.danger
            })
    }
    comps.forEach((a, i) => comps.forEach((b, j) => {
        const can = !!actionFor(a,
            b)
        const f = new Frame(body,
            cell,
            cell,
            ox + j * gap,
            oy - i * gap,
            {
                fill: withAlpha(can ? C.tealDeep : C.bg,
                    230), stroke: can ? C.teal : C.goldDark, inner: null, glow: can ? C.tealDark : null, chamfer: 6
            })
        const item = cg.cardCombine(a,
            b)
        if (item) slot(f.node,
            "items",
            item,
            cell - 14,
            0,
            0,
            {
                edge: can ? C.teal : C.goldDark, dim: !can
            })
        f.node.on(Node.EventType.TOUCH_END,
            () => { picked = { a, b }; renderDetail() })
    }))
    renderDetail()
    text(body,
        "Ghép xong lá đồ về tay, đánh lá đó để đeo",
        -260,
        -H / 2 + 60,
        {
            size: 26, width: 620, align: "left", color: C.goldLight
        })
    new Button(body,
        "Đóng",
        200,
        58,
        W / 2 - 360,
        -H / 2 + 60,
        close,
        "gold",
        30)
    new Button(body,
        "Ghép",
        200,
        58,
        W / 2 - 140,
        -H / 2 + 60,
        () => {
            const a = picked ? actionFor(picked.a,
                picked.b) : undefined
            if (!a) return
            close()
            onPick(a)
        },
        "primary",
        30)
}
