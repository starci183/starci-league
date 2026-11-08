// VFX Azir: cát vàng mịn thật dày, mũi giáo Lính Cát là mảnh sắc `blade`. Không hình học; cả hàng Lính đâm một nhịp.
import {
    bloom, dustBurst, dustStream, mist
} from "./fx_dust"
import {
    along, angleOf, beatOnce, blast, flight, kOf, pointsOf
} from "./fx_flow"
import {
    ease, rand, sleep, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const SAND = 0xe2b45c
const DUNE = 0xb9843a
const PALE = 0xf7e4ac
const BRONZE = 0x8a5c24
const palette = (ctx: VfxCtx) => [ctx.color,
    ctx.color2 ?? PALE,
    SAND,
    DUNE,
    BRONZE]

const dustCloud = (ctx: VfxCtx, at: Pt, size: number) => mist(ctx.layer,
    at,
    {
        color: [SAND,
            DUNE,
            BRONZE], size, alpha: .46
    })
/** Cát văng cao rồi rơi xuống */
const spray = (ctx: VfxCtx, at: Pt, count: number, power = 1) => dustBurst(ctx.layer,
    at,
    {
        count, color: palette(ctx), speed: [120 * power,
            560 * power], angle: [-Math.PI * .92,
            -Math.PI * .08], gravity: 760, drag: .5, flow: 22, life: [420,
            900], size: [5,
            2], alpha: 1, spread: 26, additive: false
    })
/** Một mũi giáo đâm từ `a` về `b` bằng cụm mảnh sắc */
const thrust = (ctx: VfxCtx, a: Pt, b: Pt, ms: number, n: number) => {
    const dir = angleOf(a,
        b)
    return flight(ctx,
        a,
        b,
        {
            ms, width: 12, color: [PALE,
                0xffffff,
                SAND], perSec: 1000, blade: true, easing: ease.in, additive: false, size: [6,
                2], trail: {
                angle: [dir - .3,
                    dir + .3]
            }
        }).then(() => n)
}

/** Đánh thường: tia cát */
registerVfx("azirSandBolt",
    async (ctx) => {
        const k = kOf(ctx), beat = beatOnce(ctx), color = palette(ctx)
        await Promise.all(pointsOf(ctx).map((to) => flight(ctx,
            ctx.from,
            to,
            {
                ms: 260, width: 26 * k, color, perSec: 2400, additive: false, size: [6,
                    2], arrive: beat, trail: {
                    gravity: 240
                }
            })))
    })
registerVfx("azirSandHit",
    async (ctx) => {
        await Promise.all([
            spray(ctx,
                ctx.from,
                460 * ctx.intensity),
            dustCloud(ctx,
                ctx.from,
                150 * kOf(ctx)),
            bloom(ctx.layer,
                ctx.from,
                PALE,
                120,
                220)
        ])
    })
/** Nhát đâm của Lính: mũi giáo từ phía dưới mục tiêu đâm lên, đúng lúc sát thương rơi; mọi Lính cùng một nhịp nhờ visualGroup */
registerVfx("azirStab",
    async (ctx) => {
        const tip = ctx.from
        const root = {
            x: tip.x + rand(-26,
                26), y: tip.y + 130
        }
        const dir = angleOf(root,
            tip)
        ctx.shake(3,
            90)
        await Promise.all([
            dustBurst(ctx.layer,
                {
                    x: (tip.x + root.x) / 2, y: (tip.y + root.y) / 2
                },
                {
                    count: 280, color: [0xffffff,
                        PALE,
                        SAND], blade: true, speed: [640,
                        1100], angle: [dir - .1,
                        dir + .1], life: [130,
                        230], size: [52,
                        18], alpha: 1, drag: 1, spread: 16, additive: false
                }),
            spray(ctx,
                tip,
                360,
                .9),
            dustCloud(ctx,
                tip,
                120)
        ])
    })
/** Niệm: cát xoáy lên quanh Azir */
registerVfx("azirSandRise",
    async (ctx) => {
        const k = kOf(ctx), color = palette(ctx)
        let a = 0
        const at = () => ({
            x: ctx.from.x + Math.cos(a) * 80 * k, y: ctx.from.y + Math.sin(a) * 34 * k + 30
        })
        await Promise.all([
            tween(220,
                (t) => { a = t * Math.PI * 5 },
                ease.linear,
                ctx.layer),
            dustStream(ctx.layer,
                at,
                220,
                2000,
                {
                    color, speed: [40,
                        150], angle: [-Math.PI * .7,
                        -Math.PI * .3], life: [240,
                        520], size: [5,
                        2], alpha: 1, flow: 40, additive: false
                }),
            sleep(190).then(() => ctx.onBeat?.())
        ])
    })
/** Q: dải cát tràn tới đối diện đường */
registerVfx("azirConquer",
    async (ctx) => {
        const k = kOf(ctx), beat = beatOnce(ctx)
        await Promise.all(pointsOf(ctx).flatMap((to) => [
            thrust(ctx,
                ctx.from,
                to,
                240,
                1),
            flight(ctx,
                ctx.from,
                to,
                {
                    ms: 260, width: 74 * k, color: [DUNE,
                        BRONZE,
                        SAND,
                        ctx.color], perSec: 5600, additive: false, size: [6,
                        2], arrive: beat, trail: {
                        gravity: 300
                    }
                })
        ]))
    })
registerVfx("azirConquerHit",
    async (ctx) => {
        ctx.shake(5,
            150)
        await Promise.all([
            spray(ctx,
                ctx.from,
                640),
            dustCloud(ctx,
                ctx.from,
                190),
            blast(ctx,
                ctx.from,
                palette(ctx),
                180,
                420,
                {
                    additive: false
                })
        ])
    })
/** Lính Cát trồi lên ở đường: cột cát bốc rồi kết thành dáng người cầm giáo */
registerVfx("azirSoldierRise",
    async (ctx) => {
        const color = palette(ctx)
        await Promise.all([
            spray(ctx,
                ctx.from,
                520),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 380, color, speed: [120,
                        420], angle: [-Math.PI * .58,
                        -Math.PI * .42], life: [300,
                        560], size: [6,
                        2], alpha: 1, flow: 26, spread: 30, additive: false
                }),
            dustCloud(ctx,
                ctx.from,
                170)
        ])
        ctx.onBeat?.()
    })
