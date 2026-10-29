// Garen (Đấu sĩ, vật lý): máu 460 · AD 66 · giáp/kháng 40/36.
// CHẤT: "Tay đôi với kẻ trước mặt". Kẻ đối diện Garen mỗi lần đánh (bất kỳ ai) tự +1 Tội; Garen đánh vào Tội thì nặng thêm.
// Q dùng Tội (không tiêu), E nuôi Tội (3 nhát, mỗi nhát +1), R Phán Quyết xả Tội thành sát thương chuẩn.
// Engine: status cộng dồn "guilt" (g.status add), AttackInfo.bonus, hook onAttack của tướng đối diện.
// Đối thủ trả lời: bỏ trống đường đối diện Garen, để kẻ yếu đánh ít đứng trước Garen (Ashe), hoặc thả diều.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    Unit
} from "../types"

const GUILT = "guilt"
/** Tối đa 10 Tội; hết sau 3 lượt của tướng mang kể từ lần cộng cuối */
const MAX_GUILT = 10
const GUILT_TURNS = 3
/** Nội tại: đòn đánh của Garen thêm từng này sát thương mỗi Tội của mục tiêu */
const F_PASSIVE = "6% AD"
const F_Q = "15 + 80% AD"
/** Q: thêm từng này mỗi Tội */
const F_Q_GUILT = "15% AD"
/** E: mỗi nhát */
const F_E = "6 + 35% AD"
const E_HITS = 3
/** R: mỗi Tội */
const F_R_GUILT = "15 + 40% AD"

export const guiltOf = (g: Game, t: Unit) => g.statusV(t,
    GUILT)
const addGuilt = (g: Game, t: Unit, n: number) => {
    if (t.status !== "board" || t.token) return
    g.status(t,
        GUILT,
        GUILT_TURNS,
        {
            v: n, add: true, max: MAX_GUILT
        })
}

export default defineHero({
    id: "garen", name: "Garen", role: "fighter", damage: "physical", hp: 300, atk: 60, armor: 33, mr: 31,
    desc: "Tay đôi: kẻ đứng trước Garen cứ đánh là tự chất Tội lên mình, Garen chém vào Tội và Phán Quyết xả hết.",
    passive: {
        name: "Công Lý",
        desc: `Mỗi lần tướng địch đối diện Garen tấn công (bất kỳ ai): nó +1 Tội (tối đa ${MAX_GUILT}, hết sau ${GUILT_TURNS} lượt của nó kể từ lần cộng cuối). Đòn đánh của Garen gây thêm {${F_PASSIVE}} sát thương vật lý mỗi Tội trên mục tiêu.`,
    },
    hooks: {
        onAttack(g, me, d) {
            const a = d.attacker
            if (a.id === me.id) {
                const n = guiltOf(g,
                    d.target)
                if (n > 0) d.info.bonus.push({
                    raw: n * g.f(me,
                        F_PASSIVE), kind: "physical"
                })
                return
            }
            if (a.side !== me.side && !a.token && g.opposite(me)?.id === a.id) addGuilt(g,
                a,
                1)
        },
    },
    bot: {
        markValue: {
            guilt: 20,
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Đòn Quyết Định", target: "opposite",
            desc: `Chọn tướng địch đối diện Garen; gây {${F_Q}} sát thương vật lý, thêm {${F_Q_GUILT}} mỗi Tội của nó.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q) + guiltOf(c.g,
                        t) * c.f(F_Q_GUILT),
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
        E: {
            key: "E", name: "Phán Xét", target: "opposite",
            desc: `Chọn tướng địch đối diện Garen; chém nó ${E_HITS} nhát, mỗi nhát gây {${F_E}} sát thương vật lý và +1 Tội (không tính vào 3 đòn đánh).`,
            resolve(c) {
                const t = c.target!
                for (let i = 0; i < E_HITS && t.status === "board"; i++) {
                    c.g.damage(c.self,
                        t,
                        c.f(F_E),
                        "physical",
                        {
                            tag: "skill"
                        })
                    addGuilt(c.g,
                        t,
                        1)
                }
            },
        },
        R: {
            key: "R", name: "Phán Quyết Demacia", target: "opposite",
            desc: `Chọn tướng địch đối diện Garen đang có Tội; gây {${F_R_GUILT}} sát thương chuẩn cho mỗi Tội của nó rồi xoá hết Tội.`,
            canPlay: (c) => {
                const o = c.g.opposite(c.self)
                return !!o && guiltOf(c.g,
                    o) > 0
            },
            resolve(c) {
                const t = c.target!
                const n = guiltOf(c.g,
                    t)
                c.g.removeStatus(t,
                    GUILT)
                if (n <= 0) return
                c.g.damage(c.self,
                    t,
                    n * c.f(F_R_GUILT),
                    "true",
                    {
                        tag: "skill"
                    })
            },
        },
    },
})
