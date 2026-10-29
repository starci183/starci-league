// Vayne: xạ thủ đấu tay đôi. Mũi Tên Bạc chuẩn mỗi 3 đòn cùng mục tiêu, Kết Án đẩy lùi và ghim tường.
import {
    apOf, atkOf, hit, laneEnemies, mixed, other, stackOf, status
} from "../helpers"
import * as C from "../items/conditions"
import type {
    ICondition
} from "../items/types"
import {
    defineHero
} from "../registry"
import type {
    Effect, HeroCtx, ISkillBoost
} from "../types"
import {
    displaceFx, enemyIdsInLane, healFx, pushBlocked, setStackFx, stackFx, targetOf
} from "./kit"

/** Đường của Vayne chỉ có đúng 1 tướng địch (đang đấu tay đôi) */
const duel: ICondition = {
    kind: "duel", desc: "đường chỉ có 1 tướng địch",
    test: (c) => !!c.state && laneEnemies(c.state,
        other(c.self.owner),
        c.self.lane).length === 1
}
/** Kết Án đẩy lùi 1 ô mà va tường (hậu tuyến) hoặc va đồng đội đứng sau */
const pinned: ICondition = {
    kind: "pushBlocked", desc: "mục tiêu bị đẩy va tường hoặc đồng đội",
    test: (c) => !!c.state && !!c.target && pushBlocked(c.state,
        c.target,
        1,
        0)
}

// Q/W/R không gây sát thương: điều kiện tự kiểm trong resolve, boost chỉ để hiện dòng mô tả
const Q_HIDE: ISkillBoost = {
    condition: C.selfHas("empower"), desc: "Vayne còn **hóa ẩn**"
}
const W_DUEL: ISkillBoost = {
    condition: duel, desc: "Chú Tâm kéo dài **3 vòng** thay vào đó"
}
const R_LOW: ISkillBoost = {
    condition: C.selfHpBelow(0.5), desc: "Vayne hồi {40 + 20% AD + 40% AP} máu"
}
const met = (b: ISkillBoost, { state, unit }: HeroCtx) => b.condition.test({
    state, self: unit, preview: true
})

