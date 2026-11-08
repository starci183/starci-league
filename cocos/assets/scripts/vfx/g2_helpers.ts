// Đồ nghề dùng chung cho VFX nhóm 2 (Gangplank, Leona, Malphite, Ornn, Katarina, Kha'Zix, Qiyana, Ahri, Annie, Lissandra, Lux,
// Ashe, Jinx). Chỉ ghép các hạt của particles.ts thành khối hay dùng: tụ lực, bay, vết chém, vòng sóng, khói, mảnh vỡ, cột sáng.
// Toạ độ: gốc giữa màn, trục y hướng lên; địch nằm phía trên người dùng chiêu. gravity dương là bốc lên, âm là rơi xuống.
import {
    Node
} from "cc"
import {
    angleOf, dist, emit as rawEmit, engineOf, lerp, mix, over, rand, type EmitOpts, type Pt
} from "./particles"
import type {
    VfxCtx
} from "./registry"

/**
 * Phát một hạt theo TÔNG NHẸ của nhóm 2 (chủ chốt 2026-11-04: tinh tế, không loè loẹt). Mọi file nhóm 2 phát hạt qua hàm này:
 * hạt tung toé (có tốc độ hoặc rải) bỏ bớt gần một nửa, quầng sáng nhỏ lại và mờ hơn, vòng sóng nhỏ lại. Hạt đứng yên dựng
 * hình (thân dao, thùng, trái tim, mũi tên) giữ nguyên số để không vỡ dáng.
 */
export function emit(layer: Node, at: Pt, o: EmitOpts) {
    const loose = (o.speed?.[1] ?? 0) > 0 || (o.spread ?? 0) > 0
    if (loose && Math.random() < 0.45) return
    const kind = o.kind ?? "glow"
    const k = kind === "glow" ? 0.7 : kind === "ring" ? 0.8 : 0.92
    const a = kind === "glow" ? 0.7 : 0.9
    rawEmit(layer,
        at,
        {
            ...o, size: o.size ? [o.size[0] * k,
                o.size[1] * k] : undefined, alpha: (o.alpha ?? 1) * a
        })
}

export const TAU = Math.PI * 2
export const UP = Math.PI / 2
export const DOWN = -Math.PI / 2

/** Cường độ chiêu: thường 1, chiêu cuối (intensity 2) chỉ 1,3 để R to nhất nhưng vẫn tiết chế */
export const pow = (ctx: VfxCtx) => 1 + ((ctx.style.intensity ?? 1) - 1) * 0.3
/** Mục tiêu chính; không có thì là chính người dùng */
export const main = (ctx: VfxCtx): Pt => ctx.to[0] ?? ctx.from
/** Mọi mục tiêu; rỗng thì lấy người dùng (chiêu tự thân, chiêu vùng) */
export const all = (ctx: VfxCtx): Pt[] => (ctx.to.length ? ctx.to : [ctx.from])
/** Điểm cách `at` một đoạn r theo góc a */
export const polar = (at: Pt, a: number, r: number): Pt => ({
    x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r
})
export const add = (at: Pt, dx: number, dy: number): Pt => ({
    x: at.x + dx, y: at.y + dy
})
export const clamp = (v: number, a: number, b: number) => Math.max(a,
    Math.min(b,
        v))

/** Hướng từ người dùng tới mục tiêu; không có mục tiêu thì hướng lên (phía địch) */
export function aim(ctx: VfxCtx): number {
    const t = ctx.to[0]
    if (t && dist(ctx.from,
        t) > 20) return angleOf(ctx.from,
        t)
    return UP
}

/** Khoảng cách giữa hai đường, ước theo khoảng cách hai hàng (bàn đấu 215 px giữa đường, 376 px giữa hàng) */
export function laneGap(ctx: VfxCtx): number {
    const t = ctx.to[0]
    const dy = t ? Math.abs(t.y - ctx.from.y) : 0
    return dy > 120 ? clamp(dy * 0.57,
        120,
        240) : 200
}

/** Hướng dọc từ hàng mình sang hàng địch: 1 là địch ở trên */
export const foeSide = (ctx: VfxCtx) => ((ctx.to[0]?.y ?? ctx.from.y + 1) >= ctx.from.y ? 1 : -1)

/**
 * Hàng mục tiêu cho chiêu nhiều đường. Trận truyền đủ nhiều đích thì dùng luôn; chỉ có một đích thì suy ra các đường kề
 * quanh nó (3 đường: đối diện + 2 kề; 5 đường: cả hàng). Phần tử đầu luôn là mục tiêu chính.
 */
