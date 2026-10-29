// Tiếng Anh cho 8 tướng nhóm G2 (Darius, Zed, Katarina, Kha'Zix, Qiyana, Aatrox, Garen, Vayne). Lead gộp vào HERO_EN của i18n_en.ts.
// Công thức {…} giữ nguyên như bản Việt (chỉ đổi "máu tối đa" -> "max HP").
import type {
    HeroTextEn
} from "../i18n_en"

export const HERO_EN_G2: Record<string, HeroTextEn> = {
    darius: {
        desc: "Noxian executioner: spread Bleed, drag the bleeding target in front of you, then behead it once its HP drops to the Chopping Block threshold.",
        passive: {
            name: "Hemorrhage",
            desc: "Each Darius attack and skill gives the target 1 Bleed (max 5, expires 2 turns of the target after the last one added). Darius deals 6% more damage per Bleed on the target. A champion whose HP is at most 10% max HP × its Bleed is **On the Block**.",
        },
        skills: {
            Q: {
                name: "Decimate",
                desc: "{55 + 75% AD + 25% AP} physical damage to the opposing champion, +1 Bleed. **Condition:** if it is On the Block after this hit, it is executed.",
            },
            E: {
                name: "Apprehend",
                desc: "Pull any enemy champion to stand opposite Darius (swapping with the enemy standing there), dealing {25 + 40% AD} physical damage and +1 Bleed. **Condition:** if it already had Bleed, +2 Bleed instead of 1.",
            },
            R: {
                name: "Noxian Guillotine",
                desc: "Execute the opposing champion if it is On the Block; otherwise deal {90 + 60% AD + 20% AP} true damage (+6% per Bleed), then execute it if it is now On the Block. **Condition:** on a takedown this R card returns to your hand.",
            },
        },
    },
    zed: {
        desc: "Master of Shadows: spend cards to feed the graveyard, then one turn summon Shadows that copy skills from it, pile every hit into the Death Mark and let it burst at end of turn.",
        passive: {
            name: "Shadows in the Grave",
            desc: "Zed's skills deal 3% more damage for each Zed card in your graveyard (max +30%). Each time Zed damages a champion with a Death Mark, the mark gains +1 hit (max 8).",
        },
        skills: {
            Q: {
                name: "Razor Shuriken",
                desc: "{40 + 55% AD + 20% AP} physical damage to 1 enemy champion. **Condition:** if the target has a Death Mark, Zed also makes a free basic attack on it.",
            },
            E: {
                name: "Living Shadow",
                desc: "Zed moves to a lane (swapping with an ally there), then creates 1 Shadow card: a copy of the most recent Zed Q or R in your graveyard. Shadows vanish at end of turn if unused. **Condition:** with 4 or more Zed cards in your graveyard, create 2 Shadows (the 2 most recent Q/R).",
            },
            R: {
                name: "Death Mark",
                desc: "Put a Death Mark on 1 enemy champion (+2 hits if already marked). At the end of this turn the mark bursts: {40 + 30% AD} + {30 + 25% AD} per hit shown on the mark, as true damage. **Condition:** if the burst takes it down, the most recent R in your graveyard returns to your hand.",
            },
        },
    },
    katarina: {
        desc: "The Sinister Blade: stick Daggers into lanes, then blink to them to slash; where you place the daggers is the whole game. Takedowns bring skills back from the graveyard.",
        passive: {
            name: "Voracity",
            desc: "A Dagger lies in a lane and shows its turns left (2 of your turns, max 1 dagger per lane). When Katarina is summoned or respawns she drops 1 dagger in her lane. Whenever an enemy champion is taken down during your turn, the most recent Katarina Q or E in your graveyard returns to your hand.",
        },
        skills: {
            Q: {
                name: "Bouncing Blade",
                desc: "{35 + 35% AD + 30% AP} magic damage to 1 enemy champion and drop 1 Dagger in its lane (2 turns). **Condition:** if that lane already had a dagger, Bouncing Blade deals 50% more (the dagger is refreshed).",
            },
            E: {
                name: "Shunpo",
                desc: "Choose 1 lane with a Dagger: Katarina blinks there (swapping with an ally), picks the dagger up and deals {55 + 55% AD + 40% AP} magic damage to the opposing enemy. **Condition:** the lane Katarina just left gets a new dagger.",
            },
            R: {
                name: "Death Lotus",
                desc: "Every enemy champion takes {40 + 25% AD + 25% AP} magic damage; enemies standing in a lane with a Dagger take {60 + 40% AD + 35% AP} more. All daggers on the board are picked up.",
            },
        },
    },
    khazix: {
        desc: "Void predator: strike the champion that stands alone, vanish after every leap, evolve with every prize card flipped.",
        passive: {
            name: "Unseen Threat",
            desc: "An enemy champion with no ally in either adjacent lane is **Isolated**: Kha'Zix deals 40% more damage to it. **Evolution:** each prize card your side has flipped (max 3) gives Kha'Zix +12% damage.",
        },
        skills: {
            Q: {
                name: "Taste Their Fear",
                desc: "{30 + 55% AD + 20% AP} physical damage to 1 enemy champion. **Condition:** if the target is Isolated it also gets Armor Shred for 1 turn.",
            },
            E: {
                name: "Leap",
                desc: "Kha'Zix leaps to the lane of 1 enemy champion (swapping with an ally there) and deals {30 + 45% AD} physical damage. **Condition:** if the target is Isolated, Kha'Zix gains Stealth until the end of the opponent's turn (can't be picked as a single target).",
            },
            R: {
                name: "Void Assault",
                desc: "Knock 1 enemy champion into an empty lane on its side, deal {40 + 50% AD} physical damage, then Kha'Zix gains Stealth until the end of the opponent's turn. **Condition:** if your side has flipped 3 or more prize cards, Kha'Zix also leaps to stand opposite it.",
            },
        },
    },
    qiyana: {
        desc: "Empress of the Elements: the top card of your graveyard decides the element of every slash; burn your own deck to change it, and her R burns the enemy deck.",
        passive: {
            name: "Royal Privilege",
            desc: "Qiyana's element is the top card of your graveyard: **Terrain** (Gold, Component), **River** (Draw, summoner spells), **Brush** (Strike, skill cards). Each card burned from your deck gives Qiyana a {40 + 30% AD} Shield.",
        },
        skills: {
            Q: {
                name: "Elemental Wrath",
                desc: "{45 + 65% AD + 20% AP} physical damage to 1 enemy champion, by the element at that moment: **Terrain** Stun 1 turn · **River** Chill 2 turns · **Brush** 40% more damage. **Condition:** with an empty graveyard there is no element.",
            },
            E: {
                name: "Terrashape",
                desc: "This card goes to the graveyard first, then burn the top card of your deck: the burned card lies on top of the graveyard and becomes the new element. **Condition:** if the burned card is a Qiyana skill card, it returns to your hand instead.",
            },
            R: {
                name: "Supreme Display of Talent",
                desc: "Burn the top 3 cards of the opponent's deck. Every enemy champion takes {60 + 50% AD + 30% AP} physical damage and suffers the effect of EACH different element among the burned cards (Terrain: Stun, River: Chill, Brush: +40% damage).",
            },
        },
    },
    aatrox: {
        desc: "The World Ender: his own HP is his ammunition; the lower he is, the harder he hits, and he drains enemies to reload.",
        passive: {
            name: "Blood Price",
            desc: "Aatrox deals 1% more damage for every 1% HP missing (max +60%; +100% while World Ender).",
        },
        skills: {
            Q: {
                name: "The Darkin Blade",
                desc: "Aatrox pays {8% max HP} HP (can't kill himself), then deals {60 + 80% AD + 20% AP} physical damage to the opposing champion. **Condition:** if Aatrox is below 50% HP after paying, he also slashes the enemies in both adjacent lanes.",
            },
            E: {
                name: "Infernal Chains",
                desc: "{40 + 45% AD} physical damage to 1 enemy champion; Aatrox heals for the HP it lost. **Condition:** below 30% HP the heal is doubled.",
            },
            R: {
                name: "World Ender",
                desc: "Aatrox pays 30% of his current HP and becomes the World Ender for 2 of his turns (passive max +100%; the first lethal hit leaves him at {15% max HP} HP instead, then the state ends), then deals {50 + 60% AD} physical damage to every enemy champion.",
            },
        },
    },
    garen: {
        desc: "The Might of Demacia: the more the enemy side leads (lives, items, cards in hand), the harder Garen hits.",
        passive: {
            name: "Justice",
            desc: "Garen deals 15% more damage for each category where the enemy side is ahead of yours: **lives** left, total **items** equipped, **cards in hand** (max +45%).",
        },
        skills: {
            Q: {
                name: "Decisive Strike",
                desc: "{40 + 60% AD + 20% AP} physical damage to the opposing champion. **Condition:** if it has more items than Garen, it is Silenced for 1 turn.",
            },
            E: {
                name: "Judgment",
                desc: "Garen spins: {35 + 50% AD} physical damage to the opposing champion and the enemies in both adjacent lanes. **Condition:** if the enemy side has more lives than yours, Garen gains a {40 + 6% max HP} Shield.",
            },
            R: {
                name: "Demacian Justice",
                desc: "{90 + 60% AD} + 60 per item the target has equipped, as true damage to 1 enemy champion. **Condition:** a takedown while your side has fewer lives flips 1 extra prize card.",
            },
        },
    },
    vayne: {
        desc: "Night Hunter: stick Silver Bolts, the 3rd one bursts for a share of the target's max HP; pin enemies against the wall to Stun them.",
        passive: {
            name: "Silver Bolts",
            desc: "Each Vayne attack that hits sticks 1 Silver Bolt (kept 2 turns of the target). The 3rd bolt bursts: 12% of the target's max HP + {30 + 20% AD} true damage.",
        },
        skills: {
            Q: {
                name: "Tumble",
                desc: "Vayne attacks any 1 enemy champion (60% of a basic attack) plus {40 + 50% AD + 20% AP} physical damage, no Strike card needed. **Condition:** if the target is a Tank, stick 1 extra Silver Bolt.",
            },
            E: {
                name: "Condemn",
                desc: "{35 + 50% AD + 20% AP} physical damage to 1 enemy champion, stick 1 Silver Bolt, then push it 1 lane toward the board edge (the middle lane pushes left; if an ally of it stands there they swap). **Condition:** if that side is the board edge or a closed lane, it is pinned to the wall: if it already carried a Silver Bolt, it is Stunned for 1 turn.",
            },
            R: {
                name: "Final Hour",
                desc: "Every Silver Bolt stuck in enemy champions bursts now (each marked champion bursts once, whether it had 1 or 2 bolts), then Vayne gains Stealth until the end of the opponent's turn.",
            },
        },
    },
}

