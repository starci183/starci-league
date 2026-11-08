// VFX riêng của Yorick, chất liệu HỒN MA QUẦN ĐẢO BÓNG ĐÊM: sương đen, lửa hồn xanh ngọc, đất mộ, sắt rỉ. Ma Sương là thân người dựng hoàn toàn bằng hạt, không có nét vẽ.
// Đòn cận chiến luôn đáp tại mục tiêu. Mỗi hiệu ứng chỉ dựa vào VfxCtx và tự dọn khi layer bị huỷ; trúng là báo ctx.onBeat, không chờ đuôi hạt tan.
import {
    Assets, Sprite, Texture
} from "pixi.js"
import {
    bloom, dustBurst, dustStream, mist, type DustOpts
} from "./fx_dust"
import {
    ease, lerp, rand, sleep, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const TAU = Math.PI * 2
const WHITE = 0xffffff
const PALE = 0xd2fff2
const SOUL = 0x4dffd2
const GHOST = 0x1fd9b6
const DEEP = 0x0f8a8a
const BLUE = 0x2f86c4
const INK = 0x06161d
const SOOT = 0x0d2a30
const IRON = 0x9fc7c4
const RUST = 0x5b4a3c
const EARTH = [0x7a5e40,
    0x4a3524,
    0x2e2118]
const SOULS = [SOUL,
    GHOST,
    PALE]
const CARD_BACK = "/ui/card_back.png"
/** Ô lá trên bàn; hào quang ôm sát mép lá */
const CARD_RX = 68
const CARD_RY = 102
/** Chiều cao thân Ma Sương theo bậc Tiến Hoá */
const MAIDEN_H = 250
const MAIDEN_STEP = 96
/** Quãng phát của hào quang bám lá; demo và trận nối lần phát mới trước khi hết */
export const YORICK_RELAY_MS = 9500
const AURA_TICK_MS = 500

const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
const tierOf = (ctx: VfxCtx) => Math.max(0,
    Math.min(4,
        ctx.amount ?? 0))
const maidenHeight = (tier: number) => MAIDEN_H + tier * MAIDEN_STEP
const beatOnce = (ctx: VfxCtx) => {
    let done = false
    return () => {
        if (done) return
        done = true
        ctx.onBeat?.()
    }
}
const anchorOf = (ctx: VfxCtx) => ctx.tether?.target() ?? ctx.from

/** Điểm bám lá: dày ở chân và hai mép, hạt bay lên thành lửa hồn chứ không thành vòng */
function clingPoint(at: Pt, grow: number): Pt {
    if (Math.random() < .6) return {
        x: at.x + rand(-CARD_RX,
            CARD_RX) * grow,
        y: at.y + CARD_RY * grow * rand(.3,
            1.04)
    }
    return {
        x: at.x + (Math.random() < .5 ? -1 : 1) * CARD_RX * grow * rand(.7,
            1.12),
        y: at.y + rand(-.8,
            1) * CARD_RY * grow
    }
}

/** Chân Ma Sương: bà đứng cạnh lá ở ô phụ để lá vẫn đọc được */
const maidenFeet = (at: Pt): Pt => ({
    x: at.x - 138, y: at.y + 92
})

/** Bề ngang thân Ma Sương theo độ cao v (0 gót, 1 đỉnh đầu), tính theo chiều cao: váy xoè, eo nhỏ, vai rộng, khăn trùm */
function bodyWidth(v: number): number {
    if (v < .62) return lerp(.27,
        .085,
        Math.pow(v / .62,
            .7))
    if (v < .76) return lerp(.085,
        .15,
        (v - .62) / .14)
    if (v < .82) return lerp(.15,
        .06,
        (v - .76) / .06)
    return .085 * Math.sqrt(Math.max(.05,
        1 - Math.pow((v - .9) / .1,
            2)))
}

/** Điểm ngẫu nhiên trên thân; đuôi váy lay theo đồng hồ */
function bodyPoint(base: Pt, h: number, clock: number): Pt {
    const v = Math.pow(Math.random(),
        .82)
    const sway = Math.sin(v * 5 + clock * 2.4) * (1 - v) * h * .05
    return {
        x: base.x + rand(-1,
            1) * bodyWidth(v) * h + sway,
        y: base.y - v * h
    }
}

/** Hai cánh tay giơ ra như đang gọi hồn; khăn voan rủ theo cánh tay */
function armPoint(base: Pt, h: number, clock: number): Pt {
    const side = Math.random() < .5 ? -1 : 1
    const u = Math.random()
    const lift = .74 + u * .17 + Math.sin(clock * 2 + side) * .012
    return {
        x: base.x + side * (.13 + u * .27) * h + rand(-1,
            1) * .02 * h,
        y: base.y - lift * h + Math.random() * (1 - u) * .16 * h
    }
}

interface MaidenOpts {
    getBase: () => Pt;
    getHeight: () => number;
    ms: number;
    /** Hệ số mật độ hạt */
    density?: number;
    /** Độ đậm 0..1 */
    alpha?: number;
}

/** Thân Ma Sương: lõi trắng ngọc, thân xanh hồn, voan rũ, tóc sương toả lên; mặt là khoảng tối */
function maidenBody(ctx: VfxCtx, o: MaidenOpts) {
    const l = ctx.layer
    const density = o.density ?? 1
    const alpha = o.alpha ?? 1
    let clock = rand(0,
        9)
    const body = () => bodyPoint(o.getBase(),
        o.getHeight(),
        clock)
    const arms = () => armPoint(o.getBase(),
        o.getHeight(),
        clock)
    const face = () => {
        const b = o.getBase(), h = o.getHeight()
        return {
            x: b.x + rand(-.035,
                .035) * h, y: b.y - h * rand(.87,
                .93)
        }
    }
    const crown = () => {
        const b = o.getBase(), h = o.getHeight()
        return {
            x: b.x + rand(-.1,
                .1) * h, y: b.y - h * rand(.92,
                1)
        }
    }
    const hem = () => {
        const b = o.getBase(), h = o.getHeight()
        return {
            x: b.x + rand(-.34,
                .34) * h, y: b.y + rand(-.04,
                .05) * h
        }
    }
    return Promise.all([
        tween(o.ms,
            (t) => { clock = t * o.ms / 1000 },
            ease.linear,
            l),
        dustStream(l,
            hem,
            o.ms,
            70 * density,
            {
                puff: true, color: [GHOST,
                    DEEP,
                    SOOT], speed: [8,
                    40], gravity: -28, life: [420,
                    860], size: [46,
                    96], alpha: .34 * alpha, flow: 22, additive: false
            }),
        dustStream(l,
            body,
            o.ms,
            52 * density,
            {
                puff: true, color: [GHOST,
                    DEEP], speed: [2,
                    16], gravity: -22, life: [260,
                    520], size: [34,
                    70], alpha: .34 * alpha, flow: 12
            }),
        dustStream(l,
            body,
            o.ms,
            2300 * density,
            {
                color: [GHOST,
                    SOUL,
                    DEEP], speed: [2,
                    20], gravity: -36, life: [240,
                    520], size: [8,
                    2.5], alpha: .92 * alpha, flow: 16, drag: 2.2
            }),
        dustStream(l,
            body,
            o.ms,
            1300 * density,
            {
                color: [PALE,
                    WHITE,
                    SOUL], speed: [1,
                    10], life: [160,
                    340], size: [5.5,
                    2], alpha: alpha, flow: 8, drag: 3
            }),
        dustStream(l,
            arms,
            o.ms,
            1000 * density,
            {
                color: [PALE,
                    SOUL,
                    GHOST], speed: [2,
                    18], gravity: 34, life: [200,
                    460], size: [6.5,
                    2], alpha: .95 * alpha, flow: 14, drag: 2
            }),
        dustStream(l,
            crown,
            o.ms,
            420 * density,
            {
                color: [SOUL,
                    PALE], streak: 3.4, speed: [40,
                    120], angle: [-Math.PI * .72,
                    -Math.PI * .28], gravity: -60, life: [320,
                    640], size: [6,
                    1.5], alpha: .85 * alpha, flow: 30
            }),
        dustStream(l,
            face,
            o.ms,
            300 * density,
            {
                color: [INK,
                    SOOT], speed: [1,
                    6], life: [110,
                    220], size: [10,
                    6], alpha: alpha, flow: 2, additive: false
            })
    ])
}

/** Hồn bay vút lên, chấm sáng kéo vệt */
const soulWisps = (ctx: VfxCtx, at: Pt, count: number, spread: number) => dustBurst(ctx.layer,
    at,
    {
        count, color: SOULS, streak: 3, speed: [90,
            300], angle: [-Math.PI * .8,
            -Math.PI * .2], gravity: -220, drag: .9, flow: 56, life: [420,
            900], size: [7,
            2], alpha: 1, spread
    })

/** Đất mộ văng lên rồi rơi */
const graveDirt = (ctx: VfxCtx, at: Pt, count: number, power = 1) => dustBurst(ctx.layer,
    at,
    {
        count, color: EARTH, speed: [140 * power,
            440 * power], angle: [-Math.PI * .92,
            -Math.PI * .08], gravity: 900, drag: .7, flow: 10, life: [340,
            680], size: [8,
            2.5], alpha: 1, spread: 34, additive: false
    })

/** Mảnh sắt rỉ văng khỏi tướng */
const ironShards = (ctx: VfxCtx, at: Pt, count: number, power = 1) => dustBurst(ctx.layer,
    at,
    {
        count, color: [IRON,
            PALE,
            RUST], blade: true, speed: [160 * power,
            470 * power], gravity: 620, drag: .8, flow: 10, life: [360,
            760], size: [30,
            14], alpha: 1, spread: 56, additive: false
    })

/** Texture xẻng lớn của Yorick: lưỡi sắt đen viền hồn xanh như icon Q, cán gỗ bọc sắt */
function shovelTexture(): Texture {
    const W = 200, H = 460
    const c = document.createElement("canvas")
    c.width = W
    c.height = H
    const g = c.getContext("2d")
    if (g) {
        // lưỡi xẻng như icon Q: mũi nhọn, hai vai vuông vát, thắt lại ở cổ cán
        const blade = () => {
            g.beginPath()
            g.moveTo(W * .5,
                6)
            g.quadraticCurveTo(W * .74,
                44,
                W * .82,
                96)
            g.lineTo(W * .78,
                176)
            g.quadraticCurveTo(W * .66,
                206,
                W * .56,
                226)
            g.lineTo(W * .44,
                226)
            g.quadraticCurveTo(W * .34,
                206,
                W * .22,
                176)
            g.lineTo(W * .18,
                96)
            g.quadraticCurveTo(W * .26,
                44,
                W * .5,
                6)
            g.closePath()
        }
        const wood = g.createLinearGradient(W * .44,
            0,
            W * .56,
            0)
        wood.addColorStop(0,
            "#1b1411")
        wood.addColorStop(.5,
            "#4b3a2c")
        wood.addColorStop(1,
            "#120d0b")
        g.fillStyle = wood
        g.fillRect(W * .445,
            222,
            W * .11,
            H - 232)
        g.fillStyle = "#49d9bb"
        for (const y of [250,
            330,
            412]) g.fillRect(W * .43,
            y,
            W * .14,
            6)
        g.shadowColor = "#4dffd2"
        g.shadowBlur = 44
        g.fillStyle = "rgba(77,255,210,.3)"
        blade()
        g.fill()
        g.shadowBlur = 0
        const iron = g.createLinearGradient(0,
            8,
            W,
            232)
        iron.addColorStop(0,
            "#3b5a60")
        iron.addColorStop(.5,
            "#16262c")
        iron.addColorStop(1,
            "#0a1419")
        g.fillStyle = iron
        g.save()
        g.translate(W * .5,
            118)
        g.scale(1,
            1)
        g.translate(-W * .5,
            -118)
        blade()
        g.fill()
        g.restore()
        g.strokeStyle = "rgba(120,255,225,.42)"
        g.lineWidth = 3
        g.beginPath()
        g.moveTo(W * .28,
            146)
        g.quadraticCurveTo(W * .5,
            60,
            W * .72,
            146)
        g.moveTo(W * .5,
            72)
        g.lineTo(W * .5,
            202)
        g.stroke()
    }
    return Texture.from(c)
}
let shovel: Texture | undefined
const shovelTex = () => (shovel ??= shovelTexture())

async function loadTexture(url?: string): Promise<Texture | null> {
    if (!url) return null
    try {
        return await Assets.load<Texture>(url)
    } catch {
        return null
    }
}

/** Lá bài bằng sprite trong layer; huỷ theo layer */
function cardSprite(ctx: VfxCtx, tex: Texture | null, width: number, ratio: number) {
    const s = new Sprite(tex ?? Texture.WHITE)
    s.anchor.set(.5)
    s.width = width
    s.height = width * ratio
    if (!tex) s.tint = DEEP
    ctx.layer.addChild(s)
    return s
}

/** Đốt 1 lá: lá rời đỉnh bộ, cháy lửa hồn, cắm vào Mộ; chạm mộ là báo. `to[0]` = ô Mộ, ctx.icon = mặt lá nếu có */
registerVfx("yorickMillCard",
    async (ctx) => {
        const to = ctx.to[0] ?? ctx.from
        const tex = await loadTexture(ctx.icon ?? CARD_BACK)
        if (ctx.layer.destroyed) return
        const MS = 430
        const peak = {
            x: lerp(ctx.from.x,
                to.x,
                .5) - 150, y: lerp(ctx.from.y,
                to.y,
                .5)
        }
        const card = cardSprite(ctx,
            tex,
            76,
            1.4)
        let p = {
            ...ctx.from
        }
        card.position.set(p.x,
            p.y)
        const trail = Promise.all([
            dustStream(ctx.layer,
                () => p,
                MS,
                1500,
                {
                    color: SOULS, speed: [10,
                        70], gravity: -190, life: [240,
                        520], size: [8,
                        2.5], alpha: 1, spread: 30, flow: 40
                }),
            dustStream(ctx.layer,
                () => p,
                MS,
                60,
                {
                    puff: true, color: [INK,
                        SOOT], speed: [4,
                        26], gravity: -40, life: [320,
                        620], size: [44,
                        84], alpha: .55, flow: 16, additive: false
                }),
            bloom(ctx.layer,
                ctx.from,
                SOUL,
                190,
                300)
        ])
        await tween(MS,
            (u) => {
                const v = 1 - u
                p = {
                    x: v * v * ctx.from.x + 2 * v * u * peak.x + u * u * to.x,
                    y: v * v * ctx.from.y + 2 * v * u * peak.y + u * u * to.y
                }
                if (card.destroyed) return
                card.position.set(p.x,
                    p.y)
                card.rotation = u * 1.5
                card.alpha = u > .78 ? (1 - u) / .22 : 1
                card.tint = u > .25 ? lerpColor(WHITE,
                    SOUL,
                    (u - .25) / .75) : WHITE
            },
            ease.inOut,
            ctx.layer)
        if (ctx.layer.destroyed) return
        card.visible = false
        ctx.onBeat?.()
        await Promise.all([
            trail,
            bloom(ctx.layer,
                to,
                SOUL,
                240,
                340),
            mist(ctx.layer,
                to,
                {
                    color: [INK,
                        SOOT], size: 96, alpha: .55, additive: false, count: 8
                }),
            soulWisps(ctx,
                to,
                120,
                26)
        ])
    })

function lerpColor(a: number, b: number, t: number) {
    const c = (shift: number) => Math.round(lerp((a >> shift) & 255,
        (b >> shift) & 255,
        Math.min(1,
            t)))
    return (c(16) << 16) | (c(8) << 8) | c(0)
}

/** +1 Hồn Ma ngay cú trúng: hồn ùa vào Yorick, giáp hồn dày thêm. ctx.amount = số Hồn Ma mới */
registerVfx("yorickSoulGain",
    async (ctx) => {
        const n = Math.max(1,
            ctx.amount ?? 1)
        const grow = 1 + Math.min(.32,
            n * .008)
        ctx.onBeat?.()
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                SOUL,
                320 * grow,
                420),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 300, color: SOULS, speed: [60,
                        220], gravity: -150, life: [360,
                        760], size: [8,
                        2.5], alpha: 1, spread: 96 * grow, flow: 72
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 44, color: [IRON,
                        PALE,
                        SOUL], blade: true, speed: [20,
                        90], life: [360,
                        700], size: [28,
                        14], alpha: .95, spread: 88 * grow, flow: 30, additive: false
                }),
            mist(ctx.layer,
                {
                    x: ctx.from.x, y: ctx.from.y + 60
                },
                {
                    color: [GHOST,
                        DEEP], size: 170 * grow, alpha: .32, gravity: -80
                })
        ])
    })

