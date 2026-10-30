// Braum (Đỡ đòn, phép): máu 485 · AD 64 · AP gốc 0 · giáp/kháng 35/34.
// CHẤT: "Đứng sau tôi": Braum mở giao tranh cho đồng đội và hứng đòn thay họ, càng hứng càng cứng (Song Giáp).
// Nội tại: mỗi đòn đánh trúng Braum +1 Song Giáp (vĩnh viễn, không giới hạn); mỗi Song Giáp +1.5 Giáp và +1.5 Kháng Phép.
// Q: Đấm Băng gây sát thương + Dấu Băng tới hết lượt hiện tại; đồng minh khác đánh trúng thì thử Choáng (1 + 0,1% AD + 0,2% AP đơn vị) + Braum +2 Song Giáp.
// E (Quick): Đỡ Thay + 2 Song Giáp + Khiên. R: toàn bàn địch; tâm Choáng 1 + 0,2% AP đơn vị, mỗi địch còn lại Choáng d theo Máu/Giáp/AP.
// Cơ chế engine dùng: HeroDef.bonusStats (Giáp/Kháng Phép theo Song Giáp), g.addMark + hook onMarkHit (Dấu Băng), hook onAttackHit, g.chainFx().redirect, stack.
// Khống chế theo đơn vị thời gian (law.md §4): ccApply bên dưới (phần lẻ do engine tung trong g.status), dùng chung cho các tướng Đỡ đòn khác.
import {
    defineHero
} from "../registry"
import type {
    Game
} from "../game"
import {
    otherSide, type Unit
} from "../types"

const DUAL = "braum_dual"
const MARK = "braum_mark"
/** Mỗi Song Giáp: bấy nhiêu Giáp và Kháng Phép */
export const DUAL_ARMOR = 1.5
const Q_GAIN = 2
const E_GAIN = 2
export const F_Q = "65 + 50% AD + 40% AP"
export const F_E_SHIELD = "60 + 40% AD + 30% AP"
/** Q: Choáng 1 + 0,1% AD + 0,2% AP đơn vị (theo chỉ số Braum) */
export const Q_STUN = {
    base: 1, ad: 0.001, ap: 0.002
}
/** R tâm: Choáng 1 + 0,2% AP đơn vị */
export const R_MAIN_STUN = {
    base: 1, ap: 0.002
}
/** R phụ: d = 0,25 + 0,015 mỗi 100 Máu tối đa + 0,015 mỗi 10 Giáp + 0,1% AP của Braum */
export const R_BASE = 0.25
export const R_PER_100_HP = 0.015
export const R_PER_10_ARMOR = 0.015
export const R_PER_AP = 0.001

/** Thời hạn d theo chỉ số người tung: base + ad·AD + ap·AP + hp·Máu tối đa + armor·Giáp */
export function ccDuration(g: Game, caster: Unit, o: { base?: number; ad?: number; ap?: number; hp?: number; armor?: number }): number {
    return (o.base ?? 0) + (o.ad ?? 0) * g.atk(caster) + (o.ap ?? 0) * g.ap(caster) + (o.hp ?? 0) * caster.maxHp + (o.armor ?? 0) * g.armor(caster)
}
/**
 * Gắn khống chế `id` (vd "stun") d đơn vị lên u. Một đơn vị = từ Draw của phe người tung tới hết lượt đối thủ;
 * tung trong lượt đối thủ thì phần còn lại của lượt đó là đơn vị đầu. Xét miễn/chặn trước rồi mới roll phần lẻ.
 * Trả số đơn vị đã gắn (0 = không gắn).
 */
export function ccApply(g: Game, caster: Unit, u: Unit | undefined, id: string, d: number, label: string): number {
    if (!u || u.status !== "board" || u.token) return 0
    if (u.side !== caster.side && (g.has(u,
        "stasis") || g.s.immune?.includes(u.id))) return 0
    void label
    if (d <= 0) return 0
    // engine tự tung phần lẻ một lần sau kiểm tra miễn (game.ts status + CC_STATUSES)
    g.status(u,
        id,
        d,
        {
            of: otherSide(caster.side)
        })
    return g.has(u,
        id) ? Math.max(1,
            Math.floor(d)) : 0
}

