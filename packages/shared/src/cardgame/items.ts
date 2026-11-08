// Đồ chế độ thẻ bài (bản chốt 01/11/2026, law.md 11d): 8 mảnh (đeo riêng được) + 36 món huyền thoại, mỗi món đúng 1 nội tại.
// Số liệu của 36 món nằm ở balance/items.json, đọc qua itemBalance(id): `stats` (chỉ số, chí mạng 0,5 cũng là chỉ số) và `p` (tham số nội tại b, c, d theo docs/heroes/ITEMS.md).
// Chữ VI/EN của món dựng từ cùng các giá trị JSON đó. Hướng dẫn sửa: docs/heroes/BALANCE.md.
// Engine (game.ts) đọc CARD_ITEMS: stats/bonus/mult -> Game.stats, hooks -> Game.hook, dmgMult/takenMult/modifyDamage -> Game.damage,
// healMult / healGivenMult -> Game.heal/shield, spellCritMult -> Game.damage, manaRegen -> mana đội, anyTarget -> attackTargets. Bảng ghép 8x8 ở CARD_RECIPES (cardCombine).
// Đồ không giảm mana chiêu. Đồ mana hồi bể mana chung của đội và cho "lá miễn phí" (freeCard): lá chiêu tạm của tướng đeo, không tốn mana, tồn tại tới hết lượt đối phương.
import {
    itemBalance
} from "./balance"
import {
    formulaText
} from "./formula"
import type {
    Game, UnitStats
} from "./game"
import {
    RULES, otherSide,
    type HeroHooks, type ShieldKind, type Side, type SkillKey, type Unit
} from "./types"

