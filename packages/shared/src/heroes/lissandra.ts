// Lissandra (thiết kế lại 10/2026): phù thủy băng dựng TƯỜNG BĂNG trên nửa sân địch. Ô tường không đi vào / bị dời vào được,
// tướng đứng trong tường bị giam (không tự đi). Mọi chiêu bắt kẻ vừa di chuyển: khắc đội cơ động (lướt, đi thêm ô, nhảy đường).
// Center: AP giam cả cụm rồi đánh kẻ bị giam · Counter: đội cơ động (Ahri, Kha'Zix, Katarina, Aatrox E) · Dị: AD + Đại Bác (đánh thường kẻ bị giam).
import {
    ROWS, rowIndex
} from "../cards"
import {
    apOf, atkOf, frontMost, isWallCell, mixed, other, status, unitsInArea
} from "../helpers"
import type {
    ICondition
} from "../items/types"
import {
    defineHero
} from "../registry"
import type {
    Effect, HeroCtx
} from "../types"
import {
    enemyIdsAround, lanesAround, targetOf
} from "./kit"

/** Tướng vừa di chuyển ở lượt trước của nó (cờ `moved` còn giữ tới đầu lượt sau của phe đó) */
const targetMoved: ICondition = {
    kind: "lissTargetMoved", desc: "mục tiêu vừa di chuyển lượt trước", test: (c) => !!c.target?.moved
}
/** Tướng đang đứng trong Tường Băng */
const trapped: ICondition = {
    kind: "lissTrapped", desc: "mục tiêu bị giam trong Tường Băng",
    test: (c) => !!c.state && !!c.target && isWallCell(c.state,
        c.target.owner,
        c.target.lane,
        c.target.row)
}
/** Ô bên địch ở 3 đường quanh mình (tầm dựng tường) */
const cellsAround = ({ unit }: HeroCtx) => lanesAround(unit).flatMap((lane) => ROWS.map((row) => ({
    lane, row
})))

