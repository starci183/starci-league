// VFX riêng của Kog'Maw, bám LoL: chất liệu AXIT lỏng đặc xanh chanh, vàng nhạt, rêu sẫm lấy từ icon Q và R; Đói và cái chết dùng màu Hư Không hồng tím của icon nội tại.
// Bãi axit là khối hạt mềm chồng nhau, méo theo đà bay, không dùng nét vẽ hình học. R rơi từ trời thành cột axit lượn như icon, E vồng cao qua các đường, chết thì nổ tung như Icathian Surprise rồi Đói tụ lại trên xác.
// ctx.amount: số Đói nhận (kogHungerGain), Đói đang có (kogHungerCharge, kogHungerBite, kogBarrageHit, kogDeathBurst), % Máu đã mất (kogArtilleryHit), thời gian buff (kogBarrageAura).
// Trúng là báo ctx.onBeat đúng lúc chạm, không chờ đuôi hạt tan; mọi thứ tự dọn khi layer bị huỷ.
import type {
    Sprite
} from "pixi.js"
import {
    bloom, dustBurst, dustStream, type DustOpts
} from "./fx_dust"
import {
    ease, lerp, makeSprite, rand, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const TAU = Math.PI * 2
const ACID = 0xa8e822
const LIME = 0xd6ff3c
const PALE = 0xf6ffa8
const GREEN = 0x4fb82a
const MOSS = 0x1f6e2c
const MURK = 0x0e3a30
const PINK = 0xff4fd2
const MAGENTA = 0xd02ae0
const VIOLET = 0x6a2cc8
const INK = 0x1c0b30
const ACIDS = [ACID,
    LIME,
    GREEN]
const VOIDS = [PINK,
    MAGENTA,
    VIOLET]
/** Vảy giáp bị axit ăn bong ra */
const FLAKES = [0xb9c4b0,
    0x8c9a7e,
    0xe4ecc8,
    ACID]
/** Nửa bề rộng, nửa chiều cao lá tướng trên bàn */
const CARD_W = 62
const CARD_H = 84
const AURA_MAX_MS = 9000
const AURA_DEFAULT_MS = 2400

const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
/** Đói làm đòn to dần: 0 Đói bằng gốc, 45 Đói gấp ba */
const hungerPower = (ctx: VfxCtx) => kOf(ctx) * (1 + Math.min(ctx.amount ?? 0,
    45) / 22)
const around = (at: Pt, r: number): Pt => {
    const a = rand(0,
            TAU), d = Math.sqrt(Math.random()) * r
    return {
        x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d
    }
}
const onCard = (at: Pt): Pt => ({
    x: at.x + rand(-CARD_W,
        CARD_W), y: at.y + rand(-CARD_H,
        CARD_H)
})
const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({
    x: lerp(a.x,
        b.x,
        t), y: lerp(a.y,
        b.y,
        t)
})

/** Giọt axit đặc: to, đục, rơi nặng */
const DRIP: DustOpts = {
    color: ACIDS, speed: [20,
        120], gravity: 980, drag: .7, flow: 24, life: [380,
        800], size: [13,
        4], alpha: 1, additive: false
}
const drip = <T extends Partial<DustOpts>>(over: T = {
} as T) => ({
        ...DRIP, ...over
    })
/** Khói axit: sương rêu sẫm bốc lên */
const fume = (over: Partial<DustOpts> = {
}): DustOpts => ({
    color: [GREEN,
        MOSS,
        MURK], speed: [10,
        50], gravity: -70, life: [420,
        900], size: [24,
        56], alpha: .24, flow: 26, additive: false, ...over
})
/** Hơi Hư Không: hạt mềm lớn thay cho mist, vì texture sương cắt vuông ở mép, chồng màu tối là lộ khung */
const haze = (ctx: VfxCtx, at: Pt, size: number, count: number, colors = [MAGENTA,
    VIOLET]) => dustBurst(ctx.layer,
    at,
    {
        count, color: colors, speed: [30,
            150], drag: 2, flow: 40, life: [320,
            680], size: [size * .24,
            size * .42], alpha: .24, spread: size * .3, additive: false
    })

/** Lưỡi Hư Không: vệt hạt hồng tím mảnh, uốn theo luồng xoáy */
const WISP: DustOpts = {
    color: VOIDS, speed: [14,
        70], drag: 1.8, flow: 120, life: [220,
        480], size: [17,
        4], streak: 2.6, alpha: .95, additive: false
}
const wisp = <T extends Partial<DustOpts>>(over: T = {
} as T) => ({
        ...WISP, ...over
    })

/** Khối axit: nhiều cụm mềm chồng lên nhau, méo theo hướng bay và nhúc nhích như chất lỏng */
function gob(ctx: VfxCtx, size: number, outer = MOSS, mid = ACID, core = LIME) {
    interface Lump { s: Sprite; ox: number; oy: number; w: number; ph: number }
    const lumps: Lump[] = []
    const add = (n: number, tint: number, w: number, reach: number) => {
        for (let i = 0; i < n; i++) {
            const a = i / n * TAU + rand(-.4,
                    .4), d = rand(.4,
                    1) * reach
            lumps.push({
                s: makeSprite(ctx.layer,
                    "glow",
                    ctx.from.x,
                    ctx.from.y,
                    tint,
                    w,
                    false),
                ox: Math.cos(a) * d, oy: Math.sin(a) * d, w, ph: rand(0,
                    TAU)
            })
        }
    }
    const halo = makeSprite(ctx.layer,
        "glow",
        ctx.from.x,
        ctx.from.y,
        mid,
        size * 3.6)
    halo.alpha = .55
    add(8,
        outer,
        size * 1.5,
        size * .38)
    add(8,
        mid,
        size * 1.25,
        size * .3)
    add(5,
        core,
        size * .85,
        size * .2)
    add(2,
        PALE,
        size * .42,
        size * .12)
    let clock = 0
    return {
        /** dir là hướng bay (rad); bãi axit kéo dài theo đà, đầu tròn đuôi nhọn */
        move(p: Pt, dir: number, stretch = 1.35) {
            clock += .3
            const c = Math.cos(dir), s = Math.sin(dir)
            if (!halo.destroyed) {
                halo.x = p.x
                halo.y = p.y
            }
            for (const l of lumps) {
                if (l.s.destroyed) continue
                const wob = 1 + .16 * Math.sin(clock + l.ph)
                const along = l.ox * stretch * wob - (l.ox < 0 ? size * .22 : 0)
                const side = l.oy / stretch * wob
                l.s.x = p.x + along * c - side * s
                l.s.y = p.y + along * s + side * c
                l.s.width = l.w * wob
                l.s.height = l.w * (2 - wob)
            }
        },
        hide() {
            if (!halo.destroyed) halo.alpha = 0
            for (const l of lumps) if (!l.s.destroyed) l.s.alpha = 0
        }
    }
}

/** Đuôi bãi axit: nước bọt đặc, giọt rơi, hơi rêu; hạt không bay thẳng */
function acidTail(ctx: VfxCtx, head: () => Pt, ms: number, width: number, colors = ACIDS) {
    const near = () => around(head(),
        width * .5)
    return Promise.all([
        dustStream(ctx.layer,
            near,
            ms,
            900,
            {
                color: colors, speed: [6,
                    50], life: [150,
                    340], size: [width * .62,
                    width * .16], alpha: 1, flow: 44, drag: 2.2, additive: false
            }),
        dustStream(ctx.layer,
            near,
            ms,
            260,
            drip({
                color: colors, size: [width * .3,
                    width * .1], life: [300,
                    620], speed: [10,
                    60], gravity: 760
            })),
        dustStream(ctx.layer,
            head,
            ms,
            70,
            fume({
                size: [width * .55,
                    width * 1.1], life: [280,
                    560], alpha: .2, gravity: -20
            }))
    ])
}

/** Bãi axit vỡ: vương miện giọt bắn lên rồi rơi nặng, sương phun mịn, axit loang sang hai bên */
function splash(ctx: VfxCtx, at: Pt, power: number, count: number, colors = ACIDS) {
    return Promise.all([
        bloom(ctx.layer,
            at,
            ACID,
            220 * power,
            300),
        bloom(ctx.layer,
            at,
            PALE,
            120 * power,
            200),
        dustBurst(ctx.layer,
            at,
            {
                ...fume({
                    size: [26 * power,
                        60 * power], speed: [60,
                        200], alpha: .2
                }), count: 22
            }),
        dustBurst(ctx.layer,
            at,
            drip({
                count: Math.round(count * .4), color: colors, speed: [200 * power,
                    640 * power], angle: [-Math.PI * .96,
                    -Math.PI * .04], size: [19 * Math.sqrt(power),
                    5], spread: 22 * power, life: [420,
                    900]
            })),
        dustBurst(ctx.layer,
            at,
            {
                count: Math.round(count * .8), color: [...colors,
                    PALE], speed: [180 * power,
                    620 * power], gravity: 760, drag: 1.6, flow: 40, life: [260,
                    620], size: [22,
                    5], streak: 2.6, alpha: 1, spread: 18 * power, additive: false
            }),
        dustBurst(ctx.layer,
            at,
            {
                count: Math.round(count * .25), color: [PALE,
                    LIME], speed: [60 * power,
                    240 * power], gravity: 300, drag: 2.4, life: [200,
                    420], size: [7,
                    2], alpha: 1, spread: 26 * power
            }),
        ...[0,
            Math.PI].map(a => dustBurst(ctx.layer,
            {
                x: at.x, y: at.y + 26 * power
            },
            {
                count: Math.round(count * .3), color: colors, speed: [160 * power,
                    460 * power], angle: [a - .1,
                    a + .1], drag: 3.4, flow: 24, life: [320,
                    680], size: [30,
                    7], streak: 2.8, alpha: 1, additive: false
            }))
    ])
}

/** Axit bám lá: giọt chảy khắp mặt lá, hơi bốc lên */
function corrode(ctx: VfxCtx, at: Pt, ms: number, perSec: number) {
    return Promise.all([
        dustStream(ctx.layer,
            () => onCard(at),
            ms,
            perSec,
            drip({
                speed: [0,
                    24], gravity: 420, drag: 1.6, life: [360,
                    760], size: [15,
                    5]
            })),
        dustStream(ctx.layer,
            () => onCard(at),
            ms,
            perSec * .08,
            fume({
                size: [20,
                    44], alpha: .22
            }))
    ])
}

/** Đường cong của luồng Đói: lệch ngang rồi hút thẳng vào miệng */
function bend(a: Pt, b: Pt, t: number, side: number): Pt {
    const dx = b.x - a.x, dy = b.y - a.y
    const len = Math.hypot(dx,
        dy) || 1
    const swing = Math.sin(t * Math.PI) * side * Math.min(150,
        len * .35)
    return {
        x: lerp(a.x,
            b.x,
            t) - dy / len * swing, y: lerp(a.y,
            b.y,
            t) + dx / len * swing
    }
}

/** Một luồng Hư Không hút từ `start` vào `home`; trả về khi chạm */
async function suck(ctx: VfxCtx, start: Pt, home: Pt, ms: number, side: number, width: number) {
    let p = {
        ...start
    }
    const glow = makeSprite(ctx.layer,
        "glow",
        start.x,
        start.y,
        PINK,
        width * 3.4)
    glow.alpha = .75
    const tails = Promise.all([
        dustStream(ctx.layer,
            () => around(p,
                width * .4),
            ms,
            460,
            wisp({
                size: [width,
                    width * .24], life: [200,
                    420]
            })),
        dustStream(ctx.layer,
            () => around(p,
                width * .3),
            ms,
            200,
            {
                color: [ACID,
                    PALE], speed: [10,
                    60], life: [180,
                    360], size: [6,
                    2], alpha: 1, flow: 70
            })
    ])
    await tween(ms,
        (t) => {
            p = bend(start,
                home,
                t,
                side)
            if (glow.destroyed) return
            glow.x = p.x
            glow.y = p.y
        },
        ease.in,
        ctx.layer)
    if (!glow.destroyed) glow.alpha = 0
    return tails
}

/** Nội tại: luồng Đói hút vào Kog'Maw. to rỗng là đầu lượt (hút từ quanh mình), có to là từ tướng vừa chết */
registerVfx("kogHungerGain",
    async (ctx) => {
        const home = ctx.from
        const gain = ctx.amount ?? 1
        const k = kOf(ctx) * (1 + Math.min(gain,
            12) / 14)
        const count = ctx.to.length ? Math.max(ctx.to.length * 4,
            4) : 5
        const sources = Array.from({
            length: count
        },
        (_, i) => {
            const src = ctx.to[i % Math.max(1,
                ctx.to.length)]
            if (src) return around(src,
                40)
            const a = i / count * TAU + rand(-.3,
                .3)
            return {
                x: home.x + Math.cos(a) * 190, y: home.y + Math.sin(a) * 170
            }
        })
        const far = Math.max(...sources.map(s => Math.hypot(s.x - home.x,
            s.y - home.y)))
        const ms = Math.min(760,
            420 + far * .32)
        let beat = false
        await Promise.all(sources.map(async (src, i) => {
            const tails = await suck(ctx,
                src,
                home,
                ms + i * 12,
                (i % 2 ? 1 : -1) * rand(.3,
                    .9),
                24 * k)
            if (!beat) {
                beat = true
                ctx.onBeat?.()
                ctx.shake(3 * k,
                    130)
                void bloom(ctx.layer,
                    home,
                    PINK,
                    340 * k,
                    360)
                void bloom(ctx.layer,
                    home,
                    PALE,
                    130 * k,
                    220)
                void dustBurst(ctx.layer,
                    home,
                    wisp({
                        count: Math.round(70 * k), speed: [80 * k,
                            300 * k], spread: 34, size: [20,
                            5]
                    }))
                void dustBurst(ctx.layer,
                    home,
                    drip({
                        count: Math.round(40 * k), speed: [90 * k,
                            300 * k], angle: [-Math.PI * .9,
                            -Math.PI * .1], spread: 26
                    }))
            }
            await tails
        }))
        await tween(420,
            () => {},
            ease.linear,
            ctx.layer)
    })

/** Mở đòn đánh có Đói: Hư Không tụ vào miệng, cùng lúc đạn đánh thường bay đi, không làm trễ đòn */
registerVfx("kogHungerCharge",
    async (ctx) => {
        const p = hungerPower(ctx)
        const at = ctx.from
        await Promise.all([
            bloom(ctx.layer,
                at,
                PINK,
                190 * p,
                300),
            dustBurst(ctx.layer,
                at,
                wisp({
                    count: Math.round(46 * p), speed: [60 * p,
                        230 * p], spread: 30, size: [15,
                        4]
                })),
            haze(ctx,
                at,
                90 * p,
                12)
        ])
    })

/** Đòn có Đói cắn vào mục tiêu: hai hàm răng mảnh sắc hồng trắng sập vào, hơi Hư Không, axit văng; Đói càng nhiều càng to */
registerVfx("kogHungerBite",
    async (ctx) => {
        const p = hungerPower(ctx)
        const at = ctx.from
        ctx.shake(Math.min(8,
            2.2 * p),
        170)
        const gap = 92 * Math.sqrt(p)
        const jaw = (dy: number, angle: number) => dustBurst(ctx.layer,
            {
                x: at.x, y: at.y + dy
            },
            {
                count: Math.round(46 * p), blade: true, color: [0xffffff,
                    PINK,
                    PINK,
                    MAGENTA], speed: [340,
                    640], angle: [angle - .26,
                    angle + .26], drag: 2.6, flow: 8, life: [260,
                    460], size: [62 * Math.sqrt(p),
                    22], alpha: 1, spread: 54 * Math.sqrt(p), additive: false
            })
        await Promise.all([
            jaw(-gap,
                Math.PI / 2),
            jaw(gap,
                -Math.PI / 2),
            bloom(ctx.layer,
                at,
                PINK,
                170 * p,
                280),
            bloom(ctx.layer,
                at,
                0xffffff,
                42 * p,
                150),
            haze(ctx,
                at,
                120 * Math.min(p,
                    1.8),
                16),
            dustBurst(ctx.layer,
                at,
                drip({
                    count: Math.round(44 * p), speed: [120 * p,
                        360 * p], angle: [-Math.PI * .95,
                        -Math.PI * .05], spread: 20, size: [11,
                        3]
                })),
            dustBurst(ctx.layer,
                at,
                wisp({
                    count: Math.round(52 * p), speed: [90 * p,
                        300 * p], spread: 26
                }))
        ])
    })

/** Q mở màn: axit dâng trong miệng, nước dãi nhỏ giọt */
registerVfx("kogSpitCast",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        const ms = 300
        await Promise.all([
            bloom(ctx.layer,
                at,
                ACID,
                210 * k,
                ms),
            dustStream(ctx.layer,
                () => around(at,
                    120),
                ms,
                520,
                {
                    color: ACIDS, speed: [8,
                        30], life: [150,
                        280], size: [9,
                        3], alpha: 1, flow: 150, additive: false
                }),
            dustStream(ctx.layer,
                () => onCard(at),
                ms,
                120,
                drip({
                    life: [240,
                        420], size: [12,
                        4]
                }))
        ])
    })

