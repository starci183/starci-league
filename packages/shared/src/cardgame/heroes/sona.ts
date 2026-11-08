// Sona (Trợ thủ, phép): nhạc trưởng mana. Mọi con số nằm trong balance/heroes/sona.json (docs/heroes/KITS.md).
// P hồi mana khi phe mình tung chiêu và khi phe mình mất Máu. Q, E buff vĩnh viễn 1 tướng mình rồi lan cho 1 tướng kề; R Quick hồi Máu cả đội và mana.
// Buff nằm ở stack buff_* trên tướng nhận (g.stats đọc), nên vẫn còn khi Sona đã ngã; carrierStacks: tướng mang chết mất một nửa.
import {
    kit, when
} from "../balance"
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    Unit
} from "../types"

const k = kit("sona"), { p } = k
/** Máu phe mình đã mất chưa đủ p3 (kỹ thuật, không hiện) */
const LOST = "aura:sona_lost"
export const BUFF_AD = "buff_atk"
export const BUFF_AP = "buff_ap"
export const BUFF_ARMOR = "buff_armor"
export const BUFF_MR = "buff_mr"

const F_CAST = k.x("p2·Máu tối đa"), EN_CAST = k.xe("p2·Máu tối đa")
const F_LOST = k.x("p4 + p5·AP"), EN_LOST = k.xe("p4 + p5·AP")
const F_QAD = k.x("q1 + q3·AP"), EN_QAD = k.xe("q1 + q3·AP")
const F_QAP = k.x("q4 + q5·AP"), EN_QAP = k.xe("q4 + q5·AP")
const F_EAR = k.x("e1 + e3·AP"), EN_EAR = k.xe("e1 + e3·AP")
const F_EMR = k.x("e4 + e5·AP"), EN_EMR = k.xe("e4 + e5·AP")
const F_R = k.x("r1 + r2·AP"), EN_R = k.xe("r1 + r2·AP")
const F_RM = k.x("r3 + r4·AP"), EN_RM = k.xe("r3 + r4·AP")

/** Tướng mình kề `t` được lan buff: tướng Máu thấp hơn */
const nearest = (g: Game, t: Unit) => g.neighbors(t).filter((u) => !u.token).sort((a, b) => a.hp - b.hp)[0] as Unit | undefined
/** Cộng buff vĩnh viễn lên `t`, rồi lan `spread`% cho 1 tướng kề */
function grant(g: Game, t: Unit, near: Unit | undefined, buffs: [string, number][], spread: number) {
    for (const [key,
        v] of buffs) {
        g.stack(t,
            key,
            Math.round(v))
        if (near) g.stack(near,
            key,
            Math.round(v * spread / 100))
    }
}

