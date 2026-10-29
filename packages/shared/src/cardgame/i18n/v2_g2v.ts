// Văn bản V2 nhóm G2V: Blitzcrank, Braum, Leona, Malphite, Renata, Janna.
// Người tích hợp gộp HERO_EN_V2_G2V / STATUS_V2_G2V / STACK_V2_G2V vào i18n_en.ts + client, KEYWORDS_V2_G2V vào keywords/index.ts.
import type {
    HeroTextEn
} from "../i18n_en"
import type {
    Keyword
} from "../keywords/types"

export const HERO_EN_V2_G2V: Record<string, HeroTextEn> = {
    blitzcrank: {
        desc: "The steam golem reaches into the enemy hand: he steals exactly the card they need. A stolen skill card is burned and its champion freezes in place.",
        passive: {
            name: "Iron Grip",
            desc: "A card you Card-Steal: a shared card goes to your hand; an enemy champion's skill card is Burned and that champion is Stunned for 1 turn.",
        },
        skills: {
            Q: {
                name: "Rocket Grab",
                desc: "The opponent has at least 1 card in hand; Card-Steal 1 random card from the opponent's hand. If you have Revealed Hand: choose the card.",
            },
            E: {
                name: "Grab Back",
                desc: "Quick, Chain Only. When an enemy plays a card: Negate that card, then Card-Steal it.",
            },
            R: {
                name: "Static Field",
                desc: "Reveal Hand until the end of the turn; every enemy champion with one of its own skill cards in the opponent's hand is Stunned for 1 turn.",
            },
        },
    },
    braum: {
        desc: "Shield of the Freljord: he soaks hits for the whole team and gets Steady with every blow. He never deals skill damage.",
        passive: {
            name: "Iron Hide",
            desc: "Each attack that hits Braum: +1 Steady (permanent, max 6). Each Steady: Braum takes 10% less damage.",
        },
        skills: {
            Q: {
                name: "Stand Behind Me",
                desc: "Quick, Chain Only. When an enemy attacks 1 ally other than Braum: Intercept that attack; Braum +2 Steady.",
            },
            E: {
                name: "Unbreakable",
                desc: "Quick, Chain Only. When an enemy attacks: until the end of this turn, Braum's Steady counts ×2 (Braum takes up to 80% less damage).",
            },
            R: {
                name: "Glacial Fissure",
                desc: "Quick. Until the end of the opponent's turn: every ally takes 10% less damage for each of Braum's Steady.",
            },
        },
    },
    leona: {
        desc: "The Radiant Dawn: gather Sun on enemies, three Sun is a Stun. Leona deals no skill damage, her team strikes after.",
        passive: {
            name: "Sunlight",
            desc: "Leona's attacks give the target +1 Sun. An enemy champion with 3 Sun: Stunned for 1 turn and loses all Sun.",
        },
        skills: {
            Q: {
                name: "Shield of Daybreak",
                desc: "Choose 1 enemy champion; it gets +2 Sun.",
            },
            E: {
                name: "Eclipse",
                desc: "Until the end of this turn: each attack of an ally other than Leona gives the target +1 Sun.",
            },
            R: {
                name: "Solar Flare",
                desc: "Every enemy champion gets +2 Sun.",
            },
        },
    },
    malphite: {
        desc: "The walking mountain: the thicker your hand, the harder he is and the harder he hits, then he throws the whole hand as boulders.",
        passive: {
            name: "Granite Shield",
            desc: "Malphite takes 5% less damage for each card in your hand.",
        },
        skills: {
            Q: {
                name: "Seismic Shard",
                desc: "Choose 1 enemy champion; deal magic damage to it, {12 + 18% AD} for each card in your hand.",
            },
            E: {
                name: "Rolling Rock",
                desc: "Quick, Chain Only. When an enemy attacks Malphite: you draw 2 cards before damage is dealt.",
            },
            R: {
                name: "Unstoppable Force",
                desc: "Discard your whole hand; every enemy champion takes magic damage, {12 + 18% AD} for each discarded card, ×2.",
            },
        },
    },
    renata: {
        desc: "The Zaunite baroness, master of comebacks: a fallen ally stands up in a frenzy, whoever breaks her Ward is punished, and the enemy turns on itself.",
        passive: {
            name: "Bailout",
            desc: "When an ally other than Renata is about to be taken down: it revives with 25% of its max HP, gains Rampage and 1 Free Attack (once per ally per game).",
        },
        skills: {
            Q: {
                name: "Handshake",
                desc: "Quick. Choose 1 allied champion; it gets a Shield of {110 + 90% AD} and Counter Ward. When that Shield is broken: the breaker takes {80 + 90% AD} magic damage and is Stunned for 1 turn.",
            },
            E: {
                name: "Hostile Takeover Pack",
                desc: "Quick, Chain Only. When an enemy attacks exactly 1 allied champion: that champion reflects 60% of the damage it takes from that attack to the attacker (true damage).",
            },
            R: {
                name: "Hostile Takeover",
                desc: "Every enemy champion goes Berserk: one by one, each attacks its lowest-HP ally (itself if it has none).",
            },
        },
    },
    janna: {
        desc: "Embodiment of the Storm: enemy attacks on your team whiff, crowd control cannot cling to a shielded ally, and the storm blocks a whole enemy turn.",
        passive: {
            name: "Windeye",
            desc: "At the start of your turn: your lowest-HP champion gets a Shield of {30 + 30% AD}.",
        },
        skills: {
            Q: {
                name: "Howling Gale",
                desc: "Quick, Chain Only. When an enemy plays a Strike card or attacks one of your champions: Negate that attack.",
            },
            E: {
                name: "Eye of the Storm",
                desc: "Quick. Choose 1 allied champion; it gets a Shield of {90 + 70% AD}. While it keeps that Shield: it is immune to Crowd Control.",
            },
            R: {
                name: "Monsoon",
                desc: "Quick. Until the end of the opponent's turn: all hits on your team deal 50% less damage. At the end of that turn, every ally heals the amount blocked.",
            },
        },
    },
}

