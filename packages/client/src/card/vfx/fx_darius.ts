// VFX riêng của Darius, chất liệu THÉP NOXUS VÀ MÁU: rìu lớn vẽ sẵn, mảnh `blade` sắc, sương đỏ máu, giọt máu có trọng lực. Đòn luôn chém tại mục tiêu, không có rìu bay.
// Chảy Máu nằm ngay trên nạn nhân, không bắn đạn từ Darius. Mỗi hiệu ứng chỉ dựa vào VfxCtx và tự dọn khi layer bị huỷ; trúng là báo ctx.onBeat, không chờ đuôi hạt tan.
import {
    Sprite, Texture, type Container, type Ticker
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
const WHITE = 0xffffff
const STEEL = 0xd8dde3
const SCARLET = 0xff2a36
const CRIMSON = 0xd80f26
const BLOOD = 0xa30016
const GORE = 0x6c0410
const CLOT = 0x2c0208
const PINK = 0xff8a78
/** Mở màn Q, E: Darius nhấc rìu đúng chừng này */
const RAISE_MS = 300
const SWING_MS = 460
/** Góc rìu quét trước và sau điểm trúng */
const SWEEP_BACK = 1.75
const SWEEP_ON = 1.45
const AXE_LEN = 350
const REACH_MS = 190
const HOOK_HOLD_MS = 160
const HOOK_MAX_MS = 3000
/** R: Darius lấy đà đúng thời gian niệm của LMHT rồi lưỡi rìu rơi */
export const DARIUS_LEAP_MS = 370
const DROP_MS = 460
const DROP_HEIGHT = 680
const GUILLOTINE_LEN = 620
const EMBED_MS = 720
/** Một lượt máu rỉ trên nạn nhân; demo và trận nối lần phát mới theo nhịp này */
export const DARIUS_BLEED_MS = 900
/** Lá R bay về tay đúng chừng này */
export const DARIUS_RECALL_MS = 460
/** Một lượt khói trên lá R đang chờ */
export const DARIUS_WAIT_MS = 1000
/** Tần số thả mảnh dọc nhát chém */
const TRAIL_STEP_MS = 22

const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
const stacksOf = (ctx: VfxCtx) => Math.max(1,
    Math.min(10,
        ctx.amount ?? 1))
const around = (at: Pt, rx: number, ry = rx): Pt => {
    const a = rand(0,
            TAU), d = Math.sqrt(Math.random())
    return {
        x: at.x + Math.cos(a) * d * rx, y: at.y + Math.sin(a) * d * ry
    }
}
const offset = (at: Pt, angle: number, d: number): Pt => ({
    x: at.x + Math.cos(angle) * d, y: at.y + Math.sin(angle) * d
})
/** Điểm mất khỏi màn hình: cue đã thả thì ngưng rỉ ngay, không chờ hết lượt */
const GONE: Pt = {
    x: -4000, y: -4000
}

/** Rìu Noxus nhìn ngang: cán sang trái, lưỡi trăng khuyết hướng xuống. Vật thể vẽ sẵn, không phải nét hình học */
function axeTexture(): Texture {
    const W = 410, H = 240
    const c = document.createElement("canvas")
    c.width = W
    c.height = H
    const g = c.getContext("2d")
    if (g) {
        g.shadowColor = "rgba(20,0,4,.9)"
        g.shadowBlur = 8
        const haft = g.createLinearGradient(0,
            52,
            0,
            76)
        haft.addColorStop(0,
            "#6a4a3e")
        haft.addColorStop(.5,
            "#2b1a18")
        haft.addColorStop(1,
            "#0d0708")
        g.fillStyle = haft
        g.beginPath()
        g.roundRect(4,
            54,
            340,
            20,
            6)
        g.fill()
        g.shadowBlur = 0
        g.fillStyle = "#b98a3e"
        for (const x of [40,
            150,
            232]) g.fillRect(x,
            52,
            9,
            24)
        // chóp nhọn sau lưng lưỡi
        g.fillStyle = "#3a3e47"
        g.beginPath()
        g.moveTo(272,
            56)
        g.lineTo(316,
            56)
        g.lineTo(300,
            8)
        g.closePath()
        g.fill()
        // lưỡi trăng khuyết
        const steel = g.createLinearGradient(0,
            60,
            0,
            206)
        steel.addColorStop(0,
            "#1f2127")
        steel.addColorStop(.45,
            "#5a616c")
        steel.addColorStop(.74,
            "#b2bac4")
        steel.addColorStop(1,
            "#ffffff")
        g.fillStyle = steel
        g.shadowColor = "rgba(255,40,50,.75)"
        g.shadowBlur = 14
        g.beginPath()
        g.moveTo(262,
            56)
        g.lineTo(326,
            56)
        g.quadraticCurveTo(344,
            120,
            404,
            150)
        g.quadraticCurveTo(306,
            256,
            186,
            160)
        g.quadraticCurveTo(252,
            124,
            262,
            56)
        g.closePath()
        g.fill()
        g.shadowBlur = 0
        // gân đỏ Noxus trong lưỡi
        g.fillStyle = "#b00d20"
        g.beginPath()
        g.moveTo(282,
            72)
        g.lineTo(312,
            72)
        g.quadraticCurveTo(322,
            124,
            354,
            148)
        g.quadraticCurveTo(300,
            176,
            238,
            146)
        g.quadraticCurveTo(276,
            124,
            282,
            72)
        g.closePath()
        g.fill()
        g.fillStyle = "#1a0a0d"
        g.beginPath()
        g.moveTo(292,
            96)
        g.lineTo(302,
            96)
        g.lineTo(297,
            142)
        g.closePath()
        g.fill()
    }
    return Texture.from(c)
}

let axe: Texture | undefined
const axeTex = () => (axe ??= axeTexture())

function axeSprite(layer: Container, width: number, anchorX: number, anchorY: number) {
    const tex = axeTex()
    const s = new Sprite(tex)
    s.anchor.set(anchorX,
        anchorY)
    s.scale.set(width / tex.width)
    s.alpha = 0
    layer.addChild(s)
    return s
}

/** Giọt máu đặc: không cộng màu nên đọc rõ trên nền sáng, có trọng lực */
const droplets = (over: Partial<DustOpts> = {
}): DustOpts => ({
    color: [BLOOD,
        CRIMSON,
        GORE,
        SCARLET], speed: [120,
        720], gravity: 980, drag: 1.5, flow: 18, life: [340,
        760], size: [11,
        3], alpha: 1, additive: false, ...over
})
/** Mảnh thép sắc pha đỏ */
const shards = (over: Partial<DustOpts> = {
}): DustOpts => ({
    blade: true, color: [WHITE,
        STEEL,
        SCARLET,
        CRIMSON], speed: [240,
        1050], drag: 2.6, flow: 14, life: [200,
        460], size: [58,
        12], alpha: 1, ...over
})
/** Sương đỏ máu đặc, phủ được nền */
const bloodMist = (at: Pt, layer: Container, size: number, count = 12, alpha = .62) => mist(layer,
    at,
    {
        color: [BLOOD,
            GORE,
            CLOT], size, count, alpha, additive: false, speed: [30,
            140], life: [560,
            1100]
    })

/** Nhát cắt sắc: mảnh thép xếp dọc đường cắt, bay về hai đầu */
function cutLine(layer: Container, at: Pt, angle: number, length: number, count = 90) {
    const steps = 9
    return Promise.all(Array.from({
        length: steps
    },
    (_, i) => {
        const t = i / (steps - 1) - .5
        const flip = t < 0 ? Math.PI : 0
        return dustBurst(layer,
            offset(at,
                angle,
                t * length),
            {
                ...shards({
                    color: [WHITE,
                        WHITE,
                        STEEL,
                        SCARLET], angle: [angle + flip - .05,
                        angle + flip + .05], speed: [300,
                        1200], size: [78,
                        16], life: [130,
                        300], drag: 3
                }), count: Math.round(count / steps)
            })
    }))
}

/** Cú chém trúng: ánh thép trắng, máu toé, sương đỏ */
function cleave(ctx: VfxCtx, at: Pt, power: number, cutAngle: number) {
    return Promise.all([
        bloom(ctx.layer,
            at,
            WHITE,
            260 * power,
            220),
        bloom(ctx.layer,
            at,
            SCARLET,
            520 * power,
            340),
        cutLine(ctx.layer,
            at,
            cutAngle,
            330 * power),
        dustBurst(ctx.layer,
            at,
            {
                ...shards(),
                count: Math.round(130 * power), spread: 26
            }),
        dustBurst(ctx.layer,
            at,
            {
                ...droplets({
                    speed: [40,
                        980], size: [12,
                        3]
                }), count: Math.round(420 * power), spread: 58
            }),
        bloodMist(at,
            ctx.layer,
            230 * power,
            8,
            .4)
    ])
}

/** Chờ tới khi `done`, gọi `each` mỗi khung; layer huỷ thì tự thoát */
function until(ctx: VfxCtx, done: (elapsed: number) => boolean, each: (elapsed: number) => void) {
    return new Promise<void>((resolve) => {
        let elapsed = 0
        let ended = false
        const finish = () => {
            if (ended) return
            ended = true
            ctx.app.ticker.remove(tick)
            ctx.layer.off("destroyed",
                finish)
            resolve()
        }
        const tick = (ticker: Ticker) => {
            if (ctx.layer.destroyed) return finish()
            elapsed += ticker.deltaMS
            each(elapsed)
            if (done(elapsed)) finish()
        }
        ctx.layer.once("destroyed",
            finish)
        ctx.app.ticker.add(tick)
    })
}

/** Mở màn Q, E: máu rút về Darius, lưỡi rìu loé, báo nhịp đúng lúc nhấc xong */
registerVfx("dariusAxeRaise",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        await Promise.all([
            bloom(ctx.layer,
                at,
                CRIMSON,
                420 * k,
                RAISE_MS + 120),
            dustStream(ctx.layer,
                () => around(at,
                    190 * k),
                RAISE_MS,
                1500,
                {
                    color: [SCARLET,
                        CRIMSON,
                        PINK], speed: [10,
                        50], flow: 80, life: [130,
                        280], size: [9,
                        2], alpha: 1
                }),
            dustStream(ctx.layer,
                () => around(at,
                    70 * k,
                    90 * k),
                RAISE_MS,
                520,
                {
                    ...droplets({
                        speed: [80,
                            300], angle: [-Math.PI * .85,
                            -Math.PI * .15], gravity: 520, life: [260,
                            480], size: [9,
                            2]
                    })
                }),
            tween(RAISE_MS,
                () => {},
                ease.linear,
                ctx.layer).then(() => ctx.onBeat?.())
        ])
    })

