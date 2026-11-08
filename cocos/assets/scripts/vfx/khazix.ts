// VFX Kha'Zix trên Cocos, theo thiết kế bản web (fx_khazix.ts): Sát Thủ Hư Không tím đen, viền hồng magenta, móng vuốt xương
// trắng, mắt thú xanh chanh. Vết cào là mảnh sắc đè trên nền mực đen để đọc được trên bàn sáng. Cận chiến nên không có gì bay
// ngang bàn, trừ cú Vồ Mồi. Ô: basic_khazix, khazix_p/q/e/r.
import {
    Node
} from "cc"
import {
    angleOf, mix, rand, wait, type Pt
} from "./particles"
import {
    emit, meleeSlash
} from "./g2_helpers"
import {
    registerSkillVfx
} from "./registry"
import {
    TAU, UP, add, aim, fly, glow, lob, main, motes, polar, pow, pulse, ring, settle, slashLine, smoke, sparks, spikes
} from "./g2_helpers"

const VOID = [0xa040e0, 0x8a30c0, 0xc070ff]
const MAGENTA = 0xff60c0
const BONE = 0xf0e8ff
const INK = [0x14081e, 0x220c30, 0x1a0a24]
const LIME = 0xb8ff40

/** Ba móng song song cào qua `c` theo góc `a`; nền mực đen bên dưới để vết cào nổi */
async function claws(layer: Node, c: Pt, a: number, len: number, w: number, colors: number[], secs = 0.1) {
    await Promise.all([-1,
        0,
        1].map(async (i) => {
        const p = polar(c,
            a + UP,
            i * w * 1.3)
        await wait(layer,
            Math.abs(i) * 0.02)
        emit(layer,
            p,
            {
                color: INK, kind: "blade", additive: false, life: [0.4,
                    0.5], size: [len * 0.5,
                    w * 1.4], alpha: 0.8, rotation: a, stretch: 2.4
            })
        await slashLine(layer,
            p,
            a,
            len,
            w,
            colors,
            secs,
            0.3,
            BONE)
    }))
}

/** Mảnh cánh, bụi tím, khói mực văng tại điểm trúng */
function voidHit(layer: Node, at: Pt, k: number, dir?: number) {
    glow(layer,
        at,
        [MAGENTA],
        30,
        130 * k,
        0.25,
        0.8)
    sparks(layer,
        at,
        Math.round(12 * k),
        [...VOID, BONE],
        [220,
            560],
        dir === undefined ? {
        } : {
            angle: [dir - 1,
                dir + 1]
        })
    motes(layer,
        at,
        Math.round(12 * k),
        [0xc070ff, MAGENTA, 0xe0b0ff],
        [60,
            220])
    smoke(layer,
        at,
        Math.round(4 * k),
        INK,
        20,
        70,
        {
            alpha: 0.6
        })
}

/** Gai Hư Không xé từ dưới lên quanh mục tiêu */
function voidSpikes(layer: Node, at: Pt, n: number, h: number) {
    spikes(layer,
        add(at,
            0,
            -20),
        n,
        50,
        20,
        [0x2a0c3a, 0x4a1a6a],
        h,
        0.55)
    spikes(layer,
        add(at,
            0,
            -20),
        Math.round(n / 2),
        40,
        16,
        [MAGENTA, 0xc070ff],
        h * 0.6,
        0.4,
        true)
}

/** Đôi mắt thú xanh chanh loé */
function eyes(layer: Node, at: Pt, life = 0.5) {
    for (const dx of [-12,
        12]) {
        emit(layer,
            add(at,
                dx,
                34),
            {
                color: [LIME], kind: "blade", life: [life,
                    life], size: [16,
                    12], alpha: 1, rotation: dx > 0 ? 0.35 : -0.35, stretch: 1.6
            })
        emit(layer,
            add(at,
                dx,
                34),
            {
                color: [LIME], kind: "glow", life: [life,
                    life], size: [40,
                    20], alpha: 0.6
            })
    }
}

/** Đánh thường: hai vết vuốt mảnh cào ngay trên mục tiêu */
registerSkillVfx("basic_khazix",
    (ctx) => meleeSlash(ctx.layer,
            main(ctx),
            aim(ctx),
            [...VOID, MAGENTA],
            2,
            BONE))

/**
 * Nội tại Sát Thủ Hư Không: tung Cô Lập lên địch đối diện. Mắt thú xanh chanh loé trên Kha'Zix, sợi mùi tím bò sang địch rồi
 * cuộn thành mây tím đen bao lấy nó; mảnh sắc từ mọi phía găm vào (dấu Cô Lập).
 */
