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
            desc: "Tristana's attacks on an enemy carrying a Bomb: the Bomb gains 1 Charge. At 4 Charges, or at the end of the enemy's next turn, the Bomb explodes for {40 + 50% AD + 50% AP} physical damage plus {15 + 20% AD} per Charge. If the explosion takes down the enemy, the E card returns to your hand.",
        },
        skills: {
            Q: {
                name: "Rapid Fire",
                desc: "This turn, each of Tristana's attacks deals {20 + 40% AD} extra physical damage.",
            },
            E: {
                name: "Explosive Charge",
                desc: "Choose 1 enemy champion; it takes {45 + 50% AD + 30% AP} physical damage and gets a Bomb (+1 Charge).",
            },
            R: {
                name: "Buster Shot",
                desc: "Choose 1 enemy champion; it takes {100 + 110% AD + 50% AP} physical damage, the Bomb on it explodes at once and it is Stunned for 1 turn.",
            },
        },
    },

    missfortune: {
        desc: "Bullet storm: keep switching targets and shoot the whole board. Q ricochets, E sprays and cuts healing, R is a two-wave barrage.",
        passive: {
            name: "Love Tap",
            desc: "Each turn, Miss Fortune's first attack on each different enemy deals {20 + 50% AD + 10% AP} extra physical damage.",
        },
        skills: {
            Q: {
                name: "Double Up",
                desc: "Choose 1 enemy champion; it takes {30 + 80% AD + 20% AP} physical damage. The bullet ricochets to 1 other random enemy for ×1.5 that amount (×2 if the first shot takes down its target).",
            },
            E: {
                name: "Make It Rain",
                desc: "Quick. Every enemy champion takes {20 + 30% AD + 20% AP} physical damage and gets Grievous Wounds until the end of the next turn.",
            },
            R: {
                name: "Bullet Time",
                desc: "Every enemy champion takes {35 + 50% AD + 20% AP} physical damage now and again at the end of the enemy's turn. If Miss Fortune is controlled before the second wave lands, the second wave is cancelled.",
            },
        },
    },

    velkoz: {
        desc: "Disintegration: many small beams, every skill hit is one Decay and three Decay unravel the target.",
        passive: {
            name: "Organic Deconstruction",
            desc: "Each time a Vel'Koz skill hits an enemy: it gains 1 Decay. At 3 Decay it blows up for {62 + 10% AD + 40% AP + 5% target max HP} true damage and goes back to 0.",
        },
        skills: {
            Q: {
                name: "Plasma Fission",
                desc: "Choose 1 enemy champion; it takes double: {168 + 20% AD + 160% AP + 4% target missing HP} magic damage. 2 other random enemies each take {84 + 10% AD + 80% AP + 2% target missing HP} magic damage. Each one hit gains 1 Decay.",
            },
            E: {
                name: "Void Rift",
                desc: "Choose 1 enemy champion; it takes {70 + 10% AD + 50% AP + 4% target missing HP} magic damage now, and again at the end of this turn (recomputed from its missing HP then). Each hit gains 1 Decay.",
            },
            R: {
                name: "Life Form Disintegration Ray",
                desc: "Fire 10 beams, each at a random enemy: {25 + 3% AD + 12% AP + 3% target missing HP} magic damage. Each beam that hits gains 1 Decay.",
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
            name: "Bom", desc: "Bom của Tristana (v = số Nạp, tối đa 4). Đòn đánh của Tristana +1 Nạp; đủ 4 Nạp hoặc tới cuối lượt địch kế thì nổ, gây sát thương theo số Nạp."
        },
        en: {
            name: "Bomb", desc: "Tristana's Bomb (v = Charges, max 4). Tristana's attacks add 1 Charge; at 4 Charges or at the end of the enemy's next turn it explodes for damage per Charge."
        },
    },
    tri_q: {
        vi: {
            name: "Bắn Nhanh", desc: "Tới hết lượt: mỗi đòn đánh của Tristana gây thêm sát thương vật lý."
        },
        en: {
            name: "Rapid Fire", desc: "Until the end of the turn: each of Tristana's attacks deals extra physical damage."
        },
    },
}

/** Bộ đếm mới của 3 tướng (khoá = key stack) */
export const STACK_V3_NEW: Record<string, Bi> = {
    mf_rain: {
        vi: {
            name: "Bão Đạn Chờ", desc: "1 = nhịp hai của Bão Đạn sẽ nổ cuối lượt địch. Miss Fortune bị khống chế trước đó thì về 0 (huỷ)."
        },
        en: {
            name: "Pending Barrage", desc: "1 = the second wave of Bullet Time will land at the end of the enemy's turn. It drops to 0 (cancelled) if Miss Fortune is controlled first."
        },
    },
    velkoz_decay: {
        vi: {
            name: "Phân Rã", desc: "Dấu của Vel'Koz trên địch: mỗi chiêu trúng +1; đủ 3 thì nổ sát thương chuẩn và về 0."
        },
        en: {
            name: "Decay", desc: "Vel'Koz's mark on an enemy: +1 per skill hit; at 3 it blows up for true damage and goes back to 0."
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
        descVi: "Bom của Tristana trên địch (tối đa 4 Nạp). Đòn đánh của Tristana +1 Nạp; đủ 4 Nạp hoặc tới cuối lượt địch kế thì nổ theo số Nạp. Nổ hạ được địch thì lá E về tay.",
        descEn: "Tristana's Bomb on an enemy (max 4 Charges). Tristana's attacks add 1 Charge; at 4 Charges or at the end of the enemy's next turn it explodes per Charge. A kill returns the E card to hand.",
    },
    decay: {
        vi: "Phân Rã",
        en: "Decay",
        descVi: "Dấu của Vel'Koz trên địch: mỗi chiêu của Vel'Koz trúng +1; đủ 3 thì nổ sát thương chuẩn (có % máu tối đa của nó) và về 0.",
        descEn: "Vel'Koz's mark on an enemy: +1 per Vel'Koz skill hit; at 3 it blows up for true damage (including a % of its max HP) and goes back to 0.",
    },
}
