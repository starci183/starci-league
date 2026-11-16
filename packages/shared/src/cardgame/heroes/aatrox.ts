// Aatrox (Đấu sĩ, vật lý). Thầy chốt lại 2026-11-16, số liệu ở balance/heroes/aatrox.json. Cả 3 chiêu 0 mana.
// CHẤT: "Máu càng yếu càng mạnh". Càng mất nhiều Máu, mọi sát thương Aatrox gây càng nặng và hút lại một phần.
// Q trả máu để chém kẻ đối diện; E (Quick) chém 3 đường trước mặt (đối diện nặng nhất) và nhận Khiên theo sát thương;
// R (Quick) không gây sát thương, chỉ tăng chỉ số: hoá quỷ r1 đơn vị (+r2 AD, +r3% Máu tối đa); lần đầu về 0 Máu thì hồi sinh
// với r4% Máu và chơi tiếp (g.transform reviveHp, thứ tự cứu chết "transform"). Q, E scale theo Công + Máu tối đa.
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
import {
    otherSide
} from "../types"

const k = kit("aatrox"), { p } = k
export const FORM = "aatrox_r"
const LANES = 5
export const F_Q = k.x("q2 + q3·AD + q4·Máu tối đa"), EN_Q = k.xe("q2 + q3·AD + q4·Máu tối đa")
export const F_E = k.x("e1 + e2·AD + e3·Máu tối đa"), EN_E = k.xe("e1 + e2·AD + e3·Máu tối đa")

/** Tỉ lệ Máu đã mất của Aatrox (0..1) */
export const missingFrac = (me: Unit) => (me.maxHp > 0 ? Math.max(0,
    me.maxHp - me.hp) / me.maxHp : 0)
/** Hệ số sát thương nội tại: 1 + p1% cho mỗi 1% Máu đã mất */
export const damageMult = (g: Game, me: Unit) => { void g; return 1 + p.p1 * 100 * missingFrac(me) / 100 }
/** Phần trăm sát thương hồi lại của nội tại */
export const lifestealPct = (g: Game, me: Unit) => { void g; void me; return p.p2 / 100 }

export default defineHero({
    id: "aatrox", name: "Aatrox", role: "fighter", damage: "physical", ...k.base,
    desc: "Kẻ Diệt Thế, máu càng yếu càng mạnh: trả máu để chém, hút máu cả hàng trước mặt, hoá quỷ và chết đi sống lại.",
    passive: {
        name: "Cái Giá Bằng Máu",
        desc: `Aatrox gây thêm ${p.p1}% sát thương cho mỗi 1% Máu đã mất và hồi ${p.p2}% sát thương gây ra lên tướng địch.`,
    },
    en: {
        desc: "World Ender who grows stronger the lower his HP: pays blood to strike, drains the whole row in front, becomes a demon and comes back from death.",
        passive: {
            name: "Blood Price",
            desc: `Aatrox deals ${p.p1}% more damage for every 1% missing HP and heals ${p.p2}% of the damage he deals to enemy champions.`,
        },
        skills: {
            Q: {
                name: "The Darkin Blade",
                desc: `Lose ${p.q1}% of current HP (never below 1); the enemy opposite takes {${EN_Q}} physical damage.`,
            },
            E: {
                name: "Blood Ward",
                desc: `Quick. When the enemy targets exactly Aatrox, you may play this card (it can also be played proactively): the enemy opposite takes {${EN_E}} physical damage and the enemies in the 2 adjacent lanes take ${p.e7 * 100}% of that. Aatrox gains a Shield equal to ${p.e4}% of the total damage dealt.`,
            },
            R: {
                name: "World Ender",
                desc: `Quick. When the enemy targets exactly Aatrox, you may play this card (it can also be played proactively): Aatrox becomes a demon for ${p.r1} units: +${p.r2} AD and +${p.r3}% max HP. The first time he would fall to 0 HP he revives with ${p.r4}% HP and keeps playing; the form ends.`,
            },
        },
    },
    modifyDamage(g, me, d) {
        if (d.src?.id !== me.id || d.target.side === me.side || d.target.token) return 1
        if (d.tag !== "attack" && d.tag !== "skill") return 1
        return damageMult(g,
            me)
    },
    hooks: {
        onDamage(g, me, d) {
            if (d.src?.id !== me.id || d.target.side === me.side || d.target.token) return
            if (d.tag !== "attack" && d.tag !== "skill") return
            const dealt = d.hpLost + d.absorbed
            if (dealt > 0) g.heal(me,
                me,
                dealt * lifestealPct(g,
                    me))
        },
    },
    skills: {
        Q: {
            key: "Q", mana: p.q0, name: "Lưỡi Gươm Darkin", target: "opposite",
            desc: `Mất ${p.q1}% Máu hiện tại (còn ít nhất 1); tướng địch đối diện nhận {${F_Q}} sát thương vật lý.`,
            canPlay: (c) => c.self.hp >= 2 && !!c.g.opposite(c.self),
            resolve(c) {
                const g = c.g, me = c.self
                g.payHp(me,
                    me.hp * p.q1 / 100,
                    1)
                g.damage(me,
                    c.target!,
                    c.f(F_Q),
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
        E: {
            key: "E", mana: p.e0, name: "Huyết Thuẫn", target: "none", quick: true,
            quickWhen: when.targetsSelf,
            desc: `Quick. Khi địch nhắm đúng Aatrox, bạn có thể dùng lá này (dùng chủ động cũng được): tướng địch đối diện nhận {${F_E}} sát thương vật lý, tướng ở 2 đường kề nhận ${p.e7 * 100}% mức đó. Aatrox nhận Khiên bằng ${p.e4}% tổng sát thương đã gây.`,
            resolve(c) {
                const g = c.g, me = c.self
                const raw = c.f(F_E)
                const foe = otherSide(c.side)
                let total = 0
                for (const lane of [me.lane,
                    me.lane - 1,
                    me.lane + 1]) {
                    const t = lane >= 0 && lane < LANES ? g.at(foe,
                        lane) : undefined
                    if (t && !t.token) total += g.damage(me,
                        t,
                        lane === me.lane ? raw : raw * p.e7,
                        "physical",
                        {
                            tag: "skill"
                        })
                }
                if (me.status === "board" && total > 0) g.shield(me,
                    me,
                    total * p.e4 / 100)
            },
        },
        R: {
            key: "R", mana: p.r0, name: "Kẻ Diệt Thế", target: "none", quick: true,
            quickWhen: when.targetsSelf,
            desc: `Quick. Khi địch nhắm đúng Aatrox, bạn có thể dùng lá này (dùng chủ động cũng được): Aatrox hoá quỷ ${p.r1} đơn vị: +${p.r2} AD, +${p.r3}% Máu tối đa. Lần đầu về 0 Máu, Aatrox hồi sinh với ${p.r4}% Máu và chơi tiếp, hết dạng quỷ.`,
            canPlay: (c) => !c.g.isTransformed(c.self,
                FORM),
            resolve(c) {
                const g = c.g, me = c.self
                if (me.status !== "board") return
                const hpBonus = Math.round(me.maxHp * p.r3 / 100)
                if (!g.transform(me,
                    FORM,
                    p.r1,
                    {
                        bonus: {
                            atk: p.r2
                        }, maxHp: hpBonus, reviveHp: (me.maxHp + hpBonus) * p.r4 / 100,
                    })) return
                me.transform!.until = g.unitsUntil(me,
                    p.r1)
            },
        },
    },
})
