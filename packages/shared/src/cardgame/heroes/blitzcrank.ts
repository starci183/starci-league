// Blitzcrank (Đỡ đòn, phép): "Thò tay vào bài địch". Cướp lá, cướp chiêu giữa Chuỗi, Câm Lặng và bắt địch bỏ bài.
// Số liệu: balance/heroes/blitzcrank.json. Chiêu chỉ scale Giáp, Kháng, Máu tối đa.
// Cướp = g.stealCard(side, foe, { skill: "convert" }): lá thường giữ nguyên; lá chiêu địch vào mộ chủ, thay bằng 1 lá Q hoặc E ngẫu nhiên của tướng mình trên sân.
// Engine dùng: hook onSteal (Phụ Tùng, Choáng sau cướp), ReactFx.cancel/stealBy/stealMode (E), g.faceEnemy (kéo đối diện), g.discard, g.timed.
import {
    kit, when
} from "../balance"
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    otherSide, type Card, type ReactFx, type Unit
} from "../types"

const k = kit("blitzcrank"), { p } = k
const PARTS = "blitz_parts"
const F_Q = k.x("q1 + q2·Giáp + q3·Kháng"), EN_Q = k.xe("q1 + q2·Giáp + q3·Kháng")
const F_E = k.x("e1 + e2·Máu tối đa"), EN_E = k.xe("e1 + e2·Máu tối đa")
const F_R = k.x("r1 + r2·Máu tối đa"), EN_R = k.xe("r1 + r2·Máu tối đa")
const F_R_SIL = k.x("r3 + r4·Kháng"), EN_R_SIL = k.xe("r3 + r4·Kháng")

/** ReactFx kèm kẻ tung chiêu bị giật và thời hạn Choáng: Choáng SAU khi lá bị giật (Choáng trước thì mắt xích bên dưới tan và lá không bị giật) */
type BlitzFx = ReactFx & { stunUnit?: string; stunD?: number }
/** Lá chiêu của một tướng (kể cả Bóng sao chép chiêu, lá tạm) */
const isSkillCard = (c: Card | undefined) => !!c && (c.kind === "skill" || !!c.copyOf)

function stun(g: Game, me: Unit, u: Unit | undefined, d: number) {
    if (u && d > 0 && u.status === "board") g.timed(me,
        u,
        "stun",
        d)
}

