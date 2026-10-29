// 55 đồ huyền thoại = bảng 10×10 (đủ mọi cặp 2 mảnh). Mỗi món = chỉ số các mảnh + 1..N nội tại thường + 1..N nội tại điều kiện.
// Khung máu mới (720–960): khiên/hồi/hồi sinh tính theo % máu hoặc AP thay vì số phẳng; ngưỡng máu cũ (1000/1100) đã hạ.
// Công thức trong ngoặc nhọn {…} dùng chỉ số của người đeo; phần theo mục tiêu viết bằng chữ.
import {
    apOf, atkOf, bonusHpOf, hpPct, magic, physical, stackOf
} from "../helpers"
import {
    neighboursOf
} from "../heroes/kit"
import type {
    Effect, StateLike, Target, UnitLike
} from "../types"
import {
    A, C, D, G, GI, K, N, P, S, T
} from "./components"
import {
    all, allyLaneHpBelow, alliesNearAtLeast, any, castThisTurn, flagOn, isAttack, isSkill, laneEnemiesAtLeast, not, selfAlone, selfHas,
    selfHasShield, selfHpBelow, selfRow, sourceRole, stacksAtLeast, targetControlled, targetHas, targetHasShield, targetHpAbove,
    targetHpBelow, targetIsCarry, targetMaxHpAbove, targetMaxHpHigher, targetOtherLane, targetRole, targetRow,
} from "./conditions"
import {
    alliesInLane, bonus, burn, dmg, enemiesInLane, frontOfLanes, heal, mainDamage, setFlag, shield, stack, status,
} from "./fx"
import {
    CRIT_PER_ITEM, defineItem, recipeStats
} from "./registry"
import type {
    ICondition, PropCtx, PropInput
} from "./types"

function combo(id: string, name: string, emoji: string, a: string, b: string, lolIds: number[], passives: PropInput[], conditionals: (PropInput & { condition: ICondition })[]) {
    defineItem({
        id, name, tier: "legendary", emoji, recipe: [a,
            b], stats: recipeStats([a,
            b]), lolIds, passives, conditionals
    })
}
const damagedEnemies = (effects: Effect[] | undefined, state: StateLike | undefined, owner: string) =>
    (effects ?? []).flatMap((f) => {
        if (f.type !== "damage" || f.target.kind !== "unit") return []
        const u = state?.units.get(f.target.id)
        return u && u.owner !== owner ? [u] : []
    }).filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i)
/** Điều kiện viết tại chỗ (không thêm vào conditions.ts chung) */
const mk = (kind: string, desc: string, test: (c: PropCtx) => boolean): ICondition => ({
    kind, desc, test
})
const attackedThisTurn = mk("attackedThisTurn",
    "đã đánh thường lượt này",
    (c) => !!c.self.attacked)
/** Lai: AD và AP đều từ 60 (prop dùng điều kiện này không được có `stats`, tránh vòng lặp statsOf) */
const selfHybrid = mk("selfHybrid",
    "AD và AP đều từ 60",
    (c) => atkOf(c.self) >= 60 && apOf(c.self) >= 60)
/** Mỗi lượt 1 lần: cờ "t:" tự xoá khi chủ tướng kết thúc lượt */
const oncePerTurn = (c: PropCtx, key: string, fx: () => Effect[]): Effect[] => (stackOf(c.self,
    key) ? [] : [...fx(),
        setFlag(c.self,
            key)])
/** Làm mới khiên lên tới `cap` (khiên không tự mất nên không cộng dồn mãi) */
const shieldUpTo = (u: UnitLike, cap: number): Effect[] => (u.shield < cap ? [shield(u,
    cap - u.shield)] : [])
const weakest = (list: UnitLike[]) => [...list].sort((a, b) => hpPct(a) - hpPct(b))[0]
/** Đồng minh đứng kề (8 hướng) */
const nearAllies = (c: PropCtx) => (c.state ? neighboursOf(c.state,
    c.self) : [])
/** Hiệu ứng chiêu có khống chế/dời chỗ tướng địch không */
const ccEnemy = (c: PropCtx) => (c.effects ?? []).some((f) => {
    const id = f.type === "status" && ["stun",
        "freeze",
        "chill"].includes(f.status) ? f.unitId
        : f.type === "pull" || f.type === "displace" ? f.unitId : undefined
    return !!id && c.state?.units.get(id)?.owner !== c.self.owner
})

// ================= KIẾM DÀI =================
combo("kiem_tu_than",
    "Kiếm Tử Thần",
    "🗡️",
    K,
    K,
    [6333,
        3071],
    [
        {
            name: "Sắc Bén", desc: "+5% ATK.", stats: {
                atkMult: 0.05
            }
        },
        {
            name: "Thu Hoạch", desc: "Hạ gục: +5 ATK vĩnh viễn (tối đa +20).", onKill: (c) => [bonus(c.self,
                "atk",
                5,
                20)]
        },
    ],
    [
        {
            name: "Kết Liễu", desc: "+15% sát thương.", condition: targetHpBelow(0.5), damageMult: () => 1.15
        },
    ])

combo("sung_hextech",
    "Súng Hextech",
    "🔫",
    K,
    G,
    [3146,
        3152,
        4645],
    [
        {
            name: "Hút Hồn", desc: "Hút máu mọi nguồn 10%.", stats: {
                omnivamp: 0.1
            }
        },
    ],
    [
        {
            name: "Cơn Khát", desc: "Hút máu mọi nguồn thêm 10%.", condition: selfHpBelow(0.4), stats: {
                omnivamp: 0.1
            }
        },
        {
            name: "Đạn Hextech", desc: "Đòn đánh bắn thêm {15 + 20% AP} sát thương phép.", condition: all(isAttack,
                castThisTurn),
            onAttack: (c) => (c.target ? [dmg(c.target,
                magic(15 + 0.2 * apOf(c.self),
                    c.target,
                    c.self),
                "Đạn Hextech")] : [])
        },
    ])

