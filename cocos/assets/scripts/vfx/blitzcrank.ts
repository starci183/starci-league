// VFX Blitzcrank trên Cocos, chuẩn chung "mọi tướng một bản" (mẫu Vel'Koz, công cụ kit.ts): ROBOT HƠI NƯỚC. Nắm đấm đồng thau
// có đốt ngón, rãnh tối, mép sáng; xích thép ánh điện lục lam (đúng icon Q); hơi nước trắng đục; tia lửa hàn; sét lam lõi trắng
// gãy khúc có nhánh (đổi hạt giống vài lần mỗi giây để nhấp nháy như sét thật, không rung từng khung).
// Mỗi ô lấy ý từ đâu:
// - basic_blitzcrank: cú đấm đồng thau của Blitzcrank gốc: nắm đấm nện xuống, tia lửa, hơi xì, chớp điện nhỏ.
// - blitzcrank_p (Thu Gom): icon Blitzcrank trong quả cầu khiên điện lam (Mana Barrier). Phụ tùng (bánh răng, tấm đinh tán) bay về
//   khoá vào thân, rồi vỏ cầu điện lam loé quanh Blitzcrank (cộng Giáp, Kháng phép): dáng cường hoá.
// - blitzcrank_q (Bàn Tay Hoả Tiễn): icon bàn tay vàng phóng đi kéo xích lục lam. Van vai xì hơi, nắm đấm phụt lửa bay kéo xích tới
//   mục tiêu, chụp (tia lửa + điện), cướp 1 lá rồi giật xích về.
// - blitzcrank_e (Tay Giật): icon nắm đấm vàng bọc sét tím lam. Điện tụ quanh nắm đấm, đấm móc ngược vào kẻ đang dùng chiêu, phép
//   của nó (vòng ấn tím) bị bóp vỡ thành khói đen; Choáng dùng VFX khống chế chung (stunStars).
// - blitzcrank_r (Trường Điện Từ): icon thân robot toé sét lam. Sét bò quanh thân, rồi một nhịp sét toả từ Blitzcrank quật vào MỌI
//   tướng địch cùng lúc, sét nối dọc hàng; Câm Lặng là trạng thái: dùng icon trên lá.
import {
    Graphics, Node
} from "cc"
import {
    angleOf, burst, ease, emit, mix, over, rand, type Pt
} from "./particles"
import {
    registerSkillVfx, type VfxCtx
} from "./registry"
import {
    canvas, charge, col, dust, groundWave, impact, orb, seeded, softBeam, strip, TAU, UP, type Palette
} from "./kit"
import {
    allFoes, stunStars
} from "./g1_helpers"

const BRASS = 0xe8a93a
const BRASS_DARK = 0x7a4c14
const BRASS_LIT = 0xffe9a0
const STEEL = 0x7d8794
const STEEL_DARK = 0x3a4048
const STEAM = 0xf2f6fa
const STEAM_DIM = 0xa9b9c8
const ARC = 0x56cfff
const ARC_DEEP = 0x1a4ac0
const ARC_CORE = 0xf0fcff
const TEAL = 0x3ae6d8
const SPELL = 0xb36bff
const SPELL_DEEP = 0x4a1a8a
const SOOT = 0x24262c
const CARD = 0x2c3550
const GOLD = 0xffd36a

/** Điện lam: lõi trắng, lam, sâu, nhạt */
const ELEC: Palette = {
    core: ARC_CORE, main: ARC, deep: ARC_DEEP, accent: 0xb8f6ff, dust: [ARC_CORE, ARC, 0xb8f6ff]
}
/** Đồng thau: tia lửa hàn */
const BRASSP: Palette = {
    core: 0xfffbe8, main: BRASS, deep: 0x6a4210, accent: GOLD, dust: [GOLD, BRASS_LIT, STEAM]
}
/** Lửa tên lửa */
const FIRE: Palette = {
    core: 0xfff4d0, main: 0xff8a2a, deep: 0x7a2a08, accent: 0xffc84a, dust: [0xffc84a, 0xff8a2a, STEAM_DIM]
}
/** Điện tím của Tay Giật (icon) */
const SHOCK: Palette = {
    core: ARC_CORE, main: 0x9a7aff, deep: SPELL_DEEP, accent: 0xc8b8ff, dust: [0xc8b8ff, ARC, ARC_CORE]
}

const DOWN = -UP
const at = (p: Pt, dx: number, dy: number): Pt => ({
    x: p.x + dx, y: p.y + dy
})
const mainOf = (ctx: VfxCtx): Pt => ctx.to[0] ?? at(ctx.from, 0, 300)

