// Zed (Sát thủ, vật lý): máu 330 · AD 125 · giáp/kháng 28/26.
// CHẤT: "Một nhịp". Dồn bài đánh thường và chiêu trong một lượt, mỗi phát sau đau hơn phát trước (Liên Hoàn).
// Q là một phát, E lướt tới con mồi, R đánh dấu: đánh ngay và nổ thêm lần nữa cuối lượt (cả hai phát đều tính Liên Hoàn).
// Engine: hook onDamage (đếm phát bằng status "zed_chain", hết cuối lượt), status "zed_mark" + hook onTurnEnd, g.moveTo.
// Đối thủ trả lời: Janna (huỷ một đòn làm gãy nhịp), Annie, Braum (Choáng/Khiên trong lượt địch), Choáng Zed trước khi xả bài.
import {
    pct
} from "../formula"
import {
    defineHero
} from "../registry"
import {
    otherSide
} from "../types"

/** Số phát Zed đã gây sát thương trong lượt này (status v, hết ở cuối lượt) */
const CHAIN = "zed_chain"
/** Dấu Ấn Tử Thần trên địch: nổ lần hai ở cuối lượt của Zed */
const MARK = "zed_mark"
export const F_Q = "40 + 100% AD + 20% AP"
export const F_E = "30 + 80% AD + 15% AP"
export const F_R = "60 + 100% AD + 20% AP"
/** Liên Hoàn: sát thương thêm cho MỖI phát Zed đã gây trước đó trong lượt */
export const F_CHAIN = "8 + 8% AD + 2% AP"
/** Liên Hoàn: phần trăm máu đã mất của mục tiêu */
const MISSING = 0.05

export default defineHero({
    id: "zed", name: "Zed", role: "assassin", damage: "physical", hp: 330, atk: 125, armor: 28, mr: 26,
    bot: {
        markValue: {
            zed_mark: 70,
        },
        buffValue: {
            zed_chain: 10,
        },
    },
    desc: "Chủ nhân Bóng Tối: tung hết bài trong một nhịp, mỗi phát sau đau hơn phát trước.",
    passive: {
        name: "Liên Hoàn",
        desc: `Mỗi lần Zed gây sát thương bằng đòn đánh hoặc chiêu: phát đó gây thêm {${F_CHAIN}} sát thương cho mỗi lần Zed đã gây sát thương trước đó trong lượt này, cộng ${pct(MISSING)}% máu đã mất của mục tiêu. Đếm lại từ 0 mỗi lượt.`,
    },
    hooks: {
        onDamage(g, me, d) {
            const t = d.target
            if (d.src?.id !== me.id || t.side === me.side || t.token) return
            if (d.tag !== "attack" && d.tag !== "skill") return
            const before = g.statusV(me,
                CHAIN)
            g.status(me,
                CHAIN,
                1,
                {
                    v: before + 1, until: g.s.turnNo
                })
            if (t.status !== "board" || t.hp <= 0) return
            const raw = before * g.f(me,
                F_CHAIN) + (t.maxHp - t.hp) * MISSING
            // phát thêm là hiệu ứng (tag "effect"): không tự kích Liên Hoàn lần nữa
            if (raw > 0) g.damage(me,
                t,
                raw,
                d.kind,
                {
                    tag: "effect"
                })
        },
        onTurnEnd(g, me, d) {
            if (d.side !== me.side) return
            for (const t of g.heroes(otherSide(me.side))) {
                if (!g.has(t,
                    MARK)) continue
                g.removeStatus(t,
                    MARK)
                // phát nổ lần hai: là chiêu nên cũng tính Liên Hoàn
                g.damage(me,
                    t,
                    g.f(me,
                        F_R),
                    "physical",
                    {
                        tag: "skill"
                    })
            }
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Phi Tiêu Sắc Lẻm", target: "opposite",
            desc: `Chọn tướng địch đối diện Zed; gây {${F_Q}} sát thương vật lý.`,
            resolve(c) {
                c.g.damage(c.self,
                    c.target!,
                    c.f(F_Q),
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
        E: {
            key: "E", name: "Phân Thân", target: "enemy",
            desc: `Chọn 1 tướng địch; Zed đổi chỗ để đứng đối diện nó, rồi nó nhận {${F_E}} sát thương vật lý.`,
            resolve(c) {
                const t = c.target!
                c.g.faceEnemy(c.self,
                    t)
                c.g.damage(c.self,
                    t,
                    c.f(F_E),
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
        R: {
            key: "R", name: "Dấu Ấn Tử Thần", target: "enemy",
            desc: `Chọn 1 tướng địch; nó nhận {${F_R}} sát thương vật lý ngay. Cuối lượt này nó nhận thêm một lần nữa.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_R),
                    "physical",
                    {
                        tag: "skill"
                    })
                if (t.status === "board") c.g.status(t,
                    MARK,
                    1,
                    {
                        until: c.g.s.turnNo
                    })
            },
        },
    },
})
