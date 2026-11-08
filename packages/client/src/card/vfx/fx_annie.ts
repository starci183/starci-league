// VFX riêng của Annie theo bản gốc LoL: lửa vàng nóng lõi trắng xoáy tròn (Q cầu lửa xoáy có đuôi sao chổi, E lửa xoáy quanh người, nội tại ngọn lửa trên tay), Tibbers là gấu bông nâu cháy xém, lửa lộ qua người, mắt và miệng rực sáng. Không dùng nét vẽ hình học.
// Khác Brand: lửa tròn, sáng, vàng, ít khói; Brand đỏ cam, khói đen, cháy bùng. Số Lửa truyền qua ctx.amount. Trúng là báo ctx.onBeat, không chờ đuôi hạt tan.
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
const WHITE = 0xfffbe0
const GOLD = 0xffc23a
const FLAME = 0xff8418
const RED_EYE = 0xff2a12
const SPARKS = [0xfffbe0,
    0xffe27a,
    0xffb52e,
    0xff8418]
/** Lớp bông nâu cháy xém của Tibbers */
const PLUSH = [0x8a4a22,
    0x6e3a1c,
    0x5a2e16,
    0x3e2010]
const SMOKE = [0x2a1610,
    0x3a2015,
    0x1c0f0b]
/** Nửa bề rộng, nửa chiều cao lá tướng trên bàn */
const CARD_W = 60
const CARD_H = 104
/** Nửa bề rộng, nửa chiều cao lá token ở ô Triệu hồi phụ, nhỏ hơn lá tướng */
const TOKEN_W = 50
const TOKEN_H = 56
/** Tibbers đứng cạnh ô phụ: cỡ thân và khoảng lệch khỏi tâm lá */
const BEAR_SIZE = 46
const BEAR_OFFSET = 112
export const ANNIE_FIRE_MAX = 4
/** Không có tether thì Lửa quanh Annie sáng chừng này */
const MOTE_MS = 1100
const LOOP_MS = 240
const AURA_MAX_MS = 11000
const AURA_DEFAULT_MS = 2400
const UP: [number, number] = [-Math.PI * .64,
    -Math.PI * .36]
const ALL: [number, number] = [0,
    TAU]

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
/** Theo tuổi hạt: lõi trắng vàng, thân vàng cam, than cháy xém nâu của Tibbers */
const RAMPS = {
    core: makeLut([0xfffbe0,
        0xfff0a0,
        0xffd24a,
        0xffa020,
        0xf05a10,
        0x7a1a06]),
    body: makeLut([0xffe27a,
        0xffb52e,
        0xff8418,
        0xe84e10,
        0xa02408,
        0x3a0a02]),
    char: makeLut([0x8a4a22,
        0x6e3a1c,
        0x4e2a16,
        0x361c10,
        0x24120c,
        0x140a08])
}
type Ramp = keyof typeof RAMPS

