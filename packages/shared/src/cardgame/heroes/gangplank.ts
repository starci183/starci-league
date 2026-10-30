// Gangplank (Đấu sĩ, vật lý): máu 420 · AD 73 · giáp/kháng 30/29 (V3).
// CHẤT: "Ăn cam trụ đường, gài thùng nổ một tướng địch": đấu sĩ bền, bịp bằng Thùng giả. Thùng KHÔNG tự xuất hiện: E đặt Thùng thật,
// hoặc úp BẤT KỲ lá trên tay làm Thùng giả (lá đó mất). Thùng thật +1 Thuốc Súng đầu mỗi lượt của Gangplank, không hết hạn.
// Đòn đánh của Gangplank (kể cả nút Đánh nhanh 50%) vào Thùng của mình = nổ 1 Thùng thật: 1 tướng địch NGẪU NHIÊN nhận sát thương theo Thuốc Súng.
// Ô phụ chứa tối đa 1 Thùng (thật hoặc giả). Xạ thủ và Đấu sĩ địch nhắm được Thùng; đòn đánh của họ vỡ 1 Thùng NGẪU NHIÊN (địch không
// biết cái nào thật): Thùng giả lật mặt, lá úp vào mộ (đòn đó coi như phí); Thùng thật vỡ KHÔNG nổ (mất luôn Thuốc Súng).
// Engine: engine chỉ có 1 ô triệu hồi phụ mỗi bên nên mọi Thùng nằm trong MỘT token úp "keg"; danh sách từng Thùng (thật/giả,
// Thuốc Súng, lá úp của Thùng giả) là JSON trong token.secret.list (bí mật với đối thủ tới khi lật). Token hp 1 nhưng không chết vì
// sát thương: onDamage đặt lại hp. Úp Thùng giả dùng HeroDef.handUse (hành động tay chung, tốn 1 lượt đánh, không qua Chuỗi).
// Đối thủ trả lời: Xạ thủ bắn vỡ Thùng, Blitzcrank cướp Q/E, hạ Gangplank.
import type {
    Game
} from "../game"
import {
    defineHero
} from "../registry"
import type {
    Card, Unit
} from "../types"

const KEG = "keg"
/** Ô phụ chứa tối đa bấy nhiêu Thùng (thật hoặc giả) */
const MAX_KEGS = 1
const START_POWDER = 1
const FAKE_ID = "gp_fake"
/** Sát thương vật lý lên mỗi tướng địch cho mỗi Thuốc Súng của Thùng nổ */
export const F_POWDER = "55 + 120% AD + 10% AP"
/** Q: hồi máu cho chính Gangplank */
export const F_HEAL = "100 + 85% AD + 15% AP"

interface Keg {
    real: boolean;
    powder: number;
    /** Thùng giả: lá bị úp (vào mộ khi bị lật) */
    card?: Card;
}
const encode = (ks: Keg[]) => JSON.stringify(ks)
const decode = (s: string | number | undefined): Keg[] => {
    try {
        const v: unknown = JSON.parse(String(s ?? ""))
        return Array.isArray(v) ? v as Keg[] : []
    } catch {
        return []
    }
}

const kegToken = (g: Game, me: Unit): Unit | undefined => {
    const t = g.tokenOf(me.side)
    return t?.token?.id === KEG && t.token.ownerId === me.id ? t : undefined
}
export const kegsOf = (g: Game, me: Unit): Keg[] => decode(kegToken(g,
    me)?.token?.secret?.list)
/** Ghi lại danh sách Thùng: rỗng thì gỡ token */
function saveKegs(g: Game, me: Unit, ks: Keg[]) {
    const tok = kegToken(g,
        me)
    if (!ks.length) {
        if (tok?.token) {
            tok.token.secret = {
                list: "[]"
            }
            g.removeToken(tok,
                "expired")
        }
        return
    }
    if (tok?.token) {
        tok.token.secret = {
            list: encode(ks)
        }
        g.setStack(tok,
            "kegs",
            ks.length)
        return
    }
    const t = g.summonToken(me.side,
        {
            id: KEG, name: "Powder Keg", hp: 1, armor: 0, mr: 0, ownerId: me.id, soak: false, hidden: true,
            secret: {
                list: encode(ks)
            },
        })
    g.setStack(t,
        "kegs",
        ks.length)
}
/** Đặt Thùng (thật/giả) cần ô phụ chung của phe đang TRỐNG: không đè vật triệu hồi đồng minh, tối đa MAX_KEGS Thùng */
const hasRoom = (g: Game, me: Unit) => !g.tokenOf(me.side) && kegsOf(g,
    me).length < MAX_KEGS
