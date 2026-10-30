// Tiếng Anh cho chế độ thẻ bài thuần. Tách riêng khỏi i18n của game cũ (không đụng ../i18n).
// Cách dùng (client, một lần trước khi vẽ):  cg.applyCardLocale("en")  — đổi tên/mô tả tại chỗ trên tướng đã đăng ký
// (giống applyLocale của game cũ), "vi" thì khôi phục bản gốc. Chữ không nằm trong HeroDef (thẻ hỗ trợ, thẻ chiêu chung,
// lá đặc biệt, vai, trạng thái, nhật ký) tra qua các bảng *_EN bên dưới hoặc hàm cardInfoL / eventText.
// Công thức {…} giữ nguyên ý nghĩa; chỉ đổi tên chỉ số sang token tiếng Anh mà formula.ts đọc được
// (max HP, bonus HP, Armor, MR) — hàm checkTranslations() kiểm tra EN và VI có cùng công thức.
import {
    formulaText
} from "./formula"
import type {
    Game
} from "./game"
import {
    itemText
} from "./items"
import {
    allHeroes, getHero, getSpecialCard
} from "./registry"
import type {
    Card, GameEvent, Role, SupportId, Unit
} from "./types"
import {
    getItem
} from "../items"
import {
    LOL_EN
} from "../i18n/lol_en"
import {
    cardInfo, itemStatText
} from "./engine"
import {
    HERO_EN_V2_G1, SPECIAL_V2_G1, STACK_V2_G1, STATUS_V2_G1
} from "./i18n/v2_g1"
import {
    HERO_EN_V2_G2V, STACK_V2_G2V, STATUS_V2_G2V
} from "./i18n/v2_g2v"
import {
    HERO_EN_V2_G3V, STACK_V2_G3V, STATUS_V2_G3V
} from "./i18n/v2_g3v"
import {
    HERO_EN_V2_G4V, STACK_V2_G4V, STATUS_V2_G4V
} from "./i18n/v2_g4v"
import {
    HERO_EN_V2_G5V, SPECIAL_V2_G5V, STACK_V2_G5V, STATUS_V2_G5V
} from "./i18n/v2_g5v"
import {
    HERO_EN_V3_NEW, SPECIAL_V3_NEW, STACK_V3_NEW, STATUS_V3_NEW
} from "./i18n/v3_new"

export type CardLang = "vi" | "en";
let current: CardLang = "vi"
export const getCardLang = () => current

// ======================================================================
// Bảng V2 hai thứ tiếng (trạng thái / stack / lá đặc biệt) — client đọc .vi, bảng *_EN bên dưới đọc .en
// ======================================================================
/** Tên + mô tả theo 2 ngôn ngữ */
export type BiText = { vi: { name: string; desc: string }; en: { name: string; desc: string } };
/** Trạng thái V2 (khoá = id status) */
export const STATUS_V2: Record<string, BiText> = {
    ...STATUS_V2_G1,
    ...STATUS_V2_G2V,
    ...STATUS_V2_G3V,
    ...STATUS_V2_G4V,
    ...STATUS_V2_G5V,
    ...STATUS_V3_NEW,
}
/** Bộ đếm V2 hiện trên tướng (khoá = stack key) */
export const STACK_V2: Record<string, BiText> = {
    ...STACK_V2_G1,
    ...STACK_V2_G2V,
    ...STACK_V2_G3V,
    ...STACK_V2_G4V,
    ...STACK_V2_G5V,
    ...STACK_V3_NEW,
}
/** Lá đặc biệt V2 do chiêu/nội tại tạo ra (khoá = id lá) */
export const SPECIAL_V2: Record<string, BiText> = {
    ...SPECIAL_V2_G1,
    ...SPECIAL_V2_G5V,
}
const enOf = (m: Record<string, BiText>) => Object.fromEntries(Object.entries(m).map(([k,
    v]) => [k,
    v.en]))

