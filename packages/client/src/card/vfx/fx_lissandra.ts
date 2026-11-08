// VFX riêng của Lissandra theo LMHT, chất liệu BĂNG ĐEN: mũi băng đen xanh thẫm viền lam điện và lục lam, mảnh băng sắc (`blade`), sương lạnh, bụi băng lấp lánh. Không dùng nét vẽ hình học.
// Bảng màu lấy từ ảnh chiêu LMHT trong public/card_skills: chàm gần đen, xanh hoàng gia, lam điện, lục lam, không có tím.
// Mô-típ theo chiêu gốc: Q là ngọn giáo băng, chạm thì vỡ thành chùm mảnh rộng hơn; E bật vòng băng quanh mục tiêu; R là khối băng đen quanh Lissandra và băng tràn ra sân.
// Mỗi hiệu ứng chỉ dựa vào VfxCtx và tự dọn khi layer bị huỷ; chạm là báo ctx.onBeat, không chờ đuôi hạt tan.
import {
    Sprite, Texture, type Container
} from "pixi.js"
import {
    bloom, dustBurst, dustStream, mist, type DustOpts
} from "./fx_dust"
import {
    ease, lerp, makeSprite, pick, rand, sleep, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const TAU = Math.PI * 2
const ABYSS = 0x020a25
const INDIGO = 0x071957
const DEEP = 0x03188f
const ROYAL = 0x0c65df
const ELECTRIC = 0x1ab8fd
const CYAN = 0x55e5fc
const FROST = 0xdcfaff
/** Mũi băng: lõi đen viền sáng */
const DARK_ICE = [ABYSS,
    INDIGO,
    DEEP,
    ROYAL]
const LIT_ICE = [ROYAL,
    ELECTRIC,
    CYAN,
    FROST]
const COLD_AIR = [INDIGO,
    DEEP,
    ROYAL,
    ELECTRIC]
/** Nửa bề rộng, nửa chiều cao lá tướng trên bàn */
const CARD_W = 60
const CARD_H = 104
const UP: [number, number] = [-Math.PI * .68,
    -Math.PI * .32]
/** Băng bò từ cú trúng lên lá trên tay đối thủ: ngắn để vẫn là một nhịp với cú trúng */
export const LISS_CREEP_MS = 300
/** Tia băng từ lá bị Hoá Băng tới tướng: tới nơi đúng lúc E bật vòng băng */
export const LISS_LINK_MS = 420
/** Băng tràn sân của R */
const FIELD_MS = 460
/** VFX bị cắt ở 15s: hiệu ứng giữ băng tự kết thúc trước mốc đó, bên gọi nối lần mới với ctx.amount = 0 */
export const LISS_HOLD_MAX_MS = 13000
const HOLD_PULSE_MS = 420
const HOLD_DEFAULT_MS = 1800
/** Lá trên tay đối thủ khi không biết cỡ thật: nửa bề rộng, nửa chiều cao phần lá lộ ra */
const TIP_W = 28
const TIP_H = 15
const SHEEN_ALPHA = .3
/** Hạt viền mỗi giây, mỗi lá; đủ dày để thấy mép lá mà không che lá */
const RIM_PER_SEC = 90
/** Băng của Hầm Mộ và mũi băng E: để nhìn xuyên được */
const TOMB_ALPHA = .58
const TOMB_PANE_ALPHA = .16
const RING_ALPHA = .6

const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)

