// VFX riêng của Braum theo LMHT, chất liệu BĂNG TRONG XANH và CÁNH CỬA HẦM: khiên cửa hầm gỗ sắt nẹp đồng phủ băng, khối băng, trụ băng cao, mảnh băng sắc (`blade`), sương lạnh, bụi băng. Không dùng nét vẽ hình học.
// Bảng màu lấy từ ảnh chiêu LMHT trong public/card_skills: xanh navy, xanh lam, lục lam, băng nhạt, trắng lạnh.
// Mô-típ theo chiêu gốc: Q là khối băng phóng ra từ khiên; E lao tới đồng minh giơ cửa hầm đỡ đòn; R nện khiên xuống đất, khe băng chạy dọc sân và trụ băng mọc lên theo khe.
// Mỗi hiệu ứng chỉ dựa vào VfxCtx và tự dọn khi layer bị huỷ; chạm là báo ctx.onBeat, không chờ đuôi hạt tan.
import {
    Sprite, Texture, type Container
} from "pixi.js"
import {
    bloom, dustBurst, dustStream, mist, type DustOpts
} from "./fx_dust"
import {
    ease, lerp, pick, rand, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const TAU = Math.PI * 2
const ABYSS = 0x061840
const NAVY = 0x0a2a6e
const AZURE = 0x1e7fe0
const ICE = 0x4fd4ff
const PALE = 0xbff0ff
const FROST = 0xeefcff
const ICE_BODY = [AZURE,
    ICE,
    PALE,
    FROST]
const SHARDS = [ICE,
    PALE,
    FROST,
    0xffffff]
const COLD_AIR = [AZURE,
    ICE,
    PALE]
/** Lá tướng trên bàn: chân lá nằm dưới tâm chừng này */
const CARD_FOOT = 92
const CARD_W = 60
const UP: [number, number] = [-Math.PI * .72,
    -Math.PI * .28]
/** Braum lao tới đồng minh; demo chạy lá tướng khớp đúng thời lượng này */
export const BRAUM_RUSH_MS = 300
/** Khiên giữ tối đa chừng này nếu bên gọi không thả */
const DOOR_MAX_MS = 9000
const DOOR_DEFAULT_MS = 900
/** VFX bị cắt ở 15s: Dấu Băng tự kết thúc trước mốc đó */
const MARK_MAX_MS = 13000
const MARK_DEFAULT_MS = 1800
const MARK_PULSE_MS = 360
/** Khe băng R: nện khiên, chạy dọc sân, rẽ hai bên theo hàng địch rồi cả hàng trúng cùng một nhịp */
const SLAM_UP_MS = 240
const SLAM_DOWN_MS = 90
const CRACK_MS = 300
const FORK_MS = 170

const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
const around = (at: Pt, r: number): Pt => {
    const a = rand(0,
            TAU), d = Math.sqrt(Math.random()) * r
    return {
        x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d
    }
}
/** Đoạn thẳng từ a tới b tại t */
const along = (a: Pt, b: Pt, t: number): Pt => ({
    x: lerp(a.x,
        b.x,
        t), y: lerp(a.y,
        b.y,
        t)
})
/** Đường cong nhẹ, hút thẳng vào đích */
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
/** Điểm cách `at` chừng `gap` về phía `to` */
const toward = (at: Pt, to: Pt, gap: number): Pt => {
    const dx = to.x - at.x, dy = to.y - at.y
    const len = Math.hypot(dx,
        dy) || 1
    return {
        x: at.x + dx / len * gap, y: at.y + dy / len * gap
    }
}

function newCanvas(w: number, h: number) {
    const c = document.createElement("canvas")
    c.width = w
    c.height = h
    return {
        c, g: c.getContext("2d")
    }
}

/** Khiên cửa hầm của Braum: ván gỗ sắt, nẹp đồng, bánh xoay giữa cửa, băng phủ mép và chân cửa */
const DOOR_W = 172
const DOOR_H = 236
function doorTexture(): Texture {
    const {
        c, g
    } = newCanvas(DOOR_W,
        DOOR_H)
    if (g) {
        const pad = 15, W = DOOR_W, H = DOOR_H
        const x0 = pad, x1 = W - pad, y0 = pad, y1 = H - pad
        const shoulder = y0 + (x1 - x0) * .3
        const outline = () => {
            g.beginPath()
            g.moveTo(x0 + 3,
                y1)
            g.lineTo(x0,
                shoulder)
            g.quadraticCurveTo(x0 + 4,
                y0,
                W / 2,
                y0)
            g.quadraticCurveTo(x1 - 4,
                y0,
                x1,
                shoulder)
            g.lineTo(x1 - 3,
                y1)
            g.closePath()
        }
        g.shadowColor = "#4fd4ff"
        g.shadowBlur = 15
        g.fillStyle = "#16365c"
        outline()
        g.fill()
        g.shadowBlur = 0
        g.save()
        outline()
        g.clip()
        // ván dọc
        const planks = 5
        const pw = (x1 - x0) / planks
        for (let i = 0; i < planks; i++) {
            const shade = g.createLinearGradient(x0 + i * pw,
                0,
                x0 + (i + 1) * pw,
                0)
            shade.addColorStop(0,
                "#2c4f78")
            shade.addColorStop(.5,
                i % 2 ? "#3a638f" : "#335a84")
            shade.addColorStop(1,
                "#1f3d62")
            g.fillStyle = shade
            g.fillRect(x0 + i * pw,
                y0,
                pw,
                y1 - y0)
            g.fillStyle = "rgba(6,20,50,.75)"
            g.fillRect(x0 + i * pw - 1,
                y0,
                2,
                y1 - y0)
        }
        // nẹp đồng và đinh tán
        for (const y of [H * .26,
            H * .78]) {
            const brass = g.createLinearGradient(0,
                y - 9,
                0,
                y + 9)
            brass.addColorStop(0,
                "#e8c67a")
            brass.addColorStop(.5,
                "#b48a48")
            brass.addColorStop(1,
                "#6d4e22")
            g.fillStyle = brass
            g.fillRect(x0,
                y - 9,
                x1 - x0,
                18)
            for (let i = 0; i < 6; i++) {
                g.fillStyle = "#fbe7ae"
                g.beginPath()
                g.arc(x0 + 12 + i * (x1 - x0 - 24) / 5,
                    y,
                    3,
                    0,
                    TAU)
                g.fill()
            }
        }
        // bánh xoay cửa hầm
        const wheelY = H * .52
        const wheel = g.createRadialGradient(W / 2 - 8,
            wheelY - 8,
            3,
            W / 2,
            wheelY,
            38)
        wheel.addColorStop(0,
            "#f7dfa0")
        wheel.addColorStop(.6,
            "#b48a48")
        wheel.addColorStop(1,
            "#553a16")
        g.fillStyle = wheel
        g.beginPath()
        g.arc(W / 2,
            wheelY,
            37,
            0,
            TAU)
        g.fill()
        g.fillStyle = "#1a3558"
        g.beginPath()
        g.arc(W / 2,
            wheelY,
            23,
            0,
            TAU)
        g.fill()
        g.strokeStyle = "#e3c27c"
        g.lineWidth = 7
        g.lineCap = "round"
        for (let i = 0; i < 4; i++) {
            const a = i / 4 * TAU + .5
            g.beginPath()
            g.moveTo(W / 2 - Math.cos(a) * 24,
                wheelY - Math.sin(a) * 24)
            g.lineTo(W / 2 + Math.cos(a) * 24,
                wheelY + Math.sin(a) * 24)
            g.stroke()
        }
        // băng phủ mép và chân cửa
        g.globalCompositeOperation = "lighter"
        for (let i = 0; i < 46; i++) {
            const side = Math.random()
            const x = side < .4 ? rand(x0,
                x0 + 34) : side < .8 ? rand(x1 - 34,
                x1) : rand(x0,
                x1)
            const y = side < .8 ? rand(y0,
                y1) : rand(y1 - 46,
                y1)
            const r = rand(10,
                30)
            const blob = g.createRadialGradient(x,
                y,
                0,
                x,
                y,
                r)
            blob.addColorStop(0,
                "rgba(150,226,255,.2)")
            blob.addColorStop(1,
                "rgba(150,226,255,0)")
            g.fillStyle = blob
            g.fillRect(x - r,
                y - r,
                r * 2,
                r * 2)
        }
        g.globalCompositeOperation = "source-over"
        g.strokeStyle = "rgba(235,252,255,.65)"
        g.lineWidth = 1.2
        for (let i = 0; i < 7; i++) {
            let x = rand(x0,
                    x1), y = rand(y0,
                    y1)
            g.beginPath()
            g.moveTo(x,
                y)
            for (let j = 0; j < 3; j++) {
                x += rand(-20,
                    20)
                y += rand(-22,
                    22)
                g.lineTo(x,
                    y)
            }
            g.stroke()
        }
        g.restore()
        g.shadowColor = "#7fe4ff"
        g.shadowBlur = 11
        g.strokeStyle = "#d8f6ff"
        g.lineWidth = 3
        outline()
        g.stroke()
    }
    return Texture.from(c)
}

/** Khối băng thô: tinh thể nhọn mọc chụm từ một gốc đục như đám băng thật, cao thấp lệch nhau, không toả đều nên không thành hình sao */
const BLOCK_S = 128
function blockTexture(): Texture {
    const {
        c, g
    } = newCanvas(BLOCK_S,
        BLOCK_S)
    if (g) {
        const m = BLOCK_S / 2
        const haze = g.createRadialGradient(m,
            m,
            0,
            m,
            m,
            m)
        haze.addColorStop(0,
            "rgba(127,228,255,.7)")
        haze.addColorStop(.6,
            "rgba(79,212,255,.28)")
        haze.addColorStop(1,
            "rgba(79,212,255,0)")
        g.fillStyle = haze
        g.fillRect(0,
            0,
            BLOCK_S,
            BLOCK_S)
        const n = 15
        for (let i = 0; i < n; i++) {
            const a = -Math.PI / 2 + rand(-.95,
                .95)
            const len = m * lerp(1.32,
                .72,
                i / (n - 1)) * rand(.9,
                1.04)
            const w = rand(8,
                17)
            g.save()
            g.translate(m + rand(-14,
                14),
            BLOCK_S * .8)
            g.rotate(a)
            const shade = g.createLinearGradient(0,
                0,
                len,
                0)
            shade.addColorStop(0,
                "#2b9bee")
            shade.addColorStop(.6,
                "#7fe0ff")
            shade.addColorStop(1,
                "#eefcff")
            g.fillStyle = shade
            g.beginPath()
            g.moveTo(0,
                -w * .5)
            g.lineTo(len * rand(.5,
                .72),
            -w * rand(.5,
                .72))
            g.lineTo(len,
                0)
            g.lineTo(len * rand(.5,
                .72),
            w * rand(.5,
                .72))
            g.lineTo(0,
                w * .5)
            g.closePath()
            g.fill()
            g.fillStyle = "rgba(240,253,255,.55)"
            g.beginPath()
            g.moveTo(0,
                0)
            g.lineTo(len,
                0)
            g.lineTo(len * .6,
                -w * .55)
            g.lineTo(0,
                -w * .5)
            g.closePath()
            g.fill()
            g.restore()
        }
        for (let i = 0; i < 26; i++) {
            const x = m + rand(-34,
                    34), y = BLOCK_S * .72 + rand(-20,
                    18), r = rand(8,
                    20)
            const blob = g.createRadialGradient(x,
                y,
                0,
                x,
                y,
                r)
            blob.addColorStop(0,
                "rgba(240,253,255,.42)")
            blob.addColorStop(1,
                "rgba(240,253,255,0)")
            g.fillStyle = blob
            g.fillRect(x - r,
                y - r,
                r * 2,
                r * 2)
        }
    }
    return Texture.from(c)
}

/** Trụ băng trong xanh như ảnh chiêu R: cao, nhiều mặt, viền sáng, chân tan vào nền. Gốc ở cạnh dưới */
const SPIRE_W = 96
const SPIRE_H = 270
function spireTexture(): Texture {
    const {
        c, g
    } = newCanvas(SPIRE_W,
        SPIRE_H)
    if (g) {
        const W = SPIRE_W, H = SPIRE_H
        const tip: [number, number] = [W * rand(.4,
            .6),
        6]
        const left: [number, number][] = [[W * .14,
            H],
        [W * rand(.1,
            .18),
        H * rand(.55,
            .66)],
        [W * rand(.24,
            .32),
        H * rand(.22,
            .3)]]
        const right: [number, number][] = [[W * rand(.68,
            .76),
        H * rand(.22,
            .3)],
        [W * rand(.82,
            .9),
        H * rand(.55,
            .66)],
        [W * .86,
            H]]
        const ridge: [number, number] = [W * rand(.42,
            .58),
        H * .6]
        const path = (points: [number, number][]) => {
            g.beginPath()
            points.forEach(([x,
                y], i) => (i ? g.lineTo(x,
                y) : g.moveTo(x,
                y)))
        }
        const dim = g.createLinearGradient(0,
            0,
            W * .6,
            H)
        dim.addColorStop(0,
            "#9fe8ff")
        dim.addColorStop(.42,
            "#2b9bee")
        dim.addColorStop(1,
            "#0a2a6e")
        path([...left,
            tip,
            ridge,
            [W * .5,
                H]])
        g.closePath()
        g.fillStyle = dim
        g.fill()
        const lit = g.createLinearGradient(W,
            0,
            W * .4,
            H)
        lit.addColorStop(0,
            "#ffffff")
        lit.addColorStop(.3,
            "#bff0ff")
        lit.addColorStop(.7,
            "#4fd4ff")
        lit.addColorStop(1,
            "#1e7fe0")
        path([tip,
            ...right,
            [W * .5,
                H],
            ridge])
        g.closePath()
        g.fillStyle = lit
        g.fill()
        g.lineJoin = "miter"
        g.shadowColor = "#4fd4ff"
        g.shadowBlur = 10
        g.strokeStyle = "#e4fbff"
        g.lineWidth = 2.4
        path([...left,
            tip,
            ...right])
        g.stroke()
        g.shadowBlur = 0
        g.strokeStyle = "rgba(255,255,255,.9)"
        g.lineWidth = 1.2
        path([tip,
            ridge])
        g.stroke()
        g.strokeStyle = "rgba(235,252,255,.45)"
        g.lineWidth = 1
        for (let i = 0; i < 4; i++) {
            const y = H * rand(.3,
                .85)
            path([[W * rand(.28,
                .5),
            y],
            [W * rand(.5,
                .72),
            y + rand(-26,
                26)]])
            g.stroke()
        }
        // chân trụ tan vào nền
        g.globalCompositeOperation = "destination-out"
        const foot = g.createLinearGradient(0,
            H * .8,
            0,
            H)
        foot.addColorStop(0,
            "rgba(0,0,0,0)")
        foot.addColorStop(1,
            "rgba(0,0,0,1)")
        g.fillStyle = foot
        g.fillRect(0,
            H * .8,
            W,
            H * .2)
        g.globalCompositeOperation = "source-over"
    }
    return Texture.from(c)
}

let door: Texture | undefined
let blocks: Texture[] | undefined
let spires: Texture[] | undefined
const doorTex = () => (door ??= doorTexture())
const blockTex = () => pick(blocks ??= Array.from({
    length: 3
},
blockTexture))
const spireTex = () => pick(spires ??= Array.from({
    length: 4
},
spireTexture))

function showSprite(layer: Container, tex: Texture, at: Pt, scale: number, anchorY = .5) {
    const s = new Sprite(tex)
    s.anchor.set(.5,
        anchorY)
    s.position.set(at.x,
        at.y)
    s.scale.set(scale)
    layer.addChild(s)
    return s
}

async function fadeOut(layer: Container, s: Sprite, ms: number) {
    const from = s.alpha
    await tween(ms,
        (t) => { if (!s.destroyed) s.alpha = from * (1 - t) },
        ease.in,
        layer)
    if (!s.destroyed) s.destroy()
}

const wait = (ctx: VfxCtx, ms: number) => tween(ms,
    () => {},
    ease.linear,
    ctx.layer)

const powder = (over: Partial<DustOpts> = {
}): DustOpts => ({
    color: ICE_BODY, speed: [10,
        70], gravity: 70, drag: 1.6, flow: 40, life: [320,
        720], size: [7,
        1.8], alpha: 1, ...over
})

/** Mảnh băng sắc văng ra rồi rơi xuống */
const chips = (ctx: VfxCtx, at: Pt, count: number, power: number) => dustBurst(ctx.layer,
    at,
    {
        count, blade: true, color: SHARDS, speed: [150 * power,
            560 * power], gravity: 760, drag: 1, flow: 16, life: [340,
            820], size: [52,
            18], alpha: 1, spread: 26, additive: false
    })

/** Băng vỡ tại chỗ: quầng sáng, mảnh sắc, bụi băng, sương lạnh */
function shatter(ctx: VfxCtx, at: Pt, power: number) {
    return Promise.all([
        bloom(ctx.layer,
            at,
            ICE,
            300 * power,
            340),
        bloom(ctx.layer,
            at,
            FROST,
            100 * power,
            220),
        mist(ctx.layer,
            at,
            {
                color: COLD_AIR, size: 170 * power, alpha: .3, additive: false, speed: [24,
                    130]
            }),
        chips(ctx,
            at,
            Math.round(120 * power),
            power),
        dustBurst(ctx.layer,
            at,
            {
                ...powder({
                    speed: [50 * power,
                        300 * power], spread: 30, flow: 60, gravity: 240
                }), count: Math.round(320 * power), additive: false
            })
    ])
}

/** Trụ băng bật lên khỏi mặt đất, giữ một lúc rồi tan. `h` là chiều cao px, `lean` là độ nghiêng */
async function erupt(ctx: VfxCtx, at: Pt, h: number, lean: number, holdMs: number) {
    if (ctx.layer.destroyed) return
    const full = h / SPIRE_H
    const wide = full * rand(.85,
        1.25)
    const s = showSprite(ctx.layer,
        spireTex(),
        at,
        full,
        1)
    s.rotation = lean
    s.scale.set(wide * .6,
        0)
    await tween(110,
        (t) => {
            if (s.destroyed) return
            s.scale.set(lerp(wide * .6,
                wide,
                t),
            full * t)
        },
        ease.out,
        ctx.layer)
    await wait(ctx,
        holdMs)
    await fadeOut(ctx.layer,
        s,
        360)
}

/** Vòng trụ băng ôm lá tướng: hai bên cao, giữa thấp để vẫn thấy mặt lá và số nổi */
const cage = (ctx: VfxCtx, at: Pt, count: number, h: number, holdMs: number) => Array.from({
    length: count
},
(_, i) => {
    const u = count > 1 ? i / (count - 1) : .5
    return erupt(ctx,
        {
            x: at.x + lerp(-CARD_W * 1.25,
                CARD_W * 1.25,
                u) + rand(-8,
                8), y: at.y + CARD_FOOT + rand(-8,
                14)
        },
        h * (.58 + Math.abs(u - .5) * .84) * rand(.86,
            1.1),
        (u - .5) * .55 + rand(-.06,
            .06),
        holdMs)
})

const heads = (ctx: VfxCtx) => ctx.to.length ? ctx.to : [ctx.from]

/** Q mở màn: Braum giơ khiên, băng tụ trước mặt cửa */
registerVfx("braumShieldLift",
    async (ctx) => {
        const at = toward(ctx.from,
            heads(ctx)[0],
            46)
        const s = showSprite(ctx.layer,
            doorTex(),
            at,
            .78)
        s.alpha = 0
        await Promise.all([
            bloom(ctx.layer,
                at,
                ICE,
                240,
                380),
            dustStream(ctx.layer,
                () => around(at,
                    78),
                340,
                900,
                powder({
                    gravity: -90, speed: [6,
                        40], additive: true
                })),
            tween(340,
                (t) => {
                    if (s.destroyed) return
                    s.alpha = Math.min(1,
                        t * 3)
                    s.y = at.y + (1 - t) * 26
                },
                ease.out,
                ctx.layer)
        ])
        if (!s.destroyed) s.destroy()
    })

/** Q: khối băng lăn từ khiên tới mục tiêu, đuôi bụi băng dày; chạm là báo nhịp trúng */
registerVfx("braumIceBlock",
    async (ctx) => {
        const k = kOf(ctx)
        const ms = 400
        let beat = false
        const start = toward(ctx.from,
            heads(ctx)[0],
            46)
        const lifted = showSprite(ctx.layer,
            doorTex(),
            start,
            .78)
        await Promise.all([
            fadeOut(ctx.layer,
                lifted,
                300),
            ...heads(ctx).map(async (to) => {
                let p = {
                    ...start
                }
                const block = showSprite(ctx.layer,
                    blockTex(),
                    p,
                    1.08 * k)
                const near = () => around(p,
                    30 * k)
                await Promise.all([
                    dustStream(ctx.layer,
                        near,
                        ms,
                        1100,
                        powder({
                            speed: [6,
                                46], life: [200,
                                460], size: [9,
                                2]
                        })),
                    dustStream(ctx.layer,
                        near,
                        ms,
                        160,
                        {
                            blade: true, color: SHARDS, speed: [30,
                                130], gravity: 300, drag: 1.2, flow: 10, life: [240,
                                480], size: [30,
                                10], alpha: 1, additive: false
                        }),
                    dustStream(ctx.layer,
                        () => p,
                        ms,
                        90,
                        {
                            puff: true, color: COLD_AIR, speed: [4,
                                24], life: [260,
                                540], size: [50,
                                110], alpha: .26, flow: 18
                        }),
                    tween(ms,
                        (t) => {
                            p = along(start,
                                to,
                                t)
                            if (block.destroyed) return
                            block.position.set(p.x,
                                p.y)
                            block.rotation = t * TAU * .45
                        },
                        ease.in,
                        ctx.layer).then(() => {
                        if (!block.destroyed) block.destroy()
                        if (beat) return
                        beat = true
                        ctx.onBeat?.()
                    })
                ])
            })
        ])
    })

/** Q trúng: khối băng vỡ tung trên mục tiêu */
registerVfx("braumBiteHit",
    async (ctx) => {
        ctx.shake(5,
            170)
        await shatter(ctx,
            ctx.from,
            1.15 * kOf(ctx))
    })

/** Dấu Băng: băng đóng thành cụm trên lá tướng, bụi băng rơi lả tả. Có ctx.tether thì giữ tới khi được thả (tối đa MARK_MAX_MS) */
registerVfx("braumFrostMark",
    async (ctx) => {
        const at = () => ctx.tether?.target() ?? ctx.from
        const limit = ctx.tether ? MARK_MAX_MS : MARK_DEFAULT_MS
        const seats: [number, number, number][] = [[-CARD_W * .78,
            -62,
            .62],
        [CARD_W * .82,
            -18,
            .74],
        [-CARD_W * .55,
            64,
            .82],
        [CARD_W * .46,
            82,
            .58]]
        const crust = seats.map(([x,
            y,
            size]) => {
            const c = at()
            const s = showSprite(ctx.layer,
                blockTex(),
                {
                    x: c.x + x, y: c.y + y
                },
                size)
            s.rotation = rand(-.5,
                .5)
            return s
        })
        const body = () => {
            const p = at()
            return {
                x: p.x + rand(-CARD_W * 1.1,
                    CARD_W * 1.1), y: p.y + rand(-96,
                    90)
            }
        }
        const pieces: Promise<unknown>[] = [
            bloom(ctx.layer,
                at(),
                ICE,
                240,
                420),
            tween(180,
                (t) => {
                    crust.forEach((s, i) => {
                        if (s.destroyed) return
                        s.scale.set(seats[i][2] * ease.out(t))
                    })
                },
                ease.linear,
                ctx.layer)
        ]
        let el = 0
        while (!ctx.layer.destroyed && !ctx.tether?.released() && el < limit) {
            const c = at()
            crust.forEach((s, i) => {
                if (!s.destroyed) s.position.set(c.x + seats[i][0],
                    c.y + seats[i][1])
            })
            pieces.push(dustStream(ctx.layer,
                body,
                MARK_PULSE_MS,
                170,
                powder({
                    speed: [6,
                        30], gravity: 110, life: [460,
                        900], size: [6,
                        1.6]
                })),
            bloom(ctx.layer,
                c,
                AZURE,
                220,
                MARK_PULSE_MS * 2))
            await wait(ctx,
                MARK_PULSE_MS)
            el += MARK_PULSE_MS
        }
        await Promise.all([...pieces,
            ...crust.map(s => fadeOut(ctx.layer,
                s,
                90))])
    })

/** Dấu Băng kích hoạt trên đòn của đồng minh: dấu vỡ, trụ băng chồm lên ôm lá, Choáng đáp đúng lúc trụ dựng xong */
registerVfx("braumMarkBreak",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(8,
            220)
        void tween(110,
            () => {},
            ease.linear,
            ctx.layer).then(() => ctx.onBeat?.())
        await Promise.all([
            shatter(ctx,
                ctx.from,
                1.25 * k),
            ...cage(ctx,
                ctx.from,
                6,
                230 * k,
                520)
        ])
    })

