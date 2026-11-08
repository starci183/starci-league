// VFX Zed trên Cocos, theo thiết kế web (packages/client/src/card/vfx/fx_zed.ts): BÓNG TỐI VÀ THÉP. Khói mực đen (không cộng màu
// để đen thật trên bàn sáng), tàn đỏ thẫm, mảnh lưỡi thép sắc. Phi tiêu là bốn mảnh blade xoay quanh tâm, phân thân là cột khói mực.
// Ô đăng ký: basic_zed, zed_p (Liên Hoàn), zed_q (Phi Tiêu Sắc Lẻm), zed_e (Phân Thân Bóng Tối), zed_r (Dấu Ấn Tử Thần).
import {
    Node
} from "cc"
import {
    angleOf, ease, rand, type Pt
} from "./particles"
import {
    registerSkillVfx
} from "./registry"
import {
    flash, fly, mainOf, motes, polar, power, ring, shards, shift, slashArc, slashLine, smoke, straight, UP, vortex, emit, over, wait, meleeSlash
} from "./g1_helpers"

const INK = [0x06050a,
    0x120a18,
    0x1c1020]
const VOID = 0x3a1038
const CRIMSON = 0xe3123f
const DEEP_RED = 0xa8082c
const EMBER = 0xff5a6a
const STEEL = 0xeef3f8
const STEEL_DIM = 0x9aa3ad

/** Khói mực bung ra kèm tàn đỏ bay lên */
function inkPuff(layer: Node, at: Pt, n: number, size: number) {
    smoke(layer,
        at,
        n,
        INK,
        size,
        {
            alpha: 0.75, speed: [20,
                110]
        })
    void motes(layer,
        at,
        Math.round(n * 1.5),
        [CRIMSON,
            EMBER],
        {
            kind: "blade", size: [12,
                3], align: true, stretch: 2.4, speed: [60,
                200], angle: [UP - 0.8,
                UP + 0.8], life: [0.4,
                0.7]
        })
}

/** Phi tiêu: bốn cánh thép quanh tâm đỏ, xoay theo `rot`. Vẽ lại mỗi khung */
function shuriken(layer: Node, at: Pt, rot: number, size: number, life = 0.05) {
    for (let i = 0; i < 4; i++) {
        const a = rot + (i * Math.PI) / 2
        emit(layer,
            polar(at,
                a,
                size * 0.32),
            {
                color: [STEEL,
                    STEEL_DIM], kind: "blade", life: [life,
                    life], size: [size * 0.75,
                    size * 0.75], alpha: 1, rotation: a + 0.35, stretch: 1.3
            })
    }
    emit(layer,
        at,
        {
            color: [CRIMSON], kind: "glow", life: [life * 2,
                life * 3], size: [size * 0.9,
                size * 0.5], alpha: 0.8
        })
}

/** Phân thân bóng: cột khói mực đứng tại `at` */
function shade(layer: Node, at: Pt, life: number) {
    for (let i = 0; i < 6; i++) {
        emit(layer,
            shift(at,
                rand(-8,
                    8),
                -40 + i * 18),
            {
                color: INK, kind: "glow", additive: false, life: [life * 0.8,
                    life], size: [52 - i * 4,
                    46 - i * 4], alpha: 0.75
            })
    }
    emit(layer,
        shift(at,
            0,
            46),
        {
            color: [CRIMSON], kind: "dot", life: [life,
                life], size: [8,
                8], alpha: 1
        })
}

/** Đánh thường (cận chiến, không đạn bay). Chém: hai vết liềm thép mảnh bắt chéo ngay trên mục tiêu, tia đỏ */
registerSkillVfx("basic_zed",
    async (ctx) => {
        await meleeSlash(ctx.layer, mainOf(ctx), [STEEL, STEEL_DIM], [CRIMSON, EMBER, STEEL], 2, 0.9)
    })

