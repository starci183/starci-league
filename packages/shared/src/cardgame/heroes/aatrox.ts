// Aatrox (Đấu sĩ, vật lý). Thầy chốt lại 2026-11-16, số liệu ở balance/heroes/aatrox.json. Chiêu không tốn mana: trả bằng Máu hiện tại.
// CHẤT: "Đổi máu lấy máu". Máu càng thấp, Công càng cao (nội tại). Đánh thường và Q trả Máu rồi hút lại p3→p4 sát thương gây ra
// tuỳ Máu đã mất; E trả Máu, chém tướng đối diện và nhận Khiên theo sát thương; R trả nửa Máu hiện tại, hoá quỷ tăng mạnh Công và hồi
// sinh một lần (g.transform reviveHp, thứ tự cứu chết "transform").
import {
    kit, when
} from "../balance"
import {
    defineHero
} from "../registry"
import type {
    Game
} from "../game"
import type {
    Unit
} from "../types"

const k = kit("aatrox"), { p } = k
export const FORM = "aatrox_r"
export const F_Q = k.x("q2 + q3·AD + q4·Máu tối đa"), EN_Q = k.xe("q2 + q3·AD + q4·Máu tối đa")
export const F_E = k.x("e1 + e2·AD + e3·Máu tối đa"), EN_E = k.xe("e1 + e2·AD + e3·Máu tối đa")
const pct = (v: number) => `${Math.round(v * 1000) / 10}%`

/** Tỉ lệ Máu đã mất của Aatrox (0..1) */
export const missingFrac = (me: Unit) => (me.maxHp > 0 ? Math.max(0,
    me.maxHp - me.hp) / me.maxHp : 0)
/** Tỉ lệ hút máu: p3 khi đầy Máu → p4 khi cạn Máu, tuyến tính theo Máu đã mất */
export const lifestealFrac = (me: Unit) => p.p3 + (p.p4 - p.p3) * missingFrac(me)
/** Trả `frac` Máu hiện tại (còn ít nhất 1) */
const payCurrent = (g: Game, me: Unit, frac: number) => g.payHp(me,
    me.hp * frac,
    1)

