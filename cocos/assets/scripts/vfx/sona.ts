// VFX Sona trên Cocos (bản web chưa có, dựng từ bộ chiêu và tranh tướng): Đàn Etwahl xanh lam tóc mây. Âm thanh vẽ bằng vòng sóng
// loang, dải giai điệu lượn sóng và nốt nhạc bay (đầu tròn, thân, cờ). Mỗi chiêu một màu như Sona LMHT: Anh Hùng Ca lam (AD/AP),
// Giai Điệu Khích Lệ xanh ngọc (Giáp/Kháng), Khúc Cao Trào vàng kim trên nền tím (hồi Máu cả đội + mana), nội tại hợp âm ba màu.
// Ô: basic_sona, sona_q, sona_e, sona_r, sona_p.
import {
    Node
} from "cc"
import {
    angleOf, dist, ease, mix, over, rand, type Pt
} from "./particles"
import {
    registerSkillVfx, type VfxCtx
} from "./registry"
import {
    allyRow, burst, carry, emit, firstFoe, flash, gather, neighbours, note, offset, power, ring, seg, star, stream, TAU, UP, wait
} from "./g3_helpers"

const BLUE = 0x42bfff
const SKY = 0xbfe8ff
const MINT = 0x65eb91
const TEALG = 0x7fe3c8
const VIOLET = 0xb77aff
const GOLD = 0xffd75a
const PALE = 0xffe6a6
const WHITE = 0xffffff
const MANA = 0x5aa8ff

/** Gảy đàn: vòng sóng âm loang nhiều lớp quanh Sona và vài nốt nhạc bay lên */
function strum(layer: Node, at: Pt, color: number, s = 1, notes = 3) {
    flash(layer, at, color, 120 * s, 0.3, 0.6)
    for (let i = 0; i < 3; i++) ring(layer, at, i ? color : WHITE, 30 + i * 10, (140 + i * 50) * s, 0.4 + i * 0.1, 0.8 - i * 0.2)
    for (let i = 0; i < notes; i++) note(layer, offset(at, UP + rand(-1.2, 1.2), rand(30, 60)), color, 12, rand(0.7, 1), rand(40, 80), UP + rand(-0.5, 0.5))
}

/** Dải giai điệu a -> b: đầu sáng lượn sóng hình sin, đuôi chấm sáng, rải nốt nhạc dọc đường; xong khi tới nơi */
async function melody(layer: Node, a: Pt, b: Pt, secs: number, color: number, amp = 26, scale = 1) {
    const dir = angleOf(a, b)
    let dropped = 0
    await carry(layer, (t) => offset(mix(a, b, t), dir + UP, Math.sin(t * TAU * 1.5) * amp * Math.sin(t * Math.PI)), secs, (p, t) => {
        emit(layer, p, {
            color: [WHITE, color], kind: "glow", life: [0.06, 0.08], size: [26 * scale, 18], alpha: 1
        })
        emit(layer, p, {
            color: [color, SKY], kind: "dot", life: [0.3, 0.5], size: [9 * scale, 2], alpha: 0.9, speed: [5, 25]
        })
        emit(layer, p, {
            color: [color], kind: "glow", life: [0.25, 0.35], size: [20 * scale, 6], alpha: 0.5
        })
        if (t * 5 > dropped) {
            dropped++
            note(layer, p, color, 10 * scale, 0.6, rand(20, 50), UP + rand(-0.6, 0.6))
        }
    }, ease.inOut)
}

/** Đánh thường: cục âm thanh vàng nhạt bay thẳng, trúng loé nhỏ và vòng sóng âm */
registerSkillVfx("basic_sona", async (ctx) => {
    const to = firstFoe(ctx)
    flash(ctx.layer, ctx.from, PALE, 70, 0.18, 0.7)
    await carry(ctx.layer, (t) => mix(ctx.from, to, t), 0.26, (p, _t, d) => {
        emit(ctx.layer, p, {
            color: [WHITE, PALE], kind: "glow", life: [0.05, 0.07], size: [24, 18], alpha: 1
        })
        emit(ctx.layer, p, {
            color: [PALE, GOLD], kind: "blade", life: [0.12, 0.2], size: [12, 6], alpha: 0.9, rotation: d, stretch: 3
        })
    }, ease.in)
    flash(ctx.layer, to, PALE, 80, 0.16)
    ring(ctx.layer, to, PALE, 20, 110, 0.25, 0.8)
    ring(ctx.layer, to, WHITE, 10, 70, 0.2, 0.7)
    await wait(ctx.layer, 0.25)
})

/** Tướng kề nhận phần lan: ô kề của mục tiêu (ưu tiên ô gần Sona) */
const spillTo = (ctx: VfxCtx, p: Pt): Pt => neighbours(ctx, p).sort((a, b) => dist(ctx.from, a) - dist(ctx.from, b))[0]

