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
            desc: "Each time Blitzcrank successfully steals 1 card, he gains a white Shield of {35 + 15% AD + 15% AP}. A shared card goes to your hand; a normal skill card becomes 1 random Q/E of a living allied champion on the board. A temporary skill vanishes and creates no real card; a successful steal still grants the Shield.",
        },
        skills: {
            Q: {
                name: "Rocket Grab",
                desc: "The opponent has cards: steal 1 random card; while their hand is Revealed, choose the exact card. If it is a skill card, its valid enemy owner takes {90 + 65% AD + 60% AP} magic damage; if the owner is not valid, a random valid enemy champion takes it instead. No pulling or slot change.",
            },
            E: {
                name: "Grab Back",
                desc: "When an enemy plays a skill card (top of the chain), you may play this card: Negate it, then steal it; after the steal, try to Stun its caster for 1 + 0.15% AP units. Steal/negate resolves before checking whether the source link was stunned; this card cannot be played proactively.",
            },
            R: {
                name: "Static Field",
                desc: "Reveal the enemy hand until the end of this turn. Each valid enemy champion with at least one of its own skill cards in that hand takes {120 + 65% AD + 80% AP} magic damage and is Stunned for 1 + 0.1% AP units; each champion is hit at most once by the same R.",
            },
        },
    },
    braum: {
        desc: "Shield of the Freljord: he opens the fight with a Frost Mark, soaks hits for the whole team, hardens with every blow, then locks down the enemy line.",
        passive: {
            name: "Iron Hide",
            desc: "Each real enemy attack that hits Braum grants 1 permanent Twin Armor; each stack gives 1.5 Armor and 1.5 Magic Resist. Lethal hits count, and stacks persist through death.",
        },
        skills: {
            Q: {
                name: "Winter's Bite",
                desc: "Choose 1 enemy champion; deal {65 + 50% AD + 40% AP} magic damage and place a Frost Mark until the end of the current turn. A real attack by an ally other than Braum that hits it consumes the mark: try to Stun it for 1 + 0.1% AD + 0.2% AP units and Braum gains 2 Twin Armor, even if the Stun is blocked.",
            },
            E: {
                name: "Stand Behind Me",
                desc: "When an enemy makes a single basic attack on another allied champion, you may play this card: Braum reveals himself and Intercepts that attack regardless of lane and Taunt, gaining 2 Twin Armor and a white Shield of {60 + 40% AD + 30% AP}. No repositioning.",
            },
            R: {
                name: "Glacial Seal",
                desc: "Whole enemy board, no manual target. The center is the valid enemy opposite Braum, otherwise a random one: Stun 1 + 0.2% AP units. Every other enemy is Stunned for d = 0.25 + 0.015 per 100 max HP + 0.015 per 10 Armor + 0.1% AP of Braum units; the fraction uses exactly one duration roll.",
            },
        },
    },
    leona: {
        desc: "The Radiant Dawn: she locks down with skills, marks enemies with Sun for her team to cash in, and raises an Eclipse to soak the hits for everyone.",
        passive: {
            name: "Sunlight",
            desc: "Skills place Sun (does not stack, never expires on its own). A real attack by an ally other than Leona that hits a champion with Sun consumes it and deals {20 + 25% AD + 30% AP} of Leona as bonus physical damage; grants no attack.",
        },
        skills: {
            Q: {
                name: "Shield of Daybreak",
                desc: "Lock onto the valid enemy champion opposite Leona; deal {40 + 75% AD + 40% AP} physical damage, Stun it for 1 + 0.1% AD + 0.2% AP units, then place Sun.",
            },
            E: {
                name: "Eclipse",
                desc: "Play proactively, or when an enemy attacks or plays a skill card you may play this card: until the end of the next enemy turn, Leona gains 60 Armor and 60 Magic Resist and absorbs enemy damage dealt to allied champions. At the end of that window, deal 40% of the absorbed amount + {20 + 25% AD + 30% AP} physical damage to a random valid enemy champion and place Sun. Recasting keeps the stored amount and does not add another +60.",
            },
            R: {
                name: "Solar Flare",
                desc: "Deal {60 + 50% AD + 60% AP} physical damage to every enemy champion and place Sun. Only champions that had Sun before this card are Stunned for 1 + 0.15% AP units; R alone still opens marks for allies.",
            },
        },
    },
    malphite: {
        desc: "The walking mountain: Armor is his weapon, his Shield and his damage; he steals Armor, punishes whoever hits him, and opens the fight with Unstoppable Force.",
        passive: {
            name: "Granite Shield",
            desc: "At the start of your turn, replace only the remaining Granite layer with a white Shield of {5% max HP + 100% Armor} (current). The Granite layer does not stack and never removes other Shields.",
        },
        skills: {
            Q: {
                name: "Seismic Shard",
                desc: "Choose 1 valid enemy champion in any lane; deal {65 + 35% AD + 40% AP + 50% Armor} magic damage. Then transfer up to 15 of its actual Armor to Malphite until the end of the next enemy turn; Malphite only gains what was successfully taken.",
            },
            E: {
                name: "Thunderclap",
                desc: "When an enemy basic attacks Malphite, you may play this card: gain {10 + 30% Armor} Armor (read before the gain) until the end of the current turn, then deal {35 + 60% Armor + 20% AP} magic damage (new Armor) to the attacker. Creates no real attack.",
            },
            R: {
                name: "Unstoppable Force",
                desc: "Every enemy champion takes {115 + 35% AD + 50% AP + 100% Armor} magic damage and is Stunned for 1 + 0.1% Armor + 0.1% AP units. With spell crit, one result is shared by the base damage on the whole board.",
            },
        },
    },
    renata: {
        desc: "The Zaunite baroness, master of comebacks: an ally about to fall is kept standing to strike back, whoever hits her team gets hit back, and the enemy turns on itself.",
        passive: {
            name: "Bailout",
            desc: "When an allied champion other than Renata is about to be taken down and has not been Bailed Out this game: keep it alive with {30% target max HP + 40 + 25% AD + 30% AP} HP, not above its max HP. Then it gains Rampage until the end of its next turn: each of its attacks that hits deals {50 + 25% AD + 30% AP} bonus damage (locked to Renata's stats at the rescue). Each ally can be Bailed Out only once per game.",
        },
        skills: {
            Q: {
                name: "Handshake",
                desc: "Choose 1 allied champion; it gains {15 + 15% AD + 20% AP} Armor for 1 time unit. Multiple casts of this Armor buff do not stack (the higher value is kept and the duration refreshed).",
            },
            E: {
                name: "Loyalty Program",
                desc: "Quick, Chain Only. When an enemy basic attack on top of the Chain selects exactly 1 allied champion: after that attack action, if D > 0, the attacker takes 40% D + {25 + 25% AD + 60% AP} true damage (D = the HP + Shield that champion actually lost from the attack action). The flat part counts once for the whole action. The original damage is not reduced.",
            },
            R: {
                name: "Hostile Takeover",
                desc: "One by one, every enemy champion still able to attack makes 1 basic attack action against 1 random other champion of its own team. Hit count follows the attacker's own Attack Speed, stats and valid on-hit effects.",
            },
        },
    },
    janna: {
        desc: "Embodiment of the Storm: her whole team's Shields grow thicker, shielded allies attack faster and take less damage; she Cleanses, shields and raises a Monsoon over the team.",
        passive: {
            name: "Tailwind",
            desc: "① While Janna is on the board, every allied champion gains 20% more Shield from every source. ② Each allied champion with a Shield gains Attack Speed equal to 50% of its current total Shield, at most +150 Attack Speed, and takes 10% less damage. When the Shield is gone or Janna leaves the board, this Attack Speed and damage reduction are lost.",
        },
        skills: {
            Q: {
                name: "Cleanse",
                desc: "Choose 1 allied champion with a Cleansable negative effect; remove those effects from it.",
            },
            E: {
                name: "Eye of the Storm",
                desc: "Choose 1 allied champion; it gains a Shield of {115 + 75% AP + 5% max HP}.",
            },
            R: {
                name: "Monsoon",
                desc: "Quick. Every allied champion on the board gains a Shield of {60 + 25% AP} and takes 15% less damage for 1 time unit. May respond when an enemy attack or damaging skill card targeting an allied champion is on top of the Chain.",
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
            name: "Nhật Thực", desc: "Tới hết lượt địch kế tiếp: Leona +60 Giáp, +60 Kháng Phép và hứng sát thương địch gây ra cho đồng đội (số hứng hiện trên tướng, tái dùng giữ kho); cuối cửa sổ dội lại một phần vào 1 địch ngẫu nhiên.",
        },
        en: {
            name: "Eclipse", desc: "Until the end of the next enemy turn: Leona gains +60 Armor, +60 Magic Resist and absorbs enemy damage dealt to her allies (the amount shows on her; recasting keeps it); at the end of the window she returns part of it to 1 random enemy.",
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
            name: "Dấu Băng", desc: "Tới hết lượt hiện tại: đòn thật của đồng minh khác Braum trúng tướng này tiêu dấu, thử Choáng (1 + 0,1% AD + 0,2% AP đơn vị) và Braum +2 Song Giáp.",
        },
        en: {
            name: "Frost Mark", desc: "Until the end of the current turn: a real attack by an ally other than Braum that hits this champion consumes it, tries to Stun it (1 + 0.1% AD + 0.2% AP units) and Braum gains +2 Twin Armor.",
        },
    },
    frenzy: {
        vi: {
            name: "Cuồng Bạo", desc: "Tới hết lượt kế của tướng này: mỗi đòn đánh trúng gây thêm sát thương đã chốt theo chỉ số Renata lúc cứu (số hiện trên trạng thái).",
        },
        en: {
            name: "Rampage", desc: "Until the end of this champion's next turn: each attack that hits deals bonus damage locked to Renata's stats at the rescue (shown on the status).",
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
            name: "Mất Giáp", desc: "Malphite đã lấy bớt Giáp của tướng này: sát thương vật lý nó nhận tăng như thể nó mất chừng đó Giáp, tới hết lượt địch kế tiếp.",
        },
        en: {
            name: "Armor Stolen", desc: "Malphite took some of this champion's Armor: it takes physical damage as if it had lost that much Armor, until the end of the next enemy turn.",
        },
    },
    malphite_loot: {
        vi: {
            name: "Giáp Đá", desc: "Malphite +Giáp lấy được từ địch bằng Mảnh Vỡ Địa Chấn, tới hết lượt địch kế tiếp.",
        },
        en: {
            name: "Stone Plating", desc: "Malphite has bonus Armor taken from enemies with Seismic Shard, until the end of the next enemy turn.",
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
            name: "Đã Cứu Trợ", desc: "Renata đã giữ tướng này khỏi bị hạ 1 lần trong trận.",
        },
        en: {
            name: "Bailed Out", desc: "Renata has already kept this champion from being taken down once this game.",
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
        descVi: "Dấu của Braum tới hết lượt hiện tại. Đòn thật của đồng minh khác Braum trúng: tiêu dấu, thử Choáng 1 + 0,1% AD + 0,2% AP đơn vị và Braum +2 Song Giáp.",
        descEn: "Braum's mark until the end of the current turn. A real attack by an ally other than Braum that hits it: consumes it, tries to Stun for 1 + 0.1% AD + 0.2% AP units and Braum gains +2 Twin Armor.",
    },
    renata_frenzy: {
        vi: "Cuồng Bạo",
        en: "Rampage",
        descVi: "Tới hết lượt kế của tướng này: mỗi đòn đánh trúng gây thêm sát thương cố định, chốt theo chỉ số Renata lúc cứu.",
        descEn: "Until the end of this champion's next turn: each attack that hits deals fixed bonus damage, locked to Renata's stats at the rescue.",
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
