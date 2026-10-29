// Văn bản nhật ký / chuỗi cho ChainPanel: eventText tiếng Việt (i18n_en chỉ có tiếng Anh), ngôn ngữ, ảnh lá.
import {
    cg, getItem
} from "@starci/shared"
import type {
    CardView
} from "../store"
import {
    statusNameVi
} from "../board/helpers"

export type Lang = "vi" | "en"
type Side = cg.Side
type Card = cg.Card
type GameEvent = cg.GameEvent

export function getLang(): Lang {
    try {
        return localStorage.getItem("lang") === "en" ? "en" : "vi"
    } catch {
        return "vi"
    }
}

/** Chuỗi giao diện cố định */
export const TXT = {
    vi: {
        round: "Vòng",
        turnOf: "Lượt của",
        you: "Bạn",
        opp: "Đối thủ",
        yourMove: "Đến lượt bạn quyết định",
        oppMove: "Đối thủ đang quyết định",
        resign: "Đầu hàng",
        sure: "Chắc chắn đầu hàng?",
        yes: "Đầu hàng",
        no: "Huỷ",
        chain: "Chuỗi",
        links: "mắt xích",
        resolving: "Đang giải quyết (cuối về đầu)",
        askChain: "Bạn có muốn nối chuỗi?",
        askHint: "Chọn lá Quick để nối, hoặc bỏ qua.",
        pass: "Bỏ qua",
        oppThinking: "Đối thủ đang cân nhắc nối chuỗi…",
        attack: "Đánh thường",
        quick: "QUICK",
        prizeYou: "Lật lá thưởng:",
        prizeOpp: "Đối thủ lật 1 lá thưởng",
        log: "Nhật ký trận",
        detail: "Chi tiết",
        latest: "Mới nhất",
        hiddenCard: "một lá bài úp",
        empty: "Chưa có sự kiện.",
    },
    en: {
        round: "Round",
        turnOf: "Turn:",
        you: "You",
        opp: "Opponent",
        yourMove: "Your decision",
        oppMove: "Opponent is deciding",
        resign: "Resign",
        sure: "Really resign?",
        yes: "Resign",
        no: "Cancel",
        chain: "Chain",
        links: "links",
        resolving: "Resolving (last to first)",
        askChain: "Add to the chain?",
        askHint: "Pick a Quick card to chain, or pass.",
        pass: "Pass",
        oppThinking: "Opponent is considering a chain response…",
        attack: "Basic attack",
        quick: "QUICK",
        prizeYou: "Prize flipped:",
        prizeOpp: "Opponent flips a Prize card",
        log: "Battle log",
        detail: "Details",
        latest: "Latest",
        hiddenCard: "a face-down card",
        empty: "No events yet.",
    },
} as const

export const isHidden = (c: Card | undefined): boolean => !!c && (c as { hidden?: boolean }).hidden === true

/** Tên tiếng Việt của món/mảnh đồ (đồ chế độ thẻ trước, gói đồ cũ sau) */
const itemNameVi = (id: string) => cg.itemText(id,
    "vi")?.name ?? getItem(id)?.name ?? id
const DMG_VI: Record<string, string> = {
    physical: "vật lý", magic: "phép", true: "chuẩn",
}
const WHY_VI: Record<string, string> = {
    lives: "hết mạng", deck: "hết bộ bài",
}

/** Tên tướng / token từ id đơn vị "A:darius" */
export function unitName(v: CardView, id: string | undefined): string {
    if (!id) return "?"
    const u = v.units[id]
    if (u?.token) return u.token.name
    const hero = id.split(":")[1] ?? id
    return cg.getHero(hero)?.name ?? hero
}

export const sideLabel = (v: CardView, s: Side, lang: Lang): string => {
    const t = TXT[lang]
    if (v.you === null) return v.names[s] || s
    return s === v.you ? t.you : t.opp
}

/** Tên lá (lá úp của đối thủ thì ẩn) */
export function cardName(g: cg.Game | null, c: Card, lang: Lang): string {
    if (isHidden(c)) return TXT[lang].hiddenCard
    if (!g) return c.id
    try {
        return (lang === "en" ? cg.cardInfoL(g,
            c) : cg.cardInfo(g,
            c)).name
    } catch {
        return c.id
    }
}

