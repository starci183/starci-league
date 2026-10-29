// Lux: pháp sư ánh sáng khống chế từ xa. Khóa Ánh Sáng trói 2 tướng ở cả đường kề, Lăng Kính khiên đồng minh xuyên đường,
// Cầu Vồng xuyên dọc cả đường tới trụ. Chiêu để lại dấu Soi Rọi, đòn đánh kích nổ.
import {
    apOf, atkOf, laneEnemies, mixed, other, status, unitsInArea
} from "../helpers"
import {
    ROWS, rowIndex
} from "../cards"
import * as C from "../items/conditions"
import {
    defineHero
} from "../registry"
import type {
    Effect, HeroCtx, UnitLike
} from "../types"
import {
    enemyIdsAround, lanesAround, setStackFx, shieldFx, targetOf
} from "./kit"

const mark = (t: UnitLike): Effect => setStackFx(t,
    "lux_mark",
    1)
const marked = C.targetStackAtLeast("lux_mark",
    1,
    "mục tiêu bị Soi Rọi")
const prismLow = C.targetHpBelow(0.5)
/** Ô bên địch ở 3 đường quanh mình (tầm chọn tâm) */
const cellsAround = ({ unit }: HeroCtx) => lanesAround(unit).flatMap((lane) => ROWS.map((row) => ({
    lane, row
})))


