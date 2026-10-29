// Aatrox (thiết kế lại 10/2026): quỷ kiếm XÍCH LINH HỒN. Xích nối 2 tướng địch: đánh một đứa thì đứa kia chịu 40%;
// kẻ bảo kê (trợ thủ/đỡ đòn) bị xích thì người nó che bị Choáng. R giật xích. Hút máu mọi nguồn để đứng giữa giao tranh.
// Center: đấu sĩ AD trâu (Sterak, Titan, Bầu Trời) · Counter: cặp bảo kê trợ thủ/đỡ đòn + carry · Dị: AP hút máu (Liandry, Súng Hextech).
import {
    rowIndex
} from "../cards"
import {
    adjacent, apOf, atkOf, bonusHpOf, distance, mixed, other, status, unitsOf
} from "../helpers"
import * as C from "../items/conditions"
import type {
    ICondition, PropCtx
} from "../items/types"
import {
    defineHero
} from "../registry"
import type {
    Effect, HeroCtx, ISkillBoost, StateLike, UnitLike
} from "../types"
import {
    displaceFx, enemyIdsAround, healFx, setStackFx, shieldFx, targetOf
} from "./kit"

/** Dấu xích = lượt nối xích (state.turn); hai tướng cùng dấu là một cặp. Xích còn tới hết lượt sau của Aatrox. */
const LINK = "aatrox_link"
const linkTurn = (u: UnitLike) => u.stacks?.get(LINK) ?? 0
const isLinked = (state: StateLike | undefined, u: UnitLike) => !!state && linkTurn(u) > 0 && state.turn - linkTurn(u) <= 2
/** Tướng bị xích cùng `u` */
function partnerOf(state: StateLike, u: UnitLike) {
    if (!isLinked(state,
        u)) return undefined
    let p: UnitLike | undefined
    state.units.forEach((x) => { if (x.id !== u.id && x.owner === u.owner && x.lane >= 0 && linkTurn(x) === linkTurn(u)) p = x })
    return p
}
/** Tướng địch đứng gần `t` nhất (ưu tiên đứng kề) để nối xích cùng */
const nearestMate = (state: StateLike, t: UnitLike) =>
    unitsOf(state,
        t.owner).filter((x) => x.id !== t.id && x.lane >= 0 && !x.hidden).sort((a, b) => distance(t,
        a) - distance(t,
        b) || a.hp - b.hp)[0]
const guardian = (u?: UnitLike) => !!u && C.targetRole("support",
    "tank").test({
    self: u, target: u, preview: true
})

const linked: ICondition = {
    kind: "aatroxLinked", desc: "mục tiêu đang bị xích", test: (c) => !!c.target && isLinked(c.state,
        c.target)
}
const guardRole = C.targetRole("support",
    "tank")
const chainTaut: ICondition = {
    kind: "aatroxChainTaut", desc: "hai tướng bị xích không đứng kề nhau",
    test: (c) => { const m = c.state && c.target ? nearestMate(c.state,
        c.target) : undefined; return !!m && !adjacent(m,
c.target!) }
}
const anyLinked: ICondition = {
    kind: "aatroxAnyLinked", desc: "có tướng địch đang bị xích",
    test: (c) => !!c.state && unitsOf(c.state,
        other(c.self.owner)).some((x) => x.lane >= 0 && isLinked(c.state,
        x))
}

/** Nội tại Xích Linh Hồn: sát thương lên tướng bị xích truyền 40% sang tướng bị xích còn lại */
const relay = (c: PropCtx): Effect[] => {
    if (!c.state) return []
    const out: Effect[] = []
    for (const f of c.effects ?? []) {
        if (f.type !== "damage" || f.target.kind !== "unit" || f.label === "Xích Linh Hồn") continue
        const t = c.state.units.get(f.target.id)
        if (!t || t.owner === c.self.owner) continue
        const p = partnerOf(c.state,
            t)
        if (p) out.push({
            type: "damage", target: {
                kind: "unit", id: p.id
            }, amount: Math.round(f.amount * 0.4), label: "Xích Linh Hồn", src: c.self.id, tag: f.tag, ...(f.kind ? {
                kind: f.kind
            } : {
            })
        })
    }
    return out
}

