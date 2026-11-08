// VFX Katarina trên Cocos, theo thiết kế bản web (fx_katarina.ts): THÉP ĐỎ THẪM, dao lưỡi thép chuôi đỏ, mảnh sắc, bụi đỏ máu và
// khói đen khi Thuấn Bộ. Đòn luôn chém ngay tại mục tiêu, không có dao bay ngang bàn. Q/E dịch chuyển sang đối diện mục tiêu rồi
// chém; R bông sen dao ở đối diện và 2 đường kề. Ô: basic_katarina, katarina_p/q/e/r.
import {
    Node
} from "cc"
import {
    mix, pick, rand, wait, type Pt
} from "./particles"
import {
    emit, meleeStab
} from "./g2_helpers"
import {
    registerSkillVfx
} from "./registry"
import {
    TAU, UP, DOWN, add, aim, fly, glow, laneGap, lob, main, motes, polar, pow, pulse, ring, row, settle, slashArc, slashLine, smoke,
    sparks
} from "./g2_helpers"

const CRIMSON = 0xe03050
const BLOOD = [0xe03050, 0xc02040, 0xff2a50]
const STEEL = [0xe8e8f0, 0xffffff, 0xc8c8d8]
const SMOKE = [0x1a1016, 0x2a161e, 0x3a1a24]

/** Dao: lưỡi thép dài + chắn tay đỏ, vẽ tại p theo góc a (mũi dao theo hướng a) */
function dagger(layer: Node, p: Pt, a: number, life = 0.06, size = 30) {
    emit(layer,
        polar(p,
            a,
            size * 0.5),
        {
            color: STEEL, kind: "blade", life: [life,
                life * 1.2], size: [size,
                size], alpha: 1, rotation: a, stretch: 1.6
        })
    emit(layer,
        p,
        {
            color: [CRIMSON], kind: "blade", additive: false, life: [life,
                life * 1.2], size: [size * 0.6,
                size * 0.6], alpha: 1, rotation: a + UP, stretch: 1
        })
    emit(layer,
        polar(p,
            a + Math.PI,
            size * 0.3),
        {
            color: [0x2a1a1a], kind: "blade", additive: false, life: [life,
                life * 1.2], size: [size * 0.5,
                size * 0.5], alpha: 1, rotation: a, stretch: 1
        })
}

/** Khói đen bụi đỏ nơi Katarina biến mất hoặc hiện ra */
function shunpoPuff(layer: Node, at: Pt, k = 1) {
    smoke(layer,
        at,
        Math.round(8 * k),
        SMOKE,
        28,
        80,
        {
            alpha: 0.65
        })
    motes(layer,
        at,
        Math.round(14 * k),
        BLOOD,
        [80,
            260],
        {
            life: [0.3,
                0.6]
        })
    ring(layer,
        at,
        [CRIMSON],
        30,
        140 * k,
        0.3,
        0.8)
}

/** Thép va thịt: mảnh sắc toả, tia kim loại rơi, sương máu */
function steelHit(layer: Node, at: Pt, k: number, dir?: number) {
    glow(layer,
        at,
        [0xffffff],
        30,
        110 * k,
        0.16)
    glow(layer,
        at,
        [CRIMSON],
        40,
        150 * k,
        0.3,
        0.6)
    sparks(layer,
        at,
        Math.round(14 * k),
        [...STEEL, CRIMSON],
        [240,
            620],
        dir === undefined ? {
        } : {
            angle: [dir - 1,
                dir + 1]
        })
    motes(layer,
        at,
        Math.round(12 * k),
        BLOOD,
        [60,
            220],
        {
            gravity: -300
        })
}

/** Vị trí của Katarina sau khi dịch chuyển sang đối diện `to`: cùng cột với mục tiêu, trên hàng mình */
const facing = (from: Pt, to: Pt): Pt => ({
    x: to.x, y: from.y
})

/**
 * Dịch chuyển: chỉ vẽ phía thi triển (khói đen bụi đỏ nơi Katarina biến mất, mảnh đỏ xoáy); cú dời ô do hiệu ứng chung swap.ts
 * vẽ theo sự kiện "move" của engine. `trail` (Thuấn Bộ) thì khói dày hơn và có lốc mảnh đỏ.
 */
async function blink(layer: Node, from: Pt, trail: boolean) {
    shunpoPuff(layer,
        from,
        trail ? 1.3 : 1)
    if (trail) for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU
        emit(layer,
            polar(from,
                a,
                30),
            {
                color: BLOOD, kind: "blade", life: [0.25,
                    0.35], size: [26,
                    10], alpha: 0.8, rotation: a + UP, stretch: 2.4, speed: [160,
                    220], angle: [a + UP,
                    a + UP], drag: 3
            })
    }
    await wait(layer,
        0.18)
}

