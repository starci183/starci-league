// Yorick (Đấu sĩ, vật lý). Bộ chiêu chốt 31/10 – 01/11/2026, số liệu ở balance/heroes/yorick.json (docs/heroes/KITS.md).
// CHẤT: "Câu giờ đốt bài". Đòn trúng đốt bộ bài đối thủ và nuôi Hồn Ma (máu, giáp, và cứ mỗi p4 Hồn Ma tạo 1 lá R); E đốt thêm và Rã Giáp;
// R gọi Ma Sương ở ô phụ (token): đầu lượt và mỗi đòn Yorick nó đánh đối diện rồi đốt thêm bài. Gọi lại khi đã có thì hồi đầy và Tiến Hoá.
// Thắng bằng cạn bộ bài: dùng luật sẵn có của engine (đầu lượt rút bài mà bộ trống thì thua), cờ deckOutWinUsesEngineRule trong JSON ghi quyết định tạm này.
import {
    kit
} from "../balance"
import {
    defineHero, defineTokenBehavior
} from "../registry"
import type {
    Game
} from "../game"
import type {
    Unit
} from "../types"
import {
    otherSide
} from "../types"

const k = kit("yorick"), { p } = k
export const SOUL = "yorick_soul"
export const EVO = "mist_evo"
export const MIST = "yorick_mist"
/** Quyết định tạm của thầy: thắng khi cạn bộ bài dùng đúng luật engine, không thêm điều kiện thắng riêng */
export const DECK_OUT_USES_ENGINE_RULE = k.flag("deckOutWinUsesEngineRule")
export const F_Q_DMG = k.x("q1 + q2·Máu tối đa"), EN_Q_DMG = k.xe("q1 + q2·Máu tối đa")
export const F_Q_HEAL = k.x("q3 + q4·Máu tối đa"), EN_Q_HEAL = k.xe("q3 + q4·Máu tối đa")
export const F_E = k.x("e2 + e3·Giáp"), EN_E = k.xe("e2 + e3·Giáp")
export const F_MIST_HP = k.x("r1 + r2·Máu tối đa"), EN_MIST_HP = k.xe("r1 + r2·Máu tối đa")
export const F_MIST_ARMOR = k.x("r3 + r4·Giáp"), EN_MIST_ARMOR = k.xe("r3 + r4·Giáp")

export const soulsOf = (u: Unit) => u.stacks[SOUL] ?? 0
/** Ma Sương của Yorick `me` đang ở ô phụ */
export const mistOf = (g: Game, me: Unit): Unit | undefined => {
    const t = g.tokenOf(me.side)
    return t?.token?.id === MIST && t.token.ownerId === me.id ? t : undefined
}
/** Máu tối đa cộng thêm từ Hồn Ma (kiểu aura, đổi theo số tầng) */
const syncSouls = (g: Game, me: Unit) => g.setAuraMaxHp(me,
    SOUL,
    soulsOf(me) * p.p2)

/** Ma Sương đánh: đối diện Yorick (hoặc mục tiêu chỉ định) nhận r5 + r6·Hồn Ma + r10·Tiến Hoá sát thương vật lý, rồi đốt r7 lá bộ nó */
export function mistStrike(g: Game, me: Unit, target?: Unit) {
    const tok = mistOf(g,
        me)
    const foe = target ?? g.opposite(me)
    if (!tok || !foe || foe.token || foe.status !== "board") return
    g.damage(me,
        foe,
        p.r5 + p.r6 * soulsOf(me) + p.r10 * (tok.stacks[EVO] ?? 0),
        "physical",
        {
            tag: "effect"
        })
    g.burn(foe.side,
        p.r7)
}

defineTokenBehavior({
    id: MIST,
    onOwnerTurnStart(g, _tok, owner) { if (owner && owner.status === "board") mistStrike(g,
        owner) },
})

