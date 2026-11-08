// VFX Renata Glasc trên Cocos, theo thiết kế bản web (fx_renata.ts): nữ tài phiệt hoá chất Zaun. Khói hồng tím đậm (vẽ thường để
// giữ màu trên nền cỏ), bụi sáng hồng cộng sáng, lõi xanh ngọc của bình hoá chất như icon Q, mắt đỏ của Cuồng Loạn như icon E/R.
// Ô: basic_renata, renata_q, renata_e, renata_r, renata_p.
import {
    Node
} from "cc"
import {
    dist, ease, mix, over, rand, type Pt
} from "./particles"
import {
    registerSkillVfx
} from "./registry"
import {
    allyRow, burst, carry, curve, emit, facing, firstFoe, flash, foeRow, lob, offset, power, ring, seg, sparks, stream, TAU, UP, wait
} from "./g3_helpers"

const PINK = 0xff3fa8
const MAGENTA = 0xd61f8a
const VIOLET = 0x9a3cff
const PLUM = 0x3a1240
const CYAN = 0x3fd8ff
const BLOOD = 0xb0102a
const GOLD = 0xffcf6a
const GLASS = 0xd8f4ff

/** Cụm khói hoá chất đục cuộn tại chỗ */
const chemSmoke = (layer: Node, at: Pt, n: number, size: number, spread = 24, colors = [PLUM, 0x5a1a5e, MAGENTA]) => burst(layer, at, n, {
    color: colors, kind: "glow", additive: false, life: [0.5, 0.9], size: [size * 0.6, size * 1.5], alpha: 0.55, speed: [20, 90], drag: 1.8,
    gravity: 30, spread
})

/** Bụi sáng hồng lấp lánh */
const sparkle = (layer: Node, at: Pt, n: number, speed: [number, number], colors = [PINK, 0xffa8dc, 0xffffff]) => burst(layer, at, n, {
    color: colors, kind: "dot", life: [0.3, 0.6], size: [8, 2], alpha: 1, speed, drag: 2
})

/** Bình hoá chất bay: đầu sáng (lõi xanh, vỏ hồng), đuôi khói tím dày */
async function flask(layer: Node, path: (t: number) => Pt, secs: number, size: number, easing = ease.inOut) {
    await carry(layer, path, secs, (p, t, dir) => {
        emit(layer, p, {
            color: [CYAN, GLASS], kind: "glow", life: [0.05, 0.07], size: [size * 0.6, size * 0.5], alpha: 1
        })
        emit(layer, p, {
            color: [PINK], kind: "glow", life: [0.08, 0.1], size: [size * 1.4, size], alpha: 0.7
        })
        emit(layer, p, {
            color: [GLASS], kind: "blade", life: [0.05, 0.07], size: [size * 0.5, size * 0.4], alpha: 0.9, rotation: t * 20, stretch: 1.4
        })
        emit(layer, offset(p, dir, -size * 0.4), {
            color: [PLUM, 0x5a1a5e], kind: "glow", additive: false, life: [0.35, 0.6], size: [size * 0.6, size * 1.3], alpha: 0.5, spread: 4
        })
        if (Math.random() < 0.5) emit(layer, p, {
            color: [PINK, VIOLET], kind: "dot", life: [0.25, 0.45], size: [6, 2], alpha: 1, speed: [20, 70], drag: 2
        })
    }, easing)
}

/** Bình vỡ: mảnh kính, khói độc bung, bụi hồng toé */
function shatter(layer: Node, at: Pt, s: number) {
    flash(layer, at, PINK, 170 * s, 0.3, 0.8)
    ring(layer, at, MAGENTA, 30, 180 * s, 0.35, 0.8)
    void sparks(layer, at, Math.round(10 * s), [GLASS, CYAN, 0xffffff], [160, 420], {
        stretch: 1.6, size: [14, 6]
    })
    void chemSmoke(layer, at, Math.round(10 * s), 60 * s, 30)
    void sparkle(layer, at, Math.round(16 * s), [80, 300])
}

