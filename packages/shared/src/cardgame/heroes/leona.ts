// Leona (Đỡ đòn, vật lý): máu 490 · AD 64 · AP gốc 0 · giáp/kháng 35/33.
// CHẤT: "Mặt trời mọc": Leona khoá bằng chiêu, đánh dấu Nắng cho đồng đội ăn theo, hứng đòn thay cả đội.
// Nội tại: chiêu của Leona gắn Nắng lên địch; đồng minh khác đánh trúng địch có Nắng gây thêm sát thương rồi Nắng tan.
// Q: sát thương + Choáng + Nắng lên kẻ trước mặt. E (Quick): Nhật Thực: +Giáp/Kháng Phép, hứng mọi sát thương địch gây ra cho cả đội, cuối lượt địch trả lại 1 phần.
// R: sát thương + Nắng mọi địch, đứa đã có Nắng thì Choáng.
// Cơ chế engine dùng: status "sun" (FOREVER), hook onAttackHit, g.guard + g.guardStored (Hộ vệ: sát thương địch lên đồng minh chảy về Leona), hook onTurnEnd, HeroDef.bonusStats.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    FOREVER, otherSide, type Unit
} from "../types"
import {
    ccApply, ccDuration
} from "./braum"

const SUN = "sun"
/** Nhật Thực = status "guard" của engine (v = tổng sát thương Leona đã hứng thay đồng đội) */
const ECLIPSE = "guard"
/** Nhật Thực: +Giáp và +Kháng Phép */
export const E_RESIST = 60
/** Cuối lượt địch trả lại bấy nhiêu phần tổng sát thương đã hứng */
export const E_BACK = 0.4
/** Nội tại: sát thương cộng thêm của đồng minh đánh vào địch có Nắng (chỉ số của Leona) */
export const F_SUN = "20 + 25% AD + 30% AP"
export const F_Q = "40 + 75% AD + 40% AP"
export const F_E_BACK = "20 + 25% AD + 30% AP"
export const F_R = "60 + 50% AD + 60% AP"
/** Q: Choáng 1 + 0,1% AD + 0,2% AP đơn vị; R: Choáng 1 + 0,15% AP đơn vị (law.md §4) */
export const Q_STUN = {
    base: 1, ad: 0.001, ap: 0.002
}
export const R_STUN = {
    base: 1, ap: 0.0015
}

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
    id: "leona", name: "Leona", role: "tank", damage: "physical", hp: 490, atk: 64, armor: 35, mr: 33,
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
        desc: `Chiêu đặt Nắng không cộng dồn, không tự hết hạn. Đòn thật của đồng minh khác Leona trúng tướng có Nắng tiêu dấu và gây thêm {${F_SUN}} của Leona sát thương vật lý; không tự cấp đòn đánh.`,
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
            const st = me.statuses[ECLIPSE]
            // cuối cửa sổ Nhật Thực (hết lượt địch mà trạng thái hết hạn): dội một lần
            if (d.side === me.side || !st || st.until > g.s.turnNo) return
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
                    tag: "effect"
                })
            addSun(g,
                me,
                t)
        },
    },
    skills: {
        Q: {
            key: "Q", mana: 10, name: "Khiên Mặt Trời", target: "opposite",
            desc: `Khóa tướng địch đối diện hợp lệ; gây {${F_Q}} sát thương vật lý, Choáng 1 + 0,1% AD + 0,2% AP đơn vị rồi đặt Nắng.`,
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
                ccApply(c.g,
                    c.self,
                    t,
                    "stun",
                    ccDuration(c.g,
                        c.self,
                        Q_STUN),
                    "Leona Q Choáng")
                addSun(c.g,
                    c.self,
                    t)
            },
        },
        E: {
            key: "E", mana: 20, name: "Nhật Thực", target: "none", quick: true,
            desc: `Dùng chủ động, hoặc khi địch tấn công hay dùng một lá chiêu, bạn có thể dùng lá này: tới hết lượt địch kế tiếp, Leona tăng 60 Giáp và 60 Kháng phép, gánh sát thương địch lên các tướng đồng minh. Cuối cửa sổ, dội 40% lượng đã gánh + {${F_E_BACK}} sát thương vật lý vào một tướng địch hợp lệ ngẫu nhiên và đặt Nắng. Tái dùng giữ kho đã gánh, không cộng thêm lớp +60.`,
            quickWhen: (c) => c.trigger.side !== c.side && (c.trigger.kind === "attack" || c.trigger.kind === "skill"),
            resolve(c) {
                // tái dùng: làm mới hạn, giữ kho đã gánh (g.guard đặt lại v = 0 nên ghi lại)
                const stored = c.g.guardStored(c.self)
                c.g.guard(c.self,
                    1,
                    {
                        of: otherSide(c.side)
                    })
                const st = c.self.statuses[ECLIPSE]
                if (st) st.v = stored
            },
        },
        R: {
            key: "R", mana: 35, name: "Mặt Trời Hạ San", target: "all_enemies",
            desc: `Gây {${F_R}} sát thương vật lý lên mọi tướng địch và đặt Nắng. Chỉ tướng có Nắng trước lá này chịu Choáng 1 + 0,15% AP đơn vị; R dùng riêng vẫn mở dấu cho đồng đội.`,
            resolve(c) {
                const foes = c.g.heroes(otherSide(c.side))
                const hadSun = new Set(foes.filter((t) => c.g.has(t,
                    SUN)).map((t) => t.id)) // chỉ Nắng có TRƯỚC lá này
                for (const t of foes) {
                    const had = hadSun.has(t.id)
                    c.g.damage(c.self,
                        t,
                        c.f(F_R),
                        "physical",
                        {
                            tag: "skill"
                        })
                    if (t.status !== "board") continue
                    if (had) ccApply(c.g,
                        c.self,
                        t,
                        "stun",
                        ccDuration(c.g,
                            c.self,
                            R_STUN),
                        "Leona R Choáng")
                    addSun(c.g,
                        c.self,
                        t)
                }
            },
        },
    },
})
