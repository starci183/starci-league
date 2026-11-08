// VFX riêng của Viktor, bám sát Liên Minh: plasma hextech xanh điện, lõi trắng băng trên nền chàm sẫm, sét răng cưa, mảnh thép viền vàng. Vàng nóng chỉ xuất hiện nơi tia chạm đất, như icon Tia Tử Thần.
// Q là quả cầu plasma có gân sét, E là tia thẳng mảnh và vệt nổ dư chấn dọc đường quét, R là giếng trọng lực xanh với mảnh vụn tối bị hút vào. Không dùng nét vẽ hình học.
// Mỗi hiệu ứng chỉ dựa vào VfxCtx và tự dọn khi layer bị huỷ; trúng là báo ctx.onBeat, không chờ đuôi hạt tan. Trận thật gọi cast với `to` rỗng nên mỗi cast đều có đường lui.
import {
    Assets, Sprite, Texture, type Container
} from "pixi.js"
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
const BLUE = 0x2f7dff
const CYAN = 0x41c8ff
const ICE = 0xc8f9ff
const WHITE = 0xffffff
const DEEP = 0x2254a0
const INDIGO = 0x161d60
const NIGHT = 0x0c0e32
const GOLD = 0xffc860
const HOT = 0xfff0c8
const EMBER = 0xff9a3c
/** Giáp thép viền vàng của Viktor */
const STEEL = [0x8f9ea4,
    0x6c7483,
    0xc8c2af,
    0x3c3c44]
const SHARD = [...STEEL,
    GOLD]
const PLASMA = [BLUE,
    CYAN,
    ICE]
const ARC = [WHITE,
    ICE,
    CYAN]
const FIRE = [HOT,
    GOLD,
    EMBER]
/** Mảnh vụn trọng lực: đá tối như icon Trường Trọng Lực */
const RUBBLE = [NIGHT,
    INDIGO,
    0x24263e,
    0x3c3c44]
const CARD_W = 60
const CARD_H = 104
/** Lá bỏ tan từ trên xuống rồi mới bay */
const CRUMBLE_MS = 300
const FRAGMENT_MS = 460
/** Khiên mảnh tụ quanh Viktor trước khi nổ ra thành đạn */
const GATHER_MS = 420
const BURST_MS = 300
const SWEEP_MS = 460
const FIELD_MS = 820

const points = (ctx: VfxCtx) => ctx.to.length ? ctx.to : [ctx.from]
const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
/** Tiến Hoá làm chiêu nặng dần: 0 tầng bằng gốc, 20 tầng gấp 1,5 lần */
const powerOf = (ctx: VfxCtx) => kOf(ctx) * (1 + Math.min(ctx.amount ?? 0,
    20) / 40)
const wait = (layer: Container, ms: number) => tween(ms,
    () => {},
    ease.linear,
    layer)
function ahead(a: Pt, b: Pt, d: number): Pt {
    const len = Math.hypot(b.x - a.x,
        b.y - a.y) || 1
    return {
        x: a.x + (b.x - a.x) / len * d, y: a.y + (b.y - a.y) / len * d
    }
}
function beatOnce(ctx: VfxCtx) {
    let fired = false
    return () => {
        if (fired) return
        fired = true
        ctx.onBeat?.()
    }
}
/** Đường cong: lệch ngang rồi hút thẳng vào đích */
function bend(a: Pt, b: Pt, t: number, side: number): Pt {
    const dx = b.x - a.x, dy = b.y - a.y
    const len = Math.hypot(dx,
        dy) || 1
    const swing = Math.sin(t * Math.PI) * side * Math.min(150,
        len * .34)
    return {
        x: lerp(a.x,
            b.x,
            t) - dy / len * swing, y: lerp(a.y,
            b.y,
            t) + dx / len * swing
    }
}
const loadIcon = async (src?: string): Promise<Texture | null> => {
    if (!src) return null
    try {
        return await Assets.load<Texture>(src)
    } catch {
        return null
    }
}
/** Mép bàn gần phe tung chiêu: tay bài nằm ở đó khi trận thật không truyền vị trí lá */
const handEdge = (ctx: VfxCtx): Pt => {
    const H = ctx.app.screen.height
    return {
        x: ctx.from.x, y: ctx.from.y > H / 2 ? H - 70 : 70
    }
}
/** Hàng địch: có mục tiêu thì dùng, không thì trải đều ở nửa bàn đối diện */
const rowOf = (ctx: VfxCtx): Pt[] => {
    if (ctx.to.length) return ctx.to
    const W = ctx.app.screen.width, H = ctx.app.screen.height
    return Array.from({
        length: 5
    },
    (_, i) => ({
        x: W * (.2 + i * .15), y: H - ctx.from.y
    }))
}