/** Q: rìu lớn hiện ngay tại mục tiêu, quét một cung rộng qua lá. Lưỡi đi tới đâu mảnh thép và máu vạch tới đó; đúng giữa cung là nhịp trúng */
registerVfx("dariusDecimate",
    async (ctx) => {
        const k = kOf(ctx)
        const target = ctx.to[0] ?? ctx.from
        const len = AXE_LEN * k
        const back = Math.hypot(ctx.from.x - target.x,
            ctx.from.y - target.y) > 1 ? Math.atan2(ctx.from.y - target.y,
                ctx.from.x - target.x) : Math.PI / 2
        const mid = back + Math.PI
        const pivot = offset(target,
            back,
            len * .7)
        const sprite = axeSprite(ctx.layer,
            len,
            .03,
            .27)
        sprite.x = pivot.x
        sprite.y = pivot.y
        const start = mid - SWEEP_BACK, total = SWEEP_BACK + SWEEP_ON
        const contactAt = SWEEP_BACK / total
        let hit = false
        let dropped = 0
        const tails: Promise<unknown>[] = []
        const trail = (angle: number) => {
            const head = offset(pivot,
                angle,
                len * .84)
            const tangent = angle + Math.PI / 2
            tails.push(dustBurst(ctx.layer,
                around(head,
                    46 * k),
                {
                    ...shards({
                        angle: [tangent - .22,
                            tangent + .22], speed: [120,
                            520], size: [64,
                            14], life: [150,
                            320]
                    }), count: 11
                }),
            dustBurst(ctx.layer,
                head,
                {
                    color: [SCARLET,
                        CRIMSON,
                        WHITE], angle: [tangent - .3,
                        tangent + .3], speed: [60,
                        320], flow: 40, drag: 2.4, life: [200,
                        420], size: [13,
                        4], streak: 4, alpha: 1, spread: 40 * k, count: 34
                }),
            dustBurst(ctx.layer,
                head,
                {
                    ...droplets({
                        angle: [angle - .4,
                            angle + .4], speed: [120,
                            460]
                    }), count: 12, spread: 30 * k
                }))
        }
        await tween(SWING_MS,
            (t) => {
                if (sprite.destroyed) return
                const e = Math.pow(t,
                    2.1)
                const angle = start + e * total
                sprite.rotation = angle
                sprite.alpha = Math.min(1,
                    t * 6) * (t > .84 ? (1 - t) / .16 : 1)
                const steps = Math.floor(t * SWING_MS / TRAIL_STEP_MS)
                if (steps > dropped) {
                    dropped = steps
                    if (e > .05 && t < .96) trail(angle)
                }
                if (!hit && e >= contactAt) {
                    hit = true
                    ctx.shake(9,
                        220)
                    ctx.onBeat?.()
                }
            },
            ease.linear,
            ctx.layer)
        if (!hit) ctx.onBeat?.()
        if (!sprite.destroyed) sprite.destroy()
        await Promise.all(tails)
    })

