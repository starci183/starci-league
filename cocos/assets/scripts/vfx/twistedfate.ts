// VFX Twisted Fate trên Cocos, theo thiết kế web (packages/client/src/card/vfx/fx_twistedfate.ts): lá bài xoay trong kim tuyến.
// Màu theo icon: lá xanh chàm tím, lá đỏ đỏ thẫm, lá vàng ánh trắng nóng; Định Mệnh là con mắt hổ phách. Lá bài dựng bằng mảnh
// sắc xếp chồng (cardShape), vẽ lại mỗi khung khi bay.
// Ô đăng ký: basic_twistedfate, twistedfate_p (Thần Bài), twistedfate_q (Chọn Bài), twistedfate_e (Xào Bài), twistedfate_r (Định Mệnh).
import {
    Node
} from "cc"
import {
    ease, pick, rand, type Pt
} from "./particles"
import {
    registerSkillVfx
} from "./registry"
import {
    allFoes, bent, cardShape, flash, fly, mainOf, motes, power, ring, rowsOf, shards, shift, straight, stunStars, DOWN,
    withNeighbours, type Path, emit, over, wait
} from "./g1_helpers"

const GOLD = 0xffc23a
const WHITE_GOLD = 0xfff0c0
const AMBER = 0xff8a1e
const INDIGO = 0x4a3cf0
const BLUE = 0x3b6bff
const RED = 0xe0283a
const BACK = 0x1a1450
const GLITTER = [GOLD,
    WHITE_GOLD,
    0xffe28a]

type CardKind = "blue" | "red" | "gold"
const FACE: Record<CardKind, number[]> = {
    blue: [BLUE,
        INDIGO], red: [RED,
        0xa8102a], gold: [GOLD,
        WHITE_GOLD]
}
const GLOW: Record<CardKind, number> = {
    blue: 0x7fa2ff, red: 0xff5a5a, gold: WHITE_GOLD
}

/** Lá bài bay xoay theo `path`, quầng sáng và kim tuyến quấn quanh */
function flyCard(layer: Node, path: Path, secs: number, kind: CardKind, size: number, spin = 14): Promise<void> {
    return fly(layer,
        path,
        secs,
        (p, t) => {
            cardShape(layer,
                p,
                t * spin,
                size,
                FACE[kind],
                0.05,
                1,
                [GOLD])
            emit(layer,
                p,
                {
                    color: [GLOW[kind]], kind: "glow", life: [0.1,
                        0.16], size: [size * 1.6,
                        size * 0.6], alpha: 0.55
                })
            emit(layer,
                p,
                {
                    color: GLITTER, kind: "dot", life: [0.3,
                        0.6], size: [5,
                        1], alpha: 1, speed: [10,
                        60], spread: 8
                })
        },
        ease.in)
}

/** Lá bung tại chỗ: quầng sáng, mảnh bài toả, kim tuyến rơi chậm */
function cardBurst(layer: Node, at: Pt, kind: CardKind, k: number) {
    flash(layer,
        at,
        [WHITE_GOLD],
        30 * k,
        120 * k,
        0.2)
    flash(layer,
        at,
        [GLOW[kind]],
        50 * k,
        160 * k,
        0.4,
        0.6)
    ring(layer,
        at,
        [GLOW[kind]],
        20,
        170 * k,
        0.32,
        0.8)
    shards(layer,
        at,
        Math.round(12 * k),
        [...FACE[kind],
            GOLD],
        {
            size: [20,
                6], stretch: 1.6
        })
    motes(layer,
        at,
        Math.round(20 * k),
        GLITTER,
        {
            life: [0.5,
                0.9], gravity: -120, speed: [40,
                200]
        })
}

/** Đánh thường: một lá bài xoay bay thẳng tới mục tiêu */
registerSkillVfx("basic_twistedfate",
    async (ctx) => {
        const to = mainOf(ctx)
        await flyCard(ctx.layer,
            straight(shift(ctx.from,
                20,
                20),
            to),
            0.26,
            "blue",
            30,
            20)
        cardBurst(ctx.layer,
            to,
            "blue",
            0.55)
        await wait(ctx.layer,
            0.3)
    })