export default defineHero({
    id: "yorick", name: "Yorick", role: "fighter", damage: "physical", ...k.base,
    deathHalf: [SOUL],
    bot: k.bot,
    desc: "Người Chăn Hồn: đánh để đốt bộ bài đối thủ và nuôi Hồn Ma; Ma Sương đi cạnh đốt thêm. Cạn bộ bài là thua.",
    passive: {
        name: "Người Đào Mộ",
        desc: `Đòn trúng đốt ${p.p1} lá trên cùng bộ bài đối thủ và cho Yorick 1 Hồn Ma. Mỗi Hồn Ma cho ${p.p2} Máu tối đa và ${p.p3} Giáp. Mỗi bội số của ${p.p4} Hồn Ma, tạo 1 lá R. Yorick chết thì mất một nửa Hồn Ma.`,
    },
    en: {
        desc: "Gravedigger: his hits burn the opponent's deck and feed Wraiths; the Mist Walker beside him burns even more. An empty deck loses.",
        passive: {
            name: "Gravedigger",
            desc: `A hit burns the top ${p.p1} card(s) of the opponent's deck and gives Yorick 1 Wraith. Each Wraith gives ${p.p2} max HP and ${p.p3} Armor. At every multiple of ${p.p4} Wraiths, create 1 R card. When Yorick dies he loses half his Wraiths.`,
        },
        skills: {
            Q: {
                name: "Last Rites",
                desc: `The opposite enemy takes {${EN_Q_DMG}} physical damage; Yorick heals {${EN_Q_HEAL}} HP.`,
            },
            E: {
                name: "Mourning Mist",
                desc: `Burn ${p.e1} card(s) from the opponent's deck. Choose 1 enemy champion: it takes {${EN_E}} physical damage and loses Armor (Shred) for ${p.e4} units. If the Mist Walker is out, it attacks that champion too.`,
            },
            R: {
                name: "Dirge of the Mist",
                desc: `Summon the Mist Walker in the extra slot with {${EN_MIST_HP}} HP and {${EN_MIST_ARMOR}} Armor. At the start of your turn and with each of Yorick's hits it strikes the opposite enemy for ${p.r5} + ${p.r6} per Wraith physical damage and burns ${p.r7} card(s). If it is already out: it heals fully and gains 1 Evolution (${p.r8} HP, ${p.r9} Armor, ${p.r10} damage; lost with the Mist Walker). It vanishes when Yorick dies.`,
            },
        },
    },
    bonusStats: (_g, me) => ({
        armor: soulsOf(me) * p.p3
    }),
    hooks: {
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss || d.target.side === me.side || d.target.token) return
            g.burn(d.target.side,
                p.p1)
            const n = g.stack(me,
                SOUL,
                1)
            syncSouls(g,
                me)
            if (n % p.p4 === 0) g.giveSkillToHand(me.side,
                "yorick",
                "R",
                "effect")
            mistStrike(g,
                me)
        },
        onDeath(g, me, d) {
            if (d.victim.id === me.id) syncSouls(g,
                me) // engine đã giảm một nửa Hồn Ma
        },
    },
    skills: {
        Q: {
            key: "Q", mana: p.q0, name: "Nghi Thức Cuối", target: "opposite",
            desc: `Tướng địch đối diện nhận {${F_Q_DMG}} sát thương vật lý; Yorick hồi {${F_Q_HEAL}} Máu.`,
            resolve(c) {
                c.g.damage(c.self,
c.target!,
c.f(F_Q_DMG),
"physical",
{
    tag: "skill"
})
                c.g.heal(c.self,
                    c.self,
                    c.f(F_Q_HEAL))
            },
        },
        E: {
            key: "E", mana: p.e0, name: "Sương Sầu", target: "enemy",
            desc: `Đốt ${p.e1} lá trên cùng bộ bài đối thủ. Chọn 1 tướng địch: nhận {${F_E}} sát thương vật lý và Rã Giáp ${p.e4} đơn vị. Có Ma Sương: nó cũng đánh tướng đó.`,
            resolve(c) {
                const t = c.target!
                c.g.burn(otherSide(c.side),
                    p.e1)
                c.g.damage(c.self,
                    t,
                    c.f(F_E),
                    "physical",
                    {
                        tag: "skill"
                    })
                c.g.timed(c.self,
                    t,
                    "shred",
                    p.e4)
                mistStrike(c.g,
                    c.self,
                    t)
            },
        },
        R: {
            key: "R", mana: p.r0, name: "Khúc Ai Ca", target: "none",
            desc: `Gọi Ma Sương ở ô phụ: Máu {${F_MIST_HP}}, Giáp {${F_MIST_ARMOR}}. Đầu lượt bạn và mỗi đòn của Yorick, nó đánh tướng đối diện ${p.r5} + ${p.r6} mỗi Hồn Ma sát thương vật lý và đốt ${p.r7} lá bộ bài nó. Đã có Ma Sương: hồi đầy và nhận 1 Tiến Hoá (${p.r8} Máu, ${p.r9} Giáp, ${p.r10} sát thương; mất khi Ma Sương mất). Yorick chết thì Ma Sương biến mất.`,
            resolve(c) {
                const g = c.g, me = c.self
                const mist = mistOf(g,
                    me)
                if (mist) {
                    mist.maxHp += p.r8
                    mist.hp += p.r8
                    if (mist.token) mist.token.armor += p.r9
                    g.stack(mist,
                        EVO,
                        1)
                    g.heal(me,
                        mist,
                        mist.maxHp)
                    return
                }
                g.summonToken(me.side,
                    {
                        id: MIST, name: "Ma Sương", hp: Math.round(c.f(F_MIST_HP)), armor: Math.round(c.f(F_MIST_ARMOR)), mr: p.r11, ownerId: me.id, soak: false,
                    })
            },
        },
    },
})
