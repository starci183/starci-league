// Test bộ chiêu nhóm Trợ thủ + Pháp sư (Nami, Renata, Janna, Soraka, Brand, Ahri, Annie). Chạy: npx tsx scripts/card_tests_kits_supmage.ts [--only=chuỗi] [--verbose]
// Mọi kỳ vọng tính từ cg.kit(id).p và chỉ số engine, nên sửa balance/heroes/*.json không làm vỡ test.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    G, act, basic, cast, dmgOn, endTurn, gm, mk, report, skill, sup, test, u,
    type Act, type Ev, type S, type St
} from "./kit_test_util"

const kn = cg.kit("nami").p, kr = cg.kit("renata"), krp = kr.p, kj = cg.kit("janna").p, ks = cg.kit("soraka").p
const kb = cg.kit("brand").p, kah = cg.kit("ahri").p, kan = cg.kit("annie"), kap = kan.p

const mit = (raw: number, def: number) => Math.round(raw * 100 / (100 + def))
const armor = (s: St, side: S, h: string) => gm(s).armor(u(s,
    side,
    h))
const mr = (s: St, side: S, h: string) => gm(s).mr(u(s,
    side,
    h))
/** Cho tướng AP tạm qua trạng thái ap_up (kéo dài), để công thức có phần AP xác định */
function setAp(s: St, side: S, hero: string, ap: number) {
    u(s,
        side,
        hero).statuses.ap_up = {
        until: 9999, v: ap
    }
}
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
const playOpts = (s: St, side: S, id: string) => cg.legalActions(s,
    side).filter((a) => a.t === "play" && s.players[side].hand.find((c) => c.uid === a.uid)?.id === id) as Extract<Act, { t: "play" }>[]
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
/** Bên B đánh thường (giải quyết luôn) */
function basicB(s: St, actor: string, target: string) {
    s.active = "B"
    return basic(s,
        "B",
        actor,
        target)
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
/** Bên B mở Chuỗi bằng 1 lá chiêu (chưa giải quyết) */
function skillOpen(s: St, hero: string, key: cg.SkillKey, args: cg.PlayArgs = {
}) {
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
/** Trạng thái Choáng đúng floor(d) đơn vị (phần lẻ có thể thêm 1) */
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
const evs = <T extends Ev[number]["t"]>(ev: Ev, t: T) => ev.filter((e) => e.t === t) as Extract<Ev[number], { t: T }>[]

// ======================================================================
G("Nami")
test("nội tại: sát thương phe gây lên tướng địch đủ p1 thì +1 Dậy Sóng, phần dư giữ lại",
    () => {
        const s = mk({
            A: {
                nami: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        u(s,
            "A",
            "nami").stacks["tc:nami_dmg"] = kn.p1 - 1
        const r = basic(s,
            "A",
            "A:garen",
            "B:zed")
        const dealt = dmgOn(r.ev,
            "B:zed")
        assert.ok(dealt > 0)
        const total = kn.p1 - 1 + dealt
        assert.equal(u(r.s,
            "A",
            "nami").stacks.nami_wave,
        Math.floor(total / kn.p1))
        assert.equal(u(r.s,
            "A",
            "nami").stacks["tc:nami_dmg"],
        total - Math.floor(total / kn.p1) * kn.p1)
    })
test("nội tại: sát thương lên đồng minh hoặc do địch gây không tính",
    () => {
        const s = mk({
            A: {
                nami: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        u(s,
            "A",
            "nami").stacks["tc:nami_dmg"] = kn.p1 - 1
        const r = basicB(s,
            "B:zed",
            "A:garen")
        assert.equal(u(r.s,
            "A",
            "nami").stacks.nami_wave ?? 0,
        0)
        assert.equal(u(r.s,
            "A",
            "nami").stacks["tc:nami_dmg"],
        kn.p1 - 1)
    })
test("nội tại: mỗi Dậy Sóng cho mọi đồng minh p2 AP, địch không",
    () => {
        const s = mk({
            A: {
                nami: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        u(s,
            "A",
            "nami").stacks.nami_wave = 3
        const g = gm(s)
        assert.equal(g.ap(u(s,
            "A",
            "garen")),
        Math.round(3 * kn.p2))
        assert.equal(g.ap(u(s,
            "A",
            "nami")),
        Math.round(3 * kn.p2))
        assert.equal(g.ap(u(s,
            "B",
            "zed")),
        0)
    })
test("nội tại: đạt bội của p3 thì rút 1 lá, các tầng khác không rút",
    () => {
        const s = mk({
            A: {
                nami: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        u(s,
            "A",
            "nami").stacks.nami_wave = kn.p3 - 1
        u(s,
            "A",
            "nami").stacks["tc:nami_dmg"] = kn.p1 - 1
        const r = basic(s,
            "A",
            "A:garen",
            "B:zed")
        assert.equal(u(r.s,
            "A",
            "nami").stacks.nami_wave,
        kn.p3)
        assert.equal(r.s.players.A.hand.length,
            1,
            "rút 1 lá khi đạt bội số")
        const s2 = mk({
            A: {
                nami: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        u(s2,
            "A",
            "nami").stacks.nami_wave = kn.p3
        u(s2,
            "A",
            "nami").stacks["tc:nami_dmg"] = kn.p1 - 1
        const r2 = basic(s2,
            "A",
            "A:garen",
            "B:zed")
        assert.equal(u(r2.s,
            "A",
            "nami").stacks.nami_wave,
        kn.p3 + 1)
        assert.equal(r2.s.players.A.hand.length,
            0,
            "không rút ở tầng thường")
    })
test("nội tại: Nami bị hạ mất một nửa Dậy Sóng; đang chết tầng giữ nhưng AP tắt",
    () => {
        const s = mk({
            A: {
                nami: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        u(s,
            "A",
            "nami").stacks.nami_wave = 11
        assert.equal(gm(s).ap(u(s,
            "A",
            "garen")),
        Math.round(11 * kn.p2))
        gm(s).kill(u(s,
            "A",
            "nami"),
        u(s,
            "B",
            "zed"))
        assert.equal(u(s,
            "A",
            "nami").stacks.nami_wave,
        5)
        assert.equal(gm(s).ap(u(s,
            "A",
            "garen")),
        0,
        "AP tắt khi Nami chết")
    })
test("Q: nảy hồi - đánh, via là đơn vị liền trước (hop đầu là Nami)",
    () => {
        const s = mk({
            A: {
                nami: 0, garen: 1, braum: 2
            }, B: {
                zed: 0, teemo: 1, viktor: 2
            }
        })
        for (const h of ["garen",
            "braum",
            "nami"]) u(s,
            "A",
            h).hp = 1
        const r = cast(s,
            "A",
            skill(s,
                "nami",
                "A",
                "Q"),
            {
                target: "A:garen"
            })
        const heals = evs(r.ev,
                "heal"), dmgs = evs(r.ev,
                "damage").filter((e) => e.tag === "skill")
        assert.equal(heals.length,
            kn.q5)
        assert.equal(dmgs.length,
            kn.q5)
        assert.equal(heals[0].target,
            "A:garen")
        assert.equal(heals[0].via,
            "A:nami")
        assert.equal(heals[0].amount,
            Math.round(kn.q1))
        assert.equal(dmgs[0].via,
            heals[0].target)
        assert.equal(dmgs[0].kind,
            "magic")
        assert.equal(dmgs[0].amount,
            mit(kn.q3,
                mr(r.s,
                    "B",
                    dmgs[0].target.split(":")[1])))
        assert.equal(heals[1].via,
            dmgs[0].target)
        assert.equal(dmgs[1].via,
            heals[1].target)
        assert.notEqual(heals[1].target,
            heals[0].target,
            "đồng minh thứ hai khác người đầu")
        assert.notEqual(dmgs[1].target,
            dmgs[0].target)
    })
test("Q: hết mục tiêu thì dừng (đồng minh hoặc địch)",
    () => {
        const s = mk({
            A: {
                nami: 0
            }, B: {
                zed: 0, teemo: 1
            }
        })
        u(s,
            "A",
            "nami").hp = 1
        const r = cast(s,
            "A",
            skill(s,
                "nami",
                "A",
                "Q"),
            {
                target: "A:nami"
            })
        assert.equal(evs(r.ev,
            "heal").length,
        1)
        assert.equal(evs(r.ev,
            "damage").filter((e) => e.tag === "skill").length,
        1,
        "chỉ 1 nảy khi không còn đồng minh khác")
        const s2 = mk({
            A: {
                nami: 0, garen: 1, braum: 2
            }, B: {
                zed: 0
            }
        })
        u(s2,
            "A",
            "garen").hp = 1; u(s2,
            "A",
            "braum").hp = 1
        const r2 = cast(s2,
            "A",
            skill(s2,
                "nami",
                "A",
                "Q"),
            {
                target: "A:garen"
            })
        assert.equal(evs(r2.ev,
            "heal").length,
        2,
        "đồng minh thứ hai vẫn được hồi, rồi hết địch chưa bị đánh nên dừng")
        assert.equal(evs(r2.ev,
            "damage").filter((e) => e.tag === "skill").length,
        1)
    })
test("Q: Dậy Sóng cộng AP nên Q mạnh lên theo AP",
    () => {
        const s = mk({
            A: {
                nami: 0, garen: 1
            }, B: {
                zed: 0
            }
        })
        u(s,
            "A",
            "nami").stacks.nami_wave = 10
        const ap = gm(s).ap(u(s,
            "A",
            "nami"))
        assert.equal(ap,
            Math.round(10 * kn.p2))
        u(s,
            "A",
            "garen").hp = 1
        const r = cast(s,
            "A",
            skill(s,
                "nami",
                "A",
                "Q"),
            {
                target: "A:garen"
            })
        const d = evs(r.ev,
            "damage").find((e) => e.tag === "skill")!
        assert.equal(d.amount,
            mit(kn.q3 + kn.q4 * ap,
                mr(r.s,
                    "B",
                    "zed")))
    })
test("E: Quick nối được khi địch nhắm đúng 1 tướng mình, mục tiêu khoá vào tướng đó",
    () => {
        const s = mk({
            A: {
                nami: 0, garen: 1
            }, B: {
                teemo: 1
            }
        })
        card(s,
            "A",
            "nami",
            "E")
        const open = attackOpen(s,
            "B:teemo",
            "A:garen")
        assert.equal(open.s.phase,
            "chain")
        const opts = chainOpts(open.s,
            "A",
            "nami_e")
        assert.equal(opts.length,
            1)
        assert.equal(opts[0].args?.target,
            "A:garen")
        const r = chainWith(open.s,
            "A",
            "nami_e",
            {
                target: "A:garen"
            },
            open.ev)
        const gar = u(r.s,
            "A",
            "garen")
        assert.equal(gar.stacks.nami_bless,
            kn.e3)
        assert.ok(r.ev.some((e) => e.t === "shield" && e.target === "A:garen" && e.amount === Math.round(kn.e1)))
    })
test("E: không nối được khi chiêu địch nhắm cả phe",
    () => {
        const s = mk({
            A: {
                nami: 0, garen: 1
            }, B: {
                brand: 1
            }
        })
        card(s,
            "A",
            "nami",
            "E")
        const open = skillOpen(s,
            "brand",
            "E")
        assert.equal(open.s.phase === "chain" ? chainOpts(open.s,
            "A",
            "nami_e").length : 0,
        0)
    })
test("E: dùng chủ động chọn 1 tướng mình, cộng dồn Phước Lành vô hạn",
    () => {
        const s = mk({
            A: {
                nami: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        const c = card(s,
            "A",
            "nami",
            "E")
        assert.deepEqual(playOpts(s,
            "A",
            "nami_e").map((a) => a.args?.target).sort(),
        ["A:garen",
            "A:nami"])
        let r = cast(s,
            "A",
            c,
            {
                target: "A:garen"
            })
        r = cast(r.s,
            "A",
            skill(r.s,
                "nami",
                "A",
                "E"),
            {
                target: "A:garen"
            })
        assert.equal(u(r.s,
            "A",
            "garen").stacks.nami_bless,
        2 * kn.e3)
    })
test("Phước Lành: lá chiêu của tướng mang gây sát thương tiêu 1, mỗi tướng địch trúng chịu thêm D theo AD/AP của tướng mang",
    () => {
        const s = mk({
            A: {
                nami: 0, brand: 1
            }, B: {
                zed: 0, garen: 1
            }
        })
        u(s,
            "A",
            "brand").stacks.nami_bless = 2
        const g = gm(s), brand = u(s,
            "A",
            "brand")
        const D = kn.e4 + kn.e5 * g.atk(brand) + kn.e6 * g.ap(brand)
        const r = cast(s,
            "A",
            skill(s,
                "brand",
                "A",
                "E"),
            {
            })
        assert.equal(u(r.s,
            "A",
            "brand").stacks.nami_bless,
        1,
        "1 lá chiêu tiêu 1 Phước Lành dù trúng 2 địch")
        for (const h of ["zed",
            "garen"]) {
            const evh = evs(r.ev,
                "damage").filter((e) => e.target === `B:${h}`)
            const extra = evh.find((e) => e.tag === "effect")
            assert.ok(extra,
                `${h} nhận phần thêm`)
            assert.equal(extra!.amount,
                mit(D,
                    mr(r.s,
                        "B",
                        h)))
            assert.equal(extra!.kind,
                "magic")
        }
    })
test("Phước Lành: đòn đánh thường không tiêu; không hết hạn và không mất khi tướng mang bị hạ",
    () => {
        const s = mk({
            A: {
                nami: 0, brand: 1
            }, B: {
                zed: 1
            }
        })
        u(s,
            "A",
            "brand").stacks.nami_bless = 2
        const r = basic(s,
            "A",
            "A:brand",
            "B:zed")
        assert.equal(u(r.s,
            "A",
            "brand").stacks.nami_bless,
        2)
        assert.equal(evs(r.ev,
            "damage").filter((e) => e.tag === "effect").length,
        0)
        gm(r.s).kill(u(r.s,
            "A",
            "brand"),
        u(r.s,
            "B",
            "zed"))
        assert.equal(u(r.s,
            "A",
            "brand").stacks.nami_bless,
        2)
    })
test("Phước Lành: vẫn nổ khi Nami đã ngã",
    () => {
        const s = mk({
            A: {
                nami: 0, brand: 1
            }, B: {
                zed: 1
            }
        })
        u(s,
            "A",
            "brand").stacks.nami_bless = 1
        gm(s).kill(u(s,
            "A",
            "nami"),
        u(s,
            "B",
            "zed"))
        const r = cast(s,
            "A",
            skill(s,
                "brand",
                "A",
                "Q"),
            {
                target: "B:zed"
            })
        assert.equal(u(r.s,
            "A",
            "brand").stacks.nami_bless,
        0)
        assert.ok(evs(r.ev,
            "damage").some((e) => e.tag === "effect" && e.target === "B:zed"))
    })
test("R: mọi địch nhận sát thương phép trước, rồi Choáng đúng đơn vị và Dễ Tổn Thương r5 đơn vị (r6 + r7·AP %)",
    () => {
        const s = mk({
            A: {
                nami: 0, garen: 1
            }, B: {
                zed: 0, teemo: 1, braum: 2
            }
        })
        setAp(s,
            "A",
            "nami",
            300)
        const nami = u(s,
                "A",
                "nami"), g = gm(s)
        const ap0 = g.ap(nami)
        const r = cast(s,
            "A",
            skill(s,
                "nami",
                "A",
                "R"),
            {
            })
        const ap1 = gm(r.s).ap(u(r.s,
            "A",
            "nami")) // Dậy Sóng có thể tăng AP ngay sau các đòn của R, trước Choáng và Dễ Tổn Thương
        for (const h of ["zed",
            "teemo",
            "braum"]) {
            const t = u(r.s,
                "B",
                h)
            assert.equal(dmgOn(r.ev,
                t.id),
            mit(kn.r1 + kn.r2 * ap0,
                mr(r.s,
                    "B",
                    h)),
            `${h}: R không bị Dễ Tổn Thương nhân`)
            unitsOk(r.s,
                nami,
                t.statuses.stun?.until,
                kn.r3 + kn.r4 * ap1)
            assert.equal(t.statuses.vulnerable.until,
                g.unitsUntil(nami,
                    kn.r5))
            assert.ok(Math.abs(t.statuses.vulnerable.v - (kn.r6 + kn.r7 * ap1) / 100) < 1e-9)
        }
    })
test("R: Dễ Tổn Thương làm sát thương sau đó tăng đúng hệ số, hết hạn sau r5 đơn vị",
    () => {
        const s = mk({
            A: {
                nami: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        const base = basic(mk({
            A: {
                nami: 0, garen: 1
            }, B: {
                zed: 1
            }
        }),
        "A",
        "A:garen",
        "B:zed")
        const r = cast(s,
            "A",
            skill(s,
                "nami",
                "A",
                "R"),
            {
            })
        const z = u(r.s,
            "B",
            "zed")
        z.hp = z.maxHp; delete z.statuses.stun
        const v = z.statuses.vulnerable.v
        const atk = gm(r.s).atk(u(r.s,
            "A",
            "garen"))
        const r2 = basic(r.s,
            "A",
            "A:garen",
            "B:zed")
        assert.equal(dmgOn(r2.ev,
            "B:zed"),
        mit(atk * (1 + v),
            armor(r2.s,
                "B",
                "zed")))
        assert.ok(dmgOn(r2.ev,
            "B:zed") > dmgOn(base.ev,
            "B:zed"))
        let st = r2.s
        for (let i = 0; i < 4 && st.turnNo <= z.statuses.vulnerable.until; i++) st = endTurn(st).s
        assert.equal(u(st,
            "B",
            "zed").statuses.vulnerable,
        undefined)
    })

// ======================================================================
G("Renata")
test("nội tại: Mức Cấp Vốn = tổng % Máu đã mất chia p1, cho Tốc Đánh, Chí Mạng và AD mọi tướng mình",
    () => {
        const s = mk({
            A: {
                renata: 0, garen: 1, braum: 2
            }, B: {
                zed: 1
            }
        })
        const gar = u(s,
                "A",
                "garen"), bra = u(s,
                "A",
                "braum")
        gar.hp = Math.round(gar.maxHp / 2); bra.hp = Math.round(bra.maxHp * 0.75)
        const lost = (1 - gar.hp / gar.maxHp) * 100 + (1 - bra.hp / bra.maxHp) * 100
        const lv = lost / krp.p1
        const g = gm(s)
        const base = cg.getHero("garen")!.atk
        assert.equal(g.attackSpeed(gar),
            100 + lv * krp.p2)
        assert.ok(Math.abs(g.stats(gar).crit - lv * krp.p3) < 1e-9)
        assert.equal(g.atk(gar),
            Math.round(base + lv * krp.p4))
        assert.equal(g.attackSpeed(u(s,
            "B",
            "zed")),
        100,
        "địch không nhận")
    })
test("nội tại: Renata chết thì bộ Cấp Vốn tắt",
    () => {
        const s = mk({
            A: {
                renata: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        u(s,
            "A",
            "garen").hp = 10
        assert.ok(gm(s).attackSpeed(u(s,
            "A",
            "garen")) > 100)
        gm(s).kill(u(s,
            "A",
            "renata"),
        u(s,
            "B",
            "zed"))
        assert.equal(gm(s).attackSpeed(u(s,
            "A",
            "garen")),
        100)
    })
test("nội tại: tướng mình bị hạ hồi sinh với p5 Máu tối đa, mỗi đồng minh một lần mỗi trận",
    () => {
        const s = mk({
            A: {
                renata: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        const gar = u(s,
            "A",
            "garen")
        gar.hp = 1
        let r = basicB(s,
            "B:zed",
            "A:garen")
        assert.equal(u(r.s,
            "A",
            "garen").status,
        "board")
        assert.equal(u(r.s,
            "A",
            "garen").hp,
        Math.round(gar.maxHp * krp.p5))
        assert.equal(u(r.s,
            "A",
            "garen").stacks.renata_rev,
        1)
        assert.equal(r.s.players.A.lives,
            cg.LIVES,
            "không mất mạng")
        u(r.s,
            "A",
            "garen").hp = 1
        r = basicB(r.s,
            "B:zed",
            "A:garen")
        assert.equal(u(r.s,
            "A",
            "garen").status,
        "dead",
        "lần hai thì bị hạ")
    })
test("nội tại: hai đồng minh khác nhau mỗi người được cứu một lần",
    () => {
        const s = mk({
            A: {
                renata: 0, garen: 1, braum: 2
            }, B: {
                zed: 1, leona: 2
            }
        })
        u(s,
            "A",
            "garen").hp = 1; u(s,
            "A",
            "braum").hp = 1
        const r = basicB(s,
            "B:zed",
            "A:garen")
        const r2 = basicB(r.s,
            "B:leona",
            "A:braum")
        assert.equal(u(r2.s,
            "A",
            "garen").status,
        "board")
        assert.equal(u(r2.s,
            "A",
            "braum").status,
        "board")
    })
test("nội tại: không cứu chính Renata (cờ reviveSelf = 0), bật cờ thì cứu",
    () => {
        const s = mk({
            A: {
                renata: 1
            }, B: {
                zed: 1
            }
        })
        u(s,
            "A",
            "renata").hp = 1
        const r = basicB(s,
            "B:zed",
            "A:renata")
        assert.equal(u(r.s,
            "A",
            "renata").status,
        "dead")
        const flags = kr.raw.flags as Record<string, number>
        const old = flags.reviveSelf
        flags.reviveSelf = 1
        try {
            const s2 = mk({
                A: {
                    renata: 1
                }, B: {
                    zed: 1
                }
            })
            u(s2,
                "A",
                "renata").hp = 1
            const r2 = basicB(s2,
                "B:zed",
                "A:renata")
            assert.equal(u(r2.s,
                "A",
                "renata").status,
            "board")
            assert.equal(u(r2.s,
                "A",
                "renata").hp,
            Math.round(u(r2.s,
                "A",
                "renata").maxHp * krp.p5))
        } finally { flags.reviveSelf = old }
    })
test("nội tại: đứng đầu thứ tự cứu chết",
    () => {
        assert.equal(cg.RULES.lethalOrder[0],
            "hero:renata")
        assert.ok(!cg.RULES.lethalOrder.some((x) => x.includes("soraka")))
    })
test("Q: tướng chọn mất q1 Máu hiện tại (còn tối thiểu 1) và nhận Tốc Đánh, Chí Mạng, AD đúng q2 đơn vị",
    () => {
        const s = mk({
            A: {
                renata: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        const gar = u(s,
                "A",
                "garen"), ren = u(s,
                "A",
                "renata")
        const hp0 = gar.hp
        const r = cast(s,
            "A",
            skill(s,
                "renata",
                "A",
                "Q"),
            {
                target: "A:garen"
            })
        const t = u(r.s,
            "A",
            "garen")
        assert.equal(t.hp,
            hp0 - Math.round(hp0 * krp.q1))
        const until = gm(r.s).unitsUntil(ren,
            krp.q2)
        assert.deepEqual([t.statuses.attack_speed.v,
            t.statuses.attack_speed.until],
        [krp.q3,
            until])
        assert.deepEqual([t.statuses.crit_up.v,
            t.statuses.crit_up.until],
        [krp.q4,
            until])
        assert.deepEqual([t.statuses.ad_up.v,
            t.statuses.ad_up.until],
        [krp.q5,
            until])
        assert.deepEqual([t.statuses.renata_q.v,
            t.statuses.renata_q.until],
        [krp.q6,
            until])
    })
test("Q: tối thiểu còn 1 Máu",
    () => {
        const s = mk({
            A: {
                renata: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        u(s,
            "A",
            "garen").hp = 1
        const r = cast(s,
            "A",
            skill(s,
                "renata",
                "A",
                "Q"),
            {
                target: "A:garen"
            })
        assert.equal(u(r.s,
            "A",
            "garen").hp,
        1)
    })
test("Q: đòn đánh trong thời hạn gây thêm q6 lượng Máu đã mất; hết hạn thì mất",
    () => {
        const s = mk({
            A: {
                renata: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        const r = cast(s,
            "A",
            skill(s,
                "renata",
                "A",
                "Q"),
            {
                target: "A:garen"
            })
        const gar = u(r.s,
            "A",
            "garen")
        const lost = gar.maxHp - gar.hp
        const info = gm(r.s).attack(gar,
            u(r.s,
                "B",
                "zed"))!
        assert.ok(info.bonus.some((b) => Math.abs(b.raw - lost * krp.q6) < 1e-9),
            "có phần thêm theo Máu đã mất")
        let st = r.s
        for (let i = 0; i < 6 && gm(st).has(u(st,
            "A",
            "garen"),
        "renata_q"); i++) st = endTurn(st).s
        assert.equal(gm(st).has(u(st,
            "A",
            "garen"),
        "renata_q"),
        false)
        const i2 = gm(st).attack(u(st,
            "A",
            "garen"),
        u(st,
            "B",
            "zed"))!
        assert.equal(i2.bonus.length,
            0)
    })
test("E: Quick nối khi địch nhắm đúng 1 tướng mình; tướng đó bắn kẻ vừa nhắm nó rồi nhận Khiên theo sát thương",
    () => {
        const s = mk({
            A: {
                renata: 0, garen: 1
            }, B: {
                teemo: 0, braum: 1
            }
        })
        card(s,
            "A",
            "renata",
            "E")
        const open = attackOpen(s,
            "B:teemo",
            "A:garen")
        const opts = chainOpts(open.s,
            "A",
            "renata_e")
        assert.equal(opts.length,
            1)
        assert.equal(opts[0].args?.target,
            "A:garen")
        const r = chainWith(open.s,
            "A",
            "renata_e",
            {
                target: "A:garen"
            },
            open.ev)
        const gar = u(r.s,
                "A",
                "garen"), g = gm(r.s)
        const shot = krp.e1 + krp.e2 * g.atk(gar) + krp.e3 * g.ap(gar)
        const hit = evs(r.ev,
            "damage").find((e) => e.src === "A:garen" && e.target === "B:teemo")
        assert.ok(hit,
            "bắn kẻ vừa nhắm (Teemo), không phải tướng đối diện")
        assert.equal(hit!.amount,
            mit(shot,
                armor(r.s,
                    "B",
                    "teemo")))
        assert.equal(hit!.kind,
            "physical")
        assert.ok(r.ev.some((e) => e.t === "shield" && e.target === "A:garen" && e.amount === Math.round(hit!.amount * krp.e4)))
        assert.equal(dmgOn(r.ev,
            "B:braum"),
        0)
    })
test("E: không nối được khi địch dùng chiêu nhắm cả phe",
    () => {
        const s = mk({
            A: {
                renata: 0, garen: 1
            }, B: {
                brand: 1
            }
        })
        card(s,
            "A",
            "renata",
            "E")
        const open = skillOpen(s,
            "brand",
            "E")
        assert.equal(open.s.phase === "chain" ? chainOpts(open.s,
            "A",
            "renata_e").length : 0,
        0)
    })
test("E: dùng chủ động bắn tướng đối diện",
    () => {
        const s = mk({
            A: {
                renata: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        const c = card(s,
            "A",
            "renata",
            "E")
        assert.ok(hasPlay(s,
            "A",
            "renata_e"))
        const r = cast(s,
            "A",
            c,
            {
                target: "A:garen"
            })
        assert.ok(evs(r.ev,
            "damage").some((e) => e.src === "A:garen" && e.target === "B:zed"))
    })
test("R: mọi địch nhận Cuồng Loạn r1 đơn vị + Tốc Đánh và tự đánh đồng đội gần nhất",
    () => {
        const s = mk({
            A: {
                renata: 0
            }, B: {
                zed: 1, teemo: 2, braum: 4
            }
        })
        const ren = u(s,
            "A",
            "renata")
        const r = cast(s,
            "A",
            skill(s,
                "renata",
                "A",
                "R"),
            {
            })
        const g = gm(r.s)
        const atk = evs(r.ev,
            "attack")
        for (const h of ["zed",
            "teemo",
            "braum"]) {
            const t = u(r.s,
                "B",
                h)
            assert.equal(t.statuses.madness.until,
                g.unitsUntil(ren,
                    krp.r1))
            assert.equal(t.statuses.attack_speed.v,
                krp.r2)
            const hits = atk.filter((e) => e.attacker === t.id)
            assert.equal(hits.length,
                Math.floor((100 + krp.r2) / 100))
        }
        // gần nhất theo đường: zed(1)->teemo(2), teemo(2)->zed(1) (cùng khoảng, đường nhỏ hơn), braum(4)->teemo(2)
        assert.ok(atk.every((e) => e.attacker.startsWith("B:") && e.target.startsWith("B:")))
        assert.ok(atk.filter((e) => e.attacker === "B:zed").every((e) => e.target === "B:teemo"))
        assert.ok(atk.filter((e) => e.attacker === "B:teemo").every((e) => e.target === "B:zed"))
        assert.ok(atk.filter((e) => e.attacker === "B:braum").every((e) => e.target === "B:teemo"))
    })
test("R: không có đồng minh thì tới trung lập, rồi tướng phe Renata (gần nhất), rồi Renata",
    () => {
    // trung lập: vật triệu hồi không chủ
        const s = mk({
            A: {
                renata: 0, garen: 2
            }, B: {
                zed: 2
            }
        })
        const g0 = gm(s)
        g0.summonToken("A",
            {
                id: "wall", name: "Wall", hp: 500, atk: 0
            })
        const r = cast(s,
            "A",
            skill(s,
                "renata",
                "A",
                "R"),
            {
            })
        assert.ok(evs(r.ev,
            "attack").every((e) => e.attacker === "B:zed" && e.target.includes("tok")),
        "đánh trung lập trước")
        // tướng phe Renata gần nhất
        const s2 = mk({
            A: {
                renata: 0, garen: 2, braum: 4
            }, B: {
                zed: 3
            }
        })
        const r2 = cast(s2,
            "A",
            skill(s2,
                "renata",
                "A",
                "R"),
            {
            })
        const a2 = evs(r2.ev,
            "attack")
        assert.ok(a2.length > 0 && a2.every((e) => e.target === "A:garen"),
            "Garen (đường 2) gần Zed (đường 3) hơn Braum (đường 4); Renata cuối cùng")
        // Renata là mục tiêu cuối
        const s3 = mk({
            A: {
                renata: 0
            }, B: {
                zed: 3
            }
        })
        const r3 = cast(s3,
            "A",
            skill(s3,
                "renata",
                "A",
                "R"),
            {
            })
        assert.ok(evs(r3.ev,
            "attack").every((e) => e.target === "A:renata"))
    })
test("R: tướng không đánh được (Choáng hoặc Mù) bỏ qua đòn nhưng vẫn nhận Cuồng Loạn",
    () => {
        const s = mk({
            A: {
                renata: 0
            }, B: {
                zed: 1, teemo: 2
            }
        })
        u(s,
            "B",
            "zed").statuses.stun = {
            until: 9999, v: 1
        }
        u(s,
            "B",
            "teemo").statuses.blind = {
            until: 9999, v: 3
        }
        const r = cast(s,
            "A",
            skill(s,
                "renata",
                "A",
                "R"),
            {
            })
        assert.equal(evs(r.ev,
            "attack").length,
        0)
        assert.ok(u(r.s,
            "B",
            "zed").statuses.madness && u(r.s,
            "B",
            "teemo").statuses.madness)
    })

// ======================================================================
G("Janna")
test("nội tại: Khiên phe nhận đủ p1 thì +1 Gió Thuận, địch nhận không tính",
    () => {
        const s = mk({
            A: {
                janna: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        const g = gm(s)
        u(s,
            "A",
            "janna").stacks["tc:janna_shield"] = kj.p1 - 1
        g.shield(undefined,
            u(s,
                "A",
                "garen"),
            1)
        assert.equal(u(s,
            "A",
            "janna").stacks.janna_wind,
        1)
        const left = u(s,
            "A",
            "janna").stacks["tc:janna_shield"]
        assert.equal(left,
            kj.p1 - 1 + 1 - kj.p1)
        g.shield(undefined,
            u(s,
                "B",
                "zed"),
            kj.p1 * 3)
        assert.equal(u(s,
            "A",
            "janna").stacks.janna_wind,
        1)
    })
test("nội tại: mỗi Gió Thuận tăng Khiên mới của tướng mình p2, không tăng Khiên địch",
    () => {
        const s = mk({
            A: {
                janna: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        const g = gm(s)
        u(s,
            "A",
            "janna").stacks.janna_wind = 5
        g.shield(undefined,
            u(s,
                "A",
                "garen"),
            100)
        assert.equal(u(s,
            "A",
            "garen").shield,
        Math.round(100 * (1 + 5 * kj.p2)))
        g.shield(undefined,
            u(s,
                "B",
                "zed"),
            100)
        assert.equal(u(s,
            "B",
            "zed").shield,
        100)
    })
test("nội tại: tướng mình còn Khiên được p3 Tốc Đánh mỗi Gió Thuận; hết Khiên thì mất",
    () => {
        const s = mk({
            A: {
                janna: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        const g = gm(s), gar = u(s,
            "A",
            "garen")
        u(s,
            "A",
            "janna").stacks.janna_wind = 4
        assert.equal(g.attackSpeed(gar),
            100)
        gar.shield = 10
        assert.equal(g.attackSpeed(gar),
            100 + 4 * kj.p3)
        assert.equal(g.attackSpeed(u(s,
            "B",
            "zed")),
        100)
        gar.shield = 0
        assert.equal(g.attackSpeed(gar),
            100)
    })
test("nội tại: Janna bị hạ mất một nửa Gió Thuận",
    () => {
        const s = mk({
            A: {
                janna: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        u(s,
            "A",
            "janna").stacks.janna_wind = 9
        gm(s).kill(u(s,
            "A",
            "janna"),
        u(s,
            "B",
            "zed"))
        assert.equal(u(s,
            "A",
            "janna").stacks.janna_wind,
        4)
    })
test("Q: sát thương phép = A + q3 tổng Khiên phe bạn, rồi Choáng đúng đơn vị",
    () => {
        const s = mk({
            A: {
                janna: 0, garen: 1, braum: 2
            }, B: {
                zed: 1
            }
        })
        setAp(s,
            "A",
            "janna",
            200)
        u(s,
            "A",
            "garen").shield = 100; u(s,
            "A",
            "braum").shield = 50
        const jan = u(s,
                "A",
                "janna"), ap = gm(s).ap(jan)
        const r = cast(s,
            "A",
            skill(s,
                "janna",
                "A",
                "Q"),
            {
                target: "B:zed"
            })
        assert.equal(dmgOn(r.ev,
            "B:zed"),
        mit(kj.q1 + kj.q2 * ap + kj.q3 * 150,
            mr(r.s,
                "B",
                "zed")))
        unitsOk(r.s,
            jan,
            u(r.s,
                "B",
                "zed").statuses.stun?.until,
            kj.q4 + kj.q5 * ap)
    })
test("E: Quick nối khi địch nhắm đúng 1 tướng mình; Khiên và Mắt Bão cho AD/AP theo Khiên",
    () => {
        const s = mk({
            A: {
                janna: 0, garen: 1
            }, B: {
                teemo: 1
            }
        })
        card(s,
            "A",
            "janna",
            "E")
        const open = attackOpen(s,
            "B:teemo",
            "A:garen")
        assert.equal(chainOpts(open.s,
            "A",
            "janna_e")[0]?.args?.target,
        "A:garen")
        const gar0 = u(s,
                "A",
                "garen"), base = gm(s).atk(gar0)
        const r = chainWith(open.s,
            "A",
            "janna_e",
            {
                target: "A:garen"
            },
            open.ev)
        const gar = u(r.s,
            "A",
            "garen")
        assert.ok(r.ev.some((e) => e.t === "shield" && e.target === "A:garen" && e.amount === Math.round(kj.e1)))
        assert.equal(gar.statuses.shield_power.v,
            kj.e3)
        const sh = gm(r.s).totalShield(gar)
        assert.equal(gm(r.s).atk(gar),
            Math.round(base + sh * kj.e3))
        assert.equal(gm(r.s).ap(gar),
            Math.round(sh * kj.e3))
    })
test("E: Mắt Bão mất khi Khiên vỡ",
    () => {
        const s = mk({
            A: {
                janna: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        const c = card(s,
            "A",
            "janna",
            "E")
        const r = cast(s,
            "A",
            c,
            {
                target: "A:garen"
            })
        assert.ok(gm(r.s).has(u(r.s,
            "A",
            "garen"),
        "shield_power"))
        gm(r.s).damage(u(r.s,
            "B",
            "zed"),
        u(r.s,
            "A",
            "garen"),
        1e5,
        "true",
        {
            tag: "effect"
        })
        assert.equal(u(r.s,
            "A",
            "garen").status === "board" ? gm(r.s).has(u(r.s,
                "A",
                "garen"),
            "shield_power") : false,
        false)
        assert.equal(gm(r.s).atk(u(r.s,
            "A",
            "garen")),
        Math.round(cg.getHero("garen")!.atk))
    })
test("E: không nối được khi chiêu địch nhắm cả phe",
    () => {
        const s = mk({
            A: {
                janna: 0, garen: 1
            }, B: {
                brand: 1
            }
        })
        card(s,
            "A",
            "janna",
            "E")
        const open = skillOpen(s,
            "brand",
            "E")
        assert.equal(open.s.phase === "chain" ? chainOpts(open.s,
            "A",
            "janna_e").length : 0,
        0)
    })
test("R: Quick nối khi chiêu địch nhắm cả phe; Khiên cả đội và hồi r3 Khiên",
    () => {
        const s = mk({
            A: {
                janna: 0, garen: 1, braum: 2
            }, B: {
                brand: 1
            }
        })
        card(s,
            "A",
            "janna",
            "R")
        for (const h of ["garen",
            "braum",
            "janna"]) u(s,
            "A",
            h).hp = 1
        const open = skillOpen(s,
            "brand",
            "E")
        assert.equal(chainOpts(open.s,
            "A",
            "janna_r").length,
        1)
        const r = chainWith(open.s,
            "A",
            "janna_r",
            {
            },
            open.ev)
        for (const h of ["garen",
            "braum",
            "janna"]) {
            assert.ok(r.ev.some((e) => e.t === "shield" && e.target === `A:${h}` && e.amount === Math.round(kj.r1)),
                `${h} nhận Khiên`)
            assert.ok(r.ev.some((e) => e.t === "heal" && e.target === `A:${h}` && e.amount === Math.round(kj.r1 * kj.r3)),
                `${h} hồi`)
        }
    })
test("R: không nối khi địch chỉ đánh/nhắm 1 tướng, nhưng dùng chủ động được",
    () => {
        const s = mk({
            A: {
                janna: 0, garen: 1
            }, B: {
                teemo: 1
            }
        })
        card(s,
            "A",
            "janna",
            "R")
        const open = attackOpen(s,
            "B:teemo",
            "A:garen")
        assert.equal(chainOpts(open.s,
            "A",
            "janna_r").length,
        0)
        const s2 = mk({
            A: {
                janna: 0, garen: 1
            }, B: {
                teemo: 1
            }
        })
        const c = card(s2,
            "A",
            "janna",
            "R")
        assert.ok(hasPlay(s2,
            "A",
            "janna_r"))
        const r = cast(s2,
            "A",
            c,
            {
            })
        assert.ok(r.ev.some((e) => e.t === "shield" && e.target === "A:garen"))
    })

// ======================================================================
G("Soraka")
test("không còn cứu chết: đồng minh ở 1 Máu bị hạ như thường",
    () => {
        const s = mk({
            A: {
                soraka: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        u(s,
            "A",
            "garen").hp = 1
        const r = basicB(s,
            "B:zed",
            "A:garen")
        assert.equal(u(r.s,
            "A",
            "garen").status,
        "dead")
        assert.equal(u(r.s,
            "A",
            "soraka").hp,
        u(s,
            "A",
            "soraka").maxHp)
    })
test("nội tại: phe được hồi đủ p1 Máu thì +1 Thánh Quang, phần dư giữ lại; địch được hồi không tính",
    () => {
        const s = mk({
            A: {
                soraka: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        const g = gm(s)
        u(s,
            "A",
            "garen").hp = 1; u(s,
            "B",
            "zed").hp = 1
        u(s,
            "A",
            "soraka").stacks["tc:soraka_heal"] = ks.p1 - 3
        const real = g.heal(undefined,
            u(s,
                "A",
                "garen"),
            10)
        assert.equal(real,
            10)
        assert.equal(u(s,
            "A",
            "soraka").stacks.soraka_light,
        1)
        assert.equal(u(s,
            "A",
            "soraka").stacks["tc:soraka_heal"],
        ks.p1 - 3 + 10 - ks.p1)
        g.heal(undefined,
            u(s,
                "B",
                "zed"),
            100)
        assert.equal(u(s,
            "A",
            "soraka").stacks.soraka_light,
        1)
    })
test("nội tại: mỗi Thánh Quang tăng p2 hồi Máu nhận vào của tướng mình, không tăng của địch",
    () => {
        const s = mk({
            A: {
                soraka: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        const g = gm(s)
        u(s,
            "A",
            "soraka").stacks.soraka_light = 6
        u(s,
            "A",
            "garen").hp = 1; u(s,
            "B",
            "zed").hp = 1
        assert.equal(g.heal(undefined,
            u(s,
                "A",
                "garen"),
            100),
        Math.round(100 * (1 + 6 * ks.p2)))
        assert.equal(g.heal(undefined,
            u(s,
                "B",
                "zed"),
            100),
        100)
    })
test("nội tại: đòn thường của tướng mình thêm Z nếu Máu hiện tại nhiều hơn mục tiêu",
    () => {
        const s = mk({
            A: {
                soraka: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        setAp(s,
            "A",
            "soraka",
            100)
        const g = gm(s), z = ks.p3 + ks.p4 * g.ap(u(s,
            "A",
            "soraka"))
        u(s,
            "B",
            "zed").hp = u(s,
            "B",
            "zed").maxHp // garen hp tối đa của Garen < Zed? ép Garen nhiều Máu hơn
        u(s,
            "A",
            "garen").hp = u(s,
            "B",
            "zed").hp + 1
        u(s,
            "A",
            "garen").maxHp = Math.max(u(s,
            "A",
            "garen").maxHp,
        u(s,
            "A",
            "garen").hp)
        const atk = g.atk(u(s,
            "A",
            "garen"))
        const ar = armor(s,
            "B",
            "zed")
        const r = basic(s,
            "A",
            "A:garen",
            "B:zed")
        assert.equal(dmgOn(r.ev,
            "B:zed"),
        mit(atk,
            ar) + mit(z,
            ar))
        // ít Máu hơn: không thêm
        const s2 = mk({
            A: {
                soraka: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        u(s2,
            "A",
            "garen").hp = 5
        const r2 = basic(s2,
            "A",
            "A:garen",
            "B:zed")
        assert.equal(dmgOn(r2.ev,
            "B:zed"),
        mit(gm(s2).atk(u(s2,
            "A",
            "garen")),
        armor(s2,
            "B",
            "zed")))
    })
test("nội tại: Soraka bị hạ mất một nửa Thánh Quang",
    () => {
        const s = mk({
            A: {
                soraka: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        u(s,
            "A",
            "soraka").stacks.soraka_light = 7
        gm(s).kill(u(s,
            "A",
            "soraka"),
        u(s,
            "B",
            "zed"))
        assert.equal(u(s,
            "A",
            "soraka").stacks.soraka_light,
        3)
    })
test("Q: gây sát thương phép, nếu trúng Soraka hồi B; không trúng thì không hồi",
    () => {
        const s = mk({
            A: {
                soraka: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        setAp(s,
            "A",
            "soraka",
            100)
        const ap = gm(s).ap(u(s,
            "A",
            "soraka"))
        u(s,
            "A",
            "soraka").hp = 1
        const r = cast(s,
            "A",
            skill(s,
                "soraka",
                "A",
                "Q"),
            {
                target: "B:zed"
            })
        assert.equal(dmgOn(r.ev,
            "B:zed"),
        mit(ks.q1 + ks.q2 * ap,
            mr(r.s,
                "B",
                "zed")))
        assert.equal(u(r.s,
            "A",
            "soraka").hp,
        1 + Math.round(ks.q3 + ks.q4 * ap))
        const s2 = mk({
            A: {
                soraka: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        u(s2,
            "A",
            "soraka").hp = 1
        u(s2,
            "B",
            "zed").statuses.invulnerable = {
            until: 9999, v: 1
        }
        const r2 = cast(s2,
            "A",
            skill(s2,
                "soraka",
                "A",
                "Q"),
            {
                target: "B:zed"
            })
        assert.equal(dmgOn(r2.ev,
            "B:zed"),
        0)
        assert.equal(u(r2.s,
            "A",
            "soraka").hp,
        1,
        "không trúng thì không hồi")
    })
test("E: Quick nối khi địch nhắm đúng 1 tướng mình khác Soraka; mất C Máu, tối thiểu còn 1, đồng minh hồi D",
    () => {
        const s = mk({
            A: {
                soraka: 0, garen: 1
            }, B: {
                teemo: 1
            }
        })
        card(s,
            "A",
            "soraka",
            "E")
        u(s,
            "A",
            "garen").hp = 1
        const open = attackOpen(s,
            "B:teemo",
            "A:garen")
        assert.equal(chainOpts(open.s,
            "A",
            "soraka_e")[0]?.args?.target,
        "A:garen")
        const hp0 = u(open.s,
            "A",
            "soraka").hp
        const r = chainWith(open.s,
            "A",
            "soraka_e",
            {
                target: "A:garen"
            },
            open.ev)
        assert.equal(u(r.s,
            "A",
            "soraka").hp,
        hp0 - ks.e1)
        assert.ok(r.ev.some((e) => e.t === "heal" && e.target === "A:garen" && e.amount === Math.round(ks.e2)))
    })
test("E: không nối được khi địch nhắm đúng Soraka hoặc nhiều tướng",
    () => {
        const s = mk({
            A: {
                soraka: 0, garen: 1
            }, B: {
                teemo: 1
            }
        })
        card(s,
            "A",
            "soraka",
            "E")
        const open = attackOpen(s,
            "B:teemo",
            "A:soraka")
        assert.equal(chainOpts(open.s,
            "A",
            "soraka_e").length,
        0)
        const s2 = mk({
            A: {
                soraka: 0, garen: 1
            }, B: {
                brand: 1
            }
        })
        card(s2,
            "A",
            "soraka",
            "E")
        const open2 = skillOpen(s2,
            "brand",
            "E")
        assert.equal(open2.s.phase === "chain" ? chainOpts(open2.s,
            "A",
            "soraka_e").length : 0,
        0)
    })
test("E: dùng chủ động chọn 1 tướng mình khác; Soraka 1 Máu thì không mất thêm",
    () => {
        const s = mk({
            A: {
                soraka: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        const c = card(s,
            "A",
            "soraka",
            "E")
        assert.deepEqual(playOpts(s,
            "A",
            "soraka_e").map((a) => a.args?.target),
        ["A:garen"])
        u(s,
            "A",
            "soraka").hp = 1; u(s,
            "A",
            "garen").hp = 1
        const r = cast(s,
            "A",
            c,
            {
                target: "A:garen"
            })
        assert.equal(u(r.s,
            "A",
            "soraka").hp,
        1)
        assert.equal(u(r.s,
            "A",
            "garen").hp,
        1 + Math.round(ks.e2))
    })
test("R: mọi tướng mình hồi E; dưới r3 Máu tối đa hồi gấp đôi",
    () => {
        const s = mk({
            A: {
                soraka: 0, garen: 1, braum: 2
            }, B: {
                zed: 1
            }
        })
        const low = u(s,
                "A",
                "garen"), mid = u(s,
                "A",
                "braum")
        low.hp = 1
        mid.hp = Math.round(mid.maxHp * (ks.r3 + 0.1))
        u(s,
            "A",
            "soraka").hp = Math.round(u(s,
            "A",
            "soraka").maxHp * 0.3)
        const before = {
            soraka: u(s,
                "A",
                "soraka").hp, garen: low.hp, braum: mid.hp
        }
        const r = cast(s,
            "A",
            skill(s,
                "soraka",
                "A",
                "R"),
            {
            })
        // Thánh Quang tích dần trong chính lá R nên hồi sau mạnh hơn: dựng lại tuần tự theo thứ tự đường
        let acc = 0, light = 0
        for (const h of ["soraka",
            "garen",
            "braum"] as const) {
            const base = h === "braum" ? ks.r1 : ks.r1 * 2
            const real = Math.round(base * (1 + ks.p2 * light))
            assert.equal(u(r.s,
                "A",
                h).hp,
            before[h] + real,
            `${h} hồi ${real}`)
            acc += real
            light += Math.floor(acc / ks.p1); acc %= ks.p1
        }
    })

// ======================================================================
G("Brand")
test("nội tại: chiêu trúng gắn Bỏng theo đơn vị X.Y (phần nguyên chắc chắn, phần lẻ là xác suất)",
    () => {
        const s = mk({
            A: {
                brand: 0
            }, B: {
                zed: 0
            }
        })
        const r = cast(s,
            "A",
            skill(s,
                "brand",
                "A",
                "E"),
            {
            })
        assert.equal(u(r.s,
            "B",
            "zed").stacks.burn,
        Math.floor(kb.p1),
        "AP gốc 0 nên đúng p1 tầng")
        // 1.5 đơn vị: 1 chắc chắn, 50% thêm 1
        const counts = new Set<number>()
        for (let i = 0; i < 40; i++) {
            const s2 = mk({
                A: {
                    brand: 0
                }, B: {
                    zed: 0
                }, seed: 20261101 + i
            })
            setAp(s2,
                "A",
                "brand", (
                    0.5 / kb.p2))
            const r2 = cast(s2,
                "A",
                skill(s2,
                    "brand",
                    "A",
                    "E"),
                {
                })
            counts.add(u(r2.s,
                "B",
                "zed").stacks.burn ?? 0)
        }
        assert.deepEqual([...counts].sort(),
            [Math.floor(kb.p1 + 0.5),
                Math.floor(kb.p1 + 0.5) + 1].sort())
    })
test("nội tại: miễn nhiễm (sát thương 0) thì không gắn Bỏng",
    () => {
        const s = mk({
            A: {
                brand: 0
            }, B: {
                zed: 0
            }
        })
        u(s,
            "B",
            "zed").statuses.invulnerable = {
            until: 9999, v: 1
        }
        const r = cast(s,
            "A",
            skill(s,
                "brand",
                "A",
                "E"),
            {
            })
        assert.equal(u(r.s,
            "B",
            "zed").stacks.burn ?? 0,
        0)
    })
test("Bỏng: đầu lượt tướng mang, mỗi Bỏng gây p3 Máu hiện tại + p4 Máu tối đa sát thương phép",
    () => {
        const s = mk({
            A: {
                brand: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        const z = u(s,
            "B",
            "zed")
        z.stacks.burn = 4
        const hp0 = z.hp
        const r = endTurn(s)
        assert.equal(r.s.active,
            "B")
        const tick = evs(r.ev,
            "damage").filter((e) => e.target === "B:zed" && e.tag === "dot")
        assert.equal(tick.length,
            1)
        assert.equal(tick[0].kind,
            "magic")
        assert.equal(tick[0].amount,
            mit((hp0 * kb.p3 + z.maxHp * kb.p4) * 4,
                mr(r.s,
                    "B",
                    "zed")))
        assert.equal(u(r.s,
            "B",
            "zed").stacks.burn,
        4,
        "không hết hạn")
    })
test("Bỏng: không cháy vào lượt của phe Brand, và Bỏng không hết hạn qua nhiều lượt",
    () => {
        const s = mk({
            A: {
                brand: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        u(s,
            "B",
            "zed").stacks.burn = 2
        let st = endTurn(s).s
        st = endTurn(st).s
        assert.equal(st.active,
            "A")
        assert.equal(u(st,
            "B",
            "zed").stacks.burn,
        2)
        assert.equal(u(st,
            "A",
            "garen").stacks.burn ?? 0,
        0)
    })
test("Bỏng: Brand đã chết vẫn cháy ở đầu lượt tướng mang",
    () => {
        const s = mk({
            A: {
                brand: 0, garen: 1
            }, B: {
                zed: 1
            }
        })
        u(s,
            "B",
            "zed").stacks.burn = 3
        gm(s).kill(u(s,
            "A",
            "brand"),
        u(s,
            "B",
            "zed"))
        assert.equal(u(s,
            "B",
            "zed").stacks.burn,
        3,
        "Brand chết không đổi Bỏng")
        const r = endTurn(s)
        assert.ok(evs(r.ev,
            "damage").some((e) => e.target === "B:zed" && e.tag === "dot" && e.amount > 0))
    })
test("Bỏng: tướng mang bị hạ mất một nửa",
    () => {
        const s = mk({
            A: {
                brand: 0
            }, B: {
                zed: 1
            }
        })
        u(s,
            "B",
            "zed").stacks.burn = 7
        gm(s).kill(u(s,
            "B",
            "zed"),
        u(s,
            "A",
            "brand"))
        assert.equal(u(s,
            "B",
            "zed").stacks.burn,
        3)
    })
test("Q: sát thương phép + Bỏng; có từ q3 Bỏng thì Choáng, chưa đủ thì không",
    () => {
        const s = mk({
            A: {
                brand: 0
            }, B: {
                zed: 0
            }
        })
        setAp(s,
            "A",
            "brand",
            200)
        const brand = u(s,
                "A",
                "brand"), g = gm(s), ap = g.ap(brand)
        const burnUnits = Math.floor(kb.p1 + kb.p2 * ap + 1e-9)
        u(s,
            "B",
            "zed").stacks.burn = Math.max(0,
            kb.q3 - burnUnits)
        const r = cast(s,
            "A",
            skill(s,
                "brand",
                "A",
                "Q"),
            {
                target: "B:zed"
            })
        assert.equal(dmgOn(r.ev,
            "B:zed"),
        mit(kb.q1 + kb.q2 * ap,
            mr(r.s,
                "B",
                "zed")))
        assert.ok(u(r.s,
            "B",
            "zed").stacks.burn >= kb.q3)
        unitsOk(r.s,
            brand,
            u(r.s,
                "B",
                "zed").statuses.stun?.until,
            kb.q4 + kb.q5 * ap)
        const s2 = mk({
            A: {
                brand: 0
            }, B: {
                zed: 0
            }
        })
        const r2 = cast(s2,
            "A",
            skill(s2,
                "brand",
                "A",
                "Q"),
            {
                target: "B:zed"
            })
        assert.ok((u(r2.s,
            "B",
            "zed").stacks.burn ?? 0) < kb.q3)
        assert.equal(u(r2.s,
            "B",
            "zed").statuses.stun,
        undefined)
    })
test("E: mọi địch nhận sát thương phép và Bỏng",
    () => {
        const s = mk({
            A: {
                brand: 0
            }, B: {
                zed: 0, teemo: 1, braum: 2
            }
        })
        const r = cast(s,
            "A",
            skill(s,
                "brand",
                "A",
                "E"),
            {
            })
        for (const h of ["zed",
            "teemo",
            "braum"]) {
            assert.equal(dmgOn(r.ev,
                `B:${h}`),
            mit(kb.e1,
                mr(r.s,
                    "B",
                    h)))
            assert.equal(u(r.s,
                "B",
                h).stacks.burn,
            Math.floor(kb.p1))
        }
    })
test("R: sát thương phép, Bỏng nhân đôi và cháy ngay 1 lần",
    () => {
        const s = mk({
            A: {
                brand: 0
            }, B: {
                zed: 0, teemo: 1
            }
        })
        u(s,
            "B",
            "zed").stacks.burn = 3
        const r = cast(s,
            "A",
            skill(s,
                "brand",
                "A",
                "R"),
            {
            })
        const g = gm(r.s)
        const zed = u(r.s,
            "B",
            "zed")
        const n = (3 + Math.floor(kb.p1)) * 2
        assert.equal(zed.stacks.burn,
            n)
        const evz = evs(r.ev,
            "damage").filter((e) => e.target === "B:zed")
        assert.equal(evz[0].amount,
            mit(kb.r1,
                mr(r.s,
                    "B",
                    "zed")))
        const tick = evz.find((e) => e.tag === "dot")!
        assert.equal(tick.amount,
            mit((evz[0].hp * kb.p3 + zed.maxHp * kb.p4) * n,
                g.mr(zed)))
        assert.equal(u(r.s,
            "B",
            "teemo").stacks.burn,
        Math.floor(kb.p1) * 2)
    })

// ======================================================================
G("Ahri")
test("nội tại: đánh thường, dùng chiêu và đổi chỗ cho 1 Tinh Hoa mỗi điều kiện",
    () => {
        const s = mk({
            A: {
                ahri: 0, garen: 1
            }, B: {
                zed: 0
            }
        })
        let r = basic(s,
            "A",
            "A:ahri",
            "B:zed")
        assert.equal(u(r.s,
            "A",
            "ahri").stacks.ahri_essence,
        1)
        r = cast(r.s,
            "A",
            skill(r.s,
                "ahri",
                "A",
                "Q"),
            {
                target: "B:zed"
            })
        assert.equal(u(r.s,
            "A",
            "ahri").stacks.ahri_essence,
        2)
        gm(r.s).moveTo(u(r.s,
            "A",
            "garen"),
        0)
        assert.equal(u(r.s,
            "A",
            "ahri").stacks.ahri_essence,
        3,
        "bị đổi chỗ cũng tính")
        gm(r.s).moveTo(u(r.s,
            "A",
            "ahri"),
        3)
        assert.equal(u(r.s,
            "A",
            "ahri").stacks.ahri_essence,
        4)
    })
test("nội tại: E đổi chỗ cho 1 Tinh Hoa đổi chỗ và 1 Tinh Hoa dùng chiêu",
    () => {
        const s = mk({
            A: {
                ahri: 0, garen: 3
            }, B: {
                zed: 3
            }
        })
        const r = cast(s,
            "A",
            skill(s,
                "ahri",
                "A",
                "E"),
            {
                target: "A:garen"
            })
        assert.equal(u(r.s,
            "A",
            "ahri").stacks.ahri_essence,
        2)
    })
test("nội tại: mỗi Tinh Hoa thêm p1 sát thương Q, E, R",
    () => {
        const s = mk({
            A: {
                ahri: 0
            }, B: {
                zed: 0
            }
        })
        u(s,
            "A",
            "ahri").stacks.ahri_essence = 5
        const r = cast(s,
            "A",
            skill(s,
                "ahri",
                "A",
                "Q"),
            {
                target: "B:zed"
            })
        const d = evs(r.ev,
            "damage").find((e) => e.kind === "magic" && e.target === "B:zed")!
        assert.equal(d.amount,
            mit(kah.q1 + 5 * kah.p1,
                mr(r.s,
                    "B",
                    "zed")))
    })
test("nội tại: đòn thường thêm p2·AP mỗi Tinh Hoa (phép) và Tốc Đánh p3 mỗi Tinh Hoa",
    () => {
        const s = mk({
            A: {
                ahri: 0
            }, B: {
                zed: 0
            }
        })
        setAp(s,
            "A",
            "ahri",
            100)
        const a = u(s,
                "A",
                "ahri"), g = gm(s)
        a.stacks.ahri_essence = 4
        assert.equal(g.attackSpeed(a),
            100 + 4 * kah.p3)
        assert.equal(g.attackSpeed(u(s,
            "B",
            "zed")),
        100)
        const info = g.attack(a,
            u(s,
                "B",
                "zed"))!
        assert.ok(info.bonus.some((b) => b.kind === "magic" && Math.abs(b.raw - 4 * kah.p2 * g.ap(a)) < 1e-9))
    })
test("nội tại: Ahri bị hạ mất một nửa Tinh Hoa",
    () => {
        const s = mk({
            A: {
                ahri: 0
            }, B: {
                zed: 0
            }
        })
        u(s,
            "A",
            "ahri").stacks.ahri_essence = 9
        gm(s).kill(u(s,
            "A",
            "ahri"),
        u(s,
            "B",
            "zed"))
        assert.equal(u(s,
            "A",
            "ahri").stacks.ahri_essence,
        4)
    })
test("Q: chọn địch đối diện hoặc địch có Say Mê ở bất kỳ đường; địch khác không chọn được",
    () => {
        const s = mk({
            A: {
                ahri: 0
            }, B: {
                zed: 0, teemo: 1, braum: 2
            }
        })
        card(s,
            "A",
            "ahri",
            "Q")
        assert.deepEqual(playOpts(s,
            "A",
            "ahri_q").map((a) => a.args?.target),
        ["B:zed"])
        u(s,
            "B",
            "braum").statuses.ahri_charm = {
            until: 99999, v: 1
        }
        assert.deepEqual(playOpts(s,
            "A",
            "ahri_q").map((a) => a.args?.target).sort(),
        ["B:braum",
            "B:zed"])
    })
test("Q: sát thương phép rồi thêm q3% Máu đã mất thành sát thương chuẩn",
    () => {
        const s = mk({
            A: {
                ahri: 0
            }, B: {
                zed: 0
            }
        })
        const r = cast(s,
            "A",
            skill(s,
                "ahri",
                "A",
                "Q"),
            {
                target: "B:zed"
            })
        const [m,
            t] = evs(r.ev,
            "damage").filter((e) => e.target === "B:zed")
        assert.equal(m.kind,
            "magic")
        assert.equal(m.amount,
            mit(kah.q1,
                mr(r.s,
                    "B",
                    "zed")))
        const zed = u(r.s,
            "B",
            "zed")
        assert.equal(t.kind,
            "true")
        assert.equal(t.amount,
            Math.round((kah.q3 / 100) * (zed.maxHp - m.hp)))
    })
test("E: đổi chỗ với đồng minh khác, địch đối diện vị trí mới nhận sát thương phép; không có đối diện thì không đánh",
    () => {
        const s = mk({
            A: {
                ahri: 0, garen: 3
            }, B: {
                zed: 3, teemo: 0
            }
        })
        const r = cast(s,
            "A",
            skill(s,
                "ahri",
                "A",
                "E"),
            {
                target: "A:garen"
            })
        assert.equal(u(r.s,
            "A",
            "ahri").lane,
        3)
        assert.equal(u(r.s,
            "A",
            "garen").lane,
        0)
        // đổi chỗ đã cho 1 Tinh Hoa trước khi đánh
        assert.equal(dmgOn(r.ev,
            "B:zed"),
        mit(kah.e1 + kah.p1,
            mr(r.s,
                "B",
                "zed")))
        assert.equal(dmgOn(r.ev,
            "B:teemo"),
        0)
    })
test("R: chọn địch đối diện; sát thương phép và Say Mê không hết hạn, tối đa 1 tầng",
    () => {
        const s = mk({
            A: {
                ahri: 0
            }, B: {
                zed: 0
            }
        })
        let r = cast(s,
            "A",
            skill(s,
                "ahri",
                "A",
                "R"),
            {

            })
        assert.equal(dmgOn(r.ev,
            "B:zed"),
        mit(kah.r1,
            mr(r.s,
                "B",
                "zed")))
        const c = u(r.s,
            "B",
            "zed").statuses.ahri_charm
        assert.equal(c.v,
            1)
        assert.ok(c.until >= cg.FOREVER)
        assert.equal(c.src,
            "A:ahri")
        u(r.s,
            "B",
            "zed").hp = u(r.s,
            "B",
            "zed").maxHp
        r = cast(r.s,
            "A",
            skill(r.s,
                "ahri",
                "A",
                "R"),
            {
            })
        assert.equal(u(r.s,
            "B",
            "zed").statuses.ahri_charm.v,
        1,
        "không cộng dồn")
    })
test("R: Say Mê - Ahri gây thêm r3 lên nó, nó gây ít hơn r4 lên Ahri; đồng minh thường không đổi",
    () => {
        const s = mk({
            A: {
                ahri: 0, garen: 1
            }, B: {
                zed: 0, braum: 1
            }
        })
        u(s,
            "B",
            "zed").statuses.ahri_charm = {
            until: 99999, v: 1, src: "A:ahri"
        }
        const g = gm(s)
        const atk = g.atk(u(s,
            "A",
            "ahri"))
        const r = basic(s,
            "A",
            "A:ahri",
            "B:zed")
        assert.equal(dmgOn(r.ev,
            "B:zed"),
        mit(atk * (1 + kah.r3),
            mr(r.s,
                "B",
                "zed")))
        const zatk = g.atk(u(s,
            "B",
            "zed"))
        void zatk
        const r2 = basicB(s,
            "B:zed",
            "A:ahri")
        // so với Zed không bị mê
        const ctrl = mk({
            A: {
                ahri: 0, garen: 1
            }, B: {
                zed: 0, braum: 1
            }
        })
        const rc = basicB(ctrl,
            "B:zed",
            "A:ahri")
        assert.equal(dmgOn(r2.ev,
            "A:ahri"),
        Math.round(dmgOn(rc.ev,
            "A:ahri") * (1 - kah.r4)))
    })
test("R: Say Mê mất khi nó bị hạ",
    () => {
        const s = mk({
            A: {
                ahri: 0
            }, B: {
                zed: 0
            }
        })
        const r = cast(s,
            "A",
            skill(s,
                "ahri",
                "A",
                "R"),
            {
            })
        gm(r.s).kill(u(r.s,
            "B",
            "zed"),
        u(r.s,
            "A",
            "ahri"))
        assert.equal(u(r.s,
            "B",
            "zed").statuses.ahri_charm,
        undefined)
    })

// ======================================================================
G("Annie")
test("nội tại: mỗi chiêu cho 1 Lửa, tối đa p1; chiêu thứ p1+1 tiêu hết và không cho Lửa",
    () => {
        let s = mk({
            A: {
                annie: 0
            }, B: {
                zed: 0
            }
        })
        for (let i = 1; i <= kap.p1; i++) {
            u(s,
                "B",
                "zed").hp = u(s,
                "B",
                "zed").maxHp
            s = cast(s,
                "A",
                skill(s,
                    "annie",
                    "A",
                    "Q"),
                {
                    target: "B:zed"
                }).s
            assert.equal(u(s,
                "A",
                "annie").stacks.fire,
            i)
        }
        u(s,
            "B",
            "zed").hp = u(s,
            "B",
            "zed").maxHp
        s = cast(s,
            "A",
            skill(s,
                "annie",
                "A",
                "Q"),
            {
                target: "B:zed"
            }).s
        assert.equal(u(s,
            "A",
            "annie").stacks.fire,
        0)
    })
test("nội tại: đủ Lửa thì chiêu kế Choáng mọi địch trúng; chưa đủ thì không Choáng",
    () => {
        const s = mk({
            A: {
                annie: 0
            }, B: {
                zed: 0, teemo: 1, braum: 2
            }
        })
        setAp(s,
            "A",
            "annie",
            200)
        const ann = u(s,
            "A",
            "annie")
        const r0 = cast(s,
            "A",
            skill(s,
                "annie",
                "A",
                "R"),
            {
            })
        for (const h of ["zed",
            "teemo",
            "braum"]) assert.equal(u(r0.s,
            "B",
            h).statuses.stun,
        undefined)
        u(s,
            "A",
            "annie").stacks.fire = kap.p1
        const r = cast(s,
            "A",
            skill(s,
                "annie",
                "A",
                "R"),
            {
            })
        for (const h of ["zed",
            "teemo",
            "braum"]) unitsOk(r.s,
            ann,
            u(r.s,
                "B",
                h).statuses.stun?.until,
            kap.p2 + kap.p3 * gm(s).ap(ann))
        assert.equal(u(r.s,
            "A",
            "annie").stacks.fire,
        0)
    })
test("nội tại: tướng đang Choáng chịu thêm p4 từ Annie (cờ stunBonusOnly: chỉ Choáng)",
    () => {
        const mkS = () => mk({
            A: {
                annie: 0
            }, B: {
                zed: 0
            }
        })
        const ctrl = cast(mkS(),
            "A",
            mkS && skill(mkS(),
                "annie",
                "A",
                "Q"),
            {
                target: "B:zed"
            },
            true)
        void ctrl
        const s0 = mkS()
        const base = cast(s0,
            "A",
            skill(s0,
                "annie",
                "A",
                "Q"),
            {
                target: "B:zed"
            })
        const g = gm(base.s), annie = u(base.s,
            "A",
            "annie")
        const raw = kap.q1 + kap.q3 * annie.maxHp
        assert.equal(dmgOn(base.ev,
            "B:zed"),
        mit(raw,
            mr(base.s,
                "B",
                "zed")))
        const s1 = mkS()
        u(s1,
            "B",
            "zed").statuses.stun = {
            until: 9999, v: 1
        }
        const r1 = cast(s1,
            "A",
            skill(s1,
                "annie",
                "A",
                "Q"),
            {
                target: "B:zed"
            })
        assert.equal(dmgOn(r1.ev,
            "B:zed"),
        mit(raw * (1 + kap.p4),
            mr(r1.s,
                "B",
                "zed")))
        void g
        // Câm Lặng không đủ khi cờ bật
        const s2 = mkS()
        u(s2,
            "B",
            "zed").statuses.silence = {
            until: 9999, v: 1
        }
        const r2 = cast(s2,
            "A",
            skill(s2,
                "annie",
                "A",
                "Q"),
            {
                target: "B:zed"
            })
        assert.equal(dmgOn(r2.ev,
            "B:zed"),
        mit(raw,
            mr(r2.s,
                "B",
                "zed")))
        // tắt cờ: mọi khống chế
        const flags = kan.raw.flags as Record<string, number>
        const old = flags.stunBonusOnly
        flags.stunBonusOnly = 0
        try {
            const s3 = mkS()
            u(s3,
                "B",
                "zed").statuses.silence = {
                until: 9999, v: 1
            }
            const r3 = cast(s3,
                "A",
                skill(s3,
                    "annie",
                    "A",
                    "Q"),
                {
                    target: "B:zed"
                })
            assert.equal(dmgOn(r3.ev,
                "B:zed"),
            mit(raw * (1 + kap.p4),
                mr(r3.s,
                    "B",
                    "zed")))
        } finally { flags.stunBonusOnly = old }
    })
test("nội tại: Annie bị hạ mất một nửa Lửa",
    () => {
        const s = mk({
            A: {
                annie: 0
            }, B: {
                zed: 0
            }
        })
        u(s,
            "A",
            "annie").stacks.fire = 3
        gm(s).kill(u(s,
            "A",
            "annie"),
        u(s,
            "B",
            "zed"))
        assert.equal(u(s,
            "A",
            "annie").stacks.fire,
        1)
    })
test("Q: sát thương phép theo AP và Máu tối đa; hạ gục thì lá về tay, không hạ thì vào mộ",
    () => {
        const s = mk({
            A: {
                annie: 0
            }, B: {
                zed: 0
            }
        })
        setAp(s,
            "A",
            "annie",
            100)
        const ann = u(s,
                "A",
                "annie"), ap = gm(s).ap(ann)
        const c = skill(s,
            "annie",
            "A",
            "Q")
        const r = cast(s,
            "A",
            c,
            {
                target: "B:zed"
            })
        assert.equal(dmgOn(r.ev,
            "B:zed"),
        mit(kap.q1 + kap.q2 * ap + kap.q3 * ann.maxHp,
            mr(r.s,
                "B",
                "zed")))
        assert.ok(!r.s.players.A.hand.some((x) => x.uid === c.uid))
        const s2 = mk({
            A: {
                annie: 0
            }, B: {
                zed: 0
            }
        })
        u(s2,
            "B",
            "zed").hp = 1
        const c2 = skill(s2,
            "annie",
            "A",
            "Q")
        const r2 = cast(s2,
            "A",
            c2,
            {
                target: "B:zed"
            })
        assert.equal(u(r2.s,
            "B",
            "zed").status,
        "dead")
        assert.ok(r2.s.players.A.hand.some((x) => x.uid === c2.uid),
            "hạ gục: lá về tay")
    })
test("E: Quick nối khi địch nhắm đúng Annie, mục tiêu là kẻ đó; Annie nhận Khiên",
    () => {
        const s = mk({
            A: {
                annie: 0, garen: 1
            }, B: {
                teemo: 1
            }
        })
        card(s,
            "A",
            "annie",
            "E")
        const open = attackOpen(s,
            "B:teemo",
            "A:annie")
        const opts = chainOpts(open.s,
            "A",
            "annie_e")
        assert.equal(opts.length,
            1)
        assert.equal(opts[0].args?.target,
            "B:teemo")
        const r = chainWith(open.s,
            "A",
            "annie_e",
            {
                target: "B:teemo"
            },
            open.ev)
        const ann = u(r.s,
            "A",
            "annie")
        const hit = evs(r.ev,
            "damage").find((e) => e.src === "A:annie" && e.target === "B:teemo")!
        assert.equal(hit.amount,
            mit(kap.e1 + kap.e3 * ann.maxHp,
                mr(r.s,
                    "B",
                    "teemo")))
        assert.ok(r.ev.some((e) => e.t === "shield" && e.target === "A:annie" && e.amount === Math.round(kap.e4 + kap.e6 * ann.maxHp)))
    })
test("E: không nối được khi địch nhắm đồng minh khác hoặc cả phe; dùng chủ động chọn địch",
    () => {
        const s = mk({
            A: {
                annie: 0, garen: 1
            }, B: {
                teemo: 1
            }
        })
        card(s,
            "A",
            "annie",
            "E")
        const open = attackOpen(s,
            "B:teemo",
            "A:garen")
        assert.equal(chainOpts(open.s,
            "A",
            "annie_e").length,
        0)
        const s2 = mk({
            A: {
                annie: 0, garen: 1
            }, B: {
                brand: 1
            }
        })
        card(s2,
            "A",
            "annie",
            "E")
        const open2 = skillOpen(s2,
            "brand",
            "E")
        assert.equal(open2.s.phase === "chain" ? chainOpts(open2.s,
            "A",
            "annie_e").length : 0,
        0)
        const s3 = mk({
            A: {
                annie: 0
            }, B: {
                zed: 0, teemo: 1
            }
        })
        card(s3,
            "A",
            "annie",
            "E")
        assert.deepEqual(playOpts(s3,
            "A",
            "annie_e").map((a) => a.args?.target).sort(),
        ["B:teemo",
            "B:zed"])
    })
test("R: mọi địch nhận sát thương phép; gọi Tibbers vào ô phụ với chỉ số theo AP và Máu tối đa",
    () => {
        const s = mk({
            A: {
                annie: 0
            }, B: {
                zed: 0, teemo: 1
            }
        })
        setAp(s,
            "A",
            "annie",
            100)
        const ann = u(s,
                "A",
                "annie"), ap = gm(s).ap(ann)
        const r = cast(s,
            "A",
            skill(s,
                "annie",
                "A",
                "R"),
            {
            })
        for (const h of ["zed",
            "teemo"]) assert.equal(dmgOn(r.ev,
            `B:${h}`),
        mit(kap.r1 + kap.r2 * ap + kap.r3 * ann.maxHp,
            mr(r.s,
                "B",
                h)))
        const tid = r.s.extra.A!
        assert.ok(tid)
        const t = r.s.units[tid]
        assert.equal(t.token?.id,
            "tibbers")
        assert.equal(t.token?.ownerId,
            "A:annie")
        assert.equal(t.maxHp,
            Math.round(kap.r4 + kap.r5 * ap + kap.r6 * ann.maxHp))
        assert.equal(t.token?.armor,
            Math.round(kap.r7 + kap.r8 * ap + kap.r9 * ann.maxHp))
        assert.equal(t.token?.mr,
            Math.round(kap.r10 + kap.r11 * ap + kap.r12 * ann.maxHp))
        assert.equal(t.token?.atk,
            Math.round(kap.r13 + kap.r14 * ap + kap.r15 * ann.maxHp))
        assert.equal(t.token?.damage,
            "magic")
    })
test("R: cuối lượt Annie, Tibbers đánh 1 tướng địch; Annie bị hạ thì Tibbers biến mất",
    () => {
        const s = mk({
            A: {
                annie: 0
            }, B: {
                zed: 0
            }
        })
        const r = cast(s,
            "A",
            skill(s,
                "annie",
                "A",
                "R"),
            {
            })
        const tid = r.s.extra.A!
        const tok = r.s.units[tid]
        u(r.s,
            "B",
            "zed").hp = u(r.s,
            "B",
            "zed").maxHp
        const e = endTurn(r.s)
        const hit = evs(e.ev,
            "damage").find((x) => x.src === tid && x.target === "B:zed" && x.tag === "attack")
        assert.ok(hit,
            "Tibbers đánh Zed")
        assert.equal(hit!.kind,
            "magic")
        assert.equal(hit!.amount,
            mit(tok.token!.atk,
                mr(e.s,
                    "B",
                    "zed")))
        // Annie chết thì Tibbers mất
        const s2 = cast(mk({
            A: {
                annie: 0
            }, B: {
                zed: 0
            }
        }),
        "A",
        skill(mk({
            A: {
                annie: 0
            }, B: {
                zed: 0
            }
        }),
        "annie",
        "A",
        "R"),
        {
        })
        const s3 = s2.s
        assert.ok(s3.extra.A)
        gm(s3).kill(u(s3,
            "A",
            "annie"),
        u(s3,
            "B",
            "zed"))
        assert.equal(s3.extra.A,
            null)
    })
test("R: Tibbers đánh kẻ đang Choáng thì đau hơn p4",
    () => {
        const s = mk({
            A: {
                annie: 0
            }, B: {
                zed: 0
            }
        })
        const r = cast(s,
            "A",
            skill(s,
                "annie",
                "A",
                "R"),
            {
            })
        const tid = r.s.extra.A!
        const tok = r.s.units[tid]
        const z = u(r.s,
            "B",
            "zed")
        z.hp = z.maxHp; z.statuses.stun = {
            until: 9999, v: 1
        }
        const e = endTurn(r.s)
        const hit = evs(e.ev,
            "damage").find((x) => x.src === tid && x.target === "B:zed" && x.tag === "attack")!
        assert.equal(hit.amount,
            mit(tok.token!.atk * (1 + kap.p4),
                mr(e.s,
                    "B",
                    "zed")))
    })
test("R: đủ Lửa thì Choáng mọi địch trúng; gọi R lần nữa thay Tibbers cũ",
    () => {
        const s = mk({
            A: {
                annie: 0
            }, B: {
                zed: 0
            }
        })
        const r = cast(s,
            "A",
            skill(s,
                "annie",
                "A",
                "R"),
            {
            })
        const first = r.s.extra.A
        const r2 = cast(r.s,
            "A",
            skill(r.s,
                "annie",
                "A",
                "R"),
            {
            })
        assert.notEqual(r2.s.extra.A,
            first)
        assert.ok(!r2.s.units[first!])
    })

report()