/** Sét răng cưa: hạt sáng nằm dọc một đường gãy khúc; đầu gốc giữ nguyên, thân lệch ngẫu nhiên nên không thành nét thẳng */
function lightning(layer: Container, a: Pt, b: Pt, o: { color?: number[]; ms?: number; rate?: number; size?: number; jag?: number } = {
}) {
    const jag = o.jag ?? .2
    let nodes = [a,
        b]
    for (let level = 0; level < 4; level++) {
        const next: Pt[] = [nodes[0]]
        for (let i = 1; i < nodes.length; i++) {
            const p = nodes[i - 1], q = nodes[i]
            const len = Math.hypot(q.x - p.x,
                q.y - p.y)
            const off = rand(-1,
                1) * len * jag
            next.push({
                x: (p.x + q.x) / 2 - (q.y - p.y) / (len || 1) * off, y: (p.y + q.y) / 2 + (q.x - p.x) / (len || 1) * off
            },
            q)
        }
        nodes = next
    }
    let dir = 0
    const along = () => {
        const i = 1 + Math.floor(Math.random() * (nodes.length - 1))
        const p = nodes[i - 1], q = nodes[i], u = Math.random()
        dir = Math.atan2(q.y - p.y,
            q.x - p.x)
        return {
            x: lerp(p.x,
                q.x,
                u), y: lerp(p.y,
                q.y,
                u)
        }
    }
    const size = o.size ?? 8
    return dustStream(layer,
        along,
        o.ms ?? 110,
        o.rate ?? 5200,
        {
            color: o.color ?? ARC, streak: 3, speed: [1,
                5], get angle(): [number, number] {
                return [dir,
                    dir]
            }, life: [90,
                190], size: [size,
                size * .45], alpha: 1, flow: 0, drag: 0
        })
}

/** Hút vào tâm: hạt sinh trên vành rồi lao thẳng vào c, tới nơi là tắt */
function inward(layer: Container, c: () => Pt, r: number, ms: number, perSec: number, o: Partial<DustOpts> & { color: number[] }) {
    let dir = 0
    const [l0,
        l1] = o.life ?? [260,
        420]
    const mean = (l0 + l1) / 2000
    const rim = () => {
        const a = rand(0,
                TAU), d = r * rand(.6,
                1)
        const at = c()
        dir = a + Math.PI
        return {
            x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d * .82
        }
    }
    return dustStream(layer,
        rim,
        ms,
        perSec,
        {
            speed: [r * .7 / mean,
                r * .95 / mean], life: [l0,
                l1], drag: 0, flow: 14, alpha: 1, size: [7,
                2], ...o, get angle(): [number, number] {
                return [dir - .07,
                    dir + .07]
            }
        })
}

/** Mảnh thép quay quanh tâm thành khiên: từng cụm rải lưỡi theo tiếp tuyến, kèm tia điện */
function shardOrbit(layer: Container, c: () => Pt, ms: number, k: number, gather = false, clumps = 9) {
    const rx = 112 * k, ry = 136 * k
    let t = 0
    const streams = Array.from({
        length: clumps
    },
    (_, i) => {
        const phase = i / clumps * TAU + rand(-.25,
            .25)
        const angleNow = () => phase + t * TAU * 1.4
        const at = () => {
            const open = gather ? lerp(1.9,
                1,
                Math.min(1,
                    t * 1.9)) : 1
            const p = c(), a = angleNow()
            return {
                x: p.x + Math.cos(a) * rx * rand(.45,
                    1.25) * open, y: p.y + Math.sin(a) * ry * rand(.45,
                    1.25) * open
            }
        }
        const tangent = (): [number, number] => {
            const a = angleNow() + Math.PI / 2
            return [a - .8,
                a + .8]
        }
        return Promise.all([
            dustStream(layer,
                at,
                ms,
                190,
                {
                    blade: true, color: SHARD, size: [60,
                        32], speed: [50,
                        140], life: [100,
                        220], alpha: 1, flow: 0, drag: 0, additive: false,
                    get angle() { return tangent() }
                }),
            dustStream(layer,
                at,
                ms,
                110,
                {
                    color: ARC, streak: 4, speed: [40,
                        170], life: [130,
                        300], size: [6,
                        2], alpha: 1, flow: 30
                })
        ])
    })
    return Promise.all([
        ...streams,
        tween(ms,
            (v) => { t = v },
            ease.linear,
            layer)
    ])
}