combo("loi_nhac_tu_vong",
    "Lời Nhắc Tử Vong",
    "☠️",
    K,
    C,
    [3033],
    [
        {
            name: "Vết Thương Sâu", desc: "+10 sát lực. Đòn đánh gây Vết Thương Sâu 2 lượt (hồi máu −50%).", stats: {
                lethality: 10
            },
            onAttack: (c) => (c.target ? [status(c.target,
                "wounds",
                2)] : [])
        },
    ],
    [
        {
            name: "Diệt Cự", desc: "+15% sát thương.", condition: targetMaxHpHigher, damageMult: () => 1.15
        },
    ])

combo("vo_cuc_kiem",
    "Vô Cực Kiếm",
    "💎",
    K,
    T,
    [3031],
    [
        {
            name: "Vô Cực", desc: "Chí mạng gây ×2 thay vì ×1.5.", stats: {
                critDmg: 0.5
            }
        },
    ],
    [
        {
            name: "Đoạt Mệnh", desc: "+35% chí mạng.", condition: targetHpBelow(0.3), critChance: 0.35
        },
        {
            name: "Thế Thượng Phong", desc: "+15% sát thương chí mạng.", condition: targetHpAbove(0.7), stats: {
                critDmg: 0.15
            }
        },
    ])

combo("ao_choang_bong_toi",
    "Áo Choàng Bóng Tối",
    "🌑",
    K,
    GI,
    [3814],
    [
        {
            name: "Lưỡi Đêm", desc: "+8 sát lực.", stats: {
                lethality: 8
            }
        },
    ],
    [
        {
            name: "Rình Rập", desc: "+18% sát thương.", condition: targetRow("back"), damageMult: () => 1.18
        },
        {
            name: "Màn Đêm", desc: "Hóa ẩn đến lượt sau + khiên {15% máu tối đa} (1 lần).", condition: selfHpBelow(0.5), once: true,
            onDamaged: (c) => [{
                type: "hide", unitId: c.self.id
            },
            shield(c.self,
                c.self.maxHp * 0.15)]
        },
    ])

combo("huyet_kiem",
    "Huyết Kiếm",
    "🩸",
    K,
    A,
    [3072],
    [
        {
            name: "Khát Máu", desc: "Hút máu đòn đánh 20%, +10% ATK.", stats: {
                lifesteal: 0.2, atkMult: 0.1
            }
        },
    ],
    [
        {
            name: "Lá Chắn Máu", desc: "Khiên {20% máu tối đa} (1 lần).", condition: selfHpBelow(0.4), once: true,
            onDamaged: (c) => [shield(c.self,
                c.self.maxHp * 0.2)]
        },
    ])

combo("sterak",
    "Móng Vuốt Sterak",
    "🪓",
    K,
    D,
    [3053],
    [
        {
            name: "Thép Nguội", desc: "+10 giáp.", stats: {
                armor: 10
            }
        },
    ],
    [
        {
            name: "Tiền Phong", desc: "+15% ATK.", condition: selfRow("front"), stats: {
                atkMult: 0.15
            }
        },
        {
            name: "Thịnh Nộ", desc: "+20% ATK vĩnh viễn và khiên {20% máu tối đa} (1 lần).", condition: selfHpBelow(0.5), once: true,
            onDamaged: (c) => [shield(c.self,
                c.self.maxHp * 0.2),
            bonus(c.self,
                "atkMult",
                20)]
        },
    ])

combo("giao_shojin",
    "Ngọn Giáo Shojin",
    "🔱",
    K,
    N,
    [3161],
    [
        {
            name: "Tinh Thông", desc: "Chiêu +10%.", stats: {
                spellAmp: 0.1
            }
        },
        {
            name: "Nhịp Giáo", desc: "Đòn đánh đầu tiên mỗi lượt: mọi chiêu giảm 1 lượt hồi.",
            onAttack: (c) => oncePerTurn(c,
                "t:shojin",
                () => [{
                    type: "cooldown", unitId: c.self.id, delta: -1
                }])
        },
    ],
    [
        {
            name: "Đâm Xuyên", desc: "Chiêu +15%.", condition: all(isSkill,
                attackedThisTurn), damageMult: () => 1.15
        },
    ])

// ================= GẬY QUÁ KHỔ =================
combo("mu_rabadon",
    "Mũ Phù Thủy Rabadon",
    "🎩",
    G,
    G,
    [3089],
    [
        {
            name: "Ma Lực Tối Thượng", desc: "Chiêu +25%.", stats: {
                spellAmp: 0.25
            }
        },
    ],
    [
        {
            name: "Thừa Thắng", desc: "Chiêu +15%.", condition: all(isSkill,
                targetControlled), damageMult: () => 1.15
        },
    ])

