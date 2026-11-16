// VFX Yorick trên Cocos, chuẩn chung "mọi tướng một bản" (mẫu Vel'Koz, công cụ kit.ts): HỒN MA QUẦN ĐẢO BÓNG ĐÊM. Lửa hồn xanh
// ngọc lõi trắng, sương đen, đất mộ, sắt rỉ. VFX_RULES §0.1 (thầy chốt 2026-11-16): không cục đất vụn, không vảy cứng, không
// khe nứt tối gấp khúc; thay bằng tia lửa hồn mảnh, bụi hồn sáng, khói mộ mềm, vũng lửa hồn sáng trên đất. Hình khối (xẻng, hồn,
// lá bài cháy, tay ghoul, Ma Sương) vẽ bằng Graphics ba lớp: quầng cộng màu phía sau, thân hoà thường (sắt, gỗ, sương đen),
// viền lửa hồn cộng màu phía trước.
// Mỗi ô lấy ý từ đâu:
// - basic_yorick: cú phang xẻng của Yorick gốc: xẻng bổ xuống, mộ bật tung thành tia lửa hồn và bụi hồn sáng, vòng hồn nhỏ.
// - yorick_p (Người Đào Mộ): icon ghoul bò lên từ mộ trong ánh xanh ngọc. Đòn trúng: một hồn bị giật khỏi mục tiêu bay về Yorick, lá
//   trên cùng Bộ bài đối thủ cháy lửa hồn; đất dưới chân Yorick mở hố, hai bàn tay ghoul cào lên đón hồn (Hồn Ma), giáp hồn sáng.
// - yorick_q (Nghi Thức Cuối): icon cái xẻng lửa hồn. Xẻng cháy lửa hồn bổ xuống tướng đối diện, tia lửa hồn tung, vũng hồn
//   sáng trên đất, hồn bốc bay về Yorick thành ánh hồi (hồi Máu).
// - yorick_e (Sương Sầu): icon làn sương đen cuộn sóng. Đốt một lá bộ bài; khối sương đen viền hồn vồng tới mục tiêu, vỡ loang,
//   tia lửa rỉ mảnh toé khỏi mục tiêu (Rã Giáp), sương xoáy lại.
// - yorick_r (Khúc Ai Ca): lấy ý màu xanh ngọc và sương đen của icon, hình khối nguyên bản (không vẽ dáng nhân vật): sương đen tụ ở
//   ô phụ, cột Sương Hồn xoắn dựng dần từ chân lên, đỉnh là lưỡi lửa hồn, hồn bay vòng quanh.
import {
    Graphics, Node
} from "cc"
import {
    angleOf, burst, ease, emit, lerp, mix, over, rand, type Pt
} from "./particles"
import {
    registerSkillVfx, type VfxCtx
} from "./registry"
import {
    canvas, charge, col, dust, groundWave, impact, seeded, strip, TAU, UP, type Palette
} from "./kit"
import {
    rowsOf, type Rows
} from "./g1_helpers"

const WHITE = 0xf0fffa
const PALE = 0xd2fff2
const SOUL = 0x4dffd2
const GHOST = 0x1fd9b6
const DEEP = 0x0f6a6a
const INK = 0x06161d
const SOOT = 0x0d2a30
const IRON = 0x3a4448
const IRON_LIT = 0x8fa8a6
const RUST_LIT = 0xa8744a
const DIRT_DARK = 0x2a2018
const WOOD = 0x5a3c22
const CARD = 0x1c2a3a
const CARD_RIM = 0xc8a24a
const HEAL = 0x7dffc0

/** Lửa hồn: lõi trắng ngọc, xanh ngọc, sâu lục thẫm */
const SOULP: Palette = {
    core: WHITE, main: GHOST, deep: DEEP, accent: SOUL, dust: [SOUL, GHOST, PALE]
}
/** Hồi Máu (hồn thấm vào Yorick): lục ngọc dịu, lõi trắng */
const MEND: Palette = {
    core: 0xeafff4, main: HEAL, deep: 0x0d5a3a, accent: 0xc8ffe4, dust: [HEAL, 0xc8ffe4, 0xffffff]
}

const DOWN = -UP
const at = (p: Pt, dx: number, dy: number): Pt => ({
    x: p.x + dx, y: p.y + dy
})
const mainOf = (ctx: VfxCtx): Pt => ctx.to[0] ?? at(ctx.from, 0, 300)
/** Bộ bài đối thủ: mép phải hàng địch */
const enemyDeck = (rows: Rows): Pt => at(rows.foe[4], rows.spacing * 0.85, rows.up * 60)

// ---------- hình khối ----------

/** Ba lớp vẽ: quầng cộng màu phía sau, thân hoà màu thường, viền sáng cộng màu phía trước */
function layers(layer: Node) {
    const back = canvas(layer)
    const body = canvas(layer, false)
    const front = canvas(layer)
    return {
        back: back.g, body: body.g, front: front.g,
        clear: () => { back.g.clear(); body.g.clear(); front.g.clear() },
        done: () => { back.done(); body.done(); front.done() },
    }
}
type Layers = ReturnType<typeof layers>

