// Test tương tác giữa các bộ chiêu mới (luật chung, vị trí, đường có tướng đã chết, chọn mục tiêu, khống chế theo đơn vị, bot).
// Gom các ca còn đúng từ bộ test tướng cũ (card_tests_heroes_*, card_tests_balance_*); số lấy từ cg.kit(id).p để sửa JSON không vỡ test.
// Chạy: npx tsx scripts/card_tests_kits_interactions.ts [--only=chuỗi] [--verbose]
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    mk, cast, basic, endTurn, act, u, dmgOn, test, G, report, gm, skill, type St, type Ev
} from "./kit_test_util"

// Địch giả: giáp/kháng 0, máu lớn
for (let i = 1; i <= 5; i++) cg.stubHero({
    id: `ki${i}`, name: `Dummy ${i}`, role: "marksman", damage: "physical", hp: 5000, atk: 10, armor: 0, mr: 0, passive: "-"
})
const B5: Record<string, number> = {
    ki1: 0, ki2: 1, ki3: 2, ki4: 3, ki5: 4
}
/** Phe A: tướng khai báo + tướng giả lấp các đường còn lại; phe B: 5 tướng giả ở đường 0..4 */
function fresh(main: Record<string, number>, b: Record<string, number> = B5): St {
    const used = new Set(Object.values(main))
    const a: Record<string, number> = {
        ...main
    }
    let i = 1
    for (let l = 0; l < 5; l++) if (!used.has(l)) a[`ki${i++}`] = l
    return mk({
        A: a, B: b
    })
}
const P = (id: string) => cg.kit(id).p
const hand = (s: St, side: "A" | "B", c: cg.Card) => { s.players[side].hand.push(c); return c }
const canPlay = (s: St, side: "A" | "B", c: cg.Card, args?: cg.PlayArgs) => cg.legalActions(s,
    side).some((a) => a.t === "play" && a.uid === c.uid && (!args || JSON.stringify(a.args ?? {
}) === JSON.stringify(args)))
const targetsOf = (s: St, c: cg.Card) => cg.legalActions(s,
    "A").filter((a) => a.t === "play" && a.uid === c.uid).map((a) => (a as Extract<typeof a, { t: "play" }>).args?.target)
/** Đặt tạm tham số JSON (test xác suất), trả lại sau khi chạy */
function withParams(id: string, patch: Record<string, number>, fn: () => void) {
    const params = cg.kit(id).raw.params
    const old = {
        ...params
    }
    Object.assign(params,
        patch)
    try { fn() } finally { Object.assign(params,
        old) }
}
const evOf = <T extends Ev[number]["t"]>(ev: Ev, t: T) => ev.filter((e) => e.t === t) as Extract<Ev[number], { t: T }>[]

// ======================================================================
G("Đường có tướng đã chết: chiêu dịch chuyển vẫn đổi chỗ với tướng chết")
// ======================================================================
/** A: hero ở đường 1, đồng minh giả ở đường 3 đã chết (ô còn giữ chỗ). Trả [state, id tướng chết] */
function deadAllyAt3(hero: string): [St, string] {
    const s = fresh({
        [hero]: 1
    })
    const id = s.lanes.A[3]!
    gm(s).kill(s.units[id])
    assert.equal(s.lanes.A[3],
        id,
        "ô được giữ cho tướng chết")
    return [s,
        id]
}
function expectSwapWithDead(s: St, deadId: string, hero: string, c: cg.Card, args: cg.PlayArgs, victim: string) {
    assert.ok(canPlay(s,
        "A",
        c,
        args),
    "vẫn chọn được dù ô đích giữ cho tướng chết")
    const r = cast(s,
        "A",
        c,
        args)
    assert.equal(u(r.s,
        "A",
        hero).lane,
    3,
    "tới đối diện con mồi")
    assert.equal(r.s.lanes.A[1],
        deadId,
        "tướng chết đi theo ô về đường cũ")
    assert.ok(dmgOn(r.ev,
        victim) > 0,
    "con mồi nhận sát thương sau khi đổi chỗ")
    return r
}
test("Zed E: ô đối diện con mồi giữ cho đồng minh chết thì vẫn swap rồi mới gây sát thương",
    () => {
        const [s,
            dead] = deadAllyAt3("zed")
        expectSwapWithDead(s,
            dead,
            "zed",
            hand(s,
                "A",
                skill(s,
                    "zed",
                    "A",
                    "E")),
            {
                target: "B:ki4"
            },
            "B:ki4")
    })
