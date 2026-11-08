// VFX riêng của Vayne, chất liệu BÓNG ĐÊM VÀ BẠC: khói mực chàm, mũi nỏ bạc sắc, cánh dơi bằng hạt của Giờ Cuối. Không dùng nét vẽ hình học.
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
const INK = 0x170f3d
const INDIGO = 0x3528a6
const VIOLET = 0x7c4dff
const BLUE = 0x4f7dff
const SILVER = 0xdfe6ff
const WHITE = 0xffffff
const CRIMSON = 0xff2b4e
const GOLD = 0xffcf6e
const AMBER = 0xff9a3c
/** Lá tướng lộn sang đường kề trong đúng chừng này */
export const VAYNE_TUMBLE_MS = 620
/** Đòn đang nhắm chạm ô cũ khi hai lá đang ở giữa đường, ô cũ trống */
export const VAYNE_WHIFF_MS = 240
const AURA_MAX_MS = 14000
const WING_MS = 900

const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
const around = (at: Pt, r: number): Pt => {
    const a = rand(0,
            TAU), d = Math.sqrt(Math.random()) * r
    return {
        x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d
    }
}
const dirOf = (a: Pt, b: Pt) => Math.atan2(b.y - a.y,
    b.x - a.x)
const inked = (over: Partial<DustOpts> = {
}): DustOpts => ({
    color: [INK,
        INDIGO,
        0x24185e], speed: [10,
        60], gravity: -30, drag: 1.6, flow: 60, life: [320,
        700], size: [24,
        9], alpha: .85, additive: false, ...over
})
const motes = (over: Partial<DustOpts> = {
}): DustOpts => ({
    color: [BLUE,
        VIOLET,
        SILVER], speed: [20,
        130], gravity: -40, drag: 1.5, flow: 70, life: [420,
        900], size: [5,
        1.4], alpha: 1, ...over
})

/** Thân mũi nỏ: chùm mảnh sắc phóng theo hướng bay, kèm đuôi hạt và quầng sáng bám đầu tên; chạm là báo nhịp */
async function bolt(ctx: VfxCtx, to: Pt, o: { ms: number; width: number; shard: number[]; trail: number[]; core: number; halo: number }) {
    const dir = dirOf(ctx.from,
        to)
    let p = {
        ...ctx.from
    }
    const halo = makeSprite(ctx.layer,
        "glow",
        p.x,
        p.y,
        o.halo,
        o.width * 5)
    const core = makeSprite(ctx.layer,
        "glow",
        p.x,
        p.y,
        o.core,
        o.width * 2.2)
    halo.alpha = .6
    const head = () => p
    await Promise.all([
        dustStream(ctx.layer,
            () => around(head(),
                o.width * .12),
            o.ms,
            1100,
            {
                color: o.shard, blade: true, speed: [520,
                    760], angle: [dir - .035,
                    dir + .035], drag: 0, flow: 0, life: [50,
                    110], size: [o.width * 3.6,
                    o.width * 2], alpha: 1
            }),
        dustStream(ctx.layer,
            () => around(head(),
                o.width * .4),
            o.ms,
            760,
            {
                color: o.trail, speed: [30,
                    140], angle: [dir + Math.PI - .35,
                    dir + Math.PI + .35], drag: 2.4, flow: 40, life: [200,
                    440], size: [o.width * .44,
                    o.width * .12], streak: 4, alpha: .95
            }),
        dustStream(ctx.layer,
            head,
            o.ms,
            70,
            inked({
                puff: true, size: [o.width * 2,
                    o.width * 3.4], life: [260,
                    520], alpha: .3, flow: 20, speed: [4,
                    20]
            })),
        tween(o.ms,
            (t) => {
                p = {
                    x: lerp(ctx.from.x,
                        to.x,
                        t), y: lerp(ctx.from.y,
                        to.y,
                        t)
                }
                for (const s of [halo,
                    core]) {
                    if (s.destroyed) continue
                    s.x = p.x
                    s.y = p.y
                }
            },
            ease.in,
            ctx.layer).then(() => {
            for (const s of [halo,
                core]) if (!s.destroyed) s.alpha = 0
            ctx.onBeat?.()
        })
    ])
}

