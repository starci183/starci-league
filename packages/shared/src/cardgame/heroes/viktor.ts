// Viktor (Pháp sư, phép): hextech. Mọi con số nằm trong balance/heroes/viktor.json (docs/heroes/KITS.md).
// Tiến Hoá = stack "evolve" trên Viktor: mỗi lá bỏ khỏi tay của phe mình (mọi cách bỏ, kể cả Q) cho 1, vô hạn, mất một nửa khi chết.
// Mỗi Tiến Hoá thêm p1 sát thương phép cho mọi chiêu của Viktor lên mỗi mục tiêu.
import {
    kit, when
} from "../balance"
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    Card, PlayArgs, Unit
} from "../types"

const k = kit("viktor"), {
    p
} = k
export const EVOLVE = "evolve"
const F_Q = k.x("q2 + q3·AP"), EN_Q = k.xe("q2 + q3·AP")
const F_SH = k.x("q4 + q5·AP"), EN_SH = k.xe("q4 + q5·AP")
const F_E = k.x("e1 + e2·AP"), EN_E = k.xe("e1 + e2·AP")
const F_R = k.x("r1 + r2·AP"), EN_R = k.xe("r1 + r2·AP")
const F_STUN = k.x("r3 + r4·AP"), EN_STUN = k.xe("r3 + r4·AP")

const evo = (g: Game, me: Unit) => p.p1 * g.stackOf(me,
    EVOLVE)
/** Chữ ký gộp lá giống nhau khi liệt kê lựa chọn bỏ bài */
const sigOf = (c: Card) => `${c.kind}|${c.id}|${c.hero ?? ""}|${c.temp ? 1 : 0}|${c.frozen ?? ""}`

/** Mọi tập 0..q1 lá khác trên tay (gộp lá giống nhau) */
function discardSets(hand: Card[]): string[][] {
    const out: string[][] = [[]]
    const keys = new Set<string>()
    const rec = (start: number, cur: Card[]) => {
        if (cur.length) {
            const key = cur.map(sigOf).sort().join("&")
            if (!keys.has(key)) {
                keys.add(key)
                out.push(cur.map((x) => x.uid))
            }
        }
        if (cur.length >= p.q1) return
        for (let i = start; i < hand.length; i++) rec(i + 1,
            [...cur,
                hand[i]])
    }
    rec(0,
        [])
    return out
}

export default defineHero({
    id: "viktor", name: "Viktor", role: "mage", damage: "magic", ...k.base,
    deathHalf: [EVOLVE],
    bot: k.bot,
    desc: "Cỗ máy tiến hoá: bỏ bài thừa lấy Khiên và Tiến Hoá vĩnh viễn, rồi xả phép lên cả đội địch.",
    passive: {
        name: "Tiến Hoá Vinh Quang",
        desc: `Mỗi lá bỏ khỏi tay phe mình cho Viktor 1 Tiến Hoá, vô hạn; mất một nửa khi Viktor bị hạ. Mỗi chiêu của Viktor gây thêm ${p.p1} sát thương phép mỗi Tiến Hoá lên mỗi mục tiêu.`,
    },
    hooks: {
        onDiscard(g, me, d) {
            if (d.side === me.side) g.stack(me,
                EVOLVE,
                1)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Tháo Rời", target: "enemy", mana: p.q0, quick: true, quickWhen: when.targetsSelf, extra: "discard", discardMax: p.q1,
            desc: `Quick: khi địch nhắm đúng Viktor, có thể dùng lá này. Bỏ tối đa ${p.q1} lá khác trên tay (được bỏ 0 lá), chọn 1 tướng địch: {${F_Q}} sát thương phép; Viktor nhận {${F_SH}} Khiên mỗi lá đã bỏ.`,
            options(c) {
                const hand = c.g.player(c.side).hand.filter((x) => x.uid !== c.card.uid)
                const sets = discardSets(hand)
                const out: PlayArgs[] = []
                for (const t of c.g.targetableEnemies(c.self)) if (!t.token) for (const d of sets) out.push({
                    target: t.id, discard: d
                })
                return out
            },
            resolve(c) {
                let n = 0
                const seen = new Set<string>()
                for (const uid of (c.args.discard ?? []).slice(0,
                    p.q1)) {
                    if (uid === c.card.uid || seen.has(uid)) continue
                    seen.add(uid)
                    if (c.g.discard(c.side,
                        uid,
                        "effect")) n++
                }
                c.g.damage(c.self,
                    c.target!,
                    c.f(F_Q) + evo(c.g,
                        c.self),
                    "magic",
                    {
                        tag: "skill"
                    })
                for (let i = 0; i < n; i++) c.g.shield(c.self,
                    c.self,
                    c.f(F_SH))
            },
        },
        E: {
            key: "E", name: "Tia Tử Thần", target: "all_enemies", mana: p.e0,
            desc: `Mọi tướng địch nhận {${F_E}} sát thương phép.`,
            resolve(c) {
                const raw = c.f(F_E) + evo(c.g,
                    c.self)
                for (const t of c.g.enemies(c.self)) if (!t.token) c.g.damage(c.self,
                    t,
                    raw,
                    "magic",
                    {
                        tag: "skill", aoe: true
                    })
            },
        },
        R: {
            key: "R", name: "Trường Trọng Lực", target: "all_enemies", mana: p.r0,
            desc: `Mọi tướng địch nhận {${F_R}} sát thương phép. Sau đó tướng địch nhiều Máu hiện tại nhất bị Choáng {${F_STUN}} đơn vị.`,
            resolve(c) {
                const raw = c.f(F_R) + evo(c.g,
                    c.self)
                for (const t of c.g.enemies(c.self)) if (!t.token) c.g.damage(c.self,
                    t,
                    raw,
                    "magic",
                    {
                        tag: "skill", aoe: true
                    })
                // người nhiều Máu hiện tại nhất sau sát thương; hoà thì theo thứ tự ô trên bàn
                const top = c.g.enemies(c.self).filter((u) => !u.token && u.status === "board")
                    .sort((a, b) => b.hp - a.hp || a.lane - b.lane)[0]
                if (top) c.g.timed(c.self,
                    top,
                    "stun",
                    c.f(F_STUN))
            },
        },
    },
    en: {
        desc: "Glorious machine: discard spare cards for Shields and permanent Evolution, then unload spells on the whole enemy team.",
        passive: {
            name: "Glorious Evolution",
            desc: `Every card your side discards from hand gives Viktor 1 Evolution, unlimited; half is lost when Viktor is taken down. Each Viktor skill deals ${p.p1} extra magic damage per Evolution to each target.`,
        },
        skills: {
            Q: {
                name: "Siphon Power",
                desc: `Quick: when an enemy targets exactly Viktor, you may play this card. Discard up to ${p.q1} other cards from hand (0 is allowed), choose 1 enemy champion: {${EN_Q}} magic damage; Viktor gains {${EN_SH}} Shield per card discarded.`,
            },
            E: {
                name: "Death Ray",
                desc: `Every enemy champion takes {${EN_E}} magic damage.`,
            },
            R: {
                name: "Chaos Storm",
                desc: `Every enemy champion takes {${EN_R}} magic damage. Then the enemy champion with the most current HP is Stunned for {${EN_STUN}} units.`,
            },
        },
    },
})