/** Mũi băng thật: cao, lệch, nhiều mặt, lõi đen, viền lam sáng, chân tan vào nền nên không có đáy cứng. Gốc ở cạnh dưới */
const SPIKE_W = 84
const SPIKE_H = 260
function spikeTexture(): Texture {
    const c = document.createElement("canvas")
    c.width = SPIKE_W
    c.height = SPIKE_H
    const g = c.getContext("2d")
    if (g) {
        const W = SPIKE_W, H = SPIKE_H
        const tip: [number, number] = [W * rand(.36,
            .64),
        5]
        const left: [number, number][] = [[W * .2,
            H],
        [W * rand(.13,
            .22),
        H * rand(.58,
            .68)],
        [W * rand(.26,
            .34),
        H * rand(.3,
            .38)]]
        const right: [number, number][] = [[W * rand(.68,
            .76),
        H * rand(.3,
            .38)],
        [W * rand(.8,
            .88),
        H * rand(.58,
            .68)],
        [W * .8,
            H]]
        const ridge: [number, number] = [W * rand(.42,
            .58),
        H * .62]
        const path = (points: [number, number][]) => {
            g.beginPath()
            points.forEach(([x,
                y], i) => (i ? g.lineTo(x,
                y) : g.moveTo(x,
                y)))
        }
        const leftFace = g.createLinearGradient(0,
            0,
            W * .6,
            H)
        leftFace.addColorStop(0,
            "#0a3ea8")
        leftFace.addColorStop(.45,
            "#051245")
        leftFace.addColorStop(1,
            "#020a25")
        path([...left,
            tip,
            ridge,
            [W * .5,
                H]])
        g.closePath()
        g.fillStyle = leftFace
        g.fill()
        const rightFace = g.createLinearGradient(W,
            0,
            W * .4,
            H)
        rightFace.addColorStop(0,
            "#3fd6ff")
        rightFace.addColorStop(.3,
            "#0c65df")
        rightFace.addColorStop(1,
            "#03188f")
        path([tip,
            ...right,
            [W * .5,
                H],
            ridge])
        g.closePath()
        g.fillStyle = rightFace
        g.fill()
        // viền phát sáng của băng đen
        g.lineJoin = "miter"
        g.shadowColor = "#1ab8fd"
        g.shadowBlur = 9
        g.strokeStyle = "#7feaff"
        g.lineWidth = 2.4
        path([...left,
            tip,
            ...right])
        g.stroke()
        g.shadowBlur = 0
        g.strokeStyle = "rgba(235,252,255,.9)"
        g.lineWidth = 1.1
        path([tip,
            ridge])
        g.stroke()
        // vết nứt trong băng
        g.strokeStyle = "rgba(127,234,255,.42)"
        g.lineWidth = 1
        for (let i = 0; i < 4; i++) {
            const y = H * rand(.3,
                .85)
            path([[W * rand(.3,
                .5),
            y],
            [W * rand(.45,
                .7),
            y + H * rand(-.08,
                .08)]])
            g.stroke()
        }
        g.globalCompositeOperation = "destination-out"
        const foot = g.createLinearGradient(0,
            H * .7,
            0,
            H)
        foot.addColorStop(0,
            "rgba(0,0,0,0)")
        foot.addColorStop(1,
            "rgba(0,0,0,1)")
        g.fillStyle = foot
        g.fillRect(0,
            0,
            W,
            H)
    }
    return Texture.from(c)
}
let spikes: Texture[] | undefined
const spikeTex = () => pick(spikes ??= [spikeTexture(),
    spikeTexture(),
    spikeTexture(),
    spikeTexture(),
    spikeTexture()])

interface Spike { s: Sprite; len: number; delay: number }
interface SpikeSpec { base: Pt; tilt: number; len: number; width: number; alpha?: number; delay?: number }

function plant(layer: Container, spec: SpikeSpec): Spike {
    const s = new Sprite(spikeTex())
    s.anchor.set(.5,
        1)
    s.x = spec.base.x
    s.y = spec.base.y
    s.rotation = spec.tilt
    s.scale.set(spec.width / SPIKE_W,
        0)
    s.alpha = spec.alpha ?? 1
    layer.addChild(s)
    return {
        s, len: spec.len, delay: spec.delay ?? 0
    }
}

/** Trồng cả cụm, mũi phía sau vẽ trước */
const plantAll = (layer: Container, specs: SpikeSpec[]) => [...specs].sort((a, b) => a.base.y - b.base.y).map(spec => plant(layer,
    spec))

/** Băng mọc vụt lên, hơi vượt rồi khựng lại như tinh thể nứt ra; ms = 0 là có sẵn đủ cao */
function grow(ctx: VfxCtx, list: Spike[], ms: number) {
    const set = (o: Spike, u: number) => {
        if (!o.s.destroyed) o.s.scale.y = o.len / SPIKE_H * u
    }
    if (ms <= 0) {
        for (const o of list) set(o,
            1)
        return Promise.resolve()
    }
    const last = Math.max(0,
        ...list.map(o => o.delay))
    const total = ms + last
    return tween(total,
        (t) => {
            for (const o of list) set(o,
                ease.back(Math.max(0,
                    Math.min(1,
                        (t * total - o.delay) / ms))))
        },
        ease.linear,
        ctx.layer)
}

