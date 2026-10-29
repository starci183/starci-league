// Test bot chế độ thẻ bài: sao chép state, góc nhìn không nhìn trộm (determinize), chấm điểm (botEval), lập kế hoạch cả
// lượt (botSearch: combo trong lượt), giữ kế hoạch, cấm/chọn (botDraft). Chạy: npx tsx scripts/card_tests_bot.ts [--only=chuỗi]
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    cloneDeep
} from "../packages/shared/src/cardgame/clone"

type St = ReturnType<typeof cg.newGame>;
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
// Trợ giúp dựng tình huống
// ======================================================================
const SEED = 20261029
const FILL = ["garen",
    "malphite",
    "soraka",
    "ashe",
    "ornn",
    "teemo"]
/** Ván ở vòng 8 (mở hết đường): tướng chỉ định ra sân thẳng vào đường, tay trống, đang lượt A (main) */
function mk(A: Record<string, number>, B: Record<string, number>): St {
    const fill = (x: string[]) => [...x,
        ...FILL.filter((h) => !x.includes(h) && !Object.keys(A).includes(h) && !Object.keys(B).includes(h))].slice(0,
        5)
    const s = cg.newGame(SEED,
        fill(Object.keys(A)),
        fill(Object.keys(B)))
    s.round = 8
    const g = new Game(s)
    for (const [side,
        m] of [["A",
            A],
        ["B",
            B]] as const) for (const [h,
        lane] of Object.entries(m)) g.summon(side,
        h,
        lane)
    s.players.A.hand = []
    s.players.B.hand = []
    s.phase = "main"
    s.active = "A"
    s.opened = {
        A: true, B: true
    }
    s.firstTurnDone = {
        A: true, B: true
    }
    // tướng dự bị: cho "chờ hồi sinh" rất lâu để bot không gọi thêm tướng (tình huống gọn)
    for (const x of Object.values(s.units)) if (x.status === "reserve") { x.status = "dead"; x.respawnRound = 999 }
    return s
}
const gm = (s: St) => new Game(s)
const skill = (s: St, hero: string, side: S, k: cg.SkillKey) => gm(s).skillCard(hero,
    side,
    k)
const sup = (s: St, id: string, item?: string) => gm(s).supportCard(id,
    item)
const sigs = (cards: cg.Card[]) => cards.map((c) => `${c.kind}|${c.id}|${c.hero ?? ""}|${c.item ?? ""}`).sort()

// ======================================================================
G("Sao chép state")
// ======================================================================
test("cloneDeep cho bản sao sâu giống hệt và độc lập với bản gốc",
    () => {
        const s = mk({
            darius: 2
        },
        {
            lux: 2
        })
        const c = cloneDeep(s)
        assert.equal(JSON.stringify(c),
            JSON.stringify(s))
        c.units["A:darius"].hp = 1
        c.players.A.deck.pop()
        assert.notEqual(s.units["A:darius"].hp,
            1)
        assert.notEqual(c.players.A.deck.length,
            s.players.A.deck.length)
    })

// ======================================================================
G("Góc nhìn không nhìn trộm (determinize)")
// ======================================================================
test("Giữ nguyên phần nhìn thấy; tay đối thủ lấy mẫu lại từ bài chưa thấy của họ, đúng số lá",
    () => {
        const s = mk({
            darius: 2
        },
        {
            lux: 2
        })
        s.players.A.hand = s.players.A.deck.splice(0,
            4)
        s.players.B.hand = s.players.B.deck.splice(0,
            5)
        const v = cg.determinize(s,
            "A",
            7)
        assert.deepEqual(v.players.A.hand,
            s.players.A.hand)
        assert.deepEqual(v.units,
            s.units)
        assert.equal(v.players.B.hand.length,
            5)
        assert.deepEqual(sigs([...v.players.B.hand,
            ...v.players.B.deck]),
        sigs([...s.players.B.hand,
            ...s.players.B.deck]))
        assert.deepEqual(sigs(v.players.A.deck),
            sigs(s.players.A.deck))
        assert.equal(cg.fingerprint(v,
            "A"),
        cg.fingerprint(s,
            "A"))
        // lấy mẫu khác nhau theo salt (không chép tay thật)
        const hands = new Set([1,
            2,
            3,
            4,
            5].map((k) => cg.determinize(s,
            "A",
            k).players.B.hand.map((c) => c.uid).join()))
        assert.ok(hands.size > 1)
    })

test("Thùng úp của đối thủ: bí mật lấy mẫu theo tiên nghiệm, không chép từ state thật",
    () => {
        const s = mk({
            darius: 2
        },
        {
            gangplank: 2
        })
        const g = gm(s)
        g.summonToken("B",
            {
                id: "keg", name: "Powder Keg", hp: 1, ownerId: "B:gangplank", soak: false, hidden: true, secret: {
                    real: 1
                }, card: g.skillCard("gangplank",
                    "B",
                    "Q"), turns: 3
            })
        const seen = new Set<number>()
        for (let k = 0; k < 24; k++) {
            const v = cg.determinize(s,
                "A",
                k)
            const tok = Object.values(v.units).find((u) => u.token?.id === "keg")!
            seen.add(Number(tok.token!.secret!.real))
            assert.notEqual(tok.token!.card?.id,
                "gangplank_q")
        }
        assert.deepEqual([...seen].sort(),
            [0,
                1])
        // phe chủ thùng thì thấy bí mật của mình
        const own = cg.determinize(s,
            "B",
            1)
        assert.equal(Object.values(own.units).find((u) => u.token?.id === "keg")!.token!.secret!.real,
            1)
    })

