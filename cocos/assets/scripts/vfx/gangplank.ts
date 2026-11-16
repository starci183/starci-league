// VFX Gangplank trên Cocos, chuẩn chung "mọi tướng một bản" (mẫu Vel'Koz, công cụ kit.ts): THUỐC SÚNG BILGEWATER. Lửa thuốc súng
// cam vàng lõi trắng, khói súng xám ấm. Bộ chiêu mới (thầy chốt 2026-11-16): Đấu sĩ, mọi cú chỉ chạm tướng đối diện; Úp Lá thành
// Thùng ở ô phụ, Thuốc Súng +1 mỗi lượt; Thùng lá chiêu vỡ / nổ thì nổ vào tướng đối diện Gangplank.
// VFX_RULES §0.1: KHÔNG vẽ thùng gỗ, quả cam, giấy truy nã, đồng xu, đạn pháo, khẩu súng, dăm gỗ; không mảnh hình học, không nứt tối.
// Chỉ vẽ dấu vết chuyển động và năng lượng: vệt đạn / vệt chém (Graphics nhiều lớp: quầng sâu, thân, viền sáng, chỉ lõi), quầng
// sáng, tia lửa, làn khói, vòng sáng. Nổ = quầng sáng nở + tia lửa + làn khói, không mảnh vụn.
// Mỗi ô lấy ý từ đâu:
// - basic_gangplank: cú chém kiếm cong → một vệt chém liềm ánh thép vàng ngắn qua tướng đối diện, tia lửa toé theo hướng chém.
// - gangplank_p (Thuốc Súng Bilgewater): ở ô phụ một quầng lửa thuốc súng nhen lên, tia lửa xèo xèo bắn lên (+1 Thuốc Súng). Có mục
//   tiêu (Thùng lá chiêu vỡ / nổ): một vệt lửa chạy từ ô phụ tới tướng đối diện rồi nổ (quầng sáng nở, tia lửa, khói).
// - gangplank_q (Bắn Súng): loé nòng ở Gangplank, một vệt đạn sáng cực nhanh lao thẳng tới tướng đối diện, loé chạm, tia lửa văng
//   theo hướng bắn, làn khói súng nhỏ ở chỗ bắn.
// - gangplank_e (Ăn Cam): không mục tiêu. Quầng cam vàng ấm bùng quanh Gangplank, đốm sinh lực cam vàng dâng lên (hồi Máu), vòng
//   sáng nở ra rũ khống chế, vỏ ánh đồng vàng lung linh bọc thân (Giáp). Ô phụ trống thì một đốm lửa trôi sang ô phụ nhen lên (Thùng).
// - gangplank_r (Lệnh Truy Nã): ấn vàng (vòng sáng đôi xoay, bốn vạch ngắm) khoá trên đầu tướng đối diện, vệt đạn vàng lớn bắn
//   trúng nó, rồi vệt lửa từ ô phụ lao tới và nổ lớn trên tướng bị Truy Nã, sóng lửa loang trên đất.
import {
    Graphics, Node
} from "cc"
import {
    angleOf, burst, dist, ease, emit, lerp, mix, over, rand, type Pt
} from "./particles"
import {
    registerSkillVfx, type VfxCtx
} from "./registry"
import {
    canvas, charge, col, dust, groundWave, orb, seeded, softBeam, TAU, UP, type Palette
} from "./kit"
import {
    rowsOf
} from "./g1_helpers"

const WHITE = 0xfffaf0
const GOLD = 0xffd56a
const SMOKE = [0x5a4a40, 0x3e342e, 0x6e5e52]

