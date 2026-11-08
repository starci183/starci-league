// VFX riêng của Ornn, chất liệu LÒ RÈN thật: dung nham nguội dần theo tuổi hạt (trắng nóng -> vàng -> cam -> đỏ sẫm -> vỏ đen), đá núi lửa, tia lửa thép, khói than. Không dùng nét vẽ hình học.
// Ô trang bị: `to` là tâm các ô (tướng đeo đồ); `to` rỗng thì suy ra hàng ô từ `from` là tâm lá tướng, nên gọi từ dispatch vẫn đúng chỗ.
import {
    Assets, Container, Particle, ParticleContainer, Sprite, Texture, Ticker
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
const UP: [number, number] = [-Math.PI * .66,
    -Math.PI * .34]
const ALL: [number, number] = [0,
    TAU]
const FAN: [number, number] = [-Math.PI * .95,
    -Math.PI * .05]
const ORANGE = 0xff5a10
const AMBER = 0xffa52a
const WHITE_HOT = 0xfff4cf
const EMBER = [0xffe9a0,
    0xffb030,
    0xff6a14,
    0xff3c0a]
const SPARK = [0xffffff,
    0xfff0b8,
    0xffd060,
    0xff9a2a]
const GOLD = [0xfff6d0,
    0xffe08a,
    0xffc040,
    0xffa52a]
const SOOT = [0x140b08,
    0x20130e,
    0x2c1a12]
/** Nửa bề rộng, nửa chiều cao lá tướng trên bàn */
const CARD_W = 60
const CARD_H = 104
/** Vị trí hàng ô đồ so với tâm lá tướng */
const SLOT_DX = 20
const SLOT_DY = 92

const LUT_SIZE = 48
function makeLut(ramp: number[]) {
    const out = new Uint32Array(LUT_SIZE)
    for (let i = 0; i < LUT_SIZE; i++) {
        const u = i / (LUT_SIZE - 1) * (ramp.length - 1)
        const a = ramp[Math.floor(u)]
        const b = ramp[Math.min(ramp.length - 1,
            Math.floor(u) + 1)]
        const f = u % 1
        const mix = (shift: number) => Math.round(lerp(a >> shift & 255,
            b >> shift & 255,
            f))
        out[i] = mix(16) << 16 | mix(8) << 8 | mix(0)
    }
    return out
}
/** Dung nham sáng: phát sáng cộng màu, nguội từ trắng tới đỏ sẫm */
const MOLTEN = makeLut([0xfffbe0,
    0xffe27a,
    0xffa72a,
    0xff5a10,
    0xb3260a,
    0x3a0d06])
/** Vỏ dung nham: màu đặc, phủ được lên nền bàn sáng */
const CRUST = makeLut([0xffb040,
    0xff6a14,
    0xc8340a,
    0x6a1a08,
    0x2c120c,
    0x1a0e0a])
/** Đá núi lửa: rìa còn nóng lúc văng ra rồi về đen */
const ROCK = makeLut([0xff8a30,
    0x8a3414,
    0x3e2318,
    0x261812,
    0x1a120e])

/** Cục dung nham: nhiều đốm mềm chồng lên, viền không đều */
function lumpTexture(): Texture {
    const S = 64
    const c = document.createElement("canvas")
    c.width = S
    c.height = S
    const g = c.getContext("2d")
    if (g) {
        for (let i = 0; i < 26; i++) {
            const a = rand(0,
                TAU)
            const d = Math.pow(Math.random(),
                .8) * S * .24
            const x = S / 2 + Math.cos(a) * d
            const y = S / 2 + Math.sin(a) * d
            const r = rand(S * .1,
                S * .24)
            const grad = g.createRadialGradient(x,
                y,
                0,
                x,
                y,
                r)
            grad.addColorStop(0,
                "rgba(255,255,255,.26)")
            grad.addColorStop(1,
                "rgba(255,255,255,0)")
            g.fillStyle = grad
            g.fillRect(0,
                0,
                S,
                S)
        }
    }
    return Texture.from(c)
}

/** Mảnh đá: khối gồ ghề nhiều cạnh gãy, mặt sáng tối lệch nhau */
function rockTexture(): Texture {
    const S = 64
    const c = document.createElement("canvas")
    c.width = S
    c.height = S
    const g = c.getContext("2d")
    if (g) {
        const n = 9
        const start = rand(0,
            TAU)
        g.beginPath()
        for (let i = 0; i < n; i++) {
            const a = start + i / n * TAU
            const r = S * rand(.26,
                .47)
            const x = S / 2 + Math.cos(a) * r
            const y = S / 2 + Math.sin(a) * r
            if (i) g.lineTo(x,
                y)
            else g.moveTo(x,
                y)
        }
        g.closePath()
        g.save()
        g.clip()
        g.fillStyle = "#b8b8b8"
        g.fillRect(0,
            0,
            S,
            S)
        for (let i = 0; i < 16; i++) {
            const v = Math.round(rand(150,
                255))
            g.fillStyle = `rgba(${v},${v},${v},.7)`
            g.beginPath()
            g.moveTo(rand(0,
                S),
            rand(0,
                S))
            g.lineTo(rand(0,
                S),
            rand(0,
                S))
            g.lineTo(rand(0,
                S),
            rand(0,
                S))
            g.closePath()
            g.fill()
        }
        g.restore()
    }
    return Texture.from(c)
}

/** Búa rèn: đầu đá sắt gồ ghề, mặt đập nung đỏ, vết nứt dung nham và xoắn ốc chữ rèn như icon chiêu; cán quấn da. Vẽ đầu búa ở trên, mặt đập ở mép trên; lúc dùng xoay ngược để mặt đập quay xuống */
function hammerTexture(): Texture {
    const W = 200, H = 400
    const c = document.createElement("canvas")
    c.width = W
    c.height = H
    const g = c.getContext("2d")
    if (!g) return Texture.from(c)
    const shaft = g.createLinearGradient(W / 2 - 13,
        0,
        W / 2 + 13,
        0)
    shaft.addColorStop(0,
        "#1a100c")
    shaft.addColorStop(.45,
        "#4a3226")
    shaft.addColorStop(1,
        "#120a08")
    g.fillStyle = shaft
    g.fillRect(W / 2 - 13,
        110,
        26,
        H - 118)
    g.fillStyle = "rgba(0,0,0,.55)"
    for (let y = 190; y < H - 12; y += 15) g.fillRect(W / 2 - 14,
        y + (y % 3),
        28,
        5)
    const head = [[10,
        44],
    [26,
        20],
    [64,
        12],
    [96,
        18],
    [140,
        8],
    [176,
        22],
    [192,
        52],
    [186,
        96],
    [190,
        128],
    [150,
        142],
    [104,
        134],
    [62,
        146],
    [22,
        136],
    [8,
        102]]
    const trace = () => {
        g.beginPath()
        head.forEach(([x,
            y], i) => (i ? g.lineTo(x,
            y) : g.moveTo(x,
            y)))
        g.closePath()
    }
    trace()
    const stone = g.createLinearGradient(0,
        8,
        0,
        146)
    stone.addColorStop(0,
        "#5a463c")
    stone.addColorStop(.5,
        "#30221c")
    stone.addColorStop(1,
        "#150d0a")
    g.fillStyle = stone
    g.fill()
    g.save()
    g.clip()
    for (let i = 0; i < 90; i++) {
        const v = rand(0,
            1) < .5 ? "0,0,0" : "150,120,100"
        g.fillStyle = `rgba(${v},${rand(.05,
            .2).toFixed(2)})`
        g.fillRect(rand(0,
            W),
        rand(0,
            150),
        rand(6,
            34),
        rand(3,
            14))
    }
    const face = g.createLinearGradient(0,
        8,
        0,
        72)
    face.addColorStop(0,
        "rgba(255,240,180,1)")
    face.addColorStop(.3,
        "rgba(255,150,40,.9)")
    face.addColorStop(1,
        "rgba(255,70,10,0)")
    g.fillStyle = face
    g.fillRect(0,
        0,
        W,
        80)
    g.restore()
    g.lineCap = "round"
    g.shadowColor = "#ff6a14"
    g.shadowBlur = 16
    g.strokeStyle = "#ffb040"
    g.lineWidth = 6
    g.beginPath()
    g.moveTo(122,
        76)
    g.bezierCurveTo(146,
        58,
        112,
        40,
        98,
        66)
    g.bezierCurveTo(84,
        98,
        136,
        118,
        158,
        76)
    g.stroke()
    g.lineWidth = 3
    for (const [x0,
        y0,
        x1,
        y1,
        x2,
        y2] of [[70,
            34,
            84,
            54,
            72,
            74],
        [166,
            40,
            150,
            34,
            140,
            22],
        [86,
            118,
            110,
            112,
            124,
            128],
        [176,
            110,
            164,
            100,
            168,
            86]]) {
        g.beginPath()
        g.moveTo(x0,
            y0)
        g.quadraticCurveTo(x1,
            y1,
            x2,
            y2)
        g.stroke()
    }
    return Texture.from(c)
}

let lump: Texture | undefined
let rocks: Texture[] | undefined
let hammer: Texture | undefined
const lumpTex = () => (lump ??= lumpTexture())
const rockTex = () => pick(rocks ??= [rockTexture(),
    rockTexture(),
    rockTexture()])
const hammerTex = () => (hammer ??= hammerTexture())

/** Trần số hạt dung nham đang sống; máy yếu thì bớt hạt như bộ bụi */
const MAX_MAGMA = 6000
let liveMagma = 0
const quality = () => Math.max(.3,
    Math.min(1,
        (Ticker.shared.FPS - 25) / 30))

interface MagmaOpts {
    /** Dải nguội theo tuổi hạt */
    ramp?: Uint32Array;
    /** Mảnh đá gồ ghề thay vì cục dung nham mềm */
    rock?: boolean;
    speed?: [number, number];
    angle?: [number, number];
    /** Dương là rơi xuống: dung nham nặng */
    gravity?: number;
    drag?: number;
    life?: [number, number];
    /** Đường kính lúc đầu và lúc cuối (px) */
    size?: [number, number];
    alpha?: number;
    spread?: number;
    /** Rải thêm theo chiều ngang */
    wide?: number;
    /** Kéo dài theo hướng bay: giọt dung nham đang văng */
    stretch?: number;
}
interface Blob { p: Particle; vx: number; vy: number; age: number; life: number; s0: number; s1: number; a: number; spin: number }

function spawn(host: ParticleContainer, tex: Texture, list: Blob[], pt: Pt, o: MagmaOpts, lut: Uint32Array) {
    if (liveMagma >= MAX_MAGMA || Math.random() > quality()) return
    const [sp0,
        sp1] = o.speed ?? [60,
        240]
    const [an0,
        an1] = o.angle ?? UP
    const [l0,
        l1] = o.life ?? [320,
        700]
    const [z0,
        z1] = o.size ?? [20,
        8]
    const ang = rand(an0,
        an1)
    const spd = rand(sp0,
        sp1)
    const r = Math.sqrt(Math.random()) * (o.spread ?? 0)
    const pa = rand(0,
        TAU)
    const k = rand(.6,
        1.4)
    const p = new Particle({
        texture: tex, anchorX: .5, anchorY: .5,
        x: pt.x + Math.cos(pa) * r + rand(-1,
            1) * (o.wide ?? 0),
        y: pt.y + Math.sin(pa) * r,
        tint: lut[0], alpha: 0, rotation: rand(0,
            TAU)
    })
    host.addParticle(p)
    liveMagma++
    list.push({
        p, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, age: 0, life: rand(l0,
            l1),
        s0: z0 * k / tex.width, s1: z1 * k / tex.width, a: (o.alpha ?? 1) * rand(.7,
            1),
        spin: o.rock ? rand(-7,
            7) : rand(-1.4,
            1.4)
    })
}

function cool(layer: Container, host: ParticleContainer, list: Blob[], o: MagmaOpts, lut: Uint32Array, more: (ms: number) => boolean): Promise<void> {
    return new Promise((resolve) => {
        let done = false
        const finish = () => {
            if (done) return
            done = true
            Ticker.shared.remove(tick)
            layer.off("destroyed",
                finish)
            liveMagma = Math.max(0,
                liveMagma - list.length)
            list.length = 0
            if (!host.destroyed) host.destroy()
            resolve()
        }
        const gravity = o.gravity ?? 700
        const drag = o.drag ?? .9
        const tick = (tk: Ticker) => {
            if (layer.destroyed || host.destroyed) { finish(); return }
            const dt = tk.deltaMS / 1000
            const going = more(tk.deltaMS)
            const keep = Math.max(0,
                1 - drag * dt)
            let removed = false
            for (let i = list.length - 1; i >= 0; i--) {
                const m = list[i]
                m.age += tk.deltaMS
                const t = m.age / m.life
                if (t >= 1) {
                    host.removeParticle(m.p)
                    list[i] = list[list.length - 1]
                    list.pop()
                    liveMagma--
                    removed = true
                    continue
                }
                const p = m.p
                m.vy += gravity * dt
                m.vx *= keep
                m.vy *= keep
                p.x += m.vx * dt
                p.y += m.vy * dt
                const sc = lerp(m.s0,
                    m.s1,
                    t)
                if (o.stretch) {
                    p.rotation = Math.atan2(m.vy,
                        m.vx)
                    p.scaleX = sc * (1 + o.stretch * Math.min(1,
                        Math.hypot(m.vx,
                            m.vy) / 500))
                    p.scaleY = sc
                } else {
                    p.rotation += m.spin * dt
                    p.scaleX = sc
                    p.scaleY = sc
                }
                p.tint = lut[Math.min(LUT_SIZE - 1,
                    Math.floor(t * LUT_SIZE))]
                p.alpha = m.a * Math.min(1,
                    t * 14) * (t < .72 ? 1 : (1 - t) / .28)
            }
            if (removed) host.update()
            if (!list.length && !going) finish()
        }
        if (layer.destroyed) { finish(); return }
        layer.once("destroyed",
            finish)
        Ticker.shared.add(tick)
    })
}

function magmaHost(layer: Container, o: MagmaOpts, lut: Uint32Array) {
    const tex = o.rock ? rockTex() : lumpTex()
    const host = new ParticleContainer({
        texture: tex,
        dynamicProperties: {
            position: true, vertex: true, rotation: true, color: true
        }
    })
    // chỉ dải sáng mới cộng màu; vỏ và đá là vật liệu đặc, phải đè được lên nền sáng
    host.blendMode = lut === MOLTEN ? "add" : "normal"
    layer.addChild(host)
    return {
        tex, host
    }
}

function magmaBurst(layer: Container, pt: Pt, count: number, o: MagmaOpts): Promise<void> {
    if (layer.destroyed) return Promise.resolve()
    const lut = o.ramp ?? MOLTEN
    const {
        tex, host
    } = magmaHost(layer,
        o,
        lut)
    const list: Blob[] = []
    for (let i = 0; i < count; i++) spawn(host,
        tex,
        list,
        pt,
        o,
        lut)
    return cool(layer,
        host,
        list,
        o,
        lut,
        () => false)
}

function magmaStream(layer: Container, getPt: () => Pt, ms: number, perSec: number, o: MagmaOpts): Promise<void> {
    if (layer.destroyed) return Promise.resolve()
    const lut = o.ramp ?? MOLTEN
    const {
        tex, host
    } = magmaHost(layer,
        o,
        lut)
    const list: Blob[] = []
    let el = 0
    let acc = 0
    return cool(layer,
        host,
        list,
        o,
        lut,
        (d) => {
            if (el >= ms) return false
            el += d
            acc += d / 1000 * perSec
            while (acc >= 1) {
                acc -= 1
                spawn(host,
                    tex,
                    list,
                    getPt(),
                    o,
                    lut)
            }
            return el < ms
        })
}

const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)

