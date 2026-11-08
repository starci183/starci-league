// Đồ dùng chung cho VFX nhóm 1 (Darius, Nami, Braum, Blitzcrank, Zed, Viktor, Twisted Fate, Soraka, Teemo, Kog'Maw, Aatrox,
// Garen, Yorick). Chỉ là các khối dựng hình từ bộ hạt particles.ts: đường bay, nhát chém cung, tia sét, cột sáng, xoáy hút,
// cộng hình học bàn cờ (5 đường, hàng địch / hàng mình) để chiêu diện rộng tự tìm đủ các đường khi ctx.to chỉ có một điểm.
import {
    Node
} from "cc"
import {
    angleOf, dist, ease, emit as rawEmit, lerp, mix, over as rawOver, rand, stream as rawStream, wait as rawWait, type EmitOpts, type Pt
} from "./particles"
import type {
    VfxCtx
} from "./registry"

// ---- tiết chế (phản hồi của chủ 2026-11-04: nhã, không loè loẹt) ----
// Mọi hạt của nhóm 1 đi qua lớp này: quầng nhỏ và mờ hơn, hạt văng bớt gần một nửa, cỡ có trần (không sprite khổng lồ),
// thời lượng ngắn lại. Cường độ chiêu cuối (intensity 2) chỉ còn 1.35 lần thay vì gấp đôi.
const TONE = {
    count: 0.5, glow: 0.7, glowAlpha: 0.8, ring: 0.75, time: 0.85, drop: 0.45
}
const CAP: Record<string, number> = {
    glow: 190, ring: 300, blade: 110, dot: 26
}
/** Phát một hạt đã tiết chế; `keep` = true thì không bị lược (hạt dựng hình vật thể) */
function toned(layer: Node, at: Pt, o: EmitOpts, keep: boolean) {
    const moving = (o.speed?.[1] ?? 0) > 0
    if (!keep && moving && Math.random() < TONE.drop) return
    const kind = o.kind ?? "glow"
    let [s0, s1] = o.size ?? [8,
        2]
    let alpha = o.alpha ?? 1
    if (kind === "glow") { s0 *= TONE.glow; s1 *= TONE.glow; alpha *= TONE.glowAlpha }
    if (kind === "ring") { s0 *= TONE.ring; s1 *= TONE.ring; alpha *= 0.85 }
    const cap = CAP[kind] ?? 200
    rawEmit(layer,
        at,
        {
            ...o, size: [Math.min(cap,
                s0),
            Math.min(cap,
                s1)], alpha
        })
}
export const emit = (layer: Node, at: Pt, o: EmitOpts) => toned(layer,
    at,
    o,
    false)
/** Nổ một loạt: số hạt giảm một nửa */
export function burst(layer: Node, at: Pt, count: number, o: EmitOpts): Promise<void> {
    const n = Math.max(1,
        Math.round(count * TONE.count))
    for (let i = 0; i < n; i++) toned(layer,
        at,
        o,
        true)
    return rawWait(layer,
        (o.life?.[1] ?? 0.6))
}
export const over = (layer: Node, secs: number, fn: (t: number) => void) => rawOver(layer,
    secs * TONE.time,
    fn)
export const wait = (layer: Node, secs: number) => rawWait(layer,
    secs * TONE.time)
export const stream = (layer: Node, getPt: () => Pt, secs: number, perSec: number, o: EmitOpts) => rawStream(layer,
    getPt,
    secs * TONE.time,
    perSec * 0.55,
    {
        ...o, size: o.size ? [Math.min(CAP[o.kind ?? "glow"] ?? 200,
            o.size[0] * (o.kind === "glow" || !o.kind ? TONE.glow : 1)),
        o.size[1] * (o.kind === "glow" || !o.kind ? TONE.glow : 1)] : o.size
    })

export const power = (ctx: VfxCtx) => 1 + ((ctx.style.intensity ?? 1) - 1) * 0.35
/** Mục tiêu chính; chiêu không mục tiêu thì là chính người dùng */
export const mainOf = (ctx: VfxCtx): Pt => ctx.to[0] ?? ctx.from
export const targetsOf = (ctx: VfxCtx): Pt[] => (ctx.to.length ? ctx.to : [ctx.from])
export const shift = (p: Pt, dx: number, dy: number): Pt => ({
    x: p.x + dx, y: p.y + dy
})
export const polar = (p: Pt, a: number, r: number): Pt => ({
    x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r
})
export const UP = Math.PI / 2
export const DOWN = -Math.PI / 2

