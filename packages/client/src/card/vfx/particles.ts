// Bộ hạt dùng chung cho các hiệu ứng PixiJS (fx_*.ts import từ đây).
//
// API (mọi toạ độ là px client; `layer` = ctx.layer):
//   tex(kind)                         -> Texture đã cache: "circle" | "glow" | "spark" | "ring" | "line" | "star" (64x64, trắng, tô màu bằng tint)
//   makeSprite(layer, kind, x, y, tint, size, additive?) -> Sprite đã thêm vào layer (tâm giữa, size = đường kính px)
//   burst(layer, pt, opts): Promise   -> nổ một lần `count` hạt; resolve khi hạt cuối tắt
//        opts: { count, kind?, color: number | number[], speed?: [min,max] px/s, angle?: [min,max] rad (mặc định cả vòng),
//                gravity?: px/s² (+y = xuống), drag?: 0..1 mỗi giây, life?: [min,max] ms, size?: [start,end] px,
//                alpha?: [start,end], spin?: rad/s, stretch?: boolean (xoay theo hướng bay, kéo dài), additive?: boolean (mặc định true),
//                spread?: bán kính ngẫu nhiên quanh pt }
//   stream(layer, getPt, ms, perSec, opts): Promise -> phát liên tục `ms` mili giây tại getPt() (đuôi đạn, khói...); opts như burst (không có count)
//   tween(ms, (t:0..1)=>void, easing?): Promise     -> chạy theo ticker, t đã qua easing; dùng để bay đạn, phóng to vòng sáng
//   ease.{linear,in,out,inOut,back,elastic}         -> hàm easing
//   sleep(ms), rand(a,b), pick(arr), lerp(a,b,t)
//   flash(layer, pt, color, size, ms): Promise      -> chớp sáng (glow phóng to rồi tắt)
//   ring(layer, pt, color, from, to, ms): Promise   -> vòng sóng giãn ra
//   line(layer, a, b, color, width, ms): Promise    -> tia sáng a->b mờ dần
//   particleCount()                                 -> số hạt đang sống (trần 1500; vượt trần thì burst/stream tự bỏ bớt hạt)
// Mọi sprite do helper tạo đều được destroy khi xong; texture cache dùng chung, không destroy.
// Tween/hạt tự huỷ callback khi xong hoặc khi chủ bị huỷ; không dừng Ticker.shared của ứng dụng khác.
import {
    Container, Sprite, Texture, Ticker
} from "pixi.js"
import type {
    Pt
} from "./types"

export type TexKind = "circle" | "glow" | "spark" | "ring" | "line" | "star"

export const MAX_PARTICLES = 1500
let live = 0
export const particleCount = () => live
const pending = new Set<() => void>()

export function clearParticles() {
    for (const cancel of [...pending]) cancel()
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]
export const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r,
    Math.max(0,
        ms)))

export const ease = {
    linear: (t: number) => t,
    in: (t: number) => t * t,
    out: (t: number) => 1 - (1 - t) * (1 - t),
    inOut: (t: number) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2,
        2) / 2),
    back: (t: number) => {
        const c = 1.70158
        return 1 + (c + 1) * Math.pow(t - 1,
            3) + c * Math.pow(t - 1,
            2)
    },
    elastic: (t: number) => (t === 0 || t === 1 ? t : Math.pow(2,
        -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1)
}

// ---------------- texture sinh bằng canvas 2D ----------------
const CACHE = new Map<TexKind, Texture>()
const S = 64

function radial(g: CanvasRenderingContext2D, stops: [number, number][], inner = 0) {
    const m = S / 2
    const grad = g.createRadialGradient(m,
        m,
        inner,
        m,
        m,
        m)
    for (const [o,
        a] of stops) grad.addColorStop(o,
        `rgba(255,255,255,${a})`)
    g.fillStyle = grad
    g.fillRect(0,
        0,
        S,
        S)
}