/** Nội tại: khói đêm và đốm bạc xoáy về Vayne. ctx.amount là số tầng nhận; ngoài sân nhận nhiều nên cuồn cuộn hơn hẳn trên sân */
registerVfx("vayneNightGain",
    async (ctx) => {
        const home = ctx.from
        const gained = Math.max(1,
            ctx.amount ?? 1)
        const power = Math.sqrt(gained)
        const count = 3 + gained * 3
        const ms = 560
        let beat = false
        await Promise.all([
            ...Array.from({
                length: count
            },
            async (_, i) => {
                const a = i / count * TAU + rand(-.2,
                    .2)
                const r = rand(130,
                    190) * (.8 + power * .3)
                const swirl = (i % 2 ? 1 : -1) * rand(.9,
                    1.5)
                let p: Pt = {
                    x: home.x + Math.cos(a) * r, y: home.y + Math.sin(a) * r
                }
                const wait = i * 24
                await tween(wait,
                    () => {},
                    ease.linear,
                    ctx.layer)
                await Promise.all([
                    dustStream(ctx.layer,
                        () => p,
                        ms,
                        190,
                        inked({
                            size: [30,
                                10], life: [240,
                                520], spread: 12
                        })),
                    dustStream(ctx.layer,
                        () => p,
                        ms,
                        260,
                        {
                            color: [VIOLET,
                                BLUE,
                                SILVER], speed: [10,
                                50], drag: 2.4, flow: 60, life: [160,
                                340], size: [10,
                                2.5], streak: 3, alpha: 1, spread: 8
                        }),
                    tween(ms,
                        (t) => {
                            const left = 1 - t
                            const turn = a + swirl * t
                            p = {
                                x: home.x + Math.cos(turn) * r * left, y: home.y + Math.sin(turn) * r * left
                            }
                        },
                        ease.in,
                        ctx.layer)
                ])
                if (!beat) {
                    beat = true
                    ctx.onBeat?.()
                }
            }),
            tween(ms + 90,
                () => {},
                ease.linear,
                ctx.layer).then(() => Promise.all([
                bloom(ctx.layer,
                    home,
                    VIOLET,
                    150 + 90 * power,
                    420),
                bloom(ctx.layer,
                    home,
                    SILVER,
                    70 + 40 * power,
                    240),
                mist(ctx.layer,
                    home,
                    {
                        color: [INK,
                            INDIGO], size: 90 + 50 * power, alpha: .6, count: 8 + gained * 3, additive: false
                    }),
                dustBurst(ctx.layer,
                    home,
                    {
                        ...motes({
                            spread: 34, speed: [50,
                                170 + 50 * power]
                        }), count: 40 + gained * 38
                    }),
                dustBurst(ctx.layer,
                    home,
                    {
                        count: 8 + gained * 4, color: [CRIMSON,
                            0xff5c7a], speed: [30,
                            130], gravity: -30, drag: 2, flow: 40, life: [320,
                            640], size: [5,
                            1.5], alpha: 1, spread: 22
                    })
            ]))
        ])
    })

/** Mất một nửa Bóng Đêm khi gục: khói tuột khỏi lá, tan ngược lên trời */
registerVfx("vayneNightShed",
    async (ctx) => {
        const lost = Math.max(1,
            ctx.amount ?? 3)
        ctx.onBeat?.()
        await Promise.all([
            mist(ctx.layer,
                ctx.from,
                {
                    color: [INK,
                        INDIGO], size: 170, alpha: .75, count: 14, speed: [40,
                        150], gravity: -70, additive: false
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...inked({
                        speed: [80,
                            300], angle: [-Math.PI * .95,
                            -Math.PI * .05], gravity: -90, spread: 40
                    }), count: 70 + lost * 10
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...motes({
                        speed: [90,
                            320], angle: [-Math.PI * .95,
                            -Math.PI * .05], gravity: -110, spread: 34
                    }), count: 90 + lost * 14
                })
        ])
    })

