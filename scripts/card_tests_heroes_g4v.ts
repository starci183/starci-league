// Test cơ chế V3 của 6 pháp sư nhóm G4V: Brand, Lux, Ahri, Annie, Lissandra, Twisted Fate.
// Chạy: npx tsx scripts/card_tests_heroes_g4v.ts [--only=chuỗi] [--verbose]. Khung test chép từ scripts/card_tests.ts.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    HF
} from "./card_tests_formulas"
type St = ReturnType<typeof cg.newGame>;
type Act = Parameters<typeof cg.applyAction>[1];
type Ev = ReturnType<typeof cg.applyAction>["events"];
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
// Tướng giả: không có chiêu, không phản ứng
// ======================================================================
const noSkill = (key: "Q" | "E" | "R") => ({
    key, name: "-", desc: "-", target: "none" as const, canPlay: () => false, resolve: () => {}
})
for (const [id,
    role] of [["g4v_tank",
        "tank"],
    ["g4v_fighter",
        "fighter"],
    ["g4v_mark",
        "marksman"],
    ["g4v_sup",
        "support"],
    ["g4v_assassin",
        "assassin"]] as const) {
    cg.defineHero({
        id, name: id, role, damage: "physical", hp: 1000, atk: 50, armor: 30, mr: 30,
        passive: {
            name: "-", desc: "-"
        },
        skills: {
            Q: noSkill("Q"), E: noSkill("E"), R: noSkill("R")
        },
    })
}
const DUMMIES = ["g4v_tank",
    "g4v_fighter",
    "g4v_mark",
    "g4v_sup",
    "g4v_assassin"]

// ======================================================================
// Trợ giúp dựng tình huống
// ======================================================================
const SEED = 20261030
type Setup = { A?: Record<string, number>; B?: Record<string, number>; seed?: number };
/** Ván round 8 (mở hết đường), tướng đặt thẳng vào đường; đội bù bằng tướng giả; tay hai bên rỗng */
function mk(o: Setup = {
}): St {
    const a = Object.keys(o.A ?? {
        }), b = Object.keys(o.B ?? {
        })
    const fill = (x: string[]) => [...x,
        ...DUMMIES.filter((h) => !x.includes(h))].slice(0,
        Math.max(5,
            x.length))
    const s = cg.newGame(o.seed ?? SEED,
        fill(a),
        fill(b))
    // Dedicated skill-cost fixtures use a known shared budget of 100.
    s.teamMana = {
        A: 100, B: 100
    }
    s.round = 8
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
    s.players.A.hand = []
    s.players.B.hand = []
    s.phase = "main"; s.opened = {
        A: true, B: true
    }
    s.firstTurnDone = {
        A: true, B: true
    }
    return s
}
const gm = (s: St) => new Game(s)
const u = (s: St, side: S, hero: string) => s.units[`${side}:${hero}`]
const skill = (s: St, hero: string, side: S, k: cg.SkillKey) => gm(s).skillCard(hero,
    side,
    k)
const basic = (s: St) => gm(s).supportCard("basic")
function give(s: St, side: S, card: cg.Card) { s.players[side].hand.push(card); return card }
/** Chuỗi còn mở thì cả hai bỏ qua cho tới khi giải quyết xong */
function settle(r: { s: St; ev: Ev }): { s: St; ev: Ev } {
    let s = r.s
    const ev: Ev = [...r.ev]
    for (let i = 0; i < 20 && s.phase === "chain"; i++) {
        const o = cg.applyAction(s,
            {
                t: "pass", side: cg.whoseMove(s)
            })
        s = o.state
        ev.push(...o.events)
    }
    return {
        s, ev
    }
}
function act(s: St, a: Act): { s: St; ev: Ev } {
    const r = cg.applyAction(s,
        a)
    return {
        s: r.state, ev: r.events
    }
}
function play(s: St, side: S, card: { uid: string }, args: cg.PlayArgs = {
}) {
    return settle(act(s,
        {
            t: "play", side, uid: card.uid, args
        }))
}
/** Chốt hết bước gọi tướng úp (không gọi thêm) */
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
const end = (s: St, side: S) => {
    const r = skipBlind(act(s,
        {
            t: "end", side
        }))
    if (r.s.phase !== "summon") return r
    const d = act(r.s,
        {
            t: "draw", side: r.s.active
        })
    return {
        s: d.s, ev: [...r.ev,
            ...d.ev]
    }
}
const evs = <T extends cg.GameEvent["t"]>(ev: Ev, t: T) => ev.filter((e) => e.t === t) as Extract<cg.GameEvent, { t: T }>[]
const legalPlays = (s: St, side: S, uid: string) => cg.legalActions(s,
    side).filter((a) => a.t === "play" && a.uid === uid) as Extract<Act, { t: "play" }>[]
const hpOf = (s: St, side: S, hero: string) => u(s,
    side,
    hero).hp
const lost = (s0: St, s1: St, side: S, hero: string) => hpOf(s0,
    side,
    hero) - hpOf(s1,
    side,
    hero)
/** Mana của pháp sư */
const mana = (s: St, _hero: string) => s.teamMana.A ?? 0
/** Phí mana của chiêu (số) đọc từ định nghĩa tướng */
const burnV = (s: St, side: S, hero: string) => gm(s).statusV(u(s,
    side,
    hero),
"burn")
const charmV = (s: St, side: S, hero: string) => gm(s).statusV(u(s,
    side,
    hero),
"ahri_charm")
const near = (a: number, b: number, tol: number, msg?: string) => assert.ok(Math.abs(a - b) <= tol,
    `${msg ?? ""} ${a} không gần ${b} (±${tol})`)
