// VFX riêng của Zed, chất liệu BÓNG TỐI VÀ THÉP: khói mực đen, tàn đỏ thẫm, mảnh lưỡi thép sắc. Không dùng nét vẽ hình học; phi tiêu và vết chém đều là mảnh `blade` thật.
// Mỗi hiệu ứng chỉ dựa vào VfxCtx và tự dọn khi layer bị huỷ; trúng là báo ctx.onBeat, không chờ đuôi hạt tan. ctx.amount là số Liên Hoàn: càng cao bóng càng đặc.
import {
    bloom, dustBurst, dustStream, mist, type DustBurstOpts, type DustOpts
} from "./fx_dust"
import {
    ease, lerp, rand, sleep, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const TAU = Math.PI * 2
const INK = [0x06050a,
    0x0e0a14,
    0x1a1022]
const VOID = 0x3a1038
const CRIMSON = 0xe3123f
const DEEP_RED = 0xa8082c
const EMBER = 0xff5a6a

const STEEL = 0xeef3f8
/** Thời gian Zed tan vào bóng rồi hiện ra ở đường mới; lá tướng trong demo chạy khớp nhịp này */
export const ZED_STEP_MS = 380
const SHURIKEN_MS = 300
const DASH_MS = 300
const GATHER_MS = 340
const CHUNK_MS = 240
const AURA_MAX_MS = 14000
const AURA_DEFAULT_MS = 2400
const STACK_CAP = 8
const CARD_RIM = {
    x: 62, y: 86
}


const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
const stacksOf = (ctx: VfxCtx) => Math.min(ctx.amount ?? 0,
    STACK_CAP)
/** Liên Hoàn làm mọi thứ dày và rộng thêm: 0 tầng bằng gốc, 8 tầng gấp đôi */
const powerOf = (ctx: VfxCtx) => kOf(ctx) * (1 + stacksOf(ctx) / 8)
const redOf = (ctx: VfxCtx) => [ctx.color,
    CRIMSON,
    CRIMSON,
    DEEP_RED,
    EMBER]
const edgeOf = (ctx: VfxCtx) => [STEEL,
    ctx.color2 ?? STEEL,
    ctx.color,
    EMBER]
const anchorOf = (ctx: VfxCtx) => ctx.tether?.target() ?? ctx.from
const around = (at: Pt, r: number): Pt => {
    const a = rand(0,
            TAU), d = Math.sqrt(Math.random()) * r
    return {
        x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d
    }
}
/** Điểm ngẫu nhiên trên viền lá tướng: bóng bám quanh lá, không che mặt tướng */
const rim = (at: Pt): Pt => {
    const u = rand(-1,
            1), side = Math.random() < .5 ? -1 : 1
    return Math.random() < .62 ? {
        x: at.x + side * CARD_RIM.x + rand(-10,
            10), y: at.y + u * CARD_RIM.y
    } : {
        x: at.x + u * CARD_RIM.x, y: at.y + side * CARD_RIM.y + rand(-10,
            10)
    }
}
const shift = (p: Pt, a: number, d: number): Pt => ({
    x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d
})

type Over = Partial<DustOpts> & { count?: number }

/** Khói mực: blend thường để đen thật trên bàn sáng */
const smoke = (over: Partial<DustOpts> = {
}): DustOpts => ({
    puff: true, color: INK, speed: [8,
        46], gravity: -40, drag: 1.2, flow: 24, life: [420,
        820], size: [52,
        104], alpha: .62, additive: false, ...over
})
/** Tàn đỏ: vệt mảnh uốn theo luồng, bay lên */
const wisp = (ctx: VfxCtx, over: Over = {
}): DustBurstOpts => ({
    count: 0,
    color: redOf(ctx), speed: [14,
        90], gravity: -170, drag: 1.5, flow: 90, life: [260,
        620], size: [10,
        2], streak: 3, alpha: 1, additive: false, ...over
})
/** Mảnh lưỡi thép bắn ra mọi hướng */
const shards = (ctx: VfxCtx, over: Over = {
}): DustBurstOpts => ({
    count: 0,
    blade: true, color: edgeOf(ctx), speed: [320,
        980], drag: 4, flow: 0, life: [150,
        340], size: [58,
        14], alpha: 1, additive: false, ...over
})

/** Lặp phát theo từng mẩu ngắn cho tới khi thả: dustStream cần thời lượng cố định, tether thì không biết trước */
async function untilReleased(ctx: VfxCtx, chunk: (ms: number) => Promise<unknown>) {
    const limit = ctx.tether ? AURA_MAX_MS : AURA_DEFAULT_MS
    const tails: Promise<unknown>[] = []
    for (let el = 0; el < limit && !ctx.layer.destroyed && !ctx.tether?.released(); el += CHUNK_MS) {
        tails.push(chunk(CHUNK_MS + 30))
        await tween(CHUNK_MS,
            () => {},
            ease.linear,
            ctx.layer)
    }
    await Promise.all(tails)
}

/** Một đường chém: mép lưỡi quét qua `at` theo góc `a`, mảnh sắc bay dọc đường chém; không vẽ nét nào */
async function cut(ctx: VfxCtx, at: Pt, a: number, len: number, ms: number, thick: number) {
    const start = shift(at,
        a,
        -len)
    const end = shift(at,
        a,
        len)
    let edge = start
    await Promise.all([
        dustStream(ctx.layer,
            () => edge,
            ms,
            2600,
            {
                blade: true, color: [STEEL,
                    STEEL,
                    ctx.color,
                    EMBER], speed: [260,
                    760], angle: [a - .1,
                    a + .1], drag: 3, flow: 0, life: [110,
                    240], size: [thick * 5,
                    thick * 1.6], spread: thick * .5, alpha: 1
            }),
        dustStream(ctx.layer,
            () => edge,
            ms,
            900,
            {
                color: redOf(ctx), speed: [10,
                    70], drag: 2, flow: 40, life: [180,
                    420], size: [9,
                    3], spread: thick, alpha: .9
            }),
        tween(ms,
            (t) => {
                edge = {
                    x: lerp(start.x,
                        end.x,
                        t), y: lerp(start.y,
                        end.y,
                        t)
                }
            },
            ease.out,
            ctx.layer)
    ])
}

/** Phi tiêu bằng mảnh lưỡi: 4 cánh phát liên tục từ tâm, hướng phát xoay theo thời gian nên nhìn như thép đang quay */
function spinner(ctx: VfxCtx, arm: number, color: number[]) {
    const arms = [0,
        1,
        2,
        3].map(i => ({
        phase: i / 4 * TAU,
        opts: {
            blade: true, color, speed: [24,
                30], angle: [0,
                    0] as [number, number], drag: 0, flow: 0, life: [34,
                52], size: [arm * 1.5,
                arm * 1.2], alpha: 1, additive: false
        } satisfies DustOpts
    }))
    return {
        turn(spin: number) {
            for (const a of arms) a.opts.angle = [spin + a.phase,
                spin + a.phase]
        },
        emit(head: () => Pt, ms: number, rate = 340) {
            return Promise.all(arms.map(a => dustStream(ctx.layer,
                () => shift(head(),
                    a.opts.angle[0],
                    arm * .62),
                ms,
                rate,
                a.opts)))
        }
    }
}

/** Nội tại: bóng bám Zed theo số Liên Hoàn. Tầng càng cao khói càng đặc, tàn đỏ càng dày, từ 3 tầng có thêm mảnh thép */
registerVfx("zedShadowAura",
    (ctx) => {
        const n = Math.max(1,
            stacksOf(ctx))
        const pt = () => rim(anchorOf(ctx))

        return untilReleased(ctx,
            ms => Promise.all([
                dustStream(ctx.layer,
                    pt,
                    ms,
                    14 + n * 9,
                    smoke({
                        size: [44 + n * 6,
                            88 + n * 12], alpha: .3 + n * .06
                    })),
                dustStream(ctx.layer,
                    pt,
                    ms,
                    26 + n * 30,
                    wisp(ctx,
                        {
                            size: [6 + n * .6,
                                1.6], streak: 2.4
                        })),
                n >= 3 ? dustStream(ctx.layer,
                    pt,
                    ms,
                    n * 4,
                    shards(ctx,
                        {
                            speed: [60,
                                180], size: [15 + n,
                                4], life: [120,
                                240]
                        })) : Promise.resolve()
            ]))
    })

/** Nội tại: +1 Liên Hoàn, bóng phụt ra khỏi Zed, tầng càng cao phụt càng mạnh */
registerVfx("zedChainSurge",
    async (ctx) => {
        const n = stacksOf(ctx), p = powerOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                170 + n * 34,
                300),
            mist(ctx.layer,
                ctx.from,
                {
                    color: INK, size: 92 + n * 16, count: 7 + n, alpha: .56, additive: false, speed: [30,
                        130]
                }),
            dustBurst(ctx.layer,
                ctx.from,
                shards(ctx,
                    {
                        count: 14 + n * 8, speed: [240,
                            560 * p], size: [26,
                            6], spread: 40
                    })),
            dustBurst(ctx.layer,
                ctx.from,
                wisp(ctx,
                    {
                        count: 40 + n * 18, spread: 70, speed: [40,
                            200]
                    }))
        ])
    })