/** Đánh thường: bình hoá chất nhỏ vồng nhẹ, vỡ thành khói độc */
registerSkillVfx("basic_renata", async (ctx) => {
    const to = firstFoe(ctx)
    await flask(ctx.layer, (t) => curve(ctx.from, to, 40, t), 0.32, 26)
    shatter(ctx.layer, to, 0.5)
    await wait(ctx.layer, 0.35)
})

/** Luồng khói chảy a -> b theo đường cong, nhiều đợt đuổi nhau; xong khi đợt đầu tới nơi */
async function smokeFlow(layer: Node, a: Pt, b: Pt, secs: number, colors: number[], width = 18) {
    await carry(layer, (t) => curve(a, b, 50, t), secs, (p, _t, dir) => {
        for (let i = 0; i < 2; i++) emit(layer, offset(p, dir + UP, rand(-width, width)), {
            color: colors, kind: "glow", additive: false, life: [0.3, 0.5], size: [width * 1.6, width * 2.4], alpha: 0.5
        })
        emit(layer, p, {
            color: [PINK, 0xffa8dc], kind: "dot", life: [0.2, 0.4], size: [7, 2], alpha: 1, speed: [20, 60], drag: 2
        })
    }, ease.inOut)
}

/**
 * Q Cứu Cánh (đồng minh): Renata chỉ định đồng minh bằng luồng khói; đồng minh mất 20% Máu hiện tại: khói máu đỏ rút khỏi lá bốc
 * lên, tụ thành đám phía trên, chuyển dần sang khói độc hồng tím rồi đổ ngược xuống; bụi Tốc Đánh, Chí Mạng, AD xoáy siết vào lá.
 */
registerSkillVfx("renata_q", async (ctx) => {
    const k = power(ctx)
    const to = ctx.to[0] ?? ctx.from
    if (dist(ctx.from, to) > 40) await smokeFlow(ctx.layer, ctx.from, to, 0.3, [PLUM, 0x5a1a5e])
    // khói máu rút khỏi lá, bốc lên
    const cloud = offset(to, UP, 110)
    flash(ctx.layer, to, BLOOD, 140, 0.4, 0.5)
    await stream(ctx.layer, () => ({
        x: to.x + rand(-50, 50), y: to.y + rand(-40, 20)
    }), 0.35, 70, {
        color: [BLOOD, 0x6a0818, 0x8a1020], kind: "glow", additive: false, life: [0.35, 0.5], size: [24, 40], alpha: 0.6, speed: [180, 260],
        angle: [UP - 0.15, UP + 0.15]
    })
    // đám khói phía trên đổi màu: đỏ -> tím -> hồng
    await over(ctx.layer, 0.3, (t) => {
        const c = t < 0.4 ? [BLOOD, 0x6a0818] : t < 0.75 ? [VIOLET, PLUM] : [PINK, MAGENTA]
        emit(ctx.layer, cloud, {
            color: c, kind: "glow", additive: false, life: [0.3, 0.45], size: [50, 90], alpha: 0.55, spread: 40
        })
        emit(ctx.layer, cloud, {
            color: [PINK, VIOLET], kind: "glow", life: [0.12, 0.2], size: [80, 40], alpha: 0.4 * t
        })
    })
    // đổ ngược xuống lá
    void burst(ctx.layer, cloud, 24, {
        color: [PINK, MAGENTA, VIOLET], kind: "glow", additive: false, life: [0.3, 0.45], size: [30, 46], alpha: 0.55, speed: [260, 380],
        angle: [-UP - 0.25, -UP + 0.25], spread: 30
    })
    await wait(ctx.layer, 0.25)
    flash(ctx.layer, to, PINK, 200 * k, 0.4, 0.7)
    ring(ctx.layer, to, PINK, 220 * k, 80, 0.4, 0.9)
    // bụi chỉ số xoáy siết vào lá: vàng (AD), hồng (Chí Mạng), xanh (Tốc Đánh)
    let a = 0
    await over(ctx.layer, 0.5, (t) => {
        for (const [i, c] of [GOLD, PINK, CYAN].entries()) {
            a += 0.07
            const p = offset(to, a * 4 + i * TAU / 3, (110 - 80 * t) * k)
            emit(ctx.layer, p, {
                color: [c, 0xffffff], kind: "dot", life: [0.15, 0.25], size: [10, 3], alpha: 1
            })
            emit(ctx.layer, p, {
                color: [c], kind: "glow", life: [0.12, 0.18], size: [24, 8], alpha: 0.5
            })
        }
    })
    void sparks(ctx.layer, to, 10, [GOLD, PINK, CYAN], [200, 380], {
        angle: [UP - 0.3, UP + 0.3]
    })
    await wait(ctx.layer, 0.25)
})

