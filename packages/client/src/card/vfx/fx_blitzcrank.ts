// VFX riêng của Blitzcrank, chất liệu ROBOT HƠI NƯỚC: nắm đấm đồng thau tên lửa kéo xích thép, hơi nước trắng, tia lửa hàn, sét xanh lam của Trường Điện Từ. Vật thể là sprite vẽ sẵn, không dùng nét vẽ hình học.
// Mỗi hiệu ứng chỉ dựa vào VfxCtx và tự dọn khi layer bị huỷ; trúng là báo ctx.onBeat, không chờ đuôi hạt tan.
import {
    Container, Sprite, Texture, type Ticker
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
const BRASS = 0xe8a93a
const GOLD = 0xffd36a
const FIRE = 0xff8a2a
const STEAM = 0xf2f6fa
const STEAM_DIM = 0xa9b9c8
const ARC = 0x56cfff
const ARC_DEEP = 0x2a8cff
const ARC_CORE = 0xeafcff
const SOOT = 0x34373f
/** Cuộn xích, tổng thời gian kéo một lá về Blitzcrank; demo khớp nhịp này */
export const BLITZ_DRAG_MS = 460
/** R tụ điện đúng chừng này rồi bùng, không có khoảng trống */
const BLITZ_CHARGE_MS = 440
const FIST_SPEED = 2.5
const FIST_MIN_MS = 240
const FIST_MAX_MS = 460
const FIST_RETRACT_MS = 240
/** Không có tether: nắm đấm giữ mục tiêu đúng chừng này rồi rút về */
const FIST_HOLD_MS = 120
const FIST_SIZE = 116
const TETHER_MAX_MS = 6000
const LINK_GAP = 15
const MAX_LINKS = 80
/** Thời gian Phụ Tùng còn bám trên lá trước khi hoà vào giáp */
const SCRAP_STAY_MS = 620

const kOf = (ctx: VfxCtx) => Math.sqrt(ctx.intensity)
const dist = (a: Pt, b: Pt) => Math.hypot(b.x - a.x,
    b.y - a.y)
const toward = (a: Pt, b: Pt, d: number): Pt => {
    const len = dist(a,
        b) || 1
    return {
        x: a.x + (b.x - a.x) / len * d, y: a.y + (b.y - a.y) / len * d
    }
}
const around = (at: Pt, r: number): Pt => {
    const a = rand(0,
            TAU), d = Math.sqrt(Math.random()) * r
    return {
        x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d
    }
}

function canvasOf(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
    const c = document.createElement("canvas")
    c.width = w
    c.height = h
    const g = c.getContext("2d")
    if (g) draw(g)
    return c
}

function brassFill(g: CanvasRenderingContext2D, y0: number, y1: number) {
    const grad = g.createLinearGradient(0,
        y0,
        0,
        y1)
    grad.addColorStop(0,
        "#fff0b0")
    grad.addColorStop(.28,
        "#f6bd47")
    grad.addColorStop(.68,
        "#c47a18")
    grad.addColorStop(1,
        "#6e3d0c")
    g.fillStyle = grad
}

/** Một đốt ngón tay đồng thau: xoay quanh gốc, đầu ngón sáng */
function finger(g: CanvasRenderingContext2D, x: number, y: number, angle: number, length: number, width: number) {
    g.save()
    g.translate(x,
        y)
    g.rotate(angle)
    brassFill(g,
        -width / 2,
        width / 2)
    g.beginPath()
    g.roundRect(0,
        -width / 2,
        length,
        width,
        width * .35)
    g.fill()
    g.fillStyle = "rgba(60,30,6,.75)"
    g.fillRect(length * .46,
        -width / 2,
        2.5,
        width)
    g.fillStyle = "#ffe9a6"
    g.beginPath()
    g.roundRect(length * .74,
        -width / 2,
        length * .26,
        width * .42,
        3)
    g.fill()
    g.restore()
}

/** Nắm đấm tên lửa nhìn ngang, hướng sang phải: cổ tay thép có vòng đai, bàn tay đồng thau như ảnh chiêu */
function fistTexture(open: boolean): Texture {
    const S = 160
    return Texture.from(canvasOf(S,
        S,
        (g) => {
            const m = S / 2
            g.shadowColor = "rgba(10,6,0,.9)"
            g.shadowBlur = 7
            const wrist = g.createLinearGradient(0,
                m - 24,
                0,
                m + 24)
            wrist.addColorStop(0,
                "#d7dee6")
            wrist.addColorStop(.45,
                "#79838f")
            wrist.addColorStop(1,
                "#2c3038")
            g.fillStyle = wrist
            g.beginPath()
            g.roundRect(8,
                m - 22,
                64,
                44,
                8)
            g.fill()
            g.shadowBlur = 0
            brassFill(g,
                m - 26,
                m + 26)
            for (const x of [18,
                44]) {
                g.beginPath()
                g.roundRect(x,
                    m - 26,
                    10,
                    52,
                    3)
                g.fill()
            }
            g.shadowBlur = 7
            if (open) {
                finger(g,
                    100,
                    m - 26,
                    -.5,
                    52,
                    20)
                finger(g,
                    110,
                    m,
                    .02,
                    52,
                    20)
                finger(g,
                    100,
                    m + 26,
                    .5,
                    52,
                    20)
                finger(g,
                    84,
                    m + 34,
                    1.15,
                    36,
                    18)
            } else {
                finger(g,
                    102,
                    m - 22,
                    .34,
                    34,
                    22)
                finger(g,
                    108,
                    m + 2,
                    .1,
                    32,
                    22)
                finger(g,
                    102,
                    m + 24,
                    -.3,
                    34,
                    22)
            }
            brassFill(g,
                m - 40,
                m + 40)
            g.beginPath()
            g.roundRect(62,
                m - 40,
                54,
                80,
                16)
            g.fill()
            g.shadowBlur = 0
            g.fillStyle = "rgba(255,244,190,.85)"
            g.beginPath()
            g.roundRect(70,
                m - 34,
                38,
                9,
                4)
            g.fill()
            g.fillStyle = "#5e340a"
            for (const [x,
                y] of [[74,
                    m + 22],
                [100,
                    m + 22],
                [74,
                    m - 12],
                [100,
                    m - 12]]) {
                g.beginPath()
                g.arc(x,
                    y,
                    3.4,
                    0,
                    TAU)
                g.fill()
            }
        }))
}

/** Mắt xích thép, trục dọc theo chiều ngang */
function linkTexture(): Texture {
    return Texture.from(canvasOf(44,
        24,
        (g) => {
            const grad = g.createLinearGradient(0,
                0,
                0,
                24)
            grad.addColorStop(0,
                "#f0f3f6")
            grad.addColorStop(.5,
                "#8d97a3")
            grad.addColorStop(1,
                "#2b2f37")
            g.fillStyle = grad
            g.beginPath()
            g.roundRect(0,
                0,
                44,
                24,
                12)
            g.roundRect(9,
                7,
                26,
                10,
                5)
            g.fill("evenodd")
        }))
}

/** Bánh răng đồng thau, tấm giáp đinh tán, đoạn ống thép: mảnh Phụ Tùng thật */
function scrapTexture(kind: number): Texture {
    const S = 72
    return Texture.from(canvasOf(S,
        S,
        (g) => {
            const m = S / 2
            g.shadowColor = "rgba(8,6,2,.9)"
            g.shadowBlur = 5
            if (kind === 0) {
                brassFill(g,
                    6,
                    S - 6)
                g.beginPath()
                for (let i = 0; i < 20; i++) {
                    const a = i / 20 * TAU
                    const r = i % 2 ? 22 : 31
                    g.lineTo(m + Math.cos(a) * r,
                        m + Math.sin(a) * r)
                }
                g.closePath()
                g.arc(m,
                    m,
                    9,
                    0,
                    TAU)
                g.fill("evenodd")
            } else if (kind === 1) {
                const grad = g.createLinearGradient(0,
                    10,
                    S,
                    S - 10)
                grad.addColorStop(0,
                    "#eef2f6")
                grad.addColorStop(.5,
                    "#8f99a6")
                grad.addColorStop(1,
                    "#3b414b")
                g.fillStyle = grad
                g.beginPath()
                g.moveTo(8,
                    20)
                g.lineTo(50,
                    8)
                g.lineTo(65,
                    34)
                g.lineTo(52,
                    62)
                g.lineTo(14,
                    56)
                g.closePath()
                g.fill()
                g.shadowBlur = 0
                g.fillStyle = "#f6bd47"
                for (const [x,
                    y] of [[18,
                        26],
                    [46,
                        18],
                    [52,
                        46],
                    [22,
                        48]]) {
                    g.beginPath()
                    g.arc(x,
                        y,
                        3.6,
                        0,
                        TAU)
                    g.fill()
                }
            } else {
                brassFill(g,
                    m - 15,
                    m + 15)
                g.beginPath()
                g.roundRect(6,
                    m - 13,
                    60,
                    26,
                    6)
                g.fill()
                g.shadowBlur = 0
                g.fillStyle = "#6a7480"
                g.fillRect(16,
                    m - 15,
                    8,
                    30)
                g.fillRect(48,
                    m - 15,
                    8,
                    30)
            }
        }))
}

/** Lưng lá bài vẽ nền trước, ảnh thật đè lên khi tải xong */
function backTexture(): Texture {
    const W = 110, H = 154
    const paint = (g: CanvasRenderingContext2D) => {
        const grad = g.createLinearGradient(0,
            0,
            W,
            H)
        grad.addColorStop(0,
            "#1b2a55")
        grad.addColorStop(1,
            "#0c1430")
        g.fillStyle = "#c9a24a"
        g.beginPath()
        g.roundRect(0,
            0,
            W,
            H,
            9)
        g.fill()
        g.fillStyle = grad
        g.beginPath()
        g.roundRect(5,
            5,
            W - 10,
            H - 10,
            6)
        g.fill()
    }
    const c = canvasOf(W,
        H,
        paint)
    const tex = Texture.from(c)
    const art = new Image()
    art.onload = () => {
        c.getContext("2d")?.drawImage(art,
            0,
            0,
            W,
            H)
        tex.source.update()
    }
    art.src = "/ui/card_back.png"
    return tex
}

const textures = new Map<string, Texture>()
const once = (key: string, make: () => Texture) => {
    const known = textures.get(key)
    if (known) return known
    const made = make()
    textures.set(key,
        made)
    return made
}
const openFist = () => once("open",
    () => fistTexture(true))
const closedFist = () => once("closed",
    () => fistTexture(false))
const linkTex = () => once("link",
    linkTexture)
const scrapTex = (kind: number) => once(`scrap${kind}`,
    () => scrapTexture(kind))
const backTex = () => once("back",
    backTexture)

function spriteOf(layer: Container, tex: Texture, at: Pt, width: number) {
    const s = new Sprite(tex)
    s.anchor.set(.5)
    s.x = at.x
    s.y = at.y
    s.scale.set(width / tex.width)
    layer.addChild(s)
    return s
}

/** Tia sét thật: chuỗi đoạn sáng gãy khúc, lõi trắng trong quầng lam, tự đổi đường vài lần cho giật */
function bolt(layer: Container, a: Pt, b: Pt, o: { ms?: number; width?: number; jag?: number; flickers?: number; color?: number } = {
}) {
    const ms = o.ms ?? 260
    const width = o.width ?? 12
    const jag = o.jag ?? .3
    const SEGMENTS = 12
    const glows: Sprite[] = []
    const cores: Sprite[] = []
    for (let i = 0; i < SEGMENTS; i++) {
        glows.push(makeSprite(layer,
            "spark",
            a.x,
            a.y,
            o.color ?? ARC,
            10))
        cores.push(makeSprite(layer,
            "spark",
            a.x,
            a.y,
            ARC_CORE,
            10))
    }
    const lay = () => {
        const len = dist(a,
            b) || 1
        const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len
        let last = a
        for (let i = 0; i < SEGMENTS; i++) {
            const t = (i + 1) / SEGMENTS
            const off = i === SEGMENTS - 1 ? 0 : rand(-1,
                1) * len * jag * Math.sin(t * Math.PI)
            const p = {
                x: lerp(a.x,
                    b.x,
                    t) + nx * off, y: lerp(a.y,
                    b.y,
                    t) + ny * off
            }
            const seg = dist(last,
                p) * 1.34
            const angle = Math.atan2(p.y - last.y,
                p.x - last.x)
            for (const [s,
                thick] of [[glows[i],
                    width * 7],
                [cores[i],
                    width * 2.6]] as const) {
                if (s.destroyed) continue
                s.x = (last.x + p.x) / 2
                s.y = (last.y + p.y) / 2
                s.rotation = angle
                s.width = seg
                s.height = thick
            }
            last = p
        }
    }
    lay()
    const flickers = o.flickers ?? 3
    let step = 0
    return tween(ms,
        (t) => {
            const now = Math.floor(t * flickers)
            if (now !== step) {
                step = now
                lay()
            }
            const alpha = Math.pow(1 - t,
                .6) * (.72 + Math.random() * .28)
            for (const s of glows) if (!s.destroyed) s.alpha = alpha * .9
            for (const s of cores) if (!s.destroyed) s.alpha = alpha
        },
        ease.linear,
        layer).then(() => {
        for (const s of [...glows,
            ...cores]) if (!s.destroyed) s.destroy()
    })
}

/** Tia lửa kim loại: mảnh sắc đồng thau bắn ra, có trọng lực */
const metalSparks = (over: Partial<DustOpts> = {
}): DustOpts => ({
    color: [GOLD,
        0xfff2c4,
        BRASS,
        FIRE], speed: [160,
        620], gravity: 620, drag: 1.6, flow: 24, life: [260,
        620], size: [26,
        8], alpha: 1, blade: true, ...over
})
/** Bụi sét xanh li ti */
const staticMotes = (over: Partial<DustOpts> = {
}): DustOpts => ({
    color: [ARC,
        ARC_CORE,
        ARC_DEEP], speed: [60,
        420], drag: 3, flow: 150, life: [220,
        560], size: [7,
        2], alpha: 1, ...over
})
/** Hơi nước đặc: trắng đục, phủ được nền bàn nên không cộng màu */
const steamPuff = (over: Partial<DustOpts> = {
}): DustOpts => ({
    puff: true, color: [STEAM,
        STEAM_DIM,
        0xdde6ee], speed: [10,
        60], gravity: -44, drag: 1.4, flow: 26, life: [420,
        860], size: [38,
        92], alpha: .5, additive: false, ...over
})

/** Nắm đấm chạm: hơi nước xì, tia lửa đồng thau, sét bật quanh điểm chạm */
function clang(ctx: VfxCtx, at: Pt, power: number) {
    return Promise.all([
        bloom(ctx.layer,
            at,
            GOLD,
            300 * power,
            300),
        bloom(ctx.layer,
            at,
            ARC,
            420 * power,
            380),
        dustBurst(ctx.layer,
            at,
            {
                ...metalSparks(),
                count: Math.round(110 * power), spread: 14
            }),
        dustBurst(ctx.layer,
            at,
            {
                ...staticMotes(),
                count: Math.round(260 * power), spread: 20
            }),
        dustBurst(ctx.layer,
            at,
            {
                ...steamPuff({
                    speed: [40,
                        170]
                }), count: 12, spread: 24
            }),
        ...Array.from({
            length: 4
        },
        (_, i) => {
            const a = i / 4 * TAU + rand(-.5,
                .5)
            const r = rand(80,
                130) * power
            return bolt(ctx.layer,
                at,
                {
                    x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r
                },
                {
                    ms: 240, width: 11, flickers: 3
                })
        })
    ])
}

/** Xích thép nối Blitzcrank với nắm đấm: mắt xích xen kẽ, võng nhẹ theo sóng */
function chainOf(layer: Container) {
    const host = new Container()
    layer.addChild(host)
    const links: Sprite[] = []
    const tex = linkTex()
    return {
        draw(a: Pt, b: Pt, clock: number) {
            if (host.destroyed) return
            const len = dist(a,
                b)
            const n = Math.min(MAX_LINKS,
                Math.floor(len / LINK_GAP))
            const nx = len ? -(b.y - a.y) / len : 0, ny = len ? (b.x - a.x) / len : 0
            const angle = Math.atan2(b.y - a.y,
                b.x - a.x)
            for (let i = 0; i < Math.max(n,
                links.length); i++) {
                let s = links[i]
                if (i >= n) {
                    if (s) s.visible = false
                    continue
                }
                if (!s) {
                    s = new Sprite(tex)
                    s.anchor.set(.5)
                    host.addChild(s)
                    links[i] = s
                }
                const t = (i + .5) / Math.max(1,
                    n)
                const wave = Math.sin(t * Math.PI) * Math.sin(t * 13 + clock * .018) * 5
                s.visible = true
                s.x = lerp(a.x,
                    b.x,
                    t) + nx * wave
                s.y = lerp(a.y,
                    b.y,
                    t) + ny * wave
                s.rotation = angle
                s.scale.set(.62,
                    i % 2 ? .36 : .6)
            }
        }
    }
}

/**
 * Nắm đấm Tên Lửa, dùng cho Q, E và mọi cú cướp lá.
 * Không tether: bay tới to[0], báo nhịp, giữ một thoáng rồi rút về.
 * Có tether (hợp đồng của lá đang bay thật): bay tới tether.target(), báo contact, bám theo lá tới khi released thì rút về. to[0] khác điểm đó là chặng đi xuyên qua: báo onBeat khi lướt qua.
 */
export function rocketFist(ctx: VfxCtx): Promise<void> {
    const k = Math.min(1.25,
        kOf(ctx))
    const size = FIST_SIZE * k
    const first = ctx.to[0] ?? ctx.from
    const goal = ctx.tether?.target() ?? first
    const via = dist(first,
        goal) > 24
    const legA = dist(ctx.from,
        first)
    const total = via ? legA + dist(first,
        goal) : dist(ctx.from,
        goal)
    const flight = Math.max(FIST_MIN_MS,
        Math.min(FIST_MAX_MS,
            total / FIST_SPEED))
    const dir = Math.atan2((via ? first : goal).y - ctx.from.y,
        (via ? first : goal).x - ctx.from.x)
    let head = {
        ...ctx.from
    }
    let heading = dir
    /** Đuôi tên lửa: ngay sau cổ tay */
    const tail = () => ({
        x: head.x - Math.cos(heading) * size * .42, y: head.y - Math.sin(heading) * size * .42
    })
    const plume = (ms: number) => [
        dustStream(ctx.layer,
            tail,
            ms,
            340,
            steamPuff({
                spread: 16, alpha: .72, life: [520,
                    1000]
            })),
        dustStream(ctx.layer,
            () => around(tail(),
                12),
            ms,
            620,
            {
                color: [STEAM,
                    STEAM_DIM], speed: [10,
                    70], life: [240,
                    520], size: [7,
                    2], alpha: .9, flow: 60, drag: 2, gravity: -50
            }),
        dustStream(ctx.layer,
            tail,
            ms,
            480,
            {
                color: [GOLD,
                    FIRE,
                    0xfff2c4], speed: [160,
                    420], angle: [dir + Math.PI - .3,
                    dir + Math.PI + .3], drag: 3, flow: 30, life: [110,
                    280], size: [13,
                    4], streak: 4, alpha: 1, spread: 7
            })
    ]
    const tails: Promise<unknown>[] = plume(flight + 40)
    const links = chainOf(ctx.layer)
    const halo = makeSprite(ctx.layer,
        "glow",
        head.x,
        head.y,
        GOLD,
        size * 1.9)
    halo.alpha = .6
    const fist = spriteOf(ctx.layer,
        openFist(),
        head,
        size)
    return new Promise<void>((resolve) => {
        let elapsed = 0
        let beat = false
        let contacted = false
        let held = 0
        let retractAt = -1
        let last = goal
        let ended = false
        const finish = () => {
            if (ended) return
            ended = true
            ctx.app.ticker.remove(tick)
            void Promise.all(tails).then(() => resolve())
        }
        const land = () => {
            if (beat) return
            beat = true
            ctx.onBeat?.()
        }
        const tick = (ticker: Ticker) => {
            if (ctx.layer.destroyed) return finish()
            elapsed += ticker.deltaMS
            if (!contacted) {
                const t = Math.min(1,
                    elapsed / flight)
                const s = Math.pow(t,
                    1.25) * total
                const next = via && s > legA ? toward(first,
                    goal,
                    s - legA) : toward(ctx.from,
                    via ? first : goal,
                    s)
                if (dist(head,
                    next) > 1) heading = Math.atan2(next.y - head.y,
                    next.x - head.x)
                head = next
                if (via && s >= legA) land()
                if (t >= 1) {
                    contacted = true
                    fist.texture = closedFist()
                    land()
                    ctx.tether?.contact()
                    tails.push(clang(ctx,
                        head,
                        .7))
                }
            } else if (retractAt < 0) {
                held += ticker.deltaMS
                head = ctx.tether?.target() ?? first
                if (ctx.tether ? ctx.tether.released() || held > TETHER_MAX_MS : held >= FIST_HOLD_MS) {
                    retractAt = elapsed
                    last = head
                    tails.push(...plume(FIST_RETRACT_MS).slice(0,
                        2))
                }
            } else {
                const t = Math.min(1,
                    (elapsed - retractAt) / FIST_RETRACT_MS)
                head = {
                    x: lerp(last.x,
                        ctx.from.x,
                        ease.in(t)), y: lerp(last.y,
                        ctx.from.y,
                        ease.in(t))
                }
                if (t >= 1) {
                    fist.visible = false
                    halo.visible = false
                    links.draw(ctx.from,
                        ctx.from,
                        elapsed)
                    return finish()
                }
            }
            links.draw(ctx.from,
                tail(),
                elapsed)
            halo.x = head.x
            halo.y = head.y
            fist.x = head.x
            fist.y = head.y
            // nắm đấm luôn chĩa ra ngoài, kể cả lúc rút về
            fist.rotation = Math.atan2(head.y - ctx.from.y,
                head.x - ctx.from.x) || heading
        }
        ctx.layer.once("destroyed",
            finish)
        ctx.app.ticker.add(tick)
    })
}

registerVfx("blitzRocketFist",
    rocketFist)

/** Mở màn Q, E: van hơi hai bên vai xì trắng, mắt loé */
registerVfx("blitzSteamVent",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                GOLD,
                240 * k,
                260),
            ...[-1,
                1].map(side => dustBurst(ctx.layer,
                {
                    x: ctx.from.x + side * 46 * k, y: ctx.from.y - 26 * k
                },
                {
                    ...steamPuff({
                        speed: [90,
                            300], angle: side > 0 ? [-1.1,
                            -.1] : [Math.PI + .1,
                            Math.PI + 1.1], drag: 3
                    }), count: 14
                }))
        ])
    })