export interface CardItemDef {
  id: string;
  /** Tên hiển thị VI/EN */
  name: { vi: string; en: string };
  /** Chỉ số chế độ thẻ (THAY baseStats(item) trong Game.stats) */
  stats: Partial<UnitStats>;
  passive: { vi: string; en: string; descVi: string; descEn: string };
  /** Bộ đếm hiện: key `item:${id}` */
  stack?: { max?: number; start?: number; vi: string; en: string };
  /** Chỉ số cộng thêm theo bộ đếm (đọc u.stacks, KHÔNG gọi g.stats bên trong) */
  bonus?(g: Game, u: Unit): Partial<UnitStats>;
  /** Nhân sát thương ĐI RA của tướng đeo. Có thể đặt d.crit = true để đánh dấu sát thương chí mạng. */
  dmgMult?(g: Game, me: Unit, d: { target: Unit; kind: import("./types").DamageKind; tag: string; crit?: boolean }): number;
  /** Nhân sát thương NHẬN VÀO của tướng đeo (chỉ khi src là địch) */
  takenMult?(g: Game, me: Unit, d: { src: Unit; kind: import("./types").DamageKind; tag: string }): number;
  /** Nhân hồi máu và Khiên tướng đeo nhận (áp trước Vết Thương Sâu) */
  healMult?: number;
  /** Đòn đánh của tướng đeo chọn được mọi tướng địch + vật triệu hồi */
  anyTarget?: boolean;
  /** AD nếu tướng đeo đánh vật lý, AP nếu đánh phép (cộng vào chỉ số khi đeo) */
  adaptive?: number;
  /** Cộng % lên tổng chỉ số (sau khi cộng mọi nguồn): { ap: 0.3 } = tổng AP +30% (Rabadon) */
  mult?: Partial<Record<keyof UnitStats, number>>;
  /** Nhân sát thương cho MỌI sát thương trong trận khi tướng đeo đang trên sân (xem HeroDef.modifyDamage). Không gọi g.damage bên trong. */
  modifyDamage?(g: Game, me: Unit, d: { src?: Unit; target: Unit; kind: import("./types").DamageKind; tag: string; crit?: boolean }): number;
  /** Nhân hồi máu/Khiên BAN RA của tướng đeo (g.heal/g.shield có src = tướng đeo; Giáp ban ra nhân g.givenMult) */
  healGivenMult?: number;
  /** Chiêu (tag "skill") của tướng đeo chí mạng theo tỉ lệ chí mạng của nó với hệ số này (Găng Bảo Thạch) */
  spellCritMult?: number;
  /** Mana loại 2: + hồi mana đội mỗi đầu lượt của bạn khi người đeo còn trên sân (Bùa Xanh) */
  manaRegen?: number;
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
/** Đồ không còn cộng "mana tối đa" (chốt 31/10/2026): luôn 0; giữ export cho engine */
export const itemManaOf = (_u: Unit) => 0
/** Tướng địch (không phải vật triệu hồi) đang trên sân */
const foe = (me: Unit, t: Unit | undefined): t is Unit => !!t && t.side !== me.side && !t.token && t.status === "board"
/** Số lượt (tính theo chủ `side`) để trạng thái kéo dài "đến hết lượt kế tiếp của side": nếu đang là lượt của side thì phải tính cả lượt sau */
const nextTurns = (g: Game, side: Side) => (g.s.active === side ? 2 : 1)
/** Id lá đang giải quyết dạng số (để gom nhiều gói sát thương của cùng 1 lá) */
const curUid = (g: Game) => Number((g.cur.uid ?? "").replace(/\D/g,
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
/** Máu vừa tụt từ trên `pct` xuống `pct` hoặc thấp hơn (sau gói sát thương, còn sống) */
const crossed = (me: Unit, hpLost: number, pct: number) => hpLost > 0 && me.hp > 0 && me.hp <= pct * me.maxHp && me.hp + hpLost > pct * me.maxHp
/** Chuỗi đòn trúng liên tiếp cùng 1 tướng địch trong lượt (Móc Diệt Thủy Quái). Trả số đòn liên tiếp tính cả đòn này. */
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

/** Lá miễn phí của đồ mana: giảm mana lớn bằng cả bể nên mana = 0 chắc chắn (xem Game.manaCost) */
export const FREE_CARD_MANA_OFF = RULES.teamManaMax
/** Cho tướng đeo 1 lá chiêu tạm (Q/E/R) miễn phí: không tốn mana, tồn tại tới hết lượt đối phương. Trả lá hoặc undefined. */
export function freeCard(g: Game, me: Unit, keys: SkillKey[]): ReturnType<Game["tempSkillCard"]> | undefined {
    if (me.status !== "board" || me.token) return undefined
    const have = keys.filter((k) => g.hero(me).skills[k])
    if (!have.length) return undefined
    const key = have[g.randInt(have.length)]
    const card = g.tempSkillCard(me.hero,
        me.side,
        key,
        {
            manaOff: FREE_CARD_MANA_OFF, free: 1
        })
    g.giveCard(me.side,
        card,
        "hand")
    return card
}
/** Tung `qe`% nhận lá Q hoặc E miễn phí, rồi (nếu có `r`) `r`% nhận lá R miễn phí; hai lần tung độc lập, R luôn thấp hơn Q/E ở số liệu */
function rollFree(g: Game, me: Unit, qe: number, r = 0) {
    if (qe > 0 && g.roll(qe / 100)) freeCard(g,
        me,
        ["Q",
            "E"])
    if (r > 0 && g.roll(r / 100)) freeCard(g,
        me,
        ["R"])
}
const CC_IDS = ["stun",
    "silence",
    "root",
    "knockup",
    "taunt",
    "freeze",
    "frozen",
    "charm",
    "blind",
    "disarm"]

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
/** Số liệu JSON của món + định dạng số cho chữ */
function bal(id: string) {
    const b = itemBalance(id)
    return {
        stats: b.stats as Partial<UnitStats>, p: b.p
    }
}
/** Số dạng chữ: 1,5 (VI) / 1.5 (EN) */
const nv = (x: number) => String(x).replace(".",
    ",")
const ne = (x: number) => String(x)

// ======================================================================
// 8 mảnh (đeo riêng được)
// ======================================================================
const PIECE_VI = "Đeo riêng (chiếm 1 ô) hoặc ghép tại chỗ: thêm 1 mảnh + 1 Vàng thành món theo bảng ghép."
const PIECE_EN = "Wear it alone (1 slot) or upgrade in place: add 1 more component + 1 Gold to make the item in the recipe table."
function piece(id: string, vi: string, en: string, stats: Partial<UnitStats>) {
    reg({
        id, name: {
            vi, en
        }, stats,
        passive: {
            vi: "", en: "", descVi: PIECE_VI, descEn: PIECE_EN
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
    })

// ======================================================================
// 36 món huyền thoại (mỗi món 1 nội tại; số ở balance/items.json)
// ======================================================================

// ---------------- Hàng Kiếm Dài ----------------
{
    const { stats } = bal("kiem_tu_than")
    reg({
        id: "kiem_tu_than", name: {
            vi: "Kiếm Tử Thần", en: "Deathblade"
        }, stats,
        passive: {
            vi: "Không có nội tại", en: "No passive", descVi: "Không có nội tại: toàn bộ sức mạnh nằm ở chỉ số.", descEn: "No passive: all of its power is in the stats."
        },
    })
}

{
    const { stats, p } = bal("sung_hextech")
    reg({
        id: "sung_hextech", name: {
            vi: "Kiếm Súng Hextech", en: "Hextech Gunblade"
        }, stats,
        passive: {
            vi: "Hấp Thụ", en: "Siphon",
            descVi: `Hồi máu bằng ${nv(p.c)}% sát thương thực tế người đeo gây ra.`,
            descEn: `Heal for ${ne(p.c)}% of the actual damage the wearer deals.`,
        },
        hooks: {
            onDamage(g, me, d) {
                if (d.src?.id !== me.id || d.target.id === me.id || d.target.side === me.side || me.status !== "board") return
                const dealt = d.hpLost + d.absorbed
                if (dealt > 0) g.heal(me,
                    me,
                    dealt * p.c / 100)
            },
        },
    })
}

{
    const { stats, p } = bal("cuong_dao")
    const max = Math.round(p.d / p.c)
    reg({
        id: "cuong_dao", name: {
            vi: "Cuồng Đao Guinsoo", en: "Guinsoo's Rageblade"
        }, stats,
        stack: {
            max, vi: "Cuồng Nộ", en: "Wrath"
        },
        bonus: (_g, u) => ({
            attackSpeed: p.c * cnt(u,
                "cuong_dao")
        }),
        passive: {
            vi: "Cuồng Nộ", en: "Wrath",
            descVi: `Mỗi đòn đánh trúng tướng địch: +${nv(p.c)}% Tốc Đánh vĩnh viễn, tối đa +${nv(p.d)} (giữ qua lượt và qua chết).`,
            descEn: `Each attack that hits an enemy champion: +${ne(p.c)} Attack Speed permanently, max +${ne(p.d)} (kept across turns and death).`,
        },
        hooks: {
            onAttackHit(g, me, d) {
                if (myHit(me,
                    d) && foe(me,
                    d.target)) g.stack(me,
                    KEY("cuong_dao"),
                    1,
                    max)
            },
        },
    })
}

{
    const { stats, p } = bal("vo_cuc_kiem")
    reg({
        id: "vo_cuc_kiem", name: {
            vi: "Vô Cực Kiếm", en: "Infinity Edge"
        }, stats,
        passive: {
            vi: "Cạnh Sắc", en: "Keen Edge",
            descVi: `Đòn chí mạng bỏ qua ${nv(p.b)} Giáp của mục tiêu.`,
            descEn: `Critical attacks ignore ${ne(p.b)} Armor of the target.`,
        },
        hooks: {
            onAttack(_g, me, d) {
                if (d.attacker.id === me.id) d.info.critArmorPen = p.b
            },
        },
    })
}

{
    const { stats } = bal("ao_choang_bong_toi")
    reg({
        id: "ao_choang_bong_toi", name: {
            vi: "Áo Choàng Bóng Tối", en: "Edge of Night"
        }, stats,
        stack: {
            max: 1, start: 1, vi: "Thoát Chết", en: "Escape"
        },
        passive: {
            vi: "Thoát Chết", en: "Escape",
            descVi: "Khi sắp bị hạ gục: giữ lại 1 máu (1 lần mỗi trận).",
            descEn: "When it would be taken down: it stays at 1 HP (once per match).",
        },
        hooks: {
            onLethal(g, me, d) {
                if (d.target.id !== me.id || me.hp > 0 || cnt(me,
                    "ao_choang_bong_toi") < 1) return
                g.setStack(me,
                    KEY("ao_choang_bong_toi"),
                    0)
                g.surviveWith(me,
                    1)
            },
        },
    })
}

{
    const { stats, p } = bal("dao_tim")
    reg({
        id: "dao_tim", name: {
            vi: "Đao Tím", en: "Wit's End"
        }, stats,
        passive: {
            vi: "Phòng Tuyến Tím", en: "Violet Line",
            descVi: `Khi máu vừa tụt từ trên 50% xuống 50% hoặc thấp hơn mà còn sống: nhận ${nv(p.c)} Khiên phép (xanh) tới hết lượt kế tiếp của người đeo (hồi chiêu ${nv(p.d)} lượt của người đeo).`,
            descEn: `When HP drops from above 50% to 50% or lower and the wearer survives: gain a ${ne(p.c)} magic (blue) Shield until end of the wearer's next turn (${ne(p.d)}-turn cooldown of the wearer).`,
        },
        hooks: {
            onDamage(g, me, d) {
                if (d.target.id !== me.id || !crossed(me,
                    d.hpLost,
                    0.5) || !cdReady(g,
                    me,
                    "dao_tim")) return
                cdStart(g,
                    me,
                    "dao_tim",
                    p.d)
                shieldNext(g,
                    me,
                    me,
                    p.c,
                    "magic")
            },
        },
    })
}

{
    const { stats, p } = bal("sterak")
    reg({
        id: "sterak", name: {
            vi: "Móng Vuốt Sterak", en: "Sterak's Gage"
        }, stats,
        bonus: (_g, u) => ({
            atk: u.maxHp > 0 ? p.c * Math.floor(10 * Math.max(0,
                u.maxHp - u.hp) / u.maxHp + 1e-9) : 0,
        }),
        passive: {
            vi: "Càng Đau Càng Mạnh", en: "Pain Fuel",
            descVi: `Mỗi 10% máu tối đa đã mất: +${nv(p.c)} AD (tính lại theo máu đang thiếu).`,
            descEn: `Every 10% max HP missing: +${ne(p.c)} AD (recalculated from missing HP).`,
        },
    })
}

{
    const { stats, p } = bal("giao_shojin")
    reg({
        id: "giao_shojin", name: {
            vi: "Ngọn Giáo Shojin", en: "Spear of Shojin"
        }, stats,
        passive: {
            vi: "Nạp Năng Lượng", en: "Energize",
            descVi: `Mỗi đòn đánh trúng tướng địch: đội hồi ${nv(p.b)} mana; ${nv(p.c)}% nhận 1 lá Q hoặc E miễn phí của người đeo, ${nv(p.d)}% nhận 1 lá R miễn phí (lá chiêu tạm, không tốn mana, tồn tại tới hết lượt đối phương).`,
            descEn: `Each attack hit on an enemy champion: your team restores ${ne(p.b)} mana; ${ne(p.c)}% to get a free Q or E card of the wearer, ${ne(p.d)}% to get a free R card (temporary skill card, costs no mana, lasts until end of the opponent's turn).`,
        },
        hooks: {
            onAttackHit(g, me, d) {
                if (!myHit(me,
                    d) || !foe(me,
                    d.target)) return
                g.gainMana(me,
                    p.b,
                    "restore")
                rollFree(g,
                    me,
                    p.c,
                    p.d)
            },
        },
    })
}

// ---------------- Hàng Gậy Quá Khổ ----------------
{
    const { stats, p } = bal("mu_rabadon")
    reg({
        id: "mu_rabadon", name: {
            vi: "Mũ Phù Thủy Rabadon", en: "Rabadon's Deathcap"
        }, stats,
        mult: {
            ap: p.b / 100
        },
        passive: {
            vi: "Đại Pháp Sư", en: "Archmage",
            descVi: `Tổng AP của người đeo tăng ${nv(p.b)}%.`,
            descEn: `The wearer's total AP is increased by ${ne(p.b)}%.`,
        },
    })
}

{
    const { stats, p } = bal("nanh_nashor")
    reg({
        id: "nanh_nashor", name: {
            vi: "Nanh Nashor", en: "Nashor's Tooth"
        }, stats,
        passive: {
            vi: "Nanh Phép", en: "Spell Fang",
            descVi: `Đòn đánh trúng gây thêm {${nv(p.c)}% AP} sát thương phép (không chí mạng).`,
            descEn: `Attack hits deal {${ne(p.c)}% AP} extra magic damage (cannot crit).`,
        },
        hooks: {
            onAttack(g, me, d) {
                if (myHit(me,
                    d)) d.info.bonus.push({
                    raw: g.f(me,
                        `${p.c}% AP`), kind: "magic"
                })
            },
        },
    })
}

{
    const { stats } = bal("gang_bao_thach")
    reg({
        id: "gang_bao_thach", name: {
            vi: "Găng Bảo Thạch", en: "Jeweled Gauntlet"
        }, stats,
        spellCritMult: RULES.critBase,
        passive: {
            vi: "Phép Thuật Bạo Kích", en: "Spell Crit",
            descVi: "Lá chiêu gốc của người đeo chí mạng được theo tỉ lệ chí mạng (×2,25), tung 1 lần mỗi lá; sát thương proc của đồ không chí mạng.",
            descEn: "The wearer's skill cards can crit using crit chance (×2.25), rolled once per card; item procs cannot crit.",
        },
    })
}

{
    const { stats, p } = bal("vuong_mien")
    reg({
        id: "vuong_mien", name: {
            vi: "Vương Miện Hoàng Gia", en: "Crownguard"
        }, stats,
        passive: {
            vi: "Bảo Hộ", en: "Ward",
            descVi: `Lá chiêu đầu tiên người đeo dùng mỗi lượt: nhận ${nv(p.c)} Khiên vật lý (vàng) tới hết lượt kế tiếp của người đeo.`,
            descEn: `The first skill card the wearer uses each turn: gain a ${ne(p.c)} physical (yellow) Shield until end of the wearer's next turn.`,
        },
        hooks: {
            onCast(g, me, d) {
                if (d.caster.id !== me.id || !g.oncePerTurn(me,
                    "vuong_mien")) return
                shieldNext(g,
                    me,
                    me,
                    p.c,
                    "physical")
            },
        },
    })
}

{
    const { stats, p } = bal("quy_thu")
    reg({
        id: "quy_thu", name: {
            vi: "Quỷ Thư Morello", en: "Morellonomicon"
        }, stats,
        passive: {
            vi: "Vết Thương Sâu", en: "Grievous Wounds",
            descVi: `Chiêu gây sát thương khiến mục tiêu bị Vết Thương Sâu (hồi máu và Khiên nhận vào -50%) trong ${nv(p.c)} đơn vị.`,
            descEn: `Damaging skills apply Grievous Wounds (-50% healing and shields received) to the target for ${ne(p.c)} unit(s).`,
        },
        hooks: {
            onDamage(g, me, d) {
                if (d.src?.id !== me.id || d.tag !== "skill" || d.amount <= 0 || !foe(me,
                    d.target)) return
                g.timed(me,
                    d.target,
                    "grievous",
                    p.c)
            },
        },
    })
}

{
    const { stats, p } = bal("mat_na_liandry")
    reg({
        id: "mat_na_liandry", name: {
            vi: "Mặt Nạ Đọa Đày Liandry", en: "Liandry's Torment"
        }, stats,
        passive: {
            vi: "Tro Tàn", en: "Ashes",
            descVi: `Chiêu gây sát thương đặt Tro Tàn lên mục tiêu: đầu mỗi lượt của mục tiêu trong ${nv(p.d)} đơn vị, nó nhận sát thương phép bằng ${nv(p.c)}% máu tối đa của nó. Tro Tàn đã đặt vẫn cháy khi người đeo đã chết; đặt lại chỉ làm mới thời hạn.`,
            descEn: `Damaging skills apply Ashes to the target: at the start of each of its turns for ${ne(p.d)} unit(s), it takes magic damage equal to ${ne(p.c)}% of its max HP. Ashes already placed keep burning after the wearer dies; reapplying only refreshes the duration.`,
        },
        offBoardHooks: ["onTurnStart"],
        hooks: {
            onDamage(_g, me, d) {
                if (d.src?.id === me.id && d.tag === "skill" && d.amount > 0 && foe(me,
                    d.target)) me.stacks[T("ash",
                    d.target.id)] = p.d
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
                        p.c / 100 * t.maxHp,
                        "magic",
                        {
                            tag: "dot"
                        })
                }
            },
        },
    })
}

{
    const { stats, p } = bal("truong_truong_sinh")
    reg({
        id: "truong_truong_sinh", name: {
            vi: "Quyền Trượng Thiên Thần", en: "Archangel's Staff"
        }, stats,
        passive: {
            vi: "Lá Miễn Phí", en: "Free Cast",
            descVi: `Khi người đeo dùng chiêu: ${nv(p.b)}% nhận 1 lá Q hoặc E miễn phí của nó, ${nv(p.c)}% nhận 1 lá R miễn phí (lá chiêu tạm, không tốn mana, tồn tại tới hết lượt đối phương).`,
            descEn: `When the wearer uses a skill: ${ne(p.b)}% to get a free Q or E card of its own, ${ne(p.c)}% to get a free R card (temporary skill card, costs no mana, lasts until end of the opponent's turn).`,
        },
        hooks: {
            onCast(g, me, d) {
                if (d.caster.id === me.id) rollFree(g,
                    me,
                    p.b,
                    p.c)
            },
        },
    })
}

// ---------------- Hàng Cung Gỗ ----------------
{
    const { stats } = bal("dai_bac")
    reg({
        id: "dai_bac", name: {
            vi: "Đại Bác Liên Thanh", en: "Rapid Firecannon"
        }, stats,
        anyTarget: true,
        passive: {
            vi: "Tầm Xa", en: "Long Range",
            descVi: "Đòn đánh chọn được mọi tướng địch hoặc vật triệu hồi đang chọn được (vẫn theo Khiêu Khích).",
            descEn: "Attacks can target any targetable enemy or summon (Taunt still applies).",
        },
    })
}

{
    const { stats, p } = bal("diet_khong_lo")
    reg({
        id: "diet_khong_lo", name: {
            vi: "Diệt Khổng Lồ", en: "Giant Slayer"
        }, stats,
        passive: {
            vi: "Chênh Lệch", en: "Disparity",
            descVi: `Đòn đánh và chiêu gây thêm ${nv(p.b)}% sát thương lên tướng địch có máu tối đa cao hơn người đeo.`,
            descEn: `Attacks and skills deal ${ne(p.b)}% more damage to enemy champions with higher max HP than the wearer.`,
        },
        dmgMult(_g, me, d) {
            return (d.tag === "attack" || d.tag === "skill") && foe(me,
                d.target) && d.target.maxHp > me.maxHp ? 1 + p.b / 100 : 1
        },
    })
}

/** Tướng địch `e` nằm trong vùng Hàn Khí của `w` (đường đối diện ±1) */
function frostCovers(w: Unit, e: Unit): boolean {
    return w.status === "board" && !e.token && e.side !== w.side && e.status === "board" && w.lane >= 0 && w.lane <= 4 && Math.abs(e.lane - w.lane) <= 1
}
{
    const { stats, p } = bal("tim_bang")
    reg({
        id: "tim_bang", name: {
            vi: "Tim Băng", en: "Frozen Heart"
        }, stats,
        passive: {
            vi: "Hàn Khí", en: "Chill",
            descVi: `Tướng địch đối diện và 2 ô kề nó gây ít hơn ${nv(p.c)}% sát thương đòn đánh lên tướng phe bạn (nhiều Tim Băng không nhân lên).`,
            descEn: `The enemy opposite and the 2 slots beside it deal ${ne(p.c)}% less attack damage to your champions (multiple Frozen Hearts don't multiply).`,
        },
        modifyDamage(g, me, d) {
            if (d.tag !== "attack" || !d.src || d.target.side !== me.side || !frostCovers(me,
                d.src)) return 1
            // chỉ 1 hào quang mỗi địch: người đeo đầu tiên (theo thứ tự sân) đang che kẻ đánh
            const first = g.heroes(me.side).find((w) => w.items.includes("tim_bang") && frostCovers(w,
d.src!))
            return first?.id === me.id ? 1 - p.c / 100 : 1
        },
    })
}

{
    const { stats, p } = bal("sat_thu_kraken")
    reg({
        id: "sat_thu_kraken", name: {
            vi: "Móc Diệt Thủy Quái", en: "Kraken Slayer"
        }, stats,
        passive: {
            vi: "Dồn Đòn", en: "Triple Strike",
            descVi: `Đòn đánh thứ 3 liên tiếp trúng cùng 1 tướng địch trong lượt gây thêm {${nv(p.c)} + ${nv(p.d)}% AD} sát thương chuẩn (không chí mạng; đổi mục tiêu mất nhịp).`,
            descEn: `The 3rd consecutive attack hit on the same enemy champion in a turn deals {${ne(p.c)} + ${ne(p.d)}% AD} extra true damage (cannot crit; switching target resets).`,
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
                    d.target) === 3) d.info.bonus.push({
                    raw: g.f(me,
                        `${p.c} + ${p.d}% AD`), kind: "true"
                })
            },
        },
    })
}

