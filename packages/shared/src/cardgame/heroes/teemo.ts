// Teemo (Xạ thủ). Chất: NẤM TRONG BỘ BÀI ĐỊCH. Nấm là lá đặc biệt "mushroom" (SpecialCardDef.onDraw) xáo vào bộ đối thủ.
// Rút trúng: tướng tỉ lệ Máu thấp nhất của người rút nhận sát thương vật lý theo chỉ số Teemo (có thể chí mạng), rồi người rút bù 1 lá.
// Cờ halveMushroomsOnDeath (JSON): Teemo chết thì kho Nấm trong bộ đối thủ mất một nửa (chờ thầy chốt, hiện tắt).
// Client vẽ Nấm qua sự kiện "mushroom" (phase plant / burst): giữ nguyên hình dạng sự kiện.
import {
    kit, actorOrEnemy, when
} from "../balance"
import type {
    Game
} from "../game"
import {
    defineHero, defineSpecialCard
} from "../registry"
import {
    otherSide, RULES, type PlayArgs, type Side, type Unit
} from "../types"

const k = kit("teemo"), {
    p
} = k

const F_MUSH = k.x("p2 + p3·AD + p4·Tốc Đánh"), EN_MUSH = k.xe("p2 + p3·AD + p4·Tốc Đánh")
const F_Q = k.x("q2 + q3·AD"), EN_Q = k.xe("q2 + q3·AD")
const F_E = k.x("e1 + e2·AD"), EN_E = k.xe("e1 + e2·AD")
const F_E_BLIND = k.x("e4 + e5·AD"), EN_E_BLIND = k.xe("e4 + e5·AD")
const F_E_PER = String(p.e3)
const F_R = k.x("r2 + r3·AD + r4·Tốc Đánh"), EN_R = k.xe("r2 + r3·AD + r4·Tốc Đánh")

/** Chí mạng của sát thương tính tay: tung theo Chí mạng hiện có, hệ số như đòn đánh */
function rollCrit(g: Game, u: Unit): { crit: boolean; m: number } {
    const st = g.stats(u)
    const crit = g.statusV(u,
        "alwaysCrit") > 0 || (st.crit > 0 && g.rand() < Math.min(1,
        st.crit))
    return {
        crit, m: crit ? RULES.critBase + st.critDmg : 1
    }
}

/** Tướng sống có tỉ lệ Máu thấp nhất của `side` (hoà thì theo thứ tự đơn vị ổn định) */
function lowestRatio(g: Game, side: Side): Unit | undefined {
    let best: Unit | undefined
    for (const u of g.heroes(side)) if (!best || u.hp / u.maxHp < best.hp / best.maxHp) best = u
    return best
}

/** Nấm nổ lên tướng có tỉ lệ Máu thấp nhất của `side` (sát thương theo chỉ số Teemo `teemo`, có thể chí mạng) */
function explode(g: Game, teemo: Unit | undefined, side: Side, tag: "effect" | "skill") {
    const t = lowestRatio(g,
        side)
    if (!teemo || !t) return
    g.emit({
        t: "mushroom", side, source: teemo.id, phase: "burst", count: 1, target: t.id, drawn: tag === "effect"
    })
    const cr = rollCrit(g,
        teemo)
    g.damage(teemo,
        t,
        g.f(teemo,
            F_MUSH) * cr.m,
        "physical",
        {
            tag, crit: cr.crit, visuals: ["poisonHit"]
        })
}

defineSpecialCard({
    id: "mushroom", name: "Nấm",
    desc: `Lá nằm trong bộ bài bạn. Rút trúng thì nổ: tướng sống có tỉ lệ Máu thấp nhất của bạn nhận {${F_MUSH}} sát thương vật lý (theo Teemo, có thể chí mạng), rồi bạn rút bù 1 lá. Nấm không vào tay.`,
    onDraw(g, card, side) {
        explode(g,
            g.unit(`${card.side ?? otherSide(side)}:teemo`),
            side,
            "effect")
        if (g.s.phase === "over") return
        // Nấm không chiếm lượt rút: rút bù 1 lá như thường
        g.draw(side,
            1,
            {
                reason: "effect"
            })
    },
})

const isMushroom = (c: { kind: string; id: string }) => c.kind === "special" && c.id === "mushroom"

/** Số Nấm của Teemo đang nằm trong bộ bài của phe địch với `side` */
export const mushroomsIn = (g: Game, side: Side) => g.countInDeck(otherSide(side),
    isMushroom)

/** Xáo n Nấm của Teemo (phe `side`) vào bộ bài đối thủ */
export function plant(g: Game, side: Side, n: number) {
    if (n <= 0) return
    g.emit({
        t: "mushroom", side: otherSide(side), source: `${side}:teemo`, phase: "plant", count: n
    })
    const cards = Array.from({
        length: n
    },
    () => g.newCard({
        kind: "special", id: "mushroom", hero: "teemo", side
    }))
    g.shuffleIn(otherSide(side),
        cards)
}

