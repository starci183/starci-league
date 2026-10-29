// Test tự động luật chế độ thẻ bài (engine + cơ chế đặc trưng từng tướng). Chạy: npx tsx scripts/card_tests.ts [--only=chuỗi] [--verbose]
// Mỗi test dựng tình huống từ seed cố định, gọi engine thật (cg.applyAction...) và assert. In bảng PASS / FAIL / SKIP.
// Test của tướng chưa viết xong (stub todo) tự SKIP. Test lỗi do engine/tướng thì chỉ báo, không sửa code.
import assert from "node:assert/strict"
import {
    cg, combine, getItem
} from "@starci/shared"

type St = ReturnType<typeof cg.newGame>;
type Act = Parameters<typeof cg.applyAction>[1];
type Ev = ReturnType<typeof cg.applyAction>["events"];
const { Game } = cg

// ======================================================================
// Khung test
// ======================================================================
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7)
const VERBOSE = process.argv.includes("--verbose")
class Skip extends Error {}
const skip = (why: string): never => { throw new Skip(why) }
const results: { group: string; name: string; res: "PASS" | "FAIL" | "SKIP"; note?: string }[] = []
let group = ""
const G = (name: string) => { group = name }
function test(name: string, fn: () => void) {
    if (only && !`${group} ${name}`.toLowerCase().includes(only.toLowerCase())) return
    try { fn(); results.push({
        group, name, res: "PASS"
    }) }
    catch (e) {
        if (e instanceof Skip) results.push({
            group, name, res: "SKIP", note: e.message
        })
        else results.push({
            group, name, res: "FAIL", note: (e as Error).message.split("\n").slice(0,
                3).join(" | ") + (VERBOSE ? `\n${(e as Error).stack}` : "")
        })
    }
}
/** Tướng đã viết xong thì mới chạy test của tướng đó */
const needHero = (...ids: string[]) => { for (const id of ids) { const h = cg.getHero(id); if (!h) skip(`chưa có tướng ${id}`); else if (h.todo) skip(`${id} chưa viết xong (stub)`) } }

// ======================================================================
// Trợ giúp dựng tình huống
// ======================================================================
const SEED = 20260101
type Setup = { A?: Record<string, number>; B?: Record<string, number>; seed?: number; round?: number; teamA?: string[]; teamB?: string[] };
/** Dựng ván: đội 5 tướng, đặt tướng ra sân thẳng vào đường (không qua luật mở đường), mở hết đường nếu round>=8 */
function mk(o: Setup = {
}): St {
    const a = Object.keys(o.A ?? {
        }), b = Object.keys(o.B ?? {
        })
    const fill = (x: string[]) => [...x,
        ...["braum",
            "zed",
            "teemo",
            "viktor",
            "soraka"].filter((h) => !x.includes(h))].slice(0,
        Math.max(5,
            x.length))
    const s = cg.newGame(o.seed ?? SEED,
        o.teamA ?? fill(a),
        o.teamB ?? fill(b))
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
    return s
}
const gm = (s: St) => new Game(s)
const u = (s: St, side: "A" | "B", hero: string) => s.units[`${side}:${hero}`]
const hp = (s: St, side: "A" | "B", hero: string) => u(s,
    side,
    hero).hp
/** Tay cầm đúng các lá này (thay tay cũ) */
function setHand(s: St, side: "A" | "B", cards: cg.Card[]) { s.players[side].hand = cards }
function setTop(s: St, side: "A" | "B", cards: cg.Card[]) { s.players[side].deck.unshift(...cards) }
const sup = (s: St, id: cg.SupportId, item?: string) => { const c = gm(s).supportCard(id); if (item) c.item = item; return c }
const skill = (s: St, hero: string, side: "A" | "B", k: cg.SkillKey) => gm(s).skillCard(hero,
    side,
    k)
const wild = (s: St, k: "q" | "e" | "r") => gm(s).newCard({
    kind: "wild", id: `wild_${k}`
})
function act(s: St, a: Act): { s: St; ev: Ev } { const r = cg.applyAction(s,
    a); return {
    s: r.state, ev: r.events
} }
/** Đánh lá `card` (đã nằm trên tay) với args */
function play(s: St, side: "A" | "B", card: { uid: string }, args: cg.PlayArgs = {
}) { return act(s,
    {
        t: "play", side, uid: card.uid, args
    }) }
const end = (s: St, side: "A" | "B") => act(s,
    {
        t: "end", side
    })
const evs = <T extends cg.GameEvent["t"]>(ev: Ev, t: T) => ev.filter((e) => e.t === t) as Extract<cg.GameEvent, { t: T }>[]
const dmgTo = (ev: Ev, target: string, tag?: string) => evs(ev,
    "damage").filter((d) => d.target === target && (!tag || d.tag === tag)).reduce((x, d) => x + d.amount,
    0)
const expectDmg = (s: St, atkId: string, tgtId: string, mult: number) => {
    const g = gm(s), a = s.units[atkId], t = s.units[tgtId]
    const kind = g.hero(a).damage
    return Math.round(g.atk(a) * mult * (100 / (100 + (kind === "physical" ? g.armor(t) : g.mr(t)))))
}
/** Đưa chủ ván sang lượt của phe `side` (A đang đi): kết thúc lượt A rồi B nếu cần */
const toTurn = (s: St, side: "A" | "B") => { while (s.active !== side) s = end(s,
    s.active).s; return s }
const handIds = (s: St, side: "A" | "B") => s.players[side].hand.map((c) => c.id)
const inHand = (s: St, side: "A" | "B", card: { uid: string }) => s.players[side].hand.some((c) => c.uid === card.uid)
const inGrave = (s: St, side: "A" | "B", card: { uid: string }) => s.players[side].grave.some((c) => c.uid === card.uid)
const legalPlays = (s: St, side: "A" | "B", cardId?: string) =>
  cg.legalActions(s,
      side).filter((a) => a.t === "play" && (!cardId || s.players[side].hand.find((c) => c.uid === a.uid)?.id === cardId)) as Extract<Act, { t: "play" }>[]

// ======================================================================
// Hero thử nghiệm riêng cho test engine (không phụ thuộc tướng thật)
// ======================================================================
cg.defineHero({
    id: "t_guard", name: "TestGuard", role: "tank", damage: "physical", hp: 1000, atk: 50, armor: 30, mr: 30,
    passive: {
        name: "-", desc: "-"
    },
    skills: {
        Q: {
            key: "Q", name: "Test Quick", desc: "Quick, chỉ nối chuỗi lên lá địch: Khiên {77}.", target: "none", quick: true, chainOnly: true, quickWhen: (c) => c.trigger.side !== c.side, resolve: (c) => { c.g.shield(c.self,
                c.target ?? c.self,
                77) }
        },
        E: {
            key: "E", name: "-", desc: "-", target: "none", canPlay: () => false, resolve: () => {}
        },
        R: {
            key: "R", name: "-", desc: "-", target: "none", canPlay: () => false, resolve: () => {}
        },
    },
})
cg.defineHero({
    id: "t_spark", name: "TestSpark", role: "mage", damage: "magic", hp: 1000, atk: 50, armor: 30, mr: 30,
    passive: {
        name: "-", desc: "-"
    },
    skills: {
        Q: {
            key: "Q", name: "Test Spark", desc: "Quick: 50 sát thương chuẩn lên 1 tướng địch.", target: "enemy", quick: true, resolve: (c) => { if (c.target) c.g.damage(c.self,
                c.target,
                50,
                "true",
                {
                    tag: "skill"
                }) }
        },
        E: {
            key: "E", name: "-", desc: "-", target: "none", canPlay: () => false, resolve: () => {}
        },
        R: {
            key: "R", name: "-", desc: "-", target: "none", canPlay: () => false, resolve: () => {}
        },
    },
})
// tướng cho test: đủ 5 để làm đội
const TEAM = ["t_guard",
    "braum",
    "zed",
    "teemo",
    "viktor"]

// ======================================================================
G("Mở đường & ván đầu")
// ======================================================================
test("Vòng 1 chỉ mở đường 3; vòng 4 mở thêm 2,4; vòng 8 mở nốt 1,5",
    () => {
        let s = cg.newGame(SEED,
            ["darius",
                "nami",
                "braum",
                "zed",
                "teemo"],
            ["braum",
                "darius",
                "nami",
                "zed",
                "teemo"])
        const open = (st: St) => gm(st).openLanes()
        const seen = new Map<number, number[]>()
        seen.set(s.round,
            open(s))
        // chỉ tướng gọi ra thì mới không cạn bài: bộ gốc 22 lá, đi 8 vòng cần ~16 lá
        let guard = 0
        while (s.round < 8 && guard++ < 40) { s = end(s,
            s.active).s; if (!seen.has(s.round)) seen.set(s.round,
            open(s)); if (s.phase === "over") break }
        assert.deepEqual(seen.get(1),
            [2],
            "vòng 1")
        assert.deepEqual(seen.get(3),
            [2],
            "vòng 3")
        assert.deepEqual(seen.get(4),
            [1,
                2,
                3],
            "vòng 4")
        assert.deepEqual(seen.get(7),
            [1,
                2,
                3],
            "vòng 7")
        assert.deepEqual(seen.get(8),
            [0,
                1,
                2,
                3,
                4],
            "vòng 8")
    })
test("Vòng 1: chỉ gọi được tướng vào đường 3 (mọi lựa chọn summon đều lane 2)",
    () => {
        const s = cg.newGame(SEED,
            TEAM,
            TEAM)
        const sm = cg.legalActions(s,
            "A").filter((a) => a.t === "summon") as Extract<Act, { t: "summon" }>[]
        assert.ok(sm.length > 0)
        assert.ok(sm.every((a) => a.lane === 2),
            "có summon ngoài đường 3")
    })
test("Vòng 4: gọi được vào đường 2/3/4 nhưng không phải 1/5",
    () => {
        const s = mk({
            round: 4
        })
        const lanes = new Set((cg.legalActions(s,
            "A").filter((a) => a.t === "summon") as Extract<Act, { t: "summon" }>[]).map((a) => a.lane))
        assert.deepEqual([...lanes].sort(),
            [1,
                2,
                3])
    })
test("Tay đầu: B có 5 lá gốc + 3 thẻ chiêu chung Q/E/R; bộ gốc 22 lá (10 Đánh thường, 6 Vàng, 6 Đồ)",
    () => {
        const s = cg.newGame(SEED,
            TEAM,
            TEAM)
        const hand = s.players.B.hand // B chưa rút lượt nào
        assert.equal(hand.length,
            8)
        assert.deepEqual(hand.filter((c) => c.kind === "wild").map((c) => c.id).sort(),
            ["wild_e",
                "wild_q",
                "wild_r"])
        assert.equal(hand.filter((c) => c.kind === "support").length,
            5)
        const all = [...hand,
            ...s.players.B.deck].filter((c) => c.kind === "support")
        assert.equal(all.length,
            22)
        const cnt = (id: string) => all.filter((c) => c.id === id).length
        assert.deepEqual([cnt("basic"),
            cnt("gold"),
            cnt("item")],
        [10,
            6,
            6])
        assert.equal(s.players.B.deck.length,
            17)
    })
test("Mỗi bên 7 mạng, A đi trước, vòng 1, phase main",
    () => {
        const s = cg.newGame(SEED,
            TEAM,
            TEAM)
        assert.equal(s.players.A.lives,
            7); assert.equal(s.players.B.lives,
            7)
        assert.equal(s.active,
            "A"); assert.equal(s.round,
            1); assert.equal(s.phase,
            "main")
    })
test("Rút bài trước: lượt đầu A rút 2 ngay khi bắt đầu lượt",
    () => {
        const s = cg.newGame(SEED,
            TEAM,
            TEAM)
        assert.equal(s.players.A.deck.length,
            22 - 5 - 2,
            "A phải rút 2 từ bộ")
        // tay đầu 8 lá + 2 lá rút = 10, vừa chạm giới hạn tay nên không lá nào tràn vào mộ
        assert.equal(s.players.A.hand.length,
            8 + 2)
        assert.equal(s.players.A.grave.length,
            Math.max(0,
                8 + 2 - cg.RULES.handMax))
    })
test("Tay tối đa RULES.handMax (10): rút thừa thì lá thừa vào mộ bài",
    () => {
        const s = mk({
            A: {
                nami: 2
            }, B: {
                braum: 2
            }
        })
        setHand(s,
            "A",
            Array.from({
                length: cg.RULES.handMax
            },
            () => sup(s,
                "gold")))
        const grave0 = s.players.A.grave.length
        const g = gm(s); g.draw("A",
            3)
        assert.equal(s.players.A.hand.length,
            cg.RULES.handMax)
        assert.equal(s.players.A.grave.length,
            grave0 + 3)
    })

// ======================================================================
G("Rút bài đầu lượt")
// ======================================================================
test("Rút 2 lá mỗi lượt khi không có trợ thủ",
    () => {
        let s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }
        })
        s = end(s,
            "A").s
        const before = s.players.B.deck.length
        const r = end(s,
            "B")
        assert.equal(before - 0,
            s.players.B.deck.length,
            "chưa đổi")
        assert.equal(r.s.players.A.deck.length,
            s.players.A.deck.length - 2)
    })
test("Trợ thủ (Nami) còn sống thì rút thêm 1 lá (3 lá)",
    () => {
        let s = mk({
            A: {
                nami: 2
            }, B: {
                braum: 2
            }
        })
        s = end(s,
            "A").s
        const r = end(s,
            "B")
        assert.equal(r.s.players.A.deck.length,
            s.players.A.deck.length - 3)
        assert.equal(evs(r.ev,
            "draw").filter((e) => e.side === "A").length + evs(r.ev,
            "discard").filter((e) => e.side === "A" && e.reason === "overflow").length,
        3)
    })
test("Hai trợ thủ sống thì rút 4 lá; trợ thủ chết thì quay về 2",
    () => {
        needHero("soraka")
        let s = mk({
            A: {
                nami: 2, soraka: 1
            }, B: {
                braum: 2
            }, round: 8
        })
        s = end(s,
            "A").s
        assert.equal(end(s,
            "B").s.players.A.deck.length,
        s.players.A.deck.length - 4)
        // chết hết trợ thủ
        const s2 = mk({
            A: {
                nami: 2
            }, B: {
                braum: 2
            }
        })
        gm(s2).kill(u(s2,
            "A",
            "nami"),
        u(s2,
            "B",
            "braum"))
        const t = end(s2,
            "A").s
        assert.equal(end(t,
            "B").s.players.A.deck.length,
        t.players.A.deck.length - 2)
    })

// ======================================================================
G("Lá chiêu, thẻ hỗ trợ, bộ bài tướng")
// ======================================================================
test("Gọi tướng xáo 34 lá vào bộ: 6Q 6E 2R + 6 Đánh thường, 4 Vàng, 4 Đồ, 2 Bình Máu, 2 Rút Bài, 2 Bổ Trợ",
    () => {
        const s = cg.newGame(SEED,
            TEAM,
            TEAM)
        const before = s.players.A.deck.length
        const r = act(s,
            {
                t: "summon", side: "A", hero: "braum", lane: 2
            })
        assert.equal(r.s.players.A.deck.length,
            before + 34)
        const mine = r.s.players.A.deck.filter((c) => (c.kind === "skill" && c.hero === "braum") || (c.kind === "support" && !s.players.A.deck.some((x) => x.uid === c.uid)))
        assert.equal(mine.length,
            34)
        const cnt = (f: (c: cg.Card) => boolean) => mine.filter(f).length
        assert.deepEqual(["q",
            "e",
            "r"].map((k) => cnt((c) => c.id === `braum_${k}`)),
        [6,
            6,
            2])
        assert.deepEqual(["basic",
            "gold",
            "item",
            "potion",
            "draw",
            "buff"].map((id) => cnt((c) => c.kind === "support" && c.id === id)),
        [6,
            4,
            4,
            2,
            2,
            2])
    })
test("Gọi tướng: bộ bài xáo (không còn xếp theo nhóm) và lá thuộc đúng phe/tướng",
    () => {
        const s = cg.newGame(SEED,
            TEAM,
            TEAM)
        const r = act(s,
            {
                t: "summon", side: "A", hero: "zed", lane: 2
            })
        const sk = r.s.players.A.deck.filter((c) => c.kind === "skill")
        assert.ok(sk.every((c) => c.hero === "zed" && c.side === "A"))
        // 14 lá chiêu không nằm liền một khối ở cuối bộ
        const idx = r.s.players.A.deck.map((c, i) => (c.kind === "skill" ? i : -1)).filter((i) => i >= 0)
        assert.ok(Math.max(...idx) - Math.min(...idx) > 14,
            "bộ bài chưa được xáo")
    })
