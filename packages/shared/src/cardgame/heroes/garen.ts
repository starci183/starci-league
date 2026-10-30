// Garen (Đấu sĩ, vật lý): máu 450 · AD 71 · giáp/kháng 33/31 (V3).
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
    AttackInfo, Unit
} from "../types"

const GUILT = "guilt"
/** Tội không giới hạn (bỏ cap 10); hết sau 3 lượt của tướng mang kể từ lần cộng cuối */
const MAX_GUILT = Infinity
const GUILT_TURNS = 3
/** Nội tại: đòn đánh của Garen thêm từng này sát thương mỗi Tội của mục tiêu */
export const F_PASSIVE = "8% AD + 2% AP"
export const F_Q = "20 + 125% AD + 15% AP"
/** Q: thêm từng này mỗi Tội */
export const F_Q_GUILT = "20% AD + 3% AP"
/** Q: Garen hồi 30% sát thương Q gây ra */
export const Q_HEAL = 0.3
export const F_E = "20 + 140% AD + 20% AP"
const E_GUILT = 3
/** R: phần cố định + từng này mỗi Tội (sát thương chuẩn) */
export const F_R = "80 + 100% AD + 20% AP"
export const R_PER_GUILT = 15

export const guiltOf = (g: Game, t: Unit) => g.statusV(t,
    GUILT)
/** Nội tại chụp lúc ra đòn, gây sau đòn chính (onAttackHit) để phần cộng thêm không chí mạng */
const pendingBonus = new WeakMap<AttackInfo, number>()
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
    id: "garen", name: "Garen", role: "fighter", damage: "physical", hp: 450, atk: 71, armor: 33, mr: 31,
    desc: "Tay đôi: kẻ đứng trước Garen cứ đánh là tự chất Tội lên mình, Garen chém vào Tội và Phán Quyết xả hết.",
    passive: {
        name: "Công Lý",
        desc: `Mỗi lần tướng địch đang đối diện thực hiện một đòn thường thật, dù trượt hoặc nhắm ai, nó nhận 1 Tội; cộng dồn vô hạn, làm mới 3 lượt của nó. Đòn Garen vào mục tiêu hợp lệ gây thêm sát thương vật lý bằng Tội × {${F_PASSIVE}}, không chí mạng.`,
    },
    hooks: {
        onAttack(g, me, d) {
            const a = d.attacker
            if (a.id === me.id) {
                const n = guiltOf(g,
                    d.target)
                if (n > 0 && !d.info.miss) pendingBonus.set(d.info,
                    n * g.f(me,
                        F_PASSIVE))
                return
            }
            // kẻ đối diện thực hiện đòn thường thật (kể cả trượt, nhắm ai cũng được): +1 Tội
            if (a.side !== me.side && !a.token && g.opposite(me)?.id === a.id) addGuilt(g,
                a,
                1)
        },
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id) return
            const extra = pendingBonus.get(d.info)
            pendingBonus.delete(d.info)
            if (!extra || d.target.status !== "board") return
            g.damage(me,
                d.target,
                extra,
                "physical",
                {
                    tag: "attack"
                })
        },
    },
    bot: {
        markValue: {
            guilt: 20,
        },
    },
    skills: {
        Q: {
            key: "Q", mana: 0, name: "Đòn Quyết Định", target: "opposite",
            desc: `Gây {${F_Q}} + Tội mục tiêu × {${F_Q_GUILT}} sát thương vật lý lên tướng đối diện. Garen hồi bằng 30% Máu và Khiên thực bị Q lấy đi; không tiêu Tội, không hồi từ overkill.`,
            resolve(c) {
                const t = c.target!
                const dealt = c.g.damage(c.self,
                    t,
                    c.f(F_Q) + guiltOf(c.g,
                        t) * c.f(F_Q_GUILT),
                    "physical",
                    {
                        tag: "skill"
                    })
                c.g.heal(c.self,
                    c.self,
                    dealt * Q_HEAL)
            },
        },
        E: {
            key: "E", mana: 0, name: "Phán Xét", target: "opposite",
            desc: `Gây {${F_E}} sát thương vật lý lên tướng đối diện, rồi thêm 3 Tội nếu mục tiêu còn hợp lệ; đây là một lá chiêu, không tạo ba đòn thường.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_E),
                    "physical",
                    {
                        tag: "skill"
                    })
                addGuilt(c.g,
                    t,
                    E_GUILT)
            },
        },
        R: {
            key: "R", mana: 0, name: "Phán Quyết Demacia", target: "opposite",
            desc: `Gây {${F_R}} + 15 mỗi Tội sát thương chuẩn lên tướng đối diện; giữ toàn bộ Tội.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_R) + guiltOf(c.g,
                        t) * R_PER_GUILT,
                    "true",
                    {
                        tag: "skill"
                    })
            },
        },
    },
})
