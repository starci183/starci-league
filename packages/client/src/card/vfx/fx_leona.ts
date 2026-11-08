// VFX riêng của Leona, chất liệu ÁNH MẶT TRỜI: tia nắng dài, mảnh giáp vàng sắc, than hồng, quầng nhật hoa. Không dùng nét vẽ hình học.
// Mỗi hiệu ứng chỉ dựa vào VfxCtx và tự dọn khi layer bị huỷ; trúng là báo ctx.onBeat, không chờ đuôi hạt tan.
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
const PALE = 0xfff3b8
const AMBER = 0xff9a1f
const EMBER = 0xff6a14
const WHITE = 0xfffdf0
const SHADOW = 0x160b1f
const ASH = [0x8f857b,
    0x5e5650,
    0x3e3936]
/** Thời gian mở màn, khớp để lá đáp đúng lúc mảnh giáp khoá vào */
export const LEONA_PLATE_MS = 340
const FLARE_FALL_MS = 560
const WINDUP_MAX_MS = 3000
const WINDUP_STEP_MS = 90
/** Mũi đòn gồng vươn tới chừng này quãng đường rồi gãy, không bao giờ chạm mục tiêu */
const WINDUP_REACH = .4

const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
const solarOf = (ctx: VfxCtx) => [ctx.color,
    ctx.color2 ?? PALE,
    AMBER,
    WHITE]
const around = (at: Pt, r: number): Pt => {
    const a = rand(0,
            TAU), d = Math.sqrt(Math.random()) * r
    return {
        x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d
    }
}
const onCard = (at: Pt, k: number): Pt => ({
    x: at.x + rand(-58,
        58) * k, y: at.y + rand(-74,
        84) * k
})
const along = (a: Pt, b: Pt, t: number): Pt => ({
    x: lerp(a.x,
        b.x,
        t), y: lerp(a.y,
        b.y,
        t)
})

/** Chạm mục tiêu đầu tiên là báo nhịp, chỉ một lần cho mỗi lần phát */
const beatOnce = (ctx: VfxCtx) => {
    let done = false
    return () => {
        if (done) return
        done = true
        ctx.onBeat?.()
    }
}

/** Tia nắng dài bắn ra từ tâm */
const rays = (ctx: VfxCtx, at: Pt, count: number, power: number) => dustBurst(ctx.layer,
    at,
    {
        count, color: [WHITE,
            PALE,
            ctx.color], speed: [520 * power,
            1500 * power], drag: 5.4, flow: 0, life: [230,
            500], size: [15,
            4], streak: 9, alpha: 1, spread: 10
    })

/** Mảnh giáp vàng sắc văng ra rồi rơi */
const shards = (ctx: VfxCtx, at: Pt, count: number, power: number) => dustBurst(ctx.layer,
    at,
    {
        count, blade: true, color: [ctx.color,
            PALE,
            AMBER,
            WHITE], speed: [220 * power,
            680 * power], gravity: 320, drag: 2.6, flow: 12, life: [340,
            720], size: [46,
            14], alpha: 1, spread: 16, additive: false
    })

/** Than hồng và bụi nắng, sống lâu nhất */
const embers = (ctx: VfxCtx, at: Pt, count: number, power: number) => dustBurst(ctx.layer,
    at,
    {
        count, color: [ctx.color,
            AMBER,
            EMBER,
            PALE], speed: [60 * power,
            460 * power], gravity: 260, drag: 1.7, flow: 56, life: [520,
            1150], size: [7,
            2], alpha: 1, spread: 26
    })

/** Bùng nắng tại chỗ: lõi trắng, quầng vàng, tia, mảnh giáp, than */
function flareBurst(ctx: VfxCtx, at: Pt, power: number, count: number) {
    return Promise.all([
        bloom(ctx.layer,
            at,
            ctx.color,
            430 * power,
            420),
        bloom(ctx.layer,
            at,
            WHITE,
            240 * power,
            240),
        mist(ctx.layer,
            at,
            {
                color: [AMBER,
                    ctx.color], size: 130 * power, alpha: .34, count: 10, speed: [50,
                    170]
            }),
        rays(ctx,
            at,
            Math.round(count * .3),
            power),
        shards(ctx,
            at,
            Math.round(count * .16),
            power),
        embers(ctx,
            at,
            count,
            power)
    ])
}

