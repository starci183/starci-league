// VFX Miss Fortune trên Cocos, theo thiết kế bản web (fx_missfortune.ts): chất liệu THUỐC SÚNG. Vệt đạn nóng đỏ cam, đạn gang bọc
// lửa như icon Q và R, tia lửa kim loại, khói súng, trái tim lửa của Love Tap như icon nội tại. Hai khẩu súng hai bên người.
// Ô: basic_missfortune, missfortune_q, missfortune_e, missfortune_r, missfortune_p.
import {
    Node
} from "cc"
import {
    angleOf, dist, ease, mix, over, rand, type Pt
} from "./particles"
import {
    registerSkillVfx
} from "./registry"
import {
    burst, carry, DOWN, emit, firstFoe, flash, foeRow, offset, power, ring, smoke, sparks, star, stream, targetsOf, TAU, UP, wait
} from "./g3_helpers"

const HOT = 0xfff1b8
const AMBER = 0xffc05a
const ORANGE = 0xf58a36
const RED = 0xe0301e
const CRIMSON = 0x9a1020
const HEART = 0xef4664
const IRON = 0x2a1a22
const SOOT = [0x2a2020, 0x3a2c28, 0x1e1616]
const HAZE = 0x827567

/** Hai khẩu súng hai bên người, vuông góc hướng bắn */
const guns = (at: Pt, dir: number): Pt[] => [offset(offset(at, dir + UP, 26), dir, 26), offset(offset(at, dir - UP, 26), dir, 26)]

/** Chớp đầu nòng hình sao, tia lửa theo hướng bắn, khói súng */
function muzzle(layer: Node, at: Pt, dir: number, s = 1) {
    star(layer, at, 18 * s, [HOT, AMBER], 0.12, dir + 0.785)
    void burst(layer, at, Math.round(6 * s), {
        color: [HOT, AMBER, ORANGE], kind: "blade", life: [0.08, 0.16], size: [16 * s, 8], alpha: 1, speed: [200, 380], angle: [dir - 0.35, dir + 0.35],
        drag: 3, align: true, stretch: 2.2
    })
    void smoke(layer, offset(at, dir, 14), 2, SOOT, 22 * s, [0.4, 0.6], 6)
}

/** Vệt đạn: đầu thon sáng, thân đỏ cam kéo dài; xong khi chạm */
const tracer = (layer: Node, a: Pt, b: Pt, secs: number, w = 1) => carry(layer, (t) => mix(a, b, t), secs, (p, _t, dir) => {
    emit(layer, p, {
        color: [HOT, AMBER], kind: "blade", life: [0.05, 0.07], size: [18 * w, 16 * w], alpha: 1, rotation: dir, stretch: 3.2
    })
    emit(layer, offset(p, dir, -18 * w), {
        color: [ORANGE, RED], kind: "blade", life: [0.08, 0.14], size: [16 * w, 6], alpha: 0.85, rotation: dir, stretch: 4
    })
})

/** Đạn gang bọc lửa (icon Q/R): viên sắt tối, quầng lửa, đuôi lửa dày */
const ironShot = (layer: Node, path: (t: number) => Pt, secs: number, r: number, easing = ease.linear) => carry(layer, path, secs, (p, _t, dir) => {
    emit(layer, p, {
        color: [ORANGE, AMBER], kind: "glow", life: [0.06, 0.09], size: [r * 3.6, r * 2.6], alpha: 0.85
    })
    emit(layer, p, {
        color: [IRON], kind: "dot", additive: false, life: [0.04, 0.05], size: [r * 2, r * 2], alpha: 1
    })
    emit(layer, offset(p, 2.3, r * 0.45), {
        color: [0xd8c8ff], kind: "glow", life: [0.04, 0.05], size: [r * 0.8, r * 0.8], alpha: 0.7
    })
    for (let i = 0; i < 2; i++) emit(layer, offset(p, dir, -r), {
        color: [ORANGE, RED, AMBER], kind: "blade", life: [0.12, 0.24], size: [r * 1.8, r * 0.6], alpha: 0.9, rotation: dir + rand(-0.2, 0.2), stretch: 2.6,
        speed: [30, 100], angle: [dir + Math.PI - 0.3, dir + Math.PI + 0.3]
    })
}, easing)