test("Lá chiêu dùng xong vào mộ (Darius Q), không quay lại bộ hay tay",
    () => {
        needHero("darius")
        const s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }
        })
        const q = skill(s,
            "darius",
            "A",
            "Q")
        setHand(s,
            "A",
            [q])
        const r = play(s,
            "A",
            q)
        assert.ok(inGrave(r.s,
            "A",
            q),
        "không vào mộ")
        assert.ok(!inHand(r.s,
            "A",
            q))
        assert.ok(!r.s.players.A.deck.some((c) => c.uid === q.uid))
        assert.ok(dmgTo(r.ev,
            "B:braum") > 0)
    })
test("Thẻ hỗ trợ dùng xong là mất (Rút Bài, Bình Máu, Bổ Trợ: không vào mộ)",
    () => {
        const s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }
        })
        const d = sup(s,
                "draw"), p = sup(s,
                "potion"), b = sup(s,
                "buff")
        setHand(s,
            "A",
            [d,
                p,
                b])
        u(s,
            "A",
            "darius").hp = 100
        let r = play(s,
            "A",
            d); r = play(r.s,
            "A",
            p,
            {
                target: "A:darius"
            }); r = play(r.s,
            "A",
            b,
            {
                target: "A:darius"
            })
        for (const c of [d,
            p,
            b]) { assert.ok(!inGrave(r.s,
            "A",
            c)); assert.ok(!inHand(r.s,
            "A",
            c)) }
        assert.equal(r.s.players.A.grave.length,
            s.players.A.grave.length)
    })
test("Rút Bài: rút 2 lá",
    () => {
        const s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }
        })
        const d = sup(s,
            "draw")
        setHand(s,
            "A",
            [d])
        const r = play(s,
            "A",
            d)
        assert.equal(r.s.players.A.hand.length,
            2)
        assert.equal(r.s.players.A.deck.length,
            s.players.A.deck.length - 2)
    })
test("Bình Máu hồi 150 + 10% máu tối đa (tối đa tới máu đầy)",
    () => {
        const s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }
        })
        const p = sup(s,
            "potion")
        setHand(s,
            "A",
            [p])
        const d = u(s,
            "A",
            "darius"); d.hp = 100
        const r = play(s,
            "A",
            p,
            {
                target: d.id
            })
        assert.equal(hp(r.s,
            "A",
            "darius"),
        100 + Math.round(150 + 0.1 * d.maxHp))
        // không vượt máu tối đa
        const s2 = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }
        })
        setHand(s2,
            "A",
            [sup(s2,
                "potion")]); u(s2,
            "A",
            "darius").hp = u(s2,
            "A",
            "darius").maxHp - 10
        const r2 = play(s2,
            "A",
            s2.players.A.hand[0],
            {
                target: "A:darius"
            })
        assert.equal(hp(r2.s,
            "A",
            "darius"),
        u(s2,
            "A",
            "darius").maxHp)
    })
test("Bổ Trợ: +20% sát thương và Khiên 100 tới hết lượt đối thủ",
    () => {
        const s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }
        })
        const b = sup(s,
            "buff")
        setHand(s,
            "A",
            [b])
        let r = play(s,
            "A",
            b,
            {
                target: "A:darius"
            })
        assert.equal(u(r.s,
            "A",
            "darius").shield,
        100)
        assert.ok(gm(r.s).has(u(r.s,
            "A",
            "darius"),
        "empower"))
        // hết cuối lượt đối thủ, chưa hết cuối lượt mình
        r = end(r.s,
            "A")
        assert.ok(gm(r.s).has(u(r.s,
            "A",
            "darius"),
        "empower"),
        "hết sớm: phải còn trong lượt đối thủ")
        r = end(r.s,
            "B")
        assert.ok(!gm(r.s).has(u(r.s,
            "A",
            "darius"),
        "empower"),
        "phải hết khi lượt đối thủ kết thúc")
    })
test("Bổ Trợ tăng đúng 20% sát thương",
    () => {
        needHero("darius")
        const mkS = () => { const s = mk({
            A: {
                darius: 2
            }, B: {
                t_guard: 2
            }
        }); setHand(s,
            "A",
            [skill(s,
                "darius",
                "A",
                "Q")]); return s }
        const s1 = mkS(), s2 = mkS()
        const q1 = s1.players.A.hand[0], q2 = s2.players.A.hand[0]
        const base = dmgTo(play(s1,
            "A",
            q1).ev,
        "B:t_guard",
        "skill")
        const b = sup(s2,
            "buff"); s2.players.A.hand.push(b)
        const boosted = dmgTo(play(play(s2,
            "A",
            b,
            {
                target: "A:darius"
            }).s,
        "A",
        q2).ev,
        "B:t_guard",
        "skill")
        assert.ok(Math.abs(boosted - base * 1.2) <= 1.5,
            `${base} -> ${boosted}`)
    })

// ======================================================================
G("Đồ & ghép đồ")
// ======================================================================
const COMP = [...cg.COMPONENTS]
test("Đúng 8 mảnh; ghép 8x8 ra 36 món hợp lệ, đối xứng, mỗi cặp ra món có thật",
    () => {
        assert.equal(COMP.length,
            8)
        const results = new Set<string>()
        let pairs = 0
        for (let i = 0; i < 8; i++) for (let j = i; j < 8; j++) {
            pairs++
            const r = combine(COMP[i],
                COMP[j])
            assert.ok(r,
                `${COMP[i]}+${COMP[j]} không ra món`)
            assert.equal(combine(COMP[j],
                COMP[i]),
            r,
            "không đối xứng")
            assert.ok(getItem(r!),
                `món ${r} không có`)
            results.add(r!)
        }
        assert.equal(pairs,
            36)
        assert.equal(results.size,
            36,
            `chỉ có ${results.size} món khác nhau`)
    })
test("Không bao giờ có Pha Lê Lam / Cuốc Chim: mọi lá Đồ sinh ra là 1 trong 8 mảnh",
    () => {
        const s = cg.newGame(SEED,
            TEAM,
            TEAM)
        const g = gm(s)
        const seen = new Set<string>()
        for (let i = 0; i < 400; i++) { const c = g.supportCard("item"); assert.ok(COMP.includes(c.item as never),
            `mảnh lạ ${c.item}`); seen.add(c.item!) }
        assert.equal(seen.size,
            8,
            "400 lá chưa ra đủ 8 mảnh")
        for (const bad of ["pha_le_lam",
            "cuoc_chim"]) assert.ok(!COMP.includes(bad as never))
    })
test("Ghép 2 Đồ + 1 Vàng: tạo món, đeo vào tướng, trừ đúng 3 lá, cộng chỉ số",
    () => {
        const s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }
        })
        const a = sup(s,
                "item",
                "kiem_dai"), b = sup(s,
                "item",
                "kiem_dai"), gd = sup(s,
                "gold"), extra = sup(s,
                "basic")
        setHand(s,
            "A",
            [a,
                b,
                gd,
                extra])
        const atk0 = gm(s).atk(u(s,
            "A",
            "darius"))
        const acts = cg.legalActions(s,
            "A").filter((x) => x.t === "craft")
        assert.ok(acts.length >= 1,
            "không có craft hợp lệ")
        const r = act(s,
            {
                t: "craft", side: "A", items: [a.uid,
                    b.uid], gold: gd.uid, unit: "A:darius"
            })
        const want = combine("kiem_dai",
            "kiem_dai")!
        assert.deepEqual(u(r.s,
            "A",
            "darius").items,
        [want])
        assert.deepEqual(r.s.players.A.hand.map((c) => c.uid),
            [extra.uid])
        assert.ok(gm(r.s).atk(u(r.s,
            "A",
            "darius")) > atk0,
        "AD không tăng")
        assert.equal(evs(r.ev,
            "craft").length,
        1)
        assert.equal(r.s.players.A.grave.length,
            s.players.A.grave.length,
            "lá ghép không vào mộ")
    })
test("Cần đủ 2 Đồ + 1 Vàng: thiếu Vàng hoặc chỉ 1 Đồ thì không có craft",
    () => {
        const s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }
        })
        setHand(s,
            "A",
            [sup(s,
                "item",
                "kiem_dai"),
            sup(s,
                "item",
                "cung_go")])
        assert.equal(cg.legalActions(s,
            "A").filter((x) => x.t === "craft").length,
        0,
        "thiếu Vàng")
        setHand(s,
            "A",
            [sup(s,
                "item",
                "kiem_dai"),
            sup(s,
                "gold")])
        assert.equal(cg.legalActions(s,
            "A").filter((x) => x.t === "craft").length,
        0,
        "chỉ 1 Đồ")
        assert.throws(() => act(s,
            {
                t: "craft", side: "A", items: [s.players.A.hand[0].uid,
                    s.players.A.hand[0].uid], gold: s.players.A.hand[1].uid, unit: "A:darius"
            }))
    })
test("Tối đa 3 đồ mỗi tướng: món thứ 4 không ghép được",
    () => {
        const s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }
        })
        const items = [combine("kiem_dai",
            "cung_go")!,
combine("giap_luoi",
    "ao_choang")!,
combine("gay_qua_kho",
    "nuoc_mat")!]
        u(s,
            "A",
            "darius").items = items
        setHand(s,
            "A",
            [sup(s,
                "item",
                "kiem_dai"),
            sup(s,
                "item",
                "cung_go"),
            sup(s,
                "gold")])
        assert.equal(cg.legalActions(s,
            "A").filter((x) => x.t === "craft" && x.unit === "A:darius").length,
        0)
        assert.throws(() => act(s,
            {
                t: "craft", side: "A", items: [s.players.A.hand[0].uid,
                    s.players.A.hand[1].uid], gold: s.players.A.hand[2].uid, unit: "A:darius"
            }))
    })
test("Món có máu cộng thêm tăng cả máu tối đa và máu hiện tại",
    () => {
        const s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }
        })
        const hpItem = COMP.map((x) => COMP.map((y) => [x,
            y])).flat().find(([x,
            y]) => (getItem(combine(x,
            y)!) && gm(s).stats({
            ...u(s,
                "A",
                "darius"), items: [combine(x,
                    y)!]
        }).hp > 0))
        if (!hpItem) skip("không có món cộng máu")
        const [x,
            y] = hpItem!
        const a = sup(s,
                "item",
                x), b = sup(s,
                "item",
                y), gd = sup(s,
                "gold")
        setHand(s,
            "A",
            [a,
                b,
                gd])
        const d = u(s,
                "A",
                "darius"), max0 = d.maxHp
        const r = act(s,
            {
                t: "craft", side: "A", items: [a.uid,
                    b.uid], gold: gd.uid, unit: d.id
            })
        assert.ok(u(r.s,
            "A",
            "darius").maxHp > max0)
        assert.equal(u(r.s,
            "A",
            "darius").hp,
        u(r.s,
            "A",
            "darius").maxHp)
    })

// ======================================================================
G("Thắng / thua")
// ======================================================================
test("Mất 7 mạng thì thua: hạ gục 7 lần, mạng giảm dần 7→0, kết thúc lý do lives",
    () => {
        const s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }
        })
        const g0 = gm(s)
        for (let i = 1; i <= 7; i++) {
            assert.equal(s.players.B.lives,
                7 - (i - 1))
            assert.equal(s.phase,
                "main")
            const t = u(s,
                "B",
                "braum"); t.status = "board"; t.hp = 1; s.lanes.B[2] = t.id; t.lane = 2
            const q = sup(s,
                "basic"); void q
            gm(s).damage(u(s,
                "A",
                "darius"),
            t,
            9999,
            "true",
            {
                tag: "skill"
            })
        }
        void g0
        assert.equal(s.players.B.lives,
            0)
        assert.equal(s.phase,
            "over"); assert.equal(s.winner,
            "A"); assert.equal(s.endReason,
            "lives")
        assert.deepEqual(cg.legalActions(s,
            "A"),
        []); assert.deepEqual(cg.legalActions(s,
            "B"),
        [])
        assert.throws(() => end(s,
            "A"))
    })
test("Bị hạ 6 lần vẫn chưa thua (còn 1 mạng)",
    () => {
        const s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }
        })
        s.players.B.lives = 2
        const t = u(s,
            "B",
            "braum")
        gm(s).damage(u(s,
            "A",
            "darius"),
        t,
        9999,
        "true",
        {
            tag: "skill"
        })
        assert.equal(s.players.B.lives,
            1); assert.equal(s.phase,
            "main")
    })
test("Cạn bài khi phải rút (đầu lượt) thì thua ngay, lý do deck",
    () => {
        let s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }
        })
        s = end(s,
            "A").s
        s.players.B.deck = []
        const r = end(s,
            "B") // sang lượt A, A rút
        assert.equal(r.s.phase,
            "main",
            "A còn bài")
        const s2 = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }
        })
        s2.players.A.deck = []
        const r2 = end(end(s2,
            "A").s,
        "B")
        assert.equal(r2.s.phase,
            "over"); assert.equal(r2.s.winner,
            "B"); assert.equal(r2.s.endReason,
            "deck")
        assert.equal(evs(r2.ev,
            "end")[0].reason,
        "deck")
    })
test("Bộ còn đúng 1 lá mà phải rút 2 thì thua",
    () => {
        const s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }
        })
        s.players.A.deck = s.players.A.deck.slice(0,
            1)
        const r2 = end(end(s,
            "A").s,
        "B")
        assert.equal(r2.s.winner,
            "B"); assert.equal(r2.s.endReason,
            "deck")
    })
test("Hiệu ứng rút khi bộ hết chỉ dừng, không thua (chỉ thua khi rút đầu lượt)",
    () => {
        const s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }
        })
        s.players.A.deck = []; setHand(s,
            "A",
            [sup(s,
                "draw")])
        const r = play(s,
            "A",
            s.players.A.hand[0])
        assert.equal(r.s.phase,
            "main"); assert.equal(r.s.winner,
            null)
    })
test("Hết ván thì mọi hành động đều bị từ chối",
    () => {
        const s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }
        })
        gm(s).endGame("A",
            "lives")
        assert.throws(() => act(s,
            {
                t: "end", side: "A"
            }))
        assert.equal(cg.whoseMove(s) !== undefined,
            true)
    })

// ======================================================================
G("Hồi sinh & lá chết")
// ======================================================================
test("Tướng bị hạ hồi sinh sau 3 vòng, đúng đường cũ, đầy máu, còn nguyên đồ",
    () => {
        let s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }, round: 8
        })
        const b = u(s,
            "B",
            "braum")
        b.items = [combine("kiem_dai",
            "cung_go")!]
        s.round = 5 // sau vòng 4 đã mở hết đường
        s = toTurn(s,
            "A")
        gm(s).kill(b,
            u(s,
                "A",
                "darius"))
        assert.equal(b.status,
            "dead"); assert.equal(b.respawnRound,
            5 + 3)
        assert.equal(s.lanes.B[2],
            null)
        const st: string[] = []
        while (s.round < 12 && s.phase === "main") {
            s = end(s,
                s.active).s
            if (s.active === "B") { st.push(`${s.round}:${u(s,
                "B",
                "braum").status}`); if (u(s,
                "B",
                "braum").status === "board") break }
        }
        // chết ở vòng 5: đầu lượt B vòng 5,6,7 vẫn chết; vòng 8 (= 5 + 3) sống lại
        assert.deepEqual(st.slice(0,
            4),
        ["5:dead",
            "6:dead",
            "7:dead",
            "8:board"])
        const nb = u(s,
            "B",
            "braum")
        assert.equal(nb.lane,
            2); assert.equal(s.lanes.B[2],
            nb.id)
        assert.equal(nb.hp,
            nb.maxHp)
        assert.equal(nb.items.length,
            1,
            "mất đồ")
    })
test("Hồi sinh có phát sự kiện respawn, đường cũ bị chiếm thì ra đường trống khác",
    () => {
        let s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }, round: 5
        })
        s = toTurn(s,
            "A")
        gm(s).kill(u(s,
            "B",
            "braum"),
        u(s,
            "A",
            "darius"))
        gm(s).summon("B",
            "zed",
            2) // chiếm đường 3
        s.round = 8
        s = toTurn(s,
            "A")
        const r = end(s,
            "A")
        assert.equal(evs(r.ev,
            "respawn").length,
        1)
        assert.notEqual(u(r.s,
            "B",
            "braum").lane,
        2)
        assert.equal(u(r.s,
            "B",
            "braum").status,
        "board")
    })
