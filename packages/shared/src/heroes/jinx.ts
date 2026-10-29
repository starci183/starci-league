// Jinx: xạ thủ dọn giao tranh. Tên lửa nổ lan sang mọi tướng đứng kề mục tiêu (địch đứng dồn càng đau),
// bẫy nổ dây chuyền, hạ gục thì Phấn Khích đánh tiếp (lăn cầu tuyết).
import {
    apOf, atkOf, mixed, other, status, unitsInArea
} from "../helpers"
import {
    ROWS, rowIndex
} from "../cards"
import * as C from "../items/conditions"
import {
    defineHero
} from "../registry"
import type {
    Effect, HeroCtx, ISkillBoost
} from "../types"
import {
    lanesAround, mainDamageOf, neighboursOf, setStackFx, targetOf
} from "./kit"

/** Ô bên địch ở 3 đường quanh mình (tầm chọn tâm) */
const cellsAround = ({ unit }: HeroCtx) => lanesAround(unit).flatMap((lane) => ROWS.map((row) => ({
    lane, row
})))
const rocket = C.flagOn("t:jinx_rocket",
    "đang dùng tên lửa")
/** Q không gây sát thương: phần "địch đứng dồn" tính trong nội tại Cá Mập Tên Lửa; boost chỉ để hiện dòng mô tả */
const Q_PACK: ISkillBoost = {
    condition: C.targetNearAlly, desc: "đòn tên lửa gây thêm 30% sát thương thay vì 10%"
}

