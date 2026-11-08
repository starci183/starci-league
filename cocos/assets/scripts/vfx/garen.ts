// VFX Garen trên Cocos, theo thiết kế web (packages/client/src/card/vfx/fx_garen.ts): THÉP DEMACIA VÀ ÁNH SÁNG VÀNG. Đại kiếm
// sáng, vệt chém liềm vàng trắng, mảnh thép, tia lửa kim loại; nội tại là lửa xanh ngọc lục đúng icon; Câm Lặng là màn chàm tối
// với mũi thép vàng ghim từ trên xuống.
// Ô đăng ký: basic_garen, garen_p (Kiên Cường), garen_q (Đòn Quyết Định), garen_e (Phán Xét), garen_r (Công Lý Demacia).
import {
    Node
} from "cc"
import {
    ease, rand, type Pt
} from "./particles"
import {
    registerSkillVfx
} from "./registry"
import {
    column, flash, fly, mainOf, motes, power, ring, rise, rowsOf, shards, shift, slashArc, straight, UP, DOWN, vortex,
    withNeighbours, emit, over, wait, meleeSlash
} from "./g1_helpers"

const PALE = 0xfff3b8
const GOLD = 0xffd34a
const AMBER = 0xffa41f
const EMBER = 0xff7a18
const WHITE = 0xfffdf4
const STEEL = 0xcfd8e6
const STEEL_DARK = 0x7f8ba0
const INDIGO = 0x1a1046
const LIME = 0xa6ff5a
const TEAL = 0x34ffb0
const SKY = 0x34b4ff
const LIGHT = [WHITE,
    PALE,
    GOLD]

/** Đại kiếm mũi quay xuống, mũi tại `tip`: lưỡi trắng lõi, mép vàng, chắn ngang, chuôi. Vẽ lại mỗi khung */
function greatsword(layer: Node, tip: Pt, len: number, life = 0.05, alpha = 1) {
    const n = 7
    for (let i = 0; i < n; i++) {
        const t = i / (n - 1)
        const p = shift(tip,
            0,
            t * len * 0.75)
        const w = len * 0.22 * (0.55 + 0.45 * Math.min(1,
            t * 3))
        emit(layer,
            p,
            {
                color: [GOLD,
                    AMBER], kind: "blade", life: [life,
                    life], size: [w * 1.3,
                    w * 1.1], alpha, rotation: UP, stretch: 1.3
            })
        emit(layer,
            p,
            {
                color: [WHITE,
                    STEEL], kind: "blade", life: [life,
                    life], size: [w,
                    w * 0.6], alpha, rotation: UP, stretch: 1.3
            })
    }
    // chắn ngang và chuôi
    emit(layer,
        shift(tip,
            0,
            len * 0.78),
        {
            color: [GOLD], kind: "blade", life: [life,
                life], size: [len * 0.32,
                len * 0.2], alpha, rotation: 0, stretch: 2
        })
    emit(layer,
        shift(tip,
            0,
            len * 0.92),
        {
            color: [STEEL_DARK,
                AMBER], kind: "blade", additive: false, life: [life,
                life], size: [len * 0.16,
                len * 0.12], alpha, rotation: UP, stretch: 1.6
        })
    emit(layer,
        shift(tip,
            0,
            len * 0.4),
        {
            color: [PALE], kind: "glow", life: [life * 2,
                life * 3], size: [len * 0.5,
                len * 0.3], alpha: alpha * 0.4
        })
}

/** Kiếm nện: quầng vàng trắng, nan lửa vàng xoè sát đất, tia thép văng */
function smite(layer: Node, at: Pt, k: number) {
    flash(layer,
        at,
        [WHITE],
        40 * k,
        150 * k,
        0.2)
    flash(layer,
        at,
        [GOLD,
            AMBER],
        60 * k,
        190 * k,
        0.45,
        0.55)
    ring(layer,
        at,
        [GOLD],
        20,
        200 * k,
        0.35,
        0.85)
    for (let i = 0; i < 10; i++) {
        const a = (i / 9) * Math.PI
        emit(layer,
            at,
            {
                color: [PALE,
                    GOLD], kind: "blade", life: [0.22,
                    0.3], size: [50 * k,
                    12], alpha: 1, rotation: a, speed: [140,
                    220], angle: [a,
                    a], drag: 3, stretch: 2.6
            })
    }
    shards(layer,
        at,
        Math.round(10 * k),
        [STEEL,
            GOLD,
            EMBER],
        {
            gravity: -700
        })
}

