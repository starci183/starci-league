// Brand (Pháp sư, phép): bộ chiêu chốt 31/10 - 01/11/2026 (docs/heroes/KITS.md). Số ở balance/heroes/brand.json.
// P Hoả Lực: mỗi chiêu trúng gắn Bỏng theo đơn vị X.Y (scale AP). Bỏng là bộ đếm đặt trên tướng ĐỊCH (HeroDef.carrierStacks): tướng mang chết mất một nửa, Brand chết không đổi.
// Bỏng cháy ở đầu lượt của tướng mang (hook onStandby, chạy cả khi Brand đã ngã), không bao giờ hết hạn.
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
import type {
    Unit
} from "../types"

const k = kit("brand"), { p } = k
/** Bỏng: bộ đếm trên tướng mang (không phải trạng thái có hạn) */
export const BURN = "burn"

const F_P = k.x("p1 + p2·AP"), EN_P = k.xe("p1 + p2·AP")
const F_Q = k.x("q1 + q2·AP"), EN_Q = k.xe("q1 + q2·AP")
const F_STUN = k.x("q4 + q5·AP"), EN_STUN = k.xe("q4 + q5·AP")
const F_E = k.x("e1 + e2·AP"), EN_E = k.xe("e1 + e2·AP")
const F_R = k.x("r1 + r2·AP"), EN_R = k.xe("r1 + r2·AP")

/** Đơn vị X.Y: floor(x) chắc chắn, phần lẻ là xác suất thêm 1 (law.md 4) */
const whole = (g: Game, x: number) => {
    const f = Math.floor(Math.max(0,
        x))
    return f + (g.rand() < Math.max(0,
        x) - f ? 1 : 0)
}
/** Gắn `units` (X.Y) Bỏng lên t */
export function ignite(g: Game, t: Unit, units: number): number {
    if (t.status !== "board" || t.token) return 0
    const n = whole(g,
        units)
    if (n > 0) g.stack(t,
        BURN,
        n)
    return n
}
/** Brand `me` gắn Bỏng theo nội tại Hoả Lực lên t */
export const applyBurn = (g: Game, me: Unit, t: Unit) => ignite(g,
    t,
    g.f(me,
        F_P))
/** Bỏng của t cháy 1 lần: mỗi Bỏng gây p3 Máu hiện tại + p4 Máu tối đa sát thương phép */
export function burnTick(g: Game, me: Unit, t: Unit, visualGroup?: string) {
    const n = g.stackOf(t,
        BURN)
    if (n <= 0 || t.status !== "board") return
    g.damage(me,
        t,
        (t.hp * p.p3 + t.maxHp * p.p4) * n,
        "magic",
        {
            tag: "dot", visuals: ["burn"], visualGroup
        })
}
const foes = (g: Game, me: Unit) => g.enemies(me).filter((u) => !u.token)

