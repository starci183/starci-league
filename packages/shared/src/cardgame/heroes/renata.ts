// Renata Glasc (Trợ thủ, phép): máu 340 · AD 85 · AP gốc 60 · giáp/kháng 25/28.
// CHẤT: "Địch có dám đánh không": trừng phạt kẻ tấn công, lật kèo khi đồng minh gục.
// Nội tại: đồng minh khác bị hạ thì hồi sinh (25% máu tối đa + công thức), hoá Cuồng Bạo (đòn đánh +sát thương, 1 Đòn Miễn Phí); 1 lần/đồng minh/trận.
// Q: cả đội +Giáp (status "armor_up" tới hết lượt kế của địch), mọi địch nhận sát thương phép. E (Quick): phản 40% sát thương đòn địch + sát thương chuẩn cố định. R: mỗi địch đánh 2 đòn vào 1 đồng đội ngẫu nhiên.
// Cơ chế engine dùng: hook onLethal + g.surviveWith, hook onAttack (info.bonus), g.chainFx().reflectUnit, hook onDamage, g.grantFreeAttack, HeroDef.ap (AP gốc).
import {
    pct
} from "../formula"
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    otherSide, type ReactFx
} from "../types"

const REVIVED = "renata_rev"
const FRENZY = "frenzy"
export const REVIVE_PCT = 0.25
export const REFLECT = 0.4
/** Hồi sinh: cộng vào 25% máu tối đa */
export const F_REVIVE = "20 + 15% AD + 25% AP"
/** Cuồng Bạo: sát thương cộng thêm cho MỖI đòn đánh */
export const F_FRENZY = "15 + 15% AD + 25% AP"
/** Q: Giáp cộng thêm cho cả đội (tới hết lượt kế của địch) */
export const F_Q_ARMOR = "10 + 10% AD + 15% AP"
export const Q_ARMOR = "armor_up"
export const F_Q_DMG = "20 + 20% AD + 30% AP"
/** E: sát thương chuẩn cố định cộng vào phần phản */
export const F_REFLECT = "10 + 10% AD + 15% AP"
/** R: mỗi địch đánh bấy nhiêu đòn vào 1 đồng đội ngẫu nhiên */
const R_HITS = 2

const isOver = (g: Game) => g.s.phase === "over"

/** ReactFx kèm số sát thương cố định của Gói Cứu Trợ (đi cùng đối tượng fx tới lúc đòn bên dưới giải quyết) */
type RenataFx = ReactFx & { renataFlat?: number }

/** AP gốc = AD cũ của Renata (V3: tướng phép có AP gốc bằng AD gốc cũ) */
const BASE_AP = 60

