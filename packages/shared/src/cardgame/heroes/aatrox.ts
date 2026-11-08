// Aatrox (Đấu sĩ, vật lý). Bộ chiêu chốt 31/10 – 01/11/2026, số liệu ở balance/heroes/aatrox.json (docs/heroes/KITS.md).
// CHẤT: "Đổi máu lấy máu". Càng mất nhiều Máu, mọi sát thương Aatrox gây càng nặng và hút lại một phần; Q trả máu để chém 3 đường,
// E xiềng một địch rồi hút nhiều hơn, R biến hình Kẻ Diệt Thế (nội tại gấp r5, cứu chết một lần qua g.transform reviveHp, thứ tự cứu chết "transform").
import {
    kit
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
export const F_Q = k.x("q2 + q3·AD + q4·Máu đã mất"), EN_Q = k.xe("q2 + q3·AD + q4·Máu đã mất")
export const F_E = k.x("e1 + e2·AD"), EN_E = k.xe("e1 + e2·AD")
export const F_R = k.x("r1 + r2·AD"), EN_R = k.xe("r1 + r2·AD")

/** Hệ số nội tại: gấp r5 khi đang biến hình */
export const passiveMult = (g: Game, me: Unit) => (g.isTransformed(me,
    FORM) ? p.r5 : 1)
/** Tỉ lệ Máu đã mất của Aatrox (0..1) */
export const missingFrac = (me: Unit) => (me.maxHp > 0 ? Math.max(0,
    me.maxHp - me.hp) / me.maxHp : 0)
/** Hệ số sát thương nội tại: 1 + p1% cho mỗi 1% Máu đã mất (nhân r5 khi biến hình) */
export const damageMult = (g: Game, me: Unit) => 1 + p.p1 * 100 * missingFrac(me) * passiveMult(g,
    me) / 100
/** Phần trăm sát thương hồi lại của nội tại */
export const lifestealPct = (g: Game, me: Unit) => p.p2 * passiveMult(g,
    me) / 100

export default defineHero({
    id: "aatrox", name: "Aatrox", role: "fighter", damage: "physical", ...k.base,
    desc: "Kẻ Diệt Thế: trả máu lấy sát thương, càng cạn máu đòn càng nặng và hút lại, R biến hình quỷ và chết một lần không sao.",
    passive: {
        name: "Cái Giá Bằng Máu",
        desc: `Aatrox gây thêm ${p.p1}% sát thương cho mỗi 1% Máu đã mất và hồi ${p.p2}% sát thương gây ra lên tướng địch. Đang biến hình, hiệu lực nội tại gấp ${p.r5} lần.`,
    },
    en: {
        desc: "World Ender: pay blood for damage, the lower his HP the harder and more he drains, and R transforms him into a demon that survives death once.",
        passive: {
            name: "Blood Price",
            desc: `Aatrox deals ${p.p1}% more damage for every 1% missing HP and heals ${p.p2}% of the damage he deals to enemy champions. While transformed, the passive is ${p.r5} times as strong.`,
        },
        skills: {
            Q: {
                name: "The Darkin Blade",
                desc: `Lose ${p.q1}% of current HP (never below 1); the opposite enemy and the enemies in the 2 adjacent lanes take {${EN_Q}} physical damage.`,
            },
            E: {
                name: "Umbral Dash",
                desc: `Choose 1 enemy champion: it takes {${EN_E}} physical damage and Aatrox heals ${p.e3}% of the damage dealt.`,
            },
            R: {
                name: "World Ender",
                desc: `Every enemy champion takes {${EN_R}} physical damage. Then for ${p.r3} units Aatrox gains ${p.r6} AD, ${p.r7}% max HP and ${p.r8}% attack speed, and his passive is ${p.r5} times as strong. The first time he would fall to 0 HP he instead stays at ${p.r4}% HP and the form ends.`,
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
            desc: `Mất ${p.q1}% Máu hiện tại (còn ít nhất 1); tướng địch đối diện và 2 đường kề nhận {${F_Q}} sát thương vật lý.`,
            canPlay: (c) => c.self.hp >= 2 && !!c.g.opposite(c.self),
            resolve(c) {
                const g = c.g, me = c.self
                g.payHp(me,
                    me.hp * p.q1 / 100,
                    1)
                const foes = [c.target!,
                    ...[me.lane - 1,
                        me.lane + 1].map((l) => g.at(otherSide(me.side),
                        l)).filter((x): x is Unit => !!x && !x.token)]
                const raw = c.f(F_Q)
                for (const t of foes) g.damage(me,
                    t,
                    raw,
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
        E: {
            key: "E", mana: p.e0, name: "Xiềng Xích Hút Máu", target: "enemy",
            desc: `Chọn 1 tướng địch: nhận {${F_E}} sát thương vật lý, Aatrox hồi ${p.e3}% sát thương gây ra.`,
            resolve(c) {
                const dealt = c.g.damage(c.self,
c.target!,
c.f(F_E),
"physical",
{
    tag: "skill"
})
                c.g.heal(c.self,
                    c.self,
                    dealt * p.e3 / 100)
            },
        },
        R: {
            key: "R", mana: p.r0, name: "Kẻ Diệt Thế", target: "all_enemies",
            desc: `Mọi tướng địch nhận {${F_R}} sát thương vật lý. Sau đó trong ${p.r3} đơn vị Aatrox nhận thêm ${p.r6} AD, ${p.r7}% Máu tối đa và ${p.r8}% Tốc Đánh; nội tại gấp ${p.r5} lần. Lần đầu về 0 Máu, Aatrox còn ${p.r4}% Máu tối đa rồi hết dạng.`,
            canPlay: (c) => !c.g.isTransformed(c.self,
                FORM),
            resolve(c) {
                const g = c.g, me = c.self
                const raw = c.f(F_R)
                for (const t of g.heroes(otherSide(me.side))) g.damage(me,
                    t,
                    raw,
                    "physical",
                    {
                        tag: "skill"
                    })
                if (me.status !== "board") return
                const hpBonus = Math.round(me.maxHp * p.r7 / 100)
                if (!g.transform(me,
                    FORM,
                    p.r3,
                    {
                        bonus: {
                            atk: p.r6, attackSpeed: p.r8
                        }, maxHp: hpBonus, reviveHp: (me.maxHp + hpBonus) * p.r4 / 100,
                    })) return
                me.transform!.until = g.unitsUntil(me,
                    p.r3)
            },
        },
    },
})
