// Test bộ chiêu nhóm Pháp sư (Lux, Viktor, Lissandra, Twisted Fate, Vel'Koz, Rumble). Chạy: npx tsx scripts/card_tests_kits_mage.ts [--only=chuỗi] [--verbose]
// Mọi kỳ vọng tính từ cg.kit(id).p và chỉ số engine, nên sửa balance/heroes/*.json không làm vỡ test.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    G, act, cast, dmgOn, endTurn, gm, mk, report, skill, sup, test, u,
    type Act, type Ev, type S, type St
} from "./kit_test_util"

const K = (id: string) => cg.kit(id)
const kl = K("lux"), kv = K("viktor"), ks = K("lissandra"), kt = K("twistedfate"), kk = K("velkoz"), kr = K("rumble")

const mit = (raw: number, def: number) => Math.round(raw * 100 / (100 + def))
const mr = (s: St, side: S, h: string) => gm(s).mr(u(s,
    side,
    h))
/** Giá trị công thức KITS của tướng (ký hiệu `q1 + q2·AP`) */
const val = (s: St, side: S, hero: string, expr: string, target?: cg.Unit) => gm(s).f(u(s,
    side,
    hero),
K(hero).x(expr),
target)
/** Cộng AP bằng trạng thái ap_up */
const boost = (s: St, side: S, hero: string, ap: number) => gm(s).status(u(s,
    side,
    hero),
"ap_up",
30,
{
    v: ap, of: side
})
const card = (s: St, side: S, hero: string, key: cg.SkillKey) => { const c = skill(s,
    hero,
    side,
    key); s.players[side].hand.push(c); return c }
/** Lá chiêu mới để đánh qua cast() (cast tự bỏ lá lên tay) */
const sk = (s: St, side: S, hero: string, key: cg.SkillKey) => skill(s,
    hero,
    side,
    key)
/** Mục tiêu nhiều Máu để đòn thử Choáng không hạ nó */
const tank = (s: St, side: S, hero: string) => { const x = u(s,
    side,
    hero); x.maxHp = x.hp = 9000 }
type ChainAct = Extract<Act, { t: "chain" }>
const chainOpts = (s: St, side: S, id: string): ChainAct[] => (cg.legalActions(s,
    side).filter((a) => a.t === "chain") as ChainAct[])
    .filter((a) => s.players[side].hand.find((c) => c.uid === a.uid)?.id === id)
const playOpts = (s: St, side: S, id: string) => (cg.legalActions(s,
    side).filter((a) => a.t === "play") as Extract<Act, { t: "play" }>[])
    .filter((a) => s.players[side].hand.find((c) => c.uid === a.uid)?.id === id)
function pass(s0: St, ev0: Ev = []): { s: St; ev: Ev } {
    let s = s0
    const ev = [...ev0]
    for (let i = 0; i < 8 && s.phase === "chain" && s.chain; i++) {
        const r = act(s,
            {
                t: "pass", side: s.chain.priority
            })
        s = r.s; ev.push(...r.ev)
    }
    return {
        s, ev
    }
}
/** Bên B mở Chuỗi bằng 1 đòn đánh thường (chưa giải quyết) */
function attackOpen(s: St, from: string, to: string) {
    s.active = "B"
    return cast(s,
        "B",
        sup(s,
            "basic"),
        {
            actor: from, target: to
        },
        false)
}
const manaOf = (s: St, side: S) => s.teamMana![side]
/** Đủ hay không đủ mana: đặt bể về 200 */
/** Đơn vị thời gian của trạng thái theo bên tung */
function unitsOk(s: St, src: cg.Unit, until: number | undefined, d: number) {
    const g = gm(s), f = Math.floor(d)
    if (f >= 1) assert.ok(until !== undefined,
        `thiếu trạng thái, d=${d}`)
    if (until === undefined) return assert.ok(d % 1 > 0 && f === 0)
    assert.ok(until === g.unitsUntil(src,
        f) || (d % 1 > 0 && until === g.unitsUntil(src,
        f + 1)),
    `until ${until} không khớp d=${d}`)
}
const near = (a: number, b: number, tol = 1) => assert.ok(Math.abs(a - b) <= tol,
    `${a} != ${b} (±${tol})`)
/** Phát bài bổ sung vào tay */
const giveHand = (s: St, side: S, ids: cg.SupportId[]) => ids.map((id) => { const c = sup(s,
    id); s.players[side].hand.push(c); return c })

// ======================================================================
G("Lux")
test("nội tại: mỗi p1 mana trả cho chiêu Lux cho 1 Ánh Sáng, phần lẻ dồn lại",
    () => {
        let s = mk({
            A: {
                lux: 2
            }, B: {
                garen: 2
            }
        })
        s = cast(s,
            "A",
            sk(s,
                "A",
                "lux",
                "Q"),
            {
                target: "B:garen"
            }).s
        const gain1 = Math.floor(kl.p.q0 / kl.p.p1)
        assert.equal(u(s,
            "A",
            "lux").stacks.lux_pool,
        gain1)
        s = cast(s,
            "A",
            sk(s,
                "A",
                "lux",
                "Q"),
            {
                target: "B:garen"
            }).s
        assert.equal(u(s,
            "A",
            "lux").stacks.lux_pool,
        Math.floor(2 * kl.p.q0 / kl.p.p1),
        "phần lẻ không mất")
    })
test("nội tại: Ánh Sáng tính mana cả đội tiêu, địch tiêu không tính",
    () => {
        const s = mk({
            A: {
                lux: 2, garen: 1
            }, B: {
                annie: 2
            }
        })
        const g = gm(s)
        g.hook("onManaSpent",
            {
                unit: u(s,
                    "A",
                    "garen"), amount: 40, card: g.skillCard("garen",
                    "A",
                    "Q")
            })
        assert.equal(u(s,
            "A",
            "lux").stacks.lux_pool,
        Math.floor(40 / kl.p.p1))
        g.hook("onManaSpent",
            {
                unit: u(s,
                    "B",
                    "annie"), amount: 40, card: g.skillCard("annie",
                    "B",
                    "Q")
            })
        assert.equal(u(s,
            "A",
            "lux").stacks.lux_pool,
        Math.floor(40 / kl.p.p1))
    })
test("nội tại: mất một nửa Ánh Sáng khi bị hạ",
    () => {
        const s = mk({
            A: {
                lux: 2
            }, B: {
                garen: 2
            }
        })
        u(s,
            "A",
            "lux").stacks.lux_pool = 40
        gm(s).kill(u(s,
            "A",
            "lux"),
        u(s,
            "B",
            "garen"))
        assert.equal(u(s,
            "A",
            "lux").stacks.lux_pool,
        20)
    })
