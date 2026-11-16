// VFX Garen trên Cocos, chuẩn chung "mọi tướng một bản" (mẫu Vel'Koz, công cụ kit.ts): ÁNH SÁNG VÀNG DEMACIA.
// VFX_RULES §0.1: KHÔNG vẽ thanh kiếm. Chỉ vẽ DẤU VẾT của nhát chém: vệt chém sáng, đầu vệt lõi trắng nóng, đuôi mờ dần; chạm
// thì loé, tia lửa; vết chém đọng lại trên mục tiêu rồi nguội (trắng -> vàng -> hổ phách -> tắt). Vệt vẽ bằng Graphics nhiều lớp
// (quầng sâu, thân, viền sáng, chỉ lõi); hạt lo phần loé, mảnh, bụi. Ngẫu nhiên có hạt giống để mép vệt, vết nứt đứng yên.
// Mỗi ô lấy ý từ đâu:
// - basic_garen: nhát chém thường: vệt liềm vàng nhỏ quét chéo qua mục tiêu (0,14 s), loé + tia lửa, vết chém nhỏ nguội dần.
// - garen_p (Kiên Cường): icon là Garen đứng trong lửa XANH LỤC bốc từ chân; luật hồi Máu + cộng Giáp: lửa lục ngọc liếm lên
//   (màu hồi, không phải màu đòn), rồi vòng ánh sáng vàng siết quanh chân, khoá lại bằng các điểm loé.
// - garen_q (Đòn Quyết Định): icon lưỡi kiếm loé vàng chém xuống; chiêu gốc là cú bổ vào đầu. Garen tụ sáng, rồi MỘT vệt chém lớn
//   từ trên trái xuống dưới phải qua mục tiêu; vết chém đọng sáng rồi nguội. Câm Lặng là trạng thái: icon trên lá (VFX_RULES §4).
// - garen_e (Phán Xét): icon vệt xoay vàng; chiêu gốc là xoay kiếm. Vỏ sáng vàng bọc Garen, hai vệt chém tròn xoay quanh thân, ba
//   vệt chém xoáy bay tới tướng đối diện + 2 đường kề và cắt cùng một nhịp.
// - garen_r (Công Lý Demacia): icon nhát chém trời khổng lồ trong cột sáng vàng; một đường sáng mảnh báo trước trên mục tiêu, rồi
//   một vệt chém DỌC khổng lồ bổ từ trời xuống; loé sáng, sóng ánh sáng trên đất, tia lửa, vết chém dọc đọng lại rồi nguội.
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
    rowsOf, withNeighbours
} from "./g1_helpers"

const WHITE = 0xfffdf4
const PALE = 0xfff3b8
const GOLD = 0xffd34a
const AMBER = 0xffa41f
const BRONZE = 0x8a4e0c

/** Ánh sáng Demacia: lõi trắng, vàng, sâu đồng */
const LIGHT: Palette = {
    core: WHITE, main: GOLD, deep: BRONZE, accent: PALE, dust: [PALE, GOLD, AMBER, WHITE]
}
/** Lửa Kiên Cường (icon): lục ngọc, màu hồi */
const VERDANT: Palette = {
    core: 0xeaffd8, main: 0x6dff5a, deep: 0x0d6a3a, accent: 0x34ffb0, dust: [0xa6ff5a, 0x34ffb0, 0xeaffd8]
}

const at = (p: Pt, dx: number, dy: number): Pt => ({
    x: p.x + dx, y: p.y + dy
})
const mainOf = (ctx: VfxCtx): Pt => ctx.to[0] ?? at(ctx.from, 0, 300)

// ---------- dấu vết nhát chém ----------

/**
 * Vệt chém liềm: cung tâm `c` bán kính `r` (ép dẹt `sq`), vệt đi từ góc a0 tới a1. `head` 0..1 là chỗ đầu vệt, `tail` độ dài
 * vệt (phần cung), `w` bề dày lớn nhất (ngay sau đầu). Mép ngoài sắc có răng cưa nhỏ theo `seed`, mép trong loang; lớp: quầng
 * sâu, thân, viền sáng, chỉ lõi 1,4 px ở mép ngoài.
 */
