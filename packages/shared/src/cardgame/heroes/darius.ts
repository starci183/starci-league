// Darius (Đấu sĩ, vật lý): máu 430 · AD 74 · giáp/kháng 31/29 (V3).
// CHẤT: "Xay một thằng". Đòn đánh nào của Darius cũng cắm Chảy Máu (cộng dồn, hiện số trên tướng); Q cắm thêm 2;
// E chọn một địch, khác đường thì swap nó với kẻ đang giữ ô đối diện Darius (kể cả tướng đã chết); R chọn địch có Chảy Máu,
// khác đường thì Darius swap với người giữ ô đối diện nó (đồng minh sống hoặc đã chết), xả toàn bộ Chảy Máu thành sát thương chuẩn, hạ được thì lá về tay.
// Engine: status cộng dồn (g.status add), g.moveTo / g.faceEnemy (swap nguyên tử hai người), SkillDef.options, c.toHand.
// Đối thủ trả lời: thả diều (đổi người đứng đối diện), Choáng/Câm Lặng Darius, hoặc hồi/Khiên cho kẻ đang chảy máu.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    skillArgs
} from "../engine"
import {
    type PlayArgs,
    type Unit
} from "../types"

const BLEED = "bleed"
/** Chảy Máu không giới hạn (bỏ cap); hết sau 2 lượt của tướng mang kể từ lần cộng cuối */
const BLEED_TURNS = 2
export const F_Q = "30 + 145% AD + 20% AP"
export const F_E = "10 + 95% AD + 15% AP"
/** R: mỗi Chảy Máu = từng này sát thương chuẩn */
export const F_R_STACK = "10 + 30% AD + 5% AP"
/** Nội tại: đầu lượt của kẻ chảy máu, mỗi Chảy Máu gây từng này */
export const F_TICK = "3 + 7% AD"
/** Q: Darius hồi từng này mỗi Chảy Máu trên mục tiêu */
export const F_Q_HEAL = "6 + 10% AD + 2% AP"
const Q_BLEED = 2

export const bleedOf = (g: Game, t: Unit) => g.statusV(t,
    BLEED)
const addBleed = (g: Game, t: Unit, n: number) => {
    if (t.status !== "board" || t.token) return
    g.status(t,
        BLEED,
        BLEED_TURNS,
        {
            v: n, add: true, visuals: [], tickVisuals: ["bleedTick"]
        })
}

export default defineHero({
    id: "darius", name: "Darius", role: "fighter", damage: "physical", hp: 430, atk: 74, armor: 31, mr: 29,
    bot: {
        markValue: {
            bleed: 25,
        },
    },
    desc: "Đao phủ Noxus: mỗi đòn đánh cắm thêm Chảy Máu, xay một mục tiêu đến khi Máy Chém xả hết dấu thành sát thương chuẩn.",
    passive: {
        name: "Xuất Huyết",
        desc: `Mỗi đòn thật trúng tướng địch thêm 1 Chảy Máu, cộng dồn không giới hạn và làm mới thời hạn 2 lượt của mục tiêu. Đầu mỗi lượt phe địch, mục tiêu nhận sát thương vật lý bằng số dấu × {${F_TICK}} của Darius.`,
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
                        tag: "dot", visuals: t.statuses[BLEED]?.tickVisuals ?? ["bleedTick"]
                    })
            }
        },
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss || d.target.side === me.side) return
            addBleed(g,
                d.target,
                1)
        },
    },
    skills: {
        Q: {
            key: "Q", mana: 0, name: "Tàn Sát", target: "opposite",
            desc: `Gây {${F_Q}} sát thương vật lý lên tướng đối diện; nếu nó còn hợp lệ thì thêm 2 Chảy Máu. Sau đó Darius hồi số dấu đang có trên mục tiêu × {${F_Q_HEAL}}.`,
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
            key: "E", mana: 0, name: "Bắt Giữ", target: "enemy",
            desc: `Chọn một tướng địch; nếu khác đường thì swap nó với tướng đang giữ ô đối diện Darius (kể cả tướng đã chết). Tới đối diện hợp lệ mới thêm 1 Chảy Máu rồi gây {${F_E}} sát thương vật lý; chọn người đang đối diện thì áp dụng ngay.`,
            options(c): PlayArgs[] {
                return skillArgs(c.g,
                    c.side,
                    c.self,
                    c.card,
                    {
                        key: "E", name: "Bắt Giữ", desc: "", target: "enemy", resolve() {}
                    }).filter(a => {
                    // kéo được nếu đã cùng đường, hoặc dời được mục tiêu sang đường Darius (swap với người giữ ô, kể cả tướng đã chết)
                    const target = c.g.unit(a.target)
                    return !!target && !target.token
                })
            },
            resolve(c) {
                const t = c.target!
                if (!c.g.targetable(t) || t.side === c.side) return
                if (t.lane !== c.self.lane && !c.g.moveTo(t,
                    c.self.lane)) return
                if (c.g.opposite(c.self)?.id !== t.id) return
                addBleed(c.g,
                    t,
                    1)
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
            key: "R", mana: 0, name: "Máy Chém Noxus", target: "enemy",
            desc: `Chọn một tướng địch có Chảy Máu; nếu khác đường thì swap Darius với đồng minh đang giữ ô đối diện nó (kể cả đồng minh đã chết). Tới đối diện hợp lệ, tiêu toàn bộ dấu rồi gây sát thương chuẩn bằng số dấu × {${F_R_STACK}}. Chính hành động R hạ thật mục tiêu thì trả lá này về tay, không hoàn mana.`,
            options(c): PlayArgs[] {
                return skillArgs(c.g,
                    c.side,
                    c.self,
                    c.card,
                    {
                        key: "R", name: "Máy Chém Noxus", desc: "", target: "enemy", resolve() {}
                    }).filter(a => {
                    const target = c.g.unit(a.target)
                    return !!target && bleedOf(c.g,
                        target) > 0 && (target.lane === c.self.lane || c.g.canFace(c.self,
                        target))
                })
            },
            resolve(c) {
                const t = c.target!
                if (!c.g.targetable(t) || t.side === c.side || bleedOf(c.g,
                    t) <= 0) return
                if (t.lane !== c.self.lane && !c.g.faceEnemy(c.self,
                    t)) return
                if (c.g.opposite(c.self)?.id !== t.id) return
                const n = bleedOf(c.g,
                    t)
                c.g.removeStatus(t,
                    BLEED)
                if (n <= 0) return
                const before = c.g.events.length
                c.g.damage(c.self,
                    t,
                    n * c.f(F_R_STACK),
                    "true",
                    {
                        tag: "skill"
                    })
                if (c.g.events.slice(before).some(e => e.t === "kill" && e.target === t.id && e.src === c.self.id)) c.toHand()
            },
        },
    },
})