/** Mọi cách úp Thùng (E thật hoặc lá giả) cùng một giá mana công khai */
export const PLACE_MANA = 15
function placeKeg(g: Game, me: Unit, keg: Keg) {
    const ks = kegsOf(g,
        me)
    if (ks.length >= MAX_KEGS) return
    ks.push(keg)
    saveKegs(g,
        me,
        ks)
}
/** H: lượng máu Q (Ăn Cam) hồi; các lần hồi từ Thùng giả tính theo tỉ lệ của H */
const healQ = (g: Game, me: Unit) => g.f(me,
    F_HEAL)
/** Thùng giả là lá Cam (Q của Gangplank) */
const isOrange = (k: Keg) => k.card?.id === "gangplank_q"
const HEAL_FAKE = 0.3
const HEAL_ORANGE_ENEMY = 1.6
const HEAL_ORANGE_EAT = 0.4
/** Nổ 1 Thùng thật: 1 tướng địch NGẪU NHIÊN nhận sát thương theo Thuốc Súng của nó */
function blast(g: Game, me: Unit, keg: Keg) {
    if (keg.powder <= 0) return
    const dmg = keg.powder * g.f(me,
        F_POWDER)
    const t = g.pick(g.targetableEnemies(me).filter((x) => !x.token))
    if (!t) return
    // nguồn nội tại (không phải lá chiêu): không spellcrit, không đặt dấu của lá gốc
    const dealt = g.damage(me,
        t,
        dmg,
        "physical",
        {
            tag: "effect"
        })
    g.log(`Thùng nổ trúng ${g.nameOf(t)} (−${Math.round(dealt)})`)
}

