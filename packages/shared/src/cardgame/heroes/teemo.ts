// Teemo (Xạ thủ, phép): máu 360 · AD 72 · giáp/kháng 24/26. Chất: NẤM TRONG BỘ BÀI ĐỊCH, địch rút trúng là nổ vào đứa yếu nhất.
// Nấm = lá đặc biệt "mushroom" (SpecialCardDef.onDraw). Lá Nấm nhớ phe Teemo (card.side). Nấm chiếm lượt rút rồi biến mất.
import type {
    Game
} from "../game"
import {
    defineHero, defineSpecialCard
} from "../registry"
import {
    otherSide, type Side
} from "../types"

const F_MUSH = "50 + 35% AD"
const F_E = "25 + 45% AD"
/** Sát thương E thêm mỗi Nấm trong bộ bài địch */
const E_PER = 20
const F_R = "18 + 12% AD"

defineSpecialCard({
    id: "mushroom", name: "Nấm",
    desc: `Lá nằm trong bộ bài bạn. Rút trúng thì nổ: tướng máu thấp nhất của bạn nhận {${F_MUSH}} sát thương phép (theo Teemo). Nấm chiếm chỗ lá rút đó rồi biến mất.`,
    onDraw(g, card, side) {
        const teemo = g.unit(`${card.side ?? otherSide(side)}:teemo`)
        const t = g.lowestHp(g.heroes(side))
        if (teemo && t) {
            g.damage(teemo,
                t,
                g.f(teemo,
                    F_MUSH),
                "magic",
                {
                    tag: "effect"
                })
        }
    },
})

/** Số Nấm của Teemo đang nằm trong bộ bài của phe địch với `side` */
export const mushroomsIn = (g: Game, side: Side) => g.countInDeck(otherSide(side),
    (c) => c.kind === "special" && c.id === "mushroom")

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
    id: "teemo", name: "Teemo", role: "marksman", damage: "magic", hp: 300, atk: 78, armor: 28, mr: 28,
    desc: "Không cần giết ai: gài Nấm vào bộ bài địch, rút trúng là nổ vào đứa yếu nhất.",
    passive: {
        name: "Nấm Độc",
        desc: `Mỗi đòn đánh của Teemo xáo 1 Nấm vào bộ bài đối thủ. Khi đối thủ rút trúng Nấm: tướng máu thấp nhất bên đó nhận {${F_MUSH}} sát thương phép (thay cho lá rút).`,
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
            key: "Q", name: "Gieo Nấm", target: "self",
            desc: "Xáo 3 Nấm vào bộ bài đối thủ.",
            resolve(c) {
                plant(c.g,
                    c.side,
                    3)
            },
        },
        E: {
            key: "E", name: "Phi Tiêu Độc", target: "enemy", targetsTokens: true,
            desc: `Chọn 1 tướng địch (kể cả ô phụ); gây {${F_E}} sát thương phép, thêm ${E_PER} cho mỗi Nấm trong bộ bài đối thủ (Nấm vẫn ở nguyên).`,
            resolve(c) {
                c.g.damage(c.self,
c.target!,
c.f(F_E) + E_PER * mushroomsIn(c.g,
    c.side),
"magic",
{
    tag: "skill"
})
            },
        },
        R: {
            key: "R", name: "Nấm Độc Hàng Loạt", target: "all_enemies",
            desc: `Mọi tướng địch nhận {${F_R}} sát thương phép cho mỗi Nấm trong bộ bài đối thủ (Nấm vẫn ở nguyên).`,
            resolve(c) {
                const n = mushroomsIn(c.g,
                    c.side)
                if (n <= 0) return
                for (const t of c.g.enemies(c.self)) {
                    if (t.token) continue
                    c.g.damage(c.self,
                        t,
                        c.f(F_R) * n,
                        "magic",
                        {
                            tag: "skill"
                        })
                }
            },
        },
    },
})
