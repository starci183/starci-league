// VFX riêng của Kha'Zix, bám LoL: Sát Thủ Hư Không tím đen, viền hồng magenta, móng vuốt xương trắng, mắt thú xanh chanh (đúng icon nội tại). Vết cào là mảnh `blade` sắc đè trên nền mực đen để đọc được trên bàn sáng, không có nét vẽ hay vòng tròn.
// Cận chiến nên không có gì bay qua bàn: nhát cào hiện ngay tại mục tiêu. Mỗi hiệu ứng chỉ dựa vào VfxCtx, tự dọn khi layer bị huỷ, trúng là báo ctx.onBeat.
import {
    Assets, Container, Sprite, Texture
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
const INK = 0x14061f
const DUSK = 0x34105a
const VOID = 0x7a2be2
const AMETHYST = 0xa64bff
const MAGENTA = 0xff3fb4
const WINE = 0xb0186e
const BONE = 0xf6e8ff
const LIME = 0xb6ff4a
const ASH = [0x6e6878,
    0x8a8496,
    0x4c4656]
const CLAW = [BONE,
    0xffd0f0,
    MAGENTA]
const VEIL = [0xe2c8ff,
    0xc79bff,
    AMETHYST]
/** Lá Kha'Zix bay theo plan.ts 620ms; vệt nhảy khớp nhịp đó */
export const KHAZIX_LEAP_MS = 620
/** Texture blade dày bằng ngần này chiều dài */
const BLADE_THICK = .19
const AURA_MAX_MS = 11000
const AURA_DEFAULT_MS = 2400

const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
const around = (at: Pt, r: number): Pt => {
    const a = rand(0,
            TAU), d = Math.sqrt(Math.random()) * r
    return {
        x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d
    }
}
const shard = (over: Partial<DustOpts> = {
}): DustOpts => ({
    blade: true, color: CLAW, speed: [260,
        760], drag: 3, flow: 0, life: [180,
        420], size: [46,
        12], alpha: 1, additive: false, ...over
})
const mote = (over: Partial<DustOpts> = {
}): DustOpts => ({
    color: [VOID,
        AMETHYST,
        MAGENTA], speed: [10,
        70], drag: 2, flow: 40, life: [320,
        720], size: [7,
        2], alpha: 1, ...over
})

/** Một nhát cắt: đầu lưỡi chạy dọc cung, thả mảnh blade nối đuôi, thon hai đầu. Mảnh mực đen lẫn trong mảnh màu, lõi trắng trên cùng. Mỗi đoạn một luồng hạt nên một nhát chỉ tốn vài host, tránh nghẽn khung khi cào nhiều móng */
function cut(ctx: VfxCtx, a: Pt, b: Pt, bow: number, thick: number, colors: number[], ms: number) {
    const SEG = 4
    const len = Math.hypot(b.x - a.x,
        b.y - a.y) || 1
    const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len
    const at = (u: number): Pt => {
        const lift = Math.sin(u * Math.PI) * bow
        return {
            x: lerp(a.x,
                b.x,
                u) + nx * lift, y: lerp(a.y,
                b.y,
                u) + ny * lift
        }
    }
    const stepMs = ms / SEG
    return Promise.all([
        ...Array.from({
            length: SEG
        },
        async (_, i) => {
            await sleep(stepMs * i)
            if (ctx.layer.destroyed) return
            const u0 = i / SEG, u1 = (i + 1) / SEG
            const start = at(u0), end = at(u1)
            const dir = Math.atan2(end.y - start.y,
                end.x - start.x)
            const taper = .35 + .65 * Math.pow(Math.sin((u0 + u1) / 2 * Math.PI),
                .8)
            const long = thick * taper / BLADE_THICK
            let head = start
            await Promise.all([
                dustStream(ctx.layer,
                    () => head,
                    stepMs,
                    1500,
                    shard({
                        color: [INK,
                            DUSK,
                            ...colors,
                            ...colors], speed: [24,
                            70], angle: [dir - .03,
                            dir + .03], drag: 6, spread: 2, life: [190,
                            420], size: [long * 1.15,
                            long * .75]
                    })),
                tween(stepMs,
                    (t) => {
                        head = {
                            x: lerp(start.x,
                                end.x,
                                t), y: lerp(start.y,
                                end.y,
                                t)
                        }
                    },
                    ease.linear,
                    ctx.layer)
            ])
        }),
        (async () => {
            let u = 0
            const dir = Math.atan2(b.y - a.y,
                b.x - a.x)
            await Promise.all([
                dustStream(ctx.layer,
                    () => at(u),
                    ms,
                    500,
                    shard({
                        color: [0xffffff,
                            BONE], speed: [24,
                            70], angle: [dir - .1,
                            dir + .1], drag: 6, spread: 1, life: [120,
                            240], size: [thick / BLADE_THICK * .5,
                            thick / BLADE_THICK * .32], additive: true
                    })),
                tween(ms,
                    (t) => { u = t },
                    ease.linear,
                    ctx.layer)
            ])
        })()
    ])
}

/** Ba móng song song cào qua `c` theo góc `angle` */
function rake(ctx: VfxCtx, c: Pt, angle: number, len: number, gap: number, thick: number, colors: number[], ms: number) {
    const ux = Math.cos(angle), uy = Math.sin(angle)
    const nx = -uy, ny = ux
    return Promise.all([-1,
        0,
        1].map(async (i, n) => {
        await sleep(n * 26)
        const m = {
            x: c.x + nx * gap * i, y: c.y + ny * gap * i
        }
        const half = len * (i ? .42 : .5)
        await cut(ctx,
            {
                x: m.x - ux * half, y: m.y - uy * half
            },
            {
                x: m.x + ux * half, y: m.y + uy * half
            },
            len * .13,
            thick * (i ? .8 : 1),
            colors,
            ms)
    }))
}

/** Gai Hư Không xé từ dưới lá lên */
function spikes(ctx: VfxCtx, at: Pt, count: number, power: number) {
    return Promise.all([
        dustBurst(ctx.layer,
            at,
            {
                ...shard({
                    color: [INK,
                        DUSK,
                        VOID], speed: [320 * power,
                        900 * power], angle: [-Math.PI * .84,
                        -Math.PI * .16], size: [86 * power,
                        30], life: [200,
                        440], spread: 34 * power
                }), count: Math.round(count * .8)
            }),
        dustBurst(ctx.layer,
            at,
            {
                ...shard({
                    color: [MAGENTA,
                        AMETHYST,
                        BONE], speed: [260 * power,
                        760 * power], angle: [-Math.PI * .8,
                        -Math.PI * .2], size: [60 * power,
                        18], life: [180,
                        400], spread: 28 * power
                }), count
            })
    ])
}

/** Mảnh cánh, bụi tím, khói mực văng tại điểm trúng */
function rupture(ctx: VfxCtx, at: Pt, power: number, count: number) {
    return Promise.all([
        bloom(ctx.layer,
            at,
            MAGENTA,
            420 * power,
            340),
        bloom(ctx.layer,
            at,
            0xffffff,
            150 * power,
            170),
        mist(ctx.layer,
            at,
            {
                color: [INK,
                    DUSK], size: 170 * power, count: 12, alpha: .62, speed: [30,
                    170], additive: false, life: [420,
                    860]
            }),
        dustBurst(ctx.layer,
            at,
            {
                ...shard({
                    speed: [300 * power,
                        900 * power], spread: 18
                }), count: Math.round(count * .32)
            }),
        dustBurst(ctx.layer,
            at,
            {
                ...shard({
                    color: [VOID,
                        INK,
                        AMETHYST], speed: [180 * power,
                        620 * power], size: [34,
                        10], gravity: 420, spread: 26
                }), count: Math.round(count * .26)
            }),
        dustBurst(ctx.layer,
            at,
            {
                ...mote({
                    speed: [80 * power,
                        360 * power], spread: 28
                }), count
            })
    ])
}

/** Đôi mắt thú xanh chanh loé trên lá Kha'Zix: đúng icon Sát Thủ Hư Không */
function eyes(ctx: VfxCtx, at: Pt, k: number) {
    return Promise.all([-1,
        1].flatMap((side) => {
        const p = {
            x: at.x + side * 24 * k, y: at.y - 34 * k
        }
        return [
            bloom(ctx.layer,
                p,
                LIME,
                120 * k,
                460),
            dustBurst(ctx.layer,
                p,
                {
                    ...shard({
                        color: [LIME,
                            0xe8ffb0], speed: [40,
                            120], angle: [side > 0 ? -.5 : Math.PI + .1,
                            side > 0 ? -.1 : Math.PI + .5], size: [34,
                            10], life: [200,
                            420], additive: true
                    }), count: 16
                })
        ]
    }))
}

/** Cô Lập, mở màn: mắt thú loé, sợi mùi tím bò sang địch đối diện rồi cuộn thành mây bao lá nó, không thành vòng. ctx.amount là % tỉ lệ: càng cao mây càng dày. Mây co xong báo nhịp để kết quả đáp cùng lúc */
registerVfx("khazixIsolateRoll",
    async (ctx) => {
        const k = kOf(ctx)
        const to = ctx.to[0] ?? ctx.from
        const chance = Math.max(.35,
            Math.min(1,
                (ctx.amount ?? 60) / 100))
        const crossMs = 240, swirlMs = 520
        let p = {
            ...ctx.from
        }
        let spread = 1
        const cloud = (): Pt => ({
            x: to.x + rand(-1,
                1) * 118 * k * spread, y: to.y + rand(-1,
                1) * 142 * k * spread
        })
        await Promise.all([
            eyes(ctx,
                ctx.from,
                k),
            dustStream(ctx.layer,
                () => around(p,
                    12),
                crossMs,
                1100,
                mote({
                    life: [180,
                        380], size: [8,
                        2]
                })),
            tween(crossMs,
                (t) => {
                    p = {
                        x: lerp(ctx.from.x,
                            to.x,
                            t), y: lerp(ctx.from.y,
                            to.y,
                            t)
                    }
                },
                ease.inOut,
                ctx.layer).then(() => Promise.all([
                mist(ctx.layer,
                    to,
                    {
                        color: [INK,
                            DUSK,
                            VOID], size: 190 * k, count: 12, alpha: .55 * chance, additive: false, life: [460,
                            820], speed: [8,
                            40]
                    }),
                dustStream(ctx.layer,
                    cloud,
                    swirlMs,
                    2400 * chance,
                    mote({
                        color: [AMETHYST,
                            MAGENTA,
                            VOID,
                            BONE], speed: [10,
                            50], life: [240,
                            520], size: [10,
                            3], flow: 130, streak: 2.6
                    })),
                dustStream(ctx.layer,
                    cloud,
                    swirlMs,
                    170 * chance,
                    shard({
                        color: [MAGENTA,
                            AMETHYST,
                            INK], speed: [50,
                            170], size: [38,
                            12], life: [200,
                            420]
                    })),
                tween(swirlMs,
                    (t) => { spread = lerp(1,
                        .55,
                        t) },
                    ease.in,
                    ctx.layer).then(() => ctx.onBeat?.())
            ]))
        ])
    })

/** Cô Lập thành công: mảnh sắc từ mọi phía găm vào lá, gai Hư Không xé lên */
registerVfx("khazixIsolateLand",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        const COUNT = 8
        ctx.shake(5,
            180)
        await Promise.all([
            ...Array.from({
                length: COUNT
            },
            (_, i) => {
                const a = i / COUNT * TAU + rand(-.12,
                    .12)
                const r = rand(70,
                    230) * k
                const start = {
                    x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r * 1.2
                }
                const home = Math.atan2(at.y - start.y,
                    at.x - start.x)
                return dustBurst(ctx.layer,
                    start,
                    {
                        ...shard({
                            color: i % 2 ? [MAGENTA,
                                BONE] : [AMETHYST,
                                INK], speed: [640,
                                900], angle: [home - .06,
                                home + .06], drag: 1.2, life: [200,
                                300], size: [96,
                                40], spread: 12
                        }), count: 14
                    })
            }),
            bloom(ctx.layer,
                at,
                VOID,
                520 * k,
                420),
            spikes(ctx,
                {
                    x: at.x, y: at.y + 40 * k
                },
                70,
                k),
            mist(ctx.layer,
                at,
                {
                    color: [INK,
                        DUSK,
                        VOID], size: 180 * k, count: 12, alpha: .55, additive: false, speed: [20,
                        110], life: [460,
                        900]
                }),
            dustBurst(ctx.layer,
                at,
                {
                    ...mote({
                        speed: [60,
                            300], spread: 60 * k
                    }), count: 240
                })
        ])
    })

