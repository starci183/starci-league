// Katarina (Sát thủ, phép): máu 320 · AD 76 · AP gốc 0 · giáp/kháng 26/28 · mana Q15/E20/R35 (bể đội).
// CHẤT: "Hạ một là làm lại". Địch chết thật trong lượt mà Katarina đã Chạm (ai hạ cũng được): mọi lá Katarina đã dùng lượt này về tay.
// Q gắn Dao từ xa, E swap với đồng minh để đứng đối diện con mồi rồi chém (Quick: né đòn đánh nhắm Katarina sau khi chuyển vị hợp lệ),
// R dọn bàn (tướng có Dao nhận thêm).
// Engine: hook onDamage/onDeath, dấu dùng lá card.data.usedTurn (onManaSpent lúc cam kết + onCast dự phòng), ctx.toHand (lá đang giải quyết),
//         g.fromGrave, g.chainFx().cancel, g.faceEnemy (swap nguyên tử với người giữ ô, kể cả đồng minh đã chết; không vào đường chưa mở).
// Đối thủ trả lời: Renata (hồi sinh làm hụt), Soraka (chịu thay đòn chí mạng), Khiên, Choáng/Câm Lặng Katarina trước khi mở chuỗi.
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
    Card, Ctx, OptCtx, PlayArgs, SkillDef, Unit
} from "../types"
import {
    otherSide
} from "../types"

/** Dao: trạng thái trên tướng địch (Q gắn), 2 lượt của phe mang dấu */
const DAGGER = "kat_dagger"
/** Cờ kỹ thuật (ẩn trên UI, tiền tố "once:"): lượt (turnNo) Katarina Chạm địch này lần cuối */
const TOUCH = "once:kat_touch:"
/** Cờ kỹ thuật: tổng số địch chết sau khi Katarina đã Chạm (để lá đang giải quyết biết có hạ được không) */
const KILLS = "once:kat_kills"
export const F_Q = "110 + 55% AD + 70% AP"
export const F_E = "60 + 30% AD + 40% AP"
export const F_R = "85 + 40% AD + 55% AP"
/** E gấp đôi lên tướng có Dao */
export const E_DAGGER_MULT = 2
/** R: tướng có Dao nhận thêm bấy nhiêu */
export const R_DAGGER_BONUS = 0.6
/** Dao tồn tại bấy nhiêu lượt của phe mang dấu */
export const DAGGER_TARGET_TURNS = 2
export const MANA = {
    Q: 10, E: 20, R: 35
} as const

/** Đánh dấu lá Katarina đã dùng trong lượt (từ lúc cam kết, kể cả nếu sau đó bị huỷ) */
function stampUsed(g: Game, card: Card) {
    card.data = {
        ...card.data, usedTurn: g.s.turnNo
    }
}

/** Chạy lá chiêu; nếu trong lúc đó có địch chết theo nội tại thì chính lá này cũng về tay thay vì vào mộ */
function recallIfKill(c: Ctx, run: () => void) {
    const before = c.g.stackOf(c.self,
        KILLS)
    run()
    if (c.g.stackOf(c.self,
        KILLS) > before) c.toHand()
}

// Chọn con mồi theo luật chọn mục tiêu chung (Tàng Hình, Khiêu Khích...); E chỉ lọc thêm khả năng tiếp cận.
const ENEMY_SELECTION: SkillDef = {
    key: "E", name: "", desc: "", target: "enemy", resolve: () => {}
}
const enemyOptions = (c: OptCtx): PlayArgs[] => skillArgs(c.g,
    c.side,
    c.self,
    c.card,
    ENEMY_SELECTION)
/** Ô của Katarina ở đường con mồi (đường có con mồi đứng nên chắc chắn đã mở; không bao giờ là đường khoá). Người giữ ô (đồng minh sống hoặc đã chết đang chờ hồi sinh) bị swap về ô cũ của Katarina. */
function canReach(g: Game, self: Unit, foe: Unit): boolean {
    if (g.opposite(self)?.id === foe.id) return true
    return g.canFace(self,
        foe)
}
/** Dời Katarina tới ô đối diện `foe` (swap nguyên tử với người giữ ô). true = sau bước này Katarina đang đối diện hợp lệ con mồi. */
function reachFacing(g: Game, self: Unit, foe: Unit): boolean {
    if (g.opposite(self)?.id === foe.id) return true
    if (!canReach(g,
        self,
        foe) || !g.faceEnemy(self,
        foe)) return false
    return g.opposite(self)?.id === foe.id
}
/** Đang nối chuỗi lên một đòn đánh đơn của địch nhắm Katarina */
const isAttackReaction = (c: OptCtx) => !!c.trigger && c.trigger.side !== c.side && c.trigger.kind === "attack" && !!c.trigger.single && c.trigger.target === c.self.id

