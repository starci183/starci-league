// VFX riêng của Gangplank, bám LoL: thùng thuốc súng gỗ đai đồng, ngòi cháy tàn vàng, nổ cầu lửa cam có khói đen và dăm gỗ; cam thật, nước cam văng; lệnh truy nã giấy da treo trên đầu, tiền vàng khi hạ. Bảng màu lấy từ icon chiêu gốc.
// Số Thuốc Súng truyền qua ctx.amount: mọi cú nổ to theo nó nên nhìn là biết thùng nặng cỡ nào. Trúng là báo ctx.onBeat, không chờ đuôi hạt tan; hiệu ứng cháy lâu (ngòi, lệnh truy nã) bám ctx.tether và dọn khi được thả. Mọi thứ dọn khi layer bị huỷ.
import {
    Assets, Container, Sprite, Texture
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
const FLAME = [0xfff1c0,
    0xffd060,
    0xff9a2a,
    0xff6a14,
    0xd8380e]
const SMOKE = [0x100c0a,
    0x1d1714,
    0x2e2620,
    0x453a31]
const POWDER = [0x0e0b0a,
    0x1c1714,
    0x2b2420,
    0x3d342c]
const WOOD = [0x6b4426,
    0x8a5a32,
    0x4a2e18,
    0xa87444]
const GOLD = [0xfff0b0,
    0xffd24a,
    0xffb020,
    0xc98a14]
const SPARK = [0xffffff,
    0xfff0b0,
    0xffc040,
    0xff8a1c]
const CITRUS = [0xffe07a,
    0xffb030,
    0xff8a14,
    0xf26a0a]
/** Thuốc Súng mặc định khi trận thật chưa truyền số */
const DEFAULT_POWDER = 3
/** Ngòi cháy tối đa khi không có tether thả nó */
const FUSE_SOLO_MS = 2200
/** VFX bị cắt ở 15s: ngòi tự dừng trước đó, demo nối lần phát mới */
const HOLD_MAX_MS = 13500
const CARD_W = 104
const CARD_H = 150
/** Thùng vẽ đè lên ô phụ vì ô rất nhỏ; ngòi nằm trên đỉnh thùng, bột đen tràn dưới đáy */
const KEG_W = 88
const KEG_H = 104
const SLOT_TOP = 60
const SLOT_BASE = 46
const POSTER_W = 104
const POSTER_H = 138
/** Lệnh truy nã treo ở phần trên lá tướng, không che thanh máu */
const POSTER_RISE = 42

const wait = (layer: Container, ms: number) => tween(ms,
    () => {},
    ease.linear,
    layer)
const powderOf = (ctx: VfxCtx) => Math.max(0,
    ctx.amount ?? DEFAULT_POWDER)
/** Cỡ cú nổ theo Thuốc Súng: 1 thành gần 1, 6 thành gấp 2,4 lần */
const blastK = (n: number) => Math.min(3,
    .7 + .28 * n)
const dest = (ctx: VfxCtx) => ctx.to[0] ?? ctx.from

/** Nhịp trúng chỉ báo một lần */
function beatOnce(ctx: VfxCtx) {
    let done = false
    return () => {
        if (done) return
        done = true
        ctx.onBeat?.()
    }
}

async function loadIcon(url?: string): Promise<Texture | null> {
    if (!url) return null
    try {
        return await Assets.load<Texture>(url)
    } catch {
        return null
    }
}

/** Cầu lửa thật: khói đen dưới, lửa cuộn giữa, dăm gỗ và tia vàng văng ngoài */
function fireball(ctx: VfxCtx, at: Pt, k: number, dense = 1) {
    const l = ctx.layer
    const root = Math.sqrt(k)
    return Promise.all([
        mist(l,
            at,
            {
                color: SMOKE, size: 190 * k, count: Math.round(12 * dense + 4), life: [800,
                    1600], alpha: .66, speed: [20,
                    150 * k], gravity: -80, additive: false
            }),
        bloom(l,
            at,
            0xff7a1c,
            680 * k,
            560),
        bloom(l,
            at,
            0xffe0a0,
            260 * k,
            220),
        mist(l,
            at,
            {
                color: [0xff8a24,
                    0xff5a14,
                    0xffb040,
                    0xc8300c], size: 170 * k, count: Math.round((10 + 6 * k) * dense), life: [280,
                    680], alpha: .85, speed: [30,
                    210 * k]
            }),
        mist(l,
            at,
            {
                color: [0xffe09a,
                    0xffc050], size: 80 * k, count: 5, life: [150,
                    320], alpha: .7, speed: [10,
                    100 * k]
            }),
        dustBurst(l,
            at,
            {
                count: Math.round(300 * k * dense), color: FLAME.slice(1), speed: [60,
                    540 * k], drag: 2.6, flow: 70, life: [240,
                    720], size: [13 * root,
                    3], alpha: 1, spread: 26 * k
            }),
        dustBurst(l,
            at,
            {
                count: Math.round(70 * k * dense), blade: true, color: WOOD, additive: false, speed: [260,
                    860 * root], gravity: 780, drag: .5, life: [420,
                    920], size: [34,
                    20], spread: 20 * k, alpha: 1
            }),
        dustBurst(l,
            at,
            {
                count: Math.round(170 * k * dense), streak: 5, color: SPARK, speed: [220,
                    960 * root], gravity: 420, drag: 1.2, life: [260,
                    720], size: [6,
                    2], alpha: 1
            })
    ])
}

/** Thuốc súng đen trút xuống thùng */
function pour(ctx: VfxCtx, at: Pt, n: number, ms: number) {
    return dustStream(ctx.layer,
        () => ({
            x: at.x + rand(-34,
                34), y: at.y - SLOT_TOP - 70
        }),
        ms,
        520 + 220 * Math.min(6,
            n),
        {
            color: POWDER, additive: false, speed: [30,
                120], angle: [Math.PI * .35,
                Math.PI * .65], gravity: 1500, life: [170,
                300], size: [8,
                5], alpha: 1, flow: 16
        })
}

// --- Lá úp thành Thùng ---

/** Thùng gỗ đai đồng phình giữa, miệng đầy bột đen, như Powder Keg trong LoL */
function kegTexture(): Texture {
    const W = 176, H = 208
    const c = document.createElement("canvas")
    c.width = W
    c.height = H
    const g = c.getContext("2d")
    if (g) {
        const top = 30, bottom = H - 16, waist = 12, rim = 34
        const body = () => {
            g.beginPath()
            g.moveTo(rim,
                top)
            g.quadraticCurveTo(waist - 12,
                (top + bottom) / 2,
                rim,
                bottom)
            g.quadraticCurveTo(W / 2,
                bottom + 16,
                W - rim,
                bottom)
            g.quadraticCurveTo(W - waist + 12,
                (top + bottom) / 2,
                W - rim,
                top)
            g.closePath()
        }
        const wood = g.createLinearGradient(0,
            0,
            W,
            0)
        wood.addColorStop(0,
            "#2c180a")
        wood.addColorStop(.3,
            "#8a5a30")
        wood.addColorStop(.55,
            "#b07c46")
        wood.addColorStop(.8,
            "#6a4222")
        wood.addColorStop(1,
            "#1e1006")
        body()
        g.fillStyle = wood
        g.fill()
        g.save()
        body()
        g.clip()
        g.strokeStyle = "rgba(30,16,6,.75)"
        g.lineWidth = 3
        for (let i = 1; i < 7; i++) {
            const x = W * i / 7
            g.beginPath()
            g.moveTo(lerp(W / 2,
                x,
                .76),
            top)
            g.quadraticCurveTo(lerp(W / 2,
                x,
                1.14),
            (top + bottom) / 2,
            lerp(W / 2,
                x,
                .76),
            bottom + 12)
            g.stroke()
        }
        for (const y of [top + 30,
            bottom - 34]) {
            const hoop = g.createLinearGradient(0,
                y,
                W,
                y)
            hoop.addColorStop(0,
                "#4a2a10")
            hoop.addColorStop(.42,
                "#f0c068")
            hoop.addColorStop(1,
                "#5a3414")
            g.fillStyle = hoop
            g.beginPath()
            g.ellipse(W / 2,
                y,
                W * .52,
                15,
                0,
                0,
                Math.PI)
            g.ellipse(W / 2,
                y + 15,
                W * .52,
                15,
                0,
                Math.PI,
                0,
                true)
            g.closePath()
            g.fill()
        }
        g.restore()
        g.fillStyle = "#c08a3c"
        g.beginPath()
        g.ellipse(W / 2,
            top,
            W / 2 - rim + 4,
            18,
            0,
            0,
            TAU)
        g.fill()
        g.fillStyle = "#14100c"
        g.beginPath()
        g.ellipse(W / 2,
            top,
            W / 2 - rim - 6,
            12,
            0,
            0,
            TAU)
        g.fill()
    }
    return Texture.from(c)
}

let kegTex: Texture | undefined
const kegTexOf = () => (kegTex ??= kegTexture())

function cardBackTexture(): Texture {
    const c = document.createElement("canvas")
    c.width = CARD_W
    c.height = CARD_H
    const g = c.getContext("2d")
    if (g) {
        g.fillStyle = "#d6a44a"
        g.beginPath()
        g.roundRect(0,
            0,
            CARD_W,
            CARD_H,
            9)
        g.fill()
        const wood = g.createLinearGradient(0,
            0,
            CARD_W,
            CARD_H)
        wood.addColorStop(0,
            "#3a2413")
        wood.addColorStop(.5,
            "#6a4221")
        wood.addColorStop(1,
            "#2c1a0d")
        g.fillStyle = wood
        g.beginPath()
        g.roundRect(5,
            5,
            CARD_W - 10,
            CARD_H - 10,
            6)
        g.fill()
        g.fillStyle = "rgba(0,0,0,.34)"
        for (let x = 22; x < CARD_W - 8; x += 19) g.fillRect(x,
            6,
            2,
            CARD_H - 12)
        g.fillStyle = "#d6a44a"
        g.font = "700 62px serif"
        g.textAlign = "center"
        g.textBaseline = "middle"
        g.fillText("☠",
            CARD_W / 2,
            CARD_H / 2 + 4)
    }
    return Texture.from(c)
}

let back: Texture | undefined
const backTex = () => (back ??= cardBackTexture())

/** Lá thật: lưng gỗ đai đồng, mặt là ảnh lá; lật bằng cách co bề ngang */
function makeCard(layer: Container, art: Texture | null, width: number) {
    const root = new Container()
    const base = new Sprite(backTex())
    base.anchor.set(.5)
    const face = art ? new Sprite(art) : null
    if (face) {
        face.anchor.set(.5)
        face.width = CARD_W - 12
        face.height = CARD_H - 12
        face.visible = false
    }
    root.addChild(base)
    if (face) root.addChild(face)
    layer.addChild(root)
    const unit = width / CARD_W
    root.scale.set(unit)
    const alive = () => !root.destroyed
    return {
        move(p: Pt, rotation = 0) {
            if (!alive()) return
            root.x = p.x
            root.y = p.y
            root.rotation = rotation
        },
        /** 0: mặt đang hiện, 1: mặt kia; `up` = cuối cùng ngửa mặt */
        flip(phase: number, up: boolean) {
            if (!alive()) return
            const facing = phase < .5 ? !up : up
            if (face) face.visible = facing
            root.scale.x = unit * Math.max(.04,
                Math.abs(Math.cos(phase * Math.PI)))
        },
        size(k: number) {
            if (!alive()) return
            root.scale.set(unit * k)
        },
        fade(a: number) { if (alive()) root.alpha = a },
        hide() { if (alive()) root.visible = false }
    }
}

/** Úp Lá hoặc E: lá rời tay, lật úp giữa không trung, cắm xuống ô phụ. Chạm là Thùng hiện */
registerVfx("gangplankKegPlace",
    async (ctx) => {
        const to = dest(ctx)
        const art = await loadIcon(ctx.icon)
        if (ctx.layer.destroyed) return
        const beat = beatOnce(ctx)
        const MS = 620
        const card = makeCard(ctx.layer,
            art,
            CARD_W)
        const peak = {
            x: lerp(ctx.from.x,
                to.x,
                .5), y: Math.min(ctx.from.y,
                to.y) - 150
        }
        let p = {
            ...ctx.from
        }
        const trail = Promise.all([
            dustStream(ctx.layer,
                () => p,
                MS,
                90,
                {
                    puff: true, color: SMOKE, speed: [6,
                        36], gravity: -30, life: [380,
                        760], size: [30,
                        60], alpha: .42, flow: 18, additive: false
                }),
            dustStream(ctx.layer,
                () => p,
                MS,
                420,
                {
                    color: GOLD, streak: 3, speed: [30,
                        160], gravity: 420, life: [220,
                        520], size: [6,
                        2], alpha: 1, spread: 26
                })
        ])
        await tween(MS,
            (u) => {
                const v = 1 - u
                p = {
                    x: v * v * ctx.from.x + 2 * v * u * peak.x + u * u * to.x,
                    y: v * v * ctx.from.y + 2 * v * u * peak.y + u * u * to.y
                }
                card.move(p,
                    Math.sin(u * Math.PI) * .32)
                card.flip(Math.min(1,
                    u * 2.6),
                false)
                if (u >= .998) card.size(1)
            },
            ease.inOut,
            ctx.layer)
        if (ctx.layer.destroyed) return
        beat()
        card.hide()
        ctx.shake(5,
            180)
        const n = powderOf(ctx)
        await Promise.all([trail,
            mist(ctx.layer,
                to,
                {
                    color: [0x8a6a4a,
                        0x5a4632,
                        0x3a2c20], size: 180, count: 12, life: [420,
                        900], alpha: .55, speed: [30,
                        150], additive: false
                }),
            bloom(ctx.layer,
                to,
                0xffb040,
                300,
                300),
            dustBurst(ctx.layer,
                to,
                {
                    count: 120, streak: 4, color: GOLD, speed: [160,
                        520], gravity: 620, drag: 1, life: [240,
                        560], size: [6,
                        2], alpha: 1, spread: 40
                }),
            n > 0 ? pour(ctx,
                to,
                n,
                360) : Promise.resolve()])
    })

/** Đầu lượt +1 Thuốc Súng: bột đen trút xuống, ngòi loé. Chạm thùng là số đổi */
registerVfx("gangplankPowderGain",
    async (ctx) => {
        const at = ctx.from
        const n = Math.max(1,
            powderOf(ctx))
        const k = blastK(n)
        const beat = beatOnce(ctx)
        const falling = pour(ctx,
            at,
            n,
            300)
        await wait(ctx.layer,
            210)
        if (ctx.layer.destroyed) return
        beat()
        const top = {
            x: at.x, y: at.y - SLOT_TOP
        }
        await Promise.all([falling,
            bloom(ctx.layer,
                top,
                0xffa030,
                260 * k,
                380),
            dustBurst(ctx.layer,
                top,
                {
                    count: Math.round(180 * k), streak: 4, color: SPARK, speed: [120,
                        520 * Math.sqrt(k)], gravity: 340, drag: 1.1, life: [260,
                        640], size: [7,
                        2], alpha: 1
                }),
            mist(ctx.layer,
                {
                    x: at.x, y: at.y + SLOT_BASE
                },
                {
                    color: POWDER, size: 120 * k, count: 8, life: [360,
                        760], alpha: .7, speed: [20,
                        110], additive: false
                })])
    })

/** Ngòi cháy trên Thùng: mỗi Thuốc Súng một đốm lửa xếp vòng cung trên đỉnh lá, thùng càng nặng càng nhiều tàn, khói, bột đen */
registerVfx("gangplankKegFuse",
    async (ctx) => {
        const n = powderOf(ctx)
        const at = () => ctx.tether?.target() ?? ctx.from
        const released = () => ctx.tether?.released() ?? false
        const limit = ctx.tether ? HOLD_MAX_MS : FUSE_SOLO_MS
        const STEP = 620
        const glow = makeSprite(ctx.layer,
            "glow",
            at().x,
            at().y - SLOT_TOP,
            0xff8a24,
            90 + 44 * n)
        glow.alpha = n > 0 ? .55 : .3
        const keg = new Sprite(kegTexOf())
        keg.anchor.set(.5)
        const grow = 1 + Math.min(.42,
            .07 * n)
        keg.width = KEG_W * grow
        keg.height = KEG_H * grow
        ctx.layer.addChild(keg)
        const count = Math.min(8,
            n)
        const flameAt = (i: number) => {
            const a = count > 1 ? lerp(-Math.PI * .86,
                -Math.PI * .14,
                i / (count - 1)) : -Math.PI / 2
            const p = at()
            return {
                x: p.x + Math.cos(a) * (50 + 4 * count), y: p.y - SLOT_TOP + 4 + Math.sin(a) * 34
            }
        }
        const pile: DustOpts = {
            color: POWDER, additive: false, speed: [8,
                46], angle: [-Math.PI,
                0], gravity: 120, life: [420,
                900], size: [9,
                4], alpha: .95, spread: 34 + 12 * n, flow: 10
        }
        const embers: DustOpts = {
            color: SPARK, speed: [30,
                150], gravity: -240, life: [320,
                820], size: [5 + .6 * n,
                2], alpha: 1, flow: 30, spread: 30 + 10 * n
        }
        const smoke: DustOpts = {
            puff: true, color: SMOKE, speed: [8,
                34], gravity: -70, life: [620,
                1200], size: [24 + 4 * n,
                66 + 10 * n], alpha: .34, flow: 18, additive: false
        }
        const flame: DustOpts = {
            color: [0xffffff,
                0xfff0b0,
                0xffc040,
                0xff7a1c], speed: [24,
                110], gravity: -300, life: [160,
                380], size: [11,
                3], alpha: 1, flow: 22
        }
        let elapsed = 0
        while (!ctx.layer.destroyed && !released() && elapsed < limit) {
            const t = STEP + 60
            const tick = (ms: number) => tween(ms,
                () => {
                    const p = at()
                    if (glow.destroyed) return
                    if (!keg.destroyed) {
                        keg.x = p.x
                        keg.y = p.y - 6
                    }
                    glow.x = p.x
                    glow.y = p.y - SLOT_TOP
                    glow.alpha = (n > 0 ? .5 : .28) + .1 * Math.sin(performance.now() / 70)
                },
                ease.linear,
                ctx.layer)
            void dustStream(ctx.layer,
                () => ({
                    x: at().x, y: at().y + SLOT_BASE
                }),
                t,
                26 + 26 * Math.min(8,
                    n),
                pile)
            void dustStream(ctx.layer,
                () => ({
                    x: at().x, y: at().y - SLOT_TOP
                }),
                t,
                16 + 26 * Math.min(8,
                    n),
                embers)
            void dustStream(ctx.layer,
                () => ({
                    x: at().x, y: at().y - SLOT_TOP
                }),
                t,
                4 + 3 * Math.min(8,
                    n),
                smoke)
            for (let i = 0; i < Math.max(1,
                count); i++) void dustStream(ctx.layer,
                () => count ? flameAt(i) : {
                    x: at().x, y: at().y - SLOT_TOP + 14
                },
                t,
                count ? 110 : 34,
                flame)
            for (let waited = 0; waited < STEP && !released() && !ctx.layer.destroyed; waited += 60) await tick(60)
            elapsed += STEP
        }
    })

/** Thùng bị đập vỡ: dăm gỗ, bột đen phụt, chưa có lửa. Lửa chỉ có khi lá trong thùng là lá chiêu */
registerVfx("gangplankKegShatter",
    async (ctx) => {
        const at = ctx.from
        ctx.shake(6,
            200)
        await Promise.all([
            mist(ctx.layer,
                at,
                {
                    color: POWDER, size: 200, count: 14, life: [420,
                        1000], alpha: .72, speed: [40,
                        210], additive: false
                }),
            dustBurst(ctx.layer,
                at,
                {
                    count: 150, blade: true, color: WOOD, additive: false, speed: [240,
                        900], gravity: 820, drag: .5, life: [380,
                        900], size: [40,
                        22], spread: 40, alpha: 1
                }),
            dustBurst(ctx.layer,
                at,
                {
                    count: 300, color: POWDER, additive: false, speed: [60,
                        420], gravity: 480, drag: 1.4, life: [300,
                        760], size: [8,
                        3], alpha: 1, spread: 36
                }),
            bloom(ctx.layer,
                at,
                0xffb040,
                260,
                220)
        ])
    })

/** Thùng vỡ thì lật: lá hiện ngay ô phụ cho thấy bên trong là gì, ngửa mặt là báo nhịp */
registerVfx("gangplankKegFlip",
    async (ctx) => {
        const at = ctx.from
        const art = await loadIcon(ctx.icon)
        if (ctx.layer.destroyed) return
        const beat = beatOnce(ctx)
        const halo = makeSprite(ctx.layer,
            "glow",
            at.x,
            at.y,
            ctx.color,
            CARD_W * 3.4)
        halo.alpha = .7
        const card = makeCard(ctx.layer,
            art,
            CARD_W * 1.12)
        card.move(at)
        await tween(300,
            (u) => card.flip(u,
                true),
            ease.inOut,
            ctx.layer)
        if (ctx.layer.destroyed) return
        void dustBurst(ctx.layer,
            at,
            {
                count: 90, streak: 3, color: GOLD, speed: [100,
                    380], gravity: 260, drag: 1.2, life: [260,
                    620], size: [6,
                    2], alpha: 1, spread: 40
            })
        await wait(ctx.layer,
            260)
        if (ctx.layer.destroyed) return
        beat()
        await tween(440,
            (u) => {
                card.fade(1 - u * u)
                if (!halo.destroyed) halo.alpha = .7 * (1 - u)
            },
            ease.linear,
            ctx.layer)
    })

/** Thùng nổ: cầu lửa tại ô phụ theo Thuốc Súng, luồng lửa lao tới từng mục tiêu; chạm là nhịp trúng */
registerVfx("gangplankKegDetonate",
    async (ctx) => {
        const n = Math.max(1,
            powderOf(ctx))
        const k = blastK(n)
        const beat = beatOnce(ctx)
        const MS = 230
        ctx.shake(Math.min(16,
            5 + 3 * n),
        300 + 40 * n)
        const ball = fireball(ctx,
            ctx.from,
            k)
        const lanes = ctx.to.map((to) => {
            let p = {
                ...ctx.from
            }
            return Promise.all([
                dustStream(ctx.layer,
                    () => p,
                    MS,
                    1100,
                    {
                        color: FLAME, speed: [20,
                            180], drag: 2, life: [160,
                            380], size: [12 * Math.sqrt(k),
                            4], alpha: 1, spread: 24, flow: 30
                    }),
                dustStream(ctx.layer,
                    () => p,
                    MS,
                    90,
                    {
                        puff: true, color: [0xff8a24,
                            0xff5a14,
                            0xffb040], speed: [10,
                            40], life: [180,
                            360], size: [60 * Math.sqrt(k),
                            110 * Math.sqrt(k)], alpha: .7, flow: 16
                    }),
                tween(MS,
                    (u) => {
                        p = {
                            x: lerp(ctx.from.x,
                                to.x,
                                u), y: lerp(ctx.from.y,
                                to.y,
                                u)
                        }
                    },
                    ease.in,
                    ctx.layer)
            ])
        })
        await wait(ctx.layer,
            MS)
        if (ctx.layer.destroyed) return
        beat()
        await Promise.all([ball,
            ...lanes])
    })

/** Lửa nổ tại mục tiêu: cỡ theo Thuốc Súng */
registerVfx("gangplankKegHit",
    async (ctx) => {
        await fireball(ctx,
            ctx.from,
            blastK(Math.max(1,
                powderOf(ctx))) * .66,
            .55)
    })

// --- Vàng, lá về tay ---

function coinTexture(): Texture {
    const S = 48
    const c = document.createElement("canvas")
    c.width = S
    c.height = S
    const g = c.getContext("2d")
    if (g) {
        const grad = g.createRadialGradient(S * .38,
            S * .34,
            2,
            S / 2,
            S / 2,
            S / 2)
        grad.addColorStop(0,
            "#fff6c8")
        grad.addColorStop(.55,
            "#ffc83a")
        grad.addColorStop(1,
            "#a86c0c")
        g.fillStyle = grad
        g.beginPath()
        g.arc(S / 2,
            S / 2,
            S / 2 - 1,
            0,
            TAU)
        g.fill()
        g.fillStyle = "rgba(122,74,6,.55)"
        g.font = "700 26px serif"
        g.textAlign = "center"
        g.textBaseline = "middle"
        g.fillText("$",
            S / 2,
            S / 2 + 1)
    }
    return Texture.from(c)
}

let coin: Texture | undefined
const coinTex = () => (coin ??= coinTexture())

/** Đồng vàng thật: tung lên rồi bay về đích, xoay bằng cách co ngang */
function coins(ctx: VfxCtx, from: Pt, to: Pt, count: number, ms: number) {
    return Promise.all(Array.from({
        length: count
    },
    async (_, i) => {
        const s = new Sprite(coinTex())
        s.anchor.set(.5)
        const size = rand(20,
            32)
        s.x = from.x
        s.y = from.y
        ctx.layer.addChild(s)
        const mid = {
            x: from.x + rand(-170,
                170), y: from.y - rand(110,
                300)
        }
        const spin = rand(9,
            16)
        await wait(ctx.layer,
            i * 14)
        await tween(ms,
            (u) => {
                if (s.destroyed) return
                const v = 1 - u
                s.x = v * v * from.x + 2 * v * u * mid.x + u * u * to.x
                s.y = v * v * from.y + 2 * v * u * mid.y + u * u * to.y
                s.width = size * Math.max(.12,
                    Math.abs(Math.cos(u * spin)))
                s.height = size
            },
            ease.inOut,
            ctx.layer)
        if (!s.destroyed) s.destroy()
    }))
}

/** Lá từ `from` bay về tay; ctx.amount là số lá, lá cuối chạm tay là nhịp */
async function flyCards(ctx: VfxCtx, withCoins: boolean) {
    const to = dest(ctx)
    const art = await loadIcon(ctx.icon)
    if (ctx.layer.destroyed) return
    const count = Math.max(1,
        ctx.amount ?? 1)
    const beat = beatOnce(ctx)
    const MS = 620
    const GAP = 120
    const tail = withCoins ? GOLD : [ctx.color,
        ctx.color2 ?? 0xffffff,
        0xffffff]
    const moved = Array.from({
        length: count
    },
    async (_, i) => {
        await wait(ctx.layer,
            i * GAP)
        if (ctx.layer.destroyed) return
        const card = makeCard(ctx.layer,
            art,
            CARD_W * .86)
        card.flip(1,
            true)
        const peak = {
            x: lerp(ctx.from.x,
                to.x,
                .4) + (i - (count - 1) / 2) * 90, y: Math.min(ctx.from.y,
                to.y) - 130
        }
        let p = {
            ...ctx.from
        }
        const trail = dustStream(ctx.layer,
            () => p,
            MS,
            420,
            {
                color: tail, streak: 3, speed: [30,
                    160], gravity: 240, life: [220,
                    520], size: [7,
                    2], alpha: 1, spread: 26, flow: 20
            })
        await tween(MS,
            (u) => {
                const v = 1 - u
                p = {
                    x: v * v * ctx.from.x + 2 * v * u * peak.x + u * u * to.x,
                    y: v * v * ctx.from.y + 2 * v * u * peak.y + u * u * to.y
                }
                card.move(p,
                    Math.sin(u * Math.PI) * .22)
                card.size(lerp(1,
                    .72,
                    u))
            },
            ease.inOut,
            ctx.layer)
        card.hide()
        return trail
    })
    const hand = Promise.all(moved).then(() => {
        beat()
    })
    const extras: Promise<unknown>[] = [hand]
    if (withCoins) {
        extras.push(coins(ctx,
            ctx.from,
            to,
            14 + 10 * count,
            MS + GAP * (count - 1)),
        bloom(ctx.layer,
            ctx.from,
            0xffc83a,
            340,
            420),
        dustBurst(ctx.layer,
            ctx.from,
            {
                count: 220, streak: 3, color: GOLD, speed: [120,
                    520], gravity: 380, drag: 1, life: [320,
                    760], size: [7,
                    2], alpha: 1, spread: 36
            }))
    }
    await Promise.all(extras)
}

registerVfx("gangplankCardFly",
    (ctx) => flyCards(ctx,
        false))
registerVfx("gangplankGoldFly",
    (ctx) => flyCards(ctx,
        true))

// --- Q Ăn Cam ---

function orangeTexture(): Texture {
    const S = 96
    const c = document.createElement("canvas")
    c.width = S
    c.height = S
    const g = c.getContext("2d")
    if (g) {
        const body = g.createRadialGradient(S * .36,
            S * .32,
            4,
            S / 2,
            S / 2,
            S * .46)
        body.addColorStop(0,
            "#ffd27a")
        body.addColorStop(.5,
            "#ff9a1e")
        body.addColorStop(1,
            "#c85a06")
        g.fillStyle = body
        g.beginPath()
        g.arc(S / 2,
            S / 2,
            S * .45,
            0,
            TAU)
        g.fill()
        // lỗ chân lông vỏ cam
        g.fillStyle = "rgba(150,62,0,.26)"
        for (let i = 0; i < 90; i++) {
            const a = Math.random() * TAU
            const d = Math.sqrt(Math.random()) * S * .42
            g.fillRect(S / 2 + Math.cos(a) * d,
                S / 2 + Math.sin(a) * d,
                1.6,
                1.6)
        }
        g.fillStyle = "#4f7a22"
        g.beginPath()
        g.ellipse(S * .56,
            S * .09,
            S * .13,
            S * .05,
            -.5,
            0,
            TAU)
        g.fill()
    }
    return Texture.from(c)
}

let orange: Texture | undefined
const orangeTex = () => (orange ??= orangeTexture())

/** Q mở màn: ba quả cam bay vào miệng Gangplank; cắn là nhịp */
registerVfx("gangplankOrangeEat",
    async (ctx) => {
        const mouth = {
            x: ctx.from.x, y: ctx.from.y - 26
        }
        const beat = beatOnce(ctx)
        const MS = 560
        const starts = [{
            x: -130, y: 40
        },
        {
            x: 130, y: 20
        },
        {
            x: 0, y: 130
        }]
        const sprites = starts.map((o) => {
            const s = new Sprite(orangeTex())
            s.anchor.set(.5)
            s.x = ctx.from.x + o.x
            s.y = ctx.from.y + o.y
            ctx.layer.addChild(s)
            return {
                s, o
            }
        })
        void bloom(ctx.layer,
            mouth,
            0xffa030,
            300,
            MS)
        await tween(MS,
            (u) => {
                for (const { s, o } of sprites) {
                    if (s.destroyed) continue
                    s.x = lerp(ctx.from.x + o.x,
                        mouth.x,
                        u)
                    s.y = lerp(ctx.from.y + o.y,
                        mouth.y,
                        u) - Math.sin(u * Math.PI) * 44
                    s.rotation = u * 4
                    s.width = s.height = lerp(58,
                        84,
                        Math.sin(u * Math.PI * .5))
                }
            },
            ease.inOut,
            ctx.layer)
        if (ctx.layer.destroyed) return
        for (const { s } of sprites) if (!s.destroyed) s.destroy()
        beat()
    })

/** Nước cam văng, vỏ cam sắc, hồi sinh lực ấm dâng lên, vảy đồng Giáp phủ quanh lá */
registerVfx("gangplankOrangeHeal",
    async (ctx) => {
        const at = ctx.from
        const mouth = {
            x: at.x, y: at.y - 26
        }
        await Promise.all([
            bloom(ctx.layer,
                at,
                0xff9a1e,
                560,
                620),
            mist(ctx.layer,
                mouth,
                {
                    color: [0xff9a1e,
                        0xffb030,
                        0xf26a0a], size: 170, count: 12, life: [340,
                        760], alpha: .6, speed: [30,
                        170]
                }),
            dustBurst(ctx.layer,
                mouth,
                {
                    count: 760, streak: 3.5, color: CITRUS, additive: false, speed: [180,
                        720], gravity: 760, drag: .8, life: [340,
                        820], size: [11,
                        4], alpha: 1, spread: 22
                }),
            dustBurst(ctx.layer,
                mouth,
                {
                    count: 90, blade: true, color: [0xff9a1e,
                        0xff7a0a,
                        0xffc05a], additive: false, speed: [220,
                        620], gravity: 780, drag: .6, life: [440,
                        920], size: [36,
                        20], alpha: 1, spread: 18
                }),
            dustStream(ctx.layer,
                () => ({
                    x: at.x + rand(-70,
                        70), y: at.y + rand(-100,
                        110)
                }),
                820,
                420,
                {
                    color: [0xffc860,
                        0xffa030,
                        0xb8e860], additive: false, speed: [24,
                        80], angle: [-Math.PI * .6,
                        -Math.PI * .4], gravity: -200, life: [420,
                        900], size: [9,
                        3], alpha: .95, flow: 26
                }),
            dustStream(ctx.layer,
                () => {
                    const a = rand(0,
                        TAU)
                    return {
                        x: at.x + Math.cos(a) * 84, y: at.y + Math.sin(a) * 118
                    }
                },
                640,
                260,
                {
                    blade: true, color: [0xffd98a,
                        0xe5bd72,
                        0xc98a3a], speed: [20,
                        80], gravity: 60, drag: 1, life: [420,
                        820], size: [24,
                        12], alpha: 1, additive: false
                })
        ])
    })

/** Lá thường lật ra: luồng hồi cam vàng bay từ ô phụ về Gangplank, chạm là hồi */
registerVfx("gangplankKegHeal",
    async (ctx) => {
        const to = dest(ctx)
        const MS = 420
        const beat = beatOnce(ctx)
        let p = {
            ...ctx.from
        }
        const trail = dustStream(ctx.layer,
            () => p,
            MS,
            900,
            {
                color: [0xffc860,
                    0xffa030,
                    0xb8e860], additive: false, speed: [20,
                    120], gravity: -60, life: [260,
                    600], size: [10,
                    3], alpha: 1, spread: 22, flow: 30
            })
        await tween(MS,
            (u) => {
                p = {
                    x: lerp(ctx.from.x,
                        to.x,
                        u), y: lerp(ctx.from.y,
                        to.y,
                        u) - Math.sin(u * Math.PI) * 60
                }
            },
            ease.inOut,
            ctx.layer)
        if (ctx.layer.destroyed) return
        beat()
        await trail
    })

// --- R Lệnh Truy Nã ---

/** Giấy da rách mép, cháy sém, chữ TRUY NÃ và ảnh kẻ bị treo giá */
async function posterTexture(icon?: string): Promise<Texture> {
    const W = 180, H = 240
    const c = document.createElement("canvas")
    c.width = W
    c.height = H
    const g = c.getContext("2d")
    if (!g) return Texture.WHITE
    g.beginPath()
    const edge = 12
    const jag = (x: number, y: number) => g.lineTo(x + rand(-5,
        5),
    y + rand(-5,
        5))
    g.moveTo(edge,
        edge)
    for (let x = edge; x < W - edge; x += 16) jag(x,
        edge)
    for (let y = edge; y < H - edge; y += 16) jag(W - edge,
        y)
    for (let x = W - edge; x > edge; x -= 16) jag(x,
        H - edge)
    for (let y = H - edge; y > edge; y -= 16) jag(edge,
        y)
    g.closePath()
    const paper = g.createRadialGradient(W / 2,
        H / 2,
        30,
        W / 2,
        H / 2,
        H * .62)
    paper.addColorStop(0,
        "#ecd29a")
    paper.addColorStop(.7,
        "#c99a58")
    paper.addColorStop(1,
        "#5a3414")
    g.fillStyle = paper
    g.fill()
    g.save()
    g.clip()
    g.fillStyle = "rgba(92,52,18,.16)"
    for (let i = 0; i < 26; i++) {
        g.beginPath()
        g.arc(rand(0,
            W),
        rand(0,
            H),
        rand(4,
            20),
        0,
        TAU)
        g.fill()
    }
    g.restore()
    g.fillStyle = "#3a1608"
    g.textAlign = "center"
    g.textBaseline = "middle"
    g.font = "900 36px Georgia, serif"
    g.fillText("TRUY NÃ",
        W / 2,
        40)
    const portrait = icon ? await new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = icon
    }) : null
    if (portrait) {
        const side = Math.min(portrait.width,
            portrait.height)
        g.drawImage(portrait,
            (portrait.width - side) / 2,
            0,
            side,
            side,
            34,
            66,
            112,
            112)
        g.fillStyle = "rgba(120,72,20,.3)"
        g.fillRect(34,
            66,
            112,
            112)
    } else {
        g.font = "700 90px serif"
        g.fillText("☠",
            W / 2,
            122)
    }
    g.fillStyle = "#7a2410"
    g.font = "900 30px Georgia, serif"
    g.fillText("VÀNG",
        W / 2,
        206)
    return Texture.from(c)
}

