// VFX riêng của Janna theo bộ chiêu mới, chất liệu là gió: gió chỉ thấy được qua các vệt dài mảnh cuốn theo luồng, thêm chút sương mỏng và lá bay. Đánh thường, Hộ Phong (nội tại), Gió Lốc (Q), Mắt Bão (E), Gió Mùa (R).
import {
    Text
} from "pixi.js"
import {
    bloom, dustBurst, dustStream, mist, type DustBurstOpts, type DustOpts
} from "./fx_dust"
import {
    ease, lerp, makeSprite, rand, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const TAU = Math.PI * 2
const SILVER = 0xe8f3fb
const DUSK = 0x143a5c
const SMOKE = 0x3a6a8c
const DEEP = 0x2f6f9c
const MINT = 0x9affd8
const GOLD = 0xffd768
const AMBER = 0xffb830
const LEAVES = [0x9fcf6a,
    0xe8e2a0,
    0xc9d98a]
const points = (ctx: VfxCtx) => ctx.to.length ? ctx.to : [ctx.from]
/** Tỉ lệ hình như bộ Nami và Renata */
const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity) * 1.55
/** Hiệu ứng ôm sát một lá: giữ cỡ theo thẻ, chiêu cuối cũng không lấn sang lá bên */
const CARD_K = 1.55
/** Kích thước ô lá tướng trên bàn 1600x900 */
const CARD_W = 123
const CARD_H = 212
/** Độ lệch hướng của mỗi vệt so với hướng gió, rad */
const FAN = .16
/** Vệt mảnh tan mất khi nhìn cỡ bàn cờ: làm dày thêm và giữ độ dài gần như cũ */
const STREAK_WIDTH = 1.45
const STREAK_LENGTH = .8

/** Áp độ dày chung cho mọi vệt gió */
function weighty<T extends DustOpts>(o: T): T {
    const [z0,
        z1] = o.size ?? [5,
        2]
    return {
        ...o, size: [z0 * STREAK_WIDTH,
            z1 * STREAK_WIDTH], streak: (o.streak ?? 10) * STREAK_LENGTH
    }
}

const air = (ctx: VfxCtx) => [ctx.color,
    ctx.color2 ?? SILVER,
    0xffffff]
const fadeOf = (t: number, inEnd: number, outStart: number) => Math.min(1,
    t / inEnd,
    (1 - t) / (1 - outStart))
const arcAt = (a: Pt, b: Pt, t: number, h: number): Pt => ({
    x: lerp(a.x,
        b.x,
        t), y: lerp(a.y,
        b.y,
        t) - Math.sin(t * Math.PI) * h
})
/** Báo nhịp đúng một lần dù hiệu ứng có nhiều mục tiêu */
function beatOnce(ctx: VfxCtx) {
    let told = false
    return () => {
        if (told) return
        told = true
        ctx.onBeat?.()
    }
}

/** Một điểm phát vệt gió và hướng gió tại đó */
interface Aim { pt: Pt; dir: number }

/** Dòng vệt gió, mỗi vệt nằm theo hướng `aim` trả về. `dustStream` đọc `angle` lúc phát từng hạt, ngay sau khi gọi điểm phát, nên chỉnh tại đây là đủ */
function gale(ctx: VfxCtx, aim: () => Aim, ms: number, rate: number, o: Partial<DustOpts> = {
}) {
    const opts = weighty<DustOpts>({
        color: air(ctx), size: [4.5,
            2], streak: 10, speed: [260,
            560], life: [200,
            440], drag: .7, flow: 140, alpha: 1, additive: false, ...o
    })
    return dustStream(ctx.layer,
        () => {
            const a = aim()
            opts.angle = [a.dir - FAN,
                a.dir + FAN]
            return a.pt
        },
        ms,
        rate,
        opts)
}

/** Vệt sẫm lót sau vệt trắng để gió tách khỏi nền cỏ sáng */
const SHADE: Partial<DustOpts> = {
    color: [SMOKE,
        DEEP], size: [6,
        2.5], streak: 9, alpha: .75
}
/** Lá vụn cuốn theo gió */
const LEAF: Partial<DustOpts> = {
    color: LEAVES, size: [5,
        3], streak: 2.2, life: [340,
        680], speed: [200,
        420], flow: 170
}

/** Tia gió bật tung ra mọi hướng */
const windBurst = (ctx: VfxCtx, at: Pt, o: Partial<DustBurstOpts> & { count: number }) => dustBurst(ctx.layer,
    at,
    weighty<DustBurstOpts>({
        color: air(ctx), size: [5,
            2], streak: 11, speed: [320,
            820], drag: 2.2, flow: 170, life: [240,
            520], alpha: 1, additive: false, ...o
    }))