/** P Thần Bài: lá trên cùng nhấc khỏi Bộ bài, lật mặt loé vàng, rồi trượt xuống đáy bộ */
registerSkillVfx("twistedfate_p",
    async (ctx) => {
        const deck = shift(ctx.from,
            0,
            40)
        const top = shift(deck,
            0,
            90)
        // nhấc lên
        await fly(ctx.layer,
            straight(deck,
                top),
            0.3,
            (p) => cardShape(ctx.layer,
                p,
                0,
                44,
                [BACK],
                0.05,
                1,
                [GOLD]),
            ease.out)
        // lật: co bề ngang rồi mở ra mặt vàng
        await over(ctx.layer,
            0.35,
            (t) => {
                const w = Math.abs(Math.cos(t * Math.PI))
                cardShape(ctx.layer,
                    top,
                    0,
                    44 * Math.max(0.15,
                        w),
                    t < 0.5 ? [BACK] : FACE.gold,
                    0.05,
                    1,
                    [GOLD])
                emit(ctx.layer,
                    top,
                    {
                        color: GLITTER, kind: "dot", life: [0.3,
                            0.5], size: [5,
                            1], alpha: 1, speed: [30,
                            90]
                    })
            })
        flash(ctx.layer,
            top,
            [WHITE_GOLD,
                GOLD],
            30,
            130,
            0.3)
        // trượt xuống đáy
        await fly(ctx.layer,
            straight(top,
                shift(deck,
                    0,
                    -70)),
            0.35,
            (p, t) => cardShape(ctx.layer,
                p,
                0,
                44,
                FACE.gold,
                0.05,
                1 - t * 0.8,
                [GOLD]),
            ease.in)
        motes(ctx.layer,
            shift(deck,
                0,
                -70),
            10,
            GLITTER)
        await wait(ctx.layer,
            0.25)
    })

/** Q Chọn Bài: lá trên đầu xoay lần lượt lam, đỏ, vàng rồi dừng; bay tới mục tiêu. Đỏ: nổ thêm 2 đường kề. Vàng: Choáng. Lam: rút lá
 * (lá bay về TF). Loại lá thật do lá trên cùng bộ quyết định; hiệu ứng không biết trước nên chọn ngẫu nhiên */
registerSkillVfx("twistedfate_q",
    async (ctx) => {
        const k = power(ctx)
        const to = mainOf(ctx)
        const head = shift(ctx.from,
            0,
            90)
        const order: CardKind[] = ["blue",
            "red",
            "gold"]
        const chosen = pick(order)
        await over(ctx.layer,
            0.6,
            (t) => {
                const kind = order[Math.floor(t * 9) % 3]
                cardShape(ctx.layer,
                    head,
                    0,
                    44,
                    FACE[kind],
                    0.05,
                    1,
                    [GOLD])
                emit(ctx.layer,
                    head,
                    {
                        color: [GLOW[kind]], kind: "glow", life: [0.06,
                            0.08], size: [90,
                            80], alpha: 0.5
                    })
            })
        await over(ctx.layer,
            0.2,
            () => cardShape(ctx.layer,
                head,
                0,
                48,
                FACE[chosen],
                0.05,
                1,
                [GOLD]))
        flash(ctx.layer,
            head,
            [GLOW[chosen]],
            40,
            150,
            0.3)
        await flyCard(ctx.layer,
            straight(head,
                to),
            0.28,
            chosen,
            40 * k,
            18)
        if (chosen === "red") {
            const rows = rowsOf(ctx)
            // lá đỏ: hai đường kề nổ cùng nhịp
            for (const p of withNeighbours(rows.foe, to, rows.spacing)) if (Math.abs(p.x - to.x) > 20) cardBurst(ctx.layer, p, "red", 0.9 * k)
            cardBurst(ctx.layer,
                to,
                "red",
                1.2 * k)
            await wait(ctx.layer,
                0.45)
        } else if (chosen === "gold") {
            cardBurst(ctx.layer,
                to,
                "gold",
                1.1 * k)
            await stunStars(ctx.layer,
                to,
                0.7)
        } else {
            cardBurst(ctx.layer,
                to,
                "blue",
                k)
            await flyCard(ctx.layer,
                bent(to,
                    ctx.from,
                    90),
                0.4,
                "blue",
                30,
                6)
            flash(ctx.layer,
                ctx.from,
                [BLUE,
                    0x7fa2ff],
                30,
                110,
                0.3,
                0.7)
            await wait(ctx.layer,
                0.2)
        }
    })

