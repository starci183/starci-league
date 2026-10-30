// Vel'Koz (Pháp sư, phép) V3: máu 330 · AD 60 · giáp/kháng 25/28 · AP gốc 0.
// CHẤT: "Phân rã". Mỗi tia chiêu gốc trúng tướng địch +1 Phân Rã; đủ 3 tiêu đúng 3 và nổ sát thương chuẩn (không chí mạng, không tự sinh dấu).
// Phân Rã = stack "velkoz_decay" trên địch. Trúng không đòi mất Máu/Khiên (miễn riêng sát thương/Guard vẫn tính), miễn toàn lá/trượt thì không tích.
// Mục tiêu chết: Phân Rã về 0 (hook onDeath khi Vel'Koz trên sân; thêm khoá theo số lần chết của mục tiêu để dấu cũ không sống lại khi Vel'Koz vắng mặt).
// Mana bể chung (starci-33 tuning v1, giữ nguồn): Q 20 (1 chính + 1 phụ ngẫu nhiên) · E 30 (hai nhịp, nhịp hai cuối lượt hiện tại) · R 60 (6 tia vào 1 mục tiêu chọn).
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    Unit
} from "../types"

export const DECAY = "velkoz_decay"
/** Khoá ẩn: số lần chết của mục tiêu lúc Phân Rã được ghi (dấu cũ trước khi chết không còn hiệu lực) */
const DECAY_LIFE = "aura:velkoz_decay_life"
/** Đủ bấy nhiêu Phân Rã thì rã */
export const DECAY_MAX = 3
/** Số tia của R */
export const RAYS = 6
/** Số tia phụ của Q */
export const Q_SIDE_TARGETS = 1
export const F_DECAY = "60 + 10% AD + 40% AP + 5% máu tối đa mục tiêu"
export const F_Q_MAIN = "135 + 20% AD + 130% AP + 4% máu đã mất mục tiêu"
export const F_Q_SIDE = "70 + 9% AD + 65% AP + 2% máu đã mất mục tiêu"
export const F_E = "60 + 9% AD + 40% AP + 4% máu đã mất mục tiêu"
/** Phần E không phụ thuộc mục tiêu: chụp lúc E giải quyết, dùng cho cả nhịp trễ */
const F_E_BASE = "70 + 10% AD + 50% AP"
/** Phần E theo máu đã mất mục tiêu, tính lại ngay trước mỗi nhịp */
const E_MISSING = 0.04
export const F_R = "25 + 4% AD + 10% AP + 3% máu đã mất mục tiêu"

/** Phân Rã hiện có trên t (bỏ dấu cũ ghi trước lần chết gần nhất) */
export function decayOf(g: Game, t: Unit): number {
    if ((t.stacks[DECAY_LIFE] ?? t.deaths) !== t.deaths) return 0
    return g.stackOf(t,
        DECAY)
}

/** +1 Phân Rã lên t; đủ DECAY_MAX thì tiêu đúng DECAY_MAX và nổ sát thương chuẩn */
function addDecay(g: Game, me: Unit, t: Unit) {
    if (t.token || t.status !== "board") return
    if ((t.stacks[DECAY_LIFE] ?? t.deaths) !== t.deaths) g.setStack(t,
        DECAY,
        0)
    t.stacks[DECAY_LIFE] = t.deaths
    const n = g.stack(t,
        DECAY,
        1)
    if (n < DECAY_MAX) return
    g.setStack(t,
        DECAY,
        n - DECAY_MAX)
    g.damage(me,
        t,
        g.f(me,
            F_DECAY,
            t),
        "true",
        {
            tag: "effect"
        })
}

/** Một tia chiêu lên t với sát thương thô raw: trúng (không bị miễn toàn lá/đóng băng bản thân) thì +1 Phân Rã */
function ray(g: Game, me: Unit, t: Unit, raw: number) {
    if (t.status !== "board") return
    if (g.has(t,
        "stasis") || g.has(t,
        "invulnerable") || g.s.immune?.includes(t.id)) return
    g.damage(me,
        t,
        raw,
        "magic",
        {
            tag: "skill"
        })
    addDecay(g,
        me,
        t)
}
/** Một tia theo công thức expr (tính lại máu đã mất của chính mục tiêu ngay trước tia) */
const hit = (g: Game, me: Unit, t: Unit, expr: string) => ray(g,
    me,
    t,
    g.f(me,
        expr,
        t))

const foes = (g: Game, me: Unit) => g.targetableEnemies(me).filter((u) => !u.token)

