// Test bộ chiêu nhóm Đỡ đòn (Braum, Leona, Malphite, Blitzcrank, Ornn) và Garen. Chạy: npx tsx scripts/card_tests_kits_tank.ts [--only=chuỗi] [--verbose]
// Mọi kỳ vọng tính từ cg.kit(id).p và chỉ số engine, nên sửa balance/heroes/*.json không làm vỡ test.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    G, act, basic, cast, dmgOn, endTurn, gm, mk, report, skill, sup, test, u,
    type Act, type Ev, type S, type St
} from "./kit_test_util"

const kb = cg.kit("braum").p, kl = cg.kit("leona").p, km = cg.kit("malphite").p
const kz = cg.kit("blitzcrank").p, ko = cg.kit("ornn").p, kg = cg.kit("garen").p

const mit = (raw: number, def: number) => Math.round(raw * 100 / (100 + def))
const armor = (s: St, side: S, h: string) => gm(s).armor(u(s,
    side,
    h))
const mr = (s: St, side: S, h: string) => gm(s).mr(u(s,
    side,
    h))
/** Đặt lá chiêu lên tay (tại chỗ) để kiểm tra hành động hợp lệ */
const card = (s: St, side: S, hero: string, key: cg.SkillKey) => { const c = skill(s,
    hero,
    side,
    key); s.players[side].hand.push(c); return c }
type ChainAct = Extract<Act, { t: "chain" }>
const chainOpts = (s: St, side: S, id: string): ChainAct[] => (cg.legalActions(s,
    side).filter((a) => a.t === "chain") as ChainAct[])
    .filter((a) => s.players[side].hand.find((c) => c.uid === a.uid)?.id === id)
const hasPlay = (s: St, side: S, id: string) => cg.legalActions(s,
    side).some((a) => a.t === "play" && s.players[side].hand.find((c) => c.uid === a.uid)?.id === id)
/** Bỏ qua cho tới khi Chuỗi giải quyết xong */
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
/** Nối Chuỗi bằng lá `id` rồi giải quyết */
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
/** Số đơn vị Choáng/Câm Lặng hợp lệ: floor(d) chắc chắn, phần lẻ có thể thêm 1 */
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
const nth = (n: number, fn: (seed: number) => boolean) => { let c = 0; for (let i = 0; i < n; i++) if (fn(20261101 + i)) c++; return c }

// ======================================================================
G("Braum")
test("nội tại: đòn địch trúng cho Song Giáp, mỗi tầng tăng Giáp và Kháng",
    () => {
        const s = mk({
            A: {
                braum: 1
            }, B: {
                leona: 1
            }
        })
        const a0 = armor(s,
                "A",
                "braum"), m0 = mr(s,
                "A",
                "braum")
        s.active = "B"
        const r = basic(s,
            "B",
            "B:leona",
            "A:braum")
        assert.equal(u(r.s,
            "A",
            "braum").stacks.braum_dual,
        kb.p1)
        assert.equal(armor(r.s,
            "A",
            "braum"),
        Math.round(a0 + kb.p1 * kb.p2))
        assert.equal(mr(r.s,
            "A",
            "braum"),
        Math.round(m0 + kb.p1 * kb.p2))
        // đòn của đồng minh lên địch không cho Song Giáp
        const s2 = mk({
            A: {
                braum: 1
            }, B: {
                leona: 1
            }
        })
        const r2 = basic(s2,
            "A",
            "A:braum",
            "B:leona")
        assert.equal(u(r2.s,
            "A",
            "braum").stacks.braum_dual ?? 0,
        0)
    })
test("nội tại: bị hạ mất một nửa Song Giáp",
    () => {
        const s = mk({
            A: {
                braum: 1
            }, B: {
                leona: 1
            }
        })
        u(s,
            "A",
            "braum").stacks.braum_dual = 11
        gm(s).kill(u(s,
            "A",
            "braum"),
        u(s,
            "B",
            "leona"))
        assert.equal(u(s,
            "A",
            "braum").stacks.braum_dual,
        5)
    })
test("Q: sát thương phép theo Máu tối đa và đặt Dấu Băng đúng q3 đơn vị",
    () => {
        const s = mk({
            A: {
                braum: 1
            }, B: {
                leona: 3
            }
        })
        const r = cast(s,
            "A",
            skill(s,
                "braum",
                "A",
                "Q"),
            {
                target: "B:leona"
            })
        const t = u(r.s,
                "B",
                "leona"), b = u(r.s,
                "A",
                "braum")
        assert.equal(dmgOn(r.ev,
            t.id),
        mit(kb.q1 + kb.q2 * b.maxHp,
            mr(r.s,
                "B",
                "leona")))
        const m = t.marks?.find((x) => x.id === "braum_mark")
        assert.ok(m)
        assert.equal(m!.until,
            gm(r.s).unitsUntil(b,
                kb.q3))
    })
test("Q: đồng minh khác Braum đánh trúng tiêu dấu, Choáng và Braum nhận Song Giáp",
    () => {
        const s = mk({
            A: {
                braum: 1, garen: 2
            }, B: {
                malphite: 2, leona: 1
            }
        })
        let q = cast(s,
            "A",
            skill(s,
                "braum",
                "A",
                "Q"),
            {
                target: "B:malphite"
            })
        q = basic(q.s,
            "A",
            "A:garen",
            "B:malphite")
        const t = u(q.s,
                "B",
                "malphite"), b = u(q.s,
                "A",
                "braum")
        assert.equal(t.marks?.filter((x) => x.id === "braum_mark").length ?? 0,
            0,
            "dấu bị tiêu")
        assert.equal(b.stacks.braum_dual,
            kb.p5)
        unitsOk(q.s,
            b,
            t.statuses.stun?.until,
            gm(q.s).f(b,
                cg.kit("braum").x("p3 + p4·Giáp")))
    })
