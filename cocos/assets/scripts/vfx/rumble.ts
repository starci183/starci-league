// VFX Rumble trên Cocos theo docs/VFX_RULES.md, bám icon chiêu (art/skills/rumble_*.png) và chiêu gốc LMHT:
// - Nội tại (icon thân mech đồng): phế liệu (bánh răng, tấm thép) bị hút về, ống xả phụt hơi nóng.
// - Q Súng Phun Lửa (icon vòi phun lửa): luồng lửa hình nón phun từ Rumble tới ô đối diện và 2 ô kề, lửa trắng vàng -> cam ->
//   đỏ -> khói đen, than hồng bay lên, vệt cháy xém.
// - E Khiên Phế Liệu (icon khiên đồng + điện xanh; lao móc điện): lao móc thép bắn tới địch kéo dây điện xanh lách tách, trúng
//   là nổ điện (nhịp 0); rồi các tấm thép đồng bay về ghép thành khiên tròn quanh Rumble, điện xanh bao viền (nhịp 1: Khiên).
// - R Mưa Tên Lửa (icon chùm tên lửa đầu đỏ): tên lửa bay vòng lên rồi lao xuống từng tướng địch theo hàng, mỗi quả một nhịp,
//   nổ cầu lửa + khói + mảnh, vết cháy xém.
// - Đánh thường: cận chiến, nắm đấm mech nện tại mục tiêu, tia lửa kim loại.
import {
    Graphics, Node
} from "cc"
import {
    angleOf, burst, dist, ease, emit, lerp, mix, over, rand, wait, type Pt
} from "./particles"
import {
    registerSkillVfx, type Hop, type VfxCtx
} from "./registry"
import {
    TAU, UP, arcPt, canvas, col, polar, polyline, seeded, taper
} from "./shape"

const WHITE = 0xfff8e6
const YELLOW = 0xffd25a
const ORANGE = 0xff8a1e
const RED = 0xd8361a
const COPPER = 0xb8733a
const BRONZE = 0x8c5a2b
const STEEL = 0x8f979e
const DARKSTEEL = 0x4a5056
const ELECTRIC = 0x6fd6ff
const ELECTRIC_CORE = 0xe6fbff
const SMOKE = [0x3a3632, 0x524c46, 0x2a2622]
const FLAME = [WHITE, YELLOW, ORANGE, RED]
const EMBERS = [YELLOW, ORANGE, RED]
const FALL = -700

const power = (ctx: VfxCtx) => ctx.style.intensity ?? 1

/**
 * Chia các cú của một lần dùng chiêu thành nhịp, dùng chung cho màn trận và Thư viện tướng: Q một nhịp cho cả 3 ô (lửa phun
 * cùng lúc); E mỗi cú một nhịp (sát thương rồi Khiên); R mỗi tên lửa (mỗi tướng) một nhịp.
 */
export function rumbleGroups<T extends { kind: string }>(skill: string, list: T[]): T[][] {
    if (skill === "Q") return list.length ? [list] : []
    return list.map((h) => [h])
}

// ---------- chất liệu ----------

/** Tia lửa kim loại văng ngược hướng đánh, rơi theo trọng lực */
function sparks(layer: Node, at: Pt, back: number, n: number, k: number) {
    void burst(layer, at, Math.round(n * k), {
        color: [WHITE, YELLOW, ORANGE], kind: "blade", life: [0.12, 0.28], size: [12 * k, 2], alpha: 1, speed: [180, 460],
        angle: [back - 0.9, back + 0.9], drag: 2.2, align: true, stretch: 2.2, gravity: FALL * 0.5
    })
}

/** Khói đen dày bốc lên, loang và tan */
function smoke(layer: Node, at: Pt, n: number, size: number, spread = 10) {
    void burst(layer, at, n, {
        color: SMOKE, kind: "glow", additive: false, life: [0.6, 1.1], size: [size * 0.5, size * 1.6], alpha: 0.45, speed: [15, 60],
        angle: [UP - 0.7, UP + 0.7], drag: 1.2, spread
    })
}

