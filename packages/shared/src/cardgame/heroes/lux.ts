// Lux (Pháp sư, phép) V3: "Ánh sáng tích luỹ": mỗi mana thực trả cho chính lá chiêu của Lux thành 1 Ánh Sáng vĩnh viễn; Ánh Sáng càng nhiều E và R càng đau. Máu 320 · AD 69 · giáp/kháng 25/28 · AP gốc 0.
// Ánh Sáng = stack "lux_pool" trên Lux (giữ tên cũ để tương thích save; không mất khi chết, không trần, không tiêu được).
// Chỉ ghi 1 lần mỗi giao dịch trả mana của lá chiêu gốc Lux (hook onManaSpent, d.card là lá của Lux); hồi mana, chi phí đồng đội, đồ không cộng.
// Q (0 mana) hồi bể chung round(min(40, 20 + 7% AD + 10% AP)) + Khiên · E (30) sát thương + 10% Ánh Sáng, Ánh Sáng ≥ 150 thì thử Choáng
// R: cam kết đúng 1 số nguyên 20..mana đội đang có (tối đa 200) qua args.manaSpent; mana.R = 50 chỉ là mặc định UI/bot, không phải phí cứng.
import {
    pct
} from "../formula"
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    OptCtx,
    PlayArgs,
    Unit
} from "../types"
import {
    otherSide
} from "../types"

/** Stack Ánh Sáng trên Lux (tên khoá cũ "Bể Mana") */
export const POOL = "lux_pool"
/** E: sát thương cộng thêm theo phần trăm Ánh Sáng */
export const E_POOL_PCT = 0.1
/** E: Ánh Sáng (sau trả phí) từ mức này thì thử Choáng */
export const E_STUN_POOL = 150
/** R: sát thương cộng thêm mỗi điểm mana thực trả */
export const R_PER_MANA = 1.8
/** R: sát thương cộng thêm theo phần trăm Ánh Sáng (sau trả phí) */
export const R_POOL_PCT = 0.25
/** R: mức cam kết nhỏ nhất / lớn nhất / mặc định UI-bot */
export const R_MIN_MANA = 20
export const R_MAX_MANA = 200
export const R_DEFAULT_MANA = 50
/** Q: trần lượng hồi bể chung mỗi lá */
export const Q_RESTORE_CAP = 40
/** E: Choáng d = 0,9 + 0,001 AD + 0,002 AP (g.scaling: ad/ap theo 100 điểm) */
export const STUN_E = {
    base: 0.9, ad: 0.1, ap: 0.2
}
const F_Q_RESTORE = "20 + 7% AD + 10% AP"
const F_Q_SHIELD = "70 + 15% AD + 40% AP"
const F_E = "105 + 35% AD + 55% AP"
const F_R = "55 + 25% AD + 65% AP"

/** Lượng hồi của Q: round(min(40, 20 + 7% AD + 10% AP)) */
export const qRestore = (g: Game, me: Unit) => Math.round(Math.min(Q_RESTORE_CAP,
    g.f(me,
        F_Q_RESTORE)))

/**
 * Mức cam kết của R: số nguyên args.manaSpent trong [20, min(200, mana đội trước trả)].
 * Không có lựa chọn (UI/bot mặc định, hoặc engine chưa truyền args vào manaCost): 50, hạ xuống mana đang có nếu thiếu (vẫn ≥ 20).
 * Ngoài khoảng hợp lệ thì kẹp về khoảng hợp lệ (engine nên từ chối hành động; xem báo cáo).
 */
export function rCommit(c: OptCtx): number {
    const pool = Math.min(R_MAX_MANA,
        c.g.manaOf(c.self))
    const want = c.args?.manaSpent
    const v = typeof want === "number" && Number.isFinite(want) ? Math.round(want) : Math.min(R_DEFAULT_MANA,
        pool)
    return Math.max(R_MIN_MANA,
        Math.min(pool,
            v))
}
/** Các mức cam kết hợp lệ của R (20, mặc định 50, cả bể): options() phát 1 PlayArgs cho mỗi mức; argsKey phân biệt manaSpent */
export function rCommitChoices(g: Game, me: Unit): number[] {
    const pool = Math.min(R_MAX_MANA,
        g.manaOf(me))
    if (pool < R_MIN_MANA) return []
    return [...new Set([R_MIN_MANA,
        Math.min(R_DEFAULT_MANA,
            pool),
        pool])].sort((a, b) => a - b)
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
            of: otherSide(me.side)
        })
}