/** Q mở màn và đường lộn: khói bùng ở chỗ cũ, cuộn khói xoắn hai sợi bám lá. Có ctx.tether thì bám lá thật; không có to[0] thì chỉ bùng tại chỗ */
registerVfx("vayneTumble",
    async (ctx) => {
        const k = kOf(ctx)
        const ignite = Promise.all([
            bloom(ctx.layer,
                ctx.from,
                BLUE,
                260 * k,
                340),
            mist(ctx.layer,
                ctx.from,
                {
                    color: [INK,
                        INDIGO,
                        0x2c3fb0], size: 170 * k, alpha: .85, count: 16, speed: [50,
                        170], life: [560,
                        1100], additive: false
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...motes({
                        speed: [80,
                            300], spread: 34
                    }), count: 130
                })
        ])
        const to = ctx.to[0]
        if (!to) {
            await ignite
            return
        }
        let p = {
            ...ctx.from
        }
        let spin = 0
        const where = () => ctx.tether?.target() ?? p
        const strand = (phase: number, r: number) => () => {
            const c = where()
            return {
                x: c.x + Math.cos(spin + phase) * r, y: c.y + Math.sin(spin + phase) * r * .8
            }
        }
        const ribbon: DustOpts = {
            color: [BLUE,
                SILVER,
                0x9fb6ff], speed: [8,
                40], flow: 40, drag: 2, life: [240,
                480], size: [13,
                3], streak: 3, alpha: 1
        }
        await Promise.all([
            ignite,
            dustStream(ctx.layer,
                strand(0,
                    72 * k),
                VAYNE_TUMBLE_MS,
                640,
                ribbon),
            dustStream(ctx.layer,
                strand(Math.PI,
                    72 * k),
                VAYNE_TUMBLE_MS,
                640,
                ribbon),
            dustStream(ctx.layer,
                () => around(where(),
                    52 * k),
                VAYNE_TUMBLE_MS,
                300,
                inked({
                    puff: true, size: [56 * k,
                        120 * k], life: [420,
                        860], alpha: .55, flow: 26, speed: [6,
                        30]
                })),
            tween(VAYNE_TUMBLE_MS,
                (t) => {
                    spin = t * TAU * 2.2
                    p = {
                        x: lerp(ctx.from.x,
                            to.x,
                            t), y: lerp(ctx.from.y,
                            to.y,
                            t)
                    }
                },
                ease.inOut,
                ctx.layer)
        ])
    })

/** Q đáp: khói cuộn dưới chân, bụi bạc bắn thấp theo cú trượt */
registerVfx("vayneTumbleLand",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                BLUE,
                200 * k,
                300),
            mist(ctx.layer,
                ctx.from,
                {
                    color: [INK,
                        INDIGO], size: 130 * k, alpha: .7, count: 10, additive: false
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...motes({
                        speed: [90,
                            340], angle: [-.4,
                            Math.PI + .4], spread: 30
                    }), count: 120
                })
        ])
    })

/** Q né: đòn đang nhắm bay xuyên ô trống rồi tan vào khói Vayne bỏ lại. from là kẻ đánh, to[0] là ô cũ */
registerVfx("vayneWhiff",
    async (ctx) => {
        const to = ctx.to[0] ?? ctx.from
        const dir = dirOf(ctx.from,
            to)
        const length = Math.hypot(to.x - ctx.from.x,
            to.y - ctx.from.y)
        const past = (length + 240) / length
        const shot = async (delay: number, lean: number) => {
            await tween(delay,
                () => {},
                ease.linear,
                ctx.layer)
            let p = {
                ...ctx.from
            }
            const ms = VAYNE_WHIFF_MS * past
            await Promise.all([
                dustStream(ctx.layer,
                    () => around(p,
                        6),
                    ms,
                    640,
                    {
                        color: [ctx.color,
                            ctx.color2 ?? WHITE,
                            WHITE], speed: [220,
                            420], angle: [dir + Math.PI - .12,
                            dir + Math.PI + .12], drag: 3, flow: 20, life: [140,
                            280], size: [12,
                            3], streak: 7, alpha: 1
                    }),
                tween(ms,
                    (t) => {
                        p = {
                            x: lerp(ctx.from.x,
                                to.x + lean,
                                t * past), y: lerp(ctx.from.y,
                                to.y,
                                t * past)
                        }
                    },
                    ease.linear,
                    ctx.layer)
            ])
            await dustBurst(ctx.layer,
                p,
                {
                    ...motes({
                        color: [ctx.color,
                            INDIGO,
                            SILVER], speed: [20,
                            110]
                    }), count: 34
                })
        }
        await Promise.all([
            mist(ctx.layer,
                to,
                {
                    color: [INK,
                        INDIGO], size: 150, alpha: .7, count: 12, life: [700,
                        1200], additive: false
                }),
            shot(0,
                -18),
            shot(70,
                16),
            shot(140,
                0)
        ])
    })

