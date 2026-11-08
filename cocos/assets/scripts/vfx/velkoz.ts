// VFX Vel'Koz trên Cocos, theo phong cách Vel'Koz gốc: plasma Hư Không tím hồng lõi trắng, ngôn ngữ hình học tam giác,
// tia laser liền mạch từ con mắt. Hình khối (giọt plasma, tia, ký hiệu tam giác, cột Hư Không) vẽ bằng Graphics mỗi khung
// hình; hạt (particles.ts) lo phần sáng loé, mảnh vỡ và bụi rã.
// Ô: velkoz_q (giọt plasma, trúng thì tách đôi vuông góc), velkoz_e (vòng ký hiệu trên đất, cột Hư Không phụt lên, nhịp hai
// cuối lượt), velkoz_r (tia laser liền quét qua từng điểm trúng), velkoz_p (ba mảnh tam giác xoay quanh rồi chụm nổ),
// basic_velkoz (xung plasma nhỏ). Toạ độ Cocos: y hướng lên.
import {
    Color, Graphics, Node, UITransform
} from "cc"
import {
    angleOf, burst, dist, ease, emit, lerp, mix, over, pick, rand, stream, wait, type Pt
} from "./particles"
import {
    registerSkillVfx, type VfxCtx
} from "./registry"

const TAU = Math.PI * 2
const UP = Math.PI / 2
const CORE = 0xfff4ff
const PINK = 0xff8cf0
const MAGENTA = 0xff3ad6
const VIOLET = 0x9b3cff
const ABYSS = 0x12031f
const PLASMA = [MAGENTA,
    VIOLET,
    PINK]
const DUST = [0xd9a8ff,
    0xff9be8,
    0xffffff]

/** Thời gian giữa hai điểm trúng của tia R */
const RAY_GAP = 0.15
/** Tia R trượt sang điểm mới trong chừng này, phần còn lại của nhịp là đứng đốt */
const RAY_SLIDE = 0.06

const col = (hex: number, a: number) => new Color((hex >> 16) & 255,
    (hex >> 8) & 255,
    hex & 255,
    Math.max(0,
        Math.min(255,
            Math.round(a * 255))))
const power = (ctx: VfxCtx) => ctx.style.intensity ?? 1
const polar = (at: Pt, a: number, r: number, squash = 1): Pt => ({
    x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r * squash
})

// ---------- lớp vẽ hình khối ----------

/** Một nút Graphics vẽ lại mỗi khung hình; `additive` cho hoà màu cộng như hạt sáng */
function canvas(layer: Node, additive = true) {
    const n = new Node("VelkozGfx")
    n.layer = layer.layer
    n.addComponent(UITransform).setContentSize(1920,
        1080)
    layer.addChild(n)
    const g = n.addComponent(Graphics)
    if (additive) {
        // Graphics cũng là UIRenderer, nhận cặp hoà màu như Sprite trong particles.ts
        const blend = g as unknown as { srcBlendFactor: number; dstBlendFactor: number }
        blend.srcBlendFactor = 2 // SRC_ALPHA
        blend.dstBlendFactor = 1 // ONE
    }
    return {
        g, done: () => { if (n.isValid) n.destroy() }
    }
}

/** Dải thẳng a..b bề rộng `w`, hai đầu bo tròn */
function strip(g: Graphics, a: Pt, b: Pt, w: number, c: Color) {
    if (w <= 0.2) return
    const d = angleOf(a,
        b)
    const nx = -Math.sin(d) * w / 2, ny = Math.cos(d) * w / 2
    g.fillColor = c
    g.moveTo(a.x + nx,
        a.y + ny)
    g.lineTo(b.x + nx,
        b.y + ny)
    g.lineTo(b.x - nx,
        b.y - ny)
    g.lineTo(a.x - nx,
        a.y - ny)
    g.close()
    g.fill()
    g.circle(a.x,
        a.y,
        w / 2)
    g.fill()
    g.circle(b.x,
        b.y,
        w / 2)
    g.fill()
}

/** Các lớp của tia năng lượng, ngoài vào trong: [bề rộng, màu, độ đậm]; quầng rộng mờ dần cho viền tia mềm */
const BEAM_LAYERS: [number, number, number][] = [
    [120, VIOLET, 0.06],
    [92, VIOLET, 0.09],
    [68, MAGENTA, 0.14],
    [48, MAGENTA, 0.3],
    [34, MAGENTA, 0.6],
    [22, PINK, 0.85],
    [12, CORE, 0.95],
    [6, CORE, 1],
]

/** Tia năng lượng mềm a..b: nhiều lớp chồng, `scale` nhân bề rộng, `alpha` nhân độ đậm */
function softBeam(g: Graphics, a: Pt, b: Pt, scale: number, alpha: number) {
    for (const [w, c, al] of BEAM_LAYERS) strip(g,
        a,
        b,
        w * scale,
        col(c,
            al * alpha))
}

/** Hai sợi xoắn quanh đoạn a..b, lệch pha nhau nửa vòng; `phase` tăng theo thời gian để sợi chạy dọc tia */
function helix(g: Graphics, a: Pt, b: Pt, amp: number, phase: number, alpha: number) {
    const len = dist(a,
        b)
    const d = angleOf(a,
        b)
    const nx = -Math.sin(d), ny = Math.cos(d)
    const n = Math.max(8,
        Math.round(len / 14))
    for (const [off, c] of [[0, PINK], [Math.PI, VIOLET]] as const) {
        for (const [w, al] of [[3, 0.35], [1.2, 0.95]] as const) {
            g.lineWidth = w
            g.strokeColor = col(al > 0.5 ? CORE : c,
                al * alpha)
            for (let i = 0; i <= n; i++) {
                const u = i / n
                // biên độ phình ở giữa, thu về 0 ở hai đầu
                const s = Math.sin(u * len / 46 - phase + off) * amp * Math.min(1,
                    u * 6,
                    (1 - u) * 6)
                const p = mix(a,
                    b,
                    u)
                if (i === 0) g.moveTo(p.x + nx * s,
                    p.y + ny * s)
                else g.lineTo(p.x + nx * s,
                    p.y + ny * s)
            }
            g.stroke()
        }
    }
}