export default defineHero({
    id: "lux", name: "Lux", role: "mage", armor: 26, mr: 30,
    atk: 60, ap: 0, hp: 700,
    desc: "Pháp sư ánh sáng. Trói kẻ địch từ xa ở cả đường kề, khiên đồng minh xuyên đường, Cầu Vồng xuyên dọc cả đường.",
    strength: "Khống chế từ xa: Khóa Ánh Sáng với tới 3 đường và trói cả tướng đứng sau; R xuyên dọc cả đường tới trụ",
    concept: "Soi Rọi: chiêu đánh dấu, đòn đánh và Cầu Vồng kích nổ; Khóa → Quả Cầu → Cầu Vồng",
    counter: "Đội hình xếp dọc một đường: Khóa Ánh Sáng trói 2 tướng, Cầu Vồng trúng cả đường",
    passive: {
        name: "Chớp Lửa Soi Rọi", desc: "Đòn đánh của Lux vào tướng bị **Soi Rọi** gây thêm {20 + 20% AD + 40% AP} sát thương phép, rồi **xoá dấu** Soi Rọi."
    },
    props: [
        {
            name: "Chớp Lửa Soi Rọi", desc: "Đòn đánh vào mục tiêu bị Soi Rọi nổ thêm {20% AD} vật lý + {20 + 40% AP} phép.", condition: C.all(C.isAttack,
                marked),
            onAttack: (c) => (c.target ? [...mixed(c.self,
                c.target,
                "Chớp Lửa Soi Rọi",
                {
                    physical: 0.2 * atkOf(c.self), magic: 20 + 0.4 * apOf(c.self)
                }),
            setStackFx(c.target,
                "lux_mark",
                0)] : [])
        },
    ],
    skills: [
        {
            def: {
                id: "lux_q", key: "Q", name: "Khóa Ánh Sáng", mana: 25, cooldown: 2, target: "enemyAny",
                desc: "Chọn 1 tướng địch ở **3 đường quanh mình**. Gây {40 + 20% AD + 45% AP} sát thương phép cho tướng đó và gây **Choáng** 1 vòng; tướng đứng ngay sau nó (**cột dọc**) cũng bị trói: nhận **50%** lượng đó và bị Choáng 1 vòng. Cả hai bị **Soi Rọi**."
            },
            targets: ({ state, unit }) => enemyIdsAround(state,
                unit),
            boosts: [{
                condition: C.targetIsCarry, desc: "gây thêm 20% sát thương lên tướng đó", mult: 1.2
            }],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                if (!t) return []
                const dmg = (k: number) => ({
                    physical: k * 0.2 * atkOf(unit), magic: k * (40 + 0.45 * apOf(unit))
                })
                const behind = laneEnemies(state,
                    other(unit.owner),
                    t.lane).find((x) => rowIndex(x.row) === rowIndex(t.row) + 1)
                return [...mixed(unit,
                    t,
                    "Khóa Ánh Sáng",
                    dmg(1)),
                status(t,
                    "stun",
                    1),
                mark(t),
                ...(behind ? [...mixed(unit,
                    behind,
                    "Khóa Ánh Sáng",
                    dmg(0.5)),
                status(behind,
                    "stun",
                    1),
                mark(behind)] : [])]
            },
        },
        {
            def: {
                id: "lux_w", key: "W", name: "Lăng Kính Phòng Hộ", mana: 20, cooldown: 2, target: "allyLane",
                desc: "Chọn 1 đồng minh ở **3 đường quanh mình** (kể cả Lux). Tướng đó nhận **Khiên** {60 + 15% AD + 45% AP}; lăng kính quay về, Lux nhận Khiên bằng **50%** lượng đó (khi chọn đồng minh khác)."
            },
            targets: ({ state, unit }) => {
                const ids: string[] = []
                const lanes = lanesAround(unit)
                state.units.forEach((x) => { if (x.owner === unit.owner && x.lane >= 0 && lanes.includes(x.lane)) ids.push(x.id) })
                return ids
            },
            // khiên lên đồng minh: điều kiện tự kiểm trong resolve (mục tiêu là đồng minh), boost chỉ để hiện dòng mô tả
            boosts: [{
                condition: prismLow, desc: "Khiên lên tướng đó **×1.5**"
            }],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                if (!t) return []
                const n = 60 + 0.15 * atkOf(unit) + 0.45 * apOf(unit)
                const k = prismLow.test({
                    state, self: unit, target: t, preview: true
                }) ? 1.5 : 1
                return [shieldFx(t,
                    n * k),
                ...(t.id !== unit.id ? [shieldFx(unit,
                    n * 0.5)] : [])]
            },
        },
        {
            def: {
                id: "lux_e", key: "E", name: "Quả Cầu Ánh Sáng", mana: 30, cooldown: 2, target: "cell", area: "2x2",
                desc: "Chọn 1 ô bất kỳ bên địch ở **3 đường quanh mình** (**vùng 2×2**: ô đó, ô bên cạnh và hàng sau). Gây {50 + 20% AD + 40% AP} sát thương phép cho mọi tướng địch trong vùng, gây Buốt 1 vòng và **Soi Rọi**."
            },
            cells: cellsAround,
            boosts: [{
                condition: C.targetHas("stun"), desc: "gây thêm 20% sát thương lên tướng đó", mult: 1.2
            }],
            resolve: ({ state, unit, cell }) => {
                return cell ? unitsInArea(state,
                    other(unit.owner),
                    "2x2",
                    {
                        lane: cell.lane, row: rowIndex(cell.row)
                    }).flatMap((x) => [
                    ...mixed(unit,
                        x,
                        "Quả Cầu Ánh Sáng",
                        {
                            physical: 0.2 * atkOf(unit), magic: 50 + 0.4 * apOf(unit)
                        }),
                    status(x,
                        "chill",
                        1),
                    mark(x)]) : []
            },
        },
        {
            def: {
                id: "lux_r", key: "R", name: "Cầu Vồng Tối Thượng", mana: 50, cooldown: 4, target: "none",
                desc: "Không chọn: mọi tướng địch ở **cột dọc** đường của Lux (xuyên cả 3 hàng) và trụ địch đường này. Gây {80 + 20% AD + 50% AP} sát thương phép cho các tướng đó; trụ nhận {75 + 50% AP} sát thương."
            },
            boosts: [{
                condition: marked, desc: "gây thêm 20% sát thương lên tướng đó", mult: 1.2
            }],
            resolve: ({ state, unit }): Effect[] => {
                const e = other(unit.owner)
                return [
                    ...laneEnemies(state,
                        e,
                        unit.lane).flatMap((x) => mixed(unit,
                        x,
                        "Cầu Vồng Tối Thượng",
                        {
                            physical: 0.2 * atkOf(unit), magic: 80 + 0.5 * apOf(unit)
                        })),
                    {
                        type: "damage", target: {
                            kind: "tower", side: e, lane: unit.lane
                        }, amount: Math.round(75 + 0.5 * apOf(unit)), label: "Cầu Vồng Tối Thượng"
                    },
                ]
            },
        },
    ],
})
