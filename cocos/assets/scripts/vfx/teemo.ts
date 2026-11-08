// VFX Teemo trên Cocos, theo thiết kế web (packages/client/src/card/vfx/fx_teemo.ts, fx_mushroom.ts): Nấm mũ lục đốm tím, độc
// chanh, phi tiêu thân tối chóp lục; Mù là khói tím đen xoáy, mắt xoắn lục như icon Phi Tiêu Mù. Nấm xáo vào Bộ bài đối thủ nằm
// sau hàng địch, nên bào tử luôn bay về phía đó; Kích Nổ thì Nấm trồi ngược ra từ đó.
// Ô đăng ký: basic_teemo, teemo_p (Nấm Độc), teemo_q (Gài Nấm), teemo_e (Phi Tiêu Mù), teemo_r (Kích Nổ).
import {
    Node
} from "cc"
import {
    angleOf, ease, rand, type Pt
} from "./particles"
import {
    registerSkillVfx
} from "./registry"
import {
    flash, fly, lob, mainOf, motes, polar, power, ring, rise, rowsOf, shift, smoke, straight, strand, UP, type Rows, emit, over, wait
} from "./g1_helpers"

const LIME = 0xb6ff3a
const TOXIC = 0x7be02a
const GREEN = 0x3f9a1e
const PURPLE = 0x8a3cff
const VIOLET = 0xc07bff
const SMOKE = 0x170c26
const CAP = 0x5fb52e
const STEM = 0xf2e6c8
const DART = 0x2a2030
const POISON = [LIME,
    TOXIC,
    0xe4ff9a]

/** Ô Bộ bài đối thủ: sau hàng địch */
const deckOf = (rows: Rows): Pt => shift(rows.foe[2],
    rows.spacing * 1.6,
    rows.up * 140)

/** Cây nấm: mũ lục tròn đốm tím, chân kem. Vẽ lại mỗi khung khi đang bay */
function mushroom(layer: Node, at: Pt, size: number, life = 0.05) {
    emit(layer,
        shift(at,
            0,
            -size * 0.35),
        {
            color: [STEM], kind: "blade", additive: false, life: [life,
                life], size: [size * 0.6,
                size * 0.6], alpha: 1, rotation: UP, stretch: 0.9
        })
    emit(layer,
        at,
        {
            color: [CAP,
                GREEN], kind: "glow", additive: false, life: [life,
                life], size: [size * 1.4,
                size * 1.4], alpha: 1
        })
    emit(layer,
        at,
        {
            color: [CAP], kind: "dot", additive: false, life: [life,
                life], size: [size,
                size], alpha: 1
        })
    for (const [dx, dy] of [[-0.25,
        0.1],
    [0.2,
        0.18],
    [0.02,
        -0.08]]) emit(layer,
        shift(at,
            dx * size,
            dy * size),
        {
            color: [PURPLE,
                VIOLET], kind: "dot", additive: false, life: [life,
                life], size: [size * 0.22,
                size * 0.22], alpha: 1
        })
}

/** Đám khí độc: sương lục không cộng màu, bọt chanh nổi lên, vòng loang */
function poisonCloud(layer: Node, at: Pt, k: number) {
    flash(layer,
        at,
        [LIME],
        40 * k,
        150 * k,
        0.25)
    ring(layer,
        at,
        [TOXIC,
            LIME],
        30,
        220 * k,
        0.4,
        0.8)
    smoke(layer,
        at,
        Math.round(10 * k),
        [GREEN,
            TOXIC,
            0x2d6a14],
        80 * k,
        {
            alpha: 0.5, speed: [30,
                140]
        })
    motes(layer,
        at,
        Math.round(24 * k),
        POISON,
        {
            speed: [80,
                300], life: [0.4,
                0.8]
        })
    void rise(layer,
        at,
        110 * k,
        0.5,
        40 * k,
        [LIME,
            TOXIC,
            VIOLET],
        {
            kind: "ring", size: [10,
                14], life: [0.5,
                0.8]
        })
}