/** Q Phun Axít: bãi nước bọt vàng chanh đầu tròn đuôi nhọn như icon, bay thẳng, chạm là báo trúng */
registerVfx("kogSpit",
    async (ctx) => {
        const k = kOf(ctx)
        const to = ctx.to[0] ?? ctx.from
        const dist = Math.hypot(to.x - ctx.from.x,
            to.y - ctx.from.y)
        const ms = Math.max(240,
            Math.min(460,
                dist / 1.7))
        const dir = Math.atan2(to.y - ctx.from.y,
            to.x - ctx.from.x)
        const blob = gob(ctx,
            46 * k)
        let p = {
            ...ctx.from
        }
        const tail = acidTail(ctx,
            () => p,
            ms,
            38 * k)
        await tween(ms,
            (t) => {
                p = lerpPt(ctx.from,
                    to,
                    t)
                blob.move(p,
                    dir,
                    1.5)
            },
            ease.in,
            ctx.layer)
        blob.hide()
        ctx.onBeat?.()
        await tail
    })

/** Q trúng: bãi axit vỡ trên lá, axit bám chảy và ăn bong từng vảy giáp (Rã Giáp) */
registerVfx("kogSpitHit",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        ctx.shake(5 * k,
            200)
        await Promise.all([
            splash(ctx,
                at,
                1.15 * k,
                230),
            corrode(ctx,
                at,
                760,
                170),
            dustBurst(ctx.layer,
                at,
                {
                    count: 150, blade: true, color: FLAKES, speed: [150,
                        520], angle: [-Math.PI * .95,
                        -Math.PI * .05], gravity: 780, drag: 1.2, flow: 40, life: [560,
                        1080], size: [40,
                        14], alpha: 1, spread: 52, additive: false
                }),
            dustStream(ctx.layer,
                () => onCard(at),
                640,
                90,
                {
                    blade: true, color: FLAKES, speed: [10,
                        50], gravity: 520, drag: 1, flow: 30, life: [420,
                        760], size: [18,
                        7], alpha: 1, additive: false
                })
        ])
    })

