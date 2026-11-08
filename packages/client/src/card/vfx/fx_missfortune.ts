// VFX riêng của Miss Fortune, chất liệu THUỐC SÚNG: vệt đạn nóng đỏ cam, đạn gang kéo đuôi lửa như icon Q và R, tia lửa kim loại, khói súng, trái tim lửa của Love Tap. Không dùng nét vẽ hình học.
// Mỗi hiệu ứng chỉ dựa vào VfxCtx và tự dọn khi layer bị huỷ; đạn chạm là báo ctx.onBeat, không chờ đuôi hạt tan.
// ctx.amount > 0 là phát chí mạng: lửa ngả trắng vàng, tia lửa dài và dày hơn.
import {
    Container, Particle, ParticleContainer, Texture, Ticker
} from "pixi.js"
import {
    bloom, dustBurst, dustStream, mist, type DustBurstOpts
} from "./fx_dust"
import {
    ease, lerp, makeSprite, pick, rand, sleep, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const TAU = Math.PI * 2
const CRIMSON = 0xff2f14
const EMBER = 0xff7a1e
const AMBER = 0xffb52e
const HOT = 0xfff0b8
const WHITE_HOT = 0xfffbe6
const SMOKE = 0x5a4a46
const SOOT = 0x2c2224
const IRON = 0x1d1620
const LOVE = 0xff4f7a
const FIRE = [CRIMSON,
    EMBER,
    AMBER]
/** Bắn lên trời xong bao lâu mưa mới rơi tới bàn */
const RAIN_FALL_MS = 210
/** Mưa đạn kéo dài bấy nhiêu; sát thương chỉ đáp ở viên đầu tiên */
const RAIN_MS = 1250
const RAIN_SHOTS = 720
const RAIN_HEIGHT = 480
/** Một loạt R từ súng tới hàng địch */
export const MF_VOLLEY_MS = 170
const ROUND_MS = 300
const FORK_MS = 210
const TAP_MS = 170
const SCORCH_MAX_MS = 7000
const TRACER_W = 128
const TRACER_H = 16
/** Vệt đạn co về đầu đạn trong bấy nhiêu ms sau khi chạm */
const TRACER_FADE_MS = 80

const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
const critOf = (ctx: VfxCtx) => (ctx.amount ?? 0) > 0
const around = (at: Pt, r: number): Pt => {
    const a = rand(0,
            TAU), d = Math.sqrt(Math.random()) * r
    return {
        x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d
    }
}
const dirOf = (a: Pt, b: Pt) => Math.atan2(b.y - a.y,
    b.x - a.x)

/** Hai khẩu súng hai bên người, vuông góc hướng bắn */
function pistols(from: Pt, dir: number, k: number): Pt[] {
    const nx = -Math.sin(dir), ny = Math.cos(dir)
    return [-1,
        1].map(side => ({
        x: from.x + nx * side * 34 * k, y: from.y + ny * side * 34 * k
    }))
}

/** Texture vệt đạn: đuôi tan dần, đầu thon sáng */
function tracerTexture(): Texture {
    const c = document.createElement("canvas")
    c.width = TRACER_W
    c.height = TRACER_H
    const g = c.getContext("2d")
    if (g) {
        const grad = g.createLinearGradient(0,
            0,
            TRACER_W,
            0)
        grad.addColorStop(0,
            "rgba(255,255,255,0)")
        grad.addColorStop(.6,
            "rgba(255,255,255,.45)")
        grad.addColorStop(1,
            "rgba(255,255,255,1)")
        g.fillStyle = grad
        g.beginPath()
        g.moveTo(0,
            TRACER_H / 2)
        g.lineTo(TRACER_W * .88,
            1)
        g.quadraticCurveTo(TRACER_W,
            TRACER_H / 2,
            TRACER_W * .88,
            TRACER_H - 1)
        g.closePath()
        g.fill()
    }
    return Texture.from(c)
}
let tracer: Texture | undefined
const tracerTex = () => (tracer ??= tracerTexture())

interface Shot {
    a: Pt;
    b: Pt;
    /** Đầu đạn hiện tại, đuôi hạt bám theo điểm này */
    at: Pt;
    delay: number;
    ms: number;
    len: number;
    width: number;
    color: number;
    land?: () => void;
}

const makeShot = (a: Pt, b: Pt, ms: number, len: number, width: number, color: number, delay = 0, land?: () => void): Shot => ({
    a, b, at: {
        ...a
    }, delay, ms, len, width, color, land
})

function tracerHost(layer: Container, additive: boolean) {
    const host = new ParticleContainer({
        texture: tracerTex(),
        dynamicProperties: {
            position: true, vertex: true, rotation: true, color: true
        }
    })
    host.blendMode = additive ? "add" : "normal"
    layer.addChild(host)
    return host
}

/** Bắn hàng trăm vệt đạn dùng chung hai host: thân màu ở dưới, lõi trắng nóng cộng sáng ở trên. Đạn bay thẳng, chạm là gọi land, rồi vệt co về đầu đạn */
function fireTracers(layer: Container, shots: Shot[]): Promise<void> {
    if (layer.destroyed) return Promise.resolve()
    const tex = tracerTex()
    const body = tracerHost(layer,
        false)
    const core = tracerHost(layer,
        true)
    const flying = shots.map(shot => ({
        shot, age: -shot.delay, skin: null as Particle | null, hot: null as Particle | null, landed: false
    }))
    return new Promise((resolve) => {
        let done = false
        const finish = () => {
            if (done) return
            done = true
            Ticker.shared.remove(tick)
            layer.off("destroyed",
                finish)
            if (!body.destroyed) body.destroy()
            if (!core.destroyed) core.destroy()
            resolve()
        }
        const tick = (tk: Ticker) => {
            if (layer.destroyed || body.destroyed || core.destroyed) { finish(); return }
            let removed = false
            for (let i = flying.length - 1; i >= 0; i--) {
                const f = flying[i]
                const { shot } = f
                f.age += tk.deltaMS
                if (f.age < 0) continue
                if (!f.skin || !f.hot) {
                    const rotation = dirOf(shot.a,
                        shot.b)
                    f.skin = new Particle({
                        texture: tex, anchorX: 1, anchorY: .5, x: shot.a.x, y: shot.a.y, tint: shot.color, rotation
                    })
                    f.hot = new Particle({
                        texture: tex, anchorX: 1, anchorY: .5, x: shot.a.x, y: shot.a.y, tint: WHITE_HOT, rotation
                    })
                    body.addParticle(f.skin)
                    core.addParticle(f.hot)
                }
                const t = Math.min(1,
                    f.age / shot.ms)
                shot.at = {
                    x: lerp(shot.a.x,
                        shot.b.x,
                        t), y: lerp(shot.a.y,
                        shot.b.y,
                        t)
                }
                if (t >= 1 && !f.landed) {
                    f.landed = true
                    shot.land?.()
                }
                const after = Math.max(0,
                    f.age - shot.ms) / TRACER_FADE_MS
                if (after >= 1) {
                    body.removeParticle(f.skin)
                    core.removeParticle(f.hot)
                    flying[i] = flying[flying.length - 1]
                    flying.pop()
                    removed = true
                    continue
                }
                const reach = Math.hypot(shot.at.x - shot.a.x,
                    shot.at.y - shot.a.y)
                const len = Math.min(reach,
                    shot.len) * (1 - after)
                for (const [p,
                    width] of [[f.skin,
                        shot.width],
                    [f.hot,
                        shot.width * .42]] as const) {
                    p.x = shot.at.x
                    p.y = shot.at.y
                    p.scaleX = len / TRACER_W
                    p.scaleY = width / TRACER_H
                }
            }
            if (removed) {
                body.update()
                core.update()
            }
            if (!flying.length) finish()
        }
        layer.once("destroyed",
            finish)
        Ticker.shared.add(tick)
    })
}

/** Tia lửa kim loại: mảnh sắc văng ra, rơi theo trọng lực */
const sparks = (over: Partial<DustBurstOpts> = {
}): DustBurstOpts => ({
    count: 0,
    color: [HOT,
        AMBER,
        WHITE_HOT], blade: true, speed: [180,
        620], gravity: 620, drag: 2, flow: 30, life: [180,
        420], size: [30,
        9], alpha: 1, ...over
})
/** Lửa súng (count chỉ dùng cho dustBurst): vệt hạt đỏ cam, phủ được cả nền sáng */
const flame = (over: Partial<DustBurstOpts> = {
}): DustBurstOpts => ({
    count: 0,
    color: FIRE, speed: [20,
        120], gravity: -120, drag: 2, flow: 90, life: [220,
        480], size: [17,
        4], streak: 2.6, alpha: .9, additive: false, ...over
})

const gunSmoke = (at: Pt, layer: Container, size: number, alpha = .34) => mist(layer,
    at,
    {
        color: [SMOKE,
            SOOT], size, alpha, count: 8, speed: [20,
            80], gravity: -40, additive: false, life: [420,
            900]
    })

/** Một phát súng: chớp đầu nòng, tia lửa theo hướng bắn, khói */
function muzzleFlash(layer: Container, at: Pt, dir: number, power: number) {
    return Promise.all([
        bloom(layer,
            at,
            AMBER,
            210 * power,
            170),
        bloom(layer,
            at,
            WHITE_HOT,
            90 * power,
            110),
        dustBurst(layer,
            at,
            sparks({
                count: Math.round(26 * power), angle: [dir - .42,
                    dir + .42], speed: [260,
                    760], gravity: 260, life: [90,
                    220], size: [34 * power,
                    10]
            })),
        dustBurst(layer,
            at,
            flame({
                count: Math.round(22 * power), angle: [dir - .3,
                    dir + .3], speed: [120,
                    360], gravity: 0, life: [110,
                    240], size: [20 * power,
                    5]
            })),
        gunSmoke(at,
            layer,
            74 * power)
    ])
}

/** Đạn gang trong icon Q: viên sắt đen bọc quầng lửa, kéo đuôi lửa dày. Trả về lúc chạm và lúc đuôi hạt tan */
function ironRound(ctx: VfxCtx, a: Pt, b: Pt, ms: number, size: number) {
    const halo = makeSprite(ctx.layer,
        "glow",
        a.x,
        a.y,
        AMBER,
        size * 4.4)
    const ball = makeSprite(ctx.layer,
        "circle",
        a.x,
        a.y,
        IRON,
        size,
        false)
    const shine = makeSprite(ctx.layer,
        "glow",
        a.x,
        a.y,
        WHITE_HOT,
        size * .8)
    const sprites = [halo,
        ball,
        shine]
    let p = {
        ...a
    }
    const near = () => around(p,
        size * .45)
    const arrived = tween(ms,
        (t) => {
            p = {
                x: lerp(a.x,
                    b.x,
                    t), y: lerp(a.y,
                    b.y,
                    t)
            }
            for (const s of sprites) {
                if (s.destroyed) continue
                s.x = p.x
                s.y = p.y
            }
        },
        ease.in,
        ctx.layer).then(() => {
        for (const s of sprites) if (!s.destroyed) s.alpha = 0
    })
    const tail = Promise.all([
        dustStream(ctx.layer,
            near,
            ms,
            760,
            flame({
                speed: [8,
                    60], gravity: 0, flow: 70, life: [130,
                    300], size: [size * 1.7,
                    size * .4], streak: 3
            })),
        dustStream(ctx.layer,
            near,
            ms,
            520,
            {
                color: [HOT,
                    AMBER], speed: [4,
                    40], life: [90,
                    220], size: [7,
                    2], alpha: 1, flow: 30, drag: 2.4
            }),
        dustStream(ctx.layer,
            () => p,
            ms,
            90,
            {
                puff: true, color: [SMOKE,
                    SOOT], speed: [4,
                    20], life: [240,
                    520], size: [size * 1.4,
                    size * 3.2], alpha: .28, flow: 20, additive: false
            })
    ])
    return {
        arrived, tail
    }
}

/** Trái tim Love Tap: điểm trên đường viền */
const heartAt = (c: Pt, a: number, r: number): Pt => {
    const s = Math.sin(a)
    return {
        x: c.x + s * s * s * r,
        y: c.y - (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16 * r
    }
}

/** Cú trúng của đạn nặng: tia lửa bắn toả, lưỡi lửa, khói; chí mạng thì trắng vàng và dài hơn */
function slugImpact(ctx: VfxCtx, power: number, count: number) {
    const crit = critOf(ctx)
    const at = ctx.from
    const reach = crit ? 1.5 : 1
    return Promise.all([
        bloom(ctx.layer,
            at,
            crit ? WHITE_HOT : AMBER,
            290 * power * reach,
            300),
        bloom(ctx.layer,
            at,
            WHITE_HOT,
            110 * power * reach,
            170),
        dustBurst(ctx.layer,
            at,
            sparks({
                count: Math.round(count * reach), speed: [220 * power,
                    760 * power * reach], size: [34 * reach,
                    10], spread: 14
            })),
        dustBurst(ctx.layer,
            at,
            flame({
                count: Math.round(count * .9), speed: [50,
                    220 * power], spread: 26 * power
            })),
        gunSmoke(at,
            ctx.layer,
            120 * power,
            .3)
    ])
}

/** Q mở màn: hai nòng hút nóng đỏ, tia lửa chạy dọc súng rồi chốt nhịp bắn */
registerVfx("mfRicochetCast",
    async (ctx) => {
        const k = kOf(ctx)
        const glow = Promise.all(pistols(ctx.from,
            -Math.PI / 2,
            k).map(at => Promise.all([
            bloom(ctx.layer,
                at,
                ctx.color,
                170 * k,
                240),
            dustStream(ctx.layer,
                () => around(at,
                    46 * k),
                200,
                420,
                flame({
                    speed: [10,
                        60], life: [110,
                        220], size: [11,
                        3]
                }))
        ])))
        await tween(210,
            () => {},
            ease.linear,
            ctx.layer)
        ctx.onBeat?.()
        await glow
    })

/** Q: hai súng cùng nổ, đạn gang kéo đuôi lửa tới mục tiêu chính; chạm là báo nhịp */
registerVfx("mfRicochetShot",
    async (ctx) => {
        const k = kOf(ctx)
        const crit = critOf(ctx)
        const size = (crit ? 24 : 19) * k
        await Promise.all(ctx.to.map(async (to) => {
            const dir = dirOf(ctx.from,
                to)
            ctx.shake(3,
                110)
            for (const at of pistols(ctx.from,
                dir,
                k)) void muzzleFlash(ctx.layer,
                at,
                dir,
                crit ? 1.25 : 1)
            const round = ironRound(ctx,
                ctx.from,
                to,
                ROUND_MS,
                size)
            await round.arrived
            ctx.onBeat?.()
            await round.tail
        }))
    })

/** Q nảy: từ mục tiêu chính đạn văng tiếp sang tướng địch khác, không dừng */
registerVfx("mfRicochetFork",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all(ctx.to.map(async (to) => {
            void dustBurst(ctx.layer,
                ctx.from,
                sparks({
                    count: 22, angle: [dirOf(ctx.from,
                        to) - .5,
                    dirOf(ctx.from,
                        to) + .5]
                }))
            const round = ironRound(ctx,
                ctx.from,
                to,
                FORK_MS,
                15 * k)
            await round.arrived
            ctx.onBeat?.()
            await round.tail
        }))
    })

/** Q trúng: đạn găm, tia lửa và lửa bung */
registerVfx("mfRicochetHit",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(critOf(ctx) ? 8 : 4,
            critOf(ctx) ? 230 : 140)
        await slugImpact(ctx,
            1.1 * k,
            70)
    })

