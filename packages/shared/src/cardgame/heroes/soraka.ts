// Soraka (Trợ thủ, phép): bộ chiêu chốt 31/10 - 01/11/2026 (docs/heroes/KITS.md). Số ở balance/heroes/soraka.json.
// P Cứu Rỗi: hồi Máu của phe đổi thành Thánh Quang (tăng hồi Máu, đòn thường tướng nhiều Máu hơn gây thêm). KHÔNG còn cứu chết (đã xoá khỏi RULES.lethalOrder).
// Q Sao Băng đánh rồi tự hồi, E Truyền Sinh Lực (Quick) đổi Máu Soraka lấy hồi cho đồng minh khác, R Điều Ước hồi cả đội.
import {
    kit, lockedAlly, when
} from "../balance"
import {
    pct
} from "../formula"
import {
    defineHero
} from "../registry"

const k = kit("soraka"), { p } = k
/** Thánh Quang (trên Soraka): mất một nửa khi Soraka chết */
export const LIGHT = "soraka_light"
/** Hồi Máu của phe chưa đủ X (kỹ thuật, không hiện) */
const ACC = "tc:soraka_heal"

const F_Q = k.x("q1 + q2·AP"), EN_Q = k.xe("q1 + q2·AP")
const F_Q_HEAL = k.x("q3 + q4·AP"), EN_Q_HEAL = k.xe("q3 + q4·AP")
const F_E_HEAL = k.x("e2 + e3·AP"), EN_E_HEAL = k.xe("e2 + e3·AP")
const F_R = k.x("r1 + r2·AP"), EN_R = k.xe("r1 + r2·AP")
const F_Z = k.x("p3 + p4·AP"), EN_Z = k.xe("p3 + p4·AP")

export default defineHero({
    id: "soraka", name: "Soraka", role: "support", damage: "magic", ...k.base,
    deathHalf: [LIGHT],
    bot: k.bot,
    desc: "Ánh sáng nuôi cả đội: mỗi lượng hồi Máu của phe thành Thánh Quang làm mọi lần hồi mạnh lên; Q đánh rồi tự hồi, E đổi Máu của mình lấy hồi cho đồng minh, R hồi cả đội (hồi nhiều hơn cho kẻ sắp gục).",
    passive: {
        name: "Cứu Rỗi",
        desc: `Mỗi khi phe bạn được hồi tổng ${p.p1} Máu, Soraka nhận 1 Thánh Quang, cộng dồn vô hạn. Mỗi Thánh Quang tăng ${pct(p.p2)}% hồi Máu nhận vào của mọi tướng mình. Đòn thường của tướng mình gây thêm {${F_Z}} sát thương nếu Máu hiện tại của nó nhiều hơn mục tiêu. Khi Soraka bị hạ, mất một nửa số Thánh Quang. Soraka không cứu đồng minh khỏi bị hạ.`,
    },
    healReceivedMult(g, owner, _src, target) {
        return target.side === owner.side && !target.token ? 1 + p.p2 * g.stackOf(owner,
            LIGHT) : 1
    },
    hooks: {
        onHeal(g, me, d) {
            if (d.target.side !== me.side || d.target.token || d.amount <= 0) return
            const acc = g.stackOf(me,
                ACC) + d.amount
            const n = Math.floor(acc / p.p1)
            g.setStack(me,
                ACC,
                acc - n * p.p1)
            if (n > 0) g.stack(me,
                LIGHT,
                n)
        },
        onAttack(g, me, d) {
            // Đòn thường của tướng mình: thêm sát thương nếu người đánh nhiều Máu hiện tại hơn mục tiêu
            const a = d.attacker
            if (a.side !== me.side || a.token || d.target.side === me.side || a.hp <= d.target.hp) return
            d.info.bonus.push({
                raw: g.f(me,
                    F_Z), kind: d.info.kind
            })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Sao Băng", target: "enemy", mana: p.q0,
            desc: `Chọn 1 tướng địch; gây {${F_Q}} sát thương phép. Nếu trúng, Soraka hồi {${F_Q_HEAL}} Máu.`,
            resolve(c) {
                const dealt = c.g.damage(c.self,
                    c.target!,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (dealt > 0 && c.self.status === "board") c.g.heal(c.self,
                    c.self,
                    c.f(F_Q_HEAL))
            },
        },
        E: {
            key: "E", name: "Truyền Sinh Lực", target: "ally_other", mana: p.e0, quick: true,
            quickWhen: when.targetsOtherAlly,
            options: (c) => lockedAlly(c,
                true),
            desc: `Quick. Khi địch nhắm đúng 1 tướng mình khác Soraka, bạn có thể dùng lá này; mục tiêu là tướng đó (dùng chủ động thì chọn 1 tướng mình khác). Soraka mất ${p.e1} Máu, tối thiểu còn 1; nó hồi {${F_E_HEAL}} Máu.`,
            resolve(c) {
                c.g.payHp(c.self,
                    p.e1)
                c.g.heal(c.self,
                    c.target!,
                    c.f(F_E_HEAL))
            },
        },
        R: {
            key: "R", name: "Điều Ước", target: "all_allies", mana: p.r0,
            desc: `Mọi tướng mình hồi {${F_R}} Máu. Tướng đang dưới ${pct(p.r3)}% Máu tối đa hồi gấp ${p.r4} lần.`,
            resolve(c) {
                const amount = c.f(F_R)
                for (const u of c.g.heroes(c.side)) c.g.heal(c.self,
                    u,
                    u.hp / u.maxHp < p.r3 ? amount * p.r4 : amount)
            },
        },
    },
    en: {
        desc: "Light that feeds the team: every point of team healing becomes Starlight that strengthens all healing; Q hits and self-heals, E trades Soraka's HP for an ally's heal, R heals the whole team (more for those about to fall).",
        passive: {
            name: "Salvation",
            desc: `Each time your team is healed for a total of ${p.p1} HP, Soraka gains 1 Starlight, stacking without limit. Each Starlight increases the healing your champions receive by ${pct(p.p2)}%. Your champions' basic attacks deal an extra {${EN_Z}} damage if their current HP is higher than the target's. When Soraka is taken down she loses half her Starlight. Soraka no longer saves allies from being taken down.`,
        },
        skills: {
            Q: {
                name: "Starcall",
                desc: `Choose 1 enemy champion; deal {${EN_Q}} magic damage. If it hits, Soraka heals {${EN_Q_HEAL}} HP.`,
            },
            E: {
                name: "Life Link",
                desc: `Quick. When an enemy targets exactly 1 of your champions other than Soraka, you may play this card; the target is that champion (played proactively, choose 1 of your other champions). Soraka loses ${p.e1} HP, leaving at least 1; it heals {${EN_E_HEAL}} HP.`,
            },
            R: {
                name: "Wish",
                desc: `Every ally heals {${EN_R}} HP. Champions below ${pct(p.r3)}% of their max HP heal ${p.r4} times as much.`,
            },
        },
    },
})
