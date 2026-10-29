// Garen (Đấu sĩ, vật lý): máu 1000 · AD 76 · giáp/kháng 38/34.
// MỤC ĐÍCH: Công lý Demacia. Garen trừng phạt phe đang dẫn trước: đếm 3 hạng mục công khai (mạng, tổng số đồ đang đeo, số lá trên tay);
// mỗi hạng mục địch hơn phe Garen thì Garen mạnh thêm. Q phạt kẻ nhiều đồ hơn, E chịu đòn khi bị dẫn mạng, R chém theo số đồ và
// cướp thêm lá thưởng khi đang thua mạng. Engine: items, prizes. Độ khó: ĐƠN GIẢN.
// Đối thủ trả lời: đừng dẫn trước một cách lộ liễu (tiêu bớt bài trên tay, đeo đồ cho tướng ở xa Garen), hoặc thả diều Garen bằng xạ thủ.
import {
    defineHero
} from "../registry"
import type {
    Ctx, Side, Unit
} from "../types"
import {
    otherSide
} from "../types"
import type {
    Game
} from "../game"

const PER_LEAD = 0.15
const F_Q = "40 + 60% AD + 20% AP"
const F_E = "35 + 50% AD"
const F_E_SHIELD = "40 + 6% máu tối đa"
const F_R = "90 + 60% AD"
const R_PER_ITEM = 60

const itemsOf = (g: Game, side: Side) => Object.values(g.s.units).filter((u) => u.side === side && !u.token).reduce((n, u) => n + u.items.length,
    0)
/** Số hạng mục phe địch đang hơn phe Garen (0..3): mạng, tổng đồ, số lá trên tay */
export function leadCount(g: Game, side: Side): number {
    const foe = otherSide(side)
    let n = 0
    if (g.player(foe).lives > g.player(side).lives) n++
    if (itemsOf(g,
        foe) > itemsOf(g,
        side)) n++
    if (g.player(foe).hand.length > g.player(side).hand.length) n++
    return n
}
const justice = (g: Game, me: Unit) => 1 + PER_LEAD * leadCount(g,
    me.side)
const hit = (c: Ctx, t: Unit, raw: number, kind: "physical" | "true" = "physical") => c.g.damage(c.self,
    t,
    raw * justice(c.g,
        c.self),
    kind,
    {
        tag: "skill"
    })

export default defineHero({
    id: "garen", name: "Garen", role: "fighter", damage: "physical", hp: 800, atk: 68, armor: 38, mr: 34,
    skillCopies: {
        Q: 4, E: 3, R: 1
    },
    desc: "Sức mạnh Demacia: phe địch càng dẫn trước (mạng, đồ, bài trên tay) thì Garen chém càng đau.",
    passive: {
        name: "Công Lý",
        desc: `Garen gây thêm ${PER_LEAD * 100}% sát thương cho mỗi hạng mục phe địch đang hơn phe bạn: **mạng** còn lại, tổng số **đồ** đang đeo, số **lá trên tay** (tối đa +${PER_LEAD * 300}%).`,
    },
    hooks: {
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id) return
            d.info.mult *= justice(g,
                me)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Đòn Quyết Định", target: "opposite",
            desc: `{${F_Q}} sát thương vật lý lên tướng đối diện. **Điều kiện:** nó đang đeo nhiều đồ hơn Garen thì bị Câm Lặng 1 lượt.`,
            resolve(c) {
                const t = c.target!
                const more = t.items.length > c.self.items.length
                hit(c,
                    t,
                    c.f(F_Q))
                if (more && t.status === "board") c.g.status(t,
                    "silence",
                    1)
            },
        },
        E: {
            key: "E", name: "Phán Xét", target: "opposite",
            desc: `Garen xoay kiếm: {${F_E}} sát thương vật lý lên tướng đối diện và tướng địch ở 2 đường kề bên. **Điều kiện:** phe địch còn nhiều mạng hơn phe bạn thì Garen nhận Khiên {${F_E_SHIELD}}.`,
            resolve(c) {
                const t = c.target!
                for (const l of [t.lane - 1,
                    t.lane + 1]) {
                    const o = l >= 0 && l < 5 ? c.g.at(t.side,
                        l) : undefined
                    if (o && o.status === "board") hit(c,
                        o,
                        c.f(F_E))
                }
                hit(c,
                    t,
                    c.f(F_E))
                if (c.g.player(otherSide(c.side)).lives > c.g.player(c.side).lives) c.g.shield(c.self,
                    c.self,
                    c.f(F_E_SHIELD))
            },
        },
        R: {
            key: "R", name: "Công Lý Demacia", target: "enemy",
            desc: `{${F_R}} + ${R_PER_ITEM} mỗi món đồ mục tiêu đang đeo, sát thương chuẩn lên 1 tướng địch. **Điều kiện:** hạ gục khi phe bạn còn ít mạng hơn thì lật thêm 1 lá thưởng.`,
            resolve(c) {
                const t = c.target!
                const behind = c.g.player(c.side).lives < c.g.player(otherSide(c.side)).lives
                hit(c,
                    t,
                    c.f(F_R) + R_PER_ITEM * t.items.length,
                    "true")
                if (behind && t.status !== "board" && !t.token) c.g.flipPrize(c.side)
            },
        },
    },
})
