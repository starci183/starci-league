// VFX riêng của Vel'Koz bám sát League of Legends: plasma Hư Không tím hồng lõi trắng. Q tách đôi vuông góc khi chạm, khe nứt lan dần rồi sập, tia R phóng từ con mắt, vật chất rã thành bụi. Không dùng nét vẽ hình học.
// Mỗi hiệu ứng chỉ dựa vào VfxCtx và tự dọn khi layer bị huỷ; trúng là báo ctx.onBeat, không chờ đuôi hạt tan. Số Phân Rã truyền qua ctx.amount.
import {
    bloom, dustBurst, dustStream, mist, type DustOpts
} from "./fx_dust"
import {
    ease, lerp, makeSprite, pick, rand, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const TAU = Math.PI * 2
const MAGENTA = 0xff2fa8
const VIOLET = 0x8b3dff
const ORCHID = 0xd86bff
const HOT = 0xffd9f4
const WHITE = 0xffffff
const VOID = [0x12041f,
    0x1d0733,
    0x2a0b4a]
const PLASMA = [MAGENTA,
    VIOLET,
    ORCHID]
/** Nửa bề rộng, nửa chiều cao lá tướng trên bàn */
const CARD_W = 60
const CARD_H = 104
const UP: [number, number] = [-Math.PI * .68,
    -Math.PI * .32]
/** Mỗi lần bám Phân Rã kéo dài chừng này; bên gọi lặp lại theo nhịp này để dấu bám liên tục */
export const VELKOZ_MARK_MS = 900
/** Khoảng cách giữa hai tia R; demo và tia nền dùng chung để số nhảy đúng theo tia */
export const VELKOZ_RAY_GAP_MS = 270
/** Tia R tới mục tiêu sau chừng này */
export const VELKOZ_RAY_HIT_MS = 50
/** Số tia R mặc định, khớp RAYS của engine */
const RAY_COUNT = 6
const LINGER_MS = 1400
/** Nửa Q không có mục tiêu bay chừng này rồi tan */
const FREE_HALF = 300

const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
const dirOf = (a: Pt, b: Pt) => Math.atan2(b.y - a.y,
    b.x - a.x)
const mix = (a: Pt, b: Pt, t: number): Pt => ({
    x: lerp(a.x,
        b.x,
        t), y: lerp(a.y,
        b.y,
        t)
})
const around = (at: Pt, r: number): Pt => {
    const a = rand(0,
            TAU), d = Math.sqrt(Math.random()) * r
    return {
        x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d
    }
}
/** Một điểm ngẫu nhiên trên lá tướng */
const onCard = (at: Pt): Pt => ({
    x: at.x + rand(-1,
        1) * CARD_W, y: at.y + rand(-1,
        1) * CARD_H
})

/** Bụi rã: hạt rất mịn bong khỏi vật chất rồi bay lên, tan dần */
const flakes = (over: Partial<DustOpts> = {
}): DustOpts => ({
    color: [MAGENTA,
        ORCHID,
        HOT,
        VIOLET], speed: [14,
        90], angle: UP, gravity: -70, drag: 1.3, flow: 62, life: [520,
        1100], size: [4.5,
        1.1], alpha: 1, ...over
})
/** Mảnh vật chất sắc vỡ ra */
const shards = (over: Partial<DustOpts> = {
}): DustOpts => ({
    color: [MAGENTA,
        VIOLET,
        HOT], speed: [160,
        520], drag: 3, flow: 40, life: [260,
        560], size: [20,
        5], blade: true, alpha: .95, additive: false, ...over
})
/** Vệt plasma thẳng nằm theo hướng tia; không có luồng xoáy nên tia giữ thẳng và mảnh */
const beamStreak = (dir: number, over: Partial<DustOpts> = {
}): DustOpts => ({
    color: PLASMA, speed: [30,
        110], angle: [dir - .012,
        dir + .012], flow: 0, drag: .4, life: [90,
        170], size: [6,
        3], streak: 9, alpha: 1, ...over
})

/** Laser: vệt hạt dày phủ đoạn a..b, lệch ngang `width` */
function laser(ctx: VfxCtx, a: Pt, b: Pt, ms: number, perSec: number, width: number, over: Partial<DustOpts> = {
}) {
    const dir = dirOf(a,
        b)
    const nx = -Math.sin(dir), ny = Math.cos(dir)
    return dustStream(ctx.layer,
        () => {
            const p = mix(a,
                b,
                Math.random())
            const off = rand(-width,
                width)
            return {
                x: p.x + nx * off, y: p.y + ny * off
            }
        },
        ms,
        perSec,
        beamStreak(dir,
            over))
}

/** Quầng sáng dài, mềm, bám đoạn a..b; không có viền */
function beamBed(ctx: VfxCtx, a: Pt, b: Pt, color: number, thick: number) {
    const mid = mix(a,
        b,
        .5)
    const len = Math.hypot(b.x - a.x,
        b.y - a.y) * 1.25
    const s = makeSprite(ctx.layer,
        "glow",
        mid.x,
        mid.y,
        color,
        len)
    s.width = len
    s.height = thick
    s.rotation = dirOf(a,
        b)
    s.alpha = 0
    return s
}

/** Quầng sáng mềm bám theo đầu đạn */
function headGlow(ctx: VfxCtx, at: Pt, width: number) {
    const parts = [
        makeSprite(ctx.layer,
            "glow",
            at.x,
            at.y,
            VIOLET,
            width * 6),
        makeSprite(ctx.layer,
            "glow",
            at.x,
            at.y,
            MAGENTA,
            width * 3.6),
        makeSprite(ctx.layer,
            "glow",
            at.x,
            at.y,
            WHITE,
            width * 1.6)
    ]
    return {
        move(p: Pt) {
            for (const s of parts) if (!s.destroyed) s.position.set(p.x,
                p.y)
        },
        hide() {
            for (const s of parts) if (!s.destroyed) s.visible = false
        }
    }
}

/** Mũi plasma: lõi trắng, thân hồng, đuôi tím, bụi bong ra sau. Dùng cho Q và hai nửa tách */
async function lance(ctx: VfxCtx, a: Pt, b: Pt, ms: number, width: number, arrive: () => void, easing = ease.in) {
    const dir = dirOf(a,
        b)
    const back = dir + Math.PI
    let p = {
        ...a
    }
    const glow = headGlow(ctx,
        a,
        width)
    const near = () => around(p,
        width * .5)
    await Promise.all([
        dustStream(ctx.layer,
            near,
            ms,
            1300,
            beamStreak(back,
                {
                    speed: [120,
                        360], angle: [back - .05,
                        back + .05], life: [140,
                        300], size: [width * .8,
                        width * .3], streak: 7, drag: 1.2
                })),
        dustStream(ctx.layer,
            near,
            ms,
            420,
            beamStreak(back,
                {
                    color: [WHITE,
                        HOT], speed: [60,
                        200], life: [80,
                        160], size: [width * .55,
                        width * .2], streak: 8
                })),
        dustStream(ctx.layer,
            near,
            ms,
            460,
            flakes({
                speed: [14,
                    80], angle: [0,
                    TAU], spread: width, life: [320,
                    720]
            })),
        tween(ms,
            (t) => {
                p = mix(a,
                    b,
                    t)
                glow.move(p)
            },
            easing,
            ctx.layer).then(() => {
            glow.hide()
            arrive()
        })
    ])
}

/** Con mắt tụ năng lượng: hạt hút vào tâm rồi loé. intensity cao thì tụ lâu hơn */
registerVfx("velkozEyeCharge",
    async (ctx) => {
        const k = kOf(ctx)
        const ms = 200 * ctx.intensity
        const eye = ctx.from
        let u = 0
        await Promise.all([
            bloom(ctx.layer,
                eye,
                MAGENTA,
                200 * k,
                ms + 140),
            bloom(ctx.layer,
                eye,
                WHITE,
                70 * k,
                ms + 60),
            dustStream(ctx.layer,
                () => {
                    const a = rand(0,
                        TAU)
                    const r = lerp(190,
                        70,
                        u) * k
                    return {
                        x: eye.x + Math.cos(a) * r, y: eye.y + Math.sin(a) * r
                    }
                },
                ms,
                1500,
                {
                    color: [MAGENTA,
                        ORCHID,
                        HOT], speed: [0,
                        6], flow: 26, drag: .4, life: [110,
                        210], size: [5,
                        1.4], alpha: 1
                }),
            dustStream(ctx.layer,
                () => around(eye,
                    46 * k),
                ms,
                900,
                flakes({
                    speed: [6,
                        36], angle: [0,
                        TAU], gravity: 0, life: [150,
                        300]
                })),
            tween(ms,
                (t) => { u = t },
                ease.in,
                ctx.layer)
        ])
    })

/** Q: mũi plasma mảnh, nhanh; chạm mục tiêu là báo nhịp */
registerVfx("velkozPlasmaBolt",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all((ctx.to.length ? ctx.to : [ctx.from]).map((to) => lance(ctx,
            ctx.from,
            to,
            340,
            15 * k,
            () => ctx.onBeat?.())))
    })

