// Ornn (Đỡ đòn, phép): máu 490 · AD 64 · AP gốc 0 · giáp/kháng 34/34 (V3).
// CHẤT: "Thần Rèn". Ornn làm mọi món đồ của đội mạnh hơn (đồ mặc càng lâu càng khoẻ) và rèn đồ mới giữa trận.
// Q Phun Trào mở đường (giảm Giáp), E (Quick) che đồng minh: phạt kẻ đánh bằng sát thương + Choáng, R phát đồ hoàn chỉnh.
// Engine: HeroDef.itemAura (hào quang đồ theo số vòng đã mặc), status "armor_down" (giảm Giáp phẳng), quickWhen + chainOnly (E), g.grantItem (R).
// Đối thủ trả lời: Blitzcrank cướp lá đồ, hạ Ornn để tắt cả lò, sát thương chuẩn.
import {
    defineHero
} from "../registry"
import {
    otherSide, type PlayArgs
} from "../types"
import {
    ccApply, ccDuration
} from "./braum"

/** Nội tại: đồ +(10% + 2% mỗi 100 AD + 2% mỗi 100 AP của Ornn + 1% mỗi vòng món đó đã mặc) chỉ số */
export const FORGE_BASE = 12
export const FORGE_PER_100_AD = 2
export const FORGE_PER_100_AP = 2
export const FORGE_PER_ROUND = 1
/** Q: Phun Trào */
export const F_Q = "55 + 6% máu tối đa + 50% Giáp + 20% AP"
export const Q_SHRED = 20
export const SHRED = "ornn_shred"
/** E: Lao Húc */
export const F_E = "20 + 4% máu tối đa + 30% Giáp"
export const E_PER_ITEM = 10
/** E: Choáng 1 + 0,2% AP đơn vị (law.md §4) */
export const E_STUN = {
    base: 1, ap: 0.002
}

export default defineHero({
    id: "ornn", name: "Ornn", role: "tank", damage: "magic", hp: 490, atk: 64, armor: 34, mr: 34,
    desc: "Thần Rèn: đồ của cả đội mặc càng lâu càng khoẻ, Ornn che đồng minh và phạt kẻ ra tay; R rèn đồ hoàn chỉnh giữa trận.",
    passive: {
        name: "Lò Rèn Sống",
        desc: "Khi Ornn sống trên sân, Stats nền của đồ cả đội, trừ Máu và phần thích ứng, được nhân 1 + ({12% + 2% mỗi 100 AD + 2% mỗi 100 AP} + 1% mỗi tuổi món), AD/AP tham chiếu của Ornn. Mỗi lượt chủ món bắt đầu Draw khi đang mặc trên sân, món tăng 1 tuổi; không trần, giữ qua tháo/lắp/chết, ghép chuyển tổng tuổi nguồn sang món kết quả.",
    },
    itemAura(g, me, _wearer, _item, roundsWorn) {
        return (FORGE_BASE + FORGE_PER_100_AD * g.atk(me) / 100 + FORGE_PER_100_AP * g.ap(me) / 100 + FORGE_PER_ROUND * roundsWorn) / 100
    },
    skills: {
        Q: {
            key: "Q", mana: 10, name: "Phun Trào", target: "enemy",
            desc: `Chọn một tướng địch hợp lệ từ xa; gây {${F_Q}} sát thương phép và giảm 20 Giáp thực tới hết lượt địch kế tiếp. Giảm Giáp không cộng dồn cùng nguồn, tái dùng làm mới hạn; vẫn còn khi Ornn chết.`,
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
                // tới hết lượt địch kế tiếp (đang trong lượt địch thì hết chính lượt đó); không cộng dồn, tái dùng làm mới.
                // Giảm Giáp thật: status "armor_down" (engine trừ phẳng, còn khi Ornn chết); dấu SHRED giữ để hiển thị/không cộng dồn cùng nguồn.
                const fresh = !c.g.has(t,
                    SHRED)
                c.g.status(t,
                    "armor_down",
                    1,
                    {
                        v: fresh ? Q_SHRED : 0, add: true, of: otherSide(c.side)
                    })
                c.g.status(t,
                    SHRED,
                    1,
                    {
                        v: Q_SHRED, of: otherSide(c.side)
                    })
            },
        },
        E: {
            key: "E", mana: 20, name: "Lao Húc", target: "none", quick: true, chainOnly: true,
            desc: `Khi địch đánh thường đơn nhắm một tướng mình, bạn có thể dùng lá này: tự khóa kẻ đánh, gây {${F_E}} + 10 mỗi món đồ đang mặc của người bị nhắm sát thương phép và Choáng 1 + 0,2% AP đơn vị. Choáng thành công ngắt đòn gốc; bị chặn Choáng không tự hủy đòn.`,
            quickWhen(c) {
                const target = c.g.unit(c.trigger.target)
                return c.trigger.side !== c.side && c.trigger.kind === "attack" && !!c.trigger.single && !!c.trigger.actor
                    && target?.side === c.side && !target.token
            },
            resolve(c) {
                const foe = c.g.unit(c.trigger?.actor)
                const ally = c.g.unit(c.trigger?.target)
                if (!foe || !ally || foe.status !== "board") return
                c.g.damage(c.self,
                    foe,
                    c.f(F_E) + E_PER_ITEM * ally.items.length,
                    "magic",
                    {
                        tag: "skill"
                    })
                ccApply(c.g,
                    c.self,
                    foe,
                    "stun",
                    ccDuration(c.g,
                        c.self,
                        E_STUN),
                    "Ornn E Choáng")
            },
        },
        R: {
            key: "R", mana: 50, name: "Tiếng Gọi Thần Rèn", target: "ally_other",
            desc: "Chọn một đồng minh khác hợp lệ; Ornn và người đó mỗi người nhận 1 món hoàn chỉnh ngẫu nhiên trong kho 36 đồ v4. Hai lần chọn độc lập. Còn ô thì mặc ngay, hết ô về tay, tay đầy thì cháy; không đổi thành tiền hay món được chọn.",
            options: (c): PlayArgs[] => c.g.heroes(c.side).filter((u) => u.id !== c.self.id).map((u) => ({
                target: u.id
            })),
            canPlay: (c) => c.g.heroes(c.side).some((u) => u.id !== c.self.id),
            resolve(c) {
                c.g.grantItem(c.self)
                if (c.target) c.g.grantItem(c.target)
            },
        },
    },
})
