// Sylas (Pháp sư, phép): kẻ phá xiềng. Mọi con số nằm trong balance/heroes/sylas.json (docs/heroes/KITS.md).
// Bùng Nổ Cổ Thạch: mỗi lá chiêu cho 1 Xiềng Nổ; đòn thường gây phép và tiêu 1 Xiềng Nổ để nổ lan 3 đường.
// R Đoạt Chiêu tái dùng cơ chế Lá Tái Chế của Rumble: Chiêu Đoạt mang card.id = id lá gốc, data.recycled = tướng gốc, engine tung bằng
// chiêu gốc với Sylas làm người dùng, AD đổi từ AP theo apPerAd; khác Rumble ở chỗ giữ khống chế (keepCC) và trả đủ mana gốc.
// args.pick của R là chính nhãn Hand.tsx hiện ra (lựa chọn không phải lá bài thì Hand in nguyên chuỗi), resolve tra lại bằng stealChoices.
import {
    actorOrEnemy, kit, when
} from "../balance"
import {
    soldierAttackHit
} from "./azir"
import {
    castNow, skillArgs
} from "../engine"
import type {
    Game
} from "../game"
import {
    defineHero, getHero
} from "../registry"
import type {
    Card, OptCtx, PlayArgs, Side, SkillDef, SkillKey, Unit
} from "../types"
import {
    otherSide
} from "../types"

const k = kit("sylas"), { p } = k
/** Xiềng Nổ (trên Sylas): tối đa p1, mất một nửa khi chết */
export const SHACKLE = "sylas_shackle"

const F_BURST = k.x("p2 + p3·AP"), EN_BURST = k.xe("p2 + p3·AP")
const F_Q = k.x("q1 + q2·AP"), EN_Q = k.xe("q1 + q2·AP")
const F_E = k.x("e1 + e2·AP"), EN_E = k.xe("e1 + e2·AP")
const F_HEAL = k.x("e3 + e4·AP + e5% máu đã mất"), EN_HEAL = k.xe("e3 + e4·AP + e5% máu đã mất")

/**
 * Chiêu chỉ có nghĩa với chính chủ: phần lớn tác dụng nằm ở hook của tướng gốc (hook lọc theo chủ nên Sylas tung thì không làm gì)
 * hoặc chiêu sinh lá của tướng gốc mà phe Sylas không dùng được. Các chiêu chỉ mất phần phụ (Ahri R mất Say Mê, Zed Q mất đòn thêm) vẫn đoạt được
 * vì phần chính là sát thương. Chiêu bị chặn theo tình huống (Katarina R, Darius R...) do canPlay/options lọc ở stealChoices.
 */
const OWNER_BOUND = new Set([
    "ashe_q", // Tập Trung: Tốc Đánh và Buốt nằm ở hook của Ashe
    "kogmaw_e", // Cao Xạ: hook của Kog'Maw
    "tristana_q", // Bắn Nhanh: hook của Tristana
    "tristana_e", // Gắn Bom: không sát thương, chỉ Tristana kích nổ
    "vayne_r", // Giờ Cuối: hook của Vayne
    "jinx_q", // Giật Bắn!: chỉ Jinx có Điên
    "khazix_r", // Tấn Công Hư Không: sinh lá Kha'Zix
    "gangplank_e", // Thùng: nổ theo hook của Gangplank
    "gangplank_r", // Lệnh Truy Nã: chỉ kích nổ Thùng của Gangplank
    "sylas_r", // không đoạt lặp vô tận trong trận gương
])