/** Quả cầu plasma như icon Q: ruột xanh mềm, gân sét trắng chạy từ lõi ra vỏ */
async function plasmaGlobe(ctx: VfxCtx, at: Pt, ms: number, r: number) {
    const veins: Promise<unknown>[] = []
    const body = Promise.all([
        bloom(ctx.layer,
            at,
            CYAN,
            r * 3.4,
            ms),
        mist(ctx.layer,
            at,
            {
                color: [BLUE,
                    DEEP,
                    CYAN], size: r * 1.7, alpha: .62, count: 16, speed: [2,
                    18], life: [ms * .7,
                    ms]
            }),
        dustStream(ctx.layer,
            () => {
                const a = rand(0,
                        TAU), d = r * Math.sqrt(Math.random())
                return {
                    x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d * 1.14
                }
            },
            ms,
            1700,
            {
                color: PLASMA, speed: [4,
                    26], life: [160,
                    360], size: [7,
                    2], alpha: .95, flow: 46, drag: 2
            })
    ])
    for (let el = 0; el < ms && !ctx.layer.destroyed; el += 80) {
        const a = rand(0,
            TAU)
        veins.push(lightning(ctx.layer,
            {
                x: at.x + rand(-16,
                    16), y: at.y + rand(-16,
                    16)
            },
            {
                x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r * 1.14
            },
            {
                ms: 90, rate: 2600, size: 9, jag: .26
            }))
        await wait(ctx.layer,
            80)
    }
    await Promise.all([body,
        ...veins])
}

/** Một lá tan từ trên xuống thành mảnh thép; mảnh gom thành dòng cong lao vào Viktor. `arrived` là lúc chạm */
function crumbleCard(ctx: VfxCtx, at: Pt, tex: Texture | null, home: Pt) {
    const W = 104, H = 138
    let edge = 0
    let card: Sprite | undefined
    if (tex) {
        card = new Sprite(tex)
        card.anchor.set(.5)
        card.width = W
        card.height = W
        card.position.set(at.x,
            at.y)
        ctx.layer.addChild(card)
    }
    const dir = Math.atan2(home.y - at.y,
        home.x - at.x)
    const line = () => ({
        x: at.x + rand(-W / 2,
            W / 2), y: lerp(at.y - H / 2,
            at.y + H / 2,
            edge)
    })
    const crumble = Promise.all([
        bloom(ctx.layer,
            at,
            CYAN,
            240,
            CRUMBLE_MS + 120),
        dustStream(ctx.layer,
            line,
            CRUMBLE_MS,
            560,
            {
                blade: true, color: SHARD, size: [65,
                    28], speed: [90,
                    330], angle: [dir - .7,
                    dir + .7], drag: 1.4, life: [260,
                    540], alpha: 1, flow: 16, additive: false
            }),
        dustStream(ctx.layer,
            line,
            CRUMBLE_MS,
            1500,
            {
                color: [...ARC,
                    GOLD], speed: [30,
                    220], angle: [dir - .9,
                    dir + .9], life: [220,
                    480], size: [7,
                    2], alpha: 1, flow: 50
            }),
        tween(CRUMBLE_MS,
            (t) => {
                edge = t
                if (card && !card.destroyed) {
                    card.alpha = 1 - t * t
                    card.tint = t < .2 ? WHITE : ICE
                }
            },
            ease.linear,
            ctx.layer).then(() => {
            if (card && !card.destroyed) card.destroy()
        })
    ])
    let u = 0
    const flow = (side: number) => {
        let p = {
            ...at
        }
        let heading = dir
        const head = () => {
            const q = bend(at,
                home,
                u,
                side)
            if (Math.hypot(q.x - p.x,
                q.y - p.y) > 1) heading = Math.atan2(q.y - p.y,
                q.x - p.x)
            p = q
            return {
                x: q.x + rand(-11,
                    11), y: q.y + rand(-11,
                    11)
            }
        }
        return Promise.all([
            dustStream(ctx.layer,
                head,
                FRAGMENT_MS,
                340,
                {
                    blade: true, color: SHARD, size: [61,
                        30], speed: [180,
                        340], get angle(): [number, number] {
                        return [heading - .16,
                            heading + .16]
                    }, life: [110,
                        230], alpha: 1, flow: 0, drag: 0, additive: false
                }),
            dustStream(ctx.layer,
                head,
                FRAGMENT_MS,
                420,
                {
                    color: PLASMA, speed: [6,
                        50], life: [140,
                        300], size: [6,
                        2], alpha: 1, flow: 30
                })
        ])
    }
    const arrived = wait(ctx.layer,
        CRUMBLE_MS * .6).then(() => tween(FRAGMENT_MS,
        (t) => { u = t },
        ease.in,
        ctx.layer))
    const tail = wait(ctx.layer,
        CRUMBLE_MS * .6).then(() => Promise.all([.9,
        .45,
        -.1,
        -.55,
        -.95].map(flow)))
    return {
        arrived, tail: Promise.all([crumble,
            tail])
    }
}