/** Than hồng nhỏ bay lên lập loè */
function embers(layer: Node, at: Pt, n: number, spread: number) {
    void burst(layer, at, n, {
        color: EMBERS, kind: "dot", life: [0.5, 1.0], size: [2.6, 0.8], alpha: 1, speed: [20, 90], angle: [UP - 0.8, UP + 0.8],
        gravity: 60, drag: 0.8, spread
    })
}

/** Vệt cháy xém: vết sẫm loang trên đất dưới mục tiêu, mờ dần (chạy nền) */
function scorch(layer: Node, at: Pt, r: number, secs = 0.9) {
    const c = canvas(layer, false)
    const rnd = seeded(at.x * 7 + at.y)
    const blobs = Array.from({ length: 7 }, () => ({ x: (rnd() - 0.5) * r * 1.4, y: (rnd() - 0.5) * r * 0.5, r: r * (0.3 + rnd() * 0.4) }))
    void over(layer, secs, (t) => {
        c.g.clear()
        c.g.fillColor = col(0x140c06, 0.4 * (1 - t))
        for (const b of blobs) c.g.ellipse(at.x + b.x, at.y - r * 0.5 + b.y, b.r, b.r * 0.4)
        c.g.fill()
    }).then(c.done)
}

// ---------- Đánh thường ----------

/** Đánh thường (cận chiến): nắm đấm mech nện ngay tại mục tiêu, vệt đồng ngắn, tia lửa kim loại, sóng va dẹt. Xong lúc nện */
registerSkillVfx("basic_rumble", async (ctx) => {
    const k = power(ctx)
    await Promise.all((ctx.to.length ? ctx.to : [polar(ctx.from, UP, 200)]).map(async (to) => {
        const dir = angleOf(ctx.from, to)
        const c = canvas(ctx.layer)
        await over(ctx.layer, 0.12, (t) => {
            const a = polar(to, dir + Math.PI, lerp(60, 8, ease.in(t)))
            c.g.clear()
            taper(c.g, [polar(a, dir + Math.PI, 26), a], 0.5, 9 * k, col(COPPER, 0.8))
            polyline(c.g, [polar(a, dir + Math.PI, 18), a], 1, col(WHITE, 0.9))
        })
        c.done()
        ctx.onBeat?.(0)
        sparks(ctx.layer, to, dir + Math.PI, 12, k)
        emit(ctx.layer, to, { color: [YELLOW], kind: "glow", life: [0.1, 0.12], size: [20, 60], alpha: 0.8 })
        const w = canvas(ctx.layer)
        void over(ctx.layer, 0.22, (t) => {
            w.g.clear()
            w.g.lineWidth = 1.4 * (1 - t) + 0.3
            w.g.strokeColor = col(ORANGE, 0.8 * (1 - t))
            w.g.ellipse(to.x, to.y, lerp(10, 50, ease.out(t)), lerp(4, 18, ease.out(t)))
            w.g.stroke()
        }).then(w.done)
    }))
})

// ---------- Q Súng Phun Lửa ----------

/** Một luồng lửa từ vòi tới đích: hàng trăm hạt lửa, nở to dần theo quãng bay, đổi màu trắng -> vàng -> cam -> đỏ, cuối là khói */
function flameStream(layer: Node, from: Pt, to: Pt, secs: number, k: number) {
    const dir = angleOf(from, to)
    const len = dist(from, to)
    return over(layer, secs, () => {
        for (let i = 0; i < 9; i++) {
            const spread = rand(-0.16, 0.16)
            const sp = len / rand(0.28, 0.4)
            emit(layer, from, {
                color: [pickFlame()], kind: "glow", life: [0.3, 0.42], size: [5 * k, rand(26, 40) * k], alpha: 0.75,
                speed: [sp * 0.9, sp], angle: [dir + spread, dir + spread], drag: 0.9, spread: 3
            })
        }
        emit(layer, from, {
            color: [WHITE, YELLOW], kind: "glow", life: [0.06, 0.1], size: [16 * k, 26 * k], alpha: 0.9
        })
        if (Math.random() < 0.5) emit(layer, mix(from, to, rand(0.5, 1)), {
            color: SMOKE, kind: "glow", additive: false, life: [0.5, 0.9], size: [10, 34], alpha: 0.3, speed: [10, 40], angle: [UP - 0.5, UP + 0.5]
        })
        if (Math.random() < 0.6) emit(layer, mix(from, to, rand(0.3, 1)), {
            color: EMBERS, kind: "dot", life: [0.4, 0.8], size: [2.4, 0.8], alpha: 1, speed: [30, 90], angle: [UP - 0.9, UP + 0.9], gravity: 50
        })
    })
}
const pickFlame = () => { const r = Math.random(); return r < 0.15 ? WHITE : r < 0.45 ? YELLOW : r < 0.85 ? ORANGE : RED }

