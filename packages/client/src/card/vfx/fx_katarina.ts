// VFX riêng của Katarina, chất liệu THÉP ĐỎ THẪM: Dao vẽ sẵn lưỡi thép chuôi đỏ, mảnh `blade` sắc, bụi đỏ máu và khói đen khi Thuấn Bộ. Đòn luôn chém tại mục tiêu, không có dao bay qua bàn.
// Dao rơi là vật thật trên đường: rơi (katarinaDaggerFall) rồi cắm tại chỗ (katarinaDaggerRest) tới khi nhặt (katarinaPickup). Mỗi hiệu ứng chỉ dựa vào VfxCtx và tự dọn khi layer bị huỷ; trúng là báo ctx.onBeat, không chờ đuôi hạt tan.
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
const CRIMSON = 0xe0123a
const BLOOD = 0x8c0820
const ROSE = 0xff4a68
const STEEL = 0xf3ecf2
const WHITE = 0xffffff
const SOOT = 0x1c0408
const SOIL = 0x6b5338
/** Thuấn Bộ: lá biến mất tại chỗ rồi hiện ra đúng mốc này; demo chạy lá thật theo cùng nhịp */
export const KATARINA_BLINK_MS = 240
const FALL_MS = 520
const PICK_MS = 210
const LOTUS_CAST_MS = 460
/** Hai đường kề cách nhau khoảng 180px: lệch ngang ít hơn mức này là cùng đường */
const SAME_LANE_PX = 90
const DAGGER_LEN = 132
/** Dao cắm hơi nghiêng cho tự nhiên; mũi dao hướng xuống đất */
const DAGGER_TILT = Math.PI / 2 + .14
const REST_MAX_MS = 14000
const REST_DEFAULT_MS = 2400
const REST_STEP_MS = 60
const REST_EMBER_MS = 360

const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
const once = (ctx: VfxCtx) => {
    let done = false
    return () => {
        if (done) return
        done = true
        ctx.onBeat?.()
    }
}
const wait = (ctx: VfxCtx, ms: number) => tween(ms,
    () => {},
    ease.linear,
    ctx.layer)

