// Màn xem thử VFX cho dev (giống trang /vfx của bản web): hàng tab theo tướng, lưới khoá của tướng đó; chọn một khoá thì
// phát playSkill từ điểm trái sang 1 hoặc 3 mục tiêu bên phải; "Phát tất cả" chạy lần lượt. Dấu * = có hiệu ứng riêng.
import {
    Node
} from "cc"
import {
    cg
} from "../shared"
import {
    C, at
} from "../dna/theme"
import {
    Button, box, clear, text
} from "../ui/kit"
import {
    allSkillKeys, hasCustom, type VfxKeyInfo
} from "../vfx/keys"
import {
    playSkill, type Pt
} from "../vfx/registry"

const COLS = 3
const CELL = {
    w: 440, h: 54, dx: 450, dy: 62
}
const TAB_PER = 12
const FROM: Pt = {
    x: -700, y: -230
}
const TARGETS: Pt[] = [
    {
        x: 600, y: -130
    },
    {
        x: 700, y: -230
    },
    {
        x: 600, y: -330
    },
]

export function buildVfxGallery(root: Node, onBack: () => void): () => void {
    const all = allSkillKeys()
    // "" gom các phép bổ trợ (không có tướng)
    const groups = [...new Set(all.map((k) => k.hero ?? ""))]
    let alive = true
    let group = groups[0] ?? ""
    let selected: VfxKeyInfo | null = null
    let triple = false
    let playToken = 0
    let allToken = 0
    let tabPage = 0

    text(root,
        "Xem thử VFX",
        0,
        at(0,
            50).y,
        {
            font: "titleMedium", size: 56, width: 700
        })
    const tabs = box("Tabs",
        root,
        1920,
        100,
        0,
        at(0,
            130).y)
    const list = box("List",
        root,
        1920,
        400,
        0,
        0)
    const stage = box("Stage",
        root,
        1920,
        1080)
    const fxLayer = box("FxLayer",
        root,
        1920,
        1080)
    const status = text(root,
        "",
        0,
        -380,
        {
            size: 26, color: C.goldLight, width: 1600
        })

    for (const p of [FROM, ...TARGETS]) {
        text(stage,
            "o",
            p.x,
            p.y,
            {
                size: 40, color: p === FROM ? C.ally : C.enemy, width: 60
            })
    }

    const play = async (info: VfxKeyInfo) => {
        const id = ++playToken
        selected = info
        draw()
        const kind = hasCustom(info.key) ? "hiệu ứng riêng" : "đang dùng một hạt"
        status.string = `${info.label} [${info.key}] - ${kind}`
        await playSkill(fxLayer,
            info.key,
            info.style,
            FROM,
            triple ? TARGETS : [TARGETS[1]])
        if (alive && id === playToken) status.string = `${status.string} - xong`
    }

    const playAll = async () => {
        const id = ++allToken
        for (const info of all.filter((k) => (k.hero ?? "") === group)) {
            if (!alive || id !== allToken) return
            await play(info)
        }
    }

    function draw() {
        clear(list)
        const items = all.filter((k) => (k.hero ?? "") === group)
        const x0 = -(COLS - 1) * CELL.dx / 2
        items.forEach((info, i) => {
            const sel = selected?.key === info.key
            const b = new Button(list,
                `${hasCustom(info.key) ? "* " : ""}${info.label}`,
                CELL.w,
                CELL.h,
                x0 + (i % COLS) * CELL.dx,
                150 - Math.floor(i / COLS) * CELL.dy,
                () => { allToken++; void play(info) },
                sel ? "primary" : "gold",
                17)
            b.setSelected(sel)
        })
        const custom = items.filter((k) => hasCustom(k.key)).length
        text(list,
            `${groupName(group)}: ${custom}/${items.length} khoá có hiệu ứng riêng (dấu *), còn lại dùng một hạt`,
            0,
            210,
            {
                size: 22, color: C.textMuted, width: 1400
            })
    }

    const groupName = (g: string) => g === "" ? "Phép bổ trợ" : cg.getHero(g)?.name ?? g

    function drawTabs() {
        clear(tabs)
        const slice = groups.slice(tabPage * TAB_PER,
            (tabPage + 1) * TAB_PER)
        slice.forEach((g, i) => {
            const b = new Button(tabs,
                groupName(g),
                140,
                40,
                (i - (slice.length - 1) / 2) * 148,
                0,
                () => {
                    group = g
                    selected = null
                    drawTabs()
                    draw()
                },
                "tab",
                18)
            b.setSelected(g === group)
        })
        if (tabPage > 0) {
            new Button(tabs,
                "<",
                50,
                40,
                -920,
                0,
                () => { tabPage--; drawTabs() },
                "ghost",
                20)
        }
        if ((tabPage + 1) * TAB_PER < groups.length) {
            new Button(tabs,
                ">",
                50,
                40,
                920,
                0,
                () => { tabPage++; drawTabs() },
                "ghost",
                20)
        }
    }

    const bottom = -450
    const targetBtn = new Button(root,
        "1 mục tiêu",
        220,
        56,
        -400,
        bottom,
        () => {
            triple = !triple
            targetBtn.setText(triple ? "3 mục tiêu" : "1 mục tiêu")
            if (selected) void play(selected)
        },
        "gold",
        22)
    new Button(root,
        "Phát lại",
        220,
        56,
        -150,
        bottom,
        () => { if (selected) void play(selected) },
        "gold",
        22)
    new Button(root,
        "Phát tất cả",
        260,
        56,
        120,
        bottom,
        () => { void playAll() },
        "primary",
        22)
    new Button(root,
        "Quay lại",
        220,
        56,
        390,
        bottom,
        onBack,
        "ghost",
        22)

    drawTabs()
    draw()

    return () => {
        alive = false
        allToken++
        playToken++
        clear(root)
    }
}
