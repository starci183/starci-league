// VFX Sylas trên Cocos, dựng theo thiết kế VFX Sylas của bản web (packages/client/src/card/vfx/fx_sylas.ts): xích cổ thạch xanh
// tím. Thân xích là các mảnh sắc xếp dọc đường bay, bọc bụi ma thuật; trúng thì xích vỡ thành mảnh. Mỗi chiêu một ô đăng ký:
// basic_sylas, sylas_q, sylas_e, sylas_r, sylas_p.
import {
    Node
} from "cc"
import {
    angleOf, burst, dist, ease, emit, mix, over, rand, stream, wait, type Pt
} from "./particles"
import {
    registerSkillVfx, type VfxCtx
} from "./registry"
import {
    swapUnits
} from "./swap"

const PETRI = 0x6f8cff
const VIOLET = 0xa77bff
const STEEL = 0xe6ecff
const DEEP = 0x35319e
const MINT = 0x6fe0c0

const MAGENTA = 0xff5ad8
const CYAN = 0x4fe8ff
const GOLD = 0xffd25a
const ORANGE = 0xff8a3a
/** Dải màu cầu vồng Petricite: xích, tia và vụ nổ lấy ngẫu nhiên trong dải này cho sặc sỡ */
const RAINBOW = [PETRI,
    VIOLET,
    MAGENTA,
    CYAN,
    GOLD,
    MINT]

const palette = (ctx: VfxCtx) => [ctx.style.color,
    ctx.style.color2 ?? VIOLET,
    STEEL,
    PETRI,
    MAGENTA,
    CYAN]
const power = (ctx: VfxCtx) => ctx.style.intensity ?? 1

/** Vòng pháp trận trên đất: hai vòng lồng nhau, các vạch ngắn chạy quanh theo vòng, nhiều màu, tan dần */
function runeCircle(layer: Node, at: Pt, r: number, life: number) {
    const n = 18
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        emit(layer,
            {
                x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r * 0.55
            },
            {
                color: [RAINBOW[i % RAINBOW.length]], kind: "blade", life: [life,
                    life], size: [r * 0.3,
                    r * 0.3], alpha: 0.9, rotation: a + Math.PI / 2, stretch: 0.8
            })
    }
    void burst(layer,
        at,
        1,
        {
            color: [VIOLET], kind: "ring", life: [life,
                life], size: [r * 1.7,
                r * 2.1], alpha: 0.55
        })
    void burst(layer,
        at,
        1,
        {
            color: [CYAN], kind: "ring", life: [life * 0.8,
                life * 0.8], size: [r * 1.1,
                r * 1.5], alpha: 0.5
        })
}

/** Cột sáng nhiều màu bốc thẳng lên từ `at` */
function pillar(layer: Node, at: Pt, h: number, life: number) {
    for (let i = 0; i < 12; i++) emit(layer,
        {
            x: at.x + rand(-26,
                26), y: at.y
        },
        {
            color: [RAINBOW[i % RAINBOW.length],
                STEEL], kind: "blade", life: [life * 0.6,
                life], size: [h * 0.5,
                h * 0.25], alpha: 0.9, rotation: Math.PI / 2, speed: [h * 0.9,
                h * 1.6], angle: [Math.PI / 2 - 0.08,
                Math.PI / 2 + 0.08], drag: 1.2, stretch: 2.4
        })
    emit(layer,
        at,
        {
            color: [STEEL], kind: "glow", life: [life * 0.7,
                life * 0.7], size: [90,
                150], alpha: 0.8
        })
}

/** Nổ sao nhiều màu: tia sắc đủ màu cầu vồng toả đều mọi hướng, kèm vòng sóng màu đối nhau */
function colorBurst(layer: Node, at: Pt, k: number) {
    void burst(layer,
        at,
        Math.round(34 * k),
        {
            color: RAINBOW, kind: "blade", life: [0.2,
                0.5], size: [34,
                8], alpha: 1, speed: [260,
                760], drag: 2.2, align: true, stretch: 2.8
        })
    void burst(layer,
        at,
        Math.round(28 * k),
        {
            color: [...RAINBOW,
                STEEL], kind: "dot", life: [0.4,
                1], size: [10,
                2], alpha: 1, speed: [60,
                360], drag: 1.6, gravity: 80, spread: 20
        })
    void burst(layer,
        at,
        1,
        {
            color: [MAGENTA], kind: "ring", life: [0.42,
                0.42], size: [30,
                250 * k], alpha: 0.85
        })
    void burst(layer,
        at,
        1,
        {
            color: [CYAN], kind: "ring", life: [0.52,
                0.52], size: [20,
                320 * k], alpha: 0.6
        })
}

