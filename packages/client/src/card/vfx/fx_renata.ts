// VFX riêng của Renata theo bộ chiêu mới: nữ tài phiệt hoá chất Zaun. Mọi hiệu ứng là khói tím và xanh độc thật từ fx_dust, không vẽ hình khối.
// Đánh thường, Cấp Vốn (nội tại theo cả đội), Cứu Cánh (Q lên đồng minh), Hoả Lực Yểm Trợ (E), Hợp Chất Điên Loạn (R).
// Bàn cờ nền xanh lá nên khói chính vẽ thường (không cộng sáng) để giữ màu; cộng sáng chỉ dùng cho quầng sáng và bụi sáng.
import {
    Text
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
const CHEM = 0xa6ff2e
const PURPLE_SMOKE = [0x5a1fa0,
    0x7a2fd0,
    0x3c1278,
    0x9a4be6]
const DARK_SMOKE = [0x2c0d5c,
    0x3c1278,
    0x1d0a3e]
const TOXIC_SMOKE = [0x8fe82a,
    0x6fd81e,
    0xb6ff4a,
    0x3f8a18,
    0x2f6e2a]
const BLOOD_SMOKE = [0xff2f6e,
    0xc4154e,
    0xe0246a,
    0x7a1040,
    0x5a1fa0]
const WHITE_HOT = 0xf0ffd0
const points = (ctx: VfxCtx) => ctx.to.length ? ctx.to : [ctx.from]
/** Tỉ lệ hình: thẻ tướng lớn nên VFX Renata vẽ to như bộ Nami */
const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity) * 1.55

/** Điểm trên quỹ đạo cong từ a tới b, cao h */
const arcAt = (a: Pt, b: Pt, t: number, h: number): Pt => ({
    x: lerp(a.x,
        b.x,
        t), y: lerp(a.y,
        b.y,
        t) - Math.sin(t * Math.PI) * h
})

/** Texture sương rất mờ nên khói phải đậm hơn số ghi để nổi trên nền cỏ */
const dense = (alpha: number) => Math.min(1,
    alpha * 1.75)

/** Cụm khói bung một lần */
const cloud = (ctx: VfxCtx, at: Pt, o: Parameters<typeof mist>[2]) => mist(ctx.layer,
    at,
    {
        ...o, alpha: (o.alpha ?? .5) * .8, additive: false
    })

/** Khói dày phát liên tục tại getPt */
const smoke = (ctx: VfxCtx, at: () => Pt, ms: number, perSec: number, color: number[], size: number, more: Partial<DustOpts> = {
}) => dustStream(ctx.layer,
    at,
    ms,
    perSec,
    {
        puff: true, color, size: [size * .5,
            size * 1.2], life: [460,
            960], speed: [8,
            46], spread: size * .22, flow: 26, drag: 1.2, additive: false, ...more, alpha: dense(more.alpha ?? .55)
    })

/** Bụi mịn cuộn theo luồng */
const motes = (ctx: VfxCtx, at: () => Pt, ms: number, perSec: number, color: number[], more: Partial<DustOpts> = {
}) => dustStream(ctx.layer,
    at,
    ms,
    perSec,
    {
        color, size: [7,
            2], life: [420,
            900], alpha: .95, speed: [10,
            70], flow: 80, drag: 1.4, additive: false, ...more
    })

/** Nhãn số nổi, không khung */
function label(ctx: VfxCtx, text: string, at: Pt, size: number): Text {
    const t = new Text({
        text,
        style: {
            fontFamily: "Nunito, Arial, sans-serif", fontSize: Math.round(size), fontWeight: "900", fill: 0xffffff, stroke: {
                color: 0x1d0a3e, width: Math.round(size / 6)
            }
        }
    })
    t.anchor.set(.5)
    t.position.set(at.x,
        at.y)
    t.alpha = 0
    ctx.layer.addChild(t)
    return t
}