/** Q tách: tia chia đôi đúng tại điểm chạm, hai nửa bắn ngược nhau; một nửa trúng to[0] (báo nhịp), nửa kia bay hết tầm rồi tan */
registerVfx("velkozFission",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        const target = ctx.to[0]
        const dir = target ? dirOf(at,
            target) : 0
        const free: Pt = {
            x: at.x - Math.cos(dir) * FREE_HALF * k, y: at.y - Math.sin(dir) * FREE_HALF * k
        }
        const hit = target ?? {
            x: at.x * 2 - free.x, y: at.y * 2 - free.y
        }
        const ms = 300
        await Promise.all([
            bloom(ctx.layer,
                at,
                HOT,
                190 * k,
                200),
            lance(ctx,
                at,
                hit,
                ms,
                15 * k,
                () => ctx.onBeat?.(),
                ease.out),
            lance(ctx,
                at,
                free,
                ms,
                15 * k,
                () => {},
                ease.out).then(() => dustBurst(ctx.layer,
                free,
                {
                    count: 90, ...flakes({
                        speed: [20,
                            120], angle: [0,
                            TAU], spread: 18
                    })
                }))
        ])
    })

/** Q trúng: plasma vỡ, mảnh sắc toả ra, bụi rã bay lên */
registerVfx("velkozPlasmaHit",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(4,
            150)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                MAGENTA,
                290 * k,
                320),
            bloom(ctx.layer,
                ctx.from,
                WHITE,
                110 * k,
                190),
            mist(ctx.layer,
                ctx.from,
                {
                    color: VOID, size: 150 * k, alpha: .5, additive: false, speed: [20,
                        80], count: 10
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...shards(), count: Math.round(70 * ctx.intensity), spread: 14
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...beamStreak(0,
                        {
                            angle: [0,
                                TAU], speed: [240,
                                680], drag: 2.6, life: [160,
                                340], size: [6,
                                2], streak: 6
                        }), count: 150
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...flakes({
                        speed: [30,
                            170], angle: [0,
                            TAU], spread: 44 * k
                    }), count: Math.round(260 * ctx.intensity)
                })
        ])
    })