/** Nội tại: viên đạn văng từ mục tiêu sang địch khác, vệt vàng hồng kéo bụi trái tim */
registerVfx("mfBounceShot",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all(ctx.to.map(async (to) => {
            const shot = makeShot(ctx.from,
                to,
                TAP_MS,
                190 * k,
                17 * k,
                ctx.color,
                0,
                () => ctx.onBeat?.())
            void dustBurst(ctx.layer,
                ctx.from,
                sparks({
                    count: 16, angle: [dirOf(ctx.from,
                        to) - .5,
                    dirOf(ctx.from,
                        to) + .5], speed: [160,
                        460]
                }))
            await Promise.all([
                fireTracers(ctx.layer,
                    [shot]),
                dustStream(ctx.layer,
                    () => around(shot.at,
                        10 * k),
                    TAP_MS,
                    620,
                    {
                        color: [LOVE,
                            AMBER,
                            HOT], speed: [6,
                            60], life: [140,
                            320], size: [8,
                            2], alpha: 1, flow: 50
                    })
            ])
        }))
    })

/** Nội tại trúng: trái tim lửa Love Tap bung ra ở địch bị nảy */
registerVfx("mfBounceHit",
    async (ctx) => {
        const k = kOf(ctx)
        const r = 54 * k
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                200 * k,
                300),
            dustBurst(ctx.layer,
                ctx.from,
                sparks({
                    count: 26, speed: [140,
                        420], size: [24,
                        7]
                })),
            dustStream(ctx.layer,
                () => around(heartAt(ctx.from,
                    rand(0,
                        TAU),
                    r),
                5),
                100,
                3400,
                {
                    color: [ctx.color,
                        CRIMSON,
                        AMBER,
                        HOT], speed: [8,
                        46], gravity: -70, life: [340,
                        640], size: [11,
                        3], alpha: 1, flow: 26, drag: 2.2, additive: false
                })
        ])
    })

