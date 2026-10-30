// Test cân bằng starci-33 nhóm sát thủ: Zed, Kha'Zix, Katarina, Qiyana, Vayne.
// Chạy: npx tsx scripts/card_tests_balance_assassin.ts [--only=chữ] [--verbose]
// Bàn luôn đầy 5 đường (luật full-board): mọi ô trống được lấp bằng tướng giả; cơ động = swap nguyên tử hai người giữ ô.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import * as ZED from "../packages/shared/src/cardgame/heroes/zed"
import * as KHAZIX from "../packages/shared/src/cardgame/heroes/khazix"
import * as KATARINA from "../packages/shared/src/cardgame/heroes/katarina"
import * as QIYANA from "../packages/shared/src/cardgame/heroes/qiyana"
import * as VAYNE from "../packages/shared/src/cardgame/heroes/vayne"
const ASSASSIN_MANA: Record<string, { Q: number; E: number; R: number }> = {
    zed: ZED.MANA, khazix: KHAZIX.MANA, katarina: KATARINA.MANA, qiyana: QIYANA.MANA, vayne: VAYNE.MANA
}

type St = ReturnType<typeof cg.newGame>;
type Act = Parameters<typeof cg.applyAction>[1];
type Ev = ReturnType<typeof cg.applyAction>["events"];
type S = "A" | "B";
const { Game } = cg

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

// Tướng giả không chiêu (Xạ thủ để đánh được mọi đường), 1000 máu, giáp/kháng 30
const noSkill = (key: "Q" | "E" | "R") => ({
    key, name: "-", desc: "-", target: "none" as const, canPlay: () => false, resolve: () => {}
})
const DUMMIES = ["asx_d0",
    "asx_d1",
    "asx_d2",
    "asx_d3",
    "asx_d4"]
for (const id of DUMMIES) {
    cg.defineHero({
        id, name: id, role: "marksman", damage: "physical", hp: 1000, atk: 50, armor: 30, mr: 30,
        passive: {
            name: "-", desc: "-"
        },
        skills: {
            Q: noSkill("Q"), E: noSkill("E"), R: noSkill("R")
        },
    })
}
const ARMOR = 100 / 130

/** Ván round 8, bàn đầy: tướng chỉ định ở đường chỉ định, các đường còn lại lấp tướng giả (A:asx_dN / B:asx_dN ở đường N) */
function mk(o: { A?: Record<string, number>; B?: Record<string, number> } = {
}): St {
    const team = (m: Record<string, number>) => {
        const used = new Set(Object.values(m))
        return [...Object.keys(m),
            ...DUMMIES.filter((_, lane) => !used.has(lane))]
    }
    const a = o.A ?? {
        }, b = o.B ?? {
        }
    const s = cg.newGame(20261031,
        team(a),
        team(b))
    s.round = 8
    s.teamMana = {
        A: 200, B: 200
    }
    const g = new Game(s)
    for (const [side,
        m] of [["A",
            a],
        ["B",
            b]] as const) {
        const used = new Set(Object.values(m))
        for (const [h,
            lane] of Object.entries(m)) g.summon(side,
            h,
            lane)
        DUMMIES.forEach((h, lane) => { if (!used.has(lane)) g.summon(side,
            h,
            lane) })
    }
    for (const side of ["A",
        "B"] as const) { s.players[side].hand = []; s.players[side].grave = [] }
    s.phase = "main"; s.opened = {
        A: true, B: true
    }
    s.firstTurnDone = {
        A: true, B: true
    }
    s.active = "A"
    return s
}
const gm = (s: St) => new Game(s)
const u = (s: St, id: string) => s.units[id]
const skill = (s: St, hero: string, side: S, k: cg.SkillKey) => gm(s).skillCard(hero,
    side,
    k)
function give(s: St, side: S, card: cg.Card) { s.players[side].hand.push(card); return card }
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
const play = (s: St, side: S, card: { uid: string }, args: cg.PlayArgs = {
}) => settle(act(s,
    {
        t: "play", side, uid: card.uid, args
    }))
const canPlay = (s: St, side: S, card: { uid: string }, args?: cg.PlayArgs) => cg.legalActions(s,
    side).some((a) => a.t === "play" && a.uid === card.uid && (!args || cg.Game.argsKey(a.args ?? {
}) === cg.Game.argsKey(args)))
function strike(s: St, side: S, actor: string, target: string) {
    const c = give(s,
        side,
        gm(s).supportCard("basic"))
    return play(s,
        side,
        c,
        {
            actor, target
        })
}
const end = (s: St, side: S) => act(s,
    {
        t: "end", side
    })