test("Q: sát thương + p2 mỗi Ánh Sáng, Lux nhận Khiên",
    () => {
        let s = mk({
            A: {
                lux: 2
            }, B: {
                garen: 2
            }
        })
        boost(s,
            "A",
            "lux",
            100)
        const hp0 = u(s,
            "B",
            "garen").hp
        const r = cast(s,
            "A",
            sk(s,
                "A",
                "lux",
                "Q"),
            {
                target: "B:garen"
            })
        s = r.s
        const light = u(s,
            "A",
            "lux").stacks.lux_pool
        const raw = val(s,
            "A",
            "lux",
            "q1 + q2·AP") + kl.p.p2 * light
        near(hp0 - u(s,
            "B",
            "garen").hp,
        mit(raw,
            mr(s,
                "B",
                "garen")))
        assert.equal(Math.round(gm(s).totalShield(u(s,
            "A",
            "lux"))),
        Math.round(val(s,
            "A",
            "lux",
            "q3 + q4·AP")))
    })
test("Q Quick: nối được khi địch nhắm đúng Lux, không nối khi nhắm đồng minh khác",
    () => {
        let s = mk({
            A: {
                lux: 2, ahri: 1
            }, B: {
                garen: 2, ornn: 1
            }
        })
        s.players.A.hand.push(skill(s,
            "lux",
            "A",
            "Q"))
        s = attackOpen(s,
            "B:garen",
            "A:lux").s
        assert.equal(s.phase,
            "chain")
        assert.ok(chainOpts(s,
            "A",
            "lux_q").length > 0,
        "phải nối được")
        let t = mk({
            A: {
                lux: 2, ahri: 1
            }, B: {
                garen: 2, ornn: 1
            }
        })
        t.players.A.hand.push(skill(t,
            "lux",
            "A",
            "Q"))
        t = attackOpen(t,
            "B:ornn",
            "A:ahri").s
        assert.equal(chainOpts(t,
            "A",
            "lux_q").length,
        0,
        "đánh đồng minh khác không mở được Q")
    })
test("E: sát thương cộng Ánh Sáng; Choáng chỉ khi Ánh Sáng sau trả phí từ e3",
    () => {
        const run = (pre: number) => {
            let s = mk({
                A: {
                    lux: 2
                }, B: {
                    garen: 2
                }
            })
            boost(s,
                "A",
                "lux",
                400)
            tank(s,
                "B",
                "garen")
            u(s,
                "A",
                "lux").stacks.lux_pool = pre
            s = cast(s,
                "A",
                sk(s,
                    "A",
                    "lux",
                    "E"),
                {
                    target: "B:garen"
                }).s
            return s
        }
        const gain = Math.floor(kl.p.e0 / kl.p.p1)
        const below = run(kl.p.e3 - gain - 1)
        assert.ok(!u(below,
            "B",
            "garen").statuses.stun,
        "dưới ngưỡng không Choáng")
        const at = run(kl.p.e3 - gain)
        assert.ok(u(at,
            "A",
            "lux").stacks.lux_pool >= kl.p.e3)
        const st = u(at,
            "B",
            "garen").statuses.stun
        assert.ok(st,
            "đủ ngưỡng thì Choáng")
        unitsOk(at,
            u(at,
                "A",
                "lux"),
            st.until,
            val(at,
                "A",
                "lux",
                "e4 + e5·AP"))
    })
test("E: sát thương đúng công thức + p2 × Ánh Sáng",
    () => {
        let s = mk({
            A: {
                lux: 2
            }, B: {
                garen: 2
            }
        })
        boost(s,
            "A",
            "lux",
            100)
        const hp0 = u(s,
            "B",
            "garen").hp
        s = cast(s,
            "A",
            sk(s,
                "A",
                "lux",
                "E"),
            {
                target: "B:garen"
            }).s
        const light = u(s,
            "A",
            "lux").stacks.lux_pool
        near(hp0 - u(s,
            "B",
            "garen").hp,
        mit(val(s,
            "A",
            "lux",
            "e1 + e2·AP") + kl.p.p2 * light,
        mr(s,
            "B",
            "garen")))
    })
test("R: lựa chọn mana nằm trong [r0, min(r1, bể)], bể thấp hơn r0 thì không đánh được",
    () => {
        const s = mk({
            A: {
                lux: 2
            }, B: {
                garen: 2
            }
        })
        const c = card(s,
            "A",
            "lux",
            "R")
        const lv = (st: St) => [...new Set(playOpts(st,
            "A",
            "lux_r").map((a) => a.args?.manaSpent))].sort((a, b) => Number(a) - Number(b))
        const levels = lv(s)
        assert.equal(levels[0],
            kl.p.r0)
        assert.equal(levels[levels.length - 1],
            Math.min(kl.p.r1,
                200))
        assert.ok(levels.every((m) => Number(m) >= kl.p.r0 && Number(m) <= kl.p.r1))
    s.teamMana!.A = kl.p.r0 + 5
    assert.equal(Math.max(...lv(s).map(Number)),
        kl.p.r0 + 5,
        "trần theo bể đội")
    s.teamMana!.A = kl.p.r0 - 1
    assert.equal(playOpts(s,
        "A",
        "lux_r").length,
    0)
    void c
    })
test("R: chi M mana, sát thương + r4 × M + p2 × Ánh Sáng, Ánh Sáng nhận M/p1",
    () => {
        let s = mk({
            A: {
                lux: 2
            }, B: {
                garen: 2
            }
        })
        boost(s,
            "A",
            "lux",
            100)
        const M = kl.p.r0 + 20
        const hp0 = u(s,
                "B",
                "garen").hp, m0 = manaOf(s,
                "A")
        s = cast(s,
            "A",
            sk(s,
                "A",
                "lux",
                "R"),
            {
                target: "B:garen", manaSpent: M
            }).s
        assert.equal(manaOf(s,
            "A"),
        m0 - M)
        const light = u(s,
            "A",
            "lux").stacks.lux_pool
        assert.equal(light,
            Math.floor(M / kl.p.p1))
        near(hp0 - u(s,
            "B",
            "garen").hp,
        mit(val(s,
            "A",
            "lux",
            "r2 + r3·AP") + kl.p.r4 * M + kl.p.p2 * light,
        mr(s,
            "B",
            "garen")))
    })

// ======================================================================
G("Viktor")
test("nội tại: mỗi lá bỏ khỏi tay cho 1 Tiến Hoá, vô hạn",
    () => {
        let s = mk({
            A: {
                viktor: 2
            }, B: {
                garen: 2
            }
        })
        const [c1,
            c2] = giveHand(s,
            "A",
            ["basic",
                "gold"])
        s = act(s,
            {
                t: "discard", side: "A", uid: c1.uid
            }).s
        s = act(s,
            {
                t: "discard", side: "A", uid: c2.uid
            }).s
        assert.equal(u(s,
            "A",
            "viktor").stacks.evolve,
        2)
    })
test("nội tại: mất một nửa Tiến Hoá khi bị hạ",
    () => {
        const s = mk({
            A: {
                viktor: 2
            }, B: {
                garen: 2
            }
        })
        u(s,
            "A",
            "viktor").stacks.evolve = 10
        gm(s).kill(u(s,
            "A",
            "viktor"),
        u(s,
            "B",
            "garen"))
        assert.equal(u(s,
            "A",
            "viktor").stacks.evolve,
        5)
    })
