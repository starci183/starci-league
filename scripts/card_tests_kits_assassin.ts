// Test nhóm Sát thủ theo docs/heroes/KITS.md: Katarina, Zed, Kha'Zix, Vayne. Số lấy từ cg.kit(id).p để sửa JSON không vỡ test.
// Chạy: npx tsx scripts/card_tests_kits_assassin.ts [--only=chuỗi] [--verbose]
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    mk, cast, basic, endTurn, act, u, hp, dmgOn, test, G, report, gm, skill, sup, type St, type Ev
} from "./kit_test_util"

// Địch giả: giáp/kháng 0 để sát thương = làm tròn của số thô; máu lớn để không ai chết ngoài ý muốn
for (let i = 1; i <= 5; i++) cg.stubHero({
    id: `kd${i}`, name: `Dummy ${i}`, role: "marksman", damage: "physical", hp: 5000, atk: 10, armor: 0, mr: 0, passive: "-"
})
const B5 = {
    kd1: 0, kd2: 1, kd3: 2, kd4: 3, kd5: 4
}
/** Phe A: tướng khai báo + tướng giả lấp các đường còn lại */
function fresh(main: Record<string, number>, o: { round?: number } = {
}): St {
    const used = new Set(Object.values(main))
    const a: Record<string, number> = {
        ...main
    }
    let i = 1
    for (let l = 0; l < 5; l++) if (!used.has(l)) a[`kd${i++}`] = l
    return mk({
        A: a, B: B5, ...o
    })
}
const P = (id: string) => cg.kit(id).p
/** Sát thương cuối cùng lên địch giáp 0: làm tròn số thô */
const R = Math.round
/** Các sự kiện sát thương lên `id`, theo thứ tự */
const dmgs = (ev: Ev, id: string) => ev.filter((e): e is Extract<Ev[number], { t: "damage" }> => e.t === "damage" && e.target === id)
const markers = (s: St, side: "A" | "B") => (s.markers?.[side] ?? []).flat().filter((m) => m === "dagger").length
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
/** Địch B đánh thường (actor -> target A) và dừng ở cửa sổ Chuỗi nếu bên A có lá nối được */
function enemyAttack(s: St, actor: string, target: string) {
    s.active = "B"
    return cast(s,
        "B",
        sup(s,
            "basic"),
        {
            actor, target
        },
        false)
}

// ======================================================================
// Katarina
// ======================================================================
G("Katarina")
test("nội tại: đầu lượt A có 1 Dao rơi xuống đường phía A, không rơi cho B",
    () => {
        let s = fresh({
            katarina: 1
        })
        s = endTurn(s).s
        assert.equal(markers(s,
            "A"),
        0)
        s = endTurn(s).s
        assert.equal(markers(s,
            "A"),
        1)
        assert.equal(markers(s,
            "B"),
        0)
    })
test("nội tại: Dao chỉ rơi trên đường đã mở khi cờ daggerOpenLanesOnly bật",
    () => {
        for (let i = 0; i < 8; i++) {
            let s = fresh({
                katarina: 1
            },
            {
                round: 4
            })
            s.seed = 100 + i; s.rng = s.seed
            s = endTurn(endTurn(s).s).s
            const lanes = (s.markers?.A ?? []).map((l, idx) => (l.includes("dagger") ? idx : -1)).filter((x) => x >= 0)
            assert.equal(lanes.length,
                1)
            assert.ok(gm(s).isOpen(lanes[0]),
                `Dao rơi đường chưa mở ${lanes[0]}`)
        }
    })
test("nội tại: vào đường có Dao thì nhặt và địch đối diện nhận p1 + p2·AD",
    () => {
        const s = fresh({
            katarina: 1
        })
        gm(s).addMarker("A",
            3,
            "dagger")
        const kat = u(s,
                "A",
                "katarina"), g = gm(s)
        const pick = R(P("katarina").p1 + P("katarina").p2 * g.atk(kat)), e = R(P("katarina").e1 + P("katarina").e2 * g.atk(kat))
        const r = cast(s,
            "A",
            skill(s,
                "katarina",
                "A",
                "E"),
            {
                lane: 3
            })
        assert.equal(u(r.s,
            "A",
            "katarina").lane,
        3)
        assert.equal(markers(r.s,
            "A"),
        0)
        assert.deepEqual(dmgs(r.ev,
            "B:kd4").map((d) => d.amount),
        [pick,
            e])
        assert.equal(gm(r.s).turnCount(u(r.s,
            "A",
            "katarina"),
        "dagger"),
        1)
    })
