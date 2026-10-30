// Hiệu ứng bay (travel) và trúng (impact) kiểu LoL cho chế độ thẻ bài. Tự chứa: không phụ thuộc particles.ts.
import {
    Assets, Container, Graphics, Sprite, Text, Texture
} from "pixi.js"
import type {
    Ticker
} from "pixi.js"
import {
    registerVfx
} from "./types"
import type {
    Pt, VfxCtx
} from "./types"

// ---------- tiện ích ----------
const rnd = (a: number, b: number): number => a + Math.random() * (b - a)
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const clamp = (v: number, a: number, b: number): number => Math.min(b,
    Math.max(a,
        v))
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)] as T
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t,
    3)
const easeIn = (t: number): number => Math.pow(t,
    1.6)
const easeInOut = (t: number): number => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2,
    2) / 2
const linear = (t: number): number => t

function mix(a: number, b: number, t: number): number {
    const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t)
    const g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t)
    const bl = Math.round((a & 255) * (1 - t) + (b & 255) * t)
    return (r << 16) | (g << 8) | bl
}

const col2Of = (c: VfxCtx): number => c.color2 ?? mix(c.color,
    0xffffff,
    0.5)

// ---------- texture sinh một lần, cache ----------
const TEX = new Map<string, Texture>()

function makeTex(key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D, w: number, h: number) => void): Texture {
    const hit = TEX.get(key)
    if (hit && !hit.destroyed) {
        return hit
    }
    const cv = document.createElement("canvas")
    cv.width = w
    cv.height = h
    const c = cv.getContext("2d")
    if (c) {
        draw(c,
            w,
            h)
    }
    const t = Texture.from(cv)
    TEX.set(key,
        t)
    return t
}

const glowTex = (): Texture => makeTex("glow",
    64,
    64,
    (c, w, h) => {
        const g = c.createRadialGradient(w / 2,
            h / 2,
            0,
            w / 2,
            h / 2,
            w / 2)
        g.addColorStop(0,
            "rgba(255,255,255,1)")
        g.addColorStop(0.25,
            "rgba(255,255,255,0.6)")
        g.addColorStop(0.6,
            "rgba(255,255,255,0.15)")
        g.addColorStop(1,
            "rgba(255,255,255,0)")
        c.fillStyle = g
        c.fillRect(0,
            0,
            w,
            h)
    })

const ringTex = (): Texture => makeTex("ring",
    128,
    128,
    (c, w, h) => {
        const g = c.createRadialGradient(w / 2,
            h / 2,
            0,
            w / 2,
            h / 2,
            w / 2)
        g.addColorStop(0,
            "rgba(255,255,255,0)")
        g.addColorStop(0.7,
            "rgba(255,255,255,0)")
        g.addColorStop(0.86,
            "rgba(255,255,255,1)")
        g.addColorStop(1,
            "rgba(255,255,255,0)")
        c.fillStyle = g
        c.fillRect(0,
            0,
            w,
            h)
    })

// Mũi nhọn hướng +x (tia lửa, mảnh băng)
const shardTex = (): Texture => makeTex("shard",
    64,
    32,
    (c, w, h) => {
        const g = c.createLinearGradient(0,
            0,
            w,
            0)
        g.addColorStop(0,
            "rgba(255,255,255,0.1)")
        g.addColorStop(0.5,
            "rgba(255,255,255,1)")
        g.addColorStop(1,
            "rgba(255,255,255,1)")
        c.fillStyle = g
        c.beginPath()
        c.moveTo(w,
            h / 2)
        c.lineTo(w * 0.32,
            2)
        c.lineTo(0,
            h / 2)
        c.lineTo(w * 0.32,
            h - 2)
        c.closePath()
        c.fill()
    })

// Lưỡi liềm mỏng, vồng lên trên
const crescentTex = (): Texture => makeTex("crescent",
    256,
    128,
    (c, w, h) => {
        const g = c.createLinearGradient(0,
            0,
            w,
            0)
        g.addColorStop(0,
            "rgba(255,255,255,0)")
        g.addColorStop(0.5,
            "rgba(255,255,255,1)")
        g.addColorStop(1,
            "rgba(255,255,255,0.05)")
        c.fillStyle = g
        c.beginPath()
        c.moveTo(0,
            h * 0.7)
        c.quadraticCurveTo(w / 2,
            -h * 0.35,
            w,
            h * 0.7)
        c.quadraticCurveTo(w / 2,
            h * 0.12,
            0,
            h * 0.7)
        c.closePath()
        c.fill()
    })

// Sao 4 cánh
const starTex = (): Texture => makeTex("star",
    128,
    128,
    (c, w, h) => {
        const cx = w / 2
        const cy = h / 2
        c.fillStyle = "rgba(255,255,255,1)"
        c.beginPath()
        for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4 - Math.PI / 2
            const r = i % 2 === 0 ? w / 2 : w * 0.07
            const x = cx + Math.cos(a) * r
            const y = cy + Math.sin(a) * r
            if (i === 0) {
                c.moveTo(x,
                    y)
            } else {
                c.lineTo(x,
                    y)
            }
        }
        c.closePath()
        c.fill()
        const g = c.createRadialGradient(cx,
            cy,
            0,
            cx,
            cy,
            w * 0.18)
        g.addColorStop(0,
            "rgba(255,255,255,1)")
        g.addColorStop(1,
            "rgba(255,255,255,0)")
        c.fillStyle = g
        c.fillRect(0,
            0,
            w,
            h)
    })

function spr(tex: Texture, tint: number, add: boolean, w: number, h?: number): Sprite {
    const s = new Sprite(tex)
    s.anchor.set(0.5)
    s.tint = tint
    if (add) {
        s.blendMode = "add"
    }
    s.width = w
    s.height = h ?? w * tex.height / tex.width
    return s
}

// ---------- hạt ----------
interface EmitOpts {
    tex?: Texture;
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    /** giây */
    life: number;
    /** kích thước (px theo chiều rộng texture) đầu / cuối đời */
    s0: number;
    s1?: number;
    a0?: number;
    tint: number;
    add?: boolean;
    g?: number;
    drag?: number;
    rot?: number;
    vr?: number;
    turn?: number;
    /** tỉ lệ cao/rộng */
    sy?: number;
    /** xoay theo hướng bay + kéo dài theo tốc độ */
    align?: boolean;
    stretch?: number;
    delay?: number;
}

