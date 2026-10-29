// Janna (Trợ thủ, phép): máu 340 · AD 88 · AP gốc 66 · giáp/kháng 26/29.
// CHẤT: "Bão che chở": khống chế, bảo kê, lật kèo bằng gió.
// Nội tại: đầu lượt bạn, đồng minh máu thấp nhất nhận Khiên. Q (Quick): Lốc Xoáy gây sát thương phép + Choáng 1 lượt.
// E (Quick): Khiên + miễn khống chế khi còn Khiên. R (Quick): tới hết lượt địch cả đội miễn sát thương từ đòn đánh, hết lượt cả đội hồi máu.
// Cơ chế engine dùng: hook onTurnStart, hook onBeforeStatus, status attackCut (v = 1: miễn đòn đánh), hook onTurnEnd, HeroDef.ap (AP gốc).
import {
    defineHero
} from "../registry"
import type {
    Game
} from "../game"
import {
    FOREVER, otherSide, type Unit
} from "../types"

const WARD = "janna_ward"
const GALE = "janna_gale"
/** Khống chế mà Khiên Gió chặn */
const CC = ["stun",
    "silence",
    "disarm",
    "taunt"]
export const F_PASSIVE = "30 + 20% AD + 40% AP"
export const F_Q = "40 + 30% AD + 60% AP"
export const F_E = "80 + 40% AD + 70% AP"
export const F_R = "80 + 40% AD + 80% AP"

/** Choáng đủ 1 lượt: nếu đang là lượt của nó thì tính cả lượt kế tiếp (Quick giữa lượt địch vẫn cắt cả lượt sau) */
function stunFull(g: Game, u: Unit) {
    if (u.status !== "board" || u.token) return
    g.status(u,
        "stun",
        1,
        {
            until: g.turnsUntil(u.side,
                g.s.active === u.side ? 2 : 1)
        })
}

/** AP gốc = AD cũ của Janna (V3: tướng phép có AP gốc bằng AD gốc cũ) */
const BASE_AP = 66

export default defineHero({
    id: "janna", name: "Janna", role: "support", damage: "magic", hp: 340, atk: 88, ap: BASE_AP, armor: 26, mr: 29,
    bot: {
        buffValue: {
            janna_gale: 80, janna_ward: 30,
        },
    },
    desc: "Hiện Thân Bão Tố: Lốc Xoáy hất địch Choáng, Mắt Bão che Khiên và miễn khống chế, Gió Mùa chắn mọi đòn đánh của cả lượt địch rồi hồi máu cả đội.",
    passive: {
        name: "Mắt Gió",
        desc: `Đầu lượt của bạn: tướng mình có máu thấp nhất nhận Khiên {${F_PASSIVE}}.`,
    },
    hooks: {
        onTurnStart(g, me, d) {
            if (d.side !== me.side) return
            const t = g.lowestHp(g.heroes(me.side))
            if (t) g.shield(me,
                t,
                g.f(me,
                    F_PASSIVE))
        },
        onBeforeStatus(g, me, d) {
            const u = d.unit
            if (u.side === me.side && CC.includes(d.id) && g.has(u,
                WARD) && u.shield > 0) d.cancel = true
        },
        onDamage(g, me, d) {
            const t = d.target
            if (t.side === me.side && g.has(t,
                WARD) && t.shield <= 0) g.removeStatus(t,
                WARD)
        },
        onTurnEnd(g, me, d) {
            if (d.side === me.side || !g.has(me,
                GALE)) return
            const heal = g.f(me,
                F_R)
            for (const u of g.heroes(me.side)) g.heal(me,
                u,
                heal)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Lốc Xoáy", target: "enemy", quick: true,
            desc: `Quick. Chọn 1 tướng địch; gây {${F_Q}} sát thương phép và Choáng 1 lượt.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                stunFull(c.g,
                    t)
            },
        },
        E: {
            key: "E", name: "Mắt Bão", target: "ally", quick: true,
            desc: `Quick. Chọn 1 tướng mình; nó nhận Khiên {${F_E}}. Khi còn Khiên đó: nó miễn Khống Chế.`,
            resolve(c) {
                const t = c.target!
                c.g.shield(c.self,
                    t,
                    c.f(F_E))
                c.g.status(t,
                    WARD,
                    1,
                    {
                        until: FOREVER
                    })
            },
        },
        R: {
            key: "R", name: "Gió Mùa", target: "none", quick: true,
            desc: `Quick. Tới hết lượt của đối thủ: cả đội miễn sát thương từ đòn đánh. Cuối lượt đó, mọi tướng mình hồi {${F_R}} máu.`,
            quickWhen: (c) => c.trigger.side !== c.side,
            resolve(c) {
                const foe = otherSide(c.side)
                c.g.status(c.self,
                    GALE,
                    1,
                    {
                        of: foe
                    })
                // miễn sát thương từ đòn đánh: attackCut v = 1 (engine nhân sát thương tag "attack" với 1 - v)
                for (const u of c.g.allies(c.self)) c.g.status(u,
                    "attackCut",
                    1,
                    {
                        v: 1, of: foe
                    })
            },
        },
    },
})
