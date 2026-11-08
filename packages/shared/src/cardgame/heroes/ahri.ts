// Ahri (Pháp sư, phép): bộ chiêu chốt 31/10 - 01/11/2026 (docs/heroes/KITS.md). Số ở balance/heroes/ahri.json.
// P Hút Tinh Hoa: mỗi đánh thường, dùng chiêu hoặc đổi chỗ cho 1 Tinh Hoa (vô hạn, mất một nửa khi chết); Tinh Hoa tăng sát thương chiêu, đòn thường và Tốc Đánh.
// Q đánh địch đối diện (hoặc địch Say Mê) rồi thêm sát thương chuẩn theo Máu đã mất, E đổi chỗ + đánh, R gắn Say Mê (tối đa 1 tầng, không hết hạn).
import {
    kit
} from "../balance"
import {
    pct
} from "../formula"
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    FOREVER, type Unit
} from "../types"

const k = kit("ahri"), { p } = k
/** Tinh Hoa (trên Ahri): mất một nửa khi Ahri chết */
export const ESSENCE = "ahri_essence"
/** Say Mê (trên tướng địch, do R gắn): tối đa 1 tầng, không hết hạn, mất khi nó bị hạ */
export const CHARM = "ahri_charm"

const F_ATTACK = k.x("p2·AP"), EN_ATTACK = k.xe("p2·AP")
const F_Q = k.x("q1 + q2·AP"), EN_Q = k.xe("q1 + q2·AP")
const F_Q_LOST = k.x("q3% máu đã mất mục tiêu"), EN_Q_LOST = k.xe("q3% máu đã mất mục tiêu")
const F_E = k.x("e1 + e2·AP"), EN_E = k.xe("e1 + e2·AP")
const F_R = k.x("r1 + r2·AP"), EN_R = k.xe("r1 + r2·AP")

const essence = (g: Game, me: Unit) => g.stackOf(me,
    ESSENCE)
/** Sát thương thêm của Q, E, R: p1 mỗi Tinh Hoa */
const skillBonus = (g: Game, me: Unit) => p.p1 * essence(g,
    me)
/** Ahri `me` đã gắn Say Mê lên t chưa */
const charmedBy = (g: Game, me: Unit, t: Unit) => g.has(t,
    CHARM) && t.statuses[CHARM].src === me.id

