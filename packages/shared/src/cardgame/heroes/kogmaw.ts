// Kog'Maw (Xạ thủ, vật lý): máu 710 · AD 68 · giáp/kháng 26/28. Lá Đánh thường 200% AD lên tướng bất kỳ. Lối chơi: LĂN CẦU TUYẾT TỪ CÁI CHẾT.
// Cơ chế: Kog Stack (u.stacks.kog, giữ qua chết), E bật status "kog_arty" cho autoAttack cuối lượt.
import {
    attackTargets
} from "../engine"
import {
    defineHero
} from "../registry"

const STACK = "kog"
const ARTY = "kog_arty"
const F_STACK = "4 + 2% AD"
const F_Q = "40 + 60% AD + 30% AP"
const F_R = "80 + 50% AD + 50% AP"
const R_PER_STACK = 10
const ARTY_PCT = 0.03

export default defineHero({
    id: "kogmaw", name: "Kog'Maw", role: "marksman", damage: "physical", hp: 710, atk: 68, armor: 26, mr: 28,
    desc: "Sống lâu mạnh lên, chết cũng mạnh lên. Đủ Stack thì rã giáp cả đội địch, tự bắn mỗi lượt và kết liễu bằng Pháo Sinh Học.",
    passive: {
        name: "Kog Stack",
        desc: `Mỗi vòng Kog'Maw còn sống +1 Stack. Mỗi lần Kog'Maw chết +2 Stack. Stack giữ qua các lần chết. Mỗi Stack: đòn đánh của Kog'Maw +{${F_STACK}} sát thương.`,
    },
    hooks: {
        onRoundStart(g, me) { g.stack(me,
            STACK,
            1) },
        onDeath(g, me, d) { if (d.victim.id === me.id) g.stack(me,
            STACK,
            2) },
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id) return
            d.info.raw += g.stackOf(me,
                STACK) * g.f(me,
                F_STACK)
            if (g.has(me,
                ARTY) && d.info.free) d.info.raw += ARTY_PCT * d.target.maxHp
        },
        onAttackHit(g, me, d) {
            if (d.attacker.id === me.id && g.has(me,
                ARTY) && d.info.free && g.has(d.target,
                "shred")) g.stack(me,
                STACK,
                1)
        },
    },
    // Cao Xạ Ma Pháp: cuối lượt tự bắn 1 tướng địch (ưu tiên tướng đang Rã giáp, rồi tướng ít máu nhất)
    autoAttack(g, me) {
        if (!g.has(me,
            ARTY)) return undefined
        const list = attackTargets(g,
            me,
            false)
        const shred = list.filter((u) => g.has(u,
            "shred"))
        return g.lowestHp(shred.length ? shred : list)
    },
    skills: {
        Q: {
            key: "Q", name: "Phun Axít", target: "enemy",
            desc: `{${F_Q}} sát thương vật lý cho 1 tướng địch và Rã giáp (giáp và kháng −40%) 2 lượt. **Điều kiện:** Kog'Maw từ 6 Stack thì Rã giáp mọi tướng địch.`,
            resolve(c) {
                const t = c.target!
                const all = c.g.stackOf(c.self,
                    STACK) >= 6
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "physical",
                    {
                        tag: "skill"
                    })
                for (const u of all ? c.g.enemies(c.self) : [t]) c.g.status(u,
                    "shred",
                    2)
            },
        },
        E: {
            key: "E", name: "Cao Xạ Ma Pháp", target: "self",
            desc: "Trong 2 lượt, Kog'Maw tự đánh mỗi lượt (cuối lượt) không cần lá Đánh thường, nhắm tướng bất kỳ (ưu tiên tướng đang Rã giáp), thêm 3% máu tối đa mục tiêu. **Điều kiện:** đánh trúng tướng đang Rã giáp thì +1 Stack.",
            resolve(c) { c.g.status(c.self,
                ARTY,
                2) },
        },
        R: {
            key: "R", name: "Pháo Sinh Học", target: "enemy",
            desc: `{${F_R}} + ${R_PER_STACK} mỗi Stack, sát thương phép cho 1 tướng địch. **Điều kiện:** mục tiêu dưới 40% máu thì gấp đôi.`,
            resolve(c) {
                const t = c.target!
                const low = c.g.hpPct(t) < 0.4
                c.g.damage(c.self,
                    t,
                    (c.f(F_R) + R_PER_STACK * c.g.stackOf(c.self,
                        STACK)) * (low ? 2 : 1),
                    "magic",
                    {
                        tag: "skill"
                    })
            },
        },
    },
})
