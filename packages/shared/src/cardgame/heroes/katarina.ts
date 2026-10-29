// Katarina (Sát thủ, phép): máu 360 · AD 76 · giáp/kháng 30/30.
// CHẤT: "Hạ một là làm lại". Lá Katarina nào hạ gục được địch thì quay về tay thay vì vào mộ.
// Q mở (sát thương lớn), E kết (gấp đôi lên con dưới 50% máu), R dọn cả bàn và nhặt lá Katarina trong mộ về tay cho mỗi tướng hạ.
// Engine: SkillCtx.toHand(), grave (g.lastGrave / g.fromGrave). Chuỗi tự giới hạn bằng số địch còn sống.
// Đối thủ trả lời: Renata (hồi sinh: hạ hụt, lá không về), Soraka (chịu thay sát thương chí mạng), Khiên, hồi máu vượt ngưỡng 50%.
import {
    pct
} from "../formula"
import {
    defineHero
} from "../registry"
import type {
    Ctx, Unit
} from "../types"
import {
    otherSide
} from "../types"

const F_Q = "45 + 90% AD"
const F_E = "25 + 60% AD"
const F_R = "40 + 80% AD"
/** E gấp đôi lên tướng dưới ngưỡng máu này */
const EXEC_PCT = 0.5
const E_MULT = 2

/** Lá Katarina nào hạ gục được thì quay về tay (nội tại) */
const recall = (c: Ctx, t: Unit) => { if (t.status !== "board") c.toHand() }

export default defineHero({
    id: "katarina", name: "Katarina", role: "assassin", damage: "magic", hp: 300, atk: 82, armor: 30, mr: 30,
    bot: {
        graveCardValue: 6,
    },
    desc: "Lưỡi Kiếm Bất Dung Tha: hạ một tướng thì lá chiêu quay về tay để hạ tiếp, dọn cả bàn rồi nhặt lại kho lá.",
    passive: {
        name: "Tham Lam",
        desc: "Lá Katarina hạ gục được 1 tướng địch: quay về tay thay vì vào mộ.",
    },
    skills: {
        Q: {
            key: "Q", name: "Dao Găm Nảy", target: "enemy",
            desc: `Chọn 1 tướng địch; gây {${F_Q}} sát thương phép.`,
            resolve(c) {
                const t = c.target!
                c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                recall(c,
                    t)
            },
        },
        E: {
            key: "E", name: "Thuấn Bộ", target: "enemy",
            desc: `Chọn 1 tướng địch; gây {${F_E}} sát thương phép, gấp đôi nếu nó dưới ${pct(EXEC_PCT)}% máu.`,
            resolve(c) {
                const t = c.target!
                const low = c.g.hpPct(t) < EXEC_PCT
                c.g.damage(c.self,
                    t,
                    c.f(F_E) * (low ? E_MULT : 1),
                    "magic",
                    {
                        tag: "skill"
                    })
                recall(c,
                    t)
            },
        },
        R: {
            key: "R", name: "Tử Thần Vũ Điệu", target: "all_enemies",
            desc: `Gây {${F_R}} sát thương phép lên mọi tướng địch. Mỗi tướng địch bị hạ: lấy về tay 1 lá Katarina gần nhất trong mộ bài.`,
            resolve(c) {
                let kills = 0
                for (const t of c.g.heroes(otherSide(c.side))) {
                    if (c.g.s.phase === "over") break
                    c.g.damage(c.self,
                        t,
                        c.f(F_R),
                        "magic",
                        {
                            tag: "skill"
                        })
                    if (t.status === "board") continue
                    kills++
                    const card = c.g.lastGrave(c.side,
                        (x) => x.kind === "skill" && x.hero === "katarina")
                    if (card) c.g.fromGrave(c.side,
                        card.uid)
                }
                if (kills > 0) c.toHand()
            },
        },
    },
})
