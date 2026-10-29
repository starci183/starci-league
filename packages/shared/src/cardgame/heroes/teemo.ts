// Teemo (Xạ thủ, phép): máu 720 · AD 66 · giáp/kháng 28/30. Lá Đánh thường 200% AD lên tướng bất kỳ. Lối chơi: ĐỐT BÀI.
// Một mục đích: ÉP CẠN BÀI, trừng phạt đội rút nhiều. Cơ chế: lá đặc biệt "mushroom" (Nấm) trong bộ bài địch, tự nổ khi bị rút (SpecialCardDef.onDraw). Lá Nấm nhớ phe Teemo (card.side).
import {
    defineHero, defineSpecialCard
} from "../registry"
import type {
    Game
} from "../game"
import {
    otherSide, type Side
} from "../types"

const F_MUSH = "120 + 30% AP"
const SEASON = "mushroom_season"

defineSpecialCard({
    id: "mushroom", name: "Nấm Độc",
    desc: `Lá nằm trong bộ bài bạn. Rút trúng thì nổ: tướng ít máu nhất của bạn nhận {${F_MUSH}} sát thương phép (theo AP của Teemo), 3 lá trên cùng bộ bài bạn bị đốt vào mộ (4 lá nếu Mùa Nấm đang chạy). Nấm chiếm chỗ lá rút đó rồi biến mất.`,
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
                SEASON) ? 4 : 3)
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
    id: "teemo", name: "Teemo", role: "marksman", damage: "magic", hp: 1050, atk: 81, armor: 28, mr: 30,
    skillCopies: {
        Q: 6, E: 5, R: 2
    },
    desc: "Không cần giết ai: mỗi Nấm nổ là đối thủ mất 3 lá. Bộ bài địch càng mỏng, Nấm càng dày.",
    passive: {
        name: "Nấm Độc",
        desc: `Lá Nấm nằm trong bộ bài đối thủ. Rút trúng thì Nấm nổ: tướng ít máu nhất bên đó nhận {${F_MUSH}} sát thương phép và 3 lá trên cùng bộ bài đối thủ bị đốt vào mộ. Nấm chiếm chỗ lá rút đó, rồi bị huỷ.`,
    },
    skills: {
        Q: {
            key: "Q", name: "Trồng Nấm", target: "self",
            desc: "Xáo 2 Nấm vào bộ bài đối thủ. **Điều kiện:** bộ bài đối thủ dưới 30 lá thì xáo 3 Nấm.",
            resolve(c) { plant(c.g,
                c.side,
                c.g.player(otherSide(c.side)).deck.length < 30 ? 3 : 2) },
        },
        E: {
            key: "E", name: "Bẫy Trên Đường", target: "self",
            desc: "Đặt 1 Nấm lên **trên cùng** bộ bài đối thủ (lá họ sẽ rút kế tiếp). **Điều kiện:** tay đối thủ có từ 6 lá thì đặt 2 Nấm lên trên cùng.",
            resolve(c) {
                const foe = otherSide(c.side)
                const n = c.g.player(foe).hand.length >= 6 ? 2 : 1
                for (let i = 0; i < n; i++) {
                    const card = c.g.newCard({
                        kind: "special", id: "mushroom", hero: "teemo", side: c.side
                    })
                    c.g.player(foe).deck.unshift(card)
                    c.g.emit({
                        t: "create", side: foe, card, zone: "deck"
                    })
                }
            },
        },
        R: {
            key: "R", name: "Mùa Nấm", target: "self",
            desc: "Xáo 3 Nấm vào bộ bài đối thủ. **Điều kiện:** trong lượt kế tiếp của đối thủ, mỗi Nấm nổ đốt 4 lá thay vì 3.",
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
