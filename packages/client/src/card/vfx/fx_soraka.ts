// VFX riêng của Soraka: bụi sao mịn, sương vàng và tím, quầng sáng mềm. Đánh thường, Cứu Rỗi, Sao Băng (Q), Truyền Sinh Lực (E), Điều Ước (R).
// Không vẽ nét, vòng hay hình khối: mọi hình dáng do hàng nghìn hạt bụi trôi theo luồng tạo nên (xem fx_dust.ts).
// Mọi hiệu ứng chỉ dựa vào VfxCtx: đạn gọi ctx.onBeat đúng lúc chạm, phần còn lại nằm trong ctx.layer và tan theo layer.
import type {
    Sprite
} from "pixi.js"
import {
    bloom, dustBurst, dustStream, mist
} from "./fx_dust"
import {
    ease, lerp, makeSprite, rand, sleep, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const TAU = Math.PI * 2
const VIOLET = 0xb48cff
const PEARL = 0xfff6e0
const WHITE = 0xffffff
const points = (ctx: VfxCtx) => ctx.to.length ? ctx.to : [ctx.from]
/** Tỉ lệ khoảng cách: thẻ tướng lớn nên VFX Soraka toả rộng hơn mức chung; cỡ hạt bụi giữ nguyên để luôn mịn */
const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity) * 1.55
/** Bảng màu bụi: vàng ánh sao và tím thiên thể, hạt lệch màu tự nhiên */
const tones = (ctx: VfxCtx) => {
    const c = ctx.color, c2 = ctx.color2 ?? VIOLET
    return {
        c, c2, gold: [c,
            0xffc850,
            0xffe6a0], cosmic: [c2,
            0xd9c7ff,
            0x8d6be8]
    }
}
const drop = (s: Sprite) => { if (!s.destroyed) s.destroy() }

/** ctx.onBeat đúng một lần dù nhiều mục tiêu, không gọi khi layer đã huỷ */
function beatOnce(ctx: VfxCtx) {
    let fired = false
    return () => {
        if (fired || ctx.layer.destroyed) return
        fired = true
        ctx.onBeat?.()
    }
}

/** Điểm trên cung từ a tới b, võng lên cao h */
const bow = (a: Pt, b: Pt, t: number, h: number): Pt => ({
    x: lerp(a.x,
        b.x,
        t), y: lerp(a.y,
        b.y,
        t) - Math.sin(t * Math.PI) * h
})

/** Khối sáng mềm bay theo `path`, đuôi là bụi và sương. `arrive` resolve đúng lúc chạm, `tails` khi hạt cuối tan */
function comet(ctx: VfxCtx, path: (t: number) => Pt, ms: number, easing: (t: number) => number, size: number, rate: number) {
    const {
        c, c2, gold, cosmic
    } = tones(ctx)
    const start = path(0)
    const halo = makeSprite(ctx.layer,
        "glow",
        start.x,
        start.y,
        c2,
        size * 1.5)
    const body = makeSprite(ctx.layer,
        "glow",
        start.x,
        start.y,
        c,
        size * .85)
    const core = makeSprite(ctx.layer,
        "glow",
        start.x,
        start.y,
        WHITE,
        size * .36)
    let prev = start, p = start
    // rải đều giữa hai khung hình để đuôi liền, không thành từng cụm
    const trail = () => ({
        x: lerp(prev.x,
            p.x,
            Math.random()), y: lerp(prev.y,
            p.y,
            Math.random())
    })
    const tails = Promise.all([
        dustStream(ctx.layer,
            trail,
            ms,
            rate,
            {
                color: gold, speed: [2,
                    34], life: [620,
                    1400], size: [4,
                    1.2], spread: size * .2, flow: 40, drag: 2, alpha: .78
            }),
        dustStream(ctx.layer,
            trail,
            ms,
            rate * .55,
            {
                color: cosmic, speed: [2,
                    30], life: [700,
                    1500], size: [3.5,
                    1.2], spread: size * .3, flow: 52, drag: 2, alpha: .72
            }),
        dustStream(ctx.layer,
            trail,
            ms,
            12,
            {
                puff: true, color: cosmic, speed: [2,
                    18], life: [280,
                    520], size: [size * .6,
                    size], spread: size * .1, flow: 18, drag: 1.4, alpha: .14
            })
    ])
    const arrive = tween(ms,
        (t) => {
            prev = p
            p = path(t)
            for (const s of [halo,
                body,
                core]) s.position.set(p.x,
                p.y)
        },
        easing,
        ctx.layer).then(() => [halo,
        body,
        core].forEach(drop))
    return {
        arrive, tails
    }
}