/** Lính đứng gác trên đường: bụi cát chảy thành thân người và mũi giáo sáng, giữ tới khi Lính mất (tether) */
registerVfx("azirSoldierStand",
    async (ctx) => {
        const color = palette(ctx)
        const released = () => !!ctx.tether?.released()
        while (!released() && !ctx.layer.destroyed) {
            const at = ctx.tether?.target() ?? ctx.from
            void dustBurst(ctx.layer,
                {
                    x: at.x, y: at.y + 10
                },
                {
                    count: 90, color, spread: 30, speed: [20,
                        70], angle: [-Math.PI * .6,
                        -Math.PI * .4], life: [260,
                        480], size: [5,
                        2], alpha: .92, flow: 14, additive: false
                })
            void dustBurst(ctx.layer,
                {
                    x: at.x + 18, y: at.y - 34
                },
                {
                    count: 22, color: [0xffffff,
                        PALE], blade: true, speed: [8,
                        30], angle: [-Math.PI * .55,
                        -Math.PI * .45], life: [200,
                        320], size: [24,
                        12], alpha: 1, drag: 2, additive: false
                })
            await sleep(170)
        }
        await dustBurst(ctx.layer,
            ctx.tether?.target() ?? ctx.from,
            {
                count: 260, color, speed: [40,
                    220], gravity: 500, life: [300,
                    640], size: [5,
                    2], alpha: .95, flow: 20, spread: 30, additive: false
            }).catch(() => {})
    })
/** E Cát Lưu Sa: thân Azir tan vào cát, chảy tới đường Lính */
registerVfx("azirShift",
    async (ctx) => {
        const k = kOf(ctx), beat = beatOnce(ctx), color = palette(ctx)
        await Promise.all(pointsOf(ctx).map((to) => Promise.all([
            spray(ctx,
                ctx.from,
                420),
            flight(ctx,
                ctx.from,
                to,
                {
                    ms: 300, width: 62 * k, color, perSec: 3200, additive: false, size: [6,
                        2], arc: 20, arrive: beat, trail: {
                        gravity: 320
                    }
                })
        ])))
    })
registerVfx("azirShiftHit",
    async (ctx) => {
        ctx.shake(5,
            150)
        await Promise.all([
            spray(ctx,
                ctx.from,
                620),
            dustCloud(ctx,
                ctx.from,
                170)
        ])
    })
/** Khiên cát của E */
registerVfx("azirSandShield",
    async (ctx) => {
        const color = palette(ctx)
        let a = 0
        const at = () => ({
            x: ctx.from.x + Math.cos(a) * 92, y: ctx.from.y + Math.sin(a) * 118
        })
        await Promise.all([
            tween(420,
                (t) => { a = t * Math.PI * 6 },
                ease.linear,
                ctx.layer),
            dustStream(ctx.layer,
                at,
                420,
                2600,
                {
                    color, speed: [6,
                        40], life: [240,
                        520], size: [6,
                        2], alpha: 1, flow: 26, additive: false
                }),
            bloom(ctx.layer,
                ctx.from,
                PALE,
                150,
                300)
        ])
        ctx.onBeat?.()
    })
/** R Phân Chia Thiên Hạ: tường cát dựng ngang bàn rồi cả hàng giáo đâm một nhịp */
registerVfx("azirPhalanx",
    async (ctx) => {
        const k = kOf(ctx), beat = beatOnce(ctx), color = palette(ctx)
        const targets = pointsOf(ctx)
        const low = {
            x: Math.min(...targets.map((p) => p.x)) - 60, y: ctx.from.y
        }
        const high = {
            x: Math.max(...targets.map((p) => p.x)) + 60, y: ctx.from.y
        }
        ctx.shake(4,
            260)
        await Promise.all([
            along(ctx,
                low,
                high,
                16,
                {
                    count: 150, color, speed: [100,
                        440], angle: [-Math.PI * .62,
                        -Math.PI * .38], life: [320,
                        720], size: [6,
                        2], alpha: 1, flow: 30, spread: 34, additive: false, gravity: 340
                }),
            sleep(280).then(() => Promise.all(targets.map((to) => {
                const start = {
                    x: to.x, y: ctx.from.y
                }
                return Promise.all([
                    thrust(ctx,
                        start,
                        to,
                        200,
                        1),
                    flight(ctx,
                        start,
                        to,
                        {
                            ms: 220, width: 70 * k, color, perSec: 2600, additive: false, size: [6,
                                2], arrive: beat
                        })
                ])
            })))
        ])
    })
registerVfx("azirPhalanxHit",
    async (ctx) => {
        ctx.shake(7,
            200)
        await Promise.all([
            spray(ctx,
                ctx.from,
                760,
                1.1),
            dustCloud(ctx,
                ctx.from,
                200),
            bloom(ctx.layer,
                ctx.from,
                PALE,
                190,
                260)
        ])
    })