/** Hết lượt: toàn bộ Liên Hoàn tan, khói bốc lên và rã hết */
registerVfx("zedChainFade",
    async (ctx) => {
        const n = Math.max(1,
            stacksOf(ctx))
        await Promise.all([
            mist(ctx.layer,
                ctx.from,
                {
                    color: INK, size: 120 + n * 10, count: 10 + n * 2, alpha: .5, additive: false, gravity: -130, speed: [30,
                        120], life: [620,
                        1150]
                }),
            dustBurst(ctx.layer,
                ctx.from,
                wisp(ctx,
                    {
                        count: 120 + n * 34, spread: 66, gravity: -240, speed: [20,
                            120], life: [420,
                            900]
                    }))
        ])
    })

/** Đòn đánh trong lượt combo: thêm một nhát thép ngang tại mục tiêu, Liên Hoàn càng cao nhát càng dài và nhiều mảnh */
registerVfx("zedEdgeCut",
    async (ctx) => {
        const n = stacksOf(ctx), p = powerOf(ctx)
        if (n >= 5) ctx.shake(3 + n * .4,
            130)
        await Promise.all([
            cut(ctx,
                ctx.from,
                rand(-.32,
                    -.12),
                118 * p,
                110,
                6 + n * .8),
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                170 * p,
                260),
            dustBurst(ctx.layer,
                ctx.from,
                shards(ctx,
                    {
                        count: 70 + n * 26, spread: 18
                    })),
            mist(ctx.layer,
                ctx.from,
                {
                    color: INK, size: 90 * p, count: 6, alpha: .5, additive: false
                })
        ])
    })