/**
 * Q: vòi phun bén lửa (loé vàng), rồi phun lửa hình nón cùng lúc tới ô đối diện và 2 ô kề. Lửa chạm là nhịp 0 (số của cả 3);
 * lửa còn phun thêm chút rồi tắt, để lại vệt cháy xém, than hồng và khói đen trên từng mục tiêu.
 */
registerSkillVfx("rumble_q", async (ctx) => {
    const k = power(ctx)
    const targets = ctx.hops?.length ? ctx.hops.map((h) => h.to) : ctx.to.length ? ctx.to : [polar(ctx.from, UP, 300)]
    const nozzle = mix(ctx.from, targets.reduce((s, p) => ({ x: s.x + p.x / targets.length, y: s.y + p.y / targets.length }), { x: 0, y: 0 }), 0.12)
    emit(ctx.layer, nozzle, { color: [YELLOW], kind: "glow", life: [0.18, 0.18], size: [10, 50], alpha: 0.9 })
    embers(ctx.layer, nozzle, 6, 4)
    await wait(ctx.layer, 0.1)
    const flows = targets.map((t) => flameStream(ctx.layer, nozzle, t, 0.62, k))
    await wait(ctx.layer, 0.3)
    ctx.onBeat?.(0)
    for (const t of targets) {
        emit(ctx.layer, t, { color: [ORANGE], kind: "glow", life: [0.4, 0.4], size: [40 * k, 110 * k], alpha: 0.5 })
        scorch(ctx.layer, t, 34 * k)
    }
    await Promise.all(flows)
    for (const t of targets) { embers(ctx.layer, t, 14, 30); smoke(ctx.layer, t, 4, 30, 20) }
})

// ---------- E Khiên Phế Liệu ----------

/** Tia điện gãy khúc giữa a và b, đổi hình mỗi khung: lõi trắng xanh, quầng xanh */
function bolt(g: Graphics, a: Pt, b: Pt, amp: number, alpha: number) {
    const n = Math.max(4, Math.round(dist(a, b) / 14))
    const d = angleOf(a, b)
    const nx = -Math.sin(d), ny = Math.cos(d)
    const pts: Pt[] = []
    for (let i = 0; i <= n; i++) {
        const p = mix(a, b, i / n)
        const o = i === 0 || i === n ? 0 : rand(-amp, amp)
        pts.push({ x: p.x + nx * o, y: p.y + ny * o })
    }
    polyline(g, pts, 5, col(ELECTRIC, 0.3 * alpha))
    polyline(g, pts, 1.4, col(ELECTRIC_CORE, alpha))
}

/** Lao móc thép: mũi nhọn ba ngạnh hướng `dir`, thân thép */
function harpoon(g: Graphics, at: Pt, dir: number, s: number) {
    const tip = polar(at, dir, 10 * s)
    const back = polar(at, dir + Math.PI, 14 * s)
    polyline(g, [back, at], 2.4 * s, col(DARKSTEEL, 1))
    polyline(g, [back, at], 0.8 * s, col(STEEL, 1))
    g.fillColor = col(STEEL, 1)
    g.moveTo(tip.x, tip.y)
    for (const side of [1, -1]) {
        const barb = polar(polar(at, dir + Math.PI, 3 * s), dir + UP * side, 6 * s)
        g.lineTo(barb.x, barb.y)
        g.lineTo(at.x, at.y)
    }
    g.close()
    g.fill()
    polyline(g, [at, tip], 1, col(ELECTRIC_CORE, 0.9))
}

