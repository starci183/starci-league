// Yorick (Đấu sĩ, vật lý): máu 410 · AD 68 · giáp/kháng 31/30 (V3).
// CHẤT: "Nuôi Thiếu Nữ". Yorick đánh để LẤP MỘ (đòn gây 50% + 2%/lá trong mộ, tối đa 130%; mỗi đòn vứt 1 lá trên cùng bộ bài vào mộ và rút 1 lá, tối đa 2 lá rút/lượt);
// Q Chôn bài chết và rút bù (hồi máu), E Đào Mộ vứt 3 lá rồi chọn 1 lá về tay, R Thiếu Nữ Sương Mù: trạng thái vĩnh viễn Ma Sương (giảm sát thương; đầu lượt Thiếu Nữ đánh và đào mộ),
// mộ càng dày Thiếu Nữ càng đau và Yorick càng trâu.
// Engine: AttackInfo.mult (nội tại), g.mill + g.offerPick (E), SkillDef.extra "discard" (Q), status FOREVER + modifyDamage + onTurnStart (R).
// Đối thủ trả lời: hạ Yorick (mất Ma Sương), Blitzcrank cướp bài, đánh nhanh trước khi Yorick làm cạn bộ bài của chính mình.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    FOREVER, RULES
} from "../types"
import type {
    Card, Side, Unit
} from "../types"

/** Nội tại: đòn đánh của Yorick gây (50% + 2% mỗi lá trong mộ, không trần) sát thương đòn chính; mỗi đòn vứt 1 lá trên cùng bộ bài vào mộ và bạn rút 1 lá (tối đa 2 lá rút/lượt) */
export const ATTACK_BASE = 0.5
export const ATTACK_PER_GRAVE = 0.02
/** Bỏ trần hệ số đòn theo mộ (giữ tên để tương thích) */
export const ATTACK_MAX = Infinity
const ATTACK_MILL = 1
export const ATTACK_DRAW_CAP = 2
/** Hệ số đòn đánh theo số lá trong mộ */
export const attackMult = (grave: number) => Math.min(ATTACK_MAX,
    ATTACK_BASE + ATTACK_PER_GRAVE * grave)
/** Q: Yorick hồi */
export const F_Q = "30 + 35% AD + 4% AP"
/** E: vứt 3 lá trên cùng, chọn 1 lá trong đó về tay */
const E_MILL = 3
/** R (chủ đổi 30/10, không còn token): Yorick nhận trạng thái VĨNH VIỄN "Ma Sương" (yorick_mist, v = số tầng, cộng dồn mỗi lần dùng R; mất khi Yorick chết) */
export const MIST = "yorick_mist"
/** Sát thương Yorick nhận nhân 1 / [1 + tầng × (0,15 + 0,001 × Giáp)] (lợi ích biên giảm, không trần) */
export const MIST_CUT_BASE = 0.15
export const MIST_CUT_PER_ARMOR = 0.001
/** Thiếu Nữ đánh: (1.5% máu tối đa mục tiêu mỗi 5 lá trong mộ + 8% máu tối đa + 50% Giáp của Yorick) sát thương vật lý */
export const GRAVE_STEP = 5
export const MAIDEN_PCT_PER_STEP = 0.015
export const F_MAIDEN = "5% máu tối đa + 30% Giáp"
/** Yorick hồi (1% máu tối đa mỗi 5 lá trong mộ + 20% Giáp) */
export const MAIDEN_HEAL_PER_STEP = 0.01
export const F_MAIDEN_HEAL = "15% Giáp"
/** Đầu lượt bạn, mỗi tầng: Thiếu Nữ đào 1 lá trên cùng bộ bài vào mộ */
export const MIST_MILL = 1

/** Chủ đổi 30/10: mộ đạt mỗi mốc bấy nhiêu lá (20, 40, 60...) thì lá R Thiếu Nữ Sương Mù tự lên tay (lấy từ bộ, không có thì từ mộ) */
export const R_GRAVE_STEP = 20
/** Số mốc đã đạt (theo mộ cao nhất từng có) */
const R_MARK = "yorickRMark"
/** Quyền tìm R còn chờ (mỗi mốc mới +1; không mất khi đang chết, tay đầy, đã có R hay chưa tìm thấy R) */
const R_PENDING = "yorickRPending"
const isMyR = (c: Card) => c.kind === "skill" && c.id === "yorick_r" && !c.temp
/** Ghi mốc mộ mới (20, 40, 60... theo mộ cao nhất) rồi thử trả quyền chờ: tìm lá R thật từ bộ, không có thì từ mộ */
function checkMaidenCard(g: Game, me: Unit) {
    const mark = Math.floor(graveSize(g,
        me.side) / R_GRAVE_STEP)
    const had = me.stacks[R_MARK] ?? 0
    if (mark > had) {
        me.stacks[R_MARK] = mark
        me.stacks[R_PENDING] = (me.stacks[R_PENDING] ?? 0) + mark - had
    }
    if ((me.stacks[R_PENDING] ?? 0) <= 0 || me.status !== "board") return
    const p = g.player(me.side)
    if (p.hand.some(isMyR) || g.handCount(me.side) >= RULES.handMax) return
    const inDeck = g.deckCards(me.side,
        isMyR)[0]
    let got: Card | undefined
    if (inDeck) {
        g.log("Mốc mộ: Yorick lấy lá Thiếu Nữ Sương Mù từ bộ bài lên tay")
        got = g.tutor(me.side,
            (c) => c.uid === inDeck.uid)
    } else {
        const inGrave = g.graveCards(me.side,
            isMyR)[0]
        if (inGrave) {
            g.log("Mốc mộ: Yorick lấy lá Thiếu Nữ Sương Mù từ mộ lên tay")
            got = g.fromGrave(me.side,
                inGrave.uid)
        }
    }
    if (got && p.hand.some((c) => c.uid === got.uid)) me.stacks[R_PENDING] = (me.stacks[R_PENDING] ?? 1) - 1
}

