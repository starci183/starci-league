// Nami (Trợ thủ, phép): máu 790 · AD 58 · giáp/kháng 30/34. Một mục đích: THUỶ TRIỀU NUÔI BÀI: mỗi lá rút thành sức mạnh cho đồng đội.
// Mẫu tham chiếu cho API: g.draw(...,{by}), hook onDraw/onCrit, extra "discard", buff đòn kế tiếp (nextAttack).
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    Unit
} from "../types"

/** Phước Lành: đòn đánh kế tiếp của t không cần lá Đánh thường (+bonus phép) */
function bless(g: Game, t: Unit, nami: Unit, bonus: number) {
    t.nextAttack = t.nextAttack.filter((b) => b.id !== "nami_bless")
    t.nextAttack.push({
        id: "nami_bless", source: nami.id, free: true, bonusRaw: bonus || undefined, bonusKind: "magic"
    })
    g.emit({
        t: "status", target: t.id, id: "nami_bless", turns: 1, v: 1
    }) // báo cho client/bot: tướng này có đòn đánh kế được Phước Lành
}

const F_PASSIVE = "15 + 10% AP"
const F_E = "40 + 20% AP"

export default defineHero({
    id: "nami", name: "Nami", role: "support", damage: "magic", hp: 600, atk: 51, armor: 30, mr: 34,
    skillCopies: {
        Q: 3, E: 3, R: 1
    },
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
            key: "Q", name: "Sóng Triều", target: "none",
            desc: "Rút 2 lá. **Điều kiện:** mỗi lá chiêu rút được của một tướng mình đang trên sân thì tướng đó nhận Phước Lành (đòn đánh kế tiếp không cần lá Đánh thường).",
            resolve(c) {
                const got = c.g.draw(c.side,
                    2,
                    {
                        reason: "skill", by: c.self.id
                    })
                for (const card of got) {
                    const u = card.kind === "skill" ? c.g.unit(`${card.side}:${card.hero}`) : undefined
                    if (u && u.side === c.side && u.status === "board") bless(c.g,
                        u,
                        c.self,
                        0)
                }
            },
        },
        E: {
            key: "E", name: "Phước Lành", target: "ally",
            desc: `Buff 1 đồng minh: đòn đánh kế tiếp của tướng đó không cần lá Đánh thường và thêm {${F_E}} sát thương phép. **Điều kiện:** đòn đó chí mạng thì Nami rút thêm 1 lá.`,
            resolve(c) {
                bless(c.g,
                    c.target!,
                    c.self,
                    c.f(F_E))
            },
        },
        R: {
            key: "R", name: "Đại Hồng Thuỷ", target: "none",
            desc: "Rút 2 lá và mọi tướng mình trên sân nhận Phước Lành (đòn đánh kế tiếp không cần lá Đánh thường). **Điều kiện:** đội mình chỉ còn từ 3 mạng trở xuống thì rút 4 thay vì 2.",
            resolve(c) {
                c.g.draw(c.side,
                    c.g.player(c.side).lives <= 3 ? 4 : 2,
                    {
                        reason: "skill", by: c.self.id
                    })
                for (const u of c.g.heroes(c.side)) bless(c.g,
                    u,
                    c.self,
                    0)
            },
        },
    },
})
