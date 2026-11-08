// Mel (Pháp sư, phép): ánh vàng Medarda. Mọi con số nằm trong balance/heroes/mel.json (docs/heroes/KITS.md).
// Hào Quang Chói Lọi: Chói Lọi là bộ đếm đặt trên tướng ĐỊCH (HeroDef.carrierStacks); không tự cháy, chỉ nâng ngưỡng hạ p3 + p4·Chói Lọi.
// Ngưỡng hạ đi qua g.executeLethal nên vẫn gặp cứu chết (Renata P, Aatrox R, Giáp Thiên Thần).
// Lối chơi: Q, E tích Chói Lọi, R thu hoạch. Q, E, R thêm p5 phép mỗi Chói Lọi mục tiêu đang có. E không Vô Hiệu: ReactFx.mirror giảm và ghi lại rồi trả về kẻ dùng.
// Q, R tự kiểm tra ngưỡng ngoài hook để Sylas đoạt Q, R vẫn có ngưỡng hạ (hook onDamage chỉ chạy với chính Mel); gọi hai lần cũng không sao.
import {
    kit, when
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

const k = kit("mel"), { p } = k
/** Chói Lọi: bộ đếm trên tướng mang, mang chết mất một nửa, Mel chết không đổi */
export const GLOW = "mel_glow"

const F_P = k.x("p1 + p2·AP"), EN_P = k.xe("p1 + p2·AP")
const F_Q = k.x("q2 + q3·AP"), EN_Q = k.xe("q2 + q3·AP")
const F_R = k.x("r1 + r2·AP"), EN_R = k.xe("r1 + r2·AP")

/** Ngưỡng hạ của tướng mang `n` Chói Lọi */
export const executeLine = (n: number) => p.p3 + p.p4 * n
/** Kẻ vừa được cứu khỏi ngưỡng hạ: miễn ngưỡng tới hết lượt, để tia kế của cùng lá không hạ lại ngay */
const SPARED = "aura:mel_spared"
/** Hạ `t` nếu Máu hiện tại không quá ngưỡng */
function tryExecute(g: Game, me: Unit, t: Unit) {
    const n = g.stackOf(t,
        GLOW)
    if (n <= 0 || t.token || t.status !== "board" || t.side === me.side || t.hp > executeLine(n) || g.stackOf(t,
        SPARED) === g.s.turnNo) return
    g.executeLethal(t,
        me,
        {
            visuals: ["melExecute"]
        })
    if (t.status === "board" && t.hp > 0) g.setStack(t,
        SPARED,
        g.s.turnNo)
}
/** Gắn Chói Lọi theo đơn vị X.Y: phần nguyên chắc chắn, phần lẻ là xác suất thêm 1 (law.md 4) */
function addGlow(g: Game, me: Unit, t: Unit) {
    if (t.status !== "board" || t.token) return
    const x = Math.max(0,
        g.f(me,
            F_P))
    const n = Math.floor(x) + (g.rand() < x % 1 ? 1 : 0)
    if (n > 0) g.stack(t,
        GLOW,
        n)
}

/** Một tia: thêm p5 mỗi Chói Lọi `t` đang có, xét ngưỡng, rồi gắn Chói Lọi nếu `mark` */
function ray(g: Game, me: Unit, t: Unit, raw: number, o: Parameters<Game["damage"]>[4], mark = true) {
    const dealt = g.damage(me,
        t,
        raw + p.p5 * g.stackOf(t,
            GLOW),
        "magic",
        o)
    if (dealt <= 0) return
    tryExecute(g,
        me,
        t)
    if (mark) addGlow(g,
        me,
        t)
}

export default defineHero({
    id: "mel", name: "Mel", role: "mage", damage: "magic", ...k.base,
    carrierStacks: [GLOW],
    bot: k.bot,
    desc: "Nhà ngoại giao Medarda: Q và E tích Chói Lọi lên địch, chiêu nào cũng đau hơn theo dấu, kẻ tụt Máu dưới ngưỡng bị hạ ngay, E trả lại chiêu nhắm đồng minh, R thu hoạch cả bàn.",
    passive: {
        name: "Hào Quang Chói Lọi",
        desc: `Chiêu Mel trúng gắn {${F_P}} Chói Lọi (đơn vị X.Y: phần nguyên chắc chắn, phần lẻ là xác suất thêm 1), cộng dồn vô hạn. Đòn thường của Mel gây sát thương phép. Q, E, R gây thêm ${p.p5} sát thương phép mỗi Chói Lọi mục tiêu đang có. Sau khi Mel gây sát thương lên địch có Chói Lọi: nếu Máu hiện tại của nó không quá ${p.p3} + ${p.p4} mỗi Chói Lọi, nó bị hạ ngay. Tướng mang chết mất một nửa, Mel chết không đổi.`,
    },
    hooks: {
        onDamage(g, me, d) {
            if (d.src?.id === me.id && d.hpLost + d.absorbed > 0) tryExecute(g,
                me,
                d.target)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Loạt Bắn Rực Rỡ", target: "enemy", mana: p.q0,
            desc: `Chọn 1 tướng địch: nó nhận ${p.q1} tia, 2 đường kề mỗi tướng địch nhận ${p.q4} tia. Mỗi tia {${F_Q}} sát thương phép, gắn Chói Lọi riêng.`,
            resolve(c) {
                const g = c.g, t = c.target!
                const raw = c.f(F_Q), near = g.neighbors(t)
                const visualGroup = `${c.self.id}:q:${c.card.uid}:${g.s.turnNo}`
                const volley = (u: Unit, n: number, via?: string) => {
                    for (let i = 0; i < n && u.status === "board"; i++) ray(g,
                        c.self,
                        u,
                        raw,
                        {
                            tag: "skill", visualGroup, ...(via ? {
                                via, aoe: true
                            } : {
                            })
                        })
                }
                volley(t,
                    p.q1)
                for (const o of near) volley(o,
                    p.q4,
                    t.id)
            },
        },
        E: {
            key: "E", name: "Phản Quang Chiết Kính", target: "none", mana: p.e0, quick: true, chainOnly: true,
            quickWhen: (c) => when.skill(c) && when.targetsAlly(c),
            desc: `Quick, chỉ nối Chuỗi. Khi địch dùng lá chiêu nhắm đúng 1 tướng mình: chiêu vẫn trúng nhưng sát thương lên tướng đó giảm ${p.e1}%. Sau khi chiêu giải quyết, Mel tung lại đúng chiêu đó về kẻ dùng, y chang hiệu ứng và số nhát, mỗi nhát ${p.e2}% sát thương thực của nhát đó (cùng loại, tính cả phần Khiên hấp thụ), nhát phép đầu thêm ${p.p5} phép mỗi Chói Lọi trên nó, kèm mọi khống chế chiêu gây với ${p.e4}% thời lượng (đơn vị X.Y: phần nguyên chắc chắn, phần lẻ là xác suất thêm 1, ra 0 thì không dính); rồi nhận ${p.e3} Chói Lọi. Đổi chỗ, cướp bài, hồi Máu không phản.`,
            resolve(c) {
                const guard = c.trigger?.target, actor = c.trigger?.actor
                if (!guard || !actor) return
                c.g.chainFx().mirror = {
                    guard, actor, by: c.self.id, cut: p.e1 / 100, pct: p.e2 / 100, ccPct: p.e4 / 100, hits: [], cc: [], mark: {
                        key: GLOW, n: p.e3, per: p.p5
                    }
                }
            },
        },
        R: {
            key: "R", name: "Nhật Thực Vàng", target: "all_enemies", mana: p.r0,
            desc: `Mọi tướng địch trên sân nhận {${F_R}} + ${p.r3} mỗi Chói Lọi sát thương phép, xét ngưỡng hạ, rồi tiêu hết Chói Lọi.`,
            resolve(c) {
                const g = c.g, base = c.f(F_R)
                for (const t of g.enemies(c.self).filter((u) => !u.token)) {
                    ray(g,
                        c.self,
                        t,
                        base + p.r3 * g.stackOf(t,
                            GLOW),
                        {
                            tag: "skill", aoe: true
                        },
                        false)
                    if (g.stackOf(t,
                        GLOW)) g.setStack(t,
                        GLOW,
                        0)
                }
            },
        },
    },
    en: {
        desc: "Medarda diplomat: Q and E stack Radiance on enemies, every skill hurts more per mark, anyone under the line is taken down at once, E throws a skill aimed at an ally back at its caster, R reaps the whole board.",
        passive: {
            name: "Searing Brilliance",
            desc: `Mel's skills that hit apply {${EN_P}} Radiance (X.Y units: the whole part is certain, the fraction is a chance of 1 more), stacking without limit. Her basic attacks deal magic damage. Q, E and R deal an extra ${p.p5} magic damage per Radiance on the target. After Mel damages an enemy with Radiance: if its current HP is at most ${p.p3} + ${p.p4} per Radiance, it is taken down at once. The bearer dying halves it; Mel dying changes nothing.`,
        },
        skills: {
            Q: {
                name: "Radiant Volley",
                desc: `Choose 1 enemy champion: it takes ${p.q1} rays, each enemy champion in the 2 adjacent lanes takes ${p.q4} rays. Each ray deals {${EN_Q}} magic damage and applies its own Radiance.`,
            },
            E: {
                name: "Rebuttal",
                desc: `Quick, Chain only. When an enemy casts a skill card targeting exactly 1 of your champions: the skill still lands but its damage on that champion is reduced by ${p.e1}%. After it resolves, Mel casts that same skill back at the caster, same effects and same number of hits, each ${p.e2}% of the real damage of that hit (same type, Shield-absorbed part included), the first magic hit adding ${p.p5} magic per Radiance on it, with every crowd control the skill applied at ${p.e4}% duration (X.Y units: the whole part is certain, the fraction is a chance of 1 more, 0 means none); then it gains ${p.e3} Radiance. Swaps, card theft and caster healing are not reflected.`,
            },
            R: {
                name: "Golden Eclipse",
                desc: `Every enemy champion on the board takes {${EN_R}} + ${p.r3} per Radiance magic damage, the execution line is checked, then all Radiance is spent.`,
            },
        },
    },
})
