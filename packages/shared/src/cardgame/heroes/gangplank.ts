// Gangplank (Đấu sĩ, vật lý): máu 900 · AD 78 · giáp/kháng 32/30. Engine: tokens (ô triệu hồi phụ), items (Vàng/đồ).
// MỤC ĐÍCH: "Thùng thuốc súng úp mặt" — Gangplank úp 1 lá trên tay thành Thùng Thuốc Súng ở ô triệu hồi phụ: lá của
// Gangplank = thùng THẬT, lá khác = thùng GIẢ (tháu cáy). Đối thủ chỉ thấy thùng úp, Thuốc Súng tăng mỗi lượt (stack hiện
// trên thùng), thùng tự xịt sau 3 lượt. Mọi thứ Gangplank làm đều trong lượt của hắn (KHÔNG có lá Quick): đối thủ luôn có
// trọn 1 lượt để đọc bàn và trả lời — chỉ đòn Đánh thường của XẠ THỦ đập được thùng (luật token toàn cục của engine).
// Cơ chế: g.summonToken({hidden, secret:{real}, card, turns:3}); lá úp theo thùng vào mộ khi thùng nổ/vỡ/xịt (trừ
// khi Gangplank gục: thùng biến mất cùng lá úp).
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import {
    otherSide,
    type Card, type PlayArgs, type Side, type Unit
} from "../types"

const KEG = "keg"
const POWDER = "powder"
const KEG_TURNS = 3
const F_KEG = "55 + 40% AD"
const F_POWDER = "35 + 20% AD"
const F_Q = "40 + 80% AD"
const F_R = "25 + 25% AD + 30% AP"
const ITEM_AMP = 0.08
const E_ITEMS = 2

const kegOf = (g: Game, me: Unit) => { const t = g.tokenOf(me.side); return t?.token?.id === KEG && t.token.ownerId === me.id ? t : undefined }
const amp = (me: Unit) => 1 + ITEM_AMP * me.items.length
const isReal = (keg: Unit) => Number(keg.token?.secret?.real ?? 0) === 1
const isGpCard = (c: Card) => c.kind === "skill" && c.hero === "gangplank"
/** Lá đã úp theo thùng vào mộ của chủ (nếu có) */
function buryKegCard(g: Game, side: Side, keg: Unit) {
    const card = keg.token?.card
    if (!card || !keg.token) return
    keg.token.card = undefined
    g.player(side).grave.push(card)
}
/** Kích nổ thùng của Gangplank: lật mặt; thật thì nổ lên mọi tướng địch theo Thuốc Súng, giả thì không gì. Trả về true nếu nổ thật. */
function detonate(g: Game, me: Unit): boolean {
    const keg = kegOf(g,
        me)
    if (!keg) return false
    g.flipToken(keg)
    const real = isReal(keg)
    const dmg = real ? (g.f(me,
        F_KEG) + g.stackOf(keg,
        POWDER) * g.f(me,
        F_POWDER)) * amp(me) : 0
    buryKegCard(g,
        me.side,
        keg)
    g.removeToken(keg,
        "dead")
    if (!real) { g.log("The Powder Keg was a fake: nothing happens."); return false }
    for (const t of g.heroes(otherSide(me.side))) g.damage(me,
        t,
        dmg,
        "physical",
        {
            tag: "skill"
        })
    return true
}

