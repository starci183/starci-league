// VFX Miss Fortune trên Cocos theo docs/VFX_RULES.md: THUỐC SÚNG. Hai khẩu súng lục hai bên người, chớp nòng vàng trắng,
// viên đạn tròn nóng (lõi trắng, viền đồng, quầng cam), tia lửa kim loại văng NGƯỢC hướng bắn, khói súng xám bay lên tan dần,
// bụi đất bắn khi đạn ghim xuống đất. Phát chí mạng: vệt dày và sáng hơn, chớp nòng to, nổ sao vàng ở chỗ trúng.
// Ô: basic_missfortune, missfortune_q (1x1), missfortune_e (3x3: mưa đạn trút xuống 3 ô theo 3 đợt), missfortune_r (5x5:
// 5 loạt quạt đạn vào mọi tướng), missfortune_p (đồng xu may mắn tung lên). Mục tiêu và chí mạng lấy từ ctx.hops (engine).
import {
    Node
} from "cc"
import {
    angleOf, burst, dist, ease, emit, lerp, mix, over, rand, wait, type Pt
} from "./particles"
import {
    registerSkillVfx, type Hop, type VfxCtx
} from "./registry"
import {
    TAU, UP, canvas, col, polar, polyline
} from "./shape"

const WHITE = 0xfffbef
const FLASH = 0xfff2c0
const BRASS = 0xffd27a
const EMBER = 0xff9a3c
const CRIMSON = 0xd8283f
const SMOKE = [0x8a8580, 0x6d6964, 0xa8a29a]
const DIRT = [0x5a4636, 0x7a6048, 0x3e3026]
const SPARK = [WHITE, BRASS, EMBER]
/** Trọng lực (px/s², y hướng lên nên âm là rơi) */
const FALL = -700

const power = (ctx: VfxCtx) => ctx.style.intensity ?? 1

/**
 * Chia các phát của một lần dùng chiêu thành đợt (loạt): mở đợt mới khi một mục tiêu bị trúng lần nữa. Dùng chung cho màn
 * trận và Thư viện tướng; nhịp i = đợt i (Q 1 đợt, E 3 đợt, R 5 loạt).
 */
export function mfWaves<T extends { target?: string; to?: Pt }>(list: T[]): T[][] {
    const out: T[][] = []
    let seen = new Set<string>()
    for (const h of list) {
        const key = h.target ?? `${Math.round(h.to?.x ?? 0)},${Math.round(h.to?.y ?? 0)}`
        if (!out.length || seen.has(key)) { out.push([]); seen = new Set() }
        seen.add(key)
        out[out.length - 1].push(h)
    }
    return out
}

/** Hai nòng súng hai bên người Miss Fortune; `side` -1 trái, +1 phải */
const muzzle = (from: Pt, side: number, to: Pt): Pt => {
    const d = angleOf(from, to)
    return { x: from.x + Math.cos(d) * 18 + Math.cos(d + UP) * 13 * side, y: from.y + Math.sin(d) * 18 + Math.sin(d + UP) * 13 * side }
}

/** Chớp nòng: loé vàng trắng, vài tia sáng ngắn hướng về trước, khói súng nhỏ */
function flash(layer: Node, at: Pt, dir: number, big: number) {
    emit(layer, at, { color: [FLASH], kind: "glow", life: [0.07, 0.09], size: [26 * big, 10 * big], alpha: 1 })
    emit(layer, at, { color: [BRASS], kind: "glow", life: [0.1, 0.12], size: [44 * big, 16 * big], alpha: 0.55 })
    void burst(layer, at, Math.round(5 * big), {
        color: [WHITE, FLASH], kind: "blade", life: [0.05, 0.09], size: [16 * big, 4], alpha: 1, speed: [60, 160],
        angle: [dir - 0.35, dir + 0.35], align: true, stretch: 2.4, drag: 3
    })
    void burst(layer, at, Math.round(4 * big), {
        color: SMOKE, kind: "glow", additive: false, life: [0.4, 0.8], size: [8, 22 * big], alpha: 0.35, speed: [10, 40],
        angle: [UP - 0.8, UP + 0.8], drag: 1.5, spread: 4
    })
}

/**
 * Viên đạn tròn bay a -> b: hòn đạn kim loại nóng (lõi trắng vàng, viền đồng thau, quầng cam nhỏ), chỉ để lại một vệt mờ rất
 * ngắn ngay sau lưng do chuyển động, không phải tia laser. Xong khi viên đạn chạm đích. `crit` thì viên to và sáng hơn.
 */
