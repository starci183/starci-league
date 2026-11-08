// Jayce (Đấu sĩ/Xạ thủ, vật lý): Người Bảo Hộ Piltover. Mọi con số nằm trong balance/heroes/jayce.json (docs/heroes/KITS.md).
// Dạng ở stack jayce_form (0 Búa, 1 Pháo), chọn khi gọi như Jinx. HeroDef.roleOf trả vai theo dạng nên g.role(u) đổi theo:
// Búa là fighter (đánh đối diện, có đòn không cần lá), Pháo là marksman (đánh mọi đường, không có đòn không cần lá).
// Q, E chỉ có một loại lá: SkillDef.variant đổi tên và chữ theo dạng, resolve đọc dạng từ card.data.form (Sylas đoạt) hoặc từ người dùng.
import {
    kit
} from "../balance"
import {
    skillArgs
} from "../engine"
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    Card, PlayArgs, Unit
} from "../types"
import {
    otherSide
} from "../types"

const k = kit("jayce"), { p } = k
export const FORM = "jayce_form"
export const FORM_HAMMER = 0
export const FORM_CANNON = 1
/** Tăng Lực: đòn đánh kế tiếp sau khi đổi dạng */
export const CHARGE = "jayce_charge"
/** Gia Tốc: Pháo E tích, không trần; cho Tốc Đánh và cộng sát thương Q, R Pháo. Ở Búa giữ nguyên nhưng không tính, chết mất một nửa */
export const GATE = "jayce_gate"
const SWAP = "jayce_swap"

const F_CHARGE = k.x("p1 + p2·AD"), EN_CHARGE = k.xe("p1 + p2·AD")
const F_HEAL = k.x("p8·Máu tối đa"), EN_HEAL = k.xe("p8·Máu tối đa")
const F_QH = k.x("q1 + q2·AD + q3·Máu tối đa"), EN_QH = k.xe("q1 + q2·AD + q3·Máu tối đa")
const F_QC = k.x("q4 + q5·AD"), EN_QC = k.xe("q4 + q5·AD")
const F_EH = k.x("e1 + e2·AD + e3% máu tối đa mục tiêu"), EN_EH = k.xe("e1 + e2·AD + e3% máu tối đa mục tiêu")
const F_EHEAL = k.x("e9·Máu đã mất"), EN_EHEAL = k.xe("e9·Máu đã mất")

const F_RH = k.x("r1 + r2·AD + r3·Máu tối đa"), EN_RH = k.xe("r1 + r2·AD + r3·Máu tối đa")
const F_RC = k.x("r5 + r6·AD + r7% máu đã mất mục tiêu"), EN_RC = k.xe("r5 + r6·AD + r7% máu đã mất mục tiêu")

/** Dạng áp cho lá `card` của người dùng `u`: lá đoạt mang dạng lúc đoạt */
export const formOf = (u: Unit | undefined, card?: Card) => Number(card?.data?.form ?? u?.stacks[FORM] ?? FORM_HAMMER)

const QH = {
    vi: {
        name: "Chỉ Thiên!", desc: `Búa: chọn 1 tướng địch ở đường bất kỳ, hoán đổi sang đối diện nó, gây {${F_QH}} sát thương vật lý, hồi ${p.q7}% sát thương gây ra.`
    },
    en: {
        name: "To the Skies!", desc: `Hammer: choose 1 enemy champion in any lane, swap to face it and deal {${EN_QH}} physical damage, healing ${p.q7}% of the damage dealt.`
    },
}
const QC = {
    vi: {
        name: "Cầu Sấm", desc: `Pháo: 1 tướng địch ở đường bất kỳ nhận {${F_QC}} sát thương vật lý, thêm ${p.e6} mỗi Gia Tốc, 2 đường kề nhận ${p.q6}%.`
    },
    en: {
        name: "Shock Blast", desc: `Cannon: 1 enemy champion in any lane takes {${EN_QC}} physical damage, plus ${p.e6} per Gate, the 2 adjacent lanes take ${p.q6}%.`
    },
}
const EH = {
    vi: {
        name: "Lôi Phạt", desc: `Búa: tướng địch đối diện nhận {${F_EH}} sát thương vật lý, Choáng ${p.e4} đơn vị; Jayce hồi {${F_EHEAL}} Máu.`
    },
    en: {
        name: "Thundering Blow", desc: `Hammer: the opposite enemy takes {${EN_EH}} physical damage and is Stunned for ${p.e4} units; Jayce heals {${EN_EHEAL}} HP.`
    },
}
const EC = {
    vi: {
        name: "Cổng Tăng Tốc", desc: `Pháo: Jayce nhận 1 Gia Tốc, không trần, không hết hạn. Mỗi Gia Tốc cho Jayce ${p.e5}% Tốc Đánh và cộng sát thương cho Q, R Pháo. Chỉ tính ở dạng Pháo; ở Búa vẫn giữ nhưng không có tác dụng. Jayce bị hạ thì mất một nửa.`
    },
    en: {
        name: "Acceleration Gate", desc: `Cannon: Jayce gains 1 Gate, no cap and no expiry. Each Gate gives Jayce ${p.e5}% attack speed and adds damage to Cannon Q and R. It only counts in Cannon form; Hammer keeps it without effect. Being taken down loses half.`
    },
}

