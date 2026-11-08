// VFX Leona trên Cocos, theo thiết kế bản web (fx_leona.ts): chất liệu ÁNH MẶT TRỜI, tia nắng dài, mảnh giáp vàng sắc, than hồng,
// quầng nhật hoa. Q khiên nắng đập thẳng tướng đối diện, E lưỡi nắng + nhật thực che đĩa, R cột nắng từ trời xuống cả hàng địch.
// Ô: basic_leona, leona_p/q/e/r.
import {
    Node
} from "cc"
import {
    mix, rand, wait, type Pt
} from "./particles"
import {
    emit, meleeSlash
} from "./g2_helpers"
import {
    registerSkillVfx
} from "./registry"
import {
    TAU, UP, add, aim, column, cracks, fly, gather, glow, main, motes, polar, pow, pulse, ring, row, settle, slashArc, sparks, stunStars
} from "./g2_helpers"

const SUN = 0xffd040
const PALE = 0xfff6c0
const AMBER = 0xffa020
const EMBER = 0xff6a20
const PLATE = [0xffd040, 0xffe890, 0xc89020]
const RAYS = [0xffffff, PALE, SUN]

/** Tia nắng dài toả từ tâm */
function rays(layer: Node, at: Pt, n: number, len: number, life = 0.32) {
    for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rand(-0.1,
            0.1)
        emit(layer,
            polar(at,
                a,
                len * 0.35),
            {
                color: RAYS, kind: "blade", life: [life,
                    life * 1.2], size: [len * 0.5,
                    len * 0.2], alpha: 0.95, rotation: a, stretch: 2.6, speed: [len * 1.6,
                    len * 2.2], angle: [a,
                    a], drag: 5
            })
    }
}

/** Bùng nắng tại chỗ: lõi trắng, quầng vàng, tia, mảnh giáp, than hồng */
function sunBurst(layer: Node, at: Pt, k: number) {
    glow(layer,
        at,
        [0xffffff],
        30,
        150 * k,
        0.2)
    glow(layer,
        at,
        [SUN],
        60,
        240 * k,
        0.45,
        0.75)
    ring(layer,
        at,
        [PALE],
        30,
        240 * k,
        0.36)
    rays(layer,
        at,
        Math.round(10 * k),
        90 * k)
    sparks(layer,
        at,
        Math.round(10 * k),
        PLATE,
        [200,
            460],
        {
            additive: false, gravity: -700, align: false, spin: [-8,
                8], size: [20,
                12], stretch: 1.4, life: [0.4,
                0.7]
        })
    motes(layer,
        at,
        Math.round(16 * k),
        [EMBER, AMBER, PALE],
        [60,
            240],
        {
            gravity: 80, life: [0.5,
                0.9]
        })
}

/** Giáp nắng khoá lên thân: mảnh vàng từ ngoài bay vào, quầng vàng phủ rồi lịm */
async function armorLock(layer: Node, at: Pt, secs: number, n: number) {
    for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU
        const s = polar(at,
            a,
            130)
        const life = secs
        emit(layer,
            s,
            {
                color: PLATE, kind: "blade", additive: false, life: [life,
                    life], size: [26,
                    16], alpha: 1, speed: [110 / life,
                    110 / life], angle: [a + Math.PI,
                    a + Math.PI], rotation: a + UP, stretch: 1.3
            })
    }
    await wait(layer,
        secs * 0.95)
    glow(layer,
        at,
        [SUN],
        160,
        110,
        0.6,
        0.6)
    ring(layer,
        at,
        [PALE, SUN],
        60,
        170,
        0.35)
    void pulse(layer,
        0.5,
        50,
        () => emit(layer,
            add(at,
                rand(-55,
                    55),
                rand(-60,
                    30)),
            {
                color: [PALE, SUN], kind: "dot", life: [0.4,
                    0.7], size: [7,
                    2], alpha: 1, speed: [30,
                    80], angle: [UP - 0.2,
                    UP + 0.2]
            }))
}

