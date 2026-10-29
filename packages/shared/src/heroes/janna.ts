// Janna: trợ thủ gió. Đẩy lùi / hất ngang kẻ lao vào (đập tường thì choáng), khiên + tiếp sức đồng minh, R thổi bay cả đường và hồi máu.
// Center: lên AP/Mana, khiên + Cuồng Nộ cho carry · Counter (chỉnh 10/2026): đội đẩy trụ (đứng ở đường trụ mình đã mất máu) · Dị: lên AP sát thương gió.
import {
    TOWER_HP
} from "../cards"
import {
    apOf, atkOf, frontMost, laneEnemies, mixed, other, status
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
    displaceFx, healFx, lowHpBonus, neighboursOf, pushBlocked, shieldFx, targetOf, wallward
} from "./kit"

const met = (c: ICondition, state: StateLike, self: UnitLike, target?: UnitLike) => c.test({
    state, self, target, preview: true
})
/** Đẩy lùi bị chặn (va tường sau lưng hoặc va đồng đội) */
const blockedBack: ICondition = {
    kind: "pushBlockedBack", desc: "tướng đó bị đẩy vào tường hoặc đồng đội",
    test: (c) => !!c.state && !!c.target && pushBlocked(c.state,
        c.target,
        1,
        0)
}
/** Hất ngang ra phía tường bị chặn */
const blockedSide: ICondition = {
    kind: "pushBlockedSide", desc: "tướng đó bị hất vào tường hoặc đồng đội",
    test: (c) => !!c.state && !!c.target && pushBlocked(c.state,
        c.target,
        0,
        wallward(c.target))
}
/** Kẻ đẩy trụ: mục tiêu đứng ở đường mà trụ phe Janna đã mất máu (hoặc đã sập) */
const divers: ICondition = {
    kind: "jannaSiege", desc: "mục tiêu đứng ở đường trụ mình đã mất máu",
    test: (c) => !!c.target && (c.state?.players?.get(c.self.owner)?.towers?.[c.target.lane] ?? TOWER_HP) < TOWER_HP
}
const nearAllies = (state: StateLike, u: UnitLike) => {
    const ids = new Set<string>()
    state.units.forEach((x) => { if (x.owner === u.owner && x.lane === u.lane) ids.add(x.id) })
    neighboursOf(state,
        u).forEach((x) => ids.add(x.id))
    return [...ids].map((id) => state.units.get(id)!).filter(Boolean)
}