combo("cuong_dao",
    "Cuồng Đao Guinsoo",
    "⚔️",
    G,
    C,
    [3124],
    [
        {
            name: "Cuồng Nộ", desc: "Mỗi đòn đánh +4% sát thương (cộng dồn 6).",
            onAttack: (c) => [stack(c.self,
                "cuong_dao",
                1,
                6)], damageMult: (c) => 1 + 0.04 * stackOf(c.self,
                "cuong_dao")
        },
    ],
    [
        {
            name: "Lưỡi Xoáy", desc: "Đòn đánh lan sang tướng cùng lane 30%.", condition: all(isAttack,
                stacksAtLeast("cuong_dao",
                    4,
                    "đủ 4 cộng dồn Cuồng Nộ")),
            onAttack: (c) => {
                const other2 = c.state ? enemiesInLane(c.state,
                    c.self).filter((x) => x.id !== c.target?.id) : []
                return other2.slice(0,
                    1).map((x) => dmg(x,
                    mainDamage(c.effects,
                        c.target) * 0.3,
                    "Lưỡi Xoáy"))
            }
        },
    ])

combo("gang_bao_thach",
    "Găng Bảo Thạch",
    "💍",
    G,
    T,
    [4646,
        3100],
    [
        {
            name: "Bảo Thạch", desc: "Chiêu chí mạng được, +25% sát thương chí mạng.", skillCrit: true, stats: {
                critDmg: 0.25
            }
        },
    ],
    [
        {
            name: "Săn Mồi", desc: "+10% sát thương.", condition: targetHpBelow(0.5), damageMult: () => 1.1
        },
    ])

combo("vuong_mien",
    "Vương Miện Bảo Hộ",
    "👑",
    G,
    GI,
    [3157],
    [
        {
            name: "Hộ Giá", desc: "Khi đeo: khiên {20% máu tối đa}.", onEquip: (c) => [shield(c.self,
                c.self.maxHp * 0.2)]
        },
        {
            name: "Vỡ Ngai", desc: "Khiên vỡ: bật Phẫn Uất đến hết lượt.", onShieldBreak: (c) => [setFlag(c.self,
                "t:vuong_mien")]
        },
        {
            name: "Ban Ơn", desc: "Tung chiêu: khiên {20 + 25% AP} cho đồng minh đứng kề ít máu nhất (1 lần mỗi lượt).",
            onCast: (c) => { const w = weakest(nearAllies(c)); return w ? oncePerTurn(c,
                "t:vm_ally",
                () => [shield(w,
                    20 + 0.25 * apOf(c.self))]) : [] }
        },
    ],
    [
        {
            name: "Phẫn Uất", desc: "Chiêu +25%.", condition: flagOn("t:vuong_mien",
                "khiên vừa vỡ"), stats: {
                spellAmp: 0.25
            }
        },
    ])

combo("quy_thu",
    "Quỷ Thư Morello",
    "📕",
    G,
    A,
    [3165],
    [
        {
            name: "Nguyền Rủa", desc: "+10 xuyên phép, chiêu +10% và gây Vết Thương Sâu 2 lượt.", stats: {
                spellAmp: 0.1, magicPen: 10
            },
            onSkill: (c) => damagedEnemies(c.effects,
                c.state,
                c.self.owner).map((u) => status(u,
                "wounds",
                2))
        },
    ],
    [
        {
            name: "Phá Hộ", desc: "+30% sát thương.", condition: targetHasShield, damageMult: () => 1.3
        },
    ])

combo("mat_na_liandry",
    "Mặt Nạ Liandry",
    "🎭",
    G,
    D,
    [6653],
    [
        {
            name: "Hỏa Ngục", desc: "Chiêu +5%, đốt 1.2% máu tối đa của mục tiêu mỗi lượt, 2 lượt.", stats: {
                spellAmp: 0.05
            },
            onSkill: (c) => damagedEnemies(c.effects,
                c.state,
                c.self.owner).map((u) => burn(u,
                u.maxHp * 0.012))
        },
    ],
    [
        {
            name: "Thiêu Giáp", desc: "Đốt mạnh hơn: 2.5% máu tối đa.", condition: all(isSkill,
                targetRole("tank",
                    "fighter")),
            onSkill: (c) => (c.target ? [burn(c.target,
                c.target.maxHp * 0.025)] : [])
        },
    ])

combo("truong_truong_sinh",
    "Trượng Trường Sinh",
    "🦯",
    G,
    N,
    [3003,
        3040],
    [
        {
            name: "Tích Tụ", desc: "Chiêu +10%. Đầu mỗi lượt: chiêu +5% vĩnh viễn (tối đa 30%).", stats: {
                spellAmp: 0.1
            }, onTurnStart: (c) => [bonus(c.self,
                "spellAmp",
                5,
                30)]
        },
    ],
    [
        {
            name: "Đại Pháp Sư", desc: "+5 hồi mana mỗi vòng.", condition: stacksAtLeast("bonus:spellAmp",
                20,
                "đã tích tụ 4 lượt"), stats: {
                manaRegen: 5
            }
        },
    ])

// ================= CUNG GỖ =================
combo("dai_bac",
    "Đại Bác Liên Thanh",
    "💥",
    C,
    C,
    [3094],
    [
        {
            name: "Tầm Xa", desc: "Đánh thường tới tướng đứng đầu ở 2 lane kề.",
            extraTargets: (c) => (c.state ? frontOfLanes(c.state,
                c.self,
                [c.self.lane - 1,
                    c.self.lane + 1]).map((u): Target => ({
                kind: "unit", id: u.id
            })) : [])
        },
        {
            name: "Đạn Nổ", desc: "Đòn đánh nổ lan 25% sang tướng đứng đầu 2 lane cạnh mục tiêu.",
            onAttack: (c) => (c.state && c.target ? frontOfLanes(c.state,
                c.self,
                [c.target.lane - 1,
                    c.target.lane + 1])
                .map((u) => dmg(u,
                    mainDamage(c.effects,
                        c.target) * 0.25,
                    "Đạn Nổ")) : [])
        },
    ],
    [
        {
            name: "Bắn Tỉa", desc: "+15% sát thương.", condition: targetOtherLane, damageMult: () => 1.15
        },
    ])

