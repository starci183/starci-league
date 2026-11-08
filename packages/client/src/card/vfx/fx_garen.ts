// VFX riêng của Garen, chất liệu THÉP DEMACIA VÀ ÁNH SÁNG VÀNG: lưỡi đại kiếm sáng, vệt chém vàng trắng, mảnh thép sắc, tia lửa kim loại; nội tại là lửa xanh ngọc lục đúng icon. Không dùng nét vẽ hình học.
// Mỗi hiệu ứng chỉ dựa vào VfxCtx và tự dọn khi layer bị huỷ; trúng là báo ctx.onBeat, không chờ đuôi hạt tan.
import {
    Particle, ParticleContainer, Sprite, Texture, Ticker
} from "pixi.js"
import {
    bloom, dustBurst, dustStream, mist, type DustOpts
} from "./fx_dust"
import {
    ease, lerp, makeSprite, pick, rand, sleep, tex, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const TAU = Math.PI * 2
const PALE = 0xfff3b8
const AMBER = 0xffa41f
const EMBER = 0xff7a18
const WHITE = 0xfffdf4
const STEEL = 0xcfd8e6
const STEEL_DARK = 0x7f8ba0
const INDIGO = 0x1a1046
const LIME = 0xa6ff5a
const SKY_BLUE = 0x34b4ff
const ASH = [0xa79b86,
    0x6f675a,
    0x4a453e]
/** Nhịp kiếm chém xuống đầu mục tiêu của Q */
const STRIKE_MS = 240
/** Kiếm xoay quanh Garen trước khi quét sang ba đường */
const SPIN_BEAT_MS = 340
const SPIN_MS = 660
/** Lưỡi xoay tới mục tiêu thì báo trúng, xoay nốt vòng còn lại */
const SWEEP_BEAT_MS = 180
const SWEEP_MS = 320
const CALL_MS = 460
/** Kiếm trời rơi: chậm vừa đủ để nhìn thấy rồi cắm thẳng */
const JUSTICE_FALL_MS = 540
/** Kiếm cắm tại chỗ rồi tan thành bụi sáng */
const JUSTICE_HOLD_MS = 820
const SWORD_W = 300
const SWORD_H = 1000
/** Icon Công Lý Demacia vẽ lưỡi rất bản: giãn ngang khi là kiếm trời */
const SWORD_FAT = 1.7

const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
const goldOf = (ctx: VfxCtx) => [ctx.color,
    ctx.color2 ?? PALE,
    AMBER,
    WHITE]
const targets = (ctx: VfxCtx) => (ctx.to.length ? ctx.to : [ctx.from])
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

/** Chạm mục tiêu đầu tiên là báo nhịp, chỉ một lần cho mỗi lần phát */
const beatOnce = (ctx: VfxCtx) => {
    let done = false
    return () => {
        if (done) return
        done = true
        ctx.onBeat?.()
    }
}

/** Đại kiếm ánh sáng vẽ sẵn, mũi quay xuống: lưỡi rộng có rãnh giữa, cánh chắn cong như icon Công Lý Demacia, viền loé mềm */
function swordTexture(): Texture {
    const c = document.createElement("canvas")
    c.width = SWORD_W
    c.height = SWORD_H
    const g = c.getContext("2d")
    if (g) {
        const cx = SWORD_W / 2
        const blade = () => {
            g.beginPath()
            g.moveTo(cx,
                SWORD_H - 26)
            g.lineTo(cx - 62,
                SWORD_H * .78)
            g.lineTo(cx - 72,
                SWORD_H * .25)
            g.quadraticCurveTo(cx - 128,
                SWORD_H * .22,
                cx - 112,
                SWORD_H * .13)
            g.quadraticCurveTo(cx - 60,
                SWORD_H * .17,
                cx - 26,
                SWORD_H * .15)
            g.lineTo(cx - 20,
                SWORD_H * .05)
            g.quadraticCurveTo(cx,
                SWORD_H * .01,
                cx + 20,
                SWORD_H * .05)
            g.lineTo(cx + 26,
                SWORD_H * .15)
            g.quadraticCurveTo(cx + 60,
                SWORD_H * .17,
                cx + 112,
                SWORD_H * .13)
            g.quadraticCurveTo(cx + 128,
                SWORD_H * .22,
                cx + 72,
                SWORD_H * .25)
            g.lineTo(cx + 62,
                SWORD_H * .78)
            g.closePath()
        }
        // quầng ngoài rồi thân lưỡi, cả hai đều loé mềm nên không có viền cứng
        g.shadowColor = "rgba(255,190,50,.95)"
        g.shadowBlur = 46
        g.fillStyle = "rgba(255,196,60,.9)"
        blade()
        g.fill()
        g.shadowBlur = 20
        g.shadowColor = "rgba(255,240,190,.95)"
        const body = g.createLinearGradient(cx - 72,
            0,
            cx + 72,
            0)
        body.addColorStop(0,
            "#ffb52e")
        body.addColorStop(.32,
            "#ffe691")
        body.addColorStop(.5,
            "#ffffff")
        body.addColorStop(.68,
            "#ffe691")
        body.addColorStop(1,
            "#ffb52e")
        g.fillStyle = body
        blade()
        g.fill()
        g.shadowBlur = 0
        // rãnh giữa lưỡi cho khối kim loại, hai bên rãnh sáng trắng
        const fuller = g.createLinearGradient(0,
            SWORD_H * .2,
            0,
            SWORD_H * .85)
        fuller.addColorStop(0,
            "rgba(190,110,20,.75)")
        fuller.addColorStop(1,
            "rgba(190,110,20,0)")
        g.fillStyle = fuller
        g.fillRect(cx - 5,
            SWORD_H * .2,
            10,
            SWORD_H * .65)
        // chuôi và tay chắn tối hơn để thấy rõ đây là thanh kiếm
        const hilt = g.createLinearGradient(0,
            SWORD_H * .02,
            0,
            SWORD_H * .24)
        hilt.addColorStop(0,
            "rgba(70,86,170,.95)")
        hilt.addColorStop(.7,
            "rgba(120,110,190,.5)")
        hilt.addColorStop(1,
            "rgba(255,255,255,0)")
        g.globalCompositeOperation = "source-atop"
        g.fillStyle = hilt
        g.fillRect(0,
            0,
            SWORD_W,
            SWORD_H * .24)
    }
    return Texture.from(c)
}

/** Mảnh thép sắc của vệt chém */
function shardTexture(): Texture {
    const W = 64, H = 12
    const c = document.createElement("canvas")
    c.width = W
    c.height = H
    const g = c.getContext("2d")
    if (g) {
        g.fillStyle = "#fff"
        g.beginPath()
        g.moveTo(0,
            H / 2)
        g.lineTo(W * .62,
            0)
        g.lineTo(W,
            H / 2)
        g.lineTo(W * .62,
            H)
        g.closePath()
        g.fill()
    }
    return Texture.from(c)
}

let swordCache: Texture | undefined
let shardCache: Texture | undefined
const swordTex = () => (swordCache ??= swordTexture())
const shardTex = () => (shardCache ??= shardTexture())

interface ArcOpts {
    /** Tâm xoay */
    at: () => Pt;
    /** Góc tay kiếm hiện tại (rad) */
    angle: () => number;
    ms: number;
    /** Hạt mỗi giây */
    rate: number;
    rx: number;
    ry: number;
    /** Đoạn thân kiếm phát hạt, tính theo bán kính */
    reach: [number, number];
    color: number[];
    life: [number, number];
    /** Bề ngang hạt lúc đầu và cuối (px) */
    size: [number, number];
    /** Chiều dài hạt so với bề ngang, nằm theo hướng lưỡi kiếm đi */
    stretch: number;
    /** Hạt văng tiếp tuyến theo lưỡi kiếm (px/s), âm là quay ngược */
    speed: number;
    alpha?: number;
    /** Mảnh thép viền cứng thay vì vệt sáng mềm */
    sharp?: boolean;
}

interface ArcMote { p: Particle; vx: number; vy: number; age: number; life: number; s0: number; s1: number; a: number; stretch: number }

/**
 * Vệt lưỡi kiếm: hạt sinh dọc tay kiếm đang quay, nằm theo tiếp tuyến nên đuôi hạt nối thành lưỡi liềm thật.
 * Không dùng dustStream vì hướng hạt ở đó cố định, còn ở đây hướng đổi liên tục theo góc kiếm.
 */
function swordArc(ctx: VfxCtx, o: ArcOpts): Promise<void> {
    const { layer } = ctx
    if (layer.destroyed) return Promise.resolve()
    const texture = o.sharp ? shardTex() : tex("glow")
    const host = new ParticleContainer({
        texture,
        dynamicProperties: {
            position: true, vertex: true, rotation: true, color: true
        }
    })
    host.blendMode = o.sharp ? "normal" : "add"
    layer.addChild(host)
    const list: ArcMote[] = []
    return new Promise((resolve) => {
        let done = false
        let elapsed = 0
        let acc = 0
        let last = o.angle()
        const finish = () => {
            if (done) return
            done = true
            Ticker.shared.remove(tick)
            layer.off("destroyed",
                finish)
            list.length = 0
            if (!host.destroyed) host.destroy()
            resolve()
        }
        const spawn = (a: number) => {
            const r = rand(o.reach[0],
                o.reach[1])
            const c = o.at()
            const dir = o.speed >= 0 ? 1 : -1
            const tangent = a + dir * Math.PI / 2
            const k = rand(.7,
                1.3)
            const p = new Particle({
                texture, anchorX: .5, anchorY: .5,
                x: c.x + Math.cos(a) * o.rx * r + rand(-5,
                    5),
                y: c.y + Math.sin(a) * o.ry * r + rand(-5,
                    5),
                tint: pick(o.color), alpha: 0, rotation: tangent
            })
            host.addParticle(p)
            const v = Math.abs(o.speed) * rand(.6,
                1.2) * (.45 + r * .55)
            list.push({
                p, vx: Math.cos(tangent) * v, vy: Math.sin(tangent) * v, age: 0,
                life: rand(o.life[0],
                    o.life[1]),
                s0: o.size[0] * k / texture.height, s1: o.size[1] * k / texture.height,
                a: (o.alpha ?? 1) * rand(.65,
                    1),
                stretch: o.stretch * texture.height / texture.width
            })
        }
        const tick = (tk: Ticker) => {
            if (layer.destroyed || host.destroyed) { finish(); return }
            const dt = tk.deltaMS / 1000
            elapsed += tk.deltaMS
            const going = elapsed < o.ms
            const now = o.angle()
            if (going) {
                acc += dt * o.rate
                const n = Math.floor(acc)
                acc -= n
                // rải đều theo góc quét trong khung hình, không để hở khi kiếm quay nhanh
                for (let i = 0; i < n; i++) spawn(lerp(last,
                    now,
                    Math.random()))
            }
            last = now
            let removed = false
            for (let i = list.length - 1; i >= 0; i--) {
                const m = list[i]
                m.age += tk.deltaMS
                const t = m.age / m.life
                if (t >= 1) {
                    host.removeParticle(m.p)
                    list[i] = list[list.length - 1]
                    list.pop()
                    removed = true
                    continue
                }
                m.p.x += m.vx * dt
                m.p.y += m.vy * dt
                m.vx *= Math.max(0,
                    1 - 3 * dt)
                m.vy *= Math.max(0,
                    1 - 3 * dt)
                const sc = lerp(m.s0,
                    m.s1,
                    t)
                m.p.scaleX = sc * m.stretch
                m.p.scaleY = sc
                m.p.alpha = m.a * Math.min(1,
                    t * 12) * Math.pow(1 - t,
                    1.4)
            }
            if (removed) host.update()
            if (!going && !list.length) finish()
        }
        layer.once("destroyed",
            finish)
        Ticker.shared.add(tick)
    })
}

/** Lớp vệt liềm vàng trắng cộng mảnh thép bám theo, dùng chung cho nhát chém và cú xoay */
function bladeTrail(ctx: VfxCtx, o: Pick<ArcOpts, "at" | "angle" | "ms" | "rx" | "ry" | "speed">, power: number) {
    return Promise.all([
        swordArc(ctx,
            {
                ...o, rate: 2200, reach: [.34,
                    1.04], color: [AMBER,
                    ctx.color], life: [170,
                    300], size: [26 * power,
                    12 * power], stretch: 3.2, alpha: .4
            }),
        swordArc(ctx,
            {
                ...o, rate: 1500, reach: [.66,
                    1], color: [WHITE,
                    PALE,
                    ctx.color], life: [90,
                    190], size: [15 * power,
                    6 * power], stretch: 4.6
            }),
        swordArc(ctx,
            {
                ...o, rate: 620, reach: [.5,
                    1.1], color: [WHITE,
                    STEEL,
                    PALE,
                    ctx.color], life: [160,
                    320], size: [9 * power,
                    3 * power], stretch: 5.4, sharp: true
            })
    ])
}

/** Tia lửa kim loại và mảnh thép văng khi lưỡi kiếm va vào */
function metalBurst(ctx: VfxCtx, at: Pt, sparks: number, power: number) {
    return Promise.all([
        dustBurst(ctx.layer,
            at,
            {
                count: Math.round(sparks * .22), blade: true, color: [WHITE,
                    PALE,
                    STEEL,
                    ctx.color], speed: [280 * power,
                    860 * power], gravity: 620, drag: 2.8, flow: 8, life: [240,
                    540], size: [44 * power,
                    12], alpha: 1, spread: 14, additive: false
            }),
        dustBurst(ctx.layer,
            at,
            {
                count: Math.round(sparks * .4), color: [WHITE,
                    PALE,
                    ctx.color], speed: [520 * power,
                    1500 * power], drag: 5, flow: 0, life: [180,
                    420], size: [13,
                    4], streak: 8, alpha: 1, spread: 10
            }),
        dustBurst(ctx.layer,
            at,
            {
                count: sparks, color: goldOf(ctx), speed: [60 * power,
                    520 * power], gravity: 420, drag: 1.8, flow: 40, life: [420,
                    980], size: [7,
                    2], alpha: 1, spread: 24
            })
    ])
}

/** Quầng sáng giữ trên lá tướng, sáng nhanh rồi lịm chậm */
function heldGlow(ctx: VfxCtx, at: Pt, colors: number[], size: number, ms: number) {
    const parts = colors.map((color, i) => {
        const s = makeSprite(ctx.layer,
            "glow",
            at.x,
            at.y,
            color,
            size * (1.5 - i * .5))
        s.alpha = 0
        return s
    })
    return tween(ms,
        (t) => {
            const a = Math.min(1,
                t * 8) * Math.pow(1 - t,
                1.3)
            parts.forEach((s, i) => { if (!s.destroyed) s.alpha = a * (i ? .9 : .6) })
        },
        ease.linear,
        ctx.layer)
}

/** Mảnh giáp từ ngoài bay vào, khoá lên thân lá tướng */
function platesIn(ctx: VfxCtx, at: Pt, count: number, r: number, color: number[], ms: number) {
    return Promise.all(Array.from({
        length: count
    },
    (_, i) => {
        const a = i / count * TAU + rand(-.14,
            .14)
        const start = {
            x: at.x + Math.cos(a) * r * 1.15, y: at.y + Math.sin(a) * r * 1.45
        }
        const inward = Math.atan2(at.y - start.y,
            at.x - start.x)
        return dustBurst(ctx.layer,
            start,
            {
                count: 11, blade: true, color, speed: [r * 3.2,
                    r * 4.6], angle: [inward - .08,
                    inward + .08], drag: .6, flow: 0, life: [ms * .9,
                    ms * 1.35], size: [64,
                    30], alpha: 1, spread: 14, additive: false
            })
    }))
}

/** Dải sáng mềm dọc trời, chỉ là quầng kéo dài nên không có viền */
function lightShaft(ctx: VfxCtx, x: number, bottom: number, width: number) {
    const parts = [[AMBER,
        1.7,
        .3],
    [ctx.color,
        1,
        .4],
    [WHITE,
        .42,
        .4]].map(([tint,
        scale,
        alpha]) => {
        const s = makeSprite(ctx.layer,
            "glow",
            x,
            bottom / 2,
            tint,
            width)
        s.width = width * scale
        s.height = bottom * 1.7
        s.alpha = 0
        return {
            s, alpha, scale
        }
    })
    return {
        show(t: number) {
            for (const { s, alpha } of parts) if (!s.destroyed) s.alpha = alpha * t
        },
        fade(t: number) {
            for (const { s, alpha, scale } of parts) {
                if (s.destroyed) continue
                s.alpha = alpha * (1 - t) * (1 - t)
                s.width = width * scale * (1 + t * .9)
            }
        }
    }
}

/** Dựng thanh đại kiếm, neo ở điểm `pivot` tính theo tỉ lệ chiều dài từ chuôi tới mũi */
function swordSprite(ctx: VfxCtx, length: number, pivot: number, fat: number) {
    const s = new Sprite(swordTex())
    s.anchor.set(.5,
        pivot)
    s.height = length
    s.width = length * fat * SWORD_W / SWORD_H
    ctx.layer.addChild(s)
    return s
}

/** Nội tại Kiên Cường: lửa xanh ngọc từ chân lá bốc lên hồi Máu, mảnh giáp thép viền vàng khoá vào thân tăng Giáp */
registerVfx("garenPerseverance",
    async (ctx) => {
        const k = kOf(ctx)
        const flame = [ctx.color,
            ctx.color2 ?? LIME,
            SKY_BLUE]
        const ms = 560
        ctx.onBeat?.()
        await Promise.all([
            heldGlow(ctx,
                ctx.from,
                [ctx.color,
                    ctx.color2 ?? LIME],
                300 * k,
                ms * 1.4),
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                360 * k,
                ms),
            dustStream(ctx.layer,
                () => ({
                    x: ctx.from.x + rand(-64,
                        64) * k, y: ctx.from.y + rand(40,
                        100) * k
                }),
                ms,
                760,
                {
                    color: flame, speed: [160,
                        440], angle: [-Math.PI * .6,
                        -Math.PI * .4], gravity: -320, drag: .7, flow: 110, life: [360,
                        760], size: [11,
                        3], alpha: .8
                }),
            dustStream(ctx.layer,
                () => onCard(ctx.from,
                    k),
                ms,
                520,
                {
                    color: flame, speed: [240,
                        540], angle: [-Math.PI * .56,
                        -Math.PI * .44], drag: .5, flow: 34, life: [220,
                        460], size: [11,
                        3], streak: 6, alpha: 1
                }),
            platesIn(ctx,
                ctx.from,
                12,
                112 * k,
                [STEEL,
                    STEEL_DARK,
                    0xffd23a,
                    WHITE],
                170)
        ])
    })