/** Lưỡi lửa tròn đầu: đốm mềm chồng nhau, thuôn dần về đuôi */
function tongueTexture(): Texture {
    const W = 96, H = 44
    const c = document.createElement("canvas")
    c.width = W
    c.height = H
    const g = c.getContext("2d")
    if (g) {
        for (let i = 0; i < 60; i++) {
            const u = Math.pow(Math.random(),
                1.1)
            const x = W * (.24 + .66 * u)
            const y = H / 2 + (Math.random() - .5) * H * .5 * (1 - u)
            const r = H * .4 * (1 - u * .72) * rand(.6,
                1)
            const grad = g.createRadialGradient(x,
                y,
                0,
                x,
                y,
                r)
            grad.addColorStop(0,
                "rgba(255,255,255,.32)")
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

const MAX_FIRE = 6000
let liveFire = 0
const quality = () => Math.max(.3,
    Math.min(1,
        (Ticker.shared.FPS - 25) / 30))

interface FireOpts {
    ramp?: Ramp;
    speed?: [number, number];
    angle?: [number, number];
    /** Âm là bốc lên */
    gravity?: number;
    drag?: number;
    /** Độ uốn ngang của lưỡi lửa (px/s) */
    curl?: number;
    life?: [number, number];
    size?: [number, number];
    alpha?: number;
    spread?: number;
    /** Lửa xoáy quanh một tâm: spin rad/s, pull > 0 là hút vào tâm */
    swirl?: { at: () => Pt; spin: number; pull?: number };
}
interface Lick { p: Particle; vx: number; vy: number; age: number; life: number; s0: number; s1: number; a: number; phase: number }

function spawn(host: ParticleContainer, tex: Texture, list: Lick[], pt: Pt, o: FireOpts, lut: Uint32Array) {
    if (liveFire >= MAX_FIRE || Math.random() > quality()) return
    const [sp0,
        sp1] = o.speed ?? [50,
        200]
    const [an0,
        an1] = o.angle ?? UP
    const [l0,
        l1] = o.life ?? [260,
        560]
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
    const k = rand(.65,
        1.3)
    const p = new Particle({
        texture: tex, anchorX: .4, anchorY: .5,
        x: pt.x + Math.cos(pa) * r, y: pt.y + Math.sin(pa) * r,
        tint: lut[0], alpha: 0, rotation: ang
    })
    host.addParticle(p)
    liveFire++
    list.push({
        p, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, age: 0, life: rand(l0,
            l1),
        s0: z0 * k / tex.height, s1: z1 * k / tex.height, a: (o.alpha ?? .86) * rand(.65,
            1), phase: rand(0,
            TAU)
    })
}

function burnOut(layer: Container, host: ParticleContainer, list: Lick[], o: FireOpts, lut: Uint32Array, more: (ms: number) => boolean): Promise<void> {
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
            liveFire = Math.max(0,
                liveFire - list.length)
            list.length = 0
            if (!host.destroyed) host.destroy()
            resolve()
        }
        const gravity = o.gravity ?? -240
        const drag = o.drag ?? 1.5
        const curl = o.curl ?? 80
        const tick = (tk: Ticker) => {
            if (layer.destroyed || host.destroyed) { finish(); return }
            const dt = tk.deltaMS / 1000
            clock += dt
            const going = more(tk.deltaMS)
            const keep = Math.max(0,
                1 - drag * dt)
            const centre = o.swirl?.at()
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
                let dx = m.vx + (Math.sin(p.y * .029 + clock * 5.4 + m.phase) + .6 * Math.sin((p.x + p.y) * .017 - clock * 3.8)) * curl
                let dy = m.vy + Math.cos(p.x * .025 - clock * 4.6) * .35 * curl
                if (centre && o.swirl) {
                    const rx = p.x - centre.x, ry = p.y - centre.y
                    dx += -ry * o.swirl.spin - rx * (o.swirl.pull ?? 0)
                    dy += rx * o.swirl.spin - ry * (o.swirl.pull ?? 0)
                }
                p.x += dx * dt
                p.y += dy * dt
                p.rotation = Math.atan2(dy,
                    dx)
                const sc = lerp(m.s0,
                    m.s1,
                    t)
                p.scaleX = sc
                p.scaleY = sc * (.84 + .16 * Math.sin(m.age * .03 + m.phase))
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

function fireHost(layer: Container, ramp: Ramp) {
    const tex = tongueTex()
    const host = new ParticleContainer({
        texture: tex,
        dynamicProperties: {
            position: true, vertex: true, rotation: true, color: true
        }
    })
    // than cháy xém là chất tối, cộng sáng sẽ mất hút trên bàn
    host.blendMode = ramp === "char" ? "normal" : "add"
    layer.addChild(host)
    return {
        tex, host, lut: RAMPS[ramp]
    }
}

function fireBurst(layer: Container, pt: Pt, count: number, o: FireOpts): Promise<void> {
    if (layer.destroyed) return Promise.resolve()
    const {
        tex, host, lut
    } = fireHost(layer,
        o.ramp ?? "body")
    const list: Lick[] = []
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

function fireStream(layer: Container, at: () => Pt, ms: number, perSec: number, o: FireOpts): Promise<void> {
    if (layer.destroyed) return Promise.resolve()
    const {
        tex, host, lut
    } = fireHost(layer,
        o.ramp ?? "body")
    const list: Lick[] = []
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
                    at(),
                    o,
                    lut)
            }
            return el < ms
        })
}

const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
const around = (at: Pt, r: number): Pt => {
    const a = rand(0,
            TAU), d = Math.sqrt(Math.random()) * r
    return {
        x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d
    }
}
/** Tàn lửa nhỏ bay lên: đốm vàng đặc trưng trên icon chiêu */
const flecks = (layer: Container, pt: Pt, count: number, power = 1, spread = 30) => dustBurst(layer,
    pt,
    {
        count, color: SPARKS, speed: [50 * power,
            320 * power], gravity: -150, drag: 1.5, flow: 70, life: [420,
            1000], size: [5.5,
            1.4], alpha: 1, spread
    })
/** Khói nâu nhẹ: chỉ đủ để lửa vàng nổi trên bàn sáng */
const haze = (layer: Container, pt: Pt, size: number, alpha = .34) => mist(layer,
    pt,
    {
        color: SMOKE, size, alpha, additive: false, gravity: -60, life: [560,
            1000], speed: [10,
            50], count: 8
    })

/** Vị trí ngọn Lửa thứ i quanh lá; chạy theo đồng hồ chung nên lần phát sau nối liền lần trước */
function motePt(at: Pt, i: number, ready: boolean, now = performance.now()): Pt {
    const a = now * (ready ? .0036 : .0022) + i * TAU / ANNIE_FIRE_MAX
    return {
        x: at.x + Math.cos(a) * (ready ? 74 : 92), y: at.y - 8 + Math.sin(a) * (ready ? 92 : 118)
    }
}
const firesOf = (ctx: VfxCtx) => Math.max(1,
    Math.min(ANNIE_FIRE_MAX,
        Math.round(ctx.amount ?? 1)))

/** Nội tại: 1 tới 4 ngọn Lửa quay quanh Annie (ctx.amount). Đủ 4 thì nóng trắng và quay nhanh, báo chiêu sau gây Choáng. Có ctx.tether thì chạy tới khi được thả */
registerVfx("annieFireMotes",
    async (ctx) => {
        const count = firesOf(ctx)
        const ready = count >= ANNIE_FIRE_MAX
        const at = () => ctx.tether?.target() ?? ctx.from
        const limit = ctx.tether ? AURA_MAX_MS : MOTE_MS
        const pos = Array.from({
            length: count
        },
        (_, i) => motePt(at(),
            i,
            ready))
        const glows = pos.map((p) => [
            makeSprite(ctx.layer,
                "glow",
                p.x,
                p.y,
                FLAME,
                ready ? 96 : 80),
            makeSprite(ctx.layer,
                "glow",
                p.x,
                p.y,
                ready ? WHITE : GOLD,
                ready ? 46 : 36)
        ])
        const pieces: Promise<unknown>[] = []
        let el = 0
        while (!ctx.layer.destroyed && !ctx.tether?.released() && el < limit) {
            pos.forEach((_, i) => {
                pieces.push(fireStream(ctx.layer,
                    () => pos[i],
                    LOOP_MS,
                    ready ? 220 : 150,
                    {
                        ramp: ready ? "core" : "body", speed: [20,
                            80], gravity: -240, curl: 46, life: [170,
                            340], size: [ready ? 25 : 21,
                            7], spread: 7, alpha: .95
                    }))
            })
            pieces.push(dustStream(ctx.layer,
                () => pick(pos),
                LOOP_MS,
                ready ? 90 : 40,
                {
                    color: SPARKS, speed: [14,
                        70], angle: UP, gravity: -90, drag: 1, flow: 44, life: [320,
                        680], size: [4,
                        1.2], alpha: 1, spread: 10
                }))
            await tween(LOOP_MS,
                () => {
                    if (ctx.layer.destroyed) return
                    const c = at()
                    pos.forEach((p, i) => {
                        const next = motePt(c,
                            i,
                            ready)
                        p.x = next.x
                        p.y = next.y
                        for (const s of glows[i]) s.position.set(p.x,
                            p.y)
                    })
                },
                ease.linear,
                ctx.layer)
            el += LOOP_MS
        }
        for (const s of glows.flat()) if (!s.destroyed) s.visible = false
        await Promise.all(pieces)
    })

/** Nội tại: ngọn Lửa mới bùng lên đúng chỗ nó sẽ quay; ctx.amount là số Lửa sau khi nhận */
registerVfx("annieFireGain",
    async (ctx) => {
        const count = firesOf(ctx)
        const ready = count >= ANNIE_FIRE_MAX
        const at = motePt(ctx.from,
            count - 1,
            ready)
        await Promise.all([
            bloom(ctx.layer,
                at,
                ready ? WHITE : GOLD,
                ready ? 300 : 190,
                320),
            fireBurst(ctx.layer,
                at,
                ready ? 70 : 40,
                {
                    ramp: "core", speed: [60,
                        220], angle: ALL, life: [160,
                        340], size: [24,
                        7], gravity: -160, curl: 40
                }),
            flecks(ctx.layer,
                at,
                ready ? 80 : 44,
                .7,
                10)
        ])
    })

/** Nội tại: tiêu 4 Lửa, các ngọn Lửa xoáy dồn vào Annie, nóng trắng, mở màn chiêu gây Choáng */
registerVfx("annieFireSpend",
    async (ctx) => {
        const home = ctx.from
        const start = Array.from({
            length: ANNIE_FIRE_MAX
        },
        (_, i) => motePt(home,
            i,
            true))
        const pos = start.map(p => ({
            ...p
        }))
        const ms = 260
        await Promise.all([
            ...pos.map((_, i) => fireStream(ctx.layer,
                () => pos[i],
                ms,
                420,
                {
                    ramp: "core", speed: [10,
                        50], life: [120,
                        240], size: [28,
                        8], gravity: -80, curl: 30, spread: 6
                })),
            tween(ms,
                (t) => {
                    pos.forEach((p, i) => {
                        p.x = lerp(start[i].x,
                            home.x,
                            t)
                        p.y = lerp(start[i].y,
                            home.y,
                            t)
                    })
                },
                ease.in,
                ctx.layer).then(() => {
                ctx.onBeat?.()
                return Promise.all([
                    bloom(ctx.layer,
                        home,
                        WHITE,
                        340,
                        300),
                    bloom(ctx.layer,
                        home,
                        GOLD,
                        520,
                        420),
                    flecks(ctx.layer,
                        home,
                        160,
                        1.1,
                        30)
                ])
            })
        ])
    })

/** Q mở màn: ngọn lửa bùng trên tay Annie */
registerVfx("annieQCast",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                GOLD,
                210 * k,
                300),
            fireStream(ctx.layer,
                () => around(ctx.from,
                    24),
                200,
                300,
                {
                    ramp: "core", speed: [40,
                        150], life: [130,
                        260], size: [24 * k,
                        7], gravity: -300
                })
        ])
    })