/** Cô Lập trượt: xoáy tím tan thành tro xám rơi xuống, không có sáng */
registerVfx("khazixIsolateFail",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        await Promise.all([
            mist(ctx.layer,
                at,
                {
                    color: ASH, size: 170 * k, count: 10, alpha: .42, additive: false, speed: [20,
                        120], gravity: 60, life: [460,
                        900]
                }),
            dustBurst(ctx.layer,
                at,
                {
                    color: ASH, count: 420, speed: [60,
                        300], gravity: 420, drag: 1.4, flow: 50, life: [460,
                        980], size: [7,
                        2], alpha: 1, spread: 96 * k, additive: false
                }),
            dustBurst(ctx.layer,
                at,
                {
                    ...shard({
                        color: ASH, speed: [90,
                            300], gravity: 900, size: [40,
                            16], life: [360,
                            700], spread: 80 * k
                    }), count: 44
                })
        ])
    })

/** Địch Tàng Hình bị lộ: màn che rách toạc ra ngoài, sáng trắng tím */
registerVfx("khazixReveal",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        await Promise.all([
            bloom(ctx.layer,
                at,
                0xffffff,
                380 * k,
                300),
            mist(ctx.layer,
                at,
                {
                    color: VEIL, size: 180 * k, count: 14, alpha: .5, speed: [90,
                        260], life: [320,
                        680]
                }),
            dustBurst(ctx.layer,
                at,
                {
                    ...shard({
                        color: VEIL, speed: [420,
                            1000], size: [72,
                            20], spread: 60 * k, life: [200,
                            420]
                    }), count: 120
                }),
            dustBurst(ctx.layer,
                at,
                {
                    ...mote({
                        color: VEIL, speed: [120,
                            420], spread: 70 * k
                    }), count: 260
                })
        ])
    })

