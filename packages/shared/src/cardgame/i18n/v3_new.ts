// Chữ cho 3 tướng mới: Tristana, Miss Fortune, Vel'Koz.
// Tích hợp (integrator): gộp HERO_EN_V3_NEW vào HERO_EN, STATUS_V3_NEW / STACK_V3_NEW vào bảng status/stack của i18n_en.ts + client,
// SPECIAL_V3_NEW vào SPECIAL_EN (hiện rỗng: chủ 30/10 bỏ lá tạm "velkoz_decay"), KEYWORDS_V3_NEW vào keywords/index.ts.
// LƯU Ý checkTranslations: công thức EN của Vel'Koz dùng "target max HP" / "target missing HP"; normFormula (i18n_en.ts) cần thêm hai quy tắc
// đặt TRƯỚC quy tắc "max HP": /target max HP/gi → "máu tối đa mục tiêu" và /target missing HP/gi → "máu đã mất mục tiêu" ("missing HP" → "máu đã mất" cũng nên thêm).
import type {
    HeroTextEn
} from "../i18n_en"
import type {
    Keyword
} from "../keywords/types"

export const HERO_EN_V3_NEW: Record<string, HeroTextEn> = {
    tristana: {
        desc: "Time bomb: stick a Bomb on one enemy and pound it until it blows; a Bomb that kills gives you the E card back.",
        passive: {
            name: "Explosive Charge",
            desc: "E plants a Bomb or adds 1 Charge; each real attack hit by Tristana on the Bomb carrier adds 1 Charge. At 4 Charges or at the end of the next enemy turn, the Bomb is spent and explodes for {40 + 100% AD + 55% AP} + Charges × ({20 + 45% AD}) physical damage. If the explosion itself truly takes down the enemy champion after saves, take 1 E from the deck, creating one only if none is left.",
        },
        skills: {
            Q: {
                name: "Rapid Fire",
                desc: "Until the end of the current turn, each real attack hit deals {20 + 90% AD} extra physical damage; needs no Bomb and grants no attacks.",
            },
            E: {
                name: "Explosive Charge",
                desc: "Choose 1 valid enemy champion; deal {45 + 100% AD + 35% AP} physical damage, then plant a Bomb with 1 Charge or add 1 Charge to its existing Bomb. Adding Charges does not delay the explosion.",
            },
            R: {
                name: "Buster Shot",
                desc: "Choose 1 valid enemy champion; the Bomb on it explodes first. If the target survives, deal {85 + 195% AD + 50% AP} physical damage, then Stun it for d = {0.7 + 0.4% AD + 0.3% AP} units if it is still alive (the fraction is the chance of 1 extra unit). Still fires and Stuns without a Bomb.",
            },
        },
    },

    missfortune: {
        desc: "Bullet storm: keep switching targets and shoot the whole board. Q ricochets, E sprays and cuts healing, R is a two-wave barrage.",
        passive: {
            name: "Love Tap",
            desc: "Each turn, the first real attack hit on each different enemy champion deals {20 + 105% AD + 15% AP} extra physical damage. A → B → A does not reward A again; a miss does not use the bonus, and summons/allies do not trigger it.",
        },
        skills: {
            Q: {
                name: "Double Up",
                desc: "Choose 1 valid enemy champion; deal {25 + 140% AD + 20% AP} physical damage. It ricochets to 1 other random targetable enemy champion for 150% of the base amount; if the first shot truly takes down its target, the ricochet deals 200%. With no ricochet target, the first shot still fires.",
            },
            E: {
                name: "Make It Rain",
                desc: "Every enemy champion on the board takes {15 + 50% AD + 20% AP} physical damage and receives 50% less healing/Shield (Grievous Wounds) until the end of the next enemy turn. E is not a response.",
            },
            R: {
                name: "Bullet Time",
                desc: "Each card fires at every enemy champion now and once more at the end of the enemy turn, each wave dealing {30 + 85% AD + 20% AP} physical damage. Each R has its own schedule; if Miss Fortune dies or truly receives a new Stun/Silence/Blind/Disarm, every pending wave is cancelled.",
            },
        },
    },

    velkoz: {
        desc: "Disintegration: every skill beam that hits is one Decay, three Decay unravel the target. Q splits a beam onto another enemy, E hits twice, R focuses 6 beams on one target.",
        passive: {
            name: "Organic Deconstruction",
            desc: "Each original skill beam that hits an enemy champion adds 1 Decay; at 3 it spends exactly 3 and blows up for {60 + 10% AD + 40% AP + 5% target max HP} true damage. A hit needs no HP/Shield loss: damage-only immunity or Guard still counts; whole-card immunity or a miss does not. The blast cannot crit and adds no mark. Decay is lost when the target dies.",
        },
        skills: {
            Q: {
                name: "Plasma Fission",
                desc: "Choose 1 enemy champion: it takes {135 + 20% AD + 130% AP + 4% target missing HP} magic damage; another random valid enemy champion takes {70 + 9% AD + 65% AP + 2% target missing HP} magic damage by its own missing HP. Each beam that hits adds 1 Decay.",
            },
            E: {
                name: "Void Rift",
                desc: "Choose 1 enemy champion: it takes {60 + 9% AD + 40% AP + 4% target missing HP} magic damage now and once more at the end of the current turn if still alive. Both hits belong to one card with AD/AP snapshotted when E resolves; each hit adds 1 Decay and recomputes missing HP at that moment.",
            },
            R: {
                name: "Life Form Disintegration Ray",
                desc: "Choose 1 enemy champion and fire up to 6 beams in a row within one resolution; each beam deals {25 + 4% AD + 10% AP + 3% target missing HP} magic damage by its current missing HP and adds 1 Decay on a hit. If the target dies the beams stop and do not retarget. All 6 hits complete 2 Decay cycles.",
            },
        },
    },
}

