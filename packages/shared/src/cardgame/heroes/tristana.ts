// Tristana (Xạ thủ, vật lý): máu 360 · AD 80 · giáp/kháng 26/26.
// CHẤT: "Bom nổ chậm". Gắn Bom lên một đứa rồi nện cho nổ; chính vụ nổ hạ thật địch thì lấy lại 1 lá E.
// Bom = status "tri_bomb" trên tướng địch (v = số Nạp). E đặt hoặc +1 Nạp; mỗi đòn thật Tristana trúng người mang Bom +1 Nạp.
// Đủ 4 Nạp (ngưỡng tiêu Bom, không phải trần tăng trưởng) hoặc cuối lượt địch kế (g.delay, hạn KHÔNG dời khi nạp thêm) thì Bom tiêu và nổ.
// Mỗi Bom có định danh thế hệ riêng (target.stacks[BOMB_GEN]) để hẹn giờ của Bom cũ không kích Bom mới.
// Bom đã đặt nổ theo chính sách của nó kể cả khi Tristana đã chết (dùng chỉ số đơn vị Tristana lúc nổ) — g.delay(..., { surviveOwnerDeath: true }).
// Q thêm sát thương cho mỗi đòn thật trong lượt (không chí mạng), E gắn Bom, R kích nổ Bom trước rồi mới bắn và Choáng.
// Tuning v1: mana Q/E/R = 10/15/35; R Choáng d = 0,705 + 0,004·AD + 0,003·AP đơn vị.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    FOREVER, otherSide, type Unit
} from "../types"

export const BOMB = "tri_bomb"
/** Định danh thế hệ của Bom đang gắn trên mục tiêu (ẩn) */
const BOMB_GEN = "once:tri_bomb_gen"
/** Bộ đếm thế hệ Bom của Tristana (ẩn) */
const GEN_SEQ = "once:tri_gen_seq"
/** Cờ Q đang bật trong lượt này */
export const Q_ON = "tri_q"
/** Số Nạp để Bom tự nổ */
export const MAX_CHARGE = 4
export const F_BOOM = "40 + 100% AD + 55% AP"
export const F_CHARGE = "20 + 45% AD"
export const F_Q = "20 + 90% AD"
export const F_E = "45 + 100% AD + 35% AP"
export const F_R = "85 + 195% AD + 50% AP"
/** R: thời hạn Choáng d (đơn vị lượt) = 0,705 + 0,004 × AD + 0,003 × AP */
export const F_R_STUN = "0.7 + 0.4% AD + 0.3% AP"

/** Bom nổ: tiêu Bom, sát thương theo số Nạp (chỉ số Tristana lúc nổ); chính vụ nổ hạ thật tướng địch thì lấy 1 lá E từ bộ (thiếu mới tạo) */
function detonate(g: Game, me: Unit, t: Unit) {
    const n = g.statusV(t,
        BOMB)
    if (n <= 0 || t.status !== "board") return
    g.removeStatus(t,
        BOMB)
    delete t.stacks[BOMB_GEN]
    g.damage(me,
        t,
        g.f(me,
            F_BOOM) + n * g.f(me,
            F_CHARGE),
        "physical",
        {
            tag: "effect"
        })
    if (t.status !== "board" && !t.token) g.giveSkillToHand(me.side,
        me.hero,
        "E",
        "effect")
}

/** Cộng 1 Nạp (gắn Bom mới nếu chưa có, kèm hẹn giờ nổ cuối lượt địch kế); đủ Nạp thì nổ */
function charge(g: Game, me: Unit, t: Unit) {
    if (t.token || t.status !== "board" || t.side === me.side) return
    const fresh = !g.has(t,
        BOMB)
    g.status(t,
        BOMB,
        1,
        {
            until: FOREVER, add: true, v: 1, src: me.id
        })
    if (!g.has(t,
        BOMB)) return // bị chặn (miễn hiệu ứng...)
    if (fresh) {
        const gen = (me.stacks[GEN_SEQ] ?? 0) + 1
        me.stacks[GEN_SEQ] = gen
        t.stacks[BOMB_GEN] = gen
        // hẹn giờ: tới cuối lượt địch kế mà chưa đủ Nạp thì tự nổ; nạp thêm không dời hạn
        g.delay(me,
            "bomb",
            "turnEnd",
            otherSide(me.side),
            {
                target: t.id, gen
            },
            {
                surviveOwnerDeath: true // Bom đã gắn vẫn nổ khi Tristana đã ngã
            })
    }
    if (g.statusV(t,
        BOMB) >= MAX_CHARGE) detonate(g,
        me,
        t)
}

