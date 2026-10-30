// Teemo (Xạ thủ, phép): máu 320 · AD 77 · AP gốc 0 · giáp/kháng 25/26. Chất: NẤM TRONG BỘ BÀI ĐỊCH, địch rút trúng là nổ vào đứa yếu nhất.
// Nấm = lá đặc biệt "mushroom" (SpecialCardDef.onDraw). Lá Nấm nhớ phe Teemo (card.side). Nấm nổ rồi biến mất, địch vẫn rút bù 1 lá.
// Kho Nấm không trần, giữ qua chết; Nấm rút trúng dùng chỉ số đơn vị Teemo (kể cả khi Teemo đã chết), là hiệu ứng (không chí mạng).
// E: chủ động chọn 1 tướng địch bất kỳ; phản ứng chỉ khi đòn đánh địch trên cùng chỉ định Teemo và tự khoá kẻ đánh. Mù = đòn thật kế của kẻ đó trượt rồi tiêu.
// R: chọn số Nấm N (PlayArgs.amount) để tiêu, giữ phần dư; kho trống thì tự gài 3 trước. Phí 35 cố định.
// Tuning v1: mana Q/E/R = 10/15/35.
import type {
    Game
} from "../game"
import {
    defineHero, defineSpecialCard
} from "../registry"
import {
    otherSide, type PlayArgs, type Side, type Unit
} from "../types"

const F_MUSH = "100 + 40% AD + 35% AP"
const F_E = "70 + 45% AD + 40% AP"
/** Sát thương E thêm mỗi Nấm trong bộ bài địch */
const F_E_PER = "15 + 10% AD + 10% AP"
const Q_MUSH = 3
/** R: kho trống thì tự gài bấy nhiêu Nấm trước khi tiêu */
const R_EMPTY_PLANT = 3

/** Tướng sống có tỉ lệ Máu thấp nhất của `side` (hoà thì theo thứ tự đơn vị ổn định) */
function lowestRatio(g: Game, side: Side): Unit | undefined {
    let best: Unit | undefined
    for (const u of g.heroes(side)) if (!best || u.hp / u.maxHp < best.hp / best.maxHp) best = u
    return best
}

/** Nấm nổ lên tướng có tỉ lệ Máu thấp nhất của `side` (sát thương theo chỉ số Teemo `teemo`) */
function explode(g: Game, teemo: Unit | undefined, side: Side, tag: "effect" | "skill") {
    const t = lowestRatio(g,
        side)
    if (teemo && t) {
        g.emit({
            t: "mushroom", side, source: teemo.id, phase: "burst", count: 1, target: t.id, drawn: tag === "effect"
        })
        g.damage(teemo,
            t,
            g.f(teemo,
                F_MUSH),
            "magic",
            {
                tag, visuals: ["poisonHit"]
            })
    }
}