/** Tâm các ô đồ: lấy từ `to`, không có thì suy từ tâm lá tướng */
const slotsOf = (ctx: VfxCtx): Pt[] => ctx.to.length ? ctx.to : [-SLOT_DX,
    0,
    SLOT_DX].map(dx => ({
    x: ctx.from.x + dx, y: ctx.from.y + SLOT_DY
}))

const rowCenter = (slots: Pt[]): Pt => ({
    x: slots.reduce((sum, p) => sum + p.x,
        0) / slots.length,
    y: slots.reduce((sum, p) => sum + p.y,
        0) / slots.length
})

const smoke = (layer: Container, pt: Pt, size: number, alpha = .5) => mist(layer,
    pt,
    {
        color: SOOT, size, alpha, additive: false, gravity: -70, life: [640,
            1200], speed: [10,
            70], count: 12
    })

/** Tia lửa thép văng khi búa nện: mảnh sắc trắng vàng cộng vệt dài */
const hammerSparks = (layer: Container, pt: Pt, count: number, power = 1, spread = 10) => Promise.all([
    dustBurst(layer,
        pt,
        {
            count: Math.round(count * .4), blade: true, color: SPARK, speed: [260 * power,
                820 * power], angle: FAN,
            gravity: 900, drag: 1.2, flow: 14, life: [260,
                620], size: [24,
                8], alpha: 1, spread
        }),
    dustBurst(layer,
        pt,
        {
            count, color: SPARK, streak: 5, speed: [160 * power,
                760 * power], angle: FAN,
            gravity: 820, drag: 1, flow: 20, life: [300,
                760], size: [6,
                1.6], alpha: 1, spread
        })
])