/** E mở màn: ánh vàng bạc rút vào nỏ */
registerVfx("vayneCondemnCast",
    async (ctx) => {
        const r = 150 * kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                GOLD,
                230,
                400),
            dustStream(ctx.layer,
                () => around(ctx.from,
                    r),
                340,
                900,
                {
                    color: [GOLD,
                        SILVER,
                        WHITE], speed: [0,
                        16], life: [120,
                        260], size: [8,
                        2], alpha: 1, flow: 80, drag: 1
                })
        ])
    })

/** E: mũi nỏ nặng, lớn hơn hẳn đòn thường, lõi vàng trắng */
registerVfx("vayneCondemnBolt",
    async (ctx) => {
        await Promise.all(ctx.to.map(to => bolt(ctx,
            to,
            {
                ms: 300, width: 34 * kOf(ctx), shard: [WHITE,
                    GOLD,
                    SILVER], trail: [GOLD,
                    AMBER,
                    BLUE], core: WHITE, halo: GOLD
            })))
    })

/** Chùm gai sáng theo hướng đạn, như tấm icon Kết Án. to[0] là nơi đạn tới từ đó; thiếu thì coi như đạn bay về phía đối diện bàn */
function spikes(ctx: VfxCtx, power: number, color: number[], count: number) {
    const source = ctx.to[0]
    const dir = source ? dirOf(source,
        ctx.from) : ctx.from.y < window.innerHeight / 2 ? -Math.PI / 2 : Math.PI / 2
    return dustBurst(ctx.layer,
        ctx.from,
        {
            count, color, blade: true, speed: [420 * power,
                1150 * power], angle: [dir - .75,
                dir + .75], drag: 5, flow: 0, life: [170,
                370], size: [130 * power,
                34], alpha: 1, spread: 16
        })
}

/** E trúng: chùm gai vàng trắng xoè theo hướng bắn, mảnh xanh văng ngược */
registerVfx("vayneCondemnHit",
    async (ctx) => {
        const power = kOf(ctx)
        ctx.shake(7,
            200)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                GOLD,
                340 * power,
                340),
            bloom(ctx.layer,
                ctx.from,
                WHITE,
                150 * power,
                200),
            spikes(ctx,
                power,
                [WHITE,
                    GOLD,
                    AMBER,
                    0xfff0c0],
                52),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 18, color: [BLUE,
                        0x8fb0ff], blade: true, speed: [240,
                        620], drag: 4, flow: 0, life: [200,
                        380], size: [60,
                        16], alpha: 1, spread: 14
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 150, color: [GOLD,
                        WHITE,
                        AMBER], speed: [90,
                        420], gravity: 120, drag: 2.6, flow: 40, life: [320,
                        720], size: [6,
                        1.6], alpha: 1, spread: 20
                }),
            mist(ctx.layer,
                ctx.from,
                {
                    color: [0x2c3fb0,
                        INDIGO], size: 120, alpha: .4, count: 8, additive: false
                })
        ])
    })

/** Điểm trên cánh dơi: xương cánh `rib` 0..4 toả từ vai, `u` 0..1 tính từ vai, viền cánh lõm giữa hai xương */
function wingAt(c: Pt, side: number, rib: number, u: number, span: number): Pt {
    const a = lerp(-1.32,
        .28,
        rib / 4)
    const reach = span * (1 - .16 * Math.abs(rib - 2) / 2)
    const dent = 1 - .26 * Math.abs(Math.sin(rib * Math.PI))
    const d = reach * u * dent
    return {
        x: c.x + side * (Math.cos(a) * d + 26), y: c.y + Math.sin(a) * d - 26
    }
}

