// VFX Viktor trên Cocos, theo thiết kế web (packages/client/src/card/vfx/fx_viktor.ts): plasma hextech xanh điện, lõi trắng băng
// trên nền chàm sẫm, sét răng cưa, mảnh thép viền vàng; vàng nóng chỉ xuất hiện nơi tia chạm đất (icon Tia Tử Thần).
// Lá bỏ đi tan thành mảnh thép bay vào Viktor (Tiến Hoá). Q: khiên mảnh thép rồi cầu plasma; E: tia thẳng quét ngang hàng địch,
// cả vệt nổ dư chấn; R: giếng trọng lực trên mọi tướng địch, sét nối các giếng, sụp xuống, sét Bão Phép giáng xuống kẻ bị Choáng.
// Ô đăng ký: basic_viktor, viktor_p (Tiến Hoá Vinh Quang), viktor_q (Tháo Rời), viktor_e (Tia Tử Thần), viktor_r (Trường Trọng Lực).
import {
    Node
} from "cc"
import {
    ease, mix, rand, type Pt
} from "./particles"
import {
    registerSkillVfx
} from "./registry"
import {
    allFoes, bent, bolt, cardShape, flash, fly, mainOf, motes, polar, power, ring, rowsOf, shards, shift, straight, strand, UP,
    vortex, type Rows, emit, over, wait
} from "./g1_helpers"

const BLUE = 0x2f7dff
const CYAN = 0x41c8ff
const ICE = 0xc8f9ff
const WHITE = 0xffffff
const DEEP = 0x2254a0
const INDIGO = 0x161d60
const NIGHT = 0x0c0e32
const GOLD = 0xffc860
const HOT = 0xfff0c8
const EMBER = 0xff9a3c
const STEEL = [0x8f9ea4,
    0xc5ced3]
const PLASMA = [BLUE,
    CYAN,
    ICE]

/** Mép tay bài phía người dùng: lá bỏ đi xuất phát từ đây */
const handOf = (from: Pt, rows: Rows): Pt => shift(from,
    0,
    -rows.up * 160)

/** Một lá tan từ trên xuống thành mảnh thép, mảnh gom thành dòng cong lao vào Viktor */
async function dissolveInto(layer: Node, card: Pt, me: Pt, bend: number) {
    cardShape(layer,
        card,
        UP,
        46,
        [INDIGO],
        0.3,
        1,
        [GOLD])
    await wait(layer,
        0.15)
    await fly(layer,
        bent(card,
            me,
            bend),
        0.42,
        (p) => {
            for (let i = 0; i < 2; i++) emit(layer,
                shift(p,
                    rand(-10,
                        10),
                    rand(-10,
                        10)),
                {
                    color: [...STEEL,
                        GOLD], kind: "blade", additive: false, life: [0.1,
                        0.18], size: [14,
                        10], alpha: 1, rotation: rand(0,
                        Math.PI), stretch: 1.4
                })
            emit(layer,
                p,
                {
                    color: [CYAN], kind: "glow", life: [0.12,
                        0.2], size: [26,
                        8], alpha: 0.6
                })
        },
        ease.inOut)
}

/** Cầu plasma: ruột xanh mềm, gân sét trắng chạy từ lõi ra vỏ. Vẽ lại mỗi khung */
function orb(layer: Node, at: Pt, size: number) {
    emit(layer,
        at,
        {
            color: [WHITE], kind: "glow", life: [0.05,
                0.07], size: [size * 0.6,
                size * 0.5], alpha: 1
        })
    emit(layer,
        at,
        {
            color: [BLUE,
                CYAN], kind: "glow", life: [0.12,
                0.2], size: [size * 1.5,
                size * 0.6], alpha: 0.7
        })
    if (Math.random() < 0.5) bolt(layer,
        at,
        polar(at,
            rand(0,
                Math.PI * 2),
            size * 0.6),
        [CYAN],
        {
            size: 4, jag: 5, segs: 3, life: 0.06
        })
}

