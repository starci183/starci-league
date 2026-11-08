// Braum (Đỡ đòn, phép): "Đứng sau tôi". Hứng đòn thay đồng đội, càng bị đánh càng cứng (Song Giáp), Dấu Băng biến đòn của đồng đội thành Choáng.
// Số liệu: balance/heroes/braum.json (p1.. nội tại, q/e/r theo chiêu). Chiêu chỉ scale Máu tối đa, Giáp.
// Engine dùng: HeroDef.bonusStats + deathHalf (Song Giáp), g.addMark + hook onMarkHit (Dấu Băng), ReactFx.intercept (E), g.timed (Choáng theo đơn vị).
import {
    kit, when
} from "../balance"
import {
    defineHero
} from "../registry"
import {
    otherSide
} from "../types"

const k = kit("braum"), { p } = k
const DUAL = "braum_dual"
const MARK = "braum_mark"
const F_Q = k.x("q1 + q2·Máu tối đa"), EN_Q = k.xe("q1 + q2·Máu tối đa")
/** Dấu Băng: Choáng p3 + p4·Giáp đơn vị */
const F_MARK = k.x("p3 + p4·Giáp"), EN_MARK = k.xe("p3 + p4·Giáp")
const F_E = k.x("e1 + e2·Máu tối đa + e3·Giáp"), EN_E = k.xe("e1 + e2·Máu tối đa + e3·Giáp")
const F_R = k.x("r1 + r2·Máu tối đa"), EN_R = k.xe("r1 + r2·Máu tối đa")
const F_R_MAIN = k.x("r3 + r4·Giáp"), EN_R_MAIN = k.xe("r3 + r4·Giáp")
const F_R_REST = k.x("r5 + r6·Giáp"), EN_R_REST = k.xe("r5 + r6·Giáp")