// ---------- hình khối ----------

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
type Layers = ReturnType<typeof layers>

/**
 * Nắm đấm đồng thau nhìn nghiêng, đốt ngón hướng `dir`, tâm khối nắm tại `p`, cỡ `s`: cổ tay thép có piston, khối nắm đồng thau,
 * bốn đốt ngón tách bằng rãnh tối, ngón cái, mép trên hứng sáng, đinh tán. `glow` 0..1: quầng sau nắm.
 */
function fist(L: Layers, p: Pt, dir: number, s: number, alpha: number, glow = 0, glowCol = GOLD) {
    if (alpha <= 0.01) return
    const dx = Math.cos(dir), dy = Math.sin(dir)
    const nx = -dy, ny = dx
    const P = (u: number, v: number): Pt => ({ x: p.x + dx * s * u + nx * s * v, y: p.y + dy * s * u + ny * s * v })
    const poly = (g: Graphics, uv: [number, number][], c: number, a: number) => {
        g.fillColor = col(c, a * alpha)
        const q0 = P(...uv[0])
        g.moveTo(q0.x, q0.y)
        for (const [u, v] of uv) { const q = P(u, v); g.lineTo(q.x, q.y) }
        g.close()
        g.fill()
    }
    if (glow > 0.01) {
        L.back.fillColor = col(glowCol, 0.25 * glow * alpha)
        L.back.circle(p.x, p.y, s * 0.9)
        L.back.fill()
        L.back.fillColor = col(glowCol, 0.3 * glow * alpha)
        L.back.circle(p.x, p.y, s * 0.55)
        L.back.fill()
    }
    // cổ tay thép, piston
    strip(L.body, P(-0.95, 0), P(-0.35, 0), s * 0.34, col(STEEL_DARK, alpha))
    strip(L.body, P(-0.9, 0.08), P(-0.4, 0.08), s * 0.07, col(STEEL, alpha))
    poly(L.body, [[-0.42, 0.26], [-0.3, 0.3], [-0.3, -0.3], [-0.42, -0.26]], STEEL, 1)
    // khối nắm và đốt ngón
    poly(L.body, [[-0.32, 0.3], [0.3, 0.36], [0.46, 0.3], [0.5, -0.3], [0.3, -0.36], [-0.32, -0.3]], BRASS, 1)
    poly(L.body, [[-0.32, -0.05], [0.48, -0.05], [0.5, -0.3], [0.3, -0.36], [-0.32, -0.3]], BRASS_DARK, 0.55)
    L.body.fillColor = col(BRASS, alpha)
    for (const v of [-0.24, -0.08, 0.08, 0.24]) { const q = P(0.48, v); L.body.circle(q.x, q.y, s * 0.085) }
    L.body.fill()
    for (const v of [-0.16, 0, 0.16]) strip(L.body, P(0.16, v), P(0.5, v), 1.6, col(BRASS_DARK, alpha))
    // ngón cái
    poly(L.body, [[-0.05, 0.3], [0.22, 0.44], [0.3, 0.38], [0.1, 0.28]], BRASS_DARK, 1)
    // mép sáng và đinh tán
    for (const [lw, c, a] of [[3, GOLD, 0.4], [1.1, BRASS_LIT, 1]] as const) {
        L.front.lineWidth = lw
        L.front.strokeColor = col(c, a * alpha)
        const a0 = P(-0.3, 0.3), a1 = P(0.3, 0.36), a2 = P(0.46, 0.3)
        L.front.moveTo(a0.x, a0.y)
        L.front.lineTo(a1.x, a1.y)
        L.front.lineTo(a2.x, a2.y)
        L.front.stroke()
    }
    L.front.fillColor = col(BRASS_LIT, alpha)
    for (const [u, v] of [[-0.2, 0.18], [-0.2, -0.18], [0.05, 0.18], [0.05, -0.18]] as const) { const q = P(u, v); L.front.circle(q.x, q.y, 1.4) }
    L.front.fill()
}

