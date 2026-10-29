// Ahri (chỉnh lại 10/2026): pháp sư hồ ly MÊ HOẶC. Hôn Gió khiến mục tiêu quay sang đánh chính đồng đội đứng kề nó
// (xạ thủ đánh đau gấp đôi), Lửa Hồ Ly săn xạ thủ, Phi Hồ lướt ẩn. Không còn kéo địch (kéo là của Blitzcrank).
import {
    apOf, atkOf, distance, hpPct, laneEnemies, mixed, other, physical, roleOf, status
} from "../helpers"
import * as C from "../items/conditions"
import {
    defineHero
} from "../registry"
import type {
    Effect, UnitLike
} from "../types"
import {
    enemyIdsAround, frontsAt, healFx, lanesAround, neighboursOf, targetOf
} from "./kit"

export default defineHero({
    id: "ahri", name: "Ahri", role: "mage", armor: 28, mr: 30,
    atk: 64, ap: 0, hp: 720,
    desc: "Hồ ly chín đuôi. Hôn Gió mê hoặc kẻ địch quay sang đánh chính đồng đội của nó; Lửa Hồ Ly săn xạ thủ, Phi Hồ lướt ẩn.",
    strength: "Mê hoặc: biến AD của địch thành sát thương lên đồng đội nó, với tới 3 đường, lướt ẩn và đi thêm ô",
    concept: "Mê Hoặc: tướng trúng Hôn Gió đánh 1 đòn bằng AD của chính nó vào đồng đội đứng kề; không ai kề thì chỉ bị Choáng",
    counter: "Xạ thủ: bị mê hoặc thì bắn đồng đội gấp đôi, Lửa Hồ Ly đốt xạ thủ đau hơn",
    passive: {
        name: "Hút Tinh Hoa", desc: "Khi Ahri hạ gục 1 tướng địch, Ahri **hồi {10% máu tối đa + 20% AP} máu** và được **đi thêm 1 ô**."
    },
    props: [
        {
            name: "Hút Tinh Hoa", desc: "Hạ gục: hồi {10% máu tối đa + 20% AP} máu, đi thêm 1 ô.",
            onKill: (c) => [healFx(c.self,
                c.self.maxHp * 0.1 + 0.2 * apOf(c.self)),
            {
                type: "freeMove", unitId: c.self.id
            }]
        },
        {
            name: "Phi Hồ", desc: "Khi Cường Hoá: chiêu +20%.", condition: C.selfHas("empower"), stats: {
                spellAmp: 0.2
            }
        },
    ],
    skills: [
        {
            def: {
                id: "ahri_q", key: "Q", name: "Quả Cầu Ma Thuật", mana: 20, cooldown: 2, target: "none",
                desc: "Không chọn: mọi tướng địch ở **cột dọc** đường của Ahri. Gây {45 + 20% AD + 40% AP} sát thương phép cho các tướng đó; tướng đứng đầu nhận thêm **{20 + 15% AP} sát thương chuẩn** khi quả cầu quay về."
            },
            boosts: [{
                condition: C.targetControlled, desc: "gây thêm 20% sát thương lên tướng đó", mult: 1.2
            }],
            resolve: ({ state, unit }) => {
                const enemies = laneEnemies(state,
                    other(unit.owner),
                    unit.lane)
                return [...enemies.flatMap((x) => mixed(unit,
                    x,
                    "Quả Cầu Ma Thuật",
                    {
                        physical: 0.2 * atkOf(unit), magic: 45 + 0.4 * apOf(unit)
                    })),
                ...enemies.slice(0,
                    1).flatMap((x) => mixed(unit,
                    x,
                    "Quả Cầu (quay về)",
                    {
                        true: 20 + 0.15 * apOf(unit)
                    }))]
            },
        },
        {
            def: {
                id: "ahri_w", key: "W", name: "Lửa Hồ Ly", mana: 15, cooldown: 2, target: "none",
                desc: "Không chọn: **3 ngọn lửa** tự bay vào tướng địch ở **3 đường quanh mình**, mỗi ngọn vào tướng còn ít máu nhất (theo %) chưa bị ngọn nào trúng (hết người thì quay lại từ đầu). Mỗi ngọn gây {15 + 10% AD + 15% AP} sát thương phép; ngọn trúng lại tướng đã trúng chỉ gây **50%**."
            },
            boosts: [{
                condition: C.targetRole("marksman"), desc: "gây thêm 30% sát thương lên tướng đó", mult: 1.3
            }],
            resolve: ({ state, unit }) => {
                const pool = lanesAround(unit).flatMap((l) => laneEnemies(state,
                    other(unit.owner),
                    l)).sort((a, b) => hpPct(a) - hpPct(b))
                if (!pool.length) return []
                return [0,
                    1,
                    2].flatMap((i) => {
                    const k = i < pool.length ? 1 : 0.5
                    return mixed(unit,
                        pool[i % pool.length],
                        "Lửa Hồ Ly",
                        {
                            physical: k * 0.1 * atkOf(unit), magic: k * (15 + 0.15 * apOf(unit))
                        })
                })
            },
        },
        {
            def: {
                id: "ahri_e", key: "E", name: "Hôn Gió", mana: 25, cooldown: 3, target: "enemyAny",
                desc: "Chọn 1 tướng địch ở **3 đường quanh mình**. Gây {50 + 20% AD + 50% AP} sát thương phép cho tướng đó và gây **Choáng 1 vòng**. **Mê Hoặc**: tướng đó lập tức đánh 1 đòn bằng **100% AD của chính nó** (sát thương phép) vào đồng đội đứng kề nó gần Ahri nhất."
            },
            targets: ({ state, unit }) => enemyIdsAround(state,
                unit),
            boosts: [
                {
                    condition: C.targetRole("marksman"), desc: "đòn Mê Hoặc gây **gấp đôi** sát thương"
                },
                {
                    condition: C.targetNoAllyNear, desc: "không ai để đánh: tướng đó bị Choáng 2 vòng thay vào đó", extra: ({ target }) => [status(target,
                        "stun",
                        2)]
                },
            ],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                if (!t) return []
                const mate = neighboursOf(state,
                    t).sort((a, b) => distance(unit,
                    a) - distance(unit,
                    b))[0]
                const k = roleOf(t) === "marksman" ? 2 : 1
                const charm: Effect[] = mate ? [{
                    type: "damage", target: {
                        kind: "unit", id: mate.id
                    }, amount: physical(k * atkOf(t),
                        mate,
                        t), label: "Mê Hoặc", kind: "physical"
                }] : []
                return [...mixed(unit,
                    t,
                    "Hôn Gió",
                    {
                        physical: 0.2 * atkOf(unit), magic: 50 + 0.5 * apOf(unit)
                    }),
                status(t,
                    "stun",
                    1),
                ...charm]
            },
        },
        {
            def: {
                id: "ahri_r", key: "R", name: "Phi Hồ", mana: 45, cooldown: 4, target: "none",
                desc: "Không chọn: tướng địch đứng đầu ở **3 đường quanh mình**. Gây {40 + 20% AD + 35% AP} sát thương phép cho các tướng đó; rồi Ahri **ẩn thân**, được **đi thêm 1 ô** và nhận Cường Hoá 2 vòng. Khi đang Cường Hoá, chiêu của Ahri gây **thêm 20% sát thương**."
            },
            boosts: [{
                condition: C.selfMoved, desc: "gây thêm 25% sát thương", mult: 1.25
            }],
            resolve: ({ state, unit }) => [
                ...frontsAt(state,
                    unit,
                    lanesAround(unit)).flatMap((x: UnitLike) => mixed(unit,
                    x,
                    "Phi Hồ",
                    {
                        physical: 0.2 * atkOf(unit), magic: 40 + 0.35 * apOf(unit)
                    })),
                {
                    type: "hide", unitId: unit.id
                },
                {
                    type: "freeMove", unitId: unit.id
                },
                status(unit,
                    "empower",
                    2)],
        },
    ],
})