test("Q: bỏ tối đa q1 lá, +Tiến Hoá, Khiên mỗi lá, sát thương cộng p1 × Tiến Hoá",
    () => {
        let s = mk({
            A: {
                viktor: 2
            }, B: {
                garen: 2
            }
        })
        boost(s,
            "A",
            "viktor",
            100)
        const cs = giveHand(s,
            "A",
            ["basic",
                "gold",
                "draw",
                "mana"])
        const c = card(s,
            "A",
            "viktor",
            "Q")
        const opts = playOpts(s,
            "A",
            "viktor_q")
        s.players.A.hand = s.players.A.hand.filter((x) => x.uid !== c.uid)
        assert.ok(opts.some((a) => (a.args?.discard ?? []).length === 0),
            "được bỏ 0 lá")
        assert.ok(opts.every((a) => (a.args?.discard ?? []).length <= kv.p.q1),
            "không quá q1 lá")
        const n = Math.min(kv.p.q1,
            cs.length)
        const hp0 = u(s,
            "B",
            "garen").hp
        s = cast(s,
            "A",
            c,
            {
                target: "B:garen", discard: cs.slice(0,
                    n).map((x) => x.uid)
            }).s
        assert.equal(u(s,
            "A",
            "viktor").stacks.evolve,
        n)
        assert.equal(s.players.A.hand.length,
            cs.length - n)
        near(hp0 - u(s,
            "B",
            "garen").hp,
        mit(val(s,
            "A",
            "viktor",
            "q2 + q3·AP") + kv.p.p1 * n,
        mr(s,
            "B",
            "garen")))
        assert.equal(Math.round(gm(s).totalShield(u(s,
            "A",
            "viktor"))),
        Math.round(n * val(s,
            "A",
            "viktor",
            "q4 + q5·AP")))
    })
test("Q Quick: chỉ nối khi địch nhắm đúng Viktor",
    () => {
        let s = mk({
            A: {
                viktor: 2, ahri: 1
            }, B: {
                garen: 2, ornn: 1
            }
        })
        s.players.A.hand.push(skill(s,
            "viktor",
            "A",
            "Q"))
        s = attackOpen(s,
            "B:garen",
            "A:viktor").s
        assert.ok(chainOpts(s,
            "A",
            "viktor_q").length > 0)
        let t = mk({
            A: {
                viktor: 2, ahri: 1
            }, B: {
                garen: 2, ornn: 1
            }
        })
        t.players.A.hand.push(skill(t,
            "viktor",
            "A",
            "Q"))
        t = attackOpen(t,
            "B:ornn",
            "A:ahri").s
        assert.equal(chainOpts(t,
            "A",
            "viktor_q").length,
        0)
    })
test("E: mọi địch nhận sát thương công thức + p1 × Tiến Hoá",
    () => {
        let s = mk({
            A: {
                viktor: 2
            }, B: {
                garen: 1, ornn: 2, leona: 3
            }
        })
        boost(s,
            "A",
            "viktor",
            100)
        u(s,
            "A",
            "viktor").stacks.evolve = 10
        const before = Object.fromEntries(["garen",
            "ornn",
            "leona"].map((h) => [h,
            u(s,
                "B",
                h).hp]))
        s = cast(s,
            "A",
            sk(s,
                "A",
                "viktor",
                "E")).s
        for (const h of ["garen",
            "ornn",
            "leona"]) near(before[h] - u(s,
            "B",
            h).hp,
        mit(val(s,
            "A",
            "viktor",
            "e1 + e2·AP") + kv.p.p1 * 10,
        mr(s,
            "B",
            h)),
        2)
    })
test("R: mọi địch nhận sát thương, địch nhiều Máu nhất bị Choáng r3 + r4·AP đơn vị",
    () => {
        let s = mk({
            A: {
                viktor: 2
            }, B: {
                garen: 1, ornn: 2, leona: 3
            }
        })
        boost(s,
            "A",
            "viktor",
            3000)
        u(s,
            "B",
            "ornn").maxHp = u(s,
            "B",
            "ornn").hp = 5000
        s = cast(s,
            "A",
            sk(s,
                "A",
                "viktor",
                "R")).s
        const st = u(s,
            "B",
            "ornn").statuses.stun
        assert.ok(st,
            "Ornn nhiều Máu nhất bị Choáng")
        unitsOk(s,
            u(s,
                "A",
                "viktor"),
            st.until,
            val(s,
                "A",
                "viktor",
                "r3 + r4·AP"))
        assert.ok(!u(s,
            "B",
            "garen").statuses.stun && !u(s,
            "B",
            "leona").statuses.stun)
        assert.ok(u(s,
            "B",
            "garen").hp < u(s,
            "B",
            "garen").maxHp)
    })

// ======================================================================
G("Lissandra")
const hand3 = (s: St) => giveHand(s,
    "B",
    ["basic",
        "gold",
        "draw"])
test("nội tại: AP lớn thì chiêu gây sát thương chắc chắn Hoá Băng 1 lá, tan sau p3 đơn vị",
    () => {
        let s = mk({
            A: {
                lissandra: 2
            }, B: {
                garen: 2
            }
        })
        boost(s,
            "A",
            "lissandra",
            5000)
        hand3(s)
        s = cast(s,
            "A",
            sk(s,
                "A",
                "lissandra",
                "E"),
            {
                target: "B:garen"
            }).s
        const frozen = s.players.B.hand.filter((c) => c.frozen === "A:lissandra")
        assert.equal(frozen.length,
            1)
        assert.equal(frozen[0].frozenUntil,
            gm(s).unitsUntil(u(s,
                "A",
                "lissandra"),
            ks.p.p3))
    })
test("nội tại: cơ hội p1 khi AP 0 (thống kê) và lá băng không dùng được",
    () => {
        let hits = 0
        const N = 120
        for (let i = 0; i < N; i++) {
            let s = mk({
                A: {
                    lissandra: 2
                }, B: {
                    garen: 2
                }, seed: 7000 + i
            })
            hand3(s)
            s = cast(s,
                "A",
                sk(s,
                    "A",
                    "lissandra",
                    "E"),
                {
                    target: "B:garen"
                }).s
            if (s.players.B.hand.some((c) => c.frozen)) hits++
        }
        assert.ok(hits > N * ks.p.p1 * 0.4 && hits < N * ks.p.p1 * 1.9,
            `tỉ lệ băng ${hits}/${N} lệch p1=${ks.p.p1}`)
        const s = mk({
            A: {
                lissandra: 2
            }, B: {
                garen: 2
            }
        })
        s.active = "B"
        const [b] = giveHand(s,
            "B",
            ["basic"])
        gm(s).freezeCard("B",
            b,
            "A:lissandra")
        assert.equal(playOpts(s,
            "B",
            "basic").length,
        0,
        "lá băng không đánh được")
    })
