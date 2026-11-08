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
    angleOf, burst, dist, ease, emit, lerp, mix, over, rand, wait, type Pt
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
        for (const [w, al] of [[6, 0.35], [2.4, 0.95]] as const) {
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
                c.g.lineWidth = 3 + 3 * t
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
            c.g.lineWidth = 2
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
                16 * k * a,
                col(MAGENTA,
                    a * 0.7))
            strip(c.g,
                p1,
                p2,
                5 * k * a,
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

/** Đường nứt gãy khúc hình học từ a tới b: các đoạn thẳng lệch trái phải, `u` 0..1 là phần đã lan */
function crackPath(a: Pt, b: Pt, seed: number): Pt[] {
    const n = Math.max(4,
        Math.round(dist(a,
            b) / 70))
    const d = angleOf(a,
        b)
    const nx = -Math.sin(d), ny = Math.cos(d)
    const out: Pt[] = []
    for (let i = 0; i <= n; i++) {
        const p = mix(a,
            b,
            i / n)
        const side = i === 0 || i === n ? 0 : Math.sin(i * 2.3 + seed) * 18
        out.push({
            x: p.x + nx * side, y: p.y + ny * side
        })
    }
    return out
}

/** Vẽ phần `u` của đường gãy khúc: viền hồng, lõi trắng; mũi nứt có quầng loé */
function drawCrack(g: Graphics, pts: Pt[], u: number, w: number, a: number) {
    const total = (pts.length - 1) * u
    for (let i = 0; i < pts.length - 1 && i < total; i++) {
        const end = Math.min(1,
            total - i)
        const p1 = pts[i]
        const p2 = mix(pts[i],
            pts[i + 1],
            end)
        strip(g,
            p1,
            p2,
            w * 2.4,
            col(VIOLET,
                a * 0.35))
        strip(g,
            p1,
            p2,
            w,
            col(MAGENTA,
                a * 0.9))
        strip(g,
            p1,
            p2,
            w * 0.35,
            col(CORE,
                a))
    }
}

/** Mũi nứt đang ở đâu trên đường gãy khúc */
function crackTip(pts: Pt[], u: number): Pt {
    const total = (pts.length - 1) * u
    const i = Math.min(pts.length - 2,
        Math.floor(total))
    return mix(pts[i],
        pts[i + 1],
        Math.min(1,
            total - i))
}

/** Vòng ký hiệu trên đất ở chân mục tiêu: vòng dẹt, hai tam giác ngược chiều quay, sáng dần trong `secs` */
function groundSigil(layer: Node, at: Pt, r: number, secs: number) {
    const foot = {
        x: at.x, y: at.y - r * 0.35
    }
    const dark = canvas(layer,
        false)
    const c = canvas(layer)
    return over(layer,
        secs,
        (t) => {
            const a = Math.min(1,
                t * 3)
            dark.g.clear()
            dark.g.fillColor = col(ABYSS,
                0.55 * a)
            dark.g.ellipse(foot.x,
                foot.y,
                r * 1.05,
                r * 0.42)
            dark.g.fill()
            c.g.clear()
            c.g.lineWidth = 3
            c.g.strokeColor = col(MAGENTA,
                0.8 * a)
            c.g.ellipse(foot.x,
                foot.y,
                r,
                r * 0.4)
            c.g.stroke()
            c.g.lineWidth = 2
            c.g.strokeColor = col(PINK,
                0.7 * a)
            tri(c.g,
                foot,
                r * 0.85,
                t * 3,
                0.4)
            c.g.stroke()
            tri(c.g,
                foot,
                r * 0.85,
                -t * 3 + Math.PI,
                0.4)
            c.g.stroke()
            c.g.fillColor = col(VIOLET,
                0.25 * a + 0.2 * Math.sin(t * 30) ** 2)
            c.g.ellipse(foot.x,
                foot.y,
                r * 0.55,
                r * 0.22)
            c.g.fill()
        }).then(() => {
        dark.done()
        c.done()
    })
}

/** Cột Hư Không phụt thẳng lên từ chân mục tiêu: cột thon sáng rồi tắt, mảnh tam giác bị hất tung, sóng dẹt toả ra */
async function voidEruption(layer: Node, at: Pt, k: number) {
    const foot = {
        x: at.x, y: at.y - 60 * k
    }
    const h = 300 * k
    const c = canvas(layer)
    emit(layer,
        foot,
        {
            color: [CORE], kind: "glow", life: [0.2,
                0.2], size: [80 * k,
                220 * k], alpha: 1
        })
    void burst(layer,
        foot,
        1,
        {
            color: [MAGENTA], kind: "ring", life: [0.35,
                0.35], size: [40,
                320 * k], alpha: 0.85
        })
    void triBurst(layer,
        foot,
        Math.round(16 * k),
        [380,
            820],
        [UP - 0.6,
            UP + 0.6],
        22 * k)
    void burst(layer,
        foot,
        Math.round(14 * k),
        {
            color: [CORE,
                PINK,
                MAGENTA], kind: "blade", life: [0.2,
                0.42], size: [70 * k,
                12], alpha: 1, speed: [500,
                1100], angle: [UP - 0.18,
                UP + 0.18], drag: 1.8, align: true, stretch: 3.2, spread: 30 * k
        })
    void decayDust(layer,
        at,
        Math.round(40 * k),
        50 * k)
    await over(layer,
        0.36,
        (t) => {
            const grow = ease.out(Math.min(1,
                t * 2.2))
            const fade = 1 - ease.in(t)
            const top = {
                x: foot.x, y: foot.y + h * grow
            }
            c.g.clear()
            softBeam(c.g,
                foot,
                top,
                k * fade,
                fade)
            helix(c.g,
                foot,
                top,
                30 * k * fade,
                t * 30,
                fade)
            // sóng dẹt trên đất
            c.g.lineWidth = 4 * fade
            c.g.strokeColor = col(PINK,
                0.8 * fade)
            c.g.ellipse(foot.x,
                foot.y,
                lerp(40,
                    190,
                    ease.out(t)) * k,
                lerp(14,
                    60,
                    ease.out(t)) * k)
            c.g.stroke()
        })
    c.done()
}

/**
 * E: mắt tụ, vết nứt gãy khúc lan từ Vel'Koz tới tâm (to[0]) rồi toạc ngang qua mọi mục tiêu; dưới mỗi mục tiêu hiện vòng
 * ký hiệu rồi cột Hư Không phụt lên. Cuối lượt khe rách lại: ký hiệu sáng nhanh hơn, cột to hơn.
 */
registerSkillVfx("velkoz_e",
    async (ctx) => {
        const k = power(ctx)
        const centre = ctx.to[0] ?? polar(ctx.from,
            UP,
            400)
        const victims = ctx.to.length ? ctx.to : [centre]
        const xs = victims.map((t) => t.x)
        const left = {
            x: Math.min(...xs) - 110, y: centre.y - 50
        }
        const right = {
            x: Math.max(...xs) + 110, y: centre.y - 50
        }
        const hub = {
            x: centre.x, y: centre.y - 50
        }
        const toHub = crackPath(ctx.from,
            hub,
            1)
        const toL = crackPath(hub,
            left,
            2)
        const toR = crackPath(hub,
            right,
            3)
        await eyeCharge(ctx.layer,
            ctx.from,
            0.16,
            40 * k)
        const c = canvas(ctx.layer)
        let fade = 1
        let uHub = 0, uSide = 0
        const draw = () => {
            c.g.clear()
            drawCrack(c.g,
                toHub,
                uHub,
                8 * k,
                fade)
            drawCrack(c.g,
                toL,
                uSide,
                9 * k,
                fade)
            drawCrack(c.g,
                toR,
                uSide,
                9 * k,
                fade)
        }
        const tipSparks = (pts: Pt[], u: number) => emit(ctx.layer,
            crackTip(pts,
                u),
            {
                color: [CORE,
                    PINK], kind: "blade", life: [0.12,
                    0.24], size: [20,
                    5], alpha: 1, speed: [120,
                    320], angle: [UP - 0.8,
                    UP + 0.8], drag: 2, align: true, stretch: 2.4
            })
        await over(ctx.layer,
            0.22,
            (t) => {
                uHub = ease.out(t)
                draw()
                tipSparks(toHub,
                    uHub)
            })
        await over(ctx.layer,
            0.24,
            (t) => {
                uSide = ease.out(t)
                draw()
                tipSparks(toL,
                    uSide)
                tipSparks(toR,
                    uSide)
            })
        await Promise.all(victims.map((v) => groundSigil(ctx.layer,
            v,
            95 * k,
            0.34)))
        for (const v of victims) void voidEruption(ctx.layer,
            v,
            k)
        // khe tắt dần trong lúc chờ cuối lượt
        await over(ctx.layer,
            0.5,
            (t) => {
                fade = 1 - t * 0.75
                draw()
            })
        await wait(ctx.layer,
            0.4)
        // cuối lượt: khe sáng bừng lại, ký hiệu nhanh hơn, cột lớn hơn
        await over(ctx.layer,
            0.16,
            (t) => {
                fade = 0.25 + 0.75 * t
                draw()
            })
        await Promise.all(victims.map((v) => groundSigil(ctx.layer,
            v,
            105 * k,
            0.22)))
        for (const v of victims) void voidEruption(ctx.layer,
            v,
            k * 1.3)
        await over(ctx.layer,
            0.45,
            (t) => {
                fade = 1 - t
                draw()
            })
        c.done()
        await wait(ctx.layer,
            0.2)
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
                    k * on * flick,
                    on)
                const dir = angleOf(eye,
                    tip)
                // hai sợi năng lượng xoắn quanh thân tia, chạy từ mắt ra
                helix(c.g,
                    eye,
                    tip,
                    26 * k * on,
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
                    const r = 46 * k * on * (1 - pulses[i] * 0.35)
                    const a = on * (1 - pulses[i] * 0.7)
                    for (const [w, cc, aa] of [[9, MAGENTA, 0.45], [4, PINK, 0.9], [1.6, CORE, 1]] as const) {
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
                            0.08], size: [90 * k,
                            70 * k], alpha: 0.7 * on
                    })
                emit(ctx.layer,
                    tip,
                    {
                        color: [MAGENTA,
                            CORE], kind: "glow", life: [0.06,
                            0.1], size: [100 * k,
                            70 * k], alpha: 0.8 * on
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
                c.g.lineWidth = 2
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

/** Xung plasma nhỏ: giọt plasma ngắn từ mắt tới mục tiêu, loé nhỏ */
registerSkillVfx("basic_velkoz",
    async (ctx) => {
        await Promise.all((ctx.to.length ? ctx.to : [polar(ctx.from,
            UP,
            300)]).map(async (to) => {
            emit(ctx.layer,
                ctx.from,
                {
                    color: [PINK], kind: "glow", life: [0.12,
                        0.12], size: [30,
                        70], alpha: 0.9
                })
            await plasmaBolt(ctx.layer,
                ctx.from,
                to,
                Math.min(0.26,
                    0.1 + dist(ctx.from,
                        to) / 4000),
                11)
            plasmaHit(ctx.layer,
                to,
                0.55,
                ctx.from)
        }))
        await wait(ctx.layer,
            0.2)
    })
