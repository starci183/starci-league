// Katarina (Sát thủ, phép): sát thủ cơ hội. Dao rơi trên các đường phía mình; vào đường có Dao thì nhặt và chém kẻ đối diện.
// Số liệu: balance/heroes/katarina.json. Đặc tả: docs/heroes/KITS.md.
// Engine: g.addMarker/removeMarker (dấu "dagger" trên đường phía Katarina), hook onMove (nhặt Dao khi vào đường), g.turnCount (đã nhặt Dao lượt này),
//         g.faceEnemy (Q dịch chuyển sang đối diện), g.moveTo (E dịch chuyển tới đường có Dao).
import {
    kit, when
} from "../balance"
import {
    defineHero
} from "../registry"
import {
    otherSide
} from "../types"
import type {
    OptCtx, PlayArgs
} from "../types"
import type {
    Game
} from "../game"
import type {
    Unit
} from "../types"

const k = kit("katarina"), { p } = k
/** Id dấu mốc trên đường */
const DAGGER = "dagger"
/** Khoá đếm theo lượt: số Dao đã nhặt trong lượt này */
const PICKED = "dagger"

const F_P = k.x("p1 + p2·AD"), EN_P = k.xe("p1 + p2·AD")
const F_Q = k.x("q1 + q2·AD"), EN_Q = k.xe("q1 + q2·AD")
const F_E = k.x("e1 + e2·AD"), EN_E = k.xe("e1 + e2·AD")
const F_R = k.x("r1 + r2·AD"), EN_R = k.xe("r1 + r2·AD")

/** Cho 1 Dao rơi ngẫu nhiên xuống 1 đường phía Katarina */
function dropDagger(g: Game, me: Unit) {
    const lanes = k.flag("daggerOpenLanesOnly") ? g.openLanes() : [0,
        1,
        2,
        3,
        4]
    const lane = g.pick(lanes)
    if (lane !== undefined) g.addMarker(me.side,
        lane,
        DAGGER)
}

/** Các đường có Dao mà Katarina đang không đứng (E) */
function daggerLanes(c: OptCtx): PlayArgs[] {
    const out: PlayArgs[] = []
    for (const lane of c.g.openLanes()) {
        if (lane === c.self.lane || !c.g.markersAt(c.side,
            lane).includes(DAGGER)) continue
        out.push({
            lane
        })
    }
    return out
}

export default defineHero({
    id: "katarina", name: "Katarina", role: "assassin", damage: "magic", ...k.base,
    bot: k.bot,
    desc: "Sát thủ cơ hội: Dao rơi khắp phía mình, vào đường có Dao là nhặt và chém kẻ đối diện.",
    passive: {
        name: "Nhặt Dao",
        desc: `Đầu mỗi lượt của bạn, 1 Dao rơi xuống ngẫu nhiên 1 đường phía bạn. Khi Katarina vào đường có Dao, cô nhặt Dao đó và tướng địch đối diện nhận {${F_P}} sát thương phép.`,
    },
    hooks: {
        onTurnStart(g, me, d) {
            if (d.side === me.side) dropDagger(g,
                me)
        },
        onMove(g, me, d) {
            // người dời: vào đường d.to; người bị hoán đổi: vào đường d.from của người dời
            const lane = d.unit.id === me.id ? d.to : d.with?.id === me.id ? d.from : -1
            if (lane < 0 || me.status !== "board") return
            if (!g.removeMarker(me.side,
                lane,
                DAGGER)) return
            g.bumpTurnCount(me,
                PICKED)
            const foe = g.opposite(me)
            if (foe && !foe.token) g.damage(me,
                foe,
                g.f(me,
                    F_P,
                    foe),
                "magic",
                {
                    tag: "effect"
                })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Phi Dao", target: "enemy", mana: p.q0,
            desc: `Chọn 1 tướng địch; Katarina dịch chuyển sang đường đối diện nó rồi gây {${F_Q}} sát thương phép. Sau đó 1 Dao rơi xuống ngẫu nhiên 1 đường phía bạn.`,
            resolve(c) {
                const t = c.target
                if (!t || t.side === c.side || t.token) return
                if (c.g.opposite(c.self)?.id !== t.id && !c.g.faceEnemy(c.self,
                    t)) return
                if (t.status === "board") c.g.damage(c.self,
                    t,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                dropDagger(c.g,
                    c.self)
            },
        },
        E: {
            key: "E", name: "Thuấn Bộ", target: "lane", mana: p.e0, quick: true, quickWhen: when.targetsSelf,
            desc: `Quick. Chọn 1 đường có Dao; Katarina dịch chuyển tới đó, tướng địch đối diện nhận {${F_E}} sát thương phép. Dùng được khi địch nhắm đúng Katarina.`,
            options: daggerLanes,
            resolve(c) {
                const lane = c.lane
                if (lane === undefined || !c.g.markersAt(c.side,
                    lane).includes(DAGGER) || !c.g.moveTo(c.self,
                    lane)) return
                const foe = c.g.opposite(c.self)
                if (foe && !foe.token) c.g.damage(c.self,
                    foe,
                    c.f(F_E),
                    "magic",
                    {
                        tag: "skill"
                    })
            },
        },
        R: {
            key: "R", name: "Bông Sen Tử Thần", target: "none", mana: p.r0,
            desc: `Chỉ dùng được khi lượt này Katarina đã nhặt Dao. Tướng địch đối diện và 2 đường kề nhận {${F_R}} sát thương phép, tướng đối diện nhận ${p.r3}% lượng đó.`,
            canPlay: (c) => c.g.turnCount(c.self,
                PICKED) > 0,
            resolve(c) {
                const g = c.g, base = c.f(F_R), mid = c.self.lane
                for (const lane of [mid - 1,
                    mid,
                    mid + 1]) {
                    if (lane < 0 || lane > 4) continue
                    const t = g.at(otherSide(c.side),
                        lane)
                    if (!t || t.token) continue
                    g.damage(c.self,
                        t,
                        lane === mid ? base * p.r3 / 100 : base,
                        "magic",
                        {
                            tag: "skill", aoe: true
                        })
                }
            },
        },
    },
    en: {
        desc: "Opportunistic assassin: Daggers fall across your side; step into a lane with one to pick it up and strike the champion opposite.",
        passive: {
            name: "Shunpo Daggers",
            desc: `At the start of each of your turns, 1 Dagger falls on a random lane on your side. When Katarina enters a lane with a Dagger, she picks it up and the enemy champion opposite takes {${EN_P}} magic damage.`,
        },
        skills: {
            Q: {
                name: "Bouncing Blade",
                desc: `Choose 1 enemy champion; Katarina moves to the lane opposite it and deals {${EN_Q}} magic damage. Then 1 Dagger falls on a random lane on your side.`,
            },
            E: {
                name: "Shunpo",
                desc: `Quick. Choose 1 lane with a Dagger; Katarina moves there and the enemy champion opposite takes {${EN_E}} magic damage. Can be played when an enemy targets exactly Katarina.`,
            },
            R: {
                name: "Death Lotus",
                desc: `Only playable if Katarina picked up a Dagger this turn. The enemy champion opposite and the 2 adjacent lanes take {${EN_R}} magic damage; the champion opposite takes ${p.r3}% of that amount.`,
            },
        },
    },
})