/** Giọt dung nham văng lên rồi rơi nặng xuống */
const lavaSpatter = (layer: Container, pt: Pt, count: number, power = 1, angle: [number, number] = FAN, spread = 20) => Promise.all([
    magmaBurst(layer,
        pt,
        count,
        {
            speed: [180 * power,
                640 * power], angle, gravity: 1150, drag: .5, life: [340,
                760], size: [17,
                6], stretch: 1.3, spread
        }),
    magmaBurst(layer,
        pt,
        Math.round(count * .22),
        {
            ramp: CRUST, speed: [140 * power,
                520 * power], angle, gravity: 1150, drag: .5, life: [420,
                860], size: [13,
                6], stretch: 1, spread
        })
])

const rockBurst = (layer: Container, pt: Pt, count: number, power = 1, spread = 30) => magmaBurst(layer,
    pt,
    count,
    {
        rock: true, ramp: ROCK, speed: [200 * power,
            640 * power], angle: FAN, gravity: 1250, drag: .4, life: [520,
            980], size: [30,
            16], spread
    })

const loadIcon = async (src?: string): Promise<Texture | null> => {
    if (!src) return null
    try {
        return await Assets.load<Texture>(src)
    } catch {
        return null
    }
}

/** Búa rèn nện thẳng đứng xuống `at`: đầu búa quay xuống, nhấc thẳng lên ngay trên mục tiêu rồi đập thẳng xuống, không nghiêng. Cả búa luôn nằm trong màn hình; chạm là báo nhịp */
async function swing(ctx: VfxCtx, at: Pt, reach: number, ms: number) {
    // chiều cao cần: tầm nhấc cộng trọn búa; mục tiêu sát mép trên thì thu nhỏ búa chứ không để lọt ra ngoài
    const RISE = .42
    const MARGIN = 12
    const len = Math.min(reach,
        (at.y - MARGIN) / (1 + RISE))
    const half = len * .25
    const x = Math.max(half + MARGIN,
        Math.min(ctx.app.screen.width - half - MARGIN,
            at.x))
    const low = at.y - len * .175
    const high = low - len * RISE
    let y = low - len * RISE * .35
    const head = (): Pt => ({
        x, y
    })
    const hot = () => ({
        x: x + rand(-1,
            1) * len * .2, y: y + rand(-1,
            1) * len * .13
    })
    const streams = Promise.all([
        dustStream(ctx.layer,
            head,
            ms,
            46,
            {
                puff: true, color: SOOT, speed: [6,
                    40], gravity: -50, life: [300,
                    620], size: [len * .2,
                    len * .5], alpha: .4, flow: 18, additive: false
            }),
        magmaStream(ctx.layer,
            hot,
            ms,
            420,
            {
                speed: [10,
                    90], angle: ALL, gravity: 260, life: [160,
                    380], size: [len * .11,
                    len * .035], alpha: .9
            }),
        dustStream(ctx.layer,
            hot,
            ms,
            320,
            {
                color: EMBER, speed: [20,
                    150], angle: ALL, gravity: 120, life: [260,
                    620], size: [5,
                    1.3], alpha: 1, flow: 60
            })
    ])
    const glow = makeSprite(ctx.layer,
        "glow",
        x,
        y,
        ORANGE,
        len * .95)
    const tool = new Sprite(hammerTex())
    tool.anchor.set(.5,
        .19)
    tool.width = len * .5
    tool.height = len
    tool.position.set(x,
        y)
    tool.rotation = Math.PI
    tool.alpha = 0
    ctx.layer.addChild(tool)
    const start = y
    const lift = .52
    await Promise.all([
        streams,
        tween(ms,
            (t) => {
                y = t < lift ? lerp(start,
                    high,
                    ease.out(t / lift)) : lerp(high,
                    low,
                    Math.pow((t - lift) / (1 - lift),
                        3))
                if (!tool.destroyed) {
                    tool.position.set(x,
                        y)
                    tool.alpha = Math.min(1,
                        t * 7)
                }
                if (!glow.destroyed) {
                    glow.position.set(x,
                        y)
                    glow.alpha = .3 + t * .4
                }
            },
            ease.linear,
            ctx.layer).then(async () => {
            ctx.onBeat?.()
            await tween(220,
                (t) => {
                    if (!tool.destroyed) {
                        tool.position.set(x,
                            low - len * .06 * Math.sin(t * Math.PI * .6))
                        tool.alpha = 1 - t
                    }
                    if (!glow.destroyed) glow.alpha = .7 * (1 - t)
                },
                ease.linear,
                ctx.layer)
        })
    ])
}

