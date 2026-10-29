// Lux (Pháp sư, phép) V3: "Bể ánh sáng": mana tiêu ra không mất mà dồn vào Bể Mana; Bể càng đầy E và R càng đau. Máu 320 · AD 94 · giáp/kháng 25/28 · AP gốc 72.
// Nội tại: mọi mana Lux tiêu (hook onManaSpent) cộng vĩnh viễn vào Bể Mana (stack "lux_pool" trên Lux, không mất khi chết).
// Q (0 mana) hồi mana + Khiên · E (30) sát thương + 10% Bể, Bể từ 150 thì Choáng · R (toàn bộ mana, tối thiểu 20) sát thương theo mana đã tiêu và 25% Bể.
// Cơ chế engine dùng: onManaSpent, SkillDef.mana "all" + ctx.manaPaid, g.gainMana.
import {
    pct
} from "../formula"
import {
    defineHero
} from "../registry"

/** Stack Bể Mana trên Lux */
export const POOL = "lux_pool"
/** AP gốc (V3: bằng AD gốc cũ) */
export const BASE_AP = 72
/** E: sát thương cộng thêm theo phần trăm Bể Mana */
export const E_POOL_PCT = 0.1
/** E: Bể Mana từ mức này thì Choáng mục tiêu 1 lượt */
export const E_STUN_POOL = 150
/** R: sát thương cộng thêm mỗi điểm mana đã tiêu lần này */
export const R_PER_MANA = 1.5
/** R: sát thương cộng thêm theo phần trăm Bể Mana */
export const R_POOL_PCT = 0.25
/** R cần ít nhất bấy nhiêu mana mới đánh được (tránh xả 0 mana) */
export const R_MIN_MANA = 20
const F_Q_RESTORE = "20 + 5% AD + 10% AP"
const F_Q_SHIELD = "20 + 10% AD + 40% AP"
const F_E = "20 + 30% AD + 60% AP"
const F_R = "15% AD + 30% AP"

export default defineHero({
    id: "lux", name: "Lux", role: "mage", damage: "magic", hp: 320, atk: 94, armor: 25, mr: 28, ap: BASE_AP,
    bot: {
        stackValue: {
            lux_pool: 0.3,
        },
    },
    desc: "Bể ánh sáng: mana tiêu ra không mất mà dồn vào Bể Mana. Q nạp mana và che thân, E đánh theo Bể (đủ đầy thì Choáng), R xả hết mana thành một phát cực lớn. Bể càng đầy, Lux càng khủng về cuối trận.",
    passive: {
        name: "Bể Ánh Sáng",
        desc: "Mọi mana Lux tiêu đều cộng vĩnh viễn vào Bể Mana (không mất khi Lux chết).",
    },
    hooks: {
        onManaSpent(g, me, d) {
            if (d.unit.id === me.id && d.amount > 0) g.stack(me,
                POOL,
                d.amount)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Lăng Kính", target: "none", mana: 0,
            desc: `Hồi {${F_Q_RESTORE}} mana và Lux nhận Khiên {${F_Q_SHIELD}}.`,
            resolve(c) {
                c.g.gainMana(c.self,
                    Math.round(c.f(F_Q_RESTORE)),
                    "restore")
                c.g.shield(c.self,
                    c.self,
                    c.f(F_Q_SHIELD))
            },
        },
        E: {
            key: "E", name: "Khoá Ánh Sáng", target: "enemy", mana: 30,
            desc: `Chọn 1 tướng địch; gây {${F_E}} cộng ${pct(E_POOL_PCT)}% Bể Mana sát thương phép. Nếu Bể Mana từ ${E_STUN_POOL} trở lên: Choáng nó 1 lượt.`,
            resolve(c) {
                const t = c.target!
                const pool = c.g.stackOf(c.self,
                    POOL)
                c.g.damage(c.self,
                    t,
                    c.f(F_E) + pool * E_POOL_PCT,
                    "magic",
                    {
                        tag: "skill"
                    })
                if (pool >= E_STUN_POOL) c.g.status(t,
                    "stun",
                    1)
            },
        },
        R: {
            key: "R", name: "Cầu Vồng Tối Thượng", target: "enemy", mana: "all",
            desc: `Cần ít nhất ${R_MIN_MANA} mana. Tiêu toàn bộ mana; chọn 1 tướng địch, gây {${F_R}} cộng ${R_PER_MANA} mỗi mana đã tiêu và ${pct(R_POOL_PCT)}% Bể Mana sát thương phép.`,
            canPlay: (c) => c.g.manaOf(c.self) >= R_MIN_MANA,
            resolve(c) {
                const t = c.target!
                const pool = c.g.stackOf(c.self,
                    POOL)
                c.g.damage(c.self,
                    t,
                    c.f(F_R) + c.manaPaid * R_PER_MANA + pool * R_POOL_PCT,
                    "magic",
                    {
                        tag: "skill"
                    })
            },
        },
    },
})
