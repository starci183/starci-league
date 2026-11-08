// VFX Mel: ánh vàng kim ánh trắng, hạt sáng mịn đặc như bột vàng, không hình học.
import {
    bloom, dustBurst, dustStream, mist
} from "./fx_dust"
import {
    along, beatOnce, blast, column, flight, kOf, pointsOf
} from "./fx_flow"
import {
    ease, sleep, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const GOLD = 0xffc94d
const PALE = 0xfff1c0
const WHITE = 0xffffff
const AMBER = 0xe08a1e
const palette = (ctx: VfxCtx) => [ctx.color,
    ctx.color2 ?? PALE,
    WHITE,
    GOLD]

/** Tia sáng: đầu hạt đặc, thân sáng đọng theo đường bay */
function ray(ctx: VfxCtx, to: Pt, ms: number, width: number, arrive: () => void) {
    const color = palette(ctx)
    const len = Math.hypot(to.x - ctx.from.x,
        to.y - ctx.from.y)
    return flight(ctx,
        ctx.from,
        to,
        {
            ms, width, color, perSec: 3000, size: [8,
                2], additive: true, easing: ease.in, trail: {
                speed: [4,
                    30], flow: 12
            },
            arrive() {
                arrive()
                void along(ctx,
                    ctx.from,
                    to,
                    Math.round(len / 16),
                    {
                        count: 22, color, speed: [6,
                            40], life: [150,
                            380], size: [6,
                            1.5], alpha: 1, flow: 16, drag: 2.6, additive: true, spread: width * .4
                    })
            }
        })
}
const flare = (ctx: VfxCtx, at: Pt, size: number, n: number) => blast(ctx,
    at,
    palette(ctx),
    size,
    n,
    {
        additive: true, speed: [70,
            460], flow: 34
    })

/** Đánh thường: 1 tia vàng */
registerVfx("melRay",
    async (ctx) => {
        const k = kOf(ctx), beat = beatOnce(ctx)
        await Promise.all(pointsOf(ctx).map((to) => ray(ctx,
            to,
            220,
            20 * k,
            beat)))
    })
registerVfx("melRayHit",
    async (ctx) => { await flare(ctx,
        ctx.from,
        170 * kOf(ctx),
        420) })
/** Niệm: hạt vàng hút vào tay */
registerVfx("melCharge",
    async (ctx) => {
        const color = palette(ctx), k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                200 * k,
                300),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 420, color, spread: 130 * k, speed: [20,
                        70], life: [200,
                        340], size: [6,
                        2], alpha: 1, flow: 60, drag: .4, additive: true
                }),
            sleep(190).then(() => ctx.onBeat?.())
        ])
    })
/** Q: 1 tia của Loạt Bắn; engine bắn q1 tia, mỗi tia một sự kiện sát thương */
registerVfx("melVolley",
    async (ctx) => {
        const k = kOf(ctx), beat = beatOnce(ctx)
        await Promise.all(pointsOf(ctx).map((to) => ray(ctx,
            to,
            170,
            24 * k,
            beat)))
    })
registerVfx("melVolleyHit",
    async (ctx) => {
        ctx.shake(3,
            90)
        await flare(ctx,
            ctx.from,
            190 * kOf(ctx),
            520)
    })
/** Chói Lọi: bột vàng bám lên lá mục tiêu; ctx.amount = số tầng */
registerVfx("melGlowMark",
    async (ctx) => {
        const n = Math.min(10,
            Math.max(1,
                ctx.amount ?? 1))
        const color = palette(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                GOLD,
                90 + n * 14,
                340),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 120 + n * 34, color, spread: 74, speed: [10,
                        60], gravity: -60, life: [320,
                        720], size: [6,
                        2], alpha: 1, flow: 26, additive: true
                })
        ])
    })
/** Ngưỡng hạ: cột sáng trắng vàng dội xuống đúng lúc Máu về 0 */
registerVfx("melExecute",
    async (ctx) => {
        const color = [WHITE,
            PALE,
            GOLD,
            ctx.color]
        ctx.shake(10,
            260)
        await Promise.all([
            flare(ctx,
                ctx.from,
                300,
                1100),
            column(ctx,
                ctx.from,
                {
                    ms: 110, height: 620, width: 90, color, perSec: 7000
                }),
            mist(ctx.layer,
                ctx.from,
                {
                    color: [GOLD,
                        AMBER], size: 240, alpha: .4
                })
        ])
    })
/** E Phản Quang Chiết Kính: màn hạt vàng dựng trước tướng được bảo vệ */
registerVfx("melMirror",
    async (ctx) => {
        const color = palette(ctx), k = kOf(ctx)
        const at = pointsOf(ctx)[0]
        await Promise.all([
            bloom(ctx.layer,
                at,
                PALE,
                240 * k,
                340),
            dustBurst(ctx.layer,
                at,
                {
                    count: 900, color, spread: 110 * k, speed: [20,
                        120], life: [260,
                        560], size: [6,
                        2], alpha: 1, flow: 30, drag: 1.6, additive: true
                }),
            sleep(170).then(() => ctx.onBeat?.())
        ])
    })
/** Phản chiêu chạm kẻ dùng: cột sáng dội xuống đúng lúc sát thương rơi */
registerVfx("melReflect",
    async (ctx) => {
        ctx.shake(6,
            180)
        await Promise.all([
            flare(ctx,
                ctx.from,
                240,
                820),
            column(ctx,
                ctx.from,
                {
                    ms: 90, height: 380, width: 64, color: palette(ctx), perSec: 5200
                })
        ])
    })
/** R Nhật Thực Vàng: nhật thực tụ giữa màn, mọi mục tiêu nhận cột sáng cùng một nhịp */
registerVfx("melEclipse",
    async (ctx) => {
        const color = palette(ctx), k = kOf(ctx), beat = beatOnce(ctx)
        const targets = pointsOf(ctx)
        const mid = {
            x: targets.reduce((s, p) => s + p.x,
                0) / targets.length, y: targets.reduce((s, p) => s + p.y,
                0) / targets.length - 170
        }
        let a = 0
        const halo = () => ({
            x: mid.x + Math.cos(a) * 118, y: mid.y + Math.sin(a) * 118
        })
        await Promise.all([
            bloom(ctx.layer,
                mid,
                AMBER,
                420 * k,
                620),
            bloom(ctx.layer,
                mid,
                GOLD,
                260 * k,
                520),
            tween(520,
                (t) => { a = t * Math.PI * 7 },
                ease.linear,
                ctx.layer),
            dustStream(ctx.layer,
                halo,
                520,
                3600,
                {
                    color, speed: [6,
                        50], life: [220,
                        520], size: [7,
                        2], alpha: 1, flow: 30, additive: true
                }),
            sleep(300).then(() => Promise.all(targets.map((to) => column(ctx,
                to,
                {
                    ms: 200, height: 460, width: 74, color, perSec: 3800, arrive: beat
                }))))
        ])
    })
registerVfx("melEclipseHit",
    async (ctx) => {
        ctx.shake(7,
            200)
        await flare(ctx,
            ctx.from,
            250 * kOf(ctx),
            760)
    })
