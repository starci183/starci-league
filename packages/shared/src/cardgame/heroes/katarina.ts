// Katarina (Sát thủ, phép): máu 800 · AD 78 · giáp/kháng 30/30.
// MỤC ĐÍCH: Mưa dao găm. Dao Găm là DẤU TRÊN ĐƯỜNG (stack "dagger1".."dagger5" trên Katarina = số lượt còn lại, hiện trên bàn):
// Q cắm dao vào đường của mục tiêu, E lướt tới đường có dao để chém tướng đối diện và bỏ lại dao ở chỗ cũ, R xoay dao ở mọi đường.
// Hạ gục trong lượt mình thì lá Q/E gần nhất trong mộ về tay (chém tiếp). Engine: lanes, grave.
// Đối thủ trả lời: Choáng/Câm Lặng Katarina trước lượt cô (dao chỉ sống 2 lượt của cô rồi rơi), hoặc phản ứng đổi mục tiêu khi cô lướt.
import {
    defineHero
} from "../registry"
import type {
    Unit
} from "../types"
import {
    otherSide
} from "../types"
import type {
    Game
} from "../game"

const LIFE = 2
const F_Q = "35 + 35% AD + 30% AP"
const Q_REFRESH = 0.5
const F_E = "55 + 55% AD + 40% AP"
const F_R = "40 + 25% AD + 25% AP"
const F_R_DAGGER = "60 + 40% AD + 35% AP"

const key = (lane: number) => `dagger${lane + 1}`
export const daggerAt = (g: Game, kat: Unit, lane: number) => (lane >= 0 && lane < 5 ? g.stackOf(kat,
    key(lane)) : 0)
export const daggerLanes = (g: Game, kat: Unit) => [0,
    1,
    2,
    3,
    4].filter((l) => daggerAt(g,
    kat,
    l) > 0 && g.isOpen(l))
function drop(g: Game, kat: Unit, lane: number) {
    if (lane < 0 || lane > 4) return
    g.setStack(kat,
        key(lane),
        LIFE)
}
function pick(g: Game, kat: Unit, lane: number) {
    if (daggerAt(g,
        kat,
        lane) > 0) g.setStack(kat,
        key(lane),
        0)
}

export default defineHero({
    id: "katarina", name: "Katarina", role: "assassin", damage: "magic", hp: 910, atk: 84, armor: 30, mr: 30,
    skillCopies: {
        Q: 6, E: 5, R: 2
    },
    desc: "Ác Kiếm: cắm Dao Găm lên các đường rồi lướt tới dao để chém; chọn chỗ cắm dao là cả ván bài. Hạ gục thì lấy lại chiêu từ mộ.",
    passive: {
        name: "Tham Lam",
        desc: `Dao Găm nằm trên một đường, hiện số lượt còn lại (${LIFE} lượt của bạn, mỗi đường tối đa 1 dao). Katarina ra sân hoặc hồi sinh thì cắm 1 dao ở đường của mình. Mỗi khi một tướng địch bị hạ trong lượt của bạn, lá Q hoặc E của Katarina vào mộ gần nhất quay về tay.`,
    },
    hooks: {
        onSummon(g, me, d) { if (d.unit.id === me.id) drop(g,
            me,
            me.lane) },
        onRespawn(g, me, d) { if (d.unit.id === me.id) drop(g,
            me,
            me.lane) },
        onTurnEnd(g, me, d) {
            if (d.side !== me.side) return
            for (let l = 0; l < 5; l++) {
                const v = daggerAt(g,
                    me,
                    l)
                if (v > 0) g.setStack(me,
                    key(l),
                    v - 1)
            }
        },
        onDeath(g, me, d) {
            if (d.victim.side === me.side || d.victim.token || g.s.active !== me.side || me.status !== "board") return
            const card = g.lastGrave(me.side,
                (x) => x.id === "katarina_q" || x.id === "katarina_e")
            if (!card) return
            const gr = g.player(me.side).grave
            gr.splice(gr.indexOf(card),
                1)
            g.emit({
                t: "returnToHand", side: me.side, card
            })
            g.giveCard(me.side,
                card,
                "hand")
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Phi Dao", target: "enemy",
            desc: `{${F_Q}} sát thương phép lên 1 tướng địch và cắm 1 Dao Găm vào đường của nó (${LIFE} lượt). **Điều kiện:** đường đó đã có dao thì Phi Dao mạnh thêm ${Q_REFRESH * 100}% (dao được làm mới).`,
            resolve(c) {
                const t = c.target!
                const lane = t.lane
                const had = daggerAt(c.g,
                    c.self,
                    lane) > 0
                c.g.damage(c.self,
                    t,
                    c.f(F_Q) * (had ? 1 + Q_REFRESH : 1),
                    "magic",
                    {
                        tag: "skill"
                    })
                drop(c.g,
                    c.self,
                    lane)
            },
        },
        E: {
            key: "E", name: "Thuấn Bộ", target: "lane",
            desc: `Chọn 1 đường có Dao Găm: Katarina lướt tới đó (đổi chỗ với tướng mình nếu có), nhặt dao và gây {${F_E}} sát thương phép lên tướng địch đối diện. **Điều kiện:** đường Katarina vừa rời đi được cắm lại 1 dao.`,
            canPlay: (c) => daggerLanes(c.g,
                c.self).length > 0,
            options: (c) => daggerLanes(c.g,
                c.self).map((lane) => ({
                lane
            })),
            resolve(c) {
                const lane = c.lane!
                const from = c.self.lane
                if (lane !== from) c.g.moveTo(c.self,
                    lane)
                pick(c.g,
                    c.self,
                    lane)
                const t = c.g.at(otherSide(c.side),
                    lane)
                if (t && t.status === "board") c.g.damage(c.self,
                    t,
                    c.f(F_E),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (from !== lane) drop(c.g,
                    c.self,
                    from)
            },
        },
        R: {
            key: "R", name: "Bông Sen Tử Thần", target: "all_enemies",
            desc: `Mọi tướng địch nhận {${F_R}} sát thương phép; tướng địch đứng ở đường có Dao Găm nhận thêm {${F_R_DAGGER}}. Mọi dao trên bàn được nhặt hết.`,
            resolve(c) {
                for (const t of c.g.enemies(c.self)) {
                    const bonus = !t.token && daggerAt(c.g,
                        c.self,
                        t.lane) > 0 ? c.f(F_R_DAGGER) : 0
                    c.g.damage(c.self,
                        t,
                        c.f(F_R) + bonus,
                        "magic",
                        {
                            tag: "skill"
                        })
                }
                for (let l = 0; l < 5; l++) pick(c.g,
                    c.self,
                    l)
            },
        },
    },
})
