// VFX Vayne trên Cocos, theo thiết kế bản web (fx_vayne.ts): chất liệu BÓNG ĐÊM VÀ BẠC. Khói mực chàm (vẽ thường, không cộng
// sáng), mũi nỏ bạc sắc, ánh trăng sau lưng và đôi mắt kính đỏ như icon. Ô đăng ký: basic_vayne, vayne_q, vayne_e, vayne_r, vayne_p.
import {
    Node
} from "cc"
import {
    angleOf, dist, ease, mix, over, rand, type Pt
} from "./particles"
import {
    registerSkillVfx
} from "./registry"
import {
    arc, burst, carry, emit, facing, firstFoe, flash, gather, offset, power, ring, seg, sparks, star, stream, TAU, UP, wait
} from "./g3_helpers"

const SILVER = 0xdce3ea
const WHITE = 0xffffff
const INK = 0x1c1838
const INDIGO = 0x4b4bd6
const NIGHT = 0x2a2350
const CRIMSON = 0xd52d40
const VIOLET = 0x8a4bff
const GOLD = 0xffe08a

/** Khói đêm: khối mực chàm cuộn tại chỗ */
function nightSmoke(layer: Node, at: Pt, n: number, size: number, spread = 26) {
    void burst(layer, at, n, {
        color: [INK, NIGHT, 0x2e2a5a], kind: "glow", additive: false, life: [0.5, 0.9], size: [size * 0.6, size * 1.5], alpha: 0.6,
        speed: [20, 80], drag: 2, spread
    })
    void burst(layer, at, Math.round(n / 2), {
        color: [INDIGO, VIOLET], kind: "glow", life: [0.3, 0.55], size: [size * 0.4, size], alpha: 0.35, speed: [20, 70], drag: 2, spread
    })
}

/** Mũi nỏ bạc: lưỡi sắc dài ở đầu, vệt bạc mảnh kéo sau, quầng sáng quanh đầu tên */
async function silverBolt(layer: Node, a: Pt, b: Pt, secs: number, scale: number, colors: number[]) {
    await carry(layer, (t) => mix(a, b, t), secs, (p, _t, dir) => {
        emit(layer, p, {
            color: colors, kind: "blade", life: [0.06, 0.08], size: [26 * scale, 22 * scale], alpha: 1, rotation: dir, stretch: 2.6
        })
        emit(layer, p, {
            color: [colors[0]], kind: "glow", life: [0.08, 0.12], size: [30 * scale, 14], alpha: 0.6
        })
        // vệt bạc đọng dọc đường bay
        emit(layer, offset(p, dir, -14 * scale), {
            color: [SILVER, INDIGO], kind: "blade", life: [0.12, 0.2], size: [16 * scale, 4], alpha: 0.7, rotation: dir, stretch: 3
        })
    }, ease.in)
}

/** Dấu Mũi Tên Bạc: ba vạch bạc xoay quanh mục tiêu như vòng khắc */
function silverMark(layer: Node, at: Pt, k: number, life = 0.5) {
    const r = 34 * k
    const rot = rand(0, TAU)
    for (let i = 0; i < 3; i++) {
        const a = rot + i * TAU / 3
        arc(layer, at, r, a, a + 1.2, 3, [SILVER, WHITE], life, 0.95, 6)
    }
    ring(layer, at, SILVER, r * 2.6, r * 2.1, life, 0.6)
}

/** Đánh thường: nỏ cổ tay bắn mũi tên bạc mảnh, trúng loé trắng và khắc dấu bạc */
registerSkillVfx("basic_vayne", async (ctx) => {
    const to = firstFoe(ctx)
    flash(ctx.layer, ctx.from, SILVER, 60, 0.15, 0.8)
    await silverBolt(ctx.layer, ctx.from, to, Math.min(0.26, 0.1 + dist(ctx.from, to) / 3000), 0.8, [WHITE, SILVER])
    const dir = angleOf(ctx.from, to)
    star(ctx.layer, to, 26, [WHITE, SILVER], 0.2, dir + 0.4)
    void sparks(ctx.layer, to, 8, [WHITE, SILVER, INDIGO], [160, 380], {
        angle: [dir - 0.7, dir + 0.7]
    })
    silverMark(ctx.layer, to, 0.9, 0.42)
    await wait(ctx.layer, 0.3)
})