test("nội tại: bị đồng minh hoán đổi vào đường có Dao cũng nhặt",
    () => {
        const s = fresh({
            katarina: 1, kd5: 3
        })
        gm(s).addMarker("A",
            3,
            "dagger")
        // đồng minh ở đường 3 đổi sang đường 1: Katarina bị dời sang 3
        const g = gm(s)
        g.moveTo(u(s,
            "A",
            "kd5"),
        1)
        assert.equal(u(s,
            "A",
            "katarina").lane,
        3)
        assert.equal(markers(s,
            "A"),
        0)
    })
test("Q: dịch chuyển sang đối diện, gây q1 + q2·AD, rồi 1 Dao rơi; trừ q0 mana",
    () => {
        const s = fresh({
            katarina: 1
        })
        const g = gm(s), kat = u(s,
            "A",
            "katarina")
        const q = R(P("katarina").q1 + P("katarina").q2 * g.atk(kat))
        const r = cast(s,
            "A",
            skill(s,
                "katarina",
                "A",
                "Q"),
            {
                target: "B:kd4"
            })
        assert.equal(u(r.s,
            "A",
            "katarina").lane,
        3)
        assert.deepEqual(dmgs(r.ev,
            "B:kd4").map((d) => d.amount),
        [q])
        assert.equal(markers(r.s,
            "A"),
        1)
        assert.equal(r.s.teamMana.A,
            200 - P("katarina").q0)
    })
test("Q: tới đường có Dao thì nhặt trước khi chém",
    () => {
        const s = fresh({
            katarina: 1
        })
        gm(s).addMarker("A",
            3,
            "dagger")
        const g = gm(s), kat = u(s,
            "A",
            "katarina")
        const pick = R(P("katarina").p1 + P("katarina").p2 * g.atk(kat)), q = R(P("katarina").q1 + P("katarina").q2 * g.atk(kat))
        const r = cast(s,
            "A",
            skill(s,
                "katarina",
                "A",
                "Q"),
            {
                target: "B:kd4"
            })
        assert.deepEqual(dmgs(r.ev,
            "B:kd4").map((d) => d.amount),
        [pick,
            q])
        assert.equal(gm(r.s).turnCount(u(r.s,
            "A",
            "katarina"),
        "dagger"),
        1)
        assert.equal(markers(r.s,
            "A"),
        1) // Dao cũ đã nhặt, Dao mới rơi sau Q
    })
test("E: chỉ đánh được vào đường có Dao",
    () => {
        const s = fresh({
            katarina: 1
        })
        gm(s).addMarker("A",
            3,
            "dagger")
        assert.throws(() => cast(s,
            "A",
            skill(s,
                "katarina",
                "A",
                "E"),
            {
                lane: 4
            }))
        assert.throws(() => cast(s,
            "A",
            skill(s,
                "katarina",
                "A",
                "E"),
            {
                lane: 1
            }),
        undefined,
        "đường đang đứng không có lựa chọn")
        const r = cast(s,
            "A",
            skill(s,
                "katarina",
                "A",
                "E"),
            {
                lane: 3
            })
        assert.equal(r.s.teamMana.A,
            200 - P("katarina").e0)
    })
test("E Quick: nối khi địch nhắm đúng Katarina, không nối khi địch nhắm tướng khác",
    () => {
        const s = fresh({
            katarina: 1
        })
        gm(s).addMarker("A",
            3,
            "dagger")
        const e = skill(s,
            "katarina",
            "A",
            "E")
        s.players.A.hand.push(e)
        const hit = enemyAttack(s,
            "B:kd1",
            "A:katarina")
        assert.equal(hit.s.phase,
            "chain")
        const res = act(hit.s,
            {
                t: "chain", side: "A", uid: e.uid, args: {
                    lane: 3
                }
            })
        assert.equal(u(res.s,
            "A",
            "katarina").lane,
        3)
        assert.equal(res.s.phase,
            "main")
        const s2 = fresh({
            katarina: 1
        })
        gm(s2).addMarker("A",
            3,
            "dagger")
        s2.players.A.hand.push(skill(s2,
            "katarina",
            "A",
            "E"))
        assert.equal(enemyAttack(s2,
            "B:kd1",
            "A:kd1").s.phase,
        "main")
        const s3 = fresh({
            katarina: 1
        }) // Đường không có Dao thì không nối được
        s3.players.A.hand.push(skill(s3,
            "katarina",
            "A",
            "E"))
        assert.equal(enemyAttack(s3,
            "B:kd1",
            "A:katarina").s.phase,
        "main")
    })
