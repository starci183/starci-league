// VFX Nami trên Cocos theo docs/VFX_RULES.md: NƯỚC BIỂN có khối. Lam sâu ở thân, xanh nước ở giữa, bọt trắng ở mép, điểm
// vàng ở gậy. Nước trong (viền sáng khúc xạ), bắn lên rồi rơi theo trọng lực, để lại vệt ướt. Viền mảnh.
// Ô: basic_nami (giọt nước), nami_q (dòng nước nảy đúng chặng engine), nami_e (bong bóng khiên + 3 giọt Phước Lành),
// nami_bless (Phước Lành được tiêu theo đòn của tướng mang), nami_r (sông giữa bàn dâng thành sóng, đổ sập, Choáng
// dùng hiệu ứng choáng chung), nami_p (Dậy Sóng: nước từ địch trúng đòn chảy về Nami). Dễ Tổn Thương là icon trạng thái, không vẽ ở đây.
import {
    Graphics, Node
} from "cc"
import {
    angleOf, burst, dist, ease, emit, lerp, mix, over, rand, wait, type Pt
} from "./particles"
import {
    stunStars
} from "./g1_helpers"
import {
    registerSkillVfx, type Hop, type VfxCtx
} from "./registry"
import {
    TAU, UP, arcPt, canvas, col, polar, polyline, seeded, taper
} from "./shape"

const FOAM = 0xf2fdff
const AQUA = 0x4fd8ff
const TEAL = 0x2fe0c8
const DEEP = 0x1778c4
const NAVY = 0x0b3f7a
const MINT = 0x8dffd0
const GOLD = 0xffd77a
const SPRAY = [FOAM, AQUA, 0xbff3ff]
/** Trọng lực của giọt nước (px/s², y hướng lên nên âm là rơi) */
const FALL = -900

const power = (ctx: VfxCtx) => ctx.style.intensity ?? 1

/**
 * Chia các cú trúng của một lần dùng chiêu Nami thành nhịp, dùng chung cho màn trận và Thư viện tướng: Q mỗi chặng một nhịp
 * (mỗi cú hồi máu hoặc sát thương chiêu mở một nhịp, sát thương phụ đi theo nhịp đang chạy); E và R một nhịp cho tất cả.
 */
export function namiGroups<T extends { kind: string; tag?: string }>(skill: string, list: T[]): T[][] {
    if (skill !== "Q") return list.length ? [list] : []
    const out: T[][] = []
    for (const h of list) {
        if (h.kind === "heal" || (h.kind === "damage" && h.tag === "skill") || !out.length) out.push([])
        out[out.length - 1].push(h)
    }
    return out
}

/** Các cú chính (hồi máu, khiên, sát thương chiêu) trong các nhịp: Q lấy cú mở mỗi chặng; E, R lấy hết để phủ đủ mọi mục tiêu */
export function namiPrimary<T extends { kind: string; tag?: string }>(skill: string, groups: T[][]): T[] {
    if (skill === "Q") return groups.map((g) => g[0])
    return groups.flat().filter((h) => h.kind !== "damage" || h.tag === "skill")
}

// ---------- chất nước ----------

/**
 * Khối nước: mép rung rinh (hai sóng lệch pha), kéo dài theo hướng bay `dir` khi đang bay (`stretch` > 1).
 * Thân lam trong, lõi xanh nước, viền bọt mảnh, một vệt sáng phản chiếu phía trên.
 */
