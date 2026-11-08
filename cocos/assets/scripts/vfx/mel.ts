// VFX Mel Medarda trên Cocos, theo thiết kế bản web (fx_mel.ts): ánh vàng kim ánh trắng như bột vàng sáng, dấu Chói Lọi là ngôi sao
// bốn cánh (icon nội tại), nhật thực đĩa đen viền trắng của chiêu cuối, nền đỏ thẫm. Ô: basic_mel, mel_q, mel_e, mel_r, mel_p.
import {
    Node
} from "cc"
import {
    angleOf, ease, mix, over, rand, type Pt
} from "./particles"
import {
    registerSkillVfx
} from "./registry"
import {
    arc, burst, carry, curve, emit, firstFoe, flash, foeRow, gather, neighbours, offset, power, ring, seg, sparks, star, stream, TAU, UP, wait
} from "./g3_helpers"

const GOLD = 0xffc94d
const PALE = 0xfff1c0
const WHITE = 0xffffff
const AMBER = 0xff9a3a
const CRIMSON = 0x8a1a1a
const DARK = 0x1a0a0e

/** Dấu Chói Lọi: ngôi sao bốn cánh vàng trắng, khung thoi đỏ thẫm (icon nội tại) */
function radiance(layer: Node, at: Pt, s: number, life: number) {
    for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4
        seg(layer, offset(at, a, 26 * s), offset(at, a + Math.PI / 2, 26 * s), 4 * s, [CRIMSON, 0xb03020], life, 0.6, {
            additive: false
        })
    }
    star(layer, at, 30 * s, [WHITE, PALE, GOLD], life, 0, 3.5 * s)
}

/** Tia sáng: đầu hạt đặc trắng, thân bột vàng đọng lại theo đường bay */
const ray = (layer: Node, path: (t: number) => Pt, secs: number, w = 1) => carry(layer, path, secs, (p, _t, dir) => {
    emit(layer, p, {
        color: [WHITE, PALE], kind: "glow", life: [0.05, 0.07], size: [22 * w, 16 * w], alpha: 1
    })
    emit(layer, p, {
        color: [GOLD, PALE], kind: "blade", life: [0.16, 0.26], size: [14 * w, 6 * w], alpha: 0.9, rotation: dir, stretch: 3
    })
    if (Math.random() < 0.6) emit(layer, p, {
        color: [GOLD, AMBER, PALE], kind: "dot", life: [0.3, 0.5], size: [5, 2], alpha: 1, speed: [10, 40], drag: 2
    })
}, ease.inOut)

/** Đánh thường: một tia vàng mảnh, trúng loé sao nhỏ */
registerSkillVfx("basic_mel", async (ctx) => {
    const to = firstFoe(ctx)
    flash(ctx.layer, ctx.from, GOLD, 60, 0.15, 0.7)
    await ray(ctx.layer, (t) => curve(ctx.from, to, 24, t), 0.24, 0.9)
    star(ctx.layer, to, 22, [WHITE, GOLD], 0.2, 0.3)
    void sparks(ctx.layer, to, 6, [GOLD, PALE], [140, 300])
    await wait(ctx.layer, 0.25)
})

/**
 * Q Loạt Bắn Rực Rỡ: bột vàng hút vào tay Mel, một vòng cầu sáng nhỏ quây quanh nàng rồi lần lượt phóng thành những tia vàng cong
 * (như icon: các vệt lửa vàng cuộn vòng) dồn vào mục tiêu, vài tia rẽ sang hai đường kề; mỗi tia trúng là một đốm sao gắn Chói Lọi.
 */
