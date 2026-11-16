// VFX Yorick trên Cocos, chuẩn chung "mọi tướng một bản" (mẫu Vel'Koz, công cụ kit.ts): LỬA HỒN QUẦN ĐẢO BÓNG ĐÊM. Lửa hồn xanh
// ngọc lõi trắng, sương mộ đen. Bộ chiêu mới (thầy chốt 2026-11-16): Đấu sĩ chỉ chạm tướng đối diện, không còn Ma Sương; mỗi lá
// đốt khỏi bộ bài đối thủ thành 1 Hồn làm Yorick mạnh lên.
// VFX_RULES §0.1: KHÔNG vẽ cái xẻng, bàn tay ghoul, Ma Sương hay hình lá bài; không mảnh hình học, không đất vụn, không nứt tối.
// Chỉ vẽ dấu vết chuyển động và năng lượng: vệt chém lửa hồn (Graphics nhiều lớp: quầng sâu, thân, viền sáng, chỉ lõi), làn sương
// trôi, quầng sáng, hạt. Lá bị đốt = một đốm lửa hồn bùng ở chỗ Bộ bài đối thủ rồi thành HỒN (đốm sáng có đuôi gợn) bay về Yorick.
// Mỗi ô lấy ý từ đâu:
// - basic_yorick: cú phang xẻng gốc → một vệt chém ngắn nặng bổ từ trên xuống mục tiêu đối diện, tia hồn toé; nội tại đốt 1 lá:
//   một hồn bay từ Bộ bài đối thủ về Yorick.
// - yorick_p (Người Đào Mộ): icon hồn xanh ngọc. Vài hồn từ Bộ bài đối thủ hội tụ vào Yorick, nhịp sáng ngọc mềm (Hồn: +Công, +Máu).
// - yorick_q (Nghi Thức Cuối): icon xẻng lửa hồn bổ xuống → vệt chém liềm lửa hồn lớn bổ từ trên xuống qua tướng đối diện; đốt 1 lá:
//   1 hồn về Yorick, thấm thành ánh hồi lục ngọc (hồi Máu theo Hồn).
// - yorick_e (Sương Sầu): icon làn sương đen cuộn sóng → làn sương lăn dọc đường từ Yorick tới tướng đối diện, vòng sáng Rã Giáp
//   loé trên mục tiêu; đốt 2 lá: 2 hồn về Yorick, ánh Khiên ngọc lung linh bọc Yorick.
// - yorick_r (Khúc Ai Ca): icon hồn xanh ngọc và sương đen → 3 hồn bị giật khỏi Bộ bài đối thủ xoáy vào Yorick, Yorick bùng sáng,
//   rồi một vệt chém DỌC lửa hồn khổng lồ bổ xuống tướng đối diện, lõi trắng loé (sát thương chuẩn theo Hồn).
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
    canvas, charge, col, dust, groundWave, impact, orb, seeded, softBeam, TAU, UP, type Palette
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
const HEAL = 0x7dffc0

/** Lửa hồn: lõi trắng ngọc, xanh ngọc, sâu lục thẫm */
const SOULP: Palette = {
    core: WHITE, main: GHOST, deep: DEEP, accent: SOUL, dust: [SOUL, GHOST, PALE]
}
/** Hồi Máu (hồn thấm vào Yorick): lục ngọc dịu, lõi trắng */
const MEND: Palette = {
    core: 0xeafff4, main: HEAL, deep: 0x0d5a3a, accent: 0xc8ffe4, dust: [HEAL, 0xc8ffe4, 0xffffff]
}

const at = (p: Pt, dx: number, dy: number): Pt => ({
    x: p.x + dx, y: p.y + dy
})
const mainOf = (ctx: VfxCtx): Pt => ctx.to[0] ?? at(ctx.from, 0, 300)
/** Bộ bài đối thủ: mép phải hàng địch */
const enemyDeck = (rows: Rows): Pt => at(rows.foe[4], rows.spacing * 0.85, rows.up * 60)

