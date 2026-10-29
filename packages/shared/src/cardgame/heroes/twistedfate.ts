// Twisted Fate (Pháp sư, phép) V3: "Tay bài là đạn": tay càng dày đánh càng đau, cuối trận lên đồ là R xoá sổ. Máu 320 · AD 96 · giáp/kháng 25/28 · AP gốc 72.
// Nội tại: đòn đánh của TF gây thêm sát thương phép theo số lá trên tay (hook onAttack, AttackInfo.bonus).
// Q (20 mana) Chọn Bài: sát thương + hiệu ứng theo màu (Xanh hồi mana, Đỏ Rã Giáp, Vàng Choáng) · E (15) Xáo Bài: xem 3 lá trên cùng, lấy 2 · R (50) bỏ cả tay vào mộ, mỗi lá (tối đa 7) gây sát thương lên mọi địch.
// Cơ chế engine dùng: SkillDef.extra "color", g.peekDeck/takeFromDeck/putOnBottom, g.discard.
import type {
    PlayArgs
} from "../types"
import {
    defineHero
} from "../registry"

/** AP gốc (V3: bằng AD gốc cũ) */
export const BASE_AP = 72
/** E xem bấy nhiêu lá trên cùng bộ bài, lấy (PEEK - 1) lá */
export const PEEK = 3
/** Q Xanh: TF hồi bấy nhiêu mana */
export const Q_BLUE_MANA = 30
/** R chỉ tính tối đa bấy nhiêu lá bỏ */
export const R_MAX_CARDS = 7
const F_PASSIVE = "3 + 1% AD + 2% AP"
const F_Q = "50 + 30% AD + 80% AP"
const F_R_CARD = "30 + 20% AD + 30% AP"

export default defineHero({
    id: "twistedfate", name: "Twisted Fate", role: "mage", damage: "magic", hp: 320, atk: 96, armor: 25, mr: 28, ap: BASE_AP,
    desc: "Tay bài là đạn: giữ tay dày thì đòn đánh đau thêm, Q chọn màu bài (hồi mana, Rã Giáp hoặc Choáng), E xáo bài nạp đạn, R ném cả tay thành bão bài.",
    passive: {
        name: "Bàn Tay Vàng",
        desc: `Đòn đánh của TF gây thêm {${F_PASSIVE}} sát thương phép mỗi lá trên tay bạn.`,
    },
    hooks: {
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id) return
            const n = g.player(me.side).hand.length
            if (n > 0) d.info.bonus.push({
                raw: n * g.f(me,
                    F_PASSIVE), kind: "magic"
            })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Chọn Bài", target: "enemy", mana: 20, extra: "color",
            desc: `Chọn 1 màu và 1 tướng địch; ném 1 lá bài vào nó, gây {${F_Q}} sát thương phép. Xanh: TF hồi ${Q_BLUE_MANA} mana. Đỏ: nó bị Rã Giáp tới hết lượt. Vàng: Choáng nó 1 lượt.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (c.args.color === "blue") c.g.gainMana(c.self,
                    Q_BLUE_MANA,
                    "restore")
                else if (c.args.color === "red") c.g.status(t,
                    "shred",
                    1,
                    {
                        until: c.g.s.turnNo
                    })
                else if (c.args.color === "gold") c.g.status(t,
                    "stun",
                    1)
            },
        },
        E: {
            key: "E", name: "Xáo Bài", target: "none", mana: 15,
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
        R: {
            key: "R", name: "Định Mệnh", target: "all_enemies", mana: 50,
            desc: `Bỏ cả tay vào mộ; mỗi lá bỏ (tối đa tính ${R_MAX_CARDS}) gây {${F_R_CARD}} sát thương phép lên mọi tướng địch.`,
            resolve(c) {
                const hand = [...c.g.player(c.side).hand]
                let n = 0
                for (const card of hand) if (c.g.discard(c.side,
                    card.uid,
                    "throw")) n++
                const per = c.f(F_R_CARD)
                for (let i = 0; i < Math.min(n,
                    R_MAX_CARDS); i++) {
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
