// Leona: đỡ đòn khoá mục tiêu. Mọi chiêu gây Buốt (đánh dấu Ánh Dương), chiêu kế tiếp lên mục tiêu đang Buốt nổ thêm, R khoá chuỗi.
// Center: lên giáp + kháng phép, khoá 1 mục tiêu cho cả đội dồn · Counter (chỉnh 10/2026): đội dồn đồ cho 1 chủ lực · Dị: lên AD đấm khiên.
import {
    apOf, armorOf, atkOf, hasStatus, mixed, mrOf, status
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
    displaceFx, enemiesAroundTarget, enemiesFront3, enemyIdsAround, setStackFx, shieldFx, targetOf
} from "./kit"

/** Chủ lực: tướng địch đeo nhiều đồ nhất trên sân (từ 2 món, không ai hơn) */
const mainCarry: ICondition = {
    kind: "leonaMainCarry", desc: "mục tiêu đeo nhiều đồ nhất bên địch (từ 2 món)",
    test: (c) => {
        if (!c.target || !c.state || c.target.items.length < 2) return false
        let most = 0
        c.state.units.forEach((x) => { if (x.owner === c.target!.owner && x.lane >= 0) most = Math.max(most,
            x.items.length) })
        return c.target.items.length >= most
    }
}
const met = (c: ICondition, state: StateLike, self: UnitLike, target?: UnitLike) => c.test({
    state, self, target, preview: true
})
/** Ánh Dương: mục tiêu đang Buốt nhận thêm {15 + 15% AD + 15% AP + 10% Giáp} phép; rồi bị Buốt 1 vòng */
const sunlight = (u: UnitLike, t: UnitLike): Effect[] => [
    ...(hasStatus(t,
        "chill") ? mixed(u,
            t,
            "Ánh Dương",
            {
                physical: 0.15 * atkOf(u), magic: 15 + 0.15 * apOf(u) + 0.1 * armorOf(u)
            }) : []),
    status(t,
        "chill",
        1),
]