// ---------- dấu vết nhát chém ----------

/** Vệt chém liềm (cung tâm `c`, bán kính `r`, dẹt `sq`) từ a0 tới a1; `head` 0..1 đầu vệt, `tail` độ dài vệt, `w` bề dày */
function crescent(g: Graphics, c: Pt, r: number, a0: number, a1: number, head: number, tail: number, w: number, p: Palette, alpha: number, seed: number, sq = 1) {
    const u0 = Math.max(0, head - tail)
    if (head - u0 < 0.004 || alpha <= 0.01) return
    const rnd = seeded(seed)
    const N = 32
    const outer: Pt[] = [], inner: Pt[] = []
    for (let i = 0; i <= N; i++) {
        const s = i / N
        const a = lerp(a0, a1, lerp(u0, head, s))
        const t = w * Math.pow(s, 0.8) * Math.min(1, (1 - s) * 9 + 0.2) * (0.75 + rnd() * 0.5)
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
    band(1.35, p.deep, 0.2)
    band(1, p.main, 0.32)
    band(0.6, p.main, 0.56)
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
 * Vệt chém THẲNG a -> b: `head` 0..1 đầu vệt, `tail` độ dài vệt phía sau, `w` bề rộng lớn nhất. Đầu nhọn, thân phình rồi thon
 * về đuôi, mép răng cưa nhỏ theo `seed`, hơi cong theo `bend`. Lớp: quầng sâu, thân, viền sáng, chỉ lõi trắng dọc giữa.
 */
function streak(g: Graphics, a: Pt, b: Pt, head: number, tail: number, w: number, p: Palette, alpha: number, seed: number, bend = 0) {
    const u0 = Math.max(0, head - tail)
    if (head - u0 < 0.004 || alpha <= 0.01) return
    const rnd = seeded(seed)
    const d = angleOf(a, b)
    const nx = -Math.sin(d), ny = Math.cos(d)
    const P = (v: number): Pt => {
        const q = mix(a, b, v)
        const k = Math.sin(v * Math.PI) * bend
        return { x: q.x + nx * k, y: q.y + ny * k }
    }
    const N = 28
    const mid: Pt[] = [], half: number[] = []
    for (let i = 0; i <= N; i++) {
        const s = i / N
        mid.push(P(lerp(u0, head, s)))
        half.push(w * 0.5 * Math.pow(s, 0.9) * Math.min(1, (1 - s) * 7 + 0.15) * (0.8 + rnd() * 0.4))
    }
    const band = (f: number, color: number, al: number) => {
        g.fillColor = col(color, al * alpha)
        g.moveTo(mid[0].x, mid[0].y)
        for (let i = 0; i <= N; i++) g.lineTo(mid[i].x + nx * half[i] * f, mid[i].y + ny * half[i] * f)
        for (let i = N; i >= 0; i--) g.lineTo(mid[i].x - nx * half[i] * f, mid[i].y - ny * half[i] * f)
        g.close()
        g.fill()
    }
    band(1.35, p.deep, 0.18)
    band(1, p.main, 0.32)
    band(0.62, p.main, 0.55)
    band(0.32, p.accent, 0.85)
    const from = Math.floor(N * 0.35)
    for (const [lw, color, al] of [[3.2, p.accent, 0.55], [1.4, p.core, 1]] as const) {
        g.lineWidth = lw
        g.strokeColor = col(color, al * alpha)
        g.moveTo(mid[from].x, mid[from].y)
        for (let i = from; i <= N; i++) g.lineTo(mid[i].x, mid[i].y)
        g.stroke()
    }
}

/** Đầu vệt lửa hồn trắng nóng tại `p`: đốm sáng nhiều lớp + tàn hồn rơi lại dọc đường chém */
function hotHead(layer: Node, g: Graphics, p: Pt, r: number) {
    orb(g, p, SOULP, r)
    emit(layer, p, { color: [WHITE, PALE, SOUL], kind: "dot", life: [0.12, 0.28], size: [6, 1], alpha: 1, speed: [10, 70], angle: [0, TAU], drag: 2 })
}

/** Tia lửa hồn mảnh văng về `ang` ± `spread` rồi rơi, bụi hồn sáng bay lên, khói mộ mềm loang (không đất vụn, VFX_RULES §0.1) */
function soulSparks(layer: Node, p: Pt, n: number, ang: number, spread: number, speed: [number, number] = [220, 560]) {
    void burst(layer, p, n, {
        color: [WHITE, PALE, SOUL, GHOST], kind: "blade", life: [0.16, 0.38], size: [15, 2], alpha: 1, speed,
        angle: [ang - spread, ang + spread], drag: 1.6, gravity: -900, align: true, stretch: 2.8, spread: 6
    })
    void burst(layer, p, Math.round(n * 0.6), {
        color: SOULP.dust!, kind: "dot", life: [0.4, 0.8], size: [5, 1], alpha: 0.9, speed: [30, 110],
        angle: [UP - 1, UP + 1], drag: 1.3, gravity: 50, spread: 10
    })
    void burst(layer, p, Math.round(n * 0.25), {
        color: [INK, SOOT], kind: "glow", additive: false, life: [0.5, 0.9], size: [30, 70], alpha: 0.3, speed: [20, 60],
        angle: [ang - spread, ang + spread], drag: 1.4, spread: 12
    })
}

// ---------- hồn ----------

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

/** Lá bị đốt ở Bộ bài đối thủ: đốm lửa hồn bùng (không vẽ hình lá), tàn hồn bốc lên. Chạy nền */
function deckFlare(layer: Node, deck: Pt, k = 1) {
    emit(layer, deck, { color: [WHITE], kind: "glow", life: [0.16, 0.16], size: [20 * k, 70 * k], alpha: 1 })
    emit(layer, deck, { color: [GHOST], kind: "glow", life: [0.4, 0.4], size: [50 * k, 120 * k], alpha: 0.6 })
    void burst(layer, deck, Math.round(10 * k), {
        color: [WHITE, PALE, SOUL], kind: "blade", life: [0.14, 0.3], size: [12, 2], alpha: 1, speed: [120, 300],
        angle: [UP - 1, UP + 1], drag: 2, align: true, stretch: 2.4
    })
    void burst(layer, deck, Math.round(12 * k), {
        color: SOULP.dust!, kind: "dot", life: [0.4, 0.8], size: [5, 1], alpha: 0.9, speed: [20, 80], angle: [UP - 0.8, UP + 0.8], gravity: 40, spread: 10
    })
}

/**
 * Hồn bay từ `a` về `b`: đường cong lệch `bend`, `twist` (rad) cho xoáy dần vào `b` (0 = không xoáy). Xong khi tới; tới nơi loé nhỏ.
 */
async function soulFly(layer: Node, a: Pt, b: Pt, secs: number, bend: number, twist = 0, r = 6) {
    const g = canvas(layer)
    const seed = rand(1, 999)
    const d = angleOf(a, b)
    const nx = -Math.sin(d), ny = Math.cos(d)
    const ox = a.x - b.x, oy = a.y - b.y
    const path = (u: number): Pt => {
        const rot = twist * u
        const cs = Math.cos(rot), sn = Math.sin(rot)
        const s = Math.sin(u * Math.PI) * bend
        return {
            x: b.x + (ox * cs - oy * sn) * (1 - u) + nx * s, y: b.y + (ox * sn + oy * cs) * (1 - u) + ny * s
        }
    }
    let prev = a
    await over(layer, secs, (t) => {
        const p = path(ease.inOut(t))
        g.g.clear()
        wisp(g.g, p, angleOf(prev, p) || d, r, t, seed, 1)
        prev = p
        if (Math.random() < 0.6) emit(layer, p, { color: SOULP.dust!, kind: "dot", life: [0.3, 0.5], size: [5, 1], alpha: 0.9, speed: [10, 40], spread: 4 })
    })
    g.done()
    emit(layer, b, { color: [PALE], kind: "glow", life: [0.16, 0.16], size: [20, 60], alpha: 0.8 })
}

/** Hồn thấm vào Yorick: nhịp sáng ngọc mềm, vòng sáng nhỏ, bụi hồn bốc lên (Hồn: +Công, +Máu tối đa). Chạy nền */
function soulPulse(layer: Node, me: Pt, k = 1) {
    emit(layer, me, { color: [WHITE], kind: "glow", life: [0.18, 0.18], size: [40 * k, 120 * k], alpha: 0.7 })
    emit(layer, me, { color: [GHOST], kind: "glow", life: [0.45, 0.45], size: [90 * k, 190 * k], alpha: 0.45 })
    void burst(layer, at(me, 0, -30), 1, { color: [SOUL], kind: "ring", life: [0.35, 0.35], size: [60, 150 * k], alpha: 0.75 })
    void dust(layer, me, SOULP, Math.round(16 * k), 36)
}

/** `n` lá bị đốt: mỗi lá một đốm lửa hồn ở Bộ bài đối thủ và một hồn bay về Yorick (lệch nhau); xong khi hồn cuối tới */
async function burnSouls(layer: Node, deck: Pt, me: Pt, n: number, secs: number, twist = 0) {
    const flights: Promise<void>[] = []
    for (let i = 0; i < n; i++) {
        const src = at(deck, (i - (n - 1) / 2) * 22, rand(-8, 8))
        deckFlare(layer, src, 0.8)
        const bend = (i - (n - 1) / 2) * 90 + rand(-20, 20)
        flights.push(soulFly(layer, src, at(me, 0, 10), secs + i * 0.05, bend, twist))
    }
    await Promise.all(flights)
    soulPulse(layer, me, 0.7 + 0.15 * n)
}

// ---------- Đánh thường ----------

/**
 * Đánh thường: một vệt chém ngắn nặng bổ từ trên xuống (hơi chéo) qua tướng đối diện (0,12 s), đầu vệt trắng nóng. Chạm: loé,
 * tia lửa hồn toé theo hướng chém. Nội tại đốt 1 lá: đốm lửa hồn ở Bộ bài đối thủ, một hồn bay về Yorick (chạy nền).
 */
registerSkillVfx("basic_yorick", async (ctx) => {
    const me = ctx.from
    const to = mainOf(ctx)
    const rows = rowsOf(ctx)
    const seed = rand(1, 999)
    const g = canvas(ctx.layer)
    const top = at(to, 26, 92), low = at(to, -14, -40)
    emit(ctx.layer, top, { color: [PALE], kind: "glow", life: [0.14, 0.14], size: [20, 60], alpha: 1 })
    await over(ctx.layer, 0.12, (t) => {
        const u = ease.in(t)
        g.g.clear()
        streak(g.g, top, low, u, 0.85, 18, SOULP, 1, seed, 8)
        hotHead(ctx.layer, g.g, mix(top, low, u), 8)
    })
    ctx.onBeat?.(0)
    impact(ctx.layer, to, SOULP, 0.6, top)
    soulSparks(ctx.layer, to, 10, angleOf(top, low), 0.8)
    void over(ctx.layer, 0.25, (t) => {
        g.g.clear()
        streak(g.g, top, low, 1, 0.85 * (1 - ease.out(t)), 18 * (1 - t * 0.5), SOULP, 1 - t, seed, 8)
    }).then(() => g.done())
    void burnSouls(ctx.layer, enemyDeck(rows), me, 1, 0.42)
})

// ---------- P Người Đào Mộ ----------

/**
 * P (Hồn tăng): lá bị đốt ở Bộ bài đối thủ bùng lửa hồn, các hồn bay vòng hội tụ vào Yorick; tới nơi là nhịp sáng ngọc mềm và vòng
 * sáng nhỏ quanh chân (Hồn: +Công, +Máu tối đa). Không vẽ hình lá, không tay ghoul.
 */
registerSkillVfx("yorick_p", async (ctx) => {
    const me = ctx.from
    const rows = rowsOf(ctx)
    const deck = enemyDeck(rows)
    await burnSouls(ctx.layer, deck, me, 2, 0.45, 1.2)
    ctx.onBeat?.(0)
})

// ---------- Q Nghi Thức Cuối ----------

/**
 * Q: lửa hồn tụ ở Yorick, rồi MỘT vệt chém liềm lửa hồn lớn bổ từ trên xuống qua tướng đối diện (0,13 s), đầu vệt trắng nóng. Nhịp
 * số khi đầu vệt qua giữa mục tiêu: loé lớn, tia lửa hồn toé theo hướng chém, sóng sáng ngọc trên đất. Đốt 1 lá: một hồn bay về
 * Yorick, thấm thành ánh hồi lục ngọc (hồi Máu theo Hồn). Phần sau chạy nền.
 */
registerSkillVfx("yorick_q", async (ctx) => {
    const me = ctx.from
    const to = mainOf(ctx)
    const rows = rowsOf(ctx)
    const seed = rand(1, 999)
    await charge(ctx.layer, at(me, 20, 30), SOULP, 0.18, 34)
    // cung chém: tâm ở bên phải hơi trên mục tiêu, mục tiêu nằm giữa cung; vệt đi từ trên trái bổ xuống dưới
    const R = 140
    const mid = Math.PI + 0.35, sweep = 0.85
    const pivot = at(to, -Math.cos(mid) * R, -Math.sin(mid) * R)
    const a0 = mid - sweep, a1 = mid + sweep
    const arcAt = (u: number): Pt => {
        const a = lerp(a0, a1, u)
        return { x: pivot.x + Math.cos(a) * R, y: pivot.y + Math.sin(a) * R }
    }
    const trail = canvas(ctx.layer)
    const slashDir = angleOf(arcAt(0.3), arcAt(0.7))
    let hit = false
    const strike = () => {
        hit = true
        ctx.onBeat?.(0)
        impact(ctx.layer, to, SOULP, 1.1, arcAt(0.2))
        soulSparks(ctx.layer, to, 18, slashDir, 0.6, [300, 680])
        emit(ctx.layer, to, { color: [WHITE], kind: "glow", life: [0.14, 0.14], size: [180, 70], alpha: 1 })
        groundWave(ctx.layer, at(to, 0, -40), SOULP, 100, 0.45)
    }
    emit(ctx.layer, arcAt(0), { color: [PALE], kind: "glow", life: [0.14, 0.14], size: [30, 90], alpha: 1 })
    await over(ctx.layer, 0.13, (t) => {
        const u = ease.in(t)
        trail.g.clear()
        crescent(trail.g, pivot, R, a0, a1, u, 0.85, 30, SOULP, 1, seed)
        hotHead(ctx.layer, trail.g, arcAt(u), 14)
        if (!hit && u >= 0.5) strike()
    })
    if (!hit) strike()
    // vệt tan, tàn hồn rơi dọc đường chém (chạy nền)
    void over(ctx.layer, 0.4, (t) => {
        trail.g.clear()
        crescent(trail.g, pivot, R + t * 8, a0, a1, 1, 0.85 * (1 - t), 30 * (1 - t), SOULP, 1 - t, seed)
        if (t < 0.6 && Math.random() < 0.5) emit(ctx.layer, arcAt(rand(0.2, 0.8)), {
            color: SOULP.dust!, kind: "dot", life: [0.3, 0.6], size: [5, 1], alpha: 1, speed: [20, 70], angle: [UP - 0.7, UP + 0.7], gravity: 40
        })
    }).then(() => trail.done())
    // đốt 1 lá: hồn về Yorick, thấm thành ánh hồi lục ngọc
    void (async () => {
        await burnSouls(ctx.layer, enemyDeck(rows), me, 1, 0.42)
        emit(ctx.layer, me, { color: [MEND.core], kind: "glow", life: [0.25, 0.25], size: [50, 160], alpha: 0.8 })
        emit(ctx.layer, me, { color: [HEAL], kind: "glow", life: [0.45, 0.45], size: [100, 200], alpha: 0.45 })
        void burst(ctx.layer, at(me, 0, -30), 18, {
            color: MEND.dust!, kind: "dot", life: [0.5, 0.9], size: [7, 1], alpha: 1, speed: [60, 150], angle: [UP - 0.25, UP + 0.25], drag: 0.8, spread: 40
        })
    })()
})

// ---------- E Sương Sầu ----------

/**
 * Làn sương lăn tại đầu sóng `head` (hướng `dir`), bề ngang `w`: nhiều cuộn sương đen mềm (hoà thường) cuộn tròn, mép trước viền
 * lửa hồn gợn sóng, vệt sương kéo dài phía sau. Chỉ là chất liệu đang trôi, không hình khối cứng.
 */
function mistFront(g: Graphics, front: Graphics, head: Pt, dir: number, w: number, t: number, seed: number, alpha: number) {
    if (alpha <= 0.01) return
    const rnd = seeded(seed)
    const dx = Math.cos(dir), dy = Math.sin(dir)
    const nx = -dy, ny = dx
    // cuộn sương: tròn mềm, lăn (xoay pha theo t), dày ở đầu sóng, thưa dần về sau
    for (let i = 0; i < 14; i++) {
        const back = rnd() * w * 1.4
        const side = (rnd() - 0.5) * w
        const ph = rnd() * TAU
        const roll = t * 14 + ph
        const r = w * (0.16 + rnd() * 0.14) * (1 - back / (w * 2))
        const q = {
            x: head.x - dx * back + nx * side + Math.cos(roll) * r * 0.3, y: head.y - dy * back + ny * side + Math.sin(roll) * r * 0.3
        }
        for (const [k, c, a] of [[1.3, SOOT, 0.22], [0.85, INK, 0.38]] as const) {
            g.fillColor = col(c, a * alpha * (1 - back / (w * 1.6)))
            g.circle(q.x, q.y, Math.max(1, r * k))
            g.fill()
        }
    }
    // mép trước: gợn lửa hồn
    for (const [lw, c, a] of [[6, GHOST, 0.25], [2, SOUL, 0.75], [1, WHITE, 0.85]] as const) {
        front.lineWidth = lw
        front.strokeColor = col(c, a * alpha)
        for (let s = 0; s <= 12; s++) {
            const v = s / 12 - 0.5
            const bow = (1 - 4 * v * v) * w * 0.25 + Math.sin(v * 9 + t * 20 + seed) * 3
            const q = { x: head.x + nx * v * w * 1.1 + dx * bow, y: head.y + ny * v * w * 1.1 + dy * bow }
            if (s === 0) front.moveTo(q.x, q.y)
            else front.lineTo(q.x, q.y)
        }
        front.stroke()
    }
}

/**
 * E (Quick): sương tụ quanh chân Yorick rồi LĂN dọc đường tới tướng đối diện (0,28 s), mép trước viền lửa hồn, khói sương đọng lại
 * sau lưng. Chạm: loé, vòng sáng Rã Giáp loé trên mục tiêu và siết lại (không mảnh). Đốt 2 lá: 2 hồn bay về Yorick, ánh Khiên ngọc
 * lung linh bọc Yorick (chạy nền).
 */
registerSkillVfx("yorick_e", async (ctx) => {
    const me = ctx.from
    const to = mainOf(ctx)
    const rows = rowsOf(ctx)
    const seed = rand(1, 999)
    const back = canvas(ctx.layer, false)
    const front = canvas(ctx.layer)
    const start = at(me, 0, rows.up * 30)
    const dir = angleOf(start, to)
    const W = 70
    // sương tụ quanh chân
    await over(ctx.layer, 0.14, (t) => {
        back.g.clear()
        front.g.clear()
        mistFront(back.g, front.g, start, dir, W * (0.4 + 0.6 * t), t, seed, ease.out(t))
        emit(ctx.layer, at(start, rand(-40, 40), rand(-20, 20)), { color: [INK, SOOT], kind: "glow", additive: false, life: [0.4, 0.6], size: [30, 60], alpha: 0.3 })
    })
    // làn sương lăn tới mục tiêu
    await over(ctx.layer, 0.28, (t) => {
        const u = ease.in(t)
        const head = mix(start, to, u)
        back.g.clear()
        front.g.clear()
        mistFront(back.g, front.g, head, dir, W, 0.14 + t, seed, 1)
        emit(ctx.layer, at(head, rand(-30, 30), rand(-20, 20)), { color: [INK, SOOT], kind: "glow", additive: false, life: [0.4, 0.7], size: [40, 80], alpha: 0.3, speed: [10, 30], angle: [UP - 0.5, UP + 0.5] })
        if (Math.random() < 0.7) emit(ctx.layer, head, { color: SOULP.dust!, kind: "dot", life: [0.3, 0.5], size: [5, 1], alpha: 0.9, speed: [20, 60], spread: 20 })
    })
    ctx.onBeat?.(0)
    impact(ctx.layer, to, SOULP, 0.9, me)
    // Rã Giáp: vòng sáng loé quanh mục tiêu rồi siết lại, chớp hai lần (không mảnh vỡ)
    const ring = canvas(ctx.layer)
    void over(ctx.layer, 0.45, (t) => {
        back.g.clear()
        front.g.clear()
        mistFront(back.g, front.g, to, dir, W * (1 + t * 0.6), 0.42 + t, seed, 1 - ease.in(t))
        ring.g.clear()
        const r = lerp(30, 76, ease.out(Math.min(1, t * 3))) - Math.max(0, t - 0.4) * 50
        const flick = t < 0.35 ? 1 : 0.6 + 0.4 * Math.sin(t * 40)
        const fade = (1 - ease.in(t)) * flick
        for (const [lw, c, a] of [[8, DEEP, 0.25], [3, SOUL, 0.7], [1.2, WHITE, 1]] as const) {
            ring.g.lineWidth = lw
            ring.g.strokeColor = col(c, a * fade)
            ring.g.ellipse(to.x, to.y, r, r * 0.85)
            ring.g.stroke()
        }
    }).then(() => { back.done(); front.done(); ring.done() })
    void dust(ctx.layer, to, SOULP, 16, 30)
    // đốt 2 lá: 2 hồn về Yorick, Khiên ngọc lung linh
    void (async () => {
        await burnSouls(ctx.layer, enemyDeck(rows), me, 2, 0.42)
        const shell = canvas(ctx.layer)
        await over(ctx.layer, 0.5, (t) => {
            shell.g.clear()
            const a = Math.min(1, t * 5) * (1 - ease.in(t))
            shell.g.fillColor = col(PALE, 0.07 * a)
            shell.g.ellipse(me.x, me.y + 4, 72, 84)
            shell.g.fill()
            for (const [lw, c, al] of [[7, DEEP, 0.22], [3, SOUL, 0.55], [1.2, WHITE, 0.9]] as const) {
                shell.g.lineWidth = lw
                shell.g.strokeColor = col(c, al * a)
                shell.g.ellipse(me.x, me.y + 4, 72, 84)
                shell.g.stroke()
            }
            // vệt sáng lung linh chạy trên vỏ
            const h0 = t * 7
            shell.g.lineWidth = 2.2
            shell.g.strokeColor = col(WHITE, 0.6 * a)
            for (let i = 0; i <= 10; i++) {
                const q = { x: me.x + Math.cos(h0 + i * 0.09) * 64, y: me.y + 4 + Math.sin(h0 + i * 0.09) * 76 }
                if (i === 0) shell.g.moveTo(q.x, q.y)
                else shell.g.lineTo(q.x, q.y)
            }
            shell.g.stroke()
        })
        shell.done()
    })()
})

// ---------- R Khúc Ai Ca ----------

/**
 * R: đốt 3 lá TRƯỚC (đúng thứ tự engine): 3 đốm lửa hồn bùng ở Bộ bài đối thủ, 3 hồn bị giật ra xoáy vào Yorick; Yorick bùng sáng
 * ngọc. Một đường sáng mảnh báo trước trên tướng đối diện, rồi một vệt chém DỌC lửa hồn khổng lồ bổ từ trên xuống (0,12 s). Chạm:
 * loé lớn, lõi trắng nóng loé thêm (sát thương chuẩn theo Hồn), sóng sáng ngọc loang trên đất, tia lửa hồn và bụi hồn. Dư âm: vệt
 * rút vào đất (chạy nền).
 */
registerSkillVfx("yorick_r", async (ctx) => {
    const me = ctx.from
    const to = mainOf(ctx)
    const rows = rowsOf(ctx)
    const seed = rand(1, 999)
    // 3 hồn xoáy vào Yorick
    void charge(ctx.layer, at(me, 0, 30), SOULP, 0.4, 40)
    await burnSouls(ctx.layer, enemyDeck(rows), me, 3, 0.4, 2.4)
    emit(ctx.layer, me, { color: [WHITE], kind: "glow", life: [0.2, 0.2], size: [60, 180], alpha: 0.9 })
    // vệt rộng nhất 40 px (VFX_RULES §3 / §7)
    const W = 40
    const land = at(to, 0, -40)
    const top = at(to, 0, 180)
    const g = canvas(ctx.layer)
    // đường sáng báo trước, chập chờn
    await over(ctx.layer, 0.12, (t) => {
        g.g.clear()
        const flick = 0.75 + 0.25 * Math.sin(t * 70)
        softBeam(g.g, top, mix(top, land, ease.out(Math.min(1, t * 2))), SOULP, 3 + 4 * t, (0.4 + 0.5 * t) * flick)
        emit(ctx.layer, top, { color: [PALE, WHITE], kind: "glow", life: [0.06, 0.08], size: [20, 40 + 30 * t], alpha: 0.8 })
    })
    // vệt chém dọc bổ xuống
    await over(ctx.layer, 0.12, (t) => {
        const u = ease.in(t)
        g.g.clear()
        softBeam(g.g, top, land, SOULP, 6, 0.6 * (1 - u))
        streak(g.g, top, land, u, 0.9, W, SOULP, 1, seed)
        const head = mix(top, land, u)
        hotHead(ctx.layer, g.g, head, 18)
        for (const s of [-1, 1]) emit(ctx.layer, at(head, s * rand(16, 30), rand(10, 60)), {
            color: [PALE, SOUL], kind: "blade", life: [0.1, 0.16], size: [34, 4], alpha: 0.8, rotation: UP, stretch: 3, speed: [200, 340], angle: [UP, UP]
        })
    })
    ctx.onBeat?.(0)
    impact(ctx.layer, to, SOULP, 1.6, top)
    // lõi trắng nóng: sát thương chuẩn
    emit(ctx.layer, to, { color: [WHITE], kind: "glow", life: [0.22, 0.22], size: [40, 200], alpha: 1 })
    emit(ctx.layer, land, { color: [WHITE], kind: "glow", life: [0.16, 0.16], size: [240, 80], alpha: 1 })
    groundWave(ctx.layer, land, SOULP, 160, 0.5, 0.4)
    soulSparks(ctx.layer, land, 18, UP, 1.1, [300, 720])
    void dust(ctx.layer, land, SOULP, 36, 60)
    void over(ctx.layer, 0.3, (t) => {
        g.g.clear()
        streak(g.g, top, land, 1, 0.9 * (1 - ease.out(t)), W * (1 - t * 0.4), SOULP, 1 - t * 0.6, seed)
    }).then(() => g.done())
})
