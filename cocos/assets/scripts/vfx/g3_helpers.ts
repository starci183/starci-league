// Công cụ dùng chung cho VFX nhóm 3 (Vayne, Janna, Brand, Renata, Tristana, Miss Fortune, Rumble, Azir, Mel, Jayce, Sona).
// Chỉ ghép từ bộ hạt particles.ts: nét thẳng, cung, tia sét, hàng mục tiêu suy ra từ ctx, vật thể bay vẽ lại mỗi khung hình.
import {
    Node
} from "cc"
import * as P from "./particles"
import {
    angleOf, dist, mix, over, rand, type EmitOpts, type Pt
} from "./particles"
import type {
    VfxCtx
} from "./registry"

// ---- Hạ tông (chủ tướng góp ý 2026-11-04: nhã, không loè loẹt) ----
// Mọi file nhóm 3 phát hạt qua emit/burst/stream/wait dưới đây thay vì gọi thẳng particles.ts: quầng sáng nhỏ và mờ hơn, có trần
// để không loá cả màn, số hạt của burst và stream giảm một nửa, các nhịp chờ ngắn lại.
const GLOW_SCALE = 0.72
const GLOW_CAP = 190
const GLOW_ALPHA = 0.75
const RING_SCALE = 0.8
const RING_CAP = 320

/** Tuỳ chọn đã hạ tông. Dùng Object.create để giữ getter (hướng bay tính lại mỗi hạt) của tuỳ chọn gốc */
function tone(o: EmitOpts): EmitOpts {
    const kind = o.kind ?? "glow"
    if (kind !== "glow" && kind !== "ring") return o
    const t = Object.create(o) as EmitOpts
    const sz = o.size ?? [8, 2]
    if (kind === "glow") {
        t.size = [Math.min(GLOW_CAP, sz[0] * GLOW_SCALE), Math.min(GLOW_CAP, sz[1] * GLOW_SCALE)]
        t.alpha = (o.alpha ?? 1) * GLOW_ALPHA
    } else {
        t.size = [Math.min(RING_CAP, sz[0] * RING_SCALE), Math.min(RING_CAP, sz[1] * RING_SCALE)]
        t.alpha = (o.alpha ?? 1) * 0.85
    }
    return t
}

export const emit = (layer: Node, at: Pt, o: EmitOpts) => P.emit(layer, at, tone(o))
export const burst = (layer: Node, at: Pt, count: number, o: EmitOpts) => P.burst(layer, at, Math.max(1, Math.round(count * 0.5)), tone(o))
export const stream = (layer: Node, getPt: () => Pt, secs: number, perSec: number, o: EmitOpts) => P.stream(layer, getPt, secs, perSec * 0.5, tone(o))
export const wait = (layer: Node, secs: number) => P.wait(layer, secs * 0.75)

export const TAU = Math.PI * 2
export const UP = Math.PI / 2
export const DOWN = -Math.PI / 2

/** Cường độ của chiêu (chiêu cuối > 1) */
export const power = (ctx: VfxCtx) => ctx.style.intensity ?? 1

/** Điểm cách p một đoạn d theo hướng ang */
export const offset = (p: Pt, ang: number, d: number): Pt => ({
    x: p.x + Math.cos(ang) * d, y: p.y + Math.sin(ang) * d
})

/** Mục tiêu có thật hay không (tránh trường hợp to trùng chỗ người dùng) */
const real = (ctx: VfxCtx) => !!ctx.to[0] && dist(ctx.from, ctx.to[0]) > 40

/** Hướng về phía địch: có mục tiêu thì nhắm mục tiêu, không có thì phe dưới nhìn lên, phe trên nhìn xuống */
export const facing = (ctx: VfxCtx) => real(ctx) ? angleOf(ctx.from, ctx.to[0]) : (ctx.from.y > 60 ? DOWN : UP)

/** Tướng địch đầu tiên; thiếu thì lấy ô đối diện trước mặt */
export const firstFoe = (ctx: VfxCtx): Pt => real(ctx) ? ctx.to[0] : offset(ctx.from, facing(ctx), 376)

/** Mọi mục tiêu; rỗng thì chính người dùng (chiêu tự thân / vùng) */
export const targetsOf = (ctx: VfxCtx): Pt[] => ctx.to.length ? ctx.to : [ctx.from]

// Toạ độ x của 5 đường trên sân khấu trận (BOARD.x + LANE_X), dùng để dựng cả hàng khi chiêu đánh mọi tướng
const LANES = [-463, -247, -33, 178, 392]

