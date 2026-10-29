// Test cơ chế V2 của 6 pháp sư nhóm G4V: Brand, Lux, Ahri, Annie, Lissandra, Twisted Fate.
// Chạy: npx tsx scripts/card_tests_heroes_g4v.ts [--only=chuỗi] [--verbose]. Khung test chép từ scripts/card_tests.ts.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"

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
const mana = (s: St, hero: string) => u(s,
    "A",
    hero).mana ?? 0
const burnV = (s: St, side: S, hero: string) => gm(s).statusV(u(s,
    side,
    hero),
"burn")
const charmV = (s: St, side: S, hero: string) => gm(s).statusV(u(s,
    side,
    hero),
"disarm")
const near = (a: number, b: number, tol: number, msg?: string) => assert.ok(Math.abs(a - b) <= tol,
    `${msg ?? ""} ${a} không gần ${b} (±${tol})`)

// ======================================================================
G("Brand")
// ======================================================================
test("Q tốn 10 mana, gây sát thương và +1 Bỏng không bao giờ hết",
    () => {
        const s0 = mk({
            A: {
                brand: 2
            }, B: {
                g4v_fighter: 2
            }
        })
        const q = give(s0,
            "A",
            skill(s0,
                "brand",
                "A",
                "Q"))
        const s = play(s0,
            "A",
            q,
            {
                target: "B:g4v_fighter"
            }).s
        assert.equal(mana(s,
            "brand"),
        90,
        "Q tốn 10 mana")
        assert.equal(burnV(s,
            "B",
            "g4v_fighter"),
        1)
        assert.ok(lost(s0,
            s,
            "B",
            "g4v_fighter") > 0,
        "Q gây sát thương")
        assert.ok(gm(s).has(u(s,
            "B",
            "g4v_fighter"),
        "burn") && u(s,
            "B",
            "g4v_fighter").statuses.burn.until >= cg.FOREVER,
        "Bỏng vĩnh viễn")
    })
test("E (20 mana) +1 Bỏng mọi địch; R (50 mana) nhân đôi, có trần 12",
    () => {
        let s = mk({
            A: {
                brand: 2
            }, B: {
                g4v_fighter: 2, g4v_tank: 1, g4v_mark: 3
            }
        })
        const e = give(s,
            "A",
            skill(s,
                "brand",
                "A",
                "E"))
        s = play(s,
            "A",
            e).s
        assert.equal(mana(s,
            "brand"),
        80)
        for (const h of ["g4v_fighter",
            "g4v_tank",
            "g4v_mark"]) assert.equal(burnV(s,
            "B",
            h),
        1,
        h)
        gm(s).status(u(s,
            "B",
            "g4v_tank"),
        "burn",
        1,
        {
            v: 8, until: cg.FOREVER
        })
        const r = give(s,
            "A",
            skill(s,
                "brand",
                "A",
                "R"))
        s = play(s,
            "A",
            r).s
        assert.equal(mana(s,
            "brand"),
        30)
        assert.equal(burnV(s,
            "B",
            "g4v_fighter"),
        2,
        "1 -> 2")
        assert.equal(burnV(s,
            "B",
            "g4v_tank"),
        12,
        "8 x2 bị chặn ở trần 12")
    })