test("nội tại: tan khi Lissandra bị hạ",
    () => {
        const s = mk({
            A: {
                lissandra: 2
            }, B: {
                garen: 2
            }
        })
        const [b] = hand3(s)
        gm(s).freezeCard("B",
            b,
            "A:lissandra",
            gm(s).unitsUntil(u(s,
                "A",
                "lissandra"),
            5))
        gm(s).kill(u(s,
            "A",
            "lissandra"),
        u(s,
            "B",
            "garen"))
        assert.ok(!s.players.B.hand.some((c) => c.frozen))
    })
test("nội tại: tan theo thời hạn sau p3 đơn vị",
    () => {
        let s = mk({
            A: {
                lissandra: 2
            }, B: {
                garen: 2
            }
        })
        const [b] = hand3(s)
        gm(s).freezeCard("B",
            b,
            "A:lissandra",
            gm(s).unitsUntil(u(s,
                "A",
                "lissandra"),
            1))
        s = endTurn(s).s // hết lượt A
        assert.ok(s.players.B.hand.find((c) => c.uid === b.uid)?.frozen,
            "đang trong lượt B")
        s = endTurn(s).s // hết lượt B: đơn vị thứ 1 xong
        assert.ok(!s.players.B.hand.find((c) => c.uid === b.uid)?.frozen)
    })
test("Q: sát thương + Hoá Băng chắc 1 lá",
    () => {
        let s = mk({
            A: {
                lissandra: 2
            }, B: {
                garen: 2
            }
        })
        hand3(s)
        const hp0 = u(s,
            "B",
            "garen").hp
        s = cast(s,
            "A",
            sk(s,
                "A",
                "lissandra",
                "Q"),
            {
                target: "B:garen"
            }).s
        near(hp0 - u(s,
            "B",
            "garen").hp,
        mit(val(s,
            "A",
            "lissandra",
            "q1 + q2·AP"),
        mr(s,
            "B",
            "garen")))
        assert.ok(s.players.B.hand.filter((c) => c.frozen).length >= 1)
    })
test("E: Choáng chỉ khi lá chiêu của nó đang băng",
    () => {
        const run = (iced: boolean) => {
            const s = mk({
                A: {
                    lissandra: 2
                }, B: {
                    garen: 2, zed: 1
                }
            })
            boost(s,
                "A",
                "lissandra",
                400)
            tank(s,
                "B",
                "zed")
            const zq = skill(s,
                "zed",
                "B",
                "Q")
            s.players.B.hand.push(zq)
            if (iced) gm(s).freezeCard("B",
                zq,
                "A:lissandra",
                gm(s).unitsUntil(u(s,
                    "A",
                    "lissandra"),
                5))
            return cast(s,
                "A",
                sk(s,
                    "A",
                    "lissandra",
                    "E"),
                {
                    target: "B:zed"
                }).s
        }
        assert.ok(!u(run(false),
            "B",
            "zed").statuses.stun)
        const s = run(true)
        const st = u(s,
            "B",
            "zed").statuses.stun
        assert.ok(st,
            "có lá chiêu băng thì Choáng")
        unitsOk(s,
            u(s,
                "A",
                "lissandra"),
            st.until,
            val(s,
                "A",
                "lissandra",
                "e3 + e4·AP"))
    })
test("R Quick: nối khi địch nhắm đúng Lissandra; sát thương theo số lá băng; Đóng Băng r6 đơn vị",
    () => {
        let s = mk({
            A: {
                lissandra: 2, ahri: 1
            }, B: {
                garen: 1, ornn: 2
            }
        })
        s.players.A.hand.push(skill(s,
            "lissandra",
            "A",
            "R"))
        const bs = hand3(s)
        gm(s).freezeCard("B",
            bs[0],
            "A:lissandra",
            gm(s).unitsUntil(u(s,
                "A",
                "lissandra"),
            5))
        gm(s).freezeCard("B",
            bs[1],
            "A:lissandra",
            gm(s).unitsUntil(u(s,
                "A",
                "lissandra"),
            5))
        const hp0 = u(s,
            "B",
            "ornn").hp
        s = attackOpen(s,
            "B:ornn",
            "A:lissandra").s
        const o = chainOpts(s,
            "A",
            "lissandra_r")[0]
        assert.ok(o,
            "nối được")
        const r = pass(act(s,
            o).s)
        s = r.s
        const n = 2
        near(hp0 - u(s,
            "B",
            "ornn").hp,
        mit(val(s,
            "A",
            "lissandra",
            "r1 + r2·AP") + ks.p.r3 * n,
        mr(s,
            "B",
            "ornn")),
        2)
        const st = u(s,
            "A",
            "lissandra").statuses.stasis
        assert.ok(st,
            "tự Đóng Băng")
        assert.equal(st.until,
            gm(s).unitsUntil(u(s,
                "A",
                "lissandra"),
            ks.p.r6))
    })
test("R Quick: không nối khi địch chỉ nhắm đồng minh khác",
    () => {
        let s = mk({
            A: {
                lissandra: 2, ahri: 1
            }, B: {
                garen: 2, ornn: 1
            }
        })
        s.players.A.hand.push(skill(s,
            "lissandra",
            "A",
            "R"))
        s = attackOpen(s,
            "B:ornn",
            "A:ahri").s
        assert.equal(chainOpts(s,
            "A",
            "lissandra_r").length,
        0)
    })

// ======================================================================
G("Twisted Fate")
const topCard = (s: St, c: cg.Card) => { s.players.A.deck.unshift(c) }
test("Q: lá chiêu trên cùng: trúng thêm 2 đường kề, lá vào mộ",
    () => {
        let s = mk({
            A: {
                twistedfate: 2
            }, B: {
                garen: 2, ornn: 1, leona: 3, ahri: 0
            }
        })
        boost(s,
            "A",
            "twistedfate",
            100)
        topCard(s,
            skill(s,
                "darius",
                "A",
                "Q"))
        const hp0 = Object.fromEntries(["garen",
            "ornn",
            "leona",
            "ahri"].map((h) => [h,
            u(s,
                "B",
                h).hp]))
        const grave0 = s.players.A.grave.length
        s = cast(s,
            "A",
            sk(s,
                "A",
                "twistedfate",
                "Q"),
            {
                target: "B:garen"
            }).s
        const raw = val(s,
            "A",
            "twistedfate",
            "q1 + q2·AP")
        for (const h of ["garen",
            "ornn",
            "leona"]) near(hp0[h] - u(s,
            "B",
            h).hp,
        mit(raw,
            mr(s,
                "B",
                h)),
        2)
        assert.equal(u(s,
            "B",
            "ahri").hp,
        hp0.ahri,
        "đường xa không trúng")
        assert.equal(s.players.A.grave.length,
            grave0 + 2,
            "lá lật và lá Q vào mộ")
        assert.ok(s.players.A.grave.some((c) => c.id === "darius_q"))
    })
