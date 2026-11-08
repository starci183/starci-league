// Bộ hạt bụi mịn dùng chung: hàng nghìn hạt mềm trôi theo luồng, sương mù và quầng sáng. Dùng thay nét vẽ, vòng tròn, hình khối để VFX trông thật.
//   dustBurst(layer, pt, opts): Promise          -> nổ một lần `count` hạt
//   dustStream(layer, getPt, ms, perSec, opts)   -> phát liên tục tại getPt(); resolve khi hạt cuối tắt
//   mist(layer, pt, opts): Promise               -> vài cụm sương lớn, mềm, loang ra rồi tan
//   bloom(layer, pt, color, size, ms): Promise   -> quầng sáng mềm
// Mọi màu dùng mảng để hạt lệch màu tự nhiên. flow = độ mạnh luồng xoáy (px/s), hạt không bay thẳng nên không lộ hình học.
import {
    Container, Particle, ParticleContainer, Texture, Ticker, type Sprite
} from "pixi.js"
import {
    lerp, makeSprite, pick, rand
} from "./particles"
import type {
    Pt
} from "./types"

export interface DustOpts {
    color: number[];
    /** Tốc độ ban đầu (px/s) */
    speed?: [number, number];
    /** Hướng bay (rad); mặc định mọi hướng */
    angle?: [number, number];
    /** Trọng lực px/s² (+ là rơi xuống, - là bay lên) */
    gravity?: number;
    /** Lực cản 0..: càng lớn hạt càng nhanh dừng */
    drag?: number;
    /** Độ mạnh luồng xoáy px/s */
    flow?: number;
    life?: [number, number];
    /** Đường kính lúc đầu và lúc cuối (px); bụi mịn nên 2 tới 7 */
    size?: [number, number];
    /** Độ mờ tối đa */
    alpha?: number;
    /** Bán kính rải điểm xuất phát */
    spread?: number;
    /** Hạt thành vệt dài mảnh nằm theo hướng bay, độ dài = số lần cỡ hạt (gió, tia nước, tốc độ); mặc định hạt tròn */
    streak?: number;
    /** Mảnh sắc viền cứng như lưỡi dao, nằm theo hướng bay (đòn chém, đâm, tia lửa kim loại) */
    blade?: boolean;
    /** Hạt sương lớn thay vì hạt bụi */
    puff?: boolean;
    additive?: boolean;
}
export interface DustBurstOpts extends DustOpts { count: number }

/** Texture hạt mềm nên phần nhìn thấy chỉ bằng lõi: nhân cỡ để hạt đúng đường kính khai báo */
const DUST_SCALE = 2.8
/** Trần số hạt đang sống của toàn bộ bộ bụi */
const MAX_DUST = 14000
let liveDust = 0
/** Tự giảm hạt khi máy yếu: dưới 55 FPS bớt dần, tối thiểu còn 30% số hạt, để trận không giật */
const quality = () => Math.max(.3,
    Math.min(1,
        (Ticker.shared.FPS - 25) / 30))

/** Texture bụi: hạt tròn rất mềm */
function softTexture(): Texture {
    const S = 32
    const c = document.createElement("canvas")
    c.width = S
    c.height = S
    const g = c.getContext("2d")
    if (g) {
        const grad = g.createRadialGradient(S / 2,
            S / 2,
            0,
            S / 2,
            S / 2,
            S / 2)
        grad.addColorStop(0,
            "rgba(255,255,255,1)")
        grad.addColorStop(.3,
            "rgba(255,255,255,.62)")
        grad.addColorStop(.65,
            "rgba(255,255,255,.14)")
        grad.addColorStop(1,
            "rgba(255,255,255,0)")
        g.fillStyle = grad
        g.fillRect(0,
            0,
            S,
            S)
    }
    return Texture.from(c)
}