/** Giọt plasma: đầu tròn ở `tip`, thân thon dài về phía sau theo hướng `dir` */
function drop(g: Graphics, tip: Pt, dir: number, len: number, w: number, c: Color) {
    const bx = Math.cos(dir), by = Math.sin(dir)
    const nx = -by, ny = bx
    const tail = {
        x: tip.x - bx * len, y: tip.y - by * len
    }
    g.fillColor = c
    g.moveTo(tail.x,
        tail.y)
    g.quadraticCurveTo(tip.x - bx * len * 0.35 + nx * w,
        tip.y - by * len * 0.35 + ny * w,
        tip.x + nx * w * 0.5,
        tip.y + ny * w * 0.5)
    g.quadraticCurveTo(tip.x + bx * w * 0.75,
        tip.y + by * w * 0.75,
        tip.x - nx * w * 0.5,
        tip.y - ny * w * 0.5)
    g.quadraticCurveTo(tip.x - bx * len * 0.35 - nx * w,
        tip.y - by * len * 0.35 - ny * w,
        tail.x,
        tail.y)
    g.close()
    g.fill()
}

/** Tam giác đều tâm `at`, bán kính `r`, xoay `rot`; `squash` ép dẹt cho ký hiệu nằm trên đất */
function tri(g: Graphics, at: Pt, r: number, rot: number, squash = 1) {
    for (let i = 0; i < 3; i++) {
        const p = polar(at,
            rot + i * TAU / 3,
            r,
            squash)
        if (i === 0) g.moveTo(p.x,
            p.y)
        else g.lineTo(p.x,
            p.y)
    }
    g.close()
}

/** Mảnh tam giác nhọn (một cánh của ký hiệu Phân Rã) hướng mũi ra ngoài theo góc `a` */
function shard(g: Graphics, at: Pt, a: number, r: number, len: number, wid: number, c: Color) {
    const base = polar(at,
        a,
        r)
    const tip = polar(at,
        a,
        r + len)
    const nx = -Math.sin(a) * wid, ny = Math.cos(a) * wid
    g.fillColor = c
    g.moveTo(tip.x,
        tip.y)
    g.lineTo(base.x + nx,
        base.y + ny)
    g.lineTo(base.x - nx,
        base.y - ny)
    g.close()
    g.fill()
}

// ---------- mảnh dùng chung ----------

/** Mảnh tam giác vỡ văng ra: blade ngắn, xoay, hoà màu cộng */
function triBurst(layer: Node, at: Pt, n: number, speed: [number, number], angle: [number, number] = [0,
    TAU], size = 18) {
    return burst(layer,
        at,
        n,
        {
            color: [CORE,
                PINK,
                MAGENTA,
                VIOLET], kind: "blade", life: [0.22,
                0.5], size: [size,
                size * 0.3], alpha: 1, speed, angle, drag: 2.4, spin: [-14,
                14], stretch: 1.1, gravity: -260
        })
}

/** Bụi rã bong khỏi vật chất, bay lên và tan */
function decayDust(layer: Node, at: Pt, n: number, spread: number) {
    return burst(layer,
        at,
        n,
        {
            color: DUST, kind: "dot", life: [0.5,
                1.0], size: [6,
                1], alpha: 0.9, speed: [20,
                110], angle: [UP - 1.1,
                UP + 1.1], drag: 1.3, gravity: 60, spread
        })
}

/** Loé trúng plasma: quầng trắng, vòng hồng, tia sắc và bụi rã */
function plasmaHit(layer: Node, at: Pt, k: number, from?: Pt) {
    const back = from ? angleOf(at,
        from) : undefined
    emit(layer,
        at,
        {
            color: [CORE], kind: "glow", life: [0.18,
                0.18], size: [60 * k,
                170 * k], alpha: 1
        })
    emit(layer,
        at,
        {
            color: [MAGENTA], kind: "glow", life: [0.34,
                0.34], size: [120 * k,
                240 * k], alpha: 0.75
        })
    void burst(layer,
        at,
        1,
        {
            color: [PINK], kind: "ring", life: [0.3,
                0.3], size: [24,
                200 * k], alpha: 0.9
        })
    void burst(layer,
        at,
        Math.round(18 * k),
        {
            color: [CORE,
                PINK,
                MAGENTA], kind: "blade", life: [0.14,
                0.34], size: [30 * k,
                6], alpha: 1, speed: [260,
                640], angle: back === undefined ? [0,
                TAU] : [back - 1.2,
                back + 1.2], drag: 2.4, align: true, stretch: 2.8
        })
    void triBurst(layer,
        at,
        Math.round(7 * k),
        [140,
            380])
    void decayDust(layer,
        at,
        Math.round(22 * k),
        24)
}

/**
 * Con mắt tụ năng lượng: tia sáng hút vào tâm, tam giác ký hiệu xoay và co lại quanh mắt, rồi loé.
 * `secs` càng dài càng tụ lâu, `size` là bán kính vùng hút.
 */
async function eyeCharge(layer: Node, at: Pt, secs: number, size: number) {
    const c = canvas(layer)
    emit(layer,
        at,
        {
            color: [VIOLET], kind: "glow", life: [secs + 0.1,
                secs + 0.1], size: [size * 0.8,
                size * 2], alpha: 0.6
        })
    // hạt hút vào: phát trên vòng rồi lao vào tâm
    const suck = over(layer,
        secs * 0.85,
        () => {
            for (let i = 0; i < 3; i++) {
                const a = rand(0,
                    TAU)
                const r = size * rand(1.2,
                    1.7)
                const p = polar(at,
                    a,
                    r)
                emit(layer,
                    p,
                    {
                        color: [PINK,
                            CORE,
                            VIOLET], kind: "dot", life: [0.16,
                            0.2], size: [7,
                            2], alpha: 1, speed: [r * 5.5,
                            r * 6], angle: [a + Math.PI,
                            a + Math.PI]
                    })
            }
        })
    await Promise.all([
        suck,
        over(layer,
            secs,
            (t) => {
                c.g.clear()
                const r = lerp(size * 1.25,
                    size * 0.35,
                    ease.in(t))
                const a = 0.25 + 0.75 * t
                c.g.lineWidth = 1.4 + 1.2 * t
                c.g.strokeColor = col(MAGENTA,
                    a * 0.9)
                tri(c.g,
                    at,
                    r,
                    t * 4 + UP)
                c.g.stroke()
                c.g.strokeColor = col(PINK,
                    a * 0.7)
                tri(c.g,
                    at,
                    r * 0.8,
                    -t * 5 - UP)
                c.g.stroke()
                c.g.fillColor = col(CORE,
                    0.25 + 0.6 * t)
                c.g.circle(at.x,
                    at.y,
                    6 + 10 * t)
                c.g.fill()
            }),
    ])
    c.done()
    emit(layer,
        at,
        {
            color: [CORE], kind: "glow", life: [0.18,
                0.18], size: [size * 2.2,
                size * 0.5], alpha: 1
        })
    void burst(layer,
        at,
        1,
        {
            color: [PINK], kind: "ring", life: [0.22,
                0.22], size: [size * 0.6,
                size * 2.4], alpha: 0.8
        })
}