const evs = <T extends cg.GameEvent["t"]>(ev: Ev, t: T) => ev.filter((e) => e.t === t) as Extract<cg.GameEvent, { t: T }>[]
const dmgTo = (ev: Ev, target: string, tag?: string, kind?: string) => evs(ev,
    "damage").filter((d) => d.target === target && (!tag || d.tag === tag) && (!kind || d.kind === kind)).reduce((x, d) => x + d.amount,
    0)

// ======================================================================
G("Chung")
// ======================================================================
test(`Mana bể đội: Q${ZED.MANA.Q} / E${ZED.MANA.E} / R${ZED.MANA.R} cho cả 5 sát thủ; chỉ số gốc đúng bảng`,
    () => {
        const base: Record<string, [number, number, number, number]> = {
            zed: [330,
                80,
                28,
                26],
            khazix: [320,
                79,
                27,
                26],
            katarina: [320,
                76,
                26,
                28],
            qiyana: [320,
                77,
                27,
                26],
            vayne: [340,
                80,
                26,
                26],
        }
        for (const [id,
            [hp,
                ad,
                ar,
                mr]] of Object.entries(base)) {
            const h = cg.getHero(id)!
            assert.deepEqual([h.skills.Q.mana,
                h.skills.E.mana,
                h.skills.R.mana],
            [ASSASSIN_MANA[id].Q,
                ASSASSIN_MANA[id].E,
                ASSASSIN_MANA[id].R],
            id)
            assert.deepEqual([h.hp,
                h.atk,
                h.armor,
                h.mr,
                h.role],
            [hp,
                ad,
                ar,
                mr,
                "assassin"],
            id)
        }
        const s = mk({
            A: {
                zed: 0
            }
        })
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "zed",
                    "A",
                    "R")),
            {
                target: "B:asx_d3"
            })
        assert.equal(r.s.teamMana!.A,
            165,
            "R trừ 35 mana đội")
    })

// ======================================================================
G("Zed")
// ======================================================================
test("E: swap nguyên tử với đồng minh đối diện con mồi rồi chém; cùng đường giữ chỗ",
    () => {
        const s = mk({
            A: {
                zed: 0
            }
        })
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "zed",
                    "A",
                    "E")),
            {
                target: "B:asx_d3"
            })
        assert.equal(r.s.lanes.A[3],
            "A:zed")
        assert.equal(r.s.lanes.A[0],
            "A:asx_d3",
            "đồng minh về ô cũ")
        assert.equal(dmgTo(r.ev,
            "B:asx_d3",
            "skill"),
        Math.round(gm(s).f(u(s,
            "A:zed"),
        ZED.F_E) * ARMOR))
        const s2 = mk({
            A: {
                zed: 2
            }
        })
        const r2 = play(s2,
            "A",
            give(s2,
                "A",
                skill(s2,
                    "zed",
                    "A",
                    "E")),
            {
                target: "B:asx_d2"
            })
        assert.equal(evs(r2.ev,
            "move").length,
        0,
        "đã đối diện: không di chuyển")
        assert.ok(dmgTo(r2.ev,
            "B:asx_d2",
            "skill") > 0)
    })
test("E: ô đối diện con mồi đang giữ cho đồng minh chết thì vẫn chọn được: swap với tướng chết, tới đối diện rồi mới gây sát thương",
    () => {
        const s = mk({
            A: {
                zed: 0
            }
        })
        gm(s).kill(u(s,
            "A:asx_d3"))
        const card = give(s,
            "A",
            skill(s,
                "zed",
                "A",
                "E"))
        assert.ok(canPlay(s,
            "A",
            card,
            {
                target: "B:asx_d3"
            }))
        const r = play(s,
            "A",
            card,
            {
                target: "B:asx_d3"
            })
        assert.equal(r.s.lanes.A[3],
            "A:zed")
        assert.equal(r.s.lanes.A[0],
            "A:asx_d3",
            "tướng chết đi theo ô về đường cũ của Zed")
        assert.equal(u(r.s,
            "A:asx_d3").status,
        "dead")
        assert.ok(dmgTo(r.ev,
            "B:asx_d3",
            "skill") > 0)
    })
