// Darius (Đấu sĩ, vật lý): máu 430 · AD 108 · giáp/kháng 31/29 (V3).
// CHẤT: "Xay một thằng". Đòn đánh nào của Darius cũng cắm Chảy Máu (cộng dồn, hiện số trên tướng); Q cắm thêm 2;
// E giữ kẻ đối diện (trống thì Kéo một địch về); R Máy Chém xả toàn bộ Chảy Máu thành sát thương chuẩn, hạ được thì lá về tay.
// Engine: status cộng dồn (g.status add), g.moveTo (Kéo), SkillDef.options, c.toHand.
// Đối thủ trả lời: thả diều (đổi người đứng đối diện), Choáng/Câm Lặng Darius, hoặc hồi/Khiên cho kẻ đang chảy máu.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    otherSide,
    type PlayArgs,
    type Unit
} from "../types"

const BLEED = "bleed"
/** Tối đa 8 Chảy Máu; hết sau 2 lượt của tướng mang kể từ lần cộng cuối */
const MAX_BLEED = 6
const BLEED_TURNS = 2
export const F_Q = "30 + 100% AD + 20% AP"
export const F_E = "10 + 65% AD + 13% AP"
/** R: mỗi Chảy Máu = từng này sát thương chuẩn */
export const F_R_STACK = "12 + 20% AD + 5% AP"
/** Nội tại: đầu lượt của kẻ chảy máu, mỗi Chảy Máu gây từng này */
export const F_TICK = "3 + 5% AD"
/** Q: Darius hồi từng này mỗi Chảy Máu trên mục tiêu */
export const F_Q_HEAL = "6 + 8% AD + 2% AP"
const Q_BLEED = 2

export const bleedOf = (g: Game, t: Unit) => g.statusV(t,
    BLEED)
const addBleed = (g: Game, t: Unit, n: number) => {
    if (t.status !== "board" || t.token) return
    g.status(t,
        BLEED,
        BLEED_TURNS,
        {
            v: n, add: true, max: MAX_BLEED
        })
}

export default defineHero({
    id: "darius", name: "Darius", role: "fighter", damage: "physical", hp: 430, atk: 108, armor: 31, mr: 29,
    bot: {
        markValue: {
            bleed: 25,
        },
    },
    desc: "Đao phủ Noxus: mỗi đòn đánh cắm thêm Chảy Máu, xay một mục tiêu đến khi Máy Chém xả hết dấu thành sát thương chuẩn.",
    passive: {
        name: "Xuất Huyết",
        desc: `Khi đòn đánh của Darius trúng 1 tướng: tướng đó +1 Chảy Máu (tối đa ${MAX_BLEED}, hết sau ${BLEED_TURNS} lượt của nó kể từ lần cộng cuối). Đầu lượt của tướng đó, mỗi Chảy Máu gây {${F_TICK}} sát thương vật lý.`,
    },
    hooks: {
        onTurnStart(g, me, d) {
            // đầu lượt của kẻ chảy máu: mỗi Chảy Máu gây sát thương (nguồn là Darius)
            if (d.side === me.side) return
            for (const t of g.heroes(d.side)) {
                const n = bleedOf(g,
                    t)
                if (n > 0) g.damage(me,
                    t,
                    n * g.f(me,
                        F_TICK),
                    "physical",
                    {
                        tag: "dot"
                    })
            }
        },
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss) return
            addBleed(g,
                d.target,
                1)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Tàn Sát", target: "opposite",
            desc: `Chọn tướng địch đối diện Darius; gây {${F_Q}} sát thương vật lý và +${Q_BLEED} Chảy Máu; Darius hồi {${F_Q_HEAL}} máu mỗi Chảy Máu trên nó.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "physical",
                    {
                        tag: "skill"
                    })
                addBleed(c.g,
                    t,
                    Q_BLEED)
                const n = bleedOf(c.g,
                    t)
                if (n > 0) c.g.heal(c.self,
                    c.self,
                    n * c.f(F_Q_HEAL))
            },
        },
        E: {
            key: "E", name: "Bắt Giữ", target: "enemy",
            desc: `Chọn tướng địch đối diện Darius; gây {${F_E}} sát thương vật lý. Nếu Darius không có tướng đối diện: chọn 1 tướng địch, Kéo nó về đối diện Darius, +1 Chảy Máu lên nó rồi gây sát thương.`,
            options(c): PlayArgs[] {
                const front = c.g.opposite(c.self)
                if (front) return [{
                    target: front.id
                }]
                // đường đối diện đang giữ cho tướng chết: không Kéo vào được
                if (c.g.laneHolder(otherSide(c.side),
                    c.self.lane)) return []
                return c.g.heroes(otherSide(c.side)).filter((u) => c.g.targetable(u)).map((u) => ({
                    target: u.id
                }))
            },
            resolve(c) {
                const t = c.target!
                if (t.lane !== c.self.lane) {
                    c.g.moveTo(t,
                        c.self.lane)
                    addBleed(c.g,
                        t,
                        1)
                }
                c.g.damage(c.self,
                    t,
                    c.f(F_E),
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
        R: {
            key: "R", name: "Máy Chém Noxus", target: "opposite",
            desc: `Chọn tướng địch đối diện Darius đang có Chảy Máu; gây {${F_R_STACK}} sát thương chuẩn cho mỗi Chảy Máu của nó rồi xoá hết Chảy Máu. Nếu lá này hạ gục: nó quay về tay.`,
            canPlay: (c) => {
                const o = c.g.opposite(c.self)
                return !!o && bleedOf(c.g,
                    o) > 0
            },
            resolve(c) {
                const t = c.target!
                const n = bleedOf(c.g,
                    t)
                c.g.removeStatus(t,
                    BLEED)
                if (n <= 0) return
                c.g.damage(c.self,
                    t,
                    n * c.f(F_R_STACK),
                    "true",
                    {
                        tag: "skill"
                    })
                if (t.status !== "board") c.toHand()
            },
        },
    },
})