/** Lá Chiêu Đoạt giả dùng để hỏi canPlay/options của chiêu gốc (không tốn uid, legalActions không được đổi state) */
const probeCard = (side: Side, id: string, data?: Card["data"]): Card => ({
    uid: "", kind: "skill", id, hero: "sylas", side, ...(data ? {
        data
    } : {
    })
})
/** Mã lựa chọn "steal:<tướng>:<Q|E|R>": Hand.tsx đọc ra tên, ảnh, mô tả chiêu đúng ngôn ngữ */
const pickLabel = (hero: string, key: SkillKey) => `steal:${hero}:${key}`
/** Các chiêu của `t` mà Sylas đoạt được lúc này. Cờ stealOnlyR: chỉ R */
function stealChoices(g: Game, side: Side, self: Unit, t: Unit): { key: SkillKey; def: SkillDef; label: string }[] {
    const out: { key: SkillKey; def: SkillDef; label: string }[] = []
    for (const key of (k.flag("stealOnlyR") ? ["R"] : ["Q",
        "E",
        "R"]) as SkillKey[]) {
        const id = `${t.hero}_${key.toLowerCase()}`
        const def = getHero(t.hero)?.skills[key]
        if (!def || OWNER_BOUND.has(id)) continue
        if (!skillArgs(g,
            side,
            self,
            probeCard(side,
                id,
                def.stealData?.(t)),
            def).length) continue
        out.push({
            key, def, label: pickLabel(t.hero,
                key)
        })
    }
    return out
}
/** Lá Chiêu Đoạt của chiêu `key` trên `t` */
function stolenCard(g: Game, side: Side, t: Unit, key: SkillKey, def: SkillDef): Card {
    return {
        ...g.tempSkillCard("sylas",
            side,
            key,
            {
                recycled: t.hero, apPerAd: p.p4, keepCC: k.num("keepCC"), stolen: 1, ...def.stealData?.(t)
            }), id: `${t.hero}_${key.toLowerCase()}`
    }
}
/** Tham số tung ngay: nhắm đúng kẻ bị đoạt nếu được, không thì lựa chọn đầu tiên */
function castArgs(g: Game, side: Side, self: Unit, t: Unit, card: Card, def: SkillDef): PlayArgs | undefined {
    const all = skillArgs(g,
        side,
        self,
        card,
        def)
    return all.find((a) => a.target === t.id) ?? all[0]
}
/** Mỗi địch chọn được × mỗi chiêu đoạt được là 1 lựa chọn; hộp chọn của Hand.tsx gom theo args.pick */
function stealOptions(c: OptCtx): PlayArgs[] {
    const out: PlayArgs[] = []
    const foes = skillArgs(c.g,
        c.side,
        c.self,
        c.card,
        {
            key: "R", name: "", desc: "", target: "enemy", resolve() {}
        })
    for (const a of foes) {
        const t = c.g.unit(a.target)
        if (t) for (const s of stealChoices(c.g,
            c.side,
            c.self,
            t)) {
            // Tung ngay nên phải đủ mana cả R lẫn chiêu đoạt
            if (!k.flag("stealToHand") && c.g.manaOf(c.self) < p.r0 + c.g.manaCost(c.self,
                s.def,
                probeCard(c.side,
                    `${t.hero}_${s.key.toLowerCase()}`))) continue
            out.push({
                target: t.id, pick: s.label
            })
        }
    }
    return out
}

/** Địch đang đứng ở đường đối diện Sylas và 2 đường kề, chọn được */

