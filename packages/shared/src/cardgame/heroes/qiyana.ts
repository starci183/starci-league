// Qiyana (Sát thủ, vật lý). Bộ chiêu chốt 31/10 – 01/11/2026, số liệu ở balance/heroes/qiyana.json (docs/heroes/KITS.md).
// CHẤT: "Sát thủ nguyên tố". Đầu trận (HeroDef.setup) 5 đường mang Nguyên Tố công khai ngẫu nhiên, ghi vào GameState.laneElements (một lần cho cả ván).
// Qiyana hấp thụ nguyên tố của đường đang đứng và áp cho chiêu kế: Đất thêm sát thương, Nước Choáng, Cỏ Tàng Hình (và E nối Chuỗi né chiêu đơn).
// Nguyên tố tính theo đường lúc chiêu giải quyết (E dùng đường cũ, rồi đường mới áp cho chiêu sau). Stack công khai "element" (1 Đất, 2 Nước, 3 Cỏ) chỉ để hiển thị.
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
    Ctx, PlayArgs, Unit
} from "../types"
import {
    otherSide
} from "../types"

const k = kit("qiyana"), { p } = k
export type Element = "earth" | "water" | "grass"
export const ELEMENTS: Element[] = ["earth",
    "water",
    "grass"]
export const ELEMENT_KEY = "element"
export const F_EARTH = k.x("p1 + p2·AD + p3% Máu đã mất mục tiêu"), EN_EARTH = k.xe("p1 + p2·AD + p3% Máu đã mất mục tiêu")
export const F_STUN = k.x("p5 + p6·AD"), EN_STUN = k.xe("p5 + p6·AD")
export const F_Q = k.x("q1 + q2·AD"), EN_Q = k.xe("q1 + q2·AD")
export const F_E = k.x("e1 + e2·AD"), EN_E = k.xe("e1 + e2·AD")
export const F_R = k.x("r1 + r2·AD"), EN_R = k.xe("r1 + r2·AD")
export const F_R_EARTH = k.x("r4% Máu đã mất mục tiêu"), EN_R_EARTH = k.xe("r4% Máu đã mất mục tiêu")

/** Nguyên tố công khai của đường `lane` (undefined nếu ván chưa có bảng) */
export const laneElement = (g: Game, lane: number): Element | undefined => g.s.laneElements?.[lane] as Element | undefined
/** Nguyên tố Qiyana đang hấp thụ = nguyên tố đường nó đứng */
export const elementOf = (g: Game, u: Unit): Element | undefined => laneElement(g,
    u.lane)
const syncElement = (g: Game, u: Unit) => {
    const e = elementOf(g,
        u)
    const v = e ? ELEMENTS.indexOf(e) + 1 : 0
    if (u.stacks[ELEMENT_KEY] !== v) g.setStack(u,
        ELEMENT_KEY,
        v)
}

/** Kẻ địch sống ở 2 đường kề của đường `lane` */
const neighborFoes = (g: Game, me: Unit, lane: number) => [lane - 1,
    lane + 1].map((l) => g.at(otherSide(me.side),
    l)).filter((x): x is Unit => !!x && !x.token)

/** Một đòn chiêu kèm nguyên tố `el` lên t: Đất cộng sát thương và hồi khi hạ gục, Nước Choáng, Cỏ Tàng Hình */
function elementalHit(c: Ctx, el: Element | undefined, t: Unit, base: string) {
    const g = c.g, me = c.self
    const raw = c.f(base) + (el === "earth" ? g.f(me,
        F_EARTH,
        t) : 0)
    const before = g.events.length
    g.damage(me,
        t,
        raw,
        "physical",
        {
            tag: "skill"
        })
    if (el === "earth" && g.events.slice(before).some((e) => e.t === "kill" && e.target === t.id && e.src === me.id)) g.heal(me,
        me,
        p.p4)
    else if (el === "water") g.timed(me,
        t,
        "stun",
        c.f(F_STUN))
    else if (el === "grass") g.timed(me,
        me,
        "stealth",
        p.p7)
}

