// Thư viện tướng: lưới chọn tướng bên trái, bên phải là sân đấu 5 đường như trận thật (tướng đang xem ở đường giữa phe mình,
// năm bia địch ở hàng trên). Dưới sân là năm ô chiêu (Nội tại, Q, E, R, Đánh thường); bấm "Phát" thì chiêu diễn hiệu ứng
// lên sân, số sát thương bật ra trên từng bia, xong tất cả trở lại như cũ.
// Số sát thương ở đây là minh hoạ theo công của tướng (hệ số 1.0 / 1.6 / 1.4 / 2.4), không phải kết quả engine.
import {
    Color, Graphics, Label, Node, Sprite, UIOpacity, Vec3, tween
} from "cc"
import {
    C, withAlpha
} from "../dna/theme"
import {
    cg
} from "../shared"
import {
    frameOf
} from "../ui/assets"
import {
    Button, Frame, box, clear, rule, text
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
    rayBeats, riftBeats
} from "../vfx/velkoz"
import {
    simulate, type SimDamage
} from "../vfx/sim"
import {
    swapUnits
} from "../vfx/swap"
import {
    AimLine, trackMouse
} from "./match/aim"
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
// Sân dùng đúng ảnh nền và bố cục của trận thật (MatchScreen: ảnh 1095 x 730, hàng địch trên, hàng mình dưới), thu nhỏ SC lần
const SC = 0.74
const BOARD = {
    x: 400, y: 120, w: Math.round(1095 * SC), h: Math.round(730 * SC)
}
const LANE_X = [-430, -214, 0, 211, 425].map((x) => BOARD.x + x * SC)
const ROW = {
    foe: BOARD.y + 207 * SC, mine: BOARD.y - 169 * SC
}
const SKILL_Y = -250
const SLOT = 92

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
    const info = box("Info", root, 1200, 400, 330, 0)

    // ---- sân: ảnh nền thật, 5 tướng địch (hàng trên) và đội mình gồm tướng đang xem cùng 4 đồng đội (hàng dưới) ----
    const boardNode = box("Board", root, BOARD.w, BOARD.h, BOARD.x, BOARD.y)
    void frameOf("bg/board-flat").then((f) => {
        if (!f || !boardNode.isValid) return
        const sp = boardNode.addComponent(Sprite)
        sp.sizeMode = Sprite.SizeMode.CUSTOM
        sp.spriteFrame = f
    })
    new Frame(boardNode, BOARD.w, BOARD.h, 0, 0, { fill: null, stroke: C.gold, inner: null, chamfer: 0 })
    const units = box("Units", root, 1920, 1080)
    const fx = box("Fx", root, 1920, 1080)
    const aimLayer = box("Aim", root, 1920, 1080)
    const hpFill: Graphics[] = []
    const hp = [0, 0, 0, 0, 0]
    const hpMax = [1, 1, 1, 1, 1]
    const BAR = 100
    const drawBar = (g: Graphics, ratio: number, color: Color) => {
        g.clear()
        g.fillColor = C.goldDark
        g.rect(-BAR / 2, -6, BAR, 12)
        g.fill()
        g.fillColor = C.bg
        g.rect(-BAR / 2 + 2, -4, BAR - 4, 8)
        g.fill()
        g.fillColor = color
        g.rect(-BAR / 2 + 2, -4, (BAR - 4) * Math.max(0, ratio), 8)
        g.fill()
    }
    const hpText: Label[] = []
    const foeFrames: Frame[] = []
    const allyFrames: Frame[] = []
    // Tướng đứng ở từng đường phe mình (đường 2 là tướng đang xem); đổi chỗ thì hoán đổi hai phần tử
    let allyOrder: string[] = []
    // Tướng đang xem (đường giữa phe mình): thanh máu riêng để demo hồi máu
    let selfBar: Graphics | null = null
    let selfLabel: Label | null = null
    let selfHp = 1
    let selfMax = 1
    const drawSelf = () => {
        if (!selfBar || !selfLabel) return
        drawBar(selfBar, selfHp / selfMax, C.teal)
        selfLabel.string = `${selfHp} / ${selfMax}`
    }
    // Dòng chú thích tình huống đang demo, đặt trên cùng sân
    const note: Label = text(root, "", BOARD.x, BOARD.y + BOARD.h / 2 - 22, { font: "textMedium", bold: true, size: 18, width: 760, color: C.goldLight, upper: false })
    const sleep = (secs: number) => new Promise<void>((resolve) => tween(fx).delay(secs).call(() => resolve()).start())
    const drawHp = (i: number) => {
        drawBar(hpFill[i], hp[i] / hpMax[i], C.enemy)
        hpText[i].string = `${hp[i]} / ${hpMax[i]}`
    }

    const unit = (id: string, x: number, y: number, side: "ally" | "foe") => {
        const h = cg.getHero(id)!
        const color = side === "ally" ? C.ally : C.enemy
        text(units, h.name, x, y + SLOT / 2 + 14, { font: "textMedium", bold: true, size: 18, width: 150, upper: false })
        const ground = box("Ground", units, 150, 36, x, y - SLOT / 2 + 2).addComponent(Graphics)
        ground.fillColor = withAlpha(side === "ally" ? C.teal : C.enemy, 48)
        ground.ellipse(0, 0, SLOT * 0.62, 12)
        ground.fill()
        const frame = slot(units, "heroes", id, SLOT, x, y, { edge: color })
        const label = text(units, `${h.hp} / ${h.hp}`, x, y - SLOT / 2 - 10, { font: "number", size: 18, width: 150, color: C.goldLight })
        const bar = box("Hp", units, BAR, 12, x, y - SLOT / 2 - 26).addComponent(Graphics)
        return { h, label, bar, frame }
    }

    const drawBoard = () => {
        clear(units)
        hpFill.length = 0
        hpText.length = 0
        const others = heroes.filter((h) => h.id !== hero.id)
        const foes = others.slice(0, 5)
        const mates = others.slice(5, 9)
        if (allyOrder.length !== 5 || !allyOrder.includes(hero.id) || allyOrder.some((id) => id !== hero.id && !mates.some((m) => m.id === id))) {
            allyOrder = [mates[0].id, mates[1].id, hero.id, mates[2].id, mates[3].id]
        }
        for (let i = 0; i < 5; i++) {
            const u = unit(foes[i].id, LANE_X[i], ROW.foe, "foe")
            hpFill[i] = u.bar
            hpText[i] = u.label
            foeFrames[i] = u.frame
            hp[i] = hpMax[i] = u.h.hp
            drawHp(i)
        }
        for (let i = 0; i < 5; i++) {
            const id = allyOrder[i]
            const u = unit(id, LANE_X[i], ROW.mine, "ally")
            allyFrames[i] = u.frame
            drawBar(u.bar, 1, C.teal)
            if (id === hero.id) { selfBar = u.bar; selfLabel = u.label; selfHp = selfMax = u.h.hp }
        }
        note.string = ""
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

    const foePos = (l: number) => ({ x: LANE_X[l], y: ROW.foe })
    const dealt = (l: number, dmg: number, color: Color) => {
        hp[l] = Math.max(0, hp[l] - dmg)
        drawHp(l)
        pop(foePos(l), dmg, color)
    }
    const heal = (value: number) => {
        selfHp = Math.min(selfMax, selfHp + value)
        drawSelf()
        const at = { x: LANE_X[2], y: ROW.mine }
        const n = box("Heal", fx, 200, 60, at.x, at.y)
        text(n, `+${value}`, 0, 0, { font: "number", size: 34, width: 200, color: C.teal })
        const op = n.addComponent(UIOpacity)
        tween(n).to(0.9, { position: new Vec3(at.x, at.y + 70, 0) }, { easing: "quadOut" }).call(() => n.destroy()).start()
        tween(op).delay(0.5).to(0.4, { opacity: 0 }).start()
    }

    /**
     * Chọn mục tiêu như đánh thật: vệt ngắm cong xanh ngọc từ tướng đang xem bám theo chuột, các tướng địch hợp lệ sáng viền,
     * rê vào một tướng thì vệt khoá lại, bấm để chọn; Huỷ thì thôi (trả null).
     */
    // Móc dev: window.__heroPlay(chiêu, đường) phát chiêu và tự chọn mục tiêu ở đường đó, để Playwright chụp trên sân thật
    let autoLane: number | null = null
    const pickTarget = (prompt: string, side: "foe" | "ally" = "foe") => new Promise<number | null>((resolve) => {
        if (autoLane !== null) {
            const t = autoLane
            autoLane = null
            resolve(t)
            return
        }
        note.string = prompt
        const aim = new AimLine(aimLayer)
        const myLane = allyOrder.indexOf(hero.id)
        const origin = { x: LANE_X[myLane], y: ROW.mine }
        aim.show(origin)
        // đồng minh: mọi đường phe mình trừ tướng đang xem
        const lanes = [0, 1, 2, 3, 4].filter((l) => side === "foe" || l !== myLane)
        const posOfLane = (l: number) => side === "foe" ? foePos(l) : { x: LANE_X[l], y: ROW.mine }
        const frames = side === "foe" ? foeFrames : allyFrames
        const points = lanes.map(posOfLane)
        const stop = trackMouse(root, (p) => {
            const hit = points.find((q) => Math.hypot(q.x - p.x, q.y - p.y) < 70)
            aim.moveTo(hit ?? p, !!hit)
        })
        const hold = box("TargetHold", root, 240, 56, BOARD.x, BOARD.y - BOARD.h / 2 + 34)
        const done = (v: number | null) => {
            stop()
            aim.destroy()
            hold.destroy()
            lanes.forEach((l) => frames[l].node.off(Node.EventType.TOUCH_END))
            resolve(v)
        }
        lanes.forEach((l) => {
            frames[l].draw({ fill: withAlpha(C.panelRaised, 245), stroke: C.teal, inner: null, glow: C.teal, chamfer: 6 })
            frames[l].node.on(Node.EventType.TOUCH_END, () => done(l))
        })
        new Button(hold, "Huỷ", 200, 44, 0, 0, () => done(null), "ghost", 18)
    })

    /** Bảng chọn chiêu cuối của địch để cướp (giống hộp thoại cướp chiêu trong trận): 5 địch, mỗi người một chiêu R */
    const pickSteal = () => new Promise<number | null>((resolve) => {
        const veil = box("StealVeil", root, 1920, 1080)
        const g = veil.addComponent(Graphics)
        g.fillColor = withAlpha(C.bg, 200)
        g.rect(-960, -540, 1920, 1080)
        g.fill()
        const frame = new Frame(veil, 1120, 420, BOARD.x, BOARD.y - 20)
        text(frame.node, "Đoạt Chiêu: chọn chiêu cuối của địch để cướp", 0, 165, { font: "textMedium", bold: true, size: 22, width: 1000, upper: false })
        text(frame.node, "Sylas dùng chiêu này ngay, như của mình, rồi nhả lại sau lượt.", 0, 130, { size: 14, color: C.textMuted, width: 1000, upper: false })
        const others = heroes.filter((h) => h.id !== hero.id).slice(0, 5)
        others.forEach((h, i) => {
            const x = (i - 2) * 210
            const card = new Frame(frame.node, 190, 250, x, -10, { fill: withAlpha(C.panel, 245), stroke: C.gold, inner: null, chamfer: 0 })
            slot(card.node, "skills", skillArt(h.id, "r"), 110, 0, 60, { edge: C.gold })
            text(card.node, h.skills.R.name, 0, -30, { font: "textMedium", bold: true, size: 14, width: 170, height: 40, wrap: true, upper: false })
            text(card.node, h.name, 0, -70, { size: 14, color: C.textMuted, width: 170, upper: false })
            new Button(card.node, "Cướp", 150, 40, 0, -105, () => { veil.destroy(); resolve(i) }, "primary", 18)
        })
        new Button(frame.node, "Huỷ", 160, 44, 0, -180, () => { veil.destroy(); resolve(null) }, "ghost", 18)
    })

    const KIND_COLOR: Record<string, Color> = { physical: C.goldLight, magic: C.teal, true: new Color(255, 255, 255, 255) }

    const play = async (k: SkillSlot) => {
        if (busy || !alive) return
        busy = true
        // Móc kiểm thử tự động: cho biết demo đang chạy hay đã trả sân về như cũ
        ;(globalThis as unknown as { __galleryBusy?: boolean }).__galleryBusy = true
        chosen = k
        drawGrid()
        drawInfo()
        const from = { x: LANE_X[2], y: ROW.mine }
        const others = heroes.filter((h) => h.id !== hero.id)
        const foes = others.slice(0, 5).map((h) => h.id)
        const mates = others.slice(5, 9).map((h) => h.id)
        const style = k === "basic" ? heroBasicVfx(hero.id, hero.damage, hero.role) : styleOf(hero.id, k)
        const reset = () => {
            for (let i = 0; i < 5; i++) { hp[i] = hpMax[i]; drawHp(i) }
            selfHp = selfMax
            drawSelf()
            note.string = ""
            allyOrder = []
            drawBoard()
            busy = false
            ;(globalThis as unknown as { __galleryBusy?: boolean }).__galleryBusy = false
            drawGrid()
        }
        if (k === "p") {
            // Nội tại không có sát thương trực tiếp: chỉ diễn hiệu ứng
            await playSkill(fx, keyOf(k), style, from, [foePos(2)])
            if (!alive) return
            reset()
            return
        }
        // Chiêu nhắm 1 tướng địch (Q/E/R có target enemy, hoặc đánh thường): chọn mục tiêu như đánh thật
        const def = k === "q" || k === "e" || k === "r" ? hero.skills[k.toUpperCase() as "Q" | "E" | "R"] : null
        const isSteal = hero.id === "sylas" && k === "r"
        const kinds = def === null ? [] : Array.isArray(def.target) ? def.target : [def.target]
        // Sylas E đánh thẳng mặt (không chọn); chiêu nhắm đồng minh (Sylas Q đổi chỗ...) chọn trong phe mình
        const needsAlly = def !== null && !isSteal && (kinds.includes("ally") || kinds.includes("ally_other")) && !kinds.includes("enemy")
        const needsTarget = !needsAlly && !isSteal && !(hero.id === "sylas" && k === "e") && (k === "basic" || kinds.includes("enemy"))
        let lane: number | undefined
        let allyId: string | undefined
        let allyLane: number | undefined
        if (needsAlly) {
            const t = await pickTarget("Chọn đồng minh: rê chuột vào một đồng minh rồi bấm", "ally")
            if (t === null || !alive) { reset(); return }
            allyLane = t
            allyId = allyOrder[t]
            lane = t
        } else if (hero.id === "sylas" && k === "e") {
            lane = allyOrder.indexOf(hero.id)
        } else if (needsTarget) {
            const t = await pickTarget("Chọn mục tiêu hợp lệ: rê chuột vào một tướng địch rồi bấm")
            if (t === null || !alive) { reset(); return }
            lane = t
            drawBoard()
        }
        const myLane = allyOrder.indexOf(hero.id)
        let steal: string | undefined
        let stealLane = 0
        if (isSteal) {
            note.string = "Sylas cướp chiêu cuối của một tướng địch"
            const pick = await pickSteal()
            if (pick === null || !alive) { reset(); return }
            steal = foes[pick]
            stealLane = pick
        }
        // Tình huống có chủ đích: Sylas húc E khi đang mất máu
        const lowHp = hero.id === "sylas" && k === "e"
        if (lowHp) {
            selfHp = Math.round(selfMax * 0.35)
            drawSelf()
            note.string = `Sylas chỉ còn 35% máu (${selfHp}/${selfMax}): húc để gây sát thương phép và hồi theo máu đã mất`
            await sleep(0.9)
        } else note.string = ""

        // Số sát thương và hồi máu lấy từ ENGINE thật qua mô phỏng
        const sim = simulate({
            hero: hero.id, key: k === "basic" ? "basic" : (k.toUpperCase() as "Q" | "E" | "R"), mates, foes, lane: needsAlly ? undefined : lane, steal, ally: allyId, selfHp: lowHp ? 0.35 : undefined,
        })
        if (!sim.ok) {
            note.string = "Chiêu này không dùng được ở thế cờ demo"
            await sleep(1.2)
            if (alive) reset()
            return
        }
        const now = sim.damage.filter((d) => d.phase === 0)
        const later = sim.damage.filter((d) => d.phase === 1)
        const skillHits = now.filter((d) => d.tag === "skill")
        const uniqueLanes = (list: SimDamage[]) => [...new Set(list.map((d) => d.lane))]
        let targets = [foePos(lane ?? 2)]
        if (hero.id === "velkoz" && k === "q" && lane !== undefined) targets = [lane, ...uniqueLanes(skillHits).filter((l) => l !== lane)].map(foePos)
        else if (hero.id === "velkoz" && k === "e" && lane !== undefined) targets = [lane, ...uniqueLanes(skillHits).filter((l) => l !== lane)].map(foePos)
        else if (hero.id === "velkoz" && k === "r") targets = skillHits.map((d) => foePos(d.lane))
        else if (isSteal) targets = [foePos(stealLane)]
        else if (needsAlly && allyLane !== undefined) {
            // Sylas Q: đồng minh bị đổi chỗ, rồi tướng địch đối diện ô đồng minh ăn đòn
            targets = [{ x: LANE_X[allyLane], y: ROW.mine }, ...uniqueLanes(skillHits).map(foePos)]
        }
        const extra = needsAlly && allyId ? { allyHero: allyId } : {}
        // Chiêu có đổi chỗ (engine phát sự kiện move): hoán đổi vị trí thật trên sân demo sau khi diễn
        const moved = sim.moves[0]
        const swapOnBoard = () => {
            if (!moved) return
            const a = allyOrder[moved.from]
            allyOrder[moved.from] = allyOrder[moved.to]
            allyOrder[moved.to] = a
            drawBoard()
        }
        const showHit = (d: SimDamage) => dealt(d.lane, d.amount, KIND_COLOR[d.kind] ?? C.goldLight)

        if (hero.id === "velkoz" && k === "r") {
            // R: mỗi tia báo nhịp đúng lúc chạm (onBeat), số của tia đó bật ngay lúc ấy
            note.string = `R: bắn ngẫu nhiên tổng ${skillHits.length} tia, mỗi tia vào một tướng địch bất kỳ`
            const beats = rayBeats(now)
            await playSkill(fx, keyOf(k), style, from, targets, { onBeat: (i) => { for (const d of beats[i] ?? []) showHit(d) } })
        } else if (isSteal) {
            const victim = cg.getHero(steal!)!
            await playSkill(fx, keyOf(k), style, from, targets)
            if (!alive) return
            note.string = `Sylas đã cướp «${victim.skills.R.name}» của ${victim.name} và thi triển lại`
            await sleep(0.4)
            const hitLanes = uniqueLanes(now).map(foePos)
            await playSkill(fx, skillKey(victim.id, "r"), styleOf(victim.id, "r"), from, hitLanes.length ? hitLanes : [foePos(2)])
            if (!alive) return
            for (const d of now) showHit(d)
        } else if (hero.id === "velkoz" && k === "e") {
            // E: cú khe mở và cú nổ hiện số đúng nhịp VFX báo (onBeat), không hẹn giờ đoán
            note.string = "E: khe rách cắt ngang 3 đường, cả 3 nhận như nhau rồi nổ ngay theo % máu đã mất"
            const beats = riftBeats(now)
            await playSkill(fx, keyOf(k), style, from, targets, { onBeat: (i) => { for (const d of beats[i] ?? []) showHit(d) } })
        } else if (later.length) {
            // Chiêu có nhịp cuối lượt (Vel'Koz E): nhịp đầu nổ giữa chừng, nhịp hai khi hiệu ứng rách toạc lần hai
            note.string = hero.id === "velkoz" ? "E: khe nứt cắt ngang 3 đường, nổ ngay; cuối lượt nổ thêm một lần" : "Chiêu có sát thương kéo dài: gây đòn ngay, cuối lượt gây thêm"
            const fxp = playSkill(fx, keyOf(k), style, from, targets)
            await sleep(0.8)
            for (const d of now) showHit(d)
            note.string = hero.id === "velkoz" ? "Cuối lượt: khe rách toạc nổ lần hai" : "Cuối lượt: nhận thêm sát thương kéo dài"
            await fxp
            if (!alive) return
            for (const d of later) showHit(d)
        } else {
            await playSkill(fx, keyOf(k), style, from, targets, extra)
            if (!alive) return
            if (moved) {
                // Sylas Q tự diễn đổi chỗ trong hiệu ứng; các chiêu khác dùng hiệu ứng đổi chỗ chung: bay lên, dậm đất, người kia trượt ngang
                if (!(hero.id === "sylas" && k === "q")) {
                    const a = allyOrder[moved.from]
                    const b = allyOrder[moved.to]
                    await swapUnits(fx, { hero: a, pos: { x: LANE_X[moved.from], y: ROW.mine } }, { hero: b, pos: { x: LANE_X[moved.to], y: ROW.mine } })
                }
                swapOnBoard()
            }
            for (const d of now) showHit(d)
        }
        if (!alive) return
        const healed = sim.heals.reduce((n, h) => n + h.amount, 0)
        if (healed > 0) heal(healed)
        // Giữ số sát thương một lúc rồi trả sân về như cũ
        await sleep(1.3)
        if (!alive) return
        reset()
    }

    new Button(root, "Về sảnh", 220, 52, -800, -470, () => { if (!busy) nav.showLobby() }, "ghost", 22)
    ;(globalThis as unknown as { __heroPlay?: (k: SkillSlot, lane?: number) => Promise<void> }).__heroPlay = async (k, lane = 2) => {
        if (busy || !alive) return
        autoLane = lane
        await play(k)
        autoLane = null
    }
    drawGrid()
    drawBoard()
    drawInfo()

    return () => {
        alive = false
        clear(root)
    }
}
