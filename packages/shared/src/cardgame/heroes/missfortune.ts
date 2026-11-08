// Miss Fortune (Xạ thủ, vật lý). Chất: XẠ THỦ DỒN SÁT THƯƠNG BẰNG CHIÊU. "AxB" = A mục tiêu × B phát:
// Q 1x1 (1 tướng, 1 phát lớn), E 3x3 (tâm và 2 ô kề, mỗi ô 3 phát), R 5x5 (mọi tướng địch, 5 loạt).
// Nội tại: mọi phát đạn của Q, E, R có thể chí mạng theo Chí mạng của Miss Fortune, MỖI PHÁT TUNG RIÊNG (càng nhiều Chí
// mạng càng nhiều phát chí mạng), hệ số chí mạng như đòn đánh. Mọi con số nằm trong balance/heroes/missfortune.json.
import {
    kit
} from "../balance"
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    RULES, type Unit
} from "../types"

const k = kit("missfortune"), {
    p
} = k

const F_Q = k.x("q1 + q2·AD"), EN_Q = k.xe("q1 + q2·AD")
const F_E = k.x("e1 + e2·AD"), EN_E = k.xe("e1 + e2·AD")
const F_R = k.x("r1 + r2·AD"), EN_R = k.xe("r1 + r2·AD")

/** Chí mạng của một phát đạn: tung theo Chí mạng hiện có, hệ số như đòn đánh */
function rollCrit(g: Game, u: Unit): { crit: boolean; m: number } {
    const st = g.stats(u)
    const crit = g.statusV(u,
        "alwaysCrit") > 0 || (st.crit > 0 && g.rand() < Math.min(1,
        st.crit))
    return {
        crit, m: crit ? RULES.critBase + st.critDmg : 1
    }
}

/** Một phát đạn chiêu lên t: tung chí mạng riêng rồi gây sát thương vật lý */
function shot(g: Game, me: Unit, t: Unit, raw: number, aoe = false) {
    if (t.status !== "board" || t.token) return
    const cr = rollCrit(g,
        me)
    g.damage(me,
        t,
        raw * cr.m,
        "physical",
        {
            tag: "skill", crit: cr.crit, aoe
        })
}

const foes = (g: Game, me: Unit) => g.targetableEnemies(me).filter((u) => !u.token && u.status === "board")

export default defineHero({
    id: "missfortune", name: "Miss Fortune", role: "marksman", damage: "physical", ...k.base,
    desc: "Xạ thủ dồn sát thương bằng chiêu: Q một phát lớn, E mưa đạn 3 ô, R bão đạn cả bàn; mọi phát đạn của chiêu đều có thể chí mạng.",
    passive: {
        name: "Tay Súng May Mắn",
        desc: "Mọi phát đạn của Q, E, R có thể chí mạng theo Chí mạng của Miss Fortune; mỗi phát tung riêng, sát thương chí mạng như đòn đánh.",
    },
    skills: {
        Q: {
            key: "Q", name: "Bắn Hạ", target: "enemy", mana: p.q0,
            desc: `Chọn 1 tướng địch: 1 phát {${F_Q}} sát thương vật lý.`,
            resolve(c) {
                shot(c.g,
                    c.self,
                    c.target!,
                    c.f(F_Q))
            },
        },
        E: {
            key: "E", name: "Mưa Đạn", target: "enemy", mana: p.e0,
            desc: `Chọn 1 tướng địch làm tâm: tâm và 2 đường kề, mỗi tướng trúng ${p.e3} phát, mỗi phát {${F_E}} sát thương vật lý.`,
            resolve(c) {
                const g = c.g
                const t = c.target!
                const raw = c.f(F_E)
                const area = [t.lane - 1,
                    t.lane,
                    t.lane + 1]
                // bắn từng đợt: mỗi đợt một phát vào mỗi ô (thứ tự ô theo đường), đủ e3 đợt
                for (let w = 0; w < p.e3; w++) {
                    for (const lane of area) {
                        const u = lane >= 0 && lane <= 4 ? g.at(t.side,
                            lane) : undefined
                        if (u && !u.token && g.targetable(u)) shot(g,
                            c.self,
                            u,
                            raw,
                            true)
                    }
                }
            },
        },
        R: {
            key: "R", name: "Đạn Tử Thần", target: "all_enemies", mana: p.r0,
            desc: `Bắn ${p.r3} loạt; mỗi loạt mọi tướng địch trên sân trúng 1 phát {${F_R}} sát thương vật lý.`,
            options(c) {
                return foes(c.g,
                    c.self).length ? [{
                    }] : []
            },
            resolve(c) {
                const g = c.g
                const raw = c.f(F_R)
                for (let w = 0; w < p.r3; w++) {
                    if (c.self.status !== "board" || g.s.phase === "over") break
                    for (const t of foes(g,
                        c.self)) shot(g,
                        c.self,
                        t,
                        raw,
                        true)
                }
            },
        },
    },
    en: {
        desc: "A marksman who deals her damage with skills: Q one big shot, E a bullet rain over 3 lanes, R a barrage over the whole board; every skill bullet can crit.",
        passive: {
            name: "Lady Luck",
            desc: "Every bullet of Q, E and R can crit with Miss Fortune's Crit chance; each bullet rolls on its own, crit damage as for attacks.",
        },
        skills: {
            Q: {
                name: "Take Down",
                desc: `Choose 1 enemy champion: 1 shot of {${EN_Q}} physical damage.`,
            },
            E: {
                name: "Make It Rain",
                desc: `Choose 1 enemy champion as the centre: it and the 2 adjacent lanes each take ${p.e3} shots of {${EN_E}} physical damage.`,
            },
            R: {
                name: "Bullet Time",
                desc: `Fire ${p.r3} waves; each wave hits every enemy champion on the board with 1 shot of {${EN_R}} physical damage.`,
            },
        },
    },
})
