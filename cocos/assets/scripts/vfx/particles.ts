// Bộ hạt nhỏ cho VFX trên Cocos (thay lớp PixiJS của bản web): hạt là Sprite lấy từ vài texture vẽ bằng code, một component
// VfxEngine trên lớp VFX cập nhật tất cả hạt mỗi khung hình. Hạt phát sáng dùng hoà màu cộng (additive).
import {
    _decorator, Color, Component, gfx, Node, Sprite, SpriteFrame, Texture2D, UITransform
} from "cc"

const { ccclass } = _decorator

export interface Pt { x: number; y: number }
export type TexKind = "glow" | "dot" | "blade" | "ring"

/** Màu 0xRRGGBB -> Color */
export const rgb = (hex: number, a = 255) => new Color((hex >> 16) & 255,
    (hex >> 8) & 255,
    hex & 255,
    a)

export const rand = (a: number, b: number) => a + Math.random() * (b - a)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]
export const ease = {
    linear: (t: number) => t,
    out: (t: number) => 1 - (1 - t) ** 3,
    in: (t: number) => t * t * t,
    inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
}

// ---- texture vẽ bằng code (RGBA trắng, alpha theo hình) ----
const frames: Partial<Record<TexKind, SpriteFrame>> = {
}
const SIZE: Record<TexKind, [number, number]> = {
    glow: [64,
        64], dot: [32,
        32], blade: [64,
        16], ring: [64,
        64]
}

function shape(kind: TexKind, x: number, y: number, w: number, h: number): number {
    const u = (x + 0.5) / w * 2 - 1, v = (y + 0.5) / h * 2 - 1
    if (kind === "glow") return Math.max(0,
        1 - Math.hypot(u,
            v)) ** 2
    if (kind === "dot") return Math.min(1,
        Math.max(0,
            (1 - Math.hypot(u,
                v)) * 4))
    if (kind === "ring") {
        const d = Math.hypot(u,
            v)
        return Math.max(0,
            1 - Math.abs(d - 0.82) / 0.14)
    }
    // blade: mảnh sắc nhọn hai đầu
    const half = (1 - Math.abs(u)) * 0.95
    return Math.abs(v) < half ? Math.min(1,
        (half - Math.abs(v)) * 6) * (0.6 + 0.4 * (1 - Math.abs(u))) : 0
}

function frameOf(kind: TexKind): SpriteFrame {
    let f = frames[kind]
    if (f) return f
    const [w, h] = SIZE[kind]
    const data = new Uint8Array(w * h * 4)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const a = Math.round(255 * shape(kind,
            x,
            y,
            w,
            h))
        const i = (y * w + x) * 4
        data[i] = 255
        data[i + 1] = 255
        data[i + 2] = 255
        data[i + 3] = a
    }
    const tex = new Texture2D()
    tex.reset({
        width: w, height: h, format: Texture2D.PixelFormat.RGBA8888
    })
    tex.uploadData(data)
    tex.setFilters(Texture2D.Filter.LINEAR,
        Texture2D.Filter.LINEAR)
    f = new SpriteFrame()
    f.texture = tex
    frames[kind] = f
    return f
}

// ---- engine ----
interface Particle {
    node: Node; sprite: Sprite; additive: boolean;
    x: number; y: number; vx: number; vy: number;
    age: number; life: number; s0: number; s1: number; a: number;
    drag: number; spin: number; rot: number; align: boolean; gravity: number; w: number;
    color: Color; kind: TexKind;
}
interface Timer { age: number; dur: number; fn: (t: number) => void; done: () => void }

@ccclass("VfxEngine")
export class VfxEngine extends Component {
    private live: Particle[] = []
    private timers: Timer[] = []
    private pool: Record<string, Node[]> = {
    }

    spawn(p: Omit<Particle, "node" | "sprite" | "age">) {
        if (this.live.length > 1500) return
        const key = `${p.kind}${p.additive ? "+" : "-"}`
        const node = (this.pool[key] ??= []).pop() ?? this.make(p.kind)
        const sprite = node.getComponent(Sprite)!
        // Sprite chỉ còn các cặp hoà màu này trong runtime, typings 3.8 không khai báo
        const blend = sprite as unknown as { srcBlendFactor: number; dstBlendFactor: number }
        blend.srcBlendFactor = gfx.BlendFactor.SRC_ALPHA
        blend.dstBlendFactor = p.additive ? gfx.BlendFactor.ONE : gfx.BlendFactor.ONE_MINUS_SRC_ALPHA
        node.active = true
        this.node.addChild(node)
        this.live.push({
            ...p, node, sprite, age: 0
        })
    }

    private make(kind: TexKind): Node {
        const n = new Node("P")
        n.layer = this.node.layer
        const [w, h] = SIZE[kind]
        n.addComponent(UITransform).setContentSize(w,
            h)
        const s = n.addComponent(Sprite)
        s.sizeMode = Sprite.SizeMode.CUSTOM
        s.spriteFrame = frameOf(kind)
        return n
    }

    after(dur: number, fn: (t: number) => void): Promise<void> {
        return new Promise((resolve) => this.timers.push({
            age: 0, dur: Math.max(0.001,
                dur), fn, done: resolve
        }))
    }

