// Đồ chế độ thẻ bài V4 (bản duyệt 30/10/2026): 8 mảnh (đeo riêng được) + 36 món huyền thoại, mỗi món 2 nội tại.
// Engine (game.ts) đọc CARD_ITEMS: stats/adaptive/mult/bonus -> Game.stats, hooks -> Game.hook, dmgMult/takenMult/modifyDamage -> Game.damage,
// healMult / healGivenMult -> Game.heal/shield, shareDamage -> Game.damage, spellCritMult -> Game.damage, manaRegen/manaCostMod -> mana đội,
// anyTarget -> attackTargets. Bảng ghép 8x8 nằm ở CARD_RECIPES (cardCombine).
// Mana CHUNG của đội (bể 80/200, chốt 31/10/2026): đồ KHÔNG có chỉ số "+X mana tối đa". Mỗi món dính mana mang rõ 1 trong 2 loại hiệu ứng:
//   loại 1 = chiêu của CHÍNH người đeo rẻ hơn (manaCostMod, kẹp >= 0); loại 2 = hồi bể đội (manaRegen mỗi lượt, hoặc g.gainMana(me, n, "restore")).
// Hồi chiêu "N lượt của người đeo" đếm theo s.ownTurns của phe người đeo, không reset khi chết/tháo đồ.
import {
    formulaText
} from "./formula"
import type {
    Game, UnitStats
} from "./game"
import {
    RULES, otherSide,
    type Card, type DamageKind, type HeroHooks, type ShieldKind, type Side, type SkillDef, type Unit
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
  /** Nhân sát thương cho MỌI sát thương trong trận khi tướng đeo đang trên sân (xem HeroDef.modifyDamage). Không gọi g.damage bên trong. */
  modifyDamage?(g: Game, me: Unit, d: { src?: Unit; target: Unit; kind: DamageKind; tag: string; crit?: boolean }): number;
  /** Tướng đeo gánh thay phần này (0..1) của mọi sát thương đồng minh khác nhận (V4 không món nào dùng; giữ API) */
  shareDamage?: number;
  /** Nhân hồi máu/Khiên BAN RA của tướng đeo (g.heal/g.shield có src = tướng đeo; Giáp ban ra nhân g.givenMult) */
  healGivenMult?: number;
  /** Chiêu (tag "skill") của tướng đeo chí mạng theo tỉ lệ chí mạng của nó với hệ số này (Găng Bảo Thạch, Vọng Âm Luden: 2,25) */
  spellCritMult?: number;
  /** @deprecated Chốt 31/10/2026: đồ không còn "+X mana tối đa" (không món nào đặt; giữ trường cho engine đọc itemManaOf) */
  maxMana?: number;
  /** Mana loại 2: + hồi mana đội mỗi đầu lượt của bạn khi người đeo còn trên sân */
  manaRegen?: number;
  /** Chênh lệch chi phí mana mỗi lần tung chiêu (âm = rẻ hơn; kết quả kẹp >= 0) */
  manaCostMod?(g: Game, me: Unit, def: SkillDef, card: Card): number;
  hooks?: HeroHooks;
  /** Hook của món vẫn chạy khi người đeo đã chết (giữ ô): hiệu ứng đã đặt tiếp tục (Tro Tàn của Liandry) */
  offBoardHooks?: (keyof HeroHooks)[];
}

export const CARD_ITEMS: Record<string, CardItemDef> = {
}

// ---------------- Trợ giúp ----------------
const KEY = (id: string) => `item:${id}`
/** Khoá kỹ thuật (không hiện, không bắn onHeroStack): `itemT:...` */
const T = (...p: (string | number)[]) => `itemT:${p.join(":")}`
const cnt = (u: Unit, id: string) => u.stacks[KEY(id)] ?? 0
/** Tổng điểm `maxMana` trên đồ của u (chốt 31/10: không món nào còn dùng, luôn 0; giữ export cho engine) */
export const itemManaOf = (u: Unit) => distinctItems(u).reduce((n, id) => n + (CARD_ITEMS[id]?.maxMana ?? 0),
    0)
/** Mana loại 1: chiêu của CHÍNH người đeo rẻ hơn `n` (engine kẹp >= 0; không áp cho mức chi đã cam kết, vd Lux R) */
const cheaper = (n: number, pred?: (def: SkillDef) => boolean) => (_g: Game, _me: Unit, def: SkillDef) => (def.mana === "all" || (pred && !pred(def)) ? 0 : -n)
/** Tướng địch (không phải vật triệu hồi) đang trên sân */
const foe = (me: Unit, t: Unit | undefined): t is Unit => !!t && t.side !== me.side && !t.token && t.status === "board"
/** Số lượt (tính theo chủ `side`) để trạng thái kéo dài "đến hết lượt kế tiếp của side": nếu đang là lượt của side thì phải tính cả lượt sau */
const nextTurns = (g: Game, side: Side) => (g.s.active === side ? 2 : 1)
/** Id lá đang giải quyết dạng số (để gom nhiều gói sát thương của cùng 1 lá) */
const curUid = (g: Game) => Number((g.cur.uid ?? "").replace(/\D/g,
    "")) || 0
const uidNum = (c: Card | undefined) => Number((c?.uid ?? "").replace(/\D/g,
    "")) || 0
/** Số lượt CỦA MÌNH phe `side` đã bắt đầu (đồng hồ hồi chiêu của đồ) */
const ownTurn = (g: Game, side: Side) => g.s.ownTurns?.[side] ?? 0
/** Hồi chiêu của đồ: sẵn sàng chưa / bắt đầu hồi `n` lượt của người đeo */
const cdReady = (g: Game, me: Unit, key: string) => (me.stacks[T("cd",
    key)] ?? -1e9) <= ownTurn(g,
    me.side)
const cdStart = (g: Game, me: Unit, key: string, n: number) => { me.stacks[T("cd",
    key)] = ownTurn(g,
    me.side) + n }
/** Đòn đánh của tướng đeo vừa trúng (không trượt) */
const myHit = (me: Unit, d: { attacker: Unit; info: { miss: boolean } }) => d.attacker.id === me.id && !d.info.miss
/** Khiên tới hết lượt kế tiếp của người đeo */
const shieldNext = (g: Game, me: Unit, tgt: Unit, n: number, kind: ShieldKind = "all") => g.shield(me,
    tgt,
    n,
    {
        kind, turns: nextTurns(g,
            me.side), of: me.side
    })
/** Khiên tới hết lượt hiện tại */
const shieldThisTurn = (g: Game, me: Unit, tgt: Unit, n: number, kind: ShieldKind = "all") => g.shield(me,
    tgt,
    n,
    {
        kind, turns: 1, of: g.s.active
    })
/** Máu vừa tụt từ trên `pct` xuống `pct` hoặc thấp hơn (sau gói sát thương, còn sống) */
const crossed = (me: Unit, hpLost: number, pct: number) => hpLost > 0 && me.hp > 0 && me.hp <= pct * me.maxHp && me.hp + hpLost > pct * me.maxHp
/** Hệ số tương đương "bỏ qua `pen` Giáp/Kháng phép" khi kháng hiệu dụng (sau xuyên sẵn có) là `eff` */
const penMult = (eff: number, pen: number) => (100 + Math.max(0,
    eff)) / (100 + Math.max(0,
    eff - pen))
/** Chuỗi đòn trúng liên tiếp cùng 1 tướng địch trong lượt (Nanh Nashor, Móc Diệt Thủy Quái). Trả số đòn liên tiếp tính cả đòn này. */
function streak(g: Game, me: Unit, key: string, t: Unit): number {
    const tk = T(key,
            "turn"), pre = T(key,
            "id",
            "")
    if (me.stacks[tk] !== g.s.turnNo) me.stacks[tk] = g.s.turnNo
    else {
        const n = me.stacks[pre + t.id]
        if (n) return (me.stacks[pre + t.id] = n + 1)
    }
    for (const k of Object.keys(me.stacks)) if (k.startsWith(pre)) delete me.stacks[k]
    return (me.stacks[pre + t.id] = 1)
}
/** Đòn trúng thứ không phải tướng địch: mất nhịp chuỗi */
function breakStreak(me: Unit, key: string) { for (const k of Object.keys(me.stacks)) if (k.startsWith(T(key,
    "id",
    ""))) delete me.stacks[k] }
/** > 0 khi đang hồi máu bằng nội tại đồ (Dây Chuyền Chuộc Tội không tính hồi máu của đồ) */
let itemHealDepth = 0
/** Tự hồi máu bằng nội tại đồ; có Giáp Máu Warmog thì 50% phần hồi dư thành Khiên trắng của Warmog (tối đa 15% máu tối đa) */
function healSelf(g: Game, me: Unit, amount: number) {
    const missing = me.maxHp - me.hp
    itemHealDepth++
    let real = 0
    try { real = g.heal(me,
        me,
        amount) } finally { itemHealDepth-- }
    if (!me.items.includes("giap_warmog") || real < missing) return
    const over = Math.max(0,
        amount - missing)
    const k = T("giap_warmog",
        "sh")
    const left = Math.min(me.stacks[k] ?? 0,
        me.shield) // phần Khiên Warmog còn lại (Khiên trắng có thể đã bị ăn)
    const give = Math.min(0.5 * over,
        0.15 * me.maxHp - left)
    if (give < 1) return
    g.shield(me,
        me,
        give)
    me.stacks[k] = left + Math.round(give)
}
/** Đặt hp = 0 rồi cho đi qua chuỗi cứu chết hợp lệ (RULES.lethalOrder) trước khi hạ (Súng Hải Tặc) */
function executeWithSaves(g: Game, killer: Unit, t: Unit) {
    const before = t.hp
    t.hp = 0
    g.lethalPipeline({
        target: t, src: killer, hpLost: before, over: 0, kind: "true", tag: "effect"
    })
    if (t.hp <= 0 && t.status === "board") g.kill(t,
        killer)
}
/** Thẻ "đã kích hoạt trong lượt" của 1 lá (gom các gói sát thương cùng lá) */
const sameCard = (g: Game, me: Unit, key: string) => me.stacks[T(key,
    "turn")] === g.s.turnNo && me.stacks[T(key,
    "uid")] === curUid(g) && curUid(g) > 0

