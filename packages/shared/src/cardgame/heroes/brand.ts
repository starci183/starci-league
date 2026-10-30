// Brand (Pháp sư, phép) V3: "Bỏng cháy mãi mãi, spam chiêu là cháy hết." Máu 320 · AD 70 · giáp/kháng 25/28 · AP gốc 0.
// Bỏng = status "burn" (v = số tầng, vĩnh viễn FOREVER, cộng dồn KHÔNG trần, src = Brand). Mục tiêu chết thật: engine xoá status nên mất Bỏng.
// Nội tại: mỗi Standby của phe mang dấu, mỗi tầng gây (1% máu tối đa của nó + 2 + 1.4% AD + 2% AP của Brand) sát thương phép (tag dot).
// Lịch cháy: hook onStandby (engine phát mỗi đầu lượt, kể cả khi Brand chết/bị khống chế). Khoá theo turnNo đảm bảo mỗi Standby chỉ cháy 1 lần.
// Mana bể chung (starci-33 tuning v1): Q 20 · E 30 · R 50.
import type {
    Game
} from "../game"
import {
    pct
} from "../formula"
import {
    defineHero
} from "../registry"
import type {
    Side,
    Unit
} from "../types"
import {
    FOREVER,
    otherSide
} from "../types"

export const BURN = "burn"
/** Không trần tầng Bỏng (tuning v1 bỏ trần 12) */
export const BURN_MAX = Infinity
/** Mỗi Bỏng cháy bấy nhiêu phần máu tối đa của tướng bị cháy */
export const TICK_MAX_HP = 0.01
/** Q: mục tiêu đã có từ bấy nhiêu Bỏng TRƯỚC lá thì thử Choáng */
export const Q_STUN_BURN = 3
/** Q: Choáng d = 0,9 + 0,001 AD + 0,002 AP (g.scaling: ad/ap theo 100 điểm) */
export const STUN_Q = {
    base: 0.9, ad: 0.1, ap: 0.2
}
const F_TICK = "2 + 1.5% AD + 2% AP"
const F_Q = "105 + 65% AD + 90% AP"
const F_E = "45 + 15% AD + 30% AP"
const F_R = "100 + 30% AD + 50% AP"
/** Khoá g.oncePerTurn trên Brand (stack ẩn "once:"): mỗi Standby chỉ cháy 1 lần */
const TICKED = "brand_burn_tick"

/** Thêm n tầng Bỏng (không bao giờ hết, không trần). Gắn dấu không có VFX lửa; lửa chỉ hiện khi cháy. */
export const ignite = (g: Game, t: Unit, n: number, visualGroup?: string) => {
    if (t.status !== "board" || t.token || n <= 0) return
    g.status(t,
        BURN,
        1,
        {
            v: n, add: true, until: FOREVER, visuals: [], tickVisuals: ["burn"], visualGroup
        })
}
/** Bỏng của t cháy 1 lần: mỗi tầng gây (1% máu tối đa của t + 2 + 1.4% AD + 2% AP của Brand) sát thương phép, không chí mạng */
export const burnTick = (g: Game, me: Unit, t: Unit, visualGroup?: string) => {
    const n = g.statusV(t,
        BURN)
    if (n <= 0 || t.status !== "board") return
    g.damage(me,
        t,
        (t.maxHp * TICK_MAX_HP + g.f(me,
            F_TICK)) * n,
        "magic",
        {
            tag: "dot", visuals: t.statuses[BURN]?.tickVisuals ?? ["burn"], visualGroup
        })
}
/** Standby của `side`: mọi tướng phe đó đang mang Bỏng của Brand này cháy 1 lần (nhóm hình ảnh chung) */
function standbyTick(g: Game, me: Unit, side: Side) {
    if (side === me.side || !g.oncePerTurn(me,
        TICKED)) return
    const visualGroup = `${me.id}:burn:turn:${g.s.turnNo}`
    for (const t of g.board(side)) {
        if (t.token) continue
        const src = t.statuses[BURN]?.src
        if (src && src !== me.id) continue
        burnTick(g,
            me,
            t,
            visualGroup)
    }
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
            of: otherSide(me.side), visuals: ["stunHit"]
        })
}
/** Mọi tướng địch (không tính vật triệu hồi) */
const foes = (g: Game, me: Unit) => g.enemies(me).filter((u) => !u.token)

