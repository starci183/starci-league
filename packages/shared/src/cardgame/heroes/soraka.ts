// Soraka (Trợ thủ, phép): máu 480 · AD 58 · giáp/kháng 30/34.
// CHẤT: "Máu của Soraka là máu của cả đội". Đồng minh nhận đòn chí mạng thì Soraka chịu thay; Soraka còn máu thì không ai chết.
// Q nạp lại kho máu, E (Quick) huỷ chiêu địch tung vào đồng minh để kho không bị rút, R hồi cả đội lật kèo.
// Engine: hook onLethal + g.redirectLethal, quick + chainOnly + g.chainFx().cancel. Trợ thủ: ra sân thì Q và E vào tay.
// Đối thủ trả lời: dồn sát thương vào chính Soraka trước (Zed Dồn), Vết Thương Sâu, cướp bài Q/E (Blitzcrank), Choáng/Câm Lặng chặn E.
import {
    defineHero
} from "../registry"

const F_Q = "100 + 100% AP"
const F_R = "190 + 100% AP"

export default defineHero({
    id: "soraka", name: "Soraka", role: "support", damage: "magic", hp: 360, atk: 66, armor: 30, mr: 34,
    desc: "Kho máu chung của cả đội: gánh đòn chí mạng thay đồng minh, tự hồi lại kho, huỷ chiêu địch nhắm vào đội và hồi cả đội lúc giao tranh lớn.",
    passive: {
        name: "Máu Chung",
        desc: "Khi 1 tướng mình khác Soraka nhận đòn chí mạng: Soraka chịu sát thương đó thay nó.",
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
            key: "Q", name: "Suối Nguồn Sao", target: "self",
            desc: `Soraka hồi {${F_Q}}.`,
            resolve(c) {
                c.g.heal(c.self,
                    c.self,
                    c.f(F_Q))
            },
        },
        E: {
            key: "E", name: "Cân Bằng Sao", target: "none", quick: true, chainOnly: true,
            desc: "Quick, Chỉ Nối Chuỗi. Khi địch tung lá chiêu nhắm tướng mình: huỷ lá đó (lá vẫn vào mộ).",
            quickWhen: (c) => c.trigger.side !== c.side && !!c.trigger.card && c.trigger.card.kind !== "support" && !!c.trigger.target,
            resolve(c) {
                c.g.chainFx().cancel = true
            },
        },
        R: {
            key: "R", name: "Nguyện Ước", target: "all_allies",
            desc: `Mọi tướng mình, kể cả Soraka, hồi {${F_R}}.`,
            resolve(c) {
                for (const u of c.g.heroes(c.side)) c.g.heal(c.self,
                    u,
                    c.f(F_R))
            },
        },
    },
})
