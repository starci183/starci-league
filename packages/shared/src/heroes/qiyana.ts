// Qiyana: sát thủ địa hình. W hấp thụ nguyên tố theo chỗ đứng (đường biên = Đá, đường giữa = Sông, còn lại = Cỏ) để đổi hiệu ứng Q;
// R đẩy mục tiêu về phía tường, đập tường thì choáng. Khắc tướng đứng sát tường (đường biên: đi rừng, giành Baron).
// Center: AD sát lực dồn kẻ sát tường · Counter: đội giành rừng/Baron ở đường biên · Dị: AP, R nổ cả cụm.
import {
    apOf, atkOf, mixed, stackOf, status
} from "../helpers"
import {
    rowIndex
} from "../cards"
import * as C from "../items/conditions"
import {
    defineHero
} from "../registry"
import type {
    ICondition
} from "../items/types"
import type {
    Effect, UnitLike
} from "../types"
import {
    enemiesAroundTarget, enemyIdsAround, pushBlocked, setStackFx, targetOf, wallward, displaceFx
} from "./kit"

/** Nguyên tố đang giữ: 1 Đá, 2 Sông, 3 Cỏ */
const EL = "qy_el"
/** Tường = đường biên (sát quái rừng) hoặc hàng cuối sân */
const atWall = (u: UnitLike) => u.lane === 0 || u.lane === 4 || u.row === "back"
const elementAt = (u: UnitLike) => (atWall(u) ? 1 : u.lane === 2 ? 2 : 3)
/** Hướng hất về bức tường gần nhất: lùi về hàng cuối nếu gần hơn (hoặc bằng) đường biên */
const towardWall = (u: UnitLike): [number, number] => {
    const side = Math.min(u.lane,
            4 - u.lane), back = 2 - rowIndex(u.row)
    return back <= side ? [1,
        0] : [0,
        wallward(u)]
}
const hasEl = (n: number, label: string): ICondition => ({
    kind: "qyElement", desc: label, test: (c) => stackOf(c.self,
        EL) === n
})