/** Niệm: hạt xích xoáy quanh tay Sylas */
async function charge(layer: Node, at: Pt, ctx: VfxCtx, k: number) {
    let a = 0
    const orbit = () => ({
        x: at.x + Math.cos(a) * 54 * k, y: at.y + Math.sin(a) * 54 * k
    })
    runeCircle(layer,
        at,
        60 * k,
        0.5)
    void stream(layer,
        () => ({
            x: at.x + rand(-40,
                40), y: at.y - 20
        }),
        0.3,
        90,
        {
            color: RAINBOW, kind: "dot", life: [0.3,
                0.55], size: [8,
                2], alpha: 1, speed: [60,
                160], angle: [Math.PI * 0.35,
                Math.PI * 0.65], drag: 1.2
        })
    emit(layer,
        at,
        {
            color: [ctx.style.color,
                MAGENTA], kind: "glow", life: [0.28,
                0.28], size: [170 * k,
                20], alpha: 0.75
        })
    await Promise.all([
        over(layer,
            0.24,
            (t) => { a = t * Math.PI * 4 }),
        stream(layer,
            orbit,
            0.24,
            140,
            {
                color: palette(ctx), kind: "blade", life: [0.15,
                    0.32], size: [20,
                    6], alpha: 1, speed: [10,
                    60], stretch: 2.4
            }),
    ])
}

/** Một sợi xích quất từ a tới b: đầu bay trước, các mắt xích đọng lại dọc đường rồi vỡ vụn */
async function whip(layer: Node, ctx: VfxCtx, a: Pt, b: Pt, secs: number, width: number, arrive: () => void) {
    const dir = angleOf(a,
        b)
    const len = dist(a,
        b)
    const gap = Math.max(14,
        width * 0.7)
    const pal = [ctx.style.color,
        DEEP,
        VIOLET,
        STEEL]
    let placed = 0
    await over(layer,
        secs,
        (t) => {
            const head = ease.out(t) * len
            while (placed * gap <= head) {
                const d = placed * gap
                const wob = Math.sin(d * 0.045 + t * 9) * 6
                const p = {
                    x: a.x + Math.cos(dir) * d - Math.sin(dir) * wob, y: a.y + Math.sin(dir) * d + Math.cos(dir) * wob
                }
                // mắt xích: mảnh sắc xoay luân phiên dọc / ngang để giống xích
                emit(layer,
                    p,
                    {
                        color: pal, kind: "blade", additive: false, life: [0.42,
                            0.7], size: [width * 1.1,
                            width * 0.7], alpha: 1, rotation: dir + (placed % 2 ? Math.PI / 2 : 0.35), speed: [4,
                            30], angle: [dir + Math.PI / 2 - 0.4,
                            dir + Math.PI / 2 + 0.4], drag: 3, stretch: 1.6
                    })
                emit(layer,
                    p,
                    {
                        color: palette(ctx), kind: "dot", life: [0.25,
                            0.5], size: [7,
                            2], alpha: 0.95, speed: [8,
                            70], drag: 2
                    })
                placed++
            }
            // đầu xích sáng
            emit(layer,
                mix(a,
                    b,
                    ease.out(t)),
                {
                    color: [STEEL,
                        ctx.style.color], kind: "glow", life: [0.12,
                        0.2], size: [width * 2.2,
                        width * 0.6], alpha: 0.9
                })
        })
    arrive()
    // xích vỡ: mảnh sắc văng dọc thân
    const n = Math.max(10,
        Math.round(len / 28))
    for (let i = 0; i < n; i++) emit(layer,
        mix(a,
            b,
            Math.random()),
        {
            color: pal, kind: "blade", additive: false, life: [0.3,
                0.62], size: [width * 1.2,
                width * 0.4], alpha: 1, speed: [40,
                200], drag: 3, align: true, stretch: 2
        })
}

