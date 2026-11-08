// Renata Glasc (Trợ thủ, phép): bộ chiêu chốt 31/10 - 01/11/2026 (docs/heroes/KITS.md). Số ở balance/heroes/renata.json.
// P Cấp Vốn: Mức Cấp Vốn theo % Máu đã mất của cả đội cho Tốc Đánh/Chí Mạng/AD; cứu đồng minh sắp bị hạ (hero onLethal, đứng đầu RULES.lethalOrder), 1 lần mỗi đồng minh mỗi trận.
// Q Cứu Cánh trả Máu lấy chỉ số, E Hoả Lực Yểm Trợ (Quick) bắn rồi hoá sát thương thành Khiên, R Hợp Chất Điên Loạn ép địch quay sang đánh.
import {
    kit, lockedAlly, when
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

const k = kit("renata"), { p } = k
/** Đồng minh đã được Cấp Vốn cứu trong trận (trên tướng được cứu, không mất khi chết) */
export const REVIVED = "renata_rev"
/** Cuồng Loạn (trên tướng địch) */
export const MADNESS = "madness"
/** Cứu Cánh: đòn đánh gây thêm v lượng Máu đã mất (v = hệ số) */
export const LIFELINE = "renata_q"

const F_SHOT = k.x("e1 + e2·AD + e3·AP"), EN_SHOT = k.xe("e1 + e2·AD + e3·AP")

/** Mức Cấp Vốn = tổng % Máu đã mất của mọi tướng mình trên sân chia p1 (liên tục) */
export function capitalLevel(g: Game, owner: Unit): number {
    let lost = 0
    for (const u of g.heroes(owner.side)) lost += Math.max(0,
        1 - u.hp / u.maxHp) * 100
    return lost / p.p1
}

/** Cuồng Loạn: mục tiêu gần nhất theo ưu tiên đồng minh của nó, trung lập (vật triệu hồi không chủ), tướng phe Renata, rồi Renata */
export function madnessTarget(g: Game, foe: Unit, renata: Unit): Unit | undefined {
    const near = (list: Unit[]) => [...list].sort((a, b) => Math.abs(a.lane - foe.lane) - Math.abs(b.lane - foe.lane) || a.lane - b.lane)[0]
    const ok = (x: Unit) => x.id !== foe.id && g.targetable(x)
    return near(g.heroes(foe.side).filter(ok))
        ?? near(g.board().filter((x) => !!x.token && !x.token.ownerId && ok(x)))
        ?? near(g.heroes(renata.side).filter((x) => ok(x) && x.id !== renata.id))
        ?? (g.targetable(renata) ? renata : undefined)
}

export default defineHero({
    id: "renata", name: "Renata Glasc", role: "support", damage: "magic", ...k.base,
    // Cứu Cánh vẫn cộng sát thương theo Máu đã mất khi Renata đã ngã
    offBoardHooks: ["onAttack"],
    bot: k.bot,
    desc: "Nữ tài phiệt Zaun: càng nhiều máu mất, cả đội càng đánh nhanh, chí mạng và đau hơn; cứu đồng minh sắp gục, hy sinh máu lấy sức và ép cả đội địch quay sang đánh nhau.",
    passive: {
        name: "Cấp Vốn",
        desc: `Mọi tướng mình nhận Tốc Đánh, Chí Mạng và AD theo Mức Cấp Vốn = tổng % Máu đã mất của mọi tướng mình chia ${p.p1}; mỗi Mức cho ${p.p2}% Tốc Đánh, ${pct(p.p3)}% Chí Mạng và ${p.p4} AD. Khi 1 tướng mình bị hạ, nó hồi sinh tại chỗ với ${pct(p.p5)}% Máu tối đa. Một lần mỗi đồng minh mỗi trận.`,
    },
    allyBonusStats(g, owner) {
        const lv = capitalLevel(g,
            owner)
        return {
            attackSpeed: lv * p.p2, crit: lv * p.p3, atk: lv * p.p4
        }
    },
    hooks: {
        onLethal(g, me, d) {
            const t = d.target
            if (t.side !== me.side || t.token || t.hp > 0 || t.status !== "board" || g.stackOf(t,
                REVIVED) > 0) return
            if (t.id === me.id && !k.flag("reviveSelf")) return
            g.setStack(t,
                REVIVED,
                1)
            g.log(`Renata Cấp Vốn: ${g.nameOf(t)} hồi sinh với ${pct(p.p5)}% Máu`)
            g.surviveWith(t,
                t.maxHp * p.p5)
        },
        onAttack(g, _me, d) {
            // Cứu Cánh: đòn đánh gây thêm v lượng Máu đã mất của chính người đánh
            const v = g.statusV(d.attacker,
                LIFELINE)
            const lost = Math.max(0,
                d.attacker.maxHp - d.attacker.hp)
            if (v > 0 && lost > 0) d.info.bonus.push({
                raw: lost * v, kind: d.info.kind
            })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Cứu Cánh", target: "ally", mana: p.q0,
            desc: `Chọn 1 tướng mình; nó mất ${pct(p.q1)}% Máu hiện tại (tối thiểu còn 1), rồi nhận ${p.q3}% Tốc Đánh, ${pct(p.q4)}% Chí Mạng và ${p.q5} AD trong ${p.q2} đơn vị. Trong thời gian đó, đòn đánh của nó gây thêm ${pct(p.q6)}% lượng Máu đã mất của nó.`,
            resolve(c) {
                const g = c.g, t = c.target!
                g.payHp(t,
                    t.hp * p.q1)
                g.timed(c.self,
                    t,
                    "attack_speed",
                    p.q2,
                    {
                        v: Math.max(g.statusV(t,
                            "attack_speed"),
                        p.q3)
                    })
                g.timed(c.self,
                    t,
                    "crit_up",
                    p.q2,
                    {
                        v: Math.max(g.statusV(t,
                            "crit_up"),
                        p.q4)
                    })
                g.timed(c.self,
                    t,
                    "ad_up",
                    p.q2,
                    {
                        v: Math.max(g.statusV(t,
                            "ad_up"),
                        p.q5)
                    })
                g.timed(c.self,
                    t,
                    LIFELINE,
                    p.q2,
                    {
                        v: p.q6
                    })
            },
        },
        E: {
            key: "E", name: "Hoả Lực Yểm Trợ", target: "ally", mana: p.e0, quick: true,
            quickWhen: when.targetsAlly,
            options: (c) => lockedAlly(c),
            desc: `Quick. Khi địch nhắm đúng 1 tướng mình, bạn có thể dùng lá này; mục tiêu là tướng đó (dùng chủ động thì chọn 1 tướng mình). Nó bắn gây {${F_SHOT}} sát thương theo AD/AP của nó lên kẻ vừa nhắm nó (nếu không có thì tướng địch đối diện, rồi tướng địch ngẫu nhiên), rồi nhận ${pct(p.e4)}% tổng sát thương đã gây thành Khiên.`,
            resolve(c) {
                const g = c.g, ally = c.target!
                const actor = c.trigger ? g.unit(c.trigger.actor) : undefined
                const foe = (actor && actor.side !== ally.side && !actor.token && g.targetable(actor) ? actor : undefined)
                    ?? g.opposite(ally) ?? g.pick(g.targetableEnemies(ally).filter((x) => !x.token))
                if (!foe || !g.targetable(foe)) return
                const dealt = g.damage(ally,
                    foe,
                    g.f(ally,
                        F_SHOT),
                    g.hero(ally).damage,
                    {
                        tag: "skill"
                    })
                if (dealt > 0 && ally.status === "board") g.shield(c.self,
                    ally,
                    dealt * p.e4)
            },
        },
        R: {
            key: "R", name: "Hợp Chất Điên Loạn", target: "all_enemies", mana: p.r0,
            desc: `Mọi tướng địch nhận Cuồng Loạn trong ${p.r1} đơn vị: thêm ${p.r2}% Tốc Đánh, và lập tức tự đánh 1 mục tiêu gần nhất theo thứ tự ưu tiên: đồng minh của nó, trung lập, tướng phe Renata, Renata.`,
            resolve(c) {
                const g = c.g, me = c.self
                const foes = g.enemies(me).filter((x) => !x.token).sort((a, b) => a.lane - b.lane)
                for (const t of foes) {
                    g.timed(me,
                        t,
                        MADNESS,
                        p.r1)
                    g.timed(me,
                        t,
                        "attack_speed",
                        p.r1,
                        {
                            v: Math.max(g.statusV(t,
                                "attack_speed"),
                            p.r2)
                        })
                }
                for (const t of foes) {
                    if (g.s.phase === "over") break
                    if (t.status !== "board" || !g.canAttack(t)) continue
                    const victim = madnessTarget(g,
                        t,
                        me)
                    if (!victim) continue
                    g.log(`Renata R: ${g.nameOf(t)} quay sang đánh ${g.nameOf(victim)}`)
                    g.attackAction(t,
                        victim)
                }
            },
        },
    },
    en: {
        desc: "Zaunite financier: the more HP the team has lost, the faster, crittier and harder it hits; she saves allies about to fall, trades HP for power and makes the enemy team turn on itself.",
        passive: {
            name: "Leverage",
            desc: `Every ally gains Attack Speed, Crit and AD by the Leverage Level = the total % of missing HP of all your champions divided by ${p.p1}; each Level gives ${p.p2} Attack Speed, ${pct(p.p3)}% Crit and ${p.p4} AD. When one of your champions is taken down, it revives in place with ${pct(p.p5)}% of its max HP. Once per ally per match.`,
        },
        skills: {
            Q: {
                name: "Lifeline",
                desc: `Choose 1 of your champions; it loses ${pct(p.q1)}% of its current HP (at least 1 left), then gains ${p.q3} Attack Speed, ${pct(p.q4)}% Crit and ${p.q5} AD for ${p.q2} units. During that time its attacks deal an extra ${pct(p.q6)}% of its missing HP.`,
            },
            E: {
                name: "Covering Fire",
                desc: `Quick. When an enemy targets exactly 1 of your champions, you may play this card; the target is that champion (played proactively, choose 1 of your champions). It fires for {${EN_SHOT}} damage based on its AD/AP at whoever just targeted it (otherwise the enemy opposite, then a random enemy champion), then gains ${pct(p.e4)}% of the total damage dealt as Shield.`,
            },
            R: {
                name: "Hostile Takeover",
                desc: `Every enemy champion gains Frenzy for ${p.r1} unit: ${p.r2} extra Attack Speed, and it immediately attacks the nearest target in this priority: its own allies, neutral, Renata's team, Renata.`,
            },
        },
    },
})
