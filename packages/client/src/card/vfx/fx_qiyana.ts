// VFX riêng của Qiyana, bám LoL: lưỡi Ixtal vàng chém ngay tại mục tiêu rồi nguyên tố nổ ra. Bảng màu lấy từ icon chiêu gốc: Đất cam đỏ đá nung, Nước xanh sông, Cỏ xanh lá; lưỡi và gió chiêu cuối luôn vàng.
// Vật liệu là thật: đá tảng và lá cây vẽ sẵn bay theo quỹ đạo, nước là hàng nghìn tia. Không có nét vẽ hay vòng tròn hình học.
// Nguyên tố truyền qua ctx.amount (QIYANA_ELEMENT); không có thì là Đất, riêng đòn thường không có thì trung tính vàng. Trúng là báo ctx.onBeat, không chờ đuôi hạt tan; mọi thứ tự dọn khi layer bị huỷ.
import {
    Sprite, Texture, type Container
} from "pixi.js"
import {
    bloom, dustBurst, dustStream, mist
} from "./fx_dust"
import {
    ease, lerp, pick, rand, sleep, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const TAU = Math.PI * 2
const UP = -Math.PI / 2
/** Nguyên tố: mã số gửi qua ctx.amount */
export const QIYANA_ELEMENT = {
    earth: 0, water: 1, grass: 2
} as const
/** Thời gian lướt E, cũng là thời gian hai lá đổi chỗ */
export const QIYANA_DANCE_MS = 420

type Element = "earth" | "water" | "grass"
const ELEMENTS: Element[] = ["earth",
    "water",
    "grass"]
const elementOf = (ctx: VfxCtx): Element => ELEMENTS[ctx.amount ?? QIYANA_ELEMENT.earth] ?? "earth"

const GOLD = 0xffcf6a
const WHITE_GOLD = 0xfff2c8

interface Tone { main: number; light: number; dust: number[]; haze: number[] }
const TONES: Record<Element, Tone> = {
    earth: {
        main: 0xf0621e, light: 0xffc060, dust: [0xf0621e,
            0xff8a30,
            0xffc060,
            0xd8401a], haze: [0x6a3a1c,
            0x8a5428,
            0x4a2a16]
    },
    water: {
        main: 0x1f8cff, light: 0xa8ecff, dust: [0x1f8cff,
            0x38c0ff,
            0xa8ecff,
            0xffffff], haze: [0x2a90e8,
            0x70c8ff,
            0x1868c8]
    },
    grass: {
        main: 0x2fd24a, light: 0xcfff80, dust: [0x1fa83a,
            0x2fd24a,
            0x8aee4a,
            0xcfff80], haze: [0x1c8a38,
            0x46c048,
            0x0f6a2a]
    }
}

const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
const pointsOf = (ctx: VfxCtx): Pt[] => (ctx.to.length ? ctx.to : [ctx.from])
const beatOnce = (ctx: VfxCtx) => {
    let done = false
    return () => {
        if (done) return
        done = true
        ctx.onBeat?.()
    }
}

/** Đá vỡ: đa giác méo, có mặt sáng mặt tối và viền nung */
function rockTexture(): Texture {
    const S = 48
    const c = document.createElement("canvas")
    c.width = S
    c.height = S
    const g = c.getContext("2d")
    if (g) {
        const n = 7
        const pts = Array.from({
            length: n
        },
        (_, i) => {
            const a = i / n * TAU + rand(-.22,
                .22)
            const r = S * rand(.3,
                .47)
            return {
                x: S / 2 + Math.cos(a) * r, y: S / 2 + Math.sin(a) * r
            }
        })
        const trace = () => {
            g.beginPath()
            pts.forEach((p, i) => (i ? g.lineTo(p.x,
                p.y) : g.moveTo(p.x,
                p.y)))
            g.closePath()
        }
        const grad = g.createLinearGradient(0,
            0,
            S,
            S)
        grad.addColorStop(0,
            "#d09458")
        grad.addColorStop(.5,
            "#8a4f28")
        grad.addColorStop(1,
            "#3e2214")
        trace()
        g.fillStyle = grad
        g.fill()
        g.strokeStyle = "rgba(255,120,40,.85)"
        g.lineWidth = 2
        g.stroke()
        // một mặt vỡ sáng hơn để đá có khối
        g.fillStyle = "rgba(255,214,160,.32)"
        g.beginPath()
        g.moveTo(pts[0].x,
            pts[0].y)
        g.lineTo(pts[1].x,
            pts[1].y)
        g.lineTo(S / 2,
            S / 2)
        g.closePath()
        g.fill()
    }
    return Texture.from(c)
}

/** Lá cây: phiến cong, gân giữa sáng */
function leafTexture(dark: string, light: string): Texture {
    const W = 48, H = 24
    const c = document.createElement("canvas")
    c.width = W
    c.height = H
    const g = c.getContext("2d")
    if (g) {
        const grad = g.createLinearGradient(0,
            0,
            W,
            H)
        grad.addColorStop(0,
            light)
        grad.addColorStop(1,
            dark)
        g.fillStyle = grad
        g.beginPath()
        g.moveTo(1,
            H / 2)
        g.quadraticCurveTo(W * .42,
            -H * .32,
            W - 1,
            H / 2)
        g.quadraticCurveTo(W * .42,
            H * 1.32,
            1,
            H / 2)
        g.fill()
        g.strokeStyle = "rgba(235,255,190,.75)"
        g.lineWidth = 1.4
        g.beginPath()
        g.moveTo(3,
            H / 2)
        g.lineTo(W - 4,
            H / 2)
        g.stroke()
    }
    return Texture.from(c)
}

let rocks: Texture[] | undefined
let leaves: Texture[] | undefined
const rockTex = () => pick(rocks ??= [rockTexture(),
    rockTexture(),
    rockTexture(),
    rockTexture()])
const leafTex = () => pick(leaves ??= [leafTexture("#0c6a2a",
    "#58e04a"),
leafTexture("#147a30",
    "#a6f25a"),
leafTexture("#0a5a24",
    "#2fd24a")])

interface DebrisOpts {
    tex: () => Texture;
    count: number;
    speed: [number, number];
    angle?: [number, number];
    gravity: number;
    drag?: number;
    /** Bề rộng mảnh (px) */
    size: [number, number];
    life: number;
    spread?: number;
    /** Lá chao lượn sang hai bên (px) */
    flutter?: number;
}

/** Mảnh vật liệu thật: sprite bay theo quỹ đạo tính sẵn, quay, tan ở cuối đời */
function debris(layer: Container, pt: Pt, o: DebrisOpts): Promise<void> {
    if (layer.destroyed) return Promise.resolve()
    const [a0,
        a1] = o.angle ?? [0,
        TAU]
    const drag = o.drag ?? 1.1
    const pieces = Array.from({
        length: Math.round(o.count)
    },
    () => {
        const s = new Sprite(o.tex())
        s.anchor.set(.5)
        const w = rand(o.size[0],
            o.size[1])
        s.scale.set(w / s.texture.width)
        s.rotation = rand(0,
            TAU)
        s.alpha = 0
        layer.addChild(s)
        const r = Math.sqrt(Math.random()) * (o.spread ?? 0)
        const pa = rand(0,
            TAU)
        const a = rand(a0,
            a1)
        const v = rand(o.speed[0],
            o.speed[1])
        return {
            s, x: pt.x + Math.cos(pa) * r, y: pt.y + Math.sin(pa) * r, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
            spin: rand(-9,
                9), phase: rand(0,
                TAU), end: rand(.6,
                1)
        }
    })
    return tween(o.life,
        (t) => {
            const sec = t * o.life / 1000
            const slow = (1 - Math.exp(-drag * sec)) / drag
            for (const m of pieces) {
                if (m.s.destroyed) continue
                const u = t / m.end
                if (u >= 1) { m.s.visible = false; continue }
                m.s.x = m.x + m.vx * slow + Math.sin(sec * 6 + m.phase) * (o.flutter ?? 0)
                m.s.y = m.y + m.vy * slow + o.gravity * sec * sec / 2
                m.s.rotation += m.spin * .016
                m.s.alpha = Math.min(1,
                    u * 14) * Math.min(1,
                    (1 - u) * 3.5)
            }
        },
        ease.linear,
        layer).then(() => {
        for (const m of pieces) if (!m.s.destroyed) m.s.destroy()
    })
}

/** Cú nổ nguyên tố: gọi ở mọi đòn trúng, k càng lớn càng dữ */
function elementBlast(ctx: VfxCtx, at: Pt, el: Element, k: number): Promise<unknown> {
    const { layer } = ctx
    const t = TONES[el]
    const jobs: Promise<unknown>[] = [
        bloom(layer,
            at,
            t.main,
            340 * k,
            460),
        bloom(layer,
            at,
            t.light,
            170 * k,
            300)
    ]
    if (el === "earth") {
        ctx.shake(7 * k,
            240)
        jobs.push(
            debris(layer,
                at,
                {
                    tex: rockTex, count: 24 * k, speed: [280,
                        820], angle: [UP - 1.7,
                        UP + 1.7], gravity: 1500, size: [13,
                        36], life: 860, spread: 26 * k
                }),
            dustBurst(layer,
                at,
                {
                    count: 380 * k, color: t.dust, speed: [220,
                        860], gravity: 760, streak: 4, size: [6,
                        2], life: [260,
                        660], flow: 40, drag: 1.2, spread: 26 * k
                }),
            mist(layer,
                at,
                {
                    color: t.haze, size: 150 * k, count: 12, alpha: .4, additive: false, life: [520,
                        1000]
                })
        )
    } else if (el === "water") {
        ctx.shake(5 * k,
            200)
        jobs.push(
            dustBurst(layer,
                at,
                {
                    count: 560 * k, color: t.dust, speed: [340,
                        1020], angle: [UP - .6,
                        UP + .6], gravity: 1300, streak: 5, size: [7,
                        2.5], life: [360,
                        800], flow: 24, drag: .6, spread: 34 * k, additive: false, alpha: 1
                }),
            dustBurst(layer,
                at,
                {
                    count: 340 * k, color: t.dust, speed: [150,
                        560], gravity: 620, streak: 3, size: [6,
                        2], life: [280,
                        640], flow: 40, drag: 1.4, spread: 20 * k
                }),
            mist(layer,
                at,
                {
                    color: t.haze, size: 170 * k, count: 12, alpha: .55, life: [460,
                        900]
                })
        )
    } else {
        ctx.shake(4 * k,
            180)
        jobs.push(
            debris(layer,
                at,
                {
                    tex: leafTex, count: 42 * k, speed: [220,
                        680], gravity: 240, drag: 2.3, size: [18,
                        34], life: 1120, spread: 24 * k, flutter: 18
                }),
            dustBurst(layer,
                at,
                {
                    count: 340 * k, color: t.dust, speed: [120,
                        560], streak: 3, size: [6,
                        2], life: [300,
                        720], flow: 90, drag: 1.5, spread: 24 * k
                }),
            mist(layer,
                at,
                {
                    color: t.haze, size: 170 * k, count: 11, alpha: .5, life: [480,
                        940]
                })
        )
    }
    return Promise.all(jobs)
}

/** Một nhát lưỡi Ixtal ngay trên mục tiêu: vệt mảnh vàng cắt chéo, thấm màu nguyên tố */
function cut(ctx: VfxCtx, to: Pt, k: number, colors: number[], angle: number, beat: () => void) {
    const len = 118 * k
    const ux = Math.cos(angle), uy = Math.sin(angle)
    let p: Pt = {
        x: to.x - ux * len, y: to.y - uy * len
    }
    const shape = {
        speed: [60,
            260] as [number, number], angle: [angle - .22,
                angle + .22] as [number, number], flow: 16, drag: 2.6
    }
    return Promise.all([
        dustStream(ctx.layer,
            () => p,
            170,
            1700,
            {
                ...shape, blade: true, color: [GOLD,
                    WHITE_GOLD,
                    0xffffff], size: [50 * k,
                    12], life: [170,
                    380], alpha: 1, spread: 7
            }),
        dustStream(ctx.layer,
            () => p,
            170,
            2200,
            {
                ...shape, streak: 5, color: colors, size: [7,
                    2], life: [220,
                    520], alpha: 1, spread: 16
            }),
        tween(170,
            (t) => {
                p = {
                    x: to.x + ux * len * (2 * t - 1), y: to.y + uy * len * (2 * t - 1)
                }
                if (t >= .62) beat()
            },
            ease.linear,
            ctx.layer)
    ])
}

const CUT_ANGLE = .62

/** Mở Q: lưỡi vàng rút ra, vật liệu nguyên tố cuộn quanh lưỡi */
registerVfx("qiyanaDraw",
    async (ctx) => {
        const el = elementOf(ctx)
        const t = TONES[el]
        void bloom(ctx.layer,
            ctx.from,
            t.main,
            210,
            380)
        void dustBurst(ctx.layer,
            ctx.from,
            {
                count: 150, blade: true, color: [GOLD,
                    WHITE_GOLD], size: [30,
                    8], speed: [90,
                    320], drag: 3, life: [200,
                    420], flow: 30, spread: 26
            })
        void dustBurst(ctx.layer,
            ctx.from,
            {
                count: 240, color: t.dust, speed: [40,
                    240], angle: [UP - .9,
                    UP + .9], streak: 3, size: [6,
                    2], life: [240,
                    520], flow: 70, spread: 46
            })
        await sleep(240)
        ctx.onBeat?.()
    })

/** Q: không bay đạn, lưỡi chém thẳng tại mục tiêu */
registerVfx("qiyanaBlade",
    async (ctx) => {
        const beat = beatOnce(ctx)
        const t = TONES[elementOf(ctx)]
        await Promise.all(pointsOf(ctx).map(to => cut(ctx,
            to,
            kOf(ctx),
            t.dust,
            CUT_ANGLE,
            beat)))
        beat()
    })

/** Q trúng: nguyên tố nổ ngay chỗ lưỡi chém */
registerVfx("qiyanaWrathHit",
    async (ctx) => {
        await Promise.all(pointsOf(ctx).map(at => elementBlast(ctx,
            at,
            elementOf(ctx),
            kOf(ctx))))
    })

/** Tàng Hình: lá và sương xanh cuốn quanh tướng rồi che đi */
registerVfx("qiyanaVeil",
    async (ctx) => {
        const t = TONES.grass
        await Promise.all(pointsOf(ctx).flatMap(at => [
            debris(ctx.layer,
                at,
                {
                    tex: leafTex, count: 26, speed: [120,
                        360], gravity: -60, drag: 1.8, size: [16,
                        30], life: 1000, spread: 62, flutter: 24
                }),
            dustBurst(ctx.layer,
                at,
                {
                    count: 240, color: t.dust, speed: [30,
                        190], streak: 3, size: [6,
                        2], life: [420,
                        900], flow: 120, spread: 66
                }),
            mist(ctx.layer,
                at,
                {
                    color: t.haze, size: 190, count: 12, alpha: .56, life: [620,
                        1100]
                })
        ]))
    })

/** Mở E: đạp bật đất, bụi và mảnh vàng tung ở chỗ xuất phát */
registerVfx("qiyanaDanceCast",
    async (ctx) => {
        const t = TONES[elementOf(ctx)]
        await Promise.all([
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 300, color: t.dust, speed: [100,
                        440], streak: 3, size: [6,
                        2], life: [260,
                        560], flow: 60, spread: 40
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 90, blade: true, color: [GOLD,
                        WHITE_GOLD], size: [26,
                        8], speed: [120,
                        380], drag: 2.6, life: [200,
                        400], spread: 22
                })
        ])
    })

