// Nami (Trợ thủ, phép): máu 420 · AD 67 · AP gốc 0 · giáp/kháng 25/29. Bản cân bằng starci-33 (support v7).
// CHẤT: "Thuỷ triều nuôi bài". Mỗi hành động gốc hữu ích của phe (gây mất Máu/Khiên cho địch hoặc thực hồi Máu cho phe mình) = 1 Nhịp; 3 Nhịp rút 1 lá.
// Nội tại: đếm 1 lần cho mỗi hành động gốc (lá chiêu/đòn đánh của phe mình), không đếm proc đồ đứng riêng, DoT, hồi thừa, buff,
//   hay hành động bị địch ép (Renata R). Tối đa 2 lá mỗi chu kỳ (đặt lại ở Draw Phase của Nami); Nhịp dang dở giữ qua lượt.
// Q: sát thương phép + Choáng phân số (phần lẻ roll 1 lần). E: chi 20 hoặc 30 mana, hồi người chọn + 1 người thiếu máu khác ngẫu nhiên (M = mana thực chi).
// R: sát thương phép mọi địch → Cường Hoá cả đội 1 đơn vị → hồi 1 tướng mình có tỉ lệ máu thấp nhất.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    otherSide, type Unit
} from "../types"

export const RHYTHM = "nami_rhythm"
/** Số Nhịp đổi 1 lá */
export const RHYTHM_PER_DRAW = 3
/** Trần số lá rút từ nội tại mỗi chu kỳ của Nami */
export const DRAW_CAP = 2
const K_CYCLE = "tc:nami_cycle"
const K_DRAWS = "tc:nami_draws"

export const F_Q = "60 + 30% AD + 35% AP"
/** Choáng phân số của Q (đơn vị thời gian), tối đa STUN_CAP */
export const F_Q_STUN = "0,35 + 0,1% AD + 0,2% AP"
export const STUN_CAP = 1.5
/** E: phần hồi gốc; cộng thêm M = mana thực chi cho lá E này (20 hoặc 30) */
export const F_E = "35 + 30% AD + 55% AP"
export const E_COSTS = [20,
    30] as const
export const F_R = "50 + 25% AD + 40% AP"
export const F_R_HEAL = "65 + 25% AD + 50% AP"

/** Chu kỳ hiện tại của phe (đếm lượt của phe; lượt đối thủ chen giữa vẫn thuộc chu kỳ đó) */
const cycleOf = (g: Game, u: Unit) => (g.s.ownTurns?.[u.side] ?? 0) + 1
/** Số lá nội tại đã rút trong chu kỳ này */
export function namiDrawsThisCycle(g: Game, me: Unit): number {
    return g.stackOf(me,
        K_CYCLE) === cycleOf(g,
        me) ? g.stackOf(me,
            K_DRAWS) : 0
}

/** Các hành động gốc đã được tính Nhịp, theo từng đối tượng Game (một lần applyAction) */
const counted = new WeakMap<Game, Set<string>>()

/**
 * Hành động gốc đang giải quyết (lá chiêu / lá Đánh thường / đòn không cần lá) và tướng làm chủ hành động.
 * Lá hỗ trợ khác, phép bổ trợ, hiệu ứng đầu/cuối lượt (DoT, nội tại đồ) không phải hành động gốc hợp lệ.
 */
function rootAction(g: Game, d: { src?: Unit; tag: string }): { key: string; actor: Unit } | undefined {
    const cur = g.cur as { src?: string; card?: string; uid?: string; actionId?: string }
    const isSkill = !!cur.card && /_[qer]$/.test(cur.card)
    if (cur.src && (isSkill || cur.card === "basic")) {
        const actor = g.unit(cur.src)
        if (!actor) return undefined
        return {
            key: cur.actionId ?? cur.uid ?? `${g.s.turnNo}:${g.s.actionsThisTurn}:${cur.card}:${cur.src}`, actor
        }
    }
    // đòn không cần lá của Đấu sĩ: engine không đặt cur, chủ hành động là người ra đòn
    if (!cur.src && !cur.card && d.tag === "attack" && d.src) return {
        key: `${g.s.turnNo}:${g.s.actionsThisTurn}:cardless:${d.src.id}`, actor: d.src
    }
    return undefined
}

/** Một kết quả hữu ích của hành động gốc phe Nami: +1 Nhịp (1 lần mỗi hành động), đủ 3 Nhịp rút 1 lá (tối đa 2 lá/chu kỳ) */
function rhythm(g: Game, me: Unit, d: { src?: Unit; tag: string }) {
    if (me.status !== "board" || d.tag === "dot") return
    const root = rootAction(g,
        d)
    if (!root || root.actor.side !== me.side) return
    let done = counted.get(g)
    if (!done) counted.set(g,
        done = new Set())
    const key = `${me.id}|${root.key}`
    if (done.has(key)) return
    if (namiDrawsThisCycle(g,
        me) >= DRAW_CAP) return // đã chạm trần: không nhận thêm Nhịp trong chu kỳ này
    done.add(key)
    const r = g.stack(me,
        RHYTHM,
        1)
    if (r < RHYTHM_PER_DRAW) return
    g.setStack(me,
        RHYTHM,
        r - RHYTHM_PER_DRAW)
    const n = namiDrawsThisCycle(g,
        me) + 1
    g.setStack(me,
        K_CYCLE,
        cycleOf(g,
            me))
    g.setStack(me,
        K_DRAWS,
        n)
    g.log(`Nami: đủ ${RHYTHM_PER_DRAW} Nhịp, rút 1 lá (${n}/${DRAW_CAP} trong chu kỳ)`)
    g.draw(me.side,
        1,
        {
            reason: "effect", by: me.id
        })
}

