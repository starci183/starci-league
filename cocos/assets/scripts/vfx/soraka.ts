// VFX Soraka trên Cocos, theo thiết kế web (packages/client/src/card/vfx/fx_soraka.ts): bụi sao mịn, sương vàng và tím thiên thể,
// quầng sáng mềm; hồi Máu là ánh lục vàng bay lên. Không nét vẽ: mọi hình dáng do bụi trôi theo luồng tạo nên.
// Ô đăng ký: basic_soraka, soraka_p (Cứu Rỗi), soraka_q (Sao Băng), soraka_e (Truyền Sinh Lực), soraka_r (Điều Ước).
import {
    Node
} from "cc"
import {
    dist, ease, rand, type Pt
} from "./particles"
import {
    registerSkillVfx
} from "./registry"
import {
    bent, column, flash, fly, mainOf, motes, power, ring, rise, rowsOf, shift, straight, UP, DOWN, emit, over, wait
} from "./g1_helpers"

const GOLD = 0xffd66b
const STAR = 0xfff3b0
const VIOLET = 0xb48cff
const PEARL = 0xfff6e0
const WHITE = 0xffffff
const HEAL = 0x9dffb0
const NIGHT = 0x5a4cc8
const DUST = [GOLD,
    STAR,
    VIOLET,
    PEARL]

/** Hồi Máu của Soraka: quầng ấm, vòng mảnh, bụi vàng lục bay lên khắp thân */
function bloom(layer: Node, at: Pt, k: number) {
    flash(layer,
        at,
        [HEAL,
            GOLD],
        40 * k,
        150 * k,
        0.5,
        0.6)
    ring(layer,
        shift(at,
            0,
            -40),
        [GOLD,
            HEAL],
        30,
        140 * k,
        0.5,
        0.6)
    void rise(layer,
        at,
        100 * k,
        0.45,
        80 * k,
        [HEAL,
            STAR,
            GOLD,
            WHITE])
}

/** Nổ ánh sao: quầng sáng, sương vàng tím, bụi mịn văng ra */
function starBurst(layer: Node, at: Pt, k: number) {
    flash(layer,
        at,
        [WHITE,
            STAR],
        40 * k,
        160 * k,
        0.22)
    flash(layer,
        at,
        [VIOLET,
            NIGHT],
        70 * k,
        200 * k,
        0.45,
        0.45)
    ring(layer,
        at,
        [GOLD],
        20,
        200 * k,
        0.35,
        0.8)
    motes(layer,
        at,
        Math.round(34 * k),
        DUST,
        {
            speed: [80,
                360], life: [0.4,
                0.8], gravity: -150
        })
    for (let i = 0; i < 6; i++) emit(layer,
        at,
        {
            color: [STAR,
                WHITE], kind: "blade", life: [0.25,
                0.35], size: [40 * k,
                10], alpha: 1, rotation: (i * Math.PI) / 3, stretch: 2.6
        })
}

/** Đánh thường: vầng trăng khuyết vàng xoay chậm bay vòng tới mục tiêu */
registerSkillVfx("basic_soraka",
    async (ctx) => {
        const to = mainOf(ctx)
        await fly(ctx.layer,
            bent(ctx.from,
                to,
                -60),
            0.42,
            (p, t) => {
                emit(ctx.layer,
                    p,
                    {
                        color: [GOLD,
                            STAR], kind: "blade", life: [0.05,
                            0.07], size: [30,
                            26], alpha: 1, rotation: t * 12, stretch: 1.4
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: [GOLD], kind: "glow", life: [0.12,
                            0.2], size: [30,
                            10], alpha: 0.6
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: DUST, kind: "dot", life: [0.3,
                            0.5], size: [5,
                            1], alpha: 1, speed: [10,
                            40]
                    })
            },
            ease.inOut)
        flash(ctx.layer,
            to,
            [STAR],
            20,
            80,
            0.2)
        motes(ctx.layer,
            to,
            14,
            DUST,
            {
                speed: [40,
                    180]
            })
        await wait(ctx.layer,
            0.3)
    })

