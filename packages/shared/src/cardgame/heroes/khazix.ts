// Kha'Zix (Sát thủ, vật lý): máu 320 · AD 122 · giáp/kháng 27/26.
// CHẤT: "Săn kẻ đứng một mình". Địch Cô Lập (không có đồng minh ở đường kề, hoặc bị gắn Cô Lập) ăn thêm sát thương từ đòn đánh và Q của Kha'Zix.
// Q là đòn săn chính, E đổi đường để chọn con mồi (đối diện sau khi đổi bị Cô Lập + nhận sát thương), R (Quick) lặn + đánh dấu con mồi + nạp thêm lá Q.
// Engine: g.isolated (cả status "isolated"), hook onAttack (info.bonus), g.moveTo, g.giveSkillToHand, status "stealth".
// Đối thủ trả lời: đứng kín các đường, Janna Q huỷ đòn, đòn diện rộng (vẫn trúng khi Tàng Hình), Khiêu Khích kéo đòn sang tướng không Cô Lập.
import {
    defineHero
} from "../registry"

const ISO = "isolated"
export const F_Q = "50 + 110% AD + 20% AP"
export const F_E = "30 + 60% AD + 10% AP"
/** Nội tại: đòn đánh lên tướng Cô Lập */
export const F_ATK = "20 + 50% AD + 10% AP"
/** Nội tại: Q lên tướng Cô Lập */
export const F_Q_ISO = "40 + 90% AD + 15% AP"

export default defineHero({
    id: "khazix", name: "Kha'Zix", role: "assassin", damage: "physical", hp: 320, atk: 122, armor: 27, mr: 26,
    bot: {
        markValue: {
            isolated: 20,
        },
    },
    desc: "Mối Họa Hư Không: săn kẻ đứng lẻ. Đổi đường để chọn con mồi, lặn đi rồi nạp thêm một nhát săn.",
    passive: {
        name: "Thú Săn Mồi",
        desc: `Tướng địch Cô Lập (không có đồng minh ở đường kề, hoặc bị gắn Cô Lập): đòn đánh của Kha'Zix lên nó gây thêm {${F_ATK}} sát thương vật lý; Q lên nó gây thêm {${F_Q_ISO}}.`,
    },
    hooks: {
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss || !g.isolated(d.target)) return
            d.info.bonus.push({
                raw: g.f(me,
                    F_ATK), kind: "physical"
            })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Nếm Mùi Sợ Hãi", target: "enemy",
            desc: `Chọn 1 tướng địch; gây {${F_Q}} sát thương vật lý (cộng phần thêm của nội tại nếu nó Cô Lập).`,
            resolve(c) {
                const t = c.target!
                const extra = c.g.isolated(t) ? c.f(F_Q_ISO) : 0
                c.g.damage(c.self,
                    t,
                    c.f(F_Q) + extra,
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
        E: {
            key: "E", name: "Nhảy Vào Bầy", target: "ally_other",
            desc: `Chọn 1 tướng mình khác; Kha'Zix đổi đường với nó. Tướng địch đối diện Kha'Zix sau khi đổi Cô Lập tới hết lượt này và nhận {${F_E}} sát thương vật lý.`,
            resolve(c) {
                c.g.swapWith(c.self,
                    c.target!)
                const foe = c.g.opposite(c.self)
                if (!foe) return
                c.g.status(foe,
                    ISO,
                    1,
                    {
                        of: c.side
                    })
                c.g.damage(c.self,
                    foe,
                    c.f(F_E),
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
        R: {
            key: "R", name: "Lặn Săn", target: "none", quick: true,
            desc: "Quick. Kha'Zix Tàng Hình ngay tới hết lượt kế tiếp của đối thủ; tướng địch đối diện Kha'Zix Cô Lập tới hết lượt kế tiếp của bạn; thêm 1 lá Q Kha'Zix lên tay.",
            resolve(c) {
                const g = c.g
                // Tàng Hình tới hết lượt kế tiếp của đối thủ: ra bài trong lượt mình thì 1, nối Chuỗi trong lượt đối thủ thì 2
                g.stealth(c.self,
                    g.s.active === c.side ? 1 : 2)
                const foe = g.opposite(c.self)
                // "hết lượt kế tiếp của bạn": đang lượt mình thì là lượt sau (n = 2), đang lượt đối thủ thì là lượt tới (n = 1)
                if (foe) g.status(foe,
                    ISO,
                    1,
                    {
                        until: g.turnsUntil(c.side,
                            g.s.active === c.side ? 2 : 1)
                    })
                g.giveSkillToHand(c.side,
                    "khazix",
                    "Q",
                    "effect")
            },
        },
    },
})