/** Q trúng: máu và thép toé theo hướng lưỡi quét */
registerVfx("dariusCleaveHit",
    async (ctx) => {
        await cleave(ctx,
            ctx.from,
            1.2 * kOf(ctx),
            -.16)
    })

/** Q tự hồi: máu từ mục tiêu chảy về Darius, sương đỏ cuộn lên quanh lá. from là mục tiêu, to[0] là Darius; ctx.amount là số Chảy Máu */
registerVfx("dariusBloodDrain",
    async (ctx) => {
        const home = ctx.to[0] ?? ctx.from
        const n = stacksOf(ctx)
        const power = 1 + n * .08
        let head = {
            ...ctx.from
        }
        await Promise.all([
            bloom(ctx.layer,
                home,
                SCARLET,
                420 * power,
                460),
            bloodMist(home,
                ctx.layer,
                170 * power,
                10,
                .5),
            dustBurst(ctx.layer,
                home,
                {
                    color: [SCARLET,
                        PINK,
                        0xffd0c0,
                        CRIMSON], speed: [30,
                        180], gravity: -240, drag: 1.2, flow: 70, life: [420,
                        860], size: [10,
                        3], alpha: 1, spread: 74, count: Math.round(320 * power)
                }),
            tween(420,
                (t) => {
                    head = {
                        x: lerp(ctx.from.x,
                            home.x,
                            t), y: lerp(ctx.from.y,
                            home.y,
                            t)
                    }
                },
                ease.inOut,
                ctx.layer),
            dustStream(ctx.layer,
                () => around(head,
                    26),
                420,
                1500,
                {
                    color: [SCARLET,
                        CRIMSON,
                        PINK], speed: [10,
                        70], flow: 50, life: [220,
                        440], size: [12,
                        3], alpha: 1
                }),
            dustStream(ctx.layer,
                () => around(head,
                    20),
                420,
                520,
                droplets({
                    speed: [10,
                        60], gravity: 160, life: [240,
                        460], size: [12,
                        3]
                }))
        ])
    })

