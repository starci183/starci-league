// VFX Ahri trên Cocos, theo thiết kế bản web (fx_ahri.ts): LỬA HỒ LY, ngọn lửa ma hồng tím, kim tuyến mịn, vệt hạt khi lướt.
// Q cầu ma lực bay đi rồi quay về (trúng hai lần: phép rồi chuẩn), E đổi chỗ với đồng minh rồi lưỡi lửa vào địch đối diện chỗ
// mới, R trái tim mê hoặc. Ô: basic_ahri, ahri_p/q/e/r.
import {
    Node
} from "cc"
import {
    angleOf, dist, mix, rand, wait, type Pt
} from "./particles"
import {
    emit
} from "./g2_helpers"
import {
    registerSkillVfx
} from "./registry"
import {
    TAU, UP, add, curve, fly, gather, glow, laneGap, main, motes, polar, pow, pulse, ring, settle, sparks
} from "./g2_helpers"

const PINK = 0xff7ac0
const ROSE = 0xff5aa8
const LILAC = 0xc080ff
const BLUSH = 0xffd0f0
const SKY = 0x80d0ff
const FOX = [PINK, ROSE, LILAC, BLUSH]

/** Điểm trên đường viền trái tim, a 0..TAU, r là nửa bề ngang */
const heart = (at: Pt, a: number, r: number): Pt => ({
    x: at.x + r * Math.sin(a) ** 3,
    y: at.y + (r / 16) * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)),
})

/** Đuôi lửa hồ ly của một viên đạn: lõi hạt, lưỡi lửa uốn, kim tuyến */
function foxTrail(layer: Node, p: Pt, cols: number[], size: number) {
    glow(layer,
        p,
        [0xffffff],
        size * 0.7,
        size * 0.4,
        0.06)
    emit(layer,
        p,
        {
            color: cols, kind: "glow", life: [0.2,
                0.4], size: [size,
                size * 0.2], alpha: 0.85, speed: [20,
                80], spread: 6, gravity: 60
        })
    if (Math.random() < 0.6) emit(layer,
        p,
        {
            color: [BLUSH, 0xffffff], kind: "dot", life: [0.4,
                0.7], size: [5,
                1], alpha: 1, speed: [20,
                90], drag: 1
        })
}

/** Nổ lửa hồ ly: cánh năng lượng toả, lưỡi lửa bay lên, kim tuyến rơi chậm */
function foxBurst(layer: Node, at: Pt, k: number, cols = FOX) {
    glow(layer,
        at,
        [0xffffff],
        30,
        120 * k,
        0.18)
    glow(layer,
        at,
        [cols[0]],
        50,
        190 * k,
        0.4,
        0.7)
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + rand(-0.2,
            0.2)
        emit(layer,
            polar(at,
                a,
                20),
            {
                color: cols, kind: "blade", life: [0.3,
                    0.42], size: [40 * k,
                    20], alpha: 0.9, rotation: a, stretch: 1.6, speed: [120,
                    200], angle: [a,
                    a], drag: 3
            })
    }
    motes(layer,
        at,
        Math.round(16 * k),
        [...cols, 0xffffff],
        [60,
            240],
        {
            life: [0.5,
                0.9], gravity: 40, size: [6,
                1]
        })
}

/** Đánh thường: quả cầu lửa hồ ly nhỏ bay cong tới mục tiêu */
registerSkillVfx("basic_ahri",
    async (ctx) => {
        const to = main(ctx)
        await fly(ctx.layer,
            0.3,
            (u) => curve(ctx.from,
                to,
                40,
                u),
            (p) => foxTrail(ctx.layer,
                p,
                FOX,
                24))
        foxBurst(ctx.layer,
            to,
            0.6)
        await settle(ctx.layer,
            0.4)
    })

/** Nội tại Hút Tinh Hoa: các luồng tinh hoa từ mục tiêu (hoặc quanh Ahri) uốn cong rồi xoáy vào Ahri */
registerSkillVfx("ahri_p",
    async (ctx) => {
        const srcs = ctx.to.length ? ctx.to : [0,
            1,
            2].map((i) => polar(ctx.from,
            UP + (i - 1) * 1.1,
            160))
        await Promise.all(srcs.flatMap((s) => [0,
            1,
            2].map(async (j) => {
            await wait(ctx.layer,
                j * 0.07)
            const bend = (j - 1) * 70 + rand(-20,
                20)
            await fly(ctx.layer,
                0.42,
                (u) => curve(s,
                    ctx.from,
                    bend,
                    u),
                (p) => emit(ctx.layer,
                    p,
                    {
                        color: [BLUSH, PINK, SKY], kind: "glow", life: [0.2,
                            0.4], size: [16,
                            4], alpha: 0.9
                    }),
                (t) => t * t)
        })))
        glow(ctx.layer,
            ctx.from,
            [PINK],
            40,
            150,
            0.35)
        ring(ctx.layer,
            ctx.from,
            [BLUSH],
            150,
            60,
            0.35)
        motes(ctx.layer,
            ctx.from,
            12,
            [BLUSH, 0xffffff],
            [30,
                110],
            {
                gravity: 80
            })
        await settle(ctx.layer,
            0.5)
    })