/** Tấm thép đồng tán đinh (một mảnh khiên) ở `at`, xoay `rot`, cỡ `s` */
function plate(g: Graphics, at: Pt, rot: number, s: number, alpha: number) {
    const pts = Array.from({ length: 6 }, (_, i) => polar(at, rot + i * TAU / 6, s))
    g.fillColor = col(BRONZE, 0.95 * alpha)
    g.moveTo(pts[0].x, pts[0].y)
    for (const p of pts) g.lineTo(p.x, p.y)
    g.close()
    g.fill()
    g.lineWidth = 1
    g.strokeColor = col(COPPER, alpha)
    g.moveTo(pts[0].x, pts[0].y)
    for (const p of pts) g.lineTo(p.x, p.y)
    g.close()
    g.stroke()
    g.fillColor = col(0xe0b080, alpha)
    for (let i = 0; i < 6; i += 2) { const r = mix(at, pts[i], 0.65); g.circle(r.x, r.y, 0.9) }
    g.fill()
}

/**
 * E: lao móc thép bắn tới địch kéo dây điện xanh lách tách; cắm vào là nổ điện (nhịp 0: sát thương). Rồi 6 tấm thép đồng tán
 * đinh bay từ quanh bàn về ghép thành khiên tròn bọc Rumble, điện xanh chạy quanh viền (nhịp 1: Khiên), khiên mờ dần.
 */
registerSkillVfx("rumble_e", async (ctx) => {
    const k = power(ctx)
    const hops = ctx.hops ?? []
    const foe = hops.find((h) => h.kind === "damage")?.to ?? ctx.to[0] ?? polar(ctx.from, UP, 300)
    const me = ctx.from
    const dir = angleOf(me, foe)
    const c = canvas(ctx.layer)
    // 1) lao móc bay, dây điện kéo theo
    await over(ctx.layer, Math.min(0.24, 0.1 + dist(me, foe) / 3000), (t) => {
        const p = mix(me, foe, ease.in(t))
        c.g.clear()
        bolt(c.g, me, p, 8, 1)
        harpoon(c.g, p, dir, 2.2 * k)
        if (Math.random() < 0.5) emit(ctx.layer, p, { color: [ELECTRIC, ELECTRIC_CORE], kind: "dot", life: [0.1, 0.2], size: [2.5, 1], alpha: 1, speed: [20, 80] })
    })
    ctx.onBeat?.(0)
    // 2) cắm vào: nổ điện, tia điện toả quanh mục tiêu
    emit(ctx.layer, foe, { color: [ELECTRIC_CORE], kind: "glow", life: [0.14, 0.14], size: [30, 100], alpha: 0.9 })
    sparks(ctx.layer, foe, dir + Math.PI, 8, k)
    await over(ctx.layer, 0.18, (t) => {
        c.g.clear()
        bolt(c.g, me, foe, 10, 1 - t)
        harpoon(c.g, foe, dir, 2.2 * k)
        for (let i = 0; i < 6; i++) bolt(c.g, foe, polar(foe, rand(0, TAU), rand(24, 54) * k), 6, 1 - t)
    })
    c.done()
    void burst(ctx.layer, foe, 10, { color: [ELECTRIC, ELECTRIC_CORE], kind: "blade", life: [0.1, 0.22], size: [10, 2], alpha: 1, speed: [120, 300], drag: 2, align: true, stretch: 2 })
    // 3) tấm thép bay về ghép khiên quanh Rumble
    const sh = canvas(ctx.layer)
    const R = 46 * k
    const starts = Array.from({ length: 6 }, (_, i) => polar(me, i * TAU / 6 + 0.3, rand(140, 200)))
    await over(ctx.layer, 0.22, (t) => {
        sh.g.clear()
        for (let i = 0; i < 6; i++) {
            const slot = polar(me, i * TAU / 6 + 0.3, R * 0.62, 0.95)
            const p = mix(starts[i], slot, ease.out(t))
            plate(sh.g, p, i * 0.9 + (1 - t) * 6, 19 * k, 1)
        }
    })
    ctx.onBeat?.(1)
    emit(ctx.layer, me, { color: [ELECTRIC], kind: "glow", life: [0.2, 0.2], size: [50, 140], alpha: 0.5 })
    void (async () => {
        await over(ctx.layer, 0.5, (t) => {
            const a = 1 - ease.in(t)
            sh.g.clear()
            for (let i = 0; i < 6; i++) plate(sh.g, polar(me, i * TAU / 6 + 0.3, R * 0.62, 0.95), i * 0.9, 19 * k, a)
            // điện chạy quanh viền khiên
            const a0 = t * 9
            const pts = Array.from({ length: 9 }, (_, i) => polar(me, a0 + i * 0.18, R + rand(-3, 3), 0.95))
            polyline(sh.g, pts, 3, col(ELECTRIC, 0.35 * a))
            polyline(sh.g, pts, 1, col(ELECTRIC_CORE, a))
        })
        sh.done()
    })()
})

