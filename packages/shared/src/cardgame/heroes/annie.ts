// Annie (Pháp sư, phép) V3: "Choáng rồi đốt": đếm Lửa tới Choáng, chiêu vào kẻ đang Choáng thì đau hơn. Máu 350 · AD 69 · giáp/kháng 25/28 · AP gốc 0.
// Lửa = stack "fire" trên Annie. Chiêu giải quyết khi chưa đầy +1 Lửa (đầy ở FIRE_MAX). Q/R khi đã đủ Lửa: tiêu cả 4 để thử Choáng TRƯỚC sát thương (không nạp lại).
// E chỉ tiêu Lửa khi phản ứng hợp lệ; E chủ động khi đầy Lửa chỉ cho Khiên và giữ 4 Lửa. Chết thật: Lửa về 0.
// Chỉ sát thương chiêu gốc của Annie lên mục tiêu THỰC SỰ đang Choáng nhân 1,5.
// Choáng theo law.md §4: d đơn vị = floor(d) chắc chắn + Bernoulli(phần lẻ) thêm 1; mỗi mục tiêu thử đúng 1 lần, bị chặn không thử lại.
// Mana bể chung (starci-33 tuning v1): Q 20 · E 25 · R 50. Tibbers không chiếm đường: chỉ là cú vồ của R.
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
import {
    otherSide
} from "../types"

export const FIRE = "fire"
/** Đủ bấy nhiêu Lửa thì Q/R/E phản ứng tiêu Lửa để thử Choáng */
export const FIRE_MAX = 4
/** Sát thương chiêu gốc cộng thêm lên địch đang Choáng */
export const STUN_BONUS = 0.5
/** Q/E: Choáng d = 0,9 + 0,001 AD + 0,002 AP (g.scaling: ad/ap theo 100 điểm) */
export const STUN_QE = {
    base: 0.9, ad: 0.1, ap: 0.2
}
/** R: Choáng d = 0,75 + 0,0005 AD + 0,0015 AP */
export const STUN_R = {
    base: 0.75, ad: 0.05, ap: 0.15
}
const F_Q = "120 + 30% AD + 80% AP"
const F_E_SHIELD = "95 + 30% AD + 50% AP"
const F_E_TRAP = "85 + 15% AD + 60% AP"
const F_R = "165 + 40% AD + 100% AP"

/**
 * Thử Choáng d đơn vị (law.md §4) đúng 1 lần: xét miễn/chặn trước, rồi floor(d) chắc chắn + phần lẻ thêm 1 đơn vị (engine tung).
 * Một đơn vị: từ Draw của phe người tung tới hết lượt đối thủ (tung trong lượt đối thủ thì phần còn lại của lượt đó là đơn vị đầu).
 */
export function tryStun(g: Game, me: Unit, t: Unit, d: { base: number; ad: number; ap: number }): void {
    if (t.status !== "board" || t.token) return
    if (t.side !== me.side && (g.has(t,
        "stasis") || g.s.immune?.includes(t.id))) return
    const x = g.scaling(me,
        d)
    if (x <= 0) return
    // engine tung phần lẻ đúng 1 lần sau kiểm tra miễn/chặn (CC_STATUSES)
    g.status(t,
        "stun",
        x,
        {
            of: otherSide(me.side)
        })
}

/** Đủ Lửa: tiêu cả 4, trả true (chiêu này thử Choáng trước sát thương). Chưa đủ: trả false (nạp Lửa sau khi chiêu giải quyết). */
function consumeFire(g: Game, me: Unit): boolean {
    if (g.stackOf(me,
        FIRE) < FIRE_MAX) return false
    g.setStack(me,
        FIRE,
        0)
    return true
}
/** Chiêu giải quyết thành công khi chưa đầy: +1 Lửa (tối đa FIRE_MAX) */
const chargeFire = (g: Game, me: Unit) => g.stack(me,
    FIRE,
    1,
    FIRE_MAX)
/** Sát thương nền raw, nhân 1,5 nếu t thực sự đang Choáng */
const boosted = (g: Game, t: Unit, raw: number) => raw * (g.has(t,
    "stun") ? 1 + STUN_BONUS : 1)
const foes = (g: Game, me: Unit) => g.enemies(me).filter((u) => !u.token)

