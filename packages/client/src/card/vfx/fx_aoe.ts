// Hiệu ứng vùng / trạng thái / hỗ trợ kiểu Liên Minh: explosion, nova, groundSlam, frostNova, storm, meteor,
// shadowStrike, stunHit, silenceHit, blindHit, tauntHit, grievousHit, heal, shield, buff, cleanse, summonToken, drain.
// Mọi texture sinh bằng canvas một lần (cache), hạt dùng Sprite cộng sáng, dọn sạch khi xong.
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

const TAU = Math.PI * 2
const rnd = (a: number, b: number): number => a + Math.random() * (b - a)
const easeOut = (u: number): number => 1 - (1 - u) ** 3
const clamp01 = (u: number): number => Math.min(1,
    Math.max(0,
        u))
const WHITE = 0xffffff

function mix(a: number, b: number, t: number): number {
    const ar = (a >> 16) & 255
    const ag = (a >> 8) & 255
    const ab = a & 255
    const br = (b >> 16) & 255
    const bg = (b >> 8) & 255
    const bb = b & 255
    const r = Math.round(ar + (br - ar) * t)
    const g = Math.round(ag + (bg - ag) * t)
    const bl = Math.round(ab + (bb - ab) * t)
    return (r << 16) | (g << 8) | bl
}

const targets = (ctx: VfxCtx): Pt[] => (ctx.to.length > 0 ? ctx.to : [ctx.from])
const kOf = (ctx: VfxCtx): number => 1 + (Math.max(1,
    ctx.intensity) - 1) * 0.55

// ---------- Texture sinh bằng canvas ----------

type TexName = "glow" | "ring" | "spark" | "slash" | "star4" | "star5" | "shard" | "hex" | "smoke" | "debris" | "cross" | "rune" | "chev"

type G2 = CanvasRenderingContext2D

function radial(g: G2, cx: number, cy: number, r: number, stops: Array<[number, string]>): CanvasGradient {
    const gr = g.createRadialGradient(cx,
        cy,
        0,
        cx,
        cy,
        r)
    for (const [o,
        c] of stops) {
        gr.addColorStop(o,
            c)
    }
    return gr
}

function canvasTex(w: number, h: number, draw: (g: G2) => void): Texture {
    const c = document.createElement("canvas")
    c.width = w
    c.height = h
    const g = c.getContext("2d")
    if (!g) {
        return Texture.WHITE
    }
    draw(g)
    return Texture.from(c)
}

function polyPath(g: G2, pts: Array<[number, number]>) {
    g.beginPath()
    pts.forEach(([x,
        y], i) => {
        if (i === 0) {
            g.moveTo(x,
                y)
        } else {
            g.lineTo(x,
                y)
        }
    })
    g.closePath()
}

function starPts(cx: number, cy: number, spikes: number, ro: number, ri: number, rot: number): Array<[number, number]> {
    const out: Array<[number, number]> = []
    for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? ro : ri
        const a = rot + (i / (spikes * 2)) * TAU
        out.push([cx + Math.cos(a) * r,
            cy + Math.sin(a) * r])
    }
    return out
}

function build(name: TexName): Texture {
    switch (name) {
    case "glow":
        return canvasTex(128,
            128,
            (g) => {
                g.fillStyle = radial(g,
                    64,
                    64,
                    64,
                    [
                        [0,
                            "rgba(255,255,255,1)"],
                        [0.22,
                            "rgba(255,255,255,0.6)"],
                        [0.55,
                            "rgba(255,255,255,0.16)"],
                        [1,
                            "rgba(255,255,255,0)"]
                    ])
                g.fillRect(0,
                    0,
                    128,
                    128)
            })
    case "ring":
        return canvasTex(128,
            128,
            (g) => {
                g.fillStyle = radial(g,
                    64,
                    64,
                    64,
                    [
                        [0,
                            "rgba(255,255,255,0)"],
                        [0.7,
                            "rgba(255,255,255,0)"],
                        [0.86,
                            "rgba(255,255,255,1)"],
                        [0.93,
                            "rgba(255,255,255,0.5)"],
                        [1,
                            "rgba(255,255,255,0)"]
                    ])
                g.fillRect(0,
                    0,
                    128,
                    128)
            })
    case "spark":
        return canvasTex(128,
            32,
            (g) => {
                g.translate(64,
                    16)
                g.scale(1,
                    0.25)
                g.fillStyle = radial(g,
                    0,
                    0,
                    64,
                    [
                        [0,
                            "rgba(255,255,255,1)"],
                        [0.4,
                            "rgba(255,255,255,0.55)"],
                        [1,
                            "rgba(255,255,255,0)"]
                    ])
                g.fillRect(-64,
                    -64,
                    128,
                    128)
            })
    case "slash":
        return canvasTex(256,
            32,
            (g) => {
                const lg = g.createLinearGradient(0,
                    0,
                    256,
                    0)
                lg.addColorStop(0,
                    "rgba(255,255,255,0)")
                lg.addColorStop(0.35,
                    "rgba(255,255,255,0.9)")
                lg.addColorStop(0.7,
                    "rgba(255,255,255,1)")
                lg.addColorStop(1,
                    "rgba(255,255,255,0)")
                g.fillStyle = lg
                g.beginPath()
                g.moveTo(0,
                    16)
                g.quadraticCurveTo(150,
                    0,
                    256,
                    15)
                g.quadraticCurveTo(150,
                    32,
                    0,
                    16)
                g.fill()
            })
    case "star4":
        return canvasTex(128,
            128,
            (g) => {
                g.shadowColor = "white"
                g.shadowBlur = 10
                g.fillStyle = "white"
                const pts: Array<[number, number]> = []
                for (let i = 0; i < 8; i++) {
                    const r = i % 2 === 0 ? 58 : 7
                    const a = (i / 8) * TAU - Math.PI / 2
                    pts.push([64 + Math.cos(a) * r,
                        64 + Math.sin(a) * r])
                }
                polyPath(g,
                    pts)
                g.fill()
            })
    case "star5":
        return canvasTex(128,
            128,
            (g) => {
                g.shadowColor = "white"
                g.shadowBlur = 8
                g.fillStyle = "white"
                polyPath(g,
                    starPts(64,
                        66,
                        5,
                        54,
                        23,
                        -Math.PI / 2))
                g.fill()
            })
    case "shard":
        return canvasTex(48,
            96,
            (g) => {
                const lg = g.createLinearGradient(0,
                    0,
                    0,
                    96)
                lg.addColorStop(0,
                    "rgba(255,255,255,1)")
                lg.addColorStop(1,
                    "rgba(255,255,255,0.45)")
                g.fillStyle = lg
                polyPath(g,
                    [
                        [24,
                            0],
                        [46,
                            94],
                        [2,
                            94]
                    ])
                g.fill()
                g.strokeStyle = "rgba(255,255,255,1)"
                g.lineWidth = 2
                g.stroke()
                g.fillStyle = "rgba(255,255,255,0.55)"
                polyPath(g,
                    [
                        [24,
                            6],
                        [30,
                            70],
                        [24,
                            90]
                    ])
                g.fill()
            })
    case "hex":
        return canvasTex(128,
            128,
            (g) => {
                g.shadowColor = "white"
                g.shadowBlur = 6
                const outer: Array<[number, number]> = []
                const inner: Array<[number, number]> = []
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * TAU - Math.PI / 2
                    outer.push([64 + Math.cos(a) * 58,
                        64 + Math.sin(a) * 58])
                    inner.push([64 + Math.cos(a) * 46,
                        64 + Math.sin(a) * 46])
                }
                polyPath(g,
                    outer)
                g.fillStyle = "rgba(255,255,255,0.14)"
                g.fill()
                g.strokeStyle = "white"
                g.lineWidth = 6
                g.stroke()
                polyPath(g,
                    inner)
                g.lineWidth = 2
                g.strokeStyle = "rgba(255,255,255,0.6)"
                g.stroke()
            })
    case "smoke":
        return canvasTex(128,
            128,
            (g) => {
                const blobs: Array<[number, number, number]> = [
                    [64,
                        64,
                        52],
                    [44,
                        52,
                        36],
                    [84,
                        58,
                        38],
                    [56,
                        82,
                        36],
                    [80,
                        80,
                        34],
                    [64,
                        42,
                        32]
                ]
                for (const [x,
                    y,
                    r] of blobs) {
                    g.fillStyle = radial(g,
                        x,
                        y,
                        r,
                        [
                            [0,
                                "rgba(255,255,255,0.55)"],
                            [0.6,
                                "rgba(255,255,255,0.22)"],
                            [1,
                                "rgba(255,255,255,0)"]
                        ])
                    g.fillRect(0,
                        0,
                        128,
                        128)
                }
            })
    case "debris":
        return canvasTex(24,
            24,
            (g) => {
                g.fillStyle = "white"
                polyPath(g,
                    [
                        [3,
                            8],
                        [11,
                            1],
                        [21,
                            6],
                        [22,
                            17],
                        [12,
                            23],
                        [2,
                            17]
                    ])
                g.fill()
            })
    case "cross":
        return canvasTex(128,
            128,
            (g) => {
                g.shadowColor = "white"
                g.shadowBlur = 12
                g.fillStyle = "white"
                g.fillRect(48,
                    16,
                    32,
                    96)
                g.fillRect(16,
                    48,
                    96,
                    32)
            })
    case "rune":
        return canvasTex(256,
            256,
            (g) => {
                g.shadowColor = "white"
                g.shadowBlur = 8
                g.strokeStyle = "white"
                g.lineCap = "round"
                g.lineWidth = 5
                g.beginPath()
                g.arc(128,
                    128,
                    120,
                    0,
                    TAU)
                g.stroke()
                g.lineWidth = 2
                g.beginPath()
                g.arc(128,
                    128,
                    104,
                    0,
                    TAU)
                g.stroke()
                g.lineWidth = 3
                for (let i = 0; i < 24; i++) {
                    const a = (i / 24) * TAU
                    const r0 = 104
                    const r1 = i % 2 === 0 ? 116 : 110
                    g.beginPath()
                    g.moveTo(128 + Math.cos(a) * r0,
                        128 + Math.sin(a) * r0)
                    g.lineTo(128 + Math.cos(a) * r1,
                        128 + Math.sin(a) * r1)
                    g.stroke()
                }
                g.lineWidth = 3
                for (let t = 0; t < 2; t++) {
                    const pts: Array<[number, number]> = []
                    for (let i = 0; i < 3; i++) {
                        const a = (i / 3) * TAU + t * (Math.PI / 3) - Math.PI / 2
                        pts.push([128 + Math.cos(a) * 88,
                            128 + Math.sin(a) * 88])
                    }
                    polyPath(g,
                        pts)
                    g.stroke()
                }
                g.beginPath()
                g.arc(128,
                    128,
                    30,
                    0,
                    TAU)
                g.stroke()
                g.fillStyle = "white"
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * TAU - Math.PI / 2
                    g.beginPath()
                    g.arc(128 + Math.cos(a) * 88,
                        128 + Math.sin(a) * 88,
                        5,
                        0,
                        TAU)
                    g.fill()
                }
                g.beginPath()
                g.arc(128,
                    128,
                    8,
                    0,
                    TAU)
                g.fill()
            })
    case "chev":
        return canvasTex(64,
            64,
            (g) => {
                g.shadowColor = "white"
                g.shadowBlur = 6
                g.strokeStyle = "white"
                g.lineWidth = 9
                g.lineCap = "round"
                g.lineJoin = "round"
                g.beginPath()
                g.moveTo(12,
                    40)
                g.lineTo(32,
                    18)
                g.lineTo(52,
                    40)
                g.stroke()
            })
    }
}

