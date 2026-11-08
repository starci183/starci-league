// VFX riêng của Ahri, chất liệu LỬA HỒ LY: ngọn lửa ma hồng tím, cánh năng lượng mềm, kim tuyến mịn, vệt hạt khi lướt. Không dùng nét vẽ hình học.
// Mỗi hiệu ứng chỉ dựa vào VfxCtx và tự dọn khi layer bị huỷ; trúng là báo ctx.onBeat, không chờ đuôi hạt tan.
import {
    bloom, dustBurst, dustStream, mist, type DustOpts
} from "./fx_dust"
import {
    ease, lerp, makeSprite, rand, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const TAU = Math.PI * 2
const ROSE = 0xffc2e8
const VIOLET = 0x9b5cff
const LILAC = 0xd8b8ff
const GLITTER = 0xfff2fb
/** Quả Cầu lướt quá mục tiêu rồi mới quay đầu; demo chờ đúng chừng này giữa hai cú trúng */
export const AHRI_ORB_TURN_MS = 260
/** Đường bay của E rất ngắn: chạm mục tiêu đúng lúc lá tướng đáp xuống */
export const AHRI_LASH_MS = 170
/** Lá tướng chạy theo plan.ts 620ms; dấu lửa lướt khớp nhịp đó */
export const AHRI_DASH_MS = 620
const ORB_OVERSHOOT = 130
const AURA_MAX_MS = 11000
const AURA_DEFAULT_MS = 2400

const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
const fireOf = (ctx: VfxCtx) => [ctx.color,
    ctx.color2 ?? ROSE,
    VIOLET,
    LILAC]
const sparkleOf = (ctx: VfxCtx) => [GLITTER,
    ctx.color2 ?? ROSE,
    LILAC]
/** Tinh Hoa làm đòn đánh to dần: 0 tầng bằng đòn gốc, 20 tầng gấp 1,7 lần */
const powerOf = (ctx: VfxCtx) => kOf(ctx) * (1 + Math.min(ctx.amount ?? 0,
    20) / 30)
const around = (at: Pt, r: number): Pt => {
    const a = rand(0,
            TAU), d = Math.sqrt(Math.random()) * r
    return {
        x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d
    }
}

/** Trái tim hồ ly: điểm trên đường viền, a chạy 0..TAU, r là nửa bề ngang */
const heartAt = (c: Pt, a: number, r: number): Pt => {
    const s = Math.sin(a)
    return {
        x: c.x + s * s * s * r,
        y: c.y - (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16 * r
    }
}

/** Lưỡi lửa ma: vệt hạt mảnh, uốn theo luồng xoáy, bay lên nhẹ */
const flame = (ctx: VfxCtx, over: Partial<DustOpts> = {
}): DustOpts => ({
    color: fireOf(ctx), speed: [10,
        70], gravity: -110, drag: 1.6, flow: 110, life: [260,
        560], size: [13,
        3], streak: 3.4, alpha: .85, additive: false, ...over
})
/** Kim tuyến: hạt rất nhỏ, sáng, sống lâu */
const glitter = (ctx: VfxCtx, over: Partial<DustOpts> = {
}): DustOpts => ({
    color: sparkleOf(ctx), speed: [20,
        130], gravity: -30, drag: 1.5, flow: 70, life: [480,
        1100], size: [4,
        1.2], alpha: 1, ...over
})

/** Đuôi lửa của một viên đạn hồ ly: lõi hạt dày, lưỡi lửa, kim tuyến và sương tím, hạt không bay thẳng */
function tail(ctx: VfxCtx, head: () => Pt, ms: number, width: number) {
    const near = () => around(head(),
        width * .5)
    return Promise.all([
        dustStream(ctx.layer,
            near,
            ms,
            620,
            {
                color: [ctx.color,
                    ctx.color2 ?? ROSE,
                    VIOLET], speed: [4,
                    40], life: [120,
                    300], size: [7,
                    2], alpha: .9, flow: 40, drag: 2.4
            }),
        dustStream(ctx.layer,
            near,
            ms,
            340,
            flame(ctx,
                {
                    size: [width * .62,
                        width * .16]
                })),
        dustStream(ctx.layer,
            near,
            ms,
            240,
            glitter(ctx)),
        dustStream(ctx.layer,
            head,
            ms,
            80,
            {
                puff: true, color: [VIOLET,
                    ctx.color], speed: [4,
                    20], life: [260,
                    520], size: [width * 1.5,
                    width * 3], alpha: .24, flow: 20
            })
    ])
}

/** Quầng sáng mềm bám theo đầu đạn; không có viền */
function glowFollow(ctx: VfxCtx, width: number) {
    const outer = makeSprite(ctx.layer,
        "glow",
        ctx.from.x,
        ctx.from.y,
        VIOLET,
        width * 4.4)
    const inner = makeSprite(ctx.layer,
        "glow",
        ctx.from.x,
        ctx.from.y,
        ctx.color,
        width * 2.4)
    const heart = makeSprite(ctx.layer,
        "glow",
        ctx.from.x,
        ctx.from.y,
        GLITTER,
        width * 1.1)
    outer.alpha = .5
    inner.alpha = .85
    return {
        move(p: Pt) {
            for (const s of [outer,
                inner,
                heart]) {
                if (s.destroyed) continue
                s.x = p.x
                s.y = p.y
            }
        },
        fade() {
            for (const s of [outer,
                inner,
                heart]) if (!s.destroyed) s.alpha = 0
        }
    }
}

/** Nổ lửa hồ ly tại chỗ: cánh năng lượng toả ra, lưỡi lửa bay lên, kim tuyến rơi chậm */
function petalBurst(ctx: VfxCtx, at: Pt, power: number, count: number) {
    return Promise.all([
        bloom(ctx.layer,
            at,
            ctx.color,
            250 * power,
            340),
        bloom(ctx.layer,
            at,
            GLITTER,
            80 * power,
            200),
        mist(ctx.layer,
            at,
            {
                color: [ctx.color,
                    VIOLET], size: 110 * power, alpha: .18, count: 10, speed: [40,
                    130]
            }),
        dustBurst(ctx.layer,
            at,
            {
                count: Math.round(count * .22), color: [ctx.color,
                    VIOLET,
                    0xff8fd0], speed: [90 * power,
                    300 * power], drag: 3, flow: 130, life: [420,
                    820], size: [22,
                    7], streak: 1.7, alpha: .9, spread: 16, additive: false
            }),
        dustBurst(ctx.layer,
            at,
            {
                ...flame(ctx,
                    {
                        speed: [30,
                            140], spread: 40 * power
                    }), count: Math.round(count * .25)
            }),
        dustBurst(ctx.layer,
            at,
            {
                ...glitter(ctx,
                    {
                        speed: [50 * power,
                            220 * power], spread: 24
                    }), count: Math.round(count * .7)
            })
    ])
}

/** Đường cong của một luồng tinh hoa: lệch ngang rồi hút thẳng vào đích */
function bend(a: Pt, b: Pt, t: number, side: number): Pt {
    const dx = b.x - a.x, dy = b.y - a.y
    const len = Math.hypot(dx,
        dy) || 1
    const swing = Math.sin(t * Math.PI) * side * Math.min(170,
        len * .4)
    return {
        x: lerp(a.x,
            b.x,
            t) - dy / len * swing, y: lerp(a.y,
            b.y,
            t) + dx / len * swing
    }
}

/** Nội tại: luồng Tinh Hoa từ `to` (hoặc xung quanh) xoáy vào Ahri; ctx.amount là số Tinh Hoa nhận được */
registerVfx("ahriEssenceGain",
    async (ctx) => {
        const k = kOf(ctx)
        const home = ctx.from
        const total = Math.max(1,
            Math.min(9,
                ctx.amount ?? 1))
        const count = Math.max(ctx.to.length,
            total + 1)
        let beat = false
        await Promise.all([
            ...Array.from({
                length: count
            },
            async (_, i) => {
                const start = ctx.to.length ? ctx.to[i % ctx.to.length] : {
                    x: home.x + Math.cos(i / count * TAU) * 120 * k, y: home.y + Math.sin(i / count * TAU) * 120 * k
                }
                const side = (i % 2 ? 1 : -1) * rand(.25,
                    .85)
                const ms = 560 + i * 34
                let p = {
                    ...start
                }
                await Promise.all([
                    dustStream(ctx.layer,
                        () => p,
                        ms,
                        210,
                        flame(ctx,
                            {
                                speed: [14,
                                    60], gravity: 0, flow: 120, life: [180,
                                    380], size: [13,
                                    3], spread: 15, streak: 2.2
                            })),
                    dustStream(ctx.layer,
                        () => p,
                        ms,
                        130,
                        glitter(ctx,
                            {
                                speed: [6,
                                    50], life: [300,
                                    640], spread: 10
                            })),
                    tween(ms,
                        (t) => {
                            p = bend(start,
                                home,
                                t,
                                side)
                        },
                        ease.in,
                        ctx.layer)
                ])
                if (!beat) {
                    beat = true
                    ctx.onBeat?.()
                }
            }),
            tween(560 + count * 34,
                () => {},
                ease.linear,
                ctx.layer).then(() => Promise.all([
                bloom(ctx.layer,
                    home,
                    ctx.color,
                    (150 + total * 16) * k,
                    360),
                dustBurst(ctx.layer,
                    home,
                    {
                        ...glitter(ctx,
                            {
                                spread: 34 * k
                            }), count: 40 + total * 16
                    })
            ]))
        ])
    })

/** Đòn đánh Tinh Hoa: nhiều Tinh Hoa (ctx.amount) thì cầu to, nhanh và dày lửa hơn */
registerVfx("ahriEssenceBolt",
    async (ctx) => {
        const power = powerOf(ctx)
        const width = 20 * power
        await Promise.all(ctx.to.map(async (to) => {
            const ms = 320 / Math.sqrt(power)
            let p = {
                ...ctx.from
            }
            const glow = glowFollow(ctx,
                width)
            await Promise.all([
                tail(ctx,
                    () => p,
                    ms,
                    width),
                tween(ms,
                    (t) => {
                        p = bend(ctx.from,
                            to,
                            t,
                            .12)
                        glow.move(p)
                    },
                    ease.in,
                    ctx.layer).then(() => {
                    glow.fade()
                    ctx.onBeat?.()
                })
            ])
        }))
    })

/** Đòn đánh Tinh Hoa trúng: càng nhiều Tinh Hoa càng nổ rộng */
registerVfx("ahriEssenceHit",
    async (ctx) => {
        const power = powerOf(ctx)
        if (power >= 1.5) ctx.shake(3 * power,
            160)
        await petalBurst(ctx,
            ctx.from,
            power,
            Math.round(120 * power))
    })

/** Điểm quay đầu của Quả Cầu: quá mục tiêu theo hướng bay */
function orbTurn(caster: Pt, target: Pt, k: number): Pt {
    const dx = target.x - caster.x, dy = target.y - caster.y
    const len = Math.hypot(dx,
        dy) || 1
    return {
        x: target.x + dx / len * ORB_OVERSHOOT * k, y: target.y + dy / len * ORB_OVERSHOOT * k
    }
}

/** Quả Cầu xoay: hai sợi lửa quấn quanh đầu đạn */
function orbSpin(ctx: VfxCtx, head: () => Pt, ms: number, r: number) {
    let spin = 0
    const strand = (phase: number) => () => {
        const p = head()
        return {
            x: p.x + Math.cos(spin + phase) * r, y: p.y + Math.sin(spin + phase) * r
        }
    }
    const opts = flame(ctx,
        {
            speed: [6,
                30], gravity: 0, flow: 46, life: [180,
                340], size: [11,
                3], streak: 2.4
        })
    return Promise.all([
        dustStream(ctx.layer,
            strand(0),
            ms,
            520,
            opts),
        dustStream(ctx.layer,
            strand(Math.PI),
            ms,
            520,
            opts),
        tween(ms,
            (t) => { spin = t * TAU * 3 },
            ease.linear,
            ctx.layer)
    ])
}

/** Q lượt đi: cầu bay trúng mục tiêu (báo nhịp) rồi lướt quá và chậm lại, sẵn sàng quay về */
registerVfx("ahriOrbOut",
    async (ctx) => {
        const k = kOf(ctx)
        const width = 26 * k
        const to = ctx.to[0] ?? ctx.from
        const past = orbTurn(ctx.from,
            to,
            k)
        const hitMs = 380
        let p = {
            ...ctx.from
        }
        const glow = glowFollow(ctx,
            width)
        await Promise.all([
            tail(ctx,
                () => p,
                hitMs + AHRI_ORB_TURN_MS,
                width),
            orbSpin(ctx,
                () => p,
                hitMs + AHRI_ORB_TURN_MS,
                width * .9),
            tween(hitMs,
                (t) => {
                    p = {
                        x: lerp(ctx.from.x,
                            to.x,
                            t), y: lerp(ctx.from.y,
                            to.y,
                            t)
                    }
                    glow.move(p)
                },
                ease.inOut,
                ctx.layer).then(() => {
                ctx.onBeat?.()
                return tween(AHRI_ORB_TURN_MS,
                    (t) => {
                        p = {
                            x: lerp(to.x,
                                past.x,
                                t), y: lerp(to.y,
                                past.y,
                                t)
                        }
                        glow.move(p)
                    },
                    ease.out,
                    ctx.layer)
            }).then(() => glow.fade())
        ])
    })

/** Q lượt về: from là mục tiêu, to[0] là Ahri. Cầu tăng tốc xuyên lại mục tiêu (báo nhịp) rồi tan vào Ahri */
registerVfx("ahriOrbReturn",
    async (ctx) => {
        const k = kOf(ctx)
        const width = 24 * k
        const target = ctx.from
        const home = ctx.to[0] ?? ctx.from
        const start = orbTurn(home,
            target,
            k)
        const ms = 560
        const full = Math.hypot(home.x - start.x,
            home.y - start.y) || 1
        const contact = ORB_OVERSHOOT * k / full
        let p = {
            ...start
        }
        let beat = false
        const glow = glowFollow(ctx,
            width)
        await Promise.all([
            tail(ctx,
                () => p,
                ms,
                width),
            orbSpin(ctx,
                () => p,
                ms,
                width * .9),
            tween(ms,
                (t) => {
                    p = {
                        x: lerp(start.x,
                            home.x,
                            t), y: lerp(start.y,
                            home.y,
                            t)
                    }
                    glow.move(p)
                    if (!beat && t >= contact) {
                        beat = true
                        ctx.onBeat?.()
                    }
                },
                ease.in,
                ctx.layer).then(() => {
                glow.fade()
                return Promise.all([
                    bloom(ctx.layer,
                        home,
                        ctx.color,
                        170 * k,
                        300),
                    dustBurst(ctx.layer,
                        home,
                        {
                            ...glitter(ctx,
                                {
                                    spread: 26 * k
                                }), count: 70
                        })
                ])
            })
        ])
    })

/** Q trúng: cánh lửa toả ra. Màu theo ctx: lượt đi hồng, lượt về trắng */
registerVfx("ahriOrbHit",
    async (ctx) => {
        const k = kOf(ctx)
        await petalBurst(ctx,
            ctx.from,
            1.2 * k,
            Math.round(210 * ctx.intensity))
    })

/** Vệt lửa thật dài, mỏng, nằm theo hướng bay; đặc trưng khi lướt */
const speedStreak = (color: number[], dir: number, spread: number, size: number): DustOpts => ({
    color, speed: [120,
        420], angle: [dir + Math.PI - .32,
        dir + Math.PI + .32], drag: 3, flow: 34, life: [240,
        540], size: [size,
        size * .3], streak: 6, alpha: .9, spread, additive: false
})

/** Dấu lửa lướt theo một lá tướng: có ctx.tether thì bám lá thật, không thì tự chạy từ from tới to[0] */
function dashTrail(ctx: VfxCtx, color: number[], perSec: number, size: number) {
    const to = ctx.to[0] ?? ctx.from
    const dir = Math.atan2(to.y - ctx.from.y,
        to.x - ctx.from.x)
    let p = {
        ...ctx.from
    }
    const where = () => ctx.tether?.target() ?? p
    return Promise.all([
        dustStream(ctx.layer,
            where,
            AHRI_DASH_MS,
            perSec,
            speedStreak(color,
                dir,
                40 * kOf(ctx),
                size)),
        dustStream(ctx.layer,
            where,
            AHRI_DASH_MS,
            perSec * .5,
            glitter(ctx,
                {
                    spread: 46 * kOf(ctx), speed: [10,
                        70]
                })),
        tween(AHRI_DASH_MS,
            (t) => {
                p = {
                    x: lerp(ctx.from.x,
                        to.x,
                        t), y: lerp(ctx.from.y,
                        to.y,
                        t)
                }
            },
            (t) => 1 - Math.pow(1 - t,
                3),
            ctx.layer)
    ])
}

/** E: Ahri lướt. Có to[0] thì kéo vệt lửa theo đường lướt và báo nhịp phóng lưỡi lửa để chạm đúng lúc đáp; không có thì chỉ bùng lửa tại chỗ rồi nhường cho lá tướng di chuyển */
registerVfx("ahriDash",
    async (ctx) => {
        const k = kOf(ctx)
        const ignite = Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                230 * k,
                300),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...flame(ctx,
                        {
                            speed: [50,
                                220], spread: 36 * k
                        }), count: 90
                })
        ])
        if (ctx.to.length) await Promise.all([
            ignite,
            dashTrail(ctx,
                fireOf(ctx),
                420,
                10),
            tween(AHRI_DASH_MS - AHRI_LASH_MS,
                () => {},
                ease.linear,
                ctx.layer).then(() => ctx.onBeat?.())
        ])
        else await ignite
    })