/** Dùng lá chiêu `k` của `hero` (phe A) với args, trả trạng thái sau khi chuỗi giải quyết xong */
const cast = (s: St, hero: string, k: cg.SkillKey, args: cg.PlayArgs = {
}) => play(s,
    "A",
    give(s,
        "A",
        skill(s,
            hero,
            "A",
            k)),
    args).s
/** Sát thương phép lên dummy (Kháng phép 30) sau giảm: raw × 100 / 130 */
const afterMr = (raw: number) => raw * 100 / 130
const stunned = (s: St, side: S, hero: string) => gm(s).has(u(s,
    side,
    hero),
"stun")
/** Công thức tính theo chỉ số hiện tại của tướng phe A */
const fA = (s: St, hero: string, expr: string) => gm(s).f(u(s,
    "A",
    hero),
expr)

// ======================================================================
G("Brand")
// ======================================================================
test("Q (20 mana): sát thương phép + 1 Bỏng không hết; từ 3 Bỏng trở lên thì thử Choáng d = 0,9 + 0,001 AD + 0,002 AP",
    () => {
        const base = () => mk({
            A: {
                brand: 2
            }, B: {
                g4v_fighter: 2
            }
        })
        const s0 = base()
        const s = cast(s0,
            "brand",
            "Q",
            {
                target: "B:g4v_fighter"
            })
        assert.equal(mana(s,
            "brand"),
        80,
        "Q tốn 20 mana")
        assert.equal(burnV(s,
            "B",
            "g4v_fighter"),
        1)
        near(lost(s0,
            s,
            "B",
            "g4v_fighter"),
        afterMr(fA(s0,
            "brand",
            HF("brand",
                "F_Q"))),
        2,
        "sát thương Q")
        assert.ok(u(s,
            "B",
            "g4v_fighter").statuses.burn.until >= cg.FOREVER,
        "Bỏng vĩnh viễn")
        assert.ok(!stunned(s,
            "B",
            "g4v_fighter"),
        "chưa đủ 3 Bỏng thì không Choáng")
        const s1 = base()
        gm(s1).status(u(s1,
            "B",
            "g4v_fighter"),
        "burn",
        1,
        {
            v: 3, until: cg.FOREVER
        })
        const t = cast(s1,
            "brand",
            "Q",
            {
                target: "B:g4v_fighter"
            })
        assert.ok(stunned(t,
            "B",
            "g4v_fighter"),
        "đang có 3 Bỏng thì Choáng")
        assert.equal(burnV(t,
            "B",
            "g4v_fighter"),
        4)
    })
test("E (30 mana) sát thương + 1 Bỏng mọi địch; R (50 mana) sát thương rồi nhân đôi Bỏng (không trần) và cháy ngay 1 lần",
    () => {
        const s0 = mk({
            A: {
                brand: 2
            }, B: {
                g4v_fighter: 2, g4v_tank: 1
            }
        })
        const s = cast(s0,
            "brand",
            "E")
        assert.equal(mana(s,
            "brand"),
        70,
        "E tốn 30 mana")
        for (const h of ["g4v_fighter",
            "g4v_tank"]) {
            assert.equal(burnV(s,
                "B",
                h),
            1)
            near(lost(s0,
                s,
                "B",
                h),
            afterMr(fA(s0,
                "brand",
                HF("brand",
                    "F_E"))),
            2,
            "sát thương E")
        }
        const r0 = mk({
            A: {
                brand: 2
            }, B: {
                g4v_fighter: 2, g4v_tank: 1
            }
        })
        gm(r0).status(u(r0,
            "B",
            "g4v_fighter"),
        "burn",
        1,
        {
            v: 3, until: cg.FOREVER
        })
        gm(r0).status(u(r0,
            "B",
            "g4v_tank"),
        "burn",
        1,
        {
            v: 8, until: cg.FOREVER
        })
        const r = cast(r0,
            "brand",
            "R")
        assert.equal(mana(r,
            "brand"),
        50,
        "R tốn 50 mana")
        assert.equal(burnV(r,
            "B",
            "g4v_fighter"),
        6,
        "3 nhân đôi thành 6")
        assert.equal(burnV(r,
            "B",
            "g4v_tank"),
        16,
        "8 nhân đôi thành 16, không trần")
        const burnPerStack = (hero: string) => u(r0,
            "B",
            hero).maxHp * 0.01 + fA(r0,
            "brand",
            HF("brand",
                "F_TICK"))
        near(lost(r0,
            r,
            "B",
            "g4v_fighter"),
        afterMr(fA(r0,
            "brand",
            HF("brand",
                "F_R")) + 6 * burnPerStack("g4v_fighter")),
        3,
        "R: sát thương + cháy ngay 6 Bỏng")
        near(lost(r0,
            r,
            "B",
            "g4v_tank"),
        afterMr(fA(r0,
            "brand",
            HF("brand",
                "F_R")) + 16 * burnPerStack("g4v_tank")),
        3,
        "R: cháy ngay 16 Bỏng")
    })