const TEX = new Map<TexName, Texture>()

function tex(name: TexName): Texture {
    let t = TEX.get(name)
    if (!t) {
        t = build(name)
        TEX.set(name,
            t)
    }
    return t
}

// ---------- Khung chạy: hạt, lịch hoạt ảnh, dọn dẹp ----------

interface PartOpts {
    tex: TexName;
    vx?: number;
    vy?: number;
    gy?: number;
    drag?: number;
    life: number;
    /** Kích thước đầu / cuối (px, theo bề rộng texture) */
    s0: number;
    s1: number;
    /** Tỉ lệ dẹt theo chiều dọc */
    sy?: number;
    a0?: number;
    a1?: number;
    tint: number;
    add?: boolean;
    rot?: number;
    vr?: number;
    /** Xoay theo hướng bay */
    align?: boolean;
    /** Alpha dạng sin (mờ vào, mờ ra) */
    inout?: boolean;
    delay?: number;
}

interface Part {
    sp: Sprite;
    o: PartOpts;
    x: number;
    y: number;
    vx: number;
    vy: number;
    age: number;
}

interface Anim {
    delay: number;
    dur: number;
    fn: (u: number, dt: number) => void;
}

class Scope {
    root = new Container()

    t = 0

    private parts: Part[] = []

    private anims: Anim[] = []

    constructor(readonly ctx: VfxCtx) {}

    spr(name: TexName, x: number, y: number, tint: number, add = true): Sprite {
        const sp = new Sprite(tex(name))
        sp.anchor.set(0.5)
        sp.position.set(x,
            y)
        sp.tint = tint
        if (add) {
            sp.blendMode = "add"
        }
        this.root.addChild(sp)
        return sp
    }

    emit(p: Pt, o: PartOpts): Part {
        const sp = this.spr(o.tex,
            p.x,
            p.y,
            o.tint,
            o.add !== false)
        sp.visible = false
        const part: Part = {
            sp,
            o,
            x: p.x,
            y: p.y,
            vx: o.vx ?? 0,
            vy: o.vy ?? 0,
            age: -(o.delay ?? 0)
        }
        this.parts.push(part)
        return part
    }

    anim(delay: number, dur: number, fn: (u: number, dt: number) => void) {
        this.anims.push({
            delay,
            dur,
            fn
        })
    }

    step(dt: number) {
        this.t += dt
        for (let i = 0; i < this.anims.length; i++) {
            const a = this.anims[i]
            if (this.t < a.delay) {
                continue
            }
            const u = a.dur > 0 ? Math.min(1,
                (this.t - a.delay) / a.dur) : 1
            a.fn(u,
                dt)
            if (u >= 1) {
                a.delay = Infinity
            }
        }
        this.anims = this.anims.filter((a) => a.delay !== Infinity)
        const sec = dt / 1000
        for (const p of this.parts) {
            const o = p.o
            p.age += dt
            if (p.age < 0) {
                continue
            }
            const u = p.age / o.life
            if (u >= 1) {
                p.sp.destroy()
                p.sp = null as unknown as Sprite
                continue
            }
            p.sp.visible = true
            const drag = o.drag ?? 1
            if (drag !== 1) {
                const f = drag ** (dt / 16.67)
                p.vx *= f
                p.vy *= f
            }
            p.vy += (o.gy ?? 0) * sec
            p.x += p.vx * sec
            p.y += p.vy * sec
            p.sp.position.set(p.x,
                p.y)
            const size = (o.s0 + (o.s1 - o.s0) * easeOut(u)) / p.sp.texture.width
            p.sp.scale.set(size,
                size * (o.sy ?? 1))
            const a0 = o.a0 ?? 1
            p.sp.alpha = o.inout ? a0 * Math.sin(Math.PI * u) : a0 + ((o.a1 ?? 0) - a0) * u
            if (o.align) {
                p.sp.rotation = Math.atan2(p.vy,
                    p.vx)
            } else {
                p.sp.rotation = (o.rot ?? 0) + ((o.vr ?? 0) * p.age) / 1000
            }
        }
        this.parts = this.parts.filter((p) => p.sp !== null)
    }

    destroy() {
        if (!this.root.destroyed) {
            this.root.destroy({
                children: true
            })
        }
    }
}

function play(ctx: VfxCtx, ms: number, setup: (s: Scope) => void): Promise<void> {
    return new Promise<void>((resolve) => {
        const s = new Scope(ctx)
        let done = false
        const finish = () => {
            if (done) {
                return
            }
            done = true
            try {
                ctx.app.ticker.remove(tick)
            } catch {
                // app đã huỷ
            }
            s.destroy()
            resolve()
        }
        const tick = (t: Ticker) => {
            if (s.root.destroyed) {
                finish()
                return
            }
            s.step(Math.min(t.deltaMS,
                50))
            if (s.t >= ms) {
                finish()
            }
        }
        try {
            ctx.layer.addChild(s.root)
            setup(s)
            ctx.app.ticker.add(tick)
        } catch {
            finish()
        }
    })
}

/** Đặt kích thước sprite theo bề rộng px */
function sz(sp: Sprite, px: number, sy = 1) {
    const k = px / sp.texture.width
    sp.scale.set(k,
        k * sy)
}

// ---------- Khối dựng chung ----------

/** Chớp sáng nhỏ khi trúng: glow + vòng + sao + tia */
function hitBurst(s: Scope, p: Pt, k: number, c1: number, c2: number, delay: number, size = 70) {
    s.anim(delay,
        0,
        () => {
            s.emit(p,
                {
                    tex: "glow",
                    life: 240,
                    s0: size * 1.4,
                    s1: size * 3,
                    tint: WHITE
                })
            s.emit(p,
                {
                    tex: "glow",
                    life: 520,
                    s0: size,
                    s1: size * 2.4,
                    tint: c1,
                    a0: 0.9
                })
            s.emit(p,
                {
                    tex: "ring",
                    life: 420,
                    s0: size * 0.4,
                    s1: size * 2.8,
                    tint: c2,
                    a0: 0.9
                })
            s.emit(p,
                {
                    tex: "star4",
                    life: 320,
                    s0: size * 0.5,
                    s1: size * 2.4,
                    tint: WHITE,
                    rot: rnd(0,
                        1),
                    vr: rnd(-3,
                        3)
                })
            const n = Math.round(10 * k)
            for (let i = 0; i < n; i++) {
                const a = rnd(0,
                    TAU)
                const v = rnd(200,
                    520)
                s.emit(p,
                    {
                        tex: "spark",
                        vx: Math.cos(a) * v,
                        vy: Math.sin(a) * v,
                        drag: 0.93,
                        life: rnd(300,
                            560),
                        s0: rnd(26,
                            54),
                        s1: 6,
                        tint: mix(c2,
                            WHITE,
                            0.5),
                        align: true
                    })
            }
        })
}