function crescent(g: Graphics, c: Pt, r: number, a0: number, a1: number, head: number, tail: number, w: number, p: Palette, alpha: number, seed: number, sq = 1) {
    const u0 = Math.max(0, head - tail)
    if (head - u0 < 0.004 || alpha <= 0.01) return
    const rnd = seeded(seed)
    const N = 32
    const outer: Pt[] = [], inner: Pt[] = []
    for (let i = 0; i <= N; i++) {
        const s = i / N
        const a = lerp(a0, a1, lerp(u0, head, s))
        const t = w * Math.pow(s, 0.8) * Math.min(1, (1 - s) * 9 + 0.2) * (0.8 + rnd() * 0.4)
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
    band(1.35, p.deep, 0.14)
    band(1, p.main, 0.3)
    band(0.62, p.main, 0.55)
    band(0.3, p.accent, 0.8)
    for (const [lw, color, a] of [[3.2, p.accent, 0.55], [1.4, p.core, 1]] as const) {
        g.lineWidth = lw
        g.strokeColor = col(color, a * alpha)
        g.moveTo(outer[0].x, outer[0].y)
        for (const q of outer) g.lineTo(q.x, q.y)
        g.stroke()
    }
}

/**
 * Vệt chém THẲNG a -> b: `head` 0..1 là chỗ đầu vệt, `tail` độ dài vệt phía sau, `w` bề rộng lớn nhất (ngay sau đầu). Đầu vệt
 * nhọn, thân phình rồi thon về đuôi; hai mép răng cưa nhỏ theo `seed`, hơi cong theo `bend` (px lệch vuông góc ở giữa đường).
 * Lớp: quầng sâu, thân, viền sáng, chỉ lõi trắng dọc giữa.
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
    band(1.35, p.deep, 0.14)
    band(1, p.main, 0.3)
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

/** Đường vết chém gãy khúc nhẹ theo `path` 0..1 (seed giữ hình đứng yên giữa các khung) */
function scarPath(path: (v: number) => Pt, n: number, jag: number, seed: number): Pt[] {
    const rnd = seeded(seed)
    const out: Pt[] = []
    for (let i = 0; i <= n; i++) {
        const q = path(i / n)
        const k = i === 0 || i === n ? 0 : (rnd() - 0.5) * 2 * jag
        out.push({ x: q.x + k, y: q.y + k * 0.6 })
    }
    return out
}

/**
 * Vết chém đọng trên mục tiêu, nguội theo `heat` 1 -> 0: lõi trắng nóng, rồi vàng, rồi hổ phách sẫm, rồi tắt. `w` bề rộng quầng,
 * nét lõi 1,3 px (VFX_RULES §7). `grow` 0..1: vết mở từ giữa ra hai đầu.
 */
function drawScar(g: Graphics, pts: Pt[], heat: number, alpha: number, w: number, grow = 1) {
    if (alpha <= 0.01 || pts.length < 2) return
    const n = pts.length - 1
    const lo = Math.max(0, Math.floor(n * (0.5 - grow / 2))), hi = Math.min(n, Math.ceil(n * (0.5 + grow / 2)))
    if (hi <= lo) return
    const line = (lw: number, c: number, a: number) => {
        if (a <= 0.01) return
        g.lineWidth = lw
        g.strokeColor = col(c, Math.min(1, a) * alpha)
        g.moveTo(pts[lo].x, pts[lo].y)
        for (let i = lo; i <= hi; i++) g.lineTo(pts[i].x, pts[i].y)
        g.stroke()
    }
    line(w, BRONZE, 0.22 * (0.4 + 0.6 * heat))
    line(w * 0.5, heat > 0.45 ? GOLD : AMBER, 0.3 + 0.5 * heat)
    line(Math.max(1.4, w * 0.2), heat > 0.6 ? PALE : AMBER, 0.4 + 0.6 * heat)
    line(1.3, WHITE, heat * 1.4 - 0.4)
}

/** Đầu vệt trắng nóng tại `p`: đốm sáng nhiều lớp + hạt sáng rơi lại dọc đường chém */
function hotHead(layer: Node, g: Graphics, p: Pt, r: number) {
    orb(g, p, LIGHT, r)
    emit(layer, p, { color: [WHITE, PALE, GOLD], kind: "dot", life: [0.12, 0.28], size: [6, 1], alpha: 1, speed: [10, 70], angle: [0, TAU], drag: 2 })
}

// ---------- hình khối phụ ----------

/** Lưỡi lửa bốc lên từ dải chân `base` rộng `wid`, cao `h`; mỗi lưỡi lệch, đung đưa theo pha riêng (seed) */
function flames(g: Graphics, base: Pt, wid: number, h: number, t: number, seed: number, p: Palette, alpha: number, sq = 0.4) {
    const rnd = seeded(seed)
    for (let i = 0; i < 11; i++) {
        const ang = rnd() * TAU
        const x0 = base.x + Math.cos(ang) * wid * 0.5 * (0.5 + rnd() * 0.5)
        const y0 = base.y + Math.sin(ang) * wid * 0.5 * sq
        const ph = rnd() * TAU
        const H = h * (0.45 + rnd() * 0.6) * (0.82 + 0.18 * Math.sin(t * 21 + ph * 2))
        const sway = Math.sin(t * 13 + ph) * H * 0.16
        const bw = wid * 0.09 * (0.7 + rnd() * 0.6)
        for (const [k, c, a] of [[1.7, p.deep, 0.22], [1, p.main, 0.5], [0.55, p.accent, 0.75], [0.25, p.core, 0.9]] as const) {
            const hh = H * (0.5 + 0.5 * Math.min(1, k))
            const tip = { x: x0 + sway, y: y0 + hh }
            g.fillColor = col(c, a * alpha)
            g.moveTo(x0 - bw * k, y0)
            g.quadraticCurveTo(x0 - bw * k * 0.5 + sway * 0.3, y0 + hh * 0.55, tip.x, tip.y)
            g.quadraticCurveTo(x0 + bw * k * 0.7 + sway * 0.6, y0 + hh * 0.45, x0 + bw * k, y0)
            g.close()
            g.fill()
        }
    }
}

/** Tia lửa sáng có trọng lực, văng về hướng `ang` ± `spread` */
function sparks(layer: Node, p: Pt, n: number, ang: number, spread: number, speed: [number, number] = [260, 620]) {
    void burst(layer, p, n, {
        color: [WHITE, PALE, GOLD, AMBER], kind: "blade", life: [0.16, 0.4], size: [16, 3], alpha: 1, speed,
        angle: [ang - spread, ang + spread], drag: 1.6, gravity: -900, align: true, stretch: 3
    })
}

// ---------- Đánh thường ----------

/**
 * Đánh thường: một vệt chém liềm vàng nhỏ quét chéo qua mục tiêu (0,14 s, nhỏ và mảnh hơn Q), đầu vệt trắng nóng. Chạm: loé, tia
 * lửa văng theo hướng chém; vết chém nhỏ đọng trên mục tiêu rồi nguội, vệt tan (chạy nền).
 */
registerSkillVfx("basic_garen", async (ctx) => {
    const to = mainOf(ctx)
    const seed = rand(1, 999)
    const c = at(to, 48, 44)
    const R = 72
    const a0 = 2.9, a1 = 4.95
    const g = canvas(ctx.layer)
    const arcAt = (u: number): Pt => {
        const a = lerp(a0, a1, u)
        return { x: c.x + Math.cos(a) * R, y: c.y + Math.sin(a) * R }
    }
    emit(ctx.layer, arcAt(0), { color: [PALE], kind: "glow", life: [0.16, 0.16], size: [20, 60], alpha: 1 })
    await over(ctx.layer, 0.14, (t) => {
        const u = ease.out(t)
        g.g.clear()
        crescent(g.g, c, R, a0, a1, u, 0.8, 18, LIGHT, 1, seed)
        hotHead(ctx.layer, g.g, arcAt(u), 9)
    })
    impact(ctx.layer, to, LIGHT, 0.7, ctx.from)
    sparks(ctx.layer, to, 10, angleOf(arcAt(0.4), arcAt(0.9)), 0.7)
    const scar = canvas(ctx.layer)
    const pts = scarPath((v) => arcAt(lerp(0.25, 0.8, v)), 10, 1.6, seed + 3)
    void over(ctx.layer, 0.4, (t) => {
        g.g.clear()
        if (t < 0.6) crescent(g.g, c, R + t * 6, a0, a1, 1, 0.8 * (1 - t * 0.6), 18 * (1 - t * 0.6), LIGHT, 1 - t / 0.6, seed)
        scar.g.clear()
        drawScar(scar.g, pts, 1 - t, 1 - ease.in(t), 10)
    }).then(() => { g.done(); scar.done() })
})

// ---------- P Kiên Cường ----------

/**
 * P Kiên Cường (đòn đánh trúng: hồi Máu, cộng 1 tầng Giáp): lửa lục ngọc bén từ chân Garen, bùng lên ôm lấy thân (màu hồi,
 * hạt bay lên, không mảnh vỡ), rồi một vòng ánh sáng vàng siết lại quanh chân, các điểm loé chạy trên vòng rồi khoá lại. Lửa tàn
 * chạy nền.
 */
registerSkillVfx("garen_p", async (ctx) => {
    const me = ctx.from
    const foot = at(me, 0, -42)
    const seed = rand(1, 999)
    const fire = canvas(ctx.layer)
    const ring = canvas(ctx.layer)
    emit(ctx.layer, me, { color: [VERDANT.deep], kind: "glow", life: [0.9, 0.9], size: [120, 200], alpha: 0.5 })
    // lửa bén rồi bùng; hạt hồi bay lên
    await over(ctx.layer, 0.42, (t) => {
        fire.g.clear()
        flames(fire.g, foot, 120, lerp(18, 120, ease.out(t)), t, seed, VERDANT, Math.min(1, t * 3))
        for (let i = 0; i < 2; i++) emit(ctx.layer, at(foot, rand(-55, 55), rand(0, 30)), {
            color: VERDANT.dust!, kind: "dot", life: [0.4, 0.8], size: [7, 1], alpha: 1, speed: [70, 170], angle: [UP - 0.2, UP + 0.2], drag: 0.8
        })
    })
    // vòng sáng vàng siết lại, các điểm loé chạy quanh vòng
    const glints = Array.from({ length: 8 }, (_, i) => i / 8 * TAU + rand(-0.15, 0.15))
    await over(ctx.layer, 0.18, (t) => {
        fire.g.clear()
        flames(fire.g, foot, 120, 120, 0.42 + t * 0.4, seed, VERDANT, 1)
        ring.g.clear()
        const r = lerp(110, 62, ease.in(t))
        for (const [lw, c, a] of [[7, BRONZE, 0.2], [3, GOLD, 0.7], [1.2, WHITE, 1]] as const) {
            ring.g.lineWidth = lw
            ring.g.strokeColor = col(c, a * Math.min(1, t * 4))
            ring.g.ellipse(foot.x, foot.y, r, r * 0.4)
            ring.g.stroke()
        }
        for (const a0 of glints) {
            const a = a0 + t * 2.2
            orb(ring.g, { x: foot.x + Math.cos(a) * r, y: foot.y + Math.sin(a) * r * 0.4 }, LIGHT, 7, Math.min(1, t * 4))
        }
    })
    ctx.onBeat?.(0)
    emit(ctx.layer, me, { color: [VERDANT.core], kind: "glow", life: [0.25, 0.25], size: [60, 180], alpha: 0.8 })
    emit(ctx.layer, foot, { color: [GOLD], kind: "glow", life: [0.3, 0.3], size: [60, 150], alpha: 0.6 })
    void burst(ctx.layer, foot, 1, { color: [PALE], kind: "ring", life: [0.3, 0.3], size: [150, 110], alpha: 0.8 })
    void dust(ctx.layer, me, VERDANT, 26, 46)
    // tàn: lửa hạ dần, vòng sáng mờ (chạy nền)
    void over(ctx.layer, 0.45, (t) => {
        fire.g.clear()
        flames(fire.g, foot, 120 * (1 - t * 0.3), 120 * (1 - ease.in(t)), 0.6 + t, seed, VERDANT, 1 - t)
        ring.g.clear()
        for (const [lw, c, a] of [[3, GOLD, 0.6], [1.2, WHITE, 0.9]] as const) {
            ring.g.lineWidth = lw
            ring.g.strokeColor = col(c, a * (1 - t))
            ring.g.ellipse(foot.x, foot.y, 62, 25)
            ring.g.stroke()
        }
    }).then(() => { fire.done(); ring.done() })
})

// ---------- Q Đòn Quyết Định ----------

/**
 * Q (thầy chốt 2026-11-16: MỘT nhát chém, không vẽ kiếm): ánh vàng tụ ở Garen, rồi MỘT vệt chém lớn quét từ trên trái xuống dưới
 * phải qua tướng đối diện (0,13 s): vệt vàng dày, đầu trắng nóng, đuôi mờ dần. Nhịp số đúng lúc đầu vệt đi qua giữa mục tiêu: loé
 * lớn, tia lửa văng theo hướng chém. Vết chém sáng đọng lại chéo trên mục tiêu rồi nguội (trắng -> vàng -> hổ phách), bụi sáng bay
 * lên (chạy nền). Câm Lặng dùng icon trạng thái trên lá.
 */
registerSkillVfx("garen_q", async (ctx) => {
    const me = ctx.from
    const to = mainOf(ctx)
    const seed = rand(1, 999)
    await charge(ctx.layer, at(me, 26, 34), LIGHT, 0.18, 34)
    // cung chém: tâm ở trên phải mục tiêu, mục tiêu nằm đúng giữa cung (góc 225°), vệt đi từ trên trái xuống dưới phải
    const R = 150
    const pivot = at(to, R * Math.SQRT1_2, R * Math.SQRT1_2)
    const mid = Math.PI * 1.25, sweep = 0.78
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
        impact(ctx.layer, to, LIGHT, 1.15, arcAt(0.2))
        sparks(ctx.layer, to, 16, slashDir, 0.55, [320, 720])
        emit(ctx.layer, to, { color: [WHITE], kind: "glow", life: [0.14, 0.14], size: [200, 70], alpha: 1 })
        void dust(ctx.layer, to, LIGHT, 22, 40)
    }
    emit(ctx.layer, arcAt(0), { color: [PALE], kind: "glow", life: [0.14, 0.14], size: [30, 90], alpha: 1 })
    await over(ctx.layer, 0.13, (t) => {
        const u = ease.in(t)
        trail.g.clear()
        crescent(trail.g, pivot, R, a0, a1, u, 0.85, 30, LIGHT, 1, seed)
        hotHead(ctx.layer, trail.g, arcAt(u), 15)
        if (!hit && u >= 0.5) strike()
    })
    if (!hit) strike()
    // vết chém đọng chéo qua mục tiêu, nguội dần; vệt tan (chạy nền)
    const scar = canvas(ctx.layer)
    const pts = scarPath((v) => arcAt(lerp(0.18, 0.82, v)), 14, 2.2, seed + 11)
    void over(ctx.layer, 0.6, (t) => {
        trail.g.clear()
        if (t < 0.5) crescent(trail.g, pivot, R + t * 8, a0, a1, 1, 0.85 * (1 - t), 30 * (1 - t), LIGHT, 1 - t * 2, seed)
        scar.g.clear()
        drawScar(scar.g, pts, 1 - t, 1 - ease.in(t), 16, ease.out(Math.min(1, t * 6 + 0.4)))
        if (t < 0.6 && Math.random() < 0.5) emit(ctx.layer, pts[Math.floor(rand(2, pts.length - 2))], {
            color: [PALE, GOLD, AMBER], kind: "dot", life: [0.3, 0.6], size: [5, 1], alpha: 1, speed: [20, 70], angle: [UP - 0.7, UP + 0.7], gravity: 40
        })
    }).then(() => { trail.done(); scar.done() })
})

