// VFX Darius trên Cocos, chuẩn chung "mọi tướng một bản" (mẫu Vel'Koz, công cụ kit.ts): MÁU NOXUS.
// VFX_RULES §0.1: KHÔNG vẽ cây rìu. Chỉ vẽ DẤU VẾT của rìu: vệt chém nặng đỏ máu / đỏ thẫm, cung rộng, đầu vệt lõi trắng nóng,
// đuôi sẫm mờ dần; máu là giọt đặc có trọng lực + sương đỏ thẫm + vết máu loang trên đất. Vệt vẽ bằng Graphics nhiều lớp (quầng
// sâu, thân, viền sáng, chỉ lõi); ngẫu nhiên có hạt giống để mép vệt, vết máu đứng yên giữa các khung. VFX_RULES §0.1 (thầy
// chốt 2026-11-16): không mảnh tam giác, không đất vụn, không gân / nứt tối gấp khúc; thay bằng quầng máu sáng mềm, tia, bụi sáng.
// Mỗi ô lấy ý từ đâu:
// - basic_darius: nhát rìu chém chéo của Darius gốc: vệt liềm đỏ nặng, máu toé theo hướng chém.
// - darius_p (Xuất Huyết): icon GIỌT MÁU đỏ. Nhịp rỉ máu đầu lượt: giọt máu tụ trên ngực nạn nhân, quầng máu sáng loang ra, giọt
//   phồng rồi vỡ.
// - darius_q (Tàn Sát): icon cung đỏ lớn quét tròn; chiêu gốc là quét rìu trọn vòng quanh Darius. Vệt chém tròn quét một vòng quanh
//   Darius lấy đà, luồng chém lao sang, rồi vệt chém tròn trọn vòng quanh tướng đối diện; máu chảy về Darius thành ánh hồi (lục).
// - darius_e (Bắt Giữ): icon móc kéo, tia lửa vàng ở chỗ móc. Vệt vươn mảnh lao tới tướng đường khác, móc cắm (vệt cong nhỏ, tia
//   lửa), rồi vệt kéo lê từ mục tiêu về đường đối diện Darius; cú đổi chỗ do hiệu ứng đổi chỗ chung diễn.
// - darius_r (Máy Chém Noxus): icon nhát chém trắng thẳng như lưỡi máy chém. Máu Chảy Máu bị rút khỏi nạn nhân lên một điểm đỏ trên
//   cao, rồi một vệt chém hành hình gần như thẳng đứng bổ xuống mục tiêu, lõi trắng; máu phun hai bên, quầng máu sáng loang trên
//   đất, mưa máu.
import {
    Graphics, Node
} from "cc"
import {
    angleOf, burst, ease, emit, lerp, mix, over, rand, type Pt
} from "./particles"
import {
    registerSkillVfx, type VfxCtx
} from "./registry"
import {
    canvas, charge, col, dust, groundWave, impact, orb, seeded, TAU, UP, type Palette
} from "./kit"

const WHITE = 0xfff4f0
const SCARLET = 0xff3a40
const CRIMSON = 0xd80f26
const BLOOD = 0x9a0616
const GORE = 0x5c0410
const CLOT = 0x240206
const HEAL = 0x7dff9a
const HEAL_CORE = 0xe8ffe8

/** Máu: lõi trắng hồng, đỏ tươi, đỏ thẫm, nhấn cam đỏ */
const BLOODP: Palette = {
    core: WHITE, main: CRIMSON, deep: GORE, accent: SCARLET, dust: [SCARLET, CRIMSON, 0xff8a70]
}
/** Tia lửa kim loại khi móc cắm */
const SPARK: Palette = {
    core: 0xfffbe8, main: 0xffc84a, deep: 0x8a4a10, accent: 0xffe9a0, dust: [0xffe9a0, 0xffc84a, 0xffffff]
}
/** Hồi Máu */
const MEND: Palette = {
    core: HEAL_CORE, main: HEAL, deep: 0x0d6a3a, accent: 0xc8ffd0, dust: [HEAL, 0xc8ffd0, 0xffffff]
}

const DOWN = -UP
const at = (p: Pt, dx: number, dy: number): Pt => ({
    x: p.x + dx, y: p.y + dy
})
const mainOf = (ctx: VfxCtx): Pt => ctx.to[0] ?? at(ctx.from, 0, 300)

// ---------- dấu vết nhát chém ----------

