// Test cơ chế đặc trưng 8 tướng nhóm G2: Darius, Zed, Katarina, Kha'Zix, Qiyana, Aatrox, Garen, Vayne.
// Chạy: npx tsx scripts/card_tests_g2.ts [--only=chuỗi] [--verbose]. Khung test chép từ scripts/card_tests.ts.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    evoTier, isolated
} from "../packages/shared/src/cardgame/heroes/khazix"
import {
    qiyanaElement
} from "../packages/shared/src/cardgame/heroes/qiyana"
import {
    leadCount
} from "../packages/shared/src/cardgame/heroes/garen"

type St = ReturnType<typeof cg.newGame>;
type Act = Parameters<typeof cg.applyAction>[1];
type Ev = ReturnType<typeof cg.applyAction>["events"];
type S = "A" | "B";
const { Game } = cg

// ======================================================================
// Khung test
// ======================================================================
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7)
const VERBOSE = process.argv.includes("--verbose")
const results: { group: string; name: string; res: "PASS" | "FAIL"; note?: string }[] = []
let group = ""
const G = (name: string) => { group = name }
function test(name: string, fn: () => void) {
    if (only && !`${group} ${name}`.toLowerCase().includes(only.toLowerCase())) return
    try {
        fn()
        results.push({
            group, name, res: "PASS"
        })
    } catch (e) {
        results.push({
            group, name, res: "FAIL", note: (e as Error).message.split("\n").slice(0,
                3).join(" | ") + (VERBOSE ? `\n${(e as Error).stack}` : "")
        })
    }
}

// ======================================================================
// Tướng giả: không có chiêu, không phản ứng (để test không bị chuỗi của tướng khác chen vào)
// ======================================================================
const noSkill = (key: "Q" | "E" | "R") => ({
    key, name: "-", desc: "-", target: "none" as const, canPlay: () => false, resolve: () => {}
})
for (const [id,
    role] of [["g2_tank",
        "tank"],
    ["g2_fighter",
        "fighter"],
    ["g2_mage",
        "mage"],
    ["g2_mark",
        "marksman"],
    ["g2_sup",
        "support"]] as const) {
    cg.defineHero({
        id, name: id, role, damage: "physical", hp: 1000, atk: 50, armor: 30, mr: 30,
        passive: {
            name: "-", desc: "-"
        },
        skills: {
            Q: noSkill("Q"), E: noSkill("E"), R: noSkill("R")
        },
    })
}
const DUMMIES = ["g2_tank",
    "g2_fighter",
    "g2_mage",
    "g2_mark",
    "g2_sup"]

// ======================================================================
// Trợ giúp dựng tình huống
// ======================================================================
const SEED = 20261029
type Setup = { A?: Record<string, number>; B?: Record<string, number>; seed?: number; round?: number };
/** Ván round 8 (mở hết đường), tướng đặt thẳng vào đường; đội bù bằng tướng giả; tay hai bên rỗng */
function mk(o: Setup = {
}): St {
    const a = Object.keys(o.A ?? {
        }), b = Object.keys(o.B ?? {
        })
    const fill = (x: string[]) => [...x,
        ...DUMMIES.filter((h) => !x.includes(h))].slice(0,
        Math.max(5,
            x.length))
    const s = cg.newGame(o.seed ?? SEED,
        fill(a),
        fill(b))
    s.round = o.round ?? 8
    const g = new Game(s)
    for (const [side,
        m] of [["A",
            o.A ?? {
            }],
        ["B",
            o.B ?? {
            }]] as const) for (const [h,
        lane] of Object.entries(m)) g.summon(side,
        h,
        lane)
    s.players.A.hand = []
    s.players.B.hand = []
    s.phase = "main"; s.opened = {
        A: true, B: true
    } // bỏ qua bước gọi tướng + tay đầu: test tự dựng tay
    return s
}
const gm = (s: St) => new Game(s)
const u = (s: St, side: S, hero: string) => s.units[`${side}:${hero}`]
const skill = (s: St, hero: string, side: S, k: cg.SkillKey) => gm(s).skillCard(hero,
    side,
    k)
