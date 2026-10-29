// Tổng chỉ số đồ trên một tướng = chỉ số mọi prop đang bật + chỉ số cộng dồn vĩnh viễn.
import type {
    StateLike, UnitLike
} from "../types"
import {
    ZERO_STATS, addStats, getItem, normalizeProps
} from "./registry"
import {
    getHero
} from "../registry"
import {
    buffItemsOf
} from "../deck/registry"
import type {
    IItem, IProp, Stats
} from "./types"

/** Nội tại của tướng (IProp) được xem như một "món đồ" ẩn để chạy chung engine */
const heroItems = new Map<string, IItem>()
function heroItem(defId: string): IItem | undefined {
    if (!heroItems.has(defId)) {
        const h = getHero(defId)
        if (!h?.props?.length) return undefined
        heroItems.set(defId,
            {
                id: `hero:${defId}`, name: h.name, tier: "component", emoji: "", props: normalizeProps(h.props)
            })
    }
    return heroItems.get(defId)
}

export function itemsOf(u: UnitLike): IItem[] {
    const out: IItem[] = []
    const hi = heroItem(u.defId)
    if (hi) out.push(hi)
    u.items?.forEach((id) => { const it = getItem(id); if (it) out.push(it) })
    out.push(...buffItemsOf(u)) // buff có hạn từ bài (Thuốc Cuồng Nộ, Kiệt Sức...)
    return out
}

export const onceKey = (item: IItem, p: IProp) => `once:${item.id}:${p.name}`
export const onceUsed = (u: UnitLike, item: IItem, p: IProp) => (u.stacks?.get(onceKey(item,
    p)) ?? 0) > 0

/** Chỉ số % cộng dồn lưu bằng phần trăm nguyên; atk/hp/manaDiscount lưu số thật */
const FLAT = new Set<keyof Stats>(["atk",
    "ap",
    "hp",
    "manaDiscount",
    "manaRegen",
    "armor",
    "mr",
    "lethality",
    "magicPen"])

export function statsOf(u: UnitLike, state?: StateLike): Stats {
    const parts: Partial<Stats>[] = []
    for (const it of itemsOf(u)) {
        for (const p of it.props) {
            if (!p.stats) continue
            if (!p.condition.test({
                self: u, state, preview: true
            })) continue
            if (p.once && onceUsed(u,
                it,
                p)) continue
            parts.push(p.stats)
        }
    }
    const bonus: Partial<Stats> = {
    }
    for (const k of Object.keys(ZERO_STATS) as (keyof Stats)[]) {
        const v = u.stacks?.get(`bonus:${k}`)
        if (v) bonus[k] = FLAT.has(k) ? v : v / 100
    }
    return addStats(...parts,
        bonus)
}