/** Q trúng: tia lửa đồng thau, sét bật, hơi nước, rung nhẹ */
registerVfx("blitzFistHit",
    async (ctx) => {
        ctx.shake(5,
            170)
        await clang(ctx,
            ctx.from,
            1.15 * kOf(ctx))
    })

/** E: phép bị bóp tắt. Luồng phép màu ctx.color2 bị hút vào, rồi đứt thành khói đen và tàn rơi */
registerVfx("blitzSpellFizzle",
    async (ctx) => {
        const k = kOf(ctx)
        const magic = [ctx.color2 ?? ARC,
            ctx.color,
            0xffffff]
        ctx.shake(5,
            200)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ctx.color2 ?? ARC,
                360 * k,
                300),
            dustStream(ctx.layer,
                () => around(ctx.from,
                    120 * k),
                180,
                1500,
                {
                    color: magic, speed: [10,
                        50], life: [120,
                        240], size: [8,
                        2], alpha: 1, flow: 30, drag: 2
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    count: 18, puff: true, color: [SOOT,
                        0x54585f,
                        0x202228], speed: [30,
                        150], gravity: -70, drag: 1.3, flow: 30, life: [520,
                        1000], size: [44,
                        110], alpha: .6, spread: 30, additive: false
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...metalSparks({
                        color: magic, speed: [90,
                            380], gravity: 760, size: [20,
                            5]
                    }), count: 120, spread: 34
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...staticMotes(),
                    count: 200, spread: 40
                })
        ])
    })

