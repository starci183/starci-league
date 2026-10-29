// Qiyana (Sát thủ, vật lý): máu 320 · AD 118 · giáp/kháng 27/26.
// CHẤT: "Sát thủ nguyên tố". Đầu mỗi lượt của bạn Qiyana nhận 1 nguyên tố ngẫu nhiên (Đỏ Đá / Xanh Sông / Lục Cỏ), giữ tới đầu lượt kế.
// Q, E, R đổi tác dụng theo nguyên tố hiện tại; đối thủ thấy nguyên tố trên tướng và phải đoán.
// Engine: stack công khai "element" (1 Đỏ · 2 Xanh · 3 Lục) đổi bằng g.rollState ở hook onTurnStart/onSummon/onRespawn,
//         Q Đỏ: status "qiyana_mark" + HeroDef.modifyDamage, E: Quick chỉ nối chuỗi (g.chainFx().cancel), g.faceEnemy, g.swapWith, g.giveSkillToHand.
// Đối thủ trả lời: Renata (phản sát thương), Janna (R miễn đòn đánh), Khiên dày; đoán nguyên tố để biết E Choáng hay né.
import {
    defineHero
} from "../registry"
import type {
    Ctx, OptCtx, Unit
} from "../types"
import {
    otherSide
} from "../types"
import type {
    Game
} from "../game"

export type Element = "red" | "blue" | "green"
/** Stack công khai "element": 1 Đỏ (Đá) · 2 Xanh (Sông) · 3 Lục (Cỏ) */
export const ELEMENT_KEY = "element"
const ELEMENTS: Element[] = ["red",
    "blue",
    "green"]
/** Dấu Đỏ trên địch (Q Đỏ): v = % sát thương Qiyana gây thêm lên nó tới hết lượt */
const MARK = "qiyana_mark"
const MARK_STEP = 15
export const F_Q_RED = "50 + 120% AD + 20% AP"
export const F_Q_BLUE = "30 + 80% AD + 15% AP"
export const F_Q_GREEN = "30 + 80% AD + 15% AP"
export const F_E_RED = "30 + 80% AD + 15% AP"
export const F_R_RED = "60 + 120% AD + 20% AP"
export const F_R_BLUE = "40 + 80% AD + 15% AP"
export const F_R_GREEN = "40 + 80% AD + 15% AP"

/** Nguyên tố hiện tại của Qiyana (mặc định Đỏ nếu chưa có, ví dụ ván dựng tay) */
export function elementOf(g: Game, u: Unit): Element {
    return ELEMENTS[g.stackOf(u,
        ELEMENT_KEY) - 1] ?? "red"
}
/** Đặt nguyên tố cho Qiyana (dùng khi dựng tình huống thử) */
export function setElement(g: Game, u: Unit, e: Element) {
    g.setStack(u,
        ELEMENT_KEY,
        ELEMENTS.indexOf(e) + 1)
}
/** Tên nguyên tố cho nhật ký */
const ELEMENT_VI = ["Đỏ",
    "Xanh",
    "Lục"]
const rollElement = (g: Game, u: Unit) => {
    const v = g.rollState(u,
        ELEMENT_KEY,
        ELEMENTS.length)
    g.log(`${g.nameOf(u)} nhận nguyên tố ${ELEMENT_VI[v - 1] ?? "?"}`)
    return v
}

/** Đồng minh khác đang trên sân mà Qiyana đổi chỗ được: chọn người còn nhiều máu nhất (tự động) */
function swapAlly(g: Game, self: Unit): Unit | undefined {
    return g.allies(self,
        false).filter((x) => !x.token).sort((a, b) => g.hpPct(b) - g.hpPct(a))[0]
}
/** Tướng địch kích hoạt (kẻ đánh Qiyana) */
const attackerOf = (c: Ctx) => c.g.unit(c.trigger?.actor)