/** Quầng sáng mềm bám theo đầu đạn */
function glowFollow(ctx: VfxCtx, width: number) {
    const parts = [makeSprite(ctx.layer,
        "glow",
        ctx.from.x,
        ctx.from.y,
        AMBER,
        width * 4.6),
    makeSprite(ctx.layer,
        "glow",
        ctx.from.x,
        ctx.from.y,
        ctx.color,
        width * 2.8),
    makeSprite(ctx.layer,
        "glow",
        ctx.from.x,
        ctx.from.y,
        WHITE,
        width * 1.5)]
    parts[0].alpha = .55
    parts[1].alpha = .9
    return {
        move(p: Pt) {
            for (const s of parts) {
                if (s.destroyed) continue
                s.x = p.x
                s.y = p.y
            }
        },
        fade() {
            for (const s of parts) if (!s.destroyed) s.alpha = 0
        }
    }
}

/** Cánh mặt trời của tấm khiên: mảnh vàng dài toả theo 8 hướng quanh head, đúng hình khiên trên icon */
function sunPetals(ctx: VfxCtx, head: () => Pt, ms: number, r: number, perSec: number) {
    return Promise.all(Array.from({
        length: 8
    },
    (_, i) => {
        const a = i / 8 * TAU + .2
        return dustStream(ctx.layer,
            () => {
                const p = head()
                return {
                    x: p.x + Math.cos(a) * r * .5, y: p.y + Math.sin(a) * r * .5
                }
            },
            ms,
            perSec,
            {
                blade: true, color: [ctx.color,
                    PALE,
                    AMBER], speed: [r * 1.4,
                    r * 2.8], angle: [a - .1,
                    a + .1], drag: 2, flow: 0, life: [120,
                    220], size: [r * 1.15,
                    r * .5], alpha: 1, additive: false
            } satisfies DustOpts)
    }))
}

/** Mảnh giáp từ ngoài bay vào, khoá lên lá tướng đúng LEONA_PLATE_MS */
function plateIn(ctx: VfxCtx, at: Pt, count: number, r: number) {
    return Promise.all(Array.from({
        length: count
    },
    async (_, i) => {
        const a = i / count * TAU + rand(-.12,
            .12)
        const at2 = {
            x: at.x + Math.cos(a) * r * 1.2, y: at.y + Math.sin(a) * r * 1.5
        }
        const inward = Math.atan2(at.y - at2.y,
            at.x - at2.x)
        const stagger = i % 3 * 34
        await sleep(stagger)
        if (ctx.layer.destroyed) return
        await dustBurst(ctx.layer,
            at2,
            {
                count: 12, blade: true, color: [ctx.color,
                    PALE,
                    AMBER], speed: [r * 3.4,
                    r * 5], angle: [inward - .07,
                    inward + .07], drag: .4, flow: 0, life: [LEONA_PLATE_MS - stagger + 90,
                    LEONA_PLATE_MS - stagger + 200], size: [76,
                    40], alpha: 1, spread: 16, additive: false
            })
    }))
}

/** Quầng vàng dày phủ cả lá tướng, sáng nhanh rồi lịm chậm: phần "giáp nắng" nhìn thấy được ở cỡ nhỏ */
function heldGlow(ctx: VfxCtx, at: Pt, size: number, ms: number) {
    const parts = [makeSprite(ctx.layer,
        "glow",
        at.x,
        at.y,
        AMBER,
        size * 1.5),
    makeSprite(ctx.layer,
        "glow",
        at.x,
        at.y,
        ctx.color,
        size)]
    for (const s of parts) s.alpha = 0
    return tween(ms,
        (t) => {
            const a = Math.min(1,
                t * 8) * Math.pow(1 - t,
                1.3)
            parts.forEach((s, i) => { if (!s.destroyed) s.alpha = a * (i ? .95 : .6) })
        },
        ease.linear,
        ctx.layer)
}