/** Trạng thái / stack mới của nhóm G2 (gộp vào STATUS_EN) */
export const STATUS_EN_G2: Record<string, { name: string; desc: string }> = {
    bleed: {
        name: "Bleed", desc: "Darius's mark: Darius deals 6% more damage per Bleed; at HP ≤ 10% max HP × Bleed the champion is On the Block (Q/R execute it)."
    },
    zedmark: {
        name: "Death Mark", desc: "Counts Zed's hits this turn; bursts at the end of Zed's turn for true damage per hit."
    },
    silver: {
        name: "Silver Bolts", desc: "The 3rd bolt bursts for 12% max HP true damage."
    },
    aatrox_r: {
        name: "World Ender", desc: "Aatrox's Blood Price goes up to +100%; the first lethal hit leaves him alive."
    },
    stealth: {
        name: "Stealth", desc: "Can't be picked as a single target or by Strike cards (hit-all skills still hit)."
    },
}

/** Stack hiện trên tướng: dagger1..dagger5 (Katarina, số lượt còn lại của dao ở đường N), evo (Kha'Zix, bậc tiến hoá) */
export const STACK_EN_G2: Record<string, string> = {
    dagger1: "Dagger in lane 1 (turns left)",
    dagger2: "Dagger in lane 2 (turns left)",
    dagger3: "Dagger in lane 3 (turns left)",
    dagger4: "Dagger in lane 4 (turns left)",
    dagger5: "Dagger in lane 5 (turns left)",
    evo: "Evolution tier",
}

/** Lá đặc biệt của nhóm G2 (gộp vào SPECIAL_EN; "dagger" cũ không còn dùng) */
export const SPECIAL_EN_G2: Record<string, { name: string; desc: string }> = {
    shadow: {
        name: "Shadow", desc: "A copy of a Zed Q or R in the graveyard: casts that exact skill, then disappears. Also disappears if unused by the end of the turn."
    },
}
