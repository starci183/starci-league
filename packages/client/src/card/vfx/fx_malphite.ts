// VFX riêng của Malphite, chất liệu ĐÁ thật theo LoL: tảng đá phiến xám xanh nứt mạch vàng, tia vàng hổ phách, cát bụi nâu. Không dùng nét vẽ hình học.
//   Đá tảng là sprite canvas gồ ghề có mặt khối (hàm chunks), lăn và rơi theo trọng lực; bụi, tia, sương lấy từ fx_dust.
//   Liên Kết Đá (malphiteVein) là hình sao từ Malphite tới từng đồng minh, ctx.tether giữ nó sống và báo lúc đứt; không có tether thì chỉ loé rồi tan.
import {
    Container, Sprite, Texture, Ticker
} from "pixi.js"
import {
    bloom, dustBurst, dustStream, mist
} from "./fx_dust"
import {
    ease, lerp, makeSprite, pick, rand, tween
} from "./particles"
import {
    registerVfx, type Pt, type VfxCtx
} from "./types"

const TAU = Math.PI * 2
const GOLD = [0xffc936,
    0xffe27a,
    0xffa51e,
    0xfff2b8]
const SLATE = [0x3a4052,
    0x4a5166,
    0x2c3040,
    0x5e6478]
const SAND = [0x8a7f6e,
    0xa89a82,
    0x6e6558,
    0xc2b294]
const DIRT = [0x5a5044,
    0x6e6558,
    0x4a4238]
const HOT = 0xffb52a
/** Nửa bề rộng, nửa chiều cao lá tướng trên bàn */
const CARD_W = 66
const CARD_H = 108
const UP: [number, number] = [-Math.PI * .72,
    -Math.PI * .28]
const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
const quality = () => Math.max(.3,
    Math.min(1,
        (Ticker.shared.FPS - 25) / 30))

/** Một lần Liên Kết Đá sống chừng này (VFX bị cắt ở 15s); bên gọi nối lần mới trước khi lần cũ tan, amount: 1 để không mọc lại */
export const MALPHITE_VEIN_MS = 9000
/** Mạch đá mọc từ Malphite tới đồng minh trong chừng này, chạm là ctx.onBeat */
const VEIN_GROW_MS = 420
/** Không có tether thì không có ai báo đứt: chỉ loé qua để không treo mạch đá giả trên bàn */
const VEIN_FLASH_MS = 1300

/** Tảng đá phiến gồ ghề: mặt khối sáng tối; hot thì nứt mạch vàng như icon chiêu */
function rockTexture(hot: boolean): Texture {
    const S = 64
    const c = document.createElement("canvas")
    c.width = S
    c.height = S
    const g = c.getContext("2d")
    if (g) {
        const n = 7 + Math.floor(rand(0,
            3))
        const rim = Array.from({
            length: n
        },
        (_, i) => {
            const a = i / n * TAU + rand(-.22,
                .22)
            const r = S * .46 * rand(.62,
                1)
            return {
                x: S / 2 + Math.cos(a) * r, y: S / 2 + Math.sin(a) * r
            }
        })
        g.beginPath()
        rim.forEach((p, i) => (i ? g.lineTo(p.x,
            p.y) : g.moveTo(p.x,
            p.y)))
        g.closePath()
        const body = g.createLinearGradient(S * .15,
            S * .1,
            S * .85,
            S * .9)
        body.addColorStop(0,
            "#8f97ae")
        body.addColorStop(.48,
            "#4b5268")
        body.addColorStop(1,
            "#1f222c")
        g.fillStyle = body
        g.fill()
        g.save()
        g.clip()
        // mặt khối: tam giác từ tâm lệch ra hai đỉnh kề nhau
        const heart = {
            x: S * rand(.38,
                .6), y: S * rand(.38,
                .6)
        }
        rim.forEach((p, i) => {
            const q = rim[(i + 1) % n]
            g.fillStyle = i % 2 ? `rgba(255,255,255,${rand(.04,
                .16).toFixed(2)})` : `rgba(0,0,0,${rand(.1,
                .3).toFixed(2)})`
            g.beginPath()
            g.moveTo(heart.x,
                heart.y)
            g.lineTo(p.x,
                p.y)
            g.lineTo(q.x,
                q.y)
            g.closePath()
            g.fill()
        })
        // lỗ rỗ và vân đá để mặt khối không phẳng như đa giác
        for (let i = 0; i < 260; i++) {
            g.fillStyle = Math.random() < .5 ? "rgba(255,255,255,.13)" : "rgba(0,0,0,.2)"
            g.fillRect(rand(0,
                S),
            rand(0,
                S),
            rand(1,
                3),
            rand(1,
                3))
        }
        if (hot) {
            // khe nứt nóng từ mép vào, mảnh và loé mềm; không vạch thẳng qua tâm để khỏi thành ký hiệu
            g.strokeStyle = "#ffb52a"
            g.shadowColor = "#ff8a10"
            g.shadowBlur = 9
            g.lineCap = "round"
            for (let i = 0; i < 7; i++) {
                const from = pick(rim)
                let x = from.x, y = from.y
                let a = Math.atan2(S / 2 - y,
                    S / 2 - x) + rand(-.8,
                    .8)
                g.lineWidth = rand(1,
                    2.2)
                g.beginPath()
                g.moveTo(x,
                    y)
                for (let j = 0; j < 3; j++) {
                    a += rand(-.9,
                        .9)
                    x += Math.cos(a) * S * .08
                    y += Math.sin(a) * S * .08
                    g.lineTo(x,
                        y)
                }
                g.stroke()
            }
        }
        g.restore()
    }
    return Texture.from(c)
}
let plain: Texture[] | undefined
let molten: Texture[] | undefined
const rockTex = (hot: boolean) => (hot ? pick(molten ??= Array.from({
    length: 4
},
() => rockTexture(true))) : pick(plain ??= Array.from({
    length: 4
},
() => rockTexture(false))))