/** Nội tại và Q mở màn: lá trong `to` (trận thật: mép tay bài) tan thành mảnh thép bay vào Viktor; mọi dòng tới nơi là báo nhịp */
registerVfx("viktorCardShatter",
    async (ctx) => {
        const tex = await loadIcon(ctx.icon)
        if (ctx.layer.destroyed) return
        const cards = (ctx.to.length ? ctx.to : [handEdge(ctx)]).map((at) => crumbleCard(ctx,
            at,
            tex,
            ctx.from))
        const landed = Promise.all(cards.map((c) => c.arrived)).then(() => {
            if (ctx.layer.destroyed) return
            ctx.onBeat?.()
            void bloom(ctx.layer,
                ctx.from,
                CYAN,
                200,
                300)
        })
        await Promise.all([landed,
            ...cards.map((c) => c.tail)])
    })

/** Nội tại: Tiến Hoá thấm vào Viktor, ctx.amount là số tầng; càng nhiều tầng mảnh hút vào càng dày */
registerVfx("viktorEvolveGain",
    async (ctx) => {
        const k = kOf(ctx)
        const stacks = Math.min(ctx.amount ?? 1,
            20)
        const at = () => ctx.from
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                (210 + stacks * 9) * k,
                420),
            bloom(ctx.layer,
                ctx.from,
                ctx.color2 ?? GOLD,
                110 * k,
                260),
            inward(ctx.layer,
                at,
                170 * k,
                240,
                90 + stacks * 16,
                {
                    blade: true, color: SHARD, size: [57,
                        27], life: [200,
                        320], additive: false, flow: 0
                }),
            inward(ctx.layer,
                at,
                190 * k,
                260,
                900,
                {
                    color: PLASMA, life: [220,
                        360]
                }),
            lightning(ctx.layer,
                {
                    x: ctx.from.x - 70 * k, y: ctx.from.y + 40 * k
                },
                {
                    x: ctx.from.x + 70 * k, y: ctx.from.y - 60 * k
                },
                {
                    ms: 120
                })
        ])
    })

/** Q: mảnh vỡ tụ thành khiên quanh Viktor rồi nổ thành bầy đạn thép theo tia hút; chạm là báo nhịp */
registerVfx("viktorShardBurst",
    async (ctx) => {
        const power = powerOf(ctx)
        const beat = beatOnce(ctx)
        const orbit = shardOrbit(ctx.layer,
            () => ctx.from,
            GATHER_MS + 120,
            1,
            true)
        const glow = bloom(ctx.layer,
            ctx.from,
            CYAN,
            300,
            GATHER_MS)
        await wait(ctx.layer,
            GATHER_MS)
        if (ctx.layer.destroyed) return
        await Promise.all([
            orbit,
            glow,
            ...points(ctx).map(async (to) => {
                const dx = to.x - ctx.from.x, dy = to.y - ctx.from.y
                const len = Math.hypot(dx,
                    dy) || 1
                const nx = -dy / len, ny = dx / len
                const dir = Math.atan2(dy,
                    dx)
                let u = 0
                const lane = (side: number) => () => {
                    const off = Math.sin(u * Math.PI) * side * .8 + side * .5 * (1 - u)
                    return {
                        x: ctx.from.x + dx * u + nx * off, y: ctx.from.y + dy * u + ny * off
                    }
                }
                const core = () => ({
                    x: ctx.from.x + dx * u + rand(-11,
                        11) * power, y: ctx.from.y + dy * u + rand(-11,
                        11) * power
                })
                void dustBurst(ctx.layer,
                    ctx.from,
                    {
                        count: 46, blade: true, color: SHARD, speed: [160,
                            520], drag: 1.6, life: [320,
                            640], size: [65,
                            28], alpha: 1, spread: 80, flow: 8, additive: false
                    })
                await Promise.all([
                    ...[-100,
                        -56,
                        -20,
                        20,
                        56,
                        100].map((side) => dustStream(ctx.layer,
                        lane(side),
                        BURST_MS,
                        Math.round(170 * power),
                        {
                            blade: true, color: SHARD, size: [68,
                                36], speed: [170,
                                340], angle: [dir - .13,
                                dir + .13], life: [120,
                                270], alpha: 1, flow: 0, drag: 0, additive: false, spread: 7
                        })),
                    dustStream(ctx.layer,
                        core,
                        BURST_MS,
                        1300,
                        {
                            color: PLASMA, speed: [20,
                                110], angle: [dir + Math.PI - .35,
                                dir + Math.PI + .35], life: [160,
                                340], size: [13 * power,
                                3], alpha: 1, flow: 22
                        }),
                    tween(BURST_MS,
                        (t) => { u = t },
                        ease.in,
                        ctx.layer).then(beat)
                ])
            })
        ])
    })