test("R: chỉ khi lượt này đã nhặt Dao; vùng 3 đường, đối diện nhận r3%",
    () => {
        const s = fresh({
            katarina: 1
        })
        assert.throws(() => cast(s,
            "A",
            skill(s,
                "katarina",
                "A",
                "R"),
            {
            }))
        gm(s).addMarker("A",
            3,
            "dagger")
        const s1 = cast(s,
            "A",
            skill(s,
                "katarina",
                "A",
                "E"),
            {
                lane: 3
            }).s
        const g = gm(s1), kat = u(s1,
            "A",
            "katarina")
        const base = P("katarina").r1 + P("katarina").r2 * g.atk(kat)
        const r = cast(s1,
            "A",
            skill(s1,
                "katarina",
                "A",
                "R"),
            {
            })
        assert.equal(dmgOn(r.ev,
            "B:kd4"),
        R(base * P("katarina").r3 / 100))
        assert.equal(dmgOn(r.ev,
            "B:kd3"),
        R(base))
        assert.equal(dmgOn(r.ev,
            "B:kd5"),
        R(base))
        assert.equal(dmgOn(r.ev,
            "B:kd1"),
        0)
        assert.equal(dmgOn(r.ev,
            "B:kd2"),
        0)
        assert.ok(P("katarina").r3 > 100)
    })
test("R: sang lượt sau phải nhặt Dao lại mới dùng được",
    () => {
        const s = fresh({
            katarina: 1
        })
        gm(s).addMarker("A",
            3,
            "dagger")
        const s1 = cast(s,
            "A",
            skill(s,
                "katarina",
                "A",
                "E"),
            {
                lane: 3
            }).s
        const next = endTurn(endTurn(s1).s).s
        assert.throws(() => cast(next,
            "A",
            skill(next,
                "katarina",
                "A",
                "R"),
            {
            }))
    })

// ======================================================================
// Zed
// ======================================================================
G("Zed")
test("nội tại: mỗi đòn đánh +1 Liên Hoàn, mỗi chiêu sau thêm p1 + p2·AD cho mỗi tầng",
    () => {
        let s = fresh({
            zed: 1
        })
        const g = gm(s), zed = u(s,
            "A",
            "zed")
        const ad = g.atk(zed), q = P("zed").q1 + P("zed").q2 * ad, chain = P("zed").p1 + P("zed").p2 * ad
        s = basic(s,
            "A",
            "A:zed",
            "B:kd2").s
        assert.equal(u(s,
            "A",
            "zed").stacks.zed_chain,
        1)
        const r1 = cast(s,
            "A",
            skill(s,
                "zed",
                "A",
                "Q"),
            {
            })
        assert.deepEqual(dmgs(r1.ev,
            "B:kd2").map((d) => d.amount),
        [R(q + chain)])
        const r2 = cast(r1.s,
            "A",
            skill(r1.s,
                "zed",
                "A",
                "Q"),
            {
            })
        assert.deepEqual(dmgs(r2.ev,
            "B:kd2").map((d) => d.amount),
        [R(q + 2 * chain)])
        assert.equal(u(r2.s,
            "A",
            "zed").stacks.zed_chain,
        3)
    })
test("nội tại: Liên Hoàn mất khi hết lượt",
    () => {
        let s = fresh({
            zed: 1
        })
        s = cast(s,
            "A",
            skill(s,
                "zed",
                "A",
                "Q"),
            {
            }).s
        assert.equal(u(s,
            "A",
            "zed").stacks.zed_chain,
        1)
        s = endTurn(s).s
        assert.equal(u(s,
            "A",
            "zed").stacks.zed_chain,
        0)
        s = endTurn(s).s
        assert.equal(gm(s).turnCount(u(s,
            "A",
            "zed"),
        "zed_chain"),
        0)
        const r = cast(s,
            "A",
            skill(s,
                "zed",
                "A",
                "Q"),
            {
            })
        const ad = gm(s).atk(u(s,
            "A",
            "zed"))
        assert.deepEqual(dmgs(r.ev,
            "B:kd2").map((d) => d.amount),
        [R(P("zed").q1 + P("zed").q2 * ad)])
    })