/** E: đồng minh nhường đường, làn lửa tím mỏng hơn bám theo */
registerVfx("ahriDashYield",
    async (ctx) => {
        await dashTrail(ctx,
            [VIOLET,
                LILAC,
                ctx.color2 ?? ROSE],
            200,
            7)
    })

/** E: lưỡi lửa rất nhanh phóng vào tướng đối diện vị trí mới */
registerVfx("ahriFoxLash",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all(ctx.to.map(async (to) => {
            const dir = Math.atan2(to.y - ctx.from.y,
                to.x - ctx.from.x)
            let p = {
                ...ctx.from
            }
            await Promise.all([
                dustStream(ctx.layer,
                    () => around(p,
                        8 * k),
                    AHRI_LASH_MS,
                    900,
                    speedStreak(fireOf(ctx),
                        dir,
                        4,
                        8 * k)),
                tween(AHRI_LASH_MS,
                    (t) => {
                        p = {
                            x: lerp(ctx.from.x,
                                to.x,
                                t), y: lerp(ctx.from.y,
                                to.y,
                                t)
                        }
                    },
                    ease.in,
                    ctx.layer).then(() => ctx.onBeat?.())
            ])
        }))
    })

/** E trúng: lửa hồ ly bung ở tướng đối diện */
registerVfx("ahriFoxHit",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(4,
            150)
        await petalBurst(ctx,
            ctx.from,
            1.3 * k,
            Math.round(230 * ctx.intensity))
    })

