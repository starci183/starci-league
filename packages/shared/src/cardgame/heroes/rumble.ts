// Rumble (Pháp sư, phép): phế liệu. Mọi con số nằm trong balance/heroes/rumble.json (docs/heroes/KITS.md).
// Nội tại Tái Chế (nút hành động, Main, một lần mỗi lượt): vứt 1 lá chiêu của ĐỒNG MINH KHÁC trên tay (args.discard) để lấy 1
// lá chiêu trong mộ phe mình (args.pick = uid lá mộ). Vứt Q/E thì lấy Q hoặc E; vứt R thì lấy R, Q hoặc E. Lá lấy lên tay thành
// Lá Tái Chế (card.id = id lá gốc, data.recycled = tướng gốc): engine tung bằng chiêu gốc với Rumble làm người dùng, AD đổi sang
// AP theo apPerAd, không áp khống chế, giảm manaOff mana, dùng xong biến mất.
import {
    kit, actorOrEnemy, when
} from "../balance"
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    Card, PlayArgs, Side, SkillKey, Unit
} from "../types"
import {
    otherSide
} from "../types"

const k = kit("rumble"), {
    p
} = k
const F_Q = k.x("q1 + q2·AP"), EN_Q = k.xe("q1 + q2·AP")
const F_E = k.x("e1 + e2·AP"), EN_E = k.xe("e1 + e2·AP")
const F_SH = k.x("e3 + e4·AP"), EN_SH = k.xe("e3 + e4·AP")
const F_R = k.x("r1 + r2·AP"), EN_R = k.xe("r1 + r2·AP")
export const RECYCLE = "rumble_recycle"

const keyOf = (c: Card) => c.id.slice(-1).toUpperCase() as SkillKey
/** Lá chiêu thật của một tướng (không phải Bóng, không phải lá tạm) */
const realSkill = (c: Card) => c.kind === "skill" && !c.copyOf && !c.temp && !!c.hero && !c.data?.recycled

/** Các cặp (lá vứt, lá mộ) hợp lệ: vứt Q/E lấy Q/E; vứt R lấy R/Q/E. Gộp theo id lá để danh sách gọn */
function recycleOptions(g: Game, me: Unit): PlayArgs[] {
    if (!g.canAct(me) || me.stacks[`once:${RECYCLE}`] === g.s.turnNo) return []
    const pl = g.player(me.side)
    const seenHand = new Set<string>()
    const discards = pl.hand.filter((c) => realSkill(c) && c.hero !== me.hero && !c.frozen && !seenHand.has(c.id) && !!seenHand.add(c.id))
    const seenGrave = new Set<string>()
    const grave = pl.grave.filter((c) => realSkill(c) && !seenGrave.has(c.id) && !!seenGrave.add(c.id))
    const out: PlayArgs[] = []
    for (const d of discards) {
        const allowR = keyOf(d) === "R"
        for (const c of grave) if (allowR || keyOf(c) !== "R") out.push({
            discard: [d.uid], pick: c.uid
        })
    }
    return out
}

