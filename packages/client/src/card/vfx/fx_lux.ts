// VFX riêng của Lux, bám League of Legends: ánh sáng trắng vàng, viền lăng kính hồng và xanh nhạt, vệt sáng sắc, hạt sáng mịn. Không dùng nét vẽ hình học.
//   Khiên giống Prismatic Barrier, E là cầu sáng Light Binding với dải sáng trói, R là Final Spark, dấu trúng là Illumination.
// Mỗi hiệu ứng chỉ dựa vào VfxCtx và tự dọn khi layer bị huỷ; trúng là báo ctx.onBeat, không chờ đuôi hạt tan.
import {
    Sprite, Texture
} from "pixi.js"
import {
    bloom, dustBurst, dustStream, mist, type DustOpts
} from "./fx_dust"
import {
    ease, lerp, makeSprite, rand, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const TAU = Math.PI * 2
const WHITE = 0xffffff
const PALE = 0xfff4c4
const GOLD = 0xffdc6e
const PINK = 0xff9fd6
const SKY = 0x9fdcff
const LILAC = 0xc8a8ff
const MANA = 0x2f8dff
/** Sáu màu cầu vồng dọc tia R, nhạt như ánh sáng qua lăng kính */
const SPECTRUM = [0xff6f9e,
    0xffae52,
    0xffe45c,
    0x7df2a0,
    0x5fd4ff,
    0xb48cff]
const PRISM = [WHITE,
    PALE,
    GOLD,
    PINK,
    SKY,
    LILAC]
const LIGHT = [WHITE,
    PALE,
    GOLD,
    GOLD]
/** Mana tối đa của quỹ đội: M chạm mốc này thì tia R to nhất */
const MANA_MAX = 200
/** Thời gian R giữ tia sau khi chạm, theo tỉ lệ M */
const SPARK_HOLD_MS = [260,
    760] as const
/** Khiên tụ xong sau chừng này, lúc đó mảnh sáng Q rời khỏi Lux */
export const LUX_PRISM_FORM_MS = 380

const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
/** Tỉ lệ M của R: 0 tới 1. Trận thật chưa truyền M thì lấy mức giữa */
const sparkOf = (ctx: VfxCtx) => Math.max(.08,
    Math.min(1,
        (ctx.amount ?? 110) / MANA_MAX))
/** Ánh Sáng làm đòn nặng dần: 0 bằng gốc, 200 gấp đôi */
const lightPower = (ctx: VfxCtx) => kOf(ctx) * (1 + Math.min(ctx.amount ?? 0,
    200) / 200)
const around = (at: Pt, r: number): Pt => {
    const a = rand(0,
            TAU), d = Math.sqrt(Math.random()) * r
    return {
        x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d
    }
}
const mixColor = (a: number, b: number, t: number) => {
    const ch = (s: number) => Math.round(lerp((a >> s) & 255,
        (b >> s) & 255,
        t))
    return (ch(16) << 16) | (ch(8) << 8) | ch(0)
}
const wait = (ctx: VfxCtx, ms: number) => tween(ms,
    () => {},
    ease.linear,
    ctx.layer)

/** Hạt sáng mịn, rất sáng */
const motes = (over: Partial<DustOpts> = {
}): DustOpts => ({
    color: PRISM, speed: [30,
        170], gravity: -24, drag: 2, flow: 46, life: [340,
        820], size: [5.5,
        1.6], alpha: 1, additive: false, ...over
})
/** Vệt sáng dài, mảnh, sắc: chất liệu chính của Lux */
const shaft = (over: Partial<DustOpts> = {
}): DustOpts => ({
    color: LIGHT, speed: [380,
        980], drag: 3.2, flow: 10, life: [170,
        340], size: [15,
        4], streak: 8, alpha: 1, ...over
})
/** Mảnh lăng kính cứng */
const shard = (over: Partial<DustOpts> = {
}): DustOpts => ({
    color: PRISM, speed: [160,
        560], drag: 3, flow: 26, life: [240,
        520], size: [46,
        12], blade: true, alpha: 1, additive: false, ...over
})

/** Quầng sáng bám đầu đạn, lõi trắng viền vàng */
function headGlow(ctx: VfxCtx, width: number) {
    const parts = [
        makeSprite(ctx.layer,
            "glow",
            ctx.from.x,
            ctx.from.y,
            GOLD,
            width * 4.6),
        makeSprite(ctx.layer,
            "glow",
            ctx.from.x,
            ctx.from.y,
            PALE,
            width * 2.6),
        makeSprite(ctx.layer,
            "glow",
            ctx.from.x,
            ctx.from.y,
            WHITE,
            width * 1.5)
    ]
    parts[0].alpha = .6
    return {
        move(p: Pt) {
            for (const s of parts) {
                if (s.destroyed) continue
                s.x = p.x
                s.y = p.y
            }
        },
        fade() {
            for (const s of parts) if (!s.destroyed) s.alpha = 0
        }
    }
}

/** Nổ sáng tại chỗ: quầng trắng vàng, vệt sáng toả, mảnh lăng kính, hạt mịn */
function flash(ctx: VfxCtx, at: Pt, power: number, count: number) {
    return Promise.all([
        bloom(ctx.layer,
            at,
            GOLD,
            300 * power,
            340),
        bloom(ctx.layer,
            at,
            WHITE,
            170 * power,
            230),
        dustBurst(ctx.layer,
            at,
            {
                ...shaft({
                    speed: [420 * power,
                        1050 * power], spread: 16
                }), count: Math.round(count * .22)
            }),
        dustBurst(ctx.layer,
            at,
            {
                ...shard({
                    speed: [170 * power,
                        560 * power], spread: 18
                }), count: Math.round(count * .16)
            }),
        dustBurst(ctx.layer,
            at,
            {
                ...motes({
                    speed: [60 * power,
                        300 * power], spread: 26
                }), count
            })
    ])
}

/** Đường cong nhẹ của một sợi mana từ quỹ về Lux */
function curve(a: Pt, b: Pt, t: number, side: number): Pt {
    const dx = b.x - a.x, dy = b.y - a.y
    const len = Math.hypot(dx,
        dy) || 1
    const swing = Math.sin(t * Math.PI) * side * Math.min(190,
        len * .34)
    return {
        x: lerp(a.x,
            b.x,
            t) - dy / len * swing, y: lerp(a.y,
            b.y,
            t) + dx / len * swing
    }
}

/** Nội tại Chiếu Sáng: mana xanh rời nguồn (to[0], không có thì quanh Lux), đổi dần sang trắng rồi chui vào Lux. ctx.amount là số mana đã trả */
registerVfx("luxLightGain",
    async (ctx) => {
        const home = ctx.from
        const paid = Math.max(10,
            Math.min(MANA_MAX,
                ctx.amount ?? 40))
        const load = .75 + paid / MANA_MAX * 1.1
        const count = Math.round(8 + paid / 28)
        const source = ctx.to[0]
        let beat = false
        const arrive = () => {
            if (beat) return
            beat = true
            ctx.onBeat?.()
        }
        await Promise.all([
            ...Array.from({
                length: count
            },
            async (_, i) => {
                const fan = i / count * TAU
                const start = source ? {
                    x: source.x + rand(-120,
                        120), y: source.y + rand(-14,
                        14)
                } : {
                    x: home.x + Math.cos(fan) * 170, y: home.y + Math.sin(fan) * 150
                }
                const side = (i % 2 ? 1 : -1) * rand(.2,
                    .9)
                const ms = 500 + i * 22
                let p = {
                    ...start
                }
                // emit đọc màu mỗi hạt nên đổi màu tại đây làm hạt sau trắng dần, không có bước nhảy
                const body: DustOpts = {
                    color: [MANA], speed: [6,
                        46], flow: 54, drag: 2.2, life: [190,
                        400], size: [11,
                        3], spread: 8, alpha: 1
                }
                const spark: DustOpts = {
                    ...body, size: [5,
                        1.4], life: [260,
                        560], speed: [10,
                        70], spread: 15
                }
                await Promise.all([
                    dustStream(ctx.layer,
                        () => p,
                        ms,
                        330 * load,
                        body),
                    dustStream(ctx.layer,
                        () => p,
                        ms,
                        240 * load,
                        spark),
                    tween(ms,
                        (t) => {
                            p = curve(start,
                                home,
                                t,
                                side)
                            const white = Math.min(1,
                                Math.max(0,
                                    (t - .2) / .5))
                            body.color = [mixColor(MANA,
                                WHITE,
                                white)]
                            spark.color = [mixColor(0x7cc4ff,
                                WHITE,
                                white)]
                        },
                        ease.in,
                        ctx.layer)
                ])
                arrive()
            }),
            wait(ctx,
                500).then(() => Promise.all([
                bloom(ctx.layer,
                    home,
                    GOLD,
                    230 + paid,
                    420),
                bloom(ctx.layer,
                    home,
                    WHITE,
                    130 + paid * .6,
                    300),
                dustBurst(ctx.layer,
                    home,
                    {
                        ...motes({
                            color: LIGHT, spread: 44, gravity: -70
                        }), count: Math.round(70 + paid * 1.1)
                    })
            ]))
        ])
    })

/** Dấu Chiếu Sáng trên địch: tia sao vàng bung ra, ctx.amount là số Ánh Sáng cộng vào đòn */
registerVfx("luxIlluminate",
    async (ctx) => {
        const power = Math.min(1.9,
            .8 + (ctx.amount ?? 40) / 170)
        const reach = 620 * power
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                GOLD,
                230 * power,
                320),
            ...Array.from({
                length: 16
            },
            (_, i) => {
                const dir = (i + rand(-.45,
                    .45)) / 16 * TAU
                const long = rand(.35,
                    1)
                return dustBurst(ctx.layer,
                    ctx.from,
                    {
                        ...shaft({
                            color: [GOLD,
                                PALE,
                                PINK,
                                SKY], angle: [dir - .1,
                                dir + .1], speed: [reach * long * .5,
                                reach * long], size: [10 * power,
                                3], streak: 6, spread: 12
                        }), count: 4
                    })
            }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...motes({
                        color: LIGHT, spread: 30
                    }), count: Math.round(70 * power)
                })
        ])
    })