/** Hồn Ma bám lá Yorick qua ctx.tether: càng nhiều tầng giáp hồn càng dày, mảnh sắt lượn quanh càng nhiều. ctx.amount = số Hồn Ma */
registerVfx("yorickSoulAura",
    async (ctx) => {
        const n = Math.max(1,
            ctx.amount ?? 1)
        const power = Math.min(1,
            Math.sqrt(n / 40))
        const grow = lerp(.98,
            1.26,
            power)
        const edge = () => clingPoint(anchorOf(ctx),
            grow)
        const foot = () => {
            const at = anchorOf(ctx)
            return {
                x: at.x + rand(-CARD_RX,
                    CARD_RX) * grow, y: at.y + CARD_RY * grow * rand(.72,
                    1)
            }
        }
        const live: Promise<unknown>[] = []
        const started = performance.now()
        while (!ctx.layer.destroyed && !ctx.tether?.released() && performance.now() - started < YORICK_RELAY_MS + 600) {
            live.push(dustStream(ctx.layer,
                edge,
                AURA_TICK_MS,
                lerp(170,
                    1250,
                    power),
                {
                    color: SOULS, speed: [8,
                        46], gravity: -130, life: [340,
                        720], size: [lerp(5,
                        8,
                        power),
                    2], alpha: .95, flow: 38, drag: 1.4
                }))
            live.push(dustStream(ctx.layer,
                foot,
                AURA_TICK_MS,
                lerp(5,
                    26,
                    power),
                {
                    puff: true, color: [GHOST,
                        DEEP,
                        SOOT], speed: [4,
                        24], gravity: -50, life: [520,
                        960], size: [54,
                        lerp(96,
                            170,
                            power)], alpha: lerp(.2,
                        .36,
                        power), flow: 20, additive: false
                }))
            live.push(dustStream(ctx.layer,
                edge,
                AURA_TICK_MS,
                lerp(6,
                    46,
                    power),
                {
                    color: [IRON,
                        PALE,
                        RUST], blade: true, speed: [6,
                        30], gravity: -40, life: [460,
                        860], size: [lerp(20,
                        34,
                        power),
                    12], alpha: .92, flow: 34, additive: false
                }))
            await sleep(AURA_TICK_MS)
        }
        await Promise.all(live)
    })