/** Q trúng: mảnh thép cắm vào, gân sét toả, tia điện văng */
registerVfx("viktorShardHit",
    async (ctx) => {
        const k = powerOf(ctx)
        ctx.shake(5 * k,
            190)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                260 * k,
                280),
            bloom(ctx.layer,
                ctx.from,
                WHITE,
                110 * k,
                180),
            mist(ctx.layer,
                ctx.from,
                {
                    color: [BLUE,
                        DEEP], size: 150 * k, alpha: .3, count: 9, speed: [30,
                        130]
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: Math.round(70 * ctx.intensity), blade: true, color: SHARD, speed: [150,
                        640], gravity: 520, drag: 1, life: [420,
                        900], size: [65,
                        28], alpha: 1, spread: 26, flow: 8, additive: false
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: Math.round(220 * ctx.intensity), color: ARC, streak: 4, speed: [140,
                        620], drag: 1.6, life: [240,
                        560], size: [6,
                        2], alpha: 1, spread: 22, flow: 30
                }),
            ...[0,
                1,
                2,
                3].map((i) => {
                const a = i / 4 * TAU + rand(-.4,
                    .4)
                return lightning(ctx.layer,
                    ctx.from,
                    {
                        x: ctx.from.x + Math.cos(a) * 150 * k, y: ctx.from.y + Math.sin(a) * 150 * k
                    },
                    {
                        ms: 130, rate: 3400
                    })
            })
        ])
    })

/** Q nhận Khiên: cầu plasma ôm lá tướng, mảnh thép còn lại lượn quanh rồi lắng xuống */
registerVfx("viktorPlasmaShield",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            plasmaGlobe(ctx,
                ctx.from,
                980,
                128 * k),
            shardOrbit(ctx.layer,
                () => ctx.from,
                980,
                k,
                false,
                6)
        ])
    })

/** Khiên đỡ đòn: cầu plasma loé về phía kẻ đánh, thép toé điện */
registerVfx("viktorShieldBlock",
    async (ctx) => {
        const k = kOf(ctx)
        const hit = ctx.to.length ? ahead(ctx.from,
            ctx.to[0],
            CARD_H * 1.1) : ctx.from
        const out = Math.atan2(hit.y - ctx.from.y,
            hit.x - ctx.from.x)
        const cone: [number, number] = ctx.to.length ? [out - 1,
            out + 1] : [0,
            TAU]
        await Promise.all([
            bloom(ctx.layer,
                hit,
                CYAN,
                260 * k,
                260),
            bloom(ctx.layer,
                hit,
                WHITE,
                110 * k,
                170),
            dustBurst(ctx.layer,
                hit,
                {
                    count: Math.round(200 * ctx.intensity), color: ARC, streak: 4, speed: [140,
                        560], angle: cone, drag: 1.6, life: [220,
                        520], size: [6,
                        2], alpha: 1, spread: 18, flow: 26
                }),
            dustBurst(ctx.layer,
                hit,
                {
                    count: Math.round(30 * ctx.intensity), blade: true, color: SHARD, speed: [150,
                        460], angle: cone, gravity: 420, drag: 1, life: [320,
                        680], size: [57,
                        27], alpha: 1, spread: 18, flow: 8, additive: false
                }),
            ...[-.7,
                0,
                .7].map((off) => lightning(ctx.layer,
                ctx.from,
                {
                    x: hit.x + Math.cos(out + off) * 70 * k, y: hit.y + Math.sin(out + off) * 70 * k
                },
                {
                    ms: 130, rate: 3200
                }))
        ])
    })