// ======================================================================
G("Chấm điểm (botEval)")
// ======================================================================
test("Điểm không đổi khi đổi bài ẩn (tay đối thủ cùng số lá, thứ tự bộ bài)",
    () => {
        const s = mk({
            darius: 2
        },
        {
            lux: 2
        })
        s.players.B.hand = s.players.B.deck.splice(0,
            4)
        const a = cg.evaluate(s,
            "A")
        const t = cloneDeep(s)
        const pool = [...t.players.B.hand,
            ...t.players.B.deck].reverse()
        t.players.B.hand = pool.slice(0,
            4)
        t.players.B.deck = pool.slice(4)
        t.players.A.deck.reverse()
        assert.equal(cg.evaluate(t,
            "A"),
        a)
    })

test("Gây sát thương / hạ gục tướng địch tăng điểm; mất máu thì giảm; thắng = EVAL.win",
    () => {
        const s = mk({
            darius: 2
        },
        {
            lux: 2
        })
        const base = cg.evaluate(s,
            "A")
        const hurt = cloneDeep(s)
        hurt.units["B:lux"].hp -= 100
        assert.ok(cg.evaluate(hurt,
            "A") > base)
        const kill = cloneDeep(s)
        new Game(kill).kill(kill.units["B:lux"],
            kill.units["A:darius"])
        assert.ok(cg.evaluate(kill,
            "A") > cg.evaluate(hurt,
            "A") + 300)
        const mine = cloneDeep(s)
        mine.units["A:darius"].hp -= 100
        assert.ok(cg.evaluate(mine,
            "A") < base)
        const won = cloneDeep(s)
        won.phase = "over"; won.winner = "A"
        assert.equal(cg.evaluate(won,
            "A"),
        cg.EVAL.win)
    })

test("Dấu chờ kích nổ (gợi ý HeroDef.bot) có giá trị: Bỏng của Brand trên tướng địch tăng điểm phe Brand",
    () => {
        const s = mk({
            brand: 2
        },
        {
            darius: 2
        })
        const base = cg.evaluate(s,
            "A")
        const t = cloneDeep(s)
        t.units["B:darius"].statuses.burn = {
            until: t.turnNo + 3, v: 3, src: "A:brand"
        }
        assert.ok(cg.evaluate(t,
            "A") > base + 50)
        assert.ok(cg.getHero("brand")?.bot?.markValue?.burn)
    })

// ======================================================================
G("Lập kế hoạch cả lượt (botSearch)")
// ======================================================================
test("Combo trong lượt: ghép đồ rồi đeo ngay (2 bước)",
    () => {
        const s = mk({
            darius: 2
        },
        {
            lux: 2
        })
        s.players.A.hand = [sup(s,
            "item",
            "kiem_dai"),
        sup(s,
            "item",
            "kiem_dai"),
        sup(s,
            "gold")]
        const plan = cg.planTurn(s,
            "A").map((x) => x.action)
        // V2: ghép trên tay rồi đeo, HOẶC đeo 1 mảnh rồi ghép tại chỗ (mảnh + Vàng) — đều ra Kiếm Tử Thần
        const iCraft = plan.findIndex((a) => a.t === "craft")
        const iUp = plan.findIndex((a) => a.t === "upgrade")
        assert.ok(iCraft >= 0 || iUp >= 0,
            JSON.stringify(plan))
        if (iCraft >= 0) assert.ok(plan.slice(iCraft + 1).some((a) => a.t === "play" && a.args?.target?.startsWith("A:")),
            "đeo lá đồ vừa ghép")
        else assert.ok(plan.slice(0,
            iUp).some((a) => a.t === "play" && a.args?.target?.startsWith("A:")),
        "đeo mảnh trước khi ghép tại chỗ")
        assert.equal(plan[plan.length - 1].t,
            "end")
    })

test("Combo trong lượt: Brand gắn Bỏng (Q) rồi nhân đôi (R chỉ có giá trị khi địch đang Bỏng)",
    () => {
        const s = mk({
            brand: 2
        },
        {
            darius: 2
        })
        const q = skill(s,
                "brand",
                "A",
                "Q"), r = skill(s,
                "brand",
                "A",
                "R")
        s.players.A.hand = [r,
            q]
        // đủ mana cho Q (10) + R (50)
        s.units["A:brand"].mana = 100
        const plan = cg.planTurn(s,
            "A").map((x) => x.action)
        const iq = plan.findIndex((a) => a.t === "play" && a.uid === q.uid)
        const ir = plan.findIndex((a) => a.t === "play" && a.uid === r.uid)
        assert.ok(iq >= 0,
            JSON.stringify(plan))
        assert.ok(ir < 0 || ir > iq,
            `R không được đánh trước Q: ${JSON.stringify(plan)}`)
    })

