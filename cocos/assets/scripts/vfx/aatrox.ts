// VFX Aatrox trên Cocos, theo thiết kế web (packages/client/src/card/vfx/fx_aatrox.ts): MÁU DARKIN. Máu đặc đỏ thẫm, khói đen,
// mép kiếm nóng chảy vàng cam, xích sắt đen xoắn đôi quầng lửa cam, đôi cánh quỷ. Đòn cận chiến diễn ra tại mục tiêu.
// Ô đăng ký: basic_aatrox, aatrox_p (Cái Giá Bằng Máu), aatrox_q (Lưỡi Gươm Darkin), aatrox_e (Xiềng Xích Hút Máu), aatrox_r (Kẻ Diệt Thế).
import {
    Node
} from "cc"
import {
    angleOf, ease, mix, rand, type Pt
} from "./particles"
import {
    registerSkillVfx
} from "./registry"
import {
    allFoes, bent, drops, flash, fly, mainOf, motes, polar, power, ring, rowsOf, shards, shift, slashArc, smoke,
    strand, UP, withNeighbours, emit, over, wait, meleeSlash
} from "./g1_helpers"

const CRIMSON = 0xd0142c
const SCARLET = 0xff2a3c
const GORE = 0xa80f22
const BLOOD = 0x7a0a18
const DUSK = 0x4a0812
const BLACK = 0x16040a
const IRON = 0x2a0c12
const EMBER = 0xff4a1e
const MOLTEN = 0xffb43a
const HOT = 0xffe9c4
const HEAL = 0x7dff9a

/** Nhát chém vào da thịt: máu văng, mảnh sắc nóng chảy, khói đen phía sau */
function gash(layer: Node, at: Pt, dir: number, k: number) {
    flash(layer,
        at,
        [HOT,
            MOLTEN],
        30 * k,
        120 * k,
        0.2)
    flash(layer,
        at,
        [BLACK,
            DUSK],
        70 * k,
        170 * k,
        0.5,
        0.5,
        false)
    drops(layer,
        at,
        Math.round(18 * k),
        [CRIMSON,
            GORE,
            BLOOD],
        {
            angle: [dir - 1,
                dir + 1]
        })
    shards(layer,
        at,
        Math.round(10 * k),
        [MOLTEN,
            EMBER,
            HOT],
        {
            angle: [dir - 0.8,
                dir + 0.8], gravity: -400
        })
    smoke(layer,
        at,
        Math.round(4 * k),
        [BLACK,
            DUSK],
        60 * k)
}

/** Máu hiện cùng lúc trên toàn đường từ nạn nhân về Aatrox, chảy dần về rồi hồi Máu */
async function leech(layer: Node, from: Pt, to: Pt, secs: number) {
    await over(layer,
        secs,
        (t) => {
            strand(layer,
                from,
                to,
                22,
                {
                    color: [CRIMSON,
                        GORE], kind: "glow", life: [0.06,
                        0.08], size: [20,
                        14], alpha: 0.6 * (1 - t * 0.5)
                },
                10,
                t * 12)
            emit(layer,
                bent(from,
                    to,
                    20)(ease.inOut(t)),
                {
                    color: [SCARLET,
                        HOT], kind: "glow", life: [0.1,
                        0.15], size: [30,
                        10], alpha: 1
                })
        })
    flash(layer,
        to,
        [HEAL,
            SCARLET],
        40,
        140,
        0.4,
        0.55)
    motes(layer,
        to,
        12,
        [HEAL,
            SCARLET],
        {
            angle: [UP - 0.6,
                UP + 0.6], speed: [60,
                160]
        })
}

/** Đánh thường (cận chiến, không đạn bay). Chém: một vết liềm đại kiếm mép nóng chảy ngay trên mục tiêu, vài giọt máu */
registerSkillVfx("basic_aatrox",
    async (ctx) => {
        const to = mainOf(ctx)
        drops(ctx.layer, to, 6, [CRIMSON, GORE], { speed: [80, 200], size: [6, 3] })
        await meleeSlash(ctx.layer, to, [CRIMSON, MOLTEN, HOT], [MOLTEN, EMBER, SCARLET], 1, 1.2)
    })

/** P Cái Giá Bằng Máu: sát thương thêm là máu bùng tại mục tiêu, rồi máu chảy ngược về Aatrox hồi Máu */
registerSkillVfx("aatrox_p",
    async (ctx) => {
        const to = mainOf(ctx)
        flash(ctx.layer,
            ctx.from,
            [CRIMSON,
                EMBER],
            40,
            120,
            0.35,
            0.6)
        gash(ctx.layer,
            to,
            UP,
            1)
        ring(ctx.layer,
            to,
            [SCARLET],
            20,
            160,
            0.35,
            0.8)
        await wait(ctx.layer,
            0.12)
        await leech(ctx.layer,
            to,
            ctx.from,
            0.5)
        await wait(ctx.layer,
            0.25)
    })

