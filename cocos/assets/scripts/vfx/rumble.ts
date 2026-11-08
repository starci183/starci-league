// VFX Rumble trên Cocos, theo thiết kế bản web (fx_rumble.ts): vòi lửa cam từ miệng ống đồng, khiên phế liệu đồng thép tán đinh có
// sét xanh, móc điện xanh như icon E, tên lửa thân ô liu mũi đỏ để lại lửa cháy trên đất. Thép và khói vẽ thường, lửa và sét cộng
// sáng. Ô: basic_rumble, rumble_q, rumble_e, rumble_r, rumble_p (Tái Chế).
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
    burst, carry, emit, firstFoe, flash, foeRow, lightning, lob, meleeSmash, neighbours, offset, power, ring, smoke, sparks, stream, TAU, UP, wait
} from "./g3_helpers"

const HOT = 0xfff0c0
const YELLOW = 0xffc84a
const ORANGE = 0xff7a1a
const RED = 0xd03a14
const ZAP = [0xbfeaff, 0x4fb8ff, 0xffffff]
const BLUE = 0x4fb8ff
const COPPER = [0xb87333, 0x8a5a2a, 0xc98a4a]
const STEEL = [0x6a6e78, 0x50545c, 0x8a8e98]
const OLIVE = 0x5a6a2a
const NOSE = 0xc0262d
const SOOT = [0x241c18, 0x302620, 0x1a1512]

/** Mảnh phế liệu (khối thép, đồng) văng ra rồi rơi */
const scrap = (layer: Node, at: Pt, n: number, speed: [number, number]) => burst(layer, at, n, {
    color: [...COPPER, ...STEEL], kind: "blade", additive: false, life: [0.5, 0.8], size: [16, 12], alpha: 1, speed, drag: 1.2, gravity: -500,
    spin: [-10, 10], stretch: 1.1
})

/** Lửa bám lá: lưỡi lửa liếm lên, khói đen */
function burn(layer: Node, at: Pt, s: number) {
    flash(layer, at, ORANGE, 160 * s, 0.35, 0.7)
    void burst(layer, at, Math.round(14 * s), {
        color: [ORANGE, YELLOW, RED], kind: "glow", life: [0.3, 0.55], size: [40 * s, 12], alpha: 0.9, speed: [40, 150], angle: [UP - 0.8, UP + 0.8], gravity: 200,
        spread: 30
    })
    void sparks(layer, at, Math.round(8 * s), [YELLOW, HOT], [160, 380], {
        gravity: -300
    })
    void smoke(layer, at, Math.round(4 * s), SOOT, 40 * s)
}

/** Đánh thường (cận chiến): nắm đấm máy nện xuống mục tiêu, sóng nhỏ trên đất, một tia sét xanh và vài tia lửa cam */
registerSkillVfx("basic_rumble", async (ctx) => {
    const to = firstFoe(ctx)
    const hit = meleeSmash(ctx.layer, to, [0xd8a070, ...COPPER], [...STEEL, 0x8a7458])
    await wait(ctx.layer, 0.1)
    lightning(ctx.layer, to, offset(to, rand(0, TAU), 50), ZAP, 1.6, 0.14, 8, 3)
    void sparks(ctx.layer, to, 6, [ORANGE, YELLOW], [120, 240], {
        gravity: -300
    })
    await hit
})

/**
 * Q Súng Phun Lửa (đối diện + 2 đường kề): mồi lửa ở miệng vòi, khạc khói dầu, rồi vòi lửa toả quạt ba lưỡi vào ba ô trước mặt;
 * mép lửa chạm hàng địch thì lửa bám cả ba lá.
 */
registerSkillVfx("rumble_q", async (ctx) => {
    const k = power(ctx)
    const main = firstFoe(ctx)
    const hits = [main, ...neighbours(ctx, main)]
    const dir = angleOf(ctx.from, main)
    const nozzle = offset(ctx.from, dir, 34)
    // mồi lửa
    flash(ctx.layer, nozzle, ORANGE, 70, 0.3, 0.8)
    void smoke(ctx.layer, nozzle, 5, SOOT, 30)
    await wait(ctx.layer, 0.14)
    // vòi phun: lưỡi lửa bắn về ba hướng, lõi trắng gần miệng, đỏ sẫm ở mép
    const spray = Promise.all(hits.map((h) => {
        const a = angleOf(nozzle, h)
        const d = dist(nozzle, h)
        const sp = d / 0.45
        return stream(ctx.layer, () => nozzle, 0.6, 90, {
            color: [ORANGE, YELLOW, RED, 0xff9a2a], kind: "glow", life: [0.5, 0.55], size: [18 * k, 70 * k], alpha: 0.85, speed: [sp * 0.9, sp * 1.05],
            angle: [a - 0.1, a + 0.1]
        })
    }))
    void stream(ctx.layer, () => nozzle, 0.6, 60, {
        color: [HOT, YELLOW], kind: "glow", life: [0.12, 0.18], size: [20, 40], alpha: 1, speed: [300, 400], angle: [dir - 0.5, dir + 0.5]
    })
    void stream(ctx.layer, () => nozzle, 0.6, 30, {
        color: SOOT, kind: "glow", additive: false, life: [0.4, 0.6], size: [20, 60], alpha: 0.35, speed: [200, 300], angle: [dir - 0.6, dir + 0.6]
    })
    await wait(ctx.layer, 0.42)
    for (const h of hits) burn(ctx.layer, h, h === main ? 1.1 * k : 0.85 * k)
    await spray
    await wait(ctx.layer, 0.3)
})