interface Part {
    s: Sprite;
    vx: number;
    vy: number;
    age: number;
    life: number;
    g: number;
    drag: number;
    s0: number;
    s1: number;
    a0: number;
    tw: number;
    rot: number;
    vr: number;
    turn: number;
    sy: number;
    align: boolean;
    stretch: number;
}

class Emitter {
    private list: Part[] = []
    private root: Container

    constructor(root: Container) {
        this.root = root
    }

    emit(o: EmitOpts): void {
        const tex = o.tex ?? glowTex()
        const s = new Sprite(tex)
        s.anchor.set(0.5)
        s.tint = o.tint
        s.blendMode = o.add === false ? "normal" : "add"
        s.position.set(o.x,
            o.y)
        s.alpha = 0
        s.visible = false
        this.root.addChild(s)
        this.list.push({
            s,
            vx: o.vx ?? 0,
            vy: o.vy ?? 0,
            age: -(o.delay ?? 0),
            life: o.life,
            g: o.g ?? 0,
            drag: o.drag ?? 0,
            s0: o.s0,
            s1: o.s1 ?? o.s0,
            a0: o.a0 ?? 1,
            tw: tex.width,
            rot: o.rot ?? 0,
            vr: o.vr ?? 0,
            turn: o.turn ?? 0,
            sy: o.sy ?? 1,
            align: o.align ?? false,
            stretch: o.stretch ?? 0.004
        })
    }

    update(dt: number): void {
        for (let i = this.list.length - 1; i >= 0; i--) {
            const p = this.list[i]
            if (!p) {
                continue
            }
            p.age += dt
            if (p.age < 0) {
                continue
            }
            if (p.age >= p.life) {
                p.s.destroy()
                const last = this.list.pop()
                if (last && last !== p) {
                    this.list[i] = last
                }
                continue
            }
            const k = p.age / p.life
            if (p.turn !== 0) {
                const c = Math.cos(p.turn * dt)
                const sn = Math.sin(p.turn * dt)
                const nx = p.vx * c - p.vy * sn
                p.vy = p.vx * sn + p.vy * c
                p.vx = nx
            }
            if (p.drag > 0) {
                const f = Math.max(0,
                    1 - p.drag * dt)
                p.vx *= f
                p.vy *= f
            }
            p.vy += p.g * dt
            p.s.x += p.vx * dt
            p.s.y += p.vy * dt
            const size = lerp(p.s0,
                p.s1,
                k) / p.tw
            p.s.visible = true
            p.s.alpha = p.a0 * (1 - k) * Math.min(1,
                k * 12)
            if (p.align) {
                const sp = Math.hypot(p.vx,
                    p.vy)
                p.s.rotation = Math.atan2(p.vy,
                    p.vx)
                p.s.scale.set(size * (1 + sp * p.stretch),
                    size * p.sy)
            } else {
                p.s.rotation = p.rot + p.vr * p.age
                p.s.scale.set(size,
                    size * p.sy)
            }
        }
    }
}

type Step = (t: number, dt: number, ms: number) => void

/** Chạy một timeline bằng app.ticker, tự dọn root khi xong */
function run(ctx: VfxCtx, root: Container, durMs: number, step: Step): Promise<void> {
    return new Promise<void>((resolve) => {
        if (ctx.layer.destroyed) { root.destroy({
            children: true
        }); resolve(); return }
        ctx.layer.addChild(root)
        let el = 0
        let done = false
        const finish = (): void => {
            if (done) return
            done = true
            root.off("destroyed",
                finish)
            ctx.app.ticker.remove(tick)
            if (!root.destroyed) {
                root.destroy({
                    children: true
                })
            }
            resolve()
        }
        const tick = (tk: Ticker): void => {
            if (ctx.layer.destroyed || root.destroyed) {
                finish()
                return
            }
            const dt = Math.min(tk.deltaMS,
                50)
            el += dt
            try {
                step(Math.min(1,
                    el / durMs),
                dt / 1000,
                el)
            } catch {
                finish()
                return
            }
            if (el >= durMs) {
                finish()
            }
        }
        root.once("destroyed",
            finish)
        ctx.app.ticker.add(tick)
    })
}

/** Hiệu ứng trúng tại ctx.from; build dựng hạt ban đầu và có thể trả về hàm cập nhật thêm */
function playImpact(
    ctx: VfxCtx,
    dur: number,
    build: (em: Emitter, root: Container) => Step | void
): Promise<void> {
    const root = new Container()
    root.position.set(ctx.from.x,
        ctx.from.y)
    const em = new Emitter(root)
    const extra = build(em,
        root)
    return run(ctx,
        root,
        dur,
        (t, dt, ms) => {
            em.update(dt)
            if (extra) {
                extra(t,
                    dt,
                    ms)
            }
        })
}

// ---------- tia sét ----------
function jag(a: Pt, b: Pt, segs: number, jit: number): Pt[] {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx,
        dy) || 1
    const nx = -dy / len
    const ny = dx / len
    const out: Pt[] = []
    for (let i = 0; i <= segs; i++) {
        const u = i / segs
        const o = i === 0 || i === segs ? 0 : rnd(-jit,
            jit)
        out.push({
            x: a.x + dx * u + nx * o,
            y: a.y + dy * u + ny * o
        })
    }
    return out
}

function trace(g: Graphics, pts: Pt[]): void {
    let first = true
    for (const p of pts) {
        if (first) {
            g.moveTo(p.x,
                p.y)
            first = false
        } else {
            g.lineTo(p.x,
                p.y)
        }
    }
}

function drawBolt(g: Graphics, pts: Pt[], col: number, w: number, a: number): void {
    if (pts.length < 2 || a <= 0) {
        return
    }
    trace(g,
        pts)
    g.stroke({
        width: w * 3.2,
        color: col,
        alpha: 0.22 * a,
        join: "round",
        cap: "round"
    })
    trace(g,
        pts)
    g.stroke({
        width: w * 1.6,
        color: col,
        alpha: 0.6 * a,
        join: "round",
        cap: "round"
    })
    trace(g,
        pts)
    g.stroke({
        width: w * 0.6,
        color: 0xffffff,
        alpha: a,
        join: "round",
        cap: "round"
    })
}

function flash(em: Emitter, x: number, y: number, tint: number, size: number, life = 0.25): void {
    em.emit({
        x,
        y,
        life,
        s0: size * 0.4,
        s1: size,
        tint: 0xffffff,
        a0: 1
    })
    em.emit({
        x,
        y,
        life: life * 1.4,
        s0: size * 0.5,
        s1: size * 1.5,
        tint,
        a0: 0.8
    })
}