async function bullet(layer: Node, a: Pt, b: Pt, secs: number, crit: boolean, size = 1) {
    const c = canvas(layer)
    const r = (crit ? 6 : 4.6) * size
    const dir = angleOf(a, b)
    await over(layer, secs, (t) => {
        const p = mix(a, b, t)
        const smear = { x: p.x - Math.cos(dir) * r * 3, y: p.y - Math.sin(dir) * r * 3 }
        c.g.clear()
        polyline(c.g, [smear, p], r * 1.2, col(EMBER, 0.22))
        c.g.fillColor = col(EMBER, 0.35)
        c.g.circle(p.x, p.y, r * 1.9)
        c.g.fill()
        c.g.fillColor = col(BRASS, 1)
        c.g.circle(p.x, p.y, r)
        c.g.fill()
        c.g.fillColor = col(WHITE, 1)
        c.g.circle(p.x - r * 0.25, p.y + r * 0.25, r * 0.45)
        c.g.fill()
    })
    c.done()
}

/** Đạn trúng tướng: tia lửa kim loại văng ngược hướng bắn, khói nhỏ; chí mạng thêm sao vàng nổ và vòng sóng mảnh */
function hit(layer: Node, at: Pt, from: Pt, crit: boolean, k: number) {
    const back = angleOf(at, from)
    const jitter = { x: at.x + rand(-14, 14), y: at.y + rand(-12, 12) }
    void burst(layer, jitter, Math.round((crit ? 22 : 13) * k), {
        color: SPARK, kind: "blade", life: [0.12, 0.28], size: [16 * k, 2], alpha: 1, speed: [180, 480],
        angle: [back - 0.9, back + 0.9], drag: 2.4, align: true, stretch: 2.2, gravity: FALL * 0.4
    })
    void burst(layer, jitter, Math.round(6 * k), {
        color: [BRASS, EMBER], kind: "dot", life: [0.2, 0.45], size: [2.4, 0.8], alpha: 1, speed: [60, 200],
        angle: [back - 1.2, back + 1.2], gravity: FALL
    })
    emit(layer, jitter, { color: [FLASH], kind: "glow", life: [0.08, 0.1], size: [18 * k, 46 * k], alpha: 0.8 })
    void burst(layer, jitter, 2, {
        color: SMOKE, kind: "glow", additive: false, life: [0.4, 0.7], size: [6, 18], alpha: 0.3, speed: [10, 30], angle: [UP - 0.6, UP + 0.6]
    })
    if (!crit) return
    // chí mạng: sao vàng bốn cánh nổ ra, vòng sóng mảnh
    const c = canvas(layer)
    void over(layer, 0.26, (t) => {
        const r = lerp(8, 34, ease.out(t)) * k
        c.g.clear()
        for (let i = 0; i < 4; i++) {
            const a = i * TAU / 4 + 0.4
            polyline(c.g, [polar(jitter, a, r * 0.2), polar(jitter, a, r)], 1.4 * (1 - t) + 0.4, col(FLASH, 1 - t))
        }
        c.g.lineWidth = 1
        c.g.strokeColor = col(BRASS, 0.8 * (1 - t))
        c.g.circle(jitter.x, jitter.y, r * 0.9)
        c.g.stroke()
    }).then(c.done)
    emit(layer, jitter, { color: [BRASS], kind: "glow", life: [0.16, 0.16], size: [30 * k, 90 * k], alpha: 0.6 })
}

/** Đạn ghim xuống đất (đạn lạc): chớp nhỏ, đất vụn bắn lên rồi rơi, bụi đất bốc nhẹ, lỗ đạn sẫm mờ dần */
function dirt(layer: Node, at: Pt) {
    void burst(layer, at, 9, {
        color: DIRT, kind: "dot", additive: false, life: [0.25, 0.55], size: [3, 1], alpha: 0.95, speed: [50, 170],
        angle: [UP - 0.7, UP + 0.7], gravity: FALL
    })
    void burst(layer, at, 3, {
        color: [0x8a7560, 0x6e5c4a], kind: "glow", additive: false, life: [0.4, 0.7], size: [6, 20], alpha: 0.35, speed: [8, 30],
        angle: [UP - 0.5, UP + 0.5]
    })
    emit(layer, at, { color: [FLASH], kind: "glow", life: [0.06, 0.08], size: [8, 18], alpha: 0.9 })
    const c = canvas(layer, false)
    void over(layer, 0.7, (t) => {
        c.g.clear()
        c.g.fillColor = col(0x1a120c, 0.5 * (1 - t))
        c.g.ellipse(at.x, at.y, 2.6, 1.4)
        c.g.fill()
    }).then(c.done)
}

/** Các phát của chiêu: lấy từ engine (ctx.hops); thiếu thì dựng tạm mỗi đích một phát (chỉ cho màn ?vfx) */
const shotsOf = (ctx: VfxCtx): Hop[] => ctx.hops?.length ? ctx.hops : (ctx.to.length ? ctx.to : [polar(ctx.from, UP, 300)]).map((to) => ({ from: ctx.from, to, kind: "damage" as const }))

