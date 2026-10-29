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
        desc: "The Machine Herald: trade spare cards for permanent power, then unleash one spell on the whole enemy team.",
        passive: {
            name: "Evolution",
            desc: "Evolution (permanent, max 10, kept when Viktor dies): each level makes Viktor's skills deal 15% more damage.",
        },
        skills: {
            Q: {
                name: "Power Up",
                desc: "Discard up to 3 cards from your hand; for each card discarded: Viktor gains +1 Evolution.",
            },
            E: {
                name: "Chaos Wave",
                desc: "Every enemy champion takes {70 + 60% AD + 50% AP} magic damage, increased by 15% per Evolution.",
            },
            R: {
                name: "Glorious Evolution",
                desc: "Double Viktor's Evolution (max 10).",
            },
        },
    },
    ashe: {
        desc: "Steady shots stack steady frost: Frostbite weakens the enemy, then the harvest freezes the whole team.",
        passive: {
            name: "Frost Shot",
            desc: "Ashe's attack hits a champion: it gains +1 Frostbite. Each Frostbite weakens the bearer's attacks by 8% and skills by 4%.",
        },
        skills: {
            Q: {
                name: "Ice Rain",
                desc: "Choose 1 enemy champion; it gains +3 Frostbite.",
            },
            E: {
                name: "Frost Volley",
                desc: "Until the end of this turn: each of Ashe's attacks deals {55% AD} extra physical damage and applies +2 Frostbite instead of +1.",
            },
            R: {
                name: "Enchanted Crystal Arrow",
                desc: "Needs an enemy champion with Frostbite. Every enemy champion with Frostbite is Stunned for 1 turn and takes {30 + 25% AD} physical damage per Frostbite; their Frostbite is removed.",
            },
        },
    },
    jinx: {
        desc: "The loose cannon: summon her when the enemy is already weak, and every kill makes her crazier.",
        passive: {
            name: "Get Excited",
            desc: "Jinx's attack hits an enemy champion below 50% HP: +1 Frenzy. Jinx takes down a champion: +10 Frenzy. Each Frenzy makes Jinx's attacks deal 3 extra physical damage (max 30 Frenzy).",
        },
        skills: {
            Q: {
                name: "Zap",
                desc: "Choose 1 enemy champion; deal {60 + 150% AD} physical damage.",
            },
            E: {
                name: "Flame Chompers",
                desc: "Quick. Set a trap: the next time the opponent summons or respawns a champion in the lane opposite Jinx, that champion is Stunned for 1 turn.",
            },
            R: {
                name: "Super Mega Death Rocket",
                desc: "Choose 1 enemy champion; if its HP is at or below the threshold (15% max HP + 1.5% per Frenzy, max 60%): Execute it. Otherwise deal {150 + 120% AD} physical damage.",
            },
        },
    },
    kogmaw: {
        desc: "The longer he lives, the hungrier he gets: shots scale with max HP, so the tankier the target the bigger the hole.",
        passive: {
            name: "Hunger",
            desc: "At the start of your turn, while Kog'Maw is alive: +1 Hunger. Any champion dies (either team): +1 Hunger. Kog'Maw's attacks deal 1.5% of the target's max HP per Hunger as extra magic damage (max 20 Hunger). When Kog'Maw dies: lose half his Hunger.",
        },
        skills: {
            Q: {
                name: "Feed",
                desc: "Kog'Maw gains +3 Hunger.",
            },
            E: {
                name: "Unload",
                desc: "Until the end of this turn: each of Kog'Maw's attacks deals double the max HP damage from Hunger.",
            },
            R: {
                name: "Living Artillery",
                desc: "Every enemy champion takes magic damage equal to 3.5% of its max HP per Hunger of Kog'Maw.",
            },
        },
    },
    teemo: {
        desc: "No kill needed: plant Mushrooms in the enemy deck, and whoever draws one blows up their weakest champion.",
        passive: {
            name: "Toxic Mushrooms",
            desc: "Each of Teemo's attacks shuffles 1 Mushroom into the opponent's deck. When the opponent draws a Mushroom: their lowest-HP champion takes {70 + 45% AD} magic damage (instead of the card).",
        },
        skills: {
            Q: {
                name: "Sow Mushrooms",
                desc: "Shuffle 3 Mushrooms into the opponent's deck.",
            },
            E: {
                name: "Poison Dart",
                desc: "Choose 1 enemy champion (including the extra slot); deal {30 + 55% AD} magic damage, plus 20 for each Mushroom in the opponent's deck (the Mushrooms stay).",
            },
            R: {
                name: "Mass Mushrooms",
                desc: "Every enemy champion takes {18 + 12% AD} magic damage for each Mushroom in the opponent's deck (the Mushrooms stay).",
            },
        },
    },
    vayne: {
        desc: "Keep Vayne in hand while the night builds, then call her out at the right moment and spend it all.",
        passive: {
            name: "Night Hunter",
            desc: "At the start of your turn, while Vayne is not on the board (not summoned or respawning): +2 Night (max 10). Each of Vayne's attacks spends 1 Night to deal {12 + 18% AD} extra true damage.",
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
                desc: "Vayne's next attack spends all Night in one shot: each Night deals {12 + 18% AD} extra true damage multiplied by 2.5.",
            },
        },
    },
}

