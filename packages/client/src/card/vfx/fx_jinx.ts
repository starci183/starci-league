// VFX riêng của Jinx: Bằng Chíu (Pew Pew) xanh lam, Bệ Phóng Cá Mập (Fishbones) hồng tím, lửa thuốc nổ, khói đen, mảnh thép, tia điện hồng lam của cơn Phấn Khích. Vật thể thật (tên lửa cá mập, Lựu Đạn Ma Hỏa!) là ảnh tô bóng; còn lại đều là hạt. Không dùng nét vẽ hình học.
// Mọi hiệu ứng chỉ dựa vào VfxCtx và tự dọn khi layer bị huỷ. Chạm đích là báo ctx.onBeat, không chờ đuôi hạt tan. Điên truyền qua ctx.amount: càng nhiều càng dữ.
import {
    Container, Particle, ParticleContainer, Sprite, Texture, Ticker
} from "pixi.js"
import {
    bloom, dustBurst, dustStream, type DustOpts
} from "./fx_dust"
import {
    ease, lerp, pick, rand, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const TAU = Math.PI * 2
const UP = -Math.PI / 2
const PINK = 0xff3fa0
const HOT_PINK = 0xff1f7a
const MAGENTA = 0xc71f6e
const CYAN = 0x3fd0ff
const ICE = 0xbff2ff
const FLASH = 0xfff1c8
const AMBER = 0xffb030
const ORANGE = 0xff6a14
const CRAZY = [PINK,
    HOT_PINK,
    CYAN,
    ICE,
    0xffffff]
const SOOT = [0x18121c,
    0x241a28,
    0x332838]
const STEEL = [0x5a5468,
    0x8a84a0,
    0x3a3448,
    MAGENTA]
const GUNMETAL = [0x9ad8ff,
    0x6a7890,
    0xdcf4ff]
/** Nửa bề rộng, nửa chiều cao lá tướng trên bàn */
const CARD_W = 56
const CARD_H = 96
/** Nửa bề rộng, nửa chiều cao đo trên lá thật ở khung 1600x900: lửa cơn Phấn Khích bám đúng mép này */
const EDGE_W = 60
const EDGE_H = 104
/** Bấy nhiêu Điên thì cơn Phấn Khích đạt độ dữ cao nhất */
const FRENZY_PEAK = 30
const CUE_STEP_MS = 320
const CUE_MAX_MS = 11000
const CUE_DEFAULT_MS = 2200
const ROCKET_MS = 340
const CHOMPER_MS = 460
const MEGA_MS = 760
/** Đuôi lửa R chờ tên lửa rời lá Jinx để không che chân dung */
const MEGA_EXHAUST_DELAY_MS = 300

const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
/** 0 Điên về 0, đủ FRENZY_PEAK về 1 */
const tierOf = (ctx: VfxCtx) => Math.min(1,
    (ctx.amount ?? 0) / FRENZY_PEAK)
const around = (at: Pt, r: number): Pt => {
    const a = rand(0,
            TAU), d = Math.sqrt(Math.random()) * r
    return {
        x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d
    }
}
/** Một điểm trên hai cạnh bên hoặc cạnh trên của lá; không có cạnh dưới và dừng trên đáy lá, lửa chỉ bốc lên nên không tràn qua đáy */
const edgeOf = (at: Pt): Pt => {
    const u = Math.random() * (2 * EDGE_H * 1.6 + 2 * EDGE_W)
    if (u < 2 * EDGE_H * 1.6) return {
        x: at.x + (u < EDGE_H * 1.6 ? -EDGE_W : EDGE_W) + rand(-3,
            3), y: at.y + rand(-EDGE_H,
            EDGE_H * .6)
    }
    return {
        x: at.x + rand(-EDGE_W,
            EDGE_W), y: at.y - EDGE_H + rand(-3,
            3)
    }
}
const wait = (ctx: VfxCtx, ms: number) => tween(ms,
    () => {},
    ease.linear,
    ctx.layer)
const aimOf = (ctx: VfxCtx) => {
    const to = ctx.to[0]
    return to ? Math.atan2(to.y - ctx.from.y,
        to.x - ctx.from.x) : UP
}
/** Miệng súng: đầu lá tướng, phía quay về mục tiêu */
const muzzleOf = (at: Pt, dir: number): Pt => ({
    x: at.x + Math.cos(dir) * CARD_W * 1.1, y: at.y + Math.sin(dir) * CARD_H * .95
})

// ---------------- lửa đổi màu theo tuổi hạt ----------------
const LUT_SIZE = 48
function makeLut(ramp: number[]) {
    const out = new Uint32Array(LUT_SIZE)
    for (let i = 0; i < LUT_SIZE; i++) {
        const u = i / (LUT_SIZE - 1) * (ramp.length - 1)
        const a = ramp[Math.floor(u)]
        const b = ramp[Math.min(ramp.length - 1,
            Math.floor(u) + 1)]
        const f = u % 1
        const mix = (shift: number) => Math.round(lerp(a >> shift & 255,
            b >> shift & 255,
            f))
        out[i] = mix(16) << 16 | mix(8) << 8 | mix(0)
    }
    return out
}
/** Thuốc nổ: trắng nóng, vàng, cam, tắt về đỏ hồng sẫm */
const BLAST_LUT = makeLut([0xfff6dc,
    0xffd868,
    0xff9420,
    0xf0401e,
    0xa8124a,
    0x2a0618])
/** Lửa hồng của cơn Phấn Khích và tên lửa */
const PINK_LUT = makeLut([0xffffff,
    0xffb4e0,
    0xff4aa8,
    0xd8147c,
    0x7a0a50,
    0x22041c])

/** Thân cầu lửa hoà màu thường: bắt đầu từ vàng cam nên nổ lớn vẫn có màu, không phủ trắng */
const FIREBALL_LUT = makeLut([0xffd25a,
    0xff9a20,
    0xff5a14,
    0xd81a3a,
    0x7a0e3a,
    0x1a0612])

/** Lửa hoà màu thường của cơn Phấn Khích: hồng gắt từ đầu tới cuối */
const FRENZY_LUT = makeLut([0xff6ab8,
    0xff2f96,
    0xf0107c,
    0xb80a64,
    0x6a0a4a,
    0x22041c])

function tongueTexture(): Texture {
    const W = 96, H = 40
    const c = document.createElement("canvas")
    c.width = W
    c.height = H
    const g = c.getContext("2d")
    if (g) {
        for (let i = 0; i < 54; i++) {
            const u = Math.pow(Math.random(),
                1.25)
            const x = W * (.2 + .68 * u)
            const y = H / 2 + (Math.random() - .5) * H * .56 * (1 - u)
            const r = H * .36 * (1 - u * .78) * rand(.55,
                1)
            const grad = g.createRadialGradient(x,
                y,
                0,
                x,
                y,
                r)
            grad.addColorStop(0,
                "rgba(255,255,255,.3)")
            grad.addColorStop(1,
                "rgba(255,255,255,0)")
            g.fillStyle = grad
            g.fillRect(0,
                0,
                W,
                H)
        }
    }
    return Texture.from(c)
}
let tongues: Texture[] | undefined
const tongueTex = () => pick(tongues ??= [tongueTexture(),
    tongueTexture(),
    tongueTexture()])

const MAX_FIRE = 5000
let liveFire = 0
const quality = () => Math.max(.3,
    Math.min(1,
        (Ticker.shared.FPS - 25) / 30))

interface FireOpts {
    lut: Uint32Array;
    aim: () => number;
    speed: [number, number];
    life: [number, number];
    size: [number, number];
    alpha?: number;
    gravity?: number;
    drag?: number;
    curl?: number;
    spread?: number;
    /** Hoà màu thường thay vì cộng sáng: lửa hồng chồng dày vẫn giữ màu, không cháy trắng */
    solid?: boolean;
}
interface Tongue { p: Particle; vx: number; vy: number; age: number; life: number; s0: number; s1: number; a: number; phase: number }

/** Nổ một lần `burst` lưỡi lửa rồi phun tiếp `ms` mili giây tại at() */
function fire(layer: Container, at: () => Pt, ms: number, rate: number, o: FireOpts, burst = 0): Promise<void> {
    if (layer.destroyed) return Promise.resolve()
    const tex = tongueTex()
    const host = new ParticleContainer({
        texture: tex,
        dynamicProperties: {
            position: true, vertex: true, rotation: true, color: true
        }
    })
    host.blendMode = o.solid ? "normal" : "add"
    layer.addChild(host)
    const list: Tongue[] = []
    const spawn = () => {
        if (liveFire >= MAX_FIRE || Math.random() > quality()) return
        const ang = o.aim()
        const spd = rand(o.speed[0],
            o.speed[1])
        const pt = around(at(),
            o.spread ?? 0)
        const k = rand(.6,
            1.35)
        const p = new Particle({
            texture: tex, anchorX: .4, anchorY: .5, x: pt.x, y: pt.y,
            tint: o.lut[0], alpha: 0, rotation: ang
        })
        host.addParticle(p)
        liveFire++
        list.push({
            p, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, age: 0, life: rand(o.life[0],
                o.life[1]),
            s0: o.size[0] * k / tex.height, s1: o.size[1] * k / tex.height, a: (o.alpha ?? .85) * rand(.6,
                1), phase: rand(0,
                TAU)
        })
    }
    for (let i = 0; i < burst; i++) spawn()
    return new Promise((resolve) => {
        let done = false
        let el = 0
        let acc = 0
        const finish = () => {
            if (done) return
            done = true
            Ticker.shared.remove(tick)
            layer.off("destroyed",
                finish)
            liveFire = Math.max(0,
                liveFire - list.length)
            list.length = 0
            if (!host.destroyed) host.destroy()
            resolve()
        }
        const drag = o.drag ?? 1.6
        const gravity = o.gravity ?? 0
        const curl = o.curl ?? 0
        const tick = (tk: Ticker) => {
            if (layer.destroyed || host.destroyed) { finish(); return }
            const dt = tk.deltaMS / 1000
            el += tk.deltaMS
            if (el < ms) {
                acc += rate * dt
                while (acc >= 1) {
                    acc -= 1
                    spawn()
                }
            }
            const keep = Math.max(0,
                1 - drag * dt)
            let removed = false
            for (let i = list.length - 1; i >= 0; i--) {
                const m = list[i]
                m.age += tk.deltaMS
                const t = m.age / m.life
                if (t >= 1) {
                    host.removeParticle(m.p)
                    list[i] = list[list.length - 1]
                    list.pop()
                    liveFire--
                    removed = true
                    continue
                }
                m.vy += gravity * dt
                m.vx *= keep
                m.vy *= keep
                const sway = Math.sin(m.age * .012 + m.phase) * curl
                m.p.x += (m.vx - Math.sin(m.p.rotation) * sway) * dt
                m.p.y += (m.vy + Math.cos(m.p.rotation) * sway) * dt
                m.p.rotation = Math.atan2(m.vy,
                    m.vx)
                const sc = lerp(m.s0,
                    m.s1,
                    t)
                m.p.scaleX = sc
                m.p.scaleY = sc
                m.p.tint = o.lut[Math.min(LUT_SIZE - 1,
                    Math.floor(t * LUT_SIZE))]
                m.p.alpha = m.a * Math.min(1,
                    t * 10) * Math.pow(1 - t,
                    1.3)
            }
            if (removed) host.update()
            if (!list.length && el >= ms) finish()
        }
        if (layer.destroyed) { finish(); return }
        layer.once("destroyed",
            finish)
        Ticker.shared.add(tick)
    })
}

// ---------------- vật thể tô bóng ----------------
function paint(W: number, H: number, draw: (g: CanvasRenderingContext2D) => void) {
    const c = document.createElement("canvas")
    c.width = W
    c.height = H
    const g = c.getContext("2d")
    if (g) draw(g)
    return Texture.from(c)
}
function spike(g: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
    g.beginPath()
    g.moveTo(ax,
        ay)
    g.lineTo(bx,
        by)
    g.lineTo(cx,
        cy)
    g.closePath()
    g.fill()
}

/** Tên lửa cá mập Fishbones: mũi quay sang phải, đầu hồng, thân thép tím, răng trắng, mắt vàng */
function sharkTexture() {
    return paint(256,
        96,
        (g) => {
            const fin = g.createLinearGradient(0,
                0,
                70,
                0)
            fin.addColorStop(0,
                "#ff5fa8")
            fin.addColorStop(1,
                "#8a1048")
            g.fillStyle = fin
            spike(g,
                6,
                4,
                66,
                26,
                44,
                40)
            spike(g,
                6,
                92,
                66,
                70,
                44,
                56)
            g.beginPath()
            g.moveTo(34,
                26)
            g.bezierCurveTo(110,
                2,
                200,
                8,
                250,
                50)
            g.bezierCurveTo(200,
                88,
                110,
                94,
                34,
                70)
            g.closePath()
            const body = g.createLinearGradient(0,
                6,
                0,
                90)
            body.addColorStop(0,
                "#a79cc4")
            body.addColorStop(.42,
                "#5a4e78")
            body.addColorStop(1,
                "#1c1626")
            g.fillStyle = body
            g.fill()
            g.save()
            g.clip()
            const head = g.createLinearGradient(0,
                6,
                0,
                90)
            head.addColorStop(0,
                "#ff8ac0")
            head.addColorStop(.45,
                "#e0206f")
            head.addColorStop(1,
                "#5a0834")
            g.fillStyle = head
            g.fillRect(146,
                0,
                110,
                96)
            g.fillStyle = "rgba(20,10,28,.7)"
            for (const x of [64,
                104,
                142]) g.fillRect(x,
                0,
                5,
                96)
            g.fillStyle = "#1a0612"
            g.beginPath()
            g.moveTo(246,
                54)
            g.lineTo(150,
                58)
            g.lineTo(176,
                92)
            g.lineTo(238,
                70)
            g.closePath()
            g.fill()
            g.fillStyle = "#fff6ee"
            for (let i = 0; i < 7; i++) {
                const x = 160 + i * 12
                spike(g,
                    x,
                    57,
                    x + 11,
                    56,
                    x + 6,
                    71)
                spike(g,
                    x + 4,
                    90 - i * 3,
                    x + 15,
                    86 - i * 3,
                    x + 8,
                    74 - i)
            }
            g.restore()
            g.fillStyle = "#ffe23a"
            g.beginPath()
            g.ellipse(190,
                34,
                12,
                6,
                .35,
                0,
                TAU)
            g.fill()
            g.fillStyle = "#1a0612"
            g.beginPath()
            g.arc(193,
                35,
                3,
                0,
                TAU)
            g.fill()
        })
}

/** Súng máy Pew Pew: bó nòng thuôn xanh thép, trống đạn tròn; mũi quay sang phải */
function minigunTexture() {
    return paint(200,
        72,
        (g) => {
            for (const [y0,
                y1] of [[10,
                    22],
                [36,
                    34],
                [62,
                    50]]) {
                const grad = g.createLinearGradient(0,
                    Math.min(y0,
                        y1) - 8,
                    0,
                    Math.max(y0,
                        y1) + 8)
                grad.addColorStop(0,
                    "#e6fbff")
                grad.addColorStop(.5,
                    "#58c8f0")
                grad.addColorStop(1,
                    "#1a4a78")
                g.strokeStyle = grad
                g.lineWidth = 13
                g.lineCap = "round"
                g.beginPath()
                g.moveTo(60,
                    y0)
                g.lineTo(190,
                    y1)
                g.stroke()
            }
            const sleeve = g.createLinearGradient(0,
                14,
                0,
                58)
            sleeve.addColorStop(0,
                "#7f8ca8")
            sleeve.addColorStop(1,
                "#20263c")
            g.fillStyle = sleeve
            g.beginPath()
            g.ellipse(132,
                36,
                9,
                23,
                0,
                0,
                TAU)
            g.fill()
            const drum = g.createRadialGradient(40,
                26,
                4,
                46,
                36,
                38)
            drum.addColorStop(0,
                "#a79cc4")
            drum.addColorStop(.55,
                "#5a4e78")
            drum.addColorStop(1,
                "#1c1626")
            g.fillStyle = drum
            g.beginPath()
            g.ellipse(46,
                36,
                42,
                34,
                0,
                0,
                TAU)
            g.fill()
        })
}

/** Hàm Lựu Đạn Ma Hỏa!: vòm thép cam, răng nhọn dọc mép; hàm dưới là bản lật */
function jawTexture() {
    return paint(128,
        64,
        (g) => {
            g.beginPath()
            g.moveTo(4,
                48)
            g.bezierCurveTo(6,
                4,
                122,
                4,
                124,
                48)
            g.closePath()
            const dome = g.createLinearGradient(0,
                4,
                0,
                50)
            dome.addColorStop(0,
                "#ffd070")
            dome.addColorStop(.5,
                "#ff7a1a")
            dome.addColorStop(1,
                "#6a1e0a")
            g.fillStyle = dome
            g.fill()
            g.fillStyle = "#2a1410"
            g.fillRect(4,
                42,
                120,
                7)
            g.fillStyle = "#fff6ee"
            for (let i = 0; i < 7; i++) {
                const x = 8 + i * 16
                spike(g,
                    x,
                    47,
                    x + 15,
                    47,
                    x + 7.5,
                    63)
            }
            g.fillStyle = "#ffe23a"
            for (const x of [40,
                88]) {
                g.beginPath()
                g.arc(x,
                    24,
                    6,
                    0,
                    TAU)
                g.fill()
            }
        })
}

let sharkTex: Texture | undefined
let gunTex: Texture | undefined
let jawTex: Texture | undefined
function shark(layer: Container, width: number) {
    const s = new Sprite(sharkTex ??= sharkTexture())
    s.anchor.set(.5)
    s.width = width
    s.height = width * 96 / 256
    layer.addChild(s)
    return s
}
function minigun(layer: Container, width: number) {
    const s = new Sprite(gunTex ??= minigunTexture())
    s.anchor.set(.5)
    s.width = width
    s.height = width * 72 / 200
    layer.addChild(s)
    return s
}
/** Mở miệng theo góc: gap 0 là ngậm chặt */
function chomper(layer: Container, width: number) {
    const body = new Container()
    const top = new Sprite(jawTex ??= jawTexture())
    const low = new Sprite(jawTex)
    for (const j of [top,
        low]) {
        j.width = width
        j.height = width / 2
        body.addChild(j)
    }
    top.anchor.set(.5,
        .94)
    low.anchor.set(.5,
        .94)
    low.scale.y *= -1
    layer.addChild(body)
    return {
        body,
        gape(gap: number) {
            top.y = -gap
            low.y = gap
        }
    }
}
const drop = (node: Container) => {
    if (!node.destroyed) node.destroy({
        children: true
    })
}

// ---------------- chất liệu dùng lại ----------------
const smoke = (over: Partial<DustOpts> = {
}): DustOpts => ({
    puff: true, color: SOOT, speed: [8,
        46], gravity: -46, drag: 1.1, life: [520,
        1100], size: [44,
        130], alpha: .55, flow: 22, additive: false, ...over
})
const crazySparks = (over: Partial<DustOpts> = {
}): DustOpts => ({
    color: CRAZY, speed: [120,
        520], drag: 3, flow: 70, life: [240,
        640], size: [6.5,
        2], streak: 2.6, alpha: 1, ...over
})
const shrapnel = (over: Partial<DustOpts> = {
}): DustOpts => ({
    blade: true, color: STEEL, speed: [220,
        720], drag: 2.6, gravity: 240, flow: 20, life: [320,
        720], size: [46,
        16], alpha: 1, additive: false, ...over
})

/** Nổ thuốc súng: chớp sáng, cầu lửa, lửa hồng lẫn, khói đen, mảnh thép, tia hồng lam */
function blast(ctx: VfxCtx, at: Pt, p: number, density = 1) {
    return Promise.all([
        bloom(ctx.layer,
            at,
            FLASH,
            210 * p,
            200),
        bloom(ctx.layer,
            at,
            ORANGE,
            540 * p,
            440),
        bloom(ctx.layer,
            at,
            HOT_PINK,
            720 * p,
            560),
        fire(ctx.layer,
            () => at,
            0,
            0,
            {
                lut: FIREBALL_LUT, aim: () => rand(0,
                    TAU), speed: [90 * p,
                    470 * p], drag: 3.4, gravity: -70, curl: 60, life: [320,
                    760], size: [92 * p,
                    26 * p], alpha: .95, spread: 26 * p, solid: true
            },
            Math.round(130 * density)),
        fire(ctx.layer,
            () => at,
            0,
            0,
            {
                lut: BLAST_LUT, aim: () => rand(0,
                    TAU), speed: [40 * p,
                    200 * p], drag: 3.6, life: [160,
                    340], size: [70 * p,
                    20 * p], alpha: .8, spread: 18 * p
            },
            Math.round(26 * density)),
        fire(ctx.layer,
            () => at,
            0,
            0,
            {
                lut: PINK_LUT, aim: () => rand(0,
                    TAU), speed: [120 * p,
                    520 * p], drag: 3.2, curl: 80, life: [260,
                    560], size: [58 * p,
                    16 * p], alpha: .85, spread: 16 * p, solid: true
            },
            Math.round(60 * density)),
        dustBurst(ctx.layer,
            at,
            {
                ...smoke({
                    speed: [40 * p,
                        170 * p], size: [90 * p,
                        210 * p], spread: 54 * p, alpha: .6
                }), count: Math.round(22 * density)
            }),
        dustBurst(ctx.layer,
            at,
            {
                ...shrapnel({
                    speed: [240 * p,
                        760 * p], spread: 14
                }), count: Math.round(30 * density)
            }),
        dustBurst(ctx.layer,
            at,
            {
                ...crazySparks({
                    color: [PINK,
                        HOT_PINK,
                        CYAN,
                        AMBER], speed: [160 * p,
                        640 * p], spread: 20 * p, additive: false
                }), count: Math.round(120 * density)
            })
    ])
}

/** Lửa đuôi và khói đặc của một quả tên lửa */
function exhaust(ctx: VfxCtx, tail: () => Pt, back: () => number, ms: number, width: number) {
    const near = () => around(tail(),
        width * .1)
    const cone = () => back() + rand(-.26,
        .26)
    return Promise.all([
        dustStream(ctx.layer,
            () => around(tail(),
                width * .22),
            ms,
            90,
            smoke({
                speed: [10,
                    60], size: [width * .22,
                    width * .7], life: [360,
                    760], alpha: .34
            })),
        fire(ctx.layer,
            near,
            ms,
            520,
            {
                lut: FIREBALL_LUT, aim: cone, speed: [90,
                    320], drag: 3, curl: 40, life: [180,
                    430], size: [width * .5,
                    width * .14], alpha: .95, solid: true
            }),
        fire(ctx.layer,
            near,
            ms,
            110,
            {
                lut: BLAST_LUT, aim: cone, speed: [60,
                    200], drag: 3, life: [110,
                    220], size: [width * .3,
                    width * .1], alpha: .8
            }),
        fire(ctx.layer,
            near,
            ms,
            260,
            {
                lut: PINK_LUT, aim: cone, speed: [80,
                    300], drag: 3, curl: 60, life: [160,
                    360], size: [width * .32,
                    width * .1], alpha: .85
            }),
        dustStream(ctx.layer,
            near,
            ms,
            150,
            {
                color: [AMBER,
                    PINK,
                    0xffe9a0], speed: [40,
                    200], flow: 60, drag: 2, life: [180,
                    420], size: [5,
                    1.6], alpha: 1
            })
    ])
}

/** Chớp miệng súng khi tên lửa rời bệ: khói phụt ngược, lửa phụt tới */
function muzzleKick(ctx: VfxCtx, at: Pt, dir: number, p: number) {
    return Promise.all([
        bloom(ctx.layer,
            at,
            FLASH,
            180 * p,
            170),
        bloom(ctx.layer,
            at,
            HOT_PINK,
            300 * p,
            300),
        dustBurst(ctx.layer,
            at,
            {
                ...smoke({
                    angle: [dir + Math.PI - .7,
                        dir + Math.PI + .7], speed: [90,
                        300], size: [24 * p,
                        80 * p], life: [320,
                        680], alpha: .3
                }), count: Math.round(8 * p)
            }),
        fire(ctx.layer,
            () => at,
            0,
            0,
            {
                lut: BLAST_LUT, aim: () => dir + rand(-.5,
                    .5), speed: [140,
                    420], drag: 4, life: [120,
                    280], size: [46 * p,
                    12 * p], alpha: .95
            },
            Math.round(48 * p))
    ])
}

// ---------------- Q · Đổi Súng ----------------
/** Súng mới bung khỏi lá rồi thu về bệ; chung cho hai chiều */
async function swap(ctx: VfxCtx, make: (layer: Container, w: number) => Sprite, width: number, colors: number[], glow: number) {
    const dir = aimOf(ctx)
    const home = muzzleOf(ctx.from,
        dir)
    const gun = make(ctx.layer,
        width)
    gun.rotation = dir
    const base = gun.scale.x
    await Promise.all([
        bloom(ctx.layer,
            ctx.from,
            glow,
            420,
            420),
        bloom(ctx.layer,
            ctx.from,
            FLASH,
            180,
            200),
        dustBurst(ctx.layer,
            ctx.from,
            {
                ...shrapnel({
                    color: colors, speed: [180,
                        560], gravity: 180, size: [34,
                        12]
                }), count: 26
            }),
        dustBurst(ctx.layer,
            ctx.from,
            {
                ...crazySparks({
                    color: [...colors,
                        0xffffff], speed: [150,
                        520], spread: 22
                }), count: 150
            }),
        dustBurst(ctx.layer,
            ctx.from,
            {
                ...smoke({
                    speed: [30,
                        130], size: [50,
                        120], alpha: .36
                }), count: 8
            }),
        tween(460,
            (t) => {
                if (gun.destroyed) return
                const pop = Math.sin(Math.min(1,
                    t / .55) * Math.PI)
                gun.x = lerp(ctx.from.x,
                    home.x,
                    t)
                gun.y = lerp(ctx.from.y,
                    home.y,
                    t)
                gun.scale.set(base * (.5 + t * .5 + pop * .85))
                gun.rotation = dir + (1 - t) * (1 - t) * TAU * .5
            },
            ease.out,
            ctx.layer).then(() => {
            ctx.onBeat?.()
            drop(gun)
        })
    ])
}

registerVfx("jinxSwapRocket",
    (ctx) => swap(ctx,
        (layer, w) => shark(layer,
            w),
        150,
        [PINK,
            MAGENTA,
            0x8a84a0],
        HOT_PINK))

registerVfx("jinxSwapMinigun",
    (ctx) => swap(ctx,
        (layer, w) => minigun(layer,
            w),
        132,
        [CYAN,
            ICE,
            0x6a7890],
        CYAN))

/** Súng đang cầm ở đầu lá: ctx.amount 1 là Bệ Phóng, 0 là Bằng Chíu; có ctx.tether thì giữ tới khi được thả */
registerVfx("jinxGunStance",
    async (ctx) => {
        const rocket = (ctx.amount ?? 0) > 0
        const dir = aimOf(ctx)
        const limit = ctx.tether ? CUE_MAX_MS : CUE_DEFAULT_MS
        const reach = rocket ? 58 : 52
        const at = () => {
            const m = muzzleOf(ctx.tether?.target() ?? ctx.from,
                dir)
            return {
                x: m.x + Math.cos(dir) * reach, y: m.y + Math.sin(dir) * reach
            }
        }
        const gun = rocket ? shark(ctx.layer,
            118) : minigun(ctx.layer,
            104)
        gun.rotation = dir
        gun.alpha = 0
        const pieces: Promise<unknown>[] = []
        const wisp = rocket
            ? smoke({
                color: [0x40303c,
                    0x2a1e2a], speed: [10,
                    40], size: [18,
                    54], life: [360,
                    720], alpha: .4
            })
            : crazySparks({
                color: GUNMETAL, speed: [30,
                    130], size: [5,
                    2], life: [160,
                    340], streak: 2
            })
        for (let el = 0; !ctx.layer.destroyed && !ctx.tether?.released() && el < limit; el += CUE_STEP_MS) {
            pieces.push(dustStream(ctx.layer,
                at,
                CUE_STEP_MS,
                rocket ? 16 : 130,
                wisp),
            dustStream(ctx.layer,
                at,
                CUE_STEP_MS,
                50,
                {
                    color: rocket ? [PINK,
                        AMBER] : [CYAN,
                        ICE], speed: [10,
                        60], gravity: -60, life: [220,
                        460], size: [5,
                        2], alpha: .9
                }),
            bloom(ctx.layer,
                at(),
                rocket ? HOT_PINK : CYAN,
                150,
                CUE_STEP_MS * 1.3))
            await tween(CUE_STEP_MS,
                () => {
                    if (gun.destroyed) return
                    const p = at()
                    gun.x = p.x
                    gun.y = p.y
                    gun.alpha = Math.min(1,
                        gun.alpha + .2)
                },
                ease.linear,
                ctx.layer)
        }
        drop(gun)
        await Promise.all(pieces)
    })

/** Bằng Chíu nhả đạn: nòng quay chớp lam, mưa vệt đạn lam sáng, vỏ đạn đồng văng ngang, tia nảy tại mục tiêu. Chạy kèm đòn đánh gốc, không có nhịp kết quả riêng */
registerVfx("jinxMinigunSpin",
    async (ctx) => {
        const to = ctx.to[0]
        if (!to) return
        const dir = aimOf(ctx)
        const mouth = muzzleOf(ctx.from,
            dir)
        const MS = 400
        const SPEED = 1500
        const fly = Math.hypot(to.x - mouth.x,
            to.y - mouth.y) / SPEED * 1000
        await Promise.all([
            bloom(ctx.layer,
                mouth,
                CYAN,
                260,
                MS),
            dustStream(ctx.layer,
                () => around(mouth,
                    14),
                MS,
                30,
                {
                    color: [CYAN,
                        ICE,
                        0xffffff], speed: [SPEED * .96,
                        SPEED * 1.04], angle: [dir - .035,
                        dir + .035], drag: 0, flow: 0, life: [fly * .94,
                        fly * 1.04], size: [7,
                        6], alpha: 1, streak: 3
                }),
            dustStream(ctx.layer,
                () => mouth,
                MS,
                70,
                {
                    blade: true, color: [0xffd060,
                        0xffb030,
                        0xfff0b0], speed: [150,
                        330], angle: [dir + Math.PI * .5 - .5,
                        dir + Math.PI * .5 + .5], gravity: 720, drag: .6, flow: 10, life: [320,
                        620], size: [18,
                        12], alpha: 1, additive: false
                }),
            dustStream(ctx.layer,
                () => mouth,
                MS,
                16,
                smoke({
                    size: [20,
                        62], life: [320,
                        640], alpha: .3
                })),
            wait(ctx,
                fly).then(() => dustStream(ctx.layer,
                () => around(to,
                    34),
                MS,
                260,
                crazySparks({
                    color: [CYAN,
                        ICE,
                        AMBER], speed: [90,
                        340], size: [8,
                        2], life: [140,
                        320]
                })))
        ])
    })

// ---------------- Bệ Phóng: đòn đánh ----------------
/** Tên lửa cá mập bay tới, Điên càng nhiều quả càng to; chạm là báo nhịp */
registerVfx("jinxRocketShot",
    async (ctx) => {
        const power = kOf(ctx) * (1 + tierOf(ctx) * .6)
        const width = 112 * power
        await Promise.all(ctx.to.map(async (to) => {
            const dir = Math.atan2(to.y - ctx.from.y,
                to.x - ctx.from.x)
            const start = muzzleOf(ctx.from,
                dir)
            const side = Math.random() < .5 ? -1 : 1
            const nx = -Math.sin(dir), ny = Math.cos(dir)
            let p = {
                ...start
            }
            const fish = shark(ctx.layer,
                width)
            fish.x = start.x
            fish.y = start.y
            fish.rotation = dir
            const tail = () => ({
                x: p.x - Math.cos(dir) * width * .46, y: p.y - Math.sin(dir) * width * .46
            })
            await Promise.all([
                muzzleKick(ctx,
                    start,
                    dir,
                    power),
                exhaust(ctx,
                    tail,
                    () => dir + Math.PI,
                    ROCKET_MS,
                    width * .78),
                tween(ROCKET_MS,
                    (t) => {
                        const wag = Math.sin(t * Math.PI) * side * 16
                        p = {
                            x: lerp(start.x,
                                to.x,
                                t) + nx * wag, y: lerp(start.y,
                                to.y,
                                t) + ny * wag
                        }
                        if (fish.destroyed) return
                        fish.x = p.x
                        fish.y = p.y
                    },
                    ease.in,
                    ctx.layer).then(() => {
                    drop(fish)
                    ctx.onBeat?.()
                })
            ])
        }))
    })

/** Tên lửa nổ tại mục tiêu */
registerVfx("jinxRocketHit",
    async (ctx) => {
        const power = kOf(ctx) * (1 + tierOf(ctx) * .5)
        ctx.shake(5 * power,
            200)
        await blast(ctx,
            ctx.from,
            .78 * power,
            .75)
    })

/** Lan nổ cùng nhịp: from là tâm nổ, to là từng tướng kề; lửa phụt theo hướng từng tướng, mỗi tướng một cú nổ nhỏ */
registerVfx("jinxRocketSplash",
    async (ctx) => {
        const power = kOf(ctx)
        await Promise.all(ctx.to.map((to) => {
            const dir = Math.atan2(to.y - ctx.from.y,
                to.x - ctx.from.x)
            return Promise.all([
                fire(ctx.layer,
                    () => ctx.from,
                    0,
                    0,
                    {
                        lut: BLAST_LUT, aim: () => dir + rand(-.2,
                            .2), speed: [460,
                            Math.hypot(to.x - ctx.from.x,
                                to.y - ctx.from.y) * 4.4], drag: 3.2, curl: 30, life: [200,
                            380], size: [60 * power,
                            16 * power], alpha: .9, spread: 22
                    },
                    60),
                blast(ctx,
                    to,
                    .54 * power,
                    .46)
            ])
        }))
    })

// ---------------- E · Lựu Đạn Ma Hỏa! ----------------
/** Bom bay vòng cung, vừa bay vừa đớp, xì lửa ở chốt; chạm tướng là báo nhịp */
registerVfx("jinxChomperToss",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all(ctx.to.map(async (to) => {
            const dir = Math.atan2(to.y - ctx.from.y,
                to.x - ctx.from.x)
            const start = muzzleOf(ctx.from,
                dir)
            const trap = chomper(ctx.layer,
                118 * k)
            let p = {
                ...start
            }
            await Promise.all([
                muzzleKick(ctx,
                    start,
                    dir,
                    .7 * k),
                fire(ctx.layer,
                    () => p,
                    CHOMPER_MS,
                    300,
                    {
                        lut: BLAST_LUT, aim: () => rand(0,
                            TAU), speed: [20,
                            110], gravity: -120, life: [160,
                            340], size: [34 * k,
                            10 * k], alpha: .9, spread: 16
                    }),
                dustStream(ctx.layer,
                    () => p,
                    CHOMPER_MS,
                    240,
                    {
                        color: [AMBER,
                            ORANGE,
                            0xffe9a0], speed: [30,
                            150], gravity: 140, life: [200,
                            460], size: [6,
                            2], alpha: 1, streak: 2.6
                    }),
                dustStream(ctx.layer,
                    () => p,
                    CHOMPER_MS,
                    46,
                    smoke({
                        size: [20,
                            70], life: [300,
                            640], alpha: .4
                    })),
                tween(CHOMPER_MS,
                    (t) => {
                        const lift = Math.sin(t * Math.PI) * 120
                        p = {
                            x: lerp(start.x,
                                to.x,
                                t), y: lerp(start.y,
                                to.y,
                                t) - lift
                        }
                        if (trap.body.destroyed) return
                        trap.body.x = p.x
                        trap.body.y = p.y
                        trap.body.rotation = Math.sin(t * TAU * 2) * .4
                        trap.gape(Math.abs(Math.sin(t * TAU * 3)) * 15 * k)
                    },
                    ease.inOut,
                    ctx.layer).then(() => {
                    drop(trap.body)
                    ctx.onBeat?.()
                })
            ])
        }))
    })

