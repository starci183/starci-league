// Vayne (Sát thủ, vật lý): thợ săn bóng đêm. Bóng Đêm tích mỗi đầu lượt, nhiều hơn khi còn ngoài sân; mỗi tầng cho AD và Tốc Đánh.
// Số liệu: balance/heroes/vayne.json. Đặc tả: docs/heroes/KITS.md.
// Engine: onTurnStart (trên sân) + onTurnStartAway (dự bị/đang chết), bonusStats (AD và Tốc Đánh theo Bóng Đêm), deathHalf,
//         g.moveTo + g.chainFx().cancel (Q né đòn đang nhắm: mắt xích dưới bị huỷ, lá vẫn vào mộ), onAttack (R).
import {
    kit, when
} from "../balance"
import {
    defineHero
} from "../registry"

const k = kit("vayne"), { p } = k
const NIGHT = "night"
const R_STATUS = "vayne_r"

const F_E = k.x("e1 + e2·AD"), EN_E = k.xe("e1 + e2·AD")
const F_R = k.x("r1 + r2·AD"), EN_R = k.xe("r1 + r2·AD")
const F_RB = k.x("r3 + r4% Máu tối đa mục tiêu"), EN_RB = k.xe("r3 + r4% Máu tối đa mục tiêu")

export default defineHero({
    id: "vayne", name: "Vayne", role: "assassin", damage: "physical", ...k.base,
    deathHalf: [NIGHT],
    bot: k.bot,
    desc: "Thợ săn bóng đêm: ở ngoài sân thì tích Đêm nhanh hơn, rồi vào sân lật kèo trong một lượt.",
    passive: {
        name: "Thợ Săn Bóng Đêm",
        desc: `Đầu mỗi lượt của bạn, Vayne nhận ${p.p1} Bóng Đêm nếu chưa ra sân hoặc đang chờ hồi sinh, ${p.p2} nếu đang trên sân; không có trần. Mỗi Bóng Đêm cho ${p.p3} AD và ${p.p4}% Tốc Đánh. Khi Vayne bị hạ, mất một nửa Bóng Đêm.`,
    },
    bonusStats(g, me) {
        const n = g.stackOf(me,
            NIGHT)
        return n > 0 ? {
            atk: n * p.p3, attackSpeed: n * p.p4
        } : {
        }
    },
    hooks: {
        onTurnStart(g, me, d) {
            if (d.side === me.side) g.stack(me,
                NIGHT,
                p.p2)
        },
        onTurnStartAway(g, me, d) {
            if (d.side === me.side) g.stack(me,
                NIGHT,
                p.p1)
        },
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss || !g.has(me,
                R_STATUS)) return
            const hits = g.statusV(me,
                R_STATUS) + 1
            me.statuses[R_STATUS].v = hits
            d.info.bonus.push({
                raw: g.f(me,
                    F_R), kind: "physical"
            })
            if (hits % p.r5 === 0) d.info.bonus.push({
                raw: g.f(me,
                    F_RB,
                    d.target), kind: "true"
            })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Nhào Lộn", target: "lane", mana: p.q0, quick: true, quickWhen: when.targetsSelf,
            desc: "Quick. Vayne dịch chuyển sang 1 đường kề. Dùng được khi địch nhắm đúng Vayne; khi đó Vayne né đòn đang nhắm vào mình, đòn đó bị huỷ.",
            options: (c) => [c.self.lane - 1,
                c.self.lane + 1].filter((l) => l >= 0 && l <= 4 && c.g.isOpen(l)).map((lane) => ({
                lane
            })),
            resolve(c) {
                const lane = c.lane
                if (lane === undefined || Math.abs(lane - c.self.lane) !== 1 || !c.g.moveTo(c.self,
                    lane)) return
                if (c.trigger) c.g.chainFx().cancel = true
            },
        },
        E: {
            key: "E", name: "Kết Án", target: "opposite", mana: p.e0,
            desc: `Tướng địch đối diện nhận {${F_E}} sát thương vật lý.`,
            resolve(c) {
                const t = c.target
                if (!t || t.side === c.side) return
                c.g.damage(c.self,
                    t,
                    c.f(F_E),
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
        R: {
            key: "R", name: "Giờ Cuối", target: "none", mana: p.r0,
            desc: `Trong lượt này, mỗi đòn đánh của Vayne gây thêm {${F_R}} sát thương vật lý, và mỗi đòn thứ ${p.r5} nổ thêm {${F_RB}} sát thương chuẩn.`,
            resolve(c) {
                c.g.status(c.self,
                    R_STATUS,
                    1,
                    {
                        v: 0, until: c.g.s.turnNo
                    })
            },
        },
    },
    en: {
        desc: "Night hunter: stack Night faster while off the board, then flip the game in one turn.",
        passive: {
            name: "Night Hunter",
            desc: `At the start of each of your turns, Vayne gains ${p.p1} Night if she is not on the board yet or is waiting to respawn, ${p.p2} if she is on the board; no cap. Each Night gives ${p.p3} AD and ${p.p4}% attack speed. When Vayne is taken down, she loses half her Night.`,
        },
        skills: {
            Q: {
                name: "Tumble",
                desc: "Quick. Vayne moves to an adjacent lane. Can be played when an enemy targets exactly Vayne; then Vayne dodges the action targeting her and that action is cancelled.",
            },
            E: {
                name: "Condemn",
                desc: `The enemy champion opposite takes {${EN_E}} physical damage.`,
            },
            R: {
                name: "Final Hour",
                desc: `This turn, each of Vayne's attacks deals {${EN_R}} extra physical damage, and every ${p.r5}th attack explodes for {${EN_RB}} extra true damage.`,
            },
        },
    },
})
