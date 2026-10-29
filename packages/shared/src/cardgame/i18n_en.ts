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
    cardInfo
} from "./engine"

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
}

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
    mushroom: {
        name: "Toxic Mushroom", desc: "Sits in a deck. When drawn it explodes: the lowest-HP champion of the drawer takes {40 + 30% AP} magic damage (using Teemo's AP) and the top 2 cards of the drawer's deck are burned to the graveyard (3 while Mushroom Season runs). The Mushroom takes the place of that draw, then disappears."
    },
    shadow: {
        name: "Shadow", desc: "A copy of a Zed card in the graveyard: casts that exact skill, then disappears. Also disappears if unused by the end of the turn."
    },
    dagger: {
        name: "Dagger", desc: "A special card created by a skill."
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
        name: "Mage", rule: "Strike card hits the opposing champion for 100% AD as magic damage. Skill damage is 25% stronger."
    },
    support: {
        name: "Support", rule: "Strike card hits the opposing champion for 100% AD. While alive, draw 1 extra card each turn."
    },
}

export const STATUS_EN: Record<string, { name: string; desc: string }> = {
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
    "Draw first: at the start of your turn draw 2 cards (+1 for each living Support). If you must draw and your deck is empty, you lose immediately.",
    "Starting hand: 5 base cards plus 3 Wild Skill cards (Q, E, R). Hand limit is 10: extra cards go to the graveyard.",
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
export const HERO_EN: Record<string, HeroTextEn> = {
    darius: {
        desc: "Hand of Noxus. Spread bleed marks, then pull - cut - pull - cut: Apprehend and Guillotine keep returning to your hand.",
        passive: {
            name: "Hemorrhage",
            desc: "Each attack and skill from Darius gives the target 1 bleed mark (max 5; marks stay even if Darius switches targets and expire 2 turns of the target after the last one added). At the start of the target's turn it loses {6 + 6% AD} true damage per mark.",
        },
        skills: {
            Q: {
                name: "Decimate",
                desc: "{50 + 70% AD + 30% AP} physical damage to the opposing champion, +1 mark. **Condition:** if it already had marks, +2 marks instead of 1, and Darius heals {20 + 4% bonus HP}.",
            },
            E: {
                name: "Apprehend",
                desc: "Choose any 1 enemy champion: pull it in front of Darius (swapping with the champion standing there), then Darius basic-attacks it for free. **Condition:** if the target has 3 or more marks, this E card returns to your hand (once per target per turn, to prevent endless loops).",
            },
            R: {
                name: "Noxian Guillotine",
                desc: "{80 + 50% AD + 20% AP} + 30 per mark true damage to the opposing champion. **Condition:** if it is taken down, this R card returns to your hand and Darius draws 1 card.",
            },
        },
    },
    nami: {
        desc: "The tide draws cards and lifts allies: every card drawn through a skill heals a teammate, and a crit with the blessing draws even more.",
        passive: {
            name: "Surging Tides",
            desc: "Each card Nami draws through a skill heals the lowest-HP ally for {15 + 10% AP}.",
        },
        skills: {
            Q: {
                name: "Ebb and Flow",
                desc: "Draw 2 cards. **Condition:** if the 2 cards drawn are **different types** (a skill card vs a support card, Component vs Gold...), discard 1 card of your choice from your hand.",
            },
            E: {
                name: "Blessing of the Tides",
                desc: "Buff 1 ally: that champion's next attack needs no Strike card and deals an extra {30 + 20% AP} magic damage. **Condition:** if that attack crits, Nami draws 1 extra card.",
            },
            R: {
                name: "Tidal Wave",
                desc: "Draw 3 cards (draw only, no damage). **Condition:** if your team has only 3 lives or fewer left, draw 5 instead of 3.",
            },
        },
    },
    kogmaw: {
        desc: "Grows stronger by living and by dying. With enough stacks, he shreds the whole enemy team, fires every turn and finishes with Living Artillery.",
        passive: {
            name: "Kog Stack",
            desc: "Each round Kog'Maw is alive he gains +1 Stack. Each time Kog'Maw dies he gains +2 Stacks. Stacks are kept through death. Each Stack: Kog'Maw's attacks deal +{4 + 2% AD} damage.",
        },
        skills: {
            Q: {
                name: "Caustic Spittle",
                desc: "{40 + 60% AD + 30% AP} physical damage to 1 enemy champion and Armor Shred (Armor and MR -40%) for 2 turns. **Condition:** at 6 or more Stacks, Armor Shred hits every enemy champion.",
            },
            E: {
                name: "Bio-Arcane Barrage",
                desc: "For 2 turns, Kog'Maw attacks by himself at the end of each turn with no Strike card needed, at any champion (preferring Armor Shredded ones), dealing 3% of the target's max HP extra. **Condition:** hitting an Armor Shredded champion gives +1 Stack.",
            },
            R: {
                name: "Living Artillery",
                desc: "{80 + 50% AD + 50% AP} + 10 per Stack magic damage to 1 enemy champion. **Condition:** if the target is below 40% HP, deal double.",
            },
        },
    },
    soraka: {
        desc: "Extra cards and dead cards are never wasted: discard them to heal. When the deck runs low, Wish heals the whole team and refills the deck.",
        passive: {
            name: "Shooting Star",
            desc: "Each card discarded from your hand (for any reason, except overflow cards that never reached the hand) heals the lowest-HP ally for {20 + 10% AP}.",
        },
        skills: {
            Q: {
                name: "Starcall",
                desc: "{40 + 20% AD + 40% AP} magic damage to 1 enemy champion, and Soraka heals {30 + 20% AP}. **Condition:** if the graveyard holds 10 or more cards, the lowest-HP ally also heals {30 + 20% AP}.",
            },
            E: {
                name: "Astral Offering",
                desc: "Choose 1 allied champion and discard as many cards from your hand as you like: each discarded card heals that champion for {70 + 30% AP}. **Condition:** if the discarded card is a **dead card** (a skill card of a champion who is dead or not yet on the board), it heals 50% more.",
            },
            R: {
                name: "Wish",
                desc: "Every allied champion heals {120 + 50% AP}, then **shuffle your entire graveyard back into your deck**. **Condition:** if your deck has fewer than 10 cards (before shuffling), every ally also gains a {100 + 30% AP} Shield.",
            },
        },
    },
    teemo: {
        desc: "He needs to kill nobody: every exploding Mushroom costs the opponent 3 cards. The thinner their deck, the thicker the Mushrooms.",
        passive: {
            name: "Toxic Mushroom",
            desc: "Mushroom cards sit in the opponent's deck. When one is drawn it explodes: the lowest-HP champion on that side takes {40 + 30% AP} magic damage and the top 2 cards of the opponent's deck are burned to the graveyard. The Mushroom takes the place of that draw, then is destroyed.",
        },
        skills: {
            Q: {
                name: "Plant Mushrooms",
                desc: "Shuffle 1 Mushroom into the opponent's deck. **Condition:** if the opponent's deck has fewer than 30 cards, shuffle in 2 Mushrooms.",
            },
            E: {
                name: "Blinding Dart",
                desc: "{40 + 20% AD + 30% AP} magic damage to 1 enemy champion; its next attack misses. **Condition:** if the target is a marksman, its next 2 attacks miss.",
            },
            R: {
                name: "Mushroom Season",
                desc: "Shuffle 3 Mushrooms into the opponent's deck. **Condition:** during the opponent's next turn, each Mushroom burns 3 cards instead of 2.",
            },
        },
    },
    twistedfate: {
        desc: "The brain of the team: pick colors to fit the moment, search for the exact combo card, and peek at the opponent's hand to break their reactions.",
        passive: {
            name: "Golden Touch", desc: "Each time you use a Gold card to craft an item, draw 1 card."
        },
        skills: {
            Q: {
                name: "Pick a Card",
                desc: "Change color, chosen when played. **Blue** (self): draw 2 cards. **Red** (every enemy champion): {35 + 20% AD + 35% AP} magic damage. **Gold** (1 enemy champion): {50 + 20% AD + 45% AP} magic damage, Stun for 1 turn, and you receive 1 Gold card. **Condition:** choosing the **same color as the previous Q** makes the effect 50% stronger (Blue draws 3 cards, Red/Gold deal 50% more damage).",
            },
            E: {
                name: "Stacked Deck",
                desc: "Search your deck for any 1 card and put it into your hand, then shuffle the deck. **Condition:** if you take an **ultimate (R)** skill card, you must discard 1 other card from your hand.",
            },
            R: {
                name: "Destiny",
                desc: "See the opponent's entire hand until the end of the turn. Choose 1 of your champions: move it to any open lane (swapping with a teammate if needed); its next attack deals double damage. **Condition:** if the opponent's hand has a **reaction card** (like Braum Q/E), you may discard 1 of those.",
            },
        },
    },
    zed: {
        desc: "Master of Shadows: hoard cards, then in one turn clone skills with Shadows and pour everything into a single target.",
        passive: {
            name: "Contempt for the Weak",
            desc: "Zed's attacks against a target below 50% HP deal an extra 8% of its max HP.",
        },
        skills: {
            Q: {
                name: "Razor Shuriken",
                desc: "{40 + 60% AD + 20% AP} physical damage to 1 enemy champion. **Condition:** if the target has a Death Mark (R), deal 40% more damage.",
            },
            E: {
                name: "Living Shadow",
                desc: "Zed moves to any lane (swapping with an ally if needed), then creates 1 Shadow card in your hand: a copy of the most recent Zed card in the graveyard (E cannot be copied). The Shadow disappears at the end of the turn if unused. **Condition:** if the graveyard holds 3 or more Zed cards, create 2 Shadow cards (copying the 2 most recent).",
            },
            R: {
                name: "Death Mark",
                desc: "Mark 1 enemy champion. At the end of the opponent's turn, the mark detonates for 50% of all damage Zed dealt to it since the mark was placed (true damage). **Condition:** if the detonation takes it down, this R card returns to your hand.",
            },
        },
    },
    viktor: {
        desc: "An evolving machine: the more he uses a skill, the stronger it gets. By late game all three skills reach tier 3.",
        passive: {
            name: "Glorious Evolution",
            desc: "Each time a skill is used, that skill gains +1 point. With enough points it evolves on its own (Q and E: 3 points per tier; R: 1 point per tier; max tier 3). A tier applies to every card of the same skill and lasts the whole match.",
        },
        skills: {
            Q: {
                name: "Siphon Power",
                desc: "{50 + 20% AD + 50% AP} magic damage to 1 enemy champion; Viktor gains a {20 + 20% AP} Shield. **Tier 1:** +15% damage. **Tier 2:** double Shield. **Tier 3:** the card goes straight back to your hand after use (once per turn).",
            },
            E: {
                name: "Death Ray",
                desc: "{40 + 20% AD + 40% AP} magic damage to up to 2 enemy champions. **Tier 1:** +15% damage. **Tier 2:** targets are Chilled for 1 turn. **Tier 3:** targets take an extra 50% aftershock at the start of your next turn.",
            },
            R: {
                name: "Chaos Storm",
                desc: "A storm clings to 1 enemy champion for 3 turns, dealing {40 + 30% AP} magic damage at the start of each of your turns. **Tier 1:** 1 more turn. **Tier 2:** Silence for 1 turn when the storm appears. **Tier 3:** each time Viktor uses Q/E while the storm lasts, the storm strikes once more.",
            },
        },
    },
    braum: {
        desc: "The shield of the Freljord. He plays almost only during the opponent's turn: Q covers a single target, E covers area skills, and every reaction draws a card.",
        passive: {
            name: "Vigilance",
            desc: "At the end of the opponent's turn, if Braum played at least 1 reaction card that turn, you draw 1 card.",
        },
        skills: {
            Q: {
                name: "Stand Behind Me",
                desc: "Reaction, when an ally is chosen as a target: redirect the target to Braum, and Braum gains a {60 + 10% bonus HP + 30% AP} Shield. **Condition:** if Braum already had a Shield, reflect 30% of that damage back to the attacker.",
            },
            E: {
                name: "Unbreakable",
                desc: "Reaction, when the enemy plays a skill that targets multiple champions (up to N, or all): every ally takes 40% less damage from that skill. **Condition:** if the blocked skill is an ultimate (R), allies are also immune to its crowd control.",
            },
            R: {
                name: "Glacial Fissure",
                desc: "Play it in your own turn: {80 + 40% AP} magic damage to every enemy champion and Stun for 1 turn. **Condition:** if you still hold 2 or more reaction cards (Braum Q/E) in hand, Stun for 2 turns.",
            },
        },
    },
    blitzcrank: {
        desc: "The card-grabbing golem: drag enemy carries to the front, drain the opponent's hand, and turn stolen cards into skills for your own team.",
        passive: {
            name: "Mana Barrier",
            desc: "A skill card stolen from the opponent becomes a Wild Skill card with the same letter (Q/E/R) in your hand, usable by any of your champions. For each stolen card, Blitzcrank gains +5 Armor and MR permanently (max +30).",
        },
        skills: {
            Q: {
                name: "Rocket Grab",
                desc: "Choose 1 enemy champion: pull it in front of Blitzcrank, deal {50 + 40% AP} magic damage, Stun for 1 turn, and steal 1 random card from the opponent's hand. **Condition:** if the stolen card belongs to the pulled champion itself, steal 1 more.",
            },
            E: {
                name: "Power Fist",
                desc: "Basic-attack the opposing champion right away (no Strike card needed) for an extra {40 + 50% AD} damage, then Stun for 1 turn. **Condition:** if the opponent's hand has 3 cards or fewer, Stun for 2 turns.",
            },
            R: {
                name: "Static Field",
                desc: "Every enemy champion takes {80 + 40% AP} magic damage and is Silenced for 1 turn; the opponent discards 2 random cards from their hand. **Condition:** if their hand is empty after discarding, Blitzcrank gains a {30% max HP} Shield.",
            },
        },
    },
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
    case "craft": return `${side(e.side)} crafts ${e.item} for ${uname(e.unit)}.`
    case "chainAdd": return `Chain Link ${e.n}: ${side(e.side)} ${e.card ? `activates ${cname(e.card)}` : `attacks with ${uname(e.actor)}`}${e.targets.length ? ` targeting ${e.targets.map(uname).join(", ")}` : ""}.`
    case "chainWindow": return `${side(e.priority)} may respond to the chain (${e.length} link${e.length === 1 ? "" : "s"}).`
    case "chainResolve": return `Chain Link ${e.n} resolves${e.card ? `: ${cname(e.card)}` : ""}.`
    case "chainEnd": return `The chain of ${e.length} link${e.length === 1 ? "" : "s"} has resolved.`
    case "summonToken": return `${side(e.side)} summons ${e.name} to the extra zone${e.owner ? ` for ${uname(e.owner)}` : ""}.`
    case "tokenEnd": return `${uname(e.unit)} leaves the extra zone.`
    case "prize": return `${side(e.side)} takes a Prize card (${e.left} left).`
    case "pass": return `${side(e.side)} passes.`
    case "end": return `${side(e.winner)} wins (${WIN_REASON_EN[e.reason]}).`
    case "log": return e.text
    }
}