// ======================================================================
// Bảng chữ chung
// ======================================================================
export const SUPPORT_EN: Record<SupportId, { name: string; desc: string }> = {
    mana: {
        name: "Mana Potion", desc: "1 allied mage restores {30} mana."
    },
    basic: {
        name: "Strike", desc: "1 allied champion makes a basic attack, following its role's rules."
    },
    gold: {
        name: "Gold", desc: "1 gold: 2 Components + 1 Gold combine into 1 item; or 1 Component + 1 Gold upgrades the component a champion already carries."
    },
    item: {
        name: "Component", desc: "Item component: play it on 1 of your champions to equip it alone (takes 1 slot); 2 Components + 1 Gold combine into 1 item (max 3 items per champion)."
    },
    potion: {
        name: "Health Potion", desc: "1 allied champion heals {100 + 10% max HP}."
    },
    draw: {
        name: "Draw", desc: "Draw 2 cards."
    },
    buff: {
        name: "Boost", desc: "1 allied champion deals +20% damage and gains a 70 Shield until the end of the opponent's turn."
    },
    legend: {
        name: "Legendary Item", desc: "Crafted item: play it on 1 of your champions with a free item slot to equip it."
    },
    spell_heal: {
        name: "Heal", desc: "1 allied champion heals {100} + 10% of its max HP."
    },
    spell_flash: {
        name: "Flash", desc: "1 allied champion swaps lanes with another allied champion on the board (it cannot move into an empty or unopened lane)."
    },
    spell_ignite: {
        name: "Ignite", desc: "1 enemy champion is Ignited for 2 turns: at the start of each of its turns it loses 40 HP (true damage), plus Grievous Wounds (healing and Shields received -50%) for the same duration."
    },
    spell_exhaust: {
        name: "Exhaust", desc: "1 enemy champion deals 40% less damage until the end of its next turn."
    },
    spell_barrier: {
        name: "Barrier", desc: "1 allied champion gains a Shield of {80} + 10% of its max HP."
    },
    spell_cleanse: {
        name: "Cleanse", desc: "Remove every crowd control and harmful effect (Stun, Silence, Chill, Armor Shred, Blind, Ignite, Grievous Wounds, Exhaust, Bleed, Burn...) from 1 allied champion."
    },
    spell_smite: {
        name: "Smite", desc: "Deal 150 true damage to the summoned unit in the opponent's extra zone (how non-marksmen answer tokens)."
    },
    spell_teleport: {
        name: "Teleport", desc: "1 allied champion waiting to respawn returns right now to an open, empty lane with 50% HP."
    },
}

/** @deprecated Thẻ chiêu chung đã bỏ khỏi chế độ thẻ bài (giữ bảng để client cũ không vỡ) */
export const WILD_EN: Record<"Q" | "E" | "R", { name: string; desc: string }> = {
    Q: {
        name: "Wild Skill Q", desc: "Choose 1 of your champions on the board and cast its Q."
    },
    E: {
        name: "Wild Skill E", desc: "Choose 1 of your champions on the board and cast its E."
    },
    R: {
        name: "Wild Skill R", desc: "Choose 1 of your champions on the board and cast its R."
    },
}

/** Lá đặc biệt do chiêu tạo ra (khóa theo id lá). Mô tả dùng cho lá đã đăng ký bằng defineSpecialCard. */
export const SPECIAL_EN: Record<string, { name: string; desc: string }> = {
    ...enOf(SPECIAL_V2),
    ...SPECIAL_V3_NEW,
    pick_card: {
        name: "Pick a card", desc: "Take this card from the graveyard to your hand; the other pick cards vanish. Temporary: disappears at the end of the turn if unused."
    },
}

export const ROLE_EN: Record<Role, { name: string; rule: string }> = {
    fighter: {
        name: "Fighter", rule: "Strike card hits the opposing champion (or anything in the extra zone) for 100% AD. Once per turn, a Quick cardless attack for 66%. Sustain plus damage."
    },
    tank: {
        name: "Tank", rule: "Strike card hits the opposing champion for 100% AD. Taunt: enemy marksmen's Strike cards must target a tank. Crowd control plus damage reduction or Shields."
    },
    assassin: {
        name: "Assassin", rule: "Strike card hits the champion in the same lane for 125% AD. Burst plus an escape (Stealth) or a reset."
    },
    marksman: {
        name: "Marksman", rule: "Strike card hits any enemy champion or extra-zone token for 100% AD (but must hit a tank if the enemy has one on the board)."
    },
    mage: {
        name: "Mage", rule: "Strike card hits the opposing champion for 100% AD as magic damage."
    },
    support: {
        name: "Support", rule: "Strike card hits the opposing champion for 100% AD. When first summoned, its owner takes its Q and E from the deck to hand (respawning does not count)."
    },
}