/** Đầu sáng mềm bay theo `path`, kéo đuôi khói dày; tắt và báo chạm ngay khi tới, khói tự tan phía sau */
async function fly(ctx: VfxCtx, path: (t: number) => Pt, ms: number, size: number, trail: number[], land?: () => void, easing = ease.linear) {
    if (ctx.layer.destroyed) { land?.(); return }
    let p = path(0)
    const halo = makeSprite(ctx.layer,
        "glow",
        p.x,
        p.y,
        ctx.color2 ?? CHEM,
        size * 3.4)
    const core = makeSprite(ctx.layer,
        "glow",
        p.x,
        p.y,
        WHITE_HOT,
        size * 1.7)
    await Promise.all([
        smoke(ctx,
            () => p,
            ms,
            150,
            trail,
            size * 3.6,
            {
                life: [560,
                    1150]
            }),
        motes(ctx,
            () => p,
            ms,
            460,
            [ctx.color2 ?? CHEM,
                ...TOXIC_SMOKE],
            {
                spread: size * .7, additive: true
            }),
        tween(ms,
            (t) => {
                p = path(t)
                const pulse = 1 + Math.sin(t * 30) * .12
                halo.position.set(p.x,
                    p.y)
                core.position.set(p.x,
                    p.y)
                halo.width = size * 3.4 * pulse
                halo.height = size * 3.4 * pulse
            },
            easing,
            ctx.layer).then(() => {
            if (!halo.destroyed) halo.destroy()
            if (!core.destroyed) core.destroy()
            land?.()
        })
    ])
}

/** Khói chảy thành dòng từ a sang b: nhiều đợt đuổi nhau dọc đường cong */
function channel(ctx: VfxCtx, a: Pt, b: Pt, h: number, ms: number, smokeColor: number[], glitter: number[], k: number) {
    const t0 = performance.now()
    const at = () => {
        const head = ((performance.now() - t0) / 620 + Math.floor(Math.random() * 3) / 3) % 1
        return arcAt(a,
            b,
            Math.max(0,
                head - Math.random() * .16),
            h)
    }
    return Promise.all([
        smoke(ctx,
            at,
            ms,
            130,
            smokeColor,
            66 * k,
            {
                life: [420,
                    820], alpha: .36
            }),
        motes(ctx,
            at,
            ms,
            760,
            glitter,
            {
                spread: 10 * k, life: [300,
                    620]
            })
    ])
}

/** Đánh thường: bình hoá chất như đốm sáng độc, đuôi khói tím */
registerVfx("renataOrb",
    async (ctx) => {
        const k = kOf(ctx)
        let told = false
        await Promise.all(points(ctx).map((to) => fly(ctx,
            (t) => arcAt(ctx.from,
                to,
                t,
                72 * k),
            440,
            14 * k,
            PURPLE_SMOKE,
            () => {
                if (told) return
                told = true
                ctx.onBeat?.()
            },
            ease.inOut)))
    })

/** Trúng đánh thường: bình vỡ, khói độc bung, bụi toé */
registerVfx("renataOrbHit",
    async (ctx) => {
        const k = kOf(ctx)
        const c2 = ctx.color2 ?? CHEM
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                c2,
                230 * k,
                320),
            cloud(ctx,
                ctx.from,
                {
                    color: PURPLE_SMOKE, size: 150 * k, count: 9, alpha: .5, additive: false
                }),
            cloud(ctx,
                ctx.from,
                {
                    color: TOXIC_SMOKE, size: 96 * k, count: 6, alpha: .5, additive: false
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: Math.round(460 * ctx.intensity), color: [c2,
                        ...TOXIC_SMOKE,
                        ctx.color], speed: [70,
                        400], drag: 2.6, gravity: 150, flow: 90, life: [340,
                        820], size: [8,
                        2], spread: 14 * k, additive: false
                })
        ])
    })

