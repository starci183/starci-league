// Kog'Maw (Xạ thủ, phép): máu 340 · AD 77 · AP gốc 0 · giáp/kháng 25/27. Chất: ĐÓI, trận càng dài, sống càng dai càng mạnh.
// Đói = bộ đếm (stack "hunger") VÔ HẠN, giữ qua chết: +1 đầu lượt của bạn khi Kog sống trên sân; +1 mỗi tướng thật khác chết khi Kog hiện diện;
// chính Kog chết thật: +3 Đói (thay cho +1). Vật triệu hồi chết và lần cứu chết không tính.
// Đòn thật trúng gây thêm % máu tối đa của mục tiêu theo Đói + một phần AD/AP (sát thương phép, gói riêng không chí mạng).
// Tuning v1: mana Q/E/R = 10/15/35; bỏ trần 20.
import {
    pct
} from "../formula"
import {
    defineHero
} from "../registry"

const HUNGER = "hunger"
const GORGE = "kog_e"
/** Kog'Maw chết thật: +bấy nhiêu Đói (thay cho +1, không mất Đói) */
export const DEATH_HUNGER = 3
/** % máu tối đa của mục tiêu mỗi Đói cho đòn đánh (E nhân đôi phần này) */
const ATTACK_PCT = 0.008
/** Phần cộng thêm cố định mỗi đòn đánh */
const F_ATTACK = "15 + 30% AD + 25% AP"
const F_Q = "70 + 155% AD + 45% AP"
const Q_HUNGER = 3
/** % máu tối đa mỗi Đói cho R */
const R_PCT = 0.015
const F_R = "35 + 50% AD + 50% AP"
/** E: hệ số nhân phần % máu tối đa × Đói */
const E_MULT = 2

export default defineHero({
    id: "kogmaw", name: "Kog'Maw", role: "marksman", damage: "magic", hp: 340, atk: 77, armor: 25, mr: 27,
    bot: {
        stackValue: {
            hunger: 10,
        },
    },
    desc: "Sống càng lâu càng đói: bắn theo % máu tối đa, tank càng trâu càng lủng.",
    passive: {
        name: "Đói Khát",
        desc: `Đầu lượt của bạn nếu Kog sống trên sân: +1 Đói. Mỗi tướng thật khác chết khi Kog hiện diện: +1 Đói; chính Kog chết thật: +${DEATH_HUNGER} Đói thay cho +1. Đói vô hạn, giữ qua chết. Mỗi đòn thật trúng gây thêm ${pct(ATTACK_PCT)}% Máu tối đa mục tiêu × Đói + {${F_ATTACK}} sát thương phép, không chí mạng.`,
    },
    hooks: {
        onTurnStart(g, me, d) {
            if (d.side === me.side && me.status === "board") g.stack(me,
                HUNGER,
                1)
        },
        onDeath(g, me, d) {
            if (d.victim.token) return
            g.stack(me,
                HUNGER,
                d.victim.id === me.id ? DEATH_HUNGER : 1)
        },
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss) return
            const n = g.stackOf(me,
                HUNGER)
            // gói phép riêng, không nhân chí mạng của đòn chính
            g.damage(me,
                d.target,
                d.target.maxHp * ATTACK_PCT * n * (g.has(me,
                    GORGE) ? E_MULT : 1) + g.f(me,
                    F_ATTACK),
                "magic",
                {
                    tag: "attack"
                })
        },
    },
    skills: {
        Q: {
            key: "Q", mana: 5, name: "Tạt Axit", target: "enemy",
            desc: `Chọn 1 tướng địch hợp lệ; gây {${F_Q}} sát thương phép, rồi nhận ${Q_HUNGER} Đói. Lá giải quyết hợp lệ vẫn tăng Đói nếu sát thương bị Khiên/miễn chặn; lá bị vô hiệu hoặc mất mục tiêu không tăng.`,
            resolve(c) {
                const t = c.target
                if (!t || t.status !== "board") return
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                c.g.stack(c.self,
                    HUNGER,
                    Q_HUNGER)
            },
        },
        E: {
            key: "E", mana: 10, name: "Xả Đạn", target: "self",
            desc: `Tới hết lượt hiện tại, nhân đôi riêng phần ${pct(ATTACK_PCT)}% Máu tối đa × Đói của mỗi đòn thật trúng; giữ nguyên phần {${F_ATTACK}}. Không tiêu Đói hoặc cấp đòn.`,
            resolve(c) {
                c.g.status(c.self,
                    GORGE,
                    1)
            },
        },
        R: {
            key: "R", mana: 30, name: "Đại Bác Sinh Học", target: "all_enemies",
            desc: `Mọi tướng địch trên sân nhận ${pct(R_PCT)}% Máu tối đa của chính nó × Đói + {${F_R}} sát thương phép. Chụp Đói một lần đầu lá; không tiêu Đói và không tăng các hit còn lại bằng mạng vừa kiếm trong cùng R.`,
            resolve(c) {
                // chụp Đói và danh sách mục tiêu đầu lá
                const n = c.g.stackOf(c.self,
                    HUNGER)
                const flat = c.f(F_R)
                for (const t of c.g.enemies(c.self).filter((x) => !x.token)) {
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