/** E trúng: hàm cắn phập, nổ cam, cột khói đen trùm kín tầm nhìn; sát thương và Mù đáp cùng lúc */
registerVfx("jinxChomperHit",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(6,
            200)
        const eyes = {
            x: ctx.from.x, y: ctx.from.y - CARD_H * .32
        }
        const trap = chomper(ctx.layer,
            112 * k)
        trap.body.x = ctx.from.x
        trap.body.y = ctx.from.y
        trap.gape(36 * k)
        await Promise.all([
            tween(130,
                (t) => {
                    if (trap.body.destroyed) return
                    trap.gape((1 - t) * 36 * k)
                    trap.body.alpha = t > .7 ? (1 - t) / .3 : 1
                },
                ease.in,
                ctx.layer).then(() => drop(trap.body)),
            blast(ctx,
                ctx.from,
                .72 * k,
                .62),
            dustBurst(ctx.layer,
                eyes,
                {
                    ...smoke({
                        speed: [40,
                            140], size: [70 * k,
                            150 * k], spread: 74 * k, alpha: .6, gravity: -10, life: [900,
                            1500]
                    }), count: 16
                })
        ])
    })

/** Mù: khói đen than hồng bám mắt tướng. Có ctx.tether thì bám theo lá tới khi được thả */
registerVfx("jinxBlindCloud",
    async (ctx) => {
        const at = () => {
            const p = ctx.tether?.target() ?? ctx.from
            return {
                x: p.x, y: p.y - CARD_H * .34
            }
        }
        const limit = ctx.tether ? CUE_MAX_MS : CUE_DEFAULT_MS
        const near = () => around(at(),
            50)
        const pieces: Promise<unknown>[] = []
        for (let el = 0; !ctx.layer.destroyed && !ctx.tether?.released() && el < limit; el += CUE_STEP_MS) {
            pieces.push(dustStream(ctx.layer,
                near,
                CUE_STEP_MS,
                24,
                smoke({
                    speed: [6,
                        30], gravity: -14, size: [70,
                        140], life: [640,
                        1100], alpha: .62
                })),
            dustStream(ctx.layer,
                near,
                CUE_STEP_MS,
                90,
                {
                    color: [AMBER,
                        ORANGE,
                        0xffe9a0], speed: [6,
                        40], gravity: -50, flow: 50, life: [320,
                        720], size: [6,
                        2], alpha: 1
                }))
            await wait(ctx,
                CUE_STEP_MS)
        }
        await Promise.all(pieces)
    })

