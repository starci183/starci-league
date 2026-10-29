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
    cardlessTip: "Đánh không cần lá (Quick, 66% sát thương, tính vào 3 đòn/lượt)",
    cardlessUsed: "Đã đánh không cần lá trong lượt này",
    fighterLine: "Đấu sĩ: mỗi lượt đánh không cần lá 1 lần (66% sát thương).",
    mageLine: "Pháp sư: mỗi chiêu tốn mana (+10 mỗi lượt).",
    mana: "Mana",
    deadLabel: "Đã chết",
    respawnIn: "Hồi sinh sau",
    roundUnit: "vòng",
    hiddenSummon: "Tướng úp",
    blindWait: "Đang chờ đối thủ chọn tướng triệu hồi",
    blindPicked: "Đã chốt",
    blindDraft: "Chưa chốt",
    foeLocked: "Đối thủ đã chốt",
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
    cardlessTip: "Cardless attack (Quick, 66% damage, counts toward 3 attacks/turn)",
    cardlessUsed: "Already used the cardless attack this turn",
    fighterLine: "Fighter: one cardless attack per turn (66% damage).",
    mageLine: "Mage: every skill costs mana (+10 per turn).",
    mana: "Mana",
    deadLabel: "Dead",
    respawnIn: "Respawns in",
    roundUnit: "rounds",
    hiddenSummon: "Face-down hero",
    blindWait: "Waiting for the opponent to choose a summon",
    blindPicked: "Locked in",
    blindDraft: "Not locked",
    foeLocked: "Opponent locked in",
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

/** Trạng thái chung của engine (tiếng Việt). Trạng thái riêng của tướng V2 lấy từ cg.STATUS_V2 (ghi đè cùng id). */
const STATUS_VI_BASE: Record<string, { name: string; desc: string }> = {
    stun: {
        name: "Choáng", desc: "Không dùng chiêu, không đánh, không bị lá Đánh thường nhắm tới."
    },
    silence: {
        name: "Câm lặng", desc: "Không tung được chiêu (vẫn đánh thường)."
    },
    chill: {
        name: "Giá Lạnh", desc: "Nhận thêm 25% sát thương."
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
    grievous: {
        name: "Vết thương sâu", desc: "Giảm hiệu quả hồi máu và khiên nhận được."
    },
    stealth: {
        name: "Tàng hình", desc: "Không bị địch nhắm tới cho đến khi ra đòn."
    },
    ignite: {
        name: "Thiêu Đốt", desc: "Mất máu (sát thương chuẩn) đầu lượt của chủ."
    },
    exhaust: {
        name: "Kiệt sức", desc: "Gây ít hơn 40% sát thương."
    },
    noheal: {
        name: "Không Hồi Phục", desc: "Không được hồi máu hay nhận Khiên (Lời Nhắc Tử Vong)."
    },
    berserk: {
        name: "Nổi Điên", desc: "Bị Renata R buộc đánh đồng đội của chính nó."
    },
    see_hand: {
        name: "Thấy Bài", desc: "Đang xem tay bài đối thủ."
    },
}
const STATUS_VI: Record<string, { name: string; desc: string }> = {
    ...STATUS_VI_BASE,
    ...Object.fromEntries(Object.entries(cg.STATUS_V2).map(([k,
        v]) => [k,
        v.vi])),
}
export const statusInfo = (id: string): { name: string; desc: string } => {
    const t = isEn() ? cg.STATUS_EN[id] ?? STATUS_VI[id] : STATUS_VI[id]
    return t ?? {
        name: id, desc: ""
    }
}
/** Tên tiếng Việt của trạng thái (nhật ký tiếng Việt) */
export const statusNameVi = (id: string): string => STATUS_VI[id]?.name ?? id
/** Bộ đếm V2 hiện trên tướng (tên + mô tả theo ngôn ngữ đang chọn); undefined nếu không phải bộ đếm V2 */
export const stackInfoV2 = (key: string): { name: string; desc: string } | undefined => {
    const t = cg.STACK_V2[key]
    return t ? (isEn() ? t.en : t.vi) : undefined
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
export const itemName = (id: string) => cg.itemText(id,
    isEn() ? "en" : "vi")?.name ?? getItem(id)?.name ?? id
export const itemEmoji = (id: string) => getItem(id)?.emoji ?? itemName(id).slice(0,
    1)
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
    "ignite",
    "exhaust",
    "grievous",
    "noheal",
    "berserk",
    "bleed",
    "guilt",
    "sun",
    "zed_stack",
    "isolated",
    "burn",
    "disarm",
    "frost",
    "poison",
    "root",
    "freeze",
    "knockup",
    "reveal"])
