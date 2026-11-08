// VFX Tristana trên Cocos, theo thiết kế bản web (fx_tristana.ts): bom gang gai nhọn, lửa thuốc súng cam đỏ lõi vàng trắng, khói
// đen, đạn Đại Bác gang rất to. Gang và khói vẽ thường (không cộng sáng) cho nổi trên bàn sáng. Ô: basic_tristana, tristana_q,
// tristana_e, tristana_r, tristana_p (kích nổ Bom).
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
    burst, carry, emit, facing, firstFoe, flash, foeRow, gather, lob, offset, power, ring, smoke, sparks, targetsOf, TAU, UP, wait
} from "./g3_helpers"

const HOT = 0xfff2c0
const YELLOW = 0xffd060
const ORANGE = 0xff8a2a
const RED = 0xd8401a
const IRON = [0x3a3a44, 0x4a4a56, 0x2a2a30]
const STEEL = 0x9aa0b0
const SOOT = [0x241c18, 0x302620, 0x1a1512]

/** Quả bom gang gai nhọn vẽ tại p (hạt sống một khung): thân gang, gai thép quanh, vệt sáng, ngòi xì */
function bombAt(layer: Node, p: Pt, r: number, rot: number, life = 0.05, fuse = true) {
    emit(layer, p, {
        color: [IRON[0]], kind: "dot", additive: false, life: [life, life], size: [r * 2, r * 2], alpha: 1
    })
    for (let i = 0; i < 7; i++) {
        const a = rot + i * TAU / 7
        emit(layer, offset(p, a, r * 1.05), {
            color: [STEEL, 0x6a6e7a], kind: "blade", additive: false, life: [life, life], size: [r * 0.8, r * 0.8], alpha: 1, rotation: a, stretch: 1
        })
    }
    emit(layer, offset(p, 2.2, r * 0.4), {
        color: [0xffffff], kind: "glow", life: [life, life], size: [r * 0.7, r * 0.7], alpha: 0.5
    })
    if (fuse) {
        const tip = offset(p, UP + 0.4, r * 1.3)
        emit(layer, tip, {
            color: [YELLOW, HOT], kind: "glow", life: [life * 1.5, life * 2], size: [r * 0.9, r * 0.5], alpha: 1
        })
        if (Math.random() < 0.5) emit(layer, tip, {
            color: [YELLOW, ORANGE], kind: "blade", life: [0.15, 0.25], size: [10, 4], alpha: 1, speed: [60, 160], angle: [UP - 1, UP + 1],
            gravity: -260, align: true, stretch: 2
        })
    }
}

/** Vụ nổ thuốc súng cỡ s: chớp trắng, cầu lửa, mảnh gang rơi, cột khói đen, sóng bụi */
function blast(layer: Node, at: Pt, s: number) {
    flash(layer, at, HOT, 160 * s, 0.2)
    flash(layer, at, ORANGE, 260 * s, 0.45, 0.8)
    ring(layer, at, YELLOW, 40, 260 * s, 0.35, 0.9)
    ring(layer, at, 0xc8a080, 60, 380 * s, 0.6, 0.35)
    void burst(layer, at, Math.round(26 * s), {
        color: [YELLOW, ORANGE, RED, HOT], kind: "glow", life: [0.3, 0.6], size: [60 * s, 20], alpha: 0.9, speed: [60, 260 * s], drag: 2.4
    })
    void sparks(layer, at, Math.round(18 * s), [HOT, YELLOW, ORANGE], [260, 700], {
        gravity: -300
    })
    // mảnh gang văng rồi rơi
    void burst(layer, at, Math.round(12 * s), {
        color: IRON, kind: "blade", additive: false, life: [0.5, 0.8], size: [16, 10], alpha: 1, speed: [200, 480], drag: 1.2, gravity: -600,
        spin: [-12, 12], stretch: 1.2
    })
    // cột khói đen
    void burst(layer, at, Math.round(10 * s), {
        color: SOOT, kind: "glow", additive: false, life: [0.7, 1.1], size: [50 * s, 120 * s], alpha: 0.5, speed: [40, 160],
        angle: [UP - 0.3, UP + 0.3], drag: 1.6, spread: 20
    })
}

/** Đạn gang bay: lõi gang tối, quầng lửa, đuôi lửa dày, khói */
async function cannonball(layer: Node, path: (t: number) => Pt, secs: number, r: number, easing = ease.in) {
    await carry(layer, path, secs, (p, _t, dir) => {
        emit(layer, p, {
            color: [YELLOW, ORANGE], kind: "glow", life: [0.07, 0.1], size: [r * 3.4, r * 2.6], alpha: 0.8
        })
        emit(layer, p, {
            color: [IRON[1]], kind: "dot", additive: false, life: [0.04, 0.05], size: [r * 2, r * 2], alpha: 1
        })
        emit(layer, offset(p, 2.2, r * 0.4), {
            color: [0xffffff], kind: "glow", life: [0.04, 0.05], size: [r * 0.8, r * 0.8], alpha: 0.6
        })
        for (let i = 0; i < 2; i++) emit(layer, offset(p, dir, -r), {
            color: [ORANGE, RED, YELLOW], kind: "blade", life: [0.15, 0.28], size: [r * 1.8, r * 0.6], alpha: 0.9, rotation: dir + rand(-0.15, 0.15), stretch: 2.6,
            speed: [40, 120], angle: [dir + Math.PI - 0.3, dir + Math.PI + 0.3]
        })
        emit(layer, offset(p, dir, -r * 1.6), {
            color: SOOT, kind: "glow", additive: false, life: [0.4, 0.7], size: [r * 1.4, r * 3], alpha: 0.35
        })
    }, easing)
}