test(`Nội tại: Standby của địch mỗi Bỏng gây (1% máu tối đa của nó + ${HF("brand",
    "F_TICK")}), đúng 1 lần mỗi Standby`,
() => {
    const mkB = () => {
        const s = mk({
            A: {
                brand: 2
            }, B: {
                g4v_fighter: 2, g4v_tank: 1
            }
        })
        gm(s).status(u(s,
            "B",
            "g4v_fighter"),
        "burn",
        1,
        {
            v: 3, until: cg.FOREVER
        })
        return s
    }
    const s0 = mkB()
    const r = end(s0,
        "A")
    const ticks = evs(r.ev,
        "damage").filter((d) => d.tag === "dot" && d.target === "B:g4v_fighter")
    assert.equal(ticks.length,
        1,
        "đúng 1 lần cháy đầu lượt B")
    near(ticks[0].amount,
        afterMr(3 * (u(s0,
            "B",
            "g4v_fighter").maxHp * 0.01 + fA(s0,
            "brand",
            HF("brand",
                "F_TICK")))),
        2,
        "3 Bỏng")
    assert.equal(evs(r.ev,
        "damage").filter((d) => d.tag === "dot" && d.target === "B:g4v_tank").length,
    0,
    "không Bỏng thì không cháy")
    const s2 = end(end(r.s,
        "B").s,
    "A").s
    assert.equal(burnV(s2,
        "B",
        "g4v_fighter"),
    3,
    "Bỏng không tự hết")
    // Brand chết vẫn cháy: kiểm ở scripts/card_tests_balance_mage.ts (cần engine phát onStandby cho chủ vắng mặt)
})

// ======================================================================
G("Lux")
// ======================================================================
test("Nội tại: mana tiêu cộng vào Bể Mana, giữ nguyên khi Lux chết; Q (0 mana) hồi mana và Khiên, không cộng Bể",
    () => {
        const s0 = mk({
            A: {
                lux: 2
            }, B: {
                g4v_fighter: 2
            }
        })
        const s1 = cast(s0,
            "lux",
            "E",
            {
                target: "B:g4v_fighter"
            })
        assert.equal(mana(s1,
            "lux"),
        70)
        assert.equal(u(s1,
            "A",
            "lux").stacks.lux_pool,
        30,
        "E tốn 30 mana vào Bể")
        s1.teamMana.A = 40
        const s2 = cast(s1,
            "lux",
            "Q")
        assert.equal(mana(s2,
            "lux"),
        40 + Math.round(Math.min(40,
            fA(s1,
                "lux",
                HF("lux",
                    "F_Q_RESTORE")))),
        "Q hồi mana bể chung round(min(40, 20 + 5% AD + 10% AP))")
        assert.equal(u(s2,
            "A",
            "lux").shield,
        Math.round(fA(s1,
            "lux",
            HF("lux",
                "F_Q_SHIELD"))),
        "Q nhận Khiên")
        assert.equal(u(s2,
            "A",
            "lux").stacks.lux_pool,
        30,
        "Q không tốn mana nên Bể không đổi")
        gm(s2).kill(u(s2,
            "A",
            "lux"))
        assert.equal(u(s2,
            "A",
            "lux").stacks.lux_pool,
        30,
        "Bể không mất khi chết")
    })
test("E (30 mana): sát thương cộng 10% Ánh Sáng; Ánh Sáng từ 150 trở lên thì thử Choáng d = 0,9 + 0,001 AD + 0,002 AP",
    () => {
        const run = (pool: number) => {
            const s0 = mk({
                A: {
                    lux: 2
                }, B: {
                    g4v_fighter: 2
                }
            })
            u(s0,
                "A",
                "lux").stacks.lux_pool = pool
            const s = cast(s0,
                "lux",
                "E",
                {
                    target: "B:g4v_fighter"
                })
            return {
                s0, s, pool: u(s,
                    "A",
                    "lux").stacks.lux_pool
            }
        }
        const lo = run(0)
        assert.equal(lo.pool,
            30)
        near(lost(lo.s0,
            lo.s,
            "B",
            "g4v_fighter"),
        afterMr(fA(lo.s0,
            "lux",
            HF("lux",
                "F_E")) + 0.1 * 30),
        2,
        "Bể 30")
        assert.ok(!stunned(lo.s,
            "B",
            "g4v_fighter"),
        "Bể thấp không Choáng")
        const hi = run(150)
        assert.equal(hi.pool,
            180)
        near(lost(hi.s0,
            hi.s,
            "B",
            "g4v_fighter"),
        afterMr(fA(hi.s0,
            "lux",
            HF("lux",
                "F_E")) + 0.1 * 180),
        2,
        "Bể 180")
        assert.ok(stunned(hi.s,
            "B",
            "g4v_fighter"),
        "Bể từ 150 thì Choáng")
    })
test(`R: cam kết mặc định 50 (không vét bể), sát thương = (${HF("lux",
    "F_R")}) + 1.8 × mana trả + 25% Ánh Sáng sau trả; dưới 20 mana không đánh được`,
() => {
    const s0 = mk({
        A: {
            lux: 2
        }, B: {
            g4v_fighter: 2
        }
    })
    s0.teamMana.A = 60
    u(s0,
        "A",
        "lux").stacks.lux_pool = 40
    const s = cast(s0,
        "lux",
        "R",
        {
            target: "B:g4v_fighter", manaSpent: 50
        })
    assert.equal(mana(s,
        "lux"),
    10,
    "trả đúng mức mặc định 50, không vét bể")
    assert.equal(u(s,
        "A",
        "lux").stacks.lux_pool,
    90,
    "50 mana vừa trả thành Ánh Sáng")
    near(lost(s0,
        s,
        "B",
        "g4v_fighter"),
    afterMr(fA(s0,
        "lux",
        HF("lux",
            "F_R")) + 50 * 1.8 + 0.25 * 90),
    2,
    "sát thương R")
    const t = mk({
        A: {
            lux: 2
        }, B: {
            g4v_fighter: 2
        }
    })
    t.teamMana.A = 10
    const r = give(t,
        "A",
        skill(t,
            "lux",
            "A",
            "R"))
    assert.equal(legalPlays(t,
        "A",
        r.uid).length,
    0,
    "dưới 20 mana không đánh được R")
})

