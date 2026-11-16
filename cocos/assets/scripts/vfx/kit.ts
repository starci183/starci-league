// BỘ CÔNG CỤ VFX CHUẨN dùng chung cho mọi tướng (chủ chốt 2026-11-16: mọi tướng một bản, đủ nét để wow, mẫu là Vel'Koz).
// Tách từ các kỹ thuật của velkoz.ts và tham số hoá theo BẢNG MÀU của từng tướng, để tướng nào cũng có cùng chất:
// hoà màu cộng, tia mềm nhiều lớp (quầng ngoài mờ -> lõi trắng), loé chạm có sóng xung kích, mảnh vỡ văng NGƯỢC hướng
// đánh, bụi tan bay lên, tụ năng lượng có hạt hút vào, đạn bay có đuôi, sóng loang trên mặt đất, ngẫu nhiên có hạt giống.
// Luật dùng: docs/VFX_RULES.md (mục 5 và 7). Hình khối riêng của tướng (kiếm, thùng, nấm...) vẫn tự vẽ trong file tướng,
// nhưng phần sáng / chạm / vỡ / bụi / tia nên đi qua đây để mọi tướng cùng độ đậm.
import {
    Color, Graphics, Node, UITransform
} from "cc"
import {
    angleOf, burst, dist, ease, emit, mix, over, rand, type Pt
} from "./particles"

export const TAU = Math.PI * 2
export const UP = Math.PI / 2

/** Bảng màu một tướng / một chiêu: lõi (gần trắng), chính, sâu (tối), nhấn, bụi */
export interface Palette {
    /** Lõi sáng nhất, gần trắng */
    core: number;
    /** Màu chính của chiêu */
    main: number;
    /** Màu sâu, tối hơn: quầng ngoài, viền tối */
    deep: number;
    /** Màu nhấn (tia lửa, viền sáng) */
    accent: number;
    /** Màu bụi tan (mặc định: accent, main, trắng) */
    dust?: number[];
}

/** Màu Cocos từ hex + độ đục 0..1 */
export const col = (hex: number, a: number) => new Color((hex >> 16) & 255,
    (hex >> 8) & 255,
    hex & 255,
    Math.max(0,
        Math.min(255,
            Math.round(a * 255))))

export const polar = (at: Pt, a: number, r: number, squash = 1): Pt => ({
    x: at.x + Math.cos(a) * r, y: at.y + Math.sin(a) * r * squash
})

/** Số ngẫu nhiên có hạt giống: cùng seed thì cùng chuỗi, để hình gãy khúc đứng yên giữa các khung (VFX_RULES mục 5) */
export function seeded(seed: number) {
    let x = Math.floor(Math.abs(seed) * 9973) % 2147483647 || 1
    return () => {
        x = x * 16807 % 2147483647
        return (x - 1) / 2147483646
    }
}

/** Một nút Graphics vẽ lại mỗi khung hình; `additive` cho hoà màu cộng như hạt sáng. Gọi done() khi xong. */
export function canvas(layer: Node, additive = true) {
    const n = new Node("KitGfx")
    n.layer = layer.layer
    n.addComponent(UITransform).setContentSize(1920,
        1080)
    layer.addChild(n)
    const g = n.addComponent(Graphics)
    if (additive) {
        const blend = g as unknown as { srcBlendFactor: number; dstBlendFactor: number }
        blend.srcBlendFactor = 2 // SRC_ALPHA
        blend.dstBlendFactor = 1 // ONE
    }
    return {
        g, done: () => { if (n.isValid) n.destroy() }
    }
}