/** E: tia Choáng trên tướng dùng chiêu: sét vàng quật xuống, sao tia lửa xoay quanh đầu */
registerVfx("blitzStunSpark",
    async (ctx) => {
        const k = kOf(ctx)
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                GOLD,
                320 * k,
                320),
            bolt(ctx.layer,
                {
                    x: ctx.from.x + rand(-40,
                        40), y: ctx.from.y - 230 * k
                },
                ctx.from,
                {
                    ms: 300, width: 15, color: GOLD
                }),
            ...[-1,
                1].map(side => bolt(ctx.layer,
                ctx.from,
                {
                    x: ctx.from.x + side * 110 * k, y: ctx.from.y + rand(-50,
                        50)
                },
                {
                    ms: 260, width: 10, color: ARC
                })),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...metalSparks(),
                    count: 90, spread: 26
                })
        ])
    })

/** R mở màn: điện tụ trong thân, sét bò quanh lá, hơi nước xả, quầng lam phình */
registerVfx("blitzStaticCharge",
    async (ctx) => {
        const k = kOf(ctx)
        const R = 104 * k
        const crawl = Array.from({
            length: 10
        },
        (_, i) => tween(i * 40,
            () => {},
            ease.linear,
            ctx.layer).then(() => {
            const a = rand(0,
                TAU)
            return bolt(ctx.layer,
                {
                    x: ctx.from.x + Math.cos(a) * R, y: ctx.from.y + Math.sin(a) * R * 1.2
                },
                {
                    x: ctx.from.x + Math.cos(a + 2.1) * R * .7, y: ctx.from.y + Math.sin(a + 2.1) * R * .9
                },
                {
                    ms: 170, width: 11
                })
        }))
        await Promise.all([
            bloom(ctx.layer,
                ctx.from,
                ARC,
                520 * k,
                BLITZ_CHARGE_MS),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...steamPuff({
                        speed: [60,
                            220]
                    }), count: 12, spread: 34
                }),
            dustStream(ctx.layer,
                () => around(ctx.from,
                    210 * k),
                BLITZ_CHARGE_MS,
                2000,
                {
                    color: [ARC,
                        ARC_CORE], speed: [4,
                        30], life: [120,
                        260], size: [8,
                        3], alpha: 1, flow: 60
                }),
            tween(BLITZ_CHARGE_MS,
                () => {},
                ease.linear,
                ctx.layer).then(() => ctx.onBeat?.()),
            ...crawl
        ])
    })