export default defineHero({
    id: "vayne", name: "Vayne", role: "marksman", armor: 28, mr: 26,
    atk: 82, ap: 0, hp: 760,
    desc: "Thợ săn bóng đêm, chuyên đấu tay đôi. Mỗi đòn thứ 3 cùng mục tiêu gây sát thương chuẩn, Kết Án đẩy kẻ địch vào tường.",
    strength: "Đấu tay đôi một mục tiêu cùng đường: hút máu, sát thương chuẩn đều tay, ghim kẻ lao vào",
    counter: "Sát thủ/đấu sĩ lao vào: Kết Án đẩy lùi và làm Choáng kẻ lao vào, đập tường/va đồng đội thì choáng thêm; Mũi Tên Bạc chuẩn xuyên giáp kẻ trâu",
    passive: {
        name: "Thợ Săn Bóng Đêm", desc: "Mỗi **đòn đánh thứ 3** trúng cùng 1 tướng: gây thêm {30 + 30% AD + 30% AP} **Sát thương chuẩn**."
    },
    props: [
        {
            name: "Mũi Tên Bạc", desc: "Đòn thứ 3 cùng mục tiêu: {30 + 30% AD + 30% AP} chuẩn.",
            onAttack: (c): Effect[] => {
                if (!c.target) return []
                if (stackOf(c.target,
                    "vayne_ring") + 1 >= 3)
                    return [setStackFx(c.target,
                        "vayne_ring",
                        0),
                    hit(c.target,
                        30 + 0.3 * atkOf(c.self) + 0.3 * apOf(c.self),
                        "Mũi Tên Bạc",
                        "true")]
                return [stackFx(c.target,
                    "vayne_ring",
                    1)]
            }
        },
        {
            name: "Nhào Lộn", desc: "Sau Q: đòn đánh +50% và thêm {25% AP} phép.", condition: C.all(C.isAttack,
                C.flagOn("t:vayne_q",
                    "vừa nhào lộn")),
            damageMult: () => 1.5,
            onAttack: (c) => (c.target ? mixed(c.self,
                c.target,
                "Nhào Lộn",
                {
                    magic: 0.25 * apOf(c.self)
                }) : [])
        },
        {
            name: "Mũi Tên Bạc", desc: "Chú Tâm (W): +40% Tốc đánh, hút máu 15%.", condition: C.selfHas("focus"), stats: {
                extraAtk: 0.4, lifesteal: 0.15
            }
        },
        {
            name: "Giờ Khắc Cuối Cùng", desc: "Cường Hoá (R): +25% AD, +30 AP.", condition: C.selfHas("empower"), stats: {
                atkMult: 0.25, ap: 30
            }
        },
    ],
    skills: [
        {
            def: {
                id: "vayne_q", key: "Q", name: "Nhào Lộn", mana: 15, cooldown: 1, target: "none",
                desc: "Bản thân. Vayne được **đi thêm 1 ô** lượt này; lượt này, đòn đánh của Vayne gây **thêm 50% sát thương** và thêm {25% AP} sát thương vật lý."
            },
            boosts: [Q_HIDE],
            resolve: (ctx) => [setStackFx(ctx.unit,
                "t:vayne_q",
                1),
            {
                type: "freeMove", unitId: ctx.unit.id
            },
            ...(met(Q_HIDE,
                ctx) ? [{
                    type: "hide" as const, unitId: ctx.unit.id
                }] : [])],
        },
        {
            def: {
                id: "vayne_w", key: "W", name: "Mũi Tên Bạc", mana: 15, cooldown: 3, target: "none",
                desc: "Bản thân. Vayne nhận **Chú Tâm** 2 vòng: **+40% Tốc đánh** và **hút máu 15%** từ đòn đánh."
            },
            boosts: [W_DUEL],
            resolve: (ctx) => [status(ctx.unit,
                "focus",
                met(W_DUEL,
                    ctx) ? 3 : 2)],
        },
        {
            def: {
                id: "vayne_e", key: "E", name: "Kết Án", mana: 15, cooldown: 2, target: "enemyAny",
                desc: "Chọn 1 tướng địch cùng đường. Gây {50 + 50% AD + 60% AP} sát thương vật lý cho tướng đó và **đẩy lùi** nó 1 ô."
            },
            targets: ({ state, unit }) => enemyIdsInLane(state,
                unit),
            boosts: [
                {
                    condition: pinned, desc: "tướng đó **đập tường**: chịu thêm 50% sát thương và bị Choáng 1 vòng", mult: 1.5, extra: ({ target }) => [status(target,
                        "stun",
                        1)]
                },
                {
                    condition: C.targetRole("assassin",
                        "fighter"), desc: "tướng đó bị Choáng 1 vòng", extra: ({ target }) => [status(target,
                        "stun",
                        1)]
                },
            ],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                return t ? [...mixed(unit,
                    t,
                    "Kết Án",
                    {
                        physical: 50 + 0.5 * atkOf(unit), magic: 0.6 * apOf(unit)
                    }),
                displaceFx(t,
                    1,
                    0)] : []
            },
        },
        {
            def: {
                id: "vayne_r", key: "R", name: "Giờ Khắc Cuối Cùng", mana: 50, cooldown: 4, target: "none",
                desc: "Bản thân. Vayne được **Cường Hoá** 3 vòng: nhận **+25% AD** và **+30 AP**, và Nhào Lộn (Q) khiến Vayne **hóa ẩn**."
            },
            boosts: [R_LOW],
            resolve: (ctx) => [status(ctx.unit,
                "empower",
                3),
            ...(met(R_LOW,
                ctx) ? [healFx(ctx.unit,
                    40 + 0.2 * atkOf(ctx.unit) + 0.4 * apOf(ctx.unit))] : [])],
        },
    ],
})
