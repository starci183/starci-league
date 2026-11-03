// Màn xếp bộ bài, bóc từ docs/mockups/cocos/builder.png: thanh thông tin (tên bộ, bộ đếm 80/80, tổng theo nhóm),
// trái KHO LÁ (lọc theo nhóm, lưới lá bài thật, bấm để thêm), phải BỘ ĐANG XẾP (đường phân bố nhóm, danh sách lá thu
// nhỏ theo nhóm, bấm để bớt), đáy Quay lại / Bộ mặc định / Lưu / Dùng. Luật số lá kiểm sớm ở đây; server kiểm lại khi lưu.
import {
    Graphics, Node
} from "cc"
import {
    C, GROUP_NAME, at, withAlpha
} from "../dna/theme"
import {
    activateDeck, createDeck, updateDeck, type DeckRow, type PoolCard
} from "../net/api"
import {
    image
} from "../ui/assets"
import {
    cardArt, gameCard
} from "../ui/card"
import {
    Button, Frame, StatusLine, TextField, box, clear, panel, text
} from "../ui/kit"
import {
    header
} from "./header"
import type {
    Nav
} from "./nav"

const GROUPS = ["basic",
    "spell",
    "gold",
    "item"] as const
type Filter = "all" | (typeof GROUPS)[number]

const POOL = {
    x: -227, y: -42, w: 1168, h: 770
}
const DECK = {
    x: 596, y: -42, w: 437, h: 770
}
const COLS = [-711,
    -544,
    -378,
    -211,
    -50,
    113,
    276]
const ROWS = [153,
    -86,
    -315]
const CARD = {
    w: 155, h: 235
}

