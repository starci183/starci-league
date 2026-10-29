// Annie: pháp sư nổ diện rộng một lượt. Cứ 4 chiêu thì chiêu kế tiếp làm choáng (Hỏa Cuồng),
// Tibbers đốt cả đường và mạnh hơn khi Annie có đồng minh đứng kề.
import {
    apOf, atkOf, mixed, other, stackOf, status, unitsInArea
} from "../helpers"
import {
    ROWS, rowIndex
} from "../cards"
import * as C from "../items/conditions"
import {
    defineHero
} from "../registry"
import type {
    HeroCtx, ISkillBoost
} from "../types"
import {
    enemiesAroundTarget, enemyIdsInLane, lanesAround, lowHpBonus, neighboursOf, setStackFx, shieldFx, stackFx, targetOf
} from "./kit"

const pyroReady = C.flagOn("annie_stun",
    "Hỏa Cuồng sẵn sàng")
/** Hỏa Cuồng: khi sẵn sàng, chiêu kế tiếp làm Choáng 1 vòng */
const pyro: ISkillBoost = {
    condition: pyroReady, desc: "mục tiêu còn bị Choáng 1 vòng, rồi Hỏa Cuồng được tiêu hao",
    extra: ({ unit, target }) => [status(target,
        "stun",
        1),
    setStackFx(unit,
        "annie_stun",
        0)]
}
/** Ô bên địch ở 3 đường quanh mình (tầm chọn tâm) */
const cellsAround = ({ unit }: HeroCtx) => lanesAround(unit).flatMap((lane) => ROWS.map((row) => ({
    lane, row
})))
const withFriend = C.alliesNearAtLeast(1)
/** E không gây sát thương: điều kiện tự kiểm trong resolve, boost chỉ để hiện dòng mô tả */
const E_FRIEND: ISkillBoost = {
    condition: withFriend, desc: "Khiên tăng thêm 30%"
}

