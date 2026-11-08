// Lissandra (Pháp sư, phép): băng. Mọi con số nằm trong balance/heroes/lissandra.json (docs/heroes/KITS.md).
// Hoá Băng = Card.frozen (g.freezeRandom): lá không dùng được, tan sau p3 đơn vị hoặc khi Lissandra bị hạ (engine tự tan).
import {
    kit, when
} from "../balance"
import {
    pct
} from "../formula"
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    otherSide
} from "../types"

const k = kit("lissandra"), {
    p
} = k
const F_CHANCE = k.x("p1 + p2·AP")
const F_Q = k.x("q1 + q2·AP"), EN_Q = k.xe("q1 + q2·AP")
const F_E = k.x("e1 + e2·AP"), EN_E = k.xe("e1 + e2·AP")
const F_STUN = k.x("e3 + e4·AP"), EN_STUN = k.xe("e3 + e4·AP")
const F_R = k.x("r1 + r2·AP"), EN_R = k.xe("r1 + r2·AP")
const CHANCE_TXT = `${pct(p.p1)}% + ${pct(p.p2)}% AP`

/** Game đang giải quyết một lá của Lissandra đã gây sát thương chiêu (WeakSet: chỉ sống trong một lần giải quyết) */
const dealt = new WeakSet<Game>()

export default defineHero({
    id: "lissandra", name: "Lissandra", role: "mage", damage: "magic", ...k.base,
    desc: "Hoá Băng bài địch: chiêu của Lissandra có thể đóng băng lá trên tay đối thủ, E Choáng tướng có lá chiêu bị băng, R trút băng lên cả đội địch rồi tự đóng băng. Muốn tan băng sớm thì phải hạ Lissandra.",
    passive: {
        name: "Băng Sâu",
        desc: `Chiêu gây sát thương của Lissandra có ${CHANCE_TXT} cơ hội Hoá Băng 1 lá tay đối thủ. Lá băng không dùng được, tan sau ${p.p3} đơn vị hoặc khi Lissandra bị hạ.`,
    },
    hooks: {
        onDamage(g, me, d) {
            if (d.src?.id !== me.id || d.tag !== "skill" || d.amount <= 0 || d.target.side === me.side || d.target.token) return
            dealt.add(g)
        },
        onCast(g, me, d) {
            if (d.caster.id !== me.id || d.card.kind !== "skill" || !dealt.delete(g)) return
            const chance = Math.max(0,
                Math.min(1,
                    g.f(me,
                        F_CHANCE)))
            if (g.rollLog(chance,
                (hit, pc) => (hit ? `Lissandra: Hoá Băng 1 lá trên tay đối thủ (tỉ lệ ${pc})` : undefined))) g.freezeRandom(otherSide(me.side),
                1,
                me.id,
                undefined,
                g.unitsUntil(me,
                    p.p3))
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Mảnh Băng", target: "enemy", mana: p.q0,
            desc: `Chọn 1 tướng địch: {${F_Q}} sát thương phép, Hoá Băng 1 lá tay đối thủ.`,
            resolve(c) {
                c.g.damage(c.self,
                    c.target!,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                c.g.freezeRandom(otherSide(c.side),
                    1,
                    c.self.id,
                    undefined,
                    c.g.unitsUntil(c.self,
                        p.p3))
            },
        },
        E: {
            key: "E", name: "Vòng Băng", target: "enemy", mana: p.e0,
            desc: `Chọn 1 tướng địch: {${F_E}} sát thương phép. Nếu lá chiêu của nó đang bị băng, Choáng nó {${F_STUN}} đơn vị.`,
            resolve(c) {
                const t = c.target!
                const iced = c.g.frozenCards(otherSide(c.side),
                    c.self.id).some((x) => x.kind === "skill" && x.hero === t.hero)
                c.g.damage(c.self,
                    t,
                    c.f(F_E),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (iced) c.g.timed(c.self,
                    t,
                    "stun",
                    c.f(F_STUN))
            },
        },
        R: {
            key: "R", name: "Hầm Mộ Băng", target: "all_enemies", mana: p.r0, quick: true, quickWhen: when.targetsSelf,
            desc: `Quick: khi địch nhắm đúng Lissandra, có thể dùng lá này. Mọi tướng địch nhận {${F_R}} + ${p.r3} × N sát thương phép, N là số lá tay đối thủ đang bị băng. Sau đó Lissandra Đóng Băng ${p.r6} đơn vị.`,
            resolve(c) {
                const me = c.self
                const n = c.g.frozenCards(otherSide(c.side),
                    me.id).length
                const raw = c.f(F_R) + p.r3 * n
                for (const t of c.g.enemies(me)) if (!t.token) c.g.damage(me,
                    t,
                    raw,
                    "magic",
                    {
                        tag: "skill", aoe: true
                    })
                c.g.stasis(me,
                    p.r6,
                    otherSide(c.side))
            },
        },
    },
    en: {
        desc: "Freezing the enemy's hand: Lissandra's skills can freeze cards in the opponent's hand, E Stuns a champion whose skill card is frozen, R pours ice on the whole enemy team and then freezes herself. Taking her down thaws everything early.",
        passive: {
            name: "Iceborn",
            desc: `Lissandra's damaging skills have a ${CHANCE_TXT} chance to Freeze 1 card in the opponent's hand. A frozen card cannot be played and thaws after ${p.p3} units or when Lissandra is taken down.`,
        },
        skills: {
            Q: {
                name: "Ice Shard",
                desc: `Choose 1 enemy champion: {${EN_Q}} magic damage, and Freeze 1 card in the opponent's hand.`,
            },
            E: {
                name: "Ring of Frost",
                desc: `Choose 1 enemy champion: {${EN_E}} magic damage. If one of its skill cards is frozen, Stun it for {${EN_STUN}} units.`,
            },
            R: {
                name: "Frozen Tomb",
                desc: `Quick: when an enemy targets exactly Lissandra, you may play this card. Every enemy champion takes {${EN_R}} + ${p.r3} × N magic damage, where N is the number of frozen cards in the opponent's hand. Then Lissandra is frozen for ${p.r6} units.`,
            },
        },
    },
})