export default defineHero({
    id: "braum", name: "Braum", role: "tank", damage: "magic", hp: 485, atk: 64, armor: 35, mr: 34,
    bot: {
        stackValue: {
            braum_dual: 25,
        },
    },
    desc: "Tấm khiên của Freljord: mở giao tranh bằng Dấu Băng, hứng đòn thay cả đội, càng bị đánh càng cứng, rồi khoá cả hàng địch.",
    passive: {
        name: "Da Sắt",
        desc: "Mỗi đòn thật của địch trúng Braum cho 1 Song Giáp vĩnh viễn; mỗi cộng dồn tăng 1,5 Giáp và 1,5 Kháng phép. Tính cả hit chí tử và giữ qua chết.",
    },
    bonusStats(g, me) {
        const n = g.stackOf(me,
            DUAL)
        return {
            armor: n * DUAL_ARMOR, mr: n * DUAL_ARMOR
        }
    },
    // Dấu Băng đã đặt vẫn kích khi Braum đã ngã (đồng minh đánh trúng: thử Choáng + Song Giáp giữ qua chết)
    offBoardHooks: ["onMarkHit"],
    hooks: {
        onAttackHit(g, me, d) {
            // bị đánh: +1 Song Giáp
            if (d.target.id === me.id && d.attacker.side !== me.side) g.stack(me,
                DUAL,
                1)
        },
        onMarkHit(g, me, d) {
            if (d.mark.id !== MARK || d.mark.src !== me.id) return
            // chính Braum đánh: giữ nguyên dấu (và hạn gốc) cho đồng đội (engine tiêu 1 nấc cho mọi đòn của phe)
            if (d.attacker.id === me.id) {
                g.addMark(d.target,
                    MARK,
                    me,
                    {
                        hits: 1
                    })
                const m = d.target.marks?.find((x) => x.id === MARK && x.src === me.id)
                if (m) m.until = d.mark.until
                return
            }
            // đồng minh khác Braum đánh trúng: thử Choáng, Braum +2 Song Giáp kể cả khi Choáng bị chặn
            ccApply(g,
                me,
                d.target,
                "stun",
                ccDuration(g,
                    me,
                    Q_STUN),
                "Braum Q Choáng")
            g.stack(me,
                DUAL,
                Q_GAIN)
        },
    },
    skills: {
        Q: {
            key: "Q", mana: 10, name: "Đấm Băng", target: "enemy",
            desc: `Chọn một tướng địch; gây {${F_Q}} sát thương phép, đặt Dấu Băng tới hết lượt hiện tại. Đòn thật của đồng minh khác Braum trúng nó tiêu dấu: thử Choáng 1 + 0,1% AD + 0,2% AP đơn vị và Braum nhận 2 Song Giáp, kể cả khi Choáng bị chặn.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                c.g.addMark(t,
                    MARK,
                    c.self,
                    {
                        hits: 1
                    })
                // Dấu Băng tới hết lượt hiện tại (expireMarks giữ khi until > turnNo, gỡ ở cuối lượt này)
                const m = t.marks?.find((x) => x.id === MARK && x.src === c.self.id)
                if (m) m.until = c.g.s.turnNo
            },
        },
        E: {
            key: "E", mana: 20, name: "Đứng Sau Tôi", target: "none", quick: true, chainOnly: true,
            desc: `Khi địch đánh thường đơn nhắm một tướng đồng minh khác, bạn có thể dùng lá này: Braum lộ diện, Đỡ Thay đòn đó bất kể đường và Khiêu Khích, nhận 2 Song Giáp và {${F_E_SHIELD}} Khiên trắng. Không chuyển vị.`,
            quickWhen(c) {
                const target = c.g.unit(c.trigger.target)
                return c.trigger.side !== c.side && c.trigger.kind === "attack" && !!c.trigger.single
                    && target?.side === c.side && !target.token && target.id !== c.self.id
                    && !!c.trigger.redirectable?.includes(c.self.id)
            },
            resolve(c) {
                c.g.removeStatus(c.self,
                    "stealth") // lộ diện
                if (c.trigger?.target !== c.self.id) c.g.chainFx().redirect = c.self.id
                c.g.stack(c.self,
                    DUAL,
                    E_GAIN)
                c.g.shield(c.self,
                    c.self,
                    c.f(F_E_SHIELD))
            },
        },
        R: {
            key: "R", mana: 35, name: "Băng Phong Ấn", target: "all_enemies",
            desc: "Toàn bàn tướng địch, không chọn tay. Tâm tự lấy địch đối diện hợp lệ, thiếu thì lấy ngẫu nhiên: Choáng 1 + 0,2% AP đơn vị. Những địch còn lại chịu Choáng d = 0,25 + 0,015 mỗi 100 Máu tối đa + 0,015 mỗi 10 Giáp + 0,1% AP của Braum; phần lẻ dùng đúng một lần roll thời lượng.",
            resolve(c) {
                const g = c.g
                const foes = g.heroes(otherSide(c.side))
                const opp = g.opposite(c.self)
                const main = opp && !opp.token && g.targetable(opp) ? opp : g.pick(foes.filter((x) => g.targetable(x)))
                if (main) ccApply(g,
                    c.self,
                    main,
                    "stun",
                    ccDuration(g,
                        c.self,
                        R_MAIN_STUN),
                    `Braum R (tâm ${g.nameOf(main)})`)
                const d = R_BASE + R_PER_100_HP * (c.self.maxHp / 100) + R_PER_10_ARMOR * (g.armor(c.self) / 10) + R_PER_AP * g.ap(c.self)
                for (const t of foes) {
                    if (t.id === main?.id) continue
                    ccApply(g,
                        c.self,
                        t,
                        "stun",
                        d,
                        `Braum R (${g.nameOf(t)})`)
                }
            },
        },
    },
})