/** Chớp đầu nòng: lửa toả hình quạt theo hướng bắn, khói */
function muzzle(layer: Node, at: Pt, dir: number, s: number) {
    flash(layer, at, HOT, 90 * s, 0.14)
    void burst(layer, at, Math.round(10 * s), {
        color: [YELLOW, ORANGE, HOT], kind: "blade", life: [0.1, 0.2], size: [24 * s, 10], alpha: 1, speed: [200, 420], angle: [dir - 0.4, dir + 0.4],
        drag: 3, align: true, stretch: 2.2
    })
    void smoke(layer, offset(at, dir, 20), Math.round(3 * s), SOOT, 30 * s)
}

/** Đánh thường: đạn pháo nhỏ, nổ nhỏ và gắn 1 Bom (quả bom gai nhấp nháy rồi tắt) */
registerSkillVfx("basic_tristana", async (ctx) => {
    const to = firstFoe(ctx)
    const dir = angleOf(ctx.from, to)
    muzzle(ctx.layer, offset(ctx.from, dir, 30), dir, 0.7)
    await cannonball(ctx.layer, (t) => mix(ctx.from, to, t), 0.26, 9)
    blast(ctx.layer, to, 0.25)
    await over(ctx.layer, 0.4, (t) => bombAt(ctx.layer, offset(to, 0.6, 30), 9, t * 2, 0.04, t < 0.8))
})

/**
 * Q Bắn Nhanh (tự thân, Tốc Đánh): nòng pháo nóng đỏ, luồng nhiệt cuộn quanh Tristana, liền mấy phát chớp đầu nòng dồn dập về
 * phía địch, tia lửa và khí nóng phụt lên, vòng nhiệt loang.
 */
registerSkillVfx("tristana_q", async (ctx) => {
    const k = power(ctx)
    const at = ctx.from
    const dir = facing(ctx)
    flash(ctx.layer, at, ORANGE, 200 * k, 1.2, 0.35)
    ring(ctx.layer, at, ORANGE, 60, 260 * k, 0.45, 0.8)
    // luồng nhiệt xoáy
    let a = 0
    const heat = over(ctx.layer, 1.1, () => {
        for (let i = 0; i < 2; i++) {
            a += 0.3
            emit(ctx.layer, offset(at, a, rand(60, 80)), {
                color: [ORANGE, YELLOW, RED], kind: "blade", life: [0.2, 0.3], size: [20, 8], alpha: 0.9, speed: [60, 120], angle: [UP, UP], rotation: a + UP, stretch: 2
            })
        }
    })
    // loạt phát dồn dập, mỗi phát nhanh hơn
    let gap = 0.2
    for (let i = 0; i < 5; i++) {
        const side = i % 2 ? 0.25 : -0.25
        const m = offset(at, dir + side, 46)
        muzzle(ctx.layer, m, dir + side * 0.4, 0.8)
        void carry(ctx.layer, (t) => mix(m, offset(m, dir, 220), t), 0.12, (p, _t, d) => emit(ctx.layer, p, {
            color: [YELLOW, HOT], kind: "blade", life: [0.06, 0.1], size: [16, 12], alpha: 1, rotation: d, stretch: 3
        }))
        await wait(ctx.layer, gap)
        gap *= 0.75
    }
    void sparks(ctx.layer, at, 16, [YELLOW, ORANGE, HOT], [240, 480], {
        angle: [UP - 0.4, UP + 0.4], gravity: -200
    })
    await heat
})

/**
 * E Gắn Bom: quả bom gai lăn vồng trên không, ngòi xì, khói bám theo; chạm thì tia lửa gang, quả bom gắn trên lá nhấp nháy đỏ ba
 * lần, ngòi cháy xì xì.
 */