// ---------------- R · Tên Lửa Đạn Đạo Siêu Khủng Khiếp! ----------------
/** R mở màn: bệ nạp đạn, khói xả ngược, tia hồng hút vào miệng súng; đầy là báo nhịp phóng */
registerVfx("jinxMegaRocketCharge",
    async (ctx) => {
        const k = kOf(ctx)
        const dir = aimOf(ctx)
        const mouth = muzzleOf(ctx.from,
            dir)
        const MS = 560
        const fish = shark(ctx.layer,
            150)
        fish.x = mouth.x
        fish.y = mouth.y
        fish.rotation = dir
        fish.alpha = 0
        const base = fish.scale.x
        const reach = () => {
            const a = dir + rand(-1.1,
                    1.1), d = rand(100,
                    210) * k
            return {
                x: mouth.x + Math.cos(a) * d, y: mouth.y + Math.sin(a) * d
            }
        }
        await Promise.all([
            bloom(ctx.layer,
                mouth,
                MAGENTA,
                170 * k,
                MS + 120),
            fire(ctx.layer,
                () => mouth,
                MS,
                130,
                {
                    lut: FRENZY_LUT, aim: () => dir + rand(-.7,
                        .7), speed: [40,
                        130], curl: 40, life: [180,
                        340], size: [18,
                        5], alpha: .5, spread: 18, solid: true
                }),
            dustStream(ctx.layer,
                reach,
                MS,
                520,
                {
                    color: CRAZY, speed: [20,
                        80], life: [260,
                        420], size: [7,
                        2], alpha: 1, flow: 30, drag: 1
                }),
            tween(MS,
                (t) => {
                    if (fish.destroyed) return
                    fish.alpha = Math.min(1,
                        t * 3)
                    fish.scale.set(base * (.6 + t * .75))
                },
                ease.in,
                ctx.layer).then(() => {
                drop(fish)
                ctx.onBeat?.()
            })
        ])
    })