/** R: Trường Điện Từ. Một nhịp duy nhất: chớp lam trắng, sét toả ra quanh Blitzcrank, quật lên từng tướng địch và nối dọc hàng */
registerVfx("blitzStaticField",
    async (ctx) => {
        const k = kOf(ctx)
        ctx.onBeat?.()
        ctx.shake(10,
            340)
        const at = ctx.from
        const row = ctx.to
        const radial = Array.from({
            length: 12
        },
        (_, i) => {
            const a = i / 12 * TAU + rand(-.16,
                .16)
            const r = (Math.abs(Math.cos(a)) * 360 + 210) * k
            return bolt(ctx.layer,
                at,
                {
                    x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r * .72
                },
                {
                    ms: 420, width: 13, flickers: 4
                })
        })
        const strikes = row.flatMap(to => [0,
            1].map(i => bolt(ctx.layer,
            at,
            to,
            {
                ms: 460, width: i ? 11 : 17, jag: .24, flickers: 4
            })))
        const along = row.slice(1).map((to, i) => bolt(ctx.layer,
            row[i],
            to,
            {
                ms: 440, width: 11, flickers: 4
            }))
        await Promise.all([
            bloom(ctx.layer,
                at,
                ARC_CORE,
                640 * k,
                340),
            bloom(ctx.layer,
                at,
                ARC,
                1050 * k,
                520),
            bloom(ctx.layer,
                at,
                ARC_DEEP,
                1400 * k,
                640),
            mist(ctx.layer,
                at,
                {
                    color: [ARC,
                        ARC_DEEP], size: 380 * k, alpha: .28, count: 18, speed: [80,
                        300]
                }),
            dustBurst(ctx.layer,
                at,
                {
                    ...staticMotes({
                        speed: [220,
                            1250], streak: 4, size: [9,
                            3], life: [260,
                            760]
                    }), count: 1300, spread: 40
                }),
            dustBurst(ctx.layer,
                at,
                {
                    ...metalSparks({
                        speed: [240,
                            900], gravity: 360
                    }), count: 170, spread: 40
                }),
            dustBurst(ctx.layer,
                at,
                {
                    ...steamPuff({
                        speed: [90,
                            340]
                    }), count: 16, spread: 40
                }),
            ...radial,
            ...strikes,
            ...along
        ])
    })