test("R: mỗi lá có lịch riêng (hai R = hai nhịp hẹn cuối lượt), dùng sát thương gốc đã chụp",
    () => {
        const s = mk({
            A: {
                zed: 0
            }
        })
        const zed = u(s,
            "A:zed")
        let r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "zed",
                    "A",
                    "R")),
            {
                target: "B:asx_d4"
            })
        r = play(r.s,
            "A",
            give(r.s,
                "A",
                skill(r.s,
                    "zed",
                    "A",
                    "R")),
            {
                target: "B:asx_d4"
            })
        assert.equal(gm(r.s).statusV(u(r.s,
            "B:asx_d4"),
        "zed_mark"),
        2)
        const raw = gm(s).f(zed,
            ZED.F_R)
        const e = end(r.s,
            "A")
        const delayed = evs(e.ev,
            "damage").filter((d) => d.target === "B:asx_d4" && d.tag === "skill")
        assert.equal(delayed.length,
            2,
            "hai nhịp hẹn")
        for (const d of delayed) assert.equal(d.amount,
            Math.round(raw * ARMOR))
        assert.equal(gm(e.s).has(u(e.s,
            "B:asx_d4"),
        "zed_mark"),
        false)
    })
test("R: mục tiêu rời sân trước cuối lượt thì lịch bị huỷ",
    () => {
        const s = mk({
            A: {
                zed: 0
            }
        })
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "zed",
                    "A",
                    "R")),
            {
                target: "B:asx_d4"
            })
        gm(r.s).kill(u(r.s,
            "B:asx_d4"))
        const e = end(r.s,
            "A")
        assert.equal(evs(e.ev,
            "damage").filter((d) => d.target === "B:asx_d4").length,
        0)
    })
test("Liên Hoàn: đòn thật là một nhịp (phần cộng của đồ/nội tại không thành nhịp riêng)",
    () => {
        const s = mk({
            A: {
                zed: 2
            }
        })
        const r = strike(s,
            "A",
            "A:zed",
            "B:asx_d2")
        assert.equal(gm(r.s).statusV(u(r.s,
            "A:zed"),
        "zed_chain"),
        1)
        const r2 = strike(r.s,
            "A",
            "A:zed",
            "B:asx_d2")
        assert.equal(gm(r2.s).statusV(u(r2.s,
            "A:zed"),
        "zed_chain"),
        2)
        const hit = evs(r2.ev,
            "damage").find((d) => d.tag === "attack" && d.target === "B:asx_d2")!
        const flat = gm(s).f(u(s,
            "A:zed"),
        ZED.F_CHAIN)
        assert.equal(dmgTo(r2.ev,
            "B:asx_d2",
            "effect"),
        Math.round((flat + (1000 - hit.hp) * ZED.MISSING) * ARMOR))
    })

// ======================================================================
G("Kha'Zix")
// ======================================================================
test("E: swap với đồng minh đối diện con mồi, Cô Lập tới hết lượt này rồi gây sát thương",
    () => {
        const s = mk({
            A: {
                khazix: 0
            }
        })
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "khazix",
                    "A",
                    "E")),
            {
                target: "B:asx_d4"
            })
        assert.equal(r.s.lanes.A[4],
            "A:khazix")
        assert.equal(r.s.lanes.A[0],
            "A:asx_d4")
        const iso = u(r.s,
            "B:asx_d4").statuses.isolated
        assert.ok(iso)
        assert.equal(iso.until,
            r.s.turnNo,
            "tới hết lượt hiện tại của mình")
        assert.equal(dmgTo(r.ev,
            "B:asx_d4",
            "skill"),
        Math.round(gm(s).f(u(s,
            "A:khazix"),
        KHAZIX.F_E) * ARMOR))
    })
test("R: Tàng Hình + 1 lá Q; Cô Lập chỉ lên địch đối diện hợp lệ, không có thì bỏ phần dấu (không ngẫu nhiên)",
    () => {
        const s = mk({
            A: {
                khazix: 1
            }
        })
        gm(s).status(u(s,
            "B:asx_d1"),
        "stealth",
        1)
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "khazix",
                    "A",
                    "R")))
        assert.ok(u(r.s,
            "A:khazix").statuses.stealth)
        assert.equal(r.s.players.A.hand.filter((c) => c.id === "khazix_q").length,
            1)
        const isolated = Object.values(r.s.units).filter((x) => x.side === "B" && x.statuses.isolated)
        assert.equal(isolated.length,
            0,
            "không gắn dấu ngẫu nhiên")
        const s2 = mk({
            A: {
                khazix: 1
            }
        })
        const r2 = play(s2,
            "A",
            give(s2,
                "A",
                skill(s2,
                    "khazix",
                    "A",
                    "R")))
        assert.equal(u(r2.s,
            "B:asx_d1").statuses.isolated?.until,
        s2.turnNo + 2,
        "tới hết lượt kế tiếp của mình")
    })