export default defineHero({
    id: "ahri", name: "Ahri", role: "mage", damage: "magic", ...k.base,
    deathHalf: [ESSENCE],
    bot: k.bot,
    desc: "Hồ ly hút tinh hoa: mỗi đòn đánh, chiêu và lần đổi chỗ cho 1 Tinh Hoa, làm chiêu và đòn thường mạnh dần, đánh nhanh dần; R mê hoặc một kẻ vĩnh viễn.",
    passive: {
        name: "Hút Tinh Hoa",
        desc: `Mỗi đánh thường, mỗi lần dùng chiêu và mỗi lần đổi chỗ của Ahri cho 1 Tinh Hoa, cộng dồn vô hạn; đòn thường của Ahri gây sát thương phép. Mỗi Tinh Hoa: Q, E, R gây thêm ${p.p1} sát thương; đòn thường gây thêm {${F_ATTACK}} sát thương phép và Ahri được thêm ${p.p3}% Tốc Đánh. Khi Ahri bị hạ, mất một nửa số Tinh Hoa.`,
    },
    attackSpeedAura(g, me, u) {
        return u.id === me.id ? p.p3 * essence(g,
            me) : 0
    },
    modifyDamage(g, me, d) {
        if (!d.src) return 1
        // Say Mê: Ahri gây thêm r3 lên kẻ bị mê, kẻ bị mê gây ít hơn r4 lên Ahri
        if (d.src.id === me.id && d.target.side !== me.side && charmedBy(g,
            me,
            d.target)) return 1 + p.r3
        if (d.target.id === me.id && d.src.side !== me.side && charmedBy(g,
            me,
            d.src)) return 1 - p.r4
        return 1
    },
    hooks: {
        onAttackHit(g, me, d) {
            if (d.attacker.id === me.id) g.stack(me,
                ESSENCE,
                1)
        },
        onCast(g, me, d) {
            if (d.caster.id === me.id) g.stack(me,
                ESSENCE,
                1)
        },
        onMove(g, me, d) {
            if (d.unit.id === me.id || d.with?.id === me.id) g.stack(me,
                ESSENCE,
                1)
        },
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id || !essence(g,
                me)) return
            d.info.bonus.push({
                raw: g.f(me,
                    F_ATTACK) * essence(g,
                    me), kind: "magic"
            })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Quả Cầu Ma Lực", target: "enemy", mana: p.q0,
            desc: `Chọn địch đối diện, hoặc địch đang có Say Mê ở bất kỳ đường; gây {${F_Q}} sát thương phép. Sau đó, gây thêm {${F_Q_LOST}} sát thương chuẩn.`,
            options(c) {
                const opp = c.g.opposite(c.self)
                return c.g.targetableEnemies(c.self).filter((u) => !u.token && (u.id === opp?.id || c.g.has(u,
                    CHARM))).map((u) => ({
                    target: u.id
                }))
            },
            resolve(c) {
                const g = c.g, me = c.self, t = c.target!
                g.damage(me,
                    t,
                    c.f(F_Q) + skillBonus(g,
                        me),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (t.status === "board") g.damage(me,
                    t,
                    g.f(me,
                        F_Q_LOST,
                        t),
                    "true",
                    {
                        tag: "skill"
                    })
            },
        },
        E: {
            key: "E", name: "Phi Hồ", target: "ally_other", mana: p.e0,
            desc: `Chọn 1 tướng mình khác; Ahri đổi chỗ với nó, rồi tướng địch đối diện vị trí mới nhận {${F_E}} sát thương phép.`,
            resolve(c) {
                const g = c.g, me = c.self
                if (!g.swapWith(me,
                    c.target!)) return
                const front = g.opposite(me)
                if (front && g.targetable(front) && !front.token) g.damage(me,
                    front,
                    c.f(F_E) + skillBonus(g,
                        me),
                    "magic",
                    {
                        tag: "skill"
                    })
            },
        },
        R: {
            key: "R", name: "Mê Hoặc", target: "opposite", mana: p.r0,
            desc: `Chọn địch đối diện; gây {${F_R}} sát thương phép và gắn Say Mê: Ahri gây thêm ${pct(p.r3)}% sát thương lên nó, và nó gây ít hơn ${pct(p.r4)}% sát thương lên Ahri. Không hết hạn, tối đa 1 tầng, mất khi nó bị hạ.`,
            resolve(c) {
                const g = c.g, me = c.self, t = c.target!
                const dealt = g.damage(me,
                    t,
                    c.f(F_R) + skillBonus(g,
                        me),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (dealt > 0 && t.status === "board") g.status(t,
                    CHARM,
                    1,
                    {
                        v: 1, until: FOREVER
                    })
            },
        },
    },
    en: {
        desc: "Essence-stealing fox: every attack, skill and swap gives 1 Essence, making her skills and attacks stronger and faster; R charms one enemy for good.",
        passive: {
            name: "Essence Theft",
            desc: `Each basic attack, each skill cast and each swap by Ahri gives 1 Essence, stacking without limit; Ahri's basic attacks deal magic damage. Each Essence: Q, E and R deal ${p.p1} extra damage; basic attacks deal an extra {${EN_ATTACK}} magic damage and Ahri gains ${p.p3} Attack Speed. When Ahri is taken down she loses half her Essence.`,
        },
        skills: {
            Q: {
                name: "Orb of Deception",
                desc: `Choose the enemy opposite, or an enemy with Charm in any lane; deal {${EN_Q}} magic damage. Then deal an extra {${EN_Q_LOST}} true damage.`,
            },
            E: {
                name: "Spirit Rush",
                desc: `Choose 1 other ally; Ahri swaps places with it, then the enemy champion opposite her new position takes {${EN_E}} magic damage.`,
            },
            R: {
                name: "Charm",
                desc: `Choose the enemy opposite; deal {${EN_R}} magic damage and apply Charm: Ahri deals ${pct(p.r3)}% more damage to it, and it deals ${pct(p.r4)}% less damage to Ahri. Never expires, 1 stack at most, lost when it is taken down.`,
            },
        },
    },
})
