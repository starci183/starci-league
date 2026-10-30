// Văn bản V2 nhóm G5V: Viktor, Ashe, Jinx, Kog'Maw, Teemo, Vayne.
// Tiếng Anh tướng (HERO_EN_V2_G5V), trạng thái, bộ đếm hiện trên tướng, lá đặc biệt và từ khoá. Integrator gộp vào i18n_en.ts, keywords/index.ts và client.
import type {
    HeroTextEn
} from "../i18n_en"
import type {
    Keyword
} from "../keywords/types"

export const HERO_EN_V2_G5V: Record<string, HeroTextEn> = {
    viktor: {
        desc: "The Machine Herald: trade spare cards for Shields and permanent power, then unleash spells on the whole enemy team.",
        passive: {
            name: "Evolution",
            desc: "Evolution (permanent, max 10, kept when Viktor dies): each level makes Viktor's skills deal 8% more damage.",
        },
        skills: {
            Q: {
                name: "Disassemble",
                desc: "Discard up to 3 cards from your hand; for each card discarded: Viktor gains +1 Evolution and a {34 + 10% AD + 20% AP} Shield.",
            },
            E: {
                name: "Death Ray",
                desc: "Every enemy champion takes {115 + 35% AD + 65% AP} magic damage (8% more per Evolution).",
            },
            R: {
                name: "Gravity Field",
                desc: "Every enemy champion takes {121 + 30% AD + 60% AP} magic damage (8% more per Evolution); the enemy champion with the most HP is Stunned for 1 turn; Viktor gains +2 Evolution.",
            },
        },
    },
    ashe: {
        desc: "Steady shots stack steady frost: Frostbite weakens the enemy, Ashe reaches the back row, and one arrow freezes a target.",
        passive: {
            name: "Frost Shot",
            desc: "Ashe's attacks apply Frostbite (stacks, max 10). Frostbite: the damage that champion deals is reduced by 2.5% per stack (max 25% at 10 stacks). Ashe can attack any enemy with Frostbite, ignoring Tanks and Taunt, but these attacks cannot crit.",
        },
        skills: {
            Q: {
                name: "Frost Arrow",
                desc: "Choose 1 enemy champion; it takes {55 + 95% AD + 20% AP} physical damage and +3 Frostbite.",
            },
            E: {
                name: "Focus",
                desc: "Until the end of this turn: each of Ashe's attacks deals {30 + 40% AD + 10% AP} extra physical damage and applies 2 Frostbite instead of 1.",
            },
            R: {
                name: "Great Ice Arrow",
                desc: "Choose 1 enemy champion; it takes {120 + 90% AD + 30% AP} physical damage, is Stunned for 1 turn and gains +5 Frostbite.",
            },
        },
    },
    jinx: {
        desc: "The loose cannon: attack the wounded to go wilder, and one Switcheroo shot stacks Frenzy across the whole team.",
        passive: {
            name: "Get Excited",
            desc: "Jinx's attack hits an enemy champion below 75% HP: +1 Frenzy; below 25% HP: +2 Frenzy; takedown: +10 Frenzy (max 30). When Jinx dies she loses half her Frenzy. Each Frenzy makes Jinx's attacks deal {1 + 1% AD + 0.5% AP} extra physical damage.",
        },
        skills: {
            Q: {
                name: "Switcheroo",
                desc: "Jinx's next attack deals {50 + 110% AD + 20% AP} physical damage (plus 2 per Frenzy) to its target, and 25% of that to every other enemy (each one hit counts for Frenzy).",
            },
            E: {
                name: "Flame Chompers",
                desc: "Quick, Chain Only. When an enemy attacks Jinx: Jinx takes 20% less damage until the end of this turn and takes 1 Jinx Q card from the deck into your hand.",
            },
            R: {
                name: "Rocket",
                desc: "Choose 1 enemy champion; it takes {120 + 90% AD + 20% AP} physical damage, plus 5 per Frenzy and 20% of its missing HP.",
            },
        },
    },
    kogmaw: {
        desc: "The longer he lives, the hungrier he gets: shots scale with max HP, so the tankier the target the bigger the hole.",
        passive: {
            name: "Hunger",
            desc: "At the start of your turn, while Kog'Maw is alive: +1 Hunger. Any champion dies (either team): +1 Hunger (max 20). When Kog'Maw dies: +3 Hunger (he loses none). Kog'Maw's attacks deal 0.8% of the target's max HP per Hunger + {13 + 10% AD + 15% AP} as extra magic damage.",
        },
        skills: {
            Q: {
                name: "Acid Splash",
                desc: "Choose 1 enemy champion; it takes {74 + 80% AD + 40% AP} magic damage and Kog'Maw gains +3 Hunger.",
            },
            E: {
                name: "Unload",
                desc: "Until the end of this turn: the max HP damage from Hunger on each of Kog'Maw's attacks is doubled.",
            },
            R: {
                name: "Living Artillery",
                desc: "Every enemy champion takes magic damage equal to 1.5% of its max HP per Hunger + {42 + 30% AD + 50% AP}.",
            },
        },
    },
    teemo: {
        desc: "No kill needed: plant Mushrooms in the enemy deck, and whoever draws one blows up their weakest champion; whoever attacks Teemo goes blind.",
        passive: {
            name: "Toxic Mushrooms",
            desc: "Each of Teemo's attacks shuffles 1 Mushroom into the opponent's deck. When the opponent draws a Mushroom: their lowest-HP champion takes {80 + 16% AD + 23% AP} magic damage, then they still draw 1 card as normal.",
        },
        skills: {
            Q: {
                name: "Plant Mushrooms",
                desc: "Shuffle 3 Mushrooms into the opponent's deck.",
            },
            E: {
                name: "Blinding Dart",
                desc: "Quick, Chain Only. When an enemy attacks Teemo: that champion is Blinded (the attack misses) and takes {65 + 20% AD + 30% AP} + {16 + 5% AD + 10% AP} per Mushroom in the opponent's deck as magic damage.",
            },
            R: {
                name: "Detonate",
                desc: "Every Mushroom in the opponent's deck explodes at once: each Mushroom explodes on the enemy champion with the lowest HP at that moment ({80 + 16% AD + 23% AP} magic damage), then disappears.",
            },
        },
    },
    vayne: {
        desc: "Keep Vayne in hand while the night builds, then call her out at the right moment and spend it all.",
        passive: {
            name: "Night Hunter",
            desc: "At the start of your turn, while Vayne is not on the board (not summoned or respawning): +2 Night (max 10). Each of Vayne's attacks spends 1 Night to deal {24 + 36% AD + 8% AP} extra true damage.",
        },
        skills: {
            Q: {
                name: "Tumble Into Darkness",
                desc: "Quick. Vayne is Stealthed until the end of the opponent's next turn and gains +2 Night.",
            },
            E: {
                name: "Spend Spree",
                desc: "Until the end of this turn: each of Vayne's attacks spends 2 Night and the extra true damage from Night is doubled.",
            },
            R: {
                name: "Final Hour",
                desc: "Vayne's next attack spends all Night: it deals {60 + 100% AD + 20% AP} extra true damage, plus {15 + 15% AD} true damage for each Night spent.",
            },
        },
    },
}