    update(dt: number) {
        // __vfxScale: móc gỡ lỗi làm chậm mọi hiệu ứng để chụp từng khung hình (Playwright đặt 0.2)
        dt = Math.min(dt,
            0.05) * ((globalThis as unknown as { __vfxScale?: number }).__vfxScale ?? 1)
        for (let i = this.timers.length - 1; i >= 0; i--) {
            const t = this.timers[i]
            t.age += dt
            const k = Math.min(1,
                t.age / t.dur)
            t.fn(k)
            if (k >= 1) {
                this.timers.splice(i,
                    1)
                t.done()
            }
        }
        for (let i = this.live.length - 1; i >= 0; i--) {
            const p = this.live[i]
            p.age += dt
            const k = p.age / p.life
            if (k >= 1) {
                p.node.active = false
                p.node.removeFromParent()
                const key = `${p.kind}${p.additive ? "+" : "-"}`
                ;(this.pool[key] ??= []).push(p.node)
                this.live.splice(i,
                    1)
                continue
            }
            const damp = Math.max(0,
                1 - p.drag * dt)
            p.vx *= damp
            p.vy = p.vy * damp + p.gravity * dt
            p.x += p.vx * dt
            p.y += p.vy * dt
            p.rot = p.align && (p.vx || p.vy) ? Math.atan2(p.vy,
                p.vx) : p.rot + p.spin * dt
            const size = lerp(p.s0,
                p.s1,
                k)
            p.node.setPosition(p.x,
                p.y,
                0)
            p.node.angle = p.rot * 180 / Math.PI
            const [bw, bh] = SIZE[p.kind]
            p.node.setScale(size / bw * (p.kind === "blade" ? p.w : 1),
                size / bw * (p.kind === "blade" ? 1 : 1) * (p.kind === "blade" ? 1 : 1),
                1)
            void bh
            // alpha: vào nhanh, ra mượt
            const a = p.a * Math.min(1,
                k * 8) * (1 - k) ** 0.8
            p.sprite.color = new Color(p.color.r,
                p.color.g,
                p.color.b,
                Math.round(255 * a))
        }
    }

    clearAll() {
        for (const p of this.live) { p.node.active = false; p.node.removeFromParent() }
        this.live.length = 0
    }
}

export function engineOf(layer: Node): VfxEngine {
    return layer.getComponent(VfxEngine) ?? layer.addComponent(VfxEngine)
}

export interface EmitOpts {
    /** Danh sách màu 0xRRGGBB, mỗi hạt chọn ngẫu nhiên một màu */
    color: number[];
    kind?: TexKind;
    additive?: boolean;
    /** Tốc độ px/s */
    speed?: [number, number];
    /** Hướng (rad); mặc định mọi hướng */
    angle?: [number, number];
    /** Thời gian sống (giây) */
    life?: [number, number];
    /** Cỡ đầu / cuối (px) */
    size?: [number, number];
    alpha?: number;
    drag?: number;
    spin?: [number, number];
    /** Xoay theo hướng bay (mảnh sắc, tia) */
    align?: boolean;
    gravity?: number;
    /** Bề dài mảnh blade (tỉ lệ) */
    stretch?: number;
    /** Toạ độ rải quanh điểm phát (px) */
    spread?: number;
    /** Ghi đè hướng của blade khi không align (rad) */
    rotation?: number;
}

/** Phát một hạt */
export function emit(layer: Node, at: Pt, o: EmitOpts) {
    const sp = rand(...(o.speed ?? [0,
        0]))
    const ang = rand(...(o.angle ?? [0,
        Math.PI * 2]))
    const sz = o.size ?? [8,
        2]
    const sr = o.spread ?? 0
    engineOf(layer).spawn({
        additive: o.additive ?? true,
        kind: o.kind ?? "glow",
        x: at.x + (sr ? rand(-sr,
            sr) : 0),
        y: at.y + (sr ? rand(-sr,
            sr) : 0),
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: rand(...(o.life ?? [0.3,
            0.6])),
        s0: sz[0],
        s1: sz[1],
        a: o.alpha ?? 1,
        drag: o.drag ?? 0,
        spin: rand(...(o.spin ?? [0,
            0])),
        rot: o.rotation ?? (o.kind === "blade" ? ang : 0),
        align: !!o.align,
        gravity: o.gravity ?? 0,
        w: o.stretch ?? 2.2,
        color: rgb(pick(o.color)),
    })
}

/** Nổ một loạt hạt; xong khi hạt cuối tắt */
export function burst(layer: Node, at: Pt, count: number, o: EmitOpts): Promise<void> {
    for (let i = 0; i < count; i++) emit(layer,
        at,
        o)
    return engineOf(layer).after((o.life?.[1] ?? 0.6),
        () => undefined)
}

/** Phát liên tục `perSec` hạt/giây trong `secs` giây tại điểm lấy từ getPt */
export function stream(layer: Node, getPt: () => Pt, secs: number, perSec: number, o: EmitOpts): Promise<void> {
    let carry = 0, last = 0
    return engineOf(layer).after(secs,
        (k) => {
            const t = k * secs
            carry += (t - last) * perSec
            last = t
            while (carry >= 1) { carry -= 1; emit(layer,
                getPt(),
                o) }
        })
}

/** Chạy hàm theo thời gian 0..1 trong `secs` giây (trên đồng hồ của engine) */
export function over(layer: Node, secs: number, fn: (t: number) => void): Promise<void> {
    return engineOf(layer).after(secs,
        fn)
}

export const wait = (layer: Node, secs: number) => engineOf(layer).after(secs,
    () => undefined)

export const mix = (a: Pt, b: Pt, t: number): Pt => ({
    x: lerp(a.x,
        b.x,
        t), y: lerp(a.y,
        b.y,
        t)
})
export const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x,
    b.y - a.y)
export const angleOf = (a: Pt, b: Pt) => Math.atan2(b.y - a.y,
    b.x - a.x)
