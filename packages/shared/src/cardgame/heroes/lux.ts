// Lux (Pháp sư, phép): máu 720 · AD 58 · giáp/kháng 26/30. Engine: marks (dấu / kích nổ).
// MỤC ĐÍCH: "Chiếu Sáng rồi kích nổ" — mọi chiêu của Lux để lại dấu Chiếu Sáng (status "illum", hiện trên tướng địch);
// sát thương kế tiếp từ Lux HOẶC đồng đội lên tướng có dấu sẽ tiêu dấu và nổ thêm. R xuyên cả hàng, kích nổ mọi dấu gấp đôi.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    Unit
} from "../types"

const ILLUM = "illum"
const F_POP = "30 + 35% AP"
const F_Q = "65 + 50% AP"
const F_E = "35 + 25% AP"
const F_R = "110 + 60% AP"
const E_ALL_HAND = 5
const R_DRAW_AT = 3

const light = (g: Game, t: Unit) => { if (t.status === "board") g.status(t,
    ILLUM,
    2) }

export default defineHero({
    id: "lux", name: "Lux", role: "mage", damage: "magic", hp: 1010, atk: 69, armor: 26, mr: 30,
    desc: "Chiếu Sáng rồi kích nổ: mọi chiêu của Lux gắn dấu Ánh Sáng; Lux hoặc đồng đội đánh trúng tướng có dấu thì dấu nổ. Cầu Vồng Tối Thượng xuyên cả hàng địch, kích nổ mọi dấu.",
    skillCopies: {
        Q: 8, E: 8, R: 2
    },
    passive: {
        name: "Chiếu Sáng",
        desc: `Chiêu của Lux gắn dấu Chiếu Sáng lên tướng địch trúng chiêu (2 lượt, hiện trên tướng). Khi Lux **hoặc đồng minh** gây sát thương bằng chiêu hoặc đòn đánh lên tướng địch có dấu, dấu bị tiêu và Lux gây thêm {${F_POP}} sát thương phép lên nó.`,
    },
    hooks: {
        onDamage(g, me, d) {
            if (!d.src || d.src.side !== me.side || d.target.side === me.side || d.amount <= 0) return
            if ((d.tag !== "skill" && d.tag !== "attack") || !g.has(d.target,
                ILLUM)) return
            g.removeStatus(d.target,
                ILLUM)
            g.damage(me,
                d.target,
                g.f(me,
                    F_POP),
                "magic",
                {
                    tag: "effect"
                })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Khoá Ánh Sáng", target: "enemies_upto", max: 2,
            desc: `{${F_Q}} sát thương phép cho tối đa 2 tướng địch, rồi Chiếu Sáng chúng. **Điều kiện:** tướng nào đang có dấu từ trước (dấu nổ) thì bị Choáng 1 lượt.`,
            resolve(c) {
                for (const t of c.targets) {
                    const lit = c.g.has(t,
                        ILLUM)
                    c.g.damage(c.self,
                        t,
                        c.f(F_Q),
                        "magic",
                        {
                            tag: "skill"
                        })
                    if (lit && t.status === "board") c.g.status(t,
                        "stun",
                        1)
                    light(c.g,
                        t)
                }
            },
        },
        E: {
            key: "E", name: "Quả Cầu Ánh Sáng", target: "enemies_upto", max: 3,
            desc: `{${F_E}} sát thương phép cho tối đa 3 tướng địch, rồi Chiếu Sáng chúng. **Điều kiện:** trên tay bạn còn từ ${E_ALL_HAND} lá (sau khi đánh lá này) thì trúng mọi tướng địch.`,
            resolve(c) {
                const all = c.g.player(c.side).hand.length >= E_ALL_HAND
                for (const t of all ? c.g.enemies(c.self) : c.targets) {
                    c.g.damage(c.self,
                        t,
                        c.f(F_E),
                        "magic",
                        {
                            tag: "skill"
                        })
                    light(c.g,
                        t)
                }
            },
        },
        R: {
            key: "R", name: "Cầu Vồng Tối Thượng", target: "all_enemies",
            desc: `Xuyên cả hàng địch: {${F_R}} sát thương phép cho mọi tướng địch; mỗi dấu Chiếu Sáng trên hàng địch nổ **gấp đôi** ({${F_POP}} ×2). **Điều kiện:** kích nổ từ ${R_DRAW_AT} dấu thì bạn rút 2 lá.`,
            resolve(c) {
                let popped = 0
                for (const t of c.g.enemies(c.self)) {
                    if (c.g.has(t,
                        ILLUM)) {
                        popped++
                        c.g.removeStatus(t,
                            ILLUM)
                        c.g.damage(c.self,
                            t,
                            2 * c.f(F_POP),
                            "magic",
                            {
                                tag: "effect"
                            })
                    }
                    c.g.damage(c.self,
                        t,
                        c.f(F_R),
                        "magic",
                        {
                            tag: "skill"
                        })
                }
                if (popped >= R_DRAW_AT) c.g.draw(c.side,
                    2,
                    {
                        reason: "skill", by: c.self.id
                    })
            },
        },
    },
})
