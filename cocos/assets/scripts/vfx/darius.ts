// VFX Darius trên Cocos, theo thiết kế web (packages/client/src/card/vfx/fx_darius.ts): THÉP NOXUS VÀ MÁU. Đòn luôn chém tại
// mục tiêu (không có rìu bay), máu là giọt đặc có trọng lực, sương đỏ thẫm. Chảy Máu hiện thành giọt máu treo trên đầu nạn nhân.
// Ô đăng ký: basic_darius, darius_p (Xuất Huyết), darius_q (Tàn Sát), darius_e (Bắt Giữ), darius_r (Máy Chém Noxus).
import {
    Node
} from "cc"
import {
    angleOf, ease, type Pt
} from "./particles"
import {
    registerSkillVfx
} from "./registry"
import {
    bent, drops, flash, fly, mainOf, motes, power, ring, rise, shards, shift, slashArc, slashLine, smoke, straight, UP,
    DOWN, vortex, emit, over, wait, meleeSlash
} from "./g1_helpers"

const WHITE = 0xffffff
const STEEL = 0xd8dde3
const SCARLET = 0xff2a36
const CRIMSON = 0xd80f26
const BLOOD = 0xa30016
const GORE = 0x6c0410
const CLOT = 0x2c0208
const HEAL = 0x7dff9a

/** Lấy đà: máu rút về Darius, lưỡi rìu loé trắng */
async function windup(layer: Node, at: Pt, secs: number, k = 1) {
    flash(layer,
        shift(at,
            30,
            40),
        [STEEL,
            WHITE],
        20,
        70 * k,
        secs,
        0.9)
    await vortex(layer,
        at,
        80 * k,
        secs,
        90,
        [SCARLET,
            CRIMSON,
            BLOOD])
}

/** `n` giọt Chảy Máu treo trên đầu nạn nhân, hiện lần lượt */
async function bleedMarks(layer: Node, at: Pt, n: number, hold = 0.8) {
    const top = shift(at,
        0,
        70)
    for (let i = 0; i < n; i++) {
        const p = shift(top,
            (i - (n - 1) / 2) * 18,
            0)
        emit(layer,
            p,
            {
                color: [CRIMSON], kind: "dot", additive: false, life: [hold,
                    hold], size: [15,
                    13], alpha: 1
            })
        emit(layer,
            p,
            {
                color: [SCARLET], kind: "glow", life: [hold,
                    hold], size: [30,
                    22], alpha: 0.6
            })
        // giọt rỉ rơi khỏi dấu
        drops(layer,
            p,
            2,
            [BLOOD,
                GORE],
            {
                speed: [10,
                    40], angle: [DOWN - 0.3,
                    DOWN + 0.3], size: [6,
                    3]
            })
        await wait(layer,
            0.07)
    }
}

/** Máu toé tại điểm chém, bắn theo hướng lưỡi đi */
function bloodSpray(layer: Node, at: Pt, dir: number, k: number) {
    flash(layer,
        at,
        [WHITE,
            STEEL],
        30 * k,
        110 * k,
        0.18)
    flash(layer,
        at,
        [CRIMSON],
        60 * k,
        170 * k,
        0.4,
        0.5,
        false)
    drops(layer,
        at,
        Math.round(22 * k),
        [CRIMSON,
            BLOOD,
            GORE],
        {
            angle: [dir - 0.9,
                dir + 0.9], speed: [160,
                460]
        })
    shards(layer,
        at,
        Math.round(8 * k),
        [STEEL,
            WHITE,
            SCARLET],
        {
            angle: [dir - 0.6,
                dir + 0.6]
        })
    smoke(layer,
        at,
        Math.round(5 * k),
        [BLOOD,
            CLOT],
        60 * k)
}

/** Đánh thường (cận chiến, không đạn bay). Chém: vết liềm rìu mảnh ngay trên mục tiêu, tia máu, cắm 1 Chảy Máu */
registerSkillVfx("basic_darius",
    async (ctx) => {
        const to = mainOf(ctx)
        const cut = meleeSlash(ctx.layer, to, [STEEL, WHITE, SCARLET], [CRIMSON, SCARLET, STEEL], 1, 1.1)
        drops(ctx.layer, to, 6, [CRIMSON, BLOOD], { speed: [80, 200], size: [6, 3] })
        await Promise.all([cut, bleedMarks(ctx.layer, to, 1, 0.4)])
    })