/**
 * Giọt plasma bay a -> b: thân giọt vẽ bằng Graphics (quầng tím, thân hồng, lõi trắng), quầng sáng bám đầu, vệt và bụi
 * rơi lại phía sau. Tới nơi thì gọi `arrive`.
 */
async function plasmaBolt(layer: Node, a: Pt, b: Pt, secs: number, w: number, easing = ease.in) {
    const c = canvas(layer)
    const dir = angleOf(a,
        b)
    const back = dir + Math.PI
    let p = {
        ...a
    }
    let prev = {
        ...a
    }
    await over(layer,
        secs,
        (t) => {
            prev = p
            p = mix(a,
                b,
                easing(t))
            const flick = 1 + Math.sin(t * 60) * 0.08
            c.g.clear()
            // quả cầu plasma: vỏ tím, thân hồng dày, lõi trắng tròn, đuôi ngắn
            drop(c.g,
                p,
                dir,
                w * 4.4,
                w * 1.9 * flick,
                col(VIOLET,
                    0.35))
            drop(c.g,
                p,
                dir,
                w * 3.4,
                w * 1.4 * flick,
                col(MAGENTA,
                    0.8))
            drop(c.g,
                p,
                dir,
                w * 2.2,
                w * 0.9,
                col(PINK,
                    0.9))
            c.g.fillColor = col(CORE,
                1)
            c.g.circle(p.x,
                p.y,
                w * 0.55 * flick)
            c.g.fill()
            // tia điện lách tách quanh cầu: vài đường gãy ngắn đổi mỗi khung
            c.g.lineWidth = 1.2
            for (let j = 0; j < 3; j++) {
                const a0 = rand(0,
                    TAU)
                let q = polar(p,
                    a0,
                    w * 0.6)
                c.g.strokeColor = col(j ? PINK : CORE,
                    0.9)
                c.g.moveTo(q.x,
                    q.y)
                for (let s = 1; s <= 3; s++) {
                    q = polar(p,
                        a0 + rand(-0.6,
                            0.6),
                        w * (0.6 + s * 0.45))
                    c.g.lineTo(q.x,
                        q.y)
                }
                c.g.stroke()
            }
            emit(layer,
                p,
                {
                    color: [MAGENTA], kind: "glow", life: [0.1,
                        0.12], size: [w * 7,
                        w * 4], alpha: 0.55
                })
            emit(layer,
                p,
                {
                    color: [CORE], kind: "glow", life: [0.06,
                        0.08], size: [w * 2.6,
                        w * 1.6], alpha: 0.8
                })
            // vệt rơi lại suốt quãng đi trong khung này, để đuôi liền khi giọt bay nhanh
            const steps = Math.max(1,
                Math.round(dist(prev,
                    p) / 14))
            for (let i = 0; i < steps; i++) {
                const q = mix(prev,
                    p,
                    i / steps)
                emit(layer,
                    q,
                    {
                        color: PLASMA, kind: "blade", life: [0.12,
                            0.22], size: [w * 2.2,
                            w * 0.6], alpha: 0.8, rotation: dir, stretch: 2.6, speed: [30,
                            90], angle: [back - 0.15,
                            back + 0.15], spread: w * 0.3
                    })
                if (Math.random() < 0.5) emit(layer,
                    q,
                    {
                        color: DUST, kind: "dot", life: [0.3,
                            0.6], size: [5,
                            1], alpha: 0.9, speed: [10,
                            60], drag: 2, spread: w * 0.6
                    })
            }
        })
    c.done()
}

// ---------- Q Phân Hạch Plasma ----------

/** Vạch tách: một đường sáng vuông góc hướng bay loé ngang qua điểm trúng, báo tia sắp chẻ đôi */
async function fissionFlash(layer: Node, at: Pt, dir: number, k: number) {
    const c = canvas(layer)
    const nx = Math.cos(dir + UP), ny = Math.sin(dir + UP)
    await over(layer,
        0.14,
        (t) => {
            const len = lerp(20,
                150 * k,
                ease.out(t))
            const a = 1 - t * 0.6
            const p1 = {
                x: at.x + nx * len, y: at.y + ny * len
            }
            const p2 = {
                x: at.x - nx * len, y: at.y - ny * len
            }
            c.g.clear()
            strip(c.g,
                p1,
                p2,
                7 * k * a,
                col(MAGENTA,
                    a * 0.7))
            strip(c.g,
                p1,
                p2,
                2 * k * a,
                col(CORE,
                    a))
        })
    c.done()
}

/**
 * Q: mắt tụ, giọt plasma bay tới mục tiêu chính (to[0]); trúng thì loé vạch tách rồi chẻ đôi vuông góc, hai giọt nhỏ đuổi
 * theo to[1], to[2] (Q tách trúng tướng địch khác); thiếu mục tiêu phụ thì nửa đó bay hết tầm rồi tan thành bụi.
 */
registerSkillVfx("velkoz_q",
    async (ctx) => {
        const k = power(ctx)
        const first = ctx.to[0] ?? polar(ctx.from,
            UP,
            400)
        const dir = angleOf(ctx.from,
            first)
        await eyeCharge(ctx.layer,
            ctx.from,
            0.2,
            46 * k)
        await plasmaBolt(ctx.layer,
            ctx.from,
            first,
            Math.min(0.32,
                0.12 + dist(ctx.from,
                    first) / 3400),
            20 * k)
        plasmaHit(ctx.layer,
            first,
            1.1 * k,
            ctx.from)
        await fissionFlash(ctx.layer,
            first,
            dir,
            k)
        const free = [UP,
            -UP].map((d) => polar(first,
            dir + d,
            260))
        await Promise.all([0,
            1].map(async (i) => {
            const aim = ctx.to[i + 1]
            const end = aim ?? free[i]
            await plasmaBolt(ctx.layer,
                first,
                end,
                Math.max(0.12,
                    dist(first,
                        end) / 1900),
                (aim ? 14 : 11) * k,
                ease.out)
            if (aim) plasmaHit(ctx.layer,
                aim,
                0.8 * k,
                first)
            else {
                emit(ctx.layer,
                    end,
                    {
                        color: [MAGENTA], kind: "glow", life: [0.2,
                            0.2], size: [50,
                            10], alpha: 0.8
                    })
                void decayDust(ctx.layer,
                    end,
                    18,
                    12)
            }
        }))
        await wait(ctx.layer,
            0.3)
    })

