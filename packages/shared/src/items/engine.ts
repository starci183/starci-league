// Chạy nội tại của đồ. Luật (rules.ts) và server gọi vào đây, không biết từng món làm gì.
import type {
    Effect, StateLike, Target, UnitLike
} from "../types"
import {
    statsOf, itemsOf, onceKey, onceUsed
} from "./stats"
import type {
    HookName, IItem, IProp, PropCtx
} from "./types"

type Base = Omit<PropCtx, "self">;

/** Các prop đang bật (điều kiện thoả, chưa dùng nếu chỉ 1 lần) có khai báo tác dụng `key` */
export function activePassives<K extends keyof IProp>(u: UnitLike, key: K, base: Base, only?: IItem) {
    const out: { item: IItem; p: IProp; ctx: PropCtx }[] = []
    for (const item of only ? [only] : itemsOf(u)) {
        for (const p of item.props) {
            if (p[key] === undefined) continue
            const ctx: PropCtx = {
                ...base, self: u
            }
            if (!p.condition.test(ctx)) continue
            if (p.once && onceUsed(u,
                item,
                p)) continue
            out.push({
                item, p, ctx
            })
        }
    }
    return out
}

/** Gọi một hook trên mọi nội tại đang bật, gom hiệu ứng. Nội tại `once` tự đánh dấu đã dùng. */
export function runHook(u: UnitLike, hook: HookName, base: Base, only?: IItem): Effect[] {
    const fx: Effect[] = []
    for (const { item, p, ctx } of activePassives(u,
        hook,
        base,
        only)) {
        const out = p[hook]!(ctx)
        if (!out.length) continue
        fx.push(...out)
        if (p.once) fx.push({
            type: "stack", unitId: u.id, key: onceKey(item,
                p), set: 1
        })
    }
    return fx
}

export function itemExtraTargets(state: StateLike, u: UnitLike): Target[] {
    return activePassives(u,
        "extraTargets",
        {
            state, preview: true
        }).flatMap(({ p, ctx }) => p.extraTargets!(ctx))
}

export const blocksCC = (u: UnitLike) => activePassives(u,
    "blockCC",
    {
        preview: true
    }).some(({ p }) => p.blockCC)

/** Hệ số sát thương nhận vào từ đồ của người bị đánh */
export function itemDamageTaken(u: UnitLike, base: Base) {
    return activePassives(u,
        "damageTakenMult",
        base).reduce((m, { p, ctx }) => m * p.damageTakenMult!(ctx),
        1)
}

export interface OutgoingOpts {
  isSkill: boolean;
  /** true khi server tính thật (có tung xúc xắc chí mạng) */
  live: boolean;
}

/**
 * Áp đồ của người ra đòn lên hiệu ứng vừa tính: % sát thương, chí mạng, hook onAttack/onSkill, hút máu.
 * Dùng chung cho đòn đánh thường và chiêu.
 */
export function outgoing(state: StateLike, u: UnitLike, effects: Effect[], opts: OutgoingOpts): Effect[] {
    const st = statsOf(u,
        state)
    const tag = opts.isSkill ? "skill" : "attack"
    const roll = (p: number) => (opts.live ? Math.random() < p : p >= 1)
    const canCrit = !opts.isSkill || activePassives(u,
        "skillCrit",
        {
            state, preview: !opts.live
        }).some(({ p }) => p.skillCrit)
    let crit = false
    let firstTarget: UnitLike | undefined

    const out: Effect[] = effects.map((fx) => {
        if (fx.type !== "damage") return fx
        const t = fx.target.kind === "unit" ? state.units.get(fx.target.id) : undefined
        if (t && t.owner === u.owner) return {
            ...fx, src: fx.src ?? u.id, tag: fx.tag ?? tag
        } // tự gây (phản đòn...)
        firstTarget ??= t
        const base: Base = {
            state, target: t, isSkill: opts.isSkill, isAttack: !opts.isSkill, preview: !opts.live
        }
        let m = (1 + st.dmgAmp) * (opts.isSkill ? 1 + st.spellAmp : 1)
        let isCrit = false
        if (t) {
            for (const { p, ctx } of activePassives(u,
                "damageMult",
                base)) m *= p.damageMult!(ctx)
            if (canCrit) {
                const chance = st.crit + activePassives(u,
                    "critChance",
                    base).reduce((s, { p }) => s + p.critChance!,
                    0)
                if (chance > 0 && roll(chance)) { m *= 1.5 + st.critDmg; isCrit = true; crit = true }
            }
        }
        return {
            ...fx, amount: Math.round(fx.amount * m), src: u.id, tag, crit: isCrit || fx.crit
        }
    })

    const base: Base = {
        state, target: firstTarget, isSkill: opts.isSkill, isAttack: !opts.isSkill, effects: out, preview: !opts.live
    }
    if (opts.live) out.push(...runHook(u,
        opts.isSkill ? "onSkill" : "onAttack",
        base))

    // hút máu
    const vamp = (opts.isSkill ? 0 : st.lifesteal) + st.omnivamp
    if (vamp > 0) {
        const dealt = out.reduce((s, fx) =>
            fx.type === "damage" && fx.target.kind === "unit" && state.units.get(fx.target.id)?.owner !== u.owner ? s + fx.amount : s,
        0)
        if (dealt > 0) out.push({
            type: "heal", unitId: u.id, amount: Math.round(dealt * vamp)
        })
    }
    if (crit && opts.live) out.push(...runHook(u,
        "onCrit",
        base))
    return out
}