export default defineHero({
    id: "lux", name: "Lux", role: "mage", damage: "magic", hp: 320, atk: 69, armor: 25, mr: 28,
    bot: {
        stackValue: {
            lux_pool: 0.3,
        },
    },
    desc: "Ánh sáng tích luỹ: mỗi mana trả cho chiêu của Lux thành Ánh Sáng vĩnh viễn. Q miễn phí nạp mana cho cả đội và che thân, E đánh theo Ánh Sáng (đủ sáng thì Choáng), R cam kết bao nhiêu mana tuỳ ý thành một phát cực lớn.",
    passive: {
        name: "Ánh Sáng",
        desc: "Mỗi 1 mana thực trả cho chính lá chiêu Lux cho 1 Ánh Sáng vĩnh viễn, vô hạn và giữ qua chết. Chỉ ghi một lần mỗi giao dịch; mana đã trả rồi lá bị hủy vẫn tính. Hồi mana, chi phí của đồng đội và đồ không cộng; Ánh Sáng không phải mana để tiêu.",
    },
    hooks: {
        onManaSpent(g, me, d) {
            if (d.unit.id !== me.id || d.amount <= 0) return
            if (d.card.kind === "skill" && d.card.hero && d.card.hero !== "lux") return
            g.stack(me,
                POOL,
                d.amount)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Lăng Kính", target: "none", mana: 0,
            desc: `Không tốn mana: hồi bể chung min(${Q_RESTORE_CAP}, {${F_Q_RESTORE}}) mana (làm tròn), không vượt bể 200; Lux nhận {${F_Q_SHIELD}} Khiên trắng. Lượng hồi không nuôi Ánh Sáng.`,
            resolve(c) {
                c.g.gainMana(c.self,
                    qRestore(c.g,
                        c.self),
                    "restore")
                c.g.shield(c.self,
                    c.self,
                    c.f(F_Q_SHIELD))
            },
        },
        E: {
            key: "E", name: "Khoá Ánh Sáng", target: "enemy", mana: 30,
            desc: `Chọn 1 tướng địch bất kỳ đường, gây {${F_E}} + ${pct(E_POOL_PCT)}% Ánh Sáng sát thương phép. Nếu Ánh Sáng sau trả phí từ ${E_STUN_POOL} trở lên, thử Choáng d = 0,9 + 0,001 AD + 0,002 AP đơn vị; Khiên thường không chặn khống chế.`,
            resolve(c) {
                const t = c.target!
                const light = c.g.stackOf(c.self,
                    POOL)
                c.g.damage(c.self,
                    t,
                    c.f(F_E) + light * E_POOL_PCT,
                    "magic",
                    {
                        tag: "skill"
                    })
                if (light >= E_STUN_POOL) tryStun(c.g,
                    c.self,
                    t,
                    STUN_E)
            },
        },
        R: {
            key: "R", name: "Cầu Vồng Tối Thượng", target: "enemy", mana: rCommit,
            desc: `Cam kết một số nguyên ${R_MIN_MANA}–${R_MAX_MANA} mana, không vượt mana đội đang có trước khi trả; ${R_DEFAULT_MANA} là mặc định chứ không phải phí cứng. Chọn 1 tướng địch bất kỳ đường, gây {${F_R}} + ${R_PER_MANA} × mana thực trả + ${pct(R_POOL_PCT)}% Ánh Sáng sau trả phí sát thương phép.`,
            canPlay: (c) => c.g.manaOf(c.self) >= R_MIN_MANA,
            // Một lựa chọn cho mỗi (mục tiêu × mức cam kết rCommitChoices); Game.argsKey phân biệt manaSpent, engine trả đúng mức đã chọn.
            options(c) {
                const out: PlayArgs[] = []
                const levels = rCommitChoices(c.g,
                    c.self)
                for (const t of c.g.targetableEnemies(c.self)) if (!t.token) for (const m of levels) out.push({
                    target: t.id, manaSpent: m
                })
                return out
            },
            resolve(c) {
                const t = c.target!
                const light = c.g.stackOf(c.self,
                    POOL)
                c.g.damage(c.self,
                    t,
                    c.f(F_R) + c.manaPaid * R_PER_MANA + light * R_POOL_PCT,
                    "magic",
                    {
                        tag: "skill"
                    })
            },
        },
    },
})