/** Đường nứt khe: lệch răng cưa không đều, u chạy 0..1 */
function riftLine(a: Pt, b: Pt) {
    const dir = dirOf(a,
        b)
    const nx = -Math.sin(dir), ny = Math.cos(dir)
    const s1 = rand(0,
            TAU), s2 = rand(0,
            TAU)
    return (u: number, off = 0): Pt => {
        const p = mix(a,
            b,
            u)
        const jag = (Math.sin(u * 11 + s1) * 11 + Math.sin(u * 27 + s2) * 6) * Math.sin(u * Math.PI) + off
        return {
            x: p.x + nx * jag, y: p.y + ny * jag
        }
    }
}

/** Khe nứt mở dọc đường line tới phần `reach()`: lòng khe đen, viền hồng, sống lâu nên khe còn đó sau khi mũi nứt đi qua */
function riftBody(ctx: VfxCtx, line: ReturnType<typeof riftLine>, reach: () => number, ms: number, width: number) {
    const dir = dirOf(line(0),
        line(1))
    const inside = (spread: number) => () => line(Math.random() * reach(),
        rand(-spread,
            spread))
    const front = () => {
        const f = reach()
        return line(Math.max(0,
            f - rand(0,
                .1)),
        rand(-width * .7,
            width * .7))
    }
    return Promise.all([
        dustStream(ctx.layer,
            inside(width * .5),
            ms,
            90,
            {
                puff: true, color: VOID, speed: [2,
                    16], life: [460,
                    820], size: [width * 1.3,
                    width * 2.6], alpha: .62, flow: 10, additive: false
            }),
        dustStream(ctx.layer,
            inside(width * .32),
            ms,
            1500,
            beamStreak(dir,
                {
                    speed: [10,
                        60], life: [240,
                        520], size: [7,
                        2.4], streak: 5, alpha: .95
                })),
        dustStream(ctx.layer,
            inside(width * .12),
            ms,
            620,
            beamStreak(dir,
                {
                    color: [WHITE,
                        HOT], speed: [10,
                        50], life: [160,
                        340], size: [4,
                        1.6], streak: 7
                })),
        dustStream(ctx.layer,
            front,
            ms,
            520,
            beamStreak(-Math.PI / 2,
                {
                    speed: [260,
                        620], angle: [-Math.PI * .62,
                        -Math.PI * .38], drag: 2.2, life: [170,
                        340], size: [7,
                        2], streak: 6
                })),
        dustStream(ctx.layer,
            inside(width),
            ms,
            520,
            flakes({
                speed: [18,
                    100], life: [460,
                    900]
            }))
    ])
}