/** Lớp nắng ôm lá tướng sau khi mảnh giáp khoá: bụi vàng nổi lên khắp thân */
function plateGlow(ctx: VfxCtx, at: Pt, ms: number, perSec: number) {
    const k = kOf(ctx)
    return Promise.all([
        heldGlow(ctx,
            at,
            330 * k,
            ms * 1.15),
        bloom(ctx.layer,
            at,
            ctx.color,
            380 * k,
            ms),
        bloom(ctx.layer,
            at,
            WHITE,
            210 * k,
            ms * .5),
        rays(ctx,
            at,
            130,
            .9 * k),
        dustStream(ctx.layer,
            () => onCard(at,
                k),
            ms,
            perSec,
            {
                color: solarOf(ctx), speed: [40,
                    150], angle: [-Math.PI * .62,
                    -Math.PI * .38], gravity: -110, life: [420,
                    860], size: [8,
                    2], alpha: 1, flow: 40, drag: 1.2
            }),
        dustStream(ctx.layer,
            () => onCard(at,
                k),
            ms * .7,
            130,
            {
                blade: true, color: [ctx.color,
                    PALE], speed: [30,
                    90], angle: [-Math.PI * .6,
                    -Math.PI * .4], life: [240,
                    460], size: [38,
                    14], alpha: .95, flow: 6, drag: 1, additive: false
            })
    ])
}

/** Nội tại Giáp Mặt Trời: vào bàn, giáp nắng khoá lên thân lá tướng rồi toả sáng; nhịp ở lúc khoá */
registerVfx("leonaSunPlate",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            plateIn(ctx,
                ctx.from,
                18,
                118 * k),
            sleep(LEONA_PLATE_MS).then(() => {
                if (ctx.layer.destroyed) return undefined
                ctx.onBeat?.()
                return plateGlow(ctx,
                    ctx.from,
                    1000,
                    1700)
            })
        ])
    })

/** Q mở màn: tấm khiên bừng sáng trên tay Leona */
registerVfx("leonaShieldFlare",
    async (ctx) => {
        const k = kOf(ctx)
        const ms = 400
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                340 * k,
                ms + 120),
            bloom(ctx.layer,
                ctx.from,
                WHITE,
                170 * k,
                ms),
            sunPetals(ctx,
                () => ctx.from,
                ms,
                66 * k,
                170),
            dustStream(ctx.layer,
                () => around(ctx.from,
                    46 * k),
                ms,
                1100,
                {
                    color: solarOf(ctx), speed: [10,
                        60], life: [120,
                        260], size: [9,
                        3], alpha: 1, flow: 30, drag: 2.4
                }),
            sleep(ms).then(() => ctx.onBeat?.())
        ])
    })

/** Q bay: tấm khiên nắng tròn, sáng rực, lao thẳng vào tướng đối diện; chạm là báo nhịp */
registerVfx("leonaShieldBash",
    async (ctx) => {
        const k = kOf(ctx)
        const land = beatOnce(ctx)
        const ms = 340
        await Promise.all(ctx.to.map(async (to) => {
            const back = Math.atan2(ctx.from.y - to.y,
                ctx.from.x - to.x)
            let p = {
                ...ctx.from
            }
            const glow = glowFollow(ctx,
                48 * k)
            await Promise.all([
                sunPetals(ctx,
                    () => p,
                    ms,
                    74 * k,
                    340),
                dustStream(ctx.layer,
                    () => around(p,
                        52 * k),
                    ms,
                    2200,
                    {
                        color: solarOf(ctx), speed: [4,
                            40], life: [50,
                            130], size: [12,
                            4], alpha: 1, flow: 16, drag: 3
                    }),
                dustStream(ctx.layer,
                    () => around(p,
                        40 * k),
                    ms,
                    300,
                    {
                        color: [ctx.color,
                            PALE], speed: [200,
                            420], angle: [back - .12,
                            back + .12], life: [70,
                            150], size: [9,
                            3], streak: 6, alpha: .9, flow: 0, drag: 3
                    }),
                tween(ms,
                    (t) => {
                        p = along(ctx.from,
                            to,
                            t)
                        glow.move(p)
                    },
                    ease.inOut,
                    ctx.layer).then(() => {
                    glow.fade()
                    land()
                })
            ])
        }))
    })