export default defineHero({
    id: "brand", name: "Brand", role: "mage", damage: "magic", hp: 320, atk: 70, armor: 25, mr: 28,
    bot: {
        markValue: {
            burn: 20,
        },
    },
    desc: "Bỏng cháy mãi mãi: Q Choáng kẻ đã cháy đủ, E gắn Bỏng lên cả bàn cùng lúc, R nhân đôi mọi đống Bỏng rồi đốt ngay. Bỏng không trần và cháy mỗi Standby của địch, kể cả khi Brand đã ngã.",
    passive: {
        name: "Bùng Cháy",
        desc: `Bỏng cộng dồn không trần, không tự hết hạn. Mỗi Standby của phe mang dấu, mỗi tầng gây ${pct(TICK_MAX_HP)}% Máu tối đa mục tiêu + {${F_TICK}} của Brand sát thương phép; Brand chết, Choáng hay Câm Lặng vẫn cháy. Mục tiêu chết thì mất Bỏng; Thanh Tẩy gỡ được Bỏng.`,
    },
    hooks: {
        onStandby(g, me, d) {
            standbyTick(g,
                me,
                d.side)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Thiêu Rụi", target: "enemy", mana: 20,
            desc: `Chọn 1 tướng địch bất kỳ đường; gây {${F_Q}} sát thương phép rồi thêm 1 Bỏng. Nếu trước lá nó đã có ít nhất ${Q_STUN_BURN} Bỏng: thử Choáng d = 0,9 + 0,001 AD + 0,002 AP đơn vị. Khiên hoặc miễn riêng sát thương không chặn Bỏng/Choáng; miễn toàn lá thì chặn.`,
            resolve(c) {
                const t = c.target!
                const had = c.g.statusV(t,
                    BURN)
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill", visuals: ["fireHit"]
                    })
                ignite(c.g,
                    t,
                    1)
                if (had >= Q_STUN_BURN) tryStun(c.g,
                    c.self,
                    t,
                    STUN_Q)
            },
        },
        E: {
            key: "E", name: "Rải Lửa", target: "all_enemies", mana: 30,
            desc: `Mọi tướng địch hợp lệ cùng lúc nhận {${F_E}} sát thương phép và 1 Bỏng (chỉ gắn dấu, Bỏng cháy ở Standby của địch); không tác động vật triệu hồi.`,
            resolve(c) {
                const visualGroup = `${c.self.id}:e:${c.card.uid}:${c.g.s.turnNo}`
                for (const t of foes(c.g,
                    c.self)) {
                    c.g.damage(c.self,
                        t,
                        c.f(F_E),
                        "magic",
                        {
                            tag: "skill", visuals: ["fireHit"], visualGroup
                        })
                    ignite(c.g,
                        t,
                        1,
                        visualGroup)
                }
            },
        },
        R: {
            key: "R", name: "Bão Lửa", target: "all_enemies", mana: 50,
            desc: `Mọi tướng địch hợp lệ nhận {${F_R}} sát thương phép; người còn hợp lệ có số Bỏng nhân 2 rồi cháy ngay 1 lần theo nội tại, giữ nguyên toàn bộ số tầng sau cháy. Không tự thêm Bỏng nếu trước đó bằng 0.`,
            resolve(c) {
                for (const t of foes(c.g,
                    c.self)) {
                    c.g.damage(c.self,
                        t,
                        c.f(F_R),
                        "magic",
                        {
                            tag: "skill", visuals: ["explosion"]
                        })
                    const n = c.g.statusV(t,
                        BURN)
                    if (n > 0) ignite(c.g,
                        t,
                        n)
                    burnTick(c.g,
                        c.self,
                        t)
                }
            },
        },
    },
})
