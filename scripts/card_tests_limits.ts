// Test giới hạn lượt dùng chiêu (Once per turn) và Sylas đoạt xong tung ngay. Chạy: npx tsx scripts/card_tests_limits.ts
// Số đọc từ balance/heroes/*.json và cờ của Sylas, nên sửa JSON không làm vỡ test.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    G, act, endTurn, mk, report, skill, test, type Act, type S, type St
} from "./kit_test_util"

cg.RULES.skillLimits = true
const flags = cg.kit("sylas").raw.flags
flags.stealOnlyR = true
flags.stealToHand = false
type PlayAct = Extract<Act, { t: "play" }>
const options = (s: St, side: S, c: cg.Card) => cg.legalActions(s,
    side).filter((a) => a.t === "play" && a.uid === c.uid) as PlayAct[]
function play(s: St, side: S, hero: string, key: "Q" | "E" | "R", target?: string) {
    const c = skill(s,
        hero,
        side,
        key)
    s.players[side].hand.push(c)
    const opt = options(s,
        side,
        c).find((a) => !target || a.args?.target === target)
    if (!opt) return undefined
    let r = act(s,
        opt)
    while (r.s.phase === "chain" && r.s.chain) r = act(r.s,
        {
            t: "pass", side: r.s.chain.priority
        })
    return r
}
function board() {
    const s = mk({
        A: {
            lux: 2, leona: 1, kogmaw: 3
        }, B: {
            garen: 2, braum: 1, zed: 3
        }
    })
    for (const x of Object.values(s.units)) x.maxHp = x.hp = 9000
    s.teamMana.A = 200
    return s
}

G("Giới hạn mỗi lượt")
test("Mỗi lượt 1 lần: Leona Q dùng 1 lần, lá thứ hai không đánh được",
    () => {
        const r = play(board(),
            "A",
            "leona",
            "Q")
        assert.ok(r)
        const c = skill(r.s,
            "leona",
            "A",
            "Q")
        r.s.players.A.hand.push(c)
        assert.equal(options(r.s,
            "A",
            c).length,
        0)
        assert.ok(r.s.players.A.hand.some((x) => x.uid === c.uid),
            "lá vẫn trên tay")
    })
test("Mỗi lượt 2 lần: Lux Q dùng đúng 2 lần",
    () => {
        const r1 = play(board(),
            "A",
            "lux",
            "Q",
            "B:garen")
        const r2 = play(r1!.s,
            "A",
            "lux",
            "Q",
            "B:garen")
        assert.ok(r2)
        assert.equal(play(r2.s,
            "A",
            "lux",
            "Q",
            "B:garen"),
        undefined)
    })
test("Không giới hạn: Kog'Maw Q dùng 3 lần",
    () => {
        let s = board()
        for (let i = 0; i < 3; i++) {
            const r = play(s,
                "A",
                "kogmaw",
                "Q",
                "B:garen")
            assert.ok(r,
                `lần ${i + 1}`)
            s = r.s
        }
    })
test("hết lượt thì đếm lại, chiêu khác và tướng khác đếm riêng",
    () => {
        const r = play(board(),
            "A",
            "leona",
            "Q")
        assert.ok(play(r!.s,
            "A",
            "lux",
            "E",
            "B:garen"),
        "tướng khác")
        let s = endTurn(r!.s).s
        s = endTurn(s).s
        assert.ok(play(s,
            "A",
            "leona",
            "Q"),
        "lượt mới")
    })
test("chữ trên lá ghi giới hạn, cả tiếng Anh và lá đổi theo dạng",
    () => {
        assert.ok(cg.getHero("leona")!.skills.Q.desc.endsWith("Mỗi lượt 1 lần."))
        assert.ok(cg.getHero("leona")!.en!.skills.Q.desc.endsWith("Once per turn."))
        assert.ok(cg.getHero("lux")!.skills.Q.desc.endsWith("Mỗi lượt 2 lần."))
        assert.ok(!/Mỗi lượt/.test(cg.getHero("kogmaw")!.skills.Q.desc))
        assert.ok(cg.getHero("jayce")!.skills.Q.variant!(undefined).vi.desc.endsWith("Mỗi lượt 2 lần."))
    })
test("đủ 39 tướng có limits trong JSON",
    () => {
        for (const id of cg.balanceHeroIds()) assert.ok(cg.kit(id).raw.limits,
            id)
    })

G("Sylas đoạt xong tung ngay")
function sylasBoard() {
    const s = mk({
        A: {
            sylas: 2
        }, B: {
            garen: 2, ashe: 1
        }
    })
    for (const x of Object.values(s.units)) x.maxHp = x.hp = 9000
    s.teamMana.A = 200
    return s
}
const steal = (s: St, target: string) => {
    const c = skill(s,
        "sylas",
        "A",
        "R")
    s.players.A.hand.push(c)
    const opt = options(s,
        "A",
        c).find((a) => a.args?.target === target)
    assert.ok(opt,
        "có lựa chọn đoạt")
    let r = act(s,
        opt)
    const ev = [...r.ev]
    while (r.s.phase === "chain" && r.s.chain) {
        r = act(r.s,
            {
                t: "pass", side: r.s.chain.priority
            })
        ev.push(...r.ev)
    }
    return {
        s: r.s, ev
    }
}
test("tung ngay lên kẻ bị đoạt, không có lá lên tay, trả mana R + mana gốc",
    () => {
        const s = sylasBoard()
        const pg = cg.kit("sylas").p, pr = cg.kit("garen").p
        const r = steal(s,
            "B:garen")
        assert.ok(!r.s.players.A.hand.some((c) => c.data?.stolen),
            "không lên tay")
        assert.ok(r.ev.some((e) => e.t === "damage" && e.target === "B:garen" && e.src === "A:sylas"))
        assert.equal(r.s.teamMana.A,
            200 - pg.r0 - pr.r0)
    })
test("không đủ mana cho cả hai thì không đoạt được",
    () => {
        const s = sylasBoard()
        s.teamMana.A = cg.kit("sylas").p.r0
        const c = skill(s,
            "sylas",
            "A",
            "R")
        s.players.A.hand.push(c)
        assert.equal(options(s,
            "A",
            c).length,
        0)
    })
report()
