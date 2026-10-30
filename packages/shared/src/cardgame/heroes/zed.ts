// Zed (Sát thủ, vật lý): máu 330 · AD 80 · giáp/kháng 28/26 · mana Q15/E20/R35 (bể đội).
// CHẤT: "Một nhịp". Dồn bài đánh thường và chiêu trong một lượt, mỗi phát sau đau hơn phát trước (Liên Hoàn).
// Q là một phát vào địch đối diện, E swap với đồng minh để đứng đối diện con mồi rồi chém, R đánh ngay và hẹn thêm một nhịp cuối lượt.
// Engine: hook onDamage (đếm phát bằng status "zed_chain", hết cuối lượt), g.delay + hook onDelayed (mỗi lá R một lịch riêng),
//         g.faceEnemy (swap nguyên tử với người giữ ô đối diện con mồi, kể cả đồng minh đã chết; không vào đường chưa mở).
// Đối thủ trả lời: Janna (huỷ một đòn làm gãy nhịp), Annie, Braum (Choáng/Khiên trong lượt địch), Choáng Zed trước khi xả bài.
import {
    pct
} from "../formula"
import {
    defineHero
} from "../registry"
import {
    skillArgs
} from "../engine"
import type {
    Game
} from "../game"
import type {
    DamageKind, OptCtx, PlayArgs, SkillDef, Unit
} from "../types"

/** Số phát Zed đã gây sát thương trong lượt này (status v, hết ở cuối lượt) */
const CHAIN = "zed_chain"
/** Dấu Ấn Tử Thần trên địch: chỉ để hiển thị số lịch R còn chờ (v); sát thương thật đi theo g.delay của từng lá */
const MARK = "zed_mark"
/** Khoá lịch hẹn của R */
const R_DELAY = "zed_r"
export const F_Q = "45 + 180% AD + 20% AP"
export const F_E = "30 + 130% AD + 15% AP"
export const F_R = "60 + 165% AD + 20% AP"
/** Liên Hoàn: sát thương thêm cho MỖI phát Zed đã gây trước đó trong lượt */
export const F_CHAIN = "8 + 15% AD + 2% AP"
/** Liên Hoàn: phần trăm máu đã mất (sau sát thương chính) của mục tiêu */
export const MISSING = 0.05
export const MANA = {
    Q: 10, E: 20, R: 35
} as const

// Chọn con mồi theo luật chọn mục tiêu chung (Tàng Hình, Khiêu Khích...); options riêng chỉ lọc thêm khả năng tiếp cận.
const ENEMY_SELECTION: SkillDef = {
    key: "E", name: "", desc: "", target: "enemy", resolve: () => {}
}
const enemyOptions = (c: OptCtx): PlayArgs[] => skillArgs(c.g,
    c.side,
    c.self,
    c.card,
    ENEMY_SELECTION)
const validPrey = (c: OptCtx, t: Unit | undefined) => !!t && enemyOptions(c).some((a) => a.target === t.id)
/** Ô của Zed ở đường con mồi (đường có con mồi đứng nên chắc chắn đã mở; không bao giờ là đường khoá). Người giữ ô (đồng minh sống hoặc đã chết đang chờ hồi sinh) bị swap về ô cũ của Zed. */
function canReach(g: Game, self: Unit, foe: Unit): boolean {
    if (g.opposite(self)?.id === foe.id) return true
    return g.canFace(self,
        foe)
}
/** Dời Zed tới ô đối diện `foe` (swap nguyên tử với người giữ ô). true = sau bước này Zed đang đối diện hợp lệ con mồi. */
function reachFacing(g: Game, self: Unit, foe: Unit): boolean {
    if (g.opposite(self)?.id === foe.id) return true
    if (!canReach(g,
        self,
        foe) || !g.faceEnemy(self,
        foe)) return false
    return g.opposite(self)?.id === foe.id
}

/** Một nhịp Liên Hoàn lên `t`: tăng bộ đếm, rồi nếu `t` còn sống gây phần cộng theo số nhịp TRƯỚC đó + 5% máu đã mất */
function chainBeat(g: Game, me: Unit, t: Unit, kind: DamageKind) {
    if (t.side === me.side || t.token) return
    const before = g.statusV(me,
        CHAIN)
    g.status(me,
        CHAIN,
        1,
        {
            v: before + 1, until: g.s.turnNo
        })
    if (t.status !== "board" || t.hp <= 0) return
    const raw = before * g.f(me,
        F_CHAIN) + (t.maxHp - t.hp) * MISSING
    // phát thêm là hiệu ứng (tag "effect"): không tự kích Liên Hoàn, không roll chí mạng chiêu
    if (raw > 0) g.damage(me,
        t,
        raw,
        kind,
        {
            tag: "effect"
        })
}

