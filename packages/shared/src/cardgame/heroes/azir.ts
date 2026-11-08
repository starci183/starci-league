// Azir (Pháp sư, phép): Hoàng Đế Shurima. Mọi con số nằm trong balance/heroes/azir.json (docs/heroes/KITS.md).
// Lính Cát thuộc ô sân của phe, không đi theo tướng và không có hạn. Azir chết: cả phe còn floor(tổng Lính / 2).
// Mỗi Lính đâm địch đối diện ô có Lính. Đồng đội đánh trúng đủ p2 phát thì Azir nhận 1 lá E tạm miễn phí.
// Các hàm soldier* nhận `me` bất kỳ: Sylas đoạt Q, E, R cũng dùng Lính phe mình và gọi soldierAttackHit từ hook của Sylas.
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
    AttackInfo, OptCtx, Side, Unit
} from "../types"

const k = kit("azir"), { p } = k
export const SOLDIERS = "azir_soldiers"
/** Số phát đồng đội đã đánh trúng, đủ p2 thì đổi 1 lá E miễn phí */
export const CALL = "azir_call"

const F_STAB = k.x("p4 + p5·AP + p6·Tốc Đánh"), EN_STAB = k.xe("p4 + p5·AP + p6·Tốc Đánh")
const F_BASIC = k.x("p8·AP"), EN_BASIC = k.xe("p8·AP")
const F_Q = k.x("q1 + q2·AP"), EN_Q = k.xe("q1 + q2·AP")
const F_R = k.x("r1 + r2·AP"), EN_R = k.xe("r1 + r2·AP")

/** Lane-owned Soldiers survive occupant movement/death, including empty allied lanes. */
const lanes = [0,
    1,
    2,
    3,
    4]
export const soldiersAt = (g: Game, side: Side, lane: number) => g.laneStackOf(side,
    lane,
    SOLDIERS)
export const soldierCount = (g: Game, side: Side) => lanes.reduce((n, lane) => n + soldiersAt(g,
    side,
    lane),
0)

/** Azir's death leaves floor(total / 2). Odd-slot survivors are allocated in ascending lane order. */
function halveSoldiers(g: Game, side: Side) {
    const counts = lanes.map(lane => soldiersAt(g,
        side,
        lane))
    let extra = Math.floor(counts.reduce((n, count) => n + count,
        0) / 2) - counts.reduce((n, count) => n + Math.floor(count / 2),
        0)
    lanes.forEach((lane, i) => {
        const bonus = extra > 0 && counts[i] % 2 ? 1 : 0
        extra -= bonus
        g.setLaneStack(side,
            lane,
            SOLDIERS,
            Math.floor(counts[i] / 2) + bonus)
    })
}

/** Each occupied Soldier slot attacks the living enemy across from that slot. */
function stabLine(g: Game, me: Unit, raw: number, o: Parameters<Game["damage"]>[4]) {
    for (const lane of lanes) {
        if (g.s.phase === "over") return
        const count = soldiersAt(g,
            me.side,
            lane)
        const foe = g.at(me.side === "A" ? "B" : "A",
            lane)
        if (count > 0 && foe && !foe.token && g.targetable(foe)) g.damage(me,
            foe,
            raw * count,
            "magic",
            o)
    }
}

/** Đòn đánh của `me` trúng: mọi Lính cùng đâm địch đối diện ô có Lính. Sát thương hiệu ứng, không phải đòn đánh. */
export function soldierAttackHit(g: Game, me: Unit, d: { attacker: Unit; target: Unit; info: AttackInfo }) {
    if (d.attacker.id !== me.id || d.info.miss || d.target.side === me.side) return
    stabLine(g,
        me,
        g.f(me,
            F_STAB),
        {
            tag: "effect", visuals: ["azirStab"],
            visualGroup: `${me.id}:stab:${g.s.turnNo}:${g.s.actionsThisTurn ?? 0}:${g.attacksMadeBy(me)}`
        })
}

const hasActive = (c: OptCtx) => soldierCount(c.g,
    c.side) > 0