/** R: tên lửa khổng lồ lao vòng qua bàn, càng bay càng lớn và nhanh, đuôi lửa dày; chạm là báo nhịp */
registerVfx("jinxMegaRocket",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all(ctx.to.map(async (to) => {
            const dir0 = Math.atan2(to.y - ctx.from.y,
                to.x - ctx.from.x)
            const mouth = muzzleOf(ctx.from,
                dir0)
            const start = {
                x: mouth.x + Math.cos(dir0) * 90 * k, y: mouth.y + Math.sin(dir0) * 90 * k
            }
            const len = Math.hypot(to.x - start.x,
                to.y - start.y) || 1
            const nx = -(to.y - start.y) / len, ny = (to.x - start.x) / len
            const swing = (to.x < start.x ? 1 : -1) * Math.min(150,
                len * .32)
            const W0 = 130 * k, W1 = 190 * k
            const fish = shark(ctx.layer,
                W0)
            const base = fish.scale.x
            let p = {
                ...start
            }
            let dir = dir0
            let width = W0
            ctx.shake(5,
                MEGA_MS)
            await Promise.all([
                bloom(ctx.layer,
                    mouth,
                    ORANGE,
                    220 * k,
                    240),
                wait(ctx,
                    MEGA_EXHAUST_DELAY_MS).then(() => exhaust(ctx,
                    () => ({
                        x: p.x - Math.cos(dir) * width * .46, y: p.y - Math.sin(dir) * width * .46
                    }),
                    () => dir + Math.PI,
                    MEGA_MS - MEGA_EXHAUST_DELAY_MS,
                    W1 * .62)),
                tween(MEGA_MS,
                    (t) => {
                        const arc = Math.sin(t * Math.PI) * swing
                        const next = {
                            x: lerp(start.x,
                                to.x,
                                t) + nx * arc, y: lerp(start.y,
                                to.y,
                                t) + ny * arc
                        }
                        if (Math.hypot(next.x - p.x,
                            next.y - p.y) > .5) dir = Math.atan2(next.y - p.y,
                            next.x - p.x)
                        p = next
                        width = lerp(W0,
                            W1,
                            t)
                        if (fish.destroyed) return
                        fish.x = p.x
                        fish.y = p.y
                        fish.rotation = dir
                        fish.scale.set(base * width / W0)
                    },
                    ease.in,
                    ctx.layer).then(() => {
                    drop(fish)
                    ctx.onBeat?.()
                })
            ])
        }))
    })