const HOT_SIZE = 128
const softened = new Map<string, Texture>()
/** Bo mềm góc ảnh lá để lá không thành ô vuông cứng giữa lửa */
function softCard(tex: Texture, key: string): Texture {
    const known = softened.get(key)
    if (known) return known
    const c = document.createElement("canvas")
    c.width = HOT_SIZE
    c.height = HOT_SIZE
    const g = c.getContext("2d")
    const art = tex.source.resource as CanvasImageSource | undefined
    if (!g || !art) return tex
    g.drawImage(art,
        0,
        0,
        HOT_SIZE,
        HOT_SIZE)
    g.globalCompositeOperation = "destination-in"
    g.filter = "blur(5px)"
    g.beginPath()
    g.roundRect(7,
        7,
        HOT_SIZE - 14,
        HOT_SIZE - 14,
        20)
    g.fill()
    const out = Texture.from(c)
    softened.set(key,
        out)
    return out
}

let plate: Texture | undefined
/** Tấm nung: lõi cam vàng, mép mềm, cộng màu lên lá để phần ảnh tối cũng phát sáng */
function hotPlate(): Texture {
    if (plate) return plate
    const c = document.createElement("canvas")
    c.width = HOT_SIZE
    c.height = HOT_SIZE
    const g = c.getContext("2d")
    if (g) {
        const grad = g.createRadialGradient(HOT_SIZE / 2,
            HOT_SIZE / 2,
            8,
            HOT_SIZE / 2,
            HOT_SIZE / 2,
            HOT_SIZE * .62)
        grad.addColorStop(0,
            "#ffd070")
        grad.addColorStop(1,
            "#ff4a08")
        g.filter = "blur(5px)"
        g.fillStyle = grad
        g.beginPath()
        g.roundRect(7,
            7,
            HOT_SIZE - 14,
            HOT_SIZE - 14,
            20)
        g.fill()
    }
    return plate = Texture.from(c)
}

