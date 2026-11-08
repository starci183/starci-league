// VFX riêng của Rumble theo LMHT: vòi lửa cam từ miệng ống đồng, khiên đĩa đồng tán đinh có sét xanh, tên lửa thân ô liu mũi đồng để lại lửa cháy trên đất. Hạt mềm, tia lửa kim loại, mảnh sắt, khói dầu; không dùng nét vẽ hình học.
// Rumble chưa có trong engine: tên hiệu ứng gom ở RUMBLE_VFX (heroMap.ts). Mọi hiệu ứng chỉ dùng VfxCtx, tự dọn khi layer bị huỷ; ctx.onBeat báo đúng lúc chạm mục tiêu.
import {
    Assets, Container, Particle, ParticleContainer, Sprite, Texture, Ticker
} from "pixi.js"
import {
    bloom, dustBurst, dustStream, mist, type DustOpts
} from "./fx_dust"
import {
    ease, lerp, makeSprite, pick, rand, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const TAU = Math.PI * 2
const RUST = [0xb5521c,
    0xc98a4a,
    0x8a5a2b,
    0xd9a066]
const STEEL = [0x8f979e,
    0x6f767c,
    0xb7bec4,
    0x565c62]
const SCRAP = [...RUST,
    ...STEEL]
const SPARK = [0xfff1c8,
    0xffd060,
    0xffb030,
    0xff8a1c]
const OIL = [0x0a0808,
    0x14100e,
    0x241c18,
    0x342a24]
const FLAME = 0xff8a24
/** Sét xanh của Scrap Shield và Electro Harpoon trong LMHT */
const ELECTRIC = [0xe8fbff,
    0xa8ecff,
    0x4fc8ff,
    0x1f8cf0]
const VOLT = 0x4fc8ff
/** Nửa bề rộng, nửa chiều cao lá tướng trên bàn */
const CARD_W = 60
const CARD_H = 104
const JET_MS = 820
/** Lửa chạm hàng địch sau chừng này kể từ lúc phun */
const JET_HIT = 300
const LUT_SIZE = 48
const MAX_FIRE = 6000
let liveFire = 0

const points = (ctx: VfxCtx) => ctx.to.length ? ctx.to : [ctx.from]
const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
const wait = (layer: Container, ms: number) => tween(ms,
    () => {},
    ease.linear,
    layer)
const quality = () => Math.max(.3,
    Math.min(1,
        (Ticker.shared.FPS - 25) / 30))
/** Điểm cách a đúng d px theo hướng tới b */
function ahead(a: Pt, b: Pt, d: number): Pt {
    const len = Math.hypot(b.x - a.x,
        b.y - a.y) || 1
    return {
        x: a.x + (b.x - a.x) / len * d, y: a.y + (b.y - a.y) / len * d
    }
}
/** Nhịp trúng chỉ báo một lần dù hiệu ứng có nhiều mũi */
function beatOnce(ctx: VfxCtx) {
    let fired = false
    return () => {
        if (fired) return
        fired = true
        ctx.onBeat?.()
    }
}

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
/** Lõi vòi phun: trắng nóng rồi vàng, cam, đỏ sẫm */
const CORE_LUT = makeLut([0xfff4d8,
    0xffdc80,
    0xffa030,
    0xff6212,
    0xb8300c,
    0x3a0f06])
/** Thân lửa dầu: cam đục, tắt thành nâu khói */
const BODY_LUT = makeLut([0xffb040,
    0xff7a18,
    0xd8400c,
    0x8a2408,
    0x3a1408,
    0x120806])

/** Lưỡi lửa: nhiều đốm mềm thuôn dần về đầu, viền không đều */
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
    /** Góc bay của từng lưỡi lửa */
    aim: () => number;
    speed: [number, number];
    life: [number, number];
    size: [number, number];
    alpha?: number;
    gravity?: number;
    drag?: number;
    /** Độ mạnh dao động ngang (px/s) */
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

/** Tia lửa kim loại: vệt sáng ngắn, văng mạnh rồi rơi */
const sparks = (layer: Container, pt: Pt, count: number, power = 1, angle?: [number, number], spread = 12) => dustBurst(layer,
    pt,
    {
        count, color: SPARK, streak: 5, speed: [160 * power,
            640 * power], angle, gravity: 720, drag: .9, flow: 22, life: [260,
            680], size: [8,
            2.5], alpha: 1, spread
    })
/** Mảnh sắt sắc cạnh, tối màu nên nổi trên bàn sáng */
const shards = (layer: Container, pt: Pt, count: number, power = 1, angle?: [number, number], spread = 14) => dustBurst(layer,
    pt,
    {
        count, color: SCRAP, blade: true, speed: [120 * power,
            640 * power], angle, gravity: 640, drag: .9, flow: 10, life: [520,
            1050], size: [42,
            18], alpha: 1, spread, additive: false
    })
/** Khói dầu đen cuộn lên */
const soot = (layer: Container, pt: Pt, size: number, alpha = .6, count = 12) => mist(layer,
    pt,
    {
        color: OIL, size, alpha, count, additive: false, gravity: -80, life: [720,
            1350], speed: [10,
            70]
    })
const rustFlakes = (layer: Container, pt: Pt, count: number, spread = 40) => dustBurst(layer,
    pt,
    {
        count, color: RUST, speed: [30,
            220], gravity: 340, drag: 1.1, flow: 40, life: [420,
            980], size: [5,
            2], alpha: 1, spread, additive: false
    })

const loadIcon = async (src?: string): Promise<Texture | null> => {
    if (!src) return null
    try {
        return await Assets.load<Texture>(src)
    } catch {
        return null
    }
}

interface ArcStep { p: Pt; a: number }
/** Sét không vẽ nét: một chuỗi vệt sáng ngắn nối đuôi, đổi hướng từng bước; hết tia thì mở tia mới từ start() */
function crackle(layer: Container, start: () => ArcStep, ms: number, rate: number, steps = 7) {
    let cur = start()
    let seg = cur.a
    let left = steps
    const opt: DustOpts = {
        color: ELECTRIC, streak: 5, speed: [1,
            4], life: [80,
            190], size: [4.5,
            2.5], alpha: 1, flow: 0, drag: 0,
        get angle(): [number, number] {
            return [seg,
                seg]
        }
    }
    const at = () => {
        if (left-- <= 0) {
            cur = start()
            seg = cur.a
            left = steps
            return cur.p
        }
        seg = cur.a + rand(-1,
            1)
        cur = {
            p: {
                x: cur.p.x + Math.cos(seg) * 17, y: cur.p.y + Math.sin(seg) * 17
            }, a: cur.a + rand(-.3,
                .3)
        }
        return cur.p
    }
    return dustStream(layer,
        at,
        ms,
        rate,
        opt)
}
/** Tia sét toả lộn xộn quanh tâm: bán kính và hướng lệch nhiều để không thành vòng tròn */
const shell = (c: Pt, rx: number, ry: number) => (): ArcStep => {
    const a = rand(0,
        TAU)
    const r = rand(.45,
        1.3)
    return {
        p: {
            x: c.x + Math.cos(a) * rx * r, y: c.y + Math.sin(a) * ry * r
        }, a: a + rand(-1.9,
            1.9)
    }
}

/** Mảnh phế liệu thật: khối thép méo, cạnh không đều, có vết xước; tô màu bằng tint */
function chunkTexture(): Texture {
    const S = 64
    const c = document.createElement("canvas")
    c.width = S
    c.height = S
    const g = c.getContext("2d")
    if (g) {
        const n = 6 + Math.floor(rand(0,
            4))
        g.beginPath()
        for (let i = 0; i < n; i++) {
            const a = i / n * TAU + rand(-.2,
                .2)
            const r = S * .47 * rand(.42,
                1)
            g.lineTo(S / 2 + Math.cos(a) * r,
                S / 2 + Math.sin(a) * r * .66)
        }
        g.closePath()
        const grad = g.createLinearGradient(0,
            0,
            S,
            S)
        grad.addColorStop(0,
            "#fff")
        grad.addColorStop(.5,
            "#a8a8a8")
        grad.addColorStop(1,
            "#4c4c4c")
        g.fillStyle = grad
        g.fill()
        g.save()
        g.clip()
        g.strokeStyle = "rgba(0,0,0,.42)"
        for (let i = 0; i < 6; i++) {
            g.lineWidth = rand(.8,
                2.4)
            g.beginPath()
            g.moveTo(rand(0,
                S),
            rand(0,
                S))
            g.lineTo(rand(0,
                S),
            rand(0,
                S))
            g.stroke()
        }
        g.restore()
    }
    return Texture.from(c)
}
let chunkTexes: Texture[] | undefined
function chunk(layer: Container, size: number): Sprite {
    const s = new Sprite(pick(chunkTexes ??= [chunkTexture(),
        chunkTexture(),
        chunkTexture(),
        chunkTexture(),
        chunkTexture()]))
    s.anchor.set(.5)
    s.width = size
    s.height = size
    s.tint = pick(SCRAP)
    s.rotation = rand(0,
        TAU)
    layer.addChild(s)
    return s
}
const clear = (list: Sprite[]) => {
    for (const s of list) if (!s.destroyed) s.destroy()
}

/** Vài khối sắt văng ra rồi rơi xuống */
function flingChunks(layer: Container, pt: Pt, count: number, power = 1) {
    const MS = 760
    const bits = Array.from({
        length: count
    },
    () => {
        const a = rand(0,
                TAU), v = rand(160,
                520) * power
        return {
            s: chunk(layer,
                rand(16,
                    34)), vx: Math.cos(a) * v, vy: Math.sin(a) * v, spin: rand(-14,
                14)
        }
    })
    return tween(MS,
        (t) => {
            const sec = t * MS / 1000
            for (const b of bits) {
                if (b.s.destroyed) continue
                b.s.position.set(pt.x + b.vx * sec,
                    pt.y + b.vy * sec + 620 * sec * sec)
                b.s.rotation += b.spin * .016
                b.s.alpha = Math.min(1,
                    (1 - t) * 3)
            }
        },
        ease.linear,
        layer).then(() => clear(bits.map((b) => b.s)))
}

/** Khiên phế liệu: khối sắt thật lượn quanh tâm thành đám mảnh vụn. Mỗi cụm có bán kính dao động riêng và hạt bay lệch hướng để không vẽ thành vòng tròn */
function scrapOrbit(layer: Container, c: () => Pt, ms: number, k: number, opts: { rx?: number; ry?: number; turns?: number; clumps?: number; gather?: boolean; fade?: boolean; bits?: number; bitSize?: number } = {
}) {
    const rx = (opts.rx ?? 112) * k
    const ry = (opts.ry ?? 136) * k
    const turns = opts.turns ?? 1.5
    const clumps = opts.clumps ?? 6
    const count = opts.bits ?? 16
    let t = 0
    const openAt = () => opts.gather ? lerp(2,
        1,
        Math.min(1,
            t * 2.4)) : 1
    const streams = Array.from({
        length: clumps
    },
    (_, i) => {
        const phase = i / clumps * TAU + rand(-.4,
            .4)
        const reach = rand(.5,
            1.32)
        const swell = rand(0,
            TAU)
        const angleNow = () => phase + t * TAU * turns
        const at = () => {
            const c0 = c()
            const a = angleNow()
            const r = reach * openAt() * (1 + Math.sin(t * 13 + swell) * .3)
            return {
                x: c0.x + Math.cos(a) * rx * r + rand(-26,
                    26), y: c0.y + Math.sin(a) * ry * r + rand(-26,
                    26)
            }
        }
        const opt: DustOpts = {
            blade: true, color: SCRAP, size: [30,
                16], speed: [110,
                240], life: [160,
                340], alpha: 1, flow: 0, drag: 0, additive: false,
            get angle(): [number, number] {
                const a = angleNow() + Math.PI / 2
                return [a - .9,
                    a + .9]
            }
        }
        return Promise.all([
            dustStream(layer,
                at,
                ms,
                120,
                opt),
            dustStream(layer,
                at,
                ms,
                60,
                {
                    color: SPARK, streak: 5, speed: [40,
                        190], gravity: 520, life: [180,
                        420], size: [7,
                        2.5], alpha: 1, flow: 18
                })
        ])
    })
    const bits = Array.from({
        length: count
    },
    (_, i) => ({
        s: chunk(layer,
            rand(.65,
                1.4) * (opts.bitSize ?? 46)), phase: i / count * TAU + rand(-.3,
            .3), reach: rand(.55,
            1.36), speed: rand(.7,
            1.3), spin: rand(-.3,
            .3), wob: rand(0,
            TAU)
    }))
    const place = () => {
        const c0 = c()
        for (const b of bits) {
            if (b.s.destroyed) continue
            const a = b.phase + t * TAU * turns * b.speed
            const open = openAt() * b.reach * (1 + Math.sin(t * 9 + b.wob) * .16)
            b.s.position.set(c0.x + Math.cos(a) * rx * open,
                c0.y + Math.sin(a) * ry * open)
            b.s.rotation += b.spin
            b.s.alpha = Math.min(1,
                t * 7) * (opts.fade ? Math.min(1,
                (1 - t) * 3) : 1)
        }
    }
    place()
    return Promise.all([
        ...streams,
        tween(ms,
            (v) => {
                t = v
                place()
            },
            ease.linear,
            layer).then(() => clear(bits.map((b) => b.s)))
    ])
}

/** Đánh thường: súng điện khạc ba tia rồi nhả cục sét xanh, kéo theo tia lửa cam */
registerVfx("rumbleSparkShot",
    async (ctx) => {
        const beat = beatOnce(ctx)
        await Promise.all(points(ctx).map(async (to) => {
            const muzzle = ahead(ctx.from,
                to,
                CARD_H * .9)
            const dir = Math.atan2(to.y - muzzle.y,
                to.x - muzzle.x)
            const cone: [number, number] = [dir - .34,
                dir + .34]
            for (let i = 0; i < 3; i++) {
                void sparks(ctx.layer,
                    muzzle,
                    26 + i * 10,
                    .8,
                    cone,
                    6)
                void bloom(ctx.layer,
                    muzzle,
                    VOLT,
                    100 + i * 18,
                    170)
                void crackle(ctx.layer,
                    () => ({
                        p: muzzle, a: dir + rand(-.7,
                            .7)
                    }),
                    90,
                    400)
                await wait(ctx.layer,
                    74)
            }
            let p = {
                ...muzzle
            }
            const wobble = () => ({
                x: p.x + rand(-9,
                    9), y: p.y + rand(-9,
                    9)
            })
            const back: [number, number] = [dir + Math.PI - .5,
                dir + Math.PI + .5]
            const MS = 300
            await Promise.all([
                dustStream(ctx.layer,
                    wobble,
                    MS,
                    1000,
                    {
                        color: ELECTRIC, speed: [6,
                            40], life: [90,
                            220], size: [13,
                            3], alpha: 1, flow: 16, spread: 5
                    }),
                crackle(ctx.layer,
                    () => ({
                        p, a: rand(0,
                            TAU)
                    }),
                    MS,
                    700,
                    4),
                dustStream(ctx.layer,
                    wobble,
                    MS,
                    240,
                    {
                        color: SPARK, streak: 4, speed: [60,
                            300], angle: back, gravity: 520, life: [200,
                            480], size: [6,
                            2], alpha: 1, flow: 20
                    }),
                tween(MS,
                    (t) => {
                        p = {
                            x: lerp(muzzle.x,
                                to.x,
                                t), y: lerp(muzzle.y,
                                to.y,
                                t)
                        }
                    },
                    ease.in,
                    ctx.layer).then(beat)
            ])
        }))
    })

/** Đánh thường trúng: sét xanh bám lá tướng, tia lửa cam, mảnh thép */
registerVfx("rumbleSparkHit",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                VOLT,
                240 * k,
                300),
            crackle(ctx.layer,
                shell(ctx.from,
                    70 * k,
                    90 * k),
                300,
                1100),
            sparks(ctx.layer,
                ctx.from,
                Math.round(180 * ctx.intensity),
                1,
                undefined,
                18),
            shards(ctx.layer,
                ctx.from,
                Math.round(14 * ctx.intensity),
                .8)
        ])
    })

