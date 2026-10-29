// Vayne (Xạ thủ, vật lý): máu 380 · AD 82 · giáp/kháng 24/26. Chất: THỢ SĂN BÓNG ĐÊM, ở trong bóng tối càng lâu ra tay càng chí mạng.
// Đêm = bộ đếm (stack "night", tối đa 10) giữ qua lần chết / lúc chưa gọi. Mỗi đòn đánh tiêu Đêm để gây thêm sát thương chuẩn.
// Q: Tàng Hình + nạp (Quick). E: lượt xả (đòn tiêu 2 Đêm, gấp đôi). R: đòn kế tiêu hết Đêm vào một phát (buff đòn kế id "vayne_r").
import {
    defineHero
} from "../registry"
import {
    otherSide
} from "../types"

const NIGHT = "night"
const EDGE = "vayne_e"
const R_BUFF = "vayne_r"
export const MAX_NIGHT = 10
/** Sát thương chuẩn cộng thêm cho mỗi Đêm tiêu (nền) */
const F_NIGHT = "24 + 36% AD"
const E_RATE = 2
const R_RATE = 3
/** Bot: hoãn gọi Vayne tới khi có bấy nhiêu Đêm */
const HOLD_UNTIL = 4

export default defineHero({
    id: "vayne", name: "Vayne", role: "marksman", damage: "physical", hp: 390, atk: 90, armor: 31, mr: 28,
    bot: {
        stackValue: {
            night: 20,
        },
        // ngoài sân mỗi lượt +2 Đêm: Đêm còn thấp thì ưu tiên gọi tướng khác trước
        holdBack: (g, u) => (g.stackOf(u,
            NIGHT) < HOLD_UNTIL ? 50 : 0),
    },
    desc: "Giữ Vayne trên tay, nạp Đêm trong bóng tối rồi gọi ra đúng lúc để xả.",
    passive: {
        name: "Thợ Săn Bóng Đêm",
        desc: `Đầu lượt của bạn, Vayne không trên sân (chưa gọi hoặc chờ hồi sinh): +2 Đêm (tối đa ${MAX_NIGHT}). Mỗi đòn đánh của Vayne tiêu 1 Đêm để gây thêm {${F_NIGHT}} sát thương chuẩn.`,
    },
    hooks: {
        onTurnStartAway(g, me, d) {
            if (d.side === me.side) g.stack(me,
                NIGHT,
                2,
                MAX_NIGHT)
        },
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss) return
            const n = g.stackOf(me,
                NIGHT)
            if (n <= 0) return
            const r = d.info.buffs.some((b) => b.id === R_BUFF)
            const e = g.has(me,
                EDGE)
            const spend = r ? n : Math.min(n,
                e ? 2 : 1)
            g.setStack(me,
                NIGHT,
                n - spend)
            d.info.bonus.push({
                raw: g.f(me,
                    F_NIGHT) * spend * (r ? R_RATE : e ? E_RATE : 1), kind: "true"
            })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Lùi Vào Bóng Tối", target: "self", quick: true,
            desc: "Quick. Vayne Tàng Hình tới hết lượt kế tiếp của đối thủ và +2 Đêm.",
            resolve(c) {
                c.g.status(c.self,
                    "stealth",
                    1,
                    {
                        of: otherSide(c.side)
                    })
                c.g.stack(c.self,
                    NIGHT,
                    2,
                    MAX_NIGHT)
            },
        },
        E: {
            key: "E", name: "Lượt Xả", target: "self",
            desc: `Tới hết lượt này: mỗi đòn đánh của Vayne tiêu 2 Đêm và sát thương chuẩn thêm từ Đêm gấp ${E_RATE}.`,
            resolve(c) {
                c.g.status(c.self,
                    EDGE,
                    1)
            },
        },
        R: {
            key: "R", name: "Giờ Khắc Cuối Cùng", target: "self",
            desc: `Đòn đánh kế tiếp của Vayne tiêu hết Đêm vào một phát: mỗi Đêm gây thêm {${F_NIGHT}} sát thương chuẩn nhân ${R_RATE}.`,
            canPlay: (c) => c.g.stackOf(c.self,
                NIGHT) > 0,
            resolve(c) {
                c.self.nextAttack.push({
                    id: R_BUFF, source: c.self.id
                })
            },
        },
    },
})
