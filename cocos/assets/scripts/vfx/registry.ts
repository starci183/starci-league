// VFX theo chiêu: MỖI chiêu (tướng + P/Q/E/R, phép bổ trợ, đòn đánh thường) có một ô hiệu ứng riêng, tra theo khoá.
// Tạm thời mọi ô dùng hiệu ứng MỘT HẠT (thầy chốt 2026-11-04): một hạt sáng bay từ người dùng tới mục tiêu rồi loé,
// màu lấy từ bảng màu theo chiêu của bản web (heroMap.gen.ts). Thay hiệu ứng thật cho chiêu nào thì gọi
// registerSkillVfx(khoá, hàm) cho chiêu đó; chỗ gọi không đổi.
import {
    Color, Graphics, Node, Tween, UIOpacity, UITransform, Vec3, tween
} from "cc"
import {
    skillVfx, spellVfx
} from "./heroMap.gen"
import type {
    SkillVfx
} from "./types"

export interface Pt { x: number; y: number }

/** Ngữ cảnh một lần phát: lớp vẽ, điểm đầu / cuối, màu theo chiêu */
export interface VfxCtx {
    layer: Node;
    from: Pt;
    to: Pt[];
    style: SkillVfx;
    /** Mã tướng đồng minh bị đổi chỗ (Sylas Q), để vẽ bóng tướng trượt qua nhau */
    allyHero?: string;
    /** Báo nhịp trúng thứ i (0, 1...) đúng lúc hình ảnh chạm; bên gọi hiện số sát thương theo nhịp này */
    onBeat?: (i: number) => void;
    /** Đường đi thật của từng cú theo thứ tự engine (nguồn `via` -> đích); có thì VFX đi đúng các chặng này, nhịp i = cú i */
    hops?: Hop[];
}
/** Một cú trúng: từ đâu tới đâu, loại gì (hồi máu, khiên, sát thương) */
export interface Hop { from: Pt; to: Pt; kind: "heal" | "shield" | "damage" }
export type SkillEffect = (ctx: VfxCtx) => Promise<void>

/** Khoá của một chiêu: "<tướng>_<p|q|e|r>", "spell_<phép>", "basic_<tướng>" */
export const skillKey = (hero: string, key: string) => `${hero}_${key.toLowerCase()}`

const REGISTRY = new Map<string, SkillEffect>()

export function registerSkillVfx(key: string, fx: SkillEffect) {
    REGISTRY.set(key,
        fx)
}

const hexColor = (n: number, a = 255) => new Color((n >> 16) & 255,
    (n >> 8) & 255,
    n & 255,
    a)

/** Một hạt tròn phát sáng: lõi màu chính, quầng màu phụ */
function particle(layer: Node, at: Pt, style: SkillVfx, radius: number): Node {
    const n = new Node("Particle")
    n.layer = layer.layer
    n.addComponent(UITransform).setContentSize(radius * 4,
        radius * 4)
    layer.addChild(n)
    n.setPosition(at.x,
        at.y)
    const g = n.addComponent(Graphics)
    g.fillColor = hexColor(style.color2 ?? style.color,
        70)
    g.circle(0,
        0,
        radius * 1.9)
    g.fill()
    g.fillColor = hexColor(style.color,
        235)
    g.circle(0,
        0,
        radius)
    g.fill()
    g.fillColor = new Color(255,
        255,
        255,
        220)
    g.circle(0,
        0,
        radius * 0.45)
    g.fill()
    n.addComponent(UIOpacity)
    return n
}

const run = <T extends object>(t: Tween<T>) => new Promise<void>((resolve) => t.call(() => resolve()).start())

/** Hiệu ứng mặc định: một hạt bay từ người dùng tới từng mục tiêu, tới nơi phình ra rồi tắt */
export const oneParticle: SkillEffect = async (ctx) => {
    const big = (ctx.style.intensity ?? 1) > 1
    const r = big ? 13 : 9
    await Promise.all((ctx.to.length ? ctx.to : [ctx.from]).map(async (to) => {
        const p = particle(ctx.layer,
            ctx.from,
            ctx.style,
            r)
        const dist = Math.hypot(to.x - ctx.from.x,
            to.y - ctx.from.y)
        await run(tween(p).to(Math.min(0.55,
            0.18 + dist / 2200),
        {
            position: new Vec3(to.x,
                to.y,
                0)
        },
        {
            easing: "quadIn"
        }))
        const fade = p.getComponent(UIOpacity)!
        await Promise.all([
            run(tween(p).to(0.22,
                {
                    scale: new Vec3(big ? 3.4 : 2.4,
                        big ? 3.4 : 2.4,
                        1)
                },
                {
                    easing: "quadOut"
                })),
            run(tween(fade).to(0.22,
                {
                    opacity: 0
                })),
        ])
        p.destroy()
    }))
}

/** Hiệu ứng của chiêu theo khoá; chưa đăng ký riêng thì dùng một hạt */
export const effectOf = (key: string): SkillEffect => REGISTRY.get(key) ?? oneParticle

/** Màu theo chiêu từ bảng của web; key P/Q/E/R hoặc "basic" */
export function styleOf(hero: string, key: string): SkillVfx {
    const k = key.toLowerCase()
    if (k === "q" || k === "e" || k === "r" || k === "p") return skillVfx(hero,
        k)
    return skillVfx(hero,
        "q")
}

export const spellStyle = (spell: string): SkillVfx => spellVfx(spell)

/** Phát hiệu ứng của chiêu `key` từ `from` tới `to` */
export function playSkill(layer: Node, key: string, style: SkillVfx, from: Pt, to: Pt[], extra: { allyHero?: string; onBeat?: (i: number) => void; hops?: Hop[] } = {
}): Promise<void> {
    return effectOf(key)({
        layer, from, to, style, ...extra
    }).catch(() => undefined)
}