/** Bào tử (nấm nhỏ) bật khỏi `from` và bay vồng vào Bộ bài đối thủ */
async function sporeToDeck(layer: Node, from: Pt, deck: Pt, delay: number) {
    await wait(layer,
        delay)
    await fly(layer,
        lob(from,
            deck,
            90),
        0.45,
        (p) => {
            mushroom(layer,
                p,
                16)
            emit(layer,
                p,
                {
                    color: POISON, kind: "dot", life: [0.2,
                        0.4], size: [5,
                        1], alpha: 1, speed: [10,
                        40]
                })
        },
        ease.inOut)
    flash(layer,
        deck,
        [LIME,
            VIOLET],
        20,
        80,
        0.25,
        0.8)
}

/** Phi tiêu: thân tối, đuôi lông tím, chóp lục */
function dart(layer: Node, at: Pt, dir: number, size: number) {
    emit(layer,
        at,
        {
            color: [DART], kind: "blade", additive: false, life: [0.04,
                0.05], size: [size,
                size * 0.5], alpha: 1, rotation: dir, stretch: 2.4
        })
    emit(layer,
        polar(at,
            dir,
            size * 0.9),
        {
            color: [LIME], kind: "dot", life: [0.05,
                0.07], size: [size * 0.35,
                size * 0.3], alpha: 1
        })
    emit(layer,
        polar(at,
            dir,
            -size * 0.9),
        {
            color: [PURPLE,
                VIOLET], kind: "blade", life: [0.12,
                0.2], size: [size * 0.8,
                size * 0.4], alpha: 0.9, rotation: dir + rand(-0.3,
                0.3), stretch: 1.4
        })
}

/** Đánh thường: phi tiêu nhỏ bay thẳng, toé độc lục, khói độc bám lại */
registerSkillVfx("basic_teemo",
    async (ctx) => {
        const to = mainOf(ctx)
        const dir = angleOf(ctx.from,
            to)
        await fly(ctx.layer,
            straight(ctx.from,
                to),
            0.2,
            (p) => {
                dart(ctx.layer,
                    p,
                    dir,
                    20)
                emit(ctx.layer,
                    p,
                    {
                        color: [TOXIC], kind: "glow", life: [0.1,
                            0.16], size: [18,
                            6], alpha: 0.6
                    })
            },
            ease.linear)
        flash(ctx.layer,
            to,
            [LIME],
            20,
            80,
            0.2)
        motes(ctx.layer,
            to,
            12,
            POISON,
            {
                speed: [40,
                    180]
            })
        await rise(ctx.layer,
            to,
            70,
            0.35,
            40,
            [TOXIC,
                LIME])
    })

/** P Nấm Độc: độc lục toé trên mục tiêu, một bào tử nấm bật ra bay vồng vào Bộ bài đối thủ */
registerSkillVfx("teemo_p",
    async (ctx) => {
        const to = mainOf(ctx)
        const rows = rowsOf(ctx)
        poisonCloud(ctx.layer,
            to,
            0.7)
        await sporeToDeck(ctx.layer,
            to,
            deckOf(rows),
            0.15)
        await wait(ctx.layer,
            0.25)
    })

/** Q Gài Nấm: cây nấm trồi lên trên đầu Teemo giữa bào tử, ném vồng tới mục tiêu, nổ khí độc; rồi Nấm xáo vào Bộ bài đối thủ */
registerSkillVfx("teemo_q",
    async (ctx) => {
        const k = power(ctx)
        const to = mainOf(ctx)
        const rows = rowsOf(ctx)
        const top = shift(ctx.from,
            0,
            70)
        await over(ctx.layer,
            0.3,
            (t) => {
                mushroom(ctx.layer,
                    top,
                    20 + 16 * ease.out(t))
                if (Math.random() < 0.6) emit(ctx.layer,
                    shift(top,
                        rand(-30,
                            30),
                        rand(-20,
                            10)),
                    {
                        color: POISON, kind: "dot", life: [0.3,
                            0.5], size: [6,
                            1], alpha: 1, speed: [20,
                            60], angle: [UP - 0.5,
                            UP + 0.5]
                    })
            })
        await fly(ctx.layer,
            lob(top,
                to,
                110),
            0.42,
            (p) => {
                mushroom(ctx.layer,
                    p,
                    36 * k)
                emit(ctx.layer,
                    p,
                    {
                        color: POISON, kind: "dot", life: [0.25,
                            0.45], size: [6,
                            1], alpha: 1, speed: [10,
                            40]
                    })
            },
            ease.inOut)
        poisonCloud(ctx.layer,
            to,
            1.2 * k)
        const deck = deckOf(rows)
        await Promise.all([sporeToDeck(ctx.layer,
            to,
            deck,
            0.15),
        sporeToDeck(ctx.layer,
            to,
            deck,
            0.27)])
        await wait(ctx.layer,
            0.2)
    })

