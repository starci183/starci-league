// VFX riêng của Twisted Fate, bám LoL: lá bài thật xoay trong kim tuyến. Bảng màu lấy từ icon chiêu gốc: lá "xanh" chàm tím có mắt trắng, lá đỏ đỏ thẫm có chữ thập, lá vàng ánh trắng nóng; Định Mệnh là con mắt hổ phách.
// Lá lật luôn đi ra từ ô Bộ bài: hiệu ứng tự tìm ô Bộ bài gần `from` nhất trong DOM nên trận thật và demo giống nhau. Chỉ lá bài dùng hình, còn lại là mảnh blade và bụi kim tuyến.
// Loại lá truyền qua ctx.amount (TF_CARD); không có thì là lá vàng. Trúng là báo ctx.onBeat, không chờ đuôi hạt tan; mọi thứ tự dọn khi layer bị huỷ.
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

const TAU = Math.PI * 2
/** Lá bài: mã số gửi qua ctx.amount */
export const TF_CARD = {
    blue: 0, red: 1, gold: 2
} as const
type CardKind = "blue" | "red" | "gold"
const KINDS: CardKind[] = ["blue",
    "red",
    "gold"]
const kindOf = (ctx: VfxCtx): CardKind => KINDS[ctx.amount ?? TF_CARD.gold] ?? "gold"

const GOLD = 0xffc23a
const WHITE_GOLD = 0xfff0c0
const AMBER = 0xff8a1e
const INDIGO = 0x4a3cf0

interface Tone { main: number; light: number; dust: number[] }
const TONES: Record<CardKind, Tone> = {
    blue: {
        main: INDIGO, light: 0xb4c2ff, dust: [INDIGO,
            0x7a6cff,
            0xb4c2ff,
            0xffffff]
    },
    red: {
        main: 0xe0241c, light: 0xffb09a, dust: [0xe0241c,
            0xff5a2e,
            0xffb09a,
            GOLD]
    },
    gold: {
        main: GOLD, light: WHITE_GOLD, dust: [GOLD,
            0xffe07a,
            WHITE_GOLD,
            0xffffff]
    }
}

const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)

/** Ô Bộ bài gần `from` nhất: mỗi bên bàn có một ô, tướng ở hàng nào thì gần ô của phe đó */
function deckOf(from: Pt): Pt {
    let best = from
    let least = Infinity
    document.querySelectorAll("[data-cg-deck]").forEach((el) => {
        const r = el.getBoundingClientRect()
        if (!r.width) return
        const p = {
            x: r.left + r.width / 2, y: r.top + r.height / 2
        }
        const d = Math.hypot(p.x - from.x,
            p.y - from.y)
        if (d < least) {
            least = d
            best = p
        }
    })
    return best
}

/** Khoảng trống phía trên ô Bộ bài, lệch vào giữa bàn để lá bài không bị cắt ở mép */
const overDeck = (deck: Pt, up: number, inward: number): Pt => ({
    x: deck.x + (window.innerWidth / 2 > deck.x ? inward : -inward), y: deck.y - up
})

const FACE_W = 96
const FACE_H = 140

function drawSigil(g: CanvasRenderingContext2D, kind: CardKind) {
    const cx = FACE_W / 2, cy = FACE_H / 2
    g.fillStyle = "#fff"
    g.beginPath()
    if (kind === "blue") {
        // mắt trắng như lá chàm trên icon Chọn Bài
        g.moveTo(cx,
            cy - 42)
        g.quadraticCurveTo(cx + 34,
            cy,
            cx,
            cy + 42)
        g.quadraticCurveTo(cx - 34,
            cy,
            cx,
            cy - 42)
        g.fill()
        g.fillStyle = "#3a2ad0"
        g.beginPath()
        g.arc(cx + 3,
            cy,
            10,
            0,
            TAU)
        g.fill()
    } else if (kind === "red") {
        g.fillStyle = "#ffb060"
        g.fillRect(cx - 5,
            cy - 44,
            10,
            88)
        g.fillRect(cx - 32,
            cy - 16,
            64,
            10)
    } else {
        g.fillStyle = "#fff6d0"
        for (let i = 0; i < 8; i++) {
            const a = i / 8 * TAU
            g.moveTo(cx + Math.cos(a) * 42,
                cy + Math.sin(a) * 42)
            g.lineTo(cx + Math.cos(a + .32) * 13,
                cy + Math.sin(a + .32) * 13)
            g.lineTo(cx + Math.cos(a - .32) * 13,
                cy + Math.sin(a - .32) * 13)
        }
        g.fill()
    }
}

