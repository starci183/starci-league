// Ashe (Xạ thủ, vật lý): máu 400 · AD 75 · giáp/kháng 26/28. Chất: CHỒNG BUỐT, địch yếu dần, Buốt càng dày Ashe càng đau.
// Buốt = status "frost" (v = số chồng, tối đa 10, hết sau 2 lượt của tướng mang kể từ lần cộng cuối). KHÔNG phải "chill" của engine.
// Mỗi Buốt trên tướng địch làm đòn đánh và chiêu của nó yếu đi (HeroDef.modifyDamage, chỉ có tác dụng khi Ashe còn trên sân).
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

const FROST = "frost"
const EDGE = "ashe_e"
export const MAX_FROST = 10
/** Mỗi Buốt: đòn đánh của tướng mang −8% (tốc đánh + sức mạnh), chiêu −4%; sàn 35% / 50% */
const ATTACK_CUT = 0.15
const SKILL_CUT = 0.08
const F_E_BONUS = "100% AD"
/** Sát thương R mỗi Buốt */
const F_R = "60 + 55% AD"

/** Cộng n Buốt (hết sau 2 lượt của tướng mang kể từ lần cộng cuối) */
export function addFrost(g: Game, t: Unit, n: number) {
    if (t.status !== "board" || t.token || n <= 0) return
    g.status(t,
        FROST,
        2,
        {
            v: n, add: true, max: MAX_FROST
        })
}

export default defineHero({
    id: "ashe", name: "Ashe", role: "marksman", damage: "physical", hp: 410, atk: 90, armor: 31, mr: 28,
    bot: {
        markValue: {
            frost: 25,
        },
    },
    desc: "Bắn đều là chồng đều: Buốt làm địch đánh yếu đi, đến lúc thu hoạch thì đóng băng cả đội.",
    passive: {
        name: "Băng Tiễn",
        desc: `Đòn đánh của Ashe trúng 1 tướng: nó nhận +1 Buốt. Mỗi Buốt làm đòn đánh của tướng mang yếu đi ${pct(ATTACK_CUT)}% và chiêu yếu đi ${pct(SKILL_CUT)}%.`,
    },
    hooks: {
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss || !g.has(me,
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
                    EDGE) ? 2 : 1)
        },
    },
    modifyDamage(g, me, d) {
        if (!d.src || d.src.side === me.side || d.src.token) return 1
        const n = g.statusV(d.src,
            FROST)
        if (n <= 0) return 1
        if (d.tag === "attack") return Math.max(0.35,
            1 - ATTACK_CUT * n)
        if (d.tag === "skill") return Math.max(0.5,
            1 - SKILL_CUT * n)
        return 1
    },
    skills: {
        Q: {
            key: "Q", name: "Mưa Băng", target: "enemy",
            desc: "Chọn 1 tướng địch; nó nhận +3 Buốt.",
            resolve(c) {
                addFrost(c.g,
c.target!,
3)
            },
        },
        E: {
            key: "E", name: "Tiễn Băng Giá", target: "self",
            desc: `Tới hết lượt này: mỗi đòn đánh của Ashe gây thêm {${F_E_BONUS}} sát thương vật lý và gắn +2 Buốt thay vì +1.`,
            resolve(c) {
                c.g.status(c.self,
                    EDGE,
                    1)
            },
        },
        R: {
            key: "R", name: "Mũi Tên Pha Lê", target: "all_enemies",
            desc: `Cần có tướng địch mang Buốt. Mọi tướng địch mang Buốt bị Choáng 1 lượt và nhận {${F_R}} sát thương vật lý cho mỗi Buốt; Buốt trên chúng tan hết.`,
            canPlay: (c) => c.g.enemies(c.side).some((u) => c.g.statusV(u,
                FROST) > 0),
            resolve(c) {
                for (const t of c.g.enemies(c.self)) {
                    const n = c.g.statusV(t,
                        FROST)
                    if (n <= 0 || t.token) continue
                    c.g.removeStatus(t,
                        FROST)
                    c.g.damage(c.self,
                        t,
                        c.f(F_R) * n,
                        "physical",
                        {
                            tag: "skill"
                        })
                    c.g.status(t,
                        "stun",
                        1)
                }
            },
        },
    },
})