test("Q: Braum tự đánh thì dấu giữ nguyên, không Choáng",
    () => {
        const s = mk({
            A: {
                braum: 2, garen: 1
            }, B: {
                malphite: 2, leona: 1
            }
        })
        let r = cast(s,
            "A",
            skill(s,
                "braum",
                "A",
                "Q"),
            {
                target: "B:malphite"
            })
        r = basic(r.s,
            "A",
            "A:braum",
            "B:malphite")
        assert.equal(u(r.s,
            "B",
            "malphite").marks?.filter((x) => x.id === "braum_mark").length,
        1)
        assert.equal(u(r.s,
            "A",
            "braum").stacks.braum_dual ?? 0,
        0)
        assert.equal(u(r.s,
            "B",
            "malphite").statuses.stun,
        undefined)
    })
test("Q: Dấu Băng hết hạn sau q3 đơn vị",
    () => {
        const s = mk({
            A: {
                braum: 1
            }, B: {
                leona: 3
            }
        })
        const r = cast(s,
            "A",
            skill(s,
                "braum",
                "A",
                "Q"),
            {
                target: "B:leona"
            })
        const until = u(r.s,
            "B",
            "leona").marks![0].until
        let st = r.s
        for (let i = 0; i < 12 && st.turnNo <= until; i++) {
            assert.equal(u(st,
                "B",
                "leona").marks?.length ?? 0,
            1,
            `còn dấu ở lượt ${st.turnNo}`)
            st = endTurn(st).s
        }
        assert.equal(u(st,
            "B",
            "leona").marks?.length ?? 0,
        0)
    })
test("E: Chỉ Nối Chuỗi, không chơi chủ động",
    () => {
        const s = mk({
            A: {
                braum: 1, garen: 2
            }, B: {
                leona: 2
            }
        })
        card(s,
            "A",
            "braum",
            "E")
        assert.equal(hasPlay(s,
            "A",
            "braum_e"),
        false)
    })
test("E: địch đánh đúng 1 tướng mình khác: huỷ tác động lên nó, Braum nhận e5% sát thương, Song Giáp và Khiên",
    () => {
        const s = mk({
            A: {
                braum: 1, garen: 2
            }, B: {
                leona: 2
            }
        })
        card(s,
            "A",
            "braum",
            "E")
        const open = attackOpen(s,
            "B:leona",
            "A:garen")
        assert.equal(open.s.phase,
            "chain")
        const r = chainWith(open.s,
            "A",
            "braum_e",
            {
            },
            open.ev)
        const b = u(r.s,
                "A",
                "braum"), g = u(r.s,
                "A",
                "garen")
        assert.equal(g.hp,
            g.maxHp,
            "Garen không nhận sát thương")
        assert.equal(dmgOn(r.ev,
            g.id),
        0)
        assert.equal(b.stacks.braum_dual,
            kb.e4)
        const raw = gm(r.s).atk(u(r.s,
            "B",
            "leona"))
        assert.equal(dmgOn(r.ev,
            b.id),
        mit(raw * kb.e5 / 100,
            armor(r.s,
                "A",
                "braum")))
        const shield = Math.round(kb.e1 + kb.e2 * b.maxHp + kb.e3 * armor(r.s,
            "A",
            "braum"))
        assert.ok(r.ev.some((e) => e.t === "shield" && e.target === b.id && e.amount === shield),
            "Khiên theo công thức")
    })
test("E: nối được lên chiêu nhắm đúng 1 tướng mình khác (kể cả R đơn mục tiêu)",
    () => {
        const s = mk({
            A: {
                braum: 1, leona: 2
            }, B: {
                garen: 2
            }
        })
        card(s,
            "A",
            "braum",
            "E")
        s.active = "B"
        const open = cast(s,
            "B",
            skill(s,
                "garen",
                "B",
                "R"),
            {
                target: "A:leona"
            },
            false)
        assert.equal(open.s.phase,
            "chain")
        const r = chainWith(open.s,
            "A",
            "braum_e",
            {
            },
            open.ev)
        assert.equal(dmgOn(r.ev,
            "A:leona"),
        0)
        assert.ok(dmgOn(r.ev,
            "A:braum") > 0)
        assert.equal(u(r.s,
            "A",
            "leona").hp,
        u(r.s,
            "A",
            "leona").maxHp)
    })
test("E: không nối khi địch nhắm Braum, hoặc chiêu cả phe",
    () => {
        const s = mk({
            A: {
                braum: 1, garen: 2
            }, B: {
                leona: 1
            }
        })
        card(s,
            "A",
            "braum",
            "E")
        const open = attackOpen(s,
            "B:leona",
            "A:braum")
        assert.notEqual(open.s.phase,
            "chain",
            "đánh chính Braum")
        const s2 = mk({
            A: {
                braum: 1, garen: 2
            }, B: {
                leona: 1
            }
        })
        card(s2,
            "A",
            "braum",
            "E")
        s2.active = "B"
        const r2 = cast(s2,
            "B",
            skill(s2,
                "leona",
                "B",
                "R"),
            {
            },
            false)
        assert.notEqual(r2.s.phase,
            "chain",
            "chiêu cả phe")
    })
test("R: mọi địch nhận sát thương phép, đối diện Choáng r3 + r4·Giáp",
    () => {
        const s = mk({
            A: {
                braum: 1
            }, B: {
                leona: 1, garen: 2, malphite: 3
            }
        })
        const r = cast(s,
            "A",
            skill(s,
                "braum",
                "A",
                "R"))
        const b = u(r.s,
                "A",
                "braum"), g = gm(r.s)
        for (const h of ["leona",
            "garen",
            "malphite"]) assert.equal(dmgOn(r.ev,
            `B:${h}`),
        mit(kb.r1 + kb.r2 * b.maxHp,
            mr(r.s,
                "B",
                h)))
        unitsOk(r.s,
            b,
            u(r.s,
                "B",
                "leona").statuses.stun?.until,
            kb.r3 + kb.r4 * g.armor(b))
        assert.ok(u(r.s,
            "B",
            "leona").statuses.stun,
        "đối diện luôn Choáng")
    })
