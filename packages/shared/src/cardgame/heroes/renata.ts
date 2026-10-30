// Renata Glasc (Trợ thủ, phép): máu 410 · AD 65 · AP gốc 0 · giáp/kháng 25/28. Bản cân bằng starci-33 (support v7).
// CHẤT: "Địch có dám đánh không": cứu đồng minh khỏi bị hạ để phản công, phản đòn kẻ tấn công, và bắt cả đội địch quay sang đánh nhau.
// P: đồng minh khác sắp bị hạ → đặt Máu (không phải hồi máu) = 25% máu tối đa của nó + {35 + 20% AD + 25% AP}, gắn Cuồng Bạo
//   (sát thương mỗi đòn chốt theo chỉ số Renata lúc cứu) tới hết lượt sau của nó; 1 lần mỗi đồng minh mỗi trận. Thứ tự cứu: Soraka P trước.
// Q: 1 tướng mình +Giáp 1 đơn vị (armor_up, không cộng dồn, giữ giá trị cao hơn). E (Quick): sau hành động đánh của địch,
//   kẻ đánh nhận 40% D + phần cố định (sát thương chuẩn), D = Máu + Khiên thực mất từ hành động đó. R: mọi địch đánh 1 đồng đội ngẫu nhiên.
// Engine: hook onLethal (g.lethalPipeline) + g.surviveWith, status "frenzy" (engine cộng mỗi đòn), onDamage/onAttackHit/onDeath + g.chainFx() (ReactFx mở rộng).
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    otherSide, type ReactFx
} from "../types"

export const REVIVED = "renata_rev"
export const FRENZY = "frenzy"
export const REVIVE_PCT = 0.3
/** P: Máu được đặt (thay cho hồi sinh) */
export const F_REVIVE = "30% máu tối đa mục tiêu + 40 + 25% AD + 30% AP"
/** Cuồng Bạo: sát thương cộng thêm cho MỖI đòn đánh trúng (chốt lúc cứu) */
export const F_FRENZY = "50 + 25% AD + 30% AP"
/** Q: Giáp cộng thêm 1 đơn vị */
export const F_Q_ARMOR = "15 + 15% AD + 20% AP"
export const Q_ARMOR = "armor_up"
/** E: phần phản theo sát thương thực nhận D */
export const REFLECT = 0.4
/** E: phần cố định (1 lần mỗi hành động đánh) */
export const F_REFLECT = "25 + 25% AD + 60% AP"

/** Phản đòn của Gói Cứu Trợ đi kèm đối tượng fx của mắt xích bên dưới (hành động đánh của địch) */
interface RenataGuard { unit: string; attacker: string; flat: number; d: number; done: boolean; owner: string }
type RenataFx = ReactFx & { renataGuard?: RenataGuard }

const guardOf = (g: Game): RenataGuard | undefined => (g.s.fx as RenataFx | undefined)?.renataGuard

/** Chốt phản đòn: kẻ đánh còn trên sân và D > 0 */
function settle(g: Game, gd: RenataGuard) {
    if (gd.done) return
    gd.done = true
    const attacker = g.unit(gd.attacker)
    const prot = g.unit(gd.unit)
    if (!attacker || attacker.status !== "board" || gd.d <= 0 || !prot) return
    const amount = REFLECT * gd.d + gd.flat
    g.log(`Renata E: ${g.nameOf(attacker)} nhận ${Math.round(amount)} sát thương chuẩn phản đòn (D = ${gd.d})`)
    g.damage(prot,
        attacker,
        amount,
        "true",
        {
            tag: "effect"
        })
}

