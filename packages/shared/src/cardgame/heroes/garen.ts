// Garen (Đấu sĩ, vật lý): "Kiên cường Demacia". Thầy chốt 2026-11-16: mạnh nhất lúc đấu tay đôi đầu trận và khi không đeo đồ.
// P cộng chút Máu tối đa (thêm theo ô đồ trống) và chút sát thương Q/E theo số đường địch đang trống. Q chém đối diện + Câm Lặng,
// E chém đối diện (đường kề nhận một phần) rồi hồi máu theo tổng sát thương, R sát thương chuẩn theo % Máu tối đa mục tiêu, gấp đôi
// khi mục tiêu đứng cùng đường. Số liệu: balance/heroes/garen.json. Đấu sĩ nên Q, E scale AD và Máu tối đa.
// Engine dùng: g.setAuraMaxHp (Máu nội tại), quickWhen targetsSelf (E).
import {
    kit, when
} from "../balance"
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    RULES, otherSide, type Unit
} from "../types"

const k = kit("garen"), { p } = k
const HP_AURA = "garen_hp"
const LANES = 5
const pct = (v: number) => `${Math.round(v * 1000) / 10}%`
const F_Q = k.x("q1 + q2·AD + q3·Máu tối đa"), EN_Q = k.xe("q1 + q2·AD + q3·Máu tối đa")
const F_E = k.x("e1 + e2·AD + e3·Máu tối đa"), EN_E = k.xe("e1 + e2·AD + e3·Máu tối đa")
const F_R = k.x("r1 + r2·Máu tối đa mục tiêu"), EN_R = k.xe("r1 + r2·Máu tối đa mục tiêu")

/** Số ô đồ còn trống của Garen */
const freeSlots = (me: Unit) => Math.max(0,
    RULES.itemSlots - me.items.length)
/** Máu tối đa cộng thêm từ Kiên Cường: (p1 + p2·ô trống) × Máu gốc */
const syncHp = (g: Game, me: Unit) => g.setAuraMaxHp(me,
    HP_AURA,
    (p.p1 + p.p2 * freeSlots(me)) * k.base.hp)
/** Hệ số sát thương Q/E: +p3 cho mỗi đường địch không có tướng (token không tính) */
export const garenAmp = (g: Game, me: Unit) => 1 + p.p3 * Math.max(0,
    LANES - g.heroes(otherSide(me.side)).length)

export default defineHero({
    id: "garen", name: "Garen", role: "fighter", damage: "physical", ...k.base,
    bot: k.bot,
    desc: "Mạnh nhất khi đấu tay đôi và không cần đồ: chém đối diện, Câm Lặng, hồi máu bằng Phán Xét và kết liễu bằng sát thương chuẩn.",
    passive: {
        name: "Kiên Cường",
        desc: `Garen có thêm ${pct(p.p1)} Máu tối đa, cộng ${pct(p.p2)} cho mỗi ô đồ còn trống. Q và E gây thêm ${pct(p.p3)} sát thương cho mỗi đường địch không có tướng.`,
    },
    hooks: {
        onSummon(g, me, d) { if (d.unit.id === me.id) syncHp(g,
            me) },
        onRespawn(g, me, d) { if (d.unit.id === me.id) syncHp(g,
            me) },
        onEquip(g, me, d) { if (d.unit.id === me.id) syncHp(g,
            me) },
        onUnequip(g, me, d) { if (d.unit.id === me.id) syncHp(g,
            me) },
        onTurnStart(g, me) { syncHp(g,
            me) },
    },
    skills: {
        Q: {
            key: "Q", name: "Đòn Quyết Định", target: "opposite", mana: p.q0,
            desc: `Gây {${F_Q}} sát thương vật lý lên tướng đối diện và Câm Lặng nó ${p.q4} đơn vị.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q) * garenAmp(c.g,
                        c.self),
                    "physical",
                    {
                        tag: "skill"
                    })
                if (t.status === "board") c.g.timed(c.self,
                    t,
                    "silence",
                    p.q4)
            },
        },
        E: {
            key: "E", name: "Phán Xét", target: "none", mana: p.e0, quick: true,
            quickWhen: when.targetsSelf,
            desc: `Quick. Khi địch nhắm đúng Garen, bạn có thể dùng lá này (dùng chủ động cũng được): tướng địch đối diện nhận {${F_E}} sát thương vật lý, tướng ở 2 đường kề nhận ${pct(p.e4)} mức đó. Garen hồi Máu bằng ${pct(p.e5)} tổng sát thương đã gây.`,
            resolve(c) {
                const g = c.g
                const full = c.f(F_E) * garenAmp(g,
                    c.self)
                const foe = otherSide(c.side)
                let total = 0
                for (const lane of [c.self.lane,
                    c.self.lane - 1,
                    c.self.lane + 1]) {
                    const t = lane >= 0 && lane < LANES ? g.at(foe,
                        lane) : undefined
                    if (t && !t.token) total += g.damage(c.self,
                        t,
                        lane === c.self.lane ? full : full * p.e4,
                        "physical",
                        {
                            tag: "skill"
                        })
                }
                if (total > 0 && c.self.status === "board") g.heal(c.self,
                    c.self,
                    total * p.e5)
            },
        },
        R: {
            key: "R", name: "Công Lý Demacia", target: "enemy", mana: p.r0,
            desc: `Chọn 1 tướng địch ở bất kỳ đường; gây {${F_R}} sát thương chuẩn. Nếu nó đứng cùng đường với Garen, sát thương tăng ${pct(p.r3)}.`,
            resolve(c) {
                const t = c.target!
                const same = t.lane === c.self.lane ? 1 + p.r3 : 1
                c.g.damage(c.self,
                    t,
                    c.g.f(c.self,
                        F_R,
                        t) * same,
                    "true",
                    {
                        tag: "skill"
                    })
            },
        },
    },
    en: {
        desc: "Strongest in a one-on-one and with no items: strikes the enemy opposite, Silences, heals with Judgment and finishes with true damage.",
        passive: {
            name: "Perseverance",
            desc: `Garen has ${pct(p.p1)} bonus max HP, plus ${pct(p.p2)} for each empty item slot. Q and E deal ${pct(p.p3)} more damage for each enemy lane without a champion.`,
        },
        skills: {
            Q: {
                name: "Decisive Strike",
                desc: `Deal {${EN_Q}} physical damage to the champion opposite and Silence it for ${p.q4} units.`,
            },
            E: {
                name: "Judgment",
                desc: `Quick. When the enemy targets exactly Garen, you may play this card (it can also be played proactively): the enemy opposite takes {${EN_E}} physical damage and the champions in the 2 adjacent lanes take ${pct(p.e4)} of that. Garen heals ${pct(p.e5)} of the total damage dealt.`,
            },
            R: {
                name: "Demacian Justice",
                desc: `Choose 1 enemy champion in any lane; deal {${EN_R}} true damage. If it stands in Garen's lane, the damage is increased by ${pct(p.r3)}.`,
            },
        },
    },
})