/** Đánh thường: kiếm nắng chém một vết trăng khuyết mảnh trên mục tiêu */
registerSkillVfx("basic_leona",
    (ctx) => meleeSlash(ctx.layer,
            main(ctx),
            aim(ctx),
            [SUN, PALE, AMBER],
            1,
            PALE))

/** Nội tại Giáp Mặt Trời: mảnh giáp nắng khoá lên thân Leona rồi toả sáng */
registerSkillVfx("leona_p",
    async (ctx) => {
        glow(ctx.layer,
            ctx.from,
            [SUN],
            40,
            120,
            0.4,
            0.5)
        await armorLock(ctx.layer,
            ctx.from,
            0.3,
            10)
        rays(ctx.layer,
            ctx.from,
            8,
            70,
            0.4)
        await settle(ctx.layer,
            0.6)
    })

/**
 * Q Khiên Bình Minh: khiên bừng sáng trên tay, rồi đĩa khiên nắng (8 cánh vàng như icon) lao thẳng vào tướng đối diện, đập
 * choang: nắng và mảnh giáp toé, ba đốm sáng Choáng chao trên đầu.
 */
registerSkillVfx("leona_q",
    async (ctx) => {
        const k = pow(ctx)
        const to = main(ctx)
        const d = aim(ctx)
        // khiên bừng sáng
        glow(ctx.layer,
            ctx.from,
            [PALE],
            30,
            130,
            0.3)
        await gather(ctx.layer,
            ctx.from,
            90,
            0.22,
            140,
            {
                color: [SUN, PALE]
            })
        // đĩa khiên lao tới: lõi trắng, vành vàng, cánh nắng xoay
        await fly(ctx.layer,
            0.24,
            (u) => mix(ctx.from,
                to,
                u),
            (p, _dd, t) => {
                glow(ctx.layer,
                    p,
                    [0xffffff],
                    44,
                    30,
                    0.07)
                ring(ctx.layer,
                    p,
                    [SUN],
                    64,
                    60,
                    0.08,
                    1)
                for (let i = 0; i < 8; i++) {
                    const a = (i / 8) * TAU + t * 3
                    emit(ctx.layer,
                        polar(p,
                            a,
                            30),
                        {
                            color: [SUN, PALE], kind: "blade", life: [0.07,
                                0.09], size: [20,
                                14], alpha: 1, rotation: a, stretch: 1.4
                        })
                }
                emit(ctx.layer,
                    p,
                    {
                        color: [AMBER, SUN], kind: "glow", life: [0.2,
                            0.3], size: [40,
                            8], alpha: 0.6, spread: 8
                    })
            },
            (t) => t * t)
        sunBurst(ctx.layer,
            to,
            1.1 * k)
        sparks(ctx.layer,
            to,
            14,
            [0xffffff, PALE],
            [360,
                800],
            {
                angle: [d - 0.7,
                    d + 0.7]
            })
        await stunStars(ctx.layer,
            to,
            [PALE, SUN],
            0.8)
    })

/**
 * E Nhật Thực (Quick, phản đòn kẻ vừa đánh hoặc dùng chiêu): hai dải nắng xoắn vào thân Leona, lưỡi nắng phóng rất nhanh vào
 * mục tiêu; tại đó đĩa tối che mặt trời, nhật hoa bùng quanh mép rồi nổ (sát thương phép + Choáng). Sau cùng Leona nhận Giáp:
 * mảnh giáp nắng khoá lên thân.
 */
