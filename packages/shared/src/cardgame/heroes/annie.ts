// Annie (Pháp sư, phép): bộ chiêu chốt 31/10 - 01/11/2026 (docs/heroes/KITS.md). Số ở balance/heroes/annie.json.
// Scale theo AP và Máu tối đa. P Hoả Thuật: mỗi chiêu cho 1 Lửa (tối đa p1); đủ Lửa thì chiêu kế tiêu hết và Choáng mọi địch trúng.
// Tướng đang Choáng chịu thêm p4 từ Annie và Tibbers. Cờ stunBonusOnly (quyết định tạm của chủ): 1 = phần thêm chỉ áp cho trạng thái Choáng, 0 = mọi khống chế.
import {
    actorOrEnemy, kit, when
} from "../balance"
import {
    pct
} from "../formula"
import {
    CC_STATUSES, type Game
} from "../game"
import {
    defineHero, defineTokenBehavior
} from "../registry"
import type {
    Unit
} from "../types"

const k = kit("annie"), { p } = k
/** Lửa (trên Annie): mất một nửa khi Annie chết */
export const FIRE = "fire"
/** Vật triệu hồi Tibbers (ô phụ) */
export const TIBBERS = "tibbers"

const F_STUN = k.x("p2 + p3·AP"), EN_STUN = k.xe("p2 + p3·AP")
const F_Q = k.x("q1 + q2·AP + q3·máu tối đa"), EN_Q = k.xe("q1 + q2·AP + q3·máu tối đa")
const F_E_DMG = k.x("e1 + e2·AP + e3·máu tối đa"), EN_E_DMG = k.xe("e1 + e2·AP + e3·máu tối đa")
const F_E_SHIELD = k.x("e4 + e5·AP + e6·máu tối đa"), EN_E_SHIELD = k.xe("e4 + e5·AP + e6·máu tối đa")
const F_R = k.x("r1 + r2·AP + r3·máu tối đa"), EN_R = k.xe("r1 + r2·AP + r3·máu tối đa")
const F_T_HP = k.x("r4 + r5·AP + r6·máu tối đa"), EN_T_HP = k.xe("r4 + r5·AP + r6·máu tối đa")
const F_T_ARMOR = k.x("r7 + r8·AP + r9·máu tối đa"), EN_T_ARMOR = k.xe("r7 + r8·AP + r9·máu tối đa")
const F_T_MR = k.x("r10 + r11·AP + r12·máu tối đa"), EN_T_MR = k.xe("r10 + r11·AP + r12·máu tối đa")
const F_T_ATK = k.x("r13 + r14·AP + r15·máu tối đa"), EN_T_ATK = k.xe("r13 + r14·AP + r15·máu tối đa")

/** Mục tiêu đang bị khống chế theo cờ stunBonusOnly: 1 = chỉ Choáng, 0 = mọi khống chế */
export const stunned = (g: Game, t: Unit) => k.flag("stunBonusOnly") ? g.has(t,
    "stun") : [...CC_STATUSES].some((id) => g.has(t,
    id))

/** Chiêu bắt đầu: đủ Lửa thì tiêu hết (trả true: chiêu này Choáng mọi địch trúng và không nạp Lửa) */
function beginFire(g: Game, me: Unit): boolean {
    if (g.stackOf(me,
        FIRE) < p.p1) return false
    g.setStack(me,
        FIRE,
        0)
    return true
}
/** Chiêu xong: chưa đủ Lửa lúc bắt đầu thì +1 Lửa (tối đa p1) */
const endFire = (g: Game, me: Unit, charged: boolean) => { if (!charged) g.stack(me,
    FIRE,
    1,
    p.p1) }

defineTokenBehavior({
    id: TIBBERS,
    // Cuối lượt của Annie, Tibbers đánh 1 tướng địch ngẫu nhiên
    onOwnerTurnEnd(g, tok, owner) {
        if (!owner || owner.status !== "board" || !g.canAttack(tok)) return
        const foe = g.pick(g.targetableEnemies(tok).filter((x) => !x.token))
        if (foe) g.attackAction(tok,
            foe)
    },
})

