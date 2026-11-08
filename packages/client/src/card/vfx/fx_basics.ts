// Đòn đánh thường riêng từng tướng, theo đòn đánh trong LMHT. Đạn và vũ khí gọi ctx.onBeat ngay lúc chạm mục tiêu; hiệu ứng trúng do heroMap chọn.
// Đánh xa: đạn hình đặc bọc bụi, tia, sương theo chất liệu tướng. Cận chiến: không bay vũ khí, nhát đánh hiện tại mục tiêu bằng vệt mảnh và mảnh lưỡi. Bảng phân tích: docs/heroes/BASIC_ATTACKS.md.
import {
    Graphics
} from "pixi.js"
import {
    bloom, dustBurst, dustStream, mist, type DustOpts
} from "./fx_dust"
import {
    ease, lerp, makeSprite, sleep, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const TAU = Math.PI * 2
const points = (ctx: VfxCtx) => ctx.to.length ? ctx.to : [ctx.from]
/** Tỉ lệ hình: thẻ tướng lớn nên đòn thường vẽ to như VFX riêng của tướng */
const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity) * 1.55
const mix = (a: Pt, b: Pt, t: number): Pt => ({
    x: lerp(a.x,
        b.x,
        t), y: lerp(a.y,
        b.y,
        t)
})

function graphic(ctx: VfxCtx): Graphics {
    const g = new Graphics()
    ctx.layer.addChild(g)
    return g
}
const drop = (g: { destroyed: boolean; destroy: () => void }) => { if (!g.destroyed) g.destroy() }

/** ctx.onBeat đúng một lần dù nhiều mục tiêu */
function beatOnce(ctx: VfxCtx) {
    let fired = false
    return () => {
        if (fired) return
        fired = true
        ctx.onBeat?.()
    }
}

/** Graphics sống `ms` mili giây, vẽ lại mỗi khung; tự dọn */
async function decal(ctx: VfxCtx, ms: number, draw: (g: Graphics, t: number) => void) {
    if (ctx.layer.destroyed) return
    const g = graphic(ctx)
    await tween(ms,
        (t) => {
            g.clear()
            draw(g,
                t)
        },
        ease.linear,
        ctx.layer)
    drop(g)
}

/** Kiểu nổ bụi lúc trúng đích */
interface Hit {
    sparks: number[];
    glow?: number;
    count?: number;
    speed?: [number, number];
    gravity?: number;
    flow?: number;
    life?: [number, number];
    angle?: [number, number];
    /** Số mảnh lưỡi sắc bắn ra */
    streaks?: number;
    /** Độ dài mảnh lưỡi, px trước khi nhân tỉ lệ */
    shard?: number;
    /** Gọn và sắc cho đòn cận chiến */
    crisp?: boolean;
    /** Sương/khói toả chậm */
    smoke?: number[];
    smokeUp?: boolean;
    additive?: boolean;
}

function impact(ctx: VfxCtx, at: Pt, k: number, h: Hit) {
    if (ctx.layer.destroyed) return Promise.resolve()
    const shard = (h.shard ?? 34) * k
    return Promise.all([
        bloom(ctx.layer,
            at,
            h.glow ?? h.sparks[0],
            (h.crisp ? 130 : 240) * k,
            h.crisp ? 170 : 320),
        dustBurst(ctx.layer,
            at,
            {
                count: h.count ?? (h.crisp ? 80 : 170), color: h.sparks, speed: h.speed ?? [90,
                    430], angle: h.angle, gravity: h.gravity, drag: 2.2, flow: h.flow ?? (h.crisp ? 24 : 70),
                life: h.life ?? [220,
                    620], size: [5.5 * k,
                    1.5 * k], spread: 15 * k, additive: h.additive
            }),
        h.streaks ? dustBurst(ctx.layer,
            at,
            {
                count: h.streaks * 2, blade: true, color: h.sparks, speed: [280,
                    760], angle: h.angle, drag: 3, flow: 0, life: [110,
                    270], size: [shard,
                    shard * .24], spread: 8 * k, alpha: 1
            }) : undefined,
        h.smoke ? mist(ctx.layer,
            at,
            {
                color: h.smoke, size: 105 * k, count: 9, alpha: .42, gravity: h.smokeUp ? -70 : undefined, additive: false
            }) : undefined
    ])
}

/** Đuôi bụi mặc định của đạn */
const trailDust = (color: number[], k: number, o: Partial<DustOpts> = {
}): DustOpts => ({
    color, speed: [8,
        70], drag: 2, flow: 55, life: [220,
        560], size: [5.5 * k,
        1.5 * k], spread: 8 * k, ...o
})

interface Shot {
    ms: number;
    /** Độ cong quỹ đạo, px trước khi nhân tỉ lệ */
    bow: number;
    perSec: number;
    /** Biên độ lượn ngang đường bay, px trước khi nhân tỉ lệ */
    wave?: number;
    trail: (c: number, c2: number, k: number) => DustOpts;
    /** Quầng sáng mềm bám đầu đạn: [màu, đường kính trước khi nhân tỉ lệ] */
    glows?: (c: number, c2: number) => [number, number][];
    /** Hình đạn đặc quanh gốc, mũi hướng +x; không có thì đạn chỉ là quầng sáng và bụi */
    draw?: (g: Graphics, k: number, t: number, c: number, c2: number) => void;
    hit: (c: number, c2: number) => Hit;
    muzzle?: (ctx: VfxCtx, k: number) => void;
    /** Thêm khi chạm: dấu ấn riêng của tướng */
    contact?: (ctx: VfxCtx, at: Pt, k: number) => Promise<unknown>;
}

