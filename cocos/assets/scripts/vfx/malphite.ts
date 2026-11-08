// VFX Malphite trên Cocos, theo thiết kế bản web (fx_malphite.ts): ĐÁ thật, tảng đá phiến xám nứt mạch vàng hổ phách, cát bụi nâu.
// Không khống chế nên không có dấu Choáng: Q đá văng + Giáp cả đội, E mạch đá nối đồng minh, R lao vào hàng địch giáp nát.
// Ô: basic_malphite, malphite_p/q/e/r.
import {
    Node
} from "cc"
import {
    angleOf, dist, mix, rand, wait, type Pt
} from "./particles"
import {
    emit, meleeSmash
} from "./g2_helpers"
import {
    TAU, UP, add, aim, cracks, curve, debris, fly, glow, laneGap, main, motes, polar, pow, pulse, ring, row, settle, smoke, sparks
} from "./g2_helpers"
import {
    registerSkillVfx
} from "./registry"

const ROCK = [0x8a7a68, 0x9a8a78, 0x6a5c4e]
const SLATE = [0x5c6470, 0x7a8290, 0x4a505a]
const AMBER = 0xffc060
const GOLD = 0xffe08a
const DUST = [0xa08870, 0xc0a888, 0x8a7058]

/** Tảng đá bay: khối đặc gồ ghề (nhiều mảnh chồng), viền mạch vàng loé */
function boulder(layer: Node, p: Pt, size: number, spin: number, hot = 0.4) {
    for (let i = 0; i < 3; i++) emit(layer,
        add(p,
            rand(-size * 0.2,
                size * 0.2),
            rand(-size * 0.2,
                size * 0.2)),
        {
            color: i ? ROCK : SLATE, kind: "blade", additive: false, life: [0.06,
                0.08], size: [size,
                size], alpha: 1, rotation: spin + i * 1.1, stretch: 1.1
        })
    if (Math.random() < hot) emit(layer,
        add(p,
            rand(-size * 0.3,
                size * 0.3),
            rand(-size * 0.3,
                size * 0.3)),
        {
            color: [AMBER, GOLD], kind: "blade", life: [0.08,
                0.12], size: [size * 0.6,
                size * 0.4], alpha: 1, rotation: rand(0,
                TAU), stretch: 1.6
        })
}

/** Va chạm đá: bụi nâu tung, mảnh đá văng, tia hổ phách */
function rockHit(layer: Node, at: Pt, k: number) {
    glow(layer,
        at,
        [AMBER],
        40,
        170 * k,
        0.3,
        0.8)
    ring(layer,
        at,
        DUST,
        30,
        230 * k,
        0.42,
        0.7,
        false)
    sparks(layer,
        at,
        Math.round(12 * k),
        [AMBER, GOLD, 0xffffff],
        [220,
            560])
    debris(layer,
        at,
        Math.round(14 * k),
        ROCK,
        20)
    debris(layer,
        at,
        Math.round(6 * k),
        SLATE,
        14)
    smoke(layer,
        at,
        Math.round(6 * k),
        DUST,
        30 * k,
        80 * k)
}

/** Vỏ đá phủ thân: mảnh đá rơi xuống ôm quanh, bụi vàng bốc lên */
function stoneShell(layer: Node, at: Pt, n: number, delay = 0) {
    for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rand(-0.2,
            0.2)
        const p = polar(at,
            a,
            rand(52,
                66))
        emit(layer,
            add(p,
                0,
                rand(60,
                    120)),
            {
                color: ROCK, kind: "blade", additive: false, life: [0.6 + delay,
                    0.8 + delay], size: [22,
                    18], alpha: 1, speed: [260,
                    320], angle: [-UP,
                    -UP], drag: 5.5, rotation: a + UP, stretch: 1.2
            })
    }
    ring(layer,
        at,
        [AMBER],
        70,
        150,
        0.4,
        0.6)
    motes(layer,
        at,
        10,
        [GOLD, AMBER],
        [20,
            80],
        {
            gravity: 90, spread: 50, life: [0.5,
                0.8]
        })
}

/** Đánh thường: nắm đấm đá nện xuống mục tiêu, vòng sóng nhỏ và bụi nâu */
registerSkillVfx("basic_malphite",
    (ctx) => meleeSmash(ctx.layer,
            main(ctx),
            [AMBER, 0x9a8a78],
            DUST))

