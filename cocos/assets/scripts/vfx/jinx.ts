// VFX Jinx trên Cocos, theo thiết kế bản web (fx_jinx.ts): Bằng Chíu xanh lam, Xương Cá hồng tím, lửa thuốc nổ, khói đen, mảnh
// thép, tia điện hồng lam của cơn Phấn Khích. Q Giật Bắn! tia điện zíc zắc, E ba Lựu Đạn Ma Hỏa! đớp lửa (Mù), R tên lửa cá mập
// xuyên bàn nổ tại mục tiêu và 2 đường kề. Ô: basic_jinx, jinx_p/q/e/r.
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
    TAU, UP, add, fireBlast, flames, fly, gather, glow, lob, main, motes, polar, pow, pulse, ring, row, settle, smoke, sparks
} from "./g2_helpers"

const PINK = 0xff4aa0
const HOT_PINK = 0xff3a8a
const BLUE = 0x40c8ff
const VIOLET = 0xa060ff
const ZAP = [0xffffff, BLUE, PINK]
const BOOM = [0xfff0b0, 0xffc040, 0xff7a20, HOT_PINK]
const SMOKE = [0x1a1418, 0x2a2026]

/** Tia điện zíc zắc từ a tới b, sống `life` giây */
function lightning(layer: Node, a: Pt, b: Pt, cols: number[], width: number, life: number) {
    const n = Math.max(6,
        Math.round(dist(a,
            b) / 30))
    const d = angleOf(a,
        b)
    let prev = a
    for (let i = 1; i <= n; i++) {
        const base = mix(a,
            b,
            i / n)
        const p = i === n ? b : polar(base,
            d + UP,
            rand(-22,
                22))
        const mid = mix(prev,
            p,
            0.5)
        emit(layer,
            mid,
            {
                color: cols, kind: "blade", life: [life,
                    life * 1.2], size: [dist(prev,
                    p) * 0.5,
                width], alpha: 1, rotation: angleOf(prev,
                    p), stretch: 2.2
            })
        prev = p
    }
}

/** Tên lửa cá mập Xương Cá: đầu hồng, thân thép tím, răng trắng, mắt vàng, lửa đuôi */
function shark(layer: Node, p: Pt, d: number, s: number) {
    emit(layer,
        p,
        {
            color: [0x6a5a8a], kind: "blade", additive: false, life: [0.05,
                0.07], size: [s,
                s * 1.2], alpha: 1, rotation: d, stretch: 2
        })
    emit(layer,
        polar(p,
            d,
            s * 0.7),
        {
            color: [HOT_PINK], kind: "dot", additive: false, life: [0.05,
                0.07], size: [s * 0.8,
                s * 0.8], alpha: 1
        })
    emit(layer,
        polar(p,
            d,
            s * 0.95),
        {
            color: [0xffffff], kind: "blade", life: [0.05,
                0.07], size: [s * 0.4,
                s * 0.3], alpha: 1, rotation: d + UP, stretch: 1.4
        })
    emit(layer,
        polar(polar(p,
            d,
            s * 0.6),
        d + UP,
        s * 0.2),
        {
            color: [0xffe040], kind: "dot", life: [0.05,
                0.07], size: [s * 0.2,
                s * 0.2], alpha: 1
        })
    // vây đuôi
    for (const sd of [-1,
        1]) emit(layer,
        polar(polar(p,
            d,
            -s * 0.8),
        d + UP,
        sd * s * 0.3),
        {
            color: [VIOLET], kind: "blade", additive: false, life: [0.05,
                0.07], size: [s * 0.5,
                s * 0.4], alpha: 1, rotation: d + sd * 0.6, stretch: 1.2
        })
}

/** Đánh thường (Bằng Chíu): bốn viên đạn vạch sáng xanh lam bắn liên thanh */
registerSkillVfx("basic_jinx",
    async (ctx) => {
        const to = main(ctx)
        const d = angleOf(ctx.from,
            to)
        await Promise.all([0,
            1,
            2,
            3].map(async (i) => {
            await wait(ctx.layer,
                i * 0.06)
            glow(ctx.layer,
                polar(ctx.from,
                    d,
                    30),
                [0xffffff, BLUE],
                30,
                10,
                0.08)
            const hit = add(to,
                rand(-14,
                    14),
                rand(-14,
                    14))
            await fly(ctx.layer,
                0.14,
                (u) => mix(ctx.from,
                    hit,
                    u),
                (p) => emit(ctx.layer,
                    p,
                    {
                        color: [0xffffff, BLUE], kind: "blade", life: [0.06,
                            0.1], size: [34,
                            8], alpha: 1, rotation: d, stretch: 3
                    }))
            glow(ctx.layer,
                hit,
                [BLUE],
                20,
                60,
                0.12)
            sparks(ctx.layer,
                hit,
                4,
                [0xffffff, BLUE, 0xffe040],
                [160,
                    380],
                {
                    angle: [d + Math.PI - 0.8,
                        d + Math.PI + 0.8]
                })
        }))
        await settle(ctx.layer,
            0.3)
    })

