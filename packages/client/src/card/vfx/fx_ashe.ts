// VFX riêng của Ashe theo LMHT, chất liệu PHA LÊ BĂNG: mũi tên pha lê nhiều mặt, mảnh băng sắc (`blade`), tuyết mịn, hơi lạnh. Không dùng nét vẽ hình học.
// Bảng màu lấy từ ảnh chiêu LMHT trong public/card_skills: xanh đêm, xanh hoàng gia, xanh nước biển, lục lam, trắng băng.
// Mô-típ theo chiêu gốc: Q là loạt năm mũi tên liên hồi và cung phủ băng, E là quạt tên Volley chụm về một mục tiêu, R là Đại Băng Tiễn khổng lồ tăng tốc bay xuyên bàn, để lại vệt băng trên mặt đất, chạm là vỡ tung.
// Mỗi hiệu ứng chỉ dựa vào VfxCtx và tự dọn khi layer bị huỷ; chạm là báo ctx.onBeat, không chờ đuôi hạt tan.
import {
    Sprite, Texture
} from "pixi.js"
import {
    bloom, dustBurst, dustStream, mist, type DustOpts
} from "./fx_dust"
import {
    ease, lerp, makeSprite, rand, sleep, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const TAU = Math.PI * 2
const MIDNIGHT = 0x0a1a8c
const ROYAL = 0x1550e0
const AZURE = 0x1e9bff
const CYAN = 0x5fdcff
const ICE = 0xbef3ff
const WHITE = 0xf4fdff
const COLD = [ROYAL,
    AZURE,
    CYAN]
const SHARD = [AZURE,
    CYAN,
    ICE,
    WHITE]
const SNOW = [CYAN,
    ICE,
    WHITE]
const DEEP_AIR = [MIDNIGHT,
    ROYAL,
    AZURE]
/** Nửa bề rộng, nửa chiều cao lá tướng trên bàn */
const CARD_W = 62
const CARD_H = 92
const UP: [number, number] = [-Math.PI * .66,
    -Math.PI * .34]
/** Số Buốt đủ để choáng trong bản hiển thị: độ dày băng trên lá chạy theo tỉ lệ này */
export const ASHE_FROST_MAX = 6
/** Ashe kéo cung trước khi Đại Băng Tiễn rời dây */
export const ASHE_DRAW_MS = 560
/** Chu kỳ bên gọi nối lại asheFrostCling; ngắn hơn đời hạt nên băng trên lá không đứt quãng */
export const ASHE_CLING_MS = 620
/** Bay nhanh dần theo chiều dài đường: xa bay lâu hơn, gần vẫn đủ thấy */
const CRYSTAL_MS_MIN = 520
const CRYSTAL_MS_MAX = 980
const CRYSTAL_PX_PER_MS = 1.35
const FLURRY_ARROWS = 5
const FLURRY_GAP_MS = 28
const FLURRY_MS = 230
const VOLLEY_ARROWS = 7
const VOLLEY_MS = 440
const VOLLEY_LATE_MS = 110
/** VFX bị cắt ở 15s: hiệu ứng giữ tự kết thúc trước mốc đó, bên gọi nối lần mới nếu cần */
const HOLD_MAX_MS = 13000
const HOLD_PULSE_MS = 340
const HOLD_DEFAULT_MS = 1800

const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
const around = (at: Pt, r: number): Pt => {
    const a = rand(0,
            TAU), d = Math.sqrt(Math.random()) * r
    return {
        x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d
    }
}

const ARROW_W = 320
const ARROW_H = 96
/** Mũi tên pha lê: thân thuôn tan vào nền, đầu ba cạnh nhiều mặt, lõi trắng, vân nứt xanh đêm như ảnh chiêu R. Đầu mũi ở mép phải */
function arrowTexture(): Texture {
    const c = document.createElement("canvas")
    c.width = ARROW_W
    c.height = ARROW_H
    const g = c.getContext("2d")
    if (g) {
        const W = ARROW_W, H = ARROW_H, M = H / 2
        const poly = (pts: [number, number][]) => {
            g.beginPath()
            pts.forEach(([x,
                y], i) => (i ? g.lineTo(x,
                y) : g.moveTo(x,
                y)))
            g.closePath()
        }
        const shaft = g.createLinearGradient(0,
            0,
            W * .66,
            0)
        shaft.addColorStop(0,
            "rgba(95,220,255,0)")
        shaft.addColorStop(.45,
            "rgba(120,226,255,.55)")
        shaft.addColorStop(1,
            "rgba(235,252,255,1)")
        g.fillStyle = shaft
        poly([[0,
            M],
        [W * .66,
            M - 9],
        [W * .66,
            M + 9]])
        g.fill()
        g.shadowColor = "#5fdcff"
        g.shadowBlur = 12
        const upper = g.createLinearGradient(W * .56,
            0,
            W,
            M)
        upper.addColorStop(0,
            "#1e9bff")
        upper.addColorStop(.55,
            "#7fe6ff")
        upper.addColorStop(1,
            "#ffffff")
        g.fillStyle = upper
        poly([[W - 3,
            M],
        [W * .56,
            6],
        [W * .64,
            M - 4],
        [W * .62,
            M]])
        g.fill()
        const lower = g.createLinearGradient(W * .56,
            H,
            W,
            M)
        lower.addColorStop(0,
            "#1550e0")
        lower.addColorStop(.6,
            "#1e9bff")
        lower.addColorStop(1,
            "#bef3ff")
        g.fillStyle = lower
        poly([[W - 3,
            M],
        [W * .56,
            H - 6],
        [W * .64,
            M + 4],
        [W * .62,
            M]])
        g.fill()
        g.shadowBlur = 0
        g.fillStyle = "#ffffff"
        poly([[W - 3,
            M],
        [W * .7,
            M - 5],
        [W * .5,
            M],
        [W * .7,
            M + 5]])
        g.fill()
        g.strokeStyle = "rgba(10,26,140,.75)"
        g.lineWidth = 1.5
        g.beginPath()
        g.moveTo(W * .68,
            M - 15)
        g.lineTo(W * .74,
            M - 6)
        g.lineTo(W * .8,
            M - 9)
        g.moveTo(W * .7,
            M + 16)
        g.lineTo(W * .78,
            M + 8)
        g.stroke()
    }
    return Texture.from(c)
}
let arrowCache: Texture | undefined
const arrowTex = () => (arrowCache ??= arrowTexture())

/** Sprite mũi tên pha lê dài `length` px, đầu mũi nằm ngay tại vị trí sprite, kèm quầng sáng bám theo */
function crystal(ctx: VfxCtx, length: number) {
    const body = new Sprite(arrowTex())
    body.anchor.set(.97,
        .5)
    const unit = length / ARROW_W
    body.scale.set(unit)
    const outer = makeSprite(ctx.layer,
        "glow",
        ctx.from.x,
        ctx.from.y,
        ROYAL,
        length * 1.1)
    const inner = makeSprite(ctx.layer,
        "glow",
        ctx.from.x,
        ctx.from.y,
        CYAN,
        length * .6)
    outer.alpha = .6
    inner.alpha = .9
    ctx.layer.addChild(body)
    return {
        place(p: Pt, angle: number) {
            for (const s of [body,
                outer,
                inner]) {
                if (s.destroyed) continue
                s.x = p.x
                s.y = p.y
            }
            if (!body.destroyed) body.rotation = angle
        },
        size(t: number) {
            if (body.destroyed) return
            body.scale.set(unit * t)
            body.alpha = Math.min(1,
                t * 1.4)
            outer.alpha = .6 * t
            inner.alpha = .9 * t
        },
        /** Đưa mũi tên lên trên đuôi hạt để luôn thấy rõ thân pha lê */
        lift() {
            if (!body.destroyed) ctx.layer.addChild(body)
        },
        hide() {
            for (const s of [body,
                outer,
                inner]) if (!s.destroyed) s.visible = false
        }
    }
}

/** Mảnh băng dựng theo một hướng, đứng yên rồi tan: flow 0 và drag 0 để mảnh giữ nguyên góc */
const spike = (over: Partial<DustOpts> & { angle: [number, number] }): DustOpts => ({
    color: SHARD, blade: true, speed: [6,
        16], drag: 0, flow: 0, life: [420,
        820], size: [16,
        38], alpha: 1, additive: false, ...over
})
/** Bụi tuyết: hạt nhỏ sáng, rơi chậm, sống lâu */
const snow = (over: Partial<DustOpts> = {
}): DustOpts => ({
    color: SNOW, speed: [20,
        120], gravity: 60, drag: 1.6, flow: 60, life: [500,
        1100], size: [5,
        1.5], alpha: 1, ...over
})
/** Tia băng văng nhanh: mảnh sắc toả ra rồi khựng lại */
const shards = (speed: [number, number], size: [number, number], over: Partial<DustOpts> = {
}): DustOpts => ({
    color: SHARD, blade: true, speed, drag: 3.2, flow: 24, life: [320,
        720], size, alpha: 1, additive: false, ...over
})

/** Đuôi một mũi tên: lõi hạt, vệt băng dài, tuyết. `head` là đầu mũi, hạt rải đều trên đoạn vừa bay nên không vón theo khung hình */
function arrowTrail(ctx: VfxCtx, head: () => Pt, ms: number, width: number, dense = 1) {
    let last = head()
    const swept = () => {
        const p = head()
        const t = Math.random()
        const q = {
            x: lerp(last.x,
                p.x,
                t), y: lerp(last.y,
                p.y,
                t)
        }
        if (t > .9) last = p
        return around(q,
            width * .5)
    }
    return Promise.all([
        dustStream(ctx.layer,
            swept,
            ms,
            900 * dense,
            {
                color: [ROYAL,
                    AZURE,
                    CYAN,
                    ICE], speed: [4,
                    30], life: [130,
                    320], size: [8,
                    2], alpha: 1, flow: 30, drag: 2.4
            }),
        dustStream(ctx.layer,
            swept,
            ms,
            340 * dense,
            snow({
                speed: [8,
                    50], life: [320,
                    760], size: [4.5,
                    1.2]
            }))
    ])
}

/** Bay một mũi tên theo đường path(t); resolve đúng lúc chạm, đuôi hạt tự tan sau */
function flight(ctx: VfxCtx, opts: { ms: number; length: number; width: number; path: (t: number) => Pt; easing?: (t: number) => number; dense?: number }) {
    const arrow = crystal(ctx,
        opts.length)
    let p = opts.path(0)
    const next = opts.path(.02)
    let angle = Math.atan2(next.y - p.y,
        next.x - p.x)
    arrow.place(p,
        angle)
    const tail = arrowTrail(ctx,
        () => p,
        opts.ms,
        opts.width,
        opts.dense)
    let lifted = false
    const touch = tween(opts.ms,
        (t) => {
            if (!lifted) {
                lifted = true
                arrow.lift()
            }
            const q = opts.path(t)
            if (Math.hypot(q.x - p.x,
                q.y - p.y) > .5) angle = Math.atan2(q.y - p.y,
                q.x - p.x)
            p = q
            arrow.place(p,
                angle)
        },
        opts.easing ?? ease.linear,
        ctx.layer).then(() => arrow.hide())
    return {
        touch, tail
    }
}

/** Đường cong nhẹ lệch ngang: `side` âm dương theo phía, chụm hết về đích */
function curve(a: Pt, b: Pt, t: number, side: number): Pt {
    const dx = b.x - a.x, dy = b.y - a.y
    const len = Math.hypot(dx,
        dy) || 1
    const swing = Math.sin(t * Math.PI) * side * Math.min(150,
        len * .28)
    return {
        x: lerp(a.x,
            b.x,
            t) - dy / len * swing, y: lerp(a.y,
            b.y,
            t) + dx / len * swing
    }
}

/** Băng mọc quanh mép lá: mỗi cạnh một dòng mũi băng hướng ra ngoài. `rate` là số mũi mỗi giây trên toàn lá */
function rimFrost(ctx: VfxCtx, at: () => Pt, ms: number, rate: number, length: [number, number]) {
    const sides: { pt: () => Pt; angle: [number, number]; share: number }[] = [
        {
            pt: () => {
                const c = at()
                return {
                    x: c.x + rand(-CARD_W,
                        CARD_W), y: c.y - CARD_H
                }
            }, angle: UP, share: .22
        },
        {
            pt: () => {
                const c = at()
                return {
                    x: c.x + rand(-CARD_W,
                        CARD_W), y: c.y + CARD_H
                }
            }, angle: [Math.PI * .34,
                Math.PI * .66], share: .34
        },
        {
            pt: () => {
                const c = at()
                return {
                    x: c.x - CARD_W, y: c.y + rand(-CARD_H,
                        CARD_H)
                }
            }, angle: [Math.PI * .8,
                Math.PI * 1.2], share: .22
        },
        {
            pt: () => {
                const c = at()
                return {
                    x: c.x + CARD_W, y: c.y + rand(-CARD_H,
                        CARD_H)
                }
            }, angle: [-Math.PI * .2,
                Math.PI * .2], share: .22
        }
    ]
    return Promise.all(sides.map(side => dustStream(ctx.layer,
        side.pt,
        ms,
        rate * side.share,
        spike({
            angle: side.angle, size: length, spread: 12
        }))))
}

/** Vụ nổ băng dùng chung của các cú trúng: quầng sáng, hơi lạnh, mảnh sắc, tuyết. `power` 1 là mũi tên thường */
function iceBurst(ctx: VfxCtx, at: Pt, power: number, count: number) {
    return Promise.all([
        bloom(ctx.layer,
            at,
            AZURE,
            300 * power,
            380),
        bloom(ctx.layer,
            at,
            WHITE,
            130 * power,
            220),
        mist(ctx.layer,
            at,
            {
                color: COLD, size: 130 * power, alpha: .3, count: 11, speed: [40,
                    150]
            }),
        dustBurst(ctx.layer,
            at,
            {
                ...shards([160 * power,
                    620 * power],
                [24 * power,
                    10 * power]), count: Math.round(count * .5), spread: 14
            }),
        dustBurst(ctx.layer,
            at,
            {
                ...snow({
                    speed: [60 * power,
                        300 * power], spread: 26
                }), count: Math.round(count * .9)
            }),
        dustBurst(ctx.layer,
            at,
            {
                color: DEEP_AIR, speed: [40,
                    190], drag: 2.4, flow: 70, life: [320,
                    700], size: [16,
                    6], alpha: .75, spread: 40 * power, additive: false, count: Math.round(count * .25)
            })
    ])
}

/** Nội tại: mỗi tầng Buốt chạm là băng bung trên lá, tầng càng cao càng dày. ctx.amount là số Buốt mới */
registerVfx("asheFrostMark",
    async (ctx) => {
        const stacks = Math.max(1,
            ctx.amount ?? 1)
        const power = kOf(ctx) * (.85 + stacks / ASHE_FROST_MAX * .55)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                CYAN,
                210 * power,
                300),
            rimFrost(ctx,
                () => ctx.from,
                120,
                520 + stacks * 90,
                [14,
                    46]),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...snow({
                        spread: 54 * power, speed: [40,
                            190]
                    }), count: 70 + stacks * 24
                })
        ])
    })