// ---- hình học bàn cờ ----
/** Toạ độ x 5 đường của trận thật (MatchScreen: BOARD.x + LANE_X) */
const MATCH_XS = [-463,
    -247,
    -33,
    178,
    392]
const MATCH_ROWS = [-124,
    252]

export interface Rows {
    /** 5 điểm hàng địch (so với người dùng) */
    foe: Pt[];
    /** 5 điểm hàng mình */
    ally: Pt[];
    /** Khoảng cách hai hàng (px) */
    gap: number;
    /** 1: địch ở phía trên, -1: phía dưới */
    up: number;
    /** Khoảng cách hai đường kề */
    spacing: number;
}

/** Dựng hai hàng 5 đường quanh người dùng. Trận thật dùng toạ độ cố định; màn khác (thư viện tướng) suy ra từ khoảng cách hai hàng */
export function rowsOf(ctx: VfxCtx): Rows {
    const f = ctx.from
    const t = ctx.to[0]
    const dy = t ? t.y - f.y : 0
    const vertical = Math.abs(dy) > 80
    const up = vertical ? Math.sign(dy) : f.y < 60 ? 1 : -1
    const inMatch = MATCH_XS.some((x) => Math.abs(x - f.x) < 4) && MATCH_ROWS.some((y) => Math.abs(y - f.y) < 4)
    const gap = inMatch ? 376 : vertical ? Math.abs(dy) : 300
    const spacing = inMatch ? 215 : gap * 0.572
    const xs = inMatch ? MATCH_XS : [-2,
        -1,
        0,
        1,
        2].map((i) => f.x + i * spacing)
    return {
        foe: xs.map((x) => ({
            x, y: f.y + up * gap
        })),
        ally: xs.map((x) => ({
            x, y: f.y
        })),
        gap, up, spacing,
    }
}

/** Mọi tướng địch: ctx.to có nhiều điểm thì dùng, không thì cả hàng địch */
export const allFoes = (ctx: VfxCtx): Pt[] => (ctx.to.length > 1 ? ctx.to : rowsOf(ctx).foe)

/** Điểm trên hàng `row` trong cùng đường với `p` và hai đường kề */
export function withNeighbours(row: Pt[], p: Pt, spacing: number): Pt[] {
    const near = row.filter((q) => Math.abs(q.x - p.x) <= spacing * 1.25)
    return near.length ? near : [p]
}

/** Điểm hàng địch gần `p` nhất theo x */
export const nearestIn = (row: Pt[], p: Pt): Pt => row.reduce((a, b) => (Math.abs(b.x - p.x) < Math.abs(a.x - p.x) ? b : a))

// ---- đường bay ----
export type Path = (t: number) => Pt
export const straight = (a: Pt, b: Pt): Path => (t) => mix(a,
    b,
    t)
/** Đường cong: lệch ngang (vuông góc hướng bay) tối đa `h` px ở giữa; h âm lệch phía kia */
export const bent = (a: Pt, b: Pt, h: number): Path => {
    const d = angleOf(a,
        b)
    return (t) => {
        const m = mix(a,
            b,
            t)
        const o = h * 4 * t * (1 - t)
        return {
            x: m.x - Math.sin(d) * o, y: m.y + Math.cos(d) * o
        }
    }
}
/** Cung ném: vồng lên trên màn hình `h` px */
export const lob = (a: Pt, b: Pt, h: number): Path => (t) => {
    const m = mix(a,
        b,
        t)
    return {
        x: m.x, y: m.y + h * 4 * t * (1 - t)
    }
}

/** Chạy vật thể theo `path` trong `secs` giây; mỗi khung gọi `step(điểm, t, hướng)` để vẽ thân và đuôi */
export function fly(layer: Node, path: Path, secs: number, step: (p: Pt, t: number, dir: number) => void, curve: (t: number) => number = ease.in): Promise<void> {
    let prev = path(0)
    return over(layer,
        secs,
        (k) => {
            const t = curve(k)
            const p = path(t)
            const dir = dist(prev,
                p) > 0.01 ? angleOf(prev,
                    p) : angleOf(path(0),
                        path(1))
            step(p,
                t,
                dir)
            prev = p
        })
}

