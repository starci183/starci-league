// Thresh (chỉnh lại 10/2026): trợ thủ cai ngục GIẢI KHỐNG CHẾ. Đèn Lồng khiên + giải khống chế + ĐỔI CHỖ với đồng minh bị khống chế/nguy kịch,
// Lưỡi Hái giải khống chế cả đường mình. Không còn kéo địch (kéo hậu tuyến là của Blitzcrank).
// Center: lên giáp/AP, đèn lồng giữ cả đội sống · Counter: đội nhiều khống chế · Dị: lên AP nổ cả đường.
import {
    apOf, armorOf, atkOf, laneEnemies, mixed, other, status
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
    alliesInLane, enemyIdsInLane, frontsAt, lanesAround, shieldFx, stackFx, targetOf
} from "./kit"

const met = (c: ICondition, state: StateLike, self: UnitLike, target?: UnitLike) => c.test({
    state, self, target, preview: true
})
/** Thu 1 linh hồn: +2 giáp và +2 AP vĩnh viễn (tối đa 15 linh hồn) */
const soul = (u: UnitLike): Effect[] => [stackFx(u,
    "thresh_soul",
    1,
    15),
stackFx(u,
    "bonus:armor",
    2,
    30),
stackFx(u,
    "bonus:ap",
    2,
    30)]
const lowHp = C.targetHpBelow(0.4)
/** Đồng minh đang bị khống chế (kể cả Câm Lặng) */
const ccd = C.targetHas("stun",
    "freeze",
    "silence")
const rescue = (state: StateLike, self: UnitLike, t: UnitLike) => met(lowHp,
    state,
    self,
    t) || met(ccd,
    state,
    self,
    t)

