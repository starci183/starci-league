// Hộp thoại lựa chọn đặc biệt trong trận, cùng kiểu dialogs.ts: xem lá trên bộ (Twisted Fate Q), chọn lá bỏ, chọn mức mana /
// số lượng, chọn màu. Bóc từ bản web: hand/Hand.tsx (advance, multi, levels), ui/ActionDialog. Đặt đè lên màn trận đã làm tối.
import {
    Color, EventTouch, Graphics, Node, UITransform, Vec3
} from "cc"
import {
    C, withAlpha
} from "../../dna/theme"
import {
    type CardView
} from "../../net/game"
import {
    cg
} from "../../shared"
import {
    cardBack, matchCard
} from "../../ui/matchCard"
import {
    Button, Frame, box, clear, drawGem, panel, rule, text
} from "../../ui/kit"

type Pick = (a: cg.Action) => void

const argsOf = (a: cg.Action): cg.PlayArgs => (a.t === "play" || a.t === "chain" || a.t === "ability" ? a.args ?? {
} : {
})

/** uid các lá tay bị bỏ bởi một hành động (args.discard của lá, hoặc Action "discard" thuần) */
const discardOf = (a: cg.Action): string[] => (a.t === "discard" ? [a.uid] : argsOf(a).discard ?? [])

const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join("+") === [...b].sort().join("+")

/** Lá trên cùng bộ đang được xem (server chỉ gửi cho chủ bộ); CardView của Cocos chưa khai trường này */
const peekOf = (view: CardView): cg.Card[] => (view as CardView & { peek?: cg.Card[] }).peek ?? []

/** Tìm lá theo uid: tay, mộ, lá đang xem */
function cardOfUid(view: CardView, uid: string): cg.Card | undefined {
    const me = view.you ?? "A"
    const p = view.players[me]
    return [...(p.hand ?? []),
        ...p.grave,
        ...peekOf(view)].find((c) => c.uid === uid)
}

/** Lớp phủ tối + panel giữa màn; trả node thân để dựng nội dung và hàm đóng (cùng kiểu dialogs.ts) */
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
            font: "textMedium", bold: true, size: 48, width: w - 120, upper: false
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
            size: 26, color: C.goldLight, width: w - 120
        })
    return {
        body: p, close: () => veil.destroy()
    }
}

/**
 * Xem lá trên cùng bộ: các lá trong view.peek, bấm một lá để đưa xuống đáy (các lá còn lại lên tay), Xác nhận để gửi.
 * Có hành động không đưa lá nào xuống (args.pick rỗng) thì thêm nút Giữ nguyên.
 */
export function peekDialog(root: Node, view: CardView, options: cg.Action[], onPick: Pick) {
    const picks = options.filter((a) => (argsOf(a).pick ?? "") !== "")
    const keep = options.find((a) => (argsOf(a).pick ?? "") === "")
    const peek = peekOf(view)
    const uids = peek.length ? peek.map((c) => c.uid) : [...new Set(picks.map((a) => argsOf(a).pick ?? ""))]
    const cw = 230, ch = 330, gap = 26
    const W = Math.max(820,
        uids.length * (cw + gap) + 120), H = 700
    const { body, close } = modal(root,
        W,
        H,
        `Xem ${uids.length} lá trên cùng bộ`,
        "Chọn lá đưa xuống đáy, các lá còn lại lên tay")
    let chosen: string | null = null
    const lane = box("Cards",
        body,
        W,
        ch + 120,
        0,
        20)
    const confirm = new Button(body,
        "Xác nhận",
        220,
        60,
        keep ? 0 : 125,
        -H / 2 + 66,
        () => {
            const a = picks.find((x) => argsOf(x).pick === chosen)
            if (!a) return
            close()
            onPick(a)
        },
        "primary",
        30)
    confirm.setEnabled(false)
    const paint = () => {
        clear(lane)
        uids.forEach((uid, i) => {
            const x = (i - (uids.length - 1) / 2) * (cw + gap)
            const on = chosen === uid
            const card = cardOfUid(view,
                uid)
            const select = () => {
                chosen = on ? null : uid
                confirm.setEnabled(chosen !== null)
                paint()
            }
            if (card) matchCard(lane,
                view,
                card,
                cw,
                ch,
                x,
                20,
                {
                    selected: on, dim: chosen !== null && !on, onPick: select
                })
            else {
                const back = cardBack(lane,
                    cw,
                    ch,
                    x,
                    20)
                back.on(Node.EventType.TOUCH_END,
                    select)
            }
            text(lane,
                on ? "Xuống đáy" : "Lên tay",
                x,
                -ch / 2 - 30,
                {
                    font: "textMedium", bold: true, size: 28, width: cw, upper: false, color: on ? C.teal : C.goldLight
                })
        })
    }
    paint()
    new Button(body,
        "Huỷ",
        220,
        60,
        keep ? -250 : -125,
        -H / 2 + 66,
        close,
        "gold",
        30)
    if (keep) new Button(body,
        "Giữ nguyên",
        220,
        60,
        keep ? 250 : 0,
        -H / 2 + 66,
        () => { close(); onPick(keep) },
        "gold",
        30)
}

