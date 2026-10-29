// Tiếng Anh cho nhóm G3 (braum, blitzcrank, leona, malphite, ornn, janna, soraka, yorick). Lead gộp vào HERO_EN của i18n_en.ts.
// Công thức {…} phải khớp bản Việt (checkTranslations): máu tối đa = max HP, máu cộng thêm = bonus HP, Giáp = Armor, Kháng phép = MR.
import type {
    HeroTextEn
} from "../i18n_en"

export const HERO_EN_G3: Record<string, HeroTextEn> = {
    braum: {
        desc: "The shield of the Freljord: he only plays during the opponent's turn. Q covers a single hit, E covers area skills, R blocks a whole skill; every block draws a fresh card.",
        passive: {
            name: "Freljord Wall",
            desc: "Every Braum skill card is a **Quick, chain-only** card. Whenever a Braum Quick card resolves, you draw 1 card.",
        },
        skills: {
            Q: {
                name: "Stand Behind Me",
                desc: "**Quick, chain only**, when the enemy attacks or casts at exactly 1 of your champions: the target becomes Braum, and Braum gains a {130 + 10% bonus HP + 30% AP} Shield. **Condition:** if Braum already had a Shield, reflect 30% of that damage back to the attacker.",
            },
            E: {
                name: "Unbreakable",
                desc: "**Quick, chain only**, when the enemy casts a skill at several of your champions (up to N, or all): your champions take 40% less damage from it. **Condition:** if the blocked skill is an ultimate (R), your champions are also immune to its crowd control.",
            },
            R: {
                name: "Glacial Fissure",
                desc: "**Quick, chain only**, when the enemy casts a skill card at your champions: your champions take **no damage and no crowd control** from that card, and its caster takes {110 + 6% max HP + 40% AP} magic damage and is Chilled for 1 turn. **Condition:** if you still hold 2 or more Braum cards, every enemy champion takes the damage and the Chill.",
            },
        },
    },
    blitzcrank: {
        desc: "The card-stealing golem: he hooks cards out of the opponent's hand, drags the card's owner in front of him, and punches out whoever has run out of cards.",
        passive: {
            name: "Reactor Core",
            desc: "Skill cards stolen from the opponent become a Strike card in your hand. For each card you steal, Blitzcrank gains +5 Armor and MR permanently (max +30, shown on the champion).",
        },
        skills: {
            Q: {
                name: "Rocket Grab",
                desc: "Steal 1 random card from the opponent's hand and deal {120 + 50% AP + 80% AD} magic damage to the champion opposite Blitzcrank. **Condition:** if it is a skill card of an enemy champion on the board, first hook that champion into the lane opposite Blitzcrank (it takes the hit instead).",
            },
            E: {
                name: "Power Fist",
                desc: "Immediately basic attack the opposing champion (no Strike card needed) for {100 + 80% AD} bonus damage, then Stun it for 1 turn. **Condition:** if the opponent holds 5 or fewer cards, Stun for 2 turns instead.",
            },
            R: {
                name: "Static Field",
                desc: "The opponent discards 2 random cards. Then every enemy champion takes {140 + 40% AP} magic damage and is Silenced for 1 turn. **Condition:** if the opponent holds 2 or fewer cards, they are Stunned for 1 turn instead of Silenced.",
            },
        },
    },
    leona: {
        desc: "The Radiant Dawn: she stacks Sunlight on one enemy for her allies to detonate, and leaps in front of an already marked enemy to Stun it.",
        passive: {
            name: "Sunlight",
            desc: "Leona's skills apply **Sunlight** (max 3, shown on the champion, lasts until the end of its next turn). When another ally of Leona (summons included) deals attack or skill damage to a champion with Sunlight, all Sunlight detonates: each stack deals {45 + 60% Armor + 20% AP} magic damage; detonating 3 stacks also Stuns that champion for 1 turn.",
        },
        skills: {
            Q: {
                name: "Shield of Daybreak",
                desc: "Immediately basic attack the opposing champion (no Strike card needed) for {50 + 40% AP} bonus magic damage and apply 2 Sunlight. **Condition:** if it already had Sunlight, it is Stunned for 1 turn.",
            },
            E: {
                name: "Zenith Blade",
                desc: "Leona dashes to the lane opposite 1 enemy champion, deals {60 + 40% AP} magic damage and applies 1 Sunlight. **Condition:** if the target already had Sunlight, it is Stunned for 1 turn.",
            },
            R: {
                name: "Solar Flare",
                desc: "Up to 3 enemy champions take {120 + 40% AP} magic damage and are filled up to 3 Sunlight. **Condition:** champions that already had Sunlight are Stunned for 1 turn right away.",
            },
        },
    },
    malphite: {
        desc: "Shard of the Monolith: every skill scales with Armor. He swallows Components to turn to stone, and no Quick card can save you from Unstoppable Force.",
        passive: {
            name: "Granite Shield",
            desc: "At the start of your turn, if Malphite has no Shield, he gains a {200% Armor} Shield.",
        },
        skills: {
            Q: {
                name: "Seismic Shard",
                desc: "{30 + 80% Armor + 30% AP} magic damage to 1 enemy champion and Armor Shred on it for 1 turn. **Condition:** if the target has less Armor than Malphite, damage +50%.",
            },
            E: {
                name: "Turn to Stone",
                desc: "You may discard 1 Component card from your hand: Malphite gains +10 Armor and MR permanently (max +60, shown on the champion). Then Malphite gains a {120% Armor} Shield. **Condition:** if Malphite wears 2 or more items, the Shield is doubled.",
            },
            R: {
                name: "Unstoppable Force",
                desc: "**Can't be chained.** Every enemy champion takes {40 + 120% Armor + 30% AP} magic damage and is Stunned for 1 turn. **Condition:** if Malphite has a Shield, each enemy champion takes extra magic damage equal to 50% of that Shield.",
            },
        },
    },
    ornn: {
        desc: "The god of the forge under the mountain: not a damage dealer but the team's forge. He supplies Components, finds Gold, and forges allies' items into Masterworks.",
        passive: {
            name: "Living Forge",
            desc: "At the start of your turn, if you hold a Gold card but no Component card, Ornn creates 1 Component card (random component) in your hand.",
        },
        skills: {
            Q: {
                name: "Bellows Breath",
                desc: "Search your deck for 1 Gold card (if you hold no Gold) or 1 Component card (if you do). Ornn gains a {40 + 8% bonus HP + 30% AP} Shield. **Condition:** if you then hold 2 Components + 1 Gold (enough to craft), draw 1 more card.",
            },
            E: {
                name: "Forge a Masterwork",
                desc: "Discard 1 Gold card from your hand: the items of 1 allied champion (wearing items) are forged into a **Masterwork**: every stat from items +50% (max +100% = doubled, shown on the champion). Ornn gains a {40 + 30% AP} Shield. **Condition:** if that champion wears all 3 items, draw 1 card.",
            },
            R: {
                name: "Call of the Forge God",
                desc: "1 allied champion: it is instantly forged 1 random item (no cards needed) and gains a {60 + 10% bonus HP + 30% AP} Shield. **Condition:** a champion already wearing 3 items gets a +50% Masterwork instead of a new item.",
            },
        },
    },
    janna: {
        desc: "The Storm's Fury: her wind makes enemy attacks miss, and her tailwind gives allies free attacks. Every enemy miss becomes a Shield for the team.",
        passive: {
            name: "Eye of the Wind",
            desc: "Whenever an enemy attack aimed at one of your champions misses (Blind), that champion gains a {60 + 30% AP} Shield.",
        },
        skills: {
            Q: {
                name: "Howling Gale",
                desc: "1 enemy champion takes {70 + 40% AP} magic damage and gets **Blind 1** (its next attack misses; the count is shown on the champion, max 3, gone after its next turn). **Condition:** if the target is a marksman or an assassin, Blind 2 instead.",
            },
            E: {
                name: "Eye of the Storm",
                desc: "1 allied champion gains a {80 + 40% AP} Shield and 1 **free attack** (no Strike card needed). **Condition:** if the enemy champion opposite it is Blind, the Shield is 50% stronger.",
            },
            R: {
                name: "Monsoon",
                desc: "All your champions heal {90 + 40% AP}; every enemy champion gets Blind 1. **Condition:** if your team has 3 or fewer lives left, Blind 2 instead.",
            },
        },
    },
    soraka: {
        desc: "No card is ever wasted: spare and dead cards are discarded for healing, the graveyard is sown back into the deck, and Wish refills a nearly empty deck.",
        passive: {
            name: "Shooting Star",
            desc: "Each card discarded from your hand (for any reason, even forced by the opponent; not hand overflow) heals your lowest-HP ally for {20 + 10% AP}.",
        },
        skills: {
            Q: {
                name: "Sow the Stars",
                desc: "Shuffle the top 3 cards of your graveyard back into your deck; for each card, your lowest-HP ally heals {40 + 25% AP}. **Condition:** if your deck has fewer cards than your graveyard, draw 1 more card.",
            },
            E: {
                name: "Astral Infusion",
                desc: "Choose 1 allied champion and discard any number of cards from your hand: each discarded card heals that champion for {45 + 30% AP}. **Condition:** a discarded **dead card** (skill card of a champion that is dead or not yet summoned) heals 50% more.",
            },
            R: {
                name: "Wish",
                desc: "All your champions heal {80 + 50% AP}, then **shuffle your whole graveyard back into your deck**. **Condition:** if your deck had fewer than 10 cards (before shuffling), all your champions also gain a {100 + 30% AP} Shield.",
            },
        },
    },
    yorick: {
        desc: "The Shepherd of Souls: he digs his own deck into the graveyard; every Yorick card there is a Soul. The thicker the graveyard, the bigger the Mist Walker in the extra zone.",
        passive: {
            name: "Shepherd of Souls",
            desc: "Each Yorick card in your graveyard is 1 **Soul**. At the end of each of your turns, the Mist Walker (if it is in the extra summon zone) gains +1 attack per Soul, basic attacks the lowest-HP enemy champion, then loses 1 turn of life (it crumbles at 0).",
        },
        skills: {
            Q: {
                name: "Last Rites",
                desc: "{40 + 70% AD} physical damage to the opposing champion, then dig the top 2 cards of **your own** deck into the graveyard. **Condition:** for each Yorick card dug up (becoming a Soul), Yorick heals {20 + 4% bonus HP}.",
            },
            E: {
                name: "Mourning Mist",
                desc: "{30 + 50% AD} physical damage to 1 enemy champion and Armor Shred on it for 1 turn. **Condition:** if the Mist Walker is in the extra summon zone, it immediately basic attacks that champion.",
            },
            R: {
                name: "Eulogy of the Isles",
                desc: "Summon the **Mist Walker** into the extra summon zone (replacing any summon there): 150 HP + 20 per card in your graveyard, 30 attack + 10 per Soul. It lasts 3 of your turns (turns left are shown on it) and vanishes when Yorick leaves the board. **Condition:** with 4 or more Souls, the Mist Walker also soaks damage for Yorick (damage aimed at Yorick hits it first).",
            },
        },
    },
}

/** Trạng thái / vật triệu hồi mới của nhóm G3 (lead gộp vào STATUS_EN) */
export const STATUS_EN_G3: Record<string, { name: string; desc: string }> = {
    sunlight: {
        name: "Sunlight", desc: "Leona's mark (stacks up to 3). An ally of Leona hitting this champion detonates every stack; 3 stacks also Stun.",
    },
}
