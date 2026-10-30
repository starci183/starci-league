// Cầu nối giữa hoạt ảnh DOM (anim/plan.ts) và lớp hiệu ứng PixiJS.
// plan.ts hỏi: "lá này, trúng kiểu này, thì bay/nổ bằng hiệu ứng nào?" -> styleFor(); rồi gọi vfxTravel / vfxImpact.
// Các hiệu ứng "meta" (summon, death, forge, equip, drawSpark, shuffle, prizeFlip) gọi qua vfxMeta(name, pt).
import {
    cg
} from "@starci/shared"
import {
    playVfx, shakeScreen, vfxEpoch, vfxReady
} from "./VfxCanvas"
import {
    heroBasicVfx, heroBasicVfxSequence, skillVfx, spellVfx
} from "./heroMap"
import type {
    Pt, SkillVfx
} from "./types"
import {
    effectVfxNames, statusVfxNames, type EffectEvent
} from "./semanticVfx"
import {
    runActionVfxSequence, runVisualSequence
} from "./sequence"

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

export { vfxReady, vfxEpoch }

/** Resource actions are 1→N recipes too; one resource receipt is never replayed. */
export const TEAM_MANA_VFX = {
    spend: ["manaSpend"], restore: ["manaRestore"]
}
export async function vfxTeamMana(from: Pt, to: Pt, delta: number, land: () => void): Promise<void> {
    const epoch = vfxEpoch()
    const names = delta < 0 ? TEAM_MANA_VFX.spend : TEAM_MANA_VFX.restore
    let landed = false
    const once = () => { if (!landed) { landed = true; land() } }
    await runVisualSequence(names,
        async (name, index) => {
            try { await playVfx(name,
                from,
                [to],
                {
                    color: 0x4aafff, amount: Math.abs(delta), onBeat: index ? undefined : once
                }) }
            finally { if (!index) once() }
        },
        () => {},
        () => epoch === vfxEpoch())
    once()
}

export function styleSequenceFor(card: cg.Card | undefined, tint: VfxTint, crit: boolean, casterHero?: string): HitStyle[] {
    const base = styleFor(card,
        tint,
        crit,
        casterHero)
    if ((!card || card.id === "basic") && ["physical",
        "magic",
        "true"].includes(tint)) return heroBasicVfxSequence(casterHero ?? "",
        tint === "magic" ? "magic" : "physical",
        casterHero ? cg.getHero(casterHero)?.role : undefined).map(style => ({
        ...base, ...style, intensity: base.intensity, crit
    }))
    return [base]
}

/** The source selects every cue; absent metadata delegates to the semantic/role recipe. */
export function effectStylesFor(event: EffectEvent, card?: cg.Card, casterHero?: string): HitStyle[] {
    const tint: VfxTint = event.t === "damage" ? event.kind : event.t === "status" ? "gold" : event.t
    const fallback = styleSequenceFor(card,
        tint,
        event.t === "damage" && !!event.crit,
        casterHero)
    const names = effectVfxNames(event,
        casterHero)
    const explicit = (event as { visuals?: string[] }).visuals !== undefined
    if (!names.length) return explicit || event.t === "status" ? [] : fallback
    const base = fallback[0] ?? styleFor(card,
        tint,
        false,
        casterHero)
    const palette = event.t === "status" ? statusColors(event.id) : event.t === "shield" ? shieldColors(event.kind) : undefined
    return names.map(impact => ({
        ...base, ...(palette ? {
            color: palette[0], color2: palette[1]
        } : {
        }), impact
    }))
}

/** Màu Khiên theo loại: trắng (mọi sát thương), vàng (vật lý), xanh dương (phép) */
function shieldColors(kind?: cg.ShieldKind): [number, number] {
    if (kind === "physical") return [0xe0a935,
        0xffe08a]
    if (kind === "magic") return [0x3d8fe0,
        0x9fd8ff]
    return [0xd6e4f0,
        0xffffff]
}

function statusColors(id: string): [number, number] {
    if (id === "burn") return [0xff742c,
        0xffd17c]
    if (id === "poison") return [0x83cc4a,
        0xd4ff85]
    if (id === "bleed") return [0xdb3755,
        0xffa0a8]
    if (["freeze",
        "frozen",
        "chill"].includes(id)) return [0x85dfff,
        0xe6ffff]
    if (["stun",
        "blind",
        "taunt"].includes(id)) return [0xf2ce69,
        0xfff1b3]
    return [0xabbdb1,
        0xe3efff]
}