// ---------- E Khe Nứt Hư Không ----------

/** Số ngẫu nhiên có hạt giống: cùng seed thì cùng chuỗi, để đường nứt đứng yên giữa các khung hình */
function seeded(seed: number) {
    let x = Math.floor(seed * 9973) % 2147483647 || 1
    return () => {
        x = x * 16807 % 2147483647
        return (x - 1) / 2147483646
    }
}

interface CrackPt { x: number; y: number; u: number; wf: number; jt: number; jb: number }
/** Nhánh nứt: level 1 nhánh chính, 2 nhánh con, 3 vết nứt chân tóc li ti quanh khe */
interface Fork { from: number; pts: Pt[]; level: 1 | 2 | 3 }
interface Crack { pts: CrackPt[]; forks: Fork[]; hitU: number }

/**
 * Đường nứt tự nhiên từ a tới b (gần ngang), dày chi tiết: đoạn rất ngắn (~4 px), lệch hai tầng (uốn lớn chậm + răng cưa
 * nhỏ) và thỉnh thoảng gãy gập; mỗi điểm một độ mở `wf` và độ sứt mép trên/dưới riêng (`jt`, `jb`). Nhiều nhánh nứt, nhánh
 * con, và vô số vết nứt chân tóc quanh khe. `hitX` là chỗ tia cắm xuống: nứt lan từ đó.
 */
function makeCrack(a: Pt, b: Pt, hitX: number, seed: number): Crack {
    const rnd = seeded(seed)
    const n = Math.max(40, Math.round((b.x - a.x) / 4))
    const pts: CrackPt[] = []
    let big = 0, wf = 1
    for (let i = 0; i <= n; i++) {
        const u = i / n
        big = big * 0.93 + (rnd() - 0.5) * 3.2
        if (rnd() < 0.06) big += (rnd() - 0.5) * 11
        const small = (rnd() - 0.5) * 3.4
        const edge = Math.min(1, u * 10, (1 - u) * 10)
        wf = Math.max(0.2, Math.min(1.4, wf * 0.7 + (0.25 + rnd() * 1.15) * 0.3))
        pts.push({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) + (big + small) * edge, u, wf, jt: 0.7 + rnd() * 0.6, jb: 0.7 + rnd() * 0.6 })
    }
    const forks: Fork[] = []
    const branch = (from: number, start: Pt, ang: number, segs: number, seg: number, level: 1 | 2) => {
        const fp: Pt[] = [start]
        for (let s = 1; s <= segs; s++) {
            ang += (rnd() - 0.5) * 0.9
            const p = fp[fp.length - 1]
            const l = seg * (0.6 + rnd() * 0.8)
            fp.push({ x: p.x + Math.cos(ang) * l, y: p.y + Math.sin(ang) * l })
        }
        forks.push({ from, pts: fp, level })
        return fp
    }
    const count = 8 + Math.floor(rnd() * 5)
    for (let f = 0; f < count; f++) {
        const from = 3 + Math.floor(rnd() * (n - 6))
        const side = rnd() < 0.5 ? 1 : -1
        const ang = side * (0.35 + rnd() * 0.9) + (rnd() < 0.5 ? 0 : Math.PI)
        const fp = branch(from, { x: pts[from].x, y: pts[from].y }, ang, 4 + Math.floor(rnd() * 3), 5 + rnd() * 4, 1)
        if (rnd() < 0.5) {
            const mid = fp[1 + Math.floor(rnd() * (fp.length - 2))]
            branch(from, mid, ang + side * (0.6 + rnd() * 0.6), 2 + Math.floor(rnd() * 2), 4 + rnd() * 3, 2)
        }
    }
    // vết nứt chân tóc li ti dọc hai mép
    for (let m = 0; m < 46; m++) {
        const from = 1 + Math.floor(rnd() * (n - 2))
        const side = rnd() < 0.5 ? 1 : -1
        const start = { x: pts[from].x + (rnd() - 0.5) * 6, y: pts[from].y + side * (2 + rnd() * 7) }
        const ang = side * (0.3 + rnd() * 1.2) + (rnd() < 0.5 ? 0 : Math.PI)
        const l = 3 + rnd() * 6
        forks.push({ from, pts: [start, { x: start.x + Math.cos(ang) * l, y: start.y + Math.sin(ang) * l }, { x: start.x + Math.cos(ang + (rnd() - 0.5)) * l * 1.6, y: start.y + Math.sin(ang + (rnd() - 0.5)) * l * 1.6 }], level: 3 })
    }
    return { pts, forks, hitU: Math.max(0, Math.min(1, (hitX - a.x) / (b.x - a.x))) }
}

/**
 * Vẽ đường nứt. `reach` 0..1: nứt chân tóc đã lan bao xa từ chỗ cắm; `open` 0..1: độ toạc; `bright` độ sáng vách;
 * `seal` 0..1: khép lại từ hai đầu vào giữa (1 = đã hàn kín, chỉ còn đường hàn sáng mờ dần theo `seam`).
 * Chiều sâu: đất sẫm quanh miệng khe, lòng tối, ánh tím hắt từ đáy, vách dưới hứng sáng có lấm tấm, vách trên tối và mảnh,
 * mép sứt từng điểm; nhánh, nhánh con và nứt chân tóc phủ dày quanh khe.
 */
