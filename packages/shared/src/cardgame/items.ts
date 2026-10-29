// Đồ chế độ thẻ bài V2: 8 mảnh (đeo riêng được) + 36 món huyền thoại theo docs/ITEMS_V2.md (thay docs/ITEMS_CARD.md).
// Engine (game.ts) đọc CARD_ITEMS: stats/adaptive/mult/bonus -> Game.stats, hooks -> Game.hook, dmgMult/takenMult/modifyDamage -> Game.damage,
// healMult / healGivenMult -> Game.heal/shield, shareDamage -> Game.damage, spellCritMult -> Game.damage, maxMana/manaRegen/manaCostMod -> mana pháp sư,
// anyTarget -> attackTargets. Đồ đã đeo không bao giờ tháo. Bảng ghép 8x8 nằm ở CARD_RECIPES (cardCombine).
import {
    formulaText
} from "./formula"
import type {
    Game, UnitStats
} from "./game"
import {
    RULES, otherSide,
    type Card, type DamageKind, type HeroHooks, type Side, type SkillDef, type Unit
} from "./types"

export interface CardItemDef {
  id: string;
  /** Tên hiển thị VI/EN */
  name: { vi: string; en: string };
  /** Chỉ số chế độ thẻ (THAY baseStats(item) trong Game.stats) */
  stats: Partial<UnitStats>;
  passive: { vi: string; en: string; descVi: string; descEn: string };
  /** Bộ đếm hiện: key `item:${id}` */
  stack?: { max: number; start?: number; vi: string; en: string };
  /** Chỉ số cộng thêm theo bộ đếm (đọc u.stacks, KHÔNG gọi g.stats bên trong) */
  bonus?(g: Game, u: Unit): Partial<UnitStats>;
  /** Nhân sát thương ĐI RA của tướng đeo. Có thể đặt d.crit = true để đánh dấu sát thương chí mạng. */
  dmgMult?(g: Game, me: Unit, d: { target: Unit; kind: DamageKind; tag: string; crit?: boolean }): number;
  /** Nhân sát thương NHẬN VÀO của tướng đeo (chỉ khi src là địch) */
  takenMult?(g: Game, me: Unit, d: { src: Unit; kind: DamageKind; tag: string }): number;
  /** Nhân hồi máu và Khiên tướng đeo nhận (áp trước Vết Thương Sâu) */
  healMult?: number;
  /** Đòn đánh của tướng đeo chọn được mọi tướng địch + vật triệu hồi */
  anyTarget?: boolean;
  /** AD nếu tướng đeo đánh vật lý, AP nếu đánh phép (cộng vào chỉ số khi đeo) */
  adaptive?: number;
  /** Cộng % lên tổng chỉ số (sau khi cộng mọi nguồn): { ap: 0.3 } = tổng AP +30% (Rabadon) */
  mult?: Partial<Record<keyof UnitStats, number>>;
  /** Nhân sát thương cho MỌI sát thương trong trận khi tướng đeo đang trên sân (xem HeroDef.modifyDamage): hào quang Tim Băng, Khiên Hư Vô. Không gọi g.damage bên trong. */
  modifyDamage?(g: Game, me: Unit, d: { src?: Unit; target: Unit; kind: DamageKind; tag: string; crit?: boolean }): number;
  /** Tướng đeo gánh thay phần này (0..1) của mọi sát thương đồng minh khác nhận (Lời Thề Hộ Vệ: 0.25) */
  shareDamage?: number;
  /** Nhân hồi máu/Khiên BAN RA của tướng đeo (g.heal/g.shield có src = tướng đeo; Giáp ban ra nhân g.givenMult) */
  healGivenMult?: number;
  /** Chiêu (tag "skill") của tướng đeo chí mạng theo tỉ lệ chí mạng của nó với hệ số này (Găng Bảo Thạch: 1.75) */
  spellCritMult?: number;
  /** + mana tối đa của pháp sư đeo (cộng vào g.maxMana) */
  maxMana?: number;
  /** + hồi mana mỗi đầu lượt (không phải stats.manaRegen) */
  manaRegen?: number;
  /** Chênh lệch chi phí mana mỗi lần tung chiêu (âm = rẻ hơn; kết quả kẹp >= 0) */
  manaCostMod?(g: Game, me: Unit, def: SkillDef, card: Card): number;
  hooks?: HeroHooks;
}

export const CARD_ITEMS: Record<string, CardItemDef> = {
}

// ---------------- Trợ giúp ----------------
const KEY = (id: string) => `item:${id}`
const cnt = (u: Unit, id: string) => u.stacks[KEY(id)] ?? 0
/** Tướng địch (không phải vật triệu hồi) đang trên sân */
const foe = (me: Unit, t: Unit | undefined): t is Unit => !!t && t.side !== me.side && !t.token && t.status === "board"
/** Số lượt (tính theo chủ `side`) để trạng thái kéo dài "đến hết lượt kế tiếp của side": nếu đang là lượt của side thì phải tính cả lượt sau */
const nextTurns = (g: Game, side: Side) => (g.s.active === side ? 2 : 1)
/** Id lá đang giải quyết dạng số (để gom nhiều hiệu ứng của cùng 1 lá) */
const curUid = (g: Game) => Number((g.cur.uid ?? "").replace(/\D/g,
    "")) || 0