export default defineHero({
    id: "azir", name: "Azir", role: "mage", damage: "magic", ...k.base,
    bot: k.bot,
    desc: "Hoàng Đế Shurima: gọi Lính Cát lên ô đồng minh, mỗi đòn đánh của Azir cả đội Lính cùng đâm; Q dồn Lính vào 1 kẻ theo Tốc Đánh, R cả đội Lính đâm kẻ trước mặt, đồng đội đánh càng nhiều Azir càng có thêm Lính.",
    passive: {
        name: "Di Sản Của Shurima",
        desc: `Mỗi ${p.p2} phát đồng đội đánh trúng địch, Azir nhận 1 lá E Trỗi Dậy tạm miễn phí, tồn tại tới hết lượt đối phương. Đòn thường của Azir gây sát thương phép và thêm {${F_BASIC}} sát thương phép. Mỗi Lính phe mình cho Azir ${p.p3}% Tốc Đánh. Mỗi đòn đánh Azir trúng: mọi Lính trên sân đâm địch đối diện ô có Lính, mỗi Lính {${F_STAB}} sát thương phép, tính là sát thương hiệu ứng, không kích hiệu ứng trúng đòn của đồ và không phải đòn đánh. Ô không có địch đối diện thì Lính tại ô đó không đâm.`,
    },
    attackSpeedAura(g, me, u) {
        return u.id === me.id ? p.p3 * soldierCount(g,
            me.side) : 0
    },
    hooks: {
        onDeath(g, me, d) {
            if (d.victim.id === me.id) halveSoldiers(g,
                me.side)
        },
        onAttack(g, me, d) {
            if (d.attacker.id === me.id) d.info.bonus.push({
                raw: g.f(me,
                    F_BASIC), kind: "magic"
            })
        },
        onAttackHit(g, me, d) {
            soldierAttackHit(g,
                me,
                d)
            if (d.attacker.side !== me.side || d.attacker.id === me.id || d.attacker.token || d.info.miss || d.target.side === me.side) return
            const n = g.stackOf(me,
                CALL) + 1
            g.setStack(me,
                CALL,
                n % p.p2)
            if (n >= p.p2) g.giveCard(me.side,
                g.tempSkillCard("azir",
                    me.side,
                    "E",
                    {
                        manaOff: p.e0
                    }),
                "hand")
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Cát Càn Quét", target: "enemy", mana: p.q0, canPlay: hasActive,
            desc: `Chọn 1 tướng địch; mọi Lính trên sân đâm nó, mỗi Lính {${F_Q}} sát thương phép mỗi nhát. Số nhát theo Tốc Đánh như đòn đánh: mỗi 100 Tốc Đánh 1 nhát, phần lẻ là xác suất thêm 1 nhát.`,
            resolve(c) {
                const g = c.g, t = c.target
                if (!t) return
                const raw = c.f(F_Q) * soldierCount(g,
                    c.side)
                const hits = g.attackHits(c.self)
                for (let i = 0; i < hits && t.status === "board"; i++) g.damage(c.self,
                    t,
                    raw,
                    "magic",
                    {
                        tag: "skill"
                    })
            },
        },
        E: {
            key: "E", name: "Trỗi Dậy!", target: "ally", mana: p.e0,
            canPlay: (c) => soldierCount(c.g,
                c.side) < p.p1,
            desc: `Chọn 1 tướng mình; gọi 1 Lính Cát lên ô của tướng đó. Phe mình tối đa ${p.p1} Lính. Lính ở nguyên ô khi tướng di chuyển hoặc bị hạ, không tự hết hạn. Khi Azir bị hạ, tổng Lính phe mình còn một nửa, làm tròn xuống; ưu tiên giữ Lính dư ở đường số nhỏ.`,
            resolve(c) {
                const t = c.target
                if (!t || t.token || soldierCount(c.g,
                    c.side) >= p.p1) return
                c.g.stackLane(c.side,
                    t.lane,
                    SOLDIERS,
                    1)
            },
        },
        R: {
            key: "R", name: "Phân Chia Thiên Hạ", target: "all_enemies", mana: p.r0, canPlay: hasActive,
            desc: `Mọi Lính trên sân đâm 1 nhát địch đối diện ô có Lính, mỗi Lính {${F_R}} sát thương phép.`,
            resolve(c) {
                stabLine(c.g,
                    c.self,
                    c.f(F_R),
                    {
                        tag: "skill", aoe: true
                    })
            },
        },
    },
    en: {
        desc: "Emperor of Shurima: raises Sand Soldiers on allied slots and every Azir attack makes them all thrust; Q drives them into one target by attack speed, R makes each one strike the enemy ahead, and every allied hit brings another Soldier closer.",
        passive: {
            name: "Shurima's Legacy",
            desc: `Every ${p.p2} hits your allies land on enemies, Azir gains 1 temporary free Arise! card, lasting until the end of the opponent's turn. His basic attacks deal magic damage plus {${EN_BASIC}} extra magic damage. Each Soldier on your team gives Azir ${p.p3}% attack speed. Each Azir attack that hits: every Soldier on the board thrusts at the enemy opposite its slot for {${EN_STAB}} magic damage, counted as effect damage: not an attack and it triggers no on-hit item effect. A slot with no enemy opposite means its Soldiers do not thrust.`,
        },
        skills: {
            Q: {
                name: "Conquering Sands",
                desc: `Choose 1 enemy champion; every Soldier on the board thrusts at it for {${EN_Q}} magic damage per Soldier per hit. Hits follow attack speed like an attack: 1 hit per 100 attack speed, the remainder is the chance of 1 more.`,
            },
            E: {
                name: "Arise!",
                desc: `Choose 1 of your champions; raise 1 Sand Soldier on its slot. Your team holds up to ${p.p1} Soldiers. Soldiers stay on that slot when its occupant moves or dies, and do not expire. When Azir dies, your team keeps half its total Soldiers rounded down; odd survivors favor lower-numbered lanes.`,
            },
            R: {
                name: "Emperor's Divide",
                desc: `Every Soldier on the board strikes once at the enemy opposite its slot for {${EN_R}} magic damage per Soldier.`,
            },
        },
    },
})