function ring(em: Emitter, tint: number, s1: number, life = 0.45, delay = 0, a0 = 0.9): void {
    em.emit({
        tex: ringTex(),
        x: 0,
        y: 0,
        life,
        s0: s1 * 0.12,
        s1,
        tint,
        a0,
        delay
    })
}

const ultShake = (ctx: VfxCtx, power: number): void => {
    if (ctx.intensity >= 2) {
        ctx.shake(power,
            260)
    }
}

// ---------- TRAVEL: đạn bay ----------
type HeadKind = "orb" | "streak" | "crystal" | "icon"
type TrailKind = "magic" | "fire" | "ice" | "arrow"

interface ProjCfg {
    head: HeadKind;
    trail: TrailKind;
    dur: number;
    size: number;
    arc: number;
    spin: number;
    ease: (t: number) => number;
    core: number;
}

const loadIcon = async (src?: string): Promise<Texture | null> => {
    if (!src) {
        return null
    }
    try {
        return await Assets.load<Texture>(src)
    } catch {
        return null
    }
}

function flyOne(ctx: VfxCtx, cfg: ProjCfg, target: Pt, iconTex: Texture | null): Promise<void> {
    const k = ctx.intensity
    const kk = Math.sqrt(k)
    const col = ctx.color
    const col2 = col2Of(ctx)
    const size = cfg.size * kk
    const flight = cfg.dur * (1 + (k - 1) * 0.2)
    const total = flight + 260
    const from = ctx.from
    const dx = target.x - from.x
    const dy = target.y - from.y
    const len = Math.hypot(dx,
        dy) || 1
    const nx = -dy / len
    const ny = dx / len
    const sgn = Math.random() < 0.5 ? -1 : 1

    const root = new Container()
    const trailLayer = new Container()
    const head = new Container()
    root.addChild(trailLayer)
    root.addChild(head)
    const em = new Emitter(trailLayer)

    let spinner: Container | null = null
    let kind = cfg.head
    if (kind === "icon" && !iconTex) {
        kind = "orb"
    }
    if (kind === "orb") {
        head.addChild(spr(glowTex(),
            col,
            true,
            size * 2.6))
        head.addChild(spr(glowTex(),
            mix(col,
                0xffffff,
                0.4),
            true,
            size * 1.5))
        head.addChild(spr(glowTex(),
            cfg.core,
            true,
            size * 0.8))
    } else if (kind === "streak") {
        head.addChild(spr(glowTex(),
            col,
            true,
            size * 7,
            size * 1.6))
        head.addChild(spr(shardTex(),
            mix(col,
                0xffffff,
                0.7),
            true,
            size * 4.2,
            size * 1.1))
        head.addChild(spr(glowTex(),
            0xffffff,
            true,
            size * 1.4))
    } else if (kind === "crystal") {
        head.addChild(spr(glowTex(),
            col,
            true,
            size * 2.8))
        spinner = new Container()
        spinner.addChild(spr(shardTex(),
            0xdff6ff,
            true,
            size * 2,
            size * 0.9))
        const cross = spr(shardTex(),
            0xffffff,
            true,
            size * 2,
            size * 0.9)
        cross.rotation = Math.PI / 2
        spinner.addChild(cross)
        const diag = spr(shardTex(),
            col2,
            true,
            size * 1.4,
            size * 0.6)
        diag.rotation = Math.PI / 4
        spinner.addChild(diag)
        head.addChild(spinner)
        head.addChild(spr(glowTex(),
            0xffffff,
            true,
            size * 0.8))
    } else if (iconTex) {
        head.addChild(spr(glowTex(),
            col,
            true,
            size * 3))
        const disc = new Graphics()
        disc.circle(0,
            0,
            size * 0.62)
        disc.fill({
            color: mix(col,
                0x000000,
                0.55),
            alpha: 0.9
        })
        head.addChild(disc)
        const icon = new Sprite(iconTex)
        icon.anchor.set(0.5)
        icon.width = size * 1.2
        icon.height = size * 1.2
        const mask = new Graphics()
        mask.circle(0,
            0,
            size * 0.58)
        mask.fill(0xffffff)
        head.addChild(mask)
        icon.mask = mask
        head.addChild(icon)
        head.addChild(spr(ringTex(),
            mix(col2,
                0xffffff,
                0.3),
            true,
            size * 1.6))
    }
    head.position.set(from.x,
        from.y)

    let px = from.x
    let py = from.y
    let angle = Math.atan2(dy,
        dx)
    let accA = 0
    let accB = 0
    let accC = 0

    const emitTrail = (x: number, y: number, dt: number): void => {
        const rate = (r: number, acc: number): { n: number; acc: number } => {
            const v = acc + r * dt
            return {
                n: Math.floor(v),
                acc: v - Math.floor(v)
            }
        }
        const at = (): Pt => {
            const u = Math.random()
            return {
                x: lerp(px,
                    x,
                    u),
                y: lerp(py,
                    y,
                    u)
            }
        }
        if (cfg.trail === "magic") {
            const a = rate(140,
                accA)
            accA = a.acc
            for (let i = 0; i < a.n; i++) {
                const p = at()
                em.emit({
                    x: p.x,
                    y: p.y,
                    life: 0.32,
                    s0: size * 0.9,
                    s1: 0,
                    a0: 0.7,
                    tint: col
                })
            }
            const b = rate(55,
                accB)
            accB = b.acc
            for (let i = 0; i < b.n; i++) {
                const p = at()
                em.emit({
                    x: p.x,
                    y: p.y,
                    vx: rnd(-70,
                        70),
                    vy: rnd(-70,
                        70),
                    life: rnd(0.35,
                        0.6),
                    s0: rnd(8,
                        15),
                    s1: 0,
                    tint: Math.random() < 0.5 ? 0xffffff : col2
                })
            }
        } else if (cfg.trail === "fire") {
            const a = rate(170,
                accA)
            accA = a.acc
            for (let i = 0; i < a.n; i++) {
                const p = at()
                em.emit({
                    x: p.x,
                    y: p.y,
                    vx: rnd(-30,
                        30),
                    vy: rnd(-60,
                        -10),
                    life: 0.36,
                    s0: size * 0.95,
                    s1: size * 0.25,
                    a0: 0.85,
                    tint: pick([0xfff0a0,
                        0xffa030,
                        col,
                        0xff5a10])
                })
            }
            const b = rate(45,
                accB)
            accB = b.acc
            for (let i = 0; i < b.n; i++) {
                const p = at()
                em.emit({
                    x: p.x,
                    y: p.y,
                    vx: rnd(-20,
                        20),
                    vy: rnd(-45,
                        -10),
                    life: 0.75,
                    s0: size * 0.5,
                    s1: size * 1.6,
                    a0: 0.4,
                    tint: 0x3a3a3a,
                    add: false
                })
            }
            const c = rate(45,
                accC)
            accC = c.acc
            for (let i = 0; i < c.n; i++) {
                const p = at()
                em.emit({
                    x: p.x,
                    y: p.y,
                    vx: rnd(-90,
                        90),
                    vy: rnd(-120,
                        20),
                    g: 300,
                    life: rnd(0.4,
                        0.7),
                    s0: rnd(6,
                        11),
                    s1: 2,
                    tint: 0xffb347
                })
            }
        } else if (cfg.trail === "ice") {
            const a = rate(120,
                accA)
            accA = a.acc
            for (let i = 0; i < a.n; i++) {
                const p = at()
                em.emit({
                    x: p.x,
                    y: p.y,
                    life: 0.36,
                    s0: size * 0.75,
                    s1: 0,
                    a0: 0.6,
                    tint: mix(col,
                        0xbfe9ff,
                        0.6)
                })
            }
            const b = rate(50,
                accB)
            accB = b.acc
            for (let i = 0; i < b.n; i++) {
                const p = at()
                em.emit({
                    tex: shardTex(),
                    x: p.x,
                    y: p.y,
                    vx: rnd(-60,
                        60),
                    vy: rnd(-60,
                        60),
                    life: 0.5,
                    s0: rnd(12,
                        20),
                    s1: 4,
                    rot: rnd(0,
                        6.28),
                    vr: rnd(-6,
                        6),
                    tint: pick([0xffffff,
                        0xcdf0ff,
                        col2])
                })
            }
        } else {
            const a = rate(130,
                accA)
            accA = a.acc
            for (let i = 0; i < a.n; i++) {
                const p = at()
                em.emit({
                    tex: shardTex(),
                    x: p.x,
                    y: p.y,
                    vx: -Math.cos(angle) * rnd(120,
                        300) + rnd(-50,
                        50),
                    vy: -Math.sin(angle) * rnd(120,
                        300) + rnd(-50,
                        50),
                    life: 0.22,
                    s0: rnd(14,
                        26),
                    s1: 3,
                    align: true,
                    drag: 2,
                    tint: Math.random() < 0.5 ? col2 : 0xffffff
                })
            }
            const b = rate(90,
                accB)
            accB = b.acc
            for (let i = 0; i < b.n; i++) {
                const p = at()
                em.emit({
                    x: p.x,
                    y: p.y,
                    life: 0.16,
                    s0: size * 3,
                    s1: size * 0.6,
                    sy: 0.12,
                    rot: angle,
                    a0: 0.5,
                    tint: col
                })
            }
        }
    }

    return run(ctx,
        root,
        total,
        (_t, dt, ms) => {
            const f = Math.min(1,
                ms / flight)
            const e = cfg.ease(f)
            const off = Math.sin(Math.PI * e) * cfg.arc * len * sgn
            const x = from.x + dx * e + nx * off
            const y = from.y + dy * e + ny * off
            if (Math.hypot(x - px,
                y - py) > 0.01) {
                angle = Math.atan2(y - py,
                    x - px)
            }
            if (ms < flight) {
                head.position.set(x,
                    y)
                const pulse = 1 + 0.08 * Math.sin(ms * 0.03)
                head.scale.set(pulse)
                if (kind === "streak") {
                    head.rotation = angle
                }
                if (spinner) {
                    spinner.rotation += cfg.spin * dt
                }
                emitTrail(x,
                    y,
                    dt)
            } else {
                head.visible = false
            }
            px = x
            py = y
            em.update(dt)
        })
}

