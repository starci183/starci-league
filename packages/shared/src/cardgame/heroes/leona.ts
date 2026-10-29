// Leona (Đỡ đòn, phép): máu 1000 · AD 62 · giáp/kháng 40/38.
// MỤC ĐÍCH: Khoá chặt một mục tiêu cho cả đội — Leona chất Ánh Dương (dấu có stack, hiện trên tướng địch), đồng đội đánh trúng thì dấu nổ;
// đủ 3 Ánh Dương thì nổ kèm Choáng. E lao tới đối diện mục tiêu (đổi đường). Mọi lá chơi trong lượt Leona (không Quick).
// Đối thủ trả lời bằng: Ánh Dương hết sau lượt kế của mục tiêu -> chặn/làm Mù/hạ đồng đội định kích nổ, hoặc chịu mất 1 lượt né (không cho ai đánh trúng).
// Engine: marks, lanes. Cơ chế engine dùng: status có v (stack), hook onDamage, g.moveTo.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    Unit
} from "../types"

const SUN = "sunlight"
const SUN_MAX = 3
const F_SUN = "45 + 60% Giáp + 20% AP"
const F_Q = "50 + 40% AP"
const F_E = "60 + 40% AP"
const F_R = "120 + 40% AP"

/** Thêm n Ánh Dương (tối đa 3), giữ tới hết lượt sau của chủ mục tiêu */
export function addSun(g: Game, t: Unit, n: number) {
    if (t.status !== "board") return
    g.status(t,
        SUN,
        2,
        {
            v: n, add: true, max: SUN_MAX
        })
}
export default defineHero({
    id: "leona", name: "Leona", role: "tank", damage: "magic", hp: 1330, atk: 73, armor: 40, mr: 38,
    skillCopies: {
        Q: 6, E: 5, R: 2
    },
    desc: "Bình Minh Rực Rỡ: chất Ánh Dương lên một kẻ địch cho đồng đội kích nổ, và lao tới đối diện kẻ đã mang dấu để Choáng nó.",
    passive: {
        name: "Ánh Dương",
        desc: `Chiêu của Leona gắn **Ánh Dương** (tối đa ${SUN_MAX}, hiện trên tướng, giữ tới hết lượt sau của nó). Khi một đồng minh khác của Leona (kể cả vật triệu hồi) gây sát thương bằng đòn đánh hoặc chiêu lên tướng có Ánh Dương, mọi Ánh Dương nổ: mỗi dấu gây {${F_SUN}} sát thương phép; nổ đủ ${SUN_MAX} dấu thì tướng đó bị Choáng 1 lượt.`,
    },
    hooks: {
        onDamage(g, me, d) {
            if (!d.src || d.src.side !== me.side || d.src.id === me.id || (d.tag !== "attack" && d.tag !== "skill")) return
            const t = d.target
            const n = g.statusV(t,
                SUN)
            if (n <= 0 || t.status !== "board") return
            g.removeStatus(t,
                SUN)
            g.damage(me,
                t,
                g.f(me,
                    F_SUN) * n,
                "magic",
                {
                    tag: "effect"
                })
            if (n >= SUN_MAX) g.status(t,
                "stun",
                1)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Khiên Bình Minh", target: "opposite",
            desc: `Đánh thường tướng đối diện ngay (không cần lá Đánh thường), thêm {${F_Q}} sát thương phép, gắn 2 Ánh Dương. **Điều kiện:** tướng đó đã có Ánh Dương từ trước thì bị Choáng 1 lượt.`,
            resolve(c) {
                const t = c.target!
                const lit = c.g.has(t,
                    SUN)
                c.g.attack(c.self,
                    t,
                    {
                        free: true, bonusRaw: c.f(F_Q)
                    })
                addSun(c.g,
                    t,
                    2)
                if (lit) c.g.status(t,
                    "stun",
                    1)
            },
        },
        E: {
            key: "E", name: "Thiên Đỉnh Kiếm", target: "enemy",
            desc: `Leona lao tới đường đối diện 1 tướng địch, gây {${F_E}} sát thương phép và gắn 1 Ánh Dương. **Điều kiện:** mục tiêu đã có Ánh Dương từ trước thì bị Choáng 1 lượt.`,
            resolve(c) {
                const t = c.target!
                const lit = c.g.has(t,
                    SUN)
                if (t.lane >= 0 && t.lane < 5 && c.g.isOpen(t.lane)) c.g.moveTo(c.self,
                    t.lane)
                c.g.damage(c.self,
                    t,
                    c.f(F_E),
                    "magic",
                    {
                        tag: "skill"
                    })
                addSun(c.g,
                    t,
                    1)
                if (lit) c.g.status(t,
                    "stun",
                    1)
            },
        },
        R: {
            key: "R", name: "Thái Dương Hạ San", target: "enemies_upto", max: 3,
            desc: `Tối đa 3 tướng địch nhận {${F_R}} sát thương phép và được chất đầy ${SUN_MAX} Ánh Dương. **Điều kiện:** tướng đã có Ánh Dương từ trước thì bị Choáng 1 lượt ngay.`,
            resolve(c) {
                for (const t of c.targets) {
                    const lit = c.g.has(t,
                        SUN)
                    c.g.damage(c.self,
                        t,
                        c.f(F_R),
                        "magic",
                        {
                            tag: "skill"
                        })
                    addSun(c.g,
                        t,
                        SUN_MAX)
                    if (lit) c.g.status(t,
                        "stun",
                        1)
                }
            },
        },
    },
})