/** Đánh thường: tia hextech nhỏ, đuôi mảnh, chạm loé điện */
registerSkillVfx("basic_viktor",
    async (ctx) => {
        const to = mainOf(ctx)
        await fly(ctx.layer,
            straight(ctx.from,
                to),
            0.24,
            (p) => {
                orb(ctx.layer,
                    p,
                    22)
                emit(ctx.layer,
                    p,
                    {
                        color: PLASMA, kind: "dot", life: [0.15,
                            0.3], size: [6,
                            1], alpha: 1, speed: [10,
                            40]
                    })
            },
            ease.in)
        flash(ctx.layer,
            to,
            [ICE,
                CYAN],
            24,
            90,
            0.2)
        for (let i = 0; i < 2; i++) bolt(ctx.layer,
            to,
            polar(to,
                rand(0,
                    Math.PI * 2),
                60),
            [CYAN,
                BLUE],
            {
                size: 5, jag: 8
            })
        await wait(ctx.layer,
            0.25)
    })

/** P Tiến Hoá Vinh Quang: một lá rời tay tan thành mảnh thép, bay vào Viktor; vòng vàng hextech khoá lại, giáp loé xanh */
registerSkillVfx("viktor_p",
    async (ctx) => {
        const rows = rowsOf(ctx)
        await dissolveInto(ctx.layer,
            shift(handOf(ctx.from,
                rows),
            120,
            0),
            ctx.from,
            70)
        ring(ctx.layer,
            ctx.from,
            [GOLD],
            140,
            90,
            0.45,
            0.9)
        flash(ctx.layer,
            ctx.from,
            [CYAN,
                ICE],
            40,
            140,
            0.35,
            0.6)
        motes(ctx.layer,
            ctx.from,
            16,
            [GOLD,
                HOT,
                CYAN],
            {
                angle: [UP - 0.7,
                    UP + 0.7]
            })
        await wait(ctx.layer,
            0.35)
    })

/** Q Tháo Rời (Quick): lá bỏ tan thành mảnh thép xoay thành khiên quanh Viktor, cầu plasma bắn vào địch, Khiên cầu plasma ôm Viktor */
registerSkillVfx("viktor_q",
    async (ctx) => {
        const k = power(ctx)
        const rows = rowsOf(ctx)
        const to = mainOf(ctx)
        const me = ctx.from
        const hand = handOf(me,
            rows)
        await Promise.all([dissolveInto(ctx.layer,
            shift(hand,
                -60,
                0),
            me,
            -60),
        dissolveInto(ctx.layer,
            shift(hand,
                60,
                0),
            me,
            60)])
        // mảnh thép xoay thành khiên
        await over(ctx.layer,
            0.35,
            (t) => {
                for (let i = 0; i < 5; i++) {
                    const a = t * Math.PI * 3 + (i * Math.PI * 2) / 5
                    emit(ctx.layer,
                        polar(me,
                            a,
                            70),
                        {
                            color: [...STEEL,
                                GOLD], kind: "blade", life: [0.06,
                                0.1], size: [22,
                                16], alpha: 1, rotation: a + UP, stretch: 1.6
                        })
                }
                if (Math.random() < 0.4) bolt(ctx.layer,
                    polar(me,
                        rand(0,
                            6.3),
                        70),
                    polar(me,
                        rand(0,
                            6.3),
                        70),
                    [CYAN],
                    {
                        size: 4, jag: 8, life: 0.08
                    })
            })
        // cầu plasma bay tới địch
        await fly(ctx.layer,
            bent(me,
                to,
                40),
            0.3,
            (p) => {
                orb(ctx.layer,
                    p,
                    40 * k)
                emit(ctx.layer,
                    p,
                    {
                        color: [...STEEL], kind: "blade", additive: false, life: [0.12,
                            0.2], size: [12,
                            8], alpha: 1, speed: [30,
                            90], align: true
                    })
            })
        flash(ctx.layer,
            to,
            [WHITE,
                CYAN],
            40,
            150 * k,
            0.25)
        ring(ctx.layer,
            to,
            [CYAN],
            20,
            170 * k,
            0.32)
        shards(ctx.layer,
            to,
            12,
            [...STEEL,
                CYAN])
        for (let i = 0; i < 3; i++) bolt(ctx.layer,
            to,
            polar(to,
                rand(0,
                    6.3),
                80),
            [CYAN,
                BLUE],
            {
                size: 5
            })
        // Khiên: cầu plasma ôm Viktor
        ring(ctx.layer,
            me,
            [CYAN,
                ICE],
            140,
            150,
            0.8,
            0.7)
        flash(ctx.layer,
            me,
            [BLUE],
            130,
            150,
            0.8,
            0.3)
        await wait(ctx.layer,
            0.5)
    })