/** Trạng thái mới (hiện trên tướng) của nhóm G5V */
export const STATUS_V2_G5V: Record<string, { vi: { name: string; desc: string }; en: { name: string; desc: string } }> = {
    frost: {
        vi: {
            name: "Buốt", desc: "Dấu của Ashe (tối đa 10, hết sau 2 lượt của tướng mang kể từ lần cộng cuối): mỗi Buốt làm đòn đánh yếu đi 8% và chiêu yếu đi 4%."
        },
        en: {
            name: "Frostbite", desc: "Ashe's mark (max 10, expires 2 of its bearer's turns after the last one added): each Frostbite weakens its attacks by 8% and skills by 4%."
        },
    },
    ashe_e: {
        vi: {
            name: "Tiễn Băng Giá", desc: "Tới hết lượt: mỗi đòn đánh của Ashe gây thêm sát thương và gắn 2 Buốt."
        },
        en: {
            name: "Frost Volley", desc: "Until end of turn: each of Ashe's attacks deals extra damage and applies 2 Frostbite."
        },
    },
    jinx_trap: {
        vi: {
            name: "Bẫy Mìn", desc: "Tướng địch được gọi hoặc hồi sinh vào đường đối diện Jinx sẽ bị Choáng 1 lượt (dùng một lần)."
        },
        en: {
            name: "Flame Chompers", desc: "An enemy champion summoned or respawned in the lane opposite Jinx is Stunned for 1 turn (one use)."
        },
    },
    kog_e: {
        vi: {
            name: "Xả Đạn", desc: "Tới hết lượt: đòn đánh của Kog'Maw gây gấp đôi % máu tối đa từ Đói."
        },
        en: {
            name: "Unload", desc: "Until end of turn: Kog'Maw's attacks deal double the max HP damage from Hunger."
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
            name: "Tiến Hoá", desc: "Mỗi nấc làm sát thương chiêu của Viktor tăng 15% (tối đa 10, không mất khi Viktor chết)."
        },
        en: {
            name: "Evolution", desc: "Each level makes Viktor's skills deal 15% more damage (max 10, kept when Viktor dies)."
        },
    },
    frenzy: {
        vi: {
            name: "Điên", desc: "Mỗi Điên làm đòn đánh của Jinx gây thêm 3 sát thương vật lý (tối đa 30); Điên cũng nâng ngưỡng hạ gục của R."
        },
        en: {
            name: "Frenzy", desc: "Each Frenzy makes Jinx's attacks deal 3 extra physical damage (max 30); Frenzy also raises the threshold of her R."
        },
    },
    hunger: {
        vi: {
            name: "Đói", desc: "Mỗi Đói làm đòn đánh của Kog'Maw gây thêm 1.5% máu tối đa của mục tiêu (tối đa 20); Kog'Maw chết thì mất nửa."
        },
        en: {
            name: "Hunger", desc: "Each Hunger makes Kog'Maw's attacks deal 1.5% of the target's max HP extra (max 20); lose half when Kog'Maw dies."
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
            name: "Nấm", desc: "Lá nằm trong bộ bài bạn. Rút trúng thì nổ: tướng máu thấp nhất của bạn nhận sát thương phép (theo Teemo). Nấm chiếm chỗ lá rút đó rồi biến mất."
        },
        en: {
            name: "Mushroom", desc: "A card sitting in your deck. When drawn it explodes: your lowest-HP champion takes magic damage (from Teemo). It takes the place of the drawn card, then disappears."
        },
    },
}

