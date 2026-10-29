// Jinx (Xạ thủ, vật lý): máu 380 · AD 82 · giáp/kháng 24/26. Chất: NHẶT MẠNG, càng nhặt càng Điên.
// Điên = bộ đếm (stack "frenzy") giữ qua lần chết, tối đa 30. Mỗi Điên cộng thêm sát thương cho đòn đánh của Jinx.
// Giữ bài chờ đồng đội làm địch tụt máu rồi mới gọi Jinx. E là bẫy gài trên Jinx (status "jinx_trap"), phạt việc gọi tướng.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    FOREVER, type Unit
} from "../types"

const FRENZY = "frenzy"
const TRAP = "jinx_trap"
/** Cờ tạm: đòn đánh vừa rồi nhắm địch đang dưới 50% máu (ghi lúc onAttack, đọc ở onAttackHit) */
const LOW = "frenzyLow"
export const MAX_FRENZY = 30
/** Sát thương cộng thêm mỗi Điên cho đòn đánh (vật lý) */
const PER_FRENZY = 3
const F_Q = "70 + 170% AD"
const F_R = "150 + 120% AD"
/** Ngưỡng R: 15% máu tối đa + 1.5% mỗi Điên, tối đa 60% */
const R_BASE = 0.15
const R_PER = 0.015
const R_CAP = 0.6

/** Ngưỡng hạ gục tức thì của R (tỉ lệ máu tối đa) */
export const rocketThreshold = (frenzy: number) => Math.min(R_CAP,
    R_BASE + R_PER * frenzy)

/** Bẫy: tướng địch vừa ra sân ở đường đối diện Jinx thì Choáng 1 lượt, bẫy tan */
function springTrap(g: Game, me: Unit, u: Unit) {
    if (u.side === me.side || u.lane !== me.lane || !g.has(me,
        TRAP)) return
    g.removeStatus(me,
        TRAP)
    g.status(u,
        "stun",
        1)
}

export default defineHero({
    id: "jinx", name: "Jinx", role: "marksman", damage: "physical", hp: 350, atk: 90, armor: 28, mr: 28,
    bot: {
        stackValue: {
            frenzy: 8,
        },
    },
    desc: "Kẻ nhặt mạng: gọi ra đúng lúc địch đã yếu, mỗi mạng nhặt được làm Jinx điên hơn.",
    passive: {
        name: "Điên Cuồng",
        desc: `Đòn đánh của Jinx trúng tướng địch dưới 50% máu: +1 Điên. Jinx hạ gục 1 tướng: +10 Điên. Mỗi Điên làm đòn đánh của Jinx gây thêm ${PER_FRENZY} sát thương vật lý (tối đa ${MAX_FRENZY} Điên).`,
    },
    hooks: {
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id) return
            me.stacks[LOW] = d.target.hp / d.target.maxHp < 0.5 ? 1 : 0
            const n = g.stackOf(me,
                FRENZY)
            if (n > 0 && !d.info.miss) {
                d.info.bonus.push({
                    raw: n * PER_FRENZY, kind: "physical"
                })
            }
        },
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id) return
            if (me.stacks[LOW]) g.stack(me,
                FRENZY,
                1,
                MAX_FRENZY)
            me.stacks[LOW] = 0
        },
        onKill(g, me, d) {
            if (d.killer.id === me.id && !d.victim.token) g.stack(me,
                FRENZY,
                10,
                MAX_FRENZY)
        },
        onSummon(g, me, d) {
            springTrap(g,
                me,
                d.unit)
        },
        onRespawn(g, me, d) {
            springTrap(g,
                me,
                d.unit)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Bắn Thốn", target: "enemy",
            desc: `Chọn 1 tướng địch; gây {${F_Q}} sát thương vật lý.`,
            resolve(c) {
                c.g.damage(c.self,
c.target!,
c.f(F_Q),
"physical",
{
    tag: "skill"
})
            },
        },
        E: {
            key: "E", name: "Bẫy Mìn", target: "self", quick: true,
            desc: "Quick. Đặt bẫy: lần tới đối thủ gọi hoặc hồi sinh 1 tướng vào đường đối diện Jinx, tướng đó bị Choáng 1 lượt.",
            canPlay: (c) => !c.g.has(c.self,
                TRAP),
            resolve(c) {
                c.g.status(c.self,
                    TRAP,
                    1,
                    {
                        until: FOREVER
                    })
            },
        },
        R: {
            key: "R", name: "Tên Lửa Siêu Cấp", target: "enemy",
            desc: `Chọn 1 tướng địch; nếu máu nó ≤ ngưỡng (15% máu tối đa + 1.5% mỗi Điên, tối đa 60%): Kết Liễu nó. Nếu không: gây {${F_R}} sát thương vật lý.`,
            resolve(c) {
                const t = c.target!
                if (t.hp <= t.maxHp * rocketThreshold(c.g.stackOf(c.self,
                    FRENZY))) c.g.execute(c.self,
                    t)
                else {
                    c.g.damage(c.self,
                        t,
                        c.f(F_R),
                        "physical",
                        {
                            tag: "skill"
                        })
                }
            },
        },
    },
})
