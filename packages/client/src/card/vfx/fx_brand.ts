// VFX riêng của Brand, chất liệu LỬA thật: lưỡi lửa đổi màu theo tuổi hạt (trắng nóng -> vàng -> cam -> đỏ sẫm), than hồng, tro, khói đen, quầng nhiệt. Không dùng nét vẽ hình học.
// Tầng Bỏng truyền qua ctx.amount: số tầng càng cao lửa càng dày, càng cao.
import {
    Container, Particle, ParticleContainer, Texture, Ticker
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
const WHITE_HOT = 0xfff1c8
const AMBER = 0xffa52a
const ORANGE = 0xff5a10
const EMBER = [0xffe9a0,
    0xffb030,
    0xff6a14,
    0xff3c0a]
const SOOT = [0x120a08,
    0x1e120e,
    0x2a1a12]
const ASH = [0x5a504a,
    0x7a6c62,
    0x35302c]
/** Nửa bề rộng, nửa chiều cao lá tướng trên bàn */
const CARD_W = 60
const CARD_H = 104
/** Mỗi lần bám lửa kéo dài chừng này; bên gọi lặp lại theo nhịp này để lửa bám liên tục */
export const BRAND_AURA_MS = 1100
const UP: [number, number] = [-Math.PI * .64,
    -Math.PI * .36]
const ALL: [number, number] = [0,
    TAU]

/** Dải màu theo tuổi hạt, từ lúc sinh tới lúc tắt */
const HOT_RAMP = [0xfff6dc,
    0xffe28a,
    0xffb030,
    0xff6a14,
    0xc8260e,
    0x4a0c04]
const BODY_RAMP = [0xffd060,
    0xff9a20,
    0xff5a10,
    0xd42c08,
    0x7a1404,
    0x2a0602]
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
const HOT_LUT = makeLut(HOT_RAMP)
const BODY_LUT = makeLut(BODY_RAMP)

/** Lưỡi lửa: nhiều đốm mềm thuôn dần về đầu, viền không đều; trục dài nằm theo hướng bay */
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

/** Trần số lưỡi lửa đang sống; máy yếu thì bớt hạt như bộ bụi */
const MAX_FLAME = 7000
let liveFlame = 0
const quality = () => Math.max(.3,
    Math.min(1,
        (Ticker.shared.FPS - 25) / 30))

interface FlameOpts {
    /** Lõi nóng: bắt đầu từ trắng; mặc định thân lửa bắt đầu từ vàng cam */
    hot?: boolean;
    speed?: [number, number];
    angle?: [number, number];
    /** Âm là bốc lên */
    gravity?: number;
    drag?: number;
    /** Độ mạnh dao động ngang của lưỡi lửa (px/s) */
    curl?: number;
    life?: [number, number];
    size?: [number, number];
    alpha?: number;
    /** Bán kính rải điểm sinh */
    spread?: number;
    /** Rải thêm theo chiều ngang */
    wide?: number;
}
interface Flame { p: Particle; vx: number; vy: number; age: number; life: number; s0: number; s1: number; a: number; phase: number }

function spawn(host: ParticleContainer, tex: Texture, list: Flame[], pt: Pt, o: FlameOpts, lut: Uint32Array) {
    if (liveFlame >= MAX_FLAME || Math.random() > quality()) return
    const [sp0,
        sp1] = o.speed ?? [70,
        240]
    const [an0,
        an1] = o.angle ?? UP
    const [l0,
        l1] = o.life ?? [280,
        620]
    const [z0,
        z1] = o.size ?? [24,
        8]
    const ang = rand(an0,
        an1)
    const spd = rand(sp0,
        sp1)
    const r = Math.sqrt(Math.random()) * (o.spread ?? 0)
    const pa = rand(0,
        TAU)
    const k = rand(.6,
        1.35)
    const p = new Particle({
        texture: tex, anchorX: .4, anchorY: .5,
        x: pt.x + Math.cos(pa) * r + rand(-1,
            1) * (o.wide ?? 0),
        y: pt.y + Math.sin(pa) * r,
        tint: lut[0], alpha: 0, rotation: ang
    })
    host.addParticle(p)
    liveFlame++
    list.push({
        p, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, age: 0, life: rand(l0,
            l1),
        s0: z0 * k / tex.height, s1: z1 * k / tex.height, a: (o.alpha ?? .85) * rand(.6,
            1), phase: rand(0,
            TAU)
    })
}

function burnOut(layer: Container, host: ParticleContainer, list: Flame[], o: FlameOpts, lut: Uint32Array, more: (ms: number) => boolean): Promise<void> {
    return new Promise((resolve) => {
        let done = false
        let clock = rand(0,
            30)
        const finish = () => {
            if (done) return
            done = true
            Ticker.shared.remove(tick)
            layer.off("destroyed",
                finish)
            liveFlame = Math.max(0,
                liveFlame - list.length)
            list.length = 0
            if (!host.destroyed) host.destroy()
            resolve()
        }
        const gravity = o.gravity ?? -300
        const drag = o.drag ?? 1.5
        const curl = o.curl ?? 110
        const tick = (tk: Ticker) => {
            if (layer.destroyed || host.destroyed) { finish(); return }
            const dt = tk.deltaMS / 1000
            clock += dt
            const going = more(tk.deltaMS)
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
                    liveFlame--
                    removed = true
                    continue
                }
                const p = m.p
                m.vy += gravity * dt
                m.vx *= keep
                m.vy *= keep
                // lưỡi lửa uốn ngang nhanh hơn dòng bụi: tổng hai sóng lệch pha theo vị trí và thời gian
                const wx = Math.sin(p.y * .031 + clock * 6.1 + m.phase) + .6 * Math.sin((p.x + p.y) * .019 - clock * 4.3)
                const wy = Math.cos(p.x * .027 - clock * 5.2) * .35
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
                p.tint = lut[Math.min(LUT_SIZE - 1,
                    Math.floor(t * LUT_SIZE))]
                p.alpha = m.a * Math.min(1,
                    t * 11) * Math.pow(1 - t,
                    1.1)
            }
            if (removed) host.update()
            if (!list.length && !going) finish()
        }
        if (layer.destroyed) { finish(); return }
        layer.once("destroyed",
            finish)
        Ticker.shared.add(tick)
    })
}