const sideOfUnit = (id?: string): Side | null => id?.startsWith("A:") ? "A" : id?.startsWith("B:") ? "B" : null

/** Bên "sở hữu" sự kiện, để tô màu (null = trung tính) */
export function eventSide(e: GameEvent): Side | null {
    switch (e.t) {
    case "turnStart":
    case "turnEnd":
    case "play":
    case "lives":
    case "draw":
    case "drawAuto":
    case "discard":
    case "burn":
    case "create":
    case "returnToHand":
    case "shuffle":
    case "craft":
    case "chainAdd":
    case "chainResolve":
    case "summonToken":
    case "prize":
    case "pass":
    case "reveal":
    case "cardBurned":
    case "unequip":
    case "freeCard":
    case "tempExpired":
    case "attackCount":
    case "blindLocked":
    case "cardFrozen":
    case "cardThawed":
    case "revealEnd":
    case "chainCancel":
    case "upgrade":
        return e.side
    case "chainWindow": return e.priority
    case "steal": return e.to
    case "end": return e.winner
    case "manaChange": return sideOfUnit(e.unit)
    case "summon":
    case "respawn":
    case "stack":
    case "move":
    case "tokenEnd":
    case "cast":
        return sideOfUnit(e.t === "cast" ? e.unit : "unit" in e ? e.unit : undefined)
    case "attack": return sideOfUnit(e.attacker)
    case "damage":
    case "heal":
    case "shield":
    case "kill":
        return sideOfUnit(e.src ?? e.target)
    case "status":
    case "statusEnd":
        return sideOfUnit(e.target)
    default: return null
    }
}

/** Sự kiện phụ (ẩn khi tắt "Chi tiết") */
const MINOR = new Set<string>(["stack",
    "statusEnd",
    "shuffle",
    "turnEnd",
    "chainWindow",
    "tokenEnd",
    "burn",
    "create",
    "discard",
    "pass",
    "shield",
    "attackCount"])
export const isMinor = (e: GameEvent): boolean => MINOR.has(e.t)

