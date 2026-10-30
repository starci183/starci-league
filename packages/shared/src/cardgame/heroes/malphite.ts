// Malphite (Đỡ đòn, phép): máu 500 · AD 63 · AP gốc 0 · giáp/kháng 35/30.
// CHẤT: "Núi đá, giáp là vũ khí": càng cứng đánh càng đau.
// Nội tại: đầu lượt bạn nhận Khiên theo máu tối đa + Giáp (không cộng dồn). Q: sát thương phép theo Giáp, lấy 15 Giáp của địch đến hết lượt sau.
// E (Quick): bị đánh thì +Giáp đến hết lượt và phạt kẻ đánh theo Giáp. R: sát thương phép theo Giáp lên mọi địch, may thì Choáng.
// Cơ chế engine dùng: hook onTurnStart, HeroDef.bonusStats (Giáp tạm từ status), HeroDef.ap (AP gốc), status "armor_down" (địch mất Giáp phẳng).
import {
    defineHero
} from "../registry"
import {
    otherSide
} from "../types"
import {
    ccApply, ccDuration
} from "./braum"

/** Trên địch: lượng Giáp bị Malphite lấy (v) */
const STOLEN = "malphite_stolen"
/** Trên Malphite: Giáp lấy được từ Q (v), đến hết lượt sau */
const LOOT = "malphite_loot"
/** Trên Malphite: Giáp cộng thêm của Sấm Động (v), đến hết lượt */
const THUNDER = "malphite_e"
/** Lượng Khiên Đá (lớp riêng của nội tại) còn lại sau lần làm mới gần nhất */
const STONE = "malphite_stone"
const Q_STEAL = 15
/** R: Choáng 1 + 0,1% Giáp + 0,1% AP đơn vị (law.md §4; không còn roll xác suất riêng) */
export const R_STUN = {
    base: 1, armor: 0.001, ap: 0.001
}
export const F_SHIELD = "5% máu tối đa + 100% Giáp"
export const F_Q = "65 + 35% AD + 40% AP + 50% Giáp"
export const F_E_ARMOR = "10 + 30% Giáp"
export const F_E_DMG = "35 + 60% Giáp + 20% AP"
export const F_R = "115 + 35% AD + 50% AP + 100% Giáp"


export default defineHero({
    id: "malphite", name: "Malphite", role: "tank", damage: "magic", hp: 500, atk: 63, armor: 35, mr: 30,
    bot: {
        markValue: {
            malphite_stolen: 4,
        },
        buffValue: {
            malphite_loot: 4, malphite_e: 4,
        },
    },
    desc: "Ngọn núi biết đi: Giáp là vũ khí, vừa là Khiên, vừa là sát thương; lấy Giáp của địch, phạt kẻ đánh mình và mở giao tranh bằng Không Thể Cản Phá.",
    passive: {
        name: "Lá Chắn Đá",
        desc: `Đầu lượt mình thay riêng phần Khiên Đá còn lại bằng Khiên trắng {${F_SHIELD}} hiện tại. Không cộng dồn Khiên Đá, không trừ hay xóa Khiên ngoài.`,
    },
    bonusStats(g, me) {
        return {
            armor: g.statusV(me,
                LOOT) + g.statusV(me,
                THUNDER)
        }
    },
    hooks: {
        onTurnStart(g, me, d) {
            if (d.side !== me.side) return
            // thay riêng lớp Khiên Đá: gỡ phần đá còn lại (sát thương coi như ăn Khiên ngoài trước), rồi đặt lớp mới
            const left = Math.min(me.stacks[STONE] ?? 0,
                me.shield)
            me.shield -= left
            const before = me.shield
            g.shield(me,
                me,
                g.f(me,
                    F_SHIELD))
            me.stacks[STONE] = me.shield - before
        },
    },
    skills: {
        Q: {
            key: "Q", mana: 10, name: "Mảnh Vỡ Địa Chấn", target: "enemy",
            desc: `Chọn một tướng địch hợp lệ bất kể đường; gây {${F_Q}} sát thương phép. Sau đó chuyển tối đa 15 Giáp thực có của nó sang Malphite tới hết lượt địch kế tiếp; giảm nguồn thành công mới cộng đúng lượng đó.`,
            resolve(c) {
                const t = c.target!
                const g = c.g
                g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (t.status !== "board") return
                // g.armor đã trừ armor_down hiện có: chỉ lấy phần Giáp thực còn lại
                const take = Math.min(Q_STEAL,
                    g.armor(t))
                if (take <= 0) return
                const foe = otherSide(c.side)
                // Giảm Giáp thật: status "armor_down" (engine trừ phẳng, còn khi Malphite chết); dấu STOLEN giữ để hiển thị
                g.status(t,
                    "armor_down",
                    1,
                    {
                        of: foe, v: take, add: true
                    })
                g.status(t,
                    STOLEN,
                    1,
                    {
                        of: foe, v: take, add: true
                    })
                g.status(c.self,
                    LOOT,
                    1,
                    {
                        of: foe, v: take, add: true
                    })
            },
        },
        E: {
            key: "E", mana: 20, name: "Sấm Động", target: "none", quick: true, chainOnly: true,
            desc: `Khi địch đánh thường Malphite, bạn có thể dùng lá này: nhận {${F_E_ARMOR}} Giáp (đọc trước khi tăng) tới hết lượt hiện tại, rồi gây {${F_E_DMG}} sát thương phép (Giáp mới) lên kẻ đánh. Không tạo đòn thật.`,
            quickWhen: (c) => c.trigger.side !== c.side && c.trigger.kind === "attack" && !!c.trigger.single && c.trigger.target === c.self.id,
            resolve(c) {
                c.g.status(c.self,
                    THUNDER,
                    1,
                    {
                        of: otherSide(c.side), v: c.f(F_E_ARMOR), add: true
                    })
                const foe = c.g.unit(c.trigger?.actor)
                if (foe && foe.status === "board" && foe.side !== c.side) c.g.damage(c.self,
                    foe,
                    c.f(F_E_DMG),
                    "magic",
                    {
                        tag: "skill"
                    })
            },
        },
        R: {
            key: "R", mana: 35, name: "Không Thể Cản Phá", target: "all_enemies",
            desc: `Mọi tướng địch chịu {${F_R}} sát thương phép và thử Choáng 1 + 0,1% Giáp + 0,1% AP đơn vị. Nếu có quyền chiêu chí mạng, một kết quả dùng chung cho sát thương gốc cả bàn.`,
            resolve(c) {
                const g = c.g
                const dmg = c.f(F_R)
                const d = ccDuration(g,
                    c.self,
                    R_STUN)
                for (const t of g.heroes(otherSide(c.side))) {
                    g.damage(c.self,
                        t,
                        dmg,
                        "magic",
                        {
                            tag: "skill"
                        })
                    ccApply(g,
                        c.self,
                        t,
                        "stun",
                        d,
                        `Malphite R (${g.nameOf(t)})`)
                }
            },
        },
    },
})
