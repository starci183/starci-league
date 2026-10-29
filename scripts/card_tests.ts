// Test tự động luật chế độ thẻ bài (engine + cơ chế đặc trưng từng tướng). Chạy: npx tsx scripts/card_tests.ts [--only=chuỗi] [--verbose]
// Mỗi test dựng tình huống từ seed cố định, gọi engine thật (cg.applyAction...) và assert. In bảng PASS / FAIL / SKIP.
// Test của tướng chưa viết xong (stub todo) tự SKIP. Test lỗi do engine/tướng thì chỉ báo, không sửa code.
import assert from "node:assert/strict"
import {
    spawnSync
} from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import {
    fileURLToPath
} from "node:url"
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
    s.phase = "main"; s.opened = {
        A: true, B: true
    } // bỏ qua bước gọi tướng + tay đầu: test tự dựng tay
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
const end = (s: St, side: "A" | "B") => {
    // kết thúc lượt; lượt mới bắt đầu ở bước gọi tướng: test tự bấm "rút bài" (không gọi thêm tướng)
    const r = act(s,
        {
            t: "end", side: side
        })
    const b = boot(r.s)
    return {
        s: b.s, ev: [...r.ev,
            ...b.ev]
    }
}
/** Qua bước gọi tướng: lượt đầu bắt buộc gọi thì gọi tướng hợp lệ đầu tiên, rồi "rút bài" */
function boot(s0: St): { s: St; ev: Ev } {
    let s = s0
    const ev: Ev = []
    for (let i = 0; i < 6 && s.phase === "summon"; i++) {
        const la = cg.legalActions(s,
            s.active)
        const a = la.find((x) => x.t === "draw") ?? la.find((x) => x.t === "summon")!
        const r = act(s,
            a)
        s = r.s; ev.push(...r.ev)
    }
    return {
        s, ev
    }
}
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
        s = boot(s).s
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
test("Gọi tướng trước, rút sau: gọi tướng đầu tiên xong thì xáo bộ và rút tay đầu RULES.startHand (5) lá, lượt đầu không rút thêm; không còn thẻ chiêu chung",
    () => {
        const s = cg.newGame(SEED,
            TEAM,
            TEAM)
        const r = act(s,
            {
                t: "summon", side: "A", hero: "t_guard", lane: 2
            })
        // vòng 1 chỉ mở đường 3: gọi xong hết chỗ, engine tự sang rút
        assert.equal(r.s.phase,
            "main")
        assert.equal(r.s.players.A.hand.length,
            cg.RULES.startHand)
        assert.ok(!r.s.players.A.hand.some((c) => c.kind === "wild"))
        assert.ok(evs(r.ev,
            "shuffle").length >= 1,
        "xáo bộ sau khi thêm lá của tướng")
        const all = [...r.s.players.A.hand,
            ...r.s.players.A.deck]
        assert.equal(all.length,
            20 + 34)
        const key = (c: cg.Card) => (c.id === "item" ? `item:${c.item}` : c.id.startsWith("spell_") ? `spell:${c.id.slice(6)}` : c.id)
        assert.equal(all.filter((c) => c.uid && !c.hero && cg.DEFAULT_DECK.includes(key(c) as cg.DeckCardId)).length >= 20,
            true)
        assert.ok(s.prizeCards.A.every((c) => c.kind === "support"),
            "lá thưởng không có thẻ chiêu chung")
    })
test("Tay đầu ngẫu nhiên theo seed và có thể chứa lá chiêu của tướng đầu tiên",
    () => {
        const hands = new Set<string>()
        let withSkill = 0
        for (let seed = 1; seed <= 12; seed++) {
            const s = cg.newGame(seed,
                TEAM,
                TEAM)
            const r = act(s,
                {
                    t: "summon", side: "A", hero: "t_guard", lane: 2
                })
            const h = r.s.players.A.hand
            hands.add(h.map((c) => c.id).sort().join(","))
            if (h.some((c) => c.kind === "skill" && c.hero === "t_guard")) withSkill++
        }
        assert.ok(hands.size > 6,
            `tay đầu phải khác nhau theo seed (${hands.size})`)
        assert.ok(withSkill > 0,
            "tay đầu có thể có lá chiêu của tướng vừa gọi")
    })
test("Bước gọi tướng mỗi lượt: gọi rồi bấm rút bài (draw); không gọi được gì thì tự rút; draw chỉ hợp lệ ở bước này",
    () => {
        let s = cg.newGame(SEED,
            TEAM,
            TEAM)
        assert.throws(() => act(s,
            {
                t: "draw", side: "A"
            }),
        "lượt đầu phải gọi tướng trước")
        s = act(s,
            {
                t: "summon", side: "A", hero: "t_guard", lane: 2
            }).s
        assert.throws(() => act(s,
            {
                t: "draw", side: "A"
            }),
        "đã qua bước gọi tướng")
        s = act(s,
            {
                t: "end", side: "A"
            }).s
        assert.equal(s.phase,
            "summon")
        assert.equal(s.active,
            "B")
        assert.equal(s.players.B.hand.length,
            0,
            "B chưa rút gì trước khi gọi tướng")
        s = boot(s).s
        assert.equal(s.players.B.hand.length,
            cg.RULES.startHand)
        s.round = 4
        s = act(s,
            {
                t: "end", side: "B"
            }).s
        // vòng 4 mở đường 2 và 4: A dừng ở bước gọi tướng, có cả summon lẫn draw
        const la = cg.legalActions(s,
            "A")
        assert.equal(s.phase,
            "summon")
        assert.ok(la.some((x) => x.t === "summon") && la.some((x) => x.t === "draw"))
    })
