// VFX Jayce trên Cocos, theo thiết kế bản web (fx_jayce.ts): điện hextech. Dạng Búa vàng cam (icon búa: tia lửa vàng, búa nện từ
// trên xuống), dạng Pháo xanh lam trắng (icon pháo: cầu sấm xanh, cổng tăng tốc). Mỗi lá Q/E/R chỉ có một khoá jayce_q/e/r nên
// hiệu ứng tự chọn dạng: style.travel của bản Pháo (JAYCE_CANNON trong heroMap.gen.ts) hoặc mục tiêu khác đường thì là Pháo.
// Có thêm khoá tường minh cho từng dạng: jayce_q_hammer, jayce_q_cannon, jayce_e_hammer, jayce_e_cannon, jayce_r_hammer,
// jayce_r_cannon, basic_jayce_hammer, basic_jayce_cannon, jayce_swap (nút Đổi Dạng). Hoán đổi ô của Q Búa do swap.ts vẽ.
import {
    Node
} from "cc"
import {
    angleOf, dist, ease, mix, over, rand, type Pt
} from "./particles"
import {
    registerSkillVfx, type SkillEffect, type VfxCtx
} from "./registry"
import {
    burst, carry, emit, facing, firstFoe, flash, gather, lightning, meleeSmash, neighbours, offset, power, ring, seg, sparks, star, stream, TAU, UP, wait
} from "./g3_helpers"

// dạng Búa
const H_GOLD = 0xffd45a
const H_ORANGE = 0xff9a2a
const H_HOT = 0xfff4ce
const H_ZAP = [0xfff4ce, 0xffd45a, 0xffb040]
// dạng Pháo
const C_CYAN = 0x63d9ff
const C_BLUE = 0x258bff
const C_WHITE = 0xe8fbff
const C_ZAP = [0xe8fbff, 0x63d9ff, 0x4fc8ff]
const STEEL = [0x8a8e98, 0x6a6e78]

/** Mục tiêu khác đường với Jayce (Pháo bắn mọi đường, Búa chỉ đánh đối diện) */
const offLane = (ctx: VfxCtx) => {
    const t = ctx.to[0]
    if (!t) return false
    const vert = Math.abs(t.y - ctx.from.y) >= Math.abs(t.x - ctx.from.x)
    return vert ? Math.abs(t.x - ctx.from.x) > 100 : Math.abs(t.y - ctx.from.y) > 100
}
const cannonStyle = (ctx: VfxCtx) => ["jayceShockBlast", "jayceGateShot", "jayceGate"].includes(ctx.style.travel) || ctx.style.cast === "jayceGate"

/** Tia điện ngắn toả ra từ tâm */
function crackle(layer: Node, at: Pt, n: number, reach: number, colors: number[], life = 0.18) {
    for (let i = 0; i < n; i++) lightning(layer, at, offset(at, rand(0, TAU), rand(reach * 0.5, reach)), colors, 2, life, 10, 3)
}

/** Niệm: điện dồn vào vũ khí */
async function charge(layer: Node, at: Pt, colors: number[], secs: number) {
    flash(layer, at, colors[1], 120, secs + 0.1, 0.5)
    await Promise.all([
        gather(layer, at, secs, 130, 80, colors),
        over(layer, secs, () => {
            if (Math.random() < 0.3) lightning(layer, offset(at, rand(0, TAU), 60), at, colors, 1.5, 0.08, 8, 3)
        }),
    ])
}