/** Cú trúng của đạn nặng: tia lửa toả, lưỡi lửa, khói */
function heavyHit(layer: Node, at: Pt, dir: number, s: number) {
    flash(layer, at, HOT, 110 * s, 0.18)
    flash(layer, at, ORANGE, 180 * s, 0.35, 0.6)
    void sparks(layer, at, Math.round(14 * s), [HOT, AMBER, ORANGE], [220, 560], {
        angle: [dir - 1, dir + 1], gravity: -300
    })
    void burst(layer, at, Math.round(10 * s), {
        color: [ORANGE, RED, AMBER], kind: "glow", life: [0.25, 0.45], size: [40 * s, 12], alpha: 0.9, speed: [40, 180], drag: 2
    })
    void smoke(layer, at, Math.round(3 * s), SOOT, 40 * s)
}

/** Trái tim lửa Love Tap: viền tim bằng hạt sáng, lõi đỏ sẫm, lửa liếm phía trên */
function heart(layer: Node, at: Pt, size: number, life: number) {
    flash(layer, at, CRIMSON, size * 2.4, life, 0.6, false)
    const n = 26
    for (let i = 0; i < n; i++) {
        const t = i / n * TAU
        // đường cong trái tim cổ điển
        const x = 16 * Math.sin(t) ** 3
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
        const p = {
            x: at.x + x * size / 16, y: at.y + y * size / 16
        }
        emit(layer, p, {
            color: [AMBER, HOT, ORANGE], kind: "glow", life: [life, life], size: [size * 0.32, size * 0.24], alpha: 1, speed: [10, 30], angle: [UP, UP]
        })
    }
    void burst(layer, offset(at, UP, size * 0.8), 10, {
        color: [ORANGE, AMBER, RED], kind: "glow", life: [0.3, 0.5], size: [size * 0.5, size * 0.15], alpha: 0.9, speed: [60, 140], angle: [UP - 0.5, UP + 0.5],
        gravity: 120, spread: size * 0.6
    })
}

/** Đánh thường: một khẩu chĩa tới, chớp sao vàng trắng, vệt đạn hổ phách, toé cam */
registerSkillVfx("basic_missfortune", async (ctx) => {
    const to = firstFoe(ctx)
    const dir = angleOf(ctx.from, to)
    const g = guns(ctx.from, dir)[Math.random() < 0.5 ? 0 : 1]
    muzzle(ctx.layer, g, dir, 0.8)
    await tracer(ctx.layer, g, to, Math.min(0.2, 0.08 + dist(g, to) / 4000))
    flash(ctx.layer, to, AMBER, 70, 0.16)
    void sparks(ctx.layer, to, 7, [AMBER, ORANGE, HOT], [140, 320], {
        angle: [dir - 0.8, dir + 0.8]
    })
    await wait(ctx.layer, 0.25)
})

/**
 * Q Bắn Nảy: hai nòng hút nóng đỏ rồi cùng nổ, đạn gang bọc lửa lao vào mục tiêu chính (có thể chí mạng: quầng trắng vàng), rồi
 * văng tiếp không dừng sang 2 tướng địch khác, mỗi cú trúng toé tia lửa.
 */
