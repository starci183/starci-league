// Janna (Trợ thủ, phép): bộ chiêu chốt 31/10 - 01/11/2026 (docs/heroes/KITS.md). Số ở balance/heroes/janna.json.
// P Hộ Phong: Khiên phe nhận được đổi thành Gió Thuận (Khiên mới mạnh hơn, tướng còn Khiên đánh nhanh hơn).
// Q Gió Lốc đánh theo tổng Khiên, E Mắt Bão (Quick) Khiên + AD/AP theo Khiên, R Gió Mùa (Quick khi chiêu địch nhắm nhiều tướng mình, hoặc dùng chủ động).
import {
    kit, lockedAlly, when
} from "../balance"
import {
    pct
} from "../formula"
import {
    defineHero
} from "../registry"
import {
    FOREVER
} from "../types"

const k = kit("janna"), { p } = k
/** Gió Thuận (trên Janna): mất một nửa khi Janna chết */
export const WIND = "janna_wind"
/** Mắt Bão (trên tướng nhận E): status v = hệ số, engine cộng AD/AP = hệ số × Khiên đang có (g.stats "shield_power") */
export const EYE = "shield_power"
/** Khiên phe nhận được chưa đủ X (kỹ thuật, không hiện) */
const ACC = "tc:janna_shield"

const F_Q = k.x("q1 + q2·AP"), EN_Q = k.xe("q1 + q2·AP")
const F_STUN = k.x("q4 + q5·AP"), EN_STUN = k.xe("q4 + q5·AP")
const F_E = k.x("e1 + e2·AP"), EN_E = k.xe("e1 + e2·AP")
const F_R = k.x("r1 + r2·AP"), EN_R = k.xe("r1 + r2·AP")

export default defineHero({
    id: "janna", name: "Janna", role: "support", damage: "magic", ...k.base,
    deathHalf: [WIND],
    // Mắt Bão tắt khi Khiên vỡ, kể cả khi Janna đã ngã
    offBoardHooks: ["onShieldBreak"],
    desc: "Hộ Phong: Khiên của cả đội dày dần, tướng còn Khiên đánh nhanh; Q lấy Khiên làm sát thương, E cho Khiên và sức mạnh theo Khiên, R che cả đội lúc chiêu địch quét nhiều người.",
    passive: {
        name: "Hộ Phong",
        desc: `Mỗi khi các tướng phe bạn nhận tổng ${p.p1} Khiên, Janna nhận 1 Gió Thuận, cộng dồn vô hạn. Mỗi Gió Thuận: Khiên mới của tướng mình tăng ${pct(p.p2)}%, và tướng mình còn Khiên tăng ${p.p3}% Tốc Đánh. Khi Janna bị hạ, mất một nửa số Gió Thuận.`,
    },
    shieldGivenMult(g, owner, _source, target) {
        return target.side === owner.side && !target.token ? 1 + p.p2 * g.stackOf(owner,
            WIND) : 1
    },
    attackSpeedAura(g, me, u) {
        if (u.side !== me.side || u.token || g.totalShield(u) <= 0) return 0
        // chỉ một Janna cộng cho mỗi phe
        if (g.heroes(me.side).find((x) => x.hero === "janna")?.id !== me.id) return 0
        return p.p3 * g.stackOf(me,
            WIND)
    },
    hooks: {
        onShield(g, me, d) {
            if (d.target.side !== me.side || d.target.token || d.amount <= 0) return
            const acc = g.stackOf(me,
                ACC) + d.amount
            const n = Math.floor(acc / p.p1)
            g.setStack(me,
                ACC,
                acc - n * p.p1)
            if (n > 0) g.stack(me,
                WIND,
                n)
        },
        onShieldBreak(g, _me, d) {
            if (g.has(d.target,
                EYE)) g.removeStatus(d.target,
                EYE)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Gió Lốc", target: "enemy", mana: p.q0,
            desc: `Chọn 1 tướng địch; gây {${F_Q}} + ${pct(p.q3)}% tổng Khiên phe bạn sát thương phép, rồi Choáng {${F_STUN}} đơn vị.`,
            resolve(c) {
                const g = c.g, me = c.self, t = c.target!
                let shields = 0
                for (const u of g.heroes(c.side)) shields += g.totalShield(u)
                g.damage(me,
                    t,
                    c.f(F_Q) + p.q3 * shields,
                    "magic",
                    {
                        tag: "skill"
                    })
                if (t.status === "board") g.timed(me,
                    t,
                    "stun",
                    c.f(F_STUN))
            },
        },
        E: {
            key: "E", name: "Mắt Bão", target: "ally", mana: p.e0, quick: true,
            quickWhen: when.targetsAlly,
            options: (c) => lockedAlly(c),
            desc: `Quick. Khi địch nhắm đúng 1 tướng mình, bạn có thể dùng lá này; mục tiêu là tướng đó (dùng chủ động thì chọn 1 tướng mình). Nó nhận {${F_E}} Khiên và Mắt Bão trong khi còn Khiên: tăng AD và AP bằng ${pct(p.e3)}% Khiên đang có.`,
            resolve(c) {
                const t = c.target!
                c.g.shield(c.self,
                    t,
                    c.f(F_E))
                if (c.g.totalShield(t) > 0) c.g.status(t,
                    EYE,
                    1,
                    {
                        v: p.e3, until: FOREVER
                    })
            },
        },
        R: {
            key: "R", name: "Gió Mùa", target: "all_allies", mana: p.r0, quick: true,
            quickWhen: when.multi,
            desc: `Quick. Khi địch dùng lá chiêu nhắm nhiều tướng mình hoặc cả phe, bạn có thể dùng lá này; cũng dùng chủ động được. Mọi tướng mình nhận {${F_R}} Khiên, rồi hồi Máu bằng ${pct(p.r3)}% lượng Khiên đó.`,
            resolve(c) {
                const amount = c.f(F_R)
                for (const u of c.g.heroes(c.side)) {
                    c.g.shield(c.self,
                        u,
                        amount)
                    c.g.heal(c.self,
                        u,
                        amount * p.r3)
                }
            },
        },
    },
    en: {
        desc: "Tailwind: team Shields grow thicker and shielded champions attack faster; Q turns Shield into damage, E gives a Shield and power from Shield, R covers the whole team when an enemy skill sweeps several of them.",
        passive: {
            name: "Tailwind",
            desc: `Each time your champions receive a total of ${p.p1} Shield, Janna gains 1 Tailwind, stacking without limit. Each Tailwind: new Shields on your champions are ${pct(p.p2)}% bigger, and your champions that still have a Shield gain ${p.p3} Attack Speed. When Janna is taken down she loses half her Tailwind.`,
        },
        skills: {
            Q: {
                name: "Howling Gale",
                desc: `Choose 1 enemy champion; deal {${EN_Q}} + ${pct(p.q3)}% of your team's total Shield as magic damage, then Stun it for {${EN_STUN}} units.`,
            },
            E: {
                name: "Eye of the Storm",
                desc: `Quick. When an enemy targets exactly 1 of your champions, you may play this card; the target is that champion (played proactively, choose 1 of your champions). It gains {${EN_E}} Shield and Eye of the Storm while it has a Shield: AD and AP increased by ${pct(p.e3)}% of its current Shield.`,
            },
            R: {
                name: "Monsoon",
                desc: `Quick. When an enemy plays a skill card that targets several of your champions or the whole team, you may play this card; it can also be played proactively. Every ally gains {${EN_R}} Shield, then heals HP equal to ${pct(p.r3)}% of that Shield.`,
            },
        },
    },
})