export default defineHero({
    id: "sylas", name: "Sylas", role: "mage", damage: "magic", ...k.base,
    deathHalf: [SHACKLE],
    bot: k.bot,
    desc: "Kẻ phá xiềng: mỗi lá chiêu nạp Xiềng Nổ cho đòn đánh, Q quất ba đường, E hút Máu từ một kẻ, R đoạt một chiêu bất kỳ của địch trên sân và tung như của mình.",
    passive: {
        name: "Bùng Nổ Cổ Thạch",
        desc: `Mỗi lá chiêu Sylas dùng cho 1 Xiềng Nổ, tối đa ${p.p1}. Đòn đánh thường của Sylas gây sát thương phép; mỗi đòn tiêu 1 Xiềng Nổ để gây thêm {${F_BURST}} sát thương phép lên mục tiêu và 2 đường kề. Khi Sylas bị hạ, mất một nửa số Xiềng Nổ.`,
    },
    hooks: {
        onCast(g, me, d) {
            if (d.caster.id === me.id && d.card.kind === "skill") g.stack(me,
                SHACKLE,
                1,
                p.p1)
        },
        // Lính Cát gọi bằng Chiêu Đoạt (Azir E): hook của Azir chỉ chạy với Azir nên Sylas tự gọi; Sylas không nhận Tốc Đánh theo Lính
        onAttackHit(g, me, d) {
            soldierAttackHit(g,
                me,
                d)
            if (d.attacker.id !== me.id || d.info.miss || d.target.side === me.side || g.stackOf(me,
                SHACKLE) <= 0) return
            g.setStack(me,
                SHACKLE,
                g.stackOf(me,
                    SHACKLE) - 1)
            const raw = g.f(me,
                    F_BURST), t = d.target
            const near = t.token ? [] : g.neighbors(t)
            if (t.status === "board") g.damage(me,
                t,
                raw,
                "magic",
                {
                    tag: "effect", aoe: true, visuals: ["sylasBurst"]
                })
            for (const o of near) g.damage(me,
                o,
                raw,
                "magic",
                {
                    tag: "effect", aoe: true, via: t.id, visuals: ["sylasBurst"]
                })
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Roi Xích", target: "ally_other", mana: p.q0,
            desc: `Chọn 1 đồng minh: xích kéo nó đổi chỗ với Sylas, rồi gây {${F_Q}} sát thương phép, nhân ${p.q3}%, lên tướng địch ngay trước mặt Sylas ở vị trí mới.`,
            resolve(c) {
                const ally = c.target!
                c.g.swapWith(c.self,
                    ally)
                // sau khi đổi chỗ: đánh tướng địch đứng đối diện Sylas
                const front = c.g.at(otherSide(c.self.side),
                    c.self.lane)
                if (front && !front.token && c.g.targetable(front)) c.g.damage(c.self,
                    front,
                    c.f(F_Q) * p.q3 / 100,
                    "magic",
                    {
                        tag: "skill"
                    })
            },
        },
        E: {
            key: "E", name: "Thợ Săn Vua", target: "enemy", mana: p.e0, quick: true, quickWhen: when.targetsSelf, options: actorOrEnemy,
            desc: `Quick: khi địch nhắm đúng Sylas, có thể dùng lá này, mục tiêu là kẻ đó. Chọn 1 tướng địch: {${F_E}} sát thương phép; Sylas hồi {${F_HEAL}} Máu.`,
            resolve(c) {
                c.g.damage(c.self,
                    c.target!,
                    c.f(F_E),
                    "magic",
                    {
                        tag: "skill"
                    })
                if (c.self.status === "board") c.g.heal(c.self,
                    c.self,
                    c.f(F_HEAL))
            },
        },
        R: {
            key: "R", name: "Đoạt Chiêu", target: "enemy", mana: p.r0, options: stealOptions,
            desc: `Chọn 1 tướng địch trên sân, đoạt R của nó và tung ngay như chiêu của mình, nhắm đúng tướng đó nếu được, trả mana gốc của lá đó, AD đổi từ AP (${p.p4} AP = 1 AD), giữ nguyên khống chế, giữ Quick nếu lá gốc là Quick, tồn tại tới hết lượt đối phương, dùng xong biến mất. Hệ số Máu, Giáp giữ nguyên, tính theo Sylas. Chiêu không dùng được với Sylas không hiện trong lựa chọn.`,
            resolve(c) {
                const g = c.g, t = c.target!
                const hit = stealChoices(g,
                    c.side,
                    c.self,
                    t).find((s) => s.label === c.args.pick)
                if (!hit) return
                g.emit({
                    t: "log", text: `Sylas đoạt ${hit.label} của ${g.nameOf(t)}`
                })
                const card = stolenCard(g,
                    c.side,
                    t,
                    hit.key,
                    hit.def)
                if (k.flag("stealToHand")) {
                    g.giveCard(c.side,
                        card,
                        "hand")
                    return
                }
                const args = castArgs(g,
                    c.side,
                    c.self,
                    t,
                    card,
                    hit.def)
                if (args) castNow(g,
                    c.side,
                    card,
                    args)
            },
        },
    },
    en: {
        desc: "The Unshackled: every skill card loads Shackle Bursts for his attacks, Q lashes three lanes, E drains one enemy, R hijacks any skill of an enemy on the board and casts it as his own.",
        passive: {
            name: "Petricite Burst",
            desc: `Each skill card Sylas casts gives 1 Shackle Burst, up to ${p.p1}. His basic attacks deal magic damage; each attack spends 1 Shackle Burst to deal an extra {${EN_BURST}} magic damage to the target and the 2 adjacent lanes. When Sylas is taken down he loses half his Shackle Bursts.`,
        },
        skills: {
            Q: {
                name: "Chain Lash",
                desc: `Choose 1 ally: the chain yanks it into a swap with Sylas, then he deals {${EN_Q}} magic damage, multiplied by ${p.q3}%, to the enemy champion straight in front of him at his new position.`,
            },
            E: {
                name: "Kingslayer",
                desc: `Quick: when an enemy targets exactly Sylas, you may play this card, and its target is that enemy. Choose 1 enemy champion: {${EN_E}} magic damage; Sylas heals {${EN_HEAL}} HP.`,
            },
            R: {
                name: "Hijack",
                desc: `Choose 1 enemy champion on the board hijack its R and cast it at once as his own, aimed at that champion when possible, at its original mana, AD comes from AP (${p.p4} AP = 1 AD), crowd control is kept, Quick is kept if the original is Quick, it lasts until the end of the opponent's turn and vanishes after use. HP and Armor ratios stay, read from Sylas. Skills Sylas cannot use are not offered.`,
            },
        },
    },
})
