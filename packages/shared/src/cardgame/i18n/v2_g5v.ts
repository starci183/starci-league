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
        desc: "The Machine Herald: trade spare cards for Shields and uncapped permanent Evolution, then unleash spells on the whole enemy team.",
        passive: {
            name: "Evolution",
            desc: "Each Evolution makes Viktor's original skill damage 8% higher: multiplier 1 + 0.08 × stacks, uncapped and kept through death. Does not multiply item procs, reflection or basic attacks.",
        },
        skills: {
            Q: {
                name: "Disassemble",
                desc: "Choose to discard up to 3 other cards in your hand, temporary cards included (you may discard none). Each card actually discarded grants 1 Evolution and a {35 + 15% AD + 20% AP} white Shield. If cancelled, nothing is discarded and nothing is gained; the resolving card cannot discard itself.",
            },
            E: {
                name: "Death Ray",
                desc: "Every valid enemy champion takes {85 + 35% AD + 45% AP} × (1 + 0.08 × Evolution) magic damage. Needs no Q first, no attack permission, and does not hit summons.",
            },
            R: {
                name: "Gravity Field",
                desc: "Every valid enemy champion takes {95 + 30% AD + 45% AP} × (1 + 0.08 × Evolution before R) magic damage. Then the surviving enemy champion with the most current HP gets one Stun try for d = 0.9 + 0.001 AD + 0.002 AP units, and Viktor gains 2 Evolution. A blocked crowd control does not move to someone else.",
            },
        },
    },
    ashe: {
        desc: "Steady shots stack steady frost: Frostbite weakens the enemy, Ashe reaches the back row, and one arrow freezes a target.",
        passive: {
            name: "Frost Shot",
            desc: "Each real attack hit on an enemy champion applies 1 Frostbite; unlimited, never expires on its own, and is lost when the bearer dies. While Ashe is on the board, all damage the bearer deals is multiplied by 1 / (1 + Frostbite / 30). Attacks on a champion that already has Frostbite ignore Tank/Taunt forced targeting, but it must be targetable and these attacks cannot crit.",
        },
        skills: {
            Q: {
                name: "Frost Arrow",
                desc: "Choose 1 valid enemy champion; deal {55 + 200% AD + 25% AP} physical damage and apply 3 Frostbite.",
            },
            E: {
                name: "Focus",
                desc: "Until the end of the current turn, each of Ashe's real attack hits deals {40 + 110% AD + 15% AP} extra physical damage and applies 2 Frostbite instead of 1; grants no attacks.",
            },
            R: {
                name: "Great Ice Arrow",
                desc: "Choose 1 valid enemy champion; deal {110 + 180% AD + 35% AP} physical damage, apply 5 Frostbite and Stun it for d = {0.7 + 0.5% AD + 0.5% AP} units. The whole part is guaranteed; the fraction is the chance of 1 extra unit.",
            },
        },
    },
    jinx: {
        desc: "The loose cannon: attack the wounded to go wilder, and one Switcheroo shot stacks Frenzy across the whole team.",
        passive: {
            name: "Get Excited",
            desc: "A real attack hit on an enemy champion whose HP before the hit is below 75%/25% grants 1/2 Frenzy; Jinx truly taking down an enemy champion grants 10 more Frenzy. Frenzy is unlimited and kept through death. Each real attack hit deals Frenzy × ({2 + 3% AD + 0.8% AP}) extra physical damage, which does not crit on its own.",
        },
        skills: {
            Q: {
                name: "Switcheroo",
                desc: "Load the next attack: its main shot is replaced by {45 + 215% AD + 20% AP} + 2 × Frenzy physical damage, and the passive's Frenzy damage is still added. If the main shot lands, every other enemy champion takes 25% of the replacement amount before crit; each one truly hit at low enough HP also grants Frenzy. Does not attack by itself.",
            },
            E: {
                name: "Flame Chompers",
                desc: "Quick, Chain Only. May respond only when the top enemy chain link is an attack targeting Jinx; she takes 20% less damage from all sources until the end of the opponent's turn and draws 1 of her Q cards from the deck to hand, creating one only if none is left. If the hand is full, the extra card is burned.",
            },
            R: {
                name: "Rocket",
                desc: "Choose 1 valid enemy champion; deal {100 + 160% AD + 20% AP} + 5 × Frenzy + 20% of the target's missing HP physical damage.",
            },
        },
    },
    kogmaw: {
        desc: "The longer he lives, the hungrier he gets: shots scale with max HP, so the tankier the target the bigger the hole.",
        passive: {
            name: "Hunger",
            desc: "At the start of your turn, if Kog is alive on the board: +1 Hunger. Each other real champion that dies while Kog is present: +1 Hunger; Kog himself truly dying: +3 Hunger instead of +1. Hunger is unlimited and kept through death. Each real attack hit deals 0.8% of the target's max HP × Hunger + {15 + 30% AD + 25% AP} extra magic damage, which cannot crit.",
        },
        skills: {
            Q: {
                name: "Acid Splash",
                desc: "Choose 1 valid enemy champion; deal {70 + 155% AD + 45% AP} magic damage, then gain 3 Hunger. A card that resolves validly still grants Hunger if the damage is blocked by a Shield or immunity; a negated card or one that loses its target grants none.",
            },
            E: {
                name: "Unload",
                desc: "Until the end of the current turn, only the 0.8% max HP × Hunger part of each real attack hit is doubled; the {15 + 30% AD + 25% AP} part is unchanged. Spends no Hunger and grants no attacks.",
            },
            R: {
                name: "Living Artillery",
                desc: "Every enemy champion on the board takes 1.5% of its own max HP × Hunger + {35 + 50% AD + 50% AP} magic damage. Hunger is snapshotted once when the card starts; it is not spent, and takedowns earned during this R do not boost its remaining hits.",
            },
        },
    },
    teemo: {
        desc: "No kill needed: plant Mushrooms in the enemy deck, and whoever draws one blows up their weakest champion; whoever attacks Teemo goes blind.",
        passive: {
            name: "Toxic Mushrooms",
            desc: "Each real attack hit by Teemo on an enemy champion plants 1 Mushroom in the enemy deck, with no cap and kept through death. Drawing a Mushroom spends that card and deals {100 + 40% AD + 35% AP} magic damage to the living champion with the lowest HP ratio, then draws 1 replacement card; Mushrooms never go to hand.",
        },
        skills: {
            Q: {
                name: "Plant Mushrooms",
                desc: "Shuffle 3 of Teemo's Mushrooms into the opponent's deck; needs no existing Mushrooms or attack right.",
            },
            E: {
                name: "Blinding Dart",
                desc: "Quick. Played actively, choose any valid enemy champion in any lane; when an enemy attacks Teemo, as a response it may only answer the top enemy attack targeting Teemo and locks onto the attacker. Deal {70 + 45% AD + 40% AP} + current Mushroom count × ({15 + 10% AD + 10% AP}) magic damage; Blind makes that champion's next real attack miss, then is spent.",
            },
            R: {
                name: "Detonate",
                desc: "Choose a whole number N of Mushrooms, from 1 up to the whole current stock, to spend; the rest stay. If the stock is empty on resolution, first plant 3 Mushrooms, then use the chosen N within 1–3. Each Mushroom deals {100 + 40% AD + 35% AP} magic damage to the living champion with the lowest HP ratio at that moment; one card costs 35 mana whatever N is.",
            },
        },
    },
    vayne: {
        desc: "Night hunter: hold your fire on the board to build Night, then pour the whole store into one shot.",
        passive: {
            name: "Night Hunter",
            desc: "At the end of your turn, if Vayne is alive on the board and has not voluntarily declared an attack or a damaging skill this turn (even one later cancelled), she gains 2 Night. Night is uncapped and kept through death. Each real normal attack that hits spends up to 1 Night to deal {25 + 60% AD + 8% AP} extra true damage, which does not crit on its own; each real hit from attack speed spends its own Night if any is left.",
        },
        skills: {
            Q: {
                name: "Tumble Into Darkness",
                desc: "Choose another valid ally and really swap with it. Only on success is Vayne Stealthed until the end of the opponent's next turn and gains 2 Night. Q deals no damage, so it does not cost the passive's resting reward.",
            },
            E: {
                name: "Silver Bolt",
                desc: "Lock the enemy champion opposite; only if it is still opposite and targetable on resolution, fire {40 + 120% AD + 20% AP} physical damage. Spend up to 2 Night, each adding 1.5 × {25 + 60% AD + 8% AP} true damage (no crit). With no Night the base still fires; it is a skill, needs no attack card/permission and does not trigger on-attack passives.",
            },
            R: {
                name: "Final Hour",
                desc: "Lock the enemy champion opposite; only if it is still opposite and targetable on resolution, fire {60 + 165% AD + 20% AP} physical damage and spend all Night, each adding {30 + 75% AD + 10% AP} true damage (no crit). With an empty store the base still fires; needs no attack card/permission and does not trigger on-attack passives.",
            },
        },
    },
}