test("Kha'Zix E: ô đối diện con mồi giữ cho đồng minh chết thì vẫn swap rồi mới gây sát thương",
    () => {
        const [s,
            dead] = deadAllyAt3("khazix")
        expectSwapWithDead(s,
            dead,
            "khazix",
            hand(s,
                "A",
                skill(s,
                    "khazix",
                    "A",
                    "E")),
            {
                target: "B:ki4"
            },
            "B:ki4")
    })
test("Katarina Q: ô đối diện con mồi giữ cho đồng minh chết thì vẫn swap rồi mới gây sát thương",
    () => {
        const [s,
            dead] = deadAllyAt3("katarina")
        expectSwapWithDead(s,
            dead,
            "katarina",
            hand(s,
                "A",
                skill(s,
                    "katarina",
                    "A",
                    "Q")),
            {
                target: "B:ki4"
            },
            "B:ki4")
    })
test("Katarina E (Quick, đường có Dao): đường đích giữ cho đồng minh chết thì vẫn swap tới đó",
    () => {
        const [s,
            dead] = deadAllyAt3("katarina")
        gm(s).addMarker("A",
            3,
            "dagger")
        expectSwapWithDead(s,
            dead,
            "katarina",
            hand(s,
                "A",
                skill(s,
                    "katarina",
                    "A",
                    "E")),
            {
                lane: 3
            },
            "B:ki4")
    })
test("Qiyana E: ô đối diện con mồi giữ cho đồng minh chết thì vẫn swap rồi mới gây sát thương",
    () => {
        const [s,
            dead] = deadAllyAt3("qiyana")
        expectSwapWithDead(s,
            dead,
            "qiyana",
            hand(s,
                "A",
                skill(s,
                    "qiyana",
                    "A",
                    "E")),
            {
                target: "B:ki4"
            },
            "B:ki4")
    })
test("Darius R: đồng minh giữ ô đối diện mục tiêu đã chết thì Darius swap với tướng chết rồi mới xả Chảy Máu",
    () => {
        const [s,
            dead] = deadAllyAt3("darius")
        const g = gm(s), t = s.units["B:ki4"]
        g.setStack(t,
            "bleed",
            2)
        g.timed(s.units["A:darius"],
            t,
            "bleed_t",
            P("darius").p3,
            {
                v: 2
            })
        const r = expectSwapWithDead(s,
            dead,
            "darius",
            hand(s,
                "A",
                skill(s,
                    "darius",
                    "A",
                    "R")),
            {
                target: "B:ki4"
            },
            "B:ki4")
        assert.equal(r.s.units["B:ki4"].stacks.bleed ?? 0,
            0,
            "R tiêu hết Chảy Máu")
    })
test("Darius E: kẻ giữ ô đối diện Darius đã chết thì vẫn kéo được địch khác đường, swap với tướng chết rồi gây sát thương",
    () => {
        const s = fresh({
            darius: 1
        })
        gm(s).kill(s.units["B:ki2"])
        const e = hand(s,
            "A",
            skill(s,
                "darius",
                "A",
                "E"))
        assert.ok(canPlay(s,
            "A",
            e,
            {
                target: "B:ki4"
            }))
        const r = cast(s,
            "A",
            e,
            {
                target: "B:ki4"
            })
        assert.equal(r.s.units["B:ki4"].lane,
            1,
            "con mồi kéo về đối diện Darius")
        assert.equal(r.s.units["B:ki2"].lane,
            3,
            "tướng chết đổi sang đường con mồi")
        assert.ok(dmgOn(r.ev,
            "B:ki4") > 0)
    })
