// VFX riêng của Aatrox, chất liệu MÁU DARKIN: máu đặc đỏ thẫm, khói đen, mép kiếm nóng chảy vàng cam, xích sắt đen xoắn đôi quầng lửa cam, đôi cánh quỷ. Màu lấy từ icon chiêu và LMHT. Không dùng nét vẽ hình học.
// Mỗi hiệu ứng chỉ dựa vào VfxCtx và tự dọn khi layer bị huỷ; trúng là báo ctx.onBeat, không chờ đuôi hạt tan.
import {
    bloom, dustBurst, dustStream, mist, type DustOpts
} from "./fx_dust"
import {
    ease, lerp, rand, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const TAU = Math.PI * 2
const CRIMSON = 0xd0142c
const SCARLET = 0xff2a3c
const GORE = 0xa80f22
const BLOOD = 0x7a0a18
const DUSK = 0x4a0812
const BLACK = 0x16040a
const IRON = 0x2a0c12
const EMBER = 0xff4a1e
const MOLTEN = 0xffb43a
const HOT = 0xffe9c4
/** Kiếm giơ lên xong mới bổ xuống */
const Q_RAISE_MS = 460
/** Lưỡi kiếm lớn rơi từ trên cao xuống hàng địch */
const Q_SLAM_MS = 230
const Q_SEGMENTS = 10
const CHAIN_MS = 300
const CHAIN_HOLD_MS = 520
const CHAIN_TWISTS = 5
const R_CAST_MS = 820
const REBIRTH_MS = 420
const SUCK_MS = 320
const AURA_STEP_MS = 360
const AURA_MAX_MS = 11000
const AURA_DEFAULT_MS = 2400
/** Đầu các ngón cánh dơi, tính theo bề ngang cánh: trùng chỗ mép dưới lõm sâu nhất */
const WING_RIBS = [1 / 3,
    2 / 3,
    1]
/** Cổ tay cánh: điểm cao nhất, các ngón toả ra từ đây */
const WING_WRIST = .37

const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
/** ctx.amount là % Máu đã mất; trong dạng Kẻ Diệt Thế bên gọi nhân đôi nên có thể quá 100 */
const lossOf = (ctx: VfxCtx) => Math.min(ctx.amount ?? 0,
    200) / 100
const around = (at: Pt, r: number): Pt => {
    const a = rand(0,
            TAU), d = Math.sqrt(Math.random()) * r
    return {
        x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d
    }
}

/** Máu đặc: giọt nặng, rơi xuống, không phát sáng nên vẫn đọc được trên bàn sáng */
const gore = (over: Partial<DustOpts> = {
}): DustOpts => ({
    color: [CRIMSON,
        GORE,
        BLOOD,
        SCARLET], speed: [120,
        420], gravity: 680, drag: 1.1, flow: 40, life: [360,
        760], size: [11,
        3], streak: 1.9, alpha: 1, additive: false, ...over
})
/** Mảnh sắc nóng chảy từ mép kiếm */
const edge = (over: Partial<DustOpts> = {
}): DustOpts => ({
    blade: true, color: [HOT,
        MOLTEN,
        EMBER,
        CRIMSON], speed: [260,
        760], drag: 4, flow: 20, life: [140,
        320], size: [46,
        12], alpha: 1, ...over
})

/** Nhát chém trúng da thịt: máu văng, mảnh sắc toả, khói đen phía sau */
function spatter(ctx: VfxCtx, at: Pt, power: number, count: number) {
    return Promise.all([
        mist(ctx.layer,
            at,
            {
                color: [BLACK,
                    BLOOD], size: 130 * power, alpha: .55, count: 8, speed: [30,
                    110], additive: false
            }),
        bloom(ctx.layer,
            at,
            CRIMSON,
            320 * power,
            340),
        bloom(ctx.layer,
            at,
            HOT,
            100 * power,
            170),
        dustBurst(ctx.layer,
            at,
            {
                ...gore({
                    speed: [140 * power,
                        520 * power], spread: 18 * power
                }), count
            }),
        dustBurst(ctx.layer,
            at,
            {
                ...edge({
                    speed: [120 * power,
                        760 * power], size: [52 * power,
                        12], spread: 26 * power, life: [120,
                        360]
                }), count: Math.round(count * .16)
            })
    ])
}

/** Máu từ khắp nơi bị hút về `at`: mỗi cung một luồng để hạt bay đúng hướng tâm */
function suck(ctx: VfxCtx, at: Pt, ms: number, reach: number, perSec: number) {
    const sectors = 12
    const speed = reach / (SUCK_MS / 1000)
    return Promise.all(Array.from({
        length: sectors
    },
    (_, i) => {
        const a = i / sectors * TAU
        const from = () => {
            const b = a + rand(-.3,
                    .3), d = reach * rand(.55,
                    1.15)
            return {
                x: at.x + Math.cos(b) * d, y: at.y + Math.sin(b) * d
            }
        }
        return dustStream(ctx.layer,
            from,
            ms,
            perSec / sectors,
            {
                color: [CRIMSON,
                    GORE,
                    BLOOD,
                    SCARLET,
                    EMBER], speed: [speed * .6,
                    speed * 1.2], angle: [a + Math.PI - .2,
                    a + Math.PI + .2], drag: 0, flow: 110, life: [SUCK_MS * .7,
                    SUCK_MS], size: [22,
                    6], streak: 3.6, alpha: 1, additive: false
            })
    }))
}

/** Nội tại: Aatrox càng mất máu, khí huyết càng bốc dày quanh lá tướng. ctx.amount là % Máu đã mất. Có ctx.tether thì bám lá và chạy tới khi thả */
registerVfx("aatroxBloodRage",
    async (ctx) => {
        const k = kOf(ctx)
        const l = Math.min(lossOf(ctx),
            1.4)
        const at = () => ctx.tether?.target() ?? ctx.from
        const limit = ctx.tether ? AURA_MAX_MS : AURA_DEFAULT_MS
        /** Bám viền lá tướng, không phủ lên mặt lá */
        const body = () => {
            const p = at()
            const onSide = Math.random() < .68
            return onSide ? {
                x: p.x + (Math.random() < .5 ? -1 : 1) * rand(70,
                    98) * k, y: p.y + rand(-90,
                    100) * k
            } : {
                x: p.x + rand(-90,
                    90) * k, y: p.y - rand(96,
                    122) * k
            }
        }
        const pieces: Promise<unknown>[] = []
        let el = 0
        while (!ctx.layer.destroyed && !ctx.tether?.released() && el < limit) {
            pieces.push(dustStream(ctx.layer,
                body,
                AURA_STEP_MS,
                50 + 330 * l,
                {
                    color: [CRIMSON,
                        GORE,
                        SCARLET,
                        EMBER], speed: [40,
                        150], angle: [-Math.PI * .64,
                        -Math.PI * .36], gravity: -130, drag: 1.2, flow: 70, life: [340,
                        720], size: [14 + 16 * l,
                        4], streak: 3, alpha: .92, additive: false
                }),
            dustStream(ctx.layer,
                body,
                AURA_STEP_MS,
                10 + 70 * l,
                {
                    puff: true, color: [BLACK,
                        DUSK,
                        BLOOD], speed: [14,
                        50], angle: [-Math.PI * .7,
                        -Math.PI * .3], gravity: -40, flow: 26, life: [420,
                        760], size: [40,
                        84], alpha: .22 + .14 * l, additive: false
                }),
            dustStream(ctx.layer,
                body,
                AURA_STEP_MS,
                12 + 90 * l,
                gore({
                    speed: [6,
                        40], angle: [Math.PI * .4,
                        Math.PI * .6], gravity: 420, flow: 12, life: [340,
                        680], size: [9,
                        3]
                })),
            bloom(ctx.layer,
                at(),
                CRIMSON,
                (120 + 240 * l) * k,
                720))
            await tween(AURA_STEP_MS,
                () => {},
                ease.linear,
                ctx.layer)
            el += AURA_STEP_MS
        }
        await Promise.all(pieces)
    })

/** Nội tại trúng: phần sát thương thêm là máu văng tại mục tiêu, Máu mất càng nhiều càng nặng */
registerVfx("aatroxBloodSurge",
    async (ctx) => {
        const l = lossOf(ctx)
        ctx.shake(2 + 6 * l,
            170)
        await spatter(ctx,
            ctx.from,
            kOf(ctx) * (.8 + l * 1.1),
            Math.round(80 + 280 * l))
    })

/** Hồi máu theo sát thương: dải máu hiện cùng lúc trên toàn đường từ `from` (nạn nhân) tới to[0] (Aatrox), không có đầu đạn nên máu lên đúng nhịp trúng */
registerVfx("aatroxBloodDrain",
    async (ctx) => {
        const home = ctx.to[0] ?? ctx.from
        const power = kOf(ctx) * (.85 + lossOf(ctx) * .8)
        const start = ctx.from
        const len = Math.hypot(home.x - start.x,
            home.y - start.y) || 1
        const dir = Math.atan2(home.y - start.y,
            home.x - start.x)
        const speed = Math.max(len * 2.4,
            320)
        const seeds = Math.round(len / 15)
        const ribbon = (life: number): DustOpts => ({
            color: [CRIMSON,
                SCARLET,
                GORE,
                BLOOD], speed: [speed * .85,
                speed * 1.1], angle: [dir - .07,
                dir + .07], drag: 0, flow: 80, life: [life * .7,
                life], size: [14 * power,
                4], streak: 2.6, alpha: 1, spread: 11 * power, additive: false
        })
        ctx.onBeat?.()
        await Promise.all([
            ...Array.from({
                length: seeds
            },
            (_, i) => {
                const t = i / seeds
                return dustBurst(ctx.layer,
                    {
                        x: lerp(start.x,
                            home.x,
                            t), y: lerp(start.y,
                            home.y,
                            t)
                    },
                    {
                        ...ribbon(Math.max(90,
                            (1 - t) * len / speed * 1000)), count: Math.round(15 * power)
                    })
            }),
            dustStream(ctx.layer,
                () => around(start,
                    16 * power),
                380,
                520 * power,
                ribbon(len / speed * 1000)),
            bloom(ctx.layer,
                home,
                CRIMSON,
                240 * power,
                380),
            dustBurst(ctx.layer,
                home,
                {
                    color: [SCARLET,
                        EMBER,
                        MOLTEN], speed: [20,
                        110], gravity: -170, drag: 1.2, flow: 60, life: [380,
                        780], size: [7,
                        2], alpha: 1, spread: 56, count: Math.round(36 * power)
                })
        ])
    })

/** Q mở màn: máu trào khỏi thân Aatrox và đọng thành thanh đại kiếm giơ cao; kiếm thành hình là báo nhịp */
registerVfx("aatroxBladeRaise",
    async (ctx) => {
        const k = kOf(ctx)
        const root = ctx.from
        const tall = 300 * k
        let grow = 0
        /** Điểm trên thân kiếm: u từ chuôi tới mũi, kiếm thuôn dần */
        const swordAt = (wide: number) => () => {
            const u = rand(0,
                grow)
            return {
                x: root.x + rand(-wide,
                    wide) * (1 - u * .86) * k, y: root.y - 40 * k - u * tall
            }
        }
        const up = {
            angle: [-Math.PI / 2 - .05,
                -Math.PI / 2 + .05] as [number, number], speed: [20,
                    90] as [number, number], drag: 2, flow: 8
        }
        const ms = Q_RAISE_MS - 40
        await Promise.all([
            tween(Q_RAISE_MS,
                (t) => { grow = t },
                ease.out,
                ctx.layer).then(() => ctx.onBeat?.()),
            bloom(ctx.layer,
                root,
                CRIMSON,
                300 * k,
                Q_RAISE_MS),
            dustBurst(ctx.layer,
                root,
                {
                    ...gore({
                        speed: [160,
                            560], spread: 40 * k, size: [13,
                            3]
                    }), count: 240
                }),
            dustStream(ctx.layer,
                swordAt(40),
                ms,
                900,
                {
                    ...up, blade: true, color: [BLACK,
                        DUSK,
                        BLOOD], life: [160,
                        280], size: [78,
                        34], alpha: .9, additive: false
                }),
            dustStream(ctx.layer,
                swordAt(26),
                ms,
                1900,
                {
                    ...up, blade: true, color: [EMBER,
                        CRIMSON,
                        SCARLET], life: [150,
                        270], size: [64,
                        28], alpha: 1
                }),
            dustStream(ctx.layer,
                swordAt(9),
                ms,
                1500,
                {
                    ...up, blade: true, color: [HOT,
                        MOLTEN], life: [130,
                        240], size: [46,
                        20], alpha: 1
                }),
            dustStream(ctx.layer,
                () => around(root,
                    50 * k),
                ms,
                420,
                gore({
                    speed: [240,
                        520], angle: [-Math.PI * .6,
                        -Math.PI * .4], gravity: -200, life: [200,
                        340], size: [12,
                        3], flow: 30
                }))
        ])
    })

/** Vùng lưỡi kiếm phủ: chính giữa các mục tiêu, rộng hơn mỗi đầu một lá tướng */
function bladeSpan(to: Pt[], k: number) {
    const xs = to.map(p => p.x)
    const lo = Math.min(...xs), hi = Math.max(...xs)
    return {
        x: (lo + hi) / 2, y: to.reduce((sum, p) => sum + p.y,
            0) / to.length, half: (hi - lo) / 2 + 150 * k
    }
}

/** Q: lưỡi đại kiếm khổng lồ hình lưỡi liềm hiện ngay trước hàng địch, từ phía Aatrox bổ thẳng vào cả ba đường trong cùng một nhịp. Cận chiến: đòn chém diễn ra tại mục tiêu, không bay từ Aatrox sang */
registerVfx("aatroxBladeSlam",
    async (ctx) => {
        const k = kOf(ctx)
        const points = ctx.to.length ? ctx.to : [ctx.from]
        const span = bladeSpan(points,
            k)
        /** Phía Aatrox so với hàng địch: +1 là dưới, -1 là trên */
        const back = ctx.from.y >= span.y ? 1 : -1
        const bow = 84 * k
        const reach = 190 * k
        let lift = reach
        /** Thân lưỡi: giữa nhô về phía địch, hai đầu thuôn lại. u từ -1 tới 1; depth lùi về sau mép chém */
        const arcAt = (u: number, depth: number): Pt => ({
            x: span.x + u * span.half,
            y: span.y + back * (lift + bow * .5 - bow * (1 - u * u) + depth * Math.random() * (1 - u * u))
        })
        const segments = Array.from({
            length: Q_SEGMENTS
        },
        (_, i) => {
            const a = i / Q_SEGMENTS * 2 - 1, b = (i + 1) / Q_SEGMENTS * 2 - 1
            const mid = (a + b) / 2
            return {
                a, b, angle: Math.atan2(back * 2 * bow * mid,
                    span.half)
            }
        })
        const rate = span.half / 110
        const layerOf = (depth: number, perSec: number, look: Omit<DustOpts, "angle">) => segments.map(({
            a, b, angle
        }) => dustStream(ctx.layer,
            () => arcAt(rand(a,
                b),
            depth),
            Q_SLAM_MS,
            perSec * rate,
            {
                ...look, angle: [angle - .04,
                    angle + .04]
            }))
        const soft = {
            speed: [30,
                130] as [number, number], drag: 2, flow: 10, streak: 5
        }
        const streams = [
            ...layerOf(120 * k,
                260,
                {
                    ...soft, color: [BLACK,
                        DUSK,
                        BLOOD], life: [130,
                        240], size: [30,
                        14], alpha: .85, additive: false
                }),
            ...layerOf(64 * k,
                460,
                {
                    ...soft, color: [CRIMSON,
                        GORE,
                        SCARLET], life: [120,
                        220], size: [24,
                        10], alpha: 1, additive: false
                }),
            ...layerOf(18 * k,
                340,
                {
                    ...soft, color: [EMBER,
                        MOLTEN], life: [100,
                        190], size: [16,
                        6], alpha: 1
                }),
            ...layerOf(5 * k,
                130,
                {
                    blade: true, color: [HOT,
                        MOLTEN], speed: [120,
                        320], drag: 2, flow: 0, life: [90,
                        170], size: [70,
                        30], alpha: 1
                })
        ]
        await Promise.all([
            ...streams,
            tween(Q_SLAM_MS,
                (t) => { lift = reach * (1 - t) },
                ease.in,
                ctx.layer).then(async () => {
                ctx.shake(11,
                    280)
                ctx.onBeat?.()
                await Promise.all([
                    mist(ctx.layer,
                        {
                            x: span.x, y: span.y
                        },
                        {
                            color: [BLACK,
                                DUSK], size: span.half * 1.3, alpha: .4, count: 10, speed: [50,
                                170], additive: false
                        }),
                    ...segments.map(({
                        a, b, angle
                    }) => dustBurst(ctx.layer,
                        arcAt((a + b) / 2,
                            0),
                        {
                            ...edge({
                                speed: [120,
                                    620], angle: [angle - .16,
                                    angle + .16], spread: 26, life: [160,
                                    420], size: [56,
                                    14]
                            }), count: 12
                        }))
                ])
            })
        ])
    })

/** Q trúng: mỗi đường một vụ máu nổ, mảnh kiếm nóng chảy và khói đen */
registerVfx("aatroxBladeHit",
    async (ctx) => {
        await spatter(ctx,
            ctx.from,
            1.35 * kOf(ctx),
            Math.round(300 * ctx.intensity))
    })

/** E: hai sợi xích sắt đen xoắn đôi, quầng lửa cam như icon. Chạm là báo nhịp, xích giữ căng một lúc để máu chảy dọc theo */
registerVfx("aatroxChainThrow",
    async (ctx) => {
        const k = kOf(ctx)
        const lit = {
            color: [EMBER,
                MOLTEN,
                CRIMSON], speed: [4,
                    26] as [number, number], drag: 3, flow: 14, life: [200,
                        420] as [number, number], size: [16,
                            5] as [number, number], alpha: .8
        }
        await Promise.all(ctx.to.map(async (to) => {
            const dx = to.x - ctx.from.x, dy = to.y - ctx.from.y
            const len = Math.hypot(dx,
                dy) || 1
            const dir = Math.atan2(dy,
                dx)
            const nx = -dy / len, ny = dx / len
            /** Điểm trên một sợi xích tại t; sợi sau lệch nửa vòng xoắn */
            const strand = (t: number, phase: number): Pt => {
                const swing = Math.sin(t * TAU * CHAIN_TWISTS + phase) * 15 * k
                return {
                    x: ctx.from.x + dx * t + nx * swing, y: ctx.from.y + dy * t + ny * swing
                }
            }
            let tail = 0, head = 0, held = false
            const on = (phase: number) => () => strand(held ? rand(0,
                1) : rand(tail,
                head),
            phase)
            const link = (phase: number) => dustStream(ctx.layer,
                on(phase),
                CHAIN_MS + CHAIN_HOLD_MS,
                1500,
                {
                    blade: true, color: [BLACK,
                        IRON,
                        DUSK], speed: [6,
                        30], angle: [dir - .3,
                        dir + .3], drag: 3, flow: 4, life: [180,
                        360], size: [24 * k,
                        13 * k], alpha: 1, additive: false
                })
            await Promise.all([
                dustStream(ctx.layer,
                    () => around(on(0)(),
                        16 * k),
                    CHAIN_MS + CHAIN_HOLD_MS,
                    900,
                    lit),
                dustStream(ctx.layer,
                    () => around(on(Math.PI)(),
                        16 * k),
                    CHAIN_MS + CHAIN_HOLD_MS,
                    900,
                    lit),
                link(0),
                link(Math.PI),
                tween(CHAIN_MS,
                    (t) => {
                        tail = head
                        head = t
                    },
                    ease.in,
                    ctx.layer).then(() => {
                    held = true
                    ctx.onBeat?.()
                })
            ])
        }))
    })

/** E trúng: xích siết lại, lốc lửa cam xoáy quanh mục tiêu, máu bật ra */
registerVfx("aatroxChainHit",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        ctx.shake(5,
            180)
        let spin = 0
        const swirl = () => {
            const a = spin + rand(-.5,
                    .5), r = rand(30,
                    92) * k
            return {
                x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r * .72
            }
        }
        await Promise.all([
            spatter(ctx,
                at,
                1.05 * k,
                Math.round(190 * ctx.intensity)),
            dustStream(ctx.layer,
                swirl,
                460,
                1300,
                {
                    color: [EMBER,
                        MOLTEN,
                        CRIMSON], speed: [10,
                        60], drag: 2, flow: 30, life: [180,
                        380], size: [17,
                        5], alpha: .9
                }),
            dustStream(ctx.layer,
                swirl,
                460,
                620,
                {
                    blade: true, color: [BLACK,
                        IRON], speed: [20,
                        80], drag: 2, flow: 40, life: [160,
                        320], size: [30,
                        14], alpha: 1, additive: false
                }),
            tween(460,
                (t) => { spin = t * TAU * 1.6 },
                ease.out,
                ctx.layer)
        ])
    })

