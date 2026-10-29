// Ashe (Xạ thủ, vật lý): máu 350 · AD 120 · giáp/kháng 26/26. Chất: CHỒNG BUỐT, địch yếu dần, Buốt càng dày Ashe càng đau.
// Buốt = status "frost" (v = số chồng, tối đa 10, không tự hết; mất khi tướng mang chết). KHÔNG phải "chill" của engine.
// Buốt không bao giờ bị chiêu của Ashe xoá. Mỗi Buốt làm MỌI sát thương tướng mang gây ra yếu đi (HeroDef.modifyDamage, chỉ khi Ashe còn trên sân).
// Ashe đánh được mọi địch đang có Buốt, bỏ qua đỡ đòn/khiêu khích (HeroDef.extraAttackTargets), nhưng đòn lên tướng có Buốt không chí mạng (info.noCrit).
import {
    pct
} from "../formula"
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    FOREVER, type Unit
} from "../types"

const FROST = "frost"
const EDGE = "ashe_e"
export const MAX_FROST = 10
/** Mỗi Buốt: sát thương tướng mang gây ra −2.5% (tối đa 25% ở 10 tầng) */
export const FROST_CUT = 0.025
const F_Q = "40 + 80% AD + 20% AP"
const Q_FROST = 3
const F_E_BONUS = "30 + 40% AD + 10% AP"
const E_FROST = 2
const F_R = "100 + 80% AD + 30% AP"
const R_FROST = 5

/** Cộng n Buốt (tối đa 10, không tự hết) */
export function addFrost(g: Game, t: Unit, n: number) {
    if (t.status !== "board" || t.token || n <= 0) return
    g.status(t,
        FROST,
        1,
        {
            v: n, add: true, max: MAX_FROST, until: FOREVER
        })
}

export default defineHero({
    id: "ashe", name: "Ashe", role: "marksman", damage: "physical", hp: 350, atk: 120, armor: 26, mr: 26,
    bot: {
        markValue: {
            frost: 25,
        },
    },
    desc: "Bắn đều là chồng đều: Buốt làm địch đánh yếu đi, Ashe với tới cả hàng sau, đến lúc cần thì đóng băng một mục tiêu.",
    passive: {
        name: "Băng Tiễn",
        desc: `Đòn đánh của Ashe gắn Buốt (cộng dồn, tối đa ${MAX_FROST}). Buốt: sát thương tướng đó gây ra giảm ${pct(FROST_CUT)}% mỗi tầng (tối đa ${pct(FROST_CUT * MAX_FROST)}% ở ${MAX_FROST} tầng). Ashe đánh được mọi địch đang có Buốt, bỏ qua đỡ đòn và khiêu khích, nhưng các đòn này không thể chí mạng.`,
    },
    hooks: {
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id) return
            // Đòn lên tướng có Buốt không thể chí mạng
            if (g.statusV(d.target,
                FROST) > 0) d.info.noCrit = true
            if (d.info.miss || !g.has(me,
                EDGE)) return
            d.info.bonus.push({
                raw: g.f(me,
                    F_E_BONUS), kind: "physical"
            })
        },
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id) return
            addFrost(g,
                d.target,
                g.has(me,
                    EDGE) ? E_FROST : 1)
        },
    },
    extraAttackTargets(g, me) {
        return g.enemies(me).filter((u) => !u.token && g.statusV(u,
            FROST) > 0)
    },
    modifyDamage(g, me, d) {
        // Buốt: sát thương kẻ mang gây ra giảm theo số tầng (mọi loại sát thương)
        if (!d.src || d.src.side === me.side || d.src.token) return 1
        const n = g.statusV(d.src,
            FROST)
        return n > 0 ? 1 - FROST_CUT * Math.min(n,
            MAX_FROST) : 1
    },
    skills: {
        Q: {
            key: "Q", name: "Tên Băng", target: "enemy",
            desc: `Chọn 1 tướng địch; nó nhận {${F_Q}} sát thương vật lý và +${Q_FROST} Buốt.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "physical",
                    {
                        tag: "skill"
                    })
                addFrost(c.g,
                    t,
                    Q_FROST)
            },
        },
        E: {
            key: "E", name: "Tập Trung", target: "self",
            desc: `Tới hết lượt này: mỗi đòn đánh của Ashe gây thêm {${F_E_BONUS}} sát thương vật lý và gắn ${E_FROST} Buốt thay vì 1.`,
            resolve(c) {
                c.g.status(c.self,
                    EDGE,
                    1)
            },
        },
        R: {
            key: "R", name: "Đại Băng Tiễn", target: "enemy",
            desc: `Chọn 1 tướng địch; nó nhận {${F_R}} sát thương vật lý, bị Choáng 1 lượt và +${R_FROST} Buốt.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_R),
                    "physical",
                    {
                        tag: "skill"
                    })
                c.g.status(t,
                    "stun",
                    1)
                addFrost(c.g,
                    t,
                    R_FROST)
            },
        },
    },
})