export function row(ctx: VfxCtx, n: 3 | 5): Pt[] {
    if (ctx.to.length >= 2) return ctx.to
    const t = main(ctx)
    const g = laneGap(ctx)
    const offs = n === 3 ? [0, -1, 1] : [0, -1, 1, -2, 2]
    return offs.map((o) => add(t,
        o * g,
        0))
}

/** Gọi fn đều `perSec` lần mỗi giây trong `secs` giây; fn nhận tiến độ 0..1 */
export function pulse(layer: Node, secs: number, perSec: number, fn: (t: number) => void): Promise<void> {
    let carry = 0, last = 0
    return over(layer,
        secs,
        (t) => {
            carry += (t - last) * secs * perSec
            last = t
            while (carry >= 1) { carry -= 1; fn(t) }
        })
}

/** Đường cong bậc hai a -> b, điểm điều khiển lệch ngang `bend` px */
export function curve(a: Pt, b: Pt, bend: number, u: number): Pt {
    const d = angleOf(a,
        b)
    const c = {
        x: (a.x + b.x) / 2 - Math.sin(d) * bend, y: (a.y + b.y) / 2 + Math.cos(d) * bend
    }
    const v = 1 - u
    return {
        x: v * v * a.x + 2 * v * u * c.x + u * u * b.x, y: v * v * a.y + 2 * v * u * c.y + u * u * b.y
    }
}

/** Quỹ đạo ném vồng: a -> b, đỉnh cao hơn đường thẳng `h` px */
export const lob = (a: Pt, b: Pt, h: number, u: number): Pt => ({
    x: lerp(a.x,
        b.x,
        u), y: lerp(a.y,
        b.y,
        u) + Math.sin(u * Math.PI) * h
})

/**
 * Bay một đầu đạn theo `path(u)` trong `secs` giây, `shape` biến thời gian thành tiến độ đường bay. Mỗi khung gọi head(p, dir, t)
 * để vẽ đầu đạn và đuôi; xong là đã chạm đích.
 */
export function fly(layer: Node, secs: number, path: (u: number) => Pt, head: (p: Pt, dir: number, t: number) => void,
    shape: (t: number) => number = (t) => t): Promise<void> {
    let prev = path(0)
    return over(layer,
        secs,
        (t) => {
            const p = path(shape(t))
            const d = dist(prev,
                p) > 0.01 ? angleOf(prev,
                p) : 0
            head(p,
                d,
                t)
            prev = p
        })
}

// ---- khối hạt dựng sẵn (bắn rồi quên, không chờ) ----

/** Một quầng sáng đứng yên phình hoặc co từ s0 tới s1 */
export function glow(layer: Node, at: Pt, colors: number[], s0: number, s1: number, life: number, alpha = 1, additive = true) {
    emit(layer,
        at,
        {
            color: colors, kind: "glow", life: [life,
                life], size: [s0,
                s1], alpha, additive
        })
}

/** Vòng sóng toả (s0 < s1) hoặc thu (s0 > s1) */
export function ring(layer: Node, at: Pt, colors: number[], s0: number, s1: number, life: number, alpha = 0.9, additive = true) {
    emit(layer,
        at,
        {
            color: colors, kind: "ring", life: [life,
                life], size: [s0,
                s1], alpha, additive
        })
}

/** Tia sắc bắn ra quanh điểm (theo cung `angle` nếu có) */
export function sparks(layer: Node, at: Pt, n: number, colors: number[], speed: [number, number], o: Partial<EmitOpts> = {
}) {
    for (let i = 0; i < n; i++) emit(layer,
        at,
        {
            color: colors, kind: "blade", life: [0.16,
                0.38], size: [24,
                6], alpha: 1, speed, drag: 2.4, align: true, stretch: 2.6, ...o
        })
}

/** Hạt tròn nhỏ văng ra */
export function motes(layer: Node, at: Pt, n: number, colors: number[], speed: [number, number], o: Partial<EmitOpts> = {
}) {
    for (let i = 0; i < n; i++) emit(layer,
        at,
        {
            color: colors, kind: "dot", life: [0.3,
                0.65], size: [8,
                2], alpha: 1, speed, drag: 1.8, ...o
        })
}