/** Luật chết: Garen gục, nửa số Giáp bong ra rơi xuống thành mảnh thép xỉn */
registerVfx("garenArmorShed",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            dustStream(ctx.layer,
                () => onCard(ctx.from,
                    k),
                420,
                420,
                {
                    blade: true, color: [STEEL,
                        STEEL_DARK,
                        0xc8a24a], speed: [40,
                        240], angle: [0,
                        Math.PI], gravity: 1100, drag: .8, flow: 8, life: [420,
                        860], size: [50,
                        18], alpha: 1, additive: false
                }),
            mist(ctx.layer,
                ctx.from,
                {
                    color: ASH, size: 150 * k, alpha: .5, count: 8, additive: false, gravity: 60, speed: [10,
                        60], life: [520,
                        1000]
                })
        ])
    })

/** Q mở màn: lưỡi kiếm bừng vàng trên tay Garen, gió tốc lực kéo dọc lá */
registerVfx("garenDecisiveCharge",
    async (ctx) => {
        const k = kOf(ctx)
        const ms = 300
        await Promise.all([
            heldGlow(ctx,
                ctx.from,
                [AMBER,
                    ctx.color],
                250 * k,
                ms * 1.5),
            bloom(ctx.layer,
                ctx.from,
                WHITE,
                190 * k,
                ms),
            dustStream(ctx.layer,
                () => onCard(ctx.from,
                    k),
                ms,
                1500,
                {
                    color: goldOf(ctx), speed: [420,
                        900], angle: [-Math.PI * .54,
                        -Math.PI * .46], drag: .6, flow: 12, life: [130,
                        300], size: [11,
                        3], streak: 8, alpha: 1
                }),
            sleep(ms).then(() => ctx.onBeat?.())
        ])
    })