/** Búa nện: khối điện vàng dội thẳng từ trên xuống, chạm là sóng điện tròn, tia lởm chởm, nứt đất */
async function slam(layer: Node, at: Pt, s: number) {
    const top = offset(at, UP, 180)
    await carry(layer, (t) => mix(top, at, t), 0.16, (p) => {
        emit(layer, p, {
            color: [H_ORANGE, 0xc87a20], kind: "blade", life: [0.06, 0.08], size: [40 * s, 36 * s], alpha: 1, rotation: 0, stretch: 1.2
        })
        emit(layer, p, {
            color: [H_GOLD], kind: "glow", life: [0.1, 0.14], size: [110 * s, 60], alpha: 0.6
        })
        emit(layer, offset(p, UP, 30), {
            color: [H_GOLD, H_HOT], kind: "blade", life: [0.14, 0.2], size: [20, 8], alpha: 0.9, rotation: UP, stretch: 3
        })
    }, ease.in)
    flash(layer, at, H_HOT, 170 * s, 0.22)
    flash(layer, at, H_GOLD, 280 * s, 0.45, 0.6)
    ring(layer, at, H_GOLD, 40, 200 * s, 0.35, 0.9)
    crackle(layer, at, Math.round(4 * s), 80 * s, H_ZAP, 0.2)
    void sparks(layer, at, Math.round(18 * s), [H_HOT, H_GOLD, H_ORANGE], [240, 600], {
        gravity: -300
    })
    void burst(layer, at, Math.round(8 * s), {
        color: STEEL, kind: "blade", additive: false, life: [0.4, 0.7], size: [14, 8], alpha: 1, speed: [160, 340], gravity: -500, spin: [-10, 10], stretch: 1.1
    })
}

/** Cầu sấm xanh bay: lõi trắng, quầng lam, đuôi thon, tia điện bám quanh */
const shockOrb = (layer: Node, a: Pt, b: Pt, secs: number, r: number) => carry(layer, (t) => mix(a, b, t), secs, (p, _t, dir) => {
    emit(layer, p, {
        color: [C_WHITE], kind: "glow", life: [0.05, 0.07], size: [r * 1.4, r * 1.2], alpha: 1
    })
    emit(layer, p, {
        color: [C_CYAN, C_BLUE], kind: "glow", life: [0.08, 0.12], size: [r * 3, r * 2], alpha: 0.8
    })
    emit(layer, offset(p, dir, -r), {
        color: [C_BLUE, C_CYAN], kind: "blade", life: [0.14, 0.22], size: [r * 1.6, r * 0.6], alpha: 0.8, rotation: dir, stretch: 3
    })
    if (Math.random() < 0.4) lightning(layer, p, offset(p, rand(0, TAU), r * 1.6), C_ZAP, 1.4, 0.06, 6, 2)
}, ease.in)

/** Nổ điện xanh tròn */
function blast(layer: Node, at: Pt, s: number) {
    flash(layer, at, C_WHITE, 150 * s, 0.2)
    flash(layer, at, C_CYAN, 260 * s, 0.4, 0.6)
    ring(layer, at, C_CYAN, 40, 260 * s, 0.38, 1)
    crackle(layer, at, Math.round(4 * s), 80 * s, C_ZAP)
    void sparks(layer, at, Math.round(16 * s), [C_WHITE, C_CYAN, C_BLUE], [220, 560])
}

// ---- đánh thường ----
const basicHammer: SkillEffect = async (ctx) => {
    const to = firstFoe(ctx)
    const hit = meleeSmash(ctx.layer, to, [H_HOT, H_GOLD, H_ORANGE], [...STEEL, 0x8a7458])
    await wait(ctx.layer, 0.1)
    crackle(ctx.layer, to, 2, 44, H_ZAP, 0.14)
    await hit
}
const basicCannon: SkillEffect = async (ctx) => {
    const to = firstFoe(ctx)
    const dir = angleOf(ctx.from, to)
    star(ctx.layer, offset(ctx.from, dir, 30), 20, [C_WHITE, C_CYAN], 0.12, dir + 0.785)
    await carry(ctx.layer, (t) => mix(ctx.from, to, t), 0.2, (p, _t, d) => emit(ctx.layer, p, {
        color: C_ZAP, kind: "blade", life: [0.06, 0.1], size: [18, 14], alpha: 1, rotation: d, stretch: 3
    }), ease.in)
    star(ctx.layer, to, 22, [C_WHITE, C_CYAN], 0.18, 0.3)
    crackle(ctx.layer, to, 2, 50, C_ZAP)
    await wait(ctx.layer, 0.25)
}
registerSkillVfx("basic_jayce_hammer", basicHammer)
registerSkillVfx("basic_jayce_cannon", basicCannon)
registerSkillVfx("basic_jayce", (ctx) => (offLane(ctx) || cannonStyle(ctx) ? basicCannon(ctx) : basicHammer(ctx)))