export default defineHero({
    id: "gangplank", name: "Gangplank", role: "fighter", damage: "physical", hp: 860, atk: 76, armor: 32, mr: 30,
    desc: "Thùng thuốc súng úp mặt: úp 1 lá thành thùng thật hoặc giả, Thuốc Súng tăng mỗi lượt. Đối thủ phải đoán: tốn đòn xạ thủ đập thùng, hay liều chờ nó nổ.",
    skillCopies: {
        Q: 5, E: 4, R: 2
    },
    passive: {
        name: "Thuốc Súng Bilgewater",
        desc: `Thùng Thuốc Súng úp ở ô triệu hồi phụ: đầu mỗi lượt của bạn thùng +1 Thuốc Súng (hiện trên thùng); thùng tự xịt sau ${KEG_TURNS} lượt của bạn. Chỉ đòn Đánh thường của xạ thủ địch đập được thùng (thùng 1 máu; đập thùng thật thì không nổ). Lá úp theo thùng vào mộ khi thùng nổ, vỡ hoặc xịt. Mỗi khi Gangplank hạ 1 tướng địch, bạn nhận 1 lá Vàng. Chiêu và thùng của Gangplank +${ITEM_AMP * 100}% sát thương cho mỗi món đồ hắn đeo.`,
    },
    hooks: {
        onTurnStart(g, me, d) {
            if (d.side !== me.side) return
            const keg = kegOf(g,
                me)
            if (keg) g.stack(keg,
                POWDER,
                1)
        },
        onTurnEnd(g, me, d) {
            if (d.side !== me.side) return
            const keg = kegOf(g,
                me)
            if (keg && keg.token?.expires !== undefined && keg.token.expires <= g.s.turnNo) buryKegCard(g,
                me.side,
                keg) // thùng sắp xịt (engine gỡ ngay sau hook này)
        },
        onDeath(g, me, d) {
            const v = d.victim
            if (v.token?.id === KEG && v.token.ownerId === me.id) buryKegCard(g,
                me.side,
                v) // xạ thủ địch đập vỡ thùng
        },
        onKill(g, me, d) {
            if (d.killer.id === me.id && !d.victim.token && d.victim.side !== me.side) g.giveCard(me.side,
                g.supportCard("gold"),
                "hand")
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Bắn Một Phát", target: "none",
            options(c) {
                const foes = c.g.heroes(otherSide(c.side)).filter((u) => !c.g.has(u,
                    "stealth"))
                const taunt = foes.filter((u) => c.g.has(u,
                    "taunt"))
                const out: PlayArgs[] = (taunt.length ? taunt : foes).map((u) => ({
                    target: u.id
                }))
                if (kegOf(c.g,
                    c.self)) out.push({
                    pick: KEG
                })
                return out
            },
            desc: `Chọn 1: bắn 1 tướng địch {${F_Q}} sát thương vật lý (chí mạng theo đồ); **hoặc** bắn Thùng Thuốc Súng của bạn: lật thùng, thùng thật nổ {${F_KEG}} + {${F_POWDER}} mỗi Thuốc Súng, sát thương vật lý lên **mọi tướng địch**; thùng giả không gì xảy ra. **Điều kiện:** phát bắn (hoặc vụ nổ) hạ gục tướng địch thì lá Q này quay về tay.`,
            resolve(c) {
                const foes = c.g.heroes(otherSide(c.side))
                if (c.args.pick === KEG) {
                    detonate(c.g,
                        c.self)
                } else {
                    const t = c.target
                    if (!t || t.status !== "board") return
                    const st = c.g.stats(c.self)
                    const crit = st.crit > 0 && c.g.rand() < Math.min(1,
                        st.crit)
                    c.g.damage(c.self,
                        t,
                        c.f(F_Q) * amp(c.self) * (crit ? 1.5 + st.critDmg : 1),
                        "physical",
                        {
                            tag: "skill", crit
                        })
                }
                if (foes.some((u) => u.status === "dead")) c.toHand()
            },
        },
        E: {
            key: "E", name: "Thùng Thuốc Súng", target: "none",
            canPlay: (c) => !kegOf(c.g,
                c.self),
            options(c) {
                const seen = new Set<string>()
                const out: PlayArgs[] = []
                for (const x of c.g.player(c.side).hand) {
                    if (x.uid === c.card.uid) continue
                    const k = isGpCard(x) ? `gp:${x.id}` : "fake"
                    if (seen.has(k)) continue
                    seen.add(k)
                    out.push({
                        pick: x.uid
                    })
                }
                return out
            },
            desc: `Úp 1 lá khác trên tay thành Thùng Thuốc Súng ở ô triệu hồi phụ (1 máu, tự xịt sau ${KEG_TURNS} lượt; chỉ đánh được khi chưa có thùng). Lá chiêu của Gangplank = thùng **thật**, lá khác = thùng **giả**; đối thủ chỉ thấy thùng úp. **Điều kiện:** Gangplank đeo từ ${E_ITEMS} món đồ thì thùng ra sân với sẵn 1 Thuốc Súng.`,
            resolve(c) {
                const hand = c.g.player(c.side).hand
                const i = hand.findIndex((x) => x.uid === c.args.pick)
                if (i < 0) return
                const [card] = hand.splice(i,
                    1)
                const keg = c.g.summonToken(c.side,
                    {
                        id: KEG, name: "Powder Keg", hp: 1, armor: 0, mr: 0, ownerId: c.self.id, soak: false,
                        hidden: true, secret: {
                            real: isGpCard(card) ? 1 : 0
                        }, card, turns: KEG_TURNS,
                    })
                if (c.self.items.length >= E_ITEMS) c.g.stack(keg,
                    POWDER,
                    1)
            },
        },
        R: {
            key: "R", name: "Mưa Đại Bác", target: "all_enemies",
            desc: `Kích nổ Thùng Thuốc Súng của bạn trước (nếu có; thùng giả thì không gì), rồi bắn các đợt đại bác: mỗi đợt {${F_R}} sát thương vật lý cho mọi tướng địch; 1 đợt, **thêm 1 đợt cho mỗi món đồ** Gangplank đeo. **Điều kiện:** số đợt = 1 + số đồ.`,
            resolve(c) {
                detonate(c.g,
                    c.self)
                const waves = 1 + c.self.items.length
                for (let w = 0; w < waves; w++) for (const t of c.g.heroes(otherSide(c.side))) c.g.damage(c.self,
                    t,
                    c.f(F_R) * amp(c.self),
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
    },
})