/** Nội tại Phấn Khích: nhận Điên, tia điện hồng lam chạy quanh Jinx, vệt tốc độ vụt lên, lửa hồng bốc ở mép */
registerSkillVfx("jinx_p",
    async (ctx) => {
        const at = ctx.from
        glow(ctx.layer,
            at,
            [PINK],
            40,
            170,
            0.35,
            0.7)
        await pulse(ctx.layer,
            0.7,
            40,
            (t) => {
                const a = rand(0,
                    TAU)
                lightning(ctx.layer,
                    polar(at,
                        a,
                        40),
                    polar(at,
                        a + rand(0.6,
                            1.2),
                        80),
                    [PINK, BLUE, 0xffffff],
                    5,
                    0.1)
                emit(ctx.layer,
                    add(at,
                        rand(-50,
                            50),
                        -60),
                    {
                        color: [PINK, BLUE], kind: "blade", life: [0.2,
                            0.3], size: [30,
                            8], alpha: 0.9, speed: [500,
                            700], angle: [UP,
                            UP], align: true, stretch: 3
                    })
                if (t > 0.3) flames(ctx.layer,
                    add(at,
                        rand(-50,
                            50),
                        rand(-40,
                            40)),
                    1,
                    [HOT_PINK, PINK],
                    20,
                    4)
            })
        ring(ctx.layer,
            at,
            [BLUE, PINK],
            40,
            200,
            0.35)
        await settle(ctx.layer,
            0.35)
    })

/**
 * Q Giật Bắn!: một đòn đánh thật vào địch bất kỳ đường. Súng nạp điện (hạt hồng lam hút về nòng), tia điện zíc zắc phóng thẳng
 * tới mục tiêu và nháy ba lần, chạm là nổ điện: vòng sóng xanh, tia lửa, cộng dồn Điên (tia hồng bám người Jinx).
 */
registerSkillVfx("jinx_q",
    async (ctx) => {
        const k = pow(ctx)
        const to = main(ctx)
        const d = angleOf(ctx.from,
            to)
        const muzzle = polar(ctx.from,
            d,
            40)
        await gather(ctx.layer,
            muzzle,
            80,
            0.3,
            180,
            {
                color: ZAP
            })
        glow(ctx.layer,
            muzzle,
            [0xffffff],
            40,
            130,
            0.18)
        // đầu tia lao tới
        await fly(ctx.layer,
            0.16,
            (u) => mix(muzzle,
                to,
                u),
            (p) => {
                glow(ctx.layer,
                    p,
                    [0xffffff, BLUE],
                    40,
                    20,
                    0.08)
                emit(ctx.layer,
                    polar(p,
                        d + UP,
                        rand(-10,
                            10)),
                    {
                        color: ZAP, kind: "blade", life: [0.12,
                            0.2], size: [30,
                            6], alpha: 1, rotation: d + rand(-0.6,
                            0.6), stretch: 2
                    })
            })
        for (let i = 0; i < 3; i++) {
            lightning(ctx.layer,
                muzzle,
                to,
                i % 2 ? [PINK, 0xffffff] : [BLUE, 0xffffff],
                9,
                0.14)
            await wait(ctx.layer,
                0.06)
        }
        glow(ctx.layer,
            to,
            [0xffffff],
            40,
            150 * k,
            0.18)
        ring(ctx.layer,
            to,
            [BLUE],
            30,
            220 * k,
            0.35)
        sparks(ctx.layer,
            to,
            16,
            ZAP,
            [260,
                640])
        for (let i = 0; i < 4; i++) {
            const a = rand(0,
                TAU)
            lightning(ctx.layer,
                to,
                polar(to,
                    a,
                    rand(60,
                        110)),
                [BLUE, PINK],
                5,
                0.16)
        }
        motes(ctx.layer,
            to,
            10,
            [PINK, BLUE],
            [60,
                200])
        await settle(ctx.layer,
            0.4)
    })

/**
 * E Lựu Đạn Ma Hỏa! (Quick, kẻ vừa đánh tướng mình là mục tiêu): ba hàm thép cam răng nhọn ném vồng quanh mục tiêu, đáp đất rồi
 * cùng đớp sập: lửa nổ, khói đen dày che mắt (Mù).
 */