/** Khiên phế liệu: khối đồng thép lượn quanh Rumble trong màn sét xanh, đĩa đồng tán đinh như icon */
async function scrapShield(layer: Node, at: Pt, secs: number, k: number) {
    ring(layer, at, BLUE, 100 * k, 190 * k, 0.4, 0.9)
    flash(layer, at, 0x8a5a2a, 170 * k, secs, 0.35, false)
    let a = 0
    await over(layer, secs, (t) => {
        for (let i = 0; i < 3; i++) {
            a += 0.37
            const r = (70 + Math.sin(a * 3) * 8) * k
            emit(layer, offset(at, a, r), {
                color: [...COPPER, ...STEEL], kind: "blade", additive: false, life: [0.08, 0.12], size: [18, 14], alpha: 1, rotation: a * 2, stretch: 1.1
            })
        }
        if (Math.random() < 0.35) lightning(layer, offset(at, rand(0, TAU), 70 * k), offset(at, rand(0, TAU), 70 * k), ZAP, 1.6, 0.1, 12, 4)
        void t
    })
}

/**
 * E Khiên Phế Liệu (Quick, sát thương + Khiên): mảnh đồng thép bị hút về quay quanh Rumble trong sét xanh, rồi móc điện hình mũi tên
 * (icon E) phóng vào mục tiêu kéo sét theo; trúng thì sét bám, mảnh sắt văng; khiên đĩa đồng lắng quanh Rumble.
 */
registerSkillVfx("rumble_e", async (ctx) => {
    const k = power(ctx)
    const to = firstFoe(ctx)
    await scrapShield(ctx.layer, ctx.from, 0.35, k)
    let prev = ctx.from
    await carry(ctx.layer, (t) => mix(ctx.from, to, t), 0.26, (p, _t, dir) => {
        // đầu móc: hai lưỡi chĩa như mũi tên răng cưa
        for (const s of [-1, 1]) emit(ctx.layer, offset(p, dir + s * 2.5, 12), {
            color: [0xd8e8f0, ...ZAP], kind: "blade", life: [0.05, 0.06], size: [20, 18], alpha: 1, rotation: dir + s * 0.5, stretch: 1.8
        })
        emit(ctx.layer, p, {
            color: [0xd8e8f0], kind: "blade", life: [0.05, 0.06], size: [24, 20], alpha: 1, rotation: dir, stretch: 2
        })
        emit(ctx.layer, p, {
            color: [BLUE], kind: "glow", life: [0.08, 0.12], size: [60, 30], alpha: 0.7
        })
        if (dist(prev, p) > 30) {
            lightning(ctx.layer, prev, p, ZAP, 1.6, 0.18, 8, 2)
            prev = p
        }
    }, ease.in)
    flash(ctx.layer, to, 0xffffff, 110 * k, 0.18)
    flash(ctx.layer, to, BLUE, 180 * k, 0.4, 0.7)
    for (let i = 0; i < 6; i++) lightning(ctx.layer, to, offset(to, rand(0, TAU), rand(50, 90)), ZAP, 2, 0.2, 12, 3)
    void scrap(ctx.layer, to, 8, [160, 340])
    void sparks(ctx.layer, to, 10, [ORANGE, YELLOW], [200, 420])
    await scrapShield(ctx.layer, ctx.from, 0.5, k)
})

