// Gangplank (Đấu sĩ, vật lý). Bộ chiêu chốt 31/10 – 01/11/2026, số liệu ở balance/heroes/gangplank.json (docs/heroes/KITS.md).
// CHẤT: "Gài Thùng bịp": nút Úp Lá (HeroDef.abilities) úp 1 lá tay thành Thùng 0 Thuốc Súng; E cũng tự úp thành Thùng 3 Thuốc Súng.
// Thùng là vật triệu hồi úp ở ô phụ (1 Máu, tối đa 1, mọi vai địch đánh được). Vỡ hoặc nổ thì lật rồi xử lý theo lá bên trong:
// lá chiêu nổ theo Thuốc Súng, Vàng cho 2 Vàng, đồ về tay, lá khác hồi máu. Truy Nã (R) ép mọi Thùng nổ theo Thuốc Súng lên đúng 1 tướng.
// Bí mật: lá và Thuốc Súng nằm trong token.card / token.secret (CardRoom che tới khi lật). Sự kiện "ability" không mang lá; Thuốc Súng
// không đặt vào stack để không phát sự kiện "stack" lộ số.
import {
    kit, spike
} from "../balance"
import {
    defineHero
} from "../registry"
import type {
    Game
} from "../game"
import type {
    Card, PlayArgs, Unit
} from "../types"
import {
    otherSide
} from "../types"

const k = kit("gangplank"), { p } = k
export const KEG = "keg"
export const STASH = "gp_stash"
/** Trạng thái Truy Nã trên tướng địch (thời hạn) và stack số hạn (turnNo) để vẫn nhận ra khi nó bị hạ (g.kill xoá status) */
export const WANTED = "gp_wanted"
export const WANTED_UNTIL = "aura:gp_wanted"
export const F_Q_HEAL = k.x("q1 + q2·Máu tối đa"), EN_Q_HEAL = k.xe("q1 + q2·Máu tối đa")
export const F_Q_ARMOR = k.x("q3 + q4·Máu tối đa"), EN_Q_ARMOR = k.xe("q3 + q4·Máu tối đa")
export const F_OTHER_HEAL = k.x("p5 + p6·Máu tối đa"), EN_OTHER_HEAL = k.xe("p5 + p6·Máu tối đa")

/** Thùng của Gangplank `me` đang ở ô phụ */
export const kegOf = (g: Game, me: Unit): Unit | undefined => {
    const t = g.tokenOf(me.side)
    return t?.token?.id === KEG && t.token.ownerId === me.id ? t : undefined
}
/** Thuốc Súng của Thùng (bí mật, nằm trong token.secret) */
export const powderOf = (t: Unit) => Number(t.token?.secret?.powder ?? 0)
/** Sát thương một vụ nổ n Thuốc Súng: p2·n·(1 + n/p4)·(1 + p3·AD) */
export const blastDamage = (g: Game, me: Unit, n: number) => spike(p.p2,
    n,
    p.p4) * (1 + p.p3 * g.atk(me))

function placeKeg(g: Game, me: Unit, card: Card, powder: number) {
    g.summonToken(me.side,
        {
            id: KEG, name: "Thùng", hp: p.p8, armor: p.p9, mr: p.p10, ownerId: me.id, soak: false, hidden: true, card, secret: {
                powder
            },
        })
}

/** Tướng địch đang bị Truy Nã */
const wantedOf = (g: Game, me: Unit) => g.heroes(otherSide(me.side)).find((u) => g.has(u,
    WANTED))

/** Một vụ nổ n Thuốc Súng. Truy Nã: chỉ tướng bị truy nã nhận r2%. Địch phá: chỉ kẻ phá nhận. Tự kích: mọi tướng địch nhận. */
function explode(g: Game, me: Unit, n: number, breaker: Unit | undefined) {
    const raw = blastDamage(g,
        me,
        n)
    const mark = wantedOf(g,
        me)
    if (mark) {
        g.damage(me,
            mark,
            raw * p.r2 / 100,
            "physical",
            {
                tag: "effect"
            })
        return
    }
    if (breaker) {
        g.damage(me,
            breaker,
            raw,
            "physical",
            {
                tag: "effect"
            })
        return
    }
    for (const t of g.heroes(otherSide(me.side))) g.damage(me,
        t,
        raw,
        "physical",
        {
            tag: "effect", aoe: true
        })
}

const isSkillCard = (c: Card) => c.kind === "skill" || !!c.copyOf
const isGold = (c: Card) => c.kind === "support" && c.id === "gold"
const isItem = (c: Card) => c.kind === "support" && (c.id === "item" || c.id === "legend")