/** Khe sập: tia từ lòng khe phụt thẳng lên dọc đường nứt */
function riftCollapse(ctx: VfxCtx, line: ReturnType<typeof riftLine>, from: number, power: number) {
    return dustStream(ctx.layer,
        () => line(rand(from,
            1)),
        170,
        2600,
        beamStreak(-Math.PI / 2,
            {
                speed: [280 * power,
                    900 * power], angle: [-Math.PI * .6,
                    -Math.PI * .4], drag: 2, life: [190,
                    400], size: [9,
                    2.4], streak: 7
            }))
}

/** E: khe nứt lan từ Vel'Koz tới mục tiêu; mũi nứt chạm lá là khe sập và báo nhịp */
registerVfx("velkozRiftTear",
    async (ctx) => {
        const k = kOf(ctx)
        const to = ctx.to[0] ?? ctx.from
        const line = riftLine(mix(ctx.from,
            to,
            .14),
        to)
        const ms = 520
        let u = 0
        await Promise.all([
            riftBody(ctx,
                line,
                () => u,
                ms,
                34 * k),
            tween(ms,
                (t) => { u = t },
                ease.inOut,
                ctx.layer).then(() => {
                ctx.onBeat?.()
                return riftCollapse(ctx,
                    line,
                    .25,
                    1)
            })
        ])
    })

/** Khe nứt trúng: Hư Không phun lên từ dưới lá; ctx.amount = 2 là nhịp cuối lượt, mạnh hơn */
registerVfx("velkozRiftHit",
    async (ctx) => {
        const k = kOf(ctx) * ((ctx.amount ?? 1) > 1 ? 1.25 : 1)
        ctx.shake(5 * k,
            200)
        await Promise.all([
            mist(ctx.layer,
                ctx.from,
                {
                    color: VOID, size: 210 * k, alpha: .66, additive: false, gravity: -40, speed: [30,
                        110], count: 12
                }),
            bloom(ctx.layer,
                ctx.from,
                MAGENTA,
                340 * k,
                360),
            bloom(ctx.layer,
                ctx.from,
                WHITE,
                120 * k,
                200),
            dustBurst(ctx.layer,
                {
                    x: ctx.from.x, y: ctx.from.y + CARD_H * .6
                },
                {
                    ...beamStreak(-Math.PI / 2,
                        {
                            speed: [360,
                                1100], angle: [-Math.PI * .66,
                                -Math.PI * .34], drag: 2.2, life: [220,
                                460], size: [9,
                                2.4], streak: 7
                        }), count: Math.round(300 * k), spread: 52
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...shards({
                        angle: [-Math.PI * .9,
                            -Math.PI * .1]
                    }), count: Math.round(70 * k), spread: 30
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...flakes({
                        speed: [30,
                            180], spread: 60 * k
                    }), count: Math.round(300 * k)
                })
        ])
    })