// ---- Q ----
/** Búa Q Chỉ Thiên!: điện vàng dồn vào búa, Jayce vọt lên (cột tia vàng), búa nện xuống đầu mục tiêu; hồi Máu: tia vàng về Jayce */
const qHammer: SkillEffect = async (ctx) => {
    const k = power(ctx)
    const to = firstFoe(ctx)
    await charge(ctx.layer, ctx.from, H_ZAP, 0.24)
    void burst(ctx.layer, ctx.from, 14, {
        color: [H_GOLD, H_HOT], kind: "blade", life: [0.2, 0.3], size: [24, 8], alpha: 1, speed: [500, 700], angle: [UP - 0.15, UP + 0.15], align: true, stretch: 3
    })
    await wait(ctx.layer, 0.1)
    await slam(ctx.layer, to, 1.1 * k)
    // hồi Máu theo sát thương: đốm vàng xanh bay về
    await wait(ctx.layer, 0.2)
    void stream(ctx.layer, () => offset(to, rand(0, TAU), 30), 0.3, 60, {
        color: [0xb8ffb0, H_GOLD], kind: "dot", life: [0.3, 0.45], size: [8, 3], alpha: 1, speed: [260, 340],
        angle: [angleOf(to, ctx.from) - 0.2, angleOf(to, ctx.from) + 0.2]
    })
    await wait(ctx.layer, 0.4)
}
/** Pháo Q Cầu Sấm: chớp đầu nòng xanh, cầu sấm lao thẳng, nổ điện tròn, hai đường kề dính nổ nhỏ */
const qCannon: SkillEffect = async (ctx) => {
    const k = power(ctx)
    const to = firstFoe(ctx)
    const dir = angleOf(ctx.from, to)
    await charge(ctx.layer, offset(ctx.from, dir, 30), C_ZAP, 0.2)
    star(ctx.layer, offset(ctx.from, dir, 34), 34, [C_WHITE, C_CYAN], 0.16, dir + 0.785)
    await shockOrb(ctx.layer, offset(ctx.from, dir, 34), to, Math.min(0.36, 0.16 + dist(ctx.from, to) / 2600), 18 * k)
    blast(ctx.layer, to, 1.2 * k)
    for (const n of neighbours(ctx, to)) {
        void carry(ctx.layer, (t) => mix(to, n, t), 0.16, (p) => emit(ctx.layer, p, {
            color: C_ZAP, kind: "glow", life: [0.08, 0.12], size: [26, 10], alpha: 0.9
        })).then(() => blast(ctx.layer, n, 0.55))
    }
    await wait(ctx.layer, 0.55)
}
registerSkillVfx("jayce_q_hammer", qHammer)
registerSkillVfx("jayce_q_cannon", qCannon)
registerSkillVfx("jayce_q", (ctx) => (cannonStyle(ctx) ? qCannon(ctx) : qHammer(ctx)))

// ---- E ----
/** Búa E Lôi Phạt: búa giáng thẳng xuống đầu mục tiêu đối diện (không vung ngang), tia vàng bật theo hướng đánh, Choáng: đốm vàng xoay */
const eHammer: SkillEffect = async (ctx) => {
    const k = power(ctx)
    const to = firstFoe(ctx)
    const dir = angleOf(ctx.from, to)
    await charge(ctx.layer, ctx.from, H_ZAP, 0.16)
    await slam(ctx.layer, to, 0.8 * k)
    void sparks(ctx.layer, to, 12, [H_HOT, H_GOLD], [260, 520], {
        angle: [dir - 0.35, dir + 0.35], stretch: 3
    })
    // Choáng
    const head = offset(to, UP, 70)
    await over(ctx.layer, 0.45, (t) => {
        for (let i = 0; i < 3; i++) {
            const a = t * TAU * 1.6 + i * TAU / 3
            emit(ctx.layer, {
                x: head.x + Math.cos(a) * 30, y: head.y + Math.sin(a) * 9
            }, {
                color: [H_GOLD, H_HOT], kind: "dot", life: [0.06, 0.08], size: [10, 8], alpha: 1
            })
        }
    })
}
/** Pháo E Cổng Tăng Tốc: hai cột mốc dựng trước Jayce, nhịp điện xanh nối thành cánh cổng ngang ba đường, vệt tốc độ lao qua; Jayce
 * nhận 1 Gia Tốc: mũi tên sáng bốc lên */