combo("diet_khong_lo",
    "Diệt Khổng Lồ",
    "🏹",
    C,
    T,
    [3036],
    [
        {
            name: "Xuyên Giáp", desc: "+10 sát lực, +5% sát thương.", stats: {
                lethality: 10, dmgAmp: 0.05
            }
        },
    ],
    [
        {
            name: "Hạ Gục Khổng Lồ", desc: "+25% sát thương.", condition: any(targetRole("tank"),
                targetMaxHpAbove(1050)), damageMult: () => 1.25
        },
    ])

combo("y_chi_titan",
    "Ý Chí Titan",
    "🗿",
    C,
    GI,
    [3748],
    [
        {
            name: "Kiên Định", desc: "Mỗi lần đánh hoặc bị đánh: +2% sát thương (cộng dồn 12).",
            onAttack: (c) => [stack(c.self,
                "titan",
                1,
                12)], onDamaged: (c) => [stack(c.self,
                "titan",
                1,
                12)],
            damageMult: (c) => 1 + 0.02 * stackOf(c.self,
                "titan")
        },
    ],
    [
        {
            name: "Thân Titan", desc: "+20 giáp và giáp phép.", condition: stacksAtLeast("titan",
                12,
                "đủ 12 cộng dồn"), stats: {
                armor: 20, mr: 20
            }
        },
    ])

combo("cung_runaan",
    "Cuồng Cung Runaan",
    "🎯",
    C,
    A,
    [3085],
    [
        {
            name: "Mũi Tên Nảy", desc: "Đòn đánh nảy sang tướng khác cùng lane 35%.",
            onAttack: (c) => {
                if (!c.state || !c.target) return []
                const next = enemiesInLane(c.state,
                    c.self).find((x) => x.id !== c.target!.id)
                return next ? [dmg(next,
                    mainDamage(c.effects,
                        c.target) * 0.35,
                    "Mũi Tên Nảy")] : []
            }
        },
    ],
    [
        {
            name: "Săn Đôi", desc: "Mũi tên nảy thêm 25%.", condition: all(isAttack,
                targetIsCarry),
            onAttack: (c) => {
                if (!c.state || !c.target) return []
                const next = enemiesInLane(c.state,
                    c.self).find((x) => x.id !== c.target!.id)
                return next ? [dmg(next,
                    mainDamage(c.effects,
                        c.target) * 0.25,
                    "Săn Đôi")] : []
            }
        },
    ])

combo("nanh_nashor",
    "Nanh Nashor",
    "🐍",
    C,
    D,
    [3115],
    [
        {
            name: "Nanh Độc", desc: "Tung chiêu: bật Phép Đánh đến hết lượt.", onCast: (c) => [setFlag(c.self,
                "t:nashor")]
        },
    ],
    [
        {
            name: "Phép Đánh", desc: "Đòn đánh gây thêm {15 + 25% AP} sát thương phép.", condition: all(isAttack,
                flagOn("t:nashor",
                    "vừa tung chiêu")),
            onAttack: (c) => (c.target ? [dmg(c.target,
                magic(15 + 0.25 * apOf(c.self),
                    c.target,
                    c.self),
                "Phép Đánh")] : [])
        },
        {
            name: "Xạ Kích", desc: "+15% Tốc đánh.", condition: selfRow("back"), stats: {
                extraAtk: 0.15
            }
        },
    ])

combo("dao_dien",
    "Dao Điện Statikk",
    "⚡",
    C,
    N,
    [3087],
    [
        {
            name: "Tích Điện", desc: "Mỗi đòn đánh phóng điện {10 + 10% AP} sát thương phép lên tướng đứng đầu 3 lane quanh mình.",
            onAttack: (c) => (c.state ? frontOfLanes(c.state,
                c.self,
                [c.self.lane - 1,
                    c.self.lane,
                    c.self.lane + 1])
                .map((u) => dmg(u,
                    magic(10 + 0.1 * apOf(c.self),
                        u,
                        c.self),
                    "Phóng Điện")) : [])
        },
    ],
    [
        {
            name: "Quá Tải", desc: "Đòn đánh phóng thêm {30 + 20% AP} sát thương phép vào mục tiêu.", condition: all(isAttack,
                targetHas("stun",
                    "chill",
                    "freeze")),
            onAttack: (c) => (c.target ? [dmg(c.target,
                magic(30 + 0.2 * apOf(c.self),
                    c.target,
                    c.self),
                "Quá Tải")] : [])
        },
    ])

// ================= GĂNG TAY =================
combo("gang_dao_tac",
    "Găng Đạo Tặc",
    "🧤",
    T,
    T,
    [3508,
        1055],
    [
        {
            name: "Móc Túi", desc: "Đầu mỗi lượt +1 vàng. +10% sát thương.", stats: {
                dmgAmp: 0.1
            }, onTurnStart: (c) => [{
                type: "gold", side: c.self.owner, amount: 1
            }]
        },
    ],
    [
        {
            name: "Tiền Thưởng", desc: "Hạ gục: +3 vàng.", condition: targetIsCarry, onKill: (c) => [{
                type: "gold", side: c.self.owner, amount: 3
            }]
        },
    ])

combo("giap_thien_than",
    "Giáp Thiên Thần",
    "👼",
    T,
    GI,
    [3026],
    [
        {
            name: "Hồi Sinh", desc: "Lần đầu chết: hồi sinh với {30% máu tối đa} và Bất Tử 1 lượt.", once: true,
            preventDeath: (c) => [heal(c.self,
                c.self.maxHp * 0.3),
            status(c.self,
                "invuln",
                1)]
        },
    ],
    [
        {
            name: "Thiên Hộ", desc: "Nhận ít hơn 15% sát thương.", condition: selfHpBelow(0.3), damageTakenMult: () => 0.85
        },
    ])