/** Trạng thái mới (hiện trên tướng) của nhóm G5V */
export const STATUS_V2_G5V: Record<string, { vi: { name: string; desc: string }; en: { name: string; desc: string } }> = {
    frost: {
        vi: {
            name: "Buốt", desc: "Dấu của Ashe (vô hạn, không tự hết, mất khi tướng mang chết): khi Ashe còn trên bàn, sát thương tướng mang gây ra nhân 1 / (1 + Buốt / 30). Ashe đánh được tướng chọn được có Buốt, bỏ qua đỡ đòn và khiêu khích, nhưng không chí mạng."
        },
        en: {
            name: "Frostbite", desc: "Ashe's mark (unlimited, does not expire, lost when the bearer dies): while Ashe is on the board, the damage the bearer deals is multiplied by 1 / (1 + Frostbite / 30). Ashe can attack a targetable Frostbitten champion ignoring Tanks and Taunt, but cannot crit."
        },
    },
    ashe_e: {
        vi: {
            name: "Tập Trung", desc: "Tới hết lượt: mỗi đòn thật trúng của Ashe gây thêm sát thương (không chí mạng) và gắn 2 Buốt."
        },
        en: {
            name: "Focus", desc: "Until end of turn: each of Ashe's real attack hits deals extra damage (no crit) and applies 2 Frostbite."
        },
    },
    jinx_q: {
        vi: {
            name: "Đổi Súng", desc: "Phát chính của đòn đánh kế của Jinx bị thay bằng một phát mạnh hơn; nếu trúng, 25% lượng đó lan lên mọi tướng địch còn lại. Giữ tới khi dùng."
        },
        en: {
            name: "Switcheroo", desc: "The main shot of Jinx's next attack is replaced by a stronger one; if it lands, 25% of that splashes onto every other enemy champion. Kept until used."
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
            name: "Tiến Hoá", desc: "Mỗi nấc làm sát thương chiêu gốc của Viktor tăng 8% (không trần, không mất khi Viktor chết)."
        },
        en: {
            name: "Evolution", desc: "Each level makes Viktor's original skills deal 8% more damage (uncapped, kept when Viktor dies)."
        },
    },
    frenzy: {
        vi: {
            name: "Điên", desc: "Mỗi Điên làm đòn thật của Jinx gây thêm sát thương vật lý (1 + 1% AD + 0.5% AP), không chí mạng. Vô hạn, giữ qua chết."
        },
        en: {
            name: "Frenzy", desc: "Each Frenzy makes Jinx's real attack hits deal extra physical damage (1 + 1% AD + 0.5% AP), which does not crit. Unlimited, kept through death."
        },
    },
    hunger: {
        vi: {
            name: "Đói", desc: "Mỗi Đói làm đòn thật của Kog'Maw gây thêm 0.8% máu tối đa của mục tiêu (không chí mạng). Vô hạn, giữ qua chết; Kog'Maw chết thật thì +3 Đói."
        },
        en: {
            name: "Hunger", desc: "Each Hunger makes Kog'Maw's real attack hits deal 0.8% of the target's max HP extra (no crit). Unlimited, kept through death; +3 when Kog'Maw truly dies."
        },
    },
    night: {
        vi: {
            name: "Đêm", desc: "Không trần, giữ qua khi chết. +2 khi Vayne nhịn trọn lượt trên bàn hoặc Q swap thành công; đòn đánh tiêu 1, E tiêu tối đa 2, R tiêu hết để gây thêm sát thương chuẩn."
        },
        en: {
            name: "Night", desc: "Uncapped, kept through death. +2 when Vayne rests a full turn on the board or Q swaps successfully; attacks spend 1, E up to 2, R all of it for extra true damage."
        },
    },
}