/** Đăng ký món; món có bộ đếm tự đặt `start` (mặc định 0) khi được đeo (chỉ lần đeo đầu của id đó) */
function reg(def: CardItemDef) {
    if (def.stack) {
        const st = def.stack, prev = def.hooks?.onEquip
        def.hooks = {
            ...def.hooks,
            onEquip(g, me, d) {
                if (d.unit.id === me.id && d.item === def.id && me.items.filter((x) => x === def.id).length === 1) g.setStack(me,
                    KEY(def.id),
                    st.start ?? 0)
                prev?.(g,
                    me,
                    d)
            },
        }
    }
    CARD_ITEMS[def.id] = def
}

/** Món thuần chỉ số: không hiệu ứng */
const PURE = {
    vi: "Thuần Chỉ Số", en: "Pure Stats", descVi: "Không có hiệu ứng, chỉ số khủng.", descEn: "No effect, just big stats."
}

// ======================================================================
// 8 mảnh (đeo riêng được, mỗi mảnh khoảng +20%)
// ======================================================================
const PIECE_VI = "Đeo riêng (chiếm 1 ô) hoặc ghép tại chỗ: thêm 1 mảnh + 1 Vàng thành món theo bảng ghép."
const PIECE_EN = "Wear it alone (1 slot) or upgrade in place: add 1 more component + 1 Gold to make the item in the recipe table."
function piece(id: string, vi: string, en: string, stats: Partial<UnitStats>, extra: Partial<CardItemDef> = {
}, noteVi = "", noteEn = "") {
    reg({
        id, name: {
            vi, en
        }, stats, ...extra,
        passive: {
            vi: "", en: "", descVi: `${PIECE_VI}${noteVi ? ` ${noteVi}` : ""}`, descEn: `${PIECE_EN}${noteEn ? ` ${noteEn}` : ""}`
        },
    })
}
piece("kiem_dai",
    "Kiếm Dài",
    "Long Sword",
    {
        atk: 15
    })
piece("gay_qua_kho",
    "Gậy Quá Khổ",
    "Needlessly Large Rod",
    {
        ap: 20
    })
piece("cung_go",
    "Cung Gỗ",
    "Recurve Bow",
    {
        extraAtk: 0.15
    })
piece("gang_tay",
    "Găng Tay",
    "Cloak of Agility",
    {
        crit: 0.15
    })
piece("giap_luoi",
    "Giáp Lưới",
    "Chain Vest",
    {
        armor: 20
    })
piece("ao_choang",
    "Áo Choàng Phủ Phép",
    "Negatron Cloak",
    {
        mr: 20
    })
piece("dai_khong_lo",
    "Đai Khổng Lồ",
    "Giant's Belt",
    {
        hp: 100
    })
piece("nuoc_mat",
    "Nước Mắt Nữ Thần",
    "Tear of the Goddess",
    {
        spellAmp: 0.1
    },
    {
        maxMana: 20
    },
    "Pháp sư: +20 mana tối đa.",
    "Mage: +20 max mana.")

// ======================================================================
// 36 món huyền thoại
// ======================================================================

// ---------------- 5.1 Đòn đánh và kết liễu ----------------
reg({
    id: "kiem_tu_than", name: {
        vi: "Kiếm Tử Thần", en: "Death's Dance"
    },
    stats: {
        atk: 75
    },
    passive: PURE,
})

reg({
    id: "vo_cuc_kiem", name: {
        vi: "Vô Cực Kiếm", en: "Infinity Edge"
    },
    stats: {
        atk: 30, crit: 0.25, critDmg: 0.75
    },
    passive: {
        vi: "Vô Cực", en: "Infinity",
        descVi: "Chí mạng của tướng đeo gây ×2,25 thay vì ×1,5.",
        descEn: "Crits of the equipped champion deal ×2.25 instead of ×1.5.",
    },
})

reg({
    id: "sat_thu_kraken", name: {
        vi: "Sát Thủ Kraken", en: "Kraken Slayer"
    },
    stats: {
        atk: 30, mr: 20
    },
    passive: {
        vi: "Dồn Đòn", en: "Triple Strike",
        descVi: "Mỗi đòn đánh của tướng đeo trong cùng lượt gây thêm 25% so với đòn trước (đòn 2 +25%, đòn 3 +50%).",
        descEn: "Each attack of the equipped champion in the same turn deals 25% more than the previous one (2nd +25%, 3rd +50%).",
    },
    hooks: {
        onAttack(_g, me, d) {
            if (d.attacker.id === me.id) d.info.mult *= 1 + 0.25 * (Math.min(3,
                d.info.nth) - 1)
        },
    },
})

reg({
    id: "huyet_kiem", name: {
        vi: "Huyết Kiếm", en: "Bloodthirster"
    },
    stats: {
        atk: 35, mr: 20
    },
    passive: {
        vi: "Khát Máu", en: "Bloodthirst",
        descVi: "Đòn đánh của tướng đeo hút 35% sát thương gây ra; máu hồi dư thành Khiên (tối đa 25% máu tối đa).",
        descEn: "Attacks of the equipped champion heal for 35% of the damage dealt; overhealing becomes a Shield (max 25% of max HP).",
    },
    hooks: {
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss || d.dealt <= 0) return
            const amt = 0.35 * d.dealt
            const heal = Math.min(amt,
                me.maxHp - me.hp)
            if (heal > 0) g.heal(me,
                me,
                heal)
            const over = Math.min(amt - heal,
                0.25 * me.maxHp - me.shield)
            if (over > 0) g.shield(me,
                me,
                over)
        },
    },
})

