// Soraka (Trợ thủ, phép): máu 800 · AD 58 · giáp/kháng 30/34. Lối chơi: BỀN BÀI (đổi bài thừa lấy máu, xáo mộ vào lại bộ).
import {
    defineHero
} from "../registry"
import type {
    Card, PlayArgs
} from "../types"

const F_PASSIVE = "20 + 10% AP"
const F_Q = "40 + 20% AD + 40% AP"
const F_Q_HEAL = "30 + 20% AP"
const F_E = "70 + 30% AP"
const F_R = "120 + 50% AP"
const F_R_SHIELD = "100 + 30% AP"

export default defineHero({
    id: "soraka", name: "Soraka", role: "support", damage: "magic", hp: 800, atk: 58, armor: 30, mr: 34,
    desc: "Lá thừa và lá chết không bao giờ phí: bỏ đi để hồi máu. Bộ bài sắp cạn thì Nguyện Ước hồi cả đội và nạp lại bộ.",
    passive: {
        name: "Sao Băng",
        desc: `Mỗi lá bị bỏ khỏi tay thầy (bất kỳ lý do gì, trừ lá tràn tay chưa kịp lên tay), đồng minh máu thấp nhất hồi {${F_PASSIVE}}.`,
    },
    hooks: {
        onDiscard(g, me, d) {
            if (d.side !== me.side || d.reason === "overflow") return
            const t = g.lowestHp(g.allies(me))
            if (t) g.heal(me,
                t,
                g.f(me,
                    F_PASSIVE))
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Sao Rơi", target: "enemy",
            desc: `{${F_Q}} sát thương phép cho 1 tướng địch, Soraka hồi {${F_Q_HEAL}}. **Điều kiện:** mộ bài có từ 10 lá thì đồng minh máu thấp nhất cũng hồi {${F_Q_HEAL}}.`,
            resolve(c) {
                c.g.damage(c.self,
c.target!,
c.f(F_Q),
"magic",
{
    tag: "skill"
})
                c.g.heal(c.self,
                    c.self,
                    c.f(F_Q_HEAL))
                if (c.g.player(c.side).grave.length >= 10) {
                    const t = c.g.lowestHp(c.g.allies(c.self))
                    if (t) c.g.heal(c.self,
                        t,
                        c.f(F_Q_HEAL))
                }
            },
        },
        E: {
            key: "E", name: "Hiến Tế", target: "ally",
            desc: `Chọn 1 tướng mình, bỏ bao nhiêu lá trên tay tuỳ ý: mỗi lá bỏ đi hồi cho tướng đó {${F_E}}. **Điều kiện:** lá bỏ là **lá chết** (lá chiêu của tướng đang chết hoặc chưa ra sân) thì hồi thêm 50%.`,
            options(c) {
                const hand = c.g.player(c.side).hand.filter((x) => x.uid !== c.card.uid)
                // Gợi ý các tiền tố của thứ tự bỏ: lá chết, rồi Vàng/Đồ/Đánh thường, lá chiêu Q/E, cuối cùng lá R
                const rank = (x: Card) => (c.g.isDeadCard(x) ? 0 : x.kind === "special" ? 1 : x.kind === "support" ? (x.id === "gold" || x.id === "item" ? 2 : x.id === "basic" ? 3 : 5) : x.id.endsWith("r") ? 8 : 6)
                const order = [...hand].sort((a, b) => rank(a) - rank(b))
                const out: PlayArgs[] = []
                for (const a of c.g.allies(c.self)) for (let k = 1; k <= order.length; k++) out.push({
                    target: a.id, discard: order.slice(0,
                        k).map((x) => x.uid)
                })
                return out
            },
            resolve(c) {
                const t = c.target!
                for (const uid of c.args.discard ?? []) {
                    const card = c.g.player(c.side).hand.find((x) => x.uid === uid)
                    const dead = !!card && c.g.isDeadCard(card)
                    if (!c.g.discard(c.side,
                        uid,
                        "effect")) continue
                    c.g.heal(c.self,
                        t,
                        c.f(F_E) * (dead ? 1.5 : 1))
                }
            },
        },
        R: {
            key: "R", name: "Nguyện Ước", target: "all_allies",
            desc: `Mọi tướng mình hồi {${F_R}}, rồi **xáo toàn bộ mộ bài vào lại bộ bài**. **Điều kiện:** bộ bài còn dưới 10 lá (trước khi xáo) thì mọi đồng minh còn nhận Khiên {${F_R_SHIELD}}.`,
            resolve(c) {
                const low = c.g.player(c.side).deck.length < 10
                for (const u of c.g.allies(c.self)) {
                    c.g.heal(c.self,
                        u,
                        c.f(F_R))
                    if (low) c.g.shield(c.self,
                        u,
                        c.f(F_R_SHIELD))
                }
                c.g.shuffleGraveIntoDeck(c.side)
            },
        },
    },
})
