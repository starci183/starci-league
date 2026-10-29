// Viktor (Pháp sư, phép): máu 740 · AD 60 · giáp/kháng 28/30. Lối chơi: TIẾN HOÁ BẰNG MỘ BÀI (động cơ bài).
// Bậc của MỌI chiêu = số lá Viktor đang nằm trong mộ bài của bạn / 3 (tối đa 3), nhìn thấy ngay ở mộ: không có điểm hay bộ đếm ẩn.
// Combo: Nami/TF rút nhiều -> đánh nhiều lá Viktor -> lên bậc nhanh. Khắc chế: Soraka R/xáo mộ làm mất bậc, Blitzcrank cướp bài.
// Bão của R là status "storm" trên mục tiêu (hiện trên tướng).
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    Unit
} from "../types"

const F_Q = "110 + 20% AD + 50% AP"
const F_Q_SHIELD = "25 + 20% AP"
const F_E = "85 + 20% AD + 40% AP"
const F_STORM = "60 + 30% AP"
const T1_BONUS = 0.2
const ECHO = 0.5
const STORM_TURNS = 3
const STORM = "storm"

const PER_TIER = 2
const tierOf = (g: Game, u: Unit) => Math.min(3,
    Math.floor(g.player(u.side).grave.filter((x) => x.kind === "skill" && x.hero === "viktor").length / PER_TIER))

/** Bão đánh 1 lần lên mọi địch đang bị bão của Viktor */
function stormTick(g: Game, me: Unit) {
    for (const t of g.enemies(me)) if (g.has(t,
        STORM)) g.damage(me,
        t,
        g.f(me,
            F_STORM),
        "magic",
        {
            tag: "skill"
        })
}

export default defineHero({
    id: "viktor", name: "Viktor", role: "mage", damage: "magic", hp: 790, atk: 62, armor: 28, mr: 30,
    skillCopies: {
        Q: 8, E: 7, R: 2
    },
    supportCopies: {
        basic: 5
    },
    desc: "Cỗ máy tiến hoá: mỗi 2 lá Viktor nằm trong mộ nâng cả ba chiêu lên một bậc. Đi cùng tướng rút bài (Nami, Twisted Fate) để lên bậc 3 thật nhanh.",
    passive: {
        name: "Tiến Hoá Vinh Quang",
        desc: "Bậc của mọi chiêu Viktor = **số lá Viktor trong mộ bài của bạn chia 2** (tối đa bậc 3). Bộ bài Viktor có 8 Q, 7 E và chỉ 5 Đánh thường.",
    },
    hooks: {
        onTurnStart(g, me, d) {
            if (d.side === me.side) stormTick(g,
                me)
        },
        onCast(g, me, d) {
            if (d.caster.id === me.id && (d.skill.key === "Q" || d.skill.key === "E") && tierOf(g,
                me) >= 3) stormTick(g,
                me)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Tia Hấp Thụ", target: "enemy",
            desc: `{${F_Q}} sát thương phép lên 1 tướng địch, Viktor nhận Khiên {${F_Q_SHIELD}}. **Bậc 1:** +${T1_BONUS * 100}% sát thương. **Bậc 2:** Khiên gấp đôi. **Bậc 3:** bạn rút 1 lá.`,
            resolve(c) {
                const t = c.target!, tier = tierOf(c.g,
                    c.self)
                c.g.damage(c.self,
                    t,
                    c.f(F_Q) * (tier >= 1 ? 1 + T1_BONUS : 1),
                    "magic",
                    {
                        tag: "skill"
                    })
                c.g.shield(c.self,
                    c.self,
                    c.f(F_Q_SHIELD) * (tier >= 2 ? 2 : 1))
                if (tier >= 3) c.g.draw(c.side,
                    1,
                    {
                        reason: "skill", by: c.self.id
                    })
            },
        },
        E: {
            key: "E", name: "Tia Huỷ Diệt", target: "enemies_upto", max: 2,
            desc: `{${F_E}} sát thương phép lên tối đa 2 tướng địch. **Bậc 1:** +${T1_BONUS * 100}% sát thương. **Bậc 2:** mục tiêu bị Buốt 1 lượt. **Bậc 3:** dư chấn ngay: thêm ${ECHO * 100}% sát thương nữa.`,
            resolve(c) {
                const tier = tierOf(c.g,
                    c.self)
                const raw = c.f(F_E) * (tier >= 1 ? 1 + T1_BONUS : 1)
                for (const t of c.targets) {
                    c.g.damage(c.self,
                        t,
                        raw,
                        "magic",
                        {
                            tag: "skill"
                        })
                    if (tier >= 2) c.g.status(t,
                        "chill",
                        1)
                    if (tier >= 3) c.g.damage(c.self,
                        t,
                        raw * ECHO,
                        "magic",
                        {
                            tag: "skill"
                        })
                }
            },
        },
        R: {
            key: "R", name: "Bão Hỗn Loạn", target: "enemy",
            desc: `Bão bám 1 tướng địch ${STORM_TURNS} lượt, đánh ngay 1 lần và đầu mỗi lượt của bạn gây {${F_STORM}} sát thương phép. **Bậc 1:** thêm 1 lượt. **Bậc 2:** Câm Lặng 1 lượt khi bão xuất hiện. **Bậc 3:** mỗi lần Viktor dùng Q/E khi bão còn, bão đánh thêm 1 lần.`,
            resolve(c) {
                const t = c.target!, tier = tierOf(c.g,
                    c.self)
                const ticks = STORM_TURNS + (tier >= 1 ? 1 : 0)
                c.g.status(t,
                    STORM,
                    ticks + 1,
                    {
                        of: c.side
                    })
                c.g.damage(c.self,
                    t,
                    c.f(F_STORM),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (tier >= 2) c.g.status(t,
                    "silence",
                    1)
            },
        },
    },
})