/** Đăng ký món; món có bộ đếm tự đặt `start` (mặc định 0) khi được đeo (chỉ lần đeo đầu của id đó) */
function reg(def: CardItemDef) {
    if (def.stack) {
        const st = def.stack, prev = def.hooks?.onEquip
        def.hooks = {
            ...def.hooks,
            onEquip(g, me, d) {
                if (d.unit.id === me.id && d.item === def.id && me.items.filter((x) => x === def.id).length === 1 && me.stacks[KEY(def.id)] === undefined) g.setStack(me,
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

// ======================================================================
// 8 mảnh (đeo riêng được)
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
        ap: 30
    })
piece("cung_go",
    "Cung Gỗ",
    "Recurve Bow",
    {
        attackSpeed: 20
    })
piece("gang_tay",
    "Găng Đấu Tập",
    "Sparring Gloves",
    {
        crit: 0.15
    })
piece("giap_luoi",
    "Giáp Lưới",
    "Chain Vest",
    {
        armor: 30
    })
piece("ao_choang",
    "Áo Choàng Bạc",
    "Negatron Cloak",
    {
        mr: 30
    })
piece("dai_khong_lo",
    "Đai Khổng Lồ",
    "Giant's Belt",
    {
        hp: 80
    })
piece("nuoc_mat",
    "Nước Mắt Nữ Thần",
    "Tear of the Goddess",
    {
        spellAmp: 0.15
    },
    {
        manaCostMod: cheaper(5)
    },
    "Chiêu của người đeo tốn ít hơn 5 mana.",
    "The wearer's skills cost 5 less mana.")

// ======================================================================
// 36 món huyền thoại
// ======================================================================

// ---------------- Hàng Kiếm Dài ----------------
reg({
    id: "kiem_tu_than", name: {
        vi: "Kiếm Tử Thần", en: "Deathblade"
    },
    stats: {
        atk: 40
    },
    bonus: (g, u) => ({
        atk: 30 + (["fighter",
            "assassin"].includes(g.role(u)) ? 20 : 0)
    }),
    passive: {
        vi: "Hùng Cường · Chiến Binh", en: "Might · Warrior",
        descVi: "Nhận thêm 30 AD. Nếu người đeo là Đấu Sĩ hoặc Sát Thủ: nhận thêm 20 AD.",
        descEn: "Gain 30 more AD. If the wearer is a Fighter or Assassin: gain 20 more AD.",
    },
})

reg({
    id: "sung_hextech", name: {
        vi: "Kiếm Súng Hextech", en: "Hextech Gunblade"
    },
    stats: {
        atk: 25, ap: 30
    },
    passive: {
        vi: "Hấp Thụ · Ma Đạn", en: "Siphon · Hex Shot",
        descVi: "Hồi máu bằng 15% sát thương thực tế người đeo gây ra. Trong lượt của bạn, tướng địch trúng chiêu gây sát thương của người đeo bị Đánh Dấu Hextech tới hết lượt; đòn đánh đầu tiên của người đeo trúng mục tiêu có dấu gây thêm {20% AD + 40% AP} sát thương phép và tiêu dấu (1 lần/lượt, không chí mạng).",
        descEn: "Heal for 15% of the actual damage the wearer deals. During your turn, enemies hit by the wearer's damaging skill are Hextech Marked until end of turn; the wearer's first attack hitting a marked target deals {20% AD + 40% AP} extra magic damage and consumes it (once per turn, cannot crit).",
    },
    hooks: {
        onDamage(g, me, d) {
            if (d.src?.id !== me.id || d.target.id === me.id || d.target.side === me.side) return
            const dealt = d.hpLost + d.absorbed
            if (dealt > 0 && me.status === "board") healSelf(g,
                me,
                0.15 * dealt)
            if (d.tag === "skill" && d.amount > 0 && g.s.active === me.side && foe(me,
                d.target)) me.stacks[T("hex",
                d.target.id)] = g.s.turnNo
        },
        onAttack(g, me, d) {
            if (!myHit(me,
                d) || g.s.active !== me.side || me.stacks[T("hex",
                d.target.id)] !== g.s.turnNo) return
            if (!g.oncePerTurn(me,
                "sung_hextech")) return
            delete me.stacks[T("hex",
                d.target.id)]
            d.info.bonus.push({
                raw: g.f(me,
                    "20% AD + 40% AP"), kind: "magic"
            })
        },
    },
})

reg({
    id: "cuong_dao", name: {
        vi: "Cuồng Đao Guinsoo", en: "Guinsoo's Rageblade"
    },
    stats: {
        atk: 25, attackSpeed: 25
    },
    stack: {
        max: 20, vi: "Cuồng Nộ", en: "Wrath"
    },
    bonus: (_g, u) => ({
        attackSpeed: 5 * cnt(u,
            "cuong_dao")
    }),
    passive: {
        vi: "Cuồng Nộ · Suy Vong", en: "Wrath · Decay",
        descVi: "Mỗi đòn đánh thực sự trúng tướng địch: +5 Tốc Đánh vĩnh viễn (tối đa +100, giữ qua lượt và qua chết). Mỗi đòn đánh trúng gây thêm sát thương vật lý bằng 4% máu hiện tại của mục tiêu trước đòn đó (không chí mạng).",
        descEn: "Each attack that actually hits an enemy champion: +5 Attack Speed permanently (max +100, kept across turns and death). Each attack hit deals extra physical damage equal to 4% of the target's current HP before the hit (cannot crit).",
    },
    hooks: {
        onAttack(_g, me, d) {
            if (myHit(me,
                d) && d.target.hp > 0) d.info.bonus.push({
                raw: 0.04 * d.target.hp, kind: "physical"
            })
        },
        onAttackHit(g, me, d) {
            if (myHit(me,
                d) && foe(me,
                d.target)) g.stack(me,
                KEY("cuong_dao"),
                1,
                20)
        },
    },
})

reg({
    id: "vo_cuc_kiem", name: {
        vi: "Vô Cực Kiếm", en: "Infinity Edge"
    },
    stats: {
        atk: 25, crit: 0.25
    },
    stack: {
        max: 2, vi: "Tích Lực", en: "Build-up"
    },
    passive: {
        vi: "Cạnh Sắc · Tích Lực", en: "Keen Edge · Build-up",
        descVi: "Đòn chí mạng bỏ qua 15 Giáp của mục tiêu. Sau 2 đòn đánh liên tiếp trúng tướng địch không chí mạng, đòn kế tiếp trúng tướng địch chắc chắn chí mạng. Không tăng hệ số chí mạng mặc định ×2,25.",
        descEn: "Critical attacks ignore 15 Armor. After 2 consecutive non-critical attacks on enemy champions, the next attack on an enemy champion is a guaranteed critical. Does not raise the default ×2.25 critical multiplier.",
    },
    hooks: {
        onAttack(_g, me, d) {
            if (d.attacker.id !== me.id) return
            d.info.critArmorPen = 15
            if (cnt(me,
                "vo_cuc_kiem") >= 2 && !d.info.noCrit && foe(me,
                d.target)) d.info.crit = true
        },
        onAttackHit(g, me, d) {
            if (!myHit(me,
                d) || d.target.token || d.target.side === me.side) return // mục tiêu có thể vừa chết vì đòn này: vẫn tính
            if (d.info.crit) g.setStack(me,
                KEY("vo_cuc_kiem"),
                0)
            else g.stack(me,
                KEY("vo_cuc_kiem"),
                1,
                2)
        },
    },
})

reg({
    id: "ao_choang_bong_toi", name: {
        vi: "Áo Choàng Bóng Tối", en: "Edge of Night"
    },
    stats: {
        atk: 25, armor: 25
    },
    passive: {
        vi: "Giáp Bóng Đêm · Thoát Chết", en: "Night Veil · Escape",
        descVi: "Đầu lượt của bạn: người đeo nhận 50 Khiên vật lý (vàng), không cộng dồn qua các lượt. Khi sắp bị hạ gục: giữ lại 1 máu và miễn sát thương tới hết lượt hiện tại (hồi chiêu 10 lượt của người đeo).",
        descEn: "Start of your turn: the wearer gains a 50 physical (yellow) Shield that does not stack across turns. When it would be taken down: it stays at 1 HP and is immune to damage until end of the current turn (10-turn cooldown of the wearer).",
    },
    hooks: {
        onTurnStart(g, me, d) {
            if (d.side !== me.side) return
            g.shield(me,
                me,
                50,
                {
                    kind: "physical", turns: 1, of: otherSide(me.side)
                }) // hết hạn cuối lượt địch: không mang sang lượt sau
        },
        onLethal(g, me, d) {
            if (d.target.id !== me.id || me.hp > 0 || !cdReady(g,
                me,
                "ao_choang_bong_toi")) return
            cdStart(g,
                me,
                "ao_choang_bong_toi",
                10)
            g.surviveWith(me,
                1)
            g.status(me,
                "invulnerable",
                1,
                {
                    until: g.s.turnNo
                })
        },
    },
})

reg({
    id: "dao_tim", name: {
        vi: "Đao Tím", en: "Wit's End"
    },
    stats: {
        atk: 25, mr: 25
    },
    passive: {
        vi: "Lưỡi Đao Ma Thuật · Phòng Tuyến Tím", en: "Arcane Blade · Violet Line",
        descVi: "Đòn đánh trúng gây thêm {15 + 10% Kháng phép} sát thương phép (tối đa 35, không chí mạng). Khi máu vừa tụt từ trên 50% xuống 50% hoặc thấp hơn mà còn sống: nhận 120 Khiên phép (xanh) tới hết lượt kế tiếp của người đeo (hồi chiêu 5 lượt của người đeo).",
        descEn: "Attack hits deal {15 + 10% MR} extra magic damage (max 35, cannot crit). When HP drops from above 50% to 50% or lower and the wearer survives: gain a 120 magic (blue) Shield until end of the wearer's next turn (5-turn cooldown of the wearer).",
    },
    hooks: {
        onAttack(g, me, d) {
            if (myHit(me,
                d)) d.info.bonus.push({
                raw: Math.min(35,
                    g.f(me,
                        "15 + 10% Kháng phép")), kind: "magic"
            })
        },
        onDamage(g, me, d) {
            if (d.target.id !== me.id || !crossed(me,
                d.hpLost,
                0.5) || !cdReady(g,
                me,
                "dao_tim")) return
            cdStart(g,
                me,
                "dao_tim",
                5)
            shieldNext(g,
                me,
                me,
                120,
                "magic")
        },
    },
})

reg({
    id: "sterak", name: {
        vi: "Móng Vuốt Sterak", en: "Sterak's Gage"
    },
    stats: {
        atk: 20, hp: 120
    },
    bonus: (_g, u) => ({
        atk: u.maxHp > 0 ? Math.min(20,
            3 * Math.floor(10 * Math.max(0,
                u.maxHp - u.hp) / u.maxHp + 1e-9)) : 0
    }),
    passive: {
        vi: "Càng Đau Càng Mạnh · Thịnh Nộ Sinh Tồn", en: "Pain Fuel · Survival Fury",
        descVi: "Mỗi 10% máu tối đa đã mất: +3 AD (tối đa +20, tính lại theo máu đang thiếu). Khi máu vừa tụt từ trên 40% xuống 40% hoặc thấp hơn mà còn sống: nhận Khiên {30% máu tối đa} tới hết lượt kế tiếp của người đeo (hồi chiêu 5 lượt của người đeo).",
        descEn: "Every 10% max HP missing: +3 AD (max +20, recalculated from missing HP). When HP drops from above 40% to 40% or lower and the wearer survives: gain a Shield of {30% max HP} until end of the wearer's next turn (5-turn cooldown of the wearer).",
    },
    hooks: {
        onDamage(g, me, d) {
            if (d.target.id !== me.id || !crossed(me,
                d.hpLost,
                0.4) || !cdReady(g,
                me,
                "sterak")) return
            cdStart(g,
                me,
                "sterak",
                5)
            shieldNext(g,
                me,
                me,
                0.3 * me.maxHp)
        },
    },
})

reg({
    id: "giao_shojin", name: {
        vi: "Ngọn Giáo Shojin", en: "Spear of Shojin"
    },
    stats: {
        atk: 25
    },
    passive: {
        vi: "Nạp Năng Lượng · Nhịp Chiêu", en: "Energize · Skill Rhythm",
        descVi: "Mỗi đòn đánh trúng tướng địch: đội hồi 5 mana (tối đa 10 mỗi lượt). Nếu người đeo đánh trúng trong lượt của bạn: lá chiêu gây sát thương đầu tiên của nó ở lượt kế tiếp của bạn gây thêm 25% sát thương (1 lần/lượt, không cộng dồn).",
        descEn: "Each attack hit on an enemy champion: your team restores 5 mana (max 10 per turn). If the wearer lands an attack during your turn: its first damaging skill card in your next turn deals 25% more damage (once per turn, does not stack).",
    },
    dmgMult(g, me, d) {
        if (d.tag !== "skill" || g.s.active !== me.side || !curUid(g)) return 1
        if (sameCard(g,
            me,
            "shojin_use")) return 1.25
        const now = ownTurn(g,
            me.side)
        if (me.stacks[T("shojin_use",
            "turn")] === g.s.turnNo) return 1 // đã cường hoá 1 lá trong lượt này
        if (me.stacks[T("shojin",
            "c")] !== now - 1 && me.stacks[T("shojin",
            "p")] !== now - 1) return 1
        me.stacks[T("shojin_use",
            "turn")] = g.s.turnNo
        me.stacks[T("shojin_use",
            "uid")] = curUid(g)
        return 1.25
    },
    hooks: {
        onAttackHit(g, me, d) {
            if (!myHit(me,
                d) || !foe(me,
                d.target)) return
            if (g.bumpTurnCount(me,
                "giao_shojin") <= 2) g.gainMana(me,
                5,
                "restore") // mana loại 2: tối đa 10 mỗi lượt
            if (g.s.active !== me.side) return
            const now = ownTurn(g,
                    me.side), c = T("shojin",
                    "c")
            if (me.stacks[c] !== now) { me.stacks[T("shojin",
                "p")] = me.stacks[c] ?? -1; me.stacks[c] = now }
        },
    },
})

// ---------------- Hàng Gậy Quá Khổ ----------------
reg({
    id: "mu_rabadon", name: {
        vi: "Mũ Phù Thủy Rabadon", en: "Rabadon's Deathcap"
    },
    stats: {
        ap: 50
    },
    mult: {
        ap: 0.3
    },
    stack: {
        max: 30, vi: "Thông Tuệ", en: "Insight"
    },
    bonus: (_g, u) => ({
        ap: cnt(u,
            "mu_rabadon")
    }),
    passive: {
        vi: "Đại Pháp Sư · Thông Tuệ", en: "Archmage · Insight",
        descVi: "Tổng AP +30% (kể cả AP từ Thông Tuệ). Lần đầu mỗi lượt người đeo giải quyết thành công 2 lá chiêu khác tên: +10 AP vĩnh viễn (tối đa +30, giữ qua chết).",
        descEn: "Total AP +30% (including AP from Insight). The first time each turn the wearer resolves 2 differently named skill cards: +10 AP permanently (max +30, kept through death).",
    },
    hooks: {
        onCast(g, me, d) {
            if (d.caster.id !== me.id) return
            me.stacks[T("rab",
                d.card.copyOf ?? d.card.id)] = g.s.turnNo
            const names = Object.keys(me.stacks).filter((k) => k.startsWith(T("rab",
                "")) && me.stacks[k] === g.s.turnNo).length
            if (names >= 2 && g.oncePerTurn(me,
                "mu_rabadon")) g.stack(me,
                KEY("mu_rabadon"),
                10,
                30)
        },
    },
})

reg({
    id: "nanh_nashor", name: {
        vi: "Nanh Nashor", en: "Nashor's Tooth"
    },
    stats: {
        ap: 35, attackSpeed: 25
    },
    passive: {
        vi: "Nanh Phép · Bào Mòn", en: "Spell Fang · Erosion",
        descVi: "Đòn đánh trúng gây thêm {15 + 25% AP} sát thương phép (không chí mạng). Sau 3 đòn đánh trúng liên tiếp cùng 1 tướng địch trong lượt: mục tiêu -15 Kháng phép tới hết lượt kế tiếp của nó (đổi mục tiêu mất nhịp, 1 lần/lượt).",
        descEn: "Attack hits deal {15 + 25% AP} extra magic damage (cannot crit). After 3 consecutive attack hits on the same enemy champion in a turn: the target loses 15 MR until end of its next turn (switching target resets, once per turn).",
    },
    hooks: {
        onAttack(g, me, d) {
            if (myHit(me,
                d)) d.info.bonus.push({
                raw: g.f(me,
                    "15 + 25% AP"), kind: "magic"
            })
        },
        onAttackHit(g, me, d) {
            if (!myHit(me,
                d)) return
            if (!foe(me,
                d.target)) { breakStreak(me,
                "nash"); return }
            if (streak(g,
                me,
                "nash",
                d.target) >= 3 && g.oncePerTurn(me,
                "nanh_nashor")) g.status(d.target,
                "mr_down",
                nextTurns(g,
                    d.target.side),
                {
                    v: g.statusV(d.target,
                        "mr_down") + 15
                })
        },
    },
})

reg({
    id: "gang_bao_thach", name: {
        vi: "Găng Bảo Thạch", en: "Jeweled Gauntlet"
    },
    stats: {
        ap: 40, crit: 0.25
    },
    spellCritMult: RULES.critBase,
    passive: {
        vi: "Phép Thuật Bạo Kích · Khai Thác Sơ Hở", en: "Spell Crit · Exploit",
        descVi: "Lá chiêu gốc chí mạng được theo tỉ lệ chí mạng (×2,25), tung 1 lần mỗi lá; sát thương proc của đồ không chí mạng. Lá chiêu đánh tướng địch đã có hiệu ứng bất lợi do chính người đeo đặt TRƯỚC lá này: bỏ qua 15 Kháng phép của mục tiêu.",
        descEn: "Skill cards can crit using crit chance (×2.25), rolled once per card; item procs cannot crit. Skill cards hitting an enemy that already had a debuff placed by the wearer BEFORE this card ignore 15 of its MR.",
    },
    dmgMult(g, me, d) {
        if (d.tag !== "skill" || d.kind !== "magic" || !curUid(g) || me.stacks[T("jg",
            d.target.id)] !== curUid(g)) return 1
        return penMult(g.mr(d.target) - g.stats(me).magicPen,
            15)
    },
    hooks: {
        onPlay(g, me, d) { // chụp trước khi lá giải quyết: hiệu ứng do chính lá này đặt không tính
            if (d.unit?.id !== me.id || d.card.kind === "support") return
            const uid = uidNum(d.card)
            for (const e of g.enemies(me)) {
                const had = Object.values(e.statuses).some((st) => st.src === me.id) || (e.marks ?? []).some((m) => m.src === me.id)
                if (had) me.stacks[T("jg",
                    e.id)] = uid
                else delete me.stacks[T("jg",
                    e.id)]
            }
        },
    },
})

reg({
    id: "vuong_mien", name: {
        vi: "Vương Miện Hoàng Gia", en: "Crownguard"
    },
    stats: {
        ap: 40, armor: 30
    },
    bonus: (g, u) => ({
        ap: (u.stacks[T("crown",
            "ap")] ?? -1) >= g.s.turnNo ? 20 : 0
    }),
    passive: {
        vi: "Bảo Hộ · Phản Công", en: "Ward · Counter",
        descVi: "Lá chiêu đầu tiên giải quyết thành công trong lượt của bạn: người đeo có 60 Khiên vật lý (vàng) tới hết lượt kế tiếp của nó (nạp lại tới 60, không cộng dồn). Khi Khiên Bảo Hộ bị sát thương phá: +20 AP tới hết lượt kế tiếp của người đeo (hồi chiêu 2 lượt của người đeo).",
        descEn: "The first skill card resolved in your turn: the wearer has a 60 physical (yellow) Shield until end of its next turn (refills to 60, no stacking). When the Ward Shield is broken by damage: +20 AP until end of the wearer's next turn (2-turn cooldown of the wearer).",
    },
    hooks: {
        onCast(g, me, d) {
            if (d.caster.id !== me.id || g.s.active !== me.side || !g.oncePerTurn(me,
                "vuong_mien")) return
            const k = T("crown",
                "sh")
            const left = Math.min(me.stacks[k] ?? 0,
                g.shieldOf(me,
                    "physical"))
            const give = 60 - left
            if (give > 0) shieldNext(g,
                me,
                me,
                give,
                "physical")
            me.stacks[k] = 60
        },
        onDamage(g, me, d) {
            const k = T("crown",
                "sh")
            if (d.target.id !== me.id || d.absorbed <= 0 || !me.stacks[k] || g.shieldOf(me,
                "physical") > 0 || d.kind !== "physical") return
            me.stacks[k] = 0
            if (!cdReady(g,
                me,
                "vuong_mien")) return
            cdStart(g,
                me,
                "vuong_mien",
                2)
            me.stacks[T("crown",
                "ap")] = g.turnsUntil(me.side,
                nextTurns(g,
                    me.side))
        },
    },
})

reg({
    id: "quy_thu", name: {
        vi: "Quỷ Thư Morello", en: "Morellonomicon"
    },
    stats: {
        ap: 40, mr: 30
    },
    passive: {
        vi: "Vết Thương Sâu · Thu Hoạch Hắc Thuật", en: "Grievous Wounds · Dark Harvest",
        descVi: "Chiêu gây sát thương khiến mục tiêu bị Vết Thương Sâu (hồi máu và Khiên nhận vào -50%) tới hết lượt kế tiếp của nó. Lần đầu mỗi lượt chiêu trúng tướng địch đã có Vết Thương Sâu từ trước lá này: người đeo nhận 60 Khiên phép (xanh) tới hết lượt kế tiếp của nó.",
        descEn: "Damaging skills apply Grievous Wounds (-50% healing and shields received) until end of the target's next turn. The first time each turn a skill hits an enemy that already had Grievous Wounds before this card: the wearer gains a 60 magic (blue) Shield until end of its next turn.",
    },
    hooks: {
        onDamage(g, me, d) {
            if (d.src?.id !== me.id || d.tag !== "skill" || d.amount <= 0 || !foe(me,
                d.target)) return
            const k = T("morello",
                d.target.id)
            const before = g.has(d.target,
                "grievous") && me.stacks[k] !== curUid(g)
            if (before && g.oncePerTurn(me,
                "quy_thu")) shieldNext(g,
                me,
                me,
                60,
                "magic")
            if (!g.has(d.target,
                "grievous")) me.stacks[k] = curUid(g)
            g.status(d.target,
                "grievous",
                nextTurns(g,
                    d.target.side))
        },
    },
})

reg({
    id: "mat_na_liandry", name: {
        vi: "Mặt Nạ Đọa Đày Liandry", en: "Liandry's Torment"
    },
    stats: {
        ap: 25, hp: 120
    },
    bonus: (g, u) => ({
        ap: Math.min(60,
            Math.round(0.08 * Math.max(0,
                u.maxHp - g.hero(u).hp)))
    }),
    passive: {
        vi: "Lửa Từ Máu · Tro Tàn", en: "Blood Fire · Ashes",
        descVi: "Nhận thêm AP bằng 8% máu tối đa cộng thêm (đồ và tăng trưởng, không tính máu gốc), tối đa 60 AP. Chiêu gây sát thương đặt Tro Tàn 2 lượt của mục tiêu: đầu mỗi lượt đó mục tiêu nhận sát thương phép bằng 3% máu tối đa của nó (+50% khi người đeo còn trên sân với 50% máu hoặc thấp hơn). Tro Tàn đã đặt vẫn cháy khi người đeo đã chết. Tái áp dụng chỉ làm mới thời hạn.",
        descEn: "Gain AP equal to 8% bonus max HP (items and growth, not base HP), max 60 AP. Damaging skills apply Ashes for 2 of the target's turns: at the start of each it takes magic damage equal to 3% of its max HP (+50% while the wearer is at 50% HP or lower). Reapplying only refreshes the duration.",
    },
    offBoardHooks: ["onTurnStart"],
    hooks: {
        onDamage(_g, me, d) {
            if (d.src?.id === me.id && d.tag === "skill" && d.amount > 0 && foe(me,
                d.target)) me.stacks[T("ash",
                d.target.id)] = 2
        },
        onTurnStart(g, me, d) {
            const pre = T("ash",
                "")
            for (const k of Object.keys(me.stacks)) {
                if (!k.startsWith(pre)) continue
                const t = g.unit(k.slice(pre.length))
                if (!t || t.status !== "board") { delete me.stacks[k]; continue }
                if (t.side !== d.side) continue
                const n = me.stacks[k] - 1
                if (n > 0) me.stacks[k] = n
                else delete me.stacks[k]
                g.damage(me,
                    t,
                    0.03 * t.maxHp * (me.status === "board" && me.hp <= 0.5 * me.maxHp ? 1.5 : 1),
                    "magic",
                    {
                        tag: "dot"
                    })
            }
        },
    },
})

reg({
    id: "truong_truong_sinh", name: {
        vi: "Quyền Trượng Thiên Thần", en: "Archangel's Staff"
    },
    stats: {
        ap: 20
    },
    stack: {
        max: 40, vi: "AP Tích Lũy", en: "Stored AP"
    },
    bonus: (_g, u) => ({
        ap: cnt(u,
            "truong_truong_sinh")
    }),
    passive: {
        vi: "Tích Lũy · Dự Trữ Sinh Mệnh", en: "Mana Hoard · Life Reserve",
        descVi: "Mỗi 20 mana người đeo thực trả để dùng chiêu: +5 AP vĩnh viễn (tối đa +40 AP, giữ qua chết; mana được hoàn sau đó không xoá tiến độ). Trước đòn có thể hạ gục, nếu đội còn ít nhất 30 mana: tự tiêu 30 mana đội để tạo Khiên trắng {80 + 100% AP} trước đòn đó (hồi chiêu 5 lượt của người đeo; Khiên hữu hạn).",
        descEn: "Every 20 mana the wearer actually pays for skills: +5 AP permanently (max +40 AP, kept through death; later refunds don't remove progress). Before a hit that would take it down, if the team has at least 30 mana: spend 30 team mana to create a {80 + 100% AP} white Shield before that hit (5-turn cooldown of the wearer; the Shield is finite).",
    },
    hooks: {
        onManaSpent(g, me, d) {
            if (d.unit.id !== me.id || d.amount <= 0) return
            const k = T("truong_truong_sinh",
                "paid")
            const paid = (me.stacks[k] ?? 0) + d.amount
            const steps = Math.floor(paid / 20)
            me.stacks[k] = paid - steps * 20
            if (steps > 0) g.stack(me,
                KEY("truong_truong_sinh"),
                5 * steps,
                40)
        },
        onLethal(g, me, d) {
            // Không có hook "trước đòn chí tử": hoàn lại máu vừa mất, dựng Khiên, rồi đòn đó đánh lại (đã qua giáp) vào Khiên
            if (d.target.id !== me.id || me.hp > 0 || g.teamManaOf(me.side) < 30 || !cdReady(g,
                me,
                "truong_truong_sinh")) return
            cdStart(g,
                me,
                "truong_truong_sinh",
                5)
            g.gainMana(me,
                -30,
                "spend")
            me.hp += d.hpLost
            g.shield(me,
                me,
                g.f(me,
                    "80 + 100% AP"))
            g.damage(d.src,
                me,
                d.hpLost + d.over,
                "true",
                {
                    tag: "effect", noShare: true, noGuard: true
                })
        },
    },
})

// ---------------- Hàng Cung Gỗ ----------------
reg({
    id: "dai_bac", name: {
        vi: "Đại Bác Liên Thanh", en: "Rapid Firecannon"
    },
    stats: {
        attackSpeed: 40
    },
    anyTarget: true,
    passive: {
        vi: "Tầm Xa · Bắn Tỉa", en: "Long Range · Snipe",
        descVi: "Đòn đánh chọn được mọi tướng địch hoặc vật triệu hồi đang chọn được (vẫn theo Khiêu Khích). Lần đầu mỗi lượt người đeo đánh 1 tướng địch không đối diện: đòn chính đó gây thêm 20% sát thương.",
        descEn: "Attacks can target any targetable enemy or summon (Taunt still applies). The first time each turn the wearer attacks an enemy champion that is not opposite it: that main hit deals 20% more damage.",
    },
    hooks: {
        onAttack(g, me, d) {
            if (!myHit(me,
                d) || !foe(me,
                d.target) || g.opposite(me)?.id === d.target.id) return
            if (g.oncePerTurn(me,
                "dai_bac")) d.info.mult *= 1.2
        },
    },
})

reg({
    id: "diet_khong_lo", name: {
        vi: "Diệt Khổng Lồ", en: "Giant Slayer"
    },
    stats: {
        attackSpeed: 20, crit: 0.2
    },
    passive: {
        vi: "Xuyên Giáp · Chênh Lệch", en: "Armor Pierce · Disparity",
        descVi: "Đòn đánh bỏ qua 15 Giáp của mục tiêu. Đòn đánh và chiêu gây thêm 20% sát thương lên tướng địch có máu tối đa cao hơn người đeo.",
        descEn: "Attacks ignore 15 of the target's Armor. Attacks and skills deal 20% more damage to enemy champions with higher max HP than the wearer.",
    },
    dmgMult(g, me, d) {
        let m = 1
        if (d.tag === "attack" && d.kind === "physical") {
            const pre = g.stats(me).lethality + (d.crit && me.items.includes("vo_cuc_kiem") ? 15 : 0)
            m *= penMult(g.armor(d.target) - pre,
                15)
        }
        if ((d.tag === "attack" || d.tag === "skill") && foe(me,
            d.target) && d.target.maxHp > me.maxHp) m *= 1.2
        return m
    },
})

reg({
    id: "tim_bang", name: {
        vi: "Tim Băng", en: "Frozen Heart"
    },
    stats: {
        armor: 30, attackSpeed: 15
    },
    passive: {
        vi: "Hàn Khí · Che Chở", en: "Chill · Shelter",
        descVi: "Tướng địch đối diện và 2 ô kề nó gây ít hơn 15% sát thương đòn đánh lên tướng phe bạn (nhiều Tim Băng không nhân lên). Lần đầu mỗi lượt người đeo đánh trúng địch đang chịu Hàn Khí: đồng minh có tỉ lệ máu thấp nhất nhận 50 Khiên vật lý (vàng) tới hết lượt kế tiếp của người đeo.",
        descEn: "The enemy opposite and the 2 slots beside it deal 15% less attack damage to your champions (multiple Frozen Hearts don't multiply). The first time each turn the wearer hits a Chilled enemy: the ally with the lowest HP ratio gains a 50 physical (yellow) Shield until end of the wearer's next turn.",
    },
    modifyDamage(g, me, d) {
        if (d.tag !== "attack" || !d.src || d.target.side !== me.side || !frostCovers(me,
            d.src)) return 1
        // chỉ 1 hào quang mạnh nhất mỗi địch: người đeo đầu tiên (theo thứ tự sân) đang che kẻ đánh
        const first = g.heroes(me.side).find((w) => w.items.includes("tim_bang") && frostCovers(w,
            d.src!))
        return first?.id === me.id ? 0.85 : 1
    },
    hooks: {
        onAttackHit(g, me, d) {
            if (!myHit(me,
                d) || !foe(me,
                d.target) || !frostCovers(me,
                d.target) || !g.oncePerTurn(me,
                "tim_bang")) return
            const low = g.lowestHp(g.heroes(me.side))
            if (low) shieldNext(g,
                me,
                low,
                50,
                "physical")
        },
    },
})
/** Tướng địch `e` nằm trong vùng Hàn Khí của `w` (đường đối diện ±1) */
function frostCovers(w: Unit, e: Unit): boolean {
    return w.status === "board" && !e.token && e.side !== w.side && e.status === "board" && w.lane >= 0 && w.lane <= 4 && Math.abs(e.lane - w.lane) <= 1
}

reg({
    id: "sat_thu_kraken", name: {
        vi: "Móc Diệt Thủy Quái", en: "Kraken Slayer"
    },
    stats: {
        attackSpeed: 15, mr: 25
    },
    passive: {
        vi: "Dồn Đòn · Săn Trong Sóng Phép", en: "Triple Strike · Spell Tide Hunt",
        descVi: "Đòn đánh thứ 3 liên tiếp trúng cùng 1 tướng địch trong lượt gây thêm {40 + 30% AD} sát thương chuẩn (không chí mạng; đổi mục tiêu mất nhịp; 1 lần/lượt). Sau khi chịu sát thương phép từ lá chiêu địch mà còn sống: đòn đánh trúng đầu tiên ở lượt kế tiếp của bạn tạo 60 Khiên phép (xanh) tới hết lượt đó.",
        descEn: "The 3rd consecutive attack hit on the same enemy champion in a turn deals {40 + 30% AD} extra true damage (cannot crit; switching target resets; once per turn). After taking magic damage from an enemy skill card and surviving: the first attack hit in your next turn creates a 60 magic (blue) Shield until end of that turn.",
    },
    hooks: {
        onAttack(g, me, d) {
            if (!myHit(me,
                d)) return
            if (!foe(me,
                d.target)) { breakStreak(me,
                "kraken"); return }
            if (streak(g,
                me,
                "kraken",
                d.target) === 3 && g.oncePerTurn(me,
                "sat_thu_kraken")) d.info.bonus.push({
                raw: g.f(me,
                    "40 + 30% AD"), kind: "true"
            })
        },
        onDamage(g, me, d) {
            if (d.target.id === me.id && me.hp > 0 && d.kind === "magic" && d.tag === "skill" && d.amount > 0 && d.src && d.src.side !== me.side) me.stacks[T("kraken",
                "arm")] = ownTurn(g,
                me.side) + 1
        },
        onAttackHit(g, me, d) {
            const k = T("kraken",
                "arm")
            if (!myHit(me,
                d) || g.s.active !== me.side || me.stacks[k] !== ownTurn(g,
                me.side)) return
            delete me.stacks[k]
            shieldThisTurn(g,
                me,
                me,
                60,
                "magic")
        },
    },
})

reg({
    id: "y_chi_titan", name: {
        vi: "Rìu Đại Mãng Xà", en: "Titanic Hydra"
    },
    stats: {
        hp: 100, attackSpeed: 20
    },
    passive: {
        vi: "Sức Nặng · Phá Trận", en: "Heft · Cleave",
        descVi: "Đòn đánh trúng gây thêm {4% máu tối đa} sát thương vật lý (không chí mạng). Khi đang có Khiên, đòn đánh trúng đầu tiên mỗi lượt gây thêm sát thương vật lý bằng 50% đòn chính lên tướng địch kề mục tiêu có máu hiện tại cao nhất (không kích lại hiệu ứng theo đòn).",
        descEn: "Attack hits deal {4% max HP} extra physical damage (cannot crit). While shielded, the first attack hit each turn also deals physical damage equal to 50% of the main hit to the enemy next to the target with the highest current HP (does not re-trigger on-hit effects).",
    },
    hooks: {
        onAttack(_g, me, d) {
            if (myHit(me,
                d)) d.info.bonus.push({
                raw: 0.04 * me.maxHp, kind: "physical"
            })
        },
        onAttackHit(g, me, d) {
            if (!myHit(me,
                d) || g.totalShield(me) <= 0 || d.target.token) return
            const near = g.neighbors(d.target).sort((a, b) => b.hp - a.hp)[0]
            if (!near || !g.oncePerTurn(me,
                "y_chi_titan")) return
            const st = g.stats(me)
            const main = d.info.raw * d.info.mult * (1 + st.extraAtk) * (d.info.crit ? RULES.critBase + st.critDmg : 1)
            g.damage(me,
                near,
                0.5 * main,
                "physical",
                {
                    tag: "effect"
                })
        },
    },
})

reg({
    id: "than_kiem_manamune", name: {
        vi: "Kiếm Manamune", en: "Manamune"
    },
    stats: {
        atk: 25, attackSpeed: 15
    },
    passive: {
        vi: "Nạp Lại", en: "Recharge",
        descVi: "Sau khi người đeo dùng lá chiêu thực trả ít nhất 20 mana, đòn đánh trúng kế tiếp trong lượt của bạn hồi 15 mana cho đội (1 lần/lượt).",
        descEn: "After the wearer casts a skill that actually paid at least 20 mana, its next attack hit during your turn restores 15 team mana (once per turn).",
    },
    hooks: {
        onManaSpent(_g, me, d) {
            if (d.unit.id === me.id && d.amount >= 20) me.stacks[T("manamune",
                "charge")] = 1
        },
        onAttackHit(g, me, d) {
            if (!myHit(me,
                d) || !me.stacks[T("manamune",
                "charge")]) return
            if (g.s.active !== me.side || !g.oncePerTurn(me,
                "manamune_refund")) return
            me.stacks[T("manamune",
                "charge")] = 0
            g.gainMana(me,
                15,
                "restore")
        },
    },
})

// ---------------- Hàng Găng Đấu Tập ----------------
reg({
    id: "ke_thu_thap", name: {
        vi: "Súng Hải Tặc", en: "The Collector"
    },
    stats: {
        atk: 25, crit: 0.3
    },
    passive: {
        vi: "Thu Hoạch · Đà Săn Mồi", en: "Reap · Hunter's Momentum",
        descVi: "Đòn đánh hoặc chiêu trực tiếp làm mất máu khiến tướng địch còn 10% máu tối đa hoặc thấp hơn: hạ gục mục tiêu (1 lần/lượt; vẫn qua cơ chế cứu chết hợp lệ). Sau lần đầu người đeo hạ 1 tướng địch trong lượt: nhận Khiên trắng {40 + 20% AD} tới hết lượt kế tiếp của người đeo.",
        descEn: "If an attack or skill directly lowers an enemy champion to 10% max HP or less: take it down (once per turn; valid death saves still apply). After the wearer's first champion takedown in a turn: gain a {40 + 20% AD} white Shield until end of the wearer's next turn.",
    },
    hooks: {
        onDamage(g, me, d) {
            if (d.src?.id !== me.id || (d.tag !== "attack" && d.tag !== "skill") || d.hpLost <= 0 || !foe(me,
                d.target)) return
            const t = d.target
            if (t.hp > 0 && t.hp <= 0.1 * t.maxHp && !g.has(t,
                "invulnerable") && g.oncePerTurn(me,
                "ke_thu_thap")) executeWithSaves(g,
                me,
                t)
        },
        onKill(g, me, d) {
            if (d.killer.id !== me.id || d.victim.side === me.side || d.victim.token || !g.oncePerTurn(me,
                "ke_thu_thap_kill")) return
            shieldNext(g,
                me,
                me,
                g.f(me,
                    "40 + 20% AD"))
        },
    },
})

reg({
    id: "giap_thien_than", name: {
        vi: "Giáp Thiên Thần", en: "Guardian Angel"
    },
    stats: {
        armor: 25, crit: 0.25
    },
    stack: {
        max: 1, start: 1, vi: "Phục Sinh", en: "Rebirth"
    },
    passive: {
        vi: "Phục Sinh · Trở Lại", en: "Rebirth · Comeback",
        descVi: "Lần đầu bị hạ trong trận: lập tức đứng dậy tại ô cũ với 40% máu tối đa, không mất mạng (1 lần/trận). Sau khi Phục Sinh: đòn đánh trúng tướng địch kế tiếp chắc chắn chí mạng (hiệu lực tới hết lượt kế tiếp của người đeo).",
        descEn: "The first time it is taken down in a match: it immediately stands back up in its slot with 40% max HP and no life is lost (once per match). After Rebirth: its next attack on an enemy champion is a guaranteed critical (until end of the wearer's next turn).",
    },
    hooks: {
        onLethal(g, me, d) {
            if (d.target.id !== me.id || me.hp > 0 || cnt(me,
                "giap_thien_than") < 1) return
            g.setStack(me,
                KEY("giap_thien_than"),
                0)
            g.surviveWith(me,
                0.4 * me.maxHp)
            me.stacks[T("ga",
                "crit")] = g.turnsUntil(me.side,
                nextTurns(g,
                    me.side))
        },
        onAttack(g, me, d) {
            if (myHit(me,
                d) && foe(me,
                d.target) && !d.info.noCrit && (me.stacks[T("ga",
                "crit")] ?? -1) >= g.s.turnNo) d.info.crit = true
        },
        onAttackHit(_g, me, d) {
            if (myHit(me,
                d) && d.info.crit && foe(me,
                d.target)) delete me.stacks[T("ga",
                "crit")]
        },
    },
})

/** Khống chế bị Khăn Giải Thuật huỷ */
const CC_IDS = ["stun",
    "silence",
    "root",
    "knockup",
    "taunt",
    "freeze",
    "frozen",
    "charm",
    "disarm"]
reg({
    id: "khan_giai_thuat", name: {
        vi: "Khăn Giải Thuật", en: "Quicksilver Sash"
    },
    stats: {
        crit: 0.25, mr: 30
    },
    passive: {
        vi: "Thanh Tẩy · Giữ Vững Đội Hình", en: "Cleanse · Hold Formation",
        descVi: "Huỷ lần khống chế đầu tiên sắp áp lên người đeo, gồm cả khống chế khác từ cùng lá đó (hồi chiêu 3 lượt của người đeo). Khi Thanh Tẩy huỷ thành công: đồng minh khác có tỉ lệ máu thấp nhất nhận 60 Khiên phép (xanh) tới hết lượt kế tiếp của người đeo.",
        descEn: "Cancels the first crowd control about to land on the wearer, including other crowd control from the same card (3-turn cooldown of the wearer). When Cleanse succeeds: the other ally with the lowest HP ratio gains a 60 magic (blue) Shield until end of the wearer's next turn.",
    },
    hooks: {
        onBeforeStatus(g, me, d) {
            if (d.unit.id !== me.id || !CC_IDS.includes(d.id)) return
            const uid = curUid(g)
            if (uid > 0 && me.stacks[T("qss",
                "uid")] === uid && me.stacks[T("qss",
                "turn")] === g.s.turnNo) { d.cancel = true; return } // cùng 1 lá gây nhiều khống chế: huỷ hết
            if (!cdReady(g,
                me,
                "khan_giai_thuat")) return
            cdStart(g,
                me,
                "khan_giai_thuat",
                3)
            d.cancel = true
            me.stacks[T("qss",
                "uid")] = uid
            me.stacks[T("qss",
                "turn")] = g.s.turnNo
            const low = g.lowestHp(g.heroes(me.side).filter((a) => a.id !== me.id))
            if (low) shieldNext(g,
                me,
                low,
                60,
                "magic")
        },
    },
})

reg({
    id: "tim_khong_than", name: {
        vi: "Trái Tim Khổng Thần", en: "Heartsteel"
    },
    stats: {
        hp: 150, crit: 0.2
    },
    stack: {
        max: 10, vi: "Nhịp Tim", en: "Heartbeat"
    },
    passive: {
        vi: "Nhịp Tim · Tim Thép", en: "Heartbeat · Steel Heart",
        descVi: "Đòn đánh trúng tướng địch đầu tiên trong lượt của bạn: +20 máu tối đa vĩnh viễn (tối đa +200, giữ qua chết). Lần đầu mỗi lượt đánh chí mạng 1 tướng địch: nhận Khiên trắng {8% máu tối đa} tới hết lượt kế tiếp của người đeo.",
        descEn: "The first attack hit on an enemy champion in your turn: +20 max HP permanently (max +200, kept through death). The first time each turn it crits an enemy champion: gain a {8% max HP} white Shield until end of the wearer's next turn.",
    },
    hooks: {
        onAttackHit(g, me, d) {
            if (!myHit(me,
                d) || !foe(me,
                d.target) || g.s.active !== me.side || !g.oncePerTurn(me,
                "tim_khong_than")) return
            const n = g.stack(me,
                KEY("tim_khong_than"),
                1,
                10)
            g.setAuraMaxHp(me,
                "tim_khong_than",
                20 * n)
        },
        onCrit(g, me, d) {
            if (d.attacker.id === me.id && foe(me,
                d.target) && g.oncePerTurn(me,
                "tim_khong_than_crit")) shieldNext(g,
                me,
                me,
                0.08 * me.maxHp)
        },
    },
})

reg({
    id: "ban_dong_hanh_luden", name: {
        vi: "Vọng Âm Luden", en: "Luden's Echo"
    },
    stats: {
        ap: 30, crit: 0.2
    },
    spellCritMult: RULES.critBase,
    manaCostMod: cheaper(5),
    passive: {
        vi: "Ma Thuật Bất Ngờ · Dội Âm", en: "Surprise Magic · Echo",
        descVi: "Chiêu của người đeo tốn ít hơn 5 mana. Lá chiêu gốc gây sát thương chí mạng được theo tỉ lệ chí mạng (×2,25, 1 lần mỗi lá; không nhân thêm nếu đã có Găng Bảo Thạch). Lần đầu mỗi lượt 1 lá chiêu thực trả ít nhất 30 mana (sau giảm giá) giải quyết và gây sát thương: thêm {30 + 20% AP} sát thương phép lên mục tiêu chính (chiêu diện rộng: địch trúng chiêu có máu hiện tại cao nhất).",
        descEn: "The wearer's skills cost 5 less mana. Damaging skill cards can crit using crit chance (×2.25, once per card; does not multiply again with Jeweled Gauntlet). The first time each turn a skill card that actually paid at least 30 mana (after the discount) resolves and deals damage: {30 + 20% AP} extra magic damage to the main target (area skills: the hit enemy with the highest current HP).",
    },
    hooks: {
        onManaSpent(_g, me, d) {
            if (d.unit.id === me.id && d.amount >= 30) me.stacks[T("luden",
                "uid")] = uidNum(d.card)
        },
        onDamage(g, me, d) {
            if (d.src?.id === me.id && d.tag === "skill" && d.amount > 0 && foe(me,
                d.target) && curUid(g) && me.stacks[T("luden",
                "uid")] === curUid(g)) me.stacks[T("luden",
                "hit",
                d.target.id)] = curUid(g)
        },
        onCast(g, me, d) {
            if (d.caster.id !== me.id) return
            const uid = uidNum(d.card), pre = T("luden",
                "hit",
                "")
            const hit = Object.keys(me.stacks).filter((k) => k.startsWith(pre) && me.stacks[k] === uid).map((k) => g.unit(k.slice(pre.length))).filter((x): x is Unit => !!x && x.status === "board")
            for (const k of Object.keys(me.stacks)) if (k.startsWith(pre)) delete me.stacks[k]
            if (!uid || me.stacks[T("luden",
                "uid")] !== uid || !hit.length) return
            const main = d.target && hit.some((x) => x.id === d.target!.id) ? d.target : [...hit].sort((a, b) => b.hp - a.hp)[0]
            if (!g.oncePerTurn(me,
                "ban_dong_hanh_luden")) return
            g.damage(me,
                main,
                g.f(me,
                    "30 + 20% AP"),
                "magic",
                {
                    tag: "effect"
                })
        },
    },
})

// ---------------- Hàng Giáp Lưới ----------------
reg({
    id: "ao_choang_gai", name: {
        vi: "Giáp Gai", en: "Thornmail"
    },
    stats: {
        armor: 50
    },
    passive: {
        vi: "Gai Nhọn · Chống Dồn Đòn", en: "Thorns · Anti-Burst",
        descVi: "Khi chịu sát thương từ đòn đánh, kẻ đánh nhận {15 + 25% Giáp} sát thương phép. Sau khi chịu sát thương từ 2 đòn đánh trong cùng lượt: nhận 80 Khiên vật lý (vàng) tới hết lượt đó (1 lần/lượt).",
        descEn: "When damaged by an attack, the attacker takes {15 + 25% Armor} magic damage. After taking damage from 2 attacks in the same turn: gain an 80 physical (yellow) Shield until end of that turn (once per turn).",
    },
    hooks: {
        onAttackHit(g, me, d) {
            if (d.target.id !== me.id || d.info.miss || d.attacker.side === me.side) return
            if (d.attacker.status === "board") g.damage(me,
                d.attacker,
                g.f(me,
                    "15 + 25% Giáp"),
                "magic",
                {
                    tag: "effect"
                })
            if (d.dealt > 0 && g.bumpTurnCount(me,
                "ao_choang_gai") >= 2 && me.status === "board" && g.oncePerTurn(me,
                "ao_choang_gai")) shieldThisTurn(g,
                me,
                me,
                80,
                "physical")
        },
    },
})

reg({
    id: "giap_gargoyle", name: {
        vi: "Thú Tượng Thạch Giáp", en: "Gargoyle Stoneplate"
    },
    stats: {
        armor: 35, mr: 35
    },
    bonus: (g, u) => {
        const n = u.stacks[T("garg",
            "turn")] === g.s.turnNo ? u.stacks[T("garg",
                "n")] ?? 0 : 0
        return {
            armor: 5 * n, mr: 5 * n
        }
    },
    passive: {
        vi: "Vây Hãm · Phòng Tuyến Kép", en: "Besieged · Double Line",
        descVi: "Mỗi tướng địch khác nhau gây sát thương lên người đeo trong lượt: +5 Giáp và +5 Kháng phép tới hết lượt (tối đa +15 mỗi loại). Lần đầu mỗi lượt đã chịu cả sát thương vật lý và phép: nhận Khiên trắng {60 + 20% AP} (tối đa 120) tới hết lượt đó.",
        descEn: "Each different enemy champion that damages the wearer this turn: +5 Armor and +5 MR until end of turn (max +15 each). The first time each turn it has taken both physical and magic damage: gain a {60 + 20% AP} white Shield (max 120) until end of that turn.",
    },
    hooks: {
        onDamage(g, me, d) {
            if (d.target.id !== me.id || d.amount <= 0 || !d.src || !foe(me,
                d.src)) return
            const t = g.s.turnNo
            if (me.stacks[T("garg",
                "turn")] !== t) { me.stacks[T("garg",
                "turn")] = t; me.stacks[T("garg",
                "n")] = 0 }
            const sk = T("garg",
                "s",
                d.src.id)
            if (me.stacks[sk] !== t && (me.stacks[T("garg",
                "n")] ?? 0) < 3) { me.stacks[sk] = t; me.stacks[T("garg",
                "n")] = (me.stacks[T("garg",
                "n")] ?? 0) + 1 }
            if (d.kind === "physical") me.stacks[T("garg",
                "p")] = t
            if (d.kind === "magic") me.stacks[T("garg",
                "m")] = t
            if (me.hp > 0 && me.stacks[T("garg",
                "p")] === t && me.stacks[T("garg",
                "m")] === t && g.oncePerTurn(me,
                "giap_gargoyle")) shieldThisTurn(g,
                me,
                me,
                Math.min(120,
                    g.f(me,
                        "60 + 20% AP")))
        },
    },
})

reg({
    id: "ao_choang_lua", name: {
        vi: "Áo Choàng Lửa", en: "Sunfire Cape"
    },
    stats: {
        hp: 100, armor: 25
    },
    passive: {
        vi: "Hỏa Quyển · Thiêu Rụi", en: "Immolate · Scorch",
        descVi: "Đầu lượt của bạn: tướng địch đối diện và tối đa 2 tướng địch ở 2 ô kề nó nhận sát thương phép bằng {3% máu tối đa}. Đòn đánh đầu tiên mỗi lượt trúng tướng địch vừa chịu Hỏa Quyển trong lượt đó: nó bị Vết Thương Sâu (hồi máu và Khiên nhận vào -50%) tới hết lượt kế tiếp của nó.",
        descEn: "Start of your turn: the enemy opposite and up to 2 enemies in the slots beside it take magic damage equal to {3% max HP}. The first attack each turn hitting an enemy that took Immolate this turn: it gets Grievous Wounds (-50% healing and shields received) until end of its next turn.",
    },
    hooks: {
        onTurnStart(g, me, d) {
            if (d.side !== me.side) return
            for (const e of g.heroes(otherSide(me.side))) {
                if (Math.abs(e.lane - me.lane) > 1) continue
                g.damage(me,
                    e,
                    0.03 * me.maxHp,
                    "magic",
                    {
                        tag: "effect"
                    })
                me.stacks[T("sun",
                    e.id)] = g.s.turnNo
            }
        },
        onAttackHit(g, me, d) {
            if (!myHit(me,
                d) || !foe(me,
                d.target) || me.stacks[T("sun",
                d.target.id)] !== g.s.turnNo || !g.oncePerTurn(me,
                "ao_choang_lua")) return
            g.status(d.target,
                "grievous",
                nextTurns(g,
                    d.target.side))
        },
    },
})

reg({
    id: "loi_the_ho_ve", name: {
        vi: "Lời Thề Hiệp Sĩ", en: "Knight's Vow"
    },
    stats: {
        armor: 35
    },
    passive: {
        vi: "Lời Thề · Tiếp Sức", en: "Vow · Relief",
        descVi: "Liên kết bảo hộ 1 đồng minh khác (khi đeo tự chọn đồng minh có tỉ lệ máu thấp nhất; mỗi lượt của bạn được đổi người bảo hộ 1 lần, miễn phí; mỗi đồng minh chỉ nhận 1 liên kết): 20% sát thương lên đồng minh đó chuyển sang người đeo, mỗi người tự tính Giáp/Kháng phép. Lần đầu mỗi lượt người đeo thực sự gánh sát thương: đội hồi 10 mana.",
        descEn: "Links to protect one other ally (on equip it auto-picks the ally with the lowest HP ratio; once per your turn you may switch the protected ally for free; each ally takes only one link): 20% of the damage to that ally is moved to the wearer, each applying its own Armor/MR. The first time each turn the wearer actually takes redirected damage: your team restores 10 mana.",
    },
    modifyDamage(g, me, d) {
        return d.src && d.src.side !== me.side && d.target.id !== me.id && vowLink(g,
            me) === d.target.id ? 0.8 : 1
    },
    hooks: {
        onEquip(g, me, d) { if (d.unit.id === me.id && d.item === "loi_the_ho_ve") vowRelink(g,
            me) },
        onTurnStart(g, me, d) { if (d.side === me.side) vowLink(g,
            me) }, // giữ người được chọn; chỉ tự chọn lại khi người đó không còn hợp lệ
        onDamage(g, me, d) {
            if (!d.src || d.src.side === me.side || d.target.id === me.id || d.amount <= 0 || vowLink(g,
                me) !== d.target.id || me.status !== "board") return
            // dựng lại phần thô trước giáp: ally nhận 80%, người đeo nhận 20% (tức 25% phần ally đã nhận), rồi tự tính giáp của người đeo
            const t = d.target
            const res = d.kind === "physical" ? Math.max(0,
                g.armor(t) - g.stats(d.src).lethality) : d.kind === "magic" ? Math.max(0,
                g.mr(t) - g.stats(d.src).magicPen) : 0
            const raw = d.amount * 0.25 * (100 + res) / 100
            const dealt = g.damage(d.src,
                me,
                raw,
                d.kind,
                {
                    tag: "effect", noShare: true, noGuard: true
                })
            if (dealt > 0 && g.oncePerTurn(me,
                "loi_the_ho_ve")) g.gainMana(me,
                10,
                "restore")
        },
    },
})
const VOW = T("vow",
    "link",
    "")
/** Id đồng minh đang được người đeo Lời Thề bảo hộ (đồng minh chết thì tự chọn lại) */
function vowLink(g: Game, me: Unit): string | undefined {
    const k = Object.keys(me.stacks).find((x) => x.startsWith(VOW) && me.stacks[x] === 1)
    const id = k?.slice(VOW.length)
    if (id && g.unit(id)?.status === "board") return id
    return me.status === "board" ? vowRelink(g,
        me) : undefined
}
/** Đồng minh có thể chuyển liên kết Lời Thề sang (khác người đeo, đang trên sân, chưa nhận liên kết của người đeo khác, khác người hiện tại) */
export function vowOptions(g: Game, me: Unit): Unit[] {
    if (!me.items.includes("loi_the_ho_ve") || me.status !== "board") return []
    const cur = vowLink(g,
        me)
    const taken = vowTaken(g,
        me)
    return g.heroes(me.side).filter((a) => a.id !== me.id && a.status === "board" && a.id !== cur && !taken.has(a.id))
}
/** Người chơi chọn đồng minh được bảo hộ (hành động "vow") */
export function setVowLink(g: Game, me: Unit, allyId: string) {
    for (const k of Object.keys(me.stacks)) if (k.startsWith(VOW)) delete me.stacks[k]
    me.stacks[VOW + allyId] = 1
}
const vowTaken = (g: Game, me: Unit) => new Set(g.heroes(me.side).filter((w) => w.id !== me.id && w.items.includes("loi_the_ho_ve")).flatMap((w) => Object.keys(w.stacks).filter((x) => x.startsWith(VOW) && w.stacks[x] === 1).map((x) => x.slice(VOW.length))))
function vowRelink(g: Game, me: Unit): string | undefined {
    for (const k of Object.keys(me.stacks)) if (k.startsWith(VOW)) delete me.stacks[k]
    const taken = vowTaken(g,
        me)
    const pick = g.lowestHp(g.heroes(me.side).filter((a) => a.id !== me.id && !taken.has(a.id)))
    if (pick) me.stacks[VOW + pick.id] = 1
    return pick?.id
}

// ---------------- Hàng Áo Choàng Bạc ----------------
reg({
    id: "vuot_rong", name: {
        vi: "Vuốt Rồng", en: "Dragon's Claw"
    },
    stats: {
        mr: 55
    },
    passive: {
        vi: "Tái Sinh · Vảy Rồng", en: "Regrowth · Dragon Scale",
        descVi: "Cuối lượt của bạn: người đeo hồi {5% máu tối đa}. Sau khi 1 lá chiêu địch gây sát thương phép lên người đeo mà nó còn sống: nhận 70 Khiên phép (xanh) tới hết lượt kế tiếp của người đeo (1 lần/lượt).",
        descEn: "End of your turn: the wearer heals {5% max HP}. After an enemy skill card deals magic damage to the wearer and it survives: gain a 70 magic (blue) Shield until end of the wearer's next turn (once per turn).",
    },
    hooks: {
        onTurnEnd(g, me, d) {
            if (d.side === me.side) healSelf(g,
                me,
                0.05 * me.maxHp)
        },
        onDamage(g, me, d) {
            if (d.target.id === me.id && d.kind === "magic" && d.tag === "skill" && d.amount > 0 && d.src && d.src.side !== me.side) me.stacks[T("claw",
                "uid")] = curUid(g) || -1
        },
        onCast(g, me, d) {
            const k = T("claw",
                "uid")
            if (d.caster.side === me.side || !me.stacks[k] || me.stacks[k] !== (uidNum(d.card) || -1)) return
            delete me.stacks[k]
            if (me.status === "board" && me.hp > 0 && g.oncePerTurn(me,
                "vuot_rong")) shieldNext(g,
                me,
                me,
                70,
                "magic")
        },
    },
})

reg({
    id: "khien_hu_vo", name: {
        vi: "Giáp Vai Nguyệt Thần", en: "Abyssal Mask"
    },
    stats: {
        hp: 120, mr: 30
    },
    passive: {
        vi: "Lỗ Hổng · Khai Thác Điểm Yếu", en: "Exposed · Exploit Weakness",
        descVi: "Tướng địch đối diện nhận thêm 15% sát thương từ các đồng minh khác của người đeo. Lần đầu mỗi lượt người đeo khống chế thành công 1 tướng địch: đánh dấu nó tới hết lượt kế tiếp của người đeo; lá chiêu gây sát thương tiếp theo của 1 đồng minh khác lên nó bỏ qua 15 Kháng phép rồi tiêu dấu.",
        descEn: "The enemy opposite takes 15% more damage from the wearer's other allies. The first time each turn the wearer successfully crowd-controls an enemy champion: mark it until end of the wearer's next turn; the next damaging skill card of another ally on it ignores 15 MR, then consumes the mark.",
    },
    modifyDamage(g, me, d) {
        if (!d.src || d.src.side !== me.side || d.src.id === me.id || d.target.side === me.side) return 1
        let m = g.opposite(me)?.id === d.target.id ? 1.15 : 1
        const mk = T("abyss",
            d.target.id)
        if (d.tag === "skill" && (me.stacks[mk] ?? -1) >= g.s.turnNo) {
            const uk = T("abyss",
                "uid",
                d.target.id)
            if (!me.stacks[uk]) me.stacks[uk] = curUid(g) || -1 // lá đầu tiên trúng: dùng dấu
            if (me.stacks[uk] === (curUid(g) || -1)) {
                if (d.kind === "magic") m *= penMult(g.mr(d.target) - g.stats(d.src).magicPen,
                    15)
            } else { delete me.stacks[mk]; delete me.stacks[uk] }
        }
        return m
    },
    hooks: {
        onStatusApplied(g, me, d) {
            if (d.src !== me.id || !CC_IDS.includes(d.id) || !foe(me,
                d.unit) || !g.oncePerTurn(me,
                "khien_hu_vo")) return
            me.stacks[T("abyss",
                d.unit.id)] = g.turnsUntil(me.side,
                nextTurns(g,
                    me.side))
            delete me.stacks[T("abyss",
                "uid",
                d.unit.id)]
        },
    },
})

reg({
    id: "mu_thich_nghi", name: {
        vi: "Mũ Thích Nghi", en: "Adaptive Helm"
    },
    stats: {
        mr: 35
    },
    takenMult(g, me, d) {
        if (d.tag !== "skill") return 1
        const uid = curUid(g) || -1
        if (me.stacks[T("helm",
            "turn")] === g.s.turnNo) return me.stacks[T("helm",
            "uid")] === uid ? 0.7 : 1
        me.stacks[T("helm",
            "turn")] = g.s.turnNo
        me.stacks[T("helm",
            "uid")] = uid
        return 0.7
    },
    passive: {
        vi: "Thích Nghi · Phản Ứng Thích Nghi", en: "Adapt · Adaptive Reaction",
        descVi: "Giảm 30% sát thương của lá chiêu địch đầu tiên gây sát thương lên người đeo mỗi lượt (mọi gói sát thương của cùng lá). Lần đầu mỗi lượt 1 lá phản ứng (nối chuỗi) của người đeo giải quyết thành công (lá bị vô hiệu không tính): đội hồi 10 mana.",
        descEn: "The first enemy skill card that damages the wearer each turn deals 30% less (all damage packets of that card). The first time each turn a reaction (chained) card of the wearer resolves (negated cards don't count): your team restores 10 mana.",
    },
    hooks: {
        onCast(g, me, d) {
            if (d.caster.id !== me.id) return
            const ev = [...g.events].reverse().find((e) => e.t === "chainResolve" && e.card?.uid === d.card.uid)
            if (ev && ev.t === "chainResolve" && ev.n > 1 && g.oncePerTurn(me,
                "mu_thich_nghi")) g.gainMana(me,
                10,
                "restore")
        },
    },
})

// ---------------- Hàng Đai Khổng Lồ / Nước Mắt ----------------
reg({
    id: "giap_warmog", name: {
        vi: "Giáp Máu Warmog", en: "Warmog's Armor"
    },
    stats: {
        hp: 250
    },
    passive: {
        vi: "Dưỡng Sức · Sinh Lực Dư Thừa", en: "Recover · Overflow",
        descVi: "Đầu lượt của bạn, nếu người đeo không mất máu trong lượt địch vừa kết thúc (mất Khiên không tính): hồi {10% máu tối đa}. 50% lượng hồi dư từ nội tại đồ thành Khiên trắng của Warmog (Khiên này tối đa 15% máu tối đa).",
        descEn: "Start of your turn, if the wearer lost no HP during the enemy turn that just ended (losing Shield doesn't count): heal {10% max HP}. 50% of overhealing from item passives becomes a Warmog white Shield (this Shield caps at 15% max HP).",
    },
    hooks: {
        onDamage(g, me, d) {
            if (d.target.id === me.id && d.hpLost > 0 && g.s.active !== me.side) me.stacks[T("warmog",
                "lost")] = g.s.turnNo
        },
        onTurnStart(g, me, d) {
            if (d.side !== me.side || me.stacks[T("warmog",
                "lost")] === g.s.turnNo - 1) return
            healSelf(g,
                me,
                0.1 * me.maxHp)
        },
    },
})

reg({
    id: "day_chuyen_chuoc_toi", name: {
        vi: "Dây Chuyền Chuộc Tội", en: "Redemption"
    },
    stats: {
        hp: 150
    },
    healGivenMult: 1.2,
    // mana loại 1: chiêu có hồi máu/Khiên (nhận theo mô tả chiêu) của người đeo rẻ hơn 10
    manaCostMod: cheaper(10,
        (def) => /hồi|khiên|heal|shield/i.test(def.desc)),
    passive: {
        vi: "Ban Phước · Tiếp Lời Cầu Nguyện", en: "Blessing · Answered Prayer",
        descVi: "Hồi máu và Khiên người đeo ban ra mạnh hơn 20%; chiêu hồi máu hoặc tạo Khiên của người đeo tốn ít hơn 10 mana. Sau khi chiêu của người đeo thực sự hồi máu cho 2 đồng minh khác nhau trong 1 lượt: lấy 1 lá Q hoặc E của chính người đeo từ mộ lên tay (hồi chiêu 3 lượt của người đeo; không tính hồi máu của đồ).",
        descEn: "Healing and Shields granted by the wearer are 20% stronger; the wearer's healing or shielding skills cost 10 less mana. After the wearer's skills actually heal 2 different allies in one turn: return one of its own Q or E cards from the graveyard to hand (3-turn cooldown of the wearer; item healing doesn't count).",
    },
    hooks: {
        onHeal(g, me, d) {
            if (d.src?.id !== me.id || d.target.side !== me.side || d.amount <= 0 || itemHealDepth > 0) return
            if (g.cur.src !== me.id || !g.cur.card?.startsWith(`${me.hero}_`)) return
            me.stacks[T("redeem",
                d.target.id)] = g.s.turnNo
            const n = Object.keys(me.stacks).filter((k) => k.startsWith(T("redeem",
                "")) && me.stacks[k] === g.s.turnNo).length
            if (n < 2 || !cdReady(g,
                me,
                "day_chuyen_chuoc_toi")) return
            const c = g.lastGrave(me.side,
                (x) => x.kind === "skill" && x.hero === me.hero && (x.id === `${me.hero}_q` || x.id === `${me.hero}_e`))
            if (!c) return
            cdStart(g,
                me,
                "day_chuyen_chuoc_toi",
                3)
            g.fromGrave(me.side,
                c.uid)
        },
    },
})

reg({
    id: "bua_lam", name: {
        vi: "Bùa Xanh", en: "Blue Buff"
    },
    stats: {
    },
    manaRegen: 10, // mana loại 2
    manaCostMod: cheaper(5), // mana loại 1
    passive: {
        vi: "Suối Lam · Tiết Kiệm", en: "Mana Spring · Thrift",
        descVi: "Đầu lượt của bạn: đội hồi thêm 10 mana (khi người đeo còn trên sân). Chiêu của người đeo tốn ít hơn 5 mana.",
        descEn: "Start of your turn: your team regains 10 more mana (while the wearer is on the board). The wearer's skills cost 5 less mana.",
    },
})

// ======================================================================
// Bảng ghép 8x8 (V4): mỗi cặp mảnh ra đúng 1 món
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
        "cuong_dao",
        "vo_cuc_kiem",
        "ao_choang_bong_toi",
        "dao_tim",
        "sterak",
        "giao_shojin"],
    ["mu_rabadon",
        "nanh_nashor",
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
    "omnivamp",
    "attackSpeed"]
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
        spellAmp: "sát thương chiêu", dmgAmp: "sát thương", lifesteal: "Hút máu", omnivamp: "Hút máu toàn phần", extraAtk: "sát thương đòn đánh", attackSpeed: "Tốc Đánh",
    },
    en: {
        atk: "AD", ap: "AP", hp: "HP", armor: "Armor", mr: "MR", crit: "Crit chance", critDmg: "crit damage", atkMult: "AD", lethality: "Lethality", magicPen: "Magic pen",
        spellAmp: "skill damage", dmgAmp: "damage", lifesteal: "Life steal", omnivamp: "Omnivamp", extraAtk: "attack damage", attackSpeed: "Attack Speed",
    },
}

