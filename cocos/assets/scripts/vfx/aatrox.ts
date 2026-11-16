// VFX Aatrox trên Cocos, chuẩn chung "mọi tướng một bản" (mẫu Vel'Koz, công cụ kit.ts, hạt qua tone.ts): MÁU DARKIN.
// VFX_RULES §0.1: KHÔNG vẽ đại kiếm. Chỉ vẽ DẤU VẾT nhát chém: vệt liềm đỏ thẫm mép dung nham, đầu vệt trắng nóng, đuôi tàn thành
// than; máu đặc, khói đen, than hồng bay lên; vỏ khiên máu (E) là lớp năng lượng máu trong mờ, không phải chiếc khiên; cánh quỷ
// màng tối (R) là hình riêng, không theo nhân vật có sẵn nào. Hình khối vẽ bằng Graphics ba lớp (quầng cộng màu, thân hoà
// thường, viền dung nham cộng màu).
// Mỗi ô lấy ý từ đâu (khớp kit engine heroes/aatrox.ts):
// - basic_aatrox: nhát chém thường: vệt liềm mép dung nham, đầu vệt nóng, máu văng.
// - aatrox_p (Cái Giá Bằng Máu): icon Aatrox cầm lưỡi kiếm đỏ rực. Đòn thêm là hai vệt chém nung đỏ bắt chéo trên mục tiêu, rồi máu
//   bị hút ngược về Aatrox thành ánh hồi (màu hồi lục, không phải màu đòn).
// - aatrox_q (Lưỡi Gươm Darkin): icon lưỡi kiếm lửa bổ xuống. Aatrox trả 10% Máu hiện tại: máu trào khỏi thân, bị hút lên thành vệt
//   chém vút ngược trên đầu (lấy đà), dòng máu lao tới tướng đối diện rồi MỘT vệt chém lớn bổ từ trên xuống qua đúng tướng đó
//   (một mục tiêu, một nhịp), vũng dung nham sáng loang trên đất (không nứt tối, VFX_RULES §0.1).
// - aatrox_e (Huyết Thuẫn, Quick): máu tụ quanh Aatrox, rồi mỗi tướng engine báo trúng một vệt chém hút máu (đối diện to, đường kề
//   nhỏ hơn) theo đúng thứ tự engine, mỗi cú một nhịp; máu chảy ngược từ từng tướng về Aatrox và đọng thành vỏ khiên máu đỏ thẫm
//   trong mờ quanh người (Khiên = 40% tổng sát thương).
// - aatrox_r (Kẻ Diệt Thế, Quick): icon quỷ dang đôi cánh trong nền đỏ. R không gây sát thương, chỉ hoá quỷ 2 đơn vị: bóng tối phủ
//   quanh Aatrox, máu tụ về ngực, mắt đỏ loé, cánh quỷ xoè, một nhịp đập đỏ quanh người; cánh và quầng quỷ đọng rồi mờ dần.
//   Không vệt chém, không trúng ai, không onBeat. R chỉ tăng chỉ số (Công, Máu tối đa) và cho hồi sinh một lần.
import {
    Graphics, Node
} from "cc"
import {
    angleOf, ease, lerp, mix, rand, type Pt
} from "./particles"
import {
    registerSkillVfx, type VfxCtx
} from "./registry"
import {
    bolt, canvas, charge, col, dust, groundWave, impact, orb, seeded, TAU, UP, type Palette
} from "./kit"
import {
    burst, emit, nearestIn, over, rowsOf
} from "./g1_helpers"

const HOT = 0xffe9c4
const MOLTEN = 0xffb43a
const EMBER = 0xff4a1e
const SCARLET = 0xff2a3c
const CRIMSON = 0xd0142c
const GORE = 0x7a0a18
const DUSK = 0x4a0812
const BLACK = 0x16040a
const IRON = 0x2a1014
const HEAL = 0x7dff9a
const HEAL_CORE = 0xe8ffe8

/** Dung nham Darkin: lõi trắng vàng, cam hồng, đỏ thẫm, nhấn vàng cam */
const DARKIN: Palette = {
    core: HOT, main: EMBER, deep: DUSK, accent: MOLTEN, dust: [EMBER, MOLTEN, 0xff7a3a, HOT]
}
/** Máu */
const BLOODP: Palette = {
    core: 0xffe0d8, main: CRIMSON, deep: DUSK, accent: SCARLET, dust: [SCARLET, CRIMSON, EMBER]
}
/** Hồi Máu */
const MEND: Palette = {
    core: HEAL_CORE, main: HEAL, deep: 0x0d6a3a, accent: 0xc8ffd0, dust: [HEAL, 0xc8ffd0, 0xffffff]
}

