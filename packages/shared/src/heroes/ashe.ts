// Ashe: xạ thủ khống chế diện rộng + tầm nhìn. Mọi mũi tên gây Buốt (cả đội đánh mạnh hơn), Ưng Tiễn soi tướng ẩn,
// Tán Xạ Tiễn đóng băng tướng sát tường, Đại Băng Tiễn bay càng xa choáng càng lâu.
import {
    apOf, atkOf, frontMost, hasStatus, mixed, other, status
} from "../helpers"
import * as C from "../items/conditions"
import type {
    ICondition
} from "../items/types"
import {
    defaultAttack
} from "../rules"
import {
    defineHero
} from "../registry"
import type {
    Effect, ISkillBoost
} from "../types"
import {
    lanesAround, mainDamageOf, neighboursOf, targetOf
} from "./kit"

/** Mục tiêu đang ẩn (Ưng Tiễn bắn trúng được cả tướng ẩn) */
const targetHidden: ICondition = {
    kind: "targetHidden", desc: "mục tiêu đang ẩn", test: (c) => !!c.target?.hidden
}
/** Q không gây sát thương: phần "mục tiêu đang Buốt" tính trong attack() bên dưới; boost chỉ để hiện dòng mô tả */
const Q_CHILL: ISkillBoost = {
    condition: C.targetHas("chill"), desc: "mỗi mũi tên gây 35% sát thương đòn đánh thay vào đó"
}