/** Câu tiếng Việt cho một sự kiện */
export function viText(e: GameEvent, v: CardView, g: cg.Game | null): string | undefined {
    const un = (id?: string) => unitName(v,
        id)
    const sd = (s: Side) => sideLabel(v,
        s,
        "vi")
    const cn = (c: Card) => cardName(g,
        c,
        "vi")
    const st = (id: string) => statusNameVi(id)
    const lane = (n: number) => `đường ${n + 1}`
    const pct = `${Math.round((v.rules.fighterCardlessMult ?? .66) * 100)}%`
    switch (e.t) {
    case "roundStart": return `Vòng ${e.round} bắt đầu. Đường mở: ${e.openLanes.map((l) => l + 1).join(", ")}.`
    case "turnStart": return `Lượt của ${sd(e.side)} (vòng ${e.round}).`
    case "turnEnd": return `${sd(e.side)} kết thúc lượt.`
    case "summon": return `${un(e.unit)} ra sân ở ${lane(e.lane)}${e.swapped ? `, đổi chỗ với ${un(e.swapped)}` : ""}.`
    case "respawn": return `${un(e.unit)} hồi sinh ở ${lane(e.lane)}.`
    case "play": return `${sd(e.side)} đánh ${cn(e.card)}${e.reaction ? " (Quick)" : ""}.`
    case "cast": return `${un(e.unit)} tung ${e.skill}${e.target ? ` vào ${un(e.target)}` : ""}.`
    case "attack": return e.cardless
        ? `${un(e.attacker)} đánh không cần lá ${un(e.target)} (${pct})${e.miss ? " nhưng trượt" : e.crit ? ", chí mạng" : ""}.`
        : e.miss
            ? `${un(e.attacker)} đánh ${un(e.target)} nhưng trượt.`
            : `${un(e.attacker)} đánh ${un(e.target)}${e.crit ? " (chí mạng)" : ""}${e.free ? " (miễn phí)" : ""}.`
    case "damage": return `${un(e.target)} nhận ${e.amount} sát thương ${DMG_VI[e.kind] ?? e.kind}${e.src ? ` từ ${un(e.src)}` : ""}${e.absorbed ? ` (khiên đỡ ${e.absorbed})` : ""}${e.crit ? ", chí mạng" : ""}.`
    case "heal": return `${un(e.target)} hồi ${e.amount} máu.`
    case "shield": return `${un(e.target)} có thêm ${e.amount} khiên.`
    case "status": return `${un(e.target)} dính ${st(e.id)} ${e.turns} lượt.`
    case "statusEnd": return `${un(e.target)} hết ${st(e.id)}.`
    case "stack": return `${un(e.unit)}: ${e.key} = ${e.value}.`
    case "move": return `${un(e.unit)} dời từ ${lane(e.from)} sang ${lane(e.to)}${e.with ? `, đổi chỗ với ${un(e.with)}` : ""}.`
    case "kill": return `${un(e.target)} bị hạ gục${e.src ? ` bởi ${un(e.src)}` : ""}.`
    case "lives": return `${sd(e.side)} còn ${e.lives} mạng.`
    case "draw":
        if (e.reason === "support") {
            // Trợ thủ ra sân: lấy Q và E từ bộ lên tay (lá của đối thủ úp nên chỉ biết số lá)
            return isHidden(e.card)
                ? `${sd(e.side)} lấy 1 lá chiêu từ bộ lên tay (Trợ thủ ra sân).`
                : `${e.card.hero ? un(`${e.card.side ?? e.side}:${e.card.hero}`) : sd(e.side)} gọi ra: lấy ${cn(e.card)} lên tay.`
        }
        return isHidden(e.card) ? `${sd(e.side)} rút 1 lá.` : `${sd(e.side)} rút ${cn(e.card)}.`
    case "drawAuto": return `${sd(e.side)} rút ${cn(e.card)}, lá này kích hoạt ngay.`
    case "discard": return e.reason === "manual" ? `${sd(e.side)} bỏ ${cn(e.card)} vào mộ.` : `${sd(e.side)} bỏ ${cn(e.card)}.`
    case "cardBurned": return `${sd(e.side)} tay đầy, đốt ${cn(e.card)}.`
    case "tempExpired": return `${cn(e.card)} (tạm) tan biến.`
    case "manaChange": return `${un(e.unit)} ${e.delta >= 0 ? "+" : "−"}${Math.abs(e.delta)} mana (${e.mana}/${e.max}).`
    case "attackCount": return `${sd(e.side)} đã đánh ${e.used}/${e.limit}.`
    case "chainCancel": return `Mắt xích ${e.n} bị huỷ${e.card ? `: ${cn(e.card)}` : ""}.`
    case "cardFrozen": return `${cn(e.card)} của ${sd(e.side)} bị Hoá Băng, không đánh được.`
    case "cardThawed": return `${cn(e.card)} của ${sd(e.side)} tan băng.`
    case "revealEnd": return `Tay bài của ${sd(e.side)} không còn bị lộ.`
    case "upgrade": return `${un(e.unit)} nâng cấp ${itemNameVi(e.from)} thành ${itemNameVi(e.item)}.`
    case "unequip": return `${un(e.unit)} tháo ${itemNameVi(e.item)} (lá đồ về tay ${sd(e.side)}).`
    case "freeCard": return `${sd(e.side)} được tặng 1 ${e.kind === "basic" ? "lá Đánh Thường" : "mảnh đồ"} (không lấy từ bộ bài).`
    case "transform": return e.on ? `${un(e.unit)} biến hình (${e.id}).` : `${un(e.unit)} hết biến hình${e.reason === "revive" ? " và hồi sinh tại chỗ" : ""}.`
    case "roll": return `${un(e.unit)}: ${e.key} = ${e.value}.`
    case "blindStart": return `Vòng ${e.round}: gọi tướng úp, mỗi bên tối đa ${e.cap} tướng.`
    case "blindLocked": return `${sd(e.side)} đã chốt gọi tướng.`
    case "burn": return `${cn(e.card)} trong bộ của ${sd(e.side)} bị đốt.`
    case "create": return `${cn(e.card)} được thêm vào ${e.zone === "hand" ? "tay" : e.zone === "deck" ? "bộ bài" : "mộ"} của ${sd(e.side)}.`
    case "steal": return `${sd(e.to)} cướp ${cn(e.card)} của ${sd(e.from)}.`
    case "returnToHand": return `${cn(e.card)} về lại tay ${sd(e.side)}.`
    case "shuffle": return e.what === "graveIntoDeck" ? `${sd(e.side)} xáo ${e.count} lá từ mộ vào bộ bài.` : `${sd(e.side)} xáo bộ bài.`
    case "craft": return e.unit ? `${sd(e.side)} ghép ${itemNameVi(e.item)} cho ${un(e.unit)}.` : `${sd(e.side)} ghép ${itemNameVi(e.item)} (lá đồ lên tay).`
    case "chainAdd": return `Mắt xích ${e.n}: ${sd(e.side)} ${e.card ? `kích hoạt ${cn(e.card)}` : `đánh thường bằng ${un(e.actor)}`}${e.targets.length ? ` nhắm ${e.targets.map(un).join(", ")}` : ""}.`
    case "chainWindow": return `${sd(e.priority)} có thể nối chuỗi (${e.length} mắt xích).`
    case "chainResolve": return `Mắt xích ${e.n} giải quyết${e.card ? `: ${cn(e.card)}` : ""}.`
    case "chainEnd": return `Chuỗi ${e.length} mắt xích đã giải quyết xong.`
    case "summonToken": return `${sd(e.side)} triệu hồi ${e.name} vào ô phụ${e.owner ? ` cho ${un(e.owner)}` : ""}.`
    case "tokenEnd": return `${un(e.unit)} rời ô phụ.`
    case "prize": return `${sd(e.side)} lật lá thưởng${isHidden(e.card) ? "" : `: ${cn(e.card)}`} (còn ${e.left}).`
    case "pass": return `${sd(e.side)} bỏ qua.`
    case "reveal": return `${sd(e.side)} lộ tay bài cho ${sd(e.to)} (${e.cards.length} lá).`
    case "log": return e.text
    case "end": return `${sd(e.winner)} thắng (${WHY_VI[e.reason] ?? e.reason}).`
    }
}

