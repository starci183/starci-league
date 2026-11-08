// VFX Ornn trên Cocos, theo thiết kế bản web (fx_ornn.ts): LÒ RÈN thật, dung nham nguội dần (trắng nóng -> vàng -> cam -> đỏ sẫm),
// đá núi lửa, tia lửa thép, khói than. Q khe nứt dung nham + cột đá; E búa rèn Kiệt Tác lên đồng minh + Khiên nung; R búa thần
// rèn một món đồ cho đồng minh và một món về tay. Ô: basic_ornn, ornn_p/q/e/r.
import {
    Node
} from "cc"
import {
    angleOf, dist, mix, rand, wait, type Pt
} from "./particles"
import {
    emit, meleeSmash
} from "./g2_helpers"
import {
    registerSkillVfx
} from "./registry"
import {
    TAU, UP, add, cracks, debris, fireBlast, flames, fly, glow, lob, main, motes, polar, pow, pulse, ring, settle, smoke, sparks
} from "./g2_helpers"

const LAVA = [0xffffff, 0xfff0b8, 0xffc040, 0xff7a20, 0xff5a10]
const HOT = [0xffc040, 0xff7a20, 0xff5a10]
const CRUST = [0x2a1a14, 0x3a2418, 0x4a3020]
const STONE = [0x3a3430, 0x5a5048, 0x2a2420]
const SPARK = [0xffffff, 0xfff0b8, 0xffd060]
const IRON = [0x6a6460, 0x8a8278]

/** Tia lửa thép khi búa nện */
function anvilSparks(layer: Node, at: Pt, n: number) {
    sparks(layer,
        at,
        n,
        SPARK,
        [300,
            760],
        {
            angle: [0.15,
                Math.PI - 0.15], gravity: -900, life: [0.3,
                0.6], size: [18,
                4], drag: 1.2
        })
}

/** Búa rèn: đầu búa đá sắt nung đỏ nhấc lên trên `at` rồi nện thẳng xuống */
async function hammer(layer: Node, at: Pt, size: number, secs: number) {
    const top = add(at,
        0,
        size * 2.2)
    const draw = (p: Pt) => {
        // đầu búa: khối ngang
        for (const dx of [-0.35,
            0,
            0.35]) emit(layer,
            add(p,
                dx * size,
                0),
            {
                color: IRON, kind: "dot", additive: false, life: [0.05,
                    0.07], size: [size * 0.55,
                    size * 0.55], alpha: 1
            })
        // mặt đập nung đỏ ở dưới, cán quấn da ở trên
        emit(layer,
            add(p,
                0,
                -size * 0.22),
            {
                color: HOT, kind: "blade", life: [0.05,
                    0.07], size: [size * 0.5,
                    size * 0.5], alpha: 1, rotation: 0, stretch: 2.2
            })
        emit(layer,
            add(p,
                0,
                size * 0.55),
            {
                color: [0x5a3a22], kind: "blade", additive: false, life: [0.05,
                    0.07], size: [size * 0.5,
                    size * 0.5], alpha: 1, rotation: UP, stretch: 2.2
            })
    }
    // nhấc lên
    await fly(layer,
        secs * 0.55,
        (u) => mix(add(at,
            0,
            size * 1.2),
        top,
        u),
        (p) => draw(p),
        (t) => 1 - (1 - t) ** 2)
    // nện xuống
    await fly(layer,
        secs * 0.45,
        (u) => mix(top,
            add(at,
                0,
                size * 0.25),
            u),
        (p) => {
            draw(p)
            emit(layer,
                add(p,
                    0,
                    size * 0.3),
                {
                    color: [0xff7a20], kind: "glow", life: [0.1,
                        0.16], size: [size,
                        size * 0.4], alpha: 0.5
                })
        },
        (t) => t * t * t)
}

/** Giọt dung nham văng lên rồi rơi nặng */
function lavaSplash(layer: Node, at: Pt, n: number, k = 1) {
    for (let i = 0; i < n; i++) emit(layer,
        at,
        {
            color: LAVA, kind: "glow", life: [0.5,
                0.9], size: [20 * k,
                6], alpha: 1, speed: [200,
                480 * k], angle: [0.4,
                Math.PI - 0.4], gravity: -1100
        })
}

/** Món đồ nung đỏ bay vồng tới `to` rồi nguội lại thành màu thép; chạm thì loé */
async function forgedItem(layer: Node, from: Pt, to: Pt, secs: number) {
    await fly(layer,
        secs,
        (u) => lob(from,
            to,
            120,
            u),
        (p, _d, t) => {
            emit(layer,
                p,
                {
                    color: t < 0.5 ? [0xffffff, 0xfff0b8] : [0xffc040, 0xffe8a0], kind: "blade", life: [0.06,
                        0.08], size: [34,
                        34], alpha: 1, rotation: t * TAU * 1.5, stretch: 1
                })
            emit(layer,
                p,
                {
                    color: HOT, kind: "glow", life: [0.2,
                        0.34], size: [30,
                        6], alpha: 0.8
                })
            if (Math.random() < 0.4) emit(layer,
                p,
                {
                    color: HOT, kind: "dot", life: [0.3,
                        0.5], size: [7,
                        2], alpha: 1, speed: [20,
                        60], gravity: -400
                })
        })
    glow(layer,
        to,
        [0xfff0b8],
        30,
        120,
        0.25)
    ring(layer,
        to,
        [0xffc040],
        30,
        120,
        0.3)
}

