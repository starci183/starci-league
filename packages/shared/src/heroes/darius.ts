// Darius: đấu sĩ Noxus. Xuất Huyết cộng dồn trên mục tiêu, đủ 5 dấu thì Sức Mạnh Noxus; R chém chuẩn theo số dấu, hạ gục thì làm mới.
// Center: bám 1 mục tiêu, lăn cầu tuyết bằng R làm mới · Counter (chỉnh 10/2026): đội hồi máu (từ 3 dấu: Vết Thương Sâu) · Dị: AP chảy máu (Liandry, Đuốc Hắc Hỏa).
import {
    apOf, atkOf, bonusHpOf, mixed, stackOf, status
} from "../helpers"
import * as C from "../items/conditions"
import {
    defineHero
} from "../registry"
import type {
    Effect, UnitLike
} from "../types"
import {
    backRowEnemy, enemiesFront3, enemyIdsInLane, healFx, setStackFx, stackFx, targetOf
} from "./kit"

const BLEED = "darius_bleed"
/** Xuất Huyết: +1 dấu (tối đa 5), đốt {3 + 3% AD + 3% AP} mỗi dấu; đủ 5 dấu thì Darius Cường Hoá */
const bleed = (self: UnitLike, t: UnitLike): Effect[] => {
    const n = Math.min(5,
        stackOf(t,
            BLEED) + 1)
    return [stackFx(t,
        BLEED,
        1,
        5),
    {
        type: "burn", unitId: t.id, amount: Math.round((3 + 0.03 * atkOf(self) + 0.03 * apOf(self)) * n), turns: 2
    },
    ...(n >= 3 ? [status(t,
        "wounds",
        2)] : []),
    ...(n >= 5 ? [status(self,
        "empower",
        2)] : [])]
}
const bleedAtLeast = (n: number) => C.targetStackAtLeast(BLEED,
    n,
    `mục tiêu có từ ${n} dấu Xuất Huyết`)