/** E lướt: vệt vàng và vật liệu nguyên tố kéo theo Qiyana, tới nơi báo ctx.onBeat */
registerVfx("qiyanaDanceTrail",
    async (ctx) => {
        const t = TONES[elementOf(ctx)]
        const to = ctx.to[0] ?? ctx.from
        let p = ctx.from
        const lift = -48
        await Promise.all([
            dustStream(ctx.layer,
                () => p,
                QIYANA_DANCE_MS,
                1500,
                {
                    color: t.dust, speed: [20,
                        130], streak: 3, size: [8,
                        2], life: [300,
                        640], flow: 60, spread: 44
                }),
            dustStream(ctx.layer,
                () => p,
                QIYANA_DANCE_MS,
                520,
                {
                    blade: true, color: [GOLD,
                        WHITE_GOLD], size: [40,
                        10], speed: [10,
                        70], life: [200,
                        420], spread: 34
                }),
            tween(QIYANA_DANCE_MS,
                (u) => {
                    p = {
                        x: lerp(ctx.from.x,
                            to.x,
                            u), y: lerp(ctx.from.y,
                            to.y,
                            u) + Math.sin(u * Math.PI) * lift
                    }
                },
                ease.inOut,
                ctx.layer).then(() => ctx.onBeat?.())
        ])
    })

