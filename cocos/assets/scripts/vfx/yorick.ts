// VFX Yorick trên Cocos, theo thiết kế web (packages/client/src/card/vfx/fx_yorick.ts): HỒN MA QUẦN ĐẢO BÓNG ĐÊM. Sương đen,
// lửa hồn xanh ngọc, đất mộ, sắt rỉ. Đốt lá là lá rời Bộ bài đối thủ cháy lửa hồn; Ma Sương là thân người dựng hoàn toàn bằng hạt.
// Ô đăng ký: basic_yorick, yorick_p (Người Đào Mộ), yorick_q (Nghi Thức Cuối), yorick_e (Sương Sầu), yorick_r (Khúc Ai Ca).
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
    bent, cardShape, drops, flash, fly, lob, mainOf, motes, polar, power, ring, rise, rowsOf, shards, shift, smoke,
    straight, UP, DOWN, vortex, type Rows, emit, over, wait, meleeSmash
} from "./g1_helpers"

const WHITE = 0xffffff
const PALE = 0xd2fff2
const SOUL = 0x4dffd2
const GHOST = 0x1fd9b6
const DEEP = 0x0f8a8a
const INK = 0x06161d
const SOOT = 0x0d2a30
const IRON = 0x9fc7c4
const RUST = 0x5b4a3c
const DIRT = 0x4a3a2a
const WOOD = 0x6a4a2c
const SOULS = [SOUL,
    GHOST,
    PALE]

/** Bộ bài đối thủ (sau hàng địch) */
const enemyDeck = (rows: Rows): Pt => shift(rows.foe[2],
    rows.spacing * 1.6,
    rows.up * 140)

/** Xẻng lớn: lưỡi sắt đen viền hồn xanh, cán gỗ bọc sắt; `ang` là hướng từ cán tới lưỡi. Vẽ lại mỗi khung */
function shovel(layer: Node, head: Pt, ang: number, size: number, life = 0.05) {
    emit(layer,
        head,
        {
            color: [SOOT,
                INK], kind: "blade", additive: false, life: [life,
                life], size: [size * 0.8,
                size * 0.8], alpha: 1, rotation: ang, stretch: 0.9
        })
    emit(layer,
        head,
        {
            color: [SOUL], kind: "glow", life: [life * 1.5,
                life * 2], size: [size * 1.1,
                size * 0.9], alpha: 0.5
        })
    for (let i = 1; i <= 3; i++) emit(layer,
        polar(head,
            ang,
            -size * 0.42 * i),
        {
            color: i === 1 ? [IRON] : [WOOD], kind: "blade", additive: false, life: [life,
                life], size: [size * 0.5,
                size * 0.22], alpha: 1, rotation: ang, stretch: 2
        })
}

/** Đất mộ tung lên rồi rơi, lửa hồn nổ */
function graveBurst(layer: Node, at: Pt, k: number) {
    flash(layer,
        at,
        [PALE,
            WHITE],
        30 * k,
        120 * k,
        0.2)
    flash(layer,
        at,
        [GHOST,
            DEEP],
        60 * k,
        170 * k,
        0.45,
        0.55)
    ring(layer,
        at,
        [SOUL],
        20,
        170 * k,
        0.35,
        0.8)
    drops(layer,
        at,
        Math.round(18 * k),
        [DIRT,
            RUST,
            0x2e241a],
        {
            size: [10,
                5], speed: [150,
                400]
        })
    motes(layer,
        at,
        Math.round(18 * k),
        SOULS,
        {
            angle: [UP - 0.8,
                UP + 0.8], speed: [80,
                260]
        })
}

/** Đốt lá: lá rời đỉnh Bộ bài đối thủ, cháy lửa hồn rồi tàn */
async function burnCard(layer: Node, deck: Pt) {
    await fly(layer,
        straight(deck,
            shift(deck,
                rand(-40,
                    40),
                70)),
        0.4,
        (p, t) => {
            cardShape(layer,
                p,
                t * 2,
                40,
                [0x1c2a3a],
                0.05,
                1 - t * 0.7,
                [SOUL])
            for (let i = 0; i < 2; i++) emit(layer,
                shift(p,
                    rand(-20,
                        20),
                    rand(-20,
                        10)),
                {
                    color: SOULS, kind: "glow", life: [0.2,
                        0.35], size: [18,
                        6], alpha: 0.9, speed: [40,
                        110], angle: [UP - 0.3,
                        UP + 0.3]
                })
        },
        ease.out)
    motes(layer,
        shift(deck,
            0,
            70),
        10,
        [SOUL,
            0x203038],
        {
            gravity: -200
        })
}