combo("khan_giai_thuat",
    "Khăn Giải Thuật",
    "🧣",
    T,
    A,
    [3140,
        3139],
    [
        {
            name: "Thanh Tẩy", desc: "Khi đeo: miễn khống chế 2 lượt. +20 giáp phép.", stats: {
                mr: 20
            }, onEquip: (c) => [status(c.self,
                "unstoppable",
                2)]
        },
    ],
    [
        {
            name: "Phản Kháng", desc: "Bị khống chế mà trúng đòn: tự giải và +20% ATK vĩnh viễn (1 lần).",
            condition: selfHas("stun",
                "freeze"), once: true, onDamaged: (c) => [{
                type: "cleanse", unitId: c.self.id
            },
            bonus(c.self,
                "atkMult",
                20)]
        },
    ])

combo("tim_bang",
    "Tim Băng",
    "🧊",
    T,
    D,
    [3110],
    [
        {
            name: "Băng Giá", desc: "Kẻ đánh trúng mình bị Buốt 2 lượt. +15 giáp.", stats: {
                armor: 15
            },
            onDamaged: (c) => (c.isAttack && c.source ? [status(c.source,
                "chill",
                2)] : [])
        },
    ],
    [
        {
            name: "Thành Trì", desc: "Nhận ít hơn 10% sát thương.", condition: selfRow("front"), damageTakenMult: () => 0.9
        },
    ])

combo("ban_tay_cong_ly",
    "Bàn Tay Công Lý",
    "⚖️",
    T,
    N,
    [3153],
    [
        {
            name: "Công Lý", desc: "+12% sát thương, hút máu 10%.", stats: {
                dmgAmp: 0.12, lifesteal: 0.1
            }
        },
    ],
    [
        {
            name: "Phán Quyết", desc: "+15% sát thương.", condition: targetHpAbove(0.7), damageMult: () => 1.15
        },
    ])

// ================= GIÁP LƯỚI =================
combo("ao_choang_gai",
    "Áo Choàng Gai",
    "🌵",
    GI,
    GI,
    [3075],
    [
        {
            name: "Gai Nhọn", desc: "Phản 40% sát thương đòn đánh. +15 giáp.", stats: {
                armor: 15
            },
            onDamaged: (c) => (c.isAttack && c.source ? [dmg(c.source,
                (c.amount ?? 0) * 0.4,
                "Gai Nhọn")] : [])
        },
    ],
    [
        {
            name: "Trừng Phạt", desc: "Phản thêm 30% và làm choáng 1 lượt (1 lần mỗi vòng).", condition: all(isAttack,
                sourceRole("assassin")),
            onDamaged: (c) => (c.source ? oncePerTurn(c,
                "t:gai",
                () => [dmg(c.source!,
                    (c.amount ?? 0) * 0.3,
                    "Trừng Phạt"),
                status(c.source!,
                    "stun",
                    1)]) : [])
        },
    ])

combo("giap_gargoyle",
    "Giáp Gargoyle",
    "🛡️",
    GI,
    A,
    [6665,
        3193],
    [
        {
            name: "Đá Hóa", desc: "+20 giáp và giáp phép.", stats: {
                armor: 20, mr: 20
            }
        },
    ],
    [
        {
            name: "Thạch Hóa", desc: "Nhận ít hơn 30% sát thương.", condition: selfHpBelow(0.3), damageTakenMult: () => 0.7
        },
        {
            name: "Vây Hãm", desc: "Nhận ít hơn 10% sát thương.", condition: laneEnemiesAtLeast(2), damageTakenMult: () => 0.9
        },
    ])

combo("ao_choang_lua",
    "Áo Choàng Lửa",
    "🔥",
    GI,
    D,
    [3068,
        6664],
    [
        {
            name: "Hỏa Lan", desc: "Đầu mỗi lượt: gây {10 + 6% máu cộng thêm} sát thương phép cho tướng địch cùng lane.",
            onTurnStart: (c) => (c.state ? enemiesInLane(c.state,
                c.self).map((u) => dmg(u,
                magic(10 + 0.06 * bonusHpOf(c.self),
                    u,
                    c.self),
                "Hỏa Lan")) : [])
        },
    ],
    [
        {
            name: "Thiêu Rụi", desc: "Kèm Vết Thương Sâu.", condition: laneEnemiesAtLeast(1),
            onTurnStart: (c) => (c.state ? enemiesInLane(c.state,
                c.self).map((u) => status(u,
                "wounds",
                2)) : [])
        },
    ])

combo("loi_the_ho_ve",
    "Lời Thề Hộ Vệ",
    "🛡",
    GI,
    N,
    [3109],
    [
        {
            name: "Hộ Vệ", desc: "Đầu mỗi lượt: mọi đồng minh đứng kề được làm mới khiên lên tới {20 + 3% máu tối đa} (không cộng dồn).",
            onTurnStart: (c) => nearAllies(c).flatMap((u) => shieldUpTo(u,
                20 + 0.03 * c.self.maxHp))
        },
    ],
    [
        {
            name: "Thề Bảo Vệ", desc: "Đầu lượt: khiên {12% máu tối đa} cho đồng minh yếu nhất cùng lane (1 lần).", condition: allyLaneHpBelow(0.3), once: true,
            onTurnStart: (c) => {
                const w = c.state ? weakest(alliesInLane(c.state,
                    c.self,
                    false)) : undefined
                return w ? [shield(w,
                    c.self.maxHp * 0.12)] : []
            }
        },
    ])