export default defineHero({
    id: "tristana", name: "Tristana", role: "marksman", damage: "physical", hp: 360, atk: 80, armor: 26, mr: 26,
    bot: {
        markValue: {
            tri_bomb: 40,
        },
        buffValue: {
            tri_q: 30,
        },
    },
    desc: "Bom nổ chậm: gắn Bom lên một đứa rồi nện cho nổ, nổ hạ được thì có Bom tiếp.",
    passive: {
        name: "Bom Hẹn Giờ",
        desc: `E đặt hoặc thêm 1 Nạp; mỗi đòn thật Tristana trúng người mang Bom thêm 1 Nạp. Đủ ${MAX_CHARGE} Nạp hoặc cuối lượt địch kế thì Bom tiêu và nổ, gây {${F_BOOM}} + Nạp × ({${F_CHARGE}}) sát thương vật lý. Chính vụ nổ hạ thật tướng địch sau cứu chết thì lấy 1 E từ bộ, thiếu mới tạo.`,
    },
    hooks: {
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss || d.target.side === me.side) return
            // Q: gói vật lý riêng, không nhân chí mạng của đòn chính
            if (g.has(me,
                Q_ON)) g.damage(me,
                d.target,
                g.f(me,
                    F_Q),
                "physical",
                {
                    tag: "attack"
                })
            if (g.has(d.target,
                BOMB)) charge(g,
                me,
                d.target)
        },
        onDelayed(g, me, d) {
            if (d.key !== "bomb") return
            const t = g.unit(String(d.data?.target ?? ""))
            if (!t || t.status !== "board" || !g.has(t,
                BOMB) || t.stacks[BOMB_GEN] !== Number(d.data?.gen)) return
            detonate(g,
                me,
                t)
        },
    },
    skills: {
        Q: {
            key: "Q", mana: 5, name: "Bắn Nhanh", target: "self",
            desc: `Tới hết lượt hiện tại, mỗi đòn thật trúng gây thêm {${F_Q}} sát thương vật lý; không cần có Bom và không cấp đòn.`,
            resolve(c) {
                c.g.status(c.self,
                    Q_ON,
                    1,
                    {
                        v: 1
                    })
            },
        },
        E: {
            key: "E", mana: 10, name: "Gắn Bom", target: "enemy",
            desc: `Chọn 1 tướng địch hợp lệ; gây {${F_E}} sát thương vật lý, rồi đặt Bom có 1 Nạp hoặc thêm 1 Nạp vào Bom đang có. Nạp lại không dời hạn nổ.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_E),
                    "physical",
                    {
                        tag: "skill"
                    })
                charge(c.g,
                    c.self,
                    t)
            },
        },
        R: {
            key: "R", mana: 30, name: "Đại Bác", target: "enemy",
            desc: `Chọn 1 tướng địch hợp lệ; kích Bom trên nó nổ trước. Nếu đích còn sống, gây {${F_R}} sát thương vật lý rồi Choáng d = {${F_R_STUN}} đơn vị nếu còn sống (phần lẻ là xác suất thêm 1 đơn vị). Không có Bom vẫn bắn và Choáng.`,
            resolve(c) {
                const t = c.target!
                detonate(c.g,
                    c.self,
                    t)
                if (t.status !== "board") return
                c.g.damage(c.self,
                    t,
                    c.f(F_R),
                    "physical",
                    {
                        tag: "skill"
                    })
                if (t.status !== "board") return
                // engine tự tung phần lẻ một lần sau kiểm tra miễn (law.md §4)
                const d = c.f(F_R_STUN)
                if (d > 0) c.g.status(t,
                    "stun",
                    d)
            },
        },
    },
})