/** Vụ nổ lớn: loé, cầu lửa, sóng xung kích, mảnh vỡ, khói, tàn lửa */
function blast(s: Scope, p: Pt, k: number, c1: number, c2: number, delay: number, shakePow: number) {
    const R = 120 * k
    s.anim(delay,
        0,
        () => {
            s.emit(p,
                {
                    tex: "glow",
                    life: 260,
                    s0: R * 1.2,
                    s1: R * 3.4,
                    tint: WHITE
                })
            s.emit(p,
                {
                    tex: "glow",
                    life: 760,
                    s0: R,
                    s1: R * 2.8,
                    tint: c1,
                    a0: 0.95
                })
            s.emit(p,
                {
                    tex: "glow",
                    life: 560,
                    s0: R * 0.6,
                    s1: R * 1.7,
                    tint: c2
                })
            s.emit(p,
                {
                    tex: "ring",
                    life: 540,
                    s0: 40,
                    s1: R * 3.6,
                    tint: c2,
                    a0: 0.95
                })
            s.emit({
                x: p.x,
                y: p.y + R * 0.2
            },
            {
                tex: "ring",
                life: 760,
                s0: 40,
                s1: R * 4.6,
                sy: 0.4,
                tint: c1,
                a0: 0.55
            })
            s.emit(p,
                {
                    tex: "star4",
                    life: 380,
                    s0: R * 0.8,
                    s1: R * 3,
                    tint: WHITE,
                    rot: rnd(0,
                        1),
                    vr: 1.5
                })
            const nF = Math.round(8 * k)
            for (let i = 0; i < nF; i++) {
                const a = rnd(0,
                    TAU)
                const v = rnd(60,
                    260) * k
                s.emit(p,
                    {
                        tex: "glow",
                        vx: Math.cos(a) * v,
                        vy: Math.sin(a) * v * 0.8 - 40,
                        drag: 0.95,
                        life: rnd(420,
                            720),
                        s0: R * rnd(0.5,
                            0.9),
                        s1: R * 0.25,
                        tint: mix(c1,
                            c2,
                            rnd(0,
                                1)),
                        a0: 0.8
                    })
            }
            const nS = Math.round(20 * k)
            for (let i = 0; i < nS; i++) {
                const a = rnd(0,
                    TAU)
                const v = rnd(300,
                    900) * Math.sqrt(k)
                s.emit(p,
                    {
                        tex: "spark",
                        vx: Math.cos(a) * v,
                        vy: Math.sin(a) * v,
                        gy: 500,
                        drag: 0.92,
                        life: rnd(450,
                            900),
                        s0: rnd(40,
                            100),
                        s1: 8,
                        tint: mix(c2,
                            WHITE,
                            rnd(0.2,
                                0.7)),
                        align: true
                    })
            }
            const nD = Math.round(11 * k)
            for (let i = 0; i < nD; i++) {
                s.emit(p,
                    {
                        tex: "debris",
                        vx: rnd(-380,
                            380) * Math.sqrt(k),
                        vy: rnd(-760,
                            -280),
                        gy: 1500,
                        life: rnd(800,
                            1250),
                        s0: rnd(12,
                            26),
                        s1: rnd(10,
                            22),
                        tint: mix(0x2a1e18,
                            c1,
                            rnd(0,
                                0.3)),
                        add: false,
                        rot: rnd(0,
                            TAU),
                        vr: rnd(-12,
                            12),
                        a0: 1,
                        a1: 0.1
                    })
            }
            const nM = Math.round(8 * k)
            for (let i = 0; i < nM; i++) {
                const a = rnd(0,
                    TAU)
                const d = rnd(0,
                    R * 0.7)
                s.emit({
                    x: p.x + Math.cos(a) * d,
                    y: p.y + Math.sin(a) * d * 0.6
                },
                {
                    tex: "smoke",
                    vx: Math.cos(a) * rnd(20,
                        90),
                    vy: rnd(-130,
                        -40),
                    drag: 0.97,
                    delay: rnd(80,
                        240),
                    life: rnd(1000,
                        1500),
                    s0: R * 0.5,
                    s1: R * rnd(1.4,
                        2),
                    tint: 0x241d1a,
                    add: false,
                    a0: 0.75,
                    rot: rnd(0,
                        TAU),
                    vr: rnd(-0.6,
                        0.6)
                })
            }
            const nE = Math.round(12 * k)
            for (let i = 0; i < nE; i++) {
                s.emit(p,
                    {
                        tex: "star4",
                        vx: rnd(-140,
                            140),
                        vy: rnd(-260,
                            -40),
                        gy: -60,
                        delay: rnd(0,
                            200),
                        life: rnd(900,
                            1500),
                        s0: rnd(8,
                            16),
                        s1: 3,
                        tint: c2,
                        a0: 0.9
                    })
            }
            s.ctx.shake(shakePow,
                360 * Math.sqrt(k))
        })
}

function column(s: Scope, p: Pt, tint: number, w: number, h: number, delay: number, dur: number, peak: number) {
    const sp = s.spr("glow",
        p.x,
        p.y - h / 2,
        tint)
    sp.visible = false
    s.anim(delay,
        dur,
        (u) => {
            sp.visible = true
            sp.scale.set(w / 128,
                h / 128)
            sp.alpha = peak * Math.sin(Math.PI * u)
            sp.scale.y = (h / 128) * (0.6 + 0.4 * easeOut(Math.min(1,
                u * 3)))
            sp.y = p.y - (sp.scale.y * 128) / 2
        })
}

// ---------- Bolt sét ----------

function boltPts(a: Pt, b: Pt, jitter: number, segs: number): Pt[] {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx,
        dy) || 1
    const nx = -dy / len
    const ny = dx / len
    const out: Pt[] = [a]
    for (let i = 1; i < segs; i++) {
        const t = i / segs
        const taper = Math.min(1,
            (1 - t) * 3)
        const off = rnd(-jitter,
            jitter) * taper
        out.push({
            x: a.x + dx * t + nx * off,
            y: a.y + dy * t + ny * off
        })
    }
    out.push(b)
    return out
}

function strokePath(g: Graphics, pts: Pt[], width: number, color: number, alpha: number) {
    g.moveTo(pts[0].x,
        pts[0].y)
    for (let i = 1; i < pts.length; i++) {
        g.lineTo(pts[i].x,
            pts[i].y)
    }
    g.stroke({
        width,
        color,
        alpha,
        cap: "round",
        join: "round"
    })
}

function drawBolt(g: Graphics, pts: Pt[], branches: Pt[][], color: number, w: number) {
    g.clear()
    strokePath(g,
        pts,
        w * 6,
        color,
        0.22)
    strokePath(g,
        pts,
        w * 2.6,
        color,
        0.8)
    strokePath(g,
        pts,
        w,
        WHITE,
        1)
    for (const b of branches) {
        strokePath(g,
            b,
            w * 2,
            color,
            0.6)
        strokePath(g,
            b,
            w * 0.7,
            WHITE,
            0.9)
    }
}

function boltStrike(s: Scope, p: Pt, k: number, c1: number, c2: number, delay: number) {
    const top: Pt = {
        x: p.x + rnd(-110,
            110),
        y: p.y - 560
    }
    const g = new Graphics()
    g.blendMode = "add"
    g.visible = false
    s.root.addChild(g)
    let last = -1
    const w = 3 * Math.sqrt(k)
    s.anim(delay,
        360,
        (u) => {
            const idx = Math.floor(u * 4)
            if (idx !== last && u < 1) {
                last = idx
                g.visible = true
                const pts = boltPts(top,
                    p,
                    46,
                    12)
                const branches: Pt[][] = []
                for (let i = 0; i < 2; i++) {
                    const from = pts[Math.floor(rnd(3,
                        9))]
                    const to: Pt = {
                        x: from.x + rnd(-120,
                            120),
                        y: from.y + rnd(60,
                            160)
                    }
                    branches.push(boltPts(from,
                        to,
                        16,
                        4))
                }
                drawBolt(g,
                    pts,
                    branches,
                    c1,
                    w)
            }
            g.alpha = u >= 1 ? 0 : (1 - u * u) * (idx % 2 === 0 ? 1 : 0.7)
        })
    s.anim(delay,
        0,
        () => {
            s.emit(top,
                {
                    tex: "glow",
                    life: 300,
                    s0: 140 * k,
                    s1: 220 * k,
                    tint: c1,
                    a0: 0.7
                })
            s.emit(p,
                {
                    tex: "glow",
                    life: 380,
                    s0: 90 * k,
                    s1: 260 * k,
                    tint: WHITE
                })
            s.emit(p,
                {
                    tex: "glow",
                    life: 640,
                    s0: 80 * k,
                    s1: 200 * k,
                    tint: c1,
                    a0: 0.8
                })
            s.emit({
                x: p.x,
                y: p.y + 8
            },
            {
                tex: "ring",
                life: 520,
                s0: 30,
                s1: 230 * k,
                sy: 0.45,
                tint: c2,
                a0: 0.9
            })
            s.emit(p,
                {
                    tex: "star4",
                    life: 300,
                    s0: 40,
                    s1: 190 * k,
                    tint: WHITE,
                    rot: rnd(0,
                        1)
                })
            const n = Math.round(12 * k)
            for (let i = 0; i < n; i++) {
                const a = rnd(Math.PI,
                    TAU)
                const v = rnd(200,
                    600)
                s.emit(p,
                    {
                        tex: "spark",
                        vx: Math.cos(a) * v * 1.2,
                        vy: Math.sin(a) * v,
                        gy: 900,
                        drag: 0.94,
                        life: rnd(300,
                            600),
                        s0: rnd(26,
                            60),
                        s1: 6,
                        tint: mix(c2,
                            WHITE,
                            0.6),
                        align: true
                    })
            }
            s.ctx.shake(4 * k,
                170)
        })
}

// ================= Đăng ký hiệu ứng =================

// --- explosion: vụ nổ lửa lớn (thùng nổ Gangplank...) ---
registerVfx("explosion",
    (ctx) => {
        const k = kOf(ctx)
        const c2 = ctx.color2 ?? 0xffd36b
        const pts = targets(ctx)
        return play(ctx,
            pts.length * 70 + 1800,
            (s) => {
                pts.forEach((p, i) => {
                    blast(s,
                        p,
                        k,
                        ctx.color,
                        c2,
                        i * 70,
                        i === 0 ? 10 * ctx.intensity : 4 * ctx.intensity)
                })
            })
    })