/** Bụi xoáy thành dải thiên hà quanh `at`, bán kính đi từ r0 tới r1; hạt sống ngắn nên dừng gọn khi hết ms */
function swirl(ctx: VfxCtx, at: Pt, ms: number, r0: number, r1: number, turns: number, rate: number, color: number[]) {
    let t = 0
    void tween(ms,
        (v) => { t = v },
        ease.linear,
        ctx.layer)
    return dustStream(ctx.layer,
        () => {
            const arm = Math.floor(rand(0,
                3)) / 3 * TAU
            const a = arm + t * turns * TAU + rand(-.3,
                .3)
            const r = lerp(r0,
                r1,
                t) * rand(.82,
                1.18)
            return {
                x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r * .84
            }
        },
        ms,
        rate,
        {
            color, speed: [0,
                18], life: [170,
                420], size: [3.5,
                1], flow: 22, drag: 2, alpha: .7
        })
}

/** Nổ ánh sao: quầng sáng, sương vàng tím và bụi mịn văng ra */
function starBurst(ctx: VfxCtx, at: Pt, o: { size: number; count: number; speed: number; gravity?: number; ms?: number }) {
    const {
        c, gold, cosmic
    } = tones(ctx)
    return Promise.all([
        bloom(ctx.layer,
            at,
            c,
            o.size * .9,
            o.ms ?? 420),
        bloom(ctx.layer,
            at,
            WHITE,
            o.size * .3,
            180),
        mist(ctx.layer,
            at,
            {
                color: gold, size: o.size * .5, count: 5, alpha: .2
            }),
        mist(ctx.layer,
            at,
            {
                color: cosmic, size: o.size * .6, count: 4, alpha: .2
            }),
        dustBurst(ctx.layer,
            at,
            {
                count: o.count, color: gold, speed: [o.speed * .12,
                    o.speed], life: [420,
                    1040], size: [4,
                    1],
                spread: o.size * .22, flow: 70, drag: 2.2, gravity: o.gravity, alpha: .55
            }),
        dustBurst(ctx.layer,
            at,
            {
                count: Math.round(o.count * .55), color: cosmic, speed: [o.speed * .1,
                    o.speed * .8], life: [480,
                    1160], size: [3.5,
                    1],
                spread: o.size * .24, flow: 80, drag: 2.2, gravity: o.gravity, alpha: .55
            })
    ])
}

/** Bụi sáng bay lên từ thân lá sau khi được hồi */
const riseDust = (ctx: VfxCtx, at: Pt, ms: number, rate: number, k: number, color: number[]) => dustStream(ctx.layer,
    () => ({
        x: at.x + rand(-48,
            48) * k, y: at.y + rand(-44,
            48) * k
    }),
    ms,
    rate,
    {
        color, speed: [20,
            100], angle: [-Math.PI * .62,
            -Math.PI * .38], gravity: -70, life: [560,
            1240], size: [4,
            1], flow: 52, drag: 1, alpha: .6
    })

/** Đánh thường: hạt sao mềm bay vòng tới mục tiêu */
registerVfx("sorakaStarBolt",
    async (ctx) => {
        const k = kOf(ctx)
        const land = beatOnce(ctx)
        await Promise.all(points(ctx).map(async (to) => {
            const {
                arrive, tails
            } = comet(ctx,
                t => bow(ctx.from,
                    to,
                    t,
                    64 * k),
                420,
                ease.linear,
                30 * k,
                800)
            await arrive
            land()
            await tails
        }))
    })

/** Trúng đánh thường: bụi sao toả nhỏ */
registerVfx("sorakaStarBoltHit",
    async (ctx) => {
        const k = kOf(ctx)
        await starBurst(ctx,
            ctx.from,
            {
                size: 130 * k, count: 360, speed: 280 * k
            })
    })