/** Mất một nửa khi chết: nửa số hồn tuôn khỏi Yorick, tan lên trời */
registerVfx("yorickSoulShed",
    async (ctx) => {
        ctx.onBeat?.()
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                PALE,
                340,
                460),
            soulWisps(ctx,
                ctx.from,
                520,
                120),
            ironShards(ctx,
                ctx.from,
                34,
                .8),
            mist(ctx.layer,
                ctx.from,
                {
                    color: [INK,
                        SOOT], size: 230, alpha: .55, additive: false
                })
        ])
    })

/** Mốc 20 Hồn Ma: cột hồn dựng trên Yorick, lá R thành hình rồi bay lên tay; tới tay là báo. `to[0]` = tay, ctx.icon = ảnh lá R */
registerVfx("yorickMilestone",
    async (ctx) => {
        const to = ctx.to[0] ?? ctx.from
        const tex = await loadTexture(ctx.icon)
        if (ctx.layer.destroyed) return
        const at = ctx.from
        const RISE = 560
        const FLY = 520
        ctx.shake(5,
            300)
        const column = () => ({
            x: at.x + rand(-70,
                70), y: at.y + rand(-250,
                130)
        })
        const tail = Promise.all([
            bloom(ctx.layer,
                at,
                SOUL,
                520,
                760),
            dustStream(ctx.layer,
                column,
                RISE,
                5200,
                {
                    color: SOULS, speed: [130,
                        360], angle: [-Math.PI * .56,
                        -Math.PI * .44], gravity: -240, life: [260,
                        600], size: [8,
                        2.5], alpha: 1, flow: 30
                }),
            mist(ctx.layer,
                {
                    x: at.x, y: at.y + 90
                },
                {
                    color: [GHOST,
                        DEEP,
                        SOOT], size: 260, alpha: .42, additive: false
                }),
            soulWisps(ctx,
                at,
                300,
                90)
        ])
        const card = cardSprite(ctx,
            tex,
            40,
            1)
        card.position.set(at.x,
            at.y - 40)
        await tween(RISE,
            (u) => {
                if (card.destroyed) return
                const w = lerp(40,
                    190,
                    u)
                card.width = w
                card.height = w
                card.position.set(at.x,
                    at.y - 40 - u * 90)
            },
            ease.out,
            ctx.layer)
        await sleep(200)
        if (ctx.layer.destroyed) return
        const start = {
            x: at.x, y: at.y - 130
        }
        let p = {
            ...start
        }
        const trail = dustStream(ctx.layer,
            () => p,
            FLY,
            2200,
            {
                color: SOULS, speed: [8,
                    60], gravity: -80, life: [240,
                    520], size: [8,
                    2.5], alpha: 1, spread: 54, flow: 34
            })
        await tween(FLY,
            (u) => {
                p = {
                    x: lerp(start.x,
                        to.x,
                        u), y: lerp(start.y,
                        to.y,
                        u)
                }
                if (card.destroyed) return
                const w = lerp(190,
                    110,
                    u)
                card.width = w
                card.height = w
                card.position.set(p.x,
                    p.y)
            },
            ease.inOut,
            ctx.layer)
        if (ctx.layer.destroyed) return
        card.visible = false
        ctx.onBeat?.()
        await Promise.all([
            tail,
            trail,
            bloom(ctx.layer,
                to,
                SOUL,
                300,
                380),
            soulWisps(ctx,
                to,
                180,
                50)
        ])
    })

