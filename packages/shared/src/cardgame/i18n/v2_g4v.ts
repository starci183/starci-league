// V3 nhóm G4V (Brand, Lux, Ahri, Annie, Lissandra, Twisted Fate): chữ EN, tên status/stack mới và từ khoá.
// Công thức {…} giữ nguyên như bản Việt (checkTranslations đối chiếu). Integrator gộp vào i18n_en.ts và keywords/index.ts.
import type {
    HeroTextEn
} from "../i18n_en"
import type {
    Keyword
} from "../keywords/types"

export const HERO_EN_V2_G4V: Record<string, HeroTextEn> = {
    brand: {
        desc: "Burn forever: cheap Q to spam and Stun the well-burned, E spreads fire across the board, R doubles every Burn pile and ignites it at once. The longer the game, the more they burn.",
        passive: {
            name: "Blaze",
            desc: "Burn never expires and stacks (max 12). At the start of the opponent's turn: each Burn deals 1% of the enemy's max HP + {1% AD + 2% AP} magic damage.",
        },
        skills: {
            Q: {
                name: "Sear",
                desc: "Choose 1 enemy champion; deal {35 + 45% AD + 90% AP} magic damage and +1 Burn. If it already has 3 or more Burn: Stun it for 1 turn.",
            },
            E: {
                name: "Spread the Flames",
                desc: "Every enemy champion takes {20 + 10% AD + 30% AP} magic damage and +1 Burn.",
            },
            R: {
                name: "Pyroclasm",
                desc: "Every enemy champion takes {60 + 20% AD + 50% AP} magic damage, then the Burn on it doubles and burns at once.",
            },
        },
    },
    lux: {
        desc: "Pool of light: the mana Lux spends is never lost, it flows into the Mana Pool. Q recharges and shields, E hits by the Pool (a full Pool Stuns), R dumps all mana into one huge blast. The fuller the Pool, the stronger Lux gets late.",
        passive: {
            name: "Pool of Light",
            desc: "All mana Lux spends is added permanently to the Mana Pool (kept when Lux dies).",
        },
        skills: {
            Q: {
                name: "Prismatic Barrier",
                desc: "Restore {20 + 5% AD + 10% AP} mana and Lux gains a Shield of {20 + 10% AD + 40% AP}.",
            },
            E: {
                name: "Light Binding",
                desc: "Choose 1 enemy champion; deal {20 + 30% AD + 60% AP} plus 10% of the Mana Pool as magic damage. If the Mana Pool is 150 or more: Stun it for 1 turn.",
            },
            R: {
                name: "Final Spark",
                desc: "Needs at least 20 mana. Spend all your mana; choose 1 enemy champion and deal {15% AD + 30% AP} plus 1.5 for each mana spent and 25% of the Mana Pool as magic damage.",
            },
        },
    },
    ahri: {
        desc: "Charm: Ahri's skills that land can leave a permanent Charm; the more charmed an enemy, the weaker its hits and the harder Ahri hits it. Q and E pour magic, E always charms, R dashes in to finish.",
        passive: {
            name: "Charm",
            desc: "Charm stacks permanently (max 3): each stack makes that enemy champion deal 7.5% less damage and take 5% more damage from Ahri. Each time an Ahri skill hits an enemy champion: {10% + 5% per 100 AD + 10% per 100 AP} chance of +1 Charm on it.",
        },
        skills: {
            Q: {
                name: "Orb of Deception",
                desc: "Choose 1 enemy champion; deal {40 + 20% AD + 70% AP} magic damage, and another random enemy champion takes {20 + 10% AD + 30% AP} true damage.",
            },
            E: {
                name: "Seduce",
                desc: "Choose 1 enemy champion; deal {30 + 20% AD + 50% AP} magic damage and guaranteed +1 Charm.",
            },
            R: {
                name: "Spirit Rush",
                desc: "Choose 1 other allied champion; Ahri swaps places with it, then the enemy champion opposite her new lane takes {80 + 30% AD + 90% AP} magic damage.",
            },
        },
    },
    annie: {
        desc: "Stun, then burn: every skill builds Fire, at 4 Fire the next skill Stuns its target, and Annie's skills hit a Stunned enemy harder. E is a Shield and a Quick trap, R lets Tibbers maul the whole team.",
        passive: {
            name: "Tibbers Fire",
            desc: "Each Annie skill +1 Fire (max 4). At 4 Fire: the next skill Stuns its exact target and Fire resets to 0. Q, E and R deal 50% more damage to a Stunned enemy champion.",
        },
        skills: {
            Q: {
                name: "Disintegrate",
                desc: "Choose 1 enemy champion; deal {60 + 20% AD + 80% AP} magic damage.",
            },
            E: {
                name: "Molten Shield",
                desc: "Quick. Annie gains a Shield of {60 + 20% AD + 50% AP}. If played in response to an enemy card or attack aimed at Annie while she has 4 Fire: Negate it, Stun whoever played it and deal {40 + 10% AD + 60% AP} magic damage to them; Fire resets to 0.",
            },
            R: {
                name: "Summon Tibbers",
                desc: "Tibbers mauls every enemy champion for {120 + 30% AD + 100% AP} magic damage. A Stunned champion takes extra damage; a champion that is not Stunned gets Stunned for 1 turn.",
            },
        },
    },
    lissandra: {
        desc: "Freeze the opponent's cards: Lissandra's damage can freeze cards in their hand, E Stuns the champion whose card is frozen, R freezes Lissandra herself to escape and counter-attacks for each frozen card. To thaw the ice, take Lissandra down.",
        passive: {
            name: "Frozen Hand",
            desc: "Each time Lissandra's damage hits an enemy champion: {10% + 5% per 100 AD + 10% per 100 AP} chance to Freeze 1 random card in the opponent's hand. Frozen cards cannot be used but still take up space; the ice thaws when Lissandra leaves the board.",
        },
        skills: {
            Q: {
                name: "Ice Shard",
                desc: "Choose 1 enemy champion; deal {50 + 30% AD + 80% AP} magic damage.",
            },
            E: {
                name: "Ring of Frost",
                desc: "Choose 1 enemy champion; deal {30 + 35% AD + 70% AP} magic damage. If the opponent's hand has a Frozen skill card of that very champion: Stun it for 1 turn.",
            },
            R: {
                name: "Frozen Tomb",
                desc: "Quick. Every enemy champion takes {30 + 10% AD + 20% AP} magic damage for each Frozen card in the opponent's hand. Then Lissandra freezes herself until the end of the opponent's turn: immune to all damage, cannot be targeted and cannot act.",
            },
        },
    },
    twistedfate: {
        desc: "Your hand is your ammo: a thick hand makes attacks hurt, Q picks a card color (restore mana, Armor Shred or Stun), E reshuffles for fresh ammo, R throws the whole hand as a card storm.",
        passive: {
            name: "Golden Hand",
            desc: "TF's attacks deal an extra {3 + 1% AD + 2% AP} magic damage for each card in your hand.",
        },
        skills: {
            Q: {
                name: "Pick a Card",
                desc: "Choose 1 color and 1 enemy champion; throw a card at it, dealing {50 + 30% AD + 80% AP} magic damage. Blue: TF restores 30 mana. Red: it is Armor Shredded until the end of the turn. Gold: Stun it for 1 turn.",
            },
            E: {
                name: "Stacked Deck",
                desc: "Look at the top 3 cards of your deck, take 2 into your hand, put the other on the bottom of your deck.",
            },
            R: {
                name: "Destiny",
                desc: "Discard your whole hand; each card discarded (up to 7 counted) deals {30 + 20% AD + 30% AP} magic damage to every enemy champion.",
            },
        },
    },
}