/** Nội tại: dải bụi từ những đồng minh được hồi (`to`) trôi về Soraka (`from`), tụ thành Thánh Quang */
registerVfx("sorakaMoteGain",
    async (ctx) => {
        const k = kOf(ctx)
        const {
            c, gold, cosmic
        } = tones(ctx)
        const land = beatOnce(ctx)
        const at = ctx.from
        const sources = ctx.to.length ? ctx.to : Array.from({
            length: 5
        },
        (_, i) => ({
            x: at.x + Math.cos(i / 5 * TAU) * 130 * k, y: at.y + Math.sin(i / 5 * TAU) * 110 * k
        }))
        const flights = sources.map((source, i) => comet(ctx,
            t => bow(source,
                at,
                t,
                (i % 2 ? 70 : -40) * k),
            680,
            ease.inOut,
            14 * k,
            420))
        await Promise.all(flights.map(f => f.arrive))
        if (ctx.layer.destroyed) return
        land()
        await Promise.all([
            ...flights.map(f => f.tails),
            bloom(ctx.layer,
                at,
                c,
                190 * k,
                460),
            bloom(ctx.layer,
                at,
                WHITE,
                70 * k,
                240),
            swirl(ctx,
                at,
                420,
                92 * k,
                12 * k,
                1,
                1500,
                gold),
            mist(ctx.layer,
                at,
                {
                    color: cosmic, size: 110 * k, count: 4, alpha: .2
                }),
            riseDust(ctx,
                at,
                620,
                340,
                k,
                gold)
        ])
    })

/** Thánh Quang kích hoạt: đồng minh nhiều Máu hơn mục tiêu, bụi sao xoáy bung ra quanh người trúng đòn */
registerVfx("sorakaBonusStrike",
    async (ctx) => {
        const k = kOf(ctx)
        const {
            gold, cosmic
        } = tones(ctx)
        ctx.shake(5,
            180)
        await Promise.all([
            starBurst(ctx,
                ctx.from,
                {
                    size: 170 * k, count: 600, speed: 420 * k
                }),
            swirl(ctx,
                ctx.from,
                480,
                16 * k,
                128 * k,
                .8,
                2000,
                gold),
            swirl(ctx,
                ctx.from,
                480,
                10 * k,
                96 * k,
                -.7,
                1200,
                cosmic)
        ])
    })

/** Q: sáng lên ở Soraka và trên mục tiêu, rồi sao chổi bụi sa chéo xuống. Chạm là onBeat */
registerVfx("sorakaStarfall",
    async (ctx) => {
        const k = kOf(ctx)
        const {
            c, gold
        } = tones(ctx)
        const land = beatOnce(ctx)
        const WIND = 230, FALL = 560
        void bloom(ctx.layer,
            ctx.from,
            c,
            190 * k,
            380)
        void riseDust(ctx,
            ctx.from,
            360,
            300,
            k,
            gold)
        await Promise.all(points(ctx).map(async (to) => {
            const side = ctx.from.x <= to.x ? -1 : 1
            const sky = {
                x: to.x + side * 420, y: Math.max(-40,
                    to.y - 620 * k)
            }
            const mark = makeSprite(ctx.layer,
                "glow",
                to.x,
                to.y,
                c,
                110 * k)
            mark.alpha = 0
            void tween(WIND + FALL,
                (t) => {
                    mark.alpha = t * .75
                    mark.width = lerp(110,
                        170,
                        t) * k
                    mark.height = mark.width
                },
                ease.in,
                ctx.layer).then(() => drop(mark))
            await sleep(WIND)
            if (ctx.layer.destroyed) return
            const {
                arrive, tails
            } = comet(ctx,
                t => ({
                    x: lerp(sky.x,
                        to.x,
                        t), y: lerp(sky.y,
                        to.y,
                        t)
                }),
                FALL,
                t => Math.pow(t,
                    1.5),
                58 * k,
                2800)
            await arrive
            land()
            await tails
        }))
    })

/** Q trúng: sao vỡ thành đám bụi sáng, văng và rơi xuống */
registerVfx("sorakaStarImpact",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(8,
            260)
        await starBurst(ctx,
            ctx.from,
            {
                size: 200 * k, count: Math.round(900 * ctx.intensity), speed: 560 * k, gravity: 170, ms: 520
            })
    })

/** Hồi Máu của Soraka: quầng sáng ấm và bụi vàng bay lên khắp thân lá */
registerVfx("sorakaHeal",
    async (ctx) => {
        const k = kOf(ctx)
        const {
            c, gold, cosmic
        } = tones(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                c,
                180 * k,
                460),
            mist(ctx.layer,
                ctx.from,
                {
                    color: gold, size: 100 * k, count: 5, alpha: .2, gravity: -40
                }),
            riseDust(ctx,
                ctx.from,
                680,
                520,
                k,
                gold),
            riseDust(ctx,
                ctx.from,
                520,
                220,
                k,
                cosmic)
        ])
    })