/** P Xuất Huyết: sương máu cuộn quanh nạn nhân, các giọt Chảy Máu dồn lên đầu, rồi một nhịp rỉ máu (sát thương đầu lượt) */
registerSkillVfx("darius_p",
    async (ctx) => {
        const to = mainOf(ctx)
        await over(ctx.layer,
            0.45,
            (t) => {
                const a = t * Math.PI * 3
                for (let i = 0; i < 2; i++) emit(ctx.layer,
                    {
                        x: to.x + Math.cos(a + i * Math.PI) * 60, y: to.y + Math.sin(a + i * Math.PI) * 30
                    },
                    {
                        color: [CRIMSON,
                            BLOOD], kind: "glow", additive: false, life: [0.3,
                            0.45], size: [34,
                            12], alpha: 0.6
                    })
            })
        await bleedMarks(ctx.layer,
            to,
            5,
            0.7)
        // nhịp rỉ: mọi giọt vỡ cùng lúc, máu chảy từ thân xuống
        ring(ctx.layer,
            to,
            [CRIMSON],
            20,
            150,
            0.35,
            0.7)
        flash(ctx.layer,
            to,
            [SCARLET],
            40,
            130,
            0.3,
            0.7)
        drops(ctx.layer,
            shift(to,
                0,
                40),
            26,
            [CRIMSON,
                BLOOD,
                GORE],
            {
                speed: [60,
                    220]
            })
        await wait(ctx.layer,
            0.5)
    })

/** Q Tàn Sát: lấy đà lâu, rìu quét trọn một vòng quanh mục tiêu (vệt đỏ trong, mép thép sáng), máu toé, rồi máu chảy về Darius hồi Máu */
registerSkillVfx("darius_q",
    async (ctx) => {
        const k = power(ctx)
        const to = mainOf(ctx)
        await windup(ctx.layer,
            ctx.from,
            0.35,
            k)
        const a0 = angleOf(to,
            ctx.from) + 0.4
        // vệt đỏ mờ phía trong + mép thép sáng phía ngoài, cùng quét một vòng
        await Promise.all([
            slashArc(ctx.layer,
                to,
                78 * k,
                a0,
                a0 - Math.PI * 2,
                0.38,
                [CRIMSON,
                    BLOOD],
                34 * k,
                {
                    additive: false, keep: 0.45, head: [SCARLET]
                }),
            slashArc(ctx.layer,
                to,
                102 * k,
                a0,
                a0 - Math.PI * 2,
                0.38,
                [STEEL,
                    WHITE,
                    SCARLET],
                26 * k,
                {
                    keep: 0.3
                }),
        ])
        bloodSpray(ctx.layer,
            to,
            UP,
            1.2 * k)
        ring(ctx.layer,
            to,
            [SCARLET],
            40,
            260 * k,
            0.32,
            0.8)
        void bleedMarks(ctx.layer,
            to,
            2,
            0.6)
        await wait(ctx.layer,
            0.15)
        // hồi Máu: dòng máu cong chảy từ nạn nhân về Darius
        await fly(ctx.layer,
            bent(to,
                ctx.from,
                70),
            0.42,
            (p) => {
                emit(ctx.layer,
                    p,
                    {
                        color: [CRIMSON,
                            SCARLET], kind: "glow", life: [0.2,
                            0.3], size: [26,
                            8], alpha: 0.85
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: [BLOOD], kind: "dot", additive: false, life: [0.3,
                            0.5], size: [8,
                            3], alpha: 1, speed: [10,
                            50]
                    })
            },
            ease.inOut)
        flash(ctx.layer,
            ctx.from,
            [HEAL,
                SCARLET],
            40,
            150,
            0.4,
            0.6)
        await rise(ctx.layer,
            ctx.from,
            90,
            0.35,
            70,
            [HEAL,
                0xd0ffd8,
                SCARLET])
        await wait(ctx.layer,
            0.25)
    })

/** E Bắt Giữ: móc rìu phóng tới tướng đường khác, móc trúng và giật (cú đổi chỗ do swapUnits diễn chung) */
registerSkillVfx("darius_e",
    async (ctx) => {
        const k = power(ctx)
        const to = mainOf(ctx)
        await windup(ctx.layer,
            ctx.from,
            0.18,
            0.7)
        // móc rìu bay, cán xích thép kéo theo
        await fly(ctx.layer,
            straight(ctx.from,
                to),
            0.26,
            (p, _t, dir) => {
                emit(ctx.layer,
                    p,
                    {
                        color: [STEEL,
                            WHITE], kind: "blade", life: [0.06,
                            0.08], size: [34,
                            30], alpha: 1, rotation: dir, stretch: 1.4
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: [SCARLET], kind: "blade", life: [0.06,
                            0.08], size: [26,
                            22], alpha: 1, rotation: dir + 2.2, stretch: 1.2
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: [0x8a9099,
                            STEEL], kind: "dot", additive: false, life: [0.3,
                            0.4], size: [7,
                            5], alpha: 1
                    })
            },
            ease.out)
        bloodSpray(ctx.layer,
            to,
            angleOf(ctx.from,
                to),
            0.7)
        // giật: móc siết lại tại mục tiêu; việc đổi chỗ do swapUnits (vfx/swap.ts) diễn chung, không vẽ ở đây
        const hit = to
        flash(ctx.layer, to, [SCARLET, STEEL], 30, 120, 0.25, 0.8)
        bloodSpray(ctx.layer,
            hit,
            DOWN,
            1.1 * k)
        await slashLine(ctx.layer,
            hit,
            0.5,
            140,
            0.12,
            [STEEL,
                WHITE,
                SCARLET],
            20)
        await bleedMarks(ctx.layer,
            hit,
            2,
            0.6)
        await wait(ctx.layer,
            0.3)
    })