/** Mặt lá bài vẽ một lần: viền vàng, nền theo loại, mặt lưng chàm thẫm hoa văn vàng */
function faceTexture(kind: CardKind | "back"): Texture {
    const c = document.createElement("canvas")
    c.width = FACE_W
    c.height = FACE_H
    const g = c.getContext("2d")
    if (g) {
        const fill = kind === "back" ? ["#14104e",
            "#2c2290"] : kind === "blue" ? ["#2a1cb0",
            "#6a4cff"] : kind === "red" ? ["#7a0c0c",
            "#e8301f"] : ["#b87400",
            "#ffd257"]
        const grad = g.createLinearGradient(0,
            0,
            FACE_W,
            FACE_H)
        grad.addColorStop(0,
            fill[0])
        grad.addColorStop(1,
            fill[1])
        g.fillStyle = "#ffd36a"
        g.beginPath()
        g.roundRect(0,
            0,
            FACE_W,
            FACE_H,
            10)
        g.fill()
        g.fillStyle = grad
        g.beginPath()
        g.roundRect(6,
            6,
            FACE_W - 12,
            FACE_H - 12,
            6)
        g.fill()
        if (kind === "back") {
            g.fillStyle = "#ffd36a"
            g.beginPath()
            g.moveTo(FACE_W / 2,
                FACE_H * .24)
            g.lineTo(FACE_W * .72,
                FACE_H / 2)
            g.lineTo(FACE_W / 2,
                FACE_H * .76)
            g.lineTo(FACE_W * .28,
                FACE_H / 2)
            g.fill()
        } else drawSigil(g,
            kind)
    }
    return Texture.from(c)
}

const faces = new Map<string, Texture>()
const faceOf = (kind: CardKind | "back"): Texture => {
    const known = faces.get(kind)
    if (known) return known
    const made = faceTexture(kind)
    faces.set(kind,
        made)
    return made
}

/** Lá bài thật: sprite nhỏ, lật bằng cách co bề ngang, không dùng nét vẽ */
function makeCard(layer: Container, kind: CardKind | "back", width: number) {
    const s = new Sprite(faceOf(kind))
    s.anchor.set(.5)
    const unit = width / FACE_W
    s.scale.set(unit)
    layer.addChild(s)
    const alive = () => !s.destroyed
    return {
        move(p: Pt, rotation?: number) {
            if (!alive()) return
            s.x = p.x
            s.y = p.y
            if (rotation !== undefined) s.rotation = rotation
        },
        /** 0: mặt `from`, .5: nghiêng hẳn, 1: mặt `to` */
        flip(phase: number, from: CardKind | "back", to: CardKind | "back") {
            if (!alive()) return
            s.texture = faceOf(phase < .5 ? from : to)
            s.scale.x = unit * Math.max(.04,
                Math.abs(Math.cos(phase * Math.PI)))
        },
        set(kindNow: CardKind | "back") { if (alive()) s.texture = faceOf(kindNow) },
        size(k: number) { if (alive()) s.scale.set(unit * k) },
        fade(alpha: number) { if (alive()) s.alpha = alpha },
        hide() { if (alive()) s.visible = false }
    }
}

/** Quầng sáng mềm bám lá bài, tách khỏi nền bàn để đọc được ở cỡ nhỏ */
function aura(ctx: VfxCtx, at: Pt, tone: Tone, width: number) {
    const outer = makeSprite(ctx.layer,
        "glow",
        at.x,
        at.y,
        tone.main,
        width * 4.2)
    const inner = makeSprite(ctx.layer,
        "glow",
        at.x,
        at.y,
        tone.light,
        width * 2.2)
    outer.alpha = .75
    inner.alpha = .6
    ctx.layer.setChildIndex(outer,
        0)
    ctx.layer.setChildIndex(inner,
        1)
    return {
        move(p: Pt) {
            for (const s of [outer,
                inner]) {
                if (s.destroyed) continue
                s.x = p.x
                s.y = p.y
            }
        },
        tint(next: Tone) {
            if (!outer.destroyed) outer.tint = next.main
            if (!inner.destroyed) inner.tint = next.light
        },
        hide() {
            for (const s of [outer,
                inner]) if (!s.destroyed) s.alpha = 0
        }
    }
}