/** Quầng sáng bám đầu đạn */
function headGlow(ctx: VfxCtx, r: number) {
    const outer = makeSprite(ctx.layer,
        "glow",
        ctx.from.x,
        ctx.from.y,
        FLAME,
        r * 6.4)
    const inner = makeSprite(ctx.layer,
        "glow",
        ctx.from.x,
        ctx.from.y,
        WHITE,
        r * 2.6)
    return {
        move(p: Pt) {
            for (const s of [outer,
                inner]) if (!s.destroyed) s.position.set(p.x,
                p.y)
        },
        fade() {
            for (const s of [outer,
                inner]) if (!s.destroyed) s.visible = false
        }
    }
}

/** Q: cầu lửa xoáy như icon gốc, lõi trắng vàng, hai sợi lửa cuộn quanh, đuôi sao chổi lấm tấm tàn lửa. Đủ Lửa (ctx.amount >= 4) thì to và nóng hơn */
registerVfx("annieFireBolt",
    async (ctx) => {
        const r = (ctx.amount ?? 0) >= ANNIE_FIRE_MAX ? 27 : 21
        const ms = 400
        await Promise.all((ctx.to.length ? ctx.to : [ctx.from]).map(async (to) => {
            let p = {
                ...ctx.from
            }
            let spin = 0
            const lift = Math.min(70,
                Math.hypot(to.x - ctx.from.x,
                    to.y - ctx.from.y) * .1)
            const glow = headGlow(ctx,
                r)
            const strand = (phase: number) => () => ({
                x: p.x + Math.cos(spin + phase) * r * .85, y: p.y + Math.sin(spin + phase) * r * .85
            })
            const curl: FireOpts = {
                ramp: "core", speed: [4,
                    26], angle: ALL, life: [120,
                    230], size: [r * .95,
                    r * .3], gravity: 0, curl: 18, alpha: .95
            }
            await Promise.all([
                fireStream(ctx.layer,
                    strand(0),
                    ms,
                    520,
                    curl),
                fireStream(ctx.layer,
                    strand(Math.PI),
                    ms,
                    520,
                    curl),
                fireStream(ctx.layer,
                    () => around(p,
                        r * .6),
                    ms,
                    640,
                    {
                        speed: [10,
                            70], angle: ALL, life: [220,
                            460], size: [r * 1.2,
                            r * .36], gravity: -130, curl: 50, alpha: .82
                    }),
                dustStream(ctx.layer,
                    () => around(p,
                        r * .7),
                    ms,
                    260,
                    {
                        color: SPARKS, speed: [14,
                            90], gravity: -100, life: [320,
                            760], size: [5,
                            1.3], alpha: 1, flow: 60
                    }),
                tween(ms,
                    (t) => {
                        spin = t * TAU * 3.4
                        p = {
                            x: lerp(ctx.from.x,
                                to.x,
                                t), y: lerp(ctx.from.y,
                                to.y,
                                t) - Math.sin(t * Math.PI) * lift
                        }
                        glow.move(p)
                    },
                    ease.in,
                    ctx.layer).then(() => {
                    glow.fade()
                    ctx.onBeat?.()
                })
            ])
        }))
    })

