// Tiếng Anh cho nhóm G4 (Kog'Maw, Jinx, Ashe, Lux, Ahri, Annie, Lissandra, Gangplank). Cùng dạng HERO_EN trong ../i18n_en.ts;
// lead gộp vào HERO_EN. Công thức {…} giữ đúng như bản tiếng Việt (checkTranslations so sánh).
import type {
    HeroTextEn
} from "../i18n_en"

export const HERO_EN_G4: Record<string, HeroTextEn> = {
    kogmaw: {
        desc: "Grows from death: every fallen ally (Kog'Maw included) feeds him Kog Stacks. The more lives your team has lost, the wider the acid spreads and the more the artillery reloads.",
        passive: {
            name: "Hunger of the Void",
            desc: "Each time one of your champions is taken down, Kog'Maw gains +1 Kog Stack (+2 if it was Kog'Maw himself; Stacks are shown on him and kept through death). Each Stack: Kog'Maw's attacks deal +{6 + 3% AD} damage. When Kog'Maw is taken down he bursts: {40 + 20% AD} + 8 per Stack true damage to every enemy champion.",
        },
        skills: {
            Q: {
                name: "Caustic Spittle",
                desc: "{40 + 60% AD + 30% AP} physical damage to 1 enemy champion and Armor Shred (Armor and MR -40%) for 2 turns. **Condition:** if your team has fewer lives than the opponent, Armor Shred every enemy champion.",
            },
            E: {
                name: "Bio-Arcane Barrage",
                desc: "For 2 turns, at the end of your turn Kog'Maw attacks by himself (no Strike card needed) any enemy champion, preferring Armor Shredded ones, dealing 3% of the target's max HP extra. **Condition:** if your team has fewer lives than the opponent, it lasts 3 turns.",
            },
            R: {
                name: "Living Artillery",
                desc: "{70 + 40% AD + 50% AP} + 15 per Kog Stack magic damage to 1 enemy champion. **Condition:** if the target is Armor Shredded and your team has fewer lives than the opponent, remove its Armor Shred and this R card returns to your hand.",
            },
        },
    },
    jinx: {
        desc: "Chain excitement: each enemy champion taken down on Jinx's turn gives one more card and one free shot. The more items she carries, the more rockets fly.",
        passive: {
            name: "Get Excited!",
            desc: "Each time an enemy champion is taken down during your turn, Jinx becomes Excited until the end of the turn (shown on her): you draw 1 card and Jinx's next attack needs no Strike card.",
        },
        skills: {
            Q: {
                name: "Switcheroo! Fishbones",
                desc: "{30 + 70% AD} physical damage to 1 enemy champion, plus 1 extra rocket for **each item** Jinx carries: each rocket deals 50% of that to another enemy champion (lowest HP first). **Condition:** if Jinx is Excited, you draw 1 card.",
            },
            E: {
                name: "Pow-Pow Reload",
                desc: "Search your deck for 1 Strike card and put it into your hand; Jinx's next attack deals an extra {20 + 40% AD} physical damage. **Condition:** if Jinx carries 2 or more items, search for 2 Strike cards.",
            },
            R: {
                name: "Super Mega Death Rocket!",
                desc: "{120 + 110% AD} + 20% of the target's missing HP as physical damage to 1 enemy champion; enemy champions in the two adjacent lanes take 50%. **Condition:** +15% damage for each item Jinx carries.",
            },
        },
    },
    ashe: {
        desc: "Freezes the opponent's rhythm: Chill enemy champions, and each Chilled champion pushes one of their skill cards to the bottom of their deck. Hawkshot scouts the enemy deck to bury skill cards.",
        passive: {
            name: "Frost Shot",
            desc: "Ashe's attacks Chill (take 25% more damage) until the end of the next turn. At the end of your turn, for **each Chilled enemy champion**: if the top card of the opponent's deck is a skill card, put it on the bottom of their deck.",
        },
        skills: {
            Q: {
                name: "Volley",
                desc: "{20 + 60% AD} physical damage to up to 3 enemy champions and Chill them. **Condition:** if the opponent's deck has fewer cards than yours, it hits every enemy champion.",
            },
            E: {
                name: "Hawkshot",
                desc: "{15 + 30% AD} physical damage to 1 enemy champion and Chill it. Look at the top 3 cards of the opponent's deck: every skill card goes to the bottom, the others (Mushrooms included) stay on top. **Condition:** if 2 or more skill cards were buried, you draw 1 card.",
            },
            R: {
                name: "Enchanted Crystal Arrow",
                desc: "{100 + 80% AD + 40% AP} physical damage to 1 enemy champion and Stun it for 1 turn. **Condition:** if the target is Chilled, Stun for 2 turns, and the opponent puts 1 random skill card from their hand on the bottom of their deck.",
            },
        },
    },
    lux: {
        desc: "Illuminate, then detonate: every Lux skill leaves a Light mark; when Lux or an ally hits a marked enemy, the mark bursts. Final Spark pierces the whole enemy row and pops every mark.",
        passive: {
            name: "Illumination",
            desc: "Lux's skills put an Illumination mark on enemy champions they hit (2 turns, shown on the champion). When Lux **or an ally** deals skill or attack damage to a marked enemy champion, the mark is consumed and Lux deals an extra {30 + 35% AP} magic damage to it.",
        },
        skills: {
            Q: {
                name: "Light Binding",
                desc: "{65 + 50% AP} magic damage to up to 2 enemy champions, then Illuminate them. **Condition:** any target that already had a mark (it bursts) is Stunned for 1 turn.",
            },
            E: {
                name: "Lucent Singularity",
                desc: "{35 + 25% AP} magic damage to up to 3 enemy champions, then Illuminate them. **Condition:** if you still have 5 or more cards in hand (after playing this one), it hits every enemy champion.",
            },
            R: {
                name: "Final Spark",
                desc: "Pierces the whole enemy row: {110 + 60% AP} magic damage to every enemy champion; every Illumination mark on the enemy row bursts **twice** ({30 + 35% AP} x2). **Condition:** if 3 or more marks burst, you draw 2 cards.",
            },
        },
    },
    ahri: {
        desc: "Charm, then exploit: a Charmed champion is pulled in front of Ahri, the opponent's hand is revealed, and the cards it plays against Ahri's team hit its own allies instead.",
        passive: {
            name: "Bewitch",
            desc: "When a Charmed enemy champion (shown on it) deals skill or attack damage to your side: your side loses nothing, instead **its own lowest-HP ally** takes exactly that much (true damage), and Ahri heals {20 + 15% AP}.",
        },
        skills: {
            Q: {
                name: "Orb of Deception",
                desc: "{75 + 50% AP} magic damage to 1 enemy champion. **Condition:** if the target is Charmed, the opponent discards 1 random skill card from their hand.",
            },
            E: {
                name: "Charm",
                desc: "{55 + 35% AP} magic damage to 1 enemy champion, Charm it for 1 turn and pull it into the lane opposite Ahri. The opponent reveals their whole hand to you. **Condition:** if the target was already standing opposite Ahri, Charm lasts 2 turns.",
            },
            R: {
                name: "Spirit Rush",
                desc: "{60 + 40% AP} magic damage to up to 3 enemy champions and Charm them for 1 turn (the first one is pulled opposite Ahri). **Condition:** champions that were already Charmed take x1.5 damage.",
            },
        },
    },
    annie: {
        desc: "A girl and her bear: Tibbers stands in the extra summon zone and takes every hit aimed at Annie; the more the bear is hit, the more Annie Blazes to burn and Stun.",
        passive: {
            name: "Teddy Bear",
            desc: "Tibbers stands in the extra summon zone; damage aimed at Annie hits Tibbers first. Each time Tibbers takes damage from an enemy, Annie gains +1 Blaze (max 3, shown on her). At the end of each of your turns, Tibbers mauls the enemy champion opposite Annie (or the lowest-HP one).",
        },
        skills: {
            Q: {
                name: "Disintegrate",
                desc: "{80 + 50% AP} + {25 + 15% AP} per Blaze magic damage to 1 enemy champion; consumes all Blaze. **Condition:** if 3 Blaze were consumed, the target is Stunned for 1 turn.",
            },
            E: {
                name: "Tibbers!",
                desc: "If Tibbers is not out, summon Tibbers into the extra summon zone ({300 + 60% AP} HP, attack {60 + 40% AP}). **Condition:** if Tibbers is already out, instead he gains a {60 + 30% AP} Shield and immediately mauls the enemy champion opposite Annie.",
            },
            R: {
                name: "Tibbers Unleashed",
                desc: "Summon a giant Tibbers (double HP, replacing the old one), then he mauls **every enemy champion** once. **Condition:** if Annie has 3 Blaze, consume them all and every mauled champion is Stunned for 1 turn.",
            },
        },
    },
    lissandra: {
        desc: "Freezes whoever dares to act: Chill enemy champions, then on the opponent's turn Stun the Chilled champion that just played a card to cancel it. Chilled champions taken down give extra prize cards.",
        passive: {
            name: "Eternal Frost",
            desc: "When an enemy champion is taken down while Chilled, you flip 1 extra prize card.",
        },
        skills: {
            Q: {
                name: "Ice Shard",
                desc: "**Quick:** can be chained onto any card the opponent plays. {160 + 50% AP} magic damage to 1 enemy champion and Chill it until the end of the next turn. **Condition:** if the target was already Chilled, it is Silenced for 1 turn.",
            },
            E: {
                name: "Ring of Frost",
                desc: "**Quick:** can be chained when a **Chilled** enemy champion plays a card: {140 + 35% AP} magic damage and Stun that champion (the card it just played is cancelled). On your turn: choose 1 Chilled enemy champion, deal {140 + 35% AP} magic damage and Stun it for 1 turn. **Condition:** can only target Chilled champions.",
            },
            R: {
                name: "Frozen Tomb",
                desc: "**Quick, chain only:** when the opponent plays a card targeting exactly 1 of your champions, that champion becomes a Frozen Tomb: it takes no damage and no crowd control from that card. The caster takes {200 + 40% AP} magic damage and is Chilled. **Condition:** if the caster was already Chilled, it is also Stunned (its card is cancelled).",
            },
        },
    },
    gangplank: {
        desc: "Face-down powder keg: set a card as a real or fake keg, and the powder grows every turn. The opponent must guess: spend a marksman's attack to break the keg, or gamble and wait for the blast.",
        passive: {
            name: "Bilgewater Powder",
            desc: "The Powder Keg lies face down in the extra summon zone: at the start of each of your turns it gains +1 Powder (shown on the keg); it fizzles out after 3 of your turns. Only an enemy marksman's basic attack can break the keg (1 HP; breaking a real keg does not set it off). The card set as the keg goes to the graveyard when the keg explodes, breaks or fizzles. Each time Gangplank takes down an enemy champion, you get 1 Gold card. Gangplank's skills and keg deal +8% damage for each item he carries.",
        },
        skills: {
            Q: {
                name: "Parrrley",
                desc: "Choose 1: shoot 1 enemy champion for {40 + 80% AD} physical damage (can crit from items); **or** shoot your Powder Keg: flip it, a real keg explodes for {55 + 40% AD} + {35 + 20% AD} per Powder physical damage to **every enemy champion**; a fake keg does nothing. **Condition:** if the shot (or the blast) takes down an enemy champion, this Q card returns to your hand.",
            },
            E: {
                name: "Powder Keg",
                desc: "Set another card from your hand face down as a Powder Keg in the extra summon zone (1 HP, fizzles after 3 turns; playable only when you have no keg). A Gangplank skill card makes a **real** keg, any other card a **fake** one; the opponent only sees a face-down keg. **Condition:** if Gangplank carries 2 or more items, the keg enters with 1 Powder already.",
            },
            R: {
                name: "Cannon Barrage",
                desc: "First detonate your Powder Keg (if any; a fake one does nothing), then fire cannon waves: each wave deals {25 + 25% AD + 30% AP} physical damage to every enemy champion; 1 wave, **plus 1 wave for each item** Gangplank carries. **Condition:** number of waves = 1 + items.",
            },
        },
    },
}
