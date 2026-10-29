// Janna (Trợ thủ): máu 330 · AD 52 · giáp/kháng 25/30.
// CHẤT: "Địch đánh vào là hụt": ngăn đòn đánh, không gây sát thương.
// Nội tại: đầu lượt bạn, đồng minh ít máu nhất nhận Khiên nhỏ. Q (Quick): huỷ 1 đòn đánh của địch. E (Quick): Khiên + miễn khống chế khi còn Khiên.
// R (Quick): tới hết lượt địch mọi đòn lên đội mình −50%, hết lượt cả đội hồi bằng lượng đã chặn.
// Cơ chế engine dùng: hook onTurnStart, g.chainFx().cancel, hook onBeforeStatus, HeroDef.modifyDamage + hook onDamage/onTurnEnd.
import {
    pct
} from "../formula"
import {
    defineHero
} from "../registry"
import {
    FOREVER, otherSide
} from "../types"

const WARD = "janna_ward"
const GALE = "janna_gale"
const BLOCKED = "janna_blk"
const CC = ["stun",
    "silence",
    "disarm",
    "taunt"]
const R_CUT = 0.5
const F_PASSIVE = "24 + 25% AD"
const F_E = "70 + 55% AD"

export default defineHero({
    id: "janna", name: "Janna", role: "support", damage: "magic", hp: 300, atk: 66, armor: 28, mr: 30,
    bot: {
        buffValue: {
            janna_gale: 80, janna_ward: 30,
        },
    },
    desc: "Hiện Thân Bão Tố: đòn đánh của địch vào đội mình là hụt, khống chế không bám được vào tướng còn Khiên, và Bão Tố chắn cả lượt địch.",
    passive: {
        name: "Mắt Gió",
        desc: `Đầu lượt của bạn: tướng mình có máu thấp nhất nhận Khiên {${F_PASSIVE}}.`,
    },
    modifyDamage(g, me, d) {
        if (g.has(me,
            GALE) && d.target.side === me.side && d.src && d.src.side !== me.side) return 1 - R_CUT
        return 1
    },
    hooks: {
        onTurnStart(g, me, d) {
            if (d.side !== me.side) return
            const t = g.lowestHp(g.heroes(me.side))
            if (t) g.shield(me,
                t,
                g.f(me,
                    F_PASSIVE))
        },
        onBeforeStatus(g, me, d) {
            const u = d.unit
            if (u.side === me.side && CC.includes(d.id) && g.has(u,
                WARD) && u.shield > 0) d.cancel = true
        },
        onDamage(g, me, d) {
            const t = d.target
            if (t.side !== me.side) return
            if (g.has(t,
                WARD) && t.shield <= 0) g.removeStatus(t,
                WARD)
            if (g.has(me,
                GALE) && d.src && d.src.side !== me.side) g.setStack(me,
                BLOCKED,
                g.stackOf(me,
                    BLOCKED) + d.amount)
        },
        onTurnEnd(g, me, d) {
            if (d.side === me.side || !g.has(me,
                GALE)) return
            const n = g.stackOf(me,
                BLOCKED)
            g.setStack(me,
                BLOCKED,
                0)
            if (n > 0) for (const u of g.heroes(me.side)) g.heal(me,
                u,
                n)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Gió Lốc", target: "none", quick: true, chainOnly: true,
            desc: "Quick, Chỉ Nối Chuỗi. Khi địch đánh lá Đánh thường hoặc đòn đánh lên tướng mình: Vô Hiệu đòn đó.",
            quickWhen: (c) => c.trigger.side !== c.side && !!c.trigger.target && (!c.trigger.card || c.trigger.card.id === "basic"),
            resolve(c) {
                c.g.chainFx().cancel = true
            },
        },
        E: {
            key: "E", name: "Mắt Bão", target: "ally", quick: true,
            desc: `Quick. Chọn 1 tướng mình; nó nhận Khiên {${F_E}}. Khi còn Khiên đó: nó miễn Khống Chế.`,
            resolve(c) {
                const t = c.target!
                c.g.shield(c.self,
                    t,
                    c.f(F_E))
                c.g.status(t,
                    WARD,
                    1,
                    {
                        until: FOREVER
                    })
            },
        },
        R: {
            key: "R", name: "Gió Mùa", target: "none", quick: true,
            desc: `Quick. Tới hết lượt của đối thủ: mọi đòn lên đội mình −${pct(R_CUT)}% sát thương. Cuối lượt đó, mọi tướng mình hồi máu bằng lượng đã chặn.`,
            quickWhen: (c) => c.trigger.side !== c.side,
            resolve(c) {
                c.g.setStack(c.self,
                    BLOCKED,
                    0)
                c.g.status(c.self,
                    GALE,
                    1,
                    {
                        of: otherSide(c.side)
                    })
            },
        },
    },
})
