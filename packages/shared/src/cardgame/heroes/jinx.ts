// Jinx (Xạ thủ, vật lý). Chất: PHẤN KHÍCH. Điên là bộ đếm của Jinx (stack "frenzy"), vô hạn, mất một nửa khi chết (deathHalf).
// Súng chọn lúc gọi ra sân (summonModes), lưu ở stack "jinx_gun" (0 = Bằng Chíu, 1 = Xương Cá) để client thấy; nút Tráo Hàng! dùng ở Standby như Jayce.
// Bằng Chíu: q1 Tốc Đánh. Xương Cá: mỗi đòn trúng gây thêm q2 + q3·AD lên 2 đường kề mục tiêu. Q là 1 đòn đánh thật được cường hoá theo Điên.
import {
    kit, when, actorOrEnemy
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
    PlayArgs, Side, Unit
} from "../types"
import {
    otherSide
} from "../types"

const k = kit("jinx"), {
    p
} = k

export const FRENZY = "frenzy"
/** Súng đang cầm: 0 = Bằng Chíu, 1 = Xương Cá */
export const GUN = "jinx_gun"
export const GUN_MINIGUN = 0
export const GUN_ROCKET = 1
const SWAP = "jinx_swap"

const F_GAIN = k.x("p2 + p2b·Tốc Đánh"), EN_GAIN = k.xe("p2 + p2b·Tốc Đánh")
const F_PER = k.x("p4 + p5·AD"), EN_PER = k.xe("p4 + p5·AD")
const F_SPLASH = k.x("q2 + q3·AD"), EN_SPLASH = k.xe("q2 + q3·AD")
const F_Q = k.x("q4 + q5·AD"), EN_Q = k.xe("q4 + q5·AD")
const F_E = k.x("e1 + e2·AD"), EN_E = k.xe("e1 + e2·AD")
const F_E_BLIND = k.x("e3 + e4·AD"), EN_E_BLIND = k.xe("e3 + e4·AD")
const F_R = k.x("r1 + r2·AD + r3% Máu đã mất mục tiêu"), EN_R = k.xe("r1 + r2·AD + r3% Máu đã mất mục tiêu")

/** X.Y: chắc chắn phần nguyên, phần lẻ là xác suất thêm 1 */
const whole = (g: Game, x: number) => Math.floor(x) + (g.rand() < x % 1 ? 1 : 0)

const gun = (u: Unit) => u.stacks[GUN] ?? GUN_MINIGUN
/** Bot: Xương Cá khi có địch hai bên đường đối diện, Bằng Chíu khi không */
const swapValue = (g: Game, me: Unit) => (g.opposite(me) && (gun(me) === GUN_ROCKET) === (rocketFoes(g,
    me.side,
    me.lane) === 0) ? p.b3 : 0)

/** Gợi ý bot: Xương Cá đáng giá khi địch đứng ở 2 đường kề đường đối diện; Bằng Chíu là mức nền (Tốc Đánh) */
const BOT_MINIGUN = p.b1, BOT_ROCKET_PER_FOE = p.b2
const rocketFoes = (g: Game, side: Side, lane: number) => [lane - 1,
    lane + 1].filter((l) => l >= 0 && l <= 4).filter((l) => {
    const o = g.at(otherSide(side),
        l)
    return !!o && !o.token
}).length

/** Phấn Khích: nhận p2 + p2b·Tốc Đánh Điên (phần lẻ theo X.Y) */
function excite(g: Game, me: Unit) {
    const n = whole(g,
        g.f(me,
            F_GAIN))
    if (n > 0) g.stack(me,
        FRENZY,
        n)
}