const DAGGER_W = 320
const DAGGER_H = 80
/** Dao Katarina: lưỡi thép dài hơi cong, gân đỏ dọc sống, chắn tay đỏ thẫm xoè, chuôi da đen. Mũi dao ở mép phải */
function daggerTexture(): Texture {
    const c = document.createElement("canvas")
    c.width = DAGGER_W
    c.height = DAGGER_H
    const g = c.getContext("2d")
    if (g) {
        const W = DAGGER_W, M = DAGGER_H / 2
        const edge = () => {
            g.beginPath()
            g.moveTo(84,
                M - 17)
            g.quadraticCurveTo(190,
                M - 30,
                W - 6,
                M + 3)
            g.quadraticCurveTo(190,
                M + 17,
                84,
                M + 17)
            g.closePath()
        }
        g.shadowColor = "#ff1038"
        g.shadowBlur = 6
        const steel = g.createLinearGradient(0,
            M - 18,
            0,
            M + 14)
        steel.addColorStop(0,
            "#ffffff")
        steel.addColorStop(.42,
            "#dfdde6")
        steel.addColorStop(.58,
            "#8d8fa3")
        steel.addColorStop(1,
            "#f0e6ea")
        g.fillStyle = steel
        edge()
        g.fill()
        g.shadowBlur = 0
        g.save()
        edge()
        g.clip()
        const fuller = g.createLinearGradient(84,
            0,
            W - 40,
            0)
        fuller.addColorStop(0,
            "#d0102f")
        fuller.addColorStop(.3,
            "#8a3048")
        fuller.addColorStop(1,
            "#73778c")
        g.strokeStyle = fuller
        g.lineWidth = 4
        g.beginPath()
        g.moveTo(84,
            M - 3)
        g.quadraticCurveTo(190,
            M - 9,
            W - 34,
            M + 1)
        g.stroke()
        g.restore()
        const grip = g.createLinearGradient(14,
            0,
            76,
            0)
        grip.addColorStop(0,
            "#3a0a14")
        grip.addColorStop(.5,
            "#16060a")
        grip.addColorStop(1,
            "#4a0d1a")
        g.fillStyle = grip
        g.fillRect(16,
            M - 7,
            62,
            14)
        g.fillStyle = "#b80f2e"
        for (let x = 24; x < 72; x += 13) g.fillRect(x,
            M - 7,
            4,
            14)
        const guard = g.createLinearGradient(0,
            M - 30,
            0,
            M + 30)
        guard.addColorStop(0,
            "#ff3a58")
        guard.addColorStop(.5,
            "#8c0820")
        guard.addColorStop(1,
            "#ff3a58")
        g.fillStyle = guard
        g.shadowColor = "#ff1038"
        g.shadowBlur = 8
        g.beginPath()
        g.moveTo(66,
            M - 34)
        g.quadraticCurveTo(84,
            M - 16,
            98,
            M - 15)
        g.lineTo(84,
            M)
        g.lineTo(98,
            M + 15)
        g.quadraticCurveTo(84,
            M + 16,
            66,
            M + 34)
        g.quadraticCurveTo(76,
            M,
            66,
            M - 34)
        g.closePath()
        g.fill()
        g.fillStyle = "#c81030"
        g.beginPath()
        g.arc(13,
            M,
            9,
            0,
            TAU)
        g.fill()
    }
    return Texture.from(c)
}
const SLASH_W = 256
const SLASH_H = 32
/** Vệt chém: thoi rất mảnh, hai đầu nhọn, viền đỏ, lõi trắng như lưỡi dao vừa lướt qua */
function slashTexture(): Texture {
    const c = document.createElement("canvas")
    c.width = SLASH_W
    c.height = SLASH_H
    const g = c.getContext("2d")
    if (g) {
        const M = SLASH_H / 2
        const lens = (half: number) => {
            g.beginPath()
            g.moveTo(0,
                M)
            g.quadraticCurveTo(SLASH_W * .62,
                M - half,
                SLASH_W,
                M)
            g.quadraticCurveTo(SLASH_W * .62,
                M + half,
                0,
                M)
            g.closePath()
            g.fill()
        }
        g.shadowColor = "#ff1038"
        g.shadowBlur = 9
        g.fillStyle = "#e0123a"
        lens(14)
        g.shadowBlur = 0
        g.fillStyle = "#ffffff"
        lens(7)
    }
    return Texture.from(c)
}
let daggerCache: Texture | undefined
let slashCache: Texture | undefined
const daggerTex = () => (daggerCache ??= daggerTexture())
const slashTex = () => (slashCache ??= slashTexture())

function daggerSprite(ctx: VfxCtx, len: number) {
    const s = new Sprite(daggerTex())
    s.anchor.set(.5)
    s.scale.set(len / DAGGER_W)
    ctx.layer.addChild(s)
    return s
}

/** Tâm Dao khi mũi dao cắm đúng `tip` */
const standing = (tip: Pt, len: number): Pt => ({
    x: tip.x - Math.cos(DAGGER_TILT) * len * .46, y: tip.y - Math.sin(DAGGER_TILT) * len * .46
})

/** Vết chém hiện ra theo chiều nhát dao rồi tan */
function slashMark(ctx: VfxCtx, start: Pt, angle: number, length: number, thick: number, ms: number) {
    const s = new Sprite(slashTex())
    s.anchor.set(0,
        .5)
    s.x = start.x
    s.y = start.y
    s.rotation = angle
    s.scale.set(0,
        thick / SLASH_H)
    ctx.layer.addChild(s)
    const full = length / SLASH_W
    return tween(ms,
        (t) => {
            if (s.destroyed) return
            s.scale.x = full * Math.min(1,
                t * 3.4)
            s.alpha = t < .45 ? 1 : 1 - (t - .45) / .55
        },
        ease.linear,
        ctx.layer)
}