export default defineHero({
    id: "gangplank", name: "Gangplank", role: "fighter", damage: "physical", hp: 440, atk: 73, armor: 30, mr: 29,
    bot: {
        tokenValue: 30,
        tokenStackValue: {
            kegs: 25,
        },
        hiddenPrior: 0.6,
    },
    desc: "Đấu sĩ trụ đường nhờ Cam, gài Thùng thuốc súng nổ cả đội. Thùng thật to dần mỗi lượt; Thùng giả (úp bất kỳ lá nào) khiến địch phải đoán cái nào đáng phá.",
    passive: {
        name: "Thuốc Súng Bilgewater",
        desc: `Đầu lượt mình, Thùng thật thêm 1 Thuốc Súng không giới hạn. Đòn hợp lệ trúng Thùng mình tiêu một Thùng thật và nổ vào một tướng địch hợp lệ ngẫu nhiên, gây Thuốc Súng × {${F_POWDER}} sát thương vật lý. Địch đánh phá Thùng thật khiến nó mất mà không nổ; phá giả cho Gangplank hồi theo loại lá.`,
    },
    extraAttackTargets(g, me) {
        if (g.s.active !== me.side) return []
        const tok = kegToken(g,
            me)
        return tok && kegsOf(g,
            me).length ? [tok] : []
    },
    handUse: {
        id: FAKE_ID,
        name: "Úp làm Thùng giả",
        // cùng điều kiện và cùng giá 15 mana như E thật (không lộ thật/giả qua chi phí)
        can: (g, me) => hasRoom(g,
            me) && g.canCast(me) && g.manaOf(me) >= PLACE_MANA,
        resolve(g, me, card) {
            if (!g.spendMana(me,
                PLACE_MANA,
                card)) return
            placeKeg(g,
                me,
                {
                    real: false, powder: 0, card
                })
        },
    },
    hooks: {
        onTurnStart(g, me, d) {
            if (d.side !== me.side) return
            const ks = kegsOf(g,
                me)
            for (const k of ks) if (k.real) k.powder++
            if (ks.length) saveKegs(g,
                me,
                ks)
        },
        onDamage(g, me, d) {
            const tok = d.target
            if (tok.token?.id !== KEG || tok.token.ownerId !== me.id) return
            tok.hp = tok.maxHp // token không chết vì sát thương: từng Thùng vỡ/nổ theo danh sách
            if (d.tag !== "attack" || !d.src) return
            const n = g.s.attackCounts?.[d.src.id] ?? 0
            const ks = kegsOf(g,
                me)
            if (!ks.length) return
            if (d.src.side === me.side) {
                // đòn của chính Gangplank: Kích Nổ Thùng thật nhiều Thuốc Súng nhất; hết Thùng thật thì "ăn" Thùng giả
                // (ưu tiên lá Cam: hồi 40% H; Thùng giả khác chỉ vào mộ, đòn đánh bị phí)
                if (d.src.id !== me.id || !g.oncePerTurn(me,
                    `blast:${n}`)) return
                let best = -1
                ks.forEach((k, i) => { if (k.real && (best < 0 || k.powder > ks[best].powder)) best = i })
                if (best < 0) {
                    best = ks.findIndex(isOrange)
                    if (best < 0) best = 0
                    const [fake] = ks.splice(best,
                        1)
                    saveKegs(g,
                        me,
                        ks)
                    if (fake.card) g.giveCard(me.side,
                        fake.card,
                        "grave")
                    if (isOrange(fake)) g.heal(me,
                        me,
                        healQ(g,
                            me) * HEAL_ORANGE_EAT)
                    return
                }
                const [keg] = ks.splice(best,
                    1)
                saveKegs(g,
                    me,
                    ks)
                blast(g,
                    me,
                    keg)
                return
            }
            // đòn của địch (Xạ thủ): vỡ 1 Thùng ngẫu nhiên (mỗi đòn một lần)
            if (!g.oncePerTurn(me,
                `pop:${d.src.id}:${n}`)) return
            const [keg] = ks.splice(g.randInt(ks.length),
                1)
            saveKegs(g,
                me,
                ks)
            // Thùng giả bị lật: lá úp vào mộ (công khai). Thùng thật chỉ vỡ, không nổ.
            if (!keg.real && keg.card) {
                g.giveCard(me.side,
                    keg.card,
                    "grave")
                // Thùng giả bị địch phá: Gangplank hồi máu (lá Cam hồi nhiều hơn)
                g.heal(me,
                    me,
                    healQ(g,
                        me) * (isOrange(keg) ? HEAL_ORANGE_ENEMY : HEAL_FAKE))
            }
        },
    },
    skills: {
        Q: {
            key: "Q", mana: 10, name: "Ăn Cam", target: "self",
            desc: `Hồi cho chính Gangplank {${F_HEAL}} Máu. Nếu úp làm giả, địch đánh phá Cam cho hồi 160% lượng này; tự đánh ăn Cam giả hồi 40%. Địch phá giả là lá khác cho hồi 30%, tự phá lá khác không hồi.`,
            resolve(c) {
                c.g.heal(c.self,
                    c.self,
                    healQ(c.g,
                        c.self))
            },
        },
        E: {
            key: "E", mana: PLACE_MANA, name: "Đặt Thùng", target: "none",
            desc: "Khi có quyền dùng chiêu và ô phụ chung đang trống, úp E thành Thùng thật hoặc giả, hoặc úp một lá khác thành giả qua cùng wrapper kín, đều tốn 15 mana. Thùng thật bắt đầu với 1 Thuốc Súng; đặt không tiêu hay cấp quyền đánh.",
            canPlay: (c) => hasRoom(c.g,
                c.self),
            resolve(c) {
                placeKeg(c.g,
                    c.self,
                    {
                        real: true, powder: START_POWDER
                    })
            },
        },
        R: {
            key: "R", mana: 20, name: "Mưa Đại Bác", target: "none",
            desc: "Tiếp Tế Bilgewater: tạo 1 lá Q Cam và 1 lá E Thùng của Gangplank lên tay; các lá này dùng sau vẫn phải trả chi phí và tuân theo điều kiện thường.",
            resolve(c) {
                c.g.giveSkillToHand(c.self.side,
                    c.self.hero,
                    "Q",
                    "gangplank_r")
                c.g.giveSkillToHand(c.self.side,
                    c.self.hero,
                    "E",
                    "gangplank_r")
            },
        },
    },
})
