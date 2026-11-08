// VFX Lux trên Cocos, theo thiết kế bản web (fx_lux.ts): ánh sáng trắng vàng, viền lăng kính hồng và xanh nhạt, vệt sáng sắc, hạt
// sáng mịn. Q Khiên Lăng Kính + mảnh sáng ném đi, E cầu Light Binding trói, R Final Spark cầu vồng. Ô: basic_lux, lux_p/q/e/r.
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
    TAU, UP, add, fly, gather, glow, main, motes, polar, pow, pulse, ring, settle, sparks, stunStars
} from "./g2_helpers"

const WHITE = 0xffffff
const GOLD = 0xfff0a0
const SUN = 0xffe880
const PINK = 0xffb0e0
const ICE = 0xa0e0ff
const PRISM = [WHITE, GOLD, PINK, ICE]
const RAINBOW = [0xffa0a0, 0xffd0a0, 0xfff0a0, 0xb0ffb0, 0xa0d8ff, 0xd0b0ff]

/** Nổ sáng: quầng trắng vàng, vệt sáng toả, mảnh lăng kính, hạt mịn */
function lightBurst(layer: Node, at: Pt, k: number) {
    glow(layer,
        at,
        [WHITE],
        30,
        150 * k,
        0.2)
    glow(layer,
        at,
        [SUN],
        50,
        220 * k,
        0.4,
        0.6)
    ring(layer,
        at,
        [GOLD],
        30,
        230 * k,
        0.35)
    sparks(layer,
        at,
        Math.round(14 * k),
        [WHITE, GOLD, SUN],
        [280,
            700],
        {
            stretch: 3
        })
    sparks(layer,
        at,
        Math.round(6 * k),
        [PINK, ICE],
        [160,
            380],
        {
            align: false, spin: [-8,
                8], stretch: 1.2, size: [16,
                8], life: [0.3,
                0.5]
        })
    motes(layer,
        at,
        Math.round(16 * k),
        PRISM,
        [40,
            200],
        {
            life: [0.5,
                0.9], size: [5,
                1]
        })
}

/** Dấu Chiếu Sáng: sao vàng sáu cánh bung trên địch */
function illumination(layer: Node, at: Pt, k = 1) {
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + UP
        emit(layer,
            polar(at,
                a,
                26 * k),
            {
                color: [GOLD, WHITE], kind: "blade", life: [0.45,
                    0.55], size: [36 * k,
                    20 * k], alpha: 1, rotation: a, stretch: 1.8
            })
    }
    glow(layer,
        at,
        [SUN],
        60 * k,
        30,
        0.5,
        0.8)
}

/** Đánh thường: cầu sáng nhỏ bay thẳng, hạt cầu vồng rơi lại */
registerSkillVfx("basic_lux",
    async (ctx) => {
        const to = main(ctx)
        await fly(ctx.layer,
            0.26,
            (u) => mix(ctx.from,
                to,
                u),
            (p) => {
                glow(ctx.layer,
                    p,
                    [WHITE],
                    22,
                    14,
                    0.06)
                emit(ctx.layer,
                    p,
                    {
                        color: [GOLD, SUN], kind: "glow", life: [0.16,
                            0.26], size: [26,
                            6], alpha: 0.8
                    })
                if (Math.random() < 0.5) emit(ctx.layer,
                    p,
                    {
                        color: RAINBOW, kind: "dot", life: [0.3,
                            0.5], size: [5,
                            1], alpha: 1, speed: [10,
                            50]
                    })
            })
        lightBurst(ctx.layer,
            to,
            0.55)
        await settle(ctx.layer,
            0.4)
    })

/**
 * Nội tại Chiếu Sáng: mana cả đội tiêu đổi thành Ánh Sáng. Sợi mana xanh rời nguồn (quanh Lux), đổi dần sang trắng rồi chui vào
 * Lux; có mục tiêu thì dấu sao Chiếu Sáng bung trên nó (phần cộng vào chiêu).
 */
