// Kog'Maw (Xạ thủ). Chất: ĐÓI. Đói là bộ đếm riêng của Kog'Maw (stack "hunger"), vô hạn, KHÔNG mất khi chết (không nằm trong deathHalf).
// Kog'Maw không chí mạng; Chí mạng đổi thành Đói: lượng Đói nhận được nhân (1 + p7·Chí mạng), phần lẻ theo X.Y (chắc chắn phần nguyên, phần lẻ là xác suất thêm 1).
// Cờ gainsHungerOnDeath: chính Kog'Maw bị hạ thì nhận p6 Đói.
import {
    kit
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

const k = kit("kogmaw"), {
    p
} = k

export const HUNGER = "hunger"
const E_ON = "kog_e"

const F_HIT = k.x("p3% Máu tối đa mục tiêu + p4 + p5·AD"), EN_HIT = k.xe("p3% Máu tối đa mục tiêu + p4 + p5·AD")
const F_Q = k.x("q1 + q2·AD"), EN_Q = k.xe("q1 + q2·AD")
const F_R = k.x("r1 + r2·AD + r3% Máu đã mất mục tiêu"), EN_R = k.xe("r1 + r2·AD + r3% Máu đã mất mục tiêu")

/** X.Y: chắc chắn phần nguyên, phần lẻ là xác suất thêm 1 */
const whole = (g: Game, x: number) => Math.floor(x) + (g.rand() < x % 1 ? 1 : 0)

/** Nhận `base` Đói, nhân (1 + p7·Chí mạng), phần lẻ theo X.Y */
function gainHunger(g: Game, me: Unit, base: number) {
    const n = whole(g,
        base * (1 + p.p7 * g.stats(me).crit))
    if (n > 0) g.stack(me,
        HUNGER,
        n)
}

export default defineHero({
    id: "kogmaw", name: "Kog'Maw", role: "marksman", damage: "magic", ...k.base,
    bot: k.bot,
    desc: "Sống càng lâu càng đói: bắn theo % máu tối đa, tank càng trâu càng lủng.",
    passive: {
        name: "Cơn Đói Hư Không",
        desc: `Kog'Maw không chí mạng; Chí mạng đổi thành Đói: mọi lượng Đói nhận được nhân (1 + ${p.p7 * 100}% Chí mạng), phần lẻ là xác suất thêm 1. Đầu lượt của bạn khi Kog'Maw trên sân: nhận ${p.p1} Đói. Tướng khác chết khi Kog'Maw trên sân: nhận ${p.p2} Đói. Đói vô hạn. Mỗi Đói làm đòn trúng của Kog'Maw gây thêm {${F_HIT}} sát thương vật lý, không chí mạng. ${k.flag("gainsHungerOnDeath") ? `Kog'Maw bị hạ: nhận ${p.p6} Đói, không mất Đói.` : "Đói không mất khi Kog'Maw chết."}`,
    },
    hooks: {
        onAttack(g, me, d) {
            if (d.attacker.id === me.id) d.info.noCrit = true
        },
        onTurnStart(g, me, d) {
            if (d.side === me.side && me.status === "board") gainHunger(g,
                me,
                p.p1)
        },
        onDeath(g, me, d) {
            if (d.victim.token) return
            if (d.victim.id === me.id) {
                if (k.flag("gainsHungerOnDeath")) gainHunger(g,
                    me,
                    p.p6)
                return
            }
            if (me.status === "board") gainHunger(g,
                me,
                p.p2)
        },
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss || d.target.side === me.side) return
            const n = g.stackOf(me,
                HUNGER)
            // gói riêng, không nhân chí mạng của đòn chính
            if (n > 0) g.damage(me,
                d.target,
                n * g.f(me,
                    F_HIT,
                    d.target),
                "physical",
                {
                    tag: "attack"
                })
            // E: thêm % Máu tối đa mục tiêu mỗi đòn
            if (g.has(me,
                E_ON)) g.damage(me,
                d.target,
                d.target.maxHp * p.e3 / 100,
                "physical",
                {
                    tag: "attack"
                })
        },
    },
    attackSpeedAura(g, me, u) {
        return u.id === me.id && g.has(me,
            E_ON) ? p.e2 : 0
    },
    extraAttackTargets(g, me) {
        // E: đòn tới mọi đường
        return g.has(me,
            E_ON) ? g.enemies(me).filter((u) => !u.token && g.targetable(u)) : []
    },
    skills: {
        Q: {
            key: "Q", name: "Phun Axít", target: "enemy", mana: p.q0,
            desc: `Chọn 1 tướng địch; gây {${F_Q}} sát thương vật lý và Rã Giáp ${p.q3} đơn vị.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "physical",
                    {
                        tag: "skill"
                    })
                if (t.status === "board") c.g.timed(c.self,
                    t,
                    "shred",
                    p.q3)
            },
        },
        E: {
            key: "E", name: "Cao Xạ Ma Pháp", target: "self", mana: p.e0,
            desc: `Trong ${p.e1} đơn vị: Kog'Maw nhận ${p.e2}% Tốc Đánh, đòn đánh tới mọi đường và mỗi đòn trúng gây thêm ${p.e3}% Máu tối đa của mục tiêu sát thương vật lý.`,
            resolve(c) {
                c.g.timed(c.self,
                    c.self,
                    E_ON,
                    p.e1)
            },
        },
        R: {
            key: "R", name: "Pháo Sinh Học", target: "enemy", mana: p.r0,
            desc: `Chọn 1 tướng địch ở bất kỳ đường; gây {${F_R}} sát thương vật lý. Hạ gục: nhận ${p.r4} Đói.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.g.f(c.self,
                        F_R,
                        t),
                    "physical",
                    {
                        tag: "skill"
                    })
                if (t.status !== "board") gainHunger(c.g,
                    c.self,
                    p.r4)
            },
        },
    },
    en: {
        desc: "The longer he lives, the hungrier he gets: shots scale with max HP, and the tankier they are, the more it hurts.",
        passive: {
            name: "Void Hunger",
            desc: `Kog'Maw cannot crit; Crit becomes Hunger: every Hunger he gains is multiplied by (1 + ${p.p7 * 100}% Crit), the fraction being the chance of 1 extra. At the start of your turn while Kog'Maw is on the board: gain ${p.p1} Hunger. Another champion dying while Kog'Maw is on the board: gain ${p.p2} Hunger. Hunger is unlimited. Each Hunger makes Kog'Maw's hits deal an extra {${EN_HIT}} physical damage, which cannot crit. ${k.flag("gainsHungerOnDeath") ? `Kog'Maw being taken down: gain ${p.p6} Hunger, and he loses no Hunger.` : "Hunger is not lost when Kog'Maw dies."}`,
        },
        skills: {
            Q: {
                name: "Caustic Spittle",
                desc: `Choose 1 enemy champion; deal {${EN_Q}} physical damage and Shred its Armor for ${p.q3} units.`,
            },
            E: {
                name: "Magic Range",
                desc: `For ${p.e1} units: Kog'Maw gains ${p.e2}% attack speed, his attacks reach every lane, and each hit deals ${p.e3}% of the target's max HP as extra physical damage.`,
            },
            R: {
                name: "Living Artillery",
                desc: `Choose 1 enemy champion in any lane; deal {${EN_R}} physical damage. Taking it down: gain ${p.r4} Hunger.`,
            },
        },
    },
})