test("Q: đối diện q1 + q2·AD; đòn đánh lượt này thêm q3 + q4·AD, hết lượt thì mất",
    () => {
        const s = fresh({
            zed: 1
        })
        const ad = gm(s).atk(u(s,
            "A",
            "zed"))
        const r = cast(s,
            "A",
            skill(s,
                "zed",
                "A",
                "Q"),
            {
            })
        assert.equal(dmgOn(r.ev,
            "B:kd2"),
        R(P("zed").q1 + P("zed").q2 * ad))
        assert.equal(r.s.teamMana.A,
            200 - P("zed").q0)
        const atk = basic(r.s,
            "A",
            "A:zed",
            "B:kd2")
        const tags = dmgs(atk.ev,
            "B:kd2")
        assert.equal(tags.length,
            2)
        assert.equal(tags[1].amount,
            R(P("zed").q3 + P("zed").q4 * ad))
        const later = endTurn(r.s).s
        assert.equal(u(later,
            "A",
            "zed").statuses.zed_q,
        undefined)
    })
test("E: dịch chuyển sang đối diện kẻ bất kỳ đường và gây e1 + e2·AD",
    () => {
        const s = fresh({
            zed: 1
        })
        const ad = gm(s).atk(u(s,
            "A",
            "zed"))
        const r = cast(s,
            "A",
            skill(s,
                "zed",
                "A",
                "E"),
            {
                target: "B:kd4"
            })
        assert.equal(u(r.s,
            "A",
            "zed").lane,
        3)
        assert.deepEqual(dmgs(r.ev,
            "B:kd4").map((d) => d.amount),
        [R(P("zed").e1 + P("zed").e2 * ad)])
        assert.equal(r.s.teamMana.A,
            200 - P("zed").e0)
    })
test("E Quick: nối khi địch nhắm đúng Zed, mục tiêu là kẻ ra đòn; không nối khi địch nhắm tướng khác",
    () => {
        const s = fresh({
            zed: 1
        })
        const e = skill(s,
            "zed",
            "A",
            "E")
        s.players.A.hand.push(e)
        const ad = gm(s).atk(u(s,
            "A",
            "zed"))
        const hit = enemyAttack(s,
            "B:kd5",
            "A:zed")
        assert.equal(hit.s.phase,
            "chain")
        assert.throws(() => act(hit.s,
            {
                t: "chain", side: "A", uid: e.uid, args: {
                    target: "B:kd1"
                }
            }))
        const res = act(hit.s,
            {
                t: "chain", side: "A", uid: e.uid, args: {
                    target: "B:kd5"
                }
            })
        assert.equal(u(res.s,
            "A",
            "zed").lane,
        4)
        assert.equal(dmgs(res.ev,
            "B:kd5").filter((d) => d.tag === "skill")[0].amount,
        R(P("zed").e1 + P("zed").e2 * ad))
        const s2 = fresh({
            zed: 1
        })
        s2.players.A.hand.push(skill(s2,
            "zed",
            "A",
            "E"))
        assert.equal(enemyAttack(s2,
            "B:kd5",
            "A:kd1").s.phase,
        "main")
    })
test("R: gắn Dấu Ấn, lá mất sau khi dùng, cuối lượt nổ r3 + r4% Máu đã mất + r5·Liên Hoàn chuẩn",
    () => {
        const s = fresh({
            zed: 1
        })
        const ad = gm(s).atk(u(s,
            "A",
            "zed"))
        const card = skill(s,
            "zed",
            "A",
            "R")
        const r = cast(s,
            "A",
            card,
            {
            })
        assert.equal(dmgOn(r.ev,
            "B:kd2"),
        R(P("zed").r1 + P("zed").r2 * ad))
        assert.ok(u(r.s,
            "B",
            "kd2").statuses.zed_mark)
        assert.ok(!r.s.players.A.grave.some((c) => c.uid === card.uid),
            "lá R phải biến mất")
        assert.ok(!r.s.players.A.hand.some((c) => c.uid === card.uid))
        const foe = u(r.s,
            "B",
            "kd2")
        const chain = gm(r.s).turnCount(u(r.s,
            "A",
            "zed"),
        "zed_chain")
        assert.equal(chain,
            1)
        const want = R(P("zed").r3 + P("zed").r4 / 100 * (foe.maxHp - foe.hp) + P("zed").r5 * chain)
        const end = endTurn(r.s)
        const boom = dmgs(end.ev,
            "B:kd2").filter((d) => d.kind === "true")
        assert.equal(boom.length,
            1)
        assert.equal(boom[0].amount,
            want)
        assert.equal(u(end.s,
            "B",
            "kd2").statuses.zed_mark,
        undefined)
    })