/** Cụm băng vỡ vụn: mũi rụt nhanh, mảnh sắc văng ra, bụi băng rơi */
function shatter(ctx: VfxCtx, list: Spike[], at: Pt, r: number, count: number) {
    return Promise.all([
        tween(130,
            (t) => {
                for (const o of list) {
                    if (o.s.destroyed) continue
                    o.s.alpha *= 1 - t * .5
                    o.s.scale.y = o.len / SPIKE_H * (1 - t * .55)
                }
            },
            ease.in,
            ctx.layer).then(() => {
            for (const o of list) if (!o.s.destroyed) o.s.visible = false
        }),
        dustBurst(ctx.layer,
            at,
            shard({
                speed: [150,
                    520], drag: 2.6, gravity: 240, life: [340,
                    760], size: [34,
                    10], spread: r
            },
            count)),
        dustBurst(ctx.layer,
            at,
            lit({
                speed: [110,
                    400], drag: 2.8, gravity: 200, life: [260,
                    560], size: [24,
                    7], spread: r * .9
            },
            Math.round(count * .7))),
        dustBurst(ctx.layer,
            at,
            iceDust({
                speed: [40,
                    240], gravity: 90, spread: r
            },
            count * 3))
    ])
}

/** Mảnh băng đen sắc: thân tối, không cộng sáng để nổi trên bàn sáng */
const shard = (over: Partial<DustOpts>, count: number) => ({
    color: DARK_ICE, blade: true, speed: [120,
        420] as [number, number], drag: 2.4, flow: 40, life: [320,
            680] as [number, number], size: [30,
                9] as [number, number], alpha: 1, additive: false, ...over, count
})
/** Mảnh băng sáng lam */
const lit = (over: Partial<DustOpts>, count: number) => ({
    ...shard(over,
        count), color: LIT_ICE, additive: true
})
const dustOf = (over: Partial<DustOpts>): DustOpts => ({
    color: [CYAN,
        FROST,
        ELECTRIC], speed: [20,
        130], gravity: -14, drag: 1.5, flow: 54, life: [460,
        1000], size: [4.5,
        1.2], alpha: 1, ...over
})
/** Bụi băng lấp lánh */
const iceDust = (over: Partial<DustOpts>, count: number) => ({
    ...dustOf(over), count
})
/** Sương lạnh sà thấp, không cộng sáng */
const chill = (ctx: VfxCtx, at: Pt, size: number, alpha = .42, count = 10) => mist(ctx.layer,
    at,
    {
        color: COLD_AIR, size: size * kOf(ctx), alpha, count, additive: false, speed: [30,
            120], life: [520,
            1100]
    })

/** Băng bò dọc đường gãy khúc: đầu băng là mảnh sắc, bụi và sương; sau lưng mọc mũi băng nhỏ rồi tan. arrived là lúc chạm đích, done là lúc mọi hạt đã tắt */
function crawl(ctx: VfxCtx, a: Pt, b: Pt, ms: number, width: number, sprouts: number) {
    const dx = b.x - a.x, dy = b.y - a.y
    const len = Math.hypot(dx,
        dy) || 1
    const dir = Math.atan2(dy,
        dx)
    const nx = -dy / len, ny = dx / len
    const stops = 6
    const bends = Array.from({
        length: stops + 1
    },
    (_, i) => (i === 0 || i === stops ? 0 : rand(-1,
        1) * Math.min(46,
        len * .09)))
    const at = (t: number): Pt => {
        const u = Math.min(stops - 1e-4,
            t * stops)
        const i = Math.floor(u)
        const off = lerp(bends[i],
            bends[i + 1],
            u - i)
        return {
            x: lerp(a.x,
                b.x,
                t) + nx * off, y: lerp(a.y,
                b.y,
                t) + ny * off
        }
    }
    let head = {
        ...a
    }
    const trail: Spike[] = []
    const near = () => ({
        x: head.x + rand(-width,
            width), y: head.y + rand(-width,
            width)
    })
    const streams = Promise.all([
        dustStream(ctx.layer,
            near,
            ms,
            300,
            {
                ...lit({
                    speed: [60,
                        240], angle: [dir - .7,
                        dir + .7], drag: 3, life: [200,
                        420], size: [22,
                        7]
                },
                0)
            }),
        dustStream(ctx.layer,
            near,
            ms,
            240,
            {
                ...shard({
                    speed: [30,
                        160], angle: [dir - 1,
                        dir + 1], drag: 3, life: [220,
                        460], size: [26,
                        8]
                },
                0)
            }),
        dustStream(ctx.layer,
            near,
            ms,
            620,
            dustOf({
                speed: [10,
                    70], life: [300,
                    720]
            })),
        dustStream(ctx.layer,
            () => head,
            ms,
            90,
            {
                puff: true, color: COLD_AIR, speed: [6,
                    34], life: [320,
                    640], size: [width * 3,
                    width * 6], alpha: .34, flow: 20, additive: false
            })
    ])
    let next = 1 / (sprouts + 1)
    const pending: Promise<void>[] = []
    const arrived = tween(ms,
        (t) => {
            head = at(t)
            while (t >= next && next < 1) {
                const p = at(next)
                const planted = plant(ctx.layer,
                    {
                        base: {
                            x: p.x + rand(-width,
                                width), y: p.y + rand(-width * .5,
                                width * .5)
                        }, tilt: rand(-.8,
                            .8), len: rand(44,
                            88) * (width / 10 + .4), width: rand(14,
                            24)
                    })
                trail.push(planted)
                pending.push(grow(ctx,
                    [planted],
                    130))
                next += 1 / (sprouts + 1)
            }
        },
        ease.linear,
        ctx.layer)
    const done = arrived.then(() => Promise.all([
        streams,
        ...pending,
        tween(620,
            (t) => {
                for (const o of trail) if (!o.s.destroyed) o.s.alpha = 1 - t
            },
            ease.in,
            ctx.layer)
    ])).then(() => {})
    return {
        arrived, done
    }
}