/** Cô Lập bám địch tới hết lượt: mảnh tím đen trôi quanh lá, khói mực dưới chân. Có ctx.tether thì bám theo tới khi được thả (tối đa AURA_MAX_MS) */
registerVfx("khazixIsolateAura",
    async (ctx) => {
        const k = kOf(ctx)
        const at = () => ctx.tether?.target() ?? ctx.from
        const limit = ctx.tether ? AURA_MAX_MS : AURA_DEFAULT_MS
        const body = () => {
            const p = at()
            return {
                x: p.x + rand(-74,
                    74) * k, y: p.y + rand(-90,
                    96) * k
            }
        }
        const feet = () => {
            const p = at()
            return {
                x: p.x + rand(-70,
                    70) * k, y: p.y + rand(50,
                    100) * k
            }
        }
        const pieces: Promise<unknown>[] = []
        let el = 0
        while (!ctx.layer.destroyed && !ctx.tether?.released() && el < limit) {
            pieces.push(dustStream(ctx.layer,
                body,
                360,
                120,
                shard({
                    color: [MAGENTA,
                        AMETHYST,
                        INK], speed: [30,
                        110], angle: [-Math.PI * .7,
                        -Math.PI * .3], drag: .6, life: [520,
                        980], size: [58,
                        18]
                })),
            dustStream(ctx.layer,
                feet,
                360,
                16,
                {
                    puff: true, color: [INK,
                        DUSK], speed: [8,
                        30], angle: [-Math.PI * .7,
                        -Math.PI * .3], gravity: -30, life: [700,
                        1200], size: [70 * k,
                        120 * k], alpha: .34, flow: 18, additive: false
                }),
            dustStream(ctx.layer,
                body,
                360,
                120,
                mote({
                    speed: [14,
                        60], gravity: -50
                })))
            await tween(360,
                () => {},
                ease.linear,
                ctx.layer)
            el += 360
        }
        await Promise.all(pieces)
    })