/** Nội tại Cấp Vốn: khói máu của cả đội chảy về Renata (`amount` = tổng %, chia 500), đổi thành khói độc chảy ngược ra cả đội. `to` là các đồng minh */
registerVfx("renataFundLink",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        const c2 = ctx.color2 ?? CHEM
        const team = ctx.to
        const ms = team.length ? 3000 : 1400
        const give = ms * .52
        const curve = (ally: Pt) => (40 + Math.abs(ally.x - at.x) * .08) * k
        const tag = ctx.amount === undefined ? undefined : label(ctx,
            `${ctx.amount}/500`,
            {
                x: at.x, y: at.y - 92 * k
            },
            25 * k)
        const payout = async () => {
            await sleep(give)
            if (ctx.layer.destroyed) return
            ctx.onBeat?.()
            ctx.shake(7,
                320)
            await Promise.all([
                bloom(ctx.layer,
                    at,
                    c2,
                    340 * k,
                    460),
                cloud(ctx,
                    at,
                    {
                        color: TOXIC_SMOKE, size: 190 * k, count: 13, alpha: .5, additive: false
                    }),
                ...team.flatMap((ally) => [
                    channel(ctx,
                        at,
                        ally,
                        curve(ally),
                        ms - give,
                        TOXIC_SMOKE,
                        [c2,
                            ...TOXIC_SMOKE],
                        k),
                    smoke(ctx,
                        () => ({
                            x: ally.x + rand(-50,
                                50) * k, y: ally.y + rand(-40,
                                66) * k
                        }),
                        ms - give,
                        26,
                        TOXIC_SMOKE,
                        70 * k,
                        {
                            gravity: -50, alpha: .42
                        }),
                    motes(ctx,
                        () => ({
                            x: ally.x + rand(-54,
                                54) * k, y: ally.y + 70 * k
                        }),
                        ms - give,
                        240,
                        [c2,
                            WHITE_HOT],
                        {
                            speed: [180,
                                340], angle: [-Math.PI * .56,
                                -Math.PI * .44], drag: .5, additive: true
                        })
                ])
            ])
        }
        await Promise.all([
            smoke(ctx,
                () => ({
                    x: at.x + rand(-44,
                        44) * k, y: at.y + rand(-60,
                        60) * k
                }),
                ms,
                26,
                DARK_SMOKE,
                92 * k,
                {
                    alpha: .5
                }),
            ...team.flatMap((ally) => [
                channel(ctx,
                    ally,
                    at,
                    curve(ally),
                    give,
                    BLOOD_SMOKE,
                    BLOOD_SMOKE,
                    k),
                smoke(ctx,
                    () => ({
                        x: ally.x + rand(-46,
                            46) * k, y: ally.y + rand(-60,
                            60) * k
                    }),
                    give,
                    22,
                    BLOOD_SMOKE,
                    60 * k,
                    {
                        gravity: -40, alpha: .4
                    })
            ]),
            payout(),
            tween(ms,
                (t) => {
                    if (tag && !tag.destroyed) {
                        tag.alpha = Math.min(1,
                            t * 8,
                            (1 - t) * 6)
                        tag.position.y = at.y - (92 + t * 18) * k
                    }
                },
                ease.linear,
                ctx.layer)
        ])
    })