/** Trạng thái mới (hiện trên tướng) của nhóm G5V */
export const STATUS_V2_G5V: Record<string, { vi: { name: string; desc: string }; en: { name: string; desc: string } }> = {
    frost: {
        vi: {
            name: "Buốt", desc: "Dấu của Ashe (tối đa 10, không tự hết): sát thương tướng mang gây ra giảm 2.5% mỗi tầng (tối đa 25%). Ashe đánh được tướng có Buốt, bỏ qua đỡ đòn và khiêu khích, nhưng không chí mạng."
        },
        en: {
            name: "Frostbite", desc: "Ashe's mark (max 10, does not expire): the damage the bearer deals is reduced by 2.5% per stack (max 25%). Ashe can attack a Frostbitten champion ignoring Tanks and Taunt, but cannot crit."
        },
    },
    ashe_e: {
        vi: {
            name: "Tập Trung", desc: "Tới hết lượt: mỗi đòn đánh của Ashe gây thêm sát thương và gắn 2 Buốt."
        },
        en: {
            name: "Focus", desc: "Until end of turn: each of Ashe's attacks deals extra damage and applies 2 Frostbite."
        },
    },
    jinx_q: {
        vi: {
            name: "Đổi Súng", desc: "Đòn đánh kế của Jinx bị thay bằng một phát gây sát thương lên mục tiêu và 25% lượng đó lên mọi địch còn lại."
        },
        en: {
            name: "Switcheroo", desc: "Jinx's next attack is replaced by one shot that damages its target and deals 25% of that to every other enemy."
        },
    },
    kog_e: {
        vi: {
            name: "Xả Đạn", desc: "Tới hết lượt: phần % máu tối đa từ Đói trên mỗi đòn đánh của Kog'Maw nhân đôi."
        },
        en: {
            name: "Unload", desc: "Until end of turn: the max HP damage from Hunger on each of Kog'Maw's attacks is doubled."
        },
    },
    vayne_e: {
        vi: {
            name: "Lượt Xả", desc: "Tới hết lượt: mỗi đòn đánh của Vayne tiêu 2 Đêm, sát thương chuẩn thêm từ Đêm gấp đôi."
        },
        en: {
            name: "Spend Spree", desc: "Until end of turn: each of Vayne's attacks spends 2 Night and the extra true damage is doubled."
        },
    },
    vayne_r: {
        vi: {
            name: "Giờ Khắc Cuối Cùng", desc: "Đòn đánh kế tiếp của Vayne tiêu hết Đêm vào một phát."
        },
        en: {
            name: "Final Hour", desc: "Vayne's next attack spends all her Night in one shot."
        },
    },
}

