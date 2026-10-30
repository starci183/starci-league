// V3 nhóm G4V (Brand, Lux, Ahri, Annie, Lissandra, Twisted Fate): chữ EN, tên status/stack mới và từ khoá.
// Công thức {…} giữ nguyên như bản Việt (checkTranslations đối chiếu). Integrator gộp vào i18n_en.ts và keywords/index.ts.
// Theo starci-33 implementation tuning v1 (bể mana chung 200/bên, tăng trưởng không trần, Choáng d đơn vị law.md §4).
import type {
    HeroTextEn
} from "../i18n_en"
import type {
    Keyword
} from "../keywords/types"

export const HERO_EN_V2_G4V: Record<string, HeroTextEn> = {
    brand: {
        desc: "Burn forever: Q Stuns the well-burned, E marks the whole board with Burn at once, R doubles every Burn pile and ignites it at once. Burn has no cap and burns at every enemy Standby, even after Brand falls.",
        passive: {
            name: "Blaze",
            desc: "Burn stacks without cap and never expires. At each Standby of the marked side, each stack deals 1% of the target's max HP + {2 + 1.5% AD + 2% AP} of Brand as magic damage; it keeps burning while Brand is dead, Stunned or Silenced. Burn is removed when the target dies; Cleanse can remove it.",
        },
        skills: {
            Q: {
                name: "Sear",
                desc: "Choose 1 enemy champion in any lane; deal {105 + 65% AD + 90% AP} magic damage, then add 1 Burn. If it had at least 3 Burn before this card: try to Stun it for d = 0.9 + 0.001 AD + 0.002 AP units. A Shield or damage-only immunity does not block Burn/Stun; whole-card immunity does.",
            },
            E: {
                name: "Spread the Flames",
                desc: "Every valid enemy champion at once takes {45 + 15% AD + 30% AP} magic damage and 1 Burn (mark only; Burn burns at the enemy's Standby). Does not affect summons.",
            },
            R: {
                name: "Pyroclasm",
                desc: "Every valid enemy champion takes {100 + 30% AD + 50% AP} magic damage; each one still valid has its Burn doubled, then burns once at once by the passive, keeping all stacks afterwards. Adds no Burn if it had none.",
            },
        },
    },
    lux: {
        desc: "Gathered light: every mana paid for a Lux skill becomes permanent Light. Free Q refills the team's mana and shields, E hits by Light (enough Light Stuns), R commits as much mana as you choose into one huge blast.",
        passive: {
            name: "Light",
            desc: "Each 1 mana actually paid for a Lux skill card grants 1 permanent Light, without cap and kept through death. Counted once per payment; mana paid for a card that is later cancelled still counts. Mana restores, teammates' costs and items do not add; Light is not spendable mana.",
        },
        skills: {
            Q: {
                name: "Prismatic Barrier",
                desc: "Costs no mana: restore min(40, {20 + 7% AD + 10% AP}) mana (rounded) to the team pool, never above 200; Lux gains a {70 + 15% AD + 40% AP} white Shield. The restore does not feed Light.",
            },
            E: {
                name: "Light Binding",
                desc: "Choose 1 enemy champion in any lane; deal {105 + 35% AD + 55% AP} + 10% of Light as magic damage. If Light after payment is 150 or more, try to Stun it for d = 0.9 + 0.001 AD + 0.002 AP units; an ordinary Shield does not block crowd control.",
            },
            R: {
                name: "Final Spark",
                desc: "Commit a whole number of 20–200 mana, no more than the team mana before paying; 50 is the default, not a fixed cost. Choose 1 enemy champion in any lane; deal {55 + 25% AD + 65% AP} + 1.8 × mana actually paid + 25% of Light after payment as magic damage.",
            },
        },
    },
    ahri: {
        desc: "Charm: each Ahri skill hit can leave a permanent, uncapped Charm; the more charmed an enemy, the weaker its hits and the harder Ahri hits it. Q and E pour magic, E always charms, R swaps with an ally and finishes the enemy opposite.",
        passive: {
            name: "Charm",
            desc: "Each direct original skill hit on an enemy champion has a {18% + 5% per 100 AD + 10% per 100 AP} chance to add 1 Charm that never expires, without a stack cap. While Ahri is alive on the board, n stacks make the target's damage 1/(1 + 0.10 × n) and the damage it takes from Ahri × (1 + 0.05 × n). Charm is lost when the target dies; if Ahri dies the marks stay but stop working.",
        },
        skills: {
            Q: {
                name: "Orb of Deception",
                desc: "Choose 1 enemy champion in any lane: deal {115 + 30% AD + 70% AP} magic damage; another random valid enemy champion takes {45 + 15% AD + 30% AP} true damage. Each hit rolls Charm separately.",
            },
            E: {
                name: "Seduce",
                desc: "Choose 1 enemy champion: deal {70 + 30% AD + 50% AP} magic damage, then guaranteed +1 Charm if it can still receive effects; the hit also rolls the passive, so it can gain 2 stacks in total. An ordinary Shield does not block the mark; whole-card immunity blocks both.",
            },
            R: {
                name: "Spirit Rush",
                desc: "Choose 1 other valid ally and swap places with Ahri; only if the swap succeeds, the valid enemy champion opposite her new position takes {180 + 40% AD + 100% AP} magic damage. Needs no mark, heals nothing and grants no attack.",
            },
        },
    },
    annie: {
        desc: "Stun, then burn: every skill builds Fire; at 4 Fire, Q/R spend it to Stun before burning, and Annie's skills hit a Stunned enemy harder. E is a Shield and a Quick trap, R lets Tibbers maul the whole team.",
        passive: {
            name: "Tibbers Fire",
            desc: "A skill that resolves while not full gains 1 Fire, full at 4. Q/R cast with 4 Fire spend all 4 to try a Stun before damage; E spends Fire only on a valid reaction. Only Annie's original skill damage on a target that is actually Stunned is multiplied by 1.5 (50% more); not a team buff.",
        },
        skills: {
            Q: {
                name: "Disintegrate",
                desc: "Choose 1 enemy champion in any lane, deal {120 + 30% AD + 80% AP} magic damage. If Fire was already full, spend it and try to Stun for d = 0.9 + 0.001 AD + 0.002 AP units before damage; only a target that is actually Stunned gets the passive bonus.",
            },
            E: {
                name: "Molten Shield",
                desc: "Quick. When an enemy card or attack (the top chain link) selects Annie as its single target, you may play this card. Annie gains a {95 + 30% AD + 50% AP} white Shield until the end of the next enemy turn. If she responds with 4 Fire: spend 4 Fire to cancel that link, try to Stun the caster if still valid for d = 0.9 + 0.001 AD + 0.002 AP units, then counter for {85 + 15% AD + 60% AP} magic damage. Played proactively at full Fire: Shield only, keeps 4 Fire.",
            },
            R: {
                name: "Summon Tibbers",
                desc: "Tibbers mauls every valid enemy champion; each takes {165 + 40% AD + 100% AP} magic damage and gets exactly one Stun try for d = 0.75 + 0.05% AD + 0.15% AP units. Full Fire: spend it and try before damage; not full: try after damage if it survives. A blocked or missed roll is not retried; no unit is summoned.",
            },
        },
    },
    lissandra: {
        desc: "Freeze the opponent's cards: Lissandra's real attacks and skills can freeze cards in their hand, E Stuns the champion whose card is frozen, R hits the whole enemy team per frozen card and then freezes Lissandra herself. To thaw the ice, take Lissandra down.",
        passive: {
            name: "Frozen Hand",
            desc: "When a real basic attack hit or an original skill card deals positive damage to an enemy champion's HP/Shield, it has a {18% + 5% per 100 AD + 10% per 100 AP} chance to Freeze 1 random unfrozen card in the opponent's hand. Each hit/card tries only once per target; bonus damage, items, reflection and damage over time do not count. Frozen cards cannot be used/crafted/chained but still take space; they thaw when Lissandra actually dies. The opponent only sees the frozen count and the card's champion.",
        },
        skills: {
            Q: {
                name: "Ice Shard",
                desc: "Choose 1 enemy champion in any lane, deal {125 + 40% AD + 80% AP} magic damage; if the actual damage to HP/Shield is positive, this card tries to Freeze once.",
            },
            E: {
                name: "Ring of Frost",
                desc: "Before damage, check whether a skill card of that exact champion is Frozen by this Lissandra. Deal {100 + 50% AD + 70% AP} magic damage; if the condition held beforehand, try to Stun for d = 0.9 + 0.001 AD + 0.002 AP units, without waiting for E's own Freeze.",
            },
            R: {
                name: "Frozen Tomb",
                desc: "Snapshot the n cards still Frozen by this Lissandra when R starts resolving. Every valid enemy champion takes n × {45 + 15% AD + 20% AP} magic damage; then Lissandra freezes herself until the end of the opponent's turn: immune to damage, untargetable and unable to act. With n = 0 she still protects herself; not Quick.",
            },
        },
    },
    twistedfate: {
        desc: "Your hand is your ammo: a thick hand makes attacks hurt, Q picks a card color (restore mana, Armor Shred or Stun), E filters and draws, R throws the whole hand as a card storm.",
        passive: {
            name: "Golden Hand",
            desc: "Each real basic attack that lands deals an extra n × {4 + 1.5% AD + 2% AP} magic damage that cannot crit on its own; n is the number of cards in hand at that hit, counting unexpired temporary cards, frozen cards and skills of absent champions.",
        },
        skills: {
            Q: {
                name: "Pick a Card",
                desc: "Choose a color and 1 enemy champion in any lane, deal {110 + 40% AD + 80% AP} magic damage. Blue: the team pool restores 30 mana after resolving. Red: its Armor and MR drop to 60% until the end of the current turn. Gold: try to Stun for d = 0.9 + 0.001 AD + 0.002 AP units. The color is chosen before the chain.",
            },
            E: {
                name: "Stacked Deck",
                desc: "Look at the top 3 cards of your deck, choose 1 to put on the bottom, then draw up to 2 remaining cards within the shared hand limit. With fewer than 3 cards in the deck, put none on the bottom and draw up to 2 available. Creates no card and guarantees no TF skill.",
            },
            R: {
                name: "Destiny",
                desc: "On resolving, snapshot your hand and discard each card of it; m is the number of cards actually removed, ammo = min(m, 7). Each ammo deals {40 + 20% AD + 25% AP} magic damage to every valid enemy champion. Cards gained after the snapshot stay; discarded temporary cards vanish. Needs at least 1 other card in hand to cast.",
            },
        },
    },
}

