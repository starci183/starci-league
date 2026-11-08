// VFX Annie trên Cocos, theo thiết kế bản web (fx_annie.ts): lửa vàng nóng lõi trắng xoáy tròn, tàn lửa vàng, khói nâu nhẹ. Khác
// Brand: lửa tròn, sáng, ít khói. Q cầu lửa xoáy đuôi sao chổi, E lửa cuộn quanh người (Khiên) + lửa phản đòn, R Tibbers rơi xuống
// hàng địch rồi đứng ở ô phụ cạnh Annie. Ô: basic_annie, annie_p/q/e/r.
import {
    Node
} from "cc"
import {
    mix, rand, wait, type Pt
} from "./particles"
import {
    emit
} from "./g2_helpers"
import {
    registerSkillVfx
} from "./registry"
import {
    TAU, UP, add, curve, fireBlast, flames, fly, gather, glow, laneGap, main, motes, polar, pow, pulse, ring, row, settle, smoke, sparks,
    stunStars
} from "./g2_helpers"

const CORE = 0xfff4d0
const YELLOW = 0xffc060
const ORANGE = 0xff8a30
const RED = 0xff4a20
const FIRE = [0xfff0b0, YELLOW, ORANGE, RED]
const SMOKE = [0x5a3a28, 0x6a4a34]
const FUR = [0x5a3420, 0x6a4028, 0x3a2216]

/** Lửa xoáy quanh tâm thành từng nhánh (không khép kín) */
function swirl(layer: Node, at: Pt, r: number, secs: number, perSec: number, cols = FIRE) {
    return pulse(layer,
        secs,
        perSec,
        (t) => {
            const arm = Math.floor(rand(0,
                3))
            const a = t * TAU * 2 + arm * TAU / 3 + rand(0,
                0.6)
            const p = polar(at,
                a,
                r * rand(0.8,
                    1.1))
            emit(layer,
                p,
                {
                    color: cols, kind: "glow", life: [0.2,
                        0.35], size: [26,
                        6], alpha: 0.9, speed: [60,
                        120], angle: [a + UP,
                        a + UP], gravity: 60
                })
        })
}

/** Cầu lửa xoáy: lõi trắng vàng, hai sợi lửa cuộn quanh, đuôi tàn lửa */
function fireball(layer: Node, p: Pt, spin: number, size: number) {
    glow(layer,
        p,
        [CORE],
        size,
        size * 0.6,
        0.06)
    glow(layer,
        p,
        [YELLOW, ORANGE],
        size * 1.6,
        size * 0.5,
        0.14,
        0.7)
    for (const off of [0,
        Math.PI]) emit(layer,
        polar(p,
            spin + off,
            size * 0.45),
        {
            color: [YELLOW, ORANGE], kind: "glow", life: [0.16,
                0.26], size: [size * 0.5,
                4], alpha: 1
        })
    emit(layer,
        p,
        {
            color: [YELLOW, CORE, ORANGE], kind: "dot", life: [0.3,
                0.6], size: [7,
                1], alpha: 1, speed: [20,
                80], gravity: 120
        })
}

/** Đánh thường: tia lửa nhỏ bay cong */
registerSkillVfx("basic_annie",
    async (ctx) => {
        const to = main(ctx)
        let spin = 0
        await fly(ctx.layer,
            0.3,
            (u) => curve(ctx.from,
                to,
                30,
                u),
            (p) => { spin += 0.6; fireball(ctx.layer,
                p,
                spin,
                18) })
        glow(ctx.layer,
            to,
            [YELLOW],
            30,
            110,
            0.25)
        flames(ctx.layer,
            to,
            8,
            FIRE,
            22,
            14)
        motes(ctx.layer,
            to,
            8,
            [YELLOW, ORANGE],
            [60,
                200])
        await settle(ctx.layer,
            0.4)
    })

