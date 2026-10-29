// Viktor (Pháp sư, phép): máu 380 · AD 62 · giáp/kháng 26/30. Chất: TIẾN HOÁ, đổi bài thừa lấy sức mạnh vĩnh viễn.
// Tiến Hoá là bộ đếm (stack "evolve") giữ qua cả lần chết; mỗi nấc làm sát thương chiêu của Viktor tăng thêm.
// Mana (x10): Q 10, E 35, R 60. Q nạp (bỏ bài), E xả (sát thương mọi địch), R nhân đôi Tiến Hoá.
import {
    pct
} from "../formula"
import {
    defineHero
} from "../registry"

const EVOLVE = "evolve"
/** Trần Tiến Hoá */
export const MAX_EVOLVE = 10
/** Mỗi nấc Tiến Hoá cộng thêm bấy nhiêu % sát thương chiêu */
export const PER_EVOLVE = 0.15
const F_E = "55 + 50% AD + 50% AP"

export default defineHero({
    id: "viktor", name: "Viktor", role: "mage", damage: "magic", hp: 310, atk: 68, armor: 28, mr: 30,
    bot: {
        stackValue: {
            evolve: 30,
        },
    },
    desc: "Cỗ máy tiến hoá: bỏ bài thừa để nâng cấp vĩnh viễn, rồi xả một đòn phép lên cả đội địch.",
    passive: {
        name: "Tiến Hoá",
        desc: `Tiến Hoá (vĩnh viễn, tối đa ${MAX_EVOLVE}, không mất khi Viktor chết): mỗi nấc làm sát thương chiêu của Viktor tăng ${pct(PER_EVOLVE)}%.`,
    },
    skills: {
        Q: {
            key: "Q", name: "Nạp Năng Lượng", target: "self", mana: 10, extra: "discard", discardMax: 3,
            desc: "Bỏ tối đa 3 lá trên tay; mỗi lá bỏ: Viktor +1 Tiến Hoá.",
            resolve(c) {
                let n = 0
                for (const uid of c.args.discard ?? []) if (c.g.discard(c.side,
                    uid,
                    "effect")) n++
                if (n > 0) c.g.stack(c.self,
                    EVOLVE,
                    n,
                    MAX_EVOLVE)
            },
        },
        E: {
            key: "E", name: "Sóng Huỷ Diệt", target: "all_enemies", mana: 35,
            desc: `Mọi tướng địch nhận {${F_E}} sát thương phép, tăng ${pct(PER_EVOLVE)}% mỗi Tiến Hoá.`,
            resolve(c) {
                const raw = c.f(F_E) * (1 + PER_EVOLVE * c.g.stackOf(c.self,
                    EVOLVE))
                for (const t of c.g.enemies(c.self)) {
                    if (t.token) continue
                    c.g.damage(c.self,
                        t,
                        raw,
                        "magic",
                        {
                            tag: "skill"
                        })
                }
            },
        },
        R: {
            key: "R", name: "Tiến Hoá Vinh Quang", target: "self", mana: 60,
            desc: `Nhân đôi Tiến Hoá của Viktor (tối đa ${MAX_EVOLVE}).`,
            resolve(c) {
                const cur = c.g.stackOf(c.self,
                    EVOLVE)
                c.g.setStack(c.self,
                    EVOLVE,
                    Math.min(MAX_EVOLVE,
                        cur * 2))
            },
        },
    },
})
