// Cầu nối giữa hoạt ảnh DOM (anim/plan.ts) và lớp hiệu ứng PixiJS.
// plan.ts hỏi: "lá này, trúng kiểu này, thì bay/nổ bằng hiệu ứng nào?" -> styleFor(); rồi gọi vfxTravel / vfxImpact.
// Các hiệu ứng "meta" (summon, death, forge, equip, drawSpark, shuffle, prizeFlip) gọi qua vfxMeta(name, pt).
import {
    cg
} from "@starci/shared"
import {
    playVfx, shakeScreen, vfxReady
} from "./VfxCanvas"
import {
    basicVfx, skillVfx, spellVfx
} from "./heroMap"
import type {
    Pt, SkillVfx
} from "./types"

export type VfxTint = "physical" | "magic" | "true" | "heal" | "shield" | "gold"

/** Kiểu vẽ đã giải ra cho một cú trúng */
export interface HitStyle extends SkillVfx {
    icon?: string;
    intensity: number;
    crit: boolean;
}

const COLORS: Record<VfxTint, [number, number]> = {
    physical: [0xff9a4a,
        0xffe2b0],
    magic: [0xa66bff,
        0xe4d0ff],
    true: [0xffffff,
        0xffc8c8],
    heal: [0x5dff9a,
        0xd8ffe8],
    shield: [0x6ac8ff,
        0xe0f4ff],
    gold: [0xffd24a,
        0xfff2b8]
}

export { vfxReady }

/** Giải kiểu hiệu ứng cho một cú trúng.
 *  card: lá đánh (undefined = đòn thường lẻ); casterHero: id tướng ra đòn (để suy vai trò / lá wild) */
export function styleFor(card: cg.Card | undefined, tint: VfxTint, crit: boolean, casterHero?: string): HitStyle {
    const role: string | undefined = casterHero ? cg.getHero(casterHero)?.role : undefined
    let base: SkillVfx
    let icon: string | undefined
    const src = card?.copyOf ?? card?.id ?? "basic"
    const key = /_([qer])$/.exec(src)?.[1] as "q" | "e" | "r" | undefined
    if (tint === "heal" || tint === "shield") {
        const [color,
            color2] = COLORS[tint]
        base = {
            travel: "none", impact: tint, color, color2
        }
    } else if (key && (card?.hero ?? casterHero)) {
        const hero = card?.hero ?? casterHero ?? ""
        base = skillVfx(hero,
            key)
        icon = card?.kind === "skill" || card?.copyOf ? `/card_skills/${hero}_${key}.png` : undefined
    } else if (src.startsWith("spell_")) {
        base = spellVfx(src.slice(6))
    } else if (!card || src === "basic") {
        base = basicVfx(role ?? "fighter",
            tint === "magic" ? "magic" : "physical")
    } else {
        const [color,
            color2] = COLORS[tint]
        base = {
            travel: "none", impact: "burst", color, color2
        }
    }
    const intensity = Math.max(base.intensity ?? 1,
        crit ? 2 : 1)
    return {
        ...base, icon, intensity, crit
    }
}

/** Đạn bay từ `from` tới `to` */
export function vfxTravel(style: HitStyle, from: Pt, to: Pt): Promise<void> {
    if (style.travel === "none") return Promise.resolve()
    return playVfx(style.travel,
        from,
        [to],
        {
            color: style.color, color2: style.color2, icon: style.icon, intensity: style.intensity
        })
}

/** Nổ trúng tại `at` (chí mạng / chiêu cuối: rung màn hình) */
export function vfxImpact(style: HitStyle, at: Pt): Promise<void> {
    if (style.crit) shakeScreen(7,
        260)
    else if (style.intensity >= 2) shakeScreen(5,
        220)
    return playVfx(style.impact,
        at,
        [],
        {
            color: style.color, color2: style.color2, icon: style.icon, intensity: style.intensity
        })
}

/** Trọn bộ cho một cú: bay rồi nổ (dùng khi không cần chia nhịp) */
export async function vfxForCardPlay(card: cg.Card | undefined, tint: VfxTint, crit: boolean, from: Pt, to: Pt, casterHero?: string): Promise<void> {
    const st = styleFor(card,
        tint,
        crit,
        casterHero)
    if (from.x !== to.x || from.y !== to.y) await vfxTravel(st,
        from,
        to)
    await vfxImpact(st,
        to)
}

/** Hiệu ứng meta tại một điểm: "summon" | "death" | "forge" | "equip" | "drawSpark" | "shuffle" | "prizeFlip" (chưa đăng ký thì bỏ qua) */
export function vfxMeta(name: string, at: Pt, color = COLORS.gold[0], to: Pt[] = []): Promise<void> {
    return playVfx(name,
        at,
        to,
        {
            color, color2: COLORS.gold[1]
        })
}
