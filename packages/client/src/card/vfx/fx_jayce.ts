// VFX Jayce: điện hextech xanh trắng, hạt mịn dày; búa nện thẳng từ trên xuống, không hình học, mỗi chiêu một nhịp.
import {
    bloom, dustBurst, dustStream, mist
} from "./fx_dust"
import {
    beatOnce, blast, column, flight, kOf, pointsOf
} from "./fx_flow"
import {
    ease, rand, sleep, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const VOLT = 0x4fc8ff
const ICE = 0xd6f6ff
const WHITE = 0xffffff
const CYAN = 0x1f7fd8
const palette = (ctx: VfxCtx) => [ctx.color,
    ctx.color2 ?? ICE,
    WHITE,
    VOLT]

/** Tia điện ngắn toả ra: vệt mảnh theo mọi hướng */
const arcs = (ctx: VfxCtx, at: Pt, count: number, reach = 1) => dustBurst(ctx.layer,
    at,
    {
        count, color: [WHITE,
            ICE,
            VOLT], streak: 5, speed: [340 * reach,
            1000 * reach], life: [90,
            240], size: [3,
            1], alpha: 1, flow: 240, drag: 1.2, spread: 16, additive: true
    })
const shock = (ctx: VfxCtx, at: Pt, size: number, n: number) => Promise.all([
    blast(ctx,
        at,
        palette(ctx),
        size,
        n,
        {
            additive: true
        }),
    arcs(ctx,
        at,
        Math.round(n * .45)),
    mist(ctx.layer,
        at,
        {
            color: [CYAN,
                VOLT], size: size * .9, alpha: .3
        })
])
/** Búa nện: khối điện dội thẳng từ trên xuống, chạm là arrive */
function hammer(ctx: VfxCtx, at: Pt, height: number, width: number, ms: number, arrive: () => void) {
    return column(ctx,
        at,
        {
            ms, height, width, color: palette(ctx), perSec: 4200, blade: true, arrive
        })
}
function bolt(ctx: VfxCtx, to: Pt, ms: number, width: number, arrive: () => void) {
    return flight(ctx,
        ctx.from,
        to,
        {
            ms, width, color: palette(ctx), perSec: 3000, blade: true, additive: true, easing: ease.in, size: [7,
                2], arrive
        })
}

/** Đánh thường Búa */
registerVfx("jayceHammerSwing",
    async (ctx) => {
        const k = kOf(ctx), beat = beatOnce(ctx)
        await Promise.all(pointsOf(ctx).map((to) => hammer(ctx,
            to,
            300,
            72 * k,
            190,
            beat)))
    })
/** Đánh thường Pháo */
registerVfx("jayceCannonShot",
    async (ctx) => {
        const k = kOf(ctx), beat = beatOnce(ctx)
        await Promise.all(pointsOf(ctx).map((to) => bolt(ctx,
            to,
            220,
            24 * k,
            beat)))
    })
registerVfx("jayceHit",
    async (ctx) => {
        ctx.shake(3,
            100)
        await shock(ctx,
            ctx.from,
            170 * kOf(ctx),
            440)
    })
/** Niệm: điện dồn vào vũ khí */
registerVfx("jayceCharge",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                VOLT,
                200 * k,
                280),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 380, color: palette(ctx), spread: 120 * k, speed: [20,
                        70], life: [180,
                        300], size: [5,
                        2], alpha: 1, flow: 60, drag: .4, additive: true
                }),
            arcs(ctx,
                ctx.from,
                120,
                .4),
            sleep(170).then(() => ctx.onBeat?.())
        ])
    })
/** Búa Q Chỉ Thiên!: sau khi hoán đổi, búa dội xuống đầu mục tiêu */
registerVfx("jayceLeap",
    async (ctx) => {
        const k = kOf(ctx), beat = beatOnce(ctx)
        await Promise.all(pointsOf(ctx).map((to) => hammer(ctx,
            to,
            520,
            120 * k,
            230,
            beat)))
    })
registerVfx("jayceSlam",
    async (ctx) => {
        ctx.shake(9,
            220)
        await shock(ctx,
            ctx.from,
            240 * kOf(ctx),
            820)
    })
