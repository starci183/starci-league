// VFX Braum trên Cocos, chuẩn chung "mọi tướng một bản" (mẫu Vel'Koz, công cụ kit.ts): BĂNG TRONG XANH và CÁNH CỬA HẦM nẹp
// đồng. Tinh thể băng vẽ bằng Graphics nhiều lớp: mặt hứng sáng nhạt, mặt khuất lam sẫm, gờ cạnh, viền trắng cộng màu, quầng lạnh
// phía sau; băng vỡ là tia băng mảnh sáng văng rồi rơi, bụi băng và sương lạnh loang thấp. VFX_RULES §0.1 (thầy chốt
// 2026-11-16): không mảnh tam giác, không khe nứt tối gấp khúc; khe băng của R là vệt sáng lạnh mềm chạy trên đất.
// Mỗi ô lấy ý từ đâu:
// - basic_braum: cú đấm tay không của Braum gốc: luồng lạnh thúc vào mục tiêu, lớp băng mỏng đóng rồi vỡ.
// - braum_p (Song Giáp): icon ký hiệu hai sừng xoắn của Braum (dấu băng). Ký hiệu băng hiện trên đầu Braum, rồi mảnh giáp băng mọc
//   thành vòng quanh chân (cộng Giáp, Kháng phép): dáng giáp, không phải đòn.
// - braum_q (Cú Đấm Băng): icon nắm đấm thúc ra, băng phụt về trước. Băng tụ ở tay, khối băng lăn trên đất tới mục tiêu, sau lưng
//   mọc tinh thể nhỏ, trúng thì vỡ tung. Dấu Băng là trạng thái: dùng icon trên lá (VFX_RULES §4).
// - braum_e (Đứng Sau Tôi): icon tấm khiên cửa hầm băng hứng đạn. Luồng lạnh bật khỏi Braum, cửa hầm dựng lên chắn phía địch, ba
//   đòn bay tới vỡ vụn trên cửa, Braum nhận Khiên.
// - braum_r (Khe Băng): icon hàng tinh thể băng dựng đứng. Braum nện khiên xuống đất, vệt sáng lạnh chạy tới hàng địch rồi rẽ hai bên,
//   trụ băng mọc dưới MỌI tướng địch cùng một nhịp; Choáng dùng VFX khống chế chung (stunStars).
import {
    Graphics, Node
} from "cc"
import {
    angleOf, burst, ease, emit, mix, over, rand, type Pt
} from "./particles"
import {
    registerSkillVfx, type VfxCtx
} from "./registry"
import {
    canvas, charge, col, dust, groundWave, impact, seeded, softBeam, TAU, UP, type Palette
} from "./kit"
import {
    allFoes, stunStars
} from "./g1_helpers"

const FROST = 0xf4fdff
const PALE = 0xbff0ff
const ICE = 0x4fd4ff
const AZURE = 0x1e7fe0
const NAVY = 0x0a2a6e
const WOOD = 0x6e4322
const WOOD_DARK = 0x3e2412
const BRONZE = 0xc08a3e
const BRONZE_LIT = 0xffd28a
const GOLD = 0xffd56a

/** Băng: lõi trắng lạnh, lam băng, navy sâu, nhạt */
const ICEP: Palette = {
    core: FROST, main: ICE, deep: NAVY, accent: PALE, dust: [FROST, PALE, 0x9fe4ff]
}
/** Đồng thau của cửa hầm (tia lửa khi đòn vỡ trên cửa) */
const BRASS: Palette = {
    core: 0xfffbe8, main: BRONZE, deep: 0x5a3a14, accent: BRONZE_LIT, dust: [BRONZE_LIT, PALE, FROST]
}

const DOWN = -UP
const at = (p: Pt, dx: number, dy: number): Pt => ({
    x: p.x + dx, y: p.y + dy
})
const mainOf = (ctx: VfxCtx): Pt => ctx.to[0] ?? at(ctx.from, 0, 300)

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