function flameHost(layer: Container) {
    const tex = tongueTex()
    const host = new ParticleContainer({
        texture: tex,
        dynamicProperties: {
            position: true, vertex: true, rotation: true, color: true
        }
    })
    host.blendMode = "add"
    layer.addChild(host)
    return {
        tex, host
    }
}

/** Bùng một lần `count` lưỡi lửa */
function flameBurst(layer: Container, pt: Pt, count: number, o: FlameOpts): Promise<void> {
    if (layer.destroyed) return Promise.resolve()
    const {
        tex, host
    } = flameHost(layer)
    const lut = o.hot ? HOT_LUT : BODY_LUT
    const list: Flame[] = []
    for (let i = 0; i < count; i++) spawn(host,
        tex,
        list,
        pt,
        o,
        lut)
    return burnOut(layer,
        host,
        list,
        o,
        lut,
        () => false)
}

/** Lửa cháy liên tục tại getPt() */
function flameStream(layer: Container, getPt: () => Pt, ms: number, perSec: number, o: FlameOpts): Promise<void> {
    if (layer.destroyed) return Promise.resolve()
    const {
        tex, host
    } = flameHost(layer)
    const lut = o.hot ? HOT_LUT : BODY_LUT
    const list: Flame[] = []
    let el = 0
    let acc = 0
    return burnOut(layer,
        host,
        list,
        o,
        lut,
        (d) => {
            if (el >= ms) return false
            el += d
            acc += d / 1000 * perSec
            while (acc >= 1) {
                acc -= 1
                spawn(host,
                    tex,
                    list,
                    getPt(),
                    o,
                    lut)
            }
            return el < ms
        })
}

