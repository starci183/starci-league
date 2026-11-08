// VFX Blitzcrank trên Cocos, theo thiết kế web (packages/client/src/card/vfx/fx_blitzcrank.ts): ROBOT HƠI NƯỚC. Nắm đấm đồng
// thau tên lửa kéo xích thép, hơi nước trắng đục, tia lửa hàn, sét lam của Trường Điện Từ. Lá bị cướp là lá bài bay về Blitzcrank.
// Ô đăng ký: basic_blitzcrank, blitzcrank_p (Thu Gom), blitzcrank_q (Bàn Tay Hoả Tiễn), blitzcrank_e (Tay Giật), blitzcrank_r (Trường Điện Từ).
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
    allFoes, bent, bolt, cardShape, flash, fly, mainOf, motes, polar, power, ring, rowsOf, shards, shift, smoke, straight,
    strand, stunStars, UP, emit, over, wait, meleeSmash
} from "./g1_helpers"

const BRASS = 0xe8a93a
const GOLD = 0xffd36a
const FIRE = 0xff8a2a
const STEAM = 0xf2f6fa
const STEAM_DIM = 0xa9b9c8
const ARC = 0x56cfff
const ARC_DEEP = 0x2a8cff
const ARC_CORE = 0xeafcff
const SOOT = 0x34373f
const CHAIN = 0x7d8794
const SPELL = 0xb36bff

/** Nắm đấm đồng thau nhìn ngang theo hướng `dir`: bốn đốt ngón, cổ tay thép, lõi sáng. Vẽ lại mỗi khung */
function fist(layer: Node, at: Pt, dir: number, size: number, life = 0.05) {
    const side = dir + UP
    for (let i = -1.5; i <= 1.5; i += 1) {
        emit(layer,
            polar(polar(at,
                side,
                i * size * 0.22),
            dir,
            size * 0.18),
            {
                color: [BRASS,
                    GOLD], kind: "blade", additive: false, life: [life,
                    life], size: [size * 0.6,
                    size * 0.6], alpha: 1, rotation: dir, stretch: 1.1
            })
    }
    emit(layer,
        polar(at,
            dir,
            -size * 0.3),
        {
            color: [0x8a6a2a], kind: "blade", additive: false, life: [life,
                life], size: [size * 0.9,
                size * 0.9], alpha: 1, rotation: side, stretch: 1.2
        })
    emit(layer,
        at,
        {
            color: [GOLD], kind: "glow", life: [life * 1.5,
                life * 2], size: [size * 1.4,
                size], alpha: 0.5
        })
}

/** Hơi nước đặc, trắng đục, phủ được nền */
function steam(layer: Node, at: Pt, n: number, dir = UP, k = 1) {
    smoke(layer,
        at,
        n,
        [STEAM,
            STEAM_DIM],
        44 * k,
        {
            speed: [60,
                180], angle: [dir - 0.5,
                dir + 0.5], alpha: 0.6, life: [0.4,
                0.7]
        })
}

/** Va chạm kim loại: tia lửa đồng thau có trọng lực, sét bật quanh điểm chạm, hơi nước */
function clank(layer: Node, at: Pt, k: number) {
    flash(layer,
        at,
        [ARC_CORE,
            GOLD],
        30 * k,
        120 * k,
        0.18)
    ring(layer,
        at,
        [GOLD],
        20,
        150 * k,
        0.3,
        0.7)
    shards(layer,
        at,
        Math.round(14 * k),
        [BRASS,
            GOLD,
            FIRE],
        {
            gravity: -800, speed: [200,
                520], size: [16,
                4]
        })
    for (let i = 0; i < 2; i++) bolt(layer,
        at,
        polar(at,
            rand(0,
                Math.PI * 2),
            rand(50,
                90) * k),
        [ARC,
            ARC_DEEP],
        {
            size: 6, jag: 10
        })
    steam(layer,
        at,
        Math.round(4 * k),
        UP,
        k)
}

/** Đánh thường (cận chiến, không đạn bay). Nện: nắm đấm đồng thau giáng xuống mục tiêu, vòng sóng nhỏ, bụi và tia lửa */
registerSkillVfx("basic_blitzcrank",
    async (ctx) => {
        await meleeSmash(ctx.layer, mainOf(ctx), [GOLD, BRASS, STEAM], GOLD, [STEAM_DIM, BRASS, SOOT])
    })