/** Nội tại Thân Đá: vỏ đá rơi xuống ôm lấy Malphite và các tướng mình kề bên (Giáp, Máu) */
registerSkillVfx("malphite_p",
    async (ctx) => {
        const g = laneGap(ctx)
        stoneShell(ctx.layer,
            ctx.from,
            12)
        await wait(ctx.layer,
            0.15)
        for (const dx of [-g,
            g]) stoneShell(ctx.layer,
            add(ctx.from,
                dx,
                0),
            8,
            0.1)
        await settle(ctx.layer,
            0.9)
    })

/**
 * Q Mảnh Vỡ Địa Chấn: tảng đá phiến nứt mạch vàng bắn khỏi đất, xoay tít bay vồng tới mục tiêu (sát thương phép), vỡ tung;
 * phần tốc độ cuỗm được hoá thành Giáp: bụi vàng chảy về Malphite rồi vỏ đá phủ lên cả hàng mình.
 */
registerSkillVfx("malphite_q",
    async (ctx) => {
        const k = pow(ctx)
        const to = main(ctx)
        // đất nứt, tảng đá trồi lên
        cracks(ctx.layer,
            ctx.from,
            6,
            60,
            [AMBER, GOLD],
            0.5)
        debris(ctx.layer,
            ctx.from,
            6,
            ROCK,
            14,
            {
                speed: [120,
                    240]
            })
        await wait(ctx.layer,
            0.12)
        let spin = 0
        await fly(ctx.layer,
            0.38,
            (u) => curve(ctx.from,
                to,
                -60,
                u),
            (p) => {
                spin += 0.4
                boulder(ctx.layer,
                    p,
                    40 * k,
                    spin,
                    0.7)
                emit(ctx.layer,
                    p,
                    {
                        color: DUST, kind: "glow", additive: false, life: [0.3,
                            0.5], size: [26,
                            44], alpha: 0.4, spread: 10
                    })
                if (Math.random() < 0.5) motes(ctx.layer,
                    p,
                    1,
                    [AMBER, GOLD],
                    [20,
                        80])
            })
        rockHit(ctx.layer,
            to,
            1.1 * k)
        cracks(ctx.layer,
            to,
            6,
            80,
            [AMBER, GOLD],
            0.6)
        // bụi vàng chảy về Malphite rồi Giáp phủ cả hàng
        await fly(ctx.layer,
            0.3,
            (u) => curve(to,
                ctx.from,
                50,
                u),
            (p) => motes(ctx.layer,
                p,
                3,
                [GOLD, AMBER],
                [10,
                    60],
                {
                    life: [0.2,
                        0.4]
                }))
        const g = laneGap(ctx)
        stoneShell(ctx.layer,
            ctx.from,
            12)
        for (const dx of [-2 * g,
            -g,
            g,
            2 * g]) stoneShell(ctx.layer,
            add(ctx.from,
                dx,
                0),
            6)
        await settle(ctx.layer,
            0.8)
    })

/**
 * E Mạch Đá (Quick): nối Liên Kết Đá giữa Malphite và một tướng mình khác. Mạch đá gồ ghề trồi lên dọc đường cong từ Malphite
 * tới đồng minh, mạch vàng chảy trong khe như dung nham nguội; chạm nơi thì cả hai được viền đá, nhịp vàng chạy qua mạch.
 */
registerSkillVfx("malphite_e",
    async (ctx) => {
        const ally = main(ctx)
        const a = ctx.from
        const bend = dist(a,
            ally) * 0.25
        const total = Math.max(dist(a,
            ally),
        1)
        const gap = 16
        let placed = 0
        // mạch đá mọc dần
        await fly(ctx.layer,
            0.4,
            (u) => curve(a,
                ally,
                -bend,
                u),
            (p, dd, t) => {
                while (placed * gap <= t * total * 1.1) {
                    const q = curve(a,
                        ally,
                        -bend,
                        Math.min(1,
                            (placed * gap) / (total * 1.1)))
                    emit(ctx.layer,
                        add(q,
                            rand(-5,
                                5),
                            rand(-5,
                                5)),
                        {
                            color: ROCK, kind: "blade", additive: false, life: [1.0,
                                1.2], size: [20,
                                16], alpha: 1, rotation: dd + rand(-0.6,
                                0.6), stretch: 1.3
                        })
                    emit(ctx.layer,
                        q,
                        {
                            color: [AMBER, GOLD], kind: "blade", life: [0.9,
                                1.0], size: [14,
                                10], alpha: 0.85, rotation: dd, stretch: 1.8
                        })
                    placed++
                }
                emit(ctx.layer,
                    p,
                    {
                        color: [GOLD], kind: "glow", life: [0.1,
                            0.16], size: [40,
                            12], alpha: 0.9
                    })
                if (Math.random() < 0.4) debris(ctx.layer,
                    p,
                    1,
                    ROCK,
                    10,
                    {
                        speed: [60,
                            160]
                    })
            },
            (t) => t)
        // chạm nơi: hai đầu được viền đá, nhịp vàng chạy qua mạch
        stoneShell(ctx.layer,
            ally,
            10)
        stoneShell(ctx.layer,
            a,
            10)
        await fly(ctx.layer,
            0.35,
            (u) => curve(a,
                ally,
                -bend,
                u),
            (p) => glow(ctx.layer,
                p,
                [GOLD, 0xffffff],
                46,
                20,
                0.18,
                0.9))
        await fly(ctx.layer,
            0.35,
            (u) => curve(ally,
                a,
                bend,
                u),
            (p) => glow(ctx.layer,
                p,
                [AMBER],
                40,
                16,
                0.18,
                0.8))
        await settle(ctx.layer,
            0.4)
    })

