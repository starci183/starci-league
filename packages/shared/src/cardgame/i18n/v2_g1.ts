// Chữ V2 cho 6 tướng nhóm G1: Darius, Garen, Aatrox, Gangplank, Yorick, Ornn.
// Tích hợp (integrator): gộp HERO_EN_V2_G1 vào HERO_EN, STATUS_V2_G1 / STACK_V2_G1 / SPECIAL_V2_G1 vào bảng status/stack/lá đặc biệt của
// i18n_en.ts + client, KEYWORDS_V2_G1 vào keywords/index.ts (ghi đè các id cũ cùng tên: bleed, keg, powder, keg_detonate; bỏ các id
// cũ không còn dùng: darius_block, execute, garen_lead, aatrox_r, soul, mist_walker, item_amp/forge của Ornn cũ).
// Công thức {…} trong EN phải khớp từng chữ với bản Việt trong heroes/*.ts (checkTranslations).
import type {
    HeroTextEn
} from "../i18n_en"
import type {
    Keyword
} from "../keywords/types"

export const HERO_EN_V2_G1: Record<string, HeroTextEn> = {
    darius: {
        desc: "Noxian executioner: every attack stacks Bleed, grind one target down until the Guillotine cashes in every stack as true damage.",
        passive: {
            name: "Hemorrhage",
            desc: "Each real hit on an enemy champion adds 1 Bleed, stacking without limit and refreshing the target's 2-turn duration. At the start of each enemy turn, the target takes physical damage equal to stacks × {3 + 7% AD} of Darius.",
        },
        skills: {
            Q: {
                name: "Decimate",
                desc: "Deal {30 + 145% AD + 20% AP} physical damage to the enemy champion opposite; if it is still valid, add 2 Bleed. Then Darius heals stacks currently on the target × {6 + 10% AD + 2% AP}.",
            },
            E: {
                name: "Apprehend",
                desc: "Choose an enemy champion; if it is in another lane, swap it with the enemy champion holding the slot opposite Darius (even a dead one). Once validly opposite, add 1 Bleed then deal {10 + 95% AD + 15% AP} physical damage; choosing the champion already opposite applies at once.",
            },
            R: {
                name: "Noxian Guillotine",
                desc: "Choose an enemy champion with Bleed; if it is in another lane, Darius swaps with the ally holding the slot opposite it (even a dead one). Once validly opposite, consume all stacks and deal true damage equal to stacks × {10 + 30% AD + 5% AP}. If this R action itself truly kills the target, this card returns to your hand; no mana refund.",
            },
        },
    },

    garen: {
        desc: "Duel: whoever stands in front of Garen piles Guilt on themselves with every attack; Garen cuts into the Guilt and the Verdict hits harder with every stack.",
        passive: {
            name: "Justice",
            desc: "Each time the enemy champion opposite makes a real basic attack, even a miss or at anyone, it gains 1 Guilt; stacks without limit and refreshes its 3 turns. Garen's attacks on a valid target deal bonus physical damage equal to Guilt × {8% AD + 2% AP}, which cannot crit.",
        },
        skills: {
            Q: {
                name: "Decisive Strike",
                desc: "Deal {20 + 125% AD + 15% AP} + target Guilt × {20% AD + 3% AP} physical damage to the enemy champion opposite. Garen heals 30% of the HP and Shield Q actually removed; Guilt is not consumed and overkill does not heal.",
            },
            E: {
                name: "Judgment",
                desc: "Deal {20 + 140% AD + 20% AP} physical damage to the enemy champion opposite, then add 3 Guilt if the target is still valid; this is a skill card, not three basic attacks.",
            },
            R: {
                name: "Demacian Justice",
                desc: "Deal {80 + 100% AD + 20% AP} + 15 per Guilt true damage to the enemy champion opposite; all Guilt stays.",
            },
        },
    },

    aatrox: {
        desc: "The World Ender: pay HP for damage, the emptier his health bar the harder he hits, heals back off every hit, and R transforms him into a demon who survives one death.",
        passive: {
            name: "Blood Price",
            desc: "Before each real hit, that hit deals an extra 10% of missing HP + {7% AD + 2% AP} physical damage; the bonus cannot crit.",
        },
        skills: {
            Q: {
                name: "The Darkin Blade",
                desc: "Choose the enemy champion opposite; pay up to 25% max HP while keeping at least 1 HP, then deal physical damage equal to 100% of the HP actually paid + {90% AD + 10% AP}.",
            },
            E: {
                name: "Blood Rite",
                desc: "Until the end of the current turn, Aatrox heals for 100% of the HP and Shield actually removed from enemies by his own basic attacks and passive; overkill, reflection and item procs do not count.",
            },
            R: {
                name: "World Ender",
                desc: "Transform for 2 of Aatrox's turns: +30% AD and +30% max HP, gaining that HP at once; healing received +50%. Each enemy champion Aatrox himself truly kills extends it by 1 turn. When about to die, he is saved on the spot once with 30% of pre-transform max HP + {75% AD} of pre-transform AD, then the form ends.",
            },
        },
    },

    gangplank: {
        desc: "A sturdy lane fighter who eats oranges to sustain and plants powder kegs that blow up an enemy champion. Real Kegs grow every turn; fake Kegs (any card face-down) make the enemy guess which one to break.",
        passive: {
            name: "Bilgewater Gunpowder",
            desc: "At the start of your turn, a real Keg gains 1 Powder without limit. A valid hit on your own Keg consumes one real Keg and blasts a random valid enemy champion for Powder × {55 + 120% AD + 10% AP} physical damage. An enemy breaking a real Keg destroys it without a blast; breaking a fake one heals Gangplank depending on the card.",
        },
        skills: {
            Q: {
                name: "Eat Orange",
                desc: "Gangplank heals himself {100 + 85% AD + 15% AP} HP. If placed as a fake Keg, an enemy breaking the Orange heals 160% of this amount; eating the fake Orange yourself heals 40%. An enemy breaking another fake card heals 30%; breaking it yourself heals nothing.",
            },
            E: {
                name: "Plant Keg",
                desc: "When you can cast skills and the shared extra slot is empty, place E face-down as a real or fake Keg, or place another card as a fake through the same hidden wrapper, all costing 15 mana. A real Keg starts with 1 Powder; placing neither spends nor grants attacks.",
            },
            R: {
                name: "Cannon Barrage",
                desc: "Bilgewater Resupply: create 1 Q Orange card and 1 E Keg card of Gangplank in your hand; these cards still cost mana and follow their normal conditions when played later.",
            },
        },
    },
    yorick: {
        desc: "Shepherd of Souls: attacks to fill the graveyard, not to kill; the thicker the graveyard, the scarier the Maiden of the Mist (walking beside Yorick) and the tankier Yorick.",
        passive: {
            name: "Gravedigger",
            desc: "Before each granted attack, its main damage multiplier is 50% + 2% per card currently in your graveyard, uncapped; mill 1 card then draw 1, at most 2 draws per running turn, even on a miss. Each new highest graveyard milestone of 20, 40, 60... grants one pending right to fetch the real R from the deck, otherwise from the graveyard.",
        },
        skills: {
            Q: {
                name: "Burial",
                desc: "Discard 1 other card from your hand, draw 1 card, then Yorick heals {30 + 35% AD + 4% AP} HP; requires another card to pay.",
            },
            E: {
                name: "Exhume",
                desc: "Mill up to 3 cards from the top of your deck; choose 1 of the just-milled cards still actually in the graveyard and move it to your hand, no copy. Requires at least 1 card in deck.",
            },
            R: {
                name: "Maiden of the Mist",
                desc: "The Maiden strikes 1 random valid enemy champion and heals Yorick at once, then Yorick gains 1 permanent Mist stack until real death. Each stack strikes/heals once at the start of your turn, then mills 1 card. With n = floor(graveyard/5), each strike deals 1.5% × n of the target's max HP + {5% max HP + 30% Armor} of Yorick physical damage; Yorick heals 1% × n of Yorick's max HP + {15% Armor}. Damage taken is multiplied by 1/[1 + stacks × (0.15 + 0.001 × Armor)].",
            },
        },
    },

    ornn: {
        desc: "The Forge God: the longer your team wears items the stronger they get, Ornn shields allies by punishing attackers, and R forges complete items mid-fight.",
        passive: {
            name: "Living Forge",
            desc: "While Ornn is alive on the board, base item stats of the whole team, except HP and adaptive, are multiplied by 1 + ({12% + 2% per 100 AD + 2% per 100 AP} + 1% per item age), using Ornn's reference AD/AP. Each time the owner's Draw starts while wearing it on the board, the item ages by 1; uncapped, kept through unequip/equip/death, and a craft transfers the total age of its sources.",
        },
        skills: {
            Q: {
                name: "Volcanic Rupture",
                desc: "Choose a valid enemy champion at range; deal {55 + 6% max HP + 50% Armor + 20% AP} magic damage and reduce its real Armor by 20 until the end of the next enemy turn. The reduction does not stack from the same source, recasting refreshes it; it remains if Ornn dies.",
            },
            E: {
                name: "Ram Charge",
                desc: "When an enemy single basic attacks one of your champions, you may play this card: lock onto the attacker, deal {20 + 4% max HP + 30% Armor} + 10 per item worn by the attacked champion magic damage and Stun it for 1 + 0.2% AP units. A successful Stun interrupts the original attack; a blocked Stun does not cancel it.",
            },
            R: {
                name: "Call of the Forge God",
                desc: "Choose another valid ally; Ornn and that ally each receive 1 random completed item from the 36-item v4 pool. Two independent rolls. Equipped at once if a slot is free, otherwise to hand, burned if the hand is full; never converted to gold or a chosen item.",
            },
        },
    },

}