/** Pháo Q Cầu Sấm */
registerVfx("jayceShockBlast",
    async (ctx) => {
        const k = kOf(ctx), beat = beatOnce(ctx)
        await Promise.all(pointsOf(ctx).map((to) => bolt(ctx,
            to,
            300,
            46 * k,
            beat)))
    })
registerVfx("jayceBlastHit",
    async (ctx) => {
        ctx.shake(7,
            180)
        await Promise.all([
            shock(ctx,
                ctx.from,
                250,
                820),
            arcs(ctx,
                ctx.from,
                300,
                1.3)
        ])
    })
/** Búa E Lôi Phạt: nện đối diện, điện bùng trên lá */
registerVfx("jayceThunderBlow",
    async (ctx) => {
        const k = kOf(ctx), beat = beatOnce(ctx)
        await Promise.all(pointsOf(ctx).map((to) => hammer(ctx,
            to,
            420,
            96 * k,
            210,
            beat)))
    })
registerVfx("jayceThunderHit",
    async (ctx) => {
        ctx.shake(8,
            200)
        await Promise.all([
            shock(ctx,
                ctx.from,
                220,
                680),
            arcs(ctx,
                ctx.from,
                420)
        ])
    })
/** Pháo E Cổng Tăng Tốc: cánh cổng hạt dọc 3 đường, xoáy điện chạy qua; dùng cast, không có mục tiêu địch */
registerVfx("jayceGate",
    async (ctx) => {
        const color = palette(ctx)
        let t = 0
        const span = 520
        const at = () => {
            const side = Math.random() < .5 ? -1 : 1
            return {
                x: ctx.from.x + side * span * rand(0,
                    1), y: ctx.from.y - 60 + Math.sin(t * Math.PI * 8) * 42
            }
        }
        ctx.onBeat?.()
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                VOLT,
                420,
                420),
            tween(440,
                (x) => { t = x },
                ease.linear,
                ctx.layer),
            dustStream(ctx.layer,
                at,
                440,
                5200,
                {
                    color, speed: [40,
                        200], angle: [-Math.PI * .6,
                        -Math.PI * .4], life: [240,
                        520], size: [6,
                        2], alpha: 1, flow: 44, additive: true
                }),
            arcs(ctx,
                ctx.from,
                220,
                .8)
        ])
    })
/** Búa R Sấm Chớp Rền Vang: búa khổng lồ dội xuống 3 đường cùng nhịp */
registerVfx("jayceThunderfall",
    async (ctx) => {
        const k = kOf(ctx), beat = beatOnce(ctx)
        await Promise.all(pointsOf(ctx).map((to) => hammer(ctx,
            to,
            640,
            170 * k,
            260,
            beat)))
    })
/** Pháo R Tích Tụ: phát bắn xuyên qua cổng tăng tốc */
registerVfx("jayceGateShot",
    async (ctx) => {
        const k = kOf(ctx), beat = beatOnce(ctx)
        await Promise.all(pointsOf(ctx).flatMap((to) => [
            bloom(ctx.layer,
                {
                    x: (ctx.from.x + to.x) / 2, y: (ctx.from.y + to.y) / 2
                },
                VOLT,
                300,
                300),
            bolt(ctx,
                to,
                240,
                64 * k,
                beat)
        ]))
    })
/** Nút Đổi Dạng: điện quấn thân, vũ khí tan rồi kết lại */
registerVfx("jayceTransform",
    async (ctx) => {
        const k = kOf(ctx), color = palette(ctx)
        const up = {
            x: ctx.from.x, y: ctx.from.y
        }
        ctx.shake(4,
            160)
        await Promise.all([
            shock(ctx,
                up,
                220 * k,
                620),
            dustBurst(ctx.layer,
                up,
                {
                    count: 420, color, speed: [260,
                        640], angle: [-Math.PI * .62,
                        -Math.PI * .38], life: [240,
                        480], size: [6,
                        2], alpha: 1, flow: 40, spread: 44, additive: true
                }),
            sleep(120).then(() => ctx.onBeat?.())
        ])
    })
/** Tăng Lực: điện chờ trên vũ khí; ctx.amount > 0 */
registerVfx("jayceChargeReady",
    async (ctx) => {
        await arcs(ctx,
            ctx.from,
            180,
            .5)
        ctx.onBeat?.()
    })