export default defineHero({
    id: "velkoz", name: "Vel'Koz", role: "mage", damage: "magic", hp: 330, atk: 60, armor: 25, mr: 28,
    desc: "Phân rã: mỗi tia chiêu trúng là một Phân Rã, đủ 3 thì rã chuẩn. Q chia tia sang một địch khác, E đánh hai nhịp, R dồn 6 tia vào một mục tiêu.",
    passive: {
        name: "Phân Rã Hữu Cơ",
        desc: `Mỗi tia chiêu gốc trúng tướng địch thêm 1 Phân Rã; đủ ${DECAY_MAX} thì tiêu đúng ${DECAY_MAX} và nổ {${F_DECAY}} sát thương chuẩn. Trúng không đòi mất Máu/Khiên: miễn riêng sát thương hay Hộ vệ vẫn tính; miễn toàn lá/trượt không tích. Nổ không chí mạng và không tự sinh dấu. Mục tiêu chết thì mất Phân Rã.`,
    },
    hooks: {
        onDeath(g, me, d) {
            // địch chết thì Phân Rã về 0
            if (d.victim.side !== me.side && g.stackOf(d.victim,
                DECAY)) g.setStack(d.victim,
                DECAY,
                0)
        },
        onDelayed(g, me, d) {
            if (d.key !== "rift") return
            const t = g.unit(String(d.data?.target ?? ""))
            if (!t || t.status !== "board" || t.deaths !== Number(d.data?.life ?? t.deaths)) return
            const base = Number(d.data?.base ?? g.f(me,
                F_E_BASE))
            ray(g,
                me,
                t,
                base + E_MISSING * Math.max(0,
                    t.maxHp - t.hp))
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Phân Hạch Plasma", target: "enemy", mana: 20,
            desc: `Chọn 1 tướng địch: nó chịu {${F_Q_MAIN}} sát thương phép; 1 tướng địch khác ngẫu nhiên hợp lệ chịu {${F_Q_SIDE}} sát thương phép theo Máu đã mất của chính nó. Mỗi tia trúng thêm 1 Phân Rã.`,
            resolve(c) {
                const t = c.target!
                const others = c.g.shuffle(foes(c.g,
                    c.self).filter((u) => u.id !== t.id)).slice(0,
                    Q_SIDE_TARGETS)
                if (others.length) c.g.log(`Vel'Koz Q: tia phụ ngẫu nhiên trúng ${others.map((u) => c.g.nameOf(u)).join(", ")}`)
                hit(c.g,
                    c.self,
                    t,
                    F_Q_MAIN)
                for (const u of others) hit(c.g,
                    c.self,
                    u,
                    F_Q_SIDE)
            },
        },
        E: {
            key: "E", name: "Khe Nứt Hư Không", target: "enemy", mana: 30,
            desc: `Chọn 1 tướng địch: nó chịu {${F_E}} sát thương phép ngay và một lần nữa vào cuối lượt hiện tại nếu còn sống. Hai nhịp cùng một lá, AD/AP chụp lúc E giải quyết; mỗi nhịp trúng tích 1 Phân Rã và tính lại Máu đã mất tại nhịp đó.`,
            resolve(c) {
                const t = c.target!
                const base = c.f(F_E_BASE)
                ray(c.g,
                    c.self,
                    t,
                    base + E_MISSING * Math.max(0,
                        t.maxHp - t.hp))
                if (t.status === "board") {
                    c.g.delay(c.self,
                        "rift",
                        "turnEnd",
                        c.g.s.active,
                        {
                            target: t.id, base, life: t.deaths
                        },
                        {
                            surviveOwnerDeath: true // nhịp hai đã cam kết vẫn bắn khi Vel'Koz đã ngã
                        })
                }
            },
        },
        R: {
            key: "R", name: "Tia Phân Rã Sự Sống", target: "enemy", mana: 60,
            desc: `Chọn 1 tướng địch, bắn liên tiếp tối đa ${RAYS} tia trong cùng một lần giải quyết; mỗi tia gây {${F_R}} sát thương phép theo Máu đã mất hiện tại và tích 1 Phân Rã nếu trúng. Mục tiêu chết thì dừng, không đổi đích. Cả ${RAYS} tia trúng là hoàn tất 2 chu kỳ Phân Rã.`,
            resolve(c) {
                const t = c.target!
                let n = 0
                for (let i = 0; i < RAYS && t.status === "board"; i++) {
                    hit(c.g,
                        c.self,
                        t,
                        F_R)
                    n++
                }
                c.g.log(`Vel'Koz R: ${n}/${RAYS} tia vào ${c.g.nameOf(t)}`)
            },
        },
    },
})
