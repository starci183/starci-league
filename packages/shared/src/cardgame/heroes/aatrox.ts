// Aatrox (Đấu sĩ, vật lý): máu 960 · AD 80 · giáp/kháng 34/30.
// MỤC ĐÍCH: Máu là đạn. Q tiêu máu của chính Aatrox để chém, càng mất máu càng đau (nội tại đọc từ thanh máu),
// E hút máu địch để nạp đạn, R Kẻ Diệt Thế: đốt nửa máu còn lại, đổi lại không gục ở đòn chí mạng đầu tiên. Engine: scaling. Độ khó: VỪA.
// Đối thủ trả lời: dồn sát thương lớn khi Aatrox đang thấp máu (sát thương chuẩn / theo % máu), hoặc thả diều để hắn tự tiêu máu mà không hồi lại được.
import {
    defineHero
} from "../registry"
import type {
    Ctx, Unit
} from "../types"
import type {
    Game
} from "../game"

const AMP_CAP = 0.6
const AMP_CAP_R = 1
const F_Q_COST = "8% máu tối đa"
const F_Q = "60 + 80% AD + 20% AP"
const LOW = 0.5
const F_E = "40 + 45% AD"
const E_LOW = 0.3
const R_STATUS = "aatrox_r"
const F_R_HP = "15% máu tối đa"
const F_R = "50 + 60% AD"
const R_PAY = 0.3

/** +1% sát thương mỗi 1% máu đã mất (tối đa 60%, Kẻ Diệt Thế 100%) */
export const bloodAmp = (g: Game, u: Unit) => 1 + Math.min(g.has(u,
    R_STATUS) ? AMP_CAP_R : AMP_CAP,
1 - u.hp / u.maxHp)
/** Trả máu: trừ thẳng máu (không qua khiên, không thể tự hạ), phát sự kiện damage tag "blood" */
export function payHp(g: Game, u: Unit, amount: number): number {
    const pay = Math.min(Math.round(amount),
        u.hp - 1)
    if (pay <= 0) return 0
    u.hp -= pay
    g.emit({
        t: "damage", src: u.id, target: u.id, amount: pay, hpLost: pay, absorbed: 0, kind: "true", tag: "blood", hp: u.hp
    })
    return pay
}
function slash(c: Ctx, t: Unit, raw: number): number {
    const before = t.hp
    c.g.damage(c.self,
        t,
        raw * bloodAmp(c.g,
            c.self),
        "physical",
        {
            tag: "skill"
        })
    return Math.max(0,
        before - Math.max(0,
            t.hp))
}

export default defineHero({
    id: "aatrox", name: "Aatrox", role: "fighter", damage: "physical", hp: 660, atk: 67, armor: 34, mr: 30,
    skillCopies: {
        Q: 4, E: 3, R: 1
    },
    desc: "Kẻ Diệt Thế: tiêu máu của mình làm đạn, càng thấp máu càng chém đau, hút máu địch để nạp lại.",
    passive: {
        name: "Cái Giá Bằng Máu",
        desc: `Aatrox gây thêm 1% sát thương cho mỗi 1% máu đã mất (tối đa +${AMP_CAP * 100}%; +${AMP_CAP_R * 100}% khi Kẻ Diệt Thế).`,
    },
    hooks: {
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id) return
            d.info.mult *= bloodAmp(g,
                me)
        },
        onLethal(g, me, d) {
            if (d.target.id !== me.id || !g.has(me,
                R_STATUS)) return
            me.hp = Math.max(1,
                Math.round(g.f(me,
                    F_R_HP)))
            g.removeStatus(me,
                R_STATUS)
            g.log("Aatrox refuses to fall")
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Lưỡi Gươm Darkin", target: "opposite",
            desc: `Aatrox trả {${F_Q_COST}} máu (không thể tự hạ mình), rồi gây {${F_Q}} sát thương vật lý lên tướng đối diện. **Điều kiện:** sau khi trả máu Aatrox dưới ${LOW * 100}% máu thì chém thêm tướng địch ở 2 đường kề bên.`,
            resolve(c) {
                const t = c.target!
                payHp(c.g,
                    c.self,
                    c.f(F_Q_COST))
                const low = c.self.hp < c.self.maxHp * LOW
                slash(c,
                    t,
                    c.f(F_Q))
                if (!low) return
                for (const l of [c.self.lane - 1,
                    c.self.lane + 1]) {
                    const o = l >= 0 && l < 5 ? c.g.at(t.side,
                        l) : undefined
                    if (o && o.status === "board") slash(c,
                        o,
                        c.f(F_Q))
                }
            },
        },
        E: {
            key: "E", name: "Xiềng Xích Hút Máu", target: "enemy",
            desc: `{${F_E}} sát thương vật lý lên 1 tướng địch, Aatrox hồi máu bằng lượng máu nó mất. **Điều kiện:** Aatrox dưới ${E_LOW * 100}% máu thì hồi gấp đôi.`,
            resolve(c) {
                const low = c.self.hp < c.self.maxHp * E_LOW
                const lost = slash(c,
                    c.target!,
                    c.f(F_E))
                c.g.heal(c.self,
                    c.self,
                    lost * (low ? 2 : 1))
            },
        },
        R: {
            key: "R", name: "Kẻ Diệt Thế", target: "all_enemies",
            desc: `Aatrox trả ${R_PAY * 100}% máu hiện có, thành Kẻ Diệt Thế 2 lượt của mình (nội tại tối đa +${AMP_CAP_R * 100}%; lần đầu nhận đòn hạ gục thì không gục mà còn {${F_R_HP}} máu, rồi hết trạng thái), rồi gây {${F_R}} sát thương vật lý lên mọi tướng địch.`,
            resolve(c) {
                payHp(c.g,
                    c.self,
                    c.self.hp * R_PAY)
                c.g.status(c.self,
                    R_STATUS,
                    2)
                for (const t of c.g.enemies(c.self)) slash(c,
                    t,
                    c.f(F_R))
            },
        },
    },
})