export function vfxMushroom(phase: "plant" | "burst", from: Pt, to: Pt) {
    return playVfx(phase === "plant" ? "mushroomPlant" : "mushroomBurst",
        from,
        [to],
        {
            color: 0x91df46
        })
}

export function vfxCardHook(from: Pt, to: Pt) {
    let target = () => to
    let released = false
    let contact = () => {}
    const reached = new Promise<void>((resolve) => { contact = resolve })
    const done = playVfx("cardHook",
        from,
        [to],
        {
            tether: {
                target: () => target(), released: () => released, contact: () => contact()
            }
        }).finally(() => contact())
    return {
        reached, ended: done,
        follow(next: () => Pt) { target = next },
        release() { released = true; return done }
    }
}

/** Giải kiểu hiệu ứng cho một cú trúng.
 *  card: lá đánh (undefined = đòn thường lẻ); casterHero: id tướng ra đòn (để suy vai trò / lá wild) */
export function styleFor(card: cg.Card | undefined, tint: VfxTint, crit: boolean, casterHero?: string): HitStyle {
    const role: string | undefined = casterHero ? cg.getHero(casterHero)?.role : undefined
    let base: SkillVfx
    let icon: string | undefined
    const src = card?.copyOf ?? card?.id ?? "basic"
    const key = /_([qerp])$/.exec(src)?.[1] as "q" | "e" | "r" | "p" | undefined
    if (tint === "heal" || tint === "shield") {
        const [color,
            color2] = COLORS[tint]
        const mapped = key && (card?.hero ?? casterHero) ? skillVfx(card?.hero ?? casterHero ?? "",
            key) : undefined
        base = {
            travel: "none", impact: tint, color: mapped?.color ?? color, color2: mapped?.color2 ?? color2, cast: mapped?.cast
        }
    } else if (key && (card?.hero ?? casterHero)) {
        const hero = card?.hero ?? casterHero ?? ""
        base = skillVfx(hero,
            key)
        icon = card?.kind === "skill" || card?.copyOf ? `/card_skills/${hero}_${key}.png` : undefined
    } else if (src.startsWith("spell_")) {
        base = spellVfx(src.slice(6))
    } else if (!card || src === "basic") {
        base = heroBasicVfx(casterHero ?? "",
            tint === "magic" ? "magic" : "physical",
            role ?? "fighter")
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

/** Niệm chiêu một lần trước khi đạn bay, không lặp theo số mục tiêu. */
export function vfxCast(style: HitStyle, at: Pt): Promise<void> {
    if (!style.cast || style.cast === "none") return Promise.resolve()
    return playVfx(style.cast,
        at,
        [],
        {
            color: style.color, color2: style.color2, intensity: style.intensity, icon: style.icon
        })
}

/** Cùng chuỗi cho thư viện và trận đấu: niệm, bay, rồi trúng. */
export async function vfxForStyle(style: HitStyle, from: Pt, targets: Pt[]): Promise<void> {
    const epoch = vfxEpoch()
    await vfxCast(style,
        from)
    if (epoch !== vfxEpoch()) return
    const points = targets.length ? targets : [from]
    await Promise.all(points.map((to) => vfxTravel(style,
        from,
        to)))
    if (epoch !== vfxEpoch()) return
    await Promise.all(points.map((to) => vfxImpact(style,
        to)))
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
    const epoch = vfxEpoch()
    const styles = styleSequenceFor(card,
        tint,
        crit,
        casterHero)
    await vfxCast(styles[0],
        from)
    await runActionVfxSequence(styles,
        st => from.x !== to.x || from.y !== to.y ? vfxTravel(st,
            from,
            to) : Promise.resolve(),
        st => vfxImpact(st,
            to),
        () => {},
        () => epoch === vfxEpoch())
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

/** Hiệu ứng theo ý nghĩa trạng thái thật; không dựng Giáp/Kháng Phép thành Khiên máu. */
export function vfxStatus(id: string, at: Pt, value = 0): Promise<void> {
    const names = statusVfxNames(id,
        value)
    const epoch = vfxEpoch()
    const [color,
        color2] = statusColors(id)
    return runVisualSequence(names,
        name => playVfx(name,
            at,
            [],
            {
                color, color2
            }),
        () => {},
        () => epoch === vfxEpoch())
}
