// Thư viện tướng: lưới chọn tướng bên trái, bên phải là sân đấu 5 đường như trận thật (tướng đang xem ở đường giữa phe mình,
// năm bia địch ở hàng trên). Dưới sân là năm ô chiêu (Nội tại, Q, E, R, Đánh thường); bấm "Phát" thì chiêu diễn hiệu ứng
// lên sân, số sát thương bật ra trên từng bia, xong tất cả trở lại như cũ.
// Số sát thương ở đây là minh hoạ theo công của tướng (hệ số 1.0 / 1.6 / 1.4 / 2.4), không phải kết quả engine.
import {
    Color, Graphics, Label, Node, UIOpacity, Vec3, tween
} from "cc"
import {
    C, withAlpha
} from "../dna/theme"
import {
    cg
} from "../shared"
import {
    Button, Frame, box, clear, panel, rule, text
} from "../ui/kit"
import {
    slot, skillArt
} from "../ui/slot"
import {
    playSkill, skillKey, styleOf
} from "../vfx/registry"
import {
    heroBasicVfx
} from "../vfx/heroMap.gen"
import {
    hasCustom
} from "../vfx/keys"
import {
    topBar
} from "./LobbyScreen"
import type {
    Nav
} from "./nav"

const ROLE: Record<string, string> = {
    fighter: "Đấu sĩ", tank: "Đỡ đòn", assassin: "Sát thủ", marksman: "Xạ thủ", mage: "Pháp sư", support: "Hỗ trợ"
}
const PER_PAGE = 30
const COLS = 5
const PITCH = 112
const GRID_X = -620
const GRID_Y = 322
const BOARD = {
    x: 330, y: 150, w: 1180, h: 480
}
const LANE_X = [-480, -240, 0, 240, 480].map((x) => BOARD.x + x)
const ROW = {
    foe: 268, mine: 38
}
const SKILL_Y = -178
const SLOT = 104
const DUMMY_HP = 1000

type SkillSlot = "p" | "q" | "e" | "r" | "basic"
const SLOTS: { key: SkillSlot; tag: string; mult: number }[] = [
    { key: "p", tag: "Nội tại", mult: 0 },
    { key: "q", tag: "Q", mult: 1.6 },
    { key: "e", tag: "E", mult: 1.4 },
    { key: "r", tag: "R", mult: 2.4 },
    { key: "basic", tag: "Đánh thường", mult: 1 },
]