const eCannon: SkillEffect = async (ctx) => {
    const k = power(ctx)
    const dir = facing(ctx)
    const center = offset(ctx.from, dir, 110)
    const ends = [offset(center, dir + UP, 220 * k), offset(center, dir - UP, 220 * k)]
    for (const e of ends) {
        flash(ctx.layer, e, C_CYAN, 90, 1.1, 0.8)
        ring(ctx.layer, e, C_WHITE, 20, 90, 0.35, 0.9)
    }
    await over(ctx.layer, 0.3, (t) => {
        const tip0 = mix(ends[0], center, ease.out(t))
        const tip1 = mix(ends[1], center, ease.out(t))
        emit(ctx.layer, tip0, {
            color: C_ZAP, kind: "glow", life: [0.1, 0.14], size: [30, 10], alpha: 1
        })
        emit(ctx.layer, tip1, {
            color: C_ZAP, kind: "glow", life: [0.1, 0.14], size: [30, 10], alpha: 1
        })
    })
    // cổng điện chập chờn
    await over(ctx.layer, 0.75, () => {
        if (Math.random() < 0.5) lightning(ctx.layer, ends[0], ends[1], C_ZAP, 2, 0.08, 14)
        emit(ctx.layer, mix(ends[0], ends[1], Math.random()), {
            color: [C_CYAN, C_BLUE], kind: "glow", life: [0.2, 0.3], size: [40, 20], alpha: 0.5
        })
        // vệt tốc độ lao qua cổng
        if (Math.random() < 0.6) emit(ctx.layer, offset(mix(ends[0], ends[1], Math.random()), dir, -60), {
            color: C_ZAP, kind: "blade", life: [0.2, 0.25], size: [20, 10], alpha: 1, speed: [700, 800], angle: [dir, dir], align: true, stretch: 3.4
        })
    })
    // Gia Tốc: mũi tên sáng bốc lên trên Jayce
    for (let i = 0; i < 3; i++) {
        const p = offset(ctx.from, UP, 20 + i * 22)
        seg(ctx.layer, offset(p, UP + 2.4, 18), p, 3, C_ZAP, 0.5)
        seg(ctx.layer, offset(p, UP - 2.4 + Math.PI * 2, 18), p, 3, C_ZAP, 0.5)
    }
    await wait(ctx.layer, 0.3)
}
registerSkillVfx("jayce_e_hammer", eHammer)
registerSkillVfx("jayce_e_cannon", eCannon)
registerSkillVfx("jayce_e", (ctx) => (cannonStyle(ctx) ? eCannon(ctx) : eHammer(ctx)))