// --- nova: vòng sóng bung ra từ `from`, chạm từng mục tiêu ---
registerVfx("nova",
    (ctx) => {
        const k = kOf(ctx)
        const c2 = ctx.color2 ?? mix(ctx.color,
            WHITE,
            0.6)
        const from = ctx.from
        const maxD = ctx.to.reduce((m, p) => Math.max(m,
            Math.hypot(p.x - from.x,
                p.y - from.y)),
        0)
        const R = Math.max(320,
            maxD + 90)
        const dur = 640 * Math.sqrt(k)
        return play(ctx,
            dur + 1000,
            (s) => {
                const ring = s.spr("ring",
                    from.x,
                    from.y,
                    ctx.color)
                const ring2 = s.spr("ring",
                    from.x,
                    from.y,
                    c2)
                const disc = s.spr("glow",
                    from.x,
                    from.y,
                    ctx.color)
                s.anim(0,
                    dur,
                    (u) => {
                        const e = easeOut(u)
                        sz(ring,
                            Math.max(2,
                                R * 2 * e))
                        ring.alpha = 1 - u * u
                        sz(ring2,
                            Math.max(2,
                                R * 1.7 * e))
                        ring2.alpha = (1 - u) * 0.8
                        sz(disc,
                            Math.max(2,
                                R * 2 * e))
                        disc.alpha = (1 - u) * 0.3
                    })
                s.anim(0,
                    0,
                    () => {
                        s.emit(from,
                            {
                                tex: "glow",
                                life: 360,
                                s0: 120 * k,
                                s1: 380 * k,
                                tint: WHITE
                            })
                        s.emit(from,
                            {
                                tex: "star4",
                                life: 420,
                                s0: 80,
                                s1: 340 * k,
                                tint: c2,
                                vr: 2
                            })
                        const n = Math.round(26 * k)
                        for (let i = 0; i < n; i++) {
                            const a = (i / n) * TAU + rnd(-0.1,
                                0.1)
                            const v = (R / dur) * 1000 * rnd(0.8,
                                1.05)
                            s.emit(from,
                                {
                                    tex: "spark",
                                    vx: Math.cos(a) * v,
                                    vy: Math.sin(a) * v,
                                    life: dur * rnd(0.7,
                                        1),
                                    s0: rnd(40,
                                        90),
                                    s1: 10,
                                    tint: c2,
                                    align: true,
                                    a0: 0.9
                                })
                        }
                        ctx.shake(5 * ctx.intensity,
                            300)
                    })
                for (const p of ctx.to) {
                    const d = Math.hypot(p.x - from.x,
                        p.y - from.y)
                    const u = 1 - (1 - clamp01(d / R)) ** (1 / 3)
                    hitBurst(s,
                        p,
                        k,
                        ctx.color,
                        c2,
                        u * dur,
                        64 * Math.sqrt(k))
                }
            })
    })

// --- groundSlam: nứt đất + bụi toả từ `from` ---
registerVfx("groundSlam",
    (ctx) => {
        const k = kOf(ctx)
        const c2 = ctx.color2 ?? 0xffa040
        const o = ctx.from
        return play(ctx,
            1700,
            (s) => {
                const n = Math.round(10 * k)
                for (let i = 0; i < n; i++) {
                    const ang = (i / n) * TAU + rnd(-0.22,
                        0.22)
                    const len = rnd(150,
                        300) * k
                    const pts: Pt[] = [o]
                    const segs = 8
                    for (let j = 1; j <= segs; j++) {
                        const d = (j / segs) * len
                        const off = j === segs ? 0 : rnd(-16,
                            16)
                        const x = Math.cos(ang) * d - Math.sin(ang) * off
                        const y = Math.sin(ang) * d + Math.cos(ang) * off
                        pts.push({
                            x: o.x + x,
                            y: o.y + y * 0.55
                        })
                    }
                    const glowG = new Graphics()
                    glowG.blendMode = "add"
                    const coreG = new Graphics()
                    s.root.addChild(coreG)
                    s.root.addChild(glowG)
                    const delay = rnd(0,
                        90)
                    s.anim(delay,
                        1400,
                        (u) => {
                            const grow = clamp01(u / 0.16)
                            if (grow < 1 || u === 1 || glowG.alpha === 1) {
                                const cnt = Math.max(2,
                                    Math.ceil(pts.length * grow))
                                const part = pts.slice(0,
                                    cnt)
                                coreG.clear()
                                strokePath(coreG,
                                    part,
                                    5,
                                    0x120d0a,
                                    0.9)
                                glowG.clear()
                                strokePath(glowG,
                                    part,
                                    9,
                                    c2,
                                    0.35)
                                strokePath(glowG,
                                    part,
                                    3,
                                    mix(c2,
                                        WHITE,
                                        0.6),
                                    0.9)
                            }
                            const fade = u < 0.45 ? 1 : 1 - (u - 0.45) / 0.55
                            glowG.alpha = Math.min(1,
                                fade * 1.6) * (u < 0.45 ? 1 : fade)
                            coreG.alpha = fade
                        })
                }
                s.anim(0,
                    0,
                    () => {
                        s.emit(o,
                            {
                                tex: "glow",
                                life: 300,
                                s0: 160 * k,
                                s1: 340 * k,
                                tint: WHITE
                            })
                        s.emit(o,
                            {
                                tex: "glow",
                                life: 700,
                                s0: 120 * k,
                                s1: 280 * k,
                                sy: 0.5,
                                tint: c2,
                                a0: 0.8
                            })
                        s.emit(o,
                            {
                                tex: "ring",
                                life: 620,
                                s0: 40,
                                s1: 640 * k,
                                sy: 0.5,
                                tint: WHITE,
                                a0: 0.8
                            })
                        s.emit(o,
                            {
                                tex: "ring",
                                life: 820,
                                s0: 30,
                                s1: 520 * k,
                                sy: 0.5,
                                tint: ctx.color,
                                a0: 0.7,
                                delay: 80
                            })
                        const nD = Math.round(16 * k)
                        for (let i = 0; i < nD; i++) {
                            const a = rnd(0,
                                TAU)
                            const v = rnd(120,
                                420) * k
                            s.emit({
                                x: o.x + Math.cos(a) * 20,
                                y: o.y + Math.sin(a) * 10
                            },
                            {
                                tex: "smoke",
                                vx: Math.cos(a) * v,
                                vy: Math.sin(a) * v * 0.45 - 30,
                                drag: 0.95,
                                life: rnd(900,
                                    1400),
                                s0: rnd(50,
                                    90),
                                s1: rnd(130,
                                    200) * k,
                                tint: 0x6b5a48,
                                add: false,
                                a0: 0.65,
                                rot: rnd(0,
                                    TAU),
                                vr: rnd(-0.5,
                                    0.5)
                            })
                        }
                        const nR = Math.round(14 * k)
                        for (let i = 0; i < nR; i++) {
                            const a = rnd(0,
                                TAU)
                            s.emit(o,
                                {
                                    tex: "debris",
                                    vx: Math.cos(a) * rnd(60,
                                        300),
                                    vy: rnd(-700,
                                        -260),
                                    gy: 1600,
                                    life: rnd(800,
                                        1200),
                                    s0: rnd(10,
                                        24),
                                    s1: rnd(8,
                                        18),
                                    tint: 0x4b3b2d,
                                    add: false,
                                    rot: rnd(0,
                                        TAU),
                                    vr: rnd(-10,
                                        10),
                                    a1: 0.2
                                })
                        }
                        ctx.shake(9 * ctx.intensity,
                            420 * Math.sqrt(k))
                    })
            })
    })

// --- frostNova: vòng băng + gai băng + mảnh vỡ trên mọi mục tiêu ---
registerVfx("frostNova",
    (ctx) => {
        const k = kOf(ctx)
        const ice = ctx.color
        const c2 = ctx.color2 ?? 0xe8fbff
        const pts = targets(ctx)
        return play(ctx,
            pts.length * 90 + 1900,
            (s) => {
                pts.forEach((p, idx) => {
                    const d0 = idx * 90
                    s.anim(d0,
                        0,
                        () => {
                            s.emit(p,
                                {
                                    tex: "glow",
                                    life: 300,
                                    s0: 120 * k,
                                    s1: 260 * k,
                                    tint: WHITE
                                })
                            s.emit(p,
                                {
                                    tex: "glow",
                                    life: 900,
                                    s0: 110 * k,
                                    s1: 220 * k,
                                    tint: ice,
                                    a0: 0.7
                                })
                            s.emit({
                                x: p.x,
                                y: p.y + 10
                            },
                            {
                                tex: "ring",
                                life: 700,
                                s0: 30,
                                s1: 340 * k,
                                sy: 0.5,
                                tint: c2,
                                a0: 0.95
                            })
                            s.emit({
                                x: p.x,
                                y: p.y + 10
                            },
                            {
                                tex: "ring",
                                life: 900,
                                s0: 30,
                                s1: 270 * k,
                                sy: 0.5,
                                tint: ice,
                                a0: 0.8,
                                delay: 70
                            })
                            const nS = Math.round(9 * k)
                            for (let i = 0; i < nS; i++) {
                                const ang = (i / nS) * TAU + rnd(-0.2,
                                    0.2)
                                const dist = rnd(28,
                                    70) * k
                                const bx = p.x + Math.cos(ang) * dist
                                const by = p.y + 12 + Math.sin(ang) * dist * 0.5
                                const h = rnd(60,
                                    120) * k
                                const w = h * 0.4
                                const sp = s.spr("shard",
                                    bx,
                                    by,
                                    mix(ice,
                                        WHITE,
                                        rnd(0.2,
                                            0.7)))
                                sp.anchor.set(0.5,
                                    1)
                                sp.rotation = Math.cos(ang) * 0.5 + rnd(-0.12,
                                    0.12)
                                sp.visible = false
                                const delay = rnd(0,
                                    120)
                                s.anim(d0 + delay,
                                    1100,
                                    (u) => {
                                        sp.visible = true
                                        const grow = easeOut(clamp01(u / 0.14))
                                        sp.scale.set((w / 48) * grow,
                                            (h / 96) * grow)
                                        sp.alpha = u < 0.6 ? 0.95 : 0.95 * (1 - (u - 0.6) / 0.4)
                                        if (u < 0.2) {
                                            sp.tint = mix(WHITE,
sp.tint as number,
u / 0.2)
                                        }
                                    })
                                s.anim(d0 + delay + 750,
                                    0,
                                    () => {
                                        for (let j = 0; j < 3; j++) {
                                            s.emit({
                                                x: bx,
                                                y: by - h * 0.5
                                            },
                                            {
                                                tex: "shard",
                                                vx: rnd(-220,
                                                    220),
                                                vy: rnd(-380,
                                                    -80),
                                                gy: 1100,
                                                life: rnd(450,
                                                    750),
                                                s0: rnd(10,
                                                    18),
                                                s1: 5,
                                                tint: c2,
                                                rot: rnd(0,
                                                    TAU),
                                                vr: rnd(-10,
                                                    10)
                                            })
                                        }
                                    })
                            }
                            const nF = Math.round(16 * k)
                            for (let i = 0; i < nF; i++) {
                                const a = rnd(0,
                                    TAU)
                                const v = rnd(120,
                                    420)
                                s.emit(p,
                                    {
                                        tex: "shard",
                                        vx: Math.cos(a) * v,
                                        vy: Math.sin(a) * v - 120,
                                        gy: 500,
                                        drag: 0.95,
                                        life: rnd(500,
                                            900),
                                        s0: rnd(10,
                                            20),
                                        s1: 6,
                                        tint: mix(ice,
                                            WHITE,
                                            0.5),
                                        rot: rnd(0,
                                            TAU),
                                        vr: rnd(-8,
                                            8)
                                    })
                            }
                            const nK = Math.round(10 * k)
                            for (let i = 0; i < nK; i++) {
                                s.emit({
                                    x: p.x + rnd(-80,
                                        80),
                                    y: p.y + rnd(-60,
                                        40)
                                },
                                {
                                    tex: "star4",
                                    vy: rnd(-40,
                                        10),
                                    delay: rnd(0,
                                        400),
                                    life: rnd(500,
                                        900),
                                    s0: rnd(10,
                                        22),
                                    s1: 4,
                                    tint: WHITE,
                                    inout: true,
                                    rot: rnd(0,
                                        1),
                                    vr: 2
                                })
                            }
                            ctx.shake(3 * ctx.intensity,
                                220)
                        })
                })
            })
    })

