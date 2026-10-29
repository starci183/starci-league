// Katarina (thiết kế lại 10/2026): ác kiếm ĐẠO TẶC. Dao găm cướp bùa (bùa rừng, bùa từ bài) và Cường Hoá của địch sang mình,
// Ám Sát cướp Nộ/Mana; càng mang nhiều chiến lợi phẩm càng đau. Khắc đội dựa vào bùa và Cường Hoá.
// Center: AP (Luden, Rabadon, Ác Ý) · Counter: đội ôm bùa/Cường Hoá (Baron, Bùa Đỏ/Xanh, Thuốc, Jinx/Aatrox/Ahri R) · Dị: AD đánh thường (W + Tốc đánh).
import {
    apOf, atkOf, mixed, status
} from "../helpers"
import type {
    StatusId
} from "../cards"
import {
    allBuffs
} from "../deck/registry"
import * as C from "../items/conditions"
import type {
    ICondition
} from "../items/types"
import {
    defineHero
} from "../registry"
import type {
    Effect, HeroCtx, ISkillBoost, UnitLike
} from "../types"
import {
    enemiesAroundTarget, enemyIdsAround, setStackFx, targetOf
} from "./kit"

/** Cường Hoá cướp được (trạng thái có lợi) */
const BOONS: StatusId[] = ["empower",
    "focus",
    "barrage",
    "guard",
    "unstoppable"]
/** Bùa cướp được: mọi buff có hạn trừ bùa xấu */
const buffIds = () => allBuffs().map((b) => b.id).filter((id) => id !== "exhaust")
type Loot = { kind: "status"; id: StatusId; turns: number } | { kind: "buff"; id: string; turns: number };
/** Chiến lợi phẩm đang có trên tướng (bùa + Cường Hoá), lâu nhất trước */
function lootOf(u: UnitLike): Loot[] {
    const out: Loot[] = [
        ...BOONS.map((id) => ({
            kind: "status" as const, id, turns: u.statuses?.get(id) ?? 0
        })),
        ...buffIds().map((id) => ({
            kind: "buff" as const, id, turns: u.stacks?.get(`buff:${id}`) ?? 0
        })),
    ]
    return out.filter((l) => l.turns > 0).sort((a, b) => b.turns - a.turns)
}
/** Cướp `n` món: mục tiêu mất, Katarina nhận (tối đa 2 vòng) */
function steal(kat: UnitLike, t: UnitLike, n = 1): Effect[] {
    return lootOf(t).slice(0,
        n).flatMap((l): Effect[] => l.kind === "status"
        ? [{
            type: "dispel", unitId: t.id, statuses: [l.id]
        },
        status(kat,
            l.id,
            Math.min(2,
                l.turns))]
        : [setStackFx(t,
            `buff:${l.id}`,
            0),
        {
            type: "buff", unitId: kat.id, buffId: l.id, turns: Math.min(2,
                l.turns)
        }])
}
/** Cướp Nộ/Mana của tướng: mục tiêu mất, Katarina nhận */
const drain = (kat: UnitLike, t: UnitLike, n: number): Effect[] =>
    [{
        type: "heroMana", unitId: t.id, amount: -n
    },
    {
        type: "heroMana", unitId: kat.id, amount: Math.min(n,
            t.mana)
    }]

const hasLoot: ICondition = {
    kind: "katTargetLoot", desc: "mục tiêu đang có bùa hoặc Cường Hoá", test: (c) => !!c.target && lootOf(c.target).length > 0
}
const selfLoot: ICondition = {
    kind: "katSelfLoot", desc: "Katarina đang mang bùa hoặc Cường Hoá", test: (c) => lootOf(c.self).length > 0
}
/** W không gây sát thương: điều kiện tự kiểm trong resolve, boost chỉ để hiện dòng mô tả */
const W_LOOT: ISkillBoost = {
    condition: selfLoot, desc: "Katarina còn nhận **Không Cản Phá** 1 vòng"
}
const met = (b: ISkillBoost, { state, unit }: HeroCtx) => b.condition.test({
    state, self: unit, preview: true
})

