// Lissandra (Pháp sư, phép) V3: "Hoá Băng bài địch": đánh trúng là có thể đóng băng bài trên tay địch, băng càng dày càng nguy. Máu 340 · AD 69 · giáp/kháng 26/29 · AP gốc 0.
// Hoá Băng = Card.frozen: lá vẫn chiếm chỗ nhưng không đánh/ghép/nối chuỗi được; engine tự tan băng khi Lissandra chết thật (g.kill → thawCards).
// Nội tại: mỗi hit đánh thường thật hoặc mỗi lá chiêu gốc trên mỗi tướng địch gây sát thương dương thực vào Máu/Khiên có
// min(100%, 18% + 5% mỗi 100 AD + 10% mỗi 100 AP) cơ hội Hoá Băng 1 lá chưa băng ngẫu nhiên. Loại sát thương thưởng/đồ/phản/DoT (chỉ tag "attack"/"skill").
// Bí mật: sự kiện cardFrozen chỉ mang uid + tướng chủ của lá (public), không lộ id/khoá chiêu cho đối thủ.
// Mana bể chung (starci-33 tuning v1, giữ nguồn): Q 20 · E 30 · R 50.
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
    GameEvent,
    Side,
    Unit
} from "../types"
import {
    otherSide
} from "../types"

/** Cơ hội nội tại: 18% + 5% mỗi 100 AD + 10% mỗi 100 AP */
export const PROC_BASE = 0.18
export const PROC_PER_100_AD = 0.05
export const PROC_PER_100_AP = 0.1
/** E: Choáng d = 0,9 + 0,001 AD + 0,002 AP (g.scaling: ad/ap theo 100 điểm) */
export const STUN_E = {
    base: 0.9, ad: 0.1, ap: 0.2
}
const F_PROC = `${pct(PROC_BASE)}% + ${pct(PROC_PER_100_AD)}% mỗi 100 AD + ${pct(PROC_PER_100_AP)}% mỗi 100 AP`
const F_Q = "125 + 40% AD + 80% AP"
const F_E = "100 + 50% AD + 70% AP"
const F_R_CARD = "45 + 15% AD + 20% AP"

/** Cơ hội Hoá Băng mỗi lần trúng (g.chance: base + ad theo 100 AD + ap theo 100 AP, kẹp [0, 1]) */
export const freezeChance = (g: Game, me: Unit) => g.chance(me,
    {
        base: PROC_BASE, ad: PROC_PER_100_AD, ap: PROC_PER_100_AP
    })

/** Phần công khai của lá bị băng: uid + tướng chủ (+ cờ tạm). Không lộ id/khoá chiêu hay dữ liệu ẩn khác. */
export const publicFrozenCard = (c: Card) => ({
    uid: c.uid, hidden: true as const, ...(c.hero ? {
        hero: c.hero
    } : {
    }), ...(c.temp ? {
        temp: true as const
    } : {
    })
})

/** Hoá Băng 1 lá chưa băng ngẫu nhiên đều trên tay `side` (kể cả lá tạm). Sự kiện chỉ mang phần công khai của lá. */
export function freezeOne(g: Game, side: Side, by: string): Card | undefined {
    const pool = g.player(side).hand.filter((c) => !c.frozen)
    if (!pool.length) return undefined
    const card = pool[g.randInt(pool.length)]
    card.frozen = by
    g.emit({
        t: "cardFrozen", side, card: publicFrozenCard(card) as unknown as Card, by
    } as GameEvent)
    return card
}