const sup = (s: St, id: cg.SupportId) => gm(s).supportCard(id)
function give(s: St, side: S, card: cg.Card) { s.players[side].hand.push(card); return card }
function act(s: St, a: Act): { s: St; ev: Ev } {
    const r = cg.applyAction(s,
        a)
    return {
        s: r.state, ev: r.events
    }
}
function play(s: St, side: S, card: { uid: string }, args: cg.PlayArgs = {
}) {
    return act(s,
        {
            t: "play", side, uid: card.uid, args
        })
}
const end = (s: St, side: S) => {
    // kết thúc lượt; lượt mới bắt đầu ở bước gọi tướng: test tự bấm "rút bài" (không gọi thêm tướng)
    const r = act(s,
        {
            t: "end", side: side
        })
    if (r.s.phase !== "summon") return r
    const d = act(r.s,
        {
            t: "draw", side: r.s.active
        })
    return {
        s: d.s, ev: [...r.ev,
            ...d.ev]
    }
}
const evs = <T extends cg.GameEvent["t"]>(ev: Ev, t: T) => ev.filter((e) => e.t === t) as Extract<cg.GameEvent, { t: T }>[]
const dmgTo = (ev: Ev, target: string, tag?: string) => evs(ev,
    "damage").filter((d) => d.target === target && (!tag || d.tag === tag)).reduce((x, d) => x + d.amount,
    0)
const inHand = (s: St, side: S, card: { uid: string }) => s.players[side].hand.some((c) => c.uid === card.uid)
const legalPlays = (s: St, side: S, uid: string) => cg.legalActions(s,
    side).filter((a) => a.t === "play" && a.uid === uid) as Extract<Act, { t: "play" }>[]

// ======================================================================
G("Darius")
// ======================================================================
test("E kéo tướng địch bất kỳ ra đối diện Darius và cắm 1 dấu Chảy Máu",
    () => {
        let s = mk({
            A: {
                darius: 2
            }, B: {
                g2_fighter: 4, g2_tank: 2
            }
        })
        const e = give(s,
            "A",
            skill(s,
                "darius",
                "A",
                "E"))
        s = play(s,
            "A",
            e,
            {
                target: "B:g2_fighter"
            }).s
        assert.equal(u(s,
            "B",
            "g2_fighter").lane,
        2)
        assert.equal(u(s,
            "B",
            "g2_tank").lane,
        4,
        "tướng đang đứng đó bị đổi chỗ")
        assert.equal(gm(s).statusV(u(s,
            "B",
            "g2_fighter"),
        "bleed"),
        1)
    })
test("R kết liễu tướng đối diện đang Kề Đao (5 dấu, 40% máu) và lá R về tay",
    () => {
        let s = mk({
            A: {
                darius: 2
            }, B: {
                g2_tank: 2
            }
        })
        const t = u(s,
            "B",
            "g2_tank")
        gm(s).status(t,
            "bleed",
            2,
            {
                v: 5
            })
        t.hp = Math.round(t.maxHp * 0.4)
        const r = give(s,
            "A",
            skill(s,
                "darius",
                "A",
                "R"))
        s = play(s,
            "A",
            r).s
        assert.equal(u(s,
            "B",
            "g2_tank").status,
        "dead")
        assert.ok(inHand(s,
            "A",
            r),
        "R quay về tay")
    })
test("Q không kết liễu khi máu còn trên ngưỡng (1 dấu, 90% máu)",
    () => {
        let s = mk({
            A: {
                darius: 2
            }, B: {
                g2_tank: 2
            }
        })
        const q = give(s,
            "A",
            skill(s,
                "darius",
                "A",
                "Q"))
        s = play(s,
            "A",
            q).s
        assert.equal(u(s,
            "B",
            "g2_tank").status,
        "board")
        assert.equal(gm(s).statusV(u(s,
            "B",
            "g2_tank"),
        "bleed"),
        1)
    })