// ======================================================================
G("Ahri")
// ======================================================================
test("E (30 mana): sát thương phép + chắc chắn +1 Say Mê, vĩnh viễn và không trần",
    () => {
        let s = mk({
            A: {
                ahri: 2
            }, B: {
                g4v_fighter: 2
            }
        })
        const s0 = s
        s = cast(s,
            "ahri",
            "E",
            {
                target: "B:g4v_fighter"
            })
        assert.equal(mana(s,
            "ahri"),
        70,
        "E tốn 30 mana")
        assert.ok(charmV(s,
            "B",
            "g4v_fighter") >= 1,
        "chắc chắn +1 Say Mê")
        near(lost(s0,
            s,
            "B",
            "g4v_fighter"),
        afterMr(fA(s0,
            "ahri",
            HF("ahri",
                "F_E"))),
        2,
        "sát thương E")
        s.teamMana.A = 200
        for (let i = 0; i < 4; i++) s = cast(s,
            "ahri",
            "E",
            {
                target: "B:g4v_fighter"
            })
        const stacks = charmV(s,
            "B",
            "g4v_fighter")
        assert.ok(stacks >= 5,
            `5 lá E: ít nhất 5 tầng, không trần (có ${stacks})`)
        assert.ok(u(s,
            "B",
            "g4v_fighter").statuses.ahri_charm.until >= cg.FOREVER,
        "Say Mê vĩnh viễn")
        s = end(end(s,
            "A").s,
        "B").s
        assert.equal(charmV(s,
            "B",
            "g4v_fighter"),
        stacks,
        "Say Mê không tự hết")
    })
test("n tầng Say Mê: địch gây sát thương ×1/(1 + 0,10n), nhận thêm 5% mỗi tầng từ Ahri (không tăng sát thương của đồng minh Ahri)",
    () => {
        const mkC = (n: number) => {
            const s = mk({
                A: {
                    ahri: 2, g4v_tank: 1
                }, B: {
                    g4v_fighter: 2
                }
            })
            if (n > 0) gm(s).status(u(s,
                "B",
                "g4v_fighter"),
            "ahri_charm",
            1,
            {
                v: n, until: cg.FOREVER
            })
            return s
        }
        // địch gây sát thương lên đồng đội Ahri
        const hit = (n: number) => {
            const s = mkC(n)
            gm(s).damage(u(s,
                "B",
                "g4v_fighter"),
            u(s,
                "A",
                "g4v_tank"),
            200,
            "true",
            {
                tag: "effect"
            })
            return hpOf(s,
                "A",
                "g4v_tank")
        }
        assert.equal(1000 - hit(0),
            200)
        assert.equal(1000 - hit(3),
            Math.round(200 / (1 + 3 * 0.1)),
            "3 tầng: sát thương ra ×1/1,3")
        // sát thương của Ahri lên địch
        const take = (n: number) => {
            const s = mkC(n)
            gm(s).damage(u(s,
                "A",
                "ahri"),
            u(s,
                "B",
                "g4v_fighter"),
            200,
            "true",
            {
                tag: "effect"
            })
            return 1000 - hpOf(s,
                "B",
                "g4v_fighter")
        }
        assert.equal(take(0),
            200)
        assert.equal(take(3),
            Math.round(200 * (1 + 3 * 0.05)),
            "3 tầng nhận thêm 15% từ Ahri")
        // sát thương của đồng minh Ahri lên địch Mê không đổi
        const s = mkC(3)
        gm(s).damage(u(s,
            "A",
            "g4v_tank"),
        u(s,
            "B",
            "g4v_fighter"),
        200,
        "true",
        {
            tag: "effect"
        })
        assert.equal(1000 - hpOf(s,
            "B",
            "g4v_fighter"),
        200,
        "chỉ sát thương từ Ahri tăng")
    })
test("Q (20 mana): 1 mục tiêu nhận sát thương phép, 1 địch ngẫu nhiên KHÁC nhận sát thương chuẩn",
    () => {
        const s0 = mk({
            A: {
                ahri: 2
            }, B: {
                g4v_fighter: 2, g4v_tank: 1, g4v_mark: 3
            }
        })
        const s = cast(s0,
            "ahri",
            "Q",
            {
                target: "B:g4v_fighter"
            })
        assert.equal(mana(s,
            "ahri"),
        80,
        "Q tốn 20 mana")
        near(lost(s0,
            s,
            "B",
            "g4v_fighter"),
        afterMr(fA(s0,
            "ahri",
            HF("ahri",
                "F_Q"))),
        2,
        "sát thương phép lên mục tiêu")
        const others = ["g4v_tank",
            "g4v_mark"].map((h) => lost(s0,
            s,
            "B",
            h))
        assert.equal(others.filter((x) => x > 0).length,
            1,
            "đúng 1 địch khác bị trúng")
        near(Math.max(...others),
            fA(s0,
                "ahri",
                HF("ahri",
                    "F_Q_TRUE")),
            1,
            "sát thương chuẩn (không giảm giáp)")
    })
