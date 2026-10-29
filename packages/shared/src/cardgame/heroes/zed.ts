// Zed (Sát thủ, vật lý): máu 820 · AD 84 · giáp/kháng 30/28. Lối chơi: MỘT LƯỢT DỒN CHẾT.
// Bóng = lá special (copyOf) nhân bản lá Zed trong mộ; Dấu Ấn tích sát thương rồi nổ 50% cuối lượt đối thủ.
import {
    defineHero, defineSpecialCard
} from "../registry"
import type {
    Card
} from "../types"
import {
    otherSide
} from "../types"

const F_Q = "40 + 60% AD + 20% AP"
const Q_MARK_BONUS = 0.4
const EXECUTE_PCT = 0.08
const MARK = "zedmark"
const BURST = 0.5

defineSpecialCard({
    id: "shadow", name: "Bóng", desc: "Bản sao một lá Zed trong mộ: tung đúng chiêu đó rồi biến mất. Hết lượt mà chưa dùng cũng biến mất."
})

const isZed = (c: Card) => c.kind === "skill" && c.hero === "zed"

export default defineHero({
    id: "zed", name: "Zed", role: "assassin", damage: "physical", hp: 820, atk: 84, armor: 30, mr: 28,
    desc: "Chủ nhân Bóng Tối: tích bài, rồi một lượt nhân bản chiêu bằng Bóng, dồn hết vào một mục tiêu.",
    passive: {
        name: "Khinh Thường Kẻ Yếu",
        desc: `Đòn đánh của Zed lên mục tiêu dưới 50% máu gây thêm ${EXECUTE_PCT * 100}% máu tối đa của nó.`,
    },
    hooks: {
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id || d.target.hp / d.target.maxHp >= 0.5) return
            d.info.bonus.push({
                raw: d.target.maxHp * EXECUTE_PCT, kind: "physical"
            })
        },
        // cộng dồn sát thương Zed gây lên mục tiêu đang bị Dấu Ấn
        onDamage(g, me, d) {
            if (d.src?.id !== me.id || (d.tag !== "attack" && d.tag !== "skill") || !g.has(d.target,
                MARK)) return
            g.stack(me,
                `dmg:${d.target.id}`,
                d.amount)
        },
        // cuối lượt đối thủ: dấu nổ
        onTurnEnd(g, me, d) {
            if (d.side === me.side) return
            for (const t of g.enemies(me)) {
                if (!g.has(t,
                    MARK)) continue
                const dmg = Math.round(g.stackOf(me,
                    `dmg:${t.id}`) * BURST)
                g.setStack(me,
                    `dmg:${t.id}`,
                    0)
                g.removeStatus(t,
                    MARK)
                if (dmg > 0) g.damage(me,
                    t,
                    dmg,
                    "true",
                    {
                        tag: "effect"
                    })
                if (t.status === "dead") {
                    // hạ gục: lá R đánh dấu quay về tay
                    const uid = `c${g.stackOf(me,
                        `markCard:${t.id}`)}`
                    const gr = g.player(me.side).grave
                    const i = gr.findIndex((x) => x.uid === uid)
                    if (i >= 0) { const [card] = gr.splice(i,
                        1); g.emit({
                        t: "returnToHand", side: me.side, card
                    }); g.giveCard(me.side,
                        card,
                        "hand") }
                }
            }
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Phi Tiêu Sắc Lẻm", target: "enemy",
            desc: `{${F_Q}} sát thương vật lý lên 1 tướng địch. **Điều kiện:** mục tiêu đang bị Dấu Ấn (R) thì thêm ${Q_MARK_BONUS * 100}% sát thương.`,
            resolve(c) {
                const t = c.target!
                const m = c.g.has(t,
                    MARK) ? 1 + Q_MARK_BONUS : 1
                c.g.damage(c.self,
                    t,
                    c.f(F_Q) * m,
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
        E: {
            key: "E", name: "Phân Thân Bóng Tối", target: "lane",
            desc: "Zed chuyển sang một đường bất kỳ (đổi chỗ với tướng mình nếu có), rồi tạo 1 lá Bóng lên tay: bản sao lá Zed vào mộ gần nhất (không sao chép E). Bóng biến mất cuối lượt nếu không dùng. **Điều kiện:** trong mộ có từ 3 lá Zed thì tạo 2 lá Bóng (sao chép 2 lá gần nhất).",
            options(c) {
                // chỉ đáng đứng đường đang có địch đối diện (nếu không có thì ở nguyên chỗ)
                const foes = c.g.openLanes().filter((l) => c.g.at(otherSide(c.side),
                    l)?.status === "board")
                return (foes.length ? foes : [c.self.lane]).map((lane) => ({
                    lane
                }))
            },
            resolve(c) {
                if (c.lane !== undefined) c.g.moveTo(c.self,
                    c.lane)
                const grave = c.g.player(c.side).grave
                const copyable = grave.filter((x) => isZed(x) && !x.id.endsWith("_e"))
                const n = grave.filter(isZed).length >= 3 ? 2 : 1
                for (let i = 0; i < n; i++) {
                    const src = copyable[copyable.length - 1 - i]
                    if (!src) break
                    c.g.createCard(c.side,
                        {
                            kind: "special", id: "shadow", hero: "zed", side: c.side, copyOf: src.id, temp: true
                        },
                        "hand")
                }
            },
        },
        R: {
            key: "R", name: "Dấu Ấn Tử Thần", target: "enemy",
            desc: `Đánh dấu 1 tướng địch. Cuối lượt đối thủ, dấu nổ gây ${BURST * 100}% tổng sát thương Zed đã gây lên nó từ lúc đánh dấu (sát thương chuẩn). **Điều kiện:** dấu nổ hạ gục thì lá R này quay về tay.`,
            resolve(c) {
                const t = c.target!
                c.g.status(t,
                    MARK,
                    1)
                c.g.setStack(c.self,
                    `dmg:${t.id}`,
                    0)
                c.g.setStack(c.self,
                    `markCard:${t.id}`,
                    Number(c.card.uid.slice(1)) || 0)
            },
        },
    },
})