export const STATUS_EN: Record<string, { name: string; desc: string }> = {
    ignite: {
        name: "Ignite", desc: "Loses HP (true damage) at the start of its owner's turn."
    },
    grievous: {
        name: "Grievous Wounds", desc: "Healing and Shields received are reduced by 50%."
    },
    exhaust: {
        name: "Exhaust", desc: "Deals 40% less damage."
    },
    stun: {
        name: "Stun", desc: "Can't play skill cards, attack or be struck with Strike cards."
    },
    silence: {
        name: "Silence", desc: "Can't cast skill cards (can still attack)."
    },
    chill: {
        name: "Chill", desc: "Takes 25% more damage."
    },
    shred: {
        name: "Armor Shred", desc: "Armor and MR -40%."
    },
    taunt: {
        name: "Taunt", desc: "Enemy single-target skills and attacks must target this champion."
    },
    empower: {
        name: "Empowered", desc: "Deals 20% more damage."
    },
    blind: {
        name: "Blind", desc: "Its next attacks miss."
    },
    stealth: {
        name: "Stealth", desc: "Can't be chosen by single-target or up-to-N skills, nor by attacks (skills that hit every enemy, explosions and damage over time still hit it)."
    },
    stasis: {
        name: "Stasis", desc: "Takes no damage, can't be targeted and can't act until the end of the turn."
    },
    guard: {
        name: "Guard", desc: "Takes all damage enemies would deal to its allies; the damage taken is stored."
    },
    dmgCut: {
        name: "Damage Reduction", desc: "Takes reduced damage."
    },
    attackCut: {
        name: "Attack Reduction", desc: "Takes reduced damage from attacks."
    },
    berserk: {
        name: "Berserk", desc: "Turned against its own team by Hostile Takeover."
    },
    armor_up: {
        name: "Armor Up", desc: "Temporary bonus Armor (the number on the icon) until the end of the enemy's next turn."
    },
    ...enOf(STATUS_V2),
}

/** Tên chỉ số đồ (lá đồ huyền thoại) */
export const STAT_EN: Record<string, string> = {
    atk: "AD", ap: "AP", hp: "HP", armor: "Armor", mr: "MR", crit: "Crit chance", critDmg: "Crit damage", atkMult: "% AD",
    lethality: "Lethality", magicPen: "Magic pen", spellAmp: "% skill damage", dmgAmp: "% damage", lifesteal: "Life steal", omnivamp: "Omnivamp", extraAtk: "% attack damage",
}

/** Từ khoá bài dùng chung */
export const KEYWORDS_EN: Record<string, string> = {
    "Draw N": "Take the top N cards of your deck into your hand.",
    "Search (card X)": "Look through your deck, take 1 card X into your hand, then shuffle the deck.",
    "Peek N": "Look at the top N cards of your deck, reorder them, and optionally put some on the bottom.",
    "Discard N": "Put N cards from your hand into the graveyard.",
    "Recover": "Take 1 card from the graveyard back to your hand.",
    "Shuffle X into the enemy deck": "Shuffle card X into the opponent's deck.",
    "Steal": "Take 1 card from the opponent's hand.",
    "Reaction": "A card that can be played during the opponent's turn when its condition is met.",
    "Auto-trigger": "A card that activates the moment it is drawn, without costing a turn.",
    "Burn N": "Put the top N cards of a deck into the graveyard.",
    "Dead card": "A skill card of a champion not on the board: it can't be played, but still takes space in hand and deck.",
}

export const RULES_EN: string[] = [
    "Deck: 170 cards from the start: your 80 shared cards plus, for each of your 5 champions, 8 Q + 8 E + 2 R skill cards. Nothing is shuffled in when you summon. Opening hand: 5 cards, drawn before the first summon, so your hand decides who to summon.",
    "Summon phase (start of every round): both players pick their summons face-down at the same time, then they are revealed together. One new lane opens each round (lane 3, then 2, 4, 1, 5); each side summons at most 1 champion per phase.",
    "Each turn you draw 1 card (your first turn draws none); every turn you also get a free Basic Attack card and every 3rd turn a free item component. Hand limit is 10: extra cards are burned into the graveyard. If you must draw and your deck is empty, you lose immediately.",
    "Two ways to win: take down 7 enemy champions (each side has 7 lives), or make the opponent run out of cards.",
    "Attack limit: at most 3 attacks per player per turn, counting Strike cards, Fighter cardless attacks and free attacks. Attacks made inside skills do not count.",
    "Fighters may attack without a card once per turn (a Quick action, usable in the opponent's turn to respond to a chain) for 66% damage.",
    "Support champions fetch their Q and E from the deck into your hand when first summoned. Mages pay mana (x10 scale, +10 per turn) to play skill cards.",
    "Skill cards go to the graveyard after use. Support cards are gone after use.",
    "A fallen champion stays in its lane (reserved) and respawns there after 3 rounds, with its items. Its cards are dead cards in the meantime.",
    "2 Components + 1 Gold craft 1 item and equip it on a champion (max 3 items). There are 8 components and 36 recipes.",
]