test("R: Dấu Ấn vẫn nổ khi Zed đã bị hạ trong lượt",
    () => {
        const s = fresh({
            zed: 1
        })
        const r = cast(s,
            "A",
            skill(s,
                "zed",
                "A",
                "R"),
            {
            })
        const g = gm(r.s)
        g.kill(u(r.s,
            "A",
            "zed"),
        u(r.s,
            "B",
            "kd1"))
        const end = endTurn(r.s)
        assert.equal(dmgs(end.ev,
            "B:kd2").filter((d) => d.kind === "true").length,
        1)
    })

// ======================================================================
// Kha'Zix
// ======================================================================
G("Kha'Zix")
const iso = (s: St, id = "kd2") => u(s,
    "B",
    id).statuses.isolated
test("nội tại: đầu lượt tung Cô Lập theo xác suất p1 (+p2 không buff, +p3 có bất lợi)",
    () => {
        withParams("khazix",
            {
                p1: 100, p2: 0, p3: 0
            },
            () => {
                const s = endTurn(endTurn(fresh({
                    khazix: 1
                })).s).s
                assert.ok(iso(s))
            })
        withParams("khazix",
            {
                p1: 0, p2: 0, p3: 0
            },
            () => {
                const s = endTurn(endTurn(fresh({
                    khazix: 1
                })).s).s
                assert.equal(iso(s),
                    undefined)
            })
    })
test("nội tại: p2 chỉ tính khi địch không có hiệu ứng có lợi (Khiên là có lợi)",
    () => {
        withParams("khazix",
            {
                p1: 0, p2: 100, p3: 0
            },
            () => {
                const s = fresh({
                    khazix: 1
                })
                assert.ok(iso(endTurn(endTurn(s).s).s),
                    "không buff: bị Cô Lập")
                const s2 = fresh({
                    khazix: 1
                })
                gm(s2).shield(undefined,
                    u(s2,
                        "B",
                        "kd2"),
                    50)
                assert.equal(iso(endTurn(endTurn(s2).s).s),
                    undefined,
                    "có Khiên: không")
                const s3 = fresh({
                    khazix: 1
                })
                gm(s3).status(u(s3,
                    "B",
                    "kd2"),
                "empower",
                1,
                {
                    until: cg.FOREVER
                })
                assert.equal(iso(endTurn(endTurn(s3).s).s),
                    undefined,
                    "có buff: không")
            })
    })
test("nội tại: p3 chỉ tính khi địch có hiệu ứng bất lợi",
    () => {
        withParams("khazix",
            {
                p1: 0, p2: 0, p3: 100
            },
            () => {
                const s = fresh({
                    khazix: 1
                })
                assert.equal(iso(endTurn(endTurn(s).s).s),
                    undefined)
                const s2 = fresh({
                    khazix: 1
                })
                gm(s2).status(u(s2,
                    "B",
                    "kd2"),
                "silence",
                1,
                {
                    until: cg.FOREVER
                })
                assert.ok(iso(endTurn(endTurn(s2).s).s))
            })
    })
test("nội tại: Cô Lập kéo dài p6 đơn vị tính từ phe Kha'Zix",
    () => {
        withParams("khazix",
            {
                p1: 100
            },
            () => {
                const s = endTurn(endTurn(fresh({
                    khazix: 1
                })).s).s
                const g = gm(s)
                assert.equal(iso(s)!.until,
                    g.unitsUntil(u(s,
                        "A",
                        "khazix"),
                    P("khazix").p6))
            })
    })
test("nội tại: địch Tàng Hình đối diện bị lộ và luôn Cô Lập",
    () => {
        withParams("khazix",
            {
                p1: 0, p2: 0, p3: 0
            },
            () => {
                const s = fresh({
                    khazix: 1
                })
                gm(s).status(u(s,
                    "B",
                    "kd2"),
                "stealth",
                1,
                {
                    until: cg.FOREVER
                })
                const t = endTurn(endTurn(s).s).s
                assert.equal(u(t,
                    "B",
                    "kd2").statuses.stealth,
                undefined)
                assert.ok(iso(t))
            })
    })
test("nội tại: mỗi lần đổi đường tung Cô Lập lên địch đối diện mới (E, và bị đồng minh hoán đổi)",
    () => {
        withParams("khazix",
            {
                p1: 100, p2: 0, p3: 0
            },
            () => {
                const s = fresh({
                    khazix: 1
                })
                const r = cast(s,
                    "A",
                    skill(s,
                        "khazix",
                        "A",
                        "E"),
                    {
                        target: "B:kd4"
                    })
                assert.ok(iso(r.s,
                    "kd4"))
                const s2 = fresh({
                    khazix: 1, kd5: 3
                })
                gm(s2).moveTo(u(s2,
                    "A",
                    "kd5"),
                1) // Kha'Zix bị dời sang đường 3
                assert.equal(u(s2,
                    "A",
                    "khazix").lane,
                3)
                assert.ok(iso(s2,
                    "kd4"))
            })
    })