interface Stroke { angle: number; len: number; w: number; ms?: number; delay?: number; off?: number }

/** Một nhát dao tại `at`: mảnh `blade` dày chạy dọc lưỡi và vết chém trắng đỏ */
async function cut(ctx: VfxCtx, at: Pt, s: Stroke) {
    if (s.delay) await wait(ctx,
        s.delay)
    if (ctx.layer.destroyed) return
    const ms = s.ms ?? 100
    const a = s.angle
    const ux = Math.cos(a), uy = Math.sin(a)
    const mid = {
        x: at.x - uy * (s.off ?? 0), y: at.y + ux * (s.off ?? 0)
    }
    const start = {
        x: mid.x - ux * s.len, y: mid.y - uy * s.len
    }
    let edge = start
    await Promise.all([
        dustStream(ctx.layer,
            () => edge,
            ms,
            3400,
            {
                blade: true, color: [ctx.color,
                    CRIMSON,
                    ROSE,
                    STEEL,
                    WHITE], speed: [280,
                    760], angle: [a - .17,
                    a + .17], drag: 3, flow: 0, life: [110,
                    260], size: [s.w * 7,
                    s.w * 2], spread: s.w, alpha: 1, additive: false
            }),
        slashMark(ctx,
            start,
            a,
            s.len * 2,
            s.w * 2.6,
            ms + 190),
        tween(ms,
            (t) => {
                edge = {
                    x: lerp(start.x,
                        mid.x + ux * s.len,
                        t), y: lerp(start.y,
                        mid.y + uy * s.len,
                        t)
                }
            },
            ease.linear,
            ctx.layer)
    ])
}

/** Thép va thịt: mảnh sắc toả ra, tia lửa kim loại rơi, sương máu */
function steelBurst(ctx: VfxCtx, at: Pt, power: number, count: number) {
    return Promise.all([
        bloom(ctx.layer,
            at,
            CRIMSON,
            300 * power,
            320),
        bloom(ctx.layer,
            at,
            WHITE,
            110 * power,
            180),
        mist(ctx.layer,
            at,
            {
                color: [BLOOD,
                    CRIMSON,
                    SOOT], size: 120 * power, alpha: .42, count: 9, speed: [40,
                    150], additive: false
            }),
        dustBurst(ctx.layer,
            at,
            {
                count, blade: true, color: [ctx.color,
                    CRIMSON,
                    ROSE,
                    STEEL], speed: [200 * power,
                    760 * power], drag: 3.6, flow: 0, life: [180,
                    430], size: [48 * power,
                    12], spread: 20, alpha: 1, additive: false
            }),
        dustBurst(ctx.layer,
            at,
            {
                count: count * 2, color: [WHITE,
                    STEEL,
                    ROSE], speed: [120 * power,
                    520 * power], gravity: 420, drag: 2, flow: 30, life: [240,
                    620], size: [5,
                    1.5], spread: 14, alpha: 1
            }),
        dustBurst(ctx.layer,
            at,
            {
                count: Math.round(count * .8), color: [CRIMSON,
                    BLOOD], speed: [60 * power,
                    320 * power], gravity: 520, drag: 1.4, flow: 20, life: [320,
                    700], size: [7,
                    2], spread: 22, alpha: .95, additive: false
            })
    ])
}

