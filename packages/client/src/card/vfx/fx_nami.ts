// VFX riêng của Nami, chất liệu NƯỚC thật: giọt li ti, bụi nước, sương mù và ánh sáng mềm, không dùng nét vẽ hình học.
import {
    bloom, dustBurst, dustStream, mist
} from "./fx_dust"
import {
    ease, lerp, rand, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const TAU = Math.PI * 2
const FOAM = 0xe6fdff
const DEEP = 0x1778c4
const points = (ctx: VfxCtx) => ctx.to.length ? ctx.to : [ctx.from]
const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
const waterOf = (ctx: VfxCtx) => [ctx.color,
    ctx.color2 ?? FOAM,
    FOAM,
    DEEP]

/** Điểm trên cung nước từ a tới b, võng lên cao h */
const arc = (a: Pt, b: Pt, t: number, h: number): Pt => ({
    x: lerp(a.x,
        b.x,
        t), y: lerp(a.y,
        b.y,
        t) - Math.sin(t * Math.PI) * h
})

/** Bụi nước văng lên rồi rơi xuống */
const droplets = (ctx: VfxCtx, at: Pt, count: number, power = 1) => dustBurst(ctx.layer,
    at,
    {
        count, color: waterOf(ctx), speed: [90 * power,
            430 * power], angle: [-Math.PI * .96,
            -Math.PI * .04],
        gravity: 780, drag: .6, flow: 18, life: [420,
            900], size: [6,
            2], alpha: 1, spread: 16, additive: false
    })

/** Khối nước bay theo cung: lõi hạt dày, đuôi bụi nước; chạm mục tiêu là báo nhịp trúng */
async function flight(ctx: VfxCtx, to: Pt, ms: number, h: number, width: number) {
    const color = waterOf(ctx)
    let p = {
        ...ctx.from
    }
    const head = () => ({
        x: p.x + rand(-width,
            width) * .5, y: p.y + rand(-width,
            width) * .5
    })
    await Promise.all([
        dustStream(ctx.layer,
            head,
            ms,
            900,
            {
                color, speed: [4,
                    34], life: [180,
                    420], size: [7,
                    2], alpha: 1, flow: 26, drag: 2.4
            }),
        dustStream(ctx.layer,
            () => p,
            ms,
            90,
            {
                puff: true, color: [ctx.color,
                    DEEP], speed: [4,
                    22], life: [240,
                    460], size: [width * 1.6,
                    width * 3], alpha: .28, flow: 18
            }),
        dustStream(ctx.layer,
            head,
            ms,
            170,
            {
                color, speed: [10,
                    60], gravity: 420, life: [260,
                    620], size: [5,
                    1.5], alpha: .95, flow: 14, additive: false
            }),
        tween(ms,
            (t) => { p = arc(ctx.from,
                to,
                t,
                h) },
            ease.inOut,
            ctx.layer).then(() => ctx.onBeat?.())
    ])
}

/** Đánh thường: quả cầu nước bay cong */
registerVfx("namiOrb",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all(points(ctx).map((to) => flight(ctx,
            to,
            460,
            80 * k,
            24 * k)))
    })

/** Trúng: toé nước và bụi nước */
registerVfx("namiSplash",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                190 * k,
                320),
            mist(ctx.layer,
                ctx.from,
                {
                    color: [ctx.color,
                        FOAM], size: 150 * k, alpha: .34
                }),
            droplets(ctx,
                ctx.from,
                Math.round(220 * ctx.intensity))
        ])
    })

/** Q: một lần nảy, dòng nước vọt sang mục tiêu kế tiếp */
registerVfx("namiTideHop",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all(points(ctx).map((to) => {
            const span = Math.hypot(to.x - ctx.from.x,
                to.y - ctx.from.y)
            return flight(ctx,
                to,
                480,
                Math.min(190,
                    60 + span * .3) * k,
                26 * k)
        }))
    })