test("R (50 mana): đổi chỗ với đồng minh rồi đánh kẻ đối diện chỗ mới; nội tại +1 Say Mê theo cơ hội khi chiêu trúng",
    () => {
        const s0 = mk({
            A: {
                ahri: 2, g4v_tank: 1
            }, B: {
                g4v_fighter: 1, g4v_mark: 2
            }
        })
        const s = cast(s0,
            "ahri",
            "R",
            {
                target: "A:g4v_tank"
            })
        assert.equal(mana(s,
            "ahri"),
        50,
        "R tốn 50 mana")
        assert.equal(u(s,
            "A",
            "ahri").lane,
        1)
        assert.equal(u(s,
            "A",
            "g4v_tank").lane,
        2)
        near(lost(s0,
            s,
            "B",
            "g4v_fighter"),
        afterMr(fA(s0,
            "ahri",
            HF("ahri",
                "F_R"))),
        2,
        "đánh kẻ đối diện chỗ mới")
        assert.equal(lost(s0,
            s,
            "B",
            "g4v_mark"),
        0,
        "kẻ cũ đối diện không trúng")
        // nội tại: ≈ min(100%, 18% + 5%/100 AD + 10%/100 AP)
        let hits = 0
        const N = 300
        for (let i = 0; i < N; i++) {
            const t = mk({
                A: {
                    ahri: 2
                }, B: {
                    g4v_fighter: 2, g4v_tank: 1
                }, seed: SEED + i * 7919
            })
            const q = cast(t,
                "ahri",
                "Q",
                {
                    target: "B:g4v_fighter"
                })
            if (charmV(q,
                "B",
                "g4v_fighter") > 0) hits++
        }
        const expected = 0.18 + 0.05 * 0.98
        assert.ok(hits / N > expected - 0.12 && hits / N < expected + 0.15,
            `tỉ lệ +1 Say Mê ${hits / N} lệch xa ${expected}`)
    })

// ======================================================================
G("Annie")
// ======================================================================
test("Mỗi chiêu +1 Lửa; đủ 4 Lửa thì Q kế tiếp tiêu 4 Lửa, thử Choáng đúng mục tiêu trước sát thương, không nạp lại",
    () => {
        let s = mk({
            A: {
                annie: 2
            }, B: {
                g4v_fighter: 2, g4v_tank: 1
            }
        })
        const q = (st: St) => cast(st,
            "annie",
            "Q",
            {
                target: "B:g4v_fighter"
            })
        for (let i = 1; i <= 4; i++) {
            s = q(s)
            assert.equal(u(s,
                "A",
                "annie").stacks.fire,
            i,
            `sau ${i} chiêu`)
            assert.ok(!stunned(s,
                "B",
                "g4v_fighter"),
            "chưa đủ Lửa thì không Choáng")
        }
        assert.equal(mana(s,
            "annie"),
        20,
        "4 lá Q × 20 mana")
        s = q(s)
        assert.ok(stunned(s,
            "B",
            "g4v_fighter"),
        "chiêu thứ 5 Choáng mục tiêu")
        assert.ok(!stunned(s,
            "B",
            "g4v_tank"),
        "chỉ đúng mục tiêu")
        assert.equal(u(s,
            "A",
            "annie").stacks.fire,
        0,
        "Lửa về 0")
        const d = mk({
            A: {
                annie: 2
            }, B: {
                g4v_fighter: 2
            }
        })
        u(d,
            "A",
            "annie").stacks.fire = 3
        gm(d).kill(u(d,
            "A",
            "annie"))
        assert.equal(u(d,
            "A",
            "annie").stacks.fire,
        0,
        "Annie chết thì Lửa về 0")
    })
test("Q (20 mana) và R (50 mana) gây thêm 50% lên địch đang Choáng; R chưa đầy Lửa thử Choáng sau sát thương",
    () => {
        const mkA = () => mk({
            A: {
                annie: 2
            }, B: {
                g4v_fighter: 2, g4v_tank: 1
            }
        })
        const plain = mkA()
        const qPlain = cast(plain,
            "annie",
            "Q",
            {
                target: "B:g4v_fighter"
            })
        const stun0 = mkA()
        gm(stun0).status(u(stun0,
            "B",
            "g4v_fighter"),
        "stun",
        1)
        const qStun = cast(stun0,
            "annie",
            "Q",
            {
                target: "B:g4v_fighter"
            })
        near(lost(stun0,
            qStun,
            "B",
            "g4v_fighter"),
        lost(plain,
            qPlain,
            "B",
            "g4v_fighter") * 1.5,
        2,
        "Q ×1.5 lên địch Choáng")
        near(lost(plain,
            qPlain,
            "B",
            "g4v_fighter"),
        afterMr(fA(plain,
            "annie",
            HF("annie",
                "F_Q"))),
        2,
        "Q thường")
        assert.equal(mana(qPlain,
            "annie"),
        80)
        const r0 = mkA()
        gm(r0).status(u(r0,
            "B",
            "g4v_fighter"),
        "stun",
        1)
        const r = cast(r0,
            "annie",
            "R")
        assert.equal(mana(r,
            "annie"),
        50,
        "R tốn 50 mana")
        near(lost(r0,
            r,
            "B",
            "g4v_fighter"),
        afterMr(fA(r0,
            "annie",
            HF("annie",
                "F_R"))) * 1.5,
        3,
        "R ×1.5 lên địch đã Choáng")
        near(lost(r0,
            r,
            "B",
            "g4v_tank"),
        afterMr(fA(r0,
            "annie",
            HF("annie",
                "F_R"))),
        3,
        "R thường lên địch chưa Choáng")
        assert.ok(stunned(r,
            "B",
            "g4v_tank"),
        "địch chưa Choáng thì bị R Choáng")
    })