/** Va chạm: vòng sóng, tia sáng, mảnh vỡ, sương tối */
function hit(layer: Node, ctx: VfxCtx, at: Pt, strength: number) {
    const pal = palette(ctx)
    colorBurst(layer,
        at,
        0.55 * strength)
    void burst(layer,
        at,
        1,
        {
            color: [ctx.style.color2 ?? VIOLET], kind: "ring", life: [0.36,
                0.36], size: [30,
                230 * strength], alpha: 0.9
        })
    void burst(layer,
        at,
        1,
        {
            color: [DEEP,
                ctx.style.color], kind: "glow", life: [0.45,
                0.45], size: [60,
                190 * strength], alpha: 0.5, additive: false
        })
    void burst(layer,
        at,
        Math.round(18 * strength),
        {
            color: [STEEL,
                ctx.style.color], kind: "blade", life: [0.16,
                0.36], size: [26,
                8], alpha: 1, speed: [260,
                620], drag: 2.2, align: true, stretch: 2.6
        })
    void burst(layer,
        at,
        Math.round(34 * strength),
        {
            color: pal, kind: "dot", life: [0.25,
                0.6], size: [8,
                2], alpha: 1, speed: [120,
                520], drag: 1.8
        })
}

async function lash(ctx: VfxCtx, secs: number, width: number, strength: number, extra?: (to: Pt) => void) {
    const k = power(ctx)
    await charge(ctx.layer,
        ctx.from,
        ctx,
        k)
    await Promise.all((ctx.to.length ? ctx.to : [ctx.from]).map((to) => whip(ctx.layer,
        ctx,
        ctx.from,
        to,
        secs,
        width * k,
        () => {
            hit(ctx.layer,
                ctx,
                to,
                strength * k)
            extra?.(to)
        })))
}

/** Đánh thường: quất xích ngắn */
registerSkillVfx("basic_sylas",
    (ctx) => lash(ctx,
        0.2,
        14,
        0.7))


/**
 * Dấu X trên mặt đất của Q (khung hình từ clip chiêu Q): hai lưỡi cong dài bắt chéo, kéo dọc theo hướng quất. `dir` là hướng từ
 * Sylas tới mục tiêu. Mỗi lưỡi là chuỗi mảnh sắc dọc đường cong, mảnh nhỏ dần về hai đầu nhọn.
 */
function crossMark(layer: Node, at: Pt, dir: number, len: number, wid: number, colors: number[], life: number, alpha = 1) {
    const cs = Math.cos(dir), sn = Math.sin(dir)
    const toWorld = (u: number, v: number): Pt => ({
        x: at.x + cs * u - sn * v, y: at.y + sn * u + cs * v
    })
    const N = 30
    emit(layer,
        at,
        {
            color: [colors[0]], kind: "glow", life: [life,
                life], size: [len * 1.6,
                len * 1.9], alpha: 0.4 * alpha
        })
    for (const side of [-1,
        1]) {
        let prev = toWorld(-len,
            -side * wid)
        for (let i = 1; i <= N; i++) {
            const t = i / N
            const u = -len + 2 * len * t
            // đường cong: lệch ngang theo sin, hai lưỡi cong ngược chiều nhau
            const v = side * (-wid + 2 * wid * t) + side * Math.sin(t * Math.PI) * wid * 0.55
            const p = toWorld(u,
                v)
            const mid = mix(prev,
                p,
                0.5)
            const taper = Math.sin(t * Math.PI) ** 0.6
            emit(layer,
                mid,
                {
                    color: colors, kind: "blade", life: [life,
                        life], size: [(len / N) * 7.5,
                        (len / N) * 7.5], alpha: Math.min(1, alpha * (0.7 + 0.5 * taper)), rotation: angleOf(prev,
                        p), stretch: 0.9 + taper * 0.7
                })
            prev = p
        }
    }
}

/** Vết nứt toả ra từ tâm: các tia cam mảnh nằm im trên mặt đất rồi tắt */
function cracks(layer: Node, at: Pt, n: number, reach: number, life: number) {
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand(-0.25,
            0.25)
        const r = rand(reach * 0.5,
            reach)
        for (let j = 0; j < 5; j++) {
            const t = (j + 0.5) / 5
            emit(layer,
                {
                    x: at.x + Math.cos(a) * r * t + rand(-3,
                        3), y: at.y + Math.sin(a) * r * t + rand(-3,
                        3)
                },
                {
                    color: [0xff7a2a,
                        0xffb15a,
                        0xff5a1a], kind: "blade", life: [life,
                        life * 1.2], size: [r / 4.2,
                        r / 4.2], alpha: 0.95 * (1 - t * 0.5), rotation: a + rand(-0.3,
                        0.3), stretch: 0.5
                })
        }
    }
    emit(layer,
        at,
        {
            color: [0xff7a2a], kind: "glow", life: [life,
                life], size: [reach * 1.1,
                reach * 1.3], alpha: 0.55
        })
}

