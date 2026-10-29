// Tristana (Xạ thủ, vật lý): máu 350 · AD 118 · giáp/kháng 26/26.
// CHẤT: "Bom nổ chậm". Gắn Bom lên một đứa rồi nện cho nổ; Bom nổ hạ được địch thì lá E quay về tay.
// Bom = status "tri_bomb" trên địch (v = số Nạp, tối đa 4). Đòn đánh của Tristana lên địch mang Bom +1 Nạp; đủ 4 Nạp hoặc tới cuối lượt địch kế (g.delay) thì nổ.
// Q thêm sát thương cho mỗi đòn đánh trong lượt, E gắn Bom, R bắn Đại Bác kích nổ Bom ngay và Choáng.
// Đối thủ trả lời: Janna (huỷ đòn), Zed (dồn Tristana chết sớm), Choáng/Câm Lặng trước khi nện đủ Nạp.
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
/** Cờ Q đang bật trong lượt này */
export const Q_ON = "tri_q"
/** Số Nạp để Bom tự nổ */
export const MAX_CHARGE = 4
export const F_BOOM = "40 + 50% AD + 50% AP"
export const F_CHARGE = "15 + 20% AD"
export const F_Q = "20 + 40% AD"
export const F_E = "30 + 40% AD + 30% AP"
export const F_R = "80 + 100% AD + 50% AP"

/** Bom nổ: sát thương theo số Nạp; hạ được địch thì lá E về tay */
function detonate(g: Game, me: Unit, t: Unit) {
    const n = g.statusV(t,
        BOMB)
    if (n <= 0 || t.status !== "board") return
    g.removeStatus(t,
        BOMB)
    g.damage(me,
        t,
        g.f(me,
            F_BOOM) + n * g.f(me,
            F_CHARGE),
        "physical",
        {
            tag: "effect"
        })
    if (t.status !== "board") g.giveSkillToHand(me.side,
        me.hero,
        "E",
        "effect")
}

/** Cộng 1 Nạp (gắn Bom mới nếu chưa có); đủ Nạp thì nổ */
function charge(g: Game, me: Unit, t: Unit) {
    if (t.token || t.status !== "board") return
    const fresh = !g.has(t,
        BOMB)
    g.status(t,
        BOMB,
        1,
        {
            until: FOREVER, add: true, max: MAX_CHARGE, v: 1, src: me.id
        })
    if (fresh) {
        // hẹn giờ: tới cuối lượt địch kế mà chưa đủ Nạp thì tự nổ (gen để bỏ qua hẹn giờ cũ của Bom đã nổ)
        g.delay(me,
            "bomb",
            "turnEnd",
            otherSide(me.side),
            {
                target: t.id, gen: t.statuses[BOMB]?.at ?? 0
            })
    }
    if (g.statusV(t,
        BOMB) >= MAX_CHARGE) detonate(g,
        me,
        t)
}

export default defineHero({
    id: "tristana", name: "Tristana", role: "marksman", damage: "physical", hp: 350, atk: 118, armor: 26, mr: 26,
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
        desc: `Đòn đánh của Tristana lên địch mang Bom: Bom +1 Nạp. Đủ ${MAX_CHARGE} Nạp hoặc tới cuối lượt địch kế thì Bom nổ, gây {${F_BOOM}} sát thương vật lý, cộng {${F_CHARGE}} mỗi Nạp. Bom nổ hạ được địch thì lá E quay về tay.`,
    },
    hooks: {
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss || !g.has(me,
                Q_ON)) return
            d.info.bonus.push({
                raw: g.f(me,
                    F_Q), kind: "physical"
            })
        },
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id || !g.has(d.target,
                BOMB)) return
            charge(g,
                me,
                d.target)
        },
        onDelayed(g, me, d) {
            if (d.key !== "bomb") return
            const t = g.unit(String(d.data?.target ?? ""))
            if (!t || t.status !== "board" || t.statuses[BOMB]?.at !== Number(d.data?.gen)) return
            detonate(g,
                me,
                t)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Bắn Nhanh", target: "self",
            desc: `Lượt này mỗi đòn đánh của Tristana thêm {${F_Q}} sát thương vật lý.`,
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
            key: "E", name: "Gắn Bom", target: "enemy",
            desc: `Chọn 1 tướng địch; nó nhận {${F_E}} sát thương vật lý và bị gắn Bom (+1 Nạp).`,
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
            key: "R", name: "Đại Bác", target: "enemy",
            desc: `Chọn 1 tướng địch; nó nhận {${F_R}} sát thương vật lý, Bom trên nó nổ ngay và nó bị Choáng 1 lượt.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_R),
                    "physical",
                    {
                        tag: "skill"
                    })
                detonate(c.g,
                    c.self,
                    t)
                if (t.status === "board") c.g.status(t,
                    "stun",
                    1)
            },
        },
    },
})