/** Xích thép theo đoạn a..b: mắt dẹt và mắt nghiêng xen kẽ, thân thép, ánh điện lục lam dọc mép (icon) */
function chain(L: Layers, a: Pt, b: Pt, alpha: number, shimmer: number) {
    const d = angleOf(a, b)
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    const link = 11
    const n = Math.max(1, Math.round(len / link))
    const hx = Math.cos(d) * link * 0.62, hy = Math.sin(d) * link * 0.62
    strip(L.back, a, b, 12, col(TEAL, 0.14 * alpha))
    for (let i = 0; i < n; i++) {
        const m = mix(a, b, (i + 0.5) / n)
        if (i % 2 === 0) {
            L.body.lineWidth = 2.6
            L.body.strokeColor = col(STEEL, alpha)
            for (let k = 0; k <= 12; k++) {
                const s = k / 12 * TAU
                const q = { x: m.x - Math.cos(s) * hx - Math.sin(s) * 3.6 * Math.sin(d), y: m.y - Math.cos(s) * hy + Math.sin(s) * 3.6 * Math.cos(d) }
                if (k === 0) L.body.moveTo(q.x, q.y)
                else L.body.lineTo(q.x, q.y)
            }
            L.body.stroke()
        } else strip(L.body, { x: m.x - hx, y: m.y - hy }, { x: m.x + hx, y: m.y + hy }, 3.4, col(STEEL_DARK, alpha))
    }
    const lit = Math.sin(shimmer) * 0.3 + 0.7
    strip(L.front, a, b, 1, col(TEAL, 0.7 * lit * alpha))
}

/** Sét gãy khúc a..b có nhánh: điểm giữa dịch ngẫu nhiên theo seed (đổi seed vài lần/giây để nhấp nháy), ba lớp quầng/thân/lõi */
function lightning(g: Graphics, a: Pt, b: Pt, seed: number, p: Palette, alpha: number, amp = 0.18, branches = 2) {
    if (alpha <= 0.01) return
    const rnd = seeded(seed)
    const split = (pts: Pt[], depth: number, k: number): Pt[] => {
        if (depth === 0) return pts
        const out: Pt[] = [pts[0]]
        for (let i = 1; i < pts.length; i++) {
            const p0 = pts[i - 1], p1 = pts[i]
            const len = Math.hypot(p1.x - p0.x, p1.y - p0.y)
            const d = angleOf(p0, p1)
            const off = (rnd() - 0.5) * 2 * len * k
            out.push({ x: (p0.x + p1.x) / 2 - Math.sin(d) * off, y: (p0.y + p1.y) / 2 + Math.cos(d) * off }, p1)
        }
        return split(out, depth - 1, k * 0.85)
    }
    const main = split([a, b], 5, amp)
    const paths = [main]
    for (let i = 0; i < branches; i++) {
        const from = main[Math.floor(main.length * (0.2 + rnd() * 0.6))]
        const d = angleOf(a, b) + (rnd() < 0.5 ? 1 : -1) * (0.5 + rnd() * 0.6)
        const l = Math.hypot(b.x - a.x, b.y - a.y) * (0.15 + rnd() * 0.2)
        paths.push(split([from, { x: from.x + Math.cos(d) * l, y: from.y + Math.sin(d) * l }], 3, 0.25))
    }
    paths.forEach((pts, i) => {
        const k = i === 0 ? 1 : 0.6
        for (const [w, c, al] of [[8, p.deep, 0.25], [3.2, p.main, 0.75], [1.2, p.core, 1]] as const) {
            g.lineWidth = Math.max(0.8, w * k)
            g.strokeColor = col(c, al * alpha * (i === 0 ? 1 : 0.8))
            g.moveTo(pts[0].x, pts[0].y)
            for (const q of pts) g.lineTo(q.x, q.y)
            g.stroke()
        }
    })
}

/** Hơi nước xì từ van: cụm trắng đục loang, bay về `ang` rồi bốc lên */
function steam(layer: Node, p: Pt, n: number, ang: number) {
    void burst(layer, p, n, {
        color: [STEAM, STEAM_DIM], kind: "glow", additive: false, life: [0.5, 0.9], size: [20, 70], alpha: 0.5, speed: [80, 200],
        angle: [ang - 0.3, ang + 0.3], drag: 2.4, gravity: 80, spread: 4
    })
}

/** Tia lửa hàn đồng thau có trọng lực, văng về `ang` ± `spread` */
function weldSparks(layer: Node, p: Pt, n: number, ang: number, spread: number) {
    void burst(layer, p, n, {
        color: [0xfffbe8, GOLD, BRASS, 0xff9a3a], kind: "blade", life: [0.2, 0.45], size: [14, 3], alpha: 1, speed: [240, 560],
        angle: [ang - spread, ang + spread], drag: 1.4, gravity: -1000, align: true, stretch: 3
    })
}