/** Q: móng cào ngay tại địch, chạm giữa nhát thì báo nhịp. ctx.amount > 0 là mục tiêu Cô Lập: thêm nhát chéo thành chữ X đỏ hồng, dày hơn */
registerVfx("khazixQRend",
    async (ctx) => {
        const k = kOf(ctx)
        const lonely = (ctx.amount ?? 0) > 0
        await Promise.all(ctx.to.map(async (to) => {
            const size = (lonely ? 300 : 250) * k
            await Promise.all([
                bloom(ctx.layer,
                    to,
                    lonely ? MAGENTA : AMETHYST,
                    260 * k,
                    200),
                rake(ctx,
                    to,
                    .95,
                    size,
                    42 * k,
                    lonely ? 22 : 18,
                    [BONE,
                        0xffc6ec,
                        lonely ? MAGENTA : AMETHYST],
                    130),
                lonely ? sleep(46).then(() => rake(ctx,
                    to,
                    Math.PI - .95,
                    size,
                    42 * k,
                    22,
                    [MAGENTA,
                        WINE,
                        0xffc6ec],
                    130)) : Promise.resolve(),
                sleep(90).then(() => ctx.onBeat?.())
            ])
        }))
    })

/** Q trúng: mảnh vuốt, máu tím. Cô Lập nặng gấp rưỡi, gai Hư Không xé lên */
registerVfx("khazixQHit",
    async (ctx) => {
        const k = kOf(ctx)
        const lonely = (ctx.amount ?? 0) > 0
        ctx.shake(lonely ? 9 : 5,
            lonely ? 240 : 170)
        await Promise.all([
            rupture(ctx,
                ctx.from,
                (lonely ? 1.5 : 1) * k,
                lonely ? 420 : 240),
            lonely ? spikes(ctx,
                {
                    x: ctx.from.x, y: ctx.from.y + 46 * k
                },
                110,
                1.25 * k) : Promise.resolve()
        ])
    })