reg({
    id: "loi_nhac_tu_vong", name: {
        vi: "Lời Nhắc Tử Vong", en: "Mortal Reminder"
    },
    stats: {
        atk: 50
    },
    passive: {
        vi: "Vết Thương", en: "Mortal Wound",
        descVi: "Địch nhận sát thương từ tướng đeo không được hồi máu hay nhận Khiên đến hết lượt kế tiếp của nó.",
        descEn: "An enemy that takes damage from the equipped champion cannot heal or gain Shield until the end of its next turn.",
    },
    hooks: {
        onDamage(g, me, d) {
            if (d.src?.id !== me.id || d.amount <= 0 || d.tag === "dot" || !foe(me,
                d.target)) return
            g.status(d.target,
                "noheal",
                nextTurns(g,
                    d.target.side))
        },
    },
})

reg({
    id: "diet_khong_lo", name: {
        vi: "Diệt Khổng Lồ", en: "Giant Slayer"
    },
    stats: {
        atk: 35, crit: 0.2
    },
    passive: {
        vi: "Diệt Cự", en: "Giant Slayer",
        descVi: "Tướng đeo gây thêm 40% sát thương lên địch có máu tối đa cao hơn nó.",
        descEn: "The equipped champion deals 40% more damage to enemies with higher max HP than it.",
    },
    dmgMult: (_g, me, d) => (d.target.maxHp > me.maxHp ? 1.4 : 1),
})

reg({
    id: "dai_bac", name: {
        vi: "Đại Bác Liên Thanh", en: "Rapid Firecannon"
    },
    stats: {
        extraAtk: 0.6
    },
    anyTarget: true,
    passive: {
        vi: "Tầm Xa", en: "Long Range",
        descVi: "Đòn đánh của tướng đeo chọn được mọi tướng địch, kể cả ô phụ (như Xạ thủ).",
        descEn: "Attacks of the equipped champion can target any enemy, including side slots (like Marksmen).",
    },
})

reg({
    id: "ke_thu_thap", name: {
        vi: "Kẻ Thu Thập", en: "The Collector"
    },
    stats: {
        atk: 40, crit: 0.25
    },
    passive: {
        vi: "Thu Hoạch", en: "Reap",
        descVi: "Đòn đánh hoặc chiêu của tướng đeo để 1 địch còn dưới 15% máu tối đa thì hạ luôn địch đó.",
        descEn: "If an attack or skill of the equipped champion leaves an enemy below 15% of its max HP, that enemy is taken down.",
    },
    hooks: {
        onDamage(g, me, d) {
            if (d.src?.id !== me.id || (d.tag !== "attack" && d.tag !== "skill") || !foe(me,
                d.target)) return
            const t = d.target
            if (t.hp > 0 && t.hp < 0.15 * t.maxHp && !g.has(t,
                "invulnerable")) g.execute(me,
                t)
        },
    },
})

reg({
    id: "ao_choang_bong_toi", name: {
        vi: "Áo Choàng Bóng Tối", en: "Edge of Night"
    },
    stats: {
        atk: 45, armor: 30
    },
    passive: {
        vi: "Màn Đêm", en: "Nightfall",
        descVi: "Khi tướng đeo hạ gục 1 địch: nó không thể bị chọn làm mục tiêu đến hết lượt kế tiếp của địch.",
        descEn: "When the equipped champion takes down an enemy: it cannot be targeted until the end of the enemy's next turn.",
    },
    hooks: {
        onKill(g, me, d) {
            if (d.killer.id !== me.id || d.victim.side === me.side || d.victim.token) return
            const foeSide = otherSide(me.side)
            g.status(me,
                "stealth",
                nextTurns(g,
                    foeSide),
                {
                    of: foeSide
                })
        },
    },
})

reg({
    id: "sung_hextech", name: {
        vi: "Súng Hextech", en: "Hextech Gunblade"
    },
    stats: {
        atk: 45
    },
    passive: {
        vi: "Đạn Hextech", en: "Hextech Shot",
        descVi: "Mỗi lá chiêu gây sát thương của tướng đeo gây thêm {80% AD} sát thương vật lý lên mỗi mục tiêu (1 lần mỗi mục tiêu mỗi lá).",
        descEn: "Each damaging skill card of the equipped champion deals {80% AD} extra physical damage to each target (once per target per card).",
    },
    hooks: {
        onDamage(g, me, d) {
            if (d.src?.id !== me.id || d.tag !== "skill" || d.amount <= 0 || !foe(me,
                d.target)) return
            if (!g.oncePerTurn(me,
                `hex:${g.cur.uid ?? ""}:${d.target.id}`)) return
            g.damage(me,
                d.target,
                0.8 * g.atk(me),
                "physical",
                {
                    tag: "effect"
                })
        },
    },
})