/**
 * Một tinh thể băng mọc từ `base` theo hướng `ang`, cao `h`, rộng `w`: lăng trụ nhọn, mặt trái hứng sáng nhạt, mặt phải lam sẫm,
 * gờ giữa, viền trắng ở cạnh sáng, quầng lạnh phía sau. Trong mờ (độ đục < 1) như băng thật.
 */
function crystal(L: Layers, base: Pt, ang: number, h: number, w: number, alpha: number) {
    if (h < 1 || alpha <= 0.01) return
    const dx = Math.cos(ang), dy = Math.sin(ang)
    const nx = -dy, ny = dx
    const P = (u: number, v: number): Pt => ({ x: base.x + dx * h * u + nx * w * v, y: base.y + dy * h * u + ny * w * v })
    const poly = (g: Graphics, pts: Pt[], c: number, a: number) => {
        g.fillColor = col(c, a * alpha)
        g.moveTo(pts[0].x, pts[0].y)
        for (const q of pts) g.lineTo(q.x, q.y)
        g.close()
        g.fill()
    }
    poly(L.back, [P(-0.05, 0.9), P(0.8, 0.85), P(1.08, 0), P(0.8, -0.85), P(-0.05, -0.9)], AZURE, 0.18)
    poly(L.body, [P(0, 0.5), P(0.78, 0.5), P(1, 0), P(0.78, 0), P(0, 0)], PALE, 0.8)
    poly(L.body, [P(0, -0.5), P(0.78, -0.5), P(1, 0), P(0.78, 0), P(0, 0)], NAVY, 0.82)
    poly(L.body, [P(0, -0.15), P(0.78, -0.12), P(0.97, 0), P(0.78, 0), P(0, 0)], AZURE, 0.6)
    for (const [lw, c, a] of [[3, ICE, 0.4], [1.1, FROST, 1]] as const) {
        L.front.lineWidth = lw
        L.front.strokeColor = col(c, a * alpha)
        const a0 = P(0, 0.5), a1 = P(0.78, 0.5), a2 = P(1, 0), a3 = P(0.78, 0)
        L.front.moveTo(a0.x, a0.y)
        L.front.lineTo(a1.x, a1.y)
        L.front.lineTo(a2.x, a2.y)
        L.front.lineTo(a3.x, a3.y)
        L.front.stroke()
    }
}

interface Spike { a: number; h: number; w: number; dx: number; lag: number }
/** Bộ tinh thể chụm từ một gốc: cao thấp, nghiêng lệch nhau theo seed */
function makeCluster(n: number, size: number, seed: number, fan = 1.1): Spike[] {
    const rnd = seeded(seed)
    return Array.from({ length: n }, (_, i) => {
        const s = n > 1 ? i / (n - 1) - 0.5 : 0
        return { a: UP + s * fan * 2 + (rnd() - 0.5) * 0.3, h: size * (0.5 + rnd() * 0.5) * (1 - Math.abs(s) * 0.6), w: size * (0.16 + rnd() * 0.08), dx: s * size * 0.35, lag: rnd() * 0.35 }
    })
}
/** Vẽ bộ tinh thể tại `base`, mọc theo `grow` 0..1 (mỗi tinh thể trễ riêng) */
function drawCluster(L: Layers, base: Pt, sp: Spike[], grow: number, alpha: number) {
    const order = [...sp].sort((a, b) => Math.abs(b.a - UP) - Math.abs(a.a - UP))
    for (const s of order) {
        const g = Math.max(0, Math.min(1, (grow - s.lag) / (1 - s.lag)))
        crystal(L, at(base, s.dx, 0), s.a, s.h * ease.out(g), s.w * (0.4 + 0.6 * ease.out(g)), alpha)
    }
}