/** E mở màn: năng lượng dồn vào cánh tay hextech trước khi bắn tia */
registerVfx("viktorRayCharge",
    async (ctx) => {
        const k = kOf(ctx)
        const H = ctx.app.screen.height
        const aim = ctx.to[0] ?? {
            x: ctx.from.x, y: H - ctx.from.y
        }
        const arm = ahead(ctx.from,
            aim,
            CARD_H * .6)
        const MS = 380
        await Promise.all([
            bloom(ctx.layer,
                arm,
                ctx.color,
                300 * k,
                MS + 80),
            inward(ctx.layer,
                () => arm,
                210 * k,
                MS,
                2200,
                {
                    color: PLASMA, life: [180,
                        300], size: [8,
                        2]
                }),
            inward(ctx.layer,
                () => arm,
                190 * k,
                MS,
                120,
                {
                    blade: true, color: SHARD, size: [53,
                        23], life: [200,
                        320], additive: false, flow: 0
                }),
            lightning(ctx.layer,
                ctx.from,
                arm,
                {
                    ms: MS, rate: 1500, size: 7, jag: .3
                })
        ])
    })

/** E: tia thẳng mảnh trắng lõi xanh quét ngang hàng địch, điểm chạm cày vệt lửa vàng; hết đường quét, cả vệt nổ dư chấn cùng lúc và báo nhịp */
registerVfx("viktorDeathRay",
    async (ctx) => {
        const power = powerOf(ctx)
        const beat = beatOnce(ctx)
        const row = rowOf(ctx)
        const y = row.reduce((sum, p) => sum + p.y,
            0) / row.length
        const left = Math.min(...row.map((p) => p.x)) - 110
        const right = Math.max(...row.map((p) => p.x)) + 110
        const flip = Math.abs(ctx.from.x - right) < Math.abs(ctx.from.x - left)
        const start = flip ? right : left
        const stop = flip ? left : right
        const origin = ahead(ctx.from,
            {
                x: ctx.from.x, y
            },
            CARD_H * .6)
        let end = {
            x: start, y
        }
        let beam = Math.atan2(end.y - origin.y,
            end.x - origin.x)
        let fade = 1
        const widths: [number, number, number][] = [[46 * power,
            CYAN,
            .9],
        [22 * power,
            ICE,
            1],
        [9 * power,
            WHITE,
            1]]
        const cores = widths.map(([, color,
            alpha]) => {
            const s = makeSprite(ctx.layer,
                "glow",
                origin.x,
                origin.y,
                color,
                10)
            s.alpha = alpha
            return s
        })
        const tip = makeSprite(ctx.layer,
            "glow",
            end.x,
            end.y,
            HOT,
            210 * power)
        const place = () => {
            const len = Math.hypot(end.x - origin.x,
                end.y - origin.y)
            beam = Math.atan2(end.y - origin.y,
                end.x - origin.x)
            cores.forEach((s, i) => {
                if (s.destroyed) return
                s.position.set((origin.x + end.x) / 2,
                    (origin.y + end.y) / 2)
                s.rotation = beam
                s.width = len * 1.1
                s.height = widths[i][0] * 2.4
                s.alpha = widths[i][2] * fade
            })
            if (!tip.destroyed) {
                tip.position.set(end.x,
                    end.y)
                tip.alpha = fade
            }
        }
        const onBeam = () => {
            const u = Math.random()
            return {
                x: lerp(origin.x,
                    end.x,
                    u) + rand(-5,
                    5) * power, y: lerp(origin.y,
                    end.y,
                    u) + rand(-5,
                    5) * power
            }
        }
        const here = () => ({
            ...end
        })
        place()
        void bloom(ctx.layer,
            origin,
            ICE,
            260,
            SWEEP_MS)
        ctx.shake(4,
            SWEEP_MS)
        const up: [number, number] = [-Math.PI * .92,
            -Math.PI * .08]
        const trails = Promise.all([
            dustStream(ctx.layer,
                onBeam,
                SWEEP_MS,
                3600,
                {
                    color: [...ARC,
                        BLUE], streak: 5, speed: [260,
                        520], get angle(): [number, number] {
                        return [beam,
                            beam]
                    }, life: [60,
                        130], size: [7,
                        2], alpha: 1, flow: 0, drag: 0
                }),
            dustStream(ctx.layer,
                here,
                SWEEP_MS,
                34,
                {
                    puff: true, color: [NIGHT,
                        INDIGO], speed: [4,
                        30], gravity: -30, life: [560,
                        1000], size: [80,
                        170], alpha: .55, flow: 20, spread: 26, additive: false
                }),
            dustStream(ctx.layer,
                here,
                SWEEP_MS,
                2000,
                {
                    color: FIRE, streak: 4, speed: [90,
                        520], angle: up, gravity: 640, drag: .6, life: [260,
                        760], size: [7,
                        2], alpha: 1, flow: 20, spread: 18
                }),
            dustStream(ctx.layer,
                here,
                SWEEP_MS,
                160,
                {
                    blade: true, color: [...RUBBLE,
                        GOLD], size: [65,
                        27], speed: [120,
                        420], angle: up, gravity: 760, drag: .5, life: [320,
                        720], alpha: 1, flow: 8, spread: 22, additive: false
                }),
            // vệt than vàng nằm lại trên đường quét, chờ nổ dư chấn
            dustStream(ctx.layer,
                here,
                SWEEP_MS,
                900,
                {
                    color: [HOT,
                        GOLD,
                        CYAN], speed: [2,
                        18], life: [SWEEP_MS,
                        SWEEP_MS + 260], size: [10,
                        4], alpha: 1, flow: 6, drag: 2, spread: 20
                })
        ])
        await tween(SWEEP_MS,
            (t) => {
                end = {
                    x: lerp(start,
                        stop,
                        t), y
                }
                place()
            },
            ease.inOut,
            ctx.layer)
        if (ctx.layer.destroyed) return
        ctx.shake(10 * power,
            380)
        beat()
        const blasts = Array.from({
            length: 11
        },
        (_, i) => {
            const at = {
                x: lerp(left,
                    right,
                    i / 10) + rand(-16,
                    16), y: y + rand(-14,
                    14)
            }
            return Promise.all([
                bloom(ctx.layer,
                    at,
                    i % 2 ? CYAN : GOLD,
                    210,
                    280),
                dustBurst(ctx.layer,
                    at,
                    {
                        count: 60, color: [...ARC,
                            ...FIRE], streak: 3.5, speed: [110,
                            480], angle: up, gravity: 560, drag: .7, life: [260,
                            640], size: [7,
                            2], alpha: 1, spread: 20, flow: 24
                    })
            ])
        })
        await Promise.all([
            trails,
            ...blasts,
            tween(150,
                (t) => {
                    fade = 1 - t
                    place()
                },
                ease.out,
                ctx.layer).then(() => {
                for (const s of [...cores,
                    tip]) if (!s.destroyed) s.destroy()
            })
        ])
    })

