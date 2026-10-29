// Bộ gốc người chơi tự xếp cho chế độ thẻ bài: 20 lá thuộc 4 loại: Đánh thường, Bổ trợ (Rút Bài + phép bổ trợ LMHT, dùng ngay), Vàng, Đồ.
// Mỗi tướng khi ra sân xáo thêm vào bộ 20 lá hỗ trợ của tướng + toàn bộ lá chiêu của tướng (engine lo phần đó).
import {
    COMPONENTS
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
        id: "basic", group: "basic", max: 8
    },
    {
        id: "draw", group: "spell", max: 2
    },
    ...SPELLS.map((sp) => ({
        id: `spell:${sp}` as DeckCardId, group: "spell" as const, max: 2
    })),
    {
        id: "gold", group: "gold", max: 4
    },
    ...COMPONENTS.map((c) => ({
        id: `item:${c}` as DeckCardId, group: "item" as const, max: 2
    })),
]

/** Số lá đúng của bộ gốc */
export const DECK_SIZE = 20

/** Bộ mặc định (khách, máy, mô phỏng): 6 Đánh thường, 1 Rút Bài, 4 phép bổ trợ, 4 Vàng, 5 mảnh Đồ */
export const DEFAULT_DECK: DeckCardId[] = [
    ...Array<DeckCardId>(6).fill("basic"),
    "draw",
    "spell:heal",
    "spell:flash",
    "spell:ignite",
    "spell:barrier",
    ...Array<DeckCardId>(4).fill("gold"),
    ...COMPONENTS.slice(0,
        5).map((c) => `item:${c}` as DeckCardId),
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