export default defineHero({
    id: "qiyana", name: "Qiyana", role: "assassin", damage: "physical", hp: 320, atk: 118, armor: 27, mr: 26,
    bot: {
        markValue: {
            qiyana_mark: 10,
        },
    },
    desc: "Nữ Hoàng Nguyên Tố: mỗi lượt một nguyên tố ngẫu nhiên, Q, E, R đổi theo nó. Đỏ dồn sát thương, Xanh khống chế, Lục cơ động.",
    passive: {
        name: "Nguyên Tố",
        desc: "Đầu mỗi lượt của bạn, Qiyana nhận 1 nguyên tố ngẫu nhiên, giữ tới đầu lượt kế: Đỏ (Đá) dồn sát thương, Xanh (Sông) khống chế, Lục (Cỏ) cơ động. Đối thủ thấy nguyên tố hiện tại.",
    },
    modifyDamage(g, me, d) {
        if (d.src?.id !== me.id || d.target.side === me.side || (d.tag !== "attack" && d.tag !== "skill")) return 1
        return 1 + g.statusV(d.target,
            MARK) / 100
    },
    hooks: {
        onSummon(g, me, d) {
            if (d.unit.id === me.id) rollElement(g,
                me)
        },
        onRespawn(g, me, d) {
            if (d.unit.id === me.id) rollElement(g,
                me)
        },
        onTurnStart(g, me, d) {
            if (d.side === me.side) rollElement(g,
                me)
        },
        onDamage(g, me, d) {
            if (d.src?.id !== me.id || d.target.side === me.side || !g.has(d.target,
                MARK)) return
            if (d.tag !== "attack" && d.tag !== "skill") return
            g.status(d.target,
                MARK,
                1,
                {
                    v: MARK_STEP, add: true, until: g.s.turnNo
                })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Nhát Chém Nguyên Tố", target: "enemy",
            desc: `Theo nguyên tố hiện tại. Đỏ: chọn 1 tướng địch; gây {${F_Q_RED}} sát thương vật lý; tới hết lượt này mỗi lần Qiyana gây sát thương lên nó, các đòn sau của Qiyana lên nó +${MARK_STEP}% (cộng dồn). Xanh: chọn 1 tướng địch; gây {${F_Q_BLUE}} sát thương vật lý và Choáng 1 lượt. Lục: chọn 1 tướng địch; Qiyana đổi chỗ để đứng đối diện nó, rồi nó nhận {${F_Q_GREEN}} sát thương vật lý.`,
            resolve(c) {
                const t = c.target!
                const el = elementOf(c.g,
                    c.self)
                if (el === "red") {
                    c.g.status(t,
                        MARK,
                        1,
                        {
                            v: 0, until: c.g.s.turnNo
                        })
                    c.g.damage(c.self,
                        t,
                        c.f(F_Q_RED),
                        "physical",
                        {
                            tag: "skill"
                        })
                } else if (el === "blue") {
                    c.g.damage(c.self,
                        t,
                        c.f(F_Q_BLUE),
                        "physical",
                        {
                            tag: "skill"
                        })
                    c.g.status(t,
                        "stun",
                        1)
                } else {
                    c.g.faceEnemy(c.self,
                        t)
                    c.g.damage(c.self,
                        t,
                        c.f(F_Q_GREEN),
                        "physical",
                        {
                            tag: "skill"
                        })
                }
            },
        },
        E: {
            key: "E", name: "Phản Ứng Nguyên Tố", target: "none", quick: true, chainOnly: true,
            desc: `Quick, Chỉ Nối Chuỗi. Khi địch đánh Qiyana, theo nguyên tố hiện tại. Đỏ: Qiyana đánh trả kẻ đó {${F_E_RED}} sát thương vật lý. Xanh: kẻ đó Choáng 1 lượt trước khi đòn ra (đòn bị huỷ). Lục: Qiyana đổi chỗ với 1 tướng mình khác (đòn trượt).`,
            quickWhen: (c) => c.trigger.side !== c.side && c.trigger.target === c.self.id && (!c.trigger.card || c.trigger.card.id === "basic"),
            canPlay: (c: OptCtx) => elementOf(c.g,
                c.self) !== "green" || !!swapAlly(c.g,
                c.self),
            resolve(c) {
                const el = elementOf(c.g,
                    c.self)
                const foe = attackerOf(c)
                if (el === "red") {
                    if (foe && foe.status === "board" && foe.side !== c.side) c.g.damage(c.self,
                        foe,
                        c.f(F_E_RED),
                        "physical",
                        {
                            tag: "skill"
                        })
                } else if (el === "blue") {
                    if (foe && foe.status === "board" && foe.side !== c.side) c.g.status(foe,
                        "stun",
                        1)
                    c.g.chainFx().cancel = true
                } else {
                    const ally = swapAlly(c.g,
                        c.self)
                    if (ally) c.g.swapWith(c.self,
                        ally)
                    c.g.chainFx().cancel = true
                }
            },
        },
        R: {
            key: "R", name: "Lệnh Xoá Sổ", target: "all_enemies",
            desc: `Theo nguyên tố hiện tại. Đỏ: mọi tướng địch nhận {${F_R_RED}} sát thương vật lý. Xanh: mọi tướng địch nhận {${F_R_BLUE}} sát thương vật lý; tướng địch máu cao nhất và Xạ thủ địch Choáng 1 lượt (không có Xạ thủ thì thêm 1 tướng địch ngẫu nhiên khác). Lục: mọi tướng địch nhận {${F_R_GREEN}} sát thương vật lý; Qiyana đổi chỗ tự do và lấy 1 lá Q Qiyana lên tay.`,
            resolve(c) {
                const g = c.g
                const el = elementOf(g,
                    c.self)
                const f = el === "red" ? F_R_RED : el === "blue" ? F_R_BLUE : F_R_GREEN
                for (const t of g.heroes(otherSide(c.side))) g.damage(c.self,
                    t,
                    c.f(f),
                    "physical",
                    {
                        tag: "skill"
                    })
                if (el === "blue") stunTargets(c)
                else if (el === "green") {
                    // đổi chỗ tự do: tự chọn đứng đối diện tướng địch còn ít máu nhất
                    const prey = g.lowestHp(g.heroes(otherSide(c.side)))
                    if (prey) g.faceEnemy(c.self,
                        prey)
                    g.giveSkillToHand(c.side,
                        "qiyana",
                        "Q",
                        "effect")
                }
            },
        },
    },
})

/** R Xanh: Choáng tướng địch máu cao nhất và Xạ thủ; không có Xạ thủ thì thêm 1 tướng ngẫu nhiên khác */
function stunTargets(c: Ctx) {
    const g = c.g
    const foes = g.heroes(otherSide(c.side))
    if (!foes.length) return
    const top = [...foes].sort((a, b) => b.hp - a.hp)[0]
    const marks = foes.filter((u) => g.role(u) === "marksman")
    const hit = new Set<Unit>([top,
        ...marks])
    if (!marks.length) {
        const other = g.pick(foes.filter((u) => u.id !== top.id))
        if (other) {
            hit.add(other)
            g.log(`Qiyana: Choáng thêm ngẫu nhiên ${g.nameOf(other)}`)
        }
    }
    for (const u of hit) g.status(u,
        "stun",
        1)
}
