// Braum (Đỡ đòn, phép): máu 510 · AD 80 · AP gốc 0 · giáp/kháng 35/34.
// CHẤT: "Đứng sau tôi": Braum mở giao tranh cho đồng đội và hứng đòn thay họ, càng hứng càng cứng (Song Giáp).
// Nội tại: mỗi đòn đánh trúng Braum +1 Song Giáp (vĩnh viễn, không giới hạn); mỗi Song Giáp +1.5 Giáp và +1.5 Kháng Phép.
// Q: Đấm Băng gây sát thương + Dấu Băng; đồng minh đánh trúng lần đầu thì Choáng + Braum +2 Song Giáp. E (Quick): Đỡ Thay + 2 Song Giáp + Khiên. R (Quick): Choáng 1 địch, may thì Choáng thêm.
// Cơ chế engine dùng: HeroDef.bonusStats (Giáp/Kháng Phép theo Song Giáp), g.addMark + hook onMarkHit (Dấu Băng), hook onAttackHit, g.chainFx().redirect, stack, HeroDef.ap (AP gốc).
import {
    defineHero
} from "../registry"
import type {
    Game
} from "../game"
import {
    otherSide, type Unit
} from "../types"

const DUAL = "braum_dual"
const MARK = "braum_mark"
/** Mỗi Song Giáp: bấy nhiêu Giáp và Kháng Phép (chỉnh cân bằng trong khoảng 1-2) */
export const DUAL_ARMOR = 1.5
const Q_GAIN = 2
const E_GAIN = 2
export const F_Q = "66 + 40% AD + 40% AP"
export const F_E_SHIELD = "60 + 30% AD + 30% AP"
/** R: xác suất Choáng thêm mỗi địch còn lại = 5% + 1% mỗi 100 máu tối đa + 1% mỗi 10 Giáp của Braum */
export const R_BASE = 0.05
export const R_PER_100_HP = 0.01
export const R_PER_10_ARMOR = 0.01

/** Choáng 1 lượt: nếu đang là lượt của nó thì tính cả lượt kế tiếp (Quick giữa lượt địch cắt cả lượt sau) */
function stun(g: Game, u: Unit) {
    if (u.status !== "board" || u.token) return
    g.status(u,
        "stun",
        1,
        {
            until: g.turnsUntil(u.side,
                g.s.active === u.side ? 2 : 1)
        })
}


export default defineHero({
    id: "braum", name: "Braum", role: "tank", damage: "magic", hp: 510, atk: 80, armor: 35, mr: 34,
    bot: {
        stackValue: {
            braum_dual: 25,
        },
    },
    desc: "Tấm khiên của Freljord: mở giao tranh bằng Dấu Băng, hứng đòn thay cả đội, càng bị đánh càng cứng, rồi khoá cả hàng địch.",
    passive: {
        name: "Da Sắt",
        desc: `Mỗi đòn đánh trúng Braum: +1 Song Giáp (giữ mãi, không giới hạn). Mỗi Song Giáp: +${DUAL_ARMOR} Giáp và +${DUAL_ARMOR} Kháng Phép.`,
    },
    bonusStats(g, me) {
        const n = g.stackOf(me,
            DUAL)
        return {
            armor: n * DUAL_ARMOR, mr: n * DUAL_ARMOR
        }
    },
    hooks: {
        onAttackHit(g, me, d) {
            // bị đánh: +1 Song Giáp
            if (d.target.id === me.id && d.attacker.side !== me.side) g.stack(me,
                DUAL,
                1)
        },
        onMarkHit(g, me, d) {
            if (d.mark.id !== MARK || d.mark.src !== me.id) return
            // chính Braum đánh: giữ nguyên dấu cho đồng đội (engine tiêu 1 nấc cho mọi đòn của phe)
            if (d.attacker.id === me.id) {
                g.addMark(d.target,
                    MARK,
                    me,
                    {
                        hits: 1
                    })
                return
            }
            // đồng minh khác Braum đánh trúng lần đầu: Choáng + Braum +2 Song Giáp
            stun(g,
                d.target)
            g.stack(me,
                DUAL,
                Q_GAIN)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Đấm Băng", target: "enemy",
            desc: `Chọn 1 tướng địch; gây {${F_Q}} sát thương phép và gắn Dấu Băng tới hết lượt này. Đồng minh khác Braum đánh trúng nó lần đầu: nó bị Choáng 1 lượt và Braum +${Q_GAIN} Song Giáp.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                c.g.addMark(t,
                    MARK,
                    c.self,
                    {
                        hits: 1
                    })
            },
        },
        E: {
            key: "E", name: "Đứng Sau Tôi", target: "none", quick: true, chainOnly: true,
            desc: `Quick, Chỉ Nối Chuỗi. Khi địch đánh 1 đồng minh khác Braum: Đỡ Thay đòn đó; Braum +${E_GAIN} Song Giáp và nhận Khiên {${F_E_SHIELD}}.`,
            quickWhen: (c) => c.trigger.side !== c.side && !!c.trigger.single && c.trigger.target !== c.self.id
                && !!c.trigger.redirectable?.includes(c.self.id),
            resolve(c) {
                if (c.trigger?.target !== c.self.id) c.g.chainFx().redirect = c.self.id
                c.g.stack(c.self,
                    DUAL,
                    E_GAIN)
                c.g.shield(c.self,
                    c.self,
                    c.f(F_E_SHIELD))
            },
        },
        R: {
            key: "R", name: "Băng Phong Ấn", target: "enemy", quick: true,
            desc: "Quick. Chọn 1 tướng địch; nó bị Choáng 1 lượt. Mỗi tướng địch còn lại có {5% + 1% mỗi 100 máu tối đa + 1% mỗi 10 Giáp} (theo chỉ số Braum) bị Choáng 1 lượt. Dùng được trong lượt địch để cắt giao tranh.",
            resolve(c) {
                const main = c.target!
                const g = c.g
                stun(g,
                    main)
                const chance = R_BASE + R_PER_100_HP * (c.self.maxHp / 100) + R_PER_10_ARMOR * (g.armor(c.self) / 10)
                for (const t of g.heroes(otherSide(c.side))) {
                    if (t.id === main.id) continue
                    if (g.rollLog(chance,
                        (hit, p) => `Braum R: ${g.nameOf(t)} ${hit ? "bị" : "không bị"} Choáng (tỉ lệ ${p})`)) stun(g,
                        t)
                }
            },
        },
    },
})