/** Vệt quét liềm (cung tâm `c`, bán kính `r`, dẹt `sq`) từ a0 tới a1; `head` 0..1 mũi, `tail` độ dài vệt, `w` bề dày */
function crescent(g: Graphics, c: Pt, r: number, a0: number, a1: number, head: number, tail: number, w: number, p: Palette, alpha: number, seed: number, sq = 1) {
    const u0 = Math.max(0, head - tail)
    if (head - u0 < 0.004 || alpha <= 0.01) return
    const rnd = seeded(seed)
    const N = 30
    const outer: Pt[] = [], inner: Pt[] = []
    for (let i = 0; i <= N; i++) {
        const s = i / N
        const a = lerp(a0, a1, lerp(u0, head, s))
        const t = w * Math.pow(s, 0.8) * Math.min(1, (1 - s) * 9 + 0.2) * (0.7 + rnd() * 0.6)
        outer.push({ x: c.x + Math.cos(a) * (r + t * 0.12), y: c.y + Math.sin(a) * (r + t * 0.12) * sq })
        inner.push({ x: c.x + Math.cos(a) * (r - t), y: c.y + Math.sin(a) * (r - t) * sq })
    }
    const band = (f: number, color: number, a: number) => {
        g.fillColor = col(color, a * alpha)
        g.moveTo(outer[0].x, outer[0].y)
        for (const q of outer) g.lineTo(q.x, q.y)
        for (let i = N; i >= 0; i--) g.lineTo(lerp(outer[i].x, inner[i].x, f), lerp(outer[i].y, inner[i].y, f))
        g.close()
        g.fill()
    }
    band(1.35, p.deep, 0.22)
    band(1, p.main, 0.34)
    band(0.6, p.main, 0.58)
    band(0.28, p.accent, 0.85)
    for (const [lw, color, a] of [[3.2, p.accent, 0.55], [1.4, p.core, 1]] as const) {
        g.lineWidth = lw
        g.strokeColor = col(color, a * alpha)
        g.moveTo(outer[0].x, outer[0].y)
        for (const q of outer) g.lineTo(q.x, q.y)
        g.stroke()
    }
}

/**
 * Xẻng mộ: đầu cán chữ T tại `butt`, `ang` hướng từ cán ra lưỡi, dài `len`. Cán gỗ nẹp sắt, lưỡi sắt đen hơi khum có mũi nhọn,
 * mặt hứng sáng sáng hơn, vết sứt mép; `heat` 0..1: lửa hồn bám mép lưỡi.
 */
function shovel(L: Layers, butt: Pt, ang: number, len: number, alpha: number, heat: number) {
    if (alpha <= 0.01) return
    const dx = Math.cos(ang), dy = Math.sin(ang)
    const nx = -dy, ny = dx
    const P = (u: number, v: number): Pt => ({ x: butt.x + dx * len * u + nx * len * v, y: butt.y + dy * len * u + ny * len * v })
    const poly = (g: Graphics, uv: [number, number][], color: number, a: number) => {
        g.fillColor = col(color, a * alpha)
        const q0 = P(...uv[0])
        g.moveTo(q0.x, q0.y)
        for (const [u, v] of uv) { const q = P(u, v); g.lineTo(q.x, q.y) }
        g.close()
        g.fill()
    }
    const blade: [number, number][] = [[0.64, 0.13], [0.9, 0.15], [0.97, 0.1], [1.04, 0], [0.97, -0.1], [0.9, -0.15], [0.64, -0.13]]
    if (heat > 0.01) {
        const m = P(0.84, 0)
        L.back.fillColor = col(DEEP, 0.3 * heat * alpha)
        L.back.circle(m.x, m.y, len * 0.32)
        L.back.fill()
        L.back.fillColor = col(GHOST, 0.22 * heat * alpha)
        L.back.circle(m.x, m.y, len * 0.2)
        L.back.fill()
    }
    // cán gỗ, nẹp sắt, tay cầm chữ T
    strip(L.body, P(0, 0), P(0.66, 0), len * 0.05, col(WOOD, alpha))
    for (const u of [0.18, 0.45]) strip(L.body, P(u, 0), P(u + 0.03, 0), len * 0.064, col(IRON, alpha))
    strip(L.body, P(0, 0.09), P(0, -0.09), len * 0.05, col(WOOD, alpha))
    // lưỡi: thân sắt đen, nửa hứng sáng, gờ giữa
    poly(L.body, blade, IRON, 1)
    poly(L.body, [[0.66, 0.11], [0.9, 0.13], [0.96, 0.08], [1.0, 0], [0.66, 0]], IRON_LIT, 0.55)
    strip(L.body, P(0.62, 0), P(0.94, 0), len * 0.02, col(INK, 0.8 * alpha))
    // mép lưỡi: lửa hồn
    for (const [lw, c, a] of [[5, GHOST, 0.3 * heat], [2, SOUL, 0.4 + 0.5 * heat], [1, WHITE, 0.4 + 0.6 * heat]] as const) {
        L.front.lineWidth = lw
        L.front.strokeColor = col(c, a * alpha)
        const q0 = P(...blade[1])
        L.front.moveTo(q0.x, q0.y)
        for (const e of blade.slice(2, 6)) { const q = P(...e); L.front.lineTo(q.x, q.y) }
        L.front.stroke()
    }
}

