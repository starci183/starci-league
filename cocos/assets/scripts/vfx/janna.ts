// VFX Janna trên Cocos, theo thiết kế bản web (fx_janna.ts): chất liệu GIÓ. Gió chỉ thấy qua các vệt trắng xanh dài mảnh cuốn theo
// luồng, vệt sẫm lót sau cho nổi trên nền sáng, lá non vàng xanh bay theo và sao vàng như icon. Ô: basic_janna, janna_q, janna_e,
// janna_r, janna_p.
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
    allyRow, burst, carry, curve, emit, firstFoe, flash, offset, power, ring, star, stream, TAU, UP, wait
} from "./g3_helpers"

const WIND = 0xe8fbff
const CYAN = 0x7fe0ff
const LINING = 0x1d3a6e
const LEAF = [0xc6f04a, 0x9be05a, 0xe8ff8a]
const STAR = 0xffe36a
const HEAL = 0x9effc4

/** Một vệt gió: nét mảnh dài theo hướng gió, kèm vệt sẫm lót mờ phía sau */
function streak(layer: Node, at: Pt, dir: number, len: number, life: number, alpha = 1, speed = 0) {
    const mv = {
        speed: [speed, speed] as [number, number], angle: [dir, dir] as [number, number], drag: 1.2
    }
    emit(layer, at, {
        color: [LINING], kind: "blade", additive: false, life: [life, life], size: [len / 3, len / 4], alpha: 0.25 * alpha,
        rotation: dir, stretch: 3.4, ...mv
    })
    emit(layer, at, {
        color: [WIND, CYAN, 0xffffff], kind: "blade", life: [life, life], size: [len / 4, len / 5], alpha, rotation: dir, stretch: 4.2, ...mv
    })
}

/** Lá non cuốn theo gió: mảnh nhỏ xoay tròn, bay lệch hướng */
const leaves = (layer: Node, at: Pt, n: number, dir: number, spreadAng = 1.2, speed: [number, number] = [80, 220]) => burst(layer, at, n, {
    color: LEAF, kind: "blade", life: [0.5, 0.9], size: [14, 10], alpha: 1, speed, angle: [dir - spreadAng, dir + spreadAng], drag: 1.6,
    spin: [-9, 9], stretch: 1.3, additive: false
})

/** Vệt gió chạy vòng quanh `at` theo quỹ đạo dẹt (khiên gió, lốc) */
async function swirl(layer: Node, at: Pt, rx: number, ry: number, secs: number, perFrame: number, rise = 0, colorsAlpha = 1) {
    let a = rand(0, TAU)
    await over(layer, secs, (t) => {
        for (let i = 0; i < perFrame; i++) {
            a += 0.55
            const r = rand(0.75, 1.1)
            const p = {
                x: at.x + Math.cos(a) * rx * r, y: at.y + Math.sin(a) * ry * r + rise * t
            }
            // tiếp tuyến của quỹ đạo dẹt
            const tan = Math.atan2(Math.cos(a) * ry, -Math.sin(a) * rx)
            streak(layer, p, tan, rand(30, 50), rand(0.18, 0.28), colorsAlpha)
        }
    })
}

/** Luồng gió bay a -> b theo đường cong: chùm vệt dài đuổi nhau, lá vụn và sương mỏng; xong khi tới nơi */
async function gust(layer: Node, a: Pt, b: Pt, secs: number, bend: number, width: number) {
    await carry(layer, (t) => curve(a, b, bend, t), secs, (p, _t, dir) => {
        for (let i = 0; i < 2; i++) streak(layer, offset(p, dir + UP, rand(-width, width)), dir + rand(-0.12, 0.12), rand(40, 70), rand(0.16, 0.26), 1, 60)
        emit(layer, p, {
            color: [CYAN], kind: "glow", life: [0.2, 0.3], size: [width * 3, width], alpha: 0.35
        })
        if (Math.random() < 0.35) emit(layer, p, {
            color: LEAF, kind: "blade", additive: false, life: [0.4, 0.6], size: [12, 8], alpha: 1, speed: [30, 90], spin: [-8, 8], stretch: 1.3
        })
    }, ease.inOut)
}