/** P Thu Gom: phụ tùng (bánh răng, tấm giáp đinh tán) từ phía địch bay về, khoá vào thân Blitzcrank thành Giáp và Kháng */
registerSkillVfx("blitzcrank_p",
    async (ctx) => {
        const src = mainOf(ctx)
        const me = ctx.from
        cardShape(ctx.layer,
            src,
            0.3,
            44,
            [0x2c3550],
            0.35,
            1,
            [GOLD])
        flash(ctx.layer,
            src,
            [GOLD],
            30,
            90,
            0.3,
            0.6)
        await wait(ctx.layer,
            0.15)
        await Promise.all([-90,
            -30,
            30,
            90].map((h, i) => fly(ctx.layer,
            bent(src,
                me,
                h),
            0.45 + i * 0.05,
            (p, t) => {
                if (i % 2) emit(ctx.layer,
                    p,
                    {
                        color: [BRASS], kind: "ring", additive: false, life: [0.05,
                            0.06], size: [24,
                            24], alpha: 1
                    })
                else emit(ctx.layer,
                    p,
                    {
                        color: [CHAIN,
                            0xb8c0c8], kind: "blade", additive: false, life: [0.05,
                            0.06], size: [28,
                            28], alpha: 1, rotation: t * 10, stretch: 1
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: [GOLD,
                            FIRE], kind: "dot", life: [0.15,
                            0.3], size: [5,
                            1], alpha: 1, speed: [10,
                            60]
                    })
            },
            ease.inOut)))
        // khoá giáp: tia hàn quanh thân, vòng đồng
        for (let i = 0; i < 4; i++) shards(ctx.layer,
            polar(me,
                (i * Math.PI) / 2 + 0.6,
                40),
            4,
            [GOLD,
                FIRE],
            {
                gravity: -700, size: [12,
                    3]
            })
        ring(ctx.layer,
            me,
            [BRASS,
                GOLD],
            110,
            130,
            0.5,
            0.8)
        flash(ctx.layer,
            me,
            [ARC],
            60,
            140,
            0.4,
            0.35)
        await wait(ctx.layer,
            0.35)
    })

/** Q Bàn Tay Hoả Tiễn: van vai xì hơi, nắm đấm phóng lửa kéo xích thép tới mục tiêu, chụp, cướp 1 lá rồi giật xích về */
registerSkillVfx("blitzcrank_q",
    async (ctx) => {
        const k = power(ctx)
        const to = mainOf(ctx)
        const dir = angleOf(ctx.from,
            to)
        const hand = polar(ctx.from,
            dir,
            40)
        steam(ctx.layer,
            shift(ctx.from,
                -40,
                30),
            4,
            UP + 0.6)
        steam(ctx.layer,
            shift(ctx.from,
                40,
                30),
            4,
            UP - 0.6)
        flash(ctx.layer,
            shift(ctx.from,
                0,
                30),
            [FIRE],
            20,
            70,
            0.2)
        await wait(ctx.layer,
            0.14)
        const chain = (tip: Pt) => strand(ctx.layer,
            hand,
            tip,
            15,
            {
                color: [CHAIN,
                    0x5a626d], kind: "blade", additive: false, life: [0.05,
                    0.05], size: [16,
                    11], alpha: 1, stretch: 1.3
            },
            4,
            Math.random() * 6)
        // phóng
        await fly(ctx.layer,
            straight(hand,
                to),
            0.3,
            (p) => {
                chain(p)
                fist(ctx.layer,
                    p,
                    dir,
                    40 * k)
                emit(ctx.layer,
                    polar(p,
                        dir,
                        -30),
                    {
                        color: [FIRE,
                            GOLD], kind: "glow", life: [0.12,
                            0.2], size: [34,
                            8], alpha: 0.9, speed: [60,
                            140], angle: [dir + Math.PI - 0.3,
                            dir + Math.PI + 0.3]
                    })
                emit(ctx.layer,
                    polar(p,
                        dir,
                        -30),
                    {
                        color: [STEAM_DIM,
                            SOOT], kind: "glow", additive: false, life: [0.3,
                            0.5], size: [20,
                            40], alpha: 0.4
                    })
            },
            ease.out)
        clank(ctx.layer,
            to,
            1.1 * k)
        // chụp lá rồi giật về
        await wait(ctx.layer,
            0.1)
        await fly(ctx.layer,
            straight(to,
                hand),
            0.34,
            (p) => {
                chain(p)
                fist(ctx.layer,
                    p,
                    dir,
                    40 * k)
                cardShape(ctx.layer,
                    polar(p,
                        dir,
                        26),
                    dir + 0.4,
                    40,
                    [0x2c3550],
                    0.05,
                    1,
                    [GOLD])
            },
            ease.in)
        clank(ctx.layer,
            hand,
            0.6)
        await wait(ctx.layer,
            0.3)
    })