/** Vòng lặp giữ băng: gọi pulse đều tay; trả true nếu bên gọi đã thả (phải tan), false nếu hết giờ của riêng lần phát này */
async function holdIce(ctx: VfxCtx, pulse: () => void) {
    const limit = ctx.tether ? LISS_HOLD_MAX_MS : HOLD_DEFAULT_MS
    let el = 0
    while (!ctx.layer.destroyed && !ctx.tether?.released() && el < limit) {
        pulse()
        await tween(HOLD_PULSE_MS,
            () => {},
            ease.linear,
            ctx.layer)
        el += HOLD_PULSE_MS
    }
    return !ctx.tether || ctx.tether.released()
}

/** Nội tại: băng bò từ cú trúng (from) lên lá trên tay đối thủ (to[0]); chạm lá là báo nhịp để Hoá Băng đáp */
registerVfx("lissFrostCreep",
    async (ctx) => {
        const to = ctx.to[0] ?? ctx.from
        const way = crawl(ctx,
            ctx.from,
            to,
            LISS_CREEP_MS,
            13 * kOf(ctx),
            10)
        await way.arrived
        ctx.onBeat?.()
        await way.done
    })

/** Lá bị Hoá Băng: ánh băng mềm và viền hạt mảnh bám mép lá, không che lá hay các lá bên cạnh; giữ tới khi ctx.tether thả thì tan. to[0] là góc dưới phải của lá để lấy đúng cỡ; ctx.amount = 0 là lần phát nối tiếp, không bật lại */
registerVfx("lissCardFreeze",
    async (ctx) => {
        const at = ctx.from
        const corner = ctx.to[0]
        const hw = corner ? Math.min(CARD_W,
            Math.abs(corner.x - at.x)) : TIP_W
        const hh = corner ? Math.min(CARD_H,
            Math.abs(corner.y - at.y)) : TIP_H
        const resume = ctx.amount === 0
        const sheen = makeSprite(ctx.layer,
            "glow",
            at.x,
            at.y,
            CYAN,
            hw * 2.5)
        sheen.alpha = SHEEN_ALPHA
        /** Một điểm trên mép lá */
        const rim = (): Pt => {
            const u = rand(-1,
                1)
            const side = Math.floor(rand(0,
                4))
            const jitter = rand(-1.5,
                1.5)
            if (side < 2) return {
                x: at.x + u * hw, y: at.y + (side ? hh : -hh) + jitter
            }
            return {
                x: at.x + (side === 2 ? hw : -hw) + jitter, y: at.y + u * hh
            }
        }
        const pieces: Promise<unknown>[] = []
        if (!resume) pieces.push(bloom(ctx.layer,
            at,
            FROST,
            hw * 3,
            260))
        const released = await holdIce(ctx,
            () => {
                pieces.push(dustStream(ctx.layer,
                    rim,
                    HOLD_PULSE_MS,
                    RIM_PER_SEC,
                    dustOf({
                        color: [CYAN,
                            FROST], speed: [0,
                            7], gravity: 0, flow: 4, drag: 3, life: [300,
                            620], size: [2.8,
                            1]
                    })))
            })
        if (!released) return
        // tan băng: ánh băng nhạt đi, vài giọt nhỏ rơi
        pieces.push(tween(420,
            (t) => {
                if (!sheen.destroyed) sheen.alpha = SHEEN_ALPHA * (1 - t)
            },
            ease.out,
            ctx.layer),
        dustBurst(ctx.layer,
            at,
            iceDust({
                color: [CYAN,
                    FROST], speed: [10,
                    50], angle: [Math.PI * .3,
                    Math.PI * .7], gravity: 300, drag: .6, flow: 8, spread: hw, life: [320,
                    620], size: [3.6,
                    1.4], streak: 3
            },
            18)))
        await Promise.all(pieces)
    })

