// Viktor (Pháp sư, phép): máu 330 · AD 92 · AP gốc 0 · giáp/kháng 26/28. Chất: TIẾN HOÁ, đổi bài thừa lấy sức mạnh vĩnh viễn.
// Tiến Hoá là bộ đếm (stack "evolve") giữ qua cả lần chết; mỗi nấc làm sát thương chiêu của Viktor tăng thêm (HeroDef.modifyDamage).
// Mana (x10): Q 10, E 35, R 60. Q nạp (bỏ bài lấy Khiên + Tiến Hoá), E xả (sát thương mọi địch), R giao tranh (sát thương + Choáng + nuôi Tiến Hoá).
// AP gốc = AD cũ của tướng phép (đề xuất V3, đã vào engine: HeroDef.ap).
import {
    pct
} from "../formula"
import {
    defineHero
} from "../registry"

const EVOLVE = "evolve"
/** Trần Tiến Hoá */
export const MAX_EVOLVE = 10
/** Mỗi nấc Tiến Hoá cộng thêm bấy nhiêu % sát thương chiêu */
export const PER_EVOLVE = 0.08
/** Khiên mỗi lá bỏ ở Q */
const F_SHIELD = "34 + 10% AD + 20% AP"
const F_E = "115 + 35% AD + 65% AP"
const F_R = "121 + 30% AD + 60% AP"
/** R nuôi thêm bấy nhiêu Tiến Hoá */
const R_GAIN = 2

export default defineHero({
    id: "viktor", name: "Viktor", role: "mage", damage: "magic", hp: 330, atk: 92, armor: 26, mr: 28,
    bot: {
        stackValue: {
            evolve: 30,
        },
    },
    desc: "Cỗ máy tiến hoá: bỏ bài thừa lấy Khiên và sức mạnh vĩnh viễn, rồi xả phép lên cả đội địch.",
    passive: {
        name: "Tiến Hoá",
        desc: `Tiến Hoá (vĩnh viễn, tối đa ${MAX_EVOLVE}, không mất khi Viktor chết): mỗi nấc làm sát thương chiêu của Viktor tăng ${pct(PER_EVOLVE)}%.`,
    },
    modifyDamage(g, me, d) {
        if (d.src?.id !== me.id || d.tag !== "skill" || d.target.side === me.side) return 1
        return 1 + PER_EVOLVE * g.stackOf(me,
            EVOLVE)
    },
    skills: {
        Q: {
            key: "Q", name: "Tháo Rời", target: "self", mana: 10, extra: "discard", discardMax: 3,
            desc: `Bỏ tối đa 3 lá trên tay; mỗi lá bỏ: Viktor +1 Tiến Hoá và nhận Khiên {${F_SHIELD}}.`,
            resolve(c) {
                let n = 0
                for (const uid of c.args.discard ?? []) {
                    if (!c.g.discard(c.side,
                        uid,
                        "effect")) continue
                    n++
                    c.g.shield(c.self,
                        c.self,
                        c.f(F_SHIELD))
                }
                if (n > 0) c.g.stack(c.self,
                    EVOLVE,
                    n,
                    MAX_EVOLVE)
            },
        },
        E: {
            key: "E", name: "Tia Tử Thần", target: "all_enemies", mana: 35,
            desc: `Mọi tướng địch nhận {${F_E}} sát thương phép (tăng ${pct(PER_EVOLVE)}% mỗi Tiến Hoá).`,
            resolve(c) {
                for (const t of c.g.enemies(c.self)) {
                    if (t.token) continue
                    c.g.damage(c.self,
                        t,
                        c.f(F_E),
                        "magic",
                        {
                            tag: "skill"
                        })
                }
            },
        },
        R: {
            key: "R", name: "Trường Trọng Lực", target: "all_enemies", mana: 60,
            desc: `Mọi tướng địch nhận {${F_R}} sát thương phép (tăng ${pct(PER_EVOLVE)}% mỗi Tiến Hoá); tướng địch nhiều máu nhất bị Choáng 1 lượt; Viktor +${R_GAIN} Tiến Hoá.`,
            resolve(c) {
                for (const t of c.g.enemies(c.self)) {
                    if (t.token) continue
                    c.g.damage(c.self,
                        t,
                        c.f(F_R),
                        "magic",
                        {
                            tag: "skill"
                        })
                }
                // Choáng đứa nhiều máu nhất còn lại sau đòn
                const top = c.g.enemies(c.self).filter((u) => !u.token).sort((a, b) => b.hp - a.hp)[0]
                if (top) c.g.status(top,
                    "stun",
                    1)
                c.g.stack(c.self,
                    EVOLVE,
                    R_GAIN,
                    MAX_EVOLVE)
            },
        },
    },
})