/** Mảnh sắc xoáy quanh `at`. Góc bay được đặt ngay trong getPt vì emit đọc opts sau khi lấy vị trí: mỗi mảnh tiếp tuyến với vòng xoáy, không vẽ vòng */
function whirl(ctx: VfxCtx, at: () => Pt, r: [number, number], ms: number, perSec: number, size: number) {
    const opts: DustOpts = {
        blade: true, color: [ctx.color,
            CRIMSON,
            ROSE,
            STEEL,
            WHITE], speed: [420,
            820], drag: 2.4, flow: 0, life: [130,
            320], size: [size,
            size * .25], alpha: 1, additive: false
    }
    let spin = rand(0,
            TAU), grow = 0
    const arms = 3
    return Promise.all([
        dustStream(ctx.layer,
            () => {
                const a = spin + Math.floor(rand(0,
                    arms)) * TAU / arms + rand(-.34,
                    .34)
                const d = lerp(r[0],
                    r[1],
                    grow) * rand(.3,
                    1.35)
                opts.angle = [a + Math.PI / 2 - .12,
                    a + Math.PI / 2 + .12]
                const c = at()
                return {
                    x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d
                }
            },
            ms,
            perSec,
            opts),
        tween(ms,
            (t) => {
                spin += .34
                grow = t
            },
            ease.linear,
            ctx.layer)
    ])
}

/** Dao từ `start` xoay tít bay tới mũi cắm `to`. Rơi từ trời thì từ `from`; có `to` thì từ `from` vọt lên cao rồi rơi */
registerVfx("katarinaDaggerFall",
    async (ctx) => {
        const k = kOf(ctx)
        const land = once(ctx)
        const len = DAGGER_LEN * k
        const tip = ctx.to[0] ?? ctx.from
        const seat = standing(tip,
            len)
        const start = ctx.to.length ? ctx.from : {
            x: seat.x + 40, y: seat.y - 520
        }
        const lift = ctx.to.length ? 300 : 0
        const blade = daggerSprite(ctx,
            len)
        const halo = makeSprite(ctx.layer,
            "glow",
            start.x,
            start.y,
            CRIMSON,
            len * 1.5)
        let head = start
        blade.x = start.x
        blade.y = start.y
        ctx.layer.addChild(blade)
        const fly = tween(FALL_MS,
            (t) => {
                if (blade.destroyed || halo.destroyed) return
                head = {
                    x: lerp(start.x,
                        seat.x,
                        t), y: lerp(start.y,
                        seat.y,
                        ctx.to.length ? t * t : t) - Math.sin(t * Math.PI) * lift
                }
                blade.x = head.x
                blade.y = head.y
                blade.rotation = DAGGER_TILT + (1 - t) * TAU * 3.5
                blade.alpha = Math.min(1,
                    t * 6)
                halo.x = head.x
                halo.y = head.y
                halo.alpha = .7 * (1 - t * .4)
            },
            ctx.to.length ? ease.linear : ease.in,
            ctx.layer)
        await Promise.all([
            dustStream(ctx.layer,
                () => head,
                FALL_MS,
                520,
                {
                    blade: true, color: [CRIMSON,
                        ROSE,
                        STEEL], speed: [20,
                        110], angle: [-Math.PI * .7,
                        -Math.PI * .3], drag: 2, flow: 40, life: [140,
                        300], size: [30,
                        8], spread: 26, alpha: .95, additive: false
                }),
            dustStream(ctx.layer,
                () => head,
                FALL_MS,
                260,
                {
                    color: [CRIMSON,
                        BLOOD,
                        ROSE], speed: [10,
                        70], drag: 2, flow: 60, life: [220,
                        460], size: [9,
                        2.5], spread: 30, alpha: .9, additive: false
                }),
            fly.then(async () => {
                if (!halo.destroyed) halo.visible = false
                land()
                ctx.shake(3,
                    110)
                await Promise.all([
                    bloom(ctx.layer,
                        tip,
                        CRIMSON,
                        240 * k,
                        300),
                    mist(ctx.layer,
                        tip,
                        {
                            color: [SOIL,
                                BLOOD], size: 90 * k, alpha: .4, count: 8, speed: [30,
                                120], additive: false
                        }),
                    dustBurst(ctx.layer,
                        tip,
                        {
                            count: 70, blade: true, color: [STEEL,
                                ROSE,
                                CRIMSON], speed: [140,
                                520], angle: [-Math.PI + .25,
                                -.25], gravity: 700, drag: 1.6, flow: 0, life: [180,
                                420], size: [24,
                                7], spread: 12, alpha: 1, additive: false
                        }),
                    dustBurst(ctx.layer,
                        tip,
                        {
                            count: 110, color: [SOIL,
                                0x8a7350,
                                CRIMSON], speed: [60,
                                300], angle: [-Math.PI,
                                0], gravity: 560, drag: 1.4, flow: 20, life: [260,
                                560], size: [7,
                                2], spread: 16, alpha: .95, additive: false
                        }),
                    tween(380,
                        (t) => {
                            if (!blade.destroyed) blade.alpha = 1 - t * t
                        },
                        ease.linear,
                        ctx.layer)
                ])
            })
        ])
    })