test("Đầu lượt đối thủ: mỗi địch mất máu theo số Bỏng; Bỏng không hết qua nhiều lượt",
    () => {
        let s = mk({
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
        const r = end(s,
            "A")
        s = r.s
        const ticks = evs(r.ev,
            "damage").filter((d) => d.tag === "dot" && d.target === "B:g4v_fighter")
        assert.equal(ticks.length,
            1,
            "đúng 1 lần cháy đầu lượt B")
        assert.equal(gm(s).statusV(u(s,
            "B",
            "g4v_tank"),
        "burn"),
        0)
        const per = evs(end(mk({
            A: {
                brand: 2
            }, B: {
                g4v_fighter: 2
            }
        }),
        "A").ev,
        "damage").filter((d) => d.tag === "dot").length
        assert.equal(per,
            0,
            "không Bỏng thì không cháy")
        // qua thêm 2 vòng vẫn còn Bỏng
        s = end(end(s,
            "B").s,
        "A").s
        assert.equal(burnV(s,
            "B",
            "g4v_fighter"),
        3,
        "Bỏng không tự hết")
    })
test("Bỏng chỉ cháy khi Brand còn trên sân (Brand chết thì ngừng)",
    () => {
        let s = mk({
            A: {
                brand: 2
            }, B: {
                g4v_fighter: 2
            }
        })
        gm(s).status(u(s,
            "B",
            "g4v_fighter"),
        "burn",
        1,
        {
            v: 4, until: cg.FOREVER
        })
        gm(s).kill(u(s,
            "A",
            "brand"))
        const r = end(s,
            "A")
        s = r.s
        assert.equal(evs(r.ev,
            "damage").filter((d) => d.tag === "dot" && d.target === "B:g4v_fighter").length,
        0)
    })

// ======================================================================
G("Lux")
// ======================================================================
test("Nội tại: AP cộng thêm theo mana đang có",
    () => {
        const s = mk({
            A: {
                lux: 2
            }
        })
        const g = gm(s)
        const lux = u(s,
            "A",
            "lux")
        lux.mana = 100
        const full = g.ap(lux)
        lux.mana = 40
        const mid = g.ap(lux)
        lux.mana = 0
        const none = g.ap(lux)
        assert.ok(full > mid && mid > none,
            `${full} ${mid} ${none}`)
        assert.equal(none,
            0)
        assert.equal(full,
            70)
    })
test("Q tốn 0 mana, hồi 40 mana (kẹp theo tối đa)",
    () => {
        let s = mk({
            A: {
                lux: 2
            }
        })
        u(s,
            "A",
            "lux").mana = 30
        const q = give(s,
            "A",
            skill(s,
                "lux",
                "A",
                "Q"))
        s = play(s,
            "A",
            q).s
        assert.equal(mana(s,
            "lux"),
        70)
        u(s,
            "A",
            "lux").mana = 80
        const q2 = give(s,
            "A",
            skill(s,
                "lux",
                "A",
                "Q"))
        s = play(s,
            "A",
            q2).s
        assert.equal(mana(s,
            "lux"),
        100,
        "kẹp ở 100")
    })
test("E tốn 30 mana; sát thương tăng theo mana Lux đang có",
    () => {
        const dmg = (m: number) => {
            const s0 = mk({
                A: {
                    lux: 2
                }, B: {
                    g4v_fighter: 2
                }
            })
            u(s0,
                "A",
                "lux").mana = m
            const e = give(s0,
                "A",
                skill(s0,
                    "lux",
                    "A",
                    "E"))
            const s = play(s0,
                "A",
                e,
                {
                    target: "B:g4v_fighter"
                }).s
            assert.equal(mana(s,
                "lux"),
            m - 30)
            return lost(s0,
                s,
                "B",
                "g4v_fighter")
        }
        const hi = dmg(100), lo = dmg(40)
        assert.ok(hi > lo,
            `${hi} > ${lo}`)
        // E không đánh được khi dưới 30 mana
        const s1 = mk({
            A: {
                lux: 2
            }, B: {
                g4v_fighter: 2
            }
        })
        u(s1,
            "A",
            "lux").mana = 20
        const e1 = give(s1,
            "A",
            skill(s1,
                "lux",
                "A",
                "E"))
        assert.equal(legalPlays(s1,
            "A",
            e1.uid).length,
        0)
    })
test("R tiêu toàn bộ mana, sát thương theo mana đã tiêu; dưới 20 mana không đánh được",
    () => {
        const run = (m: number) => {
            const s0 = mk({
                A: {
                    lux: 2
                }, B: {
                    g4v_fighter: 2
                }
            })
            u(s0,
                "A",
                "lux").mana = m
            const r = give(s0,
                "A",
                skill(s0,
                    "lux",
                    "A",
                    "R"))
            if (m < 20) {
                assert.equal(legalPlays(s0,
                    "A",
                    r.uid).length,
                0)
                return 0
            }
            const s = play(s0,
                "A",
                r,
                {
                    target: "B:g4v_fighter"
                }).s
            assert.equal(mana(s,
                "lux"),
            0,
            "hết mana")
            assert.equal(gm(s).ap(u(s,
                "A",
                "lux")),
            0,
            "Lux tụt yếu (AP về 0)")
            return lost(s0,
                s,
                "B",
                "g4v_fighter")
        }
        const full = run(100), half = run(50)
        run(10)
        assert.ok(full > 0 && half > 0)
        near(full / half,
            2,
            0.1,
            "R tỉ lệ theo mana")
    })

// ======================================================================
G("Ahri")
// ======================================================================
test("Q tốn 20 mana, +2 Say Mê; tướng Say Mê không đánh được, hết 1 stack mỗi cuối lượt của nó",
    () => {
        let s = mk({
            A: {
                ahri: 2
            }, B: {
                g4v_mark: 2, g4v_tank: 1
            }
        })
        const q = give(s,
            "A",
            skill(s,
                "ahri",
                "A",
                "Q"))
        s = play(s,
            "A",
            q,
            {
                target: "B:g4v_mark"
            }).s
        assert.equal(mana(s,
            "ahri"),
        80)
        assert.equal(charmV(s,
            "B",
            "g4v_mark"),
        2)
        assert.ok(!gm(s).canAttack(u(s,
            "B",
            "g4v_mark")))
        assert.ok(gm(s).canAttack(u(s,
            "B",
            "g4v_tank")))
        // lượt B: có lá Đánh thường vẫn không có đòn nào từ tướng Say Mê
        s = end(s,
            "A").s
        give(s,
            "B",
            basic(s))
        const atk = cg.legalActions(s,
            "B").filter((a) => a.t === "attack" || (a.t === "play" && "actor" in (a.args ?? {
        }) && a.args?.actor === "B:g4v_mark"))
        assert.equal(atk.length,
            0,
            "tướng Say Mê không đánh được")
        s = end(s,
            "B").s
        assert.equal(charmV(s,
            "B",
            "g4v_mark"),
        1,
        "mất 1 Say Mê cuối lượt của nó")
        s = end(end(s,
            "A").s,
        "B").s
        assert.equal(charmV(s,
            "B",
            "g4v_mark"),
        0,
        "hết Say Mê")
        assert.ok(gm(s).canAttack(u(s,
            "B",
            "g4v_mark")))
    })
test("E (25 mana): mỗi Say Mê trên mục tiêu +50% sát thương, không tiêu Say Mê",
    () => {
        const dmg = (charm: number) => {
            const s0 = mk({
                A: {
                    ahri: 2
                }, B: {
                    g4v_fighter: 2
                }
            })
            if (charm) {
                gm(s0).status(u(s0,
                    "B",
                    "g4v_fighter"),
                "disarm",
                1,
                {
                    v: charm, until: cg.FOREVER, decay: 1
                })
            }
            const e = give(s0,
                "A",
                skill(s0,
                    "ahri",
                    "A",
                    "E"))
            const s = play(s0,
                "A",
                e,
                {
                    target: "B:g4v_fighter"
                }).s
            assert.equal(mana(s,
                "ahri"),
            75)
            assert.equal(charmV(s,
                "B",
                "g4v_fighter"),
            charm,
            "không tiêu Say Mê")
            return lost(s0,
                s,
                "B",
                "g4v_fighter")
        }
        const d0 = dmg(0), d2 = dmg(2)
        near(d2 / d0,
            2,
            0.1,
            "2 Say Mê = x2")
    })
test("R (50 mana) mọi địch +2 Say Mê, trần 5",
    () => {
        let s = mk({
            A: {
                ahri: 2
            }, B: {
                g4v_fighter: 2, g4v_tank: 1
            }
        })
        gm(s).status(u(s,
            "B",
            "g4v_tank"),
        "disarm",
        1,
        {
            v: 4, until: cg.FOREVER, decay: 1
        })
        const r = give(s,
            "A",
            skill(s,
                "ahri",
                "A",
                "R"))
        s = play(s,
            "A",
            r).s
        assert.equal(mana(s,
            "ahri"),
        50)
        assert.equal(charmV(s,
            "B",
            "g4v_fighter"),
        2)
        assert.equal(charmV(s,
            "B",
            "g4v_tank"),
        5,
        "4 + 2 bị chặn ở trần 5")
    })

// ======================================================================
G("Annie")
// ======================================================================
test("Q (10 mana) gây sát thương +1 Lửa; E (20 mana) +2 Lửa",
    () => {
        let s = mk({
            A: {
                annie: 2
            }, B: {
                g4v_fighter: 2
            }
        })
        const q = give(s,
            "A",
            skill(s,
                "annie",
                "A",
                "Q"))
        const s0 = s
        s = play(s,
            "A",
            q,
            {
                target: "B:g4v_fighter"
            }).s
        assert.equal(mana(s,
            "annie"),
        90)
        assert.equal(u(s,
            "A",
            "annie").stacks.fire,
        1)
        assert.ok(lost(s0,
            s,
            "B",
            "g4v_fighter") > 0)
        const e = give(s,
            "A",
            skill(s,
                "annie",
                "A",
                "E"))
        s = play(s,
            "A",
            e).s
        assert.equal(mana(s,
            "annie"),
        70)
        assert.equal(u(s,
            "A",
            "annie").stacks.fire,
        3)
    })
test("Đủ 5 Lửa: Tibbers vồ mọi địch rồi biến mất, Lửa về 0, không chiếm đường",
    () => {
        let s = mk({
            A: {
                annie: 2
            }, B: {
                g4v_fighter: 2, g4v_tank: 1, g4v_mark: 3
            }
        })
        u(s,
            "A",
            "annie").stacks.fire = 4
        const lanesBefore = JSON.stringify(s.lanes)
        const unitsBefore = Object.keys(s.units).length
        const e = give(s,
            "A",
            skill(s,
                "annie",
                "A",
                "E"))
        const s0 = s
        s = play(s,
            "A",
            e).s
        assert.equal(u(s,
            "A",
            "annie").stacks.fire,
        0,
        "Lửa về 0")
        for (const h of ["g4v_fighter",
            "g4v_tank",
            "g4v_mark"]) assert.ok(lost(s0,
            s,
            "B",
            h) > 0,
        `${h} trúng Tibbers`)
        assert.equal(JSON.stringify(s.lanes),
            lanesBefore,
            "đường không đổi")
        assert.equal(Object.keys(s.units).length,
            unitsBefore,
            "không có đơn vị mới")
        assert.equal(gm(s).tokenOf("A"),
            undefined)
    })
test("R (40 mana): sát thương x(1 + Lửa) lên mọi địch, Lửa về 0",
    () => {
        const run = (fire: number) => {
            const s0 = mk({
                A: {
                    annie: 2
                }, B: {
                    g4v_fighter: 2, g4v_tank: 1
                }
            })
            u(s0,
                "A",
                "annie").stacks.fire = fire
            const r = give(s0,
                "A",
                skill(s0,
                    "annie",
                    "A",
                    "R"))
            const s = play(s0,
                "A",
                r).s
            assert.equal(mana(s,
                "annie"),
            60)
            assert.equal(u(s,
                "A",
                "annie").stacks.fire,
            0)
            assert.ok(lost(s0,
                s,
                "B",
                "g4v_tank") > 0,
            "trúng mọi địch")
            return lost(s0,
                s,
                "B",
                "g4v_fighter")
        }
        const d0 = run(0), d4 = run(4)
        near(d4 / d0,
            5,
            0.2,
            "Lửa 4 = gấp 5")
    })
test("Annie chết: Lửa về 0",
    () => {
        const s = mk({
            A: {
                annie: 2
            }, B: {
                g4v_fighter: 2
            }
        })
        u(s,
            "A",
            "annie").stacks.fire = 3
        gm(s).kill(u(s,
            "A",
            "annie"))
        assert.equal(u(s,
            "A",
            "annie").stacks.fire,
        0)
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
test("Q là Quick, tốn 20 mana, Hoá Băng 2 lá ngẫu nhiên trên tay đối thủ; lá băng không đánh được",
    () => {
        let s = mk({
            A: {
                lissandra: 2
            }, B: {
                g4v_fighter: 2
            }
        })
        const cards = handB(s,
            4)
        const q = give(s,
            "A",
            skill(s,
                "lissandra",
                "A",
                "Q"))
        s = play(s,
            "A",
            q).s
        assert.equal(mana(s,
            "lissandra"),
        80)
        const frozen = s.players.B.hand.filter((c) => c.frozen === "A:lissandra")
        assert.equal(frozen.length,
            2)
        assert.equal(s.players.B.hand.length,
            4,
            "vẫn chiếm chỗ")
        s = end(s,
            "A").s
        for (const c of frozen) assert.equal(legalPlays(s,
            "B",
            c.uid).length,
        0,
        "lá băng không đánh được")
        assert.ok(cards.some((c) => !c.frozen && legalPlays(s,
            "B",
            c.uid).length > 0),
        "lá không băng vẫn đánh được")
    })
test("Q Quick nối được trong lượt đối thủ (có mana) và không có tác dụng nếu hết mana",
    () => {
        const s = mk({
            A: {
                lissandra: 2
            }, B: {
                g4v_fighter: 2
            }
        })
        give(s,
            "A",
            skill(s,
                "lissandra",
                "A",
                "Q"))
        handB(s,
            3)
        let t = end(s,
            "A").s
        const b = t.players.B.hand[0]
        t = act(t,
            {
                t: "play", side: "B", uid: b.uid, args: {
                    actor: "B:g4v_fighter", target: "A:lissandra"
                }
            }).s
        assert.equal(t.phase,
            "chain")
        const resp = cg.legalActions(t,
            "A").filter((a) => a.t === "chain" && t.players.A.hand.find((c) => c.uid === a.uid)?.id === "lissandra_q")
        assert.ok(resp.length > 0,
            "Q nối chuỗi được")
        const after = settle(act(t,
            resp[0])).s
        assert.equal(after.players.B.hand.filter((c) => c.frozen === "A:lissandra").length,
            2,
            "Q nối chuỗi vẫn Hoá Băng 2 lá")
        assert.equal(mana(after,
            "lissandra"),
        80)
        u(t,
            "A",
            "lissandra").mana = 10
        const resp2 = cg.legalActions(t,
            "A").filter((a) => a.t === "chain" && t.players.A.hand.find((c) => c.uid === a.uid)?.id === "lissandra_q")
        assert.equal(resp2.length,
            0,
            "thiếu mana thì không nối")
    })
test("E (30 mana): sát thương tăng theo số lá Hoá Băng",
    () => {
        const dmg = (frozen: number) => {
            const s0 = mk({
                A: {
                    lissandra: 2
                }, B: {
                    g4v_fighter: 2
                }
            })
            const cs = handB(s0,
                4)
            for (const c of cs.slice(0,
                frozen)) gm(s0).freezeCard("B",
                c,
                "A:lissandra")
            const e = give(s0,
                "A",
                skill(s0,
                    "lissandra",
                    "A",
                    "E"))
            const s = play(s0,
                "A",
                e,
                {
                    target: "B:g4v_fighter"
                }).s
            assert.equal(mana(s,
                "lissandra"),
            70)
            return lost(s0,
                s,
                "B",
                "g4v_fighter")
        }
        const d0 = dmg(0), d3 = dmg(3)
        assert.ok(d3 > d0,
            `${d3} > ${d0}`)
    })
test("R (50 mana): bỏ mọi lá băng vào mộ, mỗi lá gây sát thương lên mọi địch; lá không băng ở lại",
    () => {
        const s0 = mk({
            A: {
                lissandra: 2
            }, B: {
                g4v_fighter: 2, g4v_tank: 1
            }
        })
        const cs = handB(s0,
            4)
        gm(s0).freezeCard("B",
            cs[0],
            "A:lissandra")
        gm(s0).freezeCard("B",
            cs[1],
            "A:lissandra")
        const graveBefore = s0.players.B.grave.length
        const r = give(s0,
            "A",
            skill(s0,
                "lissandra",
                "A",
                "R"))
        const s = play(s0,
            "A",
            r).s
        assert.equal(mana(s,
            "lissandra"),
        50)
        assert.equal(s.players.B.hand.length,
            2)
        assert.equal(s.players.B.grave.length,
            graveBefore + 2,
            "2 lá băng vào mộ")
        assert.equal(s.players.B.hand.filter((c) => c.frozen).length,
            0)
        const d1 = lost(s0,
            s,
            "B",
            "g4v_fighter")
        assert.ok(d1 > 0 && lost(s0,
            s,
            "B",
            "g4v_tank") > 0,
        "trúng mọi địch")
        // 2 lá = gấp đôi 1 lá
        const t0 = mk({
            A: {
                lissandra: 2
            }, B: {
                g4v_fighter: 2
            }
        })
        const c1 = handB(t0,
            2)
        gm(t0).freezeCard("B",
            c1[0],
            "A:lissandra")
        const t = play(t0,
            "A",
            give(t0,
                "A",
                skill(t0,
                    "lissandra",
                    "A",
                    "R"))).s
        near(d1 / lost(t0,
            t,
            "B",
            "g4v_fighter"),
        2,
        0.1)
    })
test("Lissandra bị hạ: băng tan hết",
    () => {
        const s = mk({
            A: {
                lissandra: 2
            }, B: {
                g4v_fighter: 2
            }
        })
        const cs = handB(s,
            3)
        gm(s).freezeCard("B",
            cs[0],
            "A:lissandra")
        gm(s).freezeCard("B",
            cs[1],
            "A:lissandra")
        gm(s).kill(u(s,
            "A",
            "lissandra"))
        assert.equal(s.players.B.hand.filter((c) => c.frozen).length,
            0)
    })

// ======================================================================
G("Twisted Fate")
// ======================================================================
test("Nội tại: TF trên sân thì lượt rút của bạn rút 3 lá thay vì 2",
    () => {
        const s = mk({
            A: {
                twistedfate: 2
            }, B: {
                g4v_fighter: 2
            }
        })
        assert.equal(gm(s).drawCount("A"),
            3)
        assert.equal(gm(s).drawCount("B"),
            2)
        // thực tế qua một vòng lượt
        const h0 = s.players.A.hand.length
        const t = end(end(s,
            "A").s,
        "B").s
        assert.equal(t.players.A.hand.length - h0,
            3,
            "rút 3 lá")
        const s2 = mk({
            A: {
                g4v_fighter: 2
            }
        })
        const t2 = end(end(s2,
            "A").s,
        "B").s
        assert.equal(t2.players.A.hand.length,
            2,
            "không có TF rút 2")
    })
test("Q (15 mana): xem 3 lá trên cùng, lấy 2 lên tay, lá chọn xuống đáy bộ bài",
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
        const q = give(s,
            "A",
            skill(s,
                "twistedfate",
                "A",
                "Q"))
        const opts = legalPlays(s,
            "A",
            q.uid)
        assert.equal(opts.length,
            3,
            "3 lựa chọn lá xuống đáy")
        s = play(s,
            "A",
            q,
            {
                pick: c2.uid
            }).s
        assert.equal(mana(s,
            "twistedfate"),
        85)
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
test("E (25 mana): sát thương tăng theo số lá trên tay",
    () => {
        const dmg = (n: number) => {
            const s0 = mk({
                A: {
                    twistedfate: 2
                }, B: {
                    g4v_fighter: 2
                }
            })
            for (let i = 0; i < n; i++) give(s0,
                "A",
                basic(s0))
            const e = give(s0,
                "A",
                skill(s0,
                    "twistedfate",
                    "A",
                    "E"))
            const s = play(s0,
                "A",
                e,
                {
                    target: "B:g4v_fighter"
                }).s
            assert.equal(mana(s,
                "twistedfate"),
            75)
            return lost(s0,
                s,
                "B",
                "g4v_fighter")
        }
        assert.ok(dmg(6) > dmg(1),
            "tay dày đau hơn")
    })
test("R (45 mana): bỏ cả tay vào mộ, mỗi lá gây sát thương lên mọi địch",
    () => {
        const run = (n: number) => {
            const s0 = mk({
                A: {
                    twistedfate: 2
                }, B: {
                    g4v_fighter: 2, g4v_tank: 1
                }
            })
            for (let i = 0; i < n; i++) give(s0,
                "A",
                basic(s0))
            const graveBefore = s0.players.A.grave.length
            const r = give(s0,
                "A",
                skill(s0,
                    "twistedfate",
                    "A",
                    "R"))
            const s = play(s0,
                "A",
                r).s
            assert.equal(mana(s,
                "twistedfate"),
            55)
            assert.equal(s.players.A.hand.length,
                0,
                "tay rỗng")
            assert.equal(s.players.A.grave.length,
                graveBefore + n + 1,
                "mọi lá + lá R vào mộ")
            assert.ok(lost(s0,
                s,
                "B",
                "g4v_tank") > 0,
            "trúng mọi địch")
            return lost(s0,
                s,
                "B",
                "g4v_fighter")
        }
        const d2 = run(2), d6 = run(6)
        near(d6 / d2,
            3,
            0.15,
            "6 lá = gấp 3 lần 2 lá")
    })

// ======================================================================
G("Tổng hợp")
// ======================================================================
test("Mọi chiêu của 6 pháp sư đều có phí mana (Lux Q = 0, Lux R = toàn bộ)",
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
            [10,
                20,
                50])
        assert.deepEqual(costs("lux"),
            [0,
                30,
                "all"])
        assert.deepEqual(costs("ahri"),
            [20,
                25,
                50])
        assert.deepEqual(costs("annie"),
            [10,
                20,
                40])
        assert.deepEqual(costs("lissandra"),
            [20,
                30,
                50])
        assert.deepEqual(costs("twistedfate"),
            [15,
                25,
                45])
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