// ---------------- 5.2 Đấu sĩ và Quick ----------------
reg({
    id: "sterak", name: {
        vi: "Móng Vuốt Sterak", en: "Sterak's Gage"
    },
    stats: {
        atk: 20, hp: 150
    },
    passive: {
        vi: "Thịnh Nộ", en: "Fury",
        descVi: "Lần đầu mỗi lượt máu tướng đeo xuống dưới 40%: nó nhận Khiên {35% máu tối đa}.",
        descEn: "The first time each turn the equipped champion drops below 40% HP: it gains a Shield of {35% max HP}.",
    },
    hooks: {
        onDamage(g, me, d) {
            if (d.target.id !== me.id || d.hpLost <= 0 || me.hp <= 0) return
            if (me.hp >= 0.4 * me.maxHp || me.hp + d.hpLost < 0.4 * me.maxHp) return // chỉ tính lúc vừa tụt xuống dưới 40%
            if (g.oncePerTurn(me,
                "sterak")) g.shield(me,
                me,
                g.f(me,
                    "35% máu tối đa"))
        },
    },
})

reg({
    id: "giao_shojin", name: {
        vi: "Ngọn Giáo Shojin", en: "Spear of Shojin"
    },
    stats: {
        atk: 40
    },
    passive: {
        vi: "Phản Đòn Nhanh", en: "Quick Strike",
        descVi: "Đòn đánh và chiêu tướng đeo dùng trong lượt địch (Quick) gây gấp đôi sát thương.",
        descEn: "Attacks and skills of the equipped champion used during the enemy's turn (Quick) deal double damage.",
    },
    dmgMult: (g, me, d) => ((d.tag === "attack" || d.tag === "skill") && g.isOffTurn(me) ? 2 : 1),
})

reg({
    id: "y_chi_titan", name: {
        vi: "Ý Chí Titan", en: "Titanic Hydra"
    },
    stats: {
        hp: 150
    },
    passive: {
        vi: "Đập Titan", en: "Titan's Wrath",
        descVi: "Đòn đánh của tướng đeo gây thêm {5% máu tối đa} sát thương vật lý.",
        descEn: "Attacks of the equipped champion deal {5% max HP} extra physical damage.",
    },
    hooks: {
        onAttack(_g, me, d) {
            if (d.attacker.id === me.id) d.info.bonus.push({
                raw: 0.05 * me.maxHp, kind: "physical"
            })
        },
    },
})

reg({
    id: "cuong_dao", name: {
        vi: "Cuồng Đao Guinsoo", en: "Guinsoo's Rageblade"
    },
    stats: {
    },
    adaptive: 45,
    passive: {
        vi: "Cuồng Nộ", en: "Rageblade",
        descVi: "Mỗi lần tướng đeo cộng cộng dồn riêng của nó (Chảy Máu, Bỏng, Dồn, Buốt, Tội, Đói, Điên), cộng thêm 1.",
        descEn: "Each time the equipped champion adds a stack of its own (Bleed, Burn, Charge, Chill, Guilt, Hunger, Frenzy), add 1 more.",
    },
    hooks: {
        onHeroStack(_g, me, d) {
            if (d.src === me.id && d.n > 0) d.n += 1
        },
    },
})

reg({
    id: "tim_khong_than", name: {
        vi: "Tim Khổng Thần", en: "Heartsteel"
    },
    stats: {
        hp: 150
    },
    stack: {
        max: 10, vi: "Trái Tim", en: "Heart"
    },
    passive: {
        vi: "Lớn Dần", en: "Colossal Growth",
        descVi: "Đầu mỗi lượt của bạn: tướng đeo +40 máu tối đa vĩnh viễn (tối đa +400, giữ qua chết).",
        descEn: "At the start of your turn: the equipped champion gains +40 max HP permanently (max +400, kept through death).",
    },
    hooks: {
        onTurnStart(g, me, d) {
            if (d.side !== me.side) return
            const n = g.stack(me,
                KEY("tim_khong_than"),
                1,
                10)
            g.setAuraMaxHp(me,
                "tim_khong_than",
                40 * n)
        },
    },
})

// ---------------- 5.3 Pháp sư và mana ----------------
reg({
    id: "mu_rabadon", name: {
        vi: "Mũ Phù Thủy Rabadon", en: "Rabadon's Deathcap"
    },
    stats: {
        ap: 70
    },
    mult: {
        ap: 0.3
    },
    passive: {
        vi: "Phù Thủy", en: "Magical Opus",
        descVi: "Tổng AP của tướng đeo +30%.",
        descEn: "The equipped champion's total AP +30%.",
    },
})

reg({
    id: "bua_lam", name: {
        vi: "Bùa Lam", en: "Blue Talisman"
    },
    stats: {
        ap: 20
    },
    maxMana: 20,
    manaRegen: 10,
    passive: {
        vi: "Suối Lam", en: "Mana Spring",
        descVi: "Tướng đeo hồi thêm 10 mana mỗi lượt (gấp đôi) và +20 mana tối đa.",
        descEn: "The equipped champion regains 10 more mana each turn (double) and has +20 max mana.",
    },
})

reg({
    id: "truong_truong_sinh", name: {
        vi: "Trượng Trường Sinh", en: "Archangel's Staff"
    },
    stats: {
    },
    maxMana: 40,
    bonus: (g, u) => ({
        ap: Math.floor(g.maxMana(u) / 2)
    }),
    passive: {
        vi: "Kho Mana", en: "Mana Vault",
        descVi: "Tướng đeo +1 AP cho mỗi 2 mana tối đa (100 + 40 mana: +70 AP).",
        descEn: "The equipped champion gains +1 AP per 2 max mana (100 + 40 mana: +70 AP).",
    },
})