/** Bàn cờ dọc (địch ở trên / dưới) hay ngang (màn xem thử: trái sang phải) */
const vertical = (a: Pt, b: Pt) => Math.abs(b.y - a.y) >= Math.abs(b.x - a.x)

/** Cả hàng 5 ô đi qua p: dời lưới đường cho ô gần nhất trùng đúng p */
export function rowAt(p: Pt): Pt[] {
    let near = LANES[0]
    for (const x of LANES) if (Math.abs(x - p.x) < Math.abs(near - p.x)) near = x
    return LANES.map((x) => ({
        x: x + (p.x - near), y: p.y
    }))
}

/** Hàng địch: nhiều mục tiêu thì dùng luôn, một mục tiêu thì dựng cả hàng quanh nó */
export function foeRow(ctx: VfxCtx): Pt[] {
    if (ctx.to.length >= 2) return ctx.to
    const t = firstFoe(ctx)
    if (vertical(ctx.from, t)) return rowAt(t)
    const side = angleOf(ctx.from, t) + UP
    return [offset(t, side, 190), t, offset(t, side, -190)]
}

/** Hàng phe mình (chiêu cả đội): cùng hàng với người dùng */
export function allyRow(ctx: VfxCtx): Pt[] {
    const t = firstFoe(ctx)
    if (vertical(ctx.from, t)) return rowAt(ctx.from)
    const side = angleOf(ctx.from, t) + UP
    return [offset(ctx.from, side, 190), ctx.from, offset(ctx.from, side, -190)]
}

/** Hai ô kề của p trong hàng (theo hướng vuông góc với hướng nhìn) */
export function neighbours(ctx: VfxCtx, p: Pt): Pt[] {
    const t = firstFoe(ctx)
    if (vertical(ctx.from, t)) return [{
        x: p.x - 214, y: p.y
    }, {
        x: p.x + 214, y: p.y
    }]
    const side = angleOf(ctx.from, t) + UP
    return [offset(p, side, 190), offset(p, side, -190)]
}

/** Điểm trên đường cong bậc hai a -> b, điểm điều khiển lệch ngang `bend` px */
export function curve(a: Pt, b: Pt, bend: number, u: number): Pt {
    const dir = angleOf(a, b)
    const c = {
        x: (a.x + b.x) / 2 - Math.sin(dir) * bend, y: (a.y + b.y) / 2 + Math.cos(dir) * bend
    }
    const v = 1 - u
    return {
        x: v * v * a.x + 2 * v * u * c.x + u * u * b.x, y: v * v * a.y + 2 * v * u * c.y + u * u * b.y
    }
}

/** Đường vồng lên trên màn hình (ném, nhảy): cao `h` px ở giữa */
export const lob = (a: Pt, b: Pt, h: number, u: number): Pt => {
    const p = mix(a, b, u)
    return {
        x: p.x, y: p.y + Math.sin(u * Math.PI) * h
    }
}

/**
 * Vật bay theo đường path(t) trong `secs` giây; mỗi khung gọi draw(điểm, t, hướng bay). Dùng để vẽ lại đầu đạn, quả bom...
 * bằng hạt sống rất ngắn nên trông như một vật liền mạch.
 */
export async function carry(layer: Node, path: (t: number) => Pt, secs: number, draw: (p: Pt, t: number, dir: number) => void, easing: (t: number) => number = (t) => t) {
    let prev = path(0)
    await over(layer, secs, (k) => {
        const t = easing(k)
        const p = path(t)
        const dir = dist(prev, p) > 0.01 ? angleOf(prev, p) : angleOf(path(Math.max(0, t - 0.02)), path(Math.min(1, t + 0.02)))
        draw(p, t, dir)
        prev = p
    })
}

/** Nét thẳng a -> b dày `w` px bằng một mảnh blade kéo dài (blade: dài = size·stretch, dày = size/4) */
export function seg(layer: Node, a: Pt, b: Pt, w: number, colors: number[], life: number, alpha = 1, o: Partial<EmitOpts> = {}) {
    const len = Math.max(1, dist(a, b))
    emit(layer, mix(a, b, 0.5), {
        color: colors, kind: "blade", life: [life, life], size: [w * 4, w * 4 * (o.size ? 1 : 0.9)], alpha,
        rotation: angleOf(a, b), stretch: len / (w * 4) * 1.15, ...o
    })
}