/** Lưỡi lửa bốc lên từ dải chân `base` rộng `wid`, cao `h`; mỗi lưỡi lệch, đung đưa theo pha riêng (seed) */
function flames(g: Graphics, base: Pt, wid: number, h: number, t: number, seed: number, p: Palette, alpha: number, n = 9, sq = 0.4) {
    const rnd = seeded(seed)
    for (let i = 0; i < n; i++) {
        const ang = rnd() * TAU
        const x0 = base.x + Math.cos(ang) * wid * 0.5 * (0.4 + rnd() * 0.6)
        const y0 = base.y + Math.sin(ang) * wid * 0.5 * sq
        const ph = rnd() * TAU
        const H = h * (0.45 + rnd() * 0.6) * (0.82 + 0.18 * Math.sin(t * 21 + ph * 2))
        const sway = Math.sin(t * 13 + ph) * H * 0.18
        const bw = wid * 0.09 * (0.7 + rnd() * 0.6)
        for (const [k, c, a] of [[1.7, p.deep, 0.22], [1, p.main, 0.5], [0.55, p.accent, 0.75], [0.25, p.core, 0.9]] as const) {
            const hh = H * (0.5 + 0.5 * Math.min(1, k))
            g.fillColor = col(c, a * alpha)
            g.moveTo(x0 - bw * k, y0)
            g.quadraticCurveTo(x0 - bw * k * 0.5 + sway * 0.3, y0 + hh * 0.55, x0 + sway, y0 + hh)
            g.quadraticCurveTo(x0 + bw * k * 0.7 + sway * 0.6, y0 + hh * 0.45, x0 + bw * k, y0)
            g.close()
            g.fill()
        }
    }
}

/** Hồn: đầu tròn sáng tại `p` bay theo hướng `dir`, đuôi gợn dài phía sau (gợn lệch theo seed, chạy theo `t`) */
function wisp(g: Graphics, p: Pt, dir: number, r: number, t: number, seed: number, alpha: number) {
    const rnd = seeded(seed)
    const ph = rnd() * TAU
    const bx = -Math.cos(dir), by = -Math.sin(dir)
    const nx = -by, ny = bx
    const N = 10
    for (const [w, c, a] of [[r * 1.6, DEEP, 0.3], [r, GHOST, 0.55], [r * 0.5, SOUL, 0.85], [r * 0.2, WHITE, 1]] as const) {
        g.lineWidth = Math.max(0.8, w)
        g.strokeColor = col(c, a * alpha)
        for (let i = 0; i <= N; i++) {
            const u = i / N
            const s = Math.sin(u * 7 - t * 18 + ph) * r * 0.8 * u
            const q = { x: p.x + bx * r * 5 * u + nx * s, y: p.y + by * r * 5 * u + ny * s }
            if (i === 0) g.moveTo(q.x, q.y)
            else g.lineTo(q.x, q.y)
        }
        g.stroke()
    }
    for (const [k, c, a] of [[1.4, GHOST, 0.4], [0.9, SOUL, 0.8], [0.5, WHITE, 1]] as const) {
        g.fillColor = col(c, a * alpha)
        g.circle(p.x, p.y, r * k)
        g.fill()
    }
}

/**
 * Mộ bật tung (VFX_RULES §0.1: không cục đất vụn): tia lửa hồn mảnh văng về `ang` ± `spread` rồi rơi, bụi hồn sáng bay lên, khói
 * mộ mềm loang.
 */
function graveBurst(layer: Node, p: Pt, n: number, ang: number, spread: number, speed: [number, number] = [140, 380]) {
    void burst(layer, p, n, {
        color: [WHITE, PALE, SOUL, GHOST], kind: "blade", life: [0.16, 0.38], size: [14, 2], alpha: 1, speed: [speed[0] * 1.4, speed[1] * 1.4],
        angle: [ang - spread, ang + spread], drag: 1.6, gravity: -900, align: true, stretch: 2.8, spread: 6
    })
    void burst(layer, p, Math.round(n * 0.6), {
        color: SOULP.dust!, kind: "dot", life: [0.4, 0.8], size: [5, 1], alpha: 0.9, speed: [30, 110],
        angle: [UP - 1, UP + 1], drag: 1.3, gravity: 50, spread: 10
    })
    void burst(layer, p, Math.round(n * 0.3), {
        color: [DIRT_DARK, SOOT], kind: "glow", additive: false, life: [0.5, 0.9], size: [30, 80], alpha: 0.35, speed: [20, 60],
        angle: [ang - spread, ang + spread], drag: 1.4, spread: 12
    })
}

/** Một lá bài rời đỉnh Bộ bài đối thủ, bay lên và cháy lửa hồn từ đáy lên tới khi thành tro (chạy nền) */
async function burnCard(layer: Node, deck: Pt, seed: number) {
    const L = layers(layer)
    const tilt = rand(-0.4, 0.4)
    await over(layer, 0.6, (t) => {
        L.clear()
        const c = at(deck, Math.sin(t * 3) * 10, ease.out(Math.min(1, t * 2)) * 60)
        const burnt = ease.in(Math.min(1, t * 1.15))
        const w = 30, h = 42
        const rot = tilt * t
        const cs = Math.cos(rot), sn = Math.sin(rot)
        const P = (x: number, y: number): Pt => ({ x: c.x + x * cs - y * sn, y: c.y + x * sn + y * cs })
        const rnd = seeded(seed)
        const yb = -h / 2 + h * burnt
        // mép cháy răng cưa
        const edge: Pt[] = []
        for (let i = 0; i <= 8; i++) edge.push(P(-w / 2 + w * i / 8, yb + (rnd() - 0.5) * 6))
        if (burnt < 1) {
            L.body.fillColor = col(CARD, 1)
            const tl = P(-w / 2, h / 2), tr = P(w / 2, h / 2)
            L.body.moveTo(tl.x, tl.y)
            L.body.lineTo(tr.x, tr.y)
            for (let i = edge.length - 1; i >= 0; i--) L.body.lineTo(edge[i].x, edge[i].y)
            L.body.close()
            L.body.fill()
            L.front.lineWidth = 1.2
            L.front.strokeColor = col(CARD_RIM, 0.8)
            L.front.moveTo(edge[0].x, edge[0].y)
            const a = P(-w / 2 + 3, h / 2 - 3), b = P(w / 2 - 3, h / 2 - 3)
            L.front.moveTo(a.x, a.y)
            L.front.lineTo(b.x, b.y)
            L.front.stroke()
            for (const [lw, cc, al] of [[6, GHOST, 0.4], [2.2, SOUL, 0.9], [1, WHITE, 1]] as const) {
                L.front.lineWidth = lw
                L.front.strokeColor = col(cc, al)
                L.front.moveTo(edge[0].x, edge[0].y)
                for (const q of edge) L.front.lineTo(q.x, q.y)
                L.front.stroke()
            }
            flames(L.back, mix(edge[0], edge[8], 0.5), w * 1.1, 20, t, seed, SOULP, 0.8, 5, 0.2)
        }
        if (Math.random() < 0.7) emit(layer, edge[Math.floor(Math.random() * edge.length)], {
            color: [SOUL, PALE, 0x203038], kind: "dot", life: [0.4, 0.8], size: [4, 1], alpha: 1, speed: [20, 70], angle: [UP - 0.8, UP + 0.8], gravity: 30
        })
    })
    L.done()
}