test("E (25 mana, Quick): Khiên; đáp lại đòn nhắm Annie khi đủ 4 Lửa thì Vô Hiệu đòn, thử Choáng kẻ đánh và trả sát thương",
    () => {
        const mkE = (fire: number) => {
            const s = mk({
                A: {
                    annie: 2
                }, B: {
                    g4v_fighter: 2
                }
            })
            u(s,
                "A",
                "annie").stacks.fire = fire
            give(s,
                "A",
                skill(s,
                    "annie",
                    "A",
                    "E"))
            give(s,
                "B",
                basic(s))
            return s
        }
        const react = (fire: number) => {
            const s = mkE(fire)
            const hp0 = hpOf(s,
                "A",
                "annie")
            let t = end(s,
                "A").s
            const b = t.players.B.hand[0]
            t = act(t,
                {
                    t: "play", side: "B", uid: b.uid, args: {
                        actor: "B:g4v_fighter", target: "A:annie"
                    }
                }).s
            assert.equal(t.phase,
                "chain")
            const resp = cg.legalActions(t,
                "A").filter((a) => a.t === "chain" && t.players.A.hand.find((c) => c.uid === a.uid)?.id === "annie_e")
            assert.ok(resp.length > 0,
                "E nối chuỗi được")
            return {
                s: settle(act(t,
                    resp[0])).s, hp0, t
            }
        }
        const trap = react(4)
        assert.equal(mana(trap.s,
            "annie"),
        75,
        "E tốn 25 mana")
        assert.equal(hpOf(trap.s,
            "A",
            "annie"),
        trap.hp0,
        "đòn bị huỷ")
        assert.ok(u(trap.s,
            "A",
            "annie").shield > 0,
        "Annie có Khiên")
        assert.ok(stunned(trap.s,
            "B",
            "g4v_fighter"),
        "kẻ đánh bị Choáng")
        assert.equal(u(trap.s,
            "A",
            "annie").stacks.fire,
        0,
        "Lửa về 0")
        near(1000 - hpOf(trap.s,
            "B",
            "g4v_fighter"),
        afterMr(fA(trap.t,
            "annie",
            HF("annie",
                "F_E_TRAP"))) * 1.5,
        3,
        "trả {84 + 10% AD + 60% AP} ×1.5 vì đã Choáng")
        const calm = react(2)
        assert.ok(!stunned(calm.s,
            "B",
            "g4v_fighter"),
        "chưa đủ Lửa thì chỉ Khiên")
        assert.equal(1000 - hpOf(calm.s,
            "B",
            "g4v_fighter"),
        0,
        "không sát thương")
        assert.equal(u(calm.s,
            "A",
            "annie").shield > 0,
        true)
        assert.equal(u(calm.s,
            "A",
            "annie").stacks.fire,
        3,
        "E thường +1 Lửa")
    })

// ======================================================================
G("Lissandra")
// ======================================================================
const handB = (s: St, n: number) => Array.from({
    length: n
},
() => give(s,
    "B",
    basic(s)))
test("Nội tại: đòn thật/lá chiêu của Lissandra có cơ hội Hoá Băng 1 lá ngẫu nhiên trên tay đối thủ (≈ 18% + 5%/100 AD + 10%/100 AP)",
    () => {
        let hits = 0
        const N = 300
        for (let i = 0; i < N; i++) {
            const s0 = mk({
                A: {
                    lissandra: 2
                }, B: {
                    g4v_fighter: 2
                }, seed: SEED + i * 104729
            })
            handB(s0,
                4)
            const s = cast(s0,
                "lissandra",
                "Q",
                {
                    target: "B:g4v_fighter"
                })
            const n = s.players.B.hand.filter((c) => c.frozen === "A:lissandra").length
            assert.ok(n <= 1,
                "tối đa 1 lá mỗi lần trúng")
            hits += n
        }
        const expected = 0.18 + 0.05 * 0.94
        assert.ok(hits / N > expected - 0.12 && hits / N < expected + 0.15,
            `tỉ lệ Hoá Băng ${hits / N} lệch xa ${expected}`)
        const s1 = mk({
            A: {
                lissandra: 2
            }, B: {
                g4v_fighter: 2
            }
        })
        const q = cast(s1,
            "lissandra",
            "Q",
            {
                target: "B:g4v_fighter"
            })
        assert.equal(mana(q,
            "lissandra"),
        80,
        "Q tốn 20 mana")
        near(lost(s1,
            q,
            "B",
            "g4v_fighter"),
        afterMr(fA(s1,
            "lissandra",
            HF("lissandra",
                "F_Q"))),
        2,
        "sát thương Q")
        // băng tan khi Lissandra rời sân
        const t = mk({
            A: {
                lissandra: 2
            }, B: {
                g4v_fighter: 2
            }
        })
        const cs = handB(t,
            3)
        gm(t).freezeCard("B",
            cs[0],
            "A:lissandra")
        gm(t).kill(u(t,
            "A",
            "lissandra"))
        assert.equal(t.players.B.hand.filter((c) => c.frozen).length,
            0,
            "Lissandra bị hạ thì băng tan")
    })
test("E (30 mana): sát thương phép; thử Choáng chỉ khi tay đối thủ có lá chiêu Hoá Băng của chính tướng bị đánh",
    () => {
        const run = (freezeSkill: boolean) => {
            const s = mk({
                A: {
                    lissandra: 2
                }, B: {
                    brand: 2
                }
            })
            const sk = give(s,
                "B",
                skill(s,
                    "brand",
                    "B",
                    "Q"))
            const other = give(s,
                "B",
                basic(s))
            gm(s).freezeCard("B",
                freezeSkill ? sk : other,
                "A:lissandra")
            return {
                s, after: cast(s,
                    "lissandra",
                    "E",
                    {
                        target: "B:brand"
                    })
            }
        }
        const yes = run(true)
        assert.equal(mana(yes.after,
            "lissandra"),
        70,
        "E tốn 30 mana")
        assert.ok(stunned(yes.after,
            "B",
            "brand"),
        "lá chiêu Brand bị băng thì Brand bị Choáng")
        const no = run(false)
        assert.ok(!stunned(no.after,
            "B",
            "brand"),
        "lá băng không phải chiêu của Brand thì không Choáng")
        assert.ok(lost(no.s,
            no.after,
            "B",
            "brand") > 0,
        "vẫn gây sát thương")
        near(lost(no.s,
            no.after,
            "B",
            "brand"),
        fA(no.s,
            "lissandra",
            HF("lissandra",
                "F_E")) * 100 / (100 + cg.getHero("brand")!.mr),
        3,
        "sát thương E")
    })
