// Vayne (Sát thủ, vật lý): máu 340 · AD 80 · giáp/kháng 26/26 · mana Q15/E20/R35 (bể đội). Chất: THỢ SĂN BÓNG ĐÊM.
// Đêm = bộ đếm (stack "night", KHÔNG trần) giữ qua lần chết. Kiếm Đêm bằng cách NHỊN: cuối lượt mình còn sống trên bàn và chưa chủ động
// tuyên bố đòn đánh/chiêu gây sát thương thì +2 Đêm. Mỗi đòn thường thật trúng tiêu 1 Đêm để gây thêm sát thương chuẩn.
// Q: swap với đồng minh, thành công mới Tàng Hình + 2 Đêm. E/R: chiêu tự bắn địch đối diện (không cần lá/quyền đánh), tiêu Đêm thành chuẩn.
// Engine: hook onAttack (info.bonus), onTurnEnd (nhịn), onManaSpent/onAttack/onActionCommitted (ghi tuyên bố), g.swapWith.
import {
    defineHero
} from "../registry"
import type {
    Game
} from "../game"
import type {
    Ctx, Unit
} from "../types"

const NIGHT = "night"
/** Cờ kỹ thuật (ẩn, tiền tố "once:"): turnNo gần nhất Vayne chủ động tuyên bố đòn đánh/chiêu gây sát thương */
const DECLARED = "once:vayne_declared"
/** Sát thương chuẩn cộng thêm cho mỗi Đêm tiêu (nền) */
export const F_NIGHT = "25 + 60% AD + 8% AP"
/** Nhịn một lượt trên bàn: +bấy nhiêu Đêm */
export const REST_GAIN = 2
/** Q thành công: +bấy nhiêu Đêm */
export const Q_GAIN = 2
/** E: phần vật lý nền */
export const F_E_BASE = "40 + 120% AD + 20% AP"
/** E: tiêu tối đa bấy nhiêu Đêm */
export const E_SPEND_MAX = 2
/** E: mỗi Đêm tiêu = E_RATE × F_NIGHT sát thương chuẩn */
export const E_RATE = 1.5
/** R: phần vật lý nền */
export const F_R = "60 + 165% AD + 20% AP"
/** R: sát thương chuẩn thêm cho MỖI Đêm tiêu */
export const F_R_NIGHT = "30 + 75% AD + 10% AP"
export const MANA = {
    Q: 10, E: 20, R: 35
} as const
/** Lá chiêu gây sát thương của Vayne (tuyên bố = mất thưởng nhịn) */
const DAMAGE_SKILLS = ["vayne_e",
    "vayne_r"]

const declare = (g: Game, me: Unit) => { g.setStack(me,
    DECLARED,
    g.s.turnNo) }
const nightOf = (g: Game, me: Unit) => g.stackOf(me,
    NIGHT)

/** E/R: địch đối diện còn chọn được lúc giải quyết (đích bị Braum Q đổi hướng có args.target do engine đặt thì giữ đích đó) */
function lockedOpposite(c: Ctx, t: Unit | undefined): t is Unit {
    const g = c.g
    return !!t && t.side !== c.side && !t.token && t.status === "board" && g.targetable(t) && (g.opposite(c.self)?.id === t.id || c.args.target === t.id)
}