/** Q mở màn: mồi lửa ở miệng vòi, khạc khói dầu */
registerVfx("rumbleIgnite",
    async (ctx) => {
        const to = points(ctx)[0]
        const nozzle = ahead(ctx.from,
            to,
            CARD_H)
        const dir = Math.atan2(to.y - nozzle.y,
            to.x - nozzle.x)
        await Promise.all([
            soot(ctx.layer,
                nozzle,
                100,
                .5,
                8),
            bloom(ctx.layer,
                nozzle,
                FLAME,
                130,
                300),
            sparks(ctx.layer,
                nozzle,
                60,
                .6,
                [dir - .6,
                    dir + .6],
                8),
            fire(ctx.layer,
                () => nozzle,
                300,
                220,
                {
                    lut: CORE_LUT, aim: () => dir + rand(-.3,
                        .3), speed: [50,
                        170], life: [100,
                        220], size: [18,
                        8]
                })
        ])
    })

/** Q: một vòi lửa toả ba lưỡi vào đối diện và hai đường kề; mép lửa chạm hàng địch là báo nhịp trúng một lần */
registerVfx("rumbleFlamethrower",
    async (ctx) => {
        const k = kOf(ctx)
        const targets = points(ctx)
        const mid = targets[Math.floor(targets.length / 2)]
        const nozzle = ahead(ctx.from,
            mid,
            CARD_H)
        const axis = Math.atan2(mid.y - nozzle.y,
            mid.x - nozzle.x)
        // tính góc lệch quanh trục để quạt lửa không gãy khi bắn ngang qua mốc ±π
        const offs = targets.map((t) => {
            const d = Math.atan2(t.y - nozzle.y,
                t.x - nozzle.x) - axis
            return Math.atan2(Math.sin(d),
                Math.cos(d))
        })
        const low = Math.min(...offs), high = Math.max(...offs)
        const reach = Math.max(...targets.map((t) => Math.hypot(t.x - nozzle.x,
            t.y - nozzle.y)))
        const v = reach / (JET_HIT / 1000)
        const lobe = () => axis + pick(offs) + rand(-.06,
            .06)
        const fan = () => axis + lerp(low,
            high,
            Math.random()) + rand(-.17,
            .17)
        const flick = () => ({
            x: nozzle.x + rand(-10,
                10), y: nozzle.y + rand(-10,
                10)
        })
        let front = 0
        const inCone = () => {
            const a = fan()
            const d = reach * front * rand(.2,
                1)
            return {
                x: nozzle.x + Math.cos(a) * d, y: nozzle.y + Math.sin(a) * d
            }
        }
        const beat = beatOnce(ctx)
        ctx.shake(6,
            780)
        await Promise.all([
        // khói dầu nằm dưới lửa để lửa nổi trên bàn sáng
            dustStream(ctx.layer,
                inCone,
                JET_MS,
                70,
                {
                    puff: true, color: OIL, speed: [8,
                        60], gravity: -70, life: [560,
                        1150], size: [70 * k,
                        190 * k], alpha: .56, flow: 26, additive: false
                }),
            fire(ctx.layer,
                flick,
                JET_MS,
                2000,
                {
                    lut: BODY_LUT, aim: fan, speed: [v * .7,
                        v * 1.15], life: [340,
                        520], size: [28 * k,
                        136 * k], alpha: .7, curl: 150
                }),
            fire(ctx.layer,
                flick,
                JET_MS,
                1700,
                {
                    lut: BODY_LUT, aim: lobe, speed: [v * .78,
                        v * 1.2], life: [300,
                        440], size: [18 * k,
                        92 * k], alpha: .9, curl: 110
                }),
            fire(ctx.layer,
                flick,
                JET_MS,
                760,
                {
                    lut: CORE_LUT, aim: lobe, speed: [v * .7,
                        v * 1.1], life: [170,
                        290], size: [12 * k,
                        46 * k], alpha: .74, curl: 70
                }),
            dustStream(ctx.layer,
                flick,
                JET_MS,
                420,
                {
                    color: SPARK, streak: 5, speed: [v * .6,
                        v * 1.2], get angle(): [number, number] {
                        const a = fan()
                        return [a,
                            a]
                    }, gravity: 380, drag: .3, life: [240,
                        520], size: [5,
                        2], alpha: 1, flow: 20
                }),
            dustStream(ctx.layer,
                flick,
                JET_MS,
                54,
                {
                    blade: true, color: STEEL, size: [22,
                        12], speed: [v * .5,
                        v * .95], get angle(): [number, number] {
                        const a = fan()
                        return [a,
                            a]
                    }, gravity: 300, drag: .2, life: [280,
                        520], alpha: 1, flow: 8, additive: false
                }),
            tween(JET_HIT,
                (t) => { front = t },
                ease.linear,
                ctx.layer).then(() => {
                front = 1
                beat()
            })
        ])
    })