/** Q: đại kiếm giáng từ trên xuống ngay tại mục tiêu, vệt liềm vàng theo lưỡi; lưỡi chạm là báo nhịp */
registerVfx("garenDecisiveStrike",
    async (ctx) => {
        const k = kOf(ctx)
        const land = beatOnce(ctx)
        await Promise.all(targets(ctx).map(async (to) => {
            const length = 240 * k
            const reach = length * .9
            const pivot = {
                x: to.x + 56 * k, y: to.y - reach * .92
            }
            const startAngle = 3.2, endAngle = 1.85
            let angle = startAngle
            const sword = swordSprite(ctx,
                length,
                .1,
                1.25)
            sword.position.set(pivot.x,
                pivot.y)
            const face = (a: number) => {
                if (!sword.destroyed) sword.rotation = a - Math.PI / 2
            }
            face(startAngle)
            await Promise.all([
                bladeTrail(ctx,
                    {
                        at: () => pivot, angle: () => angle, ms: STRIKE_MS + 30, rx: reach, ry: reach, speed: -560
                    },
                    1.05 * k),
                tween(STRIKE_MS,
                    (t) => {
                        angle = lerp(startAngle,
                            endAngle,
                            t)
                        face(angle)
                    },
                    ease.in,
                    ctx.layer).then(() => {
                    land()
                    return tween(380,
                        (t) => { if (!sword.destroyed) sword.alpha = t < .4 ? 1 : 1 - (t - .4) / .6 },
                        ease.linear,
                        ctx.layer)
                })
            ])
            if (!sword.destroyed) sword.destroy()
        }))
    })

