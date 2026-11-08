// Malphite (Đỡ đòn, phép): "Núi đá". Không có khống chế: biến cả đội thành đá (Giáp, Máu), nối sát thương địch bằng Liên Kết Đá, giáp nát địch bằng R.
// Số liệu: balance/heroes/malphite.json. Chiêu chỉ scale Giáp.
// Engine dùng: allyBonusStats (Giáp), g.setAuraMaxHp (Máu), status "stone_link" (g.damage chia sát thương), g.timed "armor_up"/"armor_down", hook onDeath.
import {
    kit, when
} from "../balance"
import {
    defineHero
} from "../registry"
import type {
    Game
} from "../game"
import {
    FOREVER, otherSide, type PlayArgs, type Unit
} from "../types"

const k = kit("malphite"), { p } = k
const LINK = "stone_link"
const STONE = "malphite_stone"
const F_Q = k.x("q1 + q2·Giáp"), EN_Q = k.xe("q1 + q2·Giáp")
const F_Q_ARMOR = k.x("q3 + q4·Giáp"), EN_Q_ARMOR = k.xe("q3 + q4·Giáp")
const F_R = k.x("r1 + r2·Giáp"), EN_R = k.xe("r1 + r2·Giáp")
const F_R_SHRED = k.x("r3 + r4·Giáp"), EN_R_SHRED = k.xe("r3 + r4·Giáp")
const PCT_ARMOR = `${Math.round(p.p1 * 1000) / 10}%`, PCT_HP = `${Math.round(p.p2 * 1000) / 10}%`

/** Máu cộng từ Thân Đá cho mọi tướng mình (kể cả chính Malphite): theo Máu tối đa gốc của Malphite (không tính phần Thân Đá của chính nó) */
function syncStone(g: Game, me: Unit) {
    const own = me.stacks[`aura:${STONE}`] ?? 0
    const bonus = me.status === "board" ? Math.round(p.p2 * (me.maxHp - own)) : 0
    for (const u of Object.values(g.s.units)) if (u.side === me.side && !u.token) g.setAuraMaxHp(u,
        STONE,
        bonus)
}
const linkable = (g: Game, me: Unit) => g.allies(me,
    false).filter((u) => !u.token && !g.has(u,
    LINK))

export default defineHero({
    id: "malphite", name: "Malphite", role: "tank", damage: "magic", ...k.base,
    bot: k.bot,
    desc: "Ngọn núi biết đi: biến cả đội thành đá, nối sát thương địch vào cùng một khối, nghiền nát Giáp địch. Không có khống chế.",
    passive: {
        name: "Thân Đá",
        desc: `Khi Malphite ở trên sân, mọi tướng mình có thêm ${PCT_ARMOR} Giáp và ${PCT_HP} Máu tối đa của Malphite.`,
    },
    // Giáp: aura cho đồng minh (g.armor an toàn trong lúc tính aura). Máu: g.setAuraMaxHp qua syncStone.
    allyBonusStats(g, owner, target) {
        void target
        return {
            armor: p.p1 * g.armor(owner)
        }
    },
    hooks: {
        onSummon(g, me) { syncStone(g,
            me) },
        onRespawn(g, me) { syncStone(g,
            me) },
        onEquip(g, me, d) { if (d.side === me.side) syncStone(g,
            me) },
        onUnequip(g, me, d) { if (d.side === me.side) syncStone(g,
            me) },
        onTurnStart(g, me) { syncStone(g,
            me) },
        onDeath(g, me, d) {
            if (d.victim.id !== me.id) return
            // Malphite chết: mất mọi Liên Kết Đá và phần Thân Đá của đội
            for (const u of g.heroes(me.side)) g.removeStatus(u,
                LINK)
            syncStone(g,
                me)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Mảnh Vỡ Địa Chấn", target: "enemy", mana: p.q0,
            desc: `Chọn 1 tướng địch; gây {${F_Q}} sát thương phép. Mọi tướng mình nhận {${F_Q_ARMOR}} Giáp trong ${p.q5} đơn vị.`,
            resolve(c) {
                c.g.damage(c.self,
c.target!,
c.f(F_Q),
"magic",
{
    tag: "skill"
})
                const v = c.f(F_Q_ARMOR)
                for (const u of c.g.heroes(c.side)) c.g.timed(c.self,
                    u,
                    "armor_up",
                    p.q5,
                    {
                        v
                    })
            },
        },
        E: {
            key: "E", name: "Mạch Đá", target: "ally_other", mana: p.e0, quick: true,
            quickWhen: when.attackOrSkill,
            canPlay: (c) => linkable(c.g,
                c.self).length > 0,
            options: (c): PlayArgs[] => linkable(c.g,
                c.self).map((u) => ({
                target: u.id
            })),
            desc: "Quick. Khi địch đánh hoặc dùng chiêu, bạn có thể dùng lá này. Chọn 1 tướng mình khác; nó và Malphite nhận Liên Kết Đá, không hết hạn, nối được nhiều tướng: sát thương địch lên 1 tướng liên kết được chia đều cho mọi tướng liên kết, sát thương cả phe không chia. Malphite bị hạ thì mất hết liên kết; tướng bị hạ mất liên kết của nó.",
            resolve(c) {
                const t = c.target
                if (!t) return
                for (const u of [c.self,
                    t]) c.g.status(u,
                    LINK,
                    1,
                    {
                        until: FOREVER, src: c.self.id
                    })
            },
        },
        R: {
            key: "R", name: "Không Thể Cản Phá", target: "all_enemies", mana: p.r0,
            desc: `Mọi tướng địch nhận {${F_R}} sát thương phép và mất {${F_R_SHRED}} Giáp trong ${p.r5} đơn vị.`,
            resolve(c) {
                const dmg = c.f(F_R), shred = c.f(F_R_SHRED)
                for (const t of c.g.heroes(otherSide(c.side))) {
                    c.g.damage(c.self,
                        t,
                        dmg,
                        "magic",
                        {
                            tag: "skill"
                        })
                    if (t.status === "board") c.g.timed(c.self,
                        t,
                        "armor_down",
                        p.r5,
                        {
                            v: shred
                        })
                }
            },
        },
    },
    en: {
        desc: "The walking mountain: turn the whole team to stone, bind the damage enemies deal into one block and grind their Armor down. No crowd control.",
        passive: {
            name: "Granite Body",
            desc: `While Malphite is on the board, every allied champion gains ${PCT_ARMOR} of Malphite's Armor and ${PCT_HP} of Malphite's max HP.`,
        },
        skills: {
            Q: {
                name: "Seismic Shard",
                desc: `Choose 1 enemy champion; deal {${EN_Q}} magic damage. Every allied champion gains {${EN_Q_ARMOR}} Armor for ${p.q5} units.`,
            },
            E: {
                name: "Stone Vein",
                desc: "Quick. When the enemy attacks or casts a skill, you may play this card. Choose 1 allied champion other than Malphite; it and Malphite gain Stone Link, which never expires and can join many champions: damage an enemy deals to 1 linked champion is split equally among all linked champions, team-wide damage is not split. When Malphite is taken down all links vanish; a champion taken down loses its own link.",
            },
            R: {
                name: "Unstoppable Force",
                desc: `Every enemy champion takes {${EN_R}} magic damage and loses {${EN_R_SHRED}} Armor for ${p.r5} units.`,
            },
        },
    },
})