test("nội tại: đòn đánh lên tướng Cô Lập thêm p4 + p5·AD; không Cô Lập thì không",
    () => {
        const s = fresh({
            khazix: 1
        })
        const ad = gm(s).atk(u(s,
            "A",
            "khazix"))
        const plain = basic(s,
            "A",
            "A:khazix",
            "B:kd2")
        assert.equal(dmgs(plain.ev,
            "B:kd2").length,
        1)
        gm(s).timed(u(s,
            "A",
            "khazix"),
        u(s,
            "B",
            "kd2"),
        "isolated",
        P("khazix").p6)
        const hit = basic(s,
            "A",
            "A:khazix",
            "B:kd2")
        const d = dmgs(hit.ev,
            "B:kd2")
        assert.equal(d.length,
            2)
        assert.equal(d[1].amount,
            R(P("khazix").p4 + P("khazix").p5 * ad))
    })
test("Q: đối diện q1 + q2·AD, thêm q3 + q4·AD nếu Cô Lập",
    () => {
        const s = fresh({
            khazix: 1
        })
        const ad = gm(s).atk(u(s,
            "A",
            "khazix"))
        const base = P("khazix").q1 + P("khazix").q2 * ad, extra = P("khazix").q3 + P("khazix").q4 * ad
        const a = cast(s,
            "A",
            skill(s,
                "khazix",
                "A",
                "Q"),
            {
            })
        assert.equal(dmgOn(a.ev,
            "B:kd2"),
        R(base))
        assert.equal(a.s.teamMana.A,
            200 - P("khazix").q0)
        gm(s).timed(u(s,
            "A",
            "khazix"),
        u(s,
            "B",
            "kd2"),
        "isolated",
        P("khazix").p6)
        const b = cast(s,
            "A",
            skill(s,
                "khazix",
                "A",
                "Q"),
            {
            })
        assert.equal(dmgOn(b.ev,
            "B:kd2"),
        R(base + extra))
    })
test("E: đổi chỗ sang đối diện kẻ bất kỳ đường rồi gây e1 + e2·AD",
    () => {
        withParams("khazix",
            {
                p1: 0, p2: 0, p3: 0
            },
            () => {
                const s = fresh({
                    khazix: 1
                })
                const ad = gm(s).atk(u(s,
                    "A",
                    "khazix"))
                const r = cast(s,
                    "A",
                    skill(s,
                        "khazix",
                        "A",
                        "E"),
                    {
                        target: "B:kd5"
                    })
                assert.equal(u(r.s,
                    "A",
                    "khazix").lane,
                4)
                assert.equal(dmgOn(r.ev,
                    "B:kd5"),
                R(P("khazix").e1 + P("khazix").e2 * ad))
                assert.equal(r.s.teamMana.A,
                    200 - P("khazix").e0)
            })
    })
test("R Quick: chỉ nối khi địch nhắm đúng Kha'Zix",
    () => {
        const s = fresh({
            khazix: 1
        })
        s.players.A.hand.push(skill(s,
            "khazix",
            "A",
            "R"))
        assert.equal(enemyAttack(s,
            "B:kd1",
            "A:khazix").s.phase,
        "chain")
        const s2 = fresh({
            khazix: 1
        })
        s2.players.A.hand.push(skill(s2,
            "khazix",
            "A",
            "R"))
        assert.equal(enemyAttack(s2,
            "B:kd1",
            "A:kd1").s.phase,
        "main")
    })
