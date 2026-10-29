// Soraka (Trợ thủ, phép): máu 800 · AD 58 · giáp/kháng 30/34.
// MỤC ĐÍCH: Bền bài — không lá nào phí: lá thừa/lá chết bỏ đi thành máu, mộ bài được đưa trở lại bộ để đội không bao giờ cạn bài.
// Soraka không gây sát thương; nàng thắng bằng cách sống lâu hơn (chống Ép cạn bài). Engine: recycle.
// Cơ chế engine dùng: hook onDiscard (mọi lá bỏ khỏi tay, kể cả do địch ép bỏ), g.shuffleIn / g.shuffleGraveIntoDeck, options với discard tuỳ ý.
import {
    defineHero
} from "../registry"
import type {
    Card, PlayArgs
} from "../types"

const F_PASSIVE = "20 + 10% AP"
const F_Q = "40 + 25% AP"
const F_E = "45 + 30% AP"
const F_R = "80 + 50% AP"
const F_R_SHIELD = "100 + 30% AP"
const Q_CARDS = 3
const LOW_DECK = 10

export default defineHero({
    id: "soraka", name: "Soraka", role: "support", damage: "magic", hp: 570, atk: 49, armor: 30, mr: 34,
    skillCopies: {
        Q: 5, E: 5, R: 2
    },
    desc: "Lá thừa và lá chết không bao giờ phí: bỏ đi để hồi máu. Mộ bài được gieo lại vào bộ, bộ bài sắp cạn thì Nguyện Ước nạp đầy.",
    passive: {
        name: "Sao Băng",
        desc: `Mỗi lá bị bỏ khỏi tay bạn (bất kỳ lý do gì, kể cả đối thủ ép bỏ; trừ lá tràn tay), đồng minh máu thấp nhất hồi {${F_PASSIVE}}.`,
    },
    hooks: {
        onDiscard(g, me, d) {
            if (d.side !== me.side || d.reason === "overflow") return
            const t = g.lowestHp(g.heroes(me.side))
            if (t) g.heal(me,
                t,
                g.f(me,
                    F_PASSIVE))
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Gieo Sao", target: "none",
            desc: `Xáo ${Q_CARDS} lá trên cùng mộ bài của bạn vào lại bộ bài; mỗi lá xáo vào, đồng minh máu thấp nhất hồi {${F_Q}}. **Điều kiện:** bộ bài của bạn đang ít lá hơn mộ bài thì rút thêm 1 lá.`,
            canPlay: (c) => c.g.player(c.side).grave.length > 0,
            resolve(c) {
                const p = c.g.player(c.side)
                const thin = p.deck.length < p.grave.length
                const cards = p.grave.splice(Math.max(0,
                    p.grave.length - Q_CARDS))
                if (cards.length) c.g.shuffleIn(c.side,
                    cards)
                for (let i = 0; i < cards.length; i++) {
                    const t = c.g.lowestHp(c.g.heroes(c.side))
                    if (t) c.g.heal(c.self,
                        t,
                        c.f(F_Q))
                }
                if (thin) c.g.draw(c.side,
                    1,
                    {
                        reason: "skill", by: c.self.id
                    })
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
                for (const a of c.g.heroes(c.side)) for (let k = 1; k <= order.length; k++) out.push({
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
            desc: `Mọi tướng mình hồi {${F_R}}, rồi **xáo toàn bộ mộ bài vào lại bộ bài**. **Điều kiện:** bộ bài còn dưới ${LOW_DECK} lá (trước khi xáo) thì mọi tướng mình còn nhận Khiên {${F_R_SHIELD}}.`,
            resolve(c) {
                const low = c.g.player(c.side).deck.length < LOW_DECK
                for (const u of c.g.heroes(c.side)) {
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