test("Lá chiêu của tướng đang chết là lá chết: không đánh được nhưng vẫn ở trên tay",
    () => {
        needHero("darius")
        const s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }
        })
        const q = skill(s,
            "darius",
            "A",
            "Q")
        setHand(s,
            "A",
            [q])
        assert.ok(legalPlays(s,
            "A").length > 0)
        gm(s).kill(u(s,
            "A",
            "darius"),
        u(s,
            "B",
            "braum"))
        assert.ok(gm(s).isDeadCard(q))
        assert.equal(legalPlays(s,
            "A").length,
        0,
        "lá chết vẫn đánh được")
        assert.ok(inHand(s,
            "A",
            q))
        assert.throws(() => play(s,
            "A",
            q))
    })
test("Lá chiêu của tướng chưa gọi ra cũng là lá chết",
    () => {
        const s = cg.newGame(SEED,
            TEAM,
            TEAM)
        const c = gm(s).skillCard("zed",
            "A",
            "Q")
        assert.ok(gm(s).isDeadCard(c))
    })
test("Hạ gục: tướng rời đường, mạng giảm 1, trạng thái/khiên bị xoá, deaths tăng",
    () => {
        const s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }
        })
        const b = u(s,
            "B",
            "braum"); b.shield = 50; b.statuses.stun = {
            until: 99, v: 1
        }
        gm(s).kill(b,
            u(s,
                "A",
                "darius"))
        assert.deepEqual([b.lane,
            b.shield,
            Object.keys(b.statuses).length,
            b.deaths,
            s.players.B.lives,
            s.stats.A.kills],
        [-1,
            0,
            0,
            1,
            6,
            1])
    })

// ======================================================================
G("Luật đánh thường theo vai")
// ======================================================================
test("Đấu sĩ tự đánh tướng đối diện cuối lượt (không tốn lá), 100% AD, không dùng được lá Đánh thường",
    () => {
        const s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }
        })
        setHand(s,
            "A",
            [sup(s,
                "basic")])
        assert.equal(legalPlays(s,
            "A",
            "basic").length,
        0,
        "đấu sĩ không được dùng lá Đánh thường")
        const want = expectDmg(s,
            "A:darius",
            "B:braum",
            1)
        const r = end(s,
            "A")
        assert.equal(dmgTo(r.ev,
            "B:braum",
            "attack"),
        want)
        assert.equal(evs(r.ev,
            "damage").find((d) => d.tag === "attack")!.hpLost,
        want,
        "máu mất = sát thương")
        assert.equal(r.s.players.A.hand.length,
            1,
            "đánh tự động không tốn lá")
    })
test("Đấu sĩ không đánh khi không có ai đối diện hoặc bị Choáng",
    () => {
        const s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 1
            }
        })
        assert.equal(dmgTo(end(s,
            "A").ev,
        "B:braum"),
        0,
        "đánh khác đường")
        const s2 = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }
        })
        gm(s2).status(u(s2,
            "A",
            "darius"),
        "stun",
        1)
        assert.equal(evs(end(s2,
            "A").ev,
        "attack").length,
        0,
        "Choáng vẫn tự đánh")
    })
test("Đỡ đòn: lá Đánh thường đánh tướng đối diện, 100% AD; không đánh được tướng khác đường",
    () => {
        const s = mk({
            A: {
                braum: 2
            }, B: {
                zed: 2, teemo: 1
            }
        })
        const c = sup(s,
            "basic"); setHand(s,
            "A",
            [c])
        const opts = legalPlays(s,
            "A",
            "basic")
        assert.deepEqual(opts.map((o) => o.args?.target),
            ["B:zed"])
        const r = play(s,
            "A",
            c,
            opts[0].args)
        assert.equal(dmgTo(r.ev,
            "B:zed",
            "attack"),
        expectDmg(s,
            "A:braum",
            "B:zed",
            1))
        assert.ok(!inGrave(r.s,
            "A",
            c) && !inHand(r.s,
            "A",
            c),
        "lá Đánh thường phải mất")
    })
test("Sát thủ: Đánh thường lên tướng cùng đường, 350% AD",
    () => {
        const s = mk({
            A: {
                zed: 2
            }, B: {
                braum: 2, darius: 1
            }
        })
        const c = sup(s,
            "basic"); setHand(s,
            "A",
            [c])
        const opts = legalPlays(s,
            "A",
            "basic")
        assert.deepEqual(opts.map((o) => o.args?.target),
            ["B:braum"],
            "chỉ tướng cùng đường")
        const r = play(s,
            "A",
            c,
            opts[0].args)
        const got = dmgTo(r.ev,
            "B:braum",
            "attack")
        assert.equal(got,
            expectDmg(s,
                "A:zed",
                "B:braum",
                3.5))
        assert.ok(got > 3 * expectDmg(s,
            "A:zed",
            "B:braum",
            1))
    })
test("Sát thủ không có ai cùng đường thì không đánh thường được",
    () => {
        const s = mk({
            A: {
                zed: 2
            }, B: {
                darius: 1
            }
        })
        setHand(s,
            "A",
            [sup(s,
                "basic")])
        assert.equal(legalPlays(s,
            "A",
            "basic").length,
        0)
    })
test("Xạ thủ: Đánh thường lên tướng nào cũng được (khác đường), 200% AD",
    () => {
        const s = mk({
            A: {
                teemo: 2
            }, B: {
                darius: 0, zed: 4, viktor: 2
            }
        })
        const c = sup(s,
            "basic"); setHand(s,
            "A",
            [c])
        const targets = legalPlays(s,
            "A",
            "basic").map((o) => o.args?.target).sort()
        assert.deepEqual(targets,
            ["B:darius",
                "B:viktor",
                "B:zed"])
        const r = play(s,
            "A",
            c,
            {
                actor: "A:teemo", target: "B:zed"
            })
        assert.equal(dmgTo(r.ev,
            "B:zed",
            "attack"),
        expectDmg(s,
            "A:teemo",
            "B:zed",
            2))
    })
test("Đỡ đòn khiêu khích: lá Đánh thường của xạ thủ địch phải đánh vào đỡ đòn (nếu có trên sân)",
    () => {
        const s = mk({
            A: {
                teemo: 2
            }, B: {
                darius: 0, zed: 4, braum: 3
            }
        })
        setHand(s,
            "A",
            [sup(s,
                "basic")])
        const targets = legalPlays(s,
            "A",
            "basic").map((o) => o.args?.target)
        assert.deepEqual(targets,
            ["B:braum"],
            "xạ thủ đánh được tướng ngoài đỡ đòn")
        assert.throws(() => play(s,
            "A",
            s.players.A.hand[0],
            {
                actor: "A:teemo", target: "B:zed"
            }))
    })
test("Khiêu khích chỉ áp lên xạ thủ; sát thủ vẫn đánh được tướng cùng đường không phải đỡ đòn",
    () => {
        const s = mk({
            A: {
                zed: 2
            }, B: {
                darius: 2, braum: 3
            }
        })
        setHand(s,
            "A",
            [sup(s,
                "basic")])
        assert.deepEqual(legalPlays(s,
            "A",
            "basic").map((o) => o.args?.target),
        ["B:darius"])
    })
test("Pháp sư: Đánh thường tướng đối diện 100% AD",
    () => {
        const s = mk({
            A: {
                viktor: 2
            }, B: {
                braum: 2
            }
        })
        const c = sup(s,
            "basic"); setHand(s,
            "A",
            [c])
        const opts = legalPlays(s,
            "A",
            "basic")
        assert.equal(opts.length,
            1)
        const r = play(s,
            "A",
            c,
            opts[0].args)
        assert.equal(dmgTo(r.ev,
            "B:braum",
            "attack"),
        expectDmg(s,
            "A:viktor",
            "B:braum",
            1))
    })
test("Trợ thủ: Đánh thường tướng đối diện 100% AD",
    () => {
        const s = mk({
            A: {
                nami: 2
            }, B: {
                braum: 2
            }
        })
        const c = sup(s,
            "basic"); setHand(s,
            "A",
            [c])
        const opts = legalPlays(s,
            "A",
            "basic")
        assert.equal(opts.length,
            1)
        assert.equal(dmgTo(play(s,
            "A",
            c,
            opts[0].args).ev,
        "B:braum",
        "attack"),
        expectDmg(s,
            "A:nami",
            "B:braum",
            1))
    })
test("Choáng chặn Đánh thường; Choáng chặn lá chiêu; Câm Lặng chặn lá chiêu nhưng không chặn Đánh thường",
    () => {
        needHero("nami")
        const s = mk({
            A: {
                nami: 2
            }, B: {
                braum: 2
            }
        })
        const q = skill(s,
            "nami",
            "A",
            "Q")
        setHand(s,
            "A",
            [sup(s,
                "basic"),
            q])
        gm(s).status(u(s,
            "A",
            "nami"),
        "silence",
        2)
        assert.equal(legalPlays(s,
            "A",
            "basic").length,
        1,
        "Câm Lặng không chặn Đánh thường")
        assert.equal(legalPlays(s,
            "A",
            "nami_q").length,
        0,
        "Câm Lặng phải chặn lá chiêu")
        gm(s).status(u(s,
            "A",
            "nami"),
        "stun",
        2)
        assert.equal(legalPlays(s,
            "A").length,
        0,
        "Choáng chặn mọi lá")
    })

// ======================================================================
G("Chuỗi (Quick play)")
// ======================================================================
test("Đánh lá khi đối thủ có lá Quick nối được: mở chuỗi, bên đánh chờ, bên kia chọn chain/pass",
    () => {
        const s = mk({
            A: {
                zed: 2
            }, B: {
                t_guard: 2
            }
        })
        const strike = sup(s,
            "basic"); setHand(s,
            "A",
            [strike])
        const rc = skill(s,
            "t_guard",
            "B",
            "Q"); setHand(s,
            "B",
            [rc])
        const r = play(s,
            "A",
            strike,
            {
                actor: "A:zed", target: "B:t_guard"
            })
        assert.equal(r.s.phase,
            "chain")
        assert.equal(r.s.chain?.priority,
            "B")
        assert.equal(r.s.chain?.links.length,
            1)
        assert.equal(evs(r.ev,
            "chainAdd").length,
        1,
        "mắt xích 1 phải được công bố khi mở chuỗi")
        assert.equal(evs(r.ev,
            "chainWindow").length,
        1)
        assert.equal(cg.whoseMove(r.s),
            "B")
        assert.deepEqual(cg.legalActions(r.s,
            "A"),
        [],
        "bên đánh không được làm gì khi chờ")
        const la = cg.legalActions(r.s,
            "B")
        assert.ok(la.some((a) => a.t === "chain") && la.some((a) => a.t === "pass"))
        assert.equal(hp(r.s,
            "B",
            "t_guard"),
        hp(s,
            "B",
            "t_guard"),
        "chưa gây sát thương khi chuỗi còn mở")
        assert.throws(() => end(r.s,
            "A"))
    })
test("Nối chuỗi: mắt xích cuối giải quyết TRƯỚC (Khiên 77 hút đòn), rồi lá gốc; lá Quick vào mộ",
    () => {
        const s = mk({
            A: {
                zed: 2
            }, B: {
                t_guard: 2
            }
        })
        const strike = sup(s,
            "basic"); setHand(s,
            "A",
            [strike])
        const rc = skill(s,
            "t_guard",
            "B",
            "Q"); setHand(s,
            "B",
            [rc])
        const w = play(s,
            "A",
            strike,
            {
                actor: "A:zed", target: "B:t_guard"
            })
        const r = act(w.s,
            {
                t: "chain", side: "B", uid: rc.uid, args: {
                }
            })
        assert.equal(r.s.phase,
            "main"); assert.equal(r.s.chain,
            null)
        assert.deepEqual(evs(r.ev,
            "chainResolve").map((e) => e.n),
        [2,
            1],
        "giải quyết từ cuối về đầu")
        assert.equal(evs(r.ev,
            "chainEnd").length,
        1)
        const sh = evs(r.ev,
                "shield")[0], dm = evs(r.ev,
                "damage")[0]
        assert.ok(sh && dm,
            "thiếu sự kiện")
        assert.ok(r.ev.indexOf(sh) < r.ev.indexOf(dm),
            "khiên phải trước sát thương")
        assert.ok(dm.absorbed > 0)
        assert.ok(inGrave(r.s,
            "B",
            rc))
        assert.equal(r.s.active,
            "A",
            "về lại lượt A")
    })
test("Pass: bỏ qua thì lá gốc gây sát thương đầy đủ, không tốn lá",
    () => {
        const s = mk({
            A: {
                zed: 2
            }, B: {
                t_guard: 2
            }
        })
        const strike = sup(s,
            "basic"); setHand(s,
            "A",
            [strike])
        const rc = skill(s,
            "t_guard",
            "B",
            "Q"); setHand(s,
            "B",
            [rc])
        const w = play(s,
            "A",
            strike,
            {
                actor: "A:zed", target: "B:t_guard"
            })
        const r = act(w.s,
            {
                t: "pass", side: "B"
            })
        assert.equal(r.s.phase,
            "main")
        assert.equal(dmgTo(r.ev,
            "B:t_guard",
            "attack"),
        expectDmg(s,
            "A:zed",
            "B:t_guard",
            3.5))
        assert.ok(inHand(r.s,
            "B",
            rc),
        "pass không được tốn lá")
    })
test("Không ai có lá Quick thì không mở chuỗi, không phát sự kiện chuỗi",
    () => {
        const s = mk({
            A: {
                zed: 2
            }, B: {
                t_guard: 2
            }
        })
        const strike = sup(s,
            "basic"); setHand(s,
            "A",
            [strike]); setHand(s,
            "B",
            [sup(s,
                "gold")])
        const r = play(s,
            "A",
            strike,
            {
                actor: "A:zed", target: "B:t_guard"
            })
        assert.equal(r.s.phase,
            "main")
        for (const t of ["chainAdd",
            "chainWindow",
            "chainResolve",
            "chainEnd"] as const) assert.equal(evs(r.ev,
            t).length,
        0,
        t)
    })
test("Lá Quick của tướng đang bị Choáng không dùng được (không mở chuỗi)",
    () => {
        const s = mk({
            A: {
                zed: 2
            }, B: {
                t_guard: 2
            }
        })
        const strike = sup(s,
            "basic"); setHand(s,
            "A",
            [strike]); setHand(s,
            "B",
            [skill(s,
                "t_guard",
                "B",
                "Q")])
        gm(s).status(u(s,
            "B",
            "t_guard"),
        "stun",
        2)
        assert.equal(play(s,
            "A",
            strike,
            {
                actor: "A:zed", target: "B:t_guard"
            }).s.phase,
        "main")
    })
test("Lá Quick chỉ-nối-chuỗi không đánh được bình thường trong lượt mình, không dùng làm thẻ chiêu chung",
    () => {
        const s = mk({
            A: {
                zed: 2
            }, B: {
                t_guard: 2
            }
        })
        const rc = skill(s,
            "t_guard",
            "B",
            "Q"); setHand(s,
            "B",
            [rc,
                wild(s,
                    "q")])
        const t = toTurn(s,
            "B")
        assert.equal(legalPlays(t,
            "B",
            "t_guard_q").length,
        0,
        "lá chainOnly đánh được trong lượt mình")
        assert.ok(legalPlays(t,
            "B",
            "wild_q").every((a) => a.args?.actor !== "B:t_guard"),
        "wild_q dùng được chiêu chainOnly")
    })
test("Lá Quick thường (không chainOnly) vẫn đánh được chủ động trong lượt mình",
    () => {
        const s = mk({
            A: {
                t_spark: 2
            }, B: {
                zed: 2
            }
        })
        setHand(s,
            "A",
            [skill(s,
                "t_spark",
                "A",
                "Q")])
        assert.ok(legalPlays(s,
            "A",
            "t_spark_q").length > 0)
    })