/** Một Song Giáp bay về Braum: ba sợi bụi băng cong; chạm là báo nhịp */
registerVfx("braumStackFlow",
    async (ctx) => {
        const ms = 380
        const home = heads(ctx)[0]
        let beat = false
        await Promise.all([-.5,
            .14,
            .6].map(async (side) => {
            let p = {
                ...ctx.from
            }
            await Promise.all([
                dustStream(ctx.layer,
                    () => around(p,
                        10),
                    ms,
                    520,
                    powder({
                        speed: [4,
                            26], life: [180,
                            400], size: [8,
                            2], gravity: 0
                    })),
                tween(ms,
                    (t) => {
                        p = bend(ctx.from,
                            home,
                            t,
                            side)
                    },
                    ease.in,
                    ctx.layer)
            ])
            if (beat) return
            beat = true
            ctx.onBeat?.()
        }))
    })

/** Nội tại: nhận Song Giáp. Tấm giáp băng mọc lên quanh lá, mảnh băng trắng là Giáp, lam là Kháng Phép; ctx.amount là tổng số tầng, càng nhiều càng dày */
registerVfx("braumStackGain",
    async (ctx) => {
        const total = Math.min(12,
            ctx.amount ?? 1)
        const c = ctx.from
        await Promise.all([
            bloom(ctx.layer,
                c,
                ICE,
                240 + total * 12,
                380),
            mist(ctx.layer,
                c,
                {
                    color: COLD_AIR, size: 170, alpha: .26, gravity: -40, additive: false
                }),
            dustBurst(ctx.layer,
                c,
                {
                    ...powder({
                        speed: [20,
                            130], gravity: -60, spread: 86, flow: 56
                    }), count: 220 + total * 24
                }),
            dustBurst(ctx.layer,
                c,
                {
                    count: 40 + total * 6, blade: true, color: [FROST,
                        0xffffff,
                        0x7fc2ff], speed: [60,
                        240], angle: UP, gravity: 260, drag: 1.2, flow: 12, life: [320,
                        680], size: [42,
                        13], alpha: 1, spread: 70, additive: false
                }),
            ...cage(ctx,
                c,
                4 + Math.min(4,
                    total),
                120 + total * 8,
                200)
        ])
    })