/** P Liên Hoàn: +1 tầng, bóng phụt khỏi Zed, vòng đỏ siết lại quanh thân, hai lưỡi trên tay loé thép */
registerSkillVfx("zed_p",
    async (ctx) => {
        const me = ctx.from
        inkPuff(ctx.layer,
            me,
            8,
            60)
        ring(ctx.layer,
            me,
            [CRIMSON,
                DEEP_RED],
            200,
            60,
            0.45,
            0.9)
        await vortex(ctx.layer,
            me,
            110,
            0.35,
            70,
            [CRIMSON,
                EMBER],
            {
                kind: "blade", size: [14,
                    4], align: true, stretch: 2.2
            },
            0.6)
        for (const s of [-1,
            1]) {
            emit(ctx.layer,
                shift(me,
                    s * 36,
                    10),
                {
                    color: [STEEL], kind: "blade", life: [0.3,
                        0.35], size: [46,
                        30], alpha: 1, rotation: UP + s * 0.5, stretch: 2
                })
        }
        flash(ctx.layer,
            me,
            [VOID,
                CRIMSON],
            50,
            120,
            0.35,
            0.5)
        await wait(ctx.layer,
            0.35)
    })

/** Q Phi Tiêu Sắc Lẻm: phân thân hiện bên cạnh, Zed và bóng cùng ném phi tiêu xoay kéo vệt đỏ và khói đen, cả hai găm vào mục tiêu;
 * lưỡi trên tay Zed mài sáng (đòn đánh lượt này mạnh thêm) */
registerSkillVfx("zed_q",
    async (ctx) => {
        const k = power(ctx)
        const to = mainOf(ctx)
        const dir = angleOf(ctx.from,
            to)
        const clone = polar(ctx.from,
            dir + UP,
            120)
        inkPuff(ctx.layer,
            clone,
            6,
            50)
        shade(ctx.layer,
            clone,
            0.9)
        await wait(ctx.layer,
            0.15)
        const throwOne = (a: Pt, scale: number) => fly(ctx.layer,
            straight(a,
                to),
            0.36,
            (p, t, d) => {
                shuriken(ctx.layer,
                    p,
                    t * 30,
                    46 * scale)
                emit(ctx.layer,
                    p,
                    {
                        color: [CRIMSON,
                            DEEP_RED], kind: "blade", life: [0.15,
                            0.25], size: [30,
                            10], alpha: 0.8, rotation: d, stretch: 2.6
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: INK, kind: "glow", additive: false, life: [0.25,
                            0.4], size: [26,
                            10], alpha: 0.5
                    })
            },
            ease.linear)
        await Promise.all([throwOne(ctx.from,
            k),
        throwOne(clone,
            0.85 * k)])
        // găm: thép văng mọi hướng, đỏ và mực bung
        flash(ctx.layer,
            to,
            [STEEL],
            30,
            120,
            0.18)
        flash(ctx.layer,
            to,
            [CRIMSON],
            50,
            160,
            0.35,
            0.6)
        shards(ctx.layer,
            to,
            Math.round(16 * k),
            [STEEL,
                STEEL_DIM,
                CRIMSON])
        inkPuff(ctx.layer,
            to,
            7,
            60)
        // lưỡi trên tay sáng lên
        await over(ctx.layer,
            0.35,
            (t) => {
                for (const s of [-1,
                    1]) emit(ctx.layer,
                    shift(ctx.from,
                        s * 34,
                        8 + t * 20),
                    {
                        color: [STEEL,
                            CRIMSON], kind: "dot", life: [0.15,
                            0.25], size: [7,
                            2], alpha: 1, speed: [10,
                            40]
                    })
            })
        await wait(ctx.layer,
            0.2)
    })

/** E Phân Thân Bóng Tối: Zed tan vào bóng, chém xoáy một vòng quanh mục tiêu (đường bất kỳ; cú dịch chuyển do swapUnits diễn) */
registerSkillVfx("zed_e",
    async (ctx) => {
        const k = power(ctx)
        const to = mainOf(ctx)
        // tan vào bóng tại chỗ; dịch chuyển sang đối diện do swapUnits (vfx/swap.ts) diễn chung
        inkPuff(ctx.layer, ctx.from, 8, 60)
        flash(ctx.layer, to, [CRIMSON], 30, 110, 0.3, 0.6)
        await wait(ctx.layer, 0.12)
        // chém xoáy quanh mục tiêu, mảnh thép bay theo tiếp tuyến
        const a0 = rand(0,
            Math.PI * 2)
        await Promise.all([
            slashArc(ctx.layer,
                to,
                84 * k,
                a0,
                a0 + Math.PI * 2,
                0.26,
                [STEEL,
                    STEEL_DIM],
                26,
                {
                    keep: 0.28, head: [STEEL]
                }),
            slashArc(ctx.layer,
                to,
                66 * k,
                a0 + 0.6,
                a0 + 0.6 + Math.PI * 2,
                0.26,
                [CRIMSON,
                    DEEP_RED],
                22,
                {
                    keep: 0.32, head: [EMBER]
                }),
        ])
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2
            emit(ctx.layer,
                polar(to,
                    a,
                    80),
                {
                    color: [STEEL,
                        CRIMSON], kind: "blade", life: [0.2,
                        0.35], size: [22,
                        6], alpha: 1, speed: [200,
                        360], angle: [a + UP,
                        a + UP], drag: 2, align: true, stretch: 2.4
                })
        }
        inkPuff(ctx.layer,
            to,
            6,
            70)
        await wait(ctx.layer,
            0.35)
    })