/** Nội tại Cấp Vốn: `from` là đồng minh sắp gục, khói đen phủ lá, Renata (`to[0]`, nếu có) ném thuốc tới, cột khói độc bùng lên với 40% Máu. Mỗi đồng minh 1 lần mỗi trận */
registerVfx("renataRevive",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        const c2 = ctx.color2 ?? CHEM
        const source = ctx.to[0]
        const fall = (t: number) => source ? arcAt(source,
            at,
            t,
            150 * k) : {
            x: at.x, y: lerp(at.y - 330 * k,
                at.y,
                t)
        }
        const flight = source ? 560 : 340
        void smoke(ctx,
            () => ({
                x: at.x + rand(-60,
                    60) * k, y: at.y + rand(-80,
                    80) * k
            }),
            760 + flight,
            46,
            DARK_SMOKE,
            130 * k,
            {
                alpha: .72
            })
        void motes(ctx,
            () => ({
                x: at.x + rand(-60,
                    60) * k, y: at.y + rand(-80,
                    80) * k
            }),
            760,
            200,
            BLOOD_SMOKE,
            {
                gravity: 120
            })
        await sleep(620)
        await new Promise<void>((resolve) => {
            void fly(ctx,
                fall,
                flight,
                22 * k,
                PURPLE_SMOKE,
                resolve,
                ease.in)
        })
        if (ctx.layer.destroyed) return
        ctx.onBeat?.()
        ctx.shake(13,
            520)
        const tag = label(ctx,
            "40%",
            at,
            42 * k)
        const rise = {
            speed: [260,
                620] as [number, number], angle: [-Math.PI * .57,
                    -Math.PI * .43] as [number, number], drag: .9
        }
        await Promise.all([
            bloom(ctx.layer,
                at,
                c2,
                460 * k,
                480),
            bloom(ctx.layer,
                at,
                0xffffff,
                240 * k,
                260),
            cloud(ctx,
                at,
                {
                    color: TOXIC_SMOKE, size: 230 * k, count: 15, alpha: .52, additive: false
                }),
            smoke(ctx,
                () => ({
                    x: at.x + rand(-44,
                        44) * k, y: at.y + 70 * k
                }),
                820,
                90,
                TOXIC_SMOKE,
                110 * k,
                {
                    ...rise, life: [420,
                        900]
                }),
            smoke(ctx,
                () => ({
                    x: at.x + rand(-34,
                        34) * k, y: at.y + 70 * k
                }),
                820,
                44,
                PURPLE_SMOKE,
                90 * k,
                {
                    ...rise, life: [420,
                        900]
                }),
            dustBurst(ctx.layer,
                at,
                {
                    count: 900, color: [c2,
                        WHITE_HOT,
                        ...TOXIC_SMOKE], speed: [120,
                        620], drag: 2.2, gravity: -60, flow: 110, life: [460,
                        1200], size: [8,
                        2], spread: 30 * k, additive: true
                }),
            tween(1500,
                (t) => {
                    if (tag.destroyed) return
                    tag.alpha = Math.min(1,
                        t * 8,
                        (1 - t) * 4)
                    tag.position.y = at.y - t * 54 * k
                    tag.scale.set(lerp(.6,
                        1,
                        ease.back(Math.min(1,
                            t * 4))))
                },
                ease.linear,
                ctx.layer)
        ])
    })

/** Một dải khói từ thân tướng lên đám khói phía trên, cong ra ngoài */
const drainAt = (at: Pt, top: Pt, side: number, reach: number, u: number): Pt => {
    const s = 1 - u
    const start = {
        x: at.x + side * reach * .4, y: at.y + reach * .4
    }
    const bend = {
        x: at.x + side * reach * 1.2, y: at.y - reach * .4
    }
    return {
        x: s * s * start.x + 2 * s * u * bend.x + u * u * top.x, y: s * s * start.y + 2 * s * u * bend.y + u * u * top.y
    }
}

/** Q Cứu Cánh: `from` là đồng minh được chọn. Khói máu rút khỏi đồng minh, tụ lên cao chuyển dần thành khói độc, rồi đổ ngược xuống */
registerVfx("renataSacrifice",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        const top = {
            x: at.x, y: at.y - 150 * k
        }
        const ms = 1350
        const t0 = performance.now()
        const drain = () => {
            const head = ((performance.now() - t0) / 560 + Math.random() * .3) % 1
            return drainAt(at,
                top,
                Math.random() < .5 ? -1 : 1,
                96 * k,
                head)
        }
        const gather = () => ({
            x: top.x + rand(-34,
                34) * k, y: top.y + rand(-26,
                26) * k
        })
        ctx.shake(5,
            260)
        await Promise.all([
            bloom(ctx.layer,
                at,
                0xff2f6e,
                300 * k,
                380),
            cloud(ctx,
                at,
                {
                    color: BLOOD_SMOKE, size: 150 * k, count: 8, alpha: .36, additive: false
                }),
            smoke(ctx,
                drain,
                ms * .92,
                150,
                BLOOD_SMOKE,
                60 * k,
                {
                    life: [300,
                        620], alpha: .6
                }),
            motes(ctx,
                drain,
                ms * .92,
                700,
                BLOOD_SMOKE,
                {
                    spread: 8 * k, life: [280,
                        560]
                }),
            smoke(ctx,
                gather,
                ms * .6,
                34,
                BLOOD_SMOKE,
                100 * k,
                {
                    alpha: .34
                }),
            sleep(ms * .55).then(() => smoke(ctx,
                gather,
                ms * .45,
                44,
                TOXIC_SMOKE,
                100 * k,
                {
                    alpha: .36
                })),
            sleep(ms).then(() => {
                ctx.onBeat?.()
                return powerUp(ctx)
            })
        ])
    })