test("Chuỗi 3 mắt xích: A nối lá Quick của mình lên lá Quick của B; giải quyết 3 → 2 → 1",
    () => {
        const s = mk({
            A: {
                t_spark: 2
            }, B: {
                t_guard: 2
            }
        })
        const strike = sup(s,
                "basic"), spark = skill(s,
                "t_spark",
                "A",
                "Q"); setHand(s,
            "A",
            [strike,
                spark])
        setHand(s,
            "B",
            [skill(s,
                "t_guard",
                "B",
                "Q")])
        let w = play(s,
            "A",
            strike,
            {
                actor: "A:t_spark", target: "B:t_guard"
            })
        w = act(w.s,
cg.legalActions(w.s,
    "B").find((a) => a.t === "chain")!)
        assert.equal(w.s.phase,
            "chain",
            "A còn lá Quick thì được quyền nối tiếp")
        assert.equal(w.s.chain?.priority,
            "A")
        const r = act(w.s,
cg.legalActions(w.s,
    "A").find((a) => a.t === "chain")!)
        assert.equal(r.s.phase,
            "main")
        assert.deepEqual(evs(r.ev,
            "chainResolve").map((e) => e.n),
        [3,
            2,
            1])
        const first = evs(r.ev,
            "damage")[0]
        assert.equal(first.kind,
            "true"); assert.equal(first.absorbed,
            0,
            "mắt xích 3 giải quyết trước khi có Khiên")
    })
test("Hai lần bỏ qua liên tiếp mới giải quyết: B nối xong, A bỏ qua, B vẫn được nối thêm",
    () => {
        const s = mk({
            A: {
                t_spark: 2
            }, B: {
                t_guard: 2, t_spark: 1
            }
        })
        const strike = sup(s,
            "basic"); setHand(s,
            "A",
            [strike,
                skill(s,
                    "t_spark",
                    "A",
                    "Q")])
        setHand(s,
            "B",
            [skill(s,
                "t_guard",
                "B",
                "Q"),
            skill(s,
                "t_spark",
                "B",
                "Q")])
        let w = play(s,
            "A",
            strike,
            {
                actor: "A:t_spark", target: "B:t_guard"
            })
        w = act(w.s,
cg.legalActions(w.s,
    "B").find((a) => a.t === "chain" && w.s.players.B.hand.find((c) => c.uid === a.uid)?.id === "t_guard_q")!)
        w = act(w.s,
            {
                t: "pass", side: "A"
            })
        assert.equal(w.s.phase,
            "chain"); assert.equal(w.s.chain?.priority,
            "B")
        w = act(w.s,
            {
                t: "pass", side: "B"
            })
        assert.equal(w.s.phase,
            "main")
    })
test("Chuỗi tối đa RULES.maxChain mắt xích",
    () => {
        const s = mk({
            A: {
                t_spark: 2
            }, B: {
                t_spark: 2
            }
        })
        s.units["A:t_spark"].hp = s.units["A:t_spark"].maxHp = 100000
        s.units["B:t_spark"].hp = s.units["B:t_spark"].maxHp = 100000
        setHand(s,
            "A",
            Array.from({
                length: 8
            },
            () => skill(s,
                "t_spark",
                "A",
                "Q")))
        setHand(s,
            "B",
            Array.from({
                length: 8
            },
            () => skill(s,
                "t_spark",
                "B",
                "Q")))
        let w = play(s,
            "A",
            s.players.A.hand[0],
            {
                target: "B:t_spark"
            })
        let n = 0
        while (w.s.phase === "chain" && n++ < 30) {
            const side = cg.whoseMove(w.s)
            const c = cg.legalActions(w.s,
                side).find((a) => a.t === "chain")
            w = act(w.s,
                c ?? {
                    t: "pass", side
                })
        }
        assert.equal(evs(w.ev,
            "chainEnd")[0]?.length,
        cg.RULES.maxChain)
    })
test("Đòn tự đánh cuối lượt (đấu sĩ) không mở chuỗi",
    () => {
        const s = mk({
            A: {
                darius: 2
            }, B: {
                t_guard: 2
            }
        })
        setHand(s,
            "B",
            [skill(s,
                "t_guard",
                "B",
                "Q")])
        const r = end(s,
            "A")
        assert.equal(evs(r.ev,
            "chainWindow").length,
        0)
        assert.equal(r.s.phase,
            "main")
    })
test("Đòn miễn phí do buff (Nami E) nhắm tướng có lá Quick thì mở chuỗi",
    () => {
        needHero("nami")
        const s = mk({
            A: {
                nami: 2
            }, B: {
                t_guard: 2
            }
        })
        u(s,
            "A",
            "nami").nextAttack.push({
            id: "nami_bless", source: "A:nami", free: true
        })
        setHand(s,
            "B",
            [skill(s,
                "t_guard",
                "B",
                "Q")])
        const r = act(s,
            {
                t: "attack", side: "A", actor: "A:nami", target: "B:t_guard"
            })
        assert.equal(r.s.phase,
            "chain")
    })
test("Chiêu 'opposite' (Darius Q) nhắm tướng có lá Quick cũng mở chuỗi",
    () => {
        needHero("darius")
        const s = mk({
            A: {
                darius: 2
            }, B: {
                t_guard: 2
            }
        })
        const q = skill(s,
            "darius",
            "A",
            "Q"); setHand(s,
            "A",
            [q]); setHand(s,
            "B",
            [skill(s,
                "t_guard",
                "B",
                "Q")])
        const r = play(s,
            "A",
            q)
        assert.equal(r.s.phase,
            "chain")
    })

// ======================================================================
G("Lá thưởng & ô triệu hồi phụ")
// ======================================================================
test("Đầu trận mỗi bên úp RULES.prizeCount lá thưởng (thẻ hỗ trợ / thẻ chiêu chung), không lấy từ bộ chính",
    () => {
        const s = cg.newGame(SEED,
            TEAM,
            TEAM)
        for (const side of ["A",
            "B"] as const) {
            assert.equal(s.prizes[side],
                cg.RULES.prizeCount)
            assert.equal(s.prizeCards[side].length,
                cg.RULES.prizeCount)
            assert.ok(s.prizeCards[side].every((c) => c.kind === "support" || c.kind === "wild"))
            const deck = new Set(s.players[side].deck.map((c) => c.uid))
            assert.ok(s.prizeCards[side].every((c) => !deck.has(c.uid)))
        }
    })
test("Hạ 1 tướng địch: bên hạ lật 1 lá thưởng lên tay; lần hạ cuối (hết mạng) thì thắng, không lật",
    () => {
        const s = mk({
            A: {
                zed: 2
            }, B: {
                t_guard: 2
            }
        })
        setHand(s,
            "A",
            [])
        const top = s.prizeCards.A[0]
        const g = gm(s)
        g.kill(u(s,
            "B",
            "t_guard"),
        u(s,
            "A",
            "zed"))
        assert.equal(s.prizes.A,
            cg.RULES.prizeCount - 1)
        assert.ok(inHand(s,
            "A",
            top))
        assert.equal(evs(g.events,
            "prize").length,
        1)
        const s2 = mk({
            A: {
                zed: 2
            }, B: {
                t_guard: 2
            }
        })
        s2.players.B.lives = 1
        gm(s2).kill(u(s2,
            "B",
            "t_guard"),
        u(s2,
            "A",
            "zed"))
        assert.equal(s2.winner,
            "A"); assert.equal(s2.prizes.A,
            cg.RULES.prizeCount)
    })
test("Ô triệu hồi phụ: token máu ảo đỡ sát thương cho chủ; token chết không mất mạng; chủ chết thì token biến mất",
    () => {
        const s = mk({
            A: {
                zed: 2
            }, B: {
                t_guard: 2
            }
        })
        const g = gm(s), owner = u(s,
            "B",
            "t_guard")
        const tok = g.summonToken("B",
            {
                id: "wall", name: "Tường", hp: 100, ownerId: owner.id
            })
        assert.equal(s.extra.B,
            tok.id)
        const hp0 = owner.hp
        g.damage(u(s,
            "A",
            "zed"),
        owner,
        60,
        "true",
        {
            tag: "skill"
        })
        assert.equal(owner.hp,
            hp0,
            "sát thương phải vào token trước")
        assert.equal(s.units[tok.id].hp,
            40)
        const lives0 = s.players.B.lives
        g.damage(u(s,
            "A",
            "zed"),
        owner,
        60,
        "true",
        {
            tag: "skill"
        })
        assert.equal(s.extra.B,
            null,
            "token hết máu thì rời ô phụ")
        assert.equal(s.players.B.lives,
            lives0,
            "token chết không tính mạng")
        const tok2 = g.summonToken("B",
            {
                id: "wall", name: "Tường", hp: 100, ownerId: owner.id
            })
        g.kill(owner,
            u(s,
                "A",
                "zed"))
        assert.equal(s.units[tok2.id],
            undefined,
            "chủ chết thì token biến mất")
    })

// ======================================================================
G("Thẻ chiêu chung (wild)")
// ======================================================================
test("Wild Q tung đúng Q của tướng được chọn (cùng sát thương với lá Darius Q thật), rồi vào mộ",
    () => {
        needHero("darius")
        const mkS = () => mk({
            A: {
                darius: 2
            }, B: {
                t_guard: 2
            }
        })
        const s1 = mkS(), s2 = mkS()
        const w = wild(s1,
            "q"); setHand(s1,
            "A",
            [w])
        const q = skill(s2,
            "darius",
            "A",
            "Q"); setHand(s2,
            "A",
            [q])
        const opts = legalPlays(s1,
            "A",
            "wild_q")
        assert.ok(opts.some((o) => o.args?.actor === "A:darius"))
        const r1 = play(s1,
                "A",
                w,
                {
                    actor: "A:darius"
                }), r2 = play(s2,
                "A",
                q)
        assert.equal(dmgTo(r1.ev,
            "B:t_guard"),
        dmgTo(r2.ev,
            "B:t_guard"))
        assert.ok(dmgTo(r1.ev,
            "B:t_guard") > 0)
        assert.ok(inGrave(r1.s,
            "A",
            w) && !inHand(r1.s,
            "A",
            w))
        assert.equal(evs(r1.ev,
            "cast")[0].unit,
        "A:darius")
    })
test("Wild chọn được từng tướng trên sân của mình, không chọn được tướng địch/chưa gọi",
    () => {
        needHero("darius",
            "nami")
        const s = mk({
            A: {
                darius: 2, nami: 1
            }, B: {
                t_guard: 2
            }
        })
        setHand(s,
            "A",
            [wild(s,
                "q")])
        const actors = new Set(legalPlays(s,
            "A",
            "wild_q").map((o) => o.args?.actor))
        assert.deepEqual([...actors].sort(),
            ["A:darius",
                "A:nami"])
        assert.throws(() => play(s,
            "A",
            s.players.A.hand[0],
            {
                actor: "B:t_guard"
            }))
    })
test("Wild dùng chiêu của tướng khác loại (Nami Q: rút 2 lá) và dùng được cho cả E, R",
    () => {
        needHero("nami")
        const s = mk({
            A: {
                nami: 2
            }, B: {
                t_guard: 2
            }
        })
        const w = wild(s,
                "q"), w2 = wild(s,
                "r"); setHand(s,
            "A",
            [w,
                w2])
        setTop(s,
            "A",
            [sup(s,
                "basic"),
            sup(s,
                "basic")]) // cùng loại: không phải bỏ bài
        const d0 = s.players.A.deck.length
        const r = play(s,
            "A",
            w,
legalPlays(s,
    "A",
    "wild_q").find((o) => o.args?.actor === "A:nami")!.args)
        assert.equal(r.s.players.A.deck.length,
            d0 - 2)
        const r2 = play(r.s,
            "A",
            w2,
legalPlays(r.s,
    "A",
    "wild_r").find((o) => o.args?.actor === "A:nami")!.args)
        assert.equal(r2.s.players.A.deck.length,
            d0 - 2 - 3)
    })
test("Không có tướng nào trên sân thì thẻ chiêu chung không đánh được",
    () => {
        const s = cg.newGame(SEED,
            TEAM,
            TEAM)
        const t = end(s,
            "A").s // B: chưa gọi ai
        assert.equal(legalPlays(t,
            "B",
            "wild_q").length,
        0)
    })

// ======================================================================
G("Tướng: Darius")
// ======================================================================
test("Darius: mỗi chiêu cho 1 dấu chảy máu, tối đa 5 dấu",
    () => {
        needHero("darius")
        let s = mk({
            A: {
                darius: 2
            }, B: {
                t_guard: 2
            }
        })
        for (let i = 0; i < 7; i++) { const q = skill(s,
            "darius",
            "A",
            "Q"); s.players.A.hand.push(q); s = play(s,
            "A",
            q).s }
        assert.equal(gm(s).statusV(u(s,
            "B",
            "t_guard"),
        "bleed"),
        5,
        "tối đa 5 dấu")
    })
test("Darius: dấu chảy máu làm mất máu đầu lượt mục tiêu: (6 + 6% AD) sát thương chuẩn mỗi dấu",
    () => {
        needHero("darius")
        const s = mk({
            A: {
                darius: 2
            }, B: {
                t_guard: 2
            }
        })
        gm(s).status(u(s,
            "B",
            "t_guard"),
        "bleed",
        2,
        {
            v: 3
        })
        const r = end(s,
            "A") // cuối lượt A Darius tự đánh (+1 dấu = 4 dấu), rồi sang lượt B: onTurnStart nổ dấu
        const dot = evs(r.ev,
            "damage").filter((d) => d.tag === "dot" && d.target === "B:t_guard")
        assert.equal(dot.length,
            1)
        assert.equal(dot[0].kind,
            "true")
        assert.equal(dot[0].amount,
            Math.round(4 * (6 + 0.06 * gm(s).atk(u(s,
                "A",
                "darius")))))
    })
test("Darius R hạ gục thì lá R quay về tay (không vào mộ), còn không hạ gục thì vào mộ",
    () => {
        needHero("darius")
        const s = mk({
            A: {
                darius: 2
            }, B: {
                t_guard: 2
            }
        })
        const r1 = skill(s,
            "darius",
            "A",
            "R"); setHand(s,
            "A",
            [r1])
        u(s,
            "B",
            "t_guard").hp = 10
        const w = play(s,
            "A",
            r1)
        assert.equal(u(w.s,
            "B",
            "t_guard").status,
        "dead")
        assert.ok(inHand(w.s,
            "A",
            r1) && !inGrave(w.s,
            "A",
            r1),
        "R phải về tay")
        assert.equal(evs(w.ev,
            "returnToHand").length,
        1)
        const s2 = mk({
            A: {
                darius: 2
            }, B: {
                t_guard: 2
            }
        })
        const r2 = skill(s2,
            "darius",
            "A",
            "R"); setHand(s2,
            "A",
            [r2])
        const w2 = play(s2,
            "A",
            r2)
        assert.ok(u(w2.s,
            "B",
            "t_guard").status === "board" && inGrave(w2.s,
            "A",
            r2) && !inHand(w2.s,
            "A",
            r2))
    })
test("Darius R: sát thương chuẩn, tăng theo số dấu",
    () => {
        needHero("darius")
        const s0 = mk({
            A: {
                darius: 2
            }, B: {
                t_guard: 2
            }
        })
        const r0 = skill(s0,
            "darius",
            "A",
            "R"); setHand(s0,
            "A",
            [r0])
        const base = dmgTo(play(s0,
            "A",
            r0).ev,
        "B:t_guard",
        "skill")
        const s1 = mk({
            A: {
                darius: 2
            }, B: {
                t_guard: 2
            }
        })
        gm(s1).status(u(s1,
            "B",
            "t_guard"),
        "bleed",
        2,
        {
            v: 4
        })
        const r1 = skill(s1,
            "darius",
            "A",
            "R"); setHand(s1,
            "A",
            [r1])
        const withMarks = dmgTo(play(s1,
            "A",
            r1).ev,
        "B:t_guard",
        "skill")
        assert.ok(withMarks > base + 50,
            `${base} vs ${withMarks}`)
        assert.equal(evs(play(s1,
            "A",
            r1).ev,
        "damage")[0].kind,
        "true")
    })
test("Darius Q: chỉ nhắm tướng đối diện (không đánh được khi không có ai đối diện)",
    () => {
        needHero("darius")
        const s = mk({
            A: {
                darius: 2
            }, B: {
                t_guard: 1
            }
        })
        setHand(s,
            "A",
            [skill(s,
                "darius",
                "A",
                "Q"),
            skill(s,
                "darius",
                "A",
                "R")])
        assert.equal(legalPlays(s,
            "A").length,
        0)
    })