/** Q mở màn: mảnh băng hút về tay Lissandra, tụ thành ngọn giáo */
registerVfx("lissShardCast",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        await Promise.all([
            bloom(ctx.layer,
                at,
                ROYAL,
                220 * k,
                300),
            dustStream(ctx.layer,
                () => {
                    const a = rand(0,
                        TAU)
                    return {
                        x: at.x + Math.cos(a) * 120 * k, y: at.y + Math.sin(a) * 120 * k
                    }
                },
                200,
                260,
                {
                    ...lit({
                        speed: [0,
                            20], life: [160,
                            260], size: [28,
                            8]
                    },
                    0)
                }),
            dustBurst(ctx.layer,
                at,
                iceDust({
                    speed: [20,
                        120], spread: 90 * k, life: [200,
                        420]
                },
                70))
        ])
    })

/** Q: ngọn giáo băng đen viền lam lao tới; chạm là báo nhịp và vỡ thành chùm mảnh rộng hơn bay xuyên qua mục tiêu */
registerVfx("lissShardSpear",
    async (ctx) => {
        const k = kOf(ctx)
        const ms = 300
        await Promise.all(ctx.to.map(async (to) => {
            const dir = Math.atan2(to.y - ctx.from.y,
                to.x - ctx.from.x)
            const spear = plant(ctx.layer,
                {
                    base: ctx.from, tilt: dir + Math.PI / 2, len: 190 * k, width: 62 * k
                })
            spear.s.anchor.set(.5,
                .35)
            spear.s.scale.y = spear.len / SPIKE_H
            let p = {
                ...ctx.from
            }
            const near = () => ({
                x: p.x + rand(-16,
                    16) * k, y: p.y + rand(-16,
                    16) * k
            })
            const back: [number, number] = [dir + Math.PI - .4,
                dir + Math.PI + .4]
            const trails = Promise.all([
                dustStream(ctx.layer,
                    near,
                    ms,
                    420,
                    {
                        ...lit({
                            speed: [120,
                                420], angle: back, drag: 3, life: [180,
                                380], size: [30,
                                9]
                        },
                        0)
                    }),
                dustStream(ctx.layer,
                    near,
                    ms,
                    300,
                    {
                        ...shard({
                            speed: [60,
                                240], angle: back, drag: 3, life: [200,
                                420], size: [30,
                                9]
                        },
                        0)
                    }),
                dustStream(ctx.layer,
                    near,
                    ms,
                    900,
                    dustOf({
                        speed: [10,
                            90], life: [260,
                            620], size: [5,
                            1.4]
                    })),
                dustStream(ctx.layer,
                    () => p,
                    ms,
                    80,
                    {
                        puff: true, color: COLD_AIR, speed: [4,
                            24], life: [260,
                            520], size: [46 * k,
                            94 * k], alpha: .3, flow: 18, additive: false
                    })
            ])
            await tween(ms,
                (t) => {
                    p = {
                        x: lerp(ctx.from.x,
                            to.x,
                            t), y: lerp(ctx.from.y,
                            to.y,
                            t)
                    }
                    if (!spear.s.destroyed) {
                        spear.s.x = p.x
                        spear.s.y = p.y
                    }
                },
                ease.in,
                ctx.layer)
            if (!spear.s.destroyed) spear.s.visible = false
            ctx.onBeat?.()
            const fan: [number, number] = [dir - .62,
                dir + .62]
            await Promise.all([
                trails,
                dustBurst(ctx.layer,
                    to,
                    lit({
                        speed: [420 * k,
                            1100 * k], angle: fan, drag: 3, life: [240,
                            520], size: [46,
                            13], spread: 14
                    },
                    44)),
                dustBurst(ctx.layer,
                    to,
                    shard({
                        speed: [320 * k,
                            900 * k], angle: fan, drag: 3, life: [260,
                            560], size: [50,
                            14], spread: 14
                    },
                    34))
            ])
        }))
    })