export default defineHero({
    id: "renata", name: "Renata Glasc", role: "support", damage: "magic", hp: 340, atk: 85, ap: BASE_AP, armor: 25, mr: 28,
    bot: {
        buffValue: {
            frenzy: 40,
        },
        markValue: {
            berserk: 40,
        },
    },
    desc: "Nữ tài phiệt Zaun, chuyên lật kèo: đồng minh gục thì đứng dậy phát điên, kẻ ra tay bị phản đòn, và địch quay sang đánh nhau.",
    passive: {
        name: "Cứu Trợ",
        desc: `Khi 1 đồng minh khác Renata sắp bị hạ: nó hồi sinh với ${pct(REVIVE_PCT)}% máu tối đa + {${F_REVIVE}} máu, nhận Cuồng Bạo và 1 Đòn Miễn Phí (1 lần mỗi đồng minh mỗi trận). Cuồng Bạo: tới hết lượt kế của nó, mỗi đòn đánh gây thêm {${F_FRENZY}} sát thương.`,
    },
    hooks: {
        onLethal(g, me, d) {
            const t = d.target
            if (t.side !== me.side || t.id === me.id || t.token || g.stackOf(t,
                REVIVED) > 0) return
            g.setStack(t,
                REVIVED,
                1)
            g.surviveWith(t,
                t.maxHp * REVIVE_PCT + g.f(me,
                    F_REVIVE))
            // tới hết lượt kế của nó: đang là lượt nó thì tính cả lượt sau
            g.status(t,
                FRENZY,
                1,
                {
                    until: g.turnsUntil(t.side,
                        g.s.active === t.side ? 2 : 1)
                })
            g.grantFreeAttack(t,
                {
                    id: "renata_frenzy", source: me.id
                })
        },
        onAttack(g, me, d) {
            // Cuồng Bạo: mỗi đòn đánh của tướng đang Cuồng Bạo gây thêm sát thương cố định
            if (d.attacker.side !== me.side || !g.has(d.attacker,
                FRENZY)) return
            d.info.bonus.push({
                raw: g.f(me,
                    F_FRENZY),
                kind: d.info.kind
            })
        },
        onDamage(g, me, d) {
            // Gói Cứu Trợ: ngoài 40% phản của engine, thêm sát thương chuẩn cố định (1 lần cho mỗi đòn)
            const fx = g.s.fx as RenataFx | undefined
            const t = d.target
            if (!fx?.renataFlat || fx.reflectUnit !== t.id || t.side !== me.side) return
            const flat = fx.renataFlat
            fx.renataFlat = 0
            const src = d.src
            if (!src || src.side === t.side || d.amount <= 0 || (d.tag !== "attack" && d.tag !== "skill")) return
            g.damage(t,
                src,
                flat,
                "true",
                {
                    tag: "effect"
                })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Bắt Tay", target: "all_enemies",
            desc: `Cả đội +{${F_Q_ARMOR}} Giáp tới hết lượt kế của địch; mọi tướng địch nhận {${F_Q_DMG}} sát thương phép.`,
            resolve(c) {
                const armor = Math.round(c.f(F_Q_ARMOR))
                const foe = otherSide(c.side)
                for (const u of c.g.heroes(c.side)) {
                    if (u.status !== "board") continue
                    // lấy giá trị lớn hơn nếu đang có sẵn Giáp tạm
                    c.g.status(u,
                        Q_ARMOR,
                        1,
                        {
                            v: Math.max(armor,
                                c.g.statusV(u,
                                    Q_ARMOR)),
                            of: foe
                        })
                }
                const dmg = c.f(F_Q_DMG)
                for (const t of c.g.enemies(c.self)) c.g.damage(c.self,
                    t,
                    dmg,
                    "magic",
                    {
                        tag: "skill"
                    })
            },
        },
        E: {
            key: "E", name: "Gói Cứu Trợ", target: "none", quick: true, chainOnly: true,
            desc: `Quick, Chỉ Nối Chuỗi. Khi địch đánh đúng 1 tướng mình: tướng đó phản lại ${pct(REFLECT)}% sát thương nhận từ đòn đó + {${F_REFLECT}} cho kẻ đánh (sát thương chuẩn).`,
            quickWhen: (c) => c.trigger.side !== c.side && !!c.trigger.single && !!c.trigger.target,
            resolve(c) {
                const fx = c.g.chainFx() as RenataFx
                fx.reflectUnit = c.trigger?.target
                fx.reflectPct = REFLECT
                fx.renataFlat = c.f(F_REFLECT)
            },
        },
        R: {
            key: "R", name: "Thâu Tóm", target: "all_enemies",
            desc: `Mọi tướng địch Nổi Điên: mỗi tướng đánh thường ${R_HITS} đòn vào 1 đồng đội ngẫu nhiên của nó (theo AD của chính nó). Không đánh chính nó; không có đồng đội thì bỏ qua.`,
            resolve(c) {
                const foe = otherSide(c.side)
                for (const u of c.g.heroes(foe)) {
                    if (u.status !== "board" || isOver(c.g)) continue
                    const mates = c.g.heroes(foe).filter((x) => x.id !== u.id && c.g.targetable(x))
                    if (!mates.length) continue
                    c.g.status(u,
                        "berserk",
                        1)
                    const victim = c.g.pick(mates)!
                    c.g.log(`Renata R: ${c.g.nameOf(u)} Nổi Điên, quay sang đánh ${c.g.nameOf(victim)}`)
                    for (let i = 0; i < R_HITS; i++) {
                        if (victim.status !== "board" || u.status !== "board" || isOver(c.g)) break
                        c.g.attack(u,
                            victim,
                            {
                                free: true
                            })
                    }
                }
            },
        },
    },
})