// ---------- E Phán Xét ----------

/**
 * E (Quick): vỏ sáng vàng bọc Garen (vỏ ánh sáng trong suốt, viền vàng, vệt bóng xoay: dáng khiên phép, không phải đòn), hai vệt
 * chém tròn xoay quanh thân; giữa vòng xoay ba vệt chém xoáy văng tới tướng đối diện và 2 đường kề (đúng các ô engine đánh), chạm
 * cùng một nhịp: mỗi ô một nhát cắt xoáy, loé, tia lửa. Vỏ sáng và vòng xoay tan chạy nền.
 */
registerSkillVfx("garen_e", async (ctx) => {
    const me = ctx.from
    const to = mainOf(ctx)
    const rows = rowsOf(ctx)
    const lanes = withNeighbours(rows.foe, to, rows.spacing)
    const seed = rand(1, 999)
    const spin = canvas(ctx.layer)
    const shell = canvas(ctx.layer)
    const drawShell = (a: number, t: number) => {
        shell.g.clear()
        if (a <= 0.01) return
        shell.g.fillColor = col(PALE, 0.07 * a)
        shell.g.ellipse(me.x, me.y + 4, 74, 86)
        shell.g.fill()
        for (const [lw, c, al] of [[8, BRONZE, 0.16], [3.5, GOLD, 0.5], [1.3, WHITE, 0.95]] as const) {
            shell.g.lineWidth = lw
            shell.g.strokeColor = col(c, al * a)
            shell.g.ellipse(me.x, me.y + 4, 74, 86)
            shell.g.stroke()
        }
        // vệt bóng xoay trên vỏ sáng
        const h0 = t * 5
        shell.g.lineWidth = 2.4
        shell.g.strokeColor = col(WHITE, 0.6 * a)
        for (let i = 0; i <= 10; i++) {
            const q = { x: me.x + Math.cos(h0 + i * 0.09) * 66, y: me.y + 4 + Math.sin(h0 + i * 0.09) * 78 }
            if (i === 0) shell.g.moveTo(q.x, q.y)
            else shell.g.lineTo(q.x, q.y)
        }
        shell.g.stroke()
    }
    const drawSpin = (t: number, a: number) => {
        spin.g.clear()
        const base = t * TAU * 2.2
        for (let i = 0; i < 2; i++) {
            const s = base + i * Math.PI
            crescent(spin.g, at(me, 0, -10), 70, s, s + 2.6, 1, 0.55, 20, LIGHT, a, seed + i, 0.42)
        }
    }
    emit(ctx.layer, me, { color: [GOLD], kind: "glow", life: [0.3, 0.3], size: [80, 200], alpha: 0.7 })
    // vỏ sáng dựng + vòng xoay lấy đà
    await over(ctx.layer, 0.18, (t) => {
        drawShell(ease.out(t), t)
        drawSpin(t * 0.4, ease.out(t))
    })
    // vệt chém xoáy văng tới từng ô, vừa bay vừa xoáy
    const blades = canvas(ctx.layer)
    const T = 0.24
    await over(ctx.layer, T, (t) => {
        drawShell(1, 0.18 + t)
        drawSpin(0.072 + t * 0.6, 1)
        blades.g.clear()
        const u = ease.in(t)
        lanes.forEach((p, i) => {
            const q = mix(at(me, 0, 20), p, u)
            const s = t * TAU * 3 + i
            crescent(blades.g, q, 30 + 10 * u, s, s + 2.4, 1, 0.6, 12, LIGHT, 1, seed + 7 + i, 0.6)
            emit(ctx.layer, q, { color: LIGHT.dust!, kind: "dot", life: [0.15, 0.3], size: [5, 1], alpha: 0.9, speed: [10, 60], spread: 14 })
        })
    })
    blades.done()
    ctx.onBeat?.(0)
    const cuts = canvas(ctx.layer)
    for (const p of lanes) {
        impact(ctx.layer, p, LIGHT, 0.85, me)
        sparks(ctx.layer, p, 7, angleOf(p, me), 1)
    }
    // dư âm chạy nền: nhát cắt xoáy ở mỗi ô tan dần, vòng xoay chậm lại, vỏ sáng mờ
    void over(ctx.layer, 0.4, (t) => {
        cuts.g.clear()
        lanes.forEach((p, i) => {
            const s = 1.2 + i + ease.out(t) * 2.4
            crescent(cuts.g, p, 46, s, s + 2.9, 1, 0.85, 18 * (1 - t * 0.6), LIGHT, 1 - t, seed + 20 + i, 0.55)
        })
        drawSpin(0.22 + ease.out(t) * 0.25, 1 - t)
        drawShell(1 - ease.in(t), 0.42 + t)
    }).then(() => { cuts.done(); spin.done(); shell.done() })
})