test("Q đánh đối diện: địch đối diện đã chết thì không đánh được (không bắn xa)",
    () => {
        for (const hero of ["darius",
            "zed",
            "khazix",
            "qiyana"]) {
            const s = fresh({
                [hero]: 1
            })
            gm(s).kill(s.units["B:ki2"])
            const q = hand(s,
                "A",
                skill(s,
                    hero,
                    "A",
                    "Q"))
            assert.ok(!canPlay(s,
                "A",
                q),
            `${hero} Q không đánh được vào ô có tướng chết`)
            assert.throws(() => cast(s,
                "A",
                q,
                {
                }),
            undefined,
            `${hero} Q`)
        }
    })

// ======================================================================
G("Kha'Zix E: chọn mục tiêu và cửa sổ Chuỗi")
// ======================================================================
/** Phe B có Leona ở đường 4 với lá E trên tay để mở cửa sổ Chuỗi; con mồi ki4 ở đường 3 (A: tướng giả ở đường 3) */
function khazixQueued() {
    const s = mk({
        A: {
            khazix: 1, ki1: 3
        }, B: {
            ki1: 0, ki2: 1, ki3: 3, leona: 4, ki5: 2
        }
    })
    hand(s,
        "B",
        skill(s,
            "leona",
            "B",
            "E"))
    const e = hand(s,
        "A",
        skill(s,
            "khazix",
            "A",
            "E"))
    const queued = act(s,
        {
            t: "play", side: "A", uid: e.uid, args: {
                target: "B:ki3"
            }
        })
    assert.equal(queued.s.phase,
        "chain")
    return queued
}
function settle(r: { s: St; ev: Ev }) {
    let s = r.s
    const ev: Ev = [...r.ev]
    for (let i = 0; i < 20 && s.phase === "chain" && s.chain; i++) {
        const o = act(s,
            {
                t: "pass", side: s.chain.priority
            })
        s = o.s; ev.push(...o.ev)
    }
    return {
        s, ev
    }
}
test("E: ô đối diện con mồi trống thì engine dời thẳng tới; đang đối diện thì đánh tại chỗ, không phát move giả",
    () => {
        for (const lane of [1,
            3]) {
            withParams("khazix",
                {
                    p1: 1, p2: 0, p3: 0
                },
                () => {
                    const s = mk({
                        A: {
                            khazix: 1
                        }, B: {
                            ki1: lane
                        }
                    })
                    const r = cast(s,
                        "A",
                        hand(s,
                            "A",
                            skill(s,
                                "khazix",
                                "A",
                                "E")),
                        {
                            target: "B:ki1"
                        })
                    assert.equal(u(r.s,
                        "A",
                        "khazix").lane,
                    lane)
                    assert.equal(evOf(r.ev,
                        "move").length,
                    lane === 1 ? 0 : 1)
                    if (lane === 3) assert.equal(r.s.lanes.A[1],
                        null,
                        "ô cũ bỏ trống, không ai bị kéo theo")
                    assert.ok(dmgOn(r.ev,
                        "B:ki1") > 0)
                })
        }
    })
test("E: chọn con mồi tôn trọng Khiêu Khích và không nhắm tướng Tàng Hình",
    () => {
        const s = fresh({
            khazix: 1
        })
        const g = gm(s), card = hand(s,
            "A",
            skill(s,
                "khazix",
                "A",
                "E"))
        g.status(s.units["B:ki3"],
            "taunt",
            1)
        assert.deepEqual(targetsOf(s,
            card),
        ["B:ki3"])
        g.status(s.units["B:ki3"],
            "stealth",
            1)
        assert.deepEqual(targetsOf(s,
            card),
        [],
        "Khiêu Khích không cho bỏ qua tướng không thể bị chỉ định")
    })
test("E: đồng minh ở ô đích chết lúc chờ Chuỗi thì Kha'Zix vẫn swap với tướng chết rồi gây sát thương",
    () => {
        const queued = khazixQueued()
        const deadId = queued.s.lanes.A[3]!
        gm(queued.s).kill(queued.s.units[deadId])
        const r = settle(queued)
        assert.equal(u(r.s,
            "A",
            "khazix").lane,
        3)
        assert.equal(r.s.lanes.A[1],
            deadId)
        assert.ok(dmgOn(r.ev,
            "B:ki3") > 0)
    })