/** Khe còn nằm trên lá chờ tới cuối lượt: lòng đen, viền hồng thở, bụi bị hút dần vào. Có ctx.tether thì chạy tới khi được thả */
registerVfx("velkozRiftLinger",
    async (ctx) => {
        const at = () => ctx.tether?.target() ?? ctx.from
        const limit = ctx.tether ? 11000 : LINGER_MS
        const start = at()
        const line = riftLine({
            x: start.x - 16, y: start.y - CARD_H * .95
        },
        {
            x: start.x + 16, y: start.y + CARD_H * .95
        })
        const pieces: Promise<unknown>[] = []
        const step = 240
        let el = 0
        while (!ctx.layer.destroyed && !ctx.tether?.released() && el < limit) {
            pieces.push(riftBody(ctx,
                line,
                () => 1,
                step,
                20),
            dustStream(ctx.layer,
                () => onCard(at()),
                step,
                240,
                flakes({
                    color: [ORCHID,
                        VIOLET,
                        MAGENTA], speed: [4,
                        30], angle: [0,
                        TAU], gravity: -20, life: [300,
                        620]
                })))
            await tween(step,
                () => {},
                ease.linear,
                ctx.layer)
            el += step
        }
        await Promise.all(pieces)
    })

/** E nhịp cuối lượt: khe rách toạc lại trên lá, hạt bị hút vào rồi sập; xong đoạn rách là báo nhịp */
registerVfx("velkozRiftPulse",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        const line = riftLine({
            x: at.x - 20, y: at.y + CARD_H * 1.05
        },
        {
            x: at.x + 20, y: at.y - CARD_H * 1.05
        })
        const ms = 300
        let u = 0
        await Promise.all([
            riftBody(ctx,
                line,
                () => u,
                ms,
                38 * k),
            dustStream(ctx.layer,
                () => {
                    const a = rand(0,
                        TAU)
                    return {
                        x: at.x + Math.cos(a) * lerp(210,
                            40,
                            u), y: at.y + Math.sin(a) * lerp(210,
                            40,
                            u)
                    }
                },
                ms,
                1100,
                {
                    color: PLASMA, speed: [0,
                        8], flow: 18, drag: .4, life: [110,
                        200], size: [5,
                        1.4], alpha: 1
                }),
            tween(ms,
                (t) => { u = t },
                ease.in,
                ctx.layer).then(() => {
                ctx.onBeat?.()
                return riftCollapse(ctx,
                    line,
                    0,
                    1.2)
            })
        ])
    })

/** Vị trí cụm Phân Rã thứ i: các cụm lượn quanh lá, tính theo đồng hồ chung nên lần phát sau nối đúng lần trước */
function markSpot(at: Pt, i: number, n: number): Pt {
    const a = performance.now() * .0016 + i / n * TAU
    return {
        x: at.x + Math.cos(a) * CARD_W * .95, y: at.y + Math.sin(a) * CARD_H * .74
    }
}

/** Nội tại: mỗi Phân Rã (ctx.amount) là một cụm plasma lượn quanh lá, bụi rã bong dày dần khắp lá */
registerVfx("velkozDecayMark",
    async (ctx) => {
        const stacks = Math.max(1,
            Math.min(3,
                Math.round(ctx.amount ?? 1)))
        const at = () => ctx.tether?.target() ?? ctx.from
        const clumps = Array.from({
            length: stacks
        },
        (_, i) => {
            const spot = () => markSpot(at(),
                i,
                3)
            const start = spot()
            const glow = makeSprite(ctx.layer,
                "glow",
                start.x,
                start.y,
                MAGENTA,
                66)
            const core = makeSprite(ctx.layer,
                "glow",
                start.x,
                start.y,
                WHITE,
                22)
            return Promise.all([
                dustStream(ctx.layer,
                    spot,
                    VELKOZ_MARK_MS,
                    260,
                    flakes({
                        speed: [8,
                            46], angle: [0,
                            TAU], gravity: -46, spread: 8, life: [260,
                            560], size: [5.5,
                            1.3]
                    })),
                tween(VELKOZ_MARK_MS,
                    () => {
                        const p = spot()
                        for (const s of [glow,
                            core]) if (!s.destroyed) s.position.set(p.x,
                            p.y)
                    },
                    ease.linear,
                    ctx.layer).then(() => {
                    for (const s of [glow,
                        core]) if (!s.destroyed) s.visible = false
                })
            ])
        })
        await Promise.all([
            ...clumps,
            dustStream(ctx.layer,
                () => onCard(at()),
                VELKOZ_MARK_MS,
                110 * stacks * stacks,
                flakes()),
            dustStream(ctx.layer,
                () => onCard(at()),
                VELKOZ_MARK_MS,
                16 * stacks * stacks,
                shards({
                    speed: [20,
                        80], angle: UP, gravity: -60, drag: 1, flow: 30, life: [420,
                        800], size: [9,
                        3]
                })),
            stacks >= 2 ? dustStream(ctx.layer,
                () => onCard(at()),
                VELKOZ_MARK_MS,
                stacks * 7,
                {
                    puff: true, color: VOID, speed: [4,
                        24], angle: UP, gravity: -30, life: [460,
                        800], size: [46,
                        110], alpha: .3, flow: 16, additive: false
                }) : Promise.resolve()
        ])
    })

