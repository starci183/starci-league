// Test bộ chiêu nhóm Xạ thủ (Ashe, Teemo, Tristana, Kog'Maw, Jinx, Miss Fortune). Chạy: npx tsx scripts/card_tests_kits_marksman.ts [--only=chuỗi] [--verbose]
// Mọi kỳ vọng tính từ cg.kit(id).p và chỉ số engine, nên sửa balance/heroes/*.json không làm vỡ test.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    G, act, basic, cast, dmgOn, endTurn, gm, mk, report, skill, sup, test, u,
    type Act, type Ev, type S, type St
} from "./kit_test_util"
import {
    KEYWORDS
} from "../packages/shared/src/cardgame/keywords"

const ka = cg.kit("ashe"), kt = cg.kit("teemo"), kr = cg.kit("tristana"), kk = cg.kit("kogmaw"), kj = cg.kit("jinx"), km = cg.kit("missfortune")
const pa = ka.p, pt = kt.p, pr = kr.p, pk = kk.p, pj = kj.p, pm = km.p

const mit = (raw: number, def: number) => Math.round(raw * 100 / (100 + def))
const armor = (s: St, side: S, h: string) => gm(s).armor(u(s,
    side,
    h))
const card = (s: St, side: S, hero: string, key: cg.SkillKey) => { const c = skill(s,
    hero,
    side,
    key); s.players[side].hand.push(c); return c }