export default defineHero({
    id: "rumble", name: "Rumble", role: "mage", damage: "magic", ...k.base,
    desc: "Tái chế phế liệu: mỗi lượt vứt một lá chiêu của đồng minh để lấy một lá chiêu trong mộ, tung lại như của mình. Q phun lửa ba đường, E Khiên Phế Liệu Quick, R mưa tên lửa cả bàn.",
    passive: {
        name: "Tái Chế",
        desc: `Nút hành động, một lần mỗi lượt: vứt 1 lá chiêu của đồng minh khác trên tay để lấy 1 lá chiêu trong mộ phe mình. Vứt Q hoặc E: lấy Q hoặc E. Vứt R: lấy R, Q hoặc E. Lá lấy lên tay thành Lá Tái Chế: Rumble dùng như chiêu của mình, không áp khống chế, AD đổi sang AP (${p.p2} AP = 1 AD), giảm ${p.p1} mana, tồn tại tới hết lượt đối phương, dùng xong biến mất.`,
    },
    abilities: [{
        id: RECYCLE, name: "Tái Chế", nameEn: "Recycle",
        desc: "Nội tại · Tái Chế. Một lần mỗi lượt: vứt 1 lá chiêu đồng minh khác, lấy 1 lá chiêu trong mộ (vứt R thì lấy được cả R).",
        descEn: "Passive · Recycle. Once per turn: discard 1 skill card of another ally, take 1 skill card from the graveyard (discarding R lets you take R too).",
        options: recycleOptions,
        resolve(g, me, args) {
            const d = args.discard?.[0]
            const pl = g.player(me.side)
            const gi = pl.grave.findIndex((c) => c.uid === args.pick)
            if (!d || gi < 0 || !g.oncePerTurn(me,
                RECYCLE)) return
            const orig = pl.grave.splice(gi,
                1)[0]
            g.discard(me.side,
                d,
                "rumble_recycle")
            const base = g.tempSkillCard(me.hero,
                me.side,
                keyOf(orig),
                {
                    recycled: orig.hero ?? orig.id.split("_")[0], apPerAd: p.p2, manaOff: p.p1
                })
            g.giveCard(me.side,
                {
                    ...base, id: orig.id
                },
                "hand")
        },
    }],
    skills: {
        Q: {
            key: "Q", name: "Súng Phun Lửa", target: "none", mana: p.q0,
            desc: `Tướng địch đối diện và 2 đường kề nhận {${F_Q}} sát thương phép.`,
            canPlay: (c) => lanesHit(c.g,
                c.self).length > 0,
            resolve(c) {
                const raw = c.f(F_Q)
                for (const t of lanesHit(c.g,
                    c.self)) c.g.damage(c.self,
                    t,
                    raw,
                    "magic",
                    {
                        tag: "skill", aoe: true
                    })
            },
        },
        E: {
            key: "E", name: "Khiên Phế Liệu", target: "enemy", mana: p.e0, quick: true, quickWhen: when.targetsSelf, options: actorOrEnemy,
            desc: `Quick: khi địch nhắm đúng Rumble, có thể dùng lá này, mục tiêu là kẻ đó. Chọn 1 tướng địch: {${F_E}} sát thương phép, Rumble nhận {${F_SH}} Khiên.`,
            resolve(c) {
                c.g.damage(c.self,
                    c.target!,
                    c.f(F_E),
                    "magic",
                    {
                        tag: "skill"
                    })
                c.g.shield(c.self,
                    c.self,
                    c.f(F_SH))
            },
        },
        R: {
            key: "R", name: "Mưa Tên Lửa", target: "all_enemies", mana: p.r0,
            desc: `Mọi tướng địch nhận {${F_R}} sát thương phép.`,
            resolve(c) {
                const raw = c.f(F_R)
                for (const t of c.g.enemies(c.self)) if (!t.token) c.g.damage(c.self,
                    t,
                    raw,
                    "magic",
                    {
                        tag: "skill", aoe: true
                    })
            },
        },
    },
    en: {
        desc: "Recycling scrap: each turn discard an ally's skill card to take a skill card from the graveyard and cast it as his own. Q flames three lanes, E is a Quick Scrap Shield, R rains rockets on the whole board.",
        passive: {
            name: "Junkyard Recycling",
            desc: `Action button, once per turn: discard 1 skill card of another ally from your hand to take 1 skill card from your side's graveyard. Discard Q or E: take Q or E. Discard R: take R, Q or E. The taken card goes to hand as a Recycled card: Rumble casts it as his own skill, applying no crowd control, with AD converted to AP (${p.p2} AP = 1 AD), costing ${p.p1} less mana, lasting until the end of the opponent's turn and vanishing after use.`,
        },
        skills: {
            Q: {
                name: "Flamespitter",
                desc: `The enemy champion in front and the 2 adjacent lanes take {${EN_Q}} magic damage.`,
            },
            E: {
                name: "Scrap Shield",
                desc: `Quick: when an enemy targets exactly Rumble, you may play this card, and its target is that enemy. Choose 1 enemy champion: {${EN_E}} magic damage, and Rumble gains {${EN_SH}} Shield.`,
            },
            R: {
                name: "The Equalizer",
                desc: `Every enemy champion takes {${EN_R}} magic damage.`,
            },
        },
    },
})

/** Địch đang đứng ở đường đối diện Rumble và 2 đường kề, chọn được */
function lanesHit(g: Game, me: { side: Side; lane: number }) {
    const out = []
    for (const l of [me.lane - 1,
        me.lane,
        me.lane + 1]) {
        const t = l >= 0 && l <= 4 ? g.at(otherSide(me.side),
            l) : undefined
        if (t && !t.token && g.targetable(t)) out.push(t)
    }
    return out
}
