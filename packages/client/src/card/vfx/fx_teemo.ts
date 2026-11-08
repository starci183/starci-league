// VFX riêng của Teemo, bám LoL: Nấm mũ lục đốm tím, độc chanh, phi tiêu tối chóp lục, mù là khói tím đen xoáy mắt xoắn lục như icon Phi Tiêu Mù. Cây nấm và cú nổ ở fx_mushroom.ts.
// Mọi cú trúng báo ctx.onBeat đúng lúc chạm, không chờ đuôi hạt tan; mọi thứ tự dọn khi layer bị huỷ.
import {
    Sprite, Texture
} from "pixi.js"
import {
    bloom, dustBurst, dustStream, mist
} from "./fx_dust"
import {
    SPORE_DARK, SPORE_PURPLE, TOXIC, TOXIC_DEEP, TOXIC_LIGHT, deckPuff, flyMushroom, foeDeck, mushroomPiece, shudderDeck, spores, toxicBlast
} from "./fx_mushroom"
import {
    ease, lerp, makeSprite, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const TAU = Math.PI * 2
const SMOKE = 0x170c26
const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
const points = (ctx: VfxCtx) => ctx.to.length ? ctx.to : [ctx.from]
/** Chỗ cây nấm hiện ra trên đầu Teemo */
const overHead = (at: Pt): Pt => ({
    x: at.x, y: at.y - 96
})

const DART_W = 128
const DART_H = 40
const CARD_W = 56
const CARD_H = 80

function paint(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): Texture {
    const c = document.createElement("canvas")
    c.width = w
    c.height = h
    const g = c.getContext("2d")
    if (g) draw(g)
    return Texture.from(c)
}

/** Phi tiêu như icon: thân tối, đuôi lông tím, chóp lục */
function paintDart(g: CanvasRenderingContext2D) {
    const mid = DART_H / 2
    g.fillStyle = "#7a2fc0"
    g.beginPath()
    g.moveTo(44,
        mid)
    g.lineTo(0,
        2)
    g.lineTo(14,
        mid)
    g.lineTo(0,
        DART_H - 2)
    g.fill()
    const body = g.createLinearGradient(0,
        mid - 7,
        0,
        mid + 7)
    body.addColorStop(0,
        "#8a6a4a")
    body.addColorStop(1,
        "#2a1a12")
    g.fillStyle = body
    g.beginPath()
    g.moveTo(30,
        mid)
    g.quadraticCurveTo(70,
        mid - 12,
        104,
        mid - 3)
    g.lineTo(104,
        mid + 3)
    g.quadraticCurveTo(70,
        mid + 12,
        30,
        mid)
    g.fill()
    g.fillStyle = "#d4ff6a"
    g.beginPath()
    g.moveTo(DART_W,
        mid)
    g.lineTo(100,
        mid - 5)
    g.lineTo(100,
        mid + 5)
    g.fill()
}

function paintCardBack(g: CanvasRenderingContext2D) {
    g.fillStyle = "#c9a860"
    g.beginPath()
    g.roundRect(0,
        0,
        CARD_W,
        CARD_H,
        6)
    g.fill()
    const back = g.createLinearGradient(0,
        0,
        CARD_W,
        CARD_H)
    back.addColorStop(0,
        "#14233a")
    back.addColorStop(1,
        "#2c4a68")
    g.fillStyle = back
    g.beginPath()
    g.roundRect(4,
        4,
        CARD_W - 8,
        CARD_H - 8,
        4)
    g.fill()
}

let dart: Texture | undefined
let cardBack: Texture | undefined

/** Q mở màn: cây nấm trồi lên trên đầu Teemo giữa bào tử */
registerVfx("teemoTrapCast",
    async (ctx) => {
        const at = overHead(ctx.from)
        const piece = mushroomPiece(ctx.layer,
            100)
        piece.move(at)
        piece.size(.1)
        const MS = 320
        await Promise.all([
            bloom(ctx.layer,
                at,
                TOXIC,
                240,
                MS),
            dustStream(ctx.layer,
                () => at,
                MS,
                700,
                spores({
                    spread: 46, speed: [10,
                        70], life: [240,
                        480]
                })),
            tween(MS,
                (t) => { piece.size(.1 + .9 * t) },
                ease.out,
                ctx.layer).then(() => {
                piece.hide()
                ctx.onBeat?.()
            })
        ])
    })

/** Q bay: cây nấm từ trên đầu Teemo vọt tới mục tiêu, cùng thời lượng mushroomPlant để Nấm chui vào bộ đúng lúc nó nổ */
registerVfx("teemoTrapToss",
    async (ctx) => {
        const flights = points(ctx).map((to) => flyMushroom(ctx,
            overHead(ctx.from),
            to,
            620,
            {
                width: 100, rise: 110
            }))
        await Promise.all(flights.map(fly => fly.reached))
        ctx.onBeat?.()
        await Promise.all(flights.map(fly => fly.tail))
    })

/** Q trúng: cây nấm nổ trên mục tiêu */
registerVfx("teemoTrapHit",
    async (ctx) => {
        await toxicBlast(ctx,
            ctx.from,
            1.2 * kOf(ctx),
            false)
    })

/** E bay: phi tiêu thổi rất nhanh, thẳng, vệt lục tím */
registerVfx("teemoBlindDart",
    async (ctx) => {
        dart ??= paint(DART_W,
            DART_H,
            paintDart)
        const texture = dart
        const MS = 260
        await Promise.all(points(ctx).map(async (to) => {
            const dir = Math.atan2(to.y - ctx.from.y,
                to.x - ctx.from.x)
            const glow = makeSprite(ctx.layer,
                "glow",
                ctx.from.x,
                ctx.from.y,
                TOXIC,
                170)
            glow.alpha = .8
            let p = {
                ...ctx.from
            }
            const shared = {
                angle: [dir + Math.PI - .25,
                    dir + Math.PI + .25] as [number, number]
            }
            const trail = Promise.all([
                dustStream(ctx.layer,
                    () => p,
                    MS,
                    1500,
                    spores({
                        ...shared, spread: 8, speed: [30,
                            170], life: [200,
                            420]
                    })),
                dustStream(ctx.layer,
                    () => p,
                    MS,
                    240,
                    {
                        ...shared, color: [TOXIC,
                            TOXIC_LIGHT,
                            SPORE_PURPLE], streak: 9, speed: [120,
                            340], flow: 10, drag: 3, life: [140,
                            280], size: [9,
                            4], alpha: 1
                    })
            ])
            // phi tiêu tạo sau vệt hạt để nằm trên, không bị cộng sáng làm bạc màu
            const s = new Sprite(texture)
            s.anchor.set(.5)
            s.rotation = dir
            ctx.layer.addChild(s)
            await tween(MS,
                (t) => {
                    p = {
                        x: lerp(ctx.from.x,
                            to.x,
                            t), y: lerp(ctx.from.y,
                            to.y,
                            t)
                    }
                    if (!s.destroyed) {
                        s.x = p.x
                        s.y = p.y
                    }
                    if (!glow.destroyed) {
                        glow.x = p.x
                        glow.y = p.y
                    }
                },
                ease.linear,
                ctx.layer)
            if (!s.destroyed) s.visible = false
            if (!glow.destroyed) glow.visible = false
            ctx.onBeat?.()
            await trail
        }))
    })

/** E trúng, Mù: lục loé, khói tím đen cuộn trùm mặt, bụi lục xoáy lỏng trong khói như mắt xoắn trên icon, không thành vòng rõ nét */
registerVfx("teemoBlindHit",
    async (ctx) => {
        const at = {
            x: ctx.from.x, y: ctx.from.y - 26
        }
        const MS = 760
        let spin = 0
        const swirl = (phase: number) => () => {
            const a = (spin + phase) * TAU
            const r = 26 + 34 * Math.abs(Math.sin(spin * 2.1 + phase * 5))
            return {
                x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r * .7
            }
        }
        ctx.shake(3,
            150)
        await Promise.all([
            bloom(ctx.layer,
                at,
                TOXIC,
                360,
                340),
            dustStream(ctx.layer,
                () => at,
                MS,
                46,
                {
                    color: [SMOKE,
                        SPORE_DARK,
                        0x2a1244], puff: true, speed: [10,
                        70], spread: 44, flow: 26, drag: 1.2, life: [320,
                        640], size: [80,
                        170], alpha: .95, additive: false
                }),
            mist(ctx.layer,
                at,
                {
                    color: [SMOKE,
                        SPORE_DARK], size: 150, alpha: 1, count: 18, speed: [20,
                        120], life: [460,
                        MS + 200], additive: false
                }),
            dustBurst(ctx.layer,
                at,
                {
                    color: [TOXIC,
                        TOXIC_DEEP,
                        SPORE_PURPLE], blade: true, speed: [240,
                        680], drag: 3.4, flow: 24, life: [180,
                        380], size: [32,
                        10], alpha: 1, additive: false, count: 40, spread: 10
                }),
            dustBurst(ctx.layer,
                at,
                {
                    ...spores({
                        speed: [60,
                            300], spread: 18
                    }), count: 200
                }),
            ...[0,
                .5].map(phase => dustStream(ctx.layer,
                swirl(phase),
                MS,
                520,
                {
                    color: [TOXIC,
                        TOXIC_LIGHT,
                        TOXIC_DEEP], speed: [6,
                        50], spread: 14, gravity: 0, flow: 34, drag: 2, life: [240,
                        460], size: [9,
                        3], alpha: 1, additive: false
                })),
            tween(MS,
                (t) => { spin = t * 2 },
                ease.linear,
                ctx.layer)
        ])
    })

/** R mở màn: tia độc từ Teemo lao vào Bộ bài đối thủ, cả bộ rùng lên, sẵn sàng phun Nấm. ctx.to[0] là ô Bộ bài nếu có */
registerVfx("teemoDetonateCast",
    async (ctx) => {
        const deck = ctx.to[0] ?? foeDeck(ctx.from)
        const k = kOf(ctx)
        const MS = 380
        let p = {
            ...ctx.from
        }
        void bloom(ctx.layer,
            ctx.from,
            SPORE_PURPLE,
            280 * k,
            MS)
        const signal = Promise.all([
            dustStream(ctx.layer,
                () => p,
                MS,
                1300,
                spores({
                    color: [SPORE_PURPLE,
                        TOXIC,
                        TOXIC_LIGHT], spread: 14, speed: [20,
                        110], life: [220,
                        460], size: [9,
                        3]
                })),
            tween(MS,
                (t) => {
                    p = {
                        x: lerp(ctx.from.x,
                            deck.x,
                            t), y: lerp(ctx.from.y,
                            deck.y,
                            t) - Math.sin(t * Math.PI) * 60
                    }
                },
                ease.inOut,
                ctx.layer)
        ])
        await tween(MS,
            () => {},
            ease.linear,
            ctx.layer)
        shudderDeck(deck)
        ctx.onBeat?.()
        await Promise.all([
            signal,
            deckPuff(ctx,
                deck),
            bloom(ctx.layer,
                deck,
                SPORE_PURPLE,
                360 * k,
                520)
        ])
    })

/** Rút bù sau khi Nấm nổ: một lá úp từ Bộ bài bay về tay */
registerVfx("teemoRedraw",
    async (ctx) => {
        cardBack ??= paint(CARD_W,
            CARD_H,
            paintCardBack)
        const to = ctx.to[0] ?? ctx.from
        const s = new Sprite(cardBack)
        s.anchor.set(.5)
        s.position.set(ctx.from.x,
            ctx.from.y)
        ctx.layer.addChild(s)
        await tween(420,
            (t) => {
                if (s.destroyed) return
                s.x = lerp(ctx.from.x,
                    to.x,
                    t)
                s.y = lerp(ctx.from.y,
                    to.y,
                    t) - Math.sin(t * Math.PI) * 40
                s.rotation = t * .4
            },
            ease.inOut,
            ctx.layer)
        if (!s.destroyed) s.visible = false
        ctx.onBeat?.()
    })
