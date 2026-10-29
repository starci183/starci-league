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
import {
    KEYWORDS
} from "../packages/shared/src/cardgame/keywords"

/** Bộ đầy đủ của một bên: bộ gốc + lá chiêu của 5 tướng (đọc từ RULES, không ghi cứng) */
const FULL_DECK = cg.RULES.sharedDeckSize + 5 * (cg.RULES.skillCopies.Q + cg.RULES.skillCopies.E + cg.RULES.skillCopies.R)
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
    s.players.A.hand = []; s.players.B.hand = []
    s.phase = "main"; s.opened = {
        A: true, B: true
    }
    s.firstTurnDone = {
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
/** Bước gọi tướng úp đầu vòng (V2): chốt hết (tướng bắt buộc thì chọn tướng hợp lệ đầu tiên); test không muốn gọi thêm */
function skipBlind(r0: { s: St; ev: Ev }): { s: St; ev: Ev } {
    let s = r0.s
    const ev: Ev = [...r0.ev]
    for (let i = 0; i < 40 && s.phase === "blind"; i++) {
        const side = cg.actorsOf(s)[0]
        const la = cg.legalActions(s,
            side)
        const a = la.find((x) => x.t === "ready") ?? la.find((x) => x.t === "summon")!
        const r = cg.applyAction(s,
            a)
        s = r.state
        ev.push(...r.events)
    }
    return {
        s, ev
    }
}
const end = (s: St, side: "A" | "B") => {
    // kết thúc lượt; lượt mới bắt đầu ở bước gọi tướng: test tự bấm "rút bài" (không gọi thêm tướng)
    const r = skipBlind(act(s,
        {
            t: "end", side: side
        }))
    const b = boot(r.s)
    return {
        s: b.s, ev: [...r.ev,
            ...b.ev]
    }
}
/** Qua bước gọi tướng: lượt đầu bắt buộc gọi thì gọi tướng hợp lệ đầu tiên, rồi "rút bài" */
function boot(s0: St): { s: St; ev: Ev } {
    const b0 = skipBlind({
        s: s0, ev: []
    })
    let s = b0.s
    const ev: Ev = [...b0.ev]
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
test("V3: mỗi mốc RULES.summonRounds (1, 4, 8, 13, 19) mở đúng 1 đường theo RULES.laneOrder, tới đủ 5",
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
        while (s.round < 9 && guard++ < 80) { s = end(s,
            s.active).s; if (!seen.has(s.round)) seen.set(s.round,
            open(s)); if (s.phase === "over") break }
        for (const [rd,
            lanes] of seen) assert.deepEqual([...lanes].sort(),
            cg.RULES.laneOrder.slice(0,
                cg.RULES.summonRounds.filter((r) => r <= rd).length).sort(),
            `vòng ${rd}`)
        assert.deepEqual(seen.get(1),
            [2],
            "vòng 1: chỉ đường giữa")
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
test("V2: tay đầu RULES.startHand (5) có ngay ở đầu ván, trước khi gọi tướng; gọi xong không rút thêm; bộ 170 lá không xáo thêm khi gọi",
    () => {
        const s = cg.newGame(SEED,
            TEAM,
            TEAM)
        assert.equal(s.players.A.hand.length,
            cg.RULES.startHand)
        const total0 = s.players.A.hand.length + s.players.A.deck.length
        const r = skipBlind({
            s, ev: []
        })
        assert.equal(r.s.phase,
            "main")
        assert.equal(r.s.players.A.hand.length,
            cg.RULES.startHand)
        assert.ok(!r.s.players.A.hand.some((c) => c.kind === "wild"))
        assert.equal(r.s.players.A.hand.length + r.s.players.A.deck.length,
            total0,
            "gọi tướng không thêm lá")
        assert.equal(total0,
            FULL_DECK)
        assert.ok(s.prizeCards.A.every((c) => c.kind === "support"),
            "lá thưởng không có thẻ chiêu chung")
    })
test("Tay đầu ngẫu nhiên theo seed và có thể chứa lá chiêu của mọi tướng trong đội (bộ 170 lá có đủ từ đầu)",
    () => {
        const hands = new Set<string>()
        let withSkill = 0
        for (let seed = 1; seed <= 12; seed++) {
            const h = cg.newGame(seed,
                TEAM,
                TEAM).players.A.hand
            hands.add(h.map((c) => c.id).sort().join(","))
            if (h.some((c) => c.kind === "skill")) withSkill++
        }
        assert.ok(hands.size > 6,
            `tay đầu phải khác nhau theo seed (${hands.size})`)
        assert.ok(withSkill > 0,
            "tay đầu có thể có lá chiêu")
    })
test("Mỗi bên 7 mạng, A đi trước, vòng 1, mở đầu ở bước gọi tướng úp (phase blind), tay đầu đã có",
    () => {
        const s = cg.newGame(SEED,
            TEAM,
            TEAM)
        assert.equal(s.players.A.lives,
            7)
        assert.equal(s.players.B.lives,
            7)
        assert.equal(s.active,
            "A")
        assert.equal(s.round,
            1)
        assert.equal(s.phase,
            "blind")
        assert.equal(s.players.A.hand.length,
            cg.RULES.startHand)
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
test("Rút đúng RULES.drawPerTurn (1) lá mỗi lượt",
    () => {
        assert.equal(cg.RULES.drawPerTurn,
            1)
        let s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }
        })
        s = end(s,
            "A").s
        const r = end(s,
            "B")
        assert.equal(r.s.players.A.deck.length,
            s.players.A.deck.length - cg.RULES.drawPerTurn)
    })
test("Trợ thủ trên sân KHÔNG còn cho rút thêm mỗi lượt",
    () => {
        needHero("soraka")
        let s = mk({
            A: {
                nami: 2, soraka: 1
            }, B: {
                braum: 2
            }
        })
        s = end(s,
            "A").s
        const r = end(s,
            "B")
        assert.equal(r.s.players.A.deck.length,
            s.players.A.deck.length - cg.RULES.drawPerTurn)
    })
test("V2: gọi Trợ thủ ra sân: chủ lấy 1 Q + 1 E của nó từ bộ lên tay (một lần); gọi tướng vai khác thì không",
    () => {
        const s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }, teamA: ["darius",
                "nami",
                "zed",
                "teemo",
                "viktor"]
        })
        setHand(s,
            "A",
            [])
        const g = gm(s)
        g.summon("A",
            "nami",
            1)
        assert.deepEqual(s.players.A.hand.map((c) => c.id).sort(),
            ["nami_e",
                "nami_q"])
        assert.equal(g.events.filter((e) => e.t === "draw" && e.side === "A").length,
            2)
        g.summon("A",
            "zed",
            3)
        assert.equal(s.players.A.hand.length,
            2)
    })