/** E mở màn: Miss Fortune chĩa cả hai súng lên trời xả đạn, vệt đạn đỏ cam bay ra khỏi màn hình rồi mới chốt nhịp */
registerVfx("mfRainCast",
    async (ctx) => {
        const k = kOf(ctx)
        const up = -Math.PI / 2
        const guns = pistols(ctx.from,
            up,
            k)
        const shots = Array.from({
            length: 34
        },
        (_, i) => {
            const a = guns[i % 2]
            return makeShot(a,
                {
                    x: a.x + rand(-170,
                        170), y: -80
                },
                220,
                rand(230,
                    360),
                rand(18,
                    27),
                pick(FIRE),
                i * 15)
        })
        for (const [i,
            at] of guns.entries()) void sleep(i * 70).then(() => muzzleFlash(ctx.layer,
            at,
            up,
            1.15))
        ctx.shake(2.5,
            300)
        await Promise.all([
            fireTracers(ctx.layer,
                shots),
            tween(430,
                () => {},
                ease.linear,
                ctx.layer).then(() => ctx.onBeat?.())
        ])
    })

/** Hàng mục tiêu: lấy từ `to`, không có thì suy từ phía đối diện caster */
function rowOf(ctx: VfxCtx) {
    const W = ctx.app.screen.width, H = ctx.app.screen.height
    const xs = ctx.to.map(p => p.x)
    return {
        x0: (xs.length ? Math.min(...xs) : W * .24) - 90,
        x1: (xs.length ? Math.max(...xs) : W * .76) + 90,
        y: ctx.to.length ? ctx.to.reduce((sum, p) => sum + p.y,
            0) / ctx.to.length : H - ctx.from.y
    }
}