/**
 * E: rìu quét một hình nón về mục tiêu rồi móc lưỡi vào sau lá.
 * Không tether: móc xong là báo nhịp, giữ một thoáng rồi tan. Có tether (lá thật đang bị kéo): móc xong báo contact, bám theo lá tới khi released.
 */
registerVfx("dariusApprehend",
    async (ctx) => {
        const k = kOf(ctx)
        const first = ctx.tether?.target() ?? ctx.to[0] ?? ctx.from
        const aim = Math.atan2(first.y - ctx.from.y,
            first.x - ctx.from.x)
        const length = AXE_LEN * k
        const sprite = axeSprite(ctx.layer,
            length,
            .03,
            .27)
        const place = (at: Pt) => {
            const angle = Math.atan2(at.y - ctx.from.y,
                at.x - ctx.from.x)
            const pivot = offset(at,
                angle + Math.PI,
                length * .62)
            sprite.x = pivot.x
            sprite.y = pivot.y
            sprite.rotation = angle + .34
        }
        const tails: Promise<unknown>[] = [
            dustBurst(ctx.layer,
                ctx.from,
                {
                    color: [SCARLET,
                        CRIMSON,
                        PINK], angle: [aim - .42,
                        aim + .42], speed: [320,
                        1300], drag: 1.4, flow: 40, life: [220,
                        440], size: [14,
                        4], streak: 4, alpha: 1, spread: 30, count: 420
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...shards({
                        angle: [aim - .36,
                            aim + .36], speed: [420,
                            1400], drag: 1.8, life: [200,
                            380]
                    }), count: 90, spread: 24
                })
        ]
        let hooked = false
        const hook = () => {
            if (hooked) return
            hooked = true
            ctx.shake(5,
                140)
            if (ctx.tether) ctx.tether.contact()
            else ctx.onBeat?.()
        }
        let dropped = 0
        await until(ctx,
            elapsed => (ctx.tether ? hooked && ctx.tether.released() || elapsed > HOOK_MAX_MS : elapsed > REACH_MS + HOOK_HOLD_MS),
            (elapsed) => {
                const at = ctx.tether?.target() ?? first
                if (!sprite.destroyed) {
                    place(at)
                    sprite.alpha = Math.min(1,
                        elapsed / REACH_MS)
                }
                if (elapsed >= REACH_MS) hook()
                const steps = Math.floor(elapsed / 40)
                if (steps <= dropped) return
                dropped = steps
                // dải máu căng từ Darius tới lưỡi móc, theo lá đang chạy
                for (let i = 0; i < 3; i++) {
                    const t = Math.random()
                    const on = {
                        x: lerp(ctx.from.x,
                            at.x,
                            t), y: lerp(ctx.from.y,
                            at.y,
                            t)
                    }
                    tails.push(dustBurst(ctx.layer,
                        on,
                        {
                            color: [SCARLET,
                                CRIMSON,
                                BLOOD], angle: [aim - .1,
                                aim + .1], speed: [40,
                                260], flow: 20, life: [160,
                                320], size: [13,
                                4], streak: 3, alpha: 1, spread: 16, count: 26
                        }))
                }
            })
        hook()
        await tween(160,
            (t) => {
                if (!sprite.destroyed) sprite.alpha = 1 - t
            },
            ease.linear,
            ctx.layer)
        if (!sprite.destroyed) sprite.destroy()
        await Promise.all(tails)
    })