export const STATUS_V2_G2V: Record<string, { vi: { name: string; desc: string }; en: { name: string; desc: string } }> = {
    sun: {
        vi: {
            name: "Nắng", desc: "Dấu của Leona (số Nắng hiện trên tướng, tối đa 3). Đủ 3 Nắng: Choáng 1 lượt và mất hết Nắng.",
        },
        en: {
            name: "Sun", desc: "Leona's mark (shows the count, max 3). At 3 Sun: Stunned for 1 turn and loses all Sun.",
        },
    },
    leona_e: {
        vi: {
            name: "Nhật Thực", desc: "Tới hết lượt: mỗi đòn đánh của đồng minh khác Leona +1 Nắng lên mục tiêu.",
        },
        en: {
            name: "Eclipse", desc: "Until end of turn: each attack of an ally other than Leona gives the target +1 Sun.",
        },
    },
    braum_dbl: {
        vi: {
            name: "Vững Kép", desc: "Tới hết lượt: Vững của Braum tính ×2 (giảm sát thương tối đa 80%).",
        },
        en: {
            name: "Double Steady", desc: "Until end of turn: Braum's Steady counts ×2 (up to 80% damage reduction).",
        },
    },
    braum_wall: {
        vi: {
            name: "Bức Tường Băng", desc: "Tới hết lượt đối thủ: mọi đồng minh nhận ít hơn 10% sát thương cho mỗi Vững của Braum.",
        },
        en: {
            name: "Ice Wall", desc: "Until end of the opponent's turn: all allies take 10% less damage per Braum Steady.",
        },
    },
    frenzy: {
        vi: {
            name: "Cuồng Bạo", desc: "Sát thương đòn đánh và chiêu ×1.5 tới hết lượt của tướng này (Renata còn trên sân).",
        },
        en: {
            name: "Rampage", desc: "Attack and skill damage ×1.5 until the end of this champion's turn (while Renata is on the board).",
        },
    },
    renata_ward: {
        vi: {
            name: "Giáp Phản", desc: "Khi Khiên của tướng này bị phá: kẻ phá nhận sát thương phép lớn và Choáng 1 lượt.",
        },
        en: {
            name: "Counter Ward", desc: "When this champion's Shield is broken: the breaker takes heavy magic damage and is Stunned for 1 turn.",
        },
    },
    janna_ward: {
        vi: {
            name: "Khiên Gió", desc: "Khi còn Khiên: miễn Khống Chế (Choáng, Câm Lặng, Mê, Khiêu Khích).",
        },
        en: {
            name: "Windward Shield", desc: "While it has a Shield: immune to Crowd Control (Stun, Silence, Charm, Taunt).",
        },
    },
    janna_gale: {
        vi: {
            name: "Gió Mùa", desc: "Tới hết lượt đối thủ: mọi đòn lên đội Janna −50% sát thương; cuối lượt cả đội hồi máu bằng lượng đã chặn.",
        },
        en: {
            name: "Monsoon", desc: "Until the end of the opponent's turn: all hits on Janna's team deal 50% less damage; at turn end the team heals the amount blocked.",
        },
    },
}

