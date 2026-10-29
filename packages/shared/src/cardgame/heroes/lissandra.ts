// Lissandra (Pháp sư, phép) V3: "Hoá Băng bài địch": đánh trúng là có thể đóng băng bài trên tay địch, băng càng dày càng nguy. Máu 340 · AD 94 · giáp/kháng 26/29 · AP gốc 72.
// Hoá Băng = Card.frozen (g.freezeRandom): lá vẫn chiếm chỗ nhưng không đánh/ghép/nối chuỗi được; engine tự tan băng khi Lissandra rời sân.
// Nội tại: mỗi lần sát thương của Lissandra trúng địch có (10% + 5% mỗi 100 AD + 10% mỗi 100 AP) cơ hội Hoá Băng 1 lá ngẫu nhiên (hook onDamage).
// Q (20 mana) sát thương · E (30) sát thương, Choáng nếu tay đối thủ có lá chiêu Hoá Băng của chính tướng đó · R (50, Quick) tự đóng băng thoát chết, rồi phản công theo số lá băng.
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

/** AP gốc (V3: bằng AD gốc cũ) */
export const BASE_AP = 72
/** Cơ hội nội tại: 10% + 5% mỗi 100 AD + 10% mỗi 100 AP */
export const PROC_BASE = 0.1
export const PROC_PER_100_AD = 0.05
export const PROC_PER_100_AP = 0.1
const F_Q = "50 + 30% AD + 80% AP"
const F_E = "30 + 35% AD + 70% AP"
const F_R_CARD = "30 + 10% AD + 20% AP"

/** Cơ hội Hoá Băng mỗi lần sát thương trúng (g.chance: base + ad theo 100 AD + ap theo 100 AP) */
export const freezeChance = (g: Game, me: Unit) => g.chance(me,
    {
        base: PROC_BASE, ad: PROC_PER_100_AD, ap: PROC_PER_100_AP
    })

export default defineHero({
    id: "lissandra", name: "Lissandra", role: "mage", damage: "magic", hp: 340, atk: 94, armor: 26, mr: 29, ap: BASE_AP,
    desc: "Hoá Băng bài địch: sát thương của Lissandra có thể đóng băng lá trên tay đối thủ, E Choáng đúng tướng có bài bị băng, R tự đóng băng để thoát chết rồi phản công theo số lá băng. Muốn tan băng thì phải hạ Lissandra.",
    passive: {
        name: "Tay Băng Giá",
        desc: `Mỗi lần sát thương của Lissandra trúng tướng địch: có {${pct(PROC_BASE)}% + ${pct(PROC_PER_100_AD)}% mỗi 100 AD + ${pct(PROC_PER_100_AP)}% mỗi 100 AP} cơ hội Hoá Băng 1 lá ngẫu nhiên trên tay đối thủ. Lá Hoá Băng không dùng được nhưng vẫn chiếm chỗ; băng tan khi Lissandra rời sân.`,
    },
    hooks: {
        onDamage(g, me, d) {
            if (d.src?.id !== me.id || d.amount <= 0) return
            const t = d.target
            if (t.side === me.side || t.token) return
            if (g.rollLog(freezeChance(g,
                me),
            (hit, p) => (hit ? `Lissandra: Hoá Băng 1 lá trên tay đối thủ (tỉ lệ ${p})` : undefined))) g.freezeRandom(otherSide(me.side),
                1,
                me.id)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Mảnh Băng", target: "enemy", mana: 20,
            desc: `Chọn 1 tướng địch; gây {${F_Q}} sát thương phép.`,
            resolve(c) {
                c.g.damage(c.self,
                    c.target!,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
            },
        },
        E: {
            key: "E", name: "Vòng Băng", target: "enemy", mana: 30,
            desc: `Chọn 1 tướng địch; gây {${F_E}} sát thương phép. Nếu trên tay đối thủ có lá chiêu Hoá Băng của chính tướng đó: Choáng nó 1 lượt.`,
            resolve(c) {
                const t = c.target!
                const iced = c.g.frozenCards(otherSide(c.side),
                    c.self.id).some((x) => x.kind === "skill" && x.hero === t.hero)
                c.g.damage(c.self,
                    t,
                    c.f(F_E),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (iced) c.g.status(t,
                    "stun",
                    1)
            },
        },
        R: {
            key: "R", name: "Hầm Mộ Băng", target: "all_enemies", mana: 50, quick: true,
            desc: `Quick. Mọi tướng địch nhận {${F_R_CARD}} sát thương phép mỗi lá Hoá Băng trên tay đối thủ. Rồi Lissandra tự đóng băng tới hết lượt của đối thủ: miễn mọi sát thương, không bị chọn làm mục tiêu và không hành động được.`,
            resolve(c) {
                const g = c.g
                const me = c.self
                const n = g.frozenCards(otherSide(c.side),
                    me.id).length
                if (n > 0) {
                    for (const t of g.enemies(me).filter((u) => !u.token)) {
                        g.damage(me,
                            t,
                            c.f(F_R_CARD) * n,
                            "magic",
                            {
                                tag: "skill"
                            })
                    }
                }
                g.stasis(me,
                    1,
                    otherSide(c.side))
            },
        },
    },
})