{
    const { stats, p } = bal("y_chi_titan")
    reg({
        id: "y_chi_titan", name: {
            vi: "Rìu Đại Mãng Xà", en: "Titanic Hydra"
        }, stats,
        passive: {
            vi: "Sức Nặng", en: "Heft",
            descVi: `Đòn đánh trúng gây thêm {${nv(p.c)}% máu tối đa} của người đeo làm sát thương vật lý (không chí mạng).`,
            descEn: `Attack hits deal {${ne(p.c)}% max HP} of the wearer as extra physical damage (cannot crit).`,
        },
        hooks: {
            onAttack(_g, me, d) {
                if (myHit(me,
                    d)) d.info.bonus.push({
                    raw: p.c / 100 * me.maxHp, kind: "physical"
                })
            },
        },
    })
}

{
    const { stats, p } = bal("than_kiem_manamune")
    reg({
        id: "than_kiem_manamune", name: {
            vi: "Kiếm Manamune", en: "Manamune"
        }, stats,
        passive: {
            vi: "Nạp Lại", en: "Recharge",
            descVi: `Khi người đeo dùng chiêu: đòn đánh trúng kế tiếp của nó hồi ${nv(p.c)} mana cho đội; ${nv(p.d)}% nhận 1 lá Q hoặc E miễn phí (lá chiêu tạm, không tốn mana, tồn tại tới hết lượt đối phương).`,
            descEn: `When the wearer uses a skill: its next attack hit restores ${ne(p.c)} team mana; ${ne(p.d)}% to get a free Q or E card (temporary skill card, costs no mana, lasts until end of the opponent's turn).`,
        },
        hooks: {
            onCast(g, me, d) {
                if (d.caster.id !== me.id) return
                me.stacks[T("manamune",
                    "charge")] = 1
                rollFree(g,
                    me,
                    p.d)
            },
            onAttackHit(g, me, d) {
                if (!myHit(me,
                    d) || !me.stacks[T("manamune",
                    "charge")]) return
                me.stacks[T("manamune",
                    "charge")] = 0
                g.gainMana(me,
                    p.c,
                    "restore")
            },
        },
    })
}

