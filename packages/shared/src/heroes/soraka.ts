// Soraka: trợ thủ hồi máu. Sao Băng nạp Tinh Lực, hiến máu mình để hồi đồng minh, Điểm Phân Cực Câm Lặng cả vùng 3×3, R hồi toàn bản đồ.
// Center: lên AP/Mana, hồi máu nuôi cả đội · Counter: khắc đội pháp sư/trợ thủ dựa vào chiêu (Điểm Phân Cực Câm Lặng) · Dị: lên máu, hồi theo máu cộng thêm.
import {
    apOf, atkOf, bonusHpOf, mixed, stackOf, status
} from "../helpers"
import * as C from "../items/conditions"
import type {
    ICondition
} from "../items/types"
import {
    defineHero
} from "../registry"
import type {
    Effect, StateLike, UnitLike
} from "../types"
import {
    alliesOnBoard, enemiesAroundTarget, enemyIdsAround, healFx, neighboursOf, setStackFx, targetOf
} from "./kit"

const met = (c: ICondition, state: StateLike, self: UnitLike, target?: UnitLike) => c.test({
    state, self, target, preview: true
})
/** Cứu Rỗi: hồi máu mạnh hơn 50% lên đồng minh dưới 40% máu */
const salvation = (u: UnitLike) => (u.hp < u.maxHp * 0.4 ? 1.5 : 1)
const allyNextToMe: ICondition = {
    kind: "allyNextToSoraka", desc: "đồng minh đó đứng kề Soraka",
    test: (c) => !!c.state && !!c.target && neighboursOf(c.state,
        c.self).some((x) => x.id === c.target!.id)
}
const dying = C.targetHpBelow(0.25)

