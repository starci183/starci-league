// VFX Qiyana trên Cocos, theo thiết kế bản web (fx_qiyana.ts): lưỡi Ixtal vàng chém ngay tại mục tiêu rồi nguyên tố nổ ra. Ba
// nguyên tố theo đường: Đất cam đỏ đá nung, Nước xanh sông, Cỏ xanh lá. Trận chưa báo nguyên tố đang giữ nên mỗi lần phát lấy
// ngẫu nhiên một nguyên tố (đúng luật: đường mang nguyên tố ngẫu nhiên). Ô: basic_qiyana, qiyana_p/q/e/r.
import {
    Node
} from "cc"
import {
    angleOf, mix, pick, rand, wait, type Pt
} from "./particles"
import {
    emit, meleeSlash
} from "./g2_helpers"
import {
    registerSkillVfx
} from "./registry"
import {
    TAU, UP, add, aim, cracks, debris, fly, glow, main, motes, polar, pow, pulse, ring, row, settle, slashArc, slashLine, smoke, sparks,
    spikes, stunStars
} from "./g2_helpers"

const GOLD = [0xffd56a, 0xe0a040, 0xfff0b0]

type Element = "earth" | "water" | "grass"
interface Elem { main: number[]; dark: number[]; glow: number }
const ELEM: Record<Element, Elem> = {
    earth: {
        main: [0xff7a3a, 0xe0603a, 0xffb060], dark: [0x6a3a24, 0x8a4a2a, 0x4a2a1a], glow: 0xff8a40
    },
    water: {
        main: [0x40c0ff, 0x80e0ff, 0x2a90e0], dark: [0x1a5a9a, 0x2a70b0], glow: 0x60d0ff
    },
    grass: {
        main: [0x60e060, 0x3ac04a, 0xa0ff80], dark: [0x2a7a2a, 0x1a5a20], glow: 0x80ff70
    },
}
const anyElem = (): Element => pick(["earth", "water", "grass"] as const)

/** Cú nổ nguyên tố tại mục tiêu; k càng lớn càng dữ */
function elemBurst(layer: Node, at: Pt, el: Element, k: number) {
    const e = ELEM[el]
    glow(layer,
        at,
        [e.glow],
        40,
        170 * k,
        0.35,
        0.75)
    if (el === "earth") {
        // đá nung vỡ: mảnh đá, vết nứt cam, thêm phần nổ theo Máu đã mất
        debris(layer,
            at,
            Math.round(14 * k),
            e.dark,
            20)
        sparks(layer,
            at,
            Math.round(10 * k),
            e.main,
            [240,
                560])
        cracks(layer,
            at,
            6,
            80 * k,
            e.main,
            0.6)
        smoke(layer,
            at,
            4,
            [0x6a4a3a, 0x8a6a50],
            30,
            70)
    } else if (el === "water") {
        // nước sông: tia nước bắn vồng, vòng nước trói (Choáng)
        for (let i = 0; i < Math.round(30 * k); i++) emit(layer,
            at,
            {
                color: e.main, kind: "dot", life: [0.4,
                    0.8], size: [9,
                    3], alpha: 1, speed: [200,
                    520], angle: [0.3,
                    Math.PI - 0.3], gravity: -1000
            })
        ring(layer,
            at,
            [0x80e0ff],
            40,
            190 * k,
            0.4)
        ring(layer,
            add(at,
                0,
                -20),
            [0x40c0ff],
            160,
            90,
            0.6,
            0.8)
        spikes(layer,
            add(at,
                0,
                -20),
            8,
            60,
            22,
            [0x80e0ff, 0x40c0ff],
            40,
            0.6,
            true)
    } else {
        // cỏ: lá xanh xoay lượn, sương xanh mỏng (Tàng Hình)
        for (let i = 0; i < Math.round(16 * k); i++) emit(layer,
            at,
            {
                color: e.main, kind: "blade", additive: false, life: [0.6,
                    1.0], size: [16,
                    12], alpha: 1, speed: [120,
                    320], drag: 2, spin: [-6,
                    6], gravity: -120, stretch: 1.5
            })
        smoke(layer,
            at,
            6,
            [0x80e080, 0xa0f0a0],
            40,
            90,
            {
                alpha: 0.35
            })
    }
}

/** Lưỡi Ixtal vàng chém chéo tại `at`, thấm màu nguyên tố */
function ixtalCut(layer: Node, at: Pt, a: number, len: number, w: number, el: Element | null) {
    const cols = el ? [...GOLD, ...ELEM[el].main] : GOLD
    return slashLine(layer,
        at,
        a,
        len,
        w,
        cols,
        0.09,
        0.32)
}