/** E: mưa đạn trút xuống toàn hàng địch. Viên đầu chạm là báo nhịp, phần mưa còn lại chỉ là hình ảnh */
registerVfx("mfBulletRain",
    async (ctx) => {
        const k = kOf(ctx)
        const row = rowOf(ctx)
        const floor = () => {
            const unit = ctx.to.length && Math.random() < .68 ? pick(ctx.to) : undefined
            return unit ? {
                x: unit.x + rand(-88,
                    88), y: unit.y + rand(-90,
                    100)
            } : {
                x: rand(row.x0,
                    row.x1), y: row.y + rand(-90,
                    100)
            }
        }
        const contact = () => {
            ctx.shake(6,
                260)
            ctx.onBeat?.()
        }
        const shots = Array.from({
            length: RAIN_SHOTS
        },
        (_, i) => {
            const b = floor()
            const a = {
                x: b.x + rand(10,
                    70), y: b.y - RAIN_HEIGHT
            }
            // một phần ba là hạt đạn ngắn, sáng vàng như icon; còn lại là vệt đỏ dài
            const slug = i % 3 === 0
            return makeShot(a,
                b,
                RAIN_FALL_MS,
                slug ? rand(64,
                    110) : rand(280,
                    460),
                slug ? rand(22,
                    30) : rand(17,
                    25),
                slug ? pick([AMBER,
                    HOT]) : pick([CRIMSON,
                    CRIMSON,
                    EMBER]),
                i ? rand(0,
                    RAIN_MS - RAIN_FALL_MS) : 0,
                i ? undefined : contact)
        })
        const span = () => floor()
        const air = () => ({
            x: rand(row.x0,
                row.x1), y: row.y - rand(40,
                RAIN_HEIGHT * .7)
        })
        await Promise.all([
            fireTracers(ctx.layer,
                shots),
            // màn đỏ cam phủ trước khi đạn tới, như nền icon
            dustStream(ctx.layer,
                air,
                RAIN_MS,
                110,
                {
                    puff: true, color: [CRIMSON,
                        EMBER], speed: [4,
                        30], gravity: 60, life: [420,
                        820], size: [230,
                        360], alpha: .34, flow: 16, additive: false
                }),
            sleep(RAIN_FALL_MS).then(() => Promise.all([
                dustStream(ctx.layer,
                    span,
                    RAIN_MS - RAIN_FALL_MS,
                    620,
                    flame({
                        speed: [30,
                            170], life: [160,
                            340], size: [26,
                            7]
                    })),
                dustStream(ctx.layer,
                    span,
                    RAIN_MS - RAIN_FALL_MS,
                    1900,
                    sparks({
                        angle: [-Math.PI * .86,
                            -Math.PI * .14], speed: [160 * k,
                            520 * k], gravity: 1000, life: [130,
                            320], size: [34,
                            9]
                    })),
                dustStream(ctx.layer,
                    span,
                    RAIN_MS - RAIN_FALL_MS,
                    190,
                    {
                        puff: true, color: [SMOKE,
                            0x8a6a55,
                            SOOT], speed: [20,
                            80], angle: [-Math.PI * .8,
                            -Math.PI * .2], life: [380,
                            760], size: [58,
                            120], alpha: .26, flow: 24, additive: false
                    })
            ]))
        ])
    })

