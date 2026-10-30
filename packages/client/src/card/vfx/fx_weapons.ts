// Đòn vũ khí phân biệt bằng hình dáng/chuyển động, không chỉ đổi màu cùng một quả cầu.
import {
    Graphics
} from "pixi.js"
import {
    burst, ease, flash, lerp, ring, tween
} from "./particles"
import {
    registerVfx, type VfxCtx
} from "./types"

const targets = (ctx: VfxCtx) => ctx.to.length ? ctx.to : [ctx.from]

registerVfx("swordSlash",
    async (ctx) => {
        await Promise.all(targets(ctx).map(async (to) => {
            const blade = new Graphics()
            blade.blendMode = "add"
            ctx.layer.addChild(blade)
            const k = Math.sqrt(ctx.intensity)
            await tween(350,
                (t) => {
                    blade.clear()
                    blade.position.set(lerp(ctx.from.x,
                        to.x,
                        ease.out(t)),
                    lerp(ctx.from.y,
                        to.y,
                        ease.out(t)))
                    blade.rotation = -1.4 + t * 2.8
                    for (let i = 0; i < 3; i++) blade.arc(0,
                        0,
                        (32 + i * 8) * k,
                        -.95,
                        1.15).stroke({
                        width: (8 - i * 2.5) * k, color: i ? ctx.color : ctx.color2 ?? 0xffffff, alpha: Math.sin(t * Math.PI) * (1 - i * .25)
                    })
                },
                ease.linear,
                ctx.layer)
            if (!blade.destroyed) blade.destroy()
        }))
    })

registerVfx("bowShot",
    async (ctx) => {
        await Promise.all(targets(ctx).map(async (to) => {
            const arrow = new Graphics()
            const k = Math.sqrt(ctx.intensity)
            arrow.moveTo(-30 * k,
                0).lineTo(17 * k,
                0).stroke({
                width: 2 * k, color: ctx.color
            })
            arrow.poly([21 * k,
                0,
                9 * k,
                -6 * k,
                11 * k,
                0,
                9 * k,
                6 * k]).fill(ctx.color2 ?? 0xf6f1d8)
            arrow.moveTo(-25 * k,
                0).lineTo(-33 * k,
                -6 * k).moveTo(-20 * k,
                0).lineTo(-28 * k,
                6 * k).stroke({
                width: 2 * k, color: ctx.color2 ?? 0xf6f1d8
            })
            arrow.rotation = Math.atan2(to.y - ctx.from.y,
                to.x - ctx.from.x)
            ctx.layer.addChild(arrow)
            await tween(420,
                (t) => {
                    arrow.position.set(lerp(ctx.from.x,
                        to.x,
                        t),
                    lerp(ctx.from.y,
                        to.y,
                        t))
                    arrow.alpha = Math.min(1,
                        t * 8)
                },
                ease.in,
                ctx.layer)
            if (!arrow.destroyed) arrow.destroy()
        }))
    })

registerVfx("gunshot",
    async (ctx) => {
        await Promise.all(targets(ctx).map(async (to) => {
            const tracer = new Graphics()
            tracer.blendMode = "add"
            ctx.layer.addChild(tracer)
            await Promise.all([
                flash(ctx.layer,
                    ctx.from,
                    ctx.color2 ?? 0xffedbe,
                    60 * Math.sqrt(ctx.intensity),
                    150),
                tween(170,
                    (t) => {
                        tracer.clear()
                        const tail = Math.max(0,
                            t - .35)
                        tracer.moveTo(lerp(ctx.from.x,
                            to.x,
                            tail),
                        lerp(ctx.from.y,
                            to.y,
                            tail)).lineTo(lerp(ctx.from.x,
                            to.x,
                            t),
                        lerp(ctx.from.y,
                            to.y,
                            t)).stroke({
                            width: 4 * Math.sqrt(ctx.intensity), color: ctx.color, alpha: 1 - t * .4
                        })
                        tracer.moveTo(lerp(ctx.from.x,
                            to.x,
                            tail),
                        lerp(ctx.from.y,
                            to.y,
                            tail)).lineTo(lerp(ctx.from.x,
                            to.x,
                            t),
                        lerp(ctx.from.y,
                            to.y,
                            t)).stroke({
                            width: 1.5, color: ctx.color2 ?? 0xffffff
                        })
                    },
                    ease.linear,
                    ctx.layer)
            ])
            if (!tracer.destroyed) tracer.destroy()
        }))
    })

registerVfx("daggerThrow",
    async (ctx) => {
        await Promise.all(targets(ctx).map(async (to) => {
            const blade = new Graphics()
            blade.poly([0,
                -22,
                7,
                4,
                0,
                10,
                -7,
                4]).fill(ctx.color2 ?? 0xe9edff).stroke({
                width: 1.5, color: ctx.color
            })
            blade.rect(-3,
                8,
                6,
                14).fill(ctx.color)
            ctx.layer.addChild(blade)
            await tween(390,
                (t) => {
                    blade.position.set(lerp(ctx.from.x,
                        to.x,
                        t),
                    lerp(ctx.from.y,
                        to.y,
                        t) - Math.sin(t * Math.PI) * 35)
                    blade.rotation = t * Math.PI * 5
                    blade.scale.set(Math.sqrt(ctx.intensity))
                },
                ease.in,
                ctx.layer)
            if (!blade.destroyed) blade.destroy()
        }))
    })

