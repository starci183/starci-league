// Blitzcrank (Đỡ đòn): máu 450 · AD 65 · giáp/kháng 35/32.
// CHẤT: "Thò tay vào bài địch": phạt việc giữ bài, cướp đúng lá địch cần.
// Nội tại: lá chung cướp được Blitz giữ dùng; lá chiêu của tướng địch bị Đốt vào mộ chủ và tướng đó Choáng 1 lượt.
// Q cướp 1 lá ngẫu nhiên (chọn lá nếu tay địch đang lộ). E (Quick) giật lá địch vừa đánh. R lộ tay địch và Choáng tướng có chiêu trên tay.
// Cơ chế engine dùng: g.stealCard (skill: "burn"), g.chainFx().cancel + stealBy, g.revealHand, g.handRevealed, hook onSteal.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    otherSide, type Card, type PlayArgs, type Unit
} from "../types"

/** Lá chiêu của một tướng (kể cả Bóng sao chép chiêu) */
const isSkillCard = (c: Card) => c.kind === "skill" || !!c.copyOf

/** Choáng 1 lượt tướng chủ lá: nếu đang là lượt của nó thì tính cả lượt kế tiếp (Choáng đủ 1 lượt đầy đủ) */
function stunOwner(g: Game, u: Unit | undefined) {
    if (!u || u.status !== "board" || u.token) return
    g.status(u,
        "stun",
        1,
        {
            until: g.turnsUntil(u.side,
                g.s.active === u.side ? 2 : 1)
        })
}

export default defineHero({
    id: "blitzcrank", name: "Blitzcrank", role: "tank", damage: "magic", hp: 450, atk: 90, armor: 38, mr: 38,
    desc: "Người máy cướp bài: thò tay vào bài địch, cướp đúng lá chúng cần. Lá chiêu bị cướp là lá cháy, tướng chủ lá đứng hình.",
    passive: {
        name: "Bàn Tay Sắt",
        desc: "Lá bạn Cướp Bài được: lá chung về tay bạn; lá chiêu của tướng địch bị Đốt và tướng đó Choáng 1 lượt.",
    },
    hooks: {
        onSteal(g, me, d) {
            if (d.side !== me.side || !isSkillCard(d.card) || !d.card.hero) return
            const owner = g.unit(`${d.card.side ?? d.from}:${d.card.hero}`)
            if (owner && owner.side !== me.side) stunOwner(g,
                owner)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Bàn Tay Hoả Tiễn", target: "none",
            desc: "Đối thủ có ít nhất 1 lá trên tay; Cướp Bài 1 lá ngẫu nhiên trên tay đối thủ. Nếu bạn đang Xem Tay: chọn lá.",
            canPlay: (c) => c.g.player(otherSide(c.side)).hand.length > 0,
            options(c) {
                const foe = otherSide(c.side)
                const hand = c.g.player(foe).hand
                if (!hand.length) return []
                if (!c.g.handRevealed(foe)) return [{
                }]
                const seen = new Set<string>()
                const out: PlayArgs[] = []
                for (const x of hand) {
                    const key = `${x.kind}:${x.id}`
                    if (seen.has(key)) continue
                    seen.add(key)
                    out.push({
                        pick: x.uid
                    })
                }
                return out
            },
            resolve(c) {
                const foe = otherSide(c.side)
                const uid = c.args.pick && c.g.handRevealed(foe) ? c.args.pick : undefined
                c.g.stealCard(c.side,
                    foe,
                    {
                        uid, skill: "burn"
                    })
            },
        },
        E: {
            key: "E", name: "Tay Giật", target: "none", quick: true, chainOnly: true,
            desc: "Quick, Chỉ Nối Chuỗi. Khi địch đánh 1 lá: Vô Hiệu lá đó rồi Cướp Bài nó.",
            quickWhen: (c) => c.trigger.side !== c.side && !!c.trigger.card,
            resolve(c) {
                const fx = c.g.chainFx()
                fx.cancel = true
                fx.stealBy = c.side
            },
        },
        R: {
            key: "R", name: "Trường Điện Từ", target: "none",
            desc: "Xem Tay tới hết lượt; mọi tướng địch có lá chiêu của mình trên tay đối thủ bị Choáng 1 lượt.",
            resolve(c) {
                const foe = otherSide(c.side)
                c.g.revealHand(foe)
                const hand = c.g.player(foe).hand
                for (const t of c.g.heroes(foe)) if (hand.some((x) => isSkillCard(x) && x.hero === t.hero)) stunOwner(c.g,
                    t)
            },
        },
    },
})