export default defineHero({
    id: "jinx", name: "Jinx", role: "marksman", damage: "physical", ...k.base,
    deathHalf: [FRENZY],
    summonModes: ["minigun",
        "rocket"],
    abilities: [{
        id: SWAP, name: "Tráo Hàng!", nameEn: "Switcheroo!", standby: true, botValue: swapValue,
        desc: "Nội tại · Đổi vũ khí. Chỉ ở Standby, 1 lần mỗi lượt: đổi giữa Bằng Chíu và Xương Cá.",
        descEn: "Passive · Swap weapon. Standby only, once per turn: swap between Pow-Pow and Fishbones.",
        options: (g, me) => (g.canAct(me) && me.stacks[`once:${SWAP}`] !== g.s.turnNo ? [{
        }] : []),
        resolve(g, me) {
            if (g.oncePerTurn(me,
                SWAP)) g.setStack(me,
                GUN,
                gun(me) === GUN_ROCKET ? GUN_MINIGUN : GUN_ROCKET)
        },
    }],
    bot: {
        ...k.bot,
        unitValue: (g, u) => (gun(u) === GUN_ROCKET ? BOT_ROCKET_PER_FOE * (g.opposite(u) ? rocketFoes(g,
            u.side,
            u.lane) : 0) : BOT_MINIGUN),
        modeValue: (g, side, lane, mode) => (mode === "rocket" ? BOT_ROCKET_PER_FOE * rocketFoes(g,
            side,
            lane) : BOT_MINIGUN),
    },
    desc: "Kẻ nhặt mạng: càng đánh vào đứa sứt máu càng Điên; chọn Bằng Chíu hoặc Xương Cá từ đầu, Q bắn 1 phát cường hoá theo Điên.",
    passive: {
        name: "Hưng Phấn!",
        desc: `Chọn súng khi gọi ra sân; nút Tráo Hàng! dùng ở Standby. Bằng Chíu: Jinx nhận ${p.q1}% Tốc Đánh. Xương Cá: mỗi đòn trúng gây thêm {${F_SPLASH}} sát thương vật lý lên 2 đường kề mục tiêu. Đòn trúng: có ${p.p1}× tỉ lệ Máu đã mất của mục tiêu làm cơ hội nhận {${F_GAIN}} Điên (phần lẻ là xác suất thêm 1). Hạ gục tướng địch: nhận thêm ${p.p3} Điên. Mỗi Điên làm đòn trúng gây thêm {${F_PER}} sát thương vật lý, không chí mạng. Điên vô hạn, mất một nửa khi Jinx chết.`,
    },
    hooks: {
        onSummon(g, me, d) {
            if (d.unit.id !== me.id) return
            g.setStack(me,
                GUN,
                d.mode === "rocket" ? GUN_ROCKET : GUN_MINIGUN)
        },
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss || d.target.token || d.target.side === me.side) return
            const t = d.target
            // gói riêng, không nhân chí mạng của đòn chính; tính theo Điên trước hit này
            const n = g.stackOf(me,
                FRENZY)
            if (n > 0) g.damage(me,
                t,
                n * g.f(me,
                    F_PER),
                "physical",
                {
                    tag: "attack"
                })
            // Xương Cá: nổ lan lên 2 đường kề mục tiêu
            if (gun(me) === GUN_ROCKET) {
                const raw = g.f(me,
                    F_SPLASH)
                for (const o of g.neighbors(t)) g.damage(me,
                    o,
                    raw,
                    "physical",
                    {
                        tag: "effect", aoe: true, via: t.id
                    })
            }
            if (me.status !== "board") return
            const chance = Math.max(0,
                Math.min(1,
                    p.p1 * (1 - t.hp / t.maxHp)))
            if (g.rand() < chance) excite(g,
                me)
        },
        onKill(g, me, d) {
            if (d.killer.id === me.id && !d.victim.token && d.victim.side !== me.side) g.stack(me,
                FRENZY,
                p.p3)
        },
    },
    attackSpeedAura(g, me, u) {
        return u.id === me.id && gun(me) === GUN_MINIGUN ? p.q1 : 0
    },
    skills: {
        Q: {
            key: "Q", name: "Giật Bắn!", target: "enemy", mana: p.q0, canPlay: (c) => c.g.canAttack(c.self),
            desc: `Chọn 1 tướng địch ở bất kỳ đường; bắn 1 đòn đánh theo súng đang cầm, gây thêm {${F_Q}} sát thương vật lý và thêm ${pct(p.q6)}% sát thương theo Điên, có thể chí mạng. Trúng: chắc chắn nhận {${F_GAIN}} Điên.`,
            resolve(c) {
                const g = c.g, me = c.self, t = c.target
                if (!t) return
                const info = g.attack(me,
                    t,
                    {
                        free: true,
                        bonusRaw: c.f(F_Q) + p.q6 * g.stackOf(me,
                            FRENZY) * g.f(me,
                            F_PER)
                    })
                if (info && !info.miss && me.status === "board") excite(g,
                    me)
            },
        },
        E: {
            key: "E", name: "Lựu Đạn Ma Hỏa!", target: "enemy", mana: p.e0, quick: true, quickWhen: when.attacksAlly,
            desc: `Quick. Khi địch đánh đúng 1 tướng mình, bạn có thể dùng lá này; mục tiêu là kẻ đó (dùng chủ động thì chọn 1 tướng địch). Gây {${F_E}} sát thương vật lý và gây Mù {${F_E_BLIND}} đơn vị (phần lẻ là xác suất thêm 1 đơn vị).`,
            options: (c): PlayArgs[] => actorOrEnemy(c),
            resolve(c) {
                const foe = c.target
                if (!foe || foe.status !== "board" || foe.side === c.side) return
                c.g.damage(c.self,
                    foe,
                    c.f(F_E),
                    "physical",
                    {
                        tag: "skill"
                    })
                if (foe.status !== "board") return
                const d = c.f(F_E_BLIND)
                if (d > 0) c.g.timed(c.self,
                    foe,
                    "blind",
                    d)
            },
        },
        R: {
            key: "R", name: "Tên Lửa Đạn Đạo Siêu Khủng Khiếp!", target: "enemy", mana: p.r0,
            desc: `Chọn 1 tướng địch ở bất kỳ đường; gây {${F_R}} sát thương vật lý, 2 tướng ở đường kề nhận ${p.r4}% lượng đó. Hạ gục: Phấn Khích.`,
            resolve(c) {
                const g = c.g
                const t = c.target!
                const raw = g.f(c.self,
                    F_R,
                    t)
                g.damage(c.self,
                    t,
                    raw,
                    "physical",
                    {
                        tag: "skill"
                    })
                for (const o of g.neighbors(t)) g.damage(c.self,
                    o,
                    raw * p.r4 / 100,
                    "physical",
                    {
                        tag: "skill", aoe: true, via: t.id
                    })
                if (t.status !== "board" && c.self.status === "board") excite(g,
                    c.self)
            },
        },
    },
    en: {
        desc: "The life-collector: the more hurt the enemy, the crazier she gets; pick the Pow-Pow or Fishbones from the start, Q fires one shot empowered by Frenzy.",
        passive: {
            name: "Get Excited!",
            desc: `Pick the gun on entering the board; the Switcheroo! button works in Standby. Pow-Pow: Jinx gains ${p.q1}% attack speed. Fishbones: each hit deals an extra {${EN_SPLASH}} physical damage to the 2 lanes next to the target. On hit: ${p.p1}× the target's missing HP ratio is the chance to gain {${EN_GAIN}} Frenzy (the fraction is the chance of 1 extra). Taking down an enemy champion: gain ${p.p3} extra Frenzy. Each Frenzy makes Jinx's hits deal an extra {${EN_PER}} physical damage, which cannot crit. Frenzy is unlimited and halves when Jinx dies.`,
        },
        skills: {
            Q: {
                name: "Zap!",
                desc: `Choose 1 enemy champion in any lane; fire 1 attack with the current gun, dealing an extra {${EN_Q}} physical damage and ${pct(p.q6)}% extra damage from Frenzy, which can crit. On hit: gain {${EN_GAIN}} Frenzy for certain.`,
            },
            E: {
                name: "Flame Chompers!",
                desc: `Quick. When the enemy attacks exactly 1 of your champions, you may play this card; the target is that attacker (played proactively, choose 1 enemy champion). Deal {${EN_E}} physical damage and Blind for {${EN_E_BLIND}} units (the fraction is the chance of 1 extra unit).`,
            },
            R: {
                name: "Super Mega Death Rocket!",
                desc: `Choose 1 enemy champion in any lane; deal {${EN_R}} physical damage, the 2 champions in neighbouring lanes take ${p.r4}% of it. Taking it down: Get Excited!`,
            },
        },
    },
})