test("R: địch không đối diện Choáng theo phần lẻ r5 + r6·Giáp (xác suất)",
    () => {
        const n = nth(30,
            (seed) => {
                const s = mk({
                    A: {
                        braum: 1
                    }, B: {
                        leona: 1, garen: 2
                    }, seed
                })
                const r = cast(s,
                    "A",
                    skill(s,
                        "braum",
                        "A",
                        "R"))
                return !!u(r.s,
                    "B",
                    "garen").statuses.stun
            })
        const d = kb.r5 + kb.r6 * 38
        assert.ok(d < 1 && d > 0)
        assert.ok(n > 0 && n < 30,
            `n=${n}`)
    })

// ======================================================================
G("Leona")
test("nội tại: thêm p1% tổng Giáp",
    () => {
        const s = mk({
            A: {
                leona: 1
            }
        })
        const l = u(s,
            "A",
            "leona")
        assert.equal(armor(s,
            "A",
            "leona"),
        Math.round(35 * (1 + kl.p1 / 100)))
        gm(s).status(l,
            "armor_up",
            1,
            {
                v: 20
            })
        assert.equal(armor(s,
            "A",
            "leona"),
        Math.round(55 * (1 + kl.p1 / 100)))
    })
test("Q: đối diện nhận sát thương vật lý theo Giáp và Choáng",
    () => {
        const s = mk({
            A: {
                leona: 1
            }, B: {
                garen: 1
            }
        })
        const r = cast(s,
            "A",
            skill(s,
                "leona",
                "A",
                "Q"))
        const l = u(r.s,
            "A",
            "leona")
        assert.equal(dmgOn(r.ev,
            "B:garen"),
        mit(kl.q1 + kl.q2 * armor(r.s,
            "A",
            "leona"),
        armor(r.s,
            "B",
            "garen")))
        unitsOk(r.s,
            l,
            u(r.s,
                "B",
                "garen").statuses.stun?.until,
            kl.q3 + kl.q4 * armor(r.s,
                "A",
                "leona"))
    })
test("E: Quick, nối khi địch đánh: Choáng kẻ đó huỷ đòn, Leona nhận Giáp theo đơn vị",
    () => {
        const s = mk({
            A: {
                leona: 1, braum: 2
            }, B: {
                garen: 2
            }
        })
        card(s,
            "A",
            "leona",
            "E")
        const open = attackOpen(s,
            "B:garen",
            "A:braum")
        assert.equal(open.s.phase,
            "chain")
        const l0 = u(open.s,
            "A",
            "leona")
        const armorBefore = gm(open.s).armor(l0)
        const r = chainWith(open.s,
            "A",
            "leona_e",
            {
                target: "B:garen"
            },
            open.ev)
        const l = u(r.s,
            "A",
            "leona")
        assert.equal(dmgOn(r.ev,
            "A:braum"),
        0,
        "đòn gốc bị huỷ vì kẻ đánh bị Choáng")
        assert.ok(u(r.s,
            "B",
            "garen").statuses.stun)
        assert.equal(dmgOn(r.ev,
            "B:garen"),
        mit(kl.e1 + kl.e2 * armorBefore,
            mr(r.s,
                "B",
                "garen")))
        const up = l.statuses.armor_up
        assert.ok(up)
        assert.equal(Math.round(up.v),
            Math.round(kl.e5 + kl.e6 * armorBefore))
        assert.equal(up.until,
            gm(r.s).unitsUntil(l,
                kl.e7))
    })
test("E: nối được lên lá chiêu của địch; chủ động chọn 1 địch",
    () => {
        const s = mk({
            A: {
                leona: 1, braum: 2
            }, B: {
                garen: 2
            }
        })
        card(s,
            "A",
            "leona",
            "E")
        s.active = "B"
        const open = cast(s,
            "B",
            skill(s,
                "garen",
                "B",
                "Q"),
            {
            },
            false)
        assert.equal(open.s.phase,
            "chain")
        assert.equal(chainOpts(open.s,
            "A",
            "leona_e").length,
        1)
        const s2 = mk({
            A: {
                leona: 1
            }, B: {
                garen: 3
            }
        })
        card(s2,
            "A",
            "leona",
            "E")
        assert.equal(hasPlay(s2,
            "A",
            "leona_e"),
        true)
    })
test("R: mọi địch nhận sát thương phép và Choáng r3 + r4·Giáp",
    () => {
        const s = mk({
            A: {
                leona: 1
            }, B: {
                garen: 1, braum: 2, malphite: 3
            }
        })
        const r = cast(s,
            "A",
            skill(s,
                "leona",
                "A",
                "R"))
        const l = u(r.s,
            "A",
            "leona")
        for (const h of ["garen",
            "braum",
            "malphite"]) {
            assert.equal(dmgOn(r.ev,
                `B:${h}`),
            mit(kl.r1 + kl.r2 * armor(r.s,
                "A",
                "leona"),
            mr(r.s,
                "B",
                h)))
            unitsOk(r.s,
                l,
                u(r.s,
                    "B",
                    h).statuses.stun?.until,
                kl.r3 + kl.r4 * armor(r.s,
                    "A",
                    "leona"))
        }
    })

// ======================================================================
G("Malphite")
test("nội tại: mọi tướng mình thêm p1·Giáp và p2·Máu tối đa của Malphite; mất khi Malphite bị hạ",
    () => {
        const solo = mk({
            A: {
                garen: 2
            }
        })
        const s = mk({
            A: {
                malphite: 1, garen: 2
            }
        })
        assert.equal(armor(s,
            "A",
            "garen"),
        Math.round(armor(solo,
            "A",
            "garen") + km.p1 * 35))
        const gar = u(s,
                "A",
                "garen"), mal = u(s,
                "A",
                "malphite")
        assert.equal(gar.maxHp,
            u(solo,
                "A",
                "garen").maxHp + Math.round(km.p2 * 500))
        assert.equal(mal.maxHp,
            500 + Math.round(km.p2 * 500))
        gm(s).kill(mal,
            u(s,
                "B",
                "braum"))
        assert.equal(gar.maxHp,
            u(solo,
                "A",
                "garen").maxHp)
        assert.equal(armor(s,
            "A",
            "garen"),
        armor(solo,
            "A",
            "garen"))
    })
