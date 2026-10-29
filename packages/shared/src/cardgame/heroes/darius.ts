// Darius (Đấu sĩ, vật lý): máu 940 · AD 82 · giáp/kháng 36/30.
// MỤC ĐÍCH: Đao phủ. Rải Chảy Máu (status "bleed", số dấu hiện trên tướng), kéo kẻ đang chảy máu ra trước mặt, rồi kết liễu
// khi máu nó tụt dưới ngưỡng "Kề Đao" = 10% máu tối đa mỗi dấu (người chơi tự đọc được từ dấu + thanh máu).
// Engine: marks (Chảy Máu là đồng hồ kết liễu), lanes (E kéo về đối diện). Độ khó: ĐƠN GIẢN (đánh bằng sức mạnh thô).
// Đối thủ trả lời: thả diều / chặn bằng tướng khác, hồi máu ra khỏi ngưỡng Kề Đao, hoặc dồn chết Darius trước khi hắn lăn cầu tuyết.
import {
    defineHero
} from "../registry"
import type {
    Ctx, Unit
} from "../types"
import type {
    Game
} from "../game"

const BLEED = "bleed"
const MAX_BLEED = 5
/** Ngưỡng Kề Đao: mỗi dấu = 10% máu tối đa */
const BLOCK_PCT = 0.1
/** Darius gây thêm 6% sát thương cho mỗi dấu trên mục tiêu */
const AMP_PER = 0.06
const F_Q = "55 + 75% AD + 25% AP"
const F_E = "25 + 40% AD"
const F_R = "90 + 60% AD + 20% AP"

const bleedOf = (g: Game, t: Unit) => g.statusV(t,
    BLEED)
/** Mục tiêu đang "Kề Đao": máu hiện tại ≤ 10% máu tối đa × số dấu */
export const onTheBlock = (g: Game, t: Unit) => t.status === "board" && !t.token && bleedOf(g,
    t) > 0 && t.hp <= t.maxHp * BLOCK_PCT * bleedOf(g,
    t)
const addBleed = (g: Game, t: Unit, n = 1) => {
    if (t.status !== "board") return
    g.status(t,
        BLEED,
        2,
        {
            v: n, add: true, max: MAX_BLEED
        })
}
/** Sát thương chiêu của Darius (cộng 6%/dấu) rồi cộng dấu */
function cut(c: Ctx, t: Unit, raw: number, kind: "physical" | "true" = "physical", bleed = 1) {
    const amp = 1 + AMP_PER * bleedOf(c.g,
        t)
    c.g.damage(c.self,
        t,
        raw * amp,
        kind,
        {
            tag: "skill"
        })
    addBleed(c.g,
        t,
        bleed)
}
/** Kết liễu: sát thương chuẩn đủ lớn để hạ (vẫn đi qua hook như onLethal) */
function execute(c: Ctx, t: Unit): boolean {
    if (!onTheBlock(c.g,
        t)) return false
    c.g.log(`Darius executes ${t.id}`)
    c.g.damage(c.self,
        t,
        (t.hp + t.shield) * 3 + 50,
        "true",
        {
            tag: "skill"
        })
    return t.status !== "board"
}

export default defineHero({
    id: "darius", name: "Darius", role: "fighter", damage: "physical", hp: 950, atk: 82, armor: 36, mr: 30,
    skillCopies: {
        Q: 3, E: 3, R: 2
    },
    desc: "Đao phủ Noxus: rải Chảy Máu, kéo kẻ đang chảy máu ra trước mặt, rồi kết liễu khi máu nó tụt dưới ngưỡng Kề Đao.",
    passive: {
        name: "Xuất Huyết",
        desc: `Mỗi đòn đánh và chiêu của Darius cho mục tiêu 1 dấu Chảy Máu (tối đa ${MAX_BLEED}, hết sau 2 lượt của mục tiêu kể từ lần cộng cuối). Darius gây thêm ${AMP_PER * 100}% sát thương mỗi dấu trên mục tiêu. Tướng có máu ≤ ${BLOCK_PCT * 100}% máu tối đa × số dấu đang **Kề Đao**.`,
    },
    hooks: {
        onAttack(g, me, d) {
            if (d.attacker.id !== me.id) return
            d.info.mult *= 1 + AMP_PER * bleedOf(g,
                d.target)
        },
        onAttackHit(g, me, d) {
            if (d.attacker.id !== me.id || d.info.miss) return
            addBleed(g,
                d.target)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Tàn Sát", target: "opposite",
            desc: `{${F_Q}} sát thương vật lý lên tướng đối diện, +1 dấu. **Điều kiện:** tướng đối diện đang Kề Đao sau đòn này thì bị kết liễu.`,
            resolve(c) {
                const t = c.target!
                cut(c,
                    t,
                    c.f(F_Q))
                execute(c,
                    t)
            },
        },
        E: {
            key: "E", name: "Bắt Giữ", target: "enemy",
            desc: `Kéo 1 tướng địch bất kỳ ra đứng đối diện Darius (đổi chỗ với tướng địch đang đứng đó), gây {${F_E}} sát thương vật lý và +1 dấu. **Điều kiện:** nó đã có dấu từ trước thì +2 dấu thay vì 1.`,
            resolve(c) {
                const t = c.target!
                const had = bleedOf(c.g,
                    t) > 0
                if (!t.token && c.self.lane >= 0 && c.self.lane < 5) c.g.moveTo(t,
                    c.self.lane)
                cut(c,
                    t,
                    c.f(F_E),
                    "physical",
                    had ? 2 : 1)
            },
        },
        R: {
            key: "R", name: "Máy Chém Noxus", target: "opposite",
            desc: `Kết liễu tướng đối diện nếu nó đang Kề Đao; nếu không, gây {${F_R}} sát thương chuẩn (+${AMP_PER * 100}% mỗi dấu) rồi kết liễu nếu giờ nó Kề Đao. **Điều kiện:** hạ gục được thì lá R này quay về tay.`,
            resolve(c) {
                const t = c.target!
                if (!execute(c,
                    t)) {
                    cut(c,
                        t,
                        c.f(F_R),
                        "true",
                        0)
                    execute(c,
                        t)
                }
                if (t.status !== "board") c.toHand()
            },
        },
    },
})