/** Q trúng: khiên đập, nắng và mảnh vàng toé ra */
registerVfx("leonaShieldHit",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(6,
            200)
        await flareBurst(ctx,
            ctx.from,
            1.1 * k,
            Math.round(520 * ctx.intensity))
    })

/** E mở màn, dấu Quick: hai dải nắng xoắn ốc từ ngoài hút vào thân Leona, bán kính rối nên không thành vòng */
registerVfx("leonaEclipseGuard",
    async (ctx) => {
        const k = kOf(ctx)
        const ms = 300
        let t = 0
        const strand = (phase: number) => () => {
            const a = t * TAU * .85 + phase
            const r = lerp(1.25,
                .3,
                t) * rand(.72,
                1.2)
            return {
                x: ctx.from.x + Math.cos(a) * 104 * k * r, y: ctx.from.y + Math.sin(a) * 128 * k * r
            }
        }
        const opts: DustOpts = {
            color: solarOf(ctx), speed: [20,
                90], life: [90,
                200], size: [13,
                3], streak: 3, alpha: 1, spread: 20, flow: 70, drag: 2
        }
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                320 * k,
                ms + 100),
            ...[0,
                Math.PI].map((phase) => dustStream(ctx.layer,
                strand(phase),
                ms,
                1500,
                opts)),
            tween(ms,
                (v) => { t = v },
                ease.linear,
                ctx.layer).then(() => ctx.onBeat?.())
        ])
    })

/** E bay: lưỡi nắng phóng rất nhanh như icon chiêu; chạm là báo nhịp */
registerVfx("leonaSunBlade",
    async (ctx) => {
        const k = kOf(ctx)
        const land = beatOnce(ctx)
        const ms = 210
        await Promise.all(ctx.to.map(async (to) => {
            const dir = Math.atan2(to.y - ctx.from.y,
                to.x - ctx.from.x)
            let p = {
                ...ctx.from
            }
            const glow = glowFollow(ctx,
                22 * k)
            await Promise.all([
                dustStream(ctx.layer,
                    () => around(p,
                        13 * k),
                    ms,
                    620,
                    {
                        blade: true, color: [WHITE,
                            PALE,
                            ctx.color], speed: [700,
                            1200], angle: [dir - .05,
                            dir + .05], flow: 0, drag: 4, life: [120,
                            240], size: [92,
                            32], alpha: 1, additive: false
                    }),
                dustStream(ctx.layer,
                    () => around(p,
                        26 * k),
                    ms,
                    1500,
                    {
                        color: solarOf(ctx), speed: [40,
                            220], angle: [dir + Math.PI - .4,
                            dir + Math.PI + .4], life: [140,
                            320], size: [8,
                            2], streak: 5, alpha: 1, flow: 12, drag: 2
                    }),
                tween(ms,
                    (t) => {
                        p = along(ctx.from,
                            to,
                            t)
                        glow.move(p)
                    },
                    ease.in,
                    ctx.layer).then(() => {
                    glow.fade()
                    land()
                })
            ])
        }))
    })

/** Nhật hoa: vành lửa rối toả ra từ mép đĩa tối, độ dài từng lưỡi lửa khác nhau nên không thành vòng tròn */
function corona(ctx: VfxCtx, at: Pt, r: number) {
    return Promise.all(Array.from({
        length: 44
    },
    (_, i) => {
        const a = i / 44 * TAU + rand(-.07,
            .07)
        return dustBurst(ctx.layer,
            {
                x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r
            },
            {
                count: 15, color: [WHITE,
                    PALE,
                    ctx.color,
                    AMBER], speed: [120,
                    rand(380,
                        860)], angle: [a - .2,
                    a + .2], drag: 3.8, flow: 34, life: [260,
                    640], size: [15,
                    4], streak: 4.4, alpha: 1, spread: 8
            })
    }))
}