/** Dao cắm trên đường: thép lấp lánh, quầng đỏ thở chậm, tàn đỏ bay lên. Có ctx.tether thì nằm tới khi được nhặt (tối đa REST_MAX_MS), không thì chạy ngắn tại chỗ */
registerVfx("katarinaDaggerRest",
    async (ctx) => {
        const k = kOf(ctx)
        const len = DAGGER_LEN * k
        const tip = ctx.from
        const seat = standing(tip,
            len)
        const shadow = makeSprite(ctx.layer,
            "glow",
            tip.x,
            tip.y,
            SOOT,
            len * .62,
            false)
        shadow.scale.y *= .36
        shadow.alpha = .62
        const pool = makeSprite(ctx.layer,
            "glow",
            tip.x,
            tip.y - 8,
            CRIMSON,
            len * 1.5)
        const halo = makeSprite(ctx.layer,
            "glow",
            seat.x,
            seat.y,
            ROSE,
            len * .9)
        const blade = daggerSprite(ctx,
            len)
        const shine = daggerSprite(ctx,
            len)
        shine.blendMode = "add"
        for (const s of [blade,
            shine]) {
            s.x = seat.x
            s.y = seat.y
            s.rotation = DAGGER_TILT
        }
        const limit = ctx.tether ? REST_MAX_MS : REST_DEFAULT_MS
        const near = () => ({
            x: tip.x + rand(-34,
                34) * k, y: tip.y + rand(-16,
                4) * k
        })
        const embers: Promise<unknown>[] = []
        let el = 0, sinceEmber = REST_EMBER_MS
        while (!ctx.layer.destroyed && !ctx.tether?.released() && el < limit) {
            if (sinceEmber >= REST_EMBER_MS) {
                sinceEmber = 0
                embers.push(dustStream(ctx.layer,
                    near,
                    REST_EMBER_MS,
                    60,
                    {
                        color: [CRIMSON,
                            ROSE,
                            STEEL], speed: [20,
                            70], angle: [-Math.PI * .66,
                            -Math.PI * .34], gravity: -70, drag: 1.2, flow: 46, life: [460,
                            900], size: [5,
                            1.5], alpha: .95, additive: false
                    }))
            }
            const base = el
            await tween(REST_STEP_MS,
                (t) => {
                    if (pool.destroyed || shine.destroyed || halo.destroyed) return
                    const clock = (base + t * REST_STEP_MS) / 1000
                    const breath = .5 + .5 * Math.sin(clock * 3.4)
                    pool.alpha = .26 + .2 * breath
                    halo.alpha = .08 + .1 * breath
                    shine.alpha = Math.pow(Math.max(0,
                        Math.sin(clock * 2.3)),
                    8) * .9
                },
                ease.linear,
                ctx.layer)
            el += REST_STEP_MS
            sinceEmber += REST_STEP_MS
        }
        for (const s of [shadow,
            pool,
            halo,
            blade,
            shine]) if (!s.destroyed) s.visible = false
        await Promise.all(embers)
    })