/** Q: xẻng lớn cháy lửa hồn vung lên ngay trên đầu mục tiêu rồi bổ xuống; chạm là báo. `to[0]` = mục tiêu */
registerVfx("yorickLastRites",
    async (ctx) => {
        const to = ctx.to[0] ?? ctx.from
        const k = kOf(ctx)
        const beat = beatOnce(ctx)
        const LIFT = 320
        const CHOP = 170
        const reach = 236 * k
        const s = new Sprite(shovelTex())
        s.anchor.set(.5,
            .92)
        s.scale.set(reach / 305)
        s.alpha = 0
        ctx.layer.addChild(s)
        const grip = {
            x: to.x + reach * .55, y: to.y + reach * .83
        }
        s.position.set(grip.x,
            grip.y)
        const AT_REST = -.585
        const RAISED = .45
        const head = () => ({
            x: grip.x + Math.sin(s.rotation) * reach,
            y: grip.y - Math.cos(s.rotation) * reach
        })
        const flame = dustStream(ctx.layer,
            () => s.destroyed ? to : head(),
            LIFT + CHOP + 80,
            1900,
            {
                color: SOULS, speed: [10,
                    80], gravity: -170, life: [220,
                    520], size: [9,
                    2.5], alpha: 1, spread: 30 * k, flow: 44
            })
        await tween(LIFT,
            (u) => {
                if (s.destroyed) return
                s.alpha = Math.min(1,
                    u * 3)
                s.rotation = RAISED + .3 * (1 - u)
            },
            ease.out,
            ctx.layer)
        await tween(CHOP,
            (u) => {
                if (!s.destroyed) s.rotation = lerp(RAISED,
                    AT_REST,
                    u)
            },
            ease.in,
            ctx.layer)
        if (ctx.layer.destroyed) return
        beat()
        ctx.shake(9,
            240)
        await Promise.all([
            flame,
            tween(360,
                (u) => { if (!s.destroyed) s.alpha = 1 - u * u },
                ease.linear,
                ctx.layer)
        ])
    })