/**
 * Q Nhào Lộn (Quick): Vayne lộn sang đường kề và né đòn đang nhắm. Cú dời ô do hiệu ứng đổi chỗ chung (swap.ts) vẽ, ở đây chỉ vẽ
 * phía thi triển: khói đêm bùng ở ô cũ (đòn nhắm vào đó tan vào khói), bóng mờ tím chàm đọng lại, hai sợi khói xoắn bật về phía ô
 * mới, bụi bạc bắn thấp, rồi nỏ loé sáng (đòn kế mạnh hơn).
 */
registerSkillVfx("vayne_q", async (ctx) => {
    const k = power(ctx)
    const from = ctx.from
    const t = ctx.to[0]
    const dest = t && Math.abs(t.y - from.y) < 80 && dist(t, from) > 40 ? t : {
        x: from.x + (from.x > 0 ? -214 : 214), y: from.y
    }
    const slide = angleOf(from, dest)
    nightSmoke(ctx.layer, from, 18, 70 * k)
    // bóng mờ ở ô cũ: dáng tím chàm nhạt dần, đòn đánh tới chỉ chạm khói
    emit(ctx.layer, from, {
        color: [VIOLET], kind: "glow", life: [0.7, 0.7], size: [110, 90], alpha: 0.35
    })
    for (let i = 0; i < 6; i++) emit(ctx.layer, offset(from, UP, -30 + i * 14), {
        color: [INDIGO, NIGHT], kind: "blade", additive: false, life: [0.5, 0.7], size: [26, 18], alpha: 0.45, rotation: UP, stretch: 1.2
    })
    // hai sợi khói xoắn bật ra theo hướng lộn (ngắn, không đi hết đường để nhường hiệu ứng đổi chỗ)
    await over(ctx.layer, 0.3, (u) => {
        const p = mix(from, dest, u * 0.45)
        const sw = Math.sin(u * TAU * 2) * 18
        for (const s of [-1, 1]) emit(ctx.layer, offset(p, slide + UP, sw * s), {
            color: [INK, NIGHT], kind: "glow", additive: false, life: [0.35, 0.55], size: [34, 12], alpha: 0.6
        })
        emit(ctx.layer, p, {
            color: [SILVER, VIOLET], kind: "blade", life: [0.08, 0.12], size: [26, 16], alpha: 0.8, rotation: u * TAU * 1.5, stretch: 1.4
        })
    })
    void sparks(ctx.layer, from, 12, [SILVER, WHITE], [160, 360], {
        angle: [slide - 0.5, slide + 0.5], gravity: -300
    })
    // nỏ nạp đòn kế: mũi bạc loé hướng về địch
    const fdir = facing(ctx)
    await gather(ctx.layer, from, 0.2, 90, 60, [SILVER, WHITE])
    star(ctx.layer, offset(from, fdir, 24), 30, [WHITE, SILVER], 0.3, fdir)
    await wait(ctx.layer, 0.25)
})

/**
 * E Kết Án: mũi nỏ nặng (to hẳn đòn thường) lõi vàng trắng, viền đỏ thẫm, đuôi chùm gai sáng như icon. Trúng: chùm gai xoè theo
 * hướng bắn, mảnh đỏ văng ngược, sóng đẩy lùi phía sau mục tiêu.
 */