/** E trúng: đĩa tối che nắng, nhật hoa bùng quanh mép rồi nổ. Sát thương và Choáng cùng nhịp */
registerVfx("leonaEclipseHit",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(5,
            180)
        const size = 300 * k
        // đĩa tối dựng sau cùng để nằm trên tia nắng: nhìn thấy mặt trời bị che, nhật hoa chỉ loé quanh mép
        const under = [
            bloom(ctx.layer,
                ctx.from,
                EMBER,
                560 * k,
                620),
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                380 * k,
                460),
            rays(ctx,
                ctx.from,
                70,
                1.1 * k),
            corona(ctx,
                ctx.from,
                58 * k),
            embers(ctx,
                ctx.from,
                300,
                1.1 * k)
        ]
        const disc = makeSprite(ctx.layer,
            "glow",
            ctx.from.x,
            ctx.from.y,
            SHADOW,
            size,
            false)
        const discIn = makeSprite(ctx.layer,
            "glow",
            ctx.from.x,
            ctx.from.y,
            SHADOW,
            size * .7,
            false)
        disc.alpha = 0
        discIn.alpha = 0
        await Promise.all([
            ...under,
            tween(720,
                (t) => {
                    const a = Math.min(1,
                        t * 14) * Math.pow(1 - t,
                        1.1)
                    for (const s of [disc,
                        discIn]) if (!s.destroyed) s.alpha = a
                },
                ease.linear,
                ctx.layer)
        ])
    })

/** E: Leona nhận Giáp, mảnh giáp nắng khoá lên thân */
registerVfx("leonaEclipseArmor",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            plateIn(ctx,
                ctx.from,
                12,
                100 * k),
            sleep(LEONA_PLATE_MS - 120).then(() => {
                if (ctx.layer.destroyed) return undefined
                return plateGlow(ctx,
                    ctx.from,
                    720,
                    800)
            })
        ])
    })

/** Choáng: ba đốm nắng rời nhau chao trên đầu tướng, đuôi ngắn nên không thành vòng; bụi vàng rơi nhẹ xuống lá. Cỡ cố định để chiêu cuối không phình */
registerVfx("leonaStun",
    async (ctx) => {
        const ms = 1150
        const top = {
            x: ctx.from.x, y: ctx.from.y - 92
        }
        let spin = 0
        const fleck = (phase: number) => () => ({
            x: top.x + Math.cos(spin + phase) * 50, y: top.y + Math.sin(spin + phase) * 15
        })
        const opts: DustOpts = {
            color: [WHITE,
                PALE,
                ctx.color], speed: [2,
                14], life: [70,
                170], size: [13,
                4], alpha: 1, spread: 5, flow: 8, drag: 3
        }
        await Promise.all([
            ...[0,
                1,
                2].map((i) => dustStream(ctx.layer,
                fleck(i / 3 * TAU),
                ms,
                340,
                opts)),
            dustStream(ctx.layer,
                () => ({
                    x: top.x + rand(-56,
                        56), y: top.y + rand(-8,
                        16)
                }),
                ms,
                150,
                {
                    color: [ctx.color,
                        PALE], speed: [4,
                        30], gravity: 200, life: [300,
                        620], size: [5,
                        1.5], alpha: 1, flow: 24
                }),
            tween(ms,
                (t) => { spin = t * TAU * 1.5 },
                ease.linear,
                ctx.layer)
        ])
    })

/** R mở màn: Leona giơ kiếm, nắng từ thân vọt thẳng lên trời */
registerVfx("leonaSolarCall",
    async (ctx) => {
        const k = kOf(ctx)
        const ms = 520
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                300 * k,
                ms + 180),
            dustStream(ctx.layer,
                () => ({
                    x: ctx.from.x + rand(-52,
                        52) * k, y: ctx.from.y + rand(-30,
                        84) * k
                }),
                ms,
                1700,
                {
                    color: solarOf(ctx), speed: [620,
                        1300], angle: [-Math.PI / 2 - .05,
                        -Math.PI / 2 + .05], drag: .3, flow: 6, life: [240,
                        520], size: [10,
                        3], streak: 8, alpha: 1
                }),
            dustStream(ctx.layer,
                () => onCard(ctx.from,
                    k),
                ms,
                700,
                {
                    color: solarOf(ctx), speed: [20,
                        70], gravity: -260, life: [240,
                        520], size: [8,
                        2], alpha: 1, flow: 40
                }),
            sleep(ms).then(() => ctx.onBeat?.())
        ])
    })

