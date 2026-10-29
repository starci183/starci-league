// Lux (Pháp sư, phép) V2: "Càng nhiều mana càng mạnh": mana là sức mạnh ở mọi lá, không phụ thuộc bốc được R.
// Nội tại: AP cộng thêm theo mana đang có (bonusStats). Q (0 mana) hồi mana · E (30) sát thương theo mana đang có · R (toàn bộ mana) xả hết.
import {
    defineHero
} from "../registry"

/** AP cộng thêm cho mỗi điểm mana đang có (mana ×10: 100 mana = +70 AP) */
export const AP_PER_MANA = 1.1
/** Q hồi bấy nhiêu mana */
export const Q_RESTORE = 40
/** E: sát thương cộng thêm mỗi điểm mana đang có (sau khi trả phí) */
export const E_PER_MANA = 1.5
/** R: sát thương mỗi điểm mana đã tiêu */
export const R_PER_MANA = 3.5
/** R cần ít nhất bấy nhiêu mana mới đánh được (tránh xả 0 mana) */
export const R_MIN_MANA = 20
const F_E = "20 + 60% AD + 30% AP"
const F_R = "40% AP"

export default defineHero({
    id: "lux", name: "Lux", role: "mage", damage: "magic", hp: 350, atk: 72, armor: 28, mr: 30,
    desc: "Càng nhiều mana càng mạnh: giữ mana là có AP, E đánh theo mana đang có, R xả sạch mana thành một phát cực lớn rồi Lux tụt yếu.",
    passive: {
        name: "Ánh Sáng Tích Tụ",
        desc: `Lux nhận ${AP_PER_MANA} AP cho mỗi mana đang có.`,
    },
    bonusStats(g, me) {
        return {
            ap: Math.floor(g.manaOf(me) * AP_PER_MANA)
        }
    },
    skills: {
        Q: {
            key: "Q", name: "Nạp Năng Lượng", target: "none", mana: 0,
            desc: `Hồi ${Q_RESTORE} mana.`,
            resolve(c) {
                c.g.gainMana(c.self,
                    Q_RESTORE,
                    "effect")
            },
        },
        E: {
            key: "E", name: "Tia Sáng", target: "enemy", mana: 30,
            desc: `Chọn 1 tướng địch; gây {${F_E}} sát thương phép, cộng ${E_PER_MANA} sát thương cho mỗi mana Lux đang có.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_E) + c.g.manaOf(c.self) * E_PER_MANA,
                    "magic",
                    {
                        tag: "skill"
                    })
            },
        },
        R: {
            key: "R", name: "Cầu Vồng Tối Thượng", target: "enemy", mana: "all",
            desc: `Cần ít nhất ${R_MIN_MANA} mana. Tiêu toàn bộ mana; chọn 1 tướng địch, gây {${F_R}} cộng ${R_PER_MANA} sát thương phép cho mỗi mana đã tiêu.`,
            canPlay: (c) => c.g.manaOf(c.self) >= R_MIN_MANA,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_R) + c.manaPaid * R_PER_MANA,
                    "magic",
                    {
                        tag: "skill"
                    })
            },
        },
    },
})