test("Q: sát thương phép và mọi tướng mình nhận Giáp q3 + q4·Giáp trong q5 đơn vị",
    () => {
        const s = mk({
            A: {
                malphite: 1, garen: 2
            }, B: {
                leona: 3
            }
        })
        const base = armor(s,
            "A",
            "malphite")
        const r = cast(s,
            "A",
            skill(s,
                "malphite",
                "A",
                "Q"),
            {
                target: "B:leona"
            })
        const m = u(r.s,
            "A",
            "malphite")
        assert.equal(dmgOn(r.ev,
            "B:leona"),
        mit(km.q1 + km.q2 * base,
            mr(r.s,
                "B",
                "leona")))
        for (const h of ["malphite",
            "garen"]) {
            const st = u(r.s,
                "A",
                h).statuses.armor_up
            assert.ok(st,
                h)
            assert.equal(Math.round(st.v),
                Math.round(km.q3 + km.q4 * base))
            assert.equal(st.until,
                gm(r.s).unitsUntil(m,
                    km.q5))
        }
    })
test("E: Quick; nối Liên Kết Đá không hết hạn, địch đánh 1 tướng liên kết thì chia đều",
    () => {
        const s = mk({
            A: {
                malphite: 1, garen: 2
            }, B: {
                leona: 2
            }
        })
        card(s,
            "A",
            "malphite",
            "E")
        const open = attackOpen(s,
            "B:leona",
            "A:garen")
        assert.equal(open.s.phase,
            "chain")
        const r = chainWith(open.s,
            "A",
            "malphite_e",
            {
                target: "A:garen"
            },
            open.ev)
        const gar = u(r.s,
                "A",
                "garen"), mal = u(r.s,
                "A",
                "malphite")
        assert.equal(gar.statuses.stone_link.until,
            cg.FOREVER)
        assert.equal(mal.statuses.stone_link.until,
            cg.FOREVER)
        const raw = gm(r.s).atk(u(r.s,
            "B",
            "leona")) / 2
        assert.equal(dmgOn(r.ev,
            gar.id),
        mit(raw,
            armor(r.s,
                "A",
                "garen")))
        assert.equal(dmgOn(r.ev,
            mal.id),
        mit(raw,
            armor(r.s,
                "A",
                "malphite")))
    })
test("E: sát thương cả phe không chia; có thể chủ động",
    () => {
        const s = mk({
            A: {
                malphite: 1, garen: 2
            }, B: {
                leona: 3
            }
        })
        const probe = structuredClone(s)
        card(probe,
            "A",
            "malphite",
            "E")
        assert.equal(hasPlay(probe,
            "A",
            "malphite_e"),
        true)
        const r1 = cast(s,
            "A",
            skill(s,
                "malphite",
                "A",
                "E"),
            {
                target: "A:garen"
            })
        r1.s.active = "B"
        const r = cast(r1.s,
            "B",
            skill(r1.s,
                "leona",
                "B",
                "R"))
        const dm = kl.r1 + kl.r2 * armor(r.s,
            "B",
            "leona")
        assert.equal(dmgOn(r.ev,
            "A:garen"),
        mit(dm,
            mr(r.s,
                "A",
                "garen")))
        assert.equal(dmgOn(r.ev,
            "A:malphite"),
        mit(dm,
            mr(r.s,
                "A",
                "malphite")))
    })
test("E: Malphite bị hạ gỡ hết liên kết; tướng bị hạ mất liên kết của nó",
    () => {
        const s0 = mk({
            A: {
                malphite: 1, garen: 2, braum: 3
            }, B: {
                leona: 2
            }
        })
        const a = cast(s0,
            "A",
            skill(s0,
                "malphite",
                "A",
                "E"),
            {
                target: "A:garen"
            })
        const s = cast(a.s,
            "A",
            skill(a.s,
                "malphite",
                "A",
                "E"),
            {
                target: "A:braum"
            }).s
        for (const h of ["malphite",
            "garen",
            "braum"]) assert.ok(u(s,
            "A",
            h).statuses.stone_link,
        h)
        gm(s).kill(u(s,
            "A",
            "garen"),
        u(s,
            "B",
            "leona"))
        assert.equal(u(s,
            "A",
            "garen").statuses.stone_link,
        undefined)
        assert.ok(u(s,
            "A",
            "braum").statuses.stone_link,
        "liên kết còn lại giữ")
        gm(s).kill(u(s,
            "A",
            "malphite"),
        u(s,
            "B",
            "leona"))
        assert.equal(u(s,
            "A",
            "braum").statuses.stone_link,
        undefined)
    })
test("R: mọi địch nhận sát thương phép và mất Giáp r3 + r4·Giáp trong r5 đơn vị; không khống chế",
    () => {
        const s = mk({
            A: {
                malphite: 1
            }, B: {
                garen: 1, braum: 2
            }
        })
        const base = armor(s,
            "A",
            "malphite")
        const before = armor(s,
            "B",
            "garen")
        const r = cast(s,
            "A",
            skill(s,
                "malphite",
                "A",
                "R"))
        const m = u(r.s,
            "A",
            "malphite")
        for (const h of ["garen",
            "braum"]) {
            assert.equal(dmgOn(r.ev,
                `B:${h}`),
            mit(km.r1 + km.r2 * base,
                mr(r.s,
                    "B",
                    h)))
            const st = u(r.s,
                "B",
                h).statuses.armor_down
            assert.ok(st)
            assert.equal(Math.round(st.v),
                Math.round(km.r3 + km.r4 * base))
            assert.equal(st.until,
                gm(r.s).unitsUntil(m,
                    km.r5))
        }
        assert.equal(armor(r.s,
            "B",
            "garen"),
        Math.max(0,
            Math.round(before - (km.r3 + km.r4 * base))))
        const cc = r.ev.filter((e) => e.t === "status" && ["stun",
            "silence",
            "taunt",
            "root",
            "blind"].includes(e.id))
        assert.equal(cc.length,
            0,
            "không khống chế")
    })
