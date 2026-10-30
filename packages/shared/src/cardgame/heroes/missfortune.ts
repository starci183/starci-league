// Miss Fortune (Xạ thủ, vật lý): máu 340 · AD 77 · giáp/kháng 25/26.
// CHẤT: "Mưa đạn". Đổi mục tiêu liên tục, bắn cả bàn.
// Nội tại: mỗi lượt, đòn thật ĐẦU TIÊN trúng từng tướng địch khác nhau thêm sát thương (g.oncePerTurn theo mục tiêu; trượt không tiêu; gói riêng không chí mạng).
// Q nảy ngẫu nhiên sang tướng địch thứ hai, E rải sát thương + Vết Thương Sâu (không phải phản ứng),
// R bắn hai nhịp: ngay và cuối lượt địch kế. Mỗi lá R có lịch riêng (rid); MF chết hoặc THỰC SỰ nhận Choáng/Câm Lặng/Mù/Cấm đánh thì huỷ mọi nhịp đang chờ.
// Tuning v1: mana Q/E/R = 10/15/35.
// Đối thủ trả lời: Janna, Braum, Annie (khống chế MF huỷ nhịp hai), dồn MF chết.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    otherSide, type Unit
} from "../types"

/** Số nhịp hai của R đang chờ (stack hiện trên tướng; 0 = không còn nhịp nào) */
export const RAIN = "mf_rain"
/** Bộ đếm định danh lịch R (ẩn): mỗi lá R tăng 1 */
const RAIN_SEQ = "once:mf_rain_seq"
/** Mọi lịch R có rid <= mốc này đã bị huỷ (ẩn) */
const RAIN_CUT = "once:mf_rain_cut"
export const F_PASSIVE = "20 + 105% AD + 15% AP"
export const F_Q = "25 + 140% AD + 20% AP"
export const F_E = "15 + 50% AD + 20% AP"
export const F_R = "30 + 85% AD + 20% AP"
/** Q: nảy sang địch khác nhận ×1.5 (×2 nếu phát đầu hạ gục thật) */
export const BOUNCE = 1.5
export const BOUNCE_KILL = 2
/** Các trạng thái khống chế huỷ lịch R khi THỰC SỰ được áp lên MF */
export const CONTROL = ["stun",
    "silence",
    "blind",
    "disarm"]

const foes = (g: Game, me: Unit) => g.enemies(me).filter((u) => !u.token)

/** Huỷ mọi nhịp R đang chờ của MF */
function cancelRain(g: Game, me: Unit) {
    me.stacks[RAIN_CUT] = me.stacks[RAIN_SEQ] ?? 0
    if (g.stackOf(me,
        RAIN) > 0) g.setStack(me,
        RAIN,
        0)
}

/** Một nhịp R: mọi tướng địch trên sân nhận sát thương theo chỉ số MF lúc này */
function wave(g: Game, me: Unit) {
    const raw = g.f(me,
        F_R)
    for (const t of foes(g,
        me)) {
        g.damage(me,
            t,
            raw,
            "physical",
            {
                tag: "skill"
            })
    }
}