/** Dải nắng mềm từ trời xuống, chỉ là quầng kéo dài nên không có viền cứng */
function beam(ctx: VfxCtx, sky: Pt, width: number) {
    const parts = [
        [AMBER,
            width * 1.7,
            .5],
        [ctx.color,
            width,
            .85],
        [WHITE,
            width * .46,
            1]
    ].map(([tint,
        w,
        alpha]) => {
        const s = makeSprite(ctx.layer,
            "glow",
            sky.x,
            sky.y,
            tint,
            w)
        s.alpha = alpha
        return {
            s, w, alpha
        }
    })
    return {
        stretch(head: Pt) {
            const dx = head.x - sky.x, dy = head.y - sky.y
            const len = Math.hypot(dx,
                dy)
            for (const { s, w } of parts) {
                if (s.destroyed) continue
                s.x = (sky.x + head.x) / 2
                s.y = (sky.y + head.y) / 2
                s.rotation = Math.atan2(dy,
                    dx) + Math.PI / 2
                s.width = w
                s.height = len * 1.5
            }
        },
        fade(t: number) {
            for (const { s, w, alpha } of parts) {
                if (s.destroyed) continue
                s.alpha = alpha * (1 - t) * (1 - t)
                s.width = w * (1 + t * .8)
            }
        }
    }
}

/** R: cột nắng rơi từ trời, xiên như icon chiêu, xuống từng mục tiêu; nhiều mục tiêu thì các cột liền thành màn nắng phủ cả hàng. Chạm là báo nhịp */
registerVfx("leonaSolarFlare",
    async (ctx) => {
        const k = kOf(ctx)
        const land = beatOnce(ctx)
        await Promise.all(ctx.to.map(async (to) => {
            const sky = {
                x: to.x - 150, y: -70
            }
            const dir = Math.atan2(to.y - sky.y,
                to.x - sky.x)
            const nx = -Math.sin(dir), ny = Math.cos(dir)
            let p = {
                ...sky
            }
            const inside = () => {
                const u = rand(0,
                        1), side = rand(-48,
                        48) * k
                return {
                    x: lerp(sky.x,
                        p.x,
                        u) + nx * side, y: lerp(sky.y,
                        p.y,
                        u) + ny * side
                }
            }
            const shaft = beam(ctx,
                sky,
                132 * k)
            shaft.stretch(p)
            await Promise.all([
                bloom(ctx.layer,
                    to,
                    ctx.color,
                    300 * k,
                    FLARE_FALL_MS + 160),
                dustStream(ctx.layer,
                    inside,
                    FLARE_FALL_MS,
                    2300,
                    {
                        color: solarOf(ctx), speed: [760,
                            1500], angle: [dir - .03,
                            dir + .03], drag: .2, flow: 0, life: [150,
                            320], size: [11,
                            3], streak: 9, alpha: 1
                    }),
                dustStream(ctx.layer,
                    () => around(p,
                        54 * k),
                    FLARE_FALL_MS,
                    1600,
                    {
                        color: solarOf(ctx), speed: [40,
                            220], life: [140,
                            320], size: [15,
                            4], alpha: 1, flow: 50, drag: 2
                    }),
                tween(FLARE_FALL_MS,
                    (t) => {
                        p = along(sky,
                            to,
                            t)
                        shaft.stretch(p)
                    },
                    (t) => Math.pow(t,
                        1.5),
                    ctx.layer).then(() => {
                    land()
                    return tween(300,
                        (t) => { shaft.fade(t) },
                        ease.out,
                        ctx.layer)
                })
            ])
        }))
    })

/** R trúng từng tướng: nắng đổ sập, vệt vàng nứt toả ngang mặt bàn như icon chiêu */
registerVfx("leonaFlareHit",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(9,
            300)
        await Promise.all([
            flareBurst(ctx,
                ctx.from,
                k,
                Math.round(300 * ctx.intensity)),
            ...[0,
                Math.PI].map((a) => dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 70, color: [PALE,
                        ctx.color,
                        AMBER,
                        EMBER], speed: [420,
                        1050], angle: [a - .3,
                        a + .3], drag: 3.6, flow: 40, life: [320,
                        720], size: [11,
                        3], streak: 6, alpha: 1, spread: 18
                }))
        ])
    })

