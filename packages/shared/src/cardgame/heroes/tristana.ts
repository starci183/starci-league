// Tristana (Xạ thủ, vật lý). Chất: BOM. Bom là bộ đếm đặt lên địch (carrierStacks "tri_bomb"), vô hạn, tướng mang chết mất một nửa.
// Đòn trúng gắn Bom. Một lần mỗi lượt (cờ detonatesPerTurn) không tốn lá: nút tri_detonate kích nổ Bom trên 1 địch.
// Bom tự nổ khi sát thương nổ đủ hạ mục tiêu. Nổ: p3·n·(1 + n/p4)·(1 + p5·AD) vật lý (spike), không chí mạng.
// Cờ noCrit: Tristana không chí mạng, Chí mạng đổi thành Tốc Đánh theo p2 (mỗi 1% Chí mạng cho p2 Tốc Đánh).
import {
    kit, spike
} from "../balance"
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    type PlayArgs, type Unit
} from "../types"

const k = kit("tristana"), {
    p
} = k

export const BOMB = "tri_bomb"
const Q_ON = "tri_q"
const TURN_KEY = "tri_detonate"

const F_Q = k.x("q2 + q3·AD"), EN_Q = k.xe("q2 + q3·AD")
const F_R = k.x("r1 + r2·AD"), EN_R = k.xe("r1 + r2·AD")

/** Sát thương nổ thô của n Bom theo AD hiện tại của Tristana */
export const boomRaw = (g: Game, me: Unit, n: number) => spike(p.p3,
    n,
    p.p4) * (1 + p.p5 * g.atk(me))

/** Sát thương nổ ước tính (sau Giáp) có đủ hạ mục tiêu (Máu + Khiên) không */
function wouldKill(g: Game, me: Unit, t: Unit): boolean {
    const n = g.stackOf(t,
        BOMB)
    if (n <= 0) return false
    const dealt = boomRaw(g,
        me,
        n) * (100 / (100 + g.armor(t)))
    return dealt >= t.hp + g.totalShield(t)
}

/** Kích nổ Bom trên t: tiêu hết, gây sát thương. Trả sát thương thô (0 nếu không có Bom) */
export function detonate(g: Game, me: Unit, t: Unit): number {
    const n = g.stackOf(t,
        BOMB)
    if (n <= 0 || t.status !== "board" || t.token) return 0
    const raw = boomRaw(g,
        me,
        n)
    g.setStack(t,
        BOMB,
        0)
    g.damage(me,
        t,
        raw,
        "physical",
        {
            tag: "effect"
        })
    return raw
}

/** Cộng Bom; Bom đủ hạ mục tiêu thì tự nổ */
function addBomb(g: Game, me: Unit, t: Unit, n: number) {
    if (n <= 0 || t.status !== "board" || t.token || t.side === me.side) return
    g.stack(t,
        BOMB,
        n)
    if (wouldKill(g,
        me,
        t)) detonate(g,
        me,
        t)
}

const bombed = (g: Game, me: Unit) => g.enemies(me).filter((u) => !u.token && g.stackOf(u,
    BOMB) > 0)

