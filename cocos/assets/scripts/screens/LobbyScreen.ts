// Sảnh đấu, bóc từ docs/mockups/match/lobby.png: thanh trên (logo, tên, bộ đang dùng, Bộ bài, Đăng xuất), tiêu đề
// "Sảnh đấu", bảng 4 chế độ (Đấu nhanh, Đấu máy dễ, Đấu máy khó, Phòng riêng có mã phòng), thẻ "Bộ đang dùng"
// (tên, số lá, tổng 4 nhóm, 4 ô vuông nhóm, Đổi bộ), nút chính "Vào trận".
import {
    Node
} from "cc"
import {
    C, GROUP_FRAME, GROUP_NAME, at, withAlpha
} from "../dna/theme"
import {
    leaderboard, listDecks, myProfile, type DeckRow
} from "../net/api"
import {
    setSetting, settings, type Settings
} from "../net/settings"
import {
    CARD_ITEMS, itemText
} from "../shared/cardgame/items"
import {
    image
} from "../ui/assets"
import {
    Button, Frame, StatusLine, TextField, box, clear, panel, rule, text
} from "../ui/kit"
import {
    slot
} from "../ui/slot"
import type {
    MatchMode, Nav
} from "./nav"

const GROUPS = ["basic",
    "spell",
    "gold",
    "item"] as const

/** Thanh trên của các màn ngoài trận đã đăng nhập (lobby.png): logo trái, tên, bộ đang dùng, nút Bộ bài, Đăng xuất */
export function topBar(root: Node, nav: Nav, deckName: string) {
    const y = at(0,
        37).y
    const bar = box("TopBar",
        root,
        1920,
        74,
        0,
        y)
    const back = new Frame(bar,
        1920,
        74,
        0,
        0,
        {
            fill: withAlpha(C.bg,
                225), stroke: C.gold, inner: null, chamfer: 0
        })
    back.node.name = "Back"
    image(bar,
        "art/logo/crest",
        60,
        60,
        at(88,
            0).x,
        0)
    text(bar,
        "StarCi League",
        at(290,
            0).x,
        0,
        {
            font: "title", size: 36, width: 300, align: "left"
        })
    text(bar,
        nav.session?.user.name ?? "",
        at(1168,
            0).x,
        0,
        {
            font: "textMedium", bold: true, size: 32, width: 260, upper: false
        })
    if (deckName) text(bar,
        `Bộ bài: ${deckName}`,
        at(1400,
            0).x,
        0,
        {
            size: 26, color: C.text, width: 260
        })
    new Button(bar,
        "Bộ bài",
        156,
        50,
        at(1610,
            0).x,
        0,
        () => nav.showDecks(),
        "primary",
        26)
    new Button(bar,
        "Đăng xuất",
        172,
        50,
        at(1806,
            0).x,
        0,
        () => nav.signOut(),
        "gold",
        26)
}

type LobbyTab = "play" | "ranked" | "items" | "account" | "settings"

interface Ctx {
    nav: Nav;
    active: DeckRow | null;
    deckCards: string[] | null;
    message: string;
    /** Chuyển tab (vd sau khi đổi cài đặt) */
    show(tab: LobbyTab): void;
}

const RAIL: { tab: LobbyTab | "heroes" | "decks"; label: string }[] = [
    { tab: "play", label: "Chơi" },
    { tab: "ranked", label: "Xếp hạng" },
    { tab: "heroes", label: "Tướng" },
    { tab: "items", label: "Kho đồ" },
    { tab: "decks", label: "Bộ bài" },
    { tab: "account", label: "Tài khoản" },
    { tab: "settings", label: "Cài đặt" },
]

