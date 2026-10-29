// Leona (Đỡ đòn, vật lý): máu 520 · AD 82 · AP gốc 0 · giáp/kháng 35/33.
// CHẤT: "Mặt trời mọc": Leona khoá bằng chiêu, đánh dấu Nắng cho đồng đội ăn theo, hứng đòn thay cả đội.
// Nội tại: chiêu của Leona gắn Nắng lên địch; đồng minh khác đánh trúng địch có Nắng gây thêm sát thương rồi Nắng tan.
// Q: sát thương + Choáng + Nắng lên kẻ trước mặt. E (Quick): Nhật Thực: +Giáp/Kháng Phép, hứng mọi sát thương địch gây ra cho cả đội, cuối lượt địch trả lại 1 phần.
// R: sát thương + Nắng mọi địch, đứa đã có Nắng thì Choáng.
// Cơ chế engine dùng: status "sun" (FOREVER), hook onAttackHit, g.guard + g.guardStored (Hộ vệ: sát thương địch lên đồng minh chảy về Leona), hook onTurnEnd, HeroDef.bonusStats.
import {
    pct
} from "../formula"
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    FOREVER, otherSide, type Unit
} from "../types"

const SUN = "sun"
/** Nhật Thực = status "guard" của engine (v = tổng sát thương Leona đã hứng thay đồng đội) */
const ECLIPSE = "guard"
/** Nhật Thực: +Giáp và +Kháng Phép */
export const E_RESIST = 60
/** Cuối lượt địch trả lại bấy nhiêu phần tổng sát thương đã hứng */
export const E_BACK = 0.4
/** Nội tại: sát thương cộng thêm của đồng minh đánh vào địch có Nắng (chỉ số của Leona) */
export const F_SUN = "20 + 20% AD + 30% AP"
export const F_Q = "40 + 60% AD + 40% AP"
export const F_E_BACK = "20 + 20% AD + 30% AP"
export const F_R = "60 + 40% AD + 60% AP"

/** Gắn Nắng của Leona lên địch t (không cộng dồn: có hoặc không) */
function addSun(g: Game, leona: Unit, t: Unit) {
    if (t.status !== "board" || t.token || t.side === leona.side) return
    g.status(t,
        SUN,
        1,
        {
            until: FOREVER, src: leona.id
        })
}

export default defineHero({
    id: "leona", name: "Leona", role: "tank", damage: "physical", hp: 520, atk: 82, armor: 35, mr: 33,
    bot: {
        markValue: {
            sun: 40,
        },
        buffValue: {
            guard: 70,
        },
    },
    desc: "Mặt trời mọc: khoá bằng chiêu, đánh dấu Nắng cho đồng đội ăn theo, rồi dựng Nhật Thực hứng đòn thay cả đội.",
    passive: {
        name: "Ánh Dương",
        desc: `Chiêu của Leona gắn Nắng lên địch. Đồng minh khác Leona đánh trúng tướng có Nắng: gây thêm {${F_SUN}} sát thương (theo chỉ số của Leona), rồi Nắng tan.`,
    },
    bonusStats(g, me) {
        return g.has(me,
            ECLIPSE) ? {
                armor: E_RESIST, mr: E_RESIST
            } : {
            }
    },
    hooks: {
        onAttackHit(g, me, d) {
            const t = d.target
            if (d.attacker.side !== me.side || d.attacker.id === me.id || t.side === me.side || t.statuses[SUN]?.src !== me.id) return
            g.removeStatus(t,
                SUN)
            g.damage(me,
                t,
                g.f(me,
                    F_SUN),
                "physical",
                {
                    tag: "effect"
                })
        },
        onTurnEnd(g, me, d) {
            if (d.side === me.side || !g.has(me,
                ECLIPSE)) return
            const taken = g.guardStored(me)
            const t = g.pick(g.targetableEnemies(me).filter((x) => !x.token))
            if (!t) return
            g.log(`Leona: sát thương hứng được dội ngẫu nhiên vào ${g.nameOf(t)}`)
            g.damage(me,
                t,
                taken * E_BACK + g.f(me,
                    F_E_BACK),
                "physical",
                {
                    tag: "skill"
                })
            addSun(g,
                me,
                t)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Khiên Mặt Trời", target: "opposite",
            desc: `Tướng địch đối diện Leona nhận {${F_Q}} sát thương vật lý, Choáng 1 lượt và bị gắn Nắng.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "physical",
                    {
                        tag: "skill"
                    })
                if (t.status !== "board") return
                c.g.status(t,
                    "stun",
                    1)
                addSun(c.g,
                    c.self,
                    t)
            },
        },
        E: {
            key: "E", name: "Nhật Thực", target: "none", quick: true,
            desc: `Quick. Tới hết lượt của đối thủ: Leona +${E_RESIST} Giáp và +${E_RESIST} Kháng Phép, và hứng mọi sát thương địch gây ra cho đồng đội. Cuối lượt đó, 1 tướng địch ngẫu nhiên nhận ${pct(E_BACK)}% tổng sát thương Leona đã hứng + {${F_E_BACK}} sát thương vật lý và bị gắn Nắng.`,
            quickWhen: (c) => c.trigger.side !== c.side,
            resolve(c) {
                c.g.guard(c.self,
                    1,
                    {
                        of: otherSide(c.side)
                    })
            },
        },
        R: {
            key: "R", name: "Mặt Trời Hạ San", target: "all_enemies",
            desc: `Mọi tướng địch nhận {${F_R}} sát thương vật lý và bị gắn Nắng. Tướng đã có Nắng từ trước: Choáng 1 lượt.`,
            resolve(c) {
                for (const t of c.g.heroes(otherSide(c.side))) {
                    const had = c.g.has(t,
                        SUN)
                    c.g.damage(c.self,
                        t,
                        c.f(F_R),
                        "physical",
                        {
                            tag: "skill"
                        })
                    if (t.status !== "board") continue
                    if (had) c.g.status(t,
                        "stun",
                        1)
                    addSun(c.g,
                        c.self,
                        t)
                }
            },
        },
    },
})
