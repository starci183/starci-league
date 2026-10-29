// Dữ liệu hiển thị + lưu trữ cục bộ của bộ gốc chế độ thẻ bài (80 lá: Đánh thường, Rút Bài, phép bổ trợ, Vàng, mảnh Đồ; engine thêm 90 lá chiêu của 5 tướng thành bộ 170 lá).
// Luật nằm ở shared (cardgame/deck.ts); file này chỉ lo tên, mô tả, tranh và bộ của khách (localStorage "cg.deck").
import {
    describeStats, getItem
} from "@starci/shared"
import {
    itemText
} from "@starci/shared/src/cardgame/items"
import {
    DECK_POOL, DECK_SIZE, DEFAULT_DECK, isDeckCardId, validateDeck, type DeckCardGroup, type DeckCardId
} from "@starci/shared/src/cardgame/deck"

export {
    DECK_POOL, DECK_SIZE, DEFAULT_DECK, validateDeck
}
export type {
    DeckCardGroup, DeckCardId
}

/** Tiền tố mã lá khi lưu vào bảng decks (tách khỏi bộ cũ của chế độ đấu tay đôi) */
export const CG_PREFIX = "cg:"

export const isEn = (): boolean => {
    try { return localStorage.getItem("lang") === "en" } catch { return false }
}
const L = (vi: string, en: string) => (isEn() ? en : vi)

export interface CardMeta { id: DeckCardId; name: string; desc: string; art: string; fallback: string; group: DeckCardGroup }

const SUPPORT: Record<string, { vi: [string, string]; en: [string, string]; art: string }> = {
    basic: {
        vi: ["Đánh thường",
            "1 tướng mình đánh thường theo luật vai"],
        en: ["Basic Attack",
            "One of your champions makes a basic attack by role rules"],
        art: "/ui/badge/combat.png"
    },
    draw: {
        vi: ["Rút Bài",
            "Rút 2 lá"],
        en: ["Draw",
            "Draw 2 cards"],
        art: "/cards/bai_moi.jpg"
    },
    gold: {
        vi: ["Vàng",
            "Dùng ghép đồ: 2 mảnh Đồ + 1 Vàng = 1 món"],
        en: ["Gold",
            "Used to craft: 2 Item components + 1 Gold = 1 item"],
        art: "/ui/coin.png"
    },
}

/** Phép bổ trợ: tên, mô tả (đề xuất, engine là nguồn sự thật), tranh cũ làm dự phòng */
const SPELL: Record<string, { vi: [string, string]; en: [string, string]; art: string }> = {
    heal: {
        vi: ["Hồi Máu",
            "1 tướng mình hồi 100 + 10% máu tối đa"],
        en: ["Heal",
            "One of your champions heals 100 + 10% max HP"],
        art: "/cards/hoi_phuc.jpg"
    },
    flash: {
        vi: ["Tốc Biến",
            "Đổi đường 1 tướng mình với 1 tướng mình khác trên sân"],
        en: ["Flash",
            "Swap the lanes of two of your champions on the board"],
        art: "/cards/toc_bien.jpg"
    },
    ignite: {
        vi: ["Thiêu Đốt",
            "1 tướng địch bị Thiêu Đốt 2 lượt: mất máu mỗi lượt, hồi máu giảm một nửa"],
        en: ["Ignite",
            "An enemy champion burns for 2 turns: loses HP each turn and heals half as much"],
        art: "/cards/thieu_dot.jpg"
    },
    exhaust: {
        vi: ["Kiệt Sức",
            "1 tướng địch gây ít hơn 40% sát thương tới hết lượt sau"],
        en: ["Exhaust",
            "An enemy champion deals 40% less damage until the end of its next turn"],
        art: "/cards/kiet_suc.jpg"
    },
    barrier: {
        vi: ["Lá Chắn",
            "1 tướng mình nhận Khiên 80 + 10% máu tối đa"],
        en: ["Barrier",
            "One of your champions gains an 80 + 10% max HP Shield"],
        art: "/cards/la_chan.jpg"
    },
    cleanse: {
        vi: ["Thanh Tẩy",
            "Gỡ mọi hiệu ứng khống chế khỏi 1 tướng mình"],
        en: ["Cleanse",
            "Remove all crowd control from one of your champions"],
        art: "/cards/thanh_tay.jpg"
    },
    smite: {
        vi: ["Trừng Phạt",
            "Gây sát thương chuẩn lớn lên vật triệu hồi ở ô phụ của địch"],
        en: ["Smite",
            "Deal heavy true damage to a token in the enemy extra zone"],
        art: "/cards/trung_phat.jpg"
    },
    teleport: {
        vi: ["Dịch Chuyển",
            "Gọi ngay 1 tướng dự bị ra sân vào một đường trống"],
        en: ["Teleport",
            "Summon one of your reserve champions into an empty lane right away"],
        art: "/cards/dich_chuyen.jpg"
    },
}