export default defineHero({
    id: "missfortune", name: "Miss Fortune", role: "marksman", damage: "physical", hp: 340, atk: 77, armor: 25, mr: 26,
    bot: {
        stackValue: {
            mf_rain: 60,
        },
    },
    desc: "Mưa đạn: đổi mục tiêu liên tục, bắn cả bàn. Q nảy đạn, E rải và cắt hồi máu, R hai nhịp bão đạn.",
    passive: {
        name: "Cú Bắn Tình Yêu",
        desc: `Mỗi lượt, đòn thật đầu tiên trúng từng tướng địch khác nhau gây thêm {${F_PASSIVE}} sát thương vật lý. A → B → A không thưởng lại A; trượt không tiêu thưởng, vật triệu hồi/đồng minh không kích hoạt.`,
    },
    hooks: {
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss || d.target.token || d.target.side === me.side) return
            if (!g.oncePerTurn(me,
                `first:${d.target.id}`)) return
            // gói riêng, không nhân chí mạng của đòn chính
            g.damage(me,
                d.target,
                g.f(me,
                    F_PASSIVE),
                "physical",
                {
                    tag: "attack"
                })
        },
        onStatusApplied(g, me, d) {
            // MF THỰC SỰ nhận khống chế (sau mọi bước chặn): huỷ mọi nhịp R đang chờ
            if (d.unit.id !== me.id || !CONTROL.includes(d.id)) return
            cancelRain(g,
                me)
        },
        onDeath(g, me, d) {
            if (d.victim.id === me.id) cancelRain(g,
                me)
        },
        onDelayed(g, me, d) {
            if (d.key !== "rain") return
            const rid = Number(d.data?.rid ?? 0)
            if (rid <= (me.stacks[RAIN_CUT] ?? 0) || me.status !== "board") return
            g.setStack(me,
                RAIN,
                Math.max(0,
                    g.stackOf(me,
                        RAIN) - 1))
            wave(g,
                me)
        },
    },
    skills: {
        Q: {
            key: "Q", mana: 5, name: "Bắn Nảy", target: "enemy",
            desc: `Chọn 1 tướng địch hợp lệ; gây {${F_Q}} sát thương vật lý. Nảy ngẫu nhiên sang 1 tướng địch khác đang chọn được, gây ${BOUNCE * 100}% lượng cơ sở; nếu phát đầu hạ thật mục tiêu thì nảy gây ${BOUNCE_KILL * 100}%. Không có đích nảy vẫn bắn phát đầu.`,
            resolve(c) {
                const g = c.g
                const t = c.target!
                const raw = c.f(F_Q)
                g.damage(c.self,
                    t,
                    raw,
                    "physical",
                    {
                        tag: "skill"
                    })
                const killed = t.status !== "board"
                const next = g.pick(g.targetableEnemies(c.self).filter((u) => !u.token && u.id !== t.id))
                if (next) {
                    g.log(`Miss Fortune Q: đạn nảy ngẫu nhiên sang ${g.nameOf(next)}`)
                    g.damage(c.self,
                        next,
                        raw * (killed ? BOUNCE_KILL : BOUNCE),
                        "physical",
                        {
                            tag: "skill"
                        })
                }
            },
        },
        E: {
            key: "E", mana: 10, name: "Mưa Đạn", target: "all_enemies",
            desc: `Mọi tướng địch trên sân nhận {${F_E}} sát thương vật lý và giảm 50% hồi Máu/Khiên nhận vào (Vết Thương Sâu) tới hết lượt địch kế tiếp. E không phải phản ứng.`,
            resolve(c) {
                const g = c.g
                for (const t of foes(g,
                    c.self)) {
                    g.damage(c.self,
                        t,
                        c.f(F_E),
                        "physical",
                        {
                            tag: "skill"
                        })
                    // tới hết lượt địch kế tiếp; dùng lại thì làm mới thời hạn, không nhân hiệu ứng
                    g.status(t,
                        "grievous",
                        1)
                }
            },
        },
        R: {
            key: "R", mana: 30, name: "Bão Đạn", target: "all_enemies",
            desc: `Mỗi lá bắn mọi tướng địch ngay và một lần nữa cuối lượt địch, mỗi nhịp gây {${F_R}} sát thương vật lý. Mỗi R có lịch riêng; Miss Fortune chết hoặc mới thực sự nhận Choáng/Câm Lặng/Mù/Cấm đánh sẽ hủy mọi nhịp đang chờ.`,
            resolve(c) {
                const g = c.g
                wave(g,
                    c.self)
                if (c.self.status !== "board") return
                const rid = (c.self.stacks[RAIN_SEQ] ?? 0) + 1
                c.self.stacks[RAIN_SEQ] = rid
                g.setStack(c.self,
                    RAIN,
                    g.stackOf(c.self,
                        RAIN) + 1)
                g.delay(c.self,
                    "rain",
                    "turnEnd",
                    otherSide(c.side),
                    {
                        rid
                    })
            },
        },
    },
})