// ---- khối dựng hình ----
/** Một quầng sáng đứng yên */
export function flash(layer: Node, at: Pt, colors: number[], s0: number, s1: number, life: number, alpha = 1, additive = true) {
    emit(layer,
        at,
        {
            color: colors, kind: "glow", life: [life,
                life], size: [s0,
                s1], alpha, additive
        })
}

/** Vòng sóng loang */
export function ring(layer: Node, at: Pt, colors: number[], s0: number, s1: number, life: number, alpha = 0.9) {
    emit(layer,
        at,
        {
            color: colors, kind: "ring", life: [life,
                life], size: [s0,
                s1], alpha
        })
}

/** Mảnh sắc toả ra (tia lửa, mảnh thép, mảnh băng) */
export function shards(layer: Node, at: Pt, n: number, colors: number[], o: Partial<EmitOpts> = {
}) {
    void burst(layer,
        at,
        n,
        {
            kind: "blade", life: [0.18,
                0.42], size: [22,
                6], alpha: 1, speed: [180,
                520], drag: 2.4, align: true, stretch: 2.4, ...o, color: colors
        })
}

/** Bụi hạt nhỏ toả ra */
export function motes(layer: Node, at: Pt, n: number, colors: number[], o: Partial<EmitOpts> = {
}) {
    void burst(layer,
        at,
        n,
        {
            kind: "dot", life: [0.3,
                0.7], size: [7,
                2], alpha: 1, speed: [60,
                300], drag: 1.8, ...o, color: colors
        })
}

/** Giọt đặc có trọng lực, không cộng màu nên đọc được trên nền sáng */
export function drops(layer: Node, at: Pt, n: number, colors: number[], o: Partial<EmitOpts> = {
}) {
    void burst(layer,
        at,
        n,
        {
            kind: "dot", additive: false, life: [0.45,
                0.8], size: [9,
                4], alpha: 1, speed: [120,
                360], angle: [0.25,
                Math.PI - 0.25], gravity: -1100, drag: 0.6, ...o, color: colors
        })
}

/** Khói / sương đặc, trôi chậm */
export function smoke(layer: Node, at: Pt, n: number, colors: number[], size: number, o: Partial<EmitOpts> = {
}) {
    void burst(layer,
        at,
        n,
        {
            kind: "glow", additive: false, life: [0.5,
                0.9], size: [size * 0.6,
                size * 1.4], alpha: 0.55, speed: [10,
                70], drag: 1.2, spread: size * 0.3, ...o, color: colors
        })
}

/** Cú va chạm chung: quầng, vòng sóng, mảnh sắc, bụi. Mỗi tướng truyền màu riêng và chồng thêm lớp riêng của mình */
export function impact(layer: Node, at: Pt, core: number[], body: number[], k = 1) {
    flash(layer,
        at,
        core,
        40 * k,
        150 * k,
        0.22,
        1)
    flash(layer,
        at,
        body,
        70 * k,
        200 * k,
        0.4,
        0.55)
    ring(layer,
        at,
        body,
        24,
        190 * k,
        0.34)
    shards(layer,
        at,
        Math.round(12 * k),
        [...core,
            ...body])
    motes(layer,
        at,
        Math.round(22 * k),
        [...core,
            ...body])
}

/** Nhát chém cung: lưỡi quét quanh tâm `c` bán kính `r` từ góc a0 tới a1, mảnh sắc nằm dọc vệt theo tiếp tuyến */
export function slashArc(layer: Node, c: Pt, r: number, a0: number, a1: number, secs: number, colors: number[], width: number, o: { additive?: boolean; keep?: number; head?: number[] } = {
}): Promise<void> {
    let last = 0
    const step = 0.09
    const keep = o.keep ?? 0.3
    return over(layer,
        secs,
        (k) => {
            const t = ease.out(k)
            while (last <= t) {
                const a = lerp(a0,
                    a1,
                    last)
                const p = polar(c,
                    a,
                    r)
                const taper = Math.sin(Math.PI * Math.min(1,
                    last * 1.1 + 0.05)) ** 0.5
                emit(layer,
                    p,
                    {
                        color: colors, kind: "blade", additive: o.additive ?? true, life: [keep * 0.8,
                            keep], size: [width * (0.6 + 0.6 * taper),
                            width * 0.4], alpha: 1, rotation: a + (a1 > a0 ? UP : DOWN), stretch: 2.2, speed: [10,
                            50], angle: [a - 0.3,
                            a + 0.3], drag: 3
                    })
                last += step / Math.max(1,
                    Math.abs(a1 - a0) * r / 120)
            }
            emit(layer,
                polar(c,
                    lerp(a0,
                        a1,
                        t),
                    r),
                {
                    color: o.head ?? [0xffffff], kind: "glow", life: [0.08,
                        0.14], size: [width * 1.6,
                        width * 0.5], alpha: 0.9
                })
        })
}