/** Đánh thường: nhẫn lưỡi ba màu chém một vết trăng khuyết mảnh trên mục tiêu */
registerSkillVfx("basic_qiyana",
    (ctx) => meleeSlash(ctx.layer,
            main(ctx),
            aim(ctx),
            [0xffd56a, 0xff7a3a, 0x40c0ff, 0x60e060],
            1,
            0xfff0b0))

/** Nội tại Thần Khí Ixtal: vật liệu của đường đang đứng trồi lên rồi bay xoáy vào Qiyana, tướng bừng màu nguyên tố */
registerSkillVfx("qiyana_p",
    async (ctx) => {
        const el = anyElem()
        const e = ELEM[el]
        const at = ctx.from
        await pulse(ctx.layer,
            0.45,
            90,
            (t) => {
                const a = rand(0,
                    TAU)
                const s = add(at,
                    Math.cos(a) * 90,
                    -50 + Math.sin(a) * 24)
                emit(ctx.layer,
                    s,
                    {
                        color: el === "earth" ? e.dark : e.main, kind: el === "grass" ? "blade" : "dot", additive: el === "water", life: [0.3,
                            0.36], size: [12,
                            6], alpha: 1, speed: [280,
                            320], angle: [angleOf(s,
                            at),
                        angleOf(s,
                            at)], spin: [-6,
                            6]
                    })
                if (t > 0.5) emit(ctx.layer,
                    at,
                    {
                        color: [e.glow], kind: "glow", life: [0.1,
                            0.16], size: [60,
                            90], alpha: 0.4
                    })
            })
        glow(ctx.layer,
            at,
            [e.glow],
            50,
            170,
            0.4)
        ring(ctx.layer,
            at,
            [...GOLD.slice(0,
                1), e.glow],
            40,
            170,
            0.4)
        motes(ctx.layer,
            at,
            12,
            [...e.main, 0xffd56a],
            [40,
                140],
            {
                gravity: 100
            })
        await settle(ctx.layer,
            0.5)
    })

/**
 * Q Lưỡi Đao Nguyên Tố: không bay đạn. Lưỡi vàng rút ra (vật liệu nguyên tố cuộn quanh tay), lưỡi chém thẳng tại tướng đối
 * diện, nguyên tố nổ ngay chỗ chém: Đất đá vỡ, Nước trói (Choáng), Cỏ lá cuốn (Tàng Hình).
 */
registerSkillVfx("qiyana_q",
    async (ctx) => {
        const k = pow(ctx)
        const el = anyElem()
        const to = main(ctx)
        const d = aim(ctx)
        // rút lưỡi
        await pulse(ctx.layer,
            0.2,
            120,
            (t) => {
                const a = t * TAU * 2
                emit(ctx.layer,
                    polar(ctx.from,
                        a,
                        44),
                    {
                        color: ELEM[el].main, kind: "dot", life: [0.15,
                            0.25], size: [9,
                            3], alpha: 1
                    })
                emit(ctx.layer,
                    ctx.from,
                    {
                        color: GOLD, kind: "blade", life: [0.06,
                            0.1], size: [40,
                            14], alpha: 0.9, rotation: d, stretch: 2.6
                    })
            })
        await ixtalCut(ctx.layer,
            to,
            d + 0.8,
            170,
            22,
            el)
        await ixtalCut(ctx.layer,
            to,
            d - 0.6,
            130,
            16,
            el)
        elemBurst(ctx.layer,
            to,
            el,
            1.1 * k)
        if (el === "water") void stunStars(ctx.layer,
            to,
            [0x80e0ff, 0xffffff],
            0.7)
        if (el === "grass") void pulse(ctx.layer,
            0.5,
            40,
            () => emit(ctx.layer,
                add(ctx.from,
                    rand(-50,
                        50),
                    rand(-60,
                        60)),
                {
                    color: [0xa0ff80, 0x60e060], kind: "glow", life: [0.3,
                        0.5], size: [16,
                        4], alpha: 0.6
                }))
        await settle(ctx.layer,
            0.5)
    })

/**
 * E Vũ Điệu Nguyên Tố: chọn địch bất kỳ đường, đổi chỗ sang đối diện nó. Đạp bật đất, lưỡi vàng loé, vật liệu nguyên tố của đường
 * cũ cuộn quanh (cú đổi chỗ do swap.ts vẽ), rồi nhát chém ngang tại mục tiêu; chạm là nguyên tố của đường cũ nổ. Đường mới đổi nguyên tố.
 */
