// Nguyên tố dùng chung: hình học/hạt chạy trên lớp Pixi do React sở hữu.
import {
    Graphics
} from "pixi.js"
import {
    burst, ease, flash, lerp, makeSprite, rand, ring, stream, tween
} from "./particles"
import {
    registerVfx, type VfxCtx
} from "./types"

const points = (ctx: VfxCtx) => ctx.to.length ? ctx.to : [ctx.from]
const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)

function graphic(ctx: VfxCtx): Graphics {
    const g = new Graphics()
    g.blendMode = "add"
    ctx.layer.addChild(g)
    return g
}

/** Đạn độc có giọt lõi, quỹ đạo võng và bọt đuôi (khác hẳn quả cầu lửa). */
registerVfx("poisonBolt",
    async (ctx) => {
        await Promise.all(points(ctx).map(async (target) => {
            const k = kOf(ctx)
            const head = graphic(ctx)
            head.ellipse(0,
                0,
                12 * k,
                8 * k).fill(ctx.color)
            head.circle(3 * k,
                -2 * k,
                3 * k).fill(ctx.color2 ?? 0xeaff9b)
            let p = {
                ...ctx.from
            }
            head.position.set(p.x,
                p.y)
            await Promise.all([
                stream(ctx.layer,
                    () => p,
                    440,
                    55 * k,
                    {
                        kind: "circle", color: [ctx.color,
                            ctx.color2 ?? 0x92d942],
                        speed: [8,
                            45], life: [180,
                            380], size: [9 * k,
                            1],
                        gravity: -55, spread: 6 * k, additive: false
                    }),
                tween(440,
                    (t) => {
                        p = {
                            x: lerp(ctx.from.x,
                                target.x,
                                t), y: lerp(ctx.from.y,
                                target.y,
                                t) - Math.sin(t * Math.PI) * 35
                        }
                        head.position.set(p.x,
                            p.y)
                        head.rotation = Math.atan2(target.y - ctx.from.y,
                            target.x - ctx.from.x)
                        head.scale.set(1 + Math.sin(t * Math.PI) * .3)
                    },
                    ease.in,
                    ctx.layer)
            ])
            if (!head.destroyed) head.destroy()
        }))
    })

registerVfx("poisonHit",
    async (ctx) => {
        await Promise.all([
            ring(ctx.layer,
                ctx.from,
                ctx.color,
                8,
                85 * kOf(ctx),
                420),
            burst(ctx.layer,
                ctx.from,
                {
                    count: Math.round(25 * ctx.intensity), color: [ctx.color,
                        ctx.color2 ?? 0xdbff84],
                    speed: [40,
                        170], life: [300,
                        650], size: [10,
                        1], gravity: 140, additive: false
                })
        ])
    })

registerVfx("poisonCloud",
    async (ctx) => {
        const k = kOf(ctx)
        const haze = graphic(ctx)
        const bubbles = Array.from({
            length: 16
        },
        () => ({
            x: rand(-60,
                60) * k, y: rand(-40,
                40) * k, r: rand(5,
                18) * k, a: rand(0,
                Math.PI * 2)
        }))
        await tween(1200,
            (t) => {
                haze.clear()
                const alpha = Math.sin(t * Math.PI)
                for (const b of bubbles) haze.circle(ctx.from.x + b.x + Math.sin(t * 7 + b.a) * 10,
                    ctx.from.y + b.y - t * 35,
                    b.r * (1 + t * .6)).fill({
                    color: ctx.color, alpha: alpha * .25
                })
            },
            ease.linear,
            ctx.layer)
        if (!haze.destroyed) haze.destroy()
    })