/** Q trúng: băng nứt tại mục tiêu, mũi băng bật ra rồi vỡ */
registerVfx("lissShardHit",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        ctx.shake(3.5,
            150)
        const list = plantAll(ctx.layer,
            Array.from({
                length: 7
            },
            (_, i): SpikeSpec => ({
                base: {
                    x: at.x + (i - 3) * 17 * k, y: at.y + rand(10,
                        46) * k
                }, tilt: (i - 3) * .24 + rand(-.1,
                    .1), len: rand(120,
                    200) * k, width: rand(30,
                    44) * k, delay: Math.abs(i - 3) * 16
            })))
        await Promise.all([
            bloom(ctx.layer,
                at,
                ELECTRIC,
                260 * k,
                340),
            bloom(ctx.layer,
                at,
                FROST,
                110 * k,
                200),
            chill(ctx,
                at,
                130,
                .42,
                10),
            dustBurst(ctx.layer,
                at,
                iceDust({
                    speed: [60,
                        300], spread: 26 * k
                },
                130)),
            grow(ctx,
                list,
                120).then(() => sleep(240)).then(() => shatter(ctx,
                list,
                {
                    x: at.x, y: at.y - 30 * k
                },
                44 * k,
                34))
        ])
    })

/** E mở màn: hơi lạnh bung quanh Lissandra */
registerVfx("lissRingCast",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ROYAL,
                300 * k,
                320),
            chill(ctx,
                ctx.from,
                170,
                .38,
                10),
            dustBurst(ctx.layer,
                ctx.from,
                lit({
                    speed: [240,
                        560], drag: 3.4, life: [220,
                        420], size: [26,
                        8], spread: 44 * k
                },
                44)),
            dustBurst(ctx.layer,
                ctx.from,
                iceDust({
                    speed: [100,
                        340], spread: 40 * k
                },
                90))
        ])
    })

/** E: băng chạy trên nền tới mục tiêu; tới nơi là báo nhịp để vòng băng bật lên */
registerVfx("lissRingRush",
    async (ctx) => {
        await Promise.all(ctx.to.map(async (to) => {
            const way = crawl(ctx,
                ctx.from,
                to,
                LISS_LINK_MS,
                12 * kOf(ctx),
                8)
            await way.arrived
            ctx.onBeat?.()
            await way.done
        }))
    })

/** Tia băng mảnh nối lá bị Hoá Băng (from) với tướng (to[0]): chỉ bằng hạt, tới đích là báo nhịp */
registerVfx("lissFrostLink",
    async (ctx) => {
        const to = ctx.to[0] ?? ctx.from
        const dx = to.x - ctx.from.x, dy = to.y - ctx.from.y
        const dir = Math.atan2(dy,
            dx)
        const hold = 460
        let reach = 0
        const point = (): Pt => {
            const t = Math.random() * reach
            const wobble = Math.sin(t * 11) * 1.6
            return {
                x: ctx.from.x + dx * t - Math.sin(dir) * wobble, y: ctx.from.y + dy * t + Math.cos(dir) * wobble
            }
        }
        await Promise.all([
            dustStream(ctx.layer,
                point,
                LISS_LINK_MS + hold,
                2600,
                dustOf({
                    speed: [0,
                        16], life: [150,
                        360], size: [4.6,
                        1.6], flow: 12, drag: 3, gravity: 0
                })),
            dustStream(ctx.layer,
                point,
                LISS_LINK_MS + hold,
                520,
                {
                    ...lit({
                        speed: [30,
                            120], angle: [dir - .08,
                            dir + .08], drag: 3, flow: 6, life: [170,
                            340], size: [22,
                            7]
                    },
                    0)
                }),
            tween(LISS_LINK_MS,
                (t) => { reach = t },
                ease.inOut,
                ctx.layer).then(() => {
                ctx.onBeat?.()
                return bloom(ctx.layer,
                    ctx.from,
                    CYAN,
                    170,
                    320)
            })
        ])
    })