export default defineHero({
    id: "braum", name: "Braum", role: "tank", damage: "magic", ...k.base,
    deathHalf: [DUAL],
    // Dấu Băng đã đặt vẫn kích khi Braum đã ngã (đồng minh đánh trúng: Choáng, Song Giáp)
    offBoardHooks: ["onMarkHit"],
    bot: k.bot,
    desc: "Tấm khiên của Freljord: mở giao tranh bằng Dấu Băng, hứng đòn thay đồng đội, càng bị đánh càng cứng, rồi khoá cả hàng địch.",
    passive: {
        name: "Song Giáp",
        desc: `Mỗi đòn đánh thường của địch trúng Braum cho ${p.p1} Song Giáp, cộng dồn vô hạn; mỗi Song Giáp tăng ${p.p2} Giáp và ${p.p2} Kháng phép. Mất một nửa Song Giáp khi Braum bị hạ.`,
    },
    bonusStats(g, me) {
        const n = g.stackOf(me,
            DUAL)
        return {
            armor: n * p.p2, mr: n * p.p2
        }
    },
    hooks: {
        onAttackHit(g, me, d) {
            if (d.target.id === me.id && d.attacker.side !== me.side) g.stack(me,
                DUAL,
                p.p1)
        },
        onMarkHit(g, me, d) {
            if (d.mark.id !== MARK || d.mark.src !== me.id) return
            // chính Braum đánh: dấu giữ nguyên (và hạn gốc) cho đồng đội, engine đã tiêu 1 nấc
            if (d.attacker.id === me.id) {
                g.addMark(d.target,
                    MARK,
                    me,
                    {
                        hits: 1
                    })
                const m = d.target.marks?.find((x) => x.id === MARK && x.src === me.id)
                if (m) m.until = d.mark.until
                return
            }
            // đồng minh khác Braum đánh trúng: Choáng, Braum nhận Song Giáp kể cả khi Choáng bị chặn
            const dur = g.f(me,
                F_MARK)
            if (dur > 0 && d.target.status === "board") g.timed(me,
                d.target,
                "stun",
                dur)
            g.stack(me,
                DUAL,
                p.p5)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Cú Đấm Băng", target: "enemy", mana: p.q0,
            desc: `Chọn 1 tướng địch; gây {${F_Q}} sát thương phép và đặt Dấu Băng trong ${p.q3} đơn vị. Đồng minh khác Braum đánh trúng nó thì tiêu dấu: nó bị Choáng {${F_MARK}} đơn vị và Braum nhận ${p.p5} Song Giáp.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (t.status === "board") c.g.addMark(t,
                    MARK,
                    c.self,
                    {
                        hits: 1, turns: p.q3, of: otherSide(c.side)
                    })
            },
        },
        E: {
            key: "E", name: "Đứng Sau Tôi", target: "none", mana: p.e0, quick: true, chainOnly: true,
            desc: `Quick, Chỉ Nối Chuỗi. Khi địch đánh hoặc dùng chiêu nhắm đúng 1 tướng mình khác (không phải cả phe), bạn có thể dùng lá này: huỷ mọi tác động của nó lên tướng đó; Braum nhận thay ${p.e5}% sát thương, nhận ${p.e4} Song Giáp và {${F_E}} Khiên.`,
            quickWhen(c) {
                const t = c.g.unit(c.trigger.target)
                return (c.trigger.kind === "attack" || c.trigger.kind === "skill") && when.targetsOtherAlly(c) && !t?.token
            },
            resolve(c) {
                const ally = c.trigger?.target
                if (!ally) return
                c.g.chainFx().intercept = {
                    from: ally, by: c.self.id, pct: p.e5 / 100
                }
                c.g.stack(c.self,
                    DUAL,
                    p.e4)
                c.g.shield(c.self,
                    c.self,
                    c.f(F_E))
            },
        },
        R: {
            key: "R", name: "Khe Băng", target: "all_enemies", mana: p.r0,
            desc: `Mọi tướng địch nhận {${F_R}} sát thương phép. Địch đối diện Braum bị Choáng {${F_R_MAIN}} đơn vị, các địch còn lại bị Choáng {${F_R_REST}} đơn vị.`,
            resolve(c) {
                const g = c.g
                const opp = g.opposite(c.self)
                const dmg = c.f(F_R), dMain = c.f(F_R_MAIN), dRest = c.f(F_R_REST)
                for (const t of g.heroes(otherSide(c.side))) {
                    g.damage(c.self,
                        t,
                        dmg,
                        "magic",
                        {
                            tag: "skill"
                        })
                    const d = t.id === opp?.id ? dMain : dRest
                    if (d > 0 && t.status === "board") g.timed(c.self,
                        t,
                        "stun",
                        d)
                }
            },
        },
    },
    en: {
        desc: "Shield of the Freljord: open fights with the Frost Mark, take hits for your allies, grow harder with every blow, then lock down the enemy line.",
        passive: {
            name: "Twin Armor",
            desc: `Each enemy attack that hits Braum gives ${p.p1} Twin Armor, stacking without limit; each Twin Armor adds ${p.p2} Armor and ${p.p2} MR. Half of the Twin Armor is lost when Braum is taken down.`,
        },
        skills: {
            Q: {
                name: "Winter's Bite",
                desc: `Choose 1 enemy champion; deal {${EN_Q}} magic damage and place a Frost Mark for ${p.q3} units. When an ally other than Braum hits it, the mark is consumed: it is Stunned for {${EN_MARK}} units and Braum gains ${p.p5} Twin Armor.`,
            },
            E: {
                name: "Stand Behind Me",
                desc: `Quick, Chain Only. When the enemy attacks or casts a skill at exactly 1 allied champion other than Braum (not the whole team), you may play this card: cancel every effect it has on that champion; Braum takes ${p.e5}% of the damage instead, gains ${p.e4} Twin Armor and {${EN_E}} Shield.`,
            },
            R: {
                name: "Glacial Fissure",
                desc: `Every enemy champion takes {${EN_R}} magic damage. The enemy opposite Braum is Stunned for {${EN_R_MAIN}} units, the other enemies are Stunned for {${EN_R_REST}} units.`,
            },
        },
    },
})