export default defineHero({
    id: "qiyana", name: "Qiyana", role: "assassin", damage: "physical", ...k.base,
    desc: "Nữ Hoàng Nguyên Tố: 5 đường mang nguyên tố công khai, Qiyana hấp thụ nguyên tố đường đang đứng. Đất dồn sát thương, Nước khống chế, Cỏ ẩn thân.",
    passive: {
        name: "Thần Khí Ixtal",
        desc: `Đầu trận, 5 đường mang Nguyên Tố công khai ngẫu nhiên: ${p.lane_earth} Đất, ${p.lane_water} Nước, ${p.lane_grass} Cỏ. Qiyana hấp thụ nguyên tố đường đang đứng và áp cho chiêu kế. Đất: chiêu thêm {${F_EARTH}} sát thương; hạ gục hồi ${p.p4} Máu. Nước: Choáng {${F_STUN}} đơn vị. Cỏ: Tàng Hình ${p.p7} đơn vị, E đứng đường Cỏ né được chiêu đơn nhắm cô.`,
    },
    en: {
        desc: "Queen of the Elements: the 5 lanes carry public elements and Qiyana absorbs the one she stands on. Earth burst, Water control, Grass stealth.",
        passive: {
            name: "Ixtal's Regalia",
            desc: `At the start of the game, the 5 lanes carry public random Elements: ${p.lane_earth} Earth, ${p.lane_water} Water, ${p.lane_grass} Grass. Qiyana absorbs the element of the lane she stands on and applies it to her next skill. Earth: the skill deals {${EN_EARTH}} extra damage; a takedown heals ${p.p4} HP. Water: Stun for {${EN_STUN}} units. Grass: Stealth for ${p.p7} units, and E from a Grass lane dodges a single-target action aimed at her.`,
        },
        skills: {
            Q: {
                name: "Edge of Ixtal",
                desc: `The opposite enemy takes {${EN_Q}} physical damage, with the absorbed Element.`,
            },
            E: {
                name: "Audacity",
                desc: `Quick if Qiyana stands on a Grass lane: when an enemy targets exactly her, it can respond and lock the actor. Choose 1 enemy in any lane; Qiyana swaps to face it and it takes {${EN_E}} physical damage, with the absorbed Element (of the lane she left). From a Grass lane in response, the targeting action is cancelled.`,
            },
            R: {
                name: "Supreme Display of Talent",
                desc: `The opposite enemy and the 2 adjacent enemies take {${EN_R}} physical damage; the opposite takes ${p.r3}%. Earth: each also takes {${EN_R_EARTH}}. Water: Stun ${p.r5} units, the opposite ${p.r6} units. Grass: your champions in Qiyana's lane and the 2 adjacent lanes gain Stealth for ${p.r7} unit(s).`,
            },
        },
    },
    setup(g) {
        if (g.s.laneElements) return
        const list: Element[] = [
            ...Array<Element>(p.lane_earth).fill("earth"),
            ...Array<Element>(p.lane_water).fill("water"),
            ...Array<Element>(p.lane_grass).fill("grass"),
        ]
        g.s.laneElements = g.shuffle(list)
    },
    hooks: {
        onSummon(g, me, d) { if (d.unit.id === me.id) syncElement(g,
            me) },
        onRespawn(g, me, d) { if (d.unit.id === me.id) syncElement(g,
            me) },
        onTurnStart(g, me, d) { if (d.side === me.side) syncElement(g,
            me) },
        onActionEnd(g, me) { syncElement(g,
            me) },
    },
    skills: {
        Q: {
            key: "Q", mana: p.q0, name: "Lưỡi Đao Nguyên Tố", target: "opposite",
            desc: `Tướng địch đối diện nhận {${F_Q}} sát thương vật lý, kèm Nguyên Tố hấp thụ.`,
            resolve(c) {
                elementalHit(c,
                    elementOf(c.g,
                        c.self),
c.target!,
F_Q)
            },
        },
        E: {
            key: "E", mana: p.e0, name: "Vũ Điệu Nguyên Tố", target: "enemy", quick: true,
            desc: `Quick nếu Qiyana đứng đường Cỏ: khi địch nhắm đúng cô, nối Chuỗi và khoá kẻ đó làm mục tiêu. Chọn 1 địch ở đường bất kỳ; Qiyana đổi chỗ sang đối diện nó và nó nhận {${F_E}} sát thương vật lý, kèm Nguyên Tố của đường cô vừa rời. Từ đường Cỏ nối Chuỗi, hành động nhắm cô bị huỷ.`,
            quickWhen: (c) => when.targetsSelf(c) && elementOf(c.g,
                c.self) === "grass",
            options: (c): PlayArgs[] => (c.trigger
                ? actorOrEnemy(c)
                : skillArgs(c.g,
                    c.side,
                    c.self,
                    c.card,
                    {
                        key: "E", name: "", desc: "", target: "enemy", resolve() {}
                    })),
            resolve(c) {
                const g = c.g, me = c.self, t = c.target
                const el = elementOf(g,
                    me) // nguyên tố đường đang đứng, trước khi dời
                if (c.trigger && el === "grass") g.chainFx().cancel = true // né hành động đơn nhắm cô
                if (!t || t.side === me.side || t.status !== "board") return
                if (g.opposite(me)?.id !== t.id && !g.faceEnemy(me,
                    t)) return
                if (g.opposite(me)?.id !== t.id) return
                elementalHit(c,
                    el,
                    t,
                    F_E)
                syncElement(g,
                    me)
            },
        },
        R: {
            key: "R", mana: p.r0, name: "Biến Động Tối Thượng", target: "opposite",
            desc: `Tướng địch đối diện và 2 tướng ở đường kề nhận {${F_R}} sát thương vật lý, đối diện nhận ${p.r3}%. Đất: mỗi tướng nhận thêm {${F_R_EARTH}}. Nước: Choáng ${p.r5} đơn vị, tướng đối diện ${p.r6} đơn vị. Cỏ: tướng mình ở đường Qiyana và 2 đường kề Tàng Hình ${p.r7} đơn vị.`,
            resolve(c) {
                const g = c.g, me = c.self, opp = c.target!, el = elementOf(g,
                    me)
                const base = c.f(F_R)
                for (const t of [opp,
                    ...neighborFoes(g,
                        me,
                        me.lane)]) {
                    const isOpp = t.id === opp.id
                    g.damage(me,
                        t,
                        base * (isOpp ? p.r3 / 100 : 1) + (el === "earth" ? g.f(me,
                            F_R_EARTH,
                            t) : 0),
                        "physical",
                        {
                            tag: "skill"
                        })
                    if (el === "water") g.timed(me,
                        t,
                        "stun",
                        isOpp ? p.r6 : p.r5)
                }
                if (el === "grass") {
                    for (const l of [me.lane - 1,
                        me.lane,
                        me.lane + 1]) {
                        const ally = l >= 0 && l <= 4 ? g.at(me.side,
                            l) : undefined
                        if (ally && !ally.token) g.timed(me,
                            ally,
                            "stealth",
                            p.r7)
                    }
                }
            },
        },
    },
})