/** Tia sét gãy khúc a -> b: các nét ngắn lệch ngang ngẫu nhiên, nét sáng mảnh chồng lên nét quầng */
export function lightning(layer: Node, a: Pt, b: Pt, colors: number[], w: number, life: number, jag = 18, segs = 0) {
    const n = segs || Math.max(3, Math.round(dist(a, b) / 34))
    const dir = angleOf(a, b)
    let prev = a
    for (let i = 1; i <= n; i++) {
        const t = i / n
        const off = i === n ? 0 : rand(-jag, jag)
        const p = offset(mix(a, b, t), dir + UP, off)
        seg(layer, prev, p, w * 2.2, [colors[colors.length - 1]], life, 0.35)
        seg(layer, prev, p, w, colors, life, 1)
        prev = p
    }
}

/** Cung tròn tâm c, bán kính r, từ góc a0 tới a1: chuỗi nét thon dần hai đầu (vệt chém, khiên lưỡi liềm) */
export function arc(layer: Node, c: Pt, r: number, a0: number, a1: number, w: number, colors: number[], life: number, alpha = 1, n = 16) {
    for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n
        const p0 = offset(c, a0 + (a1 - a0) * t0, r)
        const p1 = offset(c, a0 + (a1 - a0) * t1, r)
        const taper = Math.sin(((t0 + t1) / 2) * Math.PI) ** 0.7
        seg(layer, p0, p1, Math.max(1.5, w * taper), colors, life, alpha)
    }
}

/** Quầng sáng mềm tại chỗ */
export const flash = (layer: Node, at: Pt, color: number, size: number, life = 0.25, alpha = 1, additive = true) => emit(layer, at, {
    color: [color], kind: "glow", life: [life, life], size: [size * 0.45, size], alpha, additive
})

/** Vòng sóng loang từ r0 tới r1 (đường kính) */
export const ring = (layer: Node, at: Pt, color: number, r0: number, r1: number, life: number, alpha = 0.9) => emit(layer, at, {
    color: [color], kind: "ring", life: [life, life], size: [r0, r1], alpha
})

/** Tia lửa / mảnh sắc văng ra, xoay theo hướng bay */
export const sparks = (layer: Node, at: Pt, n: number, colors: number[], speed: [number, number], o: Partial<EmitOpts> = {}) => burst(layer, at, n, {
    color: colors, kind: "blade", life: [0.18, 0.4], size: [18, 6], alpha: 1, speed, drag: 2.4, align: true, stretch: 2.6, ...o
})

/** Bụi hạt nhỏ toả ra */
export const motes = (layer: Node, at: Pt, n: number, colors: number[], speed: [number, number], o: Partial<EmitOpts> = {}) => burst(layer, at, n, {
    color: colors, kind: "dot", life: [0.3, 0.6], size: [8, 2], alpha: 1, speed, drag: 2, ...o
})

/** Khói đục (không cộng sáng) cuộn lên */
export const smoke = (layer: Node, at: Pt, n: number, colors: number[], size: number, life: [number, number] = [0.6, 1], spread = 20) => burst(layer, at, n, {
    color: colors, kind: "glow", additive: false, life, size: [size * 0.6, size * 1.4], alpha: 0.55, speed: [10, 50],
    angle: [UP - 0.8, UP + 0.8], gravity: 40, drag: 1.5, spread
})

/** Hạt sáng bốc thẳng lên quanh một lá (tăng chỉ số, hồi phục) */
export const rise = (layer: Node, at: Pt, secs: number, perSec: number, colors: number[], width = 60, o: Partial<EmitOpts> = {}) => stream(layer, () => ({
    x: at.x + rand(-width, width), y: at.y + rand(-50, 10)
}), secs, perSec, {
    color: colors, kind: "dot", life: [0.5, 0.8], size: [9, 2], alpha: 1, speed: [60, 140], angle: [UP - 0.15, UP + 0.15], drag: 0.8, ...o
})

/** Hạt hút vào tâm (tụ lực): sinh trên vòng bán kính r, bay vào tâm */
export const gather = (layer: Node, at: Pt, secs: number, perSec: number, r: number, colors: number[], o: Partial<EmitOpts> = {}) => {
    let carryAng = 0
    return stream(layer, () => {
        carryAng = rand(0, TAU)
        return offset(at, carryAng, r)
    }, secs, perSec, {
        color: colors, kind: "blade", life: [0.2, 0.3], size: [16, 4], alpha: 1, speed: [r * 3, r * 4], align: true, stretch: 2.2,
        ...o, get angle(): [number, number] { return [carryAng + Math.PI, carryAng + Math.PI] }
    })
}

