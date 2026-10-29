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
            desc: "When Darius's attack hits a champion: it gains 1 Bleed (max 8, expires 2 of its turns after the last one added).",
        },
        skills: {
            Q: {
                name: "Decimate",
                desc: "Choose the enemy champion opposite Darius; deal {20 + 110% AD} physical damage and +2 Bleed.",
            },
            E: {
                name: "Apprehend",
                desc: "Choose the enemy champion opposite Darius; deal {15 + 80% AD} physical damage. If Darius has no champion opposite: choose 1 enemy champion, Pull it opposite Darius before dealing damage.",
            },
            R: {
                name: "Noxian Guillotine",
                desc: "Choose the enemy champion opposite Darius that has Bleed; deal {20 + 30% AD} true damage per Bleed on it, then remove all its Bleed. If this card scores a takedown: it returns to your hand.",
            },
        },
    },
    garen: {
        desc: "Duel: whoever stands in front of Garen piles Guilt on themselves with every attack; Garen cuts into the Guilt and the Verdict cashes it all in.",
        passive: {
            name: "Justice",
            desc: "Each time the enemy champion opposite Garen attacks (anyone): it gains 1 Guilt (max 10, expires 3 of its turns after the last one added). Garen's attacks deal {10% AD} more physical damage per Guilt on the target.",
        },
        skills: {
            Q: {
                name: "Decisive Strike",
                desc: "Choose the enemy champion opposite Garen; deal {20 + 90% AD} physical damage, plus {20% AD} per Guilt on it.",
            },
            E: {
                name: "Judgment",
                desc: "Choose the enemy champion opposite Garen; slash it 3 times, each dealing {10 + 45% AD} physical damage and +1 Guilt (these do not count toward the 3 attacks).",
            },
            R: {
                name: "Demacian Verdict",
                desc: "Choose the enemy champion opposite Garen that has Guilt; deal {25 + 60% AD} true damage per Guilt on it, then remove all its Guilt.",
            },
        },
    },
    aatrox: {
        desc: "The World Ender: pay HP for damage, the emptier his health bar the harder he hits, heals back off every hit, and R cashes in all lost HP in one blow.",
        passive: {
            name: "Blood Price",
            desc: "Aatrox's attacks (including cardless attacks) deal extra physical damage equal to 25% of the HP Aatrox has lost.",
        },
        skills: {
            Q: {
                name: "The Darkin Blade",
                desc: "Choose the enemy champion opposite Aatrox; Aatrox Pays 25% of his max HP, then it takes physical damage equal to 2 times the HP paid.",
            },
            E: {
                name: "Infernal Chains",
                desc: "Quick. Until the end of the turn: Aatrox's attacks heal Aatrox for 100% of the damage dealt.",
            },
            R: {
                name: "World Ender",
                desc: "Choose the enemy champion opposite Aatrox; it takes physical damage equal to 2 times the HP Aatrox has lost, then Aatrox heals exactly the HP he has lost.",
            },
        },
    },
    gangplank: {
        desc: "A sturdy lane fighter who eats oranges to sustain and plants powder kegs that blow up the whole enemy team. Real Kegs grow every turn; fake Kegs (any card face-down) make the enemy guess which one to break.",
        passive: {
            name: "Bilgewater Gunpowder",
            desc: "At the start of your turn: your real Kegs gain 1 Powder. You may Face-down ANY card from your hand as a fake Keg (the card is spent; costs 1 play). The extra slot holds at most 1 Keg; the enemy cannot tell real from fake. Only Marksman attacks can target Kegs (breaking 1 random Keg: a fake Keg is flipped and its card goes to the graveyard, a real Keg just breaks without exploding). When the enemy breaks a fake Keg, Gangplank heals 30% of Q's heal (100% if it was an orange card). On your turn, Gangplank's attacks (including Quick attacks) may target your Kegs: Detonate 1 real Keg (every enemy champion takes {15 + 30% AD} physical damage per Powder). With no real Keg left, hitting a fake Keg eats it: the card goes to the graveyard, and an orange card heals 60% of Q's heal.",
        },
        skills: {
            Q: {
                name: "Eat Orange",
                desc: "Gangplank heals {100 + 60% AD} HP (himself only).",
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
        desc: "Shepherd of Souls: every card you play feeds Yorick. The thicker the graveyard, the bigger he gets, and R turns it all into one explosive turn.",
        passive: {
            name: "Thick Graveyard",
            desc: "Yorick gains +1.5 AD and +8 max HP for each card in your graveyard (up to 24 cards).",
        },
        skills: {
            Q: {
                name: "Last Rites",
                desc: "Discard 1 card from your hand into the graveyard; then draw 1 card.",
            },
            E: {
                name: "Summon Old Souls",
                desc: "Choose 1 skill card (not an R) of another ally in your graveyard; take it back into your hand.",
            },
            R: {
                name: "Soul Storm",
                desc: "Until the end of the turn: Yorick's attacks deal 3 extra physical damage for each card in your graveyard (up to 24 cards) and heal Yorick for 50% of the damage dealt.",
            },
        },
    },
    ornn: {
        desc: "The Forge God: forges one ally harder and sharper every turn; R doubles the whole forge. Pour Forge into one carry for a Masterpiece.",
        passive: {
            name: "Living Forge",
            desc: "At the start of your turn: choose 1 of your champions; it gains 1 Forge (permanent, max 10). Each Forge: that champion deals 5% more physical damage (attacks too) and gains +5 Armor, only while Ornn is on the board.",
        },
        skills: {
            Q: {
                name: "Bellows Blast",
                desc: "Discard 1 card from your hand, choose 1 of your champions; it gains +3 Forge.",
            },
            E: {
                name: "Flare Up",
                desc: "Quick. Choose 1 of your champions; until the end of the turn, its Forge counts double.",
            },
            R: {
                name: "Call of the Forge God",
                desc: "Double the Forge of all your champions (permanent, max 10).",
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
            name: "Chảy Máu", desc: "Dấu của Darius (tối đa 8, hết sau 2 lượt của tướng mang kể từ lần cộng cuối). Máy Chém Noxus gây sát thương chuẩn theo số dấu."
        },
        en: {
            name: "Bleed", desc: "Darius's mark (max 8, expires 2 of its turns after the last one added). Noxian Guillotine deals true damage per mark."
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
    yorick_r: {
        vi: {
            name: "Bão Hồn", desc: "Tới hết lượt: đòn đánh của Yorick gây thêm sát thương theo số lá trong mộ và hút máu."
        },
        en: {
            name: "Soul Storm", desc: "Until the end of the turn: Yorick's attacks deal extra damage per graveyard card and heal him."
        },
    },
    gp_e: {
        vi: {
            name: "Lửa Cháy Lan", desc: "Tới hết lượt: Thùng nổ gây sát thương gấp 2 lần."
        },
        en: {
            name: "Fire in the Hole", desc: "Until the end of the turn: Keg explosions deal 2 times the damage."
        },
    },
    forge_e: {
        vi: {
            name: "Lửa Bùng", desc: "Tới hết lượt: Rèn của tướng này tính gấp đôi."
        },
        en: {
            name: "Flare Up", desc: "Until the end of the turn: this champion's Forge counts double."
        },
    },
}

/** Bộ đếm hiện trên tướng/token (khoá = stack key) */
export const STACK_V2_G1: Record<string, Bi> = {
    forge: {
        vi: {
            name: "Rèn", desc: "Bộ đếm vĩnh viễn của Ornn (tối đa 10): mỗi Rèn +5% sát thương vật lý và +5 Giáp khi Ornn còn trên sân."
        },
        en: {
            name: "Forge", desc: "Ornn's permanent counter (max 10): each Forge gives +5% physical damage and +5 Armor while Ornn is on the board."
        },
    },
    kegs: {
        vi: {
            name: "Số Thùng", desc: "Số Thùng (thật lẫn giả) Gangplank đang có trong ô phụ."
        },
        en: {
            name: "Kegs", desc: "How many Kegs (real and fake) Gangplank has in the extra slot."
        },
    },
}

/** Lá đặc biệt do tướng nhóm G1 tạo đầu lượt (khoá = id lá) */
export const SPECIAL_V2_G1: Record<string, Bi> = {
    ornn_forge: {
        vi: {
            name: "Lò Rèn", desc: "Chọn 1 tướng mình; nó +1 Rèn."
        },
        en: {
            name: "Forge", desc: "Choose 1 of your champions; it gains 1 Forge."
        },
    },
}

/** Từ khoá mới/đổi trong chữ Việt của nhóm G1 (khoá = id) */
export const KEYWORDS_V2_G1: Record<string, Keyword> = {
    bleed: {
        vi: "Chảy Máu",
        en: "Bleed",
        descVi: "Dấu của Darius trên tướng (tối đa 8, hết sau 2 lượt của tướng mang kể từ lần cộng cuối). Máy Chém Noxus gây sát thương chuẩn theo số dấu.",
        descEn: "Darius's mark (max 8, expires 2 of its turns after the last one added). Noxian Guillotine deals true damage per mark.",
    },
    guilt: {
        vi: "Tội",
        en: "Guilt",
        descVi: "Dấu của Garen trên tướng địch (tối đa 10, hết sau 3 lượt của tướng mang kể từ lần cộng cuối). Tướng địch đối diện Garen +1 Tội mỗi lần tấn công.",
        descEn: "Garen's mark on an enemy (max 10, expires 3 of its turns after the last one added). The enemy opposite Garen gains 1 Guilt each time it attacks.",
    },
    forge: {
        vi: "Rèn",
        en: "Forge",
        descVi: "Bộ đếm vĩnh viễn của Ornn trên tướng mình (tối đa 10): mỗi Rèn +5% sát thương vật lý và +5 Giáp khi Ornn còn trên sân.",
        descEn: "Ornn's permanent counter on your champion (max 10): each Forge gives +5% physical damage and +5 Armor while Ornn is on the board.",
    },
    keg: {
        vi: "Thùng",
        en: "Keg",
        descVi: "Thùng của Gangplank, Úp trong ô phụ; thật hoặc giả. Đối thủ chỉ thấy số Thùng. Chỉ đòn đánh của Xạ Thủ nhắm được (vỡ 1 Thùng ngẫu nhiên).",
        descEn: "Gangplank's Keg, Face-down in the extra slot; real or fake. The opponent only sees how many there are. Only Marksman attacks can target them (breaking 1 random Keg).",
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
        descVi: "Thùng thật nổ: mọi tướng địch nhận sát thương vật lý theo Thuốc Súng của nó. Thùng đó biến mất. Thùng giả không có gì để nổ.",
        descEn: "A real Keg explodes: every enemy champion takes physical damage per its Powder; that Keg disappears. A fake Keg has nothing to explode.",
    },
}