/** Sảnh: thanh trên, cột menu bên trái (Chơi, Xếp hạng, Tướng, Kho đồ, Bộ bài, Tài khoản, Cài đặt), vùng nội dung theo tab */
export async function buildLobby(root: Node, nav: Nav, message = "", tab: LobbyTab = "play") {
    const session = nav.session
    if (!session) return nav.showAuth()
    let decks: DeckRow[] = []
    try { decks = await listDecks(session) } catch { /* không có mạng: sảnh vẫn hiện, vào trận dùng bộ mặc định */ }
    if (!root.isValid) return
    const prefix = nav.catalog?.prefix ?? "cg:"
    const active = decks.find((d) => d.is_active) ?? null
    const deckCards = active?.cards.every((c) => c.startsWith(prefix)) ? active.cards.map((c) => c.slice(prefix.length)) : null

    topBar(root,
        nav,
        active?.name ?? "Bộ mặc định")
    const pane = box("Pane", root, 1920, 1080)
    const railNode = box("Rail", root, 300, 700, -810, 20)
    const ctx: Ctx = {
        nav, active, deckCards, message, show: (t) => showTab(t)
    }
    let current: LobbyTab = tab
    const drawRail = () => {
        clear(railNode)
        RAIL.forEach((r, i) => {
            const on = r.tab === current
            const b = new Button(railNode, r.label, 250, 64, 0, 290 - i * 84, () => {
                if (r.tab === "heroes") return nav.showHeroes()
                if (r.tab === "decks") return nav.showDecks()
                showTab(r.tab)
            }, on ? "primary" : "gold", 26)
            b.setSelected(on)
        })
    }
    const showTab = (t: LobbyTab) => {
        current = t
        clear(pane)
        drawRail()
        if (t === "play") playTab(pane, ctx)
        else if (t === "ranked") rankedTab(pane, ctx)
        else if (t === "items") itemsTab(pane)
        else if (t === "account") accountTab(pane, ctx)
        else settingsTab(pane)
    }
    showTab(tab)
}

