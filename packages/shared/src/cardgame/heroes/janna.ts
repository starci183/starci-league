// Janna (Trợ thủ, phép): máu 760 · AD 56 · giáp/kháng 28/32.
// MỤC ĐÍCH: Làm chủ đòn đánh — đòn đánh của địch bị gió thổi trượt (Mù, số đòn trượt hiện trên tướng), đòn đánh của đồng đội được tiếp gió (đòn miễn phí).
// Mỗi đòn đánh của địch bị trượt thì tướng mình bị nhắm nhận Khiên. Mọi lá chơi trong lượt Janna (không Quick): đối thủ có trọn lượt để đọc bàn và trả lời.
// Đối thủ trả lời bằng: chuyển sang dùng chiêu (Mù chỉ chặn đòn đánh), hoặc bỏ 1 lá Đánh thường rẻ để "xả" Mù (nhưng lá đó phí và Janna được Khiên).
// Engine: marks (Mù là dấu hiện trên tướng địch). Cơ chế engine dùng: status "blind" (v = số đòn trượt), hook onAttack (info.miss), u.nextAttack free.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    Unit
} from "../types"

const F_CALM = "60 + 30% AP"
const F_Q = "70 + 40% AP"
const F_E = "80 + 40% AP"
const F_R = "90 + 40% AP"

/** Nội tại Mắt Gió: tướng mình bị nhắm bởi đòn đánh trượt nhận Khiên */
const calm = (g: Game, janna: Unit, ally: Unit | undefined) => { if (ally && ally.side === janna.side) g.shield(janna,
    ally,
    g.f(janna,
        F_CALM)) }
/** Thêm n đòn trượt (Mù) cho t, giữ tới hết lượt sau của nó */
const blind = (g: Game, t: Unit, n: number) => g.status(t,
    "blind",
    1,
    {
        v: n, add: true, max: 3
    })

export default defineHero({
    id: "janna", name: "Janna", role: "support", damage: "magic", hp: 690, atk: 53, armor: 28, mr: 32,
    skillCopies: {
        Q: 4, E: 3, R: 1
    },
    desc: "Hiện Thân Bão Tố: gió thổi đòn đánh của địch đi trượt, và tiếp gió cho đồng đội đánh miễn phí. Mỗi đòn trượt của địch thành Khiên cho đội.",
    passive: {
        name: "Mắt Gió",
        desc: `Mỗi khi một đòn đánh của địch nhắm tướng mình bị trượt (Mù), tướng bị nhắm nhận Khiên {${F_CALM}}.`,
    },
    hooks: {
        onAttack(g, me, d) {
            if (d.info.miss && d.attacker.side !== me.side && d.target.side === me.side) calm(g,
                me,
                d.target)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Gió Lốc", target: "enemy",
            desc: `1 tướng địch nhận {${F_Q}} sát thương phép và bị **Mù 1 đòn** (đòn đánh kế tiếp của nó trượt; số đòn hiện trên tướng, tối đa 3, hết sau lượt kế của nó). **Điều kiện:** mục tiêu là xạ thủ hoặc sát thủ thì Mù 2 đòn.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                const role = c.g.role(t)
                blind(c.g,
                    t,
                    role === "marksman" || role === "assassin" ? 2 : 1)
            },
        },
        E: {
            key: "E", name: "Mắt Bão", target: "ally",
            desc: `1 tướng mình nhận Khiên {${F_E}} và được 1 **đòn đánh miễn phí** (không cần lá Đánh thường). **Điều kiện:** tướng địch đối diện tướng đó đang bị Mù thì Khiên mạnh thêm 50%.`,
            resolve(c) {
                const t = c.target!
                const o = c.g.opposite(t)
                c.g.shield(c.self,
                    t,
                    c.f(F_E) * (o && c.g.has(o,
                        "blind") ? 1.5 : 1))
                if (!t.nextAttack.some((b) => b.id === "janna_e")) t.nextAttack.push({
                    id: "janna_e", source: c.self.id, free: true
                })
            },
        },
        R: {
            key: "R", name: "Gió Mùa", target: "all_allies",
            desc: `Mọi tướng mình hồi {${F_R}}; mọi tướng địch bị Mù 1 đòn. **Điều kiện:** đội bạn còn từ 3 mạng trở xuống thì mọi tướng địch bị Mù 2 đòn.`,
            resolve(c) {
                for (const u of c.g.heroes(c.side)) c.g.heal(c.self,
                    u,
                    c.f(F_R))
                const n = c.g.player(c.side).lives <= 3 ? 2 : 1
                for (const t of c.g.enemies(c.self)) blind(c.g,
                    t,
                    n)
            },
        },
    },
})
