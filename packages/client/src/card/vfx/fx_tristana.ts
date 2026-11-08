// VFX riêng của Tristana theo LMHT: bom gang gai nhọn gắn trên mục tiêu, lửa thuốc súng cam đỏ, khói đen, đạn Đại Bác gang rất to. Bảng màu lấy từ icon chiêu: gang xám, lửa vàng trắng ở lõi rồi cam đỏ, đỏ thẫm.
// Bom là vật thể thật: hình gang vẽ một lần, lớn dần theo số Bom. Kích cỡ vụ nổ đi theo số Bom (ctx.amount): 2 Bom là tiếng nổ nhỏ, 6 Bom là cầu lửa và cột khói, từ 10 Bom là cả dãy nổ phụ, sóng bụi quét bàn.
// Dấu Bom sống tới khi ctx.tether.released() báo xong nên biến đúng khung hình kích nổ; không có tether thì sống TRISTANA_MARK_MS. Trúng là báo ctx.onBeat, không chờ đuôi hạt tan.
import {
    Container, Particle, ParticleContainer, Sprite, Texture, Ticker
} from "pixi.js"
import {
    bloom, dustBurst, dustStream, mist
} from "./fx_dust"
import {
    ease, lerp, makeSprite, pick, rand, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const TAU = Math.PI * 2
const SPARK = [0xfff4d0,
    0xffd060,
    0xffa030,
    0xff7a20]
const SMOKE = [0x0e0b0a,
    0x1c1614,
    0x2c2420,
    0x40362e]
const ASH = [0x5a5048,
    0x7a6e62,
    0x8e8274]
const IRON = [0x8d9099,
    0x5e6068,
    0x3e4046,
    0xb09070]
const FLAME = 0xff7a20
const RED_HOT = 0xff3a10
const WHITE_HOT = 0xfff0c0
/** Nửa chiều cao lá tướng trên bàn */
const CARD_H = 104
/** Dấu Bom sống tối đa chừng này; demo và trận phát lại khi còn Bom. Phải dưới trần 15 giây của playVfx */
export const TRISTANA_MARK_MS = 12000
/** Q: thời gian lớn nhất của luồng nhiệt quanh Tristana */
export const TRISTANA_AURA_MS = 12000
/** Từ chừng này Bom, vụ nổ thành cả dãy nổ phụ và sóng bụi */
const MEGA_BOMBS = 10
const LUT_SIZE = 48
const MAX_FIRE = 6000
let liveFire = 0

const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
const stacksOf = (ctx: VfxCtx) => Math.max(1,
    Math.round(ctx.amount ?? 1))
const wait = (layer: Container, ms: number) => tween(ms,
    () => {},
    ease.linear,
    layer)
const quality = () => Math.max(.3,
    Math.min(1,
        (Ticker.shared.FPS - 25) / 30))
function ahead(a: Pt, b: Pt, d: number): Pt {
    const len = Math.hypot(b.x - a.x,
        b.y - a.y) || 1
    return {
        x: a.x + (b.x - a.x) / len * d, y: a.y + (b.y - a.y) / len * d
    }
}

/** Đường kính quả bom theo số Bom: 2 Bom bằng nắm tay, 12 Bom gần bằng bề ngang lá tướng */
export const bombSize = (n: number) => Math.min(170,
    40 * Math.sqrt(n))
/** Tỉ lệ vụ nổ theo số Bom, tăng vọt theo công thức sát thương: 2 → .42, 6 → 1, 12 → 1.74 */
const blastScale = (n: number) => Math.min(2.4,
    Math.pow(n / 6,
        .8))
/** Bom nằm trên phần tranh của lá, không che số máu */
const bombSpot = (at: Pt): Pt => ({
    x: at.x, y: at.y - 22
})

function makeLut(ramp: number[]) {
    const out = new Uint32Array(LUT_SIZE)
    for (let i = 0; i < LUT_SIZE; i++) {
        const u = i / (LUT_SIZE - 1) * (ramp.length - 1)
        const a = ramp[Math.floor(u)]
        const b = ramp[Math.min(ramp.length - 1,
            Math.floor(u) + 1)]
        const mix = (shift: number) => Math.round(lerp(a >> shift & 255,
            b >> shift & 255,
            u % 1))
        out[i] = mix(16) << 16 | mix(8) << 8 | mix(0)
    }
    return out
}
/** Lõi nổ: trắng nóng rồi vàng, cam */
const CORE_LUT = makeLut([0xfff8e0,
    0xffe088,
    0xffa030,
    0xff6212,
    0xa8280a,
    0x300c04])
/** Thân lửa thuốc súng: cam đục tắt thành nâu đen */
const BODY_LUT = makeLut([0xffc050,
    0xff7a18,
    0xe0400c,
    0x8a2408,
    0x3a1408,
    0x120806])

/** Lưỡi lửa: nhiều đốm mềm thuôn về đầu, viền không đều */
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
}
interface Tongue { p: Particle; vx: number; vy: number; age: number; life: number; s0: number; s1: number; a: number; phase: number }

