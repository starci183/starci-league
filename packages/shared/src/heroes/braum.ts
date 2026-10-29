// Braum: đỡ đòn bảo kê. Che chắn đồng minh đứng kề, giơ khiên cho cả đường đứng sau mình, đòn đánh tích dấu Ngất Ngư.
// Center: lên máu, cả đội đứng kề/sau Braum · Counter: khắc xạ thủ/sát thủ dồn một mục tiêu · Dị: lên AD đấm choáng liên tục.
import {
    adjacent, apOf, atkOf, bonusHpOf, frontMost, mixed, other, stackOf, status
} from "../helpers"
import {
    rowIndex
} from "../cards"
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
    alliesInLane, lanesAround, neighboursOf, setStackFx, shieldFx, stackFx, targetOf
} from "./kit"

const met = (c: ICondition, state: StateLike, self: UnitLike, target?: UnitLike) => c.test({
    state, self, target, preview: true
})
/** Đồng minh được chọn đứng ô kề Braum */
const allyNextToMe: ICondition = {
    kind: "allyNextToSelf", desc: "đồng minh đó đứng kề Braum", test: (c) => !!c.target && adjacent(c.target,
        c.self)
}
const lowHp = C.targetHpBelow(0.5)

/** Đánh Ngất Ngư: thêm 1 dấu; đủ 3 dấu thì Choáng 1 vòng và chịu thêm sát thương phép */
const concuss = (u: UnitLike, t: UnitLike): Effect[] =>
    stackOf(t,
        "braum") + 1 >= 3
        ? [setStackFx(t,
            "braum",
            0),
        status(t,
            "stun",
            1),
        ...mixed(u,
            t,
            "Đánh Ngất Ngư",
            {
                magic: 30 + 0.2 * apOf(u) + 0.04 * bonusHpOf(u)
            })]
        : [stackFx(t,
            "braum",
            1)]