/** Bộ đếm (stack) hiện trên tướng */
export const STACK_V2_G5V: Record<string, { vi: { name: string; desc: string }; en: { name: string; desc: string } }> = {
    evolve: {
        vi: {
            name: "Tiến Hoá", desc: "Mỗi nấc làm sát thương chiêu của Viktor tăng 8% (tối đa 10, không mất khi Viktor chết)."
        },
        en: {
            name: "Evolution", desc: "Each level makes Viktor's skills deal 8% more damage (max 10, kept when Viktor dies)."
        },
    },
    frenzy: {
        vi: {
            name: "Điên", desc: "Mỗi Điên làm đòn đánh của Jinx gây thêm sát thương vật lý (1 + 1% AD + 0.5% AP); tối đa 30. Jinx chết thì mất nửa."
        },
        en: {
            name: "Frenzy", desc: "Each Frenzy makes Jinx's attacks deal extra physical damage (1 + 1% AD + 0.5% AP); max 30. Lose half when Jinx dies."
        },
    },
    hunger: {
        vi: {
            name: "Đói", desc: "Mỗi Đói làm đòn đánh của Kog'Maw gây thêm 0.8% máu tối đa của mục tiêu (tối đa 20); Kog'Maw chết thì +3 Đói (không mất Đói)."
        },
        en: {
            name: "Hunger", desc: "Each Hunger makes Kog'Maw's attacks deal 0.8% of the target's max HP extra (max 20); +3 when Kog'Maw dies (he loses none)."
        },
    },
    night: {
        vi: {
            name: "Đêm", desc: "Tăng khi Vayne không trên sân (tối đa 10); mỗi đòn đánh của Vayne tiêu Đêm để gây thêm sát thương chuẩn."
        },
        en: {
            name: "Night", desc: "Grows while Vayne is off the board (max 10); each of Vayne's attacks spends Night for extra true damage."
        },
    },
}

