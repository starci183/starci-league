// VFX Azir trên Cocos, theo thiết kế bản web (fx_azir.ts): cát vàng Shurima mịn và dày, Lính Cát là dáng người bằng cát cầm giáo
// (mũi giáo là mảnh sắc vàng sáng), đĩa mặt trời như icon nội tại và chiêu cuối. Lính thuộc ô sân phe mình nên hiệu ứng dựng Lính ở
// hàng của Azir. Ô: basic_azir, azir_q, azir_e, azir_r, azir_p.
import {
    Node
} from "cc"
import {
    angleOf, dist, ease, mix, over, type Pt
} from "./particles"
import {
    registerSkillVfx, type VfxCtx
} from "./registry"
import {
    allyRow, burst, carry, emit, firstFoe, flash, foeRow, meleeStab, offset, power, ring, seg, sparks, star, stream, TAU, UP, wait
} from "./g3_helpers"

const GOLD = 0xe2b45c
const CREAM = 0xf7e4ac
const BRIGHT = 0xfff0b0
const OCHRE = 0xba8b45
const SAND = [0xc5a16a, 0xd8b47a, 0xb08850]
const DUSK = 0x6a3f8a
const TEAL = 0x2fb8a8

/** Cát văng cao rồi rơi xuống */
const sandSpray = (layer: Node, at: Pt, n: number, speed: [number, number], dir = UP, spreadAng = 1) => burst(layer, at, n, {
    color: SAND, kind: "dot", additive: false, life: [0.5, 0.9], size: [8, 4], alpha: 0.9, speed, angle: [dir - spreadAng, dir + spreadAng], gravity: -420,
    drag: 0.8
})

/** Bụi cát mịn lơ lửng */
const dust = (layer: Node, at: Pt, n: number, size: number, spread = 30) => burst(layer, at, n, {
    color: SAND, kind: "glow", additive: false, life: [0.5, 0.9], size: [size * 0.6, size * 1.4], alpha: 0.4, speed: [10, 60], drag: 1.5, spread
})

/** Dáng Lính Cát tại at (giữ `life` giây): thân cột cát, đầu mũ, khiên tròn, giáo dựng chéo */
function soldier(layer: Node, at: Pt, k: number, life: number, face = UP) {
    const h = 70 * k
    for (let i = 0; i < 6; i++) {
        const p = offset(at, UP, -h * 0.3 + i * h / 7)
        emit(layer, p, {
            color: [OCHRE, 0x9a7038], kind: "glow", additive: false, life: [life, life], size: [30 * k, 26 * k], alpha: 0.55
        })
        emit(layer, p, {
            color: [GOLD, CREAM], kind: "dot", life: [life, life], size: [8, 6], alpha: 0.7, spread: 8
        })
    }
    const head = offset(at, UP, h * 0.6)
    emit(layer, head, {
        color: [GOLD], kind: "glow", life: [life, life], size: [28 * k, 24 * k], alpha: 0.9
    })
    // mũ chim ưng: một mảnh sắc chĩa về trước
    emit(layer, offset(head, face, 8), {
        color: [BRIGHT], kind: "blade", life: [life, life], size: [16 * k, 14 * k], alpha: 1, rotation: face, stretch: 1.4
    })
    // khiên tròn
    emit(layer, offset(at, face + 0.9, 18 * k), {
        color: [GOLD], kind: "ring", life: [life, life], size: [40 * k, 38 * k], alpha: 0.9
    })
    // giáo
    const base = offset(at, face - 1.1, 22 * k)
    seg(layer, offset(base, face + 0.35, -40 * k), offset(base, face + 0.35, 50 * k), 2.5, [CREAM, GOLD], life, 1)
    emit(layer, offset(base, face + 0.35, 58 * k), {
        color: [BRIGHT, 0xffffff], kind: "blade", life: [life, life], size: [16 * k, 14 * k], alpha: 1, rotation: face + 0.35, stretch: 1.6
    })
}

/** Lính trồi lên: cột cát xoáy bốc lên rồi kết thành dáng Lính */
async function rise(layer: Node, at: Pt, k: number, hold: number, face = UP) {
    ring(layer, at, OCHRE, 120 * k, 40 * k, 0.3, 0.7)
    let a = 0
    await over(layer, 0.3, (t) => {
        for (let i = 0; i < 3; i++) {
            a += 0.6
            emit(layer, {
                x: at.x + Math.cos(a) * 30 * k * (1 - t * 0.5), y: at.y - 30 + t * 80 * k + Math.sin(a) * 8
            }, {
                color: [...SAND, GOLD], kind: "dot", additive: false, life: [0.2, 0.35], size: [9, 4], alpha: 0.9, speed: [40, 100], angle: [UP, UP]
            })
        }
    })
    flash(layer, at, BRIGHT, 110 * k, 0.25, 0.7)
    soldier(layer, at, k, hold, face)
    void sandSpray(layer, at, 8, [60, 160])
}