/** Luật chết: Lux gục, nửa số Ánh Sáng tuôn khỏi người, bay lên và tan. ctx.amount là số mất */
registerVfx("luxLightShed",
    async (ctx) => {
        const lost = Math.min(1.8,
            .8 + (ctx.amount ?? 60) / 120)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                PALE,
                300 * lost,
                460),
            mist(ctx.layer,
                ctx.from,
                {
                    color: [PALE,
                        PINK,
                        SKY], size: 150 * lost, alpha: .3, count: 12, speed: [30,
                        120], gravity: -60
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...shaft({
                        angle: [-Math.PI * .95,
                            -Math.PI * .05], speed: [260,
                            760], life: [260,
                            520], gravity: -160, drag: 1.8, spread: 40
                    }), count: Math.round(60 * lost)
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...motes({
                        speed: [80,
                            420], gravity: -130, drag: 1.2, life: [700,
                            1500], size: [6,
                            1.4], spread: 50
                    }), count: Math.round(320 * lost)
                })
        ])
    })

/** Một điểm trên thân Khiên: đặc ở mép, thưa ở giữa, viền không đều nên không thành vòng */
const shellPt = (at: Pt, rx: number, ry: number): Pt => {
    const a = rand(0,
        TAU)
    const d = Math.pow(Math.random(),
        .14) * rand(.86,
        1.08)
    return {
        x: at.x + Math.cos(a) * rx * d, y: at.y + Math.sin(a) * ry * d
    }
}