// ---------------- Hàng Găng Đấu Tập ----------------
{
    const { stats, p } = bal("ke_thu_thap")
    reg({
        id: "ke_thu_thap", name: {
            vi: "Súng Hải Tặc", en: "The Collector"
        }, stats,
        passive: {
            vi: "Đà Săn Mồi", en: "Hunter's Momentum",
            descVi: `Đòn đánh và chiêu của người đeo lên tướng địch gây thêm tới ${nv(p.b)}% sát thương theo tỉ lệ máu đã mất của mục tiêu (mất 50% máu thì thêm ${nv(p.b / 2)}%).`,
            descEn: `The wearer's attacks and skills on enemy champions deal up to ${ne(p.b)}% more damage based on the target's missing HP (50% missing HP gives ${ne(p.b / 2)}%).`,
        },
        dmgMult(_g, me, d) {
            if ((d.tag !== "attack" && d.tag !== "skill") || !foe(me,
                d.target) || d.target.maxHp <= 0) return 1
            return 1 + p.b / 100 * Math.max(0,
                1 - d.target.hp / d.target.maxHp)
        },
    })
}

{
    const { stats, p } = bal("giap_thien_than")
    reg({
        id: "giap_thien_than", name: {
            vi: "Giáp Thiên Thần", en: "Guardian Angel"
        }, stats,
        stack: {
            max: 1, start: 1, vi: "Phục Sinh", en: "Rebirth"
        },
        passive: {
            vi: "Phục Sinh", en: "Rebirth",
            descVi: `Lần đầu bị hạ trong trận: lập tức đứng dậy tại ô cũ với ${nv(p.b)}% máu tối đa, không mất mạng (1 lần mỗi trận).`,
            descEn: `The first time it is taken down in a match: it immediately stands back up in its slot with ${ne(p.b)}% max HP and no life is lost (once per match).`,
        },
        hooks: {
            onLethal(g, me, d) {
                if (d.target.id !== me.id || me.hp > 0 || cnt(me,
                    "giap_thien_than") < 1) return
                g.setStack(me,
                    KEY("giap_thien_than"),
                    0)
                g.surviveWith(me,
                    p.b / 100 * me.maxHp)
            },
        },
    })
}

