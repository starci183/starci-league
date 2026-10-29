// Yorick (Đấu sĩ, vật lý): máu 400 · AD 70 · giáp/kháng 36/32.
// CHẤT: "Mộ càng dày, Yorick càng to". Số lá trong mộ bài của bạn nuôi ATK và máu tối đa của Yorick (nội tại);
// Q Chôn bài chết và rút bù, E nhặt lại chiêu đồng minh (trừ R) từ mộ, R biến độ dày của mộ thành sát thương và hút máu cả lượt.
// Engine: HeroDef.bonusStats (ATK theo mộ), g.setAuraMaxHp (máu theo mộ), g.graveCards/g.fromGrave, SkillDef.extra "discard".
// Đối thủ trả lời: Blitzcrank cướp bài trước khi kịp Chôn, khống chế Yorick, hoặc kết thúc ván trước khi mộ dày.
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
    Card, PlayArgs, Side, Unit
} from "../types"

/** Mỗi lá trong mộ: +1.5 ATK và +8 máu tối đa (tính tối đa 24 lá) */
const ATK_PER_GRAVE = 0.5
const HP_PER_GRAVE = 2
const GRAVE_CAP = 24
/** R: mỗi lá trong mộ = 3 sát thương thêm cho đòn đánh, hút 50% */
const R_PER_GRAVE = 1.5
const R_LIFESTEAL = 0.5
const R_STATUS = "yorick_r"

/** Số lá trong mộ bài của side (đã kẹp trần) */
export const graveSize = (g: Game, side: Side) => Math.min(GRAVE_CAP,
    g.player(side).grave.length)
/** Cập nhật máu tối đa theo mộ (gọi từ mọi hook có thể làm mộ đổi) */
const sync = (g: Game, me: Unit) => g.setAuraMaxHp(me,
    "grave",
    graveSize(g,
        me.side) * HP_PER_GRAVE)
/** Lá chiêu đồng minh (không phải R, không phải Yorick) đang ở mộ, đồng minh còn trên sân */
const reusable = (g: Game, me: Unit): Card[] => g.graveCards(me.side,
    (x) => x.kind === "skill" && !!x.hero && x.hero !== me.hero && !x.id.endsWith("_r") && g.unit(`${me.side}:${x.hero}`)?.status === "board")

export default defineHero({
    id: "yorick", name: "Yorick", role: "fighter", damage: "physical", hp: 300, atk: 60, armor: 36, mr: 32,
    desc: "Người Chăn Hồn: đánh bài nào cũng là nuôi Yorick. Mộ càng dày hắn càng to, R biến cả mộ thành một lượt bùng nổ.",
    passive: {
        name: "Mộ Dày",
        desc: `Yorick +${ATK_PER_GRAVE} AD và +${HP_PER_GRAVE} máu tối đa cho mỗi lá trong mộ bài của bạn (tối đa ${GRAVE_CAP} lá).`,
    },
    bonusStats(g, me) {
        return {
            atk: Math.round(graveSize(g,
                me.side) * ATK_PER_GRAVE)
        }
    },
    hooks: {
        onSummon(g, me, d) { if (d.unit.id === me.id) sync(g,
            me) },
        onRespawn(g, me, d) { if (d.unit.id === me.id) sync(g,
            me) },
        onPlay(g, me) { sync(g,
            me) },
        onCast(g, me) { sync(g,
            me) },
        onDiscard(g, me) { sync(g,
            me) },
        onBurn(g, me) { sync(g,
            me) },
        onDraw(g, me) { sync(g,
            me) },
        onSteal(g, me) { sync(g,
            me) },
        onTurnStart(g, me) { sync(g,
            me) },
        onTurnEnd(g, me) { sync(g,
            me) },
        onAttack(g, me, d) {
            sync(g,
                me)
            if (d.attacker.id !== me.id || !g.has(me,
                R_STATUS)) return
            const extra = graveSize(g,
                me.side) * R_PER_GRAVE
            if (extra > 0) d.info.bonus.push({
                raw: extra, kind: "physical"
            })
        },
        onDamage(g, me, d) {
            sync(g,
                me)
            if (d.src?.id !== me.id || d.tag !== "attack" || d.target.id === me.id || !g.has(me,
                R_STATUS)) return
            g.heal(me,
                me,
                d.amount * R_LIFESTEAL)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Nghi Thức Cuối", target: "none", extra: "discard",
            desc: "Bỏ 1 lá trên tay vào mộ; rồi bạn rút 1 lá.",
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
            },
        },
        E: {
            key: "E", name: "Triệu Hồn Cũ", target: "none",
            desc: "Chọn 1 lá chiêu (không phải R) của đồng minh khác trong mộ bài của bạn; lấy nó về tay.",
            canPlay: (c) => reusable(c.g,
                c.self).length > 0,
            options(c): PlayArgs[] {
                const seen = new Set<string>()
                const out: PlayArgs[] = []
                for (const x of reusable(c.g,
                    c.self)) {
                    if (seen.has(x.id)) continue
                    seen.add(x.id)
                    out.push({
                        pick: x.uid
                    })
                }
                return out
            },
            resolve(c) {
                if (c.args.pick) c.g.fromGrave(c.side,
                    c.args.pick)
            },
        },
        R: {
            key: "R", name: "Bão Hồn Tràn Mộ", target: "none",
            desc: `Tới hết lượt: đòn đánh của Yorick gây thêm ${R_PER_GRAVE} sát thương vật lý cho mỗi lá trong mộ bài của bạn (tối đa ${GRAVE_CAP} lá) và hồi máu Yorick bằng ${pct(R_LIFESTEAL)}% sát thương gây ra.`,
            resolve(c) {
                c.g.status(c.self,
                    R_STATUS,
                    1,
                    {
                        until: c.g.s.turnNo
                    })
            },
        },
    },
})
