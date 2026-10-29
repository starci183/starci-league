// Braum (Đỡ đòn): máu 500 · AD 55 · giáp/kháng 40/40.
// CHẤT: "Đứng sau tôi": Braum hứng đòn cho đồng đội, càng hứng càng Vững.
// Nội tại: mỗi đòn đánh trúng Braum +1 Vững (giữ mãi, tối đa 6); mỗi Vững Braum nhận ít hơn 10% sát thương.
// Q (Quick) Đỡ Thay + 2 Vững. E (Quick) Vững ×2 đến hết lượt (giảm tối đa 80%). R (Quick) đồng minh nhận ít sát thương theo Vững tới hết lượt địch.
// Cơ chế engine dùng: HeroDef.modifyDamage, hook onAttackHit, g.chainFx().redirect, stack, status.
import {
    pct
} from "../formula"
import {
    defineHero
} from "../registry"
import {
    otherSide
} from "../types"

const STEADY = "braum_steady"
const DOUBLE = "braum_dbl"
const WALL = "braum_wall"
const STEADY_MAX = 6
const CUT_PER = 0.1
const CUT_CAP = 0.8
const CUT_TEAM_CAP = 0.6
const Q_GAIN = 2

export default defineHero({
    id: "braum", name: "Braum", role: "tank", damage: "magic", hp: 430, atk: 66, armor: 39, mr: 38,
    bot: {
        stackValue: {
            braum_steady: 25,
        },
        buffValue: {
            braum_dbl: 30, braum_wall: 70,
        },
    },
    desc: "Tấm khiên của Freljord: hứng đòn cho cả đội, càng bị đánh càng Vững, không gây sát thương bằng chiêu.",
    passive: {
        name: "Da Sắt",
        desc: `Mỗi đòn đánh trúng Braum: +1 Vững (giữ mãi, tối đa ${STEADY_MAX}). Mỗi Vững: Braum nhận ít hơn ${pct(CUT_PER)}% sát thương.`,
    },
    modifyDamage(g, me, d) {
        if (d.target.token) return 1
        const steady = g.stackOf(me,
            STEADY)
        if (d.target.id === me.id) return 1 - Math.min(CUT_CAP,
            steady * (g.has(me,
                DOUBLE) ? 2 : 1) * CUT_PER)
        if (d.target.side === me.side && g.has(me,
            WALL)) return 1 - Math.min(CUT_TEAM_CAP,
            steady * CUT_PER)
        return 1
    },
    hooks: {
        onAttackHit(g, me, d) {
            if (d.target.id === me.id && d.attacker.side !== me.side) g.stack(me,
                STEADY,
                1,
                STEADY_MAX)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Đứng Sau Tôi", target: "none", quick: true, chainOnly: true,
            desc: `Quick, Chỉ Nối Chuỗi. Khi địch đánh 1 đồng minh khác Braum: Đỡ Thay đòn đó; Braum +${Q_GAIN} Vững.`,
            quickWhen: (c) => c.trigger.side !== c.side && !!c.trigger.single && c.trigger.target !== c.self.id
                && !!c.trigger.redirectable?.includes(c.self.id),
            resolve(c) {
                if (c.trigger?.target !== c.self.id) c.g.chainFx().redirect = c.self.id
                c.g.stack(c.self,
                    STEADY,
                    Q_GAIN,
                    STEADY_MAX)
            },
        },
        E: {
            key: "E", name: "Bất Khả Xâm Phạm", target: "none", quick: true, chainOnly: true,
            desc: `Quick, Chỉ Nối Chuỗi. Khi địch đánh: tới hết lượt này, Vững của Braum tính ×2 (Braum nhận ít hơn tối đa ${pct(CUT_CAP)}% sát thương).`,
            quickWhen: (c) => c.trigger.side !== c.side,
            resolve(c) {
                c.g.status(c.self,
                    DOUBLE,
                    1,
                    {
                        of: c.g.s.active
                    })
            },
        },
        R: {
            key: "R", name: "Vết Nứt Băng Giá", target: "none", quick: true,
            desc: `Quick. Tới hết lượt của đối thủ: mọi đồng minh nhận ít hơn ${pct(CUT_PER)}% sát thương cho mỗi Vững của Braum.`,
            quickWhen: (c) => c.trigger.side !== c.side,
            resolve(c) {
                c.g.status(c.self,
                    WALL,
                    1,
                    {
                        of: otherSide(c.side)
                    })
            },
        },
    },
})