/** Hồn bay từ `a` về `b` theo đường cong lệch `bend`; xong khi tới */
async function soulFly(layer: Node, a: Pt, b: Pt, bend: number, secs: number, r = 7) {
    const g = canvas(layer)
    const seed = rand(1, 999)
    const d = angleOf(a, b)
    const nx = -Math.sin(d), ny = Math.cos(d)
    const path = (u: number): Pt => { const q = mix(a, b, u); const s = Math.sin(u * Math.PI) * bend; return { x: q.x + nx * s, y: q.y + ny * s } }
    let prev = a
    await over(layer, secs, (t) => {
        const u = ease.inOut(t)
        const p = path(u)
        g.g.clear()
        wisp(g.g, p, angleOf(prev, p) || d, r, t, seed, 1)
        prev = p
        if (Math.random() < 0.6) emit(layer, p, { color: SOULP.dust!, kind: "dot", life: [0.3, 0.5], size: [5, 1], alpha: 0.9, speed: [10, 40], spread: 4 })
    })
    g.done()
}

// ---------- Đánh thường ----------

/** Đánh thường: xẻng bổ xuống mục tiêu (lưỡi viền hồn, vệt quét ngắn), chạm thì tia lửa hồn và bụi hồn sáng bật lên, vòng hồn nhỏ sát đất */
registerSkillVfx("basic_yorick", async (ctx) => {
    const to = mainOf(ctx)
    const seed = rand(1, 999)
    const L = layers(ctx.layer)
    const trail = canvas(ctx.layer)
    const butt = at(to, 74, 30)
    const a0 = UP + 0.5, a1 = Math.PI + 0.5
    await over(ctx.layer, 0.11, (t) => {
        const a = lerp(a0, a1, ease.in(t))
        L.clear()
        trail.g.clear()
        crescent(trail.g, butt, 92, a0, a1, ease.in(t), 0.7, 12, SOULP, 1, seed)
        shovel(L, butt, a, 98, Math.min(1, t * 6), 0.6)
    })
    impact(ctx.layer, to, SOULP, 0.55, at(to, 0, 100))
    graveBurst(ctx.layer, at(to, 0, -20), 12, UP, 0.9)
    groundWave(ctx.layer, at(to, 0, -34), SOULP, 60, 0.35)
    void over(ctx.layer, 0.2, (t) => {
        L.clear()
        trail.g.clear()
        shovel(L, butt, a1, 98, 1 - t, 0.6 * (1 - t))
        crescent(trail.g, butt, 92, a0, a1, 1, 0.7 * (1 - t), 12 * (1 - t), SOULP, 1 - t, seed)
    }).then(() => { L.done(); trail.done() })
})

// ---------- P Người Đào Mộ ----------

/** Bàn tay ghoul xương xẩu cào lên khỏi đất tại `base`, cao theo `up` 0..1; ngón cong, khớp gãy, viền hồn */
function ghoulHand(L: Layers, base: Pt, side: number, up: number, seed: number) {
    if (up <= 0.01) return
    const rnd = seeded(seed)
    const wrist = at(base, side * 4, 26 * up)
    const palm = at(wrist, side * 6, 14 * up)
    strip(L.body, base, wrist, 7, col(SOOT, 1))
    strip(L.body, wrist, palm, 10, col(SOOT, 1))
    for (let f = 0; f < 4; f++) {
        const a = UP + side * (0.6 - f * 0.4) + (rnd() - 0.5) * 0.2
        const l1 = (12 + rnd() * 5) * up, l2 = (9 + rnd() * 4) * up
        const k = { x: palm.x + Math.cos(a) * l1, y: palm.y + Math.sin(a) * l1 }
        const tip = { x: k.x + Math.cos(a - side * 0.9) * l2, y: k.y + Math.sin(a - side * 0.9) * l2 }
        strip(L.body, palm, k, 3, col(INK, 1))
        strip(L.body, k, tip, 2.2, col(INK, 1))
        L.front.lineWidth = 1
        L.front.strokeColor = col(SOUL, 0.8 * up)
        L.front.moveTo(palm.x, palm.y)
        L.front.lineTo(k.x, k.y)
        L.front.lineTo(tip.x, tip.y)
        L.front.stroke()
    }
    L.back.fillColor = col(GHOST, 0.2 * up)
    L.back.circle(palm.x, palm.y, 22)
    L.back.fill()
}

/**
 * P (đòn trúng): hồn bị giật khỏi mục tiêu (loé hồn) bay vòng về Yorick; cùng lúc lá trên cùng Bộ bài đối thủ cháy lửa hồn. Đất
 * dưới chân Yorick mở hố, hai bàn tay ghoul cào lên đón hồn; hồn tới thì giáp hồn sáng quanh chân (Hồn Ma + Máu, Giáp). Tay chìm,
 * tro bay chạy nền.
 */