/** Vật rèn còn nung đỏ bay tới `to`: lúc đầu trắng rực, tới nơi nguội về màu thật, nhỏ dung nham dọc đường */
async function hotFlight(ctx: VfxCtx, to: Pt, ms: number, size: [number, number], arch: number) {
    const tex = await loadIcon(ctx.icon)
    if (ctx.layer.destroyed) return
    const peak = {
        x: lerp(ctx.from.x,
            to.x,
            .5), y: Math.min(ctx.from.y,
            to.y) - arch
    }
    let p = {
        ...ctx.from
    }
    const scale = size[0] / 110
    const edge = () => ({
        x: p.x + rand(-1,
            1) * size[0] * .4, y: p.y + rand(-1,
            1) * size[0] * .4
    })
    const trail = Promise.all([
        dustStream(ctx.layer,
            () => p,
            ms,
            60,
            {
                puff: true, color: SOOT, speed: [4,
                    26], gravity: -40, life: [340,
                    700], size: [34 * scale,
                    90 * scale], alpha: .42, flow: 18, additive: false
            }),
        magmaStream(ctx.layer,
            edge,
            ms,
            340,
            {
                speed: [6,
                    60], angle: ALL, gravity: 760, life: [260,
                    560], size: [15 * scale,
                    5], stretch: 1
            }),
        dustStream(ctx.layer,
            edge,
            ms,
            420,
            {
                color: EMBER, speed: [20,
                    130], gravity: 200, life: [280,
                    640], size: [5.5,
                    1.4], alpha: 1, flow: 40
            })
    ])
    const glow = makeSprite(ctx.layer,
        "glow",
        p.x,
        p.y,
        ORANGE,
        size[0] * 2.5)
    const core = makeSprite(ctx.layer,
        "glow",
        p.x,
        p.y,
        WHITE_HOT,
        size[0] * 1.5)
    let card: Sprite | undefined
    let heat: Sprite | undefined
    if (tex) {
        card = new Sprite(softCard(tex,
            ctx.icon ?? ""))
        heat = new Sprite(hotPlate())
        for (const s of [card,
            heat]) {
            s.anchor.set(.5)
            s.width = size[0]
            s.height = size[0]
            ctx.layer.addChild(s)
        }
        heat.blendMode = "add"
    }
    await Promise.all([
        trail,
        tween(ms,
            (t) => {
                const a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t
                p = {
                    x: a * ctx.from.x + b * peak.x + c * to.x, y: a * ctx.from.y + b * peak.y + c * to.y
                }
                const w = lerp(size[0],
                    size[1],
                    t * t)
                // sắt nguội dần: cam rực về màu thật
                const cold = t * t
                if (card && !card.destroyed) {
                    card.position.set(p.x,
                        p.y)
                    card.width = w
                    card.height = w
                    card.rotation = Math.sin(t * 9) * .16
                    card.tint = (255 << 16) | (Math.round(lerp(150,
                        255,
                        cold)) << 8) | Math.round(lerp(70,
                        255,
                        cold))
                }
                if (heat && !heat.destroyed) {
                    heat.position.set(p.x,
                        p.y)
                    heat.width = w
                    heat.height = w
                    heat.rotation = card?.rotation ?? 0
                    heat.alpha = 1 - cold * .85
                }
                if (!glow.destroyed) {
                    glow.position.set(p.x,
                        p.y)
                    glow.alpha = .62 - t * .22
                }
                if (!core.destroyed) {
                    core.position.set(p.x,
                        p.y)
                    core.alpha = .6 * (1 - cold)
                }
            },
            ease.inOut,
            ctx.layer).then(() => {
            if (ctx.layer.destroyed) return
            for (const s of [card,
                heat,
                glow,
                core]) if (s && !s.destroyed) s.destroy()
            ctx.onBeat?.()
            void bloom(ctx.layer,
                to,
                AMBER,
                size[1] * 2.6,
                280)
            void dustBurst(ctx.layer,
                to,
                {
                    count: 90, color: SPARK, streak: 4, speed: [80,
                        360], angle: FAN, gravity: 620, life: [240,
                        560], size: [5,
                        1.4], alpha: 1, spread: size[1] * .3
                })
        })
    ])
}

/** E và R mở màn (Quick): ống bễ phụt, lửa lò bùng lên quanh Ornn trong tích tắc */
registerVfx("ornnForgeFlare",
    async (ctx) => {
        const k = kOf(ctx)
        const base = {
            x: ctx.from.x, y: ctx.from.y + CARD_H * .8
        }
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ORANGE,
                300 * k,
                320),
            smoke(ctx.layer,
                base,
                130 * k,
                .36),
            magmaBurst(ctx.layer,
                base,
                110,
                {
                    speed: [320,
                        900], gravity: -240, drag: 1.6, life: [180,
                        380], size: [20 * k,
                        5], alpha: .62, stretch: 2.2, wide: CARD_W * .95
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 200, color: EMBER, speed: [60,
                        320], angle: UP, gravity: -120, drag: 1, flow: 80, life: [340,
                        760], size: [5,
                        1.3], alpha: 1, spread: CARD_W
                })
        ])
    })

/** Q mở màn: Ornn nện đất, đất nứt, dung nham phụt quanh chân */
registerVfx("ornnRuptureSlam",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(5,
            190)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ORANGE,
                300 * k,
                300),
            smoke(ctx.layer,
                ctx.from,
                170 * k,
                .42),
            lavaSpatter(ctx.layer,
                ctx.from,
                130,
                .85,
                FAN,
                50),
            rockBurst(ctx.layer,
                ctx.from,
                9,
                .7,
                50)
        ])
    })

