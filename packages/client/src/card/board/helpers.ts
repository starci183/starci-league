// Tiện ích dùng chung cho vùng sân: ngôn ngữ, tên tướng/đồ/trạng thái, đường dẫn ảnh.
import {
    cg, getItem
} from "@starci/shared"

export type Side = cg.Side

export const isEn = (): boolean => {
    try {
        return localStorage.getItem("lang") === "en"
    } catch {
        return false
    }
}

const VI = {
    yourTurn: "LƯỢT CỦA BẠN",
    oppTurn: "Lượt đối thủ",
    sideTurn: "Lượt của",
    react: "Bạn được nối chuỗi",
    waitReact: "Chờ đối thủ nối chuỗi",
    round: "Vòng",
    turn: "Lượt",
    opensRound: "mở vòng",
    lane: "Đường",
    extra: "Triệu hồi phụ",
    emptyExtra: "Trống",
    soakFor: "che chắn cho",
    deck: "Bộ bài",
    hand: "Tay",
    grave: "Mộ",
    prizes: "Lá thưởng",
    lives: "Mạng",
    reserve: "Dự bị",
    respawn: "Hồi sinh vòng",
    you: "Bạn",
    graveTitle: "Nghĩa địa",
    graveEmpty: "Mộ trống",
    close: "Đóng",
    stacks: "Điểm tích",
    next: "Đòn kế tiếp",
    ad: "AD",
    ap: "AP",
    armor: "Giáp",
    mr: "KPhép",
    passive: "Nội tại",
    shield: "Khiên",
    turnsLeft: "còn",
    turnsUnit: "lượt",
    stunned: "Choáng",
    silenced: "Câm lặng",
    targetPick: "Chọn mục tiêu (Esc để hủy)",
    spectator: "Đang xem",
    token: "Vật triệu hồi",
    free: "miễn phí",
}
const EN: typeof VI = {
    yourTurn: "YOUR TURN",
    oppTurn: "Opponent's turn",
    sideTurn: "Turn of",
    react: "You may chain",
    waitReact: "Opponent may chain",
    round: "Round",
    turn: "Turn",
    opensRound: "opens round",
    lane: "Lane",
    extra: "Extra summon",
    emptyExtra: "Empty",
    soakFor: "soaks for",
    deck: "Deck",
    hand: "Hand",
    grave: "Grave",
    prizes: "Prizes",
    lives: "Lives",
    reserve: "Reserve",
    respawn: "Respawn round",
    you: "You",
    graveTitle: "Graveyard",
    graveEmpty: "Graveyard is empty",
    close: "Close",
    stacks: "Stacks",
    next: "Next attack",
    ad: "AD",
    ap: "AP",
    armor: "Armor",
    mr: "MR",
    passive: "Passive",
    shield: "Shield",
    turnsLeft: "left",
    turnsUnit: "turns",
    stunned: "Stunned",
    silenced: "Silenced",
    targetPick: "Pick a target (Esc to cancel)",
    spectator: "Spectating",
    token: "Summon",
    free: "free",
}
export const tr = () => (isEn() ? EN : VI)

const ROLE_VI: Record<cg.Role, string> = {
    fighter: "Đấu sĩ",
    tank: "Đỡ đòn",
    assassin: "Sát thủ",
    marksman: "Xạ thủ",
    mage: "Pháp sư",
    support: "Trợ thủ",
}
export const roleName = (r: cg.Role) => (isEn() ? cg.ROLE_EN[r].name : ROLE_VI[r])

const STATUS_VI: Record<string, { name: string; desc: string }> = {
    stun: {
        name: "Choáng", desc: "Không dùng chiêu, không đánh, không bị lá Đánh thường nhắm tới."
    },
    silence: {
        name: "Câm lặng", desc: "Không tung được chiêu (vẫn đánh thường)."
    },
    chill: {
        name: "Buốt", desc: "Nhận thêm 25% sát thương."
    },
    shred: {
        name: "Rã giáp", desc: "Giáp và kháng phép giảm."
    },
    taunt: {
        name: "Khiêu khích", desc: "Chiêu/đòn đơn mục tiêu của địch phải nhắm tướng này."
    },
    empower: {
        name: "Cường hóa", desc: "Gây thêm 20% sát thương."
    },
    blind: {
        name: "Mù", desc: "Các đòn đánh kế tiếp trượt."
    },
    bleed: {
        name: "Chảy máu", desc: "Mất máu đầu lượt của chủ, mỗi dấu một lần."
    },
    grievous: {
        name: "Vết thương sâu", desc: "Giảm hiệu quả hồi máu và khiên nhận được."
    },
    stealth: {
        name: "Tàng hình", desc: "Không bị địch nhắm tới cho đến khi ra đòn."
    },
}
export const statusInfo = (id: string): { name: string; desc: string } => {
    const t = isEn() ? cg.STATUS_EN[id] ?? STATUS_VI[id] : STATUS_VI[id]
    return t ?? {
        name: id, desc: ""
    }
}
const STATUS_ICON: Record<string, string> = {
    bleed: "wounds",
    blind: "exhaust",
}
export const statusIcon = (id: string) => `/ui/status/${STATUS_ICON[id] ?? id}.png`

