// Twisted Fate (Pháp sư, phép): bài. Mọi con số nằm trong balance/heroes/twistedfate.json (docs/heroes/KITS.md).
// Q và R lật lá trên cùng BỘ BÀI CỦA MÌNH (g.flipTop, cả hai bên thấy) rồi chia lá theo loại; lá lật không được rút thì vào mộ.
// Nội tại Thần Bài: sau bước rút đầu lượt (hook onMainStart) chủ nhận lá tạm "tf_fate" ghi lá trên cùng bộ; đánh lá đó thì đặt lá ấy xuống đáy.
import {
    kit
} from "../balance"
import type {
    Game
} from "../game"
import {
    defineHero, defineSpecialCard, getSpecialCard
} from "../registry"
import type {
    Card, PlayArgs, Side
} from "../types"

const k = kit("twistedfate"), {
    p
} = k
const F_Q = k.x("q1 + q2·AP"), EN_Q = k.xe("q1 + q2·AP")
const F_STUN = k.x("q3 + q4·AP"), EN_STUN = k.xe("q3 + q4·AP")
const F_E = k.x("e1 + e2·AP"), EN_E = k.xe("e1 + e2·AP")
const F_R = k.x("r2 + r3·AP"), EN_R = k.xe("r2 + r3·AP")
export const FATE = "tf_fate"

/** Lá chiêu: chiêu tướng, lá Bóng hoặc lá đặc biệt đánh được như chiêu */
const isSkillCard = (c: Card) => c.kind === "skill" || !!c.copyOf || (c.kind === "special" && !!getSpecialCard(c.id)?.skill)
/** Vàng hoặc đồ (mảnh đồ, đồ huyền thoại) */
const isLoot = (c: Card) => c.kind === "support" && (c.id === "gold" || c.id === "item" || c.id === "legend")
/** Lá lật vào mộ (lá đặc biệt/tạm thì biến mất). Không bắn onDiscard: lá chưa từng ở trên tay. */
const toGrave = (g: Game, side: Side, c: Card) => { if (c.kind !== "special" && !c.temp) g.player(side).grave.push(c) }
/** Lá lật được rút lên tay: đặt lại đỉnh bộ rồi rút để đi qua đủ luật rút (Nấm tự bật, tay đầy thì đốt) */
const drawFlipped = (g: Game, side: Side, c: Card, by: string) => {
    g.player(side).deck.unshift(c)
    g.drawOne(side,
        "pick",
        by)
}
const sigOf = (c: Card) => `${c.kind}|${c.id}|${c.hero ?? ""}|${c.item ?? ""}`

const topUid = (g: Game, side: Side) => g.peekDeck(side,
    1)[0]?.uid

defineSpecialCard({
    id: FATE,
    name: "Thần Bài",
    desc: "Lá trên cùng bộ bài của bạn: đánh lá này để đặt lá đó xuống đáy bộ. Lá tạm.",
    skill: {
        key: "E", name: "Thần Bài", desc: "Đặt lá trên cùng bộ bài xuống đáy bộ.", target: "none", mana: p.e4, uncounterable: true,
        canPlay: (c) => String(c.card.data?.uid ?? "") === topUid(c.g,
            c.side),
        resolve(ctx) {
            const {
                g, side, card
            } = ctx
            const uid = String(card.data?.uid ?? "")
            if (topUid(g,
                side) !== uid) return
            const top = g.takeFromDeck(side,
                uid)
            if (top) g.putOnBottom(side,
                top)
        },
    },
})