/** Q: phi tiêu thép lớn xoay tròn, kéo vệt đỏ và khói đen; chạm là báo nhịp */
registerVfx("zedShuriken",
    async (ctx) => {
        const k = powerOf(ctx)
        const arm = 32 * k

        await Promise.all(ctx.to.map(async (to) => {
            let p = {
                ...ctx.from
            }
            const star = spinner(ctx,
                arm,
                [STEEL,
                    STEEL,
                    ctx.color2 ?? STEEL,
                    CRIMSON])
            const head = () => p
            await Promise.all([
                star.emit(head,
                    SHURIKEN_MS),
                dustStream(ctx.layer,
                    () => around(p,
                        arm * .7),
                    SHURIKEN_MS,
                    620,
                    {
                        color: redOf(ctx), speed: [6,
                            40], drag: 2.2, flow: 46, life: [160,
                            380], size: [13,
                            3], alpha: 1
                    }),
                dustStream(ctx.layer,
                    head,
                    SHURIKEN_MS,
                    70,
                    smoke({
                        size: [arm * 1.3,
                            arm * 2.4], life: [240,
                            460], alpha: .5, gravity: 0
                    })),
                tween(SHURIKEN_MS,
                    (t) => {
                        p = {
                            x: lerp(ctx.from.x,
                                to.x,
                                t), y: lerp(ctx.from.y,
                                to.y,
                                t)
                        }
                        star.turn(t * TAU * 2.6)
                    },
                    ease.linear,
                    ctx.layer).then(() => { ctx.onBeat?.() })
            ])
        }))
    })