// --- storm: sét đánh lần lượt từng mục tiêu ---
registerVfx("storm",
    (ctx) => {
        const k = kOf(ctx)
        const c2 = ctx.color2 ?? mix(ctx.color,
            WHITE,
            0.6)
        const pts = targets(ctx)
        const gap = 170
        return play(ctx,
            pts.length * gap + 1200,
            (s) => {
                pts.forEach((p, i) => {
                    boltStrike(s,
                        p,
                        k,
                        ctx.color,
                        c2,
                        i * gap)
                    if (ctx.intensity >= 2) {
                        boltStrike(s,
                            {
                                x: p.x + rnd(-60,
                                    60),
                                y: p.y + rnd(-20,
                                    20)
                            },
                            k * 0.7,
                            ctx.color,
                            c2,
                            i * gap + 90)
                    }
                })
            })
    })

// --- meteor: rơi từ trên xuống mỗi mục tiêu rồi nổ ---
registerVfx("meteor",
    (ctx) => {
        const k = kOf(ctx)
        const c2 = ctx.color2 ?? 0xffd36b
        const pts = targets(ctx)
        const fall = 560
        const gap = 230
        return play(ctx,
            pts.length * gap + fall + 1800,
            (s) => {
                pts.forEach((p, i) => {
                    const delay = i * gap
                    const start: Pt = {
                        x: p.x + 300,
                        y: p.y - 900
                    }
                    const mark = s.spr("ring",
                        p.x,
                        p.y + 8,
                        c2)
                    mark.visible = false
                    s.anim(delay,
                        fall + 120,
                        (u) => {
                            mark.visible = true
                            sz(mark,
                                140 * k * (1.3 - 0.3 * u),
                                0.5)
                            mark.alpha = u >= 1 ? 0 : 0.35 + 0.5 * u
                        })
                    const body = new Container()
                    body.visible = false
                    s.root.addChild(body)
                    const halo = new Sprite(tex("glow"))
                    halo.anchor.set(0.5)
                    halo.tint = ctx.color
                    halo.blendMode = "add"
                    sz(halo,
                        190 * k)
                    const rock = new Sprite(tex("debris"))
                    rock.anchor.set(0.5)
                    rock.tint = 0x2a1a12
                    sz(rock,
                        60 * k)
                    const core = new Sprite(tex("glow"))
                    core.anchor.set(0.5)
                    core.tint = c2
                    core.blendMode = "add"
                    sz(core,
                        90 * k)
                    body.addChild(halo)
                    body.addChild(rock)
                    body.addChild(core)
                    s.anim(delay,
                        fall,
                        (u) => {
                            const e = u * u
                            const x = start.x + (p.x - start.x) * e
                            const y = start.y + (p.y - start.y) * e
                            body.visible = u < 1
                            body.position.set(x,
                                y)
                            rock.rotation = u * 6
                            if (u < 1) {
                                s.emit({
                                    x,
                                    y
                                },
                                {
                                    tex: "glow",
                                    vx: rnd(-30,
                                        30) + 140,
                                    vy: rnd(-60,
                                        20) - 160,
                                    life: rnd(320,
                                        520),
                                    s0: 90 * k,
                                    s1: 20,
                                    tint: mix(ctx.color,
                                        c2,
                                        rnd(0,
                                            1)),
                                    a0: 0.8
                                })
                                s.emit({
                                    x,
                                    y
                                },
                                {
                                    tex: "smoke",
                                    vx: 160,
                                    vy: -120,
                                    life: 700,
                                    s0: 50 * k,
                                    s1: 120 * k,
                                    tint: 0x2b2420,
                                    add: false,
                                    a0: 0.5,
                                    rot: rnd(0,
                                        TAU)
                                })
                            }
                        })
                    blast(s,
                        p,
                        k,
                        ctx.color,
                        c2,
                        delay + fall,
                        8 * ctx.intensity)
                })
            })
    })

// --- shadowStrike: ba nhát chém tím đen trên mỗi mục tiêu ---
registerVfx("shadowStrike",
    (ctx) => {
        const k = kOf(ctx)
        const c2 = ctx.color2 ?? 0xd9a6ff
        const pts = targets(ctx)
        return play(ctx,
            pts.length * 150 + 1500,
            (s) => {
                pts.forEach((p, i) => {
                    const d0 = i * 150
                    const angs = [-0.7,
                        0.5,
                        -0.1]
                    angs.forEach((base, j) => {
                        const ang = base + rnd(-0.15,
                            0.15)
                        const len = rnd(200,
                            260) * k
                        const under = s.spr("slash",
                            p.x,
                            p.y,
                            0x120018,
                            false)
                        const slashA = s.spr("slash",
                            p.x,
                            p.y,
                            ctx.color)
                        const slashB = s.spr("slash",
                            p.x,
                            p.y,
                            c2)
                        for (const sp of [under,
                            slashA,
                            slashB]) {
                            sp.rotation = ang
                            sp.visible = false
                        }
                        const delay = d0 + j * 80
                        s.anim(delay,
                            360,
                            (u) => {
                                const grow = easeOut(clamp01(u / 0.3))
                                const fade = u < 0.35 ? 1 : 1 - (u - 0.35) / 0.65
                                for (const sp of [under,
                                    slashA,
                                    slashB]) {
                                    sp.visible = true
                                }
                                sz(under,
                                    len * grow * 1.1,
                                    1.4)
                                sz(slashA,
                                    len * grow,
                                    1.1)
                                sz(slashB,
                                    len * grow * 0.85,
                                    0.4)
                                under.alpha = fade * 0.85
                                slashA.alpha = fade
                                slashB.alpha = fade
                            })
                        s.anim(delay,
                            0,
                            () => {
                                s.emit(p,
                                    {
                                        tex: "glow",
                                        life: 260,
                                        s0: 80 * k,
                                        s1: 170 * k,
                                        tint: c2,
                                        a0: 0.8
                                    })
                                s.emit(p,
                                    {
                                        tex: "star4",
                                        life: 220,
                                        s0: 30,
                                        s1: 130 * k,
                                        tint: WHITE,
                                        rot: ang
                                    })
                                ctx.shake(2.5 * ctx.intensity,
                                    120)
                            })
                    })
                    s.anim(d0,
                        0,
                        () => {
                            s.emit(p,
                                {
                                    tex: "smoke",
                                    life: 900,
                                    s0: 70 * k,
                                    s1: 190 * k,
                                    tint: 0x1a0f26,
                                    add: false,
                                    a0: 0.8,
                                    delay: 60
                                })
                            const n = Math.round(14 * k)
                            for (let q = 0; q < n; q++) {
                                s.emit({
                                    x: p.x + rnd(-50,
                                        50),
                                    y: p.y + rnd(-30,
                                        40)
                                },
                                {
                                    tex: "glow",
                                    vx: rnd(-30,
                                        30),
                                    vy: rnd(-180,
                                        -60),
                                    delay: rnd(0,
                                        300),
                                    life: rnd(500,
                                        900),
                                    s0: rnd(18,
                                        36),
                                    s1: 6,
                                    tint: mix(ctx.color,
                                        c2,
                                        rnd(0,
                                            0.6)),
                                    a0: 0.8
                                })
                            }
                        })
                })
            })
    })

