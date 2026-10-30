// Hiệu ứng META (kiểu Legends of Runeterra / LoL): lá bài bay, triệu hồi, chết, hồi sinh, rèn, trang bị, chuỗi, lượt, thắng/thua.
import {
    Container, Graphics, Sprite, Texture
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

// ---------- Texture cache ----------
const cache = new Map<string, Texture>()

function makeTex(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): Texture {
    const hit = cache.get(key)
    if (hit) return hit
    const c = document.createElement("canvas")
    c.width = w
    c.height = h
    const g = c.getContext("2d")
    if (g) draw(g)
    const t = Texture.from(c)
    cache.set(key,
        t)
    return t
}

const glowTex = (): Texture => makeTex("glow",
    64,
    64,
    (g) => {
        const r = g.createRadialGradient(32,
            32,
            0,
            32,
            32,
            32)
        r.addColorStop(0,
            "rgba(255,255,255,1)")
        r.addColorStop(0.25,
            "rgba(255,255,255,0.55)")
        r.addColorStop(1,
            "rgba(255,255,255,0)")
        g.fillStyle = r
        g.fillRect(0,
            0,
            64,
            64)
    })

const ringTex = (): Texture => makeTex("ring",
    128,
    128,
    (g) => {
        const r = g.createRadialGradient(64,
            64,
            40,
            64,
            64,
            64)
        r.addColorStop(0,
            "rgba(255,255,255,0)")
        r.addColorStop(0.7,
            "rgba(255,255,255,0.9)")
        r.addColorStop(1,
            "rgba(255,255,255,0)")
        g.fillStyle = r
        g.fillRect(0,
            0,
            128,
            128)
    })

const squareTex = (): Texture => makeTex("square",
    16,
    16,
    (g) => {
        g.fillStyle = "#fff"
        g.fillRect(0,
            0,
            16,
            16)
    })

const starTex = (): Texture => makeTex("star",
    64,
    64,
    (g) => {
        const r = g.createRadialGradient(32,
            32,
            0,
            32,
            32,
            32)
        r.addColorStop(0,
            "rgba(255,255,255,1)")
        r.addColorStop(1,
            "rgba(255,255,255,0)")
        g.fillStyle = r
        g.beginPath()
        g.moveTo(32,
            0)
        g.lineTo(37,
            27)
        g.lineTo(64,
            32)
        g.lineTo(37,
            37)
        g.lineTo(32,
            64)
        g.lineTo(27,
            37)
        g.lineTo(0,
            32)
        g.lineTo(27,
            27)
        g.closePath()
        g.fill()
    })

/** Cột sáng: mờ dần ngang hai bên, đặc ở giữa */
const pillarTex = (): Texture => makeTex("pillar",
    64,
    256,
    (g) => {
        const h = g.createLinearGradient(0,
            0,
            64,
            0)
        h.addColorStop(0,
            "rgba(255,255,255,0)")
        h.addColorStop(0.5,
            "rgba(255,255,255,0.95)")
        h.addColorStop(1,
            "rgba(255,255,255,0)")
        g.fillStyle = h
        g.fillRect(0,
            0,
            64,
            256)
        g.globalCompositeOperation = "destination-in"
        const v = g.createLinearGradient(0,
            0,
            0,
            256)
        v.addColorStop(0,
            "rgba(0,0,0,0)")
        v.addColorStop(0.6,
            "rgba(0,0,0,0.8)")
        v.addColorStop(1,
            "rgba(0,0,0,1)")
        g.fillStyle = v
        g.fillRect(0,
            0,
            64,
            256)
    })

/** Tia sáng: nhọn dần từ gốc (trên) ra ngoài (dưới) */
const rayTex = (): Texture => makeTex("ray",
    32,
    256,
    (g) => {
        const v = g.createLinearGradient(0,
            0,
            0,
            256)
        v.addColorStop(0,
            "rgba(255,255,255,0.9)")
        v.addColorStop(1,
            "rgba(255,255,255,0)")
        g.fillStyle = v
        g.beginPath()
        g.moveTo(14,
            0)
        g.lineTo(18,
            0)
        g.lineTo(32,
            256)
        g.lineTo(0,
            256)
        g.closePath()
        g.fill()
    })

/** Dải sáng quét ngang */
const bandTex = (): Texture => makeTex("band",
    256,
    64,
    (g) => {
        const h = g.createLinearGradient(0,
            0,
            256,
            0)
        h.addColorStop(0,
            "rgba(255,255,255,0)")
        h.addColorStop(0.5,
            "rgba(255,255,255,0.85)")
        h.addColorStop(1,
            "rgba(255,255,255,0)")
        g.fillStyle = h
        g.fillRect(0,
            0,
            256,
            64)
    })

/** Vignette: trong suốt ở giữa, đậm ở rìa */
const vignetteTex = (): Texture => makeTex("vignette",
    256,
    256,
    (g) => {
        const r = g.createRadialGradient(128,
            128,
            60,
            128,
            128,
            181)
        r.addColorStop(0,
            "rgba(255,255,255,0)")
        r.addColorStop(1,
            "rgba(255,255,255,1)")
        g.fillStyle = r
        g.fillRect(0,
            0,
            256,
            256)
    })

// ---------- Particle mini-system ----------
type Env = "fade" | "pulse" | "hold"

interface Spawn {
    tex?: Texture;
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    ax?: number;
    ay?: number;
    drag?: number;
    life: number;
    delay?: number;
    s0: number;
    s1: number;
    alpha?: number;
    env?: Env;
    tint: number;
    additive?: boolean;
    rot?: number;
    vr?: number;
    flip?: number;
    /** Vị trí theo thời gian chuẩn hoá t (0..1), ghi đè vật lý */
    pos?: (t: number) => Pt;
}

interface Part extends Spawn {
    s: Sprite;
    age: number;
    dead: boolean;
    base: number;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const easeOut = (t: number): number => 1 - (1 - t) * (1 - t)
const easeIn = (t: number): number => t * t
const rnd = (a: number, b: number): number => a + Math.random() * (b - a)
const clamp = (v: number, a: number, b: number): number => Math.max(a,
    Math.min(b,
        v))

class Scene {
    readonly root = new Container()
    private parts: Part[] = []
    private readonly kk: number

    constructor(ctx: VfxCtx) {
        ctx.layer.addChild(this.root)
        this.kk = clamp(ctx.intensity,
            0.6,
            3)
    }

    get k(): number {
        return this.kk
    }

    alive(): number {
        return this.parts.length
    }

    spawn(o: Spawn): Part {
        const tex = o.tex ?? glowTex()
        const s = new Sprite(tex)
        s.anchor.set(0.5)
        s.tint = o.tint
        s.blendMode = o.additive === false ? "normal" : "add"
        s.rotation = o.rot ?? 0
        s.visible = false
        this.root.addChild(s)
        const p: Part = {
            ...o,
            s,
            age: 0,
            dead: false,
            base: tex.width
        }
        this.parts.push(p)
        return p
    }

    update(dt: number) {
        const ds = dt / 1000
        let anyDead = false
        for (const p of this.parts) {
            p.age += dt
            const delay = p.delay ?? 0
            if (p.age < delay) continue
            const t = (p.age - delay) / p.life
            if (t >= 1) {
                p.dead = true
                anyDead = true
                continue
            }
            if (p.pos) {
                const q = p.pos(t)
                p.x = q.x
                p.y = q.y
            } else {
                const d = Math.pow(p.drag ?? 1,
                    dt / 16)
                p.vx = (p.vx ?? 0) * d + (p.ax ?? 0) * ds
                p.vy = (p.vy ?? 0) * d + (p.ay ?? 0) * ds
                p.x += p.vx * ds
                p.y += p.vy * ds
            }
            p.s.visible = true
            p.s.position.set(p.x,
                p.y)
            const size = lerp(p.s0,
                p.s1,
                t)
            const sc = size / p.base
            p.s.scale.set(sc * (p.flip ? Math.cos(p.age * p.flip * 0.01) : 1),
                sc)
            p.s.rotation += (p.vr ?? 0) * ds
            const a = p.alpha ?? 1
            const env = p.env ?? "fade"
            if (env === "pulse") p.s.alpha = a * Math.sin(Math.PI * t)
            else if (env === "hold") p.s.alpha = a * (t < 0.7 ? 1 : (1 - t) / 0.3)
            else p.s.alpha = a * (1 - t)
        }
        if (anyDead) {
            this.parts = this.parts.filter((p) => {
                if (p.dead) p.s.destroy()
                return !p.dead
            })
        }
    }

    clear() {
        if (!this.root.destroyed) this.root.destroy({
            children: true
        })
        this.parts = []
    }
}

/** Chạy một cảnh: tick(elapsedMs, dtMs) gọi mỗi khung cho tới `ms`, rồi chờ hạt tắt hẳn */
function run(ctx: VfxCtx, ms: number, setup: (sc: Scene) => ((el: number, dt: number) => void) | void): Promise<void> {
    return new Promise<void>((resolve) => {
        if (ctx.layer.destroyed) { resolve(); return }
        const sc = new Scene(ctx)
        let el = 0
        let done = false
        let tick: ((el: number, dt: number) => void) | void
        const finish = () => {
            if (done) return
            done = true
            sc.root.off("destroyed",
                finish)
            ctx.app.ticker.remove(fn)
            sc.clear()
            resolve()
        }
        const fn = (t: Ticker) => {
            if (done) return
            if (sc.root.destroyed) { finish(); return }
            const dt = Math.min(t.deltaMS,
                50)
            el += dt
            try {
                if (tick && el < ms) tick(el,
                    dt)
                sc.update(dt)
            } catch { finish(); return }
            if ((el >= ms && sc.alive() === 0) || el > ms + 4000) {
                finish()
            }
        }
        try {
            tick = setup(sc)
            sc.root.once("destroyed",
                finish)
            ctx.app.ticker.add(fn)
        } catch { finish() }
    })
}

const dist = (a: Pt, b: Pt): number => Math.hypot(b.x - a.x,
    b.y - a.y)
const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({
    x: lerp(a.x,
        b.x,
        t),
    y: lerp(a.y,
        b.y,
        t)
})
const gold = (ctx: VfxCtx): number => ctx.color2 ?? 0xffd86b

/** Vòng sáng nở ra */
function ring(sc: Scene, at: Pt, tint: number, size: number, life: number, delay = 0, alpha = 0.9) {
    sc.spawn({
        tex: ringTex(),
        x: at.x,
        y: at.y,
        life,
        delay,
        s0: size * 0.15,
        s1: size,
        alpha,
        tint
    })
}

/** Chớp sáng */
function flash(sc: Scene, at: Pt, tint: number, size: number, life: number, delay = 0) {
    sc.spawn({
        x: at.x,
        y: at.y,
        life,
        delay,
        s0: size,
        s1: size * 1.6,
        tint
    })
    sc.spawn({
        tex: starTex(),
        x: at.x,
        y: at.y,
        life: life * 1.2,
        delay,
        s0: size * 0.6,
        s1: size * 1.8,
        tint: 0xffffff,
        rot: rnd(0,
            1),
        vr: 1.5
    })
}

/** Tia lửa toả tròn */
function sparks(sc: Scene, at: Pt, n: number, speed: number, tint: number, size: number, gravity = 0, delay = 0) {
    for (let i = 0; i < n; i++) {
        const a = rnd(0,
            Math.PI * 2)
        const v = rnd(speed * 0.3,
            speed)
        sc.spawn({
            x: at.x,
            y: at.y,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v,
            ay: gravity,
            drag: 0.96,
            life: rnd(400,
                850),
            delay,
            s0: size * rnd(0.6,
                1.2),
            s1: 2,
            tint
        })
    }
}

/** Mảnh vỡ vuông xoay */
function shards(sc: Scene, at: Pt, n: number, speed: number, tint: number, size: number, gravity: number, delay = 0) {
    for (let i = 0; i < n; i++) {
        const a = rnd(0,
            Math.PI * 2)
        const v = rnd(speed * 0.3,
            speed)
        sc.spawn({
            tex: squareTex(),
            x: at.x,
            y: at.y,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v - speed * 0.3,
            ay: gravity,
            drag: 0.97,
            life: rnd(600,
                1100),
            delay,
            s0: size * rnd(0.5,
                1.3),
            s1: size * 0.3,
            tint,
            rot: rnd(0,
                6),
            vr: rnd(-8,
                8),
            flip: rnd(6,
                14)
        })
    }
}

// ---------- cardTrail ----------
registerVfx("cardTrail",
    (ctx) => {
        const a = ctx.from
        const b = ctx.to[0] ?? ctx.from
        const ms = clamp(dist(a,
            b) * 0.9,
        380,
        900)
        const arc = -Math.min(120,
            dist(a,
                b) * 0.15)
        const at = (t: number): Pt => {
            const p = lerpPt(a,
                b,
                t)
            return {
                x: p.x,
                y: p.y + Math.sin(Math.PI * t) * arc
            }
        }
        return run(ctx,
            ms,
            (sc) => {
                const head = sc.spawn({
                    x: a.x,
                    y: a.y,
                    life: ms + 200,
                    s0: 70 * sc.k,
                    s1: 50 * sc.k,
                    tint: ctx.color,
                    env: "hold",
                    alpha: 0.7
                })
                return (el, dt) => {
                    const p = at(easeOut(clamp(el / ms,
                        0,
                        1)))
                    head.x = p.x
                    head.y = p.y
                    const n = Math.max(1,
                        Math.round(dt / 8 * sc.k))
                    for (let i = 0; i < n; i++) {
                        const star = Math.random() < 0.5
                        sc.spawn({
                            tex: star ? starTex() : glowTex(),
                            x: p.x + rnd(-8,
                                8),
                            y: p.y + rnd(-8,
                                8),
                            vx: rnd(-30,
                                30),
                            vy: rnd(-20,
                                50),
                            drag: 0.95,
                            life: rnd(350,
                                700),
                            s0: rnd(10,
                                22),
                            s1: 2,
                            tint: star ? gold(ctx) : ctx.color,
                            rot: rnd(0,
                                3),
                            vr: rnd(-4,
                                4)
                        })
                    }
                }
            })
    })

// ---------- cardPlayFlash ----------
registerVfx("cardPlayFlash",
    (ctx) => run(ctx,
        600,
        (sc) => {
            const c = ctx.from
            flash(sc,
                c,
                ctx.color,
                220 * sc.k,
                450)
            ring(sc,
                c,
                gold(ctx),
                380 * sc.k,
                600)
            ring(sc,
                c,
                ctx.color,
                260 * sc.k,
                450,
                80,
                0.6)
            for (let i = 0; i < 10; i++) {
                const a = (i / 10) * Math.PI * 2
                const ray = sc.spawn({
                    tex: rayTex(),
                    x: c.x,
                    y: c.y,
                    life: 500,
                    s0: 256,
                    s1: 256,
                    tint: gold(ctx),
                    alpha: 0.5,
                    rot: a
                })
                ray.s.anchor.set(0.5,
                    0)
            }
            sparks(sc,
                c,
                Math.round(18 * sc.k),
                380,
                gold(ctx),
                12)
        }))

// ---------- summon ----------
registerVfx("summon",
    (ctx) => run(ctx,
        1100,
        (sc) => {
            const c = ctx.from
            const k = sc.k
            const base: Pt = {
                x: c.x,
                y: c.y + 30
            }
            // rune circle (elip, xoay)
            const g = new Graphics()
            g.circle(0,
                0,
                70).stroke({
                width: 3,
                color: ctx.color,
                alpha: 0.9
            })
            g.circle(0,
                0,
                54).stroke({
                width: 1.5,
                color: gold(ctx),
                alpha: 0.9
            })
            for (let i = 0; i < 8; i++) {
                const a = (i / 8) * Math.PI * 2
                g.moveTo(Math.cos(a) * 54,
                    Math.sin(a) * 54)
                g.lineTo(Math.cos(a + 0.4) * 70,
                    Math.sin(a + 0.4) * 70)
                g.stroke({
                    width: 2,
                    color: gold(ctx),
                    alpha: 0.9
                })
            }
            g.blendMode = "add"
            g.position.set(base.x,
                base.y)
            sc.root.addChild(g)
            // cột sáng rơi xuống
            const pillar = new Sprite(pillarTex())
            pillar.anchor.set(0.5,
                1)
            pillar.tint = ctx.color
            pillar.blendMode = "add"
            pillar.position.set(base.x,
                base.y)
            sc.root.addChild(pillar)
            const core = new Sprite(pillarTex())
            core.anchor.set(0.5,
                1)
            core.tint = 0xffffff
            core.blendMode = "add"
            core.position.set(base.x,
                base.y)
            sc.root.addChild(core)
            flash(sc,
                {
                    x: c.x,
                    y: c.y + 20
                },
                gold(ctx),
                160 * k,
                500,
                280)
            // vòng bụi
            for (let i = 0; i < 22 * k; i++) {
                const a = rnd(0,
                    Math.PI * 2)
                const v = rnd(80,
                    190)
                sc.spawn({
                    x: c.x,
                    y: c.y + 40,
                    vx: Math.cos(a) * v,
                    vy: Math.sin(a) * v * 0.35,
                    drag: 0.93,
                    life: rnd(500,
                        900),
                    delay: 280,
                    s0: rnd(18,
                        34),
                    s1: 40,
                    alpha: 0.4,
                    tint: 0xd8c8a8,
                    additive: false
                })
            }
            sparks(sc,
                base,
                Math.round(16 * k),
                220,
                gold(ctx),
                10,
                120,
                280)
            ring(sc,
                base,
                ctx.color,
                260 * k,
                700,
                280)
            return (el) => {
                const drop = easeIn(clamp(el / 300,
                    0,
                    1))
                const fadeOut = clamp((el - 500) / 600,
                    0,
                    1)
                const h = 380 * drop
                pillar.height = h
                pillar.width = 130 * k * (1 - fadeOut * 0.6)
                pillar.alpha = (1 - fadeOut) * 0.9
                core.height = h
                core.width = 44
                core.alpha = (1 - fadeOut) * 0.9
                const appear = clamp(el / 250,
                    0,
                    1)
                g.scale.set(appear,
                    appear * 0.4)
                g.rotation = el * 0.003
                g.alpha = 1 - clamp((el - 700) / 400,
                    0,
                    1)
            }
        }))

// ---------- death ----------
registerVfx("death",
    (ctx) => run(ctx,
        1500,
        (sc) => {
            const c = ctx.from
            const k = sc.k
            flash(sc,
                c,
                0xffffff,
                120 * k,
                260)
            shards(sc,
                c,
                Math.round(18 * k),
                340,
                ctx.color,
                14,
                700)
            for (let i = 0; i < 14 * k; i++) {
                const x0 = c.x + rnd(-30,
                    30)
                const y0 = c.y + rnd(-30,
                    40)
                const ph = rnd(0,
                    6)
                const rise = rnd(110,
                    220)
                const sway = rnd(10,
                    26)
                sc.spawn({
                    x: x0,
                    y: y0,
                    life: rnd(900,
                        1400),
                    delay: rnd(0,
                        350),
                    s0: rnd(22,
                        40),
                    s1: 6,
                    alpha: 0.85,
                    env: "pulse",
                    tint: Math.random() < 0.5 ? 0xbfe6ff : gold(ctx),
                    pos: (t) => ({
                        x: x0 + Math.sin(t * 7 + ph) * sway,
                        y: y0 - rise * easeOut(t)
                    })
                })
            }
        }))

// ---------- respawn ----------
registerVfx("respawn",
    (ctx) => run(ctx,
        1500,
        (sc) => {
            const c = ctx.from
            const k = sc.k
            for (let i = 0; i < 20 * k; i++) {
                const a = rnd(0,
                    Math.PI * 2)
                const r = rnd(110,
                    220)
                const x0 = c.x + Math.cos(a) * r
                const y0 = c.y + Math.sin(a) * r * 0.8 - 40
                const ph = rnd(0,
                    6)
                sc.spawn({
                    x: x0,
                    y: y0,
                    life: rnd(700,
                        950),
                    delay: rnd(0,
                        400),
                    s0: 8,
                    s1: rnd(20,
                        34),
                    alpha: 0.9,
                    env: "pulse",
                    tint: Math.random() < 0.5 ? 0xbfe6ff : gold(ctx),
                    pos: (t) => {
                        const e = easeIn(t)
                        return {
                            x: lerp(x0,
                                c.x,
                                e) + Math.sin(t * 8 + ph) * 8 * (1 - e),
                            y: lerp(y0,
                                c.y,
                                e)
                        }
                    }
                })
            }
            sc.spawn({
                x: c.x,
                y: c.y,
                life: 700,
                delay: 750,
                s0: 40,
                s1: 220 * k,
                tint: 0xffffff,
                env: "pulse"
            })
            ring(sc,
                c,
                gold(ctx),
                300 * k,
                700,
                850)
            ring(sc,
                c,
                ctx.color,
                200 * k,
                600,
                950,
                0.7)
            sparks(sc,
                c,
                Math.round(18 * k),
                260,
                gold(ctx),
                10,
                0,
                850)
        }))

// ---------- forge ----------
registerVfx("forge",
    (ctx) => run(ctx,
        1500,
        (sc) => {
            const c = ctx.from
            const k = sc.k
            const pts: Pt[] = ctx.to.slice(0,
                3)
            while (pts.length < 3) {
                const a = (pts.length / 3) * Math.PI * 2 - Math.PI / 2
                pts.push({
                    x: c.x + Math.cos(a) * 200,
                    y: c.y + Math.sin(a) * 160
                })
            }
            const T = 700
            for (const p0 of pts) {
                const bend = rnd(-50,
                    50)
                const pos = (t: number): Pt => {
                    const q = lerpPt(p0,
                        c,
                        easeIn(t))
                    return {
                        x: q.x + Math.sin(Math.PI * t) * bend,
                        y: q.y
                    }
                }
                sc.spawn({
                    tex: squareTex(),
                    x: p0.x,
                    y: p0.y,
                    life: T,
                    s0: 18,
                    s1: 10,
                    tint: 0xffffff,
                    rot: Math.PI / 4,
                    vr: 6,
                    env: "hold",
                    pos
                })
                sc.spawn({
                    x: p0.x,
                    y: p0.y,
                    life: T,
                    s0: 56,
                    s1: 36,
                    tint: ctx.color,
                    env: "hold",
                    pos
                })
                for (let i = 0; i < 10; i++) {
                    const lag = (i + 1) * 0.03
                    sc.spawn({
                        x: p0.x,
                        y: p0.y,
                        life: T,
                        s0: 18,
                        s1: 3,
                        alpha: 0.5,
                        tint: gold(ctx),
                        pos: (t) => pos(clamp(t - lag,
                            0,
                            1))
                    })
                }
            }
            flash(sc,
                c,
                0xffffff,
                180 * k,
                450,
                T)
            ring(sc,
                c,
                gold(ctx),
                280 * k,
                650,
                T)
            sparks(sc,
                c,
                Math.round(40 * k),
                520,
                gold(ctx),
                12,
                600,
                T)
            shards(sc,
                c,
                Math.round(10 * k),
                300,
                0xffe9a0,
                8,
                800,
                T)
        }))

// ---------- equip ----------
registerVfx("equip",
    (ctx) => {
        const a = ctx.from
        const b = ctx.to[0] ?? ctx.from
        const T = clamp(dist(a,
            b) * 0.9,
        350,
        800)
        return run(ctx,
            T,
            (sc) => {
                const head = sc.spawn({
                    x: a.x,
                    y: a.y,
                    life: T + 100,
                    s0: 54 * sc.k,
                    s1: 44 * sc.k,
                    tint: ctx.color,
                    env: "hold"
                })
                const core = sc.spawn({
                    tex: starTex(),
                    x: a.x,
                    y: a.y,
                    life: T + 100,
                    s0: 30,
                    s1: 22,
                    tint: 0xffffff,
                    vr: 5,
                    env: "hold"
                })
                flash(sc,
                    b,
                    gold(ctx),
                    120 * sc.k,
                    450,
                    T)
                ring(sc,
                    b,
                    ctx.color,
                    200 * sc.k,
                    600,
                    T)
                ring(sc,
                    b,
                    gold(ctx),
                    140 * sc.k,
                    500,
                    T + 80,
                    0.7)
                sparks(sc,
                    b,
                    Math.round(14 * sc.k),
                    200,
                    gold(ctx),
                    9,
                    0,
                    T)
                return (el, dt) => {
                    const p = lerpPt(a,
                        b,
                        easeOut(clamp(el / T,
                            0,
                            1)))
                    head.x = p.x
                    head.y = p.y
                    core.x = p.x
                    core.y = p.y
                    const n = Math.max(1,
                        Math.round(dt / 12))
                    for (let i = 0; i < n; i++) {
                        sc.spawn({
                            x: p.x + rnd(-6,
                                6),
                            y: p.y + rnd(-6,
                                6),
                            vx: rnd(-20,
                                20),
                            vy: rnd(-20,
                                20),
                            life: rnd(300,
                                500),
                            s0: rnd(14,
                                24),
                            s1: 2,
                            tint: Math.random() < 0.5 ? ctx.color : gold(ctx)
                        })
                    }
                }
            })
    })

// ---------- drawSpark ----------
registerVfx("drawSpark",
    (ctx) => run(ctx,
        450,
        (sc) => {
            flash(sc,
                ctx.from,
                ctx.color,
                50 * sc.k,
                300)
            sparks(sc,
                ctx.from,
                Math.round(8 * sc.k),
                160,
                gold(ctx),
                8)
        }))

// ---------- shuffle ----------
registerVfx("shuffle",
    (ctx) => run(ctx,
        1000,
        (sc) => {
            const c = ctx.from
            const n = Math.round(14 * sc.k)
            for (let i = 0; i < n; i++) {
                const a0 = (i / n) * Math.PI * 2
                const r0 = rnd(50,
                    90)
                const dir = i % 2 === 0 ? 1 : -1
                sc.spawn({
                    tex: squareTex(),
                    x: c.x,
                    y: c.y,
                    life: rnd(650,
                        900),
                    delay: rnd(0,
                        150),
                    s0: 14,
                    s1: 8,
                    alpha: 0.9,
                    env: "pulse",
                    tint: i % 3 === 0 ? gold(ctx) : ctx.color,
                    flip: rnd(8,
                        16),
                    vr: dir * 4,
                    pos: (t) => {
                        const a = a0 + dir * t * 6
                        const r = r0 * (0.4 + Math.sin(Math.PI * t) * 0.8)
                        return {
                            x: c.x + Math.cos(a) * r,
                            y: c.y + Math.sin(a) * r * 0.55
                        }
                    }
                })
                sc.spawn({
                    tex: starTex(),
                    x: c.x,
                    y: c.y,
                    life: 500,
                    delay: rnd(100,
                        600),
                    s0: 4,
                    s1: 22,
                    env: "pulse",
                    tint: 0xffffff,
                    pos: () => ({
                        x: c.x + Math.cos(a0) * r0 * 0.9,
                        y: c.y + Math.sin(a0) * r0 * 0.5
                    })
                })
            }
            ring(sc,
                c,
                ctx.color,
                150 * sc.k,
                700,
                0,
                0.5)
        }))

// ---------- prizeFlip ----------
registerVfx("prizeFlip",
    (ctx) => run(ctx,
        900,
        (sc) => {
            const c = ctx.from
            const k = sc.k
            const col = gold(ctx)
            flash(sc,
                c,
                col,
                110 * k,
                500)
            ring(sc,
                c,
                col,
                220 * k,
                650)
            ring(sc,
                c,
                ctx.color,
                150 * k,
                500,
                100,
                0.6)
            for (let i = 0; i < 8 * k; i++) {
                const a = rnd(-Math.PI,
                    0)
                const v = rnd(160,
                    340)
                sc.spawn({
                    tex: starTex(),
                    x: c.x,
                    y: c.y,
                    vx: Math.cos(a) * v,
                    vy: Math.sin(a) * v,
                    ay: 520,
                    drag: 0.98,
                    life: rnd(600,
                        900),
                    s0: rnd(12,
                        22),
                    s1: 4,
                    tint: col,
                    vr: rnd(-6,
                        6)
                })
            }
            sparks(sc,
                c,
                Math.round(14 * k),
                260,
                0xfff2b0,
                9)
        }))

// ---------- chainLink ----------
registerVfx("chainLink",
    (ctx) => {
        const pts: Pt[] = [ctx.from,
            ...ctx.to]
        const T = 800
        return run(ctx,
            T,
            (sc) => {
                const outer = new Graphics()
                const inner = new Graphics()
                outer.blendMode = "add"
                inner.blendMode = "add"
                sc.root.addChild(outer)
                sc.root.addChild(inner)
                pts.forEach((p, i) => {
                    flash(sc,
                        p,
                        i % 2 === 0 ? ctx.color : gold(ctx),
                        70 * sc.k,
                        450,
                        i * 90)
                    sparks(sc,
                        p,
                        Math.round(8 * sc.k),
                        180,
                        gold(ctx),
                        8,
                        0,
                        i * 90)
                })
                let last = -100
                const bolt = (g: Graphics, from: Pt, to: Pt, amp: number, w: number, col: number, al: number) => {
                    const n = Math.max(4,
                        Math.round(dist(from,
                            to) / 18))
                    const dx = to.x - from.x
                    const dy = to.y - from.y
                    const len = Math.hypot(dx,
                        dy) || 1
                    g.moveTo(from.x,
                        from.y)
                    for (let i = 1; i < n; i++) {
                        const t = i / n
                        const o = rnd(-amp,
                            amp)
                        g.lineTo(from.x + dx * t - (dy / len) * o,
                            from.y + dy * t + (dx / len) * o)
                    }
                    g.lineTo(to.x,
                        to.y)
                    g.stroke({
                        width: w,
                        color: col,
                        alpha: al
                    })
                }
                return (el) => {
                    if (el - last < 45) return
                    last = el
                    outer.clear()
                    inner.clear()
                    // đoạn thứ i hiện dần theo thứ tự
                    const reveal = el / (T * 0.55) * (pts.length - 1)
                    const fade = 1 - clamp((el - T * 0.7) / (T * 0.3),
                        0,
                        1)
                    for (let i = 0; i < pts.length - 1; i++) {
                        if (reveal < i) break
                        const f = clamp(reveal - i,
                            0,
                            1)
                        const to = lerpPt(pts[i],
                            pts[i + 1],
                            f)
                        bolt(outer,
                            pts[i],
                            to,
                            14,
                            6 * sc.k,
                            ctx.color,
                            0.55 * fade)
                        bolt(inner,
                            pts[i],
                            to,
                            8,
                            2.2,
                            gold(ctx),
                            0.95 * fade)
                        if (Math.random() < 0.5) bolt(inner,
                            pts[i],
                            to,
                            18,
                            1.2,
                            0xffffff,
                            0.7 * fade)
                    }
                }
            })
    })

// ---------- turnStart ----------
registerVfx("turnStart",
    (ctx) => {
        const W = ctx.app.screen.width
        const H = ctx.app.screen.height
        const T = 1000
        return run(ctx,
            T,
            (sc) => {
                const vig = new Sprite(vignetteTex())
                vig.width = W
                vig.height = H
                vig.tint = ctx.color
                vig.blendMode = "add"
                vig.alpha = 0
                sc.root.addChild(vig)
                const band = new Sprite(bandTex())
                band.anchor.set(0.5)
                band.width = 260 * sc.k
                band.height = H * 1.6
                band.rotation = 0.25
                band.tint = gold(ctx)
                band.blendMode = "add"
                sc.root.addChild(band)
                const core = new Sprite(bandTex())
                core.anchor.set(0.5)
                core.width = 70
                core.height = H * 1.6
                core.rotation = 0.25
                core.tint = 0xffffff
                core.blendMode = "add"
                sc.root.addChild(core)
                return (el) => {
                    const t = clamp(el / (T * 0.8),
                        0,
                        1)
                    const x = lerp(-200,
                        W + 200,
                        easeOut(t) * 0.6 + t * 0.4)
                    band.position.set(x,
                        H / 2)
                    core.position.set(x,
                        H / 2)
                    const a = Math.sin(Math.PI * t)
                    band.alpha = 0.55 * a
                    core.alpha = 0.7 * a
                    vig.alpha = 0.45 * Math.sin(Math.PI * clamp(el / T,
                        0,
                        1))
                }
            })
    })

// ---------- victory ----------
registerVfx("victory",
    (ctx) => {
        const W = ctx.app.screen.width
        const H = ctx.app.screen.height
        const c: Pt = {
            x: W / 2,
            y: H / 2
        }
        const T = 3200
        return run(ctx,
            T,
            (sc) => {
                const k = sc.k
                const rays: Sprite[] = []
                for (let i = 0; i < 14; i++) {
                    const s = new Sprite(rayTex())
                    s.anchor.set(0.5,
                        0)
                    s.position.set(c.x,
                        c.y)
                    s.height = Math.max(W,
                        H) * 0.8
                    s.width = 70
                    s.tint = i % 2 === 0 ? gold(ctx) : 0xfff2b0
                    s.blendMode = "add"
                    s.rotation = (i / 14) * Math.PI * 2
                    sc.root.addChild(s)
                    rays.push(s)
                }
                flash(sc,
                    c,
                    gold(ctx),
                    320 * k,
                    900)
                ring(sc,
                    c,
                    gold(ctx),
                    600 * k,
                    1100)
                const colors = [gold(ctx),
                    0xffffff,
                    ctx.color,
                    0xffb83d]
                const burst = (n: number, delay: number) => {
                    for (let i = 0; i < n; i++) {
                        const a = rnd(-Math.PI * 0.95,
                            -Math.PI * 0.05)
                        const v = rnd(300,
                            900)
                        sc.spawn({
                            tex: squareTex(),
                            x: c.x + rnd(-20,
                                20),
                            y: c.y,
                            vx: Math.cos(a) * v,
                            vy: Math.sin(a) * v,
                            ay: 600,
                            drag: 0.985,
                            life: rnd(1800,
                                2800),
                            delay,
                            s0: rnd(9,
                                16),
                            s1: rnd(7,
                                12),
                            env: "hold",
                            tint: colors[i % colors.length],
                            rot: rnd(0,
                                6),
                            vr: rnd(-8,
                                8),
                            flip: rnd(5,
                                12)
                        })
                    }
                }
                burst(Math.round(70 * k),
                    0)
                burst(Math.round(50 * k),
                    500)
                burst(Math.round(40 * k),
                    1000)
                sparks(sc,
                    c,
                    Math.round(40 * k),
                    700,
                    0xfff2b0,
                    10,
                    300)
                return (el) => {
                    const fade = 1 - clamp((el - 1800) / 1400,
                        0,
                        1)
                    const grow = easeOut(clamp(el / 500,
                        0,
                        1))
                    rays.forEach((r, i) => {
                        r.rotation += i % 2 === 0 ? 0.004 : -0.003
                        r.alpha = 0.5 * fade * grow
                    })
                }
            })
    })

// ---------- defeat ----------
registerVfx("defeat",
    (ctx) => {
        const W = ctx.app.screen.width
        const H = ctx.app.screen.height
        const T = 3000
        return run(ctx,
            T,
            (sc) => {
                const k = sc.k
                const veil = new Sprite(Texture.WHITE)
                veil.width = W
                veil.height = H
                veil.tint = 0x20202a
                veil.alpha = 0
                sc.root.addChild(veil)
                const vig = new Sprite(vignetteTex())
                vig.width = W
                vig.height = H
                vig.tint = 0xb01818
                vig.blendMode = "add"
                vig.alpha = 0
                sc.root.addChild(vig)
                const n = Math.round(90 * k)
                for (let i = 0; i < n; i++) {
                    sc.spawn({
                        tex: i % 2 === 0 ? squareTex() : glowTex(),
                        x: rnd(0,
                            W),
                        y: rnd(-60,
                            H * 0.2),
                        vx: rnd(-20,
                            20),
                        vy: rnd(40,
                            130),
                        life: rnd(1800,
                            2800),
                        delay: rnd(0,
                            1200),
                        s0: rnd(4,
                            11),
                        s1: rnd(2,
                            6),
                        alpha: rnd(0.4,
                            0.8),
                        env: "hold",
                        additive: false,
                        tint: i % 4 === 0 ? 0x55292b : 0x3a3a44,
                        rot: rnd(0,
                            6),
                        vr: rnd(-2,
                            2),
                        flip: i % 2 === 0 ? rnd(2,
                            5) : undefined
                    })
                }
                sc.spawn({
                    x: W / 2,
                    y: H / 2,
                    life: 2400,
                    s0: 300 * k,
                    s1: 520 * k,
                    alpha: 0.5,
                    env: "pulse",
                    tint: 0xaa1010
                })
                return (el) => {
                    const a = Math.sin(Math.PI * clamp(el / T,
                        0,
                        1))
                    veil.alpha = 0.4 * Math.min(1,
                        a * 2)
                    vig.alpha = 0.55 * a * (0.85 + Math.sin(el * 0.006) * 0.15)
                }
            })
    })