/** Q, Khiên Lăng Kính: mảnh sáng hút về, đọng thành lớp vỏ óng vàng, hồng, xanh như Prismatic Barrier. Tụ xong báo nhịp để mảnh sáng rời đi */
registerVfx("luxPrism",
    async (ctx) => {
        const k = kOf(ctx)
        const rx = 92 * k, ry = 122 * k
        const at = ctx.from
        await Promise.all([
            bloom(ctx.layer,
                at,
                PALE,
                380 * k,
                760),
            ...Array.from({
                length: 14
            },
            (_, i) => {
                const a = i / 14 * TAU
                return dustBurst(ctx.layer,
                    {
                        x: at.x + Math.cos(a) * rx * 2, y: at.y + Math.sin(a) * ry * 1.8
                    },
                    {
                        ...shard({
                            angle: [a + Math.PI - .12,
                                a + Math.PI + .12], speed: [520,
                                700], drag: 2.6, life: [200,
                                330], size: [52,
                                16], spread: 16
                        }), count: 4
                    })
            }),
            mist(ctx.layer,
                at,
                {
                    color: [PALE,
                        PINK,
                        SKY], size: 170 * k, alpha: .26, count: 11, speed: [6,
                        30], life: [620,
                        980]
                }),
            dustStream(ctx.layer,
                () => shellPt(at,
                    rx,
                    ry),
                620,
                1500,
                {
                    color: [GOLD,
                        GOLD,
                        PINK,
                        SKY,
                        LILAC,
                        WHITE], speed: [3,
                        20], drag: 2.4, flow: 22, life: [260,
                        620], size: [9,
                        3], alpha: 1, additive: false
                }),
            dustStream(ctx.layer,
                () => shellPt(at,
                    rx,
                    ry),
                620,
                260,
                shard({
                    speed: [20,
                        70], life: [240,
                        460], size: [30,
                        8]
                })),
            wait(ctx,
                LUX_PRISM_FORM_MS).then(() => ctx.onBeat?.())
        ])
    })