export function buildDeckBuilder(root: Node, nav: Nav, source: DeckRow | null) {
    const session = nav.session, catalog = nav.catalog
    if (!session || !catalog) return nav.showAuth("Chưa tải được kho lá, hãy đăng nhập lại")
    const prefix = catalog.prefix
    const byId = new Map(catalog.pool.map((c) => [c.id,
        c]))
    const order = new Map(catalog.pool.map((c, i) => [c.id,
        i]))
    const sort = (ids: string[]) => [...ids].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))

    let deckId = source?.id ?? null
    let isActive = source?.is_active ?? false
    let dirty = !source
    let confirmBack = false
    let filter: Filter = "all"
    const stored = source?.cards ?? []
    let cards = stored.length && stored.every((c) => c.startsWith(prefix) && byId.has(c.slice(prefix.length)))
        ? sort(stored.map((c) => c.slice(prefix.length)))
        : sort(catalog.defaultDeck)
    if (!source || cards.length !== stored.length) dirty = true

    header(root,
        nav,
        "Xếp bộ bài",
        false,
        62,
        112)

    // ---- thanh thông tin ----
    const infoY = at(0,
        147).y
    const info = new Frame(root,
        1627,
        66,
        0,
        infoY,
        {
            chamfer: 12
        }).node
    text(info,
        "Tên bộ bài",
        -719,
        0,
        {
            size: 24, color: C.text, width: 160
        })
    const name = new TextField(info,
        "Tên bộ bài",
        310,
        -489,
        0,
        {
            maxLength: 32
        },
        46)
    name.value = source?.name ?? "Bộ mới"
    name.edit.node.on("text-changed",
        () => { dirty = true })
    const divider = (x: number) => {
        const g = box("Divider",
            info,
            2,
            44,
            x,
            0).addComponent(Graphics)
        g.fillColor = C.goldDark
        g.rect(-1,
            -22,
            2,
            44)
        g.fill()
    }
    divider(-310)
    const counter = text(info,
        "",
        -208,
        0,
        {
            font: "number", size: 46, width: 200, height: 60
        })
    divider(-92)
    const groupLabels = GROUPS.map((g, i) => {
        const x = [39,
            257,
            475,
            693][i]
        if (i) divider(x - 112)
        groupIcon(box("Icon",
            info,
            34,
            34,
            x - 82,
            0).addComponent(Graphics),
        g)
        return text(info,
            "",
            x + 15,
            0,
            {
                size: 26, width: 150, height: 50, align: "left"
            })
    })

    // ---- kho lá ----
    const pool = panel(root,
        POOL.w,
        POOL.h,
        POOL.x,
        POOL.y,
        "none")
    const top = POOL.h / 2 - 50
    text(pool,
        "Kho lá",
        -480,
        top,
        {
            font: "title", size: 38, width: 180, align: "left"
        })
    text(pool,
        `✦ ${catalog.pool.length} lá`,
        -310,
        top,
        {
            size: 24, color: C.textMuted, width: 120, align: "left"
        })
    const filters: [Filter, string, number, number][] = [["all",
        "Tất cả",
        -79,
        130],
    ["basic",
        "Đánh thường",
        74,
        170],
    ["spell",
        "Bổ trợ",
        231,
        130],
    ["gold",
        "Vàng",
        367,
        120],
    ["item",
        "Đồ",
        496,
        110]]
    const filterButtons = filters.map(([f, caption, x, w]) => {
        const b = new Button(pool,
            caption,
            w,
            42,
            x,
            top,
            () => { filter = f; render() },
            "gold",
            20)
        return [f,
            b] as const
    })
    const grid = box("Grid",
        root,
        POOL.w,
        POOL.h,
        0,
        0)

    // ---- bộ đang xếp ----
    const deckPanel = panel(root,
        DECK.w,
        DECK.h,
        DECK.x,
        DECK.y,
        "none")
    const dTop = DECK.h / 2 - 50
    text(deckPanel,
        "Bộ đang xếp",
        -70,
        dTop,
        {
            font: "title", size: 32, width: 270, align: "left"
        })
    const chip = new Frame(deckPanel,
        130,
        36,
        DECK.w / 2 - 82,
        dTop,
        {
            fill: withAlpha(C.bg,
                240), inner: null, chamfer: 8
        })
    const chipText = text(chip.node,
        "",
        0,
        0,
        {
            size: 18, width: 120, height: 34, color: C.goldLight
        })
    const curve = box("Curve",
        deckPanel,
        DECK.w,
        120,
        0,
        dTop - 105)
    const list = box("List",
        deckPanel,
        DECK.w - 36,
        560,
        0,
        -112)

    // ---- đáy ----
    const bottomY = at(0,
        1025).y
    new Button(root,
        "‹  Quay lại",
        252,
        63,
        at(241,
            0).x,
        bottomY,
        back,
        "gold",
        28)
    new Button(root,
        "Bộ mặc định",
        252,
        63,
        at(519,
            0).x,
        bottomY,
        () => { cards = sort(catalog.defaultDeck); dirty = true; status.say(""); render() },
        "gold",
        26)
    const status = new StatusLine(root,
        -10,
        bottomY,
        560)
    const saveBtn = new Button(root,
        "Lưu",
        230,
        63,
        at(1381,
            0).x,
        bottomY,
        () => { void save(false) },
        "gold",
        30)
    const useBtn = new Button(root,
        "Dùng",
        270,
        63,
        at(1665,
            0).x,
        bottomY,
        () => { void save(true) },
        "primary",
        32)

    const countOf = (id: string) => cards.filter((c) => c === id).length

    function errorOf(): string | null {
        if (cards.length !== catalog!.size) return `Bộ cần đúng ${catalog!.size} lá (đang có ${cards.length})`
        for (const c of catalog!.pool) if (countOf(c.id) > c.max) return `Tối đa ${c.max} lá ${c.name}`
        if (!name.value) return "Bộ bài cần có tên"
        return null
    }

    function add(c: PoolCard) {
        if (cards.length >= catalog!.size) return status.say(`Bộ đã đủ ${catalog!.size} lá, bớt lá khác trước`)
        if (countOf(c.id) >= c.max) return status.say(`Tối đa ${c.max} lá ${c.name}`)
        cards = sort([...cards,
            c.id])
        dirty = true
        status.say("")
        render()
    }

    function remove(id: string) {
        const i = cards.indexOf(id)
        if (i < 0) return
        cards.splice(i,
            1)
        dirty = true
        status.say("")
        render()
    }

    function totals() {
        const t: Record<string, number> = {
            basic: 0, spell: 0, gold: 0, item: 0
        }
        for (const id of cards) t[byId.get(id)?.group ?? "basic"]++
        return t
    }

    function drawCurve(t: Record<string, number>) {
        clear(curve)
        const g = box("Line",
            curve,
            DECK.w,
            120).addComponent(Graphics)
        const xs = [-150,
            -50,
            50,
            150]
        const peak = Math.max(1,
            ...GROUPS.map((k) => t[k]))
        const ys = GROUPS.map((k) => 8 + (t[k] / peak) * 34)
        g.strokeColor = C.teal
        g.lineWidth = 2
        g.moveTo(xs[0],
            ys[0])
        for (let i = 1; i < 4; i++) g.lineTo(xs[i],
            ys[i])
        g.stroke()
        GROUPS.forEach((k, i) => {
            g.fillColor = C.teal
            g.circle(xs[i],
                ys[i],
                5)
            g.fill()
            text(curve,
                String(t[k]),
                xs[i],
                -18,
                {
                    font: "number", size: 30, width: 90, color: C.goldLight
                })
            text(curve,
                GROUP_NAME[k],
                xs[i],
                -46,
                {
                    size: 16, width: 100, color: C.textMuted
                })
        })
    }

    function drawList(t: Record<string, number>) {
        clear(list)
        const w = DECK.w - 36
        let y = 560 / 2 - 14
        for (const g of GROUPS) {
            const ids = [...new Set(cards.filter((id) => byId.get(id)?.group === g))]
            if (!ids.length) continue
            const head = new Frame(list,
                w,
                26,
                0,
                y,
                {
                    fill: withAlpha(C.goldDark,
                        90), stroke: C.goldDark, inner: null, chamfer: 6
                })
            text(head.node,
                `${GROUP_NAME[g]} · ${t[g]}`,
                -w / 2 + 120,
                0,
                {
                    font: "title", size: 21, width: 220, height: 26, align: "left"
                })
            y -= 27
            for (const id of ids) {
                const c = byId.get(id)!
                const row = box("Row",
                    list,
                    w,
                    24,
                    0,
                    y)
                const bg = box("Bg",
                    row,
                    w,
                    24).addComponent(Graphics)
                const paint = (hover: boolean) => {
                    bg.clear()
                    bg.fillColor = hover ? C.tealDeep : withAlpha(C.panelRaised,
                        200)
                    bg.rect(-w / 2,
                        -12,
                        w,
                        24)
                    bg.fill()
                }
                paint(false)
                image(row,
                    cardArt(id),
                    56,
                    22,
                    -w / 2 + 32,
                    0)
                text(row,
                    c.name,
                    -w / 2 + 70 + 120,
                    0,
                    {
                        size: 21, width: 240, height: 24, align: "left", color: C.goldLight
                    })
                text(row,
                    `×${countOf(id)}`,
                    w / 2 - 34,
                    0,
                    {
                        font: "number", size: 22, width: 60, height: 24, align: "right", color: C.goldLight
                    })
                row.on(Node.EventType.MOUSE_ENTER,
                    () => paint(true))
                row.on(Node.EventType.MOUSE_LEAVE,
                    () => paint(false))
                row.on(Node.EventType.TOUCH_END,
                    () => remove(id))
                y -= 25
            }
        }
    }

    function render() {
        clear(grid)
        const shown = catalog!.pool.filter((c) => filter === "all" || c.group === filter)
        shown.forEach((c, i) => {
            const col = i % COLS.length, row = Math.floor(i / COLS.length)
            if (row >= ROWS.length) return
            gameCard(grid,
                c,
                CARD.w,
                CARD.h,
                COLS[col],
                ROWS[row],
                countOf(c.id),
                () => add(c))
        })
        for (const [f, b] of filterButtons) b.setSelected(f === filter)
        const t = totals()
        counter.string = `${cards.length} / ${catalog!.size}`
        counter.color = cards.length === catalog!.size ? C.teal : C.goldLight
        GROUPS.forEach((g, i) => { groupLabels[i].string = `${GROUP_NAME[g]}   ${t[g]}` })
        chipText.string = name.value || "Bộ mới"
        drawCurve(t)
        drawList(t)
        const ok = !errorOf()
        saveBtn.setEnabled(ok)
        useBtn.setEnabled(ok && !(isActive && !dirty))
    }

    async function save(activate: boolean) {
        const err = errorOf()
        if (err) return status.say(err)
        saveBtn.setEnabled(false)
        useBtn.setEnabled(false)
        status.say("Đang lưu…",
            true)
        try {
            const body = cards.map((c) => prefix + c)
            const row = deckId
                ? await updateDeck(session!,
                    deckId,
                    {
                        name: name.value, cards: body
                    })
                : await createDeck(session!,
                    name.value,
                    body)
            deckId = row.id
            isActive = row.is_active
            if (activate && !isActive) isActive = (await activateDeck(session!,
                row.id)).is_active
            dirty = false
            status.say(activate ? "Đã lưu, bộ này sẽ dùng khi vào trận" : "Đã lưu",
                true)
        } catch (e) {
            status.say((e as Error).message)
        }
        render()
    }

    function back() {
        if (dirty && !confirmBack) {
            confirmBack = true
            return status.say("Có thay đổi chưa lưu. Bấm Quay lại lần nữa để bỏ.")
        }
        nav.showDecks()
    }

    render()
}

