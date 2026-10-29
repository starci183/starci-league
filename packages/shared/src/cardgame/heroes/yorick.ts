// Yorick (Đấu sĩ, vật lý): máu 980 · AD 72 · giáp/kháng 36/32.
// MỤC ĐÍCH: Người Chăn Hồn — mộ bài là đàn linh hồn: Yorick tự đào bộ bài của mình vào mộ, lá Yorick trong mộ là Linh Hồn (đếm được trên mộ),
// và R gọi Thây Ma Sương Mù vào ô triệu hồi phụ: máu theo số lá trong mộ, sức đánh theo số Linh Hồn. Engine: grave, tokens.
// Đối thủ trả lời bằng: đòn Đánh thường của xạ thủ (luật chung: chỉ xạ thủ phá được vật triệu hồi ở ô phụ), hạ Yorick (Thây Ma tan theo),
// hoặc câu giờ 3 lượt cho nó tan; Yorick trả giá bằng việc tự đào bộ bài (gần cạn bài hơn).
// Cơ chế engine dùng: g.burn (tự đốt bộ mình), g.summonToken (ô phụ), hook onTurnEnd (token tự đánh), tokenOf.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    Card, Unit
} from "../types"

const F_Q = "40 + 70% AD"
const F_Q_HEAL = "20 + 4% máu cộng thêm"
const F_E = "30 + 50% AD"
const Q_MILL = 2
const WALKER_HP = 150
const WALKER_HP_PER_GRAVE = 20
const WALKER_ATK = 30
const WALKER_ATK_PER_SOUL = 10
const SOAK_SOULS = 4
const WALKER_TURNS = 3

const isSoul = (x: Card) => x.kind === "skill" && x.hero === "yorick"
/** Linh Hồn = số lá Yorick đang nằm trong mộ bài của bạn */
export const soulCount = (g: Game, me: Unit) => g.player(me.side).grave.filter(isSoul).length
const walkerOf = (g: Game, me: Unit) => { const t = g.tokenOf(me.side); return t?.token?.id === "mist_walker" && t.token.ownerId === me.id ? t : undefined }
const heroTargets = (g: Game, me: Unit) => { const h = g.enemies(me).filter((u) => !u.token && !g.has(u,
    "stealth")); return h.length ? h : g.enemies(me) }

export default defineHero({
    id: "yorick", name: "Yorick", role: "fighter", damage: "physical", hp: 780, atk: 64, armor: 36, mr: 32,
    skillCopies: {
        Q: 6, E: 4, R: 2
    },
    desc: "Người Chăn Hồn: tự đào bộ bài vào mộ; mỗi lá Yorick trong mộ là một Linh Hồn. Mộ càng dày, Thây Ma Sương Mù ở ô phụ càng lớn.",
    passive: {
        name: "Người Chăn Hồn",
        desc: "Mỗi lá Yorick nằm trong mộ bài của bạn là 1 **Linh Hồn**. Cuối mỗi lượt của bạn, Thây Ma Sương Mù (nếu đang ở ô triệu hồi phụ) mạnh thêm +1 sức đánh cho mỗi Linh Hồn, đánh thường tướng địch ít máu nhất, rồi mất 1 lượt tồn tại (hết lượt thì tan).",
    },
    hooks: {
        onTurnEnd(g, me, d) {
            if (d.side !== me.side) return
            const w = walkerOf(g,
                me)
            if (!w) return
            // lớn dần: mỗi Linh Hồn đang có, +sức đánh (hiện qua stack "power")
            const souls = soulCount(g,
                me)
            if (souls > 0 && w.token) { w.token.atk += souls; g.stack(w,
                "power",
                souls) }
            const t = g.lowestHp(heroTargets(g,
                me))
            if (t) g.attack(w,
                t,
                {
                    free: true
                })
            // tan dần: còn bao nhiêu lượt hiện trên token (stack "turns")
            if (w.status === "board" && g.stack(w,
                "turns",
                -1) <= 0) g.removeToken(w,
                "dead")
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Nghi Thức Cuối", target: "opposite",
            desc: `{${F_Q}} sát thương vật lý cho tướng đối diện, rồi đào ${Q_MILL} lá trên cùng bộ bài **của bạn** vào mộ. **Điều kiện:** mỗi lá Yorick bị đào lên (thành Linh Hồn), Yorick hồi {${F_Q_HEAL}}.`,
            resolve(c) {
                c.g.damage(c.self,
                    c.target!,
                    c.f(F_Q),
                    "physical",
                    {
                        tag: "skill"
                    })
                const dug = c.g.burn(c.side,
                    Q_MILL)
                for (const x of dug) if (isSoul(x)) c.g.heal(c.self,
                    c.self,
                    c.f(F_Q_HEAL))
            },
        },
        E: {
            key: "E", name: "Sương Sầu", target: "enemy",
            desc: `{${F_E}} sát thương vật lý lên 1 tướng địch và Rã giáp nó 1 lượt. **Điều kiện:** Thây Ma Sương Mù đang ở ô triệu hồi phụ thì nó đánh thường ngay tướng đó.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_E),
                    "physical",
                    {
                        tag: "skill"
                    })
                c.g.status(t,
                    "shred",
                    1)
                const w = walkerOf(c.g,
                    c.self)
                if (w && t.status === "board") c.g.attack(w,
                    t,
                    {
                        free: true
                    })
            },
        },
        R: {
            key: "R", name: "Khúc Ai Ca Quần Đảo", target: "self",
            desc: `Gọi **Thây Ma Sương Mù** vào ô triệu hồi phụ (thay vật triệu hồi cũ): máu ${WALKER_HP} + ${WALKER_HP_PER_GRAVE} cho mỗi lá trong mộ bài của bạn, sức đánh ${WALKER_ATK} + ${WALKER_ATK_PER_SOUL} cho mỗi Linh Hồn. Nó tồn tại ${WALKER_TURNS} lượt của bạn (số lượt còn lại hiện trên nó) và biến mất khi Yorick rời sân. **Điều kiện:** có từ ${SOAK_SOULS} Linh Hồn thì Thây Ma còn làm máu ảo cho Yorick (sát thương nhắm Yorick đánh vào nó trước).`,
            resolve(c) {
                const souls = soulCount(c.g,
                    c.self)
                const grave = c.g.player(c.side).grave.length
                const w = c.g.summonToken(c.side,
                    {
                        id: "mist_walker", name: "Mist Walker", hp: WALKER_HP + WALKER_HP_PER_GRAVE * grave, atk: WALKER_ATK + WALKER_ATK_PER_SOUL * souls,
                        armor: 25, mr: 25, ownerId: c.self.id, soak: souls >= SOAK_SOULS,
                    })
                c.g.setStack(w,
                    "turns",
                    WALKER_TURNS)
            },
        },
    },
})
