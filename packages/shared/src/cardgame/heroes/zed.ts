// Zed (Sát thủ, vật lý): máu 380 · AD 88 · giáp/kháng 32/28.
// CHẤT: "Dồn". Mỗi đòn Zed trúng địch (đánh thường hoặc chiêu) chồng thêm 1 Dồn lên nó; Dồn ở lại tới khi Zed dùng R lên nó.
// Q nạp Dồn, E bật lượt dồn chính (mọi đòn chí mạng), R kích nổ: mỗi Dồn gây sát thương lớn, đủ ngưỡng thì Kết Liễu.
// Engine: status "zed_stack" (until FOREVER, v = số Dồn) gắn bằng hook onAttackHit / onCast; status chung "alwaysCrit".
// Đối thủ trả lời: hồi sinh/Khiên chặn Kết Liễu (Renata), Choáng Zed trước R, giữ Zed không đánh được (Mê/disarm), Janna Q huỷ đòn.
import {
    defineHero
} from "../registry"
import type {
    Ctx, Unit
} from "../types"
import {
    FOREVER, RULES
} from "../types"
import type {
    Game
} from "../game"

const STACK = "zed_stack"
const CRIT = "alwaysCrit"
/** Dồn tối đa trên 1 tướng */
const MAX_STACK = 8
/** Từ ngần này Dồn trở lên, R Kết Liễu thay vì gây sát thương */
const EXECUTE_AT = 6
const F_Q = "80 + 160% AD"
const F_STACK = "36 + 60% AD"

/** +1 Dồn lên tướng địch còn sống (không tính vật triệu hồi) */
function addStack(g: Game, me: Unit, t: Unit | undefined) {
    if (!t || t.token || t.status !== "board" || t.side === me.side) return
    g.status(t,
        STACK,
        1,
        {
            v: 1, add: true, max: MAX_STACK, until: FOREVER
        })
}
/** Tướng địch R chọn được: đang có Dồn, không Tàng Hình, tuân theo Khiêu Khích */
function stackedFoes(g: Game, self: Unit): Unit[] {
    const foes = g.enemies(self).filter((u) => !u.token && g.has(u,
        STACK) && !g.has(u,
        "stealth"))
    return g.enemies(self).some((u) => g.has(u,
        "taunt")) ? foes.filter((u) => g.has(u,
            "taunt")) : foes
}
/** Kết liễu: sát thương chuẩn đủ lớn để hạ (vẫn đi qua hook onLethal như Cứu Trợ của Renata) */
function execute(c: Ctx, t: Unit) {
    c.g.log(`Zed executes ${t.id}`)
    c.g.damage(c.self,
        t,
        (t.hp + t.shield) * 3 + 50,
        "true",
        {
            tag: "skill"
        })
}

export default defineHero({
    id: "zed", name: "Zed", role: "assassin", damage: "physical", hp: 350, atk: 90, armor: 32, mr: 28,
    bot: {
        markValue: {
            zed_stack: 28,
        },
    },
    desc: "Chủ nhân Bóng Tối: dồn một mục tiêu bằng từng đòn, bật lượt chí mạng rồi kích nổ.",
    passive: {
        name: "Bóng Dồn",
        desc: `Mỗi đòn đánh thường hoặc chiêu của Zed trúng 1 tướng địch: nó +1 Dồn (tối đa ${MAX_STACK}). Dồn ở lại tới khi Zed dùng R lên nó.`,
    },
    hooks: {
        onAttackHit(g, me, d) {
            if (d.attacker.id === me.id) addStack(g,
                me,
                d.target)
        },
        onCast(g, me, d) {
            if (d.caster.id === me.id && d.skill.key !== "R") addStack(g,
                me,
                d.target)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Phi Tiêu Sắc Lẻm", target: "opposite",
            desc: `Chọn tướng địch đối diện Zed; gây {${F_Q}} sát thương vật lý.`,
            resolve(c) {
                const crit = c.g.statusV(c.self,
                    CRIT) > 0
                const mult = crit ? RULES.critBase + c.g.stats(c.self).critDmg : 1
                c.g.damage(c.self,
                    c.target!,
                    c.f(F_Q) * mult,
                    "physical",
                    {
                        tag: "skill", crit
                    })
            },
        },
        E: {
            key: "E", name: "Lưỡi Dao Bóng Tối", target: "self",
            desc: "Tới hết lượt này, mọi đòn đánh thường và chiêu của Zed chí mạng.",
            resolve(c) {
                c.g.status(c.self,
                    CRIT,
                    1)
            },
        },
        R: {
            key: "R", name: "Dấu Ấn Tử Thần", target: "enemy",
            desc: `Chọn 1 tướng địch đang có Dồn; gây {${F_STACK}} sát thương vật lý cho mỗi Dồn trên nó rồi gỡ hết Dồn. Nếu nó có từ ${EXECUTE_AT} Dồn: Kết Liễu nó thay vì gây sát thương.`,
            canPlay: (c) => stackedFoes(c.g,
                c.self).length > 0,
            options: (c) => stackedFoes(c.g,
                c.self).map((u) => ({
                target: u.id
            })),
            resolve(c) {
                const t = c.target!
                const n = c.g.statusV(t,
                    STACK)
                c.g.removeStatus(t,
                    STACK)
                if (n >= EXECUTE_AT) execute(c,
                    t)
                else if (n > 0) c.g.damage(c.self,
                    t,
                    n * c.f(F_STACK),
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
    },
})
