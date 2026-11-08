// Mảnh dựng chung của VFX Sylas, Mel, Azir, Jayce: luồng hạt bay giữa hai điểm và cột hạt thẳng đứng. Chỉ dùng hạt fx_dust, không nét vẽ.
import {
    bloom, dustBurst, dustStream, type DustOpts
} from "./fx_dust"
import {
    ease, lerp, rand, tween
} from "./particles"
import type {
    Pt, VfxCtx
} from "./types"

export const pointsOf = (ctx: VfxCtx) => ctx.to.length ? ctx.to : [ctx.from]
export const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
export const mixPt = (a: Pt, b: Pt, t: number): Pt => ({
    x: lerp(a.x,
        b.x,
        t), y: lerp(a.y,
        b.y,
        t)
})
export const angleOf = (a: Pt, b: Pt) => Math.atan2(b.y - a.y,
    b.x - a.x)

/** ctx.onBeat đúng một lần dù nhiều mục tiêu */
export function beatOnce(ctx: VfxCtx) {
    let fired = false
    return () => {
        if (fired) return
        fired = true
        ctx.onBeat?.()
    }
}

export interface FlightOpts {
    ms: number;
    /** Độ rộng lõi hạt (px) */
    width: number;
    /** Độ võng của đường bay (px, 0 = thẳng) */
    arc?: number;
    color: number[];
    perSec?: number;
    /** Lõi: cỡ hạt đầu và cuối */
    size?: [number, number];
    /** Thêm mảnh sắc bay theo đầu đạn */
    blade?: boolean;
    additive?: boolean;
    trail?: Partial<DustOpts>;
    /** Chạm đích */
    arrive?: () => void;
    easing?: (t: number) => number;
}

/** Đầu luồng hạt bay từ a tới b: chạm b là gọi arrive ngay, đuôi hạt tự tan sau */
export function flight(ctx: VfxCtx, a: Pt, b: Pt, o: FlightOpts): Promise<unknown> {
    let p = {
        ...a
    }
    const head = () => ({
        x: p.x + rand(-o.width,
            o.width) * .5, y: p.y + rand(-o.width,
            o.width) * .5
    })
    const dir = angleOf(a,
        b)
    return Promise.all([
        dustStream(ctx.layer,
            head,
            o.ms,
            o.perSec ?? 1500,
            {
                color: o.color, speed: [6,
                    60], life: [180,
                    460], size: o.size ?? [7,
                    2], alpha: 1, flow: 26, drag: 2.2, additive: o.additive, ...o.trail
            }),
        ...(o.blade ? [dustStream(ctx.layer,
            head,
            o.ms,
            260,
            {
                color: o.color, blade: true, speed: [120,
                    420], angle: [dir - .18,
                    dir + .18], life: [120,
                    300], size: [16,
                    8], alpha: 1, drag: 1.4, additive: o.additive
            })] : []),
        tween(o.ms,
            (t) => {
                const q = mixPt(a,
                    b,
                    t)
                p = {
                    x: q.x, y: q.y - Math.sin(t * Math.PI) * (o.arc ?? 0)
                }
            },
            o.easing ?? ease.inOut,
            ctx.layer).then(() => o.arrive?.())
    ])
}

/** Rải đều hạt dọc đoạn a -> b cùng lúc: thân xích, tia sáng, vệt cát */
export function along(ctx: VfxCtx, a: Pt, b: Pt, steps: number, o: DustOpts & { count: number }, wobble = 0) {
    const n = Math.max(2,
        steps)
    const len = Math.hypot(b.x - a.x,
        b.y - a.y) || 1
    const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len
    const out: Promise<void>[] = []
    for (let i = 0; i <= n; i++) {
        const t = i / n
        const q = mixPt(a,
            b,
            t)
        const w = Math.sin(t * Math.PI * 3) * wobble
        out.push(dustBurst(ctx.layer,
            {
                x: q.x + nx * w, y: q.y + ny * w
            },
            o))
    }
    return Promise.all(out)
}

/** Cột hạt rơi thẳng từ trên xuống `at`: chạm là gọi arrive (búa Jayce, cột sáng Mel) */
export function column(ctx: VfxCtx, at: Pt, o: { ms: number; height: number; width: number; color: number[]; perSec?: number; arrive?: () => void; blade?: boolean }): Promise<unknown> {
    let y = at.y - o.height
    const head = () => ({
        x: at.x + rand(-o.width,
            o.width) * .5, y: y + rand(-14,
            14)
    })
    return Promise.all([
        dustStream(ctx.layer,
            head,
            o.ms,
            o.perSec ?? 2600,
            {
                color: o.color, speed: [10,
                    70], angle: [Math.PI * .4,
                    Math.PI * .6], life: [140,
                    360], size: [8,
                    2], alpha: 1, flow: 22, drag: 2
            }),
        ...(o.blade ? [dustStream(ctx.layer,
            head,
            o.ms,
            340,
            {
                color: o.color, blade: true, speed: [260,
                    620], angle: [Math.PI * .46,
                    Math.PI * .54], life: [120,
                    240], size: [20,
                    10], alpha: 1, drag: 1
            })] : []),
        tween(o.ms,
            (t) => { y = at.y - o.height * (1 - t) },
            ease.in,
            ctx.layer).then(() => o.arrive?.())
    ])
}

/** Quầng sáng và vòng hạt toả tròn dày tại điểm trúng (không vẽ vòng, chỉ hạt) */
export function blast(ctx: VfxCtx, at: Pt, color: number[], size: number, count: number, o: Partial<DustOpts> = {
}) {
    return Promise.all([
        bloom(ctx.layer,
            at,
            color[0],
            size * 1.3,
            300),
        bloom(ctx.layer,
            at,
            color[1] ?? color[0],
            size * .7,
            220),
        dustBurst(ctx.layer,
            at,
            {
                count, color, speed: [80,
                    520], life: [260,
                    640], size: [8,
                    2], alpha: 1, flow: 60, drag: 1.6, spread: 18, ...o
            })
    ])
}