/** Một dao rơi xuống một đường phía mình và cắm tại đó: thép lấp lánh, quầng đỏ */
async function dropDagger(layer: Node, spot: Pt) {
    const sky = add(spot,
        rand(-40,
            40),
        260)
    let spin = 0
    await fly(layer,
        0.36,
        (u) => mix(sky,
            spot,
            u),
        (p) => {
            spin += 0.7
            dagger(layer,
                p,
                spin,
                0.05,
                26)
            emit(layer,
                p,
                {
                    color: BLOOD, kind: "glow", life: [0.15,
                        0.25], size: [20,
                        6], alpha: 0.6
                })
        },
        (t) => t * t)
    // cắm xuống: mũi dao hướng xuống đất
    dagger(layer,
        add(spot,
            0,
            14),
        DOWN + 0.25,
        0.8,
        28)
    glow(layer,
        spot,
        [CRIMSON],
        30,
        80,
        0.7,
        0.6)
    sparks(layer,
        spot,
        6,
        STEEL,
        [100,
            240],
        {
            angle: [0.3,
                Math.PI - 0.3]
        })
}

/** Đánh thường: dao găm đâm nhanh vào mục tiêu, chấm máu nhỏ */
registerSkillVfx("basic_katarina",
    (ctx) => meleeStab(ctx.layer,
            main(ctx),
            aim(ctx),
            BLOOD,
            0xe8e8f0))

/**
 * Nội tại Nhặt Dao: Dao cắm dưới chân bật khỏi đất, xoay tít vào tay Katarina giữa cơn lốc mảnh sắc, rồi một nhát xoay tròn
 * chém tướng địch đối diện (sát thương phép).
 */
registerSkillVfx("katarina_p",
    async (ctx) => {
        const ground = add(ctx.from,
            40,
            -50)
        let spin = 0
        await fly(ctx.layer,
            0.28,
            (u) => lob(ground,
                ctx.from,
                90,
                u),
            (p) => {
                spin += 0.8
                dagger(ctx.layer,
                    p,
                    spin,
                    0.05,
                    26)
            })
        await pulse(ctx.layer,
            0.2,
            120,
            (t) => {
                const a = t * TAU * 2 + rand(0,
                    0.4)
                emit(ctx.layer,
                    polar(ctx.from,
                        a,
                        60),
                    {
                        color: BLOOD, kind: "blade", life: [0.15,
                            0.25], size: [24,
                            8], alpha: 1, rotation: a + UP, stretch: 2
                    })
            })
        const to = ctx.to[0]
        if (to) {
            await slashArc(ctx.layer,
                to,
                66,
                0,
                TAU,
                20,
                [...BLOOD, 0xe8e8f0],
                0.2)
            steelHit(ctx.layer,
                to,
                0.9)
        }
        await settle(ctx.layer,
            0.4)
    })

/**
 * Q Phi Dao: Katarina dịch chuyển sang đường đối diện mục tiêu (khói đen bụi đỏ nơi biến mất; cú dời ô do swap.ts vẽ), ba nhát dao đan chéo ngay trên mục
 * tiêu, nhát giữa mạnh nhất; sau đó một Dao rơi xuống ngẫu nhiên một đường phía mình.
 */
registerSkillVfx("katarina_q",
    async (ctx) => {
        const k = pow(ctx)
        const to = main(ctx)
        const at = facing(ctx.from,
            to)
        await blink(ctx.layer,
            ctx.from,
            false)
        const d = Math.atan2(to.y - at.y,
            to.x - at.x) || UP
        for (const [i, a] of [d + 1.0,
            d - 1.0,
            d + 0.1].entries()) {
            void slashLine(ctx.layer,
                to,
                a,
                i === 2 ? 170 : 130,
                i === 2 ? 22 : 16,
                [...BLOOD, 0xe8e8f0],
                0.08)
            await wait(ctx.layer,
                0.08)
        }
        steelHit(ctx.layer,
            to,
            1.1 * k,
            d)
        await wait(ctx.layer,
            0.15)
        // Dao rơi ngẫu nhiên một đường phía mình
        const g = laneGap(ctx)
        await dropDagger(ctx.layer,
            add(at,
                pick([-2,
                    -1,
                    0,
                    1,
                    2]) * g,
                -40))
        await settle(ctx.layer,
            0.3)
    })

