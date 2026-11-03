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
    listDecks, type DeckRow
} from "../net/api"
import {
    image
} from "../ui/assets"
import {
    Button, Frame, StatusLine, TextField, box, panel, rule, text
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
    image(bar,
        "art/logo/wordmark",
        300,
        58,
        at(290,
            0).x,
        0)
    text(bar,
        nav.session?.user.name ?? "",
        at(1168,
            0).x,
        0,
        {
            font: "titleMedium", size: 32, width: 260, upper: false
        })
    text(bar,
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

export async function buildLobby(root: Node, nav: Nav, message = "") {
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
                235)
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
            font: "titleMedium", size: 38, width: 480, upper: false
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
            font: "titleMedium", size: 36, width: 300, align: "left", upper: false
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
            "cards",
            top.replace(":",
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