/**
 * Chọn lá bỏ: lưới các lá có thể bỏ (uid trong args.discard của các lựa chọn), chọn tối đa `max` lá, bấm lại để giữ.
 * Xác nhận chỉ sáng khi tổ hợp đã chọn khớp đúng một lựa chọn.
 */
export function discardDialog(root: Node, view: CardView, options: cg.Action[], onPick: Pick) {
    const uids = [...new Set(options.flatMap(discardOf))]
    const max = Math.max(1,
        ...options.map((a) => discardOf(a).length))
    const cw = 180, ch = 260, gap = 18
    const perRow = Math.min(7,
        Math.max(1,
            uids.length))
    const rows = Math.max(1,
        Math.ceil(uids.length / perRow))
    const W = Math.max(900,
        perRow * (cw + gap) + 120)
    const H = 150 + 40 + rows * (ch + gap) + 170
    const { body, close } = modal(root,
        W,
        H,
        "Chọn lá bỏ",
        `Chọn tối đa ${max} lá trên tay · Bấm lại để giữ lá`)
    let sel: string[] = []
    const grid = box("Grid",
        body,
        W,
        rows * (ch + gap),
        0,
        H / 2 - 150 - 20 - rows * (ch + gap) / 2)
    const counter = text(body,
        "",
        0,
        -H / 2 + 130,
        {
            font: "textMedium", bold: true, size: 30, width: 600, upper: false, color: C.goldLight
        })
    const match = () => options.find((a) => sameSet(discardOf(a),
        sel))
    const confirm = new Button(body,
        "Xác nhận",
        260,
        60,
        250,
        -H / 2 + 66,
        () => {
            const a = match()
            if (!a) return
            close()
            onPick(a)
        },
        "primary",
        30)
    const paint = () => {
        clear(grid)
        uids.forEach((uid, i) => {
            const r = Math.floor(i / perRow)
            const inRow = Math.min(perRow,
                uids.length - r * perRow)
            const x = ((i % perRow) - (inRow - 1) / 2) * (cw + gap)
            const y = (rows * (ch + gap)) / 2 - (r + 0.5) * (ch + gap)
            const on = sel.includes(uid)
            const full = !on && sel.length >= max
            const toggle = () => {
                if (on) sel = sel.filter((u) => u !== uid)
                else if (!full) sel = [...sel,
                    uid]
                paint()
            }
            const card = cardOfUid(view,
                uid)
            if (card) matchCard(grid,
                view,
                card,
                cw,
                ch,
                x,
                y,
                {
                    selected: on, dim: full, onPick: toggle
                })
            else cardBack(grid,
                cw,
                ch,
                x,
                y).on(Node.EventType.TOUCH_END,
                toggle)
            if (on) text(grid,
                "Bỏ",
                x,
                y - ch / 2 - 4,
                {
                    font: "textMedium", bold: true, size: 26, width: cw, upper: false, color: C.danger
                })
        })
        counter.string = `Đã chọn ${sel.length}/${max} lá`
        confirm.setText(sel.length ? `Bỏ ${sel.length} lá` : "Xác nhận")
        confirm.setEnabled(!!match())
    }
    paint()
    new Button(body,
        "Huỷ",
        200,
        60,
        -250,
        -H / 2 + 66,
        close,
        "gold",
        30)
    new Button(body,
        "Bỏ chọn hết",
        200,
        60,
        -20,
        -H / 2 + 66,
        () => { sel = []; paint() },
        "ghost",
        26)
}