registerSkillVfx("yorick_p", async (ctx) => {
    const me = ctx.from
    const to = mainOf(ctx)
    const rows = rowsOf(ctx)
    const seed = rand(1, 999)
    void burnCard(ctx.layer, enemyDeck(rows), seed)
    emit(ctx.layer, to, { color: [SOUL], kind: "glow", life: [0.25, 0.25], size: [40, 120], alpha: 0.8 })
    void burst(ctx.layer, to, 10, { color: [SOUL, PALE], kind: "blade", life: [0.15, 0.3], size: [20, 4], alpha: 1, speed: [200, 420], angle: [0, TAU], drag: 2.4, align: true, stretch: 2.6 })
    const L = layers(ctx.layer)
    const foot = at(me, 0, -44)
    const hands: [Pt, number][] = [[at(foot, -42, -2), 1], [at(foot, 44, 4), -1]]
    const fly = soulFly(ctx.layer, to, at(me, 0, 4), 90, 0.5, 8)
    await over(ctx.layer, 0.5, (t) => {
        L.clear()
        const up = ease.out(Math.max(0, (t - 0.35) / 0.65))
        for (const [p, s] of hands) {
            L.body.fillColor = col(DIRT_DARK, 0.8 * Math.min(1, t * 4))
            L.body.ellipse(p.x, p.y, 20, 7)
            L.body.fill()
            ghoulHand(L, p, s, up, seed + s)
            if (up > 0 && Math.random() < 0.4) emit(ctx.layer, p, { color: SOULP.dust!, kind: "dot", life: [0.3, 0.6], size: [5, 1], alpha: 0.9, speed: [40, 120], angle: [UP - 0.7, UP + 0.7], gravity: 40 })
        }
    })
    await fly
    ctx.onBeat?.(0)
    emit(ctx.layer, me, { color: [WHITE], kind: "glow", life: [0.2, 0.2], size: [50, 150], alpha: 0.8 })
    void burst(ctx.layer, foot, 1, { color: [SOUL], kind: "ring", life: [0.35, 0.35], size: [150, 100], alpha: 0.8 })
    void dust(ctx.layer, me, SOULP, 20, 40)
    void over(ctx.layer, 0.4, (t) => {
        L.clear()
        for (const [p, s] of hands) {
            L.body.fillColor = col(DIRT_DARK, 0.8 * (1 - t))
            L.body.ellipse(p.x, p.y, 20, 7)
            L.body.fill()
            ghoulHand(L, p, s, 1 - ease.in(t), seed + s)
        }
    }).then(L.done)
})

// ---------- Q Nghi Thức Cuối ----------

/**
 * Q: lửa hồn tụ ở tay Yorick, xẻng cháy lửa hồn hiện giơ cao cạnh tướng đối diện rồi BỔ xuống (vệt quét xanh ngọc). Chạm: loé hồn,
 * tia lửa hồn tung, vũng lửa hồn sáng mềm loang trên đất; hồn bốc lên từ vũng bay về Yorick, thấm thành ánh hồi lục ngọc (hồi Máu).
 */
registerSkillVfx("yorick_q", async (ctx) => {
    const me = ctx.from
    const to = mainOf(ctx)
    const seed = rand(1, 999)
    await charge(ctx.layer, at(me, 20, 30), SOULP, 0.2, 34)
    const L = layers(ctx.layer)
    const trail = canvas(ctx.layer)
    const fire = canvas(ctx.layer)
    const butt = at(to, 84, 20)
    const LEN = 104
    const a0 = UP + 0.45
    const aim = angleOf(butt, to)
    const a1 = (aim < a0 ? aim + TAU : aim) + 0.35
    const bladeAt = (a: number) => ({ x: butt.x + Math.cos(a) * LEN * 0.9, y: butt.y + Math.sin(a) * LEN * 0.9 })
    // xẻng hiện, lửa hồn bén lên lưỡi
    await over(ctx.layer, 0.14, (t) => {
        L.clear()
        shovel(L, butt, a0 - 0.15 * t, LEN, t, t)
        fire.g.clear()
        flames(fire.g, bladeAt(a0 - 0.15 * t), 40, 40 * t, t, seed, SOULP, t, 6, 0.6)
    })
    await over(ctx.layer, 0.12, (t) => {
        const u = ease.in(t)
        const a = lerp(a0 - 0.15, a1, u)
        L.clear()
        shovel(L, butt, a, LEN, 1, 1)
        trail.g.clear()
        crescent(trail.g, butt, LEN * 0.92, a0 - 0.15, a1, u, 0.85, 28, SOULP, 1, seed)
        fire.g.clear()
        flames(fire.g, bladeAt(a), 40, 40, 0.14 + t, seed, SOULP, 1, 6, 0.6)
    })
    ctx.onBeat?.(0)
    impact(ctx.layer, to, SOULP, 1.05, at(to, 0, 120))
    graveBurst(ctx.layer, at(to, 0, -26), 22, UP, 1.1, [180, 460])
    groundWave(ctx.layer, at(to, 0, -36), SOULP, 110, 0.45)
    // vũng lửa hồn sáng mềm trên đất (thay khe nứt tối gấp khúc, VFX_RULES §0.1)
    const pool = canvas(ctx.layer)
    const pc = at(to, 0, -36)
    void over(ctx.layer, 0.45, (t) => {
        L.clear()
        shovel(L, butt, a1 + 0.05 * t, LEN, Math.max(0, 1 - t * 2.5), 1 - t)
        trail.g.clear()
        crescent(trail.g, butt, LEN * 0.92 + t * 8, a0 - 0.15, a1, 1, 0.85 * (1 - t * 0.5), 28 * (1 - t * 0.6), SOULP, 1 - t, seed)
        fire.g.clear()
        pool.g.clear()
        const pr = 70 * ease.out(Math.min(1, t * 3)), fade = 1 - ease.in(t)
        for (const [k, c, a] of [[1, DEEP, 0.2], [0.72, GHOST, 0.2], [0.46, SOUL, 0.3 * (1 - t)], [0.22, PALE, 0.4 * (1 - t)]] as const) {
            pool.g.fillColor = col(c, a * fade)
            pool.g.ellipse(pc.x, pc.y, Math.max(0.5, pr * k), Math.max(0.5, pr * k * 0.42))
            pool.g.fill()
        }
        if (t < 0.6 && Math.random() < 0.6) emit(ctx.layer, at(pc, rand(-pr, pr) * 0.8, rand(-8, 8)), {
            color: SOULP.dust!, kind: "dot", life: [0.4, 0.7], size: [5, 1], alpha: 0.9, speed: [30, 90], angle: [UP - 0.5, UP + 0.5], gravity: 40
        })
    }).then(() => { L.done(); trail.done(); fire.done(); pool.done() })
    // hồn bốc từ đất về Yorick: hồi Máu
    void (async () => {
        await Promise.all([0, 1, 2].map((i) => soulFly(ctx.layer, at(to, (i - 1) * 30, -30), at(me, 0, 10), (i - 1) * 80 + 30, 0.5 + i * 0.05, 6)))
        emit(ctx.layer, me, { color: [MEND.core], kind: "glow", life: [0.25, 0.25], size: [50, 160], alpha: 0.8 })
        emit(ctx.layer, me, { color: [HEAL], kind: "glow", life: [0.45, 0.45], size: [100, 200], alpha: 0.45 })
        void dust(ctx.layer, at(me, 0, -20), MEND, 22, 44)
    })()
})