/** R Máy Chém Noxus: máu bốc ngược lên trời, lưỡi rìu khổng lồ rơi thẳng xuống, xé hết Chảy Máu */
registerSkillVfx("darius_r",
    async (ctx) => {
        const k = power(ctx)
        const to = mainOf(ctx)
        // (1) lấy đà: máu bốc lên quanh Darius
        flash(ctx.layer,
            ctx.from,
            [CRIMSON],
            60,
            180,
            0.5,
            0.6)
        await rise(ctx.layer,
            ctx.from,
            110,
            0.35,
            140,
            [SCARLET,
                CRIMSON,
                BLOOD],
            {
                speed: [160,
                    320], size: [10,
                    3]
            })
        // (2) đổi chỗ sang đối diện nạn nhân do swapUnits (vfx/swap.ts) diễn chung; ở đây chỉ nhấc rìu
        flash(ctx.layer, shift(ctx.from, 0, 60), [STEEL, WHITE], 20, 90, 0.25, 0.9)
        // (3) lưỡi rìu rơi từ trời: mảnh thép to dựng đứng, đuôi đỏ
        const top = shift(to,
            0,
            340)
        flash(ctx.layer,
            top,
            [STEEL],
            30,
            120,
            0.25,
            0.8)
        await wait(ctx.layer,
            0.12)
        await fly(ctx.layer,
            straight(top,
                shift(to,
                    0,
                    10)),
            0.22,
            (p) => {
                for (let i = -1; i <= 1; i++) emit(ctx.layer,
                    shift(p,
                        i * 22 * k,
                        -Math.abs(i) * 14),
                    {
                        color: i === 0 ? [WHITE] : [STEEL,
                            0xa9b0ba], kind: "blade", life: [0.07,
                            0.1], size: [70 * k,
                            60 * k], alpha: 1, rotation: UP, stretch: 1.5
                    })
                emit(ctx.layer,
                    shift(p,
                        0,
                        50),
                    {
                        color: [CRIMSON,
                            SCARLET], kind: "blade", life: [0.2,
                            0.3], size: [50,
                            20], alpha: 0.9, rotation: UP, stretch: 2.6
                    })
            },
            ease.in)
        // (4) chạm: tia trắng xẻ dọc, máu phun cột, mọi dấu bị xé
        for (let i = 0; i < 5; i++) emit(ctx.layer,
            shift(to,
                0,
                -80 + i * 34),
            {
                color: [WHITE], kind: "blade", life: [0.2,
                    0.26], size: [44,
                    30], alpha: 1, rotation: UP, stretch: 3
            })
        bloodSpray(ctx.layer,
            to,
            UP,
            1.8 * k)
        ring(ctx.layer,
            to,
            [SCARLET,
                CRIMSON],
            40,
            320 * k,
            0.4,
            0.9)
        drops(ctx.layer,
            to,
            Math.round(30 * k),
            [CRIMSON,
                BLOOD,
                GORE,
                CLOT],
            {
                angle: [UP - 0.5,
                    UP + 0.5], speed: [300,
                    700]
            })
        motes(ctx.layer,
            to,
            30,
            [SCARLET,
                WHITE],
            {
                speed: [200,
                    600]
            })
        // (5) sương đen đỏ tràn ra hai bên
        smoke(ctx.layer,
            to,
            12,
            [CLOT,
                GORE,
                BLOOD],
            90 * k,
            {
                speed: [40,
                    160], angle: [-0.3,
                    0.3], life: [0.6,
                    1]
            })
        smoke(ctx.layer,
            to,
            12,
            [CLOT,
                GORE,
                BLOOD],
            90 * k,
            {
                speed: [40,
                    160], angle: [Math.PI - 0.3,
                    Math.PI + 0.3], life: [0.6,
                    1]
            })
        await wait(ctx.layer,
            0.7)
    })