/** Lá đặc biệt (thay cho "mushroom" cũ) */
export const SPECIAL_V2_G5V: Record<string, { vi: { name: string; desc: string }; en: { name: string; desc: string } }> = {
    mushroom: {
        vi: {
            name: "Nấm", desc: "Lá nằm trong bộ bài bạn. Rút trúng thì nổ: tướng sống có tỉ lệ Máu thấp nhất của bạn nhận sát thương phép (theo Teemo), rồi bạn rút bù 1 lá. Nấm không vào tay."
        },
        en: {
            name: "Mushroom", desc: "A card sitting in your deck. When drawn it explodes: your living champion with the lowest HP ratio takes magic damage (from Teemo), then you draw 1 replacement card. It never reaches your hand."
        },
    },
}

/** Từ khoá mới trong chữ Việt của nhóm G5V (id "mushroom" thay bản cũ, id "frost" cần đổi tên từ khoá chung "chill" cũ cũng là "Buốt") */
export const KEYWORDS_V2_G5V: Record<string, Keyword> = {
    evolve: {
        vi: "Tiến Hoá",
        en: "Evolution",
        descVi: "Bộ đếm vĩnh viễn của Viktor (không trần, không mất khi Viktor chết); mỗi nấc làm sát thương chiêu gốc của Viktor tăng 8%.",
        descEn: "Viktor's permanent counter (uncapped, kept when Viktor dies); each level makes Viktor's original skills deal 8% more damage.",
    },
    frost: {
        vi: "Buốt",
        en: "Frostbite",
        descVi: "Dấu của Ashe (vô hạn, không tự hết, mất khi tướng mang chết); khi Ashe còn trên bàn, sát thương tướng mang gây ra nhân 1 / (1 + Buốt / 30). Ashe đánh được tướng chọn được có Buốt, bỏ qua đỡ đòn và khiêu khích, nhưng không chí mạng (xem Ashe).",
        descEn: "Ashe's mark (unlimited, does not expire, lost when the bearer dies); while Ashe is on the board, the damage the bearer deals is multiplied by 1 / (1 + Frostbite / 30). Ashe can attack a targetable Frostbitten champion ignoring Tanks and Taunt, but cannot crit (see Ashe).",
    },
    frenzy: {
        vi: "Điên",
        en: "Frenzy",
        descVi: "Bộ đếm của Jinx (vô hạn, giữ qua chết); mỗi Điên làm đòn thật của Jinx gây thêm sát thương vật lý, không chí mạng.",
        descEn: "Jinx's counter (unlimited, kept through death); each Frenzy makes Jinx's real attack hits deal extra physical damage, which does not crit.",
    },
    hunger: {
        vi: "Đói",
        en: "Hunger",
        descVi: "Bộ đếm của Kog'Maw (vô hạn, giữ qua chết); mỗi Đói làm đòn thật của Kog'Maw gây thêm 0.8% máu tối đa của mục tiêu. Kog'Maw chết thật thì +3 Đói.",
        descEn: "Kog'Maw's counter (unlimited, kept through death); each Hunger makes his real attack hits deal 0.8% of the target's max HP extra. +3 when Kog'Maw truly dies.",
    },
    mushroom: {
        vi: "Nấm",
        en: "Mushroom",
        descVi: "Lá đặc biệt Teemo xáo vào bộ bài đối thủ (không trần). Đối thủ rút trúng thì Nấm nổ lên tướng sống có tỉ lệ Máu thấp nhất của họ rồi biến mất; họ rút bù 1 lá.",
        descEn: "A special card Teemo shuffles into the opponent's deck (no cap). When the opponent draws it, it explodes on their living champion with the lowest HP ratio and disappears; they draw 1 replacement card.",
    },
    night: {
        vi: "Đêm",
        en: "Night",
        descVi: "Bộ đếm của Vayne (không trần, giữ qua khi chết): +2 khi Vayne còn trên bàn mà nhịn đòn đánh/chiêu gây sát thương trọn lượt, hoặc khi Q swap thành công; đòn đánh, E và R tiêu Đêm để gây thêm sát thương chuẩn.",
        descEn: "Vayne's counter (uncapped, kept through death): +2 when Vayne stays on the board without declaring an attack or damaging skill for a whole turn, or when Q swaps successfully; attacks, E and R spend Night for extra true damage.",
    },
}