const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
/** Số tầng Bỏng thành độ mạnh lửa: tăng rõ ở vài tầng đầu, không phình vô hạn */
const heatOf = (ctx: VfxCtx) => Math.sqrt(Math.max(.5,
    Math.min(16,
        ctx.amount ?? 1)))

/** Khói đen bốc lên, phủ dưới lửa để lửa nổi trên bàn sáng */
const soot = (layer: Container, pt: Pt, size: number, alpha = .5) => mist(layer,
    pt,
    {
        color: SOOT, size, alpha, additive: false, gravity: -70, life: [700,
            1300], speed: [10,
            60], count: 14
    })

/** Than hồng bay lên, uốn theo luồng nóng */
const emberBurst = (layer: Container, pt: Pt, count: number, power = 1, spread = 40) => dustBurst(layer,
    pt,
    {
        count, color: EMBER, speed: [40 * power,
            300 * power], angle: ALL, gravity: -210, drag: 1.1, flow: 95, life: [520,
            1250], size: [5,
            1.2], alpha: 1, spread
    })

/** Tro xám nhẹ trôi lên rồi tan */
const ashFall = (layer: Container, pt: Pt, count: number, spread: number) => dustBurst(layer,
    pt,
    {
        count, color: ASH, speed: [10,
            70], angle: ALL, gravity: -36, drag: 1, flow: 46, life: [800,
            1500], size: [4.5,
            2], alpha: .85, spread, additive: false
    })

/** Ngọn lửa liếm lên tại getPt: khói dưới, thân cam, lõi trắng, than hồng bên trên */
function blaze(layer: Container, at: () => Pt, ms: number, rate: number, scale: number) {
    return Promise.all([
        dustStream(layer,
            at,
            ms,
            rate * .05,
            {
                puff: true, color: SOOT, speed: [10,
                    60], angle: UP, gravity: -90, life: [500,
                    900], size: [46 * scale,
                    120 * scale], alpha: .34, flow: 24, additive: false
            }),
        flameStream(layer,
            at,
            ms,
            rate,
            {
                speed: [90 * scale,
                    270 * scale], life: [300,
                    640], size: [30 * scale,
                    9 * scale], gravity: -320, curl: 115, alpha: .8
            }),
        flameStream(layer,
            at,
            ms,
            rate * .3,
            {
                hot: true, speed: [60 * scale,
                    190 * scale], life: [170,
                    360], size: [22 * scale,
                    7 * scale], gravity: -260, curl: 70, alpha: .9
            }),
        dustStream(layer,
            at,
            ms,
            rate * .24,
            {
                color: EMBER, speed: [50,
                    220], angle: UP, gravity: -190, drag: 1, flow: 90, life: [420,
                    980], size: [4.5,
                    1.2], alpha: 1
            })
    ])
}

/** Quả cầu lửa bay: quầng nhiệt, lõi trắng, đuôi lửa, than và khói; chạm mục tiêu là báo nhịp trúng */
async function fireball(ctx: VfxCtx, to: Pt, ms: number, radius: number) {
    let p = {
        ...ctx.from
    }
    const h = Math.min(90,
        Math.hypot(to.x - ctx.from.x,
            to.y - ctx.from.y) * .14)
    const heat = makeSprite(ctx.layer,
        "glow",
        p.x,
        p.y,
        ORANGE,
        radius * 6)
    const core = () => ({
        x: p.x + rand(-1,
            1) * radius * .6, y: p.y + rand(-1,
            1) * radius * .6
    })
    await Promise.all([
        dustStream(ctx.layer,
            () => p,
            ms,
            70,
            {
                puff: true, color: SOOT, speed: [6,
                    30], gravity: -80, life: [380,
                    720], size: [radius * 1.8,
                    radius * 4.4], alpha: .36, flow: 20, additive: false
            }),
        flameStream(ctx.layer,
            core,
            ms,
            760,
            {
                speed: [30,
                    130], angle: ALL, life: [220,
                    460], size: [radius * 1.25,
                    radius * .4], gravity: -220, curl: 90, alpha: .8
            }),
        flameStream(ctx.layer,
            core,
            ms,
            620,
            {
                hot: true, speed: [10,
                    60], angle: ALL, life: [110,
                    220], size: [radius * 1.05,
                    radius * .4], gravity: -60, curl: 30, alpha: .95
            }),
        dustStream(ctx.layer,
            core,
            ms,
            240,
            {
                color: EMBER, speed: [20,
                    120], gravity: -160, life: [360,
                    820], size: [5,
                    1.2], alpha: 1, flow: 80
            }),
        tween(ms,
            (t) => {
                p = {
                    x: lerp(ctx.from.x,
                        to.x,
                        t), y: lerp(ctx.from.y,
                        to.y,
                        t) - Math.sin(t * Math.PI) * h
                }
                heat.position.set(p.x,
                    p.y)
            },
            ease.in,
            ctx.layer).then(() => {
            heat.visible = false
            ctx.onBeat?.()
        })
    ])
}

