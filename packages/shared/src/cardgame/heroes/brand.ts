// Brand (Pháp sư, phép) V3: "Bỏng cháy mãi mãi, spam chiêu là cháy hết." Máu 320 · AD 98 · giáp/kháng 25/28 · AP gốc 78.
// Bỏng = status "burn" (v = số stack, vĩnh viễn FOREVER, cộng dồn, trần BURN_MAX). Nội tại: đầu lượt ĐỊCH, mỗi stack gây (1% máu tối đa của nó + 1% AD + 2% AP) sát thương phép.
// Q (10 mana) sát thương + 1 Bỏng, nó đang có từ 3 Bỏng thì Choáng · E (20) mọi địch sát thương + 1 Bỏng · R (50) mọi địch sát thương, rồi Bỏng nhân đôi và cháy ngay 1 lần.
// Cơ chế engine dùng: g.status (FOREVER, add, max), hook onTurnStart.
import type {
    Game
} from "../game"
import {
    pct
} from "../formula"
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
/** AP gốc (V3: bằng AD gốc cũ) */
export const BASE_AP = 78
/** Mỗi Bỏng cháy bấy nhiêu phần máu tối đa của tướng bị cháy */
export const TICK_MAX_HP = 0.01
/** Q: mục tiêu đang có từ bấy nhiêu Bỏng thì bị Choáng */
export const Q_STUN_BURN = 3
const F_TICK = "1% AD + 2% AP"
const F_Q = "35 + 45% AD + 90% AP"
const F_E = "20 + 10% AD + 30% AP"
const F_R = "60 + 20% AD + 50% AP"

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
/** Bỏng của t cháy 1 lần: mỗi stack gây (1% máu tối đa của t + 1% AD + 2% AP) sát thương phép */
export const burnTick = (g: Game, me: Unit, t: Unit) => {
    const n = g.statusV(t,
        BURN)
    if (n <= 0 || t.status !== "board") return
    g.damage(me,
        t,
        (t.maxHp * TICK_MAX_HP + g.f(me,
            F_TICK)) * n,
        "magic",
        {
            tag: "dot"
        })
}
/** Mọi tướng địch (không tính vật triệu hồi) */
const foes = (g: Game, me: Unit) => g.enemies(me).filter((u) => !u.token)

export default defineHero({
    id: "brand", name: "Brand", role: "mage", damage: "magic", hp: 320, atk: 98, armor: 25, mr: 28, ap: BASE_AP,
    bot: {
        markValue: {
            burn: 20,
        },
    },
    desc: "Bỏng cháy mãi mãi: Q rẻ để spam và Choáng kẻ đã cháy đủ, E rải lửa lên cả bàn, R nhân đôi mọi đống Bỏng rồi đốt ngay. Trận càng dài, địch càng cháy.",
    passive: {
        name: "Bùng Cháy",
        desc: `Bỏng không bao giờ hết và cộng dồn (tối đa ${BURN_MAX}). Đầu lượt của đối thủ: mỗi Bỏng gây ${pct(TICK_MAX_HP)}% máu tối đa của nó + {${F_TICK}} sát thương phép.`,
    },
    hooks: {
        onTurnStart(g, me, d) {
            if (d.side === me.side) return
            for (const t of foes(g,
                me)) burnTick(g,
                me,
                t)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Thiêu Rụi", target: "enemy", mana: 10,
            desc: `Chọn 1 tướng địch; gây {${F_Q}} sát thương phép và +1 Bỏng. Nếu nó đang có từ ${Q_STUN_BURN} Bỏng: Choáng nó 1 lượt.`,
            resolve(c) {
                const t = c.target!
                const had = c.g.statusV(t,
                    BURN)
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
                if (had >= Q_STUN_BURN) c.g.status(t,
                    "stun",
                    1)
            },
        },
        E: {
            key: "E", name: "Rải Lửa", target: "all_enemies", mana: 20,
            desc: `Mọi tướng địch nhận {${F_E}} sát thương phép và +1 Bỏng.`,
            resolve(c) {
                for (const t of foes(c.g,
                    c.self)) {
                    c.g.damage(c.self,
                        t,
                        c.f(F_E),
                        "magic",
                        {
                            tag: "skill"
                        })
                    ignite(c.g,
                        t,
                        1)
                }
            },
        },
        R: {
            key: "R", name: "Bão Lửa", target: "all_enemies", mana: 50,
            desc: `Mọi tướng địch nhận {${F_R}} sát thương phép, rồi Bỏng trên nó nhân đôi và cháy ngay 1 lần.`,
            resolve(c) {
                for (const t of foes(c.g,
                    c.self)) {
                    c.g.damage(c.self,
                        t,
                        c.f(F_R),
                        "magic",
                        {
                            tag: "skill"
                        })
                    const n = c.g.statusV(t,
                        BURN)
                    if (n > 0) ignite(c.g,
                        t,
                        n)
                    burnTick(c.g,
                        c.self,
                        t)
                }
            },
        },
    },
})