function blob(body: Graphics, shine: Graphics, at: Pt, r: number, t: number, dir: number, stretch: number, alpha = 1) {
    const n = 20
    const pts: Pt[] = []
    for (let i = 0; i < n; i++) {
        const a = i / n * TAU
        const w = 1 + Math.sin(a * 3 + t * 9) * 0.07 + Math.sin(a * 5 - t * 13) * 0.04
        // kéo dài dọc hướng bay, đuôi thon hơn đầu
        const along = Math.cos(a - dir)
        const s = along > 0 ? 1 + (stretch - 1) * 0.35 : 1 + (stretch - 1) * along * -1
        const lx = Math.cos(a - dir) * r * w * s, ly = Math.sin(a - dir) * r * w / Math.sqrt(stretch)
        pts.push({ x: at.x + lx * Math.cos(dir) - ly * Math.sin(dir), y: at.y + lx * Math.sin(dir) + ly * Math.cos(dir) })
    }
    const fill = (g: Graphics, scale: number, c: number, a: number) => {
        g.fillColor = col(c, a * alpha)
        g.moveTo(at.x + (pts[0].x - at.x) * scale, at.y + (pts[0].y - at.y) * scale)
        for (const p of pts) g.lineTo(at.x + (p.x - at.x) * scale, at.y + (p.y - at.y) * scale)
        g.close()
        g.fill()
    }
    fill(body, 1, DEEP, 0.6)
    fill(body, 0.72, AQUA, 0.5)
    shine.lineWidth = 1
    shine.strokeColor = col(FOAM, 0.75 * alpha)
    shine.moveTo(pts[0].x, pts[0].y)
    for (const p of pts) shine.lineTo(p.x, p.y)
    shine.close()
    shine.stroke()
    // vệt sáng phản chiếu: cung ngắn phía trên trái
    shine.lineWidth = 1.6
    shine.strokeColor = col(FOAM, 0.9 * alpha)
    const hl = { x: at.x - r * 0.25, y: at.y + r * 0.3 }
    shine.arc(hl.x, hl.y, r * 0.45, Math.PI * 0.55, Math.PI * 0.95, false)
    shine.stroke()
}

/** Vương miện giọt: nước đập vào mục tiêu, giọt bắn lên NGƯỢC hướng tới rồi rơi theo trọng lực, vòng nước dẹt loang ra, vệt ướt mờ dần */
function splash(layer: Node, at: Pt, k: number, from?: Pt) {
    const back = from ? angleOf(at, from) : UP
    const up = Math.abs(Math.sin(back)) < 0.3 ? UP : back
    void burst(layer, at, Math.round(26 * k), {
        color: SPRAY, kind: "dot", life: [0.35, 0.7], size: [6 * k, 2], alpha: 1, speed: [160, 420],
        angle: [up - 0.9, up + 0.9], gravity: FALL, drag: 0.6, spread: 10
    })
    void burst(layer, at, Math.round(8 * k), {
        color: [FOAM, AQUA], kind: "blade", life: [0.16, 0.3], size: [18 * k, 4], alpha: 0.9, speed: [220, 460],
        angle: [up - 0.7, up + 0.7], drag: 2, align: true, stretch: 2.2, gravity: FALL * 0.5
    })
    emit(layer, at, { color: [FOAM], kind: "glow", life: [0.14, 0.14], size: [40 * k, 100 * k], alpha: 0.8 })
    // vòng nước dẹt và vệt ướt: chạy nền
    const c = canvas(layer, false)
    void over(layer, 0.6, (t) => {
        c.g.clear()
        const r = lerp(14, 58, ease.out(t)) * k
        c.g.lineWidth = 1.2
        c.g.strokeColor = col(FOAM, 0.7 * (1 - t))
        c.g.ellipse(at.x, at.y - 14 * k, r, r * 0.32)
        c.g.stroke()
        c.g.fillColor = col(NAVY, 0.22 * (1 - t))
        c.g.ellipse(at.x, at.y - 14 * k, r * 0.7, r * 0.22)
        c.g.fill()
    }).then(c.done)
}

/** Hồi máu bằng nước: nước thấm vào lá, bọt khí nổi lên, gợn tròn mảnh, ánh xanh ngọc. Không bắn tung toé */
function soak(layer: Node, at: Pt, k: number) {
    emit(layer, at, { color: [TEAL], kind: "glow", life: [0.4, 0.4], size: [50 * k, 120 * k], alpha: 0.45 })
    void burst(layer, at, Math.round(16 * k), {
        color: [MINT, FOAM, AQUA], kind: "dot", life: [0.5, 0.9], size: [5, 2], alpha: 0.9, speed: [20, 70],
        angle: [UP - 0.5, UP + 0.5], gravity: 60, spread: 34 * k
    })
    const c = canvas(layer)
    void over(layer, 0.5, (t) => {
        c.g.clear()
        for (const lag of [0, 0.25]) {
            const u = Math.max(0, t - lag) / (1 - lag)
            if (u <= 0) continue
            c.g.lineWidth = 1
            c.g.strokeColor = col(MINT, 0.7 * (1 - u))
            c.g.ellipse(at.x, at.y - 10, lerp(10, 54, ease.out(u)) * k, lerp(4, 18, ease.out(u)) * k)
            c.g.stroke()
        }
    }).then(c.done)
}

