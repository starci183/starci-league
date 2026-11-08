// Rumble (Pháp sư, phép): phế liệu. Mọi con số nằm trong balance/heroes/rumble.json (docs/heroes/KITS.md).
// Tái Chế: khi dùng chiêu, được chọn 1 lá chiêu không phải R trong mộ phe mình. Mỗi lựa chọn là một lá tạm "rumble_pick";
// đánh nó thì lá mộ biến mất và Rumble nhận Lá Tái Chế (card.id = id lá gốc, data.recycled = tướng gốc): engine tung bằng chiêu gốc
// với Rumble làm người dùng, AD đổi từ AP theo apPerAd, không áp khống chế, giảm manaOff mana, dùng xong biến mất.
import {
    kit, actorOrEnemy, when
} from "../balance"
import type {
    Game
} from "../game"
import {
    defineHero, defineSpecialCard
} from "../registry"
import type {
    Card, Side, SkillKey
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
export const PICK = "rumble_pick"

/** Lá chiêu không phải R, chiêu thật của một tướng (không phải lá Bóng): đủ điều kiện Tái Chế */
const recyclable = (c: Card) => c.kind === "skill" && !c.copyOf && !!c.hero && !c.id.endsWith("_r")

/** Gỡ lá chọn khỏi tay (không vào mộ) */
function dropCards(g: Game, side: Side, cards: Card[]) {
    if (!cards.length) return
    const p0 = g.player(side)
    p0.hand = p0.hand.filter((x) => !cards.includes(x))
    for (const card of cards) g.emit({
        t: "tempExpired", side, card
    })
}

/** Phát các lựa chọn Tái Chế (id lá khác nhau, tối đa flag pickOffer); chọn tối đa `left` lá. Trả số lựa chọn. */
export function offerRecycle(g: Game, side: Side, left: number, owner = "rumble"): number {
    const seen = new Set<string>()
    const pool = g.shuffle(g.graveCards(side,
        recyclable).filter((c) => !seen.has(c.id) && !!seen.add(c.id)))
    const picks = pool.slice(0,
        Math.max(0,
            Math.floor(k.num("pickOffer"))))
    const group = `rp${g.s.nextUid++}`
    for (const c of picks) g.createCard(side,
        {
            kind: "special", id: PICK, hero: owner, side, temp: true, until: g.unitsUntil(side,
                1), data: {
                group, uid: c.uid, left
            }
        })
    return picks.length
}

defineSpecialCard({
    id: PICK,
    name: "Tái Chế",
    desc: "Lấy lá chiêu này khỏi mộ, Rumble nhận Lá Tái Chế của nó; hết lượt chọn thì các lá chọn còn lại biến mất. Lá tạm.",
    skill: {
        key: "E", name: "Tái Chế", desc: "Biến lá chiêu trong mộ thành Lá Tái Chế trên tay Rumble.", target: "none", mana: p.e5, uncounterable: true,
        canPlay: (c) => c.g.player(c.side).grave.some((x) => x.uid === String(c.card.data?.uid ?? "")),
        resolve(ctx) {
            const {
                g, side, card
            } = ctx
            const uid = String(card.data?.uid ?? ""), group = String(card.data?.group ?? "")
            const left = Number(card.data?.left ?? 1)
            const grave = g.player(side).grave
            const i = grave.findIndex((x) => x.uid === uid)
            if (i >= 0) {
                const orig = grave.splice(i,
                    1)[0]
                const key = orig.id.slice(-1).toUpperCase() as SkillKey
                const base = g.tempSkillCard(card.hero ?? "rumble", // Sylas đoạt R của Rumble thì lá về chính Sylas
                    side,
                    key,
                    {
                        recycled: orig.hero ?? orig.id.split("_")[0], apPerAd: p.p2, manaOff: p.p1
                    })
                g.giveCard(side,
                    {
                        ...base, id: orig.id
                    },
                    "hand")
            }
            const rest = g.player(side).hand.filter((x) => x.kind === "special" && x.id === PICK && String(x.data?.group) === group && x.uid !== card.uid)
            if (left - 1 <= 0) dropCards(g,
                side,
                rest)
            else for (const x of rest) x.data = {
                ...x.data, left: left - 1
            }
        },
    },
})

export default defineHero({
    id: "rumble", name: "Rumble", role: "mage", damage: "magic", ...k.base,
    desc: "Tái chế phế liệu: mỗi lượt biến một lá chiêu trong mộ thành Lá Tái Chế để tung lại như của mình. Q phun lửa ba đường, E Khiên Phế Liệu Quick, R mưa tên lửa rồi tái chế thêm.",
    passive: {
        name: "Tái Chế",
        desc: `Một lần mỗi lượt: khi Rumble dùng chiêu, chọn 1 lá chiêu không phải R trong mộ phe mình; nó lên tay thành Lá Tái Chế. Rumble dùng lá này như chiêu của mình, hệ số theo AP (${p.p2} AP = 1 AD), không áp khống chế, giảm ${p.p1} mana, tồn tại tới hết lượt đối phương, dùng xong biến mất.`,
    },
    hooks: {
        onCast(g, me, d) {
            if (d.caster.id !== me.id || d.card.kind !== "skill") return
            if (!g.graveCards(me.side,
                recyclable).length || !g.oncePerTurn(me,
                "rumble_recycle")) return
            offerRecycle(g,
                me.side,
                1)
        },
    },
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
            desc: `Mọi tướng địch nhận {${F_R}} sát thương phép. Sau đó chọn tối đa ${p.r4} lá chiêu không phải R trong mộ phe mình thành Lá Tái Chế.`,
            resolve(c) {
                const raw = c.f(F_R)
                for (const t of c.g.enemies(c.self)) if (!t.token) c.g.damage(c.self,
                    t,
                    raw,
                    "magic",
                    {
                        tag: "skill", aoe: true
                    })
                offerRecycle(c.g,
                    c.side,
                    p.r4,
                    c.self.hero)
            },
        },
    },
    en: {
        desc: "Recycling scrap: each turn turn a skill card from the graveyard into a Recycled card and cast it as his own. Q flames three lanes, E is a Quick Scrap Shield, R rains rockets and recycles more.",
        passive: {
            name: "Junkyard Recycling",
            desc: `Once per turn: when Rumble casts a skill, choose 1 non-R skill card in your side's graveyard; it goes to hand as a Recycled card. Rumble casts it as his own skill, scaling with AP (${p.p2} AP = 1 AD), applying no crowd control, costing ${p.p1} less mana, lasting until the end of the opponent's turn and vanishing after use.`,
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
                desc: `Every enemy champion takes {${EN_R}} magic damage. Then choose up to ${p.r4} non-R skill cards in your side's graveyard to become Recycled cards.`,
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