/** E trúng: lưỡi móc xé vào lá vừa kéo tới */
registerVfx("dariusApprehendHit",
    async (ctx) => {
        await cleave(ctx,
            ctx.from,
            kOf(ctx),
            .9)
    })

/** R mở màn: Darius lấy đà, máu bốc ngược lên trời, báo nhịp đúng lúc rìu bắt đầu rơi */
registerVfx("dariusGuillotineLeap",
    async (ctx) => {
        /** Lá Darius đang chạy khi đổi chỗ: hiệu ứng bám theo lá nếu có tether */
        const at = ctx.from
        const pt = () => ctx.tether?.target() ?? at
        ctx.shake(4,
            DARIUS_LEAP_MS)
        await Promise.all([
            bloom(ctx.layer,
                at,
                SCARLET,
                640,
                DARIUS_LEAP_MS + 200),
            bloodMist(at,
                ctx.layer,
                260,
                16,
                .6),
            dustStream(ctx.layer,
                () => around(pt(),
                    70,
                    60),
                DARIUS_LEAP_MS,
                800,
                {
                    color: [SCARLET,
                        CRIMSON,
                        CRIMSON,
                        BLOOD], angle: [-Math.PI / 2 - .16,
                        -Math.PI / 2 + .16], speed: [120,
                        1100], drag: .8, flow: 24, life: [220,
                        440], size: [13,
                        4], streak: 5, alpha: 1
                }),
            dustStream(ctx.layer,
                () => around(pt(),
                    70),
                DARIUS_LEAP_MS,
                170,
                shards({
                    angle: [-Math.PI / 2 - .2,
                        -Math.PI / 2 + .2], speed: [320,
                        900], life: [200,
                        380]
                })),
            tween(DARIUS_LEAP_MS,
                () => {},
                ease.linear,
                ctx.layer).then(() => ctx.onBeat?.())
        ])
    })

