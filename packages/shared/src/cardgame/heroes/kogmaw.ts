// Kog'Maw (Xạ thủ, vật lý): máu 710 · AD 68 · giáp/kháng 26/28. Engine: scaling (lớn dần), lật kèo theo mạng.
// MỤC ĐÍCH: "Lớn lên từ cái chết" — mỗi tướng mình gục là thức ăn cho Kog Stack (stack hiện trên tướng, giữ qua chết);
// đội càng thua mạng thì Kog càng nguy hiểm. Cơ chế: stack "kog", status "kog_arty" bật autoAttack cuối lượt.
import {
    attackTargets
} from "../engine"
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    otherSide,
    type Side
} from "../types"

const STACK = "kog"
const ARTY = "kog_arty"
const F_STACK = "6 + 3% AD"
const F_Q = "40 + 60% AD + 30% AP"
const F_BURST = "40 + 20% AD"
const BURST_PER_STACK = 8
const F_R = "70 + 40% AD + 50% AP"
const R_PER_STACK = 15
const ARTY_PCT = 0.03

/** Phe side đang ít mạng hơn đối thủ (đọc từ số mạng công khai) */
const behind = (g: Game, side: Side) => g.player(side).lives < g.player(otherSide(side)).lives

export default defineHero({
    id: "kogmaw", name: "Kog'Maw", role: "marksman", damage: "physical", hp: 680, atk: 66, armor: 26, mr: 28,
    desc: "Lớn lên từ cái chết: mỗi đồng đội gục (kể cả chính Kog'Maw) là thêm Kog Stack. Đội càng thua mạng thì axít càng lan, pháo càng nạp lại.",
    skillCopies: {
        Q: 5, E: 4, R: 2
    },
    passive: {
        name: "Cơn Đói Hư Không",
        desc: `Mỗi khi 1 tướng mình bị hạ, Kog'Maw +1 Kog Stack (+2 nếu chính Kog'Maw bị hạ; Stack hiện trên tướng, giữ qua các lần chết). Mỗi Stack: đòn đánh của Kog'Maw +{${F_STACK}} sát thương. Khi Kog'Maw bị hạ, hắn nổ: {${F_BURST}} + ${BURST_PER_STACK} mỗi Stack sát thương chuẩn lên mọi tướng địch.`,
    },
    hooks: {
        onDeath(g, me, d) {
            if (d.victim.side !== me.side || d.victim.token) return
            if (d.victim.id !== me.id) { if (me.status === "board") g.stack(me,
                STACK,
                1); return }
            g.stack(me,
                STACK,
                2)
            const dmg = g.f(me,
                F_BURST) + BURST_PER_STACK * g.stackOf(me,
                STACK)
            for (const t of g.heroes(otherSide(me.side))) g.damage(me,
                t,
                dmg,
                "true",
                {
                    tag: "effect"
                })
        },
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id) return
            d.info.raw += g.stackOf(me,
                STACK) * g.f(me,
                F_STACK)
            if (g.has(me,
                ARTY) && d.info.free) d.info.raw += ARTY_PCT * d.target.maxHp
        },
    },
    // Cao Xạ Ma Pháp: cuối lượt tự bắn 1 tướng địch (ưu tiên tướng đang Rã giáp, rồi tướng ít máu nhất)
    autoAttack(g, me) {
        if (!g.has(me,
            ARTY)) return undefined
        const all = attackTargets(g,
            me,
            false)
        const champs = all.filter((u) => !u.token)
        const list = champs.length ? champs : all
        const shred = list.filter((u) => g.has(u,
            "shred"))
        return g.lowestHp(shred.length ? shred : list)
    },
    skills: {
        Q: {
            key: "Q", name: "Phun Axít", target: "enemy",
            desc: `{${F_Q}} sát thương vật lý cho 1 tướng địch và Rã giáp (giáp và kháng −40%) 2 lượt. **Điều kiện:** đội bạn đang ít mạng hơn đối thủ thì Rã giáp mọi tướng địch.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "physical",
                    {
                        tag: "skill"
                    })
                for (const u of behind(c.g,
                    c.side) ? c.g.heroes(otherSide(c.side)) : [t]) c.g.status(u,
                    "shred",
                    2)
            },
        },
        E: {
            key: "E", name: "Cao Xạ Ma Pháp", target: "self",
            desc: `Trong 2 lượt, cuối lượt của bạn Kog'Maw tự đánh (không cần lá Đánh thường) 1 tướng địch bất kỳ, ưu tiên tướng đang Rã giáp, thêm ${ARTY_PCT * 100}% máu tối đa mục tiêu. **Điều kiện:** đội bạn đang ít mạng hơn đối thủ thì kéo dài 3 lượt.`,
            resolve(c) {
                c.g.status(c.self,
                    ARTY,
                    behind(c.g,
                        c.side) ? 3 : 2)
            },
        },
        R: {
            key: "R", name: "Pháo Sinh Học", target: "enemy",
            desc: `{${F_R}} + ${R_PER_STACK} mỗi Kog Stack sát thương phép cho 1 tướng địch. **Điều kiện:** mục tiêu đang Rã giáp và đội bạn đang ít mạng hơn đối thủ thì gỡ Rã giáp của nó và lá R này quay về tay.`,
            resolve(c) {
                const t = c.target!
                const reload = c.g.has(t,
                    "shred") && behind(c.g,
                    c.side)
                c.g.damage(c.self,
                    t,
                    c.f(F_R) + R_PER_STACK * c.g.stackOf(c.self,
                        STACK),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (reload) {
                    c.g.removeStatus(t,
                        "shred")
                    c.toHand()
                }
            },
        },
    },
})
