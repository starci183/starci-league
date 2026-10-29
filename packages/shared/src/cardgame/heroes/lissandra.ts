// Lissandra (Pháp sư, phép) V2: "Hoá Băng bài địch": lá trên tay đối thủ đóng thành băng, rồi đập vỡ.
// Hoá Băng = Card.frozen (g.freezeRandom): lá vẫn chiếm chỗ nhưng không đánh/ghép/nối chuỗi được; engine tự tan băng khi Lissandra bị hạ.
// Q (20 mana, Quick) Hoá Băng 2 lá · E (30) sát thương theo số lá băng · R (50) bỏ mọi lá băng vào mộ, mỗi lá gây sát thương lên mọi địch.
import {
    defineHero
} from "../registry"
import {
    otherSide
} from "../types"

/** Số lá Hoá Băng mỗi Q */
export const Q_FREEZE = 2
const F_E = "30 + 75% AD + 30% AP"
const F_E_CARD = "14 + 20% AP"
const F_R_CARD = "18 + 35% AD + 25% AP"

export default defineHero({
    id: "lissandra", name: "Lissandra", role: "mage", damage: "magic", hp: 350, atk: 72, armor: 30, mr: 32,
    desc: "Hoá Băng bài địch: Q đóng băng lá trên tay đối thủ ngay lúc họ cần, E đánh theo số lá băng, R đập vỡ cả đống băng thành sát thương diện rộng. Muốn tan băng thì phải hạ Lissandra.",
    passive: {
        name: "Tay Băng Giá",
        desc: "Lá Hoá Băng trên tay đối thủ không dùng được nhưng vẫn chiếm chỗ. Băng tan khi Lissandra rời sân.",
    },
    skills: {
        Q: {
            key: "Q", name: "Móng Băng", target: "none", mana: 20, quick: true,
            desc: `Quick. Hoá Băng ${Q_FREEZE} lá ngẫu nhiên trên tay đối thủ.`,
            canPlay: (c) => c.g.player(otherSide(c.side)).hand.some((x) => !x.frozen),
            resolve(c) {
                c.g.freezeRandom(otherSide(c.side),
                    Q_FREEZE,
                    c.self.id)
            },
        },
        E: {
            key: "E", name: "Băng Vỡ", target: "enemy", mana: 30,
            desc: `Chọn 1 tướng địch; gây {${F_E}} sát thương phép, cộng {${F_E_CARD}} cho mỗi lá Hoá Băng trên tay đối thủ.`,
            resolve(c) {
                const n = c.g.frozenCards(otherSide(c.side),
                    c.self.id).length
                c.g.damage(c.self,
                    c.target!,
                    c.f(F_E) + c.f(F_E_CARD) * n,
                    "magic",
                    {
                        tag: "skill"
                    })
            },
        },
        R: {
            key: "R", name: "Đập Vỡ", target: "all_enemies", mana: 50,
            desc: `Bỏ mọi lá Hoá Băng trên tay đối thủ vào mộ; mỗi lá bỏ gây {${F_R_CARD}} sát thương phép lên mọi tướng địch.`,
            resolve(c) {
                const foe = otherSide(c.side)
                const cards = c.g.frozenCards(foe,
                    c.self.id)
                for (const card of cards) c.g.discard(foe,
                    card.uid,
                    "shatter")
                const per = c.f(F_R_CARD)
                for (let i = 0; i < cards.length; i++) {
                    for (const t of c.g.enemies(c.self).filter((u) => !u.token)) {
                        c.g.damage(c.self,
                            t,
                            per,
                            "magic",
                            {
                                tag: "skill"
                            })
                    }
                }
            },
        },
    },
})