/** Lá bài úp nhỏ (lưng xanh than, viền vàng) tâm `c`, xoay `rot` */
function card(L: Layers, c: Pt, rot: number, s: number, alpha: number) {
    if (alpha <= 0.01) return
    const cs = Math.cos(rot), sn = Math.sin(rot)
    const P = (x: number, y: number): Pt => ({ x: c.x + x * cs - y * sn, y: c.y + x * sn + y * cs })
    const w = s * 0.36, h = s * 0.5
    const pts = [P(-w, -h), P(w, -h), P(w, h), P(-w, h)]
    L.body.fillColor = col(CARD, alpha)
    L.body.moveTo(pts[0].x, pts[0].y)
    for (const q of pts) L.body.lineTo(q.x, q.y)
    L.body.close()
    L.body.fill()
    L.front.lineWidth = 1.4
    L.front.strokeColor = col(GOLD, 0.9 * alpha)
    L.front.moveTo(pts[0].x, pts[0].y)
    for (const q of [...pts, pts[0]]) L.front.lineTo(q.x, q.y)
    L.front.stroke()
    const m = P(0, 0)
    L.front.fillColor = col(GOLD, 0.7 * alpha)
    L.front.circle(m.x, m.y, s * 0.08)
    L.front.fill()
}

/** Bánh răng đồng thau tâm `c`, bán kính `r`, xoay `rot`: răng, lỗ trục, mép sáng */
function gear(L: Layers, c: Pt, r: number, rot: number, alpha: number) {
    L.body.fillColor = col(BRASS, alpha)
    const n = 8
    for (let i = 0; i <= n * 2; i++) {
        const a = rot + i / (n * 2) * TAU
        const rr = i % 2 ? r : r * 1.3
        const a2 = a + TAU / (n * 4)
        const q1 = { x: c.x + Math.cos(a) * rr, y: c.y + Math.sin(a) * rr }
        const q2 = { x: c.x + Math.cos(a2) * rr, y: c.y + Math.sin(a2) * rr }
        if (i === 0) L.body.moveTo(q1.x, q1.y)
        else L.body.lineTo(q1.x, q1.y)
        L.body.lineTo(q2.x, q2.y)
    }
    L.body.close()
    L.body.fill()
    L.body.fillColor = col(STEEL_DARK, alpha)
    L.body.circle(c.x, c.y, r * 0.35)
    L.body.fill()
    L.front.lineWidth = 1
    L.front.strokeColor = col(BRASS_LIT, 0.9 * alpha)
    L.front.circle(c.x, c.y, r * 0.8)
    L.front.stroke()
}

// ---------- Đánh thường ----------

/** Đánh thường: nắm đấm đồng thau nện từ trên xuống mục tiêu, chạm: tia lửa hàn, chớp điện nhỏ, hơi xì hai bên */
registerSkillVfx("basic_blitzcrank", async (ctx) => {
    const to = mainOf(ctx)
    const seed = rand(1, 999)
    const L = layers(ctx.layer)
    const hit = at(to, 0, 6)
    await over(ctx.layer, 0.1, (t) => {
        L.clear()
        const p = mix(at(hit, 0, 90), hit, ease.in(t))
        fist(L, p, DOWN, 46, Math.min(1, t * 5), t)
        emit(ctx.layer, at(p, rand(-14, 14), 20), { color: [STEAM], kind: "blade", life: [0.08, 0.14], size: [26, 4], alpha: 0.6, rotation: UP, stretch: 3 })
    })
    impact(ctx.layer, to, BRASSP, 0.55, at(to, 0, 100))
    weldSparks(ctx.layer, to, 9, UP, 1.1)
    steam(ctx.layer, at(to, -20, -20), 3, Math.PI - 0.3)
    steam(ctx.layer, at(to, 20, -20), 3, 0.3)
    const arc = canvas(ctx.layer)
    void over(ctx.layer, 0.22, (t) => {
        L.clear()
        fist(L, at(hit, 0, 10 * ease.out(t)), DOWN, 46, 1 - t, 1 - t)
        arc.g.clear()
        const s = seed + Math.floor(t * 18)
        for (let i = 0; i < 2; i++) {
            const a = rand(0, TAU)
            lightning(arc.g, hit, at(hit, Math.cos(a) * 50, Math.sin(a) * 40), s + i, ELEC, 1 - t, 0.25, 0)
        }
    }).then(() => { L.done(); arc.done() })
})

// ---------- P Thu Gom ----------

/**
 * P (mỗi lần cướp: +1 Phụ Tùng): bánh răng và tấm đinh tán từ phía địch bay xoay về, khoá vào thân Blitzcrank (tia lửa hàn); rồi vỏ
 * cầu điện lam (icon) hiện quanh thân, sét nhỏ chạy trên vỏ, loé một nhịp: cộng Giáp và Kháng phép. Vỏ mờ dần chạy nền.
 */
