// VFX Sylas: xích cổ thạch xanh tím. Thân xích là mảnh sắc `blade` xếp dọc đường bay bọc bụi ma thuật, không nét vẽ hình học.
import {
    bloom, dustBurst, dustStream, mist
} from "./fx_dust"
import {
    along, angleOf, beatOnce, blast, flight, kOf, mixPt, pointsOf
} from "./fx_flow"
import {
    ease, rand, sleep, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const PETRI = 0x6f8cff
const VIOLET = 0xa77bff
const STEEL = 0xe6ecff
const DEEP = 0x35319e
const palette = (ctx: VfxCtx) => [ctx.color,
    ctx.color2 ?? VIOLET,
    STEEL,
    PETRI]

/** Một sợi xích quất từ a tới b: đầu xích bay, thân xích đọng lại rồi vỡ thành bụi */
async function whip(ctx: VfxCtx, a: Pt, b: Pt, ms: number, width: number, arrive: () => void) {
    const color = palette(ctx)
    const dir = angleOf(a,
        b)
    const len = Math.hypot(b.x - a.x,
        b.y - a.y)
    await flight(ctx,
        a,
        b,
        {
            ms, width: width * 1.5, color: [ctx.color,
                DEEP,
                VIOLET,
                STEEL], perSec: 3400, blade: true, additive: false, size: [10,
                2], easing: ease.out,
            arrive() {
                arrive()
                void along(ctx,
                    a,
                    b,
                    Math.round(len / 26),
                    {
                        count: 26, color: [ctx.color,
                            DEEP,
                            VIOLET], blade: true, speed: [8,
                            60], angle: [dir - .25,
                            dir + .25], life: [320,
                            620], size: [30,
                            16], alpha: 1, drag: 3, additive: false
                    },
                    10)
                void along(ctx,
                    a,
                    b,
                    Math.round(len / 18),
                    {
                        count: 60, color, speed: [10,
                            110], life: [300,
                            640], size: [8,
                            2], alpha: .95, flow: 40, drag: 2
                    },
                    10)
            }
        })
}
const hitSparks = (ctx: VfxCtx, at: Pt, n: number) => {
    const color = palette(ctx)
    return Promise.all([
        blast(ctx,
            at,
            color,
            170 * kOf(ctx),
            Math.round(n)),
        dustBurst(ctx.layer,
            at,
            {
                count: Math.round(n * .3), color: [STEEL,
                    ctx.color], blade: true, speed: [220,
                    620], life: [160,
                    340], size: [20,
                    9], alpha: 1, drag: 1.5, spread: 12
            }),
        mist(ctx.layer,
            at,
            {
                color: [DEEP,
                    ctx.color], size: 150 * kOf(ctx), alpha: .34
            })
    ])
}

/** Đánh thường: quất xích ngắn */
registerVfx("sylasChainLash",
    async (ctx) => {
        const k = kOf(ctx), beat = beatOnce(ctx)
        await Promise.all(pointsOf(ctx).map((to) => whip(ctx,
            ctx.from,
            to,
            200,
            20 * k,
            beat)))
    })
registerVfx("sylasChainHit",
    async (ctx) => { await hitSparks(ctx,
        ctx.from,
        360 * ctx.intensity) })
/** Xiềng Nổ: xích quanh mục tiêu vỡ tung, cùng nhịp đòn đánh */
registerVfx("sylasBurst",
    async (ctx) => {
        const color = palette(ctx)
        ctx.shake(5,
            140)
        await Promise.all([
            hitSparks(ctx,
                ctx.from,
                620),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 340, color, speed: [260,
                        760], life: [220,
                        520], size: [6,
                        2], alpha: 1, flow: 90, drag: 1.2, spread: 34
                })
        ])
    })
/** Niệm: xích xoáy quanh tay */
registerVfx("sylasChainCharge",
    async (ctx) => {
        const color = palette(ctx), k = kOf(ctx)
        let a = 0
        const at = () => ({
            x: ctx.from.x + Math.cos(a) * 66 * k, y: ctx.from.y + Math.sin(a) * 66 * k
        })
        const spin = tween(240,
            (t) => { a = t * Math.PI * 4 },
            ease.linear,
            ctx.layer)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                180 * k,
                320),
            dustStream(ctx.layer,
                at,
                240,
                1500,
                {
                    color, speed: [10,
                        60], life: [180,
                        380], size: [7,
                        2], alpha: 1, flow: 40
                }),
            spin
        ])
        ctx.onBeat?.()
    })