/** E trúng: lõi trắng loé trên lá, than vàng và mảnh đá tung lên */
registerVfx("viktorRayHit",
    async (ctx) => {
        const k = powerOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                270 * k,
                300),
            bloom(ctx.layer,
                ctx.from,
                HOT,
                130 * k,
                200),
            mist(ctx.layer,
                ctx.from,
                {
                    color: [NIGHT,
                        INDIGO], size: 130 * k, alpha: .42, count: 7, additive: false, gravity: -50, life: [520,
                        960]
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: Math.round(190 * ctx.intensity), color: [...FIRE,
                        ...ARC], streak: 4, speed: [130,
                        560], angle: [-Math.PI * .95,
                        -Math.PI * .05], gravity: 620, drag: .7, life: [280,
                        720], size: [7,
                        2], alpha: 1, spread: 34, flow: 22
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: Math.round(34 * ctx.intensity), blade: true, color: [...RUBBLE,
                        GOLD], speed: [130,
                        480], gravity: 620, drag: .8, life: [360,
                        760], size: [61,
                        27], alpha: 1, spread: 28, flow: 6, additive: false
                }),
            lightning(ctx.layer,
                {
                    x: ctx.from.x - CARD_W, y: ctx.from.y + CARD_H * .5
                },
                {
                    x: ctx.from.x + CARD_W, y: ctx.from.y - CARD_H * .5
                },
                {
                    ms: 120, rate: 3000
                })
        ])
    })