// ======================================================================
G("Zed")
// ======================================================================
test("E với 4 lá Zed trong mộ tạo 2 lá Bóng sao chép Q/R gần nhất",
    () => {
        let s = mk({
            A: {
                zed: 2
            }, B: {
                g2_tank: 2
            }
        })
        for (let i = 0; i < 3; i++) s.players.A.grave.push(skill(s,
            "zed",
            "A",
            "Q"))
        s.players.A.grave.push(skill(s,
            "zed",
            "A",
            "R"))
        const e = give(s,
            "A",
            skill(s,
                "zed",
                "A",
                "E"))
        s = play(s,
            "A",
            e,
            {
                lane: 2
            }).s
        const shadows = s.players.A.hand.filter((c) => c.id === "shadow")
        assert.equal(shadows.length,
            2)
        assert.deepEqual(shadows.map((c) => c.copyOf).sort(),
            ["zed_q",
                "zed_r"])
    })
test("Dấu Ấn đếm đòn hiện trên dấu, nổ cuối lượt Zed theo số đòn (sát thương chuẩn)",
    () => {
        let s = mk({
            A: {
                zed: 2
            }, B: {
                g2_tank: 2
            }
        })
        const r = give(s,
            "A",
            skill(s,
                "zed",
                "A",
                "R"))
        const q = give(s,
            "A",
            skill(s,
                "zed",
                "A",
                "Q"))
        s = play(s,
            "A",
            r,
            {
                target: "B:g2_tank"
            }).s
        const v1 = gm(s).statusV(u(s,
            "B",
            "g2_tank"),
        "zedmark")
        s = play(s,
            "A",
            q,
            {
                target: "B:g2_tank"
            }).s
        const v2 = gm(s).statusV(u(s,
            "B",
            "g2_tank"),
        "zedmark")
        assert.ok(v2 >= v1 + 2,
            `Q + đòn đánh thêm cộng 2 đòn (${v1} -> ${v2})`)
        const r2 = end(s,
            "A")
        const boom = evs(r2.ev,
            "damage").find((d) => d.target === "B:g2_tank" && d.kind === "true" && d.tag === "effect")
        assert.ok(boom,
            "dấu nổ")
        const g = gm(s)
        const z = u(s,
            "A",
            "zed")
        assert.equal(boom!.amount,
            Math.round(g.f(z,
                "40 + 30% AD") + v2 * g.f(z,
                "30 + 25% AD")))
        assert.equal(r2.s.units["B:g2_tank"].statuses.zedmark,
            undefined)
    })

// ======================================================================
G("Katarina")
// ======================================================================
test("Ra sân cắm dao ở đường mình; Q cắm dao vào đường mục tiêu",
    () => {
        let s = mk({
            A: {
                katarina: 2
            }, B: {
                g2_tank: 4
            }
        })
        const k = u(s,
            "A",
            "katarina")
        assert.equal(k.stacks.dagger3,
            2)
        const q = give(s,
            "A",
            skill(s,
                "katarina",
                "A",
                "Q"))
        s = play(s,
            "A",
            q,
            {
                target: "B:g2_tank"
            }).s
        assert.equal(u(s,
            "A",
            "katarina").stacks.dagger5,
        2)
    })
test("E chỉ chọn được đường có dao; lướt tới, chém tướng đối diện, cắm lại dao ở đường cũ",
    () => {
        let s = mk({
            A: {
                katarina: 2
            }, B: {
                g2_tank: 4
            }
        })
        u(s,
            "A",
            "katarina").stacks.dagger3 = 0
        u(s,
            "A",
            "katarina").stacks.dagger5 = 2
        const e = give(s,
            "A",
            skill(s,
                "katarina",
                "A",
                "E"))
        assert.deepEqual(legalPlays(s,
            "A",
            e.uid).map((a) => a.args?.lane),
        [4])
        const r = play(s,
            "A",
            e,
            {
                lane: 4
            })
        s = r.s
        const k = u(s,
            "A",
            "katarina")
        assert.equal(k.lane,
            4)
        assert.equal(k.stacks.dagger5,
            0,
            "đã nhặt dao")
        assert.equal(k.stacks.dagger3,
            2,
            "cắm lại dao ở đường cũ")
        assert.ok(dmgTo(r.ev,
            "B:g2_tank",
            "skill") > 0)
    })