test("Q và E của Malphite không gây khống chế",
    () => {
        const s = mk({
            A: {
                malphite: 1, garen: 2
            }, B: {
                leona: 3
            }
        })
        const q = cast(s,
            "A",
            skill(s,
                "malphite",
                "A",
                "Q"),
            {
                target: "B:leona"
            })
        const e = cast(q.s,
            "A",
            skill(q.s,
                "malphite",
                "A",
                "E"),
            {
                target: "A:garen"
            })
        for (const ev of [...q.ev,
            ...e.ev]) if (ev.t === "status") assert.ok(!["stun",
            "silence",
            "taunt",
            "root",
            "blind",
            "chill"].includes(ev.id),
        ev.id)
    })

// ======================================================================
G("Blitzcrank")
test("nội tại: cướp 1 lá cho Phụ Tùng, mỗi tầng tăng Giáp và Kháng; mất một nửa khi chết",
    () => {
        const s = mk({
            A: {
                blitzcrank: 1
            }, B: {
                garen: 3
            }
        })
        s.players.B.hand.push(gm(s).supportCard("gold"))
        const a0 = armor(s,
                "A",
                "blitzcrank"), m0 = mr(s,
                "A",
                "blitzcrank")
        const r = cast(s,
            "A",
            skill(s,
                "blitzcrank",
                "A",
                "Q"),
            {
                target: "B:garen"
            })
        const b = u(r.s,
            "A",
            "blitzcrank")
        assert.equal(b.stacks.blitz_parts,
            1)
        assert.equal(armor(r.s,
            "A",
            "blitzcrank"),
        Math.round(a0 + kz.p1))
        assert.equal(mr(r.s,
            "A",
            "blitzcrank"),
        Math.round(m0 + kz.p1))
        b.stacks.blitz_parts = 9
        gm(r.s).kill(b,
            u(r.s,
                "B",
                "garen"))
        assert.equal(b.stacks.blitz_parts,
            4)
    })
test("Q: cần đối thủ có lá; Cướp lá thường giữ nguyên, gây sát thương phép",
    () => {
        const s0 = mk({
            A: {
                blitzcrank: 1
            }, B: {
                garen: 3
            }
        })
        card(s0,
            "A",
            "blitzcrank",
            "Q")
        assert.equal(hasPlay(s0,
            "A",
            "blitzcrank_q"),
        false,
        "tay địch rỗng")
        const s = mk({
            A: {
                blitzcrank: 1
            }, B: {
                garen: 3
            }
        })
        const gold = gm(s).supportCard("gold")
        s.players.B.hand.push(gold)
        const r = cast(s,
            "A",
            skill(s,
                "blitzcrank",
                "A",
                "Q"),
            {
                target: "B:garen"
            })
        assert.ok(r.s.players.A.hand.some((c) => c.uid === gold.uid),
            "lá Vàng về tay mình, giữ nguyên")
        assert.equal(r.s.players.B.hand.length,
            0)
        assert.equal(dmgOn(r.ev,
            "B:garen"),
        mit(kz.q1 + kz.q2 * armor(r.s,
            "A",
            "blitzcrank") + kz.q3 * mr(r.s,
            "A",
            "blitzcrank"),
        mr(r.s,
            "B",
            "garen")))
        assert.equal(u(r.s,
            "B",
            "garen").lane,
        3,
        "lá thường không kéo")
    })
test("Q: cướp lá chiêu của địch: vào mộ, thay bằng Q/E của tướng mình, kéo mục tiêu sang đối diện",
    () => {
        const s = mk({
            A: {
                blitzcrank: 1, braum: 2
            }, B: {
                leona: 1, garen: 3
            }
        })
        const stolen = skill(s,
            "garen",
            "B",
            "R")
        s.players.B.hand.push(stolen)
        const r = cast(s,
            "A",
            skill(s,
                "blitzcrank",
                "A",
                "Q"),
            {
                target: "B:garen"
            })
        assert.ok(r.s.players.B.grave.some((c) => c.uid === stolen.uid),
            "lá chiêu địch vào mộ")
        assert.equal(r.s.players.A.hand.some((c) => c.uid === stolen.uid),
            false)
        const got = r.s.players.A.hand.find((c) => c.kind === "skill")
        assert.ok(got && ["blitzcrank",
            "braum"].includes(got.hero!) && /_[qe]$/.test(got.id),
        "nhận Q hoặc E của tướng mình")
        assert.equal(u(r.s,
            "B",
            "garen").lane,
        1,
        "kéo đối diện Blitzcrank")
    })
test("Q: lá chiêu của tướng khác không kéo mục tiêu",
    () => {
        const s = mk({
            A: {
                blitzcrank: 1
            }, B: {
                leona: 1, garen: 3
            }
        })
        s.players.B.hand.push(skill(s,
            "leona",
            "B",
            "Q"))
        const r = cast(s,
            "A",
            skill(s,
                "blitzcrank",
                "A",
                "Q"),
            {
                target: "B:garen"
            })
        assert.equal(u(r.s,
            "B",
            "garen").lane,
        3)
    })