/** Nhặt Dao: from là mũi Dao đang cắm. Dao bật khỏi đất, xoay tít vào tay giữa cơn lốc mảnh sắc. Có to[0] thì chém luôn tướng đối diện, chạm là báo nhịp; không có thì báo nhịp lúc Dao vào tay */
registerVfx("katarinaPickup",
    async (ctx) => {
        const k = kOf(ctx)
        const land = once(ctx)
        const len = DAGGER_LEN * k
        const seat = standing(ctx.from,
            len)
        const hand = {
            x: ctx.from.x, y: ctx.from.y + 96 * k
        }
        const blade = daggerSprite(ctx,
            len)
        blade.x = seat.x
        blade.y = seat.y
        blade.rotation = DAGGER_TILT
        let at = seat
        const to = ctx.to[0]
        await Promise.all([
            bloom(ctx.layer,
                hand,
                CRIMSON,
                280 * k,
                300),
            whirl(ctx,
                () => at,
                [60 * k,
                    104 * k],
                PICK_MS + 60,
                2400,
                42 * k),
            tween(PICK_MS,
                (t) => {
                    if (blade.destroyed) return
                    at = {
                        x: lerp(seat.x,
                            hand.x,
                            t), y: lerp(seat.y,
                            hand.y,
                            t * t) - Math.sin(t * Math.PI) * 46 * k
                    }
                    blade.x = at.x
                    blade.y = at.y
                    blade.rotation = DAGGER_TILT + t * TAU * 2
                    blade.alpha = 1 - Math.pow(t,
                        5)
                },
                ease.linear,
                ctx.layer).then(async () => {
                if (!blade.destroyed) blade.visible = false
                if (!to) {
                    land()
                    return
                }
                await Promise.all([
                    cut(ctx,
                        to,
                        {
                            angle: .78, len: 112 * k, w: 7 * k
                        }),
                    cut(ctx,
                        to,
                        {
                            angle: -.78, len: 112 * k, w: 7 * k, delay: 46
                        }),
                    wait(ctx,
                        70).then(land)
                ])
            })
        ])
    })

/** Nhặt Dao trúng: nhát xoay tròn quanh tướng đối diện */
registerVfx("katarinaPickupHit",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(4,
            140)
        await Promise.all([
            whirl(ctx,
                () => ctx.from,
                [36 * k,
                    86 * k],
                190,
                2200,
                48 * k),
            steelBurst(ctx,
                ctx.from,
                1.1 * k,
                Math.round(70 * ctx.intensity))
        ])
    })

/** Bụi đỏ và khói đen nơi Katarina biến mất hoặc hiện ra */
function blinkPuff(ctx: VfxCtx, at: Pt, power: number) {
    return Promise.all([
        bloom(ctx.layer,
            at,
            CRIMSON,
            190 * power,
            260),
        mist(ctx.layer,
            at,
            {
                color: [SOOT,
                    BLOOD,
                    SOOT], size: 190 * power, alpha: .8, count: 14, speed: [40,
                    170], additive: false
            }),
        dustBurst(ctx.layer,
            at,
            {
                count: Math.round(210 * power), color: [CRIMSON,
                    BLOOD,
                    SOOT,
                    BLOOD], speed: [80 * power,
                    380 * power], drag: 3, flow: 110, life: [260,
                    560], size: [10,
                    2.5], spread: 46 * power, alpha: 1, additive: false
            }),
        dustBurst(ctx.layer,
            at,
            {
                count: Math.round(70 * power), color: [CRIMSON,
                    ROSE,
                    STEEL], speed: [220 * power,
                    620 * power], drag: 3.4, flow: 40, life: [160,
                    340], size: [15,
                    4], streak: 5, spread: 30 * power, alpha: 1, additive: false
            })
    ])
}