export const WIN_REASON_EN: Record<"lives" | "deck", string> = {
    lives: "all 7 lives taken", deck: "out of cards"
}

// ======================================================================
// Tướng: tên chiêu / mô tả / nội tại (giữ nguyên {công thức})
// ======================================================================
export interface HeroTextEn {
  name?: string;
  desc?: string;
  passive: { name: string; desc: string };
  skills: Record<"Q" | "E" | "R", { name: string; desc: string }>;
}
/** Bản dịch mọi tướng V2 (i18n/v2_*.ts, 5 nhóm × 6 tướng) */
export const HERO_EN: Record<string, HeroTextEn> = {
    ...HERO_EN_V2_G1,
    ...HERO_EN_V2_G2V,
    ...HERO_EN_V2_G3V,
    ...HERO_EN_V2_G4V,
    ...HERO_EN_V2_G5V,
    ...HERO_EN_V3_NEW,
}
/** Tên các stack hiện trên tướng (UI) */
export const STACK_EN: Record<string, string> = Object.fromEntries(Object.entries(STACK_V2).map(([k,
    v]) => [k,
    v.en.name]))

// ======================================================================
// Áp dụng ngôn ngữ (theo kiểu applyLocale của game cũ)
// ======================================================================
type Snap = { name: string; desc?: string; passive?: { name: string; desc: string }; skills: Record<string, { name: string; desc: string }> };
const original = new Map<string, Snap>()
const originalSpecial = new Map<string, { name: string; desc: string }>()

/** Đổi ngôn ngữ chế độ thẻ bài. Tướng chưa có bản dịch trong HERO_EN giữ nguyên tiếng Việt (xem missingTranslations). */
export function applyCardLocale(lang: CardLang) {
    // lưu bản gốc lần đầu
    for (const h of allHeroes()) {
        if (original.has(h.id)) continue
        original.set(h.id,
            {
                name: h.name, desc: h.desc, passive: {
                    ...h.passive
                },
                skills: {
                    Q: {
                        name: h.skills.Q.name, desc: h.skills.Q.desc
                    }, E: {
                        name: h.skills.E.name, desc: h.skills.E.desc
                    }, R: {
                        name: h.skills.R.name, desc: h.skills.R.desc
                    }
                },
            })
    }
    for (const h of allHeroes()) {
        const src = lang === "en" ? HERO_EN[h.id] : original.get(h.id)
        const orig = original.get(h.id)!
        if (!src || (lang === "en" && h.todo)) { restoreHero(h.id); continue }
        if (lang === "en") {
            const en = src as HeroTextEn
            h.name = en.name ?? orig.name
            if (en.desc) h.desc = en.desc
            h.passive.name = en.passive.name; h.passive.desc = en.passive.desc
            for (const k of ["Q",
                "E",
                "R"] as const) { h.skills[k].name = en.skills[k].name; h.skills[k].desc = en.skills[k].desc }
        } else restoreHero(h.id)
    }
    for (const id of Object.keys(SPECIAL_EN)) {
        const sp = getSpecialCard(id)
        if (!sp) continue
        if (!originalSpecial.has(id)) originalSpecial.set(id,
            {
                name: sp.name, desc: sp.desc
            })
        const o = originalSpecial.get(id)!
        sp.name = lang === "en" ? SPECIAL_EN[id].name : o.name
        sp.desc = lang === "en" ? SPECIAL_EN[id].desc : o.desc
    }
    current = lang
}
function restoreHero(id: string) {
    const h = getHero(id), o = original.get(id)
    if (!h || !o) return
    h.name = o.name; h.desc = o.desc
    h.passive.name = o.passive!.name; h.passive.desc = o.passive!.desc
    for (const k of ["Q",
        "E",
        "R"] as const) { h.skills[k].name = o.skills[k].name; h.skills[k].desc = o.skills[k].desc }
}

