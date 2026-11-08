// Vel'Koz (Pháp sư, phép): plasma hư không. Mọi con số nằm trong balance/heroes/velkoz.json (docs/heroes/KITS.md).
// Phân Rã = stack "velkoz_decay" đặt trên ĐỊCH (carrierStacks): mỗi tia trúng +1, đủ p1 thì tiêu p1 và nổ sát thương chuẩn.
// Tướng mang chết mất một nửa (engine); Vel'Koz chết không đổi gì.
import {
    kit
} from "../balance"
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    Unit
} from "../types"

const k = kit("velkoz"), {
    p
} = k
export const DECAY = "velkoz_decay"
const F_DECAY = k.x("p2 + p3·AP + p4% máu tối đa mục tiêu"), EN_DECAY = k.xe("p2 + p3·AP + p4% máu tối đa mục tiêu")
const F_Q = k.x("q1 + q2·AP"), EN_Q = k.xe("q1 + q2·AP")
const F_Q2 = k.x("q3 + q4·AP"), EN_Q2 = k.xe("q3 + q4·AP")
const F_E = k.x("e1 + e2·AP"), EN_E = k.xe("e1 + e2·AP")
const F_E2 = k.x("e3 + e4·AP"), EN_E2 = k.xe("e3 + e4·AP")
const F_E3 = k.x("e5 + e6·AP"), EN_E3 = k.xe("e5 + e6·AP")
const F_R = k.x("r2 + r3·AP"), EN_R = k.xe("r2 + r3·AP")

/** +1 Phân Rã lên t; đủ p1 thì tiêu đúng p1 và nổ sát thương chuẩn (không chí mạng, không tự sinh dấu) */
function addDecay(g: Game, me: Unit, t: Unit) {
    if (t.token || t.status !== "board") return
    const n = g.stack(t,
        DECAY,
        1)
    if (n < p.p1) return
    g.setStack(t,
        DECAY,
        n - p.p1)
    g.damage(me,
        t,
        g.f(me,
            F_DECAY,
            t),
        "true",
        {
            tag: "effect"
        })
}

/** Một tia chiêu lên t, sát thương thô raw: trúng (không bị miễn toàn lá/đóng băng bản thân) thì +1 Phân Rã */
function ray(g: Game, me: Unit, t: Unit, raw: number) {
    if (t.status !== "board" || t.token) return
    if (g.has(t,
        "stasis") || g.has(t,
        "invulnerable") || g.s.immune?.includes(t.id)) return
    g.damage(me,
        t,
        raw,
        "magic",
        {
            tag: "skill"
        })
    addDecay(g,
        me,
        t)
}
/** Một tia theo công thức expr (tính lại theo mục tiêu ngay trước tia) */
const hit = (g: Game, me: Unit, t: Unit, expr: string) => ray(g,
    me,
    t,
    g.f(me,
        expr,
        t))