/** Luật chết: nửa Song Giáp vỡ khỏi người Braum và rơi xuống; ctx.amount là số tầng mất */
registerVfx("braumStackShed",
    async (ctx) => {
        const lost = Math.min(12,
            ctx.amount ?? 1)
        await Promise.all([
            shatter(ctx,
                ctx.from,
                .9 + lost * .08),
            ...Array.from({
                length: 3 + lost * 2
            },
            async () => {
                const s = showSprite(ctx.layer,
                    blockTex(),
                    around(ctx.from,
                        86),
                    rand(.3,
                        .55))
                const y = s.y
                const x = s.x
                const drift = rand(-70,
                    70)
                const spin = rand(-3,
                    3)
                await tween(760,
                    (t) => {
                        if (s.destroyed) return
                        s.position.set(x + drift * t,
                            y + 320 * t * t)
                        s.rotation = spin * t
                        s.alpha = 1 - t * t
                    },
                    ease.linear,
                    ctx.layer)
                if (!s.destroyed) s.destroy()
            })
        ])
    })

/** E: dấu Quick, luồng lạnh bật khỏi chỗ Braum đứng */
registerVfx("braumQuick",
    async (ctx) => {
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ICE,
                280,
                300),
            mist(ctx.layer,
                ctx.from,
                {
                    color: COLD_AIR, size: 130, alpha: .3, speed: [30,
                        120]
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...powder({
                        speed: [60,
                            300], spread: 34, flow: 50
                    }), count: 260
                })
        ])
    })