/** Q: khe nứt dung nham chạy trên mặt đất từ Ornn tới chân mục tiêu, đá bật lên hai bên; tới nơi là báo nhịp trúng */
registerVfx("ornnRupture",
    async (ctx) => {
        const k = kOf(ctx)
        const to = ctx.to[0] ?? ctx.from
        const dx = to.x - ctx.from.x, dy = to.y - ctx.from.y
        const span = Math.hypot(dx,
            dy) || 1
        const ux = dx / span, uy = dy / span
        const a = {
            x: ctx.from.x + ux * 70, y: ctx.from.y + uy * 70
        }
        const b = {
            x: to.x, y: to.y + (dy < 0 ? CARD_H * .8 : -CARD_H * .8)
        }
        const ms = 430
        let u = 0
        // khe nứt ngoằn ngoèo: tổng hai sóng lệch nhau theo quãng đường
        const crack = (v: number, off = 0): Pt => {
            const bend = (Math.sin(v * 15) * 13 + Math.sin(v * 37 + 1) * 7) * Math.sin(v * Math.PI) + off
            return {
                x: lerp(a.x,
                    b.x,
                    v) - uy * bend, y: lerp(a.y,
                    b.y,
                    v) + ux * bend
            }
        }
        const fresh = (w: number) => () => crack(Math.max(0,
            u - rand(0,
                .1)),
        rand(-w,
            w) * k)
        const lip = () => crack(u,
            pick([-1,
                1]) * rand(14,
                26) * k)
        await Promise.all([
            magmaStream(ctx.layer,
                fresh(7),
                ms,
                5200,
                {
                    speed: [2,
                        18], angle: ALL, gravity: 0, drag: 3, life: [420,
                        820], size: [12 * k,
                        5], alpha: .9
                }),
            magmaStream(ctx.layer,
                fresh(3),
                ms,
                2200,
                {
                    speed: [0,
                        10], angle: ALL, gravity: 0, drag: 3, life: [200,
                        400], size: [8 * k,
                        4], alpha: 1
                }),
            magmaStream(ctx.layer,
                () => crack(u,
                    rand(-14,
                        14) * k),
                ms,
                1500,
                {
                    ramp: CRUST, speed: [0,
                        12], angle: ALL, gravity: 0, drag: 3, life: [520,
                        960], size: [9 * k,
                        6], alpha: .85
                }),
            magmaStream(ctx.layer,
                lip,
                ms,
                90,
                {
                    rock: true, ramp: ROCK, speed: [120,
                        340], angle: FAN, gravity: 1200, drag: .4, life: [300,
                        560], size: [15 * k,
                        8], alpha: 1
                }),
            magmaStream(ctx.layer,
                lip,
                ms,
                280,
                {
                    speed: [120,
                        400], angle: FAN, gravity: 1050, drag: .5, life: [240,
                        520], size: [12,
                        5], stretch: 1.2
                }),
            dustStream(ctx.layer,
                () => crack(u),
                ms,
                900,
                {
                    color: SPARK, streak: 4, speed: [60,
                        300], angle: FAN, gravity: 640, life: [200,
                        480], size: [5,
                        1.4], alpha: 1, flow: 20, spread: 12
                }),
            dustStream(ctx.layer,
                () => crack(u),
                ms,
                60,
                {
                    puff: true, color: SOOT, speed: [6,
                        40], gravity: -70, life: [420,
                        760], size: [50,
                        120], alpha: .4, flow: 18, additive: false
                }),
            tween(ms,
                (t) => { u = t },
                ease.in,
                ctx.layer).then(() => ctx.onBeat?.())
        ])
    })

/** Q trúng: cột dung nham phụt thẳng lên từ chân tướng, đá trụ vỡ văng, nung đỏ cả lá */
registerVfx("ornnMagmaPillar",
    async (ctx) => {
        const k = kOf(ctx)
        const base = ctx.from.y + CARD_H * .95
        const reach = 340 * k
        let top = base
        const body = () => {
            const v = Math.random()
            return {
                x: ctx.from.x + rand(-1,
                    1) * lerp(62,
                    38,
                    v) * k, y: lerp(base,
                    top,
                    v)
            }
        }
        const foot = {
            x: ctx.from.x, y: base
        }
        ctx.shake(8,
            260)
        await Promise.all([
            smoke(ctx.layer,
                ctx.from,
                230 * k,
                .6),
            bloom(ctx.layer,
                ctx.from,
                ORANGE,
                460 * k,
                420),
            bloom(ctx.layer,
                ctx.from,
                WHITE_HOT,
                240 * k,
                260),
            tween(150,
                (t) => { top = base - reach * t },
                ease.out,
                ctx.layer),
            // thân cột: vỏ đặc che nền, dung nham sáng phụt trong lõi
            magmaStream(ctx.layer,
                body,
                400,
                1100,
                {
                    ramp: CRUST, speed: [180,
                        520], gravity: -160, drag: 1.2, life: [240,
                        500], size: [30 * k,
                        14], alpha: .95, stretch: 2
                }),
            magmaStream(ctx.layer,
                body,
                440,
                1700,
                {
                    speed: [380,
                        1000], gravity: -240, drag: 1.1, life: [200,
                        440], size: [28 * k,
                        8], alpha: .8, stretch: 2.6
                }),
            magmaStream(ctx.layer,
                () => ({
                    x: ctx.from.x + rand(-20,
                        20) * k, y: base - rand(0,
                        reach * .9)
                }),
                320,
                900,
                {
                    speed: [420,
                        1100], gravity: -300, drag: 1, life: [130,
                        280], size: [20 * k,
                        6], alpha: .9, stretch: 3
                }),
            // đá trụ đứng một thoáng rồi vỡ
            magmaStream(ctx.layer,
                body,
                380,
                90,
                {
                    rock: true, ramp: ROCK, speed: [20,
                        160], gravity: 620, drag: .6, life: [520,
                        900], size: [30 * k,
                        14], alpha: 1
                }),
            rockBurst(ctx.layer,
                foot,
                26,
                1.2,
                56),
            lavaSpatter(ctx.layer,
                foot,
                240,
                1.25,
                FAN,
                44),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 420, color: EMBER, speed: [90,
                        620], angle: ALL, gravity: -130, drag: 1.1, flow: 90, life: [480,
                        1150], size: [5.5,
                        1.3], alpha: 1, spread: 60 * k
                })
        ])
    })

/** Q và R: lá vừa rèn nung đỏ bay lên tay. `from` nơi rèn, `to[0]` chỗ lá trên tay, ctx.icon ảnh lá */
registerVfx("ornnForgedCard",
    async (ctx) => {
        const to = ctx.to[0] ?? {
            x: ctx.app.screen.width / 2, y: ctx.app.screen.height - 60
        }
        await hotFlight(ctx,
            to,
            780,
            [118,
                82],
            170)
    })

/** R: món vừa rèn rơi vào ô đồ, trắng rực rồi nguội. `from` điểm búa nện, `to[0]` tâm ô */
registerVfx("ornnForgedItem",
    async (ctx) => {
        await hotFlight(ctx,
            ctx.to[0] ?? ctx.from,
            300,
            [96,
                26],
            26)
    })