const BUFFS = new Set(["empower",
    "shield",
    "stealth",
    "guard",
    "invuln",
    "unstoppable",
    "lifesteal",
    "attack_speed",
    "aatrox_e",
    "yorick_r",
    "gp_e",
    "forge_e",
    "leona_e",
    "braum_dbl",
    "braum_wall",
    "frenzy",
    "renata_ward",
    "janna_ward",
    "janna_gale",
    "alwaysCrit",
    "ashe_e",
    "jinx_trap",
    "kog_e",
    "vayne_e",
    "vayne_r"])
export const statusKind = (id: string): StatusKind => (DEBUFFS.has(id) ? "debuff" : BUFFS.has(id) ? "buff" : "neutral")

/** Trường tùy chọn mà engine ghi thêm vào StatusInst: đơn vị gây ra và lá bài gây ra */
export type StatusSrc = cg.StatusInst & { src?: string; card?: string }

/** Các trạng thái do cùng một nguồn gây ra (vd Thiêu Đốt = đốt + vết thương sâu): hiện thành 1 icon */
export interface SourceGroup { key: string; card?: string; src?: string; ids: string[]; until: number; at?: number; v: number }

/** Phần thời gian đã trôi (0..100) để vẽ lớp tối quét tròn; không biết mốc bắt đầu thì 0 */
export function elapsedPct(until: number, at: number | undefined, turnNo: number): number {
    if (at === undefined || until <= at) return 0
    return Math.round(Math.min(1,
        Math.max(0,
            (turnNo - at) / (until - at))) * 100)
}

export function groupBySource(statuses: Record<string, StatusSrc>): SourceGroup[] {
    const out = new Map<string, SourceGroup>()
    for (const [id,
        s] of Object.entries(statuses)) {
        const key = s.card ? `${s.card}@${s.src ?? ""}` : `p@${s.src ?? ""}`
        const g = out.get(key)
        if (g) {
            g.ids.push(id)
            if (s.until > g.until) {
                g.until = s.until
                g.at = s.at
            }
            g.v = Math.max(g.v,
                s.v)
        } else {
            out.set(key,
                {
                    key, card: s.card, src: s.src, ids: [id], until: s.until, at: s.at, v: s.v
                })
        }
    }
    return [...out.values()]
}

/** Biểu tượng của KỸ NĂNG đã gây trạng thái; không có thì trả undefined để dùng biểu tượng trạng thái chung */
export function cardIcon(card: string | undefined): string | undefined {
    if (!card) return undefined
    if (card === "basic") return "/card_support/basic.png"
    if (card.startsWith("spell_")) return `/card_support/${card}.png`
    if (card.startsWith("item:")) return itemIcon(card.slice(5))
    return `/card_skills/${card}.png`
}

/** Tên dễ đọc của lá bài gây trạng thái */
export function cardLabel(card: string | undefined): string | undefined {
    if (!card) return undefined
    if (card === "basic") return isEn() ? "Basic attack" : "Đánh thường"
    if (card.startsWith("spell_")) return card.slice(6)
    if (card.startsWith("item:")) return itemName(card.slice(5))
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