/** Dải thẳng a..b bề rộng `w`, hai đầu bo tròn */
export function strip(g: Graphics, a: Pt, b: Pt, w: number, c: Color) {
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

/** Các lớp tia, ngoài vào trong: [bề rộng tương đối 0..1, lớp màu, độ đậm]; 1 = bề rộng tối đa của tia */
const BEAM: [number, "deep" | "main" | "accent" | "core", number][] = [
    [1, "deep", 0.06],
    [0.77, "deep", 0.09],
    [0.57, "main", 0.14],
    [0.4, "main", 0.3],
    [0.28, "main", 0.6],
    [0.18, "accent", 0.85],
    [0.1, "core", 0.95],
    [0.05, "core", 1],
]

/**
 * Tia năng lượng mềm a..b: nhiều lớp chồng mờ dần (viền mảnh theo VFX_RULES mục 7: lõi 1–2 px, quầng mờ). `width` là bề
 * rộng tính cả quầng ngoài cùng (luật: tia trên sân ≤ ~40 px kể cả quầng; chiêu cuối được rộng hơn), `alpha` nhân độ đậm.
 */
export function softBeam(g: Graphics, a: Pt, b: Pt, p: Palette, width: number, alpha = 1) {
    for (const [w, k, al] of BEAM) strip(g,
        a,
        b,
        Math.max(1.2,
            w * width),
        col(p[k],
            al * alpha))
}

/** Đốm sáng tròn nhiều lớp tại `at` (lõi + quầng), bán kính ngoài `r` */
export function orb(g: Graphics, at: Pt, p: Palette, r: number, alpha = 1) {
    const layers: [number, number, number][] = [[1, p.deep, 0.08], [0.75, p.main, 0.16], [0.5, p.main, 0.4], [0.32, p.accent, 0.8], [0.18, p.core, 1]]
    for (const [k, c, al] of layers) {
        g.fillColor = col(c,
            al * alpha)
        g.circle(at.x,
            at.y,
            Math.max(1,
                r * k))
        g.fill()
    }
}

/** Mảnh vỡ văng ra: blade ngắn xoay. `angle` thường là hướng NGƯỢC lực đánh (VFX_RULES mục 5) */
export function shards(layer: Node, at: Pt, p: Palette, n: number, speed: [number, number], angle: [number, number] = [0,
    TAU], size = 18, gravity = -260) {
    return burst(layer,
        at,
        n,
        {
            color: [p.core,
                p.accent,
                p.main,
                p.deep], kind: "blade", life: [0.22,
                0.5], size: [size,
                size * 0.3], alpha: 1, speed, angle, drag: 2.4, spin: [-14,
                14], stretch: 1.1, gravity
        })
}

/** Bụi / tro tan khỏi vật chất, bay lên và loang */
export function dust(layer: Node, at: Pt, p: Palette, n: number, spread: number) {
    return burst(layer,
        at,
        n,
        {
            color: p.dust ?? [p.accent,
                p.main,
                0xffffff], kind: "dot", life: [0.5,
                1.0], size: [6,
                1], alpha: 0.9, speed: [20,
                110], angle: [UP - 1.1,
                UP + 1.1], drag: 1.3, gravity: 60, spread
        })
}

/**
 * Loé chạm chuẩn (mẫu plasmaHit của Vel'Koz): quầng lõi trắng, quầng màu chính, sóng xung kích, tia sắc văng NGƯỢC hướng
 * đánh (khi biết `from`), mảnh vỡ và bụi tan. `k` = độ nặng (1 thường, ~1.6 chiêu cuối). Không giữ hàng: chạy nền.
 */
export function impact(layer: Node, at: Pt, p: Palette, k = 1, from?: Pt) {
    const back = from ? angleOf(at,
        from) : undefined
    emit(layer,
        at,
        {
            color: [p.core], kind: "glow", life: [0.18,
                0.18], size: [60 * k,
                170 * k], alpha: 1
        })
    emit(layer,
        at,
        {
            color: [p.main], kind: "glow", life: [0.34,
                0.34], size: [120 * k,
                240 * k], alpha: 0.75
        })
    void burst(layer,
        at,
        1,
        {
            color: [p.accent], kind: "ring", life: [0.3,
                0.3], size: [24,
                200 * k], alpha: 0.9
        })
    void burst(layer,
        at,
        Math.round(18 * k),
        {
            color: [p.core,
                p.accent,
                p.main], kind: "blade", life: [0.14,
                0.34], size: [30 * k,
                6], alpha: 1, speed: [260,
                640], angle: back === undefined ? [0,
                TAU] : [back - 1.2,
                back + 1.2], drag: 2.4, align: true, stretch: 2.8
        })
    void shards(layer,
        at,
        p,
        Math.round(7 * k),
        [140,
            380],
        back === undefined ? [0,
            TAU] : [back - 1.4,
            back + 1.4])
    void dust(layer,
        at,
        p,
        Math.round(22 * k),
        24)
}

/**
 * Tụ năng lượng tại `at` trong `secs` giây (VFX_RULES mục 6: ≤ 0,25 s cho cú thường): hạt hút vào tâm từ vòng bán kính
 * `size`, quầng phồng dần rồi loé. Trả về khi tụ xong.
 */
export async function charge(layer: Node, at: Pt, p: Palette, secs: number, size: number) {
    emit(layer,
        at,
        {
            color: [p.deep], kind: "glow", life: [secs + 0.1,
                secs + 0.1], size: [size * 0.8,
                size * 2], alpha: 0.6
        })
    await over(layer,
        secs,
        () => {
            for (let i = 0; i < 3; i++) {
                const a = rand(0,
                    TAU)
                const r = size * rand(1.2,
                    1.7)
                emit(layer,
                    polar(at,
                        a,
                        r),
                    {
                        color: [p.accent,
                            p.core,
                            p.main], kind: "dot", life: [0.16,
                            0.2], size: [7,
                            2], alpha: 1, speed: [r * 5.5,
                            r * 6], angle: [a + Math.PI,
                            a + Math.PI]
                    })
            }
        })
    emit(layer,
        at,
        {
            color: [p.core], kind: "glow", life: [0.12,
                0.12], size: [size * 0.6,
                size * 1.4], alpha: 1
        })
}

/**
 * Đạn năng lượng bay from -> to trong `secs` giây: đầu là orb nhiều lớp, đuôi là tia mềm thon dần, hạt rơi theo đường.
 * `width` = bán kính đầu đạn. Trả về đúng lúc chạm (gọi impact / onBeat ngay sau await). Đường hơi cong khi `arc` ≠ 0.
 */
export async function bolt(layer: Node, from: Pt, to: Pt, p: Palette, secs: number, width = 16, arc = 0) {
    const c = canvas(layer)
    const d = angleOf(from,
        to)
    const nx = -Math.sin(d), ny = Math.cos(d)
    const len = dist(from,
        to)
    const at = (u: number): Pt => {
        const q = mix(from,
            to,
            u)
        const bend = Math.sin(u * Math.PI) * arc * len
        return {
            x: q.x + nx * bend, y: q.y + ny * bend
        }
    }
    await over(layer,
        secs,
        (t) => {
            const u = ease.inOut(t)
            const head = at(u)
            const tail = at(Math.max(0,
                u - 0.28))
            c.g.clear()
            softBeam(c.g,
                tail,
                head,
                p,
                width * 1.6,
                0.55)
            orb(c.g,
                head,
                p,
                width * 2.2)
            emit(layer,
                head,
                {
                    color: [p.accent,
                        p.main], kind: "dot", life: [0.2,
                        0.4], size: [5,
                        1], alpha: 0.9, speed: [10,
                        60], angle: [0,
                        TAU], drag: 2
                })
        })
    c.done()
}

/**
 * Sóng loang trên mặt đất tại `at` (dẹt theo phối cảnh, `squash` ~0.45): vành sáng nở ra rồi mờ, vành trong trễ nhịp.
 * Dùng cho chiêu vùng / dậm đất. Chạy nền.
 */
export function groundWave(layer: Node, at: Pt, p: Palette, radius: number, secs = 0.45, squash = 0.45) {
    const c = canvas(layer)
    void over(layer,
        secs,
        (t) => {
            c.g.clear()
            for (const [lag, w, al] of [[0, 6, 0.9], [0.18, 3, 0.6]] as const) {
                const u = Math.max(0,
                    Math.min(1,
                        (t - lag) / (1 - lag)))
                if (u <= 0) continue
                const r = radius * (0.2 + 0.8 * (1 - (1 - u) * (1 - u)))
                const fade = 1 - u
                for (const [ww, cc, aa] of [[w * 3, p.main, 0.25], [w, p.accent, 0.8], [Math.max(1, w * 0.35), p.core, 1]] as const) {
                    c.g.lineWidth = ww
                    c.g.strokeColor = col(cc,
                        aa * al * fade)
                    c.g.ellipse(at.x,
                        at.y,
                        r,
                        r * squash)
                    c.g.stroke()
                }
            }
        }).then(() => c.done())
}