/** Texture sương: nhiều đốm mềm chồng nhau, viền không đều */
function puffTexture(): Texture {
    const S = 128
    const c = document.createElement("canvas")
    c.width = S
    c.height = S
    const g = c.getContext("2d")
    if (g) {
        for (let i = 0; i < 70; i++) {
            const a = Math.random() * Math.PI * 2
            const d = Math.pow(Math.random(),
                .7) * S * .3
            const x = S / 2 + Math.cos(a) * d
            const y = S / 2 + Math.sin(a) * d
            const r = rand(S * .1,
                S * .24)
            const grad = g.createRadialGradient(x,
                y,
                0,
                x,
                y,
                r)
            grad.addColorStop(0,
                "rgba(255,255,255,.26)")
            grad.addColorStop(1,
                "rgba(255,255,255,0)")
            g.fillStyle = grad
            g.fillRect(0,
                0,
                S,
                S)
        }
    }
    return Texture.from(c)
}

/** Texture mảnh sắc: thoi mảnh, viền cứng, không loang */
function bladeTexture(): Texture {
    const W = 64, H = 12
    const c = document.createElement("canvas")
    c.width = W
    c.height = H
    const g = c.getContext("2d")
    if (g) {
        g.fillStyle = "#fff"
        g.beginPath()
        g.moveTo(0,
            H / 2)
        g.lineTo(W * .62,
            0)
        g.lineTo(W,
            H / 2)
        g.lineTo(W * .62,
            H)
        g.closePath()
        g.fill()
    }
    return Texture.from(c)
}

let soft: Texture | undefined
let blade: Texture | undefined
let puff: Texture | undefined
const softTex = () => (soft ??= softTexture())
const puffTex = () => (puff ??= puffTexture())

/** Luồng xoáy giả: tổng vài sóng lệch pha, đủ để hạt uốn lượn tự nhiên */
function flowAt(x: number, y: number, t: number): Pt {
    return {
        x: Math.sin(y * .017 + t * 1.9) + .6 * Math.sin((x + y) * .011 - t * 1.3),
        y: Math.cos(x * .015 - t * 1.6) + .6 * Math.cos((x - y) * .013 + t * 1.1)
    }
}

interface Mote { p: Particle; vx: number; vy: number; age: number; life: number; s0: number; s1: number; a: number; spin: number }

function makeHost(layer: Container, tex: Texture, additive: boolean) {
    const host = new ParticleContainer({
        texture: tex,
        dynamicProperties: {
            position: true, vertex: true, rotation: true, color: true
        }
    })
    host.blendMode = additive ? "add" : "normal"
    layer.addChild(host)
    return host
}

function emit(host: ParticleContainer, tex: Texture, pt: Pt, o: DustOpts, list: Mote[]) {
    if (liveDust >= MAX_DUST || Math.random() > quality()) return
    const [sp0,
        sp1] = o.speed ?? [20,
        120]
    const [an0,
        an1] = o.angle ?? [0,
        Math.PI * 2]
    const [l0,
        l1] = o.life ?? [500,
        1100]
    const [z0,
        z1] = o.size ?? [5,
        2]
    const ang = rand(an0,
        an1)
    const spd = rand(sp0,
        sp1)
    const r = Math.sqrt(Math.random()) * (o.spread ?? 0)
    const pa = Math.random() * Math.PI * 2
    const k = rand(.55,
        1.45)
    const p = new Particle({
        texture: tex, anchorX: .5, anchorY: .5,
        x: pt.x + Math.cos(pa) * r, y: pt.y + Math.sin(pa) * r,
        tint: pick(o.color), alpha: 0, rotation: rand(0,
            Math.PI * 2)
    })
    host.addParticle(p)
    liveDust++
    list.push({
        p, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, age: 0, life: rand(l0,
            l1),
        s0: z0 * k * (o.puff || o.blade ? 1 : DUST_SCALE) / tex.width,
        s1: z1 * k * (o.puff || o.blade ? 1 : DUST_SCALE) / tex.width, a: (o.alpha ?? .9) * rand(.55,
            1),
        spin: o.puff ? rand(-.7,
            .7) : 0
    })
}