/** Đánh thường: chùm gió nhỏ bay cong, trúng thì gió toả tung thành vệt */
registerSkillVfx("basic_janna", async (ctx) => {
    const to = firstFoe(ctx)
    await gust(ctx.layer, ctx.from, to, 0.3, 50, 10)
    for (let i = 0; i < 6; i++) {
        const a = rand(0, TAU)
        streak(ctx.layer, offset(to, a, rand(10, 30)), a, rand(30, 46), 0.25, 1, rand(120, 240))
    }
    flash(ctx.layer, to, CYAN, 90, 0.2, 0.5)
    void leaves(ctx.layer, to, 4, angleOf(ctx.from, to))
    await wait(ctx.layer, 0.25)
})

/**
 * Q Gió Lốc: lốc xoáy tụ ở tay Janna, lướt tới mục tiêu (thân lốc là vệt trắng xoắn chặt, đáy hẹp miệng rộng), chạm thì cuốn mục
 * tiêu lên (sát thương), lá bay tung, rồi vòng sao vàng xoáy trên đầu: Choáng.
 */
registerSkillVfx("janna_q", async (ctx) => {
    const k = power(ctx)
    const to = firstFoe(ctx)
    // tụ lốc tại chỗ
    await swirl(ctx.layer, ctx.from, 46, 18, 0.28, 3, 40)
    /** thân lốc tại p: các tầng vệt vòng, càng cao càng rộng */
    const tornado = (p: Pt, h: number, w: number, spin: number) => {
        for (let lv = 0; lv < 5; lv++) {
            const y = lv / 4
            const r = w * (0.3 + 0.7 * y)
            const a = spin * 7 + lv * 1.3
            const q = {
                x: p.x + Math.cos(a) * r, y: p.y - h * 0.3 + y * h + Math.sin(a) * r * 0.25
            }
            streak(ctx.layer, q, Math.cos(a) > 0 ? UP + 1.25 : UP - 1.25 + Math.PI, rand(30, 44), 0.12, 0.9)
        }
    }
    let spin = 0
    await carry(ctx.layer, (t) => mix(ctx.from, to, t), 0.42, (p) => {
        spin += 0.06
        tornado(p, 80 * k, 34 * k, spin)
        emit(ctx.layer, p, {
            color: [LINING], kind: "glow", additive: false, life: [0.3, 0.45], size: [40, 70], alpha: 0.18, spread: 10
        })
        if (Math.random() < 0.5) emit(ctx.layer, p, {
            color: LEAF, kind: "blade", additive: false, life: [0.4, 0.7], size: [12, 8], alpha: 1, speed: [60, 160], spin: [-9, 9], stretch: 1.3
        })
    }, ease.inOut)
    // cuốn mục tiêu: lốc xoáy tại chỗ cao dần rồi tung ra
    flash(ctx.layer, to, WIND, 160 * k, 0.3, 0.6)
    await over(ctx.layer, 0.35, (t) => {
        spin += 0.08
        tornado(to, (80 + 60 * t) * k, (36 + 20 * t) * k, spin)
    })
    for (let i = 0; i < 8; i++) {
        const a = rand(0, TAU)
        streak(ctx.layer, offset(to, a, 20), a, rand(40, 70), 0.35, 1, rand(200, 380))
    }
    void leaves(ctx.layer, to, 10, UP, 1.6, [120, 300])
    ring(ctx.layer, to, WIND, 40, 220 * k, 0.4, 0.7)
    // Choáng: sao vàng xoay vòng trên đầu
    const head = offset(to, UP, 70)
    await over(ctx.layer, 0.6, (t) => {
        for (let i = 0; i < 3; i++) {
            const a = t * TAU * 1.5 + i * TAU / 3
            const p = {
                x: head.x + Math.cos(a) * 38, y: head.y + Math.sin(a) * 12
            }
            emit(ctx.layer, p, {
                color: [STAR, 0xffffff], kind: "dot", life: [0.08, 0.12], size: [12, 8], alpha: 1
            })
            emit(ctx.layer, p, {
                color: [STAR], kind: "glow", life: [0.1, 0.14], size: [26, 16], alpha: 0.6
            })
        }
    })
})