export default defineHero({
    id: "zed", name: "Zed", role: "assassin", damage: "physical", hp: 330, atk: 80, armor: 28, mr: 26,
    bot: {
        markValue: {
            zed_mark: 70,
        },
        buffValue: {
            zed_chain: 10,
        },
    },
    desc: "Chủ nhân Bóng Tối: tung hết bài trong một nhịp, mỗi phát sau đau hơn phát trước.",
    passive: {
        name: "Liên Hoàn",
        desc: `Mỗi đòn thật hoặc nhịp chiêu gốc của Zed gây sát thương lên tướng địch tăng Liên Hoàn 1 tới hết lượt, không trần. Sau sát thương chính, nếu địch còn sống, gây thêm số nhịp trước đó trong lượt × {${F_CHAIN}} + ${pct(MISSING)}% Máu đã mất hiện tại của nó, cùng loại sát thương chính. Phần cộng không tự chí mạng và không tích Liên Hoàn.`,
    },
    hooks: {
        // nhịp chiêu gốc: mỗi lần chiêu Zed thực sự gây sát thương (tag "skill"); proc đồ/phần cộng (tag "effect") không tính
        onDamage(g, me, d) {
            if (d.src?.id !== me.id || d.tag !== "skill" || d.amount <= 0) return
            chainBeat(g,
                me,
                d.target,
                d.kind)
        },
        // đòn thật: tính một lần mỗi hit sau sát thương chính (phần cộng của nội tại/đồ trong info.bonus không thành nhịp riêng)
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss || d.dealt <= 0) return
            chainBeat(g,
                me,
                d.target,
                d.info.kind)
        },
        onDelayed(g, me, d) {
            if (d.key !== R_DELAY) return
            const t = g.unit(String(d.data?.target ?? ""))
            if (!t) return
            const left = g.statusV(t,
                MARK) - 1
            if (left > 0 && t.statuses[MARK]) t.statuses[MARK].v = left
            else g.removeStatus(t,
                MARK)
            // mục tiêu rời sân thì lịch bị huỷ; nhịp hẹn dùng sát thương gốc đã chụp lúc lá R giải quyết
            if (t.status !== "board" || t.side === me.side) return
            g.damage(me,
                t,
                Number(d.data?.raw ?? 0),
                "physical",
                {
                    tag: "skill"
                })
        },
    },
    skills: {
        Q: {
            key: "Q", mana: MANA.Q, name: "Phi Tiêu Sắc Lẻm", target: "opposite",
            desc: `Khoá tướng địch đối diện đang chọn được; gây {${F_Q}} sát thương vật lý. Q là một nhịp Liên Hoàn, không nhân số nhát theo tốc đánh.`,
            resolve(c) {
                const t = c.target
                // engine đã khoá đích "đối diện" (kể cả đổi hướng của Braum Q) và loại đích không còn chọn được
                if (!t || t.side === c.side) return
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
        E: {
            key: "E", mana: MANA.E, name: "Phân Thân", target: "enemy",
            desc: `Chọn một tướng địch; khác đường thì Zed swap với đồng minh đang giữ ô đối diện nó (kể cả đồng minh đã chết), cùng đường thì giữ chỗ. Chỉ khi đã đối diện hợp lệ mới gây {${F_E}} sát thương vật lý; swap thất bại thì không gây sát thương.`,
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
            key: "R", mana: MANA.R, name: "Dấu Ấn Tử Thần", target: "enemy",
            desc: `Chọn một tướng địch hợp lệ ở bất kỳ đường; gây ngay {${F_R}} sát thương vật lý. Nếu mục tiêu còn trên sân, chính lá này hẹn thêm một nhịp bằng sát thương gốc đó cuối lượt hiện tại; mỗi lá R có lịch riêng, mục tiêu rời sân thì huỷ lịch.`,
            resolve(c) {
                const t = c.target
                if (!t || t.side === c.side || !c.g.targetable(t)) return
                // chụp sát thương gốc lúc lá giải quyết: nhịp hẹn dùng đúng con số này
                const raw = c.f(F_R)
                c.g.damage(c.self,
                    t,
                    raw,
                    "physical",
                    {
                        tag: "skill"
                    })
                if (t.status !== "board") return
                c.g.status(t,
                    MARK,
                    1,
                    {
                        v: c.g.statusV(t,
                            MARK) + 1, until: c.g.s.turnNo
                    })
                c.g.delay(c.self,
                    R_DELAY,
                    "turnEnd",
                    c.g.s.active,
                    {
                        target: t.id, raw, card: c.card.uid
                    },
                    {
                        surviveOwnerDeath: true // nhịp đã cam kết vẫn đánh khi Zed đã ngã
                    })
            },
        },
    },
})