/** Kim tuyến: hạt rất nhỏ, sáng, sống lâu */
const glitter = (color: number[], over: Partial<DustOpts> = {
}): DustOpts => ({
    color, speed: [20,
        150], gravity: 24, drag: 1.6, flow: 60, life: [420,
        1000], size: [5,
        1.4], alpha: 1, ...over
})
/** Mảnh bài mỏng như dao cạo */
const shard = (color: number[], length: number, over: Partial<DustOpts> = {
}): DustOpts => ({
    color, blade: true, speed: [160,
        520], drag: 3.4, flow: 40, life: [240,
        520], size: [length,
        length * .35], alpha: 1, additive: false, ...over
})

/** Kim tuyến và mảnh bài quấn quanh lá đang bay */
function wrap(ctx: VfxCtx, head: () => Pt, ms: number, tone: Tone, width: number) {
    return Promise.all([
        dustStream(ctx.layer,
            head,
            ms,
            1000,
            glitter(tone.dust,
                {
                    spread: width * .7, speed: [6,
                        60], life: [300,
                        700], size: [6.5,
                        1.8]
                })),
        dustStream(ctx.layer,
            head,
            ms,
            560,
            glitter([GOLD,
                WHITE_GOLD],
            {
                spread: width * .5, speed: [6,
                    50], life: [220,
                    520], size: [4,
                    1.2]
            })),
        dustStream(ctx.layer,
            head,
            ms,
            120,
            shard(tone.dust,
                width * .9,
                {
                    speed: [30,
                        150], spread: width * .4, life: [160,
                        340]
                }))
    ])
}

/** Bung tại chỗ: quầng sáng, mảnh bài toả ra, kim tuyến rơi chậm */
function cardBurst(ctx: VfxCtx, at: Pt, tone: Tone, power: number, count: number) {
    return Promise.all([
        bloom(ctx.layer,
            at,
            tone.main,
            270 * power,
            340),
        bloom(ctx.layer,
            at,
            tone.light,
            120 * power,
            220),
        mist(ctx.layer,
            at,
            {
                color: [tone.main,
                    tone.light], size: 120 * power, alpha: .22, count: 9, speed: [40,
                    130]
            }),
        dustBurst(ctx.layer,
            at,
            {
                ...shard([...tone.dust,
                    GOLD],
                34 * power,
                {
                    speed: [220 * power,
                        640 * power]
                }), count: Math.round(count * .22), spread: 12
            }),
        dustBurst(ctx.layer,
            at,
            {
                ...glitter(tone.dust,
                    {
                        speed: [60 * power,
                            300 * power], spread: 22 * power
                    }), count
            })
    ])
}

/** Lá bài rời ô Bộ bài, lật mặt rồi xoay bay tới đích. Báo ctx.onBeat đúng lúc chạm */
async function throwCard(ctx: VfxCtx, to: Pt, kind: CardKind, ms: number, width: number) {
    const tone = TONES[kind]
    const deck = deckOf(ctx.from)
    const lift = overDeck(deck,
        52,
        26)
    const liftShare = .3
    const card = makeCard(ctx.layer,
        "back",
        width)
    const glow = aura(ctx,
        deck,
        tone,
        width)
    let p = {
        ...deck
    }
    card.move(p)
    void bloom(ctx.layer,
        deck,
        GOLD,
        190 * width / 46,
        260)
    await Promise.all([
        wrap(ctx,
            () => p,
            ms,
            tone,
            width),
        tween(ms,
            (u) => {
                if (u < liftShare) {
                    const a = u / liftShare
                    p = {
                        x: lerp(deck.x,
                            lift.x,
                            a), y: lerp(deck.y,
                            lift.y,
                            a)
                    }
                    card.flip(a,
                        "back",
                        kind)
                    card.move(p,
                        -.18)
                } else {
                    const a = (u - liftShare) / (1 - liftShare)
                    const fly = a * a
                    p = {
                        x: lerp(lift.x,
                            to.x,
                            fly), y: lerp(lift.y,
                            to.y,
                            fly) - Math.sin(fly * Math.PI) * 34
                    }
                    card.flip(1,
                        "back",
                        kind)
                    card.move(p,
                        -.18 + a * TAU * 2.5)
                }
                glow.move(p)
            },
            ease.linear,
            ctx.layer).then(() => {
            card.hide()
            glow.hide()
            ctx.onBeat?.()
        })
    ])
}