/** P Cứu Rỗi: dải bụi từ các đồng minh được hồi trôi về Soraka, tụ thành vầng Thánh Quang trên đầu */
registerSkillVfx("soraka_p",
    async (ctx) => {
        const rows = rowsOf(ctx)
        const me = ctx.from
        const mates = rows.ally.filter((p) => dist(p,
            me) > 30)
        await Promise.all(mates.map((m, i) => fly(ctx.layer,
            bent(m,
                shift(me,
                    0,
                    60),
                (i % 2 ? 1 : -1) * 60),
            0.6,
            (p) => {
                emit(ctx.layer,
                    p,
                    {
                        color: DUST, kind: "dot", life: [0.3,
                            0.6], size: [7,
                            1], alpha: 1, speed: [5,
                            30], spread: 6
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: [GOLD], kind: "glow", life: [0.1,
                            0.16], size: [20,
                            8], alpha: 0.5
                    })
            },
            ease.inOut)))
        // vầng Thánh Quang xoay trên đầu
        const halo = shift(me,
            0,
            64)
        flash(ctx.layer,
            halo,
            [STAR,
                GOLD],
            30,
            110,
            0.6,
            0.7)
        await over(ctx.layer,
            0.6,
            (t) => {
                for (let i = 0; i < 4; i++) {
                    const a = t * Math.PI * 3 + (i * Math.PI) / 2
                    emit(ctx.layer,
                        {
                            x: halo.x + Math.cos(a) * 46, y: halo.y + Math.sin(a) * 12
                        },
                        {
                            color: [STAR,
                                GOLD], kind: "dot", life: [0.15,
                                0.25], size: [9,
                                2], alpha: 1
                        })
                }
            })
        await wait(ctx.layer,
            0.2)
    })

/** Q Sao Băng: dấu tròn thiên thể hiện trên mục tiêu, sao chổi bụi sa chéo từ trời xuống, nổ ánh sao; trúng thì bụi lục vàng bay về
 * Soraka hồi Máu */
registerSkillVfx("soraka_q",
    async (ctx) => {
        const k = power(ctx)
        const to = mainOf(ctx)
        ring(ctx.layer,
            to,
            [VIOLET],
            150 * k,
            130 * k,
            0.55,
            0.6)
        flash(ctx.layer,
            to,
            [NIGHT],
            120,
            140,
            0.55,
            0.3)
        flash(ctx.layer,
            shift(ctx.from,
                0,
                40),
            [STAR],
            20,
            80,
            0.3)
        await wait(ctx.layer,
            0.15)
        const sky = shift(to,
            -160,
            440)
        await fly(ctx.layer,
            straight(sky,
                to),
            0.36,
            (p, _t, dir) => {
                emit(ctx.layer,
                    p,
                    {
                        color: [WHITE], kind: "glow", life: [0.06,
                            0.1], size: [36 * k,
                            20], alpha: 1
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: [GOLD,
                            STAR], kind: "blade", life: [0.2,
                            0.3], size: [46,
                            12], alpha: 0.9, rotation: dir, stretch: 3
                    })
                for (let i = 0; i < 3; i++) emit(ctx.layer,
                    p,
                    {
                        color: DUST, kind: "dot", life: [0.35,
                            0.7], size: [7,
                            1], alpha: 1, speed: [20,
                            90], angle: [dir + Math.PI - 0.5,
                            dir + Math.PI + 0.5], spread: 6
                    })
            },
            ease.in)
        starBurst(ctx.layer,
            to,
            1.1 * k)
        await wait(ctx.layer,
            0.15)
        // bụi lục vàng bay về Soraka
        await fly(ctx.layer,
            bent(to,
                ctx.from,
                70),
            0.4,
            (p) => emit(ctx.layer,
                p,
                {
                    color: [HEAL,
                        GOLD], kind: "dot", life: [0.25,
                        0.4], size: [8,
                        2], alpha: 1, spread: 8
                }),
            ease.inOut)
        bloom(ctx.layer,
            ctx.from,
            0.8)
        await wait(ctx.layer,
            0.35)
    })