registerVfx("burn",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            stream(ctx.layer,
                () => ({
                    x: ctx.from.x + rand(-30,
                        30) * k, y: ctx.from.y + 30 * k
                }),
                900,
                75 * k,
                {
                    color: [ctx.color,
                        ctx.color2 ?? 0xffd45a,
                        0xff6327], speed: [25,
                        95],
                    angle: [-Math.PI * .7,
                        -Math.PI * .3], gravity: -110,
                    life: [260,
                        520], size: [24 * k,
                        1], spread: 10
                }),
            ring(ctx.layer,
                ctx.from,
                ctx.color,
                24 * k,
                95 * k,
                700)
        ])
    })

registerVfx("freeze",
    async (ctx) => {
        const ice = graphic(ctx)
        const k = kOf(ctx)
        await Promise.all([
            tween(1050,
                (t) => {
                    ice.clear()
                    const grow = Math.min(1,
                        t * 5)
                    const fade = 1 - Math.max(0,
                        (t - .65) / .35)
                    for (let i = 0; i < 7; i++) {
                        const a = i * Math.PI * 2 / 7
                        const x = ctx.from.x + Math.cos(a) * 32 * k
                        const y = ctx.from.y + Math.sin(a) * 24 * k
                        const h = (30 + i % 3 * 15) * k * grow
                        ice.poly([x - 11 * k,
                            y + 18 * k,
                            x - 5 * k,
                            y - h,
                            x + 7 * k,
                            y - h - 12 * k,
                            x + 12 * k,
                            y + 12 * k]).fill({
                            color: ctx.color, alpha: .45 * fade
                        }).stroke({
                            color: ctx.color2 ?? 0xffffff, width: 1.5, alpha: fade
                        })
                    }
                },
                ease.linear,
                ctx.layer),
            burst(ctx.layer,
                ctx.from,
                {
                    count: 24, kind: "star", color: [ctx.color,
                        ctx.color2 ?? 0xffffff], speed: [35,
                        110], life: [350,
                        700], size: [8 * k,
                        1]
                })
        ])
        if (!ice.destroyed) ice.destroy()
    })

registerVfx("waterWave",
    async (ctx) => {
        await Promise.all(points(ctx).map(async (to) => {
            const wave = graphic(ctx)
            const angle = Math.atan2(to.y - ctx.from.y,
                to.x - ctx.from.x)
            wave.rotation = angle
            const k = kOf(ctx)
            await tween(650,
                (t) => {
                    wave.clear()
                    wave.position.set(lerp(ctx.from.x,
                        to.x,
                        t),
                    lerp(ctx.from.y,
                        to.y,
                        t))
                    for (let i = 0; i < 4; i++) {
                        wave.arc(-i * 13 * k,
                            0,
                            (25 + i * 10) * k,
                            -Math.PI * .45,
                            Math.PI * .45).stroke({
                            width: (5 - i) * k, color: i % 2 ? ctx.color2 ?? 0xd3ffff : ctx.color, alpha: (1 - i * .15) * Math.sin(Math.PI * t)
                        })
                    }
                },
                ease.inOut,
                ctx.layer)
            if (!wave.destroyed) wave.destroy()
        }))
    })

registerVfx("windSlash",
    async (ctx) => {
        await Promise.all(points(ctx).map(async (to) => {
            const wind = graphic(ctx)
            wind.rotation = Math.atan2(to.y - ctx.from.y,
                to.x - ctx.from.x)
            const k = kOf(ctx)
            await tween(440,
                (t) => {
                    wind.clear().position.set(lerp(ctx.from.x,
                        to.x,
                        t),
                    lerp(ctx.from.y,
                        to.y,
                        t))
                    for (let i = 0; i < 3; i++) wind.arc(-i * 15,
                        0,
                        (24 + i * 10) * k,
                        -1.1,
                        1.1).stroke({
                        width: (4 - i) * k, color: i ? ctx.color : ctx.color2 ?? 0xffffff, alpha: Math.sin(t * Math.PI) * (1 - i * .2)
                    })
                },
                ease.out,
                ctx.layer)
            if (!wind.destroyed) wind.destroy()
        }))
    })

