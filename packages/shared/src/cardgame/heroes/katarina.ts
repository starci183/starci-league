// Katarina (Sát thủ, phép): máu 320 · AD 115 · AP gốc 82 · giáp/kháng 26/28.
// CHẤT: "Hạ một là làm lại". Địch chết trong lượt mà Katarina đã chạm vào (ai hạ cũng được): mọi lá Katarina đã dùng lượt này về tay.
// Q mở chuỗi và gắn Dao, E (Quick) né đòn và phạt kẻ ra tay (×2 lên tướng có Dao), R dọn bàn (tướng có Dao nhận thêm).
// Engine: hook onDamage/onDeath/onCast, card.data.usedTurn (lá Katarina đã dùng), ctx.toHand (lá đang giải quyết), g.fromGrave, g.chainFx().cancel.
// Đối thủ trả lời: Renata (hồi sinh làm hụt), Soraka (chịu thay đòn chí mạng), Khiên, Choáng/Câm Lặng Katarina trước khi mở chuỗi.
import {
    pct
} from "../formula"
import {
    defineHero
} from "../registry"
import type {
    Ctx
} from "../types"
import {
    otherSide
} from "../types"

/** Dao: trạng thái trên tướng địch (Q gắn), 2 lượt của tướng mang */
const DAGGER = "kat_dagger"
/** Cờ kỹ thuật (ẩn trên UI, tiền tố "once:"): lượt (turnNo) Katarina chạm địch này lần cuối */
const TOUCH = "once:kat_touch:"
/** Cờ kỹ thuật: tổng số địch chết sau khi Katarina đã chạm (để lá đang giải quyết biết có hạ được không) */
const KILLS = "once:kat_kills"
export const F_Q = "45 + 30% AD + 60% AP"
export const F_E = "25 + 20% AD + 40% AP"
export const F_R = "40 + 25% AD + 55% AP"
const BASE_AP = 82
/** E gấp đôi lên tướng có Dao */
const E_DAGGER_MULT = 2
/** R: tướng có Dao nhận thêm bấy nhiêu */
const R_DAGGER_BONUS = 0.6

/** Chạy lá chiêu; nếu trong lúc đó có địch chết theo nội tại thì chính lá này cũng về tay thay vì vào mộ */
function recallIfKill(c: Ctx, run: () => void) {
    const before = c.g.stackOf(c.self,
        KILLS)
    run()
    if (c.g.stackOf(c.self,
        KILLS) > before) c.toHand()
}

export default defineHero({
    id: "katarina", name: "Katarina", role: "assassin", damage: "magic", hp: 320, atk: 115, ap: BASE_AP, armor: 26, mr: 28,
    bot: {
        markValue: {
            kat_dagger: 25,
        },
        graveCardValue: 6,
    },
    desc: "Lưỡi Kiếm Bất Dung Tha: gắn Dao, né đòn rồi phạt kẻ ra tay, dọn cả bàn; hạ được một tướng là cả kho lá quay về tay.",
    passive: {
        name: "Tham Lam",
        desc: "Khi 1 tướng địch chết trong lượt mà Katarina đã gây sát thương lên nó (ai hạ cũng được): mọi lá Katarina đã dùng lượt này quay về tay.",
    },
    hooks: {
        onDamage(g, me, d) {
            if (d.src?.id !== me.id || d.target.side === me.side || d.target.token) return
            g.setStack(me,
                TOUCH + d.target.id,
                g.s.turnNo)
        },
        onCast(g, me, d) {
            if (d.caster.id !== me.id) return
            d.card.data = {
                ...d.card.data, usedTurn: g.s.turnNo
            }
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
            key: "Q", name: "Phi Dao", target: "enemy",
            desc: `Chọn 1 tướng địch; gây {${F_Q}} sát thương phép và gắn Dao.`,
            resolve(c) {
                const t = c.target!
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
                            2)
                    })
            },
        },
        E: {
            key: "E", name: "Thuấn Bộ", target: "none", quick: true, chainOnly: true,
            desc: `Quick, Chỉ Nối Chuỗi. Khi địch đánh Katarina: Katarina né (đòn trượt) và kẻ đánh nhận {${F_E}} sát thương phép, gấp đôi nếu nó có Dao.`,
            quickWhen: (c) => c.trigger.side !== c.side && c.trigger.target === c.self.id && (!c.trigger.card || c.trigger.card.id === "basic"),
            resolve(c) {
                const foe = c.g.unit(c.trigger?.actor)
                c.g.chainFx().cancel = true
                if (!foe || foe.status !== "board" || foe.side === c.side) return
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
            key: "R", name: "Bông Sen Tử Thần", target: "all_enemies",
            desc: `Mọi tướng địch nhận {${F_R}} sát thương phép; tướng có Dao nhận thêm ${pct(R_DAGGER_BONUS)}%.`,
            resolve(c) {
                recallIfKill(c,
                    () => {
                        for (const t of c.g.heroes(otherSide(c.side))) {
                            c.g.damage(c.self,
                                t,
                                c.f(F_R) * (c.g.has(t,
                                    DAGGER) ? 1 + R_DAGGER_BONUS : 1),
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