/** E trúng: mỗi tướng một quầng lửa, tia lửa và bụi đất */
registerVfx("mfRainHit",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                260 * k,
                320),
            dustBurst(ctx.layer,
                ctx.from,
                sparks({
                    count: 54, angle: [-Math.PI * .92,
                        -Math.PI * .08], speed: [220,
                        640], gravity: 1000, spread: 60 * k
                })),
            dustBurst(ctx.layer,
                ctx.from,
                flame({
                    count: 44, spread: 58 * k
                })),
            gunSmoke(ctx.from,
                ctx.layer,
                130 * k,
                .26)
        ])
    })

/** E còn hiệu lực: lá tướng cháy âm ỉ, than đỏ bốc lên. Có ctx.tether thì bám lá và chạy tới khi được thả (tối đa SCORCH_MAX_MS); không thì chạy ngắn tại chỗ */
registerVfx("mfRainScorch",
    async (ctx) => {
        const k = kOf(ctx)
        const at = () => ctx.tether?.target() ?? ctx.from
        const limit = ctx.tether ? SCORCH_MAX_MS : 2000
        const body = () => {
            const p = at()
            return {
                x: p.x + rand(-74,
                    74) * k, y: p.y + rand(-40,
                    100) * k
            }
        }
        const pieces: Promise<unknown>[] = []
        let el = 0
        while (!ctx.layer.destroyed && !ctx.tether?.released() && el < limit) {
            pieces.push(dustStream(ctx.layer,
                body,
                340,
                260,
                {
                    color: [EMBER,
                        CRIMSON,
                        AMBER], speed: [20,
                        70], angle: [-Math.PI * .66,
                        -Math.PI * .34], gravity: -90, life: [520,
                        1000], size: [8,
                        2], alpha: 1, flow: 44
                }),
            dustStream(ctx.layer,
                body,
                340,
                18,
                {
                    puff: true, color: [SMOKE,
                        SOOT], speed: [10,
                        40], gravity: -50, life: [520,
                        900], size: [44,
                        90], alpha: .16, flow: 20, additive: false
                }),
            bloom(ctx.layer,
                at(),
                CRIMSON,
                170 * k,
                640))
            await tween(340,
                () => {},
                ease.linear,
                ctx.layer)
            el += 340
        }
        await Promise.all(pieces)
    })

