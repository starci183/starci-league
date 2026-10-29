// Ahri (Pháp sư, phép): máu 760 · AD 60 · giáp/kháng 28/30. Engine: lanes (kéo về đối diện), hand (xem/phá tay).
// MỤC ĐÍCH: "Quyến Rũ rồi khai thác" — Quyến Rũ (status "charm", hiện trên tướng) kéo địch về trước mặt Ahri, lộ tay đối thủ,
// và trong lúc bị Quyến Rũ mọi lá của tướng đó đánh vào phe Ahri bị bẻ sang chính đồng đội của nó.
// Cơ chế bẻ hướng: hook onDamage (chạy TRƯỚC khi engine xét hạ gục) trả lại máu/khiên cho phe Ahri rồi gây đúng lượng đó
// (sát thương chuẩn) lên đồng đội ít máu nhất của kẻ bị Quyến Rũ.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    otherSide,
    type GameEvent, type Unit
} from "../types"

const CHARM = "charm"
const F_HEAL = "20 + 15% AP"
const F_Q = "75 + 50% AP"
const F_E = "55 + 35% AP"
const F_R = "60 + 40% AP"
const R_CHARMED_MULT = 1.5

/** Quyến Rũ t trong `turns` lượt của nó và kéo nó về đường đối diện Ahri */
function charm(g: Game, me: Unit, t: Unit, turns: number) {
    if (t.status !== "board") return
    g.status(t,
        CHARM,
        turns)
    if (!t.token && t.lane !== me.lane) g.moveTo(t,
        me.lane)
}

export default defineHero({
    id: "ahri", name: "Ahri", role: "mage", damage: "magic", hp: 1180, atk: 74, armor: 28, mr: 30,
    desc: "Quyến Rũ rồi khai thác: tướng bị Quyến Rũ bị kéo về trước mặt Ahri, tay đối thủ bị lộ, và lá nó đánh vào phe Ahri bẻ sang chính đồng đội của nó.",
    skillCopies: {
        Q: 8, E: 8, R: 2
    },
    passive: {
        name: "Mê Hoặc",
        desc: `Tướng địch đang bị Quyến Rũ (hiện trên tướng) mà gây sát thương bằng chiêu hoặc đòn đánh lên phe bạn: phe bạn không mất gì, thay vào đó **đồng đội ít máu nhất của chính nó** nhận đúng lượng đó (sát thương chuẩn), và Ahri hồi {${F_HEAL}} máu.`,
    },
    hooks: {
        onDamage(g, me, d) {
            const src = d.src
            if (!src || src.side === me.side || d.target.side !== me.side || !g.has(src,
                CHARM)) return
            if ((d.tag !== "skill" && d.tag !== "attack") || d.amount <= 0) return
            const ev = [...g.events].reverse().find((e) => e.t === "damage" && e.target === d.target.id) as Extract<GameEvent, { t: "damage" }> | undefined
            const absorbed = ev?.absorbed ?? 0
            d.target.hp += d.hpLost
            d.target.shield += absorbed
            if (d.hpLost > 0) g.emit({
                t: "heal", src: me.id, target: d.target.id, amount: d.hpLost, hp: d.target.hp
            })
            const mates = g.heroes(src.side).filter((u) => u.id !== src.id)
            const victim = g.lowestHp(mates) ?? src
            g.damage(me,
                victim,
                d.amount,
                "true",
                {
                    tag: "effect"
                })
            if (me.status === "board") g.heal(me,
                me,
                g.f(me,
                    F_HEAL))
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Quả Cầu Ma Thuật", target: "enemy",
            desc: `{${F_Q}} sát thương phép cho 1 tướng địch. **Điều kiện:** mục tiêu đang bị Quyến Rũ thì đối thủ bỏ 1 lá chiêu ngẫu nhiên trên tay vào mộ.`,
            resolve(c) {
                const t = c.target!
                const charmed = c.g.has(t,
                    CHARM)
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (!charmed) return
                const foe = otherSide(c.side)
                const card = c.g.stealRandom(foe,
                    (x) => x.kind === "skill" || x.kind === "wild")
                if (card) {
                    c.g.player(foe).hand.push(card)
                    c.g.discard(foe,
                        card.uid)
                }
            },
        },
        E: {
            key: "E", name: "Hôn Gió", target: "enemy",
            desc: `{${F_E}} sát thương phép cho 1 tướng địch, Quyến Rũ nó 1 lượt và kéo nó về đường đối diện Ahri. Đối thủ lộ toàn bộ bài trên tay cho bạn. **Điều kiện:** mục tiêu vốn đã đứng đối diện Ahri thì Quyến Rũ 2 lượt.`,
            resolve(c) {
                const t = c.target!
                const facing = c.g.opposite(c.self)?.id === t.id
                c.g.damage(c.self,
                    t,
                    c.f(F_E),
                    "magic",
                    {
                        tag: "skill"
                    })
                charm(c.g,
                    c.self,
                    t,
                    facing ? 2 : 1)
                const foe = otherSide(c.side)
                c.g.status(c.self,
                    "see_hand",
                    1)
                c.g.emit({
                    t: "reveal", side: foe, to: c.side, cards: structuredClone(c.g.player(foe).hand)
                })
            },
        },
        R: {
            key: "R", name: "Phi Hồ Phi Thân", target: "enemies_upto", max: 3,
            desc: `{${F_R}} sát thương phép cho tối đa 3 tướng địch và Quyến Rũ chúng 1 lượt (tướng đầu tiên bị kéo về đối diện Ahri). **Điều kiện:** tướng đang bị Quyến Rũ từ trước nhận ×${R_CHARMED_MULT} sát thương.`,
            resolve(c) {
                c.targets.forEach((t, i) => {
                    const mult = c.g.has(t,
                        CHARM) ? R_CHARMED_MULT : 1
                    c.g.damage(c.self,
                        t,
                        c.f(F_R) * mult,
                        "magic",
                        {
                            tag: "skill"
                        })
                    if (t.status !== "board") return
                    if (i === 0) charm(c.g,
                        c.self,
                        t,
                        1)
                    else c.g.status(t,
                        CHARM,
                        1)
                })
            },
        },
    },
})
