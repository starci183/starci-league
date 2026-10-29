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
            desc: "When Darius's attack hits a champion: it gains 1 Bleed (max 6, expires 2 of its turns after the last one added). At the start of that champion's turn, each Bleed deals {3 + 5% AD} physical damage.",
        },
        skills: {
            Q: {
                name: "Decimate",
                desc: "Choose the enemy champion opposite Darius; deal {40 + 120% AD + 20% AP} physical damage and +2 Bleed; Darius heals {6 + 8% AD + 2% AP} HP per Bleed on it.",
            },
            E: {
                name: "Apprehend",
                desc: "Choose the enemy champion opposite Darius; deal {10 + 65% AD + 13% AP} physical damage. If Darius has no champion opposite: choose 1 enemy champion, Pull it opposite Darius, give it +1 Bleed, then deal damage.",
            },
            R: {
                name: "Noxian Guillotine",
                desc: "Choose the enemy champion opposite Darius that has Bleed; deal {16 + 25% AD + 5% AP} true damage per Bleed on it, then remove all its Bleed. If this card scores a takedown: it returns to your hand.",
            },
        },
    },

    garen: {
        desc: "Duel: whoever stands in front of Garen piles Guilt on themselves with every attack; Garen cuts into the Guilt and the Verdict hits harder with every stack.",
        passive: {
            name: "Justice",
            desc: "Each time the enemy champion opposite Garen attacks (anyone): it gains 1 Guilt (max 10, expires 3 of its turns after the last one added). Garen's attacks deal {6% AD + 2% AP} more physical damage per Guilt on the target.",
        },
        skills: {
            Q: {
                name: "Decisive Strike",
                desc: "Choose the enemy champion opposite Garen; deal {30 + 100% AD + 15% AP} physical damage, plus {15% AD + 3% AP} per Guilt on it. Garen heals 30% of the damage dealt.",
            },
            E: {
                name: "Judgment",
                desc: "Choose the enemy champion opposite Garen; deal {20 + 100% AD + 20% AP} physical damage and +3 Guilt (skill damage, does not count toward the 3 attacks).",
            },
            R: {
                name: "Demacian Justice",
                desc: "Choose the enemy champion opposite Garen; deal {100 + 80% AD + 20% AP} + 15 per Guilt on it as true damage. Guilt stays.",
            },
        },
    },

    aatrox: {
        desc: "The World Ender: pay HP for damage, the emptier his health bar the harder he hits, heals back off every hit, and R transforms him into a demon who survives one death.",
        passive: {
            name: "Blood Price",
            desc: "Aatrox's attacks (including cardless attacks) deal extra physical damage equal to 15% of the HP Aatrox has lost + {5% AD + 2% AP}.",
        },
        skills: {
            Q: {
                name: "The Darkin Blade",
                desc: "Choose the enemy champion opposite Aatrox; Aatrox Pays 25% of his max HP, then it takes physical damage equal to 120% of the HP paid + {60% AD + 10% AP}.",
            },
            E: {
                name: "Blood Rite",
                desc: "Quick. Until the end of the turn: Aatrox's attacks heal Aatrox for 100% of the damage dealt.",
            },
            R: {
                name: "World Ender",
                desc: "Transform for 2 of your turns: +30% AD, +30% max HP and heal that amount immediately, all healing Aatrox receives +50%. A takedown while transformed extends it by 1 turn. If Aatrox is defeated while transformed: he revives on the spot with 30% max HP + {50% AD} HP and the transformation ends (once per R).",
            },
        },
    },

    gangplank: {
        desc: "A sturdy lane fighter who eats oranges to sustain and plants powder kegs that blow up an enemy champion. Real Kegs grow every turn; fake Kegs (any card face-down) make the enemy guess which one to break.",
        passive: {
            name: "Bilgewater Gunpowder",
            desc: "At the start of your turn: your real Kegs gain 1 Powder. You may Face-down ANY card from your hand as a fake Keg (the card is spent; costs 1 play). The extra slot holds at most 1 Keg; the enemy cannot tell real from fake. Marksman and Fighter attacks can target Kegs (breaking 1 random Keg: a fake Keg is flipped and its card goes to the graveyard, a real Keg just breaks without exploding). When the enemy breaks a fake Keg, Gangplank heals 30% of Q's heal (160% if it was an orange card). On your turn, Gangplank's attacks (including Quick attacks) may target your Kegs: Detonate 1 real Keg (1 random enemy champion takes {40 + 60% AD + 10% AP} physical damage per Powder). With no real Keg left, hitting a fake Keg eats it: the card goes to the graveyard, and an orange card heals 40% of Q's heal.",
        },
        skills: {
            Q: {
                name: "Eat Orange",
                desc: "Gangplank heals {100 + 60% AD + 15% AP} HP (himself only). This card can also be placed face-down as a fake Keg (an orange card): if the enemy breaks it he heals 160% of this heal, if he hits it himself 40%.",
            },
            E: {
                name: "Plant Keg",
                desc: "Place 1 real Keg (1 Powder) in the extra slot. Needs room (max 1 Keg).",
            },
            R: {
                name: "Cannon Barrage",
                desc: "Add 1 Q (Orange) card and 1 E (Keg) card of Gangplank to your hand.",
            },
        },
    },
    yorick: {
        desc: "Shepherd of Souls: attacks to fill the graveyard, not to kill; the thicker the graveyard, the scarier the Maiden of the Mist and the tankier Yorick.",
        passive: {
            name: "Gravedigger",
            desc: "Yorick's attacks (including the 66% button) deal only 40% damage, but each one discards the top 1 card of your deck into the graveyard.",
        },
        skills: {
            Q: {
                name: "Burial",
                desc: "Discard 1 card from your hand into the graveyard, then draw 1 card; Yorick heals {25 + 20% AD + 5% AP} HP.",
            },
            E: {
                name: "Exhume",
                desc: "Discard the top 3 cards of your deck into the graveyard, then choose 1 of those 3 cards and take it into your hand.",
            },
            R: {
                name: "Maiden of the Mist",
                desc: "Summon the Maiden in the extra slot (150 + 8 HP per graveyard card). At the start of each of your turns, the Maiden strikes 1 random enemy: (1.5% of its max HP per 5 graveyard cards + {8% max HP + 50% Armor} of Yorick) physical damage, and Yorick heals 1% max HP per 5 graveyard cards.",
            },
        },
    },

    ornn: {
        desc: "The Forge God: the longer your team wears items the stronger they get, Ornn shields allies by punishing attackers, and R forges complete items mid-fight.",
        passive: {
            name: "Living Forge",
            desc: "While Ornn is on the board: all items your side wears gain +({10% + 2% per 100 AD + 2% per 100 AP} from Ornn's stats + 1% per round that item has been worn) stats. Each item is counted separately from when it was equipped; removing it resets the count.",
        },
        skills: {
            Q: {
                name: "Volcanic Rupture",
                desc: "Choose 1 enemy champion; it takes {40 + 6% max HP + 50% Armor + 20% AP} magic damage and has its Armor Reduced by 20 until the end of the next turn.",
            },
            E: {
                name: "Ram Charge",
                desc: "Quick, Chain Only. When an enemy attacks exactly 1 ally: the attacker takes ({20 + 4% max HP + 30% Armor} + 10 per item that ally wears) magic damage and is Stunned for 1 turn.",
            },
            R: {
                name: "Call of the Forge God",
                desc: "Choose 1 other ally; Ornn and that ally each receive 1 random complete item (equipped at once if there is a slot, otherwise into hand).",
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
            name: "Chảy Máu", desc: "Dấu của Darius (tối đa 6, hết sau 2 lượt của tướng mang kể từ lần cộng cuối). Gây sát thương đầu lượt của tướng mang; Máy Chém Noxus gây sát thương chuẩn theo số dấu."
        },
        en: {
            name: "Bleed", desc: "Darius's mark (max 6, expires 2 of its turns after the last one added). Deals damage at the start of its turn; Noxian Guillotine deals true damage per mark."
        },
    },
    guilt: {
        vi: {
            name: "Tội", desc: "Dấu của Garen (tối đa 10, hết sau 3 lượt của tướng mang kể từ lần cộng cuối). Đòn đánh và chiêu của Garen dùng Tội của mục tiêu."
        },
        en: {
            name: "Guilt", desc: "Garen's mark (max 10, expires 3 of its turns after the last one added). Garen's attacks and skills use the target's Guilt."
        },
    },
    aatrox_e: {
        vi: {
            name: "Hút Máu Xiềng Xích", desc: "Tới hết lượt: đòn đánh của Aatrox hồi máu bằng 100% sát thương gây ra."
        },
        en: {
            name: "Infernal Chains", desc: "Until the end of the turn: Aatrox's attacks heal him for 100% of the damage dealt."
        },
    },
    ornn_shred: {
        vi: {
            name: "Giảm Giáp", desc: "Ornn đã Giảm Giáp của tướng này 20 tới hết lượt sau."
        },
        en: {
            name: "Armor Reduction", desc: "Ornn has Reduced this champion's Armor by 20 until the end of the next turn."
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
        descVi: "Dấu của Darius trên tướng (tối đa 6, hết sau 2 lượt của tướng mang kể từ lần cộng cuối). Gây sát thương đầu lượt của tướng mang; Máy Chém Noxus gây sát thương chuẩn theo số dấu.",
        descEn: "Darius's mark (max 6, expires 2 of its turns after the last one added). Deals damage at the start of its turn; Noxian Guillotine deals true damage per mark.",
    },
    guilt: {
        vi: "Tội",
        en: "Guilt",
        descVi: "Dấu của Garen trên tướng địch (tối đa 10, hết sau 3 lượt của tướng mang kể từ lần cộng cuối). Tướng địch đối diện Garen +1 Tội mỗi lần tấn công.",
        descEn: "Garen's mark on an enemy (max 10, expires 3 of its turns after the last one added). The enemy opposite Garen gains 1 Guilt each time it attacks.",
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