/** Q trúng: lớp vỏ loé cùng lúc số Khiên hiện trên Lux */
registerVfx("luxPrismFlare",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                WHITE,
                300 * k,
                300),
            bloom(ctx.layer,
                ctx.from,
                PINK,
                420 * k,
                420),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...motes({
                        speed: [90,
                            330], spread: 80
                    }), count: 190
                })
        ])
    })

/** Khiên đỡ đòn: mảnh lăng kính văng ngược về phía kẻ đánh (to[0]) */
registerVfx("luxPrismBlock",
    async (ctx) => {
        const k = kOf(ctx)
        const foe = ctx.to[0]
        const dir = foe ? Math.atan2(foe.y - ctx.from.y,
            foe.x - ctx.from.x) : -Math.PI / 2
        const at = {
            x: ctx.from.x + Math.cos(dir) * 72 * k, y: ctx.from.y + Math.sin(dir) * 92 * k
        }
        ctx.shake(3,
            130)
        await Promise.all([
            bloom(ctx.layer,
                at,
                WHITE,
                230 * k,
                280),
            bloom(ctx.layer,
                at,
                SKY,
                340 * k,
                360),
            dustBurst(ctx.layer,
                at,
                {
                    ...shard({
                        angle: [dir - 1,
                            dir + 1], speed: [240,
                            720], spread: 18
                    }), count: 34
                }),
            dustBurst(ctx.layer,
                at,
                {
                    ...motes({
                        angle: [dir - 1.3,
                            dir + 1.3], speed: [90,
                            380], spread: 28
                    }), count: 170
                })
        ])
    })

/** Đầu đạn bay thẳng: vệt sáng kéo dài sau đầu, hạt cầu vồng rơi lại; chạm là báo nhịp */
async function fly(ctx: VfxCtx, to: Pt, ms: number, width: number, spectrum: number, trail: number) {
    const dir = Math.atan2(to.y - ctx.from.y,
        to.x - ctx.from.x)
    let p = {
        ...ctx.from
    }
    const glow = headGlow(ctx,
        width)
    const back = dir + Math.PI
    await Promise.all([
        dustStream(ctx.layer,
            () => around(p,
                width * .3),
            ms,
            1300,
            shaft({
                color: [GOLD,
                    GOLD,
                    PALE,
                    PINK,
                    SKY], angle: [back - .1,
                    back + .1], speed: [160,
                    520], life: [130,
                    280], size: [width * .4,
                    width * .12], streak: trail, drag: 2.4
            })),
        dustStream(ctx.layer,
            () => around(p,
                width * .6),
            ms,
            spectrum,
            motes({
                speed: [8,
                    60], life: [260,
                    560]
            })),
        dustStream(ctx.layer,
            () => around(p,
                width * .5),
            ms,
            900,
            {
                color: [WHITE,
                    PALE], speed: [4,
                    30], drag: 2.6, flow: 24, life: [110,
                    230], size: [width * .42,
                    width * .1], alpha: 1
            }),
        tween(ms,
            (t) => {
                p = {
                    x: lerp(ctx.from.x,
                        to.x,
                        t), y: lerp(ctx.from.y,
                        to.y,
                        t)
                }
                glow.move(p)
            },
            ease.in,
            ctx.layer).then(() => {
            glow.fade()
            ctx.onBeat?.()
        })
    ])
}