// ---------- E Sương Sầu ----------

/** Khối sương đen viền hồn tại `p`: lõi đen nhiều cục loang (seed, gợn theo `t`), viền xanh ngọc, tua sương kéo về `back` */
function mistBlob(L: Layers, p: Pt, r: number, back: number, t: number, seed: number, alpha: number) {
    const rnd = seeded(seed)
    const lumps = Array.from({ length: 9 }, () => ({ a: rnd() * TAU, d: rnd() * 0.6, s: 0.45 + rnd() * 0.4, ph: rnd() * TAU }))
    L.back.fillColor = col(GHOST, 0.18 * alpha)
    L.back.circle(p.x, p.y, r * 1.6)
    L.back.fill()
    for (const [k, c, a] of [[1.15, SOOT, 0.55], [0.9, INK, 0.85]] as const) {
        L.body.fillColor = col(c, a * alpha)
        for (const l of lumps) {
            const wob = 1 + 0.15 * Math.sin(t * 16 + l.ph)
            L.body.circle(p.x + Math.cos(l.a) * r * l.d, p.y + Math.sin(l.a) * r * l.d, r * l.s * k * wob)
        }
        L.body.fill()
    }
    // tua sương phía sau
    for (let i = 0; i < 4; i++) {
        const a = back + (rnd() - 0.5) * 1.2
        const len = r * (1.6 + rnd())
        const ph = rnd() * TAU
        for (const [w, c, al] of [[r * 0.5, INK, 0.6], [1.4, SOUL, 0.7]] as const) {
            const g = c === INK ? L.body : L.front
            g.lineWidth = w
            g.strokeColor = col(c, al * alpha)
            for (let s = 0; s <= 6; s++) {
                const u = s / 6
                const off = Math.sin(u * 5 + t * 14 + ph) * r * 0.25 * u
                const q = { x: p.x + Math.cos(a) * len * u - Math.sin(a) * off, y: p.y + Math.sin(a) * len * u + Math.cos(a) * off }
                if (s === 0) g.moveTo(q.x, q.y)
                else g.lineTo(q.x, q.y)
            }
            g.stroke()
        }
    }
    L.front.lineWidth = 1.5
    L.front.strokeColor = col(SOUL, 0.8 * alpha)
    L.front.circle(p.x, p.y, r * 0.95)
    L.front.stroke()
}

/**
 * E: đốt một lá bộ bài đối thủ (lá cháy lửa hồn chạy nền); sương đen tụ ở tay Yorick thành khối có viền hồn, vồng cao rơi xuống
 * mục tiêu kéo tua sương. Chạm: sương vỡ loang thành vòng đen viền hồn, loé ngọc, tia lửa rỉ mảnh toé khỏi mục tiêu và rơi (Rã
 * Giáp), sương xoáy lại rồi tan.
 */