const RH = {
    vi: {
        name: "Sấm Chớp Rền Vang", desc: `Búa: tướng địch đối diện và 2 đường kề nhận {${F_RH}} sát thương vật lý, đối diện chịu ${p.r4}%; Jayce hồi ${p.r9}% tổng sát thương gây ra.`
    },
    en: {
        name: "Lightning Field", desc: `Hammer: the opposite enemy and the 2 adjacent lanes take {${EN_RH}} physical damage, the opposite enemy takes ${p.r4}%; Jayce heals ${p.r9}% of the total damage dealt.`
    },
}
const RC = {
    vi: {
        name: "Tích Tụ", desc: `Pháo: 1 tướng địch ở đường bất kỳ nhận {${F_RC}} sát thương vật lý, thêm ${p.e7} mỗi Gia Tốc, xuyên ${p.r8} Giáp.`
    },
    en: {
        name: "Hyper Charge", desc: `Cannon: 1 enemy champion in any lane takes {${EN_RC}} physical damage, plus ${p.e7} per Gate, ignoring ${p.r8} Armor.`
    },
}
/** Địch đứng ở đường đối diện và 2 đường kề, chọn được */
function lanesHit(g: Game, me: Unit) {
    const out: Unit[] = []
    for (const l of [me.lane - 1,
        me.lane,
        me.lane + 1]) {
        const t = l >= 0 && l <= 4 ? g.at(otherSide(me.side),
            l) : undefined
        if (t && !t.token && g.targetable(t)) out.push(t)
    }
    return out
}
/** Bot: Búa cần địch đối diện, Pháo mạnh khi không có */
const swapValue = (g: Game, me: Unit) => (g.stackOf(me,
    GATE) === 0 && (formOf(me) === FORM_HAMMER) === !g.opposite(me) ? p.b1 : 0)

/** Đặt dạng; chỉ số đồ đổi theo dạng nên Máu tối đa đi theo phần chênh của Máu từ đồ */
function setForm(g: Game, me: Unit, form: number) {
    const before = g.stats(me).hp
    g.setStack(me,
        FORM,
        form)
    const dh = g.stats(me).hp - before
    me.maxHp += dh
    me.hp = Math.max(1,
        Math.min(me.maxHp,
            me.hp + dh))
}
/** Sau mỗi lần đổi dạng: đòn kế thêm p1 + p2·AD, không cộng dồn */
function shift(g: Game, me: Unit) {
    setForm(g,
        me,
        formOf(me) === FORM_HAMMER ? FORM_CANNON : FORM_HAMMER)
    g.setStack(me,
        CHARGE,
        1)
}
const stolenForm = (t: Unit) => ({
    form: formOf(t)
})

