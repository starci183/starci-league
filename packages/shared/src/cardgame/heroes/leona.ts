// Leona (Đỡ đòn, vật lý): "Mặt trời mọc". Giáp là sức mạnh: khoá bằng Choáng, Nhật Thực cắt mắt xích địch.
// Số liệu: balance/heroes/leona.json. Chiêu chỉ scale Giáp. Nội tại cộng % tổng Giáp qua allyBonusStats (tự cộng cho chính Leona).
// Engine dùng: HeroDef.allyBonusStats, g.timed (Choáng và Giáp tạm theo đơn vị), Choáng huỷ mắt xích bên dưới (law.md 11b).
import {
    actorOrEnemy, kit, when
} from "../balance"
import {
    defineHero
} from "../registry"
import {
    otherSide
} from "../types"

const k = kit("leona"), { p } = k
const F_Q = k.x("q1 + q2·Giáp"), EN_Q = k.xe("q1 + q2·Giáp")
const F_Q_STUN = k.x("q3 + q4·Giáp"), EN_Q_STUN = k.xe("q3 + q4·Giáp")
const F_E = k.x("e1 + e2·Giáp"), EN_E = k.xe("e1 + e2·Giáp")
const F_E_STUN = k.x("e3 + e4·Giáp"), EN_E_STUN = k.xe("e3 + e4·Giáp")
const F_E_ARMOR = k.x("e5 + e6·Giáp"), EN_E_ARMOR = k.xe("e5 + e6·Giáp")
const F_R = k.x("r1 + r2·Giáp"), EN_R = k.xe("r1 + r2·Giáp")
const F_R_STUN = k.x("r3 + r4·Giáp"), EN_R_STUN = k.xe("r3 + r4·Giáp")

export default defineHero({
    id: "leona", name: "Leona", role: "tank", damage: "physical", ...k.base,
    desc: "Mặt trời mọc: tấm khiên đầy Giáp, khoá địch bằng Choáng và cắt đứt hành động của chúng đúng lúc.",
    passive: {
        name: "Giáp Mặt Trời",
        desc: `Leona có thêm ${p.p1}% tổng Giáp của mình.`,
    },
    // Cộng % tổng Giáp (chưa tính hào quang ally) cho chính Leona. g.armor an toàn trong lúc tính aura (auraBusy).
    allyBonusStats(g, owner, target) {
        if (target.id !== owner.id) return {
        }
        return {
            armor: g.armor(owner) * p.p1 / 100
        }
    },
    skills: {
        Q: {
            key: "Q", name: "Khiên Bình Minh", target: "opposite", mana: p.q0,
            desc: `Khoá tướng địch đối diện: gây {${F_Q}} sát thương vật lý và Choáng {${F_Q_STUN}} đơn vị.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "physical",
                    {
                        tag: "skill"
                    })
                const d = c.f(F_Q_STUN)
                if (d > 0 && t.status === "board") c.g.timed(c.self,
                    t,
                    "stun",
                    d)
            },
        },
        E: {
            key: "E", name: "Nhật Thực", target: "enemy", mana: p.e0, quick: true,
            quickWhen: when.attackOrSkill,
            options: actorOrEnemy,
            desc: `Quick. Khi địch đánh hoặc dùng chiêu, bạn có thể dùng lá này; mục tiêu là kẻ đó. Dùng chủ động thì chọn 1 tướng địch. Gây {${F_E}} sát thương phép và Choáng {${F_E_STUN}} đơn vị; Leona nhận {${F_E_ARMOR}} Giáp trong ${p.e7} đơn vị.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_E),
                    "magic",
                    {
                        tag: "skill"
                    })
                const d = c.f(F_E_STUN)
                if (d > 0 && t.status === "board") c.g.timed(c.self,
                    t,
                    "stun",
                    d)
                c.g.timed(c.self,
                    c.self,
                    "armor_up",
                    p.e7,
                    {
                        v: c.f(F_E_ARMOR)
                    })
            },
        },
        R: {
            key: "R", name: "Thái Dương Giáng Thế", target: "all_enemies", mana: p.r0,
            desc: `Mọi tướng địch nhận {${F_R}} sát thương phép và bị Choáng {${F_R_STUN}} đơn vị.`,
            resolve(c) {
                const dmg = c.f(F_R), d = c.f(F_R_STUN)
                for (const t of c.g.heroes(otherSide(c.side))) {
                    c.g.damage(c.self,
                        t,
                        dmg,
                        "magic",
                        {
                            tag: "skill"
                        })
                    if (d > 0 && t.status === "board") c.g.timed(c.self,
                        t,
                        "stun",
                        d)
                }
            },
        },
    },
    en: {
        desc: "The rising sun: a shield full of Armor that locks enemies down with Stuns and cuts their actions short at the right moment.",
        passive: {
            name: "Sunlight Armor",
            desc: `Leona gains ${p.p1}% of her total Armor as extra Armor.`,
        },
        skills: {
            Q: {
                name: "Shield of Daybreak",
                desc: `Lock onto the enemy champion opposite: deal {${EN_Q}} physical damage and Stun it for {${EN_Q_STUN}} units.`,
            },
            E: {
                name: "Eclipse",
                desc: `Quick. When the enemy attacks or casts a skill, you may play this card; the target is that enemy. Played proactively, choose 1 enemy champion. Deal {${EN_E}} magic damage and Stun it for {${EN_E_STUN}} units; Leona gains {${EN_E_ARMOR}} Armor for ${p.e7} units.`,
            },
            R: {
                name: "Solar Flare",
                desc: `Every enemy champion takes {${EN_R}} magic damage and is Stunned for {${EN_R_STUN}} units.`,
            },
        },
    },
})