/** R trúng: quả nổ lớn nhất của Jinx, cột khói và mưa mảnh thép */
registerVfx("jinxMegaRocketHit",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(15,
            560)
        await Promise.all([
            blast(ctx,
                ctx.from,
                1.05 * k,
                1.15),
            dustStream(ctx.layer,
                () => around(ctx.from,
                    70 * k),
                520,
                40,
                smoke({
                    speed: [40,
                        170], gravity: -120, size: [90 * k,
                        240 * k], life: [700,
                        1300], alpha: .6
                })),
            fire(ctx.layer,
                () => around(ctx.from,
                    80 * k),
                460,
                340,
                {
                    lut: BLAST_LUT, aim: () => UP + rand(-.5,
                        .5), speed: [60,
                        260], gravity: -170, curl: 80, life: [260,
                        560], size: [66 * k,
                        16 * k], alpha: .85
                })
        ])
    })

// ---------------- Nội tại · Phấn Khích ----------------
/** Nhận Điên: tia hồng lam giật từ mục tiêu về Jinx; ctx.amount là số Điên vừa nhận, chạm Jinx là báo nhịp */
registerVfx("jinxFrenzyGain",
    async (ctx) => {
        const gained = Math.max(1,
            Math.min(12,
                ctx.amount ?? 1))
        const sources = ctx.to.length ? ctx.to : [around(ctx.from,
            170)]
        const MS = 300
        let beat = false
        await Promise.all([
            ...sources.flatMap((src) => Array.from({
                length: 2 + Math.ceil(gained / 3)
            },
            async (_, i) => {
                await wait(ctx,
                    i * 34)
                let p = {
                    ...src
                }
                const side = rand(-90,
                    90)
                await Promise.all([
                    dustStream(ctx.layer,
                        () => p,
                        MS,
                        420,
                        {
                            color: CRAZY, speed: [10,
                                70], life: [140,
                                320], size: [9,
                                2], alpha: 1, flow: 50
                        }),
                    tween(MS,
                        (t) => {
                            const o = Math.sin(t * Math.PI) * side
                            p = {
                                x: lerp(src.x,
                                    ctx.from.x,
                                    t) + o, y: lerp(src.y,
                                    ctx.from.y,
                                    t) + Math.sin(t * TAU * 2) * 18
                            }
                        },
                        ease.in,
                        ctx.layer)
                ])
                if (beat) return
                beat = true
                ctx.onBeat?.()
            })),
            wait(ctx,
                MS).then(() => Promise.all([
                dustBurst(ctx.layer,
                    {
                        x: ctx.from.x, y: ctx.from.y - EDGE_H
                    },
                    {
                        ...crazySparks({
                            angle: [UP - 1,
                                UP + 1], spread: 34, speed: [80,
                                300], additive: false
                        }), count: 30 + gained * 6
                    })
            ]))
        ])
    })