/** E: Braum giơ cửa hầm lao tới đồng minh, vệt băng dài kéo theo; tới nơi là báo nhịp */
registerVfx("braumInterpose",
    async (ctx) => {
        const to = heads(ctx)[0]
        const dir = Math.atan2(to.y - ctx.from.y,
            to.x - ctx.from.x)
        let p = {
            ...ctx.from
        }
        const s = showSprite(ctx.layer,
            doorTex(),
            p,
            .82)
        const near = () => around(p,
            54)
        await Promise.all([
            dustStream(ctx.layer,
                near,
                BRAUM_RUSH_MS,
                1500,
                {
                    color: ICE_BODY, speed: [140,
                        460], angle: [dir + Math.PI - .3,
                        dir + Math.PI + .3], drag: 3, flow: 30, life: [240,
                        520], size: [11,
                        3], streak: 5.5, alpha: 1, additive: false
                }),
            dustStream(ctx.layer,
                () => p,
                BRAUM_RUSH_MS,
                110,
                {
                    puff: true, color: COLD_AIR, speed: [8,
                        36], life: [320,
                        640], size: [80,
                        170], alpha: .3, flow: 20
                }),
            tween(BRAUM_RUSH_MS,
                (t) => {
                    p = along(ctx.from,
                        to,
                        t)
                    if (!s.destroyed) s.position.set(p.x,
                        p.y)
                },
                ease.in,
                ctx.layer).then(() => {
                if (!s.destroyed) s.destroy()
                ctx.onBeat?.()
            })
        ])
    })