/** Quầng sáng mềm giữ nguyên chỗ trong suốt hiệu ứng, không có viền */
async function glow(ctx: VfxCtx, at: Pt, color: number, size: number, ms: number, peak: number, additive = true) {
    const s = makeSprite(ctx.layer,
        "glow",
        at.x,
        at.y,
        color,
        size,
        additive)
    s.alpha = 0
    await tween(ms,
        (t) => { s.alpha = peak * fadeOf(t,
            .12,
            .6) },
        ease.linear,
        ctx.layer)
    if (!s.destroyed) s.destroy()
}

/** Sương mỏng xám xanh dưới gió */
const haze = (ctx: VfxCtx, at: Pt, size: number, alpha = .3) => mist(ctx.layer,
    at,
    {
        color: [DUSK,
            SMOKE], size, alpha, count: 8, life: [520,
            1000], additive: false
    })

/** Một vệt trên thân lốc: bay vòng theo tiết diện dẹt và chếch lên, đáy hẹp miệng rộng */
function funnelAim(p: Pt, spin: number, h: number, w: number): Aim {
    const u = Math.pow(Math.random(),
        .75)
    const rx = w * lerp(.14,
        1,
        Math.pow(u,
            1.4))
    const a = spin + u * 9 + (Math.random() < .5 ? 0 : Math.PI) + rand(-.8,
        .8)
    return {
        pt: {
            x: p.x + Math.cos(a) * rx + Math.sin(u * 5 + spin) * w * .1,
            y: p.y + h * .5 - h * u + Math.sin(a) * rx * .26
        },
        dir: Math.atan2(Math.cos(a) * .26 - .34,
            -Math.sin(a))
    }
}

/** Thân lốc: vệt trắng xoắn chặt, vệt sẫm lót sau */
function twister(ctx: VfxCtx, body: () => Aim, ms: number, rate: number) {
    const swirl: Partial<DustOpts> = {
        streak: 7, size: [4.5,
            2], speed: [320,
            540], life: [110,
            240], drag: .3, flow: 120, gravity: -240
    }
    return Promise.all([
        gale(ctx,
            body,
            ms,
            rate,
            swirl),
        gale(ctx,
            body,
            ms,
            rate * .35,
            {
                ...swirl, ...SHADE, streak: 6
            })
    ])
}

/** Luồng gió bay: chùm vệt dài kéo dọc đường bay, vệt sẫm lót sau, lá vụn và sương mỏng. `arrive` chạy đúng lúc tới nơi */
function windFlight(ctx: VfxCtx, path: (t: number) => Pt, ms: number, r: number, rate: number, arrive: () => void) {
    const heading = (t: number) => {
        const a = path(Math.max(0,
                t - .02)), b = path(Math.min(1,
                t + .02))
        return Math.atan2(b.y - a.y,
            b.x - a.x)
    }
    let p = path(0)
    let dir = heading(0)
    const sheaf = () => ({
        pt: {
            x: p.x + rand(-r,
                r), y: p.y + rand(-r,
                r)
        }, dir
    })
    return Promise.all([
        gale(ctx,
            sheaf,
            ms,
            rate,
            {
                streak: 12
            }),
        gale(ctx,
            sheaf,
            ms,
            rate * .35,
            SHADE),
        gale(ctx,
            sheaf,
            ms,
            70,
            LEAF),
        dustStream(ctx.layer,
            () => p,
            ms,
            44,
            {
                puff: true, color: [ctx.color,
                    SMOKE], size: [r * 1.8,
                    r * 3.4], life: [280,
                    560], speed: [8,
                    40], flow: 30, alpha: .3, additive: false
            }),
        tween(ms,
            (t) => {
                p = path(t)
                dir = heading(t)
            },
            ease.inOut,
            ctx.layer).then(arrive)
    ])
}