type Txt = { name: string; desc: string }
type Bi = { vi: Txt; en: Txt }

/** Trạng thái mới/đổi của nhóm G1 (khoá = id status) */
export const STATUS_V2_G1: Record<string, Bi> = {
    bleed: {
        vi: {
            name: "Chảy Máu", desc: "Dấu của Darius (không giới hạn, hết sau 2 lượt của tướng mang kể từ lần cộng cuối). Gây sát thương đầu lượt của tướng mang; Máy Chém Noxus gây sát thương chuẩn theo số dấu."
        },
        en: {
            name: "Bleed", desc: "Darius's mark (no cap, expires 2 of its turns after the last one added). Deals damage at the start of its turn; Noxian Guillotine deals true damage per mark."
        },
    },
    guilt: {
        vi: {
            name: "Tội", desc: "Dấu của Garen (không giới hạn, hết sau 3 lượt của tướng mang kể từ lần cộng cuối). Đòn đánh và chiêu của Garen dùng Tội của mục tiêu."
        },
        en: {
            name: "Guilt", desc: "Garen's mark (no cap, expires 3 of its turns after the last one added). Garen's attacks and skills use the target's Guilt."
        },
    },
    aatrox_e: {
        vi: {
            name: "Hút Máu Xiềng Xích", desc: "Tới hết lượt hiện tại: Aatrox hồi bằng 100% Máu và Khiên thực bị đòn thường và nội tại của mình lấy đi từ địch (không tính overkill)."
        },
        en: {
            name: "Infernal Chains", desc: "Until the end of the current turn: Aatrox heals for 100% of the HP and Shield his own attacks and passive actually remove from enemies (no overkill)."
        },
    },
    yorick_mist: {
        vi: {
            name: "Ma Sương", desc: "Thiếu Nữ Sương Mù đi cạnh Yorick (vĩnh viễn, cộng dồn, mất khi Yorick chết thật). Mỗi tầng: Yorick nhận ít sát thương hơn; đầu lượt Thiếu Nữ đánh 1 địch ngẫu nhiên, Yorick hồi máu, Thiếu Nữ đào 1 lá vào mộ."
        },
        en: {
            name: "Mist Walker", desc: "The Maiden of the Mist walks beside Yorick (permanent, stacks, lost when Yorick dies). Per stack: Yorick takes less damage; at the start of your turn the Maiden strikes 1 random enemy, Yorick heals, and the Maiden digs 1 card into the graveyard."
        },
    },
    ornn_shred: {
        vi: {
            name: "Giảm Giáp", desc: "Ornn đã Giảm Giáp của tướng này 20 tới hết lượt địch kế tiếp."
        },
        en: {
            name: "Armor Reduction", desc: "Ornn has Reduced this champion's Armor by 20 until the end of the next enemy turn."
        },
    },
}

