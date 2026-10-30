// Jinx (Xạ thủ, vật lý): máu 330 · AD 80 · giáp/kháng 25/26. Chất: NHẶT MẠNG, càng nhặt càng Điên.
// Điên = bộ đếm (stack "frenzy") VÔ HẠN, giữ nguyên qua lần chết. Mỗi Điên cộng thêm sát thương cho đòn thật của Jinx (gói riêng, không chí mạng).
// Đánh trúng tướng địch đã sứt máu là tích Điên (so Máu TRƯỚC hit): dưới 75% +1, dưới 25% +2; Jinx hạ thật tướng địch +10.
// Q đổi phát chính của đòn kế thành một phát lan cả đội (lan không chí mạng, không phải đòn thật); E là phản ứng tự cứu khi bị đánh.
// Tuning v1: mana Q/E/R = 10/15/35; bỏ trần 30 và bỏ mất nửa Điên khi chết.
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
/** Cờ Q đang chờ (Đổi Súng): phát chính của đòn kế của Jinx bị thay */
const Q_ON = "jinx_q"
/** Cờ tạm: bậc máu mục tiêu của đòn đánh vừa rồi (0 = không, 1 = dưới 75%, 2 = dưới 25%), ghi lúc onAttack, đọc ở onAttackHit */
const TIER = "frenzyLow"
/** Cờ tạm: sát thương gốc của Q cho đòn đánh vừa rồi (chụp trước hit), để lan 25% ở onAttackHit */
const Q_BASE = "once:jinx_q"
/** Điên cộng khi hạ gục */
const KILL_FRENZY = 10
/** Sát thương cộng thêm mỗi Điên cho đòn đánh (vật lý) */
const F_PER = "2 + 3% AD + 0.8% AP"
const F_Q = "45 + 215% AD + 20% AP"
/** Q: cộng thêm mỗi Điên */
const Q_PER = 2
/** Q: phần trăm lượng thay thế lan lên mọi tướng địch còn lại */
const Q_SPLASH = 0.25
const F_R = "100 + 160% AD + 20% AP"
/** R: cộng thêm mỗi Điên */
const R_PER = 5
/** R: phần máu đã mất của mục tiêu cộng thêm vào sát thương */
const R_MISSING = 0.2
/** E: giảm sát thương nhận */
const E_CUT = 0.2

/** Bậc Điên theo Máu hiện tại của tướng địch: dưới 25% → 2, dưới 75% → 1 (vật triệu hồi không tính) */
const tierOf = (t: Unit) => (t.token ? 0 : t.hp / t.maxHp < 0.25 ? 2 : t.hp / t.maxHp < 0.75 ? 1 : 0)

/** Q: lan sát thương lên mọi tướng địch còn lại; mỗi đứa thực sự trúng đủ thấp Máu cũng cho Điên */
function splash(g: Game, me: Unit, main: Unit, base: number) {
    for (const t of g.enemies(me)) {
        if (t.token || t.id === main.id || t.status !== "board") continue
        const tier = tierOf(t)
        const dealt = g.damage(me,
            t,
            base * Q_SPLASH,
            "physical",
            {
                tag: "effect"
            })
        if (tier > 0 && dealt > 0) g.stack(me,
            FRENZY,
            tier)
    }
}

export default defineHero({
    id: "jinx", name: "Jinx", role: "marksman", damage: "physical", hp: 330, atk: 80, armor: 25, mr: 26,
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
        desc: `Đòn thật trúng tướng địch có Máu trước hit dưới 75%/25% cho 1/2 Điên; Jinx hạ thật tướng địch cho thêm ${KILL_FRENZY} Điên. Điên vô hạn, giữ qua chết. Mỗi đòn thật trúng gây thêm Điên × ({${F_PER}}) sát thương vật lý, không tự chí mạng.`,
    },
    hooks: {
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id) return
            me.stacks[TIER] = d.target.side !== me.side ? tierOf(d.target) : 0
            me.stacks[Q_BASE] = 0
            // Q (Đổi Súng): phát chính của đòn kế bị thay (trượt vẫn tiêu Q); chụp lượng thay thế trước hit
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
        },
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id) return
            const tier = me.stacks[TIER] ?? 0
            const base = me.stacks[Q_BASE] ?? 0
            me.stacks[TIER] = 0
            me.stacks[Q_BASE] = 0
            if (d.info.miss || d.target.side === me.side) return
            // P: Điên × (1 + 1.8% AD + 0.5% AP), gói riêng không nhân chí mạng; tính theo Điên trước khi hit này cộng
            const n = g.stackOf(me,
                FRENZY)
            if (n > 0) g.damage(me,
                d.target,
                n * g.f(me,
                    F_PER),
                "physical",
                {
                    tag: "attack"
                })
            // trúng thật (kể cả chạm Khiên); bị chặn hoàn toàn thì không cho Điên, không lan
            const landed = d.dealt > 0
            if (landed && tier > 0) g.stack(me,
                FRENZY,
                tier)
            if (landed && base > 0) splash(g,
                me,
                d.target,
                base)
        },
        onKill(g, me, d) {
            if (d.killer.id === me.id && !d.victim.token && d.victim.side !== me.side) g.stack(me,
                FRENZY,
                KILL_FRENZY)
        },
    },
    skills: {
        Q: {
            key: "Q", mana: 5, name: "Đổi Súng", target: "self",
            desc: `Lên nòng đòn kế: phát chính được thay bằng {${F_Q}} + ${Q_PER} × Điên sát thương vật lý, rồi vẫn cộng sát thương Điên của P. Nếu phát chính trúng, mọi tướng địch còn lại chịu ${pct(Q_SPLASH)}% lượng thay thế trước chí mạng; mỗi người thực sự trúng đủ thấp Máu cũng cho Điên. Không tự đánh.`,
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
            key: "E", mana: 10, name: "Bẫy Lửa", target: "none", quick: true, chainOnly: true,
            desc: `Quick, Chỉ Nối Chuỗi. Khi địch đánh Jinx (mắt xích địch trên cùng là đòn đánh chỉ định Jinx): cô nhận ít hơn ${pct(E_CUT)}% mọi sát thương tới hết lượt đối phương và lấy 1 Q của mình từ bộ lên tay, thiếu mới tạo. Tay đầy đốt lá thừa.`,
            quickWhen: (c) => c.trigger.side !== c.side && c.trigger.kind === "attack" && !!c.trigger.single && c.trigger.target === c.self.id,
            resolve(c) {
                // Giảm sát thương nhận (engine: status dmgCut, làm mới không cộng dồn) tới hết lượt của đối thủ, và lấy 1 lá Q lên tay
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
            key: "R", mana: 30, name: "Tên Lửa", target: "enemy",
            desc: `Chọn 1 tướng địch hợp lệ; gây {${F_R}} + ${R_PER} × Điên + ${pct(R_MISSING)}% Máu mục tiêu đã mất sát thương vật lý.`,
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
