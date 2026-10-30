// Blitzcrank (Đỡ đòn, phép): máu 490 · AD 64 · AP gốc 0 · giáp/kháng 34/33.
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
import {
    ccApply, ccDuration
} from "./braum"

export const F_SHIELD = "35 + 15% AD + 15% AP"
export const F_Q = "90 + 65% AD + 60% AP"
export const F_R = "120 + 65% AD + 80% AP"
/** E: Choáng 1 + 0,15% AP đơn vị; R: Choáng 1 + 0,1% AP đơn vị (law.md §4, neo phe Blitzcrank) */
export const E_STUN = {
    base: 1, ap: 0.0015
}
export const R_STUN = {
    base: 1, ap: 0.001
}

/** ReactFx kèm id tướng tung chiêu bị giật: Choáng nó SAU khi lá bị giật (Choáng trước thì mắt xích bên dưới "tan" và lá không bị giật) */
type BlitzFx = ReactFx & { blitzStun?: string }

/** Lá chiêu của một tướng (kể cả Bóng sao chép chiêu) */
const isSkillCard = (c: Card) => c.kind === "skill" || !!c.copyOf

/** Choáng theo đơn vị thời gian của Blitzcrank */
function stun(g: Game, me: Unit, u: Unit | undefined, o: { base: number; ap: number }, label: string) {
    ccApply(g,
        me,
        u,
        "stun",
        ccDuration(g,
            me,
            o),
        label)
}


export default defineHero({
    id: "blitzcrank", name: "Blitzcrank", role: "tank", damage: "magic", hp: 490, atk: 64, armor: 34, mr: 33,
    desc: "Người máy cướp bài: thò tay vào bài địch, cướp chiêu của tướng nào thì tướng đó lãnh đòn, rồi biến chiêu cướp được thành chiêu của đội mình.",
    passive: {
        name: "Bàn Tay Sắt",
        desc: `Mỗi lần cướp thành công 1 lá, Blitzcrank nhận {${F_SHIELD}} Khiên trắng. Lá chung về tay; chiêu thường đổi thành 1 Q/E ngẫu nhiên của một đồng minh sống trên bàn. Chiêu tạm biến mất, không tạo bài thật; cướp thành công vẫn cho Khiên.`,
    },
    hooks: {
        onSteal(g, me, d) {
            if (d.side !== me.side) return
            // E giật lá giữa chuỗi: Choáng kẻ tung SAU khi lá đã bị giật; engine chỉ Đốt lá chiêu giật từ chuỗi nên ở đây đổi nó thành Q/E của tướng mình
            const fx = g.s.fx as BlitzFx | undefined
            if (fx?.blitzStun) {
                stun(g,
                    me,
                    g.unit(fx.blitzStun),
                    E_STUN,
                    "Blitzcrank E Choáng")
                fx.blitzStun = undefined
                const owner = g.pick(g.heroes(me.side))
                // chiêu tạm (mage) biến mất, không đổi thành bài thật
                if (isSkillCard(d.card) && d.card.hero && !d.card.temp && owner) g.giveSkillToHand(me.side,
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
            key: "Q", mana: 15, name: "Bàn Tay Hoả Tiễn", target: "none",
            desc: `Đối thủ có bài: cướp 1 lá ngẫu nhiên; khi Xem Tay được chọn đúng uid. Nếu là chiêu, chủ lá địch hợp lệ nhận {${F_Q}} sát thương phép; khi chủ không hợp lệ, giữ fallback một tướng địch hợp lệ ngẫu nhiên. Không kéo tướng hay đổi ô.`,
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
            key: "E", mana: 30, name: "Tay Giật", target: "none", quick: true, chainOnly: true,
            desc: "Khi địch dùng một lá chiêu (mắt xích trên cùng), bạn có thể dùng lá này: hủy rồi cướp lá đó; sau giao dịch cướp, thử Choáng người tung 1 + 0,15% AP đơn vị. Cướp/hủy được xử lý trước kiểm tra mắt xích nguồn đã bị Choáng; không tự mở hành động.",
            quickWhen: (c) => c.trigger.side !== c.side && c.trigger.kind === "skill" && !!c.trigger.card && isSkillCard(c.trigger.card),
            resolve(c) {
                const fx = c.g.chainFx() as BlitzFx
                fx.cancel = true
                fx.stealBy = c.side
                fx.blitzStun = c.trigger?.actor
            },
        },
        R: {
            key: "R", mana: 40, name: "Trường Điện Từ", target: "none",
            desc: `Lộ tay địch tới hết lượt hiện tại. Mỗi tướng địch hợp lệ có ít nhất một lá chiêu thuộc mình trong tay đó nhận {${F_R}} sát thương phép và Choáng 1 + 0,1% AP đơn vị; mỗi tướng chỉ chịu một lần từ cùng lá R.`,
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
                        c.self,
                        t,
                        R_STUN,
                        `Blitzcrank R (${g.nameOf(t)})`)
                }
            },
        },
    },
})