registerSkillVfx("mel_q", async (ctx) => {
    const k = power(ctx)
    const to = firstFoe(ctx)
    const side = neighbours(ctx, to)
    await gather(ctx.layer, ctx.from, 0.26, 120, 80, [GOLD, PALE, WHITE])
    // vòng cầu sáng quanh Mel
    const orbs = 6
    for (let i = 0; i < orbs; i++) flash(ctx.layer, offset(ctx.from, i / orbs * TAU, 56), PALE, 34, 0.3, 0.9)
    await wait(ctx.layer, 0.12)
    const shots: Promise<void>[] = []
    for (let i = 0; i < orbs; i++) {
        const start = offset(ctx.from, i / orbs * TAU, 56)
        // 6 tia vào mục tiêu chính, 1 tia vào mỗi đường kề
        const dst = i === 2 ? side[0] : i === 4 ? side[1] : to
        const jitter = {
            x: dst.x + rand(-18, 18), y: dst.y + rand(-18, 18)
        }
        shots.push((async () => {
            await wait(ctx.layer, i * 0.05)
            await ray(ctx.layer, (t) => curve(start, jitter, rand(-140, 140), t), rand(0.3, 0.38), k)
            flash(ctx.layer, jitter, PALE, 60, 0.16)
            void sparks(ctx.layer, jitter, 4, [GOLD, WHITE], [120, 260])
        })())
    }
    await Promise.all(shots)
    radiance(ctx.layer, offset(to, UP, 50), 0.9 * k, 0.6)
    for (const s of side) radiance(ctx.layer, offset(s, UP, 50), 0.6, 0.5)
    ring(ctx.layer, to, GOLD, 40, 200 * k, 0.35, 0.8)
    await wait(ctx.layer, 0.45)
})

/**
 * E Phản Quang Chiết Kính (Quick, chỉ nối Chuỗi): màn hạt vàng hình lưỡi liềm dựng trước tướng được bảo vệ, đòn địch đập vào thì
 * mặt kính loé trắng, rồi tia sáng phản ngược về kẻ dùng chiêu: cột sáng dội xuống đúng lúc sát thương rơi.
 */
registerSkillVfx("mel_e", async (ctx) => {
    const k = power(ctx)
    const foe = firstFoe(ctx)
    const dir = angleOf(ctx.from, foe)
    const wall = offset(ctx.from, dir, 70)
    // màn kính lưỡi liềm
    await over(ctx.layer, 0.25, (t) => {
        const span = 1.1 * ease.out(t)
        arc(ctx.layer, ctx.from, 76 * k, dir - span, dir + span, 4, [PALE, GOLD], 0.1, 0.9, 10)
    })
    arc(ctx.layer, ctx.from, 76 * k, dir - 1.1, dir + 1.1, 5, [WHITE, PALE, GOLD], 0.6, 1, 18)
    flash(ctx.layer, wall, GOLD, 180 * k, 0.6, 0.45)
    // đòn địch đập vào mặt kính
    await carry(ctx.layer, (t) => mix(foe, wall, t), 0.2, (p, _t, d) => emit(ctx.layer, p, {
        color: [0xd06a6a, CRIMSON], kind: "blade", life: [0.06, 0.08], size: [20, 16], alpha: 0.9, rotation: d, stretch: 2.4
    }), ease.in)
    star(ctx.layer, wall, 40 * k, [WHITE, PALE], 0.22, dir + Math.PI / 4)
    void sparks(ctx.layer, wall, 12, [WHITE, GOLD], [200, 420], {
        angle: [dir - 1.2, dir + 1.2]
    })
    // phản về kẻ dùng
    await ray(ctx.layer, (t) => curve(wall, foe, 30, t), 0.22, 1.3 * k)
    void burst(ctx.layer, offset(foe, UP, 220), 14, {
        color: [WHITE, PALE, GOLD], kind: "blade", life: [0.2, 0.26], size: [30, 10], alpha: 1, speed: [800, 900], angle: [-UP - 0.05, -UP + 0.05],
        align: true, stretch: 3.4, spread: 30
    })
    await wait(ctx.layer, 0.22)
    flash(ctx.layer, foe, WHITE, 160 * k, 0.22)
    radiance(ctx.layer, offset(foe, UP, 50), 0.8, 0.5)
    ring(ctx.layer, foe, GOLD, 40, 200, 0.35, 0.8)
    await wait(ctx.layer, 0.35)
})

