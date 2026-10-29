// Blitzcrank (Đỡ đòn, phép): máu 960 · AD 68 · giáp/kháng 36/34. Lối chơi: KẺ CƯỚP BÀI.
// Cơ chế engine dùng: g.stealCard(to, from) (lá chiêu cướp được thành thẻ chiêu chung wild_q/e/r), stack "bonusRes" (+giáp/kháng vĩnh viễn).
import {
    defineHero
} from "../registry"
import type {
    Game
} from "../game"
import type {
    Unit
} from "../types"
import {
    otherSide
} from "../types"

const F_Q = "50 + 40% AP"
const F_E = "40 + 50% AD"
const F_R = "80 + 40% AP"
const F_R_SHIELD = "30% máu tối đa"
const RES_PER_CARD = 5
const RES_MAX = 30

/** Cướp 1 lá từ tay địch về tay mình (nội tại onSteal cộng giáp/kháng). Trả về lá gốc bị cướp. */
const grab = (g: Game, me: Unit) => g.stealCard(me.side,
    otherSide(me.side))

export default defineHero({
    id: "blitzcrank", name: "Blitzcrank", role: "tank", damage: "magic", hp: 960, atk: 68, armor: 36, mr: 34,
    desc: "Người máy móc bài: kéo carry địch về trước mặt, rút cạn tay đối thủ, và biến lá cướp được thành chiêu của đội mình.",
    passive: {
        name: "Lá Chắn Phản Lực",
        desc: `Lá chiêu cướp được từ đối thủ nằm trên tay thành thẻ chiêu chung cùng chữ (Q/E/R), dùng được cho bất kỳ tướng nào của bạn. Mỗi lá cướp được, Blitzcrank +${RES_PER_CARD} giáp và kháng phép vĩnh viễn (tối đa +${RES_MAX}).`,
    },
    hooks: {
    // mỗi lá bên mình cướp được: +giáp/kháng vĩnh viễn
        onSteal(g, me, d) {
            if (d.side === me.side) g.stack(me,
                "bonusRes",
                RES_PER_CARD,
                RES_MAX)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Bàn Tay Hoả Tiễn", target: "enemy",
            desc: `Chọn 1 tướng địch: kéo nó về đối diện Blitzcrank, gây {${F_Q}} sát thương phép, Choáng 1 lượt, và cướp 1 lá ngẫu nhiên trên tay đối thủ. **Điều kiện:** lá cướp được là lá của chính tướng bị kéo thì cướp thêm 1 lá.`,
            resolve(c) {
                const t = c.target!
                c.g.moveTo(t,
                    c.self.lane)
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                c.g.status(t,
                    "stun",
                    1)
                const got = grab(c.g,
                    c.self)
                if (got && got.hero === t.hero && got.side === t.side) grab(c.g,
                    c.self)
            },
        },
        E: {
            key: "E", name: "Đấm Móc", target: "opposite",
            desc: `Đánh thường tướng đối diện ngay (không cần lá Đánh thường), thêm {${F_E}} sát thương, rồi Choáng 1 lượt. **Điều kiện:** tay đối thủ còn từ 3 lá trở xuống thì Choáng 2 lượt.`,
            resolve(c) {
                const t = c.target!
                c.g.attack(c.self,
                    t,
                    {
                        free: true, bonusRaw: c.f(F_E)
                    })
                const turns = c.g.player(t.side).hand.length <= 3 ? 2 : 1
                c.g.status(t,
                    "stun",
                    turns)
            },
        },
        R: {
            key: "R", name: "Trường Điện Từ", target: "all_enemies",
            desc: `Mọi tướng địch nhận {${F_R}} sát thương phép và Câm Lặng 1 lượt; đối thủ bỏ 2 lá ngẫu nhiên trên tay. **Điều kiện:** tay đối thủ trống sau khi bỏ thì Blitzcrank nhận Khiên {${F_R_SHIELD}}.`,
            resolve(c) {
                const foe = otherSide(c.side)
                for (const t of c.g.enemies(c.self)) {
                    c.g.damage(c.self,
                        t,
                        c.f(F_R),
                        "magic",
                        {
                            tag: "skill"
                        })
                    c.g.status(t,
                        "silence",
                        1)
                }
                for (let i = 0; i < 2; i++) {
                    const pick = c.g.pick(c.g.player(foe).hand)
                    if (pick) c.g.discard(foe,
                        pick.uid,
                        "effect")
                }
                if (!c.g.player(foe).hand.length) c.g.shield(c.self,
                    c.self,
                    c.f(F_R_SHIELD))
            },
        },
    },
})