/** Điểm trên mũi đòn đang gồng: u chạy từ thân kẻ đánh tới đầu mũi, grow 0..1 là mũi đòn đã vươn tới đâu */
const strikeTip = (from: Pt, to: Pt, u: number, grow: number) => along(from,
    to,
    .16 + u * grow * WINDUP_REACH)

/** Địch gồng đòn: khí tụ trên thân, mũi đòn đỏ vươn dần về phía mục tiêu, phát tới khi ctx.tether thả (đòn bị huỷ hoặc đã đánh) */
registerVfx("leonaStrikeWindup",
    async (ctx) => {
        const k = kOf(ctx)
        const at = () => ctx.tether?.target() ?? ctx.from
        const to = ctx.to[0] ?? {
            x: ctx.from.x, y: ctx.from.y - 200
        }
        const dir = Math.atan2(to.y - ctx.from.y,
            to.x - ctx.from.x)
        const color = [ctx.color,
            ctx.color2 ?? 0xffffff]
        const limit = ctx.tether ? WINDUP_MAX_MS : 900
        let grow = 0
        const pieces: Promise<unknown>[] = [bloom(ctx.layer,
            ctx.from,
            ctx.color,
            300 * k,
            limit * .5)]
        for (let el = 0; !ctx.layer.destroyed && !ctx.tether?.released() && el < limit; el += WINDUP_STEP_MS) {
            grow = Math.min(1,
                el / 760)
            const reach = grow
            pieces.push(dustStream(ctx.layer,
                () => onCard(at(),
                    k),
                WINDUP_STEP_MS,
                900,
                {
                    color, speed: [10,
                        70], gravity: -140, life: [200,
                        420], size: [9,
                        2], alpha: 1, flow: 50
                }),
            dustStream(ctx.layer,
                () => around(strikeTip(at(),
                    to,
                    rand(0,
                        1),
                    reach),
                16 * k),
                WINDUP_STEP_MS,
                1300,
                {
                    blade: true, color, speed: [50,
                        190], angle: [dir - .05,
                        dir + .05], life: [90,
                        180], size: [66,
                        24], alpha: 1, flow: 0, additive: false
                }))
            await tween(WINDUP_STEP_MS,
                () => {},
                ease.linear,
                ctx.layer)
        }
        await Promise.all(pieces)
    })

/** Đòn bị Choáng huỷ: mũi đòn gãy vụn ngay giữa đường, mảnh rơi xuống, tắt thành khói xám, không hạt nào tới được mục tiêu. ctx.to[0] là mục tiêu của đòn */
registerVfx("leonaStrikeFizzle",
    async (ctx) => {
        const k = kOf(ctx)
        const to = ctx.to[0] ?? ctx.from
        const color = [ctx.color,
            ctx.color,
            ...ASH]
        const stops = Array.from({
            length: 9
        },
        (_, i) => strikeTip(ctx.from,
            to,
            i / 8,
            1))
        await Promise.all([
            ...stops.flatMap((at, i) => [
                dustBurst(ctx.layer,
                    at,
                    {
                        count: 13, blade: true, color, speed: [20,
                            170], angle: [Math.PI * .1,
                            Math.PI * .9], gravity: 1100, drag: .8, flow: 6, life: [380,
                            760], size: [46,
                            16], alpha: 1, spread: 15 * k, additive: false
                    }),
                ...(i % 2 ? [] : [mist(ctx.layer,
                    at,
                    {
                        color: ASH, size: 104 * k, alpha: .62, count: 5, additive: false, gravity: -50, speed: [8,
                            50], life: [540,
                            1100]
                    })]),
                dustBurst(ctx.layer,
                    at,
                    {
                        count: 26, color, speed: [10,
                            90], gravity: 520, drag: 1, flow: 18, life: [320,
                            700], size: [7,
                            2], alpha: 1, spread: 18 * k, additive: false
                    })
            ])
        ])
    })