export default defineHero({
    id: "janna", name: "Janna", role: "support", armor: 28, mr: 34,
    atk: 58, ap: 0, hp: 760,
    desc: "Hiện thân của gió. Thổi bay kẻ đến công trụ, che chắn và tiếp sức cho carry của đội.",
    strength: "Ngắt giao tranh: đẩy lùi, hất ngang vào tường để choáng; khiên kèm Cuồng Nộ cho carry",
    counter: "Đội đẩy trụ: kẻ đứng ở đường trụ mình đã mất máu bị gió choáng thêm, Gió Tây với tới mọi đường để thổi kẻ công trụ",
    passive: {
        name: "Thuận Gió", desc: "Khiên và hồi máu của Janna mạnh hơn **25%** lên tướng mình dưới 50% máu."
    },
    props: [{
        name: "Thuận Gió", desc: "Khiên và hồi máu mạnh hơn 25% lên đồng minh dưới 50% máu."
    }],
    skills: [
        {
            def: {
                id: "janna_q", key: "Q", name: "Gió Lốc", mana: 15, cooldown: 2, target: "none",
                desc: "Không chọn: tướng địch đứng đầu đường này nhận {35 + 20% AD + 40% AP} sát thương phép, rồi bị **đẩy lùi 1 hàng**."
            },
            boosts: [
                {
                    condition: blockedBack, desc: "tướng đó chịu thêm 20% sát thương và bị Choáng 1 vòng", mult: 1.2, extra: ({ target }) => [status(target,
                        "stun",
                        1)]
                },
                {
                    condition: divers, desc: "tướng đó còn bị Choáng 1 vòng", extra: ({ target }) => [status(target,
                        "stun",
                        1)]
                },
            ],
            resolve: ({ state, unit }) => {
                const t = frontMost(state,
                    other(unit.owner),
                    unit.lane)
                return t ? [...mixed(unit,
                    t,
                    "Gió Lốc",
                    {
                        physical: 0.2 * atkOf(unit), magic: 35 + 0.4 * apOf(unit)
                    }),
                displaceFx(t,
                    1,
                    0)] : []
            },
        },
        {
            def: {
                id: "janna_w", key: "W", name: "Gió Tây", mana: 15, cooldown: 2, target: "enemyAny",
                desc: "Chọn 1 tướng địch bất kỳ trên sân. Gây {35 + 20% AD + 40% AP} sát thương phép cho tướng đó, gây **Buốt** 2 vòng, rồi **hất tướng đó sang 1 đường** về phía tường gần nhất."
            },
            boosts: [
                {
                    condition: blockedSide, desc: "tướng đó bị Choáng 1 vòng", extra: ({ target }) => [status(target,
                        "stun",
                        1)]
                },
                {
                    condition: divers, desc: "gây thêm 30% sát thương", mult: 1.3
                },
            ],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                return t ? [...mixed(unit,
                    t,
                    "Gió Tây",
                    {
                        physical: 0.2 * atkOf(unit), magic: 35 + 0.4 * apOf(unit)
                    }),
                status(t,
                    "chill",
                    2),
                displaceFx(t,
                    0,
                    wallward(t))] : []
            },
        },
        {
            def: {
                id: "janna_e", key: "E", name: "Mắt Bão", mana: 15, cooldown: 1, target: "allyLane",
                desc: "Chọn 1 đồng minh (kể cả Janna) ở 3 đường quanh mình. Tướng đó nhận Khiên {60 + 30% AD + 50% AP}."
            },
            targets: ({ state, unit }) => {
                const ids: string[] = []
                state.units.forEach((x) => { if (x.owner === unit.owner && x.lane >= 0 && Math.abs(x.lane - unit.lane) <= 1) ids.push(x.id) })
                return ids
            },
            boosts: [{
                condition: C.targetIsCarry, desc: "tướng đó còn nhận **Cuồng Nộ** (+25% AD) đến hết lượt"
            }],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                if (!t) return []
                return [shieldFx(t,
                    (60 + 0.3 * atkOf(unit) + 0.5 * apOf(unit)) * lowHpBonus(t,
                        1.25)),
                ...(met(C.targetIsCarry,
                    state,
                    unit,
                    t) ? [{
                        type: "buff", unitId: t.id, buffId: "wrath", turns: 1
                    } as Effect] : [])]
            },
        },
        {
            def: {
                id: "janna_r", key: "R", name: "Gió Mùa", mana: 50, cooldown: 4, target: "none",
                desc: "Không chọn: mọi tướng địch trong **cột dọc** của đường này nhận {30 + 30% AP} sát thương phép và bị **đẩy lùi 1 hàng**. Mọi tướng mình cùng đường hoặc trong **vùng 3×3** quanh Janna hồi {80 + 20% AD + 60% AP} máu (+25% nếu dưới 50% máu) và được **giải Choáng, Đóng băng, Buốt**."
            },
            boosts: [{
                condition: divers, desc: "tướng đó còn bị Choáng 1 vòng", extra: ({ target }) => [status(target,
                    "stun",
                    1)]
            }],
            resolve: ({ state, unit }) => {
                // đẩy từ hậu tuyến ra trước để hàng trước có chỗ lùi
                const foes = laneEnemies(state,
                    other(unit.owner),
                    unit.lane)
                return [
                    ...foes.flatMap((x) => mixed(unit,
                        x,
                        "Gió Mùa",
                        {
                            magic: 30 + 0.3 * apOf(unit)
                        })),
                    ...[...foes].reverse().map((x) => displaceFx(x,
                        1,
                        0)),
                    ...nearAllies(state,
                        unit).flatMap((x): Effect[] => [healFx(x,
                        (80 + 0.2 * atkOf(unit) + 0.6 * apOf(unit)) * lowHpBonus(x,
                            1.25)),
                    {
                        type: "cleanse", unitId: x.id
                    }]),
                ]
            },
        },
    ],
})