/** Q trúng: cầu lửa vỡ thành lửa vàng xoáy; ctx.amount > 0 là trúng tướng Choáng, nổ lớn hơn cùng số sát thương lớn hơn */
registerVfx("annieFireHit",
    async (ctx) => {
        const power = kOf(ctx) * ((ctx.amount ?? 0) > 0 ? 1.4 : 1)
        const at = ctx.from
        ctx.shake(3 * power,
            160)
        await Promise.all([
            haze(ctx.layer,
                at,
                120 * power),
            bloom(ctx.layer,
                at,
                FLAME,
                300 * power,
                320),
            bloom(ctx.layer,
                at,
                WHITE,
                150 * power,
                210),
            fireBurst(ctx.layer,
                at,
                Math.round(150 * power),
                {
                    speed: [130,
                        420], angle: ALL, life: [220,
                        520], size: [32 * power,
                        9], gravity: -190, drag: 2.3, curl: 70, spread: 26, swirl: {
                        at: () => at, spin: 3.2
                    }
                }),
            fireBurst(ctx.layer,
                at,
                Math.round(60 * power),
                {
                    ramp: "core", speed: [70,
                        230], angle: ALL, life: [120,
                        280], size: [26 * power,
                        8], gravity: -120, drag: 2.4, curl: 40, spread: 20
                }),
            flecks(ctx.layer,
                at,
                Math.round(150 * power),
                power,
                24)
        ])
    })

/** Q kết liễu: đốm lửa nhỏ từ mục tiêu bay về tay bài; chạm tay là lá trở lại */
registerVfx("annieReturnSpark",
    async (ctx) => {
        const to = ctx.to[0] ?? ctx.from
        const ms = 560
        let p = {
            ...ctx.from
        }
        const glow = headGlow(ctx,
            10)
        await Promise.all([
            dustStream(ctx.layer,
                () => p,
                ms,
                620,
                {
                    color: SPARKS, speed: [6,
                        50], life: [220,
                        520], size: [7,
                        1.4], alpha: 1, flow: 40, spread: 6
                }),
            fireStream(ctx.layer,
                () => p,
                ms,
                300,
                {
                    ramp: "core", speed: [6,
                        30], angle: ALL, life: [120,
                        260], size: [22,
                        5], gravity: -30, curl: 24
                }),
            tween(ms,
                (t) => {
                    p = {
                        x: lerp(ctx.from.x,
                            to.x,
                            t) + Math.sin(t * Math.PI) * 90, y: lerp(ctx.from.y,
                            to.y,
                            t)
                    }
                    glow.move(p)
                },
                ease.inOut,
                ctx.layer).then(() => {
                glow.fade()
                ctx.onBeat?.()
                return Promise.all([
                    bloom(ctx.layer,
                        to,
                        GOLD,
                        170,
                        280),
                    flecks(ctx.layer,
                        to,
                        60,
                        .6,
                        12)
                ])
            })
        ])
    })

/** Choáng: lửa vàng bung trên lá, vài tàn sáng quay trên đầu tướng rồi tan */
registerVfx("annieStunFlare",
    async (ctx) => {
        const k = kOf(ctx)
        const head = {
            x: ctx.from.x, y: ctx.from.y - CARD_H * .78
        }
        const ms = 760
        let clock = 0
        const orbit = (i: number) => () => ({
            x: head.x + Math.cos(clock + i * TAU / 3) * 46, y: head.y + Math.sin(clock + i * TAU / 3) * 14
        })
        await Promise.all([
            bloom(ctx.layer,
                head,
                WHITE,
                200 * k,
                300),
            flecks(ctx.layer,
                head,
                110,
                .9,
                22),
            ...[0,
                1,
                2].map(i => dustStream(ctx.layer,
                orbit(i),
                ms,
                240,
                {
                    color: [WHITE,
                        0xffe27a], speed: [2,
                        12], life: [120,
                        240], size: [8,
                        2], alpha: 1, flow: 6, drag: 3
                })),
            tween(ms,
                (t) => { clock = t * TAU * 1.6 },
                ease.linear,
                ctx.layer)
        ])
    })