function drawCrack(dark: Graphics, glow: Graphics, c: Crack, max: number, reach: number, open: number, bright: number, seal: number, seam: number) {
    dark.clear()
    glow.clear()
    const far = Math.max(c.hitU, 1 - c.hitU)
    const width = (p: CrackPt) => {
        const d = Math.abs(p.u - c.hitU) / far
        if (d > reach) return -1
        const tip = Math.min(1, (reach - d) * 6)
        const ends = Math.min(1, p.u * 7, (1 - p.u) * 7)
        const zip = Math.max(0, Math.min(1, ((1 - seal) - Math.abs(p.u - 0.5) * 2 + 0.25) / 0.25))
        return max * open * p.wf * tip * ends * zip
    }
    const vis = c.pts.filter((p) => width(p) >= 0)
    if (vis.length < 2) return
    const ws = vis.map(width)
    const line = (pts: Pt[], w: number, col_: number, a: number) => {
        if (a <= 0.01 || pts.length < 2) return
        glow.lineWidth = w
        glow.strokeColor = col(col_, a)
        glow.moveTo(pts[0].x, pts[0].y)
        for (const p of pts) glow.lineTo(p.x, p.y)
        glow.stroke()
    }
    const darkLine = (pts: Pt[], w: number, a: number) => {
        if (a <= 0.01 || pts.length < 2) return
        dark.lineWidth = w
        dark.strokeColor = col(ABYSS, a)
        dark.moveTo(pts[0].x, pts[0].y)
        for (const p of pts) dark.lineTo(p.x, p.y)
        dark.stroke()
    }
    const fade = 1 - seal
    // nhánh nứt: rãnh tối mảnh bên dưới, chỉ sáng bên trên; nứt chân tóc chỉ là nét tối và ánh hồng rất mờ
    for (const f of c.forks) {
        const base = c.pts[f.from]
        const d = Math.abs(base.u - c.hitU) / far
        if (d > reach) continue
        const grow = Math.min(1, (reach - d) * (f.level === 3 ? 2.5 : 4))
        const k = Math.max(1, Math.round((f.pts.length - 1) * grow))
        const fp = f.pts.slice(0, k + 1)
        if (f.level === 3) {
            darkLine(fp, 1, 0.55 * fade * Math.min(1, open * 2 + 0.3))
            line(fp, 0.5, PINK, 0.35 * Math.min(1, bright) * fade)
            continue
        }
        darkLine(fp, f.level === 1 ? 2 : 1.4, 0.8 * fade)
        if (f.level === 1) line(fp, 2.2, MAGENTA, 0.25 * bright * fade)
        line(fp, f.level === 1 ? 0.9 : 0.6, PINK, Math.min(1, bright) * fade * (f.level === 1 ? 1 : 0.75))
    }
    const top = vis.map((p, i) => ({ x: p.x, y: p.y + ws[i] * 0.45 * p.jt }))
    const bot = vis.map((p, i) => ({ x: p.x, y: p.y - ws[i] * 0.55 * p.jb }))
    const poly = (g: Graphics, up: Pt[], down: Pt[], color: Color) => {
        g.fillColor = color
        g.moveTo(up[0].x, up[0].y)
        for (const p of up) g.lineTo(p.x, p.y)
        for (let i = down.length - 1; i >= 0; i--) g.lineTo(down[i].x, down[i].y)
        g.close()
        g.fill()
    }
    const wide = ws.some((w) => w > 1.2)
    if (wide) {
        // đất sẫm quanh miệng khe, hai lớp loang không đều
        poly(dark,
            vis.map((p, i) => ({ x: p.x, y: p.y + ws[i] * (0.9 + p.jb * 0.4) + 4 })),
            vis.map((p, i) => ({ x: p.x, y: p.y - ws[i] * (0.9 + p.jt * 0.4) - 4 })),
            col(ABYSS, 0.16 * Math.min(1, open)))
        poly(dark,
            vis.map((p, i) => ({ x: p.x, y: p.y + ws[i] * 0.7 * p.jt + 2 })),
            vis.map((p, i) => ({ x: p.x, y: p.y - ws[i] * 0.8 * p.jb - 2 })),
            col(ABYSS, 0.3 * Math.min(1, open)))
        // lòng khe: đen sâu
        poly(dark, top, bot, col(ABYSS, 0.97))
        // bóng đổ của vách trên vào lòng khe
        darkLine(top.map((p) => ({ x: p.x, y: p.y - 1 })), 2, 0.9)
        // ánh Hư Không dưới đáy: vệt hẹp nằm sâu, đứt quãng theo độ mở
        const deep = vis.map((p, i) => ({ x: p.x, y: p.y - ws[i] * 0.3 }))
        poly(glow,
            deep.map((p, i) => ({ x: p.x, y: p.y + ws[i] * 0.1 })),
            deep.map((p, i) => ({ x: p.x, y: p.y - ws[i] * 0.1 })),
            col(VIOLET, 0.35 * bright))
        line(deep, 1, MAGENTA, 0.75 * Math.min(1.5, bright))
        // vách dưới hứng sáng: viền hồng, quầng, lấm tấm đốm sáng dọc mép (đá phản quang)
        line(bot, 2.6, MAGENTA, 0.35 * bright)
        line(bot, 1.1, PINK, Math.min(1, 1.05 * bright))
        glow.fillColor = col(PINK, 0.55 * Math.min(1, bright))
        for (let i = 1; i < bot.length - 1; i += 2) {
            if (ws[i] < 2) continue
            const r = 0.5 + (vis[i].jb - 0.7) * 1.2
            glow.circle(bot[i].x, bot[i].y - 1.5 - vis[i].jt * 2, r)
        }
        glow.fill()
        line(top, 0.7, PINK, 0.35 * Math.min(1, bright))
    }
    // đường chân tóc / đường hàn: một chỉ sáng dọc lõi đường nứt
    const hair = Math.max(open < 0.15 ? 1 : 0.4, seam)
    darkLine(vis, 2.2, 0.6 * Math.max(fade, seam))
    line(vis, 2.4, MAGENTA, 0.2 * hair * Math.max(bright, seam))
    line(vis, 0.9, CORE, hair * Math.max(Math.min(1, bright), seam))
}

/** Cột Hư Không phụt thẳng lên từ điểm `at` trên khe: cột thon sáng rồi tắt, mảnh tam giác bị hất tung */
async function voidEruption(layer: Node, at: Pt, k: number) {
    const foot = at
    const h = 120 * k
    const c = canvas(layer)
    emit(layer, foot, { color: [CORE], kind: "glow", life: [0.2, 0.2], size: [60 * k, 150 * k], alpha: 1 })
    void triBurst(layer, foot, Math.round(12 * k), [220, 480], [UP - 0.6, UP + 0.6], 11 * k)
    void burst(layer, foot, Math.round(12 * k), {
        color: [CORE, PINK, MAGENTA], kind: "blade", life: [0.2, 0.42], size: [36 * k, 7], alpha: 1, speed: [300, 650],
        angle: [UP - 0.18, UP + 0.18], drag: 1.8, align: true, stretch: 3.2, spread: 26 * k
    })
    void decayDust(layer, foot, Math.round(36 * k), 40 * k)
    await over(layer, 0.36, (t) => {
        const grow = ease.out(Math.min(1, t * 2.2))
        const fade = 1 - ease.in(t)
        const top = { x: foot.x, y: foot.y + h * grow }
        c.g.clear()
        softBeam(c.g, foot, top, 0.34 * k * fade, fade)
        helix(c.g, foot, top, 12 * k * fade, t * 30, fade)
    })
    c.done()
}

/**
 * Chia các sự kiện sát thương của một lần E thành hai nhịp: nhịp 0 là cú khe mở (mỗi mục tiêu một tia đầu), nhịp 1 là cú nổ
 * (tia thứ hai vào cùng mục tiêu trở đi). Sát thương phụ (Phân Rã nổ, tag khác "skill") đi theo nhịp đang chạy.
 */
