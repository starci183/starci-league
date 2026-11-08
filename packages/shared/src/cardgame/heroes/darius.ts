// Darius (Đấu sĩ, vật lý). Bộ chiêu chốt 31/10 – 01/11/2026, số liệu ở balance/heroes/darius.json (docs/heroes/KITS.md).
// CHẤT: "Xay một thằng". Mỗi đòn trúng cắm 1 Chảy Máu (carrier stack trên địch, mất một nửa khi nó chết); Q, E cắm thêm và đốt dấu thành sát thương;
// R đổi chỗ sang đối diện kẻ có dấu, tiêu hết dấu thành sát thương chuẩn: hạ được thì lá về tay ngay, không hạ thì về sau r4 đơn vị.
// Chảy Máu = stack "bleed" trên tướng mang + trạng thái song song "bleed_t" (v = số tầng) làm đồng hồ p3 đơn vị kể từ lần cộng cuối.
import {
    kit
} from "../balance"
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
    PlayArgs, Unit
} from "../types"
import {
    otherSide
} from "../types"

const k = kit("darius"), { p } = k
export const BLEED = "bleed"
export const BLEED_TIMER = "bleed_t"
export const R_RETURN = "r_return"
export const F_TICK = k.x("p1 + p2·AD"), EN_TICK = k.xe("p1 + p2·AD")
export const F_Q = k.x("q1 + q2·AD + q3·Máu tối đa"), EN_Q = k.xe("q1 + q2·AD + q3·Máu tối đa")
export const F_E = k.x("e1 + e2·AD"), EN_E = k.xe("e1 + e2·AD")
export const F_R = k.x("r1 + r2·AD"), EN_R = k.xe("r1 + r2·AD")

/** Số Chảy Máu hiệu lực trên `t` (stack chỉ có nghĩa khi đồng hồ còn) */
export const bleedOf = (g: Game, t: Unit) => (g.has(t,
    BLEED_TIMER) ? g.stackOf(t,
        BLEED) : 0)

/** Cộng `n` Chảy Máu lên `t`, làm mới đồng hồ p3 đơn vị từ lần cộng cuối */
function addBleed(g: Game, me: Unit, t: Unit, n: number) {
    if (n <= 0 || t.status !== "board" || t.token || t.side === me.side) return
    const total = (g.has(t,
        BLEED_TIMER) ? g.stackOf(t,
            BLEED) : 0) + n
    g.setStack(t,
        BLEED,
        total)
    g.timed(me,
        t,
        BLEED_TIMER,
        p.p3,
        {
            v: total
        })
}
function clearBleed(g: Game, t: Unit) {
    g.removeStatus(t,
        BLEED_TIMER)
    if (g.stackOf(t,
        BLEED)) g.setStack(t,
        BLEED,
        0)
}

