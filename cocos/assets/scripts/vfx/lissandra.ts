// VFX Lissandra trên Cocos, theo thiết kế bản web (fx_lissandra.ts): BĂNG ĐEN, mũi băng chàm gần đen viền lam điện và lục lam,
// mảnh băng sắc, sương lạnh sà thấp, bụi băng lấp lánh; không có tím. Q giáo băng vỡ thành chùm, E vòng gai băng quanh mục tiêu,
// R băng đen tràn tới cả hàng địch rồi Lissandra tự đóng băng. Ô: basic_lissandra, lissandra_p/q/e/r.
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
    TAU, UP, add, aim, fly, glow, main, motes, polar, pow, pulse, ring, row, settle, slashLine, smoke, sparks, spikes, stunStars
} from "./g2_helpers"

const DARK = [0x0e1a3a, 0x16285a, 0x0a1430]
const ROYAL = 0x3a8aff
const ELECTRIC = 0x60c0ff
const CYAN = 0x80f0ff
const FROST = [0xffffff, 0xd8f7ff, CYAN]
const MIST = [0xc8e8ff, 0xa8d0f0]

/** Mũi băng đen dựng đứng: thân tối, viền sáng lam */
function iceSpike(layer: Node, at: Pt, h: number, life: number, tilt = 0) {
    emit(layer,
        add(at,
            0,
            h * 0.3),
        {
            color: DARK, kind: "blade", additive: false, life: [life,
                life * 1.1], size: [h * 0.3,
                h * 0.6], alpha: 1, rotation: UP + tilt, stretch: 1.5
        })
    emit(layer,
        add(at,
            0,
            h * 0.34),
        {
            color: [ELECTRIC, CYAN], kind: "blade", life: [life * 0.9,
                life], size: [h * 0.24,
                h * 0.42], alpha: 0.8, rotation: UP + tilt, stretch: 1.3
        })
}

/** Vỡ băng: mảnh băng đen sắc văng, mảnh lam sáng, bụi băng rơi, sương lạnh */
function shatter(layer: Node, at: Pt, k: number, dir?: number) {
    glow(layer,
        at,
        [0xffffff],
        30,
        110 * k,
        0.16)
    glow(layer,
        at,
        [ELECTRIC],
        50,
        180 * k,
        0.35,
        0.6)
    const cone = dir === undefined ? {
    } : {
        angle: [dir - 0.9,
            dir + 0.9] as [number, number]
    }
    sparks(layer,
        at,
        Math.round(12 * k),
        DARK,
        [180,
            480],
        {
            additive: false, size: [22,
                8], life: [0.3,
                0.55], ...cone
        })
    sparks(layer,
        at,
        Math.round(10 * k),
        FROST,
        [240,
            600],
        cone)
    motes(layer,
        at,
        Math.round(16 * k),
        FROST,
        [40,
            200],
        {
            gravity: -120, life: [0.6,
                1.0], size: [6,
                1]
        })
    smoke(layer,
        at,
        Math.round(4 * k),
        MIST,
        30,
        80,
        {
            alpha: 0.35, gravity: -10
        })
}

/** Băng bò dọc mặt đất từ a tới b: đầu băng là mảnh sắc và bụi; sau lưng mọc mũi băng nhỏ */
function iceCrawl(layer: Node, a: Pt, b: Pt, secs: number, h: number) {
    let placed = 0
    const len = Math.max(dist(a,
        b),
    1)
    const d = angleOf(a,
        b)
    return fly(layer,
        secs,
        (u) => mix(a,
            b,
            u),
        (p, _dd, t) => {
            while (placed * 26 <= t * len) {
                const q = polar(mix(a,
                    b,
                    (placed * 26) / len),
                d + UP,
                rand(-14,
                    14))
                iceSpike(layer,
                    q,
                    h * rand(0.6,
                        1),
                    0.55,
                    rand(-0.3,
                        0.3))
                placed++
            }
            emit(layer,
                p,
                {
                    color: FROST, kind: "glow", life: [0.12,
                        0.2], size: [36,
                        10], alpha: 0.9
                })
            emit(layer,
                p,
                {
                    color: MIST, kind: "glow", additive: false, life: [0.4,
                        0.6], size: [30,
                        60], alpha: 0.25
                })
        })
}