export default defineHero({
    id: "brand", name: "Brand", role: "mage", damage: "magic", ...k.base,
    carrierStacks: [BURN],
    bot: k.bot,
    desc: "Lửa không bao giờ tắt: mỗi chiêu gắn Bỏng cộng dồn không trần lên địch, Bỏng cháy mỗi đầu lượt của kẻ mang kể cả khi Brand đã ngã; Q choáng kẻ cháy đủ, E rải lửa cả bàn, R nhân đôi Bỏng và đốt ngay.",
    passive: {
        name: "Hoả Lực",
        desc: `Mỗi chiêu trúng gắn {${F_P}} Bỏng (đơn vị X.Y: phần nguyên chắc chắn, phần lẻ là xác suất thêm 1). Bỏng: đầu lượt tướng mang, mỗi Bỏng gây ${pct(p.p3)}% Máu hiện tại + ${pct(p.p4)}% Máu tối đa của nó sát thương phép. Không hết hạn. Tướng mang bị hạ mất một nửa số Bỏng; Brand bị hạ không ảnh hưởng Bỏng đã gắn.`,
    },
    hooks: {
        onStandby(g, me, d) {
            // đầu lượt của phe mang Bỏng: mọi tướng địch đang mang Bỏng cháy 1 lần
            if (d.side === me.side) return
            const visualGroup = `${me.id}:burn:turn:${g.s.turnNo}` // mọi tick cùng đầu lượt rơi cùng lúc
            for (const t of g.heroes(d.side)) burnTick(g,
                me,
                t,
                visualGroup)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Thiêu Rụi", target: "enemy", mana: p.q0,
            desc: `Chọn 1 tướng địch; gây {${F_Q}} sát thương phép và gắn Bỏng. Nếu sau đó nó có từ ${p.q3} Bỏng: Choáng {${F_STUN}} đơn vị.`,
            resolve(c) {
                const g = c.g, me = c.self, t = c.target!
                const dealt = g.damage(me,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill", visuals: ["fireHit"]
                    })
                if (dealt <= 0) return
                applyBurn(g,
                    me,
                    t)
                if (t.status === "board" && g.stackOf(t,
                    BURN) >= p.q3) g.timed(me,
                    t,
                    "stun",
                    c.f(F_STUN))
            },
        },
        E: {
            key: "E", name: "Rải Lửa", target: "all_enemies", mana: p.e0,
            desc: `Mọi tướng địch nhận {${F_E}} sát thương phép và bị gắn Bỏng.`,
            resolve(c) {
                const g = c.g, me = c.self
                const dmg = c.f(F_E), visualGroup = `${me.id}:e:${c.card.uid}:${g.s.turnNo}`
                for (const t of foes(g,
                    me)) {
                    if (g.damage(me,
                        t,
                        dmg,
                        "magic",
                        {
                            tag: "skill", visuals: ["fireHit"], visualGroup
                        }) > 0) applyBurn(g,
                        me,
                        t)
                }
            },
        },
        R: {
            key: "R", name: "Bão Lửa", target: "all_enemies", mana: p.r0,
            desc: `Mọi tướng địch nhận {${F_R}} sát thương phép và bị gắn Bỏng; sau đó số Bỏng của nó nhân đôi và cháy ngay 1 lần.`,
            resolve(c) {
                const g = c.g, me = c.self
                const dmg = c.f(F_R)
                for (const t of foes(g,
                    me)) {
                    if (g.damage(me,
                        t,
                        dmg,
                        "magic",
                        {
                            tag: "skill", visuals: ["explosion"]
                        }) > 0) applyBurn(g,
                        me,
                        t)
                    const n = g.stackOf(t,
                        BURN)
                    if (n > 0) g.stack(t,
                        BURN,
                        n)
                    burnTick(g,
                        me,
                        t)
                }
            },
        },
    },
    en: {
        desc: "Fire that never goes out: every skill stacks uncapped Burn on enemies, Burn ticks at the start of its bearer's turn even if Brand has fallen; Q Stuns the well-burned, E sprays the whole board, R doubles the Burn and ignites it at once.",
        passive: {
            name: "Blaze",
            desc: `Each skill that hits applies {${EN_P}} Burn (X.Y units: the whole part is guaranteed, the fraction is the chance of 1 more). Burn: at the start of its bearer's turn, each Burn deals ${pct(p.p3)}% of its current HP + ${pct(p.p4)}% of its max HP as magic damage. Never expires. When the bearer is taken down it loses half its Burn; Brand being taken down does not change applied Burn.`,
        },
        skills: {
            Q: {
                name: "Sear",
                desc: `Choose 1 enemy champion; deal {${EN_Q}} magic damage and apply Burn. If it then has at least ${p.q3} Burn: Stun it for {${EN_STUN}} units.`,
            },
            E: {
                name: "Pillar of Flame",
                desc: `Every enemy champion takes {${EN_E}} magic damage and gains Burn.`,
            },
            R: {
                name: "Pyroclasm",
                desc: `Every enemy champion takes {${EN_R}} magic damage and gains Burn; then its Burn doubles and ignites at once, ticking once.`,
            },
        },
    },
})
