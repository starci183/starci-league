// Ahri (Pháp sư, phép) V3: "Mê hồn": pháp sư cân bằng sát thương và hiệu ứng; Say Mê tích vĩnh viễn, địch càng mê càng yếu và càng ăn đau. Máu 340 · AD 70 · giáp/kháng 25/28 · AP gốc 0.
// Say Mê = status "ahri_charm" (v = số tầng, vĩnh viễn FOREVER, KHÔNG trần). Khi Ahri sống trên bàn, n tầng: địch đó gây sát thương ×1/(1+0,10n) và nhận sát thương từ Ahri ×(1+0,05n) (HeroDef.modifyDamage).
// Nội tại: mỗi hit chiêu gốc trực tiếp của Ahri trúng tướng địch có min(100%, 18% + 5% mỗi 100 AD + 10% mỗi 100 AP) cơ hội +1 Say Mê (hook onDamage).
// Mục tiêu chết: engine xoá mọi status (mất Say Mê). Ahri chết: dấu giữ trên địch, modifyDamage chỉ chạy khi Ahri trên sân nên hiệu lực tạm ngừng.
// Mana bể chung (starci-33 tuning v1): Q 20 · E 30 · R 50.
import {
    pct
} from "../formula"
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    Unit
} from "../types"
import {
    FOREVER
} from "../types"

/** Status Say Mê của Ahri (v = số tầng) */
export const CHARM = "ahri_charm"
/** Không trần tầng Say Mê (tuning v1 bỏ trần 3) */
export const CHARM_MAX = Infinity
/** n tầng: sát thương địch đó gây ra nhân 1 / (1 + CHARM_WEAKEN·n) */
export const CHARM_WEAKEN = 0.1
/** Mỗi tầng: địch đó nhận thêm bấy nhiêu sát thương từ Ahri */
export const CHARM_AMP = 0.05
/** Cơ hội nội tại: 18% + 5% mỗi 100 AD + 10% mỗi 100 AP (kẹp ≤ 100%) */
export const PROC_BASE = 0.18
export const PROC_PER_100_AD = 0.05
export const PROC_PER_100_AP = 0.1
const F_PROC = `${pct(PROC_BASE)}% + ${pct(PROC_PER_100_AD)}% mỗi 100 AD + ${pct(PROC_PER_100_AP)}% mỗi 100 AP`
const F_Q = "115 + 30% AD + 70% AP"
const F_Q_TRUE = "45 + 15% AD + 30% AP"
const F_E = "70 + 30% AD + 50% AP"
const F_R = "180 + 40% AD + 100% AP"

/** Cơ hội +1 Say Mê mỗi hit chiêu (g.chance: base + ad theo 100 AD + ap theo 100 AP, kẹp [0, 1]) */
export const charmChance = (g: Game, me: Unit) => g.chance(me,
    {
        base: PROC_BASE, ad: PROC_PER_100_AD, ap: PROC_PER_100_AP
    })
/** Hệ số sát thương ra của tướng mang n tầng Say Mê */
export const charmWeaken = (n: number) => 1 / (1 + CHARM_WEAKEN * Math.max(0,
    n))
/** Thêm n tầng Say Mê (vĩnh viễn, không trần) */
export const charm = (g: Game, t: Unit, n: number) => {
    if (t.status !== "board" || t.token || n <= 0) return
    g.status(t,
        CHARM,
        1,
        {
            v: n, add: true, until: FOREVER
        })
}

