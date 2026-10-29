// Văn bản V2 (cập nhật V3) nhóm G2V: Blitzcrank, Braum, Leona, Malphite, Renata, Janna.
// Người tích hợp gộp HERO_EN_V2_G2V / STATUS_V2_G2V / STACK_V2_G2V vào i18n_en.ts + client, KEYWORDS_V2_G2V vào keywords/index.ts.
import type {
    HeroTextEn
} from "../i18n_en"
import type {
    Keyword
} from "../keywords/types"

export const HERO_EN_V2_G2V: Record<string, HeroTextEn> = {
    blitzcrank: {
        desc: "The steam golem reaches into the enemy hand: whichever champion's skill he steals takes the hit, and the stolen skill becomes his team's.",
        passive: {
            name: "Iron Grip",
            desc: "Each card Blitzcrank Card-Steals: Blitzcrank gains a Shield of {20 + 10% AD + 15% AP}. A shared card goes to your hand; an enemy champion's skill card becomes a random Q or E card of one of your champions on the board.",
        },
        skills: {
            Q: {
                name: "Rocket Grab",
                desc: "The opponent has at least 1 card in hand; Card-Steal 1 random card from the opponent's hand (choose the card while you have Revealed Hand). If it is a skill card: its champion takes {60 + 60% AD + 60% AP} magic damage; if that champion is dead or not on the board, the damage hits a random living enemy champion instead.",
            },
            E: {
                name: "Grab Back",
                desc: "Quick, Chain Only. When an enemy plays a skill card: Negate that card, then Card-Steal it; the champion that cast it is Stunned for 1 turn.",
            },
            R: {
                name: "Static Field",
                desc: "Reveal Hand until the end of the turn; every enemy champion with one of its own skill cards in the opponent's hand takes {80 + 50% AD + 80% AP} magic damage and is Stunned for 1 turn.",
            },
        },
    },
    braum: {
        desc: "Shield of the Freljord: he opens the fight with a Frost Mark, soaks hits for the whole team, hardens with every blow, then locks down the enemy line.",
        passive: {
            name: "Iron Hide",
            desc: "Each attack that hits Braum: +1 Twin Armor (permanent, no cap). Each Twin Armor: +1.5 Armor and +1.5 Magic Resist.",
        },
        skills: {
            Q: {
                name: "Winter's Bite",
                desc: "Choose 1 enemy champion; deal {40 + 40% AD + 40% AP} magic damage and place a Frost Mark on it until the end of this turn. The first time an ally other than Braum hits it: it is Stunned for 1 turn and Braum gains +2 Twin Armor.",
            },
            E: {
                name: "Stand Behind Me",
                desc: "Quick, Chain Only. When an enemy attacks 1 ally other than Braum: Intercept that attack; Braum gains +2 Twin Armor and a Shield of {40 + 30% AD + 30% AP}.",
            },
            R: {
                name: "Glacial Seal",
                desc: "Quick. Choose 1 enemy champion; it is Stunned for 1 turn. Every other enemy champion has a {5% + 1% per 100 max HP + 1% per 10 Armor} chance (Braum's stats) to be Stunned for 1 turn. Can be used in the opponent's turn to cut off a fight.",
            },
        },
    },
    leona: {
        desc: "The Radiant Dawn: she locks down with skills, marks enemies with Sun for her team to cash in, and raises an Eclipse to soak the hits for everyone.",
        passive: {
            name: "Sunlight",
            desc: "Leona's skills put Sun on enemies. An ally other than Leona who hits a champion with Sun deals {20 + 20% AD + 30% AP} bonus damage (Leona's stats), then the Sun fades.",
        },
        skills: {
            Q: {
                name: "Shield of Daybreak",
                desc: "The enemy champion opposite Leona takes {40 + 60% AD + 40% AP} physical damage, is Stunned for 1 turn and gets Sun.",
            },
            E: {
                name: "Eclipse",
                desc: "Quick. Until the end of the opponent's turn: Leona gains +60 Armor and +60 Magic Resist, and absorbs all damage enemies deal to her allies. At the end of that turn, 1 random enemy champion takes 40% of the total damage Leona absorbed + {20 + 20% AD + 30% AP} physical damage and gets Sun.",
            },
            R: {
                name: "Solar Flare",
                desc: "Every enemy champion takes {60 + 40% AD + 60% AP} physical damage and gets Sun. A champion that already had Sun is Stunned for 1 turn.",
            },
        },
    },
    malphite: {
        desc: "The walking mountain: Armor is his weapon, his Shield and his damage; he steals Armor, punishes whoever hits him, and opens the fight with Unstoppable Force.",
        passive: {
            name: "Granite Shield",
            desc: "At the start of your turn: Malphite gains a Shield of {5% max HP + 100% Armor} (does not stack).",
        },
        skills: {
            Q: {
                name: "Seismic Shard",
                desc: "Choose 1 enemy champion; deal {40 + 30% AD + 40% AP + 50% Armor} magic damage. Malphite takes 15 Armor from it until the end of the next turn.",
            },
            E: {
                name: "Thunderclap",
                desc: "Quick, Chain Only. When an enemy attacks Malphite: until the end of this turn Malphite gains +{10 + 30% Armor} Armor, and the attacker takes {20 + 60% Armor + 20% AP} magic damage.",
            },
            R: {
                name: "Unstoppable Force",
                desc: "Every enemy champion takes {80 + 30% AD + 50% AP + 100% Armor} magic damage; each has a {15% + 1% per 10 Armor} chance (Malphite's Armor) to be Stunned for 1 turn.",
            },
        },
    },
    renata: {
        desc: "The Zaunite baroness, master of comebacks: a fallen ally stands up in a rampage, whoever hits her team gets hit back, and the enemy turns on itself.",
        passive: {
            name: "Bailout",
            desc: "When an ally other than Renata is about to be taken down: it revives with 25% of its max HP + {20 + 15% AD + 25% AP} HP, gains Rampage and 1 Free Attack (once per ally per game). Rampage: until the end of its next turn, each of its attacks deals {15 + 15% AD + 25% AP} bonus damage.",
        },
        skills: {
            Q: {
                name: "Handshake",
                desc: "Your whole team gains +{10 + 10% AD + 15% AP} Armor until the end of the enemy's next turn; every enemy champion takes {20 + 20% AD + 30% AP} magic damage.",
            },
            E: {
                name: "Hostile Takeover Pack",
                desc: "Quick, Chain Only. When an enemy attacks exactly 1 allied champion: that champion reflects 40% of the damage it takes from that attack + {10 + 10% AD + 15% AP} to the attacker (true damage).",
            },
            R: {
                name: "Hostile Takeover",
                desc: "Every enemy champion goes Berserk: each attacks 2 times a random ally of its own (using its own AD). It never attacks itself; with no ally it does nothing.",
            },
        },
    },
    janna: {
        desc: "Embodiment of the Storm: Howling Gale knocks enemies out, Eye of the Storm shields and frees from crowd control, and Monsoon blocks every attack of an enemy turn, then heals the team.",
        passive: {
            name: "Windeye",
            desc: "At the start of your turn: your lowest-HP champion gains a Shield of {30 + 20% AD + 40% AP}.",
        },
        skills: {
            Q: {
                name: "Howling Gale",
                desc: "Quick. Choose 1 enemy champion; deal {40 + 30% AD + 60% AP} magic damage and Stun it for 1 turn.",
            },
            E: {
                name: "Eye of the Storm",
                desc: "Quick. Choose 1 allied champion; it gains a Shield of {80 + 40% AD + 70% AP}. While it keeps that Shield: it is immune to Crowd Control.",
            },
            R: {
                name: "Monsoon",
                desc: "Quick. Until the end of the opponent's turn: your whole team takes no damage from attacks. At the end of that turn, every ally heals {80 + 40% AD + 80% AP}.",
            },
        },
    },
}