/** Q Cứu Cánh: khói đổ ngược xuống tướng, bụi Tốc Đánh, Chí Mạng, SMCK xoáy siết dần vào lá (2 lượt) */
async function powerUp(ctx: VfxCtx) {
    const k = kOf(ctx)
    const at = ctx.from
    const c2 = ctx.color2 ?? CHEM
    const top = {
        x: at.x, y: at.y - 150 * k
    }
    const R = 92 * k
    let spin = 0
    const orbit = (phase: number) => () => {
        const a = spin * spin * TAU * 4.6 + phase
        const r = R * lerp(1.05,
            .3,
            spin * spin)
        return {
            x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r * 1.3
        }
    }
    ctx.shake(7,
        300)
    await Promise.all([
        bloom(ctx.layer,
            at,
            c2,
            340 * k,
            460),
        bloom(ctx.layer,
            top,
            c2,
            280 * k,
            320),
        cloud(ctx,
            top,
            {
                color: TOXIC_SMOKE, size: 170 * k, count: 9, alpha: .38, speed: [40,
                    140], gravity: 220, additive: false
            }),
        cloud(ctx,
            at,
            {
                color: PURPLE_SMOKE, size: 190 * k, count: 8, alpha: .36, additive: false
            }),
        motes(ctx,
            orbit(0),
            1250,
            520,
            BLOOD_SMOKE,
            {
                spread: 7 * k, life: [260,
                    520]
            }),
        motes(ctx,
            orbit(TAU / 3),
            1250,
            520,
            [c2,
                ...TOXIC_SMOKE],
            {
                spread: 7 * k, life: [260,
                    520]
            }),
        motes(ctx,
            orbit(TAU * 2 / 3),
            1250,
            520,
            PURPLE_SMOKE,
            {
                spread: 7 * k, life: [260,
                    520]
            }),
        motes(ctx,
            () => ({
                x: at.x + rand(-1,
                    1) * R * .8, y: at.y + R
            }),
            1200,
            420,
            [c2,
                WHITE_HOT],
            {
                speed: [240,
                    480], angle: [-Math.PI * .54,
                    -Math.PI * .46], drag: .4, additive: true
            }),
        tween(1300,
            (t) => { spin = t },
            ease.linear,
            ctx.layer)
    ])
}
registerVfx("renataPowerUp",
    powerUp)

/** Q và E: Renata chỉ định đồng minh, một luồng khói bay sang, tới nơi là báo */
registerVfx("renataOrder",
    async (ctx) => {
        const k = kOf(ctx)
        let told = false
        await Promise.all(points(ctx).map((to) => fly(ctx,
            (t) => arcAt(ctx.from,
                to,
                t,
                54 * k),
            480,
            11 * k,
            PURPLE_SMOKE,
            () => {
                if (told) return
                told = true
                ctx.onBeat?.()
                void bloom(ctx.layer,
                    to,
                    ctx.color2 ?? CHEM,
                    200 * k,
                    340)
                void cloud(ctx,
                    to,
                    {
                        color: TOXIC_SMOKE, size: 110 * k, count: 8, alpha: .45, additive: false
                    })
            },
            ease.inOut)))
    })