export function heroName(id: string): string {
    const h = cg.getHero(id)
    if (isEn()) return cg.HERO_EN[id]?.name ?? h?.name ?? id
    return h?.name ?? id
}
export function unitName(u: cg.Unit): string {
    return u.token ? u.token.name : heroName(u.hero)
}
export function passiveOf(u: cg.Unit, g: cg.Game): { name: string; desc: string } | undefined {
    if (u.token) return undefined
    const h = cg.getHero(u.hero)
    if (!h) return undefined
    const en = isEn() ? cg.HERO_EN[u.hero]?.passive : undefined
    const p = en ?? h.passive
    try {
        return {
            name: p.name, desc: cg.formulaText(p.desc,
                g,
                u)
        }
    } catch {
        return {
            name: p.name, desc: p.desc
        }
    }
}
export const itemName = (id: string) => getItem(id)?.name ?? id
export const itemEmoji = (id: string) => getItem(id)?.emoji ?? "?"
export const itemIcon = (id: string) => `/items/${id}.png`
export const portrait = (u: cg.Unit) => (u.token ? `/card_tokens/${u.token.id}.png` : `/heroes/${u.hero}.jpg`)

/** Số lượt còn lại của một trạng thái (until là turnNo cuối cùng nó còn hiệu lực) */
export const turnsLeft = (until: number, turnNo: number) => Math.max(0,
    until - turnNo)

export type StatusKind = "debuff" | "buff" | "neutral"
const DEBUFFS = new Set(["stun",
    "silence",
    "chill",
    "shred",
    "blind",
    "taunt",
    "bleed",
    "burn",
    "ignite",
    "charm",
    "sunlight",
    "silver",
    "zedmark",
    "exhaust",
    "poison",
    "root",
    "freeze",
    "knockup",
    "reveal"])
const BUFFS = new Set(["empower",
    "shield",
    "stealth",
    "excited",
    "guard",
    "invuln",
    "unstoppable",
    "lifesteal",
    "attack_speed",
    "berserk",
    "bailout"])
export const statusKind = (id: string): StatusKind => (DEBUFFS.has(id) ? "debuff" : BUFFS.has(id) ? "buff" : "neutral")

/** Trường tùy chọn mà engine ghi thêm vào StatusInst: đơn vị gây ra và lá bài gây ra */
export type StatusSrc = cg.StatusInst & { src?: string; card?: string }

/** Biểu tượng của KỸ NĂNG đã gây trạng thái; không có thì trả undefined để dùng biểu tượng trạng thái chung */
export function cardIcon(card: string | undefined): string | undefined {
    if (!card) return undefined
    if (card === "basic") return "/card_support/basic.png"
    if (card.startsWith("spell_")) return `/card_support/${card}.png`
    return `/card_skills/${card}.png`
}

/** Tên dễ đọc của lá bài gây trạng thái */
export function cardLabel(card: string | undefined): string | undefined {
    if (!card) return undefined
    if (card === "basic") return isEn() ? "Basic attack" : "Đánh thường"
    if (card.startsWith("spell_")) return card.slice(6)
    const i = card.lastIndexOf("_")
    const key = card.slice(i + 1).toUpperCase()
    const hero = heroName(card.slice(0,
        i))
    return key === "P" ? `${hero} (${isEn() ? "Passive" : "Nội tại"})` : `${hero} ${key}`
}

/** Trạng thái chung được hiện nhãn chữ cạnh tên (thứ tự ưu tiên) */
export const TAG_STATUSES = ["stun",
    "silence",
    "grievous",
    "chill",
    "blind",
    "taunt",
    "stealth"]