/** Cột sáng dội xuống mục tiêu: chùm nét trắng vàng từ trên cao rơi xuống, chạm thì loé */
async function lightPillar(layer: Node, at: Pt, s: number) {
    const top = offset(at, UP, 360)
    void stream(layer, () => ({
        x: top.x + rand(-26, 26) * s, y: top.y
    }), 0.18, 160, {
        color: [WHITE, PALE, GOLD], kind: "blade", life: [0.36, 0.4], size: [30, 14], alpha: 1, speed: [1000, 1000], angle: [-UP, -UP], align: true, stretch: 3.6
    })
    await wait(layer, 0.34)
    seg(layer, top, at, 26 * s, [PALE, GOLD], 0.35, 0.5)
    seg(layer, top, at, 9 * s, [WHITE], 0.3, 1)
    flash(layer, at, WHITE, 200 * s, 0.25)
    ring(layer, at, GOLD, 40, 240 * s, 0.4, 0.9)
}

/**
 * R Nhật Thực Vàng (mọi tướng địch, xét ngưỡng hạ, tiêu hết Chói Lọi): nhật thực tụ phía trên hàng địch: đĩa đen viền trắng, chữ
 * thập ánh sáng xuyên qua (icon R), bột vàng hút vào; rồi mọi mục tiêu cùng nhận cột sáng một nhịp, dấu Chói Lọi vỡ tung.
 */
registerSkillVfx("mel_r", async (ctx) => {
    const k = power(ctx)
    const row = foeRow(ctx)
    const mid = mix(row[0], row[row.length - 1], 0.5)
    const sun = offset(mix(ctx.from, mid, 0.55), UP, 40)
    flash(ctx.layer, ctx.from, GOLD, 120, 0.3, 0.6)
    await ray(ctx.layer, (t) => mix(ctx.from, sun, t), 0.22, 1.2)
    // nhật thực tụ dần
    void gather(ctx.layer, sun, 0.6, 160, 200, [GOLD, PALE, AMBER])
    await over(ctx.layer, 0.6, (t) => {
        emit(ctx.layer, sun, {
            color: [PALE, WHITE], kind: "glow", life: [0.06, 0.08], size: [140 * k * (0.5 + t), 120], alpha: 0.8
        })
        emit(ctx.layer, sun, {
            color: [DARK], kind: "dot", additive: false, life: [0.05, 0.06], size: [70 * k * (0.4 + 0.6 * t), 60], alpha: 1
        })
        emit(ctx.layer, sun, {
            color: [CRIMSON], kind: "glow", life: [0.08, 0.1], size: [260 * k, 200], alpha: 0.3 * t
        })
    })
    // chữ thập ánh sáng xuyên qua đĩa đen
    for (const a of [0, UP]) seg(ctx.layer, offset(sun, a, -160 * k), offset(sun, a, 160 * k), 8, [WHITE, PALE], 0.5)
    emit(ctx.layer, sun, {
        color: [DARK], kind: "dot", additive: false, life: [0.5, 0.5], size: [70 * k, 66 * k], alpha: 1
    })
    ring(ctx.layer, sun, WHITE, 90 * k, 200 * k, 0.45, 0.7)
    await wait(ctx.layer, 0.12)
    await Promise.all(row.map((p) => lightPillar(ctx.layer, p, k)))
    // Chói Lọi tiêu hết: mảnh sao vỡ tung
    for (const p of row) void sparks(ctx.layer, offset(p, UP, 40), 12, [WHITE, GOLD, PALE], [200, 460])
    await wait(ctx.layer, 0.4)
})

/**
 * Nội tại Hào Quang Chói Lọi: bột vàng bám lên mục tiêu thành dấu sao bốn cánh; đủ ngưỡng hạ thì cột sáng trắng vàng dội xuống
 * ngay.
 */
registerSkillVfx("mel_p", async (ctx) => {
    const list = ctx.to.length ? ctx.to : [firstFoe(ctx)]
    await Promise.all(list.map(async (p) => {
        void stream(ctx.layer, () => offset(p, rand(0, TAU), rand(40, 80)), 0.3, 80, {
            color: [GOLD, PALE], kind: "dot", life: [0.25, 0.4], size: [6, 2], alpha: 1, speed: [0, 30]
        })
        radiance(ctx.layer, offset(p, UP, 50), 1, 0.7)
        await wait(ctx.layer, 0.3)
        await lightPillar(ctx.layer, p, 0.8)
        await wait(ctx.layer, 0.3)
    }))
})

