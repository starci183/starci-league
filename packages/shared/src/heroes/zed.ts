// Zed: sát thủ bóng tối dùng Nộ. W đặt phân thân ở đường của 1 tướng địch: Q/E đánh cả từ bóng; R đánh dấu, lượt sau nổ theo sát thương đã dồn.
// Center: dồn 1 mục tiêu (bóng cùng đường với mục tiêu) · Counter: pháp sư/xạ thủ đứng sau tank (bóng vươn tới) · Dị: E quét 2 đường bằng AP.
import {
    apOf, atkOf, hit, hpPct, laneEnemies, mixed, other, stackOf, status
} from "../helpers"
import * as C from "../items/conditions"
import type {
    ICondition, PropCtx
} from "../items/types"
import {
    defineHero
} from "../registry"
import type {
    Effect, StateLike, UnitLike
} from "../types"
import {
    enemyIdsAround, lanesAround, setStackFx, targetOf
} from "./kit"

/** Đường của phân thân (lưu lane + 1, cờ "t:" hết khi Zed kết thúc lượt) */
const SH = "t:zed_shadow"
const shadowLane = (u: UnitLike) => (stackOf(u,
    SH) ? stackOf(u,
        SH) - 1 : -1)
const shadowOut = C.flagOn(SH,
    "có phân thân bóng tối")
/** Mục tiêu đứng cùng đường với phân thân: bóng đánh cùng */
const shadowOnTarget: ICondition = {
    kind: "zedShadowOnTarget", desc: "phân thân đứng cùng đường với mục tiêu",
    test: (c) => !!c.target && shadowLane(c.self) === c.target.lane
}
/** Phân thân đứng cùng đường với Zed: hai lưỡi kiếm chồng lên nhau */
const shadowStacked: ICondition = {
    kind: "zedShadowStacked", desc: "phân thân đứng cùng đường với Zed",
    test: (c) => shadowLane(c.self) === c.self.lane
}
const MARK = "zed_mark", MARK_DMG = "zed_mark_dmg"
/** Tướng địch trong tầm Zed: 3 đường quanh Zed và 3 đường quanh phân thân */
function reach(state: StateLike, u: UnitLike) {
    const lanes = new Set(lanesAround(u))
    const sl = shadowLane(u)
    if (sl >= 0) [sl - 1,
        sl,
        sl + 1].filter((l) => l >= 0 && l < 5).forEach((l) => lanes.add(l))
    return [...lanes].flatMap((l) => laneEnemies(state,
        other(u.owner),
        l)).map((x) => x.id)
}
/** Ghi lại sát thương Zed dồn lên mục tiêu đang mang Dấu Ấn */
const recordMark = (c: PropCtx): Effect[] => {
    const fx: Effect[] = []
    for (const f of c.effects ?? []) {
        if (f.type !== "damage" || f.target.kind !== "unit") continue
        const t = c.state?.units.get(f.target.id)
        if (t && t.owner !== c.self.owner && stackOf(t,
            MARK) > 0) fx.push({
            type: "stack", unitId: t.id, key: MARK_DMG, add: f.amount
        })
    }
    return fx
}