/** Dòng chỉ số: "+40 AD, +5% AD, +25% Chí mạng" */
export function itemStatLine(stats: Partial<UnitStats>, lang: Lang = "vi"): string {
    const num = (x: number) => String(Math.round(x * 10) / 10).replace(".",
        lang === "vi" ? "," : ".")
    return STAT_ORDER.filter((k) => stats[k]).map((k) => (PCT.has(k) ? `+${num(stats[k]! * 100)}% ${STAT_NAME[lang][k]}` : `+${num(stats[k]!)} ${STAT_NAME[lang][k]}`)).join(", ")
}
/** Dòng chỉ số đầy đủ của món: chỉ số + AD/AP thích ứng + hồi mana đội (giảm chi phí chiêu ghi trong nội tại) */
function fullStatLine(def: CardItemDef, lang: Lang): string {
    const parts: string[] = []
    const base = itemStatLine(def.stats,
        lang)
    if (base) parts.push(base)
    if (def.adaptive) parts.push(lang === "vi" ? `+${def.adaptive} AD/AP thích ứng` : `+${def.adaptive} adaptive AD/AP`)
    if (def.manaRegen) parts.push(lang === "vi" ? `+${def.manaRegen} hồi mana đội mỗi lượt` : `+${def.manaRegen} team mana regen per turn`)
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