/** Băng vỡ: tia băng mảnh sáng văng theo `ang` ± `spread` rồi rơi (không mảnh tam giác), bụi băng, sương lạnh loang thấp */
function shatter(layer: Node, p: Pt, n: number, ang = UP, spread = 1.3, k = 1) {
    void burst(layer, p, n, {
        color: [FROST, PALE, ICE], kind: "blade", life: [0.16, 0.36], size: [14, 2], alpha: 1, speed: [200 * k, 520 * k],
        angle: [ang - spread, ang + spread], drag: 1.6, gravity: -700, align: true, stretch: 2.8
    })
    void burst(layer, p, Math.round(n * 1.6), {
        color: [FROST, PALE, ICE], kind: "dot", life: [0.3, 0.7], size: [5, 1], alpha: 1, speed: [60, 260 * k],
        angle: [ang - spread * 1.2, ang + spread * 1.2], drag: 1.6, gravity: -300
    })
    void burst(layer, at(p, 0, -20), 4, {
        color: [PALE, 0xdff6ff], kind: "glow", life: [0.6, 1], size: [40, 110], alpha: 0.25, speed: [20, 60], angle: [0, TAU], drag: 1.2, spread: 20
    })
}

/**
 * Vệt sáng lạnh chạy trên đất a..b (thay khe băng gãy khúc tối, VFX_RULES §0.1): tia mềm nhiều lớp cộng sáng, thẳng, không viền
 * tối. `upto` 0..1 phần đã chạy, `open` bề rộng (≤ ~26 px kể cả quầng), `heat` độ sáng.
 */
function frostLane(g: Graphics, a: Pt, b: Pt, upto: number, open: number, heat: number, alpha: number) {
    const u = Math.max(0, Math.min(1, upto))
    if (u <= 0.01 || heat * alpha <= 0.01) return
    softBeam(g, a, mix(a, b, u), ICEP, 10 + 16 * open, heat * alpha)
}

// ---------- Đánh thường ----------

/** Đánh thường: luồng lạnh ngắn thúc vào mục tiêu, chạm thì băng mỏng đóng thành chùm nhỏ trên mục tiêu rồi vỡ */
registerSkillVfx("basic_braum", async (ctx) => {
    const to = mainOf(ctx)
    const seed = rand(1, 999)
    const dir = angleOf(ctx.from, to)
    const start = at(to, -Math.cos(dir) * 90, -Math.sin(dir) * 90)
    const g = canvas(ctx.layer)
    await over(ctx.layer, 0.08, (t) => {
        g.g.clear()
        const head = mix(start, to, ease.in(t))
        softBeam(g.g, mix(start, head, 0.3), head, ICEP, 22, 0.8)
    })
    g.done()
    impact(ctx.layer, to, ICEP, 0.55, ctx.from)
    const L = layers(ctx.layer)
    const sp = makeCluster(4, 34, seed)
    const base = at(to, 0, -12)
    void over(ctx.layer, 0.3, (t) => {
        L.clear()
        drawCluster(L, base, sp, ease.out(Math.min(1, t * 4)), t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3)
    }).then(() => { L.done(); shatter(ctx.layer, at(base, 0, 14), 8, UP, 1.2, 0.8) })
})

// ---------- P Song Giáp ----------

/**
 * Ký hiệu hai sừng xoắn (icon Braum): ba vạch giữa, hai sừng cuộn ra ngoài; vẽ tại `c`, cỡ `s`, hiện theo `a`. Ba lớp nét: quầng
 * lam, thân băng nhạt, chỉ trắng.
 */
function glyph(g: Graphics, c: Pt, s: number, a: number, draw: number) {
    if (a <= 0.01) return
    const curl = (side: number): Pt[] => {
        const pts: Pt[] = []
        const n = 18
        for (let i = 0; i <= n * draw; i++) {
            const u = i / n
            const ang = side > 0 ? UP + 0.2 - u * 4.6 : UP - 0.2 + u * 4.6
            const r = s * (0.55 - u * 0.36)
            pts.push({ x: c.x + side * s * 0.55 + Math.cos(ang) * r, y: c.y + s * 0.08 + Math.sin(ang) * r })
        }
        return pts
    }
    for (const [lw, cc, al] of [[7, AZURE, 0.3], [3.2, PALE, 0.85], [1.2, FROST, 1]] as const) {
        g.lineWidth = lw
        g.strokeColor = col(cc, al * a)
        for (const side of [1, -1]) {
            const pts = curl(side)
            if (pts.length < 2) continue
            g.moveTo(pts[0].x, pts[0].y)
            for (const q of pts) g.lineTo(q.x, q.y)
        }
        for (const x of [-0.16, 0, 0.16]) {
            g.moveTo(c.x + x * s, c.y + s * 0.42 * draw)
            g.lineTo(c.x + x * s, c.y - s * 0.42 * draw)
        }
        g.stroke()
    }
}