export default defineHero({
    id: "jinx", name: "Jinx", role: "marksman", armor: 26, mr: 26,
    atk: 60, ap: 0, hp: 700,
    desc: "Khẩu pháo lỏng ốc. Tên lửa nổ lan sang mọi tướng đứng kề mục tiêu, hạ gục thì Phấn Khích bắn tiếp.",
    strength: "Dọn giao tranh: địch đứng càng dồn, tên lửa và bẫy nổ càng rộng; hạ gục được đánh thêm",
    concept: "Lăn cầu tuyết: mỗi hạ gục cho thêm 1 đòn đánh và +40% Tốc đánh",
    counter: "Đội hình đứng dồn: tên lửa, bẫy và Siêu Khủng Khiếp nổ lan sang mọi tướng đứng kề",
    passive: {
        name: "Hưng Phấn!", desc: "Khi Jinx hạ gục một tướng, Jinx được **đánh thêm 1 lần** và nhận Cường Hoá 2 vòng. Khi đang Cường Hoá, Jinx được **+40% Tốc đánh**."
    },
    onKill: ({ unit }) => [{
        type: "refresh", unitId: unit.id
    },
    status(unit,
        "empower",
        2)],
    // Bãi bẫy cháy: đầu lượt kế của Jinx, tướng địch còn trong vùng thập tự nhận {10% AD} + {15 + 15% AP} và bị Buốt 2 vòng
    zoneTick: ({ unit, zone, targets }) => (zone.key !== "chomper" ? [] : targets.flatMap((x) => [
        ...mixed(unit,
            x,
            "Bẫy Chomper!",
            {
                physical: 0.1 * atkOf(unit), magic: 15 + 0.15 * apOf(unit)
            }),
        status(x,
            "chill",
            2)])),
    props: [
        {
            name: "Phấn Khích!", desc: "Khi Cường Hoá: +40% Tốc đánh.", condition: C.selfHas("empower"), stats: {
                extraAtk: 0.4
            }
        },
        {
            name: "Cá Mập Tên Lửa", desc: "Chế độ tên lửa: +10% sát thương (+30% nếu mục tiêu có đồng đội đứng kề), nổ lan sang mọi tướng đứng kề mục tiêu.",
            condition: C.all(C.isAttack,
                rocket), damageMult: (c) => (Q_PACK.condition.test(c) ? 1.3 : 1.1),
            onAttack: (c) => {
                if (!c.state || !c.target) return []
                const main = mainDamageOf(c.effects,
                    c.target)
                return neighboursOf(c.state,
                    c.target).flatMap((x): Effect[] => [
                    ...mixed(c.self,
                        x,
                        "Tên Lửa (nổ lan)",
                        {
                            magic: 0.25 * apOf(c.self)
                        }),
                    {
                        type: "damage", target: {
                            kind: "unit", id: x.id
                        }, amount: Math.round(main * 0.5), label: "Tên Lửa (nổ lan)", kind: "physical"
                    }])
            }
        },
    ],
    skills: [
        {
            def: {
                id: "jinx_q", key: "Q", name: "Tráo Hàng!", mana: 20, cooldown: 1, target: "none",
                desc: "Bản thân. Lượt này, đòn đánh của Jinx gây thêm 10% sát thương và **nổ lan** sang mọi tướng địch khác trong **vùng 3×3** quanh mục tiêu: 50% sát thương đòn đánh và thêm {25% AP} sát thương vật lý."
            },
            boosts: [Q_PACK],
            resolve: ({ unit }) => [setStackFx(unit,
                "t:jinx_rocket",
                1)],
        },
        {
            def: {
                id: "jinx_w", key: "W", name: "Giật Bắn!", mana: 30, cooldown: 2, target: "enemyAny",
                desc: "Chọn 1 tướng địch **bất kỳ trên sân**. Gây {30 + 100% AD + 30% AP} sát thương vật lý cho tướng đó và gây **Buốt** 2 vòng."
            },
            boosts: [{
                condition: C.targetControlled, desc: "gây thêm 20% sát thương", mult: 1.2
            }],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                return t ? [...mixed(unit,
                    t,
                    "Giật Bắn!",
                    {
                        physical: 30 + atkOf(unit), magic: 0.3 * apOf(unit)
                    }),
                status(t,
                    "chill",
                    2)] : []
            },
        },
        {
            def: {
                id: "jinx_e", key: "E", name: "Bẫy Chomper!", mana: 20, cooldown: 4, target: "cell", area: "cross",
                desc: "Chọn 1 ô bất kỳ bên địch ở **3 đường quanh mình** (**vùng thập tự**: ô đó, trước, sau, trái, phải): đặt bẫy. Mọi tướng địch trong vùng nhận {40 + 30% AD + 45% AP} sát thương vật lý và bị **Choáng 1 vòng**. Bãi bẫy **cháy thêm 1 lượt**: đầu lượt kế của Jinx, tướng địch còn trong vùng nhận {15 + 10% AD + 15% AP} sát thương vật lý và bị Buốt 2 vòng."
            },
            cells: cellsAround,
            boosts: [{
                condition: C.targetClusterAtLeast(2), desc: "bẫy nổ dây chuyền: gây thêm 25% sát thương", mult: 1.25
            }],
            resolve: ({ state, unit, cell }) => {
                if (!cell) return []
                const side = other(unit.owner), row = rowIndex(cell.row)
                return [...unitsInArea(state,
                    side,
                    "cross",
                    {
                        lane: cell.lane, row
                    }).flatMap((x) => [
                    ...mixed(unit,
                        x,
                        "Bẫy Chomper!",
                        {
                            physical: 0.3 * atkOf(unit), magic: 40 + 0.45 * apOf(unit)
                        }),
                    status(x,
                        "stun",
                        1)]),
                {
                    type: "zone", key: "chomper", srcId: unit.id, side, lane: cell.lane, row, shape: "cross", turns: 1
                }]
            },
        },
        {
            def: {
                id: "jinx_r", key: "R", name: "Tên Lửa Đạn Đạo Siêu Khủng Khiếp!", mana: 70, cooldown: 5, target: "enemyAny",
                desc: "Chọn 1 tướng địch **bất kỳ trên sân**. Gây {60 + 80% AD + 30% AP} cộng **15% máu đã mất** của tướng đó sát thương vật lý; mọi tướng địch khác trong **vùng 3×3** quanh tướng đó nhận **50%** sát thương này."
            },
            boosts: [{
                condition: C.targetNearAlly, desc: "gây thêm 25% sát thương lên tướng đó", mult: 1.25
            }],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                if (!t) return []
                const parts = (k: number, x: typeof t) => mixed(unit,
                    x,
                    "Tên Lửa Siêu Khủng Khiếp",
                    {
                        physical: k * (60 + 0.8 * atkOf(unit) + 0.15 * (x.maxHp - x.hp)), magic: k * 0.3 * apOf(unit)
                    })
                return [...parts(1,
                    t),
                ...neighboursOf(state,
                    t).flatMap((x) => parts(0.5,
                    x))]
            },
        },
    ],
})