/** R mở màn: bóng đen phủ, máu cả bàn bị hút về Aatrox. Tụ xong là báo nhịp biến hình */
registerVfx("aatroxWorldEnderCast",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        await Promise.all([
            mist(ctx.layer,
                at,
                {
                    color: [BLACK,
                        DUSK], size: 380 * k, alpha: .34, count: 16, speed: [20,
                        90], life: [R_CAST_MS,
                        R_CAST_MS * 1.3], additive: false
                }),
            suck(ctx,
                at,
                R_CAST_MS - SUCK_MS,
                310 * k,
                4200),
            bloom(ctx.layer,
                at,
                CRIMSON,
                240 * k,
                R_CAST_MS),
            tween(R_CAST_MS,
                () => {},
                ease.linear,
                ctx.layer).then(() => ctx.onBeat?.())
        ])
    })

const wingX = (s: number) => 34 + 316 * s
/** Mép trên cánh dơi: từ vai vọt lên cổ tay rồi vuốt dài ra mũi nhọn */
const wingTopY = (s: number) => s < WING_WRIST
    ? lerp(-26,
        -230,
        Math.sin(s / WING_WRIST * Math.PI / 2))
    : lerp(-230,
        -120,
        Math.pow((s - WING_WRIST) / (1 - WING_WRIST),
            1.4))