/** R: lưỡi rìu khổng lồ rơi thẳng từ trên xuống như máy chém, cắm vào lá. Chạm là báo nhịp, tia trắng xẻ dọc */
registerVfx("dariusGuillotine",
    async (ctx) => {
        const target = ctx.to[0] ?? ctx.from
        const width = GUILLOTINE_LEN * Math.min(1.15,
            kOf(ctx) * .82)
        const sprite = axeSprite(ctx.layer,
            width,
            .74,
            .86)
        sprite.rotation = -.12
        const halo = makeSprite(ctx.layer,
            "glow",
            target.x,
            target.y - DROP_HEIGHT,
            SCARLET,
            width * 1.1)
        const edge = {
            x: target.x, y: target.y - DROP_HEIGHT
        }
        const lower = (y: number) => {
            edge.y = y
            if (!sprite.destroyed) {
                sprite.x = target.x
                sprite.y = y
            }
            if (!halo.destroyed) {
                halo.x = target.x
                halo.y = y - width * .16
            }
        }
        lower(edge.y)
        const tails: Promise<unknown>[] = [
            dustStream(ctx.layer,
                () => around(target,
                    150,
                    110),
                DROP_MS,
                34,
                {
                    puff: true, color: [BLOOD,
                        GORE,
                        CLOT], speed: [6,
                        30], flow: 24, life: [460,
                        820], size: [90,
                        170], alpha: .56, additive: false
                }),
            dustStream(ctx.layer,
                () => around(edge,
                    width * .36,
                    40),
                DROP_MS,
                2300,
                {
                    color: [SCARLET,
                        CRIMSON,
                        WHITE], angle: [-Math.PI / 2 - .05,
                        -Math.PI / 2 + .05], speed: [160,
                        520], drag: 1, flow: 16, life: [200,
                        420], size: [16,
                        4], streak: 6, alpha: 1
                }),
            dustStream(ctx.layer,
                () => around(edge,
                    width * .3,
                    30),
                DROP_MS,
                420,
                shards({
                    angle: [-Math.PI / 2 - .08,
                        -Math.PI / 2 + .08], speed: [120,
                        420], life: [180,
                        340]
                }))
        ]
        await tween(DROP_MS,
            (t) => {
                lower(target.y - DROP_HEIGHT * (1 - Math.pow(t,
                    1.7)))
                if (!sprite.destroyed) sprite.alpha = Math.min(1,
                    t * 5)
                if (!halo.destroyed) halo.alpha = .3 * Math.min(1,
                    t * 4)
            },
            ease.linear,
            ctx.layer)
        ctx.onBeat?.()
        ctx.shake(15,
            460)
        const shaft = makeSprite(ctx.layer,
            "spark",
            target.x,
            target.y - 120,
            WHITE,
            16)
        shaft.rotation = Math.PI / 2
        shaft.width = 1500
        shaft.height = 64
        tails.push(cutLine(ctx.layer,
            target,
            Math.PI / 2,
            520,
            150),
        tween(320,
            (t) => {
                if (shaft.destroyed) return
                shaft.alpha = Math.pow(1 - t,
                    1.4)
                shaft.height = 64 * (1 - t * .7)
            },
            ease.linear,
            ctx.layer).then(() => { if (!shaft.destroyed) shaft.destroy() }))
        await tween(EMBED_MS,
            (t) => {
                lower(target.y + 34 * Math.min(1,
                    t * 6))
                const fade = t > .7 ? (1 - t) / .3 : 1
                if (!sprite.destroyed) sprite.alpha = fade
                if (!halo.destroyed) halo.alpha = .14 * fade
            },
            ease.linear,
            ctx.layer)
        if (!sprite.destroyed) sprite.destroy()
        if (!halo.destroyed) halo.destroy()
        await Promise.all(tails)
    })

/** R trúng: mọi Chảy Máu bị xé ra một lúc, máu phun theo số tầng. ctx.amount là số tầng vừa tiêu */
registerVfx("dariusGuillotineHit",
    async (ctx) => {
        const at = ctx.from
        const power = 1 + stacksOf(ctx) * .09
        await Promise.all([
            bloom(ctx.layer,
                at,
                WHITE,
                300 * power,
                200),
            bloom(ctx.layer,
                at,
                SCARLET,
                620 * power,
                420),
            bloodMist(at,
                ctx.layer,
                220 * power,
                12,
                .5),
            dustBurst(ctx.layer,
                at,
                {
                    ...droplets({
                        speed: [200,
                            1120], size: [13,
                            3], life: [420,
                            900]
                    }), count: Math.round(900 * power), spread: 44
                }),
            dustBurst(ctx.layer,
                at,
                {
                    ...shards({
                        speed: [160,
                            1250], size: [60,
                            12]
                    }), count: Math.round(80 * power), spread: 60
                })
        ])
    })