test("Q: Vàng hoặc đồ lật ra thì Choáng, lá vào mộ",
    () => {
        for (const mkc of [(s: St) => sup(s,
            "gold"),
        (s: St) => sup(s,
            "item",
            "kiem_dai")]) {
            let s = mk({
                A: {
                    twistedfate: 2
                }, B: {
                    garen: 2, ornn: 1
                }
            })
            boost(s,
                "A",
                "twistedfate",
                400)
            tank(s,
                "B",
                "garen")
            const c = mkc(s)
            topCard(s,
                c)
            s = cast(s,
                "A",
                sk(s,
                    "A",
                    "twistedfate",
                    "Q"),
                {
                    target: "B:garen"
                }).s
            const st = u(s,
                "B",
                "garen").statuses.stun
            assert.ok(st,
                "Choáng")
            unitsOk(s,
                u(s,
                    "A",
                    "twistedfate"),
                st.until,
                val(s,
                    "A",
                    "twistedfate",
                    "q3 + q4·AP"))
            assert.ok(s.players.A.grave.some((x) => x.uid === c.uid))
            assert.ok(!u(s,
                "B",
                "ornn").statuses.stun && u(s,
                "B",
                "ornn").hp === u(s,
                "B",
                "ornn").maxHp,
            "không trúng đường kề")
        }
    })
test("Q: lá khác lật ra thì được rút lên tay, không vào mộ",
    () => {
        let s = mk({
            A: {
                twistedfate: 2
            }, B: {
                garen: 2
            }
        })
        const c = sup(s,
            "basic")
        topCard(s,
            c)
        s = cast(s,
            "A",
            sk(s,
                "A",
                "twistedfate",
                "Q"),
            {
                target: "B:garen"
            }).s
        assert.ok(s.players.A.hand.some((x) => x.uid === c.uid),
            "lên tay")
        assert.ok(!s.players.A.grave.some((x) => x.uid === c.uid))
        assert.ok(!u(s,
            "B",
            "garen").statuses.stun)
    })
test("E: sát thương và chọn 1 trong e3 lá trên cùng đặt lên đỉnh, các lá khác giữ thứ tự",
    () => {
        let s = mk({
            A: {
                twistedfate: 2
            }, B: {
                garen: 2
            }
        })
        const [a,
            b,
            c] = [sup(s,
            "basic"),
        sup(s,
            "gold"),
        sup(s,
            "draw")]
        s.players.A.deck.unshift(a,
            b,
            c)
        const e = card(s,
            "A",
            "twistedfate",
            "E")
        const opts = playOpts(s,
            "A",
            "twistedfate_e").filter((x) => x.args?.target === "B:garen")
        assert.ok(opts.length >= Math.min(3,
            kt.p.e3),
        "mỗi lá xem được là một lựa chọn")
        const hp0 = u(s,
            "B",
            "garen").hp
        s = cast(s,
            "A",
            e,
            {
                target: "B:garen", pick: c.uid
            }).s
        near(hp0 - u(s,
            "B",
            "garen").hp,
        mit(val(s,
            "A",
            "twistedfate",
            "e1 + e2·AP"),
        mr(s,
            "B",
            "garen")))
        assert.deepEqual(s.players.A.deck.slice(0,
            3).map((x) => x.uid),
        [c.uid,
            a.uid,
            b.uid])
    })
test("R: lật r1 lá, lá chiêu gấp đôi, mọi lá lật vào mộ",
    () => {
        let s = mk({
            A: {
                twistedfate: 2
            }, B: {
                garen: 2, ornn: 1, leona: 3
            }
        })
        boost(s,
            "A",
            "twistedfate",
            100)
        const flips = [skill(s,
            "darius",
            "A",
            "Q"),
        sup(s,
            "basic"),
        skill(s,
            "darius",
            "A",
            "E"),
        sup(s,
            "gold")].slice(0,
            kt.p.r1)
        s.players.A.deck.unshift(...flips)
        const raw = val(s,
            "A",
            "twistedfate",
            "r2 + r3·AP")
        const r = cast(s,
            "A",
            sk(s,
                "A",
                "twistedfate",
                "R"))
        s = r.s
        const dmg = r.ev.filter((e) => e.t === "damage" && e.src === "A:twistedfate") as Extract<Ev[number], { t: "damage" }>[]
        assert.equal(dmg.length,
            flips.length)
        const doubled = dmg.filter((e) => Math.abs(e.amount - mit(raw * 2,
            mr(s,
                "B",
                e.target.split(":")[1]))) <= 2 && Math.abs(e.amount - mit(raw,
            mr(s,
                "B",
                e.target.split(":")[1]))) > 2).length
        assert.equal(doubled,
            flips.filter((c) => c.kind === "skill").length)
        for (const c of flips) assert.equal(s.players.A.grave.some((x) => x.uid === c.uid),
            c.kind === "skill" || c.kind === "support",
            `${c.id} vào mộ`)
        assert.ok(!s.players.A.deck.some((x) => flips.some((f) => f.uid === x.uid)),
            "đã rời bộ")
    })
test("nội tại: đầu lượt (sau rút) chủ nhận lá Thần Bài ghi lá trên cùng; đánh thì lá đó xuống đáy",
    () => {
        let s = mk({
            A: {
                twistedfate: 2
            }, B: {
                garen: 2
            }
        })
        s = endTurn(s).s // sang lượt B
        s = endTurn(s).s // về lượt A: sau bước rút
        assert.equal(s.active,
            "A")
        const fate = s.players.A.hand.find((c) => c.id === "tf_fate")
        assert.ok(fate,
            "có lá Thần Bài")
        assert.equal(fate.temp,
            true)
        const top = s.players.A.deck[0]
        assert.equal(String(fate.data?.uid),
            top.uid)
        assert.ok(!s.players.B.hand.some((c) => c.id === "tf_fate"),
            "không cho bên kia")
        const info = cg.cardInfo(gm(s),
            fate)
        assert.ok(info.name.includes(cg.cardInfo(gm(s),
            top).name),
        "tên lá hiện lá trên cùng")
        const play = playOpts(s,
            "A",
            "tf_fate")[0]
        assert.ok(play,
            "đánh được")
        s = act(s,
            play).s
        assert.equal(s.players.A.deck[s.players.A.deck.length - 1].uid,
            top.uid)
        assert.notEqual(s.players.A.deck[0].uid,
            top.uid)
        assert.ok(!s.players.A.hand.some((c) => c.id === "tf_fate"),
            "dùng xong biến mất")
    })
test("nội tại: đỉnh bộ đổi thì Thần Bài cũ không đánh được; không chọn thì biến mất cuối lượt",
    () => {
        let s = mk({
            A: {
                twistedfate: 2
            }, B: {
                garen: 2
            }
        })
        s = endTurn(s).s
        s = endTurn(s).s
        const fate = s.players.A.hand.find((c) => c.id === "tf_fate")!
        s.players.A.deck.unshift(sup(s,
            "gold"))
        assert.equal(playOpts(s,
            "A",
            "tf_fate").length,
        0,
        "đỉnh đã đổi")
        s.players.A.deck.shift()
        assert.ok(playOpts(s,
            "A",
            "tf_fate").length > 0)
        s = endTurn(s).s
        assert.ok(!s.players.A.hand.some((c) => c.uid === fate.uid),
            "hết lượt thì biến mất")
    })