export default defineHero({
    id: "lissandra", name: "Lissandra", role: "mage", armor: 32, mr: 34,
    atk: 58, ap: 0, hp: 780,
    desc: "Phù thủy băng. Dựng Tường Băng trên nửa sân địch: ô tường không ai đi vào được, kẻ đứng trong bị giam; kẻ vừa chạy là kẻ bị băng tóm trước.",
    strength: "Khoá di chuyển: Tường Băng giam cả cụm 2 lượt, R đóng băng cả một hàng ngang; kẻ bị giam chịu thêm sát thương",
    concept: "Tường Băng: ô tường là tường thật, đẩy địch vào tường băng cũng tính là va tường (Vayne, Janna choáng được)",
    counter: "Đội cơ động: tướng vừa di chuyển lượt trước bị Đóng băng, lối đi bị tường chặn, kẻ lướt vào bị giam lại",
    passive: {
        name: "Lãnh Địa Băng Giá", desc: "Lissandra gây **thêm 15% sát thương** lên tướng địch đang **bị giam trong Tường Băng**."
    },
    props: [{
        name: "Lãnh Địa Băng Giá", desc: "Sát thương lên tướng bị giam trong Tường Băng +15%.", condition: trapped, damageMult: () => 1.15
    }],
    // Tường Băng của W: đầu mỗi lượt của Lissandra, tướng địch còn bị giam nhận sát thương và bị Buốt
    zoneTick: ({ unit, zone, targets }) => zone.key !== "wall_w" ? [] : targets.flatMap((x): Effect[] =>
        [...mixed(unit,
            x,
            "Tường Băng",
            {
                physical: 0.1 * atkOf(unit), magic: 10 + 0.12 * apOf(unit)
            }),
        status(x,
            "chill",
            1)]),
    skills: [
        {
            def: {
                id: "lissandra_q", key: "Q", name: "Mảnh Băng", mana: 25, cooldown: 1, target: "enemyAny",
                desc: "Chọn 1 tướng địch ở 3 đường quanh mình. Gây {50 + 20% AD + 50% AP} sát thương phép cho tướng đó và gây **Buốt** 1 vòng."
            },
            targets: ({ state, unit }) => enemyIdsAround(state,
                unit),
            boosts: [
                {
                    condition: targetMoved, desc: "bắt kẻ chạy: gây thêm 25% sát thương", mult: 1.25
                },
                {
                    condition: trapped, desc: "Lissandra được hoàn 15 mana", extra: ({ unit }) => [{
                        type: "heroMana", unitId: unit.id, amount: 15
                    }]
                },
            ],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                return t ? [...mixed(unit,
                    t,
                    "Mảnh Băng",
                    {
                        physical: 0.2 * atkOf(unit), magic: 50 + 0.5 * apOf(unit)
                    }),
                status(t,
                    "chill",
                    1)] : []
            },
        },
        {
            def: {
                id: "lissandra_w", key: "W", name: "Tường Băng", mana: 30, cooldown: 4, target: "cell", area: "cross",
                desc: "Chọn 1 ô bất kỳ bên địch ở 3 đường quanh mình (tâm **vùng thập tự**). Dựng **Tường Băng** 2 lượt trên vùng đó: gây {35 + 20% AD + 30% AP} sát thương phép cho mọi tướng địch trong vùng và gây Buốt 1 vòng. Tướng đứng trong tường **bị giam** (không tự đi được); không tướng nào đi vào hay bị dời vào ô tường (bị đẩy vào là **va tường**). Đầu mỗi lượt của Lissandra, tướng địch còn bị giam nhận {10 + 10% AD + 12% AP} sát thương phép và bị Buốt 1 vòng."
            },
            cells: cellsAround,
            boosts: [{
                condition: targetMoved, desc: "tóm kẻ chạy: tướng đó bị **Đóng băng** 1 vòng", extra: ({ target }) => [status(target,
                    "freeze",
                    1)]
            }],
            resolve: ({ state, unit, cell }) => {
                if (!cell) return []
                const side = other(unit.owner), row = rowIndex(cell.row)
                return [...unitsInArea(state,
                    side,
                    "cross",
                    {
                        lane: cell.lane, row
                    })
                    .flatMap((x): Effect[] => [...mixed(unit,
                        x,
                        "Tường Băng",
                        {
                            physical: 0.2 * atkOf(unit), magic: 35 + 0.3 * apOf(unit)
                        }),
                    status(x,
                        "chill",
                        1)]),
                {
                    type: "zone", key: "wall_w", srcId: unit.id, side, lane: cell.lane, row, shape: "cross", turns: 2
                }]
            },
        },
        {
            def: {
                id: "lissandra_e", key: "E", name: "Con Đường Băng Giá", mana: 20, cooldown: 2, target: "none",
                desc: "Không chọn: tướng địch đứng đầu ở **3 đường quanh mình**. Gây {35 + 20% AD + 35% AP} sát thương phép cho các tướng đó và gây Buốt 1 vòng; Lissandra trượt theo con đường băng, được **đi thêm 1 ô**."
            },
            boosts: [
                {
                    condition: trapped, desc: "băng vỡ trong tường: gây thêm 20% sát thương lên tướng đó", mult: 1.2
                },
                {
                    condition: targetMoved, desc: "tướng đó bị Buốt 2 vòng thay vào đó", extra: ({ target }) => [status(target,
                        "chill",
                        2)]
                },
            ],
            resolve: ({ state, unit }) => [
                ...lanesAround(unit).map((l) => frontMost(state,
                    other(unit.owner),
                    l)).filter((x) => !!x)
                    .flatMap((x) => [...mixed(unit,
x!,
"Con Đường Băng Giá",
{
    physical: 0.2 * atkOf(unit), magic: 35 + 0.35 * apOf(unit)
}),
                    status(x!,
                        "chill",
                        1)]),
                {
                    type: "freeMove", unitId: unit.id
                }],
        },
        {
            def: {
                id: "lissandra_r", key: "R", name: "Phong Ấn Vĩnh Cửu", mana: 60, cooldown: 5, target: "cell", area: "row",
                desc: "Chọn 1 ô bất kỳ bên địch (cả **hàng ngang** của ô đó). Gây {60 + 30% AD + 45% AP} sát thương phép cho mọi tướng địch trên hàng đó và gây Buốt 2 vòng; cả hàng hoá **Tường Băng 1 lượt** (giam mọi tướng trên hàng, không ai đi vào được)."
            },
            boosts: [
                {
                    condition: targetMoved, desc: "tướng đó bị **Đóng băng** 1 vòng", extra: ({ target }) => [status(target,
                        "freeze",
                        1)]
                },
                {
                    condition: trapped, desc: "gây thêm 20% sát thương lên tướng đó", mult: 1.2
                },
            ],
            resolve: ({ state, unit, cell }) => {
                if (!cell) return []
                const side = other(unit.owner), row = rowIndex(cell.row)
                return [...unitsInArea(state,
                    side,
                    "row",
                    {
                        lane: cell.lane, row
                    })
                    .flatMap((x): Effect[] => [...mixed(unit,
                        x,
                        "Phong Ấn Vĩnh Cửu",
                        {
                            physical: 0.3 * atkOf(unit), magic: 60 + 0.45 * apOf(unit)
                        }),
                    status(x,
                        "chill",
                        2)]),
                {
                    type: "zone", key: "wall_r", srcId: unit.id, side, lane: cell.lane, row, shape: "row", turns: 1
                }]
            },
        },
    ],
})