registerSkillVfx("lux_p",
    async (ctx) => {
        const at = ctx.from
        await pulse(ctx.layer,
            0.45,
            80,
            (t) => {
                const a = rand(0,
                    TAU)
                const s = polar(at,
                    a,
                    140)
                emit(ctx.layer,
                    s,
                    {
                        color: t < 0.5 ? [0x60a0ff, ICE] : [ICE, WHITE], kind: "dot", life: [0.3,
                            0.32], size: [8,
                            3], alpha: 1, speed: [440,
                            460], angle: [a + Math.PI,
                            a + Math.PI]
                    })
            })
        glow(ctx.layer,
            at,
            [WHITE, GOLD],
            40,
            150,
            0.35)
        ring(ctx.layer,
            at,
            [GOLD],
            40,
            160,
            0.35)
        if (ctx.to[0]) illumination(ctx.layer,
            ctx.to[0])
        await settle(ctx.layer,
            0.55)
    })

/**
 * Q Lăng Kính (Quick): mảnh sáng hút về Lux, đọng thành lớp vỏ óng vàng, hồng, xanh (Prismatic Barrier: Lux nhận Khiên); vỏ tụ
 * xong thì một mảnh sáng sắc như đũa phép ném vụt tới địch, lăng kính vỡ trên nó (sát thương phép).
 */
registerSkillVfx("lux_q",
    async (ctx) => {
        const k = pow(ctx)
        const at = ctx.from
        const to = main(ctx)
        // vỏ lăng kính tụ
        await pulse(ctx.layer,
            0.36,
            220,
            (t) => {
                const a = rand(0,
                    TAU)
                const r = 70 + rand(-6,
                    6)
                emit(ctx.layer,
                    polar(at,
                        a,
                        r + 60 * (1 - t)),
                    {
                        color: PRISM, kind: "blade", life: [0.2,
                            0.35], size: [18,
                            10], alpha: 0.9, rotation: a + UP, stretch: 1.6
                    })
            })
        ring(ctx.layer,
            at,
            [GOLD, PINK, ICE],
            150,
            160,
            0.6,
            0.8)
        glow(ctx.layer,
            at,
            [SUN],
            140,
            160,
            0.5,
            0.35)
        void pulse(ctx.layer,
            0.5,
            70,
            () => {
                const a = rand(0,
                    TAU)
                emit(ctx.layer,
                    polar(at,
                        a,
                        66),
                    {
                        color: [PINK, ICE, GOLD], kind: "glow", life: [0.2,
                            0.3], size: [16,
                            6], alpha: 0.8
                    })
            })
        // mảnh sáng ném đi
        await fly(ctx.layer,
            0.18,
            (u) => mix(at,
                to,
                u),
            (p, dd) => {
                emit(ctx.layer,
                    p,
                    {
                        color: [WHITE, GOLD], kind: "blade", life: [0.14,
                            0.22], size: [60,
                            16], alpha: 1, rotation: dd, stretch: 3
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: RAINBOW, kind: "dot", life: [0.3,
                            0.5], size: [5,
                            1], alpha: 1, speed: [10,
                            60]
                    })
            })
        lightBurst(ctx.layer,
            to,
            0.9 * k)
        illumination(ctx.layer,
            to,
            0.8)
        await settle(ctx.layer,
            0.5)
    })

/**
 * E Khoá Ánh Sáng: cầu sáng Light Binding to, tròn, hai dải sáng xoắn quanh và đuôi vàng trắng, bay tới một địch; chạm là bùng
 * sáng vàng (sát thương phép), hai vòng dải sáng thắt quanh nó; đủ Ánh Sáng thì Choáng.
 */