export default defineHero({
    id: "sona", name: "Sona", role: "support", damage: "magic", ...k.base,
    carrierStacks: [BUFF_AD,
        BUFF_AP,
        BUFF_ARMOR,
        BUFF_MR],
    bot: k.bot,
    desc: "Nhạc trưởng Demacia: đội tung chiêu hay mất Máu đều hồi mana; Q, E buff vĩnh viễn một tướng rồi lan sang tướng kề, R nối Chuỗi hồi Máu cả đội và mana.",
    passive: {
        name: "Sức Mạnh Hợp Âm",
        desc: `Mỗi lá chiêu phe mình trả mana: đội hồi ${p.p1}% mana lá đó + {${F_CAST}} mana. Mỗi ${p.p3} Máu phe mình mất: đội hồi {${F_LOST}} mana. Đòn thường của Sona gây sát thương phép.`,
    },
    hooks: {
        onManaSpent(g, me, d) {
            if (d.unit.side !== me.side || d.amount <= 0 || d.card.kind !== "skill") return
            g.gainMana(me,
                Math.round(d.amount * p.p1 / 100 + g.f(me,
                    F_CAST)))
        },
        onDamage(g, me, d) {
            if (d.target.side !== me.side || d.target.token || d.hpLost <= 0) return
            const acc = g.stackOf(me,
                LOST) + d.hpLost
            const n = Math.floor(acc / p.p3)
            g.setStack(me,
                LOST,
                acc - n * p.p3)
            if (n > 0) g.gainMana(me,
                Math.round(n * g.f(me,
                    F_LOST)))
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Anh Hùng Ca", target: "ally", mana: p.q0,
            desc: `Chọn 1 tướng mình: nó nhận vĩnh viễn {${F_QAD}} AD và {${F_QAP}} AP, cộng dồn vô hạn. 1 tướng kề nó nhận ${p.q2}% lượng đó. Tướng mang bị hạ thì mất một nửa.`,
            resolve(c) {
                const t = c.target!
                grant(c.g,
                    t,
                    nearest(c.g,
                        t),
                    [[BUFF_AD,
                        c.f(F_QAD)],
                    [BUFF_AP,
                        c.f(F_QAP)]],
                    p.q2)
            },
        },
        E: {
            key: "E", name: "Giai Điệu Khích Lệ", target: "ally", mana: p.e0, quick: true, quickWhen: when.attackOrSkill,
            desc: `Quick: khi địch đánh hoặc dùng chiêu, có thể dùng lá này. Chọn 1 tướng mình: nó nhận vĩnh viễn {${F_EAR}} Giáp và {${F_EMR}} Kháng phép, cộng dồn vô hạn. 1 tướng kề nó nhận ${p.e2}% lượng đó. Tướng mang bị hạ thì mất một nửa.`,
            resolve(c) {
                const t = c.target!
                grant(c.g,
                    t,
                    nearest(c.g,
                        t),
                    [[BUFF_ARMOR,
                        c.f(F_EAR)],
                    [BUFF_MR,
                        c.f(F_EMR)]],
                    p.e2)
            },
        },
        R: {
            key: "R", name: "Khúc Cao Trào", target: "all_allies", mana: p.r0, quick: true, quickWhen: when.attackOrSkill,
            desc: `Quick: khi địch đánh hoặc dùng chiêu, có thể dùng lá này. Mọi tướng mình hồi {${F_R}} Máu, đội hồi {${F_RM}} mana.`,
            resolve(c) {
                const raw = c.f(F_R)
                for (const u of c.g.heroes(c.side)) c.g.heal(c.self,
                    u,
                    raw)
                c.g.gainMana(c.self,
                    Math.round(c.f(F_RM)))
            },
        },
    },
    en: {
        desc: "Maven of the Strings: team casts and team HP loss both refill mana; Q and E permanently buff one champion and spread to a neighbour, R answers on the Chain with a team heal and mana.",
        passive: {
            name: "Power Chord",
            desc: `Each skill card your team pays mana for: your team restores ${p.p1}% of that card's mana + {${EN_CAST}} mana. Every ${p.p3} HP your team loses: your team restores {${EN_LOST}} mana. Sona's basic attacks deal magic damage.`,
        },
        skills: {
            Q: {
                name: "Hymn of Valor",
                desc: `Choose 1 of your champions: it permanently gains {${EN_QAD}} AD and {${EN_QAP}} AP, stacking without limit. 1 champion next to it gains ${p.q2}% of that. The bearer being taken down loses half.`,
            },
            E: {
                name: "Aria of Perseverance",
                desc: `Quick: when an enemy attacks or casts a skill, you may play this card. Choose 1 of your champions: it permanently gains {${EN_EAR}} Armor and {${EN_EMR}} MR, stacking without limit. 1 champion next to it gains ${p.e2}% of that. The bearer being taken down loses half.`,
            },
            R: {
                name: "Crescendo",
                desc: `Quick: when an enemy attacks or casts a skill, you may play this card. Every ally heals {${EN_R}} HP and your team restores {${EN_RM}} mana.`,
            },
        },
    },
})
