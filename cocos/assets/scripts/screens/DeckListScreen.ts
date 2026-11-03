// Màn danh sách bộ bài, bóc từ docs/mockups/cocos/decks.png: thanh trên, tiêu đề "Bộ bài của bạn" có vạch ngọc,
// mỗi bộ là một hộp bài (xấp lá có tranh bìa, dải tên, huy hiệu số lá, nút Sửa / Dùng / Xoá), bộ đang dùng viền ngọc
// có nhãn "Đang dùng"; ô "+ Bộ mới"; phân trang số.
import {
    Graphics, Node
} from "cc"
import {
    C, at, withAlpha
} from "../dna/theme"
import {
    activateDeck, deleteDeck, listDecks, type DeckRow
} from "../net/api"
import {
    image
} from "../ui/assets"
import {
    Button, Frame, StatusLine, box, clear, rule, text
} from "../ui/kit"
import {
    header
} from "./header"
import type {
    Nav
} from "./nav"

const SLOTS = [437,
    797,
    1160,
    1515]
const PER_PAGE = SLOTS.length - 1
const TILE = {
    w: 330, h: 530, y: at(0,
        596).y
}

/** Tranh bìa cố định theo mã bộ, để mỗi bộ giữ một bìa */
const coverOf = (id: string) => `art/decks/cover_${[...id].reduce((s, ch) => s + ch.charCodeAt(0),
    0) % 3 + 1}`