export function cardMeta(id: DeckCardId): CardMeta {
    const group = DECK_POOL.find((d) => d.id === id)?.group ?? "basic"
    if (id.startsWith("item:")) {
        const c = id.slice(5)
        const it = getItem(c)
        const tx = itemText(c,
            isEn() ? "en" : "vi")
        const stats = tx?.stats ?? (it?.props[0]?.stats ? describeStats(it.props[0].stats) : "")
        return {
            id, group, name: tx?.name ?? it?.name ?? c, art: `/card_items/${c}.png`, fallback: `/items/${c}.png`,
            desc: [L("Mảnh Đồ",
                "Item component"),
            stats].filter(Boolean).join(": ")
        }
    }
    if (id.startsWith("spell:")) {
        const sp = SPELL[id.slice(6)]
        const [name,
            desc] = isEn() ? sp.en : sp.vi
        return {
            id, group, name, desc, art: `/card_support/spell_${id.slice(6)}.png`, fallback: sp.art
        }
    }
    const s = SUPPORT[id]
    const [name,
        desc] = isEn() ? s.en : s.vi
    return {
        id, group, name, desc, art: `/card_support/${id}.png`, fallback: s.art
    }
}

export const GROUP_NAME: Record<DeckCardGroup, [string, string]> = {
    basic: ["Đánh thường",
        "Basic Attack"], spell: ["Bổ trợ",
        "Spells"], gold: ["Vàng",
        "Gold"], item: ["Đồ",
        "Items"],
}
export const groupName = (g: DeckCardGroup) => GROUP_NAME[g][isEn() ? 1 : 0]

export const maxOf = (id: string): number => DECK_POOL.find((d) => d.id === id)?.max ?? 0
const ORDER = new Map<string, number>(DECK_POOL.map((d, i) => [d.id,
    i]))
/** Xếp lá theo thứ tự trong kho cho dễ nhìn */
export const sortDeck = (ids: DeckCardId[]): DeckCardId[] => [...ids].sort((a, b) => (ORDER.get(a) ?? 0) - (ORDER.get(b) ?? 0))

/** Đếm lá theo nhóm */
export function groupCounts(ids: DeckCardId[]): Record<DeckCardGroup, number> {
    const out: Record<DeckCardGroup, number> = {
        basic: 0, spell: 0, gold: 0, item: 0
    }
    for (const id of ids) out[DECK_POOL.find((d) => d.id === id)?.group ?? "basic"]++
    return out
}

/** Dòng giới thiệu bộ bài (hiện ở màn xếp bộ) */
export const deckInfo = (): string => L("Mỗi tướng thêm 8 Q, 8 E, 2 R vào bộ (tổng 170 lá)",
    "Each champion adds 8 Q, 8 E and 2 R to the deck (170 cards in total)")

/** Lỗi của bộ theo ngôn ngữ đang chọn (null = hợp lệ). Bộ cũ 20 lá báo xếp lại. */
export function deckError(ids: DeckCardId[]): string | null {
    const err = validateDeck(ids)
    if (!err) return null
    if (ids.length !== DECK_SIZE) return isEn() ? `The deck needs ${DECK_SIZE} cards, please rebuild it (has ${ids.length})` : `Bộ bài cần ${DECK_SIZE} lá, hãy xếp lại`
    return isEn() ? "Too many copies of a card" : err
}

/** Mã lưu DB -> mã lá; null nếu không phải bộ thẻ bài hợp lệ về mặt mã */
export function fromDb(cards: string[]): DeckCardId[] | null {
    if (!cards.length || !cards.every((c) => c.startsWith(CG_PREFIX))) return null
    const ids = cards.map((c) => c.slice(CG_PREFIX.length))
    return ids.every(isDeckCardId) ? ids as DeckCardId[] : null
}
export const toDb = (ids: DeckCardId[]): string[] => ids.map((id) => CG_PREFIX + id)

// ---- bộ của khách ----
const LOCAL_KEY = "cg.deck"
export function loadLocalDeck(): DeckCardId[] | null {
    try {
        const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "null") as unknown
        if (Array.isArray(raw) && raw.every((x) => typeof x === "string" && isDeckCardId(x))) return raw as DeckCardId[]
    } catch { /* chế độ riêng tư / dữ liệu hỏng */ }
    return null
}
export function saveLocalDeck(ids: DeckCardId[]): boolean {
    try { localStorage.setItem(LOCAL_KEY,
        JSON.stringify(ids)); return true } catch { return false }
}
