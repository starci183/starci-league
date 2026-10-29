// Nami (Trợ thủ, phép): máu 790 · AD 58 · giáp/kháng 30/34. Cơ chế bài riêng: RÚT BÀI + BUFF ĐỒNG MINH.
// Mẫu tham chiếu cho API: g.draw(...,{by}), hook onDraw/onCrit, extra "discard", buff đòn kế tiếp (nextAttack).
import {
    defineHero
} from "../registry"

const F_PASSIVE = "15 + 10% AP"
const F_E = "30 + 20% AP"

export default defineHero({
    id: "nami", name: "Nami", role: "support", damage: "magic", hp: 790, atk: 58, armor: 30, mr: 34,
    desc: "Thuỷ triều rút bài và tiếp sức: mỗi lá rút nhờ chiêu hồi máu đồng đội, đòn chí mạng được phước lành thì rút thêm.",
    passive: {
        name: "Thuỷ Triều",
        desc: `Mỗi lá thầy rút nhờ lá chiêu (của bất kỳ tướng nào), đồng minh máu thấp nhất hồi {${F_PASSIVE}}.`,
    },
    hooks: {
    // mỗi lá thầy rút nhờ lá chiêu (của bất kỳ tướng nào, kể cả thẻ chiêu chung và Bóng)
        onDraw(g, me, d) {
            if (d.side !== me.side || d.reason !== "skill") return
            const t = g.lowestHp(g.allies(me))
            if (t) g.heal(me,
                t,
                g.f(me,
                    F_PASSIVE))
        },
        // đòn chí mạng mang Phước Lành của Nami: thầy rút thêm 1 lá
        onCrit(g, me, d) {
            if (d.info.buffs.some((b) => b.id === "nami_bless" && b.source === me.id)) g.draw(me.side,
                1,
                {
                    reason: "skill", by: me.id
                })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Sóng Triều", target: "none", extra: "discard",
            desc: "Rút 2 lá. **Điều kiện:** 2 lá rút được **khác loại** (lá chiêu khác thẻ hỗ trợ, Đồ khác Vàng...) thì bỏ 1 lá tuỳ chọn trên tay.",
            resolve(c) {
                const got = c.g.draw(c.side,
                    2,
                    {
                        reason: "skill", by: c.self.id
                    })
                if (got.length === 2 && c.g.cardType(got[0]) !== c.g.cardType(got[1])) {
                    const uid = c.args.discard?.[0]
                    if (uid) c.g.discard(c.side,
                        uid,
                        "effect")
                }
            },
        },
        E: {
            key: "E", name: "Phước Lành", target: "ally",
            desc: `Buff 1 đồng minh: đòn đánh kế tiếp của tướng đó không cần lá Đánh thường và thêm {${F_E}} sát thương phép. **Điều kiện:** đòn đó chí mạng thì Nami rút thêm 1 lá.`,
            resolve(c) {
                const t = c.target!
                t.nextAttack = t.nextAttack.filter((b) => b.id !== "nami_bless")
                t.nextAttack.push({
                    id: "nami_bless", source: c.self.id, free: true, bonusRaw: c.f(F_E), bonusKind: "magic"
                })
                c.g.emit({
                    t: "status", target: t.id, id: "nami_bless", turns: 1, v: 1
                }) // báo cho client/bot: tướng này có đòn đánh kế được Phước Lành
            },
        },
        R: {
            key: "R", name: "Đại Hồng Thuỷ", target: "none",
            desc: "Rút 3 lá (chỉ rút bài, không gây sát thương). **Điều kiện:** đội mình chỉ còn từ 3 mạng trở xuống thì rút 5 thay vì 3.",
            resolve(c) {
                c.g.draw(c.side,
                    c.g.player(c.side).lives <= 3 ? 5 : 3,
                    {
                        reason: "skill", by: c.self.id
                    })
            },
        },
    },
})
