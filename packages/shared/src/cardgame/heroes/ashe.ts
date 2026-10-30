// Ashe (Xạ thủ, vật lý): máu 360 · AD 80 · giáp/kháng 26/26. Chất: CHỒNG BUỐT, địch yếu dần, Buốt càng dày Ashe càng đau.
// Buốt = status "frost" (v = số chồng, VÔ HẠN, không tự hết; mất khi tướng mang chết). KHÔNG phải "chill" của engine.
// Buốt không bao giờ bị chiêu của Ashe xoá. Khi Ashe còn trên sân, mọi sát thương tướng mang gây ra nhân 1 / (1 + Buốt / 30) (HeroDef.modifyDamage):
// tích vô hạn vẫn luôn còn sát thương dương (10/30/60 Buốt còn 75%/50%/33,33%).
// Ashe đánh được mọi địch chọn được đang có Buốt, bỏ qua đỡ đòn/khiêu khích (HeroDef.extraAttackTargets), nhưng đòn lên tướng đã có Buốt không chí mạng (info.noCrit).
// Tuning v1: mana Q/E/R = 10/15/35; E bonus không nhân chí mạng đòn chính; R Choáng d = 0,70 + 0,005·AD + 0,005·AP đơn vị (phần lẻ là xác suất +1).
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    FOREVER, type Unit
} from "../types"

const FROST = "frost"
const EDGE = "ashe_e"
/** Mẫu số của hệ số giảm sát thương: nhân 1 / (1 + Buốt / FROST_DENOMINATOR) */
export const FROST_DENOMINATOR = 30
const F_Q = "55 + 200% AD + 25% AP"
const Q_FROST = 3
const F_E_BONUS = "40 + 110% AD + 15% AP"
const E_FROST = 2
const F_R = "110 + 180% AD + 35% AP"
const R_FROST = 5
/** R: thời hạn Choáng d (đơn vị lượt) = 0,70 + 0,005 × AD + 0,005 × AP */
export const F_R_STUN = "0.7 + 0.5% AD + 0.5% AP"

/** Hệ số sát thương ra của tướng mang `n` Buốt */
export const frostMult = (n: number) => (n > 0 ? 1 / (1 + n / FROST_DENOMINATOR) : 1)

/** Cộng n Buốt (không trần, không tự hết) */
export function addFrost(g: Game, t: Unit, n: number) {
    if (t.status !== "board" || t.token || n <= 0) return
    g.status(t,
        FROST,
        1,
        {
            v: n, add: true, until: FOREVER
        })
}

export default defineHero({
    id: "ashe", name: "Ashe", role: "marksman", damage: "physical", hp: 360, atk: 80, armor: 26, mr: 26,
    bot: {
        markValue: {
            frost: 25,
        },
    },
    desc: "Bắn đều là chồng đều: Buốt làm địch đánh yếu đi, Ashe với tới cả hàng sau, đến lúc cần thì đóng băng một mục tiêu.",
    passive: {
        name: "Băng Tiễn",
        desc: "Mỗi đòn thật trúng tướng địch gắn 1 Buốt, vô hạn, không tự hết; người mang chết thì mất dấu. Khi Ashe còn trên bàn, mọi sát thương người mang gây ra nhân 1 / (1 + Buốt / 30). Đòn vào người đã có Buốt bỏ qua ép đánh Đỡ Đòn/Khiêu Khích, nhưng phải chọn được và không chí mạng.",
    },
    hooks: {
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id) return
            // Đòn lên tướng đã có Buốt không thể chí mạng
            if (g.statusV(d.target,
                FROST) > 0) d.info.noCrit = true
        },
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss || d.target.token || d.target.side === me.side) return
            const edge = g.has(me,
                EDGE)
            // E: sát thương cộng thêm là gói riêng, không nhân chí mạng của đòn chính
            if (edge) g.damage(me,
                d.target,
                g.f(me,
                    F_E_BONUS),
                "physical",
                {
                    tag: "attack"
                })
            addFrost(g,
                d.target,
                edge ? E_FROST : 1)
        },
    },
    extraAttackTargets(g, me) {
        return g.enemies(me).filter((u) => !u.token && g.targetable(u) && g.statusV(u,
            FROST) > 0)
    },
    modifyDamage(g, me, d) {
        // Buốt: sát thương kẻ mang gây ra nhân 1 / (1 + Buốt / 30) (mọi loại sát thương), chỉ khi Ashe còn trên sân
        if (!d.src || d.src.side === me.side || d.src.token) return 1
        return frostMult(g.statusV(d.src,
            FROST))
    },
    skills: {
        Q: {
            key: "Q", mana: 5, name: "Tên Băng", target: "enemy",
            desc: `Chọn 1 tướng địch hợp lệ; gây {${F_Q}} sát thương vật lý và gắn ${Q_FROST} Buốt.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "physical",
                    {
                        tag: "skill"
                    })
                addFrost(c.g,
                    t,
                    Q_FROST)
            },
        },
        E: {
            key: "E", mana: 10, name: "Tập Trung", target: "self",
            desc: `Tới hết lượt hiện tại, mỗi đòn thật trúng của Ashe gây thêm {${F_E_BONUS}} sát thương vật lý và gắn ${E_FROST} Buốt thay vì 1; không tự tạo đòn.`,
            resolve(c) {
                c.g.status(c.self,
                    EDGE,
                    1)
            },
        },
        R: {
            key: "R", mana: 30, name: "Đại Băng Tiễn", target: "enemy",
            desc: `Chọn 1 tướng địch hợp lệ; gây {${F_R}} sát thương vật lý, gắn ${R_FROST} Buốt và Choáng d = {${F_R_STUN}} đơn vị. Lấy phần nguyên chắc chắn, phần lẻ là xác suất thêm 1 đơn vị.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_R),
                    "physical",
                    {
                        tag: "skill"
                    })
                addFrost(c.g,
                    t,
                    R_FROST)
                if (t.status !== "board") return
                // engine tự tung phần lẻ một lần sau kiểm tra miễn (law.md §4)
                const d = c.f(F_R_STUN)
                if (d > 0) c.g.status(t,
                    "stun",
                    d)
            },
        },
    },
})
