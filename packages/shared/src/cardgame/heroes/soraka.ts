// Soraka (Trợ thủ, phép): máu 380 · AD 86 · AP gốc 58 · giáp/kháng 26/30.
// CHẤT: "Máu của Soraka là máu của cả đội". Đồng minh nhận đòn chí mạng thì Soraka chịu thay; Soraka còn máu thì không ai chết.
// Q bắn sao để nạp lại kho máu (hồi thừa thành Khiên cho đồng minh), E (Quick) huỷ chiêu địch nhắm vào đồng minh và Câm Lặng kẻ tung, R hồi cả đội lật kèo.
// Engine: hook onLethal + g.redirectLethal, quick + chainOnly + g.chainFx().cancel. Trợ thủ: ra sân thì Q và E vào tay.
// Đối thủ trả lời: dồn sát thương vào chính Soraka trước (Zed Liên Hoàn), Vết Thương Sâu, cướp bài Q/E (Blitzcrank), Choáng/Câm Lặng chặn E.
import {
    defineHero
} from "../registry"

export const F_Q = "40 + 20% AD + 60% AP"
export const F_HEAL = "60 + 20% AD + 40% AP"
export const F_R = "150 + 40% AD + 80% AP"
const BASE_AP = 58

export default defineHero({
    id: "soraka", name: "Soraka", role: "support", damage: "magic", hp: 380, atk: 86, ap: BASE_AP, armor: 26, mr: 30,
    desc: "Kho máu chung của cả đội: gánh đòn chí mạng thay đồng minh, tự hồi lại kho, huỷ chiêu địch nhắm vào đội rồi Câm Lặng kẻ tung chiêu, và hồi cả đội lúc giao tranh lớn.",
    passive: {
        name: "Máu Chung",
        desc: "Khi 1 tướng mình khác Soraka nhận đòn chí mạng: Soraka chịu toàn bộ sát thương đó thay nó, tướng đó còn sống. Soraka không đủ máu thì Soraka ngã, tướng đó vẫn sống.",
    },
    hooks: {
        onLethal(g, me, d) {
            const t = d.target
            if (t.side !== me.side || t.id === me.id || t.token || me.status !== "board") return
            g.redirectLethal(d,
                me)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Sao Băng", target: "enemy",
            desc: `Chọn 1 tướng địch; nó nhận {${F_Q}} sát thương phép, Soraka hồi {${F_HEAL}}. Phần hồi thừa thành Khiên cho tướng mình có máu thấp nhất.`,
            resolve(c) {
                const g = c.g
                g.damage(c.self,
                    c.target!,
                    c.f(F_Q),
                    "magic",
                    {
                        tag: "skill"
                    })
                const amount = c.f(F_HEAL)
                const missing = c.self.maxHp - c.self.hp
                g.heal(c.self,
                    c.self,
                    amount)
                const over = amount - missing
                const ally = g.lowestHp(g.allies(c.self,
                    false))
                if (over > 0 && ally) g.shield(c.self,
                    ally,
                    over)
            },
        },
        E: {
            key: "E", name: "Phân Định", target: "none", quick: true, chainOnly: true,
            desc: "Quick, Chỉ Nối Chuỗi. Khi địch tung lá chiêu nhắm tướng mình: huỷ lá đó (lá vẫn vào mộ) và tướng tung chiêu Câm Lặng 1 lượt.",
            quickWhen: (c) => c.trigger.side !== c.side && !!c.trigger.card && c.trigger.card.kind !== "support" && !!c.trigger.target,
            resolve(c) {
                const caster = c.g.unit(c.trigger?.actor)
                c.g.chainFx().cancel = true
                if (caster && caster.status === "board" && caster.side !== c.side) c.g.status(caster,
                    "silence",
                    1)
            },
        },
        R: {
            key: "R", name: "Ước Nguyện", target: "all_allies",
            desc: `Mọi tướng mình, kể cả Soraka, hồi {${F_R}}.`,
            resolve(c) {
                for (const u of c.g.heroes(c.side)) c.g.heal(c.self,
                    u,
                    c.f(F_R))
            },
        },
    },
})
