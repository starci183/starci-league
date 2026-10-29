// Ornn (Đỡ đòn, phép): máu 480 · AD 92 · AP gốc 78 (registry V3_BASE_AP) · giáp/kháng 34/34 (V3).
// CHẤT: "Thần Rèn". Ornn làm mọi món đồ của đội mạnh hơn (đồ mặc càng lâu càng khoẻ) và rèn đồ mới giữa trận.
// Q Phun Trào mở đường (giảm Giáp), E (Quick) che đồng minh: phạt kẻ đánh bằng sát thương + Choáng, R phát đồ hoàn chỉnh.
// Engine: HeroDef.itemAura (hào quang đồ theo số vòng đã mặc), HeroDef.modifyDamage (giảm Giáp), quickWhen + chainOnly (E), g.grantItem (R).
// Đối thủ trả lời: Blitzcrank cướp lá đồ, hạ Ornn để tắt cả lò, sát thương chuẩn.
import {
    defineHero
} from "../registry"
import type {
    PlayArgs
} from "../types"

/** Nội tại: đồ +(10% + 2% mỗi 100 AD + 2% mỗi 100 AP của Ornn + 1% mỗi vòng món đó đã mặc) chỉ số */
export const FORGE_BASE = 10
export const FORGE_PER_100_AD = 2
export const FORGE_PER_100_AP = 2
export const FORGE_PER_ROUND = 1
/** Q: Phun Trào */
export const F_Q = "40 + 6% máu tối đa + 50% Giáp + 20% AP"
export const Q_SHRED = 20
export const SHRED = "ornn_shred"
/** E: Lao Húc */
export const F_E = "20 + 4% máu tối đa + 30% Giáp"
export const E_PER_ITEM = 10

export default defineHero({
    id: "ornn", name: "Ornn", role: "tank", damage: "magic", hp: 480, atk: 92, armor: 34, mr: 34,
    desc: "Thần Rèn: đồ của cả đội mặc càng lâu càng khoẻ, Ornn che đồng minh và phạt kẻ ra tay; R rèn đồ hoàn chỉnh giữa trận.",
    passive: {
        name: "Lò Rèn Sống",
        desc: `Khi Ornn còn trên sân: mọi đồ đang mặc của phe bạn +({${FORGE_BASE}% + ${FORGE_PER_100_AD}% mỗi 100 AD + ${FORGE_PER_100_AP}% mỗi 100 AP} theo chỉ số Ornn + ${FORGE_PER_ROUND}% mỗi vòng món đó đã được mặc) chỉ số. Mỗi món tính riêng từ lúc được mặc, gỡ ra thì đếm lại.`,
    },
    itemAura(g, me, _wearer, _item, roundsWorn) {
        return (FORGE_BASE + FORGE_PER_100_AD * g.atk(me) / 100 + FORGE_PER_100_AP * g.ap(me) / 100 + FORGE_PER_ROUND * roundsWorn) / 100
    },
    modifyDamage(g, _me, d) {
        // Giảm Giáp: kẻ bị Phun Trào mất Giáp khi nhận sát thương vật lý
        const t = d.target
        const v = g.statusV(t,
            SHRED)
        if (v <= 0 || d.kind !== "physical") return 1
        const armor = g.armor(t)
        if (armor <= 0) return 1
        return (100 + armor) / (100 + Math.max(0,
            armor - v))
    },
    skills: {
        Q: {
            key: "Q", name: "Phun Trào", target: "enemy",
            desc: `Chọn 1 tướng địch; nó nhận {${F_Q}} sát thương phép và bị Giảm Giáp ${Q_SHRED} đến hết lượt sau.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                c.g.status(t,
                    SHRED,
                    1,
                    {
                        v: Q_SHRED, until: c.g.s.turnNo + 1
                    })
            },
        },
        E: {
            key: "E", name: "Lao Húc", target: "none", quick: true, chainOnly: true,
            desc: `Quick, Chỉ Nối Chuỗi. Khi địch đánh đúng 1 đồng minh: kẻ đánh nhận ({${F_E}} + ${E_PER_ITEM} mỗi món đồ của đồng minh đó) sát thương phép và Choáng 1 lượt.`,
            quickWhen: (c) => c.trigger.side !== c.side && !!c.trigger.single && !!c.trigger.actor && !!c.trigger.target,
            resolve(c) {
                const foe = c.g.unit(c.trigger?.actor)
                const ally = c.g.unit(c.trigger?.target)
                if (!foe || !ally || foe.status !== "board") return
                c.g.damage(c.self,
                    foe,
                    c.f(F_E) + E_PER_ITEM * ally.items.length,
                    "magic",
                    {
                        tag: "skill"
                    })
                c.g.status(foe,
                    "stun",
                    1)
            },
        },
        R: {
            key: "R", name: "Tiếng Gọi Thần Rèn", target: "ally_other",
            desc: "Chọn 1 đồng minh khác; Ornn và đồng minh đó mỗi người nhận 1 món đồ hoàn chỉnh ngẫu nhiên (mặc ngay nếu còn ô, không thì vào tay).",
            options: (c): PlayArgs[] => c.g.heroes(c.side).filter((u) => u.id !== c.self.id).map((u) => ({
                target: u.id
            })),
            canPlay: (c) => c.g.heroes(c.side).some((u) => u.id !== c.self.id),
            resolve(c) {
                c.g.grantItem(c.self)
                if (c.target) c.g.grantItem(c.target)
            },
        },
    },
})