type Txt = { name: string; desc: string }
type Bi = { vi: Txt; en: Txt }

/** Trạng thái mới của 3 tướng (khoá = id status) */
export const STATUS_V3_NEW: Record<string, Bi> = {
    tri_bomb: {
        vi: {
            name: "Bom", desc: "Bom của Tristana (v = số Nạp). Đòn thật của Tristana +1 Nạp; đủ 4 Nạp hoặc tới cuối lượt địch kế (không dời hạn) thì nổ, gây sát thương theo số Nạp, kể cả khi Tristana đã chết."
        },
        en: {
            name: "Bomb", desc: "Tristana's Bomb (v = Charges). Tristana's real attack hits add 1 Charge; at 4 Charges or at the end of the next enemy turn (never delayed) it explodes for damage per Charge, even if Tristana has died."
        },
    },
    tri_q: {
        vi: {
            name: "Bắn Nhanh", desc: "Tới hết lượt: mỗi đòn thật trúng của Tristana gây thêm sát thương vật lý (không chí mạng)."
        },
        en: {
            name: "Rapid Fire", desc: "Until the end of the turn: each of Tristana's real attack hits deals extra physical damage (no crit)."
        },
    },
}

/** Bộ đếm mới của 3 tướng (khoá = key stack) */
export const STACK_V3_NEW: Record<string, Bi> = {
    mf_rain: {
        vi: {
            name: "Bão Đạn Chờ", desc: "Số nhịp hai của Bão Đạn sẽ nổ cuối lượt địch (mỗi lá R một nhịp). Miss Fortune chết hoặc thực sự nhận Choáng/Câm Lặng/Mù/Cấm đánh thì về 0 (huỷ)."
        },
        en: {
            name: "Pending Barrage", desc: "Number of Bullet Time second waves that will land at the end of the enemy turn (one per R card). Drops to 0 (cancelled) if Miss Fortune dies or truly receives a Stun/Silence/Blind/Disarm first."
        },
    },
    velkoz_decay: {
        vi: {
            name: "Phân Rã", desc: "Dấu của Vel'Koz trên địch: mỗi tia chiêu trúng +1; đủ 3 thì tiêu đúng 3 và nổ sát thương chuẩn. Mục tiêu chết thì mất dấu."
        },
        en: {
            name: "Decay", desc: "Vel'Koz's mark on an enemy: +1 per skill beam that hits; at 3 it spends exactly 3 and blows up for true damage. Lost when the target dies."
        },
    },
}

/** Lá đặc biệt do tướng mới tạo (khoá = id lá) */
export const SPECIAL_V3_NEW: Record<string, { name: string; desc: string }> = {
}

/** Từ khoá mới của 3 tướng (khoá = id) */
export const KEYWORDS_V3_NEW: Record<string, Keyword> = {
    tri_bomb: {
        vi: "Bom",
        en: "Bomb",
        descVi: "Bom của Tristana trên địch. Đòn thật của Tristana +1 Nạp; đủ 4 Nạp hoặc tới cuối lượt địch kế thì nổ theo số Nạp, kể cả khi Tristana đã chết. Chính vụ nổ hạ thật địch thì lấy 1 lá E từ bộ (thiếu mới tạo).",
        descEn: "Tristana's Bomb on an enemy. Tristana's real attack hits add 1 Charge; at 4 Charges or at the end of the next enemy turn it explodes per Charge, even if Tristana has died. If the explosion itself truly takes down the enemy, take 1 E from the deck (created only if none is left).",
    },
    decay: {
        vi: "Phân Rã",
        en: "Decay",
        descVi: "Dấu của Vel'Koz trên địch: mỗi tia chiêu của Vel'Koz trúng +1; đủ 3 thì tiêu đúng 3 và nổ sát thương chuẩn (có % máu tối đa của nó). Mục tiêu chết thì mất dấu.",
        descEn: "Vel'Koz's mark on an enemy: +1 per Vel'Koz skill beam that hits; at 3 it spends exactly 3 and blows up for true damage (including a % of its max HP). Lost when the target dies.",
    },
}