/** R mở màn: lửa hồng tụ thành trái tim trước ngực Ahri */
registerVfx("ahriCharmCast",
    async (ctx) => {
        const k = kOf(ctx)
        const r = 58 * k
        let grow = 0
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                300 * k,
                520),
            dustStream(ctx.layer,
                () => heartAt(ctx.from,
                    rand(0,
                        TAU),
                    r * (1.5 - grow * .5) + rand(-9,
                        9)),
                420,
                2200,
                {
                    color: fireOf(ctx), speed: [2,
                        16], life: [140,
                        320], size: [9,
                        2.5], alpha: .9, flow: 34, drag: 3
                }),
            tween(420,
                (t) => { grow = t },
                ease.out,
                ctx.layer)
        ])
    })

/** R: trái tim lửa hồ ly bay tới, viền là lửa hạt nên không có nét cứng; chạm mục tiêu là báo nhịp */
registerVfx("ahriCharmHeart",
    async (ctx) => {
        const k = kOf(ctx)
        const r = 54 * k
        const ms = 520
        await Promise.all(ctx.to.map(async (to) => {
            let p = {
                ...ctx.from
            }
            let pulse = 1
            const glow = glowFollow(ctx,
                r * .55)
            await Promise.all([
                tail(ctx,
                    () => p,
                    ms,
                    12 * k),
                dustStream(ctx.layer,
                    () => around(heartAt(p,
                        rand(0,
                            TAU),
                        r * pulse),
                    9),
                    ms,
                    2400,
                    {
                        color: [ctx.color,
                            ctx.color2 ?? ROSE,
                            VIOLET], speed: [2,
                            22], life: [100,
                            230], size: [9,
                            2.5], alpha: .95, flow: 30, drag: 3
                    }),
                dustStream(ctx.layer,
                    () => around(p,
                        r * .55),
                    ms,
                    460,
                    {
                        color: [ctx.color,
                            ROSE], speed: [2,
                            14], life: [120,
                            240], size: [12,
                            4], alpha: .55, flow: 12, drag: 3, additive: false
                    }),
                tween(ms,
                    (t) => {
                        p = bend(ctx.from,
                            to,
                            t,
                            .1)
                        pulse = 1 + Math.sin(t * TAU * 2.5) * .12
                        glow.move(p)
                    },
                    ease.inOut,
                    ctx.layer).then(() => {
                    glow.fade()
                    ctx.onBeat?.()
                })
            ])
        }))
    })