/** Một lần thử nội tại trên tướng địch t */
function procFreeze(g: Game, me: Unit, t: Unit) {
    if (t.side === me.side || t.token) return
    if (g.rollLog(freezeChance(g,
        me),
    (hit, p) => (hit ? `Lissandra: Hoá Băng 1 lá trên tay đối thủ (tỉ lệ ${p})` : undefined))) freezeOne(g,
        otherSide(me.side),
        me.id)
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

export default defineHero({
    id: "lissandra", name: "Lissandra", role: "mage", damage: "magic", hp: 340, atk: 69, armor: 26, mr: 29,
    desc: "Hoá Băng bài địch: đòn thật và chiêu của Lissandra có thể đóng băng lá trên tay đối thủ, E Choáng đúng tướng có bài bị băng, R trút băng lên cả đội địch rồi tự đóng băng để thoát chết. Muốn tan băng thì phải hạ Lissandra.",
    passive: {
        name: "Tay Băng Giá",
        desc: `Khi một hit đánh thường thật hoặc một lá chiêu gốc trên mỗi tướng địch gây sát thương dương thực vào Máu/Khiên, có {${F_PROC}} cơ hội Hoá Băng 1 lá chưa băng ngẫu nhiên trên tay đối thủ. Mỗi hit/lá trên một mục tiêu chỉ thử 1 lần; loại sát thương thưởng, đồ, phản và theo thời gian. Lá băng không dùng/ghép/nối Chuỗi được, vẫn chiếm chỗ; tan khi Lissandra chết thật. Đối thủ chỉ thấy số lá băng và tướng chủ của lá.`,
    },
    hooks: {
        onDamage(g, me, d) {
            // Q/E/R của Lissandra gây đúng 1 gói sát thương chiêu lên mỗi mục tiêu, nên mỗi lá/mục tiêu tự nhiên chỉ thử 1 lần.
            if (d.src?.id !== me.id || d.amount <= 0 || d.tag !== "skill") return
            procFreeze(g,
                me,
                d.target)
        },
        onAttackHit(g, me, d) {
            // mỗi hit đánh thường thật thử 1 lần theo gói chính; gói thưởng của đòn (cũng tag "attack") không thử riêng
            if (d.attacker.id !== me.id || d.dealt <= 0) return
            procFreeze(g,
                me,
                d.target)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Mảnh Băng", target: "enemy", mana: 20,
            desc: `Chọn 1 tướng địch bất kỳ đường, gây {${F_Q}} sát thương phép; nếu sát thương thực vào Máu/Khiên dương, lá này thử Hoá Băng một lần.`,
            resolve(c) {
                c.g.damage(c.self,
                    c.target!,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
            },
        },
        E: {
            key: "E", name: "Vòng Băng", target: "enemy", mana: 30,
            desc: `Trước sát thương, kiểm tra có lá chiêu của đúng tướng đích đang bị chính Lissandra này Hoá Băng hay không. Gây {${F_E}} sát thương phép; có điều kiện từ trước thì thử Choáng d = 0,9 + 0,001 AD + 0,002 AP đơn vị, không đợi lần Hoá Băng của chính E.`,
            resolve(c) {
                const t = c.target!
                const iced = c.g.frozenCards(otherSide(c.side),
                    c.self.id).some((x) => x.kind === "skill" && x.hero === t.hero)
                c.g.damage(c.self,
                    t,
                    c.f(F_E),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (iced) tryStun(c.g,
                    c.self,
                    t,
                    STUN_E)
            },
        },
        R: {
            key: "R", name: "Hầm Mộ Băng", target: "all_enemies", mana: 50,
            desc: `Chụp n lá còn bị chính Lissandra Hoá Băng khi R bắt đầu giải quyết. Mỗi tướng địch hợp lệ nhận n × {${F_R_CARD}} sát thương phép; rồi Lissandra tự đóng băng tới hết lượt đối phương: miễn sát thương, không bị chọn, không hành động. n = 0 vẫn tự vệ; không Quick.`,
            resolve(c) {
                const g = c.g
                const me = c.self
                const n = g.frozenCards(otherSide(c.side),
                    me.id).length
                if (n > 0) {
                    const raw = c.f(F_R_CARD) * n
                    for (const t of g.enemies(me).filter((u) => !u.token)) {
                        g.damage(me,
                            t,
                            raw,
                            "magic",
                            {
                                tag: "skill"
                            })
                    }
                }
                g.stasis(me,
                    1,
                    otherSide(c.side))
            },
        },
    },
})