// ---- R ----
/** Búa R Sấm Chớp Rền Vang: búa khổng lồ, sét vàng giáng xuống ba ô cùng nhịp, ô đối diện nặng nhất */
const rHammer: SkillEffect = async (ctx) => {
    const k = power(ctx)
    const main = firstFoe(ctx)
    const hits = [main, ...neighbours(ctx, main)]
    await charge(ctx.layer, ctx.from, H_ZAP, 0.35)
    void burst(ctx.layer, ctx.from, 18, {
        color: [H_GOLD, H_HOT], kind: "blade", life: [0.2, 0.3], size: [26, 8], alpha: 1, speed: [500, 800], angle: [UP - 0.2, UP + 0.2], align: true, stretch: 3
    })
    for (const h of hits) lightning(ctx.layer, offset(h, UP, 260), h, H_ZAP, 2.5, 0.24, 20)
    await Promise.all(hits.map((h, i) => slam(ctx.layer, h, (i === 0 ? 1.2 : 0.8) * k)))
        await wait(ctx.layer, 0.45)
}
/** Pháo R Tích Tụ: cầu năng lượng tụ lớn, bắn qua cổng tăng tốc (vòng điện loé), tia xuyên giáp to dần lao vào mục tiêu */
const rCannon: SkillEffect = async (ctx) => {
    const k = power(ctx)
    const to = firstFoe(ctx)
    const dir = angleOf(ctx.from, to)
    const muzzle = offset(ctx.from, dir, 36)
    await charge(ctx.layer, muzzle, C_ZAP, 0.45)
    const gate = mix(muzzle, to, 0.3)
    ring(ctx.layer, gate, C_CYAN, 120, 160, 0.5, 1)
    for (const s of [-1, 1]) flash(ctx.layer, offset(gate, dir + UP, 70 * s), C_WHITE, 60, 0.5, 0.9)
    await shockOrb(ctx.layer, muzzle, gate, 0.12, 16 * k)
    star(ctx.layer, gate, 60, [C_WHITE, C_CYAN], 0.25, dir + 0.785)
    await shockOrb(ctx.layer, gate, to, 0.14, 30 * k)
    seg(ctx.layer, gate, to, 14 * k, [C_CYAN, C_BLUE], 0.3, 0.6)
    seg(ctx.layer, gate, to, 5 * k, [C_WHITE], 0.25, 1)
    blast(ctx.layer, to, 1.7 * k)
    void sparks(ctx.layer, to, 14, [C_WHITE, C_CYAN], [400, 800], {
        angle: [dir - 0.3, dir + 0.3], stretch: 3.4
    })
    await wait(ctx.layer, 0.5)
}
registerSkillVfx("jayce_r_hammer", rHammer)
registerSkillVfx("jayce_r_cannon", rCannon)
registerSkillVfx("jayce_r", (ctx) => (cannonStyle(ctx) || offLane(ctx) ? rCannon(ctx) : rHammer(ctx)))

// ---- Đổi Dạng / nội tại ----
/**
 * Nút Đổi Dạng và nội tại Tụ Điện Hextech: điện quấn thân Jayce, bánh răng sáng (icon nội tại) quay quanh, màu đổi từ vàng sang lam
 * (hoặc ngược lại), loé sáng rồi vũ khí chờ Tăng Lực: tia điện nhỏ bám quanh.
 */
const transform: SkillEffect = async (ctx) => {
    const at = ctx.from
    const toCannon = !cannonStyle(ctx)
    const [a, b] = toCannon ? [H_ZAP, C_ZAP] : [C_ZAP, H_ZAP]
    let rot = 0
    await over(ctx.layer, 0.5, (t) => {
        rot += 0.12
        const cols = t < 0.5 ? a : b
        // bánh răng: vòng vạch ngắn toả tia quay đều
        for (let i = 0; i < 3; i++) {
            const ang = rot + i * TAU / 3
            const p = offset(at, ang, 70)
            seg(ctx.layer, p, offset(p, ang, 16), 4, cols, 0.08, 1)
        }
        emit(ctx.layer, offset(at, rot * 2, 60), {
            color: cols, kind: "glow", life: [0.1, 0.16], size: [24, 8], alpha: 0.9
        })
        if (Math.random() < 0.3) lightning(ctx.layer, offset(at, rand(0, TAU), 50), offset(at, rand(0, TAU), 50), cols, 1.5, 0.08, 10, 3)
    })
    flash(ctx.layer, at, b[0], 220, 0.3)
    ring(ctx.layer, at, b[1], 40, 260, 0.4, 0.9)
    void sparks(ctx.layer, at, 16, b, [220, 460])
    await over(ctx.layer, 0.4, () => {
        if (Math.random() < 0.4) lightning(ctx.layer, offset(at, rand(0, TAU), 30), offset(at, rand(0, TAU), 60), b, 1.4, 0.08, 8, 3)
    })
}
registerSkillVfx("jayce_swap", transform)
registerSkillVfx("jayce_p", transform)
