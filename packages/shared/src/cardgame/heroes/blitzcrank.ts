// Blitzcrank (Đỡ đòn, phép): máu 1000 · AD 68 · giáp/kháng 36/34.
// MỤC ĐÍCH: Kẻ cướp bài — lá trên tay đối thủ là kho vũ khí của Blitzcrank; tay địch càng mỏng địch càng dễ bị đấm gục.
// Q cướp 1 lá, lá là chiêu của tướng nào thì móc tướng đó về đối diện Blitzcrank (đường). E đấm tướng đối diện, Choáng nếu tay địch mỏng.
// R ép đối thủ bỏ bài. Nội tại: mỗi lá cướp được, +giáp/kháng vĩnh viễn (stack bonusRes hiện trên tướng). Engine: hand, lanes.
// Cơ chế engine dùng: g.stealCard (lá chiêu cướp được thành lá Đánh thường), hook onSteal, stack "bonusRes", g.moveTo.
import {
    defineHero
} from "../registry"
import {
    otherSide
} from "../types"

const F_Q = "120 + 50% AP + 80% AD"
const F_E = "100 + 80% AD"
const F_R = "140 + 40% AP"
const RES_PER_CARD = 5
const RES_MAX = 30
const THIN = 5

export default defineHero({
    id: "blitzcrank", name: "Blitzcrank", role: "tank", damage: "magic", hp: 1800, atk: 91, armor: 36, mr: 34,
    skillCopies: {
        Q: 10, E: 6, R: 3
    },
    desc: "Người máy cướp bài: móc lá trên tay đối thủ, kéo luôn chủ của lá về trước mặt, và đấm gục kẻ đã cạn bài.",
    passive: {
        name: "Lò Phản Ứng",
        desc: `Lá chiêu cướp được từ đối thủ thành 1 lá Đánh thường trên tay bạn. Mỗi lá bạn cướp được, Blitzcrank +${RES_PER_CARD} giáp và kháng phép vĩnh viễn (tối đa +${RES_MAX}, hiện trên tướng).`,
    },
    hooks: {
        onSteal(g, me, d) {
            if (d.side === me.side) g.stack(me,
                "bonusRes",
                RES_PER_CARD,
                RES_MAX)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Bàn Tay Hoả Tiễn", target: "none",
            desc: `Cướp 1 lá ngẫu nhiên trên tay đối thủ và gây {${F_Q}} sát thương phép lên tướng đối diện Blitzcrank. **Điều kiện:** lá cướp được là lá chiêu của một tướng địch đang trên sân thì móc tướng đó về đường đối diện Blitzcrank trước khi đánh (đánh nó thay vì tướng đối diện cũ).`,
            canPlay: (c) => c.g.player(otherSide(c.side)).hand.length > 0,
            resolve(c) {
                const foe = otherSide(c.side)
                const got = c.g.stealCard(c.side,
                    foe)
                const hooked = got && (got.kind === "skill" || got.copyOf) && got.hero ? c.g.unit(`${got.side ?? foe}:${got.hero}`) : undefined
                if (hooked && hooked.status === "board" && hooked.side === foe && c.self.lane >= 0 && c.self.lane < 5 && c.g.isOpen(c.self.lane)) c.g.moveTo(hooked,
                    c.self.lane)
                const t = c.g.opposite(c.self)
                if (!t) return
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
            },
        },
        E: {
            key: "E", name: "Đấm Móc", target: "opposite",
            desc: `Đánh thường tướng đối diện ngay (không cần lá Đánh thường), thêm {${F_E}} sát thương, rồi Choáng mục tiêu 1 lượt. **Điều kiện:** tay đối thủ còn từ ${THIN} lá trở xuống thì Choáng 2 lượt.`,
            resolve(c) {
                const t = c.target!
                c.g.attack(c.self,
                    t,
                    {
                        free: true, bonusRaw: c.f(F_E)
                    })
                if (t.status === "board") c.g.status(t,
                    "stun",
                    c.g.player(t.side).hand.length <= THIN ? 2 : 1)
            },
        },
        R: {
            key: "R", name: "Trường Điện Từ", target: "all_enemies",
            desc: `Đối thủ bỏ 2 lá ngẫu nhiên trên tay. Rồi mọi tướng địch nhận {${F_R}} sát thương phép và bị Câm Lặng 1 lượt. **Điều kiện:** tay đối thủ còn từ 2 lá trở xuống thì chúng bị Choáng 1 lượt thay vì Câm Lặng.`,
            resolve(c) {
                const foe = otherSide(c.side)
                for (let i = 0; i < 2; i++) {
                    const pick = c.g.pick(c.g.player(foe).hand)
                    if (pick) c.g.discard(foe,
                        pick.uid,
                        "effect")
                }
                const cc = c.g.player(foe).hand.length <= 2 ? "stun" : "silence"
                for (const t of c.g.enemies(c.self)) {
                    c.g.damage(c.self,
                        t,
                        c.f(F_R),
                        "magic",
                        {
                            tag: "skill"
                        })
                    c.g.status(t,
                        cc,
                        1)
                }
            },
        },
    },
})