/** R Dấu Ấn Tử Thần: bóng dâng nuốt Zed, Zed cùng hai phân thân từ ba phía xuyên qua mục tiêu, chữ X đỏ xé ngang, rồi Dấu Ấn (phi tiêu
 * đỏ) treo xoay trên đầu nó: cuối lượt mới nổ */
registerSkillVfx("zed_r",
    async (ctx) => {
        const k = power(ctx)
        const to = mainOf(ctx)
        const dir = angleOf(ctx.from,
            to)
        // bóng nuốt Zed
        shade(ctx.layer,
            ctx.from,
            0.6)
        await vortex(ctx.layer,
            ctx.from,
            120,
            0.3,
            110,
            [CRIMSON,
                EMBER,
                VOID])
        inkPuff(ctx.layer,
            ctx.from,
            10,
            70)
        // ba bóng xuyên qua mục tiêu cùng lúc
        const behind = polar(to,
            dir,
            90)
        const starts = [ctx.from,
            polar(to,
                dir + Math.PI - 1.1,
                260),
            polar(to,
                dir + Math.PI + 1.1,
                260)]
        await Promise.all(starts.map((s, i) => fly(ctx.layer,
            straight(s,
                i === 0 ? behind : polar(to,
                    angleOf(s,
                        to),
                    90)),
            0.24,
            (p) => {
                emit(ctx.layer,
                    p,
                    {
                        color: INK, kind: "glow", additive: false, life: [0.3,
                            0.4], size: [56,
                            18], alpha: 0.75
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: [CRIMSON], kind: "glow", life: [0.12,
                            0.2], size: [30,
                            10], alpha: 0.8
                    })
            },
            ease.in)))
        // chữ X đỏ, sốc trắng, mực bung rộng
        flash(ctx.layer,
            to,
            [STEEL],
            40,
            170 * k,
            0.2)
        void slashLine(ctx.layer,
            to,
            0.8,
            210 * k,
            0.12,
            [CRIMSON,
                DEEP_RED,
                STEEL],
            26)
        await slashLine(ctx.layer,
            to,
            Math.PI - 0.8,
            210 * k,
            0.12,
            [CRIMSON,
                DEEP_RED,
                STEEL],
            26)
        ring(ctx.layer,
            to,
            [CRIMSON],
            40,
            260 * k,
            0.4,
            0.9)
        inkPuff(ctx.layer,
            to,
            12,
            90)
        shards(ctx.layer,
            to,
            14,
            [STEEL,
                CRIMSON])
        // Dấu Ấn: phi tiêu đỏ xoay trên đầu, khói đỏ quấn quanh thân, đập theo nhịp tim
        const top = shift(to,
            0,
            80)
        await over(ctx.layer,
            0.7,
            (t) => {
                const beat = 1 + 0.25 * Math.max(0,
                    Math.sin(t * Math.PI * 6))
                shuriken(ctx.layer,
                    top,
                    t * 9,
                    40 * beat * k)
                emit(ctx.layer,
                    top,
                    {
                        color: [CRIMSON], kind: "glow", life: [0.06,
                            0.08], size: [70 * beat,
                            60], alpha: 0.35
                    })
                const a = t * Math.PI * 4
                emit(ctx.layer,
                    {
                        x: to.x + Math.cos(a) * 56, y: to.y + Math.sin(a) * 22 + t * 30
                    },
                    {
                        color: [DEEP_RED,
                            CRIMSON], kind: "glow", additive: false, life: [0.3,
                            0.4], size: [24,
                            10], alpha: 0.6
                    })
            })
        await wait(ctx.layer,
            0.1)
    })