/** Lửa xoáy thành từng nhánh quanh người, không khép kín nên không lộ vòng tròn; reach là độ xa khỏi lá */
function shieldSwirl(ctx: VfxCtx, ms: number, rate: number, reach: () => number) {
    const at = ctx.from
    let spin = rand(0,
        TAU)
    const arm = () => {
        const a = spin + pick([0,
            TAU / 3,
            TAU * 2 / 3]) + rand(-.78,
            .78)
        const out = reach() * rand(.66,
            1.24)
        return {
            x: at.x + Math.cos(a) * 88 * out, y: at.y + Math.sin(a) * 118 * out
        }
    }
    const swirl = {
        at: () => at, spin: 4.6
    }
    return Promise.all([
        fireStream(ctx.layer,
            arm,
            ms,
            rate,
            {
                speed: [6,
                    40], angle: ALL, life: [220,
                    440], size: [36,
                    11], gravity: -30, curl: 26, alpha: .86, swirl
            }),
        fireStream(ctx.layer,
            arm,
            ms,
            rate * .5,
            {
                ramp: "core", speed: [4,
                    26], angle: ALL, life: [140,
                    280], size: [24,
                    7], gravity: -20, curl: 16, swirl
            }),
        tween(ms,
            (t) => { spin = t * ms / 1000 * 5.2 },
            ease.linear,
            ctx.layer)
    ])
}

/** E mở màn: lửa cam vàng cuộn xoáy kín quanh Annie như icon gốc; đủ dày là báo nhịp */
registerVfx("annieShieldForm",
    async (ctx) => {
        const ms = 340
        let u = 0
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                FLAME,
                330,
                420),
            shieldSwirl(ctx,
                ms,
                1100,
                () => lerp(1.5,
                    1,
                    u)),
            tween(ms,
                (t) => { u = t },
                ease.out,
                ctx.layer).then(() => ctx.onBeat?.())
        ])
    })

/** E: Khiên đã dựng, lửa còn cuộn quanh Annie rồi tắt dần */
registerVfx("annieShieldLock",
    async (ctx) => {
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                WHITE,
                240,
                260),
            shieldSwirl(ctx,
                640,
                620,
                () => 1),
            flecks(ctx.layer,
                ctx.from,
                90,
                1,
                60)
        ])
    })

/** E: Khiên đỡ đòn, lửa toé mạnh và tàn sắc bắn ra */
registerVfx("annieShieldBlock",
    async (ctx) => {
        ctx.shake(3,
            150)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                GOLD,
                300,
                280),
            shieldSwirl(ctx,
                260,
                900,
                () => 1.05),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 130, color: SPARKS, speed: [260,
                        720], drag: 3, flow: 20, life: [160,
                        340], size: [20,
                        6], alpha: 1, blade: true, spread: 34
                })
        ])
    })

/** E: lằn lửa quất nhanh từ Annie tới mục tiêu; chạm là báo nhịp. Mục tiêu là chính Annie (bản Khiên cũ của engine) thì báo nhịp ngay */
registerVfx("annieFireLash",
    async (ctx) => {
        const ms = 230
        await Promise.all((ctx.to.length ? ctx.to : [ctx.from]).map(async (to) => {
            const dx = to.x - ctx.from.x, dy = to.y - ctx.from.y
            const len = Math.hypot(dx,
                dy)
            if (len < 24) {
                ctx.onBeat?.()
                return
            }
            let p = {
                ...ctx.from
            }
            await Promise.all([
                fireStream(ctx.layer,
                    () => around(p,
                        9),
                    ms,
                    1500,
                    {
                        speed: [6,
                            40], angle: ALL, life: [150,
                            340], size: [28,
                            8], gravity: -70, curl: 34
                    }),
                fireStream(ctx.layer,
                    () => around(p,
                        5),
                    ms,
                    760,
                    {
                        ramp: "core", speed: [4,
                            24], angle: ALL, life: [90,
                            200], size: [20,
                            6], gravity: -30, curl: 16
                    }),
                dustStream(ctx.layer,
                    () => around(p,
                        12),
                    ms,
                    420,
                    {
                        color: SPARKS, speed: [20,
                            110], life: [240,
                            560], size: [5,
                            1.3], alpha: 1, flow: 60, gravity: -80
                    }),
                tween(ms,
                    (t) => {
                        const swing = Math.sin(t * TAU) * Math.min(70,
                            len * .14) * (1 - t)
                        p = {
                            x: lerp(ctx.from.x,
                                to.x,
                                t) - dy / len * swing, y: lerp(ctx.from.y,
                                to.y,
                                t) + dx / len * swing
                        }
                    },
                    ease.in,
                    ctx.layer).then(() => ctx.onBeat?.())
            ])
        }))
    })

/** E trúng: lằn lửa nổ đét trên lá */
registerVfx("annieLashHit",
    async (ctx) => {
        const at = ctx.from
        ctx.shake(3,
            140)
        await Promise.all([
            bloom(ctx.layer,
                at,
                FLAME,
                260,
                280),
            fireBurst(ctx.layer,
                at,
                130,
                {
                    speed: [120,
                        380], angle: ALL, life: [200,
                        440], size: [30,
                        8], gravity: -210, drag: 2.3, curl: 70, spread: 22
                }),
            flecks(ctx.layer,
                at,
                110,
                1,
                20)
        ])
    })

/** Hàng địch: lấy từ `to`, không có thì suy từ phía đối diện */
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