/** E Tay Giật (Quick, chỉ nối Chuỗi): sét vàng bọc nắm đấm, lao tới kẻ đang dùng chiêu, đấm móc ngược, phép bị bóp tắt thành khói, Choáng */
registerSkillVfx("blitzcrank_e",
    async (ctx) => {
        const k = power(ctx)
        const to = mainOf(ctx)
        const dir = angleOf(ctx.from,
            to)
        // luồng phép của kẻ địch đang niệm (bị chặn giữa chừng)
        flash(ctx.layer,
            to,
            [SPELL],
            40,
            120,
            0.5,
            0.6)
        // sạc sét quanh nắm đấm
        const hand = polar(ctx.from,
            dir,
            40)
        await over(ctx.layer,
            0.28,
            () => {
                fist(ctx.layer,
                    hand,
                    dir,
                    36)
                if (Math.random() < 0.6) bolt(ctx.layer,
                    hand,
                    polar(hand,
                        rand(0,
                            Math.PI * 2),
                        rand(30,
                            60)),
                    [GOLD,
                        0xfff2a0],
                    {
                        size: 5, jag: 8, life: 0.1
                    })
            })
        await fly(ctx.layer,
            straight(hand,
                shift(to,
                    0,
                    -30)),
            0.16,
            (p) => {
                fist(ctx.layer,
                    p,
                    dir,
                    40 * k)
                emit(ctx.layer,
                    p,
                    {
                        color: [GOLD,
                            ARC_CORE], kind: "glow", life: [0.15,
                            0.25], size: [40,
                            14], alpha: 0.7
                    })
            })
        // móc ngược lên: vệt dọc vàng trắng
        for (let i = 0; i < 6; i++) emit(ctx.layer,
            shift(to,
                0,
                -30 + i * 26),
            {
                color: [ARC_CORE,
                    GOLD], kind: "blade", life: [0.2,
                    0.28], size: [40,
                    20], alpha: 1, rotation: UP, stretch: 2.6
            })
        clank(ctx.layer,
            to,
            1.2 * k)
        // phép bị bóp tắt: tím co lại thành khói đen, tàn rơi
        void burstSnuff(ctx.layer,
            to)
        // lá bị cướp bay về Blitzcrank
        void fly(ctx.layer,
            bent(to,
                ctx.from,
                80),
            0.45,
            (p, t) => cardShape(ctx.layer,
                p,
                t * 8,
                40,
                [0x2c3550],
                0.05,
                1,
                [GOLD]),
            ease.inOut)
        await stunStars(ctx.layer,
            to,
            0.7)
    })

/** Phép bị dập: hạt tím hút vào tâm rồi thành khói đen và tàn đỏ rơi */
async function burstSnuff(layer: Node, at: Pt) {
    await over(layer,
        0.25,
        () => {
            const a = rand(0,
                Math.PI * 2)
            emit(layer,
                polar(at,
                    a,
                    70),
                {
                    color: [SPELL,
                        0xe0c0ff], kind: "dot", life: [0.22,
                        0.22], size: [8,
                        2], alpha: 1, speed: [300,
                        300], angle: [a + Math.PI,
                        a + Math.PI]
                })
        })
    smoke(layer,
        at,
        8,
        [SOOT,
            0x1a1a22],
        50,
        {
            speed: [30,
                90], angle: [UP - 0.5,
                UP + 0.5], alpha: 0.7
        })
    motes(layer,
        at,
        12,
        [FIRE,
            0xff5a2a],
        {
            gravity: -400, speed: [40,
                160]
        })
}