reg({
    id: "ban_dong_hanh_luden", name: {
        vi: "Bạn Đồng Hành Luden", en: "Luden's Companion"
    },
    stats: {
        ap: 30
    },
    manaCostMod(g, me, def, card) {
        if (def.mana === "all") return 0
        const base = typeof def.mana === "function" ? def.mana({
            g, side: me.side, self: me, card
        }) : def.mana ?? RULES.mage.defaultCost[def.key]
        return Math.floor((base * 0.7) / 5) * 5 - base // giảm 30%, làm tròn xuống bội 5
    },
    passive: {
        vi: "Giảm Giá", en: "Discount",
        descVi: "Chiêu của tướng đeo tốn ít hơn 30% mana (làm tròn xuống bội 5).",
        descEn: "Skills of the equipped champion cost 30% less mana (rounded down to a multiple of 5).",
    },
})

reg({
    id: "than_kiem_manamune", name: {
        vi: "Thần Kiếm Manamune", en: "Manamune"
    },
    stats: {
        ap: 40
    },
    passive: {
        vi: "Nạp Mana", en: "Mana Charge",
        descVi: "Đòn đánh của tướng đeo gây thêm {60% AP} sát thương phép và hồi 15 mana.",
        descEn: "Attacks of the equipped champion deal {60% AP} extra magic damage and restore 15 mana.",
    },
    hooks: {
        onAttack(g, me, d) {
            if (d.attacker.id === me.id) d.info.bonus.push({
                raw: 0.6 * g.ap(me), kind: "magic"
            })
        },
        onAttackHit(g, me, d) {
            if (d.attacker.id === me.id && !d.info.miss) g.gainMana(me,
                15)
        },
    },
})

reg({
    id: "mat_na_liandry", name: {
        vi: "Mặt Nạ Liandry", en: "Liandry's Torment"
    },
    stats: {
        ap: 40, hp: 150
    },
    passive: {
        vi: "Hoả Ngục", en: "Torment",
        descVi: "Chiêu của tướng đeo gây thêm sát thương phép bằng 6% máu tối đa của mỗi mục tiêu.",
        descEn: "Skills of the equipped champion deal extra magic damage equal to 6% of each target's max HP.",
    },
    hooks: {
        onDamage(g, me, d) {
            if (d.src?.id !== me.id || d.tag !== "skill" || d.amount <= 0 || !foe(me,
                d.target)) return
            if (!g.oncePerTurn(me,
                `liandry:${g.cur.uid ?? ""}:${d.target.id}`)) return
            g.damage(me,
                d.target,
                0.06 * d.target.maxHp,
                "magic",
                {
                    tag: "effect"
                })
        },
    },
})

reg({
    id: "quy_thu", name: {
        vi: "Quỷ Thư Morello", en: "Morellonomicon"
    },
    stats: {
        ap: 50, mr: 30
    },
    passive: {
        vi: "Quỷ Thư", en: "Grim Verse",
        descVi: "Lần đầu mỗi lượt chiêu của tướng đeo gây sát thương lên 1 địch: địch đó bị Câm Lặng đến hết lượt kế tiếp của nó.",
        descEn: "The first time each turn a skill of the equipped champion damages an enemy: that enemy is Silenced until the end of its next turn.",
    },
    hooks: {
        onDamage(g, me, d) {
            if (d.src?.id !== me.id || d.tag !== "skill" || d.amount <= 0 || !foe(me,
                d.target)) return
            if (g.oncePerTurn(me,
                "quy_thu")) g.status(d.target,
                "silence",
                nextTurns(g,
                    d.target.side))
        },
    },
})

reg({
    id: "gang_bao_thach", name: {
        vi: "Găng Bảo Thạch", en: "Jeweled Gauntlet"
    },
    stats: {
        ap: 40, crit: 0.3
    },
    spellCritMult: 1.75,
    passive: {
        vi: "Chiêu Chí Mạng", en: "Spell Crit",
        descVi: "Chiêu của tướng đeo chí mạng được theo tỉ lệ chí mạng của nó (×1,75).",
        descEn: "Skills of the equipped champion can crit using its crit chance (×1.75).",
    },
})

reg({
    id: "vuong_mien", name: {
        vi: "Vương Miện Bảo Hộ", en: "Crown of the Guardian"
    },
    stats: {
        ap: 50, armor: 45
    },
    stack: {
        max: 1, start: 1, vi: "Bảo Hộ", en: "Ward"
    },
    passive: {
        vi: "Bảo Hộ", en: "Ward",
        descVi: "Một lần mỗi mạng: khi máu tướng đeo xuống dưới 30%, nó không nhận sát thương đến hết lượt đó.",
        descEn: "Once per life: when the equipped champion drops below 30% HP, it takes no damage until the end of that turn.",
    },
    hooks: {
        onDamage(g, me, d) {
            if (d.target.id !== me.id || d.hpLost <= 0 || me.hp <= 0 || me.hp >= 0.3 * me.maxHp || cnt(me,
                "vuong_mien") < 1) return
            g.setStack(me,
                KEY("vuong_mien"),
                0)
            g.status(me,
                "invulnerable",
                1,
                {
                    until: g.s.turnNo
                })
        },
        onRespawn(g, me, d) {
            if (d.unit.id === me.id) g.setStack(me,
                KEY("vuong_mien"),
                1)
        },
    },
})