/** Lá đặc biệt (thay cho "mushroom" cũ) */
export const SPECIAL_V2_G5V: Record<string, { vi: { name: string; desc: string }; en: { name: string; desc: string } }> = {
    mushroom: {
        vi: {
            name: "Nấm", desc: "Lá nằm trong bộ bài bạn. Rút trúng thì nổ: tướng máu thấp nhất của bạn nhận sát thương phép (theo Teemo), rồi bạn vẫn rút 1 lá như thường. Nấm không vào tay."
        },
        en: {
            name: "Mushroom", desc: "A card sitting in your deck. When drawn it explodes: your lowest-HP champion takes magic damage (from Teemo), then you still draw 1 card as normal. It never reaches your hand."
        },
    },
}

/** Từ khoá mới trong chữ Việt của nhóm G5V (id "mushroom" thay bản cũ, id "frost" cần đổi tên từ khoá chung "chill" cũ cũng là "Buốt") */
export const KEYWORDS_V2_G5V: Record<string, Keyword> = {
    evolve: {
        vi: "Tiến Hoá",
        en: "Evolution",
        descVi: "Bộ đếm vĩnh viễn của Viktor (tối đa 10, không mất khi Viktor chết); mỗi nấc làm sát thương chiêu của Viktor tăng 8%.",
        descEn: "Viktor's permanent counter (max 10, kept when Viktor dies); each level makes Viktor's skills deal 8% more damage.",
    },
    frost: {
        vi: "Buốt",
        en: "Frostbite",
        descVi: "Dấu của Ashe (tối đa 10, không tự hết); mỗi Buốt làm sát thương tướng mang gây ra giảm 2.5%. Ashe đánh được tướng có Buốt, bỏ qua đỡ đòn và khiêu khích, nhưng không chí mạng (xem Ashe).",
        descEn: "Ashe's mark (max 10, does not expire); each Frostbite reduces the damage the bearer deals by 2.5%. Ashe can attack a Frostbitten champion ignoring Tanks and Taunt, but cannot crit (see Ashe).",
    },
    frenzy: {
        vi: "Điên",
        en: "Frenzy",
        descVi: "Bộ đếm của Jinx (tối đa 30); mỗi Điên làm đòn đánh của Jinx gây thêm sát thương vật lý. Jinx chết thì mất nửa.",
        descEn: "Jinx's counter (max 30); each Frenzy makes Jinx's attacks deal extra physical damage. Lose half when Jinx dies.",
    },
    hunger: {
        vi: "Đói",
        en: "Hunger",
        descVi: "Bộ đếm của Kog'Maw (tối đa 20); mỗi Đói làm đòn đánh của Kog'Maw gây thêm 0.8% máu tối đa của mục tiêu. Kog'Maw chết thì +3 Đói (không mất Đói).",
        descEn: "Kog'Maw's counter (max 20); each Hunger makes his attacks deal 0.8% of the target's max HP extra. +3 when Kog'Maw dies (he loses none).",
    },
    mushroom: {
        vi: "Nấm",
        en: "Mushroom",
        descVi: "Lá đặc biệt Teemo xáo vào bộ bài đối thủ. Đối thủ rút trúng thì Nấm nổ lên tướng máu thấp nhất của họ rồi biến mất; họ vẫn rút 1 lá như thường.",
        descEn: "A special card Teemo shuffles into the opponent's deck. When the opponent draws it, it explodes on their lowest-HP champion and disappears; they still draw 1 card as normal.",
    },
    night: {
        vi: "Đêm",
        en: "Night",
        descVi: "Bộ đếm của Vayne (tối đa 10): tăng mỗi lượt của bạn khi Vayne không trên sân; mỗi đòn đánh của Vayne tiêu Đêm để gây thêm sát thương chuẩn.",
        descEn: "Vayne's counter (max 10): grows each of your turns while Vayne is off the board; each of her attacks spends Night for extra true damage.",
    },
}