/** Câu cho ngôn ngữ hiện tại; lá úp luôn dùng bản của ta, tên người chơi theo bạn/đối thủ */
export function eventLine(e: GameEvent, v: CardView, g: cg.Game | null, lang: Lang): string | undefined {
    if (lang === "vi") return viText(e,
        v,
        g)
    const card = "card" in e ? (e as { card?: Card }).card : undefined
    if (isHidden(card)) {
        if (e.t === "draw") return `${sideLabel(v,
            e.side,
            "en")} draws a card.`
        if (e.t === "create") return `A card is added to ${sideLabel(v,
            e.side,
            "en")}'s ${e.zone}.`
        return viText(e,
            v,
            g)
    }
    try {
        return cg.eventText(e,
            g ?? undefined)?.replace(/Player ([AB])/g,
            (_m, s: Side) => sideLabel(v,
                s,
                "en"))
    } catch {
        return viText(e,
            v,
            g)
    }
}

// ---------------- ảnh lá ----------------
const SUPPORT_ART: Record<string, string> = {
    potion: "cards/binh_mau.jpg", gold: "cards/tui_vang.jpg", draw: "cards/hat_tung.jpg",
}
export function cardArt(c: Card | undefined, actor?: string): string | null {
    if (!c || isHidden(c)) return null
    if (c.kind === "skill") return `card_skills/${c.id}.png`
    if (c.copyOf) return `card_skills/${c.copyOf}.png`
    if (c.kind === "wild") {
        const hero = actor?.split(":")[1]
        return hero ? `card_skills/${hero}_${c.id.slice(-1)}.png` : null
    }
    if (c.kind === "special" && c.id === "mushroom") return "cards/nam_teemo.jpg"
    if (c.kind === "special" && c.id === "velkoz_decay") return "card_skills/velkoz_p.png"
    if (c.kind === "support") return SUPPORT_ART[c.id] ?? null
    return null
}
export const heroArt = (unitId: string | undefined): string | null => {
    const h = unitId?.split(":")[1]
    return h ? `heroes/${h}.jpg` : null
}