export default defineHero({
    id: "katarina", name: "Katarina", role: "assassin", armor: 28, mr: 30, resource: "rage",
    atk: 74, ap: 0, hp: 770,
    desc: "Ác kiếm đạo tặc. Dao găm cướp bùa và Cường Hoá của địch, Ám Sát cướp Nộ/Mana; mang càng nhiều chiến lợi phẩm càng đau.",
    strength: "Cướp sức mạnh: mỗi bùa/Cường Hoá cướp được vừa làm địch yếu đi vừa cho Katarina +10% sát thương",
    concept: "Chiến lợi phẩm: bùa rừng, thuốc từ bài, Cường Hoá của chiêu R đều cướp được; hạ gục là vét sạch",
    counter: "Đội dựa vào bùa và Cường Hoá: Baron, Bùa Đỏ/Xanh, thuốc từ bài, tướng tự Cường Hoá (Jinx, Aatrox, Ahri, Darius)",
    passive: {
        name: "Tham Lam", desc: "Mỗi bùa hoặc Cường Hoá Katarina đang mang: Katarina gây **thêm 10% sát thương** (tối đa 30%). Khi Katarina hạ gục một tướng: **cướp mọi bùa và Cường Hoá** của tướng đó và hoàn 25 Nộ."
    },
    onKill: ({ unit, victim }) => [...steal(unit,
        victim,
        9),
    {
        type: "heroMana", unitId: unit.id, amount: 25
    }],
    props: [
        {
            name: "Tham Lam", desc: "Mỗi bùa/Cường Hoá đang mang: +10% sát thương (tối đa 30%).", condition: selfLoot,
            damageMult: (c) => 1 + 0.1 * Math.min(3,
                lootOf(c.self).length)
        },
        {
            name: "Lẩn Bước", desc: "Sau W: đòn đánh thêm sát thương lai.", condition: C.all(C.isAttack,
                C.flagOn("t:kat_w",
                    "vừa tung W")),
            onAttack: (c) => (c.target ? mixed(c.self,
                c.target,
                "Lẩn Bước",
                {
                    physical: 0.2 * atkOf(c.self), magic: 15 + 0.3 * apOf(c.self)
                }) : [])
        },
    ],
    skills: [
        {
            def: {
                id: "katarina_q", key: "Q", name: "Phi Dao", mana: 15, cooldown: 1, target: "enemyAny",
                desc: "Chọn 1 tướng địch ở 3 đường quanh mình. Gây {30 + 20% AD + 40% AP} sát thương phép cho tướng đó."
            },
            targets: ({ state, unit }) => enemyIdsAround(state,
                unit),
            boosts: [
                {
                    condition: hasLoot, desc: "dao găm **cướp 1 bùa hoặc Cường Hoá** (lâu nhất) của tướng đó sang Katarina (tối đa 2 vòng)",
                    extra: ({ unit, target }) => steal(unit,
                        target,
                        1)
                },
                {
                    condition: C.targetHpBelow(0.5), desc: "gây thêm 15% sát thương", mult: 1.15
                },
            ],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                return t ? mixed(unit,
                    t,
                    "Phi Dao",
                    {
                        physical: 0.2 * atkOf(unit), magic: 30 + 0.4 * apOf(unit)
                    }) : []
            },
        },
        {
            def: {
                id: "katarina_w", key: "W", name: "Lẩn Bước", mana: 15, cooldown: 2, target: "none",
                desc: "Bản thân. Katarina **đi thêm 1 ô** lượt này. Lượt này, đòn đánh của Katarina gây thêm {15 + 20% AD + 30% AP} sát thương phép."
            },
            boosts: [W_LOOT],
            resolve: (ctx) => [setStackFx(ctx.unit,
                "t:kat_w",
                1),
            {
                type: "freeMove", unitId: ctx.unit.id
            },
            ...(met(W_LOOT,
                ctx) ? [status(ctx.unit,
                    "unstoppable",
                    1)] : [])],
        },
        {
            def: {
                id: "katarina_e", key: "E", name: "Ám Sát", mana: 15, cooldown: 2, target: "enemyAny",
                desc: "Chọn 1 tướng địch ở 3 đường quanh mình. Gây {45 + 30% AD + 40% AP} sát thương phép cho tướng đó và **cướp 15 Nộ/Mana** của tướng đó."
            },
            targets: ({ state, unit }) => enemyIdsAround(state,
                unit),
            boosts: [
                {
                    condition: hasLoot, desc: "gây thêm 30% sát thương và **cướp mọi bùa và Cường Hoá** của tướng đó", mult: 1.3,
                    extra: ({ unit, target }) => steal(unit,
                        target,
                        9)
                },
                {
                    condition: C.targetHpBelow(0.4), desc: "gây thêm 20% sát thương", mult: 1.2
                },
            ],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                return t ? [...mixed(unit,
                    t,
                    "Ám Sát",
                    {
                        physical: 20 + 0.3 * atkOf(unit), magic: 25 + 0.4 * apOf(unit)
                    }),
                ...drain(unit,
                    t,
                    15)] : []
            },
        },
        {
            def: {
                id: "katarina_r", key: "R", name: "Vũ Điệu Đạo Tặc", mana: 45, cooldown: 4, target: "enemyAny",
                desc: "Chọn 1 tướng địch ở 3 đường quanh mình (tâm **vùng 3×3**). Katarina lướt vào giữa và ném dao 3 lần vào mọi tướng địch trong **vùng 3×3** quanh tướng đó, mỗi lần gây {10 + 15% AD + 12% AP} sát thương phép; mỗi tướng trúng chiêu bị **cướp 10 Nộ/Mana**."
            },
            targets: ({ state, unit }) => enemyIdsAround(state,
                unit),
            boosts: [
                {
                    condition: hasLoot, desc: "cướp 1 bùa hoặc Cường Hoá của tướng đó", extra: ({ unit, target }) => steal(unit,
                        target,
                        1)
                },
                {
                    condition: C.targetHpBelow(0.4), desc: "gây thêm 20% sát thương", mult: 1.2
                },
            ],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                return t ? enemiesAroundTarget(state,
                    t,
                    "3x3").flatMap((x): Effect[] =>
                    [...[0,
                        1,
                        2].flatMap(() => mixed(unit,
                        x,
                        "Vũ Điệu Đạo Tặc",
                        {
                            physical: 0.15 * atkOf(unit), magic: 10 + 0.12 * apOf(unit)
                        })),
                    ...drain(unit,
                        x,
                        10)]) : []
            },
        },
    ],
})