/** Nội tại Thần Bài: lá trên cùng nhấc khỏi Bộ bài, loé vàng, rồi trượt xuống dưới đáy */
registerVfx("tfDeckPeek",
    async (ctx) => {
        const deck = deckOf(ctx.from)
        const top = overDeck(deck,
            84,
            30)
        const side = overDeck(deck,
            14,
            92)
        const width = 62
        const card = makeCard(ctx.layer,
            "back",
            width)
        const glow = aura(ctx,
            deck,
            TONES.gold,
            width)
        let p = {
            ...deck
        }
        const LIFT = 320, READ = 380, SLIDE = 460
        await Promise.all([
            dustStream(ctx.layer,
                () => p,
                LIFT + READ + SLIDE,
                360,
                glitter([GOLD,
                    WHITE_GOLD,
                    INDIGO],
                {
                    spread: 36, speed: [6,
                        60], life: [280,
                        680]
                })),
            (async () => {
                await tween(LIFT,
                    (t) => {
                        p = {
                            x: lerp(deck.x,
                                top.x,
                                t), y: lerp(deck.y,
                                top.y,
                                t)
                        }
                        card.move(p,
                            -.1)
                        glow.move(p)
                    },
                    ease.out,
                    ctx.layer)
                void bloom(ctx.layer,
                    top,
                    WHITE_GOLD,
                    240,
                    320)
                void dustBurst(ctx.layer,
                    top,
                    {
                        ...shard([GOLD,
                            WHITE_GOLD,
                            0xffffff],
                        30,
                        {
                            speed: [200,
                                520]
                        }), count: 26
                    })
                await tween(READ,
                    (t) => { card.flip(Math.min(1,
                        t * 2.4),
                    "back",
                    "gold") },
                    ease.linear,
                    ctx.layer)
                await tween(SLIDE,
                    (t) => {
                        const back = Math.max(0,
                            t * 2 - 1)
                        const out = Math.min(1,
                            t * 2)
                        p = {
                            x: lerp(lerp(top.x,
                                side.x,
                                out),
                            deck.x,
                            back), y: lerp(lerp(top.y,
                                side.y,
                                out),
                            deck.y,
                            back)
                        }
                        card.flip(Math.min(1,
                            t * 2),
                        "gold",
                        "back")
                        card.fade(1 - back * back)
                        card.size(1 - back * .4)
                        card.move(p,
                            -.1 + out * .9)
                        glow.move(p)
                    },
                    ease.inOut,
                    ctx.layer)
                card.hide()
                glow.hide()
                ctx.onBeat?.()
                await dustBurst(ctx.layer,
                    deck,
                    {
                        ...glitter([GOLD,
                            WHITE_GOLD],
                        {
                            spread: 22
                        }), count: 60
                    })
            })()
        ])
    })