// ---------- Đánh thường ----------

/** Đánh thường: một viên đạn tròn nhỏ bay từ tâm tới mục tiêu, trúng là tia lửa nhỏ. Xong đúng lúc trúng */
registerSkillVfx("basic_missfortune", async (ctx) => {
    const k = power(ctx)
    await Promise.all((ctx.to.length ? ctx.to : [polar(ctx.from, UP, 300)]).map(async (to) => {
        flash(ctx.layer, ctx.from, angleOf(ctx.from, to), 0.7)
        await bullet(ctx.layer, ctx.from, to, Math.min(0.18, 0.08 + dist(ctx.from, to) / 4000), false, 0.85)
        ctx.onBeat?.(0)
        hit(ctx.layer, to, ctx.from, false, 0.7 * k)
    }))
})

// ---------- Q Bắn Hạ (1x1) ----------

/** Q: vạch ngắm, chớp nòng to ở tâm, một viên đạn tròn nặng bay tới mục tiêu; trúng là tia lửa dày, khói; chí mạng có sao nổ */
registerSkillVfx("missfortune_q", async (ctx) => {
    const k = power(ctx)
    const s = shotsOf(ctx)[0]
    const crit = !!s.crit
    // ngắm: một vạch mảnh đỏ chạy tới mục tiêu rồi tắt
    const aim = canvas(ctx.layer)
    await over(ctx.layer, 0.12, (t) => {
        aim.g.clear()
        polyline(aim.g, [ctx.from, mix(ctx.from, s.to, ease.out(t))], 0.8, col(CRIMSON, 0.7 * (1 - t * 0.5)))
    })
    aim.done()
    flash(ctx.layer, ctx.from, angleOf(ctx.from, s.to), crit ? 1.6 : 1.3)
    await bullet(ctx.layer, ctx.from, s.to, Math.min(0.2, 0.09 + dist(ctx.from, s.to) / 3600), crit, 2.1)
    ctx.onBeat?.(0)
    hit(ctx.layer, s.to, ctx.from, crit, 1.3 * k)
})

// ---------- E Mưa Đạn (3x3) ----------

/**
 * E: Miss Fortune bắn chỉ thiên từ tâm, đạn tròn trút THẲNG ĐỨNG xuống 3 ô theo từng đợt. Mỗi đợt: một loạt đạn rơi (đạn
 * trúng tướng và đạn lạc ghim đất quanh lá), bụi đất bắn; đợt i là nhịp i, số của đợt đó bật đúng lúc loạt chạm.
 */
registerSkillVfx("missfortune_e", async (ctx) => {
    const k = power(ctx)
    const waves = mfWaves(shotsOf(ctx))
    const rowY = waves.flat().reduce((s, h) => s + h.to.y, 0) / Math.max(1, waves.flat().length)
    const down = rowY >= ctx.from.y ? 1 : -1
    // bắn lên trời từ tâm: một chùm đạn tròn vút lên rồi mất hút; khựng một nhịp rồi đạn mới trút xuống
    const sky = { x: ctx.from.x, y: ctx.from.y + 200 * down }
    const ups: Promise<void>[] = []
    for (let i = 0; i < 10; i++) {
        const m = ctx.from
        const top = { x: m.x + rand(-30, 30), y: m.y + down * rand(170, 230) }
        ups.push(wait(ctx.layer, i * 0.03).then(() => {
            flash(ctx.layer, m, down > 0 ? UP : -UP, 1.1)
            return bullet(ctx.layer, m, top, 0.16, false)
        }).then(() => { emit(ctx.layer, top, { color: [FLASH], kind: "dot", life: [0.1, 0.16], size: [3, 1], alpha: 1 }) }))
    }
    await Promise.all(ups)
    await wait(ctx.layer, 0.16)
    for (let w = 0; w < waves.length; w++) {
        const wave = waves[w]
        // mỗi ô: 1 viên trúng tướng + 6 viên lạc ghim đất quanh lá, rơi thẳng đứng từ phía trên
        const falls: Promise<void>[] = []
        for (const h of wave) {
            // đạn rơi THẲNG ĐỨNG từ trên xuống
            const drop = (to: Pt, real: boolean) => {
                const from = { x: to.x, y: to.y + 120 * down }
                return wait(ctx.layer, rand(0, 0.06)).then(() => bullet(ctx.layer, from, to, 0.12, real && !!h.crit)).then(() => {
                    if (real) hit(ctx.layer, to, from, !!h.crit, 0.9 * k)
                    else dirt(ctx.layer, to)
                })
            }
            falls.push(drop(h.to, true))
            for (let j = 0; j < 6; j++) falls.push(drop({ x: h.to.x + rand(-60, 60), y: h.to.y + rand(-55, 35) }, false))
        }
        // nhịp đợt w: lúc viên trúng tướng đầu tiên của đợt chạm (đợi viên chậm nhất trong đợt cho chắc số không lệch hình)
        await Promise.all(falls)
        ctx.onBeat?.(w)
        await wait(ctx.layer, 0.08)
    }
})

