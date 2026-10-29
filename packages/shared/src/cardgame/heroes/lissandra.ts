// Lissandra (Pháp sư, phép): máu 760 · AD 60 · giáp/kháng 30/32. Engine: chain (Chuỗi Quick), prizes (lá thưởng).
// MỤC ĐÍCH: "Đóng băng kẻ dám ra tay" — Buốt (status engine "chill", hiện trên tướng) là chìa khoá: lá Quick của Lissandra
// Choáng tướng địch đang Buốt ngay khi nó đánh lá (mắt xích của nó bị huỷ vì người tung bị Choáng), Quan Tài Băng nối chuỗi
// che đồng minh; tướng Buốt bị hạ thì lật thêm lá thưởng.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    otherSide,
    type PlayArgs, type Unit
} from "../types"

const F_Q = "160 + 50% AP"
const F_E = "140 + 35% AP"
const F_R = "200 + 40% AP"
const FROZEN = "lissFrozen" // dấu nội bộ: tướng địch về 0 máu khi đang Buốt (xét lúc onDeath vì kill() xoá status trước hook)

/** Buốt tới hết lượt kế tiếp (bất kể của ai) */
const chill = (g: Game, t: Unit) => { if (t.status === "board") g.status(t,
    "chill",
    1,
    {
        until: g.s.turnNo + 1
    }) }
const frozenTargets = (g: Game, me: Unit) => g.heroes(otherSide(me.side)).filter((u) => g.has(u,
    "chill") && !g.has(u,
    "stealth"))

export default defineHero({
    id: "lissandra", name: "Lissandra", role: "mage", damage: "magic", hp: 2010, atk: 100, armor: 30, mr: 32,
    desc: "Đóng băng kẻ dám ra tay: Buốt tướng địch, rồi trong lượt đối thủ Choáng đúng tướng Buốt vừa đánh lá để huỷ lá đó. Tướng Buốt gục cho thêm lá thưởng.",
    skillCopies: {
        Q: 10, E: 10, R: 3
    },
    passive: {
        name: "Băng Giá Vĩnh Cửu",
        desc: "Khi 1 tướng địch bị hạ trong lúc đang Buốt, bạn lật thêm 1 lá thưởng.",
    },
    hooks: {
        onDamage(g, me, d) {
            if (d.target.side === me.side || d.target.token) return
            if (d.target.hp <= 0 && g.has(d.target,
                "chill")) d.target.stacks[FROZEN] = 1
            else if (d.target.stacks[FROZEN]) delete d.target.stacks[FROZEN]
        },
        onDeath(g, me, d) {
            if (d.victim.side === me.side || !d.victim.stacks[FROZEN]) return
            delete d.victim.stacks[FROZEN]
            if (me.status === "board" && g.player(d.victim.side).lives > 0) g.flipPrize(me.side)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Mảnh Băng", target: "enemy", quick: true,
            quickWhen: (c) => c.trigger.side !== c.side,
            desc: `**Quick:** nối chuỗi được lên bất kỳ lá nào đối thủ đánh. {${F_Q}} sát thương phép cho 1 tướng địch và Buốt nó tới hết lượt kế tiếp. **Điều kiện:** mục tiêu đang Buốt từ trước thì bị Câm Lặng 1 lượt.`,
            resolve(c) {
                const t = c.target!
                const cold = c.g.has(t,
                    "chill")
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (cold && t.status === "board") c.g.status(t,
                    "silence",
                    1)
                chill(c.g,
                    t)
            },
        },
        E: {
            key: "E", name: "Vòng Băng", target: "enemy", quick: true,
            quickWhen: (c) => {
                const a = c.g.unit(c.trigger.actor)
                return c.trigger.side !== c.side && !!a && a.side !== c.side && a.status === "board" && c.g.has(a,
                    "chill")
            },
            options(c): PlayArgs[] {
                if (c.trigger) return c.trigger.actor ? [{
                    target: c.trigger.actor
                }] : []
                return frozenTargets(c.g,
                    c.self).map((u) => ({
                    target: u.id
                }))
            },
            desc: `**Quick:** nối chuỗi được khi một tướng địch **đang Buốt** đánh lá: {${F_E}} sát thương phép và Choáng tướng đó (lá nó vừa đánh bị huỷ). Dùng trong lượt bạn: chọn 1 tướng địch đang Buốt, gây {${F_E}} sát thương phép và Choáng 1 lượt. **Điều kiện:** chỉ nhắm được tướng đang Buốt.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_E),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (t.status === "board") c.g.status(t,
                    "stun",
                    1)
            },
        },
        R: {
            key: "R", name: "Quan Tài Băng", target: "none", quick: true, chainOnly: true,
            quickWhen: (c) => c.trigger.side !== c.side && !!c.trigger.single && !!c.trigger.target,
            desc: `**Quick, chỉ nối chuỗi:** khi địch đánh lá nhắm đúng 1 tướng mình, tướng đó hoá Quan Tài Băng: không nhận sát thương và khống chế từ lá đó. Kẻ tung lá nhận {${F_R}} sát thương phép và bị Buốt. **Điều kiện:** kẻ tung lá đang Buốt từ trước thì còn bị Choáng (lá của nó bị huỷ).`,
            resolve(c) {
                const fx = c.g.chainFx()
                fx.cut = 1
                fx.cutSide = c.side
                fx.cutNoCc = true
                const caster = c.g.unit(c.trigger?.actor)
                if (!caster || caster.side === c.side || caster.status !== "board") return
                const cold = c.g.has(caster,
                    "chill")
                c.g.damage(c.self,
                    caster,
                    c.f(F_R),
                    "magic",
                    {
                        tag: "skill"
                    })
                chill(c.g,
                    caster)
                if (cold && caster.status === "board") c.g.status(caster,
                    "stun",
                    1)
            },
        },
    },
})
