// Yorick (Đấu sĩ, vật lý). Thầy chốt lại 2026-11-16, số liệu ở balance/heroes/yorick.json. Mọi chiêu 0 mana, chỉ chạm tướng đối diện.
// CHẤT: "Đào mộ để mạnh lên". Mỗi lá Yorick đốt khỏi bộ bài đối thủ thành 1 Hồn (lá chiêu thêm Hồn): +Công, +Máu tối đa vĩnh viễn
// (chết mất nửa). Hai đường thắng: đối thủ cạn bài (luật engine, cờ deckOutWinUsesEngineRule) hoặc nuôi Hồn rồi R chém kết liễu.
// Mốc p6/2·p6/3·p6 Hồn (25/50/75) mỗi mốc tạo 1 lá R miễn phí (chỉ một lần mỗi mốc).
import {
    kit, when
} from "../balance"
import {
    defineHero
} from "../registry"
import type {
    Game
} from "../game"
import type {
    Side, Unit
} from "../types"

const k = kit("yorick"), { p } = k
export const SOUL = "yorick_soul"
/** Số mốc Hồn đã tạo lá R (không mất khi chết, để mỗi mốc chỉ tặng một lần) */
export const GIFT = "yorick_gift"
/** Quyết định tạm của thầy: thắng khi cạn bộ bài dùng đúng luật engine, không thêm điều kiện thắng riêng */
export const DECK_OUT_USES_ENGINE_RULE = k.flag("deckOutWinUsesEngineRule")
export const F_Q = k.x("q1 + q2·AD + q3·Máu tối đa"), EN_Q = k.xe("q1 + q2·AD + q3·Máu tối đa")
export const F_E = k.x("e1 + e2·AD + e3·Máu tối đa"), EN_E = k.xe("e1 + e2·AD + e3·Máu tối đa")
export const F_R = k.x("r2 + r3·AD + r4·Máu tối đa"), EN_R = k.xe("r2 + r3·AD + r4·Máu tối đa")

export const soulsOf = (u: Unit) => u.stacks[SOUL] ?? 0
/** Máu tối đa cộng thêm từ Hồn (kiểu aura, đổi theo số tầng) */
const syncSouls = (g: Game, me: Unit) => g.setAuraMaxHp(me,
    SOUL,
    soulsOf(me) * p.p3)

/** Cộng `n` Hồn; vượt mốc p6 (tối đa p7 mốc) lần đầu thì tạo 1 lá R lên tay */
export function addSouls(g: Game, me: Unit, n: number) {
    if (n <= 0) return
    const souls = g.stack(me,
        SOUL,
        n)
    syncSouls(g,
        me)
    const reached = Math.min(p.p7,
        Math.floor(souls / p.p6))
    while ((me.stacks[GIFT] ?? 0) < reached) {
        g.stack(me,
            GIFT,
            1)
        g.giveSkillToHand(me.side,
            "yorick",
            "R",
            "effect")
    }
}

/** Đốt `n` lá trên cùng bộ bài phe `side`; mỗi lá cho 1 Hồn, lá chiêu thêm p5. Trả số lá đã đốt */
export function dig(g: Game, me: Unit, side: Side, n: number): number {
    const burned = g.burn(side,
        n)
    addSouls(g,
        me,
        burned.length + p.p5 * burned.filter((c) => c.kind === "skill").length)
    return burned.length
}

const hasFoe = (g: Game, me: Unit) => !!g.opposite(me)