/** Tab Chơi: bảng chế độ, bộ đang dùng, nút Vào trận (dịch sang phải để chừa cột menu) */
function playTab(parent: Node, ctx: Ctx) {
    const { nav, active, deckCards, message } = ctx
    const root = box("Play", parent, 1920, 1080, 100, 0)
    text(root,
        "Sảnh đấu",
        at(690,
            0).x,
        at(0,
            172).y,
        {
            font: "title", size: 68, width: 600
        })
    rule(root,
        420,
        at(690,
            0).x,
        at(0,
            228).y,
        true,
        C.gold)

    // ---- bảng chế độ ----
    const modes = panel(root,
        990,
        567,
        at(675,
            0).x,
        at(0,
            562).y)
    let mode: MatchMode = {
        kind: "quick"
    }
    const tiles: { mode: MatchMode; frame: Frame }[] = []
    const mx = (x: number) => x - 675, my = (y: number) => 562 - y
    const paintTiles = () => {
        for (const t of tiles) {
            const on = t.mode.kind === mode.kind && (t.mode.kind !== "bot" || (mode.kind === "bot" && t.mode.level === mode.level))
            t.frame.draw({
                fill: on ? withAlpha(C.tealDeep,
                    235) : withAlpha(C.bg,
                    235),
                stroke: on ? C.teal : C.gold,
                inner: on ? C.tealDark : C.goldDark,
                glow: on ? C.teal : null,
                chamfer: 14,
                skin: "",
            })
        }
    }
    const tile = (m: MatchMode, title: string, sub: string, x: number, y: number) => {
        const f = new Frame(modes,
            450,
            235,
            mx(x),
            my(y))
        text(f.node,
            title,
            0,
            22,
            {
                font: "title", size: 42, width: 420
            })
        rule(f.node,
            340,
            0,
            -7,
            true,
            C.gold)
        text(f.node,
            sub,
            0,
            -42,
            {
                size: 28, color: C.text, width: 400
            })
        f.node.on(Node.EventType.TOUCH_END,
            () => { mode = m; paintTiles() })
        tiles.push({
            mode: m, frame: f
        })
    }
    tile({
        kind: "quick"
    },
    "Đấu nhanh",
    "Ghép ngẫu nhiên",
    448,
    440)
    tile({
        kind: "bot", level: "easy"
    },
    "Đấu máy dễ",
    "Luyện tập",
    912,
    440)
    tile({
        kind: "bot", level: "hard"
    },
    "Đấu máy khó",
    "Thử thách",
    448,
    692)

    const room = new Frame(modes,
        450,
        235,
        mx(912),
        my(692),
        {
            chamfer: 14, fill: withAlpha(C.bg,
                235), skin: ""
        })
    text(room.node,
        "Phòng riêng",
        0,
        80,
        {
            font: "title", size: 38, width: 420
        })
    rule(room.node,
        300,
        0,
        52,
        true,
        C.gold)
    new Button(room.node,
        "Tạo phòng",
        236,
        46,
        0,
        5,
        () => nav.startMatch({
            kind: "create"
        },
        deckCards,
        active?.name),
        "primary",
        24)
    const code = new TextField(room.node,
        "Nhập mã phòng",
        250,
        -72,
        -62,
        {
            maxLength: 32
        },
        46)
    new Button(room.node,
        "Vào phòng",
        134,
        46,
        138,
        -62,
        () => {
            if (!code.value) return status.say("Nhập mã phòng để vào")
            nav.startMatch({
                kind: "join", roomId: code.value
            },
            deckCards,
            active?.name)
        },
        "primary",
        22)
    paintTiles()

    // ---- bộ đang dùng ----
    const deckBox = panel(root,
        536,
        627,
        at(1480,
            0).x,
        at(0,
            592).y)
    text(deckBox,
        "Bộ đang dùng",
        0,
        277,
        {
            font: "textMedium", bold: true, size: 38, width: 480, upper: false
        })
    rule(deckBox,
        400,
        0,
        245,
        true,
        C.gold)
    const nameBar = new Frame(deckBox,
        480,
        64,
        0,
        187,
        {
            chamfer: 10
        })
    text(nameBar.node,
        active?.name ?? "Bộ mặc định",
        -60,
        0,
        {
            font: "textMedium", bold: true, size: 36, width: 300, align: "left", upper: false
        })
    text(nameBar.node,
        `${(deckCards ?? nav.catalog?.defaultDeck ?? []).length}/${nav.catalog?.size ?? 80} lá`,
        170,
        0,
        {
            size: 28, width: 140, color: C.goldLight
        })
    const ids = deckCards ?? nav.catalog?.defaultDeck ?? []
    const groupOf = (id: string) => nav.catalog?.pool.find((c) => c.id === id)?.group ?? "basic"
    GROUPS.forEach((g, i) => {
        const y = [110,
            64,
            19,
            -26][i]
        const row = new Frame(deckBox,
            470,
            40,
            0,
            y,
            {
                fill: withAlpha(C.panelRaised,
                    220), inner: null, stroke: C.goldDark, chamfer: 6
            })
        text(row.node,
            GROUP_NAME[g],
            -95,
            0,
            {
                size: 28, width: 240, align: "left", height: 38
            })
        text(row.node,
            String(ids.filter((id) => groupOf(id) === g).length),
            205,
            0,
            {
                font: "number", size: 28, width: 60, align: "right", height: 38, color: C.goldLight
            })
        // Ô vuông nhóm: tranh lá nhiều nhất của nhóm, khung theo màu nhóm
        const counts = new Map<string, number>()
        for (const id of ids) if (groupOf(id) === g) counts.set(id,
            (counts.get(id) ?? 0) + 1)
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ""
        slot(deckBox,
            top.startsWith("item:") ? "items" : "cards",
            top.startsWith("item:") ? top.slice(5) : top.replace(":",
                "_"),
            105,
            [-183,
                -61,
                61,
                183][i],
            -135,
            {
                edge: GROUP_FRAME[g].edge
            })
    })
    new Button(deckBox,
        "Đổi bộ",
        325,
        55,
        0,
        -251,
        () => nav.showDecks(),
        "primary",
        28)

    new Button(root,
        "Vào trận",
        655,
        100,
        at(682,
            0).x,
        at(0,
            933).y,
        () => nav.startMatch(mode,
            deckCards,
            active?.name),
        "primary",
        58)
    const status = new StatusLine(root,
        at(682,
            0).x,
        at(0,
            1010).y,
        800)
    if (message) status.say(message)
}