/** Q trúng: lửa bám lá tướng, cháy đen, tia lửa văng */
registerVfx("rumbleFlameHit",
    async (ctx) => {
        const k = kOf(ctx)
        const at = () => ({
            x: ctx.from.x + rand(-CARD_W,
                CARD_W) * k, y: ctx.from.y + rand(-CARD_H * .4,
                CARD_H * .8) * k
        })
        await Promise.all([
            soot(ctx.layer,
                ctx.from,
                170 * k,
                .6),
            bloom(ctx.layer,
                ctx.from,
                FLAME,
                240 * k,
                300),
            fire(ctx.layer,
                at,
                460,
                460,
                {
                    lut: BODY_LUT, aim: () => -Math.PI / 2 + rand(-.3,
                        .3), speed: [70,
                        240], gravity: -260, life: [280,
                        620], size: [34,
                        12], alpha: .92, curl: 110
                },
                70),
            sparks(ctx.layer,
                ctx.from,
                110,
                .9,
                undefined,
                40)
        ])
    })

/** E mở màn: mảnh đồng thép bị hút về, quay quanh Rumble trong màn sét xanh */
registerVfx("rumbleScrapOrbit",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            mist(ctx.layer,
                ctx.from,
                {
                    color: [VOLT,
                        0x1f8cf0], size: 230 * k, alpha: .24, count: 10, gravity: -10, life: [480,
                        820]
                }),
            bloom(ctx.layer,
                ctx.from,
                VOLT,
                340 * k,
                640),
            scrapOrbit(ctx.layer,
                () => ctx.from,
                620,
                k,
                {
                    gather: true
                }),
            crackle(ctx.layer,
                shell(ctx.from,
                    112 * k,
                    136 * k),
                620,
                1400)
        ])
    })