// --- stunHit: sao vàng bung ra rồi quay trên đầu ---
registerVfx("stunHit",
    (ctx) => {
        const k = kOf(ctx)
        const c = ctx.color
        const pts = targets(ctx)
        return play(ctx,
            1700,
            (s) => {
                for (const p of pts) {
                    hitBurst(s,
                        p,
                        k,
                        c,
                        ctx.color2 ?? 0xfff3a0,
                        0,
                        60)
                    s.anim(0,
                        0,
                        () => {
                            const n = Math.round(8 * k)
                            for (let i = 0; i < n; i++) {
                                const a = (i / n) * TAU + rnd(-0.2,
                                    0.2)
                                const v = rnd(220,
                                    460)
                                s.emit(p,
                                    {
                                        tex: "star5",
                                        vx: Math.cos(a) * v,
                                        vy: Math.sin(a) * v - 60,
                                        drag: 0.9,
                                        life: rnd(380,
                                            600),
                                        s0: rnd(26,
                                            44),
                                        s1: 12,
                                        tint: mix(c,
                                            WHITE,
                                            0.2),
                                        rot: rnd(0,
                                            TAU),
                                        vr: rnd(-8,
                                            8)
                                    })
                            }
                        })
                    const head: Pt = {
                        x: p.x,
                        y: p.y - 52
                    }
                    const orbit = Math.max(3,
                        Math.round(3 * k))
                    const T = 1000 * Math.sqrt(k)
                    for (let i = 0; i < orbit; i++) {
                        const st = s.spr("star5",
                            head.x,
                            head.y,
                            mix(c,
                                WHITE,
                                0.15))
                        const halo = s.spr("glow",
                            head.x,
                            head.y,
                            c)
                        st.visible = false
                        halo.visible = false
                        const base = (i / orbit) * TAU
                        s.anim(280,
                            T,
                            (u) => {
                                const a = base + u * TAU * 1.6
                                const x = head.x + Math.cos(a) * 36
                                const y = head.y + Math.sin(a) * 11
                                const pop = Math.sin(Math.PI * u)
                                const size = 26 * Math.min(1,
                                    pop * 3) * (1 + 0.15 * Math.sin(a * 2))
                                st.visible = true
                                halo.visible = true
                                st.position.set(x,
                                    y)
                                halo.position.set(x,
                                    y)
                                st.rotation = a * 1.5
                                sz(st,
                                    size)
                                sz(halo,
                                    size * 2.2)
                                st.alpha = Math.min(1,
                                    pop * 2)
                                halo.alpha = st.alpha * 0.6
                            })
                    }
                }
            })
    })

// --- silenceHit: phù ấn tím nhịp xung ---
registerVfx("silenceHit",
    (ctx) => {
        const k = kOf(ctx)
        const c2 = ctx.color2 ?? 0xe0b8ff
        const pts = targets(ctx)
        return play(ctx,
            1600,
            (s) => {
                for (const p of pts) {
                    const rune = s.spr("rune",
                        p.x,
                        p.y,
                        ctx.color)
                    const rune2 = s.spr("hex",
                        p.x,
                        p.y,
                        c2)
                    const halo = s.spr("glow",
                        p.x,
                        p.y,
                        ctx.color)
                    rune.visible = false
                    rune2.visible = false
                    halo.visible = false
                    s.anim(0,
                        1300,
                        (u) => {
                            const grow = easeOut(clamp01(u / 0.22))
                            const pulse = 1 + 0.12 * Math.sin(u * TAU * 2.5) * (1 - u)
                            const fade = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3
                            rune.visible = true
                            rune2.visible = true
                            halo.visible = true
                            sz(rune,
                                130 * k * grow * pulse)
                            sz(rune2,
                                76 * k * grow * pulse)
                            sz(halo,
                                170 * k * grow)
                            rune.rotation = u * 2.2
                            rune2.rotation = -u * 3
                            rune.alpha = fade
                            rune2.alpha = fade * 0.9
                            halo.alpha = fade * (0.35 + 0.2 * Math.sin(u * TAU * 2.5))
                        })
                    for (let i = 0; i < 2; i++) {
                        s.anim(120 + i * 380,
                            0,
                            () => {
                                s.emit(p,
                                    {
                                        tex: "ring",
                                        life: 520,
                                        s0: 170 * k,
                                        s1: 30,
                                        tint: c2,
                                        a0: 0.2,
                                        a1: 0.95
                                    })
                                s.emit(p,
                                    {
                                        tex: "ring",
                                        life: 420,
                                        s0: 30,
                                        s1: 200 * k,
                                        tint: ctx.color,
                                        a0: 0.8,
                                        delay: 480
                                    })
                            })
                    }
                    const n = Math.round(12 * k)
                    for (let i = 0; i < n; i++) {
                        const a = rnd(0,
                            TAU)
                        const d = rnd(90,
                            150) * k
                        const start = {
                            x: p.x + Math.cos(a) * d,
                            y: p.y + Math.sin(a) * d
                        }
                        s.emit(start,
                            {
                                tex: "glow",
                                vx: -Math.cos(a) * d * 2.2,
                                vy: -Math.sin(a) * d * 2.2,
                                delay: rnd(0,
                                    400),
                                life: 450,
                                s0: rnd(14,
                                    26),
                                s1: 5,
                                tint: c2,
                                a0: 0.9
                            })
                    }
                }
            })
    })

// --- blindHit: làn khói đen bốc lên ---
registerVfx("blindHit",
    (ctx) => {
        const k = kOf(ctx)
        const pts = targets(ctx)
        return play(ctx,
            1800,
            (s) => {
                for (const p of pts) {
                    s.anim(0,
                        0,
                        () => {
                            s.emit(p,
                                {
                                    tex: "glow",
                                    life: 220,
                                    s0: 70 * k,
                                    s1: 150 * k,
                                    tint: mix(ctx.color,
                                        WHITE,
                                        0.2),
                                    a0: 0.7
                                })
                            const n = Math.round(9 * k)
                            for (let i = 0; i < n; i++) {
                                const a = rnd(0,
                                    TAU)
                                const v = rnd(40,
                                    160)
                                s.emit({
                                    x: p.x + Math.cos(a) * 10,
                                    y: p.y - 40 + Math.sin(a) * 10
                                },
                                {
                                    tex: "smoke",
                                    vx: Math.cos(a) * v,
                                    vy: Math.sin(a) * v * 0.6 - 40,
                                    drag: 0.96,
                                    delay: rnd(0,
                                        140),
                                    life: rnd(1000,
                                        1500),
                                    s0: rnd(40,
                                        70),
                                    s1: rnd(110,
                                        170) * k,
                                    tint: mix(0x0d0d14,
                                        ctx.color,
                                        0.1),
                                    add: false,
                                    a0: 0.85,
                                    rot: rnd(0,
                                        TAU),
                                    vr: rnd(-0.8,
                                        0.8)
                                })
                            }
                            const m = Math.round(8 * k)
                            for (let i = 0; i < m; i++) {
                                s.emit({
                                    x: p.x + rnd(-40,
                                        40),
                                    y: p.y - 40 + rnd(-30,
                                        30)
                                },
                                {
                                    tex: "glow",
                                    vx: rnd(-40,
                                        40),
                                    vy: rnd(-90,
                                        -20),
                                    delay: rnd(0,
                                        300),
                                    life: rnd(500,
                                        900),
                                    s0: rnd(12,
                                        24),
                                    s1: 4,
                                    tint: ctx.color2 ?? 0x6a4aa8,
                                    a0: 0.6
                                })
                            }
                        })
                }
            })
    })

// --- tauntHit: vòng đỏ nhịp xung + tia gầm ---
registerVfx("tauntHit",
    (ctx) => {
        const k = kOf(ctx)
        const c2 = ctx.color2 ?? 0xffb070
        const pts = targets(ctx)
        return play(ctx,
            1700,
            (s) => {
                for (const p of pts) {
                    s.anim(0,
                        0,
                        () => {
                            s.emit(p,
                                {
                                    tex: "glow",
                                    life: 700,
                                    s0: 100 * k,
                                    s1: 260 * k,
                                    tint: ctx.color,
                                    a0: 0.8
                                })
                            s.emit(p,
                                {
                                    tex: "glow",
                                    life: 260,
                                    s0: 60 * k,
                                    s1: 150 * k,
                                    tint: WHITE
                                })
                            for (let i = 0; i < 3; i++) {
                                s.emit(p,
                                    {
                                        tex: "ring",
                                        delay: i * 190,
                                        life: 600,
                                        s0: 40,
                                        s1: 260 * k,
                                        tint: i === 1 ? c2 : ctx.color,
                                        a0: 0.95
                                    })
                            }
                            const n = Math.round(18 * k)
                            for (let i = 0; i < n; i++) {
                                const a = (i / n) * TAU + rnd(-0.1,
                                    0.1)
                                const r0 = rnd(40,
                                    70)
                                const v = rnd(420,
                                    800)
                                s.emit({
                                    x: p.x + Math.cos(a) * r0,
                                    y: p.y + Math.sin(a) * r0
                                },
                                {
                                    tex: "spark",
                                    vx: Math.cos(a) * v,
                                    vy: Math.sin(a) * v,
                                    drag: 0.93,
                                    delay: rnd(0,
                                        240),
                                    life: rnd(280,
                                        480),
                                    s0: rnd(50,
                                        100),
                                    s1: 12,
                                    tint: mix(ctx.color,
                                        c2,
                                        rnd(0,
                                            1)),
                                    align: true
                                })
                            }
                            ctx.shake(3 * ctx.intensity,
                                260)
                        })
                }
            })
    })

// --- grievousHit: X đỏ chém lên chữ thập xanh ---
registerVfx("grievousHit",
    (ctx) => {
        const k = kOf(ctx)
        const green = 0x66e06f
        const red = 0xff3040
        const pts = targets(ctx)
        return play(ctx,
            1500,
            (s) => {
                for (const p of pts) {
                    const cross = s.spr("cross",
                        p.x,
                        p.y,
                        green)
                    const glow = s.spr("glow",
                        p.x,
                        p.y,
                        green)
                    cross.visible = false
                    glow.visible = false
                    s.anim(0,
                        1200,
                        (u) => {
                            const pop = easeOut(clamp01(u / 0.15))
                            const fade = u < 0.65 ? 1 : 1 - (u - 0.65) / 0.35
                            const shrink = u > 0.3 ? 1 - 0.25 * clamp01((u - 0.3) / 0.3) : 1
                            cross.visible = true
                            glow.visible = true
                            sz(cross,
                                76 * k * pop * shrink)
                            sz(glow,
                                150 * k * pop)
                            cross.alpha = fade * (u > 0.3 ? 0.65 : 1)
                            glow.alpha = fade * 0.5
                        })
                    const angs = [Math.PI / 4,
                        -Math.PI / 4]
                    angs.forEach((ang, j) => {
                        const len = 190 * k
                        const a = s.spr("slash",
                            p.x,
                            p.y,
                            red)
                        const b = s.spr("slash",
                            p.x,
                            p.y,
                            WHITE)
                        a.rotation = ang
                        b.rotation = ang
                        a.visible = false
                        b.visible = false
                        s.anim(160 + j * 110,
                            400,
                            (u) => {
                                const grow = easeOut(clamp01(u / 0.3))
                                const fade = u < 0.4 ? 1 : 1 - (u - 0.4) / 0.6
                                a.visible = true
                                b.visible = true
                                sz(a,
                                    len * grow,
                                    1.5)
                                sz(b,
                                    len * grow * 0.8,
                                    0.45)
                                a.alpha = fade
                                b.alpha = fade
                            })
                        s.anim(160 + j * 110,
                            0,
                            () => {
                                s.emit(p,
                                    {
                                        tex: "glow",
                                        life: 300,
                                        s0: 70 * k,
                                        s1: 170 * k,
                                        tint: red,
                                        a0: 0.85
                                    })
                                const n = Math.round(8 * k)
                                for (let i = 0; i < n; i++) {
                                    const sa = ang + (Math.random() < 0.5 ? 0 : Math.PI) + rnd(-0.4,
                                        0.4)
                                    const v = rnd(200,
                                        520)
                                    s.emit(p,
                                        {
                                            tex: "spark",
                                            vx: Math.cos(sa) * v,
                                            vy: Math.sin(sa) * v,
                                            gy: 600,
                                            drag: 0.93,
                                            life: rnd(300,
                                                560),
                                            s0: rnd(26,
                                                56),
                                            s1: 6,
                                            tint: mix(red,
                                                WHITE,
                                                0.3),
                                            align: true
                                        })
                                }
                                ctx.shake(2.5 * ctx.intensity,
                                    140)
                            })
                    })
                }
            })
    })