/** Q Lưỡi Gươm Darkin: Aatrox trả Máu, máu trào khỏi thân đọng thành đại kiếm giơ cao, rồi lưỡi liềm khổng lồ bổ ngang qua tướng đối
 * diện và 2 đường kề trong cùng một nhịp; mỗi đường một vụ máu nổ */
registerSkillVfx("aatrox_q",
    async (ctx) => {
        const k = power(ctx)
        const rows = rowsOf(ctx)
        const to = mainOf(ctx)
        const me = ctx.from
        // trả Máu
        drops(ctx.layer,
            me,
            14,
            [CRIMSON,
                GORE],
            {
                speed: [80,
                    220]
            })
        // kiếm máu đọng trên đầu
        await over(ctx.layer,
            0.4,
            (t) => {
                const n = Math.ceil(t * 8)
                for (let i = 0; i < n; i++) emit(ctx.layer,
                    shift(me,
                        0,
                        40 + i * 20),
                    {
                        color: i === n - 1 ? [MOLTEN,
                            HOT] : [CRIMSON,
                            GORE], kind: "blade", life: [0.05,
                            0.07], size: [44 - i * 2,
                            30], alpha: 1, rotation: UP, stretch: 1.4
                    })
                emit(ctx.layer,
                    shift(me,
                        rand(-50,
                            50),
                        rand(-20,
                            20)),
                    {
                        color: [CRIMSON,
                            SCARLET], kind: "dot", life: [0.3,
                            0.3], size: [8,
                            3], alpha: 1, speed: [200,
                            260], angle: [UP,
                            UP]
                    })
            })
        // lưỡi liềm bổ qua ba đường
        const lanes = withNeighbours(rows.foe,
            to,
            rows.spacing)
        const R = rows.spacing * 1.35
        const face = rows.up > 0 ? UP : -UP
        const c = shift(to,
            0,
            -rows.up * R * 0.8)
        await Promise.all([
            slashArc(ctx.layer,
                c,
                R,
                face + 1,
                face - 1,
                0.24,
                [CRIMSON,
                    GORE,
                    BLOOD],
                40 * k,
                {
                    additive: false, keep: 0.4, head: [MOLTEN]
                }),
            slashArc(ctx.layer,
                c,
                R + 26,
                face + 1,
                face - 1,
                0.24,
                [MOLTEN,
                    EMBER,
                    HOT],
                30 * k,
                {
                    keep: 0.3, head: [HOT]
                }),
        ])
        for (const p of lanes) {
            gash(ctx.layer,
                p,
                face,
                1.1 * k)
            ring(ctx.layer,
                p,
                [SCARLET,
                    EMBER],
                30,
                190 * k,
                0.35,
                0.85)
        }
        await wait(ctx.layer,
            0.5)
    })

/** E Xiềng Xích Hút Máu: hai sợi xích sắt đen xoắn đôi quầng lửa cam bắn tới mục tiêu, siết lại với lốc lửa cam, máu chảy dọc xích về hồi */
registerSkillVfx("aatrox_e",
    async (ctx) => {
        const k = power(ctx)
        const to = mainOf(ctx)
        const me = ctx.from
        const chain = (tip: Pt, phase: number) => {
            for (const s of [0,
                Math.PI]) {
                strand(ctx.layer,
                    me,
                    tip,
                    14,
                    {
                        color: [IRON,
                            BLACK], kind: "blade", additive: false, life: [0.05,
                            0.05], size: [16,
                            12], alpha: 1, stretch: 1.3
                    },
                    12,
                    phase + s)
                strand(ctx.layer,
                    me,
                    tip,
                    24,
                    {
                        color: [EMBER,
                            MOLTEN], kind: "glow", life: [0.05,
                            0.06], size: [22,
                            18], alpha: 0.35
                    },
                    12,
                    phase + s)
            }
        }
        await over(ctx.layer,
            0.28,
            (t) => chain(mix(me,
                to,
                ease.out(t)),
            t * 8))
        flash(ctx.layer,
            to,
            [HOT,
                MOLTEN],
            30,
            120 * k,
            0.2)
        // xích siết, lốc lửa cam xoáy quanh mục tiêu
        await over(ctx.layer,
            0.45,
            (t) => {
                chain(to,
                    2 + t * 10)
                for (let i = 0; i < 3; i++) {
                    const a = t * Math.PI * 5 + (i * Math.PI * 2) / 3
                    emit(ctx.layer,
                        {
                            x: to.x + Math.cos(a) * 60 * k, y: to.y + Math.sin(a) * 30 * k
                        },
                        {
                            color: [EMBER,
                                MOLTEN], kind: "glow", life: [0.15,
                                0.25], size: [26,
                                8], alpha: 0.9
                        })
                }
            })
        gash(ctx.layer,
            to,
            angleOf(me,
                to),
            1.0 * k)
        await leech(ctx.layer,
            to,
            me,
            0.4)
        await wait(ctx.layer,
            0.2)
    })