export async function buildDeckList(root: Node, nav: Nav, message = "") {
    const session = nav.session
    if (!session) return nav.showAuth()
    header(root,
        nav,
        "Bộ bài")
    new Button(root,
        "‹  Sảnh đấu",
        240,
        60,
        at(250,
            0).x,
        at(0,
            1005).y,
        () => nav.showLobby(),
        "gold",
        28)
    text(root,
        "Bộ bài của bạn",
        0,
        at(0,
            207).y,
        {
            font: "title", size: 54, width: 900
        })
    rule(root,
        860,
        0,
        at(0,
            245).y,
        true,
        C.gold)
    const sub = text(root,
        "Chọn bộ bài cho trận đấu tiếp theo.",
        0,
        at(0,
            279).y,
        {
            size: 26, color: C.text, width: 900
        })
    const grid = box("Grid",
        root,
        1920,
        TILE.h + 80,
        0,
        TILE.y)
    const pager = box("Pager",
        root,
        700,
        110,
        0,
        at(0,
            975).y)
    const status = new StatusLine(root,
        0,
        at(0,
            900).y,
        1200)
    if (message) status.say(message,
        true)

    let decks: DeckRow[] = []
    let page = 0
    const armed = new Set<string>()
    try {
        decks = await listDecks(session)
    } catch (e) {
        status.say((e as Error).message)
    }
    if (!decks.length) sub.string = "Chưa có bộ nào. Tạo bộ đầu tiên để vào trận."

    function tile(d: DeckRow, slot: number) {
        const x = at(SLOTS[slot],
            0).x
        const active = d.is_active
        const f = new Frame(grid,
            TILE.w,
            TILE.h,
            x,
            0,
            {
                fill: withAlpha(C.panel,
                    235),
                stroke: active ? C.teal : C.gold,
                line: active ? 3 : 2,
                inner: active ? C.tealDark : C.goldDark,
                glow: active ? C.teal : null,
                chamfer: 16,
                gems: "both",
            })
        fan(f.node,
            coverOf(d.id),
            89)
        const plate = new Frame(f.node,
            290,
            58,
            0,
            -101,
            {
                fill: withAlpha(C.bg,
                    240), chamfer: 10
            })
        text(plate.node,
            d.name,
            0,
            0,
            {
                font: "textMedium", size: 36, width: 270, height: 56, color: C.goldLight
            })
        rule(f.node,
            280,
            0,
            -161,
            false)
        const badge = new Frame(f.node,
            128,
            36,
            0,
            -161,
            {
                fill: withAlpha(C.bg,
                    250), chamfer: 8
            })
        text(badge.node,
            `${d.cards.length} lá`,
            0,
            0,
            {
                font: "textMedium", size: 26, width: 120, height: 34, color: C.goldLight
            })
        new Button(f.node,
            "Sửa",
            88,
            46,
            -106,
            -216,
            () => nav.showBuilder(d),
            "gold",
            22)
        const use = new Button(f.node,
            "Dùng",
            98,
            46,
            0,
            -216,
            () => { void run(() => activateDeck(session!,
                d.id),
            `Đã chọn "${d.name}" để vào trận`) },
            "primary",
            22)
        use.setEnabled(!active)
        const del = new Button(f.node,
            "Xoá",
            88,
            46,
            106,
            -216,
            () => {
                if (!armed.has(d.id)) {
                    armed.add(d.id)
                    del.setKind("danger")
                    del.setText("Chắc?")
                    return
                }
                armed.delete(d.id)
                void run(() => deleteDeck(session!,
                    d.id),
                `Đã xoá "${d.name}"`)
            },
            "gold",
            22)
        if (active) {
            const tag = new Frame(f.node,
                210,
                38,
                0,
                TILE.h / 2 + 2,
                {
                    fill: C.tealDeep, stroke: C.teal, inner: null, chamfer: 10
                })
            text(tag.node,
                "Đang dùng",
                0,
                0,
                {
                    font: "title", size: 22, width: 200, height: 36, color: C.goldLight
                })
        }
    }

    function newTile(slot: number) {
        const x = at(SLOTS[slot],
            0).x
        const f = new Frame(grid,
            TILE.w,
            TILE.h,
            x,
            0,
            {
                fill: withAlpha(C.panel,
                    215), chamfer: 16, gems: "none"
            })
        const g = box("Plus",
            f.node,
            200,
            200,
            0,
            89).addComponent(Graphics)
        g.strokeColor = C.goldDark
        g.lineWidth = 1
        g.circle(0,
            0,
            76)
        g.stroke()
        g.fillColor = C.gold
        g.rect(-5,
            -48,
            10,
            96)
        g.rect(-48,
            -5,
            96,
            10)
        g.fill()
        text(f.node,
            "+ Bộ mới",
            0,
            -90,
            {
                font: "title", size: 40, width: 300
            })
        text(f.node,
            "Tạo bộ bài của riêng bạn",
            0,
            -140,
            {
                size: 22, color: C.textMuted, width: 300
            })
        f.node.on(Node.EventType.MOUSE_ENTER,
            () => f.draw({
                fill: withAlpha(C.panel,
                    235), stroke: C.teal, glow: C.teal, chamfer: 16
            }))
        f.node.on(Node.EventType.MOUSE_LEAVE,
            () => f.draw({
                fill: withAlpha(C.panel,
                    215), chamfer: 16
            }))
        f.node.on(Node.EventType.TOUCH_END,
            () => nav.showBuilder(null))
    }

    async function run(action: () => Promise<unknown>, done: string) {
        status.say("Đang lưu…",
            true)
        try {
            await action()
            decks = await listDecks(session!)
            status.say(done,
                true)
        } catch (e) {
            status.say((e as Error).message)
        }
        render()
    }

    function render() {
        clear(grid)
        clear(pager)
        const pages = Math.max(1,
            Math.ceil(decks.length / PER_PAGE))
        page = Math.min(page,
            pages - 1)
        const shown = decks.slice(page * PER_PAGE,
            page * PER_PAGE + PER_PAGE)
        shown.forEach((d, i) => tile(d,
            i))
        newTile(shown.length)
        if (pages < 2) return
        const go = (p: number) => { page = p; render() }
        const prev = new Button(pager,
            "‹",
            60,
            52,
            -(pages + 1) * 39,
            20,
            () => go(page - 1),
            "gold",
            30)
        prev.setEnabled(page > 0)
        for (let i = 0; i < pages; i++) {
            const b = new Button(pager,
                String(i + 1),
                60,
                52,
                (i - (pages - 1) / 2) * 78,
                20,
                () => go(i),
                "gold",
                26)
            b.setSelected(i === page)
        }
        const next = new Button(pager,
            "›",
            60,
            52,
            (pages + 1) * 39,
            20,
            () => go(page + 1),
            "gold",
            30)
        next.setEnabled(page < pages - 1)
        text(pager,
            `Trang ${page + 1} / ${pages}`,
            0,
            -30,
            {
                size: 22, color: C.textMuted, width: 300
            })
    }

    render()
}

/** Xấp lá: hai lá sau nghiêng, lá trước mang tranh bìa */
function fan(parent: Node, cover: string, y: number) {
    const holder = box("Fan",
        parent,
        280,
        320,
        0,
        y)
    for (const [dx, angle] of [[-34,
        12],
    [-18,
        6]] as const) {
        const back = new Frame(holder,
            210,
            290,
            dx,
            -4,
            {
                fill: C.tealDeep, stroke: C.goldDark, inner: null, chamfer: 10
            })
        back.node.angle = angle
    }
    const front = box("Front",
        holder,
        220,
        296,
        14,
        0)
    front.angle = -4
    image(front,
        cover,
        208,
        284)
    new Frame(front,
        220,
        296,
        0,
        0,
        {
            fill: null, stroke: C.gold, line: 3, inner: C.goldDark, chamfer: 10
        })
}