/** Gom sát thương theo từng tia: mỗi cú tag "skill" mở một nhóm mới, sát thương phụ đi sau (Phân Rã nổ) theo nhóm đó. Nhóm i = nhịp i của R */
export function rayBeats<T extends { tag?: string }>(list: T[]): T[][] {
    const out: T[][] = []
    for (const d of list) {
        if (d.tag === "skill" || !out.length) out.push([])
        out[out.length - 1].push(d)
    }
    return out
}

export function riftBeats<T extends { target: string; tag?: string }>(list: T[]): [T[], T[]] {
    const seen = new Set<string>()
    const open: T[] = [], blast: T[] = []
    let second = false
    for (const d of list) {
        if (d.tag === "skill") {
            if (seen.has(d.target)) second = true
            seen.add(d.target)
        }
        ;(second ? blast : open).push(d)
    }
    return [open, blast]
}

/**
 * E (theo W Khe Nứt Hư Không gốc): mắt tụ, tia plasma mảnh cắm xuống đất ở tướng bị nhắm (to[0]). Mặt đất nứt chân tóc
 * lan từ đó sang hai bên qua mọi mục tiêu (tâm và 2 ô kề), tẽ nhánh nhỏ; rồi toạc ra không đều, lòng tối có ánh tím hắt từ
 * đáy, đá vụn rơi vào. Toạc hết là cú đầu (onBeat 0). Khe sáng dần, NỔ ngay dọc cả đường (cột Hư Không ở từng mục tiêu,
 * onBeat 1), rồi khép lại từ hai đầu vào giữa như kéo khoá, còn đường hàn sáng nguội dần.
 */
registerSkillVfx("velkoz_e", async (ctx) => {
    const k = power(ctx)
    const centre = ctx.to[0] ?? polar(ctx.from, UP, 400)
    const victims = ctx.to.length ? ctx.to : [centre]
    const xs = victims.map((t) => t.x)
    const y = victims.reduce((s, v) => s + v.y, 0) / victims.length - 14
    const a = { x: Math.min(...xs) - 78, y }
    const b = { x: Math.max(...xs) + 78, y }
    const hit = { x: centre.x, y }
    const crack = makeCrack(a, b, hit.x, rand(1, 1000))
    const MAX = 18 * k
    await eyeCharge(ctx.layer, ctx.from, 0.16, 40 * k)
    await plasmaBolt(ctx.layer, ctx.from, hit, 0.14, 8 * k)
    emit(ctx.layer, hit, { color: [CORE], kind: "glow", life: [0.16, 0.16], size: [40, 110], alpha: 1 })
    void decayDust(ctx.layer, hit, 10, 10)
    const dark = canvas(ctx.layer, false)
    const glow = canvas(ctx.layer)
    /** Đá vụn tối rơi vào lòng khe từ hai mép, hạt sáng nhỏ bắn khỏi mép */
    const crumbs = (n: number, open: number) => {
        for (let i = 0; i < n; i++) {
            const p = pick(crack.pts)
            const side = Math.random() < 0.5 ? 1 : -1
            emit(ctx.layer, { x: p.x, y: p.y + side * MAX * open * p.wf * 0.8 }, {
                color: [ABYSS, 0x2a0848], kind: "dot", additive: false, life: [0.2, 0.35], size: [4, 2], alpha: 0.9,
                speed: [20, 60], angle: side > 0 ? [-UP - 0.3, -UP + 0.3] : [UP - 0.3, UP + 0.3], drag: 1
            })
            if (Math.random() < 0.4) emit(ctx.layer, { x: p.x, y: p.y }, {
                color: [CORE, PINK], kind: "dot", life: [0.12, 0.25], size: [3, 1], alpha: 1, speed: [30, 90],
                angle: [UP - 0.8, UP + 0.8]
            })
        }
    }
    // 1) nứt chân tóc lan ra từ chỗ cắm, tẽ nhánh
    await over(ctx.layer, 0.2, (t) => {
        drawCrack(dark.g, glow.g, crack, MAX, ease.out(t), 0.06, 1, 0, 0)
    })
    // 2) toạc ra không đều; toạc hết là cú đầu
    await over(ctx.layer, 0.2, (t) => {
        const o = ease.out(t)
        drawCrack(dark.g, glow.g, crack, MAX, 1, 0.06 + 0.94 * o, 1, 0, 0)
        crumbs(5, o)
    })
    ctx.onBeat?.(0)
    for (const v of victims) {
        const at = { x: v.x, y }
        emit(ctx.layer, at, { color: [MAGENTA], kind: "glow", life: [0.22, 0.22], size: [40, 110], alpha: 0.7 })
        void triBurst(ctx.layer, at, 4, [120, 260], [UP - 0.8, UP + 0.8], 9)
        void decayDust(ctx.layer, at, 10, 22)
    }
    // 3) khe thở, sáng dần từ đáy
    await over(ctx.layer, 0.26, (t) => {
        drawCrack(dark.g, glow.g, crack, MAX, 1, 0.92 + 0.08 * Math.sin(t * Math.PI * 4), 0.8 + 0.6 * t, 0, 0)
        crumbs(3, 1)
    })
    // 4) phồng lên, vách trắng rực, NỔ dọc cả đường
    await over(ctx.layer, 0.1, (t) => {
        drawCrack(dark.g, glow.g, crack, MAX, 1, 1 + 0.35 * t, 1.4 + 0.6 * t, 0, 0)
    })
    ctx.onBeat?.(1)
    void stream(ctx.layer, () => { const p = pick(crack.pts); return { x: p.x, y: p.y } }, 0.14, 220, {
        color: [CORE, PINK, MAGENTA], kind: "blade", life: [0.14, 0.3], size: [24 * k, 5], alpha: 1, speed: [260, 560],
        angle: [UP - 0.25, UP + 0.25], drag: 2, align: true, stretch: 2.8
    })
    for (const v of victims) void voidEruption(ctx.layer, { x: v.x, y }, k)
    // 5) hàn lại từ hai đầu vào giữa, còn đường hàn sáng; rồi đường hàn nguội tắt (chạy nền)
    await over(ctx.layer, 0.34, (t) => {
        drawCrack(dark.g, glow.g, crack, MAX, 1, 1.35 * (1 - 0.3 * t), 2 - t, ease.inOut(t), t)
        if (Math.random() < 0.6) {
            const p = pick(crack.pts)
            emit(ctx.layer, { x: p.x, y: p.y }, { color: [PINK, CORE], kind: "dot", life: [0.2, 0.4], size: [3, 1], alpha: 1, speed: [10, 40], angle: [UP - 1, UP + 1] })
        }
    })
    void (async () => {
        await over(ctx.layer, 0.4, (t) => {
            drawCrack(dark.g, glow.g, crack, MAX, 1, 0, 0, 1, 1 - t)
        })
        dark.done()
        glow.done()
    })()
})