test("E: Chỉ Nối Chuỗi, nối khi địch dùng lá chiêu: huỷ, cướp (đổi Q/E của tướng mình), Choáng kẻ dùng",
    () => {
        const s = mk({
            A: {
                blitzcrank: 1, braum: 2
            }, B: {
                garen: 2
            }
        })
        card(s,
            "A",
            "blitzcrank",
            "E")
        assert.equal(hasPlay(s,
            "A",
            "blitzcrank_e"),
        false,
        "không chơi chủ động")
        s.active = "B"
        const played = skill(s,
            "garen",
            "B",
            "Q")
        const open = cast(s,
            "B",
            played,
            {
            },
            false)
        assert.equal(open.s.phase,
            "chain")
        const r = chainWith(open.s,
            "A",
            "blitzcrank_e",
            {
            },
            open.ev)
        assert.equal(dmgOn(r.ev,
            "A:braum"),
        0,
        "chiêu bị huỷ")
        assert.ok(r.s.players.B.grave.some((c) => c.uid === played.uid),
            "lá vào mộ chủ")
        const got = r.s.players.A.hand.find((c) => c.kind === "skill" && c.id !== "blitzcrank_e")
        assert.ok(got && ["blitzcrank",
            "braum"].includes(got.hero!) && /_[qe]$/.test(got.id))
        const gar = u(r.s,
                "B",
                "garen"), b = u(r.s,
                "A",
                "blitzcrank")
        assert.equal(b.stacks.blitz_parts,
            1)
        unitsOk(r.s,
            b,
            gar.statuses.stun?.until,
            gm(r.s).f(b,
                cg.kit("blitzcrank").x("e1 + e2·Máu tối đa")))
    })
test("E: nối được lên R của địch",
    () => {
        const s = mk({
            A: {
                blitzcrank: 1, braum: 2
            }, B: {
                garen: 2
            }
        })
        card(s,
            "A",
            "blitzcrank",
            "E")
        s.active = "B"
        const open = cast(s,
            "B",
            skill(s,
                "garen",
                "B",
                "R"),
            {
                target: "A:braum"
            },
            false)
        assert.equal(chainOpts(open.s,
            "A",
            "blitzcrank_e").length,
        1)
        const r = chainWith(open.s,
            "A",
            "blitzcrank_e",
            {
            },
            open.ev)
        assert.equal(dmgOn(r.ev,
            "A:braum"),
        0)
    })
test("E: không nối lên đòn đánh thường; không nối lên lá không thể bị nối chuỗi",
    () => {
        const s = mk({
            A: {
                blitzcrank: 1, braum: 2
            }, B: {
                garen: 2
            }
        })
        card(s,
            "A",
            "blitzcrank",
            "E")
        const open = attackOpen(s,
            "B:garen",
            "A:braum")
        assert.notEqual(open.s.phase,
            "chain")
        const def = cg.getHero("garen")!.skills.R
        const s2 = mk({
            A: {
                blitzcrank: 1, braum: 2
            }, B: {
                garen: 2
            }
        })
        card(s2,
            "A",
            "blitzcrank",
            "E")
        s2.active = "B"
        def.uncounterable = true
        try {
            const o2 = cast(s2,
                "B",
                skill(s2,
                    "garen",
                    "B",
                    "R"),
                {
                    target: "A:braum"
                },
                false)
            assert.notEqual(o2.s.phase,
                "chain",
                "uncounterable")
        } finally { def.uncounterable = false }
    })
test("E: lá chiêu tạm bị cướp chỉ biến mất, vẫn Choáng",
    () => {
        const s = mk({
            A: {
                blitzcrank: 1, braum: 2
            }, B: {
                garen: 2
            }
        })
        card(s,
            "A",
            "blitzcrank",
            "E")
        s.active = "B"
        const temp = {
            ...gm(s).skillCard("garen",
                "B",
                "Q"), temp: true
        }
        const open = cast(s,
            "B",
            temp,
            {
            },
            false)
        const r = chainWith(open.s,
            "A",
            "blitzcrank_e",
            {
            },
            open.ev)
        assert.equal(r.s.players.B.grave.some((c) => c.uid === temp.uid),
            false)
        assert.equal(r.s.players.A.hand.some((c) => c.kind === "skill"),
            false)
        assert.ok(u(r.s,
            "B",
            "garen").statuses.stun)
    })
test("R: mọi địch nhận sát thương phép, Câm Lặng, đối thủ bỏ r5 lá ngẫu nhiên",
    () => {
        const s = mk({
            A: {
                blitzcrank: 1
            }, B: {
                garen: 1, braum: 2
            }
        })
        for (let i = 0; i < 4; i++) s.players.B.hand.push(gm(s).supportCard("basic"))
        const r = cast(s,
            "A",
            skill(s,
                "blitzcrank",
                "A",
                "R"))
        const b = u(r.s,
            "A",
            "blitzcrank")
        for (const h of ["garen",
            "braum"]) {
            assert.equal(dmgOn(r.ev,
                `B:${h}`),
            mit(kz.r1 + kz.r2 * b.maxHp,
                mr(r.s,
                    "B",
                    h)))
            unitsOk(r.s,
                b,
                u(r.s,
                    "B",
                    h).statuses.silence?.until,
                kz.r3 + kz.r4 * mr(r.s,
                    "A",
                    "blitzcrank"))
        }
        assert.equal(r.s.players.B.hand.length,
            4 - kz.r5)
        assert.equal(r.s.players.B.grave.length,
            kz.r5)
    })

// ======================================================================
G("Ornn")
test("nội tại: chỉ số đồ cả đội thêm p1% và p2% mỗi vòng, trừ Máu",
    () => {
        const solo = mk({
            A: {
                garen: 2
            }
        })
        const s = mk({
            A: {
                ornn: 1, garen: 2
            }
        })
        for (const st of [solo,
            s]) {
            const g = gm(st)
            g.equip(u(st,
                "A",
                "garen"),
            "giap_luoi"); g.equip(u(st,
                "A",
                "garen"),
            "dai_khong_lo")
            u(st,
                "A",
                "garen").itemSince = [st.round - 5,
                st.round - 5]
        }
        const base = gm(solo).stats(u(solo,
                "A",
                "garen")), boosted = gm(s).stats(u(s,
                "A",
                "garen"))
        const f = 1 + (ko.p1 + ko.p2 * 5) / 100
        assert.ok(base.armor > 0)
        assert.ok(Math.abs(boosted.armor - base.armor * f) < 1e-6,
            `${boosted.armor} vs ${base.armor * f}`)
        assert.equal(boosted.hp,
            base.hp,
            "Máu không tăng")
        // Ornn rời sân thì hết hào quang
        gm(s).kill(u(s,
            "A",
            "ornn"),
        u(s,
            "B",
            "braum"))
        assert.ok(Math.abs(gm(s).stats(u(s,
            "A",
            "garen")).armor - base.armor) < 1e-6)
    })
