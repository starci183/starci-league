// Annie (Pháp sư, phép): máu 740 · AD 58 · giáp/kháng 26/30. Engine: tokens (ô triệu hồi phụ).
// MỤC ĐÍCH: "Cô bé và gấu" — Tibbers đứng ở ô triệu hồi phụ làm máu ảo cho Annie; mỗi đòn địch đánh vào Tibbers
// làm Annie Bốc Lửa (stack "blaze" hiện trên tướng, tối đa 3), Annie tiêu Bốc Lửa để thiêu và Choáng.
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

const BLAZE = "blaze"
const BLAZE_MAX = 3
const F_TIB_HP = "300 + 60% AP"
const F_TIB_ATK = "60 + 40% AP"
const F_Q = "80 + 50% AP"
const F_BLAZE = "25 + 15% AP"
const F_E_SHIELD = "60 + 30% AP"
const R_HP_MULT = 2

const tibbersOf = (g: Game, me: Unit) => { const t = g.tokenOf(me.side); return t?.token?.id === "tibbers" && t.token.ownerId === me.id ? t : undefined }
/** Gọi (hoặc thay) Tibbers vào ô phụ */
const summonTibbers = (g: Game, me: Unit, hpMult = 1) => g.summonToken(me.side,
    {
        id: "tibbers", name: "Tibbers", hp: Math.round(g.f(me,
            F_TIB_HP) * hpMult), atk: Math.round(g.f(me,
            F_TIB_ATK)), armor: 35, mr: 35,
        damage: "magic", ownerId: me.id, soak: true,
    })
/** Mục tiêu Tibbers vồ: tướng địch đối diện Annie, không có thì tướng địch ít máu nhất */
function tibbersTarget(g: Game, me: Unit): Unit | undefined {
    const o = g.opposite(me)
    if (o && !g.has(o,
        "stealth")) return o
    return g.lowestHp(g.heroes(otherSide(me.side)).filter((u) => !g.has(u,
        "stealth")))
}

export default defineHero({
    id: "annie", name: "Annie", role: "mage", damage: "magic", hp: 1010, atk: 66, armor: 26, mr: 30,
    desc: "Cô bé và gấu: Tibbers ở ô triệu hồi phụ đỡ mọi đòn nhắm Annie; gấu càng bị đánh, Annie càng Bốc Lửa để thiêu và Choáng.",
    skillCopies: {
        Q: 8, E: 6, R: 2
    },
    passive: {
        name: "Bạn Gấu",
        desc: `Tibbers đứng ở ô triệu hồi phụ, sát thương nhắm Annie đánh vào Tibbers trước. Mỗi lần Tibbers nhận sát thương từ địch, Annie +1 Bốc Lửa (tối đa ${BLAZE_MAX}, hiện trên tướng). Cuối mỗi lượt của bạn, Tibbers vồ tướng địch đối diện Annie (không có thì tướng ít máu nhất).`,
    },
    hooks: {
        onDamage(g, me, d) {
            if (!d.src || d.src.side === me.side || d.amount <= 0) return
            const tb = g.unit(g.s.extra[me.side] ?? undefined)
            if (tb && tb.id === d.target.id && tb.token?.id === "tibbers" && tb.token.ownerId === me.id) g.stack(me,
                BLAZE,
                1,
                BLAZE_MAX)
        },
        onTurnEnd(g, me, d) {
            if (d.side !== me.side) return
            const tb = tibbersOf(g,
                me)
            const t = tb ? tibbersTarget(g,
                me) : undefined
            if (tb && t) g.attack(tb,
                t,
                {
                    free: true
                })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Thiêu Đốt", target: "enemy",
            desc: `{${F_Q}} + {${F_BLAZE}} mỗi Bốc Lửa, sát thương phép cho 1 tướng địch; tiêu hết Bốc Lửa. **Điều kiện:** tiêu đủ ${BLAZE_MAX} Bốc Lửa thì mục tiêu bị Choáng 1 lượt.`,
            resolve(c) {
                const t = c.target!
                const b = c.g.stackOf(c.self,
                    BLAZE)
                c.g.damage(c.self,
                    t,
                    c.f(F_Q) + b * c.f(F_BLAZE),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (b) c.g.setStack(c.self,
                    BLAZE,
                    0)
                if (b >= BLAZE_MAX && t.status === "board") c.g.status(t,
                    "stun",
                    1)
            },
        },
        E: {
            key: "E", name: "Tibbers Ơi!", target: "self",
            desc: `Chưa có Tibbers thì gọi Tibbers vào ô triệu hồi phụ ({${F_TIB_HP}} máu, sức đánh {${F_TIB_ATK}}). **Điều kiện:** Tibbers đã có mặt thì thay vào đó gấu nhận Khiên {${F_E_SHIELD}} và vồ ngay tướng địch đối diện Annie.`,
            resolve(c) {
                const tb = tibbersOf(c.g,
                    c.self)
                if (!tb) { summonTibbers(c.g,
                    c.self); return }
                c.g.shield(c.self,
                    tb,
                    c.f(F_E_SHIELD))
                const t = tibbersTarget(c.g,
                    c.self)
                if (t) c.g.attack(tb,
                    t,
                    {
                        free: true
                    })
            },
        },
        R: {
            key: "R", name: "Tibbers Nổi Giận", target: "self",
            desc: `Gọi Tibbers khổng lồ (gấp ${R_HP_MULT} máu, thay Tibbers cũ) rồi gấu vồ **mọi tướng địch** một lần. **Điều kiện:** Annie đang đủ ${BLAZE_MAX} Bốc Lửa thì tiêu hết, và mọi tướng bị vồ bị Choáng 1 lượt.`,
            resolve(c) {
                const full = c.g.stackOf(c.self,
                    BLAZE) >= BLAZE_MAX
                const tb = summonTibbers(c.g,
                    c.self,
                    R_HP_MULT)
                if (full) c.g.setStack(c.self,
                    BLAZE,
                    0)
                for (const t of c.g.heroes(otherSide(c.side))) {
                    if (tb.status !== "board") break
                    c.g.attack(tb,
                        t,
                        {
                            free: true
                        })
                    if (full && t.status === "board") c.g.status(t,
                        "stun",
                        1)
                }
            },
        },
    },
})
