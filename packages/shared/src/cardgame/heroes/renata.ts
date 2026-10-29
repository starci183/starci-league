// Renata Glasc (Trợ thủ): máu 340 · AD 55 · giáp/kháng 25/30.
// CHẤT: "Địch có dám đánh không": trừng phạt kẻ tấn công, lật kèo khi đồng minh gục.
// Nội tại: đồng minh khác bị hạ thì hồi sinh 25% máu, hoá Cuồng Bạo (sát thương ×1.5 + 1 Đòn Miễn Phí); 1 lần/đồng minh/trận.
// Q (Quick): Khiên lớn + Giáp Phản (Khiên vỡ: kẻ phá nhận sát thương phép + Choáng). E (Quick): phản sát thương của đòn địch. R: mọi địch đánh lẫn nhau.
// Cơ chế engine dùng: hook onLethal + g.surviveWith, hook onDamage, g.chainFx().reflectUnit, HeroDef.modifyDamage, g.grantFreeAttack.
import {
    pct
} from "../formula"
import {
    defineHero
} from "../registry"
import {
    FOREVER, otherSide
} from "../types"

const REVIVED = "renata_rev"
const FRENZY = "frenzy"
const WARD = "renata_ward"
const REVIVE_PCT = 0.15
const FRENZY_MULT = 1.15
const REFLECT = 0.4
const F_Q = "70 + 50% AD"
const F_PUNISH = "60 + 70% AD"

export default defineHero({
    id: "renata", name: "Renata Glasc", role: "support", damage: "magic", hp: 300, atk: 60, armor: 28, mr: 30,
    bot: {
        buffValue: {
            frenzy: 40, renata_ward: 50,
        },
        markValue: {
            berserk: 40,
        },
    },
    desc: "Nữ tài phiệt Zaun, chuyên lật kèo: đồng minh gục thì đứng dậy phát điên, kẻ đánh vỡ Giáp bị trừng phạt, và địch quay sang đánh nhau.",
    passive: {
        name: "Cứu Trợ",
        desc: `Khi 1 đồng minh khác Renata sắp bị hạ: nó hồi sinh với ${pct(REVIVE_PCT)}% máu tối đa, nhận Cuồng Bạo và 1 Đòn Miễn Phí (1 lần mỗi đồng minh mỗi trận).`,
    },
    modifyDamage(g, me, d) {
        if (d.src && g.has(d.src,
            FRENZY) && (d.tag === "attack" || d.tag === "skill")) return FRENZY_MULT
        return 1
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
                t.maxHp * REVIVE_PCT)
            g.status(t,
                FRENZY,
                1)
            g.grantFreeAttack(t,
                {
                    id: "renata_frenzy", source: me.id
                })
        },
        onDamage(g, me, d) {
            const t = d.target
            if (t.side !== me.side || !g.has(t,
                WARD)) return
            const brokeNow = d.amount - d.hpLost > 0 && t.shield <= 0
            if (t.shield <= 0) g.removeStatus(t,
                WARD)
            const src = d.src
            if (!brokeNow || !src || src.side === me.side || src.status !== "board") return
            g.damage(me,
                src,
                g.f(me,
                    F_PUNISH),
                "magic",
                {
                    tag: "effect"
                })
            g.status(src,
                "stun",
                1)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Bắt Tay", target: "ally", quick: true,
            desc: `Quick. Chọn 1 tướng mình; nó nhận Khiên {${F_Q}} và Giáp Phản. Khi Khiên đó bị phá: kẻ phá nhận {${F_PUNISH}} sát thương phép và Choáng 1 lượt.`,
            resolve(c) {
                const t = c.target!
                c.g.shield(c.self,
                    t,
                    c.f(F_Q))
                c.g.status(t,
                    WARD,
                    1,
                    {
                        until: FOREVER
                    })
            },
        },
        E: {
            key: "E", name: "Gói Cứu Trợ", target: "none", quick: true, chainOnly: true,
            desc: `Quick, Chỉ Nối Chuỗi. Khi địch đánh đúng 1 tướng mình: tướng đó phản lại ${pct(REFLECT)}% sát thương nhận từ đòn đó cho kẻ đánh (sát thương chuẩn).`,
            quickWhen: (c) => c.trigger.side !== c.side && !!c.trigger.single && !!c.trigger.target,
            resolve(c) {
                const fx = c.g.chainFx()
                fx.reflectUnit = c.trigger?.target
                fx.reflectPct = REFLECT
            },
        },
        R: {
            key: "R", name: "Thâu Tóm", target: "all_enemies",
            desc: "Mọi tướng địch Nổi Điên: lần lượt mỗi tướng đánh thường 1 đồng đội của nó có máu thấp nhất (không còn ai thì tự đánh mình).",
            resolve(c) {
                const foe = otherSide(c.side)
                for (const u of c.g.heroes(foe)) {
                    if (u.status !== "board" || c.g.s.phase === "over") continue
                    c.g.status(u,
                        "berserk",
                        1)
                    const victim = c.g.lowestHp(c.g.heroes(foe).filter((x) => x.id !== u.id)) ?? u
                    c.g.attack(u,
                        victim,
                        {
                            free: true
                        })
                }
            },
        },
    },
})
