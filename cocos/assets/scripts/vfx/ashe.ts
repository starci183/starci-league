// VFX Ashe trên Cocos, theo thiết kế bản web (fx_ashe.ts): PHA LÊ BĂNG, mũi tên pha lê nhiều mặt, mảnh băng sắc, tuyết mịn, hơi
// lạnh. Bảng màu xanh đêm, xanh hoàng gia, xanh nước biển, lục lam, trắng băng. Q tự cường hoá cung (không bắn), E quạt tên Volley
// chụm vào một địch, R Đại Băng Tiễn khổng lồ tăng tốc. Ô: basic_ashe, ashe_p/q/e/r.
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
    TAU, UP, add, curve, fly, gather, glow, main, motes, polar, pow, pulse, ring, settle, smoke, sparks, spikes, stunStars
} from "./g2_helpers"

const NIGHT = 0x1a3a7a
const ROYAL = 0x2a6ae0
const SEA = 0x60c8ff
const CYAN = 0x90e0ff
const ICE = [0xffffff, 0xe0f8ff, CYAN]
const MIST = [0xd0ecff, 0xb0d8f0]

/** Mũi tên pha lê tại p theo hướng d: thân thuôn, đầu ba cạnh sáng, vân xanh đêm; kèm đuôi tuyết */
function arrow(layer: Node, p: Pt, d: number, len: number) {
    emit(layer,
        polar(p,
            d,
            -len * 0.35),
        {
            color: [SEA, CYAN], kind: "blade", life: [0.05,
                0.07], size: [len * 0.7,
                len * 0.5], alpha: 0.9, rotation: d, stretch: 2.4
        })
    emit(layer,
        p,
        {
            color: [0xffffff, 0xe0f8ff], kind: "blade", life: [0.05,
                0.07], size: [len * 0.4,
                len * 0.4], alpha: 1, rotation: d, stretch: 1.6
        })
    emit(layer,
        polar(p,
            d,
            -len * 0.2),
        {
            color: [NIGHT, ROYAL], kind: "blade", additive: false, life: [0.05,
                0.07], size: [len * 0.35,
                len * 0.3], alpha: 0.7, rotation: d, stretch: 1.6
        })
    emit(layer,
        polar(p,
            d,
            -len * 0.6),
        {
            color: [CYAN, 0xffffff], kind: "blade", life: [0.18,
                0.3], size: [len * 0.5,
                len * 0.2], alpha: 0.7, rotation: d, stretch: 3
        })
    if (Math.random() < 0.6) emit(layer,
        p,
        {
            color: ICE, kind: "dot", life: [0.4,
                0.7], size: [5,
                1], alpha: 1, speed: [10,
                60], gravity: -60
        })
}

/** Vụ nổ băng: quầng sáng, hơi lạnh, mảnh sắc, tuyết. k 1 là mũi tên thường */
function frostBurst(layer: Node, at: Pt, k: number, dir?: number) {
    glow(layer,
        at,
        [0xffffff],
        30,
        120 * k,
        0.18)
    glow(layer,
        at,
        [SEA],
        50,
        190 * k,
        0.4,
        0.6)
    ring(layer,
        at,
        [CYAN],
        30,
        200 * k,
        0.35)
    sparks(layer,
        at,
        Math.round(12 * k),
        ICE,
        [260,
            640],
        dir === undefined ? {
        } : {
            angle: [dir - 1,
                dir + 1]
        })
    sparks(layer,
        at,
        Math.round(6 * k),
        [NIGHT, ROYAL],
        [160,
            380],
        {
            additive: false, size: [18,
                8], life: [0.3,
                0.5]
        })
    motes(layer,
        at,
        Math.round(16 * k),
        ICE,
        [30,
            180],
        {
            gravity: -80, life: [0.6,
                1.1], size: [6,
                1]
        })
    smoke(layer,
        at,
        Math.round(3 * k),
        MIST,
        30,
        70,
        {
            alpha: 0.3, gravity: -10
        })
}

/** Băng mọc quanh mép lá tướng: các mũi băng nhỏ hướng ra ngoài (Buốt) */
function frostCling(layer: Node, at: Pt, n: number, life = 0.8) {
    for (let i = 0; i < n; i++) {
        const a = rand(0,
            TAU)
        const p = {
            x: at.x + Math.cos(a) * 52, y: at.y + Math.sin(a) * 64
        }
        emit(layer,
            p,
            {
                color: [CYAN, 0xffffff, SEA], kind: "blade", life: [life,
                    life * 1.2], size: [12,
                    20], alpha: 0.95, rotation: a, stretch: 1.5
            })
    }
}

