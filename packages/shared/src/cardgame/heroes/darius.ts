// Darius (Đấu sĩ, vật lý): máu 400 · AD 70 · giáp/kháng 35/30.
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
const F_Q = "5 + 80% AD"
const F_E = "10 + 65% AD"
/** R: mỗi Chảy Máu = từng này sát thương chuẩn */
const F_R_STACK = "16 + 25% AD"
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
    id: "darius", name: "Darius", role: "fighter", damage: "physical", hp: 300, atk: 62, armor: 35, mr: 30,
    bot: {
        markValue: {
            bleed: 25,
        },
    },
    desc: "Đao phủ Noxus: mỗi đòn đánh cắm thêm Chảy Máu, xay một mục tiêu đến khi Máy Chém xả hết dấu thành sát thương chuẩn.",
    passive: {
        name: "Xuất Huyết",
        desc: `Khi đòn đánh của Darius trúng 1 tướng: tướng đó +1 Chảy Máu (tối đa ${MAX_BLEED}, hết sau ${BLEED_TURNS} lượt của nó kể từ lần cộng cuối).`,
    },
    hooks: {
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
            desc: `Chọn tướng địch đối diện Darius; gây {${F_Q}} sát thương vật lý và +${Q_BLEED} Chảy Máu.`,
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
            },
        },
        E: {
            key: "E", name: "Bắt Giữ", target: "enemy",
            desc: `Chọn tướng địch đối diện Darius; gây {${F_E}} sát thương vật lý. Nếu Darius không có tướng đối diện: chọn 1 tướng địch, Kéo nó về đối diện Darius trước khi gây sát thương.`,
            options(c): PlayArgs[] {
                const front = c.g.opposite(c.self)
                if (front) return [{
                    target: front.id
                }]
                // đường đối diện đang giữ cho tướng chết: không Kéo vào được
                if (c.g.laneHolder(otherSide(c.side),
                    c.self.lane)) return []
                return c.g.heroes(otherSide(c.side)).filter((u) => !c.g.has(u,
                    "stealth")).map((u) => ({
                    target: u.id
                }))
            },
            resolve(c) {
                const t = c.target!
                if (t.lane !== c.self.lane) c.g.moveTo(t,
                    c.self.lane)
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