test("Q: sát thương phép theo Máu tối đa, tạo 1 mảnh đồ lên tay",
    () => {
        const s = mk({
            A: {
                ornn: 1
            }, B: {
                garen: 3
            }
        })
        const r = cast(s,
            "A",
            skill(s,
                "ornn",
                "A",
                "Q"),
            {
                target: "B:garen"
            })
        assert.equal(dmgOn(r.ev,
            "B:garen"),
        mit(ko.q1 + ko.q2 * u(r.s,
            "A",
            "ornn").maxHp,
        mr(r.s,
            "B",
            "garen")))
        const item = r.s.players.A.hand.filter((c) => c.kind === "support" && c.id === "item")
        assert.equal(item.length,
            1)
        assert.ok(item[0].item)
    })
test("E: chỉ chọn tướng mình có đồ; mỗi món nhận Kiệt Tác, Khiên theo số món, chỉ số đồ tăng",
    () => {
        const s = mk({
            A: {
                ornn: 1, garen: 2, braum: 3
            }
        })
        const g = gm(s), gar = u(s,
            "A",
            "garen")
        g.equip(gar,
            "giap_luoi"); g.equip(gar,
            "giap_luoi")
        const probe = structuredClone(s)
        const pc = card(probe,
            "A",
            "ornn",
            "E")
        const opts = cg.legalActions(probe,
            "A").filter((a) => a.t === "play" && a.uid === pc.uid) as Extract<Act, { t: "play" }>[]
        assert.deepEqual(opts.map((a) => a.args?.target),
            ["A:garen"],
            "chỉ tướng có đồ")
        const before = g.stats(gar).armor
        const r = cast(s,
            "A",
            skill(s,
                "ornn",
                "A",
                "E"),
            {
                target: "A:garen"
            })
        const t = u(r.s,
            "A",
            "garen")
        assert.equal(t.stacks.ornn_mw,
            ko.e1)
        assert.equal(t.stacks.itemAmp,
            ko.e1 * ko.p3)
        assert.ok(Math.abs(gm(r.s).stats(t).armor - before * (1 + ko.e1 * ko.p3 / 100)) < 1e-6)
        const per = Math.round(2 * (ko.e2 + ko.e3 * armor(r.s,
            "A",
            "ornn")))
        assert.ok(r.ev.some((e) => e.t === "shield" && e.target === t.id && e.amount === per))
        const r2 = cast(r.s,
            "A",
            skill(r.s,
                "ornn",
                "A",
                "E"),
            {
                target: "A:garen"
            })
        assert.equal(u(r2.s,
            "A",
            "garen").stacks.ornn_mw,
        2 * ko.e1,
        "cộng dồn")
    })
test("E: Quick, nối được khi địch đánh hoặc dùng chiêu",
    () => {
        const s = mk({
            A: {
                ornn: 1, garen: 2
            }, B: {
                leona: 2
            }
        })
        gm(s).equip(u(s,
            "A",
            "garen"),
        "giap_luoi")
        card(s,
            "A",
            "ornn",
            "E")
        const open = attackOpen(s,
            "B:leona",
            "A:garen")
        assert.equal(chainOpts(open.s,
            "A",
            "ornn_e").length,
        1)
    })
test("E: cờ masterworkKeptOnDeath: true giữ Kiệt Tác, false mất một nửa khi tướng giữ đồ chết",
    () => {
        const run = () => {
            const s = mk({
                A: {
                    ornn: 1, garen: 2
                }, B: {
                    leona: 2
                }
            })
            gm(s).equip(u(s,
                "A",
                "garen"),
            "giap_luoi")
            let r = cast(s,
                "A",
                skill(s,
                    "ornn",
                    "A",
                    "E"),
                {
                    target: "A:garen"
                })
            r = cast(r.s,
                "A",
                skill(r.s,
                    "ornn",
                    "A",
                    "E"),
                {
                    target: "A:garen"
                })
            gm(r.s).kill(u(r.s,
                "A",
                "garen"),
            u(r.s,
                "B",
                "leona"))
            return u(r.s,
                "A",
                "garen").stacks
        }
        const flags = cg.kit("ornn").raw.flags
        const prev = flags.masterworkKeptOnDeath
        try {
            flags.masterworkKeptOnDeath = 1
            let st = run()
            assert.equal(st.ornn_mw,
                2 * ko.e1); assert.equal(st.itemAmp,
                2 * ko.e1 * ko.p3)
            flags.masterworkKeptOnDeath = 0
            st = run()
            assert.equal(st.ornn_mw,
                Math.floor(2 * ko.e1 / 2)); assert.equal(st.itemAmp,
                Math.floor(2 * ko.e1 * ko.p3 / 2))
        } finally { flags.masterworkKeptOnDeath = prev }
    })
test("R: Quick, không sát thương: rèn đồ mặc ngay, đủ ô về tay, rồi tạo thêm 1 đồ lên tay",
    () => {
        const s = mk({
            A: {
                ornn: 1, garen: 2, braum: 3
            }, B: {
                leona: 2
            }
        })
        const r = cast(s,
            "A",
            skill(s,
                "ornn",
                "A",
                "R"),
            {
                target: "A:braum"
            })
        assert.equal(r.ev.filter((e) => e.t === "damage").length,
            0,
            "không sát thương")
        assert.equal(u(r.s,
            "A",
            "braum").items.length,
        1,
        "mặc ngay")
        assert.equal(r.s.players.A.hand.filter((x) => x.id === "legend").length,
            1,
            "1 đồ lên tay")
        // đủ ô: đồ vừa rèn về tay
        const s2 = mk({
            A: {
                ornn: 1, garen: 2
            }
        })
        const g2 = gm(s2)
        for (let i = 0; i < cg.RULES.itemSlots; i++) g2.equip(u(s2,
            "A",
            "garen"),
        "giap_luoi")
        const r2 = cast(s2,
            "A",
            skill(s2,
                "ornn",
                "A",
                "R"),
            {
                target: "A:garen"
            })
        assert.equal(u(r2.s,
            "A",
            "garen").items.length,
        cg.RULES.itemSlots)
        assert.equal(r2.s.players.A.hand.filter((x) => x.id === "legend").length,
            2)
    })