/**
 * P (đòn địch dội vào Braum, cộng Song Giáp): ký hiệu hai sừng băng hiện trên đầu Braum, nét vẽ dần rồi loé; mảnh giáp băng mọc
 * thành vòng quanh chân (cộng Giáp và Kháng phép), lớp vỏ lạnh lấp lánh quanh thân. Không mảnh vỡ văng: dáng cường hoá. Tan chạy nền.
 */
registerSkillVfx("braum_p", async (ctx) => {
    const me = ctx.from
    const seed = rand(1, 999)
    const top = at(me, 0, 86)
    const foot = at(me, 0, -44)
    const L = layers(ctx.layer)
    const sym = canvas(ctx.layer)
    const ring = Array.from({ length: 9 }, (_, i) => ({ a: i / 9 * TAU + rand(-0.15, 0.15), sp: makeCluster(2, rand(22, 34), seed + i, 0.4) }))
    emit(ctx.layer, top, { color: [AZURE], kind: "glow", life: [0.7, 0.7], size: [60, 120], alpha: 0.5 })
    await over(ctx.layer, 0.3, (t) => {
        sym.g.clear()
        glyph(sym.g, top, 30, Math.min(1, t * 3), ease.out(t))
        if (Math.random() < 0.6) emit(ctx.layer, at(top, rand(-30, 30), rand(-14, 14)), { color: ICEP.dust!, kind: "dot", life: [0.3, 0.5], size: [4, 1], alpha: 1, speed: [10, 40], angle: [DOWN - 0.5, DOWN + 0.5] })
    })
    await over(ctx.layer, 0.24, (t) => {
        sym.g.clear()
        glyph(sym.g, top, 30 + t * 4, 1, 1)
        L.clear()
        // vòng giáp: tinh thể mọc từ sau ra trước (sau vẽ trước)
        const order = [...ring].sort((a, b) => Math.sin(b.a) - Math.sin(a.a))
        for (const r of order) drawCluster(L, { x: foot.x + Math.cos(r.a) * 64, y: foot.y + Math.sin(r.a) * 24 }, r.sp, ease.out(t), 1)
    })
    ctx.onBeat?.(0)
    emit(ctx.layer, me, { color: [FROST], kind: "glow", life: [0.25, 0.25], size: [60, 180], alpha: 0.8 })
    void burst(ctx.layer, foot, 1, { color: [PALE], kind: "ring", life: [0.35, 0.35], size: [160, 120], alpha: 0.8 })
    void dust(ctx.layer, me, ICEP, 22, 46)
    void over(ctx.layer, 0.45, (t) => {
        sym.g.clear()
        glyph(sym.g, top, 34 + t * 8, 1 - t, 1)
        L.clear()
        const order = [...ring].sort((a, b) => Math.sin(b.a) - Math.sin(a.a))
        for (const r of order) drawCluster(L, { x: foot.x + Math.cos(r.a) * 64, y: foot.y + Math.sin(r.a) * 24 }, r.sp, 1, 1 - ease.in(t))
        if (Math.random() < 0.5) emit(ctx.layer, at(me, rand(-60, 60), rand(-40, 60)), { color: [FROST], kind: "glow", life: [0.1, 0.2], size: [10, 2], alpha: 1 })
    }).then(() => { L.done(); sym.done() })
})

// ---------- Q Cú Đấm Băng ----------