/** Điểm trên đường cong bậc hai a -> b với điểm điều khiển lệch ngang `bend` px (âm: lệch trái) */
function curve(a: Pt, b: Pt, bend: number, u: number): Pt {
    const dir = angleOf(a,
        b)
    const c = {
        x: (a.x + b.x) / 2 - Math.sin(dir) * bend, y: (a.y + b.y) / 2 + Math.cos(dir) * bend
    }
    const v = 1 - u
    return {
        x: v * v * a.x + 2 * v * u * c.x + u * u * b.x, y: v * v * a.y + 2 * v * u * c.y + u * u * b.y
    }
}

/** Xích cong: các mắt xích mọc dần dọc đường cong, đầu xích sáng chạy trước, xong thì mắt xích đọng lại rồi vỡ */
async function curveChain(layer: Node, a: Pt, b: Pt, bend: number, secs: number, width: number, pal: number[], keep = 0.5) {
    const total = dist(a,
        b) * 1.1
    const gap = Math.max(13,
        width * 0.75)
    let placed = 0
    let prev = a
    await over(layer,
        secs,
        (t) => {
            const head = ease.out(t)
            while (placed * gap <= head * total) {
                const u = Math.min(1,
                    (placed * gap) / total)
                const p = curve(a,
                    b,
                    bend,
                    u)
                // mắt xích xoay luân phiên dọc / ngang theo hướng đường cong
                emit(layer,
                    p,
                    {
                        color: [RAINBOW[placed % RAINBOW.length],
                            pal[0]], kind: "blade", additive: false, life: [keep,
                            keep * 1.3], size: [width * 1.25,
                            width * 0.8], alpha: 1, rotation: angleOf(prev,
                            p) + (placed % 2 ? Math.PI / 2 : 0.25), stretch: 1.5
                    })
                emit(layer,
                    p,
                    {
                        color: [RAINBOW[(placed + 2) % RAINBOW.length]], kind: "glow", life: [0.25,
                            0.45], size: [width * 2.2,
                            width * 0.8], alpha: 0.5
                    })
                if (placed % 2 === 0) emit(layer,
                    p,
                    {
                        color: [STEEL,
                            CYAN,
                            MAGENTA], kind: "dot", life: [0.3,
                            0.6], size: [7,
                            1], alpha: 1, speed: [20,
                            90], drag: 1.6, spread: 6
                    })
                // vệt sáng nhỏ quanh mắt xích
                emit(layer,
                    p,
                    {
                        color: [pal[2] ?? STEEL], kind: "glow", life: [0.18,
                            0.3], size: [width * 1.6,
                            width * 0.5], alpha: 0.55
                    })
                prev = p
                placed++
            }
            emit(layer,
                curve(a,
                    b,
                    bend,
                    head),
                {
                    color: [STEEL], kind: "glow", life: [0.1,
                        0.18], size: [width * 2.4,
                        width * 0.7], alpha: 1
                })
        })
}

/** Mảnh vỡ của xích khi tan: mảnh sắc văng ra từ `at` */
function shatter(layer: Node, at: Pt, n: number, pal: number[]) {
    void burst(layer,
        at,
        n,
        {
            color: pal, kind: "blade", additive: false, life: [0.3,
                0.65], size: [22,
                7], alpha: 1, speed: [90,
                360], drag: 2.6, align: true, stretch: 1.9
        })
}

/**
 * Q Roi Xích: xích quất móc vào một đồng minh (to[0]) rồi ĐỔI CHỖ: Sylas bay lên dậm đất xuống ô đồng minh, đồng minh trượt
 * ngang sang ô Sylas. Tới vị trí mới Sylas quất xích đánh tướng địch ngay trước mặt (to[1], nếu có): dấu X báo trước,
 * xích hội tụ, nổ vàng, sát thương phép.
 */