/** Đánh thường: một mũi tên băng bay thẳng */
registerSkillVfx("basic_ashe",
    async (ctx) => {
        const to = main(ctx)
        const d = angleOf(ctx.from,
            to)
        await fly(ctx.layer,
            0.24,
            (u) => mix(ctx.from,
                to,
                u),
            (p, dd) => arrow(ctx.layer,
                p,
                dd || d,
                34))
        frostBurst(ctx.layer,
            to,
            0.55,
            d)
        frostCling(ctx.layer,
            to,
            4,
            0.5)
        await settle(ctx.layer,
            0.4)
    })

/** Nội tại Băng Tiễn: một tầng Buốt chạm là băng bung trên lá địch, mũi băng mọc quanh mép, tuyết rơi, hơi lạnh bốc */
registerSkillVfx("ashe_p",
    async (ctx) => {
        for (const to of ctx.to.length ? ctx.to : [ctx.from]) {
            glow(ctx.layer,
                to,
                [CYAN],
                40,
                150,
                0.4,
                0.6)
            frostCling(ctx.layer,
                to,
                14,
                0.9)
            // bông tuyết sáu cánh
            for (let i = 0; i < 6; i++) {
                const a = (i / 6) * TAU + UP
                emit(ctx.layer,
                    polar(add(to,
                        0,
                        10),
                    a,
                    18),
                    {
                        color: [0xffffff, CYAN], kind: "blade", life: [0.6,
                            0.7], size: [26,
                            14], alpha: 1, rotation: a, stretch: 1.6
                    })
            }
            void pulse(ctx.layer,
                0.7,
                30,
                () => emit(ctx.layer,
                    add(to,
                        rand(-60,
                            60),
                        80),
                    {
                        color: ICE, kind: "dot", life: [0.6,
                            0.9], size: [6,
                            2], alpha: 1, speed: [30,
                            70], angle: [-UP - 0.3,
                            -UP + 0.3]
                    }))
        }
        await settle(ctx.layer,
            1.0)
    })

/**
 * Q Tập Trung (tự cường hoá, không mục tiêu): gió lạnh cuộn vào Ashe rồi bùng lên, cung phủ băng (cung tròn mũi băng trước
 * ngực), băng cháy lạnh bốc lên trong thời gian Tốc Đánh tăng; không bắn tên nào.
 */
registerSkillVfx("ashe_q",
    async (ctx) => {
        const at = ctx.from
        // gió lạnh xoắn vào
        await pulse(ctx.layer,
            0.35,
            180,
            (t) => {
                const a = t * TAU * 2 + rand(0,
                    0.6)
                emit(ctx.layer,
                    polar(at,
                        a,
                        130 * (1 - t) + 30),
                    {
                        color: [CYAN, 0xffffff, SEA], kind: "blade", life: [0.14,
                            0.22], size: [22,
                            6], alpha: 0.9, rotation: a + UP, stretch: 2.4
                    })
            })
        glow(ctx.layer,
            at,
            [0xffffff],
            40,
            170,
            0.25)
        ring(ctx.layer,
            at,
            [CYAN, SEA],
            50,
            220,
            0.4)
        // cung phủ băng: cung tròn mũi băng trước ngực
        const bow = add(at,
            0,
            30)
        for (let i = 0; i <= 12; i++) {
            const a = UP + 1.1 - (i / 12) * 2.2
            emit(ctx.layer,
                polar(bow,
                    a,
                    46),
                {
                    color: [CYAN, 0xffffff], kind: "blade", life: [0.7,
                        0.8], size: [14,
                        16], alpha: 1, rotation: a, stretch: 1.4
                })
        }
        // băng cháy lạnh bốc lên
        await pulse(ctx.layer,
            0.8,
            80,
            () => emit(ctx.layer,
                add(at,
                    rand(-50,
                        50),
                    rand(-60,
                        0)),
                {
                    color: [CYAN, SEA, 0xffffff], kind: "glow", life: [0.4,
                        0.6], size: [22,
                        4], alpha: 0.85, speed: [60,
                        140], angle: [UP - 0.2,
                        UP + 0.2], gravity: 60
                }))
        await settle(ctx.layer,
            0.4)
    })