test("Darius E: kéo 1 tướng địch bất kỳ về đối diện (đổi chỗ) rồi đánh thường miễn phí",
    () => {
        needHero("darius")
        const s = mk({
            A: {
                darius: 2
            }, B: {
                t_guard: 2, braum: 1
            }
        })
        const e = skill(s,
            "darius",
            "A",
            "E"); setHand(s,
            "A",
            [e])
        const opts = legalPlays(s,
            "A")
        assert.deepEqual(opts.map((o) => o.args?.target).sort(),
            ["B:braum",
                "B:t_guard"])
        const r = play(s,
            "A",
            e,
            {
                target: "B:braum"
            })
        assert.equal(u(r.s,
            "B",
            "braum").lane,
        2)
        assert.equal(u(r.s,
            "B",
            "t_guard").lane,
        1,
        "tướng bị thế chỗ phải sang đường kia")
        assert.equal(evs(r.ev,
            "move").length,
        1)
        const at = evs(r.ev,
            "attack")[0]
        assert.ok(at && at.free && at.target === "B:braum")
    })
test("Darius E (theo doc): mục tiêu có từ 3 dấu thì lá E quay về tay",
    () => {
        needHero("darius")
        const s = mk({
            A: {
                darius: 2
            }, B: {
                t_guard: 2
            }
        })
        gm(s).status(u(s,
            "B",
            "t_guard"),
        "bleed",
        3,
        {
            v: 3
        })
        const e = skill(s,
            "darius",
            "A",
            "E"); setHand(s,
            "A",
            [e])
        const r = play(s,
            "A",
            e,
            {
                target: "B:t_guard"
            })
        assert.ok(inHand(r.s,
            "A",
            e),
        "doc TUONG_THE_BAI mục 1: E quay về tay khi mục tiêu có từ 3 dấu")
    })
test("Darius Q (theo doc): mục tiêu đã có dấu thì +2 dấu thay vì 1",
    () => {
        needHero("darius")
        const s = mk({
            A: {
                darius: 2
            }, B: {
                t_guard: 2
            }
        })
        gm(s).status(u(s,
            "B",
            "t_guard"),
        "bleed",
        3,
        {
            v: 1
        })
        const q = skill(s,
            "darius",
            "A",
            "Q"); setHand(s,
            "A",
            [q])
        const r = play(s,
            "A",
            q)
        assert.equal(gm(r.s).statusV(u(r.s,
            "B",
            "t_guard"),
        "bleed"),
        3,
        "1 dấu cũ + 2 dấu mới")
    })

// ======================================================================
G("Tướng: Nami")
// ======================================================================
test("Nami Q: rút 2 lá; 2 lá khác loại thì bỏ 1 lá chọn trước, cùng loại thì không bỏ",
    () => {
        needHero("nami")
        const s = mk({
            A: {
                nami: 2
            }, B: {
                t_guard: 2
            }
        })
        const q = skill(s,
                "nami",
                "A",
                "Q"), junk = sup(s,
                "gold")
        setHand(s,
            "A",
            [q,
                junk])
        setTop(s,
            "A",
            [sup(s,
                "basic"),
            skill(s,
                "nami",
                "A",
                "E")]) // khác loại
        const opts = legalPlays(s,
            "A",
            "nami_q")
        assert.ok(opts.length > 0 && opts.every((o) => o.args?.discard?.length === 1))
        const r = play(s,
            "A",
            q,
            {
                discard: [junk.uid]
            })
        assert.ok(inGrave(r.s,
            "A",
            junk),
        "lá chọn bỏ phải vào mộ")
        assert.equal(r.s.players.A.hand.length,
            2,
            "1 + 2 rút - 1 bỏ")
        // cùng loại
        const s2 = mk({
            A: {
                nami: 2
            }, B: {
                t_guard: 2
            }
        })
        const q2 = skill(s2,
                "nami",
                "A",
                "Q"), junk2 = sup(s2,
                "gold")
        setHand(s2,
            "A",
            [q2,
                junk2]); setTop(s2,
            "A",
            [sup(s2,
                "basic"),
            sup(s2,
                "basic")])
        const r2 = play(s2,
            "A",
            q2,
            {
                discard: [junk2.uid]
            })
        assert.ok(!inGrave(r2.s,
            "A",
            junk2),
        "cùng loại không bỏ")
        assert.equal(r2.s.players.A.hand.length,
            3)
    })
test("Nami R: rút 3 lá; đội chỉ còn ≤3 mạng thì rút 5",
    () => {
        needHero("nami")
        const s = mk({
            A: {
                nami: 2
            }, B: {
                t_guard: 2
            }
        })
        const r = skill(s,
            "nami",
            "A",
            "R"); setHand(s,
            "A",
            [r])
        assert.equal(play(s,
            "A",
            r).s.players.A.hand.length,
        3)
        const s2 = mk({
            A: {
                nami: 2
            }, B: {
                t_guard: 2
            }
        })
        s2.players.A.lives = 3
        const r2 = skill(s2,
            "nami",
            "A",
            "R"); setHand(s2,
            "A",
            [r2])
        assert.equal(play(s2,
            "A",
            r2).s.players.A.hand.length,
        5)
        const s3 = mk({
            A: {
                nami: 2
            }, B: {
                t_guard: 2
            }
        })
        s3.players.A.lives = 4
        const r3 = skill(s3,
            "nami",
            "A",
            "R"); setHand(s3,
            "A",
            [r3])
        assert.equal(play(s3,
            "A",
            r3).s.players.A.hand.length,
        3)
    })
test("Nami E: đòn đánh kế tiếp của đồng minh không cần lá Đánh thường (action attack), có thêm sát thương phép, dùng 1 lần",
    () => {
        needHero("nami",
            "darius")
        const s = mk({
            A: {
                nami: 2, zed: 1
            }, B: {
                t_guard: 2, braum: 1
            }
        })
        const e = skill(s,
            "nami",
            "A",
            "E"); setHand(s,
            "A",
            [e])
        const opts = legalPlays(s,
            "A",
            "nami_e")
        assert.ok(opts.some((o) => o.args?.target === "A:zed"))
        const r = play(s,
            "A",
            e,
            {
                target: "A:zed"
            })
        const freeAtks = cg.legalActions(r.s,
            "A").filter((a) => a.t === "attack" && a.actor === "A:zed")
        assert.deepEqual(freeAtks.map((a) => (a as { target: string }).target),
            ["B:braum"],
            "đòn miễn phí của sát thủ: tướng cùng đường")
        const a = act(r.s,
            freeAtks[0])
        assert.ok(evs(a.ev,
            "attack")[0].free)
        const bonus = evs(a.ev,
            "damage").filter((d) => d.kind === "magic")
        assert.ok(bonus.length >= 1,
            "thiếu sát thương phép thêm")
        assert.equal(cg.legalActions(a.s,
            "A").filter((x) => x.t === "attack").length,
        0,
        "buff phải tiêu hết sau 1 đòn")
    })
test("Nami E + chí mạng: Nami rút thêm 1 lá",
    () => {
        needHero("nami")
        // mượn 3 món chí mạng
        const critItems = Object.values(cg.COMPONENTS).flatMap((x) => cg.COMPONENTS.map((y) => combine(x,
            y)!)).filter((id) => (gm(mk({
            A: {
                zed: 2
            }, B: {
                t_guard: 2
            }
        })).stats({
            items: [id]
        } as cg.Unit).crit ?? 0) > 0.3)
        if (!critItems.length) skip("không có món chí mạng")
        let drawn = -1, tried = 0
        for (let seed = 1; seed < 200 && drawn < 1; seed++) {
            const s = mk({
                A: {
                    nami: 2, zed: 1
                }, B: {
                    t_guard: 2, braum: 1
                }, seed
            })
            const z = u(s,
                "A",
                "zed"); z.items = [critItems[0],
                critItems[0],
                critItems[0]]
            z.nextAttack.push({
                id: "nami_bless", source: "A:nami", free: true, bonusRaw: 10, bonusKind: "magic"
            })
            const d0 = s.players.A.deck.length; tried++
            const r = act(s,
                {
                    t: "attack", side: "A", actor: "A:zed", target: "B:braum"
                })
            if (evs(r.ev,
                "attack")[0].crit) drawn = d0 - r.s.players.A.deck.length
        }
        assert.equal(drawn,
            1,
            `thử ${tried} seed`)
    })
test("Nami nội tại: mỗi lá rút nhờ chiêu thì đồng minh máu thấp nhất hồi {15 + 10% AP}",
    () => {
        needHero("nami")
        const s = mk({
            A: {
                nami: 2, zed: 1
            }, B: {
                t_guard: 2
            }
        })
        u(s,
            "A",
            "zed").hp = 100
        const q = skill(s,
            "nami",
            "A",
            "Q"); setHand(s,
            "A",
            [q])
        setTop(s,
            "A",
            [sup(s,
                "basic"),
            sup(s,
                "basic")])
        const r = play(s,
            "A",
            q,
            legalPlays(s,
                "A",
                "nami_q")[0].args)
        const heals = evs(r.ev,
            "heal").filter((h) => h.target === "A:zed")
        assert.equal(heals.length,
            2)
        assert.equal(hp(r.s,
            "A",
            "zed"),
        100 + 2 * Math.round(15 + 0.1 * gm(s).ap(u(s,
            "A",
            "nami"))))
    })

// ======================================================================
// Các tướng khác: viết theo docs/TUONG_THE_BAI.md, tự SKIP nếu tướng còn là stub
// ======================================================================
G("Tướng: Soraka")
test("Soraka R: xáo toàn bộ mộ bài vào lại bộ bài, mộ rỗng",
    () => {
        needHero("soraka")
        const s = mk({
            A: {
                soraka: 2
            }, B: {
                t_guard: 2
            }
        })
        const r = skill(s,
            "soraka",
            "A",
            "R")
        s.players.A.grave = Array.from({
            length: 12
        },
        () => sup(s,
            "gold"))
        setHand(s,
            "A",
            [r])
        const deck0 = s.players.A.deck.length
        const w = play(s,
            "A",
            r)
        assert.equal(w.s.players.A.grave.filter((c) => c.id === "gold").length,
            0,
            "mộ còn lá")
        assert.ok(w.s.players.A.deck.length >= deck0 + 12)
        assert.equal(evs(w.ev,
            "shuffle").filter((e) => e.what === "graveIntoDeck").length,
        1)
    })
test("Soraka nội tại: mỗi lá bị bỏ khỏi tay, đồng minh máu thấp nhất hồi máu",
    () => {
        needHero("soraka")
        const s = mk({
            A: {
                soraka: 2, zed: 1
            }, B: {
                t_guard: 2
            }
        })
        u(s,
            "A",
            "zed").hp = 50
        const c = sup(s,
            "gold"); setHand(s,
            "A",
            [c])
        const hp0 = hp(s,
            "A",
            "zed")
        gm(s).discard("A",
            c.uid)
        assert.ok(hp(s,
            "A",
            "zed") > hp0,
        "không hồi máu khi bỏ bài")
    })
test("Soraka E: bỏ tuỳ ý số lá trên tay, mỗi lá hồi máu cho tướng mình chọn",
    () => {
        needHero("soraka")
        const s = mk({
            A: {
                soraka: 2, zed: 1
            }, B: {
                t_guard: 2
            }
        })
        u(s,
            "A",
            "zed").hp = 100
        const e = skill(s,
            "soraka",
            "A",
            "E")
        const junk = [sup(s,
            "gold"),
        sup(s,
            "gold"),
        sup(s,
            "basic")]
        setHand(s,
            "A",
            [e,
                ...junk])
        const opts = legalPlays(s,
            "A",
            "soraka_e")
        assert.ok(opts.length > 1,
            "chưa liệt kê lựa chọn bỏ bài")
        const withTwo = opts.find((o) => o.args?.target === "A:zed" && o.args.discard?.length === 2)
        assert.ok(withTwo,
            "không có lựa chọn bỏ 2 lá")
        const r = play(s,
            "A",
            e,
withTwo!.args)
        assert.equal(r.s.players.A.grave.length,
            s.players.A.grave.length + 3,
            "E + 2 lá bỏ vào mộ")
    })

G("Tướng: Teemo")
test("Teemo: lá Nấm trong bộ địch — rút trúng thì tự nổ, đốt 2 lá trên cùng, Nấm chiếm lượt rút rồi biến mất",
    () => {
        needHero("teemo")
        const s = mk({
            A: {
                teemo: 2
            }, B: {
                t_guard: 2
            }
        })
        const mush = gm(s).createCard("B",
            {
                kind: "special", id: "mushroom"
            },
            "deck")
        s.players.B.deck = [mush,
            ...s.players.B.deck.filter((c) => c.uid !== mush.uid)]
        const deck0 = s.players.B.deck.length, grave0 = s.players.B.grave.length
        const t = end(s,
            "A").s // lượt B: rút 2, lá đầu là Nấm
        void t
        const r = end(s,
            "A")
        assert.ok(evs(r.ev,
            "drawAuto").length >= 1,
        "Nấm phải tự bật")
        assert.ok(evs(r.ev,
            "burn").length >= 2,
        "phải đốt 2 lá")
        assert.ok(r.s.players.B.grave.length >= grave0 + 2)
        assert.ok(![...r.s.players.B.hand,
            ...r.s.players.B.deck,
            ...r.s.players.B.grave].some((c) => c.uid === mush.uid),
        "Nấm phải biến mất")
        assert.ok(r.s.players.B.deck.length <= deck0 - 1 - 2)
    })
test("Teemo Q: xáo 1 Nấm vào bộ bài đối thủ; dưới 30 lá thì xáo 2",
    () => {
        needHero("teemo")
        const countMush = (st: St) => st.players.B.deck.filter((c) => c.id === "mushroom").length
        const s = mk({
            A: {
                teemo: 2
            }, B: {
                t_guard: 2
            }
        })
        const q = skill(s,
            "teemo",
            "A",
            "Q"); setHand(s,
            "A",
            [q])
        s.players.B.deck = s.players.B.deck.slice(0,
            40)
        assert.equal(countMush(play(s,
            "A",
            q).s),
        1)
        const s2 = mk({
            A: {
                teemo: 2
            }, B: {
                t_guard: 2
            }
        })
        const q2 = skill(s2,
            "teemo",
            "A",
            "Q"); setHand(s2,
            "A",
            [q2])
        s2.players.B.deck = s2.players.B.deck.slice(0,
            20)
        assert.equal(countMush(play(s2,
            "A",
            q2).s),
        2)
    })
test("Teemo R: xáo 3 Nấm vào bộ bài đối thủ",
    () => {
        needHero("teemo")
        const s = mk({
            A: {
                teemo: 2
            }, B: {
                t_guard: 2
            }
        })
        const r = skill(s,
            "teemo",
            "A",
            "R"); setHand(s,
            "A",
            [r])
        assert.equal(play(s,
            "A",
            r).s.players.B.deck.filter((c) => c.id === "mushroom").length,
        3)
    })
test("Teemo E: đòn đánh kế tiếp của mục tiêu bị trượt (xạ thủ thì 2 đòn)",
    () => {
        needHero("teemo")
        const s = mk({
            A: {
                teemo: 2
            }, B: {
                t_guard: 2, kogmaw: 3
            }
        })
        const e = skill(s,
            "teemo",
            "A",
            "E"); setHand(s,
            "A",
            [e])
        const r = play(s,
            "A",
            e,
            {
                target: "B:t_guard"
            })
        assert.ok(gm(r.s).statusV(u(r.s,
            "B",
            "t_guard"),
        "blind") >= 1)
        needHero("kogmaw")
        const s2 = mk({
            A: {
                teemo: 2
            }, B: {
                t_guard: 2, kogmaw: 3
            }
        })
        const e2 = skill(s2,
            "teemo",
            "A",
            "E"); setHand(s2,
            "A",
            [e2])
        const r2 = play(s2,
            "A",
            e2,
            {
                target: "B:kogmaw"
            })
        assert.equal(gm(r2.s).statusV(u(r2.s,
            "B",
            "kogmaw"),
        "blind"),
        2,
        "xạ thủ trượt 2 đòn")
    })