/** Q trúng: đất mộ tung, lửa hồn nổ tại mục tiêu, hồn bị giật ra khỏi xác */
registerVfx("yorickLastRitesHit",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                SOUL,
                340 * k,
                340),
            graveDirt(ctx,
                ctx.from,
                220,
                1.1),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 420, color: SOULS, speed: [120,
                        520], drag: 1.5, flow: 50, life: [320,
                        720], size: [9,
                        2.5], alpha: 1, spread: 30
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 60, color: [IRON,
                        PALE], blade: true, speed: [200,
                        520], gravity: 300, life: [240,
                        520], size: [34,
                        16], alpha: 1, spread: 24, additive: false
                }),
            mist(ctx.layer,
                ctx.from,
                {
                    color: [INK,
                        SOOT,
                        GHOST], size: 200 * k, alpha: .45, additive: false, speed: [30,
                        130]
                })
        ])
    })

/** Q hồi Máu cùng nhịp: hồn xanh dâng từ đất, thấm vào Yorick */
registerVfx("yorickLastRitesHeal",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                SOUL,
                300 * k,
                520),
            dustStream(ctx.layer,
                () => ({
                    x: ctx.from.x + rand(-86,
                        86) * k, y: ctx.from.y + rand(40,
                        130) * k
                }),
                520,
                1500,
                {
                    color: SOULS, speed: [70,
                        210], angle: [-Math.PI * .62,
                        -Math.PI * .38], gravity: -160, life: [460,
                        900], size: [8,
                        2.5], alpha: 1, flow: 40
                }),
            mist(ctx.layer,
                {
                    x: ctx.from.x, y: ctx.from.y + 70 * k
                },
                {
                    color: [GHOST,
                        PALE], size: 170 * k, alpha: .3, gravity: -70
                })
        ])
    })

