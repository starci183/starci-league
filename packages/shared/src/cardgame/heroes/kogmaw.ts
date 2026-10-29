// Kog'Maw (Xạ thủ, phép): máu 340 · AD 116 · AP gốc 0 · giáp/kháng 25/27. Chất: ĐÓI, trận càng dài, sống càng dai càng mạnh.
// Đói = bộ đếm (stack "hunger", tối đa 20): +1 mỗi lượt Kog còn sống, +1 mỗi khi có tướng chết (bất kỳ phe); Kog chết thì mất nửa.
// Đòn đánh của Kog gây thêm % máu tối đa của mục tiêu theo Đói + một phần AD/AP (sát thương phép).
// AP gốc = AD cũ của tướng phép (đề xuất V3, đã vào engine: HeroDef.ap).
import {
    pct
} from "../formula"
import {
    defineHero
} from "../registry"

const HUNGER = "hunger"
const GORGE = "kog_e"
export const MAX_HUNGER = 20
/** % máu tối đa của mục tiêu mỗi Đói cho đòn đánh (E nhân đôi phần này) */
const ATTACK_PCT = 0.008
/** Phần cộng thêm cố định mỗi đòn đánh */
const F_ATTACK = "13 + 10% AD + 15% AP"
const F_Q = "74 + 80% AD + 40% AP"
const Q_HUNGER = 3
/** % máu tối đa mỗi Đói cho R */
const R_PCT = 0.015
const F_R = "42 + 30% AD + 50% AP"

export default defineHero({
    id: "kogmaw", name: "Kog'Maw", role: "marksman", damage: "magic", hp: 340, atk: 116, armor: 25, mr: 27,
    bot: {
        stackValue: {
            hunger: 10,
        },
    },
    desc: "Sống càng lâu càng đói: bắn theo % máu tối đa, tank càng trâu càng lủng.",
    passive: {
        name: "Đói Khát",
        desc: `Đầu lượt của bạn, Kog'Maw còn sống: +1 Đói. Có tướng chết (bất kỳ phe): +1 Đói (tối đa ${MAX_HUNGER}). Kog'Maw chết: mất nửa Đói. Đòn đánh của Kog'Maw gây thêm ${pct(ATTACK_PCT)}% máu tối đa của mục tiêu mỗi Đói + {${F_ATTACK}} sát thương phép.`,
    },
    hooks: {
        onTurnStart(g, me, d) {
            if (d.side === me.side) g.stack(me,
                HUNGER,
                1,
                MAX_HUNGER)
        },
        onDeath(g, me, d) {
            if (d.victim.token) return
            if (d.victim.id === me.id) g.setStack(me,
                HUNGER,
                Math.floor(g.stackOf(me,
                    HUNGER) / 2))
            else g.stack(me,
                HUNGER,
                1,
                MAX_HUNGER)
        },
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss) return
            const n = g.stackOf(me,
                HUNGER)
            d.info.bonus.push({
                raw: d.target.maxHp * ATTACK_PCT * n * (g.has(me,
                    GORGE) ? 2 : 1) + g.f(me,
                    F_ATTACK), kind: "magic"
            })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Tạt Axit", target: "enemy",
            desc: `Chọn 1 tướng địch; nó nhận {${F_Q}} sát thương phép, Kog'Maw +${Q_HUNGER} Đói.`,
            resolve(c) {
                c.g.damage(c.self,
                    c.target!,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                c.g.stack(c.self,
                    HUNGER,
                    Q_HUNGER,
                    MAX_HUNGER)
            },
        },
        E: {
            key: "E", name: "Xả Đạn", target: "self",
            desc: "Tới hết lượt này: phần % máu tối đa từ Đói trên mỗi đòn đánh của Kog'Maw nhân đôi.",
            resolve(c) {
                c.g.status(c.self,
                    GORGE,
                    1)
            },
        },
        R: {
            key: "R", name: "Đại Bác Sinh Học", target: "all_enemies",
            desc: `Mọi tướng địch nhận sát thương phép bằng ${pct(R_PCT)}% máu tối đa của chúng mỗi Đói + {${F_R}}.`,
            resolve(c) {
                const n = c.g.stackOf(c.self,
                    HUNGER)
                const flat = c.f(F_R)
                for (const t of c.g.enemies(c.self)) {
                    if (t.token) continue
                    c.g.damage(c.self,
                        t,
                        t.maxHp * R_PCT * n + flat,
                        "magic",
                        {
                            tag: "skill"
                        })
                }
            },
        },
    },
})
