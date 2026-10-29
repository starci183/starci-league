// Qiyana (Sát thủ, vật lý): máu 360 · AD 80 · giáp/kháng 30/28.
// CHẤT: "Đặc Quyền của Nữ Hoàng". Mỗi tướng địch chỉ ăn ×2 ở nhát đầu tiên của Qiyana trong lượt; ăn xong nó "Mất Đặc Quyền" tới hết lượt.
// Rải đòn ra cả bàn (ngược Zed/Darius dồn một con): Q tiêu Đặc Quyền, E trả lại Đặc Quyền cho mọi địch, R chém mọi địch (mỗi con ×2 một lần).
// Engine: HeroDef.modifyDamage (nhân đôi + đánh dấu bằng status "privilege_lost" hết ở cuối lượt hiện tại).
// Đối thủ trả lời: Renata E phản sát thương mỗi lần bị đánh, Janna R −50%, Khiên dày trên con đầu tiên bị chém.
import {
    defineHero
} from "../registry"
import {
    otherSide
} from "../types"

const LOST = "privilege_lost"
const F_Q = "30 + 90% AD"
const F_R = "30 + 70% AD"
/** Hệ số nhát đầu lên mỗi tướng địch */
const FIRST_MULT = 2

export default defineHero({
    id: "qiyana", name: "Qiyana", role: "assassin", damage: "physical", hp: 300, atk: 74, armor: 30, mr: 28,
    desc: "Nữ Hoàng Nguyên Tố: nhát đầu lên mỗi tướng địch luôn đau gấp đôi, rải đòn khắp bàn rồi làm lại vòng hai.",
    passive: {
        name: "Đặc Quyền Nữ Hoàng",
        desc: `Mỗi tướng địch có Đặc Quyền: lần đầu Qiyana gây sát thương bằng đòn đánh hoặc chiêu lên nó thì ×${FIRST_MULT}, rồi nó Mất Đặc Quyền tới hết lượt.`,
    },
    modifyDamage(g, me, d) {
        if (d.src?.id !== me.id || d.target.side === me.side || d.target.token || (d.tag !== "attack" && d.tag !== "skill")) return 1
        if (g.has(d.target,
            LOST)) return 1
        g.status(d.target,
            LOST,
            1,
            {
                until: g.s.turnNo, src: me.id
            })
        return FIRST_MULT
    },
    skills: {
        Q: {
            key: "Q", name: "Nhát Chém Hoàng Gia", target: "enemy",
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
            key: "E", name: "Triều Kiến", target: "all_enemies",
            desc: "Mọi tướng địch có lại Đặc Quyền.",
            resolve(c) {
                for (const t of c.g.enemies(c.self)) c.g.removeStatus(t,
                    LOST)
            },
        },
        R: {
            key: "R", name: "Lệnh Xoá Sổ", target: "all_enemies",
            desc: `Gây {${F_R}} sát thương vật lý lên mọi tướng địch.`,
            resolve(c) {
                for (const t of c.g.heroes(otherSide(c.side))) c.g.damage(c.self,
                    t,
                    c.f(F_R),
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
    },
})