defineSpecialCard({
    id: "mushroom", name: "Nấm",
    desc: `Lá nằm trong bộ bài bạn. Rút trúng thì nổ: tướng sống có tỉ lệ Máu thấp nhất của bạn nhận {${F_MUSH}} sát thương phép (theo Teemo), rồi bạn rút bù 1 lá. Nấm không vào tay.`,
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
    id: "teemo", name: "Teemo", role: "marksman", damage: "magic", hp: 340, atk: 77, armor: 25, mr: 26,
    desc: "Không cần giết ai: gài Nấm vào bộ bài địch, rút trúng là nổ vào đứa yếu nhất; ai đánh Teemo thì bị Mù.",
    passive: {
        name: "Nấm Độc",
        desc: `Mỗi đòn thật Teemo trúng tướng địch gài 1 Nấm vào bộ địch, không trần và giữ qua chết. Rút Nấm tiêu chính lá đó, gây {${F_MUSH}} sát thương phép vào tướng sống có tỉ lệ Máu thấp nhất rồi rút bù 1 lá; Nấm không vào tay.`,
    },
    hooks: {
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss || d.target.token || d.target.side === me.side) return
            plant(g,
                me.side,
                1)
        },
    },
    skills: {
        Q: {
            key: "Q", mana: 5, name: "Gài Nấm", target: "self",
            desc: `Xáo ${Q_MUSH} Nấm của Teemo vào bộ đối phương; không cần có sẵn Nấm hoặc quyền đánh.`,
            resolve(c) {
                plant(c.g,
                    c.side,
                    Q_MUSH)
            },
        },
        E: {
            key: "E", mana: 10, name: "Phi Tiêu Mù", target: "enemy", quick: true,
            desc: `Quick. Chủ động chọn 1 tướng địch hợp lệ bất kỳ đường; khi địch đánh Teemo, phản ứng chỉ đáp đòn địch trên cùng đang chỉ định Teemo và tự khóa kẻ đánh. Gây {${F_E}} + số Nấm hiện có × ({${F_E_PER}}) sát thương phép; Mù làm đòn thật kế của kẻ đó trượt rồi tiêu.`,
            quickWhen: (c) => c.trigger.side !== c.side && c.trigger.kind === "attack" && !!c.trigger.single && c.trigger.target === c.self.id && !!c.trigger.actor,
            options(c): PlayArgs[] {
                if (c.trigger) {
                    // phản ứng: mục tiêu khoá vào kẻ đánh của mắt xích trên cùng
                    const foe = c.g.unit(c.trigger.actor ?? "")
                    return foe && foe.side !== c.side && foe.status === "board" && !foe.token && c.g.targetable(foe) ? [{
                        target: foe.id
                    }] : []
                }
                return c.g.targetableEnemies(c.self).filter((u) => !u.token).map((u) => ({
                    target: u.id
                }))
            },
            resolve(c) {
                const foe = c.trigger ? c.g.unit(c.trigger.actor ?? "") : c.target
                if (!foe || foe.status !== "board" || foe.side === c.side) return
                // Mù 1 đòn thật (làm mới, không cộng dồn): chủ động → hết lượt địch kế; phản ứng trong lượt địch → hết chính lượt đó
                c.g.status(foe,
                    "blind",
                    1,
                    {
                        v: 1, visuals: ["blindHit"]
                    })
                c.g.damage(c.self,
                    foe,
                    c.f(F_E) + c.f(F_E_PER) * mushroomsIn(c.g,
                        c.side),
                    "magic",
                    {
                        tag: "skill", visuals: ["poisonHit"]
                    })
            },
        },
        R: {
            key: "R", mana: 30, name: "Kích Nổ", target: "all_enemies",
            desc: `Chọn số Nấm nguyên N từ 1 tới toàn kho hiện có để tiêu, giữ phần dư. Nếu kho trống khi giải quyết, tự gài ${R_EMPTY_PLANT} Nấm trước rồi dùng N đã chọn trong 1–${R_EMPTY_PLANT}. Từng Nấm gây {${F_MUSH}} sát thương phép vào tướng sống có tỉ lệ Máu thấp nhất lúc đó; một lá tốn 35 mana dù N bao nhiêu.`,
            options(c): PlayArgs[] {
                const stock = mushroomsIn(c.g,
                    c.side)
                const max = stock > 0 ? stock : R_EMPTY_PLANT
                return Array.from({
                    length: max
                },
                (_, i) => ({
                    // pick (chuỗi số) để giao diện/argsKey phân biệt các lựa chọn N; amount là giá trị số
                    amount: i + 1, pick: String(i + 1)
                }))
            },
            resolve(c) {
                const g = c.g
                const foe = otherSide(c.side)
                if (mushroomsIn(g,
                    c.side) <= 0) plant(g,
                    c.side,
                    R_EMPTY_PLANT)
                const want = Math.max(1,
                    Math.floor(Number(c.args.amount ?? c.args.pick ?? 1)) || 1)
                const stock = g.deckCards(foe,
                    isMushroom)
                const take = stock.slice(0,
                    Math.min(want,
                        stock.length))
                for (const m of take) {
                    if (g.s.phase === "over") break
                    g.takeFromDeck(foe,
                        m.uid)
                    explode(g,
                        c.self,
                        foe,
                        "skill")
                }
            },
        },
    },
})