export default defineHero({
    id: "jayce", name: "Jayce", role: "fighter", damage: "physical", ...k.base,
    deathHalf: [GATE],
    attackSpeedAura(g, me, u) {
        return u.id === me.id && formOf(me) === FORM_CANNON ? p.e5 * g.stackOf(me,
            GATE) : 0
    },
    itemConvert(_g, me, out) {
        if (formOf(me) === FORM_HAMMER) {
            out.hp += p.p3 * out.attackSpeed + p.p4 * 100 * out.crit
            out.attackSpeed = 0
            out.crit = 0
            return
        }
        out.atk += p.p5 * out.hp + p.p6 * out.armor + p.p7 * out.mr
        out.hp = 0
        out.armor = 0
        out.mr = 0
    },
    roleOf: (u) => (formOf(u) === FORM_CANNON ? "marksman" : "fighter"),
    abilities: [{
        id: SWAP, name: "Đổi Dạng", nameEn: "Transform", standby: true, botValue: swapValue,
        desc: "Nội tại · Đổi dạng. Chỉ ở Standby, 1 lần mỗi lượt: đổi dạng, nhận Tăng Lực.",
        descEn: "Passive · Change form. Standby only, once per turn: change form and gain Charge.",
        options: (g, me) => (g.canAct(me) && me.stacks[`once:${SWAP}`] !== g.s.turnNo ? [{
        }] : []),
        resolve(g, me) {
            if (g.oncePerTurn(me,
                SWAP)) shift(g,
                me)
        },
    }],
    summonModes: ["hammer",
        "cannon"],
    bot: {
        ...k.bot,
        modeValue: (g, side, lane, mode) => (mode === "cannon" ? p.b2 : g.at(side === "A" ? "B" : "A",
            lane) ? p.b3 : p.b4),
    },
    desc: "Tụ Điện Hextech: đổi giữa Búa cận chiến và Pháo tầm xa, mỗi lần đổi dạng đòn đánh kế mạnh hơn; Q, E đổi hẳn theo dạng, ở Pháo tích Gia Tốc để cuối trận cực mạnh.",
    passive: {
        name: "Tụ Điện Hextech",
        desc: `Chọn Búa hoặc Pháo khi gọi; nút Đổi Dạng dùng ở Standby. Búa: vai Đấu sĩ, đánh đối diện, có đòn không cần lá, mỗi đòn đánh trúng hồi {${F_HEAL}} Máu; Tốc Đánh và Chí Mạng từ đồ đổi thành Máu (${p.p3} Máu mỗi Tốc Đánh, ${p.p4} Máu mỗi 1% Chí Mạng). Pháo: vai Xạ thủ, đánh mọi đường, không có đòn không cần lá; Máu, Giáp, Kháng phép từ đồ đổi thành AD (${p.p5} AD mỗi Máu, ${p.p6} AD mỗi Giáp, ${p.p7} AD mỗi Kháng phép). Sau mỗi lần đổi dạng, đòn đánh kế thêm {${F_CHARGE}} sát thương vật lý. Mất Tăng Lực khi chết; dạng giữ nguyên qua hồi sinh.`,
    },
    hooks: {
        onSummon(g, me, d) {
            if (d.unit.id === me.id) setForm(g,
                me,
                d.mode === "cannon" ? FORM_CANNON : FORM_HAMMER)
        },
        onAttackHit(g, me, d) {
            if (d.attacker.id === me.id && !d.info.miss && formOf(me) === FORM_HAMMER) g.heal(me,
                me,
                g.f(me,
                    F_HEAL))
        },
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss || !g.stackOf(me,
                CHARGE)) return
            g.setStack(me,
                CHARGE,
                0)
            d.info.bonus.push({
                raw: g.f(me,
                    F_CHARGE), kind: "physical"
            })
        },
        onDeath(g, me, d) {
            if (d.victim.id === me.id && g.stackOf(me,
                CHARGE)) g.setStack(me,
                CHARGE,
                0)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Chỉ Thiên! / Cầu Sấm", target: "enemy", mana: p.q0,
            desc: `${QH.vi.desc} ${QC.vi.desc}`,
            variant: (u, card) => (formOf(u,
                card) === FORM_CANNON ? QC : QH),
            stealData: stolenForm,
            options: (c): PlayArgs[] => skillArgs(c.g,
                c.side,
                c.self,
                c.card,
                {
                    key: "Q", name: "", desc: "", target: "enemy", resolve() {}
                }).filter((a) => {
                const t = c.g.unit(a.target)
                return !!t && (formOf(c.self,
                    c.card) === FORM_CANNON || t.lane === c.self.lane || c.g.canFace(c.self,
                    t))
            }),
            resolve(c) {
                const g = c.g, me = c.self, t = c.target!
                if (formOf(me,
                    c.card) === FORM_CANNON) {
                    const raw = c.f(F_QC) + p.e6 * g.stackOf(me,
                        GATE)
                    const near = g.neighbors(t)
                    g.damage(me,
                        t,
                        raw,
                        "physical",
                        {
                            tag: "skill"
                        })
                    for (const o of near) g.damage(me,
                        o,
                        raw * p.q6 / 100,
                        "physical",
                        {
                            tag: "skill", aoe: true, via: t.id
                        })
                    return
                }
                if (t.lane !== me.lane && !g.faceEnemy(me,
                    t)) return
                const dealt = g.damage(me,
                    t,
                    c.f(F_QH),
                    "physical",
                    {
                        tag: "skill"
                    })
                g.heal(me,
                    me,
                    dealt * p.q7 / 100)
            },
        },
        E: {
            key: "E", name: "Lôi Phạt / Cổng Tăng Tốc", target: "none", mana: p.e0,
            desc: `${EH.vi.desc} ${EC.vi.desc}`,
            variant: (u, card) => (formOf(u,
                card) === FORM_CANNON ? EC : EH),
            stealData: stolenForm,
            canPlay: (c) => formOf(c.self,
                c.card) === FORM_CANNON || (() => { const o = c.g.opposite(c.self); return !!o && c.g.targetable(o) })(),
            aimsAt: (g, self, _args, card) => (formOf(self,
                card) === FORM_CANNON ? undefined : g.opposite(self)),
            resolve(c) {
                const g = c.g, me = c.self
                if (formOf(me,
                    c.card) === FORM_CANNON) {
                    if (me.hero === "jayce") g.stack(me,
                        GATE,
                        1)
                    else g.timed(me,
                        me,
                        "attack_speed",
                        p.e8,
                        {
                            v: p.e5
                        }) // Sylas đoạt: không có Gia Tốc, nhận Tốc Đánh ngắn hạn
                    return
                }
                const t = g.opposite(me)
                if (!t || !g.targetable(t)) return
                g.damage(me,
                    t,
                    g.f(me,
                        F_EH,
                        t),
                    "physical",
                    {
                        tag: "skill"
                    })
                if (t.status === "board") g.timed(me,
                    t,
                    "stun",
                    p.e4)
                g.heal(me,
                    me,
                    g.f(me,
                        F_EHEAL))
            },
        },
        R: {
            key: "R", name: "Sấm Chớp Rền Vang / Tích Tụ", target: "none", mana: p.r0,
            desc: `${RH.vi.desc} ${RC.vi.desc}`,
            variant: (u, card) => (formOf(u,
                card) === FORM_CANNON ? RC : RH),
            stealData: stolenForm,
            options: (c): PlayArgs[] => (formOf(c.self,
                c.card) === FORM_CANNON ? c.g.targetableEnemies(c.self).filter((u) => !u.token).map((u) => ({
                    target: u.id
                })) : lanesHit(c.g,
                    c.self).length ? [{
                    }] : []),
            resolve(c) {
                const g = c.g, me = c.self
                if (formOf(me,
                    c.card) === FORM_CANNON) {
                    const t = c.target
                    if (t) g.damage(me,
                        t,
                        g.f(me,
                            F_RC,
                            t) + p.e7 * g.stackOf(me,
                            GATE),
                        "physical",
                        {
                            tag: "skill", armorPen: p.r8
                        })
                    return
                }
                const raw = c.f(F_RH)
                let total = 0
                for (const t of lanesHit(g,
                    me)) total += g.damage(me,
                    t,
                    t.lane === me.lane ? raw * p.r4 / 100 : raw,
                    "physical",
                    {
                        tag: "skill", aoe: true
                    })
                g.heal(me,
                    me,
                    total * p.r9 / 100)
            },
        },
    },
    en: {
        desc: "Mercury Weapon: swaps between a melee Hammer and a ranged Cannon, every swap charges his next attack; Q and E change completely with the form, and Cannon stacks Gate into a late-game carry.",
        passive: {
            name: "Hextech Capacitor",
            desc: `Choose Hammer or Cannon when summoned; the Transform button works in Standby. Hammer: Fighter role, attacks the opposite lane, has the cardless attack, each attack that hits heals {${EN_HEAL}} HP; attack speed and crit from items become HP (${p.p3} HP per attack speed, ${p.p4} HP per 1% crit). Cannon: Marksman role, attacks any lane, no cardless attack; HP, Armor and MR from items become AD (${p.p5} AD per HP, ${p.p6} AD per Armor, ${p.p7} AD per MR). After each form change, his next attack deals an extra {${EN_CHARGE}} physical damage. Charge is lost on death; the form stays through respawn.`,
        },
        skills: {
            Q: {
                name: "To the Skies! / Shock Blast",
                desc: `${QH.en.desc} ${QC.en.desc}`,
            },
            E: {
                name: "Thundering Blow / Acceleration Gate",
                desc: `${EH.en.desc} ${EC.en.desc}`,
            },
            R: {
                name: "Lightning Field / Hyper Charge",
                desc: `${RH.en.desc} ${RC.en.desc}`,
            },
        },
    },
})
