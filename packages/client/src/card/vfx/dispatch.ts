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
    JAYCE_CANNON, TEEMO_VFX, heroBasicVfx, heroBasicVfxSequence, skillVfx, spellVfx, stolenVfx
} from "./heroMap"
import type {
    Pt, SkillVfx
} from "./types"
import {
    recycledStyle, type Cue, type Place
} from "./heroCues"
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
    /** ctx.amount của cú trúng: số tầng, loại lá, Thuốc Súng */
    amount?: number;
    /** ctx.to của cú trúng (tướng kề, tay bài...) */
    to?: Pt[];
    /** Lá Tái Chế của Rumble: niệm hướng tới vị trí lá trên tay */
    recycled?: boolean;
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
    const explicit = (event as { visuals?: string[] }).visuals !== undefined
    // Khiên không ghi visuals: dùng Khiên riêng của chiêu nếu heroMap có
    const names = event.t === "shield" && !explicit && fallback[0] ? [fallback[0].impact] : effectVfxNames(event,
        casterHero)
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
    return playVfx(phase === "plant" ? "mushroomPlant" : TEEMO_VFX.burst,
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
    // Chiêu Đoạt của Sylas: đúng VFX của tướng gốc, ánh xanh tím; Jayce: bản Pháo theo dạng lúc đánh lá
    const stolenFrom = card?.data?.stolen ? String(card.data.recycled) : undefined
    const owner = stolenFrom ?? card?.hero ?? casterHero
    const cannon = owner === "jayce" && Number(card?.data?.form ?? 0) === 1 && key && key !== "p" ? JAYCE_CANNON[key] : undefined
    const recycled = card ? recycledStyle(card) : undefined
    if (recycled && tint !== "heal" && tint !== "shield") {
        // Lá Tái Chế: Rumble tung bằng tay mình (cast của Rumble), đạn rỉ sét mang màu chiêu gốc
        const intensity = Math.max(recycled.style.intensity ?? 1,
            crit ? 2 : 1)
        return {
            ...recycled.style, cast: recycled.cast, icon: `/card_skills/${recycled.origin}_${recycled.key}.png`, intensity, crit, recycled: true
        }
    }
    if (tint === "heal" || tint === "shield") {
        const [color,
            color2] = COLORS[tint]
        const mapped = key && owner ? skillVfx(owner,
            key) : undefined
        base = {
            travel: "none", impact: tint === "shield" ? mapped?.shield ?? tint : tint, color: mapped?.color ?? color, color2: mapped?.color2 ?? color2, cast: mapped?.cast
        }
    } else if (key && owner) {
        const hero = owner
        base = cannon ?? (stolenFrom ? stolenVfx(stolenFrom,
            key) : skillVfx(hero,
            key))
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

/** Đạn bay từ `from` tới `to`. Xong ngay khi đạn chạm mục tiêu (hiệu ứng gọi ctx.onBeat), không chờ đuôi hạt tan */
export function vfxTravel(style: HitStyle, from: Pt, to: Pt): Promise<void> {
    if (style.travel === "none") return Promise.resolve()
    return new Promise<void>((resolve) => {
        void playVfx(style.travel,
            from,
            [to],
            {
                color: style.color, color2: style.color2, icon: style.icon, intensity: style.intensity, onBeat: resolve
            }).finally(resolve)
    })
}

/** Niệm chiêu một lần trước khi đạn bay, không lặp theo số mục tiêu.
 *  `targets` là toạ độ mọi mục tiêu (R vẽ trùm cả hàng địch); `onBeat` được gọi đúng khoảnh khắc chiêu chạm, để kết quả (máu, số, trạng thái) rơi cùng nhịp đó. */
export function vfxCast(style: HitStyle, at: Pt, targets: Pt[] = [], onBeat?: () => void): Promise<void> {
    if (!style.cast || style.cast === "none") return Promise.resolve()
    return playVfx(style.cast,
        at,
        targets,
        {
            color: style.color, color2: style.color2, intensity: style.intensity, icon: style.icon, amount: style.amount, onBeat
        })
}

/** Niệm chiêu rồi trả lời NGAY khi chiêu báo nhịp (hoặc khi nó xong nếu không báo), phần đuôi cue vẫn chạy tiếp. `tail` xong khi cue tan hẳn. */
export function vfxCastBeat(style: HitStyle, at: Pt, targets: Pt[] = []): { beat: Promise<void>; tail: Promise<void> } {
    let beat = () => {}
    const reached = new Promise<void>((resolve) => { beat = resolve })
    const tail = vfxCast(style,
        at,
        targets,
        beat).finally(beat)
    return {
        beat: reached, tail
    }
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
        style.to ?? [],
        {
            color: style.color, color2: style.color2, icon: style.icon, intensity: style.intensity, amount: style.amount
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

// ---------------------------------------------------------------- cue riêng của tướng (heroCues.ts)

/** Cue bám lá (ctx.tether): sống tới khi nhả bằng khoá của nó */
const holds = new Map<string, { released: boolean }>()

/** Nhả mọi hold khớp khoá; khoá kết thúc bằng "|" nhả mọi hold của đơn vị/lá đó */
export function vfxRelease(key: string) {
    for (const [k,
        h] of holds) if (k === key || (key.endsWith("|") && k.startsWith(key))) h.released = true
}
export function vfxReleaseAll() {
    for (const h of holds.values()) h.released = true
    holds.clear()
}
export const vfxHolding = (key: string) => holds.has(key)

/** Chạy một Cue. Cue lead trả lời khi chạm (ctx.onBeat); cue hold trả lời ngay sau khi đã dựng, phần còn lại tự chạy tới khi nhả. */
export function vfxCue(cue: Cue, resolve: (place: Place) => Pt): Promise<void> {
    const epoch = vfxEpoch()
    const from = resolve(cue.from)
    const to = (cue.to ?? []).map(resolve)
    const opts: Parameters<typeof playVfx>[3] = {
        color: cue.color, color2: cue.color2, intensity: cue.intensity ?? 1, amount: cue.amount, icon: cue.icon
    }
    if (cue.hold) {
        const old = holds.get(cue.hold)
        if (old && !old.released) return Promise.resolve()
        const state = {
            released: false
        }
        holds.set(cue.hold,
            state)
        opts.tether = {
            target: () => resolve(cue.from), released: () => state.released || epoch !== vfxEpoch(), contact: () => {}
        }
        const key = cue.hold
        void playVfx(cue.name,
            from,
            to,
            opts).finally(() => { if (holds.get(key) === state) holds.delete(key) })
        return Promise.resolve()
    }
    if (cue.kind !== "lead") return playVfx(cue.name,
        from,
        to,
        opts)
    return new Promise<void>((done) => {
        opts.onBeat = done
        void playVfx(cue.name,
            from,
            to,
            opts).finally(done)
    })
}

/** Lá bay lên tay bằng cue PixiJS (lá rèn của Ornn, lá R của Yorick, Q miễn phí của Kha'Zix...). Trả lời khi chạm tay. */
export function vfxHandFlight(cue: Cue, resolve: (place: Place) => Pt): Promise<void> {
    return vfxCue({
        ...cue, kind: "lead"
    },
    resolve)
}