/** E Tia Tử Thần: năng lượng dồn vào cánh tay hextech, tia thẳng trắng lõi xanh quét ngang hàng địch, điểm chạm cày vệt lửa vàng; quét
 * xong cả vệt nổ dư chấn cùng lúc trên mọi tướng địch */
registerSkillVfx("viktor_e",
    async (ctx) => {
        const k = power(ctx)
        const foes = allFoes(ctx)
        const arm = shift(ctx.from,
            26,
            34)
        flash(ctx.layer,
            arm,
            [HOT,
                ICE],
            20,
            80,
            0.3)
        await vortex(ctx.layer,
            arm,
            60,
            0.25,
            90,
            [ICE,
                CYAN,
                GOLD])
        const xs = foes.map((p) => p.x)
        const a = {
            x: Math.min(...xs) - 90, y: foes[0].y
        }
        const b = {
            x: Math.max(...xs) + 90, y: foes[0].y
        }
        await over(ctx.layer,
            0.55,
            (t) => {
                const tip = mix(a,
                    b,
                    ease.inOut(t))
                strand(ctx.layer,
                    arm,
                    tip,
                    18,
                    {
                        color: [WHITE], kind: "blade", life: [0.04,
                            0.05], size: [22,
                            6], alpha: 1, stretch: 2
                    })
                strand(ctx.layer,
                    arm,
                    tip,
                    26,
                    {
                        color: [CYAN,
                            BLUE], kind: "glow", life: [0.05,
                            0.06], size: [20,
                            18], alpha: 0.5
                    })
                // vệt lửa vàng nơi tia chạm đất
                emit(ctx.layer,
                    tip,
                    {
                        color: [GOLD,
                            EMBER,
                            HOT], kind: "glow", life: [0.6,
                            0.8], size: [34,
                            22], alpha: 0.85
                    })
                emit(ctx.layer,
                    tip,
                    {
                        color: [HOT,
                            GOLD], kind: "dot", life: [0.3,
                            0.5], size: [7,
                            2], alpha: 1, speed: [80,
                            240], angle: [UP - 0.8,
                            UP + 0.8], gravity: -500
                    })
            })
        // dư chấn: cả vệt nổ cùng lúc
        for (const f of foes) {
            flash(ctx.layer,
                f,
                [WHITE,
                    HOT],
                30,
                130 * k,
                0.22)
            flash(ctx.layer,
                f,
                [GOLD,
                    EMBER],
                50,
                150 * k,
                0.4,
                0.55)
            shards(ctx.layer,
                f,
                8,
                [GOLD,
                    HOT,
                    ...STEEL],
                {
                    gravity: -600
                })
            motes(ctx.layer,
                f,
                12,
                [CYAN,
                    ICE])
        }
        await wait(ctx.layer,
            0.4)
    })

/** R Trường Trọng Lực: giếng trọng lực xanh trên mọi tướng địch, bụi và mảnh vụn tối bị hút vào, sét nối các giếng; sụp xuống, rồi sét
 * Bão Phép giáng xuống tướng bị Choáng, mảnh thép treo quanh */
