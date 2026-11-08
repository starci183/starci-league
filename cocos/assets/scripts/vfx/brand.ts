// VFX Brand trên Cocos, theo thiết kế bản web (fx_brand.ts): LỬA thật. Hạt không đổi màu theo tuổi nên lửa xếp thành tầng: lõi
// trắng nóng nhỏ, thân vàng cam, viền đỏ sẫm lớn hơn, khói đen (vẽ thường) dưới lửa, than hồng bốc lên. Ô: basic_brand, brand_q,
// brand_e, brand_r, brand_p.
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
    burst, carry, emit, firstFoe, flash, foeRow, lob, offset, power, ring, seg, smoke, sparks, stream, targetsOf, TAU, UP, wait
} from "./g3_helpers"

const HOT = 0xfff4c0
const YELLOW = 0xffd36a
const ORANGE = 0xff7a1a
const RED = 0xd8351a
const DEEP = 0x7a1408
const SOOT = [0x2a1a14, 0x3a2418, 0x1a120e]
const EMBER = [0xff9a3c, 0xffc060, 0xff6a20]

/** Bùng lửa tại chỗ: tầng lõi, thân, viền, lưỡi lửa liếm lên */
function blaze(layer: Node, at: Pt, n: number, size: number, up = 1) {
    void burst(layer, at, Math.round(n * 0.4), {
        color: [HOT, YELLOW], kind: "glow", life: [0.2, 0.35], size: [size * 0.5, size * 0.2], alpha: 1, speed: [20, 90], angle: [UP - 0.6, UP + 0.6],
        gravity: 160 * up, spread: size * 0.2
    })
    void burst(layer, at, n, {
        color: [ORANGE, 0xff9a2a, YELLOW], kind: "glow", life: [0.3, 0.55], size: [size * 0.7, size * 0.25], alpha: 0.9, speed: [30, 140],
        angle: [UP - 0.9, UP + 0.9], gravity: 220 * up, drag: 1.2, spread: size * 0.3
    })
    void burst(layer, at, Math.round(n * 0.6), {
        color: [RED, DEEP], kind: "glow", life: [0.45, 0.7], size: [size * 0.9, size * 0.4], alpha: 0.6, speed: [20, 110],
        angle: [UP - 1, UP + 1], gravity: 180 * up, drag: 1.2, spread: size * 0.35
    })
}

/** Than hồng bay lên, chao ngang */
const embers = (layer: Node, at: Pt, n: number, spread = 30) => burst(layer, at, n, {
    color: EMBER, kind: "dot", life: [0.5, 1], size: [6, 2], alpha: 1, speed: [40, 160], angle: [UP - 0.7, UP + 0.7], gravity: 90, drag: 1, spread
})

/** Lửa cháy liên tục trên một lá (Bỏng): lưỡi lửa mọc từ đáy lá liếm lên */
const burnOn = (layer: Node, at: Pt, secs: number, perSec: number, w = 50, size = 34) => stream(layer, () => ({
    x: at.x + rand(-w, w), y: at.y - 40 + rand(-6, 6)
}), secs, perSec, {
    color: [ORANGE, YELLOW, RED, 0xff9a2a], kind: "glow", life: [0.3, 0.55], size: [size, size * 0.3], alpha: 0.85, speed: [60, 150],
    angle: [UP - 0.25, UP + 0.25], gravity: 120
})

/** Quả cầu lửa bay: quầng nhiệt, lõi trắng, đuôi lửa dài, than và khói */
async function fireball(layer: Node, path: (t: number) => Pt, secs: number, size: number, easing = ease.in) {
    await carry(layer, path, secs, (p, _t, dir) => {
        emit(layer, p, {
            color: [HOT], kind: "glow", life: [0.05, 0.07], size: [size * 0.7, size * 0.6], alpha: 1
        })
        emit(layer, p, {
            color: [YELLOW, ORANGE], kind: "glow", life: [0.08, 0.12], size: [size * 1.3, size], alpha: 0.9
        })
        // đuôi lửa: lưỡi dài chĩa ngược hướng bay
        for (let i = 0; i < 2; i++) emit(layer, offset(p, dir, -size * 0.3), {
            color: [ORANGE, RED, YELLOW], kind: "blade", life: [0.14, 0.26], size: [size * 0.8, size * 0.3], alpha: 0.85, rotation: dir + rand(-0.2, 0.2),
            stretch: 2.2, speed: [40, 120], angle: [dir + Math.PI - 0.35, dir + Math.PI + 0.35]
        })
        emit(layer, offset(p, dir, -size * 0.4), {
            color: [RED, DEEP], kind: "glow", life: [0.2, 0.35], size: [size * 0.9, size * 0.3], alpha: 0.6, spread: size * 0.15
        })
        if (Math.random() < 0.6) emit(layer, p, {
            color: EMBER, kind: "dot", life: [0.3, 0.6], size: [6, 2], alpha: 1, speed: [30, 110], gravity: 80, drag: 1
        })
        if (Math.random() < 0.4) emit(layer, offset(p, dir, -size * 0.6), {
            color: SOOT, kind: "glow", additive: false, life: [0.4, 0.7], size: [size * 0.5, size], alpha: 0.35, speed: [10, 30], angle: [UP, UP]
        })
    }, easing)
}