/** Đánh thường (cận chiến, không đạn bay). Chém: một vết liềm kiếm vàng trắng mảnh ngay trên mục tiêu, tia thép */
registerSkillVfx("basic_garen",
    async (ctx) => {
        await meleeSlash(ctx.layer, mainOf(ctx), [PALE, WHITE, STEEL], [GOLD, STEEL, PALE], 1, 1.1)
    })

/** P Kiên Cường: lửa xanh ngọc lục bốc từ chân Garen hồi Máu, mảnh giáp thép viền vàng bay vào khoá lên thân (tăng Giáp) */
registerSkillVfx("garen_p",
    async (ctx) => {
        const me = ctx.from
        await Promise.all([
            rise(ctx.layer,
                shift(me,
                    0,
                    -40),
                110,
                0.6,
                110,
                [LIME,
                    TEAL,
                    0xdcffc0],
                {
                    kind: "glow", size: [22,
                        6], speed: [80,
                        200]
                }),
            wait(ctx.layer,
                0.2).then(() => vortex(ctx.layer,
                me,
                130,
                0.35,
                50,
                [STEEL,
                    STEEL_DARK,
                    GOLD],
                {
                    kind: "blade", additive: false, size: [22,
                        14], align: true, stretch: 1.4
                },
                0.1)),
        ])
        ring(ctx.layer,
            me,
            [GOLD,
                PALE],
            120,
            140,
            0.45,
            0.8)
        flash(ctx.layer,
            me,
            [LIME,
                GOLD],
            50,
            140,
            0.4,
            0.5)
        await wait(ctx.layer,
            0.3)
    })

/** Q Đòn Quyết Định: lưỡi kiếm bừng vàng, gió tốc lực kéo dọc; đại kiếm giáng từ trên xuống đầu tướng đối diện, rồi Câm Lặng: màn chàm
 * tối phủ, mũi thép vàng ghim từ trên đầu xuống */
registerSkillVfx("garen_q",
    async (ctx) => {
        const k = power(ctx)
        const to = mainOf(ctx)
        const me = ctx.from
        flash(ctx.layer,
            shift(me,
                30,
                40),
            [GOLD,
                WHITE],
            20,
            90,
            0.35)
        await over(ctx.layer,
            0.28,
            () => {
                for (let i = 0; i < 2; i++) emit(ctx.layer,
                    shift(me,
                        rand(-50,
                            50),
                        rand(-60,
                            20)),
                    {
                        color: [PALE,
                            WHITE], kind: "blade", life: [0.15,
                            0.25], size: [30,
                            6], alpha: 0.8, speed: [300,
                            500], angle: [UP,
                            UP], align: true, stretch: 3
                    })
            })
        // kiếm giáng
        await fly(ctx.layer,
            straight(shift(to,
                0,
                240),
            shift(to,
                0,
                -10)),
            0.18,
            (p) => greatsword(ctx.layer,
                p,
                150 * k),
            ease.in)
        void slashArc(ctx.layer,
            shift(to,
                40,
                40),
            110,
            UP + 0.6,
            DOWN - 0.4,
            0.14,
            [PALE,
                GOLD,
                AMBER],
            28,
            {
                keep: 0.25
            })
        smite(ctx.layer,
            to,
            1.1 * k)
        // Câm Lặng
        flash(ctx.layer,
            to,
            [INDIGO],
            120,
            140,
            0.75,
            0.6,
            false)
        for (let i = 0; i < 3; i++) {
            const x = (i - 1) * 34
            await fly(ctx.layer,
                straight(shift(to,
                    x,
                    130),
                shift(to,
                    x,
                    56)),
                0.08,
                (p) => emit(ctx.layer,
                    p,
                    {
                        color: [GOLD,
                            PALE], kind: "blade", life: [0.45,
                            0.55], size: [30,
                            24], alpha: 1, rotation: DOWN, stretch: 1.6
                    }),
                ease.in)
            motes(ctx.layer,
                shift(to,
                    x,
                    56),
                5,
                [GOLD],
                {
                    speed: [30,
                        90]
                })
        }
        await wait(ctx.layer,
            0.4)
    })