/** Băng bám lá theo số Buốt: ctx.amount tầng thì băng mọc dày tương ứng, tuyết rơi, hơi lạnh bốc. Một nhịp ngắn, bên gọi nối lại mỗi ASHE_CLING_MS khi còn Buốt */
registerVfx("asheFrostCling",
    async (ctx) => {
        const stacks = Math.max(1,
            ctx.amount ?? 1)
        const ratio = Math.min(1,
            stacks / ASHE_FROST_MAX)
        const at = () => ctx.tether?.target() ?? ctx.from
        const body = () => {
            const c = at()
            return {
                x: c.x + rand(-CARD_W,
                    CARD_W), y: c.y + rand(-CARD_H,
                    CARD_H)
            }
        }
        await Promise.all([
            rimFrost(ctx,
                at,
                ASHE_CLING_MS,
                150 + 92 * stacks,
                [14 + 8 * ratio,
                    34 + 30 * ratio]),
            dustStream(ctx.layer,
                body,
                ASHE_CLING_MS,
                90 + 40 * stacks,
                snow({
                    speed: [6,
                        30], gravity: 34, life: [620,
                        1200]
                })),
            dustStream(ctx.layer,
                body,
                ASHE_CLING_MS,
                14 + 4 * stacks,
                {
                    puff: true, color: COLD, speed: [10,
                        34], angle: UP, gravity: -30, life: [620,
                        1100], size: [50,
                        110], alpha: .24 + ratio * .16, flow: 18
                })
        ])
    })