function rockSprite(host: Container, x: number, y: number, size: number, hot: boolean) {
    const s = new Sprite(rockTex(hot))
    s.anchor.set(.5)
    s.x = x
    s.y = y
    s.rotation = rand(0,
        TAU)
    s.scale.set(size / 64)
    host.addChild(s)
    return s
}

interface ChunkOpts {
    count: number;
    /** Đường kính tảng (px) */
    size: [number, number];
    speed: [number, number];
    angle?: [number, number];
    gravity?: number;
    life?: [number, number];
    spread?: number;
    /** Tỉ lệ tảng nứt mạch vàng 0..1 */
    hot?: number;
    /** Mặt đất dưới điểm nổ (px): tảng đá nảy một lần rồi nằm im */
    floor?: number;
}
interface Chunk { s: Sprite; vx: number; vy: number; spin: number; age: number; life: number; floor: number; bounced: boolean }

/** Bắn tảng đá thật: lăn, rơi, nảy, mờ dần lúc cuối */
function chunks(layer: Container, pt: Pt, o: ChunkOpts): Promise<void> {
    if (layer.destroyed) return Promise.resolve()
    const host = new Container()
    layer.addChild(host)
    const [a0,
        a1] = o.angle ?? [0,
        TAU]
    const [l0,
        l1] = o.life ?? [560,
        1000]
    const count = Math.round(o.count * quality())
    const list: Chunk[] = Array.from({
        length: count
    },
    () => {
        const a = rand(a0,
                a1), speed = rand(o.speed[0],
                o.speed[1])
        const pa = rand(0,
                TAU), r = Math.sqrt(Math.random()) * (o.spread ?? 0)
        const y = pt.y + Math.sin(pa) * r
        return {
            s: rockSprite(host,
                pt.x + Math.cos(pa) * r,
                y,
                rand(o.size[0],
                    o.size[1]),
                Math.random() < (o.hot ?? 0)),
            vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, spin: rand(-9,
                9), age: 0, life: rand(l0,
                l1), floor: y + (o.floor ?? 1e6), bounced: false
        }
    })
    const gravity = o.gravity ?? 900
    return new Promise((resolve) => {
        let done = false
        const finish = () => {
            if (done) return
            done = true
            Ticker.shared.remove(tick)
            layer.off("destroyed",
                finish)
            if (!host.destroyed) host.destroy({
                children: true
            })
            resolve()
        }
        const tick = (tk: Ticker) => {
            if (layer.destroyed || host.destroyed) { finish(); return }
            const dt = tk.deltaMS / 1000
            let alive = false
            for (const c of list) {
                c.age += tk.deltaMS
                const t = c.age / c.life
                if (t >= 1) { c.s.visible = false; continue }
                alive = true
                c.vy += gravity * dt
                c.s.x += c.vx * dt
                c.s.y += c.vy * dt
                c.s.rotation += c.spin * dt
                if (c.s.y > c.floor) {
                    c.s.y = c.floor
                    c.vy = c.bounced ? 0 : -Math.abs(c.vy) * .32
                    c.vx *= .55
                    c.spin *= .4
                    c.bounced = true
                }
                c.s.alpha = t < .72 ? 1 : (1 - t) / .28
            }
            if (!alive) finish()
        }
        layer.once("destroyed",
            finish)
        Ticker.shared.add(tick)
    })
}