export default defineHero({
    id: "velkoz", name: "Vel'Koz", role: "mage", damage: "magic", ...k.base,
    carrierStacks: [DECAY],
    bot: k.bot,
    desc: "Phân rã: mỗi tia chiêu trúng là một Phân Rã, đủ số thì nổ sát thương chuẩn. Sát thủ ngẫu nhiên: mục tiêu chọn chỉ bị chạm nhẹ, đòn nặng rơi vào các địch ngẫu nhiên hoặc đường kề. Q tách 2 tia, E cắt ngang 3 đường rồi nổ ngay, R bắn ngẫu nhiên nhiều tia.",
    passive: {
        name: "Phân Rã",
        desc: `Mỗi tia chiêu trúng tướng địch cho nó 1 Phân Rã; đủ ${p.p1} thì tiêu ${p.p1} và nổ {${F_DECAY}} sát thương chuẩn. Tướng mang Phân Rã chết thì mất một nửa.`,
    },
    skills: {
        Q: {
            key: "Q", name: "Phân Hạch Plasma", target: "enemy", mana: p.q0,
            desc: `Chọn 1 tướng địch: {${F_Q}} sát thương phép (nhẹ). Sau đó tách sang tối đa 2 tướng địch khác NGẪU NHIÊN: mỗi tướng {${F_Q2}} sát thương phép (nặng hơn nhiều).`,
            resolve(c) {
                const t = c.target!
                hit(c.g,
                    c.self,
                    t,
                    F_Q)
                // 2 tia phụ vào 2 địch còn lại, chọn ngẫu nhiên không lặp
                const rest = c.g.targetableEnemies(c.self).filter((u) => !u.token && u.id !== t.id)
                for (let i = 0; i < 2 && rest.length; i++) {
                    const other = c.g.pick(rest)!
                    rest.splice(rest.indexOf(other),
                        1)
                    c.g.log(`Vel'Koz Q: tia phụ ngẫu nhiên trúng ${c.g.nameOf(other)}`)
                    hit(c.g,
                        c.self,
                        other,
                        F_Q2)
                }
            },
        },
        E: {
            key: "E", name: "Khe Nứt Hư Không", target: "enemy", mana: p.e0,
            desc: `Chọn 1 tướng địch làm tâm: khe nứt cắt ngang qua tâm và 2 đường kề. Tâm nhận {${F_E}} sát thương phép (nhẹ), mỗi đường kề nhận {${F_E2}} (nặng); rồi khe nổ ngay: ai còn đứng nhận thêm {${F_E3}} sát thương phép.`,
            resolve(c) {
                const t = c.target!
                const foe = t.side
                const raw = c.f(F_E), rawSide = c.f(F_E2)
                // 3 đường: tâm nhận nhẹ, hai đường kề nhận nặng (bỏ ô trống, bỏ vật triệu hồi)
                const hitUnits: Unit[] = []
                for (const lane of [t.lane - 1,
                    t.lane,
                    t.lane + 1]) {
                    const u = lane >= 0 && lane <= 4 ? c.g.at(foe,
                        lane) : undefined
                    if (!u || u.token || !c.g.targetable(u)) continue
                    ray(c.g,
                        c.self,
                        u,
                        lane === t.lane ? raw : rawSide)
                    hitUnits.push(u)
                }
                // khe nổ ngay: ai còn đứng nhận thêm một cú sát thương phép, mỗi cú nổ cũng là một tia
                for (const u of hitUnits) if (u.status === "board") hit(c.g,
                    c.self,
                    u,
                    F_E3)
            },
        },
        R: {
            key: "R", name: "Tia Phân Rã Sự Sống", target: "none", mana: p.r0,
            desc: `Bắn ngẫu nhiên tổng cộng ${p.r1} tia: mỗi tia chọn 1 tướng địch bất kỳ đang trên sân, {${F_R}} sát thương phép.`,
            options(c) {
                return c.g.targetableEnemies(c.self).some((u) => !u.token) ? [{
                }] : []
            },
            resolve(c) {
                const hitCount: Record<string, number> = {
                }
                for (let i = 0; i < p.r1; i++) {
                    const pool = c.g.targetableEnemies(c.self).filter((u) => !u.token && u.status === "board")
                    const t = c.g.pick(pool)
                    if (!t) break
                    hit(c.g,
                        c.self,
                        t,
                        F_R)
                    hitCount[c.g.nameOf(t)] = (hitCount[c.g.nameOf(t)] ?? 0) + 1
                }
                c.g.log(`Vel'Koz R: ${p.r1} tia ngẫu nhiên (${Object.entries(hitCount).map(([n,
                    v]) => `${n} ${v}`).join(", ")})`)
            },
        },
    },
    en: {
        desc: "Disintegration: every skill beam that hits is one Decay, enough of it unravels the target in true damage. A random-kill burster: the chosen target is only grazed, the heavy hits land on random enemies or adjacent lanes. Q splits 2 beams, E cuts across 3 lanes and bursts at once, R fires random beams.",
        passive: {
            name: "Organic Deconstruction",
            desc: `Each skill beam that hits an enemy champion gives it 1 Decay; at ${p.p1} it spends ${p.p1} and blows up for {${EN_DECAY}} true damage. A Decay bearer that dies loses half of it.`,
        },
        skills: {
            Q: {
                name: "Plasma Fission",
                desc: `Choose 1 enemy champion: {${EN_Q}} magic damage (light). Then it splits onto up to 2 other RANDOM enemy champions: {${EN_Q2}} magic damage each (much heavier).`,
            },
            E: {
                name: "Void Rift",
                desc: `Choose 1 enemy champion as the centre: a rift cuts across it and the 2 adjacent lanes. The centre takes {${EN_E}} magic damage (light), each adjacent lane {${EN_E2}} (heavy); then the rift bursts at once: everyone still standing takes {${EN_E3}} more magic damage.`,
            },
            R: {
                name: "Life Form Disintegration Ray",
                desc: `Fire ${p.r1} beams in total, each at a random enemy champion on the board, {${EN_R}} magic damage each.`,
            },
        },
    },
})