/** Đạn bay: đầu đạn tắt và báo chạm ngay khi tới, đuôi bụi tự tan */
async function shot(ctx: VfxCtx, o: Shot) {
    const k = kOf(ctx)
    const c = ctx.color, c2 = ctx.color2 ?? 0xffffff
    const land = beatOnce(ctx)
    o.muzzle?.(ctx,
        k)
    await Promise.all(points(ctx).map(async (to) => {
        const g = graphic(ctx)
        const dir = Math.atan2(to.y - ctx.from.y,
            to.x - ctx.from.x)
        const at = (u: number) => {
            const wave = Math.sin(u * TAU) * (o.wave ?? 0) * k
            return {
                x: lerp(ctx.from.x,
                    to.x,
                    u) - Math.sin(dir) * wave,
                y: lerp(ctx.from.y,
                    to.y,
                    u) + Math.cos(dir) * wave - Math.sin(u * Math.PI) * o.bow * k
            }
        }
        const glows = (o.glows?.(c,
            c2) ?? []).map(([color,
            size]) => makeSprite(ctx.layer,
            "glow",
            ctx.from.x,
            ctx.from.y,
            color,
            size * k))
        let p = {
            ...ctx.from
        }
        await Promise.all([
            dustStream(ctx.layer,
                () => p,
                o.ms,
                o.perSec,
                o.trail(c,
                    c2,
                    k)),
            tween(o.ms,
                (t) => {
                    p = at(t)
                    const a = at(Math.max(0,
                            t - .03)), b = at(Math.min(1,
                            t + .03))
                    for (const s of glows) s.position.set(p.x,
                        p.y)
                    g.clear()
                    g.position.set(p.x,
                        p.y)
                    g.rotation = Math.atan2(b.y - a.y,
                        b.x - a.x)
                    o.draw?.(g,
                        k,
                        t,
                        c,
                        c2)
                },
                ease.linear,
                ctx.layer).then(async () => {
                drop(g)
                glows.forEach(drop)
                land()
                if (ctx.layer.destroyed) return
                await Promise.all([impact(ctx,
                    to,
                    k,
                    o.hit(c,
                        c2)),
                o.contact?.(ctx,
                    to,
                    k)])
            })
        ])
    }))
}

/** Ashe: mũi tên băng, sương giá bám thân tên */
registerVfx("basicFrostArrow",
    (ctx) => shot(ctx,
        {
            ms: 360, bow: 0, perSec: 620,
            trail: (c, c2, k) => trailDust([c,
                c2,
                0xffffff],
            k),
            glows: (c) => [[c,
                92]],
            draw: (g, k, _t, c, c2) => {
                g.rect(-36 * k,
                    -2.5 * k,
                    50 * k,
                    5 * k).fill({
                    color: c2, alpha: 1
                })
                g.poly([26 * k,
                    0,
                    8 * k,
                    -9 * k,
                    12 * k,
                    0,
                    8 * k,
                    9 * k]).fill({
                    color: c, alpha: 1
                })
                g.poly([-30 * k,
                    0,
                    -42 * k,
                    -9 * k,
                    -36 * k,
                    0,
                    -42 * k,
                    9 * k]).fill({
                    color: c, alpha: 1
                })
            },
            hit: (c, c2) => ({
                sparks: [c,
                    c2,
                    0xffffff], smoke: [0xcfefff], streaks: 12
            })
        }))

/** Lux: cầu sáng không viền, bụi sáng vàng trắng xoáy quanh */
registerVfx("basicLightOrb",
    (ctx) => shot(ctx,
        {
            ms: 360, bow: 26, perSec: 780,
            trail: (c, c2, k) => trailDust([c,
                c2,
                0xfff8d0],
            k,
            {
                flow: 90, spread: 14 * k
            }),
            glows: (c, c2) => [[c,
                104],
            [c2,
                52]],
            hit: (c, c2) => ({
                sparks: [c,
                    c2,
                    0xffffff], glow: 0xfff4c0, flow: 120
            })
        }))

/** Annie: giọt lửa nhỏ, tàn lửa bay lên */
registerVfx("basicFlameBolt",
    (ctx) => shot(ctx,
        {
            ms: 340, bow: 34, perSec: 760,
            trail: (c, c2, k) => trailDust([c,
                c2,
                0xff4a1e],
            k,
            {
                gravity: -220
            }),
            glows: (c, c2) => [[0xff4a1e,
                84],
            [c2,
                38]],
            hit: (c, c2) => ({
                sparks: [c,
                    c2,
                    0xff4a1e], gravity: -240, smoke: [0x5a4a42], smokeUp: true
            })
        }))

/** Viktor: tia năng lượng tím lam, hạt điện văng hai bên */
registerVfx("basicHexBolt",
    (ctx) => shot(ctx,
        {
            ms: 280, bow: 0, perSec: 820,
            trail: (c, c2, k) => trailDust([c,
                c2],
            k,
            {
                speed: [40,
                    170], drag: 3
            }),
            glows: (c, c2) => [[c,
                76],
            [c2,
                40]],
            draw: (g, k, _t, _c, c2) => {
                g.poly([20 * k,
                    0,
                    -58 * k,
                    -3.5 * k,
                    -58 * k,
                    3.5 * k]).fill({
                    color: c2, alpha: .9
                })
            },
            hit: (c, c2) => ({
                sparks: [c,
                    c2,
                    0xffffff], streaks: 18, speed: [140,
                    520]
            })
        }))