/** Nhát chém thẳng qua `at` theo góc `ang`, dài `len` */
export function slashLine(layer: Node, at: Pt, ang: number, len: number, secs: number, colors: number[], width: number, head: number[] = [0xffffff]): Promise<void> {
    const a = polar(at,
        ang + Math.PI,
        len / 2), b = polar(at,
        ang,
        len / 2)
    let placed = 0
    const gap = Math.max(8,
        width * 0.45)
    return over(layer,
        secs,
        (k) => {
            const d = ease.out(k) * len
            while (placed * gap <= d) {
                const u = (placed * gap) / len
                const taper = Math.sin(Math.PI * u) ** 0.6
                emit(layer,
                    mix(a,
                        b,
                        u),
                    {
                        color: colors, kind: "blade", life: [0.2,
                            0.32], size: [width * (0.5 + taper),
                            width * 0.5], alpha: 1, rotation: ang, stretch: 2.4
                    })
                placed++
            }
            emit(layer,
                mix(a,
                    b,
                    ease.out(k)),
                {
                    color: head, kind: "glow", life: [0.08,
                        0.12], size: [width * 1.8,
                        width * 0.6], alpha: 1
                })
        })
}

/** Tia sét răng cưa từ a tới b: hạt sáng dày dọc đường gãy khúc, hiện tức thì */
export function bolt(layer: Node, a: Pt, b: Pt, colors: number[], o: { segs?: number; jag?: number; size?: number; life?: number; core?: number } = {
}) {
    const segs = o.segs ?? Math.max(4,
        Math.round(dist(a,
            b) / 40))
    const jag = o.jag ?? 22
    const d = angleOf(a,
        b)
    const pts: Pt[] = [a]
    for (let i = 1; i < segs; i++) {
        const m = mix(a,
            b,
            i / segs)
        const off = rand(-jag,
            jag)
        pts.push({
            x: m.x - Math.sin(d) * off, y: m.y + Math.cos(d) * off
        })
    }
    pts.push(b)
    const size = o.size ?? 10
    const life = o.life ?? 0.16
    for (let i = 1; i < pts.length; i++) {
        const p = pts[i - 1], q = pts[i]
        const n = Math.max(2,
            Math.round(dist(p,
                q) / 9))
        for (let j = 0; j < n; j++) {
            const m = mix(p,
                q,
                j / n)
            emit(layer,
                m,
                {
                    color: [o.core ?? 0xffffff], kind: "dot", life: [life * 0.7,
                        life], size: [size * 0.7,
                        size * 0.5], alpha: 1
                })
            if (j % 2 === 0) emit(layer,
                m,
                {
                    color: colors, kind: "glow", life: [life,
                        life * 1.4], size: [size * 2.6,
                        size * 1.4], alpha: 0.55
                })
        }
    }
}

/** Hút vào tâm: hạt sinh trên vành bán kính r rồi lao vào c, hơi xoáy */
export function vortex(layer: Node, c: Pt, r: number, secs: number, perSec: number, colors: number[], o: Partial<EmitOpts> = {
}, swirl = 0.35): Promise<void> {
    const life = 0.32
    return over(layer,
        secs,
        (() => {
            let carry = 0, last = 0
            return (k: number) => {
                carry += (k - last) * secs * perSec
                last = k
                while (carry >= 1) {
                    carry -= 1
                    const a = rand(0,
                        Math.PI * 2)
                    const rr = r * rand(0.8,
                        1.1)
                    emit(layer,
                        polar(c,
                            a,
                            rr),
                        {
                            kind: "dot", life: [life,
                                life], size: [8,
                                2], alpha: 1, speed: [rr / life * 0.95,
                                rr / life], angle: [a + Math.PI + swirl,
                                a + Math.PI + swirl], ...o, color: colors
                        })
                }
            }
        })())
}

