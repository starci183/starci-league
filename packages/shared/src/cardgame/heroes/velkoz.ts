// Vel'Koz (Pháp sư, phép) V3: máu 330 · AD 70 · giáp/kháng 25/28 · AP gốc 0.
// CHẤT: "Phân rã". Nhiều tia nhỏ, mỗi lần chiêu trúng một địch thì địch đó +1 Phân Rã; đủ 3 Phân Rã là rã chuẩn.
// Phân Rã = stack "velkoz_decay" trên địch (g.stack), nổ thành sát thương chuẩn rồi về 0.
// Q (20 mana) đứa chính ăn gấp đôi + 2 đứa ngẫu nhiên · E (30) hai nhịp, nhịp hai bằng g.delay cuối lượt · R (60) 10 tia ngẫu nhiên, mỗi tia tính Phân Rã.
// (Chủ 30/10: bỏ lá tạm "Phân Rã Hữu Cơ" mỗi lượt; nội tại chỉ còn Phân Rã khi chiêu trúng.)
// Đối thủ trả lời: Zed, Kha'Zix (dồn sớm), Janna (miễn nhịp hai), Choáng/Câm Lặng cắt mana.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    Unit
} from "../types"

export const DECAY = "velkoz_decay"
/** Đủ bấy nhiêu Phân Rã thì rã */
export const DECAY_MAX = 3
/** Số tia của R */
export const RAYS = 10
export const F_DECAY = "62 + 10% AD + 40% AP + 5% máu tối đa mục tiêu"
export const F_Q_MAIN = "168 + 20% AD + 160% AP + 4% máu đã mất mục tiêu"
export const F_Q_SIDE = "84 + 10% AD + 80% AP + 2% máu đã mất mục tiêu"
export const F_E = "70 + 10% AD + 50% AP + 4% máu đã mất mục tiêu"
export const F_R = "25 + 3% AD + 12% AP + 3% máu đã mất mục tiêu"

/** +1 Phân Rã lên t; đủ DECAY_MAX thì rã: sát thương chuẩn rồi về 0 */
function addDecay(g: Game, me: Unit, t: Unit) {
    if (t.token || t.status !== "board") return
    const n = g.stack(t,
        DECAY,
        1,
        DECAY_MAX)
    if (n < DECAY_MAX) return
    g.setStack(t,
        DECAY,
        0)
    g.damage(me,
        t,
        g.f(me,
            F_DECAY,
            t),
        "true",
        {
            tag: "effect"
        })
}

/** Một tia chiêu trúng t: gây sát thương phép rồi tính Phân Rã */
function hit(g: Game, me: Unit, t: Unit, expr: string) {
    if (t.status !== "board") return
    g.damage(me,
        t,
        g.f(me,
            expr,
            t),
        "magic",
        {
            tag: "skill"
        })
    addDecay(g,
        me,
        t)
}

const foes = (g: Game, me: Unit) => g.targetableEnemies(me).filter((u) => !u.token)

export default defineHero({
    id: "velkoz", name: "Vel'Koz", role: "mage", damage: "magic", hp: 330, atk: 70, armor: 25, mr: 28,
    desc: "Phân rã: nhiều tia nhỏ, mỗi chiêu trúng là một Phân Rã, đủ 3 thì rã chuẩn.",
    passive: {
        name: "Phân Rã Hữu Cơ",
        desc: `Mỗi lần chiêu của Vel'Koz trúng 1 địch: nó +1 Phân Rã. Đủ ${DECAY_MAX} Phân Rã thì nổ {${F_DECAY}} sát thương chuẩn và về 0.`,
    },
    hooks: {
        onDeath(g, me, d) {
            // địch chết thì Phân Rã về 0
            if (d.victim.side !== me.side) g.setStack(d.victim,
                DECAY,
                0)
        },
        onDelayed(g, me, d) {
            if (d.key !== "rift") return
            const t = g.unit(String(d.data?.target ?? ""))
            if (t && t.status === "board") hit(g,
                me,
                t,
                F_E)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Phân Hạch Plasma", target: "enemy", mana: 20,
            desc: `Chọn 1 tướng địch; nó nhận gấp đôi: {${F_Q_MAIN}} sát thương phép. 2 địch ngẫu nhiên khác mỗi đứa nhận {${F_Q_SIDE}} sát thương phép. Mỗi đứa trúng +1 Phân Rã.`,
            resolve(c) {
                const t = c.target!
                const others = c.g.shuffle(foes(c.g,
                    c.self).filter((u) => u.id !== t.id)).slice(0,
                    2)
                if (others.length) c.g.log(`Vel'Koz Q: tia phụ ngẫu nhiên trúng ${others.map((u) => c.g.nameOf(u)).join(", ")}`)
                hit(c.g,
                    c.self,
                    t,
                    F_Q_MAIN)
                for (const u of others) hit(c.g,
                    c.self,
                    u,
                    F_Q_SIDE)
            },
        },
        E: {
            key: "E", name: "Khe Nứt Hư Không", target: "enemy", mana: 30,
            desc: `Chọn 1 tướng địch; nó nhận {${F_E}} sát thương phép ngay, và một lần nữa vào cuối lượt này (tính lại theo máu đã mất lúc đó). Mỗi lần trúng +1 Phân Rã.`,
            resolve(c) {
                const t = c.target!
                hit(c.g,
                    c.self,
                    t,
                    F_E)
                if (t.status === "board") {
                    c.g.delay(c.self,
                        "rift",
                        "turnEnd",
                        c.side,
                        {
                            target: t.id
                        })
                }
            },
        },
        R: {
            key: "R", name: "Tia Phân Rã Sự Sống", target: "all_enemies", mana: 60,
            desc: `Bắn ${RAYS} tia, mỗi tia vào 1 địch ngẫu nhiên: {${F_R}} sát thương phép. Mỗi tia trúng +1 Phân Rã.`,
            resolve(c) {
                const count = new Map<Unit, number>()
                for (let i = 0; i < RAYS; i++) {
                    const t = c.g.pick(foes(c.g,
                        c.self))
                    if (!t) break
                    count.set(t,
                        (count.get(t) ?? 0) + 1)
                    hit(c.g,
                        c.self,
                        t,
                        F_R)
                }
                if (count.size) c.g.log(`Vel'Koz R: ${[...count].map(([u,
                    n]) => `${n}/${RAYS} tia trúng ${c.g.nameOf(u)}`).join(", ")}`)
            },
        },
    },
})