/**
 * Q Quả Cầu Ma Lực: cầu xanh hồng xoay, hai sợi lửa quấn quanh, bay thẳng trúng mục tiêu (phép), lướt quá rồi chậm lại; quay
 * về tăng tốc xuyên mục tiêu lần hai (lượt về màu trắng, sát thương chuẩn theo Máu đã mất) rồi tan vào Ahri.
 */
registerSkillVfx("ahri_q",
    async (ctx) => {
        const k = pow(ctx)
        const to = main(ctx)
        const d = angleOf(ctx.from,
            to)
        const far = polar(to,
            d,
            Math.min(140,
                dist(ctx.from,
                    to) * 0.4))
        let spin = 0
        const orb = (p: Pt, cols: number[]) => {
            spin += 0.5
            foxTrail(ctx.layer,
                p,
                cols,
                34)
            for (const off of [0,
                Math.PI]) emit(ctx.layer,
                polar(p,
                    spin + off,
                    16),
                {
                    color: cols, kind: "glow", life: [0.16,
                        0.26], size: [12,
                        4], alpha: 1
                })
        }
        gather(ctx.layer,
            ctx.from,
            70,
            0.18,
            120,
            {
                color: [PINK, SKY]
            })
        await wait(ctx.layer,
            0.18)
        // lượt đi
        await fly(ctx.layer,
            0.26,
            (u) => mix(ctx.from,
                to,
                u),
            (p) => orb(p,
                [PINK, SKY, BLUSH]))
        foxBurst(ctx.layer,
            to,
            0.9 * k,
            [PINK, SKY, BLUSH])
        await fly(ctx.layer,
            0.22,
            (u) => mix(to,
                far,
                u),
            (p) => orb(p,
                [PINK, SKY]),
            (t) => 1 - (1 - t) ** 2)
        // lượt về: trắng, nhanh dần
        await fly(ctx.layer,
            0.18,
            (u) => mix(far,
                to,
                u),
            (p) => orb(p,
                [0xffffff, BLUSH]),
            (t) => t * t)
        foxBurst(ctx.layer,
            to,
            0.9 * k,
            [0xffffff, BLUSH, SKY])
        sparks(ctx.layer,
            to,
            10,
            [0xffffff, BLUSH],
            [260,
                560],
            {
                angle: [d + Math.PI - 0.7,
                    d + Math.PI + 0.7]
            })
        await fly(ctx.layer,
            0.24,
            (u) => mix(to,
                ctx.from,
                u),
            (p) => orb(p,
                [0xffffff, BLUSH]),
            (t) => t * t)
        glow(ctx.layer,
            ctx.from,
            [BLUSH],
            40,
            100,
            0.25)
        await settle(ctx.layer,
            0.35)
    })

/**
 * E Phi Hồ: chọn một tướng mình khác và đổi chỗ (cú đổi chỗ do swap.ts vẽ chung). Phía thi triển: lửa hồ ly bùng, chín đuôi
 * lửa xoè sau lưng Ahri; rồi ba lưỡi lửa rất nhanh phóng từ vị trí mới (ô của đồng minh) vào tướng địch đối diện.
 */