/** Status mới/ghi đè của nhóm: burn (Bỏng vĩnh viễn, v = stack), ahri_charm (Say Mê vĩnh viễn của Ahri, v = tầng) */
export const STATUS_V2_G4V: Record<string, { vi: { name: string; desc: string }; en: { name: string; desc: string } }> = {
    burn: {
        vi: {
            name: "Bỏng", desc: "Không bao giờ hết, cộng dồn. Đầu lượt của đối thủ: mất máu (sát thương phép của Brand) theo số stack."
        },
        en: {
            name: "Burn", desc: "Never expires, stacks. At the start of the opponent's turn: takes Brand's magic damage per stack."
        },
    },
    ahri_charm: {
        vi: {
            name: "Say Mê", desc: "Vĩnh viễn, cộng dồn (tối đa 3). Mỗi tầng: gây ít hơn 7.5% sát thương và nhận thêm 5% sát thương từ Ahri."
        },
        en: {
            name: "Charm", desc: "Permanent, stacks (max 3). Each stack: deals 7.5% less damage and takes 5% more damage from Ahri."
        },
    },
}

/** Stack hiện trên tướng: fire (Lửa của Annie), lux_pool (Bể Mana của Lux) */
export const STACK_V2_G4V: Record<string, { vi: { name: string; desc: string }; en: { name: string; desc: string } }> = {
    fire: {
        vi: {
            name: "Lửa", desc: "Bộ đếm của Annie (đủ 4 thì chiêu kế tiếp Choáng mục tiêu rồi về 0)."
        },
        en: {
            name: "Fire", desc: "Annie's counter (at 4, the next skill Stuns its target and it resets to 0)."
        },
    },
    lux_pool: {
        vi: {
            name: "Bể Mana", desc: "Tổng mana Lux đã tiêu, cộng vĩnh viễn (không mất khi chết)."
        },
        en: {
            name: "Mana Pool", desc: "All the mana Lux has spent, kept permanently (not lost on death)."
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
    ahri_charm: {
        vi: "Say Mê",
        en: "Charm",
        descVi: "Dấu của Ahri, vĩnh viễn, cộng dồn (tối đa 3): mỗi tầng làm tướng mang gây ít hơn 7.5% sát thương và nhận thêm 5% sát thương từ Ahri (xem Ahri).",
        descEn: "Ahri's mark, permanent, stacks (max 3): each stack makes the bearer deal 7.5% less damage and take 5% more damage from Ahri (see Ahri).",
    },
    fire: {
        vi: "Lửa",
        en: "Fire",
        descVi: "Bộ đếm của Annie; đủ 4 thì chiêu kế tiếp Choáng mục tiêu rồi Lửa về 0 (xem Annie).",
        descEn: "Annie's counter; at 4, the next skill Stuns its target and Fire resets to 0 (see Annie).",
    },
    tibbers: {
        vi: "Tibbers",
        en: "Tibbers",
        descVi: "Con gấu của Annie: hiện ra, đánh mọi tướng địch rồi biến mất ngay, không chiếm đường.",
        descEn: "Annie's bear: appears, hits every enemy champion and vanishes at once, never occupies a lane.",
    },
    lux_pool: {
        vi: "Bể Mana",
        en: "Mana Pool",
        descVi: "Tổng mana Lux đã tiêu, cộng vĩnh viễn và không mất khi chết; E và R của Lux đánh theo Bể (xem Lux).",
        descEn: "All the mana Lux has spent, added permanently and kept on death; Lux's E and R scale with it (see Lux).",
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