test("R Quick: Tàng Hình r1 đơn vị, né đòn đang nhắm, Q miễn phí, R mới xáo vào r2 lá trên cùng",
    () => {
        const s = fresh({
            khazix: 1
        })
        const rc = skill(s,
            "khazix",
            "A",
            "R")
        s.players.A.hand.push(rc)
        const before = hp(s,
            "A",
            "khazix")
        const hit = enemyAttack(s,
            "B:kd1",
            "A:khazix")
        assert.equal(hit.s.phase,
            "chain")
        const res = act(hit.s,
            {
                t: "chain", side: "A", uid: rc.uid, args: {
                }
            })
        assert.equal(hp(res.s,
            "A",
            "khazix"),
        before,
        "đòn đang nhắm phải trượt")
        assert.equal(dmgs(res.ev,
            "A:khazix").length,
        0)
        const st = u(res.s,
            "A",
            "khazix").statuses.stealth
        assert.ok(st)
        assert.equal(st.until,
            gm(res.s).unitsUntil(u(res.s,
                "A",
                "khazix"),
            P("khazix").r1))
        assert.ok(!res.s.players.A.grave.some((c) => c.uid === rc.uid) && !res.s.players.A.hand.some((c) => c.uid === rc.uid),
            "lá R mất")
        const q = res.s.players.A.hand.find((c) => c.id === "khazix_q" && c.temp)
        assert.ok(q,
            "có lá Q tạm")
        const top = res.s.players.A.deck.slice(0,
            P("khazix").r2).some((c) => c.id === "khazix_r")
        assert.ok(top,
            "R mới nằm trong r2 lá trên cùng")
        assert.equal(res.s.teamMana.A,
            200 - P("khazix").r0)
        // lượt địch dùng R: Q tạm sống sang lượt kế của địch nhờ cờ freeQSpansNextTurn
        assert.equal(q.until,
            gm(res.s).unitsUntil(u(res.s,
                "A",
                "khazix"),
            2))
    })
test("R chủ động: Q miễn phí sống tới hết lượt đối phương và đánh được với 0 mana",
    () => {
        const s = fresh({
            khazix: 1
        })
        const r = cast(s,
            "A",
            skill(s,
                "khazix",
                "A",
                "R"),
            {
            })
        const q = r.s.players.A.hand.find((c) => c.id === "khazix_q" && c.temp)
        assert.ok(q)
        assert.equal(q.until,
            gm(r.s).unitsUntil(u(r.s,
                "A",
                "khazix"),
            1))
        // Tàng Hình làm Kha'Zix không bị chọn nhưng vẫn tự đánh được
        const mana = r.s.teamMana.A
        const q2 = cast(r.s,
            "A",
            q,
            {
            })
        assert.equal(q2.s.teamMana.A,
            mana)
        assert.ok(dmgOn(q2.ev,
            "B:kd2") > 0)
    })

// ======================================================================
// Vayne
// ======================================================================
G("Vayne")
/** Đưa Vayne ra khỏi sân (dự bị) */
function benchVayne(s: St) {
    const v = u(s,
        "A",
        "vayne")
    s.lanes.A[v.lane] = null
    v.status = "reserve"; v.lane = -1
}
test("nội tại: đầu lượt +p2 Bóng Đêm khi trên sân, +p1 khi chưa ra sân (p1 > p2)",
    () => {
        assert.ok(P("vayne").p1 > P("vayne").p2)
        const on = endTurn(endTurn(fresh({
            vayne: 1
        })).s).s
        assert.equal(u(on,
            "A",
            "vayne").stacks.night,
        P("vayne").p2)
        const s = fresh({
            vayne: 1
        })
        benchVayne(s)
        const away = endTurn(endTurn(s).s).s
        assert.equal(u(away,
            "A",
            "vayne").stacks.night,
        P("vayne").p1)
    })
test("nội tại: không cộng vào lượt của đối thủ",
    () => {
        const s = endTurn(fresh({
            vayne: 1
        })).s // lượt B vừa bắt đầu
        assert.equal(u(s,
            "A",
            "vayne").stacks.night ?? 0,
        0)
    })
test("nội tại: mỗi Bóng Đêm cho p3 AD và p4 Tốc Đánh, không trần",
    () => {
        const s = fresh({
            vayne: 1
        })
        const g = gm(s), v = u(s,
            "A",
            "vayne")
        const ad0 = g.atk(v), as0 = g.attackSpeed(v)
        g.setStack(v,
            "night",
            40)
        assert.equal(g.atk(v),
            Math.round(ad0 + 40 * P("vayne").p3))
        assert.equal(g.attackSpeed(v),
            as0 + 40 * P("vayne").p4)
    })
test("nội tại: bị hạ mất một nửa Bóng Đêm",
    () => {
        const s = fresh({
            vayne: 1
        })
        const g = gm(s), v = u(s,
            "A",
            "vayne")
        g.setStack(v,
            "night",
            7)
        g.kill(v,
            u(s,
                "B",
                "kd1"))
        assert.equal(v.stacks.night,
            3)
    })