/** E: khối sương đen vồng cao rồi rơi xuống mục tiêu, viền hồn xanh; chạm là báo. `to[0]` = mục tiêu */
registerVfx("yorickMistLob",
    async (ctx) => {
        const k = kOf(ctx)
        const beat = beatOnce(ctx)
        await Promise.all((ctx.to.length ? ctx.to : [ctx.from]).map(async (to) => {
            const MS = 560
            const peak = 150 * k
            let p = {
                ...ctx.from
            }
            const drift = (r: number) => () => ({
                x: p.x + rand(-r,
                    r), y: p.y + rand(-r,
                    r)
            })
            const trail = Promise.all([
                dustStream(ctx.layer,
                    drift(30 * k),
                    MS,
                    210,
                    {
                        puff: true, color: [INK,
                            SOOT], speed: [2,
                            20], life: [240,
                            480], size: [58 * k,
                            108 * k], alpha: .9, flow: 12, additive: false
                    }),
                dustStream(ctx.layer,
                    drift(44 * k),
                    MS,
                    1400,
                    {
                        color: [BLUE,
                            GHOST,
                            SOUL], speed: [6,
                            60], life: [180,
                            420], size: [7,
                            2], alpha: 1, flow: 30, drag: 2
                    }),
                dustStream(ctx.layer,
                    drift(26 * k),
                    MS,
                    320,
                    {
                        color: [PALE,
                            SOUL], streak: 3, speed: [40,
                            140], gravity: -80, life: [200,
                            420], size: [6,
                            1.5], alpha: 1, flow: 40
                    })
            ])
            await tween(MS,
                (u) => {
                    p = {
                        x: lerp(ctx.from.x,
                            to.x,
                            u), y: lerp(ctx.from.y,
                            to.y,
                            u) - Math.sin(u * Math.PI) * peak
                    }
                },
                ease.inOut,
                ctx.layer)
            beat()
            await trail
        }))
    })

/** E trúng: sương đen đập toé ra, hồn xanh bám lại trên mục tiêu */
registerVfx("yorickMistSplash",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(6,
            180)
        await Promise.all([
            mist(ctx.layer,
                ctx.from,
                {
                    color: [INK,
                        SOOT,
                        INK], size: 280 * k, alpha: .88, additive: false, speed: [50,
                        200], count: 18
                }),
            bloom(ctx.layer,
                ctx.from,
                BLUE,
                320 * k,
                340),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 420, color: [BLUE,
                        GHOST,
                        SOUL,
                        PALE], speed: [120,
                        460], drag: 1.3, flow: 40, life: [320,
                        760], size: [8,
                        2.5], alpha: 1, spread: 30
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 220, color: [INK,
                        SOOT], speed: [90,
                        360], angle: [-Math.PI * .95,
                        -Math.PI * .05], gravity: 720, drag: .6, life: [360,
                        720], size: [9,
                        3], alpha: 1, spread: 44, additive: false
                })
        ])
    })