// ======================================================================
G("Lá chiêu, thẻ hỗ trợ, bộ bài tướng")
// ======================================================================
test("V2: bộ bài 170 lá ngay từ đầu: mỗi tướng đúng 8Q 8E 2R, không thẻ hỗ trợ riêng của tướng",
    () => {
        const s = cg.newGame(SEED,
            TEAM,
            TEAM)
        const pool = [...s.players.A.deck,
            ...s.players.A.hand]
        assert.equal(pool.length,
            FULL_DECK)
        for (const h of TEAM) {
            const n = (k: string) => pool.filter((c) => c.kind === "skill" && c.id === `${h}_${k}`).length
            assert.deepEqual(["q",
                "e",
                "r"].map(n),
            [cg.RULES.skillCopies.Q,
                cg.RULES.skillCopies.E,
                cg.RULES.skillCopies.R])
        }
        assert.equal(pool.filter((c) => c.kind !== "skill").length,
            cg.RULES.sharedDeckSize)
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
test("Bình Máu hồi RULES.potion (base + % máu tối đa, tối đa tới máu đầy)",
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
        100 + Math.round(cg.RULES.potion.base + cg.RULES.potion.pctMax * d.maxHp))
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
test("Bổ Trợ: +20% sát thương và Khiên RULES.buffCard.shield tới hết lượt đối thủ",
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
        cg.RULES.buffCard.shield)
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
test("Bộ đã hết mà tới bước rút đầu lượt thì thua",
    () => {
        const s = mk({
            A: {
                darius: 2
            }, B: {
                braum: 2
            }
        })
        s.players.A.deck = s.players.A.deck.slice(0,
            0)
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
test("V2: tướng bị hạ GIỮ đường (xám, đếm ngược), hồi sinh đúng đường cũ sau RULES.respawnRounds vòng, đầy máu, còn nguyên đồ",
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
        s.round = 5
        s = toTurn(s,
            "A")
        gm(s).kill(b,
            u(s,
                "A",
                "darius"))
        assert.equal(b.status,
            "dead")
        assert.equal(b.respawnRound,
            5 + cg.RULES.respawnRounds)
        assert.equal(s.lanes.B[2],
            b.id,
            "đường vẫn giữ chỗ")
        const st: string[] = []
        while (s.round < 12 && s.phase === "main") {
            s = end(s,
                s.active).s
            if (s.active === "B") {
                st.push(`${s.round}:${u(s,
                    "B",
                    "braum").status}`)
                if (u(s,
                    "B",
                    "braum").status === "board") break
            }
        }
        const R = cg.RULES.respawnRounds
        assert.deepEqual(st.slice(0,
            R + 1),
        [...Array.from({
            length: R
        },
        (_, i) => `${5 + i}:dead`),
        `${5 + R}:board`])
        const r = u(s,
            "B",
            "braum")
        assert.equal(r.lane,
            2)
        assert.equal(s.lanes.B[2],
            r.id)
        assert.equal(r.hp,
            r.maxHp)
        assert.equal(r.items.length,
            1)
    })
test("V2: hồi sinh có phát sự kiện respawn; đường của tướng chết không gọi được tướng khác vào",
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
        assert.ok(!gm(s).emptyLanes("B").includes(2),
            "đường giữ chỗ cho tướng đã chết")
        s.round = 8
        s = toTurn(s,
            "A")
        const r = end(s,
            "A")
        assert.equal(evs(r.ev,
            "respawn").length,
        1)
        assert.equal(u(r.s,
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
        assert.equal(s.lanes.B[2],
            b.id,
            "tướng chết giữ đường")
        assert.deepEqual([b.shield,
            Object.keys(b.statuses).length,
            b.deaths,
            s.players.B.lives,
            s.stats.A.kills],
        [0,
            0,
            1,
            6,
            1])
    })

// ======================================================================
G("Luật đánh thường theo vai")
// ======================================================================
test("V2: Đấu sĩ KHÔNG tự đánh cuối lượt; chơi được lá Đánh thường",
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
        assert.ok(legalPlays(s,
            "A",
            "basic").length > 0,
        "đấu sĩ dùng được lá Đánh thường")
        const r0 = end(s,
            "A")
        assert.equal(dmgTo(r0.ev,
            "B:braum",
            "attack"),
        0,
        "không còn tự đánh cuối lượt")
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
test("Sát thủ: Đánh thường lên tướng cùng đường, RULES.roleAttack.assassin × AD",
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
                cg.RULES.roleAttack.assassin))
        assert.equal(cg.RULES.roleAttack.assassin,
            1.25,
            "V3: Sát thủ 1.25× AD, mọi vai khác 1×")
        assert.ok(Object.entries(cg.RULES.roleAttack).every(([r,
            m]) => r === "assassin" || m === 1))
        assert.ok(got > 1.2 * expectDmg(s,
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
test("Xạ thủ: Đánh thường lên tướng nào cũng được (khác đường), RULES.roleAttack.marksman × AD",
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
            cg.RULES.roleAttack.marksman))
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
            cg.RULES.roleAttack.assassin))
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
test("V2: cuối lượt đấu sĩ không có đòn tự đánh nào mở chuỗi",
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
// Bổ sung cơ chế từng tướng (đi sâu hơn: điều kiện của chiêu, nội tại)
// ======================================================================
G("Tướng: Teemo & Soraka (chi tiết)")
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
test("Từ khoá: không có 2 từ khoá trùng tên hiển thị (VI hoặc EN) vì RichText khớp theo tên",
    () => {
        for (const lang of ["vi",
            "en"] as const) {
            const seen = new Map<string, string>()
            for (const [id,
                k] of Object.entries(KEYWORDS)) {
                const prev = seen.get(k[lang])
                assert.ok(!prev,
                    `${lang} "${k[lang]}": ${prev} và ${id}`)
                seen.set(k[lang],
                    id)
            }
        }
        // Buốt là của Ashe (frost); trạng thái chung chill không còn là từ khoá
        assert.equal(KEYWORDS.frost?.vi,
            "Buốt")
        assert.equal(KEYWORDS.chill,
            undefined)
    })
test("Trạng thái/bộ đếm V2 có đủ tên + mô tả VI/EN; STATUS_EN/STACK_EN/SPECIAL_EN đã gộp V2",
    () => {
        for (const [id,
            t] of [...Object.entries(cg.STATUS_V2),
                ...Object.entries(cg.STACK_V2),
                ...Object.entries(cg.SPECIAL_V2)]) {
            assert.ok(t.vi.name && t.vi.desc && t.en.name && t.en.desc,
                id)
        }
        for (const id of Object.keys(cg.STATUS_V2)) assert.equal(cg.STATUS_EN[id]?.name,
            cg.STATUS_V2[id].en.name)
        for (const id of Object.keys(cg.STACK_V2)) assert.equal(cg.STACK_EN[id],
            cg.STACK_V2[id].en.name)
        // tướng thử của file test (t_*) không cần bản dịch
        assert.deepEqual(cg.missingTranslations().filter((id) => !id.startsWith("t_")),
            [])
        assert.equal(Object.keys(cg.HERO_EN).length,
            cg.implementedHeroes().filter((h) => !h.id.startsWith("t_")).length)
    })
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
                // lá mảnh đồ: "Component: <tên mảnh>"
                assert.ok(info.name.startsWith(cg.SUPPORT_EN[id].name),
                    info.name)
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
                new RegExp(String.raw`\d+ \(${cg.RULES.potion.base} \+ 10% max HP\)`))
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
test("Chữ tướng/đồ/phép (VI + EN) không lộ số thực dài kiểu 2.1999999999999997",
    () => {
        const bad: string[] = []
        const check = (where: string, t: string | undefined) => { if (t && /\d\.\d{4,}/.test(t)) bad.push(`${where}: ${t}`) }
        for (const h of cg.implementedHeroes()) {
            check(`${h.id} passive`,
                h.passive.desc)
            for (const k of ["Q",
                "E",
                "R"] as const) check(`${h.id} ${k}`,
                h.skills[k]?.desc)
            const en = cg.HERO_EN[h.id]
            if (!en) continue
            check(`${h.id} passive EN`,
                en.passive.desc)
            for (const k of ["Q",
                "E",
                "R"] as const) check(`${h.id} ${k} EN`,
                en.skills[k]?.desc)
        }
        for (const id of Object.keys(cg.CARD_ITEMS)) {
            for (const lang of ["vi",
                "en"] as const) {
                const t = cg.itemText(id,
                    lang)
                check(`${id} ${lang}`,
                    `${t?.stats} ${t?.desc}`)
            }
        }
        for (const sp of cg.SPELLS) check(`spell ${sp}`,
            cg.SPELL_VI[sp].desc)
        assert.deepEqual(bad.slice(0,
            5),
        [])
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
                "mana",
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
        assert.ok("mushroom" in cg.SPECIAL_EN && "pick_card" in cg.SPECIAL_EN)
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
        assert.doesNotThrow(() => play(s,
            "A",
            b,
            {
                actor: "A:darius", target: "B:t_guard"
            }),
        "V2: đấu sĩ dùng được Đánh thường")
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
G("Tướng: Viktor (remake)")
test("V2: Viktor có đúng 8Q 8E 2R trong bộ (số lá cố định mọi tướng), không còn thẻ hỗ trợ riêng",
    () => {
        needHero("viktor")
        const cards = gm(mk()).heroCards("viktor",
            "A")
        const n = (id: string) => cards.filter((c) => c.id === id).length
        assert.equal(n("viktor_q"),
            cg.RULES.skillCopies.Q)
        assert.equal(n("viktor_e"),
            cg.RULES.skillCopies.E)
        assert.equal(n("viktor_r"),
            cg.RULES.skillCopies.R)
        assert.equal(n("basic"),
            0)
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
test("V2: số lá chiêu mỗi tướng cố định 8Q 8E 2R; skillCopies khai báo trên tướng bị bỏ qua",
    () => {
        const g = gm(mk())
        for (const h of TEAM) {
            const cards = g.heroCards(h,
                "A")
            const n = (k: string) => cards.filter((c) => c.id === `${h}_${k}`).length
            assert.deepEqual(["q",
                "e",
                "r"].map(n),
            [cg.RULES.skillCopies.Q,
                cg.RULES.skillCopies.E,
                cg.RULES.skillCopies.R],
            h)
        }
    })
test("V2: bộ gốc tự xếp: newGameEx dùng đúng 80 lá chung (mảnh Đồ chỉ định) + 90 lá chiêu; bộ sai thì dùng DEFAULT_DECK",
    () => {
        const deck: cg.DeckCardId[] = [...Array<cg.DeckCardId>(14).fill("basic"),
            ...Array<cg.DeckCardId>(8).fill("gold"),
            "item:kiem_dai",
            "item:kiem_dai",
            "item:cung_go",
            "item:cung_go",
            "item:gang_tay",
            "draw",
            "draw",
            "draw",
            "spell:heal",
            "spell:heal",
            "spell:heal",
            "spell:smite",
            "spell:flash",
            "spell:flash",
            "spell:flash",
            "spell:ignite",
            "spell:ignite",
            "spell:ignite",
            // nửa sau (bộ 80 lá): đầy tối đa mỗi lá đã dùng
            ...Array<cg.DeckCardId>(6).fill("basic"),
            ...Array<cg.DeckCardId>(8).fill("gold"),
            ...Array<cg.DeckCardId>(4).fill("item:kiem_dai"),
            ...Array<cg.DeckCardId>(4).fill("item:cung_go"),
            ...Array<cg.DeckCardId>(5).fill("item:gang_tay"),
            ...Array<cg.DeckCardId>(3).fill("draw"),
            ...Array<cg.DeckCardId>(3).fill("spell:heal"),
            ...Array<cg.DeckCardId>(3).fill("spell:flash"),
            ...Array<cg.DeckCardId>(3).fill("spell:ignite"),
            "spell:smite"]
        assert.equal(deck.length,
            cg.DECK_SIZE)
        assert.equal(cg.validateDeck(deck),
            null,
            String(cg.validateDeck(deck)))
        const s = cg.newGameEx(SEED,
            TEAM,
            TEAM,
            {
                A: deck, B: ["basic"] as cg.DeckCardId[]
            }).state
        const shared = (side: "A" | "B") => [...s.players[side].deck,
            ...s.players[side].hand].filter((c) => c.kind === "support")
        assert.equal(shared("A").length,
            cg.DECK_SIZE)
        assert.deepEqual([...new Set(shared("A").filter((c) => c.id === "item").map((c) => c.item))].sort(),
            ["cung_go",
                "gang_tay",
                "kiem_dai"])
        assert.equal(shared("A").filter((c) => c.id === "basic").length,
            20)
        assert.equal(shared("B").length,
            cg.DEFAULT_DECK.length,
            "bộ sai -> DEFAULT_DECK")
        assert.equal(shared("A").filter((c) => c.id === "spell_smite").length,
            2)
    })
G("Phép bổ trợ (thẻ hỗ trợ)")
const spellCard = (s: St, id: string) => gm(s).supportCard(`spell_${id}`)
test("Hồi Máu / Lá Chắn / Thanh Tẩy: hồi SPELL_NUM.heal (base + 10% máu tối đa), Khiên SPELL_NUM.barrier, gỡ khống chế",
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
        500 + cg.SPELL_NUM.heal.base + 100)
        r = play(r.s,
            "A",
            bar,
            {
                target: a.id
            })
        assert.equal(u(r.s,
            "A",
            "t_guard").shield,
        cg.SPELL_NUM.barrier.base + 100)
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
test("Thiêu Đốt: mất SPELL_NUM.ignite.perTurn máu đầu lượt của mục tiêu, hồi máu giảm nửa; Kiệt Sức: gây ít hơn 40% sát thương",
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
            "damage").some((d) => d.target === "B:t_spark" && d.amount === cg.SPELL_NUM.ignite.perTurn && d.tag === "dot"))
    })
test("Trừng Phạt chỉ nhắm vật triệu hồi ở ô phụ địch (SPELL_NUM.smite.token sát thương chuẩn); Tốc Biến chỉ đổi đường với đồng minh (không vào đường trống); Dịch Chuyển đưa tướng đang chết về sân 50% máu",
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
                id: "dummy", name: "Dummy", hp: cg.SPELL_NUM.smite.token - 50
            })
        let r = play(s,
            "A",
            sm,
            {
                target: tok.id
            })
        assert.ok(!r.s.units[tok.id],
            "token bị phá")
        const guardLane = u(r.s,
            "A",
            "t_guard").lane
        const sparkLane = u(r.s,
            "A",
            "t_spark").lane
        const flashOpts = legalPlays(r.s,
            "A",
            "spell_flash")
        assert.ok(flashOpts.length > 0 && flashOpts.every((a) => a.args?.lane === guardLane || a.args?.lane === sparkLane),
            "Tốc Biến chỉ nhắm đường của đồng minh, không đường trống")
        r = play(r.s,
            "A",
            fl,
            {
                target: "A:t_spark", lane: guardLane
            })
        assert.equal(u(r.s,
            "A",
            "t_spark").lane,
        guardLane)
        assert.equal(u(r.s,
            "A",
            "t_guard").lane,
        sparkLane,
        "đổi chỗ với đồng minh")
        gm(r.s).kill(u(r.s,
            "A",
            "t_spark"))
        const tpLane = legalPlays(r.s,
            "A",
            "spell_teleport")[0]?.args?.lane
        assert.equal(tpLane,
            guardLane,
            "chết giữ đường mới sau Tốc Biến")
        r = play(r.s,
            "A",
            tp,
            {
                target: "A:t_spark", lane: tpLane
            })
        const back = u(r.s,
            "A",
            "t_spark")
        assert.equal(back.status,
            "board")
        assert.equal(back.lane,
            guardLane)
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
if (!only && !process.argv.includes("--core")) {
    const dir = path.dirname(fileURLToPath(import.meta.url))
    for (const f of fs.readdirSync(dir).filter((x) => /^card_tests_(g\d+|items|bot|v2|v3|heroes_g\d+v?|heroes_new)\.ts$/.test(x)).sort()) {
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