registerSkillVfx("ahri_e",
    async (ctx) => {
        const k = pow(ctx)
        const ally = main(ctx)
        // địch đối diện vị trí mới: cùng cột với đồng minh, ở hàng trên
        const foe = add(ally,
            0,
            laneGap(ctx) * 1.75)
        // phần đổi chỗ do hiệu ứng chung swap.ts vẽ; ở đây chỉ có phía thi triển: lửa hồ ly bùng quanh Ahri, chín đuôi lửa xoè
        glow(ctx.layer,
            ctx.from,
            [PINK],
            40,
            150,
            0.3,
            0.8)
        for (let i = 0; i < 9; i++) {
            const a = UP + (i - 4) * 0.28
            emit(ctx.layer,
                polar(ctx.from,
                    a + Math.PI,
                    20),
                {
                    color: [PINK, ROSE, BLUSH], kind: "blade", life: [0.3,
                        0.45], size: [44,
                        14], alpha: 0.9, rotation: a + Math.PI, stretch: 2.6, speed: [120,
                        180], angle: [a + Math.PI,
                        a + Math.PI], drag: 3
                })
        }
        motes(ctx.layer,
            ctx.from,
            12,
            FOX,
            [60,
                200])
        await wait(ctx.layer,
            0.3)
        glow(ctx.layer,
            ally,
            [PINK],
            40,
            130,
            0.3)
        // ba lưỡi lửa phóng vào địch đối diện
        await Promise.all([0,
            1,
            2].map(async (i) => {
            await wait(ctx.layer,
                i * 0.06)
            await fly(ctx.layer,
                0.2,
                (u) => curve(ally,
                    foe,
                    (i - 1) * 80,
                    u),
                (p, dd) => {
                    emit(ctx.layer,
                        p,
                        {
                            color: [0xffffff, PINK], kind: "blade", life: [0.12,
                                0.2], size: [30,
                                10], alpha: 1, rotation: dd, stretch: 2.6
                        })
                    foxTrail(ctx.layer,
                        p,
                        FOX,
                        18)
                })
        }))
        foxBurst(ctx.layer,
            foe,
            1.0 * k)
        await settle(ctx.layer,
            0.45)
    })

/**
 * R Mê Hoặc: lửa hồng tụ thành trái tim trước ngực Ahri, trái tim bay chao tới tướng đối diện, chạm là vỡ thành cánh hồng và
 * vòng trái tim nhỏ lơ lửng trên đầu nó (Say Mê không hết hạn), kim tuyến rơi.
 */
registerSkillVfx("ahri_r",
    async (ctx) => {
        const k = pow(ctx)
        const to = main(ctx)
        const chest = add(ctx.from,
            0,
            40)
        // tụ trái tim
        await pulse(ctx.layer,
            0.4,
            180,
            (t) => {
                const a = rand(0,
                    TAU)
                emit(ctx.layer,
                    heart(chest,
                        a,
                        30 + 20 * t),
                    {
                        color: [PINK, ROSE, BLUSH], kind: "glow", life: [0.12,
                            0.2], size: [16,
                            6], alpha: 1
                    })
            })
        // trái tim bay chao
        await fly(ctx.layer,
            0.45,
            (u) => {
                const p = mix(chest,
                    to,
                    u)
                return polar(p,
                    angleOf(chest,
                        to) + UP,
                    Math.sin(u * TAU) * 26)
            },
            (p) => {
                for (let i = 0; i < 10; i++) emit(ctx.layer,
                    heart(p,
                        (i / 10) * TAU,
                        24 * k * 0.8),
                    {
                        color: [PINK, ROSE], kind: "glow", life: [0.06,
                            0.08], size: [14,
                            10], alpha: 1
                    })
                glow(ctx.layer,
                    p,
                    [BLUSH],
                    40,
                    30,
                    0.06)
                emit(ctx.layer,
                    p,
                    {
                        color: [ROSE, LILAC, SKY], kind: "dot", life: [0.3,
                            0.6], size: [6,
                            1], alpha: 1, speed: [20,
                            80]
                    })
            },
            (t) => t * t * (3 - 2 * t))
        // vỡ: cánh hồng toả, trái tim lớn loé quanh mục tiêu
        foxBurst(ctx.layer,
            to,
            1.0 * k,
            [ROSE, PINK, SKY, BLUSH])
        for (let i = 0; i < 28; i++) emit(ctx.layer,
            heart(to,
                (i / 28) * TAU,
                60),
            {
                color: [ROSE, BLUSH], kind: "glow", life: [0.4,
                    0.5], size: [18,
                    6], alpha: 0.9
            })
        // Say Mê: ba trái tim nhỏ chao trên đầu
        await pulse(ctx.layer,
            0.7,
            50,
            (t) => {
                for (let i = 0; i < 3; i++) {
                    const a = t * TAU + i * TAU / 3
                    const c = add(to,
                        Math.cos(a) * 36,
                        66 + Math.sin(a) * 10)
                    emit(ctx.layer,
                        heart(c,
                            rand(0,
                                TAU),
                            9),
                        {
                            color: [PINK, ROSE], kind: "dot", life: [0.08,
                                0.12], size: [7,
                                5], alpha: 1
                        })
                }
            })
        await settle(ctx.layer,
            0.3)
    })