// ---------- R Mưa Tên Lửa ----------

/** Tên lửa: đầu đạn đỏ, thân thép, hai cánh đuôi; mũi hướng `dir` */
function rocket(g: Graphics, at: Pt, dir: number, s: number) {
    const back = polar(at, dir + Math.PI, 18 * s)
    taper(g, [back, at], 6 * s, 6 * s, col(STEEL, 1))
    polyline(g, [polar(at, dir + Math.PI, 16 * s), polar(at, dir + Math.PI, 2 * s)], 1, col(0xd0d6da, 0.9))
    g.fillColor = col(RED, 1)
    g.circle(at.x, at.y, 3.4 * s)
    g.fill()
    g.fillColor = col(DARKSTEEL, 1)
    for (const side of [1, -1]) {
        const f0 = polar(back, dir + UP * side, 3 * s), f1 = polar(polar(back, dir + Math.PI, 4 * s), dir + UP * side, 7 * s)
        g.moveTo(back.x, back.y)
        g.lineTo(f0.x, f0.y)
        g.lineTo(f1.x, f1.y)
        g.close()
    }
    g.fill()
}

/** Cầu lửa nổ: lõi trắng, lửa cam đỏ phồng, mảnh kim loại, khói đen, sóng va dẹt, than hồng */
function blast(layer: Node, at: Pt, k: number) {
    emit(layer, at, { color: [WHITE], kind: "glow", life: [0.12, 0.12], size: [40 * k, 120 * k], alpha: 1 })
    void burst(layer, at, Math.round(26 * k), {
        color: FLAME, kind: "glow", life: [0.25, 0.5], size: [14 * k, 40 * k], alpha: 0.7, speed: [40, 160], drag: 2, spread: 8
    })
    sparks(layer, at, UP, 14, k)
    void burst(layer, at, 8, { color: [DARKSTEEL, STEEL], kind: "blade", additive: false, life: [0.3, 0.6], size: [7, 3], alpha: 1, speed: [120, 300], angle: [UP - 1, UP + 1], gravity: FALL, spin: [-12, 12], stretch: 1.2 })
    smoke(layer, at, 6, 46, 18)
    embers(layer, at, 16, 26)
    const w = canvas(layer)
    void over(layer, 0.3, (t) => {
        w.g.clear()
        w.g.lineWidth = 1.6 * (1 - t) + 0.3
        w.g.strokeColor = col(ORANGE, 0.85 * (1 - t))
        w.g.ellipse(at.x, at.y - 10, lerp(14, 74, ease.out(t)) * k, lerp(5, 24, ease.out(t)) * k)
        w.g.stroke()
    }).then(w.done)
}

/**
 * R: Rumble phóng một chùm tên lửa vòng lên trời; từng quả lao xuống lần lượt từng tướng địch theo thứ tự engine báo (mỗi quả
 * một nhịp, số bật lúc nổ), xen vài quả lạc giữa các ô; mỗi chỗ nổ để lại vết cháy xém, than hồng và khói. Không vẽ dải lửa
 * cháy kéo dài vì engine không có sát thương cháy.
 */