// ---------- R Công Lý Demacia ----------

/**
 * R (không vẽ kiếm): Garen giơ tay gọi (ánh vàng tụ); một đường sáng mảnh báo trước hiện trên mục tiêu (0,15 s, chập chờn); rồi
 * một vệt chém DỌC khổng lồ bổ từ trời thẳng xuống mục tiêu (0,12 s): vàng, lõi trắng, đầu vệt trắng nóng, gió rít hai bên. Chạm:
 * loé trắng lớn (sát thương chuẩn), sóng ánh sáng vàng loang trên đất, tia lửa và bụi sáng hất lên (không mảnh vỡ, không nứt tối).
 * Dư âm chạy nền: vệt chém rút vào đất, vết chém dọc đọng trên mục tiêu rồi nguội.
 */
registerSkillVfx("garen_r", async (ctx) => {
    const me = ctx.from
    const to = mainOf(ctx)
    const seed = rand(1, 999)
    // vệt rộng nhất 42 px, quầng ngoài ≤ ~57 px (VFX_RULES §3 / §7: chiêu cuối được rộng hơn nhưng gọn trong ô mục tiêu)
    const W = 42
    const land = at(to, 0, -40)
    const top = at(to, 0, 180)
    const g = canvas(ctx.layer)
    void charge(ctx.layer, at(me, 0, 40), LIGHT, 0.24, 44)
    // đường sáng báo trước: mảnh, chập chờn, rọi từ trên xuống
    await over(ctx.layer, 0.15, (t) => {
        g.g.clear()
        const flick = 0.75 + 0.25 * Math.sin(t * 70)
        softBeam(g.g, top, mix(top, land, ease.out(Math.min(1, t * 2))), LIGHT, 3 + 4 * t, (0.4 + 0.5 * t) * flick)
        emit(ctx.layer, top, { color: [PALE, WHITE], kind: "glow", life: [0.06, 0.08], size: [20, 40 + 30 * t], alpha: 0.8 })
    })
    // vệt chém dọc bổ xuống
    await over(ctx.layer, 0.12, (t) => {
        const u = ease.in(t)
        g.g.clear()
        softBeam(g.g, top, land, LIGHT, 6, 0.6 * (1 - u))
        streak(g.g, top, land, u, 0.9, W, LIGHT, 1, seed)
        const head = mix(top, land, u)
        hotHead(ctx.layer, g.g, head, 20)
        // gió rít hai bên vệt
        for (const s of [-1, 1]) emit(ctx.layer, at(head, s * rand(16, 30), rand(10, 60)), {
            color: [PALE, WHITE], kind: "blade", life: [0.1, 0.16], size: [36, 4], alpha: 0.8, rotation: UP, stretch: 3, speed: [200, 340], angle: [UP, UP]
        })
    })
    ctx.onBeat?.(0)
    impact(ctx.layer, to, LIGHT, 1.6, top)
    emit(ctx.layer, land, { color: [WHITE], kind: "glow", life: [0.16, 0.16], size: [260, 80], alpha: 1 })
    groundWave(ctx.layer, land, LIGHT, 170, 0.5, 0.4)
    sparks(ctx.layer, land, 18, UP, 1.1, [300, 760])
    // thầy chốt 2026-11-16: bỏ mảnh tam giác, đất vụn và vết nứt tối (trông "hình học"); chỉ còn ánh sáng, tia lửa, bụi sáng
    void dust(ctx.layer, land, LIGHT, 40, 60)
    const scar = canvas(ctx.layer)
    const pts = scarPath((v) => mix(at(to, 0, 70), land, v), 14, 2.4, seed + 5)
    // dư âm chạy nền
    void (async () => {
        await over(ctx.layer, 0.28, (t) => {
            g.g.clear()
            // vệt rút vào đất: đuôi ngắn dần về điểm chạm
            streak(g.g, top, land, 1, 0.9 * (1 - ease.out(t)), W * (1 - t * 0.4), LIGHT, 1 - t * 0.5, seed)
            scar.g.clear()
            drawScar(scar.g, pts, 1, Math.min(1, t * 4), 18, ease.out(Math.min(1, t * 3)))
        })
        g.done()
        // vết chém dọc nguội, bụi sáng bốc khỏi vết, nứt nguội
        await over(ctx.layer, 0.5, (t) => {
            scar.g.clear()
            drawScar(scar.g, pts, 1 - t, 1 - ease.in(t), 18)
            if (Math.random() < 0.6) emit(ctx.layer, pts[Math.floor(rand(1, pts.length - 1))], {
                color: LIGHT.dust!, kind: "dot", life: [0.4, 0.8], size: [6, 1], alpha: 1, speed: [30, 110], angle: [UP - 0.9, UP + 0.9], gravity: 40
            })
        })
        scar.done()
    })()
})