test("Dao rơi sau 2 lượt của Katarina",
    () => {
        let s = mk({
            A: {
                katarina: 2
            }, B: {
                g2_tank: 4
            }
        })
        for (let i = 0; i < 4; i++) s = end(s,
            s.active).s
        assert.equal(u(s,
            "A",
            "katarina").stacks.dagger3,
        0)
    })
test("Hạ gục trong lượt mình: lá Q gần nhất trong mộ về tay",
    () => {
        let s = mk({
            A: {
                katarina: 2
            }, B: {
                g2_tank: 2
            }
        })
        const old = skill(s,
            "katarina",
            "A",
            "Q")
        s.players.A.grave.push(old)
        u(s,
            "B",
            "g2_tank").hp = 5
        const q = give(s,
            "A",
            skill(s,
                "katarina",
                "A",
                "Q"))
        s = play(s,
            "A",
            q,
            {
                target: "B:g2_tank"
            }).s
        assert.equal(u(s,
            "B",
            "g2_tank").status,
        "dead")
        assert.ok(inHand(s,
            "A",
            old))
    })

// ======================================================================
G("Kha'Zix")
// ======================================================================
test("Cô Lập đọc từ đường kề; Q đánh kẻ Cô Lập đau hơn và Rã Giáp",
    () => {
        let s = mk({
            A: {
                khazix: 2
            }, B: {
                g2_tank: 0, g2_fighter: 2, g2_mage: 3
            }
        })
        const g = gm(s)
        assert.equal(isolated(g,
            u(s,
                "B",
                "g2_tank")),
        true)
        assert.equal(isolated(g,
            u(s,
                "B",
                "g2_fighter")),
        false)
        const q1 = give(s,
            "A",
            skill(s,
                "khazix",
                "A",
                "Q"))
        const q2 = give(s,
            "A",
            skill(s,
                "khazix",
                "A",
                "Q"))
        const a = play(s,
            "A",
            q1,
            {
                target: "B:g2_tank"
            })
        const b = play(a.s,
            "A",
            q2,
            {
                target: "B:g2_fighter"
            })
        assert.ok(dmgTo(a.ev,
            "B:g2_tank") > dmgTo(b.ev,
            "B:g2_fighter") * 1.3)
        assert.ok(a.s.units["B:g2_tank"].statuses.shred)
        s = b.s
    })
test("E vồ kẻ Cô Lập: nhảy sang đường nó và Tàng Hình",
    () => {
        let s = mk({
            A: {
                khazix: 2
            }, B: {
                g2_tank: 0, g2_fighter: 3
            }
        })
        const e = give(s,
            "A",
            skill(s,
                "khazix",
                "A",
                "E"))
        s = play(s,
            "A",
            e,
            {
                target: "B:g2_tank"
            }).s
        assert.equal(u(s,
            "A",
            "khazix").lane,
        0)
        assert.ok(u(s,
            "A",
            "khazix").statuses.stealth)
    })
test("R hất tướng địch ra đường trống; tiến hoá = số lá thưởng đã lật",
    () => {
        let s = mk({
            A: {
                khazix: 2
            }, B: {
                g2_tank: 2, g2_fighter: 3
            }
        })
        s.prizes.A = 3
        const r = give(s,
            "A",
            skill(s,
                "khazix",
                "A",
                "R"))
        s = play(s,
            "A",
            r,
            {
                target: "B:g2_tank", lane: 0
            }).s
        assert.equal(u(s,
            "B",
            "g2_tank").lane,
        0)
        assert.equal(evoTier(gm(s),
            u(s,
                "A",
                "khazix")),
        3)
        assert.equal(u(s,
            "A",
            "khazix").lane,
        0,
        "bậc 3 nhảy theo")
    })