{
    const { stats, p } = bal("khan_giai_thuat")
    reg({
        id: "khan_giai_thuat", name: {
            vi: "Khăn Giải Thuật", en: "Quicksilver Sash"
        }, stats,
        passive: {
            vi: "Thanh Tẩy", en: "Cleanse",
            descVi: `Huỷ lần khống chế đầu tiên sắp áp lên người đeo, gồm cả khống chế khác từ cùng lá đó (hồi chiêu ${nv(p.b)} lượt của người đeo).`,
            descEn: `Cancels the first crowd control about to land on the wearer, including other crowd control from the same card (${ne(p.b)}-turn cooldown of the wearer).`,
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
                    p.b)
                d.cancel = true
                me.stacks[T("qss",
                    "uid")] = uid
                me.stacks[T("qss",
                    "turn")] = g.s.turnNo
            },
        },
    })
}

{
    const { stats, p } = bal("tim_khong_than")
    reg({
        id: "tim_khong_than", name: {
            vi: "Trái Tim Khổng Thần", en: "Heartsteel"
        }, stats,
        stack: {
            vi: "Nhịp Tim", en: "Heartbeat"
        },
        passive: {
            vi: "Nhịp Tim", en: "Heartbeat",
            descVi: `Lần đầu mỗi lượt người đeo đánh chí mạng: +${nv(p.b)} máu tối đa vĩnh viễn (giữ qua chết).`,
            descEn: `The first time each turn the wearer lands a critical attack: +${ne(p.b)} max HP permanently (kept through death).`,
        },
        hooks: {
            onCrit(g, me, d) {
                if (d.attacker.id !== me.id || !g.oncePerTurn(me,
                    "tim_khong_than")) return
                const n = g.stack(me,
                    KEY("tim_khong_than"),
                    1)
                g.setAuraMaxHp(me,
                    "tim_khong_than",
                    p.b * n)
            },
        },
    })
}