export default defineHero({
    id: "leona", name: "Leona", role: "tank", armor: 37, mr: 35,
    atk: 64, ap: 0, hp: 980,
    desc: "Bình Minh Rực Rỡ. Lao vào tiền tuyến, khoá chặt một mục tiêu bằng choáng chuỗi cho cả đội dồn sát thương.",
    strength: "Khoá một mục tiêu: Ánh Dương làm Buốt, R choáng 2 vòng lên mục tiêu đang Buốt",
    concept: "Ánh Dương: chiêu Leona làm Buốt (+25% sát thương nhận), đồng đội dồn lên mục tiêu bị khoá",
    counter: "Đội dồn đồ cho 1 chủ lực: Thiên Đỉnh Kiếm lao tới tướng đeo nhiều đồ nhất, R khoá nó 2 vòng cho cả đội dồn",
    passive: {
        name: "Ánh Dương", desc: "Chiêu của Leona gây **Buốt** 1 vòng lên tướng địch trúng chiêu. Nếu tướng đó **đang Buốt**, tướng đó chịu thêm {15 + 15% AD + 15% AP + 10% Giáp} sát thương phép."
    },
    props: [
        {
            name: "Khiên Bình Minh", desc: "Sau Q: đòn đánh làm Choáng 1 vòng và gây thêm sát thương.", condition: C.all(C.isAttack,
                C.flagOn("t:leona_q",
                    "vừa giơ khiên")),
            onAttack: (c) => {
                if (!c.target) return []
                const u = c.self, m = hasStatus(c.target,
                    "chill") ? 1.4 : 1
                return [...mixed(u,
                    c.target,
                    "Khiên Mặt Trời",
                    {
                        physical: (15 + 0.2 * atkOf(u)) * m, magic: (0.25 * apOf(u) + 0.2 * armorOf(u)) * m
                    }),
                status(c.target,
                    "stun",
                    1),
                status(c.target,
                    "chill",
                    1),
                setStackFx(u,
                    "t:leona_q",
                    0)]
            }
        },
    ],
    skills: [
        {
            def: {
                id: "leona_q", key: "Q", name: "Khiên Mặt Trời", mana: 15, cooldown: 2, target: "none",
                desc: "Bản thân: đòn đánh kế tiếp của Leona lượt này gây thêm {15 + 20% AD + 25% AP + 20% Giáp} sát thương phép, làm tướng trúng đòn bị **Choáng** 1 vòng và **Buốt** 1 vòng."
            },
            boosts: [{
                condition: C.targetHas("chill"), desc: "sát thương thêm của đòn đó tăng 40%"
            }],
            resolve: ({ unit }) => [setStackFx(unit,
                "t:leona_q",
                1)],
        },
        {
            def: {
                id: "leona_w", key: "W", name: "Nhật Thực", mana: 25, cooldown: 2, target: "none",
                desc: "Không chọn: Leona nhận **Kiên Cường 2 vòng** và Khiên {40 + 30% Giáp + 30% Kháng phép}; mọi tướng địch ở **3 ô trước mặt** Leona (tiền tuyến địch ở đường này và 2 đường kề) nhận {30 + 15% AD + 30% AP} sát thương phép."
            },
            boosts: [{
                condition: C.enemiesAroundAtLeast(2), desc: "Khiên của Leona tăng 50%"
            }],
            resolve: ({ state, unit }) => {
                const n = (40 + 0.3 * armorOf(unit) + 0.3 * mrOf(unit)) * (met(C.enemiesAroundAtLeast(2),
                    state,
                    unit) ? 1.5 : 1)
                return [shieldFx(unit,
                    n),
                status(unit,
                    "guard",
                    2),
                ...enemiesFront3(state,
                    unit).flatMap((x) => [...mixed(unit,
                    x,
                    "Nhật Thực",
                    {
                        physical: 0.15 * atkOf(unit), magic: 30 + 0.3 * apOf(unit)
                    }),
                ...sunlight(unit,
                    x)])]
            },
        },
        {
            def: {
                id: "leona_e", key: "E", name: "Thiên Đỉnh Kiếm", mana: 25, cooldown: 2, target: "enemyAny",
                desc: "Chọn 1 tướng địch ở 3 đường quanh mình. Gây {35 + 25% AD + 35% AP} sát thương phép cho tướng đó. Nếu tướng đó ở đường kề, Leona **lao sang** đường đó (nếu ô bên cạnh trống)."
            },
            targets: ({ state, unit }) => enemyIdsAround(state,
                unit),
            boosts: [
                {
                    condition: C.targetIsCarry, desc: "tướng đó còn bị **Choáng** 1 vòng", extra: ({ target }) => [status(target,
                        "stun",
                        1)]
                },
                {
                    condition: mainCarry, desc: "khoá chủ lực: gây thêm 30% sát thương lên tướng đó", mult: 1.3
                },
            ],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                if (!t) return []
                const dash = t.lane !== unit.lane ? [displaceFx(unit,
                    0,
                    Math.sign(t.lane - unit.lane))] : []
                return [...mixed(unit,
                    t,
                    "Thiên Đỉnh Kiếm",
                    {
                        physical: 0.25 * atkOf(unit), magic: 35 + 0.35 * apOf(unit)
                    }),
                ...sunlight(unit,
                    t),
                ...dash]
            },
        },
        {
            def: {
                id: "leona_r", key: "R", name: "Thái Dương Hạ San", mana: 60, cooldown: 4, target: "enemyAny",
                desc: "Chọn 1 tướng địch ở 3 đường quanh mình. Gây {90 + 25% AD + 50% AP} sát thương phép cho tướng đó và **Choáng 1 vòng**; mọi tướng địch khác trong **vùng 3×3** quanh tướng đó chịu một nửa sát thương và bị Buốt 1 vòng."
            },
            targets: ({ state, unit }) => enemyIdsAround(state,
                unit),
            boosts: [
                {
                    condition: C.targetHas("chill"), desc: "tướng đó bị **Choáng 2 vòng** thay vào đó"
                },
                {
                    condition: mainCarry, desc: "gây thêm 15% sát thương lên tướng đó", mult: 1.15
                },
            ],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                if (!t) return []
                const raw = {
                    physical: 0.25 * atkOf(unit), magic: 90 + 0.5 * apOf(unit)
                }
                return [...mixed(unit,
                    t,
                    "Thái Dương Hạ San",
                    raw),
                ...sunlight(unit,
                    t),
                status(t,
                    "stun",
                    hasStatus(t,
                        "chill") ? 2 : 1),
                ...enemiesAroundTarget(state,
                    t,
                    "3x3").filter((n) => n.id !== t.id).flatMap((n) => [...mixed(unit,
                    n,
                    "Thái Dương Hạ San",
                    {
                        physical: raw.physical / 2, magic: raw.magic / 2
                    }),
                status(n,
                    "chill",
                    1)])]
            },
        },
    ],
})