/** Đường cong trơn đi qua lần lượt các điểm */
function spline(pts: Pt[], u: number): Pt {
    const n = pts.length - 1
    const f = Math.min(n - 1e-6,
        u * n)
    const i = Math.floor(f)
    const t = f - i
    const p0 = pts[Math.max(0,
            i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n,
            i + 2)]
    const at = (a: number, b: number, c: number, d: number) => .5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t)
    return {
        x: at(p0.x,
            p1.x,
            p2.x,
            p3.x), y: at(p0.y,
            p1.y,
            p2.y,
            p3.y)
    }
}

/** Một rocket: đầu sáng mềm, đuôi khói dày, phụt khói nhỏ ở mỗi điểm giữa đường */
function rocket(ctx: VfxCtx, pts: Pt[], ms: number, z: number, land?: () => void) {
    const c2 = ctx.color2 ?? CHEM
    const n = pts.length - 1
    let passed = 1
    const pops: Promise<unknown>[] = []
    const path = (t: number) => {
        while (passed < n && t >= passed / n) {
            const hit = pts[passed++]
            pops.push(
                bloom(ctx.layer,
                    hit,
                    c2,
                    200 * z,
                    260),
                cloud(ctx,
                    hit,
                    {
                        color: TOXIC_SMOKE, size: 90 * z, count: 7, alpha: .5, additive: false
                    })
            )
        }
        return spline(pts,
            t)
    }
    return fly(ctx,
        path,
        ms,
        13 * z,
        PURPLE_SMOKE,
        land).then(() => Promise.all(pops))
}

/** E Hoả Lực Yểm Trợ: hai rocket từ `from` xuyên qua các mục tiêu lân cận, hợp lại thành một quả tên lửa lao xuống điểm nổ. `to`: các điểm xuyên (xen kẽ trái, phải), phần tử cuối là điểm nổ */
registerVfx("renataVolley",
    async (ctx) => {
        const k = kOf(ctx)
        const all = points(ctx)
        const blast = all[all.length - 1]
        const pierced = all.slice(0,
            -1)
        const dir = Math.sign(blast.y - ctx.from.y) || -1
        const meet = pierced.length ? {
            x: blast.x, y: Math.max(46,
                blast.y + dir * 135)
        } : {
            x: lerp(ctx.from.x,
                blast.x,
                .6), y: lerp(ctx.from.y,
                blast.y,
                .6)
        }
        const dx = meet.x - ctx.from.x, dy = meet.y - ctx.from.y
        const len = Math.hypot(dx,
            dy) || 1
        const lane = (side: number, via: Pt[]) => [ctx.from,
            ...(via.length ? via : [{
                x: ctx.from.x + dx / 2 - dy / len * side * 110 * k, y: ctx.from.y + dy / 2 + dx / len * side * 110 * k
            }]),
            meet]
        let merged: Promise<unknown> = Promise.resolve()
        const merge = () => {
            if (ctx.layer.destroyed) return
            ctx.shake(5,
                180)
            merged = Promise.all([
                bloom(ctx.layer,
                    meet,
                    ctx.color2 ?? CHEM,
                    260 * k,
                    240),
                rocket(ctx,
                    [meet,
                        blast],
                    230,
                    k * 1.8,
                    () => ctx.onBeat?.())
            ])
        }
        await Promise.all([
            rocket(ctx,
                lane(-1,
                    pierced.filter((_, i) => i % 2 === 0)),
                1050,
                k,
                merge),
            rocket(ctx,
                lane(1,
                    pierced.filter((_, i) => i % 2 === 1)),
                1050,
                k)
        ])
        await merged
    })