{
    const { stats, p } = bal("ban_dong_hanh_luden")
    reg({
        id: "ban_dong_hanh_luden", name: {
            vi: "Vọng Âm Luden", en: "Luden's Echo"
        }, stats,
        passive: {
            vi: "Dội Âm", en: "Echo",
            descVi: `Đòn đánh chí mạng của người đeo: đội hồi ${nv(p.c)} mana; ${nv(p.b)}% nhận 1 lá Q hoặc E miễn phí (lá chiêu tạm, không tốn mana, tồn tại tới hết lượt đối phương).`,
            descEn: `The wearer's critical attacks: your team restores ${ne(p.c)} mana; ${ne(p.b)}% to get a free Q or E card (temporary skill card, costs no mana, lasts until end of the opponent's turn).`,
        },
        hooks: {
            onCrit(g, me, d) {
                if (d.attacker.id !== me.id) return
                g.gainMana(me,
                    p.c,
                    "restore")
                rollFree(g,
                    me,
                    p.b)
            },
        },
    })
}

// ---------------- Hàng Giáp Lưới ----------------
{
    const { stats, p } = bal("ao_choang_gai")
    reg({
        id: "ao_choang_gai", name: {
            vi: "Giáp Gai", en: "Thornmail"
        }, stats,
        passive: {
            vi: "Gai Nhọn", en: "Thorns",
            descVi: `Khi chịu sát thương từ đòn đánh, kẻ đánh nhận {${nv(p.b)} + ${nv(p.c)}% Giáp} sát thương phép.`,
            descEn: `When damaged by an attack, the attacker takes {${ne(p.b)} + ${ne(p.c)}% Armor} magic damage.`,
        },
        hooks: {
            onAttackHit(g, me, d) {
                if (d.target.id !== me.id || d.info.miss || d.attacker.side === me.side || d.attacker.status !== "board") return
                g.damage(me,
                    d.attacker,
                    g.f(me,
                        `${p.b} + ${p.c}% Giáp`),
                    "magic",
                    {
                        tag: "effect"
                    })
            },
        },
    })
}