/** R trúng một tướng: sét bám thân, tia xanh tung ra */
registerVfx("blitzStaticHit",
    async (ctx) => {
        const k = kOf(ctx)
        const at = ctx.from
        await Promise.all([
            bloom(ctx.layer,
                at,
                ARC,
                320 * k,
                360),
            dustBurst(ctx.layer,
                at,
                {
                    ...staticMotes({
                        speed: [80,
                            520]
                    }), count: 220, spread: 46
                }),
            dustBurst(ctx.layer,
                at,
                {
                    ...metalSparks({
                        color: [ARC_CORE,
                            ARC,
                            GOLD], size: [18,
                            5]
                    }), count: 46, spread: 30
                }),
            ...Array.from({
                length: 4
            },
            () => bolt(ctx.layer,
                {
                    x: at.x + rand(-60,
                        60), y: at.y - 76
                },
                {
                    x: at.x + rand(-60,
                        60), y: at.y + 76
                },
                {
                    ms: 340, width: 10, jag: .3, flickers: 4
                }))
        ])
    })

/** R: lá bài văng khỏi tay. from là tay đối thủ, to[0] là Mộ, ctx.amount là số lá */
registerVfx("blitzHandDiscard",
    async (ctx) => {
        const count = Math.max(1,
            Math.min(5,
                ctx.amount ?? 2))
        const grave = ctx.to[0] ?? {
            x: ctx.from.x, y: ctx.from.y + 300
        }
        await Promise.all(Array.from({
            length: count
        },
        async (_, i) => {
            const side = i - (count - 1) / 2
            const start = {
                x: ctx.from.x + side * 58, y: ctx.from.y
            }
            const apex = {
                x: ctx.from.x + side * 250 + rand(-30,
                    30), y: ctx.from.y + rand(150,
                    230)
            }
            const ms = 760 + i * 70
            const spin = rand(5,
                9) * (side < 0 ? -1 : 1)
            const card = spriteOf(ctx.layer,
                backTex(),
                start,
                84)
            let p = {
                ...start
            }
            await Promise.all([
                bolt(ctx.layer,
                    start,
                    apex,
                    {
                        ms: 260, width: 10
                    }),
                dustStream(ctx.layer,
                    () => around(p,
                        26),
                    ms,
                    340,
                    staticMotes({
                        speed: [20,
                            120]
                    })),
                dustStream(ctx.layer,
                    () => p,
                    ms,
                    42,
                    {
                        puff: true, color: [SOOT,
                            0x54585f], speed: [6,
                            30], gravity: -40, life: [340,
                            640], size: [26,
                            64], alpha: .42, flow: 18, additive: false
                    }),
                tween(ms,
                    (t) => {
                        const u = 1 - t
                        p = {
                            x: u * u * start.x + 2 * u * t * apex.x + t * t * grave.x,
                            y: u * u * start.y + 2 * u * t * apex.y + t * t * grave.y
                        }
                        if (card.destroyed) return
                        card.x = p.x
                        card.y = p.y
                        card.rotation = t * spin
                        card.alpha = t > .82 ? (1 - t) / .18 : 1
                    },
                    ease.out,
                    ctx.layer).then(() => { if (!card.destroyed) card.destroy() })
            ])
        }))
    })

