// Blitzcrank: đỡ đòn bắt lẻ. Móc tướng hậu tuyến (cả đường kề) lên trước, đấm hất, Trường Điện Từ phá khiên và hút Mana.
// Center: lên Mana/máu, móc carry cho cả đội dọn · Counter: khắc đội khiên (Janna/Lux/Braum) bằng phá khiên + hút Mana · Dị: lên AD/tốc đánh.
import {
    apOf, atkOf, bonusHpOf, frontMost, isDisabled, laneEnemies, mixed, other, status, visible, unitAt
} from "../helpers"
import * as C from "../items/conditions"
import {
    defineHero
} from "../registry"
import type {
    Effect, UnitLike
} from "../types"
import {
    displaceFx, lanesAround, pushBlocked, shieldFx, targetOf
} from "./kit"

/** Tướng địch hậu tuyến (không có thì hàng giữa) ở đường này và 2 đường kề */
const hookable = (state: Parameters<typeof frontMost>[0], u: UnitLike) => lanesAround(u)
    .map((l) => visible(unitAt(state,
        other(u.owner),
        l,
        "back")) ?? visible(unitAt(state,
        other(u.owner),
        l,
        "mid")))
    .filter((x): x is UnitLike => !!x).map((x) => x.id)

export default defineHero({
    id: "blitzcrank", name: "Blitzcrank", role: "tank", armor: 36, mr: 34,
    atk: 68, ap: 0, hp: 960,
    desc: "Người máy hơi nước. Móc carry địch từ hậu tuyến (kể cả đường bên) ra trước, đấm hất, phá khiên cả đường.",
    strength: "Bắt lẻ: kéo tướng hậu tuyến ra khỏi chỗ núp, đổi chỗ với tank của chúng",
    concept: "Kéo hậu tuyến: carry địch bị lôi lên trước, cả đội dồn vào; Trường Điện Từ phá khiên và hút Mana",
    counter: "Đội nhiều khiên: Trường Điện Từ phá khiên cả đường và gây thêm 30% lên tướng đang có khiên",
    passive: {
        name: "Lá Chắn Năng Lượng", desc: "**Lần đầu** Blitzcrank xuống dưới 30% máu: Blitzcrank nhận Khiên {80 + 10% máu tối đa + 60% AP}."
    },
    props: [
        {
            name: "Lá Chắn Năng Lượng", desc: "Lần đầu dưới 30% máu: khiên 80 + 10% máu tối đa + 60% AP.", condition: C.selfHpBelow(0.3), once: true,
            onDamaged: (c) => [shieldFx(c.self,
                80 + c.self.maxHp * 0.1 + 0.6 * apOf(c.self))]
        },
        {
            name: "Tăng Tốc", desc: "Khi Cường Hoá: +50% Tốc đánh.", condition: C.selfHas("empower"), stats: {
                extraAtk: 0.5
            }
        },
        {
            name: "Nắm Đấm Hơi Nước", desc: "Khi Cường Hoá: đòn đánh thêm sát thương; mục tiêu bị khống chế chịu thêm 50%.",
            condition: C.all(C.isAttack,
                C.selfHas("empower")),
            onAttack: (c) => {
                if (!c.target) return []
                const m = isDisabled(c.target) ? 1.5 : 1, u = c.self
                return mixed(u,
                    c.target,
                    "Tăng Tốc",
                    {
                        physical: (10 + 0.15 * atkOf(u)) * m, magic: 0.2 * apOf(u) * m
                    })
            }
        },
    ],
    skills: [
        {
            def: {
                id: "blitzcrank_q", key: "Q", name: "Bàn Tay Hỏa Tiễn", mana: 25, cooldown: 3, target: "enemyAny",
                desc: "Chọn 1 tướng địch đứng **hậu tuyến** (đường đó không có thì hàng giữa) ở 3 đường quanh mình. Gây {40 + 30% AD + 40% AP + 5% máu cộng thêm} sát thương phép cho tướng đó, rồi kéo tướng đó: cùng đường thì lên **1 hàng** (đổi chỗ với tướng đứng trước), đường kề thì **sang đường của Blitzcrank** (nếu ô đó trống)."
            },
            targets: ({ state, unit }) => hookable(state,
                unit),
            boosts: [
                {
                    condition: C.targetIsCarry, desc: "tướng đó còn bị Choáng 1 vòng", extra: ({ target }) => [status(target,
                        "stun",
                        1)]
                },
                {
                    condition: C.targetNoAllyNear, desc: "bắt lẻ, gây thêm 30% sát thương", mult: 1.3
                },
            ],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                if (!t) return []
                const dl = Math.sign(unit.lane - t.lane)
                const move: Effect[] = dl === 0 ? [{
                    type: "pull", unitId: t.id
                }] : pushBlocked(state,
                    t,
                    0,
                    dl) ? [] : [displaceFx(t,
                        0,
                        dl)]
                return [...mixed(unit,
                    t,
                    "Bàn Tay Hỏa Tiễn",
                    {
                        physical: 0.3 * atkOf(unit), magic: 40 + 0.4 * apOf(unit) + 0.05 * bonusHpOf(unit)
                    }),
                ...move]
            },
        },
        {
            def: {
                id: "blitzcrank_w", key: "W", name: "Tăng Tốc", mana: 15, cooldown: 2, target: "none",
                desc: "Bản thân: Blitzcrank được Cường Hoá 2 vòng: **+50% Tốc đánh**, và mỗi đòn đánh gây thêm {10 + 15% AD + 20% AP} sát thương phép."
            },
            boosts: [{
                condition: C.targetControlled, desc: "đòn đánh lên mục tiêu đang bị khống chế gây thêm 50% sát thương thêm đó"
            }],
            resolve: ({ unit }) => [status(unit,
                "empower",
                2)],
        },
        {
            def: {
                id: "blitzcrank_e", key: "E", name: "Đấm Móc", mana: 20, cooldown: 2, target: "none",
                desc: "Không chọn: tướng địch đứng đầu đường này nhận {10 + 60% AD + 25% AP} sát thương phép, rồi bị **Choáng 1 vòng**."
            },
            boosts: [{
                condition: C.targetIsCarry, desc: "gây thêm 30% sát thương", mult: 1.3
            }],
            resolve: ({ state, unit }) => {
                const t = frontMost(state,
                    other(unit.owner),
                    unit.lane)
                return t ? [...mixed(unit,
                    t,
                    "Đấm Móc",
                    {
                        physical: 10 + 0.6 * atkOf(unit), magic: 0.25 * apOf(unit)
                    }),
                status(t,
                    "stun",
                    1)] : []
            },
        },
        {
            def: {
                id: "blitzcrank_r", key: "R", name: "Trường Điện Từ", mana: 50, cooldown: 4, target: "none",
                desc: "Không chọn: mọi tướng địch trong **cột dọc** của đường này (cả 3 hàng) bị **phá hủy Khiên**, rồi nhận {70 + 25% AD + 40% AP} sát thương phép; mỗi tướng trúng chiêu **mất 20 Mana**."
            },
            boosts: [
                {
                    condition: C.targetHasShield, desc: "gây thêm 30% sát thương lên tướng đó", mult: 1.3
                },
                {
                    condition: C.targetRole("support",
                        "mage"), desc: "tướng đó mất thêm 20 Mana", extra: ({ target }) => [{
                        type: "heroMana", unitId: target.id, amount: -20
                    }]
                },
            ],
            resolve: ({ state, unit }) =>
                laneEnemies(state,
                    other(unit.owner),
                    unit.lane).flatMap((x): Effect[] => [{
                    type: "breakShield", unitId: x.id
                },
                ...mixed(unit,
                    x,
                    "Trường Điện Từ",
                    {
                        physical: 0.25 * atkOf(unit), magic: 70 + 0.4 * apOf(unit)
                    }),
                {
                    type: "heroMana", unitId: x.id, amount: -20
                }]),
        },
    ],
})