/** Q trúng đồng minh: bụi nước mát nổi lên quanh tướng */
registerVfx("namiTideHeal",
    async (ctx) => {
        const k = kOf(ctx)
        const color = [ctx.color,
            ctx.color2 ?? 0xd8fff0,
            0xffffff]
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                240 * k,
                460),
            mist(ctx.layer,
                ctx.from,
                {
                    color, size: 170 * k, alpha: .3, gravity: -60
                }),
            dustStream(ctx.layer,
                () => ({
                    x: ctx.from.x + rand(-76,
                        76) * k, y: ctx.from.y + rand(10,
                        96) * k
                }),
                560,
                620,
                {
                    color, speed: [40,
                        130], angle: [-Math.PI * .6,
                        -Math.PI * .4], gravity: -120, life: [520,
                        980], size: [6,
                        2], alpha: 1, flow: 44
                })
        ])
    })

/** Q trúng địch: nước đập mạnh, tung bụi nước */
registerVfx("namiTideHit",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                210 * k,
                300),
            mist(ctx.layer,
                ctx.from,
                {
                    color: [ctx.color,
                        FOAM], size: 160 * k, alpha: .36, speed: [20,
                        120]
                }),
            droplets(ctx,
                ctx.from,
                Math.round(280 * ctx.intensity),
                1.15)
        ])
    })

/** E: hai dòng hạt nước xoắn nhau chảy sang đồng minh */
registerVfx("namiBlessFlow",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all(points(ctx).map(async (to) => {
            const dx = to.x - ctx.from.x, dy = to.y - ctx.from.y
            const len = Math.hypot(dx,
                dy) || 1
            const nx = -dy / len, ny = dx / len
            let u = 0
            const at = (phase: number) => {
                const wave = Math.sin(u * TAU * 1.5 + phase) * 30 * k * Math.sin(u * Math.PI)
                return {
                    x: ctx.from.x + dx * u + nx * wave, y: ctx.from.y + dy * u + ny * wave
                }
            }
            const opts = {
                color: waterOf(ctx), speed: [4,
                    26] as [number, number], life: [240,
                        520] as [number, number], size: [7,
                            2] as [number, number], alpha: 1, flow: 30, drag: 2, spread: 9 * k
            }
            await Promise.all([
                dustStream(ctx.layer,
                    () => at(0),
                    520,
                    760,
                    opts),
                dustStream(ctx.layer,
                    () => at(Math.PI),
                    520,
                    760,
                    opts),
                tween(520,
                    (t) => { u = t },
                    ease.inOut,
                    ctx.layer).then(() => ctx.onBeat?.())
            ])
        }))
    })

/** E: màn nước mỏng ôm lá tướng, hạt nước chạy quanh bề mặt rồi tan */
registerVfx("namiTideShield",
    async (ctx) => {
        const k = kOf(ctx)
        const r = 118 * k
        let spin = 0
        const shell = () => {
            const a = rand(0,
                TAU) + spin
            return {
                x: ctx.from.x + Math.cos(a) * r * rand(.9,
                    1.04), y: ctx.from.y + Math.sin(a) * r * rand(.9,
                    1.04)
            }
        }
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                r * 2.6,
                720),
            mist(ctx.layer,
                ctx.from,
                {
                    color: [ctx.color,
                        FOAM], size: r * 1.5, alpha: .2, life: [800,
                        1200], speed: [2,
                        16]
                }),
            dustStream(ctx.layer,
                shell,
                880,
                1500,
                {
                    color: waterOf(ctx), speed: [4,
                        18], life: [240,
                        520], size: [5,
                        1.5], alpha: .95, flow: 34, drag: 2.2
                }),
            tween(880,
                (t) => { spin = t * TAU },
                ease.linear,
                ctx.layer)
        ])
    })