registerSkillVfx("vayne_e", async (ctx) => {
    const k = power(ctx)
    const to = firstFoe(ctx)
    const dir = angleOf(ctx.from, to)
    // tụ lực: ánh vàng bạc rút vào nỏ
    flash(ctx.layer, ctx.from, GOLD, 90 * k, 0.32, 0.5)
    await gather(ctx.layer, ctx.from, 0.26, 120, 70, [GOLD, SILVER, WHITE])
    // giật nỏ: chớp đầu nòng
    star(ctx.layer, offset(ctx.from, dir, 26), 34, [WHITE, GOLD], 0.18, dir)
    await carry(ctx.layer, (t) => mix(ctx.from, to, t), 0.22, (p, _t, d) => {
        emit(ctx.layer, p, {
            color: [WHITE, GOLD], kind: "blade", life: [0.06, 0.08], size: [44 * k, 38 * k], alpha: 1, rotation: d, stretch: 2.8
        })
        emit(ctx.layer, offset(p, d, -10), {
            color: [CRIMSON], kind: "blade", life: [0.07, 0.1], size: [56 * k, 46 * k], alpha: 0.8, rotation: d, stretch: 2.4
        })
        // chùm gai vàng toả phía sau đầu tên
        for (let i = 0; i < 2; i++) emit(ctx.layer, offset(p, d, -30), {
            color: [GOLD, 0xffc44a, WHITE], kind: "blade", life: [0.14, 0.24], size: [30, 10], alpha: 0.9, rotation: d + rand(-0.35, 0.35),
            stretch: 3, speed: [40, 120], angle: [d + Math.PI - 0.4, d + Math.PI + 0.4]
        })
        emit(ctx.layer, p, {
            color: [GOLD], kind: "glow", life: [0.1, 0.14], size: [70 * k, 30], alpha: 0.6
        })
    }, ease.in)
    // trúng: gai xoè theo hướng bắn, quầng trắng, mảnh đỏ văng ngược
    flash(ctx.layer, to, WHITE, 160 * k, 0.22)
    flash(ctx.layer, to, CRIMSON, 220 * k, 0.4, 0.55)
    for (let i = 0; i < 6; i++) {
        const a = dir + (i - 2.5) * 0.15
        seg(ctx.layer, to, offset(to, a, rand(80, 150) * k), rand(5, 8), [WHITE, GOLD, 0xffc44a], rand(0.22, 0.32))
    }
    void sparks(ctx.layer, to, 18, [CRIMSON, 0xff6a7a, SILVER], [200, 520], {
        angle: [dir + Math.PI - 0.8, dir + Math.PI + 0.8]
    })
    void sparks(ctx.layer, to, 16, [WHITE, GOLD], [300, 700], {
        angle: [dir - 0.35, dir + 0.35], stretch: 3.2
    })
    // sóng đẩy lùi: vòng trắng tại mục tiêu
        ring(ctx.layer, to, WHITE, 30, 140 * k, 0.26, 0.9)
    await wait(ctx.layer, 0.45)
})

/** Điểm trên cánh dơi: xương cánh `rib` toả từ vai, `u` 0..1 tính từ vai; viền cánh lõm giữa hai xương */
function wingPt(at: Pt, side: number, rib: number, u: number, span: number): Pt {
    const a = UP + side * (0.35 + rib * 0.32)
    const len = span * (0.75 + 0.25 * Math.sin(rib * 0.9))
    return {
        x: at.x + Math.cos(a) * len * u * 1.25, y: at.y + 20 + Math.sin(a) * len * u * 0.75
    }
}

/**
 * R Giờ Cuối (tự thân, cả lượt mạnh lên): trăng bạc sau lưng, đôi cánh dơi bóng đêm xoè từ lưng Vayne (xương cánh là nét mực,
 * viền đỏ tím), lông mực bay ra, đôi mắt kính đỏ loé, rồi hào quang khói và lưỡi tím đỏ bốc quanh lá.
 */
