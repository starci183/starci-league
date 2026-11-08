// Lux (Pháp sư, phép): ánh sáng tích luỹ. Mọi con số nằm trong balance/heroes/lux.json (docs/heroes/KITS.md).
// Ánh Sáng = stack "lux_pool" trên Lux (giữ khoá cũ): mỗi p1 mana cả đội thực tiêu cho 1, vô hạn, mất một nửa khi Lux bị hạ.
// Phần dư mana (chưa đủ p1) nằm ở khoá ẩn "aura:lux_rem" để không mất mana lẻ giữa các lần trả.
import {
    kit, when
} from "../balance"
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    OptCtx, PlayArgs, Unit
} from "../types"

const k = kit("lux"), {
    p
} = k
export const POOL = "lux_pool"
const REM = "aura:lux_rem"
const F_Q = k.x("q1 + q2·AP"), EN_Q = k.xe("q1 + q2·AP")
const F_SH = k.x("q3 + q4·AP"), EN_SH = k.xe("q3 + q4·AP")
const F_E = k.x("e1 + e2·AP"), EN_E = k.xe("e1 + e2·AP")
const F_STUN = k.x("e4 + e5·AP"), EN_STUN = k.xe("e4 + e5·AP")
const F_R = k.x("r2 + r3·AP"), EN_R = k.xe("r2 + r3·AP")

/** Sát thương cộng thêm của nội tại: p2 mỗi Ánh Sáng (tính sau khi trả mana của chính chiêu) */
const light = (g: Game, me: Unit) => p.p2 * g.stackOf(me,
    POOL)

/** Mức mana Lux R chi: args.manaSpent kẹp vào [r0, min(r1, mana đội)]; không chọn thì lấy mức nhỏ nhất */
export function rCommit(c: OptCtx): number {
    const pool = Math.min(p.r1,
        c.g.manaOf(c.self))
    const want = c.args?.manaSpent
    const v = typeof want === "number" && Number.isFinite(want) ? Math.round(want) : p.r0
    return Math.max(p.r0,
        Math.min(pool,
            v))
}
/** Các mức chi có thể chọn: r0, mỗi flag rStep mana, và cả phần mana đội đang có (tối đa r1) */
export function rLevels(g: Game, me: Unit): number[] {
    const pool = Math.min(p.r1,
        g.manaOf(me))
    if (pool < p.r0) return []
    const out = new Set<number>([p.r0,
        pool])
    for (let m = p.r0; m <= pool; m += Math.max(1,
        k.num("rStep"))) out.add(m)
    return [...out].sort((a, b) => a - b)
}

export default defineHero({
    id: "lux", name: "Lux", role: "mage", damage: "magic", ...k.base,
    deathHalf: [POOL],
    bot: k.bot,
    desc: "Ánh sáng tích luỹ: mana cả đội tiêu thành Ánh Sáng, mọi chiêu của Lux đau thêm theo Ánh Sáng. Q che thân, E Choáng khi đủ sáng, R chi bao nhiêu mana thì đau bấy nhiêu.",
    passive: {
        name: "Chiếu Sáng",
        desc: `Mỗi ${p.p1} mana phe mình tiêu cho 1 Ánh Sáng, vô hạn; mất một nửa khi Lux bị hạ. Mỗi chiêu của Lux gây thêm ${p.p2} sát thương phép mỗi Ánh Sáng (tính sau khi trả mana của chính chiêu đó), không tăng đánh thường.`,
    },
    hooks: {
        onManaSpent(g, me, d) {
            if (d.unit.side !== me.side || d.amount <= 0) return
            const total = (me.stacks[REM] ?? 0) + d.amount
            const n = Math.floor(total / p.p1)
            me.stacks[REM] = total - n * p.p1
            if (n > 0) g.stack(me,
                POOL,
                n)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Lăng Kính", target: "enemy", mana: p.q0, quick: true, quickWhen: when.targetsSelf,
            desc: `Quick: khi địch nhắm đúng Lux, có thể dùng lá này. Chọn 1 tướng địch: {${F_Q}} sát thương phép, Lux nhận {${F_SH}} Khiên.`,
            resolve(c) {
                c.g.damage(c.self,
                    c.target!,
                    c.f(F_Q) + light(c.g,
                        c.self),
                    "magic",
                    {
                        tag: "skill"
                    })
                c.g.shield(c.self,
                    c.self,
                    c.f(F_SH))
            },
        },
        E: {
            key: "E", name: "Khoá Ánh Sáng", target: "enemy", mana: p.e0,
            desc: `Chọn 1 tướng địch: {${F_E}} sát thương phép. Nếu Lux có từ ${p.e3} Ánh Sáng, Choáng nó {${F_STUN}} đơn vị.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_E) + light(c.g,
                        c.self),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (c.g.stackOf(c.self,
                    POOL) >= p.e3) c.g.timed(c.self,
                    t,
                    "stun",
                    c.f(F_STUN))
            },
        },
        R: {
            key: "R", name: "Cầu Vồng Tối Thượng", target: "enemy", mana: rCommit,
            desc: `Chi M mana, từ ${p.r0} đến ${p.r1} và không quá mana đội đang có. Chọn 1 tướng địch: {${F_R}} + ${p.r4} × M sát thương phép.`,
            canPlay: (c) => c.g.manaOf(c.self) >= p.r0,
            // Một lựa chọn cho mỗi (mục tiêu × mức chi): Hand UI hiện nút "Chi N mana", engine trả đúng mức đã chọn.
            options(c) {
                const out: PlayArgs[] = []
                const levels = rLevels(c.g,
                    c.self)
                for (const t of c.g.targetableEnemies(c.self)) if (!t.token) for (const m of levels) out.push({
                    target: t.id, manaSpent: m
                })
                return out
            },
            resolve(c) {
                c.g.damage(c.self,
                    c.target!,
                    c.f(F_R) + p.r4 * c.manaPaid + light(c.g,
                        c.self),
                    "magic",
                    {
                        tag: "skill"
                    })
            },
        },
    },
    en: {
        desc: "Accumulating light: all mana your team spends becomes Light, and every Lux skill hits harder per Light. Q shields her, E Stuns once bright enough, R hits harder for every mana you spend.",
        passive: {
            name: "Illumination",
            desc: `Every ${p.p1} mana your team spends gives 1 Light, unlimited; half is lost when Lux is taken down. Each Lux skill deals ${p.p2} extra magic damage per Light (counted after paying that skill's own mana), and does not boost basic attacks.`,
        },
        skills: {
            Q: {
                name: "Light Binding",
                desc: `Quick: when an enemy targets exactly Lux, you may play this card. Choose 1 enemy champion: {${EN_Q}} magic damage, and Lux gains {${EN_SH}} Shield.`,
            },
            E: {
                name: "Lucent Singularity",
                desc: `Choose 1 enemy champion: {${EN_E}} magic damage. If Lux has at least ${p.e3} Light, Stun it for {${EN_STUN}} units.`,
            },
            R: {
                name: "Final Spark",
                desc: `Spend M mana, from ${p.r0} to ${p.r1} and no more than your team's current mana. Choose 1 enemy champion: {${EN_R}} + ${p.r4} × M magic damage.`,
            },
        },
    },
})