// ================= ÁO CHOÀNG =================
combo("vuot_rong",
    "Vuốt Rồng",
    "🐉",
    A,
    A,
    [3065],
    [
        {
            name: "Hồi Phục", desc: "Đầu mỗi lượt hồi {5% máu tối đa}.", onTurnStart: (c) => [heal(c.self,
                c.self.maxHp * 0.05)]
        },
        {
            name: "Vảy Cứng", desc: "+15 giáp phép.", stats: {
                mr: 15
            }
        },
    ],
    [
        {
            name: "Vảy Rồng", desc: "Trúng chiêu: +10 giáp phép vĩnh viễn (tối đa +30).", condition: isSkill,
            onDamaged: (c) => [bonus(c.self,
                "mr",
                10,
                30)]
        },
    ])

combo("khien_hu_vo",
    "Khiên Hư Vô",
    "🌀",
    A,
    D,
    [8020,
        3001],
    [
        {
            name: "Hư Vô", desc: "+15 giáp phép.", stats: {
                mr: 15
            }
        },
        {
            name: "Vực Thẳm", desc: "Đầu mỗi lượt: tướng địch cùng lane bị Rã giáp 1 lượt.",
            onTurnStart: (c) => (c.state ? enemiesInLane(c.state,
                c.self).map((u) => status(u,
                "shred",
                1)) : [])
        },
    ],
    [
        {
            name: "Che Chở", desc: "Nhận ít hơn 5% sát thương.", condition: alliesNearAtLeast(1), damageTakenMult: () => 0.95
        },
    ])

combo("mu_thich_nghi",
    "Mũ Thích Nghi",
    "🪖",
    A,
    N,
    [3102],
    [
        {
            name: "Nguồn Năng", desc: "Tung chiêu: hoàn 15 mana tướng (1 lần mỗi lượt). +15 giáp và giáp phép.", stats: {
                armor: 15, mr: 15
            },
            onCast: (c) => oncePerTurn(c,
                "t:mtn",
                () => [{
                    type: "heroMana", unitId: c.self.id, amount: 15
                }])
        },
    ],
    [
        {
            name: "Thích Nghi Tiền", desc: "+20 giáp.", condition: selfRow("front"), stats: {
                armor: 20
            }
        },
        {
            name: "Thích Nghi Hậu", desc: "Chiêu +15%.", condition: selfRow("back"), stats: {
                spellAmp: 0.15
            }
        },
    ])

// ================= ĐAI KHỔNG LỒ =================
combo("giap_warmog",
    "Giáp Máu Warmog",
    "💚",
    D,
    D,
    [3083],
    [
        {
            name: "Sức Sống", desc: "Khi đeo: +{8% máu tối đa} máu tối đa.", onEquip: (c) => [{
                type: "maxhp", unitId: c.self.id, amount: Math.round(c.self.maxHp * 0.08)
            }]
        },
    ],
    [
        {
            name: "Tái Sinh", desc: "Đầu lượt hồi {5% máu tối đa}.", condition: selfHpBelow(0.5), onTurnStart: (c) => [heal(c.self,
                c.self.maxHp * 0.05)]
        },
    ])

combo("day_chuyen_chuoc_toi",
    "Dây Chuyền Chuộc Tội",
    "📿",
    D,
    N,
    [3107],
    [
        {
            name: "Chuộc Tội", desc: "Đầu mỗi lượt: bản thân, đồng minh cùng lane và đồng minh đứng kề hồi 6% máu đã mất.",
            onTurnStart: (c) => {
                if (!c.state) return []
                const list = [...alliesInLane(c.state,
                    c.self),
                ...nearAllies(c)].filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i)
                return list.map((u) => heal(u,
                    (u.maxHp - u.hp) * 0.06))
            }
        },
    ],
    [
        {
            name: "Cứu Rỗi", desc: "Hồi gấp đôi cho đồng minh cùng lane.", condition: allyLaneHpBelow(0.3),
            onTurnStart: (c) => (c.state ? alliesInLane(c.state,
                c.self).map((u) => heal(u,
                (u.maxHp - u.hp) * 0.1)) : [])
        },
    ])

// ================= NƯỚC MẮT =================
combo("bua_lam",
    "Bùa Lam",
    "🔵",
    N,
    N,
    [3119,
        3802],
    [
        {
            name: "Tinh Khiết", desc: "Chiêu +20%.", stats: {
                spellAmp: 0.2
            }
        },
    ],
    [
        {
            name: "Thu Hoạch Phép", desc: "Hạ gục bằng chiêu: mọi chiêu hồi xong ngay.", condition: isSkill,
            onKill: (c) => [{
                type: "cooldown", unitId: c.self.id, reset: true
            }]
        },
    ])

// ================= PHA LÊ LAM NGỌC (chiêu rẻ hơn) =================
combo("ac_y",
    "Ác Ý",
    "",
    S,
    S,
    [3118],
    [
        {
            name: "Ma Lực Tràn Trề", desc: "Chiêu +10%.", stats: {
                spellAmp: 0.1
            }
        },
    ],
    [
        {
            name: "Bùng Cháy", desc: "+10% sát thương.", condition: castThisTurn, stats: {
                dmgAmp: 0.1
            }
        },
    ])
combo("muramana",
    "Muramana",
    "",
    S,
    K,
    [3042],
    [
        {
            name: "Sốc Phép", desc: "+5% sát thương.", stats: {
                dmgAmp: 0.05
            }
        },
    ],
    [
        {
            name: "Lưỡi Kiếm Ma Lực", desc: "+20% sát thương đòn đánh.", condition: all(isAttack,
                castThisTurn), damageMult: () => 1.2
        },
    ])
