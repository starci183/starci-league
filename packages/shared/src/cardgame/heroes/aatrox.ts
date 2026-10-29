// Aatrox (Đấu sĩ, vật lý): máu 420 · AD 72 · giáp/kháng 34/30.
// CHẤT: "Đổi máu lấy máu". Máu ĐÃ MẤT là tài nguyên (hiện ngay trên thanh máu): nội tại biến nó thành sát thương đòn đánh,
// Q trả máu lấy sát thương (và nạp nội tại), E (Quick) biến sát thương đòn đánh thành hồi máu, R xả toàn bộ máu đã mất rồi đứng dậy đầy máu.
// Engine: g.payHp (trả máu, không tự giết), AttackInfo.bonus (nội tại), status theo lượt (E), onDamage (hút máu).
// Đối thủ trả lời: Janna Q huỷ đòn (không hút được), dồn chết lúc thấp máu, Vết Thương Sâu.
import {
    pct
} from "../formula"
import {
    defineHero
} from "../registry"
import type {
    Unit
} from "../types"

/** Nội tại: đòn đánh gây thêm 25% máu đã mất */
const PASSIVE_PCT = 0.15
/** Q: trả 25% máu tối đa, địch nhận gấp 2 lượng đó */
const Q_PAY_PCT = 0.25
const Q_MULT = 1.2
/** R: địch nhận 2 lần máu đã mất */
const R_MULT = 2
const E_STATUS = "aatrox_e"

/** Máu Aatrox đã mất */
export const lostHp = (u: Unit) => Math.max(0,
    u.maxHp - u.hp)

export default defineHero({
    id: "aatrox", name: "Aatrox", role: "fighter", damage: "physical", hp: 300, atk: 64, armor: 30, mr: 30,
    desc: "Kẻ Diệt Thế: trả máu lấy sát thương, càng cạn máu đòn càng nặng, chém trúng thì hút lại và R xả hết máu đã mất thành một nhát.",
    passive: {
        name: "Cái Giá Bằng Máu",
        desc: `Đòn đánh của Aatrox (cả đòn không cần lá) gây thêm sát thương vật lý bằng ${pct(PASSIVE_PCT)}% máu Aatrox đã mất.`,
    },
    hooks: {
        onAttack(_g, me, d) {
            if (d.attacker.id !== me.id) return
            const extra = lostHp(me) * PASSIVE_PCT
            if (extra > 0) d.info.bonus.push({
                raw: extra, kind: "physical"
            })
        },
        onDamage(g, me, d) {
            if (d.src?.id !== me.id || d.tag !== "attack" || d.target.id === me.id) return
            if (!g.has(me,
                E_STATUS)) return
            g.heal(me,
                me,
                d.amount)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Lưỡi Gươm Darkin", target: "opposite",
            desc: `Chọn tướng địch đối diện Aatrox; Aatrox Trả Máu ${pct(Q_PAY_PCT)}% máu tối đa, rồi nó nhận sát thương vật lý bằng ${Q_MULT} lần lượng máu đã Trả.`,
            canPlay: (c) => c.self.hp > 1 && !!c.g.opposite(c.self),
            resolve(c) {
                const paid = c.g.payHp(c.self,
                    c.self.maxHp * Q_PAY_PCT,
                    1)
                if (paid <= 0) return
                c.g.damage(c.self,
                    c.target!,
                    paid * Q_MULT,
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
        E: {
            key: "E", name: "Xiềng Xích Hút Máu", target: "none", quick: true,
            desc: "Quick. Tới hết lượt: đòn đánh của Aatrox hồi máu cho Aatrox bằng 100% sát thương gây ra.",
            resolve(c) {
                // tới hết lượt đang chạy (lượt mình hoặc lượt địch khi nối Chuỗi)
                c.g.status(c.self,
                    E_STATUS,
                    1,
                    {
                        until: c.g.s.turnNo
                    })
            },
        },
        R: {
            key: "R", name: "Kẻ Diệt Thế", target: "opposite",
            desc: `Chọn tướng địch đối diện Aatrox; nó nhận sát thương vật lý bằng ${R_MULT} lần máu Aatrox đã mất, rồi Aatrox hồi đúng lượng máu đã mất đó.`,
            canPlay: (c) => lostHp(c.self) > 0 && !!c.g.opposite(c.self),
            resolve(c) {
                const lost = lostHp(c.self)
                if (lost <= 0) return
                c.g.damage(c.self,
                    c.target!,
                    lost * R_MULT,
                    "physical",
                    {
                        tag: "skill"
                    })
                c.g.heal(c.self,
                    c.self,
                    lost)
            },
        },
    },
})