/** R mở màn: lệnh truy nã bay từ Gangplank đóng lên kẻ bị treo giá; đóng là nhịp [Truy Nã]. Treo tới khi được thả rồi cháy rụi */
registerVfx("gangplankWantedMark",
    async (ctx) => {
        const to = dest(ctx)
        const tex = await posterTexture(ctx.icon)
        if (ctx.layer.destroyed) return
        const beat = beatOnce(ctx)
        const at = () => {
            const p = ctx.tether?.target() ?? to
            return {
                x: p.x, y: p.y - POSTER_RISE
            }
        }
        const released = () => ctx.tether?.released() ?? false
        const halo = makeSprite(ctx.layer,
            "glow",
            to.x,
            to.y - POSTER_RISE,
            0xff5a14,
            POSTER_W * 3)
        halo.alpha = 0
        const s = new Sprite(tex)
        s.anchor.set(.5)
        s.width = POSTER_W
        s.height = POSTER_H
        ctx.layer.addChild(s)
        const start = ctx.from
        const MS = 440
        let p = {
            ...start
        }
        const trail = dustStream(ctx.layer,
            () => p,
            MS,
            380,
            {
                color: GOLD, streak: 3, speed: [30,
                    170], gravity: 300, life: [240,
                    560], size: [7,
                    2], alpha: 1, spread: 30
            })
        await tween(MS,
            (u) => {
                const end = at()
                p = {
                    x: lerp(start.x,
                        end.x,
                        u), y: lerp(start.y,
                        end.y,
                        u) - Math.sin(u * Math.PI) * 170
                }
                if (s.destroyed) return
                s.x = p.x
                s.y = p.y
                s.rotation = (1 - u) * 5.2 - .08
            },
            ease.in,
            ctx.layer)
        if (ctx.layer.destroyed) return
        beat()
        ctx.shake(7,
            220)
        halo.alpha = .55
        void Promise.all([trail,
            coins(ctx,
                at(),
                {
                    x: at().x, y: at().y + 150
                },
                12,
                560),
            bloom(ctx.layer,
                at(),
                0xffd060,
                360,
                300),
            mist(ctx.layer,
                at(),
                {
                    color: SMOKE, size: 170, count: 10, life: [420,
                        900], alpha: .55, speed: [30,
                        140], additive: false
                })])
        const edges: DustOpts = {
            color: [0xffd060,
                0xff8a24,
                0xff5a14], speed: [14,
                70], gravity: -190, life: [260,
                640], size: [8,
                2], alpha: 1, flow: 24
        }
        const limit = ctx.tether ? HOLD_MAX_MS : 2400
        const STEP = 620
        let elapsed = 0
        while (!ctx.layer.destroyed && !released() && elapsed < limit) {
            void dustStream(ctx.layer,
                () => {
                    const a = at()
                    return {
                        x: a.x + rand(-POSTER_W / 2,
                            POSTER_W / 2), y: a.y + POSTER_H / 2 + rand(-8,
                            6)
                    }
                },
                STEP + 40,
                90,
                edges)
            const base = elapsed
            await tween(Math.min(STEP,
                limit - base),
            (u) => {
                if (s.destroyed) return
                const a = at()
                s.x = a.x
                s.y = a.y
                s.rotation = -.08 + Math.sin((base + u * STEP) / 240) * .025
                if (!halo.destroyed) {
                    halo.x = a.x
                    halo.y = a.y
                }
            },
            ease.linear,
            ctx.layer)
            elapsed += STEP
            if (released()) break
        }
        if (ctx.layer.destroyed) return
        const end = at()
        void dustBurst(ctx.layer,
            end,
            {
                count: 260, color: FLAME, speed: [60,
                    300], gravity: -160, drag: 1.4, life: [260,
                    640], size: [10,
                    3], alpha: 1, spread: 46
            })
        await tween(320,
            (u) => {
                if (!s.destroyed) {
                    s.alpha = 1 - u
                    s.tint = 0x602408
                }
                if (!halo.destroyed) halo.alpha = .55 * (1 - u)
            },
            ease.linear,
            ctx.layer)
    })