test("Q Quick: chỉ nối khi địch nhắm đúng Vayne; chỉ sang đường kề; đòn đang nhắm bị huỷ",
    () => {
        const s = fresh({
            vayne: 2
        })
        const q = skill(s,
            "vayne",
            "A",
            "Q")
        s.players.A.hand.push(q)
        const before = hp(s,
            "A",
            "vayne")
        const hit = enemyAttack(s,
            "B:kd1",
            "A:vayne")
        assert.equal(hit.s.phase,
            "chain")
        assert.throws(() => act(hit.s,
            {
                t: "chain", side: "A", uid: q.uid, args: {
                    lane: 0
                }
            }),
        undefined,
        "đường không kề")
        assert.throws(() => act(hit.s,
            {
                t: "chain", side: "A", uid: q.uid, args: {
                    lane: 2
                }
            }),
        undefined,
        "đứng nguyên")
        const res = act(hit.s,
            {
                t: "chain", side: "A", uid: q.uid, args: {
                    lane: 3
                }
            })
        assert.equal(u(res.s,
            "A",
            "vayne").lane,
        3)
        assert.equal(hp(res.s,
            "A",
            "vayne"),
        before)
        assert.ok(res.ev.some((e) => e.t === "chainCancel"))
        assert.equal(res.s.teamMana.A,
            200 - P("vayne").q0)
        const s2 = fresh({
            vayne: 2
        })
        s2.players.A.hand.push(skill(s2,
            "vayne",
            "A",
            "Q"))
        assert.equal(enemyAttack(s2,
            "B:kd1",
            "A:kd1").s.phase,
        "main")
    })
test("Q chủ động: dịch chuyển sang đường kề, không huỷ gì",
    () => {
        const s = fresh({
            vayne: 0
        })
        const r = cast(s,
            "A",
            skill(s,
                "vayne",
                "A",
                "Q"),
            {
                lane: 1
            })
        assert.equal(u(r.s,
            "A",
            "vayne").lane,
        1)
        assert.throws(() => cast(s,
            "A",
            skill(s,
                "vayne",
                "A",
                "Q"),
            {
                lane: 2
            }))
    })
test("E: đối diện e1 + e2·AD vật lý",
    () => {
        const s = fresh({
            vayne: 2
        })
        const ad = gm(s).atk(u(s,
            "A",
            "vayne"))
        const r = cast(s,
            "A",
            skill(s,
                "vayne",
                "A",
                "E"),
            {
            })
        assert.equal(dmgOn(r.ev,
            "B:kd3"),
        R(P("vayne").e1 + P("vayne").e2 * ad))
        assert.equal(r.s.teamMana.A,
            200 - P("vayne").e0)
    })
test("R: trong lượt mỗi đòn thêm r1 + r2·AD, đòn thứ 3 nổ r3 + r4% Máu tối đa chuẩn; hết lượt thì mất",
    () => {
        let s = fresh({
            vayne: 2
        })
        const ad = gm(s).atk(u(s,
            "A",
            "vayne"))
        const bonus = R(P("vayne").r1 + P("vayne").r2 * ad)
        const foe = u(s,
            "B",
            "kd3")
        const boom = R(P("vayne").r3 + P("vayne").r4 / 100 * foe.maxHp)
        const r = cast(s,
            "A",
            skill(s,
                "vayne",
                "A",
                "R"),
            {
            })
        assert.equal(r.s.teamMana.A,
            200 - P("vayne").r0)
        s = r.s
        const seen: number[][] = []
        for (let i = 0; i < 4; i++) {
            const a = basic(s,
                "A",
                "A:vayne",
                "B:kd3")
            s = a.s
            seen.push(dmgs(a.ev,
                "B:kd3").map((d) => (d.kind === "true" ? -d.amount : d.amount)))
        }
        for (const i of [0,
            1,
            3]) {
            assert.equal(seen[i].length,
                2,
                `đòn ${i + 1}: đòn chính + thêm`)
            assert.equal(seen[i][1],
                bonus)
        }
        assert.equal(seen[2].length,
            3,
            "đòn 3 có thêm phần nổ")
        assert.equal(seen[2][1],
            bonus)
        assert.equal(seen[2][2],
            -boom)
        const later = endTurn(s).s
        assert.equal(u(later,
            "A",
            "vayne").statuses.vayne_r,
        undefined)
    })
test("R: bộ đếm đòn trên biểu tượng tăng theo từng đòn",
    () => {
        let s = fresh({
            vayne: 2
        })
        s = cast(s,
            "A",
            skill(s,
                "vayne",
                "A",
                "R"),
            {
            }).s
        s = basic(s,
            "A",
            "A:vayne",
            "B:kd3").s
        s = basic(s,
            "A",
            "A:vayne",
            "B:kd3").s
        assert.equal(u(s,
            "A",
            "vayne").statuses.vayne_r.v,
        2)
    })

report()