/**
 * Q: băng tụ ở nắm tay Braum (hạt lạnh hút vào), khối băng thô lăn sát đất tới mục tiêu: chùm tinh thể xoay, sương lạnh và bụi
 * băng theo sau, tinh thể nhỏ mọc trên vệt đường rồi tan. Chạm: loé lạnh, băng vỡ tung ngược hướng bay, lớp băng đóng trên mục
 * tiêu rồi vỡ. Dấu Băng dùng icon trạng thái.
 */
registerSkillVfx("braum_q", async (ctx) => {
    const me = ctx.from
    const to = mainOf(ctx)
    const seed = rand(1, 999)
    const fist = at(me, 22, 30)
    await charge(ctx.layer, fist, ICEP, 0.2, 36)
    const L = layers(ctx.layer)
    const path = canvas(ctx.layer)
    const chunk = makeCluster(5, 30, seed, 1.4)
    const dir = angleOf(fist, to)
    const marks: { p: Pt; t0: number; sp: Spike[] }[] = []
    const secs = Math.min(0.32, 0.14 + Math.hypot(to.x - fist.x, to.y - fist.y) / 2400)
    let last = 0
    await over(ctx.layer, secs, (t) => {
        const p = mix(fist, to, ease.in(t))
        L.clear()
        // vệt đường: tinh thể nhỏ mọc lại phía sau
        if (t - last > 0.12) { last = t; marks.push({ p: at(p, rand(-10, 10), -14), t0: t, sp: makeCluster(3, 16, seed + marks.length, 1) }) }
        for (const m of marks) drawCluster(L, m.p, m.sp, Math.min(1, (t - m.t0) * 8), 0.8)
        // khối băng: chùm tinh thể xoay quanh tâm
        const spin = t * 9
        for (const s of chunk) crystal(L, p, s.a + spin, s.h, s.w, 1)
        L.back.fillColor = col(ICE, 0.25)
        L.back.circle(p.x, p.y, 34)
        L.back.fill()
        path.g.clear()
        softBeam(path.g, mix(fist, p, 0.55), p, ICEP, 26, 0.45)
        emit(ctx.layer, p, { color: [PALE, 0xdff6ff], kind: "glow", life: [0.4, 0.7], size: [30, 70], alpha: 0.3, speed: [10, 40], spread: 10 })
        emit(ctx.layer, p, { color: ICEP.dust!, kind: "dot", life: [0.3, 0.6], size: [5, 1], alpha: 1, speed: [30, 120], angle: [dir + Math.PI - 0.8, dir + Math.PI + 0.8], spread: 8 })
    })
    path.done()
    ctx.onBeat?.(0)
    impact(ctx.layer, to, ICEP, 1.05, me)
    shatter(ctx.layer, to, 14, angleOf(to, me), 1.1)
    groundWave(ctx.layer, at(to, 0, -30), ICEP, 90, 0.4)
    const crust = makeCluster(6, 46, seed + 50, 1.3)
    void over(ctx.layer, 0.34, (t) => {
        L.clear()
        for (const m of marks) drawCluster(L, m.p, m.sp, 1, 1 - t)
        drawCluster(L, at(to, 0, -30), crust, ease.out(Math.min(1, t * 4)), t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3)
    }).then(() => { L.done(); shatter(ctx.layer, to, 8, UP, 1.3, 0.8) })
})

// ---------- E Đứng Sau Tôi ----------

/**
 * Cửa hầm Braum nhìn thẳng tại tâm `c`, rộng `w`, cao `h`: ván gỗ dọc (mỗi ván một sắc), đai và viền đồng có đinh tán, núm đồng giữa,
 * băng phủ mép trên và hai góc, quầng lạnh phía sau. Mọc từ dưới lên theo `rise` 0..1.
 */