/** Khói: quầng mờ hoà màu thường, bốc chậm lên */
export function smoke(layer: Node, at: Pt, n: number, colors: number[], spread = 30, size = 70, o: Partial<EmitOpts> = {
}) {
    for (let i = 0; i < n; i++) emit(layer,
        at,
        {
            color: colors, kind: "glow", additive: false, life: [0.6,
                1.1], size: [size * 0.5,
                size * 1.4], alpha: 0.5, speed: [10,
                60], drag: 1.2, gravity: 50, spread, ...o
        })
}

/** Mảnh vỡ đặc (đá, gỗ, băng tối): bắn vồng lên rồi rơi */
export function debris(layer: Node, at: Pt, n: number, colors: number[], size = 18, o: Partial<EmitOpts> = {
}) {
    for (let i = 0; i < n; i++) emit(layer,
        at,
        {
            color: colors, kind: "blade", additive: false, life: [0.5,
                0.9], size: [size,
                size * 0.7], alpha: 1, speed: [180,
                460], angle: [0.25,
                Math.PI - 0.25], gravity: -1100, spin: [-12,
                12], stretch: 1.3, ...o
        })
}

/** Vết nứt toả trên mặt đất: các tia mảnh nằm yên */
export function cracks(layer: Node, at: Pt, n: number, reach: number, colors: number[], life = 0.7, alpha = 0.95) {
    for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rand(-0.3,
            0.3)
        const r = rand(reach * 0.5,
            reach)
        for (let j = 0; j < 4; j++) {
            const t = (j + 0.5) / 4
            emit(layer,
                polar(at,
                    a + rand(-0.12,
                        0.12),
                    r * t),
                {
                    color: colors, kind: "blade", life: [life,
                        life * 1.2], size: [r / 3.6,
                        r / 4.4], alpha: alpha * (1 - t * 0.5), rotation: a + rand(-0.3,
                        0.3), stretch: 0.6
                })
        }
    }
}

/** Gai dựng đứng trồi lên quanh tâm (băng, đá): mảnh sắc mũi chỉ lên, mọc lớn dần */
export function spikes(layer: Node, at: Pt, n: number, rx: number, ry: number, colors: number[], height: number, life = 0.7, additive = false) {
    for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rand(-0.2,
            0.2)
        const p = {
            x: at.x + Math.cos(a) * rx * rand(0.8,
                1.1), y: at.y + Math.sin(a) * ry * rand(0.8,
                1.1)
        }
        const h = height * rand(0.7,
            1.15)
        emit(layer,
            add(p,
                0,
                h * 0.3),
            {
                color: colors, kind: "blade", additive, life: [life,
                    life * 1.15], size: [h * 0.35,
                    h * 0.6], alpha: 1, rotation: UP + rand(-0.35,
                    0.35) + Math.cos(a) * -0.25, stretch: 1.6
            })
    }
}

/** Hạt hút vào tâm từ vòng bán kính r trong `secs` giây (tụ lực) */
export function gather(layer: Node, at: Pt, r: number, secs: number, perSec: number, o: EmitOpts): Promise<void> {
    return pulse(layer,
        secs,
        perSec,
        () => {
            const a = rand(0,
                TAU)
            const rr = r * rand(0.7,
                1.1)
            const life = rand(0.18,
                0.3)
            emit(layer,
                polar(at,
                    a,
                    rr),
                {
                    kind: "dot", size: [6,
                        2], alpha: 1, ...o, speed: [rr / life,
                        rr / life], angle: [a + Math.PI,
                        a + Math.PI], life: [life,
                        life], drag: 0
                })
        })
}

/**
 * Vết chém cong: các mảnh blade xếp nối nhau theo cung tròn tâm `at`, chạy dần từ góc a0 qua `sweep` rad trong `secs` giây,
 * thon hai đầu, kèm lõi trắng. Nằm yên rồi tan.
 */
export function slashArc(layer: Node, at: Pt, radius: number, a0: number, sweep: number, width: number, colors: number[], secs: number,
    life = 0.32, core = 0xffffff): Promise<void> {
    const N = Math.max(8,
        Math.round(Math.abs(sweep) * radius / 12))
    let placed = 0
    return over(layer,
        secs,
        (t) => {
            while (placed <= N * t) {
                const u = placed / N
                const a = a0 + sweep * u
                const p = polar(at,
                    a,
                    radius)
                const taper = Math.sin(u * Math.PI) ** 0.7
                const tan = a + (sweep > 0 ? UP : -UP)
                emit(layer,
                    p,
                    {
                        color: colors, kind: "blade", life: [life,
                            life * 1.2], size: [width * (0.4 + taper),
                            width * 0.5], alpha: 1, rotation: tan, stretch: 1.8
                    })
                if (placed % 2 === 0) emit(layer,
                    p,
                    {
                        color: [core], kind: "blade", life: [life * 0.7,
                            life * 0.8], size: [width * 0.55 * (0.3 + taper),
                            width * 0.3], alpha: 0.95, rotation: tan, stretch: 1.6
                    })
                placed++
            }
        })
}