/** Bóng gấu bông: các khối mềm (x, y, rx, ry, trọng số) theo đơn vị bề ngang thân: đầu, hai tai, thân, hai tay, hai chân */
const BEAR = [
    [0,
        -.78,
        .46,
        .42,
        3],
    [-.42,
        -1.16,
        .17,
        .17,
        1],
    [.42,
        -1.16,
        .17,
        .17,
        1],
    [0,
        .06,
        .56,
        .58,
        5],
    [-.78,
        -.06,
        .42,
        .17,
        1.4],
    [.78,
        -.06,
        .42,
        .17,
        1.4],
    [-.32,
        .84,
        .22,
        .36,
        1.4],
    [.32,
        .84,
        .22,
        .36,
        1.4]
]
const BEAR_WEIGHT = BEAR.reduce((sum, part) => sum + part[4],
    0)
/** Một điểm ngẫu nhiên trong thân gấu; hai số ngẫu nhiên cộng lại nên viền loang, không có mép */
function bearPt(at: Pt, size: number): Pt {
    let roll = Math.random() * BEAR_WEIGHT
    let part = BEAR[0]
    for (const candidate of BEAR) {
        part = candidate
        roll -= candidate[4]
        if (roll <= 0) break
    }
    const a = rand(0,
            TAU), d = Math.sqrt(Math.random())
    return {
        x: at.x + (part[0] + Math.cos(a) * d * part[2]) * size, y: at.y + (part[1] + Math.sin(a) * d * part[3]) * size
    }
}

/** Chỗ Tibbers đứng: cạnh lá token phía giữa bàn, vì ngay trên lá là hàng tướng */
const bearSpot = (ctx: VfxCtx, slot: Pt): Pt => ({
    x: slot.x + (slot.x > ctx.app.screen.width / 2 ? -1 : 1) * BEAR_OFFSET, y: slot.y - 6
})

/** Thân gấu một nhịp: than nâu cháy xém, lửa chỉ lộ qua đường may giữa ngực và mép người để không che mất dáng gấu */
function bearBody(ctx: VfxCtx, at: () => Pt, size: number, ms: number, rate: number) {
    const seam = () => {
        const c = at()
        return {
            x: c.x + rand(-.05,
                .05) * size, y: c.y + rand(-.36,
                .5) * size
        }
    }
    return Promise.all([
        dustStream(ctx.layer,
            () => bearPt(at(),
                size * .96),
            ms,
            rate,
            {
                color: PLUSH, speed: [1,
                    8], life: [240,
                    440], size: [size * .24,
                    size * .17], drag: 3, flow: 5, alpha: 1, additive: false
            }),
        fireStream(ctx.layer,
            () => bearPt(at(),
                size * 1.04),
            ms,
            rate * .16,
            {
                ramp: "char", speed: [2,
                    16], life: [240,
                    420], size: [size * .26,
                    size * .12], gravity: -24, curl: 10, alpha: .9
            }),
        fireStream(ctx.layer,
            seam,
            ms,
            rate * .1,
            {
                ramp: "core", speed: [10,
                    50], life: [130,
                    260], size: [size * .2,
                    size * .07], gravity: -90, curl: 18
            }),
        fireStream(ctx.layer,
            () => bearPt(at(),
                size * 1.14),
            ms,
            rate * .07,
            {
                speed: [30,
                    100], life: [180,
                    380], size: [size * .2,
                    size * .06], gravity: -210, curl: 50, alpha: .8
            })
    ])
}

/** Quầng nóng sau lưng cho dáng tối nổi trên nền, cùng mắt nút đỏ, mắt lửa, miệng rực nằm trên lớp than */
function bearFace(ctx: VfxCtx, at: Pt, size: number) {
    const back = makeSprite(ctx.layer,
        "glow",
        at.x,
        at.y,
        FLAME,
        size * 4.4)
    back.alpha = .38
    const face = [
        [-.17,
            -.84,
            .42,
            RED_EYE],
        [.17,
            -.84,
            .36,
            GOLD],
        [0,
            -.58,
            .4,
            FLAME]
    ].map(([x,
        y,
        d,
        tint]) => ({
        x, y, sprite: makeSprite(ctx.layer,
            "glow",
            at.x,
            at.y,
            tint,
            size * d)
    }))
    return {
        /** Hạt mới sinh sau sẽ đè lên mặt nên mỗi nhịp đưa mặt lên trên cùng */
        place(p: Pt) {
            if (ctx.layer.destroyed) return
            back.position.set(p.x,
                p.y)
            for (const part of face) {
                part.sprite.position.set(p.x + part.x * size,
                    p.y + part.y * size)
                ctx.layer.addChild(part.sprite)
            }
        },
        hide() {
            for (const s of [back,
                ...face.map(part => part.sprite)]) if (!s.destroyed) s.visible = false
        }
    }
}

/** Tibbers đứng dậy trong lửa rồi tan vào quầng lửa trên sân */
async function bearRise(ctx: VfxCtx, at: Pt, size: number, ms: number) {
    const face = bearFace(ctx,
        at,
        size)
    const body = bearBody(ctx,
        () => at,
        size,
        ms,
        2600)
    face.place(at)
    await Promise.all([
        body,
        tween(ms,
            () => face.place(at),
            ease.linear,
            ctx.layer).then(() => face.hide())
    ])
}