registerSkillVfx("missfortune_q", async (ctx) => {
    const k = power(ctx)
    const to = firstFoe(ctx)
    const dir = angleOf(ctx.from, to)
    const g = guns(ctx.from, dir)
    for (const m of g) flash(ctx.layer, m, RED, 60, 0.3, 0.8)
    await stream(ctx.layer, () => g[Math.random() < 0.5 ? 0 : 1], 0.2, 80, {
        color: [ORANGE, AMBER], kind: "dot", life: [0.1, 0.18], size: [6, 2], alpha: 1, speed: [40, 100], angle: [dir - 0.3, dir + 0.3]
    })
    for (const m of g) muzzle(ctx.layer, m, dir, 1.3)
    const mid = mix(g[0], g[1], 0.5)
    await ironShot(ctx.layer, (t) => mix(mid, to, t), Math.min(0.32, 0.14 + dist(mid, to) / 3000), 12 * k, ease.in)
    heavyHit(ctx.layer, to, dir, 1.2 * k)
    star(ctx.layer, to, 40, [HOT, AMBER], 0.22, 0.3)
    // nảy sang hai địch khác: ưu tiên mục tiêu thật, thiếu thì lấy ô gần trong hàng
    const pool = (ctx.to.length > 1 ? ctx.to.slice(1) : foeRow(ctx).filter((p) => dist(p, to) > 40))
        .sort((a, b) => dist(to, a) - dist(to, b)).slice(0, 2)
    let prev = to
    for (const p of pool) {
        await ironShot(ctx.layer, (t) => mix(prev, p, t), 0.18, 9 * k)
        heavyHit(ctx.layer, p, angleOf(prev, p), 0.8)
        prev = p
    }
    await wait(ctx.layer, 0.35)
})

/**
 * E Mưa Đạn (mọi tướng địch, dễ tổn thương): Miss Fortune chĩa hai súng lên trời xả đạn bay khỏi màn, màn đỏ cam phủ lên hàng địch,
 * rồi mưa vệt đạn vàng đỏ trút xuống khắp hàng; mỗi tướng một quầng lửa, tia lửa, bụi đất xám nâu, rồi cháy âm ỉ (chịu thêm sát thương).
 */
registerSkillVfx("missfortune_e", async (ctx) => {
    const k = power(ctx)
    const row = foeRow(ctx)
    const g = guns(ctx.from, UP)
    // bắn lên trời
    await over(ctx.layer, 0.32, () => {
        const m = g[Math.random() < 0.5 ? 0 : 1]
        emit(ctx.layer, m, {
            color: [AMBER, HOT, ORANGE], kind: "blade", life: [0.25, 0.3], size: [16, 14], alpha: 1, speed: [1400, 1600], angle: [UP - 0.12, UP + 0.12], align: true, stretch: 3.4
        })
        if (Math.random() < 0.4) muzzle(ctx.layer, m, UP, 0.6)
    })
    // màn đỏ cam phủ hàng địch
    for (const p of row) flash(ctx.layer, p, RED, 240 * k, 1.2, 0.3)
    await wait(ctx.layer, 0.15)
    // mưa đạn: vệt rơi chéo, viên đầu chạm là sát thương
    const fall = DOWN + 0.18
    const rain = stream(ctx.layer, () => {
        const p = row[Math.floor(Math.random() * row.length)]
        return offset({
            x: p.x + rand(-90, 90), y: p.y + rand(-50, 50)
        }, fall, -240)
    }, 0.75, 170, {
        color: [AMBER, ORANGE, RED, HOT], kind: "blade", life: [0.22, 0.24], size: [16, 12], alpha: 1, speed: [1050, 1050], angle: [fall, fall], align: true, stretch: 3.6
    })
    await wait(ctx.layer, 0.22)
    for (const p of row) {
        heavyHit(ctx.layer, p, UP, 0.9)
        void burst(ctx.layer, p, 8, {
            color: [HAZE, 0x9a8a78], kind: "glow", additive: false, life: [0.5, 0.8], size: [30, 60], alpha: 0.4, speed: [20, 70], angle: [UP - 1, UP + 1], spread: 60
        })
        // cháy âm ỉ: than đỏ bốc lên
        void stream(ctx.layer, () => ({
            x: p.x + rand(-60, 60), y: p.y - 40
        }), 0.9, 25, {
            color: [RED, ORANGE], kind: "dot", life: [0.5, 0.8], size: [7, 2], alpha: 0.9, speed: [40, 90], angle: [UP - 0.3, UP + 0.3]
        })
    }
    await rain
    await wait(ctx.layer, 0.5)
})