function vaultDoor(L: Layers, c: Pt, w: number, h: number, rise: number, alpha: number, seed: number) {
    if (alpha <= 0.01 || rise <= 0.01) return
    const rnd = seeded(seed)
    const bottom = c.y - h / 2
    const H = h * rise
    const top = bottom + H
    const x0 = c.x - w / 2
    L.back.fillColor = col(ICE, 0.18 * alpha)
    L.back.rect(x0 - 12, bottom - 6, w + 24, H + 18)
    L.back.fill()
    // ván gỗ
    const planks = 5
    for (let i = 0; i < planks; i++) {
        const shade = [WOOD, 0x5e3a1c, 0x7a4c28][Math.floor(rnd() * 3)]
        L.body.fillColor = col(shade, alpha)
        L.body.rect(x0 + i * w / planks + 0.6, bottom, w / planks - 1.2, H)
        L.body.fill()
        L.body.fillColor = col(WOOD_DARK, 0.7 * alpha)
        L.body.rect(x0 + (i + 1) * w / planks - 1.6, bottom, 1.6, H)
        L.body.fill()
    }
    // đai đồng ngang và viền
    for (const v of [0.2, 0.8]) {
        if (v * h > H) continue
        L.body.fillColor = col(BRONZE, alpha)
        L.body.rect(x0, bottom + v * h - 4, w, 8)
        L.body.fill()
        L.front.fillColor = col(BRONZE_LIT, 0.8 * alpha)
        for (let i = 0; i < 5; i++) L.front.circle(x0 + 6 + i * (w - 12) / 4, bottom + v * h, 1.6)
        L.front.fill()
    }
    L.body.lineWidth = 4
    L.body.strokeColor = col(BRONZE, alpha)
    L.body.rect(x0, bottom, w, H)
    L.body.stroke()
    if (H > h * 0.5) {
        L.body.fillColor = col(BRONZE, alpha)
        L.body.circle(c.x, bottom + h * 0.5, w * 0.12)
        L.body.fill()
        L.front.lineWidth = 1.2
        L.front.strokeColor = col(BRONZE_LIT, 0.9 * alpha)
        L.front.circle(c.x, bottom + h * 0.5, w * 0.12)
        L.front.stroke()
    }
    // băng phủ mép trên (chỉ khi đã dựng đủ cao)
    for (const [lw, cc, a] of [[6, ICE, 0.3], [2, PALE, 0.8], [1, FROST, 1]] as const) {
        L.front.lineWidth = lw
        L.front.strokeColor = col(cc, a * alpha)
        L.front.moveTo(x0, bottom)
        L.front.lineTo(x0, top)
        L.front.lineTo(x0 + w, top)
        L.front.lineTo(x0 + w, bottom)
        L.front.stroke()
    }
    for (let i = 0; i < 7; i++) {
        const x = x0 + rnd() * w
        const hh = 6 + rnd() * 10
        L.front.fillColor = col(FROST, 0.8 * alpha)
        L.front.moveTo(x - 3, top)
        L.front.lineTo(x, top - hh)
        L.front.lineTo(x + 3, top)
        L.front.close()
        L.front.fill()
    }
}

/**
 * E (Quick, nối Chuỗi): luồng lạnh bật khỏi Braum, cửa hầm mọc lên chắn phía địch (băng bắn ra hai bên chân cửa). Ba đòn từ phía
 * địch bay tới, lần lượt vỡ vụn trên mặt cửa (tia lửa đồng, tia băng văng ngược). Cửa đứng vững là lúc Braum nhận Khiên: vòng sáng
 * vàng lạnh quanh Braum. Cửa tan thành bụi băng chạy nền.
 */