/** E trúng: nhát chém ngang tại mục tiêu, chạm là nguyên tố nổ */
registerVfx("qiyanaDanceHit",
    async (ctx) => {
        const el = elementOf(ctx)
        const k = kOf(ctx)
        const beat = beatOnce(ctx)
        const jobs: Promise<unknown>[] = []
        const land = () => {
            beat()
            for (const at of pointsOf(ctx)) jobs.push(elementBlast(ctx,
                at,
                el,
                k))
        }
        let once = false
        await Promise.all(pointsOf(ctx).map(to => cut(ctx,
            to,
            k * 1.1,
            TONES[el].dust,
            -CUT_ANGLE,
            () => {
                if (once) return
                once = true
                land()
            })))
        await Promise.all(jobs)
    })

/** Mở R: gió vàng xoáy về lưỡi, ba màu nguyên tố trong icon thu thành màu đang giữ */
registerVfx("qiyanaSupremeCast",
    async (ctx) => {
        const t = TONES[elementOf(ctx)]
        const at = ctx.from
        ctx.shake(3,
            300)
        void bloom(ctx.layer,
            at,
            t.main,
            380,
            520)
        void bloom(ctx.layer,
            at,
            GOLD,
            240,
            420)
        // gió bốc thẳng từ dưới chân lên lưỡi, không quay thành vòng
        void dustStream(ctx.layer,
            () => ({
                x: at.x + rand(-74,
                    74), y: at.y + rand(10,
                    86)
            }),
            340,
            2100,
            {
                color: [GOLD,
                    WHITE_GOLD,
                    0xffa93a], streak: 6, size: [8,
                    2], speed: [240,
                    620], angle: [UP - .3,
                    UP + .3], life: [240,
                    480], flow: 110, alpha: 1
            })
        void dustStream(ctx.layer,
            () => ({
                x: at.x + rand(-58,
                    58), y: at.y + rand(0,
                    70)
            }),
            340,
            1500,
            {
                color: t.dust, streak: 4, size: [8,
                    2], speed: [160,
                    460], angle: [UP - .42,
                    UP + .42], life: [260,
                    500], flow: 130, alpha: 1
            })
        await sleep(340)
        ctx.onBeat?.()
    })