/** Một rocket nhỏ: đầu sáng hồng, đuôi khói tím, phụt khói nhỏ dọc đường */
const rocket = (layer: Node, a: Pt, b: Pt, bend: number, secs: number) => carry(layer, (t) => curve(a, b, bend, t), secs, (p, _t, dir) => {
    emit(layer, p, {
        color: [0xffffff, PINK], kind: "blade", life: [0.05, 0.07], size: [22, 18], alpha: 1, rotation: dir, stretch: 2
    })
    emit(layer, p, {
        color: [PINK], kind: "glow", life: [0.08, 0.1], size: [40, 20], alpha: 0.7
    })
    emit(layer, offset(p, dir, -12), {
        color: [PLUM, 0x5a1a5e], kind: "glow", additive: false, life: [0.4, 0.7], size: [14, 34], alpha: 0.5
    })
}, ease.in)

/**
 * E Hoả Lực Yểm Trợ (Quick, đồng minh): đồng minh bắn hai rocket hồng vồng ra hai bên, hợp vào kẻ thù trước mặt (nổ cầu khói,
 * mảnh bụi), rồi 50% sát thương thành Khiên: màn khói độc cuộn dày quanh lá đồng minh có vòng hồng.
 */
registerSkillVfx("renata_e", async (ctx) => {
    const k = power(ctx)
    const ally = ctx.to[0] ?? ctx.from
    const foe = offset(ally, facing(ctx), 376)
    // Renata ra hiệu cho đồng minh
    if (dist(ctx.from, ally) > 40) await smokeFlow(ctx.layer, ctx.from, ally, 0.22, [PLUM, 0x5a1a5e], 12)
    flash(ctx.layer, ally, PINK, 110, 0.2)
    await Promise.all([rocket(ctx.layer, ally, foe, 110, 0.36), rocket(ctx.layer, ally, foe, -110, 0.36)])
    // nổ lớn
    flash(ctx.layer, foe, 0xffffff, 120 * k, 0.18)
    shatter(ctx.layer, foe, 1.2 * k)
    void chemSmoke(ctx.layer, foe, 10, 80 * k, 40)
    await wait(ctx.layer, 0.15)
    // Khiên khói quanh đồng minh
    ring(ctx.layer, ally, PINK, 120, 210 * k, 0.4, 0.9)
    flash(ctx.layer, ally, VIOLET, 200 * k, 0.8, 0.35)
    let a = rand(0, TAU)
    await over(ctx.layer, 0.6, () => {
        for (let i = 0; i < 2; i++) {
            a += 0.45
            emit(ctx.layer, {
                x: ally.x + Math.cos(a) * 80 * k, y: ally.y + Math.sin(a) * 66 * k
            }, {
                color: [PLUM, MAGENTA, 0x5a1a5e], kind: "glow", additive: false, life: [0.3, 0.45], size: [34, 50], alpha: 0.5
            })
            emit(ctx.layer, {
                x: ally.x + Math.cos(a + 1) * 84 * k, y: ally.y + Math.sin(a + 1) * 70 * k
            }, {
                color: [PINK, 0xffa8dc], kind: "dot", life: [0.2, 0.3], size: [8, 2], alpha: 1
            })
        }
    })
})

