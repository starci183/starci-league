// Nami (Trợ thủ, phép): máu 350 · AD 88 · AP gốc 66 · giáp/kháng 25/29.
// CHẤT: "Thuỷ triều nuôi bài". Mỗi lần một đồng minh gây sát thương hoặc hồi máu là một cơ hội rút bài; Nami tự tạo thật nhiều lần như vậy.
// Nội tại: tỉ lệ rút theo chỉ số CỦA đồng minh ra đòn/hồi (g.chance), tối đa 2 lá/lượt. Q Choáng + đánh dấu 3 đòn (g.addMark), E hồi nảy 5 lần (g.bounceAllies), R hồi cả đội + Choáng mọi địch.
// Đếm lần ra đòn/hồi: hook onDamage (mọi lần đồng minh gây sát thương lên địch) và onHeal (mọi lần đồng minh hồi máu, kể cả hút máu và đồ).
// Trợ thủ: ra sân thì Q và E vào tay. Đối thủ trả lời: cướp bài vừa rút (Blitzcrank), Nấm của Teemo, dồn chết Nami trước.
import {
    pct
} from "../formula"
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    Unit
} from "../types"

const MARK = "nami_q"
/** Số đòn đồng minh mà dấu Q còn hiệu lực */
const MARK_HITS = 3
/** Dấu Q còn hiệu lực trong lượt này và lượt kế của chủ */
const MARK_TURNS = 2
const F_Q = "40 + 25% AD + 55% AP"
const F_MARK = "10 + 10% AD + 20% AP"
const F_HEAL = "35 + 15% AD + 35% AP"
/** Số lần nảy thêm của E (sau lần hồi đầu cho Nami) */
const E_BOUNCES = 5
const F_R = "100 + 30% AD + 70% AP"
/** Tỉ lệ rút: 5% + 0.05% mỗi điểm AD và mỗi điểm AP của đồng minh đó (g.chance nhận phân số mỗi 100 điểm) */
const P_BASE = 0.05
const P_PER_100 = 0.05
/** Trần số lá rút từ nội tại mỗi lượt */
export const DRAW_CAP = 2

/** Một lần `ally` gây sát thương/hồi máu: có tỉ lệ cho chủ Nami rút 1 lá (tối đa DRAW_CAP lá mỗi lượt) */
function tide(g: Game, me: Unit, ally: Unit | undefined) {
    if (!ally || ally.side !== me.side || ally.token || me.status !== "board") return
    const p = g.chance(ally,
        {
            base: P_BASE, ad: P_PER_100, ap: P_PER_100
        })
    if (!g.roll(p)) return
    // Hai ô "một lần mỗi lượt" = trần 2 lá mỗi lượt
    if (!g.oncePerTurn(me,
        "nami:draw1") && !g.oncePerTurn(me,
        "nami:draw2")) return
    g.log(`Nami: rút 1 lá nhờ ${g.nameOf(ally)} (tỉ lệ ${g.pctText(p)})`)
    g.draw(me.side,
        1,
        {
            reason: "effect", by: me.id
        })
}

export default defineHero({
    id: "nami", name: "Nami", role: "support", damage: "magic", hp: 350, atk: 88, ap: 66, armor: 25, mr: 29,
    desc: "Thuỷ triều nuôi bài: cả đội ra đòn, cả đội được hồi là Nami có cơ hội rút bài; Q và R khống chế, E và R hồi máu.",
    passive: {
        name: "Triều Bài",
        desc: `Mỗi lần một đồng minh gây sát thương hoặc hồi máu: có tỉ lệ (${pct(P_BASE)}% + 0.05% mỗi điểm AD và mỗi điểm AP của đồng minh đó) cho bạn rút 1 lá (áp dụng như nhau cho mọi đồng minh, kể cả Nami). Tối đa ${DRAW_CAP} lá mỗi lượt từ nội tại.`,
    },
    hooks: {
        // Mỗi lần đồng minh gây sát thương (đòn đánh, chiêu, hiệu ứng, theo thời gian) lên địch: một lần kích
        onDamage(g, me, d) {
            if (!d.src || d.target.side === me.side || d.amount <= 0) return
            tide(g,
                me,
                d.src)
        },
        // Mỗi lần đồng minh hồi máu (chiêu, hút máu, đồ...): một lần kích
        onHeal(g, me, d) {
            tide(g,
                me,
                d.src)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Bong Bóng", target: "enemy",
            desc: `Chọn 1 tướng địch; nó nhận {${F_Q}} sát thương phép, bị Choáng 1 lượt và bị đánh dấu ${MARK_HITS} nấc: ${MARK_HITS} đòn đánh kế tiếp của đồng minh lên nó, mỗi đòn tiêu 1 nấc và gây thêm {${F_MARK}} sát thương phép (theo chỉ số Nami).`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                c.g.status(t,
                    "stun",
                    1)
                c.g.addMark(t,
                    MARK,
                    c.self,
                    {
                        hits: MARK_HITS, bonus: c.f(F_MARK), kind: "magic", turns: MARK_TURNS, of: c.side
                    })
            },
        },
        E: {
            key: "E", name: "Nước Hồi Sinh", target: "self",
            desc: `Nami hồi {${F_HEAL}}, rồi dòng nước nảy ngẫu nhiên giữa các đồng minh (có thể nảy lại người cũ), tối đa ${E_BOUNCES} lần nảy; mỗi lần nảy hồi {${F_HEAL}}. Mỗi lần hồi đều kích nội tại.`,
            resolve(c) {
                const amount = c.f(F_HEAL)
                c.g.bounceAllies(c.self,
                    E_BOUNCES,
                    (t) => {
                        c.g.heal(c.self,
                            t,
                            amount)
                    })
            },
        },
        R: {
            key: "R", name: "Sóng Thần", target: "all_enemies",
            desc: `Mọi đồng minh hồi {${F_R}}; mọi tướng địch bị Choáng 1 lượt. Mỗi lần hồi đều kích nội tại.`,
            resolve(c) {
                const amount = c.f(F_R)
                for (const a of c.g.allies(c.self)) c.g.heal(c.self,
                    a,
                    amount)
                for (const t of c.g.enemies(c.self)) {
                    if (!t.token) c.g.status(t,
                        "stun",
                        1)
                }
            },
        },
    },
})