/** E: dòng thép nóng chảy từ Ornn sang đồng minh, búa nhỏ nện xuống hàng ô đồ; búa chạm là báo nhịp */
registerVfx("ornnRefine",
    async (ctx) => {
        const k = kOf(ctx)
        const to = ctx.to[0] ?? ctx.from
        const ms = 560
        const dx = to.x - ctx.from.x
        const dy = to.y - ctx.from.y
        let u = 0
        const at = (off: number): Pt => {
            const v = Math.max(0,
                u - off)
            return {
                x: ctx.from.x + dx * v, y: ctx.from.y + dy * v - Math.sin(v * Math.PI) * 54
            }
        }
        const row = {
            x: to.x, y: to.y + SLOT_DY
        }
        await Promise.all([
            magmaStream(ctx.layer,
                () => at(rand(0,
                    .14)),
                ms * .6,
                800,
                {
                    speed: [4,
                        40], angle: ALL, gravity: 300, life: [180,
                        420], size: [20 * k,
                        6], alpha: 1, spread: 10
                }),
            dustStream(ctx.layer,
                () => at(rand(0,
                    .2)),
                ms * .6,
                500,
                {
                    color: EMBER, speed: [20,
                        120], gravity: 180, life: [240,
                        560], size: [5,
                        1.3], alpha: 1, flow: 40, spread: 12
                }),
            tween(ms * .6,
                (t) => { u = t },
                ease.inOut,
                ctx.layer),
            swing(ctx,
                row,
                200 * k,
                ms)
        ])
    })

/** E trúng: mỗi ô đồ một chùm tia búa, đồ thành Kiệt Tác, bụi vàng bốc lên. `to` là các ô đồ */
registerVfx("ornnMasterwork",
    async (ctx) => {
        const k = kOf(ctx)
        const slots = slotsOf(ctx)
        const mid = rowCenter(slots)
        ctx.shake(5,
            170)
        await Promise.all([
            bloom(ctx.layer,
                mid,
                AMBER,
                230 * k,
                340),
            bloom(ctx.layer,
                mid,
                WHITE_HOT,
                130 * k,
                220),
            ...slots.flatMap((slot) => [
                hammerSparks(ctx.layer,
                    slot,
                    Math.round(150 * k),
                    1,
                    8),
                bloom(ctx.layer,
                    slot,
                    WHITE_HOT,
                    74,
                    300)
            ]),
            dustBurst(ctx.layer,
                mid,
                {
                    count: 200, color: GOLD, speed: [24,
                        110], angle: UP, gravity: -170, drag: 1, flow: 44, life: [560,
                        1150], size: [5.5,
                        1.5], alpha: 1, spread: 54 * k
                })
        ])
    })

/** E: Khiên dung nham chảy phủ lá tướng: vỏ nguội sẫm bám mép lá thành mảng không đều, mạch sáng chảy xuống mặt lá; ctx.amount là số món đồ, nhiều đồ khiên dày hơn */
registerVfx("ornnMoltenShield",
    async (ctx) => {
        const k = kOf(ctx)
        const thick = 1 + Math.min(3,
            ctx.amount ?? 1) * .24
        const w = (CARD_W + 6) * k, h = (CARD_H + 8) * k
        const ms = 760
        const phase = rand(0,
            TAU)
        /** Một điểm trên mép lá, gồ ra vào theo hai sóng lệch nên mép là các mảng chảy, không thành đường viền */
        const rim = (inward: number): Pt => {
            const v = Math.random()
            const flip = Math.random() < .5 ? -1 : 1
            const lump = Math.sin(v * 9 + phase) * 11 + Math.sin(v * 23 + phase * 2) * 7 - rand(0,
                inward)
            return Math.random() < w / (w + h)
                ? {
                    x: ctx.from.x + (v * 2 - 1) * w, y: ctx.from.y + flip * (h + lump)
                }
                : {
                    x: ctx.from.x + flip * (w + lump), y: ctx.from.y + (v * 2 - 1) * h
                }
        }
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ORANGE,
                300 * k,
                620),
            mist(ctx.layer,
                ctx.from,
                {
                    color: [ORANGE,
                        0xc8340a,
                        AMBER], size: 190 * k, alpha: .3, life: [560,
                        900], speed: [2,
                        14]
                }),
            magmaStream(ctx.layer,
                () => rim(78),
                ms,
                440 * thick,
                {
                    ramp: CRUST, speed: [2,
                        16], angle: ALL, gravity: 90, drag: 1.4, life: [380,
                        760], size: [24 * thick,
                        12], alpha: .95
                }),
            magmaStream(ctx.layer,
                () => rim(62),
                ms,
                360 * thick,
                {
                    speed: [2,
                        18], angle: ALL, gravity: 150, drag: 1.2, life: [220,
                        500], size: [11 * thick,
                        4], alpha: .8
                }),
            // mạch dung nham chảy từ mép trên xuống mặt lá
            magmaStream(ctx.layer,
                () => ({
                    x: ctx.from.x + rand(-1,
                        1) * w * .9, y: ctx.from.y - h + rand(-6,
                        22)
                }),
                ms,
                240 * thick,
                {
                    speed: [30,
                        90], angle: [Math.PI * .46,
                        Math.PI * .54], gravity: 260, drag: .4, life: [420,
                        760], size: [10,
                        5], alpha: .85, stretch: 1.4
                }),
            magmaStream(ctx.layer,
                () => ({
                    x: ctx.from.x + rand(-w,
                        w), y: ctx.from.y + h * rand(.8,
                        1)
                }),
                ms,
                200,
                {
                    speed: [10,
                        50], angle: [Math.PI * .4,
                        Math.PI * .6], gravity: 900, life: [280,
                        560], size: [11,
                        5], stretch: 1.2
                }),
            dustStream(ctx.layer,
                () => rim(10),
                ms,
                300,
                {
                    color: EMBER, speed: [14,
                        80], angle: UP, gravity: -120, life: [400,
                        820], size: [5,
                        1.3], alpha: 1, flow: 44
                })
        ])
    })