/** E: khiên nổ tung, bầy khối sắt và lưỡi sắt lao vào mục tiêu; tất cả chạm cùng lúc là báo nhịp trúng */
registerVfx("rumbleShardBurst",
    async (ctx) => {
        const k = kOf(ctx)
        const beat = beatOnce(ctx)
        const MS = 340
        await Promise.all(points(ctx).map(async (to) => {
            const dx = to.x - ctx.from.x, dy = to.y - ctx.from.y
            const len = Math.hypot(dx,
                dy) || 1
            const nx = -dy / len, ny = dx / len
            const dir = Math.atan2(dy,
                dx)
            void shards(ctx.layer,
                ctx.from,
                Math.round(56 * k),
                1,
                undefined,
                80)
            void sparks(ctx.layer,
                ctx.from,
                120,
                1,
                undefined,
                70)
            void soot(ctx.layer,
                ctx.from,
                180 * k,
                .5,
                8)
            let u = 0
            const swarm = [-120,
                -66,
                -22,
                22,
                66,
                120].map((bend) => {
                const at = () => {
                    const side = Math.sin(u * Math.PI) * bend * .8 + bend * .6 * (1 - u)
                    return {
                        x: ctx.from.x + dx * u + nx * side, y: ctx.from.y + dy * u + ny * side
                    }
                }
                return Promise.all([
                    dustStream(ctx.layer,
                        at,
                        MS,
                        60,
                        {
                            puff: true, color: OIL, speed: [6,
                                30], life: [320,
                                680], size: [22,
                                64], alpha: .4, flow: 18, additive: false
                        }),
                    dustStream(ctx.layer,
                        at,
                        MS,
                        200,
                        {
                            blade: true, color: SCRAP, size: [44,
                                22], speed: [160,
                                320], angle: [dir - .14,
                                dir + .14], life: [150,
                                300], alpha: 1, flow: 0, drag: 0, additive: false, spread: 9
                        }),
                    dustStream(ctx.layer,
                        at,
                        MS,
                        180,
                        {
                            color: SPARK, streak: 5, speed: [30,
                                150], angle: [dir + Math.PI - .4,
                                dir + Math.PI + .4], gravity: 420, life: [170,
                                380], size: [7,
                                2.5], alpha: 1, flow: 14
                        })
                ])
            })
            const bits = Array.from({
                length: 18
            },
            () => {
                const a = rand(0,
                    TAU)
                return {
                    s: chunk(ctx.layer,
                        rand(24,
                            46)), x: ctx.from.x + Math.cos(a) * rand(60,
                        130), y: ctx.from.y + Math.sin(a) * rand(70,
                        150), bend: rand(-120,
                        120), late: rand(0,
                        .3), spin: rand(-.5,
                        .5)
                }
            })
            await Promise.all([
                ...swarm,
                crackle(ctx.layer,
                    () => {
                        const side = rand(-100,
                            100)
                        return {
                            p: {
                                x: ctx.from.x + dx * u + nx * side, y: ctx.from.y + dy * u + ny * side
                            }, a: dir + rand(-.7,
                                .7)
                        }
                    },
                    MS,
                    1100),
                tween(MS,
                    (t) => {
                        u = t * t
                        for (const b of bits) {
                            if (b.s.destroyed) continue
                            const v = Math.max(0,
                                (t - b.late) / (1 - b.late))
                            const e = v * v
                            const side = Math.sin(e * Math.PI) * b.bend
                            b.s.position.set(lerp(b.x,
                                to.x,
                                e) + nx * side,
                            lerp(b.y,
                                to.y,
                                e) + ny * side)
                            b.s.rotation += b.spin
                        }
                    },
                    ease.linear,
                    ctx.layer).then(() => {
                    clear(bits.map((b) => b.s))
                    beat()
                })
            ])
        }))
    })

