// Braum (Đỡ đòn, phép): máu 1060 · AD 62 · giáp/kháng 37/37.
// MỤC ĐÍCH: Bức tường phản ứng — chỉ chơi trong lượt đối thủ, mọi lá của Braum là một lá Quick chỉ-nối-chuỗi đỡ cho đồng đội.
// Q đỡ đòn đơn (đổi mục tiêu sang Braum), E đỡ chiêu nhiều mục tiêu (giảm sát thương), R đỡ trọn một chiêu (vô hiệu sát thương + khống chế, phản công kẻ tung).
// Nội tại: mỗi lá Quick của Braum giải quyết thì rút 1 lá (tay luôn có phản ứng mới). Engine: chain.
// Cơ chế engine dùng: quick + chainOnly, g.chainFx() (redirect, cut/cutSide/cutNoCc, reflectUnit/reflectPct).
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    Card, Ctx, Side
} from "../types"

const F_Q_SHIELD = "130 + 10% máu cộng thêm + 30% AP"
const F_R = "110 + 6% máu tối đa + 40% AP"
const REFLECT = 0.3
const CUT = 0.4

const isBraumQuick = (c: Card) => c.kind === "skill" && c.hero === "braum"
const braumQuickInHand = (g: Game, side: Side) => g.player(side).hand.filter(isBraumQuick).length
/** Nội tại Bức Tường Freljord: lá Quick của Braum giải quyết xong thì rút 1 lá */
const wall = (c: Ctx) => { c.g.draw(c.side,
    1,
    {
        reason: "skill", by: c.self.id
    }) }

export default defineHero({
    id: "braum", name: "Braum", role: "tank", damage: "magic", hp: 1750, atk: 81, armor: 37, mr: 37,
    skillCopies: {
        Q: 9, E: 7, R: 3
    },
    desc: "Tấm khiên của Freljord: chỉ chơi trong lượt đối thủ. Q đỡ đòn đơn, E đỡ chiêu diện rộng, R chặn trọn một chiêu; mỗi lần đỡ lại rút lá mới.",
    passive: {
        name: "Bức Tường Freljord",
        desc: "Mọi lá chiêu của Braum là lá **Quick chỉ nối chuỗi**. Mỗi khi một lá Quick của Braum giải quyết xong, bạn rút 1 lá.",
    },
    skills: {
        Q: {
            key: "Q", name: "Đứng Sau Tôi", target: "none", quick: true, chainOnly: true,
            desc: `**Quick, chỉ nối chuỗi**, khi địch đánh/tung chiêu nhắm đúng 1 tướng mình: đổi mục tiêu sang Braum, Braum nhận Khiên {${F_Q_SHIELD}}. **Điều kiện:** Braum đang có Khiên từ trước thì phản lại ${REFLECT * 100}% sát thương đó cho kẻ tấn công.`,
            quickWhen: (c) => c.trigger.side !== c.side && !!c.trigger.single
                && (c.trigger.target === c.self.id || !!c.trigger.redirectable?.includes(c.self.id)),
            resolve(c) {
                const braum = c.self
                const had = braum.shield > 0
                const fx = c.g.chainFx()
                if (c.trigger?.target !== braum.id) fx.redirect = braum.id
                c.g.shield(braum,
                    braum,
                    c.f(F_Q_SHIELD))
                if (had) { fx.reflectUnit = braum.id; fx.reflectPct = REFLECT }
                wall(c)
            },
        },
        E: {
            key: "E", name: "Bất Khả Xâm Phạm", target: "none", quick: true, chainOnly: true,
            desc: `**Quick, chỉ nối chuỗi**, khi địch tung chiêu nhắm nhiều tướng mình (tối đa N hoặc mọi tướng): mọi tướng mình nhận ít hơn ${CUT * 100}% sát thương từ chiêu đó. **Điều kiện:** chiêu bị đỡ là chiêu cuối (R) thì tướng mình còn miễn khống chế của nó.`,
            quickWhen: (c) => c.trigger.side !== c.side && !!c.trigger.multi,
            resolve(c) {
                const fx = c.g.chainFx()
                fx.cut = CUT; fx.cutSide = c.side
                if (c.trigger?.ult) fx.cutNoCc = true
                wall(c)
            },
        },
        R: {
            key: "R", name: "Vết Nứt Băng Giá", target: "none", quick: true, chainOnly: true,
            desc: `**Quick, chỉ nối chuỗi**, khi địch tung một lá chiêu nhắm tướng mình: tướng mình **không nhận sát thương và khống chế** từ lá đó, kẻ tung nhận {${F_R}} sát thương phép và bị Buốt 1 lượt. **Điều kiện:** trên tay bạn còn từ 2 lá Braum thì mọi tướng địch cùng nhận sát thương và Buốt.`,
            quickWhen: (c) => c.trigger.side !== c.side && !!c.trigger.card && c.trigger.card.kind !== "support" && !!c.trigger.target,
            resolve(c) {
                const fx = c.g.chainFx()
                fx.cut = 1; fx.cutSide = c.side; fx.cutNoCc = true
                const caster = c.g.unit(c.trigger?.actor)
                const wide = braumQuickInHand(c.g,
                    c.side) >= 2
                const hit = wide ? c.g.enemies(c.self) : caster && caster.status === "board" && caster.side !== c.side ? [caster] : []
                for (const t of hit) {
                    c.g.damage(c.self,
                        t,
                        c.f(F_R),
                        "magic",
                        {
                            tag: "skill"
                        })
                    c.g.status(t,
                        "chill",
                        1)
                }
                wall(c)
            },
        },
    },
})