registerSkillVfx("khazix_p",
    async (ctx) => {
        const to = main(ctx)
        eyes(ctx.layer,
            ctx.from,
            0.6)
        await wait(ctx.layer,
            0.15)
        // sợi mùi uốn lượn
        await fly(ctx.layer,
            0.4,
            (u) => {
                const p = mix(ctx.from,
                    to,
                    u)
                return polar(p,
                    angleOf(ctx.from,
                        to) + UP,
                    Math.sin(u * 9) * 18)
            },
            (p) => {
                emit(ctx.layer,
                    p,
                    {
                        color: VOID, kind: "glow", life: [0.3,
                            0.5], size: [20,
                            8], alpha: 0.8
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: INK, kind: "glow", additive: false, life: [0.4,
                            0.6], size: [16,
                            30], alpha: 0.35
                    })
            })
        // mây cuộn quanh địch
        await pulse(ctx.layer,
            0.4,
            90,
            (t) => {
                const a = t * TAU * 2 + rand(0,
                    1)
                emit(ctx.layer,
                    polar(to,
                        a,
                        70 - 20 * t),
                    {
                        color: INK, kind: "glow", additive: false, life: [0.4,
                            0.6], size: [30,
                            50], alpha: 0.45
                    })
                emit(ctx.layer,
                    polar(to,
                        a + Math.PI,
                        60),
                    {
                        color: [0xc070ff, MAGENTA], kind: "dot", life: [0.25,
                            0.4], size: [8,
                            2], alpha: 1
                    })
            })
        // mảnh sắc găm vào từ mọi phía
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * TAU
            emit(ctx.layer,
                polar(to,
                    a,
                    120),
                {
                    color: [MAGENTA, BONE], kind: "blade", life: [0.16,
                        0.18], size: [26,
                        8], alpha: 1, speed: [600,
                        640], angle: [a + Math.PI,
                        a + Math.PI], align: true, stretch: 2.6
                })
        }
        await wait(ctx.layer,
            0.16)
        voidHit(ctx.layer,
            to,
            0.8)
        await settle(ctx.layer,
            0.4)
    })

/**
 * Q Nếm Thử Nỗi Sợ: móng cào ngay tại địch đối diện; nhát chéo thứ hai thành chữ X đỏ hồng dày hơn (phần thêm khi mục tiêu bị
 * Cô Lập), gai Hư Không xé từ dưới lên, máu tím toé.
 */
registerSkillVfx("khazix_q",
    async (ctx) => {
        const k = pow(ctx)
        const to = main(ctx)
        const d = aim(ctx)
        eyes(ctx.layer,
            ctx.from,
            0.35)
        await claws(ctx.layer,
            to,
            d + 2.3,
            140,
            12,
            VOID,
            0.1)
        voidHit(ctx.layer,
            to,
            0.8,
            d)
        await claws(ctx.layer,
            to,
            d + 0.85,
            150,
            14,
            [MAGENTA, 0xff3a80, 0xe0b0ff],
            0.09)
        voidSpikes(ctx.layer,
            to,
            8,
            70)
        voidHit(ctx.layer,
            to,
            1.2 * k,
            d)
        ring(ctx.layer,
            to,
            [MAGENTA],
            40,
            200,
            0.3,
            0.7)
        await settle(ctx.layer,
            0.45)
    })

/**
 * E Vồ Mồi: chọn địch bất kỳ đường; Kha'Zix bật khỏi đất (bụi tím, cánh bung; cú đổi chỗ sang đối diện
 * nó do swap.ts vẽ), đáp đè lên địch: hai nhát cánh quét ngang rồi bụi Hư Không bùng, sóng tím toả.
 */
registerSkillVfx("khazix_e",
    async (ctx) => {
        const k = pow(ctx)
        const to = main(ctx)
        // bật nhảy
        ring(ctx.layer,
            ctx.from,
            [0x6a3a8a],
            30,
            150,
            0.35,
            0.6,
            false)
        smoke(ctx.layer,
            ctx.from,
            5,
            INK,
            30,
            60)
        motes(ctx.layer,
            ctx.from,
            10,
            VOID,
            [80,
                220],
            {
                angle: [0.2,
                    Math.PI - 0.2]
            })
        // cú đổi chỗ do swap.ts vẽ; ở đây cánh Hư Không bung ra hai bên lúc bật nhảy
        for (const s of [-1,
            1]) for (let i = 0; i < 4; i++) {
            const a = UP + s * (0.5 + i * 0.25)
            emit(ctx.layer,
                polar(ctx.from,
                    a,
                    30),
                {
                    color: [...VOID, MAGENTA], kind: "blade", life: [0.3,
                        0.4], size: [44,
                        12], alpha: 0.9, rotation: a, stretch: 2.6, speed: [100,
                        160], angle: [a,
                        a], drag: 3
                })
        }
        eyes(ctx.layer,
            ctx.from,
            0.35)
        await wait(ctx.layer,
            0.3)
        // đáp: hai nhát cánh quét ngang
        void slashLine(ctx.layer,
            add(to,
                0,
                10),
            0.15,
            200,
            18,
            [...VOID, MAGENTA],
            0.08,
            0.32,
            BONE)
        await wait(ctx.layer,
            0.06)
        await slashLine(ctx.layer,
            add(to,
                0,
                -10),
            -0.15,
            200,
            18,
            [...VOID, MAGENTA],
            0.08,
            0.32,
            BONE)
        voidHit(ctx.layer,
            to,
            1.2 * k)
        ring(ctx.layer,
            to,
            [0xc070ff, MAGENTA],
            40,
            260,
            0.4)
        smoke(ctx.layer,
            to,
            6,
            INK,
            40,
            90)
        await settle(ctx.layer,
            0.45)
    })