/**
 * Dòng nước chảy a -> b theo cung võng `bend`: đầu là khối nước nhỏ, thân là dải nước thon (lam, xanh, chỉ bọt) kéo theo
 * vài chục điểm vừa đi qua, giọt rơi khỏi thân. Xong khi đầu tới đích; thân rút nốt ở nền.
 */
async function stream(layer: Node, a: Pt, b: Pt, secs: number, w: number, bend: number) {
    const body = canvas(layer, false)
    const shine = canvas(layer)
    const trail: Pt[] = []
    const dir = angleOf(a, b)
    const draw = (head: Pt, t: number, fade: number) => {
        body.g.clear()
        shine.g.clear()
        if (trail.length > 1) {
            taper(body.g, trail, 1, w * 1.1, col(DEEP, 0.5 * fade))
            taper(body.g, trail, 0.5, w * 0.7, col(AQUA, 0.6 * fade))
            polyline(shine.g, trail.slice(Math.floor(trail.length / 3)), 1, col(FOAM, 0.8 * fade))
        }
        if (fade > 0.5) blob(body.g, shine.g, head, w * 0.75, t, dir, 1.35, fade)
    }
    await over(layer, secs, (t) => {
        const head = arcPt(a, b, bend, ease.inOut(t))
        trail.push(head)
        if (trail.length > 14) trail.shift()
        draw(head, t, 1)
        if (Math.random() < 0.7) emit(layer, head, {
            color: SPRAY, kind: "dot", life: [0.3, 0.5], size: [4, 1.5], alpha: 0.9, speed: [10, 60], angle: [-UP - 1, -UP + 1],
            gravity: FALL * 0.6, spread: w * 0.3
        })
    })
    void over(layer, 0.14, (t) => {
        trail.shift()
        draw(b, 1, 1 - t)
    }).then(() => { body.done(); shine.done() })
}

// ---------- Đánh thường ----------

/** Đánh thường: một khối nước bay cung nhẹ từ gậy Nami, chạm thì vỡ thành vương miện giọt. Xong đúng lúc vỡ */
registerSkillVfx("basic_nami", async (ctx) => {
    const k = power(ctx)
    const targets = ctx.to.length ? ctx.to : [polar(ctx.from, UP, 300)]
    emit(ctx.layer, ctx.from, { color: [GOLD], kind: "glow", life: [0.14, 0.14], size: [20, 60], alpha: 0.8 })
    await Promise.all(targets.map(async (to) => {
        const body = canvas(ctx.layer, false)
        const shine = canvas(ctx.layer)
        const dir = angleOf(ctx.from, to)
        const bend = dist(ctx.from, to) * 0.12
        let prev = ctx.from
        await over(ctx.layer, Math.min(0.26, 0.12 + dist(ctx.from, to) / 2600), (t) => {
            const p = arcPt(ctx.from, to, bend, ease.in(t))
            body.g.clear()
            shine.g.clear()
            blob(body.g, shine.g, p, 11 * k, t, angleOf(prev, p) || dir, 1.5)
            prev = p
            if (Math.random() < 0.6) emit(ctx.layer, p, {
                color: SPRAY, kind: "dot", life: [0.25, 0.45], size: [3.5, 1], alpha: 0.9, speed: [10, 40], gravity: FALL * 0.5
            })
        })
        body.done()
        shine.done()
        splash(ctx.layer, to, 0.75 * k, ctx.from)
        ctx.onBeat?.(0)
    }))
})

// ---------- Q Thuỷ Triều ----------

/** Các chặng của Q: lấy từ engine (ctx.hops); thiếu thì dựng tạm từ ctx.to theo thứ tự đồng minh, địch xen kẽ (chỉ cho màn ?vfx) */
function qHops(ctx: VfxCtx): Hop[] {
    if (ctx.hops?.length) return ctx.hops
    const out: Hop[] = []
    let at = ctx.from
    ctx.to.forEach((to, i) => {
        out.push({ from: at, to, kind: i % 2 ? "damage" : "heal" })
        at = to
    })
    return out
}

/**
 * Q: dòng nước nảy đúng các chặng engine báo (Nami -> đồng minh -> địch -> đồng minh khác -> địch khác). Tới đồng minh thì
 * thấm vào (hồi máu, bọt nổi), tới địch thì đập vỡ (vương miện giọt). Mỗi chặng một nhịp, số bật đúng lúc tới.
 */
