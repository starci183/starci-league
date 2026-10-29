// Ornn (Đỡ đòn, phép): máu 480 · AD 66 · giáp/kháng 45/40.
// CHẤT: "Lò rèn của đội". Mỗi lượt Ornn rèn một đồng minh cứng và sắc thêm. Rèn là bộ đếm vĩnh viễn (tối đa 10) hiện trên tướng;
// mỗi Rèn cho tướng đó thêm sát thương vật lý/đòn đánh gây ra và thêm Giáp. Hiệu ứng chạy qua HeroDef.modifyDamage của Ornn
// nên chỉ có tác dụng khi Ornn còn trên sân.
// Engine: stack "forge", HeroDef.modifyDamage, lá đặc biệt có SpecialCardDef.skill (chọn đồng minh đầu lượt), status "forge_e".
// Đối thủ trả lời: sát thương phép/chuẩn (Giáp vô dụng), sát thương theo % máu tối đa, hoặc hạ Ornn để tắt cả lò.
import {
    pct
} from "../formula"
import {
    defineHero, defineSpecialCard
} from "../registry"
import type {
    Game
} from "../game"
import type {
    PlayArgs, Unit
} from "../types"

const FORGE = "forge"
const FORGE_MAX = 10
/** Mỗi Rèn: +5% sát thương vật lý/đòn đánh gây ra và +5 Giáp */
const ATK_PER = 0.15
const ARMOR_PER = 12
const Q_FORGE = 5
const E_STATUS = "forge_e"
const CHOICE = "ornn_forge"

export const forgeOf = (g: Game, u: Unit) => g.stackOf(u,
    FORGE)
/** Rèn tính hiệu lực: E nhân đôi tới hết lượt */
const effective = (g: Game, u: Unit) => forgeOf(g,
    u) * (g.has(u,
    E_STATUS) ? 2 : 1)
const addForge = (g: Game, u: Unit, n: number) => {
    if (u.status !== "board" || u.token) return
    g.stack(u,
        FORGE,
        n,
        FORGE_MAX)
}
const allyOptions = (g: Game, me: Unit): PlayArgs[] => g.heroes(me.side).map((u) => ({
    target: u.id
}))

defineSpecialCard({
    id: CHOICE, name: "Lò Rèn",
    desc: "Chọn 1 tướng mình; nó +1 Rèn.",
    skill: {
        key: "Q", name: "Lò Rèn", target: "ally",
        desc: "Chọn 1 tướng mình; nó +1 Rèn.",
        options: (c) => allyOptions(c.g,
            c.self),
        resolve(c) {
            if (c.target) addForge(c.g,
                c.target,
                1)
        },
    },
})

/** Không chọn kịp: rèn một đồng minh ngẫu nhiên */
const forgeRandom = (g: Game, me: Unit) => {
    const u = g.pick(g.heroes(me.side))
    if (u) addForge(g,
        u,
        1)
}

export default defineHero({
    id: "ornn", name: "Ornn", role: "tank", damage: "magic", hp: 450, atk: 78, armor: 39, mr: 38,
    desc: "Thần Rèn: mỗi lượt rèn một đồng minh cứng và sắc thêm; R nhân đôi cả lò. Đổ Rèn vào một carry là có Kiệt Tác.",
    passive: {
        name: "Lò Rèn Sống",
        desc: `Đầu lượt của bạn: chọn 1 tướng mình; nó +1 Rèn (vĩnh viễn, tối đa ${FORGE_MAX}). Mỗi Rèn: tướng đó gây thêm ${pct(ATK_PER)}% sát thương vật lý (cả đòn đánh) và +${ARMOR_PER} Giáp, chỉ khi Ornn còn trên sân.`,
    },
    modifyDamage(g, me, d) {
        let m = 1
        const src = d.src
        // ATK: đồng minh có Rèn gây sát thương vật lý hoặc đòn đánh lên địch
        if (src && src.side === me.side && !src.token && d.target.side !== me.side && (d.tag === "attack" || d.kind === "physical")) {
            m *= 1 + ATK_PER * effective(g,
                src)
        }
        // Giáp: đồng minh có Rèn nhận sát thương vật lý từ địch
        const t = d.target
        if (t.side === me.side && !t.token && d.kind === "physical" && src && src.side !== me.side) {
            const bonus = ARMOR_PER * effective(g,
                t)
            if (bonus > 0) {
                const armor = g.armor(t)
                m *= (100 + armor) / (100 + armor + bonus)
            }
        }
        return m
    },
    hooks: {
        onTurnStart(g, me, d) {
            if (d.side !== me.side) return
            const card = g.createCard(me.side,
                {
                    kind: "special", id: CHOICE, hero: me.hero, side: me.side, temp: true
                })
            // tay đầy: lá biến mất ngay, rèn ngẫu nhiên thay vì mất lượt rèn
            if (!g.player(me.side).hand.some((x) => x.uid === card.uid)) forgeRandom(g,
                me)
        },
        onTempExpired(g, me, d) {
            if (d.side === me.side && d.card.id === CHOICE) forgeRandom(g,
                me)
        },
    },
    skills: {
        Q: {
            key: "Q", name: "Thổi Bễ", target: "ally", extra: "discard",
            desc: `Bỏ 1 lá trên tay, chọn 1 tướng mình; nó +${Q_FORGE} Rèn.`,
            canPlay: (c) => c.g.player(c.side).hand.some((x) => x.uid !== c.card.uid),
            options(c): PlayArgs[] {
                const hand = c.g.player(c.side).hand.filter((x) => x.uid !== c.card.uid)
                const seen = new Set<string>()
                const out: PlayArgs[] = []
                for (const x of hand) {
                    const k = `${x.kind}|${x.id}|${x.hero ?? ""}|${x.item ?? ""}`
                    if (seen.has(k)) continue
                    seen.add(k)
                    for (const a of allyOptions(c.g,
                        c.self)) out.push({
                        ...a, discard: [x.uid]
                    })
                }
                return out
            },
            resolve(c) {
                const uid = c.args.discard?.[0]
                if (uid) c.g.discard(c.side,
                    uid,
                    "cost")
                if (c.target) addForge(c.g,
                    c.target,
                    Q_FORGE)
            },
        },
        E: {
            key: "E", name: "Lửa Bùng", target: "ally", quick: true,
            desc: "Quick. Chọn 1 tướng mình; tới hết lượt, Rèn của nó tính gấp đôi.",
            options: (c) => allyOptions(c.g,
                c.self),
            resolve(c) {
                if (c.target) c.g.status(c.target,
                    E_STATUS,
                    1,
                    {
                        until: c.g.s.turnNo
                    })
            },
        },
        R: {
            key: "R", name: "Lời Hiệu Triệu Thần Rèn", target: "all_allies",
            desc: `Nhân đôi Rèn của mọi tướng mình (vĩnh viễn, tối đa ${FORGE_MAX}).`,
            resolve(c) {
                for (const u of c.g.heroes(c.side)) {
                    const n = forgeOf(c.g,
                        u)
                    if (n > 0) addForge(c.g,
                        u,
                        n)
                }
            },
        },
    },
})