// ======================================================================
G("Qiyana")
// ======================================================================
test("Nguyên tố = lá trên cùng mộ: Vàng (Đá) làm Q Choáng, Rút Bài (Sông) làm Buốt",
    () => {
        let s = mk({
            A: {
                qiyana: 2
            }, B: {
                g2_tank: 2
            }
        })
        s.players.A.grave.push(sup(s,
            "gold"))
        const q = give(s,
            "A",
            skill(s,
                "qiyana",
                "A",
                "Q"))
        s = play(s,
            "A",
            q,
            {
                target: "B:g2_tank"
            }).s
        assert.ok(u(s,
            "B",
            "g2_tank").statuses.stun)
        assert.equal(qiyanaElement(gm(s),
            "A"),
        "grass",
        "lá Q vừa vào mộ thành Cỏ")
        s.players.A.grave.push(sup(s,
            "draw"))
        const q2 = give(s,
            "A",
            skill(s,
                "qiyana",
                "A",
                "Q"))
        s = play(s,
            "A",
            q2,
            {
                target: "B:g2_tank"
            }).s
        assert.ok(u(s,
            "B",
            "g2_tank").statuses.chill)
    })
test("E đốt lá trên cùng bộ của mình: lá đó thành nguyên tố, Qiyana nhận Khiên",
    () => {
        let s = mk({
            A: {
                qiyana: 2
            }, B: {
                g2_tank: 2
            }
        })
        s.players.A.deck.unshift(sup(s,
            "item"))
        const e = give(s,
            "A",
            skill(s,
                "qiyana",
                "A",
                "E"))
        s = play(s,
            "A",
            e).s
        assert.equal(s.players.A.grave.at(-1)!.id,
            "item")
        assert.equal(qiyanaElement(gm(s),
            "A"),
        "rock")
        assert.ok(u(s,
            "A",
            "qiyana").shield > 0)
    })
test("R đốt 3 lá bộ địch, áp mọi nguyên tố lật được",
    () => {
        let s = mk({
            A: {
                qiyana: 2
            }, B: {
                g2_tank: 2, g2_fighter: 3
            }
        })
        s.players.B.deck.unshift(sup(s,
            "gold"),
        sup(s,
            "potion"),
        sup(s,
            "gold"))
        const before = s.players.B.deck.length
        const r = give(s,
            "A",
            skill(s,
                "qiyana",
                "A",
                "R"))
        s = play(s,
            "A",
            r).s
        assert.equal(s.players.B.deck.length,
            before - 3)
        for (const h of ["g2_tank",
            "g2_fighter"]) {
            assert.ok(u(s,
                "B",
                h).statuses.stun)
            assert.ok(u(s,
                "B",
                h).statuses.chill)
        }
    })

// ======================================================================
G("Aatrox")
// ======================================================================
test("Q trả máu của Aatrox rồi chém; mất máu càng nhiều càng đau",
    () => {
        const s0 = mk({
            A: {
                aatrox: 2
            }, B: {
                g2_tank: 2
            }
        })
        const s1 = structuredClone(s0)
        u(s1,
            "A",
            "aatrox").hp = 300
        const hit = (s: St) => {
            const q = give(s,
                "A",
                skill(s,
                    "aatrox",
                    "A",
                    "Q"))
            return play(s,
                "A",
                q)
        }
        const a = hit(s0), b = hit(s1)
        assert.ok(a.s.units["A:aatrox"].hp < s0.units["A:aatrox"].maxHp,
            "đã trả máu")
        assert.ok(dmgTo(b.ev,
            "B:g2_tank") > dmgTo(a.ev,
            "B:g2_tank") * 1.4)
    })
test("E hút máu: hồi bằng máu địch mất, gấp đôi khi dưới 30%",
    () => {
        const s = mk({
            A: {
                aatrox: 2
            }, B: {
                g2_tank: 2
            }
        })
        u(s,
            "A",
            "aatrox").hp = 120
        const e = give(s,
            "A",
            skill(s,
                "aatrox",
                "A",
                "E"))
        const r = play(s,
            "A",
            e,
            {
                target: "B:g2_tank"
            })
        const lost = evs(r.ev,
            "damage").filter((d) => d.target === "B:g2_tank").reduce((x, d) => x + d.hpLost,
            0)
        const healed = evs(r.ev,
            "heal").filter((h) => h.target === "A:aatrox").reduce((x, h) => x + h.amount,
            0)
        assert.equal(healed,
            lost * 2)
    })