export default defineHero({
    id: "thresh", name: "Thresh", role: "support", armor: 34, mr: 32,
    atk: 64, ap: 0, hp: 860,
    desc: "Cai ngục xích sắt. Đèn Lồng giải khống chế và đổi chỗ với đồng minh đang bị khống chế; Lưỡi Hái giải khống chế cả đường.",
    strength: "Cứu đồng minh: giải Choáng/Đóng băng/Buốt/Câm Lặng, đổi chỗ thế mạng; càng thu linh hồn càng trâu, khiên càng dày",
    concept: "Thu linh hồn: mỗi chiêu trúng tướng +2 giáp và +2 AP vĩnh viễn; Đèn Lồng ăn theo giáp; Thresh đổi chỗ để đứng chịu đòn thay",
    counter: "Đội nhiều khống chế: Đèn Lồng và Lưỡi Hái gỡ sạch khống chế, đồng minh bị khoá được Thresh đổi chỗ đưa ra ngoài",
    passive: {
        name: "Đọa Đày", desc: "Mỗi khi Q, E hoặc R của Thresh trúng tướng địch, hoặc Thresh hạ gục 1 tướng: thu 1 linh hồn **Đọa Đày** (tối đa 15), mỗi linh hồn cho **+2 Giáp và +2 AP vĩnh viễn**."
    },
    props: [{
        name: "Đoạt Hồn", desc: "Hạ gục: thu 1 linh hồn.", onKill: (c) => soul(c.self)
    }],
    skills: [
        {
            def: {
                id: "thresh_q", key: "Q", name: "Án Tử", mana: 25, cooldown: 3, target: "enemyAny",
                desc: "Chọn 1 tướng địch cùng đường. Gây {40 + 30% AD + 35% AP} sát thương phép cho tướng đó, rồi khiến tướng đó bị Choáng 1 vòng."
            },
            targets: ({ state, unit }) => enemyIdsInLane(state,
                unit),
            boosts: [
                {
                    condition: C.targetIsCarry, desc: "gây thêm 20% sát thương", mult: 1.2
                },
                {
                    condition: C.targetNoAllyNear, desc: "Thresh thu thêm 1 linh hồn", extra: ({ unit }) => soul(unit)
                },
            ],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                return t ? [...mixed(unit,
                    t,
                    "Án Tử",
                    {
                        physical: 0.3 * atkOf(unit), magic: 40 + 0.35 * apOf(unit)
                    }),
                status(t,
                    "stun",
                    1),
                ...soul(unit)] : []
            },
        },
        {
            def: {
                id: "thresh_w", key: "W", name: "Con Đường Tăm Tối", mana: 15, cooldown: 1, target: "allyLane",
                desc: "Chọn 1 đồng minh khác ở 3 đường quanh mình. Tướng đó nhận Khiên {30 + 30% AP + 50% Giáp} và được **giải Choáng, Đóng băng, Buốt, Câm Lặng**."
            },
            targets: ({ state, unit }) => {
                const ids: string[] = []
                state.units.forEach((x) => { if (x.owner === unit.owner && x.lane >= 0 && x.id !== unit.id && Math.abs(x.lane - unit.lane) <= 1) ids.push(x.id) })
                return ids
            },
            boosts: [
                {
                    condition: lowHp, desc: "Khiên tăng 50% và Thresh **đổi chỗ** với tướng đó (đứng ra chịu đòn thay)"
                },
                {
                    condition: ccd, desc: "tướng đó còn nhận **Kiên Cường** 2 vòng và Thresh **đổi chỗ** với tướng đó"
                },
            ],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                if (!t) return []
                const n = (30 + 0.3 * apOf(unit) + 0.5 * armorOf(unit)) * (met(lowHp,
                    state,
                    unit,
                    t) ? 1.5 : 1)
                const swap: Effect[] = rescue(state,
                    unit,
                    t) ? [{
                        type: "swap", unitId: unit.id, otherId: t.id
                    }] : []
                return [shieldFx(t,
                    n),
                ...(met(ccd,
                    state,
                    unit,
                    t) ? [status(t,
                        "guard",
                        2)] : []),
                {
                    type: "cleanse", unitId: t.id
                },
                ...swap]
            },
        },
        {
            def: {
                id: "thresh_e", key: "E", name: "Lưỡi Hái Xoáy", mana: 15, cooldown: 2, target: "none",
                desc: "Không chọn: mọi tướng địch trong **cột dọc** của đường này nhận {25 + 25% AD + 25% AP} sát thương phép và bị Buốt 1 vòng; mọi đồng minh cùng đường (kể cả Thresh) được **giải Choáng, Đóng băng, Buốt, Câm Lặng**."
            },
            boosts: [
                {
                    condition: C.targetNearAlly, desc: "tướng đó đứng dồn, chịu thêm 10% sát thương", mult: 1.1
                },
                {
                    condition: C.allyLaneControlled, desc: "Thresh thu thêm 1 linh hồn", extra: ({ unit }) => soul(unit)
                },
            ],
            resolve: ({ state, unit }) => {
                const enemies = laneEnemies(state,
                    other(unit.owner),
                    unit.lane) // tiền tuyến trước: kéo nối đuôi
                return [...enemies.flatMap((x) => [...mixed(unit,
                    x,
                    "Lưỡi Hái Xoáy",
                    {
                        physical: 0.25 * atkOf(unit), magic: 25 + 0.25 * apOf(unit)
                    }),
                status(x,
                    "chill",
                    1)]),
                ...alliesInLane(state,
                    unit).filter((x) => x.lane >= 0).map((x): Effect => ({
                    type: "cleanse", unitId: x.id
                })),
                ...(enemies.length ? soul(unit) : [])]
            },
        },
        {
            def: {
                id: "thresh_r", key: "R", name: "Đóng Hộp", mana: 50, cooldown: 4, target: "none",
                desc: "Không chọn: **tướng địch đứng đầu** ở 3 đường quanh mình (đường này và 2 đường kề) nhận {60 + 25% AD + 35% AP} sát thương phép, rồi bị **Buốt 2 vòng**."
            },
            boosts: [
                {
                    condition: C.targetHas("chill"), desc: "tướng đó còn bị Choáng 1 vòng", extra: ({ target }) => [status(target,
                        "stun",
                        1)]
                },
                {
                    condition: C.targetAtWall, desc: "bị nhốt sát tường, chịu thêm 25% sát thương", mult: 1.25
                },
            ],
            resolve: ({ state, unit }) => {
                const hits = frontsAt(state,
                    unit,
                    lanesAround(unit))
                return [...hits.flatMap((x) => [...mixed(unit,
                    x,
                    "Đóng Hộp",
                    {
                        physical: 0.25 * atkOf(unit), magic: 60 + 0.35 * apOf(unit)
                    }),
                status(x,
                    "chill",
                    2)]),
                ...(hits.length ? soul(unit) : [])]
            },
        },
    ],
})