registerSkillVfx("sylas_q",
    async (ctx) => {
        const k = power(ctx)
        const ally = ctx.to[0] ?? ctx.from
        const foe = ctx.to[1]
        const pal = [PETRI,
            DEEP,
            STEEL,
            VIOLET]
        await charge(ctx.layer,
            ctx.from,
            ctx,
            k * 0.9)
        // (1) xích móc vào đồng minh
        await curveChain(ctx.layer,
            ctx.from,
            ally,
            40,
            0.16,
            18 * k,
            pal,
            0.45)
        void burst(ctx.layer,
            ally,
            1,
            {
                color: [VIOLET], kind: "ring", life: [0.3,
                    0.3], size: [20,
                    130], alpha: 0.9
            })
        // (2) đổi chỗ: Sylas bay lên dậm xuống ô đồng minh, đồng minh trượt ngang sang ô Sylas (hiệu ứng đổi chỗ chung)
        void burst(ctx.layer,
            mix(ctx.from,
                ally,
                0.5),
            1,
            {
                color: [STEEL,
                    VIOLET], kind: "ring", life: [0.45,
                    0.45], size: [30,
                    170], alpha: 0.7
            })
        await swapUnits(ctx.layer,
            {
                hero: "sylas", pos: ctx.from
            },
            {
                hero: ctx.allyHero ?? "sylas", pos: ally
            })
        if (!foe) return
        // (3) tại chỗ mới Sylas đánh tướng địch trước mặt
        const dir = angleOf(ally,
            foe)
        crossMark(ctx.layer,
            foe,
            dir,
            90 * k,
            40 * k,
            [0x39e6d0,
                0xbffff4,
                0x7ff3e4],
            0.4,
            0.95)
        await wait(ctx.layer,
            0.22)
        const past = {
            x: foe.x + Math.cos(dir) * 60, y: foe.y + Math.sin(dir) * 60
        }
        await Promise.all([curveChain(ctx.layer,
            ally,
            past,
            -100,
            0.18,
            18 * k,
            pal),
        curveChain(ctx.layer,
            ally,
            past,
            100,
            0.18,
            18 * k,
            pal)])
        cracks(ctx.layer,
            foe,
            7,
            84 * k,
            0.6)
        await wait(ctx.layer,
            0.2)
        crossMark(ctx.layer,
            foe,
            dir,
            90 * k,
            40 * k,
            [0xffd25a,
                0xfff0a0,
                0xffe08a],
            0.34,
            1)
        void burst(ctx.layer,
            foe,
            1,
            {
                color: [0xffd25a], kind: "ring", life: [0.34,
                    0.34], size: [30,
                    210 * k], alpha: 1
            })
        void burst(ctx.layer,
            foe,
            1,
            {
                color: [0xffe08a,
                    0xffb15a], kind: "glow", life: [0.4,
                    0.4], size: [70,
                    240 * k], alpha: 0.9
            })
        void burst(ctx.layer,
            foe,
            Math.round(26 * k),
            {
                color: [0xfff0a0,
                    0xffd25a,
                    0xffffff], kind: "blade", life: [0.16,
                    0.4], size: [28,
                    8], alpha: 1, speed: [240,
                    680], drag: 2.2, align: true, stretch: 2.7
            })
        void burst(ctx.layer,
            foe,
            Math.round(18 * k),
            {
                color: [VIOLET,
                    PETRI,
                    0xd9c8ff], kind: "dot", life: [0.5,
                    0.9], size: [9,
                    2], alpha: 0.9, speed: [40,
                    160], angle: [Math.PI * 0.25,
                    Math.PI * 0.75], drag: 1.4, gravity: 120, spread: 40
            })
        colorBurst(ctx.layer,
            foe,
            1.1 * k)
        runeCircle(ctx.layer,
            foe,
            80 * k,
            0.6)
        pillar(ctx.layer,
            foe,
            220 * k,
            0.6)
        await wait(ctx.layer,
            0.5)
    })

/**
 * E Thợ Săn Vua: không lướt tới, chỉ húc thẳng vào địch: xích quất tới neo vào địch rồi cú húc nện xuống (mũi húc tím trắng đâm
 * vào, sóng xung kích, tia và mảnh vỡ toả ra), sát thương phép; máu hồi theo phần đã mất: luồng xanh ngọc chảy về Sylas.
 */