/** Bụi đất nâu tung lên: dày nhưng mềm, không cộng sáng để không loá thành đốm trắng */
const dustCloud = (ctx: VfxCtx, at: Pt, size: number, alpha = .6) => mist(ctx.layer,
    at,
    {
        color: SAND, size, alpha, additive: false, count: 14, speed: [40,
            170], life: [560,
            1150]
    })

/** Cát văng: bụi mịn theo trọng lực */
const grit = (ctx: VfxCtx, at: Pt, count: number, power = 1, spread = 22) => dustBurst(ctx.layer,
    at,
    {
        count, color: SAND, speed: [90 * power,
            460 * power], angle: UP, gravity: 720, drag: .7, flow: 20, life: [420,
            900], size: [6,
            2], alpha: 1, spread, additive: false
    })

/** Tia vàng hổ phách toả từ điểm trúng */
const goldSpray = (ctx: VfxCtx, at: Pt, count: number, power = 1) => dustBurst(ctx.layer,
    at,
    {
        count, color: GOLD, speed: [180 * power,
            720 * power], gravity: 260, drag: 1.6, flow: 16, life: [220,
            560], size: [11,
            3], alpha: 1, spread: 14, streak: 5
    })

/** Mảnh đá sắc bắn ra */
const slateBlades = (ctx: VfxCtx, at: Pt, count: number, power = 1) => dustBurst(ctx.layer,
    at,
    {
        count, blade: true, color: [...SLATE,
            0x8f97ae], speed: [160 * power,
            560 * power], gravity: 620, drag: 1, flow: 0, life: [320,
            680], size: [34,
            14], alpha: 1, spread: 16, additive: false
    })

/** Điểm trên mạch đá giữa a và b: cong nhẹ, gồ ghề, cùng a b thì cùng hình nên mọi hiệu ứng chạy đúng trên mạch */
function veinPoint(a: Pt, b: Pt, u: number): Pt {
    const dx = b.x - a.x, dy = b.y - a.y
    const span = Math.hypot(dx,
        dy)
    // mạch võng về giữa bàn để không đè lên các lá đứng giữa hai tướng
    const side = a.y > window.innerHeight / 2 ? -1 : 1
    const lift = Math.min(190,
        46 + span * .2) * side
    const seed = (a.x + b.x) * .013
    const wobble = (Math.sin(u * 19 + seed) * 6 + Math.sin(u * 37 + seed * 2.3) * 4) * Math.sin(u * Math.PI)
    const bow = 4 * u * (1 - u) * lift
    return {
        x: a.x + dx * u + wobble * .5, y: a.y + dy * u + bow + wobble
    }
}