export const STATUS_V2_G2V: Record<string, { vi: { name: string; desc: string }; en: { name: string; desc: string } }> = {
    sun: {
        vi: {
            name: "Nắng", desc: "Dấu của Leona. Đồng minh khác Leona đánh trúng tướng này gây thêm sát thương rồi Nắng tan.",
        },
        en: {
            name: "Sun", desc: "Leona's mark. An ally other than Leona who hits this champion deals bonus damage, then the Sun fades.",
        },
    },
    guard: {
        vi: {
            name: "Nhật Thực", desc: "Tới hết lượt đối thủ: Leona +60 Giáp, +60 Kháng Phép và hứng mọi sát thương địch gây ra cho đồng đội (số hứng hiện trên tướng); cuối lượt đó trả lại một phần cho 1 địch.",
        },
        en: {
            name: "Eclipse", desc: "Until the end of the opponent's turn: Leona gains +60 Armor, +60 Magic Resist and absorbs all damage enemies deal to her allies (the amount shows on her); at the end of that turn she returns part of it to 1 enemy.",
        },
    },
    attackCut: {
        vi: {
            name: "Miễn Đòn Đánh", desc: "Gió Mùa của Janna: tới hết lượt đối thủ không nhận sát thương từ đòn đánh (chiêu và hiệu ứng vẫn trúng).",
        },
        en: {
            name: "Attack Immunity", desc: "Janna's Monsoon: until the end of the opponent's turn, takes no damage from attacks (skills and effects still hit).",
        },
    },
    braum_mark: {
        vi: {
            name: "Dấu Băng", desc: "Tới hết lượt: đồng minh khác Braum đánh trúng tướng này lần đầu thì nó Choáng 1 lượt và Braum +2 Song Giáp.",
        },
        en: {
            name: "Frost Mark", desc: "Until end of turn: the first time an ally other than Braum hits this champion, it is Stunned for 1 turn and Braum gains +2 Twin Armor.",
        },
    },
    frenzy: {
        vi: {
            name: "Cuồng Bạo", desc: "Tới hết lượt kế của tướng này: mỗi đòn đánh gây thêm sát thương (Renata còn trên sân).",
        },
        en: {
            name: "Rampage", desc: "Until the end of this champion's next turn: each of its attacks deals bonus damage (while Renata is on the board).",
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
            name: "Gió Mùa", desc: "Tới hết lượt đối thủ: cả đội Janna miễn sát thương từ đòn đánh; cuối lượt đó cả đội hồi máu.",
        },
        en: {
            name: "Monsoon", desc: "Until the end of the opponent's turn: Janna's whole team takes no damage from attacks; at the end of that turn the team heals.",
        },
    },
    malphite_stolen: {
        vi: {
            name: "Mất Giáp", desc: "Malphite đã lấy bớt Giáp của tướng này: sát thương vật lý nó nhận tăng như thể nó mất chừng đó Giáp, tới hết lượt sau.",
        },
        en: {
            name: "Armor Stolen", desc: "Malphite took some of this champion's Armor: it takes physical damage as if it had lost that much Armor, until the end of the next turn.",
        },
    },
    malphite_loot: {
        vi: {
            name: "Giáp Đá", desc: "Malphite +Giáp lấy được từ địch bằng Mảnh Vỡ Địa Chấn, tới hết lượt sau.",
        },
        en: {
            name: "Stone Plating", desc: "Malphite has bonus Armor taken from enemies with Seismic Shard, until the end of the next turn.",
        },
    },
    malphite_e: {
        vi: {
            name: "Sấm Động", desc: "Tới hết lượt: Malphite +Giáp.",
        },
        en: {
            name: "Thunderclap", desc: "Until end of turn: Malphite has bonus Armor.",
        },
    },
}