/** Hàng mục tiêu: lấy từ `to`, không có thì suy từ phía đối diện caster */
function rowOf(ctx: VfxCtx) {
    const W = ctx.app.screen.width, H = ctx.app.screen.height
    const xs = ctx.to.map(p => p.x)
    return {
        x0: (xs.length ? Math.min(...xs) : W * .24) - 70,
        x1: (xs.length ? Math.max(...xs) : W * .76) + 70,
        y: ctx.to.length ? ctx.to.reduce((sum, p) => sum + p.y,
            0) / ctx.to.length : H - ctx.from.y
    }
}

/** Chân các ngọn lửa trên một lá, lệch nhau để lửa thành từng lưỡi chứ không thành khối vuông */
const TONGUES = [-.78,
    -.3,
    .16,
    .62]
/** Đáy lá tướng: lửa mọc từ đây lên, dày ở chân, thưa và thu hẹp dần lên đỉnh */
function cardBase(at: Pt, reach = 1): Pt {
    const up = Math.pow(Math.random(),
        1.7)
    const narrow = 1 - up * .55
    return {
        x: at.x + (pick(TONGUES) * narrow + rand(-.2,
            .2)) * CARD_W,
        y: at.y + CARD_H - up * CARD_H * 1.7 * reach
    }
}

/** Q mở màn: lửa cuộn lên quanh tay Brand */
registerVfx("brandIgnite",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ORANGE,
                240 * k,
                360),
            flameStream(ctx.layer,
                () => cardBase(ctx.from,
                    .7),
                220,
                420,
                {
                    speed: [80,
                        240], life: [140,
                        280], size: [26 * k,
                        8 * k], gravity: -320
                }),
            flameStream(ctx.layer,
                () => cardBase(ctx.from,
                    .5),
                220,
                240,
                {
                    hot: true, speed: [60,
                        170], life: [110,
                        220], size: [20 * k,
                        6 * k], gravity: -240
                })
        ])
    })

/** Q: cầu lửa lớn bay tới mục tiêu */
registerVfx("brandFireball",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all((ctx.to.length ? ctx.to : [ctx.from]).map((to) => fireball(ctx,
            to,
            460,
            25 * k)))
    })

/** Q trúng: cầu lửa vỡ tung trên lá, lửa liếm lên, than và tro bay */
registerVfx("brandSear",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(5,
            220)
        await Promise.all([
            soot(ctx.layer,
                ctx.from,
                190 * k),
            bloom(ctx.layer,
                ctx.from,
                ORANGE,
                340 * k,
                340),
            bloom(ctx.layer,
                ctx.from,
                WHITE_HOT,
                170 * k,
                220),
            flameBurst(ctx.layer,
                ctx.from,
                250,
                {
                    speed: [190,
                        560], angle: ALL, life: [240,
                        620], size: [38 * k,
                        10 * k], gravity: -340, drag: 2.2, curl: 110, spread: 40 * k
                }),
            flameBurst(ctx.layer,
                ctx.from,
                80,
                {
                    hot: true, speed: [130,
                        340], angle: ALL, life: [140,
                        320], size: [30 * k,
                        8 * k], gravity: -220, drag: 2.4, curl: 60, spread: 30 * k
                }),
            emberBurst(ctx.layer,
                ctx.from,
                300,
                1.1,
                30 * k),
            ashFall(ctx.layer,
                ctx.from,
                70,
                70 * k)
        ])
    })