/** Q trúng: lưỡi kiếm nện xuống, nan lửa vàng xoè sát lá, tia thép văng, như icon chiêu */
registerVfx("garenDecisiveHit",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(9,
            240)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                470 * k,
                420),
            bloom(ctx.layer,
                ctx.from,
                WHITE,
                260 * k,
                240),
            metalBurst(ctx,
                ctx.from,
                420,
                1.15 * k),
            ...[Math.PI * .08,
                Math.PI * .92].map((a) => dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 60, color: [WHITE,
                        PALE,
                        ctx.color,
                        EMBER], speed: [440,
                        1150], angle: [a - .32,
                        a + .32], drag: 3.8, flow: 30, life: [240,
                        540], size: [13,
                        3], streak: 6, alpha: 1, spread: 14
                }))
        ])
    })

/** Câm Lặng: màn tối chàm phủ thân lá, các mũi thép vàng ghim từ trên đầu xuống, bụi vàng tắt dần. Cỡ cố định */
registerVfx("garenSilence",
    async (ctx) => {
        const ms = 1000
        const top = {
            x: ctx.from.x, y: ctx.from.y - 150
        }
        await Promise.all([
            mist(ctx.layer,
                ctx.from,
                {
                    color: [INDIGO,
                        0x2b1a6a], size: 170, alpha: .36, count: 7, additive: false, speed: [6,
                        40], life: [700,
                        1250]
                }),
            dustStream(ctx.layer,
                () => ({
                    x: top.x + rand(-74,
                        74), y: top.y + rand(-16,
                        16)
                }),
                ms * .55,
                170,
                {
                    blade: true, color: [WHITE,
                        PALE,
                        ctx.color], speed: [700,
                        1000], angle: [Math.PI / 2 - .05,
                        Math.PI / 2 + .05], drag: 3.6, flow: 0, life: [170,
                        320], size: [62,
                        26], alpha: 1, additive: false
                }),
            dustStream(ctx.layer,
                () => onCard(ctx.from,
                    1),
                ms,
                520,
                {
                    color: [ctx.color,
                        PALE], speed: [4,
                        36], gravity: 90, life: [340,
                        720], size: [7,
                        2], alpha: 1, flow: 22
                })
        ])
    })