export default defineHero({
    id: "braum", name: "Braum", role: "tank", armor: 37, mr: 37,
    atk: 62, ap: 0, hp: 820,
    desc: "Trái tim Freljord. Cả đường đứng sau tấm khiên của Braum mà đánh; đồng minh đứng kề được che chắn.",
    strength: "Bảo kê đồng minh đứng kề: khiên, Kiên Cường, chặn đòn cho cả đường phía sau",
    counter: "Đội dồn sát thương một mục tiêu (burst): khiên + Kiên Cường đúng lúc làm hỏng cả nhịp dồn",
    passive: {
        name: "Đánh Ngất Ngư", desc: "Đòn đánh và Q của Braum cộng 1 dấu Ngất Ngư lên mục tiêu. Đủ **3 dấu**: xoá dấu, tướng đó bị Choáng 1 vòng và chịu {30 + 20% AP + 4% máu cộng thêm} sát thương phép."
    },
    props: [{
        name: "Đánh Ngất Ngư", desc: "Đòn đánh cộng 1 dấu; đủ 3 dấu thì Choáng 1 vòng.", condition: C.isAttack,
        onAttack: (c) => (c.target ? concuss(c.self,
            c.target) : [])
    }],
    skills: [
        {
            def: {
                id: "braum_q", key: "Q", name: "Tuyết Tê Tái", mana: 20, cooldown: 2, target: "none",
                desc: "Không chọn: tướng địch đứng đầu đường này nhận {40 + 30% AD + 40% AP + 6% máu cộng thêm} sát thương phép, bị Buốt 2 vòng và bị cộng 1 dấu **Ngất Ngư**."
            },
            boosts: [{
                condition: C.targetNearAlly, desc: "băng lan, mọi tướng địch đứng kề tướng đó cũng bị Buốt 1 vòng",
                extra: ({ state, target }) => neighboursOf(state,
                    target).map((n) => status(n,
                    "chill",
                    1))
            }],
            resolve: ({ state, unit }) => {
                const t = frontMost(state,
                    other(unit.owner),
                    unit.lane)
                return t ? [...mixed(unit,
                    t,
                    "Tuyết Tê Tái",
                    {
                        physical: 0.3 * atkOf(unit), magic: 40 + 0.4 * apOf(unit) + 0.06 * bonusHpOf(unit)
                    }),
                status(t,
                    "chill",
                    2),
                ...concuss(unit,
                    t)] : []
            },
        },
        {
            def: {
                id: "braum_w", key: "W", name: "Nấp Sau Ta", mana: 20, cooldown: 3, target: "allyLane",
                desc: "Chọn 1 đồng minh (kể cả Braum) ở 3 đường quanh mình. Tướng đó nhận Khiên {60 + 20% AD + 30% AP + 15% máu cộng thêm}."
            },
            targets: ({ state, unit }) => {
                const ids: string[] = []
                state.units.forEach((x) => { if (x.owner === unit.owner && x.lane >= 0 && Math.abs(x.lane - unit.lane) <= 1) ids.push(x.id) })
                return ids
            },
            boosts: [
                {
                    condition: lowHp, desc: "Khiên tăng 50%"
                },
                {
                    condition: allyNextToMe, desc: "tướng đó còn nhận **Kiên Cường** 2 vòng (nhận ít hơn 30% sát thương)"
                },
            ],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                if (!t) return []
                const n = (60 + 0.2 * atkOf(unit) + 0.3 * apOf(unit) + 0.15 * bonusHpOf(unit)) * (met(lowHp,
                    state,
                    unit,
                    t) ? 1.5 : 1)
                return [shieldFx(t,
                    n),
                ...(t.id !== unit.id && met(allyNextToMe,
                    state,
                    unit,
                    t) ? [status(t,
                        "guard",
                        2)] : [])]
            },
        },
        {
            def: {
                id: "braum_e", key: "E", name: "Bất Khuất", mana: 30, cooldown: 4, target: "none",
                desc: "Không chọn: Braum giơ khiên, nhận **Kiên Cường 2 vòng**; mọi tướng mình **đứng sau Braum cùng đường** cũng nhận Kiên Cường 2 vòng. Braum và mọi tướng mình trong **vùng 3×3** quanh Braum nhận Khiên {40 + 20% AP + 8% máu cộng thêm}."
            },
            boosts: [{
                condition: C.alliesNearAtLeast(2), desc: "Khiên tăng 40%"
            }],
            resolve: ({ state, unit }) => {
                const behind = alliesInLane(state,
                    unit).filter((x) => x.id !== unit.id && rowIndex(x.row) > rowIndex(unit.row))
                const near = neighboursOf(state,
                    unit)
                const n = (40 + 0.2 * apOf(unit) + 0.08 * bonusHpOf(unit)) * (met(C.alliesNearAtLeast(2),
                    state,
                    unit) ? 1.4 : 1)
                return [status(unit,
                    "guard",
                    2),
                ...behind.map((x) => status(x,
                    "guard",
                    2)),
                shieldFx(unit,
                    n),
                ...near.map((x) => shieldFx(x,
                    n))]
            },
        },
        {
            def: {
                id: "braum_r", key: "R", name: "Băng Địa Chấn", mana: 50, cooldown: 4, target: "none",
                desc: "Không chọn: tướng địch đứng đầu ở **3 đường quanh mình** (đường này và 2 đường kề) nhận {80 + 40% AD + 50% AP + 8% máu cộng thêm} sát thương phép, rồi bị Choáng 1 vòng."
            },
            boosts: [
                {
                    condition: C.targetHas("chill"), desc: "gây thêm 25% sát thương lên tướng đó", mult: 1.25
                },
                {
                    condition: C.targetSameLane, desc: "tướng đó còn bị cộng 1 dấu Ngất Ngư", extra: ({ unit, target }) => concuss(unit,
                        target)
                },
            ],
            resolve: ({ state, unit }) =>
                lanesAround(unit).map((l) => frontMost(state,
                    other(unit.owner),
                    l)).filter((x): x is UnitLike => !!x)
                    .flatMap((x) => [...mixed(unit,
                        x,
                        "Băng Địa Chấn",
                        {
                            physical: 0.4 * atkOf(unit), magic: 80 + 0.5 * apOf(unit) + 0.08 * bonusHpOf(unit)
                        }),
                    status(x,
                        "stun",
                        1)]),
        },
    ],
})