/** Nội tại đủ tầng: cả lá rã ra một lần, loé trắng, sát thương chuẩn đáp cùng lúc */
registerVfx("velkozDecayBurst",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(8,
            280)
        await Promise.all([
            mist(ctx.layer,
                ctx.from,
                {
                    color: VOID, size: 230 * k, alpha: .4, additive: false, speed: [40,
                        150], count: 12
                }),
            bloom(ctx.layer,
                ctx.from,
                WHITE,
                460 * k,
                360),
            bloom(ctx.layer,
                ctx.from,
                MAGENTA,
                360 * k,
                460),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...beamStreak(0,
                        {
                            color: [WHITE,
                                HOT,
                                HOT,
                                MAGENTA], angle: [0,
                                TAU], speed: [320,
                                1000], drag: 2.6, life: [200,
                                420], size: [8,
                                2], streak: 6
                        }), count: 320, spread: 24
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...shards({
                        color: [WHITE,
                            HOT,
                            MAGENTA], speed: [200,
                            640]
                    }), count: 120, spread: 30
                }),
            dustStream(ctx.layer,
                () => onCard(ctx.from),
                120,
                3000,
                flakes({
                    color: [WHITE,
                        HOT,
                        MAGENTA,
                        ORCHID], speed: [30,
                        200], life: [420,
                        900], size: [5,
                        1.2]
                }))
        ])
    })

/** Luật chết: người mang gục, nửa số Phân Rã (ctx.amount) tan khỏi lá */
registerVfx("velkozDecayShed",
    async (ctx) => {
        const lost = Math.max(1,
            ctx.amount ?? 1)
        const puffs = Array.from({
            length: Math.ceil(lost)
        },
        () => markSpot(ctx.from,
            Math.floor(rand(0,
                3)),
            3))
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                VIOLET,
                220,
                340),
            ...puffs.map(p => dustBurst(ctx.layer,
                p,
                {
                    count: 240, ...flakes({
                        speed: [60,
                            360], angle: [0,
                            TAU], gravity: 70, drag: 1.5, life: [620,
                            1200], spread: 14
                    })
                })),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...flakes({
                        speed: [20,
                            110], angle: [Math.PI * .2,
                            Math.PI * .8], gravity: 150, spread: 70, life: [520,
                            1000]
                    }), count: 220
                })
        ])
    })

/** Đầu tia dừng ở mép lá gần caster, chừa phần trên lá cho số nổi và mặt tướng */
function stopShort(from: Pt, to: Pt): Pt {
    const dir = dirOf(from,
        to)
    return {
        x: to.x - Math.cos(dir) * CARD_H * .55, y: to.y - Math.sin(dir) * CARD_H * .55
    }
}

/** R mỗi tia: một tia laser mảnh quét vào điểm ngẫu nhiên trên lá; chạm là báo nhịp */
registerVfx("velkozRay",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all((ctx.to.length ? ctx.to : [ctx.from]).map(async (to) => {
            const start = around(ctx.from,
                26 * k)
            const stop = stopShort(ctx.from,
                to)
            const tip = {
                x: stop.x + rand(-1,
                    1) * CARD_W * .7, y: stop.y + rand(-1,
                    1) * 22
            }
            const bed = beamBed(ctx,
                start,
                tip,
                MAGENTA,
                44 * k)
            await Promise.all([
                laser(ctx,
                    start,
                    tip,
                    130,
                    3000,
                    5 * k,
                    {
                        size: [7,
                            3]
                    }),
                laser(ctx,
                    start,
                    tip,
                    130,
                    1100,
                    1.6 * k,
                    {
                        color: [WHITE,
                            HOT], size: [4.5,
                            2], streak: 13
                    }),
                tween(VELKOZ_RAY_HIT_MS,
                    (t) => { bed.alpha = t * .75 },
                    ease.linear,
                    ctx.layer).then(() => {
                    ctx.onBeat?.()
                    return tween(170,
                        (t) => { bed.alpha = (1 - t) * .75 },
                        ease.linear,
                        ctx.layer)
                })
            ])
        }))
    })

