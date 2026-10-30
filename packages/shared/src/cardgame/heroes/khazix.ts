// Kha'Zix (Sát thủ, vật lý): máu 320 · AD 79 · giáp/kháng 27/26 · mana Q15/E20/R35 (bể đội).
// CHẤT: "Săn con mồi bị đánh dấu". Cô Lập là TRẠNG THÁI chỉ Kha'Zix gắn (chủ 30/10: bỏ luật vị trí "không có đồng minh ở đường kề");
// địch đang Cô Lập ăn thêm sát thương từ đòn đánh và Q của Kha'Zix.
// Q săn tướng đối diện. E chọn một con mồi, swap với người giữ ô đối diện nó (đồng minh sống hoặc đã chết), rồi gắn Cô Lập và gây sát thương.
// R tự động: Tàng Hình, Cô Lập địch đối diện hợp lệ (không có thì bỏ phần dấu, không chọn tay/không ngẫu nhiên), nhận 1 lá Q.
// Engine: g.isolated (status "isolated"), hook onAttack (info.bonus), g.giveSkillToHand, status "stealth".
// Đối thủ trả lời: Thanh Tẩy gỡ Cô Lập, Janna Q huỷ đòn, đòn diện rộng (vẫn trúng khi Tàng Hình), Khiêu Khích kéo đòn sang tướng không Cô Lập.
import {
    defineHero
} from "../registry"
import type {
    OptCtx, SkillDef, Unit
} from "../types"
import {
    skillArgs
} from "../engine"

const ISO = "isolated"
export const F_Q = "55 + 200% AD + 20% AP"
export const F_E = "30 + 95% AD + 10% AP"
/** Nội tại: đòn đánh lên tướng Cô Lập */
export const F_ATK = "20 + 80% AD + 10% AP"
/** Nội tại: Q lên tướng Cô Lập */
export const F_Q_ISO = "40 + 145% AD + 15% AP"
export const MANA = {
    Q: 10, E: 20, R: 35
} as const

// Reuse canonical enemy selection, including targetability and global Taunt;
// custom E options only add reachability, never bypass those targeting rules.
const ENEMY_SELECTION: SkillDef = {
    key: "E", name: "", desc: "", target: "enemy", resolve: () => {}
}
const enemyOptions = (c: OptCtx) => skillArgs(c.g,
    c.side,
    c.self,
    c.card,
    ENEMY_SELECTION)
const validPrey = (c: OptCtx, target: Unit | undefined) => !!target && enemyOptions(c).some(args => args.target === target.id)
/** Tới được ô đối diện con mồi: đã đối diện, hoặc Kha'Zix dời sang đường của nó (đường có con mồi nên đã mở)
 *  bằng swap nguyên tử với người giữ ô: đồng minh sống hoặc đã chết chờ hồi sinh. */
const canSwapToPrey = (c: OptCtx, target: Unit) => {
    if (c.g.opposite(c.self)?.id === target.id) return true
    return c.g.canFace(c.self,
        target)
}

export default defineHero({
    id: "khazix", name: "Kha'Zix", role: "assassin", damage: "physical", hp: 320, atk: 79, armor: 27, mr: 26,
    bot: {
        markValue: {
            isolated: 20,
        },
    },
    desc: "Mối Họa Hư Không: đánh dấu con mồi Cô Lập rồi săn nó. Lặn đi rồi nạp thêm một nhát săn.",
    passive: {
        name: "Thú Săn Mồi",
        desc: `Đòn thường thật trúng tướng có Cô Lập (trạng thái do Kha'Zix gắn) cộng {${F_ATK}} sát thương vật lý, không tự chí mạng. Q lên tướng Cô Lập cộng riêng {${F_Q_ISO}} vào sát thương của chính lá Q.`,
    },
    hooks: {
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss || !g.isolated(d.target)) return
            d.info.bonus.push({
                raw: g.f(me,
                    F_ATK), kind: "physical"
            })
        },
    },
    skills: {
        Q: {
            key: "Q", mana: MANA.Q, name: "Nếm Mùi Sợ Hãi", target: "opposite",
            desc: `Đâm tướng địch đối diện đang chọn được, gây {${F_Q}} sát thương vật lý; nếu nó Cô Lập cộng {${F_Q_ISO}}. Không nhân số nhát theo tốc đánh.`,
            options(c) {
                return validPrey(c,
                    c.g.opposite(c.self)) ? [{
                    }] : []
            },
            resolve(c) {
                const t = c.target
                if (!t || !validPrey(c,
                    t) || c.g.opposite(c.self)?.id !== t.id) return
                const extra = c.g.isolated(t) ? c.f(F_Q_ISO) : 0
                c.g.damage(c.self,
                    t,
                    c.f(F_Q) + extra,
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
        E: {
            key: "E", mana: MANA.E, name: "Nhảy Vào Bầy", target: "enemy",
            desc: `Chọn một tướng địch hợp lệ; khác đường thì Kha'Zix swap với đồng minh đang giữ ô đối diện nó (kể cả đồng minh đã chết), đã đối diện thì giữ chỗ. Sau khi xác nhận đã đối diện, mục tiêu Cô Lập tới hết lượt này của bạn và nhận {${F_E}} sát thương vật lý. Mục tiêu/swap không hợp lệ: không đặt dấu, không gây sát thương.`,
            options(c) {
                return enemyOptions(c).filter(args => {
                    const target = c.g.unit(args.target)
                    return !!target && canSwapToPrey(c,
                        target)
                })
            },
            resolve(c) {
                const foe = c.target
                if (!foe || !validPrey(c,
                    foe) || !canSwapToPrey(c,
                    foe)) return
                // swap nguyên tử: Kha'Zix vào ô đối diện con mồi, người giữ ô (sống hoặc đã chết) về ô cũ của Kha'Zix
                if (c.g.opposite(c.self)?.id !== foe.id && !c.g.faceEnemy(c.self,
                    foe)) return
                if (c.g.opposite(c.self)?.id !== foe.id) return
                c.g.status(foe,
                    ISO,
                    1,
                    {
                        of: c.side
                    })
                c.g.damage(c.self,
                    foe,
                    c.f(F_E),
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
        R: {
            key: "R", mana: MANA.R, name: "Lặn Săn", target: "none",
            desc: "Kha'Zix Tàng Hình tới hết lượt kế tiếp của đối thủ và nhận 1 lá Q Kha'Zix. Tự đặt Cô Lập lên tướng địch đối diện hợp lệ tới hết lượt kế tiếp của bạn; không có địch đối diện hợp lệ thì chỉ bỏ phần đặt dấu (không chọn tay, không chọn ngẫu nhiên, không đổi chỗ).",
            resolve(c) {
                const g = c.g
                // Tàng Hình tới hết lượt kế tiếp của đối thủ (đang lượt đối thủ thì tính luôn lượt đó)
                g.stealth(c.self)
                // chỉ địch đối diện hợp lệ (chọn được); không có thì bỏ riêng phần dấu
                const opp = g.opposite(c.self)
                const foe = opp && !opp.token && g.targetable(opp) ? opp : undefined
                // "hết lượt kế tiếp của bạn": đang lượt mình thì là lượt sau (n = 2), đang lượt đối thủ thì là lượt tới (n = 1)
                if (foe) g.status(foe,
                    ISO,
                    1,
                    {
                        until: g.turnsUntil(c.side,
                            g.s.active === c.side ? 2 : 1)
                    })
                g.giveSkillToHand(c.side,
                    "khazix",
                    "Q",
                    "effect")
            },
        },
    },
})