/** Thùng vỡ hoặc nổ (đã lật): xử lý theo lá bên trong. killer = kẻ phá (địch) hoặc chính Gangplank (tự kích). */
function resolveKeg(g: Game, me: Unit, keg: Unit, killer: Unit | undefined) {
    const card = keg.token?.card
    const n = powderOf(keg)
    const breaker = killer && killer.side !== me.side && !killer.token ? killer : undefined
    if (wantedOf(g,
        me)) { // Truy Nã: lá gì cũng nổ theo Thuốc Súng
        explode(g,
            me,
            n,
            undefined)
        if (card) g.giveCard(me.side,
            card,
            "grave")
        return
    }
    if (!card) return
    if (isSkillCard(card)) {
        explode(g,
            me,
            n,
            breaker)
        g.giveCard(me.side,
            card,
            "grave")
    } else if (isGold(card)) {
        for (let i = 0; i < p.p7; i++) g.giveCard(me.side,
            g.supportCard("gold"),
            "hand")
    } else if (isItem(card)) {
        g.giveCard(me.side,
            card,
            "hand")
    } else {
        g.heal(me,
            me,
            g.f(me,
                F_OTHER_HEAL))
        g.giveCard(me.side,
            card,
            "grave")
    }
}

/** Lá hợp lệ để úp: mỗi loại lá một lựa chọn (bỏ lá băng, lá tạm, lá đặc biệt) */
const sigOf = (c: Card) => `${c.kind}|${c.id}|${c.hero ?? ""}|${c.item ?? ""}|${c.copyOf ?? ""}`
function stashOptions(g: Game, me: Unit): PlayArgs[] {
    if (!g.canAct(me) || g.tokenOf(me.side) || g.s.extra[me.side]) return []
    if (me.stacks[`once:${STASH}`] === g.s.turnNo || g.manaOf(me) < p.p1) return []
    const seen = new Set<string>(), out: PlayArgs[] = []
    for (const c of g.player(me.side).hand) {
        if (c.frozen || c.temp || c.kind === "special" || seen.has(sigOf(c))) continue
        seen.add(sigOf(c))
        out.push({
            pick: c.uid
        })
    }
    return out
}

