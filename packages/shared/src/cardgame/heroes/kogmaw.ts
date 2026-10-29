// Kog'Maw (Xạ thủ, phép): máu 400 · AD 70 · giáp/kháng 24/28. Chất: ĐÓI, trận càng dài, sống càng dai càng mạnh.
// Đói = bộ đếm (stack "hunger", tối đa 20): +1 mỗi lượt Kog còn sống, +1 mỗi khi có tướng chết (bất kỳ phe); Kog chết thì mất nửa.
// Đòn đánh của Kog gây thêm % máu tối đa của mục tiêu theo Đói (sát thương phép).
import {
    pct
} from "../formula"
import {
    defineHero
} from "../registry"

const HUNGER = "hunger"
const GORGE = "kog_e"
export const MAX_HUNGER = 20
/** % máu tối đa của mục tiêu mỗi Đói cho đòn đánh (E nhân đôi) */
const ATTACK_PCT = 0.026
/** % máu tối đa mỗi Đói cho R */
const R_PCT = 0.045

export default defineHero({
    id: "kogmaw", name: "Kog'Maw", role: "marksman", damage: "magic", hp: 380, atk: 84, armor: 28, mr: 28,
    bot: {
        stackValue: {
            hunger: 10,
        },
    },
    desc: "Sống càng lâu càng đói: bắn theo % máu tối đa, tank càng trâu càng lủng.",
    passive: {
        name: "Đói Khát",
        desc: `Đầu lượt của bạn, Kog'Maw còn sống: +1 Đói. Có tướng chết (bất kỳ phe): +1 Đói. Đòn đánh của Kog'Maw gây thêm ${pct(ATTACK_PCT)}% máu tối đa của mục tiêu mỗi Đói (sát thương phép, tối đa ${MAX_HUNGER} Đói). Kog'Maw chết: mất nửa Đói.`,
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
            if (n <= 0) return
            d.info.bonus.push({
                raw: d.target.maxHp * ATTACK_PCT * n * (g.has(me,
                    GORGE) ? 2 : 1), kind: "magic"
            })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Nuôi Dưỡng", target: "self",
            desc: "Kog'Maw +3 Đói.",
            resolve(c) {
                c.g.stack(c.self,
                    HUNGER,
                    3,
                    MAX_HUNGER)
            },
        },
        E: {
            key: "E", name: "Xả Đạn", target: "self",
            desc: "Tới hết lượt này: mỗi đòn đánh của Kog'Maw gây gấp đôi % máu tối đa từ Đói.",
            resolve(c) {
                c.g.status(c.self,
                    GORGE,
                    1)
            },
        },
        R: {
            key: "R", name: "Đại Bác Sinh Học", target: "all_enemies",
            desc: `Mọi tướng địch nhận sát thương phép bằng ${pct(R_PCT)}% máu tối đa của chúng mỗi Đói của Kog'Maw.`,
            resolve(c) {
                const n = c.g.stackOf(c.self,
                    HUNGER)
                if (n <= 0) return
                for (const t of c.g.enemies(c.self)) {
                    if (t.token) continue
                    c.g.damage(c.self,
                        t,
                        t.maxHp * R_PCT * n,
                        "magic",
                        {
                            tag: "skill"
                        })
                }
            },
        },
    },
})