/** Vệt gió chạy vòng quanh `at` theo quỹ đạo dẹt; chia dải và lệch bán kính nên không thành viền */
function circling(ctx: VfxCtx, at: Pt, rx: number, ry: number, ms: number, rate: number, jitter: number, o: Partial<DustOpts> = {
}) {
    let spin = 0
    const onOrbit = () => {
        const a = spin + Math.floor(rand(0,
            4)) / 4 * TAU + rand(-.6,
            .6)
        const d = 1 + rand(-jitter,
            jitter)
        return {
            pt: {
                x: at.x + Math.cos(a) * rx * d, y: at.y + Math.sin(a) * ry * d
            },
            dir: Math.atan2(Math.cos(a) * ry,
                -Math.sin(a) * rx)
        }
    }
    const lines: Partial<DustOpts> = {
        streak: 7, size: [4,
            1.8], speed: [300,
            500], life: [140,
            300], drag: .3, flow: 120, ...o
    }
    return Promise.all([
        gale(ctx,
            onOrbit,
            ms,
            rate,
            lines),
        gale(ctx,
            onOrbit,
            ms,
            rate * .3,
            {
                ...lines, ...SHADE, streak: 6
            }),
        tween(ms,
            (t) => { spin = t * TAU * 1.5 },
            ease.linear,
            ctx.layer)
    ])
}

/** Đánh thường: chùm gió bay cong tới mục tiêu */
registerVfx("jannaGust",
    async (ctx) => {
        const k = kOf(ctx)
        const land = beatOnce(ctx)
        await Promise.all(points(ctx).map((to) => windFlight(ctx,
            (t) => arcAt(ctx.from,
                to,
                t,
                38 * k),
            340,
            13 * k,
            3200,
            land)))
    })

/** Trúng đánh thường: gió toả tung thành vệt */
registerVfx("jannaGustHit",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color2 ?? SILVER,
                170 * k,
                280),
            windBurst(ctx,
                ctx.from,
                {
                    count: 380
                }),
            windBurst(ctx,
                ctx.from,
                {
                    count: 120, ...SHADE, streak: 9
                })
        ])
    })

/** Q Gió Lốc: cơn lốc lướt tới mục tiêu, chạm là báo trúng */
registerVfx("jannaTornado",
    async (ctx) => {
        const k = kOf(ctx)
        const land = beatOnce(ctx)
        await Promise.all(points(ctx).map(async (to) => {
            let p = {
                ...ctx.from
            }
            let spin = 0
            const body = () => funnelAim(p,
                spin,
                160 * k,
                62 * k)
            const foot = () => ({
                pt: {
                    x: p.x + rand(-22,
                        22) * k, y: p.y + 78 * k
                }, dir: rand(-Math.PI * .9,
                    -Math.PI * .1)
            })
            await Promise.all([
                twister(ctx,
                    body,
                    640,
                    9000),
                gale(ctx,
                    foot,
                    640,
                    240,
                    LEAF),
                dustStream(ctx.layer,
                    () => p,
                    640,
                    60,
                    {
                        puff: true, color: [SMOKE,
                            ctx.color], size: [70 * k,
                            130 * k], life: [260,
                            520], speed: [20,
                            70], angle: [-Math.PI * .75,
                            -Math.PI * .25], flow: 34, alpha: .3, additive: false
                    }),
                tween(640,
                    (t) => {
                        p = {
                            x: lerp(ctx.from.x,
                                to.x,
                                t), y: lerp(ctx.from.y,
                                to.y,
                                t)
                        }
                        spin = t * 26
                    },
                    ease.inOut,
                    ctx.layer).then(land)
            ])
        }))
    })

/** Q trúng: lốc cuốn mục tiêu rồi tan, vệt vàng Choáng xoáy trên đầu; sát thương và Choáng cùng một nhịp */
registerVfx("jannaTornadoHit",
    async (ctx) => {
        const k = CARD_K
        const at = ctx.from
        let spin = 0
        let dizzy = 0
        const head = {
            x: at.x, y: at.y - 62 * k
        }
        const body = () => funnelAim(at,
            spin,
            160 * k,
            62 * k)
        const halo = () => {
            const a = dizzy + (Math.random() < .5 ? 0 : Math.PI) + rand(-1,
                1)
            // bán kính rải rộng để xoáy vàng không thu thành vòng hào quang
            const d = rand(.42,
                1.42)
            return {
                pt: {
                    x: head.x + Math.cos(a) * 58 * k * d, y: head.y + Math.sin(a) * 19 * k * d
                },
                dir: Math.atan2(Math.cos(a) * 19,
                    -Math.sin(a) * 58)
            }
        }
        const stunTone = [GOLD,
            AMBER,
            0xfff1b3,
            0xffffff]
        ctx.shake(9,
            280)
        await Promise.all([
            bloom(ctx.layer,
                at,
                ctx.color2 ?? SILVER,
                230 * k,
                320),
            bloom(ctx.layer,
                head,
                GOLD,
                210 * k,
                420),
            glow(ctx,
                head,
                AMBER,
                170 * k,
                1150,
                .5),
            haze(ctx,
                at,
                130 * k),
            windBurst(ctx,
                at,
                {
                    count: 620
                }),
            windBurst(ctx,
                at,
                {
                    count: 190, ...SHADE, streak: 9
                }),
            windBurst(ctx,
                head,
                {
                    count: 260, color: stunTone, size: [5.5,
                        2.4], streak: 8, speed: [260,
                        640]
                }),
            twister(ctx,
                body,
                560,
                7000),
            gale(ctx,
                halo,
                1150,
                4600,
                {
                    color: stunTone, size: [5.5,
                        2.4], streak: 6, speed: [280,
                        440], life: [130,
                        280], drag: .3, flow: 36
                }),
            tween(1150,
                (t) => {
                    spin = t * 30
                    dizzy = t * TAU * 2.4
                },
                ease.linear,
                ctx.layer)
        ])
    })