export default defineHero({
    id: "soraka", name: "Soraka", role: "support", armor: 30, mr: 34,
    atk: 58, ap: 0, hp: 790,
    desc: "Đứa con của sao trời. Hiến máu của mình để nuôi cả đội; Điểm Phân Cực khiến cả cụm địch Câm Lặng.",
    strength: "Hồi máu mạnh nhất game: W mỗi lượt, R hồi toàn bản đồ",
    concept: "Đánh đổi máu: hiến máu mình để cứu đồng minh; Sao Băng trúng địch nạp Tinh Lực để lần hiến sau không mất máu",
    counter: "Đội dựa vào chiêu: Điểm Phân Cực Câm Lặng cả vùng 3×3, pháp sư/trợ thủ bị Câm 2 vòng",
    passive: {
        name: "Cứu Rỗi", desc: "Lượng hồi máu từ W và R của Soraka lên tướng mình đang dưới 40% máu được **tăng 50%**."
    },
    props: [{
        name: "Cứu Rỗi", desc: "Hồi máu lên đồng minh dưới 40% máu mạnh hơn 50%."
    }],
    skills: [
        {
            def: {
                id: "soraka_q", key: "Q", name: "Vẫn Tinh", mana: 20, cooldown: 2, target: "enemyAny",
                desc: "Chọn 1 tướng địch ở 3 đường quanh mình. Gây {40 + 20% AD + 40% AP} sát thương phép cho mọi tướng địch trong **vùng 2×2** quanh tướng đó và gây Buốt 1 vòng. Nếu trúng ít nhất 1 tướng, Soraka hồi {20 + 15% AP + 5% máu cộng thêm} máu và nạp **Tinh Lực** (W kế tiếp không mất máu)."
            },
            targets: ({ state, unit }) => enemyIdsAround(state,
                unit),
            boosts: [{
                condition: C.targetClusterAtLeast(2), desc: "sao băng lan, tướng đó chịu thêm 20% sát thương", mult: 1.2
            }],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                const enemies = t ? enemiesAroundTarget(state,
                    t,
                    "2x2") : []
                return [...enemies.flatMap((x) => [...mixed(unit,
                    x,
                    "Vẫn Tinh",
                    {
                        physical: 0.2 * atkOf(unit), magic: 40 + 0.4 * apOf(unit)
                    }),
                status(x,
                    "chill",
                    1)]),
                ...(enemies.length ? [healFx(unit,
                    20 + 0.15 * apOf(unit) + 0.05 * bonusHpOf(unit)),
                setStackFx(unit,
                    "soraka_star",
                    1)] : [])]
            },
        },
        {
            def: {
                id: "soraka_w", key: "W", name: "Tinh Tú Hộ Mệnh", mana: 30, cooldown: 1, target: "allyLane",
                desc: "Chọn 1 đồng minh khác ở 3 đường quanh mình. Hồi **{60 + 20% AD + 65% AP + 3% máu cộng thêm} máu** cho tướng đó, rồi Soraka mất {6% máu tối đa} máu (không mất nếu đang có Tinh Lực)."
            },
            targets: ({ state, unit }) => {
                const ids: string[] = []
                state.units.forEach((x) => { if (x.owner === unit.owner && x.lane >= 0 && x.id !== unit.id && Math.abs(x.lane - unit.lane) <= 1) ids.push(x.id) })
                return ids
            },
            boosts: [{
                condition: allyNextToMe, desc: "hồi thêm 25%"
            }],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                if (!t || t.id === unit.id) return []
                const n = (60 + 0.2 * atkOf(unit) + 0.65 * apOf(unit) + 0.03 * bonusHpOf(unit)) * salvation(t) * (met(allyNextToMe,
                    state,
                    unit,
                    t) ? 1.25 : 1)
                const cost: Effect[] = stackOf(unit,
                    "soraka_star") > 0 ? [setStackFx(unit,
                        "soraka_star",
                        0)]
                    : [{
                        type: "damage", target: {
                            kind: "unit", id: unit.id
                        }, amount: Math.round(unit.maxHp * 0.06), label: "Tinh Tú Hộ Mệnh (hiến máu)", kind: "true"
                    }]
                return [healFx(t,
                    n),
                ...cost]
            },
        },
        {
            def: {
                id: "soraka_e", key: "E", name: "Điểm Phân Cực", mana: 30, cooldown: 3, target: "enemyAny",
                desc: "Chọn 1 tướng địch ở 3 đường quanh mình. Gây {30 + 20% AD + 40% AP} sát thương phép cho mọi tướng địch trong **vùng 3×3** quanh tướng đó; mỗi tướng trúng chiêu bị **Câm Lặng** 1 vòng (không tung chiêu được)."
            },
            boosts: [
                {
                    condition: C.targetRole("mage",
                        "support"), desc: "tướng đó bị **Câm Lặng 2 vòng** thay vào đó", extra: ({ target }) => [status(target,
                        "silence",
                        2)]
                },
                {
                    condition: C.targetClusterAtLeast(3), desc: "gây thêm 20% sát thương", mult: 1.2
                },
            ],
            targets: ({ state, unit }) => enemyIdsAround(state,
                unit),
            resolve: ({ state, unit, targetId }) => { const t = targetOf(state,
                targetId); return t ? enemiesAroundTarget(state,
                t,
                "3x3").flatMap((x): Effect[] => [
                ...mixed(unit,
                    x,
                    "Điểm Phân Cực",
                    {
                        physical: 0.2 * atkOf(unit), magic: 30 + 0.4 * apOf(unit)
                    }),
                status(x,
                    "silence",
                    1)]) : [] },
        },
        {
            def: {
                id: "soraka_r", key: "R", name: "Nguyện Ước", mana: 80, cooldown: 6, target: "none",
                desc: "Không chọn: **mọi đồng minh trên sân** hồi **{70 + 20% AD + 50% AP + 3% máu cộng thêm} máu**."
            },
            boosts: [{
                condition: dying, desc: "tướng đó còn nhận **Kiên Cường** 2 vòng"
            }],
            resolve: ({ state, unit }) => alliesOnBoard(state,
                unit).flatMap((x) => [
                healFx(x,
                    (70 + 0.2 * atkOf(unit) + 0.5 * apOf(unit) + 0.03 * bonusHpOf(unit)) * salvation(x)),
                ...(met(dying,
                    state,
                    unit,
                    x) ? [status(x,
                        "guard",
                        2)] : [])]),
        },
    ],
})
