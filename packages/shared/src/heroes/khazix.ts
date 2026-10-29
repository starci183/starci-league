// Kha'Zix: sát thủ Hư Không săn mục tiêu cô lập (không đồng đội đứng kề). Mỗi lần R hoặc hạ gục: tiến hoá 1 chiêu (Q → E → W).
// Center: săn carry đứng lẻ · Counter: xạ thủ/pháp sư không có tank đứng kề · Dị: AP Gai Hư Không quét đường.
import {
    apOf, atkOf, laneEnemies, mixed, other, stackOf, status
} from "../helpers"
import * as C from "../items/conditions"
import {
    defineHero
} from "../registry"
import type {
    Effect, HeroCtx, ISkillBoost, StateLike, UnitLike
} from "../types"
import {
    enemyIdsAround, healFx, setStackFx, stackFx, targetOf
} from "./kit"

const EVO = "kz_evo", UNSEEN = "kz_unseen"
const isolated = C.targetNoAllyNear
const evo = (n: number, label: string) => C.stacksAtLeast(EVO,
    n,
    label)
const evolveFx = (u: UnitLike): Effect => stackFx(u,
    EVO,
    1,
    3)
/** E tiến hoá: nhảy tới 2 đường quanh mình */
function leapTargets(state: StateLike, u: UnitLike) {
    if (stackOf(u,
        EVO) < 2) return enemyIdsAround(state,
        u)
    return [-2,
        -1,
        0,
        1,
        2].map((d) => u.lane + d).filter((l) => l >= 0 && l < 5)
        .flatMap((l) => laneEnemies(state,
            other(u.owner),
            l)).map((x) => x.id)
}

// R không gây sát thương: điều kiện tự kiểm trong resolve, boost chỉ để hiện dòng mô tả
const R_ALONE: ISkillBoost = {
    condition: C.selfAlone, desc: "Kha'Zix hoàn 25 Nộ"
}
const met = (b: ISkillBoost, { state, unit }: HeroCtx) => b.condition.test({
    state, self: unit, preview: true
})