/** Một quả tên lửa: thân ô liu, mũi đỏ, đầu lửa, vệt khói dày ở lại */
const missile = (layer: Node, a: Pt, b: Pt, h: number, secs: number, k: number) => carry(layer, (t) => lob(a, b, h, t), secs, (p, _t, dir) => {
    emit(layer, p, {
        color: [OLIVE], kind: "blade", additive: false, life: [0.04, 0.05], size: [22 * k, 20 * k], alpha: 1, rotation: dir, stretch: 1.8
    })
    emit(layer, offset(p, dir, 16 * k), {
        color: [NOSE], kind: "dot", additive: false, life: [0.04, 0.05], size: [12 * k, 12 * k], alpha: 1
    })
    emit(layer, offset(p, dir, -22 * k), {
        color: [HOT, YELLOW, ORANGE], kind: "glow", life: [0.06, 0.1], size: [30 * k, 14], alpha: 1
    })
    emit(layer, offset(p, dir, -30 * k), {
        color: SOOT, kind: "glow", additive: false, life: [0.5, 0.8], size: [16, 40], alpha: 0.4, spread: 3
    })
}, ease.inOut)

/**
 * R Mưa Tên Lửa (mọi tướng địch, rồi tái chế thêm lá): bó tên lửa phóng vồng khỏi Rumble, cả loạt đổ xuống hàng địch gần như cùng
 * lúc: cầu lửa bẩn, mảnh vỏ văng, nấm khói đen; một dải lửa cháy trên đất nối cả hàng.
 */
registerSkillVfx("rumble_r", async (ctx) => {
    const k = power(ctx)
    const row = foeRow(ctx)
    flash(ctx.layer, ctx.from, ORANGE, 140, 0.3, 0.7)
    void smoke(ctx.layer, ctx.from, 8, SOOT, 50)
    await Promise.all(row.map(async (p, i) => {
        await wait(ctx.layer, i * 0.07)
        await missile(ctx.layer, offset(ctx.from, UP, 20), p, 200 + i * 15, 0.55, k)
        flash(ctx.layer, p, HOT, 120 * k, 0.2)
        burn(ctx.layer, p, 1.2 * k)
        void scrap(ctx.layer, p, 6, [140, 320])
        ring(ctx.layer, p, ORANGE, 40, 220 * k, 0.4, 0.8)
        void burst(ctx.layer, p, 6, {
            color: SOOT, kind: "glow", additive: false, life: [0.7, 1], size: [60, 140], alpha: 0.45, speed: [60, 160], angle: [UP - 0.3, UP + 0.3], drag: 1.6
        })
    }))
    // dải lửa trên đất nối các điểm nổ
    const a = row[0], b = row[row.length - 1]
    await stream(ctx.layer, () => mix(a, b, Math.random()), 0.6, 120, {
        color: [ORANGE, YELLOW, RED], kind: "glow", life: [0.3, 0.5], size: [34, 10], alpha: 0.8, speed: [40, 110], angle: [UP - 0.3, UP + 0.3], gravity: 120,
        spread: 14
    })
    await wait(ctx.layer, 0.3)
})

/**
 * Nội tại Tái Chế: một lá chiêu từ mộ bay lên tay Rumble thành Lá Tái Chế. Mảnh sắt quấn quanh, xoáy hút về Rumble, tia hàn cam
 * toé, sét xanh chớp; cuối cùng lá tái chế loé sáng phía trên đầu.
 */
registerSkillVfx("rumble_p", async (ctx) => {
    const at = ctx.from
    const src = offset(at, angleOf(at, firstFoe(ctx)) + Math.PI, 160)
    let rot = 0
    await carry(ctx.layer, (t) => lob(src, offset(at, UP, 40), 120, t), 0.5, (p) => {
        rot += 0.4
        for (let i = 0; i < 3; i++) emit(ctx.layer, offset(p, rot + i * TAU / 3, 26), {
            color: [...COPPER, ...STEEL], kind: "blade", additive: false, life: [0.06, 0.08], size: [16, 12], alpha: 1, rotation: rot * 2, stretch: 1.1
        })
        emit(ctx.layer, p, {
            color: [YELLOW, HOT], kind: "glow", life: [0.08, 0.1], size: [44, 30], alpha: 0.8
        })
        if (Math.random() < 0.7) emit(ctx.layer, p, {
            color: [ORANGE, YELLOW], kind: "blade", life: [0.2, 0.35], size: [10, 4], alpha: 1, speed: [60, 180], gravity: -300, align: true, stretch: 2
        })
    }, ease.inOut)
    const top = offset(at, UP, 40)
    flash(ctx.layer, top, HOT, 120, 0.25)
    ring(ctx.layer, top, YELLOW, 30, 160, 0.3, 0.8)
    void sparks(ctx.layer, top, 16, [ORANGE, YELLOW, HOT], [180, 400], {
        gravity: -400
    })
    for (let i = 0; i < 3; i++) lightning(ctx.layer, top, offset(top, rand(0, TAU), rand(40, 70)), ZAP, 1.6, 0.16, 10, 3)
    await wait(ctx.layer, 0.4)
})
