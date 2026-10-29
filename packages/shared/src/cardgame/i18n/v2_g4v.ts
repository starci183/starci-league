// V2 nhóm G4V (Brand, Lux, Ahri, Annie, Lissandra, Twisted Fate): chữ EN, tên status/stack mới và từ khoá.
// Công thức {…} giữ nguyên như bản Việt (checkTranslations đối chiếu). Integrator gộp vào i18n_en.ts và keywords/index.ts.
import type {
    HeroTextEn
} from "../i18n_en"
import type {
    Keyword
} from "../keywords/types"

export const HERO_EN_V2_G4V: Record<string, HeroTextEn> = {
    brand: {
        desc: "Burn forever: cheap Q to spam, E spreads fire across the board, R doubles every Burn pile. The longer the game, the more they burn.",
        passive: {
            name: "Blaze",
            desc: "Burn never expires and stacks (max 12). At the start of the opponent's turn: each enemy champion takes {8 + 4% AP} magic damage per Burn on it.",
        },
        skills: {
            Q: {
                name: "Sear",
                desc: "Choose 1 enemy champion; deal {28 + 80% AD + 40% AP} magic damage and +1 Burn.",
            },
            E: {
                name: "Spread the Flames",
                desc: "Every enemy champion +1 Burn.",
            },
            R: {
                name: "Pyroclasm",
                desc: "Double the Burn on every enemy champion.",
            },
        },
    },
    lux: {
        desc: "The more mana, the stronger: holding mana gives AP, E hits for the mana you have, R dumps all mana into one huge blast and leaves Lux weak.",
        passive: {
            name: "Gathered Light",
            desc: "Lux gains 0.7 AP for each mana she has.",
        },
        skills: {
            Q: {
                name: "Recharge",
                desc: "Restore 40 mana.",
            },
            E: {
                name: "Light Burst",
                desc: "Choose 1 enemy champion; deal {12 + 45% AD + 30% AP} magic damage, plus 0.8 damage for each mana Lux has.",
            },
            R: {
                name: "Final Spark",
                desc: "Needs at least 20 mana. Spend all your mana; choose 1 enemy champion and deal {40% AP} plus 2.2 magic damage for each mana spent.",
            },
        },
    },
    ahri: {
        desc: "Charm: Q locks one enemy, R locks the whole team, E pours magic on the charmed, the deeper the charm the harder it hits. A charmed champion cannot attack.",
        passive: {
            name: "Charm",
            desc: "An enemy champion with Charm cannot attack. At the end of its turn: it loses 1 Charm (max 5).",
        },
        skills: {
            Q: {
                name: "Allure",
                desc: "Choose 1 enemy champion; +2 Charm.",
            },
            E: {
                name: "Blown Kiss",
                desc: "Choose 1 enemy champion; deal {22 + 75% AD + 40% AP} magic damage, +50% for each Charm on it.",
            },
            R: {
                name: "Fox Dance",
                desc: "Every enemy champion +2 Charm.",
            },
        },
    },
    annie: {
        desc: "Count to Tibbers: Q and E build Fire, at 5 Fire the bear rises and mauls the whole enemy team, then vanishes. R wakes him early, the more Fire the harder it hits.",
        passive: {
            name: "Tibbers Fire",
            desc: "Annie has Fire. At 5 Fire: Tibbers appears, every enemy champion takes {10 + 45% AD + 40% AP} magic damage x2, then Tibbers vanishes and Fire resets to 0.",
        },
        skills: {
            Q: {
                name: "Fire Dart",
                desc: "Choose 1 enemy champion; deal {25 + 70% AD + 40% AP} magic damage and +1 Fire.",
            },
            E: {
                name: "Scorching Ward",
                desc: "+2 Fire.",
            },
            R: {
                name: "Summon Tibbers",
                desc: "Tibbers rises now: every enemy champion takes {10 + 45% AD + 40% AP} magic damage x(1 + current Fire). Fire resets to 0.",
            },
        },
    },
    lissandra: {
        desc: "Freeze the opponent's cards: Q freezes cards in their hand right when they need them, E hits for each frozen card, R shatters the whole pile into area damage. To thaw the ice, take Lissandra down.",
        passive: {
            name: "Frozen Hand",
            desc: "Frozen cards in the opponent's hand cannot be used but still take up space. The ice thaws when Lissandra leaves the board.",
        },
        skills: {
            Q: {
                name: "Ice Claw",
                desc: "Quick. Freeze 2 random cards in the opponent's hand.",
            },
            E: {
                name: "Shatter",
                desc: "Choose 1 enemy champion; deal {20 + 60% AD + 30% AP} magic damage, plus {14 + 20% AP} for each Frozen card in the opponent's hand.",
            },
            R: {
                name: "Frozen Tomb",
                desc: "Discard every Frozen card in the opponent's hand; each card discarded deals {14 + 30% AD + 25% AP} magic damage to every enemy champion.",
            },
        },
    },
    twistedfate: {
        desc: "Your hand is your ammo: draw more, pick the best cards from the top of the deck, E hits harder the thicker your hand, R throws the whole hand as a card storm.",
        passive: {
            name: "Golden Hand",
            desc: "While TF is on the board: your draw step draws 1 more card.",
        },
        skills: {
            Q: {
                name: "Pick a Card",
                desc: "Look at the top 3 cards of your deck, take 2 into your hand, put the other on the bottom of your deck.",
            },
            E: {
                name: "Destiny Card",
                desc: "Choose 1 enemy champion; deal {14 + 45% AD + 30% AP} magic damage, plus {8 + 8% AP} for each card in your hand.",
            },
            R: {
                name: "Throw It All",
                desc: "Discard every card in your hand; each card discarded deals {14 + 10% AD + 12% AP} magic damage to every enemy champion.",
            },
        },
    },
}