export default defineHero({
    id: "ahri", name: "Ahri", role: "mage", damage: "magic", hp: 340, atk: 70, armor: 25, mr: 28,
    bot: {
        markValue: {
            ahri_charm: 25,
        },
    },
    desc: "Mê hồn: mỗi hit chiêu của Ahri có thể gắn Say Mê vĩnh viễn, không trần; địch càng mê càng yếu đòn và càng ăn đau từ Ahri. Q và E trút phép, E gắn Mê chắc chắn, R đổi chỗ với đồng minh rồi chốt kẻ đối diện.",
    passive: {
        name: "Say Mê",
        desc: `Mỗi hit chiêu gốc trực tiếp trúng tướng địch có {${F_PROC}} cơ hội gắn 1 Say Mê không tự hết hạn, không trần tầng. Khi Ahri sống trên bàn, n tầng làm sát thương mục tiêu gây ra còn 1/(1 + 0,10 × n), còn sát thương nhận từ Ahri nhân 1 + 0,05 × n. Mục tiêu chết thì mất Say Mê; Ahri chết thì dấu vẫn còn nhưng tạm ngừng hiệu lực.`,
    },
    modifyDamage(g, me, d) {
        if (!d.src) return 1
        if (d.src.side !== me.side) {
            const n = g.statusV(d.src,
                CHARM)
            return n > 0 ? charmWeaken(n) : 1
        }
        if (d.src.id === me.id && d.target.side !== me.side) {
            const n = g.statusV(d.target,
                CHARM)
            return 1 + n * CHARM_AMP
        }
        return 1
    },
    hooks: {
        onDamage(g, me, d) {
            // mỗi hit chiêu gốc thực trúng (kể cả chỉ trúng Khiên) xét 1 lần; miễn toàn lá trả 0 trước hook nên không xét
            if (d.src?.id !== me.id || d.tag !== "skill" || d.amount <= 0) return
            const t = d.target
            if (t.side === me.side || t.token || t.status !== "board") return
            if (g.rollLog(charmChance(g,
                me),
            (hit, p) => (hit ? `Ahri: ${g.nameOf(t)} +1 Say Mê (tỉ lệ ${p})` : undefined))) charm(g,
                t,
                1)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Quả Cầu Ma Lực", target: "enemy", mana: 20,
            desc: `Chọn 1 tướng địch bất kỳ đường: gây {${F_Q}} sát thương phép; 1 tướng địch khác ngẫu nhiên hợp lệ nhận {${F_Q_TRUE}} sát thương chuẩn. Mỗi hit riêng xét Say Mê.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                const other = c.g.pick(c.g.targetableEnemies(c.self).filter((x) => x.id !== t.id && !x.token))
                if (other) c.g.log(`Ahri Q: sát thương chuẩn ngẫu nhiên trúng ${c.g.nameOf(other)}`)
                if (other) c.g.damage(c.self,
                    other,
                    c.f(F_Q_TRUE),
                    "true",
                    {
                        tag: "skill"
                    })
            },
        },
        E: {
            key: "E", name: "Mê Hoặc", target: "enemy", mana: 30,
            desc: `Chọn 1 tướng địch: gây {${F_E}} sát thương phép rồi chắc chắn thêm 1 Say Mê nếu nó còn nhận hiệu ứng; hit cũng xét cơ hội nội tại, nên có thể nhận tổng 2 tầng. Khiên thường không chặn dấu, miễn toàn lá chặn cả hai.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_E),
                    "magic",
                    {
                        tag: "skill"
                    })
                charm(c.g,
                    t,
                    1)
            },
        },
        R: {
            key: "R", name: "Phi Hồ", target: "ally_other", mana: 50,
            desc: `Chọn 1 đồng minh khác hợp lệ, đổi chỗ với Ahri; chỉ khi đổi chỗ thành công, tướng địch hợp lệ đối diện vị trí mới nhận {${F_R}} sát thương phép. Không cần dấu sẵn, không tự hồi và không cấp quyền đánh.`,
            resolve(c) {
                if (!c.g.swapWith(c.self,
                    c.target!)) return
                const front = c.g.opposite(c.self)
                if (front && !front.token) c.g.damage(c.self,
                    front,
                    c.f(F_R),
                    "magic",
                    {
                        tag: "skill"
                    })
            },
        },
    },
})
