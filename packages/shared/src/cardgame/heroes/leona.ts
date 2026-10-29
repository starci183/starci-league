// Leona (Đỡ đòn): máu 480 · AD 62 · giáp/kháng 45/35.
// CHẤT: "Mặt trời mọc": gom Nắng lên địch, đủ 3 Nắng là Choáng, đồng đội đánh sau.
// Nội tại: đòn đánh của Leona +1 Nắng lên mục tiêu. Q: 1 địch +2 Nắng. E: lượt này đòn đánh của đồng minh +1 Nắng. R: mọi địch +2 Nắng.
// Leona không gây sát thương bằng chiêu. Cơ chế engine dùng: status "sun" (v = số Nắng, FOREVER), hook onAttackHit, status "stun".
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    FOREVER, type Unit
} from "../types"

const SUN = "sun"
const SUN_E = "leona_e"
const SUN_NEED = 3
/** Nắng Q gắn lên 1 địch, R gắn lên mọi địch */
const Q_SUN = 2
const R_SUN = 2

/** Thêm n Nắng lên t; đủ SUN_NEED thì xoá hết Nắng và Choáng 1 lượt */
function addSun(g: Game, leona: Unit, t: Unit, n: number) {
    if (t.status !== "board" || t.token || t.side === leona.side) return
    g.status(t,
        SUN,
        1,
        {
            v: n, add: true, max: SUN_NEED, until: FOREVER, src: leona.id
        })
    if (g.statusV(t,
        SUN) < SUN_NEED) return
    g.removeStatus(t,
        SUN)
    g.status(t,
        "stun",
        1,
        {
            src: leona.id
        })
}

export default defineHero({
    id: "leona", name: "Leona", role: "tank", damage: "physical", hp: 450, atk: 90, armor: 39, mr: 38,
    bot: {
        markValue: {
            sun: 40,
        },
    },
    desc: "Mặt trời mọc: gom Nắng lên địch, đủ Nắng là Choáng. Leona không gây sát thương bằng chiêu, đồng đội đánh sau.",
    passive: {
        name: "Ánh Dương",
        desc: `Đòn đánh của Leona +1 Nắng lên mục tiêu. Tướng địch đủ ${SUN_NEED} Nắng: Choáng 1 lượt và mất hết Nắng.`,
    },
    hooks: {
        onAttackHit(g, me, d) {
            if (d.attacker.id === me.id) addSun(g,
                me,
                d.target,
                1)
            else if (d.attacker.side === me.side && g.has(me,
                SUN_E)) addSun(g,
                me,
                d.target,
                1)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Khiên Mặt Trời", target: "enemy",
            desc: `Chọn 1 tướng địch; nó +${Q_SUN} Nắng.`,
            resolve(c) {
                addSun(c.g,
                    c.self,
                    c.target!,
                    Q_SUN)
            },
        },
        E: {
            key: "E", name: "Nhật Thực", target: "none",
            desc: "Tới hết lượt này: mỗi đòn đánh của đồng minh khác Leona +1 Nắng lên mục tiêu.",
            resolve(c) {
                c.g.status(c.self,
                    SUN_E,
                    1)
            },
        },
        R: {
            key: "R", name: "Bình Minh", target: "all_enemies",
            desc: `Mọi tướng địch +${R_SUN} Nắng.`,
            resolve(c) {
                for (const t of c.g.enemies(c.self)) addSun(c.g,
                    c.self,
                    t,
                    R_SUN)
            },
        },
    },
})
