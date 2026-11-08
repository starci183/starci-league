// VFX Kog'Maw trên Cocos, theo thiết kế web (packages/client/src/card/vfx/fx_kogmaw.ts): AXIT lỏng đặc xanh chanh, vàng nhạt,
// rêu sẫm (icon Q, R); Đói và Cao Xạ Ma Pháp dùng màu Hư Không hồng tím. Bãi axit là cụm hạt mềm chồng nhau, méo theo đà bay.
// Ô đăng ký: basic_kogmaw, kogmaw_p (Cơn Đói Hư Không), kogmaw_q (Phun Axít), kogmaw_e (Cao Xạ Ma Pháp), kogmaw_r (Pháo Sinh Học).
import {
    Node
} from "cc"
import {
    angleOf, dist, ease, rand, type Pt
} from "./particles"
import {
    registerSkillVfx
} from "./registry"
import {
    bent, drops, flash, fly, lob, mainOf, motes, polar, power, ring, rise, shift, smoke, straight, UP, DOWN, vortex, emit, over, wait
} from "./g1_helpers"

const ACID = 0xa8e822
const LIME = 0xd6ff3c
const PALE = 0xf6ffa8
const GREEN = 0x4fb82a
const MOSS = 0x1f6e2c
const MURK = 0x0e3a30
const PINK = 0xff4fd2
const MAGENTA = 0xd02ae0
const VIOLET = 0x6a2cc8
const SCALE = [0x8c8f86,
    0x5f625c]

/** Khối axit: cụm mềm chồng nhau, đầu tròn đuôi nhọn theo hướng bay; lõi vàng nhạt. Vẽ lại mỗi khung */
function glob(layer: Node, at: Pt, dir: number, size: number, body = [ACID,
    GREEN], core = PALE) {
    for (let i = 0; i < 4; i++) {
        emit(layer,
            polar(at,
                dir,
                -i * size * 0.32),
            {
                color: body, kind: "glow", additive: false, life: [0.05,
                    0.07], size: [size * (1.2 - i * 0.22),
                    size * (1.2 - i * 0.22)], alpha: 0.9
            })
    }
    emit(layer,
        polar(at,
            dir,
            size * 0.1),
        {
            color: [core], kind: "glow", life: [0.05,
                0.07], size: [size * 0.7,
                size * 0.6], alpha: 1
        })
    // nước bọt nhỏ giọt rơi khỏi đuôi
    if (Math.random() < 0.6) emit(layer,
        polar(at,
            dir,
            -size * 0.6),
        {
            color: body, kind: "dot", additive: false, life: [0.3,
                0.5], size: [size * 0.25,
                size * 0.1], alpha: 1, speed: [10,
                40], gravity: -700
        })
}

/** Bãi axit vỡ: vương miện giọt bắn lên rồi rơi nặng, sương phun, axit loang hai bên */
function splat(layer: Node, at: Pt, k: number, body = [ACID,
    LIME,
    GREEN]) {
    flash(layer,
        at,
        [PALE],
        30 * k,
        120 * k,
        0.2)
    flash(layer,
        at,
        body,
        60 * k,
        170 * k,
        0.45,
        0.6,
        false)
    ring(layer,
        at,
        [LIME],
        20,
        170 * k,
        0.32,
        0.7)
    drops(layer,
        at,
        Math.round(22 * k),
        body,
        {
            size: [12,
                5], speed: [160,
                420]
        })
    motes(layer,
        at,
        Math.round(16 * k),
        [PALE,
            LIME],
        {
            speed: [80,
                260]
        })
    smoke(layer,
        at,
        Math.round(5 * k),
        [MOSS,
            MURK],
        60 * k,
        {
            alpha: 0.45, angle: [UP - 0.6,
                UP + 0.6], speed: [20,
                70]
        })
}

