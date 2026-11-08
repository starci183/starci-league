// Ashe (Xạ thủ, vật lý). Chất: CHỒNG BUỐT. Buốt là bộ đếm đặt lên địch (carrierStacks), nằm trong stacks của tướng mang.
// Mỗi Buốt làm tướng mang chịu thêm p1% sát thương từ phe Ashe (khi Ashe còn trên sân); đạt p2 thì tiêu hết và Choáng.
// Buốt trên tướng mang chết mất một nửa; Ashe chết không đổi. Mọi con số đọc từ balance/heroes/ashe.json.
import type {
    Game
} from "../game"
import {
    kit
} from "../balance"
import {
    defineHero
} from "../registry"
import type {
    Unit
} from "../types"

const k = kit("ashe"), {
    p
} = k

export const FROST = "frost"
const Q_ON = "ashe_q"

const F_STUN_P = k.x("p3 + p4·AD"), EN_STUN_P = k.xe("p3 + p4·AD")
const F_E = k.x("e1 + e2·AD"), EN_E = k.xe("e1 + e2·AD")
const F_R = k.x("r1 + r2·AD"), EN_R = k.xe("r1 + r2·AD")
const F_STUN_R = k.x("r4 + r5·AD"), EN_STUN_R = k.xe("r4 + r5·AD")

/** Cộng n Buốt lên địch; đạt p2 thì tiêu hết và Choáng p3 + p4·AD đơn vị */
export function addFrost(g: Game, ashe: Unit, t: Unit, n: number) {
    if (n <= 0 || t.status !== "board" || t.token || t.side === ashe.side) return
    g.stack(t,
        FROST,
        n)
    if (g.stackOf(t,
        FROST) < p.p2) return
    g.setStack(t,
        FROST,
        0)
    const d = g.f(ashe,
        F_STUN_P)
    if (d > 0) g.timed(ashe,
        t,
        "stun",
        d)
}

export default defineHero({
    id: "ashe", name: "Ashe", role: "marksman", damage: "physical", ...k.base,
    carrierStacks: [FROST],
    bot: k.bot,
    desc: "Bắn đều là chồng đều: Buốt làm địch chịu thêm sát thương từ cả phe, đủ Buốt thì đóng băng.",
    passive: {
        name: "Băng Tiễn",
        desc: `Mỗi đòn trúng gắn 1 Buốt lên tướng địch, vô hạn. Mỗi Buốt làm tướng mang chịu thêm ${p.p1}% sát thương từ phe Ashe khi Ashe còn trên sân. Đạt ${p.p2} Buốt: tiêu hết và Choáng {${F_STUN_P}} đơn vị. Tướng mang chết mất một nửa Buốt; Ashe chết không ảnh hưởng.`,
    },
    hooks: {
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss) return
            addFrost(g,
                me,
                d.target,
                1 + (g.has(me,
                    Q_ON) ? p.q2 : 0))
        },
    },
    attackSpeedAura(g, me, u) {
        return u.id === me.id && g.has(me,
            Q_ON) ? p.q1 : 0
    },
    modifyDamage(g, me, d) {
        // Buốt: tướng địch mang Buốt chịu thêm p1% mỗi Buốt từ mọi sát thương của phe Ashe
        if (!d.src || d.src.side !== me.side || d.target.side === me.side || d.target.token) return 1
        return 1 + (d.target.stacks[FROST] ?? 0) * p.p1 / 100
    },
    skills: {
        Q: {
            key: "Q", name: "Tập Trung", target: "self", mana: p.q0,
            desc: `Trong ${p.q3} đơn vị: Ashe nhận ${p.q1}% Tốc Đánh và mỗi đòn trúng gắn thêm ${p.q2} Buốt.`,
            resolve(c) {
                c.g.timed(c.self,
                    c.self,
                    Q_ON,
                    p.q3)
            },
        },
        E: {
            key: "E", name: "Tên Băng", target: "enemy", mana: p.e0,
            desc: `Chọn 1 tướng địch; gây {${F_E}} sát thương vật lý và gắn ${p.e3} Buốt.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_E),
                    "physical",
                    {
                        tag: "skill"
                    })
                addFrost(c.g,
                    c.self,
                    t,
                    p.e3)
            },
        },
        R: {
            key: "R", name: "Đại Băng Tiễn", target: "enemy", mana: p.r0,
            desc: `Chọn 1 tướng địch ở bất kỳ đường; gây {${F_R}} sát thương vật lý, gắn ${p.r3} Buốt và Choáng {${F_STUN_R}} đơn vị (phần lẻ là xác suất thêm 1 đơn vị).`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_R),
                    "physical",
                    {
                        tag: "skill"
                    })
                addFrost(c.g,
                    c.self,
                    t,
                    p.r3)
                if (t.status !== "board") return
                const d = c.f(F_STUN_R)
                if (d > 0) c.g.timed(c.self,
                    t,
                    "stun",
                    d)
            },
        },
    },
    en: {
        desc: "Steady shots, steady frost: Frostbite makes enemies take more from your whole team, and enough of it freezes them.",
        passive: {
            name: "Frost Shot",
            desc: `Each hit puts 1 Frostbite on an enemy champion, unlimited. Each Frostbite makes its bearer take ${p.p1}% more damage from Ashe's team while Ashe is on the board. At ${p.p2} Frostbite: spend all and Stun for {${EN_STUN_P}} units. The bearer dying halves its Frostbite; Ashe dying changes nothing.`,
        },
        skills: {
            Q: {
                name: "Ranger's Focus",
                desc: `For ${p.q3} units: Ashe gains ${p.q1}% attack speed and each hit applies ${p.q2} extra Frostbite.`,
            },
            E: {
                name: "Volley",
                desc: `Choose 1 enemy champion; deal {${EN_E}} physical damage and apply ${p.e3} Frostbite.`,
            },
            R: {
                name: "Enchanted Crystal Arrow",
                desc: `Choose 1 enemy champion in any lane; deal {${EN_R}} physical damage, apply ${p.r3} Frostbite and Stun for {${EN_STUN_R}} units (the fraction is the chance of 1 extra unit).`,
            },
        },
    },
})