/** Đòn đánh trúng địch Cô Lập: phần cộng thêm, một nhát rạch ngang hồng phủ lên vết cào gốc, cùng nhịp với cú đánh */
registerVfx("khazixIsolateRend",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        await Promise.all([
            cut(ctx,
                {
                    x: at.x - 150 * k, y: at.y + 34 * k
                },
                {
                    x: at.x + 150 * k, y: at.y - 34 * k
                },
                34 * k,
                26,
                [MAGENTA,
                    WINE,
                    0xffc6ec],
                110),
            rupture(ctx,
                at,
                1.05 * k,
                200),
            spikes(ctx,
                {
                    x: at.x, y: at.y + 40 * k
                },
                50,
                .9 * k)
        ])
    })

/** E rời đất: đá bụi tím bung dưới chân, vệt cánh dài theo đường nhảy. Có to[0] hoặc ctx.tether thì bám lá thật; báo nhịp đúng lúc đáp */
registerVfx("khazixLeap",
    async (ctx) => {
        const k = kOf(ctx)
        const dest = ctx.to[0] ?? ctx.from
        const dir = Math.atan2(dest.y - ctx.from.y,
            dest.x - ctx.from.x)
        let p = {
            ...ctx.from
        }
        const where = () => ctx.tether?.target() ?? p
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                VOID,
                320 * k,
                340),
            mist(ctx.layer,
                ctx.from,
                {
                    color: [INK,
                        DUSK,
                        VOID], size: 150 * k, count: 12, alpha: .6, additive: false, speed: [40,
                        200], life: [380,
                        760]
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...shard({
                        color: [AMETHYST,
                            INK,
                            MAGENTA], speed: [240,
                            680], angle: [Math.PI * .1,
                            Math.PI * .9], size: [44,
                            14], gravity: 500, spread: 42 * k
                    }), count: 70
                }),
            dustStream(ctx.layer,
                where,
                KHAZIX_LEAP_MS,
                340,
                shard({
                    color: [MAGENTA,
                        AMETHYST,
                        BONE], speed: [120,
                        360], angle: [dir + Math.PI - .24,
                        dir + Math.PI + .24], drag: 2.4, size: [66,
                        18], life: [220,
                        460], spread: 44 * k
                })),
            dustStream(ctx.layer,
                where,
                KHAZIX_LEAP_MS,
                520,
                mote({
                    spread: 56 * k, speed: [20,
                        100]
                })),
            dustStream(ctx.layer,
                where,
                KHAZIX_LEAP_MS,
                30,
                {
                    puff: true, color: [INK,
                        DUSK], speed: [8,
                        30], life: [300,
                        620], size: [80 * k,
                        140 * k], alpha: .4, flow: 18, additive: false
                }),
            tween(KHAZIX_LEAP_MS,
                (t) => {
                    p = {
                        x: lerp(ctx.from.x,
                            dest.x,
                            t), y: lerp(ctx.from.y,
                            dest.y,
                            t) - Math.sin(t * Math.PI) * 130
                    }
                },
                ease.out,
                ctx.layer).then(() => ctx.onBeat?.())
        ])
    })

/** E: đồng minh nhường chỗ, làn khói tím mỏng bám theo */
registerVfx("khazixLeapYield",
    async (ctx) => {
        const k = kOf(ctx)
        await dustStream(ctx.layer,
            () => ctx.tether?.target() ?? ctx.from,
            KHAZIX_LEAP_MS,
            170,
            mote({
                color: [VOID,
                    DUSK,
                    AMETHYST], spread: 50 * k, speed: [10,
                    50]
            }))
    })

/** E trúng: đáp đè lên địch, hai nhát cánh quét ngang rồi bụi Hư Không bùng */
registerVfx("khazixLeapHit",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        const wing = (side: number) => cut(ctx,
            {
                x: at.x - side * 30 * k, y: at.y - 96 * k
            },
            {
                x: at.x + side * 190 * k, y: at.y + 92 * k
            },
            side * 46 * k,
            30,
            [BONE,
                0xffc6ec,
                MAGENTA],
            120)
        ctx.shake(7,
            200)
        await Promise.all([
            wing(1),
            wing(-1),
            rupture(ctx,
                at,
                1.3 * k,
                320),
            dustBurst(ctx.layer,
                {
                    x: at.x, y: at.y + 70 * k
                },
                {
                    color: [DUSK,
                        VOID,
                        INK], count: 200, speed: [120,
                        420], angle: [-Math.PI * .95,
                        -Math.PI * .05], gravity: 520, drag: 1.2, flow: 40, life: [360,
                        760], size: [9,
                        3], spread: 54 * k, additive: false, alpha: 1
                })
        ])
    })