registerSkillVfx("yorick_e", async (ctx) => {
    const me = ctx.from
    const to = mainOf(ctx)
    const rows = rowsOf(ctx)
    const seed = rand(1, 999)
    void burnCard(ctx.layer, enemyDeck(rows), seed + 3)
    const hand = at(me, 18, 34)
    const L = layers(ctx.layer)
    await over(ctx.layer, 0.16, (t) => {
        L.clear()
        mistBlob(L, hand, 6 + 12 * ease.out(t), DOWN, t, seed, Math.min(1, t * 3))
        emit(ctx.layer, at(hand, rand(-40, 40), rand(-30, 30)), { color: [SOUL, GHOST], kind: "dot", life: [0.14, 0.18], size: [5, 2], alpha: 1, speed: [200, 260], angle: [0, 0] })
    })
    const peak = Math.min(110, Math.abs(to.y - hand.y) * 0.35)
    let prev = hand
    await over(ctx.layer, 0.3, (t) => {
        const u = ease.inOut(t)
        const q = mix(hand, to, u)
        const p = { x: q.x, y: q.y + Math.sin(u * Math.PI) * peak }
        L.clear()
        mistBlob(L, p, 18 + 4 * Math.sin(t * Math.PI), angleOf(p, prev) || DOWN, 0.16 + t, seed, 1)
        prev = p
        emit(ctx.layer, p, { color: [INK, SOOT], kind: "glow", additive: false, life: [0.3, 0.5], size: [30, 50], alpha: 0.35, spread: 8 })
        if (Math.random() < 0.6) emit(ctx.layer, p, { color: SOULP.dust!, kind: "dot", life: [0.3, 0.5], size: [5, 1], alpha: 0.9, speed: [10, 40], spread: 10 })
    })
    ctx.onBeat?.(0)
    impact(ctx.layer, to, SOULP, 0.95, me)
    // Rã Giáp: tia lửa rỉ mảnh toé khỏi mục tiêu rồi rơi (thay vảy sắt rỉ cứng, VFX_RULES §0.1)
    void burst(ctx.layer, to, 14, {
        color: [RUST_LIT, 0xffb36a, 0xffe0b8], kind: "blade", life: [0.22, 0.5], size: [12, 2], alpha: 0.9, speed: [140, 320],
        angle: [UP - 1.3, UP + 1.3], drag: 1.4, gravity: -700, align: true, stretch: 2.4, spread: 22
    })
    // sương vỡ loang rồi xoáy lại (chạy nền)
    void over(ctx.layer, 0.6, (t) => {
        L.clear()
        const r = lerp(20, 86, ease.out(Math.min(1, t * 2.2)))
        const fade = 1 - ease.in(t)
        L.body.fillColor = col(INK, 0.4 * fade)
        L.body.ellipse(to.x, to.y - 20, r, r * 0.5)
        L.body.fill()
        for (const [lw, c, a] of [[6, GHOST, 0.25], [2, SOUL, 0.8], [1, WHITE, 0.8]] as const) {
            L.front.lineWidth = lw
            L.front.strokeColor = col(c, a * fade)
            L.front.ellipse(to.x, to.y - 20, r, r * 0.5)
            L.front.stroke()
        }
        for (let i = 0; i < 3; i++) {
            const s = t * TAU * 1.4 + i * TAU / 3
            crescent(L.front, at(to, 0, -6), 52 - t * 18, s, s + 1.8, 1, 0.8, 10, SOULP, fade * 0.8, seed + i, 0.5)
        }
        if (Math.random() < 0.5) emit(ctx.layer, at(to, rand(-60, 60), rand(-30, 10)), { color: [INK, SOOT], kind: "glow", additive: false, life: [0.5, 0.8], size: [30, 70], alpha: 0.35, speed: [10, 40], angle: [UP - 0.5, UP + 0.5] })
    }).then(L.done)
    void dust(ctx.layer, to, SOULP, 18, 30)
})

// ---------- R Khúc Ai Ca ----------

/**
 * Cột Sương Hồn đứng tại `foot`, cao `H`, dựng tới độ cao `build` 0..1: hình khối nguyên bản của StarCi (không phải dáng người):
 * nhiều dải sương đen xoắn quanh trục bốc lên, phình ở giữa và thắt ở đỉnh, mép dải viền hồn xanh ngọc lõi trắng, đỉnh là lưỡi lửa
 * hồn tua tủa. Dải lệch nhau theo hạt giống để không đối xứng máy móc; cả cột xoay chậm theo `t`.
 */
function mistSpire(L: Layers, foot: Pt, H: number, build: number, alpha: number, t: number, seed: number) {
    if (alpha <= 0.01 || build <= 0.01) return
    const rnd = seeded(seed)
    const top = Math.min(1, build)
    // bề ngang theo độ cao: chân loe, giữa phình nhẹ, đỉnh thắt nhọn
    const width = (v: number) => H * (0.3 * (1 - v) ** 0.6 + 0.08 * Math.sin(v * Math.PI)) * (1 - 0.15 * Math.sin(v * 7 + t * 4))
    const strands = 7
    for (let k = 0; k < strands; k++) {
        const phase = k / strands * TAU + rnd() * 0.6
        const thick = H * (0.05 + rnd() * 0.04)
        const pts: Pt[] = []
        const n = 18
        for (let s = 0; s <= n; s++) {
            const v = s / n * top
            const a = phase + v * 5.5 + t * 2.2
            pts.push({
                x: foot.x + Math.cos(a) * width(v), y: foot.y + v * H + Math.sin(a) * width(v) * 0.18
            })
        }
        // thân dải: sương đen (hoà thường) rồi quầng hồn sau lưng
        for (let s = 1; s < pts.length; s++) {
            const v = s / n
            strip(L.back, pts[s - 1], pts[s], thick * (1.9 - v), col(GHOST, 0.12 * alpha))
            strip(L.body, pts[s - 1], pts[s], thick * (1.1 - v * 0.6), col(INK, 0.55 * alpha))
        }
        // viền hồn lõi trắng chạy dọc mép dải phía trước (nửa vòng hướng ra người xem)
        for (const [lw, c, al] of [[3, SOUL, 0.35], [1.2, SOUL, 0.85], [0.6, WHITE, 0.9]] as const) {
            L.front.lineWidth = lw
            L.front.strokeColor = col(c, al * alpha)
            let open = false
            for (let s = 0; s < pts.length; s++) {
                const a = phase + s / n * top * 5.5 + t * 2.2
                const facing = Math.sin(a) < 0
                if (facing && !open) { L.front.moveTo(pts[s].x, pts[s].y); open = true }
                else if (facing) L.front.lineTo(pts[s].x, pts[s].y)
                else if (open) { L.front.stroke(); open = false }
            }
            if (open) L.front.stroke()
        }
    }
    // sợi hồn li ti bốc lên trong lòng cột
    for (let i = 0; i < 6; i++) {
        const x0 = (rnd() - 0.5) * 0.4
        L.front.lineWidth = 0.8
        L.front.strokeColor = col(SOUL, 0.4 * alpha)
        for (let s = 0; s <= 8; s++) {
            const v = s / 8 * Math.min(top, 0.85)
            const q = {
                x: foot.x + x0 * H * (1 - v) + Math.sin(v * 9 + t * 8 + i) * 4, y: foot.y + v * H
            }
            if (s === 0) L.front.moveTo(q.x,
                q.y)
            else L.front.lineTo(q.x,
                q.y)
        }
        L.front.stroke()
    }
}