/** Hồn bay từ `a` về `b`, chấm sáng kéo vệt */
function soulFly(layer: Node, a: Pt, b: Pt, bend: number, secs: number): Promise<void> {
    return fly(layer,
        bent(a,
            b,
            bend),
        secs,
        (p) => {
            emit(layer,
                p,
                {
                    color: [PALE,
                        WHITE], kind: "glow", life: [0.08,
                        0.12], size: [22,
                        12], alpha: 1
                })
            emit(layer,
                p,
                {
                    color: [SOUL,
                        GHOST], kind: "glow", life: [0.25,
                        0.4], size: [24,
                        6], alpha: 0.6
                })
        },
        ease.inOut)
}

/** Đánh thường (cận chiến, không đạn bay). Nện: lưỡi xẻng bổ xuống mục tiêu, vòng sóng hồn nhỏ sát đất, đất mộ văng */
registerSkillVfx("basic_yorick",
    async (ctx) => {
        await meleeSmash(ctx.layer, mainOf(ctx), [IRON, SOUL, PALE], SOUL, [DIRT, RUST, SOOT])
    })

/** P Người Đào Mộ: lá trên cùng Bộ bài đối thủ cháy lửa hồn, một hồn bị giật khỏi mục tiêu bay về Yorick, giáp hồn dày thêm */
registerSkillVfx("yorick_p",
    async (ctx) => {
        const rows = rowsOf(ctx)
        const to = mainOf(ctx)
        void burnCard(ctx.layer,
            enemyDeck(rows))
        flash(ctx.layer,
            to,
            [SOUL],
            30,
            100,
            0.3,
            0.7)
        await wait(ctx.layer,
            0.15)
        await soulFly(ctx.layer,
            to,
            ctx.from,
            90,
            0.55)
        ring(ctx.layer,
            ctx.from,
            [SOUL,
                PALE],
            130,
            110,
            0.45,
            0.8)
        await rise(ctx.layer,
            ctx.from,
            100,
            0.35,
            60,
            SOULS,
            {
                kind: "glow", size: [16,
                    4]
            })
    })

/** Q Nghi Thức Cuối: xẻng cháy lửa hồn hiện trên đầu tướng đối diện, vung lên rồi bổ xuống; đất mộ tung, hồn xanh dâng từ đất thấm vào Yorick */
registerSkillVfx("yorick_q",
    async (ctx) => {
        const k = power(ctx)
        const to = mainOf(ctx)
        const high = shift(to,
            -50,
            170)
        // vung lên: ánh hồn tụ quanh lưỡi
        await over(ctx.layer,
            0.32,
            (t) => {
                shovel(ctx.layer,
                    high,
                    UP + 0.6 - t * 0.4,
                    56 * k)
                if (Math.random() < 0.7) {
                    const a = rand(0, Math.PI * 2)
                    emit(ctx.layer, polar(high, a, 50), {
                        color: SOULS, kind: "dot", life: [0.2, 0.2], size: [7, 2], alpha: 1, speed: [220, 250], angle: [a + Math.PI, a + Math.PI]
                    })
                }
            })
        // bổ xuống
        const hit = shift(to,
            0,
            10)
        await fly(ctx.layer,
            straight(high,
                hit),
            0.14,
            (p, t) => {
                shovel(ctx.layer,
                    p,
                    UP + 0.2 - t * 1.8,
                    60 * k)
                emit(ctx.layer,
                    p,
                    {
                        color: [SOUL,
                            GHOST], kind: "blade", life: [0.2,
                            0.3], size: [40,
                            14], alpha: 0.8, rotation: DOWN, stretch: 2.4
                    })
            },
            ease.in)
        graveBurst(ctx.layer,
            to,
            1.2 * k)
        shards(ctx.layer,
            to,
            6,
            [IRON,
                SOUL])
        await wait(ctx.layer,
            0.12)
        // hồi Máu: hồn xanh từ đất thấm vào Yorick
        await Promise.all([soulFly(ctx.layer,
            to,
            ctx.from,
            -70,
            0.45),
        rise(ctx.layer,
            ctx.from,
            90,
            0.5,
            70,
            [SOUL,
                0x9dffd0,
                PALE])])
        flash(ctx.layer,
            ctx.from,
            [SOUL,
                0x9dffd0],
            40,
            130,
            0.4,
            0.6)
        await wait(ctx.layer,
            0.2)
    })