function draw(kind: TexKind): HTMLCanvasElement {
    const c = document.createElement("canvas")
    c.width = S
    c.height = S
    const g = c.getContext("2d")
    if (!g) return c
    const m = S / 2
    if (kind === "circle") {
        radial(g,
            [[0,
                1],
            [.55,
                .95],
            [1,
                0]])
    } else if (kind === "glow") {
        radial(g,
            [[0,
                1],
            [.25,
                .55],
            [1,
                0]])
    } else if (kind === "ring") {
        radial(g,
            [[0,
                0],
            [.7,
                1],
            [1,
                0]],
            m * .7)
    } else if (kind === "spark" || kind === "line") {
        const grad = g.createLinearGradient(0,
            0,
            S,
            0)
        grad.addColorStop(0,
            "rgba(255,255,255,0)")
        grad.addColorStop(.5,
            "rgba(255,255,255,1)")
        grad.addColorStop(1,
            "rgba(255,255,255,0)")
        g.fillStyle = grad
        g.beginPath()
        g.ellipse(m,
            m,
            m,
            kind === "spark" ? 5 : 2,
            0,
            0,
            Math.PI * 2)
        g.fill()
    } else {
        g.fillStyle = "#fff"
        g.beginPath()
        for (let i = 0; i < 8; i++) {
            const r = i % 2 ? m * .22 : m
            const a = i * Math.PI / 4 - Math.PI / 2
            const x = m + Math.cos(a) * r
            const y = m + Math.sin(a) * r
            if (i) g.lineTo(x,
                y)
            else g.moveTo(x,
                y)
        }
        g.closePath()
        g.fill()
    }
    return c
}

export function tex(kind: TexKind): Texture {
    let t = CACHE.get(kind)
    if (!t) {
        t = Texture.from(draw(kind))
        CACHE.set(kind,
            t)
    }
    return t
}

/** Chiều cao tương đối so với chiều rộng (hạt dạng thanh thì mảnh hơn) */
const ASPECT: Record<TexKind, number> = {
    circle: 1, glow: 1, ring: 1, star: 1, spark: .3, line: .12
}

export function makeSprite(layer: Container, kind: TexKind, x: number, y: number, tint: number, size: number, additive = true): Sprite {
    const s = new Sprite(tex(kind))
    s.anchor.set(.5)
    s.x = x
    s.y = y
    s.tint = tint
    s.width = size
    s.height = size * ASPECT[kind]
    if (additive) s.blendMode = "add"
    layer.addChild(s)
    return s
}

// ---------------- tween ----------------
export function tween(ms: number, fn: (t: number) => void, easing: (t: number) => number = ease.linear, owner?: Container): Promise<void> {
    return new Promise((resolve) => {
        let el = 0
        let done = false
        const finish = () => {
            if (done) return
            done = true
            Ticker.shared.remove(tick)
            owner?.off("destroyed",
                finish)
            pending.delete(finish)
            resolve()
        }
        const tick = (tk: Ticker) => {
            el += tk.deltaMS
            const t = Math.min(1,
                el / Math.max(1,
                    ms))
            try {
                fn(easing(t))
            } catch {
                finish()
                return
            }
            if (t >= 1) finish()
        }
        if (owner?.destroyed) { resolve(); return }
        pending.add(finish)
        owner?.once("destroyed",
            finish)
        Ticker.shared.add(tick)
    })
}

// ---------------- hạt ----------------
export interface ParticleOpts {
    kind?: TexKind;
    color: number | number[];
    speed?: [number, number];
    angle?: [number, number];
    gravity?: number;
    drag?: number;
    life?: [number, number];
    size?: [number, number];
    alpha?: [number, number];
    spin?: number;
    stretch?: boolean;
    additive?: boolean;
    spread?: number;
}
export interface BurstOpts extends ParticleOpts { count: number }

interface P { s: Sprite; vx: number; vy: number; age: number; life: number; s0: number; s1: number; a0: number; a1: number; spin: number }

function spawnP(layer: Container, pt: Pt, o: ParticleOpts, list: P[]) {
    if (layer.destroyed || live >= MAX_PARTICLES) return
    const cols = Array.isArray(o.color) ? o.color : [o.color]
    const [sp0,
        sp1] = o.speed ?? [60,
        220]
    const [an0,
        an1] = o.angle ?? [0,
        Math.PI * 2]
    const [l0,
        l1] = o.life ?? [350,
        700]
    const [z0,
        z1] = o.size ?? [10,
        2]
    const [a0,
        a1] = o.alpha ?? [1,
        0]
    const ang = rand(an0,
        an1)
    const spd = rand(sp0,
        sp1)
    const r = Math.random() * (o.spread ?? 0)
    const pa = Math.random() * Math.PI * 2
    const s = makeSprite(layer,
        o.kind ?? "circle",
        pt.x + Math.cos(pa) * r,
        pt.y + Math.sin(pa) * r,
        pick(cols),
        z0,
        o.additive !== false)
    const k = rand(.8,
        1.2)
    live++
    list.push({
        s,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        age: 0,
        life: rand(l0,
            l1),
        s0: z0 * k,
        s1: z1 * k,
        a0,
        a1,
        spin: (o.spin ?? 0) * rand(-1,
            1)
    })
}