/** Đủ Buốt: toàn bộ băng trên lá vỡ tung, sát thương và Choáng đáp cùng nhịp */
registerVfx("asheFrostShatter",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(7,
            260)
        await Promise.all([
            iceBurst(ctx,
                ctx.from,
                1.5 * k,
                Math.round(300 * ctx.intensity)),
            rimFrost(ctx,
                () => ctx.from,
                110,
                1500,
                [34,
                    84])
        ])
    })

/** Luật chết: tướng mang Buốt gục, nửa băng rơi khỏi lá thành tuyết */
registerVfx("asheFrostShed",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...shards([30,
                        150],
                    [26,
                        9],
                    {
                        gravity: 520, drag: .8, flow: 16, life: [520,
                            1000], angle: [.1,
                            Math.PI - .1]
                    }), count: 110, spread: 74 * k
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...snow({
                        gravity: 150, spread: 80 * k, speed: [10,
                            70], life: [700,
                            1300]
                    }), count: 200
                })
        ])
    })

/** Q mở màn: gió lạnh cuộn vào Ashe rồi bùng lên, cung phủ băng */
registerVfx("asheFocusCast",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                AZURE,
                330 * k,
                460),
            bloom(ctx.layer,
                ctx.from,
                WHITE,
                130 * k,
                240),
            mist(ctx.layer,
                ctx.from,
                {
                    color: COLD, size: 150 * k, alpha: .28, count: 10, speed: [20,
                        90]
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    color: SHARD, count: 150, speed: [140,
                        420], drag: 2.6, flow: 150, life: [280,
                        620], size: [11,
                        3], streak: 5, alpha: 1, spread: 70 * k
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...snow({
                        gravity: -90, spread: 76 * k, speed: [30,
                            170]
                    }), count: 240
                })
        ])
    })