/** Khiên gió quanh một lá: bong bóng xanh trong, vệt gió chạy vòng mép, sao vàng lấp lánh như icon Mắt Bão */
async function windShield(layer: Node, at: Pt, k: number, secs: number) {
    flash(layer, at, CYAN, 210 * k, secs + 0.2, 0.3)
    ring(layer, at, CYAN, 120 * k, 200 * k, 0.35, 0.8)
    ring(layer, at, WIND, 220 * k, 190 * k, secs + 0.1, 0.45)
    star(layer, offset(at, 0.7, 52 * k), 18, [STAR, 0xffffff], secs * 0.8, 0.3)
    void burst(layer, at, 10, {
        color: [WIND, CYAN], kind: "dot", life: [0.4, 0.8], size: [7, 2], alpha: 0.9, speed: [10, 40], spread: 60 * k
    })
    await swirl(layer, at, 74 * k, 60 * k, secs, 2)
}

/** E Mắt Bão (Quick, đồng minh): hai chùm vệt xoắn từ Janna bay sang đồng minh, tới nơi là Khiên gió */
registerSkillVfx("janna_e", async (ctx) => {
    const k = power(ctx)
    const to = ctx.to[0] ?? ctx.from
    if (dist(ctx.from, to) > 40) await Promise.all([
        gust(ctx.layer, ctx.from, to, 0.32, 60, 8),
        gust(ctx.layer, ctx.from, to, 0.32, -60, 8),
    ])
    else await swirl(ctx.layer, ctx.from, 50, 20, 0.2, 3, 30)
    await windShield(ctx.layer, to, k, 0.65)
})

/**
 * R Gió Mùa (Quick, mọi tướng mình): xoáy gió lớn bùng quanh Janna (vòng xoắn như icon, sao vàng), sóng gió quét ngang khắp hàng
 * mình; mỗi đồng minh nhận Khiên gió và vệt hồi Máu xanh bốc lên cùng một nhịp.
 */
registerSkillVfx("janna_r", async (ctx) => {
    const k = power(ctx)
    const at = ctx.from
    const allies = allyRow(ctx)
    // xoáy lớn: vệt cuộn ra theo đường xoắn ốc
    flash(ctx.layer, at, CYAN, 260 * k, 0.9, 0.35)
    for (let i = 0; i < 3; i++) star(ctx.layer, offset(at, rand(0, TAU), rand(60, 140)), rand(10, 18), [STAR, 0xffffff], 0.8, 0.2)
    let a = 0
    await over(ctx.layer, 0.55, (t) => {
        for (let i = 0; i < 4; i++) {
            a += 0.4
            const r = 30 + t * 160 * k + rand(-10, 10)
            const p = offset(at, a, r)
            streak(ctx.layer, p, a + UP + 0.3, rand(46, 70), 0.3, 1, 40)
        }
    })
    // sóng gió quét ngang hàng mình
    for (const p of allies) if (dist(p, at) > 40) void gust(ctx.layer, at, p, 0.3, rand(-40, 40), 12)
    ring(ctx.layer, at, WIND, 60, 520 * k, 0.5, 0.6)
    await wait(ctx.layer, 0.3)
    await Promise.all(allies.map(async (p) => {
        void stream(ctx.layer, () => ({
            x: p.x + rand(-50, 50), y: p.y - 40
        }), 0.6, 40, {
            color: [HEAL, 0xd8ffe6], kind: "dot", life: [0.5, 0.8], size: [10, 3], alpha: 1, speed: [70, 130], angle: [UP - 0.15, UP + 0.15]
        })
        await windShield(ctx.layer, p, 0.8 * k, 0.6)
    }))
})

/**
 * Nội tại Hộ Phong: Khiên phe mình đủ ngưỡng thì Janna nhận 1 Gió Thuận. Làn gió từ hai bên hàng gom về Janna, kết thành vòng gió
 * có lá xoay, rồi một luồng nhẹ lan ra cả đội (Khiên mạnh hơn, Tốc Đánh).
 */
registerSkillVfx("janna_p", async (ctx) => {
    const at = ctx.from
    const allies = allyRow(ctx).filter((p) => dist(p, at) > 40)
    await Promise.all(allies.map((p) => gust(ctx.layer, p, at, 0.35, rand(-50, 50), 6)))
    void leaves(ctx.layer, at, 8, UP, Math.PI, [40, 120])
    await swirl(ctx.layer, at, 60, 24, 0.35, 3, 20)
    ring(ctx.layer, at, CYAN, 40, 420, 0.45, 0.6)
    for (let i = 0; i < 8; i++) {
        const d = rand(0, TAU)
        streak(ctx.layer, offset(at, d, 30), d, rand(40, 60), 0.35, 0.9, rand(300, 460))
    }
    await wait(ctx.layer, 0.35)
})