const E_LINK: ISkillBoost = {
    condition: anyLinked, desc: "Khiên tăng 50%"
}
const met = (b: ISkillBoost, { state, unit }: HeroCtx) => b.condition.test({
    state, self: unit, preview: true
})

export default defineHero({
    id: "aatrox", name: "Aatrox", role: "fighter", armor: 34, mr: 32, resource: "rage",
    atk: 70, ap: 0, hp: 900,
    desc: "Quỷ kiếm Darkin. Xích linh hồn nối hai tướng địch: chém một đứa, đứa kia cũng chảy máu; kẻ bảo kê bị xích thì người nó che bị Choáng.",
    strength: "Giao tranh kéo dài: hút máu mọi nguồn, mỗi nhát chém trúng cặp bị xích là hai nhát, R giật xích hồi máu",
    concept: "Xích Linh Hồn: chọn ai để xích với ai; xích căng (hai tướng không đứng kề) thì kéo chúng lại gần nhau",
    counter: "Cặp bảo kê (trợ thủ/đỡ đòn đi kèm carry): xích nối kẻ che với người được che, đánh tank là carry cũng mất máu và bị Choáng",
    passive: {
        name: "Xích Linh Hồn", desc: "Aatrox **hút máu 10% mọi nguồn**. Khi Aatrox gây sát thương lên một tướng **bị xích**, tướng bị xích còn lại chịu **40%** lượng đó."
    },
    props: [
        {
            name: "Xích Linh Hồn", desc: "Hút máu 10% mọi nguồn; sát thương lên tướng bị xích truyền 40% sang tướng bị xích còn lại.", stats: {
                omnivamp: 0.1
            },
            onAttack: relay, onSkill: relay
        },
        {
            name: "Bộ Pháp Hắc Ám", desc: "Sau E: đòn đánh +25%.", condition: C.all(C.isAttack,
                C.flagOn("t:aatrox_e",
                    "vừa lướt E")), damageMult: () => 1.25
        },
        {
            name: "Chiến Binh Tận Thế", desc: "Cường Hoá (R): +20% AD, +20 AP, hút máu thêm 10%.", condition: C.selfHas("empower"), stats: {
                atkMult: 0.2, ap: 20, omnivamp: 0.1
            }
        },
    ],
    skills: [
        {
            def: {
                id: "aatrox_q", key: "Q", name: "Quỷ Kiếm Darkin", mana: 25, cooldown: 2, target: "enemyAny",
                desc: "Chọn 1 tướng địch ở 3 đường quanh mình. Gây {35 + 80% AD + 30% AP + 6% máu cộng thêm} sát thương vật lý cho tướng đó."
            },
            targets: ({ state, unit }) => enemyIdsAround(state,
                unit),
            boosts: [
                {
                    condition: linked, desc: "chém trúng xích: gây thêm 25% sát thương", mult: 1.25
                },
                {
                    condition: C.all(linked,
                        guardRole), desc: "kẻ bảo kê bị chém: tướng bị xích cùng nó bị **Choáng** 1 vòng",
                    extra: ({ state, target }) => { const p = partnerOf(state,
                        target); return p ? [status(p,
                        "stun",
                        1)] : [] }
                },
            ],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                return t ? mixed(unit,
                    t,
                    "Quỷ Kiếm Darkin",
                    {
                        physical: 35 + 0.8 * atkOf(unit) + 0.06 * bonusHpOf(unit), magic: 0.3 * apOf(unit)
                    }) : []
            },
        },
        {
            def: {
                id: "aatrox_w", key: "W", name: "Xích Linh Hồn", mana: 20, cooldown: 3, target: "enemyAny",
                desc: "Chọn 1 tướng địch ở 3 đường quanh mình. Xích linh hồn nối tướng đó với **tướng địch đứng gần nó nhất** (ưu tiên đứng kề) tới hết lượt sau của Aatrox. Gây {25 + 50% AD + 30% AP} sát thương vật lý cho cả hai và gây Buốt 1 vòng."
            },
            targets: ({ state, unit }) => enemyIdsAround(state,
                unit),
            boosts: [
                {
                    condition: guardRole, desc: "xích bảo kê: tướng bị nối cùng tướng đó bị **Choáng** 1 vòng"
                },
                {
                    condition: chainTaut, desc: "xích căng: kéo tướng bị nối cùng 1 ô về phía tướng đó"
                },
            ],
            resolve: ({ state, unit, targetId }) => {
                const t = targetOf(state,
                    targetId)
                if (!t) return []
                const m = nearestMate(state,
                    t)
                const pair = m ? [t,
                    m] : [t]
                const fx: Effect[] = pair.flatMap((x): Effect[] => [...mixed(unit,
                    x,
                    "Xích Linh Hồn (W)",
                    {
                        physical: 25 + 0.5 * atkOf(unit), magic: 0.3 * apOf(unit)
                    }),
                status(x,
                    "chill",
                    1),
                setStackFx(x,
                    LINK,
                    state.turn)])
                if (m) {
                    if (guardian(t)) fx.push(status(m,
                        "stun",
                        1))
                    if (guardian(m)) fx.push(status(t,
                        "stun",
                        1))
                    if (!adjacent(t,
                        m)) {
                        const dl = Math.sign(t.lane - m.lane), dr = dl ? 0 : Math.sign(rowIndex(t.row) - rowIndex(m.row))
                        fx.push(displaceFx(m,
                            dr,
                            dl))
                    }
                }
                return fx
            },
        },
        {
            def: {
                id: "aatrox_e", key: "E", name: "Bộ Pháp Hắc Ám", mana: 15, cooldown: 2, target: "none",
                desc: "Bản thân. Aatrox **đi thêm 1 ô** lượt này và nhận Khiên {30 + 30% AD + 30% AP + 10% máu cộng thêm}. Lượt này, đòn đánh của Aatrox gây **thêm 25% sát thương**."
            },
            boosts: [E_LINK],
            resolve: (ctx) => {
                const u = ctx.unit, amount = (30 + 0.3 * atkOf(u) + 0.3 * apOf(u) + 0.1 * bonusHpOf(u)) * (met(E_LINK,
                    ctx) ? 1.5 : 1)
                return [shieldFx(u,
                    amount),
                setStackFx(u,
                    "t:aatrox_e",
                    1),
                {
                    type: "freeMove", unitId: u.id
                }]
            },
        },
        {
            def: {
                id: "aatrox_r", key: "R", name: "Chiến Binh Tận Thế", mana: 65, cooldown: 4, target: "none",
                desc: "Bản thân. Aatrox nhận Cường Hoá 3 vòng: **+20% AD, +20 AP** và hút máu thêm 10%, rồi **giật xích**: mọi tướng địch đang bị xích nhận {30 + 50% AD + 30% AP + 6% máu cộng thêm} sát thương vật lý, xích được nối lại tới hết lượt sau của Aatrox; Aatrox hồi {5% máu tối đa} máu cho mỗi tướng trúng."
            },
            boosts: [{
                condition: C.targetHpBelow(0.4), desc: "gây thêm 25% sát thương lên tướng đó", mult: 1.25
            }],
            resolve: ({ state, unit }) => {
                const chained = unitsOf(state,
                    other(unit.owner)).filter((x) => x.lane >= 0 && isLinked(state,
                    x))
                return [status(unit,
                    "empower",
                    3),
                ...chained.flatMap((x): Effect[] => [...mixed(unit,
                    x,
                    "Giật Xích",
                    {
                        physical: 30 + 0.5 * atkOf(unit) + 0.06 * bonusHpOf(unit), magic: 0.3 * apOf(unit)
                    }),
                setStackFx(x,
                    LINK,
                    state.turn),
                healFx(unit,
                    0.05 * unit.maxHp)])]
            },
        },
    ],
})