// ---------------- 5.4 Đỡ đòn ----------------
reg({
    id: "giap_warmog", name: {
        vi: "Giáp Máu Warmog", en: "Warmog's Armor"
    },
    stats: {
        hp: 400
    },
    passive: PURE,
})

reg({
    id: "giap_gargoyle", name: {
        vi: "Giáp Gargoyle", en: "Gargoyle's Stoneplate"
    },
    stats: {
        hp: 100, armor: 55, mr: 55
    },
    passive: PURE,
})

reg({
    id: "ao_choang_gai", name: {
        vi: "Áo Choàng Gai", en: "Thornmail"
    },
    stats: {
        armor: 80
    },
    passive: {
        vi: "Gai Nhọn", en: "Thorns",
        descVi: "Địch đánh trúng tướng đeo nhận {20 + 40% Giáp} sát thương phép.",
        descEn: "An enemy that hits the equipped champion with an attack takes {20 + 40% Armor} magic damage.",
    },
    hooks: {
        onAttackHit(g, me, d) {
            if (d.target.id !== me.id || d.info.miss || d.attacker.side === me.side || d.attacker.status !== "board") return
            g.damage(me,
                d.attacker,
                g.f(me,
                    "20 + 40% Giáp"),
                "magic",
                {
                    tag: "effect"
                })
        },
    },
})

reg({
    id: "tim_bang", name: {
        vi: "Tim Băng", en: "Frozen Heart"
    },
    stats: {
        armor: 60, hp: 100
    },
    passive: {
        vi: "Băng Giá", en: "Frost Aura",
        descVi: "Mọi tướng địch gây ít hơn 20% sát thương bằng đòn đánh.",
        descEn: "All enemies deal 20% less damage with attacks.",
    },
    modifyDamage: (_g, me, d) => (d.tag === "attack" && d.src && d.src.side !== me.side && d.target.side === me.side ? 0.8 : 1),
})

reg({
    id: "ao_choang_lua", name: {
        vi: "Áo Choàng Lửa", en: "Sunfire Cape"
    },
    stats: {
        hp: 200, armor: 30
    },
    passive: {
        vi: "Hoả Quyển", en: "Immolate",
        descVi: "Đầu lượt của bạn: mọi tướng địch nhận sát thương phép bằng 5% máu tối đa của tướng đeo.",
        descEn: "At the start of your turn: every enemy champion takes magic damage equal to 5% of the equipped champion's max HP.",
    },
    hooks: {
        onTurnStart(g, me, d) {
            if (d.side !== me.side) return
            for (const e of g.heroes(otherSide(me.side))) g.damage(me,
                e,
                0.05 * me.maxHp,
                "magic",
                {
                    tag: "effect"
                })
        },
    },
})

reg({
    id: "khien_hu_vo", name: {
        vi: "Khiên Hư Vô", en: "Void Shield"
    },
    stats: {
        hp: 250, mr: 40
    },
    passive: {
        vi: "Lỗ Hổng", en: "Exposed",
        descVi: "Tướng địch đối diện tướng đeo nhận thêm 30% sát thương từ mọi nguồn.",
        descEn: "The enemy champion opposite the equipped champion takes 30% more damage from all sources.",
    },
    modifyDamage: (g, me, d) => (g.opposite(me)?.id === d.target.id ? 1.3 : 1),
})

reg({
    id: "khan_giai_thuat", name: {
        vi: "Khăn Giải Thuật", en: "Quicksilver Sash"
    },
    stats: {
        mr: 55, hp: 150
    },
    passive: {
        vi: "Giải Thuật", en: "Cleanse",
        descVi: "Hiệu ứng khống chế đầu tiên mỗi lượt lên tướng đeo (Choáng, Câm Lặng, Mê, Đóng Băng) bị huỷ.",
        descEn: "The first crowd control effect each turn on the equipped champion (Stun, Silence, Charm, Freeze) is cancelled.",
    },
    hooks: {
        onBeforeStatus(g, me, d) {
            if (d.unit.id !== me.id || !["stun",
                "silence",
                "charm",
                "freeze",
                "disarm"].includes(d.id)) return
            const uid = curUid(g)
            const same = uid > 0 && me.stacks["itemT:khan_giai_thuat:uid"] === uid && me.stacks["itemT:khan_giai_thuat"] === g.s.turnNo // cùng 1 lá gây nhiều khống chế: huỷ hết
            if (same || g.oncePerTurn(me,
                "khan_giai_thuat")) {
                d.cancel = true
                me.stacks["itemT:khan_giai_thuat:uid"] = uid
                me.stacks["itemT:khan_giai_thuat"] = g.s.turnNo
            }
        },
    },
})

reg({
    id: "giap_thien_than", name: {
        vi: "Giáp Thiên Thần", en: "Guardian Angel"
    },
    stats: {
        armor: 35, mr: 35
    },
    stack: {
        max: 1, start: 1, vi: "Thiên Hộ", en: "Rebirth"
    },
    passive: {
        vi: "Thiên Hộ", en: "Rebirth",
        descVi: "Lần đầu tướng đeo bị hạ trong trận: nó đứng dậy ngay tại đường với 50% máu và đối thủ không nhận mạng.",
        descEn: "The first time the equipped champion would be taken down in a match: it stands back up in its lane with 50% HP and the opponent gains no life.",
    },
    hooks: {
        onLethal(g, me, d) {
            if (d.target.id !== me.id || me.hp > 0 || cnt(me,
                "giap_thien_than") < 1) return
            g.setStack(me,
                KEY("giap_thien_than"),
                0)
            g.surviveWith(me,
                0.5 * me.maxHp)
        },
    },
})