combo("ban_dong_hanh_luden",
    "Bạn Đồng Hành Luden",
    "",
    S,
    G,
    [6655],
    [
        {
            name: "Tiếng Vọng", desc: "Chiêu +10%. Chiêu đầu tiên mỗi lượt nổ thêm {25% AP} sát thương phép lên mục tiêu và tướng đứng kề nó.", stats: {
                spellAmp: 0.1
            },
            onSkill: (c) => {
                const t = damagedEnemies(c.effects,
                    c.state,
                    c.self.owner)[0]
                if (!t || !c.state) return []
                const list = [t,
                    ...neighboursOf(c.state,
                        t)]
                return oncePerTurn(c,
                    "t:luden",
                    () => list.map((u) => dmg(u,
                        magic(0.25 * apOf(c.self),
                            u,
                            c.self),
                        "Tiếng Vọng")))
            }
        },
    ],
    [
        {
            name: "Săn Mồi Yếu", desc: "+10% sát thương.", condition: targetIsCarry, damageMult: () => 1.1
        },
    ])
combo("luoi_dao_navori",
    "Lưỡi Dao Navori",
    "",
    S,
    C,
    [6675],
    [
        {
            name: "Tinh Thông", desc: "+33% chí mạng. Chí mạng: mọi chiêu giảm 1 lượt hồi (1 lần mỗi lượt).", stats: {
                crit: CRIT_PER_ITEM
            },
            onCrit: (c) => oncePerTurn(c,
                "t:navori",
                () => [{
                    type: "cooldown", unitId: c.self.id, delta: -1
                }])
        },
    ],
    [
        {
            name: "Liên Hoàn", desc: "+15% Tốc đánh.", condition: castThisTurn, stats: {
                extraAtk: 0.15
            }
        },
    ])
combo("ke_thu_thap",
    "Kẻ Thu Thập",
    "",
    S,
    T,
    [6676],
    [
        {
            name: "Định Mệnh", desc: "+8 sát lực.", stats: {
                lethality: 8
            }
        },
    ],
    [
        {
            name: "Thu Thuế", desc: "+40% sát thương.", condition: targetHpBelow(0.2), damageMult: () => 1.4
        },
    ])
combo("mua_dong_vinh_cuu",
    "Mùa Đông Vĩnh Cửu",
    "",
    S,
    GI,
    [3121],
    [
        {
            name: "Băng Giá", desc: "+10 giáp. Chiêu khống chế hoặc dời chỗ tướng địch (Choáng/Đóng băng/Buốt/kéo/đẩy): bản thân và đồng minh đứng kề được làm mới khiên lên tới {20 + 4% máu tối đa} (1 lần mỗi lượt).",
            stats: {
                armor: 10
            },
            onSkill: (c) => (ccEnemy(c) ? oncePerTurn(c,
                "t:fimbul",
                () => [c.self,
                    ...nearAllies(c)].flatMap((u) => shieldUpTo(u,
                    20 + 0.04 * c.self.maxHp))) : [])
        },
    ],
    [
        {
            name: "Khiên Băng", desc: "+20 giáp.", condition: selfHpBelow(0.5), stats: {
                armor: 20
            }
        },
    ])
combo("khien_kaenic",
    "Khiên Kaenic",
    "",
    S,
    A,
    [2504],
    [
        {
            name: "Lớp Ngoài", desc: "+10 giáp phép. Đầu mỗi lượt: làm mới khiên lên tới {4% máu tối đa}.", stats: {
                mr: 10
            },
            onTurnStart: (c) => shieldUpTo(c.self,
                c.self.maxHp * 0.04)
        },
    ],
    [
        {
            name: "Ma Thuẫn", desc: "+10 giáp phép.", condition: selfHasShield, stats: {
                mr: 10
            }
        },
    ])
combo("truong_truong_ton",
    "Trượng Trường Tồn",
    "",
    S,
    D,
    [6657],
    [
        {
            name: "Trưởng Thành", desc: "+50 máu. Tung chiêu: hồi {2% máu tối đa + 10% AP} (1 lần mỗi lượt).", stats: {
                hp: 50
            },
            onCast: (c) => oncePerTurn(c,
                "t:rod",
                () => [heal(c.self,
                    0.02 * c.self.maxHp + 0.1 * apOf(c.self))])
        },
    ],
    [
        {
            name: "Ma Thuật Hồi Sinh", desc: "Hút máu mọi nguồn 10%.", condition: castThisTurn, stats: {
                omnivamp: 0.1
            }
        },
    ])
combo("duoc_hac_hoa",
    "Đuốc Hắc Hỏa",
    "",
    S,
    N,
    [2503],
    [
        {
            name: "Ngọn Lửa Đen", desc: "Chiêu đốt mục tiêu {10 + 10% AP} mỗi lượt, 2 lượt.",
            onSkill: (c) => damagedEnemies(c.effects,
                c.state,
                c.self.owner).map((u) => burn(u,
                magic(10 + 0.1 * apOf(c.self),
                    u,
                    c.self)))
        },
    ],
    [
        {
            name: "Thiêu Rụi", desc: "+15% sát thương chiêu.", condition: all(isSkill,
                targetHas("burn")), damageMult: () => 1.15
        },
    ])
