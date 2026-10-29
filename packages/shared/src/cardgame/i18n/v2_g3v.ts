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
        desc: "Master of Shadows: stack one target hit by hit, turn on a guaranteed-crit turn, then detonate.",
        passive: {
            name: "Shadow Stacks",
            desc: "Each attack or skill of Zed that hits an enemy champion: it gains 1 Shadow Stack (max 8). Stacks stay until Zed uses R on it.",
        },
        skills: {
            Q: {
                name: "Razor Shuriken",
                desc: "Choose the enemy champion opposite Zed; deal {60 + 130% AD} physical damage.",
            },
            E: {
                name: "Living Shadow Blade",
                desc: "Until the end of this turn, every attack and skill of Zed crits.",
            },
            R: {
                name: "Death Mark",
                desc: "Choose 1 enemy champion with Shadow Stacks; deal {30 + 50% AD} physical damage per Shadow Stack on it, then remove all stacks. If it has 6 or more Shadow Stacks: Execute it instead of dealing damage.",
            },
        },
    },
    katarina: {
        desc: "The Sinister Blade: take one down and the card comes back to hand to take down the next; sweep the board, then fetch your cards back.",
        passive: {
            name: "Voracity",
            desc: "A Katarina card that takes down an enemy champion returns to your hand instead of going to the graveyard.",
        },
        skills: {
            Q: {
                name: "Bouncing Blade",
                desc: "Choose 1 enemy champion; deal {60 + 110% AD} magic damage.",
            },
            E: {
                name: "Shunpo",
                desc: "Choose 1 enemy champion; deal {35 + 80% AD} magic damage, doubled if it is below 50% HP.",
            },
            R: {
                name: "Death Lotus",
                desc: "Deal {45 + 90% AD} magic damage to every enemy champion. For each enemy champion taken down: take the most recent Katarina card from your graveyard into your hand.",
            },
        },
    },
    khazix: {
        desc: "The Voidreaver: hunt the one who stands alone, and make prey when the enemy stands tight.",
        passive: {
            name: "Hunter's Instinct",
            desc: "Kha'Zix's attacks and skills deal x2 damage to Isolated enemy champions.",
        },
        skills: {
            Q: {
                name: "Taste Their Fear",
                desc: "Choose 1 enemy champion; deal {60 + 140% AD} physical damage.",
            },
            E: {
                name: "Cut From the Herd",
                desc: "Choose 1 enemy champion; it is Isolated until the end of this turn.",
            },
            R: {
                name: "The Hunt",
                desc: "Every enemy champion is Isolated until the end of this turn.",
            },
        },
    },
    qiyana: {
        desc: "Queen of the Elements: the first strike on each enemy always hurts twice as much; spread your blows across the board and go for a second round.",
        passive: {
            name: "Queen's Privilege",
            desc: "Each enemy champion has Royal Privilege: the first time Qiyana damages it with an attack or skill, x2, then it Loses Privilege until the end of the turn.",
        },
        skills: {
            Q: {
                name: "Royal Strike",
                desc: "Choose 1 enemy champion; deal {55 + 130% AD} physical damage.",
            },
            E: {
                name: "Royal Audience",
                desc: "Every enemy champion has Royal Privilege again.",
            },
            R: {
                name: "Order of Erasure",
                desc: "Deal {40 + 100% AD} physical damage to every enemy champion.",
            },
        },
    },
    soraka: {
        desc: "The team's shared life pool: take lethal blows for allies, refill the pool, cancel skills aimed at the team and heal everyone in the big fight.",
        passive: {
            name: "Shared Life",
            desc: "When another allied champion would take a lethal blow: Soraka takes that damage instead.",
        },
        skills: {
            Q: {
                name: "Starcall",
                desc: "Soraka heals {150 + 100% AP}.",
            },
            E: {
                name: "Equinox",
                desc: "Quick, Chain Only. When the enemy plays a skill card that targets your champions: cancel that card (it still goes to the graveyard).",
            },
            R: {
                name: "Wish",
                desc: "Every allied champion, Soraka included, heals {230 + 100% AP}.",
            },
        },
    },
    nami: {
        desc: "Allies attack, you draw: the whole team feeds your hand; Q, E and R speed it up.",
        passive: {
            name: "Tide of Cards",
            desc: "Each turn, the first attack of each allied champion that hits an enemy: you draw 1 card.",
        },
        skills: {
            Q: {
                name: "Ebb and Flow",
                desc: "Draw 2 cards.",
            },
            E: {
                name: "Blessing",
                desc: "Choose 1 allied champion: this turn each of its attacks that hits an enemy makes you draw 1 card.",
            },
            R: {
                name: "Card Wave",
                desc: "Draw until your hand has 5 cards (nothing if it already has 5 or more).",
            },
        },
    },
}

export const STATUS_V2_G3V: Record<string, { vi: { name: string; desc: string }; en: { name: string; desc: string } }> = {
    nami_draw: {
        vi: {
            name: "Phước Lành", desc: "Lượt này mỗi đòn đánh của tướng này trúng địch, chủ Nami rút 1 lá."
        },
        en: {
            name: "Blessing", desc: "This turn each attack by this champion that hits an enemy makes Nami's owner draw 1 card."
        },
    },
    zed_stack: {
        vi: {
            name: "Dồn", desc: "Dấu của Zed, hiện số Dồn (tối đa 8). R của Zed gây sát thương theo số Dồn, từ 6 Dồn thì Kết Liễu."
        },
        en: {
            name: "Shadow Stack", desc: "Zed's stacks, showing the count (max 8). Zed's R deals damage per stack and Executes at 6 or more."
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
            name: "Cô Lập", desc: "Bị coi là Cô Lập: Kha'Zix gây ×2 sát thương lên tướng này."
        },
        en: {
            name: "Isolated", desc: "Counts as Isolated: Kha'Zix deals x2 damage to this champion."
        },
    },
    privilege_lost: {
        vi: {
            name: "Mất Đặc Quyền", desc: "Qiyana đã gây nhát đầu lên tướng này trong lượt: các nhát sau không ×2 tới hết lượt."
        },
        en: {
            name: "Privilege Lost", desc: "Qiyana already struck this champion this turn: later strikes are not doubled until the end of the turn."
        },
    },
}

export const STACK_V2_G3V: Record<string, { vi: { name: string; desc: string }; en: { name: string; desc: string } }> = {
}

export const KEYWORDS_V2_G3V: Record<string, Keyword> = {
    zed_stack: {
        vi: "Dồn",
        en: "Shadow Stack",
        descVi: "Dấu của Zed trên 1 tướng địch (tối đa 8): +1 khi đòn đánh hoặc chiêu của Zed trúng nó; ở lại tới khi Zed dùng R lên nó (xem Zed R).",
        descEn: "Zed's mark on an enemy champion (max 8): +1 when Zed's attack or skill hits it; stays until Zed uses R on it (see Zed R)."
    },
    qiyana_priv: {
        vi: "Đặc Quyền",
        en: "Royal Privilege",
        descVi: "Mọi tướng địch mặc định có Đặc Quyền: nhát đầu của Qiyana lên nó trong lượt ×2, rồi nó Mất Đặc Quyền tới hết lượt (xem Qiyana).",
        descEn: "Every enemy champion has it by default: Qiyana's first strike on it in a turn is x2, then it Loses Privilege until the end of the turn (see Qiyana)."
    },
}