/** E trúng: vòng mũi băng đứt quãng bật lên quanh mục tiêu. ctx.amount >= 1 là bản Choáng: dày hơn, khoá lá lâu hơn */
registerVfx("lissRingHit",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        const stun = (ctx.amount ?? 0) >= 1
        const n = stun ? 15 : 11
        const size = stun ? 1.1 : 1
        ctx.shake(stun ? 5.5 : 3.5,
            170)
        const specs = Array.from({
            length: n
        },
        (_, i): SpikeSpec => {
            const a = i / n * TAU + rand(-.13,
                .13)
            const r = rand(.86,
                1.14)
            return {
                base: {
                    x: at.x + Math.cos(a) * (CARD_W + 26) * r * k, y: at.y + Math.sin(a) * (CARD_H * .86) * r * k + 22
                }, tilt: Math.cos(a) * .62 + rand(-.12,
                    .12), len: rand(90,
                    150) * size * k, width: rand(22,
                    34) * size * k, alpha: RING_ALPHA, delay: rand(0,
                    70)
            }
        })
        const list = plantAll(ctx.layer,
            specs)
        await Promise.all([
            bloom(ctx.layer,
                at,
                ELECTRIC,
                340 * k,
                360),
            bloom(ctx.layer,
                at,
                FROST,
                130 * k,
                220),
            chill(ctx,
                at,
                170,
                .24,
                8),
            dustBurst(ctx.layer,
                at,
                lit({
                    speed: [120,
                        420], angle: UP, spread: 70 * k, life: [240,
                        520], size: [30,
                        9]
                },
                40)),
            dustBurst(ctx.layer,
                at,
                iceDust({
                    speed: [60,
                        280], spread: 80 * k
                },
                180)),
            grow(ctx,
                list,
                150).then(() => sleep(stun ? 900 : 440)).then(() => shatter(ctx,
                list,
                at,
                76 * k,
                stun ? 56 : 40))
        ])
    })

/** R mở màn: băng đen trào lên dưới chân Lissandra */
registerVfx("lissTombCast",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        ctx.shake(3,
            200)
        await Promise.all([
            bloom(ctx.layer,
                at,
                DEEP,
                420 * k,
                420),
            bloom(ctx.layer,
                at,
                ELECTRIC,
                240 * k,
                300),
            chill(ctx,
                at,
                200,
                .5,
                14),
            dustBurst(ctx.layer,
                at,
                shard({
                    speed: [200,
                        520], angle: UP, spread: 70, life: [240,
                        460], size: [34,
                        10]
                },
                34)),
            dustBurst(ctx.layer,
                at,
                iceDust({
                    speed: [80,
                        320], spread: 70
                },
                120))
        ])
    })

/** R: băng tràn từ Lissandra sang cả hàng địch; chạm hàng địch là báo nhịp */
registerVfx("lissTombField",
    async (ctx) => {
        const ways = ctx.to.map(to => crawl(ctx,
            ctx.from,
            to,
            FIELD_MS,
            22,
            12))
        await Promise.all(ways.map(way => way.arrived))
        ctx.onBeat?.()
        await Promise.all(ways.map(way => way.done))
    })

/** R trúng: băng đen phun dữ dội tại mỗi địch. ctx.amount là số lá đang Hoá Băng: càng nhiều, băng càng cao và dày */
registerVfx("lissTombErupt",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        const frozen = Math.min(ctx.amount ?? 0,
            5)
        const power = 1 + frozen * .08
        const n = 9 + frozen * 2
        ctx.shake(7 + frozen,
            280)
        const specs = Array.from({
            length: n
        },
        (_, i): SpikeSpec => {
            const u = (i + .5) / n * 2 - 1
            return {
                base: {
                    x: at.x + u * (CARD_W + 40), y: at.y + CARD_H * 1.02 + rand(-12,
                        14)
                }, tilt: u * .7 + rand(-.14,
                    .14), len: rand(80,
                    125) * (.75 + Math.abs(u) * .75) * power, width: rand(30,
                    46) * power, alpha: .94, delay: Math.abs(u) * 60 + rand(0,
                    30)
            }
        })
        const list = plantAll(ctx.layer,
            specs)
        await Promise.all([
            bloom(ctx.layer,
                at,
                ELECTRIC,
                300 * power,
                340),
            bloom(ctx.layer,
                at,
                FROST,
                170 * k,
                240),
            chill(ctx,
                {
                    x: at.x, y: at.y + CARD_H * .8
                },
                120,
                .26,
                8),
            dustBurst(ctx.layer,
                at,
                lit({
                    speed: [260,
                        720], angle: UP, spread: 70 * k, life: [300,
                        620], size: [38,
                        11]
                },
                Math.round(46 * power))),
            dustBurst(ctx.layer,
                at,
                iceDust({
                    speed: [80,
                        340], spread: 90 * k
                },
                Math.round(190 * power))),
            grow(ctx,
                list,
                170).then(() => sleep(260)).then(() => shatter(ctx,
                list,
                {
                    x: at.x, y: at.y + 40
                },
                84,
                44))
        ])
    })