/** R: from là ô Triệu hồi phụ, to là hàng địch. Than và khói xoáy tụ về ô rồi Tibbers đổ sập xuống; báo nhịp đúng lúc chạm, lửa nở dọc cả hàng địch cùng khoảnh khắc */
registerVfx("annieTibbersCrash",
    async (ctx) => {
        const k = kOf(ctx)
        const slot = ctx.from
        const row = rowOf(ctx)
        const centre = {
            x: (row.x0 + row.x1) / 2, y: row.y
        }
        const half = (row.x1 - row.x0) / 2
        const gatherMs = 560
        const fallMs = 170
        let drop = {
            x: slot.x, y: slot.y - 420
        }
        const swirl = {
            at: () => slot, spin: 3.4, pull: 2.6
        }
        const gather = Promise.all([
            dustStream(ctx.layer,
                () => around(slot,
                    170),
                gatherMs,
                34,
                {
                    puff: true, color: SMOKE, speed: [6,
                        30], gravity: -20, life: [500,
                        900], size: [90,
                        190], alpha: .5, flow: 18, additive: false
                }),
            fireStream(ctx.layer,
                () => around(slot,
                    190),
                gatherMs,
                520,
                {
                    speed: [4,
                        30], angle: ALL, life: [240,
                        420], size: [26,
                        7], gravity: 0, curl: 30, swirl
                }),
            dustStream(ctx.layer,
                () => around(slot,
                    200),
                gatherMs,
                520,
                {
                    color: SPARKS, speed: [40,
                        140], life: [300,
                        560], size: [5,
                        1.3], alpha: 1, flow: 60
                })
        ])
        await tween(gatherMs,
            () => {},
            ease.linear,
            ctx.layer)
        const falling = Promise.all([
            fireStream(ctx.layer,
                () => around(drop,
                    34),
                fallMs,
                1100,
                {
                    speed: [10,
                        60], angle: ALL, life: [140,
                        280], size: [44,
                        12], gravity: -200, curl: 40
                }),
            fireStream(ctx.layer,
                () => around(drop,
                    26),
                fallMs,
                420,
                {
                    ramp: "char", speed: [10,
                        50], angle: ALL, life: [160,
                        320], size: [48,
                        16], gravity: -120, curl: 30
                })
        ])
        await tween(fallMs,
            (t) => {
                drop = {
                    x: slot.x, y: lerp(slot.y - 420,
                        slot.y,
                        t)
                }
            },
            ease.in,
            ctx.layer)
        ctx.shake(13,
            520)
        ctx.onBeat?.()
        const span = () => ({
            x: centre.x + (rand(-1,
                1) + rand(-1,
                1)) * .55 * half,
            y: row.y + (rand(-1,
                1) + rand(-1,
                1)) * 58
        })
        await Promise.all([
            gather,
            falling,
            bloom(ctx.layer,
                slot,
                FLAME,
                480 * k,
                420),
            bloom(ctx.layer,
                slot,
                WHITE,
                240 * k,
                240),
            haze(ctx.layer,
                slot,
                260,
                .5),
            fireBurst(ctx.layer,
                slot,
                240,
                {
                    speed: [190,
                        560], angle: ALL, life: [200,
                        440], size: [38,
                        12], gravity: -240, drag: 2.3, curl: 80, spread: 40
                }),
            dustBurst(ctx.layer,
                slot,
                {
                    count: 420, color: SPARKS, speed: [140,
                        760], gravity: -130, drag: 1.5, flow: 80, life: [480,
                        1100], size: [6,
                        1.4], alpha: 1, spread: 40
                }),
            bearRise(ctx,
                bearSpot(ctx,
                    slot),
                100,
                900),
            bloom(ctx.layer,
                centre,
                FLAME,
                1000 * k,
                520),
            fireStream(ctx.layer,
                span,
                300,
                2000,
                {
                    speed: [130,
                        520], angle: UP, life: [260,
                        560], size: [52,
                        13], gravity: -320, drag: 1.4, curl: 90, alpha: .66
                }),
            fireStream(ctx.layer,
                span,
                210,
                640,
                {
                    ramp: "core", speed: [90,
                        320], angle: UP, life: [150,
                        310], size: [34,
                        9], gravity: -240, drag: 1.5, curl: 50, alpha: .76
                })
        ])
    })

/** R trúng từng tướng: lửa vàng bùng lên từ chân lá */
registerVfx("annieInfernoHit",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        const base = () => ({
            x: at.x + rand(-.8,
                .8) * CARD_W, y: at.y + CARD_H - Math.pow(Math.random(),
                1.6) * CARD_H * 1.7
        })
        await Promise.all([
            bloom(ctx.layer,
                at,
                FLAME,
                260 * k,
                320),
            fireStream(ctx.layer,
                base,
                300,
                640,
                {
                    speed: [90,
                        280], life: [260,
                        520], size: [34 * k,
                        9], gravity: -300, curl: 80
                }),
            fireStream(ctx.layer,
                base,
                220,
                240,
                {
                    ramp: "core", speed: [50,
                        170], life: [140,
                        280], size: [24 * k,
                        7], gravity: -220, curl: 40
                }),
            flecks(ctx.layer,
                at,
                130,
                1,
                54)
        ])
    })

