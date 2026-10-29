// Malphite (Đỡ đòn): máu 500 · AD 62 · giáp/kháng 45/30.
// CHẤT: "Núi đá": tay bài càng dày, Malphite càng cứng và đập càng đau.
// Nội tại: nhận ít hơn 5% sát thương cho mỗi lá trên tay bạn. Q: sát thương 1 địch theo số lá trên tay. E (Quick): bị đánh thì rút 2 lá.
// R: bỏ cả tay, mọi địch nhận sát thương theo số lá đã bỏ (×2 so với Q). Cơ chế engine dùng: HeroDef.modifyDamage, g.draw, g.discard.
import {
    pct
} from "../formula"
import {
    defineHero
} from "../registry"

const F_CARD = "10 + 16% AD"
const R_MULT = 2
const CUT_PER_CARD = 0.035
const E_DRAW = 2

export default defineHero({
    id: "malphite", name: "Malphite", role: "tank", damage: "magic", hp: 380, atk: 68, armor: 39, mr: 30,
    desc: "Ngọn núi biết đi: tay bài càng dày càng cứng, rồi ném cả tay thành đá rơi xuống đầu địch.",
    passive: {
        name: "Vỏ Đá",
        desc: `Malphite nhận ít hơn ${pct(CUT_PER_CARD)}% sát thương cho mỗi lá trên tay bạn.`,
    },
    modifyDamage(g, me, d) {
        if (d.target.id !== me.id) return 1
        return 1 - Math.min(10,
            g.player(me.side).hand.length) * CUT_PER_CARD
    },
    skills: {
        Q: {
            key: "Q", name: "Đập Đá", target: "enemy",
            desc: `Chọn 1 tướng địch; gây sát thương phép cho nó, mỗi lá trên tay bạn {${F_CARD}}.`,
            resolve(c) {
                const n = c.g.player(c.side).hand.length
                if (n <= 0) return
                c.g.damage(c.self,
                    c.target!,
                    n * c.f(F_CARD),
                    "magic",
                    {
                        tag: "skill"
                    })
            },
        },
        E: {
            key: "E", name: "Lăn Đá", target: "none", quick: true, chainOnly: true,
            desc: `Quick, Chỉ Nối Chuỗi. Khi địch đánh Malphite: bạn rút ${E_DRAW} lá trước khi tính sát thương.`,
            quickWhen: (c) => c.trigger.side !== c.side && c.trigger.target === c.self.id,
            resolve(c) {
                c.g.draw(c.side,
                    E_DRAW,
                    {
                        reason: "skill", by: c.self.id
                    })
            },
        },
        R: {
            key: "R", name: "Núi Lở", target: "all_enemies",
            desc: `Bỏ toàn bộ tay; mọi tướng địch nhận sát thương phép, mỗi lá đã bỏ {${F_CARD}} ×${R_MULT}.`,
            resolve(c) {
                const hand = [...c.g.player(c.side).hand]
                for (const x of hand) c.g.discard(c.side,
                    x.uid,
                    "cost")
                if (!hand.length) return
                for (const t of c.g.enemies(c.self)) c.g.damage(c.self,
                    t,
                    hand.length * R_MULT * c.f(F_CARD),
                    "magic",
                    {
                        tag: "skill"
                    })
            },
        },
    },
})
