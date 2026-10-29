// Qiyana (Sát thủ, vật lý): máu 820 · AD 80 · giáp/kháng 30/28.
// MỤC ĐÍCH: Nguyên tố = lá trên cùng mộ bài của bạn (công khai). Đá (Vàng, Đồ) → Choáng; Sông (Rút Bài, phép bổ trợ) → Buốt;
// Cỏ (Đánh thường, lá chiêu) → chém mạnh hơn. Dùng chiêu thì lá chiêu rơi lên mộ (thành Cỏ), nên muốn Đá/Sông phải tự đốt bài (E)
// và đánh cược lá trên cùng bộ bài. R đốt bộ địch và lấy mọi nguyên tố lật được. Engine: grave, mill. Độ khó: PHỨC TẠP.
// Đối thủ trả lời: đổi lá trên cùng mộ của Qiyana (bắt bỏ bài / đốt bộ của cô), hoặc phản ứng trong lượt cô; cô tự đốt bộ nên cạn bài nhanh.
import {
    defineHero
} from "../registry"
import type {
    Card, Ctx, Unit
} from "../types"
import {
    otherSide
} from "../types"
import type {
    Game
} from "../game"

export type Element = "rock" | "river" | "grass";
const NAME: Record<Element, string> = {
    rock: "Đá", river: "Sông", grass: "Cỏ"
}
const F_Q = "45 + 65% AD + 20% AP"
const GRASS_AMP = 0.4
const F_E_SHIELD = "40 + 30% AD"
const F_R = "60 + 50% AD + 30% AP"
const R_BURN = 3

/** Nguyên tố của một lá */
export function elementOf(c: Card | undefined): Element | undefined {
    if (!c) return undefined
    if (c.kind === "support") return c.id === "gold" || c.id === "item" ? "rock" : c.id === "basic" ? "grass" : "river"
    return "grass"
}
/** Nguyên tố hiện tại của Qiyana = lá trên cùng mộ bài phe cô */
export const qiyanaElement = (g: Game, side: "A" | "B") => elementOf(g.player(side).grave.at(-1))

function applyElement(c: Ctx, t: Unit, el: Element | undefined) {
    if (t.status !== "board") return
    if (el === "rock") c.g.status(t,
        "stun",
        1)
    else if (el === "river") c.g.status(t,
        "chill",
        2)
}

export default defineHero({
    id: "qiyana", name: "Qiyana", role: "assassin", damage: "physical", hp: 670, atk: 73, armor: 30, mr: 28,
    skillCopies: {
        Q: 5, E: 4, R: 2
    },
    desc: "Nữ hoàng Nguyên Tố: lá trên cùng mộ bài quyết định nguyên tố của mỗi nhát chém; tự đốt bài để đổi nguyên tố, R đốt bộ địch.",
    passive: {
        name: "Đặc Quyền Hoàng Gia",
        desc: `Nguyên tố của Qiyana là lá trên cùng mộ bài của bạn: **Đá** (Vàng, Đồ), **Sông** (Rút Bài, phép bổ trợ), **Cỏ** (Đánh thường, lá chiêu). Mỗi lá bị đốt từ bộ bài của bạn cho Qiyana Khiên {${F_E_SHIELD}}.`,
    },
    hooks: {
        onBurn(g, me, d) {
            if (d.side !== me.side) return
            g.shield(me,
                me,
                g.f(me,
                    F_E_SHIELD))
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Lưỡi Kiếm Nguyên Tố", target: "enemy",
            desc: `{${F_Q}} sát thương vật lý lên 1 tướng địch, theo nguyên tố lúc chém: **Đá** Choáng 1 lượt · **Sông** Buốt 2 lượt · **Cỏ** mạnh thêm ${GRASS_AMP * 100}%. **Điều kiện:** mộ bài trống thì không có nguyên tố.`,
            resolve(c) {
                const t = c.target!
                const el = qiyanaElement(c.g,
                    c.side)
                c.g.log(`Qiyana: ${el ? NAME[el] : "-"}`)
                c.g.damage(c.self,
                    t,
                    c.f(F_Q) * (el === "grass" ? 1 + GRASS_AMP : 1),
                    "physical",
                    {
                        tag: "skill"
                    })
                applyElement(c,
                    t,
                    el)
            },
        },
        E: {
            key: "E", name: "Bẻ Cong Địa Hình", target: "none",
            desc: "Lá này vào mộ trước, rồi đốt 1 lá trên cùng bộ bài của bạn: lá bị đốt nằm trên cùng mộ và thành nguyên tố mới. **Điều kiện:** lá bị đốt là lá chiêu của Qiyana thì nó về tay thay vì vào mộ.",
            resolve(c) {
                c.vanish()
                c.g.player(c.side).grave.push(c.card)
                const [burned] = c.g.burn(c.side,
                    1)
                if (burned && burned.kind === "skill" && burned.hero === "qiyana") {
                    const gr = c.g.player(c.side).grave
                    const i = gr.findIndex((x) => x.uid === burned.uid)
                    if (i >= 0) {
                        gr.splice(i,
                            1)
                        c.g.emit({
                            t: "returnToHand", side: c.side, card: burned
                        })
                        c.g.giveCard(c.side,
                            burned,
                            "hand")
                    }
                }
            },
        },
        R: {
            key: "R", name: "Màn Phô Diễn Tài Năng", target: "all_enemies",
            desc: `Đốt ${R_BURN} lá trên cùng bộ bài đối thủ. Mọi tướng địch nhận {${F_R}} sát thương vật lý và chịu hiệu ứng của MỖI nguyên tố khác nhau trong các lá vừa đốt (Đá: Choáng, Sông: Buốt, Cỏ: +${GRASS_AMP * 100}% sát thương).`,
            resolve(c) {
                const burned = c.g.burn(otherSide(c.side),
                    R_BURN)
                const els = new Set(burned.map(elementOf).filter((x): x is Element => !!x))
                for (const t of c.g.enemies(c.self)) {
                    c.g.damage(c.self,
                        t,
                        c.f(F_R) * (els.has("grass") ? 1 + GRASS_AMP : 1),
                        "physical",
                        {
                            tag: "skill"
                        })
                    if (els.has("rock")) applyElement(c,
                        t,
                        "rock")
                    if (els.has("river")) applyElement(c,
                        t,
                        "river")
                }
            },
        },
    },
})