/** Q: mảnh sáng mảnh rất nhanh như đũa phép ném đi */
registerVfx("luxShard",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all(ctx.to.map(to => fly(ctx,
            to,
            230,
            20 * k,
            520,
            8)))
    })

/** Q trúng: lăng kính vỡ trên địch */
registerVfx("luxShardHit",
    async (ctx) => {
        ctx.shake(3,
            130)
        await flash(ctx,
            ctx.from,
            1.05 * lightPower(ctx),
            220)
    })

/** E: cầu sáng Light Binding, to và tròn hơn Q, đuôi vàng trắng */
registerVfx("luxBinding",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all(ctx.to.map(to => fly(ctx,
            to,
            400,
            34 * k,
            760,
            3.5)))
    })

/** E trúng: bùng sáng vàng, sát thương phép */
registerVfx("luxBindingHit",
    async (ctx) => {
        ctx.shake(4,
            150)
        await flash(ctx,
            ctx.from,
            1.2 * lightPower(ctx),
            260)
    })

/** E đủ Ánh Sáng: ba dải sáng vàng siết quanh lá tướng rồi giữ một lúc, cùng nhịp Choáng */
registerVfx("luxBindingStun",
    async (ctx) => {
        const k = kOf(ctx)
        const ms = 900
        const at = ctx.from
        let squeeze = 1.9
        let spin = 0
        const band = (height: number, tilt: number, phase: number) => () => {
            const a = spin * (height > 0 ? -1 : 1) + phase
            const r = 84 * k * squeeze
            const x = Math.cos(a) * r
            const y = Math.sin(a) * r * .3
            return {
                x: at.x + x + rand(-5,
                    5), y: at.y + height * k + y + x * tilt + rand(-5,
                    5)
            }
        }
        const rope: DustOpts = {
            color: [PALE,
                GOLD,
                GOLD,
                0xffc24a], speed: [2,
                16], drag: 3, flow: 12, life: [170,
                360], size: [10,
                3], alpha: 1, additive: false
        }
        const bands: [number, number, number][] = [[-58,
            .2,
            0],
        [4,
            -.16,
            2.1],
        [62,
            .13,
            4.2]]
        await Promise.all([
            bloom(ctx.layer,
                at,
                GOLD,
                300 * k,
                620),
            ...bands.flatMap(([height,
                tilt,
                phase]) => [0,
                Math.PI].map(offset => dustStream(ctx.layer,
                band(height,
                    tilt,
                    phase + offset),
                ms,
                1000,
                rope))),
            dustStream(ctx.layer,
                () => around(at,
                    96 * k),
                ms,
                280,
                motes({
                    color: LIGHT, speed: [10,
                        60], gravity: -60
                })),
            tween(ms,
                (t) => {
                    squeeze = 1 + .9 * Math.pow(1 - Math.min(1,
                        t * 3.4),
                    2)
                    spin = t * TAU * 1.5
                },
                ease.linear,
                ctx.layer)
        ])
    })

/** R mở màn: ánh sáng dồn về đầu trượng, sợi sáng mảnh báo trước đường tia như Final Spark. Tụ xong báo nhịp */
registerVfx("luxSparkCharge",
    async (ctx) => {
        const m = sparkOf(ctx)
        const ms = 460 + m * 340
        const at = ctx.from
        const to = ctx.to[0]
        const lineAt = () => {
            if (!to) return around(at,
                26)
            const t = Math.random()
            return {
                x: lerp(at.x,
                    to.x,
                    t) + rand(-2.5,
                    2.5), y: lerp(at.y,
                    to.y,
                    t) + rand(-2.5,
                    2.5)
            }
        }
        const dir = to ? Math.atan2(to.y - at.y,
            to.x - at.x) : -Math.PI / 2
        await Promise.all([
            bloom(ctx.layer,
                at,
                GOLD,
                240 + m * 340,
                ms),
            bloom(ctx.layer,
                at,
                WHITE,
                110 + m * 170,
                ms),
            ...Array.from({
                length: 18
            },
            (_, i) => {
                const a = (i + rand(-.4,
                    .4)) / 18 * TAU
                return dustStream(ctx.layer,
                    () => {
                        const r = rand(120,
                            250)
                        return {
                            x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r
                        }
                    },
                    ms * .8,
                    30 + m * 70,
                    {
                        color: PRISM, angle: [a + Math.PI - .16,
                            a + Math.PI + .16], speed: [260,
                            420], drag: .4, flow: 30, life: [240,
                            380], size: [6,
                            2], streak: 4, alpha: 1, additive: false
                    })
            }),
            dustStream(ctx.layer,
                lineAt,
                ms,
                1100,
                {
                    color: [WHITE,
                        PALE,
                        PINK,
                        SKY], speed: [2,
                        16], angle: [dir - .1,
                        dir + .1], drag: 3, flow: 6, life: [120,
                        260], size: [8,
                        2.4], alpha: 1
                }),
            wait(ctx,
                ms).then(() => ctx.onBeat?.())
        ])
    })