/** Vết chém thẳng qua `at` theo góc `a`, dài `len`: mảnh blade chạy từ đầu này sang đầu kia */
export function slashLine(layer: Node, at: Pt, a: number, len: number, width: number, colors: number[], secs: number, life = 0.3,
    core = 0xffffff): Promise<void> {
    const N = Math.max(6,
        Math.round(len / 14))
    const s = polar(at,
        a + Math.PI,
        len / 2)
    let placed = 0
    return over(layer,
        secs,
        (t) => {
            while (placed <= N * t) {
                const u = placed / N
                const p = polar(s,
                    a,
                    len * u)
                const taper = Math.sin(u * Math.PI) ** 0.6
                emit(layer,
                    p,
                    {
                        color: colors, kind: "blade", life: [life,
                            life * 1.2], size: [width * (0.3 + taper),
                            width * 0.4], alpha: 1, rotation: a, stretch: 2
                    })
                emit(layer,
                    p,
                    {
                        color: [core], kind: "blade", life: [life * 0.6,
                            life * 0.7], size: [width * 0.5 * (0.2 + taper),
                            width * 0.2], alpha: 0.9, rotation: a, stretch: 2
                    })
                placed++
            }
        })
}

/** Choáng: ba đốm sáng chao vòng trên đầu tướng */
export function stunStars(layer: Node, at: Pt, colors: number[], secs = 0.8): Promise<void> {
    const top = add(at,
        0,
        62)
    return over(layer,
        secs,
        (t) => {
            for (let i = 0; i < 3; i++) {
                const a = t * TAU * 1.6 + i * TAU / 3
                emit(layer,
                    {
                        x: top.x + Math.cos(a) * 34, y: top.y + Math.sin(a) * 10
                    },
                    {
                        color: colors, kind: "glow", life: [0.12,
                            0.16], size: [16,
                            6], alpha: 0.95
                    })
            }
        })
}

/** Cột sáng từ trời rơi xuống `at`: dải quầng dọc dày dần, chân cột loé */
export function column(layer: Node, at: Pt, colors: number[], height: number, width: number, secs: number, slant = 0): Promise<void> {
    return pulse(layer,
        secs,
        90,
        (t) => {
            const u = Math.random()
            const p = {
                x: at.x + slant * u * height + rand(-width * 0.25,
                    width * 0.25), y: at.y + u * height * Math.min(1,
                    t * 3)
            }
            emit(layer,
                p,
                {
                    color: colors, kind: "glow", life: [0.12,
                        0.22], size: [width,
                        width * 0.6], alpha: 0.55, speed: [80,
                        240], angle: [DOWN - 0.05,
                        DOWN + 0.05]
                })
        })
}

/** Ngọn lửa bốc: lưỡi lửa cộng sáng bay lên và nhỏ dần */
export function flames(layer: Node, at: Pt, n: number, colors: number[], size = 30, spread = 20, o: Partial<EmitOpts> = {
}) {
    for (let i = 0; i < n; i++) emit(layer,
        at,
        {
            color: colors, kind: "glow", life: [0.3,
                0.6], size: [size,
                size * 0.2], alpha: 0.9, speed: [40,
                140], angle: [UP - 0.5,
                UP + 0.5], gravity: 160, spread, ...o
        })
}