/** Ba lớp vẽ: quầng cộng màu phía sau, thân hoà màu thường, viền sáng cộng màu phía trước */
function layers(layer: Node) {
    const back = canvas(layer)
    const body = canvas(layer, false)
    const front = canvas(layer)
    return {
        back: back.g, body: body.g, front: front.g,
        clear: () => { back.g.clear(); body.g.clear(); front.g.clear() },
        done: () => { back.done(); body.done(); front.done() },
    }
}

/**
 * Vệt chém liềm (cung tâm `c`, bán kính `r`, dẹt `sq`) từ góc a0 tới a1; `head` đầu vệt 0..1, `tail` độ dài vệt, `w` bề dày.
 * Mép ngoài sắc răng cưa theo `seed`, mép trong loang; lớp sâu, thân, viền, chỉ lõi 1,4 px.
 */
function crescent(g: Graphics, c: Pt, r: number, a0: number, a1: number, head: number, tail: number, w: number, p: Palette, alpha: number, seed: number, sq = 1) {
    const u0 = Math.max(0, head - tail)
    if (head - u0 < 0.004 || alpha <= 0.01) return
    const rnd = seeded(seed)
    const N = 34
    const outer: Pt[] = [], inner: Pt[] = []
    for (let i = 0; i <= N; i++) {
        const s = i / N
        const a = lerp(a0, a1, lerp(u0, head, s))
        const t = w * Math.pow(s, 0.8) * Math.min(1, (1 - s) * 9 + 0.2) * (0.75 + rnd() * 0.5)
        outer.push({ x: c.x + Math.cos(a) * (r + t * 0.12), y: c.y + Math.sin(a) * (r + t * 0.12) * sq })
        inner.push({ x: c.x + Math.cos(a) * (r - t), y: c.y + Math.sin(a) * (r - t) * sq })
    }
    const band = (f: number, color: number, a: number) => {
        g.fillColor = col(color, a * alpha)
        g.moveTo(outer[0].x, outer[0].y)
        for (const q of outer) g.lineTo(q.x, q.y)
        for (let i = N; i >= 0; i--) g.lineTo(lerp(outer[i].x, inner[i].x, f), lerp(outer[i].y, inner[i].y, f))
        g.close()
        g.fill()
    }
    band(1.35, p.deep, 0.2)
    band(1, p.main, 0.38)
    band(0.6, p.main, 0.62)
    band(0.28, p.accent, 0.85)
    for (const [lw, color, a] of [[3.2, p.accent, 0.55], [1.4, p.core, 1]] as const) {
        g.lineWidth = lw
        g.strokeColor = col(color, a * alpha)
        g.moveTo(outer[0].x, outer[0].y)
        for (const q of outer) g.lineTo(q.x, q.y)
        g.stroke()
    }
}

/**
 * Vệt chém THẲNG a -> b: `head` 0..1 đầu vệt, `tail` độ dài vệt phía sau, `w` bề rộng lớn nhất (ngay sau đầu). Đầu nhọn, thân
 * phình rồi thon về đuôi, mép răng cưa theo `seed`, hơi cong theo `bend` (px). Lớp: quầng sâu, thân, viền, chỉ lõi trắng giữa.
 */
function streak(g: Graphics, a: Pt, b: Pt, head: number, tail: number, w: number, p: Palette, alpha: number, seed: number, bend = 0) {
    const u0 = Math.max(0, head - tail)
    if (head - u0 < 0.004 || alpha <= 0.01) return
    const rnd = seeded(seed)
    const d = angleOf(a, b)
    const nx = -Math.sin(d), ny = Math.cos(d)
    const P = (v: number): Pt => {
        const q = mix(a, b, v)
        const k = Math.sin(v * Math.PI) * bend
        return { x: q.x + nx * k, y: q.y + ny * k }
    }
    const N = 28
    const mid: Pt[] = [], half: number[] = []
    for (let i = 0; i <= N; i++) {
        const s = i / N
        mid.push(P(lerp(u0, head, s)))
        half.push(w * 0.5 * Math.pow(s, 0.9) * Math.min(1, (1 - s) * 7 + 0.15) * (0.75 + rnd() * 0.5))
    }
    const band = (f: number, color: number, al: number) => {
        g.fillColor = col(color, al * alpha)
        g.moveTo(mid[0].x, mid[0].y)
        for (let i = 0; i <= N; i++) g.lineTo(mid[i].x + nx * half[i] * f, mid[i].y + ny * half[i] * f)
        for (let i = N; i >= 0; i--) g.lineTo(mid[i].x - nx * half[i] * f, mid[i].y - ny * half[i] * f)
        g.close()
        g.fill()
    }
    band(1.35, p.deep, 0.2)
    band(1, p.main, 0.38)
    band(0.6, p.main, 0.62)
    band(0.3, p.accent, 0.85)
    const from = Math.floor(N * 0.35)
    for (const [lw, color, al] of [[3.2, p.accent, 0.55], [1.4, p.core, 1]] as const) {
        g.lineWidth = lw
        g.strokeColor = col(color, al * alpha)
        g.moveTo(mid[from].x, mid[from].y)
        for (let i = from; i <= N; i++) g.lineTo(mid[i].x, mid[i].y)
        g.stroke()
    }
}