/** R: giếng trọng lực xanh phủ hàng địch, bụi và mảnh vụn tối bị hút vào từng tướng, sét nối các giếng; hết thời gian tụ là sụp xuống và báo nhịp */
registerVfx("viktorGravityField",
    async (ctx) => {
        const k = kOf(ctx)
        const beat = beatOnce(ctx)
        const row = rowOf(ctx)
        const y = row.reduce((sum, p) => sum + p.y,
            0) / row.length
        const left = Math.min(...row.map((p) => p.x)) - 56
        const right = Math.max(...row.map((p) => p.x)) + 56
        const across = () => ({
            x: rand(left,
                right), y: y + rand(-170,
                170)
        })
        ctx.shake(3,
            FIELD_MS)
        const body = Promise.all([
            // nền chàm tối dìm bàn xuống để màu xanh của trường nổi lên
            dustStream(ctx.layer,
                across,
                FIELD_MS,
                70,
                {
                    puff: true, color: [NIGHT,
                        INDIGO,
                        NIGHT], speed: [4,
                        24], life: [620,
                        1100], size: [190,
                        340], alpha: .46, flow: 14, additive: false
                }),
            dustStream(ctx.layer,
                across,
                FIELD_MS,
                120,
                {
                    puff: true, color: [BLUE,
                        DEEP,
                        CYAN], speed: [4,
                        30], life: [520,
                        960], size: [150,
                        280], alpha: .34, flow: 20
                }),
            // mảnh vụn nhấc khỏi mặt bàn như trong icon
            dustStream(ctx.layer,
                across,
                FIELD_MS,
                300,
                {
                    blade: true, color: RUBBLE, size: [65,
                        38], speed: [20,
                        90], angle: [-Math.PI * .7,
                        -Math.PI * .3], gravity: -60, life: [520,
                        900], alpha: 1, flow: 40, drag: .6, additive: false
                }),
            dustStream(ctx.layer,
                across,
                FIELD_MS,
                1100,
                {
                    color: PLASMA, speed: [10,
                        60], angle: [-Math.PI * .7,
                        -Math.PI * .3], gravity: -60, life: [420,
                        820], size: [5,
                        2], alpha: 1, flow: 56
                }),
            ...row.flatMap((t) => {
                const at = () => t
                return [
                    bloom(ctx.layer,
                        t,
                        ctx.color,
                        320 * k,
                        FIELD_MS),
                    inward(ctx.layer,
                        at,
                        165 * k,
                        FIELD_MS,
                        1250,
                        {
                            color: ARC, streak: 3, life: [300,
                                460], size: [5,
                                2]
                        }),
                    inward(ctx.layer,
                        at,
                        175 * k,
                        FIELD_MS,
                        170,
                        {
                            blade: true, color: [...RUBBLE,
                                ...STEEL], size: [68,
                                27], life: [320,
                                480], additive: false, flow: 0
                        })
                ]
            })
        ])
        const arcs: Promise<unknown>[] = []
        for (let el = 0; el < FIELD_MS && !ctx.layer.destroyed; el += 110) {
            const i = Math.floor(rand(0,
                Math.max(1,
                    row.length - 1)))
            arcs.push(lightning(ctx.layer,
                row[i],
                row[Math.min(row.length - 1,
                    i + 1)],
                {
                    ms: 100, rate: 2200, size: 6, jag: .26
                }))
            await wait(ctx.layer,
                110)
        }
        if (ctx.layer.destroyed) return
        ctx.shake(14,
            560)
        beat()
        await Promise.all([body,
            ...arcs])
    })

/** R trúng từng tướng: trường sụp vào lá, rồi bụi nén bật thấp ra ngoài */
registerVfx("viktorGravityHit",
    async (ctx) => {
        const k = kOf(ctx)
        const at = () => ctx.from
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                300 * k,
                340),
            bloom(ctx.layer,
                ctx.from,
                WHITE,
                130 * k,
                200),
            mist(ctx.layer,
                ctx.from,
                {
                    color: [NIGHT,
                        INDIGO], size: 170 * k, alpha: .5, count: 9, additive: false, speed: [40,
                        150], life: [460,
                        880]
                }),
            inward(ctx.layer,
                at,
                180 * k,
                130,
                5200,
                {
                    color: PLASMA, life: [110,
                        170], size: [9,
                        3]
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: Math.round(170 * ctx.intensity), color: PLASMA, speed: [120,
                        420], drag: 2.4, life: [340,
                        720], size: [7,
                        2], alpha: 1, spread: 30, flow: 44
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: Math.round(26 * ctx.intensity), blade: true, color: [...RUBBLE,
                        ...STEEL], speed: [160,
                        520], gravity: 480, drag: 1, life: [380,
                        800], size: [65,
                        28], alpha: 1, spread: 30, flow: 8, additive: false
                })
        ])
    })

/** R Choáng tướng nhiều Máu nhất: sét răng cưa của Bão Phép giáng xuống, mảnh thép treo quanh lá */
registerVfx("viktorGravityStun",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        await Promise.all([
            bloom(ctx.layer,
                at,
                ICE,
                340 * k,
                420),
            dustBurst(ctx.layer,
                at,
                {
                    count: 34, blade: true, color: [...RUBBLE,
                        ...STEEL], speed: [8,
                        50], gravity: -26, drag: 1.2, life: [520,
                        900], size: [62,
                        30], alpha: 1, spread: 130 * k, flow: 16, additive: false
                }),
            ...[-120,
                -40,
                50,
                130].map((dx, i) => wait(ctx.layer,
                i * 54).then(() => lightning(ctx.layer,
                {
                    x: at.x + dx * 1.5, y: at.y - 300 * k
                },
                {
                    x: at.x + dx * .2, y: at.y
                },
                {
                    ms: 150, rate: 4600, size: 11, jag: .22
                })))
        ])
    })