/** E trúng: mảnh sắt ghim vào rồi văng ngược, sét xanh bám mục tiêu */
registerVfx("rumbleShardHit",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                VOLT,
                280 * k,
                300),
            crackle(ctx.layer,
                shell(ctx.from,
                    74 * k,
                    96 * k),
                340,
                1200),
            flingChunks(ctx.layer,
                ctx.from,
                12),
            shards(ctx.layer,
                ctx.from,
                Math.round(80 * ctx.intensity),
                1,
                undefined,
                34),
            sparks(ctx.layer,
                ctx.from,
                Math.round(180 * ctx.intensity),
                1,
                undefined,
                26)
        ])
    })

/** E nhận Khiên: khối đồng thép lượn quanh Rumble trong sét xanh rồi lắng xuống */
registerVfx("rumbleScrapGain",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                VOLT,
                320 * k,
                520),
            scrapOrbit(ctx.layer,
                () => ctx.from,
                1000,
                k,
                {
                    clumps: 6, turns: 1.1, rx: 104, ry: 128, fade: true, bits: 12, bitSize: 40
                }),
            crackle(ctx.layer,
                shell(ctx.from,
                    104 * k,
                    128 * k),
                760,
                1000)
        ])
    })

/** Khiên phế liệu đỡ đòn: thép toé lửa về phía kẻ đánh, sét xanh chớp */
registerVfx("rumbleScrapBlock",
    async (ctx) => {
        const k = kOf(ctx)
        const hit = ctx.to.length ? ahead(ctx.from,
            ctx.to[0],
            CARD_H * .8) : ctx.from
        const out = Math.atan2(hit.y - ctx.from.y,
            hit.x - ctx.from.x)
        const cone: [number, number] = ctx.to.length ? [out - .9,
            out + .9] : [0,
            TAU]
        await Promise.all([
            bloom(ctx.layer,
                hit,
                VOLT,
                200 * k,
                240),
            crackle(ctx.layer,
                shell(hit,
                    70 * k,
                    60 * k),
                260,
                900),
            sparks(ctx.layer,
                hit,
                Math.round(170 * ctx.intensity),
                1,
                cone,
                16),
            shards(ctx.layer,
                hit,
                Math.round(26 * ctx.intensity),
                .8,
                cone,
                16)
        ])
    })

/** Một quả tên lửa: đầu lửa, thân thép mảnh, vệt khói dày ở lại trên bàn */
async function rocket(ctx: VfxCtx, a: Pt, b: Pt, ms: number, delay: number, curve: (t: number) => number, scale: number) {
    if (delay > 0) await wait(ctx.layer,
        delay)
    let p = {
        ...a
    }
    const dir = Math.atan2(b.y - a.y,
        b.x - a.x)
    const back = dir + Math.PI
    await Promise.all([
        dustStream(ctx.layer,
            () => p,
            ms,
            110,
            {
                puff: true, color: [0x2a2420,
                    0x3e3630,
                    0x5e5650,
                    0x1a1512], speed: [4,
                    30], gravity: -26, life: [620,
                    1150], size: [28 * scale,
                    92 * scale], alpha: .74, flow: 24, additive: false
            }),
        fire(ctx.layer,
            () => p,
            ms,
            360,
            {
                lut: CORE_LUT, aim: () => back + rand(-.26,
                    .26), speed: [60,
                    260], life: [110,
                    240], size: [32 * scale,
                    11 * scale], alpha: 1, curl: 24
            }),
        dustStream(ctx.layer,
            () => p,
            ms,
            300,
            {
                blade: true, color: [0x6b7a5a,
                    0x4f5a45,
                    0xb0542a], size: [38 * scale,
                    30 * scale], speed: [40,
                    50], angle: [dir,
                    dir], life: [55,
                    90], alpha: 1, flow: 0, drag: 0, additive: false
            }),
        dustStream(ctx.layer,
            () => p,
            ms,
            200,
            {
                color: SPARK, streak: 4, speed: [50,
                    220], angle: [back - .5,
                    back + .5], gravity: 420, life: [160,
                    380], size: [6,
                    2], alpha: 1, flow: 16
            }),
        tween(ms,
            (t) => {
                p = {
                    x: lerp(a.x,
                        b.x,
                        t), y: lerp(a.y,
                        b.y,
                        t)
                }
            },
            curve,
            ctx.layer)
    ])
}