/** Jinx: súng máy, loạt 7 viên, viên đầu chạm là ra kết quả */
registerVfx("basicMinigun",
    async (ctx) => {
        const k = kOf(ctx)
        const c = ctx.color, c2 = ctx.color2 ?? 0xffffff
        const land = beatOnce(ctx)
        await Promise.all(points(ctx).flatMap((to) => Array.from({
            length: 7
        },
        async (_, i) => {
            await sleep(i * 55)
            if (ctx.layer.destroyed) return
            const g = graphic(ctx)
            const a = {
                x: ctx.from.x + (i % 2 ? 1 : -1) * 9 * k, y: ctx.from.y
            }
            const b = {
                x: to.x + (i - 3) * 9 * k, y: to.y + (i % 3 - 1) * 14 * k
            }
            const angle = Math.atan2(b.y - a.y,
                b.x - a.x)
            void bloom(ctx.layer,
                a,
                c2,
                76 * k,
                120)
            void dustBurst(ctx.layer,
                a,
                {
                    count: 16, color: [c2,
                        0xffc060], speed: [40,
                        190], life: [120,
                        280], size: [4 * k,
                        1 * k], drag: 3
                })
            await tween(180,
                (t) => {
                    g.clear()
                    g.position.set(lerp(a.x,
                        b.x,
                        t),
                    lerp(a.y,
                        b.y,
                        t))
                    g.rotation = angle
                    g.poly([-46 * k,
                        0,
                        2 * k,
                        -3 * k,
                        8 * k,
                        0,
                        2 * k,
                        3 * k]).fill({
                        color: c, alpha: .9
                    })
                    g.roundRect(-8 * k,
                        -2.5 * k,
                        16 * k,
                        5 * k,
                        2 * k).fill({
                        color: c2, alpha: 1
                    })
                },
                ease.linear,
                ctx.layer)
            drop(g)
            land()
            if (ctx.layer.destroyed) return
            await Promise.all([
                bloom(ctx.layer,
                    b,
                    c,
                    96 * k,
                    160),
                dustBurst(ctx.layer,
                    b,
                    {
                        count: 34, color: [c,
                            c2,
                            0xffe08a], speed: [90,
                            330], drag: 2.4, life: [180,
                            420], size: [4.5 * k,
                            1.2 * k]
                    })
            ])
        })))
    })

/** Vayne: mũi nỏ bạc ngắn, chạm là ba đốm bụi bạc tụ lại như ba dấu Mũi Tên Bạc */
registerVfx("basicSilverBolt",
    (ctx) => shot(ctx,
        {
            ms: 270, bow: 0, perSec: 620,
            trail: (c, c2, k) => trailDust([c,
                c2,
                0xffffff],
            k,
            {
                spread: 5 * k
            }),
            glows: (_c, c2) => [[c2,
                72]],
            draw: (g, k, _t, c, c2) => {
                g.rect(-38 * k,
                    -3 * k,
                    48 * k,
                    6 * k).fill({
                    color: 0x4a4f78, alpha: 1
                })
                g.poly([30 * k,
                    0,
                    6 * k,
                    -11 * k,
                    12 * k,
                    0,
                    6 * k,
                    11 * k]).fill({
                    color: c2, alpha: 1
                })
                g.poly([-30 * k,
                    0,
                    -46 * k,
                    -11 * k,
                    -40 * k,
                    0,
                    -46 * k,
                    11 * k]).fill({
                    color: c, alpha: 1
                })
            },
            hit: (c, c2) => ({
                sparks: [c,
                    c2,
                    0xffffff], streaks: 14
            }),
            contact: (ctx, at, k) => Promise.all([0,
                1,
                2].map((i) => {
                const a = i / 3 * TAU - Math.PI / 2
                const r = 70 * k
                const pt = {
                    x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r
                }
                return Promise.all([
                    bloom(ctx.layer,
                        pt,
                        ctx.color2 ?? 0xffffff,
                        96 * k,
                        300),
                    dustBurst(ctx.layer,
                        pt,
                        {
                            count: 62, color: [ctx.color,
                                ctx.color2 ?? 0xffffff], speed: [60,
                                170], angle: [a + Math.PI - .7,
                                a + Math.PI + .7], drag: 1.8, flow: 40, life: [260,
                                560], size: [5 * k,
                                1.4 * k], spread: 8 * k
                        })
                ])
            }))
        }))

/** Tristana: đạn đại bác gang đen, khói đầu nòng, bay vồng */
registerVfx("basicCannonball",
    (ctx) => shot(ctx,
        {
            ms: 330, bow: 42, perSec: 640,
            muzzle: (c, k) => {
                void bloom(c.layer,
                    c.from,
                    c.color2 ?? 0xffffff,
                    190 * k,
                    200)
                void mist(c.layer,
                    c.from,
                    {
                        color: [0x6a6258,
                            0x9a8f80], size: 90 * k, count: 8, alpha: .5, gravity: -60, additive: false
                    })
            },
            trail: (c, c2, k) => trailDust([c,
                c2,
                0xff5a1e],
            k,
            {
                spread: 10 * k, gravity: -60
            }),
            glows: (c) => [[c,
                92]],
            draw: (g, k) => {
                g.circle(0,
                    0,
                    18 * k).fill({
                    color: 0x26282e, alpha: 1
                })
                g.circle(-5 * k,
                    -6 * k,
                    5.5 * k).fill({
                    color: 0x8f96a3, alpha: 1
                })
            },
            hit: (c, c2) => ({
                sparks: [c,
                    c2,
                    0xff5a1e], streaks: 16, smoke: [0x5a5248,
                    0x7c7265], smokeUp: true, count: 210
            }),
            contact: (ctx) => {
                ctx.shake(4,
                    120)
                return Promise.resolve()
            }
        }))