/** Biểu tượng nhóm ở thanh thông tin (builder.png): lá bài, xoắn phép, chồng xu, kiếm */
function groupIcon(g: Graphics, group: (typeof GROUPS)[number]) {
    g.lineWidth = 2
    g.strokeColor = C.gold
    if (group === "basic") {
        g.roundRect(-8,
            -12,
            16,
            24,
            3)
        g.stroke()
        g.roundRect(-12,
            -9,
            16,
            24,
            3)
        g.stroke()
    } else if (group === "spell") {
        g.circle(0,
            0,
            12)
        g.stroke()
        g.circle(2,
            1,
            7)
        g.stroke()
        g.fillColor = C.teal
        g.circle(3,
            2,
            2.5)
        g.fill()
    } else if (group === "gold") {
        for (const y of [-8,
            -1,
            6]) {
            g.ellipse(0,
                y,
                12,
                4.5)
            g.stroke()
        }
    } else {
        g.moveTo(-10,
            -10)
        g.lineTo(10,
            10)
        g.stroke()
        g.moveTo(-10,
            10)
        g.lineTo(10,
            -10)
        g.stroke()
        g.fillColor = C.gold
        g.rect(4,
            4,
            8,
            8)
        g.rect(-12,
            4,
            8,
            8)
        g.fill()
    }
}