registerSkillVfx("sylas_e",
    async (ctx) => {
        const k = power(ctx)
        const to = ctx.to[0] ?? ctx.from
        const dir = angleOf(ctx.from,
            to)
        const pal = [PETRI,
            DEEP,
            STEEL,
            VIOLET]
        await charge(ctx.layer,
            ctx.from,
            ctx,
            k * 0.8)
        await curveChain(ctx.layer,
            ctx.from,
            to,
            26,
            0.12,
            20 * k,
            pal,
            0.3)
        // cú húc: mũi nhọn lớn đâm vào địch + chớp sáng
        const back = {
            x: to.x - Math.cos(dir) * 80 * k, y: to.y - Math.sin(dir) * 80 * k
        }
        await over(ctx.layer,
            0.1,
            (t) => {
                const p = mix(back,
                    to,
                    ease.out(t))
                emit(ctx.layer,
                    p,
                    {
                        color: [STEEL,
                            VIOLET], kind: "blade", life: [0.14,
                            0.22], size: [110 * k,
                            30], alpha: 1, rotation: dir, stretch: 2.2
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: [VIOLET,
                            PETRI], kind: "glow", life: [0.16,
                            0.24], size: [100 * k,
                            30], alpha: 0.8
                    })
            })
        hit(ctx.layer,
            ctx,
            to,
            1.4 * k)
        runeCircle(ctx.layer,
            to,
            78 * k,
            0.55)
        pillar(ctx.layer,
            to,
            200 * k,
            0.55)
        void burst(ctx.layer,
            to,
            1,
            {
                color: [STEEL], kind: "glow", life: [0.18,
                    0.18], size: [60,
                    230 * k], alpha: 1
            })
        void burst(ctx.layer,
            to,
            1,
            {
                color: [VIOLET,
                    PETRI], kind: "ring", life: [0.5,
                    0.5], size: [20,
                    300 * k], alpha: 0.75
            })
        // sóng xung kích dạt theo hướng húc
        void burst(ctx.layer,
            to,
            Math.round(16 * k),
            {
                color: [STEEL,
                    VIOLET], kind: "blade", life: [0.2,
                    0.4], size: [40,
                    10], alpha: 1, speed: [320,
                    760], angle: [dir - 0.9,
                    dir + 0.9], drag: 2.4, align: true, stretch: 3
            })
        shatter(ctx.layer,
            to,
            12,
            pal)
        await wait(ctx.layer,
            0.2)
        // hồi phục: luồng sinh lực xanh ngọc từ địch chảy về và bốc quanh Sylas
        void stream(ctx.layer,
            () => mix(to,
                ctx.from,
                Math.random()),
            0.35,
            200,
            {
                color: [0xb9ffd8,
                    MINT,
                    CYAN,
                    GOLD,
                    STEEL], kind: "dot", life: [0.25,
                    0.45], size: [9,
                    3], alpha: 1, speed: [20,
                    90], drag: 2
            })
        void burst(ctx.layer,
            ctx.from,
            1,
            {
                color: [MINT], kind: "ring", life: [0.5,
                    0.5], size: [40,
                    180], alpha: 0.8
            })
        await stream(ctx.layer,
            () => ({
                x: ctx.from.x + rand(-44,
                    44), y: ctx.from.y - 40
            }),
            0.6,
            90,
            {
                color: [0xb9ffd8,
                    MINT], kind: "glow", life: [0.5,
                    0.8], size: [22,
                    6], alpha: 0.9, speed: [40,
                    110], angle: [Math.PI * 0.4,
                    Math.PI * 0.6], drag: 1
            })
    })

/**
 * R Đoạt Chiêu: Sylas ném xích móc vào địch, khoá vòng xích quanh địch, rút chiêu cuối của địch ra thành một quả cầu sáng
 * bay cong về tay mình (đường xích vẫn nối), Sylas hấp thụ rồi bùng sáng: sau đó trận phát tiếp hiệu ứng chiêu của địch
 * như một lần thi triển lại.
 */