/** Trái tim tâm tại gốc, dùng làm đường rải bụi */
function heartPts(s: number): Pt[] {
    return Array.from({
        length: 30
    },
    (_, i) => {
        const a = i / 30 * TAU
        return {
            x: Math.sin(a) ** 3 * s, y: -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16 * s
        }
    })
}

/** Miss Fortune: hai khẩu súng nổ lệch nhịp, viên đầu chạm là ra kết quả, kèm trái tim bụi hồng */
registerVfx("basicTwinPistols",
    async (ctx) => {
        const k = kOf(ctx)
        const c = ctx.color, c2 = ctx.color2 ?? 0xffffff
        const land = beatOnce(ctx)
        await Promise.all(points(ctx).flatMap((to) => [-1,
            1].map(async (side, i) => {
            await sleep(i * 90)
            if (ctx.layer.destroyed) return
            const dir = Math.atan2(to.y - ctx.from.y,
                to.x - ctx.from.x)
            const nx = -Math.sin(dir), ny = Math.cos(dir)
            const a = {
                x: ctx.from.x + nx * side * 30 * k, y: ctx.from.y + ny * side * 30 * k
            }
            const b = {
                x: to.x + nx * side * 16 * k, y: to.y + ny * side * 16 * k
            }
            void bloom(ctx.layer,
                a,
                c2,
                120 * k,
                140)
            void dustBurst(ctx.layer,
                a,
                {
                    count: 30, color: [c2,
                        c], speed: [50,
                        220], angle: [dir - .5,
                        dir + .5], life: [120,
                        300], size: [4.5 * k,
                        1 * k], drag: 3
                })
            const g = graphic(ctx)
            g.rotation = dir
            let p = {
                ...a
            }
            const smoke = dustStream(ctx.layer,
                () => p,
                200,
                420,
                trailDust([c,
                    c2],
                k,
                {
                    spread: 3 * k, life: [130,
                        300]
                }))
            await tween(200,
                (t) => {
                    p = mix(a,
                        b,
                        t)
                    g.clear()
                    g.position.set(p.x,
                        p.y)
                    g.poly([-58 * k,
                        0,
                        4 * k,
                        -4 * k,
                        14 * k,
                        0,
                        4 * k,
                        4 * k]).fill({
                        color: c, alpha: .92
                    })
                    g.ellipse(2 * k,
                        0,
                        11 * k,
                        4.5 * k).fill({
                        color: c2, alpha: 1
                    })
                },
                ease.linear,
                ctx.layer)
            drop(g)
            land()
            if (ctx.layer.destroyed) return
            await Promise.all([
                smoke,
                impact(ctx,
                    b,
                    k,
                    {
                        sparks: [c,
                            c2,
                            0xff3f6c], count: 90, streaks: 8
                    }),
                ...(i ? [] : heartPts(56 * k).map((pt) => dustBurst(ctx.layer,
                    {
                        x: to.x + pt.x, y: to.y + pt.y - 14 * k
                    },
                    {
                        count: 13, color: [0xff3f6c,
                            0xff85a8,
                            0xffd0dc], speed: [2,
                            26], gravity: -46, drag: 1, flow: 10, life: [420,
                            820], size: [7 * k,
                            2 * k]
                    })))
            ])
        })))
    })

/** Teemo: phi tiêu thổi mảnh dài, giọt độc rơi dọc đường, sương độc tại chỗ */
registerVfx("basicBlowdart",
    (ctx) => shot(ctx,
        {
            ms: 230, bow: 8, perSec: 520,
            trail: (c, c2, k) => trailDust([c,
                c2],
            k,
            {
                gravity: 340, spread: 4 * k, size: [4.5 * k,
                    1.5 * k]
            }),
            draw: (g, k, _t, c, c2) => {
                g.poly([-34 * k,
                    -2 * k,
                    26 * k,
                    -2 * k,
                    26 * k,
                    2 * k,
                    -34 * k,
                    2 * k]).fill({
                    color: 0xf2e6c8, alpha: 1
                })
                g.poly([44 * k,
                    0,
                    22 * k,
                    -6 * k,
                    22 * k,
                    6 * k]).fill({
                    color: c, alpha: 1
                })
                g.poly([-26 * k,
                    0,
                    -52 * k,
                    -14 * k,
                    -46 * k,
                    0,
                    -52 * k,
                    14 * k]).fill({
                    color: 0x9b5de0, alpha: 1
                })
                g.circle(40 * k,
                    0,
                    3.5 * k).fill({
                    color: c2, alpha: 1
                })
            },
            hit: (c, c2) => ({
                sparks: [c,
                    c2,
                    0x5fa82a], count: 140, speed: [50,
                    260], gravity: -70, smoke: [c,
                    0x4f8a22], smokeUp: true
            })
        }))

/** Kog'Maw: bãi nước bọt axit bay vồng, rớt giọt, toé vũng */
registerVfx("basicAcidSpit",
    (ctx) => shot(ctx,
        {
            ms: 390, bow: 60, perSec: 760,
            trail: (c, c2, k) => trailDust([c,
                c2,
                0x6f9f22],
            k,
            {
                gravity: 520, spread: 12 * k, size: [7 * k,
                    1.8 * k]
            }),
            glows: (c) => [[c,
                96]],
            draw: (g, k, t, c, c2) => {
                const wob = Math.sin(t * 36)
                g.circle(-20 * k,
                    wob * 7 * k,
                    11 * k).fill({
                    color: 0x7fae2a, alpha: 1
                })
                g.ellipse(0,
                    0,
                    (21 + wob * 4) * k,
                    (16 - wob * 3) * k).fill({
                    color: c, alpha: 1
                })
                g.circle(14 * k,
                    -wob * 9 * k,
                    7 * k).fill({
                    color: c, alpha: 1
                })
                g.circle(4 * k,
                    -6 * k,
                    5.5 * k).fill({
                    color: c2, alpha: 1
                })
            },
            hit: (c, c2) => ({
                sparks: [c,
                    c2,
                    0x6f9f22], speed: [130,
                    400], angle: [-Math.PI * .97,
                    -Math.PI * .03], gravity: 820, count: 200, life: [340,
                    760], smoke: [c,
                    0x6f9f22]
            })
        }))