/** E: cửa hầm cắm xuống trước đồng minh, Khiên và Song Giáp đáp ngay lúc này. Có ctx.tether thì giữ tới khi được thả (tối đa DOOR_MAX_MS) */
registerVfx("braumDoorShield",
    async (ctx) => {
        const at = ctx.from
        const flare = bloom(ctx.layer,
            at,
            ICE,
            340,
            460)
        const s = showSprite(ctx.layer,
            doorTex(),
            at,
            1.02)
        const foot = {
            x: at.x, y: at.y + DOOR_H * .46
        }
        ctx.shake(5,
            150)
        ctx.onBeat?.()
        const pieces: Promise<unknown>[] = [
            tween(140,
                (t) => { if (!s.destroyed) s.scale.set(lerp(1.02,
                    .9,
                    t)) },
                ease.out,
                ctx.layer),
            flare,
            mist(ctx.layer,
                foot,
                {
                    color: COLD_AIR, size: 170, alpha: .36, speed: [30,
                        130]
                }),
            dustBurst(ctx.layer,
                foot,
                {
                    ...powder({
                        speed: [80,
                            340], angle: [-Math.PI * .96,
                            -Math.PI * .04], gravity: 520, spread: 46
                    }), count: 300, additive: false
                }),
            chips(ctx,
                foot,
                34,
                .7)
        ]
        const limit = ctx.tether ? DOOR_MAX_MS : DOOR_DEFAULT_MS
        let el = 0
        while (!ctx.layer.destroyed && !ctx.tether?.released() && el < limit) {
            pieces.push(dustStream(ctx.layer,
                () => ({
                    x: at.x + rand(-DOOR_W * .46,
                        DOOR_W * .46), y: at.y + rand(-DOOR_H * .42,
                        DOOR_H * .46)
                }),
                200,
                420,
                powder({
                    speed: [6,
                        30], gravity: -60, life: [320,
                        620], size: [6,
                        1.6], additive: false
                })))
            await wait(ctx,
                200)
            el += 200
        }
        await Promise.all([...pieces,
            fadeOut(ctx.layer,
                s,
                260)])
    })