/** E Mắt Bão: hai chùm vệt xoắn từ Janna sang đồng minh, tới nơi là báo */
registerVfx("jannaBreeze",
    async (ctx) => {
        const k = kOf(ctx)
        const land = beatOnce(ctx)
        await Promise.all(points(ctx).map((to) => {
            const dx = to.x - ctx.from.x, dy = to.y - ctx.from.y
            const len = Math.hypot(dx,
                dy) || 1
            const nx = -dy / len, ny = dx / len
            const strand = (phase: number) => (t: number) => {
                const wave = Math.sin(t * TAU * 1.5 + phase) * 24 * k * Math.sin(t * Math.PI)
                return {
                    x: ctx.from.x + dx * t + nx * wave, y: ctx.from.y + dy * t + ny * wave
                }
            }
            return Promise.all([
                windFlight(ctx,
                    strand(0),
                    430,
                    8 * k,
                    2600,
                    land),
                windFlight(ctx,
                    strand(Math.PI),
                    430,
                    8 * k,
                    2600,
                    land)
            ])
        }))
    })

/** E Mắt Bão: Khiên là gió: vệt chạy vòng quanh mép lá, quầng sáng mềm không viền; lòng bão để trống cho ảnh tướng và số nổi */
registerVfx("jannaEyeShield",
    async (ctx) => {
        const k = CARD_K
        const at = ctx.from
        const ms = 1800
        await Promise.all([
            glow(ctx,
                at,
                ctx.color,
                250 * k,
                ms,
                .3),
            bloom(ctx.layer,
                at,
                ctx.color2 ?? SILVER,
                130 * k,
                300),
            circling(ctx,
                at,
                50 * k,
                84 * k,
                ms * .9,
                5200,
                .16)
        ])
    })

/** Khiên gió đỡ đòn: vệt gió quanh mép lá bật tung ra ngoài, giữa lá để trống cho số đỡ */
registerVfx("jannaBlock",
    async (ctx) => {
        const k = CARD_K
        const at = ctx.from
        const rx = 50 * k, ry = 84 * k
        ctx.shake(4,
            130)
        await Promise.all(Array.from({
            length: 14
        },
        (_, i) => {
            const a = i / 14 * TAU
            return windBurst(ctx,
                {
                    x: at.x + Math.cos(a) * rx, y: at.y + Math.sin(a) * ry
                },
                {
                    count: 46, color: [SILVER,
                        0xffffff], angle: [a - .55,
                        a + .55], spread: 12, streak: 9
                })
        }))
    })

/** R Gió Mùa: luồng vệt lớn quét rộng qua cả đội từ Janna; `onBeat` lúc gió chạm khắp đội. `to` là đồng đội, rỗng thì phủ tầm mặc định */
registerVfx("jannaMonsoon",
    async (ctx) => {
        const at = ctx.from
        const reach = (ctx.to.length ? Math.max(...ctx.to.map((p) => Math.abs(p.x - at.x))) : 440) + 150
        const flat = .4
        const ms = 1150
        const land = beatOnce(ctx)
        let r = 0
        let spin = 0
        const onArm = () => {
            const u = Math.pow(Math.random(),
                .6)
            const a = spin + Math.floor(rand(0,
                3)) / 3 * TAU + u * 1.15 * TAU + rand(-.35,
                .35)
            const d = lerp(18,
                r,
                u)
            return {
                pt: {
                    x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d * flat
                },
                dir: Math.atan2(Math.cos(a) * flat,
                    -Math.sin(a)) - .4
            }
        }
        const rush: Partial<DustOpts> = {
            streak: 13, size: [5,
                2.2], speed: [420,
                760], life: [240,
                500], flow: 190
        }
        ctx.shake(8,
            560)
        await Promise.all([
            bloom(ctx.layer,
                at,
                ctx.color2 ?? SILVER,
                460,
                420),
            gale(ctx,
                onArm,
                ms * .8,
                15000,
                rush),
            gale(ctx,
                onArm,
                ms * .8,
                5200,
                {
                    ...rush, ...SHADE, streak: 11
                }),
            gale(ctx,
                onArm,
                ms * .8,
                260,
                LEAF),
            dustStream(ctx.layer,
                () => onArm().pt,
                ms * .8,
                60,
                {
                    puff: true, color: [ctx.color,
                        SILVER,
                        SMOKE], size: [90,
                        210], life: [380,
                        720], speed: [20,
                        80], flow: 50, alpha: .26, additive: false
                }),
            tween(ms,
                (t) => {
                    r = reach * ease.out(Math.min(1,
                        t / .62))
                    spin = t * 7
                    if (t >= .5) land()
                },
                ease.linear,
                ctx.layer)
        ])
    })