/** Brand: cầu lửa lớn dày đặc, lửa cuộn lên và khói đen, khác giọt lửa nhỏ của Annie */
registerVfx("basicBlazeBolt",
    (ctx) => shot(ctx,
        {
            ms: 370, bow: 12, perSec: 1100,
            trail: (c, c2, k) => trailDust([c,
                c2,
                0xc8260e],
            k,
            {
                speed: [20,
                    110], gravity: -300, spread: 19 * k, size: [8 * k,
                    1.5 * k], flow: 110
            }),
            glows: (c, c2) => [[0xc8260e,
                132],
            [c,
                92],
            [c2,
                46]],
            hit: (c, c2) => ({
                sparks: [c,
                    c2,
                    0xc8260e], gravity: -300, count: 240, flow: 130, smoke: [0x3a2a26,
                    0x5a3a2c], smokeUp: true
            })
        }))

/** Lissandra: mảnh băng tím lam, chạm là vỡ thành tia và sương băng */
registerVfx("basicIceClaw",
    (ctx) => shot(ctx,
        {
            ms: 340, bow: 18, perSec: 700,
            trail: (c, c2, k) => trailDust([c,
                c2,
                0x8aa6ff],
            k,
            {
                spread: 13 * k
            }),
            glows: () => [[0x5a7cff,
                96]],
            draw: (g, k, t, c, c2) => {
                const shard = (x: number, y: number, s: number, rot: number) => {
                    const pts = [34,
                        0,
                        8,
                        -11,
                        -4,
                        -5,
                        -24,
                        -8,
                        -14,
                        0,
                        -24,
                        9,
                        -2,
                        6,
                        8,
                        11].map(v => v * s * k)
                    const cos = Math.cos(rot), sin = Math.sin(rot)
                    g.poly(pts.flatMap((_, i) => i % 2 ? [] : [x * k + pts[i] * cos - pts[i + 1] * sin,
                        y * k + pts[i] * sin + pts[i + 1] * cos])).fill({
                        color: c, alpha: 1
                    })
                }
                for (let i = 0; i < 2; i++) {
                    const u = t * 9 + i * Math.PI
                    shard(-14 + Math.cos(u) * 12,
                        Math.sin(u) * 22,
                        .6,
                        .4 * Math.sin(u))
                }
                shard(6,
                    0,
                    1.05,
                    0)
                g.poly([24 * k,
                    0,
                    2 * k,
                    -4 * k,
                    -8 * k,
                    0,
                    2 * k,
                    4 * k]).fill({
                    color: c2, alpha: 1
                })
            },
            hit: (c, c2) => ({
                sparks: [c,
                    c2,
                    0xffffff], streaks: 26, speed: [160,
                    520], smoke: [0xbcd8ff,
                    0x8aa6ff]
            })
        }))

/** Ahri: cầu hồ ly lượn sóng, bụi hồng lam xoáy quanh */
registerVfx("basicFoxOrb",
    (ctx) => shot(ctx,
        {
            ms: 400, bow: 0, wave: 26, perSec: 860,
            trail: (c, c2, k) => trailDust([c,
                c2,
                0x7fc8ff],
            k,
            {
                flow: 120, spread: 15 * k
            }),
            glows: (c, c2) => [[0x4aa2ff,
                104],
            [c,
                70],
            [c2,
                34]],
            hit: (c, c2) => ({
                sparks: [c,
                    c2,
                    0x7fc8ff], flow: 190, speed: [60,
                    300], count: 210
            })
        }))

/** Vel'Koz: xung plasma tím dài, ba luồng bụi hút vào tâm như Phân Rã Hữu Cơ */
registerVfx("basicPlasmaBolt",
    (ctx) => shot(ctx,
        {
            ms: 300, bow: 0, perSec: 980,
            trail: (c, c2, k) => trailDust([c,
                c2,
                0xd63dff],
            k,
            {
                speed: [30,
                    160], drag: 3.2
            }),
            glows: (c, c2) => [[0xd63dff,
                112],
            [c,
                74],
            [c2,
                34]],
            draw: (g, k, _t, _c, c2) => {
                g.poly([26 * k,
                    0,
                    -66 * k,
                    -6 * k,
                    -66 * k,
                    6 * k]).fill({
                    color: c2, alpha: .85
                })
            },
            hit: (c, c2) => ({
                sparks: [c,
                    c2,
                    0xd63dff], streaks: 14
            }),
            contact: (ctx, at, k) => Promise.all([0,
                1,
                2].map((i) => {
                const a = i / 3 * TAU - Math.PI / 2
                const r = 118 * k
                return dustBurst(ctx.layer,
                    {
                        x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r
                    },
                    {
                        count: 76, color: [ctx.color,
                            0xd63dff,
                            ctx.color2 ?? 0xffffff], speed: [170 * k,
                            300 * k], angle: [a + Math.PI - .16,
                            a + Math.PI + .16], drag: 3, flow: 26, life: [220,
                            460], size: [5.5 * k,
                            1.4 * k], spread: 11 * k
                    })
            }))
        }))