G("Tướng: Viktor")
/** Đánh liên tiếp n lá chiêu `k` của Viktor (thêm lá mới vào tay mỗi lần), trả về state và các lần gây sát thương lên B:t_guard */
function viktorCast(s: St, k: cg.SkillKey, n: number) {
    const dmg: number[] = []
    for (let i = 0; i < n; i++) {
        const c = skill(s,
            "viktor",
            "A",
            k); s.players.A.hand.push(c)
        const opt = legalPlays(s,
            "A").find((o) => o.uid === c.uid || s.players.A.hand.find((h) => h.uid === o.uid)?.id === c.id)
        assert.ok(opt,
            `Viktor ${k} không có lựa chọn`)
        const r = play(s,
            "A",
            c,
opt!.args); s = r.s; dmg.push(dmgTo(r.ev,
            "B:t_guard",
            "skill"))
    }
    return {
        s, dmg
    }
}
const vk = () => mk({
    A: {
        viktor: 2
    }, B: {
        t_guard: 2
    }
})
test("Viktor Q: mỗi lần dùng +1 điểm; đủ 3 điểm thì lên bậc 1 (+15% sát thương)",
    () => {
        needHero("viktor")
        const { s, dmg } = viktorCast(vk(),
            "Q",
            4)
        assert.equal(u(s,
            "A",
            "viktor").stacks.pts_Q,
        4,
        "mỗi lần dùng +1 điểm")
        assert.equal(dmg[0],
            dmg[1]); assert.equal(dmg[1],
            dmg[2])
        assert.ok(Math.abs(dmg[3] / dmg[0] - 1.15) < 0.02,
            `lần 4 phải mạnh hơn 15%: ${dmg.join(",")}`)
    })
test("Viktor E: 3 điểm lên bậc 1 (+15%); bậc 2 (6 điểm) gây Buốt cho mục tiêu",
    () => {
        needHero("viktor")
        const base = vk()
        const { s, dmg } = viktorCast(base,
            "E",
            4)
        assert.ok(Math.abs(dmg[3] / dmg[0] - 1.15) < 0.02,
            `E bậc 1: ${dmg.join(",")}`)
        const s2 = vk(); u(s2,
            "A",
            "viktor").stacks.pts_E = 6
        const r = viktorCast(s2,
            "E",
            1)
        assert.ok(gm(r.s).has(u(r.s,
            "B",
            "t_guard"),
        "chill"),
        "E bậc 2 phải gây Buốt")
        void s
    })
test("Viktor R: 1 điểm là lên bậc (bão thêm 1 lượt), bậc 2 Câm Lặng",
    () => {
        needHero("viktor")
        const a = viktorCast(vk(),
            "R",
            1)   // bậc 0 khi dùng
        const s2 = vk(); u(s2,
            "A",
            "viktor").stacks.pts_R = 1
        const b = viktorCast(s2,
            "R",
            1)     // bậc 1
        assert.equal(b.s.units["B:t_guard"].statuses.storm.until - a.s.units["B:t_guard"].statuses.storm.until,
            2,
            "bậc 1: thêm 1 lượt của Viktor")
        const s3 = vk(); u(s3,
            "A",
            "viktor").stacks.pts_R = 2
        const c = viktorCast(s3,
            "R",
            1)
        assert.ok(gm(c.s).has(c.s.units["B:t_guard"],
            "silence"),
        "R bậc 2: Câm Lặng")
    })
test("Viktor tối đa bậc 3: điểm không vượt quá 9 (Q/E) và 3 (R)",
    () => {
        needHero("viktor")
        const s = vk(); u(s,
            "A",
            "viktor").stacks.pts_Q = 9; u(s,
            "A",
            "viktor").stacks.pts_R = 3
        const a = viktorCast(s,
            "Q",
            2); const b = viktorCast(a.s,
            "R",
            2)
        assert.equal(u(b.s,
            "A",
            "viktor").stacks.pts_Q,
        9); assert.equal(u(b.s,
            "A",
            "viktor").stacks.pts_R,
        3)
    })
test("Viktor Q bậc 3: dùng xong lá về thẳng tay (một lần mỗi lượt), lá thứ hai vào mộ",
    () => {
        needHero("viktor")
        const s = vk(); u(s,
            "A",
            "viktor").stacks.pts_Q = 9
        const q1 = skill(s,
                "viktor",
                "A",
                "Q"), q2 = skill(s,
                "viktor",
                "A",
                "Q"); setHand(s,
            "A",
            [q1,
                q2])
        const o = legalPlays(s,
            "A",
            "viktor_q")[0].args
        const r1 = play(s,
            "A",
            q1,
            o)
        assert.ok(inHand(r1.s,
            "A",
            q1) && !inGrave(r1.s,
            "A",
            q1),
        "bậc 3: Q phải về tay")
        const r2 = play(r1.s,
            "A",
            q2,
            o)
        assert.ok(inGrave(r2.s,
            "A",
            q2) && !inHand(r2.s,
            "A",
            q2),
        "lần thứ 2 trong lượt: vào mộ")
    })
test("Viktor R bậc 3: mỗi lần dùng Q/E khi bão còn, bão đánh thêm 1 lần",
    () => {
        needHero("viktor")
        const s = vk(); const v = u(s,
            "A",
            "viktor"); v.stacks.pts_R = 3
        const r = viktorCast(s,
            "R",
            1)
        const storm0 = (e: Ev) => evs(e,
            "damage").filter((d) => d.target === "B:t_guard").length
        const c = skill(r.s,
            "viktor",
            "A",
            "Q"); r.s.players.A.hand.push(c)
        const w = play(r.s,
            "A",
            c,
            legalPlays(r.s,
                "A",
                "viktor_q")[0].args)
        assert.ok(storm0(w.ev) >= 2,
            "bão phải đánh thêm khi dùng Q")
    })

G("Tướng: Zed")
test("Zed E: tạo lá Bóng (copyOf zed_q) lên tay; Bóng dùng 1 lần rồi biến mất, không vào mộ; không dùng thì mất cuối lượt",
    () => {
        needHero("zed")
        const s = mk({
            A: {
                zed: 2
            }, B: {
                t_guard: 2
            }
        })
        const e = skill(s,
            "zed",
            "A",
            "E"); setHand(s,
            "A",
            [e])
        s.players.A.grave.push(skill(s,
            "zed",
            "A",
            "Q"),
        skill(s,
            "zed",
            "A",
            "Q")) // Bóng sao chép lá Zed trong mộ
        const opts = legalPlays(s,
            "A",
            "zed_e")
        assert.ok(opts.length > 0)
        const w = play(s,
            "A",
            e,
            opts[0].args)
        const shadows = w.s.players.A.hand.filter((c) => c.id === "shadow" || c.copyOf)
        assert.ok(shadows.length >= 1,
            "không có lá Bóng")
        assert.ok(shadows[0].temp && shadows[0].copyOf?.startsWith("zed_"))
        const sh = shadows[0]
        const po = legalPlays(w.s,
            "A").filter((a) => a.uid === sh.uid)
        assert.ok(po.length > 0,
            "Bóng không đánh được")
        const g1 = w.s.players.A.grave.length
        const used = play(w.s,
            "A",
            sh,
            po[0].args)
        assert.equal(used.s.players.A.grave.length,
            g1,
            "Bóng không được vào mộ")
        assert.ok(!inHand(used.s,
            "A",
            sh))
        const t = end(w.s,
            "A").s
        assert.ok(!t.players.A.hand.some((c) => c.uid === sh.uid),
            "Bóng phải mất cuối lượt")
    })

G("Tướng: Braum")
test("Braum Q: phản ứng đổi mục tiêu sang Braum và Braum nhận Khiên",
    () => {
        needHero("braum",
            "teemo")
        const s = mk({
            A: {
                teemo: 2
            }, B: {
                braum: 1, t_guard: 2
            }
        }) // xạ thủ đánh được mọi tướng; cả 2 đều là đỡ đòn
        const strike = sup(s,
            "basic"); setHand(s,
            "A",
            [strike])
        const q = skill(s,
            "braum",
            "B",
            "Q"); setHand(s,
            "B",
            [q])
        const w = play(s,
            "A",
            strike,
            {
                actor: "A:teemo", target: "B:t_guard"
            })
        assert.equal(w.s.phase,
            "chain")
        const reacts = cg.legalActions(w.s,
            "B").filter((a) => a.t === "chain")
        assert.ok(reacts.length > 0)
        const r = act(w.s,
            reacts[0])
        assert.ok(dmgTo(r.ev,
            "B:braum") > 0 && dmgTo(r.ev,
            "B:t_guard") === 0,
        "sát thương phải sang Braum")
    })

G("Tướng: Blitzcrank")
test("Blitzcrank nội tại: lá chiêu cướp được nằm trên tay thành thẻ chiêu chung cùng chữ",
    () => {
        needHero("blitzcrank")
        const s = mk({
            A: {
                blitzcrank: 2
            }, B: {
                t_guard: 2
            }
        })
        const q = skill(s,
            "blitzcrank",
            "A",
            "Q"); setHand(s,
            "A",
            [q])
        const stolen = skill(s,
            "darius",
            "B",
            "R"); setHand(s,
            "B",
            [stolen])
        const opts = legalPlays(s,
            "A",
            "blitzcrank_q")
        assert.ok(opts.length > 0)
        const r = play(s,
            "A",
            q,
            opts[0].args)
        const mine = r.s.players.A.hand
        assert.ok(mine.some((c) => c.kind === "wild" && c.id === "wild_r"),
            `lá cướp không thành wild_r: ${handIds(r.s,
                "A")}`)
        assert.equal(r.s.players.B.hand.length,
            0)
    })

G("Tướng: Twisted Fate")
test("TF E: lục bộ lấy 1 lá bất kỳ lên tay rồi xáo bộ",
    () => {
        needHero("twistedfate")
        const s = mk({
            A: {
                twistedfate: 2
            }, B: {
                t_guard: 2
            }
        })
        const e = skill(s,
            "twistedfate",
            "A",
            "E"); setHand(s,
            "A",
            [e])
        const opts = legalPlays(s,
            "A",
            "twistedfate_e")
        assert.ok(opts.length > 0,
            "TF E không có lựa chọn")
        const d0 = s.players.A.deck.length
        const r = play(s,
            "A",
            e,
            opts[0].args)
        assert.equal(r.s.players.A.deck.length,
            d0 - 1)
        assert.ok(r.s.players.A.hand.length >= 1)
    })

G("Tướng: Kog'Maw")
test("Kog'Maw: mỗi lần chết +2 Stack, giữ qua chết; Stack tăng đòn đánh",
    () => {
        needHero("kogmaw")
        const s = mk({
            A: {
                kogmaw: 2
            }, B: {
                t_guard: 2
            }
        })
        const k = u(s,
            "A",
            "kogmaw")
        const before = JSON.stringify(k.stacks)
        gm(s).kill(k,
            u(s,
                "B",
                "t_guard"))
        assert.notEqual(JSON.stringify(k.stacks),
            before,
            "Stack không đổi khi chết")
        const total = Object.values(k.stacks).reduce((x, y) => x + y,
            0)
        assert.ok(total >= 2,
            `stacks=${JSON.stringify(k.stacks)}`)
    })

// ======================================================================
// Bổ sung cơ chế từng tướng (đi sâu hơn: điều kiện của chiêu, nội tại)
// ======================================================================
const first = (s: St, cardId: string) => legalPlays(s,
    "A",
    cardId)[0]?.args
const give = (s: St, hero: string, k: cg.SkillKey, side: "A" | "B" = "A") => { const c = skill(s,
    hero,
    side,
    k); s.players[side].hand.push(c); return c }

G("Tướng: Kog'Maw (chi tiết)")
test("Kog'Maw: +1 Stack mỗi vòng còn sống (đầu vòng mới)",
    () => {
        needHero("kogmaw")
        let s = mk({
            A: {
                kogmaw: 2
            }, B: {
                t_guard: 2
            }
        })
        const k0 = u(s,
            "A",
            "kogmaw").stacks.kog ?? 0
        s = end(end(s,
            "A").s,
        "B").s // hết vòng
        assert.equal(u(s,
            "A",
            "kogmaw").stacks.kog,
        k0 + 1)
    })
test("Kog'Maw: Stack làm đòn đánh mạnh hơn",
    () => {
        needHero("kogmaw")
        const mkS = (n: number) => { const s = mk({
            A: {
                kogmaw: 2
            }, B: {
                t_guard: 2
            }
        }); u(s,
            "A",
            "kogmaw").stacks.kog = n; setHand(s,
            "A",
            [sup(s,
                "basic")]); return s }
        const d = (n: number) => { const s = mkS(n); return dmgTo(play(s,
            "A",
            s.players.A.hand[0],
            first(s,
                "basic")).ev,
        "B:t_guard",
        "attack") }
        const d0 = d(0), d5 = d(5)
        assert.ok(d5 > d0 + 15,
            `d0=${d0} d5=${d5}`) // 5 Stack × (4 + 2% AD) = 27 thô, còn ~20 sau giáp
    })
test("Kog'Maw Q: Rã giáp 1 mục tiêu; từ 6 Stack thì Rã giáp mọi tướng địch",
    () => {
        needHero("kogmaw")
        const s = mk({
            A: {
                kogmaw: 2
            }, B: {
                t_guard: 2, braum: 1
            }
        })
        const q = give(s,
            "kogmaw",
            "Q")
        const r = play(s,
            "A",
            q,
            {
                target: "B:t_guard"
            })
        assert.ok(gm(r.s).has(u(r.s,
            "B",
            "t_guard"),
        "shred") && !gm(r.s).has(u(r.s,
            "B",
            "braum"),
        "shred"))
        const s2 = mk({
            A: {
                kogmaw: 2
            }, B: {
                t_guard: 2, braum: 1
            }
        })
        u(s2,
            "A",
            "kogmaw").stacks.kog = 6
        const r2 = play(s2,
            "A",
            give(s2,
                "kogmaw",
                "Q"),
            {
                target: "B:t_guard"
            })
        assert.ok(gm(r2.s).has(u(r2.s,
            "B",
            "braum"),
        "shred"),
        "đủ 6 Stack phải rã giáp cả đội")
    })
test("Kog'Maw R: mục tiêu dưới 40% máu thì sát thương gấp đôi; Stack tăng sát thương",
    () => {
        needHero("kogmaw")
        const dmg = (stacks: number, hpPct: number) => {
            const s = mk({
                A: {
                    kogmaw: 2
                }, B: {
                    t_guard: 2
                }
            })
            u(s,
                "A",
                "kogmaw").stacks.kog = stacks; u(s,
                "B",
                "t_guard").hp = Math.round(1000 * hpPct)
            return dmgTo(play(s,
                "A",
                give(s,
                    "kogmaw",
                    "R"),
                {
                    target: "B:t_guard"
                }).ev,
            "B:t_guard",
            "skill")
        }
        const base = dmg(0,
                1), st = dmg(10,
                1), low = dmg(0,
                0.3)
        assert.ok(st > base,
            "Stack không tăng sát thương"); assert.ok(Math.abs(low / base - 2) < 0.03,
            `${base} -> ${low}`)
    })
test("Kog'Maw E: cuối lượt tự đánh (không cần lá Đánh thường); +1 Stack khi trúng tướng Rã giáp; không có E thì không tự đánh",
    () => {
        needHero("kogmaw")
        let s = mk({
            A: {
                kogmaw: 2
            }, B: {
                t_guard: 2
            }
        })
        const e = give(s,
            "kogmaw",
            "E")
        s = play(s,
            "A",
            e,
            first(s,
                "kogmaw_e")).s
        gm(s).status(u(s,
            "B",
            "t_guard"),
        "shred",
        3)
        const k0 = u(s,
            "A",
            "kogmaw").stacks.kog ?? 0
        const r = end(s,
            "A")
        assert.equal(evs(r.ev,
            "attack").filter((a) => a.attacker === "A:kogmaw").length,
        1,
        "phải tự đánh cuối lượt")
        assert.equal(u(r.s,
            "A",
            "kogmaw").stacks.kog,
        k0 + 1,
        "trúng tướng Rã giáp: +1 Stack")
        const s2 = mk({
            A: {
                kogmaw: 2
            }, B: {
                t_guard: 2
            }
        })
        assert.equal(evs(end(s2,
            "A").ev,
        "attack").length,
        0)
    })

