// Nami (Trợ thủ, phép): máu 400 · AD 58 · giáp/kháng 28/32.
// CHẤT: "Đồng đội đánh là rút bài". Nami nuôi tay bài cho cả đội: đòn đầu tiên của mỗi đồng minh trúng địch mỗi lượt cho bạn rút 1 lá.
// Q rút thẳng 2 lá, E đánh dấu 1 đồng minh để lượt này MỖI đòn trúng của nó đều rút, R rút tới khi tay đủ 5 lá.
// Engine: hook onAttackHit + g.oncePerTurn + g.status (E, hết lượt chủ) + g.draw (tay đầy thì engine đốt lá thừa). Trợ thủ: ra sân thì Q và E vào tay.
// Đối thủ trả lời: cướp bài vừa rút (Blitzcrank), Nấm của Teemo, khoá đòn đánh (Say Mê/disarm), dồn chết Nami trước.
import {
    defineHero
} from "../registry"

const MARK = "nami_draw"
const HAND_TARGET = 5

export default defineHero({
    id: "nami", name: "Nami", role: "support", damage: "magic", hp: 360, atk: 66, armor: 28, mr: 32,
    bot: {
        buffValue: {
            nami_draw: 25,
        },
    },
    desc: "Đồng đội đánh là rút bài: cả đội đánh, Nami rút bài; Q, E và R đẩy nhanh tay bài.",
    passive: {
        name: "Triều Bài",
        desc: "Mỗi lượt, đòn đánh đầu tiên của mỗi đồng minh trúng địch: bạn rút 1 lá.",
    },
    hooks: {
        onAttackHit(g, me, d) {
            const a = d.attacker
            if (a.side !== me.side || a.token || d.target.side === me.side) return
            // Luôn gọi oncePerTurn để ghi nhận đòn đầu tiên của lượt, dù có rút hay không
            const first = g.oncePerTurn(a,
                "nami:first")
            let n = first ? 1 : 0
            if (g.has(a,
                MARK)) n += 1
            if (n > 0) g.draw(me.side,
                n,
                {
                    reason: "effect", by: me.id
                })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Dòng Chảy", target: "self",
            desc: "Rút 2 lá.",
            resolve(c) {
                c.g.draw(c.side,
                    2,
                    {
                        reason: "effect", by: c.self.id
                    })
            },
        },
        E: {
            key: "E", name: "Phước Lành", target: "ally",
            desc: "Chọn 1 tướng mình: lượt này mỗi đòn đánh của nó trúng địch, bạn rút 1 lá.",
            resolve(c) {
                c.g.status(c.target!,
                    MARK,
                    1,
                    {
                        of: c.side
                    })
            },
        },
        R: {
            key: "R", name: "Sóng Bài", target: "none",
            desc: `Rút tới khi tay đủ ${HAND_TARGET} lá (tay từ ${HAND_TARGET} lá trở lên thì không rút).`,
            resolve(c) {
                const need = HAND_TARGET - c.g.player(c.side).hand.length
                if (need > 0) c.g.draw(c.side,
                    need,
                    {
                        reason: "effect", by: c.self.id
                    })
            },
        },
    },
})
