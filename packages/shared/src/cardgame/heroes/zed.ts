// Zed (Sát thủ, vật lý): combo một lượt. Mỗi chiêu hoặc đòn trong lượt cho 1 Liên Hoàn, chiêu sau đau hơn chiêu trước.
// Số liệu: balance/heroes/zed.json. Đặc tả: docs/heroes/KITS.md.
// Engine: g.turnCount/bumpTurnCount (Liên Hoàn tính theo lượt, tự về 0 khi sang lượt khác; stack "zed_chain" chỉ để hiển thị),
//         g.delay + onDelayed (Dấu Ấn nổ cuối lượt, surviveOwnerDeath), c.vanish (lá R mất sau khi dùng), g.faceEnemy (E).
import {
    kit, when, actorOrEnemy
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
    Ctx, SkillDef, Unit
} from "../types"

const k = kit("zed"), { p } = k
const CHAIN = "zed_chain"
const MARK = "zed_mark"
const Q_STATUS = "zed_q"
const R_DELAY = "zed_r"

const F_P = k.x("p1 + p2·AD"), EN_P = k.xe("p1 + p2·AD")
const F_Q = k.x("q1 + q2·AD"), EN_Q = k.xe("q1 + q2·AD")
const F_Q2 = k.x("q3 + q4·AD"), EN_Q2 = k.xe("q3 + q4·AD")
const F_E = k.x("e1 + e2·AD"), EN_E = k.xe("e1 + e2·AD")
const F_R = k.x("r1 + r2·AD"), EN_R = k.xe("r1 + r2·AD")
const F_RM = k.x("r3 + r4% Máu đã mất mục tiêu"), EN_RM = k.xe("r3 + r4% Máu đã mất mục tiêu")

const ENEMY_SELECTION: SkillDef = {
    key: "E", name: "", desc: "", target: "enemy", resolve: () => {}
}

/** Liên Hoàn của Zed lượt này */
const chainOf = (g: Game, me: Unit) => g.turnCount(me,
    CHAIN)
/** +1 Liên Hoàn (tính theo lượt; stack hiển thị đặt theo) */
function addChain(g: Game, me: Unit) {
    g.setStack(me,
        CHAIN,
        g.bumpTurnCount(me,
            CHAIN))
}
/** Một chiêu của Zed gây `base` sát thương lên t, cộng Liên Hoàn đã có; xong thì +1 Liên Hoàn */
function strike(c: Ctx, t: Unit, base: string) {
    const bonus = chainOf(c.g,
        c.self) * c.f(F_P)
    c.g.damage(c.self,
        t,
        c.f(base) + bonus,
        "physical",
        {
            tag: "skill"
        })
    if (c.self.hero === "zed") addChain(c.g, // Liên Hoàn chỉ của Zed: lá sao chép không để lại tầng không bao giờ hết
        c.self)
}