/** Nội tại Hoả Thuật: bốn ngọn Lửa lần lượt bùng lên quanh Annie và quay; đủ 4 thì nóng trắng, quay nhanh (chiêu kế gây Choáng) */
registerSkillVfx("annie_p",
    async (ctx) => {
        const at = ctx.from
        let lit = 0
        await pulse(ctx.layer,
            0.7,
            60,
            (t) => {
                const n = Math.min(4,
                    1 + Math.floor(t * 4.4))
                if (n > lit) {
                    lit = n
                    const a = t * TAU * 2 + (n - 1) * TAU / 4
                    glow(ctx.layer,
                        polar(at,
                            a,
                            66),
                        [CORE],
                        20,
                        60,
                        0.2)
                }
                const hot = lit >= 4 && t > 0.85
                for (let i = 0; i < lit; i++) {
                    const a = t * TAU * (hot ? 3 : 2) + i * TAU / 4
                    emit(ctx.layer,
                        polar(at,
                            a,
                            66),
                        {
                            color: hot ? [0xffffff, CORE] : [YELLOW, ORANGE], kind: "glow", life: [0.12,
                                0.2], size: [24,
                                8], alpha: 1, gravity: 80
                        })
                }
            })
        glow(ctx.layer,
            at,
            [0xffffff],
            40,
            160,
            0.25)
        ring(ctx.layer,
            at,
            [YELLOW],
            60,
            180,
            0.35)
        await settle(ctx.layer,
            0.35)
    })

/**
 * Q Phi Tiêu Lửa: ngọn lửa bùng trên tay, cầu lửa xoáy (lõi trắng vàng, hai sợi lửa cuộn, đuôi sao chổi) bay tới một địch, vỡ
 * thành lửa vàng xoáy. Đủ 4 Lửa thì chiêu này gây Choáng: thêm vòng sao trên đầu (hiện như bản đủ Lửa khi cường độ cao).
 */
registerSkillVfx("annie_q",
    async (ctx) => {
        const k = pow(ctx)
        const to = main(ctx)
        flames(ctx.layer,
            ctx.from,
            10,
            FIRE,
            26,
            16)
        await gather(ctx.layer,
            add(ctx.from,
                0,
                20),
            60,
            0.16,
            120,
            {
                color: [YELLOW, ORANGE]
            })
        let spin = 0
        await fly(ctx.layer,
            0.34,
            (u) => curve(ctx.from,
                to,
                -40,
                u),
            (p) => {
                spin += 0.5
                fireball(ctx.layer,
                    p,
                    spin,
                    32 * k)
            })
        fireBlast(ctx.layer,
            to,
            0.9 * k,
            [CORE, YELLOW, ORANGE],
            SMOKE)
        void swirl(ctx.layer,
            to,
            50,
            0.35,
            120)
        if (k > 1) void stunStars(ctx.layer,
            to,
            [YELLOW, CORE],
            0.7)
        await settle(ctx.layer,
            0.6)
    })

/**
 * E Lá Chắn Cháy (Quick, kẻ nhắm Annie là mục tiêu): lửa cam vàng cuộn kín quanh Annie thành Khiên, rồi một luồng lửa quất ngược
 * vào kẻ đó (sát thương phép); lửa còn cuộn quanh Annie rồi tắt dần.
 */
registerSkillVfx("annie_e",
    async (ctx) => {
        const k = pow(ctx)
        const at = ctx.from
        const to = ctx.to[0]
        ring(ctx.layer,
            at,
            [ORANGE],
            40,
            170,
            0.3)
        await swirl(ctx.layer,
            at,
            72,
            0.35,
            220,
            [YELLOW, ORANGE, RED])
        glow(ctx.layer,
            at,
            [ORANGE],
            160,
            150,
            0.6,
            0.4)
        void swirl(ctx.layer,
            at,
            72,
            0.7,
            90,
            [YELLOW, ORANGE])
        if (to) {
            // lửa quất ngược vào kẻ nhắm
            await fly(ctx.layer,
                0.22,
                (u) => mix(at,
                    to,
                    u),
                (p, dd) => {
                    emit(ctx.layer,
                        p,
                        {
                            color: [CORE, YELLOW], kind: "blade", life: [0.15,
                                0.22], size: [40,
                                14], alpha: 1, rotation: dd, stretch: 2.6
                        })
                    flames(ctx.layer,
                        p,
                        2,
                        FIRE,
                        26,
                        8)
                })
            fireBlast(ctx.layer,
                to,
                0.7 * k,
                [CORE, YELLOW, ORANGE],
                SMOKE)
        }
        await settle(ctx.layer,
            0.6)
    })