export default defineHero({
    id: "katarina", name: "Katarina", role: "assassin", damage: "magic", hp: 320, atk: 76, armor: 26, mr: 28,
    bot: {
        markValue: {
            kat_dagger: 25,
        },
        graveCardValue: 6,
    },
    desc: "Lưỡi Kiếm Bất Dung Tha: gắn Dao, lướt tới con mồi hoặc né đòn rồi phạt kẻ ra tay, dọn cả bàn; hạ được một tướng là cả kho lá quay về tay.",
    passive: {
        name: "Tham Lam",
        desc: "Sát thương thực dương vào Máu hoặc Khiên của một tướng địch do Katarina gây ra ghi Chạm tới hết lượt. Tướng đó chết thật cùng lượt (ai hạ cũng được) thì mọi lá Katarina đã dùng lượt này đang nằm trong mộ quay về tay, gồm cả lá đang giải quyết nếu hạ được nó; không tạo bản sao, không hoàn mana.",
    },
    hooks: {
        onDamage(g, me, d) {
            if (d.src?.id !== me.id || d.target.side === me.side || d.target.token) return
            if (d.hpLost + d.absorbed <= 0) return // chỉ sát thương thực dương vào Máu/Khiên mới ghi Chạm
            g.setStack(me,
                TOUCH + d.target.id,
                g.s.turnNo)
        },
        // dấu dùng lá lúc cam kết (trả mana khi kích hoạt), kể cả khi lá bị huỷ sau đó
        onManaSpent(g, me, d) {
            if (d.unit.id === me.id && d.card.kind === "skill" && d.card.hero === me.hero) stampUsed(g,
                d.card)
        },
        onCast(g, me, d) {
            if (d.caster.id === me.id && d.card.kind === "skill" && d.card.hero === me.hero) stampUsed(g,
                d.card)
        },
        onDeath(g, me, d) {
            const v = d.victim
            if (v.token || v.side === me.side || g.stackOf(me,
                TOUCH + v.id) !== g.s.turnNo) return
            g.setStack(me,
                KILLS,
                g.stackOf(me,
                    KILLS) + 1)
            for (const card of [...g.player(me.side).grave]) {
                if (card.kind !== "skill" || card.hero !== me.hero || card.data?.usedTurn !== g.s.turnNo) continue
                delete card.data.usedTurn
                g.fromGrave(me.side,
                    card.uid)
            }
        },
    },
    skills: {
        Q: {
            key: "Q", mana: MANA.Q, name: "Phi Dao", target: "enemy",
            desc: `Chọn một tướng địch từ xa; gây {${F_Q}} sát thương phép, nếu nó còn trên bàn thì gắn Dao trong ${DAGGER_TARGET_TURNS} lượt của phe mang dấu. Dao không cộng dồn, dùng lại làm mới hạn; E/R không tiêu Dao.`,
            resolve(c) {
                const t = c.target
                if (!t || t.side === c.side) return
                stampUsed(c.g,
                    c.card)
                recallIfKill(c,
                    () => {
                        c.g.damage(c.self,
                            t,
                            c.f(F_Q),
                            "magic",
                            {
                                tag: "skill"
                            })
                        if (t.status === "board") c.g.status(t,
                            DAGGER,
                            DAGGER_TARGET_TURNS)
                    })
            },
        },
        E: {
            key: "E", mana: MANA.E, name: "Thuấn Bộ", target: "enemy", quick: true,
            desc: `Quick. Chủ động: chọn một tướng địch; khác đường thì Katarina swap với đồng minh đang giữ ô đối diện nó (kể cả đồng minh đã chết), rồi gây {${F_E}} sát thương phép, gấp ${E_DAGGER_MULT} nếu nó có Dao. Nối chuỗi khi địch đánh Katarina (đòn đánh đơn trên cùng): tự lấy kẻ đánh làm đích, chuyển vị hợp lệ xong mới né (huỷ đòn) và đánh trả. Đã đối diện thì không cần swap; swap thất bại thì không né, không gây sát thương.`,
            quickWhen: (c) => isAttackReaction(c),
            options(c) {
                if (isAttackReaction(c)) {
                    const foe = c.g.unit(c.trigger!.actor)
                    return foe && foe.side !== c.side && !foe.token && c.g.targetable(foe) && canReach(c.g,
                        c.self,
                        foe) ? [{
                            target: foe.id
                        }] : []
                }
                return enemyOptions(c).filter((a) => {
                    const t = c.g.unit(a.target)
                    return !!t && canReach(c.g,
                        c.self,
                        t)
                })
            },
            resolve(c) {
                const reaction = isAttackReaction(c)
                const foe = reaction ? c.g.unit(c.trigger!.actor) : c.target
                if (!foe || foe.status !== "board" || foe.side === c.side || foe.token) return
                stampUsed(c.g,
                    c.card)
                if (!reachFacing(c.g,
                    c.self,
                    foe)) return
                if (reaction) c.g.chainFx().cancel = true
                recallIfKill(c,
                    () => {
                        c.g.damage(c.self,
                            foe,
                            c.f(F_E) * (c.g.has(foe,
                                DAGGER) ? E_DAGGER_MULT : 1),
                            "magic",
                            {
                                tag: "skill"
                            })
                    })
            },
        },
        R: {
            key: "R", mana: MANA.R, name: "Bông Sen Tử Thần", target: "all_enemies",
            desc: `Mọi tướng địch nhận {${F_R}} sát thương phép; tướng có Dao trước nhịp sát thương nhận thêm ${pct(R_DAGGER_BONUS)}% (tổng × 1,6). Mỗi tướng một nhịp, không tách hit theo tốc đánh.`,
            resolve(c) {
                stampUsed(c.g,
                    c.card)
                recallIfKill(c,
                    () => {
                        // Dao được xét trước nhịp sát thương của từng mục tiêu
                        const foes = c.g.heroes(otherSide(c.side)).map((t) => ({
                            t, dagger: c.g.has(t,
                                DAGGER)
                        }))
                        for (const { t, dagger } of foes) {
                            c.g.damage(c.self,
                                t,
                                c.f(F_R) * (dagger ? 1 + R_DAGGER_BONUS : 1),
                                "magic",
                                {
                                    tag: "skill"
                                })
                        }
                    })
            },
        },
    },
})