/** Q duy trì: băng cháy lạnh bốc lên từ lá Ashe. Có ctx.tether thì chạy tới khi được thả (tối đa HOLD_MAX_MS), không thì chạy ngắn tại chỗ */
registerVfx("asheFocusAura",
    async (ctx) => {
        const k = kOf(ctx)
        const at = () => ctx.tether?.target() ?? ctx.from
        const limit = ctx.tether ? HOLD_MAX_MS : HOLD_DEFAULT_MS
        const body = () => {
            const c = at()
            return {
                x: c.x + rand(-CARD_W,
                    CARD_W) * k, y: c.y + rand(-CARD_H * .4,
                    CARD_H) * k
            }
        }
        const pieces: Promise<unknown>[] = []
        let el = 0
        while (!ctx.layer.destroyed && !ctx.tether?.released() && el < limit) {
            pieces.push(dustStream(ctx.layer,
                body,
                HOLD_PULSE_MS,
                170,
                {
                    color: [AZURE,
                        CYAN,
                        ICE], speed: [30,
                        90], angle: UP, gravity: -150, drag: 1.2, flow: 80, life: [420,
                        820], size: [18,
                        4], streak: 3.2, alpha: .9
                }),
            dustStream(ctx.layer,
                body,
                HOLD_PULSE_MS,
                100,
                snow({
                    speed: [12,
                        60], angle: UP, gravity: -60, life: [520,
                        1000]
                })),
            bloom(ctx.layer,
                at(),
                AZURE,
                230 * k,
                560))
            await tween(HOLD_PULSE_MS,
                () => {},
                ease.linear,
                ctx.layer)
            el += HOLD_PULSE_MS
        }
        await Promise.all(pieces)
    })