/** E Truyền Sinh Lực: Soraka mất Máu (bụi đỏ hồng rời khỏi người), bụi xoáy tụ, hai dòng bụi xoắn chảy sang đồng minh và nở sinh lực */
registerSkillVfx("soraka_e",
    async (ctx) => {
        const k = power(ctx)
        const to = mainOf(ctx)
        // giá Máu
        motes(ctx.layer,
            ctx.from,
            16,
            [0xff7a9a,
                0xffb0c4],
            {
                angle: [DOWN - 0.8,
                    DOWN + 0.8], speed: [40,
                    140], gravity: -200
            })
        await over(ctx.layer,
            0.3,
            (t) => {
                for (let i = 0; i < 3; i++) {
                    const a = t * Math.PI * 4 + (i * Math.PI * 2) / 3
                    const r = 70 * (1 - t)
                    emit(ctx.layer,
                        {
                            x: ctx.from.x + Math.cos(a) * r, y: ctx.from.y + Math.sin(a) * r
                        },
                        {
                            color: DUST, kind: "dot", life: [0.15,
                                0.25], size: [8,
                                2], alpha: 1
                        })
                }
            })
        if (dist(ctx.from,
            to) > 10) {
            await Promise.all([1,
                -1].map((s) => fly(ctx.layer,
                (t) => shift(bent(ctx.from,
                    to,
                    s * 40)(t),
                0,
                Math.sin(t * Math.PI * 4) * 16 * s),
                0.45,
                (p) => {
                    emit(ctx.layer,
                        p,
                        {
                            color: [HEAL,
                                STAR], kind: "glow", life: [0.15,
                                0.25], size: [20,
                                8], alpha: 0.8
                        })
                    emit(ctx.layer,
                        p,
                        {
                            color: [GOLD,
                                HEAL,
                                VIOLET], kind: "dot", life: [0.3,
                                0.5], size: [6,
                                1], alpha: 1, speed: [5,
                                30]
                        })
                },
                ease.inOut)))
        }
        flash(ctx.layer,
            ctx.from,
            [STAR],
            20,
            70,
            0.3,
            0.6)
        bloom(ctx.layer,
            to,
            1.1 * k)
        await wait(ctx.layer,
            0.5)
    })

/** R Điều Ước: luồng sáng từ Soraka vút lên trời, rồi cột ánh sáng lục vàng đổ xuống từng đồng minh cùng lúc, hồi Máu bừng lên */
registerSkillVfx("soraka_r",
    async (ctx) => {
        const k = power(ctx)
        const rows = rowsOf(ctx)
        const me = ctx.from
        flash(ctx.layer,
            me,
            [STAR,
                GOLD],
            50,
            170,
            0.5,
            0.7)
        await stream2(ctx.layer,
            me)
        for (const a of rows.ally) {
            column(ctx.layer,
                shift(a,
                    0,
                    -50),
                360,
                70 * k,
                [STAR,
                    HEAL,
                    GOLD],
                0.7,
                0.55)
        }
        await wait(ctx.layer,
            0.18)
        for (const a of rows.ally) bloom(ctx.layer,
            a,
            k)
        await wait(ctx.layer,
            0.6)
    })

/** Luồng bụi sáng từ Soraka vút thẳng lên trời */
function stream2(layer: Node, at: Pt): Promise<void> {
    return over(layer,
        0.4,
        () => {
            for (let i = 0; i < 3; i++) emit(layer,
                shift(at,
                    rand(-14,
                        14),
                    rand(0,
                        30)),
                {
                    color: [STAR,
                        WHITE,
                        GOLD], kind: "dot", life: [0.4,
                        0.6], size: [9,
                        2], alpha: 1, speed: [500,
                        800], angle: [UP - 0.05,
                        UP + 0.05]
                })
        })
}