/** Q trúng: thép văng mọi hướng, đỏ và mực bung ra */
registerVfx("zedShurikenHit",
    async (ctx) => {
        const k = powerOf(ctx)
        ctx.shake(4 * k,
            150)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                260 * k,
                300),
            bloom(ctx.layer,
                ctx.from,
                STEEL,
                130 * k,
                200),
            dustBurst(ctx.layer,
                ctx.from,
                shards(ctx,
                    {
                        count: Math.round(170 * k), spread: 20
                    })),
            dustBurst(ctx.layer,
                ctx.from,
                wisp(ctx,
                    {
                        count: Math.round(150 * k), spread: 40, speed: [60,
                            280]
                    })),
            mist(ctx.layer,
                ctx.from,
                {
                    color: INK, size: 130 * k, count: 9, alpha: .55, additive: false
                })
        ])
    })

/** Q phụ: hai lưỡi trên tay Zed mài sáng, báo đòn đánh lượt này nặng hơn */
registerVfx("zedBladeCharge",
    async (ctx) => {
        await Promise.all([
            cut(ctx,
                ctx.from,
                -.78,
                84,
                260,
                6),
            cut(ctx,
                ctx.from,
                .78,
                84,
                260,
                6),
            bloom(ctx.layer,
                ctx.from,
                STEEL,
                190,
                300)
        ])
    })

/** E mở màn: Zed tan thành bóng, vệt mực lao thẳng tới đường mới, tới nơi là báo nhịp */
registerVfx("zedShadowStep",
    async (ctx) => {
        const to = ctx.to[0] ?? ctx.from
        let p = {
            ...ctx.from
        }
        const near = () => around(p,
            44)
        await Promise.all([
            mist(ctx.layer,
                ctx.from,
                {
                    color: INK, size: 150, count: 12, alpha: .66, additive: false, speed: [14,
                        70]
                }),
            dustBurst(ctx.layer,
                ctx.from,
                wisp(ctx,
                    {
                        count: 170, spread: 60
                    })),
            dustStream(ctx.layer,
                near,
                ZED_STEP_MS,
                150,
                smoke({
                    size: [60,
                        120], life: [260,
                        520], alpha: .66, gravity: 0
                })),
            dustStream(ctx.layer,
                near,
                ZED_STEP_MS,
                900,
                {
                    color: redOf(ctx), speed: [10,
                        70], drag: 2, flow: 60, life: [200,
                        420], size: [11,
                        3], alpha: 1
                }),
            tween(ZED_STEP_MS,
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
                ctx.layer).then(() => {
                ctx.onBeat?.()
                return Promise.all([
                    mist(ctx.layer,
                        to,
                        {
                            color: INK, size: 140, count: 10, alpha: .6, additive: false
                        }),
                    dustBurst(ctx.layer,
                        to,
                        wisp(ctx,
                            {
                                count: 150, spread: 50, speed: [80,
                                    300]
                            }))
                ])
            })
        ])
    })

/** E trúng: chém xoáy một vòng quanh mục tiêu như Shadow Slash, mảnh thép bay theo tiếp tuyến */
registerVfx("zedShadowSlash",
    async (ctx) => {
        const k = powerOf(ctx)
        const r = 84 * k
        ctx.shake(5 * k,
            170)
        let a = rand(0,
            TAU)
        const start = a
        const blade: DustOpts = {
            blade: true, color: edgeOf(ctx), speed: [420,
                820], angle: [0,
                0], drag: 3.4, flow: 0, life: [120,
                260], size: [62 * k,
                18], spread: 12, alpha: 1
        }
        const edge = () => shift(ctx.from,
            a,
            r)
        await Promise.all([
            dustStream(ctx.layer,
                edge,
                230,
                2400,
                blade),
            dustStream(ctx.layer,
                edge,
                230,
                900,
                wisp(ctx,
                    {
                        spread: 18, gravity: -60, speed: [10,
                            80]
                    })),
            tween(230,
                (t) => {
                    a = start + t * TAU * 1.15
                    blade.angle = [a + Math.PI / 2 - .2,
                        a + Math.PI / 2 + .2]
                },
                ease.out,
                ctx.layer),
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                300 * k,
                340),
            mist(ctx.layer,
                ctx.from,
                {
                    color: INK, size: 150 * k, count: 10, alpha: .55, additive: false
                })
        ])
    })