/** Tab Xếp hạng: điểm, thắng thua, hạng, bảng 10 người đầu và nút tìm trận xếp hạng (chỉ ghép với người thật, đổi điểm Elo) */
function rankedTab(parent: Node, ctx: Ctx) {
    const { nav, active, deckCards } = ctx
    const root = box("Ranked", parent, 1920, 1080, 100, 0)
    text(root, "Xếp hạng", 0, 380, { font: "title", size: 34, width: 600 })
    rule(root, 420, 0, 345, true, C.gold)
    const me = panel(root, 520, 520, -320, 40)
    text(me, "Điểm xếp hạng", 0, 200, { font: "textMedium", bold: true, size: 22, width: 460, upper: false })
    const rating = text(me, "…", 0, 140, { font: "number", size: 34, width: 460, color: C.goldLight })
    const record = text(me, "", 0, 90, { size: 18, color: C.text, width: 460, upper: false })
    const rank = text(me, "", 0, 55, { size: 18, color: C.textMuted, width: 460, upper: false })
    text(me, "Thắng nhận khoảng 16 điểm, thua mất bằng ngần ấy; thoát giữa trận tính thua.",
        0, -20, { size: 14, color: C.textMuted, width: 440, height: 60, wrap: true, upper: false })
    const status = new StatusLine(me, 0, -110, 460)
    new Button(me, "Tìm trận xếp hạng", 400, 80, 0, -190, () => nav.startMatch({ kind: "ranked" }, deckCards, active?.name), "primary", 26)

    const board = panel(root, 640, 520, 330, 40)
    text(board, "Top 10", 0, 220, { font: "textMedium", bold: true, size: 22, width: 560, upper: false })
    const rows = box("Rows", board, 600, 440, 0, -20)
    const session = nav.session
    if (!session) return
    void Promise.all([myProfile(session), leaderboard(session)]).then(([profile, lb]) => {
        if (!root.isValid) return
        rating.string = String(profile.rating ?? 1000)
        record.string = `${profile.wins ?? 0} thắng · ${profile.losses ?? 0} thua`
        rank.string = (profile.wins ?? 0) + (profile.losses ?? 0) > 0 ? `Hạng ${lb.rank}` : "Chưa xếp hạng: đánh trận đầu tiên"
        lb.top.slice(0, 10).forEach((r, i) => {
            const y = 190 - i * 42
            const mine = r.id === profile.id
            text(rows, String(i + 1), -270, y, { font: "number", size: 18, width: 40, color: mine ? C.teal : C.goldLight })
            text(rows, r.name, -50, y, { size: 18, width: 300, align: "left", color: mine ? C.teal : C.text, upper: false })
            text(rows, `${r.wins}-${r.losses}`, 110, y, { size: 14, width: 100, color: C.textMuted })
            text(rows, String(r.rating), 250, y, { font: "number", size: 18, width: 100, align: "right", color: C.goldLight })
        })
        if (!lb.top.length) text(rows, "Chưa có ai trên bảng.", 0, 100, { size: 18, color: C.textMuted, width: 500, upper: false })
    }).catch((e: Error) => { if (root.isValid) status.say(e.message) })
}

const ITEM_PER_PAGE = 48
const ITEM_COLS = 8

/** Tab Kho đồ: mọi món đồ của chế độ thẻ bài; bấm một ô xem chỉ số và nội tại */
function itemsTab(parent: Node) {
    const root = box("Items", parent, 1920, 1080, 100, 0)
    text(root, "Kho đồ", 0, 380, { font: "title", size: 34, width: 600 })
    rule(root, 420, 0, 345, true, C.gold)
    const ids = Object.keys(CARD_ITEMS)
    const grid = box("Grid", root, 900, 760, -280, -30)
    const detailFrame = panel(root, 520, 620, 420, -10)
    const detail = box("Body", detailFrame, 520, 620)
    let page = 0
    let sel = ids[0]
    const drawDetail = () => {
        clear(detail)
        const tx = itemText(sel, "vi")
        if (!tx) return
        slot(detail, "items", sel, 120, 0, 190, { edge: C.gold })
        text(detail, tx.name, 0, 95, { font: "textMedium", bold: true, size: 22, width: 460, upper: false })
        text(detail, tx.stats, 0, 55, { size: 14, color: C.goldLight, width: 460, height: 40, wrap: true, upper: false })
        rule(detail, 360, 0, 25, true, C.gold)
        text(detail, `${tx.passive}${tx.counter ? ` (tối đa ${tx.counter.max ?? "∞"} ${tx.counter.name})` : ""}`, 0, -5, { font: "textMedium", bold: true, size: 18, width: 460, upper: false })
        text(detail, tx.desc, 0, -110, { size: 14, color: C.text, width: 460, height: 190, wrap: true, upper: false })
    }
    const drawGrid = () => {
        clear(grid)
        ids.slice(page * ITEM_PER_PAGE, (page + 1) * ITEM_PER_PAGE).forEach((id, i) => {
            const x = ((i % ITEM_COLS) - (ITEM_COLS - 1) / 2) * 112
            const y = 290 - Math.floor(i / ITEM_COLS) * 112
            const s = slot(grid, "items", id, 96, x, y, { edge: id === sel ? C.teal : C.gold })
            s.node.on(Node.EventType.TOUCH_END, () => { sel = id; drawGrid(); drawDetail() })
        })
        const pages = Math.ceil(ids.length / ITEM_PER_PAGE)
        if (pages > 1) {
            text(grid, `Trang ${page + 1}/${pages}`, 0, -350, { size: 18, color: C.textMuted, width: 200 })
            if (page > 0) new Button(grid, "<", 56, 44, -150, -350, () => { page--; drawGrid() }, "ghost", 22)
            if ((page + 1) * ITEM_PER_PAGE < ids.length) new Button(grid, ">", 56, 44, 150, -350, () => { page++; drawGrid() }, "ghost", 22)
        }
    }
    drawGrid()
    drawDetail()
}