/** R trúng một tia: mảnh và bụi rã bật khỏi lá, không rung mạnh để giữ nhịp tia */
registerVfx("velkozRayHit",
    async (ctx) => {
        ctx.shake(2.5,
            90)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                MAGENTA,
                170,
                200),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...shards({
                        size: [14,
                            4]
                    }), count: 22, spread: 40
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...flakes({
                        speed: [30,
                            150], spread: 56
                    }), count: 56
                })
        ])
    })

/** R tia nền: luồng sáng chạy suốt các tia (ctx.amount tia), đầu tia liếm trên lá, vật chất bị thổi ngược ra; không báo nhịp vì từng tia tự báo */
registerVfx("velkozRayBeam",
    async (ctx) => {
        const k = kOf(ctx)
        const to = stopShort(ctx.from,
            ctx.to[0] ?? ctx.from)
        const ms = (ctx.amount ?? RAY_COUNT) * VELKOZ_RAY_GAP_MS + 120
        const dir = dirOf(ctx.from,
            to)
        const back = dir + Math.PI
        const nx = -Math.sin(dir), ny = Math.cos(dir)
        let sway = 0
        const beamPt = (width: number) => () => {
            const u = Math.random()
            const off = rand(-width,
                width) + Math.sin(u * 9 + sway * 7) * 3
            const p = mix(ctx.from,
                to,
                u)
            return {
                x: p.x + nx * off + nx * sway * 30 * u, y: p.y + ny * off + ny * sway * 30 * u
            }
        }
        const tip = () => around({
            x: to.x + nx * sway * 30, y: to.y + ny * sway * 30
        },
        30)
        const halo = beamBed(ctx,
            ctx.from,
            to,
            VIOLET,
            120 * k)
        const core = beamBed(ctx,
            ctx.from,
            to,
            MAGENTA,
            58 * k)
        const heart = beamBed(ctx,
            ctx.from,
            to,
            WHITE,
            20 * k)
        const muzzle = makeSprite(ctx.layer,
            "glow",
            ctx.from.x,
            ctx.from.y,
            HOT,
            110 * k)
        await Promise.all([
            dustStream(ctx.layer,
                beamPt(13 * k),
                ms,
                3400,
                beamStreak(dir)),
            dustStream(ctx.layer,
                beamPt(4 * k),
                ms,
                1600,
                beamStreak(dir,
                    {
                        color: [WHITE,
                            HOT], size: [5,
                            2.2], streak: 12
                    })),
            dustStream(ctx.layer,
                beamPt(26 * k),
                ms,
                900,
                beamStreak(dir,
                    {
                        color: [VIOLET,
                            ORCHID], size: [4,
                            1.5], streak: 11, life: [120,
                            240], alpha: .8
                    })),
            dustStream(ctx.layer,
                tip,
                ms,
                520,
                beamStreak(back,
                    {
                        speed: [200,
                            620], angle: [back - .7,
                            back + .7], drag: 2.4, life: [130,
                            280], size: [6,
                            2], streak: 5
                    })),
            dustStream(ctx.layer,
                tip,
                ms,
                340,
                flakes({
                    speed: [30,
                        170], spread: 26, life: [420,
                        860]
                })),
            tween(ms,
                (t) => {
                    sway = Math.sin(t * Math.PI * 3)
                    const fade = Math.min(1,
                        t * 14,
                        (1 - t) * 10)
                    const flicker = .8 + Math.sin(t * 90) * .1 + pick([-.08,
                        0,
                        .08])
                    halo.alpha = fade * .45
                    core.alpha = fade * flicker
                    heart.alpha = fade * flicker
                    muzzle.alpha = fade * flicker
                },
                ease.linear,
                ctx.layer).then(() => {
                for (const s of [halo,
                    core,
                    heart,
                    muzzle]) s.visible = false
            })
        ])
    })