combo("han_thu_serylda",
    "Hận Thù Serylda",
    "",
    S,
    P,
    [6694],
    [
        {
            name: "Mài Sắc", desc: "+10 sát lực.", stats: {
                lethality: 10
            }
        },
    ],
    [
        {
            name: "Lạnh Giá", desc: "+20% sát thương chiêu.", condition: all(isSkill,
                targetHas("chill",
                    "stun",
                    "freeze",
                    "shred")), damageMult: () => 1.2
        },
    ])

// ================= CUỐC CHIM (% AD) =================
combo("tam_hop_kiem",
    "Tam Hợp Kiếm",
    "",
    P,
    P,
    [3078],
    [
        {
            name: "Tam Hợp", desc: "+10% ATK, +10% Tốc đánh.", stats: {
                atkMult: 0.1, extraAtk: 0.1
            }
        },
    ],
    [
        {
            name: "Kiếm Phép", desc: "+20% sát thương đòn đánh.", condition: all(isAttack,
                castThisTurn), damageMult: () => 1.2
        },
    ])
combo("nguyet_thuc",
    "Nguyệt Thực",
    "",
    P,
    K,
    [6692],
    [
        {
            name: "Bóng Trăng", desc: "+8 sát lực.", stats: {
                lethality: 8
            }
        },
    ],
    [
        {
            name: "Trăng Khuyết", desc: "+10% sát thương.", condition: targetHpAbove(0.7), damageMult: () => 1.1
        },
    ])
combo("kiem_ke_nut",
    "Kiếm Kẽ Nứt",
    "",
    P,
    G,
    [4633],
    [
        {
            name: "Hư Không", desc: "Hút máu mọi nguồn 8%.", stats: {
                omnivamp: 0.08
            }
        },
    ],
    [
        {
            name: "Biến Đổi", desc: "+15% sát thương.", condition: selfHybrid, damageMult: () => 1.15
        },
    ])
combo("vu_dieu_bong_ma",
    "Vũ Điệu Bóng Ma",
    "",
    P,
    C,
    [3046],
    [
        {
            name: "Lướt Gió", desc: "+10% Tốc đánh.", stats: {
                extraAtk: 0.1
            }
        },
    ],
    [
        {
            name: "Vũ Điệu", desc: "+25% Tốc đánh.", condition: laneEnemiesAtLeast(2), stats: {
                extraAtk: 0.25
            }
        },
    ])
combo("sat_thu_kraken",
    "Sát Thủ Kraken",
    "",
    P,
    T,
    [6672],
    [
        {
            name: "Săn Mồi", desc: "+10% Tốc đánh. Đòn đánh gây thêm {10 + 10% AD} sát thương chuẩn.", stats: {
                extraAtk: 0.1
            },
            onAttack: (c) => (c.target ? [dmg(c.target,
                10 + 0.1 * atkOf(c.self),
                "Săn Mồi")] : [])
        },
    ],
    [
        {
            name: "Hạ Thủy Quái", desc: "Sát thương chuẩn gấp đôi.", condition: all(isAttack,
                targetMaxHpAbove(1000)),
            onAttack: (c) => (c.target ? [dmg(c.target,
                10 + 0.1 * atkOf(c.self),
                "Hạ Thủy Quái")] : [])
        },
    ])
combo("bau_troi_ran_vo",
    "Bầu Trời Rạn Vỡ",
    "",
    P,
    GI,
    [6610],
    [
        {
            name: "Ánh Sáng", desc: "+10 giáp. Đòn đánh đầu tiên mỗi lượt hồi 7% máu đã mất.", stats: {
                armor: 10
            },
            onAttack: (c) => oncePerTurn(c,
                "t:sky",
                () => [heal(c.self,
                    (c.self.maxHp - c.self.hp) * 0.07)])
        },
    ],
    [
        {
            name: "Rạn Vỡ", desc: "+40% chí mạng.", condition: all(isAttack,
                not(flagOn("t:sky",
                    "đã đánh lượt này"))), critChance: 0.4
        },
        {
            name: "Lời Chúc Cuối", desc: "Hút máu mọi nguồn 15%.", condition: selfHpBelow(0.4), stats: {
                omnivamp: 0.15
            }
        },
    ])
combo("nanh_malmortius",
    "Nanh Malmortius",
    "",
    P,
    A,
    [3156],
    [
        {
            name: "Răng Ma Thuật", desc: "+10 giáp phép.", stats: {
                mr: 10
            }
        },
    ],
    [
        {
            name: "Cứu Sinh", desc: "+25 giáp phép, hút máu mọi nguồn 10%.", condition: selfHpBelow(0.4), stats: {
                mr: 25, omnivamp: 0.1
            }
        },
    ])
combo("pha_thuyen",
    "Phá Thuyền",
    "",
    P,
    D,
    [3181],
    [
        {
            name: "Thân Tàu", desc: "+100 máu. Đòn đánh gây thêm {5% máu cộng thêm} sát thương vật lý.", stats: {
                hp: 100
            },
            onAttack: (c) => (c.target ? [dmg(c.target,
                physical(0.05 * bonusHpOf(c.self),
                    c.target,
                    c.self),
                "Thân Tàu")] : [])
        },
    ],
    [
        {
            name: "Đơn Độc", desc: "+15% sát thương.", condition: selfAlone, damageMult: () => 1.15
        },
    ])
combo("than_kiem_manamune",
    "Thần Kiếm Manamune",
    "",
    P,
    N,
    [3004],
    [
        {
            name: "Ma Lực Kiếm", desc: "+3 hồi mana/vòng.", stats: {
                manaRegen: 3
            }
        },
    ],
    [
        {
            name: "Thức Tỉnh", desc: "+15% ATK.", condition: castThisTurn, stats: {
                atkMult: 0.15
            }
        },
    ])
