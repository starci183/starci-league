// Đăng ký bài trong bộ bài + buff có hạn, luật xếp bộ bài, mục tiêu hợp lệ của từng lá.
import type {
    CardTarget, DeckKind, PlayCard, Side, TrapCard
} from "../cards"
import {
    CARDS
} from "../registry"
import {
    t
} from "../i18n"
import {
    normalizeProps
} from "../items/registry"
import type {
    IItem
} from "../items/types"
import type {
    StateLike, UnitLike
} from "../types"
import type {
    IBuff, ICardAdapter, ITrapAdapter, PlayCtx, TrapCtx
} from "./types"

const plays = new Map<string, ICardAdapter>()
const traps = new Map<string, ITrapAdapter>()
const buffs = new Map<string, IBuff>()
const buffItems = new Map<string, IItem>()

/** Dòng cường hoá kiểu Yu-Gi-Oh: "Nếu tướng địch đó còn dưới 50% máu: ... thay vào đó".
 *  `who` = cách gọi tướng mà điều kiện xét tới (mục tiêu của phép, hoặc tướng địch dính bẫy). */
const bonusLines = (boosts: { when: { desc: string }; bonus: string }[] | undefined, who: string) =>
    (boosts ?? []).map((b) => `Nếu ${b.when.desc.replace(/^tướng /,
        `${who} `)}: ${b.bonus}`)
const whoOf = (target: string) => (target === "enemy" ? "tướng địch đó" : "tướng mình đó")

export function defineCard(card: ICardAdapter): ICardAdapter {
    if (CARDS[card.id]) throw new Error(`Trùng id thẻ: ${card.id}`)
    const { resolve: _resolve, canTarget: _canTarget, boosts, ...def } = card
    CARDS[card.id] = {
        ...def, bonus: bonusLines(boosts,
            whoOf(card.target))
    } as PlayCard
    plays.set(card.id,
        card)
    return card
}

export function defineTrap(trap: ITrapAdapter): ITrapAdapter {
    if (CARDS[trap.id]) throw new Error(`Trùng id thẻ: ${trap.id}`)
    const { resolve: _resolve, boosts, ...def } = trap
    CARDS[trap.id] = {
        ...def, bonus: bonusLines(boosts,
            "tướng địch đó")
    } as TrapCard
    traps.set(trap.id,
        trap)
    return trap
}

export function defineBuff(buff: IBuff): IBuff {
    buffs.set(buff.id,
        buff)
    // buff chạy như một "món đồ" ẩn: cùng engine với nội tại đồ và nội tại tướng
    buffItems.set(buff.id,
        {
            id: `buff:${buff.id}`, name: buff.name, tier: "component", emoji: "", props: normalizeProps(buff.props)
        })
    return buff
}

export const getPlay = (id: string) => plays.get(id)
/** Điều kiện cường hóa nào của lá đang thỏa (dùng cho server lẫn client xem trước) */
export const playMet = (card: ICardAdapter, ctx: PlayCtx) => (card.boosts ?? []).map((b) => b.when.test(ctx))
export const trapMet = (trap: ITrapAdapter, ctx: TrapCtx) => (trap.boosts ?? []).map((b) => b.when.test(ctx))
export const getTrap = (id: string) => traps.get(id)
export const getBuff = (id: string) => buffs.get(id)
export const allBuffs = () => [...buffs.values()]
/** Buff đang có trên tướng (đọc từ stacks "buff:<id>" = số lượt còn lại) dưới dạng IItem cho engine */
export function buffItemsOf(u: UnitLike): IItem[] {
    const out: IItem[] = []
    buffItems.forEach((it, id) => { if ((u.stacks?.get(`buff:${id}`) ?? 0) > 0) out.push(it) })
    return out
}

// ================= MỤC TIÊU =================