/** Đánh thường: vuốt băng hai nhát, bụi băng */
registerSkillVfx("basic_lissandra",
    async (ctx) => {
        const to = main(ctx)
        const d = aim(ctx)
        // mảnh băng nhỏ bay tới
        await fly(ctx.layer,
            0.2,
            (u) => mix(ctx.from,
                to,
                u),
            (p, dd) => {
                emit(ctx.layer,
                    p,
                    {
                        color: DARK, kind: "blade", additive: false, life: [0.05,
                            0.07], size: [26,
                            26], alpha: 1, rotation: dd, stretch: 2
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: [ELECTRIC, CYAN], kind: "blade", life: [0.12,
                            0.2], size: [22,
                            8], alpha: 0.8, rotation: dd, stretch: 2.4
                    })
            })
        void slashLine(ctx.layer,
            to,
            d + 2.3,
            90,
            12,
            [ELECTRIC, CYAN],
            0.07,
            0.28,
            0xffffff)
        shatter(ctx.layer,
            to,
            0.6,
            d)
        await settle(ctx.layer,
            0.4)
    })

/**
 * Nội tại Băng Sâu: chiêu trúng có cơ hội Hoá Băng một lá trên tay đối thủ. Băng bò từ chỗ trúng lên phía tay đối thủ (mép trên
 * màn hình), tới nơi kết thành khối băng ôm lá rồi loé.
 */
registerSkillVfx("lissandra_p",
    async (ctx) => {
        const hit = main(ctx)
        const hand = {
            x: hit.x * 0.6, y: Math.max(hit.y + 160,
                440)
        }
        await fly(ctx.layer,
            0.4,
            (u) => mix(hit,
                hand,
                u),
            (p, dd) => {
                emit(ctx.layer,
                    p,
                    {
                        color: [ELECTRIC, CYAN], kind: "blade", life: [0.3,
                            0.5], size: [26,
                            10], alpha: 1, rotation: dd + rand(-0.6,
                            0.6), stretch: 2
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: FROST, kind: "dot", life: [0.3,
                            0.6], size: [5,
                            1], alpha: 1, speed: [20,
                            60]
                    })
            })
        // khối băng ôm lá bài
        for (let i = 0; i < 18; i++) {
            const side = i % 4
            const u = rand(-1,
                1)
            const p = side < 2 ? add(hand,
                u * 40,
                side ? 56 : -56) : add(hand,
                side === 2 ? 40 : -40,
                u * 56)
            emit(ctx.layer,
                p,
                {
                    color: [ELECTRIC, CYAN, 0xffffff], kind: "blade", life: [0.6,
                        0.8], size: [18,
                        10], alpha: 0.9, rotation: angleOf(hand,
                        p), stretch: 1.6
                })
        }
        glow(ctx.layer,
            hand,
            [ELECTRIC],
            60,
            150,
            0.5,
            0.6)
        ring(ctx.layer,
            hand,
            [CYAN],
            40,
            170,
            0.4)
        await settle(ctx.layer,
            0.7)
    })

/**
 * Q Mảnh Băng: ngọn giáo băng đen viền lam lao thẳng tới mục tiêu, trúng thì vỡ thành chùm mảnh rộng hơn bắn tiếp ra sau (đúng
 * Ice Shard), bụi băng rơi; lá trên tay đối thủ Hoá Băng (băng nhỏ bò lên).
 */
registerSkillVfx("lissandra_q",
    async (ctx) => {
        const k = pow(ctx)
        const to = main(ctx)
        const d = aim(ctx)
        glow(ctx.layer,
            ctx.from,
            [ELECTRIC],
            30,
            90,
            0.2)
        await fly(ctx.layer,
            0.26,
            (u) => mix(ctx.from,
                to,
                u),
            (p, dd) => {
                emit(ctx.layer,
                    p,
                    {
                        color: DARK, kind: "blade", additive: false, life: [0.05,
                            0.07], size: [48,
                            48], alpha: 1, rotation: dd, stretch: 2.2
                    })
                emit(ctx.layer,
                    polar(p,
                        dd,
                        12),
                    {
                        color: [CYAN, 0xffffff], kind: "blade", life: [0.05,
                            0.07], size: [30,
                            20], alpha: 1, rotation: dd, stretch: 2
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: [ELECTRIC, ROYAL], kind: "blade", life: [0.2,
                            0.3], size: [40,
                            12], alpha: 0.7, rotation: dd, stretch: 2.6
                    })
                motes(ctx.layer,
                    p,
                    2,
                    FROST,
                    [20,
                        80],
                    {
                        life: [0.3,
                            0.5]
                    })
            },
            (t) => t * t)
        shatter(ctx.layer,
            to,
            1.1 * k,
            d)
        // chùm mảnh vỡ bắn tiếp ra sau mục tiêu
        for (let i = 0; i < 14; i++) {
            const a = d + rand(-0.45,
                0.45)
            emit(ctx.layer,
                to,
                {
                    color: [ELECTRIC, CYAN, 0xffffff], kind: "blade", life: [0.25,
                        0.4], size: [30,
                        10], alpha: 1, speed: [500,
                        800], angle: [a,
                        a], align: true, drag: 1.5, stretch: 2.8
                })
        }
        spikes(ctx.layer,
            add(to,
                0,
                -24),
            5,
            40,
            14,
            DARK,
            50,
            0.6)
        await settle(ctx.layer,
            0.55)
    })

