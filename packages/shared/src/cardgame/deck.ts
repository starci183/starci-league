// Bộ gốc người chơi tự xếp cho chế độ thẻ bài: 80 lá thuộc 4 loại: Đánh thường, Bổ trợ (Rút Bài + phép bổ trợ LMHT, dùng ngay), Vàng, Đồ.
// Khi tạo ván engine thêm 18 lá chiêu (8 Q + 8 E + 2 R) của mỗi tướng trong đội 5 tướng: tổng 170 lá từ đầu trận.
import {
    COMPONENTS, RULES
} from "./types"

/** Phép bổ trợ (summoner spell) dùng làm lá trong bộ */
export const SPELLS = ["heal",
    "flash",
    "ignite",
    "exhaust",
    "barrier",
    "cleanse",
    "smite",
    "teleport"] as const
export type SpellId = (typeof SPELLS)[number]

/** Mã lá trong bộ: Đánh thường, Rút Bài, Vàng, "spell:<phép>" hoặc "item:<mảnh>" (mảnh Đồ chọn đích danh) */
export type DeckCardId = "basic" | "draw" | "gold" | `spell:${SpellId}` | `item:${(typeof COMPONENTS)[number]}`

/** Nhóm hiển thị trong màn xếp bộ */
export type DeckCardGroup = "basic" | "spell" | "gold" | "item"

export interface DeckCardDef {
    id: DeckCardId;
    group: DeckCardGroup;
    /** Số bản tối đa của lá này trong một bộ */
    max: number;
}

/** Kho lá được phép xếp vào bộ */
export const DECK_POOL: DeckCardDef[] = [
    {
        id: "basic", group: "basic", max: 20
    },
    {
        id: "draw", group: "spell", max: 6
    },
    ...SPELLS.map((sp) => ({
        id: `spell:${sp}` as DeckCardId, group: "spell" as const, max: 6
    })),
    {
        id: "gold", group: "gold", max: 16
    },
    ...COMPONENTS.map((c) => ({
        id: `item:${c}` as DeckCardId, group: "item" as const, max: 6
    })),
]

/** Số lá đúng của bộ gốc */
export const DECK_SIZE = RULES.sharedDeckSize

/**
 * Bộ mặc định (khách, máy, mô phỏng), 80 lá: 16 Đánh thường (ít hơn tỉ lệ cũ vì đã được tặng Đánh Thường mỗi lượt),
 * 2 Rút Bài + 16 phép bổ trợ, 16 Vàng, 30 mảnh Đồ (6 mảnh x 4 + 2 mảnh x 3)
 */
export const DEFAULT_DECK: DeckCardId[] = [
    ...Array<DeckCardId>(16).fill("basic"),
    ...Array<DeckCardId>(2).fill("draw"),
    ...(["heal",
        "flash",
        "ignite",
        "barrier"] as const).flatMap((sp) => Array<DeckCardId>(3).fill(`spell:${sp}`)),
    ...(["exhaust",
        "cleanse"] as const).flatMap((sp) => Array<DeckCardId>(2).fill(`spell:${sp}`)),
    ...Array<DeckCardId>(16).fill("gold"),
    ...COMPONENTS.flatMap((c, i) => Array<DeckCardId>(i < 6 ? 4 : 3).fill(`item:${c}`)),
]

const POOL_BY_ID = new Map<string, DeckCardDef>(DECK_POOL.map((d) => [d.id,
    d]))

/** Lá có trong kho không */
export const isDeckCardId = (id: string): id is DeckCardId => POOL_BY_ID.has(id)

/** Kiểm tra một bộ hỗ trợ; trả về lỗi (tiếng Việt) hoặc null nếu hợp lệ */
export function validateDeck(ids: unknown): string | null {
    if (!Array.isArray(ids)) return "Bộ bài không hợp lệ"
    if (ids.length !== DECK_SIZE) return `Bộ bài phải có đúng ${DECK_SIZE} lá (đang có ${ids.length})`
    const count = new Map<string, number>()
    for (const id of ids) {
        if (typeof id !== "string" || !isDeckCardId(id)) return `Lá không có trong kho: ${String(id)}`
        count.set(id,
            (count.get(id) ?? 0) + 1)
    }
    for (const [id,
        n] of count) {
        const max = POOL_BY_ID.get(id)!.max
        if (n > max) return `Tối đa ${max} lá ${id}`
    }
    return null
}

/** Tách mã lá thành loại thẻ + phép/mảnh (để engine tạo Card) */
export function parseDeckCard(id: DeckCardId): { support: "basic" | "draw" | "gold" | "spell" | "item"; spell?: SpellId; item?: string } {
    if (id.startsWith("item:")) return {
        support: "item", item: id.slice(5)
    }
    if (id.startsWith("spell:")) return {
        support: "spell", spell: id.slice(6) as SpellId
    }
    return {
        support: id as "basic" | "draw" | "gold"
    }
}