export default defineHero({
    id: "teemo", name: "Teemo", role: "marksman", damage: "magic", ...k.base,
    desc: "Không cần giết ai: gài Nấm vào bộ bài địch, rút trúng là nổ vào đứa yếu nhất; ai đánh Teemo thì bị Mù.",
    passive: {
        name: "Nấm Độc",
        desc: `Mỗi đòn trúng tướng địch xáo ${p.p1} Nấm vào bộ đối thủ, không trần. Địch rút trúng Nấm: tướng có tỉ lệ Máu thấp nhất của họ nhận {${F_MUSH}} sát thương vật lý, có thể chí mạng, rồi họ rút bù 1 lá. Nấm không vào tay.${k.flag("halveMushroomsOnDeath") ? " Teemo bị hạ: kho Nấm trong bộ đối thủ mất một nửa." : ""}`,
    },
    hooks: {
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss || d.target.token || d.target.side === me.side) return
            plant(g,
                me.side,
                p.p1)
        },
        onDeath(g, me, d) {
            if (d.victim.id !== me.id || !k.flag("halveMushroomsOnDeath")) return
            const foe = otherSide(me.side)
            const cards = g.deckCards(foe,
                isMushroom)
            for (const m of cards.slice(0,
                Math.floor(cards.length * p.p5))) g.takeFromDeck(foe,
                m.uid)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Gài Nấm", target: "enemy", mana: p.q0,
            desc: `Chọn 1 tướng địch; gây {${F_Q}} sát thương vật lý rồi xáo ${p.q1} Nấm vào bộ đối thủ.`,
            resolve(c) {
                c.g.damage(c.self,
                    c.target!,
                    c.f(F_Q),
                    "physical",
                    {
                        tag: "skill"
                    })
                plant(c.g,
                    c.side,
                    p.q1)
            },
        },
        E: {
            key: "E", name: "Phi Tiêu Mù", target: "enemy", mana: p.e0, quick: true, quickWhen: when.attacksSelf,
            desc: `Quick. Khi địch đánh Teemo, bạn có thể dùng lá này; mục tiêu là kẻ đó (dùng chủ động thì chọn 1 tướng địch). Gây {${F_E}} + ${F_E_PER} mỗi Nấm trong bộ đối thủ sát thương vật lý và gây Mù {${F_E_BLIND}} đơn vị (phần lẻ là xác suất thêm 1 đơn vị).`,
            options: (c): PlayArgs[] => actorOrEnemy(c),
            resolve(c) {
                const foe = c.target
                if (!foe || foe.status !== "board" || foe.side === c.side) return
                c.g.damage(c.self,
                    foe,
                    c.f(F_E) + p.e3 * mushroomsIn(c.g,
                        c.side),
                    "physical",
                    {
                        tag: "skill", visuals: ["blindHit"]
                    })
                if (foe.status !== "board") return
                const d = c.f(F_E_BLIND)
                if (d > 0) c.g.timed(c.self,
                    foe,
                    "blind",
                    d,
                    {
                        visuals: ["blindHit"]
                    })
            },
        },
        R: {
            key: "R", name: "Kích Nổ", target: "all_enemies", mana: p.r0,
            canPlay: (c) => mushroomsIn(c.g,
                c.side) > 0,
            desc: `Nổ tối đa ${p.r1} Nấm trong bộ đối thủ. Mỗi Nấm gây {${F_R}} sát thương vật lý lên tướng có tỉ lệ Máu thấp nhất lúc đó, có thể chí mạng, không rút bù.`,
            resolve(c) {
                const g = c.g
                const foe = otherSide(c.side)
                const take = g.deckCards(foe,
                    isMushroom).slice(0,
                    p.r1)
                for (const m of take) {
                    if (g.s.phase === "over") break
                    g.takeFromDeck(foe,
                        m.uid)
                    const teemo = c.self
                    const t = lowestRatio(g,
                        foe)
                    if (!t) break
                    g.emit({
                        t: "mushroom", side: foe, source: teemo.id, phase: "burst", count: 1, target: t.id, drawn: false
                    })
                    const cr = rollCrit(g,
                        teemo)
                    g.damage(teemo,
                        t,
                        c.f(F_R) * cr.m,
                        "physical",
                        {
                            tag: "skill", crit: cr.crit, visuals: ["poisonHit"]
                        })
                }
            },
        },
    },
    en: {
        desc: "Never needs to kill: plant Mushrooms in the enemy deck and let them blow up on the weakest champion when drawn; anyone who hits Teemo gets Blinded.",
        passive: {
            name: "Toxic Shot",
            desc: `Each hit on an enemy champion shuffles ${p.p1} Mushroom into the opponent's deck, unlimited. When they draw a Mushroom, their champion with the lowest HP ratio takes {${EN_MUSH}} physical damage, which can crit, then they draw 1 replacement card. Mushrooms never reach the hand.${k.flag("halveMushroomsOnDeath") ? " Teemo being taken down halves the Mushrooms in the opponent's deck." : ""}`,
        },
        skills: {
            Q: {
                name: "Noxious Trap",
                desc: `Choose 1 enemy champion; deal {${EN_Q}} physical damage, then shuffle ${p.q1} Mushrooms into the opponent's deck.`,
            },
            E: {
                name: "Blinding Dart",
                desc: `Quick. When the enemy attacks Teemo, you may play this card; the target is that attacker (played proactively, choose 1 enemy champion). Deal {${EN_E}} + ${F_E_PER} per Mushroom in the opponent's deck as physical damage and Blind for {${EN_E_BLIND}} units (the fraction is the chance of 1 extra unit).`,
            },
            R: {
                name: "Detonate",
                desc: `Blow up at most ${p.r1} Mushrooms in the opponent's deck. Each deals {${EN_R}} physical damage to the champion with the lowest HP ratio at that moment, can crit, no replacement draw.`,
            },
        },
    },
})
