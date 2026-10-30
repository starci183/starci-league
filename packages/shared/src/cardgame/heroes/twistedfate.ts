// Twisted Fate (Pháp sư, phép) V3: "Tay bài là đạn": tay càng dày đánh càng đau, cuối trận lên đồ là R xoá sổ. Máu 320 · AD 69 · giáp/kháng 25/28 · AP gốc 0.
// Nội tại: mỗi đòn thường thật trúng thêm n × (4 + 1.4% AD + 2% AP) sát thương phép (AttackInfo.bonus, không chí mạng riêng);
// n = số lá tài nguyên thực trên tay ngay đòn đó (tính lá tạm còn hạn, lá băng và chiêu của chủ đang vắng).
// Q (20 mana) Chọn Bài: sát thương + màu (Xanh hồi 30 bể chung, Đỏ Rã Giáp ×0,6 tới hết lượt, Vàng thử Choáng) · E (20) Xáo Bài: xem 3, 1 xuống đáy, rút 2
// R (50) chụp gói lá trên tay lúc giải quyết, bỏ từng lá; đạn = min(số lá thực gỡ, 7), mỗi đạn gây (40 + 21% AD + 25% AP) lên mọi địch.
import type {
    Game
} from "../game"
import type {
    PlayArgs,
    Side,
    Unit
} from "../types"
import {
    otherSide
} from "../types"
import {
    defineHero
} from "../registry"

/** E xem bấy nhiêu lá trên cùng bộ bài */
export const PEEK = 3
/** E đẩy bấy nhiêu lá xuống đáy */
export const DOWN = 1
/** E rút tối đa bấy nhiêu lá */
export const DRAW = 2
/** Q Xanh: bể chung hồi bấy nhiêu mana */
export const Q_BLUE_MANA = 30
/** R chỉ tính tối đa bấy nhiêu đạn */
export const R_MAX_CARDS = 7
/** Q Vàng: Choáng d = 0,9 + 0,001 AD + 0,002 AP (g.scaling: ad/ap theo 100 điểm) */
export const STUN_GOLD = {
    base: 0.9, ad: 0.1, ap: 0.2
}
const F_PASSIVE = "4 + 1.5% AD + 2% AP"
const F_Q = "110 + 40% AD + 80% AP"
const F_R_CARD = "40 + 20% AD + 25% AP"

/** Số lá tài nguyên thực trên tay `side` (mọi lá trên tay, kể cả tạm/băng; engine chưa có lá proxy lựa chọn) */
export const resourceHand = (g: Game, side: Side) => g.player(side).hand

/** Thử Choáng d đơn vị (law.md §4): xét miễn trước, floor(d) chắc chắn + roll phần lẻ thêm 1 đơn vị */
function tryStun(g: Game, me: Unit, t: Unit, d: { base: number; ad: number; ap: number }) {
    if (t.status !== "board" || t.token) return
    if (g.has(t,
        "stasis") || g.s.immune?.includes(t.id)) return
    const x = g.scaling(me,
        d)
    if (x <= 0) return
    // engine tung phần lẻ đúng 1 lần sau kiểm tra miễn/chặn (CC_STATUSES)
    g.status(t,
        "stun",
        x,
        {
            of: otherSide(me.side)
        })
}

export default defineHero({
    id: "twistedfate", name: "Twisted Fate", role: "mage", damage: "magic", hp: 320, atk: 69, armor: 25, mr: 28,
    desc: "Tay bài là đạn: giữ tay dày thì đòn đánh đau thêm, Q chọn màu bài (hồi mana, Rã Giáp hoặc Choáng), E lọc bài và rút, R ném cả gói tay thành bão bài.",
    passive: {
        name: "Bàn Tay Vàng",
        desc: `Mỗi đòn thường thật trúng hợp lệ thêm n × {${F_PASSIVE}} sát thương phép, không chí mạng riêng; n là số lá trên tay ngay đòn đó, tính cả lá tạm còn hạn, lá băng và chiêu của tướng đang vắng.`,
    },
    hooks: {
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id) return
            const n = resourceHand(g,
                me.side).length
            if (n > 0) d.info.bonus.push({
                raw: n * g.f(me,
                    F_PASSIVE), kind: "magic"
            })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Chọn Bài", target: "enemy", mana: 20, extra: "color",
            desc: `Chọn màu và 1 tướng địch bất kỳ đường, gây {${F_Q}} sát thương phép. Xanh: bể chung hồi ${Q_BLUE_MANA} mana sau giải quyết. Đỏ: Giáp và Kháng phép của nó còn 60% tới hết lượt hiện tại. Vàng: thử Choáng d = 0,9 + 0,001 AD + 0,002 AP đơn vị. Chọn màu trước Chuỗi.`,
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
                else if (c.args.color === "gold") tryStun(c.g,
                    c.self,
                    t,
                    STUN_GOLD)
            },
        },
        E: {
            key: "E", name: "Xáo Bài", target: "none", mana: 20,
            desc: `Xem ${PEEK} lá đầu bộ, chọn ${DOWN} lá xuống đáy rồi rút tối đa ${DRAW} lá còn lại theo giới hạn tay chung. Bộ thiếu ${PEEK} lá thì không chọn xuống đáy, rút tối đa ${DRAW} lá đang có. Không tạo lá, không bảo đảm chiêu của TF.`,
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
                    DRAW,
                    {
                        reason: "pick", by: c.self.id
                    })
            },
        },
        R: {
            key: "R", name: "Định Mệnh", target: "all_enemies", mana: 50,
            desc: `Khi giải quyết, chụp gói lá trên tay rồi bỏ từng lá của gói đó; m là số lá thực gỡ được, đạn = min(m, ${R_MAX_CARDS}). Mỗi đạn gây {${F_R_CARD}} sát thương phép lên mọi tướng địch hợp lệ. Lá nhận sau lúc chụp vẫn giữ; lá tạm bị bỏ thì biến mất. Cần ít nhất 1 lá khác trên tay mới tung được.`,
            canPlay: (c) => resourceHand(c.g,
                c.side).some((x) => x.uid !== c.card.uid),
            resolve(c) {
                const snapshot = [...resourceHand(c.g,
                    c.side)]
                let m = 0
                for (const card of snapshot) if (c.g.discard(c.side,
                    card.uid,
                    "throw")) m++
                const ammo = Math.min(m,
                    R_MAX_CARDS)
                const per = c.f(F_R_CARD)
                for (let i = 0; i < ammo; i++) {
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