/** R mở màn: tím đen hút vào người Kha'Zix */
registerVfx("khazixVoidCharge",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        let r = 190 * k
        const edge = () => {
            const a = rand(0,
                TAU)
            return {
                x: at.x + Math.cos(a) * r * rand(.8,
                    1.1), y: at.y + Math.sin(a) * r * rand(.9,
                    1.25)
            }
        }
        await Promise.all([
            bloom(ctx.layer,
                at,
                VOID,
                300 * k,
                340),
            dustStream(ctx.layer,
                edge,
                300,
                1900,
                mote({
                    color: [MAGENTA,
                        AMETHYST,
                        INK], speed: [4,
                        26], life: [120,
                        260], size: [10,
                        3], flow: 16
                })),
            tween(300,
                (t) => { r = lerp(190,
                    38,
                    t) * k },
                ease.in,
                ctx.layer).then(() => ctx.onBeat?.())
        ])
    })

/** R trúng: thân Kha'Zix vỡ thành mảnh tím đen, cột khói mực nuốt lá */
registerVfx("khazixVanish",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        ctx.shake(5,
            200)
        await Promise.all([
            bloom(ctx.layer,
                at,
                MAGENTA,
                460 * k,
                420),
            mist(ctx.layer,
                at,
                {
                    color: [INK,
                        DUSK,
                        VOID], size: 190 * k, count: 18, alpha: .7, additive: false, speed: [30,
                        160], gravity: -70, life: [520,
                        1000]
                }),
            dustBurst(ctx.layer,
                at,
                {
                    ...shard({
                        color: [MAGENTA,
                            AMETHYST,
                            INK,
                            BONE], speed: [300,
                            900], size: [58,
                            16], spread: 56 * k, life: [240,
                            520]
                    }), count: 150
                }),
            dustBurst(ctx.layer,
                at,
                {
                    ...mote({
                        speed: [60,
                            320], gravity: -120, spread: 70 * k, life: [420,
                            900]
                    }), count: 320
                })
        ])
    })

/** Tàng Hình: màn sương lung linh bám lá, ánh lilac chạy dọc thân như LoL. Có ctx.tether thì bám tới khi được thả */
registerVfx("khazixStealthShimmer",
    async (ctx) => {
        const k = kOf(ctx)
        const at = () => ctx.tether?.target() ?? ctx.from
        const limit = ctx.tether ? AURA_MAX_MS : AURA_DEFAULT_MS
        const body = () => {
            const p = at()
            return {
                x: p.x + rand(-80,
                    80) * k, y: p.y + rand(-100,
                    100) * k
            }
        }
        const pieces: Promise<unknown>[] = []
        let el = 0
        while (!ctx.layer.destroyed && !ctx.tether?.released() && el < limit) {
            pieces.push(dustStream(ctx.layer,
                body,
                360,
                170,
                {
                    color: VEIL, speed: [20,
                        70], angle: [-Math.PI * .6,
                        -Math.PI * .4], drag: .5, flow: 26, life: [420,
                        820], size: [11,
                        3], streak: 4, alpha: .85
                }),
            dustStream(ctx.layer,
                body,
                360,
                12,
                {
                    puff: true, color: [DUSK,
                        VOID], speed: [6,
                        24], life: [600,
                        1100], size: [90 * k,
                        150 * k], alpha: .22, flow: 16
                }))
            await tween(360,
                () => {},
                ease.linear,
                ctx.layer)
            el += 360
        }
        await Promise.all(pieces)
    })

/** Hết Tàng Hình: màn sương tan, Kha'Zix hiện lại */
registerVfx("khazixUnveil",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            mist(ctx.layer,
                ctx.from,
                {
                    color: VEIL, size: 150 * k, count: 9, alpha: .4, speed: [40,
                        170]
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...mote({
                        color: VEIL, speed: [60,
                            240], spread: 60 * k
                    }), count: 180
                })
        ])
    })

