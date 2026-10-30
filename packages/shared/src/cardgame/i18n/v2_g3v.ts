// Chữ V2 cho nhóm G3V: Zed, Katarina, Kha'Zix, Qiyana, Soraka, Nami (EN + trạng thái + stack + từ khoá).
// Integrator gộp: HERO_EN_V2_G3V vào HERO_EN, STATUS_V2_G3V / STACK_V2_G3V vào STATUS_EN / STACK_EN và bảng VI của UI, KEYWORDS_V2_G3V vào keywords/index.ts.
// Công thức {…} giữ nguyên như bản Việt (checkTranslations đối chiếu).
import type {
    HeroTextEn
} from "../i18n_en"
import type {
    Keyword
} from "../keywords/types"

export const HERO_EN_V2_G3V: Record<string, HeroTextEn> = {
    zed: {
        desc: "Master of Shadows: unload your whole hand in one beat, every hit hurting more than the last.",
        passive: {
            name: "Chain Beat",
            desc: "Each real attack or original skill beat of Zed that damages an enemy champion adds 1 Chain Beat until end of turn, uncapped. After the main damage, if the enemy is still alive, deal extra damage equal to earlier beats this turn × {8 + 15% AD + 2% AP} + 5% of its current missing HP, of the same type as the main damage. The extra does not crit on its own and does not add Chain Beat.",
        },
        skills: {
            Q: {
                name: "Razor Shuriken",
                desc: "Lock the targetable enemy champion opposite Zed; deal {45 + 180% AD + 20% AP} physical damage. Q is one Chain Beat, not multiple hits by attack speed.",
            },
            E: {
                name: "Living Shadow",
                desc: "Choose an enemy champion; in another lane, Zed swaps with the ally holding the slot opposite it (even a dead one); in the same lane he stays. Only once validly opposite does it deal {30 + 130% AD + 15% AP} physical damage; a failed swap deals no damage.",
            },
            R: {
                name: "Death Mark",
                desc: "Choose a valid enemy champion in any lane; deal {60 + 165% AD + 20% AP} physical damage now. If the target is still on the board, this card schedules one more beat of that same base damage at the end of the current turn; each R card has its own schedule, and it is cancelled if the target leaves the board.",
            },
        },
    },
    katarina: {
        desc: "The Sinister Blade: stick Daggers, blink to the prey or dodge and punish the attacker, sweep the board; take one down and the whole card pile comes back to hand.",
        passive: {
            name: "Voracity",
            desc: "Positive real damage to HP or Shield that Katarina deals to an enemy champion marks it Touched until end of turn. If that champion really dies the same turn (anyone may take it down), every Katarina card used this turn that is in the graveyard returns to your hand, including the card resolving now if it took the champion down; no copies, no mana refund.",
        },
        skills: {
            Q: {
                name: "Bouncing Blade",
                desc: "Choose an enemy champion from afar; deal {110 + 55% AD + 70% AP} magic damage and, if it is still on the board, put a Dagger on it for 2 turns of the marked side. Daggers don't stack, reuse refreshes the duration; E/R don't consume Daggers.",
            },
            E: {
                name: "Shunpo",
                desc: "Quick. Active: choose an enemy champion; in another lane Katarina swaps with the ally holding the slot opposite it (even a dead one), then deals {60 + 30% AD + 40% AP} magic damage, ×2 if it has a Dagger. Chain when the enemy attacks Katarina (top single attack): the attacker becomes the target; only after a valid repositioning does she dodge (cancel the attack) and strike back. Already opposite needs no swap; a failed swap means no dodge and no damage.",
            },
            R: {
                name: "Death Lotus",
                desc: "Every enemy champion takes {85 + 40% AD + 55% AP} magic damage; champions with a Dagger before the damage beat take 60% more (total × 1.6). One beat per champion, not split by attack speed.",
            },
        },
    },
    khazix: {
        desc: "The Voidreaver: mark your prey as Isolated, then hunt it. Vanish, and load another hunting strike.",
        passive: {
            name: "Hunter's Instinct",
            desc: "A real normal attack that hits an Isolated champion (a status Kha'Zix applies) adds {20 + 80% AD + 10% AP} physical damage, which does not crit on its own. Q on an Isolated champion adds a separate {40 + 145% AD + 15% AP} to that Q's own damage.",
        },
        skills: {
            Q: {
                name: "Taste Their Fear",
                desc: "Stab the targetable enemy champion opposite Kha'Zix for {55 + 200% AD + 20% AP} physical damage; if it is Isolated add {40 + 145% AD + 15% AP}. Not multiplied by attack speed.",
            },
            E: {
                name: "Leap Into the Herd",
                desc: "Choose a valid enemy champion; in another lane Kha'Zix swaps with the ally holding the slot opposite it (even a dead one), already opposite he stays. Once confirmed opposite, the target is Isolated until the end of your current turn and takes {30 + 95% AD + 10% AP} physical damage. Invalid target or swap: no mark, no damage.",
            },
            R: {
                name: "Void Stalk",
                desc: "Kha'Zix is Stealthed until the end of the opponent's next turn and gains 1 Kha'Zix Q card. He automatically Isolates the valid enemy champion opposite him until the end of your next turn; with no valid enemy opposite, only the mark is skipped (no manual choice, no random target, no repositioning).",
            },
        },
    },
    qiyana: {
        desc: "Queen of the Elements: a public random element, and Q, E, R change with it. Rock burst, River control, Grass mobility.",
        passive: {
            name: "Elements",
            desc: "On entering the board, on respawn and at the start of your turn, Qiyana gains a public random Rock/River/Grass (1/3 each), kept until the next change. A Rock Mark on an enemy grows by 15 percentage points after each real attack/original skill of Qiyana that actually deals positive damage to its HP/Shield this turn; uncapped, and a new Rock Q does not reset it.",
        },
        skills: {
            Q: {
                name: "Elemental Strike",
                desc: "Every element: choose an enemy champion; in another lane Qiyana swaps with the ally holding the slot opposite it (even a dead one), already opposite she strikes at once; a failed swap has no effect. Rock: {60 + 230% AD + 20% AP} physical damage and opens/keeps a Rock Mark until end of turn. River: {40 + 155% AD + 15% AP} physical damage and Stun for {1 + 0.2% AD + 0.2% AP} units. Grass: {40 + 155% AD + 15% AP} physical damage, Qiyana is Stealthed until the end of the opponent's next turn.",
            },
            E: {
                name: "Elemental Counter",
                desc: "Quick, Chain Only. When the enemy attacks Qiyana (top single attack), by current element. Rock: strike the attacker back for {40 + 155% AD + 15% AP} physical damage, without cancelling the attack. River: try to Stun the attacker for {1 + 0.2% AD + 0.2% AP} units and cancel the attack (cancelled even if the Stun is blocked). Grass: Qiyana swaps with the other valid ally with the highest HP ratio; only a successful swap cancels the attack.",
            },
            R: {
                name: "Order of Erasure",
                desc: "By current element. Rock: every enemy champion takes {60 + 195% AD + 20% AP} physical damage. River: choose an enemy champion; it and up to one other random enemy champion each take {40 + 130% AD + 15% AP} physical damage and are Stunned for {1 + 0.2% AD + 0.2% AP} units. Grass: every enemy champion takes {40 + 130% AD + 15% AP} physical damage; Qiyana swaps with an ally to face the valid enemy champion with the lowest current HP if possible, and gains 1 Qiyana Q card whether or not the swap succeeds.",
            },
        },
    },
    soraka: {
        desc: "The team's shared life pool: pays her own HP to keep an ally from being taken down, refills the pool, negates skills aimed at the team and heals everyone in the big fight.",
        passive: {
            name: "Shared Life",
            desc: "When another allied champion is about to be taken down and you have not used Shared Life this cycle: Soraka loses {20 + 10% max HP} HP directly; that champion is kept at 1 HP. Then it heals {35 + 10% max HP + 50% AP} HP. Once per team per cycle, reset at your Draw Phase. Soraka can be taken down by the HP cost, but the rescue still completes.",
        },
        skills: {
            Q: {
                name: "Starcall",
                desc: "Choose 1 enemy champion; deal {30 + 20% AD + 25% AP} magic damage to it. Then Soraka heals {35 + 7% max HP + 40% AP} HP.",
            },
            E: {
                name: "Equinox",
                desc: "Quick, Chain Only. When an enemy skill card on top of the Chain selects exactly 1 allied champion, and Soraka has more HP than the rounded HP cost: Soraka pays {5% max HP} HP; negate that skill card.",
            },
            R: {
                name: "Wish",
                desc: "Heal {90 + 7% max HP + 45% AP} HP to every living allied champion on the board, Soraka included.",
            },
        },
    },
    nami: {
        desc: "Tide feeds the hand: every useful action of the team is a Rhythm, and enough Rhythm draws cards; Q controls, E heals two allies, R hits the whole enemy board and Empowers the team.",
        passive: {
            name: "Tide of Cards",
            desc: "After an original action of Nami's side (a skill card or an attack) makes an enemy lose HP/Shield or actually heals HP on your side: Nami gains 1 Rhythm (once per action). At 3 Rhythm: lose 3 Rhythm, then draw 1 card. At most 2 cards in each of your cycles; once the cap is reached, no more Rhythm is gained that cycle. Unfinished Rhythm is kept across turns.",
        },
        skills: {
            Q: {
                name: "Ebb and Flow",
                desc: "Choose 1 enemy champion; deal {60 + 30% AD + 35% AP} magic damage to it. Then Stun it for {0,35 + 0,1% AD + 0,2% AP} time units, at most 1.5 units (the fraction is a chance for 1 more unit).",
            },
            E: {
                name: "Surging Tide",
                desc: "Pay 20 or 30 mana from the team pool and choose 1 wounded allied champion; heal it {35 + 30% AD + 55% AP} + M HP (M = the mana actually paid for this card). Then heal the same base amount to 1 other random wounded allied champion. With no valid second champion, only the first is healed.",
            },
            R: {
                name: "Tidal Wave",
                desc: "Deal {50 + 25% AD + 40% AP} magic damage to every enemy champion on the board. Then every allied champion on the board is Empowered for 1 time unit. Finally, heal {65 + 25% AD + 50% AP} HP to the 1 allied champion with the lowest HP ratio.",
            },
        },
    },
}