registerSkillVfx("rumble_r", async (ctx) => {
    const k = power(ctx)
    const hits: Hop[] = ctx.hops?.length ? ctx.hops : (ctx.to.length ? ctx.to : [polar(ctx.from, UP, 300)]).map((to) => ({ from: ctx.from, to, kind: "damage" as const }))
    const rowY = hits.reduce((s, h) => s + h.to.y, 0) / hits.length
    const up = Math.sign(rowY - ctx.from.y) || 1
    // phóng: loé ở ống phóng, khói
    emit(ctx.layer, ctx.from, { color: [YELLOW], kind: "glow", life: [0.2, 0.2], size: [20, 80], alpha: 0.9 })
    smoke(ctx.layer, ctx.from, 5, 30, 14)
    // từng quả tên lửa
    for (let i = 0; i < hits.length; i++) {
        const to = hits[i].to
        const launch = { x: ctx.from.x + rand(-20, 20), y: ctx.from.y }
        const c = canvas(ctx.layer)
        const bend = (to.x > ctx.from.x ? -1 : 1) * rand(120, 200) * up
        let prev = launch
        await over(ctx.layer, 0.26, (t) => {
            const p = arcPt(launch, to, bend, ease.in(t))
            const d = angleOf(prev, p) || UP
            c.g.clear()
            rocket(c.g, p, d, 1.1 * k)
            emit(ctx.layer, polar(p, d + Math.PI, 14), { color: FLAME, kind: "glow", life: [0.12, 0.2], size: [10, 4], alpha: 0.9 })
            if (Math.random() < 0.7) emit(ctx.layer, polar(p, d + Math.PI, 18), { color: SMOKE, kind: "glow", additive: false, life: [0.4, 0.7], size: [6, 18], alpha: 0.35, speed: [5, 20] })
            prev = p
        })
        c.done()
        ctx.onBeat?.(i)
        blast(ctx.layer, to, k)
        scorch(ctx.layer, to, 40 * k, 1.2)
        // một quả lạc ghim giữa hai ô
        if (i < hits.length - 1) {
            const stray = { x: (to.x + hits[i + 1].to.x) / 2 + rand(-20, 20), y: rowY - up * rand(20, 50) }
            void wait(ctx.layer, 0.08).then(() => blast(ctx.layer, stray, 0.55 * k))
        }
        await wait(ctx.layer, 0.04)
    }
    await wait(ctx.layer, 0.15)
})

// ---------- Nội tại Tái Chế ----------

/** P: phế liệu (bánh răng, tấm thép) bị hút từ quanh bàn về Rumble, ống xả phụt hơi nóng và than hồng, mech loé đồng */
registerSkillVfx("rumble_p", async (ctx) => {
    const k = power(ctx)
    const me = ctx.from
    const c = canvas(ctx.layer)
    const parts = Array.from({ length: 8 }, (_, i) => ({ start: polar(me, i * TAU / 8 + rand(-0.3, 0.3), rand(130, 190)), rot: rand(0, TAU), gear: i % 2 === 0 }))
    await over(ctx.layer, 0.4, (t) => {
        c.g.clear()
        for (const p of parts) {
            const at = mix(p.start, me, ease.in(t))
            const s = 9 * k * (1 - t * 0.5)
            if (p.gear) {
                const teeth = Array.from({ length: 16 }, (_, j) => polar(at, p.rot + t * 8 + j * TAU / 16, j % 2 ? s : s * 0.75))
                c.g.fillColor = col(STEEL, 1)
                c.g.moveTo(teeth[0].x, teeth[0].y)
                for (const q of teeth) c.g.lineTo(q.x, q.y)
                c.g.close()
                c.g.fill()
                c.g.fillColor = col(DARKSTEEL, 1)
                c.g.circle(at.x, at.y, s * 0.3)
                c.g.fill()
            } else plate(c.g, at, p.rot + t * 6, s, 1)
        }
    })
    c.done()
    emit(ctx.layer, me, { color: [COPPER, YELLOW], kind: "glow", life: [0.3, 0.3], size: [40, 120], alpha: 0.7 })
    void burst(ctx.layer, polar(me, UP, 20), 10, { color: [0xd8d2c8, 0xb0aaa0], kind: "glow", additive: false, life: [0.4, 0.8], size: [6, 22], alpha: 0.4, speed: [40, 100], angle: [UP - 0.4, UP + 0.4] })
    embers(ctx.layer, me, 12, 18)
    await wait(ctx.layer, 0.15)
})