/** R mở màn: bóng dâng lên nuốt Zed, tàn đỏ hút vào người */
registerVfx("zedDeathVanish",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            dustStream(ctx.layer,
                () => around(ctx.from,
                    70),
                300,
                60,
                smoke({
                    size: [70,
                        130], alpha: .7, gravity: -70
                })),
            dustStream(ctx.layer,
                () => around(ctx.from,
                    66 * k),
                300,
                900,
                wisp(ctx,
                    {
                        speed: [20,
                            110], gravity: -260
                    })),
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                260 * k,
                320)
        ])
    })

/** R lao: Zed và hai bóng phân thân từ hai bên cùng xuyên vào mục tiêu; cả ba chạm cùng lúc là báo nhịp */
registerVfx("zedDeathDash",
    async (ctx) => {
        await Promise.all(ctx.to.map(async (to) => {
            const lanes = [{
                from: ctx.from, wide: 1
            },
            {
                from: shift(to,
                    Math.PI,
                    330), wide: .7
            },
            {
                from: shift(to,
                    0,
                    330), wide: .7
            }]
            await Promise.all(lanes.map(async (lane, i) => {
                let p = {
                    ...lane.from
                }
                const line = Math.atan2(to.y - lane.from.y,
                    to.x - lane.from.x)
                await Promise.all([
                    dustStream(ctx.layer,
                        () => p,
                        DASH_MS,
                        1300 * lane.wide,
                        {
                            blade: true, color: [STEEL,
                                ctx.color,
                                EMBER], speed: [120,
                                520], angle: [line + Math.PI - .14,
                                line + Math.PI + .14], drag: 3, flow: 0, life: [90,
                                200], size: [56,
                                14], spread: 20 * lane.wide, alpha: 1
                        }),
                    dustStream(ctx.layer,
                        () => around(p,
                            34 * lane.wide),
                        DASH_MS,
                        110,
                        smoke({
                            size: [70 * lane.wide,
                                130 * lane.wide], life: [220,
                                460], alpha: .72, gravity: 0
                        })),
                    dustStream(ctx.layer,
                        () => around(p,
                            30 * lane.wide),
                        DASH_MS,
                        500,
                        wisp(ctx,
                            {
                                gravity: 0, flow: 60
                            })),
                    tween(DASH_MS,
                        (t) => {
                            p = {
                                x: lerp(lane.from.x,
                                    to.x,
                                    t), y: lerp(lane.from.y,
                                    to.y,
                                    t)
                            }
                        },
                        ease.in,
                        ctx.layer).then(() => { if (i === 0) ctx.onBeat?.() })
                ])
            }))
        }))
    })

/** R trúng: cú sốc đầu, chữ X đỏ và thép xé ngang mục tiêu, mực bung rộng */
registerVfx("zedDeathMarkHit",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(8,
            240)
        await Promise.all([
            mist(ctx.layer,
                ctx.from,
                {
                    color: INK, size: 150 * k, count: 9, alpha: .46, additive: false, speed: [40,
                        150]
                }),
            cut(ctx,
                ctx.from,
                .82,
                150 * k,
                140,
                11),
            cut(ctx,
                ctx.from,
                -.82,
                150 * k,
                140,
                11),
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                420 * k,
                420),
            bloom(ctx.layer,
                ctx.from,
                STEEL,
                200 * k,
                220),
            dustBurst(ctx.layer,
                ctx.from,
                shards(ctx,
                    {
                        count: 300, spread: 26, size: [72,
                            16]
                    })),
            dustBurst(ctx.layer,
                ctx.from,
                wisp(ctx,
                    {
                        count: 260, spread: 60, speed: [60,
                            320]
                    })),

        ])
    })