// --- heal: lấp lánh xanh bay lên + cột sáng mềm ---
registerVfx("heal",
    (ctx) => {
        const k = kOf(ctx)
        const c = ctx.color
        const c2 = ctx.color2 ?? mix(c,
            WHITE,
            0.6)
        const pts = targets(ctx)
        return play(ctx,
            1900,
            (s) => {
                for (const p of pts) {
                    column(s,
                        p,
                        c,
                        110 * k,
                        260 * k,
                        0,
                        1300,
                        0.65)
                    s.anim(0,
                        0,
                        () => {
                            s.emit({
                                x: p.x,
                                y: p.y + 14
                            },
                            {
                                tex: "ring",
                                life: 800,
                                s0: 30,
                                s1: 200 * k,
                                sy: 0.45,
                                tint: c,
                                a0: 0.9
                            })
                            s.emit({
                                x: p.x,
                                y: p.y + 14
                            },
                            {
                                tex: "glow",
                                life: 1300,
                                s0: 150 * k,
                                s1: 120 * k,
                                sy: 0.45,
                                tint: c,
                                inout: true,
                                a0: 0.7
                            })
                            const n = Math.round(22 * k)
                            for (let i = 0; i < n; i++) {
                                const big = i % 5 === 0
                                s.emit({
                                    x: p.x + rnd(-38,
                                        38),
                                    y: p.y + rnd(-6,
                                        30)
                                },
                                {
                                    tex: big ? "cross" : "star4",
                                    vx: rnd(-14,
                                        14),
                                    vy: -rnd(70,
                                        170),
                                    delay: rnd(0,
                                        950),
                                    life: rnd(700,
                                        1100),
                                    s0: big ? rnd(14,
                                        20) : rnd(14,
                                        30),
                                    s1: big ? 8 : 6,
                                    tint: big ? c : c2,
                                    inout: true,
                                    rot: big ? 0 : rnd(0,
                                        1),
                                    vr: big ? 0 : rnd(-2,
                                        2)
                                })
                            }
                        })
                }
            })
    })

// --- shield: vỏ lục giác trắng vàng hình thành rồi mờ dần ---
registerVfx("shield",
    (ctx) => {
        const k = kOf(ctx)
        const c = ctx.color
        const c2 = ctx.color2 ?? 0xfff3c4
        const pts = targets(ctx)
        return play(ctx,
            2000,
            (s) => {
                for (const p of pts) {
                    const R = 120 * k
                    const dome = s.spr("glow",
                        p.x,
                        p.y,
                        c)
                    const shell = s.spr("hex",
                        p.x,
                        p.y,
                        c2)
                    const shell2 = s.spr("hex",
                        p.x,
                        p.y,
                        c)
                    dome.visible = false
                    shell.visible = false
                    shell2.visible = false
                    s.anim(0,
                        1700,
                        (u) => {
                            const form = easeOut(clamp01(u / 0.28))
                            const fade = u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4
                            const hum = 1 + 0.025 * Math.sin(u * TAU * 4)
                            dome.visible = true
                            shell.visible = true
                            shell2.visible = true
                            sz(dome,
                                R * 2.2 * form)
                            dome.alpha = fade * 0.5
                            sz(shell,
                                R * 1.9 * (1.5 - 0.5 * form) * hum)
                            shell.alpha = form * fade
                            shell.rotation = u * 0.8
                            sz(shell2,
                                R * 1.35 * (1.7 - 0.7 * form) * hum)
                            shell2.alpha = form * fade * 0.8
                            shell2.rotation = -u * 1.2
                        })
                    const m = 6
                    for (let i = 0; i < m; i++) {
                        const a = (i / m) * TAU - Math.PI / 2
                        const farX = p.x + Math.cos(a) * R * 2.4
                        const farY = p.y + Math.sin(a) * R * 2.4
                        const nearX = p.x + Math.cos(a) * R * 0.95
                        const nearY = p.y + Math.sin(a) * R * 0.95
                        const piece = s.spr("hex",
                            farX,
                            farY,
                            c2)
                        piece.visible = false
                        s.anim(i * 30,
                            420,
                            (u) => {
                                const e = easeOut(u)
                                piece.visible = true
                                piece.position.set(farX + (nearX - farX) * e,
                                    farY + (nearY - farY) * e)
                                piece.rotation = u * 3
                                sz(piece,
                                    34 * k * (1.2 - 0.4 * u))
                                piece.alpha = u < 1 ? 1 : 0
                            })
                    }
                    s.anim(440,
                        0,
                        () => {
                            s.emit(p,
                                {
                                    tex: "glow",
                                    life: 320,
                                    s0: R * 1.4,
                                    s1: R * 3,
                                    tint: WHITE,
                                    a0: 0.8
                                })
                            s.emit(p,
                                {
                                    tex: "ring",
                                    life: 520,
                                    s0: R * 1.5,
                                    s1: R * 3.4,
                                    tint: c2,
                                    a0: 0.9
                                })
                            const n = Math.round(12 * k)
                            for (let i = 0; i < n; i++) {
                                const a = rnd(0,
                                    TAU)
                                s.emit({
                                    x: p.x + Math.cos(a) * R,
                                    y: p.y + Math.sin(a) * R
                                },
                                {
                                    tex: "star4",
                                    vx: Math.cos(a) * 30,
                                    vy: Math.sin(a) * 30 - 20,
                                    life: rnd(500,
                                        900),
                                    s0: rnd(10,
                                        20),
                                    s1: 4,
                                    tint: c2,
                                    inout: true
                                })
                            }
                        })
                }
            })
    })

// --- buff: hào quang vàng bốc lên + lấp lánh + mũi tên ---
registerVfx("buff",
    (ctx) => {
        const k = kOf(ctx)
        const c = ctx.color
        const c2 = ctx.color2 ?? mix(c,
            WHITE,
            0.55)
        const pts = targets(ctx)
        return play(ctx,
            2000,
            (s) => {
                for (const p of pts) {
                    column(s,
                        p,
                        c,
                        100 * k,
                        240 * k,
                        0,
                        1400,
                        0.55)
                    s.anim(0,
                        0,
                        () => {
                            s.emit({
                                x: p.x,
                                y: p.y + 14
                            },
                            {
                                tex: "glow",
                                life: 1300,
                                s0: 160 * k,
                                s1: 120 * k,
                                sy: 0.45,
                                tint: c,
                                inout: true,
                                a0: 0.8
                            })
                            for (let i = 0; i < 4; i++) {
                                s.emit({
                                    x: p.x,
                                    y: p.y + 18
                                },
                                {
                                    tex: "ring",
                                    vy: -150,
                                    delay: i * 170,
                                    life: 800,
                                    s0: 110 * k,
                                    s1: 90 * k,
                                    sy: 0.32,
                                    tint: i % 2 === 0 ? c : c2,
                                    a0: 0.9
                                })
                            }
                            const nC = Math.round(5 * k)
                            for (let i = 0; i < nC; i++) {
                                s.emit({
                                    x: p.x + rnd(-34,
                                        34),
                                    y: p.y + rnd(0,
                                        24)
                                },
                                {
                                    tex: "chev",
                                    vy: -rnd(100,
                                        160),
                                    delay: rnd(0,
                                        700),
                                    life: rnd(700,
                                        1000),
                                    s0: rnd(18,
                                        26),
                                    s1: 14,
                                    tint: c2,
                                    inout: true
                                })
                            }
                            const n = Math.round(20 * k)
                            for (let i = 0; i < n; i++) {
                                s.emit({
                                    x: p.x + rnd(-42,
                                        42),
                                    y: p.y + rnd(-8,
                                        30)
                                },
                                {
                                    tex: "star4",
                                    vx: rnd(-12,
                                        12),
                                    vy: -rnd(70,
                                        180),
                                    delay: rnd(0,
                                        1000),
                                    life: rnd(700,
                                        1200),
                                    s0: rnd(12,
                                        26),
                                    s1: 5,
                                    tint: c2,
                                    inout: true,
                                    rot: rnd(0,
                                        1),
                                    vr: rnd(-2,
                                        2)
                                })
                            }
                        })
                }
            })
    })