/** Đầu vệt trắng nóng tại `p` (đốm sáng nhiều lớp) + giọt đỏ rơi lại dọc đường chém */
function hotHead(layer: Node, g: Graphics, p: Pt, r: number, pal: Palette = BLOODP) {
    orb(g, p, pal, r)
    emit(layer, p, { color: [pal.accent, pal.main], kind: "dot", life: [0.15, 0.3], size: [5, 2], alpha: 1, speed: [20, 90], angle: [0, TAU], drag: 2 })
}

/** Máu toé: giọt đặc rơi theo trọng lực (hoà thường), tia đỏ sáng, sương đỏ thẫm; bắn về `ang` ± `spread` */
function bloodSpray(layer: Node, p: Pt, n: number, ang: number, spread: number, speed: [number, number] = [160, 460]) {
    void burst(layer, p, n, {
        color: [BLOOD, CRIMSON, GORE], kind: "dot", additive: false, life: [0.35, 0.7], size: [8, 3], alpha: 1, speed,
        angle: [ang - spread, ang + spread], drag: 0.8, gravity: -1000, spread: 6
    })
    void burst(layer, p, Math.round(n * 0.5), {
        color: [SCARLET, CRIMSON], kind: "blade", life: [0.14, 0.3], size: [22, 4], alpha: 1, speed: [speed[0] * 1.3, speed[1] * 1.3],
        angle: [ang - spread * 0.8, ang + spread * 0.8], drag: 2, gravity: -500, align: true, stretch: 2.6
    })
    void burst(layer, p, 3, {
        color: [GORE, BLOOD], kind: "glow", additive: false, life: [0.5, 0.8], size: [40, 90], alpha: 0.35, speed: [20, 60],
        angle: [ang - spread, ang + spread], drag: 1.5, spread: 10
    })
}

interface Blot { x: number; y: number; r: number }
/** Vết máu loang trên đất quanh `c` (dẹt): vài vũng lớn và nhiều giọt li ti theo hạt giống, lệch về hướng `ang` */
function makeSplat(c: Pt, r: number, ang: number, seed: number): Blot[] {
    const rnd = seeded(seed)
    const out: Blot[] = []
    for (let i = 0; i < 26; i++) {
        const a = ang + (rnd() - 0.5) * (i < 6 ? 1.6 : 3)
        const d = r * Math.pow(rnd(), i < 6 ? 1.5 : 0.7)
        out.push({ x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d * 0.4, r: i < 6 ? r * (0.12 + rnd() * 0.12) : 1 + rnd() * 3 })
    }
    return out
}
function drawSplat(g: Graphics, b: Blot[], grow: number, alpha: number) {
    for (const [k, c, a] of [[1, CLOT, 0.55], [0.7, BLOOD, 0.6]] as const) {
        g.fillColor = col(c, a * alpha)
        for (const q of b) { g.ellipse(q.x, q.y, Math.max(0.5, q.r * k * grow), Math.max(0.4, q.r * k * grow * 0.55)); }
        g.fill()
    }
}

/**
 * Quầng máu sáng mềm loang quanh `c` (vẽ lên lớp CỘNG SÁNG, dẹt `sq`): vài elip đồng tâm đỏ thẫm -> đỏ tươi -> lõi cam hồng, không
 * viền tối, không đường gấp khúc. Thay gân / nứt tối cũ (VFX_RULES §0.1). `heat` 0..1+ độ nóng lõi, `alpha` độ đậm chung.
 */
