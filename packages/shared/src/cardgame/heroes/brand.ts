// Brand (Pháp sư, phép) V2: "Bỏng cháy mãi mãi, spam chiêu là cháy hết."
// Bỏng = status "burn" (v = số stack, vĩnh viễn FOREVER, cộng dồn, trần BURN_MAX). Nội tại: đầu lượt ĐỊCH, mỗi stack gây sát thương phép.
// Q (10 mana) sát thương + 1 Bỏng · E (20) mọi địch +1 Bỏng · R (50) nhân đôi Bỏng trên mọi địch.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    Unit
} from "../types"
import {
    FOREVER
} from "../types"

export const BURN = "burn"
/** Trần stack Bỏng trên một tướng (cân bằng: R nhân đôi nên cần trần) */
export const BURN_MAX = 12
const F_TICK = "10 + 4% AP"
const F_Q = "35 + 95% AD + 40% AP"

/** Thêm n stack Bỏng (không bao giờ hết) */
export const ignite = (g: Game, t: Unit, n: number) => {
    if (t.status !== "board" || t.token || n <= 0) return
    g.status(t,
        BURN,
        1,
        {
            v: n, add: true, max: BURN_MAX, until: FOREVER
        })
}
/** Mọi tướng địch (không tính vật triệu hồi) */
const foes = (g: Game, me: Unit) => g.enemies(me).filter((u) => !u.token)

export default defineHero({
    id: "brand", name: "Brand", role: "mage", damage: "magic", hp: 310, atk: 78, armor: 28, mr: 30,
    bot: {
        markValue: {
            burn: 20,
        },
    },
    desc: "Bỏng cháy mãi mãi: Q rẻ để spam, E rải lửa lên cả bàn, R nhân đôi mọi đống Bỏng. Trận càng dài, địch càng cháy.",
    passive: {
        name: "Bùng Cháy",
        desc: `Bỏng không bao giờ hết và cộng dồn (tối đa ${BURN_MAX}). Đầu lượt của đối thủ: mỗi tướng địch nhận {${F_TICK}} sát thương phép cho mỗi Bỏng trên nó.`,
    },
    hooks: {
        onTurnStart(g, me, d) {
            if (d.side === me.side) return
            for (const t of foes(g,
                me)) {
                const n = g.statusV(t,
                    BURN)
                if (n > 0) {
                    g.damage(me,
                        t,
                        g.f(me,
                            F_TICK) * n,
                        "magic",
                        {
                            tag: "dot"
                        })
                }
            }
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Thiêu Rụi", target: "enemy", mana: 10,
            desc: `Chọn 1 tướng địch; gây {${F_Q}} sát thương phép và +1 Bỏng.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                ignite(c.g,
                    t,
                    1)
            },
        },
        E: {
            key: "E", name: "Rải Lửa", target: "all_enemies", mana: 20,
            desc: "Mọi tướng địch +1 Bỏng.",
            resolve(c) {
                for (const t of foes(c.g,
                    c.self)) ignite(c.g,
                    t,
                    1)
            },
        },
        R: {
            key: "R", name: "Bão Lửa", target: "all_enemies", mana: 50,
            desc: "Nhân đôi Bỏng trên mọi tướng địch.",
            resolve(c) {
                for (const t of foes(c.g,
                    c.self)) {
                    const n = c.g.statusV(t,
                        BURN)
                    if (n > 0) ignite(c.g,
                        t,
                        n)
                }
            },
        },
    },
})