export default defineHero({
    id: "blitzcrank", name: "Blitzcrank", role: "tank", damage: "magic", ...k.base,
    deathHalf: [PARTS],
    bot: k.bot,
    desc: "Người máy cướp bài: thò tay vào bài địch, cướp chiêu giữa Chuỗi và biến nó thành chiêu của đội mình.",
    passive: {
        name: "Thu Gom",
        desc: `Mỗi lần Blitzcrank cướp 1 lá, nhận 1 Phụ Tùng, cộng dồn vô hạn; mỗi Phụ Tùng tăng ${p.p1} Giáp và ${p.p1} Kháng phép. Mất một nửa Phụ Tùng khi bị hạ. Cướp: lá thường giữ nguyên; lá chiêu của địch vào mộ, thay bằng 1 lá Q hoặc E ngẫu nhiên của tướng mình trên sân.`,
    },
    bonusStats(g, me) {
        const n = g.stackOf(me,
            PARTS)
        return {
            armor: n * p.p1, mr: n * p.p1
        }
    },
    hooks: {
        onSteal(g, me, d) {
            if (d.side !== me.side) return
            g.stack(me,
                PARTS,
                1)
            // E giật lá giữa Chuỗi: lá đã bị giật xong thì Choáng kẻ tung
            const fx = g.s.fx as BlitzFx | undefined
            if (fx?.stunUnit) {
                stun(g,
                    me,
                    g.unit(fx.stunUnit),
                    fx.stunD ?? 0)
                fx.stunUnit = undefined
            }
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Bàn Tay Hoả Tiễn", target: "enemy", mana: p.q0,
            canPlay: (c) => c.g.player(otherSide(c.side)).hand.length > 0,
            desc: `Đối thủ phải có bài trên tay. Chọn 1 tướng địch; Cướp 1 lá ngẫu nhiên trên tay đối thủ và gây {${F_Q}} sát thương phép. Nếu lá cướp là lá chiêu của chính tướng đó, kéo nó sang đối diện Blitzcrank.`,
            resolve(c) {
                const g = c.g, t = c.target!
                const card = g.stealCard(c.side,
                    otherSide(c.side),
                    {
                        skill: "convert"
                    })
                g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (card && isSkillCard(card) && card.hero === t.hero && t.status === "board") g.faceEnemy(t,
                    c.self)
            },
        },
        E: {
            key: "E", name: "Tay Giật", target: "none", mana: p.e0, quick: true, chainOnly: true,
            desc: `Quick, Chỉ Nối Chuỗi. Khi địch dùng 1 lá chiêu (kể cả R), bạn có thể dùng lá này: Cướp và Vô Hiệu lá đó (lá chiêu vào mộ, thay bằng 1 lá Q hoặc E ngẫu nhiên của tướng mình trên sân), rồi kẻ dùng bị Choáng {${F_E}} đơn vị.`,
            quickWhen: (c) => when.skill(c) && isSkillCard(c.trigger.card),
            resolve(c) {
                const fx = c.g.chainFx() as BlitzFx
                fx.cancel = true
                fx.stealBy = c.side
                fx.stealMode = "convert"
                fx.stunUnit = c.trigger?.actor
                fx.stunD = c.f(F_E)
            },
        },
        R: {
            key: "R", name: "Trường Điện Từ", target: "all_enemies", mana: p.r0,
            desc: `Mọi tướng địch nhận {${F_R}} sát thương phép và bị Câm Lặng {${F_R_SIL}} đơn vị. Đối thủ bỏ ${p.r5} lá ngẫu nhiên trên tay.`,
            resolve(c) {
                const g = c.g, foe = otherSide(c.side)
                const dmg = c.f(F_R), d = c.f(F_R_SIL)
                for (const t of g.heroes(foe)) {
                    g.damage(c.self,
                        t,
                        dmg,
                        "magic",
                        {
                            tag: "skill"
                        })
                    if (d > 0 && t.status === "board") g.timed(c.self,
                        t,
                        "silence",
                        d)
                }
                for (let i = 0; i < p.r5; i++) {
                    const x = g.pick(g.player(foe).hand.filter((h) => !h.temp))
                    if (!x) break
                    g.discard(foe,
                        x.uid,
                        "effect")
                }
            },
        },
    },
    en: {
        desc: "The card-stealing robot: reach into the enemy hand, snatch skills in the middle of the Chain and turn them into your team's skills.",
        passive: {
            name: "Scrap Collector",
            desc: `Each time Blitzcrank steals a card he gains 1 Part, stacking without limit; each Part adds ${p.p1} Armor and ${p.p1} MR. Half of the Parts are lost when he is taken down. Steal: an ordinary card stays as it is; an enemy skill card goes to the graveyard and is replaced by a random Q or E card of one of your champions on the board.`,
        },
        skills: {
            Q: {
                name: "Rocket Grab",
                desc: `The opponent must have cards in hand. Choose 1 enemy champion; Steal 1 random card from the opponent's hand and deal {${EN_Q}} magic damage. If the stolen card is a skill card of that very champion, pull it opposite Blitzcrank.`,
            },
            E: {
                name: "Power Fist Snatch",
                desc: `Quick, Chain Only. When the enemy plays a skill card (R included), you may play this card: Steal and Negate that card (the skill card goes to the graveyard and is replaced by a random Q or E card of one of your champions on the board), then its caster is Stunned for {${EN_E}} units.`,
            },
            R: {
                name: "Static Field",
                desc: `Every enemy champion takes {${EN_R}} magic damage and is Silenced for {${EN_R_SIL}} units. The opponent discards ${p.r5} random cards from hand.`,
            },
        },
    },
})