registerSkillVfx("vayne_r", async (ctx) => {
    const k = power(ctx)
    const at = ctx.from
    // trăng sau lưng
    flash(ctx.layer, offset(at, UP, 30), 0xfff3c0, 220 * k, 1.6, 0.35)
    ring(ctx.layer, offset(at, UP, 30), WHITE, 120 * k, 190 * k, 1.4, 0.5)
    nightSmoke(ctx.layer, at, 14, 80)
    // cánh dơi mọc dần: từng xương cánh vươn ra
    const span = 150 * k
    await over(ctx.layer, 0.45, (t) => {
        const u = ease.out(t)
        for (const side of [-1, 1]) for (let rib = 0; rib < 5; rib++) {
            const p = wingPt(at, side, rib, u, span)
            emit(ctx.layer, p, {
                color: [INK, NIGHT], kind: "blade", additive: false, life: [0.9, 1.1], size: [22, 16], alpha: 0.85,
                rotation: angleOf(at, p), stretch: 1.6
            })
            if (rib < 4) {
                // màng cánh giữa hai xương, viền lõm
                const q = wingPt(at, side, rib + 0.5, u * 0.8, span)
                emit(ctx.layer, q, {
                    color: [NIGHT, 0x3a2060], kind: "glow", additive: false, life: [0.8, 1], size: [30, 22], alpha: 0.4
                })
            }
        }
    })
    // viền cánh đỏ tím
    for (const side of [-1, 1]) for (let rib = 0; rib < 5; rib++) {
        const tip = wingPt(at, side, rib, 1, span)
        emit(ctx.layer, tip, {
            color: [CRIMSON, VIOLET], kind: "glow", life: [0.7, 0.9], size: [26, 8], alpha: 0.9
        })
        void burst(ctx.layer, tip, 3, {
            color: [INK, NIGHT], kind: "blade", additive: false, life: [0.6, 1], size: [18, 8], alpha: 0.8, speed: [30, 90],
            angle: [UP - 1.2, UP + 1.2], gravity: -60, spin: [-4, 4], stretch: 1.3
        })
    }
    // đôi mắt kính đỏ
    for (const s of [-1, 1]) {
        const eye = {
            x: at.x + s * 14, y: at.y + 18
        }
        seg(ctx.layer, offset(eye, 0, -9), offset(eye, 0, 9), 4, [CRIMSON, 0xff4a5a], 0.7)
        flash(ctx.layer, eye, 0xff3040, 40, 0.7, 0.9)
    }
    await wait(ctx.layer, 0.2)
    // hào quang Giờ Cuối: khói mực và lưỡi tím đỏ bốc lên quanh lá
    await Promise.all([
        stream(ctx.layer, () => ({
            x: at.x + rand(-60, 60), y: at.y - 40
        }), 0.8, 60, {
            color: [INK, NIGHT], kind: "glow", additive: false, life: [0.5, 0.8], size: [30, 60], alpha: 0.5, speed: [60, 120],
            angle: [UP - 0.2, UP + 0.2]
        }),
        stream(ctx.layer, () => ({
            x: at.x + rand(-55, 55), y: at.y - 30
        }), 0.8, 50, {
            color: [CRIMSON, VIOLET, SILVER], kind: "blade", life: [0.3, 0.5], size: [20, 6], alpha: 1, speed: [120, 220],
            angle: [UP - 0.1, UP + 0.1], align: true, stretch: 2.4
        }),
    ])
    await wait(ctx.layer, 0.3)
})

/**
 * Nội tại Thợ Săn Bóng Đêm: mỗi đầu lượt nhận Bóng Đêm. Khói đêm và đốm bạc xoáy vào Vayne, vầng trăng mỏng loé sau đầu, đôi mắt
 * đỏ chớp; mỗi tầng là một chút AD và Tốc Đánh: tia bạc bắn lên.
 */
registerSkillVfx("vayne_p", async (ctx) => {
    const at = ctx.from
    let a = 0
    const orbitPt = (r: number) => () => {
        a += 0.5
        return offset(at, a, r * rand(0.6, 1))
    }
    await Promise.all([
        stream(ctx.layer, orbitPt(110), 0.6, 70, {
            color: [INK, NIGHT], kind: "glow", additive: false, life: [0.35, 0.5], size: [40, 10], alpha: 0.55, speed: [80, 140],
            get angle(): [number, number] { return [a + Math.PI + 0.6, a + Math.PI + 0.6] }
        }),
        stream(ctx.layer, orbitPt(90), 0.6, 80, {
            color: [SILVER, WHITE, VIOLET], kind: "dot", life: [0.3, 0.45], size: [8, 2], alpha: 1, speed: [160, 220],
            get angle(): [number, number] { return [a + Math.PI + 0.5, a + Math.PI + 0.5] }
        }),
    ])
    ring(ctx.layer, offset(at, UP, 20), WHITE, 170, 140, 0.6, 0.6)
    for (const s of [-1, 1]) flash(ctx.layer, {
        x: at.x + s * 13, y: at.y + 18
    }, 0xff3040, 34, 0.45, 1)
    void sparks(ctx.layer, at, 10, [SILVER, WHITE], [220, 420], {
        angle: [UP - 0.25, UP + 0.25]
    })
    await wait(ctx.layer, 0.45)
})
