// Viktor (Pháp sư, phép): máu 330 · AD 68 · AP gốc 0 · giáp/kháng 26/28. Chất: TIẾN HOÁ, đổi bài thừa lấy sức mạnh vĩnh viễn.
// Tiến Hoá là bộ đếm (stack "evolve") KHÔNG trần, giữ qua cả lần chết; mỗi nấc làm sát thương chiêu gốc của Viktor lên địch ×(1 + 0,08 × nấc) (HeroDef.modifyDamage).
// Không nhân proc đồ, phản hay đòn thường (chỉ tag "skill" của chính Viktor). Viktor sống trên bàn vẫn nhận lá Q/E tạm theo luật Pháp sư.
// Mana bể chung (starci-33 tuning v1, giữ nguồn): Q 10 (tự hiến tối đa 3 lá khác: mỗi lá +1 Tiến Hoá + Khiên) · E 35 (mọi địch) · R 60 (mọi địch, thử Choáng người nhiều Máu nhất, +2 Tiến Hoá).
import {
    pct
} from "../formula"
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    Card,
    PlayArgs,
    Unit
} from "../types"
import {
    otherSide
} from "../types"

export const EVOLVE = "evolve"
/** Không trần Tiến Hoá (tuning v1 bỏ trần 10) */
export const MAX_EVOLVE = Infinity
/** Mỗi nấc Tiến Hoá cộng thêm bấy nhiêu % sát thương chiêu */
export const PER_EVOLVE = 0.08
/** Q: bỏ tối đa bấy nhiêu lá */
export const Q_DISCARD_MAX = 3
/** Khiên mỗi lá bỏ ở Q */
const F_SHIELD = "35 + 15% AD + 20% AP"
const F_E = "85 + 35% AD + 45% AP"
const F_R = "95 + 30% AD + 45% AP"
/** R nuôi thêm bấy nhiêu Tiến Hoá */
export const R_GAIN = 2
/** R: Choáng d = 0,9 + 0,001 AD + 0,002 AP (g.scaling: ad/ap theo 100 điểm) */
export const STUN_R = {
    base: 0.9, ad: 0.1, ap: 0.2
}

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
/** Chữ ký gộp lá giống nhau khi liệt kê lựa chọn bỏ bài */
const sigOf = (c: Card) => `${c.kind}|${c.id}|${c.hero ?? ""}|${c.temp ? 1 : 0}|${c.frozen ?? ""}`

export default defineHero({
    id: "viktor", name: "Viktor", role: "mage", damage: "magic", hp: 330, atk: 68, armor: 26, mr: 28,
    bot: {
        stackValue: {
            evolve: 30,
        },
    },
    desc: "Cỗ máy tiến hoá: bỏ bài thừa lấy Khiên và Tiến Hoá vĩnh viễn không trần, rồi xả phép lên cả đội địch.",
    passive: {
        name: "Tiến Hoá",
        desc: `Mỗi Tiến Hoá tăng ${pct(PER_EVOLVE)}% sát thương chiêu gốc của Viktor: hệ số 1 + 0,08 × tầng, không trần và giữ qua chết. Không nhân proc đồ, phản hay đòn thường.`,
    },
    modifyDamage(g, me, d) {
        if (d.src?.id !== me.id || d.tag !== "skill" || d.target.side === me.side) return 1
        return 1 + PER_EVOLVE * g.stackOf(me,
            EVOLVE)
    },
    skills: {
        Q: {
            key: "Q", name: "Tháo Rời", target: "self", mana: 10, extra: "discard", discardMax: Q_DISCARD_MAX,
            desc: `Chọn tự bỏ tối đa ${Q_DISCARD_MAX} lá khác trên tay, kể cả lá tạm (được chọn không bỏ lá nào). Mỗi lá thực bỏ được cho 1 Tiến Hoá và {${F_SHIELD}} Khiên trắng. Bị hủy thì không bỏ bài và không nhận thưởng; lá đang giải quyết không tự hiến.`,
            options(c) {
                // mọi tổ hợp 0..3 lá khác trên tay (gộp lá giống nhau); [] = không bỏ lá nào
                const pool = c.g.player(c.side).hand.filter((x) => x.uid !== c.card.uid)
                const out: PlayArgs[] = [{
                    discard: []
                }]
                const keys = new Set<string>()
                const rec = (start: number, cur: Card[]) => {
                    if (cur.length) {
                        const k = cur.map(sigOf).sort().join("&")
                        if (!keys.has(k)) {
                            keys.add(k)
                            out.push({
                                discard: cur.map((x) => x.uid)
                            })
                        }
                    }
                    if (cur.length >= Q_DISCARD_MAX) return
                    for (let i = start; i < pool.length; i++) rec(i + 1,
                        [...cur,
                            pool[i]])
                }
                rec(0,
                    [])
                return out
            },
            resolve(c) {
                let n = 0
                const seen = new Set<string>()
                for (const uid of (c.args.discard ?? []).slice(0,
                    Q_DISCARD_MAX)) {
                    if (uid === c.card.uid || seen.has(uid)) continue
                    seen.add(uid)
                    if (!c.g.discard(c.side,
                        uid,
                        "effect")) continue
                    n++
                    c.g.shield(c.self,
                        c.self,
                        c.f(F_SHIELD))
                }
                if (n > 0) c.g.stack(c.self,
                    EVOLVE,
                    n)
            },
        },
        E: {
            key: "E", name: "Tia Tử Thần", target: "all_enemies", mana: 35,
            desc: `Mọi tướng địch hợp lệ nhận {${F_E}} × (1 + 0,08 × Tiến Hoá) sát thương phép. Không cần Q trước, không cần quyền đánh và không đánh vật triệu hồi.`,
            resolve(c) {
                for (const t of c.g.enemies(c.self)) {
                    if (t.token) continue
                    c.g.damage(c.self,
                        t,
                        c.f(F_E),
                        "magic",
                        {
                            tag: "skill"
                        })
                }
            },
        },
        R: {
            key: "R", name: "Trường Trọng Lực", target: "all_enemies", mana: 60,
            desc: `Mọi tướng địch hợp lệ nhận {${F_R}} × (1 + 0,08 × Tiến Hoá trước R) sát thương phép. Sau đó tự chọn tướng địch còn sống nhiều Máu hiện tại nhất để thử Choáng d = 0,9 + 0,001 AD + 0,002 AP đơn vị, rồi Viktor nhận ${R_GAIN} Tiến Hoá. Bị chặn khống chế thì không chuyển sang người khác.`,
            resolve(c) {
                for (const t of c.g.enemies(c.self)) {
                    if (t.token) continue
                    c.g.damage(c.self,
                        t,
                        c.f(F_R),
                        "magic",
                        {
                            tag: "skill"
                        })
                }
                // người nhiều Máu hiện tại nhất sau sát thương/cứu chết; hoà thì theo thứ tự ô trên bàn
                const top = c.g.enemies(c.self).filter((u) => !u.token && u.status === "board")
                    .sort((a, b) => b.hp - a.hp || (a.lane ?? 0) - (b.lane ?? 0))[0]
                if (top) tryStun(c.g,
                    c.self,
                    top,
                    STUN_R)
                c.g.stack(c.self,
                    EVOLVE,
                    R_GAIN)
            },
        },
    },
})