/** E Sương Sầu: đốt lá bộ đối thủ, khối sương đen viền hồn vồng cao rơi xuống mục tiêu, đập toé, mảnh sắt rỉ bung (Rã Giáp), dấu sương xoáy lại */
registerSkillVfx("yorick_e",
    async (ctx) => {
        const k = power(ctx)
        const rows = rowsOf(ctx)
        const to = mainOf(ctx)
        void burnCard(ctx.layer,
            enemyDeck(rows))
        await fly(ctx.layer,
            lob(shift(ctx.from,
                0,
                30),
            to,
            180),
            0.5,
            (p) => {
                for (let i = 0; i < 2; i++) emit(ctx.layer,
                    shift(p,
                        rand(-10,
                            10),
                        rand(-10,
                            10)),
                    {
                        color: [INK,
                            SOOT], kind: "glow", additive: false, life: [0.1,
                            0.16], size: [52 * k,
                            30], alpha: 0.85
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: [SOUL,
                            GHOST], kind: "glow", life: [0.12,
                            0.2], size: [60 * k,
                            24], alpha: 0.4
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: [GHOST,
                            DEEP], kind: "glow", additive: false, life: [0.4,
                            0.6], size: [16,
                            30], alpha: 0.35
                    })
            },
            ease.inOut)
        // đập toé
        flash(ctx.layer,
            to,
            [SOUL],
            30,
            120,
            0.25)
        smoke(ctx.layer,
            to,
            12,
            [INK,
                SOOT,
                DEEP],
            80 * k,
            {
                alpha: 0.7, speed: [60,
                    200], angle: [-0.4,
                    Math.PI + 0.4]
            })
        ring(ctx.layer,
            to,
            [GHOST],
            30,
            200 * k,
            0.4,
            0.8)
        // Rã Giáp: mảnh sắt rỉ bung khỏi tướng
        shards(ctx.layer,
            to,
            12,
            [RUST,
                IRON,
                0x3a3028],
            {
                additive: false, gravity: -700, size: [18,
                    8], stretch: 1.4, speed: [120,
                    300]
            })
        // dấu sương xoáy trên mục tiêu
        await over(ctx.layer,
            0.6,
            (t) => {
                const a = t * Math.PI * 4
                emit(ctx.layer,
                    {
                        x: to.x + Math.cos(a) * 50, y: to.y + Math.sin(a) * 20
                    },
                    {
                        color: [SOUL,
                            GHOST], kind: "glow", life: [0.25,
                            0.35], size: [22,
                            8], alpha: 0.8
                    })
                emit(ctx.layer,
                    {
                        x: to.x + Math.cos(a + Math.PI) * 50, y: to.y + Math.sin(a + Math.PI) * 20
                    },
                    {
                        color: [INK], kind: "glow", additive: false, life: [0.3,
                            0.4], size: [30,
                            12], alpha: 0.6
                    })
            })
    })

/** Bề ngang thân Ma Sương theo độ cao v (0 gót, 1 đỉnh đầu): váy xoè, eo nhỏ, vai rộng, khăn trùm đầu */
const bodyWidth = (v: number) => (v < 0.5 ? 0.42 - v * 0.5 : v < 0.75 ? 0.17 + (v - 0.5) * 0.6 : v < 0.82 ? 0.32 - (v - 0.75) * 2.2 : 0.14 * (1 - (v - 0.82) / 0.18) + 0.02)

