// Malphite (Đỡ đòn, phép): máu 540 · AD 78 · AP gốc 0 · giáp/kháng 35/30.
// CHẤT: "Núi đá, giáp là vũ khí": càng cứng đánh càng đau.
// Nội tại: đầu lượt bạn nhận Khiên theo máu tối đa + Giáp (không cộng dồn). Q: sát thương phép theo Giáp, lấy 15 Giáp của địch đến hết lượt sau.
// E (Quick): bị đánh thì +Giáp đến hết lượt và phạt kẻ đánh theo Giáp. R: sát thương phép theo Giáp lên mọi địch, may thì Choáng.
// Cơ chế engine dùng: hook onTurnStart, HeroDef.bonusStats (Giáp tạm từ status), HeroDef.ap (AP gốc), HeroDef.modifyDamage (mô phỏng địch mất Giáp), g.rand.
import {
    pct
} from "../formula"
import {
    defineHero
} from "../registry"
import {
    otherSide
} from "../types"

/** Trên địch: lượng Giáp bị Malphite lấy (v) */
const STOLEN = "malphite_stolen"
/** Trên Malphite: Giáp lấy được từ Q (v), đến hết lượt sau */
const LOOT = "malphite_loot"
/** Trên Malphite: Giáp cộng thêm của Sấm Động (v), đến hết lượt */
const THUNDER = "malphite_e"
const Q_STEAL = 15
export const R_STUN_BASE = 0.15
export const R_STUN_PER_10_ARMOR = 0.01
export const F_SHIELD = "5% máu tối đa + 100% Giáp"
export const F_Q = "67 + 30% AD + 40% AP + 50% Giáp"
export const F_E_ARMOR = "10 + 30% Giáp"
export const F_E_DMG = "34 + 60% Giáp + 20% AP"
export const F_R = "114 + 30% AD + 50% AP + 100% Giáp"


export default defineHero({
    id: "malphite", name: "Malphite", role: "tank", damage: "magic", hp: 540, atk: 78, armor: 35, mr: 30,
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
        desc: `Đầu lượt của bạn: Malphite nhận Khiên {${F_SHIELD}} (không cộng dồn).`,
    },
    bonusStats(g, me) {
        return {
            armor: g.statusV(me,
                LOOT) + g.statusV(me,
                THUNDER)
        }
    },
    // Địch bị lấy Giáp: sát thương vật lý lên nó tăng đúng như khi nó mất bấy nhiêu Giáp (Giáp hiển thị của nó chưa trừ)
    modifyDamage(g, me, d) {
        if (d.kind !== "physical" || d.target.token) return 1
        const st = d.target.statuses[STOLEN]
        if (!st || st.src !== me.id || d.target.side === me.side) return 1
        const armor = g.armor(d.target)
        const lost = Math.min(st.v,
            armor)
        return (100 + armor) / (100 + armor - lost)
    },
    hooks: {
        onTurnStart(g, me, d) {
            if (d.side !== me.side) return
            const want = g.f(me,
                F_SHIELD)
            if (me.shield < want) g.shield(me,
                me,
                want - me.shield)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Mảnh Vỡ Địa Chấn", target: "enemy",
            desc: `Chọn 1 tướng địch; gây {${F_Q}} sát thương phép. Malphite lấy ${Q_STEAL} Giáp của nó tới hết lượt sau.`,
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
                const take = Math.min(Q_STEAL,
                    g.armor(t) - g.statusV(t,
                        STOLEN))
                if (take <= 0) return
                const foe = otherSide(c.side)
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
            key: "E", name: "Sấm Động", target: "none", quick: true, chainOnly: true,
            desc: `Quick, Chỉ Nối Chuỗi. Khi địch đánh Malphite: tới hết lượt này Malphite +{${F_E_ARMOR}} Giáp, và kẻ đánh nhận {${F_E_DMG}} sát thương phép.`,
            quickWhen: (c) => c.trigger.side !== c.side && !!c.trigger.single && c.trigger.target === c.self.id,
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
            key: "R", name: "Không Thể Cản Phá", target: "all_enemies",
            desc: `Mọi tướng địch nhận {${F_R}} sát thương phép; mỗi tướng có {${pct(R_STUN_BASE)}% + ${pct(R_STUN_PER_10_ARMOR)}% mỗi 10 Giáp} (theo Giáp Malphite) bị Choáng 1 lượt.`,
            resolve(c) {
                const g = c.g
                const dmg = c.f(F_R)
                const chance = R_STUN_BASE + R_STUN_PER_10_ARMOR * (g.armor(c.self) / 10)
                for (const t of g.heroes(otherSide(c.side))) {
                    g.damage(c.self,
                        t,
                        dmg,
                        "magic",
                        {
                            tag: "skill"
                        })
                    if (t.status === "board" && g.rollLog(chance,
                        (hit, p) => `Malphite R: ${g.nameOf(t)} ${hit ? "bị" : "không bị"} Choáng (tỉ lệ ${p})`)) g.status(t,
                        "stun",
                        1)
                }
            },
        },
    },
})
