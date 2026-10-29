// Twisted Fate (Pháp sư, phép): máu 740 · AD 60 · giáp/kháng 28/30. Lối chơi: KIỂM SOÁT BÀI.
// Cơ chế: Q đổi màu (mạnh hơn khi đang cầm lá Vàng: thấy được trên tay), E lục bộ bài, R xem tay đối thủ (status "see_hand") và chọn 1 lá cho họ bỏ. Một mục đích: KIỂM SOÁT BỘ BÀI.
import {
    defineHero, getHero
} from "../registry"
import type {
    Card, PlayArgs
} from "../types"
import {
    otherSide
} from "../types"

const F_RED = "55 + 20% AD + 35% AP"
const F_GOLD = "75 + 20% AD + 45% AP"
const BONUS = 1.5

const sig = (c: Card) => `${c.kind}|${c.id}|${c.hero ?? ""}|${c.item ?? ""}`
const distinct = (cards: Card[]) => { const seen = new Set<string>(); return cards.filter((c) => !seen.has(sig(c)) && !!seen.add(sig(c))) }
const isReactCard = (c: Card) => c.kind === "skill" && !!getHero(c.hero ?? "")?.skills[c.id.slice(-1).toUpperCase() as "Q" | "E" | "R"].quick

export default defineHero({
    id: "twistedfate", name: "Twisted Fate", role: "mage", damage: "magic", hp: 820, atk: 63, armor: 28, mr: 30,
    skillCopies: {
        Q: 7, E: 6, R: 2
    },
    desc: "Não của đội: chọn màu theo tình thế, lục đúng lá combo, xem tay đối thủ để phá thế phản ứng.",
    passive: {
        name: "Bàn Tay Vàng", desc: "Mỗi lần dùng lá Vàng để ghép đồ, thầy rút 1 lá."
    },
    hooks: {
        onCraft(g, me, d) {
            if (d.side === me.side) g.draw(me.side,
                1,
                {
                    reason: "passive", by: me.id
                })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Chọn Bài",
            desc: `Đổi màu, chọn khi đánh. **Xanh** (bản thân): rút 2 lá. **Đỏ** (mọi tướng địch): {${F_RED}} sát thương phép. **Vàng** (1 tướng địch): {${F_GOLD}} sát thương phép, Choáng 1 lượt, và thầy nhận 1 lá Vàng. **Điều kiện:** trên tay bạn đang có **lá Vàng** thì hiệu ứng mạnh thêm 50% (Xanh rút 3 lá, Đỏ/Vàng thêm 50% sát thương).`,
            target: "none",
            options(c) {
                const out: PlayArgs[] = [{
                    color: "blue"
                },
                {
                    color: "red"
                }]
                const en = c.g.enemies(c.self)
                const taunt = en.filter((u) => c.g.has(u,
                    "taunt"))
                for (const t of taunt.length ? taunt : en) out.push({
                    color: "gold", target: t.id
                })
                return out
            },
            resolve(c) {
                const color = c.args.color ?? "blue"
                const same = c.g.player(c.side).hand.some((x) => x.kind === "support" && x.id === "gold")
                const m = same ? BONUS : 1
                if (color === "blue") c.g.draw(c.side,
                    same ? 3 : 2,
                    {
                        reason: "skill", by: c.self.id
                    })
                else if (color === "red") for (const t of c.g.enemies(c.self)) c.g.damage(c.self,
                    t,
                    c.f(F_RED) * m,
                    "magic",
                    {
                        tag: "skill"
                    })
                else {
                    const t = c.target
                    if (t && t.status === "board") {
                        c.g.damage(c.self,
                            t,
                            c.f(F_GOLD) * m,
                            "magic",
                            {
                                tag: "skill"
                            })
                        c.g.status(t,
                            "stun",
                            1)
                    }
                    c.g.giveCard(c.side,
                        c.g.supportCard("gold"),
                        "hand")
                }
            },
        },
        E: {
            key: "E", name: "Xào Bài", target: "none",
            desc: "Lục bộ bài lấy 1 lá bất kỳ lên tay, rồi xáo bộ bài; mọi lá **Nấm** (lá đặc biệt địch cài) thấy trong bộ bị huỷ. **Điều kiện:** lấy đúng **lá chiêu cuối (R)** thì phải bỏ 1 lá khác trên tay.",
            options(c) {
                const out: PlayArgs[] = []
                const hand = c.g.player(c.side).hand.filter((x) => x.uid !== c.card.uid)
                const handDistinct = distinct(hand)
                for (const card of distinct(c.g.player(c.side).deck.filter((x) => x.kind !== "special"))) {
                    const isR = card.kind === "skill" && card.id.endsWith("_r")
                    if (isR && handDistinct.length) for (const h of handDistinct) out.push({
                        pick: card.uid, discard: [h.uid]
                    })
                    else out.push({
                        pick: card.uid
                    })
                }
                return out.length ? out : [{
                }]
            },
            resolve(c) {
                const p = c.g.player(c.side)
                const traps = p.deck.filter((x) => x.kind === "special" && x.side !== c.side)
                if (traps.length) {
                    p.deck = p.deck.filter((x) => !traps.includes(x))
                    for (const x of traps) c.g.emit({
                        t: "burn", side: c.side, card: x
                    })
                }
                const deck = p.deck
                const want = deck.find((x) => x.uid === c.args.pick)
                if (!want) return
                const isR = want.kind === "skill" && want.id.endsWith("_r")
                if (isR && c.args.discard?.[0]) c.g.discard(c.side,
                    c.args.discard[0],
                    "effect") // bỏ trước để có chỗ trên tay
                c.g.tutor(c.side,
                    (x) => x.uid === want.uid)
            },
        },
        R: {
            key: "R", name: "Định Mệnh", target: "none",
            desc: "Xem toàn bộ tay đối thủ tới hết lượt và chọn **1 lá bất kỳ** trong đó cho họ bỏ vào mộ. **Điều kiện:** lá bị bỏ là **lá phản ứng** (lá Quick) thì bạn rút 1 lá.",
            options(c) {
                const out: PlayArgs[] = distinct(c.g.player(otherSide(c.side)).hand).map((x) => ({
                    pick: x.uid
                }))
                return out.length ? out : [{
                }]
            },
            resolve(c) {
                const g = c.g, foe = otherSide(c.side)
                g.status(c.self,
                    "see_hand",
                    1) // client: hiện tay đối thủ cho bên của tướng này tới hết lượt
                g.emit({
                    t: "reveal", side: foe, to: c.side, cards: structuredClone(g.player(foe).hand)
                }) // server gửi tay `side` cho `to` một lần
                const card = g.player(foe).hand.find((x) => x.uid === c.args.pick)
                if (!card) return
                const react = isReactCard(card)
                g.discard(foe,
                    card.uid,
                    "effect")
                if (react) g.draw(c.side,
                    1,
                    {
                        reason: "skill", by: c.self.id
                    })
            },
        },
    },
})