/** E mở màn: miệng hút ma pháp sinh học, hơi tím và axit xoáy lên */
registerVfx("kogBarrageCast",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        const ms = 380
        ctx.shake(3 * k,
            180)
        await Promise.all([
            bloom(ctx.layer,
                at,
                MAGENTA,
                300 * k,
                ms),
            bloom(ctx.layer,
                at,
                ACID,
                190 * k,
                ms),
            dustStream(ctx.layer,
                () => onCard(at),
                ms,
                520,
                wisp({
                    gravity: -420, life: [240,
                        460], size: [20,
                        5]
                })),
            dustStream(ctx.layer,
                () => onCard(at),
                ms,
                360,
                {
                    color: ACIDS, speed: [10,
                        60], gravity: -520, life: [220,
                        420], size: [9,
                        3], streak: 2.4, alpha: 1, flow: 80, additive: false
                }),
            dustStream(ctx.layer,
                () => around(at,
                    70),
                ms,
                26,
                fume({
                    color: [MAGENTA,
                        VIOLET,
                        MOSS], size: [26,
                        58], gravity: -120, life: [380,
                        640], alpha: .24
                }))
        ])
    })

/** E đang chạy: lá Kog'Maw toả hơi tím, axit sôi từ dưới lên suốt thời gian buff; ctx.amount là số ms */
registerVfx("kogBarrageAura",
    async (ctx) => {
        const at = ctx.from
        const ms = Math.min(AURA_MAX_MS,
            ctx.amount ?? AURA_DEFAULT_MS)
        await Promise.all([
            dustStream(ctx.layer,
                () => onCard(at),
                ms,
                170,
                wisp({
                    gravity: -260, life: [280,
                        560], size: [15,
                        4]
                })),
            dustStream(ctx.layer,
                () => onCard(at),
                ms,
                120,
                {
                    color: ACIDS, speed: [6,
                        30], gravity: -240, life: [260,
                        520], size: [7,
                        2], alpha: 1, flow: 70
                }),
            dustStream(ctx.layer,
                () => around(at,
                    60),
                ms,
                9,
                fume({
                    color: [MAGENTA,
                        VIOLET], size: [26,
                        54], gravity: -60, alpha: .16
                }))
        ])
    })