test("Giữ kế hoạch trong lượt: các bước sau dùng lại kế hoạch (không lập lại) khi thế cờ đi đúng dự tính",
    () => {
        let s = mk({
            darius: 2
        },
        {
            lux: 2
        })
        s.players.A.hand = [sup(s,
            "item",
            "kiem_dai"),
        sup(s,
            "item",
            "kiem_dai"),
        sup(s,
            "gold")]
        const h0 = cg.searchStats.cacheHits
        const p0 = cg.searchStats.plans
        for (let i = 0; i < 4 && s.active === "A" && s.phase === "main"; i++) s = cg.applyAction(s,
            cg.chooseAction(s,
                "A",
                "hard")).state
        assert.equal(cg.searchStats.plans - p0,
            1)
        assert.ok(cg.searchStats.cacheHits - h0 >= 2)
        assert.ok(s.units["A:darius"].items.includes("kiem_tu_than") || s.units["A:lux"]?.side === "A",
            JSON.stringify(s.units["A:darius"].items))
    })

test("Tất định: cùng state cho cùng hành động",
    () => {
        const s = mk({
            darius: 2,
            lux: 1
        },
        {
            garen: 2
        })
        s.players.A.hand = s.players.A.deck.splice(0,
            6)
        const a = cg.planTurn(s,
            "A").map((x) => JSON.stringify(x.action))
        const b = cg.planTurn(s,
            "A").map((x) => JSON.stringify(x.action))
        assert.deepEqual(a,
            b)
    })

test("Xác suất đối thủ có lá Quick chỉ tính từ thành phần bài (Braum trên sân > 0; không có tướng Quick = 0)",
    () => {
        const s = mk({
            darius: 2
        },
        {
            braum: 2
        })
        s.players.B.hand = s.players.B.deck.splice(0,
            4)
        const p = cg.quickResponseProb(s,
            "A")
        assert.ok(p > 0 && p < 1,
            String(p))
        const t = mk({
            darius: 2
        },
        {
            garen: 2
        })
        t.players.B.hand = t.players.B.deck.splice(0,
            4)
        assert.equal(cg.quickResponseProb(t,
            "A"),
        0)
    })

test("Bot hard chơi trọn ván với bot easy không lỗi",
    () => {
        for (let k = 0; k < 2; k++) {
            let s = cg.newGame(SEED + k,
                ["leona",
                    "darius",
                    "brand",
                    "nami",
                    "gangplank"],
                ["braum",
                    "lissandra",
                    "twistedfate",
                    "zed",
                    "vayne"])
            const lv = k === 0 ? {
                A: "hard", B: "easy"
            } as const : {
                A: "easy", B: "hard"
            } as const
            for (let i = 0; i < 6000 && s.phase !== "over" && s.round <= 150; i++) {
                const side = cg.whoseMove(s)
                s = cg.applyAction(s,
                    cg.chooseAction(s,
                        side,
                        lv[side])).state
            }
            assert.equal(s.phase,
                "over")
        }
    })

// ======================================================================
G("Cấm/chọn (botDraft)")
// ======================================================================
test("Chọn tướng combo với tướng đã chọn; cấm tướng khắc tướng mình",
    () => {
        const pick = cg.draftChoice({
            available: ["viktor",
                "garen",
                "malphite"], mine: ["nami"], theirs: [], action: "pick"
        })
        assert.equal(pick,
            "viktor")
        const ban = cg.draftChoice({
            available: ["soraka",
                "ashe",
                "lux"], mine: ["darius"], theirs: [], action: "ban"
        })
        assert.ok(cg.SYNERGY.darius.counteredBy.includes(ban!),
            ban)
    })

test("Không chọn 2 tướng tranh Ô triệu hồi phụ; tránh tướng bị địch đã chọn khắc",
    () => {
        assert.notEqual(cg.draftChoice({
            available: ["gangplank",
                "garen"], mine: ["annie"], theirs: [], action: "pick"
        }),
        "gangplank")
        const victim = "darius"
        const counter = cg.SYNERGY[victim].counteredBy[0]
        const pick = cg.draftChoice({
            available: [victim,
                "malphite"], mine: [], theirs: [counter], action: "pick"
        })
        assert.notEqual(pick,
            victim)
    })

// ======================================================================
// Bảng kết quả
// ======================================================================
let lastGroup = ""
for (const r of results) {
    if (r.group !== lastGroup) { console.log(`\n== ${r.group} ==`); lastGroup = r.group }
    console.log(`${r.res}  ${r.name}${r.note ? `\n        -> ${r.note}` : ""}`)
}
const n = (k: string) => results.filter((r) => r.res === k).length
console.log(`\nTỔNG: ${results.length} test | PASS ${n("PASS")} | FAIL ${n("FAIL")}`)
process.exit(n("FAIL") ? 1 : 0)