// --- cleanse: loé trắng quét sạch hạt đen ---
registerVfx("cleanse",
    (ctx) => {
        const k = kOf(ctx)
        const c2 = ctx.color2 ?? 0xfff6c8
        const pts = targets(ctx)
        return play(ctx,
            1600,
            (s) => {
                for (const p of pts) {
                    const dark: Array<{ part: { vx: number; vy: number }; a: number }> = []
                    const n = Math.round(14 * k)
                    for (let i = 0; i < n; i++) {
                        const a = (i / n) * TAU + rnd(-0.2,
                            0.2)
                        const d = rnd(40,
                            80)
                        dark.push({
                            part: s.emit({
                                x: p.x + Math.cos(a) * d,
                                y: p.y + Math.sin(a) * d * 0.8 - 10
                            },
                            {
                                tex: "smoke",
                                drag: 0.93,
                                delay: rnd(0,
                                    150),
                                life: 900,
                                s0: rnd(30,
                                    50),
                                s1: rnd(40,
                                    60),
                                tint: 0x2a1236,
                                add: false,
                                a0: 0.85,
                                a1: 0,
                                rot: rnd(0,
                                    TAU)
                            }),
                            a
                        })
                    }
                    s.anim(330,
                        0,
                        () => {
                            for (const d of dark) {
                                d.part.vx = Math.cos(d.a) * rnd(500,
                                    900)
                                d.part.vy = Math.sin(d.a) * rnd(300,
                                    700) - 100
                            }
                            s.emit(p,
                                {
                                    tex: "glow",
                                    life: 480,
                                    s0: 130 * k,
                                    s1: 420 * k,
                                    tint: WHITE
                                })
                            s.emit(p,
                                {
                                    tex: "glow",
                                    life: 800,
                                    s0: 100 * k,
                                    s1: 300 * k,
                                    tint: c2,
                                    a0: 0.8
                                })
                            s.emit(p,
                                {
                                    tex: "ring",
                                    life: 600,
                                    s0: 40,
                                    s1: 420 * k,
                                    tint: WHITE,
                                    a0: 0.95
                                })
                            s.emit(p,
                                {
                                    tex: "ring",
                                    life: 700,
                                    s0: 30,
                                    s1: 320 * k,
                                    tint: ctx.color,
                                    a0: 0.8,
                                    delay: 60
                                })
                            s.emit(p,
                                {
                                    tex: "star4",
                                    life: 420,
                                    s0: 40,
                                    s1: 250 * k,
                                    tint: WHITE,
                                    vr: 2
                                })
                            const m = Math.round(16 * k)
                            for (let i = 0; i < m; i++) {
                                const a = rnd(0,
                                    TAU)
                                const v = rnd(200,
                                    520)
                                s.emit(p,
                                    {
                                        tex: "star4",
                                        vx: Math.cos(a) * v,
                                        vy: Math.sin(a) * v - 50,
                                        drag: 0.94,
                                        life: rnd(500,
                                            900),
                                        s0: rnd(12,
                                            24),
                                        s1: 4,
                                        tint: mix(c2,
                                            WHITE,
                                            0.5),
                                        inout: true
                                    })
                            }
                        })
                    // glow tụ nhẹ trước khi loé
                    s.anim(0,
                        0,
                        () => {
                            s.emit(p,
                                {
                                    tex: "glow",
                                    life: 330,
                                    s0: 220 * k,
                                    s1: 40,
                                    tint: c2,
                                    a0: 0.1,
                                    a1: 0.9
                                })
                        })
                }
            })
    })

// --- summonToken: vòng rune + ánh sáng bốc lên nơi quân cờ xuất hiện ---
registerVfx("summonToken",
    (ctx) => {
        const k = kOf(ctx)
        const c = ctx.color
        const c2 = ctx.color2 ?? mix(c,
            WHITE,
            0.55)
        const pts = targets(ctx)
        return play(ctx,
            2000,
            (s) => {
                for (const p of pts) {
                    const flat = new Container()
                    flat.position.set(p.x,
                        p.y + 12)
                    flat.scale.y = 0.5
                    s.root.addChild(flat)
                    const runeA = new Sprite(tex("rune"))
                    const runeB = new Sprite(tex("rune"))
                    const glowDisc = new Sprite(tex("glow"))
                    for (const sp of [runeA,
                        runeB,
                        glowDisc]) {
                        sp.anchor.set(0.5)
                        sp.blendMode = "add"
                        flat.addChild(sp)
                    }
                    runeA.tint = c
                    runeB.tint = c2
                    glowDisc.tint = c
                    s.anim(0,
                        1700,
                        (u) => {
                            const form = easeOut(clamp01(u / 0.25))
                            const fade = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3
                            sz(runeA,
                                270 * k * form)
                            sz(runeB,
                                170 * k * form)
                            sz(glowDisc,
                                300 * k * form)
                            runeA.rotation = u * 2
                            runeB.rotation = -u * 3
                            runeA.alpha = fade
                            runeB.alpha = fade * 0.9
                            glowDisc.alpha = fade * 0.4
                        })
                    column(s,
                        {
                            x: p.x,
                            y: p.y + 6
                        },
                        c,
                        120 * k,
                        340 * k,
                        380,
                        1000,
                        0.8)
                    s.anim(0,
                        0,
                        () => {
                            s.emit({
                                x: p.x,
                                y: p.y + 12
                            },
                            {
                                tex: "ring",
                                life: 600,
                                s0: 20,
                                s1: 300 * k,
                                sy: 0.5,
                                tint: c2,
                                a0: 0.8
                            })
                            const n = Math.round(22 * k)
                            for (let i = 0; i < n; i++) {
                                const a = rnd(0,
                                    TAU)
                                const d = rnd(20,
                                    110) * k
                                s.emit({
                                    x: p.x + Math.cos(a) * d,
                                    y: p.y + 12 + Math.sin(a) * d * 0.5
                                },
                                {
                                    tex: "star4",
                                    vy: -rnd(110,
                                        260),
                                    delay: rnd(250,
                                        1000),
                                    life: rnd(600,
                                        1000),
                                    s0: rnd(10,
                                        24),
                                    s1: 4,
                                    tint: c2,
                                    inout: true,
                                    rot: rnd(0,
                                        1),
                                    vr: rnd(-2,
                                        2)
                                })
                            }
                        })
                    s.anim(780,
                        0,
                        () => {
                            s.emit({
                                x: p.x,
                                y: p.y - 30
                            },
                            {
                                tex: "glow",
                                life: 420,
                                s0: 100 * k,
                                s1: 340 * k,
                                tint: WHITE
                            })
                            s.emit({
                                x: p.x,
                                y: p.y - 30
                            },
                            {
                                tex: "star4",
                                life: 400,
                                s0: 40,
                                s1: 240 * k,
                                tint: c2,
                                vr: 2
                            })
                            ctx.shake(2 * ctx.intensity,
                                160)
                        })
                }
            })
    })

// --- drain: hạt đỏ chảy từ mục tiêu về `from` (hút máu) ---
registerVfx("drain",
    (ctx) => {
        const k = kOf(ctx)
        const c = ctx.color
        const c2 = ctx.color2 ?? 0xff8090
        const from = ctx.from
        const pts = ctx.to.length > 0 ? ctx.to : [{
            x: from.x,
            y: from.y - 120
        }]
        return play(ctx,
            2000,
            (s) => {
                for (const p of pts) {
                    hitBurst(s,
                        p,
                        k,
                        c,
                        c2,
                        0,
                        60)
                    const n = Math.round(18 * k)
                    for (let i = 0; i < n; i++) {
                        const delay = rnd(60,
                            560)
                        const dur = rnd(560,
                            860)
                        const mid = {
                            x: (p.x + from.x) / 2,
                            y: (p.y + from.y) / 2
                        }
                        const dx = from.x - p.x
                        const dy = from.y - p.y
                        const len = Math.hypot(dx,
                            dy) || 1
                        const bend = rnd(-0.35,
                            0.35) * len
                        const ctl = {
                            x: mid.x + (-dy / len) * bend,
                            y: mid.y + (dx / len) * bend - 70
                        }
                        const sp = s.spr("spark",
                            p.x,
                            p.y,
                            mix(c,
                                c2,
                                rnd(0,
                                    1)))
                        const halo = s.spr("glow",
                            p.x,
                            p.y,
                            c)
                        sp.visible = false
                        halo.visible = false
                        const at = (t: number): Pt => ({
                            x: (1 - t) * (1 - t) * p.x + 2 * (1 - t) * t * ctl.x + t * t * from.x,
                            y: (1 - t) * (1 - t) * p.y + 2 * (1 - t) * t * ctl.y + t * t * from.y
                        })
                        s.anim(delay,
                            dur,
                            (u) => {
                                const t = u ** 1.5
                                const pos = at(t)
                                const nxt = at(Math.min(1,
                                    t + 0.03))
                                sp.visible = true
                                halo.visible = true
                                sp.position.set(pos.x,
                                    pos.y)
                                halo.position.set(pos.x,
                                    pos.y)
                                sp.rotation = Math.atan2(nxt.y - pos.y,
                                    nxt.x - pos.x)
                                sz(sp,
                                    54 * (0.6 + t * 0.6))
                                sz(halo,
                                    28 * (1 + t * 0.4))
                                const a = u < 1 ? Math.min(1,
                                    u * 6) : 0
                                sp.alpha = a
                                halo.alpha = a * 0.6
                            })
                        if (i % 3 === 0) {
                            s.anim(delay + dur,
                                0,
                                () => {
                                    s.emit(from,
                                        {
                                            tex: "glow",
                                            life: 300,
                                            s0: 40 * k,
                                            s1: 100 * k,
                                            tint: mix(c2,
                                                WHITE,
                                                0.3),
                                            a0: 0.7
                                        })
                                })
                        }
                    }
                    s.anim(900,
                        0,
                        () => {
                            s.emit(from,
                                {
                                    tex: "glow",
                                    life: 520,
                                    s0: 90 * k,
                                    s1: 240 * k,
                                    tint: c2,
                                    a0: 0.9
                                })
                            s.emit(from,
                                {
                                    tex: "ring",
                                    life: 520,
                                    s0: 30,
                                    s1: 220 * k,
                                    tint: c,
                                    a0: 0.9
                                })
                        })
                }
            })
    })