/** Mép dưới màng cánh: lõm giữa các ngón, khép lại ở mũi cánh */
const wingLowY = (s: number) => lerp(40,
    -120,
    s) - 62 * Math.abs(Math.sin(s * Math.PI * 3))

/** Gốc cánh ở đỉnh lá tướng để cánh xoè lên, không phủ mặt lá */
const overCard = (at: Pt, k: number): Pt => ({
    x: at.x, y: at.y - 74 * k
})

/** Đôi cánh quỷ bằng máu và khói: màng tối, sườn đỏ rực, mép cháy, tàn lửa bay lên. open(): độ xoè 0..1 */
function wings(ctx: VfxCtx, where: () => Pt, ms: number, scale: number, density: number, open: () => number) {
    let flip = 1
    const side = () => {
        flip = -flip
        return flip
    }
    /** Cánh mở từ vai ra: open() thu nhỏ cả hình quanh gốc */
    const place = (x: number, y: number): Pt => {
        const at = where(), o = .25 + .75 * open(), flipX = side()
        return {
            x: at.x + flipX * x * scale * o, y: at.y + y * scale * o
        }
    }
    const membrane = () => {
        const s = Math.pow(Math.random(),
            .8)
        return place(wingX(s),
            lerp(wingTopY(s),
                wingLowY(s),
                Math.random()))
    }
    const rim = () => {
        const s = Math.random()
        return place(wingX(s),
            wingTopY(s))
    }
    const rib = () => {
        const s = WING_RIBS[Math.floor(Math.random() * WING_RIBS.length)]
        const t = Math.random()
        return place(lerp(wingX(WING_WRIST),
            wingX(s),
            t),
        lerp(wingTopY(WING_WRIST),
            wingLowY(s),
            t))
    }
    return Promise.all([
        dustStream(ctx.layer,
            membrane,
            ms,
            2800 * density,
            {
                color: [BLOOD,
                    DUSK,
                    BLACK,
                    GORE], speed: [6,
                    30], drag: 2, flow: 24, life: [240,
                    460], size: [30 * scale + 8,
                    16 * scale + 5], alpha: .78, additive: false
            }),
        dustStream(ctx.layer,
            rib,
            ms,
            1500 * density,
            {
                color: [SCARLET,
                    CRIMSON,
                    EMBER], speed: [4,
                    20], drag: 2, flow: 12, life: [160,
                    320], size: [5 * scale + 2,
                    2], alpha: .95
            }),
        dustStream(ctx.layer,
            rim,
            ms,
            2200 * density,
            {
                color: [SCARLET,
                    EMBER,
                    MOLTEN], speed: [10,
                    46], angle: [-Math.PI * .7,
                    -Math.PI * .3], drag: 1.6, flow: 16, life: [180,
                    360], size: [3 * scale + 2,
                    1.5], streak: 2.4, alpha: 1
            }),
        dustStream(ctx.layer,
            membrane,
            ms,
            240 * density,
            {
                color: [MOLTEN,
                    EMBER,
                    SCARLET], speed: [20,
                    90], gravity: -170, drag: 1, flow: 60, life: [460,
                    1000], size: [3.5,
                    1], alpha: 1
            })
    ])
}