/** Status mới/ghi đè của nhóm: burn (Bỏng vĩnh viễn, v = stack), disarm (Say Mê của Ahri, v = stack, giảm 1 mỗi cuối lượt của chủ) */
export const STATUS_V2_G4V: Record<string, { vi: { name: string; desc: string }; en: { name: string; desc: string } }> = {
    burn: {
        vi: {
            name: "Bỏng", desc: "Không bao giờ hết, cộng dồn. Đầu lượt của đối thủ: mất máu (sát thương phép của Brand) theo số stack."
        },
        en: {
            name: "Burn", desc: "Never expires, stacks. At the start of the opponent's turn: takes Brand's magic damage per stack."
        },
    },
    disarm: {
        vi: {
            name: "Say Mê", desc: "Không đánh được (đòn đánh thường, không cần lá, miễn phí). Cuối lượt của nó: mất 1 stack."
        },
        en: {
            name: "Charm", desc: "Cannot attack (Strike card, cardless or free attack). At the end of its turn: loses 1 stack."
        },
    },
}

/** Stack hiện trên tướng: fire (Lửa của Annie) */
export const STACK_V2_G4V: Record<string, { vi: { name: string; desc: string }; en: { name: string; desc: string } }> = {
    fire: {
        vi: {
            name: "Lửa", desc: "Bộ đếm của Annie (đủ 5 thì Tibbers vồ cả đội địch rồi về 0)."
        },
        en: {
            name: "Fire", desc: "Annie's counter (at 5, Tibbers mauls the enemy team and it resets to 0)."
        },
    },
}

/** Từ khoá mới trong chữ Việt của nhóm (khoá = id status/stack khi có) */
export const KEYWORDS_V2_G4V: Record<string, Keyword> = {
    burn: {
        vi: "Bỏng",
        en: "Burn",
        descVi: "Dấu của Brand, không bao giờ hết, cộng dồn (tối đa 12); đầu lượt đối thủ gây sát thương phép theo số stack (xem Brand).",
        descEn: "Brand's mark, never expires, stacks (max 12); deals magic damage per stack at the start of the opponent's turn (see Brand).",
    },
    disarm: {
        vi: "Say Mê",
        en: "Charm",
        descVi: "Dấu của Ahri (tối đa 5): tướng mang không đánh được; cuối lượt của nó mất 1 stack (xem Ahri).",
        descEn: "Ahri's mark (max 5): the bearer cannot attack; it loses 1 stack at the end of its turn (see Ahri).",
    },
    fire: {
        vi: "Lửa",
        en: "Fire",
        descVi: "Bộ đếm của Annie; đủ 5 thì Tibbers vồ mọi địch rồi Lửa về 0 (xem Annie).",
        descEn: "Annie's counter; at 5, Tibbers mauls every enemy and Fire resets to 0 (see Annie).",
    },
    tibbers: {
        vi: "Tibbers",
        en: "Tibbers",
        descVi: "Con gấu của Annie: hiện ra, đánh mọi tướng địch rồi biến mất ngay, không chiếm đường.",
        descEn: "Annie's bear: appears, hits every enemy champion and vanishes at once, never occupies a lane.",
    },
    frozen: {
        vi: "Hoá Băng",
        en: "Frozen",
        descVi: "Lá trên tay không đánh, ghép hay nối Chuỗi được nhưng vẫn chiếm chỗ; tan khi Lissandra rời sân.",
        descEn: "A card in hand that cannot be played, crafted or chained but still takes space; thaws when Lissandra leaves the board.",
    },
    mana: {
        vi: "Mana",
        en: "Mana",
        descVi: "Tài nguyên của Pháp Sư: mỗi chiêu tốn mana, +10 mỗi đầu lượt của bạn, tối đa 100.",
        descEn: "A Mage's resource: each skill costs mana, +10 at the start of each of your turns, max 100.",
    },
}