// ---------------- 5.5 Trợ thủ và bảo vệ ----------------
reg({
    id: "day_chuyen_chuoc_toi", name: {
        vi: "Dây Chuyền Chuộc Tội", en: "Redemption"
    },
    stats: {
        hp: 200
    },
    healGivenMult: 1.6,
    passive: {
        vi: "Chuộc Tội", en: "Redemption",
        descVi: "Hồi máu, Khiên và Giáp mà tướng đeo ban ra mạnh hơn 60%.",
        descEn: "Healing, Shields and Armor granted by the equipped champion are 60% stronger.",
    },
})

reg({
    id: "vuot_rong", name: {
        vi: "Vuốt Rồng", en: "Dragon's Claw"
    },
    stats: {
        mr: 55, hp: 150
    },
    healMult: 1.6,
    passive: {
        vi: "Vuốt Rồng", en: "Dragon's Claw",
        descVi: "Hồi máu và Khiên tướng đeo nhận mạnh hơn 60%.",
        descEn: "Healing and Shields the equipped champion receives are 60% stronger.",
    },
})

reg({
    id: "loi_the_ho_ve", name: {
        vi: "Lời Thề Hộ Vệ", en: "Knight's Vow"
    },
    stats: {
        armor: 40, hp: 150
    },
    shareDamage: 0.25,
    passive: {
        vi: "Hộ Vệ", en: "Pledge",
        descVi: "Tướng đeo gánh thay 25% sát thương mọi đồng minh khác nhận.",
        descEn: "The equipped champion takes 25% of the damage every other ally receives.",
    },
})

reg({
    id: "mu_thich_nghi", name: {
        vi: "Mũ Thích Nghi", en: "Adaptive Helm"
    },
    stats: {
        ap: 40, mr: 50
    },
    passive: {
        vi: "Thích Nghi", en: "Adapt",
        descVi: "Chiêu địch đầu tiên mỗi lượt có tướng đeo là mục tiêu không ảnh hưởng tướng đeo (lá địch vẫn bị tiêu).",
        descEn: "The first enemy skill each turn that targets the equipped champion does not affect it (the enemy card is still spent).",
    },
    hooks: {
        onTargeted(g, me, d) {
            if (d.src.side === me.side || !d.affected.includes(me.id) || d.immune.includes(me.id)) return
            if (g.oncePerTurn(me,
                "mu_thich_nghi")) d.immune.push(me.id)
        },
    },
})

// ======================================================================
// Bảng ghép 8x8 (ITEMS_V2 mục 4): mỗi cặp mảnh ra đúng 1 món
// ======================================================================
/** Thứ tự 8 mảnh (khớp cg.COMPONENTS) */
const PIECES = ["kiem_dai",
    "gay_qua_kho",
    "cung_go",
    "gang_tay",
    "giap_luoi",
    "ao_choang",
    "dai_khong_lo",
    "nuoc_mat"] as const
/** Nửa trên của bảng (hàng i, cột j >= i) theo thứ tự PIECES */
const RECIPE_ROWS: string[][] = [
    ["kiem_tu_than",
        "sung_hextech",
        "loi_nhac_tu_vong",
        "vo_cuc_kiem",
        "ao_choang_bong_toi",
        "huyet_kiem",
        "sterak",
        "giao_shojin"],
    ["mu_rabadon",
        "cuong_dao",
        "gang_bao_thach",
        "vuong_mien",
        "quy_thu",
        "mat_na_liandry",
        "truong_truong_sinh"],
    ["dai_bac",
        "diet_khong_lo",
        "tim_bang",
        "sat_thu_kraken",
        "y_chi_titan",
        "than_kiem_manamune"],
    ["ke_thu_thap",
        "giap_thien_than",
        "khan_giai_thuat",
        "tim_khong_than",
        "ban_dong_hanh_luden"],
    ["ao_choang_gai",
        "giap_gargoyle",
        "ao_choang_lua",
        "loi_the_ho_ve"],
    ["vuot_rong",
        "khien_hu_vo",
        "mu_thich_nghi"],
    ["giap_warmog",
        "day_chuyen_chuoc_toi"],
    ["bua_lam"],
]
const pairKey = (a: string, b: string) => [a,
    b].sort().join("+")
/** Công thức: khoá "mảnhA+mảnhB" (đã sắp theo chữ cái) -> id món */
export const CARD_RECIPES: Record<string, string> = {
}
RECIPE_ROWS.forEach((row, i) => row.forEach((id, k) => {
    CARD_RECIPES[pairKey(PIECES[i],
        PIECES[i + k])] = id
}))
/** Ghép 2 mảnh -> id món huyền thoại của chế độ thẻ (hoặc undefined). Thay cho combine() của gói items cũ. */
export const cardCombine = (a: string, b: string): string | undefined => CARD_RECIPES[pairKey(a,
    b)]