/** Tụ lửa quanh tay Brand */
async function handFlare(layer: Node, at: Pt, secs: number, k: number) {
    flash(layer, at, ORANGE, 120 * k, secs + 0.1, 0.5)
    await burnOn(layer, offset(at, UP, 30), secs, 90, 26, 30 * k)
}

/** Nổ lửa trúng: quầng trắng, vòng nhiệt, lưỡi lửa bung, than, tro khói */
function fireHit(layer: Node, at: Pt, s: number) {
    flash(layer, at, HOT, 130 * s, 0.2)
    flash(layer, at, ORANGE, 220 * s, 0.4, 0.7)
    ring(layer, at, ORANGE, 30, 210 * s, 0.35, 0.8)
    blaze(layer, at, Math.round(22 * s), 60 * s)
    void sparks(layer, at, Math.round(14 * s), [YELLOW, ORANGE, HOT], [200, 520])
    void embers(layer, at, Math.round(14 * s))
    void smoke(layer, at, Math.round(6 * s), SOOT, 50 * s)
}

/** Đánh thường: đốm lửa nhỏ đuôi đỏ cam, trúng toé tia nhỏ */
registerSkillVfx("basic_brand", async (ctx) => {
    const to = firstFoe(ctx)
    await fireball(ctx.layer, (t) => mix(ctx.from, to, t), 0.28, 26)
    flash(ctx.layer, to, YELLOW, 90, 0.18)
    blaze(ctx.layer, to, 8, 34)
    void sparks(ctx.layer, to, 6, [YELLOW, ORANGE], [140, 300])
    await wait(ctx.layer, 0.3)
})

/**
 * Q Thiêu Rụi: lửa cuộn quanh tay, cầu lửa hình sao chổi (như icon) lao thẳng tới mục tiêu, vỡ tung và gắn Bỏng; đủ Bỏng thì cột
 * tia trắng nóng phụt thẳng lên (Choáng) ngay cùng nhịp.
 */
registerSkillVfx("brand_q", async (ctx) => {
    const k = power(ctx)
    const to = firstFoe(ctx)
    await handFlare(ctx.layer, ctx.from, 0.24, k)
    await fireball(ctx.layer, (t) => mix(ctx.from, to, t), Math.min(0.42, 0.2 + dist(ctx.from, to) / 2400), 52 * k)
    fireHit(ctx.layer, to, 1.1 * k)
    // cột trắng nóng phụt lên: dấu Choáng khi đủ Bỏng
    void burst(ctx.layer, to, 14, {
        color: [HOT, YELLOW], kind: "blade", life: [0.25, 0.45], size: [26, 10], alpha: 1, speed: [380, 620], angle: [UP - 0.12, UP + 0.12],
        drag: 2, align: true, stretch: 3, spread: 16
    })
    await burnOn(ctx.layer, to, 0.5, 60)
    await wait(ctx.layer, 0.2)
})

/**
 * E Rải Lửa (mọi tướng địch): Brand vung tay, bức lửa tràn khỏi người lăn sang hàng địch rồi toả dọc cả hàng; mỗi tướng bùng một
 * vòng lửa nổ (như icon: vầng lửa quanh mũ giáp) và bám Bỏng.
 */
registerSkillVfx("brand_e", async (ctx) => {
    const k = power(ctx)
    const row = foeRow(ctx)
    const mid = mix(row[0], row[row.length - 1], 0.5)
    await handFlare(ctx.layer, ctx.from, 0.18, k)
    // bức lửa lăn tới giữa hàng
    const front = (t: number) => mix(ctx.from, mid, t)
    await carry(ctx.layer, front, 0.3, (p, _t, dir) => {
        for (let i = 0; i < 2; i++) {
            const q = offset(p, dir + UP, rand(-90, 90))
            emit(ctx.layer, q, {
                color: [ORANGE, YELLOW, RED], kind: "glow", life: [0.25, 0.45], size: [46, 14], alpha: 0.85, speed: [40, 120], angle: [UP - 0.3, UP + 0.3], gravity: 150
            })
        }
        emit(ctx.layer, p, {
            color: SOOT, kind: "glow", additive: false, life: [0.4, 0.6], size: [60, 100], alpha: 0.3
        })
    }, ease.in)
    // lửa toả dọc hàng, nổ ở từng tướng
    const sorted = [...row].sort((a, b) => dist(mid, a) - dist(mid, b))
    for (const p of sorted) {
        void (async () => {
            void carry(ctx.layer, (t) => mix(mid, p, t), Math.max(0.05, dist(mid, p) / 2600), (q) => blaze(ctx.layer, q, 2, 34))
            await wait(ctx.layer, dist(mid, p) / 2600)
            flash(ctx.layer, p, HOT, 110, 0.2)
            ring(ctx.layer, p, YELLOW, 40, 190 * k, 0.32, 0.9)
            // vầng tia lửa toả tròn quanh lá
            for (let i = 0; i < 8; i++) {
                const a = i / 8 * TAU + rand(-0.1, 0.1)
                seg(ctx.layer, offset(p, a, 30), offset(p, a, rand(70, 100) * k), rand(4, 7), [YELLOW, ORANGE, HOT], rand(0.2, 0.32))
            }
            blaze(ctx.layer, p, 16, 54 * k)
            void embers(ctx.layer, p, 8)
            void burnOn(ctx.layer, p, 0.5, 40)
        })()
    }
    await wait(ctx.layer, 1)
})