registerSkillVfx("braum_e", async (ctx) => {
    const me = ctx.from
    const to = mainOf(ctx)
    const seed = rand(1, 999)
    const dir = angleOf(me, to)
    const c = at(me, Math.cos(dir) * 96, Math.sin(dir) * 96)
    const W = 86, H = 100
    const L = layers(ctx.layer)
    emit(ctx.layer, me, { color: [ICE], kind: "glow", life: [0.3, 0.3], size: [60, 180], alpha: 0.7 })
    await over(ctx.layer, 0.18, (t) => {
        L.clear()
        vaultDoor(L, c, W, H, ease.out(t), 1, seed)
        emit(ctx.layer, at(c, rand(-W / 2, W / 2), -H / 2), { color: ICEP.dust!, kind: "dot", life: [0.3, 0.5], size: [5, 1], alpha: 1, speed: [80, 200], angle: [UP - 1, UP + 1], gravity: -400 })
    })
    shatter(ctx.layer, at(c, -W / 2, -H / 2), 5, Math.PI - 0.6, 0.5, 0.7)
    shatter(ctx.layer, at(c, W / 2, -H / 2), 5, 0.6, 0.5, 0.7)
    ctx.onBeat?.(0)
    // Khiên: vòng vàng lạnh quanh Braum
    const shell = canvas(ctx.layer)
    const bolts = canvas(ctx.layer)
    const hits = [0, 1, 2].map((i) => ({ x: rand(-W * 0.3, W * 0.3), y: rand(-H * 0.2, H * 0.3), t0: 0.05 + i * 0.1, src: at(c, rand(-120, 120), (to.y - c.y) * 0.9) }))
    const struck = hits.map(() => false)
    void over(ctx.layer, 0.6, (t) => {
        L.clear()
        const fade = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4
        vaultDoor(L, c, W, H, 1, fade, seed)
        shell.g.clear()
        for (const [lw, cc, a] of [[8, GOLD, 0.15], [3, GOLD, 0.5], [1.2, FROST, 0.9]] as const) {
            shell.g.lineWidth = lw
            shell.g.strokeColor = col(cc, a * (1 - ease.in(t)) * Math.min(1, t * 5))
            shell.g.ellipse(me.x, me.y, 66 + t * 8, 80 + t * 8)
            shell.g.stroke()
        }
        bolts.g.clear()
        hits.forEach((h, i) => {
            const u = (t - h.t0) / 0.12
            const hit = at(c, h.x, h.y)
            if (u > 0 && u < 1) softBeam(bolts.g, mix(h.src, hit, Math.max(0, u - 0.4)), mix(h.src, hit, u), BRASS, 14, 0.9)
            if (u >= 1 && !struck[i]) {
                struck[i] = true
                impact(ctx.layer, hit, BRASS, 0.5, h.src)
                shatter(ctx.layer, hit, 5, angleOf(hit, h.src), 0.7, 0.7)
            }
        })
    }).then(() => { L.done(); shell.done(); bolts.done(); void dust(ctx.layer, c, ICEP, 26, 40) })
})

// ---------- R Khe Băng ----------

/**
 * R: băng tụ quanh khiên Braum, nện xuống đất (loé, sóng lạnh). Vệt sáng lạnh mềm chạy thẳng trên đất tới hàng địch (không khe nứt
 * tối gấp khúc), tinh thể nhỏ bật lên dọc vệt; tới hàng địch thì rẽ hai bên chạy dọc chân hàng. Rồi trụ băng mọc vọt dưới MỌI
 * tướng địch cùng một nhịp (loé, tia băng hất lên); Choáng dùng VFX khống chế chung. Dư âm: trụ băng đứng một chút rồi tan thành
 * tia băng, vệt sáng nguội tắt.
 */