test("E: đồng minh rời ô đích lúc chờ Chuỗi (ô trống) thì engine dời thẳng Kha'Zix tới rồi mới gây sát thương",
    () => {
        const queued = khazixQueued()
        gm(queued.s).moveTo(queued.s.units[queued.s.lanes.A[3]!],
            0)
        assert.equal(queued.s.lanes.A[3],
            null)
        const r = settle(queued)
        assert.equal(u(r.s,
            "A",
            "khazix").lane,
        3)
        assert.ok(dmgOn(r.ev,
            "B:ki3") > 0)
    })
test("E: con mồi Tàng Hình trong lúc chờ Chuỗi thì không nhảy và không gây sát thương",
    () => {
        const queued = khazixQueued()
        gm(queued.s).status(queued.s.units["B:ki3"],
            "stealth",
            1)
        const r = settle(queued)
        assert.equal(u(r.s,
            "A",
            "khazix").lane,
        1)
        assert.equal(evOf(r.ev,
            "move").length,
        0)
        assert.equal(dmgOn(r.ev,
            "B:ki3"),
        0)
    })

// ======================================================================
G("Khống chế theo đơn vị (law.md 4) qua g.timed")
// ======================================================================
test("d nguyên: Choáng 1 đơn vị trong lượt mình hết cuối lượt địch kế",
    () => {
        const s = fresh({
            zed: 1
        })
        const g = gm(s), foe = s.units["B:ki1"]
        g.timed(s.units["A:zed"],
            foe,
            "stun",
            1)
        assert.ok(g.has(foe,
            "stun"))
        assert.equal(foe.statuses.stun.until,
            g.unitsUntil(s.units["A:zed"],
                1))
        const s1 = endTurn(s).s // sang lượt B: vẫn Choáng
        assert.ok(gm(s1).has(s1.units["B:ki1"],
            "stun"),
        "còn Choáng suốt lượt địch kế")
        const s2 = endTurn(s1).s // hết lượt B
        assert.ok(!gm(s2).has(s2.units["B:ki1"],
            "stun"),
        "hết cuối lượt địch kế")
    })
test("d nguyên: Choáng 1 đơn vị tung trong lượt ĐỊCH (Quick) thì hết chính lượt đó",
    () => {
        const s = fresh({
            zed: 1
        })
        s.active = "B"
        const g = gm(s), foe = s.units["B:ki1"]
        g.timed(s.units["A:zed"],
            foe,
            "stun",
            1)
        assert.ok(g.has(foe,
            "stun"))
        assert.equal(foe.statuses.stun.until,
            s.turnNo,
            "hết cuối lượt hiện tại")
        assert.equal(foe.statuses.stun.until,
            g.unitsUntil(s.units["A:zed"],
                1))
        const s1 = endTurn(s).s // hết lượt B: gỡ
        assert.ok(!gm(s1).has(s1.units["B:ki1"],
            "stun"),
        "hết ngay cuối lượt đang diễn ra")
    })
test("phần lẻ: d < 1 chỉ tung một lần (có khi gắn, có khi trượt); stasis chặn hiệu ứng khống chế của địch",
    () => {
        let hit = 0, miss = 0
        for (let seed = 1; seed <= 40; seed++) {
            const s = fresh({
                zed: 1
            })
            s.seed = seed; s.rng = seed
            const g = gm(s), foe = s.units["B:ki1"]
            g.timed(s.units["A:zed"],
                foe,
                "stun",
                0.5)
            if (g.has(foe,
                "stun")) { hit++; assert.equal(foe.statuses.stun.until,
                g.unitsUntil(s.units["A:zed"],
                    1),
                "trúng thì đúng 1 đơn vị") } else miss++
        }
        assert.ok(hit > 0 && miss > 0,
            `cả hai kết quả đều xảy ra (trúng ${hit}, trượt ${miss})`)
        const s = fresh({
            zed: 1
        })
        const g = gm(s), foe = s.units["B:ki1"]
        g.status(foe,
            "stasis",
            1)
        g.timed(s.units["A:zed"],
            foe,
            "stun",
            2,
            {
                src: "A:zed"
            })
        assert.ok(!g.has(foe,
            "stun"))
    })