/** R trúng từng đồng minh: vệt gió làm Khiên vòng trong lá và vệt hồi Máu bốc lên, cùng một nhịp */
registerVfx("jannaMonsoonHit",
    async (ctx) => {
        const k = CARD_K
        const at = ctx.from
        const rising = () => ({
            pt: {
                x: at.x + rand(-1,
                    1) * CARD_W * .42, y: at.y + CARD_H * .4
            }, dir: -Math.PI / 2
        })
        await Promise.all([
            bloom(ctx.layer,
                at,
                MINT,
                130 * k,
                340),
            glow(ctx,
                at,
                ctx.color,
                CARD_H * 1.1,
                1300,
                .3),
            circling(ctx,
                at,
                CARD_W * .46,
                CARD_H * .46,
                1150,
                2800,
                .1,
                {
                    streak: 5, speed: [240,
                        400], life: [110,
                        240], flow: 90
                }),
            gale(ctx,
                rising,
                900,
                1000,
                {
                    color: [MINT,
                        0xffffff], size: [4,
                        1.8], streak: 8, speed: [220,
                        420], life: [260,
                        520], gravity: -160, flow: 70
                })
        ])
    })

/** Nội tại Hộ Phong: làn gió từ đồng minh (`to`) gom về Janna thành 1 Gió Thuận, rồi cơn gió lan ra cả đội */
registerVfx("jannaWindStack",
    async (ctx) => {
        const k = CARD_K
        const at = ctx.from
        const team = ctx.to.length ? ctx.to : [0,
            1,
            2,
            3,
            4].map((i) => ({
            x: at.x + Math.cos(i / 5 * TAU) * 170 * k, y: at.y + Math.sin(i / 5 * TAU) * 120 * k
        }))
        const land = beatOnce(ctx)
        const gather = Promise.all(team.map((p) => windFlight(ctx,
            (t) => arcAt(p,
                at,
                t,
                48 * k),
            700,
            9 * k,
            1500,
            land)))
        const back = haze(ctx,
            at,
            180 * k)
        await tween(700,
            () => undefined,
            ease.linear,
            ctx.layer)
        land()
        if (ctx.layer.destroyed) return
        ctx.shake(7,
            280)
        const label = new Text({
            text: "+1",
            style: {
                fontFamily: "Nunito, Arial, sans-serif", fontSize: 46, fontWeight: "900", fill: 0xffffff, stroke: {
                    color: DUSK, width: 8
                }
            }
        })
        label.anchor.set(.5)
        label.position.set(at.x,
            at.y)
        ctx.layer.addChild(label)
        await Promise.all([
            gather,
            back,
            bloom(ctx.layer,
                at,
                ctx.color2 ?? SILVER,
                260 * k,
                420),
            windBurst(ctx,
                at,
                {
                    count: 560
                }),
            windBurst(ctx,
                at,
                {
                    count: 170, ...SHADE, streak: 9
                }),
            ...team.map((p) => windFlight(ctx,
                (t) => arcAt(at,
                    p,
                    t,
                    48 * k),
                520,
                10 * k,
                1700,
                () => {
                    void windBurst(ctx,
                        p,
                        {
                            count: 150, angle: [-Math.PI * .68,
                                -Math.PI * .32], gravity: -220, spread: 44 * k, speed: [280,
                                620], streak: 10
                        })
                })),
            tween(1000,
                (t) => {
                    label.alpha = t < .7 ? 1 : (1 - t) / .3
                    label.position.y = at.y - t * 60 * k
                },
                ease.linear,
                ctx.layer)
        ])
    })