/**
 * R Không Thể Cản Phá: mọi tướng địch. Malphite hoá khối đá lao thẳng vào hàng địch để lại vệt bụi và đá vụn, nện xuống đất:
 * sóng chấn động phủ cả hàng, mọi tướng địch bị hất đá và vỡ giáp (mảnh giáp xám bong ra, mạch vàng nứt).
 */
registerSkillVfx("malphite_r",
    async (ctx) => {
        const k = pow(ctx)
        const to = main(ctx)
        const foes = row(ctx,
            5)
        const d = angleOf(ctx.from,
            to)
        // gồng: đá tụ quanh thân
        for (let i = 0; i < 14; i++) {
            const a = rand(0,
                TAU)
            emit(ctx.layer,
                polar(ctx.from,
                    a,
                    140),
                {
                    color: ROCK, kind: "blade", additive: false, life: [0.22,
                        0.24], size: [20,
                        14], alpha: 1, speed: [520,
                        580], angle: [a + Math.PI,
                        a + Math.PI], rotation: a, stretch: 1.2
                })
        }
        glow(ctx.layer,
            ctx.from,
            [AMBER],
            60,
            180,
            0.3,
            0.7)
        await wait(ctx.layer,
            0.24)
        // lao: khối đá khổng lồ, vệt bụi
        let spin = 0
        await fly(ctx.layer,
            0.3,
            (u) => mix(ctx.from,
                to,
                u),
            (p) => {
                spin += 0.15
                boulder(ctx.layer,
                    p,
                    50 * k,
                    spin,
                    0.9)
                glow(ctx.layer,
                    p,
                    [AMBER],
                    90,
                    40,
                    0.12,
                    0.6)
                smoke(ctx.layer,
                    p,
                    1,
                    DUST,
                    20,
                    70)
                sparks(ctx.layer,
                    p,
                    2,
                    [GOLD, AMBER],
                    [80,
                        200],
                    {
                        angle: [d + Math.PI - 0.5,
                            d + Math.PI + 0.5]
                    })
            },
            (t) => t * t)
        // nện: sóng chấn động cả hàng
        glow(ctx.layer,
            to,
            [0xffffff],
            40,
            140,
            0.18)
        ring(ctx.layer,
            to,
            [AMBER, GOLD],
            40,
            520 * k * 0.6,
            0.55,
            0.85)
        ring(ctx.layer,
            to,
            DUST,
            40,
            640 * k * 0.6,
            0.7,
            0.6,
            false)
        await Promise.all(foes.map(async (p, i) => {
            await wait(ctx.layer,
                Math.abs(p.x - to.x) / 1800 + (i === 0 ? 0 : 0.03))
            rockHit(ctx.layer,
                p,
                i === 0 ? 1.4 * k * 0.6 : 0.8)
            cracks(ctx.layer,
                p,
                7,
                90,
                [AMBER, GOLD],
                0.8)
            // giáp vỡ: mảnh giáp xám bong khỏi thân rồi rơi
            sparks(ctx.layer,
                add(p,
                    0,
                    30),
                8,
                [0xb0b8c4, 0x7a8290],
                [120,
                    280],
                {
                    additive: false, gravity: -800, align: false, spin: [-10,
                        10], size: [16,
                        12], stretch: 1.2, life: [0.5,
                        0.8], angle: [0.2,
                        Math.PI - 0.2]
                })
            await pulse(ctx.layer,
                0.3,
                40,
                () => emit(ctx.layer,
                    add(p,
                        rand(-40,
                            40),
                        rand(-50,
                            40)),
                    {
                        color: [0xff6a40, AMBER], kind: "blade", life: [0.2,
                            0.3], size: [16,
                            8], alpha: 0.9, rotation: rand(0,
                            TAU), stretch: 1.8
                    }))
        }))
        await settle(ctx.layer,
            0.7)
    })