/** E: bụi xoáy tụ vào người tung chiêu trước khi sợi sinh lực bay; chỉ mở màn nên kết thúc gọn, đúng 340ms */
registerVfx("sorakaQuickGather",
    async (ctx) => {
        const k = kOf(ctx)
        const {
            c, gold, cosmic
        } = tones(ctx)
        void bloom(ctx.layer,
            ctx.from,
            c,
            170 * k,
            340)
        void swirl(ctx,
            ctx.from,
            340,
            100 * k,
            14 * k,
            1.1,
            2000,
            gold)
        void swirl(ctx,
            ctx.from,
            340,
            80 * k,
            10 * k,
            -.9,
            1000,
            cosmic)
        await tween(340,
            () => {},
            ease.linear,
            ctx.layer)
    })

/** E: hai dòng bụi xoắn chảy từ Soraka sang đồng minh. Tới nơi là onBeat, hai đầu cùng sáng */
registerVfx("sorakaLifeThread",
    async (ctx) => {
        const k = kOf(ctx)
        const {
            c2, gold, cosmic
        } = tones(ctx)
        const land = beatOnce(ctx)
        const MS = 460, LINGER = 260
        await Promise.all(points(ctx).map(async (to) => {
            const dx = to.x - ctx.from.x, dy = to.y - ctx.from.y
            const len = Math.hypot(dx,
                dy) || 1
            const nx = -dy / len, ny = dx / len
            const at = (u: number, phase: number): Pt => {
                const wave = Math.sin(u * TAU * 1.5 + phase) * 15 * k * Math.sin(u * Math.PI)
                return {
                    x: ctx.from.x + dx * u + nx * wave, y: ctx.from.y + dy * u + ny * wave
                }
            }
            let reach = 0
            const flowing = (rate: number, color: number[], phase: number) => dustStream(ctx.layer,
                () => at(Math.random() * reach,
                    phase),
                MS + LINGER,
                rate,
                {
                    color, speed: [0,
                        16], life: [220,
                        500], size: [3.5,
                        1], spread: 5 * k, flow: 24, drag: 2, alpha: .72
                })
            const strands = [flowing(3000,
                gold,
                0),
            flowing(2000,
                cosmic,
                Math.PI)]
            void tween(MS,
                (t) => { reach = t },
                ease.linear,
                ctx.layer)
            const {
                arrive, tails
            } = comet(ctx,
                u => at(u,
                    0),
                MS,
                ease.linear,
                26 * k,
                300)
            await arrive
            if (ctx.layer.destroyed) return
            land()
            const out = Math.atan2(dy,
                dx)
            await Promise.all([
                ...strands,
                tails,
                bloom(ctx.layer,
                    ctx.from,
                    c2,
                    170 * k,
                    380),
                mist(ctx.layer,
                    ctx.from,
                    {
                        color: cosmic, size: 96 * k, count: 4, alpha: .2
                    }),
                dustBurst(ctx.layer,
                    ctx.from,
                    {
                        count: 340, color: cosmic, speed: [60,
                            320 * k], angle: [out - .6,
                            out + .6], life: [320,
                            760], size: [3.5,
                            1], spread: 26 * k, flow: 40, drag: 2.4, alpha: .6
                    })
            ])
        }))
    })

/** E trúng đồng minh: sinh lực nở ra, bụi vàng bay lên quanh lá */
registerVfx("sorakaLifeHeal",
    async (ctx) => {
        const k = kOf(ctx)
        const {
            gold, cosmic
        } = tones(ctx)
        await Promise.all([
            starBurst(ctx,
                ctx.from,
                {
                    size: 150 * k, count: 380, speed: 240 * k, gravity: -60
                }),
            riseDust(ctx,
                ctx.from,
                720,
                560,
                k,
                gold),
            riseDust(ctx,
                ctx.from,
                520,
                220,
                k,
                cosmic)
        ])
    })