/** R nổ: Thùng bung, toàn bộ lửa dồn vào một quả đạn sắt lao thẳng tới kẻ bị truy nã; chạm là nhịp */
registerVfx("gangplankWantedBlast",
    async (ctx) => {
        const to = dest(ctx)
        const n = Math.max(1,
            powderOf(ctx))
        const k = blastK(n)
        const beat = beatOnce(ctx)
        const MS = 400
        ctx.shake(9,
            260)
        const burst = fireball(ctx,
            ctx.from,
            k * .72,
            .6)
        const glow = makeSprite(ctx.layer,
            "glow",
            ctx.from.x,
            ctx.from.y,
            0xff7a1c,
            220 * Math.sqrt(k))
        const shot = makeSprite(ctx.layer,
            "glow",
            ctx.from.x,
            ctx.from.y,
            0x0c0806,
            70 * Math.sqrt(k),
            false)
        let p = {
            ...ctx.from
        }
        const trail = Promise.all([
            dustStream(ctx.layer,
                () => p,
                MS,
                70,
                {
                    puff: true, color: SMOKE, speed: [6,
                        30], gravity: -30, life: [500,
                        1000], size: [50,
                        120], alpha: .55, flow: 18, additive: false
                }),
            dustStream(ctx.layer,
                () => p,
                MS,
                120,
                {
                    puff: true, color: [0xff8a24,
                        0xff5a14,
                        0xffb040], speed: [10,
                        50], life: [220,
                        460], size: [70,
                        130], alpha: .75, flow: 16
                }),
            dustStream(ctx.layer,
                () => p,
                MS,
                1200,
                {
                    color: FLAME, speed: [20,
                        200], drag: 1.6, life: [200,
                        480], size: [13,
                        4], alpha: 1, spread: 22, flow: 24
                })
        ])
        await tween(MS,
            (u) => {
                p = {
                    x: lerp(ctx.from.x,
                        to.x,
                        u), y: lerp(ctx.from.y,
                        to.y,
                        u) - Math.sin(u * Math.PI) * 90
                }
                for (const part of [glow,
                    shot]) {
                    if (part.destroyed) continue
                    part.x = p.x
                    part.y = p.y
                }
            },
            ease.in,
            ctx.layer)
        if (ctx.layer.destroyed) return
        if (!shot.destroyed) shot.visible = false
        if (!glow.destroyed) glow.visible = false
        beat()
        await Promise.all([burst,
            trail])
    })

/** R trúng: toàn bộ sức nổ dồn một điểm, kèm tiền vàng văng */
registerVfx("gangplankWantedHit",
    async (ctx) => {
        const at = ctx.from
        const k = blastK(Math.max(1,
            powderOf(ctx)))
        ctx.shake(13,
            420)
        await Promise.all([
            fireball(ctx,
                at,
                k * 1.1),
            dustBurst(ctx.layer,
                at,
                {
                    count: 200, streak: 3, color: GOLD, speed: [160,
                        620], gravity: 480, drag: 1, life: [340,
                        820], size: [7,
                        2], alpha: 1, spread: 30
                })
        ])
    })
