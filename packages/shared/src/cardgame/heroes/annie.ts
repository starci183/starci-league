// Annie (Pháp sư, phép) V3: "Choáng rồi đốt": đếm Lửa tới Choáng, chiêu vào kẻ đang Choáng thì đau hơn. Máu 330 · AD 96 · giáp/kháng 25/28 · AP gốc 0.
// Lửa = stack "fire" trên Annie. Mỗi chiêu +1 Lửa; đủ FIRE_MAX Lửa thì chiêu kế tiếp Choáng đúng mục tiêu của nó rồi Lửa về 0.
// Q, E, R gây thêm 50% sát thương lên địch đang Choáng. Q (10 mana) sát thương · E (15, Quick) Khiên, bẫy Quick khi đủ Lửa · R (50) Tibbers vồ mọi địch.
// Tibbers không chiếm đường: chỉ là cú vồ của R. Cơ chế engine dùng: g.chainFx().cancel, status "stun".
import {
    pct
} from "../formula"
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
/** Đủ bấy nhiêu Lửa thì chiêu kế tiếp Choáng mục tiêu */
export const FIRE_MAX = 4
/** Sát thương cộng thêm của Q/E/R lên địch đang Choáng */
export const STUN_BONUS = 0.5
const F_Q = "119 + 20% AD + 80% AP"
const F_E_SHIELD = "97 + 20% AD + 50% AP"
const F_E_TRAP = "84 + 10% AD + 60% AP"
const F_R = "194 + 30% AD + 100% AP"

/** Đếm Lửa cho 1 chiêu có mục tiêu: đủ Lửa thì trả true (chiêu này Choáng mục tiêu) và Lửa về 0, chưa đủ thì +1 Lửa */
function charge(g: Game, me: Unit): boolean {
    if (g.stackOf(me,
        FIRE) >= FIRE_MAX) {
        g.setStack(me,
            FIRE,
            0)
        return true
    }
    g.stack(me,
        FIRE,
        1,
        FIRE_MAX)
    return false
}
/** Sát thương nền raw, thêm 50% nếu t đang Choáng */
const boosted = (g: Game, t: Unit, raw: number) => raw * (g.has(t,
    "stun") ? 1 + STUN_BONUS : 1)
const foes = (g: Game, me: Unit) => g.enemies(me).filter((u) => !u.token)

export default defineHero({
    id: "annie", name: "Annie", role: "mage", damage: "magic", hp: 330, atk: 96, armor: 25, mr: 28,
    bot: {
        stackValue: {
            fire: 14,
        },
    },
    desc: "Choáng rồi đốt: mỗi chiêu nạp Lửa, đủ 4 Lửa thì chiêu kế tiếp Choáng mục tiêu, và chiêu của Annie đánh vào kẻ đang Choáng thì đau hơn. E là Khiên và bẫy Quick, R cho Tibbers vồ cả đội.",
    passive: {
        name: "Lửa Tibbers",
        desc: `Mỗi chiêu của Annie +1 Lửa (tối đa ${FIRE_MAX}). Đủ ${FIRE_MAX} Lửa: chiêu kế tiếp Choáng đúng mục tiêu của nó và Lửa về 0. Q, E, R gây thêm ${pct(STUN_BONUS)}% sát thương lên tướng địch đang Choáng.`,
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
            desc: `Chọn 1 tướng địch; gây {${F_Q}} sát thương phép.`,
            resolve(c) {
                const t = c.target!
                if (charge(c.g,
                    c.self)) c.g.status(t,
                    "stun",
                    1)
                c.g.damage(c.self,
                    t,
                    boosted(c.g,
                        t,
                        c.f(F_Q)),
                    "magic",
                    {
                        tag: "skill"
                    })
            },
        },
        E: {
            key: "E", name: "Lá Chắn Cháy", target: "self", mana: 15, quick: true,
            desc: `Quick. Annie nhận Khiên {${F_E_SHIELD}}. Nếu dùng để đáp lại lá hoặc đòn đánh của địch nhắm vào Annie khi đang đủ ${FIRE_MAX} Lửa: Vô Hiệu nó, Choáng kẻ tung nó và gây {${F_E_TRAP}} sát thương phép lên kẻ đó; Lửa về 0.`,
            quickWhen: (c) => c.trigger.side !== c.side && c.trigger.target === c.self.id,
            resolve(c) {
                const g = c.g
                const me = c.self
                g.shield(me,
                    me,
                    c.f(F_E_SHIELD))
                const foe = c.trigger ? g.unit(c.trigger.actor) : undefined
                if (c.trigger && foe && foe.side !== me.side && c.trigger.target === me.id && g.stackOf(me,
                    FIRE) >= FIRE_MAX) {
                    g.setStack(me,
                        FIRE,
                        0)
                    g.chainFx().cancel = true
                    g.status(foe,
                        "stun",
                        1)
                    g.damage(me,
                        foe,
                        boosted(g,
                            foe,
                            c.f(F_E_TRAP)),
                        "magic",
                        {
                            tag: "skill"
                        })
                    return
                }
                g.stack(me,
                    FIRE,
                    1,
                    FIRE_MAX)
            },
        },
        R: {
            key: "R", name: "Tibbers Dậy", target: "all_enemies", mana: 50,
            desc: `Tibbers vồ mọi tướng địch, gây {${F_R}} sát thương phép. Tướng đang Choáng nhận thêm sát thương; tướng chưa Choáng thì bị Choáng 1 lượt.`,
            resolve(c) {
                const charged = charge(c.g,
                    c.self)
                for (const t of foes(c.g,
                    c.self)) {
                    if (charged) c.g.status(t,
                        "stun",
                        1)
                    const was = c.g.has(t,
                        "stun")
                    c.g.damage(c.self,
                        t,
                        boosted(c.g,
                            t,
                            c.f(F_R)),
                        "magic",
                        {
                            tag: "skill"
                        })
                    if (!was) c.g.status(t,
                        "stun",
                        1)
                }
            },
        },
    },
})