/** R bay: luồng gió vàng dạng quạt phủ 3 đường, kéo vật liệu nguyên tố, chạm hàng địch là báo ctx.onBeat */
registerVfx("qiyanaSupremeWave",
    async (ctx) => {
        const el = elementOf(ctx)
        const t = TONES[el]
        const MS = 360
        const lanes = pointsOf(ctx)
        await Promise.all([...lanes.flatMap((to) => {
            let p = ctx.from
            const follow = () => p
            return [
                dustStream(ctx.layer,
                    follow,
                    MS,
                    2300,
                    {
                        color: [GOLD,
                            WHITE_GOLD,
                            0xffa93a], streak: 6, size: [9,
                            2.5], speed: [120,
                            340], angle: [Math.atan2(to.y - ctx.from.y,
                            to.x - ctx.from.x) - .28,
                        Math.atan2(to.y - ctx.from.y,
                            to.x - ctx.from.x) + .28], life: [260,
                            560], flow: 50, spread: 56, alpha: 1
                    }),
                dustStream(ctx.layer,
                    follow,
                    MS,
                    1500,
                    {
                        color: t.dust, streak: 4, size: [8,
                            2], speed: [20,
                            170], life: [300,
                            640], flow: 80, spread: 70, alpha: 1, additive: el !== "water"
                    }),
                tween(MS,
                    (u) => {
                        p = {
                            x: lerp(ctx.from.x,
                                to.x,
                                u), y: lerp(ctx.from.y,
                                to.y,
                                u)
                        }
                    },
                    ease.in,
                    ctx.layer)
            ]
        }),
        sleep(MS).then(() => ctx.onBeat?.())])
    })