export const STATUS_V2_G3V: Record<string, { vi: { name: string; desc: string }; en: { name: string; desc: string } }> = {
    zed_chain: {
        vi: {
            name: "Liên Hoàn", desc: "Số nhịp đòn thật/chiêu gốc Zed đã gây sát thương lên địch trong lượt này; mỗi phát sau đau hơn phát trước. Hết lượt thì về 0."
        },
        en: {
            name: "Chain Beat", desc: "How many real attack/original skill beats Zed has landed on enemies this turn; each later hit hurts more. Resets at end of turn."
        },
    },
    zed_mark: {
        vi: {
            name: "Dấu Ấn Tử Thần", desc: "Cuối lượt này, tướng này nhận thêm một nhịp bằng sát thương gốc của mỗi lá R Zed đã đánh dấu nó (số hiện số lịch còn chờ)."
        },
        en: {
            name: "Death Mark", desc: "At the end of this turn, this champion takes one more beat of the base damage of each Zed R that marked it (the number shows pending schedules)."
        },
    },
    kat_dagger: {
        vi: {
            name: "Dao", desc: "Dao của Katarina (2 lượt của phe mang dấu, không cộng dồn): E của Katarina gây gấp đôi lên tướng này, R gây thêm 60%. E/R không tiêu Dao."
        },
        en: {
            name: "Dagger", desc: "Katarina's Dagger (2 turns of the marked side, no stacking): her E deals double to this champion and her R deals 60% more. E/R don't consume it."
        },
    },
    qiyana_mark: {
        vi: {
            name: "Dấu Đá", desc: "Đến hết lượt, mỗi đòn thật/chiêu gốc của Qiyana gây sát thương dương lên tướng này làm các đòn sau của Qiyana lên nó thêm 15 điểm % (không trần; số hiện % đang cộng)."
        },
        en: {
            name: "Rock Mark", desc: "Until end of turn, each real attack/original skill of Qiyana that deals positive damage to this champion makes her later hits on it deal 15 percentage points more (uncapped; the number shows the current bonus %)."
        },
    },
    alwaysCrit: {
        vi: {
            name: "Chí Mạng Chắc", desc: "Mọi đòn đánh thường và chiêu của tướng này chí mạng."
        },
        en: {
            name: "Guaranteed Crit", desc: "Every attack and skill of this champion crits."
        },
    },
    isolated: {
        vi: {
            name: "Cô Lập", desc: "Trạng thái do Kha'Zix gắn (E, R; Thanh Tẩy gỡ được): đòn đánh và Q của Kha'Zix gây thêm sát thương lên tướng này."
        },
        en: {
            name: "Isolated", desc: "A status Kha'Zix applies (E, R; Cleanse removes it): Kha'Zix's attacks and Q deal extra damage to this champion."
        },
    },
}