const projectile = (cfg: ProjCfg) => async (ctx: VfxCtx): Promise<void> => {
    const tex = cfg.head === "icon" ? await loadIcon(ctx.icon) : null
    await Promise.all(ctx.to.map((p) => flyOne(ctx,
        cfg,
        p,
        tex)))
}

registerVfx("bolt",
    projectile({
        head: "orb",
        trail: "magic",
        dur: 520,
        size: 26,
        arc: 0.05,
        spin: 0,
        ease: easeInOut,
        core: 0xffffff
    }))

registerVfx("arrow",
    projectile({
        head: "streak",
        trail: "arrow",
        dur: 340,
        size: 11,
        arc: 0,
        spin: 0,
        ease: linear,
        core: 0xffffff
    }))

registerVfx("fireball",
    projectile({
        head: "orb",
        trail: "fire",
        dur: 650,
        size: 46,
        arc: 0.04,
        spin: 0,
        ease: easeIn,
        core: 0xfff2b0
    }))

registerVfx("iceShard",
    projectile({
        head: "crystal",
        trail: "ice",
        dur: 520,
        size: 30,
        arc: 0.03,
        spin: 9,
        ease: easeOutCubic,
        core: 0xffffff
    }))

registerVfx("skillIcon",
    projectile({
        head: "icon",
        trail: "magic",
        dur: 560,
        size: 40,
        arc: 0.07,
        spin: 0,
        ease: easeInOut,
        core: 0xffffff
    }))

registerVfx("none",
    async () => {
    // không bay
    })