/** Một mảnh Phụ Tùng trên lá: vị trí tương đối so với tâm lá, không trùng nhau */
const scrapSpot = (i: number, n: number, at: Pt, k: number): Pt => {
    const a = i / n * TAU + .4
    const r = (i % 2 ? 34 : 64) * k
    return {
        x: at.x + Math.cos(a) * r * .72, y: at.y + Math.sin(a) * r
    }
}

/** Nội tại: mảnh sắt vụn bay vào, găm lên thân Blitzcrank kèm tia lửa hàn, giữ một thoáng rồi hoà vào giáp. ctx.amount là số Phụ Tùng */
registerVfx("blitzScrapBolt",
    async (ctx) => {
        const k = kOf(ctx)
        const count = Math.max(5,
            Math.min(9,
                4 + (ctx.amount ?? 1)))
        await Promise.all(Array.from({
            length: count
        },
        async (_, i) => {
            const spot = scrapSpot(i,
                count,
                ctx.from,
                k)
            const a = rand(0,
                TAU)
            const start = {
                x: spot.x + Math.cos(a) * rand(170,
                    250), y: spot.y + Math.sin(a) * rand(170,
                    250)
            }
            const piece = spriteOf(ctx.layer,
                scrapTex(i % 3),
                start,
                rand(58,
                    70) * k)
            const spin = rand(5,
                9)
            const ms = 300 + i * 46
            await Promise.all([
                dustStream(ctx.layer,
                    () => ({
                        x: piece.destroyed ? spot.x : piece.x, y: piece.destroyed ? spot.y : piece.y
                    }),
                    ms,
                    120,
                    {
                        color: [GOLD,
                            FIRE], speed: [10,
                            60], life: [120,
                            260], size: [7,
                            2], alpha: 1, flow: 30
                    }),
                tween(ms,
                    (t) => {
                        if (piece.destroyed) return
                        piece.x = lerp(start.x,
                            spot.x,
                            t)
                        piece.y = lerp(start.y,
                            spot.y,
                            t)
                        piece.rotation = (1 - t) * spin
                    },
                    ease.in,
                    ctx.layer).then(() => {
                    if (i === 0) ctx.onBeat?.()
                    return Promise.all([
                        dustBurst(ctx.layer,
                            spot,
                            {
                                ...metalSparks({
                                    speed: [120,
                                        460], size: [20,
                                        5]
                                }), count: 40
                            }),
                        bloom(ctx.layer,
                            spot,
                            i % 2 ? GOLD : ARC,
                            130 * k,
                            240),
                        tween(SCRAP_STAY_MS + (count - i) * 46,
                            (t) => {
                                if (!piece.destroyed) piece.alpha = t > .7 ? (1 - t) / .3 : 1
                            },
                            ease.linear,
                            ctx.layer).then(() => { if (!piece.destroyed) piece.destroy() })
                    ])
                })
            ])
        }),)
    })