/** R trúng: trái tim vỡ thành cánh lửa hồng, sát thương và Say Mê cùng đáp */
registerVfx("ahriCharmHit",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(6,
            220)
        const r = 60 * k
        await Promise.all([
            petalBurst(ctx,
                ctx.from,
                1.15 * k,
                Math.round(130 * ctx.intensity)),
            dustStream(ctx.layer,
                () => heartAt(ctx.from,
                    rand(0,
                        TAU),
                    r),
                90,
                2800,
                {
                    color: [ctx.color,
                        ctx.color2 ?? ROSE,
                        GLITTER], speed: [90,
                        240], gravity: -60, life: [420,
                        820], size: [11,
                        3], alpha: 1, flow: 60, drag: 2
                })
        ])
    })

/** Say Mê: làn lửa hồng nhẹ bám lá tướng. Có ctx.tether thì bám theo và chạy tới khi được thả (tối đa AURA_MAX_MS); không thì chạy ngắn tại chỗ */
registerVfx("ahriCharmAura",
    async (ctx) => {
        const k = kOf(ctx)
        const at = () => ctx.tether?.target() ?? ctx.from
        const limit = ctx.tether ? AURA_MAX_MS : AURA_DEFAULT_MS
        const body = () => {
            const p = at()
            return {
                x: p.x + rand(-54,
                    54) * k, y: p.y + rand(-20,
                    78) * k
            }
        }
        const pieces: Promise<unknown>[] = []
        let el = 0
        while (!ctx.layer.destroyed && !ctx.tether?.released() && el < limit) {
            pieces.push(dustStream(ctx.layer,
                body,
                360,
                58,
                flame(ctx,
                    {
                        speed: [18,
                            62], angle: [-Math.PI * .62,
                            -Math.PI * .38], gravity: -70, flow: 44, life: [620,
                            1200], size: [15,
                            4], streak: 2.4, alpha: .72
                    })),
            dustStream(ctx.layer,
                body,
                360,
                44,
                glitter(ctx,
                    {
                        speed: [12,
                            46], angle: [-Math.PI * .7,
                            -Math.PI * .3], life: [700,
                            1300]
                    })),
            bloom(ctx.layer,
                at(),
                ctx.color,
                190 * k,
                720))
            await tween(360,
                () => {},
                ease.linear,
                ctx.layer)
            el += 360
        }
        await Promise.all(pieces)
    })