// Lưỡi chém lưỡi liềm tại mục tiêu (không bay)
function slashOne(ctx: VfxCtx, target: Pt): Promise<void> {
    const k = ctx.intensity
    const col = ctx.color
    const col2 = col2Of(ctx)
    const size = 190 * Math.pow(k,
        0.6)
    const base = Math.atan2(target.y - ctx.from.y,
        target.x - ctx.from.x) + rnd(-0.5,
        0.5)
    const a0 = base - 1.3
    const a1 = base + 0.7
    const root = new Container()
    root.position.set(target.x,
        target.y)
    const trailLayer = new Container()
    root.addChild(trailLayer)
    const em = new Emitter(trailLayer)
    const glowC = spr(crescentTex(),
        col,
        true,
        size,
        size * 0.5)
    const coreC = spr(crescentTex(),
        0xffffff,
        true,
        size * 0.92,
        size * 0.3)
    const halo = spr(glowTex(),
        col2,
        true,
        size * 0.9)
    root.addChild(halo)
    root.addChild(glowC)
    root.addChild(coreC)
    let acc = 0
    let burst = false
    return run(ctx,
        root,
        480,
        (t, dt) => {
            const sw = easeOutCubic(Math.min(1,
                t / 0.45))
            const ang = lerp(a0,
                a1,
                sw)
            const sc = lerp(0.55,
                1.15,
                sw)
            const alpha = t < 0.5 ? 1 : Math.max(0,
                1 - (t - 0.5) / 0.5)
            glowC.rotation = ang
            coreC.rotation = ang
            glowC.scale.set(sc * size / 256,
                sc * size * 0.5 / 128)
            coreC.scale.set(sc * size * 0.92 / 256,
                sc * size * 0.3 / 128)
            glowC.alpha = alpha
            coreC.alpha = alpha
            halo.alpha = alpha * 0.4
            if (t < 0.45) {
                acc += dt * 70
                while (acc >= 1) {
                    acc -= 1
                    em.emit({
                        tex: crescentTex(),
                        x: 0,
                        y: 0,
                        rot: ang,
                        life: 0.2,
                        s0: size * sc,
                        s1: size * sc * 1.05,
                        sy: 0.5,
                        a0: 0.45,
                        tint: col
                    })
                }
            } else if (!burst) {
                burst = true
                for (let i = 0; i < 10 * k; i++) {
                    const a = a1 + rnd(-1.2,
                        0.4)
                    em.emit({
                        tex: shardTex(),
                        x: Math.cos(a) * size * 0.3,
                        y: Math.sin(a) * size * 0.3,
                        vx: Math.cos(a) * rnd(120,
                            340),
                        vy: Math.sin(a) * rnd(120,
                            340),
                        life: rnd(0.2,
                            0.4),
                        s0: rnd(14,
                            26),
                        s1: 3,
                        align: true,
                        drag: 2,
                        tint: pick([col,
                            col2,
                            0xffffff])
                    })
                }
            }
            em.update(dt)
        })
}

registerVfx("slash",
    async (ctx) => {
        await Promise.all(ctx.to.map((p) => slashOne(ctx,
            p)))
    })

// Tia laser tức thời
function beamOne(ctx: VfxCtx, target: Pt): Promise<void> {
    const k = ctx.intensity
    const col = ctx.color
    const col2 = col2Of(ctx)
    const dur = 520 * (1 + (k - 1) * 0.3)
    const root = new Container()
    const g = new Graphics()
    g.blendMode = "add"
    root.addChild(g)
    const trailLayer = new Container()
    root.addChild(trailLayer)
    const em = new Emitter(trailLayer)
    const gA = spr(glowTex(),
        col,
        true,
        90 * k)
    const gB = spr(glowTex(),
        col2,
        true,
        110 * k)
    gA.position.set(ctx.from.x,
        ctx.from.y)
    gB.position.set(target.x,
        target.y)
    root.addChild(gA)
    root.addChild(gB)
    const from = ctx.from
    let acc = 0
    return run(ctx,
        root,
        dur,
        (t, dt, ms) => {
            let env = 1
            if (t < 0.08) {
                env = t / 0.08
            } else if (t > 0.55) {
                env = Math.max(0,
                    (1 - t) / 0.45)
            }
            const flick = 0.82 + Math.random() * 0.3
            const w = 11 * k * env * flick
            const reach = Math.min(1,
                ms / 70)
            const end: Pt = {
                x: lerp(from.x,
                    target.x,
                    reach),
                y: lerp(from.y,
                    target.y,
                    reach)
            }
            g.clear()
            const line = [from,
                end]
            drawBolt(g,
                line,
                col,
                w,
                Math.min(1,
                    env * 1.2))
            gA.scale.set(env * (90 * k / 64) * flick)
            gB.scale.set(env * (110 * k / 64) * flick * reach)
            if (env > 0.2) {
                acc += dt * 70
                while (acc >= 1) {
                    acc -= 1
                    const u = Math.random()
                    em.emit({
                        x: lerp(from.x,
                            end.x,
                            u),
                        y: lerp(from.y,
                            end.y,
                            u),
                        vx: rnd(-90,
                            90),
                        vy: rnd(-90,
                            90),
                        life: rnd(0.2,
                            0.4),
                        s0: rnd(8,
                            16),
                        s1: 0,
                        tint: Math.random() < 0.5 ? 0xffffff : col2
                    })
                }
            }
            em.update(dt)
        })
}

registerVfx("beam",
    async (ctx) => {
        await Promise.all(ctx.to.map((p) => beamOne(ctx,
            p)))
    })

// Sét nhảy qua từng mục tiêu
registerVfx("chain",
    async (ctx) => {
        if (ctx.to.length === 0) {
            return
        }
        const k = ctx.intensity
        const col = ctx.color
        const col2 = col2Of(ctx)
        const pts: Pt[] = [ctx.from,
            ...ctx.to]
        const n = pts.length - 1
        const segT = 130
        const hold = 320
        const dur = segT * n + hold
        const root = new Container()
        const g = new Graphics()
        g.blendMode = "add"
        root.addChild(g)
        const trailLayer = new Container()
        root.addChild(trailLayer)
        const em = new Emitter(trailLayer)
        flash(em,
            ctx.from.x,
            ctx.from.y,
            col,
            90 * k)
        let segs: Pt[][] = []
        let nextRegen = 0
        let flashed = 0
        await run(ctx,
            root,
            dur,
            (_t, dt, ms) => {
                if (ms >= nextRegen) {
                    nextRegen = ms + 35
                    const next: Pt[][] = []
                    for (let i = 0; i < n; i++) {
                        const a = pts[i]
                        const b = pts[i + 1]
                        const u = clamp((ms - i * segT) / segT,
                            0,
                            1)
                        if (!a || !b || u <= 0) {
                            next.push([])
                            continue
                        }
                        const e: Pt = {
                            x: lerp(a.x,
                                b.x,
                                u),
                            y: lerp(a.y,
                                b.y,
                                u)
                        }
                        next.push(jag(a,
                            e,
                            8,
                            16 * k))
                    }
                    segs = next
                }
                const fade = ms > segT * n ? Math.max(0,
                    1 - (ms - segT * n) / hold) : 1
                g.clear()
                for (const s of segs) {
                    drawBolt(g,
                        s,
                        col,
                        4.5 * k,
                        fade)
                }
                while (flashed < n && ms >= (flashed + 1) * segT) {
                    flashed++
                    const node = pts[flashed]
                    if (node) {
                        flash(em,
                            node.x,
                            node.y,
                            col2,
                            100 * k,
                            0.3)
                        for (let i = 0; i < 6; i++) {
                            em.emit({
                                tex: shardTex(),
                                x: node.x,
                                y: node.y,
                                vx: rnd(-260,
                                    260),
                                vy: rnd(-260,
                                    260),
                                life: rnd(0.2,
                                    0.4),
                                s0: rnd(12,
                                    22),
                                s1: 3,
                                align: true,
                                drag: 2,
                                tint: pick([col,
                                    col2,
                                    0xffffff])
                            })
                        }
                    }
                }
                em.update(dt)
            })
    })