/** Một bên của sao Liên Kết Đá, dùng được cho cả lúc tướng di chuyển: mỗi khung đọc lại đầu mút */
async function livingVein(ctx: VfxCtx, end: () => Pt, life: number, grown: boolean) {
    const released = () => ctx.tether?.released() ?? false
    const host = new Container()
    ctx.layer.addChild(host)
    const span = Math.hypot(end().x - ctx.from.x,
        end().y - ctx.from.y)
    const count = Math.max(10,
        Math.round(span / 11))
    const glows = Array.from({
        length: Math.ceil(count / 2)
    },
    (_, i) => ({
        u: (i + .5) / Math.ceil(count / 2), s: makeSprite(host,
            "glow",
            0,
            0,
            pick([HOT,
                0xffc936]),
            84)
    }))
    // sóng rải theo bề ngang: đá nằm so le như mạch quặng trồi lên
    const stones = Array.from({
        length: count
    },
    (_, i) => {
        const u = (i + .5) / count
        return {
            u, off: Math.sin(i * 2.4) * 7, s: rockSprite(host,
                0,
                0,
                16 + (i * 7 % 5) * 4,
                i % 3 === 0)
        }
    })
    const bursts: Promise<void>[] = []
    let grow = grown ? 1 : 0
    let fade = grown ? 0 : 1
    let clock = 0
    let sinceDust = 1e4
    let landed = grown
    let stopped = false
    const place = (t: number, alpha: number) => {
        clock += t
        const b = end()
        for (const g of glows) {
            const shown = g.u <= grow
            const p = veinPoint(ctx.from,
                b,
                g.u)
            g.s.x = p.x
            g.s.y = p.y
            // nhịp thở chảy dọc mạch như dòng dung nham
            g.s.alpha = shown ? alpha * (.62 + .36 * Math.sin(g.u * 11 - clock * .006)) : 0
        }
        for (const s of stones) {
            const p = veinPoint(ctx.from,
                b,
                s.u)
            s.s.x = p.x
            s.s.y = p.y + s.off
            s.s.alpha = s.u <= grow ? alpha : 0
        }
    }
    const motes = () => {
        const b = end()
        return veinPoint(ctx.from,
            b,
            rand(0,
                grow))
    }
    await new Promise<void>((resolve) => {
        const layer = ctx.layer
        let el = 0
        let done = false
        const finish = () => {
            if (done) return
            done = true
            Ticker.shared.remove(tick)
            layer.off("destroyed",
                finish)
            if (!host.destroyed) host.destroy({
                children: true
            })
            resolve()
        }
        const tick = (tk: Ticker) => {
            if (layer.destroyed || host.destroyed) { finish(); return }
            el += tk.deltaMS
            sinceDust += tk.deltaMS
            if (!landed) {
                grow = Math.min(1,
                    el / VEIN_GROW_MS)
                if (grow >= 1) {
                    landed = true
                    ctx.tether?.contact()
                    ctx.onBeat?.()
                }
            } else fade = Math.min(1,
                fade + tk.deltaMS / 220)
            const over = el >= life || released()
            if (over) stopped = true
            if (stopped) fade -= tk.deltaMS / (released() ? 90 : 260)
            if (fade <= 0 && stopped) { finish(); return }
            place(tk.deltaMS,
                Math.max(0,
                    fade))
            if (!stopped && grow > .05 && sinceDust >= 420) {
                sinceDust = 0
                bursts.push(dustStream(layer,
                    motes,
                    420,
                    150 * Math.max(.35,
                        span / 420),
                    {
                        color: GOLD, speed: [8,
                            46], angle: UP, gravity: -36, life: [320,
                            700], size: [6,
                            2], alpha: 1, flow: 18
                    }))
            }
        }
        layer.once("destroyed",
            finish)
        Ticker.shared.add(tick)
    })
    await Promise.all(bursts)
}

/** E: Liên Kết Đá. from = Malphite, to = đồng minh. Mạch mọc tới nơi là ctx.onBeat; ctx.amount = 1 là lần nối tiếp nên không mọc lại */
registerVfx("malphiteVein",
    async (ctx) => {
        const tethered = !!ctx.tether
        const life = tethered ? MALPHITE_VEIN_MS : VEIN_FLASH_MS
        const grown = ctx.amount === 1
        if (!ctx.to.length) {
            ctx.onBeat?.()
            return
        }
        await Promise.all(ctx.to.map((to, i) => livingVein(ctx,
            () => (i === 0 ? ctx.tether?.target() ?? to : to),
            life,
            grown)))
    })

/** E: mạch đá bám vào lá: đá nứt chỗ chạm, bụi vàng bốc lên */
registerVfx("malphiteVeinSeat",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                HOT,
                300 * k,
                360),
            chunks(ctx.layer,
                ctx.from,
                {
                    count: 18, size: [14,
                        30], speed: [120,
                        340], angle: UP, gravity: 980, spread: 46, hot: .45, floor: 96, life: [520,
                        860]
                }),
            goldSpray(ctx,
                ctx.from,
                90,
                .7),
            grit(ctx,
                ctx.from,
                200,
                .8,
                54),
            dustCloud(ctx,
                ctx.from,
                170 * k,
                .42)
        ])
    })