/** Q: mỗi đòn là loạt năm mũi tên liên hồi; mũi đầu chạm là báo nhịp, các mũi sau cắm vào đúng cú nổ đó */
registerVfx("asheFlurry",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all(ctx.to.map(async (to) => {
            let beat = false
            await Promise.all(Array.from({
                length: FLURRY_ARROWS
            },
            async (_, i) => {
                await sleep(i * FLURRY_GAP_MS)
                const side = (i - (FLURRY_ARROWS - 1) / 2) * .07
                const shot = flight(ctx,
                    {
                        ms: FLURRY_MS, length: 94 * k, width: 9 * k, dense: .55, path: t => curve(ctx.from,
                            to,
                            t,
                            side)
                    })
                await shot.touch
                if (!beat) {
                    beat = true
                    ctx.onBeat?.()
                }
                await shot.tail
            }))
        }))
    })

/** Q trúng: mảnh băng văng tung tại mục tiêu */
registerVfx("asheFlurryHit",
    async (ctx) => {
        const k = kOf(ctx)
        await iceBurst(ctx,
            ctx.from,
            1.05 * k,
            Math.round(170 * ctx.intensity))
    })

/** E: quạt bảy mũi tên băng toả từ dây cung rồi chụm về một mục tiêu, chạm cùng lúc */
registerVfx("asheVolley",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all(ctx.to.map(async (to) => {
            const tails: Promise<unknown>[] = []
            const touches = Array.from({
                length: VOLLEY_ARROWS
            },
            async (_, i) => {
                const side = ((i + rand(.1,
                    .9)) / VOLLEY_ARROWS * 2 - 1) * .95
                const late = rand(0,
                    VOLLEY_LATE_MS)
                await sleep(late)
                const shot = flight(ctx,
                    {
                        ms: VOLLEY_MS - late, length: rand(96,
                            136) * k, width: 13 * k, dense: .8, easing: ease.in, path: t => curve(ctx.from,
                            to,
                            t,
                            side)
                    })
                tails.push(shot.tail)
                await shot.touch
            })
            await Promise.all(touches)
            ctx.onBeat?.()
            await Promise.all(tails)
        }))
    })