test("R Kẻ Diệt Thế: đòn hạ gục đầu tiên không làm Aatrox gục",
    () => {
        let s = mk({
            A: {
                aatrox: 2
            }, B: {
                g2_tank: 2
            }
        })
        const r = give(s,
            "A",
            skill(s,
                "aatrox",
                "A",
                "R"))
        s = play(s,
            "A",
            r).s
        const a = u(s,
            "A",
            "aatrox")
        assert.ok(a.statuses.aatrox_r)
        const g = gm(s)
        g.damage(u(s,
            "B",
            "g2_tank"),
        a,
        99999,
        "true")
        assert.equal(a.status,
            "board")
        assert.ok(a.hp > 0)
        assert.equal(a.statuses.aatrox_r,
            undefined)
        g.damage(u(s,
            "B",
            "g2_tank"),
        a,
        99999,
        "true")
        assert.equal(a.status,
            "dead")
    })

// ======================================================================
G("Garen")
// ======================================================================
test("Công Lý đếm hạng mục địch dẫn trước; Q Câm Lặng kẻ đeo nhiều đồ hơn",
    () => {
        let s = mk({
            A: {
                garen: 2
            }, B: {
                g2_tank: 2
            }
        })
        assert.equal(leadCount(gm(s),
            "A"),
        0)
        u(s,
            "B",
            "g2_tank").items.push("infinity_edge")
        s.players.B.hand.push(sup(s,
            "gold"))
        assert.equal(leadCount(gm(s),
            "A"),
        2)
        const q = give(s,
            "A",
            skill(s,
                "garen",
                "A",
                "Q"))
        s = play(s,
            "A",
            q).s
        assert.ok(u(s,
            "B",
            "g2_tank").statuses.silence)
    })
test("R: sát thương chuẩn + 60 mỗi món đồ của mục tiêu",
    () => {
        const s = mk({
            A: {
                garen: 2
            }, B: {
                g2_tank: 2
            }
        })
        const t = u(s,
            "B",
            "g2_tank")
        const base = (() => {
            const s2 = structuredClone(s)
            const r = give(s2,
                "A",
                skill(s2,
                    "garen",
                    "A",
                    "R"))
            return dmgTo(play(s2,
                "A",
                r,
                {
                    target: t.id
                }).ev,
            t.id)
        })()
        t.items.push("x1",
            "x2")
        // đồ giả không có chỉ số, chỉ đếm số món; hạng mục "đồ" giờ địch dẫn: +15%
        const r = give(s,
            "A",
            skill(s,
                "garen",
                "A",
                "R"))
        const got = dmgTo(play(s,
            "A",
            r,
            {
                target: t.id
            }).ev,
        t.id)
        assert.ok(Math.abs(got - Math.round((base / 1 + 120) * 1.15)) <= 1,
            `${got} ~ ${Math.round((base / 1 + 120) * 1.15)}`)
    })

// ======================================================================
G("Vayne")
// ======================================================================
test("Mũi Bạc thứ 3 nổ theo % máu tối đa (sát thương chuẩn)",
    () => {
        let s = mk({
            A: {
                vayne: 2
            }, B: {
                g2_tank: 2
            }
        })
        gm(s).status(u(s,
            "B",
            "g2_tank"),
        "silver",
        2,
        {
            v: 1
        })
        const q = give(s,
            "A",
            skill(s,
                "vayne",
                "A",
                "Q"))
        const r = play(s,
            "A",
            q,
            {
                target: "B:g2_tank"
            })
        s = r.s
        const boom = evs(r.ev,
            "damage").find((d) => d.target === "B:g2_tank" && d.kind === "true")
        assert.ok(boom,
            "Q lên tank: 1 mũi từ đòn + 1 mũi tank = nổ")
        assert.ok(boom!.amount >= 120)
        assert.equal(u(s,
            "B",
            "g2_tank").statuses.silver,
        undefined)
    })
