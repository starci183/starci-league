// Nấm Độc của Teemo, bám LoL: cây nấm thật mũ lục đốm tím (đúng icon Gài Bẫy), nổ thành mây độc chanh, mảnh mũ nấm và đất văng. Chỉ cây nấm là ảnh vẽ sẵn, còn lại là hạt.
// mushroomPlant và mushroomBurst do dispatch.vfxMushroom gọi trong trận; plan.ts đợi đúng 480ms cho nấm bay tới nạn nhân, nên FLIGHT_BURST phải giữ nguyên.
// ctx.amount là số Nấm gài (mặc định 1); ctx.intensity >= 2 là chí mạng. Chạm là báo ctx.onBeat, không chờ đuôi hạt tan.
import {
    Sprite, Texture, type Container
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

export const TOXIC = 0x9bea2e
export const TOXIC_LIGHT = 0xe2ff7a
export const TOXIC_DEEP = 0x3f9a1e
export const SPORE_PURPLE = 0x9a3fd6
export const SPORE_DARK = 0x4a1a78
const DIRT = 0x4a3420
const CRIT_HOT = 0xfff4b0

const TAU = Math.PI * 2
const FACE_W = 120
const FACE_H = 112
const FLIGHT_PLANT = 620
const FLIGHT_BURST = 480
/** Khoảng cách giữa các Nấm khi gài nhiều cây một lần */
const PLANT_GAP = 130

function paintMushroom(g: CanvasRenderingContext2D) {
    const stem = g.createLinearGradient(0,
        58,
        0,
        110)
    stem.addColorStop(0,
        "#fff4cf")
    stem.addColorStop(1,
        "#b98f52")
    g.fillStyle = stem
    g.beginPath()
    g.moveTo(46,
        58)
    g.quadraticCurveTo(50,
        92,
        38,
        108)
    g.quadraticCurveTo(60,
        114,
        82,
        108)
    g.quadraticCurveTo(70,
        92,
        74,
        58)
    g.fill()
    const dome = () => {
        g.beginPath()
        g.moveTo(4,
            66)
        g.bezierCurveTo(4,
            -14,
            116,
            -14,
            116,
            66)
        g.quadraticCurveTo(60,
            86,
            4,
            66)
    }
    const cap = g.createRadialGradient(44,
        22,
        6,
        60,
        44,
        78)
    cap.addColorStop(0,
        "#e6ff8e")
    cap.addColorStop(.42,
        "#7fd12f")
    cap.addColorStop(1,
        "#17501c")
    g.fillStyle = cap
    dome()
    g.fill()
    g.save()
    dome()
    g.clip()
    for (const [x,
        y,
        r] of [[32,
            40,
            15],
        [74,
            26,
            12],
        [92,
            52,
            11],
        [58,
            62,
            9],
        [14,
            62,
            8]]) {
        const spot = g.createRadialGradient(x - 3,
            y - 3,
            1,
            x,
            y,
            r)
        spot.addColorStop(0,
            "#c66df0")
        spot.addColorStop(.5,
            "#6a249c")
        spot.addColorStop(1,
            "rgba(70,20,110,0)")
        g.fillStyle = spot
        g.fillRect(x - r,
            y - r,
            r * 2,
            r * 2)
    }
    const glare = g.createRadialGradient(42,
        18,
        0,
        42,
        18,
        26)
    glare.addColorStop(0,
        "rgba(255,255,255,.8)")
    glare.addColorStop(1,
        "rgba(255,255,255,0)")
    g.fillStyle = glare
    g.fillRect(0,
        0,
        FACE_W,
        FACE_H)
    g.restore()
}

let face: Texture | undefined
function faceTexture(): Texture {
    if (face) return face
    const c = document.createElement("canvas")
    c.width = FACE_W
    c.height = FACE_H
    const g = c.getContext("2d")
    if (g) paintMushroom(g)
    face = Texture.from(c)
    return face
}

/** Cây nấm thật kèm quầng sáng lục tách khỏi nền bàn */
export function mushroomPiece(layer: Container, width: number) {
    const outer = makeSprite(layer,
        "glow",
        0,
        0,
        TOXIC,
        width * 3.4)
    const inner = makeSprite(layer,
        "glow",
        0,
        0,
        TOXIC_LIGHT,
        width * 1.8)
    outer.alpha = .5
    inner.alpha = .28
    const s = new Sprite(faceTexture())
    s.anchor.set(.5)
    const unit = width / FACE_W
    s.scale.set(unit)
    layer.addChild(s)
    const all = [outer,
        inner,
        s]
    return {
        move(p: Pt, rotation = 0) {
            for (const o of all) {
                if (o.destroyed) continue
                o.x = p.x
                o.y = p.y
            }
            if (!s.destroyed) s.rotation = rotation
        },
        size(k: number) { if (!s.destroyed) s.scale.set(unit * k) },
        hide() { for (const o of all) if (!o.destroyed) o.visible = false }
    }
}

/** Bào tử: hạt độc nhỏ, bay lên chậm */
export const spores = (over: Partial<DustOpts> = {
}): DustOpts => ({
    color: [TOXIC,
        TOXIC_LIGHT,
        TOXIC_DEEP,
        SPORE_PURPLE], speed: [20,
        140], gravity: -40, drag: 1.6, flow: 70, life: [320,
        720], size: [7,
        2], alpha: 1, ...over
})

/** Ô Bộ bài phe đối diện `from`: ô xa `from` nhất theo chiều dọc, nên trận thật và demo giống nhau */
export function foeDeck(from: Pt): Pt {
    let best = from
    let far = -1
    document.querySelectorAll("[data-cg-deck]").forEach((el) => {
        const r = el.getBoundingClientRect()
        if (!r.width) return
        const y = r.top + r.height / 2
        const gap = Math.abs(y - from.y)
        if (gap > far) {
            far = gap
            best = {
                x: r.left + r.width / 2, y
            }
        }
    })
    return best
}

/** Ô Bộ bài rùng lên khi có Nấm chui vào hay bật ra */
export function shudderDeck(at: Pt) {
    let best: Element | undefined
    let least = Infinity
    document.querySelectorAll("[data-cg-deck]").forEach((el) => {
        const r = el.getBoundingClientRect()
        const d = Math.hypot(r.left + r.width / 2 - at.x,
            r.top + r.height / 2 - at.y)
        if (d < least) {
            least = d
            best = el
        }
    })
    best?.animate([
        {
            transform: "scale(1)"
        },
        {
            transform: "scale(1.16) rotate(-3deg)"
        },
        {
            transform: "scale(1)"
        }
    ],
    {
        duration: 240, easing: "ease-out"
    })
}

/** Nấm bay theo cung, kéo bào tử. `reached` xong đúng lúc chạm, `tail` xong khi hạt tan */
export function flyMushroom(ctx: VfxCtx, a: Pt, b: Pt, ms: number, o: { width: number; rise: number; shrink?: number }) {
    let p = {
        ...a
    }
    // bào tử tạo trước để cây nấm nằm trên, không bị hạt cộng sáng làm bạc màu
    const tail = dustStream(ctx.layer,
        () => ({
            x: p.x, y: p.y + o.width * .3
        }),
        ms,
        520,
        spores({
            spread: o.width * .34, speed: [6,
                60], life: [260,
                560], size: [8,
                2]
        }))
    const piece = mushroomPiece(ctx.layer,
        o.width)
    piece.move(p)
    const reached = tween(ms,
        (t) => {
            p = {
                x: lerp(a.x,
                    b.x,
                    t), y: lerp(a.y,
                    b.y,
                    t) - Math.sin(t * Math.PI) * o.rise
            }
            piece.move(p,
                Math.sin(t * TAU * 1.5) * .3)
            if (o.shrink !== undefined) piece.size(lerp(1,
                o.shrink,
                t * t * t))
        },
        ease.linear,
        ctx.layer).then(() => { piece.hide() })
    return {
        reached, tail
    }
}

/** Nấm chui vào bộ: bào tử xì ra quanh ô, ô rùng lên */
export function deckPuff(ctx: VfxCtx, at: Pt) {
    shudderDeck(at)
    return Promise.all([
        bloom(ctx.layer,
            at,
            TOXIC,
            210,
            280),
        mist(ctx.layer,
            at,
            {
                color: [TOXIC,
                    SPORE_PURPLE], size: 90, alpha: .3, count: 6, life: [260,
                    520]
            }),
        dustBurst(ctx.layer,
            at,
            {
                ...spores({
                    spread: 20, speed: [50,
                        220], life: [240,
                        520]
                }), count: 130
            })
    ])
}

/** Nổ độc một khoảnh khắc: mây chanh bốc lên, mảnh mũ nấm, đất văng. crit thêm mảnh vàng trắng và rung mạnh */
export function toxicBlast(ctx: VfxCtx, at: Pt, power: number, crit: boolean) {
    ctx.shake(crit ? 8 : 4,
        crit ? 260 : 170)
    const pieces: Promise<unknown>[] = [
        bloom(ctx.layer,
            at,
            TOXIC,
            420 * power,
            360),
        bloom(ctx.layer,
            at,
            TOXIC_LIGHT,
            120 * power,
            200),
        bloom(ctx.layer,
            at,
            SPORE_PURPLE,
            340 * power,
            460),
        mist(ctx.layer,
            at,
            {
                color: [TOXIC,
                    TOXIC_LIGHT,
                    TOXIC_DEEP], size: 150 * power, alpha: .5, count: 14, speed: [60,
                    190], gravity: -60, life: [380,
                    700]
            }),
        mist(ctx.layer,
            at,
            {
                color: [TOXIC,
                    TOXIC_DEEP], size: 120 * power, alpha: .75, count: 12, speed: [50,
                    160], gravity: -70, life: [360,
                    680], additive: false
            }),
        mist(ctx.layer,
            at,
            {
                color: [SPORE_PURPLE,
                    SPORE_DARK], size: 110 * power, alpha: .36, count: 8, speed: [40,
                    150], life: [340,
                    640]
            }),
        dustBurst(ctx.layer,
            at,
            {
                ...spores({
                    speed: [80 * power,
                        420 * power], spread: 22 * power, size: [8,
                        2]
                }), count: Math.round(340 * power)
            }),
        dustBurst(ctx.layer,
            at,
            {
                color: [SPORE_PURPLE,
                    TOXIC_DEEP,
                    SPORE_DARK,
                    TOXIC], blade: true, speed: [200 * power,
                    640 * power], drag: 3, flow: 30, gravity: 260, life: [260,
                    560], size: [34 * power,
                    12], alpha: 1, additive: false, count: 46, spread: 14
            }),
        dustBurst(ctx.layer,
            at,
            {
                color: [DIRT,
                    0x6b4a2a,
                    0x2c2014], speed: [120,
                    440 * power], angle: [-Math.PI * .95,
                    -Math.PI * .05], gravity: 760, drag: 1, flow: 16, life: [300,
                    620], size: [8,
                    4], alpha: 1, additive: false, count: 70, spread: 18
            })
    ]
    if (crit) pieces.push(bloom(ctx.layer,
        at,
        0xffb030,
        150 * power,
        180),
    dustBurst(ctx.layer,
        at,
        {
            color: [0xffd23a,
                CRIT_HOT,
                0xff9a1e], blade: true, speed: [380 * power,
                980 * power], drag: 3.6, flow: 16, life: [180,
                360], size: [38 * power,
                12], alpha: 1, additive: false, count: 34, spread: 12
        }))
    return Promise.all(pieces)
}

/** Nội tại, Q: Nấm bay vào bộ đối thủ. Không có điểm đích thì tự tìm ô Bộ bài phe đối diện */
registerVfx("mushroomPlant",
    async (ctx) => {
        const deck = ctx.to[0] ?? foeDeck(ctx.from)
        const count = Math.max(1,
            ctx.amount ?? 1)
        const flights = Array.from({
            length: count
        },
        async (_, i) => {
            await tween(i * PLANT_GAP,
                () => {},
                ease.linear,
                ctx.layer)
            if (ctx.layer.destroyed) return
            const fly = flyMushroom(ctx,
                ctx.from,
                {
                    x: deck.x + rand(-8,
                        8), y: deck.y
                },
                FLIGHT_PLANT,
                {
                    width: 84, rise: 120 + (i % 3) * 46, shrink: .42
                })
            await fly.reached
            await Promise.all([deckPuff(ctx,
                deck),
            fly.tail])
        })
        await Promise.all([
            ...flights,
            tween(FLIGHT_PLANT + (count - 1) * PLANT_GAP,
                () => {},
                ease.linear,
                ctx.layer).then(() => ctx.onBeat?.())
        ])
    })

/** Nấm bật khỏi bộ, bay tới nạn nhân rồi nổ. Rút trúng và R Kích Nổ dùng chung */
registerVfx("mushroomBurst",
    async (ctx) => {
        const crit = ctx.intensity >= 2
        const target = ctx.to[0] ?? ctx.from
        shudderDeck(ctx.from)
        void bloom(ctx.layer,
            ctx.from,
            TOXIC,
            240,
            260)
        const fly = flyMushroom(ctx,
            ctx.from,
            target,
            FLIGHT_BURST,
            {
                width: crit ? 112 : 92, rise: rand(70,
                    150)
            })
        await fly.reached
        ctx.onBeat?.()
        await Promise.all([toxicBlast(ctx,
            target,
            crit ? 1.5 : 1.15,
            crit),
        fly.tail])
    })