/** E: 3 cụm giọt nước xoáy quanh tướng rồi thấm vào lá */
registerVfx("namiBlessGain",
    async (ctx) => {
        const k = kOf(ctx)
        let t = 0
        const clump = (i: number) => () => {
            const r = lerp(88,
                6,
                Math.max(0,
                    (t - .62) / .38)) * k
            const a = t * TAU * 1.5 + i / 3 * TAU
            return {
                x: ctx.from.x + Math.cos(a) * r, y: ctx.from.y + Math.sin(a) * r * .66
            }
        }
        const opts = {
            color: waterOf(ctx), speed: [2,
                16] as [number, number], life: [160,
                    360] as [number, number], size: [8,
                        2] as [number, number], alpha: 1, flow: 10, drag: 3, spread: 12 * k
        }
        await Promise.all([
            ...[0,
                1,
                2].map((i) => dustStream(ctx.layer,
                clump(i),
                960,
                420,
                opts)),
            tween(960,
                (v) => { t = v },
                ease.inOut,
                ctx.layer)
        ])
        await bloom(ctx.layer,
            ctx.from,
            ctx.color,
            150 * k,
            240)
    })

/** Phước Lành kích hoạt: giọt nước lớn rơi xuống nổ tung */
registerVfx("namiBlessProc",
    async (ctx) => {
        const k = kOf(ctx)
        const top = ctx.from.y - 210 * k
        let y = top
        await Promise.all([
            dustStream(ctx.layer,
                () => ({
                    x: ctx.from.x + rand(-11,
                        11) * k, y
                }),
                240,
                1400,
                {
                    color: waterOf(ctx), speed: [2,
                        18], gravity: 300, life: [150,
                        340], size: [7,
                        2], alpha: 1, flow: 10
                }),
            tween(240,
                (t) => { y = lerp(top,
                    ctx.from.y,
                    t) },
                ease.in,
                ctx.layer)
        ])
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color2 ?? FOAM,
                210 * k,
                280),
            mist(ctx.layer,
                ctx.from,
                {
                    color: [ctx.color,
                        FOAM], size: 130 * k, alpha: .32
                }),
            droplets(ctx,
                ctx.from,
                240)
        ])
    })

/** Nội tại: nhận 1 Dậy Sóng, bụi nước bị hút về Nami */
registerVfx("namiSurgeGain",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                130 * k,
                320),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 150, color: waterOf(ctx), speed: [20,
                        90], angle: [-Math.PI * .8,
                        -Math.PI * .2], gravity: -170,
                    life: [360,
                        720], size: [6,
                        2], alpha: 1, spread: 60 * k, flow: 40
                })
        ])
    })

/** Nội tại: đạt bội số 20 Dậy Sóng. Cột nước dâng từ Nami, dòng AP tím tràn sang đồng minh trong `to` */
registerVfx("namiSurgeCrest",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        let top = at.y + 60 * k
        const column = () => {
            const y = rand(top,
                at.y + 60 * k)
            const narrow = 1 - (at.y + 60 * k - y) / (340 * k) * .55
            return {
                x: at.x + rand(-54,
                    54) * k * narrow, y
            }
        }
        await Promise.all([
            bloom(ctx.layer,
                at,
                ctx.color,
                300 * k,
                620),
            mist(ctx.layer,
                {
                    x: at.x, y: at.y + 40 * k
                },
                {
                    color: [ctx.color,
                        FOAM], size: 190 * k, alpha: .34
                }),
            dustStream(ctx.layer,
                column,
                720,
                3600,
                {
                    color: waterOf(ctx), speed: [40,
                        150], angle: [-Math.PI * .58,
                        -Math.PI * .42], life: [240,
                        520], size: [7,
                        2], alpha: 1, flow: 30
                }),
            tween(620,
                (t) => { top = at.y + 60 * k - Math.sin(t * Math.PI * .5) * 300 * k },
                ease.out,
                ctx.layer),
            ...ctx.to.map(async (to, i) => {
                let p = {
                    ...at
                }
                await Promise.all([
                    dustStream(ctx.layer,
                        () => p,
                        700,
                        900,
                        {
                            color: [0xb78bff,
                                0xe4d2ff,
                                ctx.color], speed: [4,
                                30], life: [240,
                                520], size: [7,
                                2], alpha: 1, spread: 11, flow: 26
                        }),
                    tween(700 + i * 60,
                        (t) => { p = arc(at,
                            to,
                            t,
                            120 * k) },
                        ease.inOut,
                        ctx.layer)
                ])
                await bloom(ctx.layer,
                    to,
                    0xb78bff,
                    210 * k,
                    420)
            })
        ])
    })