export default defineHero({
    id: "annie", name: "Annie", role: "mage", damage: "magic", hp: 350, atk: 69, armor: 25, mr: 28,
    bot: {
        stackValue: {
            fire: 14,
        },
    },
    desc: "Choáng rồi đốt: mỗi chiêu nạp Lửa, đủ 4 Lửa thì Q/R tiêu Lửa để Choáng trước khi đốt, và chiêu của Annie đánh vào kẻ đang Choáng thì đau hơn. E là Khiên và bẫy Quick, R cho Tibbers vồ cả đội.",
    passive: {
        name: "Lửa Tibbers",
        desc: `Chiêu giải quyết thành công khi chưa đầy nạp 1 Lửa, đầy ở ${FIRE_MAX}. Q/R khi đã có ${FIRE_MAX} Lửa tiêu cả ${FIRE_MAX} để thử Choáng trước sát thương; E chỉ tiêu khi phản ứng hợp lệ. Chỉ sát thương chiêu gốc của Annie lên mục tiêu thực sự đang Choáng nhân ${1 + STUN_BONUS} (thêm ${pct(STUN_BONUS)}%); không phải buff toàn đội.`,
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
            key: "Q", name: "Phi Tiêu Lửa", target: "enemy", mana: 20,
            desc: `Chọn 1 tướng địch ở bất kỳ đường, gây {${F_Q}} sát thương phép. Nếu đầy Lửa từ trước, tiêu Lửa rồi thử Choáng d = 0,9 + 0,001 AD + 0,002 AP đơn vị trước sát thương; chỉ mục tiêu đã thực sự Choáng mới nhận thưởng nội tại.`,
            resolve(c) {
                const t = c.target!
                const charged = consumeFire(c.g,
                    c.self)
                if (charged) tryStun(c.g,
                    c.self,
                    t,
                    STUN_QE)
                c.g.damage(c.self,
                    t,
                    boosted(c.g,
                        t,
                        c.f(F_Q)),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (!charged) chargeFire(c.g,
                    c.self)
            },
        },
        E: {
            key: "E", name: "Lá Chắn Cháy", target: "self", mana: 25, quick: true,
            desc: `Quick. Khi địch chỉ định đơn Annie bằng lá hoặc đòn đánh (mắt xích trên cùng), bạn có thể dùng lá này. Annie nhận {${F_E_SHIELD}} Khiên trắng tới hết lượt đối phương kế tiếp. Nếu đáp lại khi đầy ${FIRE_MAX} Lửa: tiêu ${FIRE_MAX} Lửa để hủy mắt xích đó, thử Choáng kẻ tung còn hợp lệ với d = 0,9 + 0,001 AD + 0,002 AP đơn vị rồi phản công {${F_E_TRAP}} sát thương phép. Dùng chủ động khi đầy Lửa: chỉ nhận Khiên, giữ ${FIRE_MAX} Lửa.`,
            quickWhen: (c) => c.trigger.side !== c.side && !!c.trigger.single && c.trigger.target === c.self.id,
            resolve(c) {
                const g = c.g
                const me = c.self
                // Khiên trắng có hạn: tới hết lượt đối phương kế tiếp
                g.shield(me,
                    me,
                    c.f(F_E_SHIELD),
                    {
                        turns: 1, of: otherSide(me.side)
                    })
                const foe = c.trigger ? g.unit(c.trigger.actor) : undefined
                if (c.trigger && c.trigger.side !== me.side && c.trigger.target === me.id && consumeFire(g,
                    me)) {
                    g.chainFx().cancel = true
                    if (foe && foe.side !== me.side && foe.status === "board" && !foe.token) {
                        tryStun(g,
                            me,
                            foe,
                            STUN_QE)
                        g.damage(me,
                            foe,
                            boosted(g,
                                foe,
                                c.f(F_E_TRAP)),
                            "magic",
                            {
                                tag: "skill"
                            })
                    }
                    return
                }
                chargeFire(g,
                    me)
            },
        },
        R: {
            key: "R", name: "Tibbers Dậy", target: "all_enemies", mana: 50,
            desc: `Tibbers vồ mọi tướng địch hợp lệ, mỗi người nhận {${F_R}} sát thương phép và chỉ thử Choáng 1 lần với d = 0,75 + 0,0005 AD + 0,0015 AP đơn vị. Đầy Lửa: tiêu Lửa, thử Choáng trước sát thương; chưa đầy: thử sau sát thương nếu còn sống. Chặn/roll hụt không thử lần hai; không sinh đơn vị.`,
            resolve(c) {
                const charged = consumeFire(c.g,
                    c.self)
                for (const t of foes(c.g,
                    c.self)) {
                    if (charged) tryStun(c.g,
                        c.self,
                        t,
                        STUN_R)
                    c.g.damage(c.self,
                        t,
                        boosted(c.g,
                            t,
                            c.f(F_R)),
                        "magic",
                        {
                            tag: "skill"
                        })
                    if (!charged) tryStun(c.g,
                        c.self,
                        t,
                        STUN_R)
                }
                if (!charged) chargeFire(c.g,
                    c.self)
            },
        },
    },
})