test("Q: lên tướng Cô Lập cộng (40 + 90% AD + 15% AP) vào chính lá Q (một sự kiện sát thương)",
    () => {
        const s = mk({
            A: {
                khazix: 2
            }
        })
        gm(s).status(u(s,
            "B:asx_d2"),
        "isolated",
        1)
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "khazix",
                    "A",
                    "Q")))
        const k = u(s,
            "A:khazix")
        const hits = evs(r.ev,
            "damage").filter((d) => d.target === "B:asx_d2" && d.tag === "skill")
        assert.equal(hits.length,
            1)
        assert.equal(hits[0].amount,
            Math.round((gm(s).f(k,
                KHAZIX.F_Q) + gm(s).f(k,
                KHAZIX.F_Q_ISO)) * ARMOR))
    })

// ======================================================================
G("Katarina")
// ======================================================================
test("E chủ động: swap với đồng minh đối diện con mồi rồi chém; có Dao ×2",
    () => {
        const s = mk({
            A: {
                katarina: 0
            }
        })
        gm(s).status(u(s,
            "B:asx_d3"),
        "kat_dagger",
        2)
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "katarina",
                    "A",
                    "E")),
            {
                target: "B:asx_d3"
            })
        assert.equal(r.s.lanes.A[3],
            "A:katarina")
        assert.equal(r.s.lanes.A[0],
            "A:asx_d3")
        assert.equal(dmgTo(r.ev,
            "B:asx_d3",
            "skill"),
        Math.round(gm(s).f(u(s,
            "A:katarina"),
        KATARINA.F_E) * 2 * ARMOR))
        assert.ok(gm(r.s).has(u(r.s,
            "B:asx_d3"),
        "kat_dagger"),
        "E không tiêu Dao")
    })
test("E Quick: kẻ đánh khác đường => swap tới đối diện nó (kể cả khi ô đó giữ cho đồng minh chết), huỷ đòn và đánh trả",
    () => {
        const run = (deadHolder: boolean) => {
            const s = mk({
                A: {
                    katarina: 0
                }
            })
            s.active = "B"
            if (deadHolder) gm(s).kill(u(s,
                "A:asx_d3"))
            const e = give(s,
                "A",
                skill(s,
                    "katarina",
                    "A",
                    "E"))
            const atk = give(s,
                "B",
                gm(s).supportCard("basic"))
            const r = act(s,
                {
                    t: "play", side: "B", uid: atk.uid, args: {
                        actor: "B:asx_d3", target: "A:katarina"
                    }
                })
            const opts = cg.legalActions(r.s,
                "A").filter((a) => a.t === "chain" && a.uid === e.uid)
            return {
                r, e, opts
            }
        }
        for (const viaDead of [false,
            true]) {
            const ok = run(viaDead)
            assert.equal(ok.opts.length,
                1)
            assert.equal((ok.opts[0] as { args?: cg.PlayArgs }).args?.target,
                "B:asx_d3",
                "tự lấy kẻ đánh làm đích")
            const done = settle(act(ok.r.s,
                {
                    t: "chain", side: "A", uid: ok.e.uid, args: {
                        target: "B:asx_d3"
                    }
                }))
            assert.equal(done.s.lanes.A[3],
                "A:katarina")
            assert.equal(evs(done.ev,
                "chainCancel").length,
            1)
            assert.equal(u(done.s,
                "A:katarina").hp,
            u(done.s,
                "A:katarina").maxHp)
            assert.ok(dmgTo(done.ev,
                "B:asx_d3",
                "skill") > 0)
            if (viaDead) assert.equal(done.s.lanes.A[0],
                "A:asx_d3",
                "đồng minh chết đi theo ô về đường cũ của Katarina")
        }
    })
