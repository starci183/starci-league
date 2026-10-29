// Ahri (Pháp sư, phép) V2: "Say Mê": hồ ly làm địch mê mẩn không ra tay, Mê càng sâu chiêu càng đau.
// Say Mê = status engine "disarm" (v = số stack, decay 1: cuối mỗi lượt của chủ mất 1). Còn Say Mê thì không đánh được.
// Q (20 mana) 1 địch +2 · E (25) sát thương phép, mỗi Say Mê +50% · R (50) mọi địch +2.
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
    Unit
} from "../types"
import {
    FOREVER
} from "../types"

/** Status Say Mê (engine hiểu "disarm" = không đánh được) */
export const CHARM = "disarm"
/** Trần stack Say Mê (cân bằng: tránh khoá vô hạn) */
export const CHARM_MAX = 5
export const E_PER_CHARM = 0.7
const F_E = "50 + 110% AD + 40% AP"

/** Thêm n Say Mê (mất 1 mỗi cuối lượt của chủ) */
export const charm = (g: Game, t: Unit, n: number) => {
    if (t.status !== "board" || t.token) return
    g.status(t,
        CHARM,
        1,
        {
            v: n, add: true, max: CHARM_MAX, until: FOREVER, decay: 1
        })
}
const foes = (g: Game, me: Unit) => g.enemies(me).filter((u) => !u.token)

export default defineHero({
    id: "ahri", name: "Ahri", role: "mage", damage: "magic", hp: 380, atk: 76, armor: 28, mr: 30,
    bot: {
        markValue: {
            disarm: 25,
        },
    },
    desc: "Say Mê: Q khoá một tướng địch, R khoá cả đội, E trút phép lên kẻ đang mê, càng mê sâu càng đau. Địch mê thì không đánh được.",
    passive: {
        name: "Say Mê",
        desc: `Tướng địch còn Say Mê thì không đánh được. Cuối mỗi lượt của nó: mất 1 Say Mê (tối đa ${CHARM_MAX}).`,
    },
    skills: {
        Q: {
            key: "Q", name: "Mị Hoặc", target: "enemy", mana: 10,
            desc: "Chọn 1 tướng địch; +2 Say Mê.",
            resolve(c) {
                charm(c.g,
                    c.target!,
                    2)
            },
        },
        E: {
            key: "E", name: "Hôn Gió", target: "enemy", mana: 20,
            desc: `Chọn 1 tướng địch; gây {${F_E}} sát thương phép, cộng ${pct(E_PER_CHARM)}% cho mỗi Say Mê trên nó.`,
            resolve(c) {
                const t = c.target!
                const n = c.g.statusV(t,
                    CHARM)
                c.g.damage(c.self,
                    t,
                    c.f(F_E) * (1 + E_PER_CHARM * n),
                    "magic",
                    {
                        tag: "skill"
                    })
            },
        },
        R: {
            key: "R", name: "Vũ Điệu Hồ Ly", target: "all_enemies", mana: 50,
            desc: "Mọi tướng địch +2 Say Mê.",
            resolve(c) {
                for (const t of foes(c.g,
                    c.self)) charm(c.g,
                    t,
                    2)
            },
        },
    },
})