/** E: tên lửa hợp nhất nổ lớn, cầu khói và mảnh bụi */
registerVfx("renataVolleyHit",
    async (ctx) => {
        const k = kOf(ctx)
        const c2 = ctx.color2 ?? CHEM
        ctx.shake(6,
            220)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                c2,
                280 * k,
                340),
            bloom(ctx.layer,
                ctx.from,
                0xffffff,
                120 * k,
                180),
            cloud(ctx,
                ctx.from,
                {
                    color: PURPLE_SMOKE, size: 190 * k, count: 13, alpha: .52, speed: [30,
                        130], additive: false
                }),
            cloud(ctx,
                ctx.from,
                {
                    color: TOXIC_SMOKE, size: 120 * k, count: 7, alpha: .5, speed: [30,
                        120], additive: false
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: Math.round(620 * ctx.intensity), color: [c2,
                        WHITE_HOT,
                        ...TOXIC_SMOKE,
                        ctx.color], speed: [140,
                        560], drag: 2.8, gravity: 90, flow: 90, life: [300,
                        760], size: [8,
                        2], spread: 12 * k, additive: true
                })
        ])
    })

/** E: đồng minh và Renata bị rocket quét qua nhận Khiên: màn khói độc cuộn dày quanh lá rồi tan */
registerVfx("renataShield",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        const c2 = ctx.color2 ?? CHEM
        const shell = () => {
            const a = rand(0,
                TAU)
            const r = rand(.86,
                1.14)
            return {
                x: at.x + Math.cos(a) * 66 * k * r, y: at.y + Math.sin(a) * 92 * k * r
            }
        }
        await Promise.all([
            bloom(ctx.layer,
                at,
                c2,
                260 * k,
                360),
            smoke(ctx,
                shell,
                1050,
                130,
                TOXIC_SMOKE,
                78 * k,
                {
                    alpha: .42, life: [420,
                        780], flow: 34
                }),
            smoke(ctx,
                shell,
                1050,
                70,
                PURPLE_SMOKE,
                84 * k,
                {
                    alpha: .42, life: [420,
                        780], flow: 34
                }),
            motes(ctx,
                shell,
                1100,
                520,
                [c2,
                    WHITE_HOT,
                    ...TOXIC_SMOKE],
                {
                    life: [380,
                        760], flow: 56, additive: true
                })
        ])
    })

/** Hàng địch: mép trái, mép phải, độ cao. `to` rỗng thì lật vị trí Renata qua sông */
function enemyRow(ctx: VfxCtx) {
    if (!ctx.to.length) return {
        left: ctx.app.screen.width / 2 - 400, right: ctx.app.screen.width / 2 + 400, y: ctx.app.screen.height * .89 - ctx.from.y
    }
    return {
        left: Math.min(...ctx.to.map((p) => p.x)),
        right: Math.max(...ctx.to.map((p) => p.x)),
        y: ctx.to.reduce((sum, p) => sum + p.y,
            0) / ctx.to.length
    }
}

