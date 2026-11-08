// Ornn (Đỡ đòn, phép): "Thần Rèn". Đồ của cả đội mạnh hơn theo số vòng đã mặc, rèn Kiệt Tác lên đồ, phát đồ giữa trận.
// Số liệu: balance/heroes/ornn.json (cờ masterworkKeptOnDeath = quyết định tạm của thầy: Kiệt Tác không mất khi chết). Chiêu chỉ scale Máu tối đa, Giáp. R không gây sát thương (Ornn là Đỡ đòn nên được phép).
// Engine dùng: HeroDef.itemAura (nội tại), stack "itemAmp" mà g.stats đọc (Kiệt Tác: % chỉ số đồ), g.grantItem, g.createCard.
import {
    kit, when
} from "../balance"
import {
    defineHero
} from "../registry"
import {
    type PlayArgs, type Unit
} from "../types"
import type {
    Game
} from "../game"

const k = kit("ornn"), { p } = k
/** Tầng Kiệt Tác trên tướng giữ đồ (mỗi món của tướng nhận bằng nhau) */
const MW = "ornn_mw"
/** Stack mà g.stats đọc: % chỉ số đồ cộng thêm = tầng Kiệt Tác × p3 */
const AMP = "itemAmp"
const F_Q = k.x("q1 + q2·Máu tối đa"), EN_Q = k.xe("q1 + q2·Máu tối đa")
const F_E = k.x("e2 + e3·Giáp"), EN_E = k.xe("e2 + e3·Giáp")

const withItems = (g: Game, me: Unit) => g.allies(me).filter((u) => !u.token && u.items.length > 0)
const allAllies = (g: Game, me: Unit) => g.allies(me).filter((u) => !u.token)

export default defineHero({
    id: "ornn", name: "Ornn", role: "tank", damage: "magic", ...k.base,
    bot: k.bot,
    desc: "Thần Rèn: đồ của cả đội mặc càng lâu càng mạnh, Ornn rèn Kiệt Tác lên đồ và phát đồ giữa trận.",
    passive: {
        name: "Lò Rèn Sống",
        desc: `Khi Ornn ở trên sân, chỉ số của mọi món đồ cả đội, trừ Máu, tăng ${p.p1}%, và tăng thêm ${p.p2}% cho mỗi vòng món đó đã được mặc.`,
    },
    itemAura(_g, _me, _wearer, _item, roundsWorn) {
        return (p.p1 + p.p2 * roundsWorn) / 100
    },
    hooks: {
        onDeath(g, me, d) {
            // cờ tạm: nếu thầy chốt Kiệt Tác mất khi tướng giữ đồ chết, mất một nửa
            if (k.flag("masterworkKeptOnDeath") || d.victim.side !== me.side || d.victim.token) return
            for (const key of [MW,
                AMP]) {
                const v = d.victim.stacks[key]
                if (v) g.setStack(d.victim,
                    key,
                    Math.floor(v * p.p4))
            }
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Núi Lửa Trồi", target: "enemy", mana: p.q0,
            desc: `Chọn 1 tướng địch; gây {${F_Q}} sát thương phép, rồi tạo 1 mảnh đồ ngẫu nhiên lên tay bạn.`,
            resolve(c) {
                c.g.damage(c.self,
c.target!,
c.f(F_Q),
"magic",
{
    tag: "skill"
})
                c.g.createCard(c.side,
                    c.g.supportCard("item"))
            },
        },
        E: {
            key: "E", name: "Rèn Lửa", target: "ally", mana: p.e0, quick: true,
            quickWhen: when.attackOrSkill,
            canPlay: (c) => withItems(c.g,
                c.self).length > 0,
            options: (c): PlayArgs[] => withItems(c.g,
                c.self).map((u) => ({
                target: u.id
            })),
            desc: `Quick. Khi địch đánh hoặc dùng chiêu, bạn có thể dùng lá này. Chọn 1 tướng mình đang mang đồ; mỗi món đồ của nó nhận ${p.e1} Kiệt Tác, và nó nhận {${F_E}} Khiên cho mỗi món. Kiệt Tác: mỗi tầng tăng ${p.p3}% chỉ số đồ, không mất khi tướng giữ đồ bị hạ (quyết định tạm, chờ thầy chốt).`,
            resolve(c) {
                const t = c.target
                if (!t || !t.items.length) return
                const n = t.items.length
                c.g.stack(t,
                    MW,
                    p.e1)
                c.g.setStack(t,
                    AMP,
                    c.g.stackOf(t,
                        MW) * p.p3)
                c.g.shield(c.self,
                    t,
                    n * c.f(F_E))
            },
        },
        R: {
            key: "R", name: "Tiếng Gọi Thần Rèn", target: "ally", mana: p.r0, quick: true,
            quickWhen: when.attackOrSkill,
            options: (c): PlayArgs[] => allAllies(c.g,
                c.self).map((u) => ({
                target: u.id
            })),
            desc: "Quick. Khi địch đánh hoặc dùng chiêu, bạn có thể dùng lá này. Chọn 1 tướng mình; rèn 1 món đồ hoàn chỉnh ngẫu nhiên cho nó, mặc ngay, đủ ô thì về tay bạn; rồi tạo thêm 1 món đồ hoàn chỉnh ngẫu nhiên lên tay bạn. Không gây sát thương.",
            resolve(c) {
                const t = c.target
                if (!t) return
                c.g.grantItem(t)
                c.g.createCard(c.side,
                    {
                        kind: "support", id: "legend", item: c.g.randomFinishedItem()
                    })
            },
        },
    },
    en: {
        desc: "The Forge God: the team's items grow stronger the longer they are worn, Ornn adds Masterworks to items and hands out gear mid-game.",
        passive: {
            name: "Living Forge",
            desc: `While Ornn is on the board, the stats of every item on the team, except HP, are increased by ${p.p1}%, plus another ${p.p2}% for each round that item has been worn.`,
        },
        skills: {
            Q: {
                name: "Volcanic Rupture",
                desc: `Choose 1 enemy champion; deal {${EN_Q}} magic damage, then create 1 random item component in your hand.`,
            },
            E: {
                name: "Searing Charge",
                desc: `Quick. When the enemy attacks or casts a skill, you may play this card. Choose 1 allied champion carrying items; each of its items gains ${p.e1} Masterwork, and it gains {${EN_E}} Shield for each item. Masterwork: each stack adds ${p.p3}% to item stats, and is not lost when the holder is taken down (temporary decision, pending the teacher's ruling).`,
            },
            R: {
                name: "Call of the Forge God",
                desc: "Quick. When the enemy attacks or casts a skill, you may play this card. Choose 1 allied champion; forge 1 random finished item for it, worn immediately, or to your hand if it has no free slot; then create 1 more random finished item in your hand. Deals no damage.",
            },
        },
    },
})