/** Status mới/ghi đè của nhóm: burn (Bỏng vĩnh viễn, v = stack), ahri_charm (Say Mê vĩnh viễn của Ahri, v = tầng) */
export const STATUS_V2_G4V: Record<string, { vi: { name: string; desc: string }; en: { name: string; desc: string } }> = {
    burn: {
        vi: {
            name: "Bỏng", desc: "Không bao giờ hết, cộng dồn không trần. Mỗi Standby của phe mang dấu: mất máu (sát thương phép của Brand) theo số tầng, kể cả khi Brand đã chết."
        },
        en: {
            name: "Burn", desc: "Never expires, stacks without cap. At each Standby of its side: takes Brand's magic damage per stack, even while Brand is dead."
        },
    },
    ahri_charm: {
        vi: {
            name: "Say Mê", desc: "Vĩnh viễn, cộng dồn không trần. Khi Ahri sống trên bàn, n tầng: gây sát thương ×1/(1 + 0,10 × n) và nhận thêm 5% sát thương từ Ahri mỗi tầng."
        },
        en: {
            name: "Charm", desc: "Permanent, stacks without cap. While Ahri is alive on the board, n stacks: deals damage × 1/(1 + 0.10 × n) and takes 5% more damage from Ahri per stack."
        },
    },
}