export default defineHero({
    id: "annie", name: "Annie", role: "mage", armor: 30, mr: 30,
    atk: 58, ap: 0, hp: 740,
    desc: "Đứa trẻ bóng tối. Dồn cả đường trong một lượt, cứ 4 chiêu thì chiêu kế tiếp làm choáng; gấu Tibbers đứng lại đốt vùng 3×3.",
    strength: "Nổ diện rộng một lượt: Thiêu Cháy nổ thập tự, Tibbers nổ 3×3, Hỏa Cuồng choáng mọi tướng trúng chiêu",
    concept: "Hỏa Cuồng: đếm chiêu để canh choáng đúng lúc; đứng cạnh đồng minh thì Tibbers và Khiên Lửa mạnh hơn",
    counter: "Đội cắm chốt đứng yên (giữ trụ, xạ thủ đứng bắn một chỗ): Tibbers đứng lại đốt, kẻ không chịu di chuyển bị đốt thêm 30%",
    passive: {
        name: "Hỏa Cuồng", desc: "Mỗi lần Annie tung chiêu, nhận 1 dấu; đủ 4 dấu thì **Hỏa Cuồng sẵn sàng**: chiêu gây sát thương kế tiếp của Annie làm mọi mục tiêu trúng chiêu bị Choáng 1 vòng."
    },
    props: [
        {
            name: "Hỏa Cuồng", desc: "Tung chiêu: +1 dấu, đủ 4 thì Hỏa Cuồng sẵn sàng.",
            onCast: (c) => (stackOf(c.self,
                "annie_pyro") + 1 >= 4
                ? [setStackFx(c.self,
                    "annie_pyro",
                    0),
                setStackFx(c.self,
                    "annie_stun",
                    1)]
                : [stackFx(c.self,
                    "annie_pyro",
                    1)])
        },
    ],
    // Tibbers đứng lại: đầu mỗi lượt của Annie đốt mọi tướng địch trong vùng 3×3 quanh nó (+50% nếu Annie có đồng minh đứng kề)
    zoneTick: ({ state, unit, zone, targets }) => {
        if (zone.key !== "tibbers") return []
        const k0 = neighboursOf(state,
            unit).length > 0 ? 1.5 : 1
        // kẻ cắm chốt (lượt trước không di chuyển) bị đốt thêm 30%
        return targets.flatMap((x) => { const k = k0 * (x.moved ? 1 : 1.3); return mixed(unit,
            x,
            "Tibbers",
            {
                physical: k * 0.15 * atkOf(unit), magic: k * (20 + 0.15 * apOf(unit))
            }) })
    },
    skills: [
        {
            def: {
                id: "annie_q", key: "Q", name: "Hỏa Cầu", mana: 20, cooldown: 2, target: "enemyAny",
                desc: "Chọn 1 tướng địch cùng đường. Gây {20% AD} sát thương phép và **{50 + 55% AP} sát thương phép** cho tướng đó."
            },
            targets: ({ state, unit }) => enemyIdsInLane(state,
                unit),
            boosts: [pyro,
                {
                    condition: C.targetHpBelow(0.3), desc: "Annie được hoàn 15 mana", extra: ({ unit }) => [{
                        type: "heroMana", unitId: unit.id, amount: 15
                    }]
                }],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                return t ? mixed(unit,
                    t,
                    "Hỏa Cầu",
                    {
                        physical: 0.2 * atkOf(unit), magic: 50 + 0.55 * apOf(unit)
                    }) : []
            },
        },
        {
            def: {
                id: "annie_w", key: "W", name: "Thiêu Cháy", mana: 30, cooldown: 2, target: "enemyAny",
                desc: "Chọn 1 tướng địch cùng đường. Gây {50 + 20% AD + 50% AP} sát thương phép cho mọi tướng địch trong **vùng thập tự** quanh tướng đó (tướng đó, trước, sau, trái, phải)."
            },
            targets: ({ state, unit }) => enemyIdsInLane(state,
                unit),
            boosts: [pyro,
                {
                    condition: C.targetClusterAtLeast(2), desc: "gây thêm 20% sát thương", mult: 1.2
                }],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                return t ? enemiesAroundTarget(state,
                    t,
                    "cross")
                    .flatMap((x) => mixed(unit,
                        x,
                        "Thiêu Rụi",
                        {
                            physical: 0.2 * atkOf(unit), magic: 50 + 0.5 * apOf(unit)
                        })) : []
            },
        },
        {
            def: {
                id: "annie_e", key: "E", name: "Khiên Lửa", mana: 15, cooldown: 2, target: "allyLane",
                desc: "Chọn 1 đồng minh cùng đường (kể cả Annie). Tướng đó nhận Khiên {60 + 20% AD + 40% AP}; nếu tướng đó dưới 50% máu, Khiên **tăng thêm 50%**."
            },
            boosts: [E_FRIEND],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                const k = E_FRIEND.condition.test({
                    state, self: unit, preview: true
                }) ? 1.3 : 1
                return t ? [shieldFx(t,
                    (60 + 0.2 * atkOf(unit) + 0.4 * apOf(unit)) * lowHpBonus(t,
                        1.5) * k)] : []
            },
        },
        {
            def: {
                id: "annie_r", key: "R", name: "Triệu Hồi: Tibbers", mana: 70, cooldown: 6, target: "cell", area: "3x3",
                desc: "Chọn 1 ô bất kỳ bên địch ở **3 đường quanh mình** (**vùng 3×3**): triệu hồi Tibbers ở đó. Gây {100 + 30% AD + 60% AP} sát thương phép cho mọi tướng địch trong vùng 3×3 quanh ô đó. Tibbers **đứng lại 2 lượt**: đầu mỗi lượt của Annie, đốt {20 + 15% AD + 15% AP} sát thương phép cho mọi tướng địch trong vùng 3×3 quanh nó (**+50%** nếu Annie có đồng minh đứng kề; tướng địch lượt trước **không di chuyển** bị đốt thêm **30%**). Tibbers có **{200 + 40% AP} máu** và **khiêu khích**: tướng địch đứng trong vùng 3×3 quanh Tibbers buộc phải đánh thường vào Tibbers; hết máu thì Tibbers biến mất sớm."
            },
            boosts: [pyro,
                {
                    condition: withFriend, desc: "Tibbers xông cùng đồng đội: gây thêm 20% sát thương", mult: 1.2
                }],
            cells: cellsAround,
            resolve: ({ state, unit, cell }) => {
                if (!cell) return []
                const side = other(unit.owner), row = rowIndex(cell.row)
                return [...unitsInArea(state,
                    side,
                    "3x3",
                    {
                        lane: cell.lane, row
                    })
                    .flatMap((x) => mixed(unit,
                        x,
                        "Triệu Hồi Tibbers",
                        {
                            physical: 0.3 * atkOf(unit), magic: 100 + 0.6 * apOf(unit)
                        })),
                {
                    type: "zone", key: "tibbers", srcId: unit.id, side, lane: cell.lane, row, shape: "3x3", turns: 2, hp: Math.round(200 + 0.4 * apOf(unit))
                }]
            },
        },
    ],
})