registerSkillVfx("blitzcrank_p", async (ctx) => {
    const me = ctx.from
    const to = ctx.to[0] ?? at(me, 0, 300)
    const seed = rand(1, 999)
    const L = layers(ctx.layer)
    const parts = Array.from({ length: 5 }, (_, i) => ({
        from: at(mix(me, to, 0.55), rand(-180, 180), rand(-40, 40)),
        dst: at(me, Math.cos(i / 5 * TAU) * 36, 6 + Math.sin(i / 5 * TAU) * 40),
        gear: i % 2 === 0, lag: i * 0.04, spin: rand(-12, 12)
    }))
    await over(ctx.layer, 0.36, (t) => {
        L.clear()
        for (const p of parts) {
            const u = Math.max(0, Math.min(1, (t - p.lag) / (1 - 0.16)))
            const q = mix(p.from, p.dst, ease.inOut(u))
            const a = Math.min(1, u * 4)
            if (p.gear) gear(L, q, 9, p.spin * t, a)
            else {
                strip(L.body, at(q, -8, -3), at(q, 8, 3), 9, col(STEEL, a))
                L.front.fillColor = col(BRASS_LIT, a)
                L.front.circle(q.x - 4, q.y - 1, 1.3)
                L.front.circle(q.x + 4, q.y + 1, 1.3)
                L.front.fill()
            }
            if (u > 0 && u < 1) emit(ctx.layer, q, { color: [GOLD, STEAM_DIM], kind: "dot", life: [0.2, 0.4], size: [4, 1], alpha: 0.8, speed: [10, 40], spread: 4 })
        }
    })
    for (const p of parts) weldSparks(ctx.layer, p.dst, 4, angleOf(me, p.dst), 0.7)
    ctx.onBeat?.(0)
    const shell = canvas(ctx.layer)
    emit(ctx.layer, me, { color: [ARC], kind: "glow", life: [0.35, 0.35], size: [80, 220], alpha: 0.6 })
    void burst(ctx.layer, me, 1, { color: [ARC_CORE], kind: "ring", life: [0.3, 0.3], size: [80, 170], alpha: 0.8 })
    void dust(ctx.layer, me, ELEC, 20, 50)
    void over(ctx.layer, 0.55, (t) => {
        L.clear()
        for (const p of parts) if (p.gear) gear(L, p.dst, 9, p.spin * 0.36, 1 - t)
        shell.g.clear()
        const a = (t < 0.15 ? t / 0.15 : 1) * (1 - ease.in(t))
        shell.g.fillColor = col(ARC, 0.08 * a)
        shell.g.ellipse(me.x, me.y + 6, 76, 88)
        shell.g.fill()
        for (const [lw, c, al] of [[8, ARC_DEEP, 0.25], [3, ARC, 0.6], [1.2, ARC_CORE, 0.95]] as const) {
            shell.g.lineWidth = lw
            shell.g.strokeColor = col(c, al * a)
            shell.g.ellipse(me.x, me.y + 6, 76, 88)
            shell.g.stroke()
        }
        // sét nhỏ chạy trên vỏ cầu
        const s = seed + Math.floor(t * 16)
        const r2 = seeded(s)
        for (let i = 0; i < 2; i++) {
            const a0 = r2() * TAU, a1 = a0 + 0.5 + r2() * 0.6
            lightning(shell.g, { x: me.x + Math.cos(a0) * 76, y: me.y + 6 + Math.sin(a0) * 88 }, { x: me.x + Math.cos(a1) * 76, y: me.y + 6 + Math.sin(a1) * 88 }, s + i, ELEC, a, 0.2, 0)
        }
    }).then(() => { L.done(); shell.done() })
})

// ---------- Q Bàn Tay Hoả Tiễn ----------

/**
 * Q: hai van vai xì hơi, nắm đấm phụt lửa tên lửa phóng thẳng tới mục tiêu, kéo theo xích thép ánh lục lam từ vai Blitzcrank. Chạm:
 * nắm đấm chụp (tia lửa hàn, chớp điện, loé đồng); một lá bài bị giật ra từ mục tiêu nằm trong nắm tay; xích giật về, nắm đấm mang
 * lá bài bay về Blitzcrank (chạy nền).
 */