export default defineHero({
    id: "gangplank", name: "Gangplank", role: "fighter", damage: "physical", ...k.base,
    bot: k.bot,
    desc: "Đấu sĩ trụ đường nhờ Cam, úp lá thành Thùng Thuốc Súng để địch phải đoán: phá nhầm thì ăn nổ, bỏ qua thì Thùng to dần.",
    passive: {
        name: "Thuốc Súng Bilgewater",
        desc: `Đầu lượt mình, Thùng của Gangplank thêm 1 Thuốc Súng, không trần. Đòn đánh của Gangplank vào Thùng mình kích nổ nó. Nút Úp Lá (${p.p1} mana, một lần mỗi lượt, khi ô phụ trống): úp 1 lá trên tay thành Thùng 0 Thuốc Súng, đối thủ không thấy lá. Thùng là vật triệu hồi úp ở ô phụ, ${p.p8} Máu, tối đa 1; mọi vai địch đánh được. Vỡ hoặc nổ thì lật: lá chiêu nổ ${p.p2}·n·(1 + n/${p.p4})·(1 + ${p.p3}·AD) sát thương vật lý (n = Thuốc Súng), địch phá thì chỉ kẻ phá nhận, tự kích thì mọi tướng địch nhận; Vàng cho ${p.p7} lá Vàng; đồ về tay; lá khác hồi {${F_OTHER_HEAL}} Máu.`,
    },
    en: {
        desc: "A fighter who holds the lane with oranges and stashes cards as hidden Powder Kegs: break the wrong one and it explodes, leave it alone and it grows.",
        passive: {
            name: "Bilgewater Gunpowder",
            desc: `At the start of your turn, Gangplank's Keg gains 1 Powder, no cap. Gangplank's attack on his own Keg detonates it. Stash button (${p.p1} mana, once per turn, while the extra slot is empty): stash 1 card from your hand as a Keg with 0 Powder; the opponent cannot see the card. The Keg is a face-down summon in the extra slot, 1 HP, max 1; every enemy role can attack it. When it breaks or explodes it flips: a skill card explodes for ${p.p2}·n·(1 + n/${p.p4})·(1 + ${p.p3}·AD) physical damage (n = Powder), only the breaker takes it when an enemy broke it, every enemy champion takes it when Gangplank detonates; Gold gives 2 Gold cards; an item returns to hand; any other card heals {${EN_OTHER_HEAL}} HP.`,
        },
        skills: {
            Q: {
                name: "Parrrley",
                desc: `Heal {${EN_Q_HEAL}} HP and gain {${EN_Q_ARMOR}} Armor for ${p.q5} units. Search your deck for 1 E card.`,
            },
            E: {
                name: "Powder Keg",
                desc: `While the extra slot is empty: stash this card as a Keg with ${p.e1} Powder; the opponent cannot see it afterwards.`,
            },
            R: {
                name: "Wanted Order",
                desc: `Choose 1 enemy champion in any lane; mark it Wanted for ${p.r1} units and detonate your Keg: whatever card it holds explodes by Powder. While the mark lasts, every Keg explosion hits only the marked champion for ${p.r2}% damage. If it is taken down while Wanted, gain ${p.r3} Gold cards.`,
            },
        },
    },
    abilities: [{
        id: STASH,
        name: "Úp Lá", nameEn: "Stash Card",
        desc: `Một lần mỗi lượt, tốn ${p.p1} mana, khi ô phụ trống: úp 1 lá trên tay thành Thùng 0 Thuốc Súng; đối thủ không thấy lá.`,
        descEn: `Once per turn, ${p.p1} mana, while the extra slot is empty: stash 1 card from your hand as a Keg with 0 Powder; the opponent cannot see the card.`,
        options: stashOptions,
        resolve(g, me, args) {
            const card = g.player(me.side).hand.find((c) => c.uid === args.pick)
            if (!card || !g.spendMana(me,
                p.p1,
                card)) return
            g.oncePerTurn(me,
                STASH)
            const hand = g.player(me.side).hand
            hand.splice(hand.findIndex((c) => c.uid === card.uid),
                1)
            placeKeg(g,
                me,
                card,
                0)
        },
    }],
    extraAttackTargets(g, me) {
        if (g.s.active !== me.side) return []
        const keg = kegOf(g,
            me)
        return keg ? [keg] : []
    },
    hooks: {
        onTurnStart(g, me, d) {
            if (d.side !== me.side) return
            const keg = kegOf(g,
                me)
            if (keg?.token) keg.token.secret = {
                ...keg.token.secret, powder: powderOf(keg) + 1
            }
        },
        onDeath(g, me, d) {
            const v = d.victim
            if (v.token?.id === KEG && v.token.ownerId === me.id) { resolveKeg(g,
                me,
                v,
                d.killer); return }
            // Truy Nã: tướng bị truy nã bị hạ trong hạn thì Gangplank nhận r3 Vàng
            if (!v.token && v.side !== me.side && (v.stacks[WANTED_UNTIL] ?? 0) >= g.s.turnNo) {
                v.stacks[WANTED_UNTIL] = 0
                for (let i = 0; i < p.r3; i++) g.giveCard(me.side,
                    g.supportCard("gold"),
                    "hand")
            }
        },
    },
    skills: {
        Q: {
            key: "Q", mana: p.q0, name: "Ăn Cam", target: "self",
            desc: `Hồi {${F_Q_HEAL}} Máu và nhận {${F_Q_ARMOR}} Giáp trong ${p.q5} đơn vị. Tìm 1 lá E trong bộ bài.`,
            resolve(c) {
                c.g.heal(c.self,
                    c.self,
                    c.f(F_Q_HEAL))
                c.g.timed(c.self,
                    c.self,
                    "armor_up",
                    p.q5,
                    {
                        v: Math.round(c.f(F_Q_ARMOR))
                    })
                c.g.tutor(c.side,
                    (x) => x.kind === "skill" && x.id === "gangplank_e" && x.side === c.side)
            },
        },
        E: {
            key: "E", mana: p.e0, name: "Thùng Thuốc Súng", target: "none",
            desc: `Khi ô phụ trống: úp lá này thành Thùng ${p.e1} Thuốc Súng; đối thủ không thấy nó nữa.`,
            canPlay: (c) => !c.g.tokenOf(c.side),
            resolve(c) {
                if (c.g.tokenOf(c.side)) return // ô phụ vừa bị chiếm trong lúc chờ Chuỗi: lá vào mộ như thường
                c.vanish()
                placeKeg(c.g,
                    c.self,
                    c.card,
                    p.e1)
            },
        },
        R: {
            key: "R", mana: p.r0, name: "Lệnh Truy Nã", target: "enemy",
            desc: `Chọn 1 tướng địch ở đường bất kỳ; đặt Truy Nã ${p.r1} đơn vị và kích nổ Thùng của bạn: lá gì cũng nổ theo Thuốc Súng. Trong hạn, mọi Thùng nổ chỉ đánh tướng này ${p.r2}% sát thương. Nó bị hạ trong hạn: nhận ${p.r3} lá Vàng.`,
            resolve(c) {
                const t = c.target!
                c.g.timed(c.self,
                    t,
                    WANTED,
                    p.r1)
                const st = t.statuses[WANTED]
                if (st) c.g.setStack(t,
                    WANTED_UNTIL,
                    st.until)
                const keg = kegOf(c.g,
                    c.self)
                if (keg) c.g.kill(keg,
                    c.self)
            },
        },
    },
})