// Lao tới để lại bóng mờ
function dashOne(ctx: VfxCtx, target: Pt): Promise<void> {
    const k = ctx.intensity
    const kk = Math.sqrt(k)
    const col = ctx.color
    const col2 = col2Of(ctx)
    const from = ctx.from
    const dx = target.x - from.x
    const dy = target.y - from.y
    const len = Math.hypot(dx,
        dy) || 1
    const ang = Math.atan2(dy,
        dx)
    const flight = 320
    const root = new Container()
    const trailLayer = new Container()
    root.addChild(trailLayer)
    const em = new Emitter(trailLayer)
    const headGlow = spr(glowTex(),
        col2,
        true,
        80 * kk)
    root.addChild(headGlow)
    let px = from.x
    let py = from.y
    let acc = 0
    let arrived = false
    const streak = clamp(len * 0.35,
        120,
        300)
    return run(ctx,
        root,
        flight + 360,
        (_t, dt, ms) => {
            const f = Math.min(1,
                ms / flight)
            const e = easeOutCubic(f)
            const x = from.x + dx * e
            const y = from.y + dy * e
            if (ms < flight) {
                headGlow.position.set(x,
                    y)
                acc += dt * 110
                while (acc >= 1) {
                    acc -= 1
                    const u = Math.random()
                    const gx = lerp(px,
                        x,
                        u)
                    const gy = lerp(py,
                        y,
                        u)
                    em.emit({
                        x: gx,
                        y: gy,
                        life: 0.34,
                        s0: 56 * kk,
                        s1: 44 * kk,
                        sy: 1.7,
                        a0: 0.5,
                        tint: col
                    })
                    em.emit({
                        x: gx,
                        y: gy,
                        life: 0.26,
                        s0: 24 * kk,
                        s1: 16 * kk,
                        sy: 2.4,
                        a0: 0.35,
                        tint: 0xffffff
                    })
                    em.emit({
                        x: gx,
                        y: gy,
                        rot: ang,
                        life: 0.22,
                        s0: streak,
                        s1: streak * 0.3,
                        sy: 0.09,
                        a0: 0.6,
                        tint: col2
                    })
                    em.emit({
                        tex: shardTex(),
                        x: gx + rnd(-18,
                            18),
                        y: gy + rnd(-30,
                            30),
                        vx: -Math.cos(ang) * rnd(200,
                            500),
                        vy: -Math.sin(ang) * rnd(200,
                            500),
                        life: 0.22,
                        s0: rnd(20,
                            40),
                        s1: 4,
                        align: true,
                        tint: 0xffffff,
                        a0: 0.7
                    })
                }
            } else if (!arrived) {
                arrived = true
                headGlow.visible = false
                ring(em,
                    col2,
                    150 * kk,
                    0.35,
                    0,
                    0.8)
                em.emit({
                    x: target.x,
                    y: target.y,
                    life: 0.25,
                    s0: 40,
                    s1: 160 * kk,
                    tint: 0xffffff
                })
            }
            px = x
            py = y
            em.update(dt)
        })
}

registerVfx("dash",
    async (ctx) => {
        await Promise.all(ctx.to.map((p) => dashOne(ctx,
            p)))
    })

// ---------- IMPACT: hiệu ứng trúng tại ctx.from ----------
function sparks(em: Emitter, n: number, tints: number[], vMin: number, vMax: number, opts: Partial<EmitOpts> = {
}): void {
    for (let i = 0; i < n; i++) {
        const a = rnd(0,
            Math.PI * 2)
        const v = rnd(vMin,
            vMax)
        em.emit({
            tex: shardTex(),
            x: 0,
            y: 0,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            life: rnd(0.3,
                0.55),
            s0: rnd(18,
                34),
            s1: 4,
            drag: 2.2,
            align: true,
            tint: pick(tints),
            ...opts
        })
    }
}

registerVfx("burst",
    (ctx) => {
        const k = ctx.intensity
        const kk = Math.sqrt(k)
        const col = ctx.color
        const col2 = col2Of(ctx)
        ultShake(ctx,
            6)
        return playImpact(ctx,
            700,
            (em) => {
                flash(em,
                    0,
                    0,
                    col,
                    190 * k)
                ring(em,
                    col,
                    250 * k,
                    0.42)
                ring(em,
                    col2,
                    180 * k,
                    0.45,
                    0.06,
                    0.7)
                sparks(em,
                    Math.round(18 * k),
                    [col,
                        col2,
                        0xffffff],
                    160 * kk,
                    420 * kk)
            })
    })

registerVfx("slashHit",
    (ctx) => {
        const k = ctx.intensity
        const kk = Math.sqrt(k)
        const col = ctx.color
        const col2 = col2Of(ctx)
        const n = k > 1.2 ? 3 : 2
        const base = rnd(-0.6,
            0.6)
        ultShake(ctx,
            6)
        return playImpact(ctx,
            650,
            (em) => {
                flash(em,
                    0,
                    0,
                    col,
                    120 * k,
                    0.2)
                for (let i = 0; i < n; i++) {
                    const a = base + (i - (n - 1) / 2) * 0.85 + rnd(-0.1,
                        0.1)
                    const delay = i * 0.06
                    em.emit({
                        tex: crescentTex(),
                        x: 0,
                        y: 0,
                        rot: a,
                        life: 0.3,
                        s0: 150 * k,
                        s1: 230 * k,
                        sy: 0.5,
                        tint: col,
                        delay
                    })
                    em.emit({
                        x: 0,
                        y: 0,
                        rot: a,
                        life: 0.26,
                        s0: 110 * k,
                        s1: 280 * k,
                        sy: 0.07,
                        tint: col2,
                        delay
                    })
                    em.emit({
                        x: 0,
                        y: 0,
                        rot: a,
                        life: 0.22,
                        s0: 90 * k,
                        s1: 240 * k,
                        sy: 0.03,
                        tint: 0xffffff,
                        delay
                    })
                }
                sparks(em,
                    Math.round(12 * k),
                    [col,
                        col2,
                        0xffffff],
                    140 * kk,
                    380 * kk)
            })
    })