registerSkillVfx("blitzcrank_q", async (ctx) => {
    const me = ctx.from
    const to = mainOf(ctx)
    const seed = rand(1, 999)
    const dir = angleOf(me, to)
    const shoulder = at(me, Math.cos(dir) * 34, Math.sin(dir) * 34 + 10)
    const grab = at(to, -Math.cos(dir) * 22, -Math.sin(dir) * 22)
    steam(ctx.layer, at(me, -38, 34), 4, UP + 0.6)
    steam(ctx.layer, at(me, 38, 34), 4, UP - 0.6)
    void charge(ctx.layer, shoulder, FIRE, 0.14, 26)
    const L = layers(ctx.layer)
    const jet = canvas(ctx.layer)
    await over(ctx.layer, 0.14, (t) => {
        L.clear()
        fist(L, shoulder, dir, 40, t, 0.4 * t)
    })
    const secs = Math.min(0.3, 0.14 + Math.hypot(grab.x - shoulder.x, grab.y - shoulder.y) / 2600)
    await over(ctx.layer, secs, (t) => {
        const p = mix(shoulder, grab, ease.in(t))
        L.clear()
        chain(L, shoulder, at(p, -Math.cos(dir) * 30, -Math.sin(dir) * 30), 1, t * 20)
        fist(L, p, dir, 40, 1, 0.6)
        jet.g.clear()
        const tail = at(p, -Math.cos(dir) * 36, -Math.sin(dir) * 36)
        softBeam(jet.g, at(tail, -Math.cos(dir) * 46, -Math.sin(dir) * 46), tail, FIRE, 24, 0.9)
        emit(ctx.layer, tail, { color: [STEAM, STEAM_DIM], kind: "glow", additive: false, life: [0.3, 0.6], size: [16, 46], alpha: 0.35, speed: [30, 80], angle: [dir + Math.PI - 0.3, dir + Math.PI + 0.3] })
        emit(ctx.layer, tail, { color: FIRE.dust!, kind: "dot", life: [0.15, 0.3], size: [5, 1], alpha: 1, speed: [120, 260], angle: [dir + Math.PI - 0.25, dir + Math.PI + 0.25] })
    })
    jet.done()
    ctx.onBeat?.(0)
    impact(ctx.layer, to, BRASSP, 0.95, me)
    weldSparks(ctx.layer, grab, 12, dir + Math.PI, 0.9)
    const arc = canvas(ctx.layer)
    // giật về mang lá bài (chạy nền)
    void (async () => {
        await over(ctx.layer, 0.1, (t) => {
            L.clear()
            chain(L, shoulder, at(grab, -Math.cos(dir) * 30, -Math.sin(dir) * 30), 1, 2 + t * 10)
            fist(L, grab, dir, 40 * (1 - 0.08 * Math.sin(t * Math.PI)), 1, 0.6)
            card(L, mix(to, grab, ease.out(t)), dir + 0.4, 44, Math.min(1, t * 4))
            arc.g.clear()
            for (let i = 0; i < 3; i++) lightning(arc.g, grab, at(grab, rand(-50, 50), rand(-40, 40)), seed + i + Math.floor(t * 10) * 7, ELEC, 1 - t, 0.25, 0)
        })
        arc.done()
        await over(ctx.layer, 0.3, (t) => {
            const p = mix(grab, shoulder, ease.in(t))
            L.clear()
            chain(L, shoulder, at(p, -Math.cos(dir) * 30, -Math.sin(dir) * 30), 1, 4 + t * 20)
            fist(L, p, dir, 40, 1 - Math.max(0, t - 0.8) * 5, 0.3)
            card(L, at(p, Math.cos(dir) * 10, Math.sin(dir) * 10), dir + 0.4 + t, 44, 1 - Math.max(0, t - 0.8) * 5)
        })
        L.done()
        steam(ctx.layer, shoulder, 4, UP)
    })()
})

// ---------- E Tay Giật ----------

/** Vòng ấn phép tím đang thi triển tại `c`: hai vòng rune xoay ngược, nứt và co lại theo `crush` 0..1 */
function sigil(g: Graphics, c: Pt, r: number, rot: number, crush: number, alpha: number, seed: number) {
    if (alpha <= 0.01) return
    const rnd = seeded(seed)
    const rr = r * (1 - 0.7 * crush)
    for (const [k, dirn] of [[1, 1], [0.7, -1]] as const) {
        for (const [lw, c2, a] of [[5, SPELL_DEEP, 0.4], [1.8, SPELL, 0.9], [0.8, 0xf0e0ff, 0.9]] as const) {
            g.lineWidth = lw
            g.strokeColor = col(c2, a * alpha)
            const n = 24
            for (let i = 0; i <= n; i++) {
                const a2 = rot * dirn + i / n * TAU
                const j = 1 + (rnd() - 0.5) * 0.2 * crush
                const q = { x: c.x + Math.cos(a2) * rr * k * j, y: c.y + Math.sin(a2) * rr * k * 0.42 * j }
                if (i === 0) g.moveTo(q.x, q.y)
                else if (crush > 0.3 && rnd() < crush * 0.3) g.moveTo(q.x, q.y)
                else g.lineTo(q.x, q.y)
            }
            g.stroke()
        }
    }
    // rune: vạch ngắn quanh vòng ngoài
    g.lineWidth = 1.4
    g.strokeColor = col(SPELL, 0.8 * alpha)
    for (let i = 0; i < 8; i++) {
        const a2 = rot + i / 8 * TAU
        const p0 = { x: c.x + Math.cos(a2) * rr * 0.8, y: c.y + Math.sin(a2) * rr * 0.8 * 0.42 }
        const p1 = { x: c.x + Math.cos(a2 + 0.15) * rr * 0.9, y: c.y + Math.sin(a2 + 0.15) * rr * 0.9 * 0.42 }
        g.moveTo(p0.x, p0.y)
        g.lineTo(p1.x, p1.y)
    }
    g.stroke()
}

