// Braum (Đỡ đòn, phép): máu 1000 · AD 62 · giáp/kháng 37/37. Lối chơi: HỘ VỆ PHẢN ỨNG.
// Giữ Q/E trên tay, chơi trong lượt đối thủ. Cơ chế engine dùng: lá Quick chỉ nối chuỗi (quick + chainOnly), đổi mục tiêu (g.chainFx().redirect),
// giảm sát thương/miễn khống chế (fx.cut, fx.cutNoCc), phản sát thương (fx.reflect*).
import {
    defineHero
} from "../registry"
import type {
    Card, Unit
} from "../types"

const F_Q_SHIELD = "60 + 10% máu cộng thêm + 30% AP"
const F_R = "80 + 40% AP"
const REFLECT = 0.3
const CUT = 0.4

const isReactCard = (c: Card) => c.kind === "skill" && c.hero === "braum" && (c.id === "braum_q" || c.id === "braum_e")

export default defineHero({
    id: "braum", name: "Braum", role: "tank", damage: "magic", hp: 1000, atk: 62, armor: 37, mr: 37,
    desc: "Tấm khiên của Freljord. Hầu như chỉ chơi bài trong lượt đối thủ: Q đỡ đòn đơn, E đỡ chiêu diện rộng, mỗi lần phản ứng lại được rút thêm bài.",
    passive: {
        name: "Cảnh Giác",
        desc: "Cuối lượt đối thủ, nếu trong lượt đó Braum đã dùng ít nhất 1 lá phản ứng, bạn rút 1 lá.",
    },
    hooks: {
        onTurnStart(g, me, d) { if (d.side === me.side) g.setStack(me,
            "reacted",
            0) },
        onTurnEnd(g, me, d) {
            if (d.side === me.side) return
            if (g.stackOf(me,
                "reacted") > 0) { g.setStack(me,
                "reacted",
                0); g.draw(me.side,
                1,
                {
                    reason: "skill", by: me.id
                }) }
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Đứng Sau Tôi", target: "none",
            desc: `Phản ứng, khi 1 đồng minh bị chọn làm mục tiêu: đổi mục tiêu sang Braum, và Braum nhận Khiên {${F_Q_SHIELD}}. **Điều kiện:** Braum đang có Khiên từ trước thì phản lại ${REFLECT * 100}% sát thương đó cho kẻ tấn công.`,
            quick: true, chainOnly: true,
            quickWhen: (c) => c.trigger.side !== c.side && !!c.trigger.single && c.trigger.target !== c.self.id && !!c.trigger.redirectable?.includes(c.self.id),
            resolve(c) {
                const braum = c.self
                const had = braum.shield > 0
                const fx = c.g.chainFx()
                fx.redirect = braum.id
                c.g.shield(braum,
                    braum,
                    c.f(F_Q_SHIELD))
                if (had) { fx.reflectUnit = braum.id; fx.reflectPct = REFLECT }
                c.g.setStack(braum,
                    "reacted",
                    1)
            },
        },
        E: {
            key: "E", name: "Bất Khả Xâm Phạm", target: "none",
            desc: `Phản ứng, khi địch dùng chiêu nhắm nhiều tướng (tối đa N hoặc mọi tướng): mọi đồng minh nhận ít hơn ${CUT * 100}% sát thương từ chiêu đó. **Điều kiện:** chiêu bị chặn là chiêu cuối (R) thì đồng minh còn được miễn hiệu ứng khống chế của nó.`,
            quick: true, chainOnly: true,
            quickWhen: (c) => c.trigger.side !== c.side && !!c.trigger.multi,
            resolve(c) {
                const fx = c.g.chainFx()
                fx.cut = CUT; fx.cutSide = c.side
                if (c.trigger?.ult) fx.cutNoCc = true
                c.g.setStack(c.self,
                    "reacted",
                    1)
            },
        },
        R: {
            key: "R", name: "Vết Nứt Băng Giá", target: "all_enemies",
            desc: `Dùng trong lượt mình: {${F_R}} sát thương phép cho mọi tướng địch và Choáng 1 lượt. **Điều kiện:** trên tay còn từ 2 lá phản ứng (Q/E của Braum) thì Choáng 2 lượt.`,
            resolve(c) {
                const reacts = c.g.player(c.side).hand.filter(isReactCard).length
                const turns = reacts >= 2 ? 2 : 1
                for (const t of c.g.enemies(c.self) as Unit[]) {
                    c.g.damage(c.self,
                        t,
                        c.f(F_R),
                        "magic",
                        {
                            tag: "skill"
                        })
                    c.g.status(t,
                        "stun",
                        turns)
                }
            },
        },
    },
})