function glowPool(g: Graphics, c: Pt, r: number, heat: number, alpha: number, sq: number) {
    if (alpha <= 0.01 || r <= 0.5) return
    const rings: [number, number, number][] = [[1, CRIMSON, 0.1], [0.72, CRIMSON, 0.16], [0.48, SCARLET, 0.26 * heat], [0.24, 0xff8a70, 0.36 * heat]]
    for (const [k, c0, a] of rings) {
        g.fillColor = col(c0, Math.min(1, a) * alpha)
        g.ellipse(c.x, c.y, r * k, r * k * sq)
        g.fill()
    }
}

/** Dòng máu chảy từ nạn nhân về Darius, tới nơi hoá ánh hồi lục (hồi Máu: màu hồi, hạt bay lên, không mảnh) */
async function bloodToHeal(layer: Node, from: Pt, me: Pt, secs: number) {
    const c = canvas(layer)
    const seeds = Array.from({ length: 7 }, () => ({ off: rand(-0.25, 0.1), bend: rand(-60, 60), w: rand(2, 4) }))
    await over(layer, secs, (t) => {
        c.g.clear()
        for (const s of seeds) {
            const u = Math.max(0, Math.min(1, (t - s.off - 0.1) / 0.75))
            if (u <= 0) continue
            const head = ease.inOut(u)
            const tail = Math.max(0, head - 0.3)
            const path = (v: number): Pt => {
                const q = mix(from, me, v)
                return { x: q.x + Math.sin(v * Math.PI) * s.bend, y: q.y }
            }
            for (const [w, cc, a] of [[s.w * 2.4, GORE, 0.3], [s.w, SCARLET, 0.8], [1, WHITE, 0.7]] as const) {
                c.g.lineWidth = w
                c.g.strokeColor = col(cc, a * (1 - u * 0.4))
                for (let i = 0; i <= 8; i++) {
                    const q = path(lerp(tail, head, i / 8))
                    if (i === 0) c.g.moveTo(q.x, q.y)
                    else c.g.lineTo(q.x, q.y)
                }
                c.g.stroke()
            }
        }
    })
    c.done()
    emit(layer, me, { color: [HEAL_CORE], kind: "glow", life: [0.25, 0.25], size: [50, 160], alpha: 0.8 })
    emit(layer, me, { color: [HEAL], kind: "glow", life: [0.45, 0.45], size: [100, 200], alpha: 0.45 })
    void dust(layer, at(me, 0, -20), MEND, 22, 44)
}

// ---------- Đánh thường ----------

/**
 * Đánh thường: một nhát chém chéo trên mục tiêu: vệt liềm đỏ nặng, đầu vệt trắng nóng (0,1 s); chạm: loé đỏ, máu toé theo hướng
 * chém, vết máu nhỏ dưới chân; vệt tan chạy nền.
 */
registerSkillVfx("basic_darius", async (ctx) => {
    const to = mainOf(ctx)
    const seed = rand(1, 999)
    const c = at(to, -45, 45)
    const R = 64
    const a0 = 0.15, a1 = -1.75
    const arcAt = (u: number): Pt => {
        const a = lerp(a0, a1, u)
        return { x: c.x + Math.cos(a) * R, y: c.y + Math.sin(a) * R }
    }
    const g = canvas(ctx.layer)
    await over(ctx.layer, 0.1, (t) => {
        const u = ease.out(t)
        g.g.clear()
        crescent(g.g, c, R, a0, a1, u, 0.7, 15, BLOODP, 1, seed + 3)
        hotHead(ctx.layer, g.g, arcAt(u), 8)
    })
    impact(ctx.layer, to, BLOODP, 0.55, ctx.from)
    bloodSpray(ctx.layer, to, 12, Math.PI + 0.9, 0.6)
    const splat = canvas(ctx.layer, false)
    const blots = makeSplat(at(to, -10, -40), 34, Math.PI, seed)
    void over(ctx.layer, 0.5, (t) => {
        g.g.clear()
        if (t < 0.4) crescent(g.g, c, R + t * 10, a0, a1, 1, 0.7 * (1 - t), 15 * (1 - t), BLOODP, 1 - t / 0.4, seed + 3)
        splat.g.clear()
        drawSplat(splat.g, blots, ease.out(Math.min(1, t * 4)), 1 - ease.in(t))
    }).then(() => { g.done(); splat.done() })
})

// ---------- P Xuất Huyết ----------

/**
 * P (nhịp rỉ máu đầu lượt): giọt máu (đúng icon) tụ trên ngực nạn nhân, quầng máu sáng mềm loang ra quanh nó, giọt phồng, rung rồi
 * VỠ: máu toé vòng ra và rơi theo trọng lực, sương đỏ, vết máu loang dưới chân; quầng nguội tắt chạy nền.
 */