registerVfx("fireHit",
    (ctx) => {
        const k = ctx.intensity
        const kk = Math.sqrt(k)
        const col = ctx.color
        ultShake(ctx,
            7)
        return playImpact(ctx,
            1000,
            (em) => {
                flash(em,
                    0,
                    0,
                    0xff8a2a,
                    200 * k)
                ring(em,
                    0xff7a1a,
                    230 * k,
                    0.4)
                for (let i = 0; i < Math.round(26 * k); i++) {
                    const a = rnd(0,
                        Math.PI * 2)
                    const v = rnd(40,
                        260) * kk
                    em.emit({
                        x: 0,
                        y: 0,
                        vx: Math.cos(a) * v,
                        vy: Math.sin(a) * v,
                        g: -120,
                        drag: 2,
                        life: rnd(0.3,
                            0.6),
                        s0: rnd(40,
                            70) * Math.pow(k,
                            0.7),
                        s1: 12,
                        a0: 0.85,
                        tint: pick([0xffe27a,
                            0xff9a2a,
                            col,
                            0xff4a10])
                    })
                }
                for (let i = 0; i < 8; i++) {
                    em.emit({
                        x: rnd(-20,
                            20),
                        y: rnd(-10,
                            10),
                        vx: rnd(-40,
                            40),
                        vy: rnd(-90,
                            -30),
                        drag: 1.5,
                        life: rnd(0.6,
                            0.9),
                        s0: 40,
                        s1: 110 * kk,
                        a0: 0.5,
                        tint: 0x2a2a2a,
                        add: false,
                        delay: 0.05
                    })
                }
                for (let i = 0; i < Math.round(14 * k); i++) {
                    em.emit({
                        x: 0,
                        y: 0,
                        vx: rnd(-160,
                            160),
                        vy: -rnd(120,
                            330),
                        g: 420,
                        life: rnd(0.6,
                            0.9),
                        s0: rnd(6,
                            11),
                        s1: 2,
                        tint: 0xffb347
                    })
                }
            })
    })

registerVfx("frostBurst",
    (ctx) => {
        const k = ctx.intensity
        const kk = Math.sqrt(k)
        const col = ctx.color
        ultShake(ctx,
            5)
        return playImpact(ctx,
            950,
            (em) => {
                flash(em,
                    0,
                    0,
                    0xaee6ff,
                    180 * k)
                ring(em,
                    0xaee6ff,
                    270 * k,
                    0.5)
                ring(em,
                    col,
                    190 * k,
                    0.5,
                    0.07,
                    0.7)
                sparks(em,
                    Math.round(14 * k),
                    [0xcfeeff,
                        0xffffff,
                        col],
                    120 * kk,
                    380 * kk,
                    {
                        s0: rnd(28,
                            50),
                        s1: 14,
                        life: rnd(0.5,
                            0.8),
                        drag: 1.6
                    })
                for (let i = 0; i < 10; i++) {
                    const a = rnd(0,
                        Math.PI * 2)
                    em.emit({
                        x: 0,
                        y: 0,
                        vx: Math.cos(a) * rnd(20,
                            90),
                        vy: Math.sin(a) * rnd(20,
                            90),
                        life: rnd(0.5,
                            0.8),
                        s0: rnd(50,
                            90) * kk,
                        s1: 130 * kk,
                        a0: 0.3,
                        tint: 0xe8f8ff
                    })
                }
                for (let i = 0; i < 10; i++) {
                    em.emit({
                        x: rnd(-60,
                            60),
                        y: rnd(-60,
                            60),
                        vy: 30,
                        life: rnd(0.6,
                            0.9),
                        s0: rnd(5,
                            9),
                        s1: 1,
                        tint: 0xffffff
                    })
                }
            })
    })

registerVfx("lightningHit",
    (ctx) => {
        const k = ctx.intensity
        const kk = Math.sqrt(k)
        const col = ctx.color
        const col2 = col2Of(ctx)
        const origin: Pt = {
            x: 0,
            y: 0
        }
        ultShake(ctx,
            6)
        return playImpact(ctx,
            650,
            (em, root) => {
                const g = new Graphics()
                g.blendMode = "add"
                root.addChildAt(g,
                    0)
                flash(em,
                    0,
                    0,
                    col2,
                    170 * k,
                    0.22)
                ring(em,
                    col,
                    160 * k,
                    0.3)
                sparks(em,
                    Math.round(12 * k),
                    [0xffffff,
                        col2,
                        0xfff6a8],
                    200 * kk,
                    480 * kk,
                    {
                        life: rnd(0.15,
                            0.35)
                    })
                let arcs: Pt[][] = []
                let nextRegen = 0
                const make = (): Pt[][] => {
                    const out: Pt[][] = []
                    const cnt = 5 + Math.round(2 * k)
                    for (let i = 0; i < cnt; i++) {
                        const a = rnd(0,
                            Math.PI * 2)
                        const l = rnd(60,
                            130) * kk
                        out.push(jag(origin,
                            {
                                x: Math.cos(a) * l,
                                y: Math.sin(a) * l
                            },
                            6,
                            14))
                    }
                    return out
                }
                return (_t, _dt, ms) => {
                    if (ms >= nextRegen && ms < 280) {
                        nextRegen = ms + 55
                        arcs = make()
                    }
                    g.clear()
                    const a = ms < 280 ? 1 - ms / 400 : 0
                    for (const s of arcs) {
                        drawBolt(g,
                            s,
                            col,
                            3.2,
                            a)
                    }
                }
            })
    })