/** Số lá trong mộ bài của bạn */
export const graveSize = (g: Game, side: Side) => g.player(side).grave.length
export const steps = (g: Game, side: Side) => Math.floor(graveSize(g,
    side) / GRAVE_STEP)

/** Số tầng Ma Sương của Yorick */
export const mistStacks = (g: Game, me: Unit) => g.statusV(me,
    MIST)
/** Hệ số sát thương Yorick nhận dưới Ma Sương: 1 / [1 + tầng × (0,15 + 0,001 × Giáp)] */
export const mistMult = (g: Game, me: Unit) => {
    const n = mistStacks(g,
        me)
    if (n <= 0) return 1
    return 1 / (1 + n * (MIST_CUT_BASE + MIST_CUT_PER_ARMOR * Math.max(0,
        g.armor(me))))
}
/** Tỉ lệ giảm sát thương của Ma Sương (tổng mọi tầng) */
export const mistCut = (g: Game, me: Unit) => 1 - mistMult(g,
    me)
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
/** Đầu lượt bạn: chụp số tầng; mỗi tầng = Thiếu Nữ đánh + hồi, rồi đào 1 lá vào mộ (mộ tăng thì n của tầng sau tăng) */
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
    id: "yorick", name: "Yorick", role: "fighter", damage: "physical", hp: 380, atk: 64, armor: 31, mr: 30,
    bot: {
        graveCardValue: 3,
    },
    desc: "Người Chăn Hồn: đánh để lấp mộ chứ không để giết; mộ càng dày, Thiếu Nữ Sương Mù (đi cạnh Yorick) càng đáng sợ và Yorick càng trâu.",
    passive: {
        name: "Người Đào Mộ",
        desc: "Trước từng đòn được cấp quyền, hệ số sát thương đòn chính là 50% + 2% mỗi lá hiện có trong mộ, không trần; đào 1 lá rồi rút bù 1 lá, tối đa 2 lá rút mỗi lượt đang chạy, kể cả đòn trượt vẫn đào/rút. Mỗi mốc mộ cao nhất mới 20, 40, 60... cho một quyền chờ tìm R thật từ bộ, nếu không có thì từ mộ.",
    },
    modifyDamage(g, me, d) {
        // Ma Sương: Yorick nhận ít sát thương hơn
        return d.target.id === me.id ? mistMult(g,
            me) : 1
    },
    // ghi mốc mộ cả khi Yorick đang chết (quyền chờ không mất); lấy lá R vẫn chờ Yorick trên sân (checkMaidenCard tự kiểm)
    offBoardHooks: ["onBurn",
        "onDiscard",
        "onActionEnd",
        "onTurnEnd"],
    hooks: {
        onBurn(g, me, d) { if (d.side === me.side) checkMaidenCard(g,
            me) },
        onDiscard(g, me, d) { if (d.side === me.side) checkMaidenCard(g,
            me) },
        // mọi lá vào mộ (lá đã dùng, bị huỷ...) đều có thể chạm mốc
        onActionEnd(g, me) { checkMaidenCard(g,
            me) },
        onTurnEnd(g, me) { checkMaidenCard(g,
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
            key: "Q", mana: 10, name: "Chôn Cất", target: "none", extra: "discard",
            desc: `Bỏ 1 lá khác trên tay vào mộ, rút 1 lá rồi Yorick hồi {${F_Q}} Máu; cần có lá khác để trả.`,
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
            key: "E", mana: 15, name: "Đào Mộ", target: "none",
            desc: "Đào tối đa 3 lá trên cùng bộ vào mộ; chọn 1 trong số lá vừa đào vẫn thực sự còn trong mộ để chuyển lên tay, không nhân bản. Cần bộ còn ít nhất 1 lá khi dùng.",
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
            key: "R", mana: 30, name: "Thiếu Nữ Sương Mù", target: "none",
            desc: `Thiếu Nữ đánh 1 tướng địch hợp lệ ngẫu nhiên và hồi Yorick ngay, rồi thêm 1 tầng Ma Sương vĩnh viễn tới chết thật. Mỗi tầng đầu lượt mình đánh/hồi một lần rồi đào 1 lá. Với n=floor(mộ/5), mỗi lần đánh gây 1,5% × n Máu tối đa mục tiêu + {${F_MAIDEN}} của Yorick sát thương vật lý; hồi Yorick 1% × n Máu tối đa Yorick + {${F_MAIDEN_HEAL}}. Sát thương nhận nhân 1/[1 + tầng × (0,15 + 0,001 × Giáp)].`,
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