/** Bộ đếm hiện trên tướng/token (khoá = stack key) */
export const STACK_V2_G1: Record<string, Bi> = {
    kegs: {
        vi: {
            name: "Số Thùng", desc: "Số Thùng (thật lẫn giả) Gangplank đang có trong ô phụ."
        },
        en: {
            name: "Kegs", desc: "How many Kegs (real and fake) Gangplank has in the extra slot."
        },
    },
}

/** Lá đặc biệt do tướng nhóm G1 tạo (hiện không còn lá nào) */
export const SPECIAL_V2_G1: Record<string, Bi> = {
}

/** Từ khoá mới/đổi trong chữ Việt của nhóm G1 (khoá = id) */
export const KEYWORDS_V2_G1: Record<string, Keyword> = {
    bleed: {
        vi: "Chảy Máu",
        en: "Bleed",
        descVi: "Dấu của Darius trên tướng (không giới hạn, hết sau 2 lượt của tướng mang kể từ lần cộng cuối). Gây sát thương đầu lượt của tướng mang; Máy Chém Noxus gây sát thương chuẩn theo số dấu.",
        descEn: "Darius's mark (no cap, expires 2 of its turns after the last one added). Deals damage at the start of its turn; Noxian Guillotine deals true damage per mark.",
    },
    yorick_mist: {
        vi: "Ma Sương",
        en: "Mist Walker",
        descVi: "Trạng thái vĩnh viễn do Yorick R (cộng dồn, mất khi Yorick chết): Yorick nhận ít sát thương hơn; đầu lượt bạn Thiếu Nữ Sương Mù đánh 1 địch ngẫu nhiên, Yorick hồi máu, Thiếu Nữ đào 1 lá vào mộ (xem Yorick).",
        descEn: "Permanent status from Yorick R (stacks, lost when Yorick dies): Yorick takes less damage; at the start of your turn the Maiden of the Mist strikes 1 random enemy, Yorick heals, and the Maiden digs 1 card into the graveyard (see Yorick).",
    },
    guilt: {
        vi: "Tội",
        en: "Guilt",
        descVi: "Dấu của Garen trên tướng địch (không giới hạn, hết sau 3 lượt của tướng mang kể từ lần cộng cuối). Tướng địch đối diện Garen +1 Tội mỗi lần tấn công.",
        descEn: "Garen's mark on an enemy (no cap, expires 3 of its turns after the last one added). The enemy opposite Garen gains 1 Guilt each time it attacks.",
    },
    keg: {
        vi: "Thùng",
        en: "Keg",
        descVi: "Thùng của Gangplank, Úp trong ô phụ; thật hoặc giả. Đối thủ chỉ thấy số Thùng. Đòn đánh của Xạ Thủ và Đấu Sĩ nhắm được (vỡ 1 Thùng ngẫu nhiên).",
        descEn: "Gangplank's Keg, Face-down in the extra slot; real or fake. The opponent only sees how many there are. Marksman and Fighter attacks can target them (breaking 1 random Keg).",
    },
    powder: {
        vi: "Thuốc Súng",
        en: "Powder",
        descVi: "Bộ đếm của từng Thùng thật (ẩn với đối thủ): +1 đầu mỗi lượt của Gangplank (không hết hạn). Thùng nổ gây sát thương theo Thuốc Súng.",
        descEn: "Counter of each real Keg (hidden from the opponent): +1 at the start of each of Gangplank's turns (no expiry). An exploding Keg deals damage per Powder.",
    },
    keg_detonate: {
        vi: "Kích Nổ",
        en: "Detonate",
        descVi: "Thùng thật nổ: 1 tướng địch ngẫu nhiên nhận sát thương vật lý theo Thuốc Súng của nó. Thùng đó biến mất. Thùng giả không có gì để nổ.",
        descEn: "A real Keg explodes: 1 random enemy champion takes physical damage per its Powder; that Keg disappears. A fake Keg has nothing to explode.",
    },
}