/** Công thức ngược: món -> 2 mảnh */
export function cardRecipeOf(itemId: string): [string, string] | undefined {
    const k = Object.keys(CARD_RECIPES).find((x) => CARD_RECIPES[x] === itemId)
    return k ? (k.split("+") as [string, string]) : undefined
}
/** Id 36 món huyền thoại (không gồm mảnh) */
export const LEGEND_ITEM_IDS: string[] = [...new Set(Object.values(CARD_RECIPES))]

// ======================================================================
// Engine: tra cứu theo tướng
// ======================================================================
/** Các id đồ KHÁC NHAU của tướng (nội tại chỉ chạy 1 lần mỗi id dù đeo 2 bản) */
export function distinctItems(u: Unit): string[] {
    return u.items.length < 2 ? u.items : [...new Set(u.items)]
}
/** Tướng đeo đồ cho phép đòn đánh chọn mọi tướng địch (Đại Bác Liên Thanh) */
export function hasAnyTarget(u: Unit): boolean {
    return u.items.some((id) => CARD_ITEMS[id]?.anyTarget)
}
/** Tích hệ số hồi máu/Khiên nhận của đồ */
export function itemHealMult(u: Unit): number {
    let m = 1
    for (const id of distinctItems(u)) m *= CARD_ITEMS[id]?.healMult ?? 1
    return m
}

// ======================================================================
// Chữ hiển thị (VI/EN): tên, dòng chỉ số, nội tại
// ======================================================================
type Lang = "vi" | "en";
const STAT_ORDER: (keyof UnitStats)[] = ["atk",
    "ap",
    "hp",
    "armor",
    "mr",
    "atkMult",
    "extraAtk",
    "spellAmp",
    "dmgAmp",
    "crit",
    "critDmg",
    "lethality",
    "magicPen",
    "lifesteal",
    "omnivamp"]
const PCT = new Set<keyof UnitStats>(["atkMult",
    "extraAtk",
    "spellAmp",
    "dmgAmp",
    "crit",
    "critDmg",
    "lifesteal",
    "omnivamp"])
const STAT_NAME: Record<Lang, Record<keyof UnitStats, string>> = {
    vi: {
        atk: "AD", ap: "AP", hp: "Máu", armor: "Giáp", mr: "Kháng phép", crit: "Chí mạng", critDmg: "sát thương chí mạng", atkMult: "AD", lethality: "Sát lực", magicPen: "Xuyên phép",
        spellAmp: "sát thương chiêu", dmgAmp: "sát thương", lifesteal: "Hút máu", omnivamp: "Hút máu toàn phần", extraAtk: "sát thương đòn đánh",
    },
    en: {
        atk: "AD", ap: "AP", hp: "HP", armor: "Armor", mr: "MR", crit: "Crit chance", critDmg: "crit damage", atkMult: "AD", lethality: "Lethality", magicPen: "Magic pen",
        spellAmp: "skill damage", dmgAmp: "damage", lifesteal: "Life steal", omnivamp: "Omnivamp", extraAtk: "attack damage",
    },
}

/** Dòng chỉ số: "+40 AD, +5% AD, +25% Chí mạng" */
export function itemStatLine(stats: Partial<UnitStats>, lang: Lang = "vi"): string {
    const num = (x: number) => String(Math.round(x * 10) / 10).replace(".",
        lang === "vi" ? "," : ".")
    return STAT_ORDER.filter((k) => stats[k]).map((k) => (PCT.has(k) ? `+${num(stats[k]! * 100)}% ${STAT_NAME[lang][k]}` : `+${num(stats[k]!)} ${STAT_NAME[lang][k]}`)).join(", ")
}
/** Dòng chỉ số đầy đủ của món: chỉ số + AD/AP thích ứng + mana */
function fullStatLine(def: CardItemDef, lang: Lang): string {
    const parts: string[] = []
    const base = itemStatLine(def.stats,
        lang)
    if (base) parts.push(base)
    if (def.adaptive) parts.push(lang === "vi" ? `+${def.adaptive} AD/AP thích ứng` : `+${def.adaptive} adaptive AD/AP`)
    if (def.maxMana) parts.push(lang === "vi" ? `+${def.maxMana} mana tối đa` : `+${def.maxMana} max mana`)
    if (def.manaRegen) parts.push(lang === "vi" ? `+${def.manaRegen} hồi mana mỗi lượt` : `+${def.manaRegen} mana regen per turn`)
    return parts.join(", ")
}

export interface ItemText {
  name: string;
  /** Dòng chỉ số, ví dụ "+40 AD, +5% AD" */
  stats: string;
  /** Tên nội tại ("" nếu là mảnh Đồ) */
  passive: string;
  /** Chữ nội tại; công thức {…} đã tính nếu truyền g và u (tướng đeo) */
  desc: string;
  /** Bộ đếm hiện (nếu có): tên + tối đa */
  counter?: { name: string; max: number };
}
/** Chữ của món đồ chế độ thẻ (mảnh hoặc huyền thoại). Không biết id thì undefined. */
export function itemText(itemId: string, lang: Lang = "vi", g?: Game, u?: Unit): ItemText | undefined {
    const def = CARD_ITEMS[itemId]
    if (!def) return undefined
    const raw = lang === "vi" ? def.passive.descVi : def.passive.descEn
    return {
        name: def.name[lang], stats: fullStatLine(def,
            lang), passive: def.passive[lang], desc: g && u ? formulaText(raw,
            g,
            u) : raw,
        counter: def.stack ? {
            name: def.stack[lang], max: def.stack.max
        } : undefined,
    }
}