test("R: nối được khi địch đánh hoặc dùng chiêu",
    () => {
        const s = mk({
            A: {
                ornn: 1, garen: 2
            }, B: {
                leona: 2
            }
        })
        card(s,
            "A",
            "ornn",
            "R")
        const open = attackOpen(s,
            "B:leona",
            "A:garen")
        assert.equal(chainOpts(open.s,
            "A",
            "ornn_r").length >= 1,
        true)
    })

// ======================================================================
G("Garen")
test("nội tại: mỗi đòn trúng hồi Máu và thêm 1 tầng Kiên Cường tăng Giáp; mất một nửa khi chết",
    () => {
        const s = mk({
            A: {
                garen: 1
            }, B: {
                leona: 1
            }
        })
        const gar = u(s,
            "A",
            "garen")
        gar.hp = 100
        const a0 = armor(s,
            "A",
            "garen")
        const r = basic(s,
            "A",
            "A:garen",
            "B:leona")
        const heal = Math.round(kg.p1 + kg.p2 * gar.maxHp)
        assert.equal(u(r.s,
            "A",
            "garen").hp,
        100 + heal)
        assert.equal(u(r.s,
            "A",
            "garen").stacks.garen_steel,
        1)
        assert.equal(armor(r.s,
            "A",
            "garen"),
        Math.round(a0 + kg.p3))
        u(r.s,
            "A",
            "garen").stacks.garen_steel = 9
        gm(r.s).kill(u(r.s,
            "A",
            "garen"),
        u(r.s,
            "B",
            "leona"))
        assert.equal(u(r.s,
            "A",
            "garen").stacks.garen_steel,
        4)
    })
test("Q: sát thương vật lý theo AD lên đối diện, Câm Lặng q3 đơn vị",
    () => {
        const s = mk({
            A: {
                garen: 1
            }, B: {
                leona: 1
            }
        })
        const r = cast(s,
            "A",
            skill(s,
                "garen",
                "A",
                "Q"))
        const g = gm(r.s), gar = u(r.s,
            "A",
            "garen")
        assert.equal(dmgOn(r.ev,
            "B:leona"),
        mit(kg.q1 + kg.q2 * g.atk(gar),
            armor(r.s,
                "B",
                "leona")))
        assert.equal(u(r.s,
            "B",
            "leona").statuses.silence.until,
        g.unitsUntil(gar,
            kg.q3))
    })
test("Q: kẻ bị Câm Lặng không tung được chiêu (vẫn đánh thường)",
    () => {
        const s = mk({
            A: {
                garen: 1, braum: 2
            }, B: {
                leona: 1
            }
        })
        const q = cast(s,
            "A",
            skill(s,
                "garen",
                "A",
                "Q"))
        q.s.active = "B"
        const c = card(q.s,
            "B",
            "leona",
            "Q")
        assert.equal(hasPlay(q.s,
            "B",
            c.id),
        false)
        assert.equal(gm(q.s).canAttack(u(q.s,
            "B",
            "leona")),
        true)
    })
test("E: Quick, nối khi địch nhắm đúng Garen; Khiên theo Máu tối đa, đối diện và 2 đường kề nhận sát thương",
    () => {
        const s = mk({
            A: {
                garen: 2, braum: 3
            }, B: {
                leona: 2, malphite: 1, blitzcrank: 3
            }
        })
        card(s,
            "A",
            "garen",
            "E")
        const open = attackOpen(s,
            "B:leona",
            "A:garen")
        assert.equal(open.s.phase,
            "chain")
        const r = chainWith(open.s,
            "A",
            "garen_e",
            {
            },
            open.ev)
        const gar = u(r.s,
                "A",
                "garen"), g = gm(r.s)
        const dmg = kg.e3 + kg.e4 * g.atk(gar)
        for (const h of ["leona",
            "malphite",
            "blitzcrank"]) assert.equal(dmgOn(r.ev,
            `B:${h}`),
        mit(dmg,
            armor(r.s,
                "B",
                h)),
        h)
        const shield = Math.round(kg.e1 + kg.e2 * gar.maxHp)
        assert.ok(r.ev.some((e) => e.t === "shield" && e.target === gar.id && e.amount === shield))
    })
test("E: không nối khi địch nhắm tướng khác của mình",
    () => {
        const s = mk({
            A: {
                garen: 2, braum: 3
            }, B: {
                leona: 3
            }
        })
        card(s,
            "A",
            "garen",
            "E")
        const open = attackOpen(s,
            "B:leona",
            "A:braum")
        assert.equal(chainOpts(open.s,
            "A",
            "garen_e").length,
        0)
    })
test("E: chỉ chạm các đường tồn tại (Garen ở rìa)",
    () => {
        const s = mk({
            A: {
                garen: 0
            }, B: {
                leona: 0, malphite: 1, braum: 2
            }
        })
        const r = cast(s,
            "A",
            skill(s,
                "garen",
                "A",
                "E"))
        assert.ok(dmgOn(r.ev,
            "B:leona") > 0 && dmgOn(r.ev,
            "B:malphite") > 0)
        assert.equal(dmgOn(r.ev,
            "B:braum"),
        0)
    })
test("R: sát thương chuẩn theo AD lên 1 địch ở bất kỳ đường",
    () => {
        const s = mk({
            A: {
                garen: 1
            }, B: {
                leona: 4
            }
        })
        const r = cast(s,
            "A",
            skill(s,
                "garen",
                "A",
                "R"),
            {
                target: "B:leona"
            })
        assert.equal(dmgOn(r.ev,
            "B:leona"),
        Math.round(kg.r1 + kg.r2 * gm(r.s).atk(u(r.s,
            "A",
            "garen"))))
    })

report()