function run(layer: Container, host: ParticleContainer, list: Mote[], o: DustOpts, more: (dt: number) => boolean): Promise<void> {
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
            liveDust = Math.max(0,
                liveDust - list.length)
            list.length = 0
            if (!host.destroyed) host.destroy()
            resolve()
        }
        const gravity = o.gravity ?? 0
        const drag = o.drag ?? 1.4
        const flow = o.flow ?? 60
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
                    liveDust--
                    removed = true
                    continue
                }
                const f = flowAt(m.p.x,
                    m.p.y,
                    clock)
                m.vy += gravity * dt
                m.vx *= keep
                m.vy *= keep
                m.p.x += (m.vx + f.x * flow) * dt
                m.p.y += (m.vy + f.y * flow) * dt
                m.p.rotation += m.spin * dt
                const sc = lerp(m.s0,
                    m.s1,
                    t)
                if (o.blade) {
                    m.p.rotation = Math.atan2(m.vy + f.y * flow,
                        m.vx + f.x * flow)
                    m.p.scaleX = sc
                    m.p.scaleY = sc
                } else if (o.streak) {
                    m.p.rotation = Math.atan2(m.vy + f.y * flow,
                        m.vx + f.x * flow)
                    m.p.scaleX = sc * o.streak
                    m.p.scaleY = sc * .32
                } else {
                    m.p.scaleX = sc
                    m.p.scaleY = sc
                }
                // hiện lên nhanh, tan chậm, không tắt đột ngột
                m.p.alpha = m.a * Math.min(1,
                    t * 9) * Math.pow(1 - t,
                    1.5)
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

const bladeTex = () => (blade ??= bladeTexture())
const texOf = (o: DustOpts) => (o.blade ? bladeTex() : o.puff ? puffTex() : softTex())

export function dustBurst(layer: Container, pt: Pt, o: DustBurstOpts): Promise<void> {
    if (layer.destroyed) return Promise.resolve()
    const tex = texOf(o)
    const host = makeHost(layer,
        tex,
        o.additive !== false)
    const list: Mote[] = []
    for (let i = 0; i < o.count; i++) emit(host,
        tex,
        pt,
        o,
        list)
    return run(layer,
        host,
        list,
        o,
        () => false)
}

export function dustStream(layer: Container, getPt: () => Pt, ms: number, perSec: number, o: DustOpts): Promise<void> {
    if (layer.destroyed) return Promise.resolve()
    const tex = texOf(o)
    const host = makeHost(layer,
        tex,
        o.additive !== false)
    const list: Mote[] = []
    let el = 0
    let acc = 0
    return run(layer,
        host,
        list,
        o,
        (d) => {
            if (el >= ms) return false
            el += d
            acc += d / 1000 * perSec
            while (acc >= 1) {
                acc -= 1
                emit(host,
                    tex,
                    getPt(),
                    o,
                    list)
            }
            return el < ms
        })
}

/** Cụm sương mềm: size là đường kính cụm */
export function mist(layer: Container, pt: Pt, o: { color: number[]; size: number; count?: number; life?: [number, number]; alpha?: number; speed?: [number, number]; gravity?: number; additive?: boolean }): Promise<void> {
    return dustBurst(layer,
        pt,
        {
            count: o.count ?? 12, puff: true, color: o.color, size: [o.size * .55,
                o.size * 1.2], life: o.life ?? [520,
                1000],
            alpha: o.alpha ?? .5, speed: o.speed ?? [10,
                70], spread: o.size * .28, flow: 22, drag: 1.2, gravity: o.gravity, additive: o.additive
        })
}

/** Quầng sáng mềm: phình rồi tan, không có viền */
export function bloom(layer: Container, pt: Pt, color: number, size: number, ms = 360): Promise<void> {
    return new Promise((resolve) => {
        const s: Sprite = makeSprite(layer,
            "glow",
            pt.x,
            pt.y,
            color,
            size * .4)
        let el = 0
        let done = false
        const finish = () => {
            if (done) return
            done = true
            Ticker.shared.remove(tick)
            layer.off("destroyed",
                finish)
            if (!s.destroyed) s.destroy()
            resolve()
        }
        const tick = (tk: Ticker) => {
            el += tk.deltaMS
            const t = Math.min(1,
                el / ms)
            if (s.destroyed) { finish(); return }
            const w = lerp(size * .4,
                size,
                1 - Math.pow(1 - t,
                    3))
            s.width = w
            s.height = w
            s.alpha = .42 * (1 - t) * (1 - t)
            if (t >= 1) finish()
        }
        layer.once("destroyed",
            finish)
        Ticker.shared.add(tick)
    })
}