/** E: tay kiếm xoay quanh tâm, trục lệch theo lá tướng; quay nhanh dần theo `spin` vòng */
const spinner = (ctx: VfxCtx, at: Pt, ms: number, spin: number, k: number, power: number) => {
    const start = rand(0,
        TAU)
    let angle = start
    return Promise.all([
        tween(ms,
            (t) => { angle = start + t * spin * TAU },
            ease.linear,
            ctx.layer),
        bladeTrail(ctx,
            {
                at: () => at, angle: () => angle, ms, rx: 104 * k, ry: 122 * k, speed: 620
            },
            power)
    ])
}

/** E mở màn: Garen xoay đại kiếm tại chỗ, vàng trắng cuộn quanh thân, bụi đất tung ra; nhịp giữa cú xoay để lưỡi quét sang ba đường */
registerVfx("garenJudgmentSpin",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            spinner(ctx,
                ctx.from,
                SPIN_MS,
                3.4,
                k,
                1.0 * k),
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                420 * k,
                SPIN_MS),
            heldGlow(ctx,
                ctx.from,
                [AMBER,
                    ctx.color],
                260 * k,
                SPIN_MS * 1.1),
            dustStream(ctx.layer,
                () => around(ctx.from,
                    100 * k),
                SPIN_MS,
                360,
                {
                    color: goldOf(ctx), speed: [120,
                        340], drag: 2.2, flow: 110, life: [260,
                        560], size: [6,
                        2], alpha: .9
                }),
            sleep(SPIN_BEAT_MS).then(() => ctx.onBeat?.())
        ])
    })