registerSkillVfx("darius_p", async (ctx) => {
    const to = mainOf(ctx)
    const seed = rand(1, 999)
    const ctr = at(to, 0, 10)
    const L = layers(ctx.layer)
    const drop = (r: number, sq: number, a: number) => {
        // giọt: đầu nhọn trên, bụng tròn dưới
        const tipY = ctr.y + r * 1.7 * sq, x = ctr.x
        const body = (g: Graphics, k: number, c: number, al: number) => {
            g.fillColor = col(c, al * a)
            g.moveTo(x, ctr.y + (tipY - ctr.y) * (0.6 + 0.4 * k))
            g.bezierCurveTo(x + r * 0.35 * k, ctr.y + r * 0.9 * sq, x + r * k, ctr.y + r * 0.25, x + r * k, ctr.y - r * 0.15)
            g.bezierCurveTo(x + r * k, ctr.y - r * 0.8 * k, x - r * k, ctr.y - r * 0.8 * k, x - r * k, ctr.y - r * 0.15)
            g.bezierCurveTo(x - r * k, ctr.y + r * 0.25, x - r * 0.35 * k, ctr.y + r * 0.9 * sq, x, ctr.y + (tipY - ctr.y) * (0.6 + 0.4 * k))
            g.close()
            g.fill()
        }
        L.back.fillColor = col(CRIMSON, 0.22 * a)
        L.back.circle(ctr.x, ctr.y, r * 2.2)
        L.back.fill()
        body(L.body, 1, GORE, 1)
        body(L.body, 0.82, BLOOD, 1)
        body(L.front, 0.6, CRIMSON, 0.55)
        // ánh hắt và vệt bóng trên trái
        L.front.lineWidth = Math.max(1, r * 0.12)
        L.front.strokeColor = col(WHITE, 0.85 * a)
        L.front.moveTo(x + Math.cos(Math.PI * 0.62) * r * 0.62, ctr.y - r * 0.12 + Math.sin(Math.PI * 0.62) * r * 0.62)
        L.front.arc(x, ctr.y - r * 0.12, r * 0.62, Math.PI * 0.62, Math.PI * 0.95, false)
        L.front.stroke()
        L.front.fillColor = col(WHITE, 0.9 * a)
        L.front.circle(x - r * 0.42, ctr.y + r * 0.3, Math.max(1, r * 0.09))
        L.front.fill()
    }
    emit(ctx.layer, ctr, { color: [GORE], kind: "glow", additive: false, life: [0.6, 0.6], size: [60, 140], alpha: 0.35 })
    // tụ: giọt lớn dần, quầng máu sáng loang ra
    await over(ctx.layer, 0.36, (t) => {
        L.clear()
        glowPool(L.back, ctr, 62 * ease.out(t), 0.4 + 0.6 * t, 1, 0.85)
        drop(lerp(5, 22, ease.out(t)), 1, Math.min(1, t * 4))
        if (Math.random() < 0.5) emit(ctx.layer, at(ctr, rand(-60, 60), rand(-50, 50)), {
            color: [SCARLET, CRIMSON], kind: "dot", life: [0.16, 0.2], size: [5, 2], alpha: 1, speed: [200, 260], angle: [0, 0]
        })
    })
    // phồng căng, rung
    await over(ctx.layer, 0.1, (t) => {
        L.clear()
        glowPool(L.back, ctr, 62, 1.2, 1, 0.85)
        drop(22 + 5 * t + Math.sin(t * 60) * 1.2, 1 - 0.18 * t, 1)
    })
    ctx.onBeat?.(0)
    impact(ctx.layer, ctr, BLOODP, 0.8)
    bloodSpray(ctx.layer, ctr, 16, UP, 1.4, [140, 380])
    bloodSpray(ctx.layer, ctr, 8, DOWN, 1, [60, 180])
    const splat = canvas(ctx.layer, false)
    const blots = makeSplat(at(to, 0, -42), 46, DOWN, seed)
    // tàn: quầng nguội tắt, vết máu loang rồi khô
    void over(ctx.layer, 0.55, (t) => {
        L.clear()
        glowPool(L.back, ctr, 62 + 10 * t, 1 - t, 1 - ease.in(t), 0.85)
        splat.g.clear()
        drawSplat(splat.g, blots, ease.out(Math.min(1, t * 3)), 1 - ease.in(t))
        if (Math.random() < 0.4) emit(ctx.layer, at(ctr, rand(-20, 20), rand(-10, 10)), {
            color: [BLOOD, GORE], kind: "dot", additive: false, life: [0.4, 0.6], size: [5, 3], alpha: 1, speed: [10, 40], angle: [DOWN, DOWN], gravity: -500
        })
    }).then(() => { L.done(); splat.done() })
})