export default defineHero({
    id: "zed", name: "Zed", role: "assassin", armor: 30, mr: 28, resource: "rage",
    atk: 84, ap: 0, hp: 820,
    desc: "Chúa tể bóng tối. Phân thân đứng ở đường địch để chém từ hai phía; Dấu Ấn Tử Thần nổ theo sát thương đã dồn.",
    strength: "Dồn sát thương từ bóng: phân thân cùng đường mục tiêu làm Q/E mạnh gấp rưỡi, R nổ lại phần đã dồn",
    counter: "Tướng hậu tuyến núp sau tank: phân thân vươn tới đường của chúng, đứng sau lưng gây Buốt, Dấu Ấn nổ lại",
    passive: {
        name: "Khinh Thường Kẻ Yếu", desc: "Đòn đánh của Zed lên tướng dưới 50% máu gây thêm {20 + 30% AP} sát thương vật lý và **5% máu tối đa** của tướng đó (phép)."
    },
    props: [
        {
            name: "Khinh Thường Kẻ Yếu", desc: "Đòn đánh lên mục tiêu dưới 50% máu: thêm {20 + 30% AP} + 5% máu tối đa mục tiêu (phép).", condition: C.targetHpBelow(0.5),
            onAttack: (c) => (c.target ? mixed(c.self,
                c.target,
                "Khinh Thường",
                {
                    magic: 20 + 0.3 * apOf(c.self) + 0.05 * c.target.maxHp
                }) : [])
        },
        {
            name: "Dấu Ấn", desc: "Ghi lại sát thương lên mục tiêu mang Dấu Ấn Tử Thần.", onAttack: recordMark, onSkill: recordMark
        },
        // đầu lượt Zed: Dấu Ấn nổ, gây chuẩn 15% sát thương đã dồn (mục tiêu dưới 30% máu: 30%)
        {
            name: "Dấu Ấn Nổ", desc: "Đầu lượt: Dấu Ấn nổ.", onTurnStart: (c) => {
                const fx: Effect[] = []
                c.state?.units.forEach((t) => {
                    if (t.owner === c.self.owner || !stackOf(t,
                        MARK)) return
                    const pct = hpPct(t) < 0.3 ? 0.3 : 0.15
                    fx.push(hit(t,
                        stackOf(t,
                            MARK_DMG) * pct + 0.2 * apOf(c.self),
                        "Dấu Ấn Tử Thần (nổ)",
                        "true"),
                    setStackFx(t,
                        MARK,
                        0),
                    setStackFx(t,
                        MARK_DMG,
                        0))
                })
                return fx
            }
        },
    ],
    skills: [
        {
            def: {
                id: "zed_q", key: "Q", name: "Phi Tiêu Sắc Lẻm", mana: 10, cooldown: 1, target: "enemyAny",
                desc: "Chọn 1 tướng địch ở 3 đường quanh mình hoặc 3 đường quanh phân thân. Gây {15 + 40% AD + 30% AP} sát thương vật lý cho tướng đó."
            },
            targets: ({ state, unit }) => reach(state,
                unit),
            boosts: [{
                condition: shadowOnTarget, desc: "phân thân phi thêm 1 tiêu: gây thêm 40% sát thương", mult: 1.4
            }],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                return t ? mixed(unit,
                    t,
                    "Phi Tiêu Sắc Lẻm",
                    {
                        physical: 15 + 0.4 * atkOf(unit), magic: 0.3 * apOf(unit)
                    }) : []
            },
        },
        {
            def: {
                id: "zed_w", key: "W", name: "Phân Thân Bóng Tối", mana: 10, cooldown: 2, target: "enemyAny",
                desc: "Chọn 1 tướng địch ở 3 đường quanh mình. Phân thân lao tới đứng ở **đường của tướng đó** đến hết lượt, gây {10 + 20% AD + 20% AP} sát thương vật lý cho tướng đó."
            },
            targets: ({ state, unit }) => enemyIdsAround(state,
                unit),
            boosts: [{
                condition: C.targetRow("back"), desc: "phân thân đứng sau lưng: tướng đó bị **Buốt 1 vòng**", extra: ({ target }) => [status(target,
                    "chill",
                    1)]
            }],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                return t ? [setStackFx(unit,
                    SH,
                    t.lane + 1),
                ...mixed(unit,
                    t,
                    "Phân Thân Bóng Tối",
                    {
                        physical: 10 + 0.2 * atkOf(unit), magic: 0.2 * apOf(unit)
                    })] : []
            },
        },
        {
            def: {
                id: "zed_e", key: "E", name: "Đường Kiếm Bóng Tối", mana: 15, cooldown: 2, target: "none",
                desc: "Không chọn: **cột dọc** (cả đường) của Zed và **cột dọc** của phân thân. Gây {10 + 30% AD + 30% AP} sát thương vật lý cho mọi tướng địch trong vùng, rồi khiến các tướng đó bị Buốt 1 vòng."
            },
            boosts: [{
                condition: C.all(shadowOut,
                    shadowStacked), desc: "hai lưỡi kiếm chồng lên nhau: gây thêm 25% sát thương", mult: 1.25
            }],
            resolve: ({ state, unit }) => {
                const lanes = [...new Set([unit.lane,
                    shadowLane(unit)].filter((l) => l >= 0))]
                return lanes.flatMap((l) => laneEnemies(state,
                    other(unit.owner),
                    l)).flatMap((x) =>
                    [...mixed(unit,
                        x,
                        "Đường Kiếm Bóng Tối",
                        {
                            physical: 10 + 0.3 * atkOf(unit), magic: 0.3 * apOf(unit)
                        }),
                    status(x,
                        "chill",
                        1)])
            },
        },
        {
            def: {
                id: "zed_r", key: "R", name: "Dấu Ấn Tử Thần", mana: 40, cooldown: 4, target: "enemyAny",
                desc: "Chọn 1 tướng địch ở 3 đường quanh mình hoặc 3 đường quanh phân thân. Gây {15 + 30% AD + 30% AP} sát thương vật lý, đánh dấu tướng đó rồi Zed **hóa ẩn**. Đầu lượt sau của Zed, dấu nổ gây **15% sát thương Zed đã gây lên tướng đó** cộng {20% AP} **Sát thương chuẩn** (30% nếu tướng đó dưới 30% máu)."
            },
            targets: ({ state, unit }) => reach(state,
                unit),
            boosts: [{
                condition: C.targetNoAllyNear, desc: "tướng đó đứng lẻ: gây thêm 25% sát thương", mult: 1.25
            }],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                return t ? [setStackFx(t,
                    MARK,
                    1),
                ...mixed(unit,
                    t,
                    "Dấu Ấn Tử Thần",
                    {
                        physical: 15 + 0.3 * atkOf(unit), magic: 0.3 * apOf(unit)
                    }),
                {
                    type: "hide", unitId: unit.id
                }] : []
            },
        },
    ],
})