/** R mở màn: cánh dơi bóng đêm xoè từ lưng Vayne, viền tím đỏ, lông vũ mực bay ra */
registerVfx("vayneFinalHourCast",
    async (ctx) => {
        const k = kOf(ctx)
        const span = 215 * k
        const at = ctx.from
        let open = .2
        const fill = () => wingAt(at,
            Math.random() < .5 ? -1 : 1,
            rand(0,
                4),
            Math.sqrt(Math.random()) * open,
            span)
        const edge = () => {
            const rib = rand(0,
                4)
            return wingAt(at,
                Math.random() < .5 ? -1 : 1,
                rib,
                open * rand(.93,
                    1.03),
                span)
        }
        const bone = () => wingAt(at,
            Math.random() < .5 ? -1 : 1,
            Math.round(rand(0,
                4)),
            rand(.05,
                1) * open,
            span)
        ctx.shake(5,
            340)
        await Promise.all([
            bloom(ctx.layer,
                at,
                VIOLET,
                460 * k,
                WING_MS),
            bloom(ctx.layer,
                at,
                CRIMSON,
                210 * k,
                560),
            dustStream(ctx.layer,
                fill,
                WING_MS,
                2600,
                {
                    color: [INK,
                        0x241566,
                        INDIGO], speed: [2,
                        18], gravity: 20, drag: 2, flow: 18, life: [300,
                        620], size: [30,
                        14], alpha: .92, additive: false
                }),
            dustStream(ctx.layer,
                edge,
                WING_MS,
                1700,
                {
                    color: [VIOLET,
                        CRIMSON,
                        0xc25cff], speed: [2,
                        20], gravity: 30, drag: 2, flow: 14, life: [220,
                        460], size: [11,
                        3], alpha: 1
                }),
            dustStream(ctx.layer,
                bone,
                WING_MS,
                1100,
                {
                    color: [0x9a7bff,
                        SILVER], speed: [0,
                        10], drag: 2, flow: 6, life: [150,
                        300], size: [6,
                        2], alpha: .95
                }),
            tween(WING_MS * .55,
                (t) => { open = lerp(.2,
                    1,
                    t) },
                ease.out,
                ctx.layer),
            tween(WING_MS * .8,
                () => {},
                ease.linear,
                ctx.layer).then(() => Promise.all([
                dustBurst(ctx.layer,
                    at,
                    {
                        count: 46, color: [INK,
                            INDIGO,
                            VIOLET], blade: true, speed: [260,
                            760], drag: 3.2, flow: 60, life: [420,
                            820], size: [46,
                            14], alpha: 1, spread: 90, additive: false
                    }),
                dustBurst(ctx.layer,
                    at,
                    {
                        ...motes({
                            color: [CRIMSON,
                                VIOLET,
                                SILVER], speed: [120,
                                420], spread: 60
                        }), count: 200
                    })
            ]))
        ])
    })

/** Hào quang Giờ Cuối bám lá suốt lượt: khói mực bốc lên, lưỡi tím đỏ, đôi mắt đỏ. Có ctx.tether thì chạy tới khi được thả */
registerVfx("vayneFinalHourAura",
    async (ctx) => {
        const at = () => ctx.tether?.target() ?? ctx.from
        const limit = ctx.tether ? AURA_MAX_MS : 2400
        const body = () => {
            const p = at()
            return {
                x: p.x + rand(-68,
                    68), y: p.y + rand(-30,
                    92)
            }
        }
        const pieces: Promise<unknown>[] = []
        let el = 0
        while (!ctx.layer.destroyed && !ctx.tether?.released() && el < limit) {
            pieces.push(dustStream(ctx.layer,
                body,
                320,
                190,
                inked({
                    speed: [24,
                        80], angle: [-Math.PI * .62,
                        -Math.PI * .38], gravity: -90, flow: 44, life: [520,
                        960], size: [30,
                        10], alpha: .7
                })),
            dustStream(ctx.layer,
                body,
                320,
                170,
                {
                    color: [VIOLET,
                        CRIMSON,
                        0xc25cff], speed: [40,
                        130], angle: [-Math.PI * .6,
                        -Math.PI * .4], gravity: -120, drag: 1.4, flow: 60, life: [360,
                        760], size: [15,
                        4], streak: 3, alpha: .95
                }),
            bloom(ctx.layer,
                at(),
                VIOLET,
                230,
                560))
            await tween(320,
                () => {},
                ease.linear,
                ctx.layer)
            el += 320
        }
        await Promise.all(pieces)
    })

/** Lá Đánh Thường rời tay thành luồng bạc vào nỏ Vayne */
registerVfx("vayneStrikeCard",
    async (ctx) => {
        const to = ctx.to[0] ?? ctx.from
        const ms = 200
        let p = {
            ...ctx.from
        }
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                SILVER,
                150,
                240),
            dustStream(ctx.layer,
                () => around(p,
                    12),
                ms,
                1100,
                {
                    color: [SILVER,
                        VIOLET,
                        WHITE], speed: [10,
                        60], drag: 2, flow: 50, life: [160,
                        320], size: [9,
                        2.4], alpha: 1
                }),
            tween(ms,
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
    })

