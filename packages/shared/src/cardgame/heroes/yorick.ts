// Yorick (Đấu sĩ, vật lý): máu 440 · AD 100 · giáp/kháng 31/30 (V3).
// CHẤT: "Nuôi Thiếu Nữ". Yorick đánh để LẤP MỘ (đòn gây 50% + 2%/lá trong mộ, tối đa 130%; mỗi đòn vứt 1 lá trên cùng bộ bài vào mộ và rút 1 lá, tối đa 2 lá rút/lượt);
// Q Chôn bài chết và rút bù (hồi máu), E Đào Mộ vứt 3 lá rồi chọn 1 lá về tay, R Thiếu Nữ Sương Mù: trạng thái vĩnh viễn Ma Sương (giảm sát thương; đầu lượt Thiếu Nữ đánh và đào mộ),
// mộ càng dày Thiếu Nữ càng đau và Yorick càng trâu.
// Engine: AttackInfo.mult (nội tại), g.mill + g.offerPick (E), SkillDef.extra "discard" (Q), status FOREVER + modifyDamage + onTurnStart (R).
// Đối thủ trả lời: hạ Yorick (mất Ma Sương), Blitzcrank cướp bài, đánh nhanh trước khi Yorick làm cạn bộ bài của chính mình.
import type {
    Game
} from "../game"
import {
    pct
} from "../formula"
import {
    defineHero
} from "../registry"
import {
    FOREVER
} from "../types"
import type {
    Card, Side, Unit
} from "../types"

/** Nội tại (chủ đổi 30/10): đòn đánh của Yorick gây (50% + 2% mỗi lá trong mộ, tối đa 130%) sát thương; mỗi đòn vứt 1 lá trên cùng bộ bài vào mộ và bạn rút 1 lá (tối đa 2 lá rút/lượt) */
export const ATTACK_BASE = 0.5
export const ATTACK_PER_GRAVE = 0.02
export const ATTACK_MAX = 1.3
const ATTACK_MILL = 1
export const ATTACK_DRAW_CAP = 2
/** Hệ số đòn đánh theo số lá trong mộ */
export const attackMult = (grave: number) => Math.min(ATTACK_MAX,
    ATTACK_BASE + ATTACK_PER_GRAVE * grave)
/** Q: Yorick hồi */
export const F_Q = "35 + 30% AD + 5% AP"
/** E: vứt 3 lá trên cùng, chọn 1 lá trong đó về tay */
const E_MILL = 3
/** R (chủ đổi 30/10, không còn token): Yorick nhận trạng thái VĨNH VIỄN "Ma Sương" (yorick_mist, v = số tầng, cộng dồn mỗi lần dùng R; mất khi Yorick chết) */
export const MIST = "yorick_mist"
/** Mỗi tầng: Yorick nhận ít hơn (15% + 0.1% mỗi 1 Giáp, tối đa 25%) sát thương; nhiều tầng nhân dồn, tổng tối đa 50% */
export const MIST_CUT_BASE = 0.15
export const MIST_CUT_PER_ARMOR = 0.001
export const MIST_CUT_MAX = 0.25
export const MIST_CUT_TOTAL_MAX = 0.5
/** Thiếu Nữ đánh: (1.5% máu tối đa mục tiêu mỗi 5 lá trong mộ + 8% máu tối đa + 50% Giáp của Yorick) sát thương vật lý */
export const GRAVE_STEP = 5
export const MAIDEN_PCT_PER_STEP = 0.015
export const F_MAIDEN = "8% máu tối đa + 50% Giáp"
/** Yorick hồi (1% máu tối đa mỗi 5 lá trong mộ + 20% Giáp) */
export const MAIDEN_HEAL_PER_STEP = 0.01
export const F_MAIDEN_HEAL = "20% Giáp"
/** Đầu lượt bạn, mỗi tầng: Thiếu Nữ đào 1 lá trên cùng bộ bài vào mộ */
export const MIST_MILL = 1