/** E Phán Xét (Quick): Garen xoay đại kiếm tại chỗ, vàng trắng cuộn quanh thân (Khiên), lưỡi xoay cuốn tại tướng đối diện và 2 đường kề */
registerSkillVfx("garen_e",
    async (ctx) => {
        const k = power(ctx)
        const rows = rowsOf(ctx)
        const to = mainOf(ctx)
        const me = ctx.from
        const lanes = withNeighbours(rows.foe,
            to,
            rows.spacing)
        ring(ctx.layer,
            me,
            [GOLD,
                SKY],
            130,
            150,
            1.0,
            0.7)
        flash(ctx.layer,
            me,
            [PALE],
            120,
            150,
            1.0,
            0.3)
        await slashArc(ctx.layer,
            me,
            80,
            0,
            Math.PI * 2,
            0.3,
            LIGHT,
            24,
            {
                keep: 0.25
            })
        await Promise.all([
            slashArc(ctx.layer,
                me,
                80,
                0,
                Math.PI * 4,
                0.6,
                LIGHT,
                24,
                {
                    keep: 0.25
                }),
            ...lanes.map((p) => slashArc(ctx.layer,
                p,
                70 * k,
                rand(0,
                    6),
                rand(0,
                    6) + Math.PI * 4,
                0.6,
                [PALE,
                    GOLD,
                    AMBER],
                24,
                {
                    keep: 0.22
                })),
            over(ctx.layer,
                0.6,
                () => {
                    for (const p of lanes) if (Math.random() < 0.3) shards(ctx.layer,
                        p,
                        2,
                        [STEEL,
                            GOLD],
                        {
                            speed: [150,
                                320]
                        })
                }),
        ])
        for (const p of lanes) {
            flash(ctx.layer,
                p,
                [WHITE,
                    GOLD],
                30,
                120 * k,
                0.25)
            motes(ctx.layer,
                p,
                12,
                LIGHT)
        }
        await wait(ctx.layer,
            0.3)
    })

/** R Công Lý Demacia: cột sáng mở trên mục tiêu (đường bất kỳ), thanh kiếm trời khổng lồ cắm thẳng xuống, nổ vàng trắng, kiếm tan thành bụi sáng */
registerSkillVfx("garen_r",
    async (ctx) => {
        const k = power(ctx)
        const to = mainOf(ctx)
        flash(ctx.layer,
            shift(ctx.from,
                0,
                60),
            [GOLD,
                PALE],
            30,
            120,
            0.4,
            0.8)
        column(ctx.layer,
            shift(to,
                0,
                -30),
            400,
            90 * k,
            [PALE,
                GOLD,
                WHITE],
            0.9,
            0.45)
        ring(ctx.layer,
            to,
            [GOLD],
            200 * k,
            160 * k,
            0.5,
            0.8)
        await wait(ctx.layer,
            0.3)
        await fly(ctx.layer,
            straight(shift(to,
                0,
                520),
            shift(to,
                0,
                -20)),
            0.24,
            (p) => {
                greatsword(ctx.layer,
                    p,
                    180 * k)
                emit(ctx.layer,
                    shift(p,
                        0,
                        200 * k),
                    {
                        color: [GOLD,
                            PALE], kind: "blade", life: [0.2,
                            0.3], size: [80,
                            40], alpha: 0.7, rotation: UP, stretch: 2.4
                    })
            },
            ease.in)
        smite(ctx.layer,
            to,
            1.8 * k)
        ring(ctx.layer,
            to,
            [WHITE,
                GOLD],
            40,
            360 * k,
            0.5,
            0.9)
        // kiếm cắm lại rồi tan thành bụi sáng
        await over(ctx.layer,
            0.35,
            (t) => greatsword(ctx.layer,
                shift(to,
                    0,
                    -20),
                180 * k,
                0.05,
                1 - t * 0.7))
        await rise(ctx.layer,
            shift(to,
                0,
                80),
            90,
            0.4,
            160,
            [GOLD,
                PALE,
                WHITE],
            {
                spread: 60
            })
    })