/** E trúng: bảy mũi cùng nổ, băng mọc quanh lá */
registerVfx("asheVolleyHit",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(5,
            170)
        await Promise.all([
            iceBurst(ctx,
                ctx.from,
                1.35 * k,
                Math.round(240 * ctx.intensity)),
            rimFrost(ctx,
                () => ctx.from,
                110,
                1000,
                [22,
                    60])
        ])
    })

/** R mở màn: hơi lạnh xoáy vào dây cung, mũi tên pha lê lớn dần trong tay Ashe, hướng về mục tiêu */
registerVfx("asheCrystalDraw",
    async (ctx) => {
        const k = kOf(ctx)
        const to = ctx.to[0] ?? {
            x: ctx.from.x, y: ctx.from.y - 200
        }
        const angle = Math.atan2(to.y - ctx.from.y,
            to.x - ctx.from.x)
        const arrow = crystal(ctx,
            190 * k)
        arrow.place(ctx.from,
            angle)
        arrow.size(.1)
        let reach = 220 * k
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                AZURE,
                380 * k,
                ASHE_DRAW_MS),
            dustStream(ctx.layer,
                () => around(ctx.from,
                    reach),
                ASHE_DRAW_MS,
                1500,
                {
                    color: SHARD, speed: [0,
                        30], life: [120,
                        280], size: [9,
                        2.5], alpha: 1, flow: 150, drag: 2
                }),
            tween(ASHE_DRAW_MS,
                (t) => {
                    reach = lerp(220,
                        36,
                        t) * k
                    arrow.size(.1 + t * .9)
                },
                ease.out,
                ctx.layer).then(() => arrow.hide())
        ])
    })