/** Dịch chuyển: nổ khói tại from, tới KATARINA_BLINK_MS thì báo nhịp và hiện ra ở to[0]. `power` lớn và `trail` cho Thuấn Bộ */
function blink(ctx: VfxCtx, power: number, trail: boolean) {
    const k = kOf(ctx)
    const to = ctx.to[0] ?? ctx.from
    const dir = Math.atan2(to.y - ctx.from.y,
        to.x - ctx.from.x)
    let head = ctx.from
    return Promise.all([
        blinkPuff(ctx,
            ctx.from,
            power * k),
        trail ? dustStream(ctx.layer,
            () => head,
            KATARINA_BLINK_MS,
            1500,
            {
                color: [CRIMSON,
                    ROSE,
                    SOOT], speed: [40,
                    240], angle: [dir + Math.PI - .4,
                    dir + Math.PI + .4], drag: 3, flow: 40, life: [200,
                    440], size: [16,
                    5], streak: 5, spread: 30, alpha: .95, additive: false
            }) : Promise.resolve(),
        tween(KATARINA_BLINK_MS,
            (t) => {
                head = {
                    x: lerp(ctx.from.x,
                        to.x,
                        t), y: lerp(ctx.from.y,
                        to.y,
                        t)
                }
            },
            ease.linear,
            ctx.layer).then(() => {
            ctx.onBeat?.()
            return blinkPuff(ctx,
                to,
                power * k)
        })
    ])
}

/** Q mở màn: dịch chuyển sang đối diện mục tiêu */
registerVfx("katarinaBlink",
    async (ctx) => {
        await blink(ctx,
            1,
            false)
    })

/** Q: ba nhát dao đan chéo ngay tại mục tiêu, nhát giữa là khung chạm */
registerVfx("katarinaStrike",
    async (ctx) => {
        const k = kOf(ctx)
        const land = once(ctx)
        await Promise.all(ctx.to.flatMap(to => [
            cut(ctx,
                to,
                {
                    angle: .86, len: 116 * k, w: 7 * k
                }),
            cut(ctx,
                to,
                {
                    angle: -.86, len: 116 * k, w: 7 * k, delay: 52
                }),
            cut(ctx,
                to,
                {
                    angle: .1, len: 92 * k, w: 6 * k, delay: 110, off: 14
                }),
            wait(ctx,
                90).then(land)
        ]))
    })

/** Q trúng: thép vỡ thành mảnh sắc */
registerVfx("katarinaStrikeHit",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(4,
            140)
        await steelBurst(ctx,
            ctx.from,
            1.15 * k,
            Math.round(90 * ctx.intensity))
    })

/** E mở màn: Thuấn Bộ, khói dày hơn Q và có vệt máu nối hai đầu */
registerVfx("katarinaShunpo",
    async (ctx) => {
        await blink(ctx,
            1.25,
            true)
    })

/** E: một nhát chéo thật dài bổ xuống mục tiêu rồi nhát cắt ngang */
registerVfx("katarinaShunpoCut",
    async (ctx) => {
        const k = kOf(ctx)
        const land = once(ctx)
        await Promise.all(ctx.to.flatMap(to => [
            cut(ctx,
                to,
                {
                    angle: 1.05, len: 136 * k, w: 9 * k, ms: 90
                }),
            cut(ctx,
                to,
                {
                    angle: -.5, len: 104 * k, w: 7 * k, ms: 90, delay: 70
                }),
            wait(ctx,
                80).then(land)
        ]))
    })

/** E trúng: bụi đỏ và khói đen bung tại mục tiêu cùng mảnh thép */
registerVfx("katarinaShunpoHit",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(4,
            150)
        await Promise.all([
            steelBurst(ctx,
                ctx.from,
                1.2 * k,
                Math.round(80 * ctx.intensity)),
            mist(ctx.layer,
                ctx.from,
                {
                    color: [SOOT,
                        BLOOD], size: 130 * k, alpha: .5, count: 8, speed: [40,
                        140], additive: false
                })
        ])
    })