/** Hạt bay lên trong bề ngang w quanh c (hồi Máu, lửa hồn, hơi bốc) */
export function rise(layer: Node, c: Pt, w: number, secs: number, perSec: number, colors: number[], o: Partial<EmitOpts> = {
}): Promise<void> {
    return stream(layer,
        () => shift(c,
            rand(-w / 2,
                w / 2),
            rand(-w * 0.35,
                w * 0.1)),
        secs,
        perSec,
        {
            kind: "dot", life: [0.45,
                0.85], size: [8,
                2], alpha: 1, speed: [60,
                170], angle: [UP - 0.18,
                UP + 0.18], drag: 0.6, ...o, color: colors
        })
}

/** Cột sáng dọc: chồng quầng từ gốc `base` lên cao h */
export function column(layer: Node, base: Pt, h: number, w: number, colors: number[], life: number, alpha = 0.8) {
    const n = Math.max(3,
        Math.round(h / (w * 0.45)))
    for (let i = 0; i < n; i++) {
        const t = i / (n - 1)
        emit(layer,
            shift(base,
                rand(-w * 0.08,
                    w * 0.08),
                t * h),
            {
                color: colors, kind: "glow", life: [life * 0.85,
                    life], size: [w * (1.2 - 0.5 * t),
                    w * (1.5 - 0.6 * t)], alpha: alpha * (1 - t * 0.45)
            })
    }
}

/** Sao Choáng xoay trên đầu mục tiêu */
export function stunStars(layer: Node, at: Pt, secs: number, colors: number[] = [0xfff2a0,
    0xffd23a]): Promise<void> {
    const top = shift(at,
        0,
        62)
    return over(layer,
        secs,
        (k) => {
            for (let i = 0; i < 3; i++) {
                const a = k * Math.PI * 4 + (i * Math.PI * 2) / 3
                emit(layer,
                    {
                        x: top.x + Math.cos(a) * 34, y: top.y + Math.sin(a) * 10
                    },
                    {
                        color: colors, kind: "dot", life: [0.08,
                            0.12], size: [11,
                            7], alpha: 1
                    })
            }
        })
}

/** Lá bài dựng bằng mảnh sắc xếp chồng (dùng cho bài TF, lá bị cướp, lá bị đốt); vẽ lại mỗi khung khi đang bay */
export function cardShape(layer: Node, at: Pt, rot: number, size: number, colors: number[], life = 0.06, alpha = 1, rim: number[] = [0xfff0c0]) {
    const cs = Math.cos(rot + UP), sn = Math.sin(rot + UP)
    for (let i = -2; i <= 2; i++) {
        const o = i * size * 0.13
        emit(layer,
            {
                x: at.x + cs * o, y: at.y + sn * o
            },
            {
                color: Math.abs(i) === 2 ? rim : colors, kind: "blade", additive: false, life: [life,
                    life], size: [size,
                    size], alpha, rotation: rot, stretch: 1.25
            })
    }
}

/** Đường hạt nối liền a -> b hiện cùng lúc (xích, dây sinh lực, tia mảnh) */
export function strand(layer: Node, a: Pt, b: Pt, gap: number, o: EmitOpts, wobble = 0, phase = 0) {
    const n = Math.max(2,
        Math.round(dist(a,
            b) / gap))
    const d = angleOf(a,
        b)
    for (let i = 0; i <= n; i++) {
        const t = i / n
        const m = mix(a,
            b,
            t)
        const w = wobble ? Math.sin(t * Math.PI * 4 + phase) * wobble * Math.sin(t * Math.PI) : 0
        emit(layer,
            {
                x: m.x - Math.sin(d) * w, y: m.y + Math.cos(d) * w
            },
            {
                rotation: d, ...o
            })
    }
}

// ---- đòn đánh thường cận chiến: cú đánh đáp NGAY trên mục tiêu, không có đạn bay ----
// Mỗi đòn 0.3-0.45 s, khoảng 15-40 hạt. Chém (kiếm, rìu, móng), Đâm (giáo, dao), Nện (nắm đấm, búa, xẻng).

