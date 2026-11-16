// Gangplank (Đấu sĩ, vật lý). Thầy chốt lại 2026-11-16, số liệu ở balance/heroes/gangplank.json. Mọi chiêu 0 mana, chỉ chạm tướng đối diện.
// CHẤT: "Thuyền Trưởng Bịp": nút Úp Lá (HeroDef.abilities, 0 mana) úp 1 lá tay thành Thùng 0 Thuốc Súng; E Ăn Cam cũng úp chính nó thành
// Thùng e4 Thuốc Súng khi ô phụ trống. Thùng là bẫy úp ở ô phụ (1 Máu, tối đa 1, mọi vai địch đánh được). Vỡ hoặc nổ thì lật rồi xử lý theo
// lá bên trong: lá chiêu nổ vào TƯỚNG ĐỐI DIỆN Gangplank (dù ai phá), Vàng cho 2 Vàng, đồ về tay, lá khác hồi máu.
// R Truy Nã tướng đối diện: chém, rồi kích nổ Thùng (lá gì cũng nổ, thêm r5%). Hạ nó trong hạn thì nhận Vàng.
// Bí mật: lá và Thuốc Súng nằm trong token.card / token.secret (CardRoom che tới khi lật). Sự kiện "ability" không mang lá; Thuốc Súng
// không đặt vào stack để không phát sự kiện "stack" lộ số.
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
    Card, PlayArgs, Unit
} from "../types"

const k = kit("gangplank"), { p } = k
export const KEG = "keg"
export const STASH = "gp_stash"
/** Trạng thái Truy Nã trên tướng địch (thời hạn) và stack số hạn (turnNo) để vẫn nhận ra khi nó bị hạ (g.kill xoá status) */
export const WANTED = "gp_wanted"
export const WANTED_UNTIL = "aura:gp_wanted"
/** Hiệu ứng khống chế mà Ăn Cam giải */
const CLEANSE = ["stun",
    "silence",
    "root",
    "knockup",
    "taunt",
    "charm",
    "blind",
    "disarm"]
export const F_BLAST = k.x("p2 + p3·AD + p4·Máu tối đa"), EN_BLAST = k.xe("p2 + p3·AD + p4·Máu tối đa")
export const F_OTHER_HEAL = k.x("p5 + p6·Máu tối đa"), EN_OTHER_HEAL = k.xe("p5 + p6·Máu tối đa")
export const F_Q = k.x("q1 + q2·AD + q3·Máu tối đa"), EN_Q = k.xe("q1 + q2·AD + q3·Máu tối đa")
export const F_E_HEAL = k.x("e1 + e2·Máu tối đa"), EN_E_HEAL = k.xe("e1 + e2·Máu tối đa")
export const F_E_ARMOR = k.x("e5 + e6·Máu tối đa"), EN_E_ARMOR = k.xe("e5 + e6·Máu tối đa")
export const F_R = k.x("r2 + r3·AD + r4·Máu tối đa"), EN_R = k.xe("r2 + r3·AD + r4·Máu tối đa")

/** Thùng của Gangplank `me` đang ở ô phụ */
export const kegOf = (g: Game, me: Unit): Unit | undefined => {
    const t = g.tokenOf(me.side)
    return t?.token?.id === KEG && t.token.ownerId === me.id ? t : undefined
}
/** Thuốc Súng của Thùng (bí mật, nằm trong token.secret) */
export const powderOf = (t: Unit) => Number(t.token?.secret?.powder ?? 0)
/** Sát thương một vụ nổ n Thuốc Súng: n·(p2 + p3·AD + p4·Máu tối đa) */
export const blastDamage = (g: Game, me: Unit, n: number) => n * g.f(me,
    F_BLAST)

function placeKeg(g: Game, me: Unit, card: Card, powder: number) {
    g.summonToken(me.side,
        {
            id: KEG, name: "Thùng", hp: p.p8, armor: p.p9, mr: p.p10, ownerId: me.id, soak: false, hidden: true, card, secret: {
                powder
            },
        })
}

/** Tướng đối diện Gangplank, nếu đang bị Truy Nã */
const wantedFoe = (g: Game, me: Unit) => {
    const t = g.opposite(me)
    return t && !t.token && g.has(t,
        WANTED) ? t : undefined
}