test("Choáng huỷ liên kết của chính mình trên Chuỗi: kẻ đang chờ giải quyết bị Choáng thì chiêu hụt",
    () => {
    // A đánh chiêu nhắm B; B có Leona E: Choáng người tung (Leona E) làm chiêu bị huỷ
        const s = fresh({
            garen: 1
        },
        {
            ki1: 0, ki2: 1, leona: 2, ki4: 3, ki5: 4
        })
        hand(s,
            "B",
            skill(s,
                "leona",
                "B",
                "E"))
        const q = hand(s,
            "A",
            skill(s,
                "garen",
                "A",
                "Q"))
        const hp0 = s.units["B:ki2"].hp
        const open = act(s,
            {
                t: "play", side: "A", uid: q.uid, args: {
                }
            })
        assert.equal(open.s.phase,
            "chain")
        const leonaE = cg.legalActions(open.s,
            "B").find((a) => a.t === "chain")
        assert.ok(leonaE,
            "Leona nối được")
        const r = settle(act(open.s,
leonaE!))
        assert.ok(!r.ev.some((e) => e.t === "damage" && e.target === "B:ki2" && e.tag === "skill"),
            "Q của Garen bị huỷ")
        assert.equal(r.s.units["B:ki2"].hp,
            hp0)
    })

// ======================================================================
G("Tương tác Liên Hoàn / Dấu Ấn / Nấm / Phân Rã")
// ======================================================================
test("Zed Liên Hoàn: đòn đánh có sát thương cộng thêm của Q vẫn chỉ là một nhịp",
    () => {
        const s = fresh({
            zed: 1
        })
        const q = cast(s,
            "A",
            hand(s,
                "A",
                skill(s,
                    "zed",
                    "A",
                    "Q")),
            {
            })
        const base = q.s.units["A:zed"].stacks.zed_chain ?? gm(q.s).statusV(q.s.units["A:zed"],
            "zed_chain")
        const r = basic(q.s,
            "A",
            "A:zed",
            "B:ki2")
        const after = r.s.units["A:zed"].stacks.zed_chain ?? gm(r.s).statusV(r.s.units["A:zed"],
            "zed_chain")
        assert.equal(after - base,
            1,
            "một đòn = một Liên Hoàn dù có sát thương cộng")
    })
test("Zed R: hai lá R trong một lượt lập hai Dấu Ấn riêng, mỗi cái nổ một lần cuối lượt",
    () => {
        const s = fresh({
            zed: 1
        })
        cast(s,
            "A",
            hand(s,
                "A",
                skill(s,
                    "zed",
                    "A",
                    "R")),
            {
            })
        const s1 = cast(s,
            "A",
            hand(s,
                "A",
                skill(s,
                    "zed",
                    "A",
                    "R")),
            {
            }).s
        const e = endTurn(s1)
        const booms = e.ev.filter((x) => x.t === "damage" && x.target === "B:ki2" && x.tag !== "attack" && x.src === "A:zed")
        assert.ok(booms.length >= 1,
            "Dấu Ấn nổ cuối lượt")
        assert.ok(!gm(e.s).has(u(e.s,
            "B",
            "ki2"),
        "zed_mark"),
        "Dấu Ấn đã tiêu")
    })
test("Teemo: Nấm rút trúng vẫn nổ khi Teemo đã chết (dùng chỉ số đơn vị Teemo)",
    () => {
        const s = mk({
            A: {
                teemo: 2
            }, B: {
                braum: 2, zed: 1
            }
        })
        const g = gm(s)
        s.players.B.deck.unshift(g.newCard({
            kind: "special", id: "mushroom", hero: "teemo", side: "B"
        }))
        u(s,
            "B",
            "zed").hp = Math.floor(u(s,
            "B",
            "zed").maxHp / 2)
        g.kill(u(s,
            "A",
            "teemo"))
        const h0 = u(s,
            "B",
            "zed").hp
        g.draw("B",
            1,
            {
                reason: "turn"
            })
        assert.ok(u(s,
            "B",
            "zed").hp < h0,
        "Nấm vẫn nổ lên tướng tỉ lệ Máu thấp nhất")
        assert.ok(g.events.some((e) => e.t === "mushroom" && e.phase === "burst"))
    })