/** E đòn tầm xa: bãi axit nhân chanh vỏ tím, vồng cao qua các đường, chạm là báo trúng */
registerVfx("kogBarrageShot",
    async (ctx) => {
        const k = kOf(ctx)
        const to = ctx.to[0] ?? ctx.from
        const dist = Math.hypot(to.x - ctx.from.x,
            to.y - ctx.from.y)
        const ms = Math.max(340,
            Math.min(620,
                dist / 1.5))
        const bow = Math.min(260,
            90 + dist * .36)
        const at = (t: number): Pt => {
            const p = lerpPt(ctx.from,
                to,
                t)
            return {
                x: p.x, y: p.y - Math.sin(t * Math.PI) * bow
            }
        }
        const blob = gob(ctx,
            34 * k,
            VIOLET,
            MAGENTA,
            LIME)
        let p = {
            ...ctx.from
        }
        const tail = acidTail(ctx,
            () => p,
            ms,
            28 * k,
            [MAGENTA,
                PINK,
                ACID,
                LIME])
        await tween(ms,
            (t) => {
                const next = at(t)
                blob.move(next,
                    Math.atan2(next.y - p.y,
                        next.x - p.x),
                    1.4)
                p = next
            },
            ease.linear,
            ctx.layer)
        blob.hide()
        ctx.onBeat?.()
        await tail
    })