// ---------- Q Tàn Sát ----------

/**
 * Q (không vẽ rìu): vệt chém tròn đỏ thẫm quét trọn một vòng quanh Darius lấy đà (vòng dẹt theo phối cảnh, máu bị hút vào); hết
 * vòng, một luồng chém đỏ lao sang tướng đối diện; tại đó vệt chém tròn nặng quét trọn một vòng quanh mục tiêu, đầu vệt trắng nóng.
 * Hết vòng là chạm: loé đỏ, máu toé vòng ngoài, sóng máu loang, vết máu; máu chảy về Darius thành ánh hồi lục.
 */
registerSkillVfx("darius_q", async (ctx) => {
    const me = ctx.from
    const to = mainOf(ctx)
    const seed = rand(1, 999)
    const g = canvas(ctx.layer)
    const SQ = 0.5
    // vòng lấy đà quanh Darius (đóng vai tụ, ≤ 0,25 s)
    const hub = at(me, 0, -8)
    const r0 = 74, b0 = Math.PI * 0.85, b1 = b0 - TAU
    emit(ctx.layer, me, { color: [GORE], kind: "glow", life: [0.3, 0.3], size: [80, 180], alpha: 0.6 })
    await over(ctx.layer, 0.2, (t) => {
        const u = ease.inOut(t)
        g.g.clear()
        crescent(g.g, hub, r0, b0, b1, u, 0.55, 20, BLOODP, Math.min(1, t * 4), seed + 1, SQ)
        const a = lerp(b0, b1, u)
        const src = { x: hub.x + Math.cos(a) * r0 * 1.7, y: hub.y + Math.sin(a) * r0 * 1.7 * SQ }
        emit(ctx.layer, src, { color: [SCARLET, CRIMSON], kind: "dot", life: [0.14, 0.18], size: [6, 2], alpha: 1, speed: [r0 * 4, r0 * 4.6], angle: [angleOf(src, hub), angleOf(src, hub)] })
    })
    // luồng chém lao sang tướng đối diện
    await over(ctx.layer, 0.1, (t) => {
        const u = ease.in(t)
        g.g.clear()
        crescent(g.g, hub, r0, b0, b1, 1, 0.55 * (1 - t), 20 * (1 - t), BLOODP, 1 - t, seed + 1, SQ)
        streak(g.g, at(me, 0, 20), to, u, 0.6, 18, BLOODP, 1, seed + 2)
        hotHead(ctx.layer, g.g, mix(at(me, 0, 20), to, u), 9)
    })
    // vệt chém tròn trọn vòng quanh mục tiêu
    const R = 78
    const a0 = Math.PI * 0.85, a1 = a0 - TAU * 1.02
    await over(ctx.layer, 0.24, (t) => {
        const u = ease.inOut(t)
        const a = lerp(a0, a1, u)
        g.g.clear()
        streak(g.g, at(me, 0, 20), to, 1, 0.6 * (1 - t), 18 * (1 - t), BLOODP, 1 - t, seed + 2)
        crescent(g.g, to, R, a0, a1, u, 0.62, 28, BLOODP, 1, seed, SQ)
        const head = { x: to.x + Math.cos(a) * R, y: to.y + Math.sin(a) * R * SQ }
        hotHead(ctx.layer, g.g, head, 11)
    })
    ctx.onBeat?.(0)
    impact(ctx.layer, to, BLOODP, 1.1, me)
    for (let i = 0; i < 6; i++) bloodSpray(ctx.layer, to, 4, i / 6 * TAU + rand(-0.3, 0.3), 0.35, [200, 440])
    groundWave(ctx.layer, at(to, 0, -30), BLOODP, 110, 0.4, 0.42)
    const splat = canvas(ctx.layer, false)
    const blots = makeSplat(at(to, 0, -36), 70, rand(0, TAU), seed)
    void over(ctx.layer, 0.5, (t) => {
        g.g.clear()
        crescent(g.g, to, R + t * 10, a0, a1, 1, 0.62 * (1 - t * 0.5), 28 * (1 - t * 0.6), BLOODP, 1 - t, seed, SQ)
        splat.g.clear()
        drawSplat(splat.g, blots, ease.out(Math.min(1, t * 3)), 1 - ease.in(t))
    }).then(() => { g.done(); splat.done() })
    void bloodToHeal(ctx.layer, to, me, 0.5)
})