/**
 * R Tấn Công Hư Không (Quick): Tàng Hình, né đòn đang nhắm, tạo 1 lá Q miễn phí. Tím đen hút vào người, thân vỡ thành mảnh tím
 * đen, cột khói mực nuốt lấy; màn sương lilac lung linh còn lại; nếu có kẻ nhắm vào thì vệt đòn của nó xuyên qua bóng tàn;
 * cuối cùng lá Q tím bay xuống tay.
 */
registerSkillVfx("khazix_r",
    async (ctx) => {
        const at = ctx.from
        eyes(ctx.layer,
            at,
            0.6)
        await pulse(ctx.layer,
            0.3,
            140,
            () => {
                const a = rand(0,
                    TAU)
                emit(ctx.layer,
                    polar(at,
                        a,
                        130),
                    {
                        color: [...VOID, MAGENTA], kind: "blade", life: [0.2,
                            0.22], size: [24,
                            8], alpha: 1, speed: [560,
                            600], angle: [a + Math.PI,
                            a + Math.PI], align: true, stretch: 2.4
                    })
            })
        // thân vỡ thành mảnh, cột khói mực
        glow(ctx.layer,
            at,
            [0xffffff, MAGENTA],
            40,
            200,
            0.22)
        sparks(ctx.layer,
            at,
            20,
            [0x2a0c3a, 0x4a1a6a, 0xa040e0],
            [120,
                360],
            {
                additive: false, align: false, spin: [-8,
                    8], life: [0.4,
                    0.7], size: [22,
                    10], stretch: 1.4
            })
        void pulse(ctx.layer,
            0.5,
            70,
            () => emit(ctx.layer,
                add(at,
                    rand(-40,
                        40),
                    rand(-40,
                        20)),
                {
                    color: INK, kind: "glow", additive: false, life: [0.5,
                        0.8], size: [40,
                        80], alpha: 0.5, speed: [60,
                        160], angle: [UP - 0.2,
                        UP + 0.2]
                }))
        // màn sương lilac (Tàng Hình)
        await pulse(ctx.layer,
            0.6,
            80,
            () => emit(ctx.layer,
                add(at,
                    rand(-56,
                        56),
                    rand(-70,
                        70)),
                {
                    color: [0xd8c0ff, 0xb090e0, 0xffffff], kind: "glow", life: [0.3,
                        0.5], size: [18,
                        4], alpha: 0.6, speed: [10,
                        40], angle: [UP - 0.3,
                        UP + 0.3]
                }))
        // né đòn: vệt đòn của kẻ nhắm xuyên qua bóng tàn ra sau
        const foe = ctx.to[0]
        if (foe) {
            const d = angleOf(foe,
                at)
            void fly(ctx.layer,
                0.18,
                (u) => mix(foe,
                    polar(at,
                        d,
                        160),
                    u),
                (p) => emit(ctx.layer,
                    p,
                    {
                        color: [0xffffff, 0xd8c0ff], kind: "blade", life: [0.1,
                            0.16], size: [30,
                            8], alpha: 0.7, rotation: d, stretch: 2.6
                    }))
        }
        // lá Q miễn phí bay xuống tay
        const hand = add(at,
            0,
            -230)
        await fly(ctx.layer,
            0.4,
            (u) => lob(at,
                hand,
                60,
                u),
            (p, _d, t) => {
                emit(ctx.layer,
                    p,
                    {
                        color: [0x4a1a6a], kind: "blade", additive: false, life: [0.05,
                            0.07], size: [36,
                            36], alpha: 1, rotation: UP + Math.sin(t * 6) * 0.3, stretch: 0.75
                    })
                emit(ctx.layer,
                    p,
                    {
                        color: [MAGENTA, 0xc070ff], kind: "glow", life: [0.2,
                            0.3], size: [30,
                            8], alpha: 0.8
                    })
            })
        glow(ctx.layer,
            hand,
            [MAGENTA],
            30,
            110,
            0.25)
        await settle(ctx.layer,
            0.3)
    })