/** E đỡ đòn: đòn địch nện vào cửa hầm, băng và tia lạnh bắn ngược lại */
registerVfx("braumDoorBlock",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(9,
            240)
        await Promise.all([
            shatter(ctx,
                ctx.from,
                .85 * k),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 200, color: SHARDS, speed: [260,
                        720], angle: UP, drag: 2.6, flow: 16, life: [200,
                        460], size: [11,
                        3], streak: 6, alpha: 1, spread: 40
                })
        ])
    })

/** E: Choáng hoặc trạng thái của đòn địch vừa quấn lên đồng minh đã rã: dây màu ctx.color siết lấy lá rồi tan thành bụi, hoá băng */
registerVfx("braumStatusBreak",
    async (ctx) => {
        const at = ctx.from
        const tone = [ctx.color,
            ctx.color,
            ctx.color2 ?? 0xffffff]
        let spin = 0
        let squeeze = 1.5
        const band = (height: number, phase: number) => () => {
            const a = spin + phase
            return {
                x: at.x + Math.cos(a) * 92 * squeeze + rand(-5,
                    5), y: at.y + height + Math.sin(a) * 26 * squeeze + rand(-5,
                    5)
            }
        }
        const rope: DustOpts = {
            color: tone, speed: [2,
                18], life: [120,
                260], size: [10,
                3], alpha: 1, flow: 16, drag: 3, additive: false
        }
        await Promise.all([
            dustStream(ctx.layer,
                band(-52,
                    0),
                200,
                1800,
                rope),
            dustStream(ctx.layer,
                band(46,
                    Math.PI),
                200,
                1800,
                rope),
            tween(200,
                (t) => {
                    spin = t * TAU * .8
                    squeeze = lerp(1.5,
                        .9,
                        t)
                },
                ease.out,
                ctx.layer),
            // dây đứt: bụi cùng màu bay lên rồi lẫn vào bụi băng
            wait(ctx,
                170).then(() => Promise.all([
                bloom(ctx.layer,
                    at,
                    ctx.color,
                    230,
                    340),
                dustBurst(ctx.layer,
                    at,
                    {
                        count: 420, color: tone, speed: [50,
                            260], gravity: -130, drag: 1.5, flow: 90, life: [420,
                            900], size: [7,
                            2], alpha: 1, spread: 92
                    }),
                dustBurst(ctx.layer,
                    at,
                    {
                        ...powder({
                            speed: [30,
                                170], gravity: -70, spread: 92, flow: 80
                        }), count: 260
                    })
            ]))
        ])
    })