/** Vụ nổ lửa: chớp trắng, cầu lửa, tia, khói đen, tàn lửa */
export function fireBlast(layer: Node, at: Pt, k: number, hot: number[], smokeCols: number[] = [0x2a1a14, 0x3a2a22]) {
    glow(layer,
        at,
        [0xffffff],
        30 * k,
        100 * k,
        0.16,
        0.7)
    glow(layer,
        at,
        [hot[0]],
        50 * k,
        150 * k,
        0.36,
        0.7)
    ring(layer,
        at,
        [hot[1] ?? hot[0]],
        30,
        170 * k,
        0.32,
        0.7)
    for (let i = 0; i < Math.round(14 * k); i++) emit(layer,
        at,
        {
            color: hot, kind: "glow", life: [0.3,
                0.6], size: [44 * k,
                10], alpha: 0.9, speed: [120,
                380 * k], drag: 2.4, gravity: 120
        })
    sparks(layer,
        at,
        Math.round(10 * k),
        [0xffffff,
            ...hot],
        [260,
            560 * Math.sqrt(k)])
    smoke(layer,
        at,
        Math.round(5 * k),
        smokeCols,
        26 * k,
        90 * k)
    motes(layer,
        at,
        Math.round(8 * k),
        hot,
        [60,
            260],
        {
            gravity: 140, life: [0.5,
                0.9]
        })
}

/** Đờ cho tới khi mọi hạt cuối đã tắt (dùng ở cuối chiêu) */
export const settle = (layer: Node, secs: number) => engineOf(layer).after(secs * 0.6,
    () => undefined)

export {
    mix
}

// ---- đòn đánh thường cận chiến: đòn đáp NGAY TẠI mục tiêu, không có vật bay, khoảng 0,3–0,45 s và 15–40 hạt ----

/** CHÉM (kiếm, vuốt, lưỡi): một hoặc hai vết trăng khuyết mảnh ngắn ngay trên mục tiêu, vài tia lửa */
export async function meleeSlash(layer: Node, at: Pt, dir: number, colors: number[], cuts: 1 | 2 = 1, core = 0xffffff) {
    const a0 = dir + UP + 0.9
    void slashArc(layer,
        polar(at,
            dir + Math.PI,
            18),
        32,
        a0,
        -1.8,
        10,
        colors,
        0.07,
        0.22,
        core)
    if (cuts === 2) {
        await engineOf(layer).after(0.08,
            () => undefined)
        void slashArc(layer,
            polar(at,
                dir + Math.PI,
                14),
            28,
            a0 - 2.4,
            1.6,
            9,
            colors,
            0.07,
            0.2,
            core)
    }
    await engineOf(layer).after(0.07,
        () => undefined)
    sparks(layer,
        at,
        6,
        [core, ...colors],
        [160,
            340],
        {
            angle: [dir - 0.8,
                dir + 0.8], size: [14,
                4], life: [0.12,
                0.24]
        })
    await engineOf(layer).after(0.22,
        () => undefined)
}

/** ĐÂM (giáo, dao găm): một đường đâm nhanh theo hướng đòn, chấm va chạm nhỏ */
export async function meleeStab(layer: Node, at: Pt, dir: number, colors: number[], core = 0xffffff) {
    await slashLine(layer,
        polar(at,
            dir + Math.PI,
            20),
        dir,
        64,
        8,
        colors,
        0.06,
        0.2,
        core)
    glow(layer,
        at,
        [colors[0]],
        16,
        50,
        0.16,
        0.8)
    motes(layer,
        at,
        6,
        [core, ...colors],
        [80,
            200],
        {
            angle: [dir - 0.9,
                dir + 0.9], life: [0.15,
                0.3], size: [5,
                1]
        })
    await engineOf(layer).after(0.24,
        () => undefined)
}

/** NỆN (nắm đấm, búa, khiên): vệt đòn ngắn bổ thẳng xuống mục tiêu, vòng sóng nhỏ dưới chân và bụi */
export async function meleeSmash(layer: Node, at: Pt, colors: number[], dust: number[]) {
    const top = add(at,
        0,
        70)
    await over(layer,
        0.08,
        (t) => {
            const p = mix(top,
                at,
                t * t)
            rawEmit(layer,
                p,
                {
                    color: colors, kind: "blade", life: [0.08,
                        0.12], size: [22,
                        14], alpha: 0.9, rotation: DOWN, stretch: 1.8
                })
        })
    const foot = add(at,
        0,
        -24)
    ring(layer,
        foot,
        [colors[0]],
        16,
        100,
        0.28,
        0.6)
    ring(layer,
        foot,
        dust,
        16,
        120,
        0.34,
        0.45,
        false)
    glow(layer,
        at,
        [colors[0]],
        20,
        60,
        0.14,
        0.7)
    smoke(layer,
        foot,
        3,
        dust,
        20,
        40,
        {
            alpha: 0.4
        })
    debris(layer,
        foot,
        4,
        dust,
        10,
        {
            speed: [100,
                220], life: [0.3,
                0.45]
        })
    await engineOf(layer).after(0.28,
        () => undefined)
}