/** Q đủ Bỏng: Choáng cùng nhịp, cột tia trắng nóng phụt thẳng lên từ lá */
registerVfx("brandStunFlare",
    async (ctx) => {
        const k = kOf(ctx)
        const head = {
            x: ctx.from.x, y: ctx.from.y - CARD_H * .7
        }
        await Promise.all([
            bloom(ctx.layer,
                head,
                WHITE_HOT,
                260 * k,
                300),
            flameBurst(ctx.layer,
                ctx.from,
                300,
                {
                    hot: true, speed: [320,
                        900], angle: [-Math.PI * .55,
                        -Math.PI * .45], life: [200,
                        420], size: [30 * k,
                        6 * k], gravity: -500, drag: 2, curl: 50, wide: 36 * k
                }),
            dustBurst(ctx.layer,
                head,
                {
                    count: 220, color: [WHITE_HOT,
                        0xffe9a0,
                        AMBER], speed: [120,
                        520], angle: [-Math.PI * .9,
                        -Math.PI * .1], gravity: 200, drag: 1.6, flow: 40, life: [320,
                        760], size: [4.5,
                        1], alpha: 1, streak: 5, spread: 22 * k
                })
        ])
    })

/** E: bức lửa tràn từ Brand sang, mở rộng rồi phủ cả hàng địch; chạm hàng là báo nhịp trúng */
registerVfx("brandFireWash",
    async (ctx) => {
        const k = kOf(ctx)
        const row = rowOf(ctx)
        const start = ctx.from.y
        const toward = row.y < start ? -1 : 1
        const heading = toward < 0 ? -Math.PI / 2 : Math.PI / 2
        const ms = 620
        let u = 0
        let clock = 0
        const front = (depth: number) => () => {
            const half = lerp(130,
                (row.x1 - row.x0) / 2,
                u)
            const x = lerp(ctx.from.x,
                (row.x0 + row.x1) / 2,
                u) + rand(-1,
                1) * half
            const lick = Math.sin(x * .017 + clock * 9) * 18 + Math.sin(x * .041 - clock * 13) * 9
            return {
                x, y: lerp(start,
                    row.y,
                    u) + lick - toward * rand(0,
                    depth)
            }
        }
        await Promise.all([
            dustStream(ctx.layer,
                front(170),
                ms,
                230,
                {
                    puff: true, color: SOOT, speed: [10,
                        60], angle: UP, gravity: -80, life: [520,
                        920], size: [80 * k,
                        210 * k], alpha: .42, flow: 26, additive: false
                }),
            flameStream(ctx.layer,
                front(150),
                ms,
                3600,
                {
                    speed: [120 * k,
                        360 * k], angle: [heading - .7,
                        heading + .7], life: [280,
                        560], size: [44 * k,
                        12 * k], gravity: -260, drag: 1.4, curl: 120, alpha: .72
                }),
            flameStream(ctx.layer,
                front(36),
                ms,
                1000,
                {
                    hot: true, speed: [90 * k,
                        260 * k], angle: [heading - .5,
                        heading + .5], life: [160,
                        340], size: [34 * k,
                        10 * k], gravity: -200, drag: 1.6, curl: 80, alpha: .82
                }),
            dustStream(ctx.layer,
                front(120),
                ms,
                1300,
                {
                    color: EMBER, speed: [60,
                        300], angle: [heading - 1,
                        heading + 1], gravity: -190, drag: 1, flow: 90, life: [420,
                        1000], size: [5,
                        1.2], alpha: 1
                }),
            tween(ms,
                (t) => {
                    u = t
                    clock = t * .9
                },
                ease.linear,
                ctx.layer).then(() => {
                ctx.shake(6,
                    260)
                ctx.onBeat?.()
            })
        ])
    })