/** R nhịp trúng: đôi cánh bung rộng sau lưng Aatrox, bàn nhuốm đỏ. Một lần, không lặp */
registerVfx("aatroxWorldEnderWings",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        let open = .05
        ctx.shake(13,
            420)
        await Promise.all([
            bloom(ctx.layer,
                at,
                CRIMSON,
                980 * k,
                620),
            bloom(ctx.layer,
                at,
                HOT,
                220 * k,
                240),
            dustBurst(ctx.layer,
                at,
                {
                    ...gore({
                        speed: [200,
                            760], spread: 40 * k, size: [14,
                            3], life: [420,
                            900]
                    }), count: 420
                }),
            wings(ctx,
                () => overCard(at,
                    k),
                1120,
                k,
                1,
                () => open),
            tween(280,
                (t) => { open = lerp(.05,
                    1,
                    t) },
                ease.out,
                ctx.layer)
        ])
    })

/** R trúng: máu và lưỡi đỏ phụt lên từ dưới chân mỗi địch */
registerVfx("aatroxWorldEnderHit",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        await Promise.all([
            spatter(ctx,
                at,
                k,
                Math.round(120 * ctx.intensity)),
            dustBurst(ctx.layer,
                {
                    x: at.x, y: at.y + 60 * k
                },
                {
                    ...edge({
                        speed: [340,
                            900], angle: [-Math.PI * .68,
                            -Math.PI * .32], color: [CRIMSON,
                            SCARLET,
                            EMBER,
                            MOLTEN], size: [80,
                            18], life: [200,
                            420], spread: 44
                    }), count: 90
                })
        ])
    })