export default defineHero({
    id: "darius", name: "Darius", role: "fighter", armor: 36, mr: 30, resource: "rage",
    atk: 84, ap: 0, hp: 980,
    desc: "Bàn tay Noxus. Chém đâu chảy máu đó, đủ 5 dấu thì hoá cuồng; Máy Chém hạ gục là được chém tiếp.",
    strength: "Bám một mục tiêu: dấu Xuất Huyết dồn lên, R sát thương chuẩn kết liễu và làm mới khi hạ gục",
    concept: "Cộng dồn trên mục tiêu: bắt được kẻ đứng sau kéo lên rồi chém, càng đứng đánh lâu càng lợi",
    counter: "Đội hồi máu (Soraka, Aatrox, hút máu): từ 3 dấu Xuất Huyết mục tiêu bị Vết Thương Sâu, máu chảy nhanh hơn máu hồi",
    passive: {
        name: "Xuất Huyết", desc: "Đòn đánh, Q và W của Darius cộng 1 dấu Xuất Huyết lên mục tiêu (tối đa 5) và gây Thiêu Đốt 2 vòng: mất {3 + 3% AD + 3% AP} máu mỗi vòng cho mỗi dấu. Từ **3 dấu**, tướng đó bị **Vết Thương Sâu** 2 vòng (hồi máu giảm 50%). Khi mục tiêu đủ **5 dấu**, Darius nhận Cường Hoá 2 vòng: **+25% AD**."
    },
    // Máy Chém hạ gục (trong lượt tung R): mọi chiêu được làm mới và hoàn 20 Nộ
    onKill: ({ unit }) => (stackOf(unit,
        "t:darius_r") ? [{
            type: "cooldown", unitId: unit.id, reset: true
        },
        {
            type: "heroMana", unitId: unit.id, amount: 20
        }] : []),
    props: [
        {
            name: "Xuất Huyết", desc: "Đòn đánh cộng 1 dấu chảy máu.", onAttack: (c) => (c.target ? bleed(c.self,
                c.target) : [])
        },
        {
            name: "Sức Mạnh Noxus", desc: "Khi Cường Hoá: +25% AD.", condition: C.selfHas("empower"), stats: {
                atkMult: 0.25
            }
        },
        {
            name: "Đánh Thọt", desc: "Sau W: đòn đánh thêm sát thương lai và gây Buốt.", condition: C.all(C.isAttack,
                C.flagOn("t:darius_w",
                    "vừa tung W")),
            onAttack: (c) => (c.target ? [...mixed(c.self,
                c.target,
                "Đánh Thọt",
                {
                    physical: 0.25 * atkOf(c.self), magic: 0.25 * apOf(c.self)
                }),
            status(c.target,
                "chill",
                2)] : [])
        },
        {
            name: "Đánh Thọt (dồn dấu)", desc: "Sau W, mục tiêu có từ 3 dấu: cộng thêm 1 dấu.", condition: C.all(C.isAttack,
                C.flagOn("t:darius_w",
                    "vừa tung W"),
                bleedAtLeast(3)),
            onAttack: (c) => (c.target ? [stackFx(c.target,
                BLEED,
                1,
                5)] : [])
        },
    ],
    skills: [
        {
            def: {
                id: "darius_q", key: "Q", name: "Tàn Sát", mana: 20, cooldown: 2, target: "none",
                desc: "Không chọn: **3 ô trước mặt** (tiền tuyến địch ở đường mình và 2 đường kề). Gây {20 + 60% AD + 30% AP + 4% máu cộng thêm} sát thương vật lý cho mọi tướng địch trong vùng và cộng 1 dấu Xuất Huyết lên mỗi tướng trúng chiêu."
            },
            boosts: [{
                condition: bleedAtLeast(3), desc: "gây thêm 25% sát thương lên tướng đó và Darius hồi {4% máu tối đa} máu", mult: 1.25,
                extra: ({ unit }) => [healFx(unit,
                    unit.maxHp * 0.04)]
            }],
            resolve: ({ state, unit }) => enemiesFront3(state,
                unit)
                .flatMap((x) => [...mixed(unit,
                    x,
                    "Tàn Sát",
                    {
                        physical: 20 + 0.6 * atkOf(unit) + 0.04 * bonusHpOf(unit), magic: 0.3 * apOf(unit)
                    }),
                ...bleed(unit,
                    x)]),
        },
        {
            def: {
                id: "darius_w", key: "W", name: "Đánh Thọt", mana: 15, cooldown: 1, target: "none",
                desc: "Bản thân. Lượt này, đòn đánh của Darius gây thêm {25% AD + 25% AP} sát thương vật lý, rồi khiến mục tiêu bị **Buốt 2 vòng**."
            },
            boosts: [{
                condition: bleedAtLeast(3), desc: "đòn đánh còn cộng thêm 1 dấu Xuất Huyết"
            }],
            resolve: ({ unit }) => [setStackFx(unit,
                "t:darius_w",
                1)],
        },
        {
            def: {
                id: "darius_e", key: "E", name: "Bắt Giữ", mana: 25, cooldown: 3, target: "enemyAny",
                desc: "Chọn 1 tướng địch cùng đường, đứng **hậu tuyến** (không có thì hàng giữa). Gây {20 + 30% AD + 30% AP} sát thương vật lý, **kéo tướng đó lên 1 hàng** (đổi chỗ với tướng đứng trước) và gây Buốt 2 vòng."
            },
            targets: ({ state, unit }) => { const b = backRowEnemy(state,
                unit); return b ? [b.id] : [] },
            boosts: [
                {
                    condition: C.targetIsCarry, desc: "tướng đó còn bị cộng 1 dấu Xuất Huyết", extra: ({ unit, target }) => bleed(unit,
                        target)
                },
                {
                    condition: C.targetNearAlly, desc: "tướng đó bị **giật khỏi đội hình**: chịu thêm 20% sát thương", mult: 1.2
                },
            ],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                return t ? [...mixed(unit,
                    t,
                    "Bắt Giữ",
                    {
                        physical: 20 + 0.3 * atkOf(unit), magic: 0.3 * apOf(unit)
                    }),
                {
                    type: "pull", unitId: t.id
                },
                status(t,
                    "chill",
                    2)] : []
            },
        },
        {
            def: {
                id: "darius_r", key: "R", name: "Máy Chém Noxus", mana: 45, cooldown: 3, target: "enemyAny",
                desc: "Chọn 1 tướng địch cùng đường. Gây {30 + 30% AD + 25% AP} sát thương chuẩn cho tướng đó, **+12% cho mỗi dấu Xuất Huyết** trên tướng đó. Nếu hạ gục được tướng nào trong lượt này: mọi chiêu của Darius được **làm mới** và Darius hoàn 20 Nộ."
            },
            targets: ({ state, unit }) => enemyIdsInLane(state,
                unit),
            boosts: [{
                condition: C.targetHpBelow(0.3), desc: "gây thêm 25% sát thương", mult: 1.25
            }],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                // cờ đặt trước sát thương để onKill thấy ngay khi đòn chém hạ gục
                return t ? [setStackFx(unit,
                    "t:darius_r",
                    1),
                ...mixed(unit,
                    t,
                    "Máy Chém Noxus",
                    {
                        true: (30 + 0.3 * atkOf(unit) + 0.25 * apOf(unit)) * (1 + 0.12 * stackOf(t,
                            BLEED))
                    })] : []
            },
        },
    ],
})
