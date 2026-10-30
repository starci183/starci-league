// Aatrox (Đấu sĩ, vật lý): máu 420 · AD 74 · giáp/kháng 30/29 (V3).
// CHẤT: "Đổi máu lấy máu". Máu ĐÃ MẤT là tài nguyên (hiện ngay trên thanh máu): nội tại biến nó thành sát thương đòn đánh,
// Q trả máu lấy sát thương (và nạp nội tại), E biến sát thương đòn đánh thành hồi máu, R biến hình Kẻ Diệt Thế 2 lượt.
// Engine: g.payHp (trả máu, không tự giết), AttackInfo.bonus (nội tại), status theo lượt (E), onDamage (hút máu),
// g.transform / extendTransform (R: +AD, +máu tối đa, hồi nhận +50%, hồi sinh tại chỗ một lần), onKill (kéo dài).
// Đối thủ trả lời: Janna Q huỷ đòn (không hút được), dồn chết lúc thấp máu, Vết Thương Sâu.
import {
    defineHero
} from "../registry"
import type {
    AttackInfo, Unit
} from "../types"

/** Nội tại: đòn đánh gây thêm 15% máu đã mất + (7% AD + 2% AP) */
export const PASSIVE_PCT = 0.1
export const F_PASSIVE = "7% AD + 2% AP"
/** Q: trả 25% máu tối đa, địch nhận 100% lượng đó + (88% AD + 10% AP) */
export const Q_PAY_PCT = 0.25
export const Q_MULT = 1
export const F_Q = "90% AD + 10% AP"
const E_STATUS = "aatrox_e"
export const FORM = "aatrox_r"
/** R: biến hình 2 lượt của bạn; +30% AD, +30% máu tối đa; hồi nhận +50% */
const R_TURNS = 2
export const R_AD_PCT = 0.3
export const R_HP_PCT = 0.3
export const R_HEAL_BONUS = 0.5
/** Hồi sinh khi đang biến hình bị hạ: 30% máu tối đa + (73% AD) */
export const R_REVIVE_PCT = 0.3
export const F_R_REVIVE = "75% AD"

/** Nội tại chụp trước từng đòn (onAttack), gây sau đòn chính (onAttackHit) để phần cộng thêm không chí mạng */
const pendingBonus = new WeakMap<AttackInfo, number>()

/** Máu Aatrox đã mất */
export const lostHp = (u: Unit) => Math.max(0,
    u.maxHp - u.hp)

export default defineHero({
    id: "aatrox", name: "Aatrox", role: "fighter", damage: "physical", hp: 420, atk: 74, armor: 30, mr: 29,
    desc: "Kẻ Diệt Thế: trả máu lấy sát thương, càng cạn máu đòn càng nặng, chém trúng thì hút lại, R biến hình quỷ và chết một lần không sao.",
    passive: {
        name: "Cái Giá Bằng Máu",
        desc: `Trước từng đòn thật, đòn này gây thêm 10% Máu đang thiếu + {${F_PASSIVE}} sát thương vật lý; phần cộng thêm không chí mạng.`,
    },
    hooks: {
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss) return
            // chụp Máu thiếu ngay trước đòn này (sau hồi của đòn trước)
            const extra = lostHp(me) * PASSIVE_PCT + g.f(me,
                F_PASSIVE)
            if (extra > 0) pendingBonus.set(d.info,
                extra)
        },
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id) return
            const extra = pendingBonus.get(d.info)
            pendingBonus.delete(d.info)
            if (!extra || d.target.status !== "board") return
            g.damage(me,
                d.target,
                extra,
                "physical",
                {
                    tag: "attack"
                })
        },
        onDamage(g, me, d) {
            // E: chỉ đòn thường + nội tại của chính Aatrox lên địch; tính Máu + Khiên thực mất, không overkill
            if (d.src?.id !== me.id || d.tag !== "attack" || d.target.side === me.side) return
            if (!g.has(me,
                E_STATUS)) return
            const real = d.hpLost + d.absorbed
            // hồi máu nhận +50% khi biến hình do engine nhân (Transform.healMult)
            if (real > 0) g.heal(me,
                me,
                real)
        },
        onKill(g, me, d) {
            // hạ thật một TƯỚNG địch khi đang biến hình: kéo dài thêm 1 lượt của bạn
            if (d.killer.id === me.id && !d.victim.token && d.victim.side !== me.side && g.isTransformed(me,
                FORM)) g.extendTransform(me,
                1)
        },
    },
    skills: {
        Q: {
            key: "Q", mana: 0, name: "Lưỡi Gươm Darkin", target: "opposite",
            desc: `Chọn tướng địch đối diện; trả tối đa 25% Máu tối đa nhưng chừa ít nhất 1 Máu, rồi gây sát thương vật lý bằng 100% Máu thực trả + {${F_Q}}.`,
            canPlay: (c) => c.self.hp >= 2 && !!c.g.opposite(c.self),
            resolve(c) {
                const paid = c.g.payHp(c.self,
                    c.self.maxHp * Q_PAY_PCT,
                    1)
                if (paid <= 0) return
                c.g.damage(c.self,
                    c.target!,
                    paid * Q_MULT + c.f(F_Q),
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
        E: {
            key: "E", mana: 0, name: "Huyết Tế", target: "none",
            desc: "Tới hết lượt hiện tại, Aatrox hồi Máu bằng 100% tổng Máu và Khiên thực bị lấy đi bởi đòn thường và nội tại của chính mình lên địch; không tính overkill, phản hay proc trang bị.",
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
            key: "R", mana: 0, name: "Kẻ Diệt Thế", target: "none",
            desc: `Biến hình trong 2 lượt của Aatrox: tăng 30% AD và 30% Máu tối đa, cộng ngay lượng Máu vừa tăng; hồi Máu nhận vào tăng 50%. Mỗi tướng địch bị chính Aatrox hạ thật gia hạn 1 lượt. Nếu sắp chết, cứu tại chỗ một lần với 30% Máu tối đa trước biến hình + {${F_R_REVIVE}} trước biến hình, rồi hết dạng.`,
            canPlay: (c) => !c.g.isTransformed(c.self,
                FORM),
            resolve(c) {
                const me = c.self
                // chụp AD và Máu tối đa ngay trước biến hình
                const preAd = c.g.atk(me), preMax = me.maxHp
                const hpBonus = Math.round(preMax * R_HP_PCT)
                c.g.transform(me,
                    FORM,
                    R_TURNS,
                    {
                        bonus: {
                            atk: Math.round(preAd * R_AD_PCT)
                        },
                        maxHp: hpBonus,
                        healMult: 1 + R_HEAL_BONUS,
                        reviveHp: Math.min(preMax + hpBonus,
                            Math.round(preMax * R_REVIVE_PCT + c.f(F_R_REVIVE))),
                    })
            },
        },
    },
})