/** Id tướng chọn được làm mục tiêu cho lá `cardId` của phe `side` */
export function cardTargets(state: StateLike, side: Side | string, cardId: string): string[] {
    const card = plays.get(cardId)
    if (!card || card.target === "none") return []
    const ids: string[] = []
    state.units.forEach((u) => {
        const status = (u as UnitLike & { status?: string }).status
        if (!matches(card.target,
            side,
            u,
            status,
            state.turn)) return
        if (card.canTarget && !card.canTarget({
            state, side: side as Side, target: u
        })) return
        ids.push(u.id)
    })
    return ids
}
function matches(t: CardTarget, side: string, u: UnitLike, status: string | undefined, turn: number) {
    if (t === "enemy") return u.owner !== side && u.lane >= 0 && !u.hidden
    if (t === "ally") return u.owner === side && u.lane >= 0
    if (t === "allyRoster") return u.owner === side && u.lane < 0 && status !== "board" && u.readyTurn > turn
    return false
}

// ================= LUẬT BỘ BÀI =================

/** Luật bộ bài người chơi tự xếp (lưu trên Supabase) */
/** Bộ bài đúng 60 lá, mặc định mỗi lá tối đa 3 bản (có lá được nhiều hơn, xem COPY_LIMIT) */
export const DECK_MIN = 60, DECK_MAX = 60, DECK_COPIES = 3
/** Giới hạn số bản riêng: lá tài nguyên (vàng, bình) yếu lẻ nên được mang nhiều */
const COPY_LIMIT: Record<string, number> = {
    tui_vang: 6, binh_mau: 5, binh_nang_luong: 5, pha_le_mana: 4
}
/** Số bản tối đa của một lá trong bộ bài */
export const copyLimit = (id: string) => COPY_LIMIT[id] ?? DECK_COPIES
export const DECK_KINDS: DeckKind[] = ["spell",
    "trap",
    "stat",
    "item"]
/** Giới hạn cứng số lá mỗi loại trong bộ 60 lá: 10 phép · 10 bẫy · 15 cường hoá · 25 trang bị */
export const KIND_LIMIT: Record<DeckKind, number> = {
    spell: 10, trap: 10, stat: 15, item: 25
}
export const DECK_KIND_NAME: Record<DeckKind, string> = {
    spell: "Phép", trap: "Bẫy", stat: "Cường hoá", item: "Trang bị"
}
/** Thẻ mảnh đồ cơ bản (8 món) được xếp vào bộ bài */
const componentCards = () => Object.keys(CARDS).filter((id) => id.startsWith("cmp_"))
const inPool = (id: string) => plays.has(id) || traps.has(id) || (id.startsWith("cmp_") && CARDS[id]?.kind === "item")
/** Lá được xếp vào bộ bài: 5 loại trên (không gồm tướng và thẻ đồ huyền thoại) */
export const deckPool = () => [...plays.keys(),
    ...traps.keys(),
    ...componentCards()].sort((a, b) =>
    DECK_KINDS.indexOf(CARDS[a].kind as DeckKind) - DECK_KINDS.indexOf(CARDS[b].kind as DeckKind) || CARDS[a].name.localeCompare(CARDS[b].name,
        "vi"))
/** Kiểm tra bộ bài: trả về lỗi (tiếng Việt) hoặc null nếu hợp lệ */
export function deckError(cards: unknown): string | null {
    if (!Array.isArray(cards) || cards.some((c) => typeof c !== "string")) return t("err.deck_invalid")
    if (cards.length < DECK_MIN || cards.length > DECK_MAX) return t("err.deck_size",
        {
            min: DECK_MIN, max: DECK_MAX, n: cards.length
        })
    const count = new Map<string, number>()
    for (const id of cards as string[]) {
        if (!inPool(id)) return t("err.card_not_allowed",
            {
                id
            })
        count.set(id,
            (count.get(id) ?? 0) + 1)
        if (count.get(id)! > copyLimit(id)) return t("db.copies_max",
            {
                name: CARDS[id].name, n: copyLimit(id)
            })
    }
    for (const k of DECK_KINDS) {
        const n = (cards as string[]).filter((id) => CARDS[id].kind === k).length
        if (n > KIND_LIMIT[k]) return t("err.kind_max",
            {
                kind: DECK_KIND_NAME[k], n: KIND_LIMIT[k]
            })
    }
    return null
}