registerSkillVfx("viktor_r",
    async (ctx) => {
        const k = power(ctx)
        const foes = allFoes(ctx)
        const stunned = mainOf(ctx)
        flash(ctx.layer,
            ctx.from,
            [CYAN,
                BLUE],
            40,
            160,
            0.35,
            0.6)
        for (const f of foes) {
            flash(ctx.layer,
                f,
                [NIGHT,
                    INDIGO],
                160 * k,
                180 * k,
                0.95,
                0.55,
                false)
            ring(ctx.layer,
                f,
                [CYAN,
                    BLUE],
                170 * k,
                120,
                0.9,
                0.6)
        }
        await over(ctx.layer,
            0.85,
            (t) => {
                for (const f of foes) {
                    const a = rand(0,
                        Math.PI * 2)
                    const r = 110 * k
                    emit(ctx.layer,
                        polar(f,
                            a,
                            r),
                        {
                            color: [NIGHT,
                                DEEP,
                                0x2a2f45], kind: "blade", additive: false, life: [0.3,
                                0.3], size: [16,
                                6], alpha: 1, speed: [r / 0.3,
                                r / 0.3], angle: [a + Math.PI + 0.5,
                                a + Math.PI + 0.5], align: true
                        })
                    emit(ctx.layer,
                        polar(f,
                            a + 1,
                            r * 0.8),
                        {
                            color: PLASMA, kind: "dot", life: [0.3,
                                0.3], size: [7,
                                2], alpha: 1, speed: [r * 0.8 / 0.3,
                                r * 0.8 / 0.3], angle: [a + 1 + Math.PI + 0.5,
                                a + 1 + Math.PI + 0.5]
                        })
                }
                if (Math.random() < 0.25 + 0.3 * t) {
                    const i = Math.floor(rand(0,
                        foes.length - 1))
                    if (foes[i + 1]) bolt(ctx.layer,
                        foes[i],
                        foes[i + 1],
                        [CYAN,
                            BLUE],
                        {
                            size: 6, jag: 24, life: 0.12
                        })
                }
            })
        // sụp: trường nén vào từng lá rồi bật bụi thấp
        for (const f of foes) {
            flash(ctx.layer,
                f,
                [ICE,
                    WHITE],
                140 * k,
                30,
                0.2)
            ring(ctx.layer,
                f,
                [CYAN],
                30,
                200 * k,
                0.35,
                0.8)
            motes(ctx.layer,
                f,
                14,
                [...PLASMA,
                    DEEP],
                {
                    speed: [120,
                        320], angle: [-0.4,
                        0.4]
                })
            motes(ctx.layer,
                f,
                14,
                [...PLASMA,
                    DEEP],
                {
                    speed: [120,
                        320], angle: [Math.PI - 0.4,
                        Math.PI + 0.4]
                })
        }
        await wait(ctx.layer,
            0.15)
        // sét Bão Phép giáng xuống tướng bị Choáng
        const sky = shift(stunned,
            rand(-40,
                40),
            380)
        bolt(ctx.layer,
            sky,
            stunned,
            [CYAN,
                BLUE],
            {
                size: 13, jag: 34, life: 0.3
            })
        bolt(ctx.layer,
            shift(sky,
                30,
                0),
            stunned,
            [ICE],
            {
                size: 7, jag: 30, life: 0.24
            })
        flash(ctx.layer,
            stunned,
            [WHITE],
            50,
            200 * k,
            0.25)
        await over(ctx.layer,
            0.6,
            (t) => {
                for (let i = 0; i < 4; i++) {
                    const a = t * 2 + (i * Math.PI) / 2
                    emit(ctx.layer,
                        {
                            x: stunned.x + Math.cos(a) * 60, y: stunned.y + 50 + Math.sin(a) * 14
                        },
                        {
                            color: [...STEEL,
                                GOLD], kind: "blade", life: [0.06,
                                0.08], size: [18,
                                14], alpha: 1, rotation: a, stretch: 1.4
                        })
                }
            })
    })