/**
 * E Thuấn Bộ (Quick): chọn một đường có Dao; Katarina biến vào khói đen và lốc mảnh đỏ (cú dời ô do swap.ts vẽ), nhặt Dao,
 * rồi một nhát chéo dài bổ xuống tướng địch đối diện, tiếp nhát cắt ngang.
 */
registerSkillVfx("katarina_e",
    async (ctx) => {
        const k = pow(ctx)
        const to = main(ctx)
        const at = facing(ctx.from,
            to)
        await blink(ctx.layer,
            ctx.from,
            true)
        // nhặt Dao cắm tại đường mới
        sparks(ctx.layer,
            at,
            8,
            STEEL,
            [120,
                300])
        const d = Math.atan2(to.y - at.y,
            to.x - at.x) || UP
        await slashLine(ctx.layer,
            to,
            d + 0.75,
            200,
            24,
            [...BLOOD, 0xe8e8f0],
            0.12,
            0.4)
        steelHit(ctx.layer,
            to,
            0.9 * k,
            d)
        await slashLine(ctx.layer,
            to,
            0,
            150,
            16,
            [...BLOOD, 0xe8e8f0],
            0.08)
        smoke(ctx.layer,
            to,
            5,
            SMOKE,
            30,
            70)
        motes(ctx.layer,
            to,
            12,
            BLOOD,
            [80,
                240])
        await settle(ctx.layer,
            0.4)
    })

/**
 * R Bông Sen Tử Thần: chỉ dùng khi lượt này đã nhặt Dao. Sáu Dao xoay tít quanh Katarina giữa cơn lốc đỏ, rồi mảnh chém toả
 * thành bông sen ngay tại đối diện và 2 đường kề; đối diện nhận nhiều nhát, nhát dài hơn hẳn (x1,5).
 */
registerSkillVfx("katarina_r",
    async (ctx) => {
        const k = pow(ctx)
        const foes = row(ctx,
            3)
        const at = ctx.from
        // lốc dao quanh Katarina
        await pulse(ctx.layer,
            0.5,
            60,
            (t) => {
                for (let i = 0; i < 6; i++) {
                    const a = t * TAU * 2.4 + (i / 6) * TAU
                    dagger(ctx.layer,
                        polar(at,
                            a,
                            70),
                        a + UP,
                        0.05,
                        24)
                }
                emit(ctx.layer,
                    polar(at,
                        rand(0,
                            TAU),
                        rand(40,
                            100)),
                    {
                        color: BLOOD, kind: "blade", life: [0.18,
                            0.3], size: [22,
                            8], alpha: 0.9, rotation: rand(0,
                            TAU), stretch: 2.2
                    })
            })
        ring(ctx.layer,
            at,
            [CRIMSON],
            60,
            220,
            0.3)
        // bông sen tại từng mục tiêu: dao lao từ lốc tới, mảnh chém toả cánh hoa
        await Promise.all(foes.map(async (p, idx) => {
            const big = idx === 0
            const petals = big ? 8 : 5
            const n = big ? 6 : 3
            for (let j = 0; j < n; j++) {
                // dao vụt từ Katarina tới mục tiêu
                const s = polar(at,
                    rand(0,
                        TAU),
                    70)
                void fly(ctx.layer,
                    0.12,
                    (u) => mix(s,
                        p,
                        u),
                    (q, dd) => emit(ctx.layer,
                        q,
                        {
                            color: STEEL, kind: "blade", life: [0.08,
                                0.12], size: [26,
                                8], alpha: 1, rotation: dd, stretch: 2.6
                        }))
                await wait(ctx.layer,
                    0.1)
                const a0 = rand(0,
                    TAU)
                for (let i = 0; i < petals; i++) {
                    const a = a0 + (i / petals) * TAU
                    emit(ctx.layer,
                        polar(p,
                            a,
                            big ? 46 : 32),
                        {
                            color: [...BLOOD, 0xe8e8f0], kind: "blade", life: [0.2,
                                0.32], size: [big ? 46 : 32,
                                14], alpha: 1, rotation: a, stretch: 2.2
                        })
                }
                glow(ctx.layer,
                    p,
                    [CRIMSON],
                    30,
                    big ? 120 : 80,
                    0.18,
                    0.7)
                sparks(ctx.layer,
                    p,
                    big ? 5 : 3,
                    STEEL,
                    [200,
                        480])
            }
            steelHit(ctx.layer,
                p,
                big ? 1.3 * k * 0.7 : 0.8)
            if (big) ring(ctx.layer,
                p,
                [CRIMSON, 0xff2a50],
                30,
                170,
                0.35)
        }))
        await settle(ctx.layer,
            0.5)
    })
