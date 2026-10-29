// Teemo (Xạ thủ, phép): máu 720 · AD 66 · giáp/kháng 28/30. Lá Đánh thường 200% AD lên tướng bất kỳ. Lối chơi: ĐỐT BÀI.
// Cơ chế: lá đặc biệt "mushroom" (Nấm) trong bộ bài địch, tự nổ khi bị rút (SpecialCardDef.onDraw). Lá Nấm nhớ phe Teemo (card.side).
import {
    defineHero, defineSpecialCard
} from "../registry"
import type {
    Game
} from "../game"
import {
    otherSide, type Side
} from "../types"

const F_MUSH = "40 + 30% AP"
const F_E = "40 + 20% AD + 30% AP"
const SEASON = "mushroom_season"

defineSpecialCard({
    id: "mushroom", name: "Nấm Độc",
    desc: `Lá nằm trong bộ bài bạn. Rút trúng thì nổ: tướng ít máu nhất của bạn nhận {${F_MUSH}} sát thương phép (theo AP của Teemo), 2 lá trên cùng bộ bài bạn bị đốt vào mộ (3 lá nếu Mùa Nấm đang chạy). Nấm chiếm chỗ lá rút đó rồi biến mất.`,
    onDraw(g, card, side) {
        const teemo = g.unit(`${card.side ?? otherSide(side)}:teemo`)
        const t = g.lowestHp(g.board(side))
        if (teemo && t) g.damage(teemo,
            t,
            g.f(teemo,
                F_MUSH),
            "magic",
            {
                tag: "effect"
            })
        g.burn(side,
            teemo && g.has(teemo,
                SEASON) ? 3 : 2)
    },
})

/** Xáo n Nấm của Teemo (phe `side`) vào bộ bài đối thủ */
const plant = (g: Game, side: Side, n: number) => {
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
    id: "teemo", name: "Teemo", role: "marksman", damage: "magic", hp: 720, atk: 66, armor: 28, mr: 30,
    desc: "Không cần giết ai: mỗi Nấm nổ là đối thủ mất 3 lá. Bộ bài địch càng mỏng, Nấm càng dày.",
    passive: {
        name: "Nấm Độc",
        desc: `Lá Nấm nằm trong bộ bài đối thủ. Rút trúng thì Nấm nổ: tướng ít máu nhất bên đó nhận {${F_MUSH}} sát thương phép và 2 lá trên cùng bộ bài đối thủ bị đốt vào mộ. Nấm chiếm chỗ lá rút đó, rồi bị huỷ.`,
    },
    skills: {
        Q: {
            key: "Q", name: "Trồng Nấm", target: "self",
            desc: "Xáo 1 Nấm vào bộ bài đối thủ. **Điều kiện:** bộ bài đối thủ dưới 30 lá thì xáo 2 Nấm.",
            resolve(c) { plant(c.g,
                c.side,
                c.g.player(otherSide(c.side)).deck.length < 30 ? 2 : 1) },
        },
        E: {
            key: "E", name: "Phi Tiêu Mù", target: "enemy",
            desc: `{${F_E}} sát thương phép cho 1 tướng địch; đòn đánh kế tiếp của nó bị trượt. **Điều kiện:** mục tiêu là xạ thủ thì trượt 2 đòn.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_E),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (t.status === "board") c.g.status(t,
                    "blind",
                    1,
                    {
                        v: c.g.role(t) === "marksman" ? 2 : 1
                    })
            },
        },
        R: {
            key: "R", name: "Mùa Nấm", target: "self",
            desc: "Xáo 3 Nấm vào bộ bài đối thủ. **Điều kiện:** trong lượt kế tiếp của đối thủ, mỗi Nấm nổ đốt 3 lá thay vì 2.",
            resolve(c) {
                plant(c.g,
                    c.side,
                    3)
                c.g.status(c.self,
                    SEASON,
                    1,
                    {
                        of: otherSide(c.side)
                    })
            },
        },
    },
})