/** E trúng từng tướng: lửa bùng thẳng lên khắp lá */
registerVfx("brandWashHit",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            soot(ctx.layer,
                ctx.from,
                170 * k,
                .42),
            bloom(ctx.layer,
                ctx.from,
                ORANGE,
                260 * k,
                320),
            blaze(ctx.layer,
                () => cardBase(ctx.from),
                300,
                640,
                k),
            emberBurst(ctx.layer,
                ctx.from,
                170,
                .9,
                60 * k),
            ashFall(ctx.layer,
                ctx.from,
                40,
                70 * k)
        ])
    })

/** R mở màn và cú nổ: khói phủ hàng địch, lửa xoắn tụ lại rồi nổ tung một nhịp */
registerVfx("brandFirestorm",
    async (ctx) => {
        const k = kOf(ctx)
        const row = rowOf(ctx)
        const center = {
            x: (row.x0 + row.x1) / 2, y: row.y
        }
        const half = (row.x1 - row.x0) / 2
        const ms = 780
        let u = 0
        // lửa cuộn thành đám không đều, co dần về giữa hàng rồi nổ; tổng hai số ngẫu nhiên để dày ở giữa, không có mép
        const mass = () => {
            const reach = lerp(half,
                half * .3,
                u * u)
            return {
                x: center.x + (rand(-1,
                    1) + rand(-1,
                    1)) * .55 * reach,
                y: center.y + (rand(-1,
                    1) + rand(-1,
                    1)) * lerp(70,
                    46,
                    u)
            }
        }
        const overcast = () => ({
            x: rand(row.x0,
                row.x1), y: row.y + rand(-110,
                90)
        })
        const span = () => ({
            x: center.x + (rand(-1,
                1) + rand(-1,
                1)) * .55 * half,
            y: row.y + (rand(-1,
                1) + rand(-1,
                1)) * 60
        })
        const gather = Promise.all([
            dustStream(ctx.layer,
                overcast,
                ms,
                42,
                {
                    puff: true, color: SOOT, speed: [6,
                        40], gravity: -30, life: [800,
                        1400], size: [120 * k,
                        250 * k], alpha: .55, flow: 20, additive: false
                }),
            blaze(ctx.layer,
                () => cardBase(ctx.from),
                ms - 180,
                520,
                k * .9),
            flameStream(ctx.layer,
                mass,
                ms,
                900,
                {
                    speed: [40,
                        220], life: [240,
                        520], size: [40 * k,
                        10 * k], gravity: -280, curl: 130, alpha: .55
                }),
            dustStream(ctx.layer,
                mass,
                ms,
                1100,
                {
                    color: EMBER, speed: [20,
                        160], gravity: -120, life: [320,
                        760], size: [5,
                        1.2], alpha: 1, flow: 120
                }),
            tween(ms,
                (t) => { u = t },
                ease.in,
                ctx.layer)
        ])
        await tween(ms,
            () => {},
            ease.linear,
            ctx.layer)
        ctx.shake(14,
            640)
        ctx.onBeat?.()
        await Promise.all([
            gather,
            bloom(ctx.layer,
                center,
                ORANGE,
                1100 * k,
                560),
            flameStream(ctx.layer,
                span,
                300,
                1700,
                {
                    speed: [200,
                        720], angle: [-Math.PI * .8,
                        -Math.PI * .2], life: [320,
                        700], size: [50 * k,
                        12 * k], gravity: -420, drag: 1.3, curl: 130, alpha: .6
                }),
            flameStream(ctx.layer,
                span,
                200,
                520,
                {
                    hot: true, speed: [120,
                        420], angle: UP, life: [160,
                        320], size: [34 * k,
                        9 * k], gravity: -320, drag: 1.5, curl: 80, alpha: .7
                }),
            dustBurst(ctx.layer,
                center,
                {
                    count: 1500, color: EMBER, speed: [120,
                        900], angle: ALL, gravity: -170, drag: 1.3, flow: 110, life: [620,
                        1500], size: [6,
                        1.3], alpha: 1, spread: half * .8
                }),
            ashFall(ctx.layer,
                center,
                260,
                half)
        ])
    })