/** R: sóng thần thật, mặt nước, bụi nước và bọt trắng dâng cả bàn; mép sóng chạm hàng địch thì báo nhịp trúng */
registerVfx("namiTsunami",
    async (ctx) => {
        const k = kOf(ctx)
        const W = ctx.app.screen.width, H = ctx.app.screen.height
        const dir = ctx.from.y > H / 2 ? -1 : 1
        const start = dir < 0 ? H + 80 : -80
        const end = dir < 0 ? -H * .34 : H * 1.34
        const up = dir < 0 ? -Math.PI / 2 : Math.PI / 2
        let front = start
        let clock = 0
        let landed = false
        const crest = (x: number) => front + (Math.sin(x * .012 + clock * 7) * 26 + Math.sin(x * .029 - clock * 11) * 13) * -dir
        const onCrest = (behind: number) => () => {
            const x = rand(-20,
                W + 20)
            return {
                x, y: crest(x) - dir * rand(0,
                    behind)
            }
        }
        ctx.shake(10,
            1100)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color2 ?? FOAM,
                380 * k,
                460),
            dustStream(ctx.layer,
                onCrest(30),
                1250,
                5200,
                {
                    color: [FOAM,
                        0xffffff,
                        ctx.color], speed: [80,
                        340], angle: [up - .55,
                        up + .55], gravity: -dir * 620, life: [260,
                        620], size: [7,
                        2], alpha: 1, flow: 40, additive: false
                }),
            dustStream(ctx.layer,
                onCrest(260),
                1250,
                7000,
                {
                    color: [ctx.color,
                        DEEP,
                        0x4fd0f5], speed: [30,
                        160], angle: [up - .9,
                        up + .9], life: [300,
                        720], size: [9,
                        3], alpha: .85, flow: 70
                }),
            dustStream(ctx.layer,
                onCrest(180),
                1250,
                800,
                {
                    puff: true, color: [ctx.color,
                        DEEP,
                        DEEP], speed: [10,
                        70], angle: [up - .7,
                        up + .7], life: [420,
                        820], size: [190,
                        380],
                    alpha: .62, flow: 30, additive: false
                }),
            tween(1250,
                (t) => {
                    clock = t * 1.25
                    front = lerp(start,
                        end,
                        t)
                    if (!landed && ctx.to.length && (dir < 0 ? front <= ctx.to[0].y : front >= ctx.to[0].y)) {
                        landed = true
                        ctx.onBeat?.()
                    }
                },
                ease.inOut,
                ctx.layer)
        ])
    })

/** R trúng từng tướng: khối nước đổ sập, vệt tím Dễ Tổn Thương lẫn trong bụi nước */
registerVfx("namiTsunamiHit",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                170 * k,
                260),
            mist(ctx.layer,
                ctx.from,
                {
                    color: [ctx.color,
                        FOAM], size: 170 * k,
                    alpha: .3,
                    additive: false, speed: [20,
                        110]
                }),
            droplets(ctx,
                ctx.from,
                300,
                1.2),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 130, color: [0xb06bff,
                        0xe6d4ff], speed: [30,
                        130], life: [520,
                        1000], size: [6,
                        2], alpha: .95, spread: 72 * k, flow: 60
                })
        ])
    })

/** Dễ Tổn Thương riêng lẻ: bụi tím bám quanh tướng */
registerVfx("namiExpose",
    async (ctx) => {
        const k = kOf(ctx)
        await dustBurst(ctx.layer,
            ctx.from,
            {
                count: 200, color: [ctx.color,
                    ctx.color2 ?? 0xe6d4ff], speed: [12,
                    70], life: [560,
                    1000], size: [6,
                    2], alpha: .95, spread: 92 * k, flow: 64
            })
    })