/** R Trường Điện Từ: điện tụ trong thân, sét bò quanh, hơi xả; rồi một nhịp chớp lam trắng, sét quật lên mọi tướng địch và nối dọc hàng;
 * Câm Lặng (vòng lam trên đầu), lá trên tay đối thủ văng ra */
registerSkillVfx("blitzcrank_r",
    async (ctx) => {
        const k = power(ctx)
        const rows = rowsOf(ctx)
        const foes = allFoes(ctx)
        const me = ctx.from
        // tụ điện
        flash(ctx.layer,
            me,
            [ARC,
                ARC_DEEP],
            40,
            200,
            0.5,
            0.5)
        await over(ctx.layer,
            0.45,
            (t) => {
                if (Math.random() < 0.7) bolt(ctx.layer,
                    polar(me,
                        rand(0,
                            Math.PI * 2),
                        40),
                    polar(me,
                        rand(0,
                            Math.PI * 2),
                        rand(60,
                            90 + 60 * t)),
                    [ARC,
                        ARC_DEEP],
                    {
                        size: 6, jag: 12, life: 0.1
                    })
                if (Math.random() < 0.25) steam(ctx.layer,
                    shift(me,
                        rand(-50,
                            50),
                        30),
                    1)
            })
        // bùng
        flash(ctx.layer,
            me,
            [ARC_CORE],
            80,
            320 * k,
            0.3)
        ring(ctx.layer,
            me,
            [ARC,
                ARC_CORE],
            40,
            520 * k,
            0.45,
            0.9)
        ring(ctx.layer,
            me,
            [ARC_DEEP],
            30,
            380 * k,
            0.5,
            0.6)
        for (const f of foes) bolt(ctx.layer,
            me,
            f,
            [ARC,
                ARC_DEEP],
            {
                size: 9, jag: 28, life: 0.22
            })
        for (let i = 1; i < foes.length; i++) bolt(ctx.layer,
            foes[i - 1],
            foes[i],
            [ARC,
                ARC_DEEP],
            {
                size: 6, jag: 16, life: 0.2
            })
        for (const f of foes) {
            flash(ctx.layer,
                f,
                [ARC_CORE,
                    ARC],
                30,
                130,
                0.25)
            motes(ctx.layer,
                f,
                14,
                [ARC,
                    ARC_CORE],
                {
                    speed: [100,
                        300]
                })
            // Câm Lặng: vòng lam treo trên đầu
            ring(ctx.layer,
                shift(f,
                    0,
                    64),
                [ARC],
                40,
                46,
                0.8,
                0.8)
        }
        await wait(ctx.layer,
            0.15)
        // dư điện nhảy trên từng tướng
        await over(ctx.layer,
            0.4,
            () => {
                const f = foes[Math.floor(rand(0,
                    foes.length))]
                bolt(ctx.layer,
                    shift(f,
                        rand(-40,
                            40),
                        rand(-40,
                            40)),
                    shift(f,
                        rand(-40,
                            40),
                        rand(-40,
                            40)),
                    [ARC],
                    {
                        size: 5, jag: 10, life: 0.1
                    })
            })
        // đối thủ bỏ lá: lá úp văng khỏi tay (sau hàng địch) rồi tan
        const hand = shift(foes[Math.floor(foes.length / 2)],
            0,
            rows.up * 150)
        await Promise.all([-1,
            1].map((s) => fly(ctx.layer,
            straight(hand,
                shift(hand,
                    s * 160,
                    -rows.up * 40)),
            0.4,
            (p, t) => {
                cardShape(ctx.layer,
                    p,
                    t * 6 * s,
                    38,
                    [0x2c3550],
                    0.05,
                    1 - t * 0.6,
                    [ARC])
                if (Math.random() < 0.5) emit(ctx.layer,
                    p,
                    {
                        color: [ARC], kind: "dot", life: [0.2,
                            0.3], size: [6,
                            1], alpha: 1, speed: [20,
                            80]
                    })
            },
            ease.out)))
        await wait(ctx.layer,
            0.2)
    })