/** R: đòn Đánh Thường Giờ Cuối. ctx.amount là số thứ tự đòn: càng về sau tên càng to, nhanh; ctx.color trắng là đòn thứ 3 */
registerVfx("vayneHourBolt",
    async (ctx) => {
        const n = Math.max(1,
            ctx.amount ?? 1)
        const pure = ctx.color === WHITE
        await Promise.all(ctx.to.map(to => bolt(ctx,
            to,
            {
                ms: Math.max(150,
                    250 - n * 15), width: (15 + n * 3.4) * (pure ? 1.25 : 1), shard: pure ? [WHITE,
                    SILVER] : [SILVER,
                    0xb79dff,
                    WHITE], trail: pure ? [WHITE,
                    SILVER,
                    VIOLET] : [VIOLET,
                    CRIMSON,
                    0xc25cff], core: WHITE, halo: pure ? SILVER : VIOLET
            })))
    })

/** R trúng: mảnh tím bạc xé qua lá, càng về sau càng dày */
registerVfx("vayneHourHit",
    async (ctx) => {
        const n = Math.max(1,
            ctx.amount ?? 1)
        const power = .8 + n * .13
        ctx.shake(2.5 + n * .7,
            140)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                VIOLET,
                220 * power,
                280),
            spikes(ctx,
                power,
                [SILVER,
                    VIOLET,
                    0xc25cff,
                    CRIMSON],
                18 + n * 5),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...motes({
                        color: [VIOLET,
                            SILVER,
                            CRIMSON], speed: [90,
                            360], spread: 18
                    }), count: 60 + n * 24
                }),
            mist(ctx.layer,
                ctx.from,
                {
                    color: [INK,
                        INDIGO], size: 90 * power, alpha: .5, count: 6, additive: false
                })
        ])
    })

/** Dấu Mũi Tên Bạc: 1 hoặc 2 chùm bụi bạc bám mép dưới lá, dưới vùng số nổi; đủ 3 là nổ */
registerVfx("vayneSilverMark",
    async (ctx) => {
        const marks = Math.min(2,
            Math.max(1,
                ctx.amount ?? 1))
        const ms = 620
        await Promise.all(Array.from({
            length: marks
        },
        (_, i) => {
            const at = {
                x: ctx.from.x + (i - (marks - 1) / 2) * 58, y: ctx.from.y + 42
            }
            return Promise.all([
                bloom(ctx.layer,
                    at,
                    SILVER,
                    74,
                    ms),
                dustStream(ctx.layer,
                    () => around(at,
                        20),
                    ms,
                    460,
                    {
                        color: [WHITE,
                            SILVER,
                            0xb9c6ff], speed: [6,
                            40], gravity: -40, drag: 2, flow: 30, life: [180,
                            380], size: [7,
                            2], alpha: 1
                    })
            ])
        }))
    })

/** Đòn thứ 3: nổ trắng tinh theo Máu tối đa, mảnh bạc toả mọi hướng, số trắng đáp cùng lúc */
registerVfx("vayneSilverBurst",
    async (ctx) => {
        const power = Math.sqrt(Math.max(1,
            ctx.amount ?? 1)) * kOf(ctx)
        ctx.shake(9 * power,
            260)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                WHITE,
                470 * power,
                420),
            bloom(ctx.layer,
                ctx.from,
                SILVER,
                250 * power,
                260),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 76, color: [WHITE,
                        SILVER,
                        0xcfd8ff], blade: true, speed: [520 * power,
                        1350 * power], drag: 5, flow: 0, life: [220,
                        440], size: [150 * power,
                        32], alpha: 1, spread: 14
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 300, color: [WHITE,
                        SILVER], speed: [120,
                        560 * power], gravity: 60, drag: 2.6, flow: 50, life: [380,
                        860], size: [7,
                        1.6], alpha: 1, spread: 26
                }),
            mist(ctx.layer,
                ctx.from,
                {
                    color: [WHITE,
                        SILVER], size: 170 * power, alpha: .32, count: 10, speed: [70,
                        190]
                })
        ])
    })