export default defineHero({
    id: "renata", name: "Renata Glasc", role: "support", damage: "magic", hp: 350, atk: 65, armor: 25, mr: 28,
    bot: {
        buffValue: {
            frenzy: 1,
        },
    },
    desc: "Nữ tài phiệt Zaun, chuyên lật kèo: đồng minh sắp gục được giữ lại để phản công, kẻ ra tay bị phản đòn, và cả đội địch quay sang đánh nhau.",
    passive: {
        name: "Cứu Trợ",
        desc: `Khi 1 tướng mình khác Renata sắp bị hạ và chưa được Cứu Trợ trong trận: giữ nó sống với {${F_REVIVE}} Máu, không vượt Máu tối đa của nó. Sau đó, gắn Cuồng Bạo tới hết lượt sau của nó: mỗi đòn đánh trúng của nó gây thêm {${F_FRENZY}} sát thương (chốt theo chỉ số Renata lúc cứu). Mỗi đồng minh chỉ được cứu 1 lần mỗi trận.`,
    },
    hooks: {
        onLethal(g, me, d) {
            const t = d.target
            if (t.side !== me.side || t.id === me.id || t.token || t.hp > 0 || t.status !== "board" || g.stackOf(t,
                REVIVED) > 0) return
            // thứ tự cứu: g.lethalPipeline chạy Soraka P trước (RULES.lethalOrder) và dừng khi đã cứu được
            g.setStack(t,
                REVIVED,
                1)
            const hp = Math.min(t.maxHp,
                g.f(me,
                    F_REVIVE,
                    t))
            const bonus = Math.round(g.f(me,
                F_FRENZY))
            g.surviveWith(t,
                hp)
            // tới hết lượt kế của nó: đang là lượt nó thì tính cả lượt sau
            g.status(t,
                FRENZY,
                1,
                {
                    v: bonus,
                    until: g.turnsUntil(t.side,
                        g.s.active === t.side ? 2 : 1)
                })
        },
        // Cuồng Bạo: engine tự cộng sát thương mỗi đòn từ status "frenzy" (v = sát thương đã chốt; vẫn hiệu lực khi Renata rời sân)
        onDamage(g, me, d) {
            // Gói Cứu Trợ: cộng D = Khiên + Máu thực mất (không tính overkill) từ các phần của đòn đánh gốc
            const gd = guardOf(g)
            if (!gd || gd.done || gd.owner !== me.id || d.target.id !== gd.unit || d.src?.id !== gd.attacker || d.tag !== "attack") return
            gd.d += Math.max(0,
                d.hpLost) + Math.max(0,
                d.absorbed)
        },
        onAttackHit(g, me, d) {
            const gd = guardOf(g)
            if (!gd || gd.done || gd.owner !== me.id || d.attacker.id !== gd.attacker || d.target.id !== gd.unit) return
            const info = d.info as typeof d.info & { hitIndex?: number; hits?: number }
            if (info.hits !== undefined && info.hitIndex !== undefined && info.hitIndex < info.hits - 1) return // còn hit sau trong cùng hành động
            settle(g,
                gd)
        },
        onDeath(g, me, d) {
            // Renata là người được bảo vệ và bị hạ: hành động đánh đã xong phần trúng nó, chốt phản đòn ngay
            const gd = guardOf(g)
            if (!gd || gd.done || gd.owner !== me.id || d.victim.id !== me.id || gd.unit !== me.id) return
            settle(g,
                gd)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Bắt Tay", target: "ally", mana: 10, usesPerCycle: 1,
            desc: `Chọn 1 tướng mình; nó nhận {${F_Q_ARMOR}} Giáp trong 1 đơn vị. Nhiều lần buff Giáp này không cộng dồn (giữ giá trị cao hơn và làm mới thời hạn).`,
            resolve(c) {
                const t = c.target!
                const armor = Math.round(c.f(F_Q_ARMOR))
                c.g.status(t,
                    Q_ARMOR,
                    1,
                    {
                        v: Math.max(armor,
                            c.g.statusV(t,
                                Q_ARMOR)),
                        until: c.g.turnsUntil(otherSide(c.side),
                            1)
                    })
            },
        },
        E: {
            key: "E", name: "Gói Cứu Trợ", target: "none", quick: true, chainOnly: true, mana: 20, usesPerCycle: 1,
            desc: `Quick, Chỉ Nối Chuỗi. Khi địch đánh thường (trên cùng Chuỗi) chỉ định đúng 1 tướng mình: sau hành động đánh đó, nếu D > 0, kẻ đánh nhận ${REFLECT * 100}% D + {${F_REFLECT}} sát thương chuẩn (D = Máu + Khiên tướng đó thực mất từ hành động đánh). Phần cố định chỉ tính 1 lần cho cả hành động. Không giảm sát thương gốc.`,
            quickWhen(c) {
                const target = c.g.unit(c.trigger.target)
                return c.trigger.side !== c.side && c.trigger.kind === "attack" && !!c.trigger.single
                    && target?.side === c.side && !target.token
            },
            resolve(c) {
                const fx = c.g.chainFx() as RenataFx
                if (!c.trigger?.target || !c.trigger.actor) return
                fx.renataGuard = {
                    unit: c.trigger.target, attacker: c.trigger.actor, flat: c.f(F_REFLECT), d: 0, done: false, owner: c.self.id
                }
            },
        },
        R: {
            key: "R", name: "Hợp Chất Điên Loạn", target: "all_enemies", mana: 25, usesPerCycle: 1,
            desc: "Lần lượt mọi tướng địch còn khả năng đánh thực hiện 1 hành động đánh thường vào 1 đồng đội khác của nó được chọn ngẫu nhiên. Số đòn theo Tốc Đánh, chỉ số và hiệu ứng đòn đánh hợp lệ của chính người ra đòn.",
            resolve(c) {
                const g = c.g
                const foe = otherSide(c.side)
                // danh sách chốt 1 lần, theo đường trái → phải
                const list = g.heroes(foe).sort((a, b) => a.lane - b.lane)
                for (const u of list) {
                    if (g.s.phase === "over") break
                    if (u.status !== "board" || !g.canAttack(u)) continue
                    const mates = g.heroes(foe).filter((x) => x.id !== u.id && g.targetable(x))
                    const victim = g.pick(mates)
                    if (!victim) continue
                    g.log(`Renata R: ${g.nameOf(u)} quay sang đánh ${g.nameOf(victim)}`)
                    g.attackAction(u,
                        victim)
                }
            },
        },
    },
})