/**
 * E (Quick, nối Chuỗi): sét tím lam tụ bọc nắm đấm Blitzcrank; nắm đấm lao tới kẻ đang dùng chiêu, vòng xuống dưới rồi đấm móc
 * ngược lên. Chạm: loé điện, sét toé, vòng ấn phép tím dưới chân nó bị bóp vỡ thành khói đen và tàn đỏ (Vô Hiệu); Choáng dùng VFX
 * khống chế chung.
 */
registerSkillVfx("blitzcrank_e", async (ctx) => {
    const me = ctx.from
    const to = mainOf(ctx)
    const seed = rand(1, 999)
    const L = layers(ctx.layer)
    const arc = canvas(ctx.layer)
    const sig = canvas(ctx.layer)
    const hand = at(me, 30, 30)
    void charge(ctx.layer, hand, SHOCK, 0.2, 34)
    await over(ctx.layer, 0.2, (t) => {
        L.clear()
        fist(L, hand, UP, 42, Math.min(1, t * 4), t, 0x9a7aff)
        arc.g.clear()
        for (let i = 0; i < 2; i++) lightning(arc.g, hand, at(hand, rand(-40, 40), rand(-40, 40)), seed + i + Math.floor(t * 18) * 5, SHOCK, t, 0.3, 0)
        sig.g.clear()
        sigil(sig.g, at(to, 0, -40), 62, t * 3, 0, Math.min(1, t * 3), seed)
    })
    // lao tới, vòng xuống dưới mục tiêu rồi móc ngược lên
    const low = at(to, 0, -70)
    const hit = at(to, 0, -4)
    await over(ctx.layer, 0.2, (t) => {
        const p = t < 0.7 ? mix(hand, low, ease.inOut(t / 0.7)) : mix(low, hit, ease.in((t - 0.7) / 0.3))
        L.clear()
        fist(L, p, UP, 42, 1, 1, 0x9a7aff)
        arc.g.clear()
        lightning(arc.g, p, at(p, rand(-30, 30), rand(-40, -10)), seed + Math.floor(t * 18) * 3, SHOCK, 0.9, 0.3, 0)
        sig.g.clear()
        sigil(sig.g, at(to, 0, -40), 62, 0.6 + t * 3, 0, 1, seed)
        emit(ctx.layer, p, { color: SHOCK.dust!, kind: "dot", life: [0.15, 0.3], size: [5, 1], alpha: 1, speed: [20, 80], spread: 10 })
    })
    ctx.onBeat?.(0)
    impact(ctx.layer, to, SHOCK, 1.0, low)
    void stunStars(ctx.layer, to, 0.9)
    // phép bị bóp vỡ, khói đen tàn đỏ, sét tắt (chạy nền)
    void over(ctx.layer, 0.45, (t) => {
        L.clear()
        fist(L, at(hit, 0, 16 * ease.out(t)), UP, 42, 1 - ease.in(t), 1 - t, 0x9a7aff)
        arc.g.clear()
        if (t < 0.5) for (let i = 0; i < 3; i++) lightning(arc.g, hit, at(hit, rand(-70, 70), rand(-50, 60)), seed + 30 + i + Math.floor(t * 18) * 7, ELEC, 1 - t * 2, 0.25, 1)
        sig.g.clear()
        sigil(sig.g, at(to, 0, -40), 62, 1.2 + t, ease.in(Math.min(1, t * 2)), 1 - t, seed)
        if (t < 0.5 && Math.random() < 0.8) {
            emit(ctx.layer, at(to, rand(-40, 40), -40), { color: [SOOT, 0x1a1a22], kind: "glow", additive: false, life: [0.5, 0.9], size: [30, 80], alpha: 0.45, speed: [20, 70], angle: [UP - 0.5, UP + 0.5] })
            emit(ctx.layer, at(to, rand(-40, 40), -40), { color: [0xff4a2a, 0xffa040], kind: "dot", life: [0.4, 0.7], size: [4, 1], alpha: 1, speed: [20, 90], angle: [UP - 0.8, UP + 0.8], gravity: -100 })
        }
    }).then(() => { L.done(); arc.done(); sig.done() })
})