/** E đòn trúng: axit tím lục vỡ, Hư Không xé một phần Máu tối đa; Đói càng nhiều vỡ càng to */
registerVfx("kogBarrageHit",
    async (ctx) => {
        const p = Math.min(1.7,
            hungerPower(ctx) * .62)
        const at = ctx.from
        ctx.shake(3.2,
            140)
        await Promise.all([
            splash(ctx,
                at,
                .85 * p,
                150,
                [MAGENTA,
                    PINK,
                    ACID,
                    LIME]),
            bloom(ctx.layer,
                at,
                MAGENTA,
                240 * p,
                300),
            dustBurst(ctx.layer,
                at,
                wisp({
                    count: Math.round(60 * p), speed: [100 * p,
                        330 * p], spread: 24
                }))
        ])
    })

/** R mở màn: Kog'Maw rướn lên, phun cả bãi axit thẳng lên trời */
registerVfx("kogArtilleryCast",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        const gather = 300, launch = 300
        const blob = gob(ctx,
            38 * k)
        let p = {
            ...at
        }
        const rise = Promise.all([
            bloom(ctx.layer,
                at,
                ACID,
                200 * k,
                gather + launch),
            dustStream(ctx.layer,
                () => around(at,
                    170),
                gather,
                800,
                {
                    color: ACIDS, speed: [10,
                        40], life: [140,
                        260], size: [10,
                        3], alpha: 1, flow: 190, additive: false
                }),
            dustStream(ctx.layer,
                () => onCard(at),
                gather + launch,
                170,
                drip({
                    size: [14,
                        4], life: [260,
                        480]
                }))
        ])
        await tween(gather,
            (t) => {
                blob.move({
                    x: at.x, y: at.y - t * 26
                },
                -Math.PI / 2,
                1 + t * .4)
            },
            ease.in,
            ctx.layer)
        ctx.shake(4.5 * k,
            200)
        const start = {
            x: at.x, y: at.y - 26
        }
        const top = {
            x: at.x + rand(-40,
                40), y: -90
        }
        const tail = Promise.all([
            acidTail(ctx,
                () => p,
                launch,
                46 * k),
            dustBurst(ctx.layer,
                at,
                drip({
                    count: 90, speed: [160,
                        520], angle: [-Math.PI * .85,
                        -Math.PI * .15], spread: 30
                }))
        ])
        p = start
        await tween(launch,
            (t) => {
                p = lerpPt(start,
                    top,
                    t)
                blob.move(p,
                    -Math.PI / 2,
                    2)
            },
            ease.in,
            ctx.layer)
        blob.hide()
        await Promise.all([rise,
            tail])
    })

