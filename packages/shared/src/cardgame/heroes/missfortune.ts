// Miss Fortune (Xạ thủ, vật lý). Chất: MƯA ĐẠN, đổi mục tiêu liên tục, bắn cả bàn.
// Nội tại: mỗi đòn nảy sang 1 địch khác với p1% sát thương (g.damage option via = bước nảy trước).
// Q và R chí mạng theo Chí mạng hiện có: tung tay một lần cho mỗi mục tiêu rồi truyền crit cho g.damage.
import {
    kit
} from "../balance"
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    RULES, type Unit
} from "../types"

const k = kit("missfortune"), {
    p
} = k

export const EXPOSED = "mf_exposed"

const F_Q = k.x("q1 + q2·AD"), EN_Q = k.xe("q1 + q2·AD")
const F_E = k.x("e1 + e2·AD"), EN_E = k.xe("e1 + e2·AD")
const F_R = k.x("r3 + r4·AD"), EN_R = k.xe("r3 + r4·AD")
const F_WAVES = k.x("r1 + r2·Tốc Đánh"), EN_WAVES = k.xe("r1 + r2·Tốc Đánh")

/** Chí mạng của sát thương tính tay: tung theo Chí mạng hiện có, hệ số như đòn đánh */
function rollCrit(g: Game, u: Unit): { crit: boolean; m: number } {
    const st = g.stats(u)
    const crit = g.statusV(u,
        "alwaysCrit") > 0 || (st.crit > 0 && g.rand() < Math.min(1,
        st.crit))
    return {
        crit, m: crit ? RULES.critBase + st.critDmg : 1
    }
}

const foes = (g: Game, me: Unit) => g.enemies(me).filter((u) => !u.token && u.status === "board")

export default defineHero({
    id: "missfortune", name: "Miss Fortune", role: "marksman", damage: "physical", ...k.base,
    desc: "Mưa đạn: mỗi đòn nảy sang địch khác, Q nảy nữa, E rải cả bàn, R bão đạn.",
    passive: {
        name: "Song Súng",
        desc: `Mỗi đòn nảy sang 1 tướng địch khác ngẫu nhiên, gây ${p.p1}% sát thương của đòn đó. Không có tướng địch khác thì không nảy.`,
    },
    hooks: {
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss || d.target.token || d.target.side === me.side) return
            const next = g.pick(g.targetableEnemies(me).filter((u) => !u.token && u.id !== d.target.id))
            if (!next) return
            const st = g.stats(me)
            const m = d.info.mult * (1 + st.extraAtk) * (d.info.crit ? RULES.critBase + st.critDmg : 1)
            g.damage(me,
                next,
                d.info.raw * m * p.p1 / 100,
                d.info.kind,
                {
                    tag: "attack", crit: d.info.crit, via: d.target.id
                })
        },
    },
    modifyDamage(g, me, d) {
        // E: tướng địch bị Mưa Đạn chịu thêm e4% sát thương từ phe Miss Fortune
        if (!d.src || d.src.side !== me.side || d.target.side === me.side) return 1
        return 1 + g.statusV(d.target,
            EXPOSED) / 100
    },
    skills: {
        Q: {
            key: "Q", name: "Bắn Nảy", target: "enemy", mana: p.q0,
            desc: `Chọn 1 tướng địch; gây {${F_Q}} sát thương vật lý, có thể chí mạng. Nảy sang ${p.q4} tướng địch khác ngẫu nhiên, mỗi người nhận ${p.q3}% sát thương đó.`,
            resolve(c) {
                const g = c.g
                const t = c.target!
                const cr = rollCrit(g,
                    c.self)
                const raw = c.f(F_Q) * cr.m
                g.damage(c.self,
                    t,
                    raw,
                    "physical",
                    {
                        tag: "skill", crit: cr.crit
                    })
                let prev = t.id
                const pool = g.targetableEnemies(c.self).filter((u) => !u.token && u.id !== t.id)
                for (let i = 0; i < p.q4; i++) {
                    const next = g.pick(pool)
                    if (!next) break
                    pool.splice(pool.indexOf(next),
                        1)
                    g.damage(c.self,
                        next,
                        raw * p.q3 / 100,
                        "physical",
                        {
                            tag: "skill", crit: cr.crit, via: prev, aoe: true
                        })
                    prev = next.id
                }
            },
        },
        E: {
            key: "E", name: "Mưa Đạn", target: "all_enemies", mana: p.e0,
            desc: `Mọi tướng địch nhận {${F_E}} sát thương vật lý, rồi trong ${p.e3} đơn vị chịu thêm ${p.e4}% sát thương từ phe bạn.`,
            resolve(c) {
                const g = c.g
                const raw = c.f(F_E)
                for (const t of foes(g,
                    c.self)) {
                    g.damage(c.self,
                        t,
                        raw,
                        "physical",
                        {
                            tag: "skill", aoe: true
                        })
                    if (t.status === "board") g.timed(c.self,
                        t,
                        EXPOSED,
                        p.e3,
                        {
                            v: p.e4
                        })
                }
            },
        },
        R: {
            key: "R", name: "Đạn Tử Thần", target: "all_enemies", mana: p.r0,
            desc: `Bắn {${F_WAVES}} loạt (phần lẻ là xác suất thêm 1 loạt). Mỗi loạt mọi tướng địch nhận {${F_R}} sát thương vật lý, có thể chí mạng.`,
            resolve(c) {
                const g = c.g
                const w = g.f(c.self,
                    F_WAVES)
                const waves = Math.floor(w) + (g.rand() < w % 1 ? 1 : 0)
                for (let i = 0; i < waves; i++) {
                    if (c.self.status !== "board" || g.s.phase === "over") break
                    for (const t of foes(g,
                        c.self)) {
                        const cr = rollCrit(g,
                            c.self)
                        g.damage(c.self,
                            t,
                            c.f(F_R) * cr.m,
                            "physical",
                            {
                                tag: "skill", crit: cr.crit, aoe: true
                            })
                    }
                }
            },
        },
    },
    en: {
        desc: "Bullet storm: every hit ricochets to another enemy, Q ricochets twice more, E sprays the whole board, R is a barrage.",
        passive: {
            name: "Double Up",
            desc: `Each hit ricochets to 1 other random enemy champion for ${p.p1}% of that hit's damage. With no other enemy champion it does not ricochet.`,
        },
        skills: {
            Q: {
                name: "Double Shot",
                desc: `Choose 1 enemy champion; deal {${EN_Q}} physical damage, which can crit. It ricochets to ${p.q4} other random enemy champions, each taking ${p.q3}% of that damage.`,
            },
            E: {
                name: "Make It Rain",
                desc: `Every enemy champion takes {${EN_E}} physical damage, then for ${p.e3} units takes ${p.e4}% more damage from your team.`,
            },
            R: {
                name: "Bullet Time",
                desc: `Fire {${EN_WAVES}} waves (the fraction is the chance of 1 extra wave). Each wave deals {${EN_R}} physical damage to every enemy champion, which can crit.`,
            },
        },
    },
})