export default defineHero({
    id: "tristana", name: "Tristana", role: "marksman", damage: "physical", ...k.base,
    carrierStacks: [BOMB],
    bot: k.bot,
    desc: "Bom nổ chậm: đòn đánh gắn Bom, Bom dồn lại thì nổ rất đau, đủ hạ là tự nổ.",
    passive: {
        name: "Bom Hẹn Giờ",
        desc: `Mỗi đòn trúng gắn ${p.p1} Bom lên tướng địch, vô hạn; tướng mang chết mất một nửa Bom. ${k.flag("noCrit") ? `Tristana không chí mạng: mỗi 1% Chí mạng đổi thành ${p.p2}% Tốc Đánh. ` : ""}Một lần mỗi lượt${k.num("detonatesPerTurn") > 1 ? ` (tối đa ${k.num("detonatesPerTurn")} lần)` : ""}, không tốn lá: kích nổ Bom trên 1 tướng địch. Bom tự nổ khi sát thương nổ đủ hạ mục tiêu. Bom với n tầng nổ ${p.p3} × n × (1 + n / ${p.p4}) × (1 + ${p.p5 * 100}% AD) sát thương vật lý.`,
    },
    abilities: [{
        id: "tri_detonate",
        name: "Kích Nổ Bom", nameEn: "Detonate Bomb",
        desc: `Một lần mỗi lượt, không tốn lá: chọn 1 tướng địch đang có Bom; Bom nổ ngay (${p.p3} × n × (1 + n / ${p.p4}) × (1 + ${p.p5 * 100}% AD) sát thương vật lý).`,
        descEn: `Once per turn, no card needed: choose 1 enemy champion carrying a Bomb; it explodes now (${p.p3} × n × (1 + n / ${p.p4}) × (1 + ${p.p5 * 100}% AD) physical damage).`,
        options(g, me): PlayArgs[] {
            if (!g.canAct(me) || g.turnCount(me,
                TURN_KEY) >= k.num("detonatesPerTurn")) return []
            return bombed(g,
                me).map((u) => ({
                target: u.id
            }))
        },
        resolve(g, me, args) {
            const t = g.unit(args.target)
            if (!t || g.stackOf(t,
                BOMB) <= 0) return
            g.bumpTurnCount(me,
                TURN_KEY)
            detonate(g,
                me,
                t)
        },
    }],
    hooks: {
        onAttack(g, me, d) {
            if (d.attacker.id === me.id && k.flag("noCrit")) d.info.noCrit = true
        },
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss) return
            addBomb(g,
                me,
                d.target,
                p.p1)
        },
        onDamage(g, me, d) {
            // Bom tự nổ khi sát thương nổ đã đủ hạ mục tiêu (mục tiêu mất máu hoặc Khiên theo mọi nguồn)
            if (me.status !== "board" || d.target.side === me.side || d.target.token || d.target.status !== "board" || d.target.hp <= 0) return
            if (wouldKill(g,
                me,
                d.target)) detonate(g,
                me,
                d.target)
        },
    },
    attackSpeedAura(g, me, u) {
        if (u.id !== me.id) return 0
        let as = g.statusV(me,
            Q_ON)
        if (k.flag("noCrit")) as += g.stats(me).crit * 100 * p.p2
        return as
    },
    skills: {
        Q: {
            key: "Q", name: "Bắn Nhanh", target: "self", mana: p.q0,
            desc: `Trong ${p.q1} đơn vị: Tristana nhận {${F_Q}} Tốc Đánh.`,
            resolve(c) {
                c.g.timed(c.self,
                    c.self,
                    Q_ON,
                    p.q1,
                    {
                        v: c.f(F_Q)
                    })
            },
        },
        E: {
            key: "E", name: "Gắn Bom", target: "enemy", mana: p.e0,
            desc: `Chọn 1 tướng địch; gắn ${p.e1} Bom.`,
            resolve(c) {
                addBomb(c.g,
                    c.self,
                    c.target!,
                    p.e1)
            },
        },
        R: {
            key: "R", name: "Đại Bác", target: "enemy", mana: p.r0,
            desc: `Chọn 1 tướng địch ở bất kỳ đường; kích nổ Bom trên nó, tướng địch khác nhận ${p.r3}% vụ nổ. Nếu nó còn sống, gây {${F_R}} sát thương vật lý.`,
            resolve(c) {
                const g = c.g
                const t = c.target!
                const raw = detonate(g,
                    c.self,
                    t)
                if (raw > 0) {
                    let prev = t.id
                    for (const o of g.enemies(c.self)) {
                        if (o.token || o.id === t.id || o.status !== "board") continue
                        g.damage(c.self,
                            o,
                            raw * p.r3 / 100,
                            "physical",
                            {
                                tag: "effect", aoe: true, via: prev
                            })
                        prev = o.id
                    }
                }
                if (t.status !== "board") return
                g.damage(c.self,
                    t,
                    c.f(F_R),
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
    },
    en: {
        desc: "Time bomb: attacks plant Bombs, stacked Bombs go off hard, and a lethal Bomb detonates by itself.",
        passive: {
            name: "Explosive Charge",
            desc: `Each hit puts ${p.p1} Bomb on an enemy champion, unlimited; the bearer dying halves its Bombs. ${k.flag("noCrit") ? `Tristana cannot crit: each 1% Crit becomes ${p.p2}% attack speed. ` : ""}Once per turn${k.num("detonatesPerTurn") > 1 ? ` (up to ${k.num("detonatesPerTurn")} times)` : ""}, with no card: detonate the Bombs on 1 enemy champion. A Bomb detonates by itself when its explosion would take its bearer down. n Bombs explode for ${p.p3} × n × (1 + n / ${p.p4}) × (1 + ${p.p5 * 100}% AD) physical damage.`,
        },
        skills: {
            Q: {
                name: "Rapid Fire",
                desc: `For ${p.q1} units: Tristana gains {${EN_Q}} attack speed.`,
            },
            E: {
                name: "Explosive Charge",
                desc: `Choose 1 enemy champion; plant ${p.e1} Bombs on it.`,
            },
            R: {
                name: "Buster Shot",
                desc: `Choose 1 enemy champion in any lane; detonate the Bombs on it, other enemy champions take ${p.r3}% of the explosion. If it survives, deal {${EN_R}} physical damage.`,
            },
        },
    },
})