function runParticles(layer: Container, list: P[], o: ParticleOpts, more: (dtMs: number) => boolean): Promise<void> {
    return new Promise((resolve) => {
        let done = false
        const finish = () => {
            if (done) return
            done = true
            Ticker.shared.remove(tick)
            layer.off("destroyed",
                finish)
            pending.delete(finish)
            for (const p of list) if (!p.s.destroyed) p.s.destroy()
            live = Math.max(0,
                live - list.length)
            list.length = 0
            resolve()
        }
        const g = o.gravity ?? 0
        const drag = o.drag ?? 0
        const asp = ASPECT[o.kind ?? "circle"]
        const tick = (tk: Ticker) => {
            if (layer.destroyed) { finish(); return }
            const dt = tk.deltaMS / 1000
            const going = more(tk.deltaMS)
            for (let i = list.length - 1; i >= 0; i--) {
                const p = list[i]
                p.age += tk.deltaMS
                const t = p.age / p.life
                if (t >= 1 || p.s.destroyed) {
                    if (!p.s.destroyed) p.s.destroy()
                    list.splice(i,
                        1)
                    live--
                    continue
                }
                p.vy += g * dt
                if (drag) {
                    const f = Math.max(0,
                        1 - drag * dt)
                    p.vx *= f
                    p.vy *= f
                }
                p.s.x += p.vx * dt
                p.s.y += p.vy * dt
                const sz = lerp(p.s0,
                    p.s1,
                    t)
                p.s.width = o.stretch ? sz * 2.2 : sz
                p.s.height = o.stretch ? sz * .5 : sz * asp
                if (o.stretch) p.s.rotation = Math.atan2(p.vy,
                    p.vx)
                else if (p.spin) p.s.rotation += p.spin * dt
                p.s.alpha = lerp(p.a0,
                    p.a1,
                    t)
            }
            if (!list.length && !going) {
                finish()
            }
        }
        if (layer.destroyed) { finish(); return }
        pending.add(finish)
        layer.once("destroyed",
            finish)
        Ticker.shared.add(tick)
    })
}

export function burst(layer: Container, pt: Pt, o: BurstOpts): Promise<void> {
    const list: P[] = []
    const n = Math.max(0,
        Math.min(o.count,
            MAX_PARTICLES - live))
    for (let i = 0; i < n; i++) {
        spawnP(layer,
            pt,
            o,
            list)
    }
    if (!list.length) return Promise.resolve()
    return runParticles(layer,
        list,
        o,
        () => false)
}

export function stream(layer: Container, getPt: () => Pt, ms: number, perSec: number, o: ParticleOpts): Promise<void> {
    const list: P[] = []
    let el = 0
    let acc = 0
    const more = (d: number) => {
        if (el >= ms) return false
        el += d
        acc += d / 1000 * perSec
        while (acc >= 1) {
            acc -= 1
            spawnP(layer,
                getPt(),
                o,
                list)
        }
        return el < ms
    }
    return runParticles(layer,
        list,
        o,
        more)
}

// ---------------- hình dựng sẵn ----------------
export async function flash(layer: Container, pt: Pt, color: number, size: number, ms = 260): Promise<void> {
    const s = makeSprite(layer,
        "glow",
        pt.x,
        pt.y,
        color,
        size * .3)
    await tween(ms,
        (t) => {
            const z = lerp(size * .3,
                size,
                t)
            s.width = z
            s.height = z
            s.alpha = 1 - t
        },
        ease.out,
        layer)
    if (!s.destroyed) s.destroy()
}

export async function ring(layer: Container, pt: Pt, color: number, from: number, to: number, ms = 400): Promise<void> {
    const s = makeSprite(layer,
        "ring",
        pt.x,
        pt.y,
        color,
        from)
    await tween(ms,
        (t) => {
            const z = lerp(from,
                to,
                t)
            s.width = z
            s.height = z
            s.alpha = 1 - t
        },
        ease.out,
        layer)
    if (!s.destroyed) s.destroy()
}

export async function line(layer: Container, a: Pt, b: Pt, color: number, width: number, ms = 220): Promise<void> {
    const len = Math.hypot(b.x - a.x,
        b.y - a.y)
    const s = makeSprite(layer,
        "line",
        (a.x + b.x) / 2,
        (a.y + b.y) / 2,
        color,
        len)
    s.rotation = Math.atan2(b.y - a.y,
        b.x - a.x)
    await tween(ms,
        (t) => {
            s.alpha = 1 - t
            s.height = width * (1 - t * .6)
        },
        ease.out,
        layer)
    if (!s.destroyed) s.destroy()
}