/**
 * E Vòng Băng: một địch. Vòng sóng lạnh thu vào quanh mục tiêu rồi gai băng đen bật lên thành vòng quanh nó; nếu lá chiêu của
 * nó đang băng thì bị Choáng (vòng băng đóng lại, sao lam trên đầu).
 */
registerSkillVfx("lissandra_e",
    async (ctx) => {
        const k = pow(ctx)
        const to = main(ctx)
        // tia băng từ tay
        await fly(ctx.layer,
            0.2,
            (u) => mix(ctx.from,
                to,
                u),
            (p) => emit(ctx.layer,
                p,
                {
                    color: FROST, kind: "glow", life: [0.15,
                        0.25], size: [24,
                        6], alpha: 0.9
                }))
        ring(ctx.layer,
            to,
            [CYAN, ELECTRIC],
            260,
            110,
            0.3,
            0.9)
        await wait(ctx.layer,
            0.24)
        // vòng gai băng bật lên
        const base = add(to,
            0,
            -20)
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * TAU
            iceSpike(ctx.layer,
                {
                    x: base.x + Math.cos(a) * 70, y: base.y + Math.sin(a) * 26
                },
                rand(50,
                    80) * k,
                0.8,
                -Math.cos(a) * 0.35)
        }
        glow(ctx.layer,
            to,
            [ELECTRIC],
            60,
            220,
            0.4,
            0.6)
        sparks(ctx.layer,
            to,
            12,
            FROST,
            [200,
                480],
            {
                angle: [0.2,
                    Math.PI - 0.2]
            })
        smoke(ctx.layer,
            base,
            6,
            MIST,
            50,
            80,
            {
                alpha: 0.35, gravity: -10
            })
        void stunStars(ctx.layer,
            to,
            [CYAN, 0xffffff],
            0.75)
        await wait(ctx.layer,
            0.55)
        shatter(ctx.layer,
            to,
            0.7)
        await settle(ctx.layer,
            0.4)
    })

/**
 * R Hầm Mộ Băng (Quick, khi bị nhắm): băng đen tràn từ chân Lissandra tới cả hàng địch, mỗi tướng địch bị gai băng nuốt rồi vỡ
 * (sát thương theo số lá băng); sau đó Lissandra tự Đóng Băng: khối băng đen bọc kín thân, sương lạnh toả.
 */
registerSkillVfx("lissandra_r",
    async (ctx) => {
        const k = pow(ctx)
        const foes = row(ctx,
            5)
        const at = ctx.from
        // băng bùng dưới chân
        ring(ctx.layer,
            at,
            [ELECTRIC],
            40,
            260,
            0.4)
        spikes(ctx.layer,
            add(at,
                0,
                -20),
            8,
            80,
            26,
            DARK,
            60,
            0.6)
        smoke(ctx.layer,
            at,
            8,
            MIST,
            60,
            100,
            {
                alpha: 0.35, gravity: -10
            })
        // băng bò tới từng tướng địch
        await Promise.all(foes.map((p) => iceCrawl(ctx.layer,
            at,
            p,
            0.4,
            40)))
        await Promise.all(foes.map(async (p, i) => {
            for (let j = 0; j < 7; j++) iceSpike(ctx.layer,
                add(p,
                    rand(-50,
                        50),
                    rand(-30,
                        10)),
                rand(60,
                    100),
                0.6,
                rand(-0.4,
                    0.4))
            glow(ctx.layer,
                p,
                [ELECTRIC],
                60,
                200,
                0.4,
                0.6)
            await wait(ctx.layer,
                0.35)
            shatter(ctx.layer,
                p,
                i === 0 ? 1.2 * k * 0.6 : 0.8)
        }))
        // tự đóng băng: khối băng đen bọc thân
        for (let i = 0; i < 9; i++) {
            const dx = (i - 4) * 14
            iceSpike(ctx.layer,
                add(at,
                    dx,
                    -60),
                130 - Math.abs(i - 4) * 16,
                0.9,
                -dx * 0.004)
        }
        glow(ctx.layer,
            at,
            [CYAN],
            90,
            140,
            0.9,
            0.5)
        await pulse(ctx.layer,
            0.6,
            40,
            () => emit(ctx.layer,
                add(at,
                    rand(-60,
                        60),
                    rand(-60,
                        70)),
                {
                    color: FROST, kind: "dot", life: [0.3,
                        0.6], size: [6,
                        1], alpha: 1
                }))
        await settle(ctx.layer,
            0.4)
    })