/** Một vụ nổ n Thuốc Súng: chỉ tướng đối diện Gangplank nhận (đang bị Truy Nã thì thêm r5%) */
function explode(g: Game, me: Unit, n: number) {
    const t = g.opposite(me)
    if (!t || t.token || n <= 0) return
    const amp = wantedFoe(g,
        me) ? 1 + p.r5 / 100 : 1
    g.damage(me,
        t,
        blastDamage(g,
            me,
            n) * amp,
        "physical",
        {
            tag: "effect"
        })
}

const isSkillCard = (c: Card) => c.kind === "skill" || !!c.copyOf
const isGold = (c: Card) => c.kind === "support" && c.id === "gold"
const isItem = (c: Card) => c.kind === "support" && (c.id === "item" || c.id === "legend")

/** Thùng vỡ hoặc nổ (đã lật): xử lý theo lá bên trong. Đối diện đang bị Truy Nã thì lá gì cũng nổ. */
function resolveKeg(g: Game, me: Unit, keg: Unit) {
    const card = keg.token?.card
    const n = powderOf(keg)
    if (wantedFoe(g,
        me)) {
        explode(g,
            me,
            n)
        if (card) g.giveCard(me.side,
            card,
            "grave")
        return
    }
    if (!card) return
    if (isSkillCard(card)) {
        explode(g,
            me,
            n)
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

const hasFoe = (g: Game, me: Unit) => !!g.opposite(me)

export default defineHero({
    id: "gangplank", name: "Gangplank", role: "fighter", damage: "physical", ...k.base,
    bot: k.bot,
    desc: "Thuyền Trưởng Bịp: úp lá thành Thùng Thuốc Súng để địch phải đoán. Phá nhầm thì tướng đứng trước Gangplank ăn nổ, bỏ qua thì Thùng to dần.",
    passive: {
        name: "Thuốc Súng Bilgewater",
        desc: `Nút Úp Lá (${p.p1} mana, một lần mỗi lượt, khi ô phụ trống): úp 1 lá trên tay thành Thùng 0 Thuốc Súng, đối thủ không thấy lá. Đầu lượt mình, Thùng thêm 1 Thuốc Súng, không trần. Đòn đánh của Gangplank vào Thùng mình kích nổ nó. Thùng là bẫy úp ở ô phụ, ${p.p8} Máu, tối đa 1; mọi vai địch đánh được. Vỡ hoặc nổ thì lật: lá chiêu nổ vào tướng địch đối diện Gangplank, mỗi Thuốc Súng {${F_BLAST}} sát thương vật lý; Vàng cho ${p.p7} lá Vàng; đồ về tay; lá khác hồi {${F_OTHER_HEAL}} Máu.`,
    },
    en: {
        desc: "Bluffing Captain: stashes cards as hidden Powder Kegs for the enemy to guess. Break the wrong one and whoever stands opposite Gangplank eats the blast; leave it alone and it grows.",
        passive: {
            name: "Bilgewater Gunpowder",
            desc: `Stash button (${p.p1} mana, once per turn, while the extra slot is empty): stash 1 card from your hand as a Keg with 0 Powder; the opponent cannot see the card. At the start of your turn, the Keg gains 1 Powder, no cap. Gangplank's attack on his own Keg detonates it. The Keg is a face-down trap in the extra slot, ${p.p8} HP, max 1; every enemy role can attack it. When it breaks or explodes it flips: a skill card explodes on the enemy opposite Gangplank for {${EN_BLAST}} physical damage per Powder; Gold gives ${p.p7} Gold cards; an item returns to hand; any other card heals {${EN_OTHER_HEAL}} HP.`,
        },
        skills: {
            Q: {
                name: "Parrrley",
                desc: `The opposite enemy takes {${EN_Q}} physical damage. If it is taken down, gain ${p.q4} Gold card(s). Search your deck for 1 E card.`,
            },
            E: {
                name: "Remove Scurvy",
                desc: `Quick. When an enemy targets exactly Gangplank, you may play this card (it can also be played proactively): heal {${EN_E_HEAL}} HP, remove crowd control and gain {${EN_E_ARMOR}} Armor for ${p.e3} units. If the extra slot is empty, this card is stashed as a Keg with ${p.e4} Powder.`,
            },
            R: {
                name: "Wanted Order",
                desc: `Mark the opposite enemy Wanted for ${p.r1} units, it takes {${EN_R}} physical damage, then detonate your Keg: whatever card it holds explodes by Powder, ${p.r5}% more on a Wanted target. If it is taken down while Wanted, gain ${p.r6} Gold cards.`,
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
                v); return }
            // Truy Nã: tướng bị truy nã bị hạ trong hạn thì Gangplank nhận r6 Vàng
            if (!v.token && v.side !== me.side && (v.stacks[WANTED_UNTIL] ?? 0) >= g.s.turnNo) {
                v.stacks[WANTED_UNTIL] = 0
                for (let i = 0; i < p.r6; i++) g.giveCard(me.side,
                    g.supportCard("gold"),
                    "hand")
            }
        },
    },
    skills: {
        Q: {
            key: "Q", mana: p.q0, name: "Bắn Súng", target: "opposite",
            desc: `Tướng địch đối diện nhận {${F_Q}} sát thương vật lý. Hạ được nó thì nhận ${p.q4} lá Vàng. Tìm 1 lá E trong bộ bài.`,
            canPlay: (c) => hasFoe(c.g,
                c.self),
            resolve(c) {
                const g = c.g, t = c.target!
                g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "physical",
                    {
                        tag: "skill"
                    })
                if (!t.token && t.status === "dead") for (let i = 0; i < p.q4; i++) g.giveCard(c.side,
                    g.supportCard("gold"),
                    "hand")
                g.tutor(c.side,
                    (x) => x.kind === "skill" && x.id === "gangplank_e" && x.side === c.side)
            },
        },
        E: {
            key: "E", mana: p.e0, name: "Ăn Cam", target: "none", quick: true,
            quickWhen: when.targetsSelf,
            desc: `Quick. Khi địch nhắm đúng Gangplank, bạn có thể dùng lá này (dùng chủ động cũng được): hồi {${F_E_HEAL}} Máu, giải khống chế và nhận {${F_E_ARMOR}} Giáp trong ${p.e3} đơn vị. Nếu ô phụ trống, lá này úp thành Thùng ${p.e4} Thuốc Súng.`,
            resolve(c) {
                const g = c.g, me = c.self
                if (me.status === "board") {
                    for (const id of CLEANSE) g.removeStatus(me,
                        id)
                    g.heal(me,
                        me,
                        c.f(F_E_HEAL))
                    g.timed(me,
                        me,
                        "armor_up",
                        p.e3,
                        {
                            v: Math.round(c.f(F_E_ARMOR))
                        })
                }
                if (g.tokenOf(c.side) || g.s.extra[c.side]) return // ô phụ có người: lá vào mộ như thường
                c.vanish()
                placeKeg(g,
                    me,
                    c.card,
                    p.e4)
            },
        },
        R: {
            key: "R", mana: p.r0, name: "Lệnh Truy Nã", target: "opposite",
            desc: `Truy Nã tướng địch đối diện ${p.r1} đơn vị, nó nhận {${F_R}} sát thương vật lý, rồi kích nổ Thùng của bạn: lá gì cũng nổ theo Thuốc Súng, thêm ${p.r5}% lên tướng bị Truy Nã. Nó bị hạ trong hạn: nhận ${p.r6} lá Vàng.`,
            canPlay: (c) => hasFoe(c.g,
                c.self),
            resolve(c) {
                const g = c.g, t = c.target!
                g.timed(c.self,
                    t,
                    WANTED,
                    p.r1)
                const st = t.statuses[WANTED]
                if (st) g.setStack(t,
                    WANTED_UNTIL,
                    st.until)
                g.damage(c.self,
                    t,
                    c.f(F_R),
                    "physical",
                    {
                        tag: "skill"
                    })
                const keg = kegOf(g,
                    c.self)
                if (keg) g.kill(keg,
                    c.self)
            },
        },
    },
})
