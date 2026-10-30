// Soraka (Trợ thủ, phép): máu 440 · AD 66 · AP gốc 0 · giáp/kháng 26/30. Bản cân bằng starci-33 (support v7).
// CHẤT: "Máu của Soraka là máu của cả đội". Đồng minh sắp bị hạ thì Soraka trả Máu của mình để giữ nó lại (1 lần cho cả đội mỗi chu kỳ).
// P: trả {20 + 10% máu tối đa} Máu trực tiếp (có thể tự ngã), giữ đồng minh ở 1 Máu rồi hồi cho nó; thứ tự cứu: Soraka P trước Renata P.
// Q tự nạp kho máu, E (Quick, chỉ nối chuỗi) trả 5% máu tối đa để vô hiệu chiêu địch chỉ định đúng 1 tướng mình, R hồi cả đội.
// Engine: hook onLethal (+ g.lethalPipeline lồng khi Soraka tự ngã vì giá Máu), quick + chainOnly + g.chainFx().cancel.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    Unit
} from "../types"

/** P: giá Máu Soraka trả */
export const F_P_COST = "20 + 10% máu tối đa"
/** P: hồi cho đồng minh được cứu (sau khi giữ ở 1 Máu) */
export const F_P_HEAL = "35 + 10% máu tối đa + 50% AP"
export const F_Q = "30 + 20% AD + 25% AP"
export const F_HEAL = "35 + 7% máu tối đa + 40% AP"
/** E: giá Máu (làm tròn trước khi xét điều kiện) */
export const E_HP_PCT = 0.05
export const F_E_COST = "5% máu tối đa"
export const F_R = "90 + 7% máu tối đa + 45% AP"
/** Đánh dấu chu kỳ đã dùng Máu Chung (giá trị = chu kỳ + 1) */
const K_SAVE = "tc:soraka_save"

const cycleOf = (g: Game, u: Unit) => (g.s.ownTurns?.[u.side] ?? 0) + 1
/** Giá Máu của E đã làm tròn */
export const eCost = (u: Unit) => Math.round(u.maxHp * E_HP_PCT)

/** Soraka `me` có thể dùng Máu Chung để cứu `t` ngay lúc này không */
export function sorakaCanSave(g: Game, me: Unit, t: Unit): boolean {
    return me.hero === "soraka" && me.status === "board" && t.side === me.side && t.id !== me.id && !t.token
        && t.status === "board" && t.hp <= 0 && g.stackOf(me,
        K_SAVE) !== cycleOf(g,
        me)
}
export default defineHero({
    id: "soraka", name: "Soraka", role: "support", damage: "magic", hp: 375, atk: 66, armor: 26, mr: 30,
    desc: "Kho máu chung của cả đội: trả Máu của mình để giữ đồng minh khỏi bị hạ, tự hồi lại kho, vô hiệu chiêu địch nhắm vào đội và hồi cả đội lúc giao tranh lớn.",
    passive: {
        name: "Máu Chung",
        desc: `Khi 1 tướng mình khác Soraka sắp bị hạ và bạn chưa áp dụng Máu Chung trong chu kỳ này: Soraka mất trực tiếp {${F_P_COST}} Máu; giữ tướng đó ở 1 Máu. Sau đó, hồi {${F_P_HEAL}} Máu cho nó. Chỉ áp dụng 1 lần cho cả đội mỗi chu kỳ, đặt lại ở Draw Phase của bạn. Soraka có thể bị hạ bởi giá Máu, nhưng việc cứu vẫn hoàn tất.`,
    },
    hooks: {
        onLethal(g, me, d) {
            const t = d.target
            if (!sorakaCanSave(g,
                me,
                t)) return
            // chốt giá + lượng hồi theo chỉ số lúc cứu, đánh dấu đã dùng TRƯỚC khi trả Máu (chặn vòng cứu lồng nhau)
            const cost = Math.round(g.f(me,
                F_P_COST))
            const heal = g.f(me,
                F_P_HEAL)
            g.setStack(me,
                K_SAVE,
                cycleOf(g,
                    me))
            g.log(`Soraka Máu Chung: giữ ${g.nameOf(t)} lại, trả ${cost} Máu`)
            g.surviveWith(t,
                1)
            // trả Máu trực tiếp (không qua Giáp/Khiên/giảm sát thương); có thể tự ngã
            g.payHp(me,
                cost,
                0)
            if (me.hp <= 0 && me.status === "board") {
                // tự ngã vì giá Máu: chạy chuỗi cứu chết chuẩn (RULES.lethalOrder), không ai cứu thì hạ
                g.lethalPipeline({
                    target: me, hpLost: 0, over: 0, kind: "true", tag: "effect"
                })
                if (me.hp <= 0 && me.status === "board") g.kill(me)
            }
            if (t.status === "board") g.heal(me,
                t,
                heal)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Vẫn Tinh", target: "enemy", mana: 10, usesPerCycle: 1,
            desc: `Chọn 1 tướng địch; gây {${F_Q}} sát thương phép cho nó. Sau đó, Soraka hồi {${F_HEAL}} Máu.`,
            resolve(c) {
                c.g.damage(c.self,
                    c.target!,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (c.self.status === "board") c.g.heal(c.self,
                    c.self,
                    c.f(F_HEAL))
            },
        },
        E: {
            key: "E", name: "Điểm Phân Cực", target: "none", quick: true, chainOnly: true, mana: 20, usesPerCycle: 1,
            desc: `Quick, Chỉ Nối Chuỗi. Khi địch dùng lá chiêu (trên cùng Chuỗi) chỉ định đúng 1 tướng mình, và Soraka còn nhiều hơn giá Máu đã làm tròn: Soraka trả {${F_E_COST}} Máu; vô hiệu lá chiêu đó.`,
            quickWhen(c) {
                const target = c.g.unit(c.trigger.target)
                return c.trigger.side !== c.side && c.trigger.kind === "skill" && !!c.trigger.single
                    && target?.side === c.side && !target.token && c.self.hp > eCost(c.self)
            },
            resolve(c) {
                c.g.payHp(c.self,
                    eCost(c.self))
                c.g.chainFx().cancel = true
            },
        },
        R: {
            key: "R", name: "Nguyện Ước", target: "all_allies", mana: 25, usesPerCycle: 1,
            desc: `Hồi {${F_R}} Máu cho mọi tướng mình đang sống trên sân, kể cả Soraka.`,
            resolve(c) {
                const amount = c.f(F_R)
                for (const u of c.g.heroes(c.side)) c.g.heal(c.self,
                    u,
                    amount)
            },
        },
    },
})
