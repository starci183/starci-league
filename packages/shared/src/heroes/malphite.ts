// Malphite: đỡ đòn đá. Giáp thành sát thương, Dậm Đất làm kẻ đánh vật lý kiệt sức, R lao vào cả đường không thể cản.
// Center: lên giáp, R + E mở giao tranh cho cả đội · Counter: khắc xạ thủ/đấu sĩ (cướp giáp, Kiệt Sức) · Dị: lên AP thành pháp sư nổ.
import {
    apOf, armorOf, atkOf, laneEnemies, mixed, other, status
} from "../helpers"
import * as C from "../items/conditions"
import {
    defineHero
} from "../registry"
import type {
    Effect
} from "../types"
import {
    enemiesFront3, neighboursOf, setStackFx, shieldFx, stackFx, targetOf
} from "./kit"

export default defineHero({
    id: "malphite", name: "Malphite", role: "tank", armor: 37, mr: 33,
    atk: 66, ap: 0, hp: 1010,
    desc: "Mảnh vỡ Monolith. Càng nhiều giáp càng đau; R lao vào cả đường không ai cản được, đồng đội theo sau dọn dẹp.",
    strength: "Giáp thành sát thương: lên đồ thủ vẫn đánh đau. Lên AP: R và Q thành pháp sư nổ",
    counter: "Đội sát thương vật lý (xạ thủ, đấu sĩ, sát thủ AD): Q cướp giáp của chúng, E làm Kiệt Sức, giáp càng dày càng đánh đau",
    passive: {
        name: "Giáp Hoa Cương", desc: "Đầu mỗi lượt, nếu Malphite không có Khiên: Malphite nhận Khiên {5% máu tối đa + 40% Giáp}."
    },
    props: [
        {
            name: "Giáp Hoa Cương", desc: "Đầu lượt không có khiên: khiên 5% máu tối đa + 40% giáp.",
            onTurnStart: (c) => (c.self.shield <= 0 ? [shieldFx(c.self,
                c.self.maxHp * 0.05 + 0.4 * armorOf(c.self))] : [])
        },
        {
            name: "Nắm Đấm Sấm Sét", desc: "Sau W: đòn đánh thêm sát thương theo AD/AP/giáp, dư chấn lan sang địch đứng kề mục tiêu.",
            condition: C.all(C.isAttack,
                C.flagOn("t:malph_w",
                    "vừa tung W")),
            onAttack: (c) => {
                if (!c.state || !c.target) return []
                const u = c.self, raw = {
                    physical: 15 + 0.2 * atkOf(u) + 0.2 * armorOf(u), magic: 0.15 * apOf(u)
                }
                const fx: Effect[] = mixed(u,
                    c.target,
                    "Nắm Đấm Sấm Sét",
                    raw)
                // dư chấn: 50% lên mọi tướng địch đứng kề mục tiêu (địch đứng dồn)
                const half = {
                    physical: raw.physical * 0.5, magic: raw.magic * 0.5
                }
                for (const n of neighboursOf(c.state,
                    c.target)) fx.push(...mixed(u,
                    n,
                    "Dư Chấn",
                    half))
                return fx
            }
        },
    ],
    skills: [
        {
            def: {
                id: "malphite_q", key: "Q", name: "Mảnh Vỡ Địa Chấn", mana: 20, cooldown: 2, target: "enemyAny",
                desc: "Chọn 1 tướng địch bất kỳ trên sân. Gây {35 + 30% AD + 20% AP + 20% Giáp} sát thương phép cho tướng đó, rồi khiến tướng đó bị **Buốt 1 vòng**."
            },
            boosts: [{
                condition: C.targetRole("marksman",
                    "fighter"), desc: "Malphite **cướp giáp**, nhận +5 Giáp vĩnh viễn (tối đa +30)",
                extra: ({ unit }) => [stackFx(unit,
                    "bonus:armor",
                    5,
                    30)]
            }],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                return t ? [...mixed(unit,
                    t,
                    "Mảnh Vỡ Địa Chấn",
                    {
                        physical: 0.3 * atkOf(unit), magic: 35 + 0.2 * apOf(unit) + 0.2 * armorOf(unit)
                    }),
                status(t,
                    "chill",
                    1)] : []
            },
        },
        {
            def: {
                id: "malphite_w", key: "W", name: "Nắm Đấm Sấm Sét", mana: 15, cooldown: 2, target: "none",
                desc: "Bản thân: lượt này, mỗi đòn đánh của Malphite gây thêm {15 + 20% AD + 15% AP + 20% Giáp} sát thương phép."
            },
            boosts: [{
                condition: C.targetNearAlly, desc: "**dư chấn** lan 50% lượng thêm đó sang mọi tướng địch khác trong vùng 3×3 quanh mục tiêu"
            }],
            resolve: ({ unit }) => [setStackFx(unit,
                "t:malph_w",
                1)],
        },
        {
            def: {
                id: "malphite_e", key: "E", name: "Dậm Đất", mana: 20, cooldown: 2, target: "none",
                desc: "Không chọn: mọi tướng địch ở **3 ô trước mặt** Malphite (tiền tuyến địch ở đường này và 2 đường kề) nhận {25 + 20% AD + 20% AP + 30% Giáp} sát thương phép."
            },
            boosts: [
                {
                    condition: C.targetRole("marksman",
                        "fighter",
                        "assassin"), desc: "tướng đó bị **Kiệt Sức** 1 vòng (gây ít hơn 40% sát thương)",
                    extra: ({ target }) => [{
                        type: "buff", unitId: target.id, buffId: "exhaust", turns: 1
                    }]
                },
            ],
            resolve: ({ state, unit }) => enemiesFront3(state,
                unit)
                .flatMap((x) => mixed(unit,
                    x,
                    "Dậm Đất",
                    {
                        physical: 0.2 * atkOf(unit), magic: 25 + 0.2 * apOf(unit) + 0.3 * armorOf(unit)
                    })),
        },
        {
            def: {
                id: "malphite_r", key: "R", name: "Không Thể Cản Phá", mana: 50, cooldown: 4, target: "none",
                desc: "Không chọn: Malphite nhận **Không Cản Phá 2 vòng**, rồi mọi tướng địch trong **cột dọc** của đường Malphite (cả 3 hàng) nhận {50 + 30% AD + 25% AP + 40% Giáp} sát thương phép và bị **Choáng 1 vòng**."
            },
            boosts: [
                {
                    condition: C.targetNearAlly, desc: "tướng đó chịu thêm 15% sát thương", mult: 1.15
                },
                {
                    condition: C.selfMoved, desc: "lao vào từ xa, gây thêm 10% sát thương", mult: 1.1
                },
            ],
            resolve: ({ state, unit }) => [status(unit,
                "unstoppable",
                2),
            ...laneEnemies(state,
                other(unit.owner),
                unit.lane).flatMap((x) => [
                ...mixed(unit,
                    x,
                    "Không Thể Cản Phá",
                    {
                        physical: 0.3 * atkOf(unit), magic: 50 + 0.25 * apOf(unit) + 0.4 * armorOf(unit)
                    }),
                status(x,
                    "stun",
                    1)])],
        },
    ],
})