registerSkillVfx("leona_e",
    async (ctx) => {
        const k = pow(ctx)
        const to = main(ctx)
        const d = aim(ctx)
        // dấu Quick: hai dải nắng xoắn ốc hút vào
        await pulse(ctx.layer,
            0.22,
            160,
            (t) => {
                for (const off of [0,
                    Math.PI]) {
                    const a = t * TAU * 1.5 + off
                    emit(ctx.layer,
                        polar(ctx.from,
                            a,
                            110 * (1 - t) + 20),
                        {
                            color: [SUN, PALE], kind: "glow", life: [0.12,
                                0.2], size: [20,
                                6], alpha: 1
                        })
                }
            })
        // lưỡi nắng phóng thẳng
        await fly(ctx.layer,
            0.14,
            (u) => mix(ctx.from,
                to,
                u),
            (p) => {
                emit(ctx.layer,
                    p,
                    {
                        color: [0xffffff, PALE], kind: "blade", life: [0.12,
                            0.2], size: [70,
                            30], alpha: 1, rotation: d, stretch: 3
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: [SUN], kind: "glow", life: [0.18,
                            0.28], size: [36,
                            10], alpha: 0.7
                    })
            })
        // nhật thực: đĩa tối, nhật hoa rối quanh mép
        glow(ctx.layer,
            to,
            [0xffe890],
            160,
            200,
            0.5,
            0.8)
        await pulse(ctx.layer,
            0.3,
            200,
            () => {
                const a = rand(0,
                    TAU)
                emit(ctx.layer,
                    polar(to,
                        a,
                        44),
                    {
                        color: [0xffffff, SUN, AMBER], kind: "blade", life: [0.14,
                            0.26], size: [rand(16,
                                34),
                            8], alpha: 1, rotation: a, stretch: 2.2, speed: [40,
                            160], angle: [a,
                            a]
                    })
                emit(ctx.layer,
                    to,
                    {
                        color: [0x241a10], kind: "dot", additive: false, life: [0.06,
                            0.08], size: [92,
                            92], alpha: 1
                    })
            })
        sunBurst(ctx.layer,
            to,
            1.2 * k)
        void stunStars(ctx.layer,
            to,
            [PALE, SUN],
            0.7)
        await wait(ctx.layer,
            0.12)
        // Leona nhận Giáp
        await armorLock(ctx.layer,
            ctx.from,
            0.26,
            8)
        await settle(ctx.layer,
            0.4)
    })

/**
 * R Thái Dương Giáng Thế: mọi tướng địch. Leona giơ kiếm, nắng vọt thẳng lên trời; rồi cột nắng xiên từ trời đổ sập xuống
 * từng tướng địch, liền nhau thành màn nắng phủ cả hàng; mỗi cột nổ, mặt bàn nứt vệt vàng, tất cả bị Choáng.
 */
registerSkillVfx("leona_r",
    async (ctx) => {
        const k = pow(ctx)
        const foes = row(ctx,
            5)
        // nắng từ thân vọt lên trời
        glow(ctx.layer,
            ctx.from,
            [PALE],
            40,
            160,
            0.4)
        await pulse(ctx.layer,
            0.3,
            120,
            () => emit(ctx.layer,
                add(ctx.from,
                    rand(-14,
                        14),
                    20),
                {
                    color: RAYS, kind: "blade", life: [0.2,
                        0.3], size: [40,
                        20], alpha: 1, speed: [900,
                        1300], angle: [UP - 0.03,
                        UP + 0.03], align: true, stretch: 3
                }))
        // cột nắng rơi xiên lần lượt xuống từng tướng
        await Promise.all(foes.map(async (p, i) => {
            await wait(ctx.layer,
                i * 0.07)
            ring(ctx.layer,
                p,
                [SUN],
                40,
                200,
                0.3,
                0.6)
            await column(ctx.layer,
                p,
                [PALE, SUN, 0xffffff],
                480,
                46,
                0.3,
                -0.28)
            sunBurst(ctx.layer,
                p,
                i === 0 ? 1.3 * k : 0.9 * k)
            cracks(ctx.layer,
                p,
                7,
                90,
                [SUN, AMBER, PALE],
                0.7,
                0.85)
            void stunStars(ctx.layer,
                p,
                [PALE, SUN],
                0.75)
        }))
        // màn nắng phủ ngang cả hàng
        const a = foes.reduce((m, p) => (p.x < m.x ? p : m),
            foes[0])
        const b = foes.reduce((m, p) => (p.x > m.x ? p : m),
            foes[0])
        for (let i = 0; i <= 12; i++) glow(ctx.layer,
            mix(a,
                b,
                i / 12),
            [SUN, PALE],
            60,
            90,
            0.45,
            0.25)
        await settle(ctx.layer,
            0.8)
    })