/** Texture dải sáng: màu đổi theo bề ngang; hai đầu thu nhọn và tan dần nên tia không thành khối chữ nhật */
function beamTexture(stops: [number, string][]): Texture {
    const W = 256, H = 128
    const strip = document.createElement("canvas")
    strip.width = 1
    strip.height = H
    const c = document.createElement("canvas")
    c.width = W
    c.height = H
    const line = strip.getContext("2d")
    const g = c.getContext("2d")
    if (line && g) {
        const across = line.createLinearGradient(0,
            0,
            0,
            H)
        for (const [at,
            color] of stops) across.addColorStop(at,
            color)
        line.fillStyle = across
        line.fillRect(0,
            0,
            1,
            H)
        for (let x = 0; x < W; x++) {
            const t = x / (W - 1)
            const head = Math.min(1,
                t / .1)
            const tip = Math.min(1,
                (1 - t) / .24)
            const shape = Math.sin(Math.min(head,
                tip) * Math.PI / 2)
            const h = H * (.16 + .84 * shape)
            g.globalAlpha = Math.min(1,
                shape * 1.5)
            g.drawImage(strip,
                0,
                0,
                1,
                H,
                x,
                (H - h) / 2,
                1,
                h)
        }
    }
    return Texture.from(c)
}

let spectrumTex: Texture | undefined
let coreTex: Texture | undefined
const spectrumBeam = () => (spectrumTex ??= beamTexture([
    [0,
        "rgba(180,140,255,0)"],
    [.07,
        "rgba(180,140,255,.5)"],
    [.13,
        "rgba(95,212,255,.85)"],
    [.19,
        "rgba(125,242,160,.9)"],
    [.25,
        "rgba(255,228,92,.95)"],
    [.3,
        "rgba(255,150,190,.95)"],
    [.37,
        "rgba(255,220,110,1)"],
    [.5,
        "rgba(255,246,206,1)"],
    [.63,
        "rgba(255,220,110,1)"],
    [.7,
        "rgba(255,150,190,.95)"],
    [.75,
        "rgba(255,228,92,.95)"],
    [.81,
        "rgba(125,242,160,.9)"],
    [.87,
        "rgba(95,212,255,.85)"],
    [.93,
        "rgba(180,140,255,.5)"],
    [1,
        "rgba(180,140,255,0)"]
]))
const coreBeam = () => (coreTex ??= beamTexture([
    [0,
        "rgba(255,255,255,0)"],
    [.22,
        "rgba(255,240,190,.35)"],
    [.38,
        "rgba(255,255,255,.95)"],
    [.62,
        "rgba(255,255,255,.95)"],
    [.78,
        "rgba(255,240,190,.35)"],
    [1,
        "rgba(255,255,255,0)"]
]))

/** Một dải tia đặt từ a theo hướng dir; cleanup khi tia tắt */
function beamStrip(ctx: VfxCtx, tex: Texture, at: Pt, dir: number, thick: number, additive = false): Sprite {
    const s = new Sprite(tex)
    s.anchor.set(0,
        .5)
    s.x = at.x
    s.y = at.y
    s.rotation = dir
    s.blendMode = additive ? "add" : "normal"
    s.width = 1
    s.height = thick
    ctx.layer.addChild(s)
    return s
}