export default defineHero({
    id: "yorick", name: "Yorick", role: "fighter", damage: "physical", ...k.base,
    deathHalf: [SOUL],
    bot: k.bot,
    desc: "Người Đào Mộ: mỗi nhát chém vào tướng đối diện đào bộ bài đối thủ, mỗi lá đốt thành Hồn làm Yorick mạnh lên. Cạn bài là thua, nuôi đủ Hồn thì R kết liễu.",
    passive: {
        name: "Người Đào Mộ",
        desc: `Đòn trúng tướng đối diện đốt ${p.p1} lá trên cùng bộ bài đối thủ. Mỗi lá Yorick đốt (bằng mọi cách) cho 1 Hồn, lá chiêu thêm ${p.p5}. Mỗi Hồn: +${p.p2} Công, +${p.p3} Máu tối đa. Lần đầu đạt ${p.p6}/${2 * p.p6}/${3 * p.p6} Hồn, mỗi mốc tạo 1 lá R. Yorick chết thì mất nửa số Hồn.`,
    },
    en: {
        desc: "Gravedigger: every blow on the opposite enemy digs the opponent's deck, and each burned card becomes a Soul that makes Yorick stronger. An empty deck loses; with enough Souls, R finishes the job.",
        passive: {
            name: "Gravedigger",
            desc: `A hit on the opposite enemy burns the top ${p.p1} card(s) of the opponent's deck. Each card Yorick burns (any way) gives 1 Soul, skill cards ${p.p5} more. Each Soul: +${p.p2} AD, +${p.p3} max HP. The first time he reaches ${p.p6}/${2 * p.p6}/${3 * p.p6} Souls, each milestone creates 1 R card. When Yorick dies he loses half his Souls.`,
        },
        skills: {
            Q: {
                name: "Last Rites",
                desc: `The opposite enemy takes {${EN_Q}} physical damage; burn ${p.q4} card(s) from the opponent's deck. Yorick heals ${p.q5} HP per Soul gained this way.`,
            },
            E: {
                name: "Mourning Mist",
                desc: `Quick. When the enemy targets exactly Yorick, you may play this card (it can also be played proactively): the opposite enemy takes {${EN_E}} physical damage and is Shredded for ${p.e5} units; burn ${p.e4} card(s) from the opponent's deck, Yorick gains a ${p.e6} Shield per card burned.`,
            },
            R: {
                name: "Eulogy of the Isles",
                desc: `Burn ${p.r1} card(s) from the opponent's deck, then the opposite enemy takes {${EN_R}} physical damage plus ${p.r5} true damage per Soul Yorick has.`,
            },
        },
    },
    bonusStats: (_g, me) => ({
        atk: soulsOf(me) * p.p2
    }),
    hooks: {
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss || d.target.side === me.side || d.target.token) return
            if (d.target.lane !== me.lane) return
            dig(g,
                me,
                d.target.side,
                p.p1)
        },
        onDeath(g, me, d) {
            if (d.victim.id === me.id) syncSouls(g,
                me) // engine đã giảm một nửa Hồn
        },
    },
    skills: {
        Q: {
            key: "Q", mana: p.q0, name: "Nghi Thức Cuối", target: "opposite",
            desc: `Tướng địch đối diện nhận {${F_Q}} sát thương vật lý; đốt ${p.q4} lá bộ bài đối thủ. Yorick hồi ${p.q5} Máu cho mỗi Hồn nhận được từ chiêu này.`,
            canPlay: (c) => hasFoe(c.g,
                c.self),
            resolve(c) {
                const g = c.g, me = c.self, t = c.target!
                g.damage(me,
                    t,
                    c.f(F_Q),
                    "physical",
                    {
                        tag: "skill"
                    })
                const s0 = soulsOf(me)
                dig(g,
                    me,
                    t.side,
                    p.q4)
                const gained = soulsOf(me) - s0
                if (gained > 0 && me.status === "board") g.heal(me,
                    me,
                    gained * p.q5)
            },
        },
        E: {
            key: "E", mana: p.e0, name: "Sương Sầu", target: "opposite", quick: true,
            quickWhen: when.targetsSelf,
            desc: `Quick. Khi địch nhắm đúng Yorick, bạn có thể dùng lá này (dùng chủ động cũng được): tướng địch đối diện nhận {${F_E}} sát thương vật lý và bị Rã Giáp ${p.e5} đơn vị; đốt ${p.e4} lá bộ bài đối thủ, Yorick nhận ${p.e6} Khiên cho mỗi lá đốt được.`,
            canPlay: (c) => hasFoe(c.g,
                c.self),
            resolve(c) {
                const g = c.g, me = c.self, t = c.target!
                g.damage(me,
                    t,
                    c.f(F_E),
                    "physical",
                    {
                        tag: "skill"
                    })
                if (t.status === "board") g.timed(me,
                    t,
                    "shred",
                    p.e5)
                const n = dig(g,
                    me,
                    t.side,
                    p.e4)
                if (n > 0 && me.status === "board") g.shield(me,
                    me,
                    n * p.e6)
            },
        },
        R: {
            key: "R", mana: p.r0, name: "Khúc Ai Ca", target: "opposite",
            desc: `Đốt ${p.r1} lá bộ bài đối thủ, rồi tướng địch đối diện nhận {${F_R}} sát thương vật lý cộng ${p.r5} sát thương chuẩn cho mỗi Hồn Yorick đang có.`,
            canPlay: (c) => hasFoe(c.g,
                c.self),
            resolve(c) {
                const g = c.g, me = c.self, t = c.target!
                dig(g,
                    me,
                    t.side,
                    p.r1)
                g.damage(me,
                    t,
                    c.f(F_R),
                    "physical",
                    {
                        tag: "skill"
                    })
                if (t.status === "board") g.damage(me,
                    t,
                    p.r5 * soulsOf(me),
                    "true",
                    {
                        tag: "skill"
                    })
            },
        },
    },
})