/** Quả cầu lửa bẩn: lửa cuộn lên chứ không toả tia đều, khói đen trùm lên ngay sau đó. Giữ độ sáng vừa phải để nhiều quả nổ cạnh nhau không cháy trắng */
function blast(layer: Container, pt: Pt, k: number, power = 1) {
    const at = () => ({
        x: pt.x + rand(-44,
            44) * k * power, y: pt.y + rand(-40,
            44) * k * power
    })
    return Promise.all([
        bloom(layer,
            pt,
            0xff9a40,
            190 * k * power,
            260),
        fire(layer,
            at,
            0,
            0,
            {
                lut: BODY_LUT, aim: () => -Math.PI / 2 + rand(-1.1,
                    1.1), speed: [30,
                    190], gravity: -190, drag: 1.1, curl: 170, life: [320,
                    760], size: [56 * k * power,
                    20 * k], alpha: .4
            },
            Math.round(46 * power)),
        fire(layer,
            at,
            0,
            0,
            {
                lut: CORE_LUT, aim: () => rand(0,
                    TAU), speed: [10,
                    90], curl: 150, life: [110,
                    240], size: [34 * k * power,
                    16 * k], alpha: .42
            },
            Math.round(12 * power)),
        wait(layer,
            150).then(() => soot(layer,
            pt,
            200 * k * power,
            .56,
            8))
    ])
}

/** R: bó tên lửa phóng khỏi Rumble, rồi cả loạt đổ xuống hàng địch; mọi quả đáp gần như cùng lúc nên chỉ có một nhịp trúng */
registerVfx("rumbleRocketRain",
    async (ctx) => {
        const k = kOf(ctx)
        const targets = points(ctx)
        const H = ctx.app.screen.height
        const up = targets[0].y < ctx.from.y
        const sky = up ? -110 : H + 110
        const LIFT = 400, FALL = 470
        const beat = beatOnce(ctx)
        const base = ahead(ctx.from,
            targets[Math.floor(targets.length / 2)],
            CARD_H)
        void soot(ctx.layer,
            base,
            190 * k,
            .6,
            12)
        void bloom(ctx.layer,
            base,
            FLAME,
            260 * k,
            420)
        void sparks(ctx.layer,
            base,
            160,
            1,
            undefined,
            30)
        const rise = Array.from({
            length: 5
        },
        (_, i) => rocket(ctx,
            {
                x: base.x + (i - 2) * 16, y: base.y
            },
            {
                x: ctx.from.x + (i - 2) * 84, y: sky
            },
            LIFT,
            i * 40,
            ease.in,
            1))
        await wait(ctx.layer,
            LIFT + 60)
        const left = Math.min(...targets.map((t) => t.x)), right = Math.max(...targets.map((t) => t.x))
        const row = targets[0].y
        const lands = [...targets,
            ...Array.from({
                length: 5
            },
            (_, i) => ({
                x: lerp(left - 30,
                    right + 30,
                    (i + .5) / 5) + rand(-40,
                    40), y: row + rand(-90,
                    104)
            }))]
        const rain = lands.map((to, i) => {
            const main = i < targets.length
            const skew = main ? 0 : rand(-30,
                30)
            const start = {
                x: to.x - rand(250,
                    350), y: sky + rand(-60,
                    0)
            }
            // nổ theo đồng hồ riêng: rocket() chỉ xong khi khói đã tan
            if (!main) {
                void wait(ctx.layer,
                    FALL + skew).then(() => {
                    void blast(ctx.layer,
                        to,
                        1,
                        .55)
                    void sparks(ctx.layer,
                        to,
                        40,
                        .8,
                        undefined,
                        14)
                })
            }
            return rocket(ctx,
                start,
                to,
                FALL + skew,
                0,
                ease.in,
                main ? 1.15 : .8)
        })
        await wait(ctx.layer,
            FALL)
        ctx.shake(13,
            720)
        beat()
        // như LMHT, tên lửa để lại lửa cháy trên đất; nối liền cú nổ, không có nhịp kết quả thứ hai
        const ground = () => ({
            x: rand(left - 70,
                right + 70), y: row + rand(16,
                118)
        })
        const lick = () => -Math.PI / 2 + rand(-.3,
            .3)
        const field = Promise.all([
            dustStream(ctx.layer,
                ground,
                1200,
                34,
                {
                    puff: true, color: OIL, speed: [8,
                        40], gravity: -70, life: [620,
                        1100], size: [80,
                        170], alpha: .4, flow: 24, additive: false
                }),
            fire(ctx.layer,
                ground,
                1200,
                1200,
                {
                    lut: BODY_LUT, aim: lick, speed: [30,
                        130], gravity: -160, curl: 90, life: [320,
                        640], size: [46,
                        14], alpha: .8
                }),
            fire(ctx.layer,
                ground,
                1200,
                620,
                {
                    lut: CORE_LUT, aim: lick, speed: [30,
                        110], gravity: -120, curl: 60, life: [140,
                        300], size: [26,
                        10], alpha: .9
                })
        ])
        await Promise.all([...rise,
            ...rain,
            field])
    })

/** R trúng: cầu lửa bẩn, mảnh vỏ tên lửa văng, nấm khói đen */
registerVfx("rumbleRocketHit",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            blast(ctx.layer,
                ctx.from,
                k),
            flingChunks(ctx.layer,
                ctx.from,
                9,
                1.1),
            shards(ctx.layer,
                ctx.from,
                Math.round(14 * ctx.intensity),
                1,
                undefined,
                40),
            sparks(ctx.layer,
                ctx.from,
                Math.round(36 * ctx.intensity),
                .9,
                undefined,
                50)
        ])
    })