/** R mở màn: đứng vững, hai nòng nóng đỏ, lửa cuộn về súng rồi chốt nhịp loạt đầu */
registerVfx("mfBulletTimeCast",
    async (ctx) => {
        const k = kOf(ctx)
        const to = ctx.to[0] ?? {
            x: ctx.from.x, y: ctx.from.y - 300
        }
        const guns = pistols(ctx.from,
            dirOf(ctx.from,
                to),
            k)
        const ms = 520
        const pull = guns.map(gun => dustStream(ctx.layer,
            () => around(gun,
                130 * k),
            ms,
            900,
            flame({
                color: [CRIMSON,
                    EMBER,
                    AMBER,
                    HOT], speed: [8,
                    40], gravity: -40, life: [160,
                    340], size: [15,
                    3], flow: 120
            })))
        const heat = Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                420 * k,
                ms),
            ...guns.map(gun => bloom(ctx.layer,
                gun,
                HOT,
                190 * k,
                ms))
        ])
        await tween(ms,
            () => {},
            ease.linear,
            ctx.layer)
        ctx.onBeat?.()
        await Promise.all([heat,
            ...pull])
    })

/** R: một loạt đạn toả khắp hàng địch như quạt trong game. Mỗi địch nhận chùm vệt đạn dày, vài vệt lọt khe hàng; cùng chạm một lúc là báo nhịp */
registerVfx("mfBulletVolley",
    async (ctx) => {
        const crit = critOf(ctx)
        const row = ctx.to.length ? ctx.to : [{
            x: ctx.from.x, y: ctx.from.y - 340
        }]
        const mid = row[Math.floor(row.length / 2)]
        const dir = dirOf(ctx.from,
            mid)
        const guns = pistols(ctx.from,
            dir,
            1)
        const heavy = crit ? 1.4 : 1
        const color = () => (crit ? pick([AMBER,
            HOT]) : pick(FIRE))
        let beat = false
        const contact = () => {
            if (beat) return
            beat = true
            ctx.onBeat?.()
        }
        const shots: Shot[] = []
        for (const to of row) {
            for (let i = 0; i < 5; i++) {
                const a = guns[i % 2]
                shots.push(makeShot(a,
                    {
                        x: to.x + rand(-54,
                            54), y: to.y + rand(-64,
                            70)
                    },
                    MF_VOLLEY_MS,
                    rand(240,
                        380) * heavy,
                    rand(15,
                        22) * heavy,
                    color(),
                    i ? rand(0,
                        55) : 0,
                    i ? undefined : contact))
            }
        }
        // đạn lọt khe và bay vượt hàng, quạt đạn không dừng ở lá tướng
        for (let i = 0; i < 9; i++) {
            const a = guns[i % 2]
            const left = row[0], right = row[row.length - 1]
            const t = rand(-.14,
                1.14)
            const far = {
                x: lerp(left.x,
                    right.x,
                    t), y: lerp(left.y,
                    right.y,
                    t)
            }
            const past = {
                x: a.x + (far.x - a.x) * 1.5, y: a.y + (far.y - a.y) * 1.5
            }
            shots.push(makeShot(a,
                past,
                MF_VOLLEY_MS * 1.5,
                rand(200,
                    320),
                rand(11,
                    16),
                color(),
                rand(0,
                    60)))
        }
        ctx.shake(crit ? 7 : 4,
            crit ? 200 : 120)
        for (const at of guns) void muzzleFlash(ctx.layer,
            at,
            dir,
            crit ? 1.5 : 1.15)
        await Promise.all([
            fireTracers(ctx.layer,
                shots),
            dustStream(ctx.layer,
                () => around(pick(shots).at,
                    12),
                MF_VOLLEY_MS,
                1300,
                {
                    color: [HOT,
                        AMBER,
                        EMBER], speed: [8,
                        70], life: [110,
                        260], size: [8,
                        2], alpha: 1, flow: 40
                })
        ])
    })

/** R trúng: mỗi loạt mỗi địch một chùm tia lửa, không rung thêm để loạt sau đè loạt trước vẫn sạch */
registerVfx("mfBulletTimeHit",
    async (ctx) => {
        await slugImpact(ctx,
            .92,
            42)
    })