/** R mở màn: sáu Dao thật xoay quanh Katarina giữa cơn lốc mảnh đỏ, báo nhịp khi lốc đạt đỉnh */
registerVfx("katarinaLotusSpin",
    async (ctx) => {
        const k = kOf(ctx)
        const count = 6
        const len = 106 * k
        const r = 104 * k
        const blades = Array.from({
            length: count
        },
        () => daggerSprite(ctx,
            len))
        const place = (t: number) => {
            blades.forEach((s, i) => {
                if (s.destroyed) return
                const a = i / count * TAU + t * TAU * 2.5
                const d = r * Math.min(1,
                    t * 3.5)
                s.x = ctx.from.x + Math.cos(a) * d
                s.y = ctx.from.y + Math.sin(a) * d
                s.rotation = a + Math.PI / 2
                s.alpha = Math.min(1,
                    t * 8) * (t > .88 ? (1 - t) / .12 : 1)
            })
        }
        place(0)
        const storm = [
            bloom(ctx.layer,
                ctx.from,
                CRIMSON,
                380 * k,
                LOTUS_CAST_MS),
            mist(ctx.layer,
                ctx.from,
                {
                    color: [BLOOD,
                        SOOT],
                    size: 170 * k, alpha: .42, count: 9, speed: [30,
                        120], additive: false
                }),
            whirl(ctx,
                () => ctx.from,
                [70 * k,
                    170 * k],
                LOTUS_CAST_MS,
                3000,
                56 * k),
            dustStream(ctx.layer,
                () => ctx.from,
                LOTUS_CAST_MS,
                340,
                {
                    color: [CRIMSON,
                        ROSE,
                        BLOOD], speed: [160,
                        520], drag: 2.4, flow: 90, life: [240,
                        520], size: [18,
                        6], streak: 3.2, spread: 90 * k, alpha: .95, additive: false
                }),
            tween(LOTUS_CAST_MS,
                place,
                ease.linear,
                ctx.layer).then(() => ctx.onBeat?.())
        ]
        // Dao thật nằm trên lớp mảnh để luôn nhìn rõ
        for (const s of blades) ctx.layer.addChild(s)
        await Promise.all(storm)
    })

/** R: mảnh chém toả thành bông sen ngay tại từng mục tiêu. Tướng đối diện (cùng cột với Katarina) có nhiều nhát, nhát dài hơn hẳn hai tướng kề; xét theo từng mục tiêu vì trận thật gọi travel riêng cho mỗi đích */
registerVfx("katarinaLotus",
    async (ctx) => {
        const k = kOf(ctx)
        const land = once(ctx)
        await Promise.all([
            ...ctx.to.map(async (to) => {
                const main = Math.abs(to.x - ctx.from.x) < SAME_LANE_PX
                const n = main ? 7 : 4
                const spin = rand(0,
                    TAU)
                await Promise.all([
                    ...Array.from({
                        length: n
                    },
                    (_, i) => cut(ctx,
                        to,
                        {
                            angle: spin + i / n * Math.PI, len: (main ? 104 : 66) * k, w: (main ? 6.5 : 4) * k, ms: 80, delay: i * 26
                        })),
                    whirl(ctx,
                        () => to,
                        [24 * k,
                            (main ? 104 : 64) * k],
                        main ? 280 : 180,
                        main ? 2600 : 1100,
                        (main ? 44 : 30) * k)
                ])
            }),
            wait(ctx,
                100).then(land)
        ])
    })

/** R trúng: ctx.intensity quyết định độ nặng, tướng đối diện nhận bản lớn nhất và rung màn hình */
registerVfx("katarinaLotusHit",
    async (ctx) => {
        const k = kOf(ctx)
        if (ctx.intensity >= 2) ctx.shake(7,
            230)
        await steelBurst(ctx,
            ctx.from,
            k,
            Math.round(64 * ctx.intensity))
    })
