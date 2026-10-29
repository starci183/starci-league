// Jinx (Xạ thủ, vật lý): máu 700 · AD 72 · giáp/kháng 24/28. Engine: items (đồ), draw (rút bài).
// MỤC ĐÍCH: "Phấn khích dây chuyền" — mỗi tướng địch gục trong lượt Jinx thì Jinx Phấn Khích (status hiện trên tướng):
// rút 1 lá + 1 đòn đánh miễn phí để hạ tiếp. Đồ là đạn: mỗi món thêm 1 quả tên lửa cho Q, R mạnh thêm theo đồ.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    otherSide,
    type Unit
} from "../types"

const EXCITED = "excited"
const F_Q = "30 + 70% AD"
const F_E = "20 + 40% AD"
const F_R = "120 + 110% AD"
const R_MISSING = 0.2
const R_PER_ITEM = 0.15
const SPLASH = 0.5

const isStrike = (c: { kind: string; id: string }) => c.kind === "support" && c.id === "basic"
/** Tướng địch ở đường kề (±1) với tướng t */
const neighbors = (g: Game, t: Unit) => [t.lane - 1,
    t.lane + 1].map((l) => (l >= 0 && l <= 4 ? g.at(t.side,
    l) : undefined)).filter((u): u is Unit => !!u && u.status === "board")

export default defineHero({
    id: "jinx", name: "Jinx", role: "marksman", damage: "physical", hp: 670, atk: 71, armor: 24, mr: 28,
    desc: "Phấn khích dây chuyền: mỗi tướng địch gục trong lượt Jinx cho thêm 1 lá và 1 phát bắn miễn phí. Đồ càng nhiều thì tên lửa càng nhiều.",
    skillCopies: {
        Q: 5, E: 4, R: 2
    },
    passive: {
        name: "Phấn Khích!",
        desc: "Mỗi khi 1 tướng địch bị hạ trong lượt của bạn, Jinx nhận Phấn Khích tới hết lượt (hiện trên tướng): bạn rút 1 lá và đòn đánh kế tiếp của Jinx không cần lá Đánh thường.",
    },
    hooks: {
        onDeath(g, me, d) {
            if (me.status !== "board" || d.victim.side === me.side || d.victim.token || g.s.active !== me.side) return
            g.status(me,
                EXCITED,
                1)
            g.draw(me.side,
                1,
                {
                    reason: "skill", by: me.id
                })
            me.nextAttack.push({
                id: EXCITED, source: me.id, free: true
            })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Tráo Súng: Cá Mập", target: "enemy",
            desc: `{${F_Q}} sát thương vật lý cho 1 tướng địch, và thêm 1 quả tên lửa cho **mỗi món đồ** Jinx đeo: mỗi quả gây ${SPLASH * 100}% lượng đó cho 1 tướng địch khác (ít máu nhất trước). **Điều kiện:** Jinx đang Phấn Khích thì bạn rút 1 lá.`,
            resolve(c) {
                const t = c.target!
                const dmg = c.f(F_Q)
                c.g.damage(c.self,
                    t,
                    dmg,
                    "physical",
                    {
                        tag: "skill"
                    })
                const others = c.g.heroes(otherSide(c.side)).filter((u) => u.id !== t.id).sort((a, b) => a.hp - b.hp)
                for (const u of others.slice(0,
                    c.self.items.length)) c.g.damage(c.self,
                    u,
                    dmg * SPLASH,
                    "physical",
                    {
                        tag: "skill"
                    })
                if (c.g.has(c.self,
                    EXCITED)) c.g.draw(c.side,
                    1,
                    {
                        reason: "skill", by: c.self.id
                    })
            },
        },
        E: {
            key: "E", name: "Nạp Đạn Pow-Pow", target: "self",
            desc: `Tìm 1 lá Đánh thường trong bộ bài lên tay; đòn đánh kế tiếp của Jinx gây thêm {${F_E}} sát thương vật lý. **Điều kiện:** Jinx đeo từ 2 món đồ thì tìm 2 lá Đánh thường.`,
            resolve(c) {
                const n = c.self.items.length >= 2 ? 2 : 1
                for (let i = 0; i < n; i++) c.g.tutor(c.side,
                    isStrike)
                c.self.nextAttack.push({
                    id: "jinx_e", source: c.self.id, bonusRaw: c.f(F_E), bonusKind: "physical"
                })
            },
        },
        R: {
            key: "R", name: "Tên Lửa Đạn Đạo Siêu Khủng Khiếp!", target: "enemy",
            desc: `{${F_R}} + ${R_MISSING * 100}% máu đã mất của mục tiêu, sát thương vật lý cho 1 tướng địch; tướng địch ở hai đường kề nhận ${SPLASH * 100}%. **Điều kiện:** mỗi món đồ Jinx đeo +${R_PER_ITEM * 100}% sát thương.`,
            resolve(c) {
                const t = c.target!
                const amp = 1 + R_PER_ITEM * c.self.items.length
                const side = neighbors(c.g,
                    t)
                c.g.damage(c.self,
                    t,
                    (c.f(F_R) + R_MISSING * (t.maxHp - t.hp)) * amp,
                    "physical",
                    {
                        tag: "skill"
                    })
                for (const u of side) c.g.damage(c.self,
                    u,
                    c.f(F_R) * amp * SPLASH,
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
    },
})