/** R rơi: axit ủ sẵn dưới chân mục tiêu (vòng ngắm LoL, ở đây là vũng sáng hạt), rồi cột axit lượn từ trời đổ xuống như icon, chạm là báo trúng */
registerVfx("kogArtillery",
    async (ctx) => {
        const k = kOf(ctx)
        const to = ctx.to[0] ?? ctx.from
        const warn = 300, fall = 230, hold = 320
        const pool = {
            x: to.x, y: to.y + CARD_H * .55
        }
        const top = {
            x: to.x + rand(-46,
                46), y: -90
        }
        await Promise.all([
            bloom(ctx.layer,
                pool,
                ACID,
                300 * k,
                warn + 120),
            dustStream(ctx.layer,
                () => ({
                    x: pool.x + rand(-CARD_W * 1.5,
                        CARD_W * 1.5), y: pool.y + rand(-18,
                        18)
                }),
                warn,
                620,
                {
                    color: ACIDS, speed: [6,
                        30], gravity: -160, life: [200,
                        420], size: [11,
                        3], alpha: 1, flow: 50, additive: false
                }),
            tween(warn,
                () => {},
                ease.linear,
                ctx.layer)
        ])
        const blob = gob(ctx,
            54 * k)
        let head = {
            ...top
        }
        const sway = rand(0,
            TAU)
        /** Điểm trên cột: lệch ngang theo sóng nên cột lượn chứ không thẳng */
        const onColumn = () => {
            const t = Math.random()
            const p = lerpPt(top,
                head,
                t)
            return {
                x: p.x + Math.sin(t * 7 + sway) * 26 * k, y: p.y
            }
        }
        const column = Promise.all([
            dustStream(ctx.layer,
                onColumn,
                fall + hold,
                2400,
                {
                    color: [ACID,
                        GREEN,
                        LIME], speed: [2,
                        20], gravity: 240, drag: 2.4, flow: 22, life: [200,
                        400], size: [44 * k,
                        14], alpha: 1, spread: 16 * k, additive: false
                }),
            dustStream(ctx.layer,
                onColumn,
                fall + hold,
                1200,
                {
                    color: [PALE,
                        LIME], speed: [2,
                        20], gravity: 240, drag: 2.4, flow: 16, life: [120,
                        260], size: [22 * k,
                        7], alpha: 1, spread: 6 * k
                })
        ])
        await tween(fall,
            (t) => {
                head = lerpPt(top,
                    to,
                    t)
                blob.move(head,
                    Math.PI / 2,
                    2.2)
            },
            ease.linear,
            ctx.layer)
        blob.hide()
        ctx.onBeat?.()
        await column
    })

