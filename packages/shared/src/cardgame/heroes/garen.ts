// Garen (Đấu sĩ, vật lý): "Kiên cường Demacia". Đánh càng nhiều càng cứng, Câm Lặng kẻ đối diện, chặn đòn nhắm vào mình rồi chém 3 đường, R chuẩn.
// Số liệu: balance/heroes/garen.json. Là Đấu sĩ nên chiêu scale AD và Máu tối đa (luật Đỡ đòn chỉ Máu/Giáp/Kháng không áp cho Garen).
// Engine dùng: hook onAttackHit, bonusStats + deathHalf (Kiên Cường), g.timed (Câm Lặng), quickWhen targetsSelf (E).
import {
    kit, when
} from "../balance"
import {
    defineHero
} from "../registry"
import {
    otherSide
} from "../types"

const k = kit("garen"), { p } = k
const STEEL = "garen_steel"
const F_HEAL = k.x("p1 + p2·Máu tối đa"), EN_HEAL = k.xe("p1 + p2·Máu tối đa")
const F_Q = k.x("q1 + q2·AD"), EN_Q = k.xe("q1 + q2·AD")
const F_E_SHIELD = k.x("e1 + e2·Máu tối đa"), EN_E_SHIELD = k.xe("e1 + e2·Máu tối đa")
const F_E_DMG = k.x("e3 + e4·AD"), EN_E_DMG = k.xe("e3 + e4·AD")
const F_R = k.x("r1 + r2·AD"), EN_R = k.xe("r1 + r2·AD")

export default defineHero({
    id: "garen", name: "Garen", role: "fighter", damage: "physical", ...k.base,
    deathHalf: [STEEL],
    bot: k.bot,
    desc: "Phổ thông, không cần đồ: càng đánh càng trâu, Câm Lặng kẻ đối diện, chém ba đường và kết liễu bằng sát thương chuẩn.",
    passive: {
        name: "Kiên Cường",
        desc: `Mỗi đòn đánh thường của Garen trúng, Garen hồi {${F_HEAL}} Máu và nhận 1 tầng Kiên Cường, cộng dồn vô hạn; mỗi tầng tăng ${p.p3} Giáp. Mất một nửa số tầng khi bị hạ.`,
    },
    bonusStats(g, me) {
        return {
            armor: g.stackOf(me,
                STEEL) * p.p3
        }
    },
    hooks: {
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id) return
            g.heal(me,
                me,
                g.f(me,
                    F_HEAL))
            g.stack(me,
                STEEL,
                1)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Đòn Quyết Định", target: "opposite", mana: p.q0,
            desc: `Gây {${F_Q}} sát thương vật lý lên tướng đối diện và Câm Lặng nó ${p.q3} đơn vị.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "physical",
                    {
                        tag: "skill"
                    })
                if (t.status === "board") c.g.timed(c.self,
                    t,
                    "silence",
                    p.q3)
            },
        },
        E: {
            key: "E", name: "Phán Xét", target: "none", mana: p.e0, quick: true,
            quickWhen: when.targetsSelf,
            desc: `Quick. Khi địch nhắm đúng Garen, bạn có thể dùng lá này (dùng chủ động cũng được): Garen nhận {${F_E_SHIELD}} Khiên; tướng địch đối diện và 2 đường kề nhận {${F_E_DMG}} sát thương vật lý.`,
            resolve(c) {
                const g = c.g
                g.shield(c.self,
                    c.self,
                    c.f(F_E_SHIELD))
                const dmg = c.f(F_E_DMG), foe = otherSide(c.side)
                for (const lane of [c.self.lane - 1,
                    c.self.lane,
                    c.self.lane + 1]) {
                    const t = lane >= 0 && lane <= 4 ? g.at(foe,
                        lane) : undefined
                    if (t && !t.token) g.damage(c.self,
                        t,
                        dmg,
                        "physical",
                        {
                            tag: "skill"
                        })
                }
            },
        },
        R: {
            key: "R", name: "Công Lý Demacia", target: "enemy", mana: p.r0,
            desc: `Chọn 1 tướng địch ở bất kỳ đường; gây {${F_R}} sát thương chuẩn.`,
            resolve(c) {
                c.g.damage(c.self,
c.target!,
c.f(F_R),
"true",
{
    tag: "skill"
})
            },
        },
    },
    en: {
        desc: "Plain and sturdy, no items needed: grows tougher with every blow, Silences the enemy in front, sweeps three lanes and finishes with true damage.",
        passive: {
            name: "Perseverance",
            desc: `Each time Garen's attack hits, Garen heals {${EN_HEAL}} HP and gains 1 Perseverance stack, stacking without limit; each stack adds ${p.p3} Armor. Half of the stacks are lost when he is taken down.`,
        },
        skills: {
            Q: {
                name: "Decisive Strike",
                desc: `Deal {${EN_Q}} physical damage to the champion opposite and Silence it for ${p.q3} units.`,
            },
            E: {
                name: "Judgment",
                desc: `Quick. When the enemy targets exactly Garen, you may play this card (it can also be played proactively): Garen gains {${EN_E_SHIELD}} Shield; the enemy opposite and the 2 adjacent lanes take {${EN_E_DMG}} physical damage.`,
            },
            R: {
                name: "Demacian Justice",
                desc: `Choose 1 enemy champion in any lane; deal {${EN_R}} true damage.`,
            },
        },
    },
})