/** Rã Giáp: giáp nứt thành mảnh sắt bung khỏi tướng, gỉ đen ăn dần xuống lá */
registerVfx("yorickShred",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            ironShards(ctx,
                ctx.from,
                110,
                1),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 140, color: [RUST,
                        INK,
                        SOOT], speed: [20,
                        110], gravity: 340, life: [520,
                        980], size: [8,
                        2.5], alpha: 1, spread: 98 * k, flow: 18, additive: false
                }),
            dustStream(ctx.layer,
                () => clingPoint(ctx.from,
                    1),
                520,
                900,
                {
                    color: [BLUE,
                        SOUL], speed: [10,
                        50], gravity: 150, life: [300,
                        640], size: [7,
                        2], alpha: .95, flow: 26
                })
        ])
    })

/** Mở màn R: Yorick gọi, sương đen tuôn dưới chân, hồn bị hút về phía ô phụ. `to[0]` = ô phụ */
registerVfx("yorickEulogyCast",
    async (ctx) => {
        const to = ctx.to[0] ?? ctx.from
        const MS = 460
        let u = 0
        const beat = beatOnce(ctx)
        const flow = () => {
            const t = Math.pow(Math.random(),
                .7) * u
            return {
                x: lerp(ctx.from.x,
                    to.x,
                    t) + rand(-26,
                    26), y: lerp(ctx.from.y + 60,
                    to.y + 80,
                    t) + rand(-26,
                    26)
            }
        }
        const tail = Promise.all([
            bloom(ctx.layer,
                ctx.from,
                SOUL,
                340,
                520),
            mist(ctx.layer,
                {
                    x: ctx.from.x, y: ctx.from.y + 90
                },
                {
                    color: [INK,
                        SOOT], size: 240, alpha: .6, additive: false
                }),
            dustStream(ctx.layer,
                flow,
                MS,
                3000,
                {
                    color: SOULS, speed: [10,
                        60], gravity: -60, life: [260,
                        560], size: [8,
                        2], alpha: 1, flow: 40
                })
        ])
        await tween(MS,
            (v) => { u = v },
            ease.inOut,
            ctx.layer)
        beat()
        await tail
    })

/** R: sương đen dâng ở ô phụ, Ma Sương đứng dậy từ dưới lên; thành hình là báo, cùng lúc lá hiện. ctx.amount = bậc Tiến Hoá */
registerVfx("yorickMaidenRise",
    async (ctx) => {
        const base = maidenFeet(ctx.from)
        const top = maidenHeight(tierOf(ctx))
        const MS = 900
        let h = top * .1
        const beat = beatOnce(ctx)
        ctx.shake(5,
            MS)
        const rise = maidenBody(ctx,
            {
                getBase: () => base, getHeight: () => h, ms: MS + 340, density: 1.5
            })
        const pool = Promise.all([
            mist(ctx.layer,
                base,
                {
                    color: [INK,
                        SOOT,
                        DEEP], size: 250, alpha: .42, additive: false, count: 12, life: [900,
                        1500]
                }),
            dustStream(ctx.layer,
                () => ({
                    x: base.x + rand(-150,
                        150), y: base.y + rand(-14,
                        20)
                }),
                MS,
                1500,
                {
                    color: SOULS, speed: [120,
                        340], angle: [-Math.PI * .6,
                        -Math.PI * .4], gravity: -220, life: [360,
                        760], size: [8,
                        2.5], alpha: 1, flow: 40
                })
        ])
        await tween(MS,
            (u) => { h = lerp(top * .1,
                top,
                u) },
            ease.out,
            ctx.layer)
        if (ctx.layer.destroyed) return
        beat()
        ctx.shake(9,
            260)
        await Promise.all([
            rise,
            pool,
            bloom(ctx.layer,
                ctx.from,
                PALE,
                520,
                560),
            soulWisps(ctx,
                {
                    x: base.x, y: base.y - top * .6
                },
                460,
                110)
        ])
    })

/** Ma Sương đứng trên lá ở ô phụ qua ctx.tether, hoặc tới khi tether thả. ctx.amount = bậc Tiến Hoá, càng cao thân càng to */
registerVfx("yorickMaidenAura",
    async (ctx) => {
        const tier = tierOf(ctx)
        const h = maidenHeight(tier)
        const base = () => maidenFeet(anchorOf(ctx))
        const live: Promise<unknown>[] = []
        const started = performance.now()
        while (!ctx.layer.destroyed && !ctx.tether?.released() && performance.now() - started < YORICK_RELAY_MS + 600) {
            live.push(maidenBody(ctx,
                {
                    getBase: base, getHeight: () => h, ms: AURA_TICK_MS, density: .82 + tier * .22, alpha: .86
                }))
            await sleep(AURA_TICK_MS)
        }
        await Promise.all(live)
    })