/** R trúng: cột axit đập xuống, vương miện axit dựng lên hai bên như icon, vũng loang chân lá; Máu đã mất càng nhiều càng to */
registerVfx("kogArtilleryHit",
    async (ctx) => {
        const p = kOf(ctx) * (1 + Math.min(ctx.amount ?? 0,
            80) / 140)
        const at = ctx.from
        ctx.shake(9 * p,
            340)
        await Promise.all([
            splash(ctx,
                at,
                1.3 * p,
                520),
            bloom(ctx.layer,
                at,
                PALE,
                260 * p,
                260),
            corrode(ctx,
                at,
                620,
                200),
            ...[-.62,
                -.36,
                .36,
                .62].map(off => dustBurst(ctx.layer,
                {
                    x: at.x, y: at.y + 30
                },
                drip({
                    count: Math.round(46 * p), speed: [340 * p,
                        760 * p], angle: [-Math.PI / 2 + off - .08,
                        -Math.PI / 2 + off + .08], size: [20,
                        5], spread: 12, gravity: 1250
                })))
        ])
    })

/** Bị hạ: thân nổ tung Hư Không và axit như Icathian Surprise, rồi Đói không tan mà xoáy ngược về xác; ctx.amount là Đói đang giữ */
registerVfx("kogDeathBurst",
    async (ctx) => {
        const k = kOf(ctx)
        const p = k * (1 + Math.min(ctx.amount ?? 0,
            45) / 60)
        const at = ctx.from
        ctx.shake(10 * k,
            380)
        const ember = {
            ...at
        }
        const burst = Promise.all([
            bloom(ctx.layer,
                at,
                PINK,
                470 * p,
                460),
            bloom(ctx.layer,
                at,
                0xffffff,
                170 * p,
                230),
            splash(ctx,
                at,
                1.15 * p,
                300),
            dustBurst(ctx.layer,
                at,
                wisp({
                    count: Math.round(190 * p), speed: [160 * p,
                        560 * p], spread: 40, size: [28,
                        6], life: [320,
                        700]
                })),
            dustBurst(ctx.layer,
                at,
                {
                    count: 70, blade: true, color: [INK,
                        VIOLET,
                        0x3a1f58], speed: [220,
                        620], drag: 2, flow: 40, gravity: 420, life: [420,
                        860], size: [32,
                        10], alpha: 1, spread: 36, additive: false
                }),
            haze(ctx,
                at,
                220 * p,
                26,
                [MAGENTA,
                    VIOLET,
                    PINK])
        ])
        const n = 7
        const swirl = Array.from({
            length: n
        },
        async (_, i) => {
            await tween(300 + i * 60,
                () => {},
                ease.linear,
                ctx.layer)
            const a = i / n * TAU
            const tails = await suck(ctx,
                {
                    x: at.x + Math.cos(a) * 210, y: at.y + Math.sin(a) * 180
                },
                ember,
                520,
                .8,
                22 * k)
            void bloom(ctx.layer,
                at,
                PINK,
                150 * k,
                260)
            await tails
        })
        await Promise.all([burst,
            ...swirl])
    })