registerSkillVfx("nami_q", async (ctx) => {
    const k = power(ctx)
    const hops = qHops(ctx)
    emit(ctx.layer, ctx.from, { color: [GOLD], kind: "glow", life: [0.18, 0.18], size: [24, 80], alpha: 0.8 })
    const rnd = seeded(hops.length * 7 + 3)
    for (let i = 0; i < hops.length; i++) {
        const h = hops[i]
        if (dist(h.from, h.to) > 8) await stream(ctx.layer, h.from, h.to, Math.min(0.26, 0.14 + dist(h.from, h.to) / 3000), 18 * k, (rnd() - 0.5) * 120)
        ctx.onBeat?.(i)
        if (h.kind === "damage") splash(ctx.layer, h.to, 0.9 * k, h.from)
        else soak(ctx.layer, h.to, k)
        await wait(ctx.layer, 0.04)
    }
})

// ---------- E Phước Lành Thuỷ Triều ----------

/** Bong bóng nước bọc lá: lớn dần rồi khép, rung rinh; viền bọt mảnh, vệt khúc xạ phía trên, vân nước lăn tăn bên trong */
function drawBubble(g: Graphics, at: Pt, rx: number, ry: number, t: number, a: number) {
    const n = 28
    const pts: Pt[] = []
    for (let i = 0; i < n; i++) {
        const ang = i / n * TAU
        const w = 1 + Math.sin(ang * 4 + t * 7) * 0.025 + Math.sin(ang * 2 - t * 5) * 0.02
        pts.push({ x: at.x + Math.cos(ang) * rx * w, y: at.y + Math.sin(ang) * ry * w })
    }
    g.fillColor = col(AQUA, 0.16 * a)
    g.moveTo(pts[0].x, pts[0].y)
    for (const p of pts) g.lineTo(p.x, p.y)
    g.close()
    g.fill()
    g.lineWidth = 3
    g.strokeColor = col(AQUA, 0.35 * a)
    g.moveTo(pts[0].x, pts[0].y)
    for (const p of pts) g.lineTo(p.x, p.y)
    g.close()
    g.stroke()
    g.lineWidth = 1.2
    g.strokeColor = col(FOAM, 0.95 * a)
    g.moveTo(pts[0].x, pts[0].y)
    for (const p of pts) g.lineTo(p.x, p.y)
    g.close()
    g.stroke()
    // khúc xạ: cung sáng phía trên trái, cung mờ phía dưới phải
    g.lineWidth = 2
    g.strokeColor = col(FOAM, 0.85 * a)
    g.arc(at.x, at.y, Math.min(rx, ry) * 0.82, Math.PI * 0.6, Math.PI * 0.9, false)
    g.stroke()
    g.lineWidth = 1
    g.strokeColor = col(AQUA, 0.45 * a)
    g.arc(at.x, at.y, Math.min(rx, ry) * 0.86, -Math.PI * 0.4, -Math.PI * 0.1, false)
    g.stroke()
    // vân nước lăn tăn (caustic): vài nét gợn ngắn trôi chậm
    for (let j = 0; j < 3; j++) {
        const cy = at.y + (j - 1) * ry * 0.35 + Math.sin(t * 2 + j) * 4
        const line: Pt[] = []
        for (let s = 0; s <= 6; s++) {
            const x = at.x - rx * 0.45 + s / 6 * rx * 0.9
            line.push({ x, y: cy + Math.sin(s * 1.3 + t * 6 + j * 2) * 3 })
        }
        polyline(g, line, 0.8, col(FOAM, 0.35 * a))
    }
}

/**
 * E: hai dòng nước mảnh xoắn từ Nami sang đồng minh; tới nơi một bong bóng nước lớn dần rồi khép kín bọc lá (nhịp 0: số
 * Khiên). Ba giọt Phước Lành vàng ánh nước xoay quanh rồi đậu xuống mép lá; bong bóng mờ dần vào lá.
 */
