// Miss Fortune (Xạ thủ, vật lý): máu 340 · AD 116 · giáp/kháng 25/26.
// CHẤT: "Mưa đạn". Đổi mục tiêu liên tục, bắn cả bàn.
// Nội tại: đòn đầu tiên lên mỗi địch khác nhau trong lượt thêm sát thương (g.oncePerTurn theo mục tiêu).
// Q nảy sang địch thứ hai, E (Quick) rải sát thương + Vết Thương Sâu, R bắn hai nhịp (nhịp hai bằng g.delay cuối lượt địch, bị khống chế trước đó thì huỷ).
// Đối thủ trả lời: Janna, Braum, Annie (khống chế MF huỷ nhịp hai), dồn MF chết.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    otherSide, type Unit
} from "../types"

/** Cờ nhịp hai của R đang chờ (stack, 1 = còn, 0 = đã huỷ/đã nổ) */
export const RAIN = "mf_rain"
export const F_PASSIVE = "20 + 50% AD + 10% AP"
export const F_Q = "40 + 90% AD + 20% AP"
export const F_E = "20 + 30% AD + 20% AP"
export const F_R = "40 + 60% AD + 20% AP"
/** Q: nảy sang địch khác nhận ×1.5 (×2 nếu phát đầu hạ gục) */
export const BOUNCE = 1.5
export const BOUNCE_KILL = 2
/** Các trạng thái được coi là khống chế MF */
const CONTROL = ["stun",
    "silence",
    "blind",
    "disarm"]

const foes = (g: Game, me: Unit) => g.enemies(me).filter((u) => !u.token)

export default defineHero({
    id: "missfortune", name: "Miss Fortune", role: "marksman", damage: "physical", hp: 340, atk: 116, armor: 25, mr: 26,
    bot: {
        stackValue: {
            mf_rain: 60,
        },
    },
    desc: "Mưa đạn: đổi mục tiêu liên tục, bắn cả bàn. Q nảy đạn, E rải và cắt hồi máu, R hai nhịp bão đạn.",
    passive: {
        name: "Cú Bắn Tình Yêu",
        desc: `Mỗi lượt, đòn đánh đầu tiên của Miss Fortune lên mỗi địch khác nhau gây thêm {${F_PASSIVE}} sát thương vật lý.`,
    },
    hooks: {
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss || d.target.token) return
            if (!g.oncePerTurn(me,
                `first:${d.target.id}`)) return
            d.info.bonus.push({
                raw: g.f(me,
                    F_PASSIVE), kind: "physical"
            })
        },
        onBeforeStatus(g, me, d) {
            // bị khống chế trước khi nhịp hai nổ: huỷ nhịp hai
            if (d.unit.id !== me.id || d.cancel || !CONTROL.includes(d.id)) return
            if (g.stackOf(me,
                RAIN) > 0) g.setStack(me,
                RAIN,
                0)
        },
        onDeath(g, me, d) {
            if (d.victim.id === me.id) g.setStack(me,
                RAIN,
                0)
        },
        onDelayed(g, me, d) {
            if (d.key !== "rain") return
            const live = g.stackOf(me,
                RAIN) > 0
            g.setStack(me,
                RAIN,
                0)
            if (!live) return
            for (const t of foes(g,
                me)) {
                g.damage(me,
                    t,
                    g.f(me,
                        F_R),
                    "physical",
                    {
                        tag: "skill"
                    })
            }
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Bắn Nảy", target: "enemy",
            desc: `Chọn 1 tướng địch; nó nhận {${F_Q}} sát thương vật lý. Đạn nảy sang 1 địch khác ngẫu nhiên, nhận ×${BOUNCE} lượng đó (×${BOUNCE_KILL} nếu phát đầu hạ gục).`,
            resolve(c) {
                const g = c.g
                const t = c.target!
                const raw = c.f(F_Q)
                g.damage(c.self,
                    t,
                    raw,
                    "physical",
                    {
                        tag: "skill"
                    })
                const killed = t.status !== "board"
                const next = g.pick(g.targetableEnemies(c.self).filter((u) => !u.token && u.id !== t.id))
                if (next) {
                    g.log(`Miss Fortune Q: đạn nảy ngẫu nhiên sang ${g.nameOf(next)}`)
                    g.damage(c.self,
                        next,
                        raw * (killed ? BOUNCE_KILL : BOUNCE),
                        "physical",
                        {
                            tag: "skill"
                        })
                }
            },
        },
        E: {
            key: "E", name: "Mưa Đạn", target: "all_enemies", quick: true,
            desc: `Quick. Mọi tướng địch nhận {${F_E}} sát thương vật lý và bị Vết Thương Sâu đến hết lượt sau.`,
            resolve(c) {
                const g = c.g
                // đánh trong lượt mình: hết ở cuối lượt địch kế; đánh Quick trong lượt địch: kéo thêm 1 lượt
                const turns = g.s.active === c.side ? 1 : 2
                for (const t of foes(g,
                    c.self)) {
                    g.damage(c.self,
                        t,
                        c.f(F_E),
                        "physical",
                        {
                            tag: "skill"
                        })
                    g.status(t,
                        "grievous",
                        turns)
                }
            },
        },
        R: {
            key: "R", name: "Bão Đạn", target: "all_enemies",
            desc: `Mọi tướng địch nhận {${F_R}} sát thương vật lý ngay và một lần nữa vào cuối lượt địch. Nếu Miss Fortune bị khống chế trước khi lần hai nổ thì lần hai bị huỷ.`,
            resolve(c) {
                const g = c.g
                for (const t of foes(g,
                    c.self)) {
                    g.damage(c.self,
                        t,
                        c.f(F_R),
                        "physical",
                        {
                            tag: "skill"
                        })
                }
                g.setStack(c.self,
                    RAIN,
                    1)
                g.delay(c.self,
                    "rain",
                    "turnEnd",
                    otherSide(c.side))
            },
        },
    },
})