/** E Xào Bài: ba lá vắt thành vòm xào trên đầu TF, rồi xoè quạt ba lá phóng vào mục tiêu, mảnh bài vàng chàm găm vào */
registerSkillVfx("twistedfate_e",
    async (ctx) => {
        const k = power(ctx)
        const to = mainOf(ctx)
        const c = shift(ctx.from,
            0,
            80)
        await over(ctx.layer,
            0.6,
            (t) => {
                for (let i = 0; i < 3; i++) {
                    const a = t * Math.PI * 3 + (i * Math.PI * 2) / 3
                    const p = {
                        x: c.x + Math.cos(a) * 60, y: c.y + Math.abs(Math.sin(a)) * 40
                    }
                    cardShape(ctx.layer,
                        p,
                        a * 0.5,
                        34,
                        i === 1 ? FACE.gold : [BACK,
                            INDIGO],
                        0.05,
                        1,
                        [GOLD])
                }
                emit(ctx.layer,
                    shift(c,
                        rand(-60,
                            60),
                        rand(0,
                            40)),
                    {
                        color: GLITTER, kind: "dot", life: [0.3,
                            0.5], size: [5,
                            1], alpha: 1
                    })
            })
        await Promise.all([-60,
            0,
            60].map((h, i) => wait(ctx.layer,
            i * 0.05).then(() => flyCard(ctx.layer,
            bent(c,
                to,
                h),
            0.26,
            i === 1 ? "gold" : "blue",
            32 * k,
            22))))
        cardBurst(ctx.layer,
            to,
            "gold",
            1.0 * k)
        shards(ctx.layer,
            to,
            10,
            [INDIGO,
                GOLD,
                WHITE_GOLD],
            {
                angle: [DOWN - 1,
                    DOWN + 1]
            })
        await wait(ctx.layer,
            0.35)
    })

/** Con mắt hổ phách bằng hạt: tròng cam, viền vàng, đồng tử tối */
function eye(layer: Node, at: Pt, life: number, size: number) {
    emit(layer,
        at,
        {
            color: [AMBER], kind: "glow", life: [life,
                life], size: [size * 1.6,
                size * 1.9], alpha: 0.6
        })
    emit(layer,
        at,
        {
            color: [GOLD], kind: "ring", life: [life,
                life], size: [size,
                size * 1.1], alpha: 1
        })
    emit(layer,
        at,
        {
            color: [0x2a0a00], kind: "dot", additive: false, life: [life,
                life], size: [size * 0.35,
                size * 0.3], alpha: 1
        })
}

/** R Định Mệnh: mắt hổ phách hiện trên mọi tướng địch, lá bài xoáy vòng quanh TF, rồi một loạt lá lật bay rất nhanh vào địch ngẫu
 * nhiên; lá kỹ năng (đỏ) to hơn, nổ gấp đôi */
registerSkillVfx("twistedfate_r",
    async (ctx) => {
        const k = power(ctx)
        const foes = allFoes(ctx)
        eye(ctx.layer,
            shift(ctx.from,
                0,
                90),
            1.2,
            60)
        for (const f of foes) eye(ctx.layer,
            shift(f,
                0,
                70),
            1.3,
            44)
        await over(ctx.layer,
            0.5,
            (t) => {
                for (let i = 0; i < 6; i++) {
                    const a = t * Math.PI * 4 + (i * Math.PI) / 3
                    cardShape(ctx.layer,
                        {
                            x: ctx.from.x + Math.cos(a) * 80, y: ctx.from.y + Math.sin(a) * 34
                        },
                        a,
                        26,
                        [BACK,
                            INDIGO],
                        0.05,
                        1,
                        [GOLD])
                }
            })
        const n = 5
        const flights: Promise<void>[] = []
        for (let i = 0; i < n; i++) {
            const f = pick(foes)
            const skill = Math.random() < 0.35
            const kind: CardKind = skill ? "red" : pick(["blue",
                "gold"] as CardKind[])
            flights.push(flyCard(ctx.layer,
                bent(shift(ctx.from,
                    0,
                    40),
                f,
                rand(-60,
                    60)),
                0.2,
                kind,
                (skill ? 44 : 32) * k,
                24).then(() => {
                cardBurst(ctx.layer,
                    f,
                    kind,
                    (skill ? 1.4 : 0.8) * k)
                if (skill) ring(ctx.layer,
                    f,
                    [RED,
                        AMBER],
                    30,
                    240 * k,
                    0.4,
                    0.9)
            }))
            await wait(ctx.layer,
                0.12)
        }
        await Promise.all(flights)
        await wait(ctx.layer,
            0.45)
    })