/**
 * Q Anh Hùng Ca (đồng minh, AD và AP vĩnh viễn, lan sang 1 tướng kề): Sona gảy đàn, sóng âm lam loang, dải giai điệu lam lượn tới
 * đồng minh, tới nơi là vòng lam siết vào lá, nốt nhạc và mảnh sáng như lưỡi kiếm bốc lên (sức mạnh); một dải mảnh hơn lan sang ô kề.
 */
registerSkillVfx("sona_q", async (ctx) => {
    const k = power(ctx)
    const to = ctx.to[0] ?? ctx.from
    strum(ctx.layer, ctx.from, BLUE, k)
    await wait(ctx.layer, 0.12)
    if (dist(ctx.from, to) > 40) await melody(ctx.layer, ctx.from, to, 0.4, BLUE)
    const buff = (p: Pt, s: number) => {
        ring(ctx.layer, p, BLUE, 220 * s, 70 * s, 0.35, 0.9)
        flash(ctx.layer, p, BLUE, 180 * s, 0.4, 0.6)
        void burst(ctx.layer, p, Math.round(10 * s), {
            color: [WHITE, BLUE, SKY], kind: "blade", life: [0.4, 0.6], size: [22, 10], alpha: 1, speed: [120, 220], angle: [UP - 0.25, UP + 0.25],
            drag: 1.4, align: true, stretch: 2.6, spread: 40
        })
        for (let i = 0; i < 3; i++) note(ctx.layer, offset(p, UP + rand(-1, 1), rand(20, 50)), BLUE, 12 * s, 0.9, rand(50, 90), UP + rand(-0.4, 0.4))
    }
    buff(to, k)
    const spill = spillTo(ctx, to)
    await melody(ctx.layer, to, spill, 0.3, BLUE, 16, 0.7)
    buff(spill, 0.6)
    await wait(ctx.layer, 0.5)
})

/**
 * E Giai Điệu Khích Lệ (Quick, Giáp và Kháng phép vĩnh viễn, lan sang 1 tướng kề): sóng âm xanh ngọc, giai điệu bay vồng tới đồng
 * minh, quanh lá dựng vòng nốt nhạc xoay tròn như khiên âm thanh, vòng lục ngọc bao ngoài; lan nhẹ sang ô kề.
 */
registerSkillVfx("sona_e", async (ctx) => {
    const k = power(ctx)
    const to = ctx.to[0] ?? ctx.from
    strum(ctx.layer, ctx.from, MINT, k, 2)
    if (dist(ctx.from, to) > 40) await melody(ctx.layer, ctx.from, to, 0.36, MINT, 40)
    const ward = async (p: Pt, s: number, secs: number) => {
        flash(ctx.layer, p, TEALG, 200 * s, secs + 0.2, 0.35)
        ring(ctx.layer, p, MINT, 100 * s, 190 * s, 0.35, 0.9)
        ring(ctx.layer, p, TEALG, 190 * s, 180 * s, secs, 0.5)
        let a = 0
        await over(ctx.layer, secs, () => {
            for (let i = 0; i < 4; i++) {
                const ang = a + i * TAU / 4
                emit(ctx.layer, {
                    x: p.x + Math.cos(ang) * 76 * s, y: p.y + Math.sin(ang) * 64 * s
                }, {
                    color: [WHITE, MINT], kind: "dot", life: [0.05, 0.07], size: [12 * s, 10 * s], alpha: 1
                })
                emit(ctx.layer, {
                    x: p.x + Math.cos(ang - 0.15) * 76 * s, y: p.y + Math.sin(ang - 0.15) * 64 * s
                }, {
                    color: [MINT, TEALG], kind: "glow", life: [0.2, 0.3], size: [18 * s, 6], alpha: 0.6
                })
            }
            a += 0.09
        })
        note(ctx.layer, offset(p, UP, 70 * s), MINT, 14 * s, 0.7, 40, UP)
    }
    await Promise.all([ward(to, k, 0.7), (async () => {
        await wait(ctx.layer, 0.15)
        const spill = spillTo(ctx, to)
        await melody(ctx.layer, to, spill, 0.26, MINT, 14, 0.7)
        await ward(spill, 0.65, 0.45)
    })()])
})

/**
 * R Khúc Cao Trào (Quick, mọi tướng mình hồi Máu, đội hồi mana): Sona gảy hợp âm lớn, đàn loé vàng, sóng âm vàng kim dạng làn
 * rộng quét ngang khắp hàng mình trên nền tím, nốt nhạc tung bay; mỗi đồng minh: dấu cộng xanh lục và hạt hồi Máu bốc lên, chấm mana
 * xanh lam rơi về.
 */