registerVfx("tornado",
    async (ctx) => {
        const wind = graphic(ctx)
        const k = kOf(ctx)
        await tween(1000,
            (t) => {
                wind.clear()
                for (let i = 0; i < 9; i++) {
                    const z = i / 8
                    const r = (12 + z * 35) * k * Math.sin(Math.PI * t)
                    wind.ellipse(ctx.from.x + Math.sin(t * 14 + i * .6) * 6 * k,
                        ctx.from.y + 45 * k - z * 110 * k,
                        r,
                        r * .25).stroke({
                        width: 2 * k, color: i % 2 ? ctx.color : ctx.color2 ?? 0xffffff, alpha: (1 - z * .4) * Math.sin(Math.PI * t)
                    })
                }
            },
            ease.linear,
            ctx.layer)
        if (!wind.destroyed) wind.destroy()
    })

registerVfx("earthSpikes",
    async (ctx) => {
        const rock = new Graphics()
        ctx.layer.addChild(rock)
        const k = kOf(ctx)
        await Promise.all([
            tween(850,
                (t) => {
                    rock.clear()
                    const rise = Math.min(1,
                        t * 5)
                    for (let i = 0; i < 6; i++) {
                        const x = ctx.from.x + (i - 2.5) * 19 * k
                        const h = (35 + i % 3 * 13) * k * rise
                        rock.poly([x - 13 * k,
                            ctx.from.y + 25 * k,
                            x,
                            ctx.from.y - h,
                            x + 11 * k,
                            ctx.from.y + 25 * k]).fill({
                            color: ctx.color, alpha: 1 - t * t
                        }).stroke({
                            width: 2, color: ctx.color2 ?? 0xd6c5a6, alpha: 1 - t
                        })
                    }
                },
                ease.linear,
                ctx.layer),
            burst(ctx.layer,
                ctx.from,
                {
                    count: 30, color: [ctx.color,
                        ctx.color2 ?? 0xd6c5a6], speed: [50,
                        180], gravity: 240, life: [300,
                        650], size: [9,
                        2], additive: false
                })
        ])
        if (!rock.destroyed) rock.destroy()
    })

registerVfx("holyLight",
    async (ctx) => {
        const k = kOf(ctx)
        const column = makeSprite(ctx.layer,
            "glow",
            ctx.from.x,
            ctx.from.y - 55 * k,
            ctx.color,
            120 * k)
        await Promise.all([
            tween(850,
                (t) => {
                    column.width = 70 * k * Math.sin(Math.PI * t)
                    column.height = 230 * k
                    column.alpha = Math.sin(Math.PI * t) * .65
                },
                ease.linear,
                ctx.layer),
            ring(ctx.layer,
                ctx.from,
                ctx.color2 ?? 0xffffff,
                12,
                125 * k,
                700),
            burst(ctx.layer,
                ctx.from,
                {
                    count: 22, kind: "star", color: [ctx.color,
                        ctx.color2 ?? 0xffffff], speed: [20,
                        100], gravity: -70, life: [450,
                        800], size: [9,
                        1]
                })
        ])
        if (!column.destroyed) column.destroy()
    })

registerVfx("darkPulse",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            ring(ctx.layer,
                ctx.from,
                ctx.color,
                135 * k,
                8,
                650),
            flash(ctx.layer,
                ctx.from,
                ctx.color2 ?? 0xa5e3da,
                100 * k,
                650),
            stream(ctx.layer,
                () => {
                    const a = rand(0,
                        Math.PI * 2)
                    return {
                        x: ctx.from.x + Math.cos(a) * rand(15,
                            60) * k, y: ctx.from.y + Math.sin(a) * rand(15,
                            60) * k
                    }
                },
                700,
                45,
                {
                    color: [ctx.color,
                        ctx.color2 ?? 0xa5e3da], speed: [15,
                        50], gravity: -70, life: [300,
                        600], size: [14,
                        0]
                })
        ])
    })
