// Blitzcrank (Đỡ đòn, phép): máu 480 · AD 92 · AP gốc 90 · giáp/kháng 34/33.
// CHẤT: "Thò tay vào bài địch": cướp chiêu của tướng nào thì tướng đó lãnh đòn.
// Nội tại: mỗi lá cướp được Blitz nhận Khiên; lá chung Blitz giữ dùng, lá chiêu địch biến thành 1 lá Q/E ngẫu nhiên của tướng phe bạn đang sống trên sân.
// Q cướp 1 lá ngẫu nhiên (chọn lá nếu tay địch đang lộ), lá chiêu thì chủ lá nhận sát thương. E (Quick) huỷ + giật chiêu địch, kẻ tung bị Choáng. R lộ tay địch, tướng có chiêu trên tay nhận sát thương + Choáng.
// Cơ chế engine dùng: g.stealCard (skill: "convert"), g.giveSkillToHand, g.chainFx().cancel + stealBy, g.revealHand, hook onSteal, HeroDef.ap (AP gốc).
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    otherSide, type Card, type PlayArgs, type ReactFx, type SkillKey, type Unit
} from "../types"

export const F_SHIELD = "20 + 10% AD + 15% AP"
export const F_Q = "60 + 60% AD + 60% AP"
export const F_R = "80 + 50% AD + 80% AP"

/** ReactFx kèm id tướng tung chiêu bị giật: Choáng nó SAU khi lá bị giật (Choáng trước thì mắt xích bên dưới "tan" và lá không bị giật) */
type BlitzFx = ReactFx & { blitzStun?: string }

/** Lá chiêu của một tướng (kể cả Bóng sao chép chiêu) */
const isSkillCard = (c: Card) => c.kind === "skill" || !!c.copyOf

/** Choáng 1 lượt tướng u: nếu đang là lượt của nó thì tính cả lượt kế tiếp (Choáng đủ 1 lượt đầy đủ) */
function stun(g: Game, u: Unit | undefined) {
    if (!u || u.status !== "board" || u.token) return
    g.status(u,
        "stun",
        1,
        {
            until: g.turnsUntil(u.side,
                g.s.active === u.side ? 2 : 1)
        })
}

/** AP gốc = AD cũ của Blitzcrank (V3: tướng phép có AP gốc bằng AD gốc cũ) */
const BASE_AP = 90

export default defineHero({
    id: "blitzcrank", name: "Blitzcrank", role: "tank", damage: "magic", hp: 480, atk: 92, ap: BASE_AP, armor: 34, mr: 33,
    desc: "Người máy cướp bài: thò tay vào bài địch, cướp chiêu của tướng nào thì tướng đó lãnh đòn, rồi biến chiêu cướp được thành chiêu của đội mình.",
    passive: {
        name: "Bàn Tay Sắt",
        desc: `Mỗi lá Blitzcrank Cướp Bài được: Blitzcrank nhận Khiên {${F_SHIELD}}. Lá chung về tay bạn; lá chiêu của tướng địch biến thành 1 lá Q hoặc E ngẫu nhiên của 1 tướng mình đang trên sân.`,
    },
    hooks: {
        onSteal(g, me, d) {
            if (d.side !== me.side) return
            // E giật lá giữa chuỗi: Choáng kẻ tung SAU khi lá đã bị giật; engine chỉ Đốt lá chiêu giật từ chuỗi nên ở đây đổi nó thành Q/E của tướng mình
            const fx = g.s.fx as BlitzFx | undefined
            if (fx?.blitzStun) {
                stun(g,
                    g.unit(fx.blitzStun))
                fx.blitzStun = undefined
                const owner = g.pick(g.heroes(me.side))
                if (isSkillCard(d.card) && d.card.hero && owner) g.giveSkillToHand(me.side,
                    owner.hero,
                    g.pick<SkillKey>(["Q",
                        "E"])!,
                    "steal")
            }
            g.shield(me,
                me,
                g.f(me,
                    F_SHIELD))
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Bàn Tay Hoả Tiễn", target: "none",
            desc: `Đối thủ có ít nhất 1 lá trên tay; Cướp Bài 1 lá ngẫu nhiên trên tay đối thủ (đang Xem Tay thì chọn lá). Nếu là lá chiêu: tướng chủ lá nhận {${F_Q}} sát thương phép; tướng đó đã chết hoặc chưa ra sân thì sát thương rơi vào 1 tướng địch còn sống ngẫu nhiên.`,
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
                const g = c.g
                const foe = otherSide(c.side)
                const uid = c.args.pick && g.handRevealed(foe) ? c.args.pick : undefined
                const card = g.stealCard(c.side,
                    foe,
                    {
                        uid, skill: "convert"
                    })
                if (!card || !isSkillCard(card) || !card.hero) return
                // chủ lá nhận đòn; chết hoặc chưa ra sân thì 1 tướng địch còn sống ngẫu nhiên
                let t = g.unit(`${card.side ?? foe}:${card.hero}`)
                if (!t || t.status !== "board" || t.side === c.side) {
                    t = g.pick(g.targetableEnemies(c.self).filter((x) => !x.token))
                    if (t) g.log(`Blitzcrank Q: chủ lá không trên sân, sát thương ngẫu nhiên trúng ${g.nameOf(t)}`)
                }
                if (t) g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
            },
        },
        E: {
            key: "E", name: "Tay Giật", target: "none", quick: true, chainOnly: true,
            desc: "Quick, Chỉ Nối Chuỗi. Khi địch dùng 1 lá chiêu: Vô Hiệu lá đó rồi Cướp Bài nó; tướng tung chiêu bị Choáng 1 lượt.",
            quickWhen: (c) => c.trigger.side !== c.side && !!c.trigger.card && isSkillCard(c.trigger.card),
            resolve(c) {
                const fx = c.g.chainFx() as BlitzFx
                fx.cancel = true
                fx.stealBy = c.side
                fx.blitzStun = c.trigger?.actor
            },
        },
        R: {
            key: "R", name: "Trường Điện Từ", target: "none",
            desc: `Xem Tay tới hết lượt; mọi tướng địch có lá chiêu của mình trên tay đối thủ nhận {${F_R}} sát thương phép và bị Choáng 1 lượt.`,
            resolve(c) {
                const g = c.g
                const foe = otherSide(c.side)
                g.revealHand(foe)
                const hand = g.player(foe).hand
                const dmg = c.f(F_R)
                for (const t of g.heroes(foe)) {
                    if (!hand.some((x) => isSkillCard(x) && x.hero === t.hero && (x.side ?? foe) === foe)) continue
                    g.damage(c.self,
                        t,
                        dmg,
                        "magic",
                        {
                            tag: "skill"
                        })
                    stun(g,
                        t)
                }
            },
        },
    },
})