const legalPlay = (s: St, side: S, c: cg.Card, args: cg.PlayArgs = {
}) => cg.legalActions(s,
    side).some((a) => a.t === "play" && a.uid === c.uid && JSON.stringify(a.args ?? {
}) === JSON.stringify(args))
type ChainAct = Extract<Act, { t: "chain" }>
const chainOpts = (s: St, side: S, id: string): ChainAct[] => (cg.legalActions(s,
    side).filter((a) => a.t === "chain") as ChainAct[])
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
function chainWith(s: St, side: S, id: string, args: cg.PlayArgs = {
}, ev0: Ev = []) {
    const o = chainOpts(s,
        side,
        id).find((a) => JSON.stringify(a.args ?? {
    }) === JSON.stringify(args)) ?? chainOpts(s,
        side,
        id)[0]
    assert.ok(o,
        `không nối được ${id}`)
    const r = act(s,
        o)
    return pass(r.s,
        [...ev0,
            ...r.ev])
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
/** B mở Chuỗi bằng 1 lá chiêu của nó (chưa giải quyết) */
function skillOpen(s: St, hero: string, key: cg.SkillKey, args: cg.PlayArgs) {
    s.active = "B"
    return cast(s,
        "B",
        skill(s,
            hero,
            "B",
            key),
        args,
        false)
}
/** Đặt tạm tham số/cờ trong JSON cho một đoạn test rồi trả lại */
function withParams<T>(k: ReturnType<typeof cg.kit>, params: Record<string, number>, flags: Record<string, boolean | number>, fn: () => T): T {
    const pr = k.raw.params as Record<string, number>, fl = k.raw.flags as Record<string, boolean | number>
    const p0 = {
            ...pr
        }, f0 = {
            ...fl
        }
    Object.assign(pr,
        params); Object.assign(fl,
        flags)
    try { return fn() } finally {
        for (const key of Object.keys(pr)) delete pr[key]
        for (const key of Object.keys(fl)) delete fl[key]
        Object.assign(pr,
            p0); Object.assign(fl,
            f0)
    }
}
/** Số đơn vị Choáng/Mù hợp lệ: floor(d) chắc chắn, phần lẻ có thể thêm 1 */
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
const stackOn = (s: St, side: S, h: string, key: string) => u(s,
    side,
    h).stacks[key] ?? 0
const dmgEvents = (ev: Ev) => ev.filter((e) => e.t === "damage") as Extract<Ev[number], { t: "damage" }>[]
const mana = (s: St, side: S) => s.teamMana![side]
const untilOf = (s: St, src: cg.Unit, n: number) => gm(s).unitsUntil(src,
    n)
const fval = (s: St, side: S, h: string, expr: string, target?: cg.Unit) => gm(s).f(u(s,
    side,
    h),
expr,
target)

// ======================================================================
G("Ashe")
test("nội tại: đòn trúng gắn 1 Buốt, nằm trong stacks của tướng mang (carrier stack)",
    () => {
        const s = mk({
            A: {
                ashe: 2
            }, B: {
                braum: 2
            }
        })
        const r = basic(s,
            "A",
            "A:ashe",
            "B:braum")
        assert.equal(stackOn(r.s,
            "B",
            "braum",
            "frost"),
        1)
        assert.ok(!u(r.s,
            "B",
            "braum").statuses.frost,
        "Buốt không phải status")
        assert.deepEqual(cg.getHero("ashe")!.carrierStacks,
            ["frost"])
    })
test("nội tại: mỗi Buốt làm tướng mang chịu thêm p1% sát thương từ phe Ashe, không từ phe khác",
    () => {
        const s = mk({
            A: {
                ashe: 2
            }, B: {
                braum: 2
            }
        })
        const g = gm(s), b = u(s,
                "B",
                "braum"), a = u(s,
                "A",
                "ashe")
        b.stacks.frost = 5
        const before = b.hp
        g.damage(a,
            b,
            100,
            "true",
            {
                tag: "effect"
            })
        assert.equal(before - b.hp,
            Math.round(100 * (1 + 5 * pa.p1 / 100)))
        // sát thương của chính phe tướng mang lên Ashe không bị ảnh hưởng
        const h0 = a.hp
        g.damage(b,
            a,
            100,
            "true",
            {
                tag: "effect"
            })
        assert.equal(h0 - a.hp,
            100)
        // Ashe rời sân: Buốt không khuếch đại nữa
        a.status = "dead"
        const b1 = b.hp
        g.damage(u(s,
            "A",
            "braum") ?? a,
        b,
        100,
        "true",
        {
            tag: "effect"
        })
        assert.equal(b1 - b.hp,
            100)
    })
test("nội tại: đạt p2 Buốt thì tiêu hết và Choáng p3 + p4·AD đơn vị",
    () => {
        const s = mk({
            A: {
                ashe: 2
            }, B: {
                braum: 2
            }
        })
        u(s,
            "B",
            "braum").stacks.frost = pa.p2 - 1
        const r = basic(s,
            "A",
            "A:ashe",
            "B:braum")
        const b = u(r.s,
            "B",
            "braum")
        assert.equal(b.stacks.frost,
            0)
        unitsOk(r.s,
            u(r.s,
                "A",
                "ashe"),
            b.statuses.stun?.until,
            fval(r.s,
                "A",
                "ashe",
                ka.x("p3 + p4·AD")))
    })
test("nội tại: dưới p2 Buốt thì không Choáng",
    () => {
        const s = mk({
            A: {
                ashe: 2
            }, B: {
                braum: 2
            }
        })
        u(s,
            "B",
            "braum").stacks.frost = pa.p2 - 2
        const r = basic(s,
            "A",
            "A:ashe",
            "B:braum")
        assert.equal(stackOn(r.s,
            "B",
            "braum",
            "frost"),
        pa.p2 - 1)
        assert.ok(!u(r.s,
            "B",
            "braum").statuses.stun)
    })
test("nội tại: tướng mang chết mất một nửa Buốt; Ashe chết thì Buốt trên địch giữ nguyên",
    () => {
        const s = mk({
            A: {
                ashe: 2
            }, B: {
                braum: 2, zed: 1
            }
        })
        u(s,
            "B",
            "braum").stacks.frost = 5
        u(s,
            "B",
            "zed").stacks.frost = 7
        gm(s).kill(u(s,
            "B",
            "braum"),
        u(s,
            "A",
            "ashe"))
        assert.equal(u(s,
            "B",
            "braum").stacks.frost,
        Math.floor(5 / 2))
        gm(s).kill(u(s,
            "A",
            "ashe"),
        u(s,
            "B",
            "zed"))
        assert.equal(u(s,
            "B",
            "zed").stacks.frost,
        7)
    })
test("Q: Ashe nhận q1 Tốc Đánh trong q3 đơn vị, hết hạn đúng lúc",
    () => {
        const s = mk({
            A: {
                ashe: 2
            }, B: {
                braum: 2
            }
        })
        const a = u(s,
            "A",
            "ashe")
        const base = gm(s).attackSpeed(a)
        const m0 = mana(s,
            "A")
        const r = cast(s,
            "A",
            card(s,
                "A",
                "ashe",
                "Q"))
        const a1 = u(r.s,
            "A",
            "ashe")
        assert.equal(gm(r.s).attackSpeed(a1),
            base + pa.q1)
        assert.equal(a1.statuses.ashe_q.until,
            untilOf(r.s,
                a1,
                pa.q3))
        assert.equal(mana(r.s,
            "A"),
        m0 - pa.q0)
        let st = r.s
        for (let i = 0; i < 2 * pa.q3 + 1; i++) {
            if (st.turnNo <= a1.statuses.ashe_q.until) assert.ok(u(st,
                "A",
                "ashe").statuses.ashe_q,
            `còn ở lượt ${st.turnNo}`)
            st = endTurn(st).s
        }
        assert.ok(!u(st,
            "A",
            "ashe").statuses.ashe_q)
    })
test("Q: đòn trúng gắn thêm q2 Buốt",
    () => {
        const s = mk({
            A: {
                ashe: 2
            }, B: {
                braum: 2
            }
        })
        const r0 = cast(s,
            "A",
            card(s,
                "A",
                "ashe",
                "Q"))
        const r = basic(r0.s,
            "A",
            "A:ashe",
            "B:braum")
        assert.equal(stackOn(r.s,
            "B",
            "braum",
            "frost"),
        1 + pa.q2)
    })
test("E: 1 địch ở lane bất kỳ nhận e1 + e2·AD vật lý và e3 Buốt",
    () => {
        const s = mk({
            A: {
                ashe: 2
            }, B: {
                braum: 4
            }
        })
        const c = card(s,
            "A",
            "ashe",
            "E")
        assert.ok(legalPlay(s,
            "A",
            c,
            {
                target: "B:braum"
            }),
        "E chọn được địch ngoài đường đối diện")
        const r = cast(s,
            "A",
            c,
            {
                target: "B:braum"
            })
        assert.equal(dmgOn(r.ev,
            "B:braum"),
        mit(fval(s,
            "A",
            "ashe",
            ka.x("e1 + e2·AD")),
        armor(r.s,
            "B",
            "braum")))
        assert.equal(stackOn(r.s,
            "B",
            "braum",
            "frost"),
        pa.e3)
    })
test("R: địch bất kỳ đường nhận r1 + r2·AD, r3 Buốt và Choáng r4 + r5·AD",
    () => {
        {
            const s = mk({
                A: {
                    ashe: 2
                }, B: {
                    braum: 0
                }
            })
            const c = card(s,
                "A",
                "ashe",
                "R")
            assert.ok(legalPlay(s,
                "A",
                c,
                {
                    target: "B:braum"
                }))
            const r = cast(s,
                "A",
                c,
                {
                    target: "B:braum"
                })
            const b = u(r.s,
                "B",
                "braum")
            assert.equal(dmgOn(r.ev,
                "B:braum"),
            mit(fval(s,
                "A",
                "ashe",
                ka.x("r1 + r2·AD")),
            armor(r.s,
                "B",
                "braum")))
            assert.equal(b.stacks.frost,
                pa.r3 % pa.p2)
            unitsOk(r.s,
                u(r.s,
                    "A",
                    "ashe"),
                b.statuses.stun?.until,
                fval(r.s,
                    "A",
                    "ashe",
                    ka.x("r4 + r5·AD")))
            assert.equal(mana(r.s,
                "A"),
            200 - pa.r0)
        }
    })
test("R: r3 Buốt đủ ngưỡng p2 cũng kích Choáng của nội tại",
    () => {
        const s = mk({
            A: {
                ashe: 2
            }, B: {
                braum: 0
            }
        })
        u(s,
            "B",
            "braum").stacks.frost = pa.p2 - pa.r3
        const r = cast(s,
            "A",
            card(s,
                "A",
                "ashe",
                "R"),
            {
                target: "B:braum"
            })
        assert.equal(u(r.s,
            "B",
            "braum").stacks.frost,
        0)
    })

// ======================================================================
G("Teemo")
const mush = (s: St, side: S) => s.players[side].deck.filter((c) => c.id === "mushroom").length
const addMush = (s: St, side: S, n: number) => { const g = gm(s); for (let i = 0; i < n; i++) s.players[side].deck.unshift(g.newCard({
    kind: "special", id: "mushroom", hero: "teemo", side: side === "A" ? "B" : "A"
})) }
test("nội tại: đòn trúng xáo p1 Nấm vào bộ đối thủ, phát sự kiện mushroom plant",
    () => {
        const s = mk({
            A: {
                teemo: 2
            }, B: {
                braum: 2
            }
        })
        const m0 = mush(s,
            "B")
        const r = basic(s,
            "A",
            "A:teemo",
            "B:braum")
        assert.equal(mush(r.s,
            "B") - m0,
        pt.p1)
        assert.ok(r.ev.some((e) => e.t === "mushroom" && e.phase === "plant" && e.count === pt.p1))
    })
test("nội tại: rút trúng Nấm nổ lên tướng tỉ lệ Máu thấp nhất bằng p2 + p3·AD + p4·Tốc Đánh vật lý, rồi rút bù",
    () => {
        const s = mk({
            A: {
                teemo: 2
            }, B: {
                braum: 2, zed: 1
            }
        })
        u(s,
            "B",
            "zed").hp = Math.floor(u(s,
            "B",
            "zed").maxHp / 2)
        addMush(s,
            "B",
            1)
        const h0 = u(s,
            "B",
            "zed").hp
        const g = gm(s)
        g.draw("B",
            1,
            {
                reason: "turn"
            })
        const burst = g.events.find((e) => e.t === "mushroom" && e.phase === "burst")
        assert.ok(burst && burst.t === "mushroom" && burst.target === "B:zed")
        assert.equal(h0 - u(s,
            "B",
            "zed").hp,
        mit(g.f(u(s,
            "A",
            "teemo"),
        kt.x("p2 + p3·AD + p4·Tốc Đánh")),
        g.armor(u(s,
            "B",
            "zed"))))
        assert.equal(s.players.B.hand.length,
            1,
            "Nấm không vào tay, rút bù đúng 1 lá")
        assert.equal(mush(s,
            "B"),
        0)
    })
test("nội tại: Nấm có thể chí mạng",
    () => {
        const s = mk({
            A: {
                teemo: 2
            }, B: {
                braum: 2, zed: 1
            }
        })
        const g = gm(s)
        g.status(u(s,
            "A",
            "teemo"),
        "alwaysCrit",
        5,
        {
            v: 1
        })
        u(s,
            "B",
            "zed").hp = u(s,
            "B",
            "zed").maxHp - 1
        addMush(s,
            "B",
            1)
        const h0 = u(s,
            "B",
            "zed").hp
        g.draw("B",
            1,
            {
                reason: "turn"
            })
        const crit = g.events.find((e) => e.t === "damage" && e.target === "B:zed")
        assert.ok(crit && crit.t === "damage" && crit.crit)
        assert.equal(h0 - u(s,
            "B",
            "zed").hp,
        mit(g.f(u(s,
            "A",
            "teemo"),
        kt.x("p2 + p3·AD + p4·Tốc Đánh")) * (cg.RULES.critBase + g.stats(u(s,
            "A",
            "teemo")).critDmg),
        g.armor(u(s,
            "B",
            "zed"))))
    })
test("cờ halveMushroomsOnDeath tắt: Teemo chết không mất Nấm; bật: mất một nửa",
    () => {
        assert.equal(kt.flag("halveMushroomsOnDeath"),
            false)
        const s = mk({
            A: {
                teemo: 2
            }, B: {
                braum: 2
            }
        })
        addMush(s,
            "B",
            5)
        gm(s).kill(u(s,
            "A",
            "teemo"),
        u(s,
            "B",
            "braum"))
        assert.equal(mush(s,
            "B"),
        5)
        withParams(kt,
            {
            },
            {
                halveMushroomsOnDeath: true
            },
            () => {
                const s2 = mk({
                    A: {
                        teemo: 2
                    }, B: {
                        braum: 2
                    }
                })
                addMush(s2,
                    "B",
                    5)
                gm(s2).kill(u(s2,
                    "A",
                    "teemo"),
                u(s2,
                    "B",
                    "braum"))
                assert.equal(mush(s2,
                    "B"),
                5 - Math.floor(5 / 2))
            })
    })
test("Q: 1 địch nhận q2 + q3·AD vật lý và xáo q1 Nấm",
    () => {
        const s = mk({
            A: {
                teemo: 2
            }, B: {
                braum: 4
            }
        })
        const c = card(s,
            "A",
            "teemo",
            "Q")
        assert.ok(legalPlay(s,
            "A",
            c,
            {
                target: "B:braum"
            }))
        const r = cast(s,
            "A",
            c,
            {
                target: "B:braum"
            })
        assert.equal(dmgOn(r.ev,
            "B:braum"),
        mit(fval(s,
            "A",
            "teemo",
            kt.x("q2 + q3·AD")),
        armor(r.s,
            "B",
            "braum")))
        assert.equal(mush(r.s,
            "B"),
        pt.q1)
        assert.equal(mana(r.s,
            "A"),
        200 - pt.q0)
    })
test("E: Quick, nối Chuỗi khi địch đánh Teemo; mục tiêu là kẻ đánh, sát thương theo Nấm, Mù e4 + e5·AD đơn vị",
    () => {
        const s = mk({
            A: {
                teemo: 2
            }, B: {
                zed: 2
            }
        })
        addMush(s,
            "B",
            3)
        card(s,
            "A",
            "teemo",
            "E")
        const r0 = attackOpen(s,
            "B:zed",
            "A:teemo")
        const stock = r0.s.players.B.deck.filter((c) => c.id === "mushroom").length
        assert.equal(stock,
            3)
        const r = chainWith(r0.s,
            "A",
            "teemo_e",
            {
                target: "B:zed"
            },
            r0.ev)
        const zed = u(r.s,
            "B",
            "zed")
        const expected = mit(fval(r.s,
            "A",
            "teemo",
            kt.x("e1 + e2·AD")) + pt.e3 * stock,
        armor(r.s,
            "B",
            "zed"))
        assert.equal(dmgOn(r.ev,
            "B:zed"),
        expected)
        unitsOk(r.s,
            u(r.s,
                "A",
                "teemo"),
            zed.statuses.blind?.until,
            fval(r.s,
                "A",
                "teemo",
                kt.x("e4 + e5·AD")))
        assert.equal(mana(r.s,
            "A"),
        200 - pt.e0)
    })
test("E: không nối được khi địch đánh tướng khác, hoặc dùng lá chiêu nhắm Teemo",
    () => {
        const s = mk({
            A: {
                teemo: 2, braum: 1
            }, B: {
                zed: 1
            }
        })
        card(s,
            "A",
            "teemo",
            "E")
        const r0 = attackOpen(s,
            "B:zed",
            "A:braum")
        assert.notEqual(r0.s.phase,
            "chain",
            "đánh Braum không mở cửa sổ phản ứng cho E")
        assert.equal(chainOpts(r0.s,
            "A",
            "teemo_e").length,
        0)
        const s2 = mk({
            A: {
                teemo: 2
            }, B: {
                zed: 2
            }
        })
        card(s2,
            "A",
            "teemo",
            "E")
        const r1 = skillOpen(s2,
            "zed",
            "Q",
            {
            })
        assert.notEqual(r1.s.phase,
            "chain",
            "lá chiêu không phải đòn đánh")
        assert.equal(chainOpts(r1.s,
            "A",
            "teemo_e").length,
        0)
    })
test("E: dùng chủ động chọn được 1 địch bất kỳ",
    () => {
        const s = mk({
            A: {
                teemo: 2
            }, B: {
                zed: 4
            }
        })
        const c = card(s,
            "A",
            "teemo",
            "E")
        assert.ok(legalPlay(s,
            "A",
            c,
            {
                target: "B:zed"
            }))
    })
test("R: nổ tối đa r1 Nấm, mỗi Nấm r2 + r3·AD + r4·Tốc Đánh lên tướng tỉ lệ Máu thấp nhất, không rút bù",
    () => {
        const s = mk({
            A: {
                teemo: 2
            }, B: {
                braum: 2, zed: 1
            }
        })
        u(s,
            "B",
            "zed").hp = u(s,
            "B",
            "zed").maxHp // cả hai đầy máu; zed sẽ thấp nhất sau cú đầu
        u(s,
            "B",
            "braum").hp = u(s,
            "B",
            "braum").maxHp
        addMush(s,
            "B",
            pt.r1 + 2)
        const c = card(s,
            "A",
            "teemo",
            "R")
        const r = cast(s,
            "A",
            c)
        assert.equal(mush(r.s,
            "B"),
        2,
        "giữ phần dư")
        assert.equal(r.s.players.B.hand.length,
            0,
            "không rút bù")
        assert.equal(r.ev.filter((e) => e.t === "mushroom" && e.phase === "burst").length,
            pt.r1)
        assert.equal(mana(r.s,
            "A"),
        200 - pt.r0)
    })
test("R: Nấm lên đúng tướng tỉ lệ Máu thấp nhất, công thức r2 + r3·AD + r4·Tốc Đánh",
    () => {
        const s = mk({
            A: {
                teemo: 2
            }, B: {
                braum: 2, zed: 1
            }
        })
        u(s,
            "B",
            "zed").hp = Math.floor(u(s,
            "B",
            "zed").maxHp * 0.5)
        addMush(s,
            "B",
            1)
        const h0 = u(s,
            "B",
            "zed").hp
        const r = cast(s,
            "A",
            card(s,
                "A",
                "teemo",
                "R"))
        assert.equal(h0 - u(r.s,
            "B",
            "zed").hp,
        mit(fval(s,
            "A",
            "teemo",
            kt.x("r2 + r3·AD + r4·Tốc Đánh")),
        armor(r.s,
            "B",
            "zed")))
    })
test("R: không đánh được khi bộ đối thủ không có Nấm",
    () => {
        const s = mk({
            A: {
                teemo: 2
            }, B: {
                braum: 2
            }
        })
        const c = card(s,
            "A",
            "teemo",
            "R")
        assert.ok(!legalPlay(s,
            "A",
            c))
        addMush(s,
            "B",
            1)
        assert.ok(legalPlay(s,
            "A",
            c))
    })


// ======================================================================
G("Tristana")
const boom = (s: St, n: number) => cg.spike(pr.p3,
    n,
    pr.p4) * (1 + pr.p5 * gm(s).atk(u(s,
    "A",
    "tristana")))
const abilities = (s: St, side: S) => cg.legalActions(s,
    side).filter((a) => a.t === "ability" && a.id === "tri_detonate") as Extract<Act, { t: "ability" }>[]
test("nội tại: đòn trúng gắn p1 Bom, là carrier stack của tướng địch",
    () => {
        const s = mk({
            A: {
                tristana: 2
            }, B: {
                braum: 2
            }
        })
        const r = basic(s,
            "A",
            "A:tristana",
            "B:braum")
        assert.equal(stackOn(r.s,
            "B",
            "braum",
            "tri_bomb"),
        pr.p1)
        assert.ok(!u(r.s,
            "B",
            "braum").statuses.tri_bomb)
        assert.deepEqual(cg.getHero("tristana")!.carrierStacks,
            ["tri_bomb"])
    })
test("nội tại: cờ noCrit bật thì Tristana không chí mạng; tắt thì chí mạng như thường",
    () => {
        assert.equal(kr.flag("noCrit"),
            true)
        const run = () => {
            const s = mk({
                A: {
                    tristana: 2
                }, B: {
                    braum: 2
                }
            })
            gm(s).status(u(s,
                "A",
                "tristana"),
            "crit_up",
            5,
            {
                v: 1
            })
            return basic(s,
                "A",
                "A:tristana",
                "B:braum").ev.filter((e) => e.t === "attack" && !e.miss) as Extract<Ev[number], { t: "attack" }>[]
        }
        assert.ok(run().length > 0 && run().every((e) => !e.crit))
        withParams(kr,
            {
            },
            {
                noCrit: false
            },
            () => assert.ok(run().every((e) => e.crit)))
    })
test("nội tại: Chí mạng đổi thành Tốc Đánh p2 cho mỗi 1% (chỉ khi noCrit)",
    () => {
        const s = mk({
            A: {
                tristana: 2
            }, B: {
                braum: 2
            }
        })
        const g = gm(s), t = u(s,
            "A",
            "tristana")
        const base = g.attackSpeed(t)
        g.status(t,
            "crit_up",
            5,
            {
                v: 0.5
            })
        assert.equal(g.attackSpeed(t),
            base + 50 * pr.p2)
        withParams(kr,
            {
            },
            {
                noCrit: false
            },
            () => assert.equal(g.attackSpeed(t),
                base))
    })
test("nút tri_detonate: một lựa chọn cho mỗi địch có Bom, nổ p3·n·(1 + n/p4)·(1 + p5·AD), một lần mỗi lượt",
    () => {
        const s = mk({
            A: {
                tristana: 2
            }, B: {
                braum: 2, zed: 1, garen: 3
            }
        })
        assert.equal(abilities(s,
            "A").length,
        0,
        "không Bom thì nút tắt")
        u(s,
            "B",
            "braum").stacks.tri_bomb = 3
        u(s,
            "B",
            "zed").stacks.tri_bomb = 2
        const opts = abilities(s,
            "A")
        assert.deepEqual(opts.map((a) => a.args?.target).sort(),
            ["B:braum",
                "B:zed"])
        const h0 = u(s,
            "B",
            "braum").hp
        const r = act(s,
abilities(s,
    "A").find((a) => a.args?.target === "B:braum")!)
        assert.equal(h0 - u(r.s,
            "B",
            "braum").hp,
        mit(boom(s,
            3),
        armor(s,
            "B",
            "braum")))
        assert.equal(stackOn(r.s,
            "B",
            "braum",
            "tri_bomb"),
        0)
        assert.equal(abilities(r.s,
            "A").length,
        0,
        "đã dùng trong lượt này")
        assert.equal(mana(r.s,
            "A"),
        200,
        "không tốn mana")
        // sang lượt sau dùng lại được
        const n = endTurn(endTurn(r.s).s).s
        assert.equal(abilities(n,
            "A").length,
        1)
    })
test("cờ detonatesPerTurn = 2 cho phép kích nổ hai lần mỗi lượt",
    () => {
        withParams(kr,
            {
            },
            {
                detonatesPerTurn: 2
            },
            () => {
                const s = mk({
                    A: {
                        tristana: 2
                    }, B: {
                        braum: 2, zed: 1
                    }
                })
                u(s,
                    "B",
                    "braum").stacks.tri_bomb = 1
                u(s,
                    "B",
                    "zed").stacks.tri_bomb = 1
                const r1 = act(s,
                    abilities(s,
                        "A")[0])
                assert.equal(abilities(r1.s,
                    "A").length,
                1)
                const r2 = act(r1.s,
                    abilities(r1.s,
                        "A")[0])
                assert.equal(abilities(r2.s,
                    "A").length,
                0)
            })
    })
test("nút tri_detonate: không dùng được khi Tristana bị Choáng",
    () => {
        const s = mk({
            A: {
                tristana: 2
            }, B: {
                braum: 2
            }
        })
        u(s,
            "B",
            "braum").stacks.tri_bomb = 2
        gm(s).status(u(s,
            "A",
            "tristana"),
        "stun",
        1)
        assert.equal(abilities(s,
            "A").length,
        0)
    })
test("Bom tự nổ khi sát thương nổ đủ hạ mục tiêu (gắn thêm Bom)",
    () => {
        const s = mk({
            A: {
                tristana: 2
            }, B: {
                braum: 2
            }
        })
        u(s,
            "B",
            "braum").hp = 10
        const r = cast(s,
            "A",
            card(s,
                "A",
                "tristana",
                "E"),
            {
                target: "B:braum"
            })
        assert.equal(u(r.s,
            "B",
            "braum").status,
        "dead",
        "Bom nổ hạ mục tiêu")
        // đủ máu thì Bom nằm lại
        const s2 = mk({
            A: {
                tristana: 2
            }, B: {
                braum: 2
            }
        })
        const r2 = cast(s2,
            "A",
            card(s2,
                "A",
                "tristana",
                "E"),
            {
                target: "B:braum"
            })
        assert.equal(stackOn(r2.s,
            "B",
            "braum",
            "tri_bomb"),
        pr.e1)
        assert.equal(u(r2.s,
            "B",
            "braum").status,
        "board")
    })
test("Bom tự nổ khi mục tiêu mất máu từ nguồn khác và sát thương nổ đủ hạ",
    () => {
        const s = mk({
            A: {
                tristana: 2
            }, B: {
                braum: 2
            }
        })
        const b = u(s,
                "B",
                "braum"), g = gm(s)
        b.stacks.tri_bomb = 3
        const lethal = mit(boom(s,
            3),
        armor(s,
            "B",
            "braum"))
        b.hp = lethal + 30
        g.damage(u(s,
            "A",
            "tristana"),
        b,
        40,
        "true",
        {
            tag: "effect"
        })
        assert.equal(b.status,
            "dead")
    })
test("Bom: tướng mang chết mất một nửa; Tristana chết không đổi",
    () => {
        const s = mk({
            A: {
                tristana: 2
            }, B: {
                braum: 2, zed: 1
            }
        })
        u(s,
            "B",
            "braum").stacks.tri_bomb = 5
        u(s,
            "B",
            "zed").stacks.tri_bomb = 5
        gm(s).kill(u(s,
            "B",
            "braum"),
        u(s,
            "A",
            "tristana"))
        assert.equal(u(s,
            "B",
            "braum").stacks.tri_bomb,
        2)
        gm(s).kill(u(s,
            "A",
            "tristana"),
        u(s,
            "B",
            "zed"))
        assert.equal(u(s,
            "B",
            "zed").stacks.tri_bomb,
        5)
    })
test("Q: nhận q2 + q3·AD Tốc Đánh trong q1 đơn vị",
    () => {
        const s = mk({
            A: {
                tristana: 2
            }, B: {
                braum: 2
            }
        })
        const g = gm(s), t = u(s,
            "A",
            "tristana")
        const base = g.attackSpeed(t)
        const r = cast(s,
            "A",
            card(s,
                "A",
                "tristana",
                "Q"))
        const t1 = u(r.s,
            "A",
            "tristana")
        assert.equal(gm(r.s).attackSpeed(t1),
            base + fval(s,
                "A",
                "tristana",
                kr.x("q2 + q3·AD")))
        assert.equal(t1.statuses.tri_q.until,
            untilOf(r.s,
                t1,
                pr.q1))
        assert.equal(mana(r.s,
            "A"),
        200 - pr.q0)
        let st = r.s
        for (let i = 0; i < 2 * pr.q1 + 1; i++) st = endTurn(st).s
        assert.ok(!u(st,
            "A",
            "tristana").statuses.tri_q)
    })
test("E: gắn e1 Bom lên 1 địch ở lane bất kỳ",
    () => {
        const s = mk({
            A: {
                tristana: 2
            }, B: {
                braum: 4
            }
        })
        const c = card(s,
            "A",
            "tristana",
            "E")
        assert.ok(legalPlay(s,
            "A",
            c,
            {
                target: "B:braum"
            }))
        const r = cast(s,
            "A",
            c,
            {
                target: "B:braum"
            })
        assert.equal(stackOn(r.s,
            "B",
            "braum",
            "tri_bomb"),
        pr.e1)
        assert.equal(mana(r.s,
            "A"),
        200 - pr.e0)
    })
test("R: nổ Bom trước, địch khác nhận r3% vụ nổ, rồi bắn r1 + r2·AD",
    () => {
        const s = mk({
            A: {
                tristana: 2
            }, B: {
                braum: 0, zed: 1, garen: 3
            }
        })
        u(s,
            "B",
            "braum").stacks.tri_bomb = 4
        const c = card(s,
            "A",
            "tristana",
            "R")
        assert.ok(legalPlay(s,
            "A",
            c,
            {
                target: "B:braum"
            }),
        "R chọn được địch ở lane bất kỳ")
        const raw = boom(s,
                4), rr = fval(s,
                "A",
                "tristana",
                kr.x("r1 + r2·AD"))
        const r = cast(s,
            "A",
            c,
            {
                target: "B:braum"
            })
        assert.equal(dmgOn(r.ev,
            "B:braum"),
        mit(raw,
            armor(s,
                "B",
                "braum")) + mit(rr,
            armor(s,
                "B",
                "braum")))
        assert.equal(dmgOn(r.ev,
            "B:zed"),
        mit(raw * pr.r3 / 100,
            armor(s,
                "B",
                "zed")))
        assert.equal(dmgOn(r.ev,
            "B:garen"),
        mit(raw * pr.r3 / 100,
            armor(s,
                "B",
                "garen")))
        assert.equal(stackOn(r.s,
            "B",
            "braum",
            "tri_bomb"),
        0)
        assert.equal(mana(r.s,
            "A"),
        200 - pr.r0)
    })
test("R: không có Bom thì chỉ bắn r1 + r2·AD, không lan",
    () => {
        const s = mk({
            A: {
                tristana: 2
            }, B: {
                braum: 0, zed: 1
            }
        })
        const r = cast(s,
            "A",
            card(s,
                "A",
                "tristana",
                "R"),
            {
                target: "B:braum"
            })
        assert.equal(dmgOn(r.ev,
            "B:braum"),
        mit(fval(s,
            "A",
            "tristana",
            kr.x("r1 + r2·AD")),
        armor(s,
            "B",
            "braum")))
        assert.equal(dmgOn(r.ev,
            "B:zed"),
        0)
    })


// ======================================================================
G("Kog'Maw")
const hunger = (s: St) => stackOn(s,
    "A",
    "kogmaw",
    "hunger")
const canBasic = (s: St, side: S, actor: string, target: string) => {
    const c = sup(s,
        "basic"); s.players[side].hand.push(c)
    const ok = cg.legalActions(s,
        side).some((a) => a.t === "play" && a.uid === c.uid && a.args?.actor === actor && a.args?.target === target)
    s.players[side].hand.pop()
    return ok
}
const dmgTo = (ev: Ev, id: string) => dmgEvents(ev).filter((e) => e.target === id)
test("nội tại: đầu lượt của bạn khi trên sân nhận p1 Đói; lượt đối phương không",
    () => {
        const s = mk({
            A: {
                kogmaw: 2
            }, B: {
                braum: 2
            }
        })
        const r1 = endTurn(s)
        assert.equal(hunger(r1.s),
            0,
            "đầu lượt B không cho Đói")
        const r2 = endTurn(r1.s)
        assert.equal(hunger(r2.s),
            pk.p1)
    })
test("nội tại: Kog'Maw chưa ra sân thì không nhận Đói đầu lượt",
    () => {
        const s = mk({
            A: {
                kogmaw: 1, braum: 2
            }, B: {
                zed: 2
            }
        })
        const kg = u(s,
            "A",
            "kogmaw"); kg.status = "reserve"; s.lanes.A[1] = null; kg.lane = -1
        const r = endTurn(endTurn(s).s)
        assert.equal(stackOn(r.s,
            "A",
            "kogmaw",
            "hunger"),
        0)
    })
test("nội tại: Chí mạng đổi thành Đói: lượng nhận nhân (1 + p7·Chí mạng)",
    () => {
        const s = mk({
            A: {
                kogmaw: 2
            }, B: {
                braum: 2
            }
        })
        gm(s).status(u(s,
            "A",
            "kogmaw"),
        "crit_up",
        99,
        {
            v: 0.5
        })
        const r = endTurn(endTurn(s).s)
        const want = pk.p1 * (1 + pk.p7 * 0.5)
        assert.ok(hunger(r.s) === Math.floor(want) || hunger(r.s) === Math.ceil(want),
            `Đói ${hunger(r.s)} vs ${want}`)
        if (want % 1 === 0) assert.equal(hunger(r.s),
            want)
    })
test("nội tại: phần lẻ của Đói theo X.Y (chắc phần nguyên, phần lẻ là xác suất thêm 1)",
    () => {
        withParams(kk,
            {
                p1: 1.5
            },
            {
            },
            () => {
                let ones = 0, twos = 0
                for (let i = 0; i < 40; i++) {
                    const s = mk({
                        A: {
                            kogmaw: 2
                        }, B: {
                            braum: 2
                        }, seed: 20261101 + i
                    })
                    const h = hunger(endTurn(endTurn(s).s).s)
                    if (h === 1) ones++; else if (h === 2) twos++
                    else assert.fail(`Đói ${h}`)
                }
                assert.ok(ones > 5 && twos > 5,
                    `phân bố ${ones}/${twos}`)
            })
    })
test("nội tại: tướng khác chết (cả hai phe) khi Kog'Maw trên sân cho p2 Đói",
    () => {
        const s = mk({
            A: {
                kogmaw: 2, braum: 1
            }, B: {
                zed: 2
            }
        })
        gm(s).kill(u(s,
            "B",
            "zed"),
        u(s,
            "A",
            "kogmaw"))
        assert.equal(hunger(s),
            pk.p2)
        gm(s).kill(u(s,
            "A",
            "braum"),
        u(s,
            "B",
            "garen") ?? u(s,
            "B",
            "zed"))
        assert.equal(hunger(s),
            pk.p2 * 2)
    })
test("nội tại: Kog'Maw bị hạ nhận p6 Đói (cờ gainsHungerOnDeath), không mất Đói",
    () => {
        assert.equal(kk.flag("gainsHungerOnDeath"),
            true)
        assert.ok(!(cg.getHero("kogmaw")!.deathHalf ?? []).includes("hunger"))
        const s = mk({
            A: {
                kogmaw: 2
            }, B: {
                braum: 2
            }
        })
        u(s,
            "A",
            "kogmaw").stacks.hunger = 10
        gm(s).kill(u(s,
            "A",
            "kogmaw"),
        u(s,
            "B",
            "braum"))
        assert.equal(hunger(s),
            10 + pk.p6)
        withParams(kk,
            {
            },
            {
                gainsHungerOnDeath: false
            },
            () => {
                const s2 = mk({
                    A: {
                        kogmaw: 2
                    }, B: {
                        braum: 2
                    }
                })
                u(s2,
                    "A",
                    "kogmaw").stacks.hunger = 10
                gm(s2).kill(u(s2,
                    "A",
                    "kogmaw"),
                u(s2,
                    "B",
                    "braum"))
                assert.equal(hunger(s2),
                    10)
            })
    })
test("nội tại: mỗi Đói làm đòn trúng thêm p3% Máu tối đa mục tiêu + p4 + p5·AD vật lý, không chí mạng",
    () => {
        const s = mk({
            A: {
                kogmaw: 2
            }, B: {
                braum: 2
            }
        })
        const g = gm(s), k = u(s,
                "A",
                "kogmaw"), b = u(s,
                "B",
                "braum")
        k.stacks.hunger = 7
        g.status(k,
            "crit_up",
            99,
            {
                v: 1
            })
        const per = g.f(k,
            kk.x("p3% Máu tối đa mục tiêu + p4 + p5·AD"),
            b)
        const r = basic(s,
            "A",
            "A:kogmaw",
            "B:braum")
        const atk = r.ev.filter((e) => e.t === "attack" && !e.miss) as Extract<Ev[number], { t: "attack" }>[]
        assert.ok(atk.length >= 1 && atk.every((e) => !e.crit),
            "Kog'Maw không chí mạng")
        const d = dmgTo(r.ev,
            "B:braum")
        assert.ok(d.some((e) => Math.abs(e.amount - mit(7 * per,
            armor(r.s,
                "B",
                "braum"))) <= 1),
        `không thấy gói Đói ${mit(7 * per,
            armor(r.s,
                "B",
                "braum"))} trong ${d.map((e) => e.amount)}`)
    })
test("Q: sát thương q1 + q2·AD vật lý và Rã Giáp q3 đơn vị",
    () => {
        const s = mk({
            A: {
                kogmaw: 2
            }, B: {
                braum: 4
            }
        })
        const r = cast(s,
            "A",
            card(s,
                "A",
                "kogmaw",
                "Q"),
            {
                target: "B:braum"
            })
        assert.equal(dmgOn(r.ev,
            "B:braum"),
        mit(fval(s,
            "A",
            "kogmaw",
            kk.x("q1 + q2·AD")),
        armor(s,
            "B",
            "braum")))
        assert.equal(u(r.s,
            "B",
            "braum").statuses.shred?.until,
        untilOf(r.s,
            u(r.s,
                "A",
                "kogmaw"),
            pk.q3))
        assert.equal(mana(r.s,
            "A"),
        200 - pk.q0)
    })
test("E: e2 Tốc Đánh trong e1 đơn vị, đòn tới mọi đường, thêm e3% Máu tối đa",
    () => {
        const s = mk({
            A: {
                kogmaw: 2
            }, B: {
                braum: 2, zed: 4
            }
        })
        assert.ok(!canBasic(s,
            "A",
            "A:kogmaw",
            "B:zed"),
        "chưa có E: Đỡ Đòn bắt buộc phải đánh trước")
        const g = gm(s), k = u(s,
            "A",
            "kogmaw")
        const base = g.attackSpeed(k)
        const r0 = cast(s,
            "A",
            card(s,
                "A",
                "kogmaw",
                "E"))
        const k1 = u(r0.s,
            "A",
            "kogmaw")
        assert.equal(gm(r0.s).attackSpeed(k1),
            base + pk.e2)
        assert.equal(k1.statuses.kog_e.until,
            untilOf(r0.s,
                k1,
                pk.e1))
        assert.ok(canBasic(r0.s,
            "A",
            "A:kogmaw",
            "B:zed"),
        "có E: đòn tới mọi đường, bỏ qua Đỡ Đòn")
        const b = u(r0.s,
            "B",
            "zed")
        const extra = mit(b.maxHp * pk.e3 / 100,
            armor(r0.s,
                "B",
                "zed"))
        const r = basic(r0.s,
            "A",
            "A:kogmaw",
            "B:zed")
        assert.ok(dmgTo(r.ev,
            "B:zed").some((e) => Math.abs(e.amount - extra) <= 1),
        `không thấy ${extra} trong ${dmgTo(r.ev,
            "B:zed").map((e) => e.amount)}`)
        assert.equal(mana(r0.s,
            "A"),
        200 - pk.e0)
        let st = r.s
        for (let i = 0; i < 2 * pk.e1 + 1; i++) st = endTurn(st).s
        assert.ok(!u(st,
            "A",
            "kogmaw").statuses.kog_e)
        assert.ok(!canBasic(st,
            "A",
            "A:kogmaw",
            "B:zed"),
        "hết E: lại bị buộc đánh Đỡ Đòn")
    })
test("R: địch bất kỳ đường nhận r1 + r2·AD + r3% Máu đã mất",
    () => {
        const s = mk({
            A: {
                kogmaw: 2
            }, B: {
                braum: 0
            }
        })
        const b = u(s,
            "B",
            "braum")
        b.hp = Math.floor(b.maxHp / 2)
        const c = card(s,
            "A",
            "kogmaw",
            "R")
        assert.ok(legalPlay(s,
            "A",
            c,
            {
                target: "B:braum"
            }))
        const want = mit(fval(s,
            "A",
            "kogmaw",
            kk.x("r1 + r2·AD + r3% Máu đã mất mục tiêu"),
            b),
        armor(s,
            "B",
            "braum"))
        const r = cast(s,
            "A",
            c,
            {
                target: "B:braum"
            })
        assert.equal(dmgOn(r.ev,
            "B:braum"),
        want)
        assert.equal(mana(r.s,
            "A"),
        200 - pk.r0)
    })
test("R: hạ gục nhận thêm r4 Đói (cộng p2 của nội tại)",
    () => {
        const s = mk({
            A: {
                kogmaw: 2
            }, B: {
                braum: 0
            }
        })
        u(s,
            "B",
            "braum").hp = 5
        const r = cast(s,
            "A",
            card(s,
                "A",
                "kogmaw",
                "R"),
            {
                target: "B:braum"
            })
        assert.equal(u(r.s,
            "B",
            "braum").status,
        "dead")
        assert.equal(hunger(r.s),
            pk.p2 + pk.r4)
    })


// ======================================================================
G("Jinx")
const gun = (s: St) => stackOn(s,
    "A",
    "jinx",
    "jinx_gun")
test("summonModes minigun/rocket; súng lưu ở stack jinx_gun (0/1), mặc định Súng Máy",
    () => {
        assert.deepEqual(cg.getHero("jinx")!.summonModes,
            ["minigun",
                "rocket"])
        assert.equal(gun(mk({
            A: {
                jinx: 2
            }, B: {
                braum: 2
            }
        })),
        0)
        assert.equal(gun(mk({
            A: {
                jinx: 2
            }, B: {
                braum: 2
            }, modes: {
                jinx: "rocket"
            }
        })),
        1)
    })
test("giai đoạn gọi tướng úp: engine đề nghị cả hai chế độ súng",
    () => {
        const s = cg.newGame(20261101,
            ["jinx",
                "braum",
                "zed",
                "garen",
                "viktor"],
            ["braum",
                "zed",
                "garen",
                "viktor",
                "soraka"])
        const modes = cg.legalActions(s,
            "A").filter((a) => a.t === "summon" && a.hero === "jinx").map((a) => (a as Extract<Act, { t: "summon" }>).mode)
        assert.ok(modes.includes("minigun") && modes.includes("rocket"),
            `modes ${modes}`)
    })
test("Súng Máy: q1 Tốc Đánh; Tên Lửa: không có",
    () => {
        const s = mk({
            A: {
                jinx: 2
            }, B: {
                braum: 2
            }
        })
        assert.equal(gm(s).attackSpeed(u(s,
            "A",
            "jinx")),
        100 + pj.q1)
        const s2 = mk({
            A: {
                jinx: 2
            }, B: {
                braum: 2
            }, modes: {
                jinx: "rocket"
            }
        })
        assert.equal(gm(s2).attackSpeed(u(s2,
            "A",
            "jinx")),
        100)
    })
test("nút Đổi Súng: đổi qua lại, không tốn mana, Q không còn đổi súng",
    () => {
        const s = mk({
            A: {
                jinx: 2
            }, B: {
                braum: 2
            }
        })
        const before = mana(s,
            "A")
        const me = u(s,
            "A",
            "jinx")
        const swap = cg.getHero("jinx")!.abilities![0]
        assert.equal(swap.standby,
            true)
        swap.resolve(gm(s),
            me,
            {
            })
        assert.equal(gun(s),
            1)
        assert.equal(gm(s).attackSpeed(me),
            100)
        assert.equal(mana(s,
            "A"),
        before)
        swap.resolve(gm(s),
            me,
            {
            })
        assert.equal(gun(s),
            1,
            "1 lần mỗi lượt")
        const r = cast(s,
            "A",
            card(s,
                "A",
                "jinx",
                "Q"),
            {
                target: "B:braum"
            })
        assert.equal(gun(r.s),
            1)
    })
test("Q: 1 đòn đánh thật ở bất kỳ đường, thêm q4 + q5·AD và q6 lần phần Điên, chắc chắn nhận Điên, tốn q0",
    () => {
        const dealt = (n: number) => {
            const s = mk({
                A: {
                    jinx: 2
                }, B: {
                    braum: 2, garen: 0
                }
            })
            const t = u(s,
                "B",
                "garen")
            t.maxHp = t.hp = 9000
            const me = u(s,
                "A",
                "jinx")
            me.stacks.frenzy = n
            const r = cast(s,
                "A",
                card(s,
                    "A",
                    "jinx",
                    "Q"),
                {
                    target: "B:garen"
                })
            assert.equal(r.ev.filter((e) => e.t === "attack").length,
                1,
                "đúng 1 đòn")
            assert.ok(u(r.s,
                "A",
                "jinx").stacks.frenzy >= n + 1,
            "chắc chắn nhận Điên")
            return {
                sum: dmgOn(r.ev,
                    "B:garen"), mana: mana(r.s,
                    "A"), crit: r.ev.some((e) => e.t === "attack" && e.crit)
            }
        }
        const a = dealt(0), b = dealt(10)
        assert.ok(b.sum > a.sum,
            "Điên làm Q mạnh hơn")
        assert.equal(a.mana,
            200 - pj.q0)
    })
test("Q: Mù thì không dùng được",
    () => {
        const s = mk({
            A: {
                jinx: 2
            }, B: {
                braum: 2
            }
        })
        gm(s).status(u(s,
            "A",
            "jinx"),
        "blind",
        1,
        {
            of: "A"
        })
        const c = card(s,
            "A",
            "jinx",
            "Q")
        s.players.A.hand.push(c)
        assert.ok(!cg.legalActions(s,
            "A").some((x) => x.t === "play" && x.uid === c.uid))
    })
test("Tên Lửa: đòn trúng gây q2 + q3·AD lên 2 đường kề mục tiêu (event có via)",
    () => {
        const s = mk({
            A: {
                jinx: 2
            }, B: {
                braum: 2, zed: 1, garen: 3
            }, modes: {
                jinx: "rocket"
            }
        })
        const r = basic(s,
            "A",
            "A:jinx",
            "B:braum")
        const want = (h: string) => mit(fval(s,
            "A",
            "jinx",
            kj.x("q2 + q3·AD")),
        armor(r.s,
            "B",
            h))
        for (const h of ["zed",
            "garen"]) {
            const d = dmgTo(r.ev,
                `B:${h}`)
            assert.equal(d.length,
                1,
                `${h} nhận đúng 1 phát`)
            assert.equal(d[0].amount,
                want(h))
            assert.equal(d[0].via,
                "B:braum")
        }
        // Súng Máy không nổ lan
        const s2 = mk({
            A: {
                jinx: 2
            }, B: {
                braum: 2, zed: 1, garen: 3
            }
        })
        const r2 = basic(s2,
            "A",
            "A:jinx",
            "B:braum")
        assert.equal(dmgTo(r2.ev,
            "B:zed").length,
        0)
    })
test("nội tại: mỗi Điên làm đòn trúng thêm p4 + p5·AD vật lý, không chí mạng",
    () => {
        const s = mk({
            A: {
                jinx: 2
            }, B: {
                braum: 2
            }, modes: {
                jinx: "rocket"
            }
        })
        const j = u(s,
            "A",
            "jinx")
        j.stacks.frenzy = 5
        gm(s).status(j,
            "crit_up",
            99,
            {
                v: 1
            })
        const per = fval(s,
            "A",
            "jinx",
            kj.x("p4 + p5·AD"))
        const r = basic(s,
            "A",
            "A:jinx",
            "B:braum")
        const d = dmgTo(r.ev,
            "B:braum")
        assert.ok(d.some((e) => Math.abs(e.amount - mit(5 * per,
            armor(r.s,
                "B",
                "braum"))) <= 1),
        `không thấy ${mit(5 * per,
            armor(r.s,
                "B",
                "braum"))} trong ${d.map((e) => e.amount)}`)
    })
test("nội tại: cơ hội theo tỉ lệ Máu đã mất của mục tiêu, nhận p2 + p2b·Tốc Đánh Điên",
    () => {
        withParams(kj,
            {
                p1: 10
            },
            {
            },
            () => {
                const s = mk({
                    A: {
                        jinx: 2
                    }, B: {
                        braum: 2
                    }, modes: {
                        jinx: "rocket"
                    }
                })
                const b = u(s,
                    "B",
                    "braum")
                b.hp = Math.floor(b.maxHp / 2)
                const want = fval(s,
                    "A",
                    "jinx",
                    kj.x("p2 + p2b·Tốc Đánh"))
                const r = basic(s,
                    "A",
                    "A:jinx",
                    "B:braum")
                const got = stackOn(r.s,
                    "A",
                    "jinx",
                    "frenzy")
                assert.ok(got === Math.floor(want) || got === Math.ceil(want),
                    `Điên ${got} vs ${want}`)
            })
        withParams(kj,
            {
                p1: 0
            },
            {
            },
            () => {
                const s = mk({
                    A: {
                        jinx: 2
                    }, B: {
                        braum: 2
                    }
                })
                u(s,
                    "B",
                    "braum").hp = Math.floor(u(s,
                    "B",
                    "braum").maxHp / 2)
                assert.equal(stackOn(basic(s,
                    "A",
                    "A:jinx",
                    "B:braum").s,
                "A",
                "jinx",
                "frenzy"),
                0)
            })
    })
test("nội tại: hạ gục tướng địch nhận thêm p3 Điên",
    () => {
        withParams(kj,
            {
                p1: 0
            },
            {
            },
            () => {
                const s = mk({
                    A: {
                        jinx: 2
                    }, B: {
                        braum: 2
                    }
                })
                u(s,
                    "B",
                    "braum").hp = 1
                const r = basic(s,
                    "A",
                    "A:jinx",
                    "B:braum")
                assert.equal(u(r.s,
                    "B",
                    "braum").status,
                "dead")
                assert.equal(stackOn(r.s,
                    "A",
                    "jinx",
                    "frenzy"),
                pj.p3)
            })
    })
test("Điên mất một nửa khi Jinx chết",
    () => {
        assert.deepEqual(cg.getHero("jinx")!.deathHalf,
            ["frenzy"])
        const s = mk({
            A: {
                jinx: 2
            }, B: {
                braum: 2
            }
        })
        u(s,
            "A",
            "jinx").stacks.frenzy = 9
        gm(s).kill(u(s,
            "A",
            "jinx"),
        u(s,
            "B",
            "braum"))
        assert.equal(stackOn(s,
            "A",
            "jinx",
            "frenzy"),
        4)
    })
test("E: Quick, nối khi địch đánh đúng 1 tướng mình; mục tiêu là kẻ đánh, sát thương và Mù e3 + e4·AD đơn vị",
    () => {
        const s = mk({
            A: {
                jinx: 1, braum: 2
            }, B: {
                zed: 2
            }
        })
        card(s,
            "A",
            "jinx",
            "E")
        const r0 = attackOpen(s,
            "B:zed",
            "A:braum")
        assert.equal(r0.s.phase,
            "chain")
        const r = chainWith(r0.s,
            "A",
            "jinx_e",
            {
                target: "B:zed"
            },
            r0.ev)
        assert.equal(dmgOn(r.ev,
            "B:zed"),
        mit(fval(r.s,
            "A",
            "jinx",
            kj.x("e1 + e2·AD")),
        armor(r.s,
            "B",
            "zed")))
        unitsOk(r.s,
            u(r.s,
                "A",
                "jinx"),
            u(r.s,
                "B",
                "zed").statuses.blind?.until,
            fval(r.s,
                "A",
                "jinx",
                kj.x("e3 + e4·AD")))
        assert.equal(mana(r.s,
            "A"),
        200 - pj.e0)
    })
test("E: không nối được khi địch dùng lá chiêu",
    () => {
        const s = mk({
            A: {
                jinx: 1, braum: 2
            }, B: {
                zed: 2
            }
        })
        card(s,
            "A",
            "jinx",
            "E")
        const r0 = skillOpen(s,
            "zed",
            "Q",
            {
            })
        assert.notEqual(r0.s.phase,
            "chain")
        assert.equal(chainOpts(r0.s,
            "A",
            "jinx_e").length,
        0)
    })
test("R: địch bất kỳ đường nhận r1 + r2·AD + r3% Máu đã mất, đường kề nhận r4%",
    () => {
        const s = mk({
            A: {
                jinx: 2
            }, B: {
                braum: 1, zed: 3, garen: 4
            }
        })
        const b = u(s,
            "B",
            "braum")
        b.hp = Math.floor(b.maxHp * 0.6)
        const c = card(s,
            "A",
            "jinx",
            "R")
        assert.ok(legalPlay(s,
            "A",
            c,
            {
                target: "B:zed"
            }),
        "R chọn được lane bất kỳ")
        const raw = fval(s,
            "A",
            "jinx",
            kj.x("r1 + r2·AD + r3% Máu đã mất mục tiêu"),
            u(s,
                "B",
                "zed"))
        const r = cast(s,
            "A",
            c,
            {
                target: "B:zed"
            })
        assert.equal(dmgOn(r.ev,
            "B:zed"),
        mit(raw,
            armor(r.s,
                "B",
                "zed")))
        assert.equal(dmgOn(r.ev,
            "B:garen"),
        mit(raw * pj.r4 / 100,
            armor(r.s,
                "B",
                "garen")))
        assert.equal(dmgOn(r.ev,
            "B:braum"),
        0,
        "braum ở lane 1 không kề zed (lane 3)")
        assert.equal(mana(r.s,
            "A"),
        200 - pj.r0)
    })
test("R: hai đường kề cùng nhận r4%",
    () => {
        const s = mk({
            A: {
                jinx: 2
            }, B: {
                braum: 1, zed: 2, garen: 3
            }
        })
        const raw = fval(s,
            "A",
            "jinx",
            kj.x("r1 + r2·AD + r3% Máu đã mất mục tiêu"),
            u(s,
                "B",
                "zed"))
        const r = cast(s,
            "A",
            card(s,
                "A",
                "jinx",
                "R"),
            {
                target: "B:zed"
            })
        assert.equal(dmgOn(r.ev,
            "B:braum"),
        mit(raw * pj.r4 / 100,
            armor(r.s,
                "B",
                "braum")))
        assert.equal(dmgOn(r.ev,
            "B:garen"),
        mit(raw * pj.r4 / 100,
            armor(r.s,
                "B",
                "garen")))
    })
test("R: hạ gục kích Phấn Khích (nhận Điên p2 + p2b·Tốc Đánh, cộng p3 hạ gục)",
    () => {
        const s = mk({
            A: {
                jinx: 2
            }, B: {
                braum: 0
            }
        })
        u(s,
            "B",
            "braum").hp = 5
        const want = fval(s,
            "A",
            "jinx",
            kj.x("p2 + p2b·Tốc Đánh"))
        const r = cast(s,
            "A",
            card(s,
                "A",
                "jinx",
                "R"),
            {
                target: "B:braum"
            })
        const got = stackOn(r.s,
            "A",
            "jinx",
            "frenzy") - pj.p3
        assert.ok(got === Math.floor(want) || got === Math.ceil(want),
            `Điên ${got} vs ${want}`)
    })

// ======================================================================
G("Miss Fortune")
test("Q 1x1: 1 địch đúng 1 phát q1 + q2·AD, không lan sang ai",
    () => {
        const s = mk({
            A: {
                missfortune: 2
            }, B: {
                braum: 2, zed: 1, garen: 3
            }
        })
        const raw = fval(s,
            "A",
            "missfortune",
            km.x("q1 + q2·AD"))
        const r = cast(s,
            "A",
            card(s,
                "A",
                "missfortune",
                "Q"),
            {
                target: "B:braum"
            })
        const hits = dmgEvents(r.ev)
        assert.equal(hits.length,
            1)
        assert.equal(hits[0].target,
            "B:braum")
        assert.equal(hits[0].amount,
            mit(raw,
                armor(r.s,
                    "B",
                    "braum")))
        assert.equal(hits[0].tag,
            "skill")
        assert.equal(mana(r.s,
            "A"),
        200 - pm.q0)
    })
test("Q: chí mạng nhân hệ số chí mạng như đòn đánh",
    () => {
        const s = mk({
            A: {
                missfortune: 2
            }, B: {
                braum: 2
            }
        })
        gm(s).status(u(s,
            "A",
            "missfortune"),
        "alwaysCrit",
        5,
        {
            v: 1
        })
        const raw = fval(s,
            "A",
            "missfortune",
            km.x("q1 + q2·AD")) * (cg.RULES.critBase + gm(s).stats(u(s,
            "A",
            "missfortune")).critDmg)
        const r = cast(s,
            "A",
            card(s,
                "A",
                "missfortune",
                "Q"),
            {
                target: "B:braum"
            })
        const hits = dmgEvents(r.ev)
        assert.equal(hits.length,
            1)
        assert.ok(hits[0].crit)
        assert.equal(hits[0].amount,
            mit(raw,
                armor(r.s,
                    "B",
                    "braum")))
    })
test("Q: không có Chí mạng thì không chí mạng",
    () => {
        const s = mk({
            A: {
                missfortune: 2
            }, B: {
                braum: 2
            }
        })
        const r = cast(s,
            "A",
            card(s,
                "A",
                "missfortune",
                "Q"),
            {
                target: "B:braum"
            })
        assert.ok(dmgEvents(r.ev).every((e) => !e.crit))
    })
test("E 3x3: tâm và 2 đường kề mỗi tướng trúng e3 phát e1 + e2·AD; đường xa không dính",
    () => {
        const s = mk({
            A: {
                missfortune: 2
            }, B: {
                garen: 1, braum: 2, zed: 3, leona: 4
            }
        })
        const raw = fval(s,
            "A",
            "missfortune",
            km.x("e1 + e2·AD"))
        const r = cast(s,
            "A",
            card(s,
                "A",
                "missfortune",
                "E"),
            {
                target: "B:braum"
            })
        for (const h of ["garen",
            "braum",
            "zed"]) {
            const hits = dmgEvents(r.ev).filter((e) => e.target === `B:${h}`)
            assert.equal(hits.length,
                pm.e3,
                `${h} trúng e3 phát`)
            for (const e of hits) assert.equal(e.amount,
                mit(raw,
                    armor(r.s,
                        "B",
                        h)))
        }
        assert.equal(dmgOn(r.ev,
            "B:leona"),
        0,
        "đường thứ 4 không dính")
        assert.equal(mana(r.s,
            "A"),
        200 - pm.e0)
    })
test("E: tâm ở mép sân chỉ có 1 đường kề",
    () => {
        const s = mk({
            A: {
                missfortune: 2
            }, B: {
                garen: 0, braum: 1, zed: 2
            }
        })
        const r = cast(s,
            "A",
            card(s,
                "A",
                "missfortune",
                "E"),
            {
                target: "B:garen"
            })
        assert.equal(dmgEvents(r.ev).filter((e) => e.target === "B:garen").length,
            pm.e3)
        assert.equal(dmgEvents(r.ev).filter((e) => e.target === "B:braum").length,
            pm.e3)
        assert.equal(dmgOn(r.ev,
            "B:zed"),
        0)
    })
test("R 5x5: r3 loạt, mỗi loạt mọi tướng địch trúng 1 phát r1 + r2·AD",
    () => {
        const s = mk({
            A: {
                missfortune: 2
            }, B: {
                garen: 0, braum: 1, zed: 2, leona: 3, ornn: 4
            }
        })
        for (const h of ["garen",
            "braum",
            "zed",
            "leona",
            "ornn"]) u(s,
            "B",
            h).maxHp = u(s,
            "B",
            h).hp = 9000
        const raw = fval(s,
            "A",
            "missfortune",
            km.x("r1 + r2·AD"))
        const r = cast(s,
            "A",
            card(s,
                "A",
                "missfortune",
                "R"),
            {
            })
        for (const h of ["garen",
            "braum",
            "zed",
            "leona",
            "ornn"]) {
            const hits = dmgEvents(r.ev).filter((e) => e.target === `B:${h}`)
            assert.equal(hits.length,
                pm.r3,
                `${h} trúng r3 phát`)
            for (const e of hits) assert.equal(e.amount,
                mit(raw,
                    armor(r.s,
                        "B",
                        h)))
        }
        assert.equal(mana(r.s,
            "A"),
        200 - pm.r0)
    })
test("nội tại: mỗi phát đạn tung chí mạng riêng (50% Chí mạng: có phát chí mạng, có phát không)",
    () => {
        const s = mk({
            A: {
                missfortune: 2
            }, B: {
                garen: 0, braum: 1, zed: 2, leona: 3, ornn: 4
            }
        })
        for (const h of ["garen",
            "braum",
            "zed",
            "leona",
            "ornn"]) u(s,
            "B",
            h).maxHp = u(s,
            "B",
            h).hp = 9000
        u(s,
            "A",
            "missfortune").items = ["vo_cuc_kiem"]
        const r = cast(s,
            "A",
            card(s,
                "A",
                "missfortune",
                "R"),
            {
            })
        const hits = dmgEvents(r.ev).filter((e) => e.src === "A:missfortune" && e.tag === "skill")
        assert.equal(hits.length,
            5 * pm.r3)
        assert.ok(hits.some((e) => e.crit) && hits.some((e) => !e.crit),
            "chí mạng tung riêng từng phát")
    })
test("đánh thường không còn nảy sang địch khác",
    () => {
        const s = mk({
            A: {
                braum: 2, zed: 1
            }, B: {
                missfortune: 2
            }
        })
        const r = attackOpen(s,
            "B:missfortune",
            "A:braum")
        assert.ok(dmgOn(r.ev,
            "A:braum") > 0)
        assert.equal(dmgOn(r.ev,
            "A:zed"),
        0)
    })

// ======================================================================
G("Chữ và dữ liệu")
test("mọi tham số JSON của nhóm Xạ thủ là số hữu hạn; q0/e0/r0 có mặt",
    () => {
        for (const id of ["ashe",
            "teemo",
            "tristana",
            "kogmaw",
            "jinx",
            "missfortune"]) {
            const k = cg.kit(id)
            for (const [name,
                v] of Object.entries(k.raw.params)) assert.ok(Number.isFinite(v),
                `${id}.${name}`)
            if (id !== "missfortune") for (const key of ["q0",
                "e0",
                "r0"]) assert.ok(k.raw.params[key] > 0,
                `${id}.${key}`)
        }
    })
test("bản dịch EN: công thức khớp VI với 6 tướng Xạ thủ",
    () => {
        const mine = ["ashe",
            "teemo",
            "tristana",
            "kogmaw",
            "jinx",
            "missfortune"]
        const errs = cg.checkTranslations().filter((e) => mine.some((id) => e.startsWith(`${id}.`)))
        assert.deepEqual(errs,
            [])
    })
test("trạng thái, bộ đếm, từ khoá mới đều có chữ VI/EN; tên từ khoá không trùng",
    () => {
        for (const id of ["ashe_q",
            "tri_q",
            "kog_e"]) assert.ok(cg.STATUS_V2[id]?.vi.name && cg.STATUS_V2[id]?.en.name,
            id)
        for (const id of ["frost",
            "tri_bomb",
            "hunger",
            "frenzy",
            "jinx_gun"]) assert.ok(cg.STACK_V2[id]?.vi.name && cg.STACK_V2[id]?.en.name,
            id)
        const seen = new Map<string, string>()
        for (const [id,
            kw] of Object.entries(KEYWORDS)) {
            const prev = seen.get(kw.vi)
            assert.ok(!prev || prev === id,
                `từ khoá VI "${kw.vi}" trùng giữa ${prev} và ${id}`)
            seen.set(kw.vi,
                id)
        }
    })
test("chữ trên lá lấy số từ JSON (desc chứa giá trị hiện tại)",
    () => {
        const h = cg.getHero("ashe")!
        assert.ok(h.skills.Q.desc.includes(String(pa.q1)) && h.skills.Q.desc.includes(String(pa.q3)))
        assert.ok(cg.getHero("tristana")!.passive.desc.includes(String(pr.p3)))
    })

report()