registerSkillVfx("lux_e",
    async (ctx) => {
        const k = pow(ctx)
        const to = main(ctx)
        await gather(ctx.layer,
            ctx.from,
            80,
            0.2,
            140,
            {
                color: [GOLD, WHITE]
            })
        let spin = 0
        await fly(ctx.layer,
            0.38,
            (u) => mix(ctx.from,
                to,
                u),
            (p) => {
                spin += 0.45
                glow(ctx.layer,
                    p,
                    [WHITE],
                    40,
                    28,
                    0.07)
                glow(ctx.layer,
                    p,
                    [SUN],
                    70,
                    30,
                    0.14,
                    0.6)
                for (const off of [0,
                    Math.PI]) emit(ctx.layer,
                    polar(p,
                        spin + off,
                        26),
                    {
                        color: [GOLD, PINK, ICE], kind: "glow", life: [0.25,
                            0.4], size: [14,
                            4], alpha: 1
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: [GOLD, SUN], kind: "glow", life: [0.25,
                            0.4], size: [30,
                            6], alpha: 0.6, spread: 6
                    })
            })
        lightBurst(ctx.layer,
            to,
            1.0 * k)
        // dải sáng trói: hai vòng elip quay ngược nhau, thu chặt dần
        await pulse(ctx.layer,
            0.6,
            160,
            (t) => {
                for (const s of [-1,
                    1]) {
                    const a = s * t * TAU * 1.5 + rand(0,
                        0.3)
                    const r = 70 - 22 * t
                    emit(ctx.layer,
                        {
                            x: to.x + Math.cos(a) * r, y: to.y + s * 14 + Math.sin(a) * r * 0.35
                        },
                        {
                            color: [WHITE, GOLD], kind: "glow", life: [0.16,
                                0.26], size: [16,
                                6], alpha: 1
                        })
                }
            })
        void stunStars(ctx.layer,
            to,
            [GOLD, WHITE],
            0.6)
        ring(ctx.layer,
            to,
            [GOLD],
            110,
            60,
            0.3)
        await settle(ctx.layer,
            0.4)
    })

/**
 * R Cầu Vồng Tối Thượng (Final Spark): chi mana để bắn. Đũa phép tụ ánh sáng (vòng trận thu vào), rồi một tia sáng khổng lồ lõi
 * trắng, viền cầu vồng, bắn thẳng tới một địch bất kỳ đường và vượt qua; giữ tia một nhịp, cuối cùng nổ sáng tại mục tiêu.
 */
registerSkillVfx("lux_r",
    async (ctx) => {
        const k = pow(ctx)
        const to = main(ctx)
        const d = angleOf(ctx.from,
            to)
        const len = dist(ctx.from,
            to) + 260
        const end = polar(ctx.from,
            d,
            len)
        const W = 26 * k
        // tụ: vòng trận thu vào, hạt sáng hút về đầu đũa
        const tip = polar(ctx.from,
            d,
            40)
        ring(ctx.layer,
            tip,
            [GOLD],
            180,
            30,
            0.55,
            0.9)
        ring(ctx.layer,
            tip,
            [PINK, ICE],
            130,
            24,
            0.55,
            0.6)
        await gather(ctx.layer,
            tip,
            110,
            0.4,
            150,
            {
                color: [WHITE, GOLD, ...RAINBOW]
            })
        glow(ctx.layer,
            tip,
            [WHITE],
            40,
            120,
            0.18)
        // tia: mở ra nhanh, giữ, rồi tắt
        let reach = 0
        await pulse(ctx.layer,
            0.55,
            160,
            (t) => {
                reach = Math.min(1,
                    t * 5)
                const u = rand(0,
                    reach)
                const p = mix(tip,
                    end,
                    u)
                const fade = t > 0.8 ? (1 - t) / 0.2 : 1
                const side = rand(-1,
                    1)
                emit(ctx.layer,
                    polar(p,
                        d + UP,
                        side * W * 0.25),
                    {
                        color: [WHITE, GOLD], kind: "blade", life: [0.06,
                            0.1], size: [W * 1.6,
                            W * 1.4], alpha: fade, rotation: d, stretch: 3
                    })
                const rb = RAINBOW[Math.floor(rand(0,
                    RAINBOW.length))]
                emit(ctx.layer,
                    polar(p,
                        d + UP,
                        (side > 0 ? 1 : -1) * W * rand(0.5,
                            0.85)),
                    {
                        color: [rb], kind: "blade", life: [0.08,
                            0.14], size: [W,
                            W * 0.8], alpha: 0.8 * fade, rotation: d, stretch: 3
                    })
                if (Math.random() < 0.3) emit(ctx.layer,
                    p,
                    {
                        color: PRISM, kind: "dot", life: [0.3,
                            0.6], size: [6,
                            1], alpha: 1, speed: [60,
                            200], angle: [d + UP - 0.4,
                            d + UP + 0.4]
                    })
                if (Math.random() < 0.2) glow(ctx.layer,
                    to,
                    [WHITE, SUN],
                    80,
                    140,
                    0.12,
                    0.7 * fade)
            })
        lightBurst(ctx.layer,
            to,
            1.0 * k)
        illumination(ctx.layer,
            to,
            1.2)
        await wait(ctx.layer,
            0.1)
        await settle(ctx.layer,
            0.5)
    })