/** Nội tại khi chết: nửa Phụ Tùng bật khỏi thân, rơi loảng xoảng trong khói */
registerVfx("blitzScrapShed",
    async (ctx) => {
        const k = kOf(ctx)
        const count = 8
        ctx.onBeat?.()
        ctx.shake(4,
            160)
        await Promise.all([
            mist(ctx.layer,
                ctx.from,
                {
                    color: [SOOT,
                        0x54585f], size: 170 * k, alpha: .4, count: 10, additive: false
                }),
            dustBurst(ctx.layer,
                ctx.from,
                {
                    ...metalSparks(),
                    count: 80, spread: 40
                }),
            ...Array.from({
                length: count
            },
            async (_, i) => {
                const at = scrapSpot(i,
                    count,
                    ctx.from,
                    k)
                const piece = spriteOf(ctx.layer,
                    scrapTex(i % 3),
                    at,
                    rand(58,
                        70) * k)
                const vx = (at.x - ctx.from.x) * rand(2.4,
                    4.2)
                const vy = -rand(160,
                    340)
                const spin = rand(-9,
                    9)
                await tween(860,
                    (t) => {
                        if (piece.destroyed) return
                        const s = t * .86
                        piece.x = at.x + vx * s
                        piece.y = at.y + vy * s + 900 * s * s
                        piece.rotation = spin * s
                        piece.alpha = t > .7 ? (1 - t) / .3 : 1
                    },
                    ease.linear,
                    ctx.layer)
                if (!piece.destroyed) piece.destroy()
            })
        ])
    })