/** Q Roi Xích: sợi xích dày hơn, trúng là nổ */
registerVfx("sylasLash",
    async (ctx) => {
        const k = kOf(ctx), beat = beatOnce(ctx)
        await Promise.all(pointsOf(ctx).map((to) => whip(ctx,
            ctx.from,
            to,
            220,
            30 * k,
            beat)))
    })
registerVfx("sylasLashHit",
    async (ctx) => {
        ctx.shake(5,
            150)
        await hitSparks(ctx,
            ctx.from,
            560 * ctx.intensity)
    })
/** E Thợ Săn Vua: xích kéo Sylas lao tới, trúng thì sinh lực chảy ngược về */
registerVfx("sylasKingslayer",
    async (ctx) => {
        const k = kOf(ctx), beat = beatOnce(ctx)
        await Promise.all(pointsOf(ctx).map((to) => whip(ctx,
            ctx.from,
            to,
            240,
            34 * k,
            () => {
                beat()
                void flight(ctx,
                    to,
                    ctx.from,
                    {
                        ms: 300, width: 26, color: [0xb9ffd8,
                            0x6fe0c0,
                            STEEL], perSec: 1300, size: [7,
                            2]
                    })
            })))
    })
registerVfx("sylasDrainHit",
    async (ctx) => {
        ctx.shake(6,
            160)
        await hitSparks(ctx,
            ctx.from,
            620)
    })
/** R Đoạt Chiêu: hai sợi xích quấn lấy địch */
registerVfx("sylasHijack",
    async (ctx) => {
        const k = kOf(ctx), beat = beatOnce(ctx)
        await Promise.all(pointsOf(ctx).flatMap((to) => [
            whip(ctx,
                {
                    x: ctx.from.x - 34,
                    y: ctx.from.y - 20
                },
                to,
                260,
                30 * k,
                beat),
            whip(ctx,
                {
                    x: ctx.from.x + 34,
                    y: ctx.from.y - 20
                },
                to,
                260,
                30 * k,
                beat)
        ]))
    })
registerVfx("sylasHijackHit",
    async (ctx) => {
        ctx.shake(8,
            220)
        await hitSparks(ctx,
            ctx.from,
            760)
    })
/** Tia sáng màu nạn nhân rút khỏi địch rồi bay vào lá trên tay: ctx.color là màu chiêu bị đoạt */
registerVfx("sylasHijackFlight",
    async (ctx) => {
        const to = ctx.to[0] ?? ctx.from
        const color = [ctx.color,
            ctx.color2 ?? ctx.color,
            0xffffff,
            VIOLET]
        await Promise.all([
            blast(ctx,
                ctx.from,
                color,
                230,
                680,
                {
                    additive: true
                }),
            flight(ctx,
                ctx.from,
                to,
                {
                    ms: 460, width: 34, color, perSec: 2400, arc: 70, blade: true, arrive: () => ctx.onBeat?.()
                })
        ])
    })
/** Nạp 1 Xiềng Nổ: mắt xích nhỏ bám quanh Sylas, ctx.amount = số tầng */
registerVfx("sylasShackleGain",
    async (ctx) => {
        const color = palette(ctx), n = Math.max(1,
            ctx.amount ?? 1)
        await Promise.all(Array.from({
            length: n
        },
        async (_, i) => {
            await sleep(i * 60)
            const a = rand(0,
                    Math.PI * 2), p = mixPt(ctx.from,
                    {
                        x: ctx.from.x + Math.cos(a) * 90, y: ctx.from.y + Math.sin(a) * 90
                    },
                    1)
            await dustBurst(ctx.layer,
                p,
                {
                    count: 240, color, blade: true, speed: [60,
                        260], life: [320,
                        560], size: [22,
                        10], alpha: 1, drag: 2.4, spread: 14
                })
        }))
    })