/**
 * R Đạn Tử Thần: đứng vững, hai nòng nóng đỏ, lửa cuộn về súng; rồi nhiều loạt đạn gang bọc lửa toả quạt khắp hàng địch (đúng
 * nhiều loạt như engine), vài vệt lọt khe bay vượt hàng; mỗi loạt mỗi địch một chùm tia lửa.
 */
registerSkillVfx("missfortune_r", async (ctx) => {
    const k = power(ctx)
    const row = foeRow(ctx)
    const mid = mix(row[0], row[row.length - 1], 0.5)
    const dir = angleOf(ctx.from, mid)
    const g = guns(ctx.from, dir)
    // tụ: lửa cuộn về hai nòng
    for (const m of g) flash(ctx.layer, m, RED, 100, 0.5, 0.8)
    await stream(ctx.layer, () => {
        const m = g[Math.random() < 0.5 ? 0 : 1]
        return offset(m, rand(0, TAU), 60)
    }, 0.35, 120, {
        color: [ORANGE, RED, AMBER], kind: "glow", life: [0.12, 0.2], size: [16, 6], alpha: 0.9
    })
    const waves = 3
    for (let w = 0; w < waves; w++) {
        for (const m of g) muzzle(ctx.layer, m, dir, 1.2)
        const shots = row.map((p) => {
            const q = {
                x: p.x + rand(-30, 30), y: p.y + rand(-20, 20)
            }
            const m = g[w % 2]
            return ironShot(ctx.layer, (t) => mix(m, q, t), 0.22, 8 * k).then(() => heavyHit(ctx.layer, q, angleOf(m, q), 0.45))
        })
        // vệt lọt khe bay vượt hàng
        for (let i = 0; i < 2; i++) {
            const m = g[i % 2]
            const a = dir + rand(-0.7, 0.7)
            void tracer(ctx.layer, m, offset(m, a, 700), 0.3, 0.8)
        }
        await Promise.all(shots)
        await wait(ctx.layer, 0.1)
    }
    await wait(ctx.layer, 0.3)
})

/**
 * Nội tại Song Súng (Love Tap): viên đạn văng từ mục tiêu sang một tướng địch khác, vệt vàng hồng; trái tim lửa bung ra ở địch bị
 * nảy.
 */
registerSkillVfx("missfortune_p", async (ctx) => {
    const list = targetsOf(ctx)
    const src = list[0]
    const dst = list[1] ?? (dist(ctx.from, src) > 40 ? foeRow(ctx).filter((p) => dist(p, src) > 40).sort((a, b) => dist(src, a) - dist(src, b))[0] : undefined)
    let at = src
    if (dst) {
        await carry(ctx.layer, (t) => mix(src, dst, t), 0.22, (p, _t, d) => {
            emit(ctx.layer, p, {
                color: [AMBER, HOT], kind: "blade", life: [0.06, 0.08], size: [16, 14], alpha: 1, rotation: d, stretch: 3
            })
            emit(ctx.layer, p, {
                color: [HEART, 0xffa0b8], kind: "dot", life: [0.25, 0.4], size: [7, 2], alpha: 1, speed: [10, 40]
            })
        })
        at = dst
    }
    flash(ctx.layer, at, ORANGE, 100, 0.2)
    ring(ctx.layer, at, HEART, 30, 150, 0.3, 0.7)
    heart(ctx.layer, offset(at, UP, 60), 26, 0.7)
    await wait(ctx.layer, 0.7)
})