/** Từ khoá mới trong chữ Việt của nhóm G5V (id "mushroom" thay bản cũ, id "frost" cần đổi tên từ khoá chung "chill" cũ cũng là "Buốt") */
export const KEYWORDS_V2_G5V: Record<string, Keyword> = {
    evolve: {
        vi: "Tiến Hoá",
        en: "Evolution",
        descVi: "Bộ đếm vĩnh viễn của Viktor (tối đa 10, không mất khi Viktor chết); mỗi nấc làm sát thương chiêu của Viktor tăng 15%.",
        descEn: "Viktor's permanent counter (max 10, kept when Viktor dies); each level makes Viktor's skills deal 15% more damage.",
    },
    frost: {
        vi: "Buốt",
        en: "Frostbite",
        descVi: "Dấu của Ashe (tối đa 10, hết sau 2 lượt của tướng mang kể từ lần cộng cuối); mỗi Buốt làm đòn đánh của tướng mang yếu đi 8% và chiêu yếu đi 4% (xem Ashe).",
        descEn: "Ashe's mark (max 10, expires 2 of its bearer's turns after the last one added); each Frostbite weakens its attacks by 8% and skills by 4% (see Ashe).",
    },
    frenzy: {
        vi: "Điên",
        en: "Frenzy",
        descVi: "Bộ đếm của Jinx (tối đa 30); mỗi Điên làm đòn đánh của Jinx gây thêm 3 sát thương vật lý và nâng ngưỡng hạ gục của R.",
        descEn: "Jinx's counter (max 30); each Frenzy makes Jinx's attacks deal 3 extra physical damage and raises the threshold of her R.",
    },
    hunger: {
        vi: "Đói",
        en: "Hunger",
        descVi: "Bộ đếm của Kog'Maw (tối đa 20); mỗi Đói làm đòn đánh của Kog'Maw gây thêm 1.5% máu tối đa của mục tiêu. Kog'Maw chết thì mất nửa.",
        descEn: "Kog'Maw's counter (max 20); each Hunger makes his attacks deal 1.5% of the target's max HP extra. Lose half when Kog'Maw dies.",
    },
    mushroom: {
        vi: "Nấm",
        en: "Mushroom",
        descVi: "Lá đặc biệt Teemo xáo vào bộ bài đối thủ. Đối thủ rút trúng thì Nấm nổ lên tướng máu thấp nhất của họ (thay cho lá rút) rồi biến mất.",
        descEn: "A special card Teemo shuffles into the opponent's deck. When the opponent draws it, it explodes on their lowest-HP champion (instead of the card) and disappears.",
    },
    night: {
        vi: "Đêm",
        en: "Night",
        descVi: "Bộ đếm của Vayne (tối đa 10): tăng mỗi lượt của bạn khi Vayne không trên sân; mỗi đòn đánh của Vayne tiêu Đêm để gây thêm sát thương chuẩn.",
        descEn: "Vayne's counter (max 10): grows each of your turns while Vayne is off the board; each of her attacks spends Night for extra true damage.",
    },
}
