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
    HERO_EN_G2, SPECIAL_EN_G2, STACK_EN_G2, STATUS_EN_G2
} from "./i18n/en_g2"
import {
    HERO_EN_G3, STATUS_EN_G3
} from "./i18n/en_g3"
import {
    HERO_EN_G4
} from "./i18n/en_g4"

export type CardLang = "vi" | "en";
let current: CardLang = "vi"
export const getCardLang = () => current

// ======================================================================
// Bảng chữ chung
// ======================================================================
export const SUPPORT_EN: Record<SupportId, { name: string; desc: string }> = {
    basic: {
        name: "Strike", desc: "1 allied champion makes a basic attack, following its role's rules."
    },
    gold: {
        name: "Gold", desc: "1 gold: 2 Components + 1 Gold combine into 1 item."
    },
    item: {
        name: "Component", desc: "Item component: 2 Components + 1 Gold combine into 1 item and equip it (max 3 items per champion)."
    },
    potion: {
        name: "Health Potion", desc: "1 allied champion heals {150 + 10% max HP}."
    },
    draw: {
        name: "Draw", desc: "Draw 2 cards."
    },
    buff: {
        name: "Boost", desc: "1 allied champion deals +20% damage and gains a 100 Shield until the end of the opponent's turn."
    },
    legend: {
        name: "Legendary Item", desc: "Crafted item: play it on 1 of your champions with a free item slot to equip it."
    },
    spell_heal: {
        name: "Heal", desc: "1 allied champion heals {150} + 10% of its max HP."
    },
    spell_flash: {
        name: "Flash", desc: "Move 1 allied champion to an open, empty lane."
    },
    spell_ignite: {
        name: "Ignite", desc: "1 enemy champion is Ignited for 2 turns: at the start of each of its turns it loses 50 HP (true damage), plus Grievous Wounds (healing and Shields received -50%) for the same duration."
    },
    spell_exhaust: {
        name: "Exhaust", desc: "1 enemy champion deals 40% less damage until the end of its next turn."
    },
    spell_barrier: {
        name: "Barrier", desc: "1 allied champion gains a Shield of {120} + 10% of its max HP."
    },
    spell_cleanse: {
        name: "Cleanse", desc: "Remove every crowd control and harmful effect (Stun, Silence, Chill, Armor Shred, Blind, Ignite, Grievous Wounds, Exhaust, Bleed, Burn...) from 1 allied champion."
    },
    spell_smite: {
        name: "Smite", desc: "Deal 400 true damage to the summoned unit in the opponent's extra zone (how non-marksmen answer tokens)."
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
    ...SPECIAL_EN_G2,
    mushroom: {
        name: "Toxic Mushroom", desc: "Sits in a deck. When drawn it explodes: the lowest-HP champion of the drawer takes {120 + 30% AP} magic damage (using Teemo's AP) and the top 3 cards of the drawer's deck are burned to the graveyard (4 while Mushroom Season runs). The Mushroom takes the place of that draw, then disappears."
    },
}

export const ROLE_EN: Record<Role, { name: string; rule: string }> = {
    fighter: {
        name: "Fighter", rule: "Attacks the opposing champion by itself every turn for 100% AD, no card needed. Few, simple skills."
    },
    tank: {
        name: "Tank", rule: "Strike card hits the opposing champion for 100% AD. Taunt: enemy marksmen's Strike cards must target a tank. Many versatile skills."
    },
    assassin: {
        name: "Assassin", rule: "Strike card hits the champion in the same lane for 350% AD."
    },
    marksman: {
        name: "Marksman", rule: "Strike card hits any enemy champion for 200% AD (but must hit a tank if the enemy has one on the board)."
    },
    mage: {
        name: "Mage", rule: "Strike card hits the opposing champion for 100% AD as magic damage. Skill damage is 40% stronger."
    },
    support: {
        name: "Support", rule: "Strike card hits the opposing champion for 100% AD. While alive, draw 1 extra card each turn (+1 at most, however many Supports)."
    },
}

export const STATUS_EN: Record<string, { name: string; desc: string }> = {
    ...STATUS_EN_G2, ...STATUS_EN_G3,
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
    bleed: {
        name: "Hemorrhage", desc: "Loses HP at the start of its owner's turn for each mark."
    },
    burn: {
        name: "Burn", desc: "Takes magic damage at the start of its owner's turn for each stack; Brand can detonate it."
    },
    stealth: {
        name: "Stealth", desc: "Can't be chosen by single-target or up-to-N skills, nor by attacks (skills that hit every enemy still hit it)."
    },
    bailout: {
        name: "Bailout", desc: "Can't be taken down until the end of its team's next turn; survives for good only by taking down an enemy champion first."
    },
    berserk: {
        name: "Berserk", desc: "Turned against its own team by Hostile Takeover."
    },
}

/** Tên chỉ số đồ (lá đồ huyền thoại) */
export const STAT_EN: Record<string, string> = {
    atk: "AD", ap: "AP", hp: "HP", armor: "Armor", mr: "MR", crit: "Crit chance", critDmg: "Crit damage", atkMult: "% AD",
    lethality: "Lethality", magicPen: "Magic pen", spellAmp: "% skill damage", dmgAmp: "% damage", lifesteal: "Life steal", omnivamp: "Omnivamp", extraAtk: "% attack damage", manaRegen: "AP (Tear)",
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
    "Summon first, then draw: each turn starts with a Summon step (summon reserve champions into empty open lanes, or skip), then you draw 2 cards (+1 if you have a living Support). If you must draw and your deck is empty, you lose immediately.",
    "Opening: your first turn starts by summoning your first champion (its cards are shuffled into your deck), then you draw a 5-card opening hand (no extra turn draw that turn). Hand limit is 10: extra cards go to the graveyard.",
    "Two ways to win: take down 7 enemy champions (each side has 7 lives), or make the opponent run out of cards.",
    "Lanes open gradually: round 1 only lane 3 (1v1), round 4 adds lanes 2 and 4 (3v3), round 8 adds lanes 1 and 5 (5v5).",
    "Summoning a champion shuffles its 34 cards into your deck: 6 Q + 6 E + 2 R skills and 20 support cards.",
    "Skill cards go to the graveyard after use. Support cards are gone after use.",
    "A fallen champion respawns after 3 rounds in its old lane, with its items. Its cards are dead cards in the meantime.",
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
const HERO_EN_LEAD: Record<string, HeroTextEn> = {
    nami: {
        desc: "The tide feeds your hand: every card she draws turns into power for her allies, and a skill card drawn for an ally blesses that ally's next attack.",
        passive: {
            name: "Surging Tides",
            desc: "Each card Nami draws through a skill heals the lowest-HP ally for {15 + 10% AP}.",
        },
        skills: {
            Q: {
                name: "Ebb and Flow",
                desc: "Draw 2 cards. **Condition:** for each skill card drawn that belongs to one of your champions on the board, that champion is Blessed (its next attack needs no Strike card).",
            },
            E: {
                name: "Blessing of the Tides",
                desc: "Buff 1 ally: that champion's next attack needs no Strike card and deals an extra {40 + 20% AP} magic damage. **Condition:** if that attack crits, Nami draws 1 extra card.",
            },
            R: {
                name: "Tidal Wave",
                desc: "Draw 2 cards and every allied champion on the board is Blessed (next attack needs no Strike card). **Condition:** if your team has only 3 lives or fewer left, draw 4 instead of 2.",
            },
        },
    },
    teemo: {
        desc: "Deck pressure that punishes heavy draw: Mushrooms wait in the opponent's deck, and the more they draw, the more explode.",
        passive: {
            name: "Toxic Mushroom",
            desc: "Mushroom cards sit in the opponent's deck. When one is drawn it explodes: the lowest-HP champion on that side takes {120 + 30% AP} magic damage and the top 3 cards of the opponent's deck are burned to the graveyard. The Mushroom takes the place of that draw, then is destroyed.",
        },
        skills: {
            Q: {
                name: "Plant Mushrooms",
                desc: "Shuffle 2 Mushrooms into the opponent's deck. **Condition:** if the opponent's deck has fewer than 30 cards, shuffle in 3 Mushrooms.",
            },
            E: {
                name: "Trap on the Road",
                desc: "Put 1 Mushroom on **top** of the opponent's deck (the next card they draw). **Condition:** if the opponent holds 6 or more cards, put 2 Mushrooms on top.",
            },
            R: {
                name: "Mushroom Season",
                desc: "Shuffle 3 Mushrooms into the opponent's deck. **Condition:** during the opponent's next turn, each Mushroom burns 4 cards instead of 3.",
            },
        },
    },
    twistedfate: {
        desc: "Deck control: pick the right color, search for the exact card while clearing Mushrooms, then read the opponent's hand and throw away the card that matters.",
        passive: {
            name: "Golden Touch", desc: "Each time you use a Gold card to craft an item, draw 1 card."
        },
        skills: {
            Q: {
                name: "Pick a Card",
                desc: "Change color, chosen when played. **Blue** (self): draw 2 cards. **Red** (every enemy champion): {55 + 20% AD + 35% AP} magic damage. **Gold** (1 enemy champion): {75 + 20% AD + 45% AP} magic damage, Stun for 1 turn, and you receive 1 Gold card. **Condition:** if you are holding a **Gold card**, the effect is 50% stronger (Blue draws 3 cards, Red/Gold deal 50% more damage).",
            },
            E: {
                name: "Stacked Deck",
                desc: "Search your deck for any 1 card and put it into your hand, then shuffle the deck; every **Mushroom** (enemy special card) found in your deck is destroyed. **Condition:** if you take an **ultimate (R)** skill card, you must discard 1 other card from your hand.",
            },
            R: {
                name: "Destiny",
                desc: "See the opponent's entire hand until the end of the turn and choose **any 1 card** in it for them to discard. **Condition:** if the discarded card is a **reaction card** (a Quick card), draw 1 card.",
            },
        },
    },
    viktor: {
        desc: "An evolving machine: every 2 Viktor cards in your graveyard raise all three skills by one tier. Pair him with card draw (Nami, Twisted Fate) to reach tier 3 fast.",
        passive: {
            name: "Glorious Evolution",
            desc: "The tier of every Viktor skill = **the number of Viktor cards in your graveyard divided by 2** (max tier 3). Viktor's deck has 8 Q cards, 7 E cards and only 5 Strike cards.",
        },
        skills: {
            Q: {
                name: "Siphon Power",
                desc: "{110 + 20% AD + 50% AP} magic damage to 1 enemy champion; Viktor gains a {25 + 20% AP} Shield. **Tier 1:** +20% damage. **Tier 2:** double Shield. **Tier 3:** draw 1 card.",
            },
            E: {
                name: "Death Ray",
                desc: "{85 + 20% AD + 40% AP} magic damage to up to 2 enemy champions. **Tier 1:** +20% damage. **Tier 2:** targets are Chilled for 1 turn. **Tier 3:** an immediate aftershock deals 50% more.",
            },
            R: {
                name: "Chaos Storm",
                desc: "A storm clings to 1 enemy champion for 3 turns, strikes once right away and deals {60 + 30% AP} magic damage at the start of each of your turns. **Tier 1:** 1 more turn. **Tier 2:** Silence for 1 turn when the storm appears. **Tier 3:** each time Viktor uses Q/E while the storm lasts, the storm strikes once more.",
            },
        },
    },
    renata: {
        name: "Renata Glasc",
        desc: "Zaun's chem-baroness and queen of comebacks: allies about to fall stand up for one more turn, grow stronger the closer they are to death, and Hostile Takeover turns the enemy team's own strength against itself.",
        passive: {
            name: "Bailout",
            desc: "When one of your champions (other than Renata) would be taken down, it stays at 1 HP with **Bailout**: it can't be taken down until the end of your next turn. If it takes down an enemy champion meanwhile, Bailout ends and it lives on; otherwise it is taken down at the end of that turn.",
        },
        skills: {
            Q: {
                name: "Handshake",
                desc: "Pull 1 enemy champion in front of Renata, deal {60 + 40% AP} magic damage and Stun for 1 turn. **Condition:** if your team has **fewer lives** than the enemy team, also steal 1 random card from the opponent's hand.",
            },
            E: {
                name: "Loyalty Program",
                desc: "1 allied champion gains a {40 + 30% AP} Shield plus 20% of the HP it has lost, and +20% damage until the end of the opponent's turn: the closer to death, the stronger. **Condition:** if that champion is below 40% HP (or under Bailout), its next attack needs no Strike card.",
            },
            R: {
                name: "Hostile Takeover",
                desc: "Every enemy champion on the board goes **berserk**: one by one, each makes its full basic attack (role, items, crits, lifesteal) against one of its own allies (adjacent lane first, then lowest HP; if alone, it hits itself): the stronger they are, the more they hurt themselves. **Condition:** if your team has **fewer lives** than the enemy team, each attacks twice.",
            },
        },
    },
    brand: {
        desc: "Vengeful flame: every card adds Burn stacks. Let the fire tick every turn, or detonate it all right now? A burning champion that dies spreads its fire to its neighbour.",
        passive: {
            name: "Blaze",
            desc: "Brand's skills give the target **Burn** stacks (max 5, shown on the champion, expiring 2 of its turns after the last one added). At the start of a burning champion's turn it takes {50 + 8% AP} magic damage per stack. When a burning champion is taken down, all its stacks spread to 1 enemy champion in an adjacent lane (lowest HP).",
        },
        skills: {
            Q: {
                name: "Sear",
                desc: "{100 + 40% AP} magic damage to 1 enemy champion, +2 Burn. **Condition:** if the target was already burning, it is Stunned for 1 turn.",
            },
            E: {
                name: "Conflagration",
                desc: "Choose 1 **burning** enemy champion: detonate all its stacks, each dealing {75 + 25% AP} magic damage at once, then remove the Burn. **Condition:** detonating 3 or more stacks gives 2 Burn to each enemy champion in an adjacent lane.",
            },
            R: {
                name: "Pyroclasm",
                desc: "{90 + 30% AP} magic damage to every enemy champion and +2 Burn to each. **Condition:** champions that were already burning get 1 more Burn.",
            },
        },
    },
}

/** Bản dịch mọi tướng: nhóm lead (nami, viktor, teemo, twistedfate, renata, brand) + các nhóm G2/G3/G4 (i18n/en_g*.ts) */
export const HERO_EN: Record<string, HeroTextEn> = {
    ...HERO_EN_LEAD, ...HERO_EN_G2, ...HERO_EN_G3, ...HERO_EN_G4,
}
/** Tên các stack hiện trên tướng (UI) */
export const STACK_EN: Record<string, string> = {
    ...STACK_EN_G2,
    itemAmp: "Masterwork (% item stats)",
    kog: "Kog Stack",
}

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
const TOKEN_EN_TO_VI: [RegExp, string][] = [[/max HP/gi,
    "máu tối đa"],
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
        const it = getItem(card.item ?? "")
        const items = LOL_EN.items as Record<string, string>
        return {
            name: items[card.item ?? ""] ?? it?.name ?? "Legendary Item", desc: `Legendary item: play it on 1 of your champions with a free item slot to equip it.${it ? ` ${itemStatText(it,
                STAT_EN)}` : ""}`, type: "support"
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
    case "attack": return e.miss ? `${uname(e.attacker)} attacks ${uname(e.target)} and misses.` : `${uname(e.attacker)} attacks ${uname(e.target)}${e.crit ? " (critical hit)" : ""}${e.free ? " for free" : ""}.`
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
    case "burn": return `${cname(e.card)} is burned from ${side(e.side)}'s deck.`
    case "create": return `${cname(e.card)} is added to ${side(e.side)}'s ${e.zone === "hand" ? "hand" : e.zone === "deck" ? "deck" : "graveyard"}.`
    case "steal": return `${side(e.to)} steals ${cname(e.card)} from ${side(e.from)}.`
    case "returnToHand": return `${cname(e.card)} returns to ${side(e.side)}'s hand.`
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
    case "end": return `${side(e.winner)} wins (${WIN_REASON_EN[e.reason]}).`
    case "log": return e.text
    }
}
