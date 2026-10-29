// Jinx (Xạ thủ, vật lý): máu 330 · AD 124 · giáp/kháng 25/26. Chất: NHẶT MẠNG, càng nhặt càng Điên.
// Điên = bộ đếm (stack "frenzy") giữ qua lần chết (chết mất nửa), tối đa 30. Mỗi Điên cộng thêm sát thương cho đòn đánh của Jinx.
// Đánh đứa đã sứt máu là tích Điên: dưới 75% máu +1, dưới 25% máu +2, hạ gục +10. Q đổi đòn đánh kế thành một phát lan cả đội; E là Quick tự cứu.
import {
    pct
} from "../formula"
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    FOREVER, otherSide, type Unit
} from "../types"

const FRENZY = "frenzy"
/** Cờ Q đang chờ (Đổi Súng): đòn đánh kế của Jinx bị thay */
const Q_ON = "jinx_q"
/** Cờ tạm: bậc máu mục tiêu của đòn đánh vừa rồi (0 = không, 1 = dưới 75%, 2 = dưới 25%), ghi lúc onAttack, đọc ở onAttackHit */
const TIER = "frenzyLow"
/** Cờ tạm (khoá ẩn "once:"): sát thương gốc của Q cho đòn đánh vừa rồi, để lan 25% ở onAttackHit */
const Q_BASE = "once:jinx_q"
export const MAX_FRENZY = 30
/** Điên cộng khi hạ gục */
const KILL_FRENZY = 10
/** Sát thương cộng thêm mỗi Điên cho đòn đánh (vật lý) */
const F_PER = "1 + 1% AD + 0.5% AP"
const F_Q = "50 + 110% AD + 20% AP"
/** Q: cộng thêm mỗi Điên */
const Q_PER = 2
/** Q: phần trăm lượng sát thương lan lên mọi địch còn lại */
const Q_SPLASH = 0.25
const F_R = "120 + 90% AD + 20% AP"
/** R: cộng thêm mỗi Điên */
const R_PER = 5
/** R: phần máu đã mất của mục tiêu cộng thêm vào sát thương */
const R_MISSING = 0.2
/** E: giảm sát thương nhận */
const E_CUT = 0.2

/** Bậc Điên theo máu mục tiêu: dưới 25% → 2, dưới 75% → 1 */
const tierOf = (t: Unit) => (t.token ? 0 : t.hp / t.maxHp < 0.25 ? 2 : t.hp / t.maxHp < 0.75 ? 1 : 0)

/** Q: lan sát thương lên mọi địch còn lại, mỗi đứa trúng đều tính Điên */
function splash(g: Game, me: Unit, main: Unit, base: number) {
    for (const t of g.enemies(me)) {
        if (t.token || t.id === main.id || t.status !== "board") continue
        const tier = tierOf(t)
        g.damage(me,
            t,
            base * Q_SPLASH,
            "physical",
            {
                tag: "skill"
            })
        if (tier > 0) g.stack(me,
            FRENZY,
            tier,
            MAX_FRENZY)
    }
}

export default defineHero({
    id: "jinx", name: "Jinx", role: "marksman", damage: "physical", hp: 330, atk: 124, armor: 25, mr: 26,
    bot: {
        stackValue: {
            frenzy: 8,
        },
        buffValue: {
            jinx_q: 40,
        },
    },
    desc: "Kẻ nhặt mạng: đánh vào đứa đã sứt máu để Điên dần, một phát Đổi Súng tích Điên trên cả đội.",
    passive: {
        name: "Điên Cuồng",
        desc: `Đòn đánh của Jinx trúng địch dưới 75% máu: +1 Điên; dưới 25% máu: +2 Điên; hạ gục: +${KILL_FRENZY} Điên (tối đa ${MAX_FRENZY}). Jinx chết thì mất nửa Điên. Mỗi Điên: đòn đánh của Jinx gây thêm {${F_PER}} sát thương vật lý.`,
    },
    hooks: {
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id) return
            me.stacks[TIER] = tierOf(d.target)
            me.stacks[Q_BASE] = 0
            // Q (Đổi Súng): đòn đánh kế bị thay bằng một phát riêng (trượt vẫn tiêu Q)
            if (g.has(me,
                Q_ON)) {
                g.removeStatus(me,
                    Q_ON)
                if (!d.info.miss) {
                    const base = g.f(me,
                        F_Q) + Q_PER * g.stackOf(me,
                        FRENZY)
                    d.info.raw = base
                    me.stacks[Q_BASE] = base
                }
            }
            const n = g.stackOf(me,
                FRENZY)
            if (n > 0 && !d.info.miss) {
                d.info.bonus.push({
                    raw: n * g.f(me,
                        F_PER), kind: "physical"
                })
            }
        },
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id) return
            const tier = me.stacks[TIER] ?? 0
            if (tier > 0) g.stack(me,
                FRENZY,
                tier,
                MAX_FRENZY)
            me.stacks[TIER] = 0
            const base = me.stacks[Q_BASE] ?? 0
            me.stacks[Q_BASE] = 0
            if (base > 0) splash(g,
                me,
                d.target,
                base)
        },
        onKill(g, me, d) {
            if (d.killer.id === me.id && !d.victim.token) g.stack(me,
                FRENZY,
                KILL_FRENZY,
                MAX_FRENZY)
        },
        onDeath(g, me, d) {
            if (d.victim.id === me.id) g.setStack(me,
                FRENZY,
                Math.floor(g.stackOf(me,
                    FRENZY) / 2))
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Đổi Súng", target: "self",
            desc: `Đòn đánh kế của Jinx gây {${F_Q}} sát thương vật lý (cộng ${Q_PER} mỗi Điên) lên mục tiêu, và ${pct(Q_SPLASH)}% lượng đó lên mọi địch còn lại (mỗi đứa trúng đều tính Điên).`,
            resolve(c) {
                c.g.status(c.self,
                    Q_ON,
                    1,
                    {
                        until: FOREVER
                    })
            },
        },
        E: {
            key: "E", name: "Bẫy Lửa", target: "none", quick: true, chainOnly: true,
            desc: `Quick, Chỉ Nối Chuỗi. Khi địch đánh Jinx: Jinx nhận ít hơn ${pct(E_CUT)}% sát thương tới hết lượt này và lấy 1 lá Q của Jinx từ bộ bài lên tay.`,
            quickWhen: (c) => c.trigger.side !== c.side && c.trigger.target === c.self.id && (!c.trigger.card || c.trigger.card.id === "basic"),
            resolve(c) {
                // Giảm sát thương nhận (engine: status dmgCut) tới hết lượt của đối thủ, và lấy 1 lá Q lên tay
                c.g.status(c.self,
                    "dmgCut",
                    1,
                    {
                        v: E_CUT, of: otherSide(c.side)
                    })
                c.g.giveSkillToHand(c.side,
                    c.self.hero,
                    "Q",
                    "effect")
            },
        },
        R: {
            key: "R", name: "Tên Lửa", target: "enemy",
            desc: `Chọn 1 tướng địch; nó nhận {${F_R}} sát thương vật lý, thêm ${R_PER} mỗi Điên và ${pct(R_MISSING)}% máu đã mất của nó.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_R) + R_PER * c.g.stackOf(c.self,
                        FRENZY) + R_MISSING * (t.maxHp - t.hp),
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
    },
})
