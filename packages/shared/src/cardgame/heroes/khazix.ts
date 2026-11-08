// Kha'Zix (Sát thủ, vật lý): bắt tướng thiếu buff. Tung Cô Lập lên địch đối diện đầu lượt và mỗi lần đổi đường, rồi săn nó.
// Số liệu: balance/heroes/khazix.json. Đặc tả: docs/heroes/KITS.md.
// Engine: hook onTurnStart + onMove (đổi đường, kể cả bị hoán đổi), g.timed (Cô Lập, Tàng Hình theo đơn vị), onAttack (info.bonus),
//         Tàng Hình làm đòn đang nhắm trượt (resolveCardInner: mục tiêu không còn chọn được), g.tempSkillCard (Q miễn phí), g.insertTopN (xáo R).
import {
    kit, when
} from "../balance"
import {
    CC_STATUSES
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    Game
} from "../game"
import type {
    Unit
} from "../types"

const k = kit("khazix"), { p } = k
const ISO = "isolated"

const F_P = k.x("p4 + p5·AD"), EN_P = k.xe("p4 + p5·AD")
const F_Q = k.x("q1 + q2·AD"), EN_Q = k.xe("q1 + q2·AD")
const F_Q2 = k.x("q3 + q4·AD"), EN_Q2 = k.xe("q3 + q4·AD")
const F_E = k.x("e1 + e2·AD"), EN_E = k.xe("e1 + e2·AD")

/** Trạng thái có lợi (Cô Lập "thiếu buff"): các buff có tên, cộng thêm Khiên */
const BUFFS = new Set(["empower",
    "stealth",
    "stasis",
    "guard",
    "dmgCut",
    "attackCut",
    "armor_up",
    "see_hand",
    "frenzy",
    "alwaysCrit",
    "ad_up",
    "ap_up",
    "crit_up",
    "mr_up",
    "attack_speed"])
/** Trạng thái bất lợi ngoài nhóm khống chế */
const DEBUFFS = new Set(["chill",
    "shred",
    "exhaust",
    "grievous",
    "noheal",
    "bleed",
    "guilt",
    "sun",
    "burn",
    "frost",
    "ignite",
    "ad_down",
    "armor_down",
    "mr_down"])
const hasBuff = (g: Game, u: Unit) => g.totalShield(u) > 0 || Object.keys(u.statuses).some((id) => BUFFS.has(id))
const hasDebuff = (g: Game, u: Unit) => Object.keys(u.statuses).some((id) => CC_STATUSES.has(id) || DEBUFFS.has(id))

/** Tung Cô Lập lên địch đối diện. Địch Tàng Hình đối diện bị lộ và luôn Cô Lập. */
function throwIsolation(g: Game, me: Unit) {
    const foe = g.opposite(me)
    if (!foe || foe.token || me.status !== "board") return
    const hidden = g.has(foe,
        "stealth")
    if (hidden) {
        g.removeStatus(foe,
            "stealth")
        g.log(`${g.nameOf(foe)} bị Kha'Zix làm lộ Tàng Hình.`)
        g.timed(me,
            foe,
            ISO,
            p.p6)
        return
    }
    const chance = (p.p1 + (hasBuff(g,
        foe) ? 0 : p.p2) + (hasDebuff(g,
        foe) ? p.p3 : 0)) / 100
    if (g.rollLog(chance,
        (hit, pct) => `Cô Lập ${g.nameOf(foe)} (${pct}): ${hit ? "trúng" : "trượt"}`)) g.timed(me,
        foe,
        ISO,
        p.p6)
}