/** Đá rơi ven lá rồi nằm yên; from = lá, dùng chung cho nội tại và Giáp từ Q */
async function stoneRim(ctx: VfxCtx, o: { rise: number; hold: number; count: number; size: [number, number]; fromBelow: boolean }) {
    const k = kOf(ctx)
    const host = new Container()
    ctx.layer.addChild(host)
    const at = ctx.from
    const stones = Array.from({
        length: o.count
    },
    (_, i) => {
        // đá ôm bốn cạnh lá nhưng rải không đều, đè nặng ở cạnh dưới như đá vừa rơi xuống
        const w = CARD_W * 2, h = CARD_H * 2
        const e = i < o.count * .36 ? rand(w + h,
            w + h + w) : rand(0,
            w + w + h + h)
        const edge = e < w ? {
            x: -CARD_W + e, y: -CARD_H
        } : e < w + h ? {
            x: CARD_W, y: -CARD_H + e - w
        } : e < w + h + w ? {
            x: CARD_W - (e - w - h), y: CARD_H
        } : {
            x: -CARD_W, y: CARD_H - (e - w - h - w)
        }
        const end = {
            x: at.x + edge.x * k + rand(-13,
                13), y: at.y + edge.y * k + rand(-13,
                13)
        }
        const start = o.fromBelow ? {
            x: end.x + rand(-26,
                26), y: end.y + rand(70,
                150)
        } : {
            x: end.x + rand(-40,
                40), y: end.y - rand(120,
                230)
        }
        return {
            start, end, delay: rand(0,
                .42), spin: rand(-6,
                6), s: rockSprite(host,
                start.x,
                start.y,
                rand(o.size[0],
                    o.size[1]),
                i % 3 === 0)
        }
    })
    const settle = () => {
        const p = pick(stones).end
        return {
            x: p.x, y: p.y + rand(-4,
                4)
        }
    }
    const total = o.rise + o.hold + 300
    const trails = [
        dustStream(ctx.layer,
            settle,
            o.rise + o.hold,
            170,
            {
                color: GOLD, speed: [10,
                    60], angle: UP, gravity: -60, life: [300,
                    640], size: [7,
                    2], alpha: 1, flow: 24
            }),
        dustStream(ctx.layer,
            settle,
            o.rise,
            520,
            {
                color: SAND, speed: [30,
                    130], gravity: 200, life: [320,
                    700], size: [6,
                    2], alpha: .95, additive: false
            }),
        tween(o.rise,
            () => {},
            ease.linear,
            ctx.layer).then(() => {
            ctx.onBeat?.()
            return bloom(ctx.layer,
                at,
                HOT,
                300 * k,
                420)
        })
    ]
    await tween(total,
        (t) => {
            if (host.destroyed) return
            const el = t * total
            const fall = (d: number) => Math.min(1,
                Math.max(0,
                    (el / o.rise - d) / (1 - d)))
            for (const s of stones) {
                const f = fall(s.delay)
                const e = ease.in(f)
                s.s.x = lerp(s.start.x,
                    s.end.x,
                    e)
                s.s.y = lerp(s.start.y,
                    s.end.y,
                    e)
                s.s.rotation += f < 1 ? s.spin * .016 : 0
                s.s.alpha = el > o.rise + o.hold ? 1 - (el - o.rise - o.hold) / 300 : Math.min(1,
                    f * 4)
            }
        },
        ease.linear,
        ctx.layer)
    if (!host.destroyed) host.destroy({
        children: true
    })
    await Promise.all(trails)
}

/** Nội tại: viền đá rơi xuống và nằm yên quanh lá đồng minh */
registerVfx("malphiteStoneRim",
    (ctx) => stoneRim(ctx,
        {
            rise: 560, hold: 620, count: 44, size: [20,
                46], fromBelow: false
        }))

/** Q: Giáp lên nhanh: đá trồi từ dưới bám vào lá */
registerVfx("malphiteArmorUp",
    (ctx) => stoneRim(ctx,
        {
            rise: 240, hold: 360, count: 30, size: [16,
                36], fromBelow: true
        }))

/** Q mở màn: đá bứt khỏi người Malphite */
registerVfx("malphiteShardRip",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(3,
            180)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                HOT,
                220 * k,
                300),
            chunks(ctx.layer,
                ctx.from,
                {
                    count: 14, size: [12,
                        26], speed: [160,
                        360], angle: UP, gravity: 1100, spread: 40, hot: .4, life: [340,
                        620]
                }),
            grit(ctx,
                ctx.from,
                170,
                .7,
                44)
        ])
    })