/** Nhát giáo: mũi giáo cát vàng đâm từ a tới b rất nhanh, chạm loé vàng trắng, rút về để lại vệt cát */
async function thrust(layer: Node, a: Pt, b: Pt, secs: number, k: number) {
    const dir = angleOf(a, b)
    await carry(layer, (t) => mix(a, b, t), secs, (p) => {
        emit(layer, p, {
            color: [BRIGHT, 0xffffff], kind: "blade", life: [0.05, 0.07], size: [24 * k, 20 * k], alpha: 1, rotation: dir, stretch: 2.4
        })
        emit(layer, offset(p, dir, -20), {
            color: [GOLD, CREAM], kind: "blade", life: [0.1, 0.16], size: [14, 10], alpha: 0.9, rotation: dir, stretch: 3.2
        })
        if (Math.random() < 0.6) emit(layer, p, {
            color: SAND, kind: "dot", additive: false, life: [0.3, 0.5], size: [6, 3], alpha: 0.8, speed: [20, 70], gravity: -200
        })
    }, ease.in)
    star(layer, b, 22 * k, [BRIGHT, GOLD], 0.18, dir + 0.785)
    void sparks(layer, b, 6, [BRIGHT, GOLD, CREAM], [180, 380], {
        angle: [dir - 0.6, dir + 0.6]
    })
}

/** Đánh thường (cận chiến qua Lính Cát): mũi giáo cát đâm thẳng vào mục tiêu từ phía Azir, chạm toé bụi cát nhỏ */
registerSkillVfx("basic_azir", async (ctx) => {
    const to = firstFoe(ctx)
    await meleeStab(ctx.layer, to, angleOf(ctx.from, to), [BRIGHT, GOLD, CREAM], SAND)
})

/** Ba ô Lính quanh Azir trên hàng mình: ô của Azir và hai ô kề gần nhất */
function soldierCells(ctx: VfxCtx): Pt[] {
    return allyRow(ctx).sort((a, b) => dist(ctx.from, a) - dist(ctx.from, b)).slice(0, 3)
}

/**
 * Q Cát Càn Quét: Azir ra lệnh, Lính trên sân dựng lên và cùng đâm vào một tướng địch; số nhát theo Tốc Đánh nên giáo đâm liền
 * mấy nhịp, dải cát vàng tràn theo mũi giáo, mỗi nhát loé vàng trắng.
 */
registerSkillVfx("azir_q", async (ctx) => {
    const k = power(ctx)
    const to = firstFoe(ctx)
    const cells = soldierCells(ctx)
    flash(ctx.layer, ctx.from, GOLD, 120, 0.3, 0.6)
    await Promise.all(cells.map((c) => rise(ctx.layer, c, 0.85, 1.4, angleOf(c, to))))
    // dải cát tràn tới mục tiêu
    for (const c of cells) void stream(ctx.layer, () => mix(c, to, Math.random()), 0.5, 60, {
        color: [...SAND, GOLD], kind: "dot", additive: false, life: [0.3, 0.5], size: [8, 3], alpha: 0.8, speed: [60, 140], angle: [angleOf(c, to) - 0.2, angleOf(c, to) + 0.2]
    })
    for (let n = 0; n < 3; n++) {
        await Promise.all(cells.map((c) => thrust(ctx.layer, offset(c, angleOf(c, to), 40), offset(to, angleOf(c, to), -24), 0.12, k)))
        flash(ctx.layer, to, BRIGHT, 120 * k, 0.16, 0.8)
        await wait(ctx.layer, 0.1)
    }
    void sandSpray(ctx.layer, to, 14, [100, 260])
    ring(ctx.layer, to, GOLD, 40, 200 * k, 0.35, 0.8)
    await wait(ctx.layer, 0.35)
})

/**
 * E Trỗi Dậy! (đồng minh, gọi 1 Lính lên ô của tướng đó): xoáy cát tròn trên đất ở ô đích, hạt cát dâng thành dáng Lính cầm giáo,
 * bụi lắng quanh chân; Lính đứng gác trên ô.
 */
registerSkillVfx("azir_e", async (ctx) => {
    const k = power(ctx)
    const cell = ctx.to[0] ?? ctx.from
    const face = angleOf(ctx.from, firstFoe(ctx))
    if (dist(ctx.from, cell) > 40) {
        await carry(ctx.layer, (t) => mix(ctx.from, cell, t), 0.25, (p) => emit(ctx.layer, p, {
            color: [GOLD, CREAM], kind: "glow", life: [0.2, 0.3], size: [30, 10], alpha: 0.8
        }))
    }
    // xoáy cát trên đất
    let a = 0
    await over(ctx.layer, 0.3, (t) => {
        for (let i = 0; i < 4; i++) {
            a += 0.5
            emit(ctx.layer, {
                x: cell.x + Math.cos(a) * 60 * (1 - t * 0.6), y: cell.y - 30 + Math.sin(a) * 18
            }, {
                color: [...SAND, GOLD], kind: "dot", additive: false, life: [0.25, 0.4], size: [9, 4], alpha: 0.9
            })
        }
    })
    // cột cát dâng mạnh
    void burst(ctx.layer, cell, 24, {
        color: [...SAND, GOLD, CREAM], kind: "dot", life: [0.3, 0.5], size: [10, 4], alpha: 0.9, speed: [200, 380], angle: [UP - 0.15, UP + 0.15], drag: 2.4,
        spread: 16
    })
    await wait(ctx.layer, 0.12)
    flash(ctx.layer, cell, BRIGHT, 160 * k, 0.3, 0.8)
    soldier(ctx.layer, cell, 1.1 * k, 1, face)
    void dust(ctx.layer, offset(cell, UP, -30), 8, 40, 40)
    void sandSpray(ctx.layer, cell, 10, [60, 180], UP, 1.4)
    await wait(ctx.layer, 0.9)
})