/** Chủ đổi 30/10: mộ đạt mỗi mốc bấy nhiêu lá (20, 40, 60...) thì lá R Thiếu Nữ Sương Mù tự lên tay (lấy từ bộ, không có thì từ mộ) */
export const R_GRAVE_STEP = 20
const R_MARK = "yorickRMark"
const isMyR = (c: Card) => c.kind === "skill" && c.id === "yorick_r"
/** Mộ vừa qua mốc R_GRAVE_STEP mới: đưa lá R lên tay (bỏ qua nếu tay đã có lá R) */
function checkMaidenCard(g: Game, me: Unit) {
    const mark = Math.floor(graveSize(g,
        me.side) / R_GRAVE_STEP)
    if (mark <= (me.stacks[R_MARK] ?? 0)) return
    me.stacks[R_MARK] = mark
    if (me.status !== "board") return
    if (g.player(me.side).hand.some(isMyR)) return
    const inDeck = g.deckCards(me.side,
        isMyR)[0]
    if (inDeck) {
        g.log(`Mộ đủ ${mark * R_GRAVE_STEP} lá: Yorick lấy lá Thiếu Nữ Sương Mù từ bộ bài lên tay`)
        g.tutor(me.side,
            (c) => c.uid === inDeck.uid)
        return
    }
    const inGrave = g.graveCards(me.side,
        isMyR)[0]
    if (inGrave) {
        g.log(`Mộ đủ ${mark * R_GRAVE_STEP} lá: Yorick lấy lá Thiếu Nữ Sương Mù từ mộ lên tay`)
        g.fromGrave(me.side,
            inGrave.uid)
    }
}

/** Số lá trong mộ bài của bạn */
export const graveSize = (g: Game, side: Side) => g.player(side).grave.length
export const steps = (g: Game, side: Side) => Math.floor(graveSize(g,
    side) / GRAVE_STEP)

/** Số tầng Ma Sương của Yorick */
export const mistStacks = (g: Game, me: Unit) => g.statusV(me,
    MIST)
/** Tỉ lệ giảm sát thương của Ma Sương (tổng mọi tầng) */
export const mistCut = (g: Game, me: Unit) => {
    const n = mistStacks(g,
        me)
    if (n <= 0) return 0
    const per = Math.min(MIST_CUT_MAX,
        MIST_CUT_BASE + MIST_CUT_PER_ARMOR * g.armor(me))
    return Math.min(MIST_CUT_TOTAL_MAX,
        1 - (1 - per) ** n)
}
/** Thiếu Nữ đánh 1 lần: 1 địch ngẫu nhiên nhận sát thương vật lý, Yorick hồi máu */
export function maidenStrike(g: Game, me: Unit) {
    const n = steps(g,
        me.side)
    const foe = g.pick(g.targetableEnemies(me).filter((x) => !x.token))
    if (foe) {
        g.log(`Thiếu Nữ Sương Mù đánh ngẫu nhiên ${g.nameOf(foe)}`)
        g.damage(me,
            foe,
            foe.maxHp * MAIDEN_PCT_PER_STEP * n + g.f(me,
                F_MAIDEN),
            "physical",
            {
                tag: "effect"
            })
    }
    g.heal(me,
        me,
        me.maxHp * MAIDEN_HEAL_PER_STEP * n + g.f(me,
            F_MAIDEN_HEAL))
}
/** Đầu lượt bạn: mỗi tầng Ma Sương = Thiếu Nữ đánh + hồi, rồi đào 1 lá vào mộ */
function mistTurn(g: Game, me: Unit) {
    const n = mistStacks(g,
        me)
    for (let i = 0; i < n && me.status === "board"; i++) {
        maidenStrike(g,
            me)
        if (g.player(me.side).deck.length > 0) {
            g.log("Thiếu Nữ Sương Mù đào 1 lá trên cùng bộ bài vào mộ")
            g.mill(me.side,
                MIST_MILL)
        }
    }
}