registerVfx("heavyStrike",
    async (ctx) => {
        await Promise.all(targets(ctx).map(async (to) => {
            const weapon = new Graphics()
            const k = Math.sqrt(ctx.intensity)
            weapon.roundRect(-3,
                -42,
                6,
                65,
                2).fill(ctx.color2 ?? 0xcec8b6)
            weapon.poly([-24,
                -38,
                -15,
                -58,
                18,
                -52,
                29,
                -31,
                10,
                -23,
                -1,
                -36]).fill(ctx.color).stroke({
                width: 2, color: ctx.color2 ?? 0xffecc2
            })
            ctx.layer.addChild(weapon)
            await tween(470,
                (t) => {
                    weapon.position.set(lerp(ctx.from.x,
                        to.x,
                        ease.inOut(t)),
                    lerp(ctx.from.y,
                        to.y,
                        ease.inOut(t)) - Math.sin(t * Math.PI) * 32)
                    weapon.rotation = -1.7 + t * 3
                    weapon.scale.set(k)
                    weapon.alpha = Math.min(1,
                        (1 - t) * 6)
                },
                ease.linear,
                ctx.layer)
            if (!weapon.destroyed) weapon.destroy()
        }))
    })

async function spellCast(ctx: VfxCtx) {
    const rune = new Graphics()
    rune.blendMode = "add"
    ctx.layer.addChild(rune)
    const k = Math.sqrt(ctx.intensity)
    await Promise.all([
        tween(480,
            (t) => {
                rune.clear()
                const r = (30 + Math.sin(t * Math.PI) * 20) * k
                rune.position.set(ctx.from.x,
                    ctx.from.y)
                rune.rotation = t * 1.6
                rune.circle(0,
                    0,
                    r).stroke({
                    width: 2, color: ctx.color, alpha: Math.sin(t * Math.PI)
                })
                rune.circle(0,
                    0,
                    r * .72).stroke({
                    width: 1, color: ctx.color2 ?? 0xffffff, alpha: Math.sin(t * Math.PI)
                })
                for (let i = 0; i < 8; i++) {
                    const a = i * Math.PI / 4
                    rune.moveTo(Math.cos(a) * r * .8,
                        Math.sin(a) * r * .8).lineTo(Math.cos(a) * r * 1.18,
                        Math.sin(a) * r * 1.18).stroke({
                        width: 3, color: ctx.color2 ?? 0xffffff, alpha: Math.sin(t * Math.PI)
                    })
                }
            },
            ease.linear,
            ctx.layer),
        ring(ctx.layer,
            ctx.from,
            ctx.color,
            75 * k,
            10,
            450)
    ])
    if (!rune.destroyed) rune.destroy()
}

registerVfx("spellCast",
    spellCast)
// Các mapping cũ gọi charge; giữ alias để không có cast rỗng.
registerVfx("charge",
    spellCast)

registerVfx("swordHit",
    async (ctx) => {
        const cut = new Graphics()
        cut.blendMode = "add"
        ctx.layer.addChild(cut)
        await Promise.all([
            tween(300,
                (t) => {
                    cut.clear()
                    for (const angle of [-.7,
                        .8]) {
                        const r = (18 + t * 35) * Math.sqrt(ctx.intensity)
                        cut.moveTo(ctx.from.x - Math.cos(angle) * r,
                            ctx.from.y - Math.sin(angle) * r).lineTo(ctx.from.x + Math.cos(angle) * r,
                            ctx.from.y + Math.sin(angle) * r).stroke({
                            width: (1 - t) * 6, color: ctx.color2 ?? 0xffffff, alpha: 1 - t
                        })
                    }
                },
                ease.out,
                ctx.layer),
            burst(ctx.layer,
                ctx.from,
                {
                    count: 18, kind: "spark", color: [ctx.color,
                        ctx.color2 ?? 0xffffff], speed: [70,
                        240], life: [200,
                        420], size: [12,
                        1], stretch: true
                })
        ])
        if (!cut.destroyed) cut.destroy()
    })

registerVfx("bulletHit",
    async (ctx) => {
        await Promise.all([
            flash(ctx.layer,
                ctx.from,
                ctx.color2 ?? 0xffdf9d,
                75 * Math.sqrt(ctx.intensity),
                220),
            burst(ctx.layer,
                ctx.from,
                {
                    count: Math.round(17 * ctx.intensity), kind: "spark", color: [ctx.color,
                        ctx.color2 ?? 0xffdf9d], speed: [90,
                        260], gravity: 140, life: [180,
                        400], size: [12,
                        1], stretch: true
                })
        ])
    })