test("R chủ động (50 mana): mọi địch nhận sát thương mỗi lá băng; Lissandra miễn sát thương, không bị chọn, không hành động tới hết lượt",
    () => {
        const s = mk({
            A: {
                lissandra: 2
            }, B: {
                g4v_fighter: 2
            }
        })
        const r = give(s,
            "A",
            skill(s,
                "lissandra",
                "A",
                "R"))
        const cs = handB(s,
            3)
        gm(s).freezeCard("B",
            cs[1],
            "A:lissandra")
        gm(s).freezeCard("B",
            cs[2],
            "A:lissandra")
        const hp0 = hpOf(s,
            "A",
            "lissandra")
        const own = cg.legalActions(s,
            "A").find((a) => a.t === "play" && a.uid === r.uid)
        assert.ok(own,
            "R vẫn dùng được trong lượt mình")
        const mid = act(s,
            own).s
        const liss = u(mid,
            "A",
            "lissandra")
        assert.ok(gm(mid).has(liss,
            "stasis") && !gm(mid).canAct(liss) && !gm(mid).targetable(liss),
        "tự đóng băng")
        assert.equal(cg.getHero("lissandra")!.skills.R.quick,
            undefined,
            "không có điều kiện phản ứng thì R chỉ đánh chủ động")
        const t = end(mid,
            "A").s
        assert.ok(!cg.legalActions(t,
            "B").some((a) => a.t === "play" && a.uid === cs[0].uid && a.args?.target === liss.id),
        "không được chọn Lissandra đang tự đóng băng làm mục tiêu")
        const after = t
        gm(after).damage(u(after,
            "B",
            "g4v_fighter"),
        u(after,
            "A",
            "lissandra"),
        100,
        "physical",
        {
            tag: "attack"
        })
        assert.equal(hpOf(after,
            "A",
            "lissandra"),
        hp0,
        "đòn đánh không gây sát thương")
        assert.equal(mana(after,
            "lissandra"),
        50)
        const per = fA(t,
            "lissandra",
            HF("lissandra",
                "F_R_CARD"))
        near(1000 - hpOf(after,
            "B",
            "g4v_fighter"),
        afterMr(per * 2),
        2,
        "2 lá băng")
    })

// ======================================================================
G("Twisted Fate")
// ======================================================================
test("Nội tại: đòn đánh của TF gây thêm sát thương phép theo số lá trên tay",
    () => {
        const hit = (extra: number) => {
            const s = mk({
                A: {
                    twistedfate: 2
                }, B: {
                    g4v_fighter: 2
                }
            })
            for (let i = 0; i < extra; i++) give(s,
                "A",
                basic(s))
            const b = give(s,
                "A",
                basic(s))
            const hp0 = hpOf(s,
                "B",
                "g4v_fighter")
            const r = play(s,
                "A",
                b,
                {
                    actor: "A:twistedfate", target: "B:g4v_fighter"
                }).s
            return {
                dmg: hp0 - hpOf(r,
                    "B",
                    "g4v_fighter"), s
            }
        }
        const a = hit(0), b = hit(4)
        const per = fA(a.s,
            "twistedfate",
            HF("twistedfate",
                "F_PASSIVE"))
        near(b.dmg - a.dmg,
            afterMr(4 * per),
            2,
            "4 lá nữa trên tay")
    })
test("Q (20 mana): sát thương phép; Xanh hồi 30 mana bể chung, Đỏ Rã Giáp tới hết lượt, Vàng thử Choáng d = 0,9 + 0,001 AD + 0,002 AP",
    () => {
        const run = (color: "blue" | "red" | "gold") => {
            const s = mk({
                A: {
                    twistedfate: 2
                }, B: {
                    g4v_fighter: 2
                }
            })
            s.teamMana.A = 50
            return {
                s, after: cast(s,
                    "twistedfate",
                    "Q",
                    {
                        target: "B:g4v_fighter", color
                    })
            }
        }
        const blue = run("blue")
        assert.equal(mana(blue.after,
            "twistedfate"),
        50 - 20 + 30,
        "Xanh hồi 30 mana")
        near(lost(blue.s,
            blue.after,
            "B",
            "g4v_fighter"),
        afterMr(fA(blue.s,
            "twistedfate",
            HF("twistedfate",
                "F_Q"))),
        2,
        "sát thương Q")
        assert.ok(!stunned(blue.after,
            "B",
            "g4v_fighter"))
        const red = run("red")
        assert.equal(mana(red.after,
            "twistedfate"),
        30)
        assert.ok(gm(red.after).has(u(red.after,
            "B",
            "g4v_fighter"),
        "shred"),
        "Đỏ Rã Giáp")
        const gold = run("gold")
        assert.ok(stunned(gold.after,
            "B",
            "g4v_fighter"),
        "Vàng Choáng")
    })
test("E (20 mana): xem 3 lá trên cùng, 1 lá xuống đáy, rút 2 lá còn lại",
    () => {
        let s = mk({
            A: {
                twistedfate: 2
            }, B: {
                g4v_fighter: 2
            }
        })
        const g = gm(s)
        const c1 = g.supportCard("basic"), c2 = g.supportCard("draw"), c3 = g.supportCard("potion")
        s.players.A.deck = [c1,
            c2,
            c3,
            ...s.players.A.deck]
        const deckLen = s.players.A.deck.length
        const e = give(s,
            "A",
            skill(s,
                "twistedfate",
                "A",
                "E"))
        assert.equal(legalPlays(s,
            "A",
            e.uid).length,
        3,
        "3 lựa chọn lá xuống đáy")
        s = play(s,
            "A",
            e,
            {
                pick: c2.uid
            }).s
        assert.equal(mana(s,
            "twistedfate"),
        80,
        "E tốn 20 mana")
        const hand = s.players.A.hand.map((c) => c.uid)
        assert.ok(hand.includes(c1.uid) && hand.includes(c3.uid),
            "lấy 2 lá còn lại")
        assert.ok(!hand.includes(c2.uid))
        assert.equal(s.players.A.deck.length,
            deckLen - 2)
        assert.equal(s.players.A.deck[s.players.A.deck.length - 1].uid,
            c2.uid,
            "lá chọn nằm đáy bộ")
    })