G("Tướng: Zed (chi tiết)")
test("Zed R: đánh dấu; Q lên mục tiêu có dấu mạnh hơn 40%; cuối lượt đối thủ dấu nổ 50% sát thương Zed đã gây (chuẩn)",
    () => {
        needHero("zed")
        let s = mk({
            A: {
                zed: 2
            }, B: {
                t_guard: 2
            }
        })
        const q0 = give(s,
            "zed",
            "Q"); const base = dmgTo(play(s,
            "A",
            q0,
            {
                target: "B:t_guard"
            }).ev,
        "B:t_guard",
        "skill")
        s = mk({
            A: {
                zed: 2
            }, B: {
                t_guard: 2
            }
        })
        s = play(s,
            "A",
            give(s,
                "zed",
                "R"),
            {
                target: "B:t_guard"
            }).s
        const r = play(s,
            "A",
            give(s,
                "zed",
                "Q"),
            {
                target: "B:t_guard"
            })
        const marked = dmgTo(r.ev,
            "B:t_guard",
            "skill")
        assert.ok(Math.abs(marked / base - 1.4) < 0.03,
            `${base} -> ${marked}`)
        const x = end(end(r.s,
            "A").s,
        "B") // B kết thúc lượt: dấu nổ
        const boom = evs(x.ev,
            "damage").find((d) => d.target === "B:t_guard" && d.kind === "true")
        assert.ok(boom,
            "dấu không nổ cuối lượt đối thủ")
        assert.ok(Math.abs(boom!.amount - Math.round(marked * 0.5)) <= 1,
            `nổ ${boom!.amount} khác 50% của ${marked}`)
    })
test("Zed R: dấu nổ hạ gục thì lá R quay về tay",
    () => {
        needHero("zed")
        let s = mk({
            A: {
                zed: 2
            }, B: {
                t_guard: 2
            }
        })
        const rc = give(s,
            "zed",
            "R"); setHand(s,
            "A",
            [rc]); s = play(s,
            "A",
            rc,
            {
                target: "B:t_guard"
            }).s
        u(s,
            "B",
            "t_guard").hp = 5
        s.units["A:zed"].stacks["dmg:B:t_guard"] = 400 // đã gây 400 từ lúc đánh dấu
        const r = end(end(s,
            "A").s,
        "B")
        assert.equal(u(r.s,
            "B",
            "t_guard").status,
        "dead")
        assert.ok(r.s.players.A.hand.some((c) => c.id === "zed_r"),
            "R phải về tay khi dấu nổ hạ gục")
    })
test("Zed nội tại: đòn đánh lên mục tiêu dưới 50% máu gây thêm 8% máu tối đa",
    () => {
        needHero("zed")
        const d = (hpv: number) => { const s = mk({
            A: {
                zed: 2
            }, B: {
                t_guard: 2
            }
        }); u(s,
            "B",
            "t_guard").hp = hpv; setHand(s,
            "A",
            [sup(s,
                "basic")])
        return dmgTo(play(s,
            "A",
            s.players.A.hand[0],
            first(s,
                "basic")).ev,
        "B:t_guard",
        "attack") }
        const hi = d(900), lo = d(400)
        assert.ok(lo > hi + 40,
            `${hi} vs ${lo}`)
    })
test("Zed E: có từ 3 lá Zed trong mộ thì tạo 2 Bóng (copyOf zed_q); Bóng-Q gây sát thương",
    () => {
        needHero("zed")
        const s = mk({
            A: {
                zed: 2
            }, B: {
                t_guard: 2
            }
        })
        const e = give(s,
            "zed",
            "E"); setHand(s,
            "A",
            [e])
        s.players.A.grave.push(skill(s,
            "zed",
            "A",
            "Q"),
        skill(s,
            "zed",
            "A",
            "Q"),
        skill(s,
            "zed",
            "A",
            "Q"))
        const r = play(s,
            "A",
            e,
            first(s,
                "zed_e"))
        const shadows = r.s.players.A.hand.filter((c) => c.copyOf)
        assert.equal(shadows.length,
            2,
            ">=3 lá Zed trong mộ: 2 Bóng")
        assert.ok(shadows.every((c) => c.copyOf === "zed_q"))
        const sh = shadows[0]
        const sr = play(r.s,
            "A",
            sh,
legalPlays(r.s,
    "A").find((o) => o.uid === sh.uid)!.args)
        assert.ok(dmgTo(sr.ev,
            "B:t_guard",
            "skill") > 0)
    })
test("Zed E: không sao chép E; mộ không có lá Zed nào khác thì không có Bóng",
    () => {
        needHero("zed")
        const s = mk({
            A: {
                zed: 2
            }, B: {
                t_guard: 2
            }
        })
        const e = give(s,
            "zed",
            "E"); setHand(s,
            "A",
            [e]); s.players.A.grave.push(skill(s,
            "zed",
            "A",
            "E"))
        const r = play(s,
            "A",
            e,
            first(s,
                "zed_e"))
        assert.equal(r.s.players.A.hand.filter((c) => c.copyOf).length,
            0)
    })

G("Tướng: Twisted Fate (chi tiết)")
test("TF Q xanh: rút 2; liền sau chọn xanh lần nữa (cùng màu) rút 3",
    () => {
        needHero("twistedfate")
        let s = mk({
            A: {
                twistedfate: 2
            }, B: {
                t_guard: 2
            }
        })
        const q1 = give(s,
            "twistedfate",
            "Q"); setHand(s,
            "A",
            [q1])
        const d0 = s.players.A.deck.length
        s = play(s,
            "A",
            q1,
            {
                color: "blue"
            }).s
        assert.equal(d0 - s.players.A.deck.length,
            2)
        const q2 = give(s,
            "twistedfate",
            "Q"); const d1 = s.players.A.deck.length
        s = play(s,
            "A",
            q2,
            {
                color: "blue"
            }).s
        assert.equal(d1 - s.players.A.deck.length,
            3,
            "cùng màu lần trước: rút 3")
    })
test("TF Q đỏ: sát thương phép lên mọi tướng địch; cùng màu lần trước thì mạnh thêm 50%",
    () => {
        needHero("twistedfate")
        const s = mk({
            A: {
                twistedfate: 2
            }, B: {
                t_guard: 2, braum: 1
            }
        })
        const r1 = play(s,
            "A",
            give(s,
                "twistedfate",
                "Q"),
            {
                color: "red"
            })
        assert.ok(dmgTo(r1.ev,
            "B:t_guard") > 0 && dmgTo(r1.ev,
            "B:braum") > 0,
        "đỏ phải trúng mọi tướng địch")
        const r2 = play(r1.s,
            "A",
            give(r1.s,
                "twistedfate",
                "Q"),
            {
                color: "red"
            })
        const a = dmgTo(r1.ev,
                "B:t_guard"), b = dmgTo(r2.ev,
                "B:t_guard")
        assert.ok(Math.abs(b / a - 1.5) < 0.05,
            `${a} -> ${b}`)
    })
test("TF Q vàng: sát thương + Choáng 1 lượt cho 1 tướng, TF nhận 1 lá Vàng",
    () => {
        needHero("twistedfate")
        const s = mk({
            A: {
                twistedfate: 2
            }, B: {
                t_guard: 2
            }
        })
        const q = give(s,
            "twistedfate",
            "Q"); setHand(s,
            "A",
            [q])
        const r = play(s,
            "A",
            q,
            {
                color: "gold", target: "B:t_guard"
            })
        assert.ok(gm(r.s).has(u(r.s,
            "B",
            "t_guard"),
        "stun"))
        assert.ok(r.s.players.A.hand.some((c) => c.id === "gold"),
            "không nhận lá Vàng")
    })
test("TF nội tại: dùng lá Vàng ghép đồ thì rút 1 lá",
    () => {
        needHero("twistedfate")
        const s = mk({
            A: {
                twistedfate: 2
            }, B: {
                t_guard: 2
            }
        })
        const a = sup(s,
                "item",
                "kiem_dai"), b = sup(s,
                "item",
                "cung_go"), gd = sup(s,
                "gold"); setHand(s,
            "A",
            [a,
                b,
                gd])
        const d0 = s.players.A.deck.length
        const r = act(s,
            {
                t: "craft", side: "A", items: [a.uid,
                    b.uid], gold: gd.uid, unit: "A:twistedfate"
            })
        assert.equal(d0 - r.s.players.A.deck.length,
            1)
        assert.equal(r.s.players.A.hand.length,
            1)
    })
test("TF E: lấy lá R thì phải bỏ 1 lá khác trên tay (lựa chọn đều kèm lá bỏ)",
    () => {
        needHero("twistedfate")
        const s = mk({
            A: {
                twistedfate: 2
            }, B: {
                t_guard: 2
            }
        })
        const e = give(s,
            "twistedfate",
            "E"); setHand(s,
            "A",
            [e,
                sup(s,
                    "gold")])
        const opts = legalPlays(s,
            "A",
            "twistedfate_e")
        const takeR = opts.find((o) => s.players.A.deck.find((c) => c.uid === o.args?.pick)?.id.endsWith("_r"))
        assert.ok(takeR?.args?.discard?.length === 1,
            "lấy R phải kèm 1 lá bỏ")
        const r = play(s,
            "A",
            e,
takeR!.args)
        assert.equal(r.s.players.A.hand.length,
            1,
            "lấy 1 lá R, bỏ Vàng")
        assert.ok(r.s.players.A.hand[0].id.endsWith("_r"))
    })
test("TF R: chuyển tướng sang đường khác, đòn đánh kế tiếp gấp đôi; xem tay đối thủ (status see_hand)",
    () => {
        needHero("twistedfate")
        const s = mk({
            A: {
                twistedfate: 2
            }, B: {
                t_guard: 2
            }
        })
        const r = give(s,
            "twistedfate",
            "R"); setHand(s,
            "A",
            [r])
        const opt = legalPlays(s,
            "A",
            "twistedfate_r").find((o) => o.args?.target === "A:twistedfate" && o.args.lane === 1)!
        const w = play(s,
            "A",
            r,
            opt.args)
        assert.equal(u(w.s,
            "A",
            "twistedfate").lane,
        1)
        assert.ok(gm(w.s).has(u(w.s,
            "A",
            "twistedfate"),
        "see_hand"))
        assert.ok(u(w.s,
            "A",
            "twistedfate").nextAttack.some((b) => b.mult === 2))
    })

G("Tướng: Braum (chi tiết)")
test("Braum Q: sát thương chuyển sang Braum (tướng gốc không bị đánh), Braum nhận Khiên; có Khiên từ trước thì phản sát thương",
    () => {
        needHero("braum",
            "teemo")
        const run = (preShield: number) => {
            const s = mk({
                A: {
                    teemo: 2
                }, B: {
                    braum: 1, t_guard: 2
                }
            })
            u(s,
                "B",
                "braum").shield = preShield
            setHand(s,
                "A",
                [sup(s,
                    "basic")]); setHand(s,
                "B",
                [skill(s,
                    "braum",
                    "B",
                    "Q")])
            const w = play(s,
                "A",
                s.players.A.hand[0],
                {
                    actor: "A:teemo", target: "B:t_guard"
                })
            const rc = cg.legalActions(w.s,
                "B").find((a) => a.t === "chain")!
            return act(w.s,
                rc)
        }
        const a = run(0)
        assert.equal(dmgTo(a.ev,
            "B:t_guard"),
        0,
        "tướng gốc vẫn bị đánh")
        assert.ok(dmgTo(a.ev,
            "B:braum") > 0)
        assert.ok(evs(a.ev,
            "shield").some((e) => e.target === "B:braum"))
        assert.equal(dmgTo(a.ev,
            "A:teemo"),
        0,
        "không có Khiên trước: không phản")
        const b = run(50)
        assert.ok(dmgTo(b.ev,
            "A:teemo") > 0,
        "có Khiên trước phải phản sát thương")
    })
test("Braum E: chiêu nhắm nhiều tướng (Viktor E) — mọi đồng minh nhận ít hơn 40% sát thương",
    () => {
        needHero("braum",
            "viktor")
        const run = (withE: boolean) => {
            const s = mk({
                A: {
                    viktor: 2
                }, B: {
                    braum: 2, t_guard: 1
                }
            })
            const e = give(s,
                "viktor",
                "E")
            const opt = legalPlays(s,
                "A",
                "viktor_e").find((o) => (o.args?.targets ?? []).length === 2)!
            if (withE) setHand(s,
                "B",
                [skill(s,
                    "braum",
                    "B",
                    "E")]); else setHand(s,
                "B",
                [])
            let w = play(s,
                "A",
                e,
                opt.args)
            if (withE) { assert.equal(w.s.phase,
                "chain",
                "E của Braum phải mở chuỗi"); w = act(w.s,
cg.legalActions(w.s,
    "B").find((a) => a.t === "chain")!) }
            return dmgTo(w.ev,
                "B:braum",
                "skill")
        }
        const normal = run(false), cut = run(true)
        assert.ok(Math.abs(cut / normal - 0.6) < 0.04,
            `${normal} -> ${cut}`)
    })
test("Braum E không phản ứng với chiêu một mục tiêu",
    () => {
        needHero("braum",
            "kogmaw")
        const s = mk({
            A: {
                kogmaw: 2
            }, B: {
                braum: 2
            }
        })
        setHand(s,
            "B",
            [skill(s,
                "braum",
                "B",
                "E")])
        const r = play(s,
            "A",
            give(s,
                "kogmaw",
                "Q"),
            {
                target: "B:braum"
            })
        assert.equal(r.s.phase,
            "main")
    })
test("Braum R: Choáng mọi tướng địch 1 lượt; còn từ 2 lá phản ứng trên tay thì Choáng 2 lượt",
    () => {
        needHero("braum")
        const run = (reacts: number) => {
            const s = mk({
                A: {
                    braum: 2
                }, B: {
                    t_guard: 2, zed: 1
                }
            })
            const r = give(s,
                "braum",
                "R"); setHand(s,
                "A",
                [r,
                    ...Array.from({
                        length: reacts
                    },
                    (_, i) => skill(s,
                        "braum",
                        "A",
                        i % 2 ? "E" : "Q"))])
            return play(s,
                "A",
                r,
                first(s,
                    "braum_r")).s
        }
        const a = run(0), b = run(2)
        for (const t of ["t_guard",
            "zed"]) assert.ok(gm(a).has(u(a,
            "B",
            t),
        "stun"))
        assert.equal(b.units["B:t_guard"].statuses.stun.until - a.units["B:t_guard"].statuses.stun.until,
            2,
            "2 lá phản ứng: Choáng thêm 1 lượt của đối thủ")
    })
test("Braum nội tại: đã phản ứng trong lượt đối thủ thì cuối lượt đó rút 1 lá; không phản ứng thì không",
    () => {
        needHero("braum",
            "teemo")
        const run = (reactIt: boolean) => {
            const s = mk({
                A: {
                    teemo: 2
                }, B: {
                    braum: 1, t_guard: 2
                }
            })
            setHand(s,
                "A",
                [sup(s,
                    "basic")]); setHand(s,
                "B",
                [skill(s,
                    "braum",
                    "B",
                    "Q")])
            let w = play(s,
                "A",
                s.players.A.hand[0],
                {
                    actor: "A:teemo", target: "B:t_guard"
                })
            w = act(w.s,
                reactIt ? cg.legalActions(w.s,
                    "B").find((a) => a.t === "chain")! : {
                    t: "pass", side: "B"
                })
            const deck0 = w.s.players.B.deck.length, hand0 = w.s.players.B.hand.length
            const r = end(w.s,
                "A")
            // sang lượt B: B rút 2 lá đầu lượt (tay tối đa RULES.handMax nên có thể tràn). Tổng số lá B lấy khỏi bộ trong cả bước = 2 (đầu lượt) + 1 (Cảnh Giác)
            return deck0 - r.s.players.B.deck.length - 2 + (hand0 * 0)
        }
        assert.equal(run(true),
            1,
            "phản ứng rồi phải rút thêm 1")
        assert.equal(run(false),
            0,
            "không phản ứng thì không rút thêm")
    })

G("Tướng: Blitzcrank (chi tiết)")
test("Blitzcrank Q: kéo mục tiêu về đối diện, Choáng; lá cướp được thành wild cùng chữ; +5 giáp",
    () => {
        needHero("blitzcrank")
        const s = mk({
            A: {
                blitzcrank: 2
            }, B: {
                t_guard: 4
            }
        })
        const q = give(s,
            "blitzcrank",
            "Q"); setHand(s,
            "A",
            [q])
        setHand(s,
            "B",
            [skill(s,
                "zed",
                "B",
                "Q")])
        const armor0 = gm(s).armor(u(s,
            "A",
            "blitzcrank"))
        const r = play(s,
            "A",
            q,
            {
                target: "B:t_guard"
            })
        assert.equal(u(r.s,
            "B",
            "t_guard").lane,
        2,
        "chưa kéo về đối diện")
        assert.ok(gm(r.s).has(u(r.s,
            "B",
            "t_guard"),
        "stun"))
        assert.ok(r.s.players.A.hand.some((c) => c.kind === "wild" && c.id === "wild_q"),
            "lá Q cướp được phải thành wild_q")
        assert.equal(gm(r.s).armor(u(r.s,
            "A",
            "blitzcrank")),
        armor0 + 5,
        "+5 giáp mỗi lá cướp")
    })
