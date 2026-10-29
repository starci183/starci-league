// Vayne (Xạ thủ, vật lý): máu 700 · AD 68 · giáp/kháng 24/28.
// MỤC ĐÍCH: Săn tank. Mũi Tên Bạc (status "silver", số mũi hiện trên tướng) gắn qua mọi đòn trúng; mũi thứ 3 nổ theo % máu tối đa
// của mục tiêu (càng trâu càng đau). Q lộn nhào bắn (tank ăn 2 mũi), E Kết Án đẩy mục tiêu ra mép: bị ghim vào tường mà đã mang mũi
// thì Choáng, R nổ mọi mũi đang cắm. Engine: marks, lanes. Độ khó: VỪA. (Không dùng Quick: mọi pha lớn diễn ra trong lượt Vayne.)
// Đối thủ trả lời: đứng cạnh đồng đội (đẩy vào ô có đồng đội chỉ đổi chỗ, không bị ghim), đợi mũi rơi (2 lượt), hoặc dồn chết Vayne mỏng máu.
import {
    defineHero
} from "../registry"
import type {
    Unit
} from "../types"
import {
    otherSide
} from "../types"
import type {
    Game
} from "../game"

const SILVER = "silver"
const SILVER_PCT = 0.12
const F_SILVER = "30 + 20% AD"
const Q_MULT = 0.6
const F_Q = "40 + 50% AD + 20% AP"
const F_E = "35 + 50% AD + 20% AP"

/** Đẩy ra phía mép: đường < 2 sang trái, > 2 sang phải, đường giữa sang trái */
const outward = (lane: number) => (lane > 2 ? lane + 1 : lane - 1)
/** Cộng n Mũi Bạc; đủ 3 thì nổ: 12% máu tối đa của mục tiêu + {F_SILVER}, sát thương chuẩn */
export function addSilver(g: Game, vayne: Unit, t: Unit, n = 1) {
    if (t.status !== "board" || n <= 0) return
    const v = g.statusV(t,
        SILVER) + n
    if (v >= 3) {
        g.removeStatus(t,
            SILVER)
        detonate(g,
            vayne,
            t)
    } else g.status(t,
        SILVER,
        2,
        {
            v
        })
}
function detonate(g: Game, vayne: Unit, t: Unit) {
    g.damage(vayne,
        t,
        t.maxHp * SILVER_PCT + g.f(vayne,
            F_SILVER),
        "true",
        {
            tag: "effect"
        })
}

export default defineHero({
    id: "vayne", name: "Vayne", role: "marksman", damage: "physical", hp: 940, atk: 79, armor: 24, mr: 28,
    skillCopies: {
        Q: 5, E: 4, R: 2
    },
    desc: "Thợ săn bóng đêm: cắm Mũi Tên Bạc, mũi thứ 3 nổ theo máu tối đa của mục tiêu; ghim kẻ địch vào tường để làm Choáng.",
    passive: {
        name: "Mũi Tên Bạc",
        desc: `Mỗi đòn đánh trúng của Vayne cắm 1 Mũi Bạc (giữ 2 lượt của mục tiêu). Mũi thứ 3 nổ: ${SILVER_PCT * 100}% máu tối đa của mục tiêu + {${F_SILVER}} sát thương chuẩn.`,
    },
    hooks: {
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss) return
            addSilver(g,
                me,
                d.target)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Lộn Nhào", target: "enemy",
            desc: `Vayne đánh 1 tướng địch bất kỳ (${Q_MULT * 100}% đòn đánh thường) cộng {${F_Q}} sát thương vật lý, không cần lá Đánh thường. **Điều kiện:** mục tiêu là Đỡ đòn thì cắm thêm 1 Mũi Bạc.`,
            resolve(c) {
                const t = c.target!
                c.g.attack(c.self,
                    t,
                    {
                        free: true, mult: Q_MULT, bonusRaw: c.f(F_Q)
                    })
                if (t.status === "board" && c.g.role(t) === "tank") addSilver(c.g,
                    c.self,
                    t)
            },
        },
        E: {
            key: "E", name: "Kết Án", target: "enemy",
            desc: `{${F_E}} sát thương vật lý lên 1 tướng địch, cắm 1 Mũi Bạc, rồi đẩy nó 1 đường ra phía mép bàn (đường giữa đẩy sang trái; có đồng đội của nó thì đổi chỗ). **Điều kiện:** phía đó là mép bàn hoặc đường chưa mở thì nó bị ghim vào tường: nếu đã mang Mũi Bạc từ trước thì Choáng 1 lượt.`,
            resolve(c) {
                const t = c.target!
                const had = c.g.statusV(t,
                    SILVER) > 0
                c.g.damage(c.self,
                    t,
                    c.f(F_E),
                    "physical",
                    {
                        tag: "skill"
                    })
                if (t.status !== "board") return
                addSilver(c.g,
                    c.self,
                    t)
                if (t.status !== "board" || t.token) return
                const to = outward(t.lane)
                const wall = to < 0 || to > 4 || !c.g.isOpen(to)
                if (!wall) c.g.moveTo(t,
                    to)
                else if (had) c.g.status(t,
                    "stun",
                    1)
            },
        },
        R: {
            key: "R", name: "Giờ Khắc Cuối Cùng", target: "all_enemies",
            desc: "Mọi Mũi Bạc đang cắm trên tướng địch nổ ngay (mỗi tướng mang mũi nổ 1 lần dù có 1 hay 2 mũi), rồi Vayne Tàng Hình tới hết lượt đối thủ.",
            canPlay: (c) => c.g.enemies(c.side).some((u) => c.g.statusV(u,
                SILVER) > 0),
            resolve(c) {
                for (const t of c.g.enemies(c.self)) {
                    if (c.g.statusV(t,
                        SILVER) <= 0) continue
                    c.g.removeStatus(t,
                        SILVER)
                    detonate(c.g,
                        c.self,
                        t)
                }
                c.g.status(c.self,
                    "stealth",
                    1,
                    {
                        of: otherSide(c.side)
                    })
            },
        },
    },
})