export const STACK_V2_G2V: Record<string, { vi: { name: string; desc: string }; en: { name: string; desc: string } }> = {
    braum_dual: {
        vi: {
            name: "Song Giáp", desc: "Bộ đếm của Braum (giữ mãi, không giới hạn). Mỗi Song Giáp: +1.5 Giáp và +1.5 Kháng Phép.",
        },
        en: {
            name: "Twin Armor", desc: "Braum's counter (permanent, no cap). Each Twin Armor: +1.5 Armor and +1.5 Magic Resist.",
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
}

export const KEYWORDS_V2_G2V: Record<string, Keyword> = {
    sun: {
        vi: "Nắng",
        en: "Sun",
        descVi: "Dấu của Leona (có hoặc không, giữ cho tới khi dùng). Đồng minh khác Leona đánh trúng tướng có Nắng gây thêm sát thương rồi Nắng tan.",
        descEn: "Leona's mark (on or off, kept until used). An ally other than Leona who hits a champion with Sun deals bonus damage, then the Sun fades.",
    },
    braum_dual: {
        vi: "Song Giáp",
        en: "Twin Armor",
        descVi: "Bộ đếm của Braum (giữ mãi, không giới hạn). Mỗi Song Giáp: +1.5 Giáp và +1.5 Kháng Phép.",
        descEn: "Braum's counter (permanent, no cap). Each Twin Armor: +1.5 Armor and +1.5 Magic Resist.",
    },
    braum_mark: {
        vi: "Dấu Băng",
        en: "Frost Mark",
        descVi: "Dấu của Braum tới hết lượt. Đồng minh khác Braum đánh trúng lần đầu: tướng mang dấu Choáng 1 lượt và Braum +2 Song Giáp.",
        descEn: "Braum's mark until the end of the turn. The first time an ally other than Braum hits it: the marked champion is Stunned for 1 turn and Braum gains +2 Twin Armor.",
    },
    renata_frenzy: {
        vi: "Cuồng Bạo",
        en: "Rampage",
        descVi: "Tới hết lượt kế của tướng này: mỗi đòn đánh gây thêm sát thương cố định (Renata còn trên sân).",
        descEn: "Until the end of this champion's next turn: each attack deals fixed bonus damage (while Renata is on the board).",
    },
    blitz_steal: {
        vi: "Cướp Bài",
        en: "Card-Steal",
        descVi: "Lấy 1 lá của đối thủ. Lá chung về tay bạn; lá chiêu bị Đốt vào mộ chủ lá (Blitzcrank biến nó thành 1 lá Q/E của tướng mình).",
        descEn: "Take 1 card from the opponent. A shared card goes to your hand; a skill card is Burned into its owner's graveyard (Blitzcrank turns it into a Q/E card of one of his allies).",
    },
    cc: {
        vi: "Khống Chế",
        en: "Crowd Control",
        descVi: "Choáng, Câm Lặng, Mê và Khiêu Khích.",
        descEn: "Stun, Silence, Charm and Taunt.",
    },
}