test("Vel'Koz: đầu lượt không còn lá tạm Phân Rã (nội tại chỉ cộng Phân Rã khi chiêu trúng)",
    () => {
        const s = mk({
            A: {
                velkoz: 2
            }, B: {
                braum: 2
            }
        })
        const s2 = endTurn(endTurn(s).s).s
        assert.ok(!s2.players.A.hand.some((c) => c.temp && c.hero === "velkoz" && c.kind !== "skill"),
            "không có lá tạm riêng của Phân Rã")
    })
test("Braum: chỉ đòn đánh trúng Braum cho Song Giáp; chiêu nhắm Braum thì không",
    () => {
        const songGiap = (st: St) => Object.values(st.units["A:braum"].stacks).reduce((n, x) => n + x,
            0)
        const s = fresh({
            braum: 1
        })
        s.active = "B"
        const r = basic(s,
            "B",
            "B:ki1",
            "A:braum")
        assert.ok(songGiap(r.s) > 0,
            "đòn đánh cho Song Giáp")
        const s2 = fresh({
            braum: 1
        })
        gm(s2).damage(s2.units["B:ki1"],
            s2.units["A:braum"],
            10,
            "magic",
            {
                tag: "skill"
            })
        assert.equal(songGiap(s2),
            0,
            "chiêu không cho Song Giáp")
    })
test("Cứu chết theo thứ tự: Renata cứu trước, biến hình của Aatrox R còn nguyên cho lần chết sau (RULES.lethalOrder)",
    () => {
        const order = cg.RULES.lethalOrder as string[]
        assert.ok(order.indexOf("hero:renata") >= 0 && order.indexOf("transform") > order.indexOf("hero:renata"),
            `lethalOrder: ${order.join(",")}`)
        const s = fresh({
            aatrox: 1, renata: 2
        })
        const r = cast(s,
            "A",
            hand(s,
                "A",
                skill(s,
                    "aatrox",
                    "A",
                    "R")),
            {
            })
        const g = gm(r.s), a = r.s.units["A:aatrox"]
        assert.ok(Object.keys(a.statuses).some((k) => /transform/.test(k)) || a.transformed || (a as unknown as { transform?: unknown }).transform,
            "đang biến hình")
        g.damage(r.s.units["B:ki1"],
            a,
            99999,
            "true",
            {
                tag: "skill"
            })
        assert.equal(a.status,
            "board",
            "được cứu, không chết")
        assert.equal(a.hp,
            Math.round(a.maxHp * P("renata").p5),
            "Renata hồi sinh với p5 Máu tối đa (không phải mức của biến hình)")
        assert.ok(Object.keys(a.statuses).some((k) => /transform/.test(k)) || a.transformed || (a as unknown as { transform?: unknown }).transform,
            "biến hình chưa bị tiêu")
        g.damage(r.s.units["B:ki1"],
            a,
            99999,
            "true",
            {
                tag: "skill"
            })
        assert.equal(a.status,
            "board",
            "lần chết thứ hai do biến hình cứu")
        assert.ok(a.hp > 1 && a.hp < a.maxHp,
            "biến hình hồi sinh với một phần Máu (công thức chi tiết ở test Aatrox)")
    })

// ======================================================================
G("Bot tự chơi trọn ván với bộ chiêu mới")
// ======================================================================
const ALL = cg.implementedHeroes().filter((h) => !h.id.startsWith("t_")).map((h) => h.id)
test("38 tướng chia 8 đội bot-vs-bot chơi trọn vài ván không lỗi",
    () => {
        const heroes = ALL.filter((id) => !id.startsWith("ki") && !id.startsWith("kd") && !id.startsWith("kt_"))
        assert.ok(heroes.length >= 38,
            `đủ 38 tướng thật (có ${heroes.length})`)
        const teams: string[][] = []
        for (let i = 0; i < heroes.length; i += 5) teams.push(heroes.slice(i,
            i + 5).concat(heroes.slice(0,
            5)).slice(0,
            5))
        for (let k = 0; k < teams.length; k++) {
            let s = cg.newGame(20261101 + k,
                teams[k],
                teams[(k + 1) % teams.length])
            for (let i = 0; i < 700 && s.phase !== "over"; i++) s = cg.applyAction(s,
                cg.chooseAction(s,
                    cg.actorsOf(s)[0])).state
            assert.ok(s.round >= 1)
        }
    })

report()