/** Tibbers dựng bằng hạt: thân lông nâu cháy xém, hai tai, mắt đỏ, lửa bốc khắp lưng; sống `life` giây */
function tibbers(layer: Node, at: Pt, s: number, life: number) {
    for (let i = 0; i < 26; i++) emit(layer,
        add(at,
            rand(-28,
                28) * s,
            rand(-36,
                30) * s),
        {
            color: FUR, kind: "dot", additive: false, life: [life,
                life * 1.1], size: [26 * s,
                22 * s], alpha: 1
        })
    for (let i = 0; i < 12; i++) emit(layer,
        add(at,
            rand(-16,
                16) * s,
            rand(34,
                58) * s),
        {
            color: FUR, kind: "dot", additive: false, life: [life,
                life * 1.1], size: [22 * s,
                20 * s], alpha: 1
        })
    for (const dx of [-18,
        18]) {
        emit(layer,
            add(at,
                dx * s,
                66 * s),
            {
                color: FUR, kind: "dot", additive: false, life: [life,
                    life * 1.1], size: [16 * s,
                    14 * s], alpha: 1
            })
        emit(layer,
            add(at,
                dx * 0.45 * s,
                48 * s),
            {
                color: [0xff3020], kind: "glow", life: [life,
                    life], size: [14 * s,
                    10 * s], alpha: 1
            })
    }
}

/**
 * R Tibbers: mọi tướng địch nhận sát thương phép. Annie giơ tay, Tibbers rơi từ trời xuống giữa hàng địch thành cầu lửa khổng
 * lồ, sóng lửa lan ra phủ cả hàng; rồi Tibbers hiện ở ô phụ cạnh Annie, lửa bốc quanh thân.
 */
registerSkillVfx("annie_r",
    async (ctx) => {
        const k = pow(ctx)
        const to = main(ctx)
        const foes = row(ctx,
            5)
        // gọi: lửa vọt từ tay lên trời
        await pulse(ctx.layer,
            0.25,
            110,
            () => emit(ctx.layer,
                add(ctx.from,
                    rand(-12,
                        12),
                    30),
                {
                    color: FIRE, kind: "glow", life: [0.25,
                        0.35], size: [30,
                        8], alpha: 1, speed: [700,
                        1000], angle: [UP - 0.05,
                        UP + 0.05]
                }))
        // Tibbers rơi thành cầu lửa
        const sky = add(to,
            -80,
            560)
        await fly(ctx.layer,
            0.34,
            (u) => mix(sky,
                to,
                u),
            (p) => {
                glow(ctx.layer,
                    p,
                    [CORE, YELLOW],
                    54,
                    30,
                    0.08)
                flames(ctx.layer,
                    p,
                    2,
                    FIRE,
                    30,
                    14)
                smoke(ctx.layer,
                    p,
                    1,
                    SMOKE,
                    10,
                    50)
            },
            (t) => t * t)
        fireBlast(ctx.layer,
            to,
            1.0 * k,
            [CORE, YELLOW, ORANGE, RED],
            SMOKE)
        ring(ctx.layer,
            to,
            [ORANGE, YELLOW],
            40,
            340,
            0.45,
            0.6)
        // sóng lửa lan tới mọi tướng địch
        await Promise.all(foes.slice(1).map(async (p) => {
            await wait(ctx.layer,
                Math.abs(p.x - to.x) / 1600)
            fireBlast(ctx.layer,
                p,
                0.75,
                [CORE, YELLOW, ORANGE],
                SMOKE)
            flames(ctx.layer,
                p,
                8,
                FIRE,
                30,
                30)
        }))
        // Tibbers đứng ở ô phụ cạnh Annie
        const slot = add(ctx.from,
            laneGap(ctx) * 0.62,
            -10)
        glow(ctx.layer,
            slot,
            [ORANGE],
            40,
            110,
            0.35)
        ring(ctx.layer,
            slot,
            [YELLOW],
            30,
            120,
            0.35)
        tibbers(ctx.layer,
            slot,
            0.6,
            0.8)
        await pulse(ctx.layer,
            0.5,
            40,
            () => emit(ctx.layer,
                add(slot,
                    rand(-30,
                        30),
                    rand(-10,
                        50)),
                {
                    color: FIRE, kind: "glow", life: [0.3,
                        0.5], size: [24,
                        4], alpha: 0.9, speed: [40,
                        120], angle: [UP - 0.3,
                        UP + 0.3], gravity: 100
                }))
        sparks(ctx.layer,
            slot,
            8,
            [YELLOW, CORE],
            [120,
                300])
        await settle(ctx.layer,
            0.3)
    })
