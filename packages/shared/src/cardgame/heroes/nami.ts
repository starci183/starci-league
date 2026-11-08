// Nami (Trợ thủ, phép): bộ chiêu chốt 31/10 - 01/11/2026 (docs/heroes/KITS.md). Số ở balance/heroes/nami.json.
// P Dậy Sóng: sát thương phe gây lên tướng địch đổi thành Dậy Sóng (AP cho cả đội, bội số 20 thì rút). Q nảy hồi - đánh, E Khiên + Phước Lành, R choáng + Dễ Tổn Thương.
import {
    kit, lockedAlly, when
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

const k = kit("nami"), { p } = k
/** Dậy Sóng (trên Nami): mất một nửa khi Nami chết, giữ khi đang chết nhưng AP tắt */
export const WAVE = "nami_wave"
/** Phước Lành (trên tướng mang): không hết hạn, không mất khi tướng mang bị hạ */
export const BLESS = "nami_bless"
/** Dễ Tổn Thương: nhận thêm v sát thương (engine đọc trong g.damage) */
export const VULNERABLE = "vulnerable"
/** Sát thương phe gây lên tướng địch chưa đủ X (kỹ thuật, không hiện) */
const ACC = "tc:nami_dmg"

const F_HEAL = k.x("q1 + q2·AP"), EN_HEAL = k.xe("q1 + q2·AP")
const F_DMG = k.x("q3 + q4·AP"), EN_DMG = k.xe("q3 + q4·AP")
const F_SHIELD = k.x("e1 + e2·AP"), EN_SHIELD = k.xe("e1 + e2·AP")
const F_BLESS = k.x("e4 + e5·AD + e6·AP"), EN_BLESS = k.xe("e4 + e5·AD + e6·AP")
const F_R = k.x("r1 + r2·AP"), EN_R = k.xe("r1 + r2·AP")
const F_STUN = k.x("r3 + r4·AP"), EN_STUN = k.xe("r3 + r4·AP")
const F_VULN = k.x("r6 + r7·AP"), EN_VULN = k.xe("r6 + r7·AP")

/** Phước Lành đã tiêu cho lá nào, và tướng địch nào đã nhận phần thêm (mỗi Game = một lần applyAction) */
const blessed = new WeakMap<Game, { cards: Set<string>; hit: Set<string> }>()

/** Cộng n Dậy Sóng; mỗi lần số tầng vượt một bội của p3 thì rút 1 lá */
function addWave(g: Game, me: Unit, n: number) {
    const before = g.stackOf(me,
        WAVE)
    const after = g.stack(me,
        WAVE,
        n)
    const draws = Math.floor(after / p.p3) - Math.floor(before / p.p3)
    if (draws > 0) g.draw(me.side,
        draws,
        {
            reason: "effect", by: me.id
        })
}

export default defineHero({
    id: "nami", name: "Nami", role: "support", damage: "magic", ...k.base,
    deathHalf: [WAVE],
    // Phước Lành của tướng mang vẫn nổ khi Nami đã chết; phần cộng Dậy Sóng tự kiểm tra Nami còn trên sân
    offBoardHooks: ["onDamage"],
    bot: k.bot,
    desc: "Thuỷ triều nuôi cả đội: sát thương của phe thành Dậy Sóng cộng AP và rút bài; Q nảy hồi máu rồi đánh địch, E che Khiên và nạp Phước Lành, R choáng và làm cả bàn địch dễ tổn thương.",
    passive: {
        name: "Dậy Sóng",
        desc: `Mỗi khi các tướng phe bạn gây tổng cộng ${p.p1} sát thương lên tướng địch, Nami nhận 1 Dậy Sóng, cộng dồn vô hạn. Mỗi Dậy Sóng giúp mọi đồng minh (cả Nami) tăng ${p.p2} AP, và khi số Dậy Sóng đạt bội của ${p.p3}, bạn rút 1 lá. Khi Nami bị hạ, mất một nửa số Dậy Sóng. Khi Nami đang chết, các tầng còn giữ nhưng phần AP tắt.`,
    },
    allyBonusStats(g, owner) {
        return {
            ap: g.stackOf(owner,
                WAVE) * p.p2
        }
    },
    hooks: {
        onDamage(g, me, d) {
            // Dậy Sóng: chỉ khi Nami còn trên sân; tính sát thương thật (Khiên + Máu) tướng phe gây lên tướng địch
            if (me.status === "board" && d.src && !d.src.token && d.src.side === me.side && d.target.side !== me.side && !d.target.token) {
                const dealt = d.hpLost + d.absorbed
                if (dealt > 0) {
                    const acc = g.stackOf(me,
                        ACC) + dealt
                    const n = Math.floor(acc / p.p1)
                    g.setStack(me,
                        ACC,
                        acc - n * p.p1)
                    if (n > 0) addWave(g,
                        me,
                        n)
                }
            }
            // Phước Lành: lá chiêu của tướng mang gây sát thương lên địch tiêu 1 Phước Lành; mỗi tướng địch trúng chịu thêm D
            const src = d.src
            if (!src || d.tag !== "skill" || src.token || d.target.token || src.side === d.target.side || g.cur.src !== src.id) return
            let st = blessed.get(g)
            if (!st) blessed.set(g,
                st = {
                    cards: new Set(), hit: new Set()
                })
            const card = `${src.id}|${g.cur.uid ?? g.cur.card}`
            if (!st.cards.has(card)) {
                if (g.stackOf(src,
                    BLESS) <= 0) return
                g.setStack(src,
                    BLESS,
                    g.stackOf(src,
                        BLESS) - 1)
                st.cards.add(card)
            }
            const key = `${card}|${d.target.id}`
            if (st.hit.has(key)) return
            st.hit.add(key)
            g.damage(src,
                d.target,
                g.f(src,
                    F_BLESS),
                g.hero(src).damage,
                {
                    tag: "effect", visuals: ["nami_bless"] // chỉ để trình diễn: client vẽ giọt Phước Lành bay theo đòn
                })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Thuỷ Triều", target: "ally", mana: p.q0,
            desc: `Chỉ định 1 đồng minh; nó hồi {${F_HEAL}} Máu, rồi 1 tướng địch ngẫu nhiên nhận {${F_DMG}} sát thương phép. Sau đó, 1 đồng minh ngẫu nhiên chưa được hồi hồi {${F_HEAL}} Máu, rồi 1 tướng địch ngẫu nhiên chưa bị đánh nhận {${F_DMG}} sát thương phép. Tối đa ${p.q5} lượt nảy; hết mục tiêu thì dừng.`,
            resolve(c) {
                const g = c.g, me = c.self
                const heal = c.f(F_HEAL), dmg = c.f(F_DMG)
                const healed = new Set<string>(), hit = new Set<string>()
                let prev = me.id
                let ally: Unit | undefined = c.target
                for (let hop = 0; hop < p.q5 && ally && ally.status === "board"; hop++) {
                    g.heal(me,
                        ally,
                        heal,
                        {
                            via: prev
                        })
                    healed.add(ally.id)
                    prev = ally.id
                    const foe = g.pick(g.targetableEnemies(me).filter((x) => !x.token && !hit.has(x.id)))
                    if (!foe) break
                    g.damage(me,
                        foe,
                        dmg,
                        "magic",
                        {
                            tag: "skill", via: prev
                        })
                    hit.add(foe.id)
                    prev = foe.id
                    ally = g.pick(g.heroes(me.side).filter((x) => !healed.has(x.id)))
                }
            },
        },
        E: {
            key: "E", name: "Phước Lành Thuỷ Triều", target: "ally", mana: p.e0, quick: true,
            quickWhen: when.targetsAlly,
            options: (c) => lockedAlly(c),
            desc: `Quick. Khi địch nhắm đúng 1 tướng mình, bạn có thể dùng lá này; mục tiêu là tướng đó (dùng chủ động thì chọn 1 tướng mình). Nó nhận {${F_SHIELD}} Khiên và ${p.e3} Phước Lành, cộng dồn vô hạn. Phước Lành: mỗi khi lá chiêu của tướng mang gây sát thương lên địch, tiêu 1 Phước Lành; mỗi tướng địch trúng chịu thêm {${F_BLESS}} sát thương theo AD/AP của tướng mang. Không hết hạn, không mất khi tướng mang bị hạ.`,
            resolve(c) {
                const t = c.target!
                c.g.shield(c.self,
                    t,
                    c.f(F_SHIELD))
                c.g.stack(t,
                    BLESS,
                    p.e3)
            },
        },
        R: {
            key: "R", name: "Sóng Thần", target: "all_enemies", mana: p.r0,
            desc: `Mọi tướng địch nhận {${F_R}} sát thương phép. Sau đó, mỗi tướng địch bị Choáng {${F_STUN}} đơn vị và nhận Dễ Tổn Thương trong ${p.r5} đơn vị. Dễ Tổn Thương: nhận thêm {${F_VULN}}% sát thương.`,
            resolve(c) {
                const g = c.g, me = c.self
                const foes = g.enemies(me).filter((x) => !x.token)
                const dmg = c.f(F_R)
                for (const t of foes) g.damage(me,
                    t,
                    dmg,
                    "magic",
                    {
                        tag: "skill"
                    })
                const stun = c.f(F_STUN), vul = c.f(F_VULN) / 100
                for (const t of foes) {
                    if (t.status !== "board") continue
                    g.timed(me,
                        t,
                        "stun",
                        stun)
                    g.timed(me,
                        t,
                        VULNERABLE,
                        p.r5,
                        {
                            v: vul
                        })
                }
            },
        },
    },
    en: {
        desc: "Tide that feeds the whole team: team damage becomes Surging Tide (AP and cards); Q bounces heals and hits, E shields and loads Blessings, R stuns and exposes the whole enemy board.",
        passive: {
            name: "Surging Tides",
            desc: `Each time your champions deal a total of ${p.p1} damage to enemy champions, Nami gains 1 Surging Tide, stacking without limit. Each Surging Tide gives every ally (Nami too) ${p.p2} AP, and when the count reaches a multiple of ${p.p3} you draw 1 card. When Nami is taken down she loses half her Surging Tides. While she is dead the stacks are kept but the AP is off.`,
        },
        skills: {
            Q: {
                name: "Ebb and Flow",
                desc: `Choose 1 ally; it heals {${EN_HEAL}} HP, then 1 random enemy champion takes {${EN_DMG}} magic damage. Then 1 random ally not yet healed heals {${EN_HEAL}} HP, then 1 random enemy champion not yet hit takes {${EN_DMG}} magic damage. Up to ${p.q5} bounces; stop when targets run out.`,
            },
            E: {
                name: "Tidecaller's Blessing",
                desc: `Quick. When an enemy targets exactly 1 of your champions, you may play this card; the target is that champion (played proactively, choose 1 of your champions). It gains {${EN_SHIELD}} Shield and ${p.e3} Blessings, stacking without limit. Blessing: whenever the bearer's skill card damages an enemy, spend 1 Blessing; each enemy champion hit takes an extra {${EN_BLESS}} damage based on the bearer's AD/AP. Never expires, kept when the bearer is taken down.`,
            },
            R: {
                name: "Tidal Wave",
                desc: `Every enemy champion takes {${EN_R}} magic damage. Then each enemy champion is Stunned for {${EN_STUN}} units and gains Vulnerable for ${p.r5} unit. Vulnerable: takes {${EN_VULN}}% more damage.`,
            },
        },
    },
})