/**
 * Chọn mức mana / số lượng: thanh trượt (kéo hoặc bấm trên thanh) cùng nút − / +, giá trị lấy từ args.manaSpent hoặc
 * args.amount của các lựa chọn, sắp từ nhỏ đến lớn.
 */
export function amountDialog(root: Node, options: cg.Action[], onPick: Pick, view?: CardView) {
    const valueOf = (a: cg.Action) => argsOf(a).manaSpent ?? argsOf(a).amount ?? 0
    const isMana = options.some((a) => argsOf(a).manaSpent !== undefined)
    const sorted = [...options].sort((a, b) => valueOf(a) - valueOf(b))
    const list: cg.Action[] = []
    for (const a of sorted) if (!list.length || valueOf(list[list.length - 1]) !== valueOf(a)) list.push(a)
    const n = list.length
    const W = 900, H = 560, TW = 640
    const you = view?.you ?? "A"
    const { body, close } = modal(root,
        W,
        H,
        isMana ? "Chọn mức mana" : "Chọn số lượng",
        view && isMana ? `Mana của bạn: ${view.teamMana?.[you] ?? 0}/${view.rules.teamManaMax ?? 200}` : "")
    let idx = n - 1
    const readout = text(body,
        "",
        0,
        90,
        {
            font: "number", size: 96, width: 500, color: C.goldLight
        })
    const unit = text(body,
        isMana ? "mana" : "đơn vị",
        0,
        20,
        {
            size: 28, width: 300, color: C.textMuted
        })
    unit.string = isMana ? "mana" : "số lượng"
    const track = box("Track",
        body,
        TW + 60,
        64,
        0,
        -60)
    const bar = box("Bar",
        track,
        TW,
        64).addComponent(Graphics)
    bar.fillColor = C.goldDark
    bar.rect(-TW / 2,
        -3,
        TW,
        6)
    bar.fill()
    const prog = box("Prog",
        track,
        TW,
        64).addComponent(Graphics)
    const knob = box("Knob",
        track,
        TW,
        64).addComponent(Graphics)
    const xOf = (i: number) => (n > 1 ? -TW / 2 + (TW * i) / (n - 1) : 0)
    const notches = box("Notches",
        track,
        TW,
        64).addComponent(Graphics)
    notches.fillColor = C.gold
    list.forEach((_, i) => {
        notches.rect(xOf(i) - 1.5,
            -12,
            3,
            24)
    })
    notches.fill()
    text(body,
        String(valueOf(list[0])),
        xOf(0),
        -118,
        {
            font: "number", size: 24, width: 120, color: C.textMuted
        })
    if (n > 1) text(body,
        String(valueOf(list[n - 1])),
        xOf(n - 1),
        -118,
        {
            font: "number", size: 24, width: 120, color: C.textMuted
        })
    const paint = () => {
        readout.string = String(valueOf(list[idx]))
        prog.clear()
        prog.fillColor = C.teal
        prog.rect(-TW / 2,
            -4,
            xOf(idx) + TW / 2,
            8)
        prog.fill()
        knob.clear()
        knob.fillColor = C.goldLight
        knob.circle(xOf(idx),
            0,
            16)
        knob.fill()
        knob.fillColor = C.teal
        knob.circle(xOf(idx),
            0,
            9)
        knob.fill()
    }
    const setFrom = (e: EventTouch) => {
        const ui = e.getUILocation()
        const p = track.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(ui.x,
            ui.y,
            0))
        idx = n > 1 ? Math.max(0,
            Math.min(n - 1,
                Math.round(((p.x + TW / 2) / TW) * (n - 1)))) : 0
        paint()
    }
    track.on(Node.EventType.TOUCH_START,
        setFrom)
    track.on(Node.EventType.TOUCH_MOVE,
        setFrom)
    new Button(body,
        "−",
        70,
        70,
        -TW / 2 - 90,
        -60,
        () => { idx = Math.max(0,
            idx - 1); paint() },
        "gold",
        40)
    new Button(body,
        "+",
        70,
        70,
        TW / 2 + 90,
        -60,
        () => { idx = Math.min(n - 1,
            idx + 1); paint() },
        "gold",
        40)
    paint()
    new Button(body,
        "Huỷ",
        220,
        60,
        -125,
        -H / 2 + 66,
        close,
        "gold",
        30)
    new Button(body,
        "Xác nhận",
        220,
        60,
        125,
        -H / 2 + 66,
        () => { close(); onPick(list[idx]) },
        "primary",
        30)
}