/** R trúng: vàng dội ra cộng nguyên tố phun tại mục tiêu; đối diện gọi với intensity cao hơn nên nổ to nhất */
registerVfx("qiyanaSupremeHit",
    async (ctx) => {
        const el = elementOf(ctx)
        const k = kOf(ctx)
        await Promise.all(pointsOf(ctx).flatMap(at => [
            elementBlast(ctx,
                at,
                el,
                k),
            dustBurst(ctx.layer,
                at,
                {
                    count: 220 * k, blade: true, color: [GOLD,
                        WHITE_GOLD,
                        0xffffff], size: [34 * k,
                        9], speed: [220,
                        720], drag: 2.4, life: [220,
                        520], spread: 16
                })
        ]))
    })

/** Đường lộ nguyên tố: vật liệu trồi lên tại ô đường */
registerVfx("qiyanaLaneMark",
    async (ctx) => {
        const el = elementOf(ctx)
        const t = TONES[el]
        const at = ctx.from
        const jobs: Promise<unknown>[] = [
            bloom(ctx.layer,
                at,
                t.main,
                190,
                520),
            dustBurst(ctx.layer,
                at,
                {
                    count: 220, color: t.dust, speed: [50,
                        300], angle: [UP - .8,
                        UP + .8], streak: 3, size: [6,
                        2], life: [340,
                        760], flow: 50, spread: 40, gravity: el === "water" ? 500 : 0
                })
        ]
        if (el === "earth") jobs.push(debris(ctx.layer,
            at,
            {
                tex: rockTex, count: 10, speed: [120,
                    340], angle: [UP - .8,
                    UP + .8], gravity: 900, size: [10,
                    24], life: 680, spread: 28
            }))
        if (el === "grass") jobs.push(debris(ctx.layer,
            at,
            {
                tex: leafTex, count: 16, speed: [90,
                    260], angle: [UP - 1,
                    UP + 1], gravity: 90, size: [14,
                    26], life: 860, spread: 30, flutter: 14
            }))
        await Promise.all(jobs)
    })