/** R: luồng bụi từ Soraka vút lên, ánh sáng đổ xuống từng đồng minh. Kết thúc đúng lúc chạm để hồi Máu ra ngay. Không có `to` thì phủ cả hàng của Soraka */
registerVfx("sorakaWish",
    async (ctx) => {
        const k = kOf(ctx)
        const {
            c, gold, cosmic
        } = tones(ctx)
        const land = beatOnce(ctx)
        const at = ctx.from
        const RISE = 400, FALL = 680
        const spots = ctx.to.length ? ctx.to : [-2,
            -1,
            0,
            1,
            2].map(i => ({
            x: at.x + i * 170, y: at.y
        }))
        const top = Math.max(-30,
            Math.min(...spots.map(p => p.y)) - 340)
        void bloom(ctx.layer,
            at,
            c,
            280 * k,
            520)
        const up = comet(ctx,
            t => ({
                x: at.x, y: lerp(at.y,
                    top,
                    t)
            }),
            RISE,
            ease.out,
            24 * k,
            1500)
        await up.arrive
        if (ctx.layer.destroyed) return
        const beams = spots.map((spot) => {
            const halo = makeSprite(ctx.layer,
                "glow",
                spot.x,
                top,
                c,
                120)
            const core = makeSprite(ctx.layer,
                "glow",
                spot.x,
                top,
                WHITE,
                38)
            const shaft = makeSprite(ctx.layer,
                "glow",
                spot.x,
                top,
                c,
                150)
            shaft.alpha = .6
            let front = top
            const wide = 34 * k
            const fall = (rate: number, color: number[], scatter: number) => dustStream(ctx.layer,
                () => ({
                    x: spot.x + (Math.random() + Math.random() - 1) * wide * scatter, y: lerp(top,
                        front,
                        Math.random())
                }),
                FALL,
                rate,
                {
                    color, speed: [200,
                        420], angle: [Math.PI * .46,
                        Math.PI * .54], life: [300,
                        640], size: [4,
                        1.2], flow: 26, drag: .4, alpha: .75
                })
            void fall(3200,
                gold,
                .75)
            void fall(900,
                cosmic,
                1.1)
            return {
                spot, halo, core, shaft, set(y: number) {
                    front = y
                    this.shaft.position.set(spot.x,
                        (top + y) / 2)
                    this.shaft.height = (y - top) * 1.7 + 40
                    this.halo.position.set(spot.x,
                        y)
                    this.core.position.set(spot.x,
                        y)
                }
            }
        })
        await tween(FALL,
            (t) => {
                for (const beam of beams) beam.set(lerp(top,
                    beam.spot.y,
                    t))
            },
            t => Math.pow(t,
                1.3),
            ctx.layer)
        land()
        for (const beam of beams) {
            drop(beam.halo)
            drop(beam.core)
            drop(beam.shaft)
        }
    })

/** Cột sáng mềm đọng lại trên đồng minh Máu thấp, tan dần, không có mép */
async function radiantShaft(ctx: VfxCtx, at: Pt) {
    const shaft = makeSprite(ctx.layer,
        "glow",
        at.x,
        at.y - 120,
        WHITE,
        190)
    shaft.height = 620
    await tween(900,
        (t) => { shaft.alpha = .85 * (1 - t) * (1 - t) },
        ease.linear,
        ctx.layer)
    drop(shaft)
}

/** R trúng một tướng: bụi ánh sáng trút nốt xuống rồi bừng lên. `bright` là bản hồi gấp đôi của đồng minh Máu thấp */
async function wishBloom(ctx: VfxCtx, bright: boolean) {
    const k = 1.55
    const {
        gold, cosmic
    } = tones(ctx)
    const at = ctx.from
    const wide = (bright ? 30 : 22) * k
    const brilliant = [WHITE,
        PEARL,
        0xfff2c0]
    const fall = dustStream(ctx.layer,
        () => ({
            x: at.x + (Math.random() + Math.random() - 1) * wide, y: at.y - rand(0,
                300)
        }),
        bright ? 620 : 420,
        bright ? 2000 : 1100,
        {
            color: bright ? brilliant : gold, speed: [160,
                340], angle: [Math.PI * .46,
                Math.PI * .54], life: [220,
                480], size: [3.5,
                1], flow: 26, drag: .4, alpha: .75
        })
    await Promise.all([
        fall,
        starBurst(ctx,
            at,
            {
                size: (bright ? 210 : 130) * k, count: bright ? 800 : 360, speed: (bright ? 300 : 180) * k, gravity: -70, ms: bright ? 760 : 460
            }),
        riseDust(ctx,
            at,
            bright ? 1050 : 660,
            bright ? 800 : 340,
            k,
            bright ? brilliant : gold),
        riseDust(ctx,
            at,
            bright ? 800 : 480,
            bright ? 300 : 140,
            k,
            cosmic),
        bright ? bloom(ctx.layer,
            at,
            WHITE,
            170 * k,
            620) : Promise.resolve(),
        bright ? bloom(ctx.layer,
            at,
            tones(ctx).c,
            300 * k,
            760) : Promise.resolve(),
        bright ? radiantShaft(ctx,
            at) : Promise.resolve(),
        bright ? swirl(ctx,
            at,
            760,
            40 * k,
            96 * k,
            1,
            1800,
            brilliant) : Promise.resolve()
    ])
}

registerVfx("sorakaWishHeal",
    ctx => wishBloom(ctx,
        false))

registerVfx("sorakaWishHealBright",
    ctx => wishBloom(ctx,
        true))
