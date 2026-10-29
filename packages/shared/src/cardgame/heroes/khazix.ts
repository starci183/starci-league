// Kha'Zix (Sát thủ, vật lý): máu 800 · AD 82 · giáp/kháng 30/28.
// MỤC ĐÍCH: Săn mồi cô lập. Tướng địch không có đồng đội ở 2 đường kề bên là CÔ LẬP (đọc từ bàn). Kha'Zix đánh kẻ cô lập đau hơn,
// vồ tới nó rồi tàng hình, R hất một tướng địch ra đường trống để tự tạo con mồi. Tiến hoá theo số lá thưởng phe mình đã lật
// (bậc = min(3, 6 - lá thưởng còn úp), hiện bằng stack "evo"). Engine: lanes, prizes.
// Đối thủ trả lời: đứng thành cụm (gọi tướng lấp đường kề), Khiêu khích, hoặc chiêu đánh mọi tướng (Tàng Hình không né được).
import {
    defineHero
} from "../registry"
import type {
    PlayArgs, Unit
} from "../types"
import {
    PRIZE_COUNT, otherSide
} from "../types"
import type {
    Game
} from "../game"

const ISO_AMP = 0.4
const EVO_AMP = 0.12
const F_Q = "30 + 55% AD + 20% AP"
const F_E = "30 + 45% AD"
const F_R = "40 + 50% AD"

/** Cô lập: tướng (không phải token) trên sân, 2 đường kề không có đồng đội của nó */
export const isolated = (g: Game, t: Unit) => t.status === "board" && !t.token && t.lane >= 0 && t.lane < 5 && ![t.lane - 1,
    t.lane + 1].some((l) => l >= 0 && l < 5 && g.at(t.side,
    l)?.status === "board")
/** Bậc tiến hoá = số lá thưởng phe Kha'Zix đã lật (tối đa 3) */
export const evoTier = (g: Game, me: Unit) => Math.min(3,
    Math.max(0,
        PRIZE_COUNT - g.s.prizes[me.side]))
const amp = (g: Game, me: Unit, t: Unit) => (1 + EVO_AMP * evoTier(g,
    me)) * (isolated(g,
    t) ? 1 + ISO_AMP : 1)
const syncEvo = (g: Game, me: Unit) => { const v = evoTier(g,
    me); if (g.stackOf(me,
    "evo") !== v) g.setStack(me,
    "evo",
    v) }
const stealth = (g: Game, me: Unit) => g.status(me,
    "stealth",
    1,
    {
        of: otherSide(me.side)
    })

export default defineHero({
    id: "khazix", name: "Kha'Zix", role: "assassin", damage: "physical", hp: 590, atk: 71, armor: 30, mr: 28,
    skillCopies: {
        Q: 5, E: 4, R: 2
    },
    desc: "Kẻ săn mồi Hư Không: đánh kẻ đứng một mình, tàng hình sau mỗi cú vồ, tiến hoá theo lá thưởng đã lật.",
    passive: {
        name: "Mối Đe Doạ Vô Hình",
        desc: `Tướng địch không có đồng đội ở 2 đường kề bên là **Cô Lập**: Kha'Zix gây thêm ${ISO_AMP * 100}% sát thương lên nó. **Tiến Hoá:** mỗi lá thưởng phe bạn đã lật (tối đa 3) cho Kha'Zix +${EVO_AMP * 100}% sát thương.`,
    },
    hooks: {
        onSummon(g, me, d) { if (d.unit.id === me.id) syncEvo(g,
            me) },
        onTurnStart(g, me) { syncEvo(g,
            me) },
        onKill(g, me) { syncEvo(g,
            me) },
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id) return
            d.info.mult *= amp(g,
                me,
                d.target)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Nếm Nỗi Sợ", target: "enemy",
            desc: `{${F_Q}} sát thương vật lý lên 1 tướng địch. **Điều kiện:** mục tiêu Cô Lập thì còn bị Rã Giáp 1 lượt.`,
            resolve(c) {
                const t = c.target!
                const iso = isolated(c.g,
                    t)
                c.g.damage(c.self,
                    t,
                    c.f(F_Q) * amp(c.g,
                        c.self,
                        t),
                    "physical",
                    {
                        tag: "skill"
                    })
                if (iso && t.status === "board") c.g.status(t,
                    "shred",
                    1)
            },
        },
        E: {
            key: "E", name: "Vồ Mồi", target: "enemy",
            desc: `Kha'Zix nhảy sang đường của 1 tướng địch (đổi chỗ với tướng mình nếu có) và gây {${F_E}} sát thương vật lý. **Điều kiện:** mục tiêu Cô Lập thì Kha'Zix Tàng Hình tới hết lượt đối thủ (không bị chọn làm mục tiêu đơn).`,
            resolve(c) {
                const t = c.target!
                if (!t.token && t.lane !== c.self.lane && t.lane >= 0 && t.lane < 5) c.g.moveTo(c.self,
                    t.lane)
                const iso = isolated(c.g,
                    t)
                c.g.damage(c.self,
                    t,
                    c.f(F_E) * amp(c.g,
                        c.self,
                        t),
                    "physical",
                    {
                        tag: "skill"
                    })
                if (iso) stealth(c.g,
                    c.self)
            },
        },
        R: {
            key: "R", name: "Đột Kích Hư Không", target: ["enemy",
                "lane"],
            desc: `Hất 1 tướng địch sang một đường trống của phe nó, gây {${F_R}} sát thương vật lý, rồi Kha'Zix Tàng Hình tới hết lượt đối thủ. **Điều kiện:** phe bạn đã lật từ 3 lá thưởng thì Kha'Zix còn nhảy theo ra đối diện nó.`,
            options(c) {
                const foe = otherSide(c.side)
                const all = c.g.enemies(c.side).filter((u) => !u.token && !c.g.has(u,
                    "stealth"))
                const taunt = all.filter((u) => c.g.has(u,
                    "taunt"))
                const targets = taunt.length ? taunt : all
                const out: PlayArgs[] = []
                for (const t of targets) {
                    const lanes = c.g.emptyLanes(foe)
                    for (const lane of lanes.length ? lanes : [t.lane]) out.push({
                        target: t.id, lane
                    })
                }
                return out
            },
            resolve(c) {
                const t = c.target!
                if (c.lane !== undefined && c.lane !== t.lane && !c.g.at(t.side,
                    c.lane)) c.g.moveTo(t,
                    c.lane)
                if (evoTier(c.g,
                    c.self) >= 3 && t.lane !== c.self.lane && t.lane >= 0) c.g.moveTo(c.self,
                    t.lane)
                c.g.damage(c.self,
                    t,
                    c.f(F_R) * amp(c.g,
                        c.self,
                        t),
                    "physical",
                    {
                        tag: "skill"
                    })
                stealth(c.g,
                    c.self)
            },
        },
    },
})
