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
            desc: "Each time Zed deals damage with an attack or skill: that hit deals {8 + 8% AD + 2% AP} extra damage for each time Zed already dealt damage earlier this turn, plus 5% of the target's missing HP. Resets to 0 every turn.",
        },
        skills: {
            Q: {
                name: "Razor Shuriken",
                desc: "Choose the enemy champion opposite Zed; deal {40 + 100% AD + 20% AP} physical damage.",
            },
            E: {
                name: "Living Shadow",
                desc: "Choose 1 enemy champion; Zed swaps lanes to stand opposite it, then it takes {30 + 80% AD + 15% AP} physical damage.",
            },
            R: {
                name: "Death Mark",
                desc: "Choose 1 enemy champion; it takes {60 + 100% AD + 20% AP} physical damage now. At the end of this turn it takes that damage again.",
            },
        },
    },
    katarina: {
        desc: "The Sinister Blade: stick Daggers, dodge and punish the attacker, sweep the board; take one down and the whole card pile comes back to hand.",
        passive: {
            name: "Voracity",
            desc: "When an enemy champion dies in a turn in which Katarina damaged it (anyone may take it down): every Katarina card used this turn returns to your hand.",
        },
        skills: {
            Q: {
                name: "Bouncing Blade",
                desc: "Choose 1 enemy champion; deal {45 + 30% AD + 60% AP} magic damage and put a Dagger on it.",
            },
            E: {
                name: "Shunpo",
                desc: "Quick, Chain Only. When the enemy attacks Katarina: Katarina dodges (the attack misses) and the attacker takes {25 + 20% AD + 40% AP} magic damage, doubled if it has a Dagger.",
            },
            R: {
                name: "Death Lotus",
                desc: "Every enemy champion takes {40 + 25% AD + 55% AP} magic damage; champions with a Dagger take 60% more.",
            },
        },
    },
    khazix: {
        desc: "The Voidreaver: hunt the one who stands alone. Swap lanes to pick your prey, vanish, and load another hunting strike.",
        passive: {
            name: "Hunter's Instinct",
            desc: "Isolated enemy champions (no ally in an adjacent lane, or marked Isolated): Kha'Zix's attacks deal {20 + 50% AD + 10% AP} extra physical damage to them; Q deals {40 + 90% AD + 15% AP} extra.",
        },
        skills: {
            Q: {
                name: "Taste Their Fear",
                desc: "Choose 1 enemy champion; deal {50 + 110% AD + 20% AP} physical damage (plus the passive's extra if it is Isolated).",
            },
            E: {
                name: "Leap Into the Herd",
                desc: "Choose 1 other allied champion; Kha'Zix swaps lanes with it. The enemy champion opposite Kha'Zix after the swap is Isolated until the end of this turn and takes {30 + 60% AD + 10% AP} physical damage.",
            },
            R: {
                name: "Void Stalk",
                desc: "Quick. Kha'Zix is Stealthed now until the end of the opponent's next turn; the enemy champion opposite Kha'Zix is Isolated until the end of your next turn; add 1 Kha'Zix Q card to your hand.",
            },
        },
    },
    qiyana: {
        desc: "Queen of the Elements: a random element each turn, and Q, E, R change with it. Red burst, Blue control, Green mobility.",
        passive: {
            name: "Elements",
            desc: "At the start of each of your turns, Qiyana gains 1 random element, kept until the start of your next turn: Red (Rock) burst, Blue (River) control, Green (Grass) mobility. The opponent sees the current element.",
        },
        skills: {
            Q: {
                name: "Elemental Strike",
                desc: "By current element. Red: choose 1 enemy champion; deal {40 + 110% AD + 20% AP} physical damage; until the end of this turn, each time Qiyana damages it, her later hits on it deal +15% (stacking). Blue: choose 1 enemy champion; deal {30 + 80% AD + 15% AP} physical damage and Stun it for 1 turn. Green: choose 1 enemy champion; Qiyana swaps lanes to stand opposite it, then it takes {30 + 80% AD + 15% AP} physical damage.",
            },
            E: {
                name: "Elemental Counter",
                desc: "Quick, Chain Only. When the enemy attacks Qiyana, by current element. Red: Qiyana strikes the attacker back for {30 + 80% AD + 15% AP} physical damage. Blue: the attacker is Stunned for 1 turn before the hit lands (the attack is cancelled). Green: Qiyana swaps lanes with another allied champion (the attack misses).",
            },
            R: {
                name: "Order of Erasure",
                desc: "By current element. Red: every enemy champion takes {60 + 120% AD + 20% AP} physical damage. Blue: every enemy champion takes {40 + 80% AD + 15% AP} physical damage; the enemy champion with the most HP and every enemy Marksman are Stunned for 1 turn (with no Marksman, 1 other random enemy champion too). Green: every enemy champion takes {40 + 80% AD + 15% AP} physical damage; Qiyana swaps lanes freely and takes 1 Qiyana Q card into your hand.",
            },
        },
    },
    soraka: {
        desc: "The team's shared life pool: take lethal blows for allies, refill the pool, cancel skills aimed at the team and Silence the caster, and heal everyone in the big fight.",
        passive: {
            name: "Shared Life",
            desc: "When another allied champion would take a lethal blow: Soraka takes all of that damage instead and the ally survives. If Soraka does not have enough HP, Soraka falls and the ally still survives.",
        },
        skills: {
            Q: {
                name: "Starcall",
                desc: "Choose 1 enemy champion; it takes {40 + 20% AD + 60% AP} magic damage and Soraka heals {60 + 20% AD + 40% AP}. Overheal becomes a Shield on the allied champion with the lowest HP.",
            },
            E: {
                name: "Equinox",
                desc: "Quick, Chain Only. When the enemy plays a skill card that targets your champions: cancel that card (it still goes to the graveyard) and the champion who played it is Silenced for 1 turn.",
            },
            R: {
                name: "Wish",
                desc: "Every allied champion, Soraka included, heals {150 + 40% AD + 80% AP}.",
            },
        },
    },
    nami: {
        desc: "Tide feeds the hand: every ally hit and every heal is a chance to draw; Q and R control, E and R heal.",
        passive: {
            name: "Tide of Cards",
            desc: "Each time an allied champion deals damage or heals: a chance (5% + 0.05% per point of AD and per point of AP of that ally) for you to draw 1 card (the same for every ally, Nami included). At most 2 cards per turn from this passive.",
        },
        skills: {
            Q: {
                name: "Ebb and Flow",
                desc: "Choose 1 enemy champion; it takes {40 + 25% AD + 55% AP} magic damage, is Stunned for 1 turn and is marked 3 times: the next 3 attacks of allies on it each spend 1 mark and deal {10 + 10% AD + 20% AP} extra magic damage (based on Nami's stats).",
            },
            E: {
                name: "Surging Tide",
                desc: "Nami heals {35 + 15% AD + 35% AP}, then the water bounces randomly between allies (it may bounce back to the same one), up to 5 bounces; each bounce heals {35 + 15% AD + 35% AP}. Every heal triggers the passive.",
            },
            R: {
                name: "Tidal Wave",
                desc: "Every allied champion heals {100 + 30% AD + 70% AP}; every enemy champion is Stunned for 1 turn. Every heal triggers the passive.",
            },
        },
    },
}