// ---------- E Bắt Giữ ----------

/**
 * E (không vẽ rìu): một vệt vươn mảnh đỏ thẫm lao từ tay Darius tới tướng ở đường khác, đầu vệt sáng. Móc cắm: tia lửa vàng (icon),
 * máu toé, loé đỏ, một vệt cong nhỏ quặp quanh mục tiêu như móc. Rồi vệt kéo lê từ mục tiêu về đường đối diện Darius (đường engine
 * kéo tới), bụi và giọt máu rơi theo. Cú đổi chỗ do hiệu ứng đổi chỗ chung diễn.
 */
registerSkillVfx("darius_e", async (ctx) => {
    const me = ctx.from
    const to = mainOf(ctx)
    const seed = rand(1, 999)
    const hand = at(me, 24, 30)
    const dir = angleOf(hand, to)
    const hook = at(to, -Math.cos(dir) * 10, -Math.sin(dir) * 10)
    const g = canvas(ctx.layer)
    emit(ctx.layer, hand, { color: [CRIMSON], kind: "glow", life: [0.2, 0.2], size: [30, 90], alpha: 0.8 })
    await over(ctx.layer, 0.2, (t) => {
        const u = ease.in(t)
        g.g.clear()
        streak(g.g, hand, hook, u, 0.6, 12, BLOODP, 1, seed)
        const head = mix(hand, hook, u)
        hotHead(ctx.layer, g.g, head, 8, SPARK)
    })
    ctx.onBeat?.(0)
    impact(ctx.layer, to, SPARK, 0.7, me)
    impact(ctx.layer, to, BLOODP, 0.6, me)
    bloodSpray(ctx.layer, to, 10, dir, 0.6)
    // đích kéo: đường đối diện Darius (cùng x với Darius, trên hàng của mục tiêu)
    const dest = Math.abs(to.x - me.x) > 20 ? { x: me.x, y: to.y } : at(to, -Math.cos(dir) * 40, -Math.sin(dir) * 40)
    const pull = angleOf(to, dest)
    // dư âm chạy nền: móc quặp, vệt vươn tan, vệt kéo lê về đường đối diện
    void over(ctx.layer, 0.32, (t) => {
        g.g.clear()
        streak(g.g, hand, hook, 1, 0.6 * (1 - t), 12 * (1 - t), BLOODP, 1 - ease.in(t), seed)
        crescent(g.g, to, 30, dir - Math.PI * 0.6, dir + Math.PI * 0.6, ease.out(Math.min(1, t * 3)), 0.8, 10, BLOODP, 1 - ease.in(t), seed + 4, 0.8)
        const u = ease.out(t)
        streak(g.g, to, dest, u, 1, 22, BLOODP, 1 - ease.in(t), seed + 9, 6)
        const head = mix(to, dest, u)
        if (t < 0.7) {
            // kéo lê: tia lửa mảnh toé ngược hướng kéo (thay đất vụn, VFX_RULES §0.1)
            emit(ctx.layer, at(head, 0, -30), { color: SPARK.dust!, kind: "blade", life: [0.12, 0.24], size: [12, 2], alpha: 0.9, speed: [120, 260], angle: [pull + Math.PI - 0.6, pull + Math.PI + 0.6], drag: 1.6, gravity: -500, align: true, stretch: 2.4 })
            emit(ctx.layer, head, { color: [BLOOD, CRIMSON], kind: "dot", additive: false, life: [0.3, 0.5], size: [5, 2], alpha: 1, speed: [10, 50], angle: [DOWN, DOWN], gravity: -700 })
        }
    }).then(g.done)
})

// ---------- R Máy Chém Noxus ----------

/**
 * R (không vẽ rìu): hào quang máu bốc quanh Darius; mọi Chảy Máu bị rút khỏi nạn nhân thành dòng máu bay lên một điểm đỏ trên cao
 * trên mục tiêu, phồng dần. Rồi một vệt chém hành hình gần thẳng đứng bổ từ điểm đó xuống mục tiêu (0,13 s, như lưỡi máy chém):
 * đỏ thẫm, lõi trắng, đầu vệt trắng nóng. Chạm: loé trắng đỏ cực mạnh (sát thương chuẩn), máu phun hai bên, sóng máu sáng loang
 * trên đất (không mảnh vỡ, không nứt tối). Dư âm chạy nền: vệt rút vào đất, quầng máu sáng mềm trên đất nguội dần, sương đỏ, mưa
 * máu, vết máu lớn.
 */