registerSkillVfx("jinx_e",
    async (ctx) => {
        const k = pow(ctx)
        const to = main(ctx)
        const spots = [add(to,
            -50,
            -10),
        add(to,
            50,
            -10),
        add(to,
            0,
            40)]
        // ném vồng
        await Promise.all(spots.map(async (s, i) => {
            await wait(ctx.layer,
                i * 0.07)
            let spin = 0
            await fly(ctx.layer,
                0.4,
                (u) => lob(ctx.from,
                    s,
                    150,
                    u),
                (p) => {
                    spin += 0.5
                    emit(ctx.layer,
                        p,
                        {
                            color: [0xff8a30, 0xd06a20], kind: "dot", additive: false, life: [0.05,
                                0.07], size: [24,
                                24], alpha: 1
                        })
                    emit(ctx.layer,
                        polar(p,
                            spin,
                            8),
                        {
                            color: [0xffffff], kind: "blade", life: [0.05,
                                0.07], size: [10,
                                6], alpha: 1, rotation: spin, stretch: 1.4
                        })
                    if (Math.random() < 0.5) emit(ctx.layer,
                        p,
                        {
                            color: [0xffc040, PINK], kind: "dot", life: [0.2,
                                0.4], size: [6,
                                1], alpha: 1, speed: [10,
                                40]
                        })
                })
            // đáp đất: hàm mở chờ
            for (const sd of [-1,
                1]) for (let j = 0; j < 4; j++) emit(ctx.layer,
                add(s,
                    (j - 1.5) * 8,
                    sd * 10),
                {
                    color: [0xff8a30, 0xffffff], kind: "blade", life: [0.32,
                        0.36], size: [12,
                        10], alpha: 1, rotation: sd > 0 ? -UP : UP, stretch: 1, speed: [30,
                        40], angle: [sd > 0 ? -UP : UP,
                        sd > 0 ? -UP : UP]
                })
        }))
        await wait(ctx.layer,
            0.2)
        // đớp sập + nổ lửa
        for (const s of spots) {
            fireBlast(ctx.layer,
                s,
                0.7 * k,
                BOOM,
                SMOKE)
            sparks(ctx.layer,
                s,
                6,
                [0xffffff, 0xff8a30],
                [200,
                    460])
        }
        // khói đen che mắt (Mù)
        void pulse(ctx.layer,
            0.6,
            40,
            () => emit(ctx.layer,
                add(to,
                    rand(-60,
                        60),
                    rand(-20,
                        60)),
                {
                    color: SMOKE, kind: "glow", additive: false, life: [0.6,
                        0.9], size: [50,
                        110], alpha: 0.5, speed: [10,
                        50], gravity: 40
                }))
        await settle(ctx.layer,
            0.9)
    })

/**
 * R Tên Lửa Đạn Đạo Siêu Khủng Khiếp!: một địch bất kỳ đường. Bệ Xương Cá chớp nòng (khói phụt ngược), tên lửa cá mập bay vồng
 * qua bàn với lửa đuôi hồng và khói đặc, tăng tốc dần; trúng là nổ thuốc súng khổng lồ, 2 đường kề nhận phần nổ nhỏ hơn.
 */
registerSkillVfx("jinx_r",
    async (ctx) => {
        const k = pow(ctx)
        const to = main(ctx)
        const foes = row(ctx,
            3)
        const d0 = angleOf(ctx.from,
            to)
        // chớp nòng
        const muzzle = polar(ctx.from,
            d0,
            40)
        glow(ctx.layer,
            muzzle,
            [0xffffff],
            40,
            160,
            0.2)
        smoke(ctx.layer,
            polar(ctx.from,
                d0 + Math.PI,
                20),
            6,
            SMOKE,
            20,
            80)
        sparks(ctx.layer,
            muzzle,
            10,
            BOOM,
            [200,
                500],
            {
                angle: [d0 - 0.5,
                    d0 + 0.5]
            })
        await wait(ctx.layer,
            0.12)
        // tên lửa bay vồng, tăng tốc
        const h = Math.min(220,
            dist(ctx.from,
                to) * 0.35)
        await fly(ctx.layer,
            0.7,
            (u) => lob(muzzle,
                to,
                h,
                u),
            (p, dd) => {
                shark(ctx.layer,
                    p,
                    dd,
                    30 * Math.min(1.3,
                        k * 0.7))
                const tail = polar(p,
                    dd + Math.PI,
                    40)
                emit(ctx.layer,
                    tail,
                    {
                        color: [0xffffff, 0xffc040, HOT_PINK], kind: "glow", life: [0.15,
                            0.3], size: [36,
                            8], alpha: 1, speed: [40,
                            120], angle: [dd + Math.PI - 0.3,
                            dd + Math.PI + 0.3]
                    })
                emit(ctx.layer,
                    tail,
                    {
                        color: SMOKE, kind: "glow", additive: false, life: [0.5,
                            0.8], size: [20,
                            60], alpha: 0.45, spread: 6, gravity: 30
                    })
                if (Math.random() < 0.4) motes(ctx.layer,
                    tail,
                    1,
                    [PINK, BLUE],
                    [30,
                        90])
            },
            (t) => t * t * (1.4 - 0.4 * t))
        // nổ: mục tiêu chính rồi hai đường kề
        fireBlast(ctx.layer,
            to,
            1.0 * k,
            BOOM,
            SMOKE)
        ring(ctx.layer,
            to,
            [HOT_PINK, BLUE],
            40,
            260 * k,
            0.5)
        for (let i = 0; i < 5; i++) lightning(ctx.layer,
            to,
            polar(to,
                rand(0,
                    TAU),
                rand(80,
                    140)),
            [PINK, BLUE],
            5,
            0.2)
        await Promise.all(foes.slice(1).map(async (p) => {
            await wait(ctx.layer,
                0.1)
            fireBlast(ctx.layer,
                p,
                0.8,
                BOOM,
                SMOKE)
        }))
        await settle(ctx.layer,
            0.7)
    })