registerSkillVfx("sylas_r",
    async (ctx) => {
        const k = power(ctx)
        const to = ctx.to[0] ?? ctx.from
        const from = ctx.from
        await charge(ctx.layer,
            from,
            ctx,
            k * 1.2)
        const pal = [PETRI,
            DEEP,
            STEEL,
            VIOLET]
        // xích móc ném thẳng tới địch, đầu xích là móc sáng lớn
        await whip(ctx.layer,
            ctx,
            from,
            to,
            0.26,
            24 * k,
            () => {
                hit(ctx.layer,
                    ctx,
                    to,
                    1.1 * k)
            })
        // khoá: vòng sáng thu nhỏ quanh địch, mảnh xích xoáy quanh
        void burst(ctx.layer,
            to,
            1,
            {
                color: [VIOLET], kind: "ring", life: [0.42,
                    0.42], size: [260 * k,
                    50], alpha: 0.9
            })
        await over(ctx.layer,
            0.4,
            (t) => {
                const a = t * Math.PI * 5
                for (const off of [0,
                    Math.PI]) {
                    emit(ctx.layer,
                        {
                            x: to.x + Math.cos(a + off) * (96 - 52 * t) * k, y: to.y + Math.sin(a + off) * (96 - 52 * t) * k
                        },
                        {
                            color: pal, kind: "blade", additive: false, life: [0.2,
                                0.32], size: [30,
                                10], alpha: 1, rotation: a + off + Math.PI / 2, stretch: 1.5
                        })
                }
                emit(ctx.layer,
                    to,
                    {
                        color: [VIOLET,
                            STEEL], kind: "glow", life: [0.12,
                            0.2], size: [60 + 120 * t,
                            40], alpha: 0.5 + 0.4 * t
                    })
            })
        // rút chiêu: tia sáng bắn ra khỏi địch, quả cầu bay cong về Sylas để lại vệt sao
        void burst(ctx.layer,
            to,
            26,
            {
                color: [STEEL,
                    VIOLET,
                    0xffe08a], kind: "blade", life: [0.2,
                    0.4], size: [32,
                    8], alpha: 1, speed: [240,
                    620], drag: 2.2, align: true, stretch: 2.6
            })
        await over(ctx.layer,
            0.55,
            (t) => {
                const p = curve(to,
                    from,
                    -90,
                    ease.inOut(t))
                emit(ctx.layer,
                    p,
                    {
                        color: [STEEL,
                            0xffe08a], kind: "glow", life: [0.12,
                            0.2], size: [96,
                            60], alpha: 1
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: [VIOLET,
                            PETRI], kind: "glow", life: [0.3,
                            0.5], size: [60,
                            8], alpha: 0.8, spread: 6
                    })
                for (let i = 0; i < 3; i++) emit(ctx.layer,
                    p,
                    {
                        color: [STEEL,
                            VIOLET], kind: "dot", life: [0.25,
                            0.5], size: [8,
                            2], alpha: 1, speed: [20,
                            110], drag: 2
                    })
            })
        // hấp thụ: vòng thu vào Sylas, bùng sáng, tia toả ra
        void burst(ctx.layer,
            from,
            1,
            {
                color: [VIOLET,
                    STEEL], kind: "ring", life: [0.35,
                    0.35], size: [210,
                    30], alpha: 0.9
            })
        void burst(ctx.layer,
            from,
            1,
            {
                color: [STEEL,
                    0xffe08a], kind: "glow", life: [0.4,
                    0.4], size: [40,
                    240 * k], alpha: 1
            })
        colorBurst(ctx.layer,
            from,
            1.2 * k)
        runeCircle(ctx.layer,
            from,
            90 * k,
            0.6)
        await burst(ctx.layer,
            from,
            Math.round(24 * k),
            {
                color: RAINBOW, kind: "blade", life: [0.2,
                    0.45], size: [28,
                    8], alpha: 1, speed: [200,
                    560], drag: 2.2, align: true, stretch: 2.6
            })
    })

/** P Xiềng Nổ: mắt xích nhỏ bám quanh Sylas rồi nổ vào đòn kế tiếp */
registerSkillVfx("sylas_p",
    async (ctx) => {
        for (let i = 0; i < 3; i++) {
            const a = rand(0,
                Math.PI * 2)
            const p = {
                x: ctx.from.x + Math.cos(a) * 80, y: ctx.from.y + Math.sin(a) * 80
            }
            void burst(ctx.layer,
                p,
                14,
                {
                    color: palette(ctx), kind: "blade", additive: false, life: [0.3,
                        0.55], size: [22,
                        9], alpha: 1, speed: [40,
                        200], drag: 2.4, align: true, stretch: 1.8
                })
            await wait(ctx.layer,
                0.06)
        }
        for (const to of ctx.to.length ? ctx.to : [ctx.from]) hit(ctx.layer,
            ctx,
            to,
            1)
        await wait(ctx.layer,
            0.5)
    })