/** R: Lissandra nằm trong khối băng đen dựng bằng mũi băng và sương, thấy lờ mờ lá tướng bên trong. Khép kín là báo nhịp; giữ tới khi ctx.tether thả rồi vỡ tung */
registerVfx("lissTomb",
    async (ctx) => {
        const at = () => ctx.tether?.target() ?? ctx.from
        const c = at()
        // đỉnh băng dừng ngay mép trên lá: cao bằng lá, Lissandra vẫn lộ rõ bên trong
        const top = c.y - CARD_H - 8
        const floor = c.y + CARD_H + 12
        const bottom = Array.from({
            length: 9
        },
        (_, i): SpikeSpec => {
            const u = i / 8 * 2 - 1
            return {
                base: {
                    x: c.x + u * (CARD_W + 14), y: floor + rand(-6,
                        8)
                }, tilt: u * .22 + rand(-.08,
                    .08), len: rand(46,
                    92), width: rand(22,
                    34), alpha: TOMB_ALPHA, delay: rand(0,
                    50)
            }
        })
        const sides = [-1,
            1].flatMap(side => Array.from({
            length: 4
        },
        (_, i): SpikeSpec => {
            const y = floor - i * CARD_H * .42
            return {
                base: {
                    x: c.x + side * (CARD_W + 8 + rand(-4,
                        6)), y
                }, tilt: -side * rand(.02,
                    .1), len: Math.max(50,
                    (y - top) * rand(.82,
                        1)), width: rand(20,
                    32), alpha: TOMB_ALPHA, delay: 50 + i * 30
            }
        }))
        // mặt băng rất mờ trước lá: thấy là đang ở trong băng, không che tướng
        const panes = Array.from({
            length: 4
        },
        (_, i): SpikeSpec => {
            const u = i / 3 * 2 - 1
            return {
                base: {
                    x: c.x + u * CARD_W * .62, y: floor
                }, tilt: -u * .06 + rand(-.03,
                    .03), len: (floor - top) * rand(.8,
                    1), width: rand(70,
                    96), alpha: TOMB_PANE_ALPHA, delay: 130 + rand(0,
                    60)
            }
        })
        const list = plantAll(ctx.layer,
            [...sides,
                ...bottom]).concat(plantAll(ctx.layer,
            panes))
        const body = () => {
            const p = at()
            return {
                x: p.x + rand(-CARD_W,
                    CARD_W), y: p.y + rand(-CARD_H,
                    CARD_H)
            }
        }
        const pieces: Promise<unknown>[] = [bloom(ctx.layer,
            c,
            ELECTRIC,
            380,
            460),
        chill(ctx,
            c,
            170,
            .22,
            8),
        dustBurst(ctx.layer,
            c,
            iceDust({
                speed: [40,
                    240], spread: 90
            },
            180))]
        await grow(ctx,
            list,
            210)
        ctx.onBeat?.()
        ctx.shake(4,
            180)
        const released = await holdIce(ctx,
            () => {
                pieces.push(dustStream(ctx.layer,
                    body,
                    HOLD_PULSE_MS,
                    16,
                    {
                        puff: true, color: COLD_AIR, speed: [4,
                            26], life: [640,
                            1100], size: [70,
                            130], alpha: .1, flow: 16, additive: false
                    }),
                dustStream(ctx.layer,
                    body,
                    HOLD_PULSE_MS,
                    130,
                    dustOf({
                        speed: [6,
                            36], life: [460,
                            900], size: [5.5,
                            1.5]
                    })),
                bloom(ctx.layer,
                    body(),
                    CYAN,
                    110,
                    HOLD_PULSE_MS * 1.5))
            })
        if (!released) return
        ctx.shake(5,
            200)
        pieces.push(bloom(ctx.layer,
            at(),
            FROST,
            300,
            320),
        chill(ctx,
            at(),
            210,
            .46,
            10),
        shatter(ctx,
            list,
            at(),
            104,
            90))
        await Promise.all(pieces)
    })

/** R: đòn địch tới khối băng thì không còn mục tiêu: lực tản theo mặt băng thành bụi, tướng trong băng không mất gì */
registerVfx("lissTombRepel",
    async (ctx) => {
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                CYAN,
                300,
                360),
            dustBurst(ctx.layer,
                ctx.from,
                lit({
                    speed: [220,
                        620], drag: 3.4, spread: 54, life: [220,
                        460], size: [26,
                        8]
                },
                44)),
            dustBurst(ctx.layer,
                ctx.from,
                iceDust({
                    speed: [80,
                        320], spread: 60
                },
                140))
        ])
    })