/** Q: mảnh đá lớn lao tới, lăn trong dải tia vàng; chạm là ctx.onBeat */
registerVfx("malphiteShard",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all((ctx.to.length ? ctx.to : [ctx.from]).map(async (to) => {
            const ms = 400
            const host = new Container()
            ctx.layer.addChild(host)
            const rock = rockSprite(host,
                ctx.from.x,
                ctx.from.y,
                96 * k,
                true)
            const halo = makeSprite(host,
                "glow",
                ctx.from.x,
                ctx.from.y,
                HOT,
                220 * k)
            halo.alpha = .7
            host.addChildAt(halo,
                0)
            const head = () => ({
                x: rock.x + rand(-26,
                    26) * k, y: rock.y + rand(-26,
                    26) * k
            })
            const dir = Math.atan2(to.y - ctx.from.y,
                to.x - ctx.from.x) + Math.PI
            await Promise.all([
                dustStream(ctx.layer,
                    head,
                    ms,
                    1900,
                    {
                        color: GOLD, speed: [120,
                            420], angle: [dir - .3,
                            dir + .3], life: [180,
                            420], size: [11,
                            3], alpha: 1, flow: 12, drag: 2, streak: 6
                    }),
                dustStream(ctx.layer,
                    head,
                    ms,
                    90,
                    {
                        puff: true, color: DIRT, speed: [10,
                            50], life: [340,
                            640], size: [70,
                            150], alpha: .5, flow: 14, additive: false
                    }),
                dustStream(ctx.layer,
                    head,
                    ms,
                    120,
                    {
                        blade: true, color: SLATE, speed: [60,
                            220], angle: [dir - .5,
                            dir + .5], gravity: 500, life: [240,
                            460], size: [26,
                            10], alpha: 1, flow: 0, additive: false
                    }),
                tween(ms,
                    (t) => {
                        rock.x = lerp(ctx.from.x,
                            to.x,
                            t)
                        rock.y = lerp(ctx.from.y,
                            to.y,
                            t)
                        rock.rotation += .28
                        halo.x = rock.x
                        halo.y = rock.y
                    },
                    ease.in,
                    ctx.layer).then(() => {
                    if (!host.destroyed) host.destroy({
                        children: true
                    })
                    ctx.onBeat?.()
                })
            ])
        }))
    })

/** Q trúng: tảng đá vỡ tung tại mục tiêu */
registerVfx("malphiteShardHit",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(8,
            240)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                HOT,
                340 * k,
                300),
            chunks(ctx.layer,
                ctx.from,
                {
                    count: 34, size: [16,
                        46], speed: [180,
                        620], gravity: 980, spread: 26, hot: .35, floor: 110, life: [520,
                        980]
                }),
            slateBlades(ctx,
                ctx.from,
                60,
                1.1),
            goldSpray(ctx,
                ctx.from,
                200,
                1.1),
            grit(ctx,
                ctx.from,
                300,
                1.1),
            dustCloud(ctx,
                ctx.from,
                220 * k,
                .55)
        ])
    })

/** Đá dọc mạch rơi xuống: ctx.to[i] là từng đồng minh, from = Malphite */
function veinCollapse(ctx: VfxCtx, a: Pt, b: Pt, power: number) {
    const span = Math.hypot(b.x - a.x,
        b.y - a.y)
    const stops = Math.max(5,
        Math.round(span / 46))
    return Promise.all(Array.from({
        length: stops
    },
    (_, i) => {
        const at = veinPoint(a,
            b,
            (i + .5) / stops)
        return Promise.all([
            chunks(ctx.layer,
                at,
                {
                    count: 5, size: [12,
                        30], speed: [40,
                        220 * power], angle: [-Math.PI * .85,
                        -Math.PI * .15], gravity: 1200, spread: 14, hot: .55, life: [460,
                        820]
                }),
            dustBurst(ctx.layer,
                at,
                {
                    count: 34, color: GOLD, speed: [30,
                        200], gravity: 220, life: [260,
                        620], size: [8,
                        2], alpha: 1, spread: 16, flow: 26
                }),
            dustBurst(ctx.layer,
                at,
                {
                    count: 26, color: SAND, speed: [20,
                        120], gravity: 340, life: [320,
                        680], size: [6,
                        2], alpha: .9, spread: 14, additive: false
                })
        ])
    }))
}

/** Liên Kết Đá đứt một nhánh: chỉ mạch của đồng minh vừa gục đổ xuống. from = Malphite, to = đồng minh */
registerVfx("malphiteVeinBreak",
    async (ctx) => {
        await Promise.all(ctx.to.map((to) => veinCollapse(ctx,
            ctx.from,
            to,
            1)))
    })

/** Malphite gục: vỡ toàn bộ, nổ từ người Malphite rồi cả sao đá sập */
registerVfx("malphiteVeinShatter",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(12,
            420)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                HOT,
                420 * k,
                420),
            chunks(ctx.layer,
                ctx.from,
                {
                    count: 40, size: [18,
                        52], speed: [160,
                        640], gravity: 980, spread: 40, hot: .5, life: [560,
                        1040]
                }),
            goldSpray(ctx,
                ctx.from,
                220,
                1.1),
            dustCloud(ctx,
                ctx.from,
                240 * k,
                .6),
            ...ctx.to.map((to) => veinCollapse(ctx,
                ctx.from,
                to,
                1.5))
        ])
    })

