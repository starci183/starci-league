// Kha'Zix (Sát thủ, vật lý): máu 360 · AD 80 · giáp/kháng 30/28.
// CHẤT: "Săn kẻ đứng một mình". Địch Cô Lập (không có đồng minh sống ở đường kề) ăn ×2 sát thương từ đòn đánh và chiêu của Kha'Zix.
// Q là sát thương, E tự tạo mồi (1 địch Cô Lập tới hết lượt), R biến cả bàn thành mồi. E và R là hiệu ứng thuần.
// Engine: g.isolated (cả status "isolated"), HeroDef.modifyDamage (nhân đôi).
// Đối thủ trả lời: đứng kín các đường, Janna Q huỷ đòn, Khiêu Khích kéo đòn sang tướng không Cô Lập.
import {
    defineHero
} from "../registry"
import {
    otherSide
} from "../types"

const ISO = "isolated"
const F_Q = "80 + 180% AD"
/** Hệ số sát thương lên tướng Cô Lập */
const ISO_MULT = 2

export default defineHero({
    id: "khazix", name: "Kha'Zix", role: "assassin", damage: "physical", hp: 330, atk: 86, armor: 30, mr: 28,
    bot: {
        markValue: {
            isolated: 20,
        },
    },
    desc: "Mối Họa Hư Không: săn kẻ đứng lẻ. Mỗi con chết lại mở thêm đường trống, và Kha'Zix tự tạo con mồi khi địch đứng kín.",
    passive: {
        name: "Thú Săn Mồi",
        desc: `Đòn đánh và chiêu của Kha'Zix gây ×${ISO_MULT} sát thương lên tướng địch Cô Lập.`,
    },
    modifyDamage(g, me, d) {
        if (d.src?.id !== me.id || d.target.side === me.side || (d.tag !== "attack" && d.tag !== "skill")) return 1
        return g.isolated(d.target) ? ISO_MULT : 1
    },
    skills: {
        Q: {
            key: "Q", name: "Nếm Mùi Sợ Hãi", target: "enemy",
            desc: `Chọn 1 tướng địch; gây {${F_Q}} sát thương vật lý.`,
            resolve(c) {
                c.g.damage(c.self,
                    c.target!,
                    c.f(F_Q),
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
        E: {
            key: "E", name: "Tách Đàn", target: "enemy",
            desc: "Chọn 1 tướng địch; nó Cô Lập tới hết lượt này.",
            resolve(c) {
                c.g.status(c.target!,
                    ISO,
                    1,
                    {
                        of: c.side
                    })
            },
        },
        R: {
            key: "R", name: "Cuộc Đi Săn", target: "all_enemies",
            desc: "Mọi tướng địch Cô Lập tới hết lượt này.",
            resolve(c) {
                for (const t of c.g.heroes(otherSide(c.side))) c.g.status(t,
                    ISO,
                    1,
                    {
                        of: c.side
                    })
            },
        },
    },
})