/** Tab Tài khoản: tên, email, ngày tham gia, thành tích xếp hạng, đăng xuất */
function accountTab(parent: Node, ctx: Ctx) {
    const { nav } = ctx
    const root = box("Account", parent, 1920, 1080, 100, 0)
    text(root, "Tài khoản", 0, 380, { font: "title", size: 34, width: 600 })
    rule(root, 420, 0, 345, true, C.gold)
    const card = panel(root, 900, 560, 0, 20)
    const user = nav.session?.user
    image(card, "art/logo/crest", 140, 140, -300, 130)
    text(card, user?.name ?? "", 100, 170, { font: "textMedium", bold: true, size: 34, width: 520, align: "left", upper: false })
    text(card, user?.email ?? "", 100, 120, { size: 18, color: C.textMuted, width: 520, align: "left", upper: false })
    rule(card, 760, 0, 50, true, C.gold)
    const stats = text(card, "Đang tải thành tích…", 0, -10, { size: 22, color: C.goldLight, width: 760, upper: false })
    const since = text(card, "", 0, -60, { size: 18, color: C.textMuted, width: 760, upper: false })
    text(card, `Mã tài khoản: ${(user?.id ?? "").slice(0, 8)}`, 0, -100, { size: 14, color: C.textMuted, width: 760, upper: false })
    new Button(card, "Bộ bài của tôi", 260, 56, -160, -200, () => nav.showDecks(), "gold", 22)
    new Button(card, "Đăng xuất", 260, 56, 160, -200, () => nav.signOut(), "primary", 22)
    if (nav.session) void myProfile(nav.session).then((p) => {
        if (!root.isValid) return
        const total = (p.wins ?? 0) + (p.losses ?? 0)
        stats.string = `Điểm ${p.rating ?? 1000}  ·  ${p.wins ?? 0} thắng  ·  ${p.losses ?? 0} thua${total ? `  ·  tỉ lệ thắng ${Math.round(100 * (p.wins ?? 0) / total)}%` : ""}`
        since.string = p.created_at ? `Tham gia ${new Date(p.created_at).toLocaleDateString("vi-VN")}` : ""
    }).catch(() => { if (root.isValid) stats.string = "Chưa tải được thành tích" })
}

const SETTING_ROWS: { key: keyof Settings; label: string; hint: string }[] = [
    { key: "vfx", label: "Hiệu ứng chiêu", hint: "Tắt thì chiêu chỉ hiện số sát thương, trận chạy nhẹ hơn" },
    { key: "motes", label: "Hạt sáng nền", hint: "Những hạt lơ lửng trên màn menu" },
    { key: "sound", label: "Âm thanh", hint: "Nhạc nền và tiếng chiêu" },
    { key: "skipBanners", label: "Rút gọn biểu ngữ", hint: "Bỏ biểu ngữ lớn giữa màn, giữ nhật ký trận" },
]

/** Tab Cài đặt: các công tắc lưu cục bộ trên máy */
function settingsTab(parent: Node) {
    const root = box("Settings", parent, 1920, 1080, 100, 0)
    text(root, "Cài đặt", 0, 380, { font: "title", size: 34, width: 600 })
    rule(root, 420, 0, 345, true, C.gold)
    const frame = panel(root, 900, 520, 0, 40)
    const card = box("Body", frame, 900, 520)
    const draw = () => {
        clear(card)
        SETTING_ROWS.forEach((r, i) => {
            const y = 170 - i * 110
            text(card, r.label, -120, y + 14, { font: "textMedium", bold: true, size: 22, width: 560, align: "left", upper: false })
            text(card, r.hint, -120, y - 18, { size: 14, color: C.textMuted, width: 560, align: "left", upper: false })
            const on = settings()[r.key]
            new Button(card, on ? "Bật" : "Tắt", 160, 52, 340, y, () => { setSetting(r.key, !on); draw() }, on ? "primary" : "ghost", 22)
        })
    }
    draw()
}