/** Một đòn truyền qua mạch: from = lá bị đánh, to[0] = Malphite, to còn lại = đồng minh nối; ánh vàng chạy khắp sao đá ngay lúc số rơi */
registerVfx("malphiteVeinSurge",
    async (ctx) => {
        const hub = ctx.to[0]
        if (!hub) return
        const hit = Math.abs(ctx.from.x - hub.x) > 1 ? ctx.from : undefined
        const others = ctx.to.slice(1).filter((p) => p.x !== ctx.from.x)
        const ms = 230
        const run = async (a: Pt, b: Pt, backward: boolean) => {
            let u = backward ? 1 : 0
            const head = () => veinPoint(a,
                b,
                u + rand(-.03,
                    .03))
            await Promise.all([
                dustStream(ctx.layer,
                    head,
                    ms,
                    2800,
                    {
                        color: GOLD, speed: [20,
                            150], life: [240,
                            520], size: [12,
                            3], alpha: 1, flow: 24, spread: 12
                    }),
                tween(ms,
                    (t) => { u = backward ? 1 - t : t },
                    ease.out,
                    ctx.layer)
            ])
        }
        await Promise.all([
            ...hit ? [run(hub,
                hit,
                true)] : [],
            ...others.map((p) => run(hub,
                p,
                false)),
            bloom(ctx.layer,
                hub,
                HOT,
                240,
                260)
        ])
    })

/** Phần đòn chia tới một tướng trong mạch: đá nứt tại lá. intensity 2 ở lá bị đánh thật */
registerVfx("malphiteVeinCrack",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                HOT,
                230 * k,
                260),
            chunks(ctx.layer,
                ctx.from,
                {
                    count: Math.round(12 * ctx.intensity), size: [12,
                        30], speed: [120,
                        380], gravity: 980, spread: 30, hot: .5, floor: 100, life: [440,
                        780]
                }),
            goldSpray(ctx,
                ctx.from,
                Math.round(60 * ctx.intensity),
                .8),
            grit(ctx,
                {
                    x: ctx.from.x, y: ctx.from.y + 70
                },
                Math.round(60 * ctx.intensity),
                .7,
                40)
        ])
    })

/** R mở màn: đá quanh Malphite nhấc khỏi mặt đất, mạch vàng tụ về người */
registerVfx("malphiteChargeUp",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(4,
            500)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                HOT,
                340 * k,
                520),
            chunks(ctx.layer,
                {
                    x: ctx.from.x, y: ctx.from.y + 80
                },
                {
                    count: 26, size: [14,
                        38], speed: [80,
                        300], angle: UP, gravity: 260, spread: 100, hot: .5, life: [420,
                        640]
                }),
            dustStream(ctx.layer,
                () => ({
                    x: ctx.from.x + rand(-110,
                        110) * k, y: ctx.from.y + rand(40,
                        110) * k
                }),
                480,
                1400,
                {
                    color: GOLD, speed: [80,
                        260], angle: UP, gravity: -240, life: [260,
                        520], size: [10,
                        2], alpha: 1, flow: 36, streak: 4
                }),
            dustCloud(ctx,
                {
                    x: ctx.from.x, y: ctx.from.y + 40
                },
                200 * k,
                .3)
        ])
    })

const middleOf = (pts: Pt[]) => ({
    x: pts.reduce((sum, p) => sum + p.x,
        0) / pts.length,
    y: pts.reduce((sum, p) => sum + p.y,
        0) / pts.length
})

/** R: khối đá Malphite lao thẳng vào giữa hàng địch; đáp là ctx.onBeat */
registerVfx("malphiteCharge",
    async (ctx) => {
        const k = kOf(ctx)
        const to = ctx.to.length ? middleOf(ctx.to) : ctx.from
        const ms = 300
        const host = new Container()
        ctx.layer.addChild(host)
        const halo = makeSprite(host,
            "glow",
            ctx.from.x,
            ctx.from.y,
            HOT,
            420 * k)
        halo.alpha = .85
        const boulder = Array.from({
            length: 7
        },
        (_, i) => ({
            a: i / 7 * TAU, r: i === 0 ? 0 : 46 * k, s: rockSprite(host,
                ctx.from.x,
                ctx.from.y,
                (i === 0 ? 150 : rand(80,
                    110)) * k,
                true)
        }))
        let p = {
            ...ctx.from
        }
        const head = () => ({
            x: p.x + rand(-50,
                50) * k, y: p.y + rand(-50,
                50) * k
        })
        const back = Math.atan2(to.y - ctx.from.y,
            to.x - ctx.from.x) + Math.PI
        await Promise.all([
            dustStream(ctx.layer,
                head,
                ms,
                3400,
                {
                    color: GOLD, speed: [160,
                        460], angle: [back - .3,
                        back + .3], life: [140,
                        320], size: [12,
                        3], alpha: 1, flow: 10, drag: 2, streak: 5
                }),
            dustStream(ctx.layer,
                head,
                ms,
                90,
                {
                    puff: true, color: DIRT, speed: [20,
                        90], life: [240,
                        460], size: [90,
                        170], alpha: .4, flow: 20, additive: false
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
                    halo.x = p.x
                    halo.y = p.y
                    for (const b of boulder) {
                        b.s.x = p.x + Math.cos(b.a + t * 7) * b.r
                        b.s.y = p.y + Math.sin(b.a + t * 7) * b.r
                        b.s.rotation += .2
                    }
                },
                ease.in,
                ctx.layer).then(() => {
                if (!host.destroyed) host.destroy({
                    children: true
                })
                ctx.onBeat?.()
            })
        ])
    })

