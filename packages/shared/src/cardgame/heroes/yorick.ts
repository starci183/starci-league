// Yorick (Đấu sĩ, vật lý): máu 440 · AD 100 · giáp/kháng 31/30 (V3).
// CHẤT: "Nuôi Thiếu Nữ". Yorick đánh để LẤP MỘ (đòn chỉ 40% sát thương, mỗi đòn vứt 1 lá trên cùng bộ bài vào mộ);
// Q Chôn bài chết và rút bù (hồi máu), E Đào Mộ vứt 3 lá rồi chọn 1 lá về tay, R gọi Thiếu Nữ Sương Mù vào ô phụ,
// mộ càng dày Thiếu Nữ càng đau và Yorick càng trâu.
// Engine: AttackInfo.mult (nội tại), g.mill + g.offerPick (E), SkillDef.extra "discard" (Q), g.summonToken + defineTokenBehavior (R).
// Đối thủ trả lời: Xạ thủ/Đấu sĩ đánh Thiếu Nữ, Blitzcrank cướp bài, đánh nhanh trước khi Yorick làm cạn bộ bài của chính mình.
import type {
    Game
} from "../game"
import {
    pct
} from "../formula"
import {
    defineHero, defineTokenBehavior
} from "../registry"
import type {
    Side
} from "../types"

/** Nội tại: đòn đánh của Yorick chỉ gây 40% sát thương, mỗi đòn vứt 1 lá trên cùng bộ bài vào mộ */
export const ATTACK_MULT = 0.4
const ATTACK_MILL = 1
/** Q: Yorick hồi */
export const F_Q = "35 + 30% AD + 5% AP"
/** E: vứt 3 lá trên cùng, chọn 1 lá trong đó về tay */
const E_MILL = 3
/** R: Thiếu Nữ máu 150 + 8 mỗi lá trong mộ */
export const MAIDEN = "maiden"
const MAIDEN_HP = 150
export const MAIDEN_HP_PER_GRAVE = 8
/** Đầu lượt bạn Thiếu Nữ đánh: mỗi 5 lá trong mộ = 1.5% máu tối đa của nó; cộng (8% máu tối đa + 50% Giáp) của Yorick */
const GRAVE_STEP = 5
export const MAIDEN_PCT_PER_STEP = 0.015
export const F_MAIDEN = "8% máu tối đa + 50% Giáp"
/** Yorick hồi 1% máu tối đa của Yorick mỗi 5 lá trong mộ */
export const MAIDEN_HEAL_PER_STEP = 0.01

/** Số lá trong mộ bài của bạn */
export const graveSize = (g: Game, side: Side) => g.player(side).grave.length
export const steps = (g: Game, side: Side) => Math.floor(graveSize(g,
    side) / GRAVE_STEP)

// Thiếu Nữ: đầu mỗi lượt của chủ đánh 1 địch ngẫu nhiên (chọn được) và hồi máu cho Yorick; máu tối đa theo mộ
defineTokenBehavior({
    id: MAIDEN,
    onOwnerTurnStart(g, token, owner) {
        g.setAuraMaxHp(token,
            "grave",
            MAIDEN_HP_PER_GRAVE * graveSize(g,
                token.side))
        if (!owner || owner.status !== "board") return
        const n = steps(g,
            owner.side)
        const foe = g.pick(g.targetableEnemies(token))
        if (foe) g.log(`Thiếu Nữ Sương Mù đánh ngẫu nhiên ${g.nameOf(foe)}`)
        if (foe) g.damage(token,
            foe,
            foe.maxHp * MAIDEN_PCT_PER_STEP * n + g.f(owner,
                F_MAIDEN),
            "physical",
            {
                tag: "effect"
            })
        g.heal(owner,
            owner,
            owner.maxHp * MAIDEN_HEAL_PER_STEP * n)
    },
})

export default defineHero({
    id: "yorick", name: "Yorick", role: "fighter", damage: "physical", hp: 440, atk: 100, armor: 31, mr: 30,
    bot: {
        tokenValue: 40,
        graveCardValue: 3,
    },
    desc: "Người Chăn Hồn: đánh để lấp mộ chứ không để giết; mộ càng dày, Thiếu Nữ Sương Mù càng đáng sợ và Yorick càng trâu.",
    passive: {
        name: "Người Đào Mộ",
        desc: `Đòn đánh của Yorick (cả nút 66%) chỉ gây ${pct(ATTACK_MULT)}% sát thương, nhưng mỗi đòn vứt ${ATTACK_MILL} lá trên cùng bộ bài của bạn vào mộ.`,
    },
    hooks: {
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id) return
            d.info.mult *= ATTACK_MULT
            g.mill(me.side,
                ATTACK_MILL)
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
            desc: `Gọi Thiếu Nữ vào ô phụ (máu ${MAIDEN_HP} + ${MAIDEN_HP_PER_GRAVE} mỗi lá trong mộ). Đầu mỗi lượt bạn, Thiếu Nữ đánh 1 địch ngẫu nhiên: (${pct(MAIDEN_PCT_PER_STEP)}% máu tối đa của nó mỗi ${GRAVE_STEP} lá trong mộ + {${F_MAIDEN}} của Yorick) sát thương vật lý, và Yorick hồi ${pct(MAIDEN_HEAL_PER_STEP)}% máu tối đa mỗi ${GRAVE_STEP} lá trong mộ.`,
            resolve(c) {
                c.g.summonToken(c.side,
                    {
                        id: MAIDEN, name: "Maiden of the Mist", hp: MAIDEN_HP + MAIDEN_HP_PER_GRAVE * graveSize(c.g,
                            c.side), armor: 0, mr: 0, ownerId: c.self.id, soak: false, role: "fighter",
                    })
            },
        },
    },
})