/** R hạ gục: máu dội lên một cột, sương đen đỏ tràn ra hai bên */
registerVfx("dariusExecute",
    async (ctx) => {
        const at = ctx.from
        ctx.shake(10,
            320)
        await Promise.all([
            bloom(ctx.layer,
                at,
                CRIMSON,
                760,
                560),
            dustBurst(ctx.layer,
                at,
                {
                    ...droplets({
                        angle: [-Math.PI / 2 - .22,
                            -Math.PI / 2 + .22], speed: [500,
                            1500], gravity: 1300, drag: .9, size: [14,
                            4], life: [520,
                            1000]
                    }), count: 620, spread: 34
                }),
            ...[-1,
                1].map(side => dustBurst(ctx.layer,
                at,
                {
                    count: 18, puff: true, color: [GORE,
                        CLOT,
                        BLOOD], angle: side > 0 ? [-.2,
                        .2] : [Math.PI - .2,
                        Math.PI + .2], speed: [160,
                        520], drag: 1.6, flow: 26, life: [620,
                        1200], size: [70,
                        150], alpha: .46, additive: false, spread: 40
                }))
        ])
    })

/** Lá R bay về tay kéo một vệt máu. Có tether thì bám theo lá thật, không thì tự đi from tới to[0] */
registerVfx("dariusRecall",
    async (ctx) => {
        const goal = ctx.to[0] ?? ctx.from
        let head = {
            ...ctx.from
        }
        const pt = () => ctx.tether?.target() ?? head
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                SCARLET,
                420,
                360),
            tween(DARIUS_RECALL_MS,
                (t) => {
                    head = {
                        x: lerp(ctx.from.x,
                            goal.x,
                            t), y: lerp(ctx.from.y,
                            goal.y,
                            t)
                    }
                },
                ease.inOut,
                ctx.layer),
            dustStream(ctx.layer,
                () => around(pt(),
                    30),
                DARIUS_RECALL_MS,
                1500,
                {
                    color: [SCARLET,
                        CRIMSON,
                        WHITE], speed: [10,
                        80], flow: 60, life: [220,
                        460], size: [12,
                        3], alpha: 1
                }),
            dustStream(ctx.layer,
                () => around(pt(),
                    24),
                DARIUS_RECALL_MS,
                360,
                droplets({
                    speed: [10,
                        70], gravity: 620, life: [260,
                        520]
                })),
            dustStream(ctx.layer,
                pt,
                DARIUS_RECALL_MS,
                36,
                {
                    puff: true, color: [BLOOD,
                        GORE], speed: [6,
                        30], flow: 20, life: [320,
                        620], size: [50,
                        110], alpha: .46, additive: false
                })
        ])
    })

/** Lá R đang chờ về tay: khói đỏ đen và tàn sắt bốc lên quanh lá. ctx.amount là số đơn vị còn lại, cue nối theo DARIUS_WAIT_MS */
registerVfx("dariusRecallWait",
    async (ctx) => {
        const n = stacksOf(ctx)
        const pt = () => (ctx.tether?.released() ? GONE : ctx.tether?.target() ?? ctx.from)
        const rate = 90 + n * 50
        await Promise.all([
            dustStream(ctx.layer,
                () => around(pt(),
                    54,
                    70),
                DARIUS_WAIT_MS,
                rate,
                {
                    color: [SCARLET,
                        CRIMSON,
                        PINK], speed: [10,
                        50], gravity: -160, flow: 44, life: [420,
                        800], size: [8,
                        2], alpha: 1
                }),
            dustStream(ctx.layer,
                () => around(pt(),
                    46,
                    60),
                DARIUS_WAIT_MS,
                7,
                {
                    puff: true, color: [GORE,
                        CLOT,
                        BLOOD], speed: [6,
                        30], gravity: -60, flow: 22, life: [520,
                        900], size: [50,
                        110], alpha: .24, additive: false
                })
        ])
    })