registerSkillVfx("tristana_e", async (ctx) => {
    const k = power(ctx)
    const to = firstFoe(ctx)
    const dir = angleOf(ctx.from, to)
    muzzle(ctx.layer, offset(ctx.from, dir, 26), dir, 0.6)
    let rot = 0
    await carry(ctx.layer, (t) => lob(ctx.from, to, 110, t), 0.46, (p) => {
        rot += 0.25
        bombAt(ctx.layer, p, 15 * k, rot)
        if (Math.random() < 0.5) emit(ctx.layer, p, {
            color: SOOT, kind: "glow", additive: false, life: [0.3, 0.5], size: [14, 30], alpha: 0.4
        })
    }, ease.inOut)
    // chạm: tia lửa gang, quầng nóng
    flash(ctx.layer, to, YELLOW, 120, 0.2)
    void sparks(ctx.layer, to, 14, [YELLOW, HOT, STEEL], [180, 420], {
        gravity: -400
    })
    ring(ctx.layer, to, ORANGE, 30, 130, 0.3, 0.8)
    // bom gắn trên lá: nhấp nháy đỏ, nhịp gấp dần
    const spot = offset(to, 0.5, 26)
    await over(ctx.layer, 0.9, (t) => {
        bombAt(ctx.layer, spot, 17 * k, rot + t * 0.5, 0.04)
        const blink = Math.sin(t * t * 40) > 0.6
        if (blink) emit(ctx.layer, spot, {
            color: [0xff3020], kind: "glow", life: [0.05, 0.06], size: [70, 60], alpha: 0.8
        })
    })
})

/**
 * R Đại Bác: nòng đại bác tụ lửa (tia lửa hút vào miệng nòng), phát bắn giật mạnh, quả đạn gang rất to kéo đuôi lửa thẳng vào mục
 * tiêu: kích nổ Bom thành vụ nổ lớn, rồi lưỡi lửa phóng sang từng tướng địch khác nổ nhỏ (phần vụ nổ lan).
 */
registerSkillVfx("tristana_r", async (ctx) => {
    const k = power(ctx)
    const to = firstFoe(ctx)
    const dir = angleOf(ctx.from, to)
    const mouth = offset(ctx.from, dir, 40)
    // tụ lửa ở miệng nòng
    flash(ctx.layer, mouth, ORANGE, 120, 0.5, 0.6)
    await gather(ctx.layer, mouth, 0.4, 140, 90, [YELLOW, ORANGE, HOT])
    void smoke(ctx.layer, mouth, 4, SOOT, 30)
    // phát bắn
    muzzle(ctx.layer, mouth, dir, 2 * k)
    ring(ctx.layer, mouth, HOT, 30, 200, 0.3, 0.8)
    await cannonball(ctx.layer, (t) => mix(mouth, to, t), Math.min(0.4, 0.18 + dist(mouth, to) / 2600), 26 * k)
    blast(ctx.layer, to, 1.2 * k)
    // lan nổ sang các địch khác
    const others = foeRow(ctx).filter((p) => dist(p, to) > 40)
    await wait(ctx.layer, 0.12)
    await Promise.all(others.map(async (p) => {
        await carry(ctx.layer, (t) => lob(to, p, 50, t), 0.24, (q, _t, d) => {
            emit(ctx.layer, q, {
                color: [YELLOW, ORANGE], kind: "blade", life: [0.12, 0.2], size: [28, 10], alpha: 1, rotation: d, stretch: 2.4
            })
            emit(ctx.layer, q, {
                color: [RED, ORANGE], kind: "glow", life: [0.2, 0.3], size: [30, 10], alpha: 0.7
            })
        }, ease.out)
        blast(ctx.layer, p, 0.4)
    }))
    await wait(ctx.layer, 0.45)
})

/**
 * Nội tại Bom Hẹn Giờ, kích nổ (không tốn lá): đốm ngòi cháy chạy ngoằn ngoèo từ Tristana tới quả bom trên mục tiêu, bom phồng
 * lên nóng trắng, rung bần bật rồi nổ.
 */
registerSkillVfx("tristana_p", async (ctx) => {
    const list = targetsOf(ctx)
    await Promise.all(list.map(async (to) => {
        if (dist(ctx.from, to) > 40) {
            const dir = angleOf(ctx.from, to)
            await carry(ctx.layer, (t) => offset(mix(ctx.from, to, t), dir + UP, Math.sin(t * 18) * 22 * (1 - t)), 0.4, (p) => {
                emit(ctx.layer, p, {
                    color: [YELLOW, HOT], kind: "glow", life: [0.06, 0.08], size: [26, 14], alpha: 1
                })
                emit(ctx.layer, p, {
                    color: [ORANGE, RED], kind: "dot", life: [0.25, 0.4], size: [6, 2], alpha: 0.9
                })
                if (Math.random() < 0.6) emit(ctx.layer, p, {
                    color: [YELLOW], kind: "blade", life: [0.12, 0.2], size: [10, 4], alpha: 1, speed: [60, 140], align: true, stretch: 2
                })
            })
        }
        const spot = offset(to, 0.5, 20)
        await over(ctx.layer, 0.35, (t) => {
            const jit = {
                x: spot.x + rand(-3, 3) * t, y: spot.y + rand(-3, 3) * t
            }
            bombAt(ctx.layer, jit, 16 + 10 * t, t * 3, 0.04)
            emit(ctx.layer, jit, {
                color: [t > 0.6 ? HOT : 0xff3020], kind: "glow", life: [0.05, 0.06], size: [50 + 60 * t, 40], alpha: 0.4 + 0.5 * t
            })
        })
        blast(ctx.layer, to, 1.1)
        await wait(ctx.layer, 0.5)
    }))
})