export default defineHero({
    id: "twistedfate", name: "Twisted Fate", role: "mage", damage: "magic", ...k.base,
    desc: "Kiểm soát bộ bài: soi lá trên cùng và đặt xuống đáy nếu không ưng, Q lật bài tuỳ lá mà đổi phép, E đánh rồi xếp lại đỉnh bộ, R lật cả loạt bài ném vào địch.",
    passive: {
        name: "Thần Bài",
        desc: "Mỗi lượt của mình, sau khi rút bài, chủ bộ bài xem lá trên cùng bộ và có thể đặt nó xuống đáy (lá tạm Thần Bài trên tay, không chọn thì biến mất). Tay bài không lộ cho đối thủ.",
    },
    hooks: {
        onMainStart(g, me, d) {
            if (d.side !== me.side) return
            const top = g.peekDeck(me.side,
                1)[0]
            if (!top) return
            g.createCard(me.side,
                {
                    kind: "special", id: FATE, hero: me.hero, side: me.side, temp: true, data: {
                        uid: top.uid, label: top.id
                    }
                })
        },
        onDraw(g, me, d) {
            // bộ bài đã đổi đỉnh: lá Thần Bài cũ hết nghĩa
            if (d.side !== me.side || d.card.id === FATE) return
            const hand = g.player(me.side).hand
            const stale = hand.filter((x) => x.kind === "special" && x.id === FATE && String(x.data?.uid) !== topUid(g,
                me.side))
            if (!stale.length) return
            g.player(me.side).hand = hand.filter((x) => !stale.includes(x))
            for (const card of stale) g.emit({
                t: "tempExpired", side: me.side, card
            })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Chọn Bài", target: "enemy", mana: p.q0,
            desc: `Chọn 1 tướng địch; lật lá trên cùng bộ bài của bạn, gây {${F_Q}} sát thương phép. Lá chiêu: trúng thêm 2 đường kề. Vàng hoặc đồ: Choáng nó {${F_STUN}} đơn vị. Lá khác: rút lá đó. Lá lật không được rút vào mộ.`,
            resolve(c) {
                const t = c.target!, me = c.self
                const side = c.side
                const card = c.g.flipTop(side,
                    me.id)
                const raw = c.f(F_Q)
                const near = card && isSkillCard(card) ? c.g.neighbors(t) : []
                c.g.damage(me,
                    t,
                    raw,
                    "magic",
                    {
                        tag: "skill"
                    })
                for (const n of near) if (c.g.targetable(n)) c.g.damage(me,
                    n,
                    raw,
                    "magic",
                    {
                        tag: "skill", aoe: true
                    })
                if (!card) return
                if (isSkillCard(card)) toGrave(c.g,
                    side,
                    card)
                else if (isLoot(card)) {
                    c.g.timed(me,
                        t,
                        "stun",
                        c.f(F_STUN))
                    toGrave(c.g,
                        side,
                        card)
                } else drawFlipped(c.g,
                    side,
                    card,
                    me.id)
            },
        },
        E: {
            key: "E", name: "Xào Bài", target: "enemy", mana: p.e0,
            desc: `Chọn 1 tướng địch: {${F_E}} sát thương phép. Xem ${p.e3} lá trên cùng bộ bài của bạn, chọn 1 lá đặt lên đỉnh, các lá còn lại giữ thứ tự.`,
            options(c) {
                const top = c.g.peekDeck(c.side,
                    p.e3)
                const seen = new Set<string>()
                const picks = top.length > 1 ? top.filter((x) => !seen.has(sigOf(x)) && !!seen.add(sigOf(x))).map((x) => x.uid) : []
                const out: PlayArgs[] = []
                for (const t of c.g.targetableEnemies(c.self)) if (!t.token) {
                    if (!picks.length) out.push({
                        target: t.id
                    })
                    else for (const pick of picks) out.push({
                        target: t.id, pick
                    })
                }
                return out
            },
            resolve(c) {
                c.g.damage(c.self,
                    c.target!,
                    c.f(F_E),
                    "magic",
                    {
                        tag: "skill"
                    })
                const deck = c.g.player(c.side).deck
                const i = deck.slice(0,
                    p.e3).findIndex((x) => x.uid === c.args.pick)
                if (i > 0) deck.unshift(...deck.splice(i,
                    1))
            },
        },
        R: {
            key: "R", name: "Định Mệnh", target: "none", mana: p.r0,
            canPlay: (c) => c.g.targetableEnemies(c.self).some((u) => !u.token),
            desc: `Lật ${p.r1} lá trên cùng bộ bài của bạn; mỗi lá gây {${F_R}} sát thương phép lên 1 tướng địch ngẫu nhiên, lá chiêu gấp ${p.r4} lần. Các lá lật vào mộ.`,
            resolve(c) {
                const me = c.self
                const raw = c.f(F_R)
                for (let i = 0; i < p.r1; i++) {
                    const card = c.g.flipTop(c.side,
                        me.id)
                    if (!card) break
                    const t = c.g.pick(c.g.targetableEnemies(me).filter((u) => !u.token))
                    if (t) c.g.damage(me,
                        t,
                        isSkillCard(card) ? raw * p.r4 : raw,
                        "magic",
                        {
                            tag: "skill"
                        })
                    toGrave(c.g,
                        c.side,
                        card)
                }
            },
        },
    },
    en: {
        desc: "Deck control: peek at the top card and bottom it if you dislike it, Q flips a card to change the spell, E hits and rearranges your deck's top, R flips a whole run of cards into the enemy team.",
        passive: {
            name: "Destiny",
            desc: "Each of your turns, after drawing, the deck owner sees the top card of the deck and may put it on the bottom (a temporary Destiny card in hand; if unused it vanishes). The hand stays hidden from the opponent.",
        },
        skills: {
            Q: {
                name: "Wild Cards",
                desc: `Choose 1 enemy champion; flip the top card of your deck and deal {${EN_Q}} magic damage. Skill card: also hits the 2 adjacent lanes. Gold or item: Stun it for {${EN_STUN}} units. Any other card: draw that card. A flipped card that is not drawn goes to the graveyard.`,
            },
            E: {
                name: "Stacked Deck",
                desc: `Choose 1 enemy champion: {${EN_E}} magic damage. Look at the top ${p.e3} cards of your deck and put 1 of them on top; the rest keep their order.`,
            },
            R: {
                name: "Destiny",
                desc: `Flip the top ${p.r1} cards of your deck; each deals {${EN_R}} magic damage to 1 random enemy champion, multiplied by ${p.r4} for a skill card. The flipped cards go to the graveyard.`,
            },
        },
    },
})