/** Hàm răng Hư Không sập vào `at`: hai hàng răng hồng trắng khép lại */
function jaws(layer: Node, at: Pt, size: number): Promise<void> {
    return over(layer,
        0.2,
        (t) => {
            const gap = size * (1 - ease.in(t)) + 4
            for (let i = -2; i <= 2; i++) {
                const x = at.x + i * size * 0.32
                emit(layer,
                    {
                        x, y: at.y + gap
                    },
                    {
                        color: [0xffe0f6,
                            PINK], kind: "blade", life: [0.05,
                            0.07], size: [size * 0.45,
                            size * 0.4], alpha: 1, rotation: DOWN, stretch: 1.1
                    })
                emit(layer,
                    {
                        x, y: at.y - gap
                    },
                    {
                        color: [0xffe0f6,
                            PINK], kind: "blade", life: [0.05,
                            0.07], size: [size * 0.45,
                            size * 0.4], alpha: 1, rotation: UP, stretch: 1.1
                    })
            }
        })
}

/** Đánh thường: viên axit nhỏ vàng lục bay thẳng, toé gọn */
registerSkillVfx("basic_kogmaw",
    async (ctx) => {
        const to = mainOf(ctx)
        const dir = angleOf(ctx.from,
            to)
        await fly(ctx.layer,
            straight(ctx.from,
                to),
            0.24,
            (p) => glob(ctx.layer,
                p,
                dir,
                18),
            ease.linear)
        splat(ctx.layer,
            to,
            0.55)
        await wait(ctx.layer,
            0.3)
    })

/** P Cơn Đói Hư Không: luồng Hư Không hồng tím từ quanh mình (hoặc từ tướng vừa chết) hút vào miệng Kog'Maw, hàm răng đớp lại */
registerSkillVfx("kogmaw_p",
    async (ctx) => {
        const me = ctx.from
        const src = mainOf(ctx)
        const starts = [src,
            polar(me,
                UP + 1.2,
                160),
            polar(me,
                UP - 1.2,
                160)]
        await Promise.all(starts.map((s, i) => fly(ctx.layer,
            bent(s,
                me,
                (i - 1) * 70 + 30),
            0.5,
            (p) => {
                emit(ctx.layer,
                    p,
                    {
                        color: [PINK,
                            MAGENTA], kind: "glow", life: [0.15,
                            0.25], size: [26,
                            10], alpha: 0.8
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: [VIOLET,
                            0x2a1050], kind: "glow", additive: false, life: [0.25,
                            0.4], size: [30,
                            12], alpha: 0.4
                    })
            },
            ease.in)))
        flash(ctx.layer,
            me,
            [MAGENTA,
                PINK],
            40,
            140,
            0.4,
            0.7)
        await jaws(ctx.layer,
            shift(me,
                0,
                10),
            48)
        motes(ctx.layer,
            me,
            16,
            [PINK,
                MAGENTA,
                0xffe0f6],
            {
                speed: [100,
                    260]
            })
        await wait(ctx.layer,
            0.3)
    })

/** Q Phun Axít: axit dâng trong miệng nhỏ giọt, bãi nước bọt đầu tròn đuôi nhọn bay thẳng, vỡ trên mục tiêu, vảy giáp bị ăn bong (Rã Giáp) */
registerSkillVfx("kogmaw_q",
    async (ctx) => {
        const k = power(ctx)
        const to = mainOf(ctx)
        const dir = angleOf(ctx.from,
            to)
        const mouth = polar(ctx.from,
            dir,
            40)
        await over(ctx.layer,
            0.28,
            (t) => {
                glob(ctx.layer,
                    mouth,
                    dir,
                    14 + 16 * t)
                if (Math.random() < 0.4) drops(ctx.layer,
                    mouth,
                    1,
                    [ACID,
                        GREEN],
                    {
                        speed: [0,
                            30], angle: [DOWN - 0.3,
                            DOWN + 0.3]
                    })
            })
        await fly(ctx.layer,
            straight(mouth,
                to),
            0.3,
            (p) => glob(ctx.layer,
                p,
                dir,
                38 * k),
            ease.in)
        splat(ctx.layer,
            to,
            1.1 * k)
        // Rã Giáp: vảy xám bong ra rơi, hơi axit bốc
        await Promise.all([
            over(ctx.layer,
                0.55,
                () => {
                    if (Math.random() < 0.5) emit(ctx.layer,
                        shift(to,
                            rand(-45,
                                45),
                            rand(-30,
                                40)),
                        {
                            color: SCALE, kind: "blade", additive: false, life: [0.4,
                                0.6], size: [16,
                                10], alpha: 1, speed: [20,
                                80], gravity: -500, spin: [-6,
                                6], stretch: 1
                        })
                }),
            rise(ctx.layer,
                to,
                80,
                0.55,
                30,
                [LIME,
                    ACID],
                {
                    kind: "glow", size: [16,
                        30], alpha: 0.5
                }),
        ])
    })