/** Một cánh quỷ: các ngón xương vút lên toả ra từ vai, màng tối giữa các ngón, mép cháy. `side` 1 phải, -1 trái; `open` 0..1 */
function wing(layer: Node, root: Pt, side: number, open: number, k: number) {
    const fingers = 4
    for (let f = 0; f < fingers; f++) {
        const a = UP - side * (0.3 + f * 0.35 * open)
        const len = (120 + f * 18) * k * open
        for (let j = 1; j <= 5; j++) {
            const p = polar(root,
                a,
                (len * j) / 5)
            emit(layer,
                p,
                {
                    color: j === 5 ? [EMBER,
                        MOLTEN] : [CRIMSON,
                        GORE], kind: "blade", life: [0.05,
                        0.07], size: [26,
                        20], alpha: 1, rotation: a, stretch: 1.6
                })
            if (f < fingers - 1) emit(layer,
                polar(root,
                    a - side * 0.17,
                    (len * j) / 5.6),
                {
                    color: [DUSK,
                        BLACK], kind: "glow", additive: false, life: [0.06,
                        0.08], size: [34,
                        30], alpha: 0.6
                })
        }
    }
}

/** R Kẻ Diệt Thế: bóng đen phủ, máu từ mọi tướng địch bị hút về Aatrox, đôi cánh quỷ xoè rộng sau lưng, rồi máu và lưỡi đỏ phụt lên dưới
 * chân mọi tướng địch */
registerSkillVfx("aatrox_r",
    async (ctx) => {
        const k = power(ctx)
        const foes = allFoes(ctx)
        const me = ctx.from
        smoke(ctx.layer,
            me,
            14,
            [BLACK,
                DUSK,
                IRON],
            110,
            {
                alpha: 0.7, life: [0.8,
                    1.2]
            })
        await Promise.all(foes.map((f, i) => fly(ctx.layer,
            bent(f,
                me,
                (i - 2) * 50),
            0.5,
            (p) => {
                emit(ctx.layer,
                    p,
                    {
                        color: [CRIMSON,
                            SCARLET], kind: "glow", life: [0.15,
                            0.25], size: [24,
                            8], alpha: 0.85
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: [GORE], kind: "dot", additive: false, life: [0.25,
                            0.4], size: [7,
                            2], alpha: 1
                    })
            },
            ease.in)))
        flash(ctx.layer,
            me,
            [CRIMSON,
                EMBER],
            60,
            240 * k,
            0.4,
            0.7)
        // cánh xoè
        const root = shift(me,
            0,
            30)
        await over(ctx.layer,
            0.55,
            (t) => {
                const open = ease.out(Math.min(1,
                    t * 1.6))
                wing(ctx.layer,
                    shift(root,
                        14,
                        0),
                    1,
                    open,
                    k)
                wing(ctx.layer,
                    shift(root,
                        -14,
                        0),
                    -1,
                    open,
                    k)
                if (Math.random() < 0.6) emit(ctx.layer,
                    shift(root,
                        rand(-160,
                            160) * k,
                        rand(0,
                            140) * k),
                    {
                        color: [EMBER,
                            MOLTEN], kind: "dot", life: [0.4,
                            0.7], size: [6,
                            1], alpha: 1, speed: [40,
                            120], angle: [UP - 0.4,
                            UP + 0.4]
                    })
            })
        // máu phụt dưới chân mọi tướng địch
        for (const f of foes) {
            drops(ctx.layer,
                shift(f,
                    0,
                    -40),
                Math.round(18 * k),
                [CRIMSON,
                    GORE,
                    BLOOD],
                {
                    angle: [UP - 0.4,
                        UP + 0.4], speed: [300,
                        600]
                })
            for (let i = 0; i < 4; i++) emit(ctx.layer,
                shift(f,
                    rand(-40,
                        40),
                    -40),
                {
                    color: [SCARLET,
                        CRIMSON], kind: "blade", life: [0.3,
                        0.4], size: [46,
                        16], alpha: 1, speed: [300,
                        520], angle: [UP - 0.2,
                        UP + 0.2], drag: 2, align: true, stretch: 2.6
                })
            ring(ctx.layer,
                f,
                [SCARLET,
                    EMBER],
                30,
                200 * k,
                0.4,
                0.85)
            flash(ctx.layer,
                f,
                [BLACK,
                    DUSK],
                80,
                170,
                0.5,
                0.5,
                false)
        }
        await wait(ctx.layer,
            0.6)
    })