/** Nội tại: lá từ Mộ bay lên tay, quấn mảnh sắt và kéo vệt tia lửa; chạm tay là báo nhịp */
registerVfx("rumbleRecycleCard",
    async (ctx) => {
        const to = ctx.to[0] ?? ctx.from
        const tex = await loadIcon(ctx.icon)
        if (ctx.layer.destroyed) return
        const MS = 860
        const peak = {
            x: lerp(ctx.from.x,
                to.x,
                .5), y: Math.min(ctx.from.y,
                to.y) - 230
        }
        let p = {
            ...ctx.from
        }
        const lift = Promise.all([
            soot(ctx.layer,
                ctx.from,
                110,
                .55,
                8),
            bloom(ctx.layer,
                ctx.from,
                FLAME,
                180,
                300),
            sparks(ctx.layer,
                ctx.from,
                90,
                .8,
                [-Math.PI * .9,
                    -Math.PI * .1],
                16)
        ])
        const trail = Promise.all([
            dustStream(ctx.layer,
                () => p,
                MS,
                74,
                {
                    puff: true, color: OIL, speed: [6,
                        30], gravity: -30, life: [420,
                        860], size: [26,
                        70], alpha: .46, flow: 20, additive: false
                }),
            dustStream(ctx.layer,
                () => p,
                MS,
                520,
                {
                    color: SPARK, streak: 4.5, speed: [40,
                        220], gravity: 460, life: [260,
                        620], size: [6,
                        2], alpha: 1, flow: 26, spread: 26
                }),
            dustStream(ctx.layer,
                () => p,
                MS,
                150,
                {
                    color: RUST, speed: [20,
                        120], gravity: 320, life: [320,
                        700], size: [5,
                        2], alpha: 1, flow: 30, spread: 24, additive: false
                })
        ])
        const glow = makeSprite(ctx.layer,
            "glow",
            p.x,
            p.y,
            FLAME,
            190)
        glow.alpha = .55
        let card: Sprite | undefined
        if (tex) {
            card = new Sprite(tex)
            card.anchor.set(.5)
            card.width = 110
            card.height = 110
            card.tint = 0xffe2c4
            ctx.layer.addChild(card)
        }
        const fly = tween(MS,
            (t) => {
                const a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t
                p = {
                    x: a * ctx.from.x + b * peak.x + c * to.x, y: a * ctx.from.y + b * peak.y + c * to.y
                }
                if (!glow.destroyed) glow.position.set(p.x,
                    p.y)
                if (card && !card.destroyed) {
                    card.position.set(p.x,
                        p.y)
                    card.rotation = Math.sin(t * 13) * .24
                }
            },
            ease.inOut,
            ctx.layer).then(() => {
            if (ctx.layer.destroyed) return
            if (card && !card.destroyed) card.destroy()
            if (!glow.destroyed) glow.destroy()
            ctx.onBeat?.()
            void bloom(ctx.layer,
                to,
                FLAME,
                200,
                280)
            void sparks(ctx.layer,
                to,
                90,
                .8,
                [-Math.PI,
                    0],
                22)
        })
        await Promise.all([
            lift,
            trail,
            scrapOrbit(ctx.layer,
                () => p,
                MS,
                1,
                {
                    rx: 54, ry: 54, turns: 2.4, clumps: 5, bits: 6, bitSize: 20
                }),
            fly
        ])
    })

/** Rumble đánh Lá Tái Chế: lá bay tới, cháy thành tia lửa ngay trên đầu tướng. `to[0]` là vị trí lá trên tay */
registerVfx("rumbleRecycleCast",
    async (ctx) => {
        const k = kOf(ctx)
        const tex = await loadIcon(ctx.icon)
        if (ctx.layer.destroyed) return
        const MS = 480
        const start = ctx.to[0] ?? ctx.from
        const end = {
            x: ctx.from.x, y: ctx.from.y - 20
        }
        let p = {
            ...start
        }
        const orbit = scrapOrbit(ctx.layer,
            () => ctx.from,
            MS,
            k,
            {
                clumps: 6, gather: true, turns: 1
            })
        const trail = dustStream(ctx.layer,
            () => p,
            MS,
            460,
            {
                color: SPARK, streak: 4, speed: [40,
                    200], gravity: 420, life: [200,
                    480], size: [6,
                    2], alpha: 1, flow: 22, spread: 22
            })
        let card: Sprite | undefined
        if (tex) {
            card = new Sprite(tex)
            card.anchor.set(.5)
            card.width = 110
            card.height = 110
            card.tint = 0xffe2c4
            ctx.layer.addChild(card)
        }
        await Promise.all([
            orbit,
            trail,
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                220 * k,
                MS),
            tween(MS,
                (t) => {
                    p = {
                        x: lerp(start.x,
                            end.x,
                            t), y: lerp(start.y,
                            end.y,
                            t)
                    }
                    if (card && !card.destroyed) {
                        card.position.set(p.x,
                            p.y)
                        card.alpha = t < .62 ? 1 : 1 - (t - .62) / .38
                    }
                },
                ease.inOut,
                ctx.layer)
        ])
    })

/** Lá Tái Chế kiểu đạn phép (Lux E): cục sáng cũ kỹ, chập chờn, rơi vảy rỉ và tia lửa; `color` lấy từ chiêu gốc */
registerVfx("rumbleScrapBolt",
    async (ctx) => {
        const k = kOf(ctx)
        const beat = beatOnce(ctx)
        await Promise.all(points(ctx).map(async (to) => {
            const a = ahead(ctx.from,
                to,
                CARD_H * .9)
            const dir = Math.atan2(to.y - a.y,
                to.x - a.x)
            const back = dir + Math.PI
            const MS = 430
            let p = {
                ...a
            }
            let clock = 0
            const shaky = () => {
                const r = (14 + Math.sin(clock * 34) * 9) * k
                return {
                    x: p.x + rand(-r,
                        r), y: p.y + rand(-r,
                        r)
                }
            }
            await Promise.all([
                dustStream(ctx.layer,
                    () => p,
                    MS,
                    58,
                    {
                        puff: true, color: OIL, speed: [6,
                            30], life: [420,
                            820], size: [24,
                            72], alpha: .44, flow: 20, additive: false
                    }),
                dustStream(ctx.layer,
                    shaky,
                    MS,
                    1000,
                    {
                        color: [ctx.color,
                            ctx.color2 ?? 0xffffff,
                            0xfff4d8], speed: [6,
                            36], life: [100,
                            240], size: [14 * k,
                            3], alpha: 1, flow: 16
                    }),
                dustStream(ctx.layer,
                    () => p,
                    MS,
                    280,
                    {
                        color: RUST, speed: [30,
                            150], angle: [back - .7,
                            back + .7], gravity: 360, life: [320,
                            720], size: [6,
                            2], alpha: 1, flow: 26, additive: false, spread: 14
                    }),
                dustStream(ctx.layer,
                    shaky,
                    MS,
                    320,
                    {
                        color: SPARK, streak: 4.5, speed: [50,
                            280], angle: [back - .6,
                            back + .6], gravity: 480, life: [200,
                            480], size: [6,
                            2], alpha: 1, flow: 18
                    }),
                dustStream(ctx.layer,
                    () => p,
                    MS,
                    46,
                    {
                        blade: true, color: STEEL, size: [22,
                            12], speed: [40,
                            160], angle: [back - .7,
                            back + .7], gravity: 420, life: [300,
                            620], alpha: 1, flow: 8, additive: false
                    }),
                tween(MS,
                    (t) => {
                        clock = t
                        p = {
                            x: lerp(a.x,
                                to.x,
                                t), y: lerp(a.y,
                                to.y,
                                t)
                        }
                    },
                    ease.inOut,
                    ctx.layer).then(beat)
            ])
        }))
    })