const COLOR_INFO: Record<string, { name: string; color: Color }> = {
    blue: {
        name: "Xanh", color: new Color().fromHEX("#4a9aff")
    },
    red: {
        name: "Đỏ", color: new Color().fromHEX("#ff5a4a")
    },
    gold: {
        name: "Vàng", color: new Color().fromHEX("#f5d27a")
    }
}

/** Chọn màu (args.color: blue / red / gold): mỗi màu một lá to có ngọc cùng màu, bấm chọn rồi Xác nhận */
export function colorDialog(root: Node, options: cg.Action[], onPick: Pick) {
    const colors = (["blue", "red", "gold"] as const).filter((c) => options.some((a) => argsOf(a).color === c))
    const cw = 270, ch = 360, gap = 40
    const W = Math.max(820,
        colors.length * (cw + gap) + 120), H = 640
    const { body, close } = modal(root,
        W,
        H,
        "Chọn màu")
    let chosen: string = colors[0]
    const cards: Frame[] = []
    const paint = () => cards.forEach((f, i) => {
        const c = COLOR_INFO[colors[i]].color
        const on = colors[i] === chosen
        f.draw({
            fill: withAlpha(on ? C.tealDeep : C.bg,
                240), stroke: on ? C.teal : c, inner: on ? C.tealDark : C.goldDark, glow: on ? C.teal : null, chamfer: 16, gems: "both"
        })
    })
    colors.forEach((k, i) => {
        const info = COLOR_INFO[k]
        const f = new Frame(body,
            cw,
            ch,
            (i - (colors.length - 1) / 2) * (cw + gap),
            10)
        cards.push(f)
        const g = box("Mark",
            f.node,
            cw,
            ch).addComponent(Graphics)
        drawGem(g,
            0,
            40,
            70,
            info.color)
        text(f.node,
            info.name,
            0,
            -ch / 2 + 70,
            {
                font: "textMedium", bold: true, size: 44, width: cw - 30, upper: false, color: info.color
            })
        f.node.on(Node.EventType.TOUCH_END,
            () => { chosen = k; paint() })
    })
    paint()
    new Button(body,
        "Huỷ",
        220,
        60,
        -125,
        -H / 2 + 66,
        close,
        "gold",
        30)
    new Button(body,
        "Xác nhận",
        220,
        60,
        125,
        -H / 2 + 66,
        () => {
            const a = options.find((x) => argsOf(x).color === chosen)
            if (!a) return
            close()
            onPick(a)
        },
        "primary",
        30)
}

/**
 * Nhận dạng nhóm lựa chọn rồi mở đúng hộp. Thứ tự giống Hand.tsx: màu, lá bỏ, lá trên bộ, mức mana / số lượng.
 * Không nhận ra (hoặc là cướp chiêu args.pick "steal:...") thì trả false để nơi gọi tự xử lý.
 */
export function pickDialogFor(root: Node, view: CardView, options: cg.Action[], onPick: (a: cg.Action) => void): boolean {
    if (options.length < 2) return false
    if (options.some((a) => argsOf(a).pick?.startsWith("steal:"))) return false
    if (options.every((a) => a.t === "ability" && a.id === "rumble_recycle")) {
        recycleDialog(root,
            view,
            options,
            onPick)
        return true
    }
    if (new Set(options.map((a) => argsOf(a).color)).size > 1) {
        colorDialog(root,
            options,
            onPick)
        return true
    }
    if (new Set(options.map((a) => [...discardOf(a)].sort().join("+"))).size > 1) {
        discardDialog(root,
            view,
            options,
            onPick)
        return true
    }
    const peekUids = new Set(peekOf(view).map((c) => c.uid))
    if (options.some((a) => peekUids.has(argsOf(a).pick ?? ""))) {
        peekDialog(root,
            view,
            options,
            onPick)
        return true
    }
    const levelled = options.every((a) => argsOf(a).manaSpent !== undefined || argsOf(a).amount !== undefined)
    if (levelled && new Set(options.map((a) => argsOf(a).manaSpent ?? argsOf(a).amount)).size > 1) {
        const target = (a: cg.Action) => JSON.stringify({
            t: argsOf(a).target, ts: argsOf(a).targets, l: argsOf(a).lane, a: argsOf(a).actor
        })
        if (new Set(options.map(target)).size === 1) {
            amountDialog(root,
                options,
                onPick,
                view)
            return true
        }
    }
    return false
}