/** Lá bài tâm tại gốc */
function drawCard(g: Graphics, w: number, h: number, face: number, trim: number) {
    g.roundRect(-w,
        -h,
        w * 2,
        h * 2,
        w * .2).fill({
        color: trim, alpha: 1
    })
    g.roundRect(-w * .78,
        -h * .84,
        w * 1.56,
        h * 1.68,
        w * .14).fill({
        color: face, alpha: 1
    })
    g.poly([0,
        -h * .55,
        w * .45,
        0,
        0,
        h * .55,
        -w * .45,
        0]).fill({
        color: trim, alpha: 1
    })
}

/** Twisted Fate: lá bài xoay ném, chạm là toé bụi vàng lam đỏ */
registerVfx("basicThrownCard",
    (ctx) => shot(ctx,
        {
            ms: 330, bow: 20, perSec: 640,
            trail: (c, c2, k) => trailDust([c,
                c2,
                0xffffff],
            k,
            {
                spread: 11 * k
            }),
            glows: (c) => [[c,
                92]],
            draw: (g, k, t, c) => {
                g.rotation = t * 24
                drawCard(g,
                    19 * k,
                    29 * k,
                    0x2a3f8f,
                    c)
            },
            hit: (c, c2) => ({
                sparks: [c,
                    c2,
                    0xe04050,
                    0xffffff], streaks: 12, flow: 110, count: 200
            })
        }))

/** Một vệt chém nhọn hai đầu, cong theo pháp tuyến, chỉ vẽ tới `head` (0..1) */
function slashPts(a: Pt, b: Pt, bow: number, w: number, head: number): number[] {
    const nx = -(b.y - a.y), ny = b.x - a.x
    const len = Math.hypot(nx,
        ny) || 1
    const px = nx / len, py = ny / len
    const reach = Math.max(.03,
        head)
    const side = (u: number, th: number) => {
        const lift = Math.sin(u / reach * Math.PI) * th + Math.sin(u * Math.PI) * bow
        return [lerp(a.x,
            b.x,
            u) + px * lift,
        lerp(a.y,
            b.y,
            u) + py * lift]
    }
    const top: number[] = [], low: number[] = []
    for (let i = 0; i <= 16; i++) {
        const u = i / 16 * reach
        top.push(...side(u,
            w / 2))
        low.unshift(...side(u,
            -w / 2))
    }
    return [...top,
        ...low]
}

interface Stroke {
    /** Góc nét, rad. Tương đối: 0 là ngang, -PI/2 là theo đòn. Tuyệt đối (abs): góc trên màn hình, PI/2 là bổ thẳng xuống */
    angle: number;
    abs?: boolean;
    /** Nửa chiều dài nét, px trước khi nhân tỉ lệ */
    len: number;
    /** Độ dày nét, px trước khi nhân tỉ lệ */
    w: number;
    /** Thời gian chém, 120 đến 220 ms */
    ms: number;
    delay?: number;
    bow?: number;
    /** Lệch vuông góc khỏi tâm mục tiêu, px trước khi nhân tỉ lệ */
    off?: number;
    /** Nét đi từ tâm ra ngoài thay vì cắt ngang qua tâm */
    spoke?: boolean;
    color?: number;
}

interface Melee {
    strokes: Stroke[];
    /** Màu mảnh lưỡi dọc nét */
    shards: (c: number, c2: number) => number[];
    /** Màu lõi vệt theo chất liệu; mặc định trắng sáng */
    core?: number;
    /** Độ dài mảnh lưỡi lúc đầu và lúc cuối, px trước khi nhân tỉ lệ */
    shard?: [number, number];
    hit: (c: number, c2: number) => Hit;
    contact?: (ctx: VfxCtx, at: Pt, k: number) => void;
}

/** Cận chiến: không vũ khí nào bay qua bàn, nhát đánh hiện ngay tại mục tiêu. Nét đi qua giữa là khung chạm */
async function melee(ctx: VfxCtx, o: Melee) {
    const k = kOf(ctx)
    const c = ctx.color, c2 = ctx.color2 ?? 0xffffff
    const land = beatOnce(ctx)
    await Promise.all(points(ctx).map(async (to) => {
        const dir = Math.atan2(to.y - ctx.from.y,
            to.x - ctx.from.x) || -Math.PI / 2
        let hit: Promise<unknown> = Promise.resolve()
        const touch = () => {
            land()
            o.contact?.(ctx,
                to,
                k)
            hit = Promise.resolve(impact(ctx,
                to,
                k,
                {
                    crisp: true, ...o.hit(c,
                        c2)
                }))
        }
        await Promise.all(o.strokes.map(async (s, i) => {
            if (s.delay) await sleep(s.delay)
            if (ctx.layer.destroyed) return
            const a = s.abs ? s.angle : s.angle + dir + Math.PI / 2
            const ux = Math.cos(a), uy = Math.sin(a)
            const nx = -uy, ny = ux
            const off = (s.off ?? 0) * k, len = s.len * k, bow = (s.bow ?? 0) * k
            const mid = {
                x: to.x + nx * off, y: to.y + ny * off
            }
            const p = s.spoke ? mid : {
                x: mid.x - ux * len, y: mid.y - uy * len
            }
            const q = {
                x: mid.x + ux * len, y: mid.y + uy * len
            }
            const along = (u: number) => {
                const lift = Math.sin(u * Math.PI) * bow
                return {
                    x: lerp(p.x,
                        q.x,
                        u) + nx * lift, y: lerp(p.y,
                        q.y,
                        u) + ny * lift
                }
            }
            const [s0,
                s1] = o.shard ?? [40,
                12]
            let edge = along(0)
            let touched = i > 0
            const color = s.color ?? c
            await Promise.all([
                dustStream(ctx.layer,
                    () => edge,
                    s.ms,
                    2400,
                    {
                        blade: true, color: s.color ? [s.color,
                            c2] : o.shards(c,
                            c2), speed: [240,
                            640], angle: [a - .2,
                            a + .2], drag: 3, flow: 0,
                        life: [90,
                            210], size: [s0 * k,
                            s1 * k], spread: Math.max(4,
                            s.w * .4) * k, alpha: 1
                    }),
                decal(ctx,
                    s.ms + 80,
                    (g, t) => {
                        const run = t * (s.ms + 80) / s.ms
                        const head = ease.out(Math.min(1,
                            run))
                        const fade = run <= 1 ? 1 : 1 - (run - 1) * s.ms / 80
                        edge = along(head)
                        if (!touched && head >= .5) {
                            touched = true
                            touch()
                        }
                        g.poly(slashPts(p,
                            q,
                            bow,
                            s.w * k,
                            head)).fill({
                            color, alpha: fade
                        })
                        g.poly(slashPts(p,
                            q,
                            bow,
                            s.w * .34 * k,
                            head)).fill({
                            color: o.core ?? 0xffffff, alpha: fade
                        })
                    })
            ])
        }))
        await hit
    }))
    land()
}