export default defineHero({
    id: "aatrox", name: "Aatrox", role: "fighter", damage: "physical", ...k.base,
    desc: "Kẻ Diệt Thế đổi máu lấy máu: mỗi đòn trả Máu, Máu càng thấp Công càng cao và hút lại càng nhiều; hoá quỷ để kết thúc trận đánh.",
    passive: {
        name: "Cái Giá Bằng Máu",
        desc: `Aatrox có thêm Công bằng ${pct(p.p1)} Công gốc nhân tỉ lệ Máu đã mất (Máu càng thấp Công càng cao). Mỗi đòn đánh thường trả ${pct(p.p2)} Máu hiện tại, rồi hút lại ${pct(p.p3)} → ${pct(p.p4)} sát thương gây ra, tăng dần theo Máu đã mất.`,
    },
    en: {
        desc: "World Ender who trades blood for blood: every blow costs HP, the lower his HP the higher his AD and the more he drains; becomes a demon to end the fight.",
        passive: {
            name: "Blood Price",
            desc: `Aatrox gains AD equal to ${pct(p.p1)} of his base AD times his missing HP fraction (lower HP, higher AD). Each attack costs ${pct(p.p2)} of his current HP, then drains ${pct(p.p3)} → ${pct(p.p4)} of the damage dealt, rising with missing HP.`,
        },
        skills: {
            Q: {
                name: "The Darkin Blade",
                desc: `Pay ${pct(p.q1)} of current HP (never below 1); the enemy opposite takes {${EN_Q}} physical damage. Aatrox drains ${pct(p.p3)} → ${pct(p.p4)} of the damage dealt, rising with missing HP.`,
            },
            E: {
                name: "Blood Ward",
                desc: `Quick. When the enemy targets exactly Aatrox, you may play this card (it can also be played proactively): pay ${pct(p.e5)} of current HP; the enemy opposite takes {${EN_E}} physical damage and Aatrox gains a Shield equal to ${pct(p.e4)} of the damage dealt.`,
            },
            R: {
                name: "World Ender",
                desc: `Pay ${pct(p.r5)} of current HP; Aatrox becomes a demon for ${p.r1} units: +${pct(p.r2)} AD. The first time he would fall to 0 HP he revives with ${pct(p.r4)} HP and keeps playing; the form ends.`,
            },
        },
    },
    // Máu thấp, Công cao: + p1 × Công gốc × tỉ lệ Máu đã mất
    bonusStats(g, me) {
        void g
        return {
            atk: p.p1 * k.base.atk * missingFrac(me)
        }
    },
    hooks: {
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id) return
            payCurrent(g,
                me,
                p.p2)
        },
        onDamage(g, me, d) {
            if (d.src?.id !== me.id || d.target.side === me.side || d.target.token || d.tag !== "attack") return
            const dealt = d.hpLost + d.absorbed
            if (dealt > 0 && me.status === "board") g.heal(me,
                me,
                dealt * lifestealFrac(me))
        },
    },
    skills: {
        Q: {
            key: "Q", mana: p.q0, name: "Lưỡi Gươm Darkin", target: "opposite",
            desc: `Trả ${pct(p.q1)} Máu hiện tại (còn ít nhất 1); tướng địch đối diện nhận {${F_Q}} sát thương vật lý. Aatrox hút lại ${pct(p.p3)} → ${pct(p.p4)} sát thương gây ra, tăng dần theo Máu đã mất.`,
            canPlay: (c) => c.self.hp >= 2 && !!c.g.opposite(c.self),
            resolve(c) {
                const g = c.g, me = c.self
                payCurrent(g,
                    me,
                    p.q1)
                const dealt = g.damage(me,
                    c.target!,
                    c.f(F_Q),
                    "physical",
                    {
                        tag: "skill"
                    })
                if (dealt > 0 && me.status === "board") g.heal(me,
                    me,
                    dealt * lifestealFrac(me))
            },
        },
        E: {
            key: "E", mana: p.e0, name: "Huyết Thuẫn", target: "opposite", quick: true,
            quickWhen: when.targetsSelf,
            desc: `Quick. Khi địch nhắm đúng Aatrox, bạn có thể dùng lá này (dùng chủ động cũng được): trả ${pct(p.e5)} Máu hiện tại; tướng địch đối diện nhận {${F_E}} sát thương vật lý, Aatrox nhận Khiên bằng ${pct(p.e4)} sát thương đã gây.`,
            canPlay: (c) => c.self.hp >= 2 && !!c.g.opposite(c.self),
            resolve(c) {
                const g = c.g, me = c.self
                payCurrent(g,
                    me,
                    p.e5)
                const dealt = g.damage(me,
                    c.target!,
                    c.f(F_E),
                    "physical",
                    {
                        tag: "skill"
                    })
                if (dealt > 0 && me.status === "board") g.shield(me,
                    me,
                    dealt * p.e4)
            },
        },
        R: {
            key: "R", mana: p.r0, name: "Kẻ Diệt Thế", target: "none",
            desc: `Trả ${pct(p.r5)} Máu hiện tại; Aatrox hoá quỷ ${p.r1} đơn vị: +${pct(p.r2)} Công. Lần đầu về 0 Máu, Aatrox hồi sinh với ${pct(p.r4)} Máu và chơi tiếp, hết dạng quỷ.`,
            canPlay: (c) => c.self.hp >= 2 && !c.g.isTransformed(c.self,
                FORM),
            resolve(c) {
                const g = c.g, me = c.self
                if (me.status !== "board") return
                payCurrent(g,
                    me,
                    p.r5)
                if (!g.transform(me,
                    FORM,
                    p.r1,
                    {
                        bonus: {
                            atk: Math.round(g.atk(me) * p.r2)
                        }, reviveHp: me.maxHp * p.r4, heal: false,
                    })) return
                me.transform!.until = g.unitsUntil(me,
                    p.r1)
            },
        },
    },
})