/** R Hợp Chất Điên Loạn: bình hoá chất ném qua sông, vỡ thành đám mây khói cuộn dọc hàng địch */
registerVfx("renataBerserkWave",
    async (ctx) => {
        const k = kOf(ctx)
        const c2 = ctx.color2 ?? CHEM
        const { left, right, y } = enemyRow(ctx)
        const start = {
            x: left - 130, y
        }
        const end = right + 130
        await new Promise<void>((resolve) => {
            void bloom(ctx.layer,
                ctx.from,
                ctx.color,
                240 * k,
                320)
            void fly(ctx,
                (t) => arcAt(ctx.from,
                    start,
                    t,
                    120 * k),
                620,
                13 * k,
                PURPLE_SMOKE,
                resolve,
                ease.inOut)
        })
        if (ctx.layer.destroyed) return
        ctx.shake(12,
            1100)
        const sweep = 1160
        const span = 1700
        let front = start.x
        let landed = false
        const body = () => ({
            x: front + rand(-130,
                120), y: y + rand(-180,
                180)
        })
        const crest = () => ({
            x: front + rand(70,
                170), y: y + rand(-190,
                190)
        })
        const push: Partial<DustOpts> = {
            speed: [90,
                230], angle: [-.4,
                .4], flow: 40
        }
        await Promise.all([
            bloom(ctx.layer,
                start,
                c2,
                420 * k,
                360),
            smoke(ctx,
                body,
                sweep,
                190,
                PURPLE_SMOKE,
                290,
                {
                    ...push, life: [760,
                        1320], alpha: .6
                }),
            smoke(ctx,
                body,
                sweep,
                90,
                DARK_SMOKE,
                280,
                {
                    ...push, life: [760,
                        1320], alpha: .6
                }),
            smoke(ctx,
                crest,
                sweep,
                100,
                TOXIC_SMOKE,
                190,
                {
                    ...push, life: [420,
                        820], alpha: .56
                }),
            motes(ctx,
                body,
                sweep,
                1600,
                [c2,
                    ...TOXIC_SMOKE,
                    ...BLOOD_SMOKE],
                {
                    ...push, life: [420,
                        980], flow: 130, additive: true
                }),
            tween(span,
                (t) => {
                    front = lerp(start.x,
                        end,
                        ease.inOut(Math.min(1,
                            t / .68)))
                    if (t >= .68 && !landed) {
                        landed = true
                        ctx.onBeat?.()
                    }
                },
                ease.linear,
                ctx.layer)
        ])
    })

/** R trúng từng tướng địch, Cuồng Loạn: khói máu trào khỏi lá, đôi mắt đỏ rực, cùng lúc bụi Tốc Đánh dựng đứng */
registerVfx("renataBerserkMark",
    async (ctx) => {
        void frenzy(ctx)
        const k = kOf(ctx)
        const at = ctx.from
        const eyes = [-1,
            1].map((side) => makeSprite(ctx.layer,
            "glow",
            at.x + side * 17 * k,
            at.y - 50 * k,
            0xff2f6e,
            54 * k))
        await Promise.all([
            bloom(ctx.layer,
                at,
                0xff2f6e,
                300 * k,
                360),
            cloud(ctx,
                at,
                {
                    color: BLOOD_SMOKE, size: 170 * k, count: 8, alpha: .3, gravity: -50, additive: false
                }),
            smoke(ctx,
                () => ({
                    x: at.x + rand(-54,
                        54) * k, y: at.y + rand(0,
                        74) * k
                }),
                800,
                26,
                BLOOD_SMOKE,
                70 * k,
                {
                    gravity: -130, alpha: .22
                }),
            tween(1150,
                (t) => {
                    const fade = Math.min(1,
                        t * 7,
                        (1 - t) * 5)
                    for (const eye of eyes) if (!eye.destroyed) eye.alpha = fade * (.75 + Math.sin(t * 34) * .25)
                },
                ease.linear,
                ctx.layer)
        ])
        for (const eye of eyes) if (!eye.destroyed) eye.destroy()
    })

/** R: tướng địch Cuồng Loạn được tăng Tốc Đánh: bụi độc phóng thẳng lên quanh lá như gió xoáy */
async function frenzy(ctx: VfxCtx) {
    const k = kOf(ctx)
    const at = ctx.from
    const c2 = ctx.color2 ?? CHEM
    const R = 60 * k
    await Promise.all([
        motes(ctx,
            () => ({
                x: at.x + rand(-1,
                    1) * R, y: at.y + R * 1.2
            }),
            1350,
            640,
            [c2,
                ...TOXIC_SMOKE],
            {
                speed: [340,
                    640], angle: [-Math.PI * .54,
                    -Math.PI * .46], drag: .3, flow: 70, life: [260,
                    520]
            }),
        motes(ctx,
            () => ({
                x: at.x + rand(-1,
                    1) * R, y: at.y + R * 1.2
            }),
            1350,
            320,
            BLOOD_SMOKE,
            {
                speed: [300,
                    560], angle: [-Math.PI * .54,
                    -Math.PI * .46], drag: .3, flow: 70, life: [260,
                    520]
            })
    ])
}
registerVfx("renataFrenzyAura",
    frenzy)