/** R trúng từng tướng: cột lửa dày theo số tầng Bỏng */
registerVfx("brandStormHit",
    async (ctx) => {
        const k = kOf(ctx)
        const heat = heatOf(ctx)
        await Promise.all([
            soot(ctx.layer,
                ctx.from,
                150 * k,
                .4),
            blaze(ctx.layer,
                () => cardBase(ctx.from,
                    .6 + heat * .22),
                460,
                220 + heat * 170,
                (.8 + heat * .22) * k),
            emberBurst(ctx.layer,
                ctx.from,
                Math.round(120 + heat * 110),
                1.25,
                60 * k)
        ])
    })

/** Nội tại: than hồng và lửa nhỏ bám lá tướng, lớn dần theo số tầng Bỏng (ctx.amount) */
registerVfx("brandBurnAura",
    async (ctx) => {
        const heat = heatOf(ctx)
        const reach = Math.min(1,
            .32 + heat * .2)
        const at = () => cardBase(ctx.from,
            reach)
        const size = .46 + heat * .16
        await Promise.all([
            heat > 1.8 ? dustStream(ctx.layer,
                at,
                BRAND_AURA_MS,
                heat * 9,
                {
                    puff: true, color: SOOT, speed: [10,
                        50], angle: UP, gravity: -70, life: [440,
                        800], size: [34,
                        90], alpha: .26, flow: 20, additive: false
                }) : Promise.resolve(),
            flameStream(ctx.layer,
                at,
                BRAND_AURA_MS,
                heat * 90,
                {
                    speed: [50,
                        170], life: [240,
                        480], size: [28 * size,
                        8 * size], gravity: -240, curl: 80, alpha: .74
                }),
            flameStream(ctx.layer,
                at,
                BRAND_AURA_MS,
                heat * 40,
                {
                    hot: true, speed: [30,
                        110], life: [130,
                        260], size: [20 * size,
                        6 * size], gravity: -170, curl: 50, alpha: .82
                }),
            dustStream(ctx.layer,
                () => cardBase(ctx.from),
                BRAND_AURA_MS,
                heat * 70,
                {
                    color: EMBER, speed: [14,
                        70], angle: UP, gravity: -110, drag: 1, flow: 54, life: [400,
                        820], size: [4.6,
                        1.3], alpha: 1
                })
        ])
    })

/** Nội tại: Bỏng cháy đầu lượt người mang, lửa bùng tại chính nạn nhân theo số tầng (ctx.amount) */
registerVfx("brandBurnTick",
    async (ctx) => {
        const heat = heatOf(ctx)
        await Promise.all([
            soot(ctx.layer,
                ctx.from,
                120 + heat * 26,
                .36),
            bloom(ctx.layer,
                ctx.from,
                ORANGE,
                170 + heat * 60,
                300),
            blaze(ctx.layer,
                () => cardBase(ctx.from,
                    .55 + heat * .18),
                260,
                230 + heat * 120,
                .72 + heat * .2),
            emberBurst(ctx.layer,
                ctx.from,
                Math.round(60 + heat * 50),
                .8,
                50)
        ])
    })

/** Luật chết: người mang gục, nửa số Bỏng tản ra; ctx.amount là số tầng mất */
registerVfx("brandBurnShed",
    async (ctx) => {
        const heat = heatOf(ctx)
        const count = Math.round(180 + heat * 150)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                AMBER,
                220 + heat * 40,
                340),
            flameBurst(ctx.layer,
                ctx.from,
                Math.round(100 + heat * 60),
                {
                    speed: [160,
                        560], angle: ALL, life: [200,
                        440], size: [26,
                        6], gravity: -120, drag: 2.2, curl: 70, spread: 40
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count, color: EMBER, speed: [220,
                        780], angle: ALL, gravity: -60, drag: .9, flow: 70, life: [620,
                        1300], size: [5.5,
                        1.2], alpha: 1, spread: 56, streak: 3
                }),
            ashFall(ctx.layer,
                ctx.from,
                90,
                80)
        ])
    })