test("E: có đồng đội phía mép thì đổi chỗ; bị ghim vào tường khi đã mang mũi thì Choáng",
    () => {
        let s = mk({
            A: {
                vayne: 2
            }, B: {
                g2_tank: 1, g2_fighter: 0, g2_mage: 4
            }
        })
        const e1 = give(s,
            "A",
            skill(s,
                "vayne",
                "A",
                "E"))
        s = play(s,
            "A",
            e1,
            {
                target: "B:g2_tank"
            }).s
        assert.equal(u(s,
            "B",
            "g2_tank").lane,
        0,
        "đổi chỗ với đồng đội ở đường 1")
        assert.equal(u(s,
            "B",
            "g2_tank").statuses.stun,
        undefined)
        const e2 = give(s,
            "A",
            skill(s,
                "vayne",
                "A",
                "E"))
        s = play(s,
            "A",
            e2,
            {
                target: "B:g2_tank"
            }).s
        assert.ok(u(s,
            "B",
            "g2_tank").status !== "board" || u(s,
            "B",
            "g2_tank").statuses.stun,
        "ghim vào mép bàn")
        const e3 = give(s,
            "A",
            skill(s,
                "vayne",
                "A",
                "E"))
        s = play(s,
            "A",
            e3,
            {
                target: "B:g2_mage"
            }).s
        assert.equal(u(s,
            "B",
            "g2_mage").statuses.stun,
        undefined,
        "chưa mang mũi thì không Choáng")
    })
test("R nổ mọi mũi đang cắm và Vayne Tàng Hình; không có mũi thì không đánh được",
    () => {
        let s = mk({
            A: {
                vayne: 2
            }, B: {
                g2_tank: 2, g2_fighter: 3
            }
        })
        const r = give(s,
            "A",
            skill(s,
                "vayne",
                "A",
                "R"))
        assert.equal(legalPlays(s,
            "A",
            r.uid).length,
        0)
        gm(s).status(u(s,
            "B",
            "g2_tank"),
        "silver",
        2,
        {
            v: 1
        })
        const x = play(s,
            "A",
            r)
        s = x.s
        assert.ok(dmgTo(x.ev,
            "B:g2_tank") > 0)
        assert.equal(dmgTo(x.ev,
            "B:g2_fighter"),
        0)
        assert.ok(u(s,
            "A",
            "vayne").statuses.stealth)
    })

// ======================================================================
G("Bot & ổn định")
// ======================================================================
test("Bot chơi 8 tướng G2 không lỗi (6 trận ngắn)",
    () => {
        const heroes = ["darius",
            "zed",
            "katarina",
            "khazix",
            "qiyana",
            "aatrox",
            "garen",
            "vayne"]
        for (let k = 0; k < 6; k++) {
            const A = [0,
                1,
                2,
                3,
                4].map((i) => heroes[(k + i) % 8])
            const B = [0,
                1,
                2,
                3,
                4].map((i) => heroes[(k + i + 4) % 8])
            let s = cg.newGame(SEED + k,
                A,
                B)
            for (let i = 0; i < 400 && s.phase !== "over"; i++) s = cg.applyAction(s,
                cg.chooseAction(s,
                    cg.whoseMove(s))).state
        }
    })

// ======================================================================
// Bảng kết quả
// ======================================================================
const pad = (x: string, n: number) => (x.length >= n ? x : x + " ".repeat(n - x.length))
let lastGroup = ""
for (const r of results) {
    if (r.group !== lastGroup) {
        console.log(`\n== ${r.group} ==`)
        lastGroup = r.group
    }
    console.log(`${r.res}  ${pad(r.name,
        100)}${r.note ? `\n        -> ${r.note}` : ""}`)
}
const c = (k: string) => results.filter((r) => r.res === k).length
console.log(`\nTỔNG: ${results.length} test | PASS ${c("PASS")} | FAIL ${c("FAIL")}`)
process.exit(c("FAIL") ? 1 : 0)