/**
 * R: Yorick giơ tay, sương đen tụ ở ô phụ cạnh Yorick (vũng sương, lửa hồn bén vòng chân), cột Sương Hồn xoắn dựng dần từ chân lên
 * (mép đang dựng gợn lửa hồn), đỉnh loé; hồn bay vòng quanh. Dựng đủ là xong; cột mờ dần nhường chỗ lá Ma Sương thật trên sân
 * (chạy nền).
 */
registerSkillVfx("yorick_r", async (ctx) => {
    const me = ctx.from
    const rows = rowsOf(ctx)
    const seed = rand(1, 999)
    const slot = { x: rows.ally[1].x, y: me.y + rows.up * rows.gap * 0.45 }
    const foot = at(slot, 0, -66)
    const H = 150
    const L = layers(ctx.layer)
    const ground = canvas(ctx.layer)
    void charge(ctx.layer, at(me, 0, 40), SOULP, 0.24, 40)
    emit(ctx.layer, at(foot, 0, 50), { color: [INK], kind: "glow", additive: false, life: [1.3, 1.3], size: [160, 260], alpha: 0.5 })
    const pool = (a: number, t: number) => {
        ground.g.clear()
        flames(ground.g, foot, 120, 46 * a, t, seed + 4, SOULP, a, 10)
        for (const [lw, c, al] of [[8, DEEP, 0.3], [2.4, SOUL, 0.7], [1, WHITE, 0.8]] as const) {
            ground.g.lineWidth = lw
            ground.g.strokeColor = col(c, al * a)
            ground.g.ellipse(foot.x, foot.y, 64 * a, 22 * a)
            ground.g.stroke()
        }
    }
    const orbit = (t: number, a: number) => {
        for (let i = 0; i < 3; i++) {
            const s = t * TAU * 0.9 + i * TAU / 3
            const p = { x: foot.x + Math.cos(s) * 78, y: foot.y + H * 0.5 + Math.sin(s) * 30 }
            wisp(ground.g, p, s + UP, 5, t, seed + i, a)
        }
    }
    // sương tụ, lửa hồn bén vòng chân
    await over(ctx.layer, 0.24, (t) => {
        pool(ease.out(t), t)
        if (Math.random() < 0.8) emit(ctx.layer, at(foot, rand(-70, 70), rand(-10, 20)), { color: [INK, SOOT], kind: "glow", additive: false, life: [0.6, 0.9], size: [40, 90], alpha: 0.4, speed: [10, 40], angle: [UP - 0.4, UP + 0.4] })
    })
    // Ma Sương dựng dần
    await over(ctx.layer, 0.56, (t) => {
        const b = ease.inOut(t)
        pool(1, 0.24 + t)
        orbit(t, Math.min(1, t * 2))
        L.clear()
        mistSpire(L, foot, H, b, 1, t, seed)
        // mép đang dựng gợn lửa hồn
        if (b < 0.98) flames(L.front, at(foot, 0, b * H - 4), 70 * (1 - b * 0.6), 18, t, seed + 8, SOULP, 0.9, 6, 0.2)
        if (Math.random() < 0.8) emit(ctx.layer, at(foot, rand(-40, 40) * (1 - b * 0.6), b * H), { color: SOULP.dust!, kind: "dot", life: [0.3, 0.6], size: [5, 1], alpha: 1, speed: [30, 90], angle: [UP - 0.6, UP + 0.6] })
    })
    ctx.onBeat?.(0)
    emit(ctx.layer, at(foot, 0, H * 0.86), { color: [WHITE], kind: "glow", life: [0.2, 0.2], size: [30, 120], alpha: 1 })
    emit(ctx.layer, at(foot, 0, H * 0.5), { color: [GHOST], kind: "glow", life: [0.5, 0.5], size: [120, 240], alpha: 0.5 })
    void burst(ctx.layer, at(foot, 0, 4), 1, { color: [SOUL], kind: "ring", life: [0.4, 0.4], size: [60, 220], alpha: 0.8 })
    void dust(ctx.layer, at(foot, 0, H * 0.5), SOULP, 30, 50)
    void over(ctx.layer, 0.55, (t) => {
        pool(1 - t, 0.8 + t)
        orbit(0.56 + t * 0.8, 1 - t)
        L.clear()
        mistSpire(L, foot, H, 1, 1 - ease.in(t), 0.56 + t, seed)
    }).then(() => { L.done(); ground.done() })
})