/** Lửa đổi màu theo tuổi hạt: nổ một lần `burst` lưỡi, rồi phun tiếp `ms` mili giây tại at() */
function fire(layer: Container, at: () => Pt, ms: number, rate: number, o: FireOpts, burst = 0): Promise<void> {
    if (layer.destroyed) return Promise.resolve()
    const tex = tongueTex()
    const host = new ParticleContainer({
        texture: tex,
        dynamicProperties: {
            position: true, vertex: true, rotation: true, color: true
        }
    })
    host.blendMode = "add"
    layer.addChild(host)
    const list: Tongue[] = []
    const spawn = () => {
        if (liveFire >= MAX_FIRE || Math.random() > quality()) return
        const ang = o.aim()
        const spd = rand(o.speed[0],
            o.speed[1])
        const pt = at()
        const r = Math.sqrt(Math.random()) * (o.spread ?? 0)
        const pa = rand(0,
            TAU)
        const k = rand(.6,
            1.35)
        const p = new Particle({
            texture: tex, anchorX: .4, anchorY: .5, x: pt.x + Math.cos(pa) * r, y: pt.y + Math.sin(pa) * r,
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
        let clock = rand(0,
            30)
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
        const gravity = o.gravity ?? 0
        const drag = o.drag ?? 0
        const curl = o.curl ?? 60
        const tick = (tk: Ticker) => {
            if (layer.destroyed || host.destroyed) { finish(); return }
            const dt = tk.deltaMS / 1000
            clock += dt
            if (el < ms) {
                el += tk.deltaMS
                acc += dt * rate
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
                const p = m.p
                m.vy += gravity * dt
                m.vx *= keep
                m.vy *= keep
                const wx = Math.sin(p.y * .031 + clock * 6.1 + m.phase) + .6 * Math.sin((p.x + p.y) * .019 - clock * 4.3)
                const wy = Math.cos(p.x * .027 - clock * 5.2) * .5
                const dx = m.vx + wx * curl
                const dy = m.vy + wy * curl
                p.x += dx * dt
                p.y += dy * dt
                p.rotation = Math.atan2(dy,
                    dx)
                const sc = lerp(m.s0,
                    m.s1,
                    t)
                p.scaleX = sc
                p.scaleY = sc * (.8 + .2 * Math.sin(m.age * .03 + m.phase))
                p.tint = o.lut[Math.min(LUT_SIZE - 1,
                    Math.floor(t * LUT_SIZE))]
                p.alpha = m.a * Math.min(1,
                    t * 11) * Math.pow(1 - t,
                    1.1)
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

/** Tia lửa kim loại: văng mạnh rồi rơi */
const sparks = (layer: Container, pt: Pt, count: number, power = 1, angle?: [number, number], spread = 12) => dustBurst(layer,
    pt,
    {
        count, color: SPARK, streak: 5, speed: [160 * power,
            640 * power], angle, gravity: 720, drag: .9, flow: 22, life: [260,
            680], size: [8,
            2.5], alpha: 1, spread
    })
/** Mảnh gang sắc cạnh, tối màu nên nổi trên bàn sáng */
const shards = (layer: Container, pt: Pt, count: number, power = 1, spread = 14) => dustBurst(layer,
    pt,
    {
        count, color: IRON, blade: true, speed: [140 * power,
            680 * power], gravity: 640, drag: .9, flow: 10, life: [480,
            1000], size: [32,
            12], alpha: 1, spread, additive: false
    })
/** Khói thuốc súng đen cuộn lên */
const soot = (layer: Container, pt: Pt, size: number, alpha = .6, count = 12) => mist(layer,
    pt,
    {
        color: SMOKE, size, alpha, count, additive: false, gravity: -80, life: [560,
            1050], speed: [10,
            80]
    })

/** Vẽ quả bom gang: gai thép quanh thân, đai tán, vệt sáng; không gai là đạn đại bác trơn */
function ironTexture(spiked: boolean): Texture {
    const S = 128
    const c = document.createElement("canvas")
    c.width = S
    c.height = S
    const g = c.getContext("2d")
    if (g) {
        const mid = S / 2
        const R = spiked ? S * .33 : S * .46
        if (spiked) {
            for (let i = 0; i < 9; i++) {
                const a = i / 9 * TAU + rand(-.09,
                    .09)
                const tip = R * rand(1.42,
                    1.72)
                const wide = .3
                const grad = g.createLinearGradient(mid + Math.cos(a) * R,
                    mid + Math.sin(a) * R,
                    mid + Math.cos(a) * tip,
                    mid + Math.sin(a) * tip)
                grad.addColorStop(0,
                    "#4a4a50")
                grad.addColorStop(.6,
                    "#c6c8cc")
                grad.addColorStop(1,
                    "#ffb060")
                g.fillStyle = grad
                g.beginPath()
                g.moveTo(mid + Math.cos(a - wide) * R,
                    mid + Math.sin(a - wide) * R)
                g.lineTo(mid + Math.cos(a) * tip,
                    mid + Math.sin(a) * tip)
                g.lineTo(mid + Math.cos(a + wide) * R,
                    mid + Math.sin(a + wide) * R)
                g.fill()
            }
        }
        const body = g.createRadialGradient(mid - R * .36,
            mid - R * .42,
            R * .06,
            mid,
            mid,
            R * 1.05)
        body.addColorStop(0,
            "#a9acb4")
        body.addColorStop(.28,
            "#61636b")
        body.addColorStop(.68,
            "#2c2d33")
        body.addColorStop(1,
            "#0e0e12")
        g.fillStyle = body
        g.beginPath()
        g.arc(mid,
            mid,
            R,
            0,
            TAU)
        g.fill()
        g.save()
        g.clip()
        // vết rỗ gang thay cho đường xước dài, nhìn nhỏ không thành lưới
        g.fillStyle = "rgba(0,0,0,.26)"
        for (let i = 0; i < 26; i++) {
            g.beginPath()
            g.arc(rand(mid - R,
                mid + R),
            rand(mid - R,
                mid + R),
            rand(.8,
                2.6),
            0,
            TAU)
            g.fill()
        }
        g.restore()
    }
    return Texture.from(c)
}
let spikedTex: Texture | undefined
let ballTex: Texture | undefined

function ironSprite(layer: Container, spiked: boolean, size: number): Sprite {
    const s = new Sprite(spiked ? spikedTex ??= ironTexture(true) : ballTex ??= ironTexture(false))
    s.anchor.set(.5)
    s.width = size
    s.height = size
    layer.addChild(s)
    return s
}

/** Dừng khi tween hết giờ hoặc khi `released` báo xong; layer huỷ theo nên mọi thứ biến cùng khung hình */
function holdUntil(ctx: VfxCtx, ms: number, frame: (t: number) => void): Promise<void> {
    return new Promise((resolve) => {
        void tween(ms,
            (t) => {
                if (ctx.tether?.released()) resolve()
                else frame(t)
            },
            ease.linear,
            ctx.layer).then(resolve)
    })
}

/** Dấu Bom: quả bom gang gắn trên lá, ctx.amount là số Bom; càng nhiều Bom càng to, càng nóng đỏ, ngòi xì càng dày và nhấp nháy càng gấp */
registerVfx("tristanaBombMark",
    async (ctx) => {
        const n = stacksOf(ctx)
        const size = bombSize(n)
        const at = () => bombSpot(ctx.tether?.target() ?? ctx.from)
        const ms = ctx.tether ? TRISTANA_MARK_MS : 1000
        const start = at()
        const halo = makeSprite(ctx.layer,
            "glow",
            start.x,
            start.y,
            RED_HOT,
            size * 2.6)
        const bomb = ironSprite(ctx.layer,
            true,
            size)
        const heat = makeSprite(ctx.layer,
            "glow",
            start.x,
            start.y,
            FLAME,
            size * .86)
        const fuse = (): Pt => {
            const p = at()
            return {
                x: p.x + size * .3, y: p.y - size * .36
            }
        }
        const period = Math.max(170,
            660 - n * 42)
        const hotness = Math.min(1,
            .25 + n / 12)
        const frame = () => {
            const p = at()
            const beat = Math.pow(Math.max(0,
                Math.sin(performance.now() / period * Math.PI)),
            6)
            const w = size * (1 + beat * .07)
            bomb.position.set(p.x,
                p.y)
            bomb.width = w
            bomb.height = w
            bomb.rotation = Math.sin(performance.now() * .0023) * .12
            heat.position.set(p.x,
                p.y)
            heat.alpha = hotness * (.16 + beat * .6)
            halo.position.set(p.x,
                p.y)
            halo.alpha = hotness * (.2 + beat * .4)
        }
        frame()
        void dustStream(ctx.layer,
            fuse,
            ms,
            60 + n * 26,
            {
                color: SPARK, streak: 4, speed: [50,
                    210], angle: [-Math.PI * .92,
                    -Math.PI * .08], gravity: 460, life: [180,
                    420], size: [6.5,
                    2], alpha: 1, flow: 16
            })
        if (n >= 3) {
            void dustStream(ctx.layer,
                fuse,
                ms,
                6 + n * 2,
                {
                    puff: true, color: SMOKE, speed: [6,
                        30], gravity: -60, life: [420,
                        820], size: [18 + n * 3,
                        50 + n * 8], alpha: .44, flow: 18, additive: false
                })
        }
        await holdUntil(ctx,
            ms,
            frame)
    })

/** Bom gắn thêm: chạm là tia lửa gang và quầng nóng, lấp cú nhảy cỡ của quả bom */
registerVfx("tristanaBombAdd",
    async (ctx) => {
        const n = stacksOf(ctx)
        const size = bombSize(n)
        const at = bombSpot(ctx.from)
        await Promise.all([
            bloom(ctx.layer,
                at,
                FLAME,
                size * 3.2,
                240),
            bloom(ctx.layer,
                at,
                WHITE_HOT,
                size * 1.5,
                150),
            sparks(ctx.layer,
                at,
                50 + n * 14,
                .75,
                undefined,
                size * .34),
            shards(ctx.layer,
                at,
                6 + n,
                .4,
                size * .3)
        ])
    })

/** Vụ nổ theo số Bom: dùng chung cho kích nổ, tự nổ và R */
function blast(ctx: VfxCtx, at: Pt, n: number, scale = 1) {
    const layer = ctx.layer
    const s = blastScale(n) * scale
    const inside = () => ({
        x: at.x + rand(-60,
            60) * s, y: at.y + rand(-60,
            60) * s
    })
    const parts: Promise<unknown>[] = [
        soot(layer,
            at,
            300 * s,
            .46,
            Math.round(7 + 7 * s)),
        bloom(layer,
            at,
            FLAME,
            560 * s,
            380),
        bloom(layer,
            at,
            WHITE_HOT,
            280 * s,
            220),
        fire(layer,
            inside,
            0,
            0,
            {
                lut: BODY_LUT, aim: () => rand(0,
                    TAU), speed: [80 * s,
                    360 * s], gravity: -170, drag: 1.3, curl: 170, life: [340,
                    780], size: [74 * s,
                    26 * s], alpha: .62
            },
            Math.round(36 + 60 * s)),
        fire(layer,
            inside,
            0,
            0,
            {
                lut: CORE_LUT, aim: () => rand(0,
                    TAU), speed: [30 * s,
                    170 * s], curl: 120, life: [130,
                    280], size: [58 * s,
                    22 * s], alpha: .66
            },
            Math.round(14 + 22 * s)),
        sparks(layer,
            at,
            Math.round(60 + 200 * s),
            Math.max(.7,
                s),
            undefined,
            24 * s)
    ]
    if (n >= 4) {
        // mảnh gang bay ra sau chớp sáng và rải rộng, để không tụ thành hình sao giữa quầng trắng
        parts.push(wait(layer,
            110).then(() => shards(layer,
            at,
            Math.round(20 * s),
            Math.max(.9,
                s),
            62 * s)))
    }
    if (n >= 6) {
        // cột khói đen dựng thẳng lên, thứ làm 6 Bom khác hẳn 2 Bom ở cỡ nhỏ
        parts.push(dustStream(layer,
            () => ({
                x: at.x + rand(-34,
                    34) * s, y: at.y + rand(-30,
                    20) * s
            }),
            620,
            46,
            {
                puff: true, color: SMOKE, speed: [40,
                    180], angle: [-Math.PI * .62,
                    -Math.PI * .38], gravity: -90, life: [760,
                    1300], size: [80 * s,
                    220 * s], alpha: .4, flow: 22, additive: false
            }))
    }
    if (n >= MEGA_BOMBS) {
        // đủ lớn thì cả bàn rung: dãy nổ phụ quanh lá, sóng bụi quét ngang, than hồng rơi
        for (let i = 0; i < 6; i++) {
            const a = i / 6 * TAU + rand(-.3,
                .3)
            const d = rand(150,
                240)
            const near = {
                x: at.x + Math.cos(a) * d * 1.5, y: at.y + Math.sin(a) * d * .7
            }
            parts.push(bloom(layer,
                near,
                FLAME,
                420,
                340),
            fire(layer,
                () => near,
                0,
                0,
                {
                    lut: BODY_LUT, aim: () => rand(0,
                        TAU), speed: [70,
                        330], gravity: -160, drag: 1.2, curl: 150, spread: 52, life: [320,
                        720], size: [84,
                        30], alpha: .62
                },
                46),
            soot(layer,
                near,
                220,
                .5,
                7))
        }
        parts.push(bloom(layer,
            at,
            0xffffff,
            1300,
            260),
        dustBurst(layer,
            at,
            {
                puff: true, count: 42, color: ASH, speed: [500,
                    1100], angle: [-.32,
                    .32], drag: 3.2, flow: 26, life: [520,
                    1020], size: [80,
                    210], alpha: .4, additive: false, spread: 70
            }),
        dustBurst(layer,
            at,
            {
                puff: true, count: 42, color: ASH, speed: [500,
                    1100], angle: [Math.PI - .32,
                    Math.PI + .32], drag: 3.2, flow: 26, life: [520,
                    1020], size: [80,
                    210], alpha: .4, additive: false, spread: 70
            }),
        dustBurst(layer,
            at,
            {
                count: 240, color: SPARK, speed: [90,
                    520], angle: [-Math.PI,
                    0], gravity: 300, drag: 1, flow: 50, life: [900,
                    1700], size: [8,
                    2], alpha: 1, spread: 170
            }))
    }
    return Promise.all(parts)
}

/** Kích nổ, tự nổ: ctx.amount là số Bom, cỡ và độ rung tăng vọt theo số đó */
registerVfx("tristanaBombBlast",
    async (ctx) => {
        const n = stacksOf(ctx)
        ctx.shake(lerp(3,
            18,
            Math.min(1,
                n / 12)),
        n >= MEGA_BOMBS ? 620 : 240 + n * 26)
        await blast(ctx,
            bombSpot(ctx.from),
            n)
    })

/** Bấm kích nổ không tốn lá: đốm ngòi cháy chạy ngoằn ngoèo từ Tristana tới quả bom, chạm là báo nhịp */
registerVfx("tristanaFuse",
    async (ctx) => {
        const to = ctx.to[0] ?? ctx.from
        const end = bombSpot(to)
        const dx = end.x - ctx.from.x, dy = end.y - ctx.from.y
        const len = Math.hypot(dx,
            dy) || 1
        const nx = -dy / len, ny = dx / len
        const MS = 320
        let p = {
            ...ctx.from
        }
        const phase = rand(0,
            TAU)
        await Promise.all([
            dustStream(ctx.layer,
                () => p,
                MS,
                1000,
                {
                    color: SPARK, streak: 4.5, speed: [30,
                        190], gravity: 520, life: [180,
                        420], size: [8,
                        2.5], alpha: 1, flow: 18, spread: 6
                }),
            dustStream(ctx.layer,
                () => p,
                MS,
                90,
                {
                    puff: true, color: SMOKE, speed: [4,
                        24], gravity: -40, life: [380,
                        760], size: [20,
                        58], alpha: .5, flow: 16, additive: false
                }),
            dustStream(ctx.layer,
                () => p,
                MS,
                260,
                {
                    color: [WHITE_HOT,
                        0xffffff], speed: [2,
                        20], life: [90,
                        200], size: [16,
                        5], alpha: 1, flow: 4
                }),
            tween(MS,
                (t) => {
                    const side = Math.sin(t * 15 + phase) * 34 * Math.sin(t * Math.PI)
                    p = {
                        x: ctx.from.x + dx * t + nx * side, y: ctx.from.y + dy * t + ny * side
                    }
                },
                ease.inOut,
                ctx.layer).then(() => ctx.onBeat?.())
        ])
    })

/** Sát thương Bom đủ hạ: quả bom phồng lên, nóng trắng, rung bần bật rồi tự nổ; ctx.onBeat là khoảnh khắc nổ */
registerVfx("tristanaBombFuseUp",
    async (ctx) => {
        const n = stacksOf(ctx)
        const size = bombSize(n)
        const at = bombSpot(ctx.from)
        const MS = 340
        const halo = makeSprite(ctx.layer,
            "glow",
            at.x,
            at.y,
            RED_HOT,
            size * 3.4)
        const bomb = ironSprite(ctx.layer,
            true,
            size)
        const heat = makeSprite(ctx.layer,
            "glow",
            at.x,
            at.y,
            WHITE_HOT,
            size * 1.3)
        void dustStream(ctx.layer,
            () => at,
            MS,
            1000,
            {
                color: SPARK, streak: 5, speed: [120,
                    420], gravity: 420, life: [160,
                    360], size: [8,
                    2.5], alpha: 1, flow: 18, spread: size * .3
            })
        await tween(MS,
            (t) => {
                const w = size * (1 + t * t * .55)
                bomb.width = w
                bomb.height = w
                const shake = 2 + t * 9
                const x = at.x + rand(-shake,
                        shake), y = at.y + rand(-shake,
                        shake)
                bomb.position.set(x,
                    y)
                heat.position.set(x,
                    y)
                heat.alpha = .25 + t * .75 * (Math.sin(t * 34) * .5 + .5)
                heat.width = w * 1.3
                heat.height = w * 1.3
                halo.alpha = .35 + t * .65
            },
            ease.linear,
            ctx.layer)
        ctx.onBeat?.()
    })

/** Tướng mang chết: nửa số Bom bong ra, những quả bom nhỏ rơi khỏi lá và tắt ngòi. ctx.amount là số Bom rơi */
registerVfx("tristanaBombShed",
    async (ctx) => {
        const n = Math.min(8,
            stacksOf(ctx))
        const at = bombSpot(ctx.from)
        const MS = 860
        const bits = Array.from({
            length: n
        },
        () => {
            const a = rand(-Math.PI * .95,
                    -Math.PI * .05), v = rand(120,
                    300)
            return {
                s: ironSprite(ctx.layer,
                    true,
                    rand(30,
                        44)), vx: Math.cos(a) * v, vy: Math.sin(a) * v, spin: rand(-.2,
                    .2)
            }
        })
        await Promise.all([
            soot(ctx.layer,
                at,
                150,
                .46,
                7),
            sparks(ctx.layer,
                at,
                90,
                .7,
                undefined,
                26),
            tween(MS,
                (t) => {
                    const sec = t * MS / 1000
                    for (const b of bits) {
                        if (b.s.destroyed) continue
                        b.s.position.set(at.x + b.vx * sec,
                            at.y + b.vy * sec + 760 * sec * sec)
                        b.s.rotation += b.spin
                        b.s.alpha = Math.min(1,
                            (1 - t) * 3)
                    }
                },
                ease.linear,
                ctx.layer)
        ])
    })

/** Q trúng bản thân: nòng pháo bốc lửa, tia lửa và khí nóng phụt lên */
registerVfx("tristanaRapidFire",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                FLAME,
                420 * k,
                420),
            bloom(ctx.layer,
                ctx.from,
                WHITE_HOT,
                190 * k,
                240),
            fire(ctx.layer,
                () => ({
                    x: ctx.from.x + rand(-58,
                        58), y: ctx.from.y + rand(-20,
                        CARD_H * .7)
                }),
                420,
                520,
                {
                    lut: BODY_LUT, aim: () => -Math.PI / 2 + rand(-.3,
                        .3), speed: [120,
                        340], gravity: -260, curl: 130, life: [300,
                        620], size: [50,
                        16], alpha: .86
                },
                70),
            sparks(ctx.layer,
                ctx.from,
                220,
                1,
                [-Math.PI * .85,
                    -Math.PI * .15],
                44)
        ])
    })

/** Q đang bật: luồng nhiệt cuộn quanh lá Tristana tới khi tether nhả; tia lửa bay về phía ctx.to[0] */
registerVfx("tristanaRapidAura",
    async (ctx) => {
        const ms = ctx.tether ? TRISTANA_AURA_MS : 1000
        const front = ctx.to[0] ?? {
            x: ctx.from.x, y: ctx.from.y - 400
        }
        const dir = Math.atan2(front.y - ctx.from.y,
            front.x - ctx.from.x)
        const edge = () => ({
            x: ctx.from.x + rand(-62,
                62), y: ctx.from.y + rand(-CARD_H * .6,
                CARD_H * .9)
        })
        const glow = makeSprite(ctx.layer,
            "glow",
            ctx.from.x,
            ctx.from.y,
            FLAME,
            320)
        void fire(ctx.layer,
            edge,
            ms,
            130,
            {
                lut: BODY_LUT, aim: () => -Math.PI / 2 + rand(-.3,
                    .3), speed: [60,
                    190], gravity: -200, curl: 90, life: [260,
                    540], size: [32,
                    10], alpha: .72
            })
        void dustStream(ctx.layer,
            edge,
            ms,
            220,
            {
                color: SPARK, streak: 5, speed: [180,
                    460], angle: [dir - .26,
                    dir + .26], gravity: 120, drag: .4, life: [200,
                    420], size: [6,
                    2], alpha: 1, flow: 16
            })
        await holdUntil(ctx,
            ms,
            () => { glow.alpha = .3 + Math.sin(performance.now() * .014) * .1 })
    })

/** E: quả bom gai lăn vồng trên không, ngòi xì, khói bám theo; chạm là báo nhịp */
registerVfx("tristanaBombThrow",
    async (ctx) => {
        const to = bombSpot(ctx.to[0] ?? ctx.from)
        const start = ahead(ctx.from,
            to,
            CARD_H * .7)
        const MS = 420
        const bomb = ironSprite(ctx.layer,
            true,
            72)
        const glow = makeSprite(ctx.layer,
            "glow",
            start.x,
            start.y,
            RED_HOT,
            170)
        ctx.layer.setChildIndex(glow,
            0)
        let p = {
            ...start
        }
        void bloom(ctx.layer,
            start,
            FLAME,
            170,
            220)
        void soot(ctx.layer,
            start,
            90,
            .46,
            6)
        await Promise.all([
            dustStream(ctx.layer,
                () => p,
                MS,
                900,
                {
                    color: SPARK, streak: 4.5, speed: [40,
                        220], gravity: 480, life: [200,
                        460], size: [7,
                        2.2], alpha: 1, flow: 18, spread: 16
                }),
            dustStream(ctx.layer,
                () => p,
                MS,
                80,
                {
                    puff: true, color: SMOKE, speed: [4,
                        26], gravity: -36, life: [420,
                        800], size: [26,
                        74], alpha: .5, flow: 18, additive: false
                }),
            tween(MS,
                (t) => {
                    p = {
                        x: lerp(start.x,
                            to.x,
                            t), y: lerp(start.y,
                            to.y,
                            t) - Math.sin(t * Math.PI) * 130
                    }
                    if (bomb.destroyed) return
                    bomb.position.set(p.x,
                        p.y)
                    bomb.rotation = t * TAU * 1.6
                    if (!glow.destroyed) glow.position.set(p.x,
                        p.y)
                },
                ease.linear,
                ctx.layer).then(() => {
                bomb.visible = false
                glow.visible = false
                ctx.onBeat?.()
            })
        ])
    })

/** R mở màn: nòng đại bác tụ lửa, tia lửa hút vào miệng nòng, khói rỉ ra */
registerVfx("tristanaCannonCharge",
    async (ctx) => {
        const k = kOf(ctx)
        const to = ctx.to[0] ?? {
            x: ctx.from.x, y: ctx.from.y - 400
        }
        const muzzle = ahead(ctx.from,
            to,
            CARD_H * .7)
        const MS = 520
        const gather = () => {
            const a = rand(0,
                    TAU), r = rand(90,
                    190) * k
            return {
                x: muzzle.x + Math.cos(a) * r, y: muzzle.y + Math.sin(a) * r
            }
        }
        await Promise.all([
            bloom(ctx.layer,
                muzzle,
                RED_HOT,
                420 * k,
                MS),
            bloom(ctx.layer,
                muzzle,
                WHITE_HOT,
                200 * k,
                MS),
            soot(ctx.layer,
                ctx.from,
                170 * k,
                .42,
                7),
            dustStream(ctx.layer,
                gather,
                MS,
                560,
                {
                    color: SPARK, streak: 4, speed: [0,
                        0], life: [180,
                        320], size: [6,
                        2], alpha: 1, flow: 70
                }),
            fire(ctx.layer,
                () => muzzle,
                MS,
                300,
                {
                    lut: CORE_LUT, aim: () => rand(0,
                        TAU), speed: [30,
                        130], curl: 80, life: [120,
                        260], size: [34,
                        12], alpha: .8, spread: 22
                })
        ])
    })

/** R: phát đại bác rung cả bàn, quả đạn gang to kéo đuôi lửa thẳng vào mục tiêu; chạm là báo nhịp */
registerVfx("tristanaBusterShot",
    async (ctx) => {
        const k = kOf(ctx)
        const to = ctx.to[0] ?? ctx.from
        const start = ahead(ctx.from,
            to,
            CARD_H * .7)
        const dir = Math.atan2(to.y - start.y,
            to.x - start.x)
        const back = dir + Math.PI
        const MS = 300
        const SIZE = 104 * k
        ctx.shake(10,
            260)
        const ball = ironSprite(ctx.layer,
            false,
            SIZE)
        const glow = makeSprite(ctx.layer,
            "glow",
            start.x,
            start.y,
            FLAME,
            SIZE * 3.4)
        ctx.layer.setChildIndex(glow,
            0)
        let p = {
            ...start
        }
        void bloom(ctx.layer,
            start,
            WHITE_HOT,
            460 * k,
            240)
        void soot(ctx.layer,
            start,
            240 * k,
            .62,
            12)
        void fire(ctx.layer,
            () => start,
            0,
            0,
            {
                lut: BODY_LUT, aim: () => dir + rand(-.5,
                    .5), speed: [240,
                    760], drag: 2, curl: 120, life: [220,
                    460], size: [76 * k,
                    24], alpha: .82
            },
            80)
        void sparks(ctx.layer,
            start,
            180,
            1.3,
            [dir - .55,
                dir + .55],
            16)
        const body = () => ({
            x: p.x + rand(-SIZE,
                SIZE) * .32, y: p.y + rand(-SIZE,
                SIZE) * .32
        })
        await Promise.all([
            fire(ctx.layer,
                body,
                MS,
                1300,
                {
                    lut: BODY_LUT, aim: () => back + rand(-.24,
                        .24), speed: [160,
                        520], curl: 70, life: [190,
                        380], size: [70 * k,
                        20], alpha: .9
                }),
            fire(ctx.layer,
                body,
                MS,
                560,
                {
                    lut: CORE_LUT, aim: () => back + rand(-.16,
                        .16), speed: [100,
                        340], curl: 40, life: [100,
                        210], size: [46 * k,
                        16], alpha: .8
                }),
            dustStream(ctx.layer,
                () => p,
                MS,
                120,
                {
                    puff: true, color: SMOKE, speed: [6,
                        40], gravity: -40, life: [520,
                        960], size: [50 * k,
                        140 * k], alpha: .6, flow: 20, additive: false, spread: 24
                }),
            tween(MS,
                (t) => {
                    p = {
                        x: lerp(start.x,
                            to.x,
                            t), y: lerp(start.y,
                            to.y,
                            t)
                    }
                    if (ball.destroyed) return
                    ball.position.set(p.x,
                        p.y)
                    ball.rotation = t * TAU * 1.2
                    if (!glow.destroyed) glow.position.set(p.x,
                        p.y)
                },
                ease.in,
                ctx.layer).then(() => {
                ball.visible = false
                glow.visible = false
                ctx.onBeat?.()
            })
        ])
    })

/** R trúng: đạn đại bác kích nổ Bom trên mục tiêu; ctx.amount là số Bom, không Bom vẫn có cú nện */
registerVfx("tristanaBusterHit",
    async (ctx) => {
        const n = Math.max(3,
            Math.round(ctx.amount ?? 3))
        ctx.shake(18,
            640)
        await Promise.all([
            blast(ctx,
                ctx.from,
                n,
                1.15),
            wait(ctx.layer,
                110).then(() => shards(ctx.layer,
                ctx.from,
                44,
                1.4,
                80))
        ])
    })

/** R lan: từ mục tiêu chính, lưỡi lửa phóng tới từng tướng địch khác và nổ tại đó, cùng nhịp với cú trúng. ctx.amount là số Bom */
registerVfx("tristanaBlastSpread",
    async (ctx) => {
        const n = stacksOf(ctx)
        await Promise.all(ctx.to.map((to) => {
            const dir = Math.atan2(to.y - ctx.from.y,
                to.x - ctx.from.x)
            const reach = Math.hypot(to.x - ctx.from.x,
                to.y - ctx.from.y)
            return Promise.all([
                fire(ctx.layer,
                    () => ctx.from,
                    0,
                    0,
                    {
                        lut: BODY_LUT, aim: () => dir + rand(-.1,
                            .1), speed: [reach * 2.2,
                            reach * 3.6], drag: 1, curl: 60, life: [220,
                            340], size: [64,
                            34], alpha: .86, spread: 30
                    },
                    60),
                fire(ctx.layer,
                    () => ctx.from,
                    0,
                    0,
                    {
                        lut: CORE_LUT, aim: () => dir + rand(-.06,
                            .06), speed: [reach * 2.6,
                            reach * 3.6], curl: 30, life: [160,
                            270], size: [40,
                            20], alpha: .9, spread: 20
                    },
                    26),
                sparks(ctx.layer,
                    ctx.from,
                    70,
                    Math.max(1,
                        reach / 260),
                    [dir - .1,
                        dir + .1],
                    24),
                blast(ctx,
                    to,
                    Math.max(3,
                        n * .75))
            ])
        }))
    })