/** Garen: quét vòng ngang rộng như xoay người */
registerVfx("basicSwordSwing",
    (ctx) => melee(ctx,
        {
            strokes: [
                {
                    angle: 0, abs: true, len: 116, w: 9, ms: 200, bow: 44
                },
                {
                    angle: Math.PI, abs: true, len: 116, w: 9, ms: 190, delay: 90, bow: 44
                }
            ],
            shards: (c, c2) => [c,
                c2,
                0xffffff],
            hit: (c, c2) => ({
                sparks: [c,
                    c2,
                    0xffffff], streaks: 16, angle: [-.5,
                    .5]
            })
        }))

/** Leona: một nhát thẳng hất lên, mảnh nắng toả tròn */
registerVfx("basicSunBlade",
    (ctx) => melee(ctx,
        {
            strokes: [{
                angle: -Math.PI / 2, abs: true, len: 104, w: 11, ms: 170
            }],
            shards: (c, c2) => [c,
                c2,
                0xffb040],
            hit: (c, c2) => ({
                sparks: [c,
                    c2,
                    0xffffff,
                    0xffb040], streaks: 34, glow: 0xfff0b0, shard: 52
            })
        }))

/** Darius: một nhát bổ thẳng xuống, dày nhất nhóm kiếm, rất nhanh */
registerVfx("basicAxeChop",
    (ctx) => melee(ctx,
        {
            strokes: [{
                angle: Math.PI / 2, abs: true, len: 110, w: 20, ms: 130
            }],
            shards: (c, c2) => [c,
                c2,
                0xff4040],
            shard: [56,
                16],
            hit: (c, c2) => ({
                sparks: [c,
                    c2,
                    0xff4040], streaks: 24, angle: [.3,
                    Math.PI - .3], shard: 54, gravity: 500
            }),
            contact: (ctx) => ctx.shake(6,
                150)
        }))

/** Ornn: nhát nện đứng rộng nhất, tàn lửa bắn quạt lên */
registerVfx("basicForgeHammer",
    (ctx) => melee(ctx,
        {
            strokes: [{
                angle: Math.PI / 2, abs: true, len: 92, w: 26, ms: 150
            }],
            shards: (c, c2) => [c,
                c2,
                0xff7a2a],
            hit: (c, c2) => ({
                sparks: [c,
                    c2,
                    0xff7a2a,
                    0xffd070], streaks: 30, angle: [-Math.PI * .95,
                    -Math.PI * .05], shard: 46, gravity: 560
            }),
            contact: (ctx) => ctx.shake(7,
                180)
        }))

/** Aatrox: cung xả chéo lớn, máu rơi */
registerVfx("basicDarkinCleave",
    (ctx) => melee(ctx,
        {
            strokes: [{
                angle: .95, abs: true, len: 130, w: 17, ms: 200, bow: 32
            }],
            shards: (c) => [c,
                0xff3a50,
                0x7a0c1e],
            shard: [50,
                14],
            hit: (c) => ({
                sparks: [c,
                    0xff3a50,
                    0x7a0c1e], streaks: 20, gravity: 760, additive: false
            }),
            contact: (ctx) => ctx.shake(6,
                160)
        }))

/** Yorick: hai vạch song song ngắn như lưỡi xẻng bổ xuống, đất văng, hồn bay lên */
registerVfx("basicGraveShovel",
    (ctx) => melee(ctx,
        {
            strokes: [
                {
                    angle: Math.PI / 2, abs: true, len: 74, w: 9, ms: 150, off: -13, bow: 10
                },
                {
                    angle: Math.PI / 2, abs: true, len: 74, w: 9, ms: 150, off: 13, bow: -10
                }
            ],
            core: 0xbff0d8,
            shards: (c, c2) => [c,
                c2],
            hit: (c, c2) => ({
                sparks: [c,
                    c2,
                    0x40d090], gravity: -120, flow: 70, life: [380,
                    760], speed: [50,
                    230], streaks: 10
            }),
            contact: (ctx, at, k) => {
                ctx.shake(4,
                    130)
                void dustBurst(ctx.layer,
                    at,
                    {
                        count: 70, color: [0x7a5e40,
                            0x4a3524], speed: [130,
                            360], angle: [-Math.PI * .9,
                            -Math.PI * .1], gravity: 800, drag: 1, life: [300,
                            560], size: [7 * k,
                            2 * k], additive: false
                    })
            }
        }))

