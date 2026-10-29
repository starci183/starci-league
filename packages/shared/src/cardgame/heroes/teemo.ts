// Teemo (Xạ thủ, phép): máu 310 · AD 112 · AP gốc 0 · giáp/kháng 25/26. Chất: NẤM TRONG BỘ BÀI ĐỊCH, địch rút trúng là nổ vào đứa yếu nhất.
// Nấm = lá đặc biệt "mushroom" (SpecialCardDef.onDraw). Lá Nấm nhớ phe Teemo (card.side). Nấm nổ rồi biến mất, địch vẫn rút 1 lá như thường.
// AP gốc = AD cũ của tướng phép (đề xuất V3, đã vào engine: HeroDef.ap).
import type {
    Game
} from "../game"
import {
    defineHero, defineSpecialCard
} from "../registry"
import {
    otherSide, type Side, type Unit
} from "../types"

const F_MUSH = "80 + 16% AD + 23% AP"
const F_E = "65 + 20% AD + 30% AP"
/** Sát thương E thêm mỗi Nấm trong bộ bài địch */
const F_E_PER = "16 + 5% AD + 10% AP"
const Q_MUSH = 3

/** Nấm nổ lên tướng máu thấp nhất của `side` (sát thương theo chỉ số Teemo `teemo`) */
function explode(g: Game, teemo: Unit | undefined, side: Side, tag: "effect" | "skill") {
    const t = g.lowestHp(g.heroes(side))
    if (teemo && t) {
        g.damage(teemo,
            t,
            g.f(teemo,
                F_MUSH),
            "magic",
            {
                tag
            })
    }
}

defineSpecialCard({
    id: "mushroom", name: "Nấm",
    desc: `Lá nằm trong bộ bài bạn. Rút trúng thì nổ: tướng máu thấp nhất của bạn nhận {${F_MUSH}} sát thương phép (theo Teemo), rồi bạn vẫn rút 1 lá như thường. Nấm không vào tay.`,
    onDraw(g, card, side) {
        explode(g,
            g.unit(`${card.side ?? otherSide(side)}:teemo`),
            side,
            "effect")
        // Nấm không chiếm lượt rút: rút bù 1 lá như thường
        g.draw(side,
            1,
            {
                reason: "effect"
            })
    },
})

const isMushroom = (c: { kind: string; id: string }) => c.kind === "special" && c.id === "mushroom"

/** Số Nấm của Teemo đang nằm trong bộ bài của phe địch với `side` */
export const mushroomsIn = (g: Game, side: Side) => g.countInDeck(otherSide(side),
    isMushroom)

/** Xáo n Nấm của Teemo (phe `side`) vào bộ bài đối thủ */
export function plant(g: Game, side: Side, n: number) {
    const cards = Array.from({
        length: n
    },
    () => g.newCard({
        kind: "special", id: "mushroom", hero: "teemo", side
    }))
    g.shuffleIn(otherSide(side),
        cards)
}

export default defineHero({
    id: "teemo", name: "Teemo", role: "marksman", damage: "magic", hp: 310, atk: 112, armor: 25, mr: 26,
    desc: "Không cần giết ai: gài Nấm vào bộ bài địch, rút trúng là nổ vào đứa yếu nhất; ai đánh Teemo thì bị Mù.",
    passive: {
        name: "Nấm Độc",
        desc: `Mỗi đòn đánh của Teemo xáo 1 Nấm vào bộ bài đối thủ. Khi đối thủ rút trúng Nấm: tướng máu thấp nhất bên đó nhận {${F_MUSH}} sát thương phép, rồi họ vẫn rút 1 lá như thường.`,
    },
    hooks: {
        onAttackHit(g, me, d) {
            if (d.attacker.id === me.id) plant(g,
                me.side,
                1)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Gài Nấm", target: "self",
            desc: `Xáo ${Q_MUSH} Nấm vào bộ bài đối thủ.`,
            resolve(c) {
                plant(c.g,
                    c.side,
                    Q_MUSH)
            },
        },
        E: {
            key: "E", name: "Phi Tiêu Mù", target: "none", quick: true, chainOnly: true,
            desc: `Quick, Chỉ Nối Chuỗi. Khi địch đánh Teemo: kẻ đó bị Mù (đòn đánh đó trượt) và nhận {${F_E}} + {${F_E_PER}} mỗi Nấm trong bộ bài đối thủ sát thương phép.`,
            quickWhen: (c) => c.trigger.side !== c.side && c.trigger.target === c.self.id && (!c.trigger.card || c.trigger.card.id === "basic"),
            resolve(c) {
                const foe = c.g.unit(c.trigger?.actor ?? "")
                if (!foe || foe.status !== "board") return
                c.g.status(foe,
                    "blind",
                    1)
                c.g.damage(c.self,
                    foe,
                    c.f(F_E) + c.f(F_E_PER) * mushroomsIn(c.g,
                        c.side),
                    "magic",
                    {
                        tag: "skill"
                    })
            },
        },
        R: {
            key: "R", name: "Kích Nổ", target: "all_enemies",
            desc: `Mọi Nấm trong bộ bài đối thủ nổ cùng lúc: mỗi Nấm nổ lên tướng địch máu thấp nhất lúc đó ({${F_MUSH}} sát thương phép), rồi biến mất.`,
            resolve(c) {
                const foe = otherSide(c.side)
                for (const m of c.g.deckCards(foe,
                    isMushroom)) {
                    c.g.takeFromDeck(foe,
                        m.uid)
                    explode(c.g,
                        c.self,
                        foe,
                        "skill")
                }
            },
        },
    },
})