test(`R (50 mana): bỏ cả gói tay vào mộ, mỗi lá (tối đa 7 đạn) gây (${HF("twistedfate",
    "F_R_CARD")}) lên mọi địch`,
() => {
    const run = (cards: number) => {
        const s = mk({
            A: {
                twistedfate: 2
            }, B: {
                g4v_fighter: 2, g4v_tank: 1
            }
        })
        for (let i = 0; i < cards; i++) give(s,
            "A",
            basic(s))
        return {
            s, after: cast(s,
                "twistedfate",
                "R")
        }
    }
    const few = run(3)
    assert.equal(mana(few.after,
        "twistedfate"),
    50,
    "R tốn 50 mana")
    assert.equal(few.after.players.A.hand.length,
        0,
        "bỏ cả tay")
    const per = fA(few.s,
        "twistedfate",
        HF("twistedfate",
            "F_R_CARD"))
    for (const h of ["g4v_fighter",
        "g4v_tank"]) near(lost(few.s,
        few.after,
        "B",
        h),
    afterMr(per * 3),
    3,
    `3 lá lên ${h}`)
    const many = run(9)
    assert.equal(many.after.players.A.hand.length,
        0)
    near(lost(many.s,
        many.after,
        "B",
        "g4v_fighter"),
    afterMr(per * 7),
    5,
    "9 lá nhưng chỉ tính 7")
})

// ======================================================================
G("Tổng hợp")
// ======================================================================
test("Chi phí mana bể chung theo tuning v1 (Lux Q = 0, Lux R cam kết mặc định 50) và AP gốc = 0",
    () => {
        for (const id of ["brand",
            "lux",
            "ahri",
            "annie",
            "lissandra",
            "twistedfate"]) {
            const h = cg.getHero(id)!
            assert.equal(h.role,
                "mage")
            for (const k of ["Q",
                "E",
                "R"] as const) assert.ok(h.skills[k].mana !== undefined,
                `${id} ${k} thiếu mana`)
        }
        const costs = (id: string) => (["Q",
            "E",
            "R"] as const).map((k) => cg.getHero(id)!.skills[k].mana)
        assert.deepEqual(costs("brand"),
            [20,
                30,
                50])
        assert.deepEqual(costs("lux").slice(0,
            2),
        [0,
            30])
        assert.equal(typeof costs("lux")[2],
            "function",
            "Lux R: phí là mức cam kết")
        assert.deepEqual(costs("ahri"),
            [20,
                30,
                50])
        assert.deepEqual(costs("annie"),
            [20,
                25,
                50])
        assert.deepEqual(costs("lissandra"),
            [20,
                30,
                50])
        assert.deepEqual(costs("twistedfate"),
            [20,
                20,
                50])
        const s = mk({
            A: {
                brand: 1, lux: 2, ahri: 3, annie: 0, lissandra: 4
            }
        })
        const apOf = (h: string) => gm(s).ap(u(s,
            "A",
            h))
        assert.deepEqual([apOf("brand"),
            apOf("lux"),
            apOf("ahri"),
            apOf("annie"),
            apOf("lissandra")],
        ["brand",
            "lux",
            "ahri",
            "annie",
            "lissandra"].map(() => 0),
        "AP gốc = 0 (luật chủ)")
        assert.deepEqual(["brand",
            "lux",
            "ahri",
            "annie",
            "lissandra",
            "twistedfate"].map((h) => cg.getHero(h)!.atk),
        [70,
            69,
            70,
            69,
            69,
            69],
        "AD gốc V3")
    })
test("Bot đánh trọn ván có 3 pháp sư mỗi bên mà không lỗi",
    () => {
        const mages = ["brand",
            "lux",
            "ahri",
            "annie",
            "lissandra",
            "twistedfate"]
        for (let k = 0; k < 3; k++) {
            const A = [mages[k],
                mages[(k + 1) % 6],
                mages[(k + 2) % 6],
                "g4v_tank",
                "g4v_sup"]
            const B = [mages[(k + 3) % 6],
                mages[(k + 4) % 6],
                mages[(k + 5) % 6],
                "g4v_fighter",
                "g4v_mark"]
            let s = cg.newGame(SEED + k,
                A,
                B)
            for (let i = 0; i < 600 && s.phase !== "over"; i++) {
                const side = cg.actorsOf(s)[0]
                s = cg.applyAction(s,
                    cg.chooseAction(s,
                        side)).state
            }
        }
    })

// ======================================================================
// Bảng kết quả
// ======================================================================
const pad = (x: string, n: number) => (x.length >= n ? x : x + " ".repeat(n - x.length))
let lastGroup = ""
for (const r of results) {
    if (r.group !== lastGroup) {
        console.log(`\n== ${r.group} ==`)
        lastGroup = r.group
    }
    console.log(`${r.res}  ${pad(r.name,
        100)}${r.note ? `\n        -> ${r.note}` : ""}`)
}
const c = (k: string) => results.filter((r) => r.res === k).length
console.log(`\nTỔNG: ${results.length} test | PASS ${c("PASS")} | FAIL ${c("FAIL")}`)
process.exit(c("FAIL") ? 1 : 0)