export const STACK_V2_G2V: Record<string, { vi: { name: string; desc: string }; en: { name: string; desc: string } }> = {
    braum_steady: {
        vi: {
            name: "Vững", desc: "Braum nhận ít hơn 10% sát thương cho mỗi Vững (giữ mãi, tối đa 6).",
        },
        en: {
            name: "Steady", desc: "Braum takes 10% less damage per Steady (permanent, max 6).",
        },
    },
    renata_rev: {
        vi: {
            name: "Đã Hồi Sinh", desc: "Renata đã hồi sinh tướng này 1 lần trong trận.",
        },
        en: {
            name: "Revived", desc: "Renata has already revived this champion once this game.",
        },
    },
    janna_blk: {
        vi: {
            name: "Sát Thương Đã Chặn", desc: "Lượng sát thương Gió Mùa đã chặn; cuối lượt đối thủ cả đội hồi bằng chừng đó.",
        },
        en: {
            name: "Damage Blocked", desc: "Damage Monsoon has blocked; at the end of the opponent's turn the team heals that much.",
        },
    },
}

export const KEYWORDS_V2_G2V: Record<string, Keyword> = {
    sun: {
        vi: "Nắng",
        en: "Sun",
        descVi: "Dấu của Leona (tối đa 3, giữ cho tới khi đủ). Đủ 3 Nắng: tướng đó Choáng 1 lượt và mất hết Nắng.",
        descEn: "Leona's mark (max 3, kept until full). At 3 Sun: that champion is Stunned for 1 turn and loses all Sun.",
    },
    braum_steady: {
        vi: "Vững",
        en: "Steady",
        descVi: "Bộ đếm của Braum (giữ mãi, tối đa 6). Mỗi Vững: Braum nhận ít hơn 10% sát thương.",
        descEn: "Braum's counter (permanent, max 6). Each Steady: Braum takes 10% less damage.",
    },
    renata_frenzy: {
        vi: "Cuồng Bạo",
        en: "Rampage",
        descVi: "Đòn đánh và chiêu của tướng này gây ×1.5 sát thương tới hết lượt của nó.",
        descEn: "This champion's attacks and skills deal ×1.5 damage until the end of its turn.",
    },
    renata_ward: {
        vi: "Giáp Phản",
        en: "Counter Ward",
        descVi: "Gắn lên tướng mình cùng Khiên của Renata. Khi Khiên bị phá: kẻ phá nhận sát thương phép và Choáng 1 lượt.",
        descEn: "Placed on an ally with Renata's Shield. When the Shield is broken: the breaker takes magic damage and is Stunned for 1 turn.",
    },
    blitz_steal: {
        vi: "Cướp Bài",
        en: "Card-Steal",
        descVi: "Lấy 1 lá của đối thủ. Lá chung về tay bạn; lá chiêu bị Đốt vào mộ chủ lá (không thành Đánh thường).",
        descEn: "Take 1 card from the opponent. A shared card goes to your hand; a skill card is Burned into its owner's graveyard (it does not become a Strike).",
    },
    cc: {
        vi: "Khống Chế",
        en: "Crowd Control",
        descVi: "Choáng, Câm Lặng, Mê và Khiêu Khích.",
        descEn: "Stun, Silence, Charm and Taunt.",
    },
}