// ======================================================================
G("Vel'Koz")
const decayOf = (s: St, side: S, h: string) => u(s,
    side,
    h).stacks.velkoz_decay ?? 0
test("nội tại: mỗi tia trúng +1 Phân Rã, đủ p1 thì tiêu p1 và nổ sát thương chuẩn",
    () => {
        let s = mk({
            A: {
                velkoz: 2
            }, B: {
                garen: 2
            }
        })
        const r = cast(s,
            "A",
            sk(s,
                "A",
                "velkoz",
                "R"),
            {
            })
        s = r.s
        const rays = kk.p.r1, booms = Math.floor(rays / kk.p.p1)
        assert.equal(decayOf(s,
            "B",
            "garen"),
        rays - booms * kk.p.p1)
        const trueHits = r.ev.filter((e) => e.t === "damage" && e.target === "B:garen" && e.kind === "true")
        assert.equal(trueHits.length,
            booms)
    })
test("nội tại: nổ gây p2 + p3·AP + p4% Máu tối đa mục tiêu sát thương chuẩn",
    () => {
        const s = mk({
            A: {
                velkoz: 2
            }, B: {
                garen: 2
            }
        })
        u(s,
            "B",
            "garen").stacks.velkoz_decay = kk.p.p1 - 1
        const r = cast(s,
            "A",
            sk(s,
                "A",
                "velkoz",
                "E"),
            {
                target: "B:garen"
            })
        const boom = r.ev.find((e) => e.t === "damage" && e.target === "B:garen" && e.kind === "true") as Extract<Ev[number], { t: "damage" }>
        assert.ok(boom,
            "nổ")
        near(boom.amount,
            Math.round(val(r.s,
                "A",
                "velkoz",
                "p2 + p3·AP + p4% máu tối đa mục tiêu",
                u(r.s,
                    "B",
                    "garen"))),
            1)
        // cú đầu của E làm Phân Rã đủ ngưỡng và nổ về 0, cú nổ của khe cộng lại 1
        assert.equal(decayOf(r.s,
            "B",
            "garen"),
        1)
    })
test("nội tại: tướng mang chết mất một nửa Phân Rã, Vel'Koz chết không đổi",
    () => {
        const s = mk({
            A: {
                velkoz: 2
            }, B: {
                garen: 2, ornn: 1
            }
        })
        u(s,
            "B",
            "garen").stacks.velkoz_decay = 4
        u(s,
            "B",
            "ornn").stacks.velkoz_decay = 4
        gm(s).kill(u(s,
            "B",
            "garen"),
        u(s,
            "A",
            "velkoz"))
        assert.equal(decayOf(s,
            "B",
            "garen"),
        2)
        gm(s).kill(u(s,
            "A",
            "velkoz"),
        u(s,
            "B",
            "ornn"))
        assert.equal(decayOf(s,
            "B",
            "ornn"),
        4)
    })
test("Q: tia chính nhẹ, 2 tia phụ ngẫu nhiên nặng hơn, sát thương thuần, mỗi tia +1 Phân Rã",
    () => {
        let s = mk({
            A: {
                velkoz: 2
            }, B: {
                garen: 2, ornn: 1, leona: 3
            }
        })
        boost(s,
            "A",
            "velkoz",
            100)
        const before = Object.fromEntries(["garen",
            "ornn",
            "leona"].map((h) => [h,
            u(s,
                "B",
                h).hp]))
        s = cast(s,
            "A",
            sk(s,
                "A",
                "velkoz",
                "Q"),
            {
                target: "B:garen"
            }).s
        near(before.garen - u(s,
            "B",
            "garen").hp,
        mit(val(s,
            "A",
            "velkoz",
            "q1 + q2·AP"),
        mr(s,
            "B",
            "garen")))
        const others = ["ornn",
            "leona"].filter((h) => u(s,
            "B",
            h).hp < before[h])
        assert.equal(others.length,
            2,
            "đúng 2 tia phụ vào 2 địch còn lại")
        for (const h of others) {
            near(before[h] - u(s,
                "B",
                h).hp,
            mit(val(s,
                "A",
                "velkoz",
                "q3 + q4·AP"),
            mr(s,
                "B",
                h)))
            assert.equal(decayOf(s,
                "B",
                h),
            1)
        }
        assert.ok(before.garen - u(s,
            "B",
            "garen").hp < before[others[0]] - u(s,
            "B",
            others[0]).hp,
        "tia phụ ngẫu nhiên nặng hơn tia chính")
        assert.equal(decayOf(s,
            "B",
            "garen"),
        1)
    })
test("E: đánh ngay rồi khe nổ ngay, thêm e3% máu đã mất (tính sau cú đầu); cuối lượt không đánh nữa",
    () => {
        let s = mk({
            A: {
                velkoz: 2
            }, B: {
                garen: 2
            }
        })
        boost(s,
            "A",
            "velkoz",
            100)
        const hp0 = u(s,
            "B",
            "garen").hp
        const r = cast(s,
            "A",
            sk(s,
                "A",
                "velkoz",
                "E"),
            {
                target: "B:garen"
            })
        s = r.s
        const hits = (r.ev.filter((e) => e.t === "damage" && e.target === "B:garen" && e.kind === "magic") as Extract<Ev[number], { t: "damage" }>[]).map((e) => e.amount)
        assert.equal(hits.length,
            2,
            "cú đầu và cú nổ")
        const one = mit(val(s,
            "A",
            "velkoz",
            "e1 + e2·AP"),
        mr(s,
            "B",
            "garen"))
        near(hits[0],
            one)
        near(hits[1],
            mit(Math.round(kk.p.e3 / 100 * hits[0]),
                mr(s,
                    "B",
                    "garen")),
            2)
        near(hp0 - u(s,
            "B",
            "garen").hp,
        hits[0] + hits[1])
        assert.equal(decayOf(s,
            "B",
            "garen"),
        2,
        "mỗi cú +1 Phân Rã")
        assert.equal(dmgOn(endTurn(s).ev,
            "B:garen"),
        0,
        "không còn nhịp cuối lượt")
    })
test("E: khe nứt cắt ngang tâm và 2 đường kề, cú đầu như nhau, đường xa không dính",
    () => {
        const s = mk({
            A: {
                velkoz: 2
            }, B: {
                garen: 1, ornn: 2, leona: 3, braum: 4
            }
        })
        boost(s,
            "A",
            "velkoz",
            100)
        const hpBefore = u(s,
            "B",
            "braum").hp
        const r = cast(s,
            "A",
            sk(s,
                "A",
                "velkoz",
                "E"),
            {
                target: "B:ornn"
            })
        for (const h of ["garen",
            "ornn",
            "leona"]) {
            const first = r.ev.find((e) => e.t === "damage" && e.target === `B:${h}` && e.kind === "magic") as Extract<Ev[number], { t: "damage" }>
            assert.ok(first,
                `${h} nằm trong 3 đường`)
            near(first.amount,
                mit(val(r.s,
                    "A",
                    "velkoz",
                    "e1 + e2·AP"),
                mr(r.s,
                    "B",
                    h)),
                1)
        }
        assert.equal(u(r.s,
            "B",
            "braum").hp,
        hpBefore,
        "đường thứ 4 không dính")
    })