{
    const { stats, p } = bal("giap_gargoyle")
    reg({
        id: "giap_gargoyle", name: {
            vi: "Thú Tượng Thạch Giáp", en: "Gargoyle Stoneplate"
        }, stats,
        bonus: (g, u) => {
            const n = u.stacks[T("garg",
                "turn")] === g.s.turnNo ? u.stacks[T("garg",
                    "n")] ?? 0 : 0
            return {
                armor: p.c * n, mr: p.c * n
            }
        },
        passive: {
            vi: "Vây Hãm", en: "Besieged",
            descVi: `Mỗi tướng địch khác nhau gây sát thương lên người đeo trong lượt: +${nv(p.c)} Giáp và +${nv(p.c)} Kháng phép tới hết lượt đó.`,
            descEn: `Each different enemy champion that damages the wearer this turn: +${ne(p.c)} Armor and +${ne(p.c)} MR until end of that turn.`,
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
                if (me.stacks[sk] === t) return
                me.stacks[sk] = t
                me.stacks[T("garg",
                    "n")] = (me.stacks[T("garg",
                    "n")] ?? 0) + 1
            },
        },
    })
}

{
    const { stats, p } = bal("ao_choang_lua")
    reg({
        id: "ao_choang_lua", name: {
            vi: "Áo Choàng Lửa", en: "Sunfire Cape"
        }, stats,
        passive: {
            vi: "Hỏa Quyển", en: "Immolate",
            descVi: `Đầu lượt của bạn: tướng địch đối diện và 2 đường kề nhận sát thương phép bằng {${nv(p.c)}% máu tối đa} của người đeo.`,
            descEn: `Start of your turn: the enemy opposite and the 2 adjacent lanes take magic damage equal to {${ne(p.c)}% max HP} of the wearer.`,
        },
        hooks: {
            onTurnStart(g, me, d) {
                if (d.side !== me.side) return
                for (const e of g.heroes(otherSide(me.side))) {
                    if (Math.abs(e.lane - me.lane) > 1) continue
                    g.damage(me,
                        e,
                        p.c / 100 * me.maxHp,
                        "magic",
                        {
                            tag: "effect"
                        })
                }
            },
        },
    })
}

{
    const { stats, p } = bal("loi_the_ho_ve")
    reg({
        id: "loi_the_ho_ve", name: {
            vi: "Lời Thề Hiệp Sĩ", en: "Knight's Vow"
        }, stats,
        passive: {
            vi: "Tiếp Sức", en: "Relief",
            descVi: `Đầu lượt của bạn: đội hồi ${nv(p.b)} mana; ${nv(p.c)}% nhận 1 lá Q hoặc E miễn phí của người đeo (lá chiêu tạm, không tốn mana, tồn tại tới hết lượt đối phương).`,
            descEn: `Start of your turn: your team restores ${ne(p.b)} mana; ${ne(p.c)}% to get a free Q or E card of the wearer (temporary skill card, costs no mana, lasts until end of the opponent's turn).`,
        },
        hooks: {
            onTurnStart(g, me, d) {
                if (d.side !== me.side) return
                g.gainMana(me,
                    p.b,
                    "restore")
                rollFree(g,
                    me,
                    p.c)
            },
        },
    })
}

// ---------------- Hàng Áo Choàng Bạc ----------------
{
    const { stats, p } = bal("vuot_rong")
    reg({
        id: "vuot_rong", name: {
            vi: "Vuốt Rồng", en: "Dragon's Claw"
        }, stats,
        passive: {
            vi: "Tái Sinh", en: "Regrowth",
            descVi: `Cuối lượt của bạn: người đeo hồi {${nv(p.b)}% máu tối đa}.`,
            descEn: `End of your turn: the wearer heals {${ne(p.b)}% max HP}.`,
        },
        hooks: {
            onTurnEnd(g, me, d) {
                if (d.side === me.side) g.heal(me,
                    me,
                    p.b / 100 * me.maxHp)
            },
        },
    })
}

{
    const { stats, p } = bal("khien_hu_vo")
    reg({
        id: "khien_hu_vo", name: {
            vi: "Giáp Vai Nguyệt Thần", en: "Abyssal Mask"
        }, stats,
        passive: {
            vi: "Lỗ Hổng", en: "Exposed",
            descVi: `Tướng địch đối diện nhận thêm ${nv(p.c)}% sát thương từ các đồng minh khác của người đeo.`,
            descEn: `The enemy opposite takes ${ne(p.c)}% more damage from the wearer's other allies.`,
        },
        modifyDamage(g, me, d) {
            if (!d.src || d.src.side !== me.side || d.src.id === me.id || d.target.side === me.side) return 1
            return g.opposite(me)?.id === d.target.id ? 1 + p.c / 100 : 1
        },
    })
}