/** Q mở màn: như Chọn Bài trong LoL, một lá nổi trên đầu tướng xoay lần lượt lam, đỏ, vàng rồi dừng ở lá được chọn */
registerVfx("tfPickCycle",
    async (ctx) => {
        const chosen = kindOf(ctx)
        const at = {
            x: ctx.from.x, y: ctx.from.y - 104
        }
        const order: CardKind[] = ["blue",
            "red",
            "gold",
            "blue",
            "red",
            "gold"]
        while (order[order.length - 1] !== chosen) order.pop()
        const STEP = 96
        const ms = order.length * STEP
        const width = 58
        const card = makeCard(ctx.layer,
            order[0],
            width)
        const glow = aura(ctx,
            at,
            TONES[order[0]],
            width)
        let tone = TONES[order[0]]
        card.move(at)
        await Promise.all([
            dustStream(ctx.layer,
                () => ({
                    x: at.x + rand(-44,
                        44), y: at.y + rand(-58,
                        58)
                }),
                ms,
                520,
                {
                    ...glitter(tone.dust,
                        {
                            speed: [4,
                                44], life: [200,
                                460]
                        }), color: [...TONES.blue.dust.slice(0,
                        2),
                    ...TONES.red.dust.slice(0,
                        2),
                    ...TONES.gold.dust.slice(0,
                        2)]
                }),
            tween(ms,
                (t) => {
                    const pos = Math.min(order.length - .001,
                        t * order.length)
                    const i = Math.floor(pos)
                    const now = order[i]
                    const next = order[Math.min(order.length - 1,
                        i + 1)]
                    const phase = pos - i
                    card.flip(i === order.length - 1 ? 1 : phase,
                        now,
                        i === order.length - 1 ? now : next)
                    tone = TONES[phase < .5 ? now : next]
                    glow.tint(tone)
                },
                ease.linear,
                ctx.layer).then(() => {
                card.hide()
                glow.hide()
                void dustBurst(ctx.layer,
                    at,
                    {
                        ...glitter(TONES[chosen].dust,
                            {
                                spread: 26, speed: [40,
                                    190]
                            }), count: 90
                    })
                return bloom(ctx.layer,
                    at,
                    TONES[chosen].main,
                    220,
                    260)
            })
        ])
    })

/** Q: lá vừa lật bay từ Bộ bài tới mục tiêu */
registerVfx("tfPickThrow",
    async (ctx) => {
        const kind = kindOf(ctx)
        await Promise.all((ctx.to.length ? ctx.to : [ctx.from]).map(to => throwCard(ctx,
            to,
            kind,
            540,
            50)))
    })

/** Vòng sao vàng trên đầu tướng bị Choáng, gắn cùng nhịp với lá vàng */
function stunSwirl(ctx: VfxCtx, at: Pt) {
    let spin = 0
    const head = {
        x: at.x, y: at.y - 74
    }
    return Promise.all([
        dustStream(ctx.layer,
            () => ({
                x: head.x + Math.cos(spin) * 56, y: head.y + Math.sin(spin) * 15
            }),
            900,
            300,
            glitter(TONES.gold.dust,
                {
                    speed: [2,
                        24], gravity: 0, flow: 12, life: [240,
                        420], size: [7,
                        2]
                })),
        dustStream(ctx.layer,
            () => ({
                x: head.x + Math.cos(spin + Math.PI) * 56, y: head.y + Math.sin(spin + Math.PI) * 15
            }),
            900,
            300,
            glitter(TONES.gold.dust,
                {
                    speed: [2,
                        24], gravity: 0, flow: 12, life: [240,
                        420], size: [7,
                        2]
                })),
        tween(900,
            (t) => { spin = t * TAU * 2.4 },
            ease.linear,
            ctx.layer)
    ])
}

/** Lá vừa rút bay về tay từ chỗ trúng, kéo vệt chàm như lá xanh hoàn mana trong LoL */
async function drawBack(ctx: VfxCtx, to: Pt) {
    const card = makeCard(ctx.layer,
        "blue",
        44)
    const glow = aura(ctx,
        ctx.from,
        TONES.blue,
        36)
    let p = {
        ...ctx.from
    }
    await Promise.all([
        wrap(ctx,
            () => p,
            420,
            TONES.blue,
            36),
        tween(420,
            (t) => {
                p = {
                    x: lerp(ctx.from.x,
                        to.x,
                        t), y: lerp(ctx.from.y,
                        to.y,
                        t) - Math.sin(t * Math.PI) * 60
                }
                card.move(p,
                    t * TAU)
                card.size(1 - t * .35)
                glow.move(p)
            },
            ease.inOut,
            ctx.layer).then(() => {
            card.hide()
            glow.hide()
        })
    ])
}