/** Tibbers trên sân: gấu than nhỏ đứng cạnh ô phụ, lửa cháy quanh mép lá như quầng lửa gốc. Có ctx.tether thì bám lá tới khi được thả */
registerVfx("annieTibbersAura",
    async (ctx) => {
        const at = () => ctx.tether?.target() ?? ctx.from
        const limit = ctx.tether ? AURA_MAX_MS : AURA_DEFAULT_MS
        const spot = () => bearSpot(ctx,
            at())
        const face = bearFace(ctx,
            spot(),
            BEAR_SIZE)
        // chỉ sinh ở mép ngoài để chữ và thanh máu trên lá vẫn đọc được
        const rim = () => {
            const c = at()
            const side = Math.random()
            const across = rand(-1,
                1)
            if (side < .4) return {
                x: c.x + across * TOKEN_W, y: c.y + TOKEN_H
            }
            const flip = side < .7 ? -1 : 1
            return {
                x: c.x + flip * TOKEN_W, y: c.y + across * TOKEN_H
            }
        }
        const pieces: Promise<unknown>[] = []
        let el = 0
        while (!ctx.layer.destroyed && !ctx.tether?.released() && el < limit) {
            pieces.push(bearBody(ctx,
                spot,
                BEAR_SIZE,
                LOOP_MS,
                1000),
            fireStream(ctx.layer,
                rim,
                LOOP_MS,
                110,
                {
                    speed: [30,
                        100], life: [220,
                        440], size: [20,
                        6], gravity: -190, curl: 50, alpha: .8
                }),
            dustStream(ctx.layer,
                rim,
                LOOP_MS,
                60,
                {
                    color: SPARKS, speed: [14,
                        70], angle: UP, gravity: -100, drag: 1, flow: 50, life: [360,
                        800], size: [4.4,
                        1.2], alpha: 1
                }))
            await tween(LOOP_MS,
                () => face.place(spot()),
                ease.linear,
                ctx.layer)
            el += LOOP_MS
        }
        face.hide()
        await Promise.all(pieces)
    })

/** Tibbers vồ: khối than lửa lao từ ô phụ tới mục tiêu; chạm là báo nhịp */
registerVfx("annieTibbersLeap",
    async (ctx) => {
        const to = ctx.to[0] ?? ctx.from
        const ms = 300
        let p = {
            ...ctx.from
        }
        const lift = Math.min(90,
            Math.hypot(to.x - ctx.from.x,
                to.y - ctx.from.y) * .16)
        const glow = headGlow(ctx,
            12)
        await Promise.all([
            fireStream(ctx.layer,
                () => around(p,
                    28),
                ms,
                520,
                {
                    ramp: "char", speed: [10,
                        50], angle: ALL, life: [200,
                        380], size: [46,
                        16], gravity: -70, curl: 26, alpha: .9
                }),
            fireStream(ctx.layer,
                () => around(p,
                    26),
                ms,
                760,
                {
                    speed: [10,
                        70], angle: ALL, life: [180,
                        360], size: [34,
                        10], gravity: -140, curl: 40
                }),
            dustStream(ctx.layer,
                () => around(p,
                    26),
                ms,
                260,
                {
                    color: SPARKS, speed: [20,
                        110], gravity: -90, life: [300,
                        640], size: [5,
                        1.3], alpha: 1, flow: 60
                }),
            tween(ms,
                (t) => {
                    p = {
                        x: lerp(ctx.from.x,
                            to.x,
                            t), y: lerp(ctx.from.y,
                            to.y,
                            t) - Math.sin(t * Math.PI) * lift
                    }
                    glow.move(p)
                },
                ease.in,
                ctx.layer).then(() => {
                glow.fade()
                ctx.onBeat?.()
            })
        ])
    })

/** Vuốt Tibbers: ba đường cào sắc viền lửa cắt chéo lá; ctx.amount > 0 là mục tiêu Choáng, cào sâu hơn */
registerVfx("annieClawHit",
    async (ctx) => {
        const power = (ctx.amount ?? 0) > 0 ? 1.35 : 1
        const at = ctx.from
        const dir = Math.PI * .36
        const ux = Math.cos(dir), uy = Math.sin(dir)
        const length = 210 * power
        ctx.shake(6 * power,
            220)
        const rake = async (offset: number, delay: number) => {
            await tween(delay,
                () => {},
                ease.linear,
                ctx.layer)
            let u = 0
            const on = () => ({
                x: at.x + ux * (u - .5) * length - uy * offset, y: at.y + uy * (u - .5) * length + ux * offset
            })
            await Promise.all([
                dustStream(ctx.layer,
                    on,
                    110,
                    1500,
                    {
                        color: [WHITE,
                            0xffe27a,
                            GOLD], speed: [40,
                            160], angle: [dir - .1,
                            dir + .1], drag: 4, flow: 6, life: [150,
                            300], size: [34 * power,
                            10], alpha: 1, blade: true, spread: 3
                    }),
                fireStream(ctx.layer,
                    on,
                    110,
                    640,
                    {
                        speed: [20,
                            90], angle: ALL, life: [180,
                            360], size: [24,
                            7], gravity: -180, curl: 40
                    }),
                tween(110,
                    (t) => { u = t },
                    ease.out,
                    ctx.layer)
            ])
        }
        await Promise.all([
            haze(ctx.layer,
                at,
                150),
            bloom(ctx.layer,
                at,
                FLAME,
                320 * power,
                320),
            rake(-44,
                1),
            rake(0,
                34),
            rake(44,
                68),
            flecks(ctx.layer,
                at,
                Math.round(150 * power),
                1.1,
                44)
        ])
    })

/** Tibbers trúng đòn: bông cháy và than bắn khỏi người gấu */
registerVfx("annieTibbersHurt",
    async (ctx) => {
        const at = ctx.from
        await Promise.all([
            fireBurst(ctx.layer,
                at,
                90,
                {
                    ramp: "char", speed: [90,
                        300], angle: ALL, life: [260,
                        520], size: [30,
                        11], gravity: -60, drag: 2.2, curl: 40, spread: 24
                }),
            flecks(ctx.layer,
                at,
                100,
                .9,
                24)
        ])
    })