registerSkillVfx("nami_e", async (ctx) => {
    const k = power(ctx)
    const to = ctx.hops?.[0]?.to ?? ctx.to[0] ?? ctx.from
    const RX = 52 * k, RY = 60 * k
    emit(ctx.layer, ctx.from, { color: [GOLD], kind: "glow", life: [0.18, 0.18], size: [24, 80], alpha: 0.8 })
    if (dist(ctx.from, to) > 8) await Promise.all([
        stream(ctx.layer, ctx.from, to, 0.26, 9 * k, 60),
        stream(ctx.layer, ctx.from, to, 0.26, 9 * k, -60),
    ])
    const c = canvas(ctx.layer)
    let time = 0
    // bong bóng lớn dần, nảy nhẹ rồi khép
    await over(ctx.layer, 0.2, (t) => {
        time += 1 / 60
        const s = ease.out(t) * (1 + Math.sin(t * Math.PI) * 0.08)
        c.g.clear()
        drawBubble(c.g, to, RX * s, RY * s, time, 1)
    })
    ctx.onBeat?.(0)
    emit(ctx.layer, to, { color: [FOAM], kind: "glow", life: [0.16, 0.16], size: [40, 120], alpha: 0.6 })
    // ba giọt Phước Lành xoay quanh rồi đậu xuống mép lá; bong bóng mờ dần (chạy nền)
    void (async () => {
        const drops = canvas(ctx.layer)
        await over(ctx.layer, 0.6, (t) => {
            time += 1 / 60
            c.g.clear()
            drawBubble(c.g, to, RX, RY, time, 1 - ease.in(t) * 0.9)
            drops.g.clear()
            for (let i = 0; i < 3; i++) {
                const a = t * 5 + i * TAU / 3
                const r = lerp(RX * 1.05, RX * 0.7, ease.in(t))
                const p = t < 0.75 ? polar(to, a, r, 0.85) : mix(polar(to, a, r, 0.85), { x: to.x - RX * 0.6 + i * RX * 0.6, y: to.y - RY * 0.95 }, (t - 0.75) / 0.25)
                drops.g.fillColor = col(GOLD, 0.95)
                drops.g.circle(p.x, p.y, 3.2 * k)
                drops.g.fill()
                drops.g.fillColor = col(AQUA, 0.5)
                drops.g.circle(p.x, p.y, 5.5 * k)
                drops.g.fill()
                if (Math.random() < 0.3) emit(ctx.layer, p, { color: [GOLD, FOAM], kind: "dot", life: [0.2, 0.35], size: [3, 1], alpha: 0.9, speed: [5, 20] })
            }
        })
        c.done()
        drops.done()
    })()
})

/** Phước Lành được tiêu: một giọt vàng ánh nước bay nhanh theo đòn của tướng mang tới địch, vỡ thành tia vàng và giọt bắn (nhịp 0) */
registerSkillVfx("nami_bless", async (ctx) => {
    const k = power(ctx)
    await Promise.all((ctx.to.length ? ctx.to : [polar(ctx.from, UP, 300)]).map(async (to) => {
        const c = canvas(ctx.layer)
        await over(ctx.layer, 0.16, (t) => {
            const p = mix(ctx.from, to, ease.in(t))
            c.g.clear()
            c.g.fillColor = col(GOLD, 1)
            c.g.circle(p.x, p.y, 3.5 * k)
            c.g.fill()
            c.g.fillColor = col(AQUA, 0.45)
            c.g.circle(p.x, p.y, 7 * k)
            c.g.fill()
            emit(ctx.layer, p, { color: [GOLD, FOAM], kind: "dot", life: [0.15, 0.3], size: [3, 1], alpha: 0.9, speed: [5, 30] })
        })
        c.done()
        ctx.onBeat?.(0)
        void burst(ctx.layer, to, 10, { color: [GOLD, FOAM], kind: "blade", life: [0.12, 0.26], size: [14, 3], alpha: 1, speed: [160, 360], drag: 2, align: true, stretch: 2 })
        splash(ctx.layer, to, 0.5 * k, ctx.from)
    }))
})

// ---------- R Sóng Thần ----------

/**
 * Bức tường nước ngang từ x0 tới x1, chân ở `base`, đỉnh cao `h` về phía `dir` (+1 lên, -1 xuống). Đỉnh lởm chởm có bọt,
 * thân tối ở chân sáng dần lên đỉnh; `seed` giữ hình đỉnh sóng, `t` cho gợn chạy.
 */