/** Lá Tái Chế trúng: sáng tắt ngay, rỉ sét và tia lửa văng; không có dấu khống chế */
registerVfx("rumbleScrapBoltHit",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                300 * k,
                300),
            soot(ctx.layer,
                ctx.from,
                150 * k,
                .56,
                9),
            fire(ctx.layer,
                () => ctx.from,
                0,
                0,
                {
                    lut: BODY_LUT, aim: () => -Math.PI / 2 + rand(-1,
                        1), speed: [40,
                        210], gravity: -180, drag: 1, curl: 130, life: [240,
                        520], size: [44,
                        14], alpha: .7, spread: 34
                },
                46),
            rustFlakes(ctx.layer,
                ctx.from,
                Math.round(220 * ctx.intensity)),
            sparks(ctx.layer,
                ctx.from,
                Math.round(200 * ctx.intensity),
                1,
                undefined,
                24),
            shards(ctx.layer,
                ctx.from,
                Math.round(30 * ctx.intensity),
                .8,
                undefined,
                20)
        ])
    })

/** Lá Tái Chế kiểu chém (Darius Q): cụm sắt ném tới rồi quét ngang một nhát qua mục tiêu; giữa nhát quét là báo nhịp trúng */
registerVfx("rumbleScrapCleave",
    async (ctx) => {
        const k = kOf(ctx)
        const to = points(ctx)[0]
        const a = ahead(ctx.from,
            to,
            CARD_H * .9)
        const dir = Math.atan2(to.y - a.y,
            to.x - a.x)
        const THROW = 230, SWEEP = 300
        const beat = beatOnce(ctx)
        let p = {
            ...a
        }
        await Promise.all([
            dustStream(ctx.layer,
                () => p,
                THROW,
                300,
                {
                    blade: true, color: SCRAP, size: [32,
                        18], speed: [120,
                        300], angle: [dir - .2,
                        dir + .2], life: [120,
                        260], alpha: 1, flow: 0, drag: 0, additive: false, spread: 16
                }),
            dustStream(ctx.layer,
                () => p,
                THROW,
                300,
                {
                    color: SPARK, streak: 4.5, speed: [40,
                        200], gravity: 420, life: [160,
                        380], size: [5,
                        2], alpha: 1, flow: 18, spread: 14
                }),
            tween(THROW,
                (t) => {
                    p = {
                        x: lerp(a.x,
                            to.x,
                            t), y: lerp(a.y,
                            to.y,
                            t)
                    }
                },
                ease.in,
                ctx.layer)
        ])
        if (ctx.layer.destroyed) return
        const R = 138 * k
        let turn = 0
        // nhát quét trái sang phải qua phía trên lá tướng; lưỡi sắt nằm theo tiếp tuyến của nhát chém
        const swing = () => lerp(-Math.PI * .95,
            -Math.PI * .02,
            turn)
        const edge = () => {
            const v = swing()
            const r = R * rand(.5,
                1.12)
            return {
                x: to.x + Math.cos(v) * r, y: to.y + Math.sin(v) * r * .82 + 30
            }
        }
        const tangent = (): [number, number] => {
            const v = swing() + Math.PI / 2
            return [v - .12,
                v + .12]
        }
        await Promise.all([
            mist(ctx.layer,
                to,
                {
                    color: OIL, size: 170 * k, alpha: .4, additive: false, count: 8, gravity: -50, life: [520,
                        940]
                }),
            dustStream(ctx.layer,
                edge,
                SWEEP,
                1000,
                {
                    blade: true, color: [ctx.color,
                        ...SCRAP], size: [46,
                        22], speed: [320,
                        560], life: [130,
                        300], alpha: 1, flow: 0, drag: .4, additive: false,
                    get angle() { return tangent() }
                }),
            dustStream(ctx.layer,
                edge,
                SWEEP,
                900,
                {
                    color: [ctx.color2 ?? 0xffd0c0,
                        ...SPARK], streak: 5, speed: [240,
                        520], gravity: 300, life: [160,
                        400], size: [6,
                        2], alpha: 1, flow: 16,
                    get angle() { return tangent() }
                }),
            fire(ctx.layer,
                edge,
                SWEEP,
                900,
                {
                    lut: BODY_LUT, aim: () => swing() + Math.PI / 2 + rand(-.2,
                        .2), speed: [180,
                        420], life: [130,
                        300], size: [40 * k,
                        12], alpha: .85, curl: 30
                }),
            tween(SWEEP,
                (t) => {
                    turn = t
                    if (t >= .5) beat()
                },
                ease.inOut,
                ctx.layer)
        ])
    })

/** Nhát chém sắt vụn trúng: mảnh rỉ văng ngang, tia lửa đỏ, khói bẩn */
registerVfx("rumbleScrapCleaveHit",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                280 * k,
                280),
            soot(ctx.layer,
                ctx.from,
                150 * k,
                .54,
                9),
            flingChunks(ctx.layer,
                ctx.from,
                10),
            shards(ctx.layer,
                ctx.from,
                Math.round(56 * ctx.intensity),
                1.1,
                [-.5,
                    .5],
                26),
            shards(ctx.layer,
                ctx.from,
                Math.round(28 * ctx.intensity),
                .8,
                undefined,
                26),
            sparks(ctx.layer,
                ctx.from,
                Math.round(170 * ctx.intensity),
                1,
                undefined,
                26),
            rustFlakes(ctx.layer,
                ctx.from,
                Math.round(90 * ctx.intensity),
                30)
        ])
    })
