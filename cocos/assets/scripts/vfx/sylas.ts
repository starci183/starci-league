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

const PETRI = 0x6f8cff
const VIOLET = 0xa77bff
const STEEL = 0xe6ecff
const DEEP = 0x35319e
const MINT = 0x6fe0c0

const palette = (ctx: VfxCtx) => [ctx.style.color,
    ctx.style.color2 ?? VIOLET,
    STEEL,
    PETRI]
const power = (ctx: VfxCtx) => ctx.style.intensity ?? 1

/** Niệm: hạt xích xoáy quanh tay Sylas */
async function charge(layer: Node, at: Pt, ctx: VfxCtx, k: number) {
    let a = 0
    const orbit = () => ({
        x: at.x + Math.cos(a) * 54 * k, y: at.y + Math.sin(a) * 54 * k
    })
    emit(layer,
        at,
        {
            color: [ctx.style.color], kind: "glow", life: [0.28,
                0.28], size: [150 * k,
                20], alpha: 0.7
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

/**
 * Q Roi Xích, dựng theo clip chiêu Q: (1) dấu X xanh ngọc hiện trên đất tại mục tiêu, (2) Sylas quất xích, đất nứt vệt cam,
 * (3) sau một nhịp trễ xích nổ: dấu X chuyển vàng, tia lửa, vòng sóng vàng, mảnh vỡ.
 */
registerSkillVfx("sylas_q",
    async (ctx) => {
        const k = power(ctx)
        const targets = ctx.to.length ? ctx.to : [ctx.from]
        await charge(ctx.layer,
            ctx.from,
            ctx,
            k)
        // Đường đối diện (gần Sylas nhất theo chiều ngang) chỉ nhận một phần sát thương nên dấu X nhỏ hơn hai đường kề
        const centre = targets.reduce((a, b) => Math.abs(b.x - ctx.from.x) < Math.abs(a.x - ctx.from.x) ? b : a)
        await Promise.all(targets.map(async (to, i) => {
            const k = power(ctx) * (targets.length > 1 && to === centre ? 0.7 : 1)
            await wait(ctx.layer,
                i * 0.05)
            const dir = angleOf(ctx.from,
                to)
            const teal = [0x39e6d0,
                0xbffff4,
                0x7ff3e4]
            // (1) telegraph
            crossMark(ctx.layer,
                to,
                dir,
                92 * k,
                40 * k,
                teal,
                0.4,
                0.9)
            await wait(ctx.layer,
                0.34)
            // (2) quất xích tới tâm, đất nứt
            await whip(ctx.layer,
                ctx,
                ctx.from,
                to,
                0.16,
                20 * k,
                () => {
                    cracks(ctx.layer,
                        to,
                        7,
                        86 * k,
                        0.6)
                    void burst(ctx.layer,
                        to,
                        10,
                        {
                            color: [0xffb15a,
                                0xff7a2a], kind: "dot", life: [0.2,
                                0.45], size: [7,
                                2], alpha: 1, speed: [80,
                                300], drag: 2
                        })
                })
            // (3) nhịp trễ rồi nổ vàng
            await wait(ctx.layer,
                0.22)
            crossMark(ctx.layer,
                to,
                dir,
                92 * k,
                40 * k,
                [0xffd25a,
                    0xfff0a0,
                    0xffe08a],
                0.32,
                1)
            void burst(ctx.layer,
                to,
                1,
                {
                    color: [0xffd25a], kind: "ring", life: [0.34,
                        0.34], size: [30,
                        200 * k], alpha: 0.95
                })
            void burst(ctx.layer,
                to,
                1,
                {
                    color: [0xffe08a,
                        0xffb15a], kind: "glow", life: [0.36,
                        0.36], size: [60,
                        220 * k], alpha: 0.85
                })
            void burst(ctx.layer,
                to,
                Math.round(26 * k),
                {
                    color: [0xfff0a0,
                        0xffd25a,
                        0xffffff], kind: "blade", life: [0.16,
                        0.4], size: [28,
                        8], alpha: 1, speed: [240,
                        640], drag: 2.2, align: true, stretch: 2.6
                })
            await wait(ctx.layer,
                0.4)
        }))
    })

/** E Thợ Săn Vua: xích kéo Sylas lao tới, sinh lực xanh ngọc chảy ngược về Sylas */
registerSkillVfx("sylas_e",
    (ctx) => lash(ctx,
        0.26,
        24,
        1.1,
        (to) => {
            const from = ctx.from
            void stream(ctx.layer,
                () => mix(to,
                    from,
                    Math.random()),
                0.4,
                260,
                {
                    color: [0xb9ffd8,
                        MINT,
                        STEEL], kind: "dot", life: [0.2,
                        0.4], size: [9,
                        3], alpha: 1, speed: [20,
                        90], drag: 2
                })
            void over(ctx.layer,
                0.4,
                (t) => emit(ctx.layer,
                    mix(to,
                        from,
                        ease.in(t)),
                    {
                        color: [MINT,
                            STEEL], kind: "glow", life: [0.15,
                            0.25], size: [48,
                            12], alpha: 0.9
                    }))
        }))

/** R Đoạt Chiêu: hai sợi xích quấn lấy địch rồi rút một dòng sáng về tay Sylas */
registerSkillVfx("sylas_r",
    async (ctx) => {
        const k = power(ctx)
        await charge(ctx.layer,
            ctx.from,
            ctx,
            k)
        const targets = ctx.to.length ? ctx.to : [ctx.from]
        await Promise.all(targets.flatMap((to) => [-1,
            1].map((side) => whip(ctx.layer,
            ctx,
            {
                x: ctx.from.x + side * 40, y: ctx.from.y - 20
            },
            to,
            0.28,
            22 * k,
            () => {
                if (side > 0) hit(ctx.layer,
                    ctx,
                    to,
                    1.5 * k)
            }))))
        // dòng sáng bị đoạt chảy từ địch về Sylas (cong lên)
        const to = targets[0], from = ctx.from
        await over(ctx.layer,
            0.5,
            (t) => {
                const p = mix(to,
                    from,
                    ease.inOut(t))
                const lift = Math.sin(t * Math.PI) * 70
                emit(ctx.layer,
                    {
                        x: p.x, y: p.y + lift
                    },
                    {
                        color: [STEEL,
                            VIOLET,
                            ctx.style.color], kind: "glow", life: [0.18,
                            0.34], size: [60,
                            14], alpha: 1, speed: [10,
                            50]
                    })
                emit(ctx.layer,
                    {
                        x: p.x + rand(-10,
                            10), y: p.y + lift + rand(-10,
                            10)
                    },
                    {
                        color: [STEEL,
                            VIOLET], kind: "dot", life: [0.2,
                            0.4], size: [8,
                            2], alpha: 1, speed: [10,
                            80], drag: 2
                    })
            })
        await burst(ctx.layer,
            from,
            1,
            {
                color: [VIOLET], kind: "ring", life: [0.3,
                    0.3], size: [20,
                    150], alpha: 0.9
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