function drawWave(body: Graphics, shine: Graphics, x0: number, x1: number, base: number, h: number, dir: number, t: number, seed: number) {
    if (h <= 1) { body.clear(); shine.clear(); return }
    const rnd = seeded(seed)
    const n = 40
    const ph = [rnd() * 6, rnd() * 6, rnd() * 6]
    const crest: Pt[] = []
    for (let i = 0; i <= n; i++) {
        const u = i / n
        const x = lerp(x0, x1, u)
        const edge = Math.min(1, u * 5, (1 - u) * 5)
        const lump = 1 + Math.sin(u * 9 + ph[0] + t * 3) * 0.12 + Math.sin(u * 23 + ph[1] - t * 5) * 0.06 + Math.sin(u * 51 + ph[2] + t * 9) * 0.03
        crest.push({ x, y: base + dir * h * lump * (0.35 + 0.65 * edge) })
    }
    const band = (from: number, to: number, c: number, a: number) => {
        body.fillColor = col(c, a)
        body.moveTo(crest[0].x, base + dir * h * from)
        for (const p of crest) body.lineTo(p.x, base + (p.y - base) * to)
        for (let i = crest.length - 1; i >= 0; i--) body.lineTo(crest[i].x, base + (crest[i].y - base) * from)
        body.close()
        body.fill()
    }
    body.clear()
    shine.clear()
    // thân trong: chân tối nhạt, giữa lam, gần đỉnh xanh nước; đủ trong để còn thấy lá bên dưới
    band(-0.1, 1, NAVY, 0.28)
    band(0.3, 1, DEEP, 0.3)
    band(0.7, 1, AQUA, 0.32)
    // mép cuộn: dải mỏng vượt lên trước đỉnh rồi quặp xuống, như sóng sắp đổ
    const lip = crest.map((p, i) => ({ x: p.x + Math.sin(i * 0.5 + t * 4) * 3, y: p.y + dir * h * 0.16 }))
    const lipDown = crest.map((p) => ({ x: p.x, y: p.y + dir * h * 0.02 }))
    body.fillColor = col(AQUA, 0.35)
    body.moveTo(lip[0].x, lip[0].y)
    for (const p of lip) body.lineTo(p.x, p.y)
    for (let i = lipDown.length - 1; i >= 0; i--) body.lineTo(lipDown[i].x, lipDown[i].y)
    body.close()
    body.fill()
    // bọt: chỉ mảnh trên mép cuộn và đỉnh, quầng nhẹ
    polyline(shine, lip, 3, col(AQUA, 0.3))
    polyline(shine, lip, 1.2, col(FOAM, 0.95))
    polyline(shine, crest, 0.8, col(FOAM, 0.55))
    // vân nước dọc thân
    for (let j = 1; j <= 2; j++) {
        const line = crest.map((p, i) => ({ x: p.x, y: base + (p.y - base) * (0.35 * j) + Math.sin(i * 0.7 + t * 6 + j) * 2 }))
        polyline(shine, line, 0.8, col(FOAM, 0.22))
    }
}

/**
 * R: Nami giơ gậy (loé vàng), dòng sông giữa bàn trào lên thành bức tường nước chạy về hàng địch, đỉnh có bọt và bụi nước
 * tung phía sau; sóng đổ sập lên mọi tướng trúng (nhịp 0: số của tất cả), vương miện giọt trên từng lá, nước rút; rồi mỗi
 * tướng hiện hiệu ứng Choáng chung. Dễ Tổn Thương là icon trạng thái, không vẽ.
 */