/** Hấp thụ: vật liệu của đường bay về Qiyana, tới nơi báo ctx.onBeat và tướng bừng màu nguyên tố. `to` rỗng thì bừng tại chỗ */
registerVfx("qiyanaAbsorb",
    async (ctx) => {
        const el = elementOf(ctx)
        const t = TONES[el]
        const to = ctx.to[0] ?? ctx.from
        const MS = ctx.to.length ? 380 : 0
        let p = ctx.from
        const swell = () => Promise.all([
            bloom(ctx.layer,
                to,
                t.main,
                300,
                480),
            dustBurst(ctx.layer,
                to,
                {
                    count: 300, color: t.dust, speed: [40,
                        240], angle: [UP - 1,
                        UP + 1], streak: 3, size: [6,
                        2], life: [320,
                        680], flow: 60, spread: 60, alpha: 1
                })
        ])
        await Promise.all([
            MS ? dustStream(ctx.layer,
                () => p,
                MS,
                1600,
                {
                    color: t.dust, streak: 3, size: [8,
                        2], speed: [10,
                        70], life: [220,
                        440], flow: 50, spread: 24, alpha: 1
                }) : Promise.resolve(),
            tween(Math.max(1,
                MS),
            (u) => {
                p = {
                    x: lerp(ctx.from.x,
                        to.x,
                        u), y: lerp(ctx.from.y,
                        to.y,
                        u)
                }
            },
            ease.inOut,
            ctx.layer).then(() => {
                ctx.onBeat?.()
                return swell()
            })
        ])
    })

/** Đòn thường: đường cắt ba màu giữ từ fx_basics; đây chỉ thêm tia màu nguyên tố đang giữ, chưa giữ gì thì tia vàng */
registerVfx("qiyanaBasicHit",
    async (ctx) => {
        const colors = ctx.amount === undefined ? [GOLD,
            WHITE_GOLD] : TONES[elementOf(ctx)].dust
        const main = colors[0]
        const at = ctx.from
        await Promise.all([
            bloom(ctx.layer,
                at,
                main,
                220,
                340),
            dustBurst(ctx.layer,
                at,
                {
                    count: 300, color: colors, speed: [160,
                        560], streak: 4, size: [6,
                        2], life: [220,
                        520], flow: 40, spread: 24
                })
        ])
    })