export default defineHero({
    id: "vayne", name: "Vayne", role: "assassin", damage: "physical", hp: 340, atk: 80, armor: 26, mr: 26,
    bot: {
        stackValue: {
            night: 20,
        },
    },
    desc: "Thợ săn bóng đêm: nhịn đòn trên bàn để tích Đêm, rồi xả cả kho vào một phát.",
    passive: {
        name: "Thợ Săn Bóng Đêm",
        desc: `Cuối lượt của bạn, nếu Vayne còn sống trên bàn và chưa chủ động tuyên bố đòn đánh hay chiêu gây sát thương trong lượt (kể cả bị huỷ sau đó), Vayne nhận ${REST_GAIN} Đêm. Đêm không có trần, giữ qua khi chết. Mỗi đòn thường thật trúng tiêu tối đa 1 Đêm để gây thêm {${F_NIGHT}} sát thương chuẩn, không tự chí mạng; mỗi hit thật theo tốc đánh tự tiêu Đêm riêng nếu còn.`,
    },
    hooks: {
        // tuyên bố: đòn thật của Vayne / lá E, R lúc trả mana / bất kỳ mắt xích đánh thường của Vayne đang nằm trên chuỗi
        onManaSpent(g, me, d) {
            if (d.unit.id === me.id && DAMAGE_SKILLS.includes(d.card.id)) declare(g,
                me)
            for (const l of g.s.chain?.links ?? []) if (l.actor === me.id && (l.kind === "attack" || l.card?.id === "basic")) declare(g,
                me)
        },
        onActionCommitted(g, me, d) {
            if (d.unit?.id !== me.id) return
            if (d.action === "attack" || DAMAGE_SKILLS.includes(d.card?.id ?? "")) declare(g,
                me)
        },
        onTurnEnd(g, me, d) {
            if (d.side !== me.side || me.status !== "board") return
            if (g.stackOf(me,
                DECLARED) === g.s.turnNo) return
            g.stack(me,
                NIGHT,
                REST_GAIN)
        },
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id) return
            if (d.attacker.side === g.s.active) declare(g,
                me)
            if (d.info.miss) return
            const n = nightOf(g,
                me)
            if (n <= 0) return
            g.setStack(me,
                NIGHT,
                n - 1)
            d.info.bonus.push({
                raw: g.f(me,
                    F_NIGHT), kind: "true"
            })
        },
    },
    skills: {
        Q: {
            key: "Q", mana: MANA.Q, name: "Lùi Vào Bóng Tối", target: "ally_other",
            desc: `Chọn một đồng minh khác hợp lệ và swap thật với nó. Thành công mới Tàng Hình tới hết lượt kế tiếp của đối thủ và nhận ${Q_GAIN} Đêm. Q không gây sát thương nên không làm mất thưởng nhịn của nội tại.`,
            options(c) {
                return c.g.allies(c.self,
                    false).filter((a) => !a.token && a.status === "board").map((a) => ({
                    target: a.id
                }))
            },
            resolve(c) {
                const ally = c.target
                if (!ally || ally.side !== c.side || ally.id === c.self.id || !c.g.swapWith(c.self,
                    ally)) return
                c.g.stealth(c.self)
                c.g.stack(c.self,
                    NIGHT,
                    Q_GAIN)
            },
        },
        E: {
            key: "E", mana: MANA.E, name: "Mũi Tên Bạc", target: "opposite",
            desc: `Khoá tướng địch đối diện; lúc giải quyết còn đối diện và chọn được mới bắn {${F_E_BASE}} sát thương vật lý. Tiêu tối đa ${E_SPEND_MAX} Đêm, mỗi Đêm thêm 1,5 × {${F_NIGHT}} sát thương chuẩn (không chí mạng). Cạn Đêm vẫn bắn phần nền; là chiêu, không cần lá/quyền đánh và không kích nội tại theo đòn.`,
            resolve(c) {
                const t = c.target
                declare(c.g,
                    c.self)
                if (!lockedOpposite(c,
                    t)) return
                const spent = Math.min(nightOf(c.g,
                    c.self),
                E_SPEND_MAX)
                if (spent > 0) c.g.setStack(c.self,
                    NIGHT,
                    nightOf(c.g,
                        c.self) - spent)
                c.g.damage(c.self,
                    t,
                    c.f(F_E_BASE),
                    "physical",
                    {
                        tag: "skill"
                    })
                // phần chuẩn từ Đêm là phần cộng: không roll chí mạng chiêu
                if (spent > 0) c.g.damage(c.self,
                    t,
                    spent * E_RATE * c.f(F_NIGHT),
                    "true",
                    {
                        tag: "effect"
                    })
            },
        },
        R: {
            key: "R", mana: MANA.R, name: "Giờ Khắc Cuối Cùng", target: "opposite",
            desc: `Khoá tướng địch đối diện; lúc giải quyết còn đối diện và chọn được mới bắn {${F_R}} sát thương vật lý và tiêu toàn bộ Đêm, mỗi Đêm thêm {${F_R_NIGHT}} sát thương chuẩn (không chí mạng). Cạn kho vẫn có phát nền; không cần lá/quyền đánh và không kích nội tại theo đòn.`,
            resolve(c) {
                const t = c.target
                declare(c.g,
                    c.self)
                if (!lockedOpposite(c,
                    t)) return
                const spent = nightOf(c.g,
                    c.self)
                if (spent > 0) c.g.setStack(c.self,
                    NIGHT,
                    0)
                c.g.damage(c.self,
                    t,
                    c.f(F_R),
                    "physical",
                    {
                        tag: "skill"
                    })
                if (spent > 0) c.g.damage(c.self,
                    t,
                    spent * c.f(F_R_NIGHT),
                    "true",
                    {
                        tag: "effect"
                    })
            },
        },
    },
})
