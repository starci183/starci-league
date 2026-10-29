// Darius (Đấu sĩ, vật lý): máu 940 · AD 82 · giáp/kháng 36/30. Lối chơi: ĐAO PHỦ DÂY CHUYỀN.
// Rải dấu chảy máu vài lượt, rồi một lượt kéo (E, về tay) - chém (R, hạ gục thì về tay + rút 1) liên tục.
// Đấu sĩ cận chiến: Q và R chỉ nhắm tướng đối diện (target "opposite"); muốn đánh tướng khác thì kéo bằng E.
// Mẫu tham chiếu cho API: hook onDamage/onTurnStart, status có giá trị (v), kéo/đổi chỗ, toHand().
import {
    defineHero
} from "../registry"

const BLEED = "bleed"
const F_BLEED = "6 + 6% AD"
const F_Q = "50 + 70% AD + 30% AP"
const F_Q_HEAL = "20 + 4% máu cộng thêm"
const F_R = "80 + 50% AD + 20% AP"
const R_PER_MARK = 30

export default defineHero({
    id: "darius", name: "Darius", role: "fighter", damage: "physical", hp: 940, atk: 82, armor: 36, mr: 30,
    desc: "Bàn tay Noxus. Rải dấu chảy máu, rồi kéo - chém - kéo - chém: Bắt Giữ và Máy Chém cứ thế quay về tay.",
    passive: {
        name: "Xuất Huyết",
        desc: `Mỗi đòn đánh và chiêu của Darius cho mục tiêu 1 dấu chảy máu (tối đa 5; dấu ở lại cả khi Darius đổi mục tiêu, hết sau 2 lượt của mục tiêu kể từ lần cộng cuối). Đầu lượt của mục tiêu, nó mất {${F_BLEED}} sát thương chuẩn cho mỗi dấu.`,
    },
    hooks: {
    // +1 dấu cho mục tiêu mỗi lần Darius gây sát thương bằng đòn đánh hoặc chiêu
        onDamage(g, me, d) {
            if (d.src?.id !== me.id || (d.tag !== "attack" && d.tag !== "skill")) return
            g.status(d.target,
                BLEED,
                2,
                {
                    v: 1, add: true, max: 5
                })
        },
        // đầu lượt của phe địch: dấu nổ ra máu
        onTurnStart(g, me, d) {
            if (d.side === me.side) return
            for (const t of g.enemies(me)) {
                const n = g.statusV(t,
                    BLEED)
                if (n > 0) g.damage(me,
                    t,
                    g.f(me,
                        F_BLEED) * n,
                    "true",
                    {
                        tag: "dot"
                    })
            }
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Tàn Sát", target: "opposite",
            desc: `{${F_Q}} sát thương vật lý cho tướng đối diện, +1 dấu. **Điều kiện:** tướng đó đã có dấu thì +2 dấu thay vì 1, và Darius hồi {${F_Q_HEAL}}.`,
            resolve(c) {
                const t = c.target!
                const had = c.g.statusV(t,
                    BLEED)
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "physical",
                    {
                        tag: "skill"
                    }) // nội tại +1 dấu
                if (had > 0) {
                    c.g.status(t,
                        BLEED,
                        2,
                        {
                            v: 1, add: true, max: 5
                        }) // dấu thứ 2
                    c.g.heal(c.self,
                        c.self,
                        c.f(F_Q_HEAL))
                }
            },
        },
        E: {
            key: "E", name: "Bắt Giữ", target: "enemy",
            desc: "Chọn 1 tướng địch bất kỳ: kéo nó về đối diện Darius (đổi chỗ với tướng đang ở đó), rồi Darius đánh thường nó ngay, miễn phí. **Điều kiện:** mục tiêu có từ 3 dấu thì lá E này quay về tay (mỗi mục tiêu chỉ một lần mỗi lượt, để không đánh vô hạn).",
            resolve(c) {
                const t = c.target!
                const marks = c.g.statusV(t,
                    BLEED)
                c.g.moveTo(t,
                    c.self.lane)
                c.g.attack(c.self,
                    t,
                    {
                        free: true
                    })
                if (marks >= 3) {
                    const key = `eRet:${t.id}`
                    if (c.g.stackOf(c.self,
                        key) !== c.g.s.turnNo) { c.g.setStack(c.self,
                        key,
                        c.g.s.turnNo); c.toHand() }
                }
            },
        },
        R: {
            key: "R", name: "Máy Chém Noxus", target: "opposite",
            desc: `{${F_R}} + ${R_PER_MARK} mỗi dấu, sát thương chuẩn, cho tướng đối diện. **Điều kiện:** hạ gục thì lá R này quay về tay và Darius rút 1 lá.`,
            resolve(c) {
                const t = c.target!
                const raw = c.f(F_R) + R_PER_MARK * c.g.statusV(t,
                    BLEED)
                c.g.damage(c.self,
                    t,
                    raw,
                    "true",
                    {
                        tag: "skill"
                    })
                if (t.status === "dead") { c.toHand(); c.g.draw(c.side,
                    1,
                    {
                        reason: "skill", by: c.self.id
                    }) }
            },
        },
    },
})