/** Dạng Kẻ Diệt Thế duy trì: đôi cánh nhỏ, mờ bám theo lá tướng. Có ctx.tether thì chạy tới khi được thả */
registerVfx("aatroxWorldEnderAura",
    async (ctx) => {
        const k = kOf(ctx)
        const at = () => ctx.tether?.target() ?? ctx.from
        const limit = ctx.tether ? AURA_MAX_MS : AURA_DEFAULT_MS
        const pieces: Promise<unknown>[] = []
        let el = 0
        while (!ctx.layer.destroyed && !ctx.tether?.released() && el < limit) {
            pieces.push(wings(ctx,
                () => overCard(at(),
                    k * 1.25),
                AURA_STEP_MS,
                .5 * k,
                .4,
                () => 1),
            bloom(ctx.layer,
                at(),
                CRIMSON,
                260 * k,
                720))
            await tween(AURA_STEP_MS,
                () => {},
                ease.linear,
                ctx.layer)
            el += AURA_STEP_MS
        }
        await Promise.all(pieces)
    })

/** Lần đầu về 0: máu rút cạn vào lõi rồi Aatrox bùng dậy, cánh xé ra. Bùng dậy là báo nhịp hồi Máu */
registerVfx("aatroxRebirth",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        await Promise.all([
            mist(ctx.layer,
                at,
                {
                    color: [BLACK,
                        DUSK], size: 240 * k, alpha: .7, count: 12, speed: [10,
                        40], life: [REBIRTH_MS,
                        REBIRTH_MS * 1.5], additive: false
                }),
            suck(ctx,
                at,
                REBIRTH_MS - SUCK_MS * .5,
                240 * k,
                2200),
            tween(REBIRTH_MS,
                () => {},
                ease.linear,
                ctx.layer).then(async () => {
                ctx.shake(10,
                    320)
                ctx.onBeat?.()
                let open = .2
                await Promise.all([
                    bloom(ctx.layer,
                        at,
                        HOT,
                        300 * k,
                        260),
                    bloom(ctx.layer,
                        at,
                        CRIMSON,
                        720 * k,
                        520),
                    dustBurst(ctx.layer,
                        at,
                        {
                            ...gore({
                                speed: [220,
                                    820], spread: 34 * k, size: [14,
                                    3], life: [420,
                                    900]
                            }), count: 460
                        }),
                    dustBurst(ctx.layer,
                        at,
                        {
                            ...edge({
                                speed: [300,
                                    980], size: [70,
                                    16], life: [200,
                                    420]
                            }), count: 130
                        }),
                    wings(ctx,
                        () => overCard(at,
                            k),
                        620,
                        k,
                        .9,
                        () => open),
                    tween(220,
                        (t) => { open = lerp(.2,
                            1,
                            t) },
                        ease.out,
                        ctx.layer)
                ])
            })
        ])
    })
