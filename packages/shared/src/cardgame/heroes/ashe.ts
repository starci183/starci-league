// Ashe (Xạ thủ, vật lý): máu 740 · AD 70 · giáp/kháng 26/28. Engine: mill (sắp xếp bộ địch), marks (Buốt).
// MỤC ĐÍCH: "Đóng băng nhịp đối thủ" — Buốt (status engine "chill", hiện trên tướng) là chìa khoá: mỗi tướng địch đang Buốt
// đẩy lá chiêu trên cùng bộ địch xuống đáy, E soi bộ địch đẩy lá chiêu xuống đáy (Nấm của Teemo giữ lại trên cùng).
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    otherSide,
    type Card, type Side, type Unit
} from "../types"

const F_Q = "20 + 60% AD"
const F_E = "15 + 30% AD"
const F_R = "100 + 80% AD + 40% AP"
const HAWK = 3

const isSkillCard = (c: Card) => c.kind === "skill" || c.kind === "wild"
/** Buốt tới hết lượt kế tiếp (bất kể của ai) */
const chill = (g: Game, t: Unit) => g.status(t,
    "chill",
    1,
    {
        until: g.s.turnNo + 1
    })
/** Đưa lá trên cùng bộ của foe xuống đáy nếu là lá chiêu. Trả về true nếu đã đẩy. */
function buryTop(g: Game, foe: Side): boolean {
    const deck = g.player(foe).deck
    if (!deck.length || !isSkillCard(deck[0])) return false
    deck.push(deck.shift()!)
    return true
}

export default defineHero({
    id: "ashe", name: "Ashe", role: "marksman", damage: "physical", hp: 1060, atk: 83, armor: 26, mr: 28,
    desc: "Đóng băng nhịp đối thủ: Buốt tướng địch, và mỗi tướng đang Buốt đẩy lá chiêu của họ xuống đáy bộ bài. Ưng Thần soi bộ địch để chôn lá chiêu.",
    skillCopies: {
        Q: 5, E: 5, R: 2
    },
    passive: {
        name: "Băng Tiễn",
        desc: "Đòn đánh của Ashe gây Buốt (nhận thêm 25% sát thương) tới hết lượt kế tiếp. Cuối lượt của bạn, với **mỗi tướng địch đang Buốt**: nếu lá trên cùng bộ bài đối thủ là lá chiêu thì đẩy nó xuống đáy bộ.",
    },
    hooks: {
        onAttackHit(g, me, d) {
            if (d.attacker.id === me.id && d.target.status === "board") chill(g,
                d.target)
        },
        onTurnEnd(g, me, d) {
            if (d.side !== me.side) return
            const foe = otherSide(me.side)
            const n = g.heroes(foe).filter((u) => g.has(u,
                "chill")).length
            let buried = 0
            for (let i = 0; i < n; i++) if (buryTop(g,
                foe)) buried++
            if (buried) g.log(`Ashe buries ${buried} enemy skill card(s) at the bottom of their deck.`)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Mưa Tên", target: "enemies_upto", max: 3,
            desc: `{${F_Q}} sát thương vật lý cho tối đa 3 tướng địch và Buốt chúng. **Điều kiện:** bộ bài đối thủ đang ít lá hơn bộ bài của bạn thì trúng mọi tướng địch.`,
            resolve(c) {
                const foe = otherSide(c.side)
                const all = c.g.player(foe).deck.length < c.g.player(c.side).deck.length
                for (const t of all ? c.g.enemies(c.self) : c.targets) {
                    c.g.damage(c.self,
                        t,
                        c.f(F_Q),
                        "physical",
                        {
                            tag: "skill"
                        })
                    if (t.status === "board") chill(c.g,
                        t)
                }
            },
        },
        E: {
            key: "E", name: "Ưng Thần", target: "enemy",
            desc: `{${F_E}} sát thương vật lý cho 1 tướng địch và Buốt nó. Soi ${HAWK} lá trên cùng bộ bài đối thủ: mọi lá chiêu xuống đáy bộ, các lá khác (kể cả Nấm) giữ trên cùng. **Điều kiện:** đẩy được từ 2 lá chiêu thì bạn rút 1 lá.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_E),
                    "physical",
                    {
                        tag: "skill"
                    })
                if (t.status === "board") chill(c.g,
                    t)
                const deck = c.g.player(otherSide(c.side)).deck
                const top = deck.splice(0,
                    HAWK)
                const skills = top.filter(isSkillCard)
                deck.unshift(...top.filter((x) => !isSkillCard(x)))
                deck.push(...skills)
                c.g.log(`Hawkshot: ${skills.length} enemy skill card(s) sent to the bottom.`)
                if (skills.length >= 2) c.g.draw(c.side,
                    1,
                    {
                        reason: "skill", by: c.self.id
                    })
            },
        },
        R: {
            key: "R", name: "Mũi Tên Pha Lê", target: "enemy",
            desc: `{${F_R}} sát thương vật lý cho 1 tướng địch và Choáng 1 lượt. **Điều kiện:** mục tiêu đang Buốt thì Choáng 2 lượt, và đối thủ đặt 1 lá chiêu ngẫu nhiên trên tay xuống đáy bộ bài.`,
            resolve(c) {
                const t = c.target!
                const cold = c.g.has(t,
                    "chill")
                c.g.damage(c.self,
                    t,
                    c.f(F_R),
                    "physical",
                    {
                        tag: "skill"
                    })
                c.g.status(t,
                    "stun",
                    cold ? 2 : 1)
                if (!cold) return
                const foe = otherSide(c.side)
                const card = c.g.stealRandom(foe,
                    isSkillCard)
                if (card) {
                    c.g.player(foe).deck.push(card)
                    c.g.log("Enchanted Crystal Arrow: the opponent puts a skill card from hand on the bottom of their deck.")
                }
            },
        },
    },
})