/** E: lưỡi xoay cuốn tại đúng từng mục tiêu, ba đường cùng lúc; chạm là báo nhịp */
registerVfx("garenJudgmentSweep",
    async (ctx) => {
        const k = kOf(ctx)
        const land = beatOnce(ctx)
        await Promise.all([
            ...targets(ctx).map((to) => spinner(ctx,
                to,
                SWEEP_MS,
                1.5,
                .92 * k,
                .9 * k)),
            sleep(SWEEP_BEAT_MS).then(land)
        ])
    })

/** E trúng từng tướng: thép va, tia lửa kim loại, ánh vàng loé */
registerVfx("garenJudgmentHit",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(5,
            180)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                340 * k,
                340),
            bloom(ctx.layer,
                ctx.from,
                WHITE,
                170 * k,
                200),
            metalBurst(ctx,
                ctx.from,
                220,
                k)
        ])
    })

/** E: Khiên của Garen, lá chắn vàng ôm thân lá, mảnh thép khoá vào, bụi vàng bốc nhẹ */
registerVfx("garenJudgmentShield",
    async (ctx) => {
        const k = kOf(ctx)
        const ms = 700
        await Promise.all([
            heldGlow(ctx,
                ctx.from,
                [ctx.color,
                    WHITE],
                330 * k,
                ms * 1.2),
            platesIn(ctx,
                ctx.from,
                14,
                116 * k,
                [ctx.color,
                    PALE,
                    STEEL,
                    WHITE],
                170),
            dustStream(ctx.layer,
                () => onCard(ctx.from,
                    k),
                ms,
                620,
                {
                    color: goldOf(ctx), speed: [30,
                        130], angle: [-Math.PI * .62,
                        -Math.PI * .38], gravity: -110, life: [380,
                        800], size: [8,
                        2], alpha: 1, flow: 40, drag: 1.2
                })
        ])
    })