/** Né đòn: đòn địch xuyên qua bóng tàn. Bóng lilac tách đôi, vệt đòn đi tiếp ra sau lá. to[0] là kẻ đánh */
registerVfx("khazixDodge",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        const src = ctx.to[0] ?? {
            x: at.x, y: at.y - 200
        }
        const dir = Math.atan2(at.y - src.y,
            at.x - src.x)
        const nx = -Math.sin(dir), ny = Math.cos(dir)
        const ghost = (side: number) => {
            const p = {
                x: at.x + nx * side * 70 * k, y: at.y + ny * side * 70 * k
            }
            return Promise.all([
                mist(ctx.layer,
                    p,
                    {
                        color: VEIL, size: 130 * k, count: 8, alpha: .42, speed: [30,
                            130], life: [300,
                            620]
                    }),
                dustBurst(ctx.layer,
                    p,
                    {
                        ...shard({
                            color: VEIL, speed: [200,
                                560], angle: [Math.atan2(ny * side,
                                nx * side) - .5,
                            Math.atan2(ny * side,
                                nx * side) + .5], size: [52,
                                16], life: [200,
                                420], spread: 44 * k
                        }), count: 50
                    })
            ])
        }
        await Promise.all([
            ghost(1),
            ghost(-1),
            bloom(ctx.layer,
                at,
                0xe2c8ff,
                300 * k,
                300),
            dustBurst(ctx.layer,
                at,
                {
                    color: [...VEIL,
                        ctx.color2 ?? BONE], count: 260, speed: [520,
                        1100], angle: [dir - .16,
                        dir + .16], drag: 1.6, flow: 0, life: [240,
                        480], size: [12,
                        4], streak: 5, alpha: 1, spread: 44 * k
                })
        ])
    })

async function loadIcon(url?: string): Promise<Texture | null> {
    if (!url) return null
    try {
        return await Assets.load<Texture>(url)
    } catch {
        return null
    }
}

let back: Texture | undefined
/** Mặt bài tím đen cho lá bay: vỏ thật của lá, không phải khối hình học trang trí */
function backTexture(): Texture {
    if (back) return back
    const W = 120, H = 168
    const c = document.createElement("canvas")
    c.width = W
    c.height = H
    const g = c.getContext("2d")
    if (g) {
        const fill = g.createLinearGradient(0,
            0,
            0,
            H)
        fill.addColorStop(0,
            "#3b1668")
        fill.addColorStop(1,
            "#160626")
        g.fillStyle = fill
        g.beginPath()
        g.roundRect(0,
            0,
            W,
            H,
            10)
        g.fill()
        g.strokeStyle = "#c79bff"
        g.lineWidth = 3
        g.stroke()
    }
    back = Texture.from(c)
    return back
}

/** Lá bài bay: mặt tím, ảnh chiêu lồng giữa nếu có */
function flyingCard(ctx: VfxCtx, art: Texture | null, width: number) {
    const card = new Container()
    const shell = new Sprite(backTexture())
    shell.anchor.set(.5)
    shell.width = width
    shell.height = width * 1.4
    card.addChild(shell)
    if (art) {
        const face = new Sprite(art)
        face.anchor.set(.5)
        face.width = width * .84
        face.height = width * .84
        face.y = -width * .08
        card.addChild(face)
    }
    ctx.layer.addChild(card)
    return card
}

/** Lá Q miễn phí: từ bóng Kha'Zix bay vào tay, chạm tay là báo nhịp. ctx.icon là ảnh Q */
registerVfx("khazixFreeCard",
    async (ctx) => {
        const k = kOf(ctx)
        const to = ctx.to[0] ?? ctx.from
        const art = await loadIcon(ctx.icon)
        if (ctx.layer.destroyed) return
        const card = flyingCard(ctx,
            art,
            96 * k)
        const glow = makeSprite(ctx.layer,
            "glow",
            ctx.from.x,
            ctx.from.y,
            MAGENTA,
            220 * k)
        ctx.layer.addChildAt(glow,
            0)
        const ms = 560
        let p = {
            ...ctx.from
        }
        await Promise.all([
            dustStream(ctx.layer,
                () => p,
                ms,
                820,
                mote({
                    spread: 34 * k, speed: [10,
                        70], life: [240,
                        520], size: [9,
                        2]
                })),
            dustStream(ctx.layer,
                () => p,
                ms,
                170,
                shard({
                    color: [MAGENTA,
                        BONE,
                        AMETHYST], speed: [40,
                        160], size: [36,
                        10], life: [180,
                        360], spread: 30 * k
                })),
            tween(ms,
                (t) => {
                    const lift = Math.sin(t * Math.PI) * 90
                    p = {
                        x: lerp(ctx.from.x,
                            to.x,
                            t), y: lerp(ctx.from.y,
                            to.y,
                            t) - lift
                    }
                    card.x = p.x
                    card.y = p.y
                    card.rotation = lerp(-.32,
                        0,
                        t)
                    glow.x = p.x
                    glow.y = p.y
                },
                ease.inOut,
                ctx.layer).then(() => {
                if (!card.destroyed) card.destroy({
                    children: true
                })
                if (!glow.destroyed) glow.alpha = 0
                ctx.onBeat?.()
                return Promise.all([
                    bloom(ctx.layer,
                        to,
                        MAGENTA,
                        260 * k,
                        320),
                    dustBurst(ctx.layer,
                        to,
                        {
                            ...mote({
                                speed: [60,
                                    280], spread: 40 * k
                            }), count: 170
                        })
                ])
            })
        ])
    })