export default defineHero({
    id: "qiyana", name: "Qiyana", role: "assassin", armor: 30, mr: 28,
    atk: 80, ap: 0, hp: 760,
    desc: "Nữ hoàng nguyên tố. Mượn sức mạnh địa hình nơi mình đứng, đẩy kẻ địch vào tường để kết liễu.",
    strength: "Đổi lối đánh theo chỗ đứng: Đá dồn kẻ máu thấp, Sông làm Buốt, Cỏ tàng hình; R đập tường choáng 2 vòng",
    counter: "Tướng đứng sát tường (đường biên sát quái rừng, hàng cuối sân), nhất là kẻ kẹt ở góc: đội đi rừng, giành Baron, carry núp góc",
    concept: "Địa hình: đứng sát tường lấy Đá, đường giữa lấy Sông, chỗ khác lấy Cỏ",
    passive: {
        name: "Đặc Quyền Hoàng Gia", desc: "Qiyana gây **thêm 20% sát thương** lên tướng địch đứng **sát tường** (đường biên sát quái rừng hoặc hàng cuối sân); kẻ bị kẹt ở **góc** (nơi hai bức tường gặp nhau) chịu **thêm 44%**."
    },
    props: [
        {
            name: "Đặc Quyền Hoàng Gia", desc: "+20% sát thương lên tướng sát tường.", condition: C.targetAtWall, damageMult: () => 1.2
        },
        {
            name: "Đặc Quyền Hoàng Gia (góc)", desc: "Thêm +20% nữa lên tướng ở góc.", condition: C.targetInCorner, damageMult: () => 1.2
        },
    ],
    skills: [
        {
            def: {
                id: "qiyana_q", key: "Q", name: "Lưỡi Kiếm Ixtal", mana: 20, cooldown: 1, target: "enemyAny",
                desc: "Chọn 1 tướng địch ở 3 đường quanh mình. Gây {35 + 75% AD + 30% AP} sát thương vật lý cho tướng đó. Hiệu ứng thêm theo nguyên tố đang giữ (W)."
            },
            targets: ({ state, unit }) => enemyIdsAround(state,
                unit),
            boosts: [
                {
                    condition: C.all(hasEl(1,
                        "đang giữ Đá"),
                    C.targetHpBelow(0.5)), desc: "**Đá**: gây thêm 30% sát thương", mult: 1.3
                },
                {
                    condition: hasEl(2,
                        "đang giữ Sông"), desc: "**Sông**: tướng đó bị Buốt 2 vòng", extra: ({ target }) => [status(target,
                        "chill",
                        2)]
                },
                {
                    condition: hasEl(3,
                        "đang giữ Cỏ"), desc: "**Cỏ**: Qiyana tàng hình đến lượt sau", extra: ({ unit }) => [{
                        type: "hide", unitId: unit.id
                    }]
                },
            ],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                return t ? mixed(unit,
                    t,
                    "Lưỡi Kiếm Ixtal",
                    {
                        physical: 35 + 0.75 * atkOf(unit), magic: 0.3 * apOf(unit)
                    }) : []
            },
        },
        {
            def: {
                id: "qiyana_w", key: "W", name: "Thao Túng Địa Hình", mana: 20, cooldown: 3, target: "none",
                desc: "Bản thân. Qiyana hấp thụ nguyên tố nơi mình đứng (**sát tường: Đá**, **đường giữa: Sông**, còn lại: **Cỏ**), giữ tới khi dùng W lần sau, và được **đi thêm 1 ô** lượt này."
            },
            boosts: [{
                condition: C.selfAtWall, desc: "Qiyana hoàn 15 mana"
            }],
            resolve: ({ state, unit }) => {
                const fx: Effect[] = [setStackFx(unit,
                    EL,
                    elementAt(unit)),
                {
                    type: "freeMove", unitId: unit.id
                }]
                if (C.selfAtWall.test({
                    state, self: unit, preview: true
                })) fx.push({
                    type: "heroMana", unitId: unit.id, amount: 15
                })
                return fx
            },
        },
        {
            def: {
                id: "qiyana_e", key: "E", name: "Dũng Cảm", mana: 25, cooldown: 2, target: "enemyAny",
                desc: "Chọn 1 tướng địch ở 3 đường quanh mình. Gây {20 + 45% AD + 20% AP} sát thương vật lý cho tướng đó, và Qiyana được **đi thêm 1 ô** lượt này."
            },
            targets: ({ state, unit }) => enemyIdsAround(state,
                unit),
            boosts: [{
                condition: C.targetAtWall, desc: "tướng đó sát tường: Qiyana được **đánh thường thêm 1 lần**", extra: ({ unit }) => [{
                    type: "refresh", unitId: unit.id
                }]
            }],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                return t ? [...mixed(unit,
                    t,
                    "Dũng Cảm",
                    {
                        physical: 20 + 0.45 * atkOf(unit), magic: 0.2 * apOf(unit)
                    }),
                {
                    type: "freeMove", unitId: unit.id
                }] : []
            },
        },
        {
            def: {
                id: "qiyana_r", key: "R", name: "Tuyệt Kỹ Thượng Thừa", mana: 60, cooldown: 4, target: "enemyAny",
                desc: "Chọn 1 tướng địch ở 3 đường quanh mình. Gây {60 + 60% AD + 40% AP} sát thương vật lý cho tướng đó và mọi tướng địch trong **vùng thập tự** quanh nó, rồi **hất tướng đó 1 ô về phía bức tường gần nhất** (đường biên hoặc hàng cuối). Bị chặn (đập tường, va đồng đội hoặc Tường Băng): tướng đó bị **Choáng 1 vòng**."
            },
            targets: ({ state, unit }) => enemyIdsAround(state,
                unit),
            boosts: [
                {
                    condition: C.targetAtWall, desc: "tướng đó **đã sát tường**: bị Choáng 2 vòng và chịu thêm 30% sát thương", mult: 1.3, extra: ({ target }) => [status(target,
                        "stun",
                        2)]
                },
                {
                    condition: C.targetInCorner, desc: "tướng đó **kẹt ở góc**: chịu thêm 30% sát thương nữa và bị **Câm Lặng 2 vòng**", mult: 1.3, extra: ({ target }) => [status(target,
                        "silence",
                        2)]
                },
            ],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                if (!t) return []
                const [dRow,
                    dLane] = towardWall(t)
                const hits = enemiesAroundTarget(state,
                    t,
                    "cross").flatMap((x) => mixed(unit,
                    x,
                    "Tuyệt Kỹ Thượng Thừa",
                    {
                        physical: 60 + 0.6 * atkOf(unit), magic: 0.4 * apOf(unit)
                    }))
                return [...hits,
                    ...(pushBlocked(state,
                        t,
                        dRow,
                        dLane) ? [status(t,
                            "stun",
                            1)] : [displaceFx(t,
                            dRow,
                            dLane)])]
            },
        },
    ],
})
