// Janna (Trợ thủ, phép): máu 410 · AD 67 · AP gốc 0 · giáp/kháng 26/29. Bản cân bằng starci-33 (support v7).
// CHẤT: "Hộ Phong": Khiên của cả đội mạnh hơn, và tướng mình còn Khiên thì đánh nhanh hơn, chịu ít sát thương hơn.
// P (hào quang khi Janna trên sân): mọi Khiên mới lên tướng mình +20% (HeroDef.shieldGivenMult, áp 1 lần mỗi Khiên mới);
//   tướng mình còn Khiên: +Tốc Đánh = 50% tổng Khiên hiện tại (tối đa +150; đọc qua jannaAttackSpeedBonus) và giảm 10% sát thương nhận (modifyDamage).
// Q: Thanh Tẩy 1 tướng mình (CLEANSE_IDS dùng chung với phép Thanh Tẩy). E: Khiên 1 tướng mình.
// R (Quick khi đòn đánh/lá chiêu của địch nhắm vào tướng mình): Khiên cả đội + giảm 15% sát thương nhận 1 đơn vị (status dmgCut).
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    CLEANSE_IDS
} from "../spells"
import {
    otherSide, type Unit
} from "../types"

/** P: hệ số Khiên mới nhận của tướng mình */
export const SHIELD_AMP = 0.2
/** P: Tốc Đánh cộng thêm mỗi 1 điểm Khiên hiện có */
export const AS_PER_SHIELD = 0.5
export const AS_CAP = 150
/** P: hệ số sát thương nhận khi còn Khiên */
export const P_DR = 0.1
export const F_E = "115 + 75% AP + 5% máu tối đa"
export const F_R = "60 + 25% AP"
/** R: giảm sát thương nhận trong 1 đơn vị */
export const R_DR = 0.15

/** Có Janna của phe `side` đang trên sân không */
const jannaOn = (g: Game, side: Unit["side"]) => g.heroes(side).some((u) => u.hero === "janna")
/** Hiệu ứng xấu Thanh Tẩy gỡ được trên u */
export const cleansable = (g: Game, u: Unit) => CLEANSE_IDS.filter((id) => g.has(u,
    id))
/** P: Tốc Đánh cộng thêm cho u từ hào quang Janna (0 nếu không còn Khiên hoặc không có Janna trên sân). Engine đọc qua HeroDef.attackSpeedAura. */
export function jannaAttackSpeedBonus(g: Game, u: Unit): number {
    const sh = g.totalShield(u) // mọi loại Khiên (trắng/vật lý/phép)
    if (u.status !== "board" || u.token || sh <= 0 || !jannaOn(g,
        u.side)) return 0
    return Math.min(AS_CAP,
        sh * AS_PER_SHIELD)
}

export default defineHero({
    id: "janna", name: "Janna", role: "support", damage: "magic", hp: 350, atk: 67, armor: 26, mr: 29,
    bot: {
        buffValue: {
            dmgCut: 60,
        },
    },
    desc: "Hiện Thân Bão Tố: Khiên của cả đội dày hơn, tướng còn Khiên đánh nhanh và chịu ít sát thương; Thanh Tẩy đồng minh, che Khiên và nổi Gió Mùa che cả đội.",
    passive: {
        name: "Hộ Phong",
        desc: `① Trong khi Janna ở trên sân, mọi tướng mình nhận thêm ${SHIELD_AMP * 100}% Khiên từ mọi nguồn. ② Mỗi tướng mình còn Khiên nhận thêm Tốc Đánh bằng ${AS_PER_SHIELD * 100}% tổng Khiên hiện tại, tối đa +${AS_CAP} Tốc Đánh, và giảm ${P_DR * 100}% sát thương nhận. Khi hết Khiên hoặc Janna rời sân, mất phần Tốc Đánh và giảm sát thương này.`,
    },
    // ① Khiên mới lên tướng mình (mọi nguồn) nhân 1.2, chỉ 1 lần cho mỗi Khiên mới
    shieldGivenMult(_g, owner, _source, target) {
        return owner.status === "board" && target.side === owner.side && !target.token ? 1 + SHIELD_AMP : 1
    },
    // ② hào quang Tốc Đánh cho tướng mình còn Khiên (kể cả Janna); chỉ 1 Janna mỗi phe cộng (engine cộng aura của mọi tướng trên sân)
    attackSpeedAura(g, me, u) {
        if (me.status !== "board" || u.side !== me.side) return 0
        if (g.heroes(me.side).find((x) => x.hero === "janna")?.id !== me.id) return 0
        return jannaAttackSpeedBonus(g,
            u)
    },
    // ② giảm 10% sát thương địch gây cho tướng mình đang còn Khiên (nhân với giảm sát thương khác, không cộng)
    modifyDamage(g, me, d) {
        const t = d.target
        if (t.side !== me.side || t.token || g.totalShield(t) <= 0 || !d.src || d.src.side === me.side) return 1
        return 1 - P_DR
    },
    skills: {
        Q: {
            key: "Q", name: "Thanh Tẩy", target: "ally", mana: 10, usesPerCycle: 1,
            desc: "Chọn 1 tướng mình đang có hiệu ứng bất lợi được Thanh Tẩy; gỡ các hiệu ứng đó khỏi nó.",
            options(c) {
                return c.g.allies(c.self).filter((u) => !u.token && cleansable(c.g,
                    u).length > 0).map((u) => ({
                    target: u.id
                }))
            },
            resolve(c) {
                const t = c.target!
                for (const id of cleansable(c.g,
                    t)) c.g.removeStatus(t,
                    id)
                // chỉ số xấu có thời hạn (nếu engine dùng statModifiers): gỡ phần đánh dấu harmful
                if (t.statModifiers) for (const [k,
                    m] of Object.entries(t.statModifiers)) if (m.harmful) delete t.statModifiers[k]
            },
        },
        E: {
            key: "E", name: "Mắt Bão", target: "ally", mana: 20, usesPerCycle: 1,
            desc: `Chọn 1 tướng mình; nó nhận Khiên {${F_E}}.`,
            resolve(c) {
                c.g.shield(c.self,
                    c.target!,
                    c.f(F_E))
            },
        },
        R: {
            key: "R", name: "Gió Mùa", target: "none", quick: true, mana: 20, usesPerCycle: 1,
            desc: `Quick. Mọi tướng mình trên sân nhận Khiên {${F_R}} và giảm ${R_DR * 100}% sát thương nhận trong 1 đơn vị. Có thể nối khi địch đánh thường hoặc dùng lá chiêu gây sát thương nhắm vào tướng mình (trên cùng Chuỗi).`,
            quickWhen(c) {
                const t = c.g.unit(c.trigger.target)
                return c.trigger.side !== c.side && (c.trigger.kind === "attack" || c.trigger.kind === "skill")
                    && !!t && t.side === c.side && !t.token
            },
            resolve(c) {
                const g = c.g
                const amount = c.f(F_R)
                const until = g.turnsUntil(otherSide(c.side),
                    1)
                for (const u of g.heroes(c.side)) {
                    g.shield(c.self,
                        u,
                        amount)
                    g.status(u,
                        "dmgCut",
                        1,
                        {
                            v: Math.max(R_DR,
                                g.statusV(u,
                                    "dmgCut")),
                            until
                        })
                }
            },
        },
    },
})