test("E: mục tiêu chết vì cú đầu thì không nổ thêm",
    () => {
        const s = mk({
            A: {
                velkoz: 2
            }, B: {
                garen: 2
            }
        })
        u(s,
            "B",
            "garen").hp = 1
        const r = cast(s,
            "A",
            sk(s,
                "A",
                "velkoz",
                "E"),
            {
                target: "B:garen"
            })
        const hits = r.ev.filter((e) => e.t === "damage" && e.target === "B:garen" && e.kind === "magic")
        assert.equal(hits.length,
            1)
    })
test("R: r1 tia ngẫu nhiên (chỉ 1 địch trên sân nên cả r1 tia vào nó), mỗi tia sát thương thuần như nhau",
    () => {
        const s = mk({
            A: {
                velkoz: 2
            }, B: {
                garen: 2
            }
        })
        u(s,
            "B",
            "garen").maxHp = u(s,
            "B",
            "garen").hp = 9000
        const r = cast(s,
            "A",
            sk(s,
                "A",
                "velkoz",
                "R"),
            {
            })
        const rays = (r.ev.filter((e) => e.t === "damage" && e.target === "B:garen" && e.kind === "magic") as Extract<Ev[number], { t: "damage" }>[]).map((e) => e.amount)
        assert.equal(rays.length,
            kk.p.r1)
        assert.ok(rays.every((x) => Math.abs(x - rays[0]) <= 1),
            "không còn cộng theo Máu đã mất: các tia bằng nhau")
        near(rays[0],
            mit(val(r.s,
                "A",
                "velkoz",
                "r2 + r3·AP"),
            mr(r.s,
                "B",
                "garen")))
    })

// ======================================================================
G("Rumble")
test("Q: địch đối diện và 2 đường kề nhận sát thương, đường xa thì không",
    () => {
        let s = mk({
            A: {
                rumble: 2
            }, B: {
                garen: 2, ornn: 1, leona: 3, ahri: 0, zed: 4
            }
        })
        boost(s,
            "A",
            "rumble",
            100)
        const hp0 = Object.fromEntries(["garen",
            "ornn",
            "leona",
            "ahri",
            "zed"].map((h) => [h,
            u(s,
                "B",
                h).hp]))
        s = cast(s,
            "A",
            sk(s,
                "A",
                "rumble",
                "Q")).s
        const raw = val(s,
            "A",
            "rumble",
            "q1 + q2·AP")
        for (const h of ["garen",
            "ornn",
            "leona"]) near(hp0[h] - u(s,
            "B",
            h).hp,
        mit(raw,
            mr(s,
                "B",
                h)),
        2)
        assert.equal(u(s,
            "B",
            "ahri").hp,
        hp0.ahri)
        assert.equal(u(s,
            "B",
            "zed").hp,
        hp0.zed)
    })
test("E Quick: nối khi địch nhắm đúng Rumble, mục tiêu là kẻ đó, nhận Khiên",
    () => {
        let s = mk({
            A: {
                rumble: 2, ahri: 1
            }, B: {
                garen: 2, ornn: 1
            }
        })
        s.players.A.hand.push(skill(s,
            "rumble",
            "A",
            "E"))
        s = attackOpen(s,
            "B:garen",
            "A:rumble").s
        const opts = chainOpts(s,
            "A",
            "rumble_e")
        assert.ok(opts.length > 0)
        assert.ok(opts.every((o) => o.args?.target === "B:garen"),
            "mục tiêu khoá vào kẻ đang đánh")
        const a0 = act(s,
            opts[0])
        const r = pass(a0.s,
            a0.ev)
        s = r.s
        const hit = r.ev.find((e) => e.t === "damage" && e.src === "A:rumble" && e.target === "B:garen") as Extract<Ev[number], { t: "damage" }>
        assert.ok(hit,
            "E gây sát thương lên kẻ đó")
        near(hit.amount,
            mit(val(s,
                "A",
                "rumble",
                "e1 + e2·AP"),
            mr(s,
                "B",
                "garen")),
            2)
        const sh = r.ev.find((e) => e.t === "shield" && e.target === "A:rumble") as Extract<Ev[number], { t: "shield" }>
        assert.ok(sh,
            "nhận Khiên")
        near(sh.amount,
            val(s,
                "A",
                "rumble",
                "e3 + e4·AP"),
            1)
        let t = mk({
            A: {
                rumble: 2, ahri: 1
            }, B: {
                garen: 2, ornn: 1
            }
        })
        t.players.A.hand.push(skill(t,
            "rumble",
            "A",
            "E"))
        t = attackOpen(t,
            "B:ornn",
            "A:ahri").s
        assert.equal(chainOpts(t,
            "A",
            "rumble_e").length,
        0)
    })
/** Bỏ vào mộ A các lá chiêu: darius_q, nami_e, ahri_q, lux_r (R), garen_e */
const seedGrave = (s: St) => {
    const g = gm(s)
    for (const [h,
        k] of [["darius",
            "Q"],
        ["nami",
            "E"],
        ["lux",
            "R"]] as [string, cg.SkillKey][]) s.players.A.grave.push(g.skillCard(h,
        "A",
        k))
}
/** Đặt lên tay A một lá chiêu của tướng `hero` */
const giveSkill = (s: St, hero: string, key: cg.SkillKey) => {
    const c = gm(s).skillCard(hero,
        "A",
        key)
    s.players.A.hand.push(c)
    return c
}
const recycleActs = (s: St) => cg.legalActions(s,
    "A").filter((a) => a.t === "ability" && a.id === "rumble_recycle") as Extract<Act, { t: "ability" }>[]
const graveIdOf = (s: St, uid?: string) => s.players.A.grave.find((c) => c.uid === uid)?.id
test("nội tại: vứt Q/E của đồng minh thì chỉ lấy được Q hoặc E trong mộ, không lấy R",
    () => {
        const s = mk({
            A: {
                rumble: 2, ahri: 1
            }, B: {
                garen: 2
            }
        })
        s.players.A.hand = []
        seedGrave(s)
        const d = giveSkill(s,
            "ahri",
            "Q")
        const acts = recycleActs(s)
        assert.ok(acts.length > 0)
        assert.ok(acts.every((a) => a.args?.discard?.[0] === d.uid))
        const ids = acts.map((a) => graveIdOf(s,
            a.args?.pick))
        assert.deepEqual([...new Set(ids)].sort(),
            ["darius_q",
                "nami_e"])
    })
test("nội tại: vứt R của đồng minh thì lấy được cả R, Q, E",
    () => {
        const s = mk({
            A: {
                rumble: 2, ahri: 1
            }, B: {
                garen: 2
            }
        })
        s.players.A.hand = []
        seedGrave(s)
        giveSkill(s,
            "ahri",
            "R")
        const ids = recycleActs(s).map((a) => graveIdOf(s,
            a.args?.pick))
        assert.deepEqual([...new Set(ids)].sort(),
            ["darius_q",
                "lux_r",
                "nami_e"])
    })