/** Stack hiện trên tướng: fire (Lửa của Annie), lux_pool (Ánh Sáng của Lux) */
export const STACK_V2_G4V: Record<string, { vi: { name: string; desc: string }; en: { name: string; desc: string } }> = {
    fire: {
        vi: {
            name: "Lửa", desc: "Bộ đếm của Annie (đủ 4 thì Q/R tiêu cả 4 để thử Choáng trước sát thương; E chỉ tiêu khi phản ứng)."
        },
        en: {
            name: "Fire", desc: "Annie's counter (at 4, Q/R spend all 4 to try a Stun before damage; E spends it only on a reaction)."
        },
    },
    lux_pool: {
        vi: {
            name: "Ánh Sáng", desc: "Mỗi mana thực trả cho chiêu của Lux thành 1 Ánh Sáng vĩnh viễn, không trần, không mất khi chết, không tiêu được."
        },
        en: {
            name: "Light", desc: "Each mana actually paid for a Lux skill becomes 1 permanent Light, uncapped, kept on death, not spendable."
        },
    },
}

/** Từ khoá mới trong chữ Việt của nhóm (khoá = id status/stack khi có) */
export const KEYWORDS_V2_G4V: Record<string, Keyword> = {
    burn: {
        vi: "Bỏng",
        en: "Burn",
        descVi: "Dấu của Brand, không bao giờ hết, cộng dồn không trần; mỗi Standby của phe mang dấu gây sát thương phép theo số tầng, kể cả khi Brand đã chết (xem Brand).",
        descEn: "Brand's mark, never expires, stacks without cap; deals magic damage per stack at each Standby of the marked side, even while Brand is dead (see Brand).",
    },
    ahri_charm: {
        vi: "Say Mê",
        en: "Charm",
        descVi: "Dấu của Ahri, vĩnh viễn, cộng dồn không trần: khi Ahri sống trên bàn, n tầng làm tướng mang gây sát thương ×1/(1 + 0,10 × n) và nhận thêm 5% sát thương từ Ahri mỗi tầng (xem Ahri).",
        descEn: "Ahri's mark, permanent, stacks without cap: while Ahri is alive on the board, n stacks make the bearer deal damage × 1/(1 + 0.10 × n) and take 5% more damage from Ahri per stack (see Ahri).",
    },
    fire: {
        vi: "Lửa",
        en: "Fire",
        descVi: "Bộ đếm của Annie; đủ 4 thì Q/R tiêu cả 4 để thử Choáng trước sát thương (xem Annie).",
        descEn: "Annie's counter; at 4, Q/R spend all 4 to try a Stun before damage (see Annie).",
    },
    tibbers: {
        vi: "Tibbers",
        en: "Tibbers",
        descVi: "Con gấu của Annie: hiện ra, đánh mọi tướng địch rồi biến mất ngay, không chiếm đường.",
        descEn: "Annie's bear: appears, hits every enemy champion and vanishes at once, never occupies a lane.",
    },
    lux_pool: {
        vi: "Ánh Sáng",
        en: "Light",
        descVi: "Mỗi mana thực trả cho chiêu của Lux thành 1 Ánh Sáng vĩnh viễn, không trần và không mất khi chết; E và R của Lux đánh theo Ánh Sáng (xem Lux).",
        descEn: "Each mana actually paid for a Lux skill becomes 1 permanent Light, uncapped and kept on death; Lux's E and R scale with it (see Lux).",
    },
    frozen: {
        vi: "Hoá Băng",
        en: "Frozen",
        descVi: "Lá trên tay không đánh, ghép hay nối Chuỗi được nhưng vẫn chiếm chỗ; tan khi Lissandra chết thật. Đối thủ chỉ thấy số lá băng và tướng chủ của lá.",
        descEn: "A card in hand that cannot be played, crafted or chained but still takes space; thaws when Lissandra actually dies. The opponent only sees the frozen count and the card's champion.",
    },
    mana: {
        vi: "Mana",
        en: "Mana",
        descVi: "Bể mana chung của mỗi bên: khởi đầu 80, tối đa 200; mọi tướng cùng bên chi mana từ bể này khi dùng chiêu.",
        descEn: "Each side's shared mana pool: starts at 80, max 200; every champion on that side pays its skills from this pool.",
    },
}
