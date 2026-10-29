// Annie (Pháp sư, phép) V2: "Đếm đến Tibbers": mỗi phép là một que diêm, đủ 5 Lửa là gấu dậy vồ cả đội địch.
// Lửa = stack "fire" trên Annie. Tibbers KHÔNG chiếm đường: hiện ra, đánh mọi địch, biến mất.
// Q (10 mana) sát thương + 1 Lửa · E (20) +2 Lửa · R (40) Tibbers dậy ngay, sát thương ×(1 + Lửa), Lửa về 0.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    Unit
} from "../types"

export const FIRE = "fire"
/** Đủ bấy nhiêu Lửa thì Tibbers tự vồ */
export const FIRE_MAX = 5
/** Sát thương nền của Tibbers; vồ nội tại ×2, R ×(1 + Lửa) */
const F_BEAR = "25 + 65% AD + 40% AP"
const POUNCE_MULT = 2
const F_Q = "35 + 85% AD + 40% AP"

/** Tibbers hiện ra vồ mọi địch với hệ số mult rồi biến mất; Lửa về 0 */
function pounce(g: Game, me: Unit, mult: number) {
    for (const t of g.enemies(me).filter((u) => !u.token)) {
        g.damage(me,
            t,
            g.f(me,
                F_BEAR) * mult,
            "magic",
            {
                tag: "skill"
            })
    }
    g.setStack(me,
        FIRE,
        0)
}
/** Cộng Lửa; đủ 5 thì Tibbers vồ (nội tại) */
function addFire(g: Game, me: Unit, n: number) {
    if (me.status !== "board") return
    g.stack(me,
        FIRE,
        n)
    if (g.stackOf(me,
        FIRE) >= FIRE_MAX) pounce(g,
        me,
        POUNCE_MULT)
}

export default defineHero({
    id: "annie", name: "Annie", role: "mage", damage: "magic", hp: 350, atk: 74, armor: 28, mr: 30,
    bot: {
        stackValue: {
            fire: 14,
        },
    },
    desc: "Đếm đến Tibbers: Q và E nạp Lửa, đủ 5 Lửa thì gấu dậy vồ cả đội địch rồi biến mất. R gọi gấu dậy sớm, càng nhiều Lửa càng đau.",
    passive: {
        name: "Lửa Tibbers",
        desc: `Annie có Lửa. Đủ ${FIRE_MAX} Lửa: Tibbers hiện ra, mọi tướng địch nhận {${F_BEAR}} sát thương phép ×${POUNCE_MULT}, rồi Tibbers biến mất và Lửa về 0.`,
    },
    hooks: {
        onDeath(g, me, d) {
            if (d.victim.id === me.id) g.setStack(me,
                FIRE,
                0)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Phi Tiêu Lửa", target: "enemy", mana: 10,
            desc: `Chọn 1 tướng địch; gây {${F_Q}} sát thương phép và +1 Lửa.`,
            resolve(c) {
                c.g.damage(c.self,
                    c.target!,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                addFire(c.g,
                    c.self,
                    1)
            },
        },
        E: {
            key: "E", name: "Lá Chắn Cháy", target: "self", mana: 15,
            desc: "+2 Lửa.",
            resolve(c) {
                addFire(c.g,
                    c.self,
                    2)
            },
        },
        R: {
            key: "R", name: "Tibbers Dậy", target: "all_enemies", mana: 40,
            desc: `Tibbers dậy ngay: mọi tướng địch nhận {${F_BEAR}} sát thương phép ×(1 + Lửa đang có). Lửa về 0.`,
            resolve(c) {
                pounce(c.g,
                    c.self,
                    1 + c.g.stackOf(c.self,
                        FIRE))
            },
        },
    },
})