/** R xáo vào bộ: lá R bay cung tới Bộ bài, `ctx.amount` lá trên cùng xoè ra, lá R chui vào giữa rồi xếp lại. Xếp xong báo nhịp để số trên ô Bộ bài tăng. ctx.icon là ảnh R */
registerVfx("khazixShuffleIn",
    async (ctx) => {
        const k = kOf(ctx)
        const to = ctx.to[0] ?? ctx.from
        const count = Math.max(2,
            Math.min(7,
                ctx.amount ?? 5))
        const art = await loadIcon(ctx.icon)
        if (ctx.layer.destroyed) return
        const W = 62
        const up = to.y > window.innerHeight / 2 ? -1 : 1
        const base = {
            x: to.x - (to.x > window.innerWidth / 2 ? 90 : -90), y: to.y + up * 74
        }
        const fan = Array.from({
            length: count
        },
        () => {
            const c = flyingCard(ctx,
                null,
                W)
            c.x = to.x
            c.y = to.y
            c.alpha = 0
            return c
        })
        const slot = Math.floor(count / 2)
        const open = (t: number) => {
            fan.forEach((c, i) => {
                if (c.destroyed) return
                const u = i - (count - 1) / 2
                c.x = lerp(to.x,
                    base.x + u * 24,
                    t)
                c.y = lerp(to.y,
                    base.y + Math.abs(u) * 5,
                    t)
                c.rotation = u * .15 * t
                c.alpha = Math.min(1,
                    t * 3)
            })
        }
        const ms = 520
        let p = {
            ...ctx.from
        }
        const rCard = flyingCard(ctx,
            art,
            86 * k)
        const fly = tween(ms,
            (t) => {
                p = {
                    x: lerp(ctx.from.x,
                        base.x,
                        t), y: lerp(ctx.from.y,
                        base.y,
                        t) - Math.sin(t * Math.PI) * 120
                }
                rCard.x = p.x
                rCard.y = p.y
                rCard.rotation = t * TAU * 1
                const z = lerp(1,
                    W / 86 / k,
                    t)
                rCard.scale.set(z)
            },
            ease.inOut,
            ctx.layer)
        await Promise.all([
            dustStream(ctx.layer,
                () => p,
                ms,
                520,
                mote({
                    spread: 26 * k, life: [200,
                        420]
                })),
            tween(ms * .55,
                (t) => open(t),
                ease.out,
                ctx.layer),
            fly
        ])
        if (ctx.layer.destroyed) return
        ctx.layer.addChild(rCard)
        // lá R trượt thẳng vào khe giữa xấp, các lá trên đè lên
        for (const c of fan.slice(slot)) ctx.layer.addChild(c)
        const tuck = {
            x: rCard.x, y: rCard.y
        }
        const inSlot = {
            x: base.x + (slot - (count - 1) / 2) * 24 - 12, y: base.y
        }
        await tween(180,
            (t) => {
                rCard.x = lerp(tuck.x,
                    inSlot.x,
                    t)
                rCard.y = lerp(tuck.y,
                    inSlot.y,
                    t)
                rCard.rotation = 0
            },
            ease.out,
            ctx.layer)
        await Promise.all([
            bloom(ctx.layer,
                base,
                MAGENTA,
                230 * k,
                300),
            dustBurst(ctx.layer,
                base,
                {
                    ...mote({
                        speed: [50,
                            220], spread: 50
                    }), count: 130
                }),
            tween(240,
                (t) => {
                    open(1 - t)
                    if (!rCard.destroyed) {
                        rCard.x = lerp(inSlot.x,
                            to.x,
                            t)
                        rCard.y = lerp(inSlot.y,
                            to.y,
                            t)
                        rCard.alpha = 1 - t * t
                    }
                },
                ease.in,
                ctx.layer).then(() => ctx.onBeat?.())
        ])
        for (const c of [...fan,
            rCard]) if (!c.destroyed) c.destroy({
            children: true
        })
    })
