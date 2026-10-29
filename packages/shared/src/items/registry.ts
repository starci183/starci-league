import {
    LEGEND_EQUIP_MANA
} from "../cards"
import {
    CARDS
} from "../registry"
import {
    NONE
} from "./conditions"
import {
    STAT_NAMES, type IItem, type IProp, type PropInput, type Stats, type Tier
} from "./types"

const items = new Map<string, IItem>()
const combos = new Map<string, string>()
const pairKey = (a: string, b: string) => [a,
    b].sort().join("+")

export const ZERO_STATS: Stats = {
    atk: 0, ap: 0, manaRegen: 0, atkMult: 0, hp: 0, armor: 0, mr: 0, lethality: 0, magicPen: 0, crit: 0, critDmg: 0, extraAtk: 0,
    lifesteal: 0, omnivamp: 0, spellAmp: 0, dmgAmp: 0, manaDiscount: 0,
}
export function addStats(...parts: Partial<Stats>[]): Stats {
    const out = {
        ...ZERO_STATS
    }
    for (const p of parts) for (const k of Object.keys(p) as (keyof Stats)[]) out[k] += p[k] ?? 0
    return out
}
export const describeStats = (s: Partial<Stats>) =>
    (Object.keys(s) as (keyof Stats)[]).filter((k) => s[k]).map((k) => STAT_NAMES[k](s[k]!)).join(", ")

/** Chuẩn hoá prop: thiếu điều kiện thì là NONE */
export const normalizeProps = (props: PropInput[] = []): IProp[] => props.map((p) => ({
    ...p, condition: p.condition ?? NONE
}))

/** Khai báo một món đồ. Chỉ số trở thành prop đầu tiên (điều kiện NONE); nội tại thiếu điều kiện cũng là NONE. */
export function defineItem(input: {
  id: string; name: string; tier: Tier; emoji: string; recipe?: string[]; lolIds?: number[];
  stats: Partial<Stats>;
  /** 1..N nội tại thường */
  passives?: PropInput[];
  /** 1..N nội tại điều kiện */
  conditionals?: (PropInput & { condition: IProp["condition"] })[];
}): IItem {
    if (items.has(input.id)) throw new Error(`Trùng id đồ: ${input.id}`)
    const statProp: IProp = {
        name: "Chỉ số", desc: describeStats(input.stats), condition: NONE, stats: input.stats
    }
    const props: IProp[] = [
        statProp,
        ...(input.passives ?? []).map((p) => ({
            ...p, condition: p.condition ?? NONE
        })),
        ...(input.conditionals ?? []),
    ]
    const item: IItem = {
        id: input.id, name: input.name, tier: input.tier, emoji: input.emoji, recipe: input.recipe, lolIds: input.lolIds, props
    }
    items.set(item.id,
        item)
    if (item.tier === "legendary" && item.recipe?.length === 2) {
        const key = pairKey(item.recipe[0],
            item.recipe[1])
        if (combos.has(key)) throw new Error(`Trùng công thức ${key}`)
        combos.set(key,
            item.id)
    }
    if (item.tier === "component") {
    // mỗi mảnh đồ cơ bản cũng là một lá bài trong bộ bài: đánh từ tay để đeo cho 1 tướng mình
        CARDS[componentCardId(item.id)] = {
            kind: "item", id: componentCardId(item.id), name: item.name, mana: 0, itemId: item.id,
            desc: `Đeo cho 1 tướng mình: ${props.map((p) => p.desc).filter(Boolean).join(" · ")}.`,
        }
    }
    if (item.tier === "legendary") {
    // mỗi món huyền thoại là một thẻ bài (nhận được khi ghép 2 thẻ mảnh trong chợ)
        CARDS[legendCardId(item.id)] = {
            kind: "item", id: legendCardId(item.id), name: item.name, mana: LEGEND_EQUIP_MANA, itemId: item.id,
            desc: props.slice(1).map((p) => p.name).join(" · "),
        }
    }
    return item
}

export const legendCardId = (itemId: string) => `leg_${itemId}`
export const componentCardId = (itemId: string) => `cmp_${itemId}`
export const getItem = (id: string) => items.get(id)
export const allItems = () => [...items.values()]
export const itemsOfTier = (tier: Tier) => allItems().filter((i) => i.tier === tier)
/** Ghép 2 mảnh -> id đồ huyền thoại (hoặc undefined) */
export const combine = (a: string, b: string) => combos.get(pairKey(a,
    b))

/** Chỉ số gốc của một món = các prop có stats và điều kiện NONE */
export const baseStats = (item: IItem) => addStats(...item.props.filter((p) => p.stats && p.condition.kind === "none").map((p) => p.stats!))
/** Tỉ lệ chí mạng của mỗi món đồ chí mạng hoàn chỉnh: 3 món = 100% */
export const CRIT_PER_ITEM = 1 / 3
/** Chỉ số của đồ huyền thoại = cộng chỉ số 2 mảnh (món có chí mạng luôn đúng CRIT_PER_ITEM) */
export const recipeStats = (recipe: string[]) => {
    const st = addStats(...recipe.map((id) => (items.get(id) ? baseStats(items.get(id)!) : {
    })))
    return st.crit ? {
        ...st, crit: CRIT_PER_ITEM
    } : st
}
/** Nội tại thường / nội tại điều kiện (bỏ prop chỉ số) để hiển thị */
export const normalProps = (item: IItem) => item.props.slice(1).filter((p) => p.condition.kind === "none")
export const conditionalProps = (item: IItem) => item.props.filter((p) => p.condition.kind !== "none")