// ---------- R Đạn Tử Thần (5x5) ----------

/** Thời gian một lượt quét của R (mỗi lượt quét chứa một loạt phát thật = một nhịp) */
const SWEEP = 0.3

/**
 * R: XẢ ĐẠN. Hai súng thay nhau nhả đạn liên tục, dày đặc, dòng đạn quét qua quét lại cả hàng địch (đạn lạc ghim đất,
 * tia lửa). Trong dòng xả, mỗi lượt quét có một loạt phát thật tới đúng từng tướng engine báo; loạt i chạm là nhịp i.
 */
registerSkillVfx("missfortune_r", async (ctx) => {
    const k = power(ctx)
    const waves = mfWaves(shotsOf(ctx))
    const all = waves.flat()
    if (!all.length) return
    const xs = all.map((h) => h.to.x)
    const rowY = all.reduce((s, h) => s + h.to.y, 0) / all.length
    const toward = Math.sign(rowY - ctx.from.y) || 1
    const left = Math.min(...xs) - 60, right = Math.max(...xs) + 60
    const total = waves.length * SWEEP + 0.15
    // dòng xả: mỗi khung 2 viên, điểm rơi quét qua lại dọc hàng địch
    const spray = over(ctx.layer, total, (t) => {
        const el = t * total
        const x = left + (right - left) * (0.5 - 0.5 * Math.cos(el / SWEEP * Math.PI))
        for (let i = 0; i < 2; i++) {
            const to = { x: x + rand(-50, 50), y: rowY + toward * rand(-60, 10) }
            const m = ctx.from
            emit(ctx.layer, m, { color: [FLASH, BRASS], kind: "glow", life: [0.04, 0.06], size: [18, 8], alpha: 0.9 })
            void bullet(ctx.layer, m, to, 0.11 + Math.random() * 0.04, false, 0.8).then(() => { if (Math.random() < 0.6) dirt(ctx.layer, to) })
        }
        if (Math.random() < 0.25) void burst(ctx.layer, ctx.from, 1, {
            color: SMOKE, kind: "glow", additive: false, life: [0.4, 0.7], size: [8, 22], alpha: 0.3, speed: [10, 30], angle: [UP - 0.6, UP + 0.6]
        })
    })
    // các loạt thật nằm trong dòng xả: mỗi lượt quét một loạt, chạm là nhịp số
    for (let w = 0; w < waves.length; w++) {
        await wait(ctx.layer, SWEEP * 0.55)
        await Promise.all(waves[w].map((h) => {
            const m = ctx.from
            return bullet(ctx.layer, m, h.to, Math.min(0.14, 0.07 + dist(m, h.to) / 6000), !!h.crit).then(() => hit(ctx.layer, h.to, m, !!h.crit, k))
        }))
        ctx.onBeat?.(w)
        await wait(ctx.layer, Math.max(0, SWEEP * 0.45 - 0.09))
    }
    await spray
})

// ---------- Nội tại Tay Súng May Mắn ----------

/** P: một đồng xu vàng tung lên từ tay Miss Fortune, xoay lật, loé sáng ở đỉnh rồi rơi lại tay; hai nòng súng loé nhẹ */
registerSkillVfx("missfortune_p", async (ctx) => {
    const c = canvas(ctx.layer)
    const base = { x: ctx.from.x + 14, y: ctx.from.y + 10 }
    await over(ctx.layer, 0.7, (t) => {
        const y = base.y + Math.sin(t * Math.PI) * 90
        const flip = Math.abs(Math.cos(t * 14))
        c.g.clear()
        c.g.fillColor = col(BRASS, 1)
        c.g.ellipse(base.x, y, 7, 7 * flip + 0.6)
        c.g.fill()
        c.g.lineWidth = 1
        c.g.strokeColor = col(WHITE, 0.9)
        c.g.ellipse(base.x, y, 7, 7 * flip + 0.6)
        c.g.stroke()
        if (Math.abs(t - 0.5) < 0.04) emit(ctx.layer, { x: base.x, y }, { color: [FLASH], kind: "glow", life: [0.18, 0.18], size: [20, 70], alpha: 0.9 })
        if (Math.random() < 0.4) emit(ctx.layer, { x: base.x, y }, { color: [BRASS, WHITE], kind: "dot", life: [0.2, 0.35], size: [2.5, 1], alpha: 1, speed: [5, 25] })
    })
    c.done()
    for (const side of [-1, 1]) flash(ctx.layer, muzzle(ctx.from, side, { x: ctx.from.x, y: ctx.from.y + 100 }), UP, 0.6)
    await wait(ctx.layer, 0.15)
})