/**
 * R Bão Lửa (mọi tướng địch): quả cầu lửa lớn xoắn tụ trên tay rồi phóng vồng, nảy zíc zắc qua từng tướng địch, mỗi cú nảy nổ một
 * tiếng; cuối cùng Bỏng nhân đôi và cháy ngay: cột lửa dựng đồng loạt trên cả hàng.
 */
registerSkillVfx("brand_r", async (ctx) => {
    const k = power(ctx)
    const row = foeRow(ctx)
    // tụ: lửa xoắn hai dải vào lòng quả cầu
    const hand = offset(ctx.from, UP, 40)
    let a = 0
    flash(ctx.layer, hand, ORANGE, 180 * k, 0.5, 0.6)
    await over(ctx.layer, 0.4, (t) => {
        for (const s of [0, Math.PI]) {
            a += 0.08
            const p = offset(hand, a * 3 + s, 90 * (1 - t) + 10)
            emit(ctx.layer, p, {
                color: [ORANGE, YELLOW, RED], kind: "glow", life: [0.12, 0.2], size: [30, 10], alpha: 0.9
            })
        }
        emit(ctx.layer, hand, {
            color: [HOT, YELLOW], kind: "glow", life: [0.06, 0.1], size: [30 + 40 * t, 20], alpha: 1
        })
    })
    // nảy qua từng tướng: bắt đầu từ ô gần Brand nhất, đi lần lượt dọc hàng, rồi nảy ngược lại một lần
    const start = row.reduce((b, p) => (dist(ctx.from, p) < dist(ctx.from, b) ? p : b), row[0])
    const idx = row.indexOf(start)
    const order = [start, ...row.slice(idx + 1), ...row.slice(0, idx).reverse()]
    let prev = hand
    for (let i = 0; i < order.length; i++) {
        const p = order[i]
        const h = i === 0 ? 120 : 90
        await fireball(ctx.layer, (t) => lob(prev, p, h, t), i === 0 ? 0.32 : 0.2, 60 * k, ease.inOut)
        fireHit(ctx.layer, p, 0.55 * k)
        prev = p
    }
    await wait(ctx.layer, 0.15)
    // Bỏng nhân đôi, cháy ngay: cột lửa cao trên cả hàng cùng lúc
    for (const p of row) {
        flash(ctx.layer, p, ORANGE, 110 * k, 0.4, 0.5)
        void burst(ctx.layer, p, 20, {
            color: [ORANGE, YELLOW, RED, HOT], kind: "glow", life: [0.4, 0.7], size: [50, 16], alpha: 0.9, speed: [200, 420], angle: [UP - 0.15, UP + 0.15],
            drag: 1.5, spread: 26
        })
        void embers(ctx.layer, p, 10, 40)
        void smoke(ctx.layer, offset(p, UP, 60), 4, SOOT, 60)
    }
    await wait(ctx.layer, 0.6)
})

/**
 * Nội tại Hoả Lực: Bỏng bám trên mục tiêu (lửa nhỏ liếm quanh lá, than hồng) và đầu lượt người mang thì cháy: vòng cảnh báo co lại
 * rồi bùng một vầng lửa tròn.
 */
registerSkillVfx("brand_p", async (ctx) => {
    const list = targetsOf(ctx)
    await Promise.all(list.map(async (p) => {
        void embers(ctx.layer, p, 10, 40)
        await burnOn(ctx.layer, p, 0.45, 70, 50, 30)
        ring(ctx.layer, p, RED, 200, 70, 0.35, 0.9)
        await wait(ctx.layer, 0.3)
        flash(ctx.layer, p, HOT, 120, 0.2)
        ring(ctx.layer, p, ORANGE, 40, 200, 0.35, 0.8)
        blaze(ctx.layer, p, 20, 56)
        void sparks(ctx.layer, p, 12, [YELLOW, ORANGE], [200, 420])
        await wait(ctx.layer, 0.4)
    }))
})