/** Thời hạn Choáng d kẹp [0, cap]; phần lẻ (xác suất thêm 1 đơn vị) do engine tung 1 lần trong g.status */
export function stunDuration(d: number, cap = Infinity): number {
    return Math.max(0,
        Math.min(cap,
            d))
}

const wounded = (u: Unit) => u.status === "board" && !u.token && u.hp < u.maxHp

export default defineHero({
    id: "nami", name: "Nami", role: "support", damage: "magic", hp: 360, atk: 67, armor: 25, mr: 29,
    bot: {
        stackValue: {
            nami_rhythm: 12,
        },
    },
    desc: "Thuỷ triều nuôi bài: mỗi hành động hữu ích của cả đội là một Nhịp, đủ Nhịp thì rút bài; Q khống chế, E hồi hai người, R đánh cả bàn địch rồi Cường Hoá cả đội.",
    passive: {
        name: "Triều Bài",
        desc: `Sau khi một hành động gốc của phe Nami (lá chiêu hoặc đòn đánh) gây mất Máu/Khiên cho địch hoặc thực hồi Máu cho phe mình: Nami nhận 1 Nhịp (1 lần mỗi hành động). Khi đủ ${RHYTHM_PER_DRAW} Nhịp: mất ${RHYTHM_PER_DRAW} Nhịp, rồi rút 1 lá. Tối đa ${DRAW_CAP} lá trong mỗi chu kỳ của bạn; khi đã đạt trần, không nhận thêm Nhịp trong chu kỳ đó. Nhịp chưa đủ được giữ qua lượt.`,
    },
    hooks: {
        onTurnStart(g, me, d) {
            // Draw Phase của Nami: chỉ đặt lại trần rút (giữ Nhịp dang dở)
            if (d.side !== me.side) return
            g.setStack(me,
                K_DRAWS,
                0)
            g.setStack(me,
                K_CYCLE,
                cycleOf(g,
                    me))
        },
        onDamage(g, me, d) {
            if (!d.src || d.src.side !== me.side || d.target.side === me.side || d.target.token) return
            if (d.hpLost + d.absorbed <= 0) return
            rhythm(g,
                me,
                d)
        },
        onHeal(g, me, d) {
            if (d.target.side !== me.side || d.amount <= 0) return
            rhythm(g,
                me,
                {
                    src: d.src, tag: "heal"
                })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Thuỷ Ngục", target: "enemy", mana: 10, usesPerCycle: 1,
            desc: `Chọn 1 tướng địch; gây {${F_Q}} sát thương phép cho nó. Sau đó, gắn Choáng {${F_Q_STUN}} đơn vị, tối đa ${String(STUN_CAP).replace(".",
                ",")} đơn vị (phần lẻ là xác suất thêm 1 đơn vị).`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (t.status !== "board") return
                const d = stunDuration(c.f(F_Q_STUN),
                    STUN_CAP)
                if (d > 0) c.g.status(t,
                    "stun",
                    d,
                    {
                        of: otherSide(c.side)
                    })
            },
        },
        E: {
            key: "E", name: "Nước Hồi Sinh", target: "ally", usesPerCycle: 1,
            // chi đúng 20 hoặc 30 (args.manaSpent); mặc định 20
            mana: (c) => (c.args?.manaSpent === 30 ? 30 : 20),
            desc: `Chi ${E_COSTS[0]} hoặc ${E_COSTS[1]} mana từ bể đội và chọn 1 tướng mình đang thiếu Máu; hồi {${F_E}} + M Máu cho nó (M = số mana thực chi cho lá này). Sau đó, hồi cùng lượng gốc cho 1 tướng mình khác đang thiếu Máu được chọn ngẫu nhiên. Không có người thứ hai hợp lệ thì chỉ hồi người đầu.`,
            options(c) {
                const pool = c.g.manaOf(c.self)
                return c.g.allies(c.self).filter(wounded).flatMap((u) => E_COSTS.filter((m) => pool >= m).map((m) => ({
                    target: u.id, manaSpent: m
                })))
            },
            resolve(c) {
                const t = c.target!
                const m = c.manaPaid === 30 ? 30 : c.manaPaid >= 20 ? 20 : c.manaPaid
                const amount = c.f(F_E) + m
                c.g.heal(c.self,
                    t,
                    amount)
                const second = c.g.pick(c.g.allies(c.self).filter((u) => u.id !== t.id && wounded(u)))
                if (second) c.g.heal(c.self,
                    second,
                    amount)
            },
        },
        R: {
            key: "R", name: "Sóng Thần", target: "all_enemies", mana: 25, usesPerCycle: 1,
            desc: `Gây {${F_R}} sát thương phép lên mọi tướng địch trên sân. Sau đó, mọi tướng mình trên sân nhận Cường Hoá trong 1 đơn vị. Cuối cùng, hồi {${F_R_HEAL}} Máu cho 1 tướng mình có tỉ lệ Máu thấp nhất.`,
            resolve(c) {
                const g = c.g
                const dmg = c.f(F_R)
                for (const t of g.heroes(otherSide(c.side))) g.damage(c.self,
                    t,
                    dmg,
                    "magic",
                    {
                        tag: "skill"
                    })
                const foe = otherSide(c.side)
                for (const a of g.heroes(c.side)) g.status(a,
                    "empower",
                    1,
                    {
                        until: g.turnsUntil(foe,
                            1)
                    })
                const mates = g.heroes(c.side)
                if (!mates.length) return
                const low = Math.min(...mates.map((u) => u.hp / u.maxHp))
                const pick = g.pick(mates.filter((u) => u.hp / u.maxHp - low < 1e-9))
                if (pick) g.heal(c.self,
                    pick,
                    c.f(F_R_HEAL))
            },
        },
    },
})