/** E: Khiên dung nham đỡ đòn, vỏ nứt toé ngược về phía `to[0]` */
registerVfx("ornnShieldBlock",
    async (ctx) => {
        const k = kOf(ctx)
        const to = ctx.to[0]
        const toward = to ? Math.atan2(to.y - ctx.from.y,
            to.x - ctx.from.x) : -Math.PI / 2
        const cone: [number, number] = [toward - .9,
            toward + .9]
        ctx.shake(4,
            150)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ORANGE,
                300 * k,
                300),
            bloom(ctx.layer,
                ctx.from,
                WHITE_HOT,
                150 * k,
                200),
            lavaSpatter(ctx.layer,
                ctx.from,
                230,
                1.1,
                cone,
                46),
            magmaBurst(ctx.layer,
                ctx.from,
                26,
                {
                    rock: true, ramp: ROCK, speed: [180,
                        520], angle: cone, gravity: 900, drag: .5, life: [420,
                        760], size: [24,
                        12], spread: 40
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 240, color: SPARK, streak: 4.5, speed: [160,
                        640], angle: cone, gravity: 520, life: [240,
                        560], size: [5.5,
                        1.4], alpha: 1, spread: 36
                })
        ])
    })

/** Nội tại Lò Rèn Sống: hơi nóng từ Ornn lan sang, các ô đồ của đồng minh loé sáng dung nham, kim loại nóng nhỏ giọt. `to` là các ô đồ */
registerVfx("ornnForgeGlint",
    async (ctx) => {
        const ms = 460
        let beat = false
        const glintAt = async (slot: Pt) => {
            let p = {
                ...ctx.from
            }
            await Promise.all([
                dustStream(ctx.layer,
                    () => p,
                    ms,
                    300,
                    {
                        color: EMBER, speed: [6,
                            40], gravity: 60, life: [220,
                            480], size: [6,
                            1.6], alpha: 1, flow: 26, spread: 7
                    }),
                tween(ms,
                    (t) => {
                        p = {
                            x: lerp(ctx.from.x,
                                slot.x,
                                t), y: lerp(ctx.from.y,
                                slot.y,
                                t) - Math.sin(t * Math.PI) * 90
                        }
                    },
                    ease.inOut,
                    ctx.layer)
            ])
            if (!beat) {
                beat = true
                ctx.onBeat?.()
            }
            await Promise.all([
                bloom(ctx.layer,
                    slot,
                    AMBER,
                    170,
                    640),
                bloom(ctx.layer,
                    slot,
                    WHITE_HOT,
                    84,
                    420),
                dustBurst(ctx.layer,
                    slot,
                    {
                        count: 90, color: SPARK, streak: 4, speed: [90,
                            340], angle: FAN, gravity: 560, life: [260,
                            620], size: [5.5,
                            1.4], alpha: 1, spread: 8
                    }),
                magmaStream(ctx.layer,
                    () => ({
                        x: slot.x + rand(-11,
                            11), y: slot.y + 8
                    }),
                    520,
                    150,
                    {
                        speed: [10,
                            40], angle: [Math.PI * .4,
                            Math.PI * .6], gravity: 620, life: [300,
                            620], size: [11,
                            4], stretch: 1.2
                    }),
                dustStream(ctx.layer,
                    () => slot,
                    560,
                    120,
                    {
                        color: GOLD, speed: [20,
                            90], angle: UP, gravity: -130, life: [420,
                            860], size: [5,
                            1.4], alpha: 1, flow: 36, spread: 14
                    })
            ])
        }
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ORANGE,
                300,
                560),
            dustStream(ctx.layer,
                () => ({
                    x: ctx.from.x + rand(-CARD_W,
                        CARD_W), y: ctx.from.y + rand(-CARD_H,
                        CARD_H)
                }),
                ms,
                420,
                {
                    color: EMBER, speed: [20,
                        110], angle: UP, gravity: -120, life: [340,
                        760], size: [5,
                        1.3], alpha: 1, flow: 50
                }),
            ...slotsOf(ctx).map(glintAt)
        ])
    })

/** R: lửa trời tụ trên đầu đồng minh, búa Thần Rèn khổng lồ nhấc lên rồi nện xuống; chạm là báo nhịp */
registerVfx("ornnGodHammer",
    async (ctx) => {
        const k = kOf(ctx)
        const to = ctx.to[0] ?? ctx.from
        const at = {
            x: to.x, y: to.y + 26
        }
        const ms = 900
        await Promise.all([
            smoke(ctx.layer,
                {
                    x: to.x, y: to.y - 130
                },
                220 * k,
                .32),
            dustStream(ctx.layer,
                () => ({
                    x: to.x + rand(-170,
                        170) * k, y: to.y + rand(-210,
                        120) * k
                }),
                ms * .9,
                900,
                {
                    color: EMBER, speed: [20,
                        120], angle: UP, gravity: -160, life: [320,
                        720], size: [5.5,
                        1.4], alpha: 1, flow: 70
                }),
            swing(ctx,
                at,
                262 * k,
                ms)
        ])
    })

/** R trúng: lò rèn nổ sáng trắng tại đồng minh, thép và dung nham văng, không có sát thương nên không có đá vỡ nặng */
registerVfx("ornnForgeBurst",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.shake(12,
            420)
        await Promise.all([
            smoke(ctx.layer,
                ctx.from,
                260 * k,
                .36),
            bloom(ctx.layer,
                ctx.from,
                ORANGE,
                760 * k,
                520),
            bloom(ctx.layer,
                ctx.from,
                WHITE_HOT,
                420 * k,
                340),
            hammerSparks(ctx.layer,
                ctx.from,
                640,
                1.35,
                30),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 220, blade: true, color: SPARK, speed: [320,
                        1100], angle: ALL, gravity: 460, drag: 1.5, flow: 14, life: [240,
                        560], size: [26,
                        8], alpha: 1, spread: 24
                }),
            lavaSpatter(ctx.layer,
                ctx.from,
                260,
                1.15,
                ALL,
                40),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 420, color: GOLD, speed: [60,
                        300], angle: ALL, gravity: -90, drag: 1.2, flow: 70, life: [560,
                        1250], size: [5.5,
                        1.4], alpha: 1, spread: 90 * k
                })
        ])
    })