/** Một tầng Chảy Máu cắm vào: máu vọt lên khỏi lá, tầng càng cao càng mạnh. ctx.amount là số tầng mới */
registerVfx("dariusBleedMark",
    async (ctx) => {
        const n = stacksOf(ctx)
        const power = 1 + n * .1
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                CRIMSON,
                280 * power,
                300),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...droplets({
                        angle: [-Math.PI * .9,
                            -Math.PI * .1], speed: [160,
                            620]
                    }), count: Math.round(200 * power), spread: 34
                }),
            bloodMist(ctx.from,
                ctx.layer,
                120 * power,
                7,
                .5)
        ])
    })

/** Máu rỉ trên nạn nhân: giọt chảy dọc lá, sương đỏ bám quanh, dày theo số tầng. ctx.amount là số tầng; có tether thì theo lá thật và ngưng ngay khi released */
registerVfx("dariusBleedAura",
    async (ctx) => {
        const n = stacksOf(ctx)
        const pt = () => (ctx.tether?.released() ? GONE : ctx.tether?.target() ?? ctx.from)
        await Promise.all([
            dustStream(ctx.layer,
                () => around(pt(),
                    60,
                    78),
                DARIUS_BLEED_MS,
                48 + n * 36,
                {
                    ...droplets({
                        speed: [0,
                            30], gravity: 620, drag: 1, flow: 8, life: [340,
                            640], size: [13,
                            5], streak: 2.6
                    })
                }),
            dustStream(ctx.layer,
                () => around(pt(),
                    64,
                    82),
                DARIUS_BLEED_MS,
                40 + n * 30,
                {
                    color: [SCARLET,
                        CRIMSON], speed: [8,
                        40], flow: 50, life: [260,
                        520], size: [8,
                        2], alpha: .9
                }),
            dustStream(ctx.layer,
                () => around(pt(),
                    58,
                    74),
                DARIUS_BLEED_MS,
                3 + n,
                {
                    puff: true, color: [BLOOD,
                        GORE], speed: [4,
                        24], gravity: 22, flow: 18, life: [520,
                        900], size: [50,
                        104], alpha: Math.min(.36,
                        .17 + n * .03), additive: false
                })
        ])
    })

/** Đầu lượt: mỗi tầng một vết phun máu trên chính nạn nhân, không có đạn. ctx.amount là số tầng */
registerVfx("dariusBleedTick",
    async (ctx) => {
        const n = stacksOf(ctx)
        ctx.onBeat?.()
        ctx.shake(3 + n * .6,
            180)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                CRIMSON,
                300 + n * 34,
                340),
            bloodMist(ctx.from,
                ctx.layer,
                140 + n * 18,
                8 + n,
                .58),
            ...Array.from({
                length: n
            },
            () => {
                const spot = around(ctx.from,
                    56,
                    76)
                const a = rand(-Math.PI * .85,
                    -Math.PI * .15)
                return dustBurst(ctx.layer,
                    spot,
                    {
                        ...droplets({
                            angle: [a - .32,
                                a + .32], speed: [240,
                                820], size: [12,
                                3]
                        }), count: 110
                    })
            })
        ])
    })

/** Tướng mang chết: nửa số tầng văng khỏi lá. ctx.amount là số tầng mất */
registerVfx("dariusBleedShed",
    async (ctx) => {
        const n = stacksOf(ctx)
        await Promise.all([
            bloodMist(ctx.from,
                ctx.layer,
                170,
                12,
                .56),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...droplets({
                        speed: [180,
                            760], gravity: 760
                    }), count: 130 + n * 70, spread: 48
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    color: [SCARLET,
                        CRIMSON], speed: [60,
                        300], flow: 90, life: [380,
                        760], size: [8,
                        2], alpha: .9, spread: 56, count: 160
                })
        ])
    })

/** Hết thời hạn: vết máu khô lại thành khói sẫm rồi tan, không có sát thương */
registerVfx("dariusBleedFade",
    async (ctx) => {
        await Promise.all([
            mist(ctx.layer,
                ctx.from,
                {
                    color: [GORE,
                        CLOT,
                        0x4a3034], size: 190, count: 14, alpha: .5, additive: false, speed: [10,
                        60], gravity: -70, life: [640,
                        1200]
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    color: [GORE,
                        BLOOD,
                        0x5a3a3e], speed: [14,
                        80], gravity: -110, flow: 40, life: [520,
                        1000], size: [7,
                        2], alpha: .9, spread: 70, count: 220, additive: false
                })
        ])
    })