/** R mở màn: Garen giơ kiếm, ánh sáng từ thân vọt thẳng lên trời */
registerVfx("garenJusticeCall",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            heldGlow(ctx,
                ctx.from,
                [AMBER,
                    ctx.color],
                230 * k,
                CALL_MS * 1.3),
            dustStream(ctx.layer,
                () => ({
                    x: ctx.from.x + rand(-50,
                        50) * k, y: ctx.from.y + rand(-40,
                        70) * k
                }),
                CALL_MS,
                1900,
                {
                    color: goldOf(ctx), speed: [760,
                        1500], angle: [-Math.PI / 2 - .04,
                        -Math.PI / 2 + .04], drag: .2, flow: 6, life: [260,
                        560], size: [11,
                        3], streak: 9, alpha: 1
                }),
            sleep(CALL_MS).then(() => ctx.onBeat?.())
        ])
    })

/** R: đại kiếm ánh sáng từ trời rơi thẳng xuống mục tiêu, nền tối chàm làm kiếm nổi hẳn khỏi bàn; mũi chạm là báo nhịp, kiếm cắm lại rồi tan thành bụi sáng */
registerVfx("garenJusticeSword",
    async (ctx) => {
        const k = kOf(ctx)
        const land = beatOnce(ctx)
        await Promise.all(targets(ctx).map(async (to) => {
            const length = Math.min(460,
                Math.max(275,
                    to.y + 60))
            const width = length * SWORD_FAT * SWORD_W / SWORD_H
            const pool = makeSprite(ctx.layer,
                "glow",
                to.x,
                to.y * .6,
                INDIGO,
                560,
                false)
            pool.height = 1100
            pool.alpha = 0
            const shaft = lightShaft(ctx,
                to.x,
                to.y,
                240 * k)
            const sword = swordSprite(ctx,
                length,
                1,
                SWORD_FAT)
            const skyY = -30
            sword.position.set(to.x,
                skyY)
            let tip = skyY
            const onBlade = () => ({
                x: to.x + rand(-.3,
                    .3) * width, y: tip - rand(0,
                    length * .9)
            })
            const fall: DustOpts = {
                color: goldOf(ctx), speed: [60,
                    240], angle: [-Math.PI,
                    0], life: [190,
                    460], size: [10,
                    3], alpha: 1, flow: 60, drag: 2
            }
            await Promise.all([
                tween(JUSTICE_FALL_MS * .9,
                    (t) => {
                        if (!pool.destroyed) pool.alpha = t * .78
                        shaft.show(t)
                    },
                    ease.out,
                    ctx.layer),
                bloom(ctx.layer,
                    to,
                    ctx.color,
                    360 * k,
                    JUSTICE_FALL_MS + 120),
                dustStream(ctx.layer,
                    onBlade,
                    JUSTICE_FALL_MS,
                    900,
                    fall),
                dustStream(ctx.layer,
                    () => ({
                        x: to.x + rand(-1.1,
                            1.1) * width, y: tip - rand(0,
                            length)
                    }),
                    JUSTICE_FALL_MS,
                    420,
                    {
                        color: [WHITE,
                            PALE,
                            ctx.color], speed: [900,
                            1600], angle: [Math.PI / 2 - .02,
                            Math.PI / 2 + .02], drag: .1, flow: 0, life: [120,
                            260], size: [10,
                            3], streak: 10, alpha: 1
                    }),
                tween(JUSTICE_FALL_MS,
                    (t) => {
                        tip = lerp(skyY,
                            to.y + 40,
                            t)
                        if (!sword.destroyed) sword.y = tip
                    },
                    (t) => t * t,
                    ctx.layer).then(async () => {
                    land()
                    await Promise.all([
                        tween(JUSTICE_HOLD_MS,
                            (t) => {
                                shaft.fade(t)
                                if (!pool.destroyed) pool.alpha = .78 * (1 - t)
                                if (!sword.destroyed) sword.alpha = t < .6 ? 1 : 1 - (t - .6) / .4
                            },
                            ease.linear,
                            ctx.layer),
                        dustStream(ctx.layer,
                            onBlade,
                            JUSTICE_HOLD_MS,
                            620,
                            {
                                color: goldOf(ctx), speed: [40,
                                    190], gravity: -240, life: [320,
                                    760], size: [6,
                                    2], alpha: 1, flow: 70, drag: 1.2
                            })
                    ])
                })
            ])
            for (const s of [sword,
                pool]) if (!s.destroyed) s.destroy()
        }))
    })

/** R trúng: lõi trắng loá, nan sáng toả ngang mặt bàn như icon chiêu, mảnh thép, bụi đất cuộn lên */
registerVfx("garenJusticeHit",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(15,
            420)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                WHITE,
                620 * k,
                420),
            bloom(ctx.layer,
                ctx.from,
                ctx.color,
                820 * k,
                640),
            metalBurst(ctx,
                ctx.from,
                640,
                1.2 * k),
            ...[0,
                Math.PI].flatMap((side) => [.1,
                .34,
                .6].map((tilt) => {
                const a = side === 0 ? tilt : Math.PI - tilt
                return dustBurst(ctx.layer,
                    ctx.from,
                    {
                        count: 70, color: [WHITE,
                            PALE,
                            ctx.color,
                            AMBER], speed: [520,
                            1500], angle: [a - .1,
                            a + .1], drag: 3.2, flow: 18, life: [300,
                            660], size: [16,
                            4], streak: 7, alpha: 1, spread: 12
                    })
            }))
        ])
    })