/** Đòn mang Điên trúng: điện hồng lam giật trên mục tiêu, ctx.amount là số Điên hiện có */
registerVfx("jinxFrenzyHit",
    async (ctx) => {
        const tier = tierOf(ctx)
        if (!ctx.amount) return
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                MAGENTA,
                170 + tier * 170,
                240),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...crazySparks({
                        color: [PINK,
                            HOT_PINK,
                            CYAN], speed: [110,
                            340 + tier * 300], spread: 26 + tier * 30, size: [6.5 + tier * 3,
                            2], additive: false
                    }), count: Math.round(50 + tier * 130)
                }),
            fire(ctx.layer,
                () => ctx.from,
                0,
                0,
                {
                    lut: FRENZY_LUT, aim: () => rand(0,
                        TAU), speed: [60,
                        240 + tier * 200], drag: 3.2, life: [180,
                        380], size: [38 + tier * 34,
                        10], alpha: .8, spread: 18, solid: true
                },
                Math.round(14 + tier * 40))
        ])
    })

/** Cơn Phấn Khích bám Jinx, ctx.amount là số Điên: lưỡi lửa hồng mảnh, mờ liếm quanh mép lá, Điên tăng thì dày và cao hơn một chút. Mặt tướng luôn rõ, không có quầng sáng, không tràn qua đáy lá. Có ctx.tether thì giữ tới khi được thả */
registerVfx("jinxFrenzyAura",
    async (ctx) => {
        const tier = tierOf(ctx)
        const at = () => ctx.tether?.target() ?? ctx.from
        const limit = ctx.tether ? CUE_MAX_MS : CUE_DEFAULT_MS
        const edge = () => edgeOf(at())
        const pieces: Promise<unknown>[] = []
        for (let el = 0; !ctx.layer.destroyed && !ctx.tether?.released() && el < limit; el += CUE_STEP_MS) {
            pieces.push(fire(ctx.layer,
                edge,
                CUE_STEP_MS,
                170 + tier * 130,
                {
                    lut: FRENZY_LUT, aim: () => UP + rand(-.14,
                        .14), speed: [70,
                        150 + tier * 50], gravity: -80, curl: 30, life: [240,
                        400 + tier * 100], size: [15 + tier * 5,
                        3], alpha: .72 + tier * .13, solid: true
                }),
            dustStream(ctx.layer,
                edge,
                CUE_STEP_MS,
                34 + tier * 40,
                {
                    color: [CYAN,
                        ICE,
                        PINK], speed: [30,
                        90], angle: [UP - .3,
                        UP + .3], gravity: -50, flow: 30, life: [240,
                        460], size: [5,
                        1.6], alpha: .85, additive: false
                }))
            await wait(ctx,
                CUE_STEP_MS)
        }
        await Promise.all(pieces)
    })