/** Dấu Ấn bám mục tiêu: phi tiêu đỏ xoay trên đầu như trong game, Liên Hoàn càng cao phi tiêu càng to, khói đỏ quấn quanh lá */
registerVfx("zedDeathMarkCue",
    (ctx) => {
        const n = stacksOf(ctx)
        const arm = 20 + n * 2
        const star = spinner(ctx,
            arm,
            [CRIMSON,
                CRIMSON,
                DEEP_RED,
                STEEL])

        const born = performance.now()
        const above = () => {
            const p = anchorOf(ctx)
            return {
                x: p.x, y: p.y - 82
            }
        }
        const body = () => around(anchorOf(ctx),
            60)
        return untilReleased(ctx,
            ms => Promise.all([
                tween(ms,
                    () => { star.turn((performance.now() - born) * .011) },
                    ease.linear,
                    ctx.layer),
                star.emit(above,
                    ms,
                    280),
                dustStream(ctx.layer,
                    () => around(above(),
                        arm),
                    ms,
                    260,
                    {
                        color: redOf(ctx), speed: [6,
                            40], drag: 2, flow: 40, life: [160,
                            340], size: [10,
                            3], alpha: 1
                    }),
                dustStream(ctx.layer,
                    body,
                    ms,
                    90 + n * 26,
                    wisp(ctx,
                        {
                            gravity: -120
                        })),
                dustStream(ctx.layer,
                    body,
                    ms,
                    16,
                    smoke({
                        color: [VOID,
                            ...INK], size: [50,
                            92], alpha: .46
                    }))
            ]))
    })

/** Cuối lượt, Dấu Ấn nổ: mực và đỏ bị hút vào mục tiêu, rồi đúng một cú nổ trắng. ctx.amount là số Liên Hoàn */
registerVfx("zedDeathMarkBurst",
    async (ctx) => {
        const n = stacksOf(ctx), k = kOf(ctx)
        const p = k * (1 + n / 6)
        const at = ctx.from
        const pulls = Array.from({
            length: 16
        },
        (_, i) => {
            const a = i / 16 * TAU
            const from = shift(at,
                a,
                rand(190,
                    270) * p)
            return dustStream(ctx.layer,
                () => around(from,
                    26),
                GATHER_MS * .72,
                90,
                {
                    blade: true, color: redOf(ctx), speed: [520,
                        760], angle: [a + Math.PI - .08,
                        a + Math.PI + .08], drag: 1, flow: 0, life: [150,
                        260], size: [46,
                        10], alpha: 1
                })
        })
        await Promise.all([
            ...pulls,
            dustStream(ctx.layer,
                () => around(at,
                    110),
                GATHER_MS,
                50,
                smoke({
                    size: [80,
                        50], life: [200,
                        380], alpha: .7, gravity: 0
                })),
            sleep(GATHER_MS).then(() => {
                if (ctx.layer.destroyed) return
                ctx.onBeat?.()
                ctx.shake(13,
                    320)
                return Promise.all([
                    mist(ctx.layer,
                        at,
                        {
                            color: INK, size: 130 * p, count: 9, alpha: .36, additive: false, speed: [90,
                                240], life: [420,
                                760]
                        }),
                    bloom(ctx.layer,
                        at,
                        ctx.color,
                        520 * p,
                        460),
                    bloom(ctx.layer,
                        at,
                        0xffffff,
                        230 * p,
                        240),
                    cut(ctx,
                        at,
                        .82,
                        190 * p,
                        130,
                        13),
                    cut(ctx,
                        at,
                        -.82,
                        190 * p,
                        130,
                        13),
                    dustBurst(ctx.layer,
                        at,
                        shards(ctx,
                            {
                                count: Math.round(260 * p), additive: true, color: [0xffffff,
                                    0xffffff,
                                    STEEL,
                                    ctx.color], spread: 30, speed: [420,
                                    1300], size: [84,
                                    18], life: [190,
                                    420]
                            })),
                    dustBurst(ctx.layer,
                        at,
                        wisp(ctx,
                            {
                                count: Math.round(100 * p), spread: 90, speed: [80,
                                    420], life: [380,
                                    860]
                            })),

                ])
            })
        ])
    })

/** Lá R mất hẳn sau khi dùng: lá trên tay rã thành khói và tàn đỏ, không về mộ */
registerVfx("zedCardVanish",
    async (ctx) => {
        await Promise.all([
            mist(ctx.layer,
                ctx.from,
                {
                    color: INK, size: 120, count: 10, alpha: .66, additive: false, gravity: -90
                }),
            dustBurst(ctx.layer,
                ctx.from,
                wisp(ctx,
                    {
                        count: 190, spread: 54, gravity: -220
                    })),
            dustBurst(ctx.layer,
                ctx.from,
                shards(ctx,
                    {
                        count: 46, spread: 34, speed: [120,
                            380], size: [34,
                            8]
                    }))
        ])
    })