/**
 * Lưới chọn đúng 1 lá theo uid (lá trên tay, trong mộ hoặc lá xem trước); `label` là chữ hiện dưới lá đang chọn.
 * Xác nhận gọi onChoose(uid).
 */
function cardGridDialog(root: Node, view: CardView, uids: string[], title: string, subtitle: string, label: string, onChoose: (uid: string) => void) {
    const cw = 180, ch = 260, gap = 18
    const perRow = Math.min(7,
        Math.max(1,
            uids.length))
    const rows = Math.max(1,
        Math.ceil(uids.length / perRow))
    const W = Math.max(900,
        perRow * (cw + gap) + 120)
    const H = 150 + 40 + rows * (ch + gap) + 170
    const { body, close } = modal(root,
        W,
        H,
        title,
        subtitle)
    let sel: string | null = null
    const grid = box("Grid",
        body,
        W,
        rows * (ch + gap),
        0,
        H / 2 - 150 - 20 - rows * (ch + gap) / 2)
    const confirm = new Button(body,
        "Xác nhận",
        260,
        60,
        0,
        -H / 2 + 66,
        () => {
            if (!sel) return
            close()
            onChoose(sel)
        },
        "primary",
        30)
    const paint = () => {
        clear(grid)
        uids.forEach((uid, i) => {
            const r = Math.floor(i / perRow)
            const inRow = Math.min(perRow,
                uids.length - r * perRow)
            const x = ((i % perRow) - (inRow - 1) / 2) * (cw + gap)
            const y = (rows * (ch + gap)) / 2 - (r + 0.5) * (ch + gap)
            const on = sel === uid
            const choose = () => { sel = on ? null : uid; paint() }
            const card = cardOfUid(view,
                uid)
            if (card) matchCard(grid,
                view,
                card,
                cw,
                ch,
                x,
                y,
                {
                    selected: on, onPick: choose
                })
            else cardBack(grid,
                cw,
                ch,
                x,
                y).on(Node.EventType.TOUCH_END,
                choose)
            if (on) text(grid,
                label,
                x,
                y - ch / 2 - 4,
                {
                    font: "textMedium", bold: true, size: 26, width: cw, upper: false, color: C.goldLight
                })
        })
        confirm.setEnabled(!!sel)
    }
    paint()
}

/**
 * Rumble Tái Chế: bước 1 chọn 1 lá chiêu đồng minh trên tay để vứt; bước 2 chọn 1 lá chiêu trong mộ để lấy (chỉ các lá hợp lệ
 * với lá vừa vứt: vứt Q/E lấy Q/E, vứt R lấy cả R).
 */
export function recycleDialog(root: Node, view: CardView, options: cg.Action[], onPick: Pick) {
    const discards = [...new Set(options.map((a) => discardOf(a)[0]).filter((u): u is string => !!u))]
    cardGridDialog(root,
        view,
        discards,
        "Tái Chế · Vứt lá",
        "Chọn 1 lá chiêu của đồng minh để vứt",
        "Vứt",
        (d) => {
            const rest = options.filter((a) => discardOf(a)[0] === d)
            const picks = [...new Set(rest.map((a) => argsOf(a).pick ?? ""))]
            cardGridDialog(root,
                view,
                picks,
                "Tái Chế · Lấy lá",
                "Chọn 1 lá chiêu trong mộ để Rumble dùng như của mình",
                "Lấy",
                (g) => {
                    const a = rest.find((x) => argsOf(x).pick === g)
                    if (a) onPick(a)
                })
        })
}