/** Lửa thuốc súng: lõi trắng, cam, đỏ cam sâu */
const FIRE: Palette = {
    core: 0xfff4d8, main: 0xff8a24, deep: 0x8a2a08, accent: 0xffd060, dust: [0xffd060, 0xff9a30, 0xfff0b0]
}
/** Loé nòng / vệt đạn: trắng vàng nóng */
const MUZZLE: Palette = {
    core: WHITE, main: 0xffb030, deep: 0x9a4a10, accent: 0xfff0b0, dust: [0xfff0b0, 0xffb030, 0xffffff]
}
/** Ăn Cam: cam vàng ấm */
const CITRUS: Palette = {
    core: 0xfff6dc, main: 0xffa83a, deep: 0x7a3a0a, accent: 0xffe07a, dust: [0xffe07a, 0xffb84a, 0xfff6dc]
}
/** Truy Nã: vàng kim */
const WANTED: Palette = {
    core: 0xfffbe0, main: 0xffcc40, deep: 0x8a6010, accent: 0xfff0a0, dust: [GOLD, 0xfff0a0, 0xffffff]
}
/** Kiếm cong: ánh thép ấm viền vàng */
const STEEL: Palette = {
    core: 0xffffff, main: 0xf2ead8, deep: 0x8a6a3a, accent: 0xffe6a8, dust: [0xffe6a8, 0xf2ead8, 0xffffff]
}

const at = (p: Pt, dx: number, dy: number): Pt => ({
    x: p.x + dx, y: p.y + dy
})
const mainOf = (ctx: VfxCtx): Pt => ctx.to[0] ?? at(ctx.from, 0, 300)
/** Ô phụ (chỗ Thùng úp) cạnh Gangplank trên hàng mình */
const kegSpot = (ctx: VfxCtx): Pt => at(ctx.from, rowsOf(ctx).spacing * 0.55, -18)

// ---------- dấu vết ----------