registerSkillVfx("nami_r", async (ctx) => {
    const k = power(ctx)
    const targets = ctx.hops?.length ? [...new Map(ctx.hops.map((h) => [`${Math.round(h.to.x)},${Math.round(h.to.y)}`, h.to])).values()] : ctx.to.length ? ctx.to : [polar(ctx.from, UP, 300)]
    const rowY = targets.reduce((s, p) => s + p.y, 0) / targets.length
    const dir = rowY >= ctx.from.y ? 1 : -1
    const river = (ctx.from.y + rowY) / 2
    const xs = targets.map((p) => p.x).concat([ctx.from.x])
    const x0 = Math.min(...xs) - 110, x1 = Math.max(...xs) + 110
    const seed = rand(1, 999)
    // gậy loé vàng
    emit(ctx.layer, ctx.from, { color: [GOLD], kind: "glow", life: [0.25, 0.25], size: [30, 120], alpha: 0.9 })
    void burst(ctx.layer, ctx.from, 10, { color: [GOLD, FOAM], kind: "dot", life: [0.2, 0.4], size: [4, 1], alpha: 1, speed: [40, 140], angle: [UP - 0.6, UP + 0.6] })
    await wait(ctx.layer, 0.12)
    const body = canvas(ctx.layer, false)
    const shine = canvas(ctx.layer)
    let time = 0
    const H = 52 * k
    // 1) sông trào lên thành sóng
    await over(ctx.layer, 0.22, (t) => {
        time += 1 / 60
        drawWave(body.g, shine.g, x0, x1, river - dir * 10, H * ease.out(t) * 0.7, dir, time, seed)
    })
    // 2) sóng chạy về hàng địch, bọt và bụi nước tung phía sau đỉnh
    await over(ctx.layer, 0.32, (t) => {
        time += 1 / 60
        const base = lerp(river - dir * 10, rowY - dir * 40 * k, ease.in(t))
        const h = H * (0.7 + 0.3 * t)
        drawWave(body.g, shine.g, x0, x1, base, h, dir, time, seed)
        for (let i = 0; i < 3; i++) emit(ctx.layer, { x: rand(x0 + 30, x1 - 30), y: base + dir * h * 0.95 }, {
            color: SPRAY, kind: "dot", life: [0.3, 0.6], size: [5, 1.5], alpha: 0.9, speed: [40, 140],
            angle: dir > 0 ? [UP - 0.8 + Math.PI * 0.1, UP + 0.8] : [-UP - 0.8, -UP + 0.8], gravity: FALL * 0.4 * dir
        })
    })
    // 3) đổ sập: nhịp 0, vương miện giọt trên từng tướng
    ctx.onBeat?.(0)
    for (const p of targets) splash(ctx.layer, p, 1.15 * k, { x: p.x, y: p.y - dir * 100 })
    const crashBase = rowY - dir * 40 * k
    await over(ctx.layer, 0.16, (t) => {
        time += 1 / 60
        drawWave(body.g, shine.g, x0, x1, crashBase + dir * 30 * k * t, H * (1 - ease.in(t)), dir, time, seed)
    })
    body.done()
    shine.done()
    // 4) nước rút: vệt ướt bóng trên lá; Choáng: hiệu ứng choáng chung (sao xoay trên đầu)
    for (const p of targets) emit(ctx.layer, p, { color: [AQUA], kind: "glow", life: [0.5, 0.5], size: [80 * k, 110 * k], alpha: 0.25 })
    await Promise.all(targets.map((p) => stunStars(ctx.layer, p, 0.6)))
})

// ---------- Nội tại Dậy Sóng ----------

/**
 * P: giọt nước bốc lên từ (các) tướng địch vừa trúng đòn, chảy thành dòng mảnh về Nami; quanh lá Nami nước xoáy dâng lên
 * thành vòng; các đồng minh loé ánh xanh (được cộng AP).
 */
registerSkillVfx("nami_p", async (ctx) => {
    const k = power(ctx)
    const sources = ctx.to.length ? ctx.to : [polar(ctx.from, UP, 300)]
    for (const s of sources) void burst(ctx.layer, s, 10, { color: SPRAY, kind: "dot", life: [0.25, 0.4], size: [4, 1.5], alpha: 0.9, speed: [30, 90], angle: [UP - 0.5, UP + 0.5] })
    await Promise.all(sources.map((s, i) => stream(ctx.layer, s, ctx.from, 0.34, 7 * k, (i % 2 ? 1 : -1) * 70)))
    const c = canvas(ctx.layer)
    await over(ctx.layer, 0.4, (t) => {
        c.g.clear()
        // vòng nước xoáy dâng: vài cung nước mảnh quay quanh lá, cao dần
        for (let j = 0; j < 3; j++) {
            const a0 = t * 7 + j * TAU / 3
            const pts: Pt[] = []
            for (let s = 0; s <= 10; s++) {
                const a = a0 + s * 0.16
                pts.push(polar({ x: ctx.from.x, y: ctx.from.y - 30 + t * 50 * k }, a, 46 * k, 0.35))
            }
            taper(c.g, pts, 0.5, 4 * k, col(AQUA, 0.7 * (1 - t * 0.6)))
            polyline(c.g, pts.slice(5), 1, col(FOAM, 0.8 * (1 - t)))
        }
    })
    c.done()
    emit(ctx.layer, ctx.from, { color: [TEAL, GOLD], kind: "glow", life: [0.3, 0.3], size: [40, 130], alpha: 0.6 })
    await wait(ctx.layer, 0.1)
})