/** E Cao Xạ Ma Pháp (tự buff): hơi Hư Không tím bốc quanh Kog'Maw, axit sôi; rồi một phát bắn vồng cao qua các đường cho thấy tầm đánh mới */
registerSkillVfx("kogmaw_e",
    async (ctx) => {
        const k = power(ctx)
        const me = ctx.from
        const to = mainOf(ctx)
        ring(ctx.layer,
            me,
            [MAGENTA,
                PINK],
            30,
            200,
            0.4,
            0.8)
        await Promise.all([
            vortex(ctx.layer,
                me,
                100,
                0.3,
                80,
                [PINK,
                    MAGENTA,
                    LIME]),
            rise(ctx.layer,
                me,
                110,
                0.6,
                90,
                [VIOLET,
                    MAGENTA,
                    PINK,
                    LIME],
                {
                    speed: [80,
                        200]
                }),
        ])
        flash(ctx.layer,
            me,
            [MAGENTA],
            100,
            130,
            0.6,
            0.35)
        if (dist(to, me) > 20) {
            await fly(ctx.layer,
                lob(me,
                    to,
                    220),
                0.48,
                (p, _t, d) => glob(ctx.layer,
                    p,
                    d,
                    26 * k,
                    [MAGENTA,
                        VIOLET],
                    LIME),
                ease.inOut)
            splat(ctx.layer,
                to,
                0.9 * k,
                [MAGENTA,
                    ACID,
                    VIOLET])
        }
        await wait(ctx.layer,
            0.3)
    })

/** R Pháo Sinh Học: Kog'Maw rướn lên phun axit thẳng lên trời, vòng ngắm tím hiện dưới mục tiêu, cột axit đổ xuống, vỡ lớn */
registerSkillVfx("kogmaw_r",
    async (ctx) => {
        const k = power(ctx)
        const to = mainOf(ctx)
        const me = ctx.from
        await fly(ctx.layer,
            straight(shift(me,
                0,
                30),
            shift(me,
                0,
                520)),
            0.3,
            (p) => glob(ctx.layer,
                p,
                UP,
                34 * k),
            ease.in)
        // vòng ngắm và vũng sáng dưới mục tiêu
        ring(ctx.layer,
            to,
            [MAGENTA,
                PINK],
            170 * k,
            150 * k,
            0.55,
            0.85)
        flash(ctx.layer,
            to,
            [LIME,
                ACID],
            120 * k,
            140 * k,
            0.55,
            0.3)
        await wait(ctx.layer,
            0.3)
        // cột axit đổ xuống
        const sky = shift(to,
            rand(-30,
                30),
            480)
        await fly(ctx.layer,
            straight(sky,
                to),
            0.24,
            (p) => {
                glob(ctx.layer,
                    p,
                    DOWN,
                    46 * k)
                emit(ctx.layer,
                    shift(p,
                        rand(-8,
                            8),
                        30),
                    {
                        color: [LIME,
                            ACID], kind: "glow", life: [0.18,
                            0.26], size: [40,
                            20], alpha: 0.7
                    })
            },
            ease.in)
        splat(ctx.layer,
            to,
            1.8 * k)
        ring(ctx.layer,
            to,
            [ACID],
            40,
            300 * k,
            0.45,
            0.8)
        await rise(ctx.layer,
            to,
            150,
            0.5,
            40,
            [LIME,
                ACID,
                PALE])
        await wait(ctx.layer,
            0.2)
    })