test("nội tại: không vứt được lá của chính Rumble; không có lá đồng minh thì nút tắt",
    () => {
        const s = mk({
            A: {
                rumble: 2
            }, B: {
                garen: 2
            }
        })
        s.players.A.hand = []
        seedGrave(s)
        giveSkill(s,
            "rumble",
            "Q")
        assert.equal(recycleActs(s).length,
            0)
    })
test("nội tại: lá vứt vào mộ, lá mộ mất, Rumble nhận Lá Tái Chế (AD sang AP, không khống chế, giảm p1 mana)",
    () => {
        let s = mk({
            A: {
                rumble: 2, ahri: 1
            }, B: {
                garen: 2
            }
        })
        s.players.A.hand = []
        seedGrave(s)
        const d = giveSkill(s,
            "ahri",
            "E")
        const a = recycleActs(s).find((x) => graveIdOf(s,
            x.args?.pick) === "darius_q")!
        const graveUid = a.args!.pick
        s = act(s,
            a).s
        assert.ok(!s.players.A.hand.some((c) => c.uid === d.uid),
            "lá đồng minh rời tay")
        assert.ok(s.players.A.grave.some((c) => c.uid === d.uid),
            "lá vứt vào mộ")
        assert.ok(!s.players.A.grave.some((c) => c.uid === graveUid),
            "lá mộ bị lấy")
        const rec = s.players.A.hand.find((c) => c.id === "darius_q")!
        assert.ok(rec,
            "có Lá Tái Chế")
        assert.equal(rec.temp,
            true)
        assert.equal(rec.hero,
            "rumble")
        assert.equal(rec.data?.recycled,
            "darius")
        assert.equal(rec.data?.manaOff,
            kr.p.p1)
        assert.equal(rec.data?.apPerAd,
            kr.p.p2)
    })
test("nội tại: một lần mỗi lượt, lượt sau lại được",
    () => {
        let s = mk({
            A: {
                rumble: 2, ahri: 1
            }, B: {
                garen: 2
            }
        })
        s.players.A.hand = []
        seedGrave(s)
        giveSkill(s,
            "ahri",
            "Q")
        giveSkill(s,
            "ahri",
            "E")
        s = act(s,
            recycleActs(s)[0]).s
        assert.equal(recycleActs(s).length,
            0,
            "đã dùng trong lượt")
        s.turnNo += 1 // sang lượt sau của A (mốc một lần mỗi lượt tính theo turnNo)
        assert.ok(recycleActs(s).length > 0,
            "lượt sau dùng lại được")
    })
test("R: mọi địch nhận sát thương, không còn tái chế",
    () => {
        const s = mk({
            A: {
                rumble: 2
            }, B: {
                garen: 1, ornn: 2, leona: 3
            }
        })
        seedGrave(s)
        const hand0 = s.players.A.hand.length
        const r = cast(s,
            "A",
            sk(s,
                "A",
                "rumble",
                "R"))
        for (const h of ["garen",
            "ornn",
            "leona"]) assert.ok(dmgOn(r.ev,
            `B:${h}`) > 0,
        `${h} trúng`)
        assert.ok(r.s.players.A.hand.length <= hand0,
            "không có lá chọn hay Lá Tái Chế mới")
        assert.ok(!r.s.players.A.hand.some((c) => c.data?.recycled))
    })
test("Lá Tái Chế: Rumble tung chiêu gốc, giảm p1 mana, không áp khống chế, dùng xong biến mất",
    () => {
        const s = mk({
            A: {
                rumble: 2, lux: 1
            }, B: {
                garen: 2
            }
        })
        boost(s,
            "A",
            "rumble",
            3000)
        // Lux E có Choáng khi Lux (ở đây là người tung = Rumble) đủ Ánh Sáng; Lá Tái Chế không được áp Choáng
        u(s,
            "A",
            "rumble").stacks.lux_pool = kl.p.e3
        const g = gm(s)
        const base = g.tempSkillCard("rumble",
            "A",
            "E",
            {
                recycled: "lux", apPerAd: kr.p.p2, manaOff: kr.p.p1
            })
        const rec: cg.Card = {
            ...base, id: "lux_e"
        }
        const m0 = manaOf(s,
            "A")
        const hp0 = u(s,
            "B",
            "garen").hp
        const r = cast(s,
            "A",
            rec,
            {
                target: "B:garen"
            })
        assert.equal(m0 - manaOf(r.s,
            "A"),
        Math.max(0,
            kl.p.e0 - kr.p.p1),
        "giảm p1 mana")
        assert.ok(hp0 > u(r.s,
            "B",
            "garen").hp,
        "gây sát thương")
        assert.ok(!u(r.s,
            "B",
            "garen").statuses.stun,
        "không áp Choáng")
        assert.ok(!r.s.players.A.hand.some((c) => c.uid === rec.uid) && !r.s.players.A.grave.some((c) => c.uid === rec.uid),
            "biến mất, không vào mộ")
        // đối chứng: Lux thật cùng điều kiện thì Choáng
        let t = mk({
            A: {
                lux: 2
            }, B: {
                garen: 2
            }
        })
        boost(t,
            "A",
            "lux",
            400)
        tank(t,
            "B",
            "garen")
        t = cast(t,
            "A",
            sk(t,
                "A",
                "lux",
                "E"),
            {
                target: "B:garen"
            }).s
        t.units["A:lux"].stacks.lux_pool = kl.p.e3
        t = cast(t,
            "A",
            sk(t,
                "A",
                "lux",
                "E"),
            {
                target: "B:garen"
            }).s
        assert.ok(u(t,
            "B",
            "garen").statuses.stun,
        "đối chứng: Lux thật có Choáng")
    })
test("Lá Tái Chế: AD của Rumble = AP / p2 khi tung",
    () => {
        const s = mk({
            A: {
                rumble: 2
            }, B: {
                garen: 2
            }
        })
        boost(s,
            "A",
            "rumble",
            400)
        const g = gm(s), rum = u(s,
            "A",
            "rumble")
        const ad0 = g.atk(rum)
        g.recycling = {
            unit: rum.id, apPerAd: kr.p.p2
        }
        assert.equal(g.atk(rum),
            Math.round(g.ap(rum) / kr.p.p2))
        g.recycling = null
        assert.equal(g.atk(rum),
            ad0)
    })
test("cardInfo: lá Tái Chế có tên dễ hiểu",
    () => {
        const s = mk({
            A: {
                rumble: 2
            }, B: {
                garen: 2
            }
        })
        const g = gm(s)
        const rec = g.tempSkillCard("rumble",
            "A",
            "Q",
            {
                recycled: "darius", apPerAd: 2, manaOff: 10
            })
        const ri = cg.cardInfo(g,
            {
                ...rec, id: "darius_q"
            })
        assert.ok(ri.name.includes(cg.getHero("darius")!.name) && ri.desc.length > 0,
            `tên lá tái chế: ${ri.name}`)
    })

report()
