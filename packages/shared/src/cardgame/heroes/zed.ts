// Zed (Sát thủ, vật lý): máu 820 · AD 84 · giáp/kháng 30/28.
// MỤC ĐÍCH: Một lượt dồn chết từ mộ bài. Các lượt đầu tiêu lá Zed để nuôi mộ; lượt kết liễu: R đặt Dấu Ấn (số đòn trúng hiện trên dấu),
// E gọi Bóng (lá special copyOf) nhân bản lá Q/R trong mộ, mọi đòn dồn vào dấu, cuối lượt dấu nổ theo số đòn.
// Engine: grave (đếm lá Zed trong mộ, sao chép lá trong mộ). Đối thủ trả lời: nối chuỗi trong lượt dồn (Braum đổi mục tiêu, Choáng làm lá fizzle).
import {
    defineHero, defineSpecialCard
} from "../registry"
import type {
    Card, Ctx
} from "../types"
import {
    otherSide
} from "../types"
import type {
    Game
} from "../game"

const MARK = "zedmark"
const PER_GRAVE = 0.03
const MAX_GRAVE = 10
const F_Q = "40 + 55% AD + 20% AP"
const F_R = "40 + 30% AD"
const F_HIT = "30 + 25% AD"
const MAX_HITS = 8
const SHADOW_AT = 4

defineSpecialCard({
    id: "shadow", name: "Bóng", desc: "Bản sao một lá Zed trong mộ: tung đúng chiêu đó rồi biến mất. Hết lượt mà chưa dùng cũng biến mất."
})

const isZedSkill = (c: Card) => c.kind === "skill" && c.hero === "zed"
/** Số lá Zed trong mộ bài của side (công khai) */
export const zedGrave = (g: Game, side: "A" | "B") => g.player(side).grave.filter(isZedSkill).length
const amp = (c: Ctx) => 1 + PER_GRAVE * Math.min(MAX_GRAVE,
    zedGrave(c.g,
        c.side))

export default defineHero({
    id: "zed", name: "Zed", role: "assassin", damage: "physical", hp: 760, atk: 80, armor: 30, mr: 28,
    skillCopies: {
        Q: 6, E: 4, R: 2
    },
    desc: "Chủ nhân Bóng Tối: tiêu lá để nuôi mộ, rồi một lượt gọi Bóng nhân bản chiêu trong mộ, dồn hết vào Dấu Ấn và nổ cuối lượt.",
    passive: {
        name: "Bóng Tối Trong Mộ",
        desc: `Chiêu của Zed gây thêm ${PER_GRAVE * 100}% sát thương cho mỗi lá Zed trong mộ bài của bạn (tối đa +${PER_GRAVE * MAX_GRAVE * 100}%). Mỗi lần Zed gây sát thương lên tướng có Dấu Ấn, dấu +1 đòn (tối đa ${MAX_HITS}).`,
    },
    hooks: {
        onDamage(g, me, d) {
            if (d.src?.id !== me.id || (d.tag !== "attack" && d.tag !== "skill") || !g.has(d.target,
                MARK) || d.target.status !== "board") return
            const v = Math.min(MAX_HITS,
                g.statusV(d.target,
                    MARK) + 1)
            d.target.statuses[MARK].v = v
            g.emit({
                t: "status", target: d.target.id, id: MARK, turns: 0, v
            })
        },
        // cuối lượt Zed: mọi Dấu Ấn nổ theo số đòn
        onTurnEnd(g, me, d) {
            if (d.side !== me.side) return
            for (const t of g.enemies(me)) {
                const hits = g.statusV(t,
                    MARK)
                if (!hits) continue
                g.removeStatus(t,
                    MARK)
                g.damage(me,
                    t,
                    g.f(me,
                        F_R) + hits * g.f(me,
                        F_HIT),
                    "true",
                    {
                        tag: "effect"
                    })
                if (t.status !== "board") {
                    const card = g.lastGrave(me.side,
                        (x) => x.id === "zed_r")
                    if (card) {
                        const gr = g.player(me.side).grave
                        gr.splice(gr.indexOf(card),
                            1)
                        g.emit({
                            t: "returnToHand", side: me.side, card
                        })
                        g.giveCard(me.side,
                            card,
                            "hand")
                    }
                }
            }
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Phi Tiêu Sắc Lẻm", target: "enemy",
            desc: `{${F_Q}} sát thương vật lý lên 1 tướng địch. **Điều kiện:** mục tiêu có Dấu Ấn thì Zed đánh thêm 1 đòn đánh thường miễn phí lên nó.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q) * amp(c),
                    "physical",
                    {
                        tag: "skill"
                    })
                if (t.status === "board" && c.g.has(t,
                    MARK)) c.g.attack(c.self,
                    t,
                    {
                        free: true, mult: 0.4
                    })
            },
        },
        E: {
            key: "E", name: "Phân Thân Bóng Tối", target: "lane",
            desc: `Zed chuyển sang một đường (đổi chỗ với tướng mình nếu có), rồi tạo 1 lá Bóng: bản sao lá Q hoặc R của Zed vào mộ gần nhất. Bóng biến mất cuối lượt nếu không dùng. **Điều kiện:** mộ bài có từ ${SHADOW_AT} lá Zed thì tạo 2 lá Bóng (2 lá Q/R gần nhất).`,
            options(c) {
                const foes = c.g.openLanes().filter((l) => c.g.at(otherSide(c.side),
                    l)?.status === "board")
                return (foes.length ? foes : [c.self.lane]).map((lane) => ({
                    lane
                }))
            },
            resolve(c) {
                if (c.lane !== undefined && c.lane !== c.self.lane) c.g.moveTo(c.self,
                    c.lane)
                const grave = c.g.player(c.side).grave
                const copyable = grave.filter((x) => isZedSkill(x) && (x.id === "zed_q" || x.id === "zed_r"))
                const n = zedGrave(c.g,
                    c.side) >= SHADOW_AT ? 2 : 1
                for (let i = 0; i < n; i++) {
                    const src = copyable[copyable.length - 1 - i]
                    if (!src) break
                    c.g.createCard(c.side,
                        {
                            kind: "special", id: "shadow", hero: "zed", side: c.side, copyOf: src.id, temp: true
                        },
                        "hand")
                }
            },
        },
        R: {
            key: "R", name: "Dấu Ấn Tử Thần", target: "enemy",
            desc: `Đặt Dấu Ấn lên 1 tướng địch (đã có thì +2 đòn). Cuối lượt này dấu nổ: {${F_R}} + {${F_HIT}} mỗi đòn hiện trên dấu, sát thương chuẩn. **Điều kiện:** dấu nổ hạ gục thì lá R gần nhất trong mộ quay về tay.`,
            resolve(c) {
                const t = c.target!
                const cur = c.g.statusV(t,
                    MARK)
                c.g.status(t,
                    MARK,
                    1,
                    {
                        v: Math.min(MAX_HITS,
                            cur ? cur + 2 : 1), until: c.g.s.turnNo
                    })
                if (!cur) c.g.damage(c.self,
                    t,
                    c.f(F_HIT) * amp(c),
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
    },
})