/** Q trúng theo loại lá. Đỏ: ctx.to là tướng 2 đường kề, cùng nổ một nhịp. Vàng: Choáng. Xanh: ctx.to[0] là nơi lá rút về */
registerVfx("tfCardHit",
    async (ctx) => {
        const kind = kindOf(ctx)
        const k = kOf(ctx)
        const tone = TONES[kind]
        ctx.shake(kind === "blue" ? 3 : 5,
            180)
        const pieces: Promise<unknown>[] = [cardBurst(ctx,
            ctx.from,
            tone,
            1.75 * k,
            Math.round(340 * ctx.intensity))]
        if (kind === "red") {
            for (const near of ctx.to) {
                const dir = Math.atan2(near.y - ctx.from.y,
                    near.x - ctx.from.x)
                const reach = Math.hypot(near.x - ctx.from.x,
                    near.y - ctx.from.y)
                pieces.push(cardBurst(ctx,
                    near,
                    tone,
                    1.4 * k,
                    Math.round(240 * ctx.intensity)),
                dustBurst(ctx.layer,
                    ctx.from,
                    {
                        ...shard(tone.dust,
                            46,
                            {
                                speed: [reach * 1.5,
                                    reach * 3.4], angle: [dir - .1,
                                    dir + .1], drag: 2.4, flow: 14, life: [200,
                                    340]
                            }), count: 44, spread: 16
                    }))
            }
        }
        if (kind === "gold") pieces.push(stunSwirl(ctx,
            ctx.from))
        if (kind === "blue" && ctx.to[0]) pieces.push(drawBack(ctx,
            ctx.to[0]))
        await Promise.all(pieces)
    })

/** E mở màn: bộ bài xào trong không trung phía trên ô Bộ bài, các lá vắt thành vòm. Báo ctx.onBeat ở đỉnh để mảnh bài đáp cùng nhịp */
registerVfx("tfRiffle",
    async (ctx) => {
        const deck = deckOf(ctx.from)
        const mid = overDeck(deck,
            88,
            96)
        const COUNT = 15, GAP = 30, EACH = 300
        const reach = 78, rise = 74
        const width = 34
        const total = (COUNT - 1) * GAP + EACH
        void bloom(ctx.layer,
            mid,
            GOLD,
            300,
            total)
        const flight = Array.from({
            length: COUNT
        },
        async (_, i) => {
            const card = makeCard(ctx.layer,
                i % 2 ? "back" : "gold",
                width)
            card.hide()
            const leftward = i % 2 === 1
            await tween(i * GAP,
                () => {},
                ease.linear,
                ctx.layer)
            if (ctx.layer.destroyed) return
            const spot = makeCard(ctx.layer,
                i % 2 ? "back" : "gold",
                width)
            await tween(EACH,
                (t) => {
                    const u = leftward ? 1 - t : t
                    spot.move({
                        x: mid.x + (u * 2 - 1) * reach, y: mid.y + 40 - Math.sin(t * Math.PI) * rise
                    },
                    (u - .5) * 1.5)
                },
                ease.inOut,
                ctx.layer)
            spot.hide()
        })
        await Promise.all([
            ...flight,
            dustStream(ctx.layer,
                () => ({
                    x: mid.x + rand(-reach,
                        reach), y: mid.y + rand(-30,
                        44)
                }),
                total,
                1000,
                glitter([GOLD,
                    WHITE_GOLD,
                    INDIGO,
                    0x7a6cff],
                {
                    speed: [10,
                        80], life: [320,
                        700], size: [6.5,
                        1.8]
                })),
            dustStream(ctx.layer,
                () => ({
                    x: mid.x + rand(-reach,
                        reach), y: mid.y + rand(-24,
                        40)
                }),
                total,
                100,
                shard([GOLD,
                    WHITE_GOLD],
                22,
                {
                    speed: [40,
                        190], life: [160,
                        320]
                })),
            tween(total * .72,
                () => {},
                ease.linear,
                ctx.layer).then(() => ctx.onBeat?.())
        ])
    })

/** E trúng: chùm mảnh bài vàng chàm găm vào mục tiêu */
registerVfx("tfShardHit",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(3,
            150)
        await Promise.all([
            cardBurst(ctx,
                ctx.from,
                TONES.gold,
                1.65 * k,
                Math.round(280 * ctx.intensity)),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...shard([INDIGO,
                        0x7a6cff,
                        0xb4c2ff],
                    54 * k,
                    {
                        speed: [300,
                            820]
                    }), count: 90, spread: 10
                })
        ])
    })