export default defineHero({
    id: "ashe", name: "Ashe", role: "marksman", armor: 28, mr: 28,
    atk: 72, ap: 0, hp: 720,
    desc: "Cung thủ băng giá. Mọi mũi tên gây Buốt cho cả đội dồn sát thương; Ưng Tiễn soi tướng ẩn, Đại Băng Tiễn choáng từ xa.",
    strength: "Khống chế và đánh dấu diện rộng: Buốt cả 3 đường, đóng băng tướng sát tường, lộ diện tướng ẩn",
    concept: "Đánh dấu cho đồng đội: tướng bị Buốt nhận thêm 25% sát thương từ mọi nguồn",
    counter: "Sát thủ ẩn thân: Ưng Tiễn bắn trúng tướng đang ẩn, lộ diện và làm Choáng",
    passive: {
        name: "Băng Tiễn", desc: "Mỗi đòn đánh của Ashe gây **Buốt 2 vòng** lên mục tiêu. Đánh trúng tướng **đang Buốt**: gây thêm {20% AP} sát thương vật lý."
    },
    props: [
        {
            name: "Băng Tiễn", desc: "Đòn đánh gây Buốt 2 vòng; mục tiêu đang Buốt nhận thêm {20% AP} phép.",
            onAttack: (c) => (c.target ? [
                ...(hasStatus(c.target,
                    "chill") ? mixed(c.self,
                        c.target,
                        "Băng Tiễn",
                        {
                            magic: 0.2 * apOf(c.self)
                        }) : []),
                status(c.target,
                    "chill",
                    2)] : [])
        },
    ],

    // Chú Tâm: đòn đánh bắn thêm 2 mũi tên, mỗi mũi 25% sát thương đòn đánh (35% nếu mục tiêu đang Buốt) + {10% AP} phép
    attack({ state, unit, target }) {
        if (!hasStatus(unit,
            "focus")) return undefined
        const fx = defaultAttack(state,
            unit,
            target)
        const t = target.kind === "unit" ? state.units.get(target.id) : undefined
        if (!t) return fx
        const share = Q_CHILL.condition.test({
            state, self: unit, target: t, preview: true
        }) ? 0.35 : 0.25
        const main = mainDamageOf(fx,
            t)
        return [...fx,
            ...[0,
                1].flatMap((): Effect[] => [
                {
                    type: "damage", target, amount: Math.round(main * share), label: "Chú Tâm Tiễn", kind: "physical"
                },
                ...mixed(unit,
                    t,
                    "Chú Tâm Tiễn",
                    {
                        magic: 0.1 * apOf(unit)
                    })])]
    },

    skills: [
        {
            def: {
                id: "ashe_q", key: "Q", name: "Chú Tâm Tiễn", mana: 25, cooldown: 3, target: "none",
                desc: "Bản thân. Trong 1 vòng, mỗi đòn đánh của Ashe **bắn thêm 2 mũi tên** vào cùng mục tiêu, mỗi mũi gây 25% sát thương của đòn đánh đó và {10% AP} sát thương vật lý."
            },
            boosts: [Q_CHILL],
            resolve: ({ unit }) => [status(unit,
                "focus",
                1)],
        },
        {
            def: {
                id: "ashe_w", key: "W", name: "Tán Xạ Tiễn", mana: 25, cooldown: 2, target: "none",
                desc: "Không chọn: tướng địch đứng đầu ở **3 đường quanh mình** (đường này và 2 đường kề). Gây {30 + 50% AD + 40% AP} sát thương vật lý cho các tướng đó và gây **Buốt** 2 vòng."
            },
            boosts: [{
                condition: C.targetAtWall, desc: "tướng đó bị **Đóng băng** 1 vòng", extra: ({ target }) => [status(target,
                    "freeze",
                    1)]
            }],
            resolve: ({ state, unit }) =>
                lanesAround(unit).map((l) => frontMost(state,
                    other(unit.owner),
                    l)).filter((x) => !!x)
                    .flatMap((x) => [...mixed(unit,
x!,
"Tán Xạ Tiễn",
{
    physical: 30 + 0.5 * atkOf(unit), magic: 0.4 * apOf(unit)
}),
                    status(x!,
                        "chill",
                        2)]),
        },
        {
            def: {
                id: "ashe_e", key: "E", name: "Ưng Tiễn", mana: 20, cooldown: 3, target: "enemyAny",
                desc: "Chọn 1 tướng địch **bất kỳ trên sân, kể cả đang ẩn**. Lộ diện **mọi tướng địch đang ẩn**, gây {20 + 40% AD + 50% AP} sát thương vật lý cho tướng đó và **đánh dấu** nó: Buốt 2 vòng."
            },
            targets: ({ state, unit }) => {
                const ids: string[] = []
                state.units.forEach((x) => { if (x.owner !== unit.owner && x.lane >= 0) ids.push(x.id) })
                return ids
            },
            boosts: [{
                condition: targetHidden, desc: "tướng đó bị **bắt quả tang**: chịu thêm 30% sát thương và bị Choáng 1 vòng", mult: 1.3,
                extra: ({ target }) => [status(target,
                    "stun",
                    1)]
            }],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                const fx: Effect[] = [{
                    type: "reveal", side: other(unit.owner)
                }]
                if (t) fx.push(...mixed(unit,
                    t,
                    "Ưng Tiễn",
                    {
                        physical: 20 + 0.4 * atkOf(unit), magic: 0.5 * apOf(unit)
                    }),
                status(t,
                    "chill",
                    2))
                return fx
            },
        },
        {
            def: {
                id: "ashe_r", key: "R", name: "Đại Băng Tiễn", mana: 50, cooldown: 4, target: "enemyAny",
                desc: "Chọn 1 tướng địch **bất kỳ trên sân**. Gây {100 + 60% AD + 60% AP} sát thương vật lý cho tướng đó và gây **Choáng** 1 vòng; mọi tướng địch khác trong **vùng 3×3** quanh tướng đó bị **Buốt** 2 vòng."
            },
            boosts: [{
                condition: C.targetOtherLane, desc: "mũi tên bay xa: tướng đó bị **Choáng 2 vòng** thay vào đó", extra: ({ target }) => [status(target,
                    "stun",
                    2)]
            }],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                if (!t) return []
                return [...mixed(unit,
                    t,
                    "Đại Băng Tiễn",
                    {
                        physical: 0.6 * atkOf(unit), magic: 100 + 0.6 * apOf(unit)
                    }),
                status(t,
                    "stun",
                    1),
                ...neighboursOf(state,
                    t).map((x) => status(x,
                    "chill",
                    2))]
            },
        },
    ],
})
