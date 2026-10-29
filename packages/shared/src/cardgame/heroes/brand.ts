// Brand (Pháp sư, phép): máu 740 · AD 58 · giáp/kháng 26/30. Một mục đích: LỬA LAN.
// Bỏng = status "burn" (v = số stack, tối đa 5, hiện trên tướng). Đầu lượt của tướng bị Bỏng: mất máu theo số stack (để cháy dần),
// HOẶC E kích nổ ngay toàn bộ stack (đổi thời gian lấy sát thương tức thì). Tướng đang Bỏng bị hạ thì lửa lan sang tướng địch kề đường.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    Unit
} from "../types"

const BURN = "burn"
const MAX = 5
const F_TICK = "50 + 8% AP"
const F_Q = "100 + 40% AP"
const F_E = "75 + 25% AP"
const F_R = "90 + 30% AP"

/** Thêm n stack Bỏng (hết hạn sau 2 lượt của mục tiêu kể từ lần cộng cuối) */
const ignite = (g: Game, t: Unit, n: number) => { if (t.status === "board" && !t.token) g.status(t,
    BURN,
    2,
    {
        v: n, add: true, max: MAX
    }) }
/** Tướng địch kề đường với u (cùng phe u) */
const neighbours = (g: Game, u: Unit, lane: number) => g.board(u.side).filter((x) => x.id !== u.id && !x.token && Math.abs(x.lane - lane) === 1)

export default defineHero({
    id: "brand", name: "Brand", role: "mage", damage: "magic", hp: 1720, atk: 89, armor: 26, mr: 30,
    skillCopies: {
        Q: 8, E: 7, R: 2
    },
    desc: "Ngọn lửa báo thù: mọi lá đều đốt thêm stack Bỏng. Để lửa cháy dần mỗi lượt, hay kích nổ tất cả ngay bây giờ? Tướng cháy mà chết thì lửa lan sang kẻ bên cạnh.",
    passive: {
        name: "Bùng Cháy",
        desc: `Chiêu của Brand cho mục tiêu stack **Bỏng** (tối đa ${MAX}, hiện trên tướng, hết sau 2 lượt của nó kể từ lần cộng cuối). Đầu lượt của tướng bị Bỏng, nó nhận {${F_TICK}} sát thương phép cho mỗi stack. Tướng đang Bỏng bị hạ thì toàn bộ stack lan sang 1 tướng địch ở đường kề (ít máu nhất).`,
    },
    hooks: {
        onTurnStart(g, me, d) {
            if (d.side === me.side) return
            for (const t of g.enemies(me)) {
                const n = g.statusV(t,
                    BURN)
                if (n > 0) g.damage(me,
                    t,
                    g.f(me,
                        F_TICK) * n,
                    "magic",
                    {
                        tag: "dot"
                    })
            }
        },
        // ghi số stack lúc trúng đòn (status bị xoá khi chết) để lửa lan đúng số stack
        onDamage(g, me, d) {
            if (d.target.side !== me.side && !d.target.token) me.stacks[`burnAt:${d.target.id}`] = g.statusV(d.target,
                BURN)
        },
        onDeath(g, me, d) {
            const v = d.victim
            if (v.side === me.side || v.token || me.status !== "board") return
            const n = g.stackOf(me,
                `burnAt:${v.id}`)
            me.stacks[`burnAt:${v.id}`] = 0
            if (n <= 0) return
            const to = g.lowestHp(neighbours(g,
                v,
                v.homeLane))
            if (to) ignite(g,
                to,
                n)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Thiêu Rụi", target: "enemy",
            desc: `{${F_Q}} sát thương phép lên 1 tướng địch, +2 Bỏng. **Điều kiện:** mục tiêu đang Bỏng từ trước thì bị Choáng 1 lượt.`,
            resolve(c) {
                const t = c.target!
                const burning = c.g.statusV(t,
                    BURN) > 0
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                ignite(c.g,
                    t,
                    2)
                if (burning && t.status === "board") c.g.status(t,
                    "stun",
                    1)
            },
        },
        E: {
            key: "E", name: "Hoả Ngục", target: "enemy",
            options: (c) => c.g.enemies(c.self).filter((u) => !c.g.has(u,
                "stealth") && c.g.statusV(u,
                BURN) > 0).map((u) => ({
                target: u.id
            })),
            desc: `Chọn 1 tướng địch **đang Bỏng**: kích nổ toàn bộ stack, mỗi stack gây {${F_E}} sát thương phép ngay, rồi gỡ Bỏng. **Điều kiện:** kích nổ từ 3 stack thì mỗi tướng địch ở đường kề nhận 2 Bỏng.`,
            resolve(c) {
                const t = c.target!
                const n = c.g.statusV(t,
                    BURN)
                const lane = t.lane
                c.g.removeStatus(t,
                    BURN)
                c.g.damage(c.self,
                    t,
                    c.f(F_E) * n,
                    "magic",
                    {
                        tag: "skill"
                    })
                if (n >= 3) for (const u of neighbours(c.g,
                    t,
                    lane)) ignite(c.g,
                    u,
                    2)
            },
        },
        R: {
            key: "R", name: "Bão Lửa", target: "all_enemies",
            desc: `{${F_R}} sát thương phép cho mọi tướng địch, +2 Bỏng cho mỗi tướng. **Điều kiện:** tướng đang Bỏng từ trước nhận thêm 1 Bỏng nữa.`,
            resolve(c) {
                for (const t of c.g.enemies(c.self)) {
                    const burning = c.g.statusV(t,
                        BURN) > 0
                    c.g.damage(c.self,
                        t,
                        c.f(F_R),
                        "magic",
                        {
                            tag: "skill"
                        })
                    ignite(c.g,
                        t,
                        burning ? 3 : 2)
                }
            },
        },
    },
})