export default defineHero({
    id: "khazix", name: "Kha'Zix", role: "assassin", damage: "physical", ...k.base,
    bot: k.bot,
    desc: "Mối Họa Hư Không: Cô Lập con mồi thiếu buff rồi săn nó, lặn đi và nạp thêm một nhát Q.",
    passive: {
        name: "Sát Thủ Hư Không",
        desc: `Đầu mỗi lượt của bạn và mỗi lần Kha'Zix đổi đường, tướng địch đối diện có ${p.p1}% bị Cô Lập trong ${p.p6} đơn vị; thêm ${p.p2}% nếu nó không có hiệu ứng có lợi nào (kể cả Khiên), thêm ${p.p3}% nếu nó có hiệu ứng bất lợi. Địch đối diện đang Tàng Hình bị lộ và luôn bị Cô Lập. Đòn đánh của Kha'Zix lên tướng Cô Lập gây thêm {${F_P}} sát thương vật lý.`,
    },
    hooks: {
        onTurnStart(g, me, d) {
            if (d.side === me.side) throwIsolation(g,
                me)
        },
        onMove(g, me, d) {
            if (d.unit.id === me.id || d.with?.id === me.id) throwIsolation(g,
                me)
        },
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss || !g.isolated(d.target)) return
            d.info.bonus.push({
                raw: g.f(me,
                    F_P), kind: "physical"
            })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Nếm Thử Nỗi Sợ", target: "opposite", mana: p.q0,
            desc: `Tướng địch đối diện nhận {${F_Q}} sát thương vật lý; nếu nó đang Cô Lập, nhận thêm {${F_Q2}}.`,
            resolve(c) {
                const t = c.target
                if (!t || t.side === c.side) return
                const extra = c.g.isolated(t) ? c.f(F_Q2) : 0
                c.g.damage(c.self,
                    t,
                    c.f(F_Q) + extra,
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
        E: {
            key: "E", name: "Vồ Mồi", target: "enemy", mana: p.e0,
            desc: `Chọn 1 tướng địch bất kỳ đường; Kha'Zix đổi chỗ sang đường đối diện nó rồi gây {${F_E}} sát thương vật lý.`,
            resolve(c) {
                const t = c.target
                if (!t || t.side === c.side || t.token || t.status !== "board") return
                if (c.g.opposite(c.self)?.id !== t.id && !c.g.faceEnemy(c.self,
                    t)) return
                c.g.damage(c.self,
                    t,
                    c.f(F_E),
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
        R: {
            key: "R", name: "Tấn Công Hư Không", target: "none", mana: p.r0, quick: true, quickWhen: when.targetsSelf,
            desc: `Quick. Kha'Zix Tàng Hình ${p.r1} đơn vị và né đòn đang nhắm vào mình, nhận 1 lá Q miễn phí tồn tại tới hết lượt đối phương; lá này biến mất và 1 lá R mới được xáo vào ${p.r2} lá trên cùng bộ bài. Dùng được khi địch nhắm đúng Kha'Zix.`,
            resolve(c) {
                const g = c.g
                c.vanish()
                g.timed(c.self,
                    c.self,
                    "stealth",
                    p.r1)
                // Dùng trong lượt địch thì phần còn lại của lượt đó đã tính 1 đơn vị: cờ freeQSpansNextTurn kéo lá Q miễn phí sang lượt kế của địch
                const spans = k.flag("freeQSpansNextTurn") && g.s.active !== c.side
                const q = g.tempSkillCard("khazix",
                    c.side,
                    "Q",
                    {
                        manaOff: p.q0
                    })
                if (spans) q.until = g.unitsUntil(c.side,
                    2)
                g.giveCard(c.side,
                    q,
                    "hand")
                g.insertTopN(c.side,
                    g.skillCard("khazix",
                        c.side,
                        "R"),
                    p.r2)
            },
        },
    },
    en: {
        desc: "Void Reaver: Isolate prey that lacks buffs and hunt it, vanish and load another Q.",
        passive: {
            name: "Void Assassin",
            desc: `At the start of each of your turns and each time Kha'Zix changes lane, the enemy champion opposite has a ${p.p1}% chance to become Isolated for ${p.p6} units; +${p.p2}% if it has no beneficial effect (Shields included), +${p.p3}% if it has a harmful effect. A Stealthed enemy opposite is revealed and always Isolated. Kha'Zix's attacks on an Isolated champion deal {${EN_P}} extra physical damage.`,
        },
        skills: {
            Q: {
                name: "Taste Their Fear",
                desc: `The enemy champion opposite takes {${EN_Q}} physical damage; if it is Isolated, it takes {${EN_Q2}} more.`,
            },
            E: {
                name: "Leap",
                desc: `Choose 1 enemy champion on any lane; Kha'Zix swaps to the lane opposite it and deals {${EN_E}} physical damage.`,
            },
            R: {
                name: "Void Assault",
                desc: `Quick. Kha'Zix gains Stealth for ${p.r1} units and dodges the action targeting him, and receives 1 free Q card that lasts until the end of the opponent's turn; this card disappears and a new R is shuffled into the top ${p.r2} cards of your deck. Can be played when an enemy targets exactly Kha'Zix.`,
            },
        },
    },
})