/** Đánh thường: búa rèn nện thẳng xuống mục tiêu, vòng sóng nhỏ, bụi than, vài tia lửa thép */
registerSkillVfx("basic_ornn",
    (ctx) => meleeSmash(ctx.layer,
            main(ctx),
            [0xffc040, 0xff7a20],
            [0x5a5048, 0x3a3430]))

/** Nội tại Lò Rèn Sống: búa gõ đe nhịp nhàng trên đồ của đội, mỗi nhịp một chùm tia lửa, cuối cùng đồ loé sáng */
registerSkillVfx("ornn_p",
    async (ctx) => {
        const spots = ctx.to.length ? ctx.to : [ctx.from]
        for (let beat = 0; beat < 3; beat++) {
            for (const p of spots) {
                glow(ctx.layer,
                    p,
                    [0xff9a40],
                    30,
                    90,
                    0.2,
                    0.7)
                anvilSparks(ctx.layer,
                    add(p,
                        0,
                        10),
                    6 + beat * 2)
            }
            await wait(ctx.layer,
                0.18)
        }
        for (const p of spots) {
            glow(ctx.layer,
                p,
                [0xffe0a0],
                40,
                150,
                0.35)
            ring(ctx.layer,
                p,
                [0xffc040],
                40,
                160,
                0.4)
            motes(ctx.layer,
                p,
                10,
                [0xffe0a0, 0xffc040],
                [30,
                    100],
                {
                    gravity: 120
                })
        }
        await settle(ctx.layer,
            0.5)
    })

/**
 * Q Núi Lửa Trồi: Ornn nện đất, khe nứt dung nham chạy trên mặt đất tới chân mục tiêu, đá bật lên hai bên; tới nơi là cột đá
 * núi lửa phun dung nham (sát thương phép). Sau đó một mảnh đồ còn nung đỏ bay từ cột về tay (tạo 1 mảnh đồ lên tay).
 */
registerSkillVfx("ornn_q",
    async (ctx) => {
        const k = pow(ctx)
        const to = main(ctx)
        const d = angleOf(ctx.from,
            to)
        // nện đất
        glow(ctx.layer,
            ctx.from,
            [0xff7a20],
            40,
            140,
            0.3,
            0.7)
        cracks(ctx.layer,
            ctx.from,
            6,
            60,
            HOT,
            0.6)
        lavaSplash(ctx.layer,
            ctx.from,
            8,
            0.7)
        // khe nứt chạy tới
        const len = dist(ctx.from,
            to)
        let placed = 0
        await fly(ctx.layer,
            0.34,
            (u) => mix(ctx.from,
                to,
                u),
            (_p, _dd, t) => {
                while (placed * 16 <= t * len) {
                    const q = mix(ctx.from,
                        to,
                        (placed * 16) / Math.max(len,
                            1))
                    const wob = Math.sin(placed * 1.7) * 7
                    const pp = polar(q,
                        d + UP,
                        wob)
                    emit(ctx.layer,
                        pp,
                        {
                            color: HOT, kind: "blade", life: [0.6,
                                0.8], size: [22,
                                12], alpha: 1, rotation: d + rand(-0.5,
                                0.5), stretch: 1.6
                        })
                    emit(ctx.layer,
                        pp,
                        {
                            color: CRUST, kind: "blade", additive: false, life: [0.7,
                                0.9], size: [16,
                                14], alpha: 0.9, rotation: d + UP + rand(-0.4,
                                0.4), stretch: 1, spread: 14
                        })
                    if (placed % 3 === 0) debris(ctx.layer,
                        pp,
                        2,
                        STONE,
                        12,
                        {
                            speed: [100,
                                240]
                        })
                    placed++
                }
            })
        // cột đá núi lửa trồi
        glow(ctx.layer,
            to,
            [0xffffff],
            40,
            160,
            0.2)
        for (let i = 0; i < 10; i++) emit(ctx.layer,
            add(to,
                rand(-26,
                    26),
                rand(0,
                    40)),
            {
                color: STONE, kind: "blade", additive: false, life: [0.8,
                    1.0], size: [30,
                    60], alpha: 1, rotation: UP + rand(-0.25,
                    0.25), stretch: 1.4
            })
        for (let i = 0; i < 6; i++) emit(ctx.layer,
            add(to,
                rand(-18,
                    18),
                rand(10,
                    60)),
            {
                color: HOT, kind: "blade", life: [0.7,
                    0.9], size: [14,
                    30], alpha: 1, rotation: UP + rand(-0.3,
                    0.3), stretch: 1.6
            })
        fireBlast(ctx.layer,
            to,
            0.9 * k,
            HOT,
            CRUST)
        lavaSplash(ctx.layer,
            to,
            Math.round(16 * k),
            k)
        await wait(ctx.layer,
            0.35)
        // mảnh đồ bay về tay (phía dưới người dùng)
        await forgedItem(ctx.layer,
            add(to,
                0,
                40),
            add(ctx.from,
                0,
                -220),
            0.5)
        await settle(ctx.layer,
            0.3)
    })