/** Gangplank: một cung nhỏ hất chéo lên, tàn lửa Thử Lửa */
registerVfx("basicCutlass",
    (ctx) => melee(ctx,
        {
            strokes: [{
                angle: -.7, abs: true, len: 94, w: 8, ms: 130, bow: -28
            }],
            shards: (c, c2) => [c,
                c2,
                0xff7a2a],
            shard: [34,
                10],
            hit: (c, c2) => ({
                sparks: [c,
                    c2,
                    0xff7a2a], gravity: -180, flow: 60, life: [300,
                    700], streaks: 14
            })
        }))

/** Malphite: sáu vết nứt ngắn toả từ tâm, đá văng rơi */
registerVfx("basicRockFist",
    (ctx) => melee(ctx,
        {
            strokes: Array.from({
                length: 6
            },
            (_, i) => ({
                angle: i / 6 * TAU + .3, abs: true, len: 96, w: 11, ms: 130, spoke: true
            })),
            core: 0xddccb1,
            shards: (c, c2) => [c,
                c2,
                0x8a7a64],
            shard: [30,
                12],
            hit: (c, c2) => ({
                sparks: [c,
                    c2,
                    0x8a7a64], gravity: 620, count: 120, speed: [200,
                    500], additive: false, streaks: 16
            }),
            contact: (ctx) => ctx.shake(6,
                170)
        }))

/** Blitzcrank: một cú đấm thẳng theo đòn, mảnh điện toả, phụt hơi nước */
registerVfx("basicSteamFist",
    (ctx) => melee(ctx,
        {
            strokes: [{
                angle: -Math.PI / 2, len: 92, w: 15, ms: 120
            }],
            shards: (c, c2) => [c2,
                c,
                0xffffff],
            hit: (c, c2) => ({
                sparks: [c2,
                    0xffffff,
                    c], streaks: 30, shard: 44, speed: [140,
                    520], smoke: [0xd8dde2], smokeUp: true
            }),
            contact: (ctx) => ctx.shake(5,
                150)
        }))

/** Braum: vạch ngang rộng vuông góc đòn, băng vụn toả */
registerVfx("basicShieldBash",
    (ctx) => melee(ctx,
        {
            strokes: [{
                angle: 0, len: 122, w: 18, ms: 140
            }],
            shards: (c, c2) => [c,
                c2,
                0xffffff],
            shard: [36,
                12],
            hit: (c, c2) => ({
                sparks: [c,
                    c2,
                    0xffffff], streaks: 30, shard: 40
            }),
            contact: (ctx) => ctx.shake(6,
                170)
        }))

/** Katarina: bốn vạch rất mảnh đan chéo liên tiếp */
registerVfx("basicDaggerFlurry",
    (ctx) => melee(ctx,
        {
            strokes: [
                {
                    angle: .85, len: 80, w: 5, ms: 120
                },
                {
                    angle: -.85, len: 80, w: 5, ms: 120, delay: 60
                },
                {
                    angle: .25, len: 70, w: 5, ms: 120, delay: 120, off: 18
                },
                {
                    angle: -.25, len: 70, w: 5, ms: 120, delay: 180, off: -18
                }
            ],
            shards: (c, c2) => [c,
                c2,
                0xff5a7a],
            shard: [24,
                8],
            hit: (c, c2) => ({
                sparks: [c,
                    c2,
                    0xff5a7a], streaks: 16, shard: 26
            })
        }))

/** Kha'Zix: ba vết cào cong song song */
registerVfx("basicVoidClaw",
    (ctx) => melee(ctx,
        {
            strokes: [-32,
                0,
                32].map((off, i) => ({
                angle: Math.PI / 2 + .22, abs: true, len: 88, w: 8, ms: 130, delay: i * 24, off, bow: 18
            })),
            shards: (c, c2) => [c,
                c2,
                0x6a20c0],
            shard: [34,
                10],
            hit: (c, c2) => ({
                sparks: [c,
                    c2,
                    0x6a20c0], streaks: 14, smoke: [0x2a1040,
                    0x4a2070]
            })
        }))

/** Zed: hai lưỡi rạch chữ X cực nhanh, khói đen */
registerVfx("basicShadowBlades",
    (ctx) => melee(ctx,
        {
            strokes: [
                {
                    angle: .78, len: 100, w: 6, ms: 120
                },
                {
                    angle: -.78, len: 100, w: 6, ms: 120, delay: 55
                }
            ],
            shards: (c, c2) => [c,
                c2,
                0xff5a6a],
            shard: [44,
                8],
            hit: (c, c2) => ({
                sparks: [c,
                    c2,
                    0xff5a6a], streaks: 18, smoke: [0x100c16,
                    0x2a2230]
            })
        }))

/** Qiyana: ba cung tam giác ba màu nguyên tố */
registerVfx("basicElementRing",
    (ctx) => melee(ctx,
        {
            strokes: [
                {
                    angle: 0, len: 96, w: 8, ms: 150, bow: 36, color: 0xe0a040
                },
                {
                    angle: TAU / 3, len: 96, w: 8, ms: 150, bow: 36, delay: 70, color: 0x40c8d8
                },
                {
                    angle: -TAU / 3, len: 96, w: 8, ms: 150, bow: 36, delay: 140, color: 0x6ad050
                }
            ],
            shards: () => [0xe0a040,
                0x40c8d8,
                0x6ad050],
            hit: (_c, c2) => ({
                sparks: [0xe0a040,
                    0x40c8d8,
                    0x6ad050,
                    c2], streaks: 18, flow: 90
            })
        }))