export default defineHero({
    id: "yorick", name: "Yorick", role: "fighter", damage: "physical", hp: 440, atk: 100, armor: 31, mr: 30,
    bot: {
        graveCardValue: 3,
    },
    desc: "Người Chăn Hồn: đánh để lấp mộ chứ không để giết; mộ càng dày, Thiếu Nữ Sương Mù (đi cạnh Yorick) càng đáng sợ và Yorick càng trâu.",
    passive: {
        name: "Người Đào Mộ",
        desc: `Đòn đánh của Yorick gây (${pct(ATTACK_BASE)}% + ${pct(ATTACK_PER_GRAVE)}% mỗi lá trong mộ, tối đa ${pct(ATTACK_MAX)}%) sát thương; mỗi đòn (cả nút 66%) vứt ${ATTACK_MILL} lá trên cùng bộ bài của bạn vào mộ và bạn rút 1 lá (tối đa ${ATTACK_DRAW_CAP} lá rút mỗi lượt). Mộ đạt ${R_GRAVE_STEP}, ${2 * R_GRAVE_STEP}, ${3 * R_GRAVE_STEP}... lá: lá R Thiếu Nữ Sương Mù tự lên tay (lấy từ bộ bài, không có thì từ mộ; bỏ qua nếu tay đã có lá R).`,
    },
    modifyDamage(g, me, d) {
        // Ma Sương: Yorick nhận ít sát thương hơn
        return d.target.id === me.id ? 1 - mistCut(g,
            me) : 1
    },
    hooks: {
        onBurn(g, me, d) { if (d.side === me.side) checkMaidenCard(g,
            me) },
        onDiscard(g, me, d) { if (d.side === me.side) checkMaidenCard(g,
            me) },
        onTurnStart(g, me, d) {
            if (d.side !== me.side) return
            mistTurn(g,
                me)
            checkMaidenCard(g,
                me)
        },
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id) return
            d.info.mult *= attackMult(graveSize(g,
                me.side))
            g.mill(me.side,
                ATTACK_MILL)
            // rút bù, tối đa ATTACK_DRAW_CAP lá mỗi lượt (2 khoá oncePerTurn)
            if (g.player(me.side).deck.length > 0 && (g.oncePerTurn(me,
                "yorickDraw1") || g.oncePerTurn(me,
                "yorickDraw2"))) g.draw(me.side,
                1,
                {
                    reason: "skill", by: me.id
                })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Chôn Cất", target: "none", extra: "discard",
            desc: `Bỏ 1 lá trên tay vào mộ, rồi bạn rút 1 lá; Yorick hồi {${F_Q}} máu.`,
            canPlay: (c) => c.g.player(c.side).hand.some((x) => x.uid !== c.card.uid),
            resolve(c) {
                const uid = c.args.discard?.[0]
                if (uid) c.g.discard(c.side,
                    uid,
                    "cost")
                c.g.draw(c.side,
                    1,
                    {
                        reason: "skill", by: c.self.id
                    })
                c.g.heal(c.self,
                    c.self,
                    c.f(F_Q))
            },
        },
        E: {
            key: "E", name: "Đào Mộ", target: "none",
            desc: `Vứt ${E_MILL} lá trên cùng bộ bài của bạn vào mộ, rồi chọn 1 lá trong ${E_MILL} lá đó lấy về tay (đánh 1 lá chọn tạm trên tay).`,
            canPlay: (c) => c.g.deckCards(c.side).length > 0,
            resolve(c) {
                // 3 lá vào mộ, rồi mỗi lá thành 1 lá chọn tạm trên tay: đánh 1 lá = lấy lá đó về tay
                const cards = c.g.mill(c.side,
                    E_MILL)
                c.g.offerPick(c.side,
                    c.self.hero,
                    cards)
            },
        },
        R: {
            key: "R", name: "Thiếu Nữ Sương Mù", target: "none",
            desc: `Thiếu Nữ đánh ngay 1 lần, rồi Yorick nhận VĨNH VIỄN 1 tầng Ma Sương (cộng dồn; mất khi Yorick chết). Mỗi tầng: Yorick nhận ít hơn (${pct(MIST_CUT_BASE)}% + ${pct(MIST_CUT_PER_ARMOR)}% mỗi 1 Giáp, tối đa ${pct(MIST_CUT_MAX)}%) sát thương (tổng tối đa ${pct(MIST_CUT_TOTAL_MAX)}%). Đầu mỗi lượt bạn, mỗi tầng: Thiếu Nữ đánh 1 địch ngẫu nhiên (${pct(MAIDEN_PCT_PER_STEP)}% máu tối đa của nó mỗi ${GRAVE_STEP} lá trong mộ + {${F_MAIDEN}} của Yorick) sát thương vật lý và Yorick hồi (${pct(MAIDEN_HEAL_PER_STEP)}% máu tối đa mỗi ${GRAVE_STEP} lá trong mộ + {${F_MAIDEN_HEAL}}); Thiếu Nữ đào ${MIST_MILL} lá trên cùng bộ bài vào mộ.`,
            resolve(c) {
                maidenStrike(c.g,
                    c.self)
                c.g.status(c.self,
                    MIST,
                    1,
                    {
                        v: 1, add: true, until: FOREVER
                    })
            },
        },
    },
})
