// Renata Glasc (Trợ thủ, phép): máu 780 · AD 56 · giáp/kháng 28/32. Một mục đích: LẬT KÈO (đội đang thua là lúc nguy hiểm nhất).
// R "Thâu Tóm": mọi tướng địch trên sân nổi điên, mỗi tướng đánh thường 1 đồng đội của chính nó (ưu tiên đường kề, rồi ít máu nhất)
// bằng đòn đánh đầy đủ của chính nó (theo vai, đồ, chí mạng, hút máu).
// Nội tại Cứu Trợ (hook onLethal): đồng minh sắp bị hạ thì còn 1 máu + status "bailout" (hiện trên tướng, không chết được) tới hết lượt
// kế tiếp của bạn; hạ gục được 1 tướng địch trong lúc đó thì gỡ status và sống tiếp, không thì cuối lượt đó bị hạ.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    otherSide, type Unit
} from "../types"

const F_Q = "60 + 40% AP"
const F_E = "40 + 30% AP"
const MISSING_PCT = 0.2
const BERSERK = "berserk"
const BAIL = "bailout"

/** Đồng đội mà tướng nổi điên `u` sẽ đánh: tướng kề đường trước, rồi ít máu nhất; không còn ai thì tự đánh mình */
function victimOf(g: Game, u: Unit): Unit {
    const mates = g.board(u.side).filter((x) => x.id !== u.id)
    const adj = mates.filter((x) => !x.token && Math.abs(x.lane - u.lane) === 1)
    return g.lowestHp(adj.length ? adj : mates) ?? u
}

export default defineHero({
    id: "renata", name: "Renata Glasc", role: "support", damage: "magic", hp: 610, atk: 49, armor: 28, mr: 32,
    skillCopies: {
        Q: 5, E: 4, R: 1
    },
    desc: "Nữ tài phiệt Zaun, chuyên lật kèo: đồng minh sắp chết vẫn đứng dậy đánh thêm một lượt, càng gần chết càng mạnh, và Thâu Tóm biến sức mạnh của đội địch thành vũ khí chống lại chính họ.",
    passive: {
        name: "Cứu Trợ",
        desc: "Khi một tướng mình (khác Renata) sắp bị hạ, nó còn 1 máu và nhận **Cứu Trợ**: không thể bị hạ tới hết lượt kế tiếp của bạn. Nếu trong lúc đó nó hạ gục được 1 tướng địch thì Cứu Trợ biến mất và nó sống tiếp; nếu không, cuối lượt đó nó bị hạ.",
    },
    hooks: {
        onLethal(g, me, d) {
            const t = d.target
            if (t.side !== me.side || t.id === me.id || t.token) return
            if (!g.has(t,
                BAIL)) g.status(t,
                BAIL,
                1,
                {
                    until: g.turnsUntil(me.side,
                        g.s.active === me.side ? 2 : 1)
                })
            if (g.has(t,
                BAIL)) t.hp = 1
        },
        onKill(g, me, d) {
            if (d.killer.side === me.side && d.victim.side !== me.side && g.has(d.killer,
                BAIL)) g.removeStatus(d.killer,
                BAIL)
        },
        onTurnEnd(g, me, d) {
            if (d.side !== me.side) return
            for (const u of g.heroes(me.side)) if (g.has(u,
                BAIL) && u.statuses[BAIL].until <= g.s.turnNo) { g.removeStatus(u,
                BAIL); g.kill(u) }
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Bắt Tay", target: "enemy",
            desc: `Kéo 1 tướng địch về đối diện Renata, gây {${F_Q}} sát thương phép và Choáng 1 lượt. **Điều kiện:** đội bạn còn **ít mạng hơn** đội địch thì cướp thêm 1 lá ngẫu nhiên trên tay đối thủ.`,
            resolve(c) {
                const t = c.target!
                const foe = otherSide(c.side)
                const behind = c.g.player(c.side).lives < c.g.player(foe).lives
                if (!t.token) c.g.moveTo(t,
                    c.self.lane)
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (t.status === "board") c.g.status(t,
                    "stun",
                    1)
                if (behind) c.g.stealCard(c.side,
                    foe)
            },
        },
        E: {
            key: "E", name: "Gói Cứu Trợ", target: "ally",
            desc: `1 tướng mình nhận Khiên {${F_E}} + ${MISSING_PCT * 100}% máu nó đã mất, và +20% sát thương tới hết lượt đối thủ: càng gần chết càng mạnh. **Điều kiện:** tướng đó dưới 40% máu (hoặc đang Cứu Trợ) thì đòn đánh kế tiếp của nó không cần lá Đánh thường.`,
            resolve(c) {
                const t = c.target!
                c.g.shield(c.self,
                    t,
                    c.f(F_E) + MISSING_PCT * (t.maxHp - t.hp))
                c.g.status(t,
                    "empower",
                    1,
                    {
                        of: otherSide(c.side)
                    })
                if ((c.g.hpPct(t) < 0.4 || c.g.has(t,
                    BAIL)) && !t.nextAttack.some((b) => b.free)) t.nextAttack.push({
                    id: "renata_e", source: c.self.id, free: true
                })
            },
        },
        R: {
            key: "R", name: "Thâu Tóm", target: "all_enemies",
            desc: "Mọi tướng địch trên sân **nổi điên**: lần lượt mỗi tướng tung đòn đánh thường đầy đủ của nó (theo vai, đồ, chí mạng, hút máu) vào một đồng đội của chính nó (ưu tiên đường kề, rồi ít máu nhất; đứng một mình thì tự đánh mình): địch càng mạnh càng tự hại. **Điều kiện:** đội bạn còn **ít mạng hơn** đội địch thì mỗi tướng đánh 2 lần.",
            resolve(c) {
                const foe = otherSide(c.side)
                const times = c.g.player(c.side).lives < c.g.player(foe).lives ? 2 : 1
                for (const u of c.g.heroes(foe)) {
                    if (u.status !== "board") continue
                    c.g.status(u,
                        BERSERK,
                        1)
                    for (let i = 0; i < times && u.status === "board" && c.g.s.phase !== "over"; i++) {
                        const v = victimOf(c.g,
                            u)
                        if (v.status !== "board") break
                        c.g.attack(u,
                            v,
                            {
                                free: true
                            })
                    }
                }
            },
        },
    },
})