/** Một vết chém liềm mảnh, ngắn tại `at`, hướng `ang`; vẽ trong ~0.08 s */
function crescent(layer: Node, at: Pt, ang: number, r: number, colors: number[], width: number): Promise<void> {
    const n = 6
    const span = 1.3
    const c = polar(at,
        ang - UP,
        r * 0.55)
    let i = 0
    return rawOver(layer,
        0.08,
        (k) => {
            while (i < n && i / (n - 1) <= k) {
                const a = ang + UP - span / 2 + span * (i / (n - 1))
                const taper = Math.sin(Math.PI * (0.15 + 0.7 * (i / (n - 1))))
                rawEmit(layer,
                    polar(c,
                        a,
                        r),
                    {
                        color: colors, kind: "blade", life: [0.16,
                            0.22], size: [width * (0.6 + 0.6 * taper),
                            width * 0.5], alpha: 1, rotation: a + UP, stretch: 2.2
                    })
                i++
            }
        })
}

/** Chém: một hoặc hai vết liềm mảnh bắt chéo trên mục tiêu, vài tia lửa, loé nhỏ */
export async function meleeSlash(layer: Node, at: Pt, colors: number[], spark: number[], cuts = 1, size = 1) {
    const a0 = rand(-0.9,
        -0.5)
    await crescent(layer,
        at,
        a0,
        46 * size,
        colors,
        18 * size)
    if (cuts > 1) await crescent(layer,
        at,
        Math.PI - a0,
        46 * size,
        colors,
        18 * size)
    rawEmit(layer,
        at,
        {
            color: [spark[0]], kind: "glow", life: [0.14,
                0.14], size: [16,
                56 * size], alpha: 0.55
        })
    for (let i = 0; i < 5; i++) rawEmit(layer,
        at,
        {
            color: spark, kind: "blade", life: [0.12,
                0.24], size: [12,
                3], alpha: 1, speed: [160,
                340], drag: 2.5, align: true, stretch: 2.2
        })
    await rawWait(layer,
        0.2)
}

/** Đâm: một vệt đâm thẳng nhanh vào mục tiêu theo hướng `dir`, bụi nhỏ tại điểm chạm */
export async function meleeStab(layer: Node, at: Pt, dir: number, colors: number[], puff: number[]) {
    const from = polar(at,
        dir,
        -70)
    await rawOver(layer,
        0.08,
        (k) => {
            rawEmit(layer,
                mix(from,
                    at,
                    k),
                {
                    color: colors, kind: "blade", life: [0.1,
                        0.14], size: [26,
                        6], alpha: 1, rotation: dir, stretch: 3
                })
        })
    rawEmit(layer,
        at,
        {
            color: [puff[0]], kind: "glow", life: [0.16,
                0.16], size: [14,
                48], alpha: 0.5
        })
    for (let i = 0; i < 6; i++) rawEmit(layer,
        at,
        {
            color: puff, kind: "dot", life: [0.2,
                0.32], size: [6,
                2], alpha: 1, speed: [60,
                160], angle: [dir - 0.9,
                dir + 0.9], drag: 2
        })
    await rawWait(layer,
        0.25)
}

/** Nện: vật nặng giáng thẳng xuống mục tiêu, vòng sóng nhỏ sát đất và bụi văng ngang */
export async function meleeSmash(layer: Node, at: Pt, colors: number[], ringColor: number, dust: number[]) {
    const top = shift(at,
        0,
        60)
    await rawOver(layer,
        0.09,
        (k) => {
            rawEmit(layer,
                mix(top,
                    at,
                    ease.in(k)),
                {
                    color: colors, kind: "blade", life: [0.08,
                        0.12], size: [30,
                        22], alpha: 1, rotation: UP, stretch: 1.6
                })
        })
    const ground = shift(at,
        0,
        -18)
    rawEmit(layer,
        ground,
        {
            color: [ringColor], kind: "ring", life: [0.28,
                0.28], size: [16,
                92], alpha: 0.7
        })
    rawEmit(layer,
        at,
        {
            color: [colors[0]], kind: "glow", life: [0.14,
                0.14], size: [18,
                54], alpha: 0.5
        })
    for (let i = 0; i < 8; i++) {
        const side = i % 2 ? 0 : Math.PI
        rawEmit(layer,
            ground,
            {
                color: dust, kind: "dot", additive: false, life: [0.22,
                    0.36], size: [7,
                    3], alpha: 0.9, speed: [70,
                    180], angle: [side - 0.35,
                    side + 0.35], drag: 2.4, gravity: -200
            })
    }
    await rawWait(layer,
        0.25)
}