/** R Khúc Ai Ca: sương đen tụ ở ô phụ cạnh Yorick, Ma Sương dựng dần từ chân lên đầu bằng hạt hồn, hai tay giơ gọi hồn, hồn bay vòng quanh */
registerSkillVfx("yorick_r",
    async (ctx) => {
        const k = power(ctx)
        const rows = rowsOf(ctx)
        const foot = {
            x: rows.ally[1].x, y: ctx.from.y + rows.up * rows.gap * 0.47 - 70
        }
        const H = 170 * Math.min(1.2,
            k * 0.6 + 0.4)
        // Yorick giơ tay, sương đen tụ
        flash(ctx.layer,
            ctx.from,
            [SOUL],
            30,
            100,
            0.35,
            0.7)
        smoke(ctx.layer,
            shift(foot,
                0,
                40),
            10,
            [INK,
                SOOT],
            70,
            {
                alpha: 0.7, life: [0.8,
                    1.2]
            })
        await vortex(ctx.layer,
            shift(foot,
                0,
                60),
            120,
            0.35,
            110,
            SOULS)
        const bodyPt = (v: number): Pt => {
            const w = bodyWidth(v) * H
            return shift(foot,
                rand(-w,
                    w) + Math.sin(v * 8 + Math.random()) * 3,
                v * H)
        }
        // dựng thân từ chân lên đầu
        await over(ctx.layer,
            0.6,
            (t) => {
                const top = ease.out(t)
                for (let i = 0; i < 9; i++) {
                    const v = Math.random() * top
                    emit(ctx.layer,
                        bodyPt(v),
                        {
                            color: v > 0.82 ? [PALE,
                                WHITE] : [SOUL,
                                GHOST,
                                DEEP], kind: "glow", life: [0.25,
                                0.4], size: [20,
                                12], alpha: 0.75, speed: [5,
                                30], angle: [UP - 0.3,
                                UP + 0.3]
                        })
                }
            })
        // đứng giơ tay gọi hồn, hồn bay vòng quanh
        await over(ctx.layer,
            0.7,
            (t) => {
                for (let i = 0; i < 6; i++) {
                    const v = Math.random()
                    emit(ctx.layer,
                        bodyPt(v),
                        {
                            color: v > 0.82 ? [PALE] : [SOUL,
                                GHOST,
                                DEEP], kind: "glow", life: [0.2,
                                0.3], size: [20,
                                12], alpha: 0.75
                        })
                }
                // mặt là khoảng tối
                emit(ctx.layer,
                    shift(foot,
                        0,
                        H * 0.9),
                    {
                        color: [INK], kind: "glow", additive: false, life: [0.06,
                            0.08], size: [H * 0.12,
                            H * 0.12], alpha: 0.9
                    })
                // hai cánh tay giơ ra, voan rủ
                for (const s of [-1,
                    1]) {
                    const hand = shift(foot,
                        s * H * (0.32 + 0.08 * Math.sin(t * 6)),
                        H * 0.95)
                    for (let j = 0; j < 3; j++) emit(ctx.layer,
                        {
                            x: foot.x + s * H * 0.2 + (hand.x - foot.x - s * H * 0.2) * (j / 2), y: foot.y + H * 0.74 + (hand.y - foot.y - H * 0.74) * (j / 2)
                        },
                        {
                            color: [SOUL,
                                PALE], kind: "glow", life: [0.12,
                                0.2], size: [16,
                                10], alpha: 0.8, speed: [10,
                                30], angle: [DOWN - 0.2,
                                DOWN + 0.2]
                        })
                }
                const a = t * Math.PI * 4
                for (let i = 0; i < 2; i++) emit(ctx.layer,
                    {
                        x: foot.x + Math.cos(a + i * Math.PI) * H * 0.55, y: foot.y + H * 0.5 + Math.sin(a + i * Math.PI) * H * 0.2
                    },
                    {
                        color: [PALE,
                            SOUL], kind: "glow", life: [0.2,
                            0.3], size: [18,
                            10], alpha: 1
                    })
            })
        ring(ctx.layer,
            shift(foot,
                0,
                H * 0.5),
            [SOUL],
            40,
            260,
            0.45,
            0.8)
        motes(ctx.layer,
            shift(foot,
                0,
                H * 0.5),
            24,
            SOULS,
            {
                speed: [60,
                    220]
            })
        await wait(ctx.layer,
            0.25)
    })
