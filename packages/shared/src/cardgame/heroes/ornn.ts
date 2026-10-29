// Ornn (Đỡ đòn, phép): máu 1000 · AD 66 · giáp/kháng 40/36.
// MỤC ĐÍCH: Lò rèn của đội — Ornn không gây sát thương: cấp mảnh Đồ, lục bộ tìm Vàng/Đồ, và tiêu Vàng để nâng đồ đồng đội thành Kiệt Tác.
// Kiệt Tác = stack "itemAmp" (%) hiện trên tướng: Game.stats nhân mọi chỉ số từ đồ (+100% = gấp đôi). Engine: items.
// Cơ chế engine dùng: stack itemAmp, g.tutor, combine/getItem để rèn đồ ngay (R), event craft.
import {
    combine, getItem
} from "../../items"
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    RULES
} from "../types"
import type {
    Card, Side, Unit
} from "../types"

const AMP = 30
const AMP_MAX = 100
const F_Q = "40 + 8% máu cộng thêm + 30% AP"
const F_E_SHIELD = "40 + 30% AP"
const F_R = "60 + 10% máu cộng thêm + 30% AP"

const isGold = (x: Card) => x.kind === "support" && x.id === "gold"
const isComponent = (x: Card) => x.kind === "support" && x.id === "item"
const hand = (g: Game, side: Side) => g.player(side).hand

/** Cộng % Kiệt Tác cho đồ của u, giữ đúng máu (máu tối đa và máu hiện tại tăng theo phần máu cộng thêm) */
export function addItemAmp(g: Game, u: Unit, pct: number, max = AMP_MAX) {
    const before = g.bonusHp(u)
    g.stack(u,
        "itemAmp",
        pct,
        max)
    const dh = g.bonusHp(u) - before
    u.maxHp += dh; if (u.status === "board") u.hp += dh
}
/** Rèn ngay 1 món đồ từ 2 mảnh ngẫu nhiên (không tốn lá) cho u. Trả về id món hoặc undefined. */
export function forgeRandom(g: Game, u: Unit): string | undefined {
    if (u.items.length >= RULES.itemSlots) return undefined
    for (let tries = 0; tries < 20; tries++) {
        const id = combine(g.randomComponent(),
            g.randomComponent())
        if (!id || !getItem(id)) continue
        g.equip(u,
            id)
        return id
    }
    return undefined
}

export default defineHero({
    id: "ornn", name: "Ornn", role: "tank", damage: "magic", hp: 1010, atk: 68, armor: 40, mr: 36,
    skillCopies: {
        Q: 3, E: 3, R: 1
    },
    supportCopies: {
        basic: 7, gold: 5, item: 3
    },
    desc: "Thần Rèn dưới chân núi: không phải kẻ gây sát thương mà là lò rèn của đội. Cấp mảnh Đồ, tìm Vàng, rèn đồ đồng đội thành Kiệt Tác.",
    passive: {
        name: "Lò Rèn Sống",
        desc: "Đầu lượt của bạn, nếu trên tay có lá Vàng nhưng không có lá Đồ (mảnh) nào, Ornn tạo 1 lá Đồ (mảnh ngẫu nhiên) lên tay.",
    },
    hooks: {
        onTurnStart(g, me, d) {
            if (d.side === me.side && hand(g,
                me.side).some(isGold) && !hand(g,
                me.side).some(isComponent)) g.giveCard(me.side,
                g.supportCard("item"),
                "hand")
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Thổi Bễ", target: "none",
            desc: `Tìm trong bộ bài 1 lá Vàng (nếu tay chưa có Vàng) hoặc 1 lá Đồ (nếu đã có) lên tay. Ornn nhận Khiên {${F_Q}}. **Điều kiện:** sau đó tay bạn đủ 2 Đồ + 1 Vàng (ghép được đồ) thì rút thêm 1 lá.`,
            resolve(c) {
                const want = hand(c.g,
                    c.side).some(isGold) ? isComponent : isGold
                c.g.tutor(c.side,
                    want)
                c.g.shield(c.self,
                    c.self,
                    c.f(F_Q))
                const h = hand(c.g,
                    c.side)
                if (h.some(isGold) && h.filter(isComponent).length >= 2) c.g.draw(c.side,
                    1,
                    {
                        reason: "skill", by: c.self.id
                    })
            },
        },
        E: {
            key: "E", name: "Rèn Kiệt Tác", target: "ally",
            desc: `Bỏ 1 lá Vàng trên tay: đồ của 1 tướng mình (đang đeo đồ) được rèn lên **Kiệt Tác**: mọi chỉ số từ đồ +${AMP}% (tối đa +${AMP_MAX}% = gấp đôi, hiện trên tướng). Ornn nhận Khiên {${F_E_SHIELD}}. **Điều kiện:** tướng đó đeo đủ 3 món thì bạn rút 1 lá.`,
            canPlay: (c) => hand(c.g,
                c.side).some(isGold),
            options: (c) => c.g.heroes(c.side).filter((u) => u.items.length > 0 && c.g.stackOf(u,
                "itemAmp") < AMP_MAX).map((u) => ({
                target: u.id
            })),
            resolve(c) {
                const gold = hand(c.g,
                    c.side).find(isGold)
                if (!gold) return
                c.g.discard(c.side,
                    gold.uid,
                    "cost")
                const t = c.target!
                addItemAmp(c.g,
                    t,
                    AMP)
                c.g.shield(c.self,
                    c.self,
                    c.f(F_E_SHIELD))
                if (t.items.length >= 3) c.g.draw(c.side,
                    1,
                    {
                        reason: "skill", by: c.self.id
                    })
            },
        },
        R: {
            key: "R", name: "Lời Hiệu Triệu Thần Rèn", target: "allies_upto", max: 1,
            desc: `1 tướng mình: được rèn ngay 1 món đồ ngẫu nhiên (không tốn lá) và nhận Khiên {${F_R}}. **Điều kiện:** tướng đã đeo đủ 3 món thì đồ của nó được rèn Kiệt Tác +${AMP}% thay vì món mới.`,
            resolve(c) {
                for (const u of c.targets) {
                    if (u.token) continue
                    if (u.items.length >= RULES.itemSlots) addItemAmp(c.g,
                        u,
                        AMP)
                    else forgeRandom(c.g,
                        u)
                    c.g.shield(c.self,
                        u,
                        c.f(F_R))
                }
            },
        },
    },
})