/** Đôi mắt đỏ rực (Cuồng Loạn) trên lá */
function madEyes(layer: Node, at: Pt, life: number) {
    for (const s of [-1, 1]) {
        const e = {
            x: at.x + s * 16, y: at.y + 22
        }
        seg(layer, offset(e, 0.25 * s, -10), offset(e, 0.25 * s, 10), 4, [0xff2040, 0xff6080], life)
        flash(layer, e, 0xff1030, 46, life, 0.9)
    }
}

/**
 * R Hợp Chất Điên Loạn (mọi tướng địch): bình hoá chất lớn ném vồng qua sông, vỡ thành bức sóng khói hồng tím cuộn dọc cả hàng địch;
 * mỗi tướng địch Cuồng Loạn: khói máu trào khỏi lá, đôi mắt đỏ rực, bụi Tốc Đánh dựng đứng như gió xoáy.
 */
registerSkillVfx("renata_r", async (ctx) => {
    const k = power(ctx)
    const row = foeRow(ctx)
    const mid = mix(row[0], row[row.length - 1], 0.5)
    flash(ctx.layer, ctx.from, PINK, 140, 0.3, 0.6)
    await flask(ctx.layer, (t) => lob(ctx.from, mid, 160, t), 0.5, 46 * k)
    shatter(ctx.layer, mid, 1.1 * k)
    // sóng khói lan dọc hàng từ giữa ra hai đầu
    await Promise.all([row[0], row[row.length - 1]].map((end) => carry(ctx.layer, (t) => mix(mid, end, t), 0.4, (p) => {
        for (let i = 0; i < 2; i++) emit(ctx.layer, offset(p, UP, rand(-60, 60)), {
            color: [PLUM, MAGENTA, VIOLET, 0x5a1a5e], kind: "glow", additive: false, life: [0.5, 0.8], size: [50, 110], alpha: 0.5, speed: [10, 50], gravity: 30
        })
        emit(ctx.layer, p, {
            color: [PINK, VIOLET], kind: "glow", life: [0.3, 0.5], size: [80, 140], alpha: 0.3, spread: 40
        })
    }, ease.out)))
    // Cuồng Loạn trên từng tướng
    for (const p of row) {
        madEyes(ctx.layer, p, 0.8)
        void chemSmoke(ctx.layer, p, 6, 50, 30, [BLOOD, 0x6a0818, PLUM])
        void stream(ctx.layer, () => ({
            x: p.x + rand(-50, 50), y: p.y - 40
        }), 0.6, 50, {
            color: [PINK, 0xff6080, 0xffffff], kind: "blade", life: [0.25, 0.4], size: [18, 6], alpha: 1, speed: [200, 340], angle: [UP - 0.08, UP + 0.08],
            align: true, stretch: 2.8
        })
    }
    await wait(ctx.layer, 0.85)
})

/**
 * Nội tại Cấp Vốn: Máu đã mất của cả đội thành vốn. Khói máu từ các đồng minh chảy về Renata, đổi thành khói độc hồng chảy ngược
 * ra cả đội kèm bụi vàng (Tốc Đánh, Chí Mạng, AD).
 */
registerSkillVfx("renata_p", async (ctx) => {
    const at = ctx.from
    const allies = allyRow(ctx).filter((p) => dist(p, at) > 40)
    await Promise.all(allies.map((p) => smokeFlow(ctx.layer, p, at, 0.35, [BLOOD, 0x6a0818], 10)))
    flash(ctx.layer, at, PINK, 160, 0.4, 0.6)
    ring(ctx.layer, at, GOLD, 40, 200, 0.4, 0.8)
    await Promise.all(allies.map(async (p) => {
        await smokeFlow(ctx.layer, at, p, 0.3, [PLUM, MAGENTA], 10)
        void sparkle(ctx.layer, p, 10, [60, 160], [GOLD, PINK, 0xffffff])
    }))
    await wait(ctx.layer, 0.4)
})