/** Tia sáng bốn cánh (lấp lánh): hai nét chéo bắt chéo, giữ yên tại chỗ */
export function star(layer: Node, at: Pt, len: number, colors: number[], life: number, rot = 0, w = 0, alpha = 1) {
    const ww = w || Math.max(2, len / 9)
    for (let i = 0; i < 2; i++) {
        const a = rot + i * Math.PI / 2
        seg(layer, offset(at, a, -len), offset(at, a, len), ww, colors, life, alpha)
    }
    flash(layer, at, colors[0], len * 1.4, life, 0.7)
}

/** Nốt nhạc bay (Sona): đầu nốt tròn, thân dọc, đuôi cờ; mọi phần cùng vận tốc nên trôi như một khối */
export function note(layer: Node, at: Pt, color: number, size: number, life: number, speed: number, ang: number, gravity = 0) {
    const common = {
        life: [life, life] as [number, number], speed: [speed, speed] as [number, number], angle: [ang, ang] as [number, number], gravity, alpha: 1
    }
    emit(layer, at, {
        ...common, color: [color], kind: "glow", size: [size * 2.4, size * 1.8], alpha: 0.45
    })
    emit(layer, at, {
        ...common, color: [0xffffff, color], kind: "dot", size: [size, size * 0.8]
    })
    const stemLen = size * 1.9
    emit(layer, {
        x: at.x + size * 0.42, y: at.y + stemLen * 0.5
    }, {
        ...common, color: [color], kind: "blade", size: [size * 0.9, size * 0.75], rotation: UP, stretch: stemLen / (size * 0.9) * 1.1
    })
    emit(layer, {
        x: at.x + size * 0.75, y: at.y + stemLen * 0.85
    }, {
        ...common, color: [color], kind: "blade", size: [size * 0.8, size * 0.6], rotation: -0.9, stretch: 0.9
    })
}

// ---- Đòn cận chiến: đòn đánh ĐÁP NGAY TRÊN mục tiêu, không có vật bay ----

/** CHÉM (lưỡi, vuốt): một hoặc hai vết cắt lưỡi liềm ngắn mảnh ngay trên mục tiêu, vài tia lửa */
export async function meleeSlash(layer: Node, at: Pt, dir: number, colors: number[], cuts = 1) {
    for (let i = 0; i < cuts; i++) {
        const a = dir + UP + (i ? 0.7 : -0.4)
        arc(layer, offset(at, a, -18), 38, a - 0.9 + UP, a + 0.9 + UP, 3, colors, 0.16, 1, 8)
        if (i + 1 < cuts) await wait(layer, 0.08)
    }
    void sparks(layer, at, 8, colors, [120, 260], {
        life: [0.12, 0.24], size: [12, 4]
    })
    await wait(layer, 0.28)
}

/** ĐÂM (giáo, dao găm): nét đâm nhanh xuyên vào mục tiêu theo hướng tấn công, chạm thì bụi nhỏ */
export async function meleeStab(layer: Node, at: Pt, dir: number, colors: number[], puff: number[]) {
    const a = offset(at, dir, -60)
    await over(layer, 0.08, (t) => {
        const tip = mix(a, offset(at, dir, 6), t)
        seg(layer, offset(tip, dir, -34), tip, 2.5, colors, 0.08, 1)
    })
    seg(layer, offset(at, dir, -30), offset(at, dir, 10), 3, colors, 0.14, 1)
    flash(layer, at, colors[0], 50, 0.14, 0.7)
    void motes(layer, at, 12, puff, [40, 120], {
        additive: false, life: [0.25, 0.4], size: [7, 3], angle: [dir - 0.8, dir + 0.8]
    })
    await wait(layer, 0.3)
}

/** NỆN (nắm đấm, búa): khối đập dội thẳng xuống mục tiêu, vòng sóng nhỏ trên đất, bụi */
export async function meleeSmash(layer: Node, at: Pt, colors: number[], dust: number[]) {
    const top = offset(at, UP, 70)
    await over(layer, 0.09, (t) => {
        const p = mix(top, at, t * t)
        emit(layer, p, {
            color: colors, kind: "blade", life: [0.05, 0.06], size: [22, 20], alpha: 1, rotation: UP, stretch: 1.3
        })
    })
    flash(layer, at, colors[0], 60, 0.14, 0.7)
    ring(layer, offset(at, UP, -20), colors[colors.length - 1], 20, 110, 0.26, 0.7)
    void burst(layer, offset(at, UP, -24), 14, {
        color: dust, kind: "dot", additive: false, life: [0.3, 0.45], size: [8, 4], alpha: 0.8, speed: [60, 140], angle: [-0.3, Math.PI + 0.3], gravity: -200
    })
    await wait(layer, 0.32)
}
