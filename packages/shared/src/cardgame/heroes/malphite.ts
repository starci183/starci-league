// Malphite (Đỡ đòn, phép): máu 1040 · AD 64 · giáp/kháng 44/30.
// MỤC ĐÍCH: Giáp là tất cả — mọi lá của Malphite tính theo Giáp; hắn "ăn" mảnh Đồ để hoá đá (+giáp/kháng vĩnh viễn),
// Khiên Đá bằng Giáp, và Lao Thẳng (R) càng nhiều Giáp càng đau, không lá Quick nào chặn được. Engine: items.
// Cơ chế engine dùng: công thức "% Giáp", stack "bonusRes" (Game.armor/mr cộng thẳng), SkillDef.uncounterable, options với discard.
import {
    defineHero
} from "../registry"
import type {
    Card, PlayArgs
} from "../types"

const F_PASSIVE = "200% Giáp"
const F_Q = "30 + 80% Giáp + 30% AP"
const F_E = "120% Giáp"
const F_R = "40 + 120% Giáp + 30% AP"
const ROCK = 10
const ROCK_MAX = 60
const isComponent = (x: Card) => x.kind === "support" && x.id === "item"

export default defineHero({
    id: "malphite", name: "Malphite", role: "tank", damage: "magic", hp: 960, atk: 61, armor: 44, mr: 30,
    skillCopies: {
        Q: 4, E: 4, R: 2
    },
    desc: "Mảnh vỡ Monolith: mọi chiêu đều tính theo Giáp. Nuốt mảnh Đồ để hoá đá, và Lao Thẳng không lá Quick nào cứu được.",
    passive: {
        name: "Khiên Đá Granite",
        desc: `Đầu lượt của bạn, nếu Malphite không có Khiên, hắn nhận Khiên {${F_PASSIVE}}.`,
    },
    hooks: {
        onTurnStart(g, me, d) {
            if (d.side === me.side && me.shield <= 0) g.shield(me,
                me,
                g.f(me,
                    F_PASSIVE))
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Mảnh Chấn Địa", target: "enemy",
            desc: `{${F_Q}} sát thương phép lên 1 tướng địch và Rã giáp nó 1 lượt. **Điều kiện:** Giáp của mục tiêu thấp hơn Giáp của Malphite thì sát thương tăng 50%.`,
            resolve(c) {
                const t = c.target!
                const softer = c.g.armor(t) < c.g.armor(c.self)
                c.g.damage(c.self,
                    t,
                    c.f(F_Q) * (softer ? 1.5 : 1),
                    "magic",
                    {
                        tag: "skill"
                    })
                c.g.status(t,
                    "shred",
                    1)
            },
        },
        E: {
            key: "E", name: "Hoá Đá", target: "self",
            desc: `Có thể bỏ 1 lá Đồ (mảnh) trên tay: Malphite +${ROCK} giáp và kháng phép vĩnh viễn (tối đa +${ROCK_MAX}, hiện trên tướng). Rồi Malphite nhận Khiên {${F_E}}. **Điều kiện:** Malphite đeo từ 2 món đồ thì Khiên gấp đôi.`,
            options(c) {
                const out: PlayArgs[] = [{
                }]
                if (c.g.stackOf(c.self,
                    "bonusRes") >= ROCK_MAX) return out
                const seen = new Set<string>()
                for (const x of c.g.player(c.side).hand) {
                    if (!isComponent(x) || seen.has(x.item ?? "")) continue
                    seen.add(x.item ?? "")
                    out.push({
                        discard: [x.uid]
                    })
                }
                return out
            },
            resolve(c) {
                const uid = c.args.discard?.[0]
                const card = uid ? c.g.player(c.side).hand.find((x) => x.uid === uid) : undefined
                if (card && isComponent(card) && c.g.discard(c.side,
                    card.uid,
                    "cost")) c.g.stack(c.self,
                    "bonusRes",
                    ROCK,
                    ROCK_MAX)
                c.g.shield(c.self,
                    c.self,
                    c.f(F_E) * (c.self.items.length >= 2 ? 2 : 1))
            },
        },
        R: {
            key: "R", name: "Lao Thẳng", target: "all_enemies", uncounterable: true,
            desc: `**Không thể bị nối chuỗi.** Mọi tướng địch nhận {${F_R}} sát thương phép và bị Choáng 1 lượt. **Điều kiện:** Malphite đang có Khiên thì mỗi tướng địch nhận thêm sát thương phép bằng 50% lượng Khiên đó.`,
            resolve(c) {
                const extra = c.self.shield > 0 ? c.self.shield * 0.5 : 0
                for (const u of c.g.enemies(c.self)) {
                    c.g.damage(c.self,
                        u,
                        c.f(F_R) + extra,
                        "magic",
                        {
                            tag: "skill"
                        })
                    c.g.status(u,
                        "stun",
                        1)
                }
            },
        },
    },
})
