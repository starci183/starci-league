// Twisted Fate (Pháp sư, phép) V2: "Tay bài là đạn": TF rút nhiều, giữ dày, rồi ném cả tay.
// Nội tại: drawBonus +1 (rút 3 lá mỗi lượt khi TF trên sân). Q (15 mana) Chọn Bài: xem 3 lá trên cùng, lấy 2, lá còn lại xuống đáy.
// E (25) sát thương theo số lá trên tay · R (45) bỏ cả tay vào mộ, mỗi lá gây sát thương lên mọi địch.
import type {
    PlayArgs
} from "../types"
import {
    defineHero
} from "../registry"

export const DRAW_BONUS = 1
/** Q xem bấy nhiêu lá trên cùng bộ bài, lấy (PEEK - 1) lá */
export const PEEK = 3
const F_E = "5 + 25% AD + 30% AP"
const F_E_CARD = "3 + 5% AP"
const F_R_CARD = "8 + 6% AD + 12% AP"

export default defineHero({
    id: "twistedfate", name: "Twisted Fate", role: "mage", damage: "magic", hp: 300, atk: 72, armor: 28, mr: 30,
    desc: "Tay bài là đạn: rút nhiều hơn, chọn lá hay từ đỉnh bộ, E đánh theo độ dày của tay, R ném cả tay thành bão bài.",
    passive: {
        name: "Bàn Tay Vàng",
        desc: `Khi TF trên sân: lượt rút của bạn rút thêm ${DRAW_BONUS} lá.`,
    },
    drawBonus: () => DRAW_BONUS,
    skills: {
        Q: {
            key: "Q", name: "Chọn Bài", target: "none", mana: 20,
            desc: `Xem ${PEEK} lá trên cùng bộ bài, lấy ${PEEK - 1} lá lên tay, lá còn lại xuống đáy bộ bài.`,
            options(c) {
                const top = c.g.peekDeck(c.side,
                    PEEK)
                if (top.length < PEEK) return [{
                }]
                // pick = lá bị đẩy xuống đáy
                return top.map((x): PlayArgs => ({
                    pick: x.uid
                }))
            },
            resolve(c) {
                const top = c.g.peekDeck(c.side,
                    PEEK)
                if (top.length >= PEEK) {
                    const down = top.find((x) => x.uid === c.args.pick) ?? top[top.length - 1]
                    const card = c.g.takeFromDeck(c.side,
                        down.uid)
                    if (card) c.g.putOnBottom(c.side,
                        card)
                }
                c.g.draw(c.side,
                    PEEK - 1,
                    {
                        reason: "pick", by: c.self.id
                    })
            },
        },
        E: {
            key: "E", name: "Lá Bài Định Mệnh", target: "enemy", mana: 30,
            desc: `Chọn 1 tướng địch; gây {${F_E}} sát thương phép, cộng {${F_E_CARD}} cho mỗi lá trên tay bạn.`,
            resolve(c) {
                const n = c.g.player(c.side).hand.length
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
            key: "R", name: "Ném Hết Bài", target: "all_enemies", mana: 55,
            desc: `Bỏ mọi lá trên tay vào mộ; mỗi lá bỏ gây {${F_R_CARD}} sát thương phép lên mọi tướng địch.`,
            resolve(c) {
                const hand = [...c.g.player(c.side).hand]
                let n = 0
                for (const card of hand) if (c.g.discard(c.side,
                    card.uid,
                    "throw")) n++
                const per = c.f(F_R_CARD)
                for (let i = 0; i < n; i++) {
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