export const STACK_V2_G3V: Record<string, { vi: { name: string; desc: string }; en: { name: string; desc: string } }> = {
    element: {
        vi: {
            name: "Nguyên Tố", desc: "Nguyên tố hiện tại của Qiyana: 1 Đá (dồn sát thương), 2 Sông (khống chế), 3 Cỏ (cơ động). Đổi khi ra sân, hồi sinh và đầu mỗi lượt của bạn."
        },
        en: {
            name: "Element", desc: "Qiyana's current element: 1 Rock (burst), 2 River (control), 3 Grass (mobility). Changes on entering the board, on respawn and at the start of each of your turns."
        },
    },
    nami_rhythm: {
        vi: {
            name: "Nhịp", desc: "Nhịp của Nami: mỗi hành động hữu ích của phe +1 Nhịp; đủ 3 Nhịp thì rút 1 lá (tối đa 2 lá mỗi chu kỳ). Giữ qua lượt."
        },
        en: {
            name: "Rhythm", desc: "Nami's Rhythm: each useful action of her side gives +1; at 3 Rhythm she draws 1 card (at most 2 cards per cycle). Kept across turns."
        },
    },
}

export const KEYWORDS_V2_G3V: Record<string, Keyword> = {
    zed_chain: {
        vi: "Liên Hoàn",
        en: "Chain Beat",
        descVi: "Nội tại của Zed: mỗi đòn thật/chiêu gốc gây sát thương trong lượt là một nhịp; phát đó thêm sát thương theo số nhịp trước đó trong lượt, cộng 5% máu đã mất của mục tiêu (xem Zed).",
        descEn: "Zed's passive: each real attack/original skill that deals damage in a turn is a beat; that hit deals extra damage per earlier beat this turn, plus 5% of the target's missing HP (see Zed)."
    },
    kat_dagger: {
        vi: "Dao",
        en: "Dagger",
        descVi: "Dấu Katarina gắn lên tướng địch bằng Q (2 lượt của tướng đó): E gây gấp đôi lên nó, R gây thêm 60% (xem Katarina).",
        descEn: "Katarina's mark that Q puts on an enemy champion (2 of its turns): her E deals double to it and her R deals 60% more (see Katarina)."
    },
    qiyana_element: {
        vi: "Nguyên Tố",
        en: "Element",
        descVi: "Qiyana nhận 1 nguyên tố ngẫu nhiên khi ra sân, hồi sinh và mỗi đầu lượt của bạn (Đá dồn sát thương, Sông khống chế, Cỏ cơ động); Q, E, R đổi tác dụng theo nó (xem Qiyana).",
        descEn: "Qiyana gains 1 random element on entering the board, on respawn and at the start of each of your turns (Rock burst, River control, Grass mobility); Q, E, R change with it (see Qiyana)."
    },
    isolated: {
        vi: "Cô Lập",
        en: "Isolated",
        descVi: "Trạng thái chỉ Kha'Zix gắn (E, R): tướng địch đang Cô Lập nhận thêm sát thương từ đòn đánh và Q của Kha'Zix.",
        descEn: "A status only Kha'Zix applies (E, R): an Isolated enemy champion takes extra damage from Kha'Zix's attacks and Q."
    },
}