/** R đáp: sóng đá và bụi quét cả hàng địch từ giữa ra hai bên trong một nhịp. Không Choáng nên không có sao quay */
registerVfx("malphiteSlamWave",
    async (ctx) => {
        const k = kOf(ctx)
        const pts = ctx.to.length ? ctx.to : [ctx.from]
        const mid = middleOf(pts)
        const left = Math.min(...pts.map((p) => p.x)) - 150
        const right = Math.max(...pts.map((p) => p.x)) + 150
        const ms = 300
        ctx.shake(20,
            720)
        let front = 0
        const across = (side: number) => () => ({
            x: lerp(mid.x,
                side < 0 ? left : right,
                front), y: mid.y + rand(-140,
                140)
        })
        const sweep = (side: number) => {
            const out: [number, number] = side < 0 ? [Math.PI * .85,
                Math.PI * 1.15] : [-Math.PI * .15,
                Math.PI * .15]
            return [
                dustStream(ctx.layer,
                    across(side),
                    ms,
                    120,
                    {
                        puff: true, color: SAND, speed: [120,
                            340], angle: out, life: [620,
                            1240], size: [170,
                            340], alpha: .66, flow: 26, drag: 1.2, additive: false
                    }),
                dustStream(ctx.layer,
                    across(side),
                    ms,
                    2600,
                    {
                        color: SAND, speed: [160,
                            620], angle: UP, gravity: 820, drag: .7, life: [420,
                            900], size: [7,
                            2], alpha: 1, flow: 22, additive: false
                    }),
                dustStream(ctx.layer,
                    across(side),
                    ms,
                    1500,
                    {
                        color: GOLD, speed: [200,
                            680], angle: UP, gravity: 460, drag: 1.2, life: [240,
                            560], size: [13,
                            3], alpha: 1, flow: 12, streak: 5
                    }),
                dustStream(ctx.layer,
                    across(side),
                    ms,
                    240,
                    {
                        blade: true, color: [...SLATE,
                            0x8f97ae], speed: [220,
                            620], angle: UP, gravity: 1000, life: [340,
                            700], size: [46,
                            18], alpha: 1, flow: 0, additive: false
                    })
            ]
        }
        const tossed = Array.from({
            length: 9
        },
        (_, i) => chunks(ctx.layer,
            {
                x: lerp(left + 60,
                    right - 60,
                    i / 8), y: mid.y + 40
            },
            {
                count: 9, size: [18,
                    60], speed: [240,
                    720], angle: UP, gravity: 1300, spread: 54, hot: .4, life: [620,
                    1060], floor: 110
            }))
        await Promise.all([
            bloom(ctx.layer,
                mid,
                HOT,
                720 * k,
                460),
            dustCloud(ctx,
                mid,
                380 * k,
                .72),
            tween(ms,
                (t) => { front = t },
                ease.out,
                ctx.layer),
            ...tossed,
            ...sweep(-1),
            ...sweep(1)
        ])
    })

/** R trúng từng địch: giáp đá bị đập vỡ, mảng đá rơi khỏi lá */
registerVfx("malphiteSlamHit",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                HOT,
                260 * k,
                280),
            chunks(ctx.layer,
                ctx.from,
                {
                    count: 18, size: [18,
                        44], speed: [120,
                        420], angle: [Math.PI * .1,
                        Math.PI * .9], gravity: 1000, spread: 58, hot: .6, life: [520,
                        920]
                }),
            slateBlades(ctx,
                ctx.from,
                34,
                .9),
            grit(ctx,
                ctx.from,
                180,
                1,
                44)
        ])
    })