registerVfx("crit",
    (ctx) => {
        const k = ctx.intensity
        const kk = Math.sqrt(k)
        const gold = 0xffc933
        ctx.shake(8 * kk,
            300)
        return playImpact(ctx,
            950,
            (em, root) => {
                flash(em,
                    0,
                    0,
                    gold,
                    240 * k,
                    0.28)
                ring(em,
                    gold,
                    380 * k,
                    0.5)
                ring(em,
                    0xfff1a8,
                    300 * k,
                    0.5,
                    0.08,
                    0.8)
                em.emit({
                    tex: starTex(),
                    x: 0,
                    y: 0,
                    life: 0.38,
                    s0: 80,
                    s1: 360 * k,
                    rot: rnd(0,
                        6),
                    vr: 1.2,
                    tint: gold
                })
                em.emit({
                    tex: starTex(),
                    x: 0,
                    y: 0,
                    life: 0.3,
                    s0: 60,
                    s1: 240 * k,
                    rot: rnd(0,
                        6),
                    vr: -1.5,
                    tint: 0xffffff
                })
                sparks(em,
                    Math.round(22 * k),
                    [gold,
                        0xfff1a8,
                        0xffffff],
                    200 * kk,
                    560 * kk)
                const txt = new Text({
                    text: "CRIT",
                    style: {
                        fontFamily: "Impact, Arial Black, sans-serif",
                        fontSize: Math.round(46 * Math.pow(k,
                            0.6)),
                        fontWeight: "900",
                        fill: 0xffe066,
                        stroke: {
                            color: 0x7a2a00,
                            width: 7
                        }
                    }
                })
                txt.anchor.set(0.5)
                root.addChild(txt)
                return (_t, _dt, ms) => {
                    const u = ms / 900
                    const pop = u < 0.18 ? lerp(0.3,
                        1.3,
                        easeOutCubic(u / 0.18)) : lerp(1.3,
                        1,
                        Math.min(1,
                            (u - 0.18) / 0.2))
                    txt.scale.set(pop)
                    txt.y = -50 - 40 * easeOutCubic(Math.min(1,
                        u * 1.2))
                    txt.alpha = u < 0.65 ? 1 : Math.max(0,
                        1 - (u - 0.65) / 0.35)
                }
            })
    })

registerVfx("trueHit",
    (ctx) => {
        const k = ctx.intensity
        const kk = Math.sqrt(k)
        const tint = ctx.color2 ?? 0xdfe9ff
        ultShake(ctx,
            5)
        return playImpact(ctx,
            650,
            (em) => {
                flash(em,
                    0,
                    0,
                    tint,
                    150 * k,
                    0.2)
                em.emit({
                    tex: starTex(),
                    x: 0,
                    y: 0,
                    life: 0.4,
                    s0: 40,
                    s1: 300 * k,
                    vr: 0.8,
                    tint: 0xffffff
                })
                em.emit({
                    tex: starTex(),
                    x: 0,
                    y: 0,
                    life: 0.35,
                    s0: 30,
                    s1: 220 * k,
                    rot: Math.PI / 4,
                    vr: -0.8,
                    tint
                })
                for (const r of [0,
                    Math.PI / 2]) {
                    em.emit({
                        x: 0,
                        y: 0,
                        rot: r,
                        life: 0.3,
                        s0: 20,
                        s1: 380 * k,
                        sy: 0.05,
                        tint: 0xffffff
                    })
                }
                ring(em,
                    tint,
                    170 * k,
                    0.35,
                    0.05,
                    0.7)
                sparks(em,
                    Math.round(16 * k),
                    [0xffffff,
                        tint],
                    220 * kk,
                    520 * kk,
                    {
                        life: rnd(0.2,
                            0.4)
                    })
            })
    })

registerVfx("physicalHit",
    (ctx) => {
        const k = ctx.intensity
        const kk = Math.sqrt(k)
        const pal = [0xff7a2a,
            0xff3b2a,
            0xffd08a]
        const a = rnd(-0.6,
            0.6)
        ultShake(ctx,
            7)
        return playImpact(ctx,
            750,
            (em) => {
                flash(em,
                    0,
                    0,
                    0xff6a2a,
                    170 * k,
                    0.22)
                ring(em,
                    0xff7a2a,
                    220 * k,
                    0.4)
                em.emit({
                    tex: crescentTex(),
                    x: 0,
                    y: 0,
                    rot: a,
                    life: 0.3,
                    s0: 170 * k,
                    s1: 250 * k,
                    sy: 0.5,
                    tint: 0xff3b2a
                })
                em.emit({
                    x: 0,
                    y: 0,
                    rot: a + 0.5,
                    life: 0.24,
                    s0: 100 * k,
                    s1: 300 * k,
                    sy: 0.05,
                    tint: 0xffffff
                })
                sparks(em,
                    Math.round(16 * k),
                    pal,
                    180 * kk,
                    480 * kk,
                    {
                        g: 500
                    })
                for (let i = 0; i < 5; i++) {
                    em.emit({
                        x: rnd(-15,
                            15),
                        y: rnd(-10,
                            10),
                        vx: rnd(-50,
                            50),
                        vy: rnd(-60,
                            -10),
                        life: rnd(0.4,
                            0.7),
                        s0: 30,
                        s1: 80 * kk,
                        a0: 0.4,
                        tint: 0x5a3a2a,
                        add: false
                    })
                }
            })
    })

registerVfx("magicHit",
    (ctx) => {
        const k = ctx.intensity
        const kk = Math.sqrt(k)
        const pal = [0x9a5cff,
            0x4aa8ff,
            0xd8c4ff]
        ultShake(ctx,
            5)
        return playImpact(ctx,
            850,
            (em) => {
                flash(em,
                    0,
                    0,
                    0x9a5cff,
                    190 * k,
                    0.26)
                ring(em,
                    0x9a5cff,
                    250 * k,
                    0.45)
                ring(em,
                    0x4aa8ff,
                    190 * k,
                    0.5,
                    0.08,
                    0.8)
                em.emit({
                    tex: starTex(),
                    x: 0,
                    y: 0,
                    life: 0.5,
                    s0: 60,
                    s1: 170 * k,
                    vr: 3,
                    tint: 0xd8c4ff,
                    a0: 0.8
                })
                for (let i = 0; i < Math.round(20 * k); i++) {
                    const a = rnd(0,
                        Math.PI * 2)
                    const v = rnd(60,
                        220) * kk
                    em.emit({
                        x: 0,
                        y: 0,
                        vx: Math.cos(a) * v,
                        vy: Math.sin(a) * v,
                        turn: rnd(-4,
                            4),
                        drag: 1.2,
                        life: rnd(0.45,
                            0.8),
                        s0: rnd(14,
                            28),
                        s1: 3,
                        tint: pick(pal)
                    })
                }
                for (let i = 0; i < 8; i++) {
                    const a = rnd(0,
                        Math.PI * 2)
                    const v = rnd(80,
                        180) * kk
                    em.emit({
                        x: 0,
                        y: 0,
                        vx: Math.cos(a) * v,
                        vy: Math.sin(a) * v,
                        drag: 2,
                        life: rnd(0.3,
                            0.5),
                        s0: rnd(40,
                            70),
                        s1: 10,
                        a0: 0.6,
                        tint: pick(pal)
                    })
                }
            })
    })