export function buildHeroGallery(root: Node, nav: Nav, start?: string): () => void {
    const heroes = cg.allHeroes()
    let alive = true
    let busy = false
    let page = 0
    let hero = heroes.find((h) => h.id === start) ?? heroes[0]
    let chosen: SkillSlot = "q"

    topBar(root, nav, "")
    text(root, "Thư viện tướng", -130, 503, { font: "title", size: 34, width: 500 })
    const grid = box("Grid", root, 600, 800, GRID_X, 0)
    const info = box("Info", root, 1200, 400, BOARD.x, 0)

    // ---- sân (khung, rồi tướng, rồi lớp hiệu ứng trên cùng) ----
    panel(root, BOARD.w, BOARD.h, BOARD.x, BOARD.y)
    const units = box("Units", root, 1920, 1080)
    const fx = box("Fx", root, 1920, 1080)
    const hpFill: Graphics[] = []
    const hp = [DUMMY_HP, DUMMY_HP, DUMMY_HP, DUMMY_HP, DUMMY_HP]
    const drawHp = (i: number) => {
        const g = hpFill[i]
        g.clear()
        const w = SLOT + 20
        g.fillColor = withAlpha(C.bg, 220)
        g.rect(-w / 2, 0, w, 10)
        g.fill()
        g.fillColor = C.enemy
        g.rect(-w / 2 + 1, 1, (w - 2) * Math.max(0, hp[i] / DUMMY_HP), 8)
        g.fill()
    }

    const drawBoard = () => {
        clear(units)
        hpFill.length = 0
        const dummies = heroes.filter((h) => h.id !== hero.id).slice(0, 5)
        for (let i = 0; i < 5; i++) {
            const d = dummies[i]
            slot(units, "heroes", d.id, SLOT, LANE_X[i], ROW.foe, { edge: C.enemy })
            text(units, d.name, LANE_X[i], ROW.foe + SLOT / 2 + 18, { size: 18, width: 180, upper: false })
            const bar = box("Hp", units, SLOT + 20, 10, LANE_X[i], ROW.foe - SLOT / 2 - 14)
            hpFill[i] = bar.addComponent(Graphics)
            drawHp(i)
            // Chỗ trống phe mình: ô mờ; tướng đang xem ở đường giữa
            if (i !== 2) slot(units, "heroes", "", SLOT, LANE_X[i], ROW.mine, { edge: C.goldDark, dim: true })
            text(units, `Đường ${i + 1}`, LANE_X[i], BOARD.y, { size: 14, color: C.textMuted, width: 120 })
        }
        slot(units, "heroes", hero.id, SLOT, LANE_X[2], ROW.mine, { edge: C.ally })
        text(units, hero.name, LANE_X[2], ROW.mine - SLOT / 2 - 18, { size: 18, width: 180, upper: false })
    }

    // ---- lưới tướng ----
    const drawGrid = () => {
        clear(grid)
        const slice = heroes.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
        slice.forEach((h, i) => {
            const x = ((i % COLS) - (COLS - 1) / 2) * PITCH
            const y = GRID_Y - Math.floor(i / COLS) * PITCH
            const sel = h.id === hero.id
            const s = slot(grid, "heroes", h.id, 96, x, y, { edge: sel ? C.teal : C.gold, glow: null, dim: !sel && busy })
            s.node.on(Node.EventType.TOUCH_END, () => {
                if (busy) return
                hero = h
                chosen = "q"
                drawGrid()
                drawBoard()
                drawInfo()
            })
        })
        const pages = Math.ceil(heroes.length / PER_PAGE)
        text(grid, `${hero.name}  ·  trang ${page + 1}/${pages}`, 0, -392, { size: 18, color: C.textMuted, width: 520 })
        if (page > 0) new Button(grid, "<", 56, 44, -270, -392, () => { page--; drawGrid() }, "ghost", 22)
        if ((page + 1) * PER_PAGE < heroes.length) new Button(grid, ">", 56, 44, 270, -392, () => { page++; drawGrid() }, "ghost", 22)
    }

    // ---- ô chiêu và mô tả ----
    const nameOf = (k: SkillSlot) => k === "p" ? hero.passive.name : k === "basic" ? "Đánh thường" : hero.skills[k.toUpperCase() as "Q" | "E" | "R"].name
    const descOf = (k: SkillSlot) => k === "p" ? hero.passive.desc : k === "basic"
        ? `Đòn đánh thường gây sát thương ${hero.damage === "physical" ? "vật lý" : "phép"} bằng công (${hero.atk}).`
        : hero.skills[k.toUpperCase() as "Q" | "E" | "R"].desc
    const keyOf = (k: SkillSlot) => k === "basic" ? `basic_${hero.id}` : skillKey(hero.id, k)

    const drawInfo = () => {
        clear(info)
        const cardW = 224
        SLOTS.forEach((s, i) => {
            const x = (i - 2) * (cardW + 12)
            const sel = s.key === chosen
            const f = new Frame(info, cardW, 150, x, SKILL_Y - 0, {
                fill: withAlpha(sel ? C.tealDeep : C.panel, 240), stroke: sel ? C.teal : C.gold, inner: null, chamfer: 0,
            })
            if (s.key === "basic") slot(f.node, "heroes", hero.id, 56, -cardW / 2 + 42, 34, { edge: C.gold })
            else slot(f.node, "skills", skillArt(hero.id, s.key), 56, -cardW / 2 + 42, 34, { edge: sel ? C.teal : C.gold })
            text(f.node, s.tag, 38, 48, { font: "title", size: 22, width: 120, align: "left" })
            text(f.node, nameOf(s.key), 38, 18, { size: 14, color: C.text, width: 120, height: 36, wrap: true, align: "left", upper: false })
            new Button(f.node, "Phát", 190, 40, 0, -44, () => void play(s.key), "primary", 18)
            f.node.on(Node.EventType.TOUCH_END, () => { if (busy) return; chosen = s.key; drawInfo() })
        })
        const tag = SLOTS.find((s) => s.key === chosen)!.tag
        const custom = hasCustom(keyOf(chosen)) ? "hiệu ứng riêng" : "đang dùng một hạt"
        text(info, `${hero.name} · ${ROLE[hero.role] ?? hero.role}  —  Máu ${hero.hp}   Công ${hero.atk}   Giáp ${hero.armor}   Kháng phép ${hero.mr}`,
            0, SKILL_Y - 110, { size: 18, color: C.goldLight, width: 1160 })
        rule(info, 900, 0, SKILL_Y - 132, true, C.gold)
        text(info, `${tag}: ${nameOf(chosen)}  (${custom})`, 0, SKILL_Y - 160, { font: "textMedium", bold: true, size: 22, width: 1160, upper: false })
        text(info, descOf(chosen), 0, SKILL_Y - 218, { size: 18, color: C.text, width: 1120, height: 90, wrap: true, upper: false })
    }

    // ---- phát chiêu ----
    const pop = (at: { x: number; y: number }, value: number, color: Color) => {
        const n = box("Dmg", fx, 200, 60, at.x, at.y)
        const label: Label = text(n, `-${value}`, 0, 0, { font: "number", size: 34, width: 200, color })
        const op = n.addComponent(UIOpacity)
        tween(n).to(0.9, { position: new Vec3(at.x, at.y + 70, 0) }, { easing: "quadOut" }).call(() => n.destroy()).start()
        tween(op).delay(0.5).to(0.4, { opacity: 0 }).start()
        void label
    }

    const play = async (k: SkillSlot) => {
        if (busy || !alive) return
        busy = true
        chosen = k
        drawGrid()
        drawInfo()
        const slotInfo = SLOTS.find((s) => s.key === k)!
        const from = { x: LANE_X[2], y: ROW.mine }
        // Q của Sylas chọn ba đường (đối diện và hai đường kề); các chiêu còn lại đánh bia đối diện
        const lanes = hero.id === "sylas" && k === "q" ? [1, 2, 3] : [2]
        const to = lanes.map((l) => ({ x: LANE_X[l], y: ROW.foe }))
        const style = k === "basic" ? heroBasicVfx(hero.id, hero.damage, hero.role) : styleOf(hero.id, k)
        await playSkill(fx, keyOf(k), style, from, to)
        if (!alive) return
        if (slotInfo.mult > 0) {
            const color = hero.damage === "physical" ? C.goldLight : C.teal
            lanes.forEach((l) => {
                const dmg = Math.round(hero.atk * slotInfo.mult * (hero.id === "sylas" && k === "q" && l === 2 ? 0.7 : 1))
                hp[l] = Math.max(0, hp[l] - dmg)
                drawHp(l)
                pop({ x: LANE_X[l], y: ROW.foe }, dmg, color)
            })
        }
        // Giữ số sát thương một lúc rồi trả sân về như cũ
        await new Promise<void>((resolve) => tween(fx).delay(1.1).call(() => resolve()).start())
        if (!alive) return
        for (let i = 0; i < 5; i++) { hp[i] = DUMMY_HP; drawHp(i) }
        busy = false
        drawGrid()
    }

    new Button(root, "Về sảnh", 220, 52, -800, -470, () => { if (!busy) nav.showLobby() }, "ghost", 22)
    drawGrid()
    drawBoard()
    drawInfo()

    return () => {
        alive = false
        clear(root)
    }
}