// ---------- R Trường Điện Từ ----------

/**
 * R: điện tụ trong thân Blitzcrank, sét bò quanh thân (nhấp nháy), hơi xả từ van; rồi một nhịp chớp lam trắng: sét toả từ
 * Blitzcrank quật vào MỌI tướng địch cùng lúc (đúng hàng địch engine đánh), mỗi điểm loé điện và toé tia lửa mảnh; sét nối tiếp
 * dọc hàng địch nhấp nháy rồi tắt, khói khét bốc lên. Câm Lặng dùng icon trạng thái trên lá.
 */
registerSkillVfx("blitzcrank_r", async (ctx) => {
    const me = ctx.from
    const foes = allFoes(ctx)
    const seed = rand(1, 999)
    const g = canvas(ctx.layer)
    emit(ctx.layer, me, { color: [ARC_DEEP], kind: "glow", life: [0.5, 0.5], size: [100, 240], alpha: 0.6 })
    void charge(ctx.layer, at(me, 0, 10), ELEC, 0.3, 56)
    await over(ctx.layer, 0.3, (t) => {
        g.g.clear()
        const s = seed + Math.floor(t * 20) * 11
        const r2 = seeded(s)
        for (let i = 0; i < 2 + Math.round(t * 3); i++) {
            const a0 = r2() * TAU, a1 = a0 + (r2() - 0.5) * 2.4
            lightning(g.g, { x: me.x + Math.cos(a0) * 46, y: me.y + 8 + Math.sin(a0) * 56 }, { x: me.x + Math.cos(a1) * 52, y: me.y + 8 + Math.sin(a1) * 60 }, s + i, ELEC, 0.4 + 0.6 * t, 0.25, 0)
        }
        orb(g.g, at(me, 0, 10), ELEC, 30 + 30 * t, 0.4 + 0.4 * t)
        if (Math.random() < 0.3) steam(ctx.layer, at(me, rand(-40, 40), 40), 2, UP)
    })
    // nhịp chớp: sét vươn tới mọi tướng địch
    await over(ctx.layer, 0.07, (t) => {
        g.g.clear()
        orb(g.g, at(me, 0, 10), ELEC, 70, 1)
        foes.forEach((p, i) => lightning(g.g, at(me, 0, 30), mix(at(me, 0, 30), p, ease.out(t)), seed + 100 + i, ELEC, 1, 0.16, 2))
    })
    ctx.onBeat?.(0)
    emit(ctx.layer, me, { color: [ARC_CORE], kind: "glow", life: [0.18, 0.18], size: [120, 300], alpha: 1 })
    groundWave(ctx.layer, at(me, 0, -30), ELEC, 160, 0.45)
    steam(ctx.layer, at(me, -40, 36), 5, UP + 0.7)
    steam(ctx.layer, at(me, 40, 36), 5, UP - 0.7)
    for (const p of foes) {
        impact(ctx.layer, p, ELEC, 1.15, me)
        // tia lửa hàn mảnh thay mảnh tam giác đồng (VFX_RULES §0.1)
        weldSparks(ctx.layer, p, 6, UP, 1)
    }
    const sorted = [...foes].sort((a, b) => a.x - b.x)
    // sét nhấp nháy rồi tắt, sét nối dọc hàng (chạy nền)
    void over(ctx.layer, 0.45, (t) => {
        g.g.clear()
        const fade = 1 - ease.in(t)
        const s = seed + 200 + Math.floor(t * 18) * 13
        if (t < 0.35) foes.forEach((p, i) => lightning(g.g, at(me, 0, 30), p, s + i, ELEC, (1 - t / 0.35) * 0.9, 0.16, 1))
        for (let i = 1; i < sorted.length; i++) lightning(g.g, sorted[i - 1], sorted[i], s + 50 + i, ELEC, fade * (0.6 + 0.4 * Math.sin(t * 40 + i)), 0.2, 1)
        if (Math.random() < 0.6) {
            const p = sorted[Math.floor(Math.random() * sorted.length)]
            emit(ctx.layer, at(p, rand(-30, 30), rand(-20, 30)), { color: [SOOT, STEAM_DIM], kind: "glow", additive: false, life: [0.5, 0.9], size: [24, 60], alpha: 0.35, speed: [20, 60], angle: [UP - 0.4, UP + 0.4] })
        }
    }).then(g.done)
})