/**
 * E Rèn Lửa (Quick): chọn một tướng mình mang đồ. Ống bễ phụt, lửa lò bùng quanh Ornn; búa rèn nện lên đồng minh ba nhịp (Kiệt
 * Tác), mỗi nhịp tia lửa thép; xong thì Khiên dung nham vàng cam bọc lấy đồng minh và nguội dần thành vỏ sáng.
 */
registerSkillVfx("ornn_e",
    async (ctx) => {
        const ally = main(ctx)
        // ống bễ phụt: lửa lò bùng quanh Ornn
        flames(ctx.layer,
            ctx.from,
            16,
            HOT,
            36,
            40)
        glow(ctx.layer,
            ctx.from,
            [0xffa52a],
            40,
            150,
            0.3,
            0.7)
        await wait(ctx.layer,
            0.12)
        // ba nhịp búa trên đồng minh
        for (let i = 0; i < 3; i++) {
            await hammer(ctx.layer,
                ally,
                32,
                i === 0 ? 0.22 : 0.16)
            anvilSparks(ctx.layer,
                ally,
                10 + i * 4)
            glow(ctx.layer,
                ally,
                [0xfff0b8],
                30,
                100 + i * 30,
                0.2)
            ring(ctx.layer,
                ally,
                [0xffa52a],
                30,
                110 + i * 30,
                0.25,
                0.8)
        }
        // Khiên dung nham bọc lấy đồng minh
        await pulse(ctx.layer,
            0.5,
            140,
            (t) => {
                const a = rand(0,
                    TAU)
                emit(ctx.layer,
                    polar(ally,
                        a,
                        74),
                    {
                        color: t < 0.5 ? [0xffc040, 0xfff0b8] : [0xffa52a, 0xff7a20], kind: "glow", life: [0.3,
                            0.5], size: [24,
                            14], alpha: 0.9
                    })
            })
        ring(ctx.layer,
            ally,
            [0xfff0b8],
            150,
            160,
            0.5,
            0.8)
        motes(ctx.layer,
            ally,
            12,
            HOT,
            [40,
                140],
            {
                gravity: 120
            })
        await settle(ctx.layer,
            0.5)
    })

/**
 * R Tiếng Gọi Thần Rèn (Quick, không sát thương): chọn một tướng mình. Bóng búa thần khổng lồ nhấc lên trên đồng minh rồi nện
 * xuống, lò rèn nổ tung lửa vàng; một món đồ hoàn chỉnh rực sáng hiện trên đồng minh (mặc ngay); món thứ hai bay về tay.
 */
registerSkillVfx("ornn_r",
    async (ctx) => {
        const k = pow(ctx)
        const ally = main(ctx)
        // lửa lò bùng quanh Ornn, cột lửa vọt lên trời
        flames(ctx.layer,
            ctx.from,
            20,
            HOT,
            44,
            50)
        await pulse(ctx.layer,
            0.25,
            90,
            () => emit(ctx.layer,
                add(ctx.from,
                    rand(-20,
                        20),
                    30),
                {
                    color: LAVA, kind: "glow", life: [0.25,
                        0.4], size: [40,
                        10], alpha: 0.9, speed: [700,
                        1000], angle: [UP - 0.05,
                        UP + 0.05]
                }))
        // búa thần
        await hammer(ctx.layer,
            ally,
            42,
            0.4)
        glow(ctx.layer,
            ally,
            [0xffffff],
            40,
            140,
            0.18)
        fireBlast(ctx.layer,
            ally,
            0.8 * k,
            [0xfff0b8, 0xffc040, 0xff7a20],
            CRUST)
        ring(ctx.layer,
            ally,
            [0xffc040],
            30,
            200,
            0.4)
        anvilSparks(ctx.layer,
            ally,
            12)
        lavaSplash(ctx.layer,
            ally,
            12,
            1.1)
        await wait(ctx.layer,
            0.15)
        // món đồ hoàn chỉnh hiện trên đồng minh: khung vàng sáng, tia chữ thập
        for (let i = 0; i < 4; i++) emit(ctx.layer,
            add(ally,
                0,
                40),
            {
                color: [0xfff0b8, 0xffe08a], kind: "blade", life: [0.6,
                    0.7], size: [36,
                    54], alpha: 0.9, rotation: i * Math.PI / 4, stretch: 2
            })
        glow(ctx.layer,
            add(ally,
                0,
                40),
            [0xffe08a],
            80,
            30,
            0.6)
        // món thứ hai về tay
        await forgedItem(ctx.layer,
            add(ally,
                0,
                40),
            add(ctx.from,
                0,
                -220),
            0.55)
        smoke(ctx.layer,
            ally,
            6,
            CRUST,
            40,
            90)
        await settle(ctx.layer,
            0.4)
    })