/** Tướng đã viết xong (không còn todo) mà chưa có bản dịch EN */
export const missingTranslations = () => allHeroes().filter((h) => !h.todo && !HERO_EN[h.id]).map((h) => h.id)

// ======================================================================
// Kiểm tra bản dịch: công thức {…} của EN và VI phải giống nhau
// ======================================================================
const TOKEN_EN_TO_VI: [RegExp, string][] = [[/target max HP/gi,
    "máu tối đa mục tiêu"],
[/target missing HP/gi,
    "máu đã mất mục tiêu"],
[/max HP/gi,
    "máu tối đa"],
[/\bper point of\b/g,
    "mỗi điểm"],
[/\bper\b/g,
    "mỗi"],
[/bonus HP/gi,
    "máu cộng thêm"],
[/\bArmor\b/g,
    "Giáp"],
[/\bMR\b/g,
    "Kháng phép"]]
const normFormula = (f: string) => TOKEN_EN_TO_VI.reduce((s, [re,
    to]) => s.replace(re,
    to),
f).replace(/\s+/g,
    " ").trim().toLowerCase()
const formulasOf = (text: string) => [...text.matchAll(/\{([^{}]+)\}/g)].map((m) => normFormula(m[1]))

/** So sánh công thức giữa bản gốc tiếng Việt và bản dịch EN. Trả về danh sách lỗi (rỗng = ổn). Cần gọi khi chưa applyCardLocale("en"), hoặc sau đó vì dùng bản lưu. */
export function checkTranslations(): string[] {
    const errs: string[] = []
    const same = (where: string, vi: string, en: string) => {
        const a = formulasOf(vi), b = formulasOf(en)
        if (a.join("|") !== b.join("|")) errs.push(`${where}: công thức khác (VI ${a.join(" ; ")} / EN ${b.join(" ; ")})`)
    }
    for (const [id,
        en] of Object.entries(HERO_EN)) {
        const o = original.get(id) ?? (() => { const h = getHero(id); return h ? {
            passive: h.passive, skills: h.skills
        } : undefined })()
        if (!o) { errs.push(`HERO_EN có tướng không tồn tại: ${id}`); continue }
        same(`${id}.passive`,
o.passive!.desc,
en.passive.desc)
        for (const k of ["Q",
            "E",
            "R"] as const) {
            same(`${id}.${k}`,
                o.skills[k].desc,
                en.skills[k].desc)
            if (!en.skills[k].name) errs.push(`${id}.${k}: thiếu tên`)
        }
    }
    return errs
}

// ======================================================================
// Thông tin lá theo ngôn ngữ hiện tại (cardInfo của engine ghi cứng tiếng Việt cho thẻ hỗ trợ / chiêu chung)
// ======================================================================
const keyOf = (c: Card) => c.id.slice(-1).toUpperCase() as "Q" | "E" | "R"
export function cardInfoL(g: Game, card: Card, unit?: Unit): { name: string; desc: string; type: string } {
    if (current !== "en") return cardInfo(g,
        card,
        unit)
    if (card.kind === "support" && card.id === "legend") {
        const it = getItem(card.item ?? ""), tx = itemText(card.item ?? "",
            "en")
        const items = LOL_EN.items as Record<string, string>
        return {
            name: tx?.name ?? items[card.item ?? ""] ?? it?.name ?? "Legendary Item", desc: `Legendary item: play it on 1 of your champions with a free item slot to equip it.${tx ? ` ${tx.stats}. ${tx.passive}: ${tx.desc}` : it ? ` ${itemStatText(it,
                STAT_EN)}` : ""}`, type: "support"
        }
    }
    if (card.kind === "support" && card.id === "item" && card.item) {
        const tx = itemText(card.item,
            "en")
        if (tx) return {
            name: `${SUPPORT_EN.item.name}: ${tx.name}`, desc: `${SUPPORT_EN.item.desc} ${tx.stats}.`, type: "support"
        }
    }
    if (card.kind === "support") { const t = SUPPORT_EN[card.id as SupportId]; return {
        name: t?.name ?? card.id, desc: t ? formulaText(t.desc,
            g,
            unit) : "", type: "support"
    } }
    if (card.kind === "special" && !card.copyOf) { const t = SPECIAL_EN[card.id]; const sp = getSpecialCard(card.id); return {
        name: t?.name ?? sp?.name ?? card.id, desc: formulaText(t?.desc ?? sp?.desc ?? "",
            g,
            unit), type: "special"
    } }
    if (card.kind === "wild") {
        const t = WILD_EN[keyOf(card)]
        const def = unit ? getHero(unit.hero)?.skills[keyOf(card)] : undefined
        return {
            name: t.name, desc: def ? formulaText(def.desc,
                g,
                unit) : t.desc, type: "wild"
        }
    }
    const base = cardInfo(g,
        card,
        unit) // tên tướng/chiêu và mô tả đã được applyCardLocale đổi sang EN
    if (card.copyOf) return {
        ...base, name: `${SPECIAL_EN[card.id]?.name ?? "Shadow"}: ${base.name}`, type: "special"
    }
    return base
}