/** R: tia Final Spark. Bề dày theo M (ctx.amount); vươn rất nhanh, chạm là báo nhịp, giữ một lúc rồi thu mảnh lại */
registerVfx("luxSpark",
    async (ctx) => {
        const m = sparkOf(ctx)
        const at = ctx.from
        const to = ctx.to[0] ?? {
            x: at.x, y: at.y - 300
        }
        const dir = Math.atan2(to.y - at.y,
            to.x - at.x)
        const reach = Math.hypot(to.x - at.x,
            to.y - at.y) + 46
        const thick = lerp(44,
            250,
            Math.pow(m,
                .85))
        const nx = -Math.sin(dir), ny = Math.cos(dir)
        const hold = lerp(SPARK_HOLD_MS[0],
            SPARK_HOLD_MS[1],
            m)
        const outer = beamStrip(ctx,
            spectrumBeam(),
            at,
            dir,
            thick * 1.7)
        const rainbow = beamStrip(ctx,
            spectrumBeam(),
            at,
            dir,
            thick)
        const core = beamStrip(ctx,
            coreBeam(),
            at,
            dir,
            thick * .56,
            true)
        outer.alpha = .3
        let length = 0
        const onBeam = (offset: number): Pt => {
            const t = Math.random() * length * .8
            return {
                x: at.x + Math.cos(dir) * t + nx * offset, y: at.y + Math.sin(dir) * t + ny * offset
            }
        }
        const life = 90 + hold + 200
        const streams = SPECTRUM.map((color, i) => {
            const lane = ((i + .5) / SPECTRUM.length - .5) * thick * .92
            return dustStream(ctx.layer,
                () => onBeam(lane + rand(-thick * .05,
                    thick * .05)),
                life,
                180 + m * 340,
                shaft({
                    color: [color], angle: [dir - .012,
                        dir + .012], speed: [700,
                        1200], drag: .4, flow: 5, life: [90,
                        180], size: [5 + thick * .035,
                        2.5], streak: 11, additive: false
                }))
        })
        await Promise.all([
            ...streams,
            dustStream(ctx.layer,
                () => onBeam(rand(-.5,
                    .5) * thick),
                life,
                420 + m * 1100,
                motes({
                    speed: [40,
                        240], life: [320,
                        720], gravity: 0
                })),
            bloom(ctx.layer,
                at,
                WHITE,
                200 + m * 300,
                life),
            wait(ctx,
                90).then(() => Promise.all([
                bloom(ctx.layer,
                    to,
                    GOLD,
                    thick * 2.6,
                    hold + 200),
                bloom(ctx.layer,
                    to,
                    WHITE,
                    thick * 1.5,
                    hold + 120)
            ])),
            tween(90,
                (t) => {
                    length = reach * t
                    for (const s of [outer,
                        rainbow,
                        core]) if (!s.destroyed) s.width = Math.max(1,
                        length)
                },
                ease.out,
                ctx.layer).then(() => {
                ctx.onBeat?.()
                return tween(hold,
                    (t) => {
                        const wobble = 1 + Math.sin(t * 42) * .05
                        if (!rainbow.destroyed) rainbow.height = thick * wobble
                        if (!core.destroyed) core.height = thick * .56 * (2 - wobble)
                    },
                    ease.linear,
                    ctx.layer)
            }).then(() => tween(200,
                (t) => {
                    const left = Math.pow(1 - t,
                        2)
                    if (!outer.destroyed) outer.height = thick * 1.7 * left
                    if (!rainbow.destroyed) rainbow.height = thick * left
                    if (!core.destroyed) core.height = thick * .56 * left
                },
                ease.linear,
                ctx.layer))
        ])
        for (const s of [outer,
            rainbow,
            core]) if (!s.destroyed) s.destroy()
    })

/** R trúng: M càng cao vụ nổ cầu vồng càng lớn, ctx.amount là M */
registerVfx("luxSparkHit",
    async (ctx) => {
        const m = sparkOf(ctx)
        const power = lerp(.95,
            2.3,
            m)
        ctx.shake(4 + m * 9,
            220 + m * 260)
        await Promise.all([
            flash(ctx,
                ctx.from,
                power,
                Math.round(240 + m * 420)),
            bloom(ctx.layer,
                ctx.from,
                PINK,
                430 * power,
                460),
            mist(ctx.layer,
                ctx.from,
                {
                    color: [PALE,
                        PINK,
                        SKY,
                        LILAC], size: 150 * power, alpha: .3, count: 12, speed: [50,
                        170]
                })
        ])
    })