registerSkillVfx("darius_r", async (ctx) => {
    const me = ctx.from
    const to = mainOf(ctx)
    const seed = rand(1, 999)
    const top = at(to, 34, 170)
    const land = at(to, -12, -40)
    const W = 44
    const g = canvas(ctx.layer)
    void charge(ctx.layer, at(me, 0, 30), BLOODP, 0.26, 48)
    // máu Chảy Máu bị rút lên điểm đỏ trên cao
    await over(ctx.layer, 0.26, (t) => {
        g.g.clear()
        orb(g.g, top, BLOODP, lerp(6, 22, ease.out(t)), Math.min(1, t * 3))
        for (let i = 0; i < 2; i++) {
            const src = at(to, rand(-34, 34), rand(-30, 40))
            const d = Math.hypot(top.x - src.x, top.y - src.y)
            emit(ctx.layer, src, {
                color: [SCARLET, CRIMSON, BLOOD], kind: "dot", life: [0.18, 0.24], size: [7, 2], alpha: 1,
                speed: [d * 4.4, d * 4.6], angle: [angleOf(src, top), angleOf(src, top)]
            })
        }
        emit(ctx.layer, top, { color: [CRIMSON], kind: "glow", life: [0.08, 0.1], size: [70 * t, 40 * t], alpha: 0.6 })
    })
    // vệt chém hành hình bổ xuống
    await over(ctx.layer, 0.13, (t) => {
        const u = ease.in(t)
        g.g.clear()
        orb(g.g, top, BLOODP, 22 * (1 - u))
        streak(g.g, top, land, u, 0.95, W, BLOODP, 1, seed, 8)
        hotHead(ctx.layer, g.g, mix(top, land, u), 18)
    })
    ctx.onBeat?.(0)
    impact(ctx.layer, to, BLOODP, 1.6, top)
    emit(ctx.layer, to, { color: [WHITE], kind: "glow", life: [0.16, 0.16], size: [220, 70], alpha: 1 })
    bloodSpray(ctx.layer, to, 18, Math.PI - 0.2, 0.55, [220, 560])
    bloodSpray(ctx.layer, to, 18, 0.2, 0.55, [220, 560])
    bloodSpray(ctx.layer, to, 10, UP, 0.4, [300, 620])
    // thầy chốt 2026-11-16: bỏ mảnh tam giác và nứt tối (trông "hình học"); chỉ còn ánh sáng, máu, bụi sáng
    groundWave(ctx.layer, at(to, 0, -36), BLOODP, 160, 0.5, 0.4)
    void dust(ctx.layer, to, BLOODP, 30, 50)
    const pool = canvas(ctx.layer)
    const splat = canvas(ctx.layer, false)
    const blots = makeSplat(at(to, 0, -40), 96, rand(0, TAU), seed + 5)
    // dư âm chạy nền
    void over(ctx.layer, 0.6, (t) => {
        g.g.clear()
        if (t < 0.5) streak(g.g, top, land, 1, 0.95 * (1 - ease.out(t * 2)), W * (1 - t), BLOODP, 1 - t * 2, seed, 8)
        pool.g.clear()
        glowPool(pool.g, at(to, -10, -38), 140 * ease.out(Math.min(1, t * 2.5)), 1 - t, 1 - ease.in(t), 0.42)
        if (t < 0.4) emit(ctx.layer, mix(top, land, rand(0.3, 0.9)), { color: [GORE, BLOOD], kind: "glow", additive: false, life: [0.4, 0.7], size: [30, 70], alpha: 0.4, speed: [10, 40], angle: [UP - 1, UP + 1] })
        if (Math.random() < 0.6) emit(ctx.layer, at(to, rand(-90, 90), rand(60, 110)), {
            color: [BLOOD, CRIMSON], kind: "dot", additive: false, life: [0.3, 0.45], size: [5, 3], alpha: 0.9, speed: [120, 200], angle: [DOWN, DOWN], gravity: -600
        })
        splat.g.clear()
        drawSplat(splat.g, blots, ease.out(Math.min(1, t * 2.5)), 1 - ease.in(t))
    }).then(() => { g.done(); pool.done(); splat.done() })
})