export default defineHero({
    id: "darius", name: "Darius", role: "fighter", damage: "physical", ...k.base,
    carrierStacks: [BLEED],
    bot: k.bot,
    // Chảy Máu trên địch vẫn chạy khi Darius đã chết (hiệu ứng đã đặt)
    offBoardHooks: ["onTurnStart",
        "onTurnEnd",
        "onRespawn"],
    desc: "Đao phủ Noxus: mỗi đòn đánh cắm thêm Chảy Máu, Q và E đốt dấu thành sát thương, Máy Chém xả hết dấu thành sát thương chuẩn rồi quay về tay.",
    passive: {
        name: "Xuất Huyết",
        desc: `Đòn trúng cho 1 Chảy Máu, cộng dồn không giới hạn. Đầu lượt của tướng mang, mỗi tầng gây {${F_TICK}} sát thương vật lý. Chảy Máu hết sau ${p.p3} đơn vị kể từ lần cộng cuối. Tướng mang chết thì mất một nửa.`,
    },
    en: {
        desc: "Noxian executioner: every hit adds Bleed, Q and E cash the marks in as damage, Guillotine burns all marks as true damage and returns to hand.",
        passive: {
            name: "Hemorrhage",
            desc: `A hit adds 1 Bleed, stacking without limit. At the start of the carrier's turn, each stack deals {${EN_TICK}} physical damage. Bleed expires ${p.p3} units after the last one was added. When the carrier dies it loses half.`,
        },
        skills: {
            Q: {
                name: "Decimate",
                desc: `The opposite enemy takes {${EN_Q}} + ${p.q6} per Bleed physical damage and gains ${p.q4} Bleed. Darius heals ${p.q5} per Bleed on it.`,
            },
            E: {
                name: "Apprehend",
                desc: `Choose 1 enemy in another lane; it swaps with the enemy opposite Darius. It then takes {${EN_E}} + ${p.e4} per Bleed physical damage and gains ${p.e3} Bleed.`,
            },
            R: {
                name: "Noxian Guillotine",
                desc: `Choose 1 enemy with Bleed in any lane; Darius swaps to face it. It takes {${EN_R}} + ${p.r3} per Bleed true damage and loses all Bleed. If it is taken down, this card returns to hand at once; otherwise it returns after ${p.r4} units.`,
            },
        },
    },
    hooks: {
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss || d.target.side === me.side || d.target.token) return
            addBleed(g,
                me,
                d.target,
                1)
        },
        onTurnStart(g, me, d) {
            if (d.side === me.side) return
            for (const t of g.heroes(d.side)) {
                const n = bleedOf(g,
                    t)
                if (n > 0) g.damage(me,
                    t,
                    n * g.f(me,
                        F_TICK),
                    "physical",
                    {
                        tag: "dot", visuals: ["bleedTick"]
                    })
            }
        },
        onTurnEnd(g, me) {
            // đồng hồ hết hạn cuối lượt này (engine gỡ trạng thái ngay sau hook): xoá luôn dấu
            for (const t of g.heroes(otherSide(me.side))) {
                const st = t.statuses[BLEED_TIMER]
                if (g.stackOf(t,
                    BLEED) > 0 && (!st || st.until <= g.s.turnNo)) g.setStack(t,
                    BLEED,
                    0)
            }
        },
        onRespawn(g, me, d) {
            // dấu còn lại sau khi chết (đã mất một nửa) chạy lại đồng hồ khi nó hồi sinh
            const t = d.unit
            if (t.side === me.side || !g.stackOf(t,
                BLEED)) return
            g.timed(me,
                t,
                BLEED_TIMER,
                p.p3,
                {
                    v: g.stackOf(t,
                        BLEED)
                })
        },
        onDelayed(g, me, d) {
            if (d.key !== R_RETURN) return
            const left = Number(d.data?.left ?? 0) - 1
            if (left > 0) { g.delay(me,
                R_RETURN,
                "turnStart",
                me.side,
                {
                    left
                },
                {
                    surviveOwnerDeath: true
                }); return }
            const card = g.skillCard("darius",
                me.side,
                "R")
            g.emit({
                t: "returnToHand", side: me.side, card
            })
            g.giveCard(me.side,
                card,
                "hand")
        },
    },
    skills: {
        Q: {
            key: "Q", mana: p.q0, name: "Tàn Sát", target: "opposite",
            desc: `Gây {${F_Q}} + ${p.q6} mỗi Chảy Máu sát thương vật lý lên tướng đối diện, gắn ${p.q4} Chảy Máu. Darius hồi ${p.q5} Máu mỗi Chảy Máu trên nó.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q) + p.q6 * bleedOf(c.g,
                        t),
                    "physical",
                    {
                        tag: "skill"
                    })
                addBleed(c.g,
                    c.self,
                    t,
                    p.q4)
                c.g.heal(c.self,
                    c.self,
                    p.q5 * bleedOf(c.g,
                        t))
            },
        },
        E: {
            key: "E", mana: p.e0, name: "Bắt Giữ", target: "enemy",
            desc: `Chọn 1 địch ở đường khác; hoán đổi nó với địch đối diện Darius. Nó nhận {${F_E}} + ${p.e4} mỗi Chảy Máu sát thương vật lý và ${p.e3} Chảy Máu.`,
            options: (c) => skillArgs(c.g,
                c.side,
                c.self,
                c.card,
                {
                    key: "E", name: "", desc: "", target: "enemy", resolve() {}
                })
                .filter((a: PlayArgs) => { const t = c.g.unit(a.target); return !!t && !t.token && t.lane !== c.self.lane }),
            resolve(c) {
                const t = c.target!
                if (t.side === c.side || t.lane === c.self.lane || !c.g.moveTo(t,
                    c.self.lane)) return
                if (c.g.opposite(c.self)?.id !== t.id) return
                c.g.damage(c.self,
                    t,
                    c.f(F_E) + p.e4 * bleedOf(c.g,
                        t),
                    "physical",
                    {
                        tag: "skill"
                    })
                addBleed(c.g,
                    c.self,
                    t,
                    p.e3)
            },
        },
        R: {
            key: "R", mana: p.r0, name: "Máy Chém Noxus", target: "enemy",
            desc: `Chọn 1 địch có Chảy Máu ở đường bất kỳ; Darius đổi chỗ sang đối diện nó. Nó nhận {${F_R}} + ${p.r3} mỗi Chảy Máu sát thương chuẩn và mất hết Chảy Máu. Hạ được: lá về tay ngay. Không hạ: lá về tay sau ${p.r4} đơn vị.`,
            options: (c) => skillArgs(c.g,
                c.side,
                c.self,
                c.card,
                {
                    key: "R", name: "", desc: "", target: "enemy", resolve() {}
                })
                .filter((a: PlayArgs) => { const t = c.g.unit(a.target); return !!t && !t.token && bleedOf(c.g,
                    t) > 0 && (t.lane === c.self.lane || c.g.canFace(c.self,
                    t)) }),
            resolve(c) {
                const t = c.target!
                const n = bleedOf(c.g,
                    t)
                if (t.side === c.side || n <= 0) return
                if (t.lane !== c.self.lane && !c.g.faceEnemy(c.self,
                    t)) return
                clearBleed(c.g,
                    t)
                const before = c.g.events.length
                c.g.damage(c.self,
                    t,
                    c.f(F_R) + p.r3 * n,
                    "true",
                    {
                        tag: "skill"
                    })
                const killed = c.g.events.slice(before).some((e) => e.t === "kill" && e.target === t.id && e.src === c.self.id)
                if (killed) c.toHand()
                else {
                    c.vanish()
                    if (!c.card.data?.recycled) c.g.delay(c.self, // Chiêu Đoạt của Sylas dùng xong biến mất, không về tay
                        R_RETURN,
                        "turnStart",
                        c.side,
                        {
                            left: p.r4
                        },
                        {
                            surviveOwnerDeath: true
                        })
                }
            },
        },
    },
})