// ---------- R Tia Phân Rã Sự Sống ----------

/**
 * R: mắt tụ lâu, rồi MỘT tia laser liền mạch bắn ra; đầu tia trượt lần lượt qua từng điểm trúng (ctx.to, mỗi phần tử một
 * tia của engine) và đứng đốt ở đó. Thân tia: quầng tím rộng, thân hồng, lõi trắng, rung nhẹ; vòng sóng chạy dọc tia từ
 * mắt ra; đầu tia bắn tia lửa ngược và bụi rã; mỗi lần trúng loé nhỏ.
 */
registerSkillVfx("velkoz_r",
    async (ctx) => {
        const k = power(ctx)
        const shots = ctx.to.length ? ctx.to : [polar(ctx.from,
            UP,
            500)]
        const eye = ctx.from
        await eyeCharge(ctx.layer,
            eye,
            0.5,
            62 * k)
        const c = canvas(ctx.layer)
        const aimOf = (p: Pt) => ({
            x: p.x + rand(-22,
                22), y: p.y + rand(-22,
                22)
        })
        const aims = shots.map(aimOf)
        const total = shots.length * RAY_GAP + 0.12
        let tip = {
            ...aims[0]
        }
        let hitIdx = -1
        // vòng sóng: vị trí 0..1 dọc tia
        const pulses: number[] = []
        let lastPulse = 0
        await over(ctx.layer,
            total,
            (t) => {
                const el = t * total
                const idx = Math.min(shots.length - 1,
                    Math.floor(el / RAY_GAP))
                const inShot = el - idx * RAY_GAP
                const from = idx === 0 ? aims[0] : aims[idx - 1]
                tip = mix(from,
                    aims[idx],
                    ease.out(Math.min(1,
                        inShot / RAY_SLIDE)))
                if (idx !== hitIdx && inShot >= RAY_SLIDE * 0.8) {
                    hitIdx = idx
                    ctx.onBeat?.(idx)
                    const at = aims[idx]
                    const back = angleOf(at,
                        eye)
                    emit(ctx.layer,
                        at,
                        {
                            color: [CORE], kind: "glow", life: [0.14,
                                0.14], size: [50,
                                130], alpha: 1
                        })
                    void burst(ctx.layer,
                        at,
                        1,
                        {
                            color: [PINK], kind: "ring", life: [0.2,
                                0.2], size: [20,
                                110], alpha: 0.8
                        })
                    void burst(ctx.layer,
                        at,
                        7,
                        {
                            color: [CORE,
                                PINK], kind: "blade", life: [0.12,
                                0.28], size: [24,
                                5], alpha: 1, speed: [240,
                                560], angle: [back - 0.9,
                                back + 0.9], drag: 2.2, align: true, stretch: 2.6
                        })
                    void triBurst(ctx.layer,
                        at,
                        3,
                        [120,
                            300])
                    void decayDust(ctx.layer,
                        at,
                        10,
                        20)
                }
                const on = Math.min(1,
                    t * total / 0.06,
                    (1 - t) * total / 0.1)
                const flick = 0.85 + Math.sin(el * 70) * 0.1 + rand(-0.05,
                    0.05)
                c.g.clear()
                softBeam(c.g,
                    eye,
                    tip,
                    0.32 * k * on * flick,
                    on)
                const dir = angleOf(eye,
                    tip)
                // hai sợi năng lượng xoắn quanh thân tia, chạy từ mắt ra
                helix(c.g,
                    eye,
                    tip,
                    14 * k * on,
                    el * 38,
                    on)
                // vòng sóng chạy dọc tia: chữ V nhọn chỉ về phía mục tiêu
                if (el - lastPulse > 0.06) {
                    lastPulse = el
                    pulses.push(0)
                }
                for (let i = pulses.length - 1; i >= 0; i--) {
                    pulses[i] += 0.05
                    if (pulses[i] > 1) { pulses.splice(i,
                        1); continue }
                    const p = mix(eye,
                        tip,
                        pulses[i])
                    const r = 26 * k * on * (1 - pulses[i] * 0.35)
                    const a = on * (1 - pulses[i] * 0.7)
                    for (const [w, cc, aa] of [[4, MAGENTA, 0.4], [2, PINK, 0.9], [0.9, CORE, 1]] as const) {
                        c.g.lineWidth = w
                        c.g.strokeColor = col(cc,
                            aa * a)
                        c.g.moveTo(p.x + Math.cos(dir + UP) * r - Math.cos(dir) * r * 0.45,
                            p.y + Math.sin(dir + UP) * r - Math.sin(dir) * r * 0.45)
                        c.g.lineTo(p.x + Math.cos(dir) * r * 0.25,
                            p.y + Math.sin(dir) * r * 0.25)
                        c.g.lineTo(p.x - Math.cos(dir + UP) * r - Math.cos(dir) * r * 0.45,
                            p.y - Math.sin(dir + UP) * r - Math.sin(dir) * r * 0.45)
                        c.g.stroke()
                    }
                }
                // nòng: quầng ở mắt; đầu tia: quầng đốt, tia lửa bắn ngược, bụi rã
                emit(ctx.layer,
                    eye,
                    {
                        color: [CORE,
                            PINK], kind: "glow", life: [0.06,
                            0.08], size: [60 * k,
                            44 * k], alpha: 0.7 * on
                    })
                emit(ctx.layer,
                    tip,
                    {
                        color: [MAGENTA,
                            CORE], kind: "glow", life: [0.06,
                            0.1], size: [64 * k,
                            44 * k], alpha: 0.8 * on
                    })
                const back = dir + Math.PI
                for (let i = 0; i < 2; i++) emit(ctx.layer,
                    tip,
                    {
                        color: [CORE,
                            PINK,
                            MAGENTA], kind: "blade", life: [0.1,
                            0.22], size: [20,
                            4], alpha: 1, speed: [220,
                            620], angle: [back - 1,
                            back + 1], drag: 2.4, align: true, stretch: 2.4
                    })
                if (Math.random() < 0.6) emit(ctx.layer,
                    tip,
                    {
                        color: DUST, kind: "dot", life: [0.4,
                            0.8], size: [6,
                            1], alpha: 0.9, speed: [20,
                            100], angle: [UP - 1,
                            UP + 1], gravity: 50, drag: 1.2, spread: 16
                    })
                // hạt bong khỏi thân tia
                emit(ctx.layer,
                    mix(eye,
                        tip,
                        Math.random()),
                    {
                        color: PLASMA, kind: "dot", life: [0.15,
                            0.3], size: [6,
                            1], alpha: 0.8 * on, speed: [20,
                            80], drag: 2, spread: 10
                    })
            })
        c.done()
        await wait(ctx.layer,
            0.3)
    })