export default defineHero({
    id: "khazix", name: "Kha'Zix", role: "assassin", armor: 30, mr: 26, resource: "rage",
    atk: 84, ap: 0, hp: 800,
    desc: "Sát thủ Hư Không. Săn kẻ không có đồng đội đứng kề, nhảy qua đường, tàng hình; càng săn càng tiến hoá.",
    strength: "Mục tiêu cô lập: Q, W, Hiểm Họa đều mạnh hơn; mỗi R/hạ gục tiến hoá thêm 1 chiêu",
    counter: "Tướng đứng lẻ (không đồng đội nào đứng kề): Q, W, Hiểm Họa đều mạnh hơn, bị vồ là chết",
    concept: "Tiến hoá: lần 1 Q (Vuốt), lần 2 E (Cánh: nhảy xa 2 đường), lần 3 W (Gai: gây Buốt)",
    passive: {
        name: "Hiểm Họa Tiềm Tàng", desc: "Sau khi **tàng hình** (E/R), đòn đánh kế tiếp của Kha'Zix gây thêm {10 + 20% AD + 20% AP} sát thương vật lý (gấp rưỡi lên mục tiêu cô lập). Khi Cường Hoá: mọi sát thương Kha'Zix gây ra **tăng 15%**. Mỗi lần tung R hoặc hạ gục: **tiến hoá** 1 chiêu (tối đa 3)."
    },
    onKill: ({ unit }) => [evolveFx(unit)],
    props: [
        {
            name: "Hiểm Họa Tiềm Tàng", desc: "Đòn đánh đầu sau khi tàng hình: thêm sát thương lai.", condition: C.all(C.isAttack,
                C.flagOn(UNSEEN,
                    "vừa tàng hình")),
            onAttack: (c) => {
                if (!c.target) return []
                const m = isolated.test(c) ? 1.5 : 1
                return [...mixed(c.self,
                    c.target,
                    "Hiểm Họa Tiềm Tàng",
                    {
                        physical: (10 + 0.2 * atkOf(c.self)) * m, magic: 0.2 * apOf(c.self) * m
                    }),
                setStackFx(c.self,
                    UNSEEN,
                    0)]
            }
        },
        {
            name: "Đột Kích", desc: "Khi Cường Hoá: +15% sát thương.", condition: C.selfHas("empower"), damageMult: () => 1.15
        },
    ],
    skills: [
        {
            def: {
                id: "khazix_q", key: "Q", name: "Nếm Mùi Sợ Hãi", mana: 15, cooldown: 2, target: "enemyAny",
                desc: "Chọn 1 tướng địch ở 3 đường quanh mình. Gây {30 + 70% AD + 30% AP} sát thương vật lý cho tướng đó."
            },
            targets: ({ state, unit }) => enemyIdsAround(state,
                unit),
            boosts: [
                {
                    condition: isolated, desc: "tướng đó **cô lập**: gây thêm **30% sát thương**", mult: 1.3
                },
                {
                    condition: C.all(isolated,
                        evo(1,
                            "đã tiến hoá Vuốt")), desc: "**Vuốt tiến hoá**: thêm 10% sát thương nữa và Kha'Zix hồi {5% máu tối đa}", mult: 1.1,
                    extra: ({ unit }) => [healFx(unit,
                        unit.maxHp * 0.05)]
                },
            ],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                return t ? mixed(unit,
                    t,
                    "Nếm Mùi Sợ Hãi",
                    {
                        physical: 30 + 0.7 * atkOf(unit), magic: 0.3 * apOf(unit)
                    }) : []
            },
        },
        {
            def: {
                id: "khazix_w", key: "W", name: "Gai Hư Không", mana: 20, cooldown: 2, target: "none",
                desc: "Không chọn: **cột dọc** (cả đường) của Kha'Zix. Gây {30 + 30% AD + 40% AP} sát thương vật lý cho mọi tướng địch trong vùng."
            },
            boosts: [
                {
                    condition: isolated, desc: "Kha'Zix hồi {6% máu tối đa + 20% AP} máu", extra: ({ unit }) => [healFx(unit,
                        unit.maxHp * 0.06 + 0.2 * apOf(unit))]
                },
                {
                    condition: evo(3,
                        "đã tiến hoá Gai"), desc: "**Gai tiến hoá**: tướng đó bị Buốt 2 vòng", extra: ({ target }) => [status(target,
                        "chill",
                        2)]
                },
            ],
            resolve: ({ state, unit }) => laneEnemies(state,
                other(unit.owner),
                unit.lane).flatMap((x) =>
                mixed(unit,
                    x,
                    "Gai Hư Không",
                    {
                        physical: 15 + 0.3 * atkOf(unit), magic: 15 + 0.4 * apOf(unit)
                    })),
        },
        {
            def: {
                id: "khazix_e", key: "E", name: "Nhảy", mana: 20, cooldown: 3, target: "enemyAny",
                desc: "Chọn 1 tướng địch ở 3 đường quanh mình (**Cánh tiến hoá**: 5 đường quanh mình). Gây {20 + 40% AD + 30% AP} sát thương vật lý cho tướng đó, rồi Kha'Zix **tàng hình** đến lượt sau."
            },
            targets: ({ state, unit }) => leapTargets(state,
                unit),
            boosts: [{
                condition: C.targetHpBelow(0.4), desc: "Kha'Zix được **đánh thường thêm 1 lần**", extra: ({ unit }) => [{
                    type: "refresh", unitId: unit.id
                }]
            }],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                return t ? [...mixed(unit,
                    t,
                    "Nhảy",
                    {
                        physical: 20 + 0.4 * atkOf(unit), magic: 0.3 * apOf(unit)
                    }),
                {
                    type: "hide", unitId: unit.id
                },
                setStackFx(unit,
                    UNSEEN,
                    1)] : []
            },
        },
        {
            def: {
                id: "khazix_r", key: "R", name: "Đột Kích Hư Không", mana: 40, cooldown: 4, target: "none",
                desc: "Bản thân. Kha'Zix **tàng hình** đến lượt sau, được **Cường Hoá** 2 vòng (mọi sát thương tăng 15%) và **tiến hoá** 1 chiêu."
            },
            boosts: [R_ALONE],
            resolve: (ctx) => [{
                type: "hide", unitId: ctx.unit.id
            },
            status(ctx.unit,
                "empower",
                2),
            setStackFx(ctx.unit,
                UNSEEN,
                1),
            evolveFx(ctx.unit),
            ...(met(R_ALONE,
                ctx) ? [{
                    type: "heroMana" as const, unitId: ctx.unit.id, amount: 25
                }] : [])],
        },
    ],
})