registerSkillVfx("qiyana_e",
    async (ctx) => {
        const k = pow(ctx)
        const el = anyElem()
        const to = main(ctx)
        const land = {
            x: to.x, y: ctx.from.y
        }
        // đạp bật đất
        ring(ctx.layer,
            ctx.from,
            [0xc09060],
            30,
            150,
            0.35,
            0.6,
            false)
        debris(ctx.layer,
            ctx.from,
            6,
            [0x8a6a4a, 0xc09060],
            12)
        sparks(ctx.layer,
            ctx.from,
            8,
            GOLD,
            [120,
                300])
        // cú đổi chỗ do swap.ts vẽ; ở đây lưỡi vàng loé và vật liệu nguyên tố của đường cũ cuộn quanh chỗ đạp
        await pulse(ctx.layer,
            0.25,
            140,
            (t) => {
                const a = t * TAU * 2 + rand(0,
                    0.5)
                emit(ctx.layer,
                    polar(ctx.from,
                        a,
                        50 + 30 * t),
                    {
                        color: ELEM[el].main, kind: el === "grass" ? "blade" : "dot", additive: el !== "earth", life: [0.3,
                            0.5], size: [10,
                            4], alpha: 1, spin: [-4,
                            4]
                    })
                emit(ctx.layer,
                    ctx.from,
                    {
                        color: GOLD, kind: "blade", life: [0.06,
                            0.1], size: [44,
                            14], alpha: 0.9, rotation: UP + (t - 0.5) * 2, stretch: 2.6
                    })
            })
        await ixtalCut(ctx.layer,
            to,
            0.1,
            200,
            22,
            el)
        elemBurst(ctx.layer,
            to,
            el,
            1.0 * k)
        // nguyên tố của đường mới bừng dưới chân
        const nu = ELEM[anyElem()]
        glow(ctx.layer,
            land,
            [nu.glow],
            40,
            130,
            0.4,
            0.6)
        await settle(ctx.layer,
            0.5)
    })

/**
 * R Biến Động Tối Thượng: gió vàng xoáy về lưỡi, ba màu nguyên tố thu lại thành màu đang giữ; luồng gió vàng dạng quạt phủ
 * đối diện và 2 đường kề, chạm hàng địch thì vàng dội ra và nguyên tố phun tại từng tướng; đối diện nổ to nhất.
 */
registerSkillVfx("qiyana_r",
    async (ctx) => {
        const k = pow(ctx)
        const el = anyElem()
        const foes = row(ctx,
            3)
        const at = ctx.from
        // gió vàng bốc từ chân lên lưỡi, ba màu thu về một
        await pulse(ctx.layer,
            0.4,
            160,
            (t) => {
                const cols = t < 0.5 ? [0xff7a3a, 0x40c0ff, 0x60e060] : ELEM[el].main
                emit(ctx.layer,
                    add(at,
                        rand(-70,
                            70),
                        -40),
                    {
                        color: [...GOLD, ...cols], kind: "blade", life: [0.25,
                            0.35], size: [22,
                            8], alpha: 0.9, speed: [200,
                            360], angle: [UP - 0.25,
                            UP + 0.25], align: true, stretch: 2.4
                    })
            })
        glow(ctx.layer,
            at,
            [0xfff0b0],
            50,
            200,
            0.3)
        // luồng gió quạt: nhiều vệt vàng lao về 3 đường
        await Promise.all(foes.map((p, i) => fly(ctx.layer,
            0.32,
            (u) => mix(at,
                p,
                u),
            (q, dd) => {
                for (let j = 0; j < 3; j++) emit(ctx.layer,
                    polar(q,
                        dd + UP,
                        rand(-30,
                            30)),
                    {
                        color: [...GOLD, ...ELEM[el].main], kind: "blade", life: [0.2,
                            0.35], size: [44,
                            14], alpha: 0.85, rotation: dd, stretch: 3
                    })
                if (i === 0) glow(ctx.layer,
                    q,
                    [0xfff0b0],
                    60,
                    30,
                    0.12,
                    0.8)
            },
            (t) => t * t)))
        await Promise.all(foes.map(async (p, i) => {
            const big = i === 0
            glow(ctx.layer,
                p,
                [0xfff0b0],
                40,
                big ? 130 : 80,
                0.22)
            ring(ctx.layer,
                p,
                GOLD,
                40,
                big ? 180 : 120,
                0.4)
            elemBurst(ctx.layer,
                p,
                el,
                big ? 1.2 * k * 0.75 : 0.8)
            if (el === "water") void stunStars(ctx.layer,
                p,
                [0x80e0ff, 0xffffff],
                big ? 0.8 : 0.6)
            await wait(ctx.layer,
                0.05)
        }))
        // Cỏ: tướng mình 3 đường được sương xanh che
        if (el === "grass") for (const p of foes) void pulse(ctx.layer,
            0.5,
            30,
            () => emit(ctx.layer,
                add({
                    x: p.x, y: at.y
                },
                rand(-50,
                    50),
                rand(-50,
                    50)),
                {
                    color: [0xa0ff80, 0x60e060], kind: "glow", life: [0.3,
                        0.5], size: [18,
                        4], alpha: 0.6
                }))
        await settle(ctx.layer,
            0.7)
    })