registerSkillVfx("sona_r", async (ctx) => {
    const k = power(ctx)
    const at = ctx.from
    const allies = allyRow(ctx)
    // dồn: nốt nhạc ba màu hút về đàn
    flash(ctx.layer, at, VIOLET, 220 * k, 0.5, 0.5)
    await gather(ctx.layer, at, 0.25, 140, 110, [GOLD, VIOLET, BLUE, MINT], {
        kind: "dot", size: [9, 3]
    })
    star(ctx.layer, at, 60 * k, [WHITE, GOLD], 0.3, 0.3)
    for (let i = 0; i < 2; i++) ring(ctx.layer, at, i % 2 ? VIOLET : GOLD, 40, (300 + i * 100) * k, 0.45 + i * 0.1, 0.7 - i * 0.2)
    // sóng âm quét dọc hàng hai phía
    const ends = [allies[0], allies[allies.length - 1]]
    await Promise.all(ends.map((e) => carry(ctx.layer, (t) => mix(at, e, t), 0.35, (p, _t, dir) => {
        for (let i = -1; i <= 1; i++) emit(ctx.layer, offset(p, dir + UP, i * 22), {
            color: [GOLD, PALE, WHITE], kind: "blade", life: [0.18, 0.26], size: [30, 12], alpha: 1 - Math.abs(i) * 0.2, rotation: dir + UP, stretch: 1.4
        })
        emit(ctx.layer, p, {
            color: [VIOLET], kind: "glow", life: [0.3, 0.4], size: [120, 60], alpha: 0.4
        })
        if (Math.random() < 0.4) note(ctx.layer, offset(p, dir + UP, rand(-60, 60)), [GOLD, VIOLET, BLUE][Math.floor(Math.random() * 3)], 11, 0.7, rand(40, 90), UP + rand(-0.5, 0.5))
    }, ease.out)))
    // hồi Máu và mana mỗi đồng minh
    await Promise.all(allies.map(async (p) => {
        flash(ctx.layer, p, MINT, 180, 0.5, 0.5)
        seg(ctx.layer, offset(p, UP, 10), offset(p, UP, 70), 7, [MINT, WHITE], 0.6)
        seg(ctx.layer, offset(offset(p, UP, 40), 0, -30), offset(offset(p, UP, 40), 0, 30), 7, [MINT, WHITE], 0.6)
        void stream(ctx.layer, () => ({
            x: p.x + rand(-55, 55), y: p.y - 40
        }), 0.6, 40, {
            color: [MINT, 0xc8ffd8], kind: "dot", life: [0.5, 0.8], size: [10, 3], alpha: 1, speed: [60, 120], angle: [UP - 0.15, UP + 0.15]
        })
        await stream(ctx.layer, () => ({
            x: p.x + rand(-55, 55), y: p.y + 120
        }), 0.5, 30, {
            color: [MANA, SKY], kind: "dot", life: [0.4, 0.5], size: [9, 4], alpha: 1, speed: [220, 260], angle: [-UP, -UP]
        })
    }))
    await wait(ctx.layer, 0.3)
})

/**
 * Nội tại Sức Mạnh Hợp Âm: lá chiêu phe mình trả mana, đội hồi mana. Ba nốt nhạc lam, lục, tím xoay quanh Sona rồi hợp lại thành một
 * hợp âm loé sáng, sóng mana xanh lam lan ra cả hàng mình, chấm mana rơi về từng tướng.
 */
registerSkillVfx("sona_p", async (ctx) => {
    const at = ctx.from
    const cols = [BLUE, MINT, VIOLET]
    await over(ctx.layer, 0.5, (t) => {
        for (let i = 0; i < 3; i++) {
            const a = t * TAU + i * TAU / 3
            const p = offset(at, a, 70 * (1 - t * 0.7))
            emit(ctx.layer, p, {
                color: [cols[i], WHITE], kind: "dot", life: [0.06, 0.08], size: [14, 10], alpha: 1
            })
            emit(ctx.layer, p, {
                color: [cols[i]], kind: "glow", life: [0.2, 0.3], size: [26, 8], alpha: 0.6
            })
        }
    })
    star(ctx.layer, at, 40, [WHITE, MANA], 0.3, 0.3)
    ring(ctx.layer, at, MANA, 40, 520, 0.5, 0.6)
    for (let i = 0; i < 3; i++) note(ctx.layer, offset(at, UP, 30), cols[i], 12, 0.8, rand(60, 100), UP + (i - 1) * 0.5)
    await Promise.all(allyRow(ctx).map((p) => stream(ctx.layer, () => ({
        x: p.x + rand(-45, 45), y: p.y + 90
    }), 0.4, 25, {
        color: [MANA, SKY, WHITE], kind: "dot", life: [0.35, 0.45], size: [8, 3], alpha: 1, speed: [200, 240], angle: [-UP, -UP]
    })))
    await wait(ctx.layer, 0.4)
})