test("Tham Lam: Chạm cần sát thương thực dương; hạ địch đã Chạm thì lá đã dùng trong lượt về tay, kể cả lá đang giải quyết",
    () => {
        const s = mk({
            A: {
                katarina: 0
            }
        })
        let r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "katarina",
                    "A",
                    "Q")),
            {
                target: "B:asx_d4"
            })
        assert.equal(r.s.players.A.grave.filter((c) => c.id === "katarina_q").length,
            1)
        u(r.s,
            "B:asx_d4").hp = 5
        r = play(r.s,
            "A",
            give(r.s,
                "A",
                skill(r.s,
                    "katarina",
                    "A",
                    "R")))
        assert.equal(u(r.s,
            "B:asx_d4").status === "board",
        false,
        "đã hạ")
        const hand = r.s.players.A.hand.filter((c) => c.hero === "katarina").map((c) => c.id).sort() // lá thưởng khi hạ địch không tính
        assert.deepEqual(hand,
            ["katarina_q",
                "katarina_r"],
            "Q trong mộ và R đang giải quyết đều về tay")
        // sát thương 0 (bất khả xâm phạm) không ghi Chạm
        const s2 = mk({
            A: {
                katarina: 0
            }
        })
        gm(s2).status(u(s2,
            "B:asx_d4"),
        "invulnerable",
        1)
        const r2 = play(s2,
            "A",
            give(s2,
                "A",
                skill(s2,
                    "katarina",
                    "A",
                    "Q")),
            {
                target: "B:asx_d4"
            })
        assert.equal(u(r2.s,
            "A:katarina").stacks["once:kat_touch:B:asx_d4"],
        undefined)
    })

// ======================================================================
G("Qiyana")
// ======================================================================
const withElement = (s: St, e: QIYANA.Element) => { QIYANA.setElement(gm(s),
    u(s,
        "A:qiyana"),
    e); return s }
test("Q mọi nguyên tố đều swap trước payoff; Đá: Q lại không đặt lại dấu đã tích",
    () => {
        const s = withElement(mk({
            A: {
                qiyana: 0
            }
        }),
        "red")
        let r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "qiyana",
                    "A",
                    "Q")),
            {
                target: "B:asx_d2"
            })
        assert.equal(r.s.lanes.A[2],
            "A:qiyana")
        assert.equal(gm(r.s).statusV(u(r.s,
            "B:asx_d2"),
        "qiyana_mark"),
        15)
        r = play(r.s,
            "A",
            give(r.s,
                "A",
                skill(r.s,
                    "qiyana",
                    "A",
                    "Q")),
            {
                target: "B:asx_d2"
            })
        assert.equal(gm(r.s).statusV(u(r.s,
            "B:asx_d2"),
        "qiyana_mark"),
        30,
        "không reset, tích tiếp")
    })
test("Q Cỏ: Tàng Hình tới hết lượt kế tiếp của đối thủ; Q Sông Choáng theo đơn vị",
    () => {
        const s = withElement(mk({
            A: {
                qiyana: 0
            }
        }),
        "green")
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "qiyana",
                    "A",
                    "Q")),
            {
                target: "B:asx_d1"
            })
        assert.equal(u(r.s,
            "A:qiyana").statuses.stealth?.until,
        s.turnNo + 1)
        const s2 = withElement(mk({
            A: {
                qiyana: 1
            }
        }),
        "blue")
        const r2 = play(s2,
            "A",
            give(s2,
                "A",
                skill(s2,
                    "qiyana",
                    "A",
                    "Q")),
            {
                target: "B:asx_d1"
            })
        const stun = u(r2.s,
            "B:asx_d1").statuses.stun
        assert.ok(stun)
        assert.ok(stun.until === s2.turnNo + 1 || stun.until === s2.turnNo + 3,
            `1 hoặc 2 đơn vị: ${stun.until}`)
    })
test("E Cỏ: swap với đồng minh tỉ lệ Máu cao nhất và mới huỷ đòn; E Đá không huỷ đòn",
    () => {
        const run = (el: QIYANA.Element) => {
            const s = withElement(mk({
                A: {
                    qiyana: 2
                }
            }),
            el)
            s.active = "B"
            for (const l of [0,
                1,
                4]) u(s,
                `A:asx_d${l}`).hp = 500
            const e = give(s,
                "A",
                skill(s,
                    "qiyana",
                    "A",
                    "E"))
            const atk = give(s,
                "B",
                gm(s).supportCard("basic"))
            const r = act(s,
                {
                    t: "play", side: "B", uid: atk.uid, args: {
                        actor: "B:asx_d2", target: "A:qiyana"
                    }
                })
            return settle(act(r.s,
                {
                    t: "chain", side: "A", uid: e.uid, args: {
                    }
                }))
        }
        const g = run("green")
        assert.equal(g.s.lanes.A[3],
            "A:qiyana",
            "đồng minh đầy máu duy nhất ở đường 3")
        assert.equal(evs(g.ev,
            "chainCancel").length,
        1)
        const red = run("red")
        assert.equal(evs(red.ev,
            "chainCancel").length,
        0)
        assert.ok(dmgTo(red.ev,
            "B:asx_d2",
            "skill") > 0)
    })