{
    const { stats, p } = bal("mu_thich_nghi")
    reg({
        id: "mu_thich_nghi", name: {
            vi: "Mũ Thích Nghi", en: "Adaptive Helm"
        }, stats,
        passive: {
            vi: "Thích Nghi", en: "Adapt",
            descVi: `Khi chịu chiêu của địch: đội hồi ${nv(p.b)} mana; ${nv(p.c)}% nhận 1 lá Quick miễn phí của người đeo (lá chiêu tạm, không tốn mana, tồn tại tới hết lượt đối phương).`,
            descEn: `When hit by an enemy skill: your team restores ${ne(p.b)} mana; ${ne(p.c)}% to get a free Quick card of the wearer (temporary skill card, costs no mana, lasts until end of the opponent's turn).`,
        },
        hooks: {
            onTargeted(g, me, d) {
                if (d.src.side === me.side || !d.affected.includes(me.id)) return
                g.gainMana(me,
                    p.b,
                    "restore")
                if (!g.roll(p.c / 100)) return
                const quick = (["Q",
                    "E",
                    "R"] as SkillKey[]).filter((k) => g.hero(me).skills[k]?.quick)
                if (quick.length) freeCard(g,
                    me,
                    [quick[g.randInt(quick.length)]])
            },
        },
    })
}

// ---------------- Hàng Đai Khổng Lồ / Nước Mắt ----------------
{
    const { stats, p } = bal("giap_warmog")
    reg({
        id: "giap_warmog", name: {
            vi: "Giáp Máu Warmog", en: "Warmog's Armor"
        }, stats,
        passive: {
            vi: "Dưỡng Sức", en: "Recover",
            descVi: `Đầu lượt của bạn, nếu người đeo không mất máu trong lượt địch vừa kết thúc (mất Khiên không tính): hồi {${nv(p.b)}% máu tối đa}.`,
            descEn: `Start of your turn, if the wearer lost no HP during the enemy turn that just ended (losing Shield doesn't count): heal {${ne(p.b)}% max HP}.`,
        },
        hooks: {
            onDamage(g, me, d) {
                if (d.target.id === me.id && d.hpLost > 0 && g.s.active !== me.side) me.stacks[T("warmog",
                    "lost")] = g.s.turnNo
            },
            onTurnStart(g, me, d) {
                if (d.side !== me.side || me.stacks[T("warmog",
                    "lost")] === g.s.turnNo - 1) return
                g.heal(me,
                    me,
                    p.b / 100 * me.maxHp)
            },
        },
    })
}

{
    const { stats, p } = bal("day_chuyen_chuoc_toi")
    const give = (g: Game, me: Unit, d: { src?: Unit; target: Unit; amount: number }) => {
        if (d.src?.id !== me.id || d.target.side !== me.side || d.amount <= 0 || me.status !== "board") return
        if (g.cur.src !== me.id || !g.cur.card || g.cur.card.startsWith("item:")) return // chỉ hồi máu/Khiên từ lá của chính người đeo, không tính proc của đồ
        const uid = curUid(g)
        if (uid > 0 && me.stacks[T("redeem",
            "uid")] === uid) return // 1 lần mỗi lá
        me.stacks[T("redeem",
            "uid")] = uid
        g.gainMana(me,
            p.b,
            "restore")
        rollFree(g,
            me,
            p.c)
    }
    reg({
        id: "day_chuyen_chuoc_toi", name: {
            vi: "Dây Chuyền Chuộc Tội", en: "Redemption"
        }, stats,
        passive: {
            vi: "Ban Phước", en: "Blessing",
            descVi: `Khi chiêu của người đeo hồi máu hoặc tạo Khiên cho đồng minh: đội hồi ${nv(p.b)} mana (1 lần mỗi lá); ${nv(p.c)}% nhận 1 lá Q hoặc E miễn phí (lá chiêu tạm, không tốn mana, tồn tại tới hết lượt đối phương).`,
            descEn: `When the wearer's skill heals or shields an ally: your team restores ${ne(p.b)} mana (once per card); ${ne(p.c)}% to get a free Q or E card (temporary skill card, costs no mana, lasts until end of the opponent's turn).`,
        },
        hooks: {
            onHeal: give,
            onShield: give,
        },
    })
}

{
    const { stats, p } = bal("bua_lam")
    reg({
        id: "bua_lam", name: {
            vi: "Bùa Xanh", en: "Blue Buff"
        }, stats: {
        },
        manaRegen: (stats as Record<string, number>).manaRegen,
        passive: {
            vi: "Suối Lam", en: "Mana Spring",
            descVi: `Đầu lượt của bạn: ${nv(p.b)}% nhận 1 lá Q hoặc E miễn phí của người đeo, ${nv(p.c)}% nhận 1 lá R miễn phí (lá chiêu tạm, không tốn mana, tồn tại tới hết lượt đối phương).`,
            descEn: `Start of your turn: ${ne(p.b)}% to get a free Q or E card of the wearer, ${ne(p.c)}% to get a free R card (temporary skill card, costs no mana, lasts until end of the opponent's turn).`,
        },
        hooks: {
            onTurnStart(g, me, d) {
                if (d.side === me.side) rollFree(g,
                    me,
                    p.b,
                    p.c)
            },
        },
    })
}

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
  counter?: { name: string; max?: number };
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