test("Blitzcrank: giáp/kháng cộng thêm tối đa +30",
    () => {
        needHero("blitzcrank")
        const s = mk({
            A: {
                blitzcrank: 2
            }, B: {
                t_guard: 2
            }
        })
        const armor0 = gm(s).armor(u(s,
            "A",
            "blitzcrank"))
        let st = s
        for (let i = 0; i < 9; i++) {
            setHand(st,
                "B",
                [skill(st,
                    "zed",
                    "B",
                    "Q")])
            const q = give(st,
                "blitzcrank",
                "Q"); setHand(st,
                "A",
                [q])
            st = play(st,
                "A",
                q,
                {
                    target: "B:t_guard"
                }).s
        }
        assert.equal(gm(st).armor(u(st,
            "A",
            "blitzcrank")),
        armor0 + 30,
        "9 lá cướp = +45 nhưng tối đa +30")
    })
test("Blitzcrank E: đánh thường miễn phí tướng đối diện + Choáng 1 lượt (2 lượt nếu tay đối thủ còn ≤3 lá)",
    () => {
        needHero("blitzcrank")
        const run = (handN: number) => {
            const s = mk({
                A: {
                    blitzcrank: 2
                }, B: {
                    t_guard: 2
                }
            })
            const e = give(s,
                "blitzcrank",
                "E"); setHand(s,
                "A",
                [e])
            setHand(s,
                "B",
                Array.from({
                    length: handN
                },
                () => sup(s,
                    "gold")))
            return play(s,
                "A",
                e,
                first(s,
                    "blitzcrank_e"))
        }
        const a = run(6), b = run(2)
        assert.ok(evs(a.ev,
            "attack").some((x) => x.free && x.attacker === "A:blitzcrank"))
        assert.equal(b.s.units["B:t_guard"].statuses.stun.until - a.s.units["B:t_guard"].statuses.stun.until,
            2)
    })
test("Blitzcrank R: mọi tướng địch bị Câm Lặng, đối thủ bỏ 2 lá; tay trống sau khi bỏ thì Blitzcrank nhận Khiên",
    () => {
        needHero("blitzcrank")
        const run = (handN: number) => {
            const s = mk({
                A: {
                    blitzcrank: 2
                }, B: {
                    t_guard: 2, zed: 1
                }
            })
            const r = give(s,
                "blitzcrank",
                "R"); setHand(s,
                "A",
                [r])
            setHand(s,
                "B",
                Array.from({
                    length: handN
                },
                () => sup(s,
                    "gold")))
            return play(s,
                "A",
                r,
                first(s,
                    "blitzcrank_r"))
        }
        const a = run(5), b = run(2)
        assert.equal(a.s.players.B.hand.length,
            3,
            "bỏ đúng 2 lá")
        assert.ok(gm(a.s).has(u(a.s,
            "B",
            "zed"),
        "silence") && gm(a.s).has(u(a.s,
            "B",
            "t_guard"),
        "silence"))
        assert.equal(u(a.s,
            "A",
            "blitzcrank").shield,
        0)
        assert.ok(u(b.s,
            "A",
            "blitzcrank").shield > 0,
        "tay trống: phải có Khiên")
    })

G("Tướng: Teemo & Soraka (chi tiết)")
test("Teemo: Nấm nổ gây sát thương phép lên tướng ít máu nhất của bên rút; Mùa Nấm đốt 3 lá thay vì 2",
    () => {
        needHero("teemo")
        const run = (season: boolean) => {
            let s = mk({
                A: {
                    teemo: 2
                }, B: {
                    t_guard: 2, braum: 1
                }
            })
            u(s,
                "B",
                "braum").hp = 300
            if (season) { const r = give(s,
                "teemo",
                "R"); s = play(s,
                "A",
                r,
                first(s,
                    "teemo_r")).s }
            s.players.B.deck = s.players.B.deck.filter((c) => c.id !== "mushroom")
            s.players.B.deck.unshift(gm(s).newCard({
                kind: "special", id: "mushroom", hero: "teemo", side: "A"
            }))
            const r = end(s,
                "A")
            return {
                r, hpBraum: hp(r.s,
                    "B",
                    "braum")
            }
        }
        const a = run(false), b = run(true)
        assert.ok(a.hpBraum < 300,
            "Nấm phải gây sát thương lên tướng ít máu nhất")
        assert.equal(evs(a.r.ev,
            "burn").length,
        2)
        assert.equal(evs(b.r.ev,
            "burn").length >= 3,
        true,
        "Mùa Nấm: đốt 3 lá")
    })
test("Teemo: Nấm không bao giờ vào mộ hay về tay (biến mất)",
    () => {
        needHero("teemo")
        const s = mk({
            A: {
                teemo: 2
            }, B: {
                t_guard: 2
            }
        })
        const mush = gm(s).newCard({
            kind: "special", id: "mushroom", hero: "teemo", side: "A"
        })
        s.players.B.deck.unshift(mush)
        const r = end(s,
            "A")
        const all = [...r.s.players.B.hand,
            ...r.s.players.B.deck,
            ...r.s.players.B.grave]
        assert.ok(!all.some((c) => c.uid === mush.uid))
    })
test("Soraka Q: mộ ≥10 lá thì đồng minh máu thấp nhất cũng hồi",
    () => {
        needHero("soraka")
        const run = (graveN: number) => {
            const s = mk({
                A: {
                    soraka: 2, zed: 1
                }, B: {
                    t_guard: 2
                }
            })
            u(s,
                "A",
                "soraka").hp = 400; u(s,
                "A",
                "zed").hp = 100
            s.players.A.grave = Array.from({
                length: graveN
            },
            () => sup(s,
                "gold"))
            const q = give(s,
                "soraka",
                "Q")
            return play(s,
                "A",
                q,
                legalPlays(s,
                    "A",
                    "soraka_q")[0].args)
        }
        const a = run(3), b = run(12)
        assert.ok(!evs(a.ev,
            "heal").some((h) => h.target === "A:zed"))
        assert.ok(evs(b.ev,
            "heal").some((h) => h.target === "A:zed"),
        "mộ ≥10 lá phải hồi thêm cho đồng minh")
    })
test("Soraka E: bỏ lá chết (lá của tướng đang chết) thì hồi nhiều hơn",
    () => {
        needHero("soraka")
        const run = (dead: boolean) => {
            const s = mk({
                A: {
                    soraka: 2, zed: 1
                }, B: {
                    t_guard: 2
                }
            })
            u(s,
                "A",
                "soraka").hp = 100
            if (dead) gm(s).kill(u(s,
                "A",
                "zed"),
            u(s,
                "B",
                "t_guard"))
            const e = give(s,
                "soraka",
                "E")
            const junk = dead ? skill(s,
                "zed",
                "A",
                "Q") : sup(s,
                "gold")
            setHand(s,
                "A",
                [e,
                    junk])
            const o = legalPlays(s,
                "A",
                "soraka_e").find((x) => x.args?.target === "A:soraka" && x.args.discard?.length === 1)!
            const r = play(s,
                "A",
                e,
                o.args)
            return evs(r.ev,
                "heal").filter((h) => h.target === "A:soraka" && h.src === "A:soraka").reduce((x, h) => x + h.amount,
                0)
        }
        const live = run(false), dead = run(true)
        assert.ok(dead > live,
            `${live} -> ${dead}`)
    })
test("Soraka R: bộ bài dưới 10 lá thì mọi đồng minh còn nhận Khiên",
    () => {
        needHero("soraka")
        const run = (deckN: number) => {
            const s = mk({
                A: {
                    soraka: 2
                }, B: {
                    t_guard: 2
                }
            })
            s.players.A.deck = s.players.A.deck.slice(0,
                deckN)
            return play(s,
                "A",
                give(s,
                    "soraka",
                    "R"),
                first(s,
                    "soraka_r")).s
        }
        assert.equal(u(run(20),
            "A",
            "soraka").shield,
        0)
        assert.ok(u(run(5),
            "A",
            "soraka").shield > 0)
    })

// ======================================================================
G("Tiếng Anh (i18n)")
// ======================================================================
test("applyCardLocale('en') đổi tên + mô tả tướng đã dịch, 'vi' khôi phục nguyên bản",
    () => {
        const h = cg.getHero("nami")!
        const viName = h.skills.Q.name, viDesc = h.skills.Q.desc
        cg.applyCardLocale("en")
        try {
            assert.equal(cg.getCardLang(),
                "en")
            assert.equal(h.skills.Q.name,
                "Ebb and Flow")
            assert.notEqual(h.skills.Q.desc,
                viDesc)
        } finally { cg.applyCardLocale("vi") }
        assert.equal(h.skills.Q.name,
            viName); assert.equal(h.skills.Q.desc,
            viDesc)
    })
test("Công thức {…} trong bản EN giống bản VI cho mọi tướng đã dịch",
    () => {
        cg.applyCardLocale("en"); cg.applyCardLocale("vi")
        const errs = cg.checkTranslations()
        assert.deepEqual(errs,
            [])
    })
test("Mọi tướng đã viết xong đều có bản dịch EN (nếu không: liệt kê phần còn thiếu)",
    () => {
        const miss = cg.missingTranslations().filter((id) => !id.startsWith("t_")) // t_* là tướng riêng của file test
        assert.deepEqual(miss,
            [],
            `thiếu bản dịch EN: ${miss.join(", ")}`)
    })
test("cardInfoL (EN): thẻ hỗ trợ, thẻ chiêu chung, lá chiêu đều ra tiếng Anh, công thức đã tính",
    () => {
        const s = mk({
            A: {
                nami: 2
            }, B: {
                t_guard: 2
            }
        })
        const g = gm(s)
        cg.applyCardLocale("en")
        try {
            for (const id of ["basic",
                "gold",
                "item",
                "potion",
                "draw",
                "buff"] as const) {
                const info = cg.cardInfoL(g,
                    g.supportCard(id))
                assert.equal(info.name,
                    cg.SUPPORT_EN[id].name)
                assert.ok(!/[à-ỹ]/i.test(info.name + info.desc),
                    `còn tiếng Việt: ${info.desc}`)
            }
            const w = cg.cardInfoL(g,
                g.newCard({
                    kind: "wild", id: "wild_e"
                }))
            assert.equal(w.name,
                "Wild Skill E")
            const sk = cg.cardInfoL(g,
                g.skillCard("nami",
                    "A",
                    "Q"),
                u(s,
                    "A",
                    "nami"))
            assert.ok(sk.name.includes("Ebb and Flow"),
                sk.name)
            const pot = cg.cardInfoL(g,
                g.supportCard("potion"),
                u(s,
                    "A",
                    "nami"))
            assert.match(pot.desc,
                /\d+ \(150 \+ 10% max HP\)/)
        } finally { cg.applyCardLocale("vi") }
    })
test("eventText: mọi loại sự kiện phát ra trong một ván mẫu đều có câu tiếng Anh, không còn tiếng Việt",
    () => {
        const done = cg.implementedHeroes().map((h) => h.id).filter((id) => cg.HERO_EN[id] && !id.startsWith("t_"))
        const team = done.slice(0,
                5), team2 = [...team].reverse()
        let s = cg.newGame(SEED,
            team,
            team2)
        cg.applyCardLocale("en")
        const all: Ev = []
        let n = 0
        while (s.phase !== "over" && n++ < 600) {
            const side = cg.whoseMove(s)
            const r = cg.applyAction(s,
                cg.chooseAction(s,
                    side))
            all.push(...r.events); s = r.state
            if (s.round > 40) break
        }
        const g = new Game(s)
        const bad: string[] = []
        const types = new Set<string>()
        cg.applyCardLocale("en")
        for (const e of all) {
            types.add(e.t)
            const t = cg.eventText(e,
                g)
            if (t === undefined) bad.push(`${e.t}: không có câu`)
            else if (e.t !== "log" && /[à-ỹ]/i.test(t)) bad.push(`${e.t}: ${t}`)
        }
        cg.applyCardLocale("vi")
        assert.deepEqual(bad.slice(0,
            5),
        [],
        `${all.length} sự kiện, ${types.size} loại`)
    })
test("Các bảng EN đủ khoá: 6 thẻ hỗ trợ, 3 wild, 6 vai",
    () => {
        assert.deepEqual(Object.keys(cg.SUPPORT_EN).sort(),
            ["basic",
                "buff",
                "draw",
                "gold",
                "item",
                "potion"])
        assert.deepEqual(Object.keys(cg.WILD_EN).sort(),
            ["E",
                "Q",
                "R"])
        assert.deepEqual(Object.keys(cg.ROLE_EN).sort(),
            ["assassin",
                "fighter",
                "mage",
                "marksman",
                "support",
                "tank"])
        assert.ok("mushroom" in cg.SPECIAL_EN && "shadow" in cg.SPECIAL_EN)
    })

// ======================================================================
G("Tính ổn định engine")
// ======================================================================
test("Tái lập được: cùng seed + cùng chuỗi hành động bot cho cùng kết quả",
    () => {
        const run = () => {
            let s = cg.newGame(SEED,
                ["darius",
                    "nami",
                    "braum",
                    "zed",
                    "teemo"],
                ["braum",
                    "darius",
                    "nami",
                    "zed",
                    "teemo"])
            let n = 0
            while (s.phase !== "over" && n++ < 400) s = cg.applyAction(s,
                cg.chooseAction(s,
                    cg.whoseMove(s))).state
            return JSON.stringify(s)
        }
        assert.equal(run(),
            run())
    })
test("applyAction không sửa state cũ (immutable)",
    () => {
        const s = mk({
            A: {
                darius: 2
            }, B: {
                t_guard: 2
            }
        })
        const snap = JSON.stringify(s)
        end(s,
            "A")
        assert.equal(JSON.stringify(s),
            snap)
    })
test("Hành động không hợp lệ bị từ chối: sai lượt, lá không có trên tay, tham số sai",
    () => {
        const s = mk({
            A: {
                darius: 2
            }, B: {
                t_guard: 2
            }
        })
        assert.throws(() => act(s,
            {
                t: "end", side: "B"
            }))
        assert.throws(() => act(s,
            {
                t: "play", side: "A", uid: "khong_co"
            }))
        const b = sup(s,
            "basic"); setHand(s,
            "A",
            [b])
        assert.throws(() => play(s,
            "A",
            b,
            {
                actor: "A:darius", target: "B:t_guard"
            }),
        "đấu sĩ không dùng được Đánh thường")
    })
test("Mọi hành động trong legalActions đều áp được (không throw) — ván mẫu 200 bước",
    () => {
        let s = cg.newGame(SEED + 7,
            ["darius",
                "nami",
                "braum",
                "zed",
                "teemo"],
            ["nami",
                "braum",
                "darius",
                "teemo",
                "zed"])
        for (let i = 0; i < 200 && s.phase !== "over"; i++) {
            const side = cg.whoseMove(s)
            const la = cg.legalActions(s,
                side)
            assert.ok(la.length > 0,
                "không có hành động nào")
            for (const a of la.slice(0,
                40)) cg.applyAction(s,
                a)
            s = cg.applyAction(s,
                cg.chooseAction(s,
                    side)).state
        }
    })

// ======================================================================
// Bảng kết quả
// ======================================================================
const pad = (x: string, n: number) => (x.length >= n ? x : x + " ".repeat(n - x.length))
let lastGroup = ""
for (const r of results) {
    if (r.group !== lastGroup) { console.log(`\n== ${r.group} ==`); lastGroup = r.group }
    console.log(`${r.res === "PASS" ? "PASS" : r.res === "FAIL" ? "FAIL" : "SKIP"}  ${pad(r.name,
        110)}${r.note ? `\n        -> ${r.note}` : ""}`)
}
const c = (k: string) => results.filter((r) => r.res === k).length
console.log(`\nTỔNG: ${results.length} test | PASS ${c("PASS")} | FAIL ${c("FAIL")} | SKIP ${c("SKIP")}`)
process.exit(c("FAIL") ? 1 : 0)