interface Leg { a: Pt; b: Pt; start: number; end: number }

/** R: Braum nện khiên, khe băng chạy thẳng tới tướng đối diện rồi rẽ hai bên theo hàng địch, trụ băng mọc dọc khe. ctx.to[0] là tướng đối diện; hết đường rẽ là báo nhịp, mọi tướng trúng cùng lúc */
registerVfx("braumFissure",
    async (ctx) => {
        const k = kOf(ctx)
        const from = ctx.from
        const up = {
            x: from.x, y: from.y - 96
        }
        const land = {
            x: from.x, y: from.y + 34
        }
        const shield = showSprite(ctx.layer,
            doorTex(),
            land,
            .92)
        shield.alpha = 0
        await Promise.all([
            bloom(ctx.layer,
                from,
                ICE,
                260,
                SLAM_UP_MS + 120),
            tween(SLAM_UP_MS,
                (t) => {
                    if (shield.destroyed) return
                    const p = along(land,
                        up,
                        t)
                    shield.position.set(p.x,
                        p.y)
                    shield.alpha = Math.min(1,
                        t * 3)
                },
                ease.out,
                ctx.layer)
        ])
        await tween(SLAM_DOWN_MS,
            (t) => {
                if (shield.destroyed) return
                const p = along(up,
                    land,
                    t)
                shield.position.set(p.x,
                    p.y)
            },
            ease.in,
            ctx.layer)
        ctx.shake(14,
            760)
        const head = ctx.to[0] ?? {
            x: from.x, y: from.y - 520
        }
        const row = ctx.to.length ? ctx.to : [head]
        const left = Math.min(...row.map(p => p.x)) - 90
        const right = Math.max(...row.map(p => p.x)) + 90
        const foot = head.y + CARD_FOOT * .92
        const start = {
            x: from.x, y: from.y + CARD_FOOT * .5
        }
        const bend0 = {
            x: head.x, y: foot
        }
        const main: Leg = {
            a: start, b: bend0, start: 0, end: CRACK_MS
        }
        const legs: Leg[] = [main,
            {
                a: bend0, b: {
                    x: left, y: foot + rand(-16,
                        16)
                }, start: CRACK_MS, end: CRACK_MS + FORK_MS
            },
            {
                a: bend0, b: {
                    x: right, y: foot + rand(-16,
                        16)
                }, start: CRACK_MS, end: CRACK_MS + FORK_MS
            }]
        const total = CRACK_MS + FORK_MS
        let now = 0
        /** Điểm đã nứt: chọn ngẫu nhiên trên phần khe đã chạy tới, lệch răng cưa */
        const seam = (wobble: number) => () => {
            const live = legs.filter(l => now >= l.start)
            const leg = pick(live)
            const u = Math.random() * Math.min(1,
                (now - leg.start) / (leg.end - leg.start))
            const p = along(leg.a,
                leg.b,
                u)
            const jag = Math.sin(u * 37) * 13 + Math.sin(u * 91) * 7
            return {
                x: p.x + rand(-wobble,
                    wobble) + (leg === main ? jag : 0), y: p.y + rand(-wobble,
                    wobble) + (leg === main ? 0 : jag)
            }
        }
        // trụ băng mọc lần lượt theo mép khe, chờ sẵn theo thời điểm đầu khe đi qua
        const planted: { at: Pt; when: number; lean: number; h: number }[] = []
        for (const leg of legs) {
            const span = Math.hypot(leg.b.x - leg.a.x,
                leg.b.y - leg.a.y)
            const steps = Math.max(3,
                Math.round(span / 62))
            for (let i = 1; i <= steps; i++) {
                const u = i / steps
                const p = along(leg.a,
                    leg.b,
                    u)
                planted.push({
                    at: {
                        x: p.x + rand(-26,
                            26), y: p.y + rand(-12,
                            20)
                    },
                    when: lerp(leg.start,
                        leg.end,
                        u),
                    lean: rand(-.3,
                        .3),
                    h: (leg === main ? rand(100,
                        160) : rand(60,
                        100)) * k
                })
            }
        }
        planted.sort((a, b) => a.when - b.when)
        const rising: Promise<unknown>[] = []
        let beat = false
        await Promise.all([
            fadeOut(ctx.layer,
                shield,
                300),
            bloom(ctx.layer,
                start,
                FROST,
                420 * k,
                420),
            shatter(ctx,
                start,
                1.1 * k),
            dustStream(ctx.layer,
                seam(10),
                total + 240,
                3200,
                {
                    color: [ABYSS,
                        NAVY,
                        ABYSS], speed: [4,
                        18], drag: 3, flow: 6, life: [640,
                        1100], size: [15,
                        6], streak: 2.4, alpha: 1, additive: false
                }),
            dustStream(ctx.layer,
                seam(8),
                total + 240,
                2400,
                {
                    color: ICE_BODY, speed: [10,
                        60], angle: UP, gravity: -40, drag: 2, flow: 12, life: [300,
                        640], size: [9,
                        2.4], alpha: 1
                }),
            dustStream(ctx.layer,
                seam(14),
                total + 120,
                260,
                {
                    blade: true, color: SHARDS, speed: [120,
                        420], angle: UP, gravity: 720, drag: .8, flow: 10, life: [320,
                        680], size: [46,
                        16], alpha: 1, additive: false
                }),
            dustStream(ctx.layer,
                seam(20),
                total + 200,
                90,
                {
                    puff: true, color: COLD_AIR, speed: [8,
                        36], angle: UP, life: [520,
                        1000], size: [100,
                        210], alpha: .3, flow: 16
                }),
            tween(total,
                (t) => {
                    now = t * total
                    while (planted.length && planted[0].when <= now) {
                        const spike = planted.shift()
                        if (spike) rising.push(erupt(ctx,
                            spike.at,
                            spike.h,
                            spike.lean,
                            Math.max(420,
                                total + 620 - spike.when)))
                    }
                    if (!beat && t >= 1) {
                        beat = true
                        ctx.onBeat?.()
                    }
                },
                ease.linear,
                ctx.layer)
        ])
        await Promise.all(rising)
    })

/** R trúng tướng thường: trụ băng thấp hơn, Choáng ngắn */
registerVfx("braumFissureHit",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            shatter(ctx,
                ctx.from,
                .8 * k),
            ...cage(ctx,
                ctx.from,
                3,
                150,
                520)
        ])
    })

/** R trúng tướng đối diện: khối băng dày ôm trọn lá, Choáng dài */
registerVfx("braumFissureCrush",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(12,
            320)
        await Promise.all([
            shatter(ctx,
                ctx.from,
                1.2 * k),
            bloom(ctx.layer,
                ctx.from,
                FROST,
                380 * k,
                520),
            mist(ctx.layer,
                {
                    x: ctx.from.x, y: ctx.from.y + 50
                },
                {
                    color: COLD_AIR, size: 260, alpha: .4, speed: [20,
                        100], life: [700,
                        1300]
                }),
            ...cage(ctx,
                ctx.from,
                7,
                270,
                1000)
        ])
    })