/** E Phi Tiêu Mù (Quick): phi tiêu thổi rất nhanh kéo vệt lục tím; trúng loé lục, khói tím đen cuộn trùm mặt, bụi lục xoáy như mắt xoắn */
registerSkillVfx("teemo_e",
    async (ctx) => {
        const k = power(ctx)
        const to = mainOf(ctx)
        const dir = angleOf(ctx.from,
            to)
        flash(ctx.layer,
            shift(ctx.from,
                0,
                20),
            [VIOLET],
            16,
            60,
            0.15)
        await fly(ctx.layer,
            straight(ctx.from,
                to),
            0.16,
            (p) => {
                dart(ctx.layer,
                    p,
                    dir,
                    26)
                strand(ctx.layer,
                    polar(p,
                        dir,
                        -60),
                    p,
                    14,
                    {
                        color: [PURPLE,
                            LIME], kind: "glow", life: [0.08,
                            0.12], size: [14,
                            6], alpha: 0.5
                    })
            },
            ease.linear)
        flash(ctx.layer,
            to,
            [LIME,
                0xe4ff9a],
            30,
            120 * k,
            0.2)
        smoke(ctx.layer,
            shift(to,
                0,
                20),
            10,
            [SMOKE,
                0x3a1a5a,
                PURPLE],
            70 * k,
            {
                alpha: 0.65, life: [0.7,
                    1.0], speed: [10,
                    50]
            })
        // mắt xoắn: bụi lục xoáy lỏng trong khói
        await over(ctx.layer,
            0.7,
            (t) => {
                for (let i = 0; i < 2; i++) {
                    const a = t * Math.PI * 6 + i * Math.PI
                    const r = 10 + 40 * ((t * 3) % 1)
                    emit(ctx.layer,
                        {
                            x: to.x + Math.cos(a) * r, y: to.y + 20 + Math.sin(a) * r * 0.7
                        },
                        {
                            color: [LIME,
                                TOXIC], kind: "dot", life: [0.2,
                                0.3], size: [8,
                                2], alpha: 1
                        })
                }
            })
    })

/** R Kích Nổ: tia độc từ Teemo lao vào Bộ bài đối thủ, bộ rùng lên, rồi từng cây Nấm vọt ra rơi xuống tướng tỉ lệ Máu thấp nhất và nổ */
registerSkillVfx("teemo_r",
    async (ctx) => {
        const k = power(ctx)
        const to = mainOf(ctx)
        const rows = rowsOf(ctx)
        const deck = deckOf(rows)
        await fly(ctx.layer,
            straight(ctx.from,
                deck),
            0.3,
            (p, _t, d) => {
                dart(ctx.layer,
                    p,
                    d,
                    22)
                emit(ctx.layer,
                    p,
                    {
                        color: POISON, kind: "glow", life: [0.2,
                            0.3], size: [26,
                            10], alpha: 0.7
                    })
            },
            ease.in)
        // bộ bài rùng lên
        await over(ctx.layer,
            0.3,
            (t) => {
                emit(ctx.layer,
                    shift(deck,
                        Math.sin(t * 60) * 6,
                        0),
                    {
                        color: [LIME,
                            VIOLET], kind: "glow", life: [0.06,
                            0.08], size: [90,
                            80], alpha: 0.5
                    })
            })
        const n = 3
        const shots: Promise<void>[] = []
        for (let i = 0; i < n; i++) {
            const land = shift(to,
                rand(-20,
                    20),
                rand(-10,
                    10))
            shots.push(fly(ctx.layer,
                lob(deck,
                    land,
                    160),
                0.4,
                (p) => {
                    mushroom(ctx.layer,
                        p,
                        34 * k)
                    emit(ctx.layer,
                        p,
                        {
                            color: POISON, kind: "dot", life: [0.25,
                                0.45], size: [6,
                                1], alpha: 1, speed: [10,
                                50]
                        })
                },
                ease.inOut).then(() => poisonCloud(ctx.layer,
                land,
                1.3 * k)))
            await wait(ctx.layer,
                0.18)
        }
        await Promise.all(shots)
        await wait(ctx.layer,
            0.5)
    })
