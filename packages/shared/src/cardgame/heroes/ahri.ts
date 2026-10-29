// Ahri (Pháp sư, phép) V3: "Mê hồn": pháp sư cân bằng sát thương và hiệu ứng; Say Mê tích vĩnh viễn, địch càng mê càng yếu và càng ăn đau. Máu 340 · AD 98 · giáp/kháng 25/28 · AP gốc 0.
// Say Mê = status "ahri_charm" (v = số tầng, vĩnh viễn FOREVER, trần CHARM_MAX). Mỗi tầng: địch đó gây ít hơn 7.5% sát thương và nhận thêm 5% sát thương từ Ahri (HeroDef.modifyDamage).
// Nội tại: mỗi lần chiêu của Ahri trúng địch có (10% + 5% mỗi 100 AD + 10% mỗi 100 AP) cơ hội +1 Say Mê (hook onDamage).
// Q (10 mana) 2 mục tiêu · E (25) sát thương + chắc chắn +1 Say Mê · R (50) đổi chỗ với đồng minh rồi đánh kẻ trước mặt.
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
    FOREVER
} from "../types"

/** Status Say Mê của Ahri (v = số tầng) */
export const CHARM = "ahri_charm"
/** Trần tầng Say Mê */
export const CHARM_MAX = 3
/** Mỗi tầng: địch đó gây ít hơn bấy nhiêu sát thương */
export const CHARM_WEAKEN = 0.075
/** Mỗi tầng: địch đó nhận thêm bấy nhiêu sát thương từ Ahri */
export const CHARM_AMP = 0.05
/** Cơ hội nội tại: 10% + 5% mỗi 100 AD + 10% mỗi 100 AP */
export const PROC_BASE = 0.18
export const PROC_PER_100_AD = 0.05
export const PROC_PER_100_AP = 0.1
const F_Q = "115 + 20% AD + 70% AP"
const F_Q_TRUE = "44 + 10% AD + 30% AP"
const F_E = "70 + 20% AD + 50% AP"
const F_R = "152 + 30% AD + 90% AP"

/** Cơ hội +1 Say Mê mỗi lần chiêu trúng (g.chance: base + ad theo 100 AD + ap theo 100 AP) */
export const charmChance = (g: Game, me: Unit) => g.chance(me,
    {
        base: PROC_BASE, ad: PROC_PER_100_AD, ap: PROC_PER_100_AP
    })
/** Thêm n tầng Say Mê (vĩnh viễn, tối đa CHARM_MAX) */
export const charm = (g: Game, t: Unit, n: number) => {
    if (t.status !== "board" || t.token || n <= 0) return
    g.status(t,
        CHARM,
        1,
        {
            v: n, add: true, max: CHARM_MAX, until: FOREVER
        })
}

export default defineHero({
    id: "ahri", name: "Ahri", role: "mage", damage: "magic", hp: 340, atk: 98, armor: 25, mr: 28,
    bot: {
        markValue: {
            ahri_charm: 25,
        },
    },
    desc: "Mê hồn: chiêu của Ahri trúng là có thể gắn Say Mê vĩnh viễn; địch càng mê càng yếu đòn và càng ăn đau từ Ahri. Q và E trút phép, E gắn Mê chắc chắn, R lướt tới chốt.",
    passive: {
        name: "Say Mê",
        desc: `Say Mê cộng dồn vĩnh viễn (tối đa ${CHARM_MAX}): mỗi tầng làm tướng địch đó gây ít hơn ${pct(CHARM_WEAKEN)}% sát thương và nhận thêm ${pct(CHARM_AMP)}% sát thương từ Ahri. Mỗi lần chiêu của Ahri trúng tướng địch: có {${pct(PROC_BASE)}% + ${pct(PROC_PER_100_AD)}% mỗi 100 AD + ${pct(PROC_PER_100_AP)}% mỗi 100 AP} cơ hội +1 Say Mê lên nó.`,
    },
    modifyDamage(g, me, d) {
        if (!d.src) return 1
        if (d.src.side !== me.side) {
            const n = g.statusV(d.src,
                CHARM)
            return n > 0 ? 1 - n * CHARM_WEAKEN : 1
        }
        if (d.src.id === me.id && d.target.side !== me.side) {
            const n = g.statusV(d.target,
                CHARM)
            return 1 + n * CHARM_AMP
        }
        return 1
    },
    hooks: {
        onDamage(g, me, d) {
            if (d.src?.id !== me.id || d.tag !== "skill" || d.amount <= 0) return
            const t = d.target
            if (t.side === me.side || t.token || t.status !== "board") return
            if (g.rollLog(charmChance(g,
                me),
            (hit, p) => (hit ? `Ahri: ${g.nameOf(t)} +1 Say Mê (tỉ lệ ${p})` : undefined))) charm(g,
                t,
                1)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Quả Cầu Ma Lực", target: "enemy", mana: 10,
            desc: `Chọn 1 tướng địch; gây {${F_Q}} sát thương phép, và 1 tướng địch ngẫu nhiên khác nhận {${F_Q_TRUE}} sát thương chuẩn.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                const other = c.g.pick(c.g.targetableEnemies(c.self).filter((x) => x.id !== t.id))
                if (other) c.g.log(`Ahri Q: sát thương chuẩn ngẫu nhiên trúng ${c.g.nameOf(other)}`)
                if (other) c.g.damage(c.self,
                    other,
                    c.f(F_Q_TRUE),
                    "true",
                    {
                        tag: "skill"
                    })
            },
        },
        E: {
            key: "E", name: "Mê Hoặc", target: "enemy", mana: 25,
            desc: `Chọn 1 tướng địch; gây {${F_E}} sát thương phép và chắc chắn +1 Say Mê.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_E),
                    "magic",
                    {
                        tag: "skill"
                    })
                charm(c.g,
                    t,
                    1)
            },
        },
        R: {
            key: "R", name: "Phi Hồ", target: "ally_other", mana: 50,
            desc: `Chọn 1 tướng mình khác; Ahri đổi chỗ với nó, rồi tướng địch đối diện chỗ mới nhận {${F_R}} sát thương phép.`,
            resolve(c) {
                c.g.swapWith(c.self,
                    c.target!)
                const front = c.g.opposite(c.self)
                if (front) c.g.damage(c.self,
                    front,
                    c.f(F_R),
                    "magic",
                    {
                        tag: "skill"
                    })
            },
        },
    },
})
