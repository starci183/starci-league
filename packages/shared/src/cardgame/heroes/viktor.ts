// Viktor (Pháp sư, phép): máu 740 · AD 60 · giáp/kháng 28/30. Lối chơi: TỰ TIẾN HOÁ.
// Điểm mỗi chiêu nằm trong stacks "pts_Q|pts_E|pts_R"; bậc suy ra từ điểm (Q/E: 3 điểm/bậc, R: 1 điểm/bậc, tối đa bậc 3).
// Dư chấn của E bậc 3 lưu trong stacks "echo:<id mục tiêu>"; bão của R là status "storm" trên mục tiêu.
import {
    defineHero
} from "../registry"
import type {
    Game
} from "../game"
import type {
    SkillKey, Unit
} from "../types"

const F_Q = "50 + 20% AD + 50% AP"
const F_Q_SHIELD = "20 + 20% AP"
const F_E = "40 + 20% AD + 40% AP"
const F_STORM = "40 + 30% AP"
const T1_BONUS = 0.15
const ECHO = 0.5
const STORM_TURNS = 3
const STORM = "storm"

const PTS_PER_TIER: Record<SkillKey, number> = {
    Q: 3, E: 3, R: 1
}
const tierOf = (g: Game, u: Unit, key: SkillKey) => Math.min(3,
    Math.floor(g.stackOf(u,
        `pts_${key}`) / PTS_PER_TIER[key]))

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
    id: "viktor", name: "Viktor", role: "mage", damage: "magic", hp: 740, atk: 60, armor: 28, mr: 30,
    desc: "Cỗ máy tiến hoá: dùng chiêu càng nhiều thì chiêu càng mạnh. Cuối trận cả ba chiêu đạt bậc 3.",
    passive: {
        name: "Tiến Hoá Vinh Quang",
        desc: "Mỗi lần dùng một chiêu, chiêu đó +1 điểm. Đủ điểm thì tự lên bậc (Q và E: 3 điểm mỗi bậc; R: 1 điểm mỗi bậc; tối đa bậc 3). Bậc áp cho mọi lá cùng loại, giữ cả trận.",
    },
    hooks: {
        onCast(g, me, d) {
            if (d.caster.id !== me.id) return
            const key = d.skill.key
            const max = 3 * PTS_PER_TIER[key]
            const before = g.stackOf(me,
                `pts_${key}`)
            if (before < max) g.setStack(me,
                `pts_${key}`,
                before + 1)
            // R bậc 3: mỗi lần dùng Q/E khi bão còn, bão đánh thêm 1 lần (bậc tính sau khi cộng điểm của chính lần này cũng được, vì R chỉ đổi bởi lần dùng R)
            if ((key === "Q" || key === "E") && tierOf(g,
                me,
                "R") >= 3) stormTick(g,
                me)
        },
        onTurnStart(g, me, d) {
            if (d.side !== me.side) return
            g.setStack(me,
                "qRet",
                0)
            // bão đánh đầu mỗi lượt của Viktor
            stormTick(g,
                me)
            // dư chấn E bậc 3
            for (const t of g.enemies(me)) {
                const raw = g.stackOf(me,
                    `echo:${t.id}`)
                if (raw > 0) { g.setStack(me,
                    `echo:${t.id}`,
                    0); g.damage(me,
                    t,
                    raw,
                    "magic",
                    {
                        tag: "skill"
                    }) }
            }
        },
        onDeath(g, me, d) {
            if (d.victim.id !== me.id) return
            for (const k of Object.keys(me.stacks)) if (k.startsWith("echo:")) me.stacks[k] = 0
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Tia Hấp Thụ", target: "enemy",
            desc: `{${F_Q}} sát thương phép lên 1 tướng địch, Viktor nhận Khiên {${F_Q_SHIELD}}. **Bậc 1:** +${T1_BONUS * 100}% sát thương. **Bậc 2:** Khiên gấp đôi. **Bậc 3:** dùng xong lá về thẳng tay (mỗi lượt một lần).`,
            resolve(c) {
                const t = c.target!, tier = tierOf(c.g,
                    c.self,
                    "Q")
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
                if (tier >= 3 && c.g.stackOf(c.self,
                    "qRet") === 0) { c.g.setStack(c.self,
                    "qRet",
                    1); c.toHand() }
            },
        },
        E: {
            key: "E", name: "Tia Huỷ Diệt", target: "enemies_upto", max: 2,
            desc: `{${F_E}} sát thương phép lên tối đa 2 tướng địch. **Bậc 1:** +${T1_BONUS * 100}% sát thương. **Bậc 2:** mục tiêu bị Buốt 1 lượt. **Bậc 3:** mục tiêu nhận thêm dư chấn ${ECHO * 100}% sát thương vào đầu lượt sau của bạn.`,
            resolve(c) {
                const tier = tierOf(c.g,
                    c.self,
                    "E")
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
                    if (tier >= 3 && t.status === "board") c.g.stack(c.self,
                        `echo:${t.id}`,
                        Math.round(raw * ECHO))
                }
            },
        },
        R: {
            key: "R", name: "Bão Hỗn Loạn", target: "enemy",
            desc: `Bão bám 1 tướng địch ${STORM_TURNS} lượt, đầu mỗi lượt của bạn gây {${F_STORM}} sát thương phép. **Bậc 1:** thêm 1 lượt. **Bậc 2:** Câm Lặng 1 lượt khi bão xuất hiện. **Bậc 3:** mỗi lần Viktor dùng Q/E khi bão còn, bão đánh thêm 1 lần.`,
            resolve(c) {
                const t = c.target!, tier = tierOf(c.g,
                    c.self,
                    "R")
                const ticks = STORM_TURNS + (tier >= 1 ? 1 : 0)
                // status tính theo lượt của Viktor (of): lượt hiện tại là lượt 1 nên +1 để đủ số lần đánh đầu lượt
                c.g.status(t,
                    STORM,
                    ticks + 1,
                    {
                        of: c.side
                    })
                if (tier >= 2) c.g.status(t,
                    "silence",
                    1)
            },
        },
    },
})
