// Qiyana (Sát thủ, vật lý): máu 320 · AD 77 · giáp/kháng 27/26 · mana Q15/E20/R35 (bể đội).
// CHẤT: "Sát thủ nguyên tố". Ra sân, hồi sinh và đầu mỗi lượt của bạn Qiyana nhận ngẫu nhiên công khai Đá / Sông / Cỏ (mỗi loại 1/3).
// Q, E, R đổi tác dụng theo nguyên tố hiện tại; đối thủ thấy nguyên tố trên tướng và phải đoán.
// Engine: stack công khai "element" (1 Đỏ/Đá · 2 Xanh/Sông · 3 Lục/Cỏ) đổi bằng g.rollState ở hook onTurnStart/onSummon/onRespawn,
//         Dấu Đá: status "qiyana_mark" + HeroDef.modifyDamage, E: Quick chỉ nối chuỗi (g.chainFx().cancel),
//         g.faceEnemy / g.swapWith (swap nguyên tử với người giữ ô, kể cả đồng minh đã chết; không vào đường chưa mở), g.giveSkillToHand. Choáng theo đơn vị thời gian có phần lẻ ngẫu nhiên (law.md §4).
// Đối thủ trả lời: Renata (phản sát thương), Janna (R miễn đòn đánh), Khiên dày; đoán nguyên tố để biết E Choáng hay né.
import {
    defineHero
} from "../registry"
import {
    skillArgs
} from "../engine"
import type {
    Ctx, OptCtx, PlayArgs, SkillDef, Unit
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
/** Dấu Đá trên địch (Q Đá): v = % sát thương Qiyana gây thêm lên nó tới hết lượt */
const MARK = "qiyana_mark"
export const MARK_STEP = 15
export const F_Q_RED = "60 + 230% AD + 20% AP"
export const F_Q_BLUE = "40 + 155% AD + 15% AP"
export const F_Q_GREEN = "40 + 155% AD + 15% AP"
export const F_E_RED = "40 + 155% AD + 15% AP"
export const F_R_RED = "60 + 195% AD + 20% AP"
export const F_R_BLUE = "40 + 130% AD + 15% AP"
export const F_R_GREEN = "40 + 130% AD + 15% AP"
/** Thời lượng Choáng (đơn vị thời gian, phần lẻ = xác suất thêm 1 đơn vị) */
export const F_STUN = "1 + 0.2% AD + 0.2% AP"
export const MANA = {
    Q: 10, E: 20, R: 35
} as const

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
const ELEMENT_VI = ["Đá",
    "Sông",
    "Cỏ"]
const rollElement = (g: Game, u: Unit) => {
    const v = g.rollState(u,
        ELEMENT_KEY,
        ELEMENTS.length)
    g.log(`${g.nameOf(u)} nhận nguyên tố ${ELEMENT_VI[v - 1] ?? "?"}`)
    return v
}

/** Choáng `u` theo công thức thời lượng của Qiyana: floor(d) đơn vị chắc chắn + Bernoulli(phần lẻ) thêm 1 (engine tung một lần trong g.status) */
export function stunUnits(g: Game, src: Unit, u: Unit) {
    if (u.status !== "board" || u.token) return
    const d = Math.max(0,
        g.f(src,
            F_STUN))
    if (d <= 0) return
    // 1 đơn vị = tới hết lượt kế của phe bị Choáng (mặc định of = u.side); engine tung phần lẻ 1 lần sau kiểm tra miễn/chặn
    g.status(u,
        "stun",
        d)
}

/** Đồng minh khác hợp lệ để E Cỏ swap: tỉ lệ Máu cao nhất, hoà thì theo thứ tự đường ổn định */
function swapAlly(g: Game, self: Unit): Unit | undefined {
    return g.allies(self,
        false).filter((x) => !x.token && x.status === "board").sort((a, b) => g.hpPct(b) - g.hpPct(a))[0]
}
/** Tướng địch kích hoạt (kẻ đánh Qiyana) */
const attackerOf = (c: Ctx) => c.g.unit(c.trigger?.actor)

// Chọn con mồi theo luật chọn mục tiêu chung (Tàng Hình, Khiêu Khích...)
const ENEMY_SELECTION: SkillDef = {
    key: "Q", name: "", desc: "", target: "enemy", resolve: () => {}
}
const enemyOptions = (c: OptCtx): PlayArgs[] => skillArgs(c.g,
    c.side,
    c.self,
    c.card,
    ENEMY_SELECTION)
const validPrey = (c: OptCtx, t: Unit | undefined) => !!t && enemyOptions(c).some((a) => a.target === t.id)
/** Ô của Qiyana ở đường con mồi (đường có con mồi đứng nên chắc chắn đã mở; không bao giờ là đường khoá). Người giữ ô (đồng minh sống hoặc đã chết đang chờ hồi sinh) bị swap về ô cũ của Qiyana. */
function canReach(g: Game, self: Unit, foe: Unit): boolean {
    if (g.opposite(self)?.id === foe.id) return true
    return g.canFace(self,
        foe)
}
/** Dời Qiyana tới ô đối diện `foe` (swap nguyên tử với người giữ ô). true = sau bước này Qiyana đang đối diện hợp lệ con mồi. */
function reachFacing(g: Game, self: Unit, foe: Unit): boolean {
    if (g.opposite(self)?.id === foe.id) return true
    if (!canReach(g,
        self,
        foe) || !g.faceEnemy(self,
        foe)) return false
    return g.opposite(self)?.id === foe.id
}
/** Đếm một sự kiện gây sát thương dương lên tướng đang mang Dấu Đá: +15 điểm % (không trần) */
function bumpMark(g: Game, t: Unit) {
    if (!g.has(t,
        MARK) || t.status !== "board") return
    const st = t.statuses[MARK]
    st.v += MARK_STEP
    g.emit({
        t: "status", target: t.id, id: MARK, turns: 0, v: st.v
    })
}

export default defineHero({
    id: "qiyana", name: "Qiyana", role: "assassin", damage: "physical", hp: 320, atk: 77, armor: 27, mr: 26,
    bot: {
        markValue: {
            qiyana_mark: 10,
        },
    },
    desc: "Nữ Hoàng Nguyên Tố: nguyên tố ngẫu nhiên công khai, Q, E, R đổi theo nó. Đá dồn sát thương, Sông khống chế, Cỏ cơ động.",
    passive: {
        name: "Nguyên Tố",
        desc: `Ra sân, hồi sinh và đầu lượt của bạn, Qiyana nhận ngẫu nhiên công khai Đá/Sông/Cỏ (mỗi loại 1/3), giữ tới lần đổi kế tiếp. Dấu Đá trên địch tăng ${MARK_STEP} điểm phần trăm sau mỗi đòn thật/chiêu gốc của Qiyana thực sự gây sát thương dương vào Máu/Khiên của nó trong lượt; không trần, Q Đá lại không đặt lại.`,
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
        // chiêu gốc: mỗi lần gây sát thương dương (tag "skill"); proc đồ/phần cộng không tính
        onDamage(g, me, d) {
            if (d.src?.id !== me.id || d.target.side === me.side || d.tag !== "skill") return
            if (d.hpLost + d.absorbed <= 0) return
            bumpMark(g,
                d.target)
        },
        // đòn thật: một lần mỗi hit trúng có sát thương dương
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss || d.target.side === me.side || d.dealt <= 0) return
            bumpMark(g,
                d.target)
        },
    },
    skills: {
        Q: {
            key: "Q", mana: MANA.Q, name: "Nhát Chém Nguyên Tố", target: "enemy",
            desc: `Mọi nguyên tố: chọn một tướng địch; khác đường thì Qiyana swap với đồng minh đang giữ ô đối diện nó (kể cả đồng minh đã chết), đã đối diện thì đánh ngay; swap thất bại thì không có hiệu ứng. Đá: {${F_Q_RED}} sát thương vật lý và mở/giữ Dấu Đá tới hết lượt. Sông: {${F_Q_BLUE}} sát thương vật lý và Choáng {${F_STUN}} đơn vị. Cỏ: {${F_Q_GREEN}} sát thương vật lý, Qiyana Tàng Hình tới hết lượt kế tiếp của đối thủ.`,
            options(c) {
                return enemyOptions(c).filter((a) => {
                    const t = c.g.unit(a.target)
                    return !!t && canReach(c.g,
                        c.self,
                        t)
                })
            },
            resolve(c) {
                const t = c.target
                if (!t || !validPrey(c,
                    t) || !reachFacing(c.g,
                    c.self,
                    t)) return
                const el = elementOf(c.g,
                    c.self)
                if (el === "red") {
                    // mở dấu nếu chưa có; dấu đang còn hạn giữ nguyên phần đã tích. Chính phát Q này là sự kiện tích đầu tiên.
                    if (!c.g.has(t,
                        MARK)) c.g.status(t,
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
                    stunUnits(c.g,
                        c.self,
                        t)
                } else {
                    c.g.damage(c.self,
                        t,
                        c.f(F_Q_GREEN),
                        "physical",
                        {
                            tag: "skill"
                        })
                    c.g.stealth(c.self)
                }
            },
        },
        E: {
            key: "E", mana: MANA.E, name: "Phản Ứng Nguyên Tố", target: "none", quick: true, chainOnly: true,
            desc: `Quick, Chỉ Nối Chuỗi. Khi địch đánh Qiyana (đòn đánh đơn trên cùng), theo nguyên tố hiện tại. Đá: đánh trả kẻ đó {${F_E_RED}} sát thương vật lý, không huỷ đòn. Sông: thử Choáng kẻ đó {${F_STUN}} đơn vị và huỷ đòn (vẫn huỷ dù Choáng bị chặn). Cỏ: Qiyana swap với đồng minh khác hợp lệ có tỉ lệ Máu cao nhất; swap thành công mới huỷ đòn.`,
            quickWhen: (c) => c.trigger.side !== c.side && c.trigger.kind === "attack" && !!c.trigger.single && c.trigger.target === c.self.id,
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
                    if (foe && foe.status === "board" && foe.side !== c.side) stunUnits(c.g,
                        c.self,
                        foe)
                    c.g.chainFx().cancel = true
                } else {
                    const ally = swapAlly(c.g,
                        c.self)
                    if (ally && c.g.swapWith(c.self,
                        ally)) c.g.chainFx().cancel = true
                }
            },
        },
        R: {
            key: "R", mana: MANA.R, name: "Lệnh Xoá Sổ", target: "all_enemies",
            desc: `Theo nguyên tố hiện tại. Đá: mọi tướng địch nhận {${F_R_RED}} sát thương vật lý. Sông: chọn một tướng địch; nó và tối đa một tướng địch khác ngẫu nhiên mỗi người nhận {${F_R_BLUE}} sát thương vật lý và Choáng {${F_STUN}} đơn vị. Cỏ: mọi tướng địch nhận {${F_R_GREEN}} sát thương vật lý; Qiyana swap với đồng minh để đối diện tướng địch hợp lệ có Máu hiện tại thấp nhất nếu được, và nhận 1 lá Q Qiyana dù swap thành công hay không.`,
            options(c) {
                // chỉ Sông cần chọn tay một mục tiêu; Đá/Cỏ đánh toàn bàn địch
                if (elementOf(c.g,
                    c.self) !== "blue") return [{
                }]
                return enemyOptions(c)
            },
            resolve(c) {
                const g = c.g
                const el = elementOf(g,
                    c.self)
                const foes = g.heroes(otherSide(c.side))
                if (el === "blue") {
                    const first = c.target
                    if (!first || first.side === c.side || first.status !== "board" || !g.targetable(first)) return
                    const other = g.pick(g.heroes(otherSide(c.side)).filter((u) => u.id !== first.id && g.targetable(u)))
                    if (other) g.log(`Qiyana: Sông lan thêm ngẫu nhiên ${g.nameOf(other)}`)
                    for (const t of other ? [first,
                        other] : [first]) {
                        g.damage(c.self,
                            t,
                            c.f(F_R_BLUE),
                            "physical",
                            {
                                tag: "skill"
                            })
                        stunUnits(g,
                            c.self,
                            t)
                    }
                    return
                }
                const f = el === "red" ? F_R_RED : F_R_GREEN
                for (const t of foes) g.damage(c.self,
                    t,
                    c.f(f),
                    "physical",
                    {
                        tag: "skill"
                    })
                if (el === "green") {
                    // địch hợp lệ có Máu hiện tại thấp nhất (hoà: thứ tự đường ổn định)
                    const prey = [...g.heroes(otherSide(c.side))].filter((u) => g.targetable(u)).sort((a, b) => a.hp - b.hp)[0]
                    if (prey) reachFacing(g,
                        c.self,
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
