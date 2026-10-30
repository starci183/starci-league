// Ngữ pháp phòng thủ: Giáp kim loại, Kháng Phép rune, giảm sát thương và miễn nhiễm không dùng chung một bọt khiên.
import {
    Graphics
} from "pixi.js"
import {
    burst, ease, lerp, tween
} from "./particles"
import {
    registerVfx, type VfxCtx
} from "./types"

async function defense(ctx: VfxCtx, kind: "armor" | "mr" | "cut" | "immune" | "reflect") {
    const g = new Graphics()
    ctx.layer.addChild(g)
    const k = Math.sqrt(ctx.intensity)
    const { x, y } = ctx.from
    await tween(850,
        (t) => {
            g.clear()
            const a = Math.sin(Math.PI * t)
            if (kind === "armor") {
                for (const side of [-1,
                    1]) {
                    const px = x + side * (39 - t * 7) * k
                    g.poly([px - 12,
                        y - 37,
                        px + 11,
                        y - 32,
                        px + 14,
                        y + 20,
                        px,
                        y + 38,
                        px - 14,
                        y + 20]).fill({
                        color: 0xa1b5bc, alpha: a * .65
                    }).stroke({
                        color: 0xe4edf1, width: 2, alpha: a
                    })
                    for (let i = 0; i < 3; i++) g.moveTo(px - 7,
                        y - 22 + i * 17).lineTo(px + 8,
                        y - 19 + i * 17).stroke({
                        color: 0x435f67, width: 2, alpha: a
                    })
                }
            } else if (kind === "mr") {
                for (let i = 0; i < 6; i++) {
                    const angle = i * Math.PI / 3 + t * .5
                    const px = x + Math.cos(angle) * 57 * k
                    const py = y + Math.sin(angle) * 57 * k
                    g.poly([px,
                        py - 8,
                        px + 6,
                        py,
                        px,
                        py + 8,
                        px - 6,
                        py]).stroke({
                        color: 0xb8caff, width: 2, alpha: a
                    })
                }
                g.circle(x,
                    y,
                    48 * k).stroke({
                    color: 0x758ddd, width: 2, alpha: a * .8
                })
            } else if (kind === "reflect") {
                for (const side of [-1,
                    1]) {
                    g.moveTo(x + side * 20,
                        y - 28).lineTo(x + side * 43,
                        y).lineTo(x + side * 20,
                        y + 28).stroke({
                        color: ctx.color2 ?? 0xd4f1c5, width: 4, alpha: a
                    })
                    g.moveTo(x + side * 32,
                        y - 28).lineTo(x + side * 55,
                        y).lineTo(x + side * 32,
                        y + 28).stroke({
                        color: ctx.color, width: 2, alpha: a * .5
                    })
                }
            } else {
                const radius = (40 + t * 8) * k
                if (kind === "immune") g.circle(x,
                    y,
                    radius).fill({
                    color: 0xffedbc, alpha: a * .12
                }).stroke({
                    color: 0xfff3cf, width: 4, alpha: a
                })
                else for (let i = 0; i < 4; i++) g.arc(x,
                    y,
                    radius + i * 7,
                    -.9 + i * .1,
                    .9 - i * .1).stroke({
                    color: 0xabbdb1, width: 3, alpha: a * (1 - i * .2)
                })
            }
        },
        ease.linear,
        ctx.layer)
    if (!g.destroyed) g.destroy()
}

registerVfx("armorPlate",
    (ctx) => defense(ctx,
        "armor"))
registerVfx("runicBarrier",
    (ctx) => defense(ctx,
        "mr"))
registerVfx("damageReduction",
    (ctx) => defense(ctx,
        "cut"))
registerVfx("invulnerability",
    (ctx) => defense(ctx,
        "immune"))
registerVfx("reflectWard",
    (ctx) => defense(ctx,
        "reflect"))
registerVfx("reflectReturn",
    async (ctx) => {
        await Promise.all(ctx.to.map(async (to) => {
            const energy = new Graphics()
            energy.blendMode = "add"
            ctx.layer.addChild(energy)
            await tween(540,
                (t) => {
                    energy.clear()
                    const x = lerp(ctx.from.x,
                        to.x,
                        t)
                    const y = lerp(ctx.from.y,
                        to.y,
                        t) - Math.sin(t * Math.PI) * 44
                    energy.circle(x,
                        y,
                        10 * Math.sqrt(ctx.intensity)).fill({
                        color: 0xffffff, alpha: .9
                    })
                    energy.moveTo(lerp(ctx.from.x,
                        to.x,
                        Math.max(0,
                            t - .25)),
                    lerp(ctx.from.y,
                        to.y,
                        Math.max(0,
                            t - .25)) - Math.sin(Math.max(0,
                        t - .25) * Math.PI) * 44).lineTo(x,
                        y).stroke({
                        color: ctx.color, width: 7, alpha: .6
                    })
                },
                ease.inOut,
                ctx.layer)
            if (!energy.destroyed) energy.destroy()
            if (!ctx.layer.destroyed) await burst(ctx.layer,
                to,
                {
                    count: 16, kind: "star", color: [0xffffff,
                        ctx.color2 ?? 0xcff4c6], speed: [60,
                        170], life: [220,
                        400], size: [8,
                        1]
                })
        }))
    })