export default defineHero({
    id: "annie", name: "Annie", role: "mage", damage: "magic", ...k.base,
    deathHalf: [FIRE],
    bot: k.bot,
    desc: "Lửa tích tới Choáng: mỗi chiêu thêm Lửa, đủ Lửa thì chiêu kế Choáng mọi địch trúng, và Annie cùng Tibbers đánh kẻ đang Choáng đau hơn. E là Khiên Quick phản công, R gọi Tibbers.",
    passive: {
        name: "Hoả Thuật",
        desc: `Mỗi chiêu cho 1 Lửa, tối đa ${p.p1}. Khi đủ ${p.p1} Lửa: chiêu kế tiêu hết Lửa và Choáng mọi địch trúng {${F_STUN}} đơn vị (chiêu đó không cho Lửa). Tướng đang Choáng chịu thêm ${pct(p.p4)}% sát thương từ Annie và Tibbers. Khi Annie bị hạ, mất một nửa số Lửa.`,
    },
    modifyDamage(g, me, d) {
        const src = d.src
        if (!src || d.target.side === me.side) return 1
        const mine = src.id === me.id || (!!src.token && src.token.ownerId === me.id)
        return mine && stunned(g,
            d.target) ? 1 + p.p4 : 1
    },
    skills: {
        Q: {
            key: "Q", name: "Phi Tiêu Lửa", target: "enemy", mana: p.q0,
            desc: `Chọn 1 tướng địch; gây {${F_Q}} sát thương phép. Nếu hạ gục nó, lá này về tay.`,
            resolve(c) {
                const g = c.g, me = c.self, t = c.target!
                const charged = beginFire(g,
                    me)
                if (charged) g.timed(me,
                    t,
                    "stun",
                    c.f(F_STUN))
                const dealt = g.damage(me,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (dealt > 0 && t.status !== "board") c.toHand()
                endFire(g,
                    me,
                    charged)
            },
        },
        E: {
            key: "E", name: "Lá Chắn Cháy", target: "enemy", mana: p.e0, quick: true,
            quickWhen: when.targetsSelf,
            options: actorOrEnemy,
            desc: `Quick. Khi địch nhắm đúng Annie, bạn có thể dùng lá này; mục tiêu là kẻ đó (dùng chủ động thì chọn 1 tướng địch). Nó nhận {${F_E_DMG}} sát thương phép, Annie nhận {${F_E_SHIELD}} Khiên.`,
            resolve(c) {
                const g = c.g, me = c.self, t = c.target!
                const charged = beginFire(g,
                    me)
                if (charged) g.timed(me,
                    t,
                    "stun",
                    c.f(F_STUN))
                g.damage(me,
                    t,
                    c.f(F_E_DMG),
                    "magic",
                    {
                        tag: "skill"
                    })
                g.shield(me,
                    me,
                    c.f(F_E_SHIELD))
                endFire(g,
                    me,
                    charged)
            },
        },
        R: {
            key: "R", name: "Tibbers", target: "all_enemies", mana: p.r0,
            desc: `Mọi tướng địch nhận {${F_R}} sát thương phép. Sau đó, gọi Tibbers vào ô phụ với Máu {${F_T_HP}}, Giáp {${F_T_ARMOR}}, Kháng {${F_T_MR}} và sát thương {${F_T_ATK}} phép; cuối lượt của Annie, Tibbers đánh 1 tướng địch ngẫu nhiên. Annie bị hạ thì Tibbers biến mất.`,
            resolve(c) {
                const g = c.g, me = c.self
                const charged = beginFire(g,
                    me)
                const dmg = c.f(F_R)
                const stun = charged ? c.f(F_STUN) : 0
                for (const t of g.enemies(me).filter((x) => !x.token)) {
                    if (charged) g.timed(me,
                        t,
                        "stun",
                        stun)
                    g.damage(me,
                        t,
                        dmg,
                        "magic",
                        {
                            tag: "skill"
                        })
                }
                if (me.status === "board") {
                    const stat = (expr: string) => Math.max(1,
                        Math.round(c.f(expr)))
                    g.summonToken(me.side,
                        {
                            id: TIBBERS, name: "Tibbers", hp: stat(F_T_HP), atk: stat(F_T_ATK), armor: stat(F_T_ARMOR), mr: stat(F_T_MR),
                            damage: "magic", role: "fighter", ownerId: me.id, soak: false,
                        })
                }
                endFire(g,
                    me,
                    charged)
            },
        },
    },
    en: {
        desc: "Fire that builds to a Stun: every skill adds Fire, at full Fire the next skill Stuns every enemy it hits, and Annie and Tibbers hit a Stunned enemy harder. E is a Quick Shield with a counter, R summons Tibbers.",
        passive: {
            name: "Pyromania",
            desc: `Each skill gives 1 Fire, up to ${p.p1}. At ${p.p1} Fire: the next skill spends all Fire and Stuns every enemy it hits for {${EN_STUN}} units (that skill gives no Fire). Stunned champions take ${pct(p.p4)}% more damage from Annie and Tibbers. When Annie is taken down she loses half her Fire.`,
        },
        skills: {
            Q: {
                name: "Disintegrate",
                desc: `Choose 1 enemy champion; deal {${EN_Q}} magic damage. If it is taken down, this card returns to your hand.`,
            },
            E: {
                name: "Molten Shield",
                desc: `Quick. When an enemy targets exactly Annie, you may play this card; the target is that enemy (played proactively, choose 1 enemy champion). It takes {${EN_E_DMG}} magic damage, Annie gains {${EN_E_SHIELD}} Shield.`,
            },
            R: {
                name: "Summon: Tibbers",
                desc: `Every enemy champion takes {${EN_R}} magic damage. Then summon Tibbers into the auxiliary slot with {${EN_T_HP}} HP, {${EN_T_ARMOR}} Armor, {${EN_T_MR}} MR and {${EN_T_ATK}} magic damage; at the end of Annie's turn, Tibbers attacks 1 random enemy champion. If Annie is taken down, Tibbers disappears.`,
            },
        },
    },
})