/**
 * E Tên Băng (Volley): Ashe kéo cung, quạt bảy mũi tên toả ra rồi cong chụm về một địch, các mũi cắm liên hồi; gắn Buốt (băng
 * mọc quanh mép lá).
 */
registerSkillVfx("ashe_e",
    async (ctx) => {
        const k = pow(ctx)
        const to = main(ctx)
        const d = angleOf(ctx.from,
            to)
        const L = dist(ctx.from,
            to)
        await gather(ctx.layer,
            ctx.from,
            70,
            0.18,
            120,
            {
                color: [CYAN, 0xffffff]
            })
        const N = 7
        await Promise.all(Array.from({
            length: N
        },
        async (_v, i) => {
            const side = i - (N - 1) / 2
            await wait(ctx.layer,
                Math.abs(side) * 0.02)
            await fly(ctx.layer,
                0.3,
                (u) => curve(ctx.from,
                    to,
                    side * L * 0.12,
                    u),
                (p, dd) => arrow(ctx.layer,
                    p,
                    dd,
                    28),
                (t) => t * (0.6 + 0.4 * t))
            frostBurst(ctx.layer,
                to,
                0.35,
                d)
        }))
        frostBurst(ctx.layer,
            to,
            1.0 * k,
            d)
        frostCling(ctx.layer,
            to,
            10,
            0.8)
        await settle(ctx.layer,
            0.5)
    })

/**
 * R Đại Băng Tiễn: một địch bất kỳ đường. Ashe kéo cung (băng tụ, vòng sương thu vào), mũi tên pha lê khổng lồ rời dây, bay
 * nhanh dần để lại vệt băng dày; trúng thì nổ băng lớn, gai băng trồi quanh mục tiêu (Choáng), tuyết rơi lâu.
 */
registerSkillVfx("ashe_r",
    async (ctx) => {
        const k = pow(ctx)
        const to = main(ctx)
        const d = angleOf(ctx.from,
            to)
        // kéo cung
        ring(ctx.layer,
            ctx.from,
            [CYAN],
            260,
            50,
            0.5,
            0.8)
        await gather(ctx.layer,
            polar(ctx.from,
                d,
                30),
            140,
            0.5,
            200,
            {
                color: [CYAN, 0xffffff, SEA]
            })
        glow(ctx.layer,
            ctx.from,
            [0xffffff],
            50,
            180,
            0.2)
        sparks(ctx.layer,
            ctx.from,
            12,
            ICE,
            [200,
                420],
            {
                angle: [d + Math.PI - 0.6,
                    d + Math.PI + 0.6]
            })
        // mũi tên khổng lồ tăng tốc
        await fly(ctx.layer,
            0.5,
            (u) => mix(ctx.from,
                to,
                u),
            (p, dd) => {
                arrow(ctx.layer,
                    p,
                    dd || d,
                    60 * k)
                glow(ctx.layer,
                    p,
                    [SEA],
                    90,
                    40,
                    0.14,
                    0.6)
                for (let j = 0; j < 2; j++) emit(ctx.layer,
                    polar(p,
                        d + UP,
                        rand(-24,
                            24)),
                    {
                        color: [CYAN, 0xffffff], kind: "blade", life: [0.3,
                            0.5], size: [30,
                            8], alpha: 0.8, rotation: d, stretch: 3
                    })
                smoke(ctx.layer,
                    p,
                    1,
                    MIST,
                    10,
                    40,
                    {
                        alpha: 0.25, gravity: -10
                    })
            },
            (t) => t * t)
        frostBurst(ctx.layer,
            to,
            1.0 * k,
            d)
        spikes(ctx.layer,
            add(to,
                0,
                -20),
            10,
            70,
            26,
            [CYAN, 0xffffff, SEA],
            70,
            0.8,
            true)
        spikes(ctx.layer,
            add(to,
                0,
                -24),
            6,
            50,
            20,
            [NIGHT, ROYAL],
            50,
            0.8)
        frostCling(ctx.layer,
            to,
            16,
            1.0)
        void stunStars(ctx.layer,
            to,
            [CYAN, 0xffffff],
            0.9)
        await pulse(ctx.layer,
            0.6,
            40,
            () => emit(ctx.layer,
                add(to,
                    rand(-120,
                        120),
                    120),
                {
                    color: ICE, kind: "dot", life: [0.7,
                        1.0], size: [6,
                        2], alpha: 1, speed: [40,
                        80], angle: [-UP - 0.3,
                        -UP + 0.3]
                }))
        await settle(ctx.layer,
            0.4)
    })