test("R Cỏ: mọi địch trúng; swap đối diện địch Máu hiện tại thấp nhất; luôn nhận 1 lá Q",
    () => {
        const s = withElement(mk({
            A: {
                qiyana: 0
            }
        }),
        "green")
        u(s,
            "B:asx_d3").hp = 600
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "qiyana",
                    "A",
                    "R")))
        for (let l = 0; l < 5; l++) assert.ok(dmgTo(r.ev,
            `B:asx_d${l}`,
            "skill") > 0)
        assert.equal(r.s.lanes.A[3],
            "A:qiyana")
        assert.equal(r.s.players.A.hand.filter((c) => c.id === "qiyana_q").length,
            1)
    })

// ======================================================================
G("Vayne")
// ======================================================================
test("Q: swap thật với đồng minh; thành công mới Tàng Hình + 2 Đêm",
    () => {
        const s = mk({
            A: {
                vayne: 0
            }
        })
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "vayne",
                    "A",
                    "Q")),
            {
                target: "A:asx_d4"
            })
        assert.equal(r.s.lanes.A[4],
            "A:vayne")
        assert.equal(r.s.lanes.A[0],
            "A:asx_d4")
        assert.equal(u(r.s,
            "A:vayne").stacks.night,
        2)
        const s2 = mk({
            A: {
                vayne: 0
            }
        })
        gm(s2).kill(u(s2,
            "A:asx_d4"))
        const c2 = give(s2,
            "A",
            skill(s2,
                "vayne",
                "A",
                "Q"))
        assert.ok(!canPlay(s2,
            "A",
            c2,
            {
                target: "A:asx_d4"
            }),
        "không swap với ô của tướng chết")
    })
test("Nhịn: hết lượt thật trên bàn mà không tuyên bố gây sát thương thì +2 Đêm; E/R vẫn bắn nền khi cạn Đêm",
    () => {
        const s = mk({
            A: {
                vayne: 2
            }
        })
        const e1 = end(s,
            "A")
        assert.equal(u(e1.s,
            "A:vayne").stacks.night,
        2)
        const s2 = mk({
            A: {
                vayne: 2
            }
        })
        const r = play(s2,
            "A",
            give(s2,
                "A",
                skill(s2,
                    "vayne",
                    "A",
                    "E")))
        assert.equal(dmgTo(r.ev,
            "B:asx_d2",
            "skill"),
        Math.round(gm(s2).f(u(s2,
            "A:vayne"),
        VAYNE.F_E_BASE) * ARMOR))
        assert.equal(dmgTo(r.ev,
            "B:asx_d2",
            undefined,
            "true"),
        0)
        const e2 = end(r.s,
            "A")
        assert.equal(u(e2.s,
            "A:vayne").stacks.night ?? 0,
        0,
        "đã tuyên bố chiêu gây sát thương")
    })

// ======================================================================
G("Chữ")
// ======================================================================
test("Công thức EN khớp bản Việt cho 5 sát thủ",
    () => {
        const errs = cg.checkTranslations?.() ?? []
        const mine = errs.filter((e: string) => /^(zed|khazix|katarina|qiyana|vayne)\./.test(e))
        assert.deepEqual(mine,
            [])
    })

const pad = (x: string, n: number) => (x.length >= n ? x : x + " ".repeat(n - x.length))
let last = ""
for (const r of results) {
    if (r.group !== last) { console.log(`\n== ${r.group} ==`); last = r.group }
    console.log(`${r.res}  ${pad(r.name,
        100)}${r.note ? `\n        -> ${r.note}` : ""}`)
}
const c = (k: string) => results.filter((r) => r.res === k).length
console.log(`\nTỔNG: ${results.length} test | PASS ${c("PASS")} | FAIL ${c("FAIL")}`)
process.exit(c("FAIL") ? 1 : 0)