/** R: mũi tên pha lê khổng lồ tăng tốc bay xuyên bàn, kéo vệt băng trên mặt đất; chạm mục tiêu là báo nhịp */
registerVfx("asheCrystalArrow",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all(ctx.to.map(async (to) => {
            const dist = Math.hypot(to.x - ctx.from.x,
                to.y - ctx.from.y)
            const ms = Math.max(CRYSTAL_MS_MIN,
                Math.min(CRYSTAL_MS_MAX,
                    dist / CRYSTAL_PX_PER_MS))
            const dir = Math.atan2(to.y - ctx.from.y,
                to.x - ctx.from.x)
            let head = {
                ...ctx.from
            }
            let last = {
                ...ctx.from
            }
            const shot = flight(ctx,
                {
                    ms, length: 190 * k, width: 26 * k, dense: 1.4, easing: t => .32 * t + .68 * t * t, path: (t) => {
                        head = {
                            x: lerp(ctx.from.x,
                                to.x,
                                t), y: lerp(ctx.from.y,
                                to.y,
                                t)
                        }
                        return head
                    }
                })
            const wake = () => {
                const t = Math.random()
                const p = {
                    x: lerp(last.x,
                        head.x,
                        t), y: lerp(last.y,
                        head.y,
                        t)
                }
                if (t > .85) last = head
                return around(p,
                    30 * k)
            }
            const ground = (o: DustOpts, perSec: number) => dustStream(ctx.layer,
                wake,
                ms,
                perSec,
                o)
            await Promise.all([
                ground(spike({
                    angle: [dir + Math.PI * .34,
                        dir + Math.PI * .66], life: [560,
                        1100], size: [12,
                        46]
                }),
                240),
                ground(spike({
                    angle: [dir - Math.PI * .66,
                        dir - Math.PI * .34], life: [560,
                        1100], size: [12,
                        46]
                }),
                240),
                ground({
                    color: SHARD, speed: [120,
                        360], angle: [dir + Math.PI - .28,
                        dir + Math.PI + .28], drag: 3, flow: 40, life: [260,
                        620], size: [20,
                        6], streak: 6, alpha: 1
                },
                640),
                ground({
                    puff: true, color: COLD, speed: [6,
                        30], life: [460,
                        900], size: [80,
                        150], alpha: .2, flow: 18
                },
                34),
                shot.touch.then(() => ctx.onBeat?.()),
                shot.tail
            ])
        }))
    })

/** R trúng: mũi tên vỡ tung thành cột băng, sát thương, Buốt và Choáng cùng đáp */
registerVfx("asheCrystalHit",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(10,
            340)
        await Promise.all([
            iceBurst(ctx,
                ctx.from,
                1.45 * k,
                Math.round(290 * ctx.intensity)),
            rimFrost(ctx,
                () => ctx.from,
                130,
                1900,
                [40,
                    110]),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...shards([240,
                        760],
                    [46,
                        16],
                    {
                        angle: UP, gravity: 260, drag: 1.8
                    }), count: 90, spread: 46 * k
                })
        ])
    })

/** Choáng: lớp băng dày đóng quanh lá. Có ctx.tether thì giữ tới khi được thả (tối đa HOLD_MAX_MS), không thì chạy ngắn tại chỗ */
registerVfx("asheStunHold",
    async (ctx) => {
        const at = () => ctx.tether?.target() ?? ctx.from
        const limit = ctx.tether ? HOLD_MAX_MS : HOLD_DEFAULT_MS
        const pieces: Promise<unknown>[] = []
        let el = 0
        while (!ctx.layer.destroyed && !ctx.tether?.released() && el < limit) {
            pieces.push(rimFrost(ctx,
                at,
                HOLD_PULSE_MS,
                460,
                [20,
                    62]),
            dustStream(ctx.layer,
                at,
                HOLD_PULSE_MS,
                80,
                snow({
                    spread: 70, speed: [10,
                        40], life: [520,
                        1000]
                })),
            bloom(ctx.layer,
                at(),
                CYAN,
                260,
                560))
            await tween(HOLD_PULSE_MS,
                () => {},
                ease.linear,
                ctx.layer)
            el += HOLD_PULSE_MS
        }
        await Promise.all(pieces)
    })