const at = (p: Pt, dx: number, dy: number): Pt => ({
    x: p.x + dx, y: p.y + dy
})
/** Tướng đối diện engine báo (ctx.to[0]); không có thì ô đối diện trên hàng địch, chỉ để đặt hình */
const mainOf = (ctx: VfxCtx): Pt => ctx.to[0] ?? nearestIn(rowsOf(ctx).foe, ctx.from)

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

/** Vệt chém liềm (cung tâm `c`, bán kính `r`, dẹt `sq`) từ a0 tới a1; `head` 0..1 mũi lưỡi, `tail` độ dài vệt, `w` bề dày */
function crescent(g: Graphics, c: Pt, r: number, a0: number, a1: number, head: number, tail: number, w: number, p: Palette, alpha: number, seed: number, sq = 1) {
    const u0 = Math.max(0, head - tail)
    if (head - u0 < 0.004 || alpha <= 0.01) return
    const rnd = seeded(seed)
    const N = 40
    const outer: Pt[] = [], inner: Pt[] = []
    for (let i = 0; i <= N; i++) {
        const s = i / N
        const a = lerp(a0, a1, lerp(u0, head, s))
        const t = w * Math.pow(s, 0.8) * Math.min(1, (1 - s) * 9 + 0.2) * (0.7 + rnd() * 0.6)
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
    band(1.35, p.deep, 0.22)
    band(1, p.main, 0.36)
    band(0.6, p.main, 0.6)
    band(0.28, p.accent, 0.85)
    for (const [lw, color, a] of [[3.2, p.accent, 0.55], [1.4, p.core, 1]] as const) {
        g.lineWidth = lw
        g.strokeColor = col(color, a * alpha)
        g.moveTo(outer[0].x, outer[0].y)
        for (const q of outer) g.lineTo(q.x, q.y)
        g.stroke()
    }
}

/** Đầu vệt trắng nóng tại `p` (đốm dung nham nhiều lớp) + than hồng rơi lại dọc đường chém */
function hotHead(layer: Node, g: Graphics, p: Pt, r: number) {
    orb(g, p, DARKIN, r)
    emit(layer, p, { color: [HOT, MOLTEN, EMBER], kind: "dot", life: [0.15, 0.32], size: [6, 1], alpha: 1, speed: [10, 80], angle: [0, TAU], drag: 2 })
}

/**
 * Vũng dung nham sáng mềm trên đất quanh `c` (vẽ lên lớp CỘNG SÁNG, dẹt `sq`): elip đồng tâm đỏ cam -> cam vàng -> lõi trắng vàng
 * theo `heat`, không rãnh tối, không đường gấp khúc. Thay nứt dung nham cũ (VFX_RULES §0.1).
 */
function lavaGlow(g: Graphics, c: Pt, r: number, heat: number, alpha: number, sq = 0.42) {
    if (alpha <= 0.01 || r <= 0.5) return
    const rings: [number, number, number][] = [[1, EMBER, 0.1], [0.7, EMBER, 0.18], [0.46, MOLTEN, 0.3 * heat], [0.22, HOT, 0.45 * Math.max(0, heat - 0.3)]]
    for (const [k, c0, a] of rings) {
        if (a <= 0.005) continue
        g.fillColor = col(c0, Math.min(1, a) * alpha)
        g.ellipse(c.x, c.y, r * k, r * k * sq)
        g.fill()
    }
}

/** Máu văng: giọt đặc rơi theo trọng lực, tia đỏ sáng, khói đen; bắn về `ang` ± `spread` */
function bloodSpray(layer: Node, p: Pt, n: number, ang: number, spread: number, speed: [number, number] = [160, 440]) {
    void burst(layer, p, n, {
        color: [GORE, CRIMSON], kind: "dot", additive: false, life: [0.35, 0.7], size: [8, 3], alpha: 1, speed,
        angle: [ang - spread, ang + spread], drag: 0.8, gravity: -1000, spread: 6
    })
    void burst(layer, p, Math.round(n * 0.5), {
        color: [SCARLET, EMBER], kind: "blade", life: [0.14, 0.3], size: [22, 4], alpha: 1, speed: [speed[0] * 1.3, speed[1] * 1.3],
        angle: [ang - spread * 0.8, ang + spread * 0.8], drag: 2, gravity: -500, align: true, stretch: 2.6
    })
}

/** Khói đen và than hồng bốc lên chạy nền */
function smokeAndEmbers(layer: Node, p: Pt, n: number, spread: number) {
    void burst(layer, p, Math.round(n * 0.4), {
        color: [BLACK, DUSK, IRON], kind: "glow", additive: false, life: [0.6, 1], size: [40, 100], alpha: 0.45, speed: [20, 70],
        angle: [UP - 0.6, UP + 0.6], drag: 1, spread
    })
    void burst(layer, p, n, {
        color: [EMBER, MOLTEN, SCARLET], kind: "dot", life: [0.5, 1], size: [5, 1], alpha: 1, speed: [40, 150],
        angle: [UP - 0.8, UP + 0.8], drag: 1, gravity: 60, spread
    })
}

/**
 * Máu bị hút từ `from` về Aatrox theo vài dòng cong. `mend`: tới nơi hoá ánh hồi lục (hồi Máu của nội tại); không thì tới nơi
 * chỉ loé đỏ (máu nuôi vỏ khiên của E). Chạy nền.
 */
async function drain(layer: Node, from: Pt, me: Pt, secs: number, mend = true, n = 6) {
    const c = canvas(layer)
    const lines = Array.from({ length: n }, () => ({ off: rand(-0.2, 0.1), bend: rand(-60, 60), w: rand(2, 3.4) }))
    await over(layer, secs, (t) => {
        c.g.clear()
        for (const s of lines) {
            const u = Math.max(0, Math.min(1, (t - s.off - 0.1) / 0.75))
            if (u <= 0) continue
            const head = ease.inOut(u)
            const tail = Math.max(0, head - 0.32)
            const path = (v: number): Pt => {
                const q = mix(from, me, v)
                return { x: q.x + Math.sin(v * Math.PI) * s.bend, y: q.y }
            }
            for (const [w, cc, a] of [[s.w * 2.4, DUSK, 0.35], [s.w, SCARLET, 0.85], [1, HOT, 0.6]] as const) {
                c.g.lineWidth = w
                c.g.strokeColor = col(cc, a * (1 - u * 0.4))
                for (let i = 0; i <= 10; i++) {
                    const q = path(lerp(tail, head, i / 10))
                    if (i === 0) c.g.moveTo(q.x, q.y)
                    else c.g.lineTo(q.x, q.y)
                }
                c.g.stroke()
            }
        }
    })
    c.done()
    if (mend) {
        emit(layer, me, { color: [HEAL_CORE], kind: "glow", life: [0.25, 0.25], size: [50, 160], alpha: 0.8 })
        emit(layer, me, { color: [HEAL], kind: "glow", life: [0.45, 0.45], size: [100, 200], alpha: 0.45 })
        void dust(layer, at(me, 0, -20), MEND, 22, 44)
    } else {
        emit(layer, me, { color: [SCARLET], kind: "glow", life: [0.22, 0.22], size: [40, 120], alpha: 0.6 })
    }
}

/**
 * Vỏ khiên máu quanh Aatrox (E): sau `delay` giây một lớp năng lượng máu trong mờ phồng lên bọc lấy người (mép gợn chảy như máu
 * lỏng, hạt giống giữ hình), lòng tối đỏ thẫm, viền đỏ tươi có vệt sáng trượt quanh, hai dải máu xoáy bên trong, giọt máu chảy
 * xuống mép; giữ một lúc rồi tan. Không phải hình chiếc khiên. Chạy nền, không giữ hàng.
 */
function bloodShell(layer: Node, me: Pt, delay: number, secs: number, seed: number) {
    const c = at(me, 0, 6)
    const RX = 62, RY = 72, N = 56
    const rnd = seeded(seed)
    const waves = Array.from({ length: 4 }, () => ({ k: 2 + Math.floor(rnd() * 4), ph: rnd() * TAU, amp: 1.2 + rnd() * 2.4, sp: (rnd() - 0.5) * 7 }))
    const body = canvas(layer, false)
    const glow = canvas(layer)
    const rim = (time: number, f: number): Pt[] => {
        const pts: Pt[] = []
        for (let i = 0; i <= N; i++) {
            const a = i / N * TAU
            let w = 0
            for (const q of waves) w += Math.sin(a * q.k + q.ph + time * q.sp) * q.amp
            const k = f * (1 + w / RX)
            pts.push({ x: c.x + Math.cos(a) * RX * k, y: c.y + Math.sin(a) * RY * k })
        }
        return pts
    }
    const poly = (g: Graphics, pts: Pt[], color: number, a: number) => {
        if (a <= 0.01) return
        g.fillColor = col(color, a)
        g.moveTo(pts[0].x, pts[0].y)
        for (const q of pts) g.lineTo(q.x, q.y)
        g.close()
        g.fill()
    }
    const line = (g: Graphics, pts: Pt[], w: number, color: number, a: number) => {
        if (a <= 0.01 || pts.length < 2) return
        g.lineWidth = w
        g.strokeColor = col(color, a)
        g.moveTo(pts[0].x, pts[0].y)
        for (const q of pts) g.lineTo(q.x, q.y)
        g.stroke()
    }
    const total = delay + secs
    emit(layer, c, { color: [CRIMSON], kind: "glow", life: [total * 0.6, total * 0.6], size: [80, 170], alpha: 0.3 })
    void over(layer, total, (tt) => {
        body.g.clear()
        glow.g.clear()
        const t = (tt * total - delay) / secs
        if (t <= 0) return
        const grow = ease.out(Math.min(1, t / 0.25))
        const life = t < 0.65 ? 1 : 1 - ease.in((t - 0.65) / 0.35)
        const a = life * grow
        const f = 0.55 + 0.45 * grow + 0.03 * Math.sin(t * 18)
        const time = t * secs
        const outer = rim(time, f)
        poly(body.g, outer, DUSK, 0.3 * a)
        poly(body.g, rim(time + 1.7, f * 0.82), GORE, 0.14 * a)
        // dải máu xoáy bên trong vỏ
        for (let i = 0; i < 2; i++) {
            const s = time * 3.2 + i * Math.PI
            crescent(glow.g, c, RX * 0.72 * f, s, s + 1.5, 1, 0.9, 5, BLOODP, 0.5 * a, seed + i, RY / RX)
        }
        // viền: quầng, thân đỏ, lõi mảnh; vệt sáng trượt quanh mép
        line(glow.g, outer, 7, CRIMSON, 0.22 * a)
        line(glow.g, outer, 2.4, SCARLET, 0.75 * a)
        line(glow.g, outer, 1, 0xffb0a0, 0.45 * a)
        const i0 = Math.floor((time * 0.55 % 1) * (N - 12))
        line(glow.g, outer.slice(i0, i0 + 12), 1.6, HOT, 0.7 * a)
        if (t < 0.8 && Math.random() < 0.5) {
            const q = outer[Math.floor(N * (0.55 + Math.random() * 0.4))]
            emit(layer, q, { color: [CRIMSON, GORE, SCARLET], kind: "dot", additive: false, life: [0.3, 0.5], size: [5, 2], alpha: 0.9, speed: [5, 25], angle: [-UP - 0.3, -UP + 0.3], gravity: -260 })
        }
    }).then(() => { body.done(); glow.done() })
}

// ---------- Đánh thường ----------

/** Đánh thường: một vệt chém liềm mép dung nham quét qua mục tiêu, đầu vệt trắng nóng; máu văng, khói đen mỏng, than bay lên */
registerSkillVfx("basic_aatrox", async (ctx) => {
    const to = mainOf(ctx)
    const seed = rand(1, 999)
    const c = at(to, 45, 45)
    const a0 = 3.0, a1 = 4.85
    const g = canvas(ctx.layer)
    await over(ctx.layer, 0.1, (t) => {
        const u = ease.out(t)
        const a = lerp(a0, a1, u)
        g.g.clear()
        crescent(g.g, c, 64, a0, a1, u, 0.75, 14, DARKIN, 1, seed)
        hotHead(ctx.layer, g.g, { x: c.x + Math.cos(a) * 64, y: c.y + Math.sin(a) * 64 }, 8)
    })
    impact(ctx.layer, to, DARKIN, 0.55, ctx.from)
    bloodSpray(ctx.layer, to, 10, angleOf(c, to), 0.6)
    void over(ctx.layer, 0.22, (t) => {
        g.g.clear()
        crescent(g.g, c, 64 + t * 6, a0, a1, 1, 0.75 * (1 - t * 0.6), 14 * (1 - t * 0.5), DARKIN, 1 - t, seed)
    }).then(g.done)
    smokeAndEmbers(ctx.layer, to, 10, 20)
})

// ---------- P Cái Giá Bằng Máu ----------

/**
 * P: phần sát thương thêm là hai vệt chém nung đỏ bắt chéo trên mục tiêu (lưỡi kiếm đỏ rực của icon), máu bật ra; rồi máu bị
 * hút ngược theo các dòng cong về Aatrox và hoá ánh hồi lục (hồi Máu).
 */
registerSkillVfx("aatrox_p", async (ctx) => {
    const me = ctx.from
    const to = mainOf(ctx)
    const seed = rand(1, 999)
    const g = canvas(ctx.layer)
    emit(ctx.layer, to, { color: [DUSK], kind: "glow", additive: false, life: [0.4, 0.4], size: [80, 160], alpha: 0.4 })
    const cuts: [Pt, number, number][] = [[at(to, 45, 45), 3.0, 4.85], [at(to, -45, 45), 0.14, -1.71]]
    await over(ctx.layer, 0.16, (t) => {
        g.g.clear()
        cuts.forEach(([c, a0, a1], i) => crescent(g.g, c, 64, a0, a1, ease.out(Math.max(0, Math.min(1, t * 1.6 - i * 0.6))), 0.8, 15, DARKIN, 1, seed + i))
    })
    ctx.onBeat?.(0)
    impact(ctx.layer, to, BLOODP, 0.8, me)
    bloodSpray(ctx.layer, to, 14, UP, 1.1)
    void over(ctx.layer, 0.26, (t) => {
        g.g.clear()
        cuts.forEach(([c, a0, a1], i) => crescent(g.g, c, 64 + t * 6, a0, a1, 1, 0.8 * (1 - t * 0.5), 15 * (1 - t * 0.5), DARKIN, 1 - t, seed + i))
    }).then(g.done)
    smokeAndEmbers(ctx.layer, to, 12, 24)
    void drain(ctx.layer, to, me, 0.5)
})

// ---------- Q Lưỡi Gươm Darkin ----------

/**
 * Q (không vẽ kiếm): Aatrox trả 10% Máu hiện tại: máu trào khỏi thân và bị hút lên thành một vệt chém dung nham vút ngược trên đầu
 * (lấy đà, đầu vệt nóng dần). Đỉnh vệt bật thành một dòng máu lao tới tướng đối diện (ctx.to[0], mục tiêu duy nhất engine đánh),
 * rồi MỘT vệt chém liềm lớn bổ từ trên xuống qua tướng đó: đầu vệt qua thân thì loé, máu văng, số bật (nhịp 0). Dư âm chạy nền:
 * vệt nguội thành than, sóng sáng và vũng dung nham sáng mềm loang dưới mục tiêu rồi nguội (không nứt tối), khói đen và than hồng
 * bay lên.
 */
registerSkillVfx("aatrox_q", async (ctx) => {
    const me = ctx.from
    const to = mainOf(ctx)
    const seed = rand(1, 999)
    // trả máu: máu trào khỏi thân, bị hút lên thành vệt chém vút ngược trên đầu
    const trail = canvas(ctx.layer)
    const hub = at(me, 0, 40)
    const r0 = 72, b0 = -0.35, b1 = Math.PI * 0.8
    const upAt = (u: number): Pt => {
        const a = lerp(b0, b1, u)
        return { x: hub.x + Math.cos(a) * r0, y: hub.y + Math.sin(a) * r0 }
    }
    emit(ctx.layer, me, { color: [GORE], kind: "glow", additive: false, life: [0.4, 0.4], size: [70, 140], alpha: 0.45 })
    bloodSpray(ctx.layer, at(me, 0, 10), 12, UP, 0.7, [120, 300])
    await over(ctx.layer, 0.22, (t) => {
        const u = ease.inOut(t)
        trail.g.clear()
        crescent(trail.g, hub, r0, b0, b1, u, 0.7, 20, DARKIN, Math.min(1, t * 4), seed + 2)
        hotHead(ctx.layer, trail.g, upAt(u), 5 + 5 * t)
        for (let i = 0; i < 2; i++) {
            const src = at(me, rand(-30, 30), rand(-10, 40))
            const dst = upAt(Math.max(0, u - rand(0, 0.3)))
            const d = Math.hypot(dst.x - src.x, dst.y - src.y)
            emit(ctx.layer, src, { color: [CRIMSON, SCARLET, GORE], kind: "dot", life: [0.16, 0.2], size: [7, 2], alpha: 1, speed: [d * 5.5, d * 6], angle: [angleOf(src, dst), angleOf(src, dst)] })
        }
    })
    // vệt lấy đà nguội dần chạy nền; dòng máu lao từ đỉnh vệt tới trên đầu mục tiêu
    void over(ctx.layer, 0.25, (t) => {
        trail.g.clear()
        crescent(trail.g, hub, r0, b0, b1, 1, 0.7 * (1 - t), 20 * (1 - t), DARKIN, 1 - t, seed + 2)
    }).then(trail.done)
    await bolt(ctx.layer, upAt(1), at(to, 0, 70), BLOODP, 0.16, 8, 0.1)
    // vệt chém bổ từ trên xuống qua đúng tướng đối diện
    const cut = canvas(ctx.layer)
    const C = at(to, 72, 0), R = 82, a0 = 2.35, a1 = 3.95
    let hit = false
    const strike = () => {
        hit = true
        ctx.onBeat?.(0)
        impact(ctx.layer, to, DARKIN, 1.1, at(to, 0, 160))
        bloodSpray(ctx.layer, to, 14, UP, 1)
    }
    await over(ctx.layer, 0.1, (t) => {
        const u = ease.in(t)
        const a = lerp(a0, a1, u)
        cut.g.clear()
        crescent(cut.g, C, R, a0, a1, u, 0.8, 26, DARKIN, 1, seed + 5)
        hotHead(ctx.layer, cut.g, { x: C.x + Math.cos(a) * R, y: C.y + Math.sin(a) * R }, 12)
        if (!hit && u >= 0.5) strike()
    })
    if (!hit) strike()
    // dư âm chạy nền: vệt nguội thành than, vũng dung nham sáng loang trên đất rồi nguội (thay nứt tối, VFX_RULES §0.1)
    const fiss = canvas(ctx.layer)
    groundWave(ctx.layer, at(to, 0, -34), DARKIN, 90, 0.4, 0.42)
    void over(ctx.layer, 0.55, (t) => {
        cut.g.clear()
        if (t < 0.5) crescent(cut.g, C, R + t * 8, a0, a1, 1, 0.8 * (1 - t), 26 * (1 - t), DARKIN, 1 - t * 2, seed + 5)
        if (t < 0.4 && Math.random() < 0.7) {
            const a = lerp(a0, a1, rand(0.1, 0.9))
            emit(ctx.layer, { x: C.x + Math.cos(a) * R, y: C.y + Math.sin(a) * R }, { color: [EMBER, MOLTEN, SCARLET], kind: "dot", life: [0.4, 0.8], size: [5, 1], alpha: 1, speed: [20, 80], angle: [UP - 0.7, UP + 0.7], gravity: 50 })
        }
        fiss.g.clear()
        lavaGlow(fiss.g, at(to, 0, -34), 70 * ease.out(Math.min(1, t * 3)), 1 - t, 1 - ease.in(t))
    }).then(() => { cut.done(); fiss.done() })
    smokeAndEmbers(ctx.layer, at(to, 0, -20), 14, 28)
})

// ---------- E Huyết Thuẫn ----------

/**
 * E (Quick, không vẽ kiếm): máu tụ quanh Aatrox. Mỗi tướng trong ctx.to (đúng các tướng engine gây sát thương, theo thứ tự engine:
 * đối diện rồi hai đường kề) trúng một vệt chém hút máu, cách nhau một nhịp ngắn: tướng đối diện (gần đường Aatrox nhất) vệt to
 * và loé nặng, đường kề vệt nhỏ hơn (50%). Mỗi cú chạm gọi onBeat(i) theo đúng chỉ số trong ctx.to. Máu chảy ngược từ từng tướng
 * về Aatrox rồi đọng thành vỏ khiên máu đỏ thẫm trong mờ quanh người (Khiên = 40% tổng sát thương). Promise xong ngay cú cuối;
 * dòng máu và vỏ khiên chạy nền.
 */
registerSkillVfx("aatrox_e", async (ctx) => {
    const me = ctx.from
    const seed = rand(1, 999)
    const hits = ctx.to
    const opp = hits.length ? hits.reduce((b, p) => (Math.abs(p.x - me.x) < Math.abs(b.x - me.x) ? p : b)) : undefined
    await charge(ctx.layer, at(me, 0, 30), BLOODP, 0.18, 34)
    // không có tướng nào engine báo: chỉ vệt chém trượt qua ô đối diện, không loé, không hút máu
    const spots = hits.length ? hits : [mainOf(ctx)]
    const cuts = spots.map((p, i) => {
        const big = !hits.length || p === opp
        const s = big || p.x >= me.x ? 1 : -1
        const r = big ? 72 : 50
        const k = r / 64
        return {
            p, big, r, w: big ? 20 : 12,
            c: at(p, 45 * k * s, 45 * k), a0: s > 0 ? 3.0 : 0.14, a1: s > 0 ? 4.85 : -1.71, seed: seed + i * 7,
        }
    })
    const STEP = 0.08, D = 0.12
    const total = D + STEP * (cuts.length - 1)
    const hit = cuts.map(() => false)
    const strike = (i: number) => {
        hit[i] = true
        if (!hits.length) return
        const q = cuts[i]
        ctx.onBeat?.(i)
        impact(ctx.layer, q.p, BLOODP, q.big ? 1 : 0.65, me)
        bloodSpray(ctx.layer, q.p, q.big ? 12 : 7, angleOf(me, q.p), 0.8)
        void drain(ctx.layer, q.p, me, 0.42, false, q.big ? 5 : 3)
    }
    const g = canvas(ctx.layer)
    const local = (t: number, i: number) => Math.max(0, Math.min(1, (t * total - i * STEP) / D))
    await over(ctx.layer, total, (t) => {
        g.g.clear()
        cuts.forEach((q, i) => {
            const u = ease.out(local(t, i))
            if (u <= 0) return
            crescent(g.g, q.c, q.r, q.a0, q.a1, u, 0.75, q.w, BLOODP, hits.length ? 1 : 0.6, q.seed)
            if (u < 1) {
                const a = lerp(q.a0, q.a1, u)
                hotHead(ctx.layer, g.g, { x: q.c.x + Math.cos(a) * q.r, y: q.c.y + Math.sin(a) * q.r }, q.big ? 9 : 6)
            }
        })
        cuts.forEach((_, i) => { if (!hit[i] && local(t, i) >= 0.6) strike(i) })
    })
    cuts.forEach((_, i) => { if (!hit[i]) strike(i) })
    // dư âm chạy nền: vệt nguội; máu về tới Aatrox thì vỏ khiên máu phồng lên
    void over(ctx.layer, 0.25, (t) => {
        g.g.clear()
        for (const q of cuts) crescent(g.g, q.c, q.r + t * 6, q.a0, q.a1, 1, 0.75 * (1 - t * 0.6), q.w * (1 - t * 0.5), BLOODP, 1 - t, q.seed)
    }).then(g.done)
    if (hits.length) bloodShell(ctx.layer, me, 0.3, 0.95, seed + 50)
})

// ---------- R Kẻ Diệt Thế ----------

/**
 * Một cánh quỷ từ vai `root` (`side` 1 phải, -1 trái), xoè theo `open` 0..1: bốn ngón xương cong vút toả lên, màng đỏ thẫm mờ giữa
 * các ngón có mép rách (seed), xương sẫm viền đỏ, đầu ngón than hồng.
 */
function wing(L: Layers, root: Pt, side: number, open: number, size: number, alpha: number, seed: number) {
    if (open <= 0.01 || alpha <= 0.01) return
    const rnd = seeded(seed)
    const tips: Pt[] = [], knees: Pt[] = []
    for (let f = 0; f < 4; f++) {
        const a = UP - side * (0.25 + f * 0.38 * open)
        const len = size * (0.75 + f * 0.12) * (0.4 + 0.6 * open)
        const knee = { x: root.x + Math.cos(a + side * 0.25) * len * 0.5, y: root.y + Math.sin(a + side * 0.25) * len * 0.5 }
        const tip = { x: root.x + Math.cos(a) * len, y: root.y + Math.sin(a) * len }
        knees.push(knee)
        tips.push(tip)
    }
    // màng giữa các ngón, mép dưới rách
    for (let f = 0; f < 3; f++) {
        const sag = mix(tips[f], tips[f + 1], 0.5)
        const low = mix(sag, root, 0.3 + rnd() * 0.15)
        for (const [k, c, a] of [[1, BLACK, 0.55], [0.85, DUSK, 0.5]] as const) {
            L.body.fillColor = col(c, a * alpha)
            L.body.moveTo(root.x, root.y)
            L.body.lineTo(lerp(root.x, tips[f].x, k), lerp(root.y, tips[f].y, k))
            L.body.lineTo(low.x + (rnd() - 0.5) * 8, low.y + (rnd() - 0.5) * 8)
            L.body.lineTo(lerp(root.x, tips[f + 1].x, k), lerp(root.y, tips[f + 1].y, k))
            L.body.close()
            L.body.fill()
        }
        L.back.fillColor = col(CRIMSON, 0.12 * alpha)
        L.back.moveTo(root.x, root.y)
        L.back.lineTo(tips[f].x, tips[f].y)
        L.back.lineTo(tips[f + 1].x, tips[f + 1].y)
        L.back.close()
        L.back.fill()
    }
    // xương: sẫm, viền đỏ, đầu ngón than hồng
    for (let f = 0; f < 4; f++) {
        L.body.lineWidth = 4 - f * 0.5
        L.body.strokeColor = col(IRON, alpha)
        L.body.moveTo(root.x, root.y)
        L.body.quadraticCurveTo(knees[f].x, knees[f].y, tips[f].x, tips[f].y)
        L.body.stroke()
        L.front.lineWidth = 1.1
        L.front.strokeColor = col(SCARLET, 0.75 * alpha)
        L.front.moveTo(root.x, root.y)
        L.front.quadraticCurveTo(knees[f].x, knees[f].y, tips[f].x, tips[f].y)
        L.front.stroke()
        L.front.fillColor = col(MOLTEN, alpha)
        L.front.circle(tips[f].x, tips[f].y, 2.4)
        L.front.fill()
    }
}

/**
 * R (Quick, không gây sát thương, không nhắm ai): chỉ diễn Aatrox hoá quỷ ngay trên người mình. Bóng tối loang quanh Aatrox, máu
 * từ quanh sân bị hút về tụ ở ngực, mắt đỏ loé, đôi cánh quỷ màng tối xoè rộng sau lưng (máu đỏ hắt sau màng). Đủ hình thì một
 * nhịp đập: sóng đỏ loang dưới chân và quầng đỏ bùng quanh người (không lan tới địch). Không có nhịp số (onBeat) vì engine không
 * gây sát thương. Promise xong ngay nhịp đập; cánh rung nhẹ, quầng quỷ đọng rồi mờ dần chạy nền.
 */
registerSkillVfx("aatrox_r", async (ctx) => {
    const me = ctx.from
    const seed = rand(1, 999)
    const L = layers(ctx.layer)
    const shoulder = at(me, 0, 34)
    const SIZE = 140
    const wings = (open: number, alpha: number) => {
        wing(L, at(shoulder, 10, 0), 1, open, SIZE, alpha, seed)
        wing(L, at(shoulder, -10, 0), -1, open, SIZE, alpha, seed + 9)
    }
    const eyes = (k: number) => {
        if (k <= 0.01) return
        L.front.fillColor = col(EMBER, 0.9 * k)
        L.front.circle(me.x - 7, me.y + 46, 2.4 * k)
        L.front.circle(me.x + 7, me.y + 46, 2.4 * k)
        L.front.fill()
    }
    emit(ctx.layer, me, { color: [BLACK], kind: "glow", additive: false, life: [1.2, 1.2], size: [200, 280], alpha: 0.55 })
    // máu tụ về ngực, cánh xoè
    void charge(ctx.layer, at(me, 0, 30), BLOODP, 0.25, 60)
    await over(ctx.layer, 0.25, (t) => {
        L.clear()
        const o = ease.out(t)
        wings(o, 1)
        eyes(o)
        if (Math.random() < 0.7) emit(ctx.layer, at(shoulder, rand(-130, 130) * o, rand(0, 110) * o), { color: [EMBER, MOLTEN], kind: "dot", life: [0.3, 0.6], size: [5, 1], alpha: 1, speed: [20, 80], angle: [UP - 0.5, UP + 0.5] })
    })
    // nhịp đập hoá quỷ: quầng đỏ bùng quanh người, sóng loang dưới chân (chỉ quanh Aatrox)
    impact(ctx.layer, at(me, 0, 30), BLOODP, 0.9)
    emit(ctx.layer, at(me, 0, 30), { color: [CRIMSON], kind: "glow", life: [1, 1], size: [120, 220], alpha: 0.5 })
    groundWave(ctx.layer, at(me, 0, -30), BLOODP, 120, 0.5)
    bloodSpray(ctx.layer, at(me, 0, 20), 10, UP, 1.2, [100, 260])
    // dư âm chạy nền: cánh đập nhẹ rồi khép mờ, quầng quỷ và than hồng bốc lên
    void over(ctx.layer, 0.9, (t) => {
        L.clear()
        const hold = t < 0.55
        const fade = hold ? 1 : 1 - ease.in((t - 0.55) / 0.45)
        const open = hold ? 1 + 0.06 * Math.sin(t * 24) : 1 - 0.4 * (1 - fade)
        wings(open, fade)
        eyes(fade)
        if (t < 0.7 && Math.random() < 0.6) emit(ctx.layer, at(me, rand(-45, 45), rand(-30, 50)), { color: [EMBER, SCARLET, MOLTEN], kind: "dot", life: [0.4, 0.8], size: [5, 1], alpha: 1, speed: [30, 110], angle: [UP - 0.4, UP + 0.4], gravity: 40 })
    }).then(L.done)
    smokeAndEmbers(ctx.layer, at(me, 0, -10), 14, 40)
})