// ---------- P Phân Rã ----------

/**
 * P: ba mảnh tam giác (ba tầng Phân Rã) xoay quanh mục tiêu, sáng dần và khép lại; đủ tầng thì chụm vào tâm, loé trắng
 * (sát thương chuẩn), mảnh tam giác vỡ văng ra và cả lá bong bụi rã.
 */
registerSkillVfx("velkoz_p",
    async (ctx) => {
        const at = ctx.to[0] ?? ctx.from
        const c = canvas(ctx.layer)
        const R0 = 104
        await over(ctx.layer,
            0.9,
            (t) => {
                c.g.clear()
                const spin = t * 5
                const r = lerp(R0,
                    R0 * 0.55,
                    ease.in(t))
                const glow = 0.5 + 0.5 * t
                for (let i = 0; i < 3; i++) {
                    // mảnh thứ i hiện dần theo thời gian: tầng 1, 2, 3
                    const show = Math.min(1,
                        Math.max(0,
                            (t - i * 0.18) * 5))
                    if (show <= 0) continue
                    const a = spin + i * TAU / 3
                    shard(c.g,
                        at,
                        a,
                        r,
                        -58,
                        28,
                        col(VIOLET,
                            0.4 * show))
                    shard(c.g,
                        at,
                        a,
                        r,
                        -48,
                        17,
                        col(MAGENTA,
                            0.9 * show * glow))
                    shard(c.g,
                        at,
                        a,
                        r - 2,
                        -30,
                        7,
                        col(CORE,
                            show * glow))
                    if (Math.random() < 0.5) emit(ctx.layer,
                        polar(at,
                            a,
                            r - 20),
                        {
                            color: DUST, kind: "dot", life: [0.3,
                                0.6], size: [5,
                                1], alpha: 0.9, speed: [10,
                                40], angle: [UP - 0.8,
                                UP + 0.8]
                        })
                }
                c.g.lineWidth = 1.2
                c.g.strokeColor = col(PINK,
                    0.35 * glow)
                c.g.circle(at.x,
                    at.y,
                    r + 22)
                c.g.stroke()
            })
        // chụm: ba mảnh lao vào tâm
        await over(ctx.layer,
            0.1,
            (t) => {
                c.g.clear()
                const r = lerp(R0 * 0.55,
                    6,
                    ease.in(t))
                for (let i = 0; i < 3; i++) shard(c.g,
                    at,
                    i * TAU / 3 + 4.5,
                    r,
                    -48,
                    17,
                    col(CORE,
                        1))
            })
        c.done()
        emit(ctx.layer,
            at,
            {
                color: [CORE], kind: "glow", life: [0.26,
                    0.26], size: [120,
                    300], alpha: 1
            })
        void burst(ctx.layer,
            at,
            1,
            {
                color: [CORE], kind: "ring", life: [0.32,
                    0.32], size: [30,
                    260], alpha: 0.9
            })
        void triBurst(ctx.layer,
            at,
            18,
            [200,
                560],
            [0,
                TAU],
            24)
        void decayDust(ctx.layer,
            at,
            60,
            60)
        await wait(ctx.layer,
            0.5)
    })

// ---------- Đánh thường ----------

/**
 * Đánh thường: tia laser mảnh bắn THẲNG từ con mắt tới mục tiêu chỉ định, gần như tức thì. Mắt loé tam giác nhỏ, tia vươn
 * tới trong 0,05 s, đứng đốt một chút (rung, lõi trắng nhấp nháy), đầu tia bắn tia lửa ngược. Promise xong ngay lúc tia
 * chạm (luật VFX: số bật đúng lúc chạm); phần tia tắt và tam giác nở ra chạy nền.
 */
registerSkillVfx("basic_velkoz", async (ctx) => {
    const targets = ctx.to.length ? ctx.to : [polar(ctx.from, UP, 300)]
    await Promise.all(targets.map(async (to) => {
        const c = canvas(ctx.layer)
        const eye = ctx.from
        const back = angleOf(to, eye)
        emit(ctx.layer, eye, { color: [PINK], kind: "glow", life: [0.2, 0.2], size: [30, 80], alpha: 0.9 })
        // mắt loé: tam giác nhỏ co lại
        await over(ctx.layer, 0.08, (t) => {
            c.g.clear()
            c.g.lineWidth = 1.4
            c.g.strokeColor = col(PINK, 1 - t * 0.3)
            tri(c.g, eye, lerp(24, 10, t), t * 4 + UP)
            c.g.stroke()
        })
        // tia vươn thẳng tới mục tiêu
        await over(ctx.layer, 0.05, (t) => {
            c.g.clear()
            softBeam(c.g, eye, mix(eye, to, ease.out(t)), 0.2, 1)
        })
        // chạm: loé nhỏ, tia lửa bắn ngược, tam giác nở ra; tia đứng đốt rồi tắt (chạy nền)
        plasmaHit(ctx.layer, to, 0.6, eye)
        void (async () => {
            await over(ctx.layer, 0.22, (t) => {
                const on = t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45
                const flick = 0.85 + Math.sin(t * 90) * 0.15
                const r = ease.out(t)
                c.g.clear()
                softBeam(c.g, eye, to, 0.2 * on * flick, on)
                c.g.lineWidth = 1.6 * (1 - t) + 0.4
                c.g.strokeColor = col(PINK, 1 - t)
                tri(c.g, to, lerp(14, 52, r), UP + t * 1.5)
                c.g.stroke()
                c.g.strokeColor = col(CORE, (1 - t) * 0.85)
                tri(c.g, to, lerp(8, 32, r), -UP - t * 1.5)
                c.g.stroke()
                if (on > 0.3) emit(ctx.layer, to, {
                    color: [CORE, PINK], kind: "blade", life: [0.08, 0.18], size: [16, 3], alpha: 1, speed: [180, 420],
                    angle: [back - 0.9, back + 0.9], drag: 2.4, align: true, stretch: 2.4
                })
                emit(ctx.layer, eye, { color: [CORE, PINK], kind: "glow", life: [0.05, 0.07], size: [36, 26], alpha: 0.7 * on })
            })
            c.done()
        })()
    }))
})