/** Ma Sương đánh: thân bà hiện ngay trên mục tiêu, tay voan cào xuống; trúng là báo. ctx.from = mục tiêu, ctx.amount = bậc Tiến Hoá */
registerVfx("yorickMaidenClaw",
    async (ctx) => {
        const tier = tierOf(ctx)
        const k = 1 + tier * .22
        const SWOOP = 240
        const beat = beatOnce(ctx)
        let sink = 70
        const h = 210 * k
        const body = maidenBody(ctx,
            {
                getBase: () => ({
                    x: ctx.from.x, y: ctx.from.y - 16 - sink
                }), getHeight: () => h, ms: SWOOP + 220, density: .95
            })
        await tween(SWOOP,
            (u) => { sink = 70 * (1 - u) },
            ease.in,
            ctx.layer)
        if (ctx.layer.destroyed) return
        beat()
        ctx.shake(5,
            160)
        await Promise.all([
            body,
            bloom(ctx.layer,
                ctx.from,
                SOUL,
                300 * k,
                300),
            ...[-.42,
                0,
                .42].map((off, i) => dustBurst(ctx.layer,
                {
                    x: ctx.from.x + off * 120 * k, y: ctx.from.y - 80 * k
                },
                {
                    count: 170, color: [PALE,
                        WHITE,
                        SOUL], streak: 4.5, speed: [420,
                        800], angle: [Math.PI * .5 - .16 - off * .3,
                        Math.PI * .5 + .16 - off * .3], drag: 2.4, flow: 18, life: [180,
                        360 + i * 20], size: [8,
                        2], alpha: 1, spread: 12
                })),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 200, color: SOULS, speed: [80,
                        300], gravity: -120, life: [320,
                        720], size: [7,
                        2], alpha: 1, spread: 54 * k, flow: 56
                }),
            mist(ctx.layer,
                ctx.from,
                {
                    color: [GHOST,
                        DEEP], size: 160 * k, alpha: .32
                })
        ])
    })

/** R khi đã có Ma Sương: lốc hồn cuộn quanh, thân bà lớn dần; đỉnh là báo, hồi đầy và Tiến Hoá cùng đáp. ctx.amount = bậc mới */
registerVfx("yorickMaidenEvolve",
    async (ctx) => {
        const tier = Math.max(1,
            tierOf(ctx))
        const base = maidenFeet(ctx.from)
        const from = maidenHeight(tier - 1)
        const to = maidenHeight(tier)
        const MS = 760
        let h = from
        let spin = 0
        const beat = beatOnce(ctx)
        ctx.shake(5,
            MS)
        const swirl = (phase: number) => () => {
            const u = Math.random()
            const a = spin + phase + u * 5
            const r = lerp(.42,
                .16,
                u) * h
            return {
                x: base.x + Math.cos(a) * r, y: base.y - u * h * 1.05 + Math.sin(a) * 18
            }
        }
        const opts: DustOpts = {
            color: SOULS, speed: [6,
                40], gravity: -80, life: [260,
                560], size: [9,
                2.5], alpha: 1, flow: 30
        }
        const body = maidenBody(ctx,
            {
                getBase: () => base, getHeight: () => h, ms: MS + 280, density: 1.5
            })
        const storm = Promise.all([
            dustStream(ctx.layer,
                swirl(0),
                MS,
                2200,
                opts),
            dustStream(ctx.layer,
                swirl(Math.PI),
                MS,
                2200,
                opts),
            mist(ctx.layer,
                base,
                {
                    color: [GHOST,
                        DEEP], size: 240, alpha: .3, count: 10
                })
        ])
        await tween(MS,
            (u) => {
                h = lerp(from,
                    to,
                    u)
                spin = u * TAU * 2
            },
            ease.inOut,
            ctx.layer)
        if (ctx.layer.destroyed) return
        beat()
        ctx.shake(10,
            280)
        await Promise.all([
            body,
            storm,
            bloom(ctx.layer,
                {
                    x: base.x, y: base.y - to * .55
                },
                PALE,
                640,
                620),
            soulWisps(ctx,
                {
                    x: base.x, y: base.y - to * .6
                },
                720,
                140)
        ])
    })

/** Yorick chết thì Ma Sương biến mất: thân bà rã thành sương bay lên; ctx.amount = bậc Tiến Hoá */
registerVfx("yorickMaidenFade",
    async (ctx) => {
        const base = maidenFeet(ctx.from)
        const h = maidenHeight(tierOf(ctx))
        const MS = 520
        ctx.onBeat?.()
        await Promise.all([
            dustBurst(ctx.layer,
                {
                    x: base.x, y: base.y - h * .5
                },
                {
                    count: 1500, color: SOULS, speed: [30,
                        170], gravity: -210, drag: .8, life: [460,
                        1100], size: [8,
                        2.5], alpha: 1, spread: h * .46, flow: 64
                }),
            dustStream(ctx.layer,
                () => bodyPoint(base,
                    h,
                    0),
                MS,
                1800,
                {
                    color: SOULS, speed: [20,
                        110], gravity: -240, life: [320,
                        760], size: [7,
                        2], alpha: .95, flow: 50
                }),
            mist(ctx.layer,
                {
                    x: base.x, y: base.y - h * .45
                },
                {
                    color: [INK,
                        SOOT,
                        DEEP], size: h * .9, alpha: .6, additive: false, gravity: -90, life: [760,
                        1300]
                })
        ])
    })