registerSkillVfx("braum_r", async (ctx) => {
    const me = ctx.from
    const foes = allFoes(ctx)
    const seed = rand(1, 999)
    const rowY = foes.reduce((s, p) => s + p.y, 0) / foes.length
    const slam = at(me, 0, 60)
    const fork = { x: me.x, y: rowY - 52 }
    const xs = foes.map((p) => p.x)
    const leftEnd = { x: Math.min(...xs) - 40, y: rowY - 52 }
    const rightEnd = { x: Math.max(...xs) + 40, y: rowY - 52 }
    const span = Math.max(...xs.map((x) => Math.abs(x - fork.x))) + 40
    const lane = canvas(ctx.layer)
    const ice = layers(ctx.layer)
    await charge(ctx.layer, slam, ICEP, 0.24, 48)
    impact(ctx.layer, slam, ICEP, 1.1, at(slam, 0, 120))
    groundWave(ctx.layer, slam, ICEP, 130, 0.45)
    shatter(ctx.layer, slam, 10, UP, 1.2)
    const pops: { p: Pt; sp: Spike[]; t0: number }[] = []
    let popAt = 0
    // vệt sáng lạnh chạy tới hàng địch
    await over(ctx.layer, 0.22, (t) => {
        lane.g.clear()
        frostLane(lane.g, slam, fork, ease.in(t), 0.5, 1, 1)
        const tip = mix(slam, fork, ease.in(t))
        if (t - popAt > 0.04) { popAt = t; pops.push({ p: tip, sp: makeCluster(2, rand(18, 28), seed + pops.length, 0.6), t0: t }) }
        ice.clear()
        for (const q of pops) drawCluster(ice, q.p, q.sp, Math.min(1, (t - q.t0) * 9), 1)
        emit(ctx.layer, tip, { color: ICEP.dust!, kind: "dot", life: [0.2, 0.4], size: [5, 1], alpha: 1, speed: [80, 220], angle: [UP - 0.7, UP + 0.7], gravity: -400 })
    })
    // rẽ hai bên dọc chân hàng
    await over(ctx.layer, 0.14, (t) => {
        lane.g.clear()
        frostLane(lane.g, slam, fork, 1, 0.6, 1, 1)
        frostLane(lane.g, fork, leftEnd, ease.in(t) * span / Math.max(1, fork.x - leftEnd.x), 0.5, 1, 1)
        frostLane(lane.g, fork, rightEnd, ease.in(t) * span / Math.max(1, rightEnd.x - fork.x), 0.5, 1, 1)
        ice.clear()
        for (const q of pops) drawCluster(ice, q.p, q.sp, 1, 1 - t * 0.5)
    })
    ctx.onBeat?.(0)
    const pillars = foes.map((p, i) => ({ base: at(p, 0, -56), sp: makeCluster(6, 72, seed + 40 + i, 1.0) }))
    for (const p of foes) {
        impact(ctx.layer, p, ICEP, 1.2, at(p, 0, -140))
        shatter(ctx.layer, at(p, 0, -40), 8, UP, 0.9, 1.1)
        void stunStars(ctx.layer, p, 0.9)
    }
    // dư âm chạy nền: trụ băng vọt lên, đứng, rồi vỡ thành tia băng; vệt sáng nguội tắt
    void (async () => {
        await over(ctx.layer, 0.3, (t) => {
            ice.clear()
            for (const q of pops) drawCluster(ice, q.p, q.sp, 1, 0.5 * (1 - t))
            for (const pl of pillars) drawCluster(ice, pl.base, pl.sp, ease.out(Math.min(1, t * 3.5)), 1)
            lane.g.clear()
            frostLane(lane.g, slam, fork, 1, 0.6, 1 - t * 0.5, 1)
            frostLane(lane.g, fork, leftEnd, 1, 0.5, 1 - t * 0.5, 1)
            frostLane(lane.g, fork, rightEnd, 1, 0.5, 1 - t * 0.5, 1)
        })
        for (const pl of pillars) shatter(ctx.layer, at(pl.base, 0, 40), 10, UP, 1.3, 1)
        await over(ctx.layer, 0.3, (t) => {
            ice.clear()
            for (const pl of pillars) drawCluster(ice, pl.base, pl.sp, 1 - ease.in(t) * 0.6, 1 - t)
            lane.g.clear()
            frostLane(lane.g, slam, fork, 1, 0.6 * (1 - t), 0.5 * (1 - t), 1 - t)
            frostLane(lane.g, fork, leftEnd, 1, 0.5 * (1 - t), 0.5 * (1 - t), 1 - t)
            frostLane(lane.g, fork, rightEnd, 1, 0.5 * (1 - t), 0.5 * (1 - t), 1 - t)
        })
        lane.done()
        ice.done()
    })()
})