/** Con mắt hổ phách bằng hạt, như dấu Định Mệnh hiện trên tướng địch trong LoL */
function destinyEye(ctx: VfxCtx, at: Pt, ms: number) {
    const W = 66, H = 30, IRIS = 22
    const lid = () => {
        const u = rand(-1,
            1)
        const bow = H * (1 - u * u) * (Math.random() < .5 ? -1 : 1)
        return {
            x: at.x + u * W + rand(-3,
                3), y: at.y + bow + rand(-3,
                3)
        }
    }
    const iris = () => {
        const a = rand(0,
            TAU)
        const r = rand(.6,
            1) * IRIS
        return {
            x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r
        }
    }
    const still: Partial<DustOpts> = {
        speed: [1,
            12], gravity: 0, flow: 8, drag: 3, life: [160,
            300]
    }
    return Promise.all([
        bloom(ctx.layer,
            at,
            AMBER,
            260,
            ms),
        dustStream(ctx.layer,
            lid,
            ms,
            1300,
            glitter([GOLD,
                AMBER,
                WHITE_GOLD],
            {
                ...still, size: [8,
                    3]
            })),
        dustStream(ctx.layer,
            iris,
            ms,
            1000,
            glitter([AMBER,
                0xff5a12,
                GOLD],
            {
                ...still, size: [10,
                    4]
            })),
        dustStream(ctx.layer,
            () => ({
                x: at.x + rand(-9,
                    9), y: at.y + rand(-9,
                    9)
            }),
            ms,
            420,
            {
                color: [0x160702], speed: [0,
                    4], flow: 0, drag: 3, life: [140,
                    240], size: [11,
                    7], alpha: 1, additive: false
            })
    ])
}

/** R mở màn: mắt hổ phách hiện trên mọi tướng địch, lá bài xoáy thành vòng quanh Bộ bài. Không gây sát thương */
registerVfx("tfDestinyCast",
    async (ctx) => {
        const k = kOf(ctx)
        const deck = deckOf(ctx.from)
        const at = overDeck(deck,
            64,
            60)
        const MS = 640
        let spin = 0
        const eyes = ctx.to.length ? ctx.to.map(to => ({
            x: to.x, y: to.y - 80
        })) : [{
            x: ctx.from.x, y: ctx.from.y - 104
        }]
        const swirl = (phase: number) => () => ({
            x: at.x + Math.cos(spin + phase) * 72 * k, y: at.y + Math.sin(spin + phase) * 34 * k
        })
        await Promise.all([
            ...eyes.map(eye => destinyEye(ctx,
                eye,
                MS)),
            bloom(ctx.layer,
                at,
                AMBER,
                320 * k,
                MS),
            mist(ctx.layer,
                at,
                {
                    color: [AMBER,
                        INDIGO], size: 150 * k, alpha: .26, count: 10
                }),
            ...[0,
                TAU / 3,
                TAU * 2 / 3].map(phase => dustStream(ctx.layer,
                swirl(phase),
                MS,
                170,
                shard([GOLD,
                    AMBER,
                    WHITE_GOLD],
                28,
                {
                    speed: [20,
                        110], life: [180,
                        340]
                }))),
            dustStream(ctx.layer,
                swirl(0),
                MS,
                700,
                glitter([GOLD,
                    AMBER,
                    INDIGO],
                {
                    spread: 70 * k, speed: [10,
                        80], life: [320,
                        620]
                })),
            tween(MS,
                (t) => { spin = t * TAU * 1.6 },
                ease.linear,
                ctx.layer)
        ])
    })

/** R: một lá trong loạt, bay rất nhanh từ Bộ bài. Lá kỹ năng (TF_CARD.red) to hẳn, chạm là báo nhịp */
registerVfx("tfDestinyCard",
    async (ctx) => {
        const kind = kindOf(ctx)
        const big = kind === "red"
        await Promise.all((ctx.to.length ? ctx.to : [ctx.from]).map(to => throwCard(ctx,
            to,
            kind,
            big ? 340 : 290,
            big ? 92 : 46)))
    })

/** R trúng: lá kỹ năng nổ gấp đôi */
registerVfx("tfDestinyHit",
    async (ctx) => {
        const kind = kindOf(ctx)
        const big = kind === "red"
        ctx.shake(big ? 6 : 2,
            big ? 200 : 110)
        await cardBurst(ctx,
            ctx.from,
            TONES[kind],
            big ? 1.75 : 1,
            big ? 320 : 120)
    })