// ======================================================================
// Nhật ký / sự kiện sang tiếng Anh
// ======================================================================
/** Câu tiếng Anh cho một sự kiện (undefined = sự kiện chỉ để vẽ hiệu ứng, không ghi nhật ký). */
export function eventText(e: GameEvent, g?: Game): string | undefined {
    const uname = (id?: string) => {
        if (!id) return "?"
        const hero = id.split(":")[1] ?? id
        return `${id.startsWith("A:") ? "A" : id.startsWith("B:") ? "B" : ""} ${getHero(hero)?.name ?? hero}`.trim()
    }
    const cname = (c: Card) => (g ? cardInfoL(g,
        c).name : c.id)
    const side = (s: string) => `Player ${s}`
    switch (e.t) {
    case "roundStart": return `Round ${e.round} begins. Open lanes: ${e.openLanes.map((l) => l + 1).join(", ")}.`
    case "turnStart": return `${side(e.side)}'s turn (round ${e.round}).`
    case "turnEnd": return `${side(e.side)} ends the turn.`
    case "summon": return `${uname(e.unit)} enters lane ${e.lane + 1}${e.swapped ? `, swapping with ${uname(e.swapped)}` : ""}.`
    case "respawn": return `${uname(e.unit)} respawns in lane ${e.lane + 1}.`
    case "play": return `${side(e.side)} plays ${cname(e.card)}${e.reaction ? " (Quick)" : ""}.`
    case "cast": return `${uname(e.unit)} casts ${e.skill}${e.target ? ` on ${uname(e.target)}` : ""}.`
    case "attack": return e.miss ? `${uname(e.attacker)} attacks ${uname(e.target)} and misses.` : `${uname(e.attacker)} attacks ${uname(e.target)}${e.crit ? " (critical hit)" : ""}${e.cardless ? " without a card (66%)" : e.free ? " for free" : ""}.`
    case "damage": return `${uname(e.target)} takes ${e.amount} ${e.kind} damage${e.src ? ` from ${uname(e.src)}` : ""}${e.absorbed ? ` (${e.absorbed} absorbed)` : ""}.`
    case "heal": return `${uname(e.target)} heals ${e.amount} HP.`
    case "shield": return `${uname(e.target)} gains a ${e.amount} Shield.`
    case "status": return `${uname(e.target)} gets ${STATUS_EN[e.id]?.name ?? e.id} for ${e.turns} turn${e.turns === 1 ? "" : "s"}.`
    case "statusEnd": return `${uname(e.target)} loses ${STATUS_EN[e.id]?.name ?? e.id}.`
    case "stack": return `${uname(e.unit)}: ${e.key} is now ${e.value}.`
    case "move": return `${uname(e.unit)} moves from lane ${e.from + 1} to lane ${e.to + 1}${e.with ? `, swapping with ${uname(e.with)}` : ""}.`
    case "kill": return `${uname(e.target)} is taken down${e.src ? ` by ${uname(e.src)}` : ""}.`
    case "lives": return `${side(e.side)} has ${e.lives} ${e.lives === 1 ? "life" : "lives"} left.`
    case "draw": return `${side(e.side)} draws ${cname(e.card)}.`
    case "drawAuto": return `${side(e.side)} draws ${cname(e.card)}, which triggers at once.`
    case "discard": return `${side(e.side)} discards ${cname(e.card)}.`
    case "cardBurned": return `${side(e.side)}'s hand is full: ${cname(e.card)} is burned.`
    case "tempExpired": return `${cname(e.card)} (temporary) fades away from ${side(e.side)}'s hand.`
    case "manaChange": return `${uname(e.unit)} ${e.delta >= 0 ? "gains" : "spends"} ${Math.abs(e.delta)} mana (${e.mana}/${e.max}).`
    case "attackCount": return `${side(e.side)} has made ${e.used}/${e.limit} attacks this turn.`
    case "unequip": return `${uname(e.unit)} unequips ${itemText(e.item,
        "en")?.name ?? e.item} (the card returns to ${side(e.side)}'s hand).`
    case "freeCard": return `${side(e.side)} receives a free ${e.kind === "basic" ? "Basic Attack card" : e.kind === "gold" ? "Gold card" : e.kind === "skill" ? "skill card" : "item component"}.`
    case "transform": return e.on ? `${uname(e.unit)} transforms (${e.id}).` : `${uname(e.unit)} returns to normal form${e.reason === "revive" ? " and revives" : ""}.`
    case "roll": return `${uname(e.unit)}: ${e.key} is now ${e.value}.`
    case "blindStart": return `Summon phase (round ${e.round}): choose face-down, up to ${e.cap} champion(s) each.`
    case "blindLocked": return `${side(e.side)} has locked in their summon.`
    case "burn": return `${cname(e.card)} is burned from ${side(e.side)}'s deck.`
    case "create": return `${cname(e.card)} is added to ${side(e.side)}'s ${e.zone === "hand" ? "hand" : e.zone === "deck" ? "deck" : "graveyard"}.`
    case "steal": return `${side(e.to)} steals ${cname(e.card)} from ${side(e.from)}.`
    case "returnToHand": return `${cname(e.card)} returns to ${side(e.side)}'s hand.`
    case "reveal": return `${side(e.side)} reveals ${e.cards.length} card(s) to ${side(e.to)}: ${e.cards.map(cname).join(", ")}.`
    case "shuffle": return e.what === "graveIntoDeck" ? `${side(e.side)} shuffles ${e.count} cards from the graveyard into the deck.` : `${side(e.side)} shuffles the deck.`
    case "craft": return e.unit ? `${side(e.side)} forges ${e.item} onto ${uname(e.unit)}.` : `${side(e.side)} crafts ${e.item} (the item card goes to the hand).`
    case "equip": return `${uname(e.unit)} equips ${e.item}.`
    case "chainAdd": return `Chain Link ${e.n}: ${side(e.side)} ${e.card ? `activates ${cname(e.card)}` : `attacks with ${uname(e.actor)}`}${e.targets.length ? ` targeting ${e.targets.map(uname).join(", ")}` : ""}.`
    case "chainWindow": return `${side(e.priority)} may respond to the chain (${e.length} link${e.length === 1 ? "" : "s"}).`
    case "chainResolve": return `Chain Link ${e.n} resolves${e.card ? `: ${cname(e.card)}` : ""}.`
    case "chainEnd": return `The chain of ${e.length} link${e.length === 1 ? "" : "s"} has resolved.`
    case "summonToken": return `${side(e.side)} summons ${e.name} to the extra zone${e.owner ? ` for ${uname(e.owner)}` : ""}.`
    case "tokenEnd": return `${uname(e.unit)} leaves the extra zone${e.reason === "expired" ? " (expired)" : ""}.`
    case "tokenFlip": return `${uname(e.unit)} is flipped face up${e.card ? `: ${cname(e.card)}` : ""}.`
    case "prize": return `${side(e.side)} takes a Prize card (${e.left} left).`
    case "pass": return `${side(e.side)} passes.`
    case "marker": return e.on ? `A ${e.id} marker is placed on ${side(e.side)}'s lane ${e.lane + 1}.` : `The ${e.id} marker on ${side(e.side)}'s lane ${e.lane + 1} is removed.`
    case "chainCancel": return `Chain Link ${e.n} is cancelled${e.card ? `: ${cname(e.card)}` : ""}.`
    case "cardFrozen": return `${side(e.side)}'s ${cname(e.card)} is Frozen and can't be played.`
    case "cardThawed": return `${side(e.side)}'s ${cname(e.card)} thaws.`
    case "revealEnd": return `${side(e.side)}'s hand is no longer revealed.`
    case "upgrade": return `${uname(e.unit)} upgrades ${itemText(e.from,
        "en")?.name ?? e.from} into ${itemText(e.item,
        "en")?.name ?? e.item}.`
    case "end": return `${side(e.winner)} wins (${WIN_REASON_EN[e.reason]}).`
    case "log": return e.text
    }
}