export const STATUS_V2_G3V: Record<string, { vi: { name: string; desc: string }; en: { name: string; desc: string } }> = {
    zed_chain: {
        vi: {
            name: "Liên Hoàn", desc: "Số lần Zed đã gây sát thương trong lượt này; mỗi phát sau đau hơn phát trước. Hết lượt thì về 0."
        },
        en: {
            name: "Chain Beat", desc: "How many times Zed has dealt damage this turn; each later hit hurts more. Resets at end of turn."
        },
    },
    zed_mark: {
        vi: {
            name: "Dấu Ấn Tử Thần", desc: "Cuối lượt của Zed, tướng này nhận thêm một lần sát thương của R."
        },
        en: {
            name: "Death Mark", desc: "At the end of Zed's turn this champion takes R's damage again."
        },
    },
    kat_dagger: {
        vi: {
            name: "Dao", desc: "Dao của Katarina: E của Katarina gây gấp đôi lên tướng này, R gây thêm 60%."
        },
        en: {
            name: "Dagger", desc: "Katarina's Dagger: her E deals double to this champion and her R deals 60% more."
        },
    },
    qiyana_mark: {
        vi: {
            name: "Dấu Đỏ", desc: "Đến hết lượt, mỗi lần Qiyana gây sát thương lên tướng này, các đòn sau của Qiyana lên nó thêm 15% (số hiện % đang cộng)."
        },
        en: {
            name: "Red Mark", desc: "Until end of turn, each time Qiyana damages this champion, her later hits on it deal 15% more (the number shows the current bonus %)."
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
            name: "Cô Lập", desc: "Bị coi là Cô Lập: đòn đánh và Q của Kha'Zix gây thêm sát thương lên tướng này."
        },
        en: {
            name: "Isolated", desc: "Counts as Isolated: Kha'Zix's attacks and Q deal extra damage to this champion."
        },
    },
}

export const STACK_V2_G3V: Record<string, { vi: { name: string; desc: string }; en: { name: string; desc: string } }> = {
    element: {
        vi: {
            name: "Nguyên Tố", desc: "Nguyên tố hiện tại của Qiyana: 1 Đỏ (Đá, dồn sát thương), 2 Xanh (Sông, khống chế), 3 Lục (Cỏ, cơ động). Đổi đầu mỗi lượt của bạn."
        },
        en: {
            name: "Element", desc: "Qiyana's current element: 1 Red (Rock, burst), 2 Blue (River, control), 3 Green (Grass, mobility). Changes at the start of each of your turns."
        },
    },
}

export const KEYWORDS_V2_G3V: Record<string, Keyword> = {
    zed_chain: {
        vi: "Liên Hoàn",
        en: "Chain Beat",
        descVi: "Nội tại của Zed: mỗi lần Zed gây sát thương trong lượt, phát đó thêm sát thương theo số lần Zed đã gây trước đó trong lượt, cộng 5% máu đã mất của mục tiêu (xem Zed).",
        descEn: "Zed's passive: each time Zed deals damage in a turn, that hit deals extra damage per earlier hit this turn, plus 5% of the target's missing HP (see Zed)."
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
        descVi: "Qiyana nhận 1 nguyên tố ngẫu nhiên mỗi đầu lượt của bạn (Đỏ dồn sát thương, Xanh khống chế, Lục cơ động); Q, E, R đổi tác dụng theo nó (xem Qiyana).",
        descEn: "Qiyana gains 1 random element at the start of each of your turns (Red burst, Blue control, Green mobility); Q, E, R change with it (see Qiyana)."
    },
    isolated: {
        vi: "Cô Lập",
        en: "Isolated",
        descVi: "Tướng địch không có đồng minh sống ở đường kề, hoặc bị gắn Cô Lập tới hết lượt: đòn đánh và Q của Kha'Zix gây thêm sát thương lên nó.",
        descEn: "An enemy champion with no living ally in an adjacent lane, or marked Isolated until end of turn: Kha'Zix's attacks and Q deal extra damage to it."
    },
}