/** Vệt chém liềm (cung tâm `c`, bán kính `r`) từ a0 tới a1; `head` 0..1 đầu vệt, `tail` độ dài vệt, `w` bề dày */
function crescent(g: Graphics, c: Pt, r: number, a0: number, a1: number, head: number, tail: number, w: number, p: Palette, alpha: number, seed: number) {
    const u0 = Math.max(0, head - tail)
    if (head - u0 < 0.004 || alpha <= 0.01) return
    const rnd = seeded(seed)
    const N = 32
    const outer: Pt[] = [], inner: Pt[] = []
    for (let i = 0; i <= N; i++) {
        const s = i / N
        const a = lerp(a0, a1, lerp(u0, head, s))
        const t = w * Math.pow(s, 0.8) * Math.min(1, (1 - s) * 9 + 0.2) * (0.8 + rnd() * 0.4)
        outer.push({ x: c.x + Math.cos(a) * (r + t * 0.12), y: c.y + Math.sin(a) * (r + t * 0.12) })
        inner.push({ x: c.x + Math.cos(a) * (r - t), y: c.y + Math.sin(a) * (r - t) })
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
 * Vệt THẲNG a -> b: `head` 0..1 đầu vệt, `tail` độ dài vệt phía sau, `w` bề rộng lớn nhất. Đầu nhọn, thân phình rồi thon về đuôi,
 * hơi cong theo `bend`. Lớp: quầng sâu, thân, viền sáng, chỉ lõi trắng dọc giữa.
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
        half.push(w * 0.5 * Math.pow(s, 0.9) * Math.min(1, (1 - s) * 7 + 0.15) * (0.85 + rnd() * 0.3))
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

/** Đầu vệt trắng nóng tại `p`: đốm sáng nhiều lớp + tàn lửa rơi lại dọc đường */
function hotHead(layer: Node, g: Graphics, p: Pt, pal: Palette, r: number) {
    orb(g, p, pal, r)
    emit(layer, p, { color: [pal.core, pal.accent, pal.main], kind: "dot", life: [0.12, 0.28], size: [6, 1], alpha: 1, speed: [10, 70], angle: [0, TAU], drag: 2 })
}

/** Tia lửa mảnh văng về `ang` ± `spread` rồi rơi, tàn lửa bay lên (không mảnh vụn, VFX_RULES §0.1) */
function fireSparks(layer: Node, p: Pt, pal: Palette, n: number, ang: number, spread: number, speed: [number, number] = [220, 560]) {
    void burst(layer, p, n, {
        color: [pal.core, pal.accent, pal.main], kind: "blade", life: [0.16, 0.38], size: [15, 2], alpha: 1, speed,
        angle: [ang - spread, ang + spread], drag: 1.6, gravity: -900, align: true, stretch: 2.8, spread: 6
    })
    void burst(layer, p, Math.round(n * 0.6), {
        color: pal.dust ?? [pal.accent, pal.main], kind: "dot", life: [0.4, 0.8], size: [5, 1], alpha: 0.9, speed: [30, 110],
        angle: [UP - 1, UP + 1], drag: 1.3, gravity: 50, spread: 10
    })
}

/** Làn khói súng mềm loang và bay lên (hoà thường, mờ) */
function smokePuff(layer: Node, p: Pt, n: number, size: number, ang = UP, spread = 1.2) {
    void burst(layer, p, n, {
        color: SMOKE, kind: "glow", additive: false, life: [0.5, 1.0], size: [size * 0.6, size * 1.6], alpha: 0.32, speed: [20, 70],
        angle: [ang - spread, ang + spread], drag: 1.4, gravity: 30, spread: size * 0.3
    })
}

/** Loé chạm không mảnh: quầng lõi trắng, quầng màu, vòng sáng, tia lửa văng NGƯỢC hướng đánh, bụi lửa */
function flashHit(layer: Node, p: Pt, pal: Palette, k: number, from?: Pt) {
    emit(layer, p, { color: [pal.core], kind: "glow", life: [0.16, 0.16], size: [50 * k, 150 * k], alpha: 1 })
    emit(layer, p, { color: [pal.main], kind: "glow", life: [0.32, 0.32], size: [100 * k, 210 * k], alpha: 0.7 })
    void burst(layer, p, 1, { color: [pal.accent], kind: "ring", life: [0.28, 0.28], size: [24, 170 * k], alpha: 0.85 })
    const back = from ? angleOf(p, from) : UP
    fireSparks(layer, p, pal, Math.round(12 * k), back, from ? 1.1 : Math.PI)
    void dust(layer, p, pal, Math.round(16 * k), 22)
}

/**
 * Nổ thuốc súng tại `p`, độ lớn `k`: quầng trắng chớp, quầng lửa cam nở to rồi tắt, vòng sáng lan, sóng lửa loang trên đất, tia lửa
 * toả mọi hướng rồi rơi, tàn lửa bay lên, làn khói súng cuộn lên sau cùng. Không mảnh vụn. Chạy nền.
 */
function blast(layer: Node, p: Pt, k: number) {
    emit(layer, p, { color: [FIRE.core], kind: "glow", life: [0.16, 0.16], size: [70 * k, 200 * k], alpha: 1 })
    emit(layer, p, { color: [FIRE.accent], kind: "glow", life: [0.3, 0.3], size: [120 * k, 260 * k], alpha: 0.85 })
    emit(layer, p, { color: [FIRE.main], kind: "glow", life: [0.5, 0.5], size: [160 * k, 300 * k], alpha: 0.6 })
    void burst(layer, p, 1, { color: [FIRE.accent], kind: "ring", life: [0.32, 0.32], size: [30, 240 * k], alpha: 0.9 })
    void burst(layer, p, 1, { color: [FIRE.core], kind: "ring", life: [0.22, 0.22], size: [20, 150 * k], alpha: 0.8 })
    groundWave(layer, at(p, 0, -40), FIRE, 140 * k, 0.5)
    fireSparks(layer, p, FIRE, Math.round(22 * k), UP, Math.PI, [260, 700])
    // lưỡi lửa ngắn bốc lên rồi tắt (quầng mềm bay lên, không hình khối)
    void burst(layer, p, Math.round(10 * k), {
        color: [FIRE.accent, FIRE.main, 0xff6a10], kind: "glow", life: [0.25, 0.5], size: [30 * k, 6], alpha: 0.8, speed: [80, 220],
        angle: [UP - 0.9, UP + 0.9], drag: 1.8, gravity: 120, spread: 20 * k
    })
    void dust(layer, p, FIRE, Math.round(24 * k), 30)
    smokePuff(layer, at(p, 0, 20), Math.round(8 * k), 60 * k)
}

/** Ô phụ nhen lửa (+Thuốc Súng): quầng lửa nhỏ, tia lửa xèo xèo bắn lên trong `secs`. Trả về khi xong */
async function powderFlare(layer: Node, spot: Pt, secs: number, k = 1) {
    emit(layer, spot, { color: [FIRE.core], kind: "glow", life: [0.16, 0.16], size: [20 * k, 70 * k], alpha: 0.9 })
    emit(layer, spot, { color: [FIRE.main], kind: "glow", life: [secs + 0.2, secs + 0.2], size: [50 * k, 110 * k], alpha: 0.5 })
    void burst(layer, at(spot, 0, -20), 1, { color: [FIRE.accent], kind: "ring", life: [0.35, 0.35], size: [30, 110 * k], alpha: 0.6 })
    await over(layer, secs, () => {
        if (Math.random() < 0.8) emit(layer, at(spot, rand(-10, 10), rand(-6, 10)), {
            color: [WHITE, GOLD, 0xff9a30], kind: "blade", life: [0.14, 0.3], size: [10, 2], alpha: 1, speed: [120, 280],
            angle: [UP - 0.9, UP + 0.9], gravity: -500, align: true, stretch: 2.2
        })
        if (Math.random() < 0.25) emit(layer, at(spot, rand(-14, 14), 10), {
            color: SMOKE, kind: "glow", additive: false, life: [0.5, 0.8], size: [14, 34], alpha: 0.25, speed: [15, 40], angle: [UP - 0.3, UP + 0.3]
        })
    })
}

/** Vệt lửa thuốc súng chạy a -> b trong `secs` (đường hơi vồng), đầu vệt trắng nóng. Trả về đúng lúc chạm; vệt tan chạy nền */
async function fireRun(layer: Node, a: Pt, b: Pt, secs: number, w: number, bend: number) {
    const g = canvas(layer)
    const seed = rand(1, 999)
    const d = angleOf(a, b)
    const nx = -Math.sin(d), ny = Math.cos(d)
    const P = (u: number): Pt => {
        const q = mix(a, b, u)
        const k = Math.sin(u * Math.PI) * bend
        return { x: q.x + nx * k, y: q.y + ny * k }
    }
    await over(layer, secs, (t) => {
        const u = ease.in(t)
        g.g.clear()
        streak(g.g, a, b, u, 0.7, w, FIRE, 1, seed, bend)
        hotHead(layer, g.g, P(u), FIRE, w * 0.5)
    })
    void over(layer, 0.25, (t) => {
        g.g.clear()
        streak(g.g, a, b, 1, 0.7 * (1 - ease.out(t)), w * (1 - t * 0.5), FIRE, 1 - t, seed, bend)
    }).then(() => g.done())
}

// ---------- Đánh thường ----------

/**
 * Đánh thường: vệt chém liềm ánh thép ấm quét chéo qua tướng đối diện (0,12 s), đầu vệt trắng. Chạm: loé, tia lửa toé theo hướng
 * chém. Không vẽ thanh kiếm.
 */
registerSkillVfx("basic_gangplank", async (ctx) => {
    const to = mainOf(ctx)
    const seed = rand(1, 999)
    const R = 90
    const mid = Math.PI + 0.5, sweep = 0.8
    const pivot = at(to, -Math.cos(mid) * R, -Math.sin(mid) * R)
    const a0 = mid - sweep, a1 = mid + sweep
    const arcAt = (u: number): Pt => {
        const a = lerp(a0, a1, u)
        return { x: pivot.x + Math.cos(a) * R, y: pivot.y + Math.sin(a) * R }
    }
    const g = canvas(ctx.layer)
    let hit = false
    const strike = () => {
        hit = true
        ctx.onBeat?.(0)
        flashHit(ctx.layer, to, STEEL, 0.6, arcAt(0.2))
        fireSparks(ctx.layer, to, MUZZLE, 8, angleOf(arcAt(0.3), arcAt(0.7)), 0.7)
    }
    await over(ctx.layer, 0.12, (t) => {
        const u = ease.in(t)
        g.g.clear()
        crescent(g.g, pivot, R, a0, a1, u, 0.85, 18, STEEL, 1, seed)
        hotHead(ctx.layer, g.g, arcAt(u), STEEL, 8)
        if (!hit && u >= 0.5) strike()
    })
    if (!hit) strike()
    void over(ctx.layer, 0.25, (t) => {
        g.g.clear()
        crescent(g.g, pivot, R, a0, a1, 1, 0.85 * (1 - ease.out(t)), 18 * (1 - t * 0.5), STEEL, 1 - t, seed)
    }).then(() => g.done())
})

// ---------- P Thuốc Súng Bilgewater ----------

/**
 * P: ở ô phụ cạnh Gangplank một quầng lửa thuốc súng nhen lên, tia lửa xèo xèo bắn lên (Thùng +1 Thuốc Súng). Có mục tiêu ở xa
 * (Thùng lá chiêu vỡ / nổ vào tướng đối diện): vệt lửa vồng từ ô phụ lao tới mục tiêu rồi nổ (quầng sáng nở, tia lửa, khói súng).
 * Không vẽ thùng.
 */
registerSkillVfx("gangplank_p", async (ctx) => {
    const spot = kegSpot(ctx)
    const to = ctx.to[0]
    await powderFlare(ctx.layer, spot, 0.35)
    if (to && dist(to, spot) > 60) {
        await fireRun(ctx.layer, spot, to, 0.26, 22, -50)
        ctx.onBeat?.(0)
        blast(ctx.layer, to, 0.9)
    } else {
        // không có đích: chớp nhỏ tại ô phụ
        emit(ctx.layer, spot, { color: [FIRE.accent], kind: "glow", life: [0.25, 0.25], size: [40, 120], alpha: 0.7 })
        fireSparks(ctx.layer, spot, FIRE, 8, UP, 1.2, [160, 360])
    }
})

// ---------- Q Bắn Súng ----------

/**
 * Q: lửa nòng tụ rất nhanh trước Gangplank, loé nòng (quầng trắng vàng, chùm tia lửa hướng bắn, khói súng), một vệt đạn sáng lao
 * thẳng tới tướng đối diện (0,09 s), đầu vệt trắng nóng. Chạm: loé, vòng sáng, tia lửa văng xuyên ra phía sau mục tiêu. Vệt tan
 * chạy nền. Không vẽ khẩu súng, không viên đạn.
 */
registerSkillVfx("gangplank_q", async (ctx) => {
    const me = ctx.from
    const to = mainOf(ctx)
    const seed = rand(1, 999)
    const dir = angleOf(me, to)
    const muzzle = at(me, Math.cos(dir) * 40, Math.sin(dir) * 40)
    await charge(ctx.layer, muzzle, MUZZLE, 0.12, 22)
    // loé nòng
    emit(ctx.layer, muzzle, { color: [WHITE], kind: "glow", life: [0.12, 0.12], size: [30, 110], alpha: 1 })
    emit(ctx.layer, muzzle, { color: [MUZZLE.main], kind: "glow", life: [0.22, 0.22], size: [60, 150], alpha: 0.7 })
    void burst(ctx.layer, muzzle, 10, {
        color: [WHITE, MUZZLE.accent, MUZZLE.main], kind: "blade", life: [0.08, 0.18], size: [26, 4], alpha: 1, speed: [300, 700],
        angle: [dir - 0.35, dir + 0.35], drag: 3, align: true, stretch: 2.6
    })
    smokePuff(ctx.layer, muzzle, 5, 34, dir, 0.6)
    // vệt đạn
    const g = canvas(ctx.layer)
    await over(ctx.layer, 0.09, (t) => {
        const u = ease.in(t)
        g.g.clear()
        softBeam(g.g, muzzle, mix(muzzle, to, u), MUZZLE, 10, 0.45)
        streak(g.g, muzzle, to, u, 0.55, 14, MUZZLE, 1, seed)
        hotHead(ctx.layer, g.g, mix(muzzle, to, u), MUZZLE, 9)
    })
    ctx.onBeat?.(0)
    flashHit(ctx.layer, to, MUZZLE, 0.9, me)
    fireSparks(ctx.layer, to, MUZZLE, 10, dir, 0.45, [300, 640])
    void over(ctx.layer, 0.22, (t) => {
        g.g.clear()
        streak(g.g, muzzle, to, 1, 0.55 * (1 - ease.out(t)), 14 * (1 - t * 0.6), MUZZLE, 1 - t, seed)
    }).then(() => g.done())
})

// ---------- E Ăn Cam ----------

/**
 * E (Quick, không mục tiêu): quầng cam vàng ấm bùng quanh Gangplank, đốm sinh lực cam vàng dâng lên (hồi Máu); một vòng sáng nở
 * vụt ra kèm tia sáng toả (giải khống chế); vỏ ánh đồng vàng lung linh bọc thân rồi khép (Giáp). Cuối cùng một đốm lửa trôi sang
 * ô phụ và nhen lên (lá úp thành Thùng khi ô phụ trống). Không vẽ quả cam.
 */
registerSkillVfx("gangplank_e", async (ctx) => {
    const me = ctx.from
    // hồi Máu: quầng cam vàng ấm
    emit(ctx.layer, me, { color: [CITRUS.core], kind: "glow", life: [0.22, 0.22], size: [50, 170], alpha: 0.85 })
    emit(ctx.layer, me, { color: [CITRUS.main], kind: "glow", life: [0.5, 0.5], size: [100, 220], alpha: 0.5 })
    void burst(ctx.layer, at(me, 0, -30), 20, {
        color: CITRUS.dust!, kind: "dot", life: [0.5, 0.9], size: [7, 1], alpha: 1, speed: [60, 160], angle: [UP - 0.25, UP + 0.25], drag: 0.8, spread: 44
    })
    // giải khống chế: vòng sáng vụt ra, tia sáng toả
    void burst(ctx.layer, me, 1, { color: [CITRUS.accent], kind: "ring", life: [0.3, 0.3], size: [40, 220], alpha: 0.9 })
    void burst(ctx.layer, me, 14, {
        color: [CITRUS.core, CITRUS.accent], kind: "blade", life: [0.14, 0.28], size: [22, 3], alpha: 1, speed: [260, 520],
        angle: [0, TAU], drag: 2.4, align: true, stretch: 2.6, spread: 20
    })
    groundWave(ctx.layer, at(me, 0, -40), CITRUS, 110, 0.45)
    // Giáp: vỏ ánh đồng vàng lung linh
    const shell = canvas(ctx.layer)
    await over(ctx.layer, 0.55, (t) => {
        shell.g.clear()
        const a = Math.min(1, t * 5) * (1 - ease.in(t))
        const rx = 72 - 6 * t, ry = 84 - 6 * t
        shell.g.fillColor = col(CITRUS.core, 0.07 * a)
        shell.g.ellipse(me.x, me.y + 4, rx, ry)
        shell.g.fill()
        for (const [lw, c, al] of [[7, CITRUS.deep, 0.22], [3, 0xe6a050, 0.6], [1.2, 0xfff0c0, 0.9]] as const) {
            shell.g.lineWidth = lw
            shell.g.strokeColor = col(c, al * a)
            shell.g.ellipse(me.x, me.y + 4, rx, ry)
            shell.g.stroke()
        }
        const h0 = t * 7
        shell.g.lineWidth = 2.2
        shell.g.strokeColor = col(0xffffff, 0.6 * a)
        for (let i = 0; i <= 10; i++) {
            const q = { x: me.x + Math.cos(h0 + i * 0.09) * (rx - 8), y: me.y + 4 + Math.sin(h0 + i * 0.09) * (ry - 8) }
            if (i === 0) shell.g.moveTo(q.x, q.y)
            else shell.g.lineTo(q.x, q.y)
        }
        shell.g.stroke()
    })
    shell.done()
    // lá úp thành Thùng ở ô phụ: đốm lửa trôi sang, nhen lên
    const spot = kegSpot(ctx)
    await fireRun(ctx.layer, at(me, 0, 10), spot, 0.2, 12, 40)
    await powderFlare(ctx.layer, spot, 0.3, 0.8)
})

// ---------- R Lệnh Truy Nã ----------

/** Ấn Truy Nã: vòng sáng vàng đôi xoay ngược nhau, bốn vạch ngắm thu vào tâm; `k` 0..1 độ hiện, `t` thời gian để xoay */
function wantedSigil(g: Graphics, c: Pt, r: number, k: number, t: number) {
    if (k <= 0.01) return
    for (const [rr, lw, color, al] of [[r, 7, WANTED.deep, 0.25], [r, 2.6, WANTED.main, 0.75], [r, 1.2, WANTED.core, 1], [r * 0.62, 2, WANTED.accent, 0.7]] as const) {
        g.lineWidth = lw
        g.strokeColor = col(color, al * k)
        g.ellipse(c.x, c.y, rr, rr * 0.9)
        g.stroke()
    }
    // cung sáng chạy trên vòng ngoài và vòng trong (ngược chiều)
    for (const [rr, sp, len] of [[r, 6, 0.9], [r * 0.62, -8, 0.7]] as const) {
        const h = t * sp
        g.lineWidth = 2.4
        g.strokeColor = col(0xffffff, 0.8 * k)
        for (let i = 0; i <= 12; i++) {
            const a = h + (i / 12) * len
            const q = { x: c.x + Math.cos(a) * rr, y: c.y + Math.sin(a) * rr * 0.9 }
            if (i === 0) g.moveTo(q.x, q.y)
            else g.lineTo(q.x, q.y)
        }
        g.stroke()
    }
    // bốn vạch ngắm thu vào
    const gap = r * (0.75 + 0.6 * (1 - k))
    for (let i = 0; i < 4; i++) {
        const a = i * (Math.PI / 2) + Math.PI / 4
        const p0 = { x: c.x + Math.cos(a) * (gap + r * 0.55), y: c.y + Math.sin(a) * (gap + r * 0.55) * 0.9 }
        const p1 = { x: c.x + Math.cos(a) * gap, y: c.y + Math.sin(a) * gap * 0.9 }
        for (const [lw, color, al] of [[6, WANTED.main, 0.3], [2, WANTED.core, 1]] as const) {
            g.lineWidth = lw
            g.strokeColor = col(color, al * k)
            g.moveTo(p0.x, p0.y)
            g.lineTo(p1.x, p1.y)
            g.stroke()
        }
    }
}

/**
 * R: ấn Truy Nã bằng ánh vàng hiện và khoá trên đầu tướng đối diện (vòng đôi xoay, bốn vạch ngắm thu vào), vòng sáng vàng siết quanh
 * nó. Loé nòng vàng ở Gangplank, vệt đạn vàng lớn lao tới: chạm (nhịp 0). Rồi vệt lửa từ ô phụ vồng tới và NỔ LỚN trên tướng bị
 * Truy Nã (nhịp 1), sóng lửa loang trên đất, tàn vàng toé. Ấn tan sau cùng. Không vẽ giấy, thùng, đạn pháo hay đồng xu.
 */
registerSkillVfx("gangplank_r", async (ctx) => {
    const me = ctx.from
    const to = mainOf(ctx)
    const seed = rand(1, 999)
    const dir = angleOf(me, to)
    const mark = at(to, 0, 96)
    const sig = canvas(ctx.layer)
    let clock = 0
    // ấn hiện và khoá
    emit(ctx.layer, mark, { color: [WANTED.core], kind: "glow", life: [0.2, 0.2], size: [30, 120], alpha: 1 })
    await over(ctx.layer, 0.32, (t) => {
        clock = t * 0.32
        sig.g.clear()
        wantedSigil(sig.g, mark, 34, ease.out(t), clock)
        if (Math.random() < 0.5) emit(ctx.layer, at(mark, rand(-30, 30), rand(-30, 30)), {
            color: WANTED.dust!, kind: "dot", life: [0.3, 0.5], size: [5, 1], alpha: 0.9, speed: [10, 40], angle: [UP - 0.6, UP + 0.6]
        })
    })
    void burst(ctx.layer, to, 1, { color: [WANTED.main], kind: "ring", life: [0.35, 0.35], size: [200, 70], alpha: 0.85 })
    emit(ctx.layer, to, { color: [WANTED.main], kind: "glow", life: [0.35, 0.35], size: [80, 180], alpha: 0.45 })
    // ấn giữ suốt phần còn lại (chạy nền), tan khi xong
    let live = true
    const hold = (async () => {
        while (live) {
            const base = clock
            await over(ctx.layer, 0.1, (t) => {
                clock = base + t * 0.1
                sig.g.clear()
                wantedSigil(sig.g, mark, 34, 1, clock)
            })
        }
    })()
    // loé nòng vàng, vệt đạn lớn
    const muzzle = at(me, Math.cos(dir) * 44, Math.sin(dir) * 44)
    await charge(ctx.layer, muzzle, WANTED, 0.16, 30)
    emit(ctx.layer, muzzle, { color: [WHITE], kind: "glow", life: [0.14, 0.14], size: [40, 140], alpha: 1 })
    void burst(ctx.layer, muzzle, 12, {
        color: [WHITE, WANTED.accent, WANTED.main], kind: "blade", life: [0.1, 0.2], size: [30, 4], alpha: 1, speed: [320, 760],
        angle: [dir - 0.35, dir + 0.35], drag: 3, align: true, stretch: 2.6
    })
    smokePuff(ctx.layer, muzzle, 6, 40, dir, 0.6)
    const g = canvas(ctx.layer)
    await over(ctx.layer, 0.1, (t) => {
        const u = ease.in(t)
        g.g.clear()
        softBeam(g.g, muzzle, mix(muzzle, to, u), WANTED, 16, 0.5)
        streak(g.g, muzzle, to, u, 0.6, 22, WANTED, 1, seed)
        hotHead(ctx.layer, g.g, mix(muzzle, to, u), WANTED, 12)
    })
    ctx.onBeat?.(0)
    flashHit(ctx.layer, to, WANTED, 1.1, me)
    void over(ctx.layer, 0.25, (t) => {
        g.g.clear()
        streak(g.g, muzzle, to, 1, 0.6 * (1 - ease.out(t)), 22 * (1 - t * 0.6), WANTED, 1 - t, seed)
    }).then(() => g.done())
    // Thùng kích nổ: vệt lửa từ ô phụ vồng tới mục tiêu, nổ lớn
    const spot = kegSpot(ctx)
    void powderFlare(ctx.layer, spot, 0.16, 1.1)
    await fireRun(ctx.layer, spot, to, 0.24, 28, -70)
    ctx.onBeat?.(1)
    blast(ctx.layer, to, 1.6)
    void burst(ctx.layer, to, 16, {
        color: [GOLD, 0xfff0a0, 0xffffff], kind: "dot", life: [0.5, 0.9], size: [8, 2], alpha: 1, speed: [160, 420],
        angle: [0.3, Math.PI - 0.3], gravity: -900
    })
    live = false
    await hold
    // ấn tan
    await over(ctx.layer, 0.3, (t) => {
        sig.g.clear()
        wantedSigil(sig.g, at(mark, 0, t * 16), 34 * (1 + t * 0.3), 1 - ease.in(t), clock + t * 0.3)
    })
    sig.done()
})