/** Hạ gục, Phấn Khích: pháo hoa hồng lam nổ quanh Jinx, tên lửa nhỏ vọt lên, tia từ nạn nhân chảy về */
registerVfx("jinxExcited",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(7,
            260)
        const shells = Array.from({
            length: 6
        },
        async (_, i) => {
            await wait(ctx,
                i * 52)
            const a = UP + (i - 2.5) * .62
            const d = rand(150,
                240)
            const start = {
                ...ctx.from
            }
            const end = {
                x: start.x + Math.cos(a) * d, y: start.y + Math.sin(a) * d * .9
            }
            let p = {
                ...start
            }
            await Promise.all([
                dustStream(ctx.layer,
                    () => p,
                    190,
                    520,
                    {
                        color: [PINK,
                            CYAN,
                            AMBER], speed: [10,
                            60], life: [160,
                            340], size: [9,
                            2], alpha: 1
                    }),
                tween(190,
                    (t) => {
                        p = {
                            x: lerp(start.x,
                                end.x,
                                t), y: lerp(start.y,
                                end.y,
                                t)
                        }
                    },
                    ease.out,
                    ctx.layer).then(() => Promise.all([
                    bloom(ctx.layer,
                        end,
                        i % 2 ? CYAN : HOT_PINK,
                        250 * k,
                        340),
                    dustBurst(ctx.layer,
                        end,
                        {
                            ...crazySparks({
                                color: i % 2 ? [CYAN,
                                    ICE,
                                    0xffffff] : [PINK,
                                    HOT_PINK,
                                    0xffffff], speed: [60,
                                    380], drag: 2.6, gravity: 150, flow: 130, life: [360,
                                    860], size: [8,
                                    2.5], streak: 1.3
                            }), count: 130
                        })
                ]))
            ])
        })
        await Promise.all([
            dustBurst(ctx.layer,
                {
                    x: ctx.from.x, y: ctx.from.y - EDGE_H
                },
                {
                    ...crazySparks({
                        color: [PINK,
                            HOT_PINK,
                            CYAN,
                            ICE], angle: [UP - 1.2,
                            UP + 1.2], speed: [120,
                            460], spread: 30, flow: 90, size: [7,
                            2.2], additive: false
                    }), count: 130
                }),
            ...shells
        ])
    })

/** Jinx gục: nửa số Điên văng khỏi lá rồi tắt thành khói; ctx.amount là số Điên mất */
registerVfx("jinxFrenzyShed",
    async (ctx) => {
        const lost = ctx.amount ?? 1
        await Promise.all([
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...crazySparks({
                        angle: [UP - 1.2,
                            UP + 1.2], speed: [80,
                            280], drag: 2, spread: 44, life: [320,
                            700], additive: false
                    }), count: 60 + lost * 6
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...smoke({
                        speed: [30,
                            120], size: [80,
                            170], spread: 40, alpha: .5
                    }), count: 12
                }),
            bloom(ctx.layer,
                ctx.from,
                MAGENTA,
                170,
                360)
        ])
    })