test("Mỗi bên 7 mạng, A đi trước, vòng 1, mở đầu ở bước gọi tướng (phase summon), tay trống",
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
            "summon")
        assert.equal(s.players.A.hand.length + s.players.B.hand.length,
            0)
        assert.ok(cg.legalActions(s,
            "A").every((a) => a.t === "summon"),
        "lượt đầu bắt buộc gọi tướng (chưa được rút)")
    })
test("Rút bài sau khi gọi tướng: lượt đầu A chỉ có tay đầu 5 lá, không lá nào tràn vào mộ",
    () => {
        const s = boot(cg.newGame(SEED,
            TEAM,
            TEAM)).s
        assert.equal(s.players.A.hand.length,
            cg.RULES.startHand)
        assert.equal(s.players.A.grave.length,
            0)
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
test("Hai trợ thủ sống vẫn chỉ rút thêm 1 (3 lá); trợ thủ chết thì quay về 2",
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
        s.players.A.deck.length - 3)
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
test("Gọi tướng xáo 34 lá vào bộ: 6Q 6E 2R (mặc định) + 20 thẻ hỗ trợ của tướng (RULES.heroSupport)",
    () => {
        const s = cg.newGame(SEED,
            TEAM,
            TEAM)
        const before = s.players.A.deck.length
        const r = act(s,
            {
                t: "summon", side: "A", hero: "t_guard", lane: 2
            })
        const pool = [...r.s.players.A.deck,
            ...r.s.players.A.hand]
        assert.equal(pool.length,
            before + 34)
        const mine = pool.filter((c) => (c.kind === "skill" && c.hero === "t_guard") || (c.kind === "support" && !s.players.A.deck.some((x) => x.uid === c.uid)))
        assert.equal(mine.length,
            34)
        const cnt = (f: (c: cg.Card) => boolean) => mine.filter(f).length
        assert.deepEqual(["q",
            "e",
            "r"].map((k) => cnt((c) => c.id === `t_guard_${k}`)),
        [6,
            6,
            2])
        assert.deepEqual(Object.keys(cg.RULES.heroSupport).map((id) => cnt((c) => c.kind === "support" && c.id === id)),
            Object.values(cg.RULES.heroSupport))
        assert.equal(Object.values(cg.RULES.heroSupport).reduce((a, b) => a + (b ?? 0),
            0),
        20)
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
test("Ghép 2 Đồ + 1 Vàng: ra 1 lá đồ huyền thoại lên tay (không đeo ngay); đánh lá đó lên tướng mình thì đeo, cộng chỉ số",
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
        const r0 = act(s,
            {
                t: "craft", side: "A", items: [a.uid,
                    b.uid], gold: gd.uid
            })
        const want = combine("kiem_dai",
            "kiem_dai")!
        assert.deepEqual(u(r0.s,
            "A",
            "darius").items,
        [],
        "ghép xong chưa đeo")
        const legend = r0.s.players.A.hand.find((c) => c.id === "legend")!
        assert.equal(legend.item,
            want)
        assert.deepEqual(r0.s.players.A.hand.map((c) => c.uid).sort(),
            [extra.uid,
                legend.uid].sort())
        assert.ok(cg.cardInfo(gm(r0.s),
            legend).desc.length > 0)
        const r = play(r0.s,
            "A",
            legend,
            {
                target: "A:darius"
            })
        assert.deepEqual(u(r.s,
            "A",
            "darius").items,
        [want])
        assert.deepEqual(r.s.players.A.hand.map((c) => c.uid),
            [extra.uid])
        assert.equal(evs(r.ev,
            "equip").length,
        1)
        assert.ok(gm(r.s).atk(u(r.s,
            "A",
            "darius")) > atk0,
        "AD không tăng")
        assert.equal(evs(r0.ev,
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
                    s.players.A.hand[0].uid], gold: s.players.A.hand[1].uid
            }))
    })
test("Tối đa 3 đồ mỗi tướng: lá đồ huyền thoại không đánh được lên tướng đã đủ 3 món",
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
        const r = act(s,
            {
                t: "craft", side: "A", items: [s.players.A.hand[0].uid,
                    s.players.A.hand[1].uid], gold: s.players.A.hand[2].uid
            })
        const legend = r.s.players.A.hand.find((c) => c.id === "legend")!
        assert.ok(!legalPlays(r.s,
            "A",
            "legend").some((x) => x.args?.target === "A:darius"),
        "Darius đủ 3 món")
        assert.throws(() => play(r.s,
            "A",
            legend,
            {
                target: "A:darius"
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
        const r0 = act(s,
            {
                t: "craft", side: "A", items: [a.uid,
                    b.uid], gold: gd.uid
            })
        const r = play(r0.s,
            "A",
            r0.s.players.A.hand.find((c) => c.id === "legend")!,
            {
                target: d.id
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
// ======================================================================
G("Tướng: Nami")
// ======================================================================
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
test("Teemo Q: xáo 2 Nấm vào bộ bài đối thủ; dưới 30 lá thì xáo 3",
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
        2)
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
        3)
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

G("Tướng: Twisted Fate (chi tiết)")
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
                    b.uid], gold: gd.uid
            })
        assert.equal(d0 - r.s.players.A.deck.length,
            1)
        assert.equal(r.s.players.A.hand.length,
            2,
            "1 lá rút + 1 lá đồ huyền thoại")
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
G("Tướng: Teemo & Soraka (chi tiết)")
test("Teemo: Nấm nổ gây sát thương phép lên tướng ít máu nhất của bên rút, đốt 3 lá; Mùa Nấm đốt 4 lá",
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
        3)
        assert.equal(evs(b.r.ev,
            "burn").length >= 4,
        true,
        "Mùa Nấm: đốt 4 lá")
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
test("Các bảng EN đủ khoá: thẻ hỗ trợ + 8 phép bổ trợ, 3 wild, 6 vai",
    () => {
        assert.deepEqual(Object.keys(cg.SUPPORT_EN).sort(),
            ["basic",
                "buff",
                "draw",
                "gold",
                "item",
                "legend",
                "potion",
                ...cg.SPELLS.map((x) => `spell_${x}`)].sort())
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
// Tướng của nhóm lead (remake): Nami, Viktor, Teemo, Twisted Fate, Renata, Brand
// ======================================================================
G("Tướng: Nami (remake)")
test("Nami Q: rút 2 lá; lá chiêu rút được của tướng mình trên sân thì tướng đó nhận Phước Lành (đòn kế miễn phí)",
    () => {
        needHero("nami",
            "darius")
        let s = mk({
            A: {
                nami: 2, darius: 1
            }, B: {
                t_guard: 2
            }
        })
        const q = skill(s,
            "nami",
            "A",
            "Q")
        setHand(s,
            "A",
            [q])
        setTop(s,
            "A",
            [skill(s,
                "darius",
                "A",
                "Q"),
            sup(s,
                "gold")])
        const r = play(s,
            "A",
            q)
        s = r.s
        assert.equal(s.players.A.hand.length,
            2)
        assert.ok(u(s,
            "A",
            "darius").nextAttack.some((b) => b.id === "nami_bless" && b.free),
        "Darius phải được Phước Lành")
        assert.ok(!u(s,
            "A",
            "nami").nextAttack.length,
        "Nami không rút lá của mình nên không được Phước Lành")
    })
test("Nami R: rút 2 (≤3 mạng thì 4) và mọi tướng mình được Phước Lành",
    () => {
        needHero("nami")
        const s = mk({
            A: {
                nami: 2, t_guard: 1
            }, B: {
                t_guard: 2
            }
        })
        const r = skill(s,
            "nami",
            "A",
            "R")
        setHand(s,
            "A",
            [r])
        const s1 = play(s,
            "A",
            r).s
        assert.equal(s1.players.A.hand.length,
            2)
        assert.ok(u(s1,
            "A",
            "t_guard").nextAttack.some((b) => b.free))
        const s2 = mk({
            A: {
                nami: 2
            }, B: {
                t_guard: 2
            }
        })
        const r2 = skill(s2,
            "nami",
            "A",
            "R")
        setHand(s2,
            "A",
            [r2])
        s2.players.A.lives = 3
        assert.equal(play(s2,
            "A",
            r2).s.players.A.hand.length,
        4)
    })

G("Tướng: Viktor (remake)")
const viktorGrave = (s: St, n: number) => { for (let i = 0; i < n; i++) s.players.A.grave.push(skill(s,
    "viktor",
    "A",
    "E")) }
test("Viktor: bậc = số lá Viktor trong mộ / 2; Q bậc 1 +20% sát thương, bậc 3 rút 1 lá",
    () => {
        needHero("viktor")
        const dmg = (graveN: number) => {
            const s = mk({
                A: {
                    viktor: 2
                }, B: {
                    t_guard: 2
                }
            })
            viktorGrave(s,
                graveN)
            const q = skill(s,
                "viktor",
                "A",
                "Q")
            setHand(s,
                "A",
                [q])
            const r = play(s,
                "A",
                q,
                {
                    target: "B:t_guard"
                })
            return {
                d: dmgTo(r.ev,
                    "B:t_guard"), hand: r.s.players.A.hand.length
            }
        }
        const t0 = dmg(1), t1 = dmg(2), t3 = dmg(6)
        assert.ok(t1.d > t0.d,
            `bậc 1 mạnh hơn: ${t0.d} -> ${t1.d}`)
        assert.equal(t0.hand,
            0)
        assert.equal(t3.hand,
            1,
            "bậc 3 rút 1 lá")
    })
test("Viktor E bậc 2 gây Buốt; bậc 3 dư chấn ngay (2 lần sát thương)",
    () => {
        needHero("viktor")
        const s = mk({
            A: {
                viktor: 2
            }, B: {
                t_guard: 2
            }
        })
        viktorGrave(s,
            9)
        const e = skill(s,
            "viktor",
            "A",
            "E")
        setHand(s,
            "A",
            [e])
        const r = play(s,
            "A",
            e,
            {
                targets: ["B:t_guard"]
            })
        assert.ok(gm(r.s).has(u(r.s,
            "B",
            "t_guard"),
        "chill"))
        assert.equal(evs(r.ev,
            "damage").filter((d) => d.target === "B:t_guard").length,
        2)
    })
test("Viktor: bộ bài mang 8 Q, 7 E, 2 R và 5 Đánh thường (số lá riêng của tướng)",
    () => {
        needHero("viktor")
        const cards = gm(mk()).heroCards("viktor",
            "A")
        const n = (id: string) => cards.filter((c) => c.id === id).length
        assert.equal(n("viktor_q"),
            8)
        assert.equal(n("viktor_e"),
            7)
        assert.equal(n("viktor_r"),
            2)
        assert.equal(n("basic"),
            5)
        assert.equal(n("gold"),
            cg.RULES.heroSupport.gold)
    })

G("Tướng: Teemo (remake)")
test("Teemo E: đặt Nấm lên trên cùng bộ địch; tay địch ≥6 lá thì 2 Nấm; lượt rút kế tiếp của địch nổ ngay",
    () => {
        needHero("teemo")
        let s = mk({
            A: {
                teemo: 2
            }, B: {
                t_guard: 2
            }
        })
        const e = skill(s,
            "teemo",
            "A",
            "E")
        setHand(s,
            "A",
            [e])
        s.players.B.hand = s.players.B.hand.slice(0,
            3)
        s = play(s,
            "A",
            e).s
        assert.equal(s.players.B.deck[0].id,
            "mushroom")
        assert.notEqual(s.players.B.deck[1].id,
            "mushroom")
        const r = end(s,
            "A")
        assert.ok(evs(r.ev,
            "drawAuto").some((d) => d.card.id === "mushroom"),
        "B rút trúng Nấm đầu lượt")
        const s2 = mk({
            A: {
                teemo: 2
            }, B: {
                t_guard: 2
            }
        })
        const e2 = skill(s2,
            "teemo",
            "A",
            "E")
        setHand(s2,
            "A",
            [e2])
        while (s2.players.B.hand.length < 6) s2.players.B.hand.push(sup(s2,
            "gold"))
        const s3 = play(s2,
            "A",
            e2).s
        assert.deepEqual(s3.players.B.deck.slice(0,
            2).map((c) => c.id),
        ["mushroom",
            "mushroom"])
    })

G("Tướng: Twisted Fate (remake)")
test("TF Q: đang cầm lá Vàng thì mạnh thêm 50% (Xanh rút 3, Đỏ thêm 50% sát thương)",
    () => {
        needHero("twistedfate")
        const run = (gold: boolean, color: "blue" | "red") => {
            const s = mk({
                A: {
                    twistedfate: 2
                }, B: {
                    t_guard: 2
                }
            })
            const q = skill(s,
                "twistedfate",
                "A",
                "Q")
            setHand(s,
                "A",
                gold ? [q,
                    sup(s,
                        "gold")] : [q])
            const r = play(s,
                "A",
                q,
                {
                    color
                })
            return {
                drawn: r.s.players.A.hand.length - (gold ? 1 : 0), d: dmgTo(r.ev,
                    "B:t_guard")
            }
        }
        assert.equal(run(false,
            "blue").drawn,
        2)
        assert.equal(run(true,
            "blue").drawn,
        3)
        const a = run(false,
                "red").d, b = run(true,
                "red").d
        assert.ok(Math.abs(b - Math.round(a * 1.5)) <= 1,
            `Đỏ: ${a} -> ${b}`)
    })
test("TF E: lục bộ lấy 1 lá, đồng thời huỷ mọi Nấm của địch trong bộ",
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
            "E")
        setHand(s,
            "A",
            [e])
        const g = gm(s)
        s.players.A.deck.push(g.newCard({
            kind: "special", id: "mushroom", hero: "teemo", side: "B"
        }),
        g.newCard({
            kind: "special", id: "mushroom", hero: "teemo", side: "B"
        }))
        const want = s.players.A.deck.find((c) => c.id === "gold")!
        const r = play(s,
            "A",
            e,
            {
                pick: want.uid
            })
        assert.ok(inHand(r.s,
            "A",
            want))
        assert.equal(r.s.players.A.deck.filter((c) => c.id === "mushroom").length,
            0)
    })
test("TF R: xem tay đối thủ, chọn 1 lá cho họ bỏ; lá Quick thì TF rút 1",
    () => {
        needHero("twistedfate")
        const s = mk({
            A: {
                twistedfate: 2
            }, B: {
                t_spark: 2
            }, teamB: ["t_spark",
                "t_guard",
                "zed",
                "teemo",
                "viktor"]
        })
        const rCard = skill(s,
            "twistedfate",
            "A",
            "R")
        setHand(s,
            "A",
            [rCard])
        const quickCard = skill(s,
            "t_guard",
            "B",
            "Q")
        const gold = sup(s,
            "gold")
        setHand(s,
            "B",
            [quickCard,
                gold])
        const r = play(s,
            "A",
            rCard,
            {
                pick: quickCard.uid
            })
        assert.ok(evs(r.ev,
            "reveal").length === 1)
        assert.ok(!inHand(r.s,
            "B",
            quickCard))
        assert.ok(inHand(r.s,
            "B",
            gold))
        assert.equal(r.s.players.A.hand.length,
            1,
            "bỏ lá Quick thì rút 1")
    })

G("Tướng: Renata (lật kèo)")
test("Renata nội tại Cứu Trợ: đồng minh sắp chết còn 1 máu + status bailout; không hạ ai thì cuối lượt sau của Renata bị hạ",
    () => {
        needHero("renata")
        let s = mk({
            A: {
                renata: 2, t_guard: 1
            }, B: {
                t_spark: 2
            }
        })
        s = toTurn(s,
            "B")
        const g = gm(s)
        const ally = u(s,
            "A",
            "t_guard")
        g.damage(u(s,
            "B",
            "t_spark"),
        ally,
        5000,
        "true",
        {
            tag: "skill"
        })
        assert.equal(ally.status,
            "board")
        assert.equal(ally.hp,
            1)
        assert.ok(g.has(ally,
            "bailout"))
        g.damage(u(s,
            "B",
            "t_spark"),
        ally,
        5000,
        "true",
        {
            tag: "skill"
        })
        assert.equal(ally.status,
            "board",
            "đang Cứu Trợ thì không chết")
        s = end(s,
            "B").s
        assert.equal(u(s,
            "A",
            "t_guard").status,
        "board",
        "vẫn sống trong lượt của Renata")
        s = end(s,
            "A").s
        assert.equal(u(s,
            "A",
            "t_guard").status,
        "dead",
        "hết lượt Renata mà không hạ ai thì bị hạ")
    })
test("Renata Cứu Trợ: hạ gục 1 tướng địch thì gỡ Cứu Trợ và sống tiếp",
    () => {
        needHero("renata")
        let s = mk({
            A: {
                renata: 2, t_spark: 1
            }, B: {
                t_guard: 2
            }
        })
        const g = gm(s)
        const ally = u(s,
            "A",
            "t_spark")
        g.damage(u(s,
            "B",
            "t_guard"),
        ally,
        5000,
        "true",
        {
            tag: "skill"
        })
        assert.ok(g.has(ally,
            "bailout"))
        u(s,
            "B",
            "t_guard").hp = 10
        g.damage(ally,
            u(s,
                "B",
                "t_guard"),
            50,
            "true",
            {
                tag: "skill"
            })
        assert.ok(!g.has(ally,
            "bailout"))
        s = end(s,
            "A").s
        assert.equal(u(s,
            "A",
            "t_spark").status,
        "board")
    })
test("Renata R: mỗi tướng địch đánh thường đồng đội của chính nó; đội Renata ít mạng hơn thì đánh 2 lần",
    () => {
        needHero("renata")
        const run = (behind: boolean) => {
            const s = mk({
                A: {
                    renata: 2
                }, B: {
                    t_guard: 1, t_spark: 2
                }
            })
            if (behind) s.players.A.lives = 3
            setHand(s,
                "B",
                [])
            const r = skill(s,
                "renata",
                "A",
                "R")
            setHand(s,
                "A",
                [r])
            return play(s,
                "A",
                r).ev
        }
        const a1 = evs(run(false),
            "attack")
        assert.equal(a1.length,
            2)
        for (const a of a1) assert.ok(a.attacker.startsWith("B:") && a.target.startsWith("B:") && a.attacker !== a.target)
        assert.equal(evs(run(true),
            "attack").length,
        4)
    })
test("Renata E: Khiên tăng theo máu đã mất; dưới 40% máu thì đòn kế miễn phí",
    () => {
        needHero("renata")
        const s = mk({
            A: {
                renata: 2, t_guard: 1
            }, B: {
                t_spark: 2
            }
        })
        const e = skill(s,
            "renata",
            "A",
            "E")
        setHand(s,
            "A",
            [e])
        u(s,
            "A",
            "t_guard").hp = 300
        setHand(s,
            "B",
            [])
        const r = play(s,
            "A",
            e,
            {
                target: "A:t_guard"
            })
        const sh = evs(r.ev,
            "shield")[0]
        assert.equal(sh.amount,
            Math.round(40 + 0.2 * 700))
        assert.ok(u(r.s,
            "A",
            "t_guard").nextAttack.some((b) => b.free))
    })

G("Tướng: Brand (lửa lan)")
test("Brand Q: +2 Bỏng; mục tiêu đang Bỏng thì Choáng; đầu lượt mục tiêu mất máu theo số stack",
    () => {
        needHero("brand")
        let s = mk({
            A: {
                brand: 2
            }, B: {
                t_guard: 2
            }
        })
        const q1 = skill(s,
                "brand",
                "A",
                "Q"), q2 = skill(s,
                "brand",
                "A",
                "Q")
        setHand(s,
            "A",
            [q1,
                q2])
        setHand(s,
            "B",
            [])
        s = play(s,
            "A",
            q1,
            {
                target: "B:t_guard"
            }).s
        assert.equal(gm(s).statusV(u(s,
            "B",
            "t_guard"),
        "burn"),
        2)
        assert.ok(!gm(s).has(u(s,
            "B",
            "t_guard"),
        "stun"))
        s = play(s,
            "A",
            q2,
            {
                target: "B:t_guard"
            }).s
        assert.equal(gm(s).statusV(u(s,
            "B",
            "t_guard"),
        "burn"),
        4)
        assert.ok(gm(s).has(u(s,
            "B",
            "t_guard"),
        "stun"))
        const r = end(s,
            "A")
        assert.equal(evs(r.ev,
            "damage").filter((d) => d.target === "B:t_guard" && d.tag === "dot").length,
        1)
    })
test("Brand E: chỉ nhắm tướng đang Bỏng; kích nổ toàn bộ stack (sát thương = stack × công thức) rồi gỡ Bỏng",
    () => {
        needHero("brand")
        const s = mk({
            A: {
                brand: 2
            }, B: {
                t_guard: 2, t_spark: 1
            }
        })
        const e = skill(s,
            "brand",
            "A",
            "E")
        setHand(s,
            "A",
            [e])
        assert.equal(legalPlays(s,
            "A",
            "brand_e").length,
        0,
        "không ai Bỏng thì không đánh được E")
        gm(s).status(u(s,
            "B",
            "t_guard"),
        "burn",
        2,
        {
            v: 3
        })
        setHand(s,
            "B",
            [])
        const r = play(s,
            "A",
            e,
            {
                target: "B:t_guard"
            })
        assert.ok(!gm(r.s).has(u(r.s,
            "B",
            "t_guard"),
        "burn"))
        assert.equal(gm(r.s).statusV(u(r.s,
            "B",
            "t_spark"),
        "burn"),
        2,
        "nổ ≥3 stack thì tướng kề đường nhận 2 Bỏng")
    })
test("Brand: tướng đang Bỏng bị hạ thì Bỏng lan sang tướng địch kề đường",
    () => {
        needHero("brand")
        const s = mk({
            A: {
                brand: 2
            }, B: {
                t_guard: 2, t_spark: 1
            }
        })
        const g = gm(s)
        const t = u(s,
            "B",
            "t_guard")
        g.status(t,
            "burn",
            2,
            {
                v: 4
            })
        g.damage(u(s,
            "A",
            "brand"),
        t,
        5000,
        "true",
        {
            tag: "skill"
        })
        assert.equal(t.status,
            "dead")
        assert.equal(g.statusV(u(s,
            "B",
            "t_spark"),
        "burn"),
        4)
    })

G("Engine bổ sung (30 tướng)")
test("Tàng hình: tướng có stealth không bị chọn bởi chiêu 1 mục tiêu / đòn đánh",
    () => {
        const s = mk({
            A: {
                t_spark: 2
            }, B: {
                t_guard: 2, braum: 1
            }
        })
        gm(s).status(u(s,
            "B",
            "t_guard"),
        "stealth",
        1)
        const q = skill(s,
            "t_spark",
            "A",
            "Q")
        setHand(s,
            "A",
            [q])
        const targets = legalPlays(s,
            "A").map((a) => a.args?.target)
        assert.ok(!targets.includes("B:t_guard") && targets.includes("B:braum"))
    })
test("Ngắt chuỗi: mắt xích có người tung bị Choáng lúc giải quyết thì bị huỷ",
    () => {
        cg.defineHero({
            id: "t_stunner", name: "TestStunner", role: "tank", damage: "physical", hp: 1000, atk: 50, armor: 30, mr: 30,
            passive: {
                name: "-", desc: "-"
            },
            skills: {
                Q: {
                    key: "Q", name: "Stun Quick", desc: "-", target: "none", quick: true, chainOnly: true, quickWhen: (c) => c.trigger.side !== c.side, resolve: (c) => { const a = c.g.unit(c.trigger?.actor); if (a) c.g.status(a,
                        "stun",
                        1) }
                },
                E: {
                    key: "E", name: "-", desc: "-", target: "none", canPlay: () => false, resolve: () => {}
                },
                R: {
                    key: "R", name: "-", desc: "-", target: "none", canPlay: () => false, resolve: () => {}
                },
            },
        })
        let s = mk({
            A: {
                t_spark: 2
            }, B: {
                t_stunner: 2
            }, teamB: ["t_stunner",
                "braum",
                "zed",
                "teemo",
                "viktor"]
        })
        const q = skill(s,
            "t_spark",
            "A",
            "Q")
        setHand(s,
            "A",
            [q])
        const sq = skill(s,
            "t_stunner",
            "B",
            "Q")
        setHand(s,
            "B",
            [sq])
        s = play(s,
            "A",
            q,
            {
                target: "B:t_stunner"
            }).s
        assert.equal(s.phase,
            "chain")
        const r = act(s,
            {
                t: "chain", side: "B", uid: sq.uid, args: {
                }
            })
        assert.equal(dmgTo(r.ev,
            "B:t_stunner"),
        0,
        "lá gốc bị huỷ")
        assert.ok(inGrave(r.s,
            "A",
            q),
        "lá bị huỷ vẫn vào mộ")
    })
test("Không thể nối chuỗi (uncounterable): đối thủ có lá Quick cũng không mở chuỗi",
    () => {
        cg.defineHero({
            id: "t_unstop", name: "TestUnstop", role: "fighter", damage: "magic", hp: 1000, atk: 50, armor: 30, mr: 30,
            passive: {
                name: "-", desc: "-"
            },
            skills: {
                Q: {
                    key: "Q", name: "-", desc: "-", target: "enemy", uncounterable: true, resolve: (c) => { c.g.damage(c.self,
                        c.target!,
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
        const s = mk({
            A: {
                t_unstop: 2
            }, B: {
                t_guard: 2
            }
        })
        const q = skill(s,
            "t_unstop",
            "A",
            "Q")
        setHand(s,
            "A",
            [q])
        setHand(s,
            "B",
            [skill(s,
                "t_guard",
                "B",
                "Q")])
        const r = play(s,
            "A",
            q,
            {
                target: "B:t_guard"
            })
        assert.equal(r.s.phase,
            "main")
        assert.equal(dmgTo(r.ev,
            "B:t_guard"),
        50)
    })
test("Kiệt Tác: stack itemAmp nhân chỉ số từ đồ",
    () => {
        const s = mk({
            A: {
                t_spark: 2
            }
        })
        const a = u(s,
            "A",
            "t_spark")
        a.items.push(combine("kiem_dai",
            "kiem_dai")!)
        const g = gm(s)
        const base = g.stats(a).atk
        a.stacks.itemAmp = 50
        assert.equal(Math.round(g.stats(a).atk),
            Math.round(base * 1.5))
    })
test("Dấu mốc trên đường: addMarker/markersAt/removeMarker phát sự kiện marker",
    () => {
        const s = mk({
        })
        const g = gm(s)
        g.addMarker("A",
            2,
            "dagger")
        g.addMarker("A",
            2,
            "dagger")
        assert.deepEqual(g.markersAt("A",
            2),
        ["dagger",
            "dagger"])
        assert.ok(g.removeMarker("A",
            2,
            "dagger"))
        assert.equal(g.markersAt("A",
            2).length,
        1)
        assert.ok(!g.removeMarker("B",
            2,
            "dagger"))
        assert.equal(g.events.filter((e) => e.t === "marker").length,
            3)
    })
test("Bản đồ đội hình: mọi tướng đã viết có engine, ≥2 combo, ≥1 kẻ khắc và khắc ≥1 tướng; tên đều tồn tại",
    () => {
        const ids = new Set(cg.implementedHeroes().filter((h) => !h.id.startsWith("t_")).map((h) => h.id))
        for (const id of ids) {
            const sy = cg.SYNERGY[id]
            assert.ok(sy,
                `thiếu SYNERGY cho ${id}`)
            assert.ok(sy.engines.length >= 1 && sy.combos.length >= 2 && sy.counteredBy.length >= 1,
                `${id}: thiếu engine/combo/khắc`)
            assert.ok(cg.countersOf(id).length >= 1,
                `${id} không khắc ai`)
            for (const x of [...sy.combos,
                ...sy.counteredBy]) assert.ok(ids.has(x),
                `${id}: tên lạ ${x}`)
        }
    })

test("Token ở ô phụ: chỉ đòn đánh của xạ thủ nhắm được; chiêu 1 mục tiêu thì không",
    () => {
        needHero("teemo")
        const s = mk({
            A: {
                teemo: 2, t_spark: 1
            }, B: {
                t_guard: 2
            }
        })
        const tok = gm(s).summonToken("B",
            {
                id: "dummy", name: "Dummy", hp: 100
            })
        setHand(s,
            "A",
            [sup(s,
                "basic"),
            skill(s,
                "t_spark",
                "A",
                "Q")])
        const plays = legalPlays(s,
            "A")
        assert.ok(plays.some((a) => a.args?.actor === "A:teemo" && a.args?.target === tok.id),
            "xạ thủ đánh được token")
        assert.ok(!plays.some((a) => a.args?.actor !== "A:teemo" && a.args?.target === tok.id),
            "chiêu đơn mục tiêu không chọn được token")
    })
test("Token úp mặt: lật khi rời sân (tokenFlip lộ secret); token tự hết hạn sau N lượt của chủ",
    () => {
        const s = mk({
            A: {
                t_guard: 2
            }
        })
        const g = gm(s)
        const tok = g.summonToken("A",
            {
                id: "keg", name: "Keg", hp: 50, hidden: true, secret: {
                    real: 1
                }, turns: 2
            })
        assert.ok(tok.token?.hidden)
        g.removeToken(tok,
            "dead")
        const flip = g.events.find((e) => e.t === "tokenFlip") as Extract<cg.GameEvent, { t: "tokenFlip" }> | undefined
        assert.equal(flip?.secret?.real,
            1)
        let s2 = mk({
            A: {
                t_guard: 2
            }
        })
        const t2 = gm(s2).summonToken("A",
            {
                id: "x", name: "X", hp: 50, turns: 2
            })
        s2 = end(s2,
            "A").s
        assert.equal(s2.units[t2.id]?.status,
            "board",
            "còn sau lượt 1")
        s2 = end(s2,
            "B").s
        const r = end(s2,
            "A")
        assert.ok(!r.s.units[t2.id],
            "hết hạn cuối lượt thứ 2 của chủ")
        assert.ok(evs(r.ev,
            "tokenEnd").some((e) => e.reason === "expired"))
    })
test("Số lá chiêu theo tướng: ngoài khoảng Q 3..10 / E 3..10 / R 1..3 thì defineHero báo lỗi",
    () => {
        const mkHero = (id: string, copies: Partial<Record<"Q" | "E" | "R", number>>) => () => cg.defineHero({
            id, name: id, role: "fighter", damage: "physical", hp: 100, atk: 10, armor: 0, mr: 0, skillCopies: copies,
            passive: {
                name: "-", desc: "-"
            },
            skills: {
                Q: {
                    key: "Q", name: "-", desc: "-", target: "none", resolve: () => {}
                },
                E: {
                    key: "E", name: "-", desc: "-", target: "none", resolve: () => {}
                },
                R: {
                    key: "R", name: "-", desc: "-", target: "none", resolve: () => {}
                },
            },
        })
        assert.throws(mkHero("t_bad1",
            {
                Q: 11
            }))
        assert.throws(mkHero("t_bad2",
            {
                R: 0
            }))
        assert.throws(mkHero("t_bad3",
            {
                E: 2
            }))
        mkHero("t_ok_copies",
            {
                Q: 3, E: 10, R: 3
            })()
        const cards = gm(mk()).heroCards("t_ok_copies",
            "A")
        assert.equal(cards.filter((c) => c.id === "t_ok_copies_q").length,
            3)
        assert.equal(cards.filter((c) => c.id === "t_ok_copies_e").length,
            10)
        assert.equal(cards.filter((c) => c.id === "t_ok_copies_r").length,
            3)
    })
test("Bộ gốc tự xếp: newGameEx dùng đúng 20 lá (mảnh Đồ chỉ định); bộ sai thì dùng DEFAULT_DECK",
    () => {
        const deck: cg.DeckCardId[] = [...Array<cg.DeckCardId>(8).fill("basic"),
            ...Array<cg.DeckCardId>(4).fill("gold"),
            "item:kiem_dai",
            "item:kiem_dai",
            "item:cung_go",
            "item:cung_go",
            "draw",
            "draw",
            "spell:heal",
            "spell:smite"]
        assert.equal(cg.validateDeck(deck),
            null)
        const s = cg.newGameEx(SEED,
            TEAM,
            TEAM,
            {
                A: deck, B: ["basic"] as cg.DeckCardId[]
            }).state
        const all = (side: "A" | "B") => [...s.players[side].deck,
            ...s.players[side].hand.filter((c) => c.kind === "support")]
        assert.equal(all("A").length,
            20)
        assert.deepEqual([...new Set(all("A").filter((c) => c.id === "item").map((c) => c.item))].sort(),
            ["cung_go",
                "kiem_dai"])
        assert.equal(all("A").filter((c) => c.id === "basic").length,
            8)
        assert.equal(all("B").length,
            cg.DEFAULT_DECK.length,
            "bộ sai -> DEFAULT_DECK")
        assert.equal(all("A").filter((c) => c.id === "spell_smite").length,
            1)
    })

G("Phép bổ trợ (thẻ hỗ trợ)")
const spellCard = (s: St, id: string) => gm(s).supportCard(`spell_${id}`)
test("Hồi Máu / Lá Chắn / Thanh Tẩy: hồi 150 + 10% máu tối đa, Khiên 120 + 10%, gỡ khống chế",
    () => {
        const s = mk({
            A: {
                t_guard: 2
            }, B: {
                t_spark: 2
            }
        })
        const a = u(s,
            "A",
            "t_guard")
        a.hp = 500
        const heal = spellCard(s,
                "heal"), bar = spellCard(s,
                "barrier"), cl = spellCard(s,
                "cleanse")
        setHand(s,
            "A",
            [heal,
                bar,
                cl])
        setHand(s,
            "B",
            [])
        gm(s).status(a,
            "silence",
            2)
        let r = play(s,
            "A",
            heal,
            {
                target: a.id
            })
        assert.equal(u(r.s,
            "A",
            "t_guard").hp,
        500 + 150 + 100)
        r = play(r.s,
            "A",
            bar,
            {
                target: a.id
            })
        assert.equal(u(r.s,
            "A",
            "t_guard").shield,
        120 + 100)
        r = play(r.s,
            "A",
            cl,
            {
                target: a.id
            })
        assert.ok(!gm(r.s).has(u(r.s,
            "A",
            "t_guard"),
        "silence"))
        assert.ok(!r.s.players.A.grave.some((c) => c.id.startsWith("spell_")),
            "phép dùng xong biến mất")
    })
test("Thiêu Đốt: mất 50 máu đầu lượt của mục tiêu, hồi máu giảm nửa; Kiệt Sức: gây ít hơn 40% sát thương",
    () => {
        let s = mk({
            A: {
                t_guard: 2
            }, B: {
                t_spark: 2
            }
        })
        const ig = spellCard(s,
                "ignite"), ex = spellCard(s,
                "exhaust")
        setHand(s,
            "A",
            [ig,
                ex])
        setHand(s,
            "B",
            [])
        s = play(s,
            "A",
            ig,
            {
                target: "B:t_spark"
            }).s
        s = play(s,
            "A",
            ex,
            {
                target: "B:t_spark"
            }).s
        const g = gm(s)
        const t = u(s,
            "B",
            "t_spark")
        t.hp = 500
        assert.equal(g.heal(undefined,
            t,
            100),
        50)
        assert.ok(g.has(t,
            "grievous"),
        "Thiêu Đốt kèm Vết Thương Sâu")
        const sh0 = t.shield
        g.shield(undefined,
            t,
            100)
        assert.equal(t.shield - sh0,
            50,
            "Vết Thương Sâu: Khiên giảm 50%")
        const dealt = g.damage(t,
            u(s,
                "A",
                "t_guard"),
            100,
            "true",
            {
                tag: "skill"
            })
        assert.equal(dealt,
            Math.round(100 * (1 + cg.RULES.mageSkillBonus) * 0.6),
            "pháp sư +25%, Kiệt Sức -40%")
        const r = end(s,
            "A")
        assert.ok(evs(r.ev,
            "damage").some((d) => d.target === "B:t_spark" && d.amount === 50 && d.tag === "dot"))
    })
test("Trừng Phạt chỉ nhắm vật triệu hồi ở ô phụ địch (400 sát thương chuẩn); Tốc Biến dời sang đường trống; Dịch Chuyển đưa tướng đang chết về sân 50% máu",
    () => {
        const s = mk({
            A: {
                t_guard: 2, t_spark: 1
            }, B: {
                t_spark: 2
            }
        })
        setHand(s,
            "B",
            [])
        const sm = spellCard(s,
                "smite"), fl = spellCard(s,
                "flash"), tp = spellCard(s,
                "teleport")
        setHand(s,
            "A",
            [sm,
                fl,
                tp])
        assert.equal(legalPlays(s,
            "A",
            "spell_smite").length,
        0,
        "không có token thì không Trừng Phạt được")
        const tok = gm(s).summonToken("B",
            {
                id: "dummy", name: "Dummy", hp: 300
            })
        let r = play(s,
            "A",
            sm,
            {
                target: tok.id
            })
        assert.ok(!r.s.units[tok.id],
            "token bị phá")
        r = play(r.s,
            "A",
            fl,
            {
                target: "A:t_spark", lane: 3
            })
        assert.equal(u(r.s,
            "A",
            "t_spark").lane,
        3)
        gm(r.s).kill(u(r.s,
            "A",
            "t_spark"))
        r = play(r.s,
            "A",
            tp,
            {
                target: "A:t_spark", lane: 4
            })
        const back = u(r.s,
            "A",
            "t_spark")
        assert.equal(back.status,
            "board")
        assert.equal(back.lane,
            4)
        assert.equal(back.hp,
            Math.round(back.maxHp / 2))
    })
test("Nguồn trạng thái: status ghi src (tướng) và card (lá) đang giải quyết",
    () => {
        needHero("brand")
        const s = mk({
            A: {
                brand: 2
            }, B: {
                t_guard: 2
            }
        })
        const q = skill(s,
            "brand",
            "A",
            "Q")
        setHand(s,
            "A",
            [q])
        setHand(s,
            "B",
            [])
        const r = play(s,
            "A",
            q,
            {
                target: "B:t_guard"
            })
        const st = u(r.s,
            "B",
            "t_guard").statuses.burn
        assert.equal(st?.src,
            "A:brand")
        assert.equal(st?.card,
            "brand_q")
        assert.ok(evs(r.ev,
            "status").some((e) => e.id === "burn" && e.card === "brand_q"))
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
console.log(`\nTỔNG (lõi + nhóm lead): ${results.length} test | PASS ${c("PASS")} | FAIL ${c("FAIL")} | SKIP ${c("SKIP")}`)
// Test chữ ký của các nhóm tướng khác: scripts/card_tests_g*.ts (chạy riêng từng file, gộp tổng)
let total = results.length, pass = c("PASS"), fail = c("FAIL")
if (!only) {
    const dir = path.dirname(fileURLToPath(import.meta.url))
    for (const f of fs.readdirSync(dir).filter((x) => /^card_tests_g\d+\.ts$/.test(x)).sort()) {
        const r = spawnSync(process.execPath,
            ["--import",
                "tsx",
                path.join(dir,
                    f)],
            {
                encoding: "utf8"
            })
        const out = `${r.stdout ?? ""}`
        const m = /TỔNG: (\d+) test \| PASS (\d+) \| FAIL (\d+)/.exec(out)
        if (!m) { console.log(`\n${f}: không đọc được kết quả (mã ${r.status})\n${(r.stderr ?? "").slice(0,
            2000)}`); fail++; continue }
        total += Number(m[1]); pass += Number(m[2]); fail += Number(m[3])
        console.log(`${f}: ${m[1]} test | PASS ${m[2]} | FAIL ${m[3]}`)
        if (Number(m[3])) console.log(out.split("\n").filter((l) => l.startsWith("FAIL") || l.includes("->")).join("\n"))
    }
}
console.log(`\nTỔNG: ${total} test | PASS ${pass} | FAIL ${fail}`)
process.exit(fail ? 1 : 0)