/** Đĩa mặt trời: vầng tròn vàng, tia nắng toả, viền tím hoàng hôn (icon nội tại và chiêu cuối) */
function sunDisc(layer: Node, at: Pt, r: number, life: number) {
    flash(layer, at, DUSK, r * 4.4, life, 0.35)
    flash(layer, at, GOLD, r * 2.8, life, 0.7)
    emit(layer, at, {
        color: [GOLD], kind: "ring", life: [life, life], size: [r * 2.4, r * 2.6], alpha: 1
    })
    emit(layer, at, {
        color: [CREAM], kind: "ring", life: [life, life], size: [r * 1.4, r * 1.5], alpha: 0.6
    })
    for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU
        seg(layer, offset(at, a, r * 1.3), offset(at, a, r * (i % 2 ? 1.9 : 2.4)), 3, [BRIGHT, GOLD], life, 0.9)
    }
}

/**
 * R Phân Chia Thiên Hạ: đĩa mặt trời bừng sau Azir, hàng Lính cát dựng thành tường dọc hàng mình, rồi cả hàng giáo đâm một nhịp vào
 * địch đối diện từng ô; cát cuộn thành sóng đổ theo mũi giáo.
 */
registerSkillVfx("azir_r", async (ctx) => {
    const k = power(ctx)
    const allies = allyRow(ctx)
    const foes = foeRow(ctx)
    const pairs = allies.map((a) => [a, foes.reduce((b, f) => (dist(a, f) < dist(a, b) ? f : b), foes[0])] as const)
    sunDisc(ctx.layer, offset(ctx.from, UP, 40), 50 * k, 1.6)
    // tường Lính dựng lên lần lượt từ ô Azir ra hai bên
    const order = [...allies].sort((a, b) => dist(ctx.from, a) - dist(ctx.from, b))
    await Promise.all(order.map(async (c, i) => {
        await wait(ctx.layer, i * 0.06)
        const f = pairs.find((p) => p[0] === c)![1]
        await rise(ctx.layer, c, 0.9, 1.1, angleOf(c, f))
    }))
    await wait(ctx.layer, 0.1)
    // cả hàng đâm một nhịp, sóng cát đổ theo
    await Promise.all(pairs.map(async ([a, f]) => {
        const d = angleOf(a, f)
        void burst(ctx.layer, a, 10, {
            color: SAND, kind: "glow", additive: false, life: [0.4, 0.6], size: [30, 70], alpha: 0.45, speed: [300, 500], angle: [d - 0.2, d + 0.2], drag: 2
        })
        await thrust(ctx.layer, offset(a, d, 40), offset(f, d, -20), 0.16, 1.3 * k)
        flash(ctx.layer, f, BRIGHT, 150 * k, 0.2, 0.9)
        ring(ctx.layer, f, GOLD, 40, 190 * k, 0.35, 0.8)
        void sandSpray(ctx.layer, f, 10, [100, 240], d, 0.8)
    }))
    await wait(ctx.layer, 0.45)
})

/**
 * Nội tại Hoàng Đế Shurima: đĩa mặt trời loé trên Azir, mọi Lính trên sân đâm địch đối diện ô có Lính (sát thương hiệu ứng khi
 * Azir đánh trúng); lá E tạm được trao: ánh vàng ngọc lục lấp lánh.
 */
registerSkillVfx("azir_p", async (ctx) => {
    const k = power(ctx)
    sunDisc(ctx.layer, offset(ctx.from, UP, 40), 32 * k, 0.8)
    star(ctx.layer, offset(ctx.from, UP, 40), 30, [TEAL, CREAM], 0.5, 0)
    const foes = ctx.to.length ? ctx.to : [firstFoe(ctx)]
    await wait(ctx.layer, 0.2)
    await Promise.all(foes.map(async (f) => {
        const d = angleOf(ctx.from, f)
        await thrust(ctx.layer, offset(f, d, -140), offset(f, d, -16), 0.12, k)
        flash(ctx.layer, f, BRIGHT, 100, 0.18)
        void sandSpray(ctx.layer, f, 8, [80, 200], d)
    }))
    await wait(ctx.layer, 0.4)
})