export default defineHero({
    id: "zed", name: "Zed", role: "assassin", damage: "physical", ...k.base,
    bot: k.bot,
    desc: "Chủ nhân Bóng Tối: dồn chiêu và đòn trong một lượt, mỗi phát sau đau hơn phát trước.",
    passive: {
        name: "Liên Hoàn",
        desc: `Mỗi chiêu hoặc đòn đánh của Zed trong lượt cho 1 Liên Hoàn; hết lượt, Liên Hoàn mất. Mỗi Liên Hoàn làm chiêu kế tiếp của Zed gây thêm {${F_P}} sát thương.`,
    },
    hooks: {
        onAttackHit(g, me, d) {
            if (d.attacker.id === me.id && !d.info.miss) addChain(g,
                me)
        },
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss) return
            const v = g.statusV(me,
                Q_STATUS)
            if (v > 0) d.info.bonus.push({
                raw: v, kind: "physical"
            })
        },
        onTurnEnd(g, me) {
            if (g.stackOf(me,
                CHAIN) !== 0) g.setStack(me,
                CHAIN,
                0)
        },
        onDelayed(g, me, d) {
            if (d.key !== R_DELAY) return
            const t = g.unit(String(d.data?.target ?? ""))
            if (!t) return
            g.removeStatus(t,
                MARK)
            if (t.status !== "board" || t.side === me.side) return
            const raw = g.f(me,
                F_RM,
                t) + p.r5 * chainOf(g,
                me)
            g.damage(me,
                t,
                raw,
                "true",
                {
                    tag: "effect"
                })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Phi Tiêu Sắc Lẻm", target: "opposite", mana: p.q0,
            desc: `Tướng địch đối diện nhận {${F_Q}} sát thương vật lý. Trong lượt này, mỗi đòn đánh của Zed gây thêm {${F_Q2}} sát thương vật lý.`,
            resolve(c) {
                const t = c.target
                if (!t || t.side === c.side) return
                strike(c,
                    t,
                    F_Q)
                c.g.status(c.self,
                    Q_STATUS,
                    1,
                    {
                        v: c.f(F_Q2), add: true, until: c.g.s.turnNo
                    })
            },
        },
        E: {
            key: "E", name: "Phân Thân Bóng Tối", target: "enemy", mana: p.e0, quick: true, quickWhen: when.targetsSelf,
            desc: `Quick. Chọn 1 tướng địch bất kỳ đường; Zed dịch chuyển sang đường đối diện nó, tướng đó nhận {${F_E}} sát thương vật lý. Dùng được khi địch nhắm đúng Zed; khi đó mục tiêu là kẻ vừa nhắm Zed.`,
            options: (c) => (c.trigger ? actorOrEnemy(c) : skillArgs(c.g,
                c.side,
                c.self,
                c.card,
                ENEMY_SELECTION)),
            resolve(c) {
                const t = c.target
                if (!t || t.side === c.side || t.token || t.status !== "board") return
                if (c.g.opposite(c.self)?.id !== t.id && !c.g.faceEnemy(c.self,
                    t)) return
                strike(c,
                    t,
                    F_E)
            },
        },
        R: {
            key: "R", name: "Dấu Ấn Tử Thần", target: "opposite", mana: p.r0,
            desc: `Tướng địch đối diện nhận {${F_R}} sát thương vật lý và Dấu Ấn Tử Thần. Cuối lượt này, Dấu Ấn nổ gây {${F_RM}} + ${p.r5} mỗi Liên Hoàn sát thương chuẩn. Lá này biến mất sau khi dùng.`,
            resolve(c) {
                const t = c.target
                if (!t || t.side === c.side) return
                c.vanish()
                strike(c,
                    t,
                    F_R)
                if (t.status !== "board") return
                c.g.status(t,
                    MARK,
                    1,
                    {
                        until: c.g.s.turnNo
                    })
                c.g.delay(c.self,
                    R_DELAY,
                    "turnEnd",
                    c.g.s.active,
                    {
                        target: t.id
                    },
                    {
                        surviveOwnerDeath: true
                    })
            },
        },
    },
    en: {
        desc: "Master of Shadows: pack skills and attacks into one turn, every hit hurting more than the last.",
        passive: {
            name: "Chain Beat",
            desc: `Each skill or attack by Zed in a turn gives 1 Chain Beat; it is lost at the end of the turn. Each Chain Beat makes Zed's next skill deal {${EN_P}} extra damage.`,
        },
        skills: {
            Q: {
                name: "Razor Shuriken",
                desc: `The enemy champion opposite takes {${EN_Q}} physical damage. This turn, each of Zed's attacks deals {${EN_Q2}} extra physical damage.`,
            },
            E: {
                name: "Shadow Slash",
                desc: `Quick. Choose 1 enemy champion on any lane; Zed moves to the lane opposite it and it takes {${EN_E}} physical damage. Can be played when an enemy targets exactly Zed; then the target is the one who targeted Zed.`,
            },
            R: {
                name: "Death Mark",
                desc: `The enemy champion opposite takes {${EN_R}} physical damage and gains the Death Mark. At the end of this turn the Mark detonates for {${EN_RM}} + ${p.r5} per Chain Beat true damage. This card disappears after use.`,
            },
        },
    },
})
