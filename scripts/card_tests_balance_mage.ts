// Test tuning starci-33 v1 cho 8 pháp sư: Ahri, Annie, Brand, Lissandra, Lux, Twisted Fate, Vel'Koz, Viktor.
// Chạy: npx tsx scripts/card_tests_balance_mage.ts [--only=chuỗi] [--verbose]
// Bao phủ: phí mana bể chung, bỏ trần tăng trưởng, Choáng d đơn vị (law.md §4), Bỏng cháy ở Standby độc lập Brand,
// Lux R cam kết mana, Lissandra không lộ lá băng, TF/Viktor/Vel'Koz theo kit mới.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"

import * as AHRI from "../packages/shared/src/cardgame/heroes/ahri"
import * as BRAND from "../packages/shared/src/cardgame/heroes/brand"
import * as LISS from "../packages/shared/src/cardgame/heroes/lissandra"
import * as LUX from "../packages/shared/src/cardgame/heroes/lux"
import * as VK from "../packages/shared/src/cardgame/heroes/velkoz"
import * as VIK from "../packages/shared/src/cardgame/heroes/viktor"

type St = ReturnType<typeof cg.newGame>
type Ev = ReturnType<typeof cg.applyAction>["events"]
type Act = Parameters<typeof cg.applyAction>[1]
type S = "A" | "B"
const { Game } = cg

const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7)
const VERBOSE = process.argv.includes("--verbose")
const results: { name: string; ok: boolean; note?: string }[] = []
function test(name: string, fn: () => void) {
    if (only && !name.toLowerCase().includes(only.toLowerCase())) return
    try {
        fn()
        results.push({
            name, ok: true
        })
    } catch (e) {
        results.push({
            name, ok: false, note: (e as Error).message.split("\n").slice(0,
                3).join(" | ") + (VERBOSE ? `\n${(e as Error).stack}` : "")
        })
    }
}

// Tướng giả không chiêu
const noSkill = (key: "Q" | "E" | "R") => ({
    key, name: "-", desc: "-", target: "none" as const, canPlay: () => false, resolve: () => {}
})
const DUMMIES = ["bm_tank",
    "bm_fighter",
    "bm_mark",
    "bm_sup",
    "bm_assassin"]
for (const [i,
    id] of DUMMIES.entries()) {
    cg.defineHero({
        id, name: id, role: (["tank",
            "fighter",
            "marksman",
            "support",
            "assassin"] as const)[i], damage: "physical", hp: 1000, atk: 50, armor: 30, mr: 30,
        passive: {
            name: "-", desc: "-"
        },
        skills: {
            Q: noSkill("Q"), E: noSkill("E"), R: noSkill("R")
        },
    })
}

const SEED = 20261031
function mk(o: { A?: Record<string, number>; B?: Record<string, number>; seed?: number; mana?: number } = {
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
    s.teamMana = {
        A: o.mana ?? 200, B: o.mana ?? 200
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
    s.phase = "main"
    s.opened = {
        A: true, B: true
    }
    s.firstTurnDone = {
        A: true, B: true
    }
    return s
}
const gm = (s: St) => new Game(s)
const u = (s: St, side: S, hero: string) => s.units[`${side}:${hero}`]
const give = (s: St, side: S, card: cg.Card) => { s.players[side].hand.push(card); return card }
const skill = (s: St, hero: string, side: S, k: cg.SkillKey) => gm(s).skillCard(hero,
    side,
    k)
function settle(st: St, ev: Ev): { s: St; ev: Ev } {
    let s = st
    const all: Ev = [...ev]
    for (let i = 0; i < 20 && s.phase === "chain"; i++) {
        const o = cg.applyAction(s,
            {
                t: "pass", side: cg.whoseMove(s)
            })
        s = o.state
        all.push(...o.events)
    }
    return {
        s, ev: all
    }
}
function play(s: St, side: S, card: cg.Card, args: cg.PlayArgs = {
}) {
    const r = cg.applyAction(s,
        {
            t: "play", side, uid: card.uid, args
        } as Act)
    return settle(r.state,
        r.events)
}
const cast = (s: St, hero: string, k: cg.SkillKey, args: cg.PlayArgs = {
}) => play(s,
    "A",
    give(s,
        "A",
        skill(s,
            hero,
            "A",
            k)),
    args)
const evs = <T extends cg.GameEvent["t"]>(ev: Ev, t: T) => ev.filter((e) => e.t === t) as Extract<cg.GameEvent, { t: T }>[]
const near = (a: number, b: number, tol: number, msg = "") => assert.ok(Math.abs(a - b) <= tol,
    `${msg} ${a} không gần ${b} (±${tol})`)

// ======================================================================
test("Phí mana bể chung theo tuning v1 (Q/E/R) cho 8 pháp sư",
    () => {
        const want: Record<string, [number, number, number]> = {
            ahri: [20,
                30,
                50],
            annie: [20,
                25,
                50],
            brand: [20,
                30,
                50],
            lissandra: [20,
                30,
                50],
            lux: [0,
                30,
                50],
            twistedfate: [20,
                20,
                50],
            velkoz: [20,
                30,
                60],
            viktor: [10,
                35,
                60],
        }
        const ids = Object.keys(want)
        const s = mk({
            A: Object.fromEntries(ids.slice(0,
                5).map((h, i) => [h,
                i])), mana: 200
        })
        const s2 = mk({
            A: Object.fromEntries(ids.slice(5).map((h, i) => [h,
                i])), mana: 200
        })
        for (const id of ids) {
            const st = u(s,
                "A",
                id) ? s : s2
            const g = gm(st)
            const me = u(st,
                "A",
                id)
            const got = (["Q",
                "E",
                "R"] as const).map((k) => g.manaCost(me,
                cg.getHero(id)!.skills[k],
                g.skillCard(id,
                    "A",
                    k)))
            assert.deepEqual(got,
                want[id],
                `${id} mana`)
        }
    })

// ======================================================================
test("Ahri: Say Mê không trần, n tầng làm sát thương ra ×1/(1 + 0,10n), R 180 + 30% AD + 100% AP",
    () => {
        assert.equal(AHRI.CHARM_MAX,
            Infinity)
        const s = mk({
            A: {
                ahri: 2, bm_tank: 1
            }, B: {
                bm_fighter: 2
            }
        })
        const g = gm(s)
        AHRI.charm(g,
            u(s,
                "B",
                "bm_fighter"),
            10)
        AHRI.charm(g,
            u(s,
                "B",
                "bm_fighter"),
            2)
        assert.equal(g.statusV(u(s,
            "B",
            "bm_fighter"),
        AHRI.CHARM),
        12,
        "12 tầng, không trần")
        g.damage(u(s,
            "B",
            "bm_fighter"),
        u(s,
            "A",
            "bm_tank"),
        220,
        "true",
        {
            tag: "effect"
        })
        assert.equal(1000 - u(s,
            "A",
            "bm_tank").hp,
        Math.round(220 / (1 + 0.1 * 12)),
        "sát thương ra ×1/2,2, không bao giờ âm")
        // R
        const r0 = mk({
            A: {
                ahri: 2, bm_tank: 1
            }, B: {
                bm_fighter: 1
            }
        })
        const r = cast(r0,
            "ahri",
            "R",
            {
                target: "A:bm_tank"
            })
        const dmg = evs(r.ev,
            "damage").find((d) => d.target === "B:bm_fighter" && d.tag === "skill")!
        near(dmg.amount,
            gm(r0).f(u(r0,
                "A",
                "ahri"),
            "180 + 42% AD + 100% AP") * 100 / 130,
            2,
            "R")
    })

// ======================================================================
test("Annie: Q đầy Lửa tiêu 4 Lửa trước sát thương và không nạp lại; E chủ động khi đầy giữ 4 Lửa",
    () => {
        const s0 = mk({
            A: {
                annie: 2
            }, B: {
                bm_fighter: 2
            }
        })
        u(s0,
            "A",
            "annie").stacks.fire = 4
        const q = cast(s0,
            "annie",
            "Q",
            {
                target: "B:bm_fighter"
            })
        assert.equal(u(q.s,
            "A",
            "annie").stacks.fire,
        0,
        "tiêu 4, không nạp lại")
        const st = evs(q.ev,
            "status").findIndex((e) => e.id === "stun")
        const dm = evs(q.ev,
            "damage").findIndex((e) => e.target === "B:bm_fighter")
        if (st >= 0) assert.ok(q.ev.indexOf(evs(q.ev,
            "status")[st]) < q.ev.indexOf(evs(q.ev,
            "damage")[dm]),
        "Choáng thử trước sát thương")
        const e0 = mk({
            A: {
                annie: 2
            }, B: {
                bm_fighter: 2
            }
        })
        u(e0,
            "A",
            "annie").stacks.fire = 4
        const e = cast(e0,
            "annie",
            "E")
        assert.equal(u(e.s,
            "A",
            "annie").stacks.fire,
        4,
        "E chủ động khi đầy: giữ 4 Lửa")
        assert.ok(u(e.s,
            "A",
            "annie").shield > 0)
    })
test("Annie R chưa đầy Lửa: mỗi địch thử Choáng 1 lần sau sát thương, tỉ lệ ≈ d = 0,75 + 0,0005 AD + 0,0015 AP",
    () => {
        let hit = 0
        const N = 300
        for (let i = 0; i < N; i++) {
            const s = mk({
                A: {
                    annie: 2
                }, B: {
                    bm_fighter: 2
                }, seed: SEED + i * 7919
            })
            const r = cast(s,
                "annie",
                "R")
            const stuns = evs(r.ev,
                "status").filter((e) => e.id === "stun" && e.target === "B:bm_fighter")
            assert.ok(stuns.length <= 1,
                "chỉ thử 1 lần")
            if (stuns.length) {
                hit++
                assert.equal(stuns[0].turns,
                    1,
                    "d < 1: tối đa 1 đơn vị")
            }
        }
        const d = 0.75 + 0.0005 * 96
        near(hit / N,
            d,
            0.08,
            "tỉ lệ Choáng R")
    })

// ======================================================================
test("Brand: Bỏng không trần; Standby cháy đúng 1 lần dù onStandby phát lặp; Brand chết vẫn cháy qua onStandby",
    () => {
        assert.equal(BRAND.BURN_MAX,
            Infinity)
        const s = mk({
            A: {
                brand: 2
            }, B: {
                bm_fighter: 2
            }
        })
        const g = gm(s)
        const t = u(s,
            "B",
            "bm_fighter")
        BRAND.ignite(g,
            t,
            20)
        assert.equal(g.statusV(t,
            BRAND.BURN),
        20)
        const r = cast(s,
            "brand",
            "R")
        assert.equal(gm(r.s).statusV(u(r.s,
            "B",
            "bm_fighter"),
        BRAND.BURN),
        40,
        "R nhân đôi 20 → 40")
        // Standby của B: hook gọi trực tiếp, kể cả khi Brand đã chết
        const k = mk({
            A: {
                brand: 2
            }, B: {
                bm_fighter: 2
            }
        })
        const kg = gm(k)
        BRAND.ignite(kg,
            u(k,
                "B",
                "bm_fighter"),
            3)
        kg.kill(u(k,
            "A",
            "brand"))
        k.active = "B"
        k.turnNo += 1
        const hooks = cg.getHero("brand")!.hooks!
        const g2 = gm(k)
        hooks.onStandby!(g2,
            u(k,
                "A",
                "brand"),
            {
                side: "B"
            })
        // onStandby phát lại trong cùng lượt (vd 2 nguồn gọi): khoá theo lượt vẫn chỉ cháy 1 lần
        assert.equal(hooks.onTurnStart,
            undefined,
            "không còn onTurnStart dự phòng (engine phát onStandby mỗi đầu lượt, kể cả khi Brand chết)")
        hooks.onStandby!(g2,
            u(k,
                "A",
                "brand"),
            {
                side: "B"
            })
        const dots = g2.events.filter((e) => e.t === "damage" && e.tag === "dot")
        assert.equal(dots.length,
            1,
            "Brand chết vẫn cháy, đúng 1 lần mỗi Standby")
        const fighter = u(k,
            "B",
            "bm_fighter")
        near((dots[0] as Extract<cg.GameEvent, { t: "damage" }>).amount,
            3 * (fighter.maxHp * 0.01 + 2 + 0.01 * 98) * 100 / 130,
            2,
            "3 tầng × (1% Máu tối đa + 2 + 1% AD)")
        hooks.onStandby!(g2,
            u(k,
                "A",
                "brand"),
            {
                side: "A"
            })
        assert.equal(g2.events.filter((e) => e.t === "damage" && e.tag === "dot").length,
            1,
            "Standby phe Brand không cháy")
    })

// ======================================================================
test("Lissandra: sự kiện cardFrozen không lộ id/khoá chiêu, chỉ uid + tướng chủ; lá thật vẫn bị băng",
    () => {
        const s = mk({
            A: {
                lissandra: 2
            }, B: {
                brand: 2
            }
        })
        const card = give(s,
            "B",
            skill(s,
                "brand",
                "B",
                "R"))
        const g = gm(s)
        const frozen = LISS.freezeOne(g,
            "B",
            "A:lissandra")
        assert.equal(frozen?.uid,
            card.uid)
        assert.equal(s.players.B.hand[0].frozen,
            "A:lissandra")
        const ev = g.events.find((e) => e.t === "cardFrozen") as Extract<cg.GameEvent, { t: "cardFrozen" }>
        assert.ok(ev)
        const pub = ev.card as unknown as Record<string, unknown>
        assert.equal(pub.uid,
            card.uid)
        assert.equal(pub.hero,
            "brand",
            "tướng chủ công khai")
        assert.equal(pub.id,
            undefined,
            "không lộ id lá")
        assert.ok(!JSON.stringify(ev).includes("brand_r"),
            "không lộ khoá chiêu")
        // E thử Choáng khi lá chiêu của chính mục tiêu bị băng; +20 AP (Gậy Quá Khổ) để d ≥ 1, Choáng chắc chắn
        s.units["A:lissandra"].items = ["gay_qua_kho"]
        assert.ok(gm(s).scaling(s.units["A:lissandra"],
            LISS.STUN_E) >= 1)
        const e = cast(s,
            "lissandra",
            "E",
            {
                target: "B:brand"
            })
        assert.ok(evs(e.ev,
            "status").some((x) => x.id === "stun" && x.target === "B:brand"))
    })
test("Lissandra: nội tại chỉ xét sát thương chiêu/đòn thật, không xét DoT/hiệu ứng",
    () => {
        let frozen = 0
        for (let i = 0; i < 60; i++) {
            const s = mk({
                A: {
                    lissandra: 2
                }, B: {
                    bm_fighter: 2
                }, seed: SEED + i
            })
            for (let j = 0; j < 4; j++) give(s,
                "B",
                gm(s).supportCard("basic"))
            const g = gm(s)
            g.damage(u(s,
                "A",
                "lissandra"),
            u(s,
                "B",
                "bm_fighter"),
            50,
            "magic",
            {
                tag: "dot"
            })
            g.damage(u(s,
                "A",
                "lissandra"),
            u(s,
                "B",
                "bm_fighter"),
            50,
            "magic",
            {
                tag: "effect"
            })
            frozen += s.players.B.hand.filter((c) => c.frozen).length
        }
        assert.equal(frozen,
            0)
    })

// ======================================================================
test("Lux: R cam kết số nguyên 20..pool (mặc định 50), Ánh Sáng = mana thực trả; Q hồi tối đa 40",
    () => {
        const s = mk({
            A: {
                lux: 2
            }, B: {
                bm_fighter: 2
            }, mana: 120
        })
        const g = gm(s)
        const me = u(s,
            "A",
            "lux")
        const card = g.skillCard("lux",
            "A",
            "R")
        const oc = (manaSpent?: number) => ({
            g, side: "A" as const, self: me, card, args: manaSpent === undefined ? {
            } : {
                manaSpent
            }
        })
        assert.equal(LUX.rCommit(oc()),
            50,
            "mặc định 50")
        assert.equal(LUX.rCommit(oc(37)),
            37,
            "mức chọn")
        assert.equal(LUX.rCommit(oc(5)),
            20,
            "tối thiểu 20")
        assert.equal(LUX.rCommit(oc(500)),
            120,
            "không vượt mana đội")
        s.teamMana.A = 30
        assert.equal(LUX.rCommit(oc()),
            30,
            "thiếu 50 thì mặc định hạ về mana đang có")
        s.teamMana.A = 120
        const r = cast(s,
            "lux",
            "R",
            {
                target: "B:bm_fighter", manaSpent: 50
            })
        assert.equal(r.s.teamMana.A,
            70)
        assert.equal(u(r.s,
            "A",
            "lux").stacks[LUX.POOL],
        50,
        "Ánh Sáng = mana thực trả")
        // Q: hồi round(min(40, 20 + 5% AD + 10% AP)), không cộng Ánh Sáng
        const q0 = mk({
            A: {
                lux: 2
            }, B: {
                bm_fighter: 2
            }, mana: 100
        })
        const q = cast(q0,
            "lux",
            "Q")
        assert.equal(q.s.teamMana.A,
            100 + Math.round(Math.min(40,
                20 + 0.05 * 94)))
        assert.equal(u(q.s,
            "A",
            "lux").stacks[LUX.POOL] ?? 0,
        0)
        assert.ok(LUX.qRestore(gm(q0),
            u(q0,
                "A",
                "lux")) <= LUX.Q_RESTORE_CAP)
        // chi phí của đồng đội không cộng Ánh Sáng
        const t0 = mk({
            A: {
                lux: 2, brand: 1
            }, B: {
                bm_fighter: 2
            }, mana: 100
        })
        const t = cast(t0,
            "brand",
            "Q",
            {
                target: "B:bm_fighter"
            })
        assert.equal(u(t.s,
            "A",
            "lux").stacks[LUX.POOL] ?? 0,
        0,
        "đồng đội trả mana không cộng Ánh Sáng")
    })

// ======================================================================
test("Twisted Fate: R cần ≥1 lá khác trên tay; đạn = min(lá thực bỏ, 7) × (40 + 15% AD + 25% AP); E bộ thiếu rút tối đa 2",
    () => {
        const s = mk({
            A: {
                twistedfate: 2
            }, B: {
                bm_fighter: 2
            }
        })
        const r = give(s,
            "A",
            skill(s,
                "twistedfate",
                "A",
                "R"))
        assert.equal(cg.legalActions(s,
            "A").filter((a) => a.t === "play" && a.uid === r.uid).length,
        0,
        "không có đạn thì không tung")
        give(s,
            "A",
            gm(s).supportCard("basic"))
        give(s,
            "A",
            gm(s).supportCard("basic"))
        const out = play(s,
            "A",
            r)
        const hits = evs(out.ev,
            "damage").filter((d) => d.target === "B:bm_fighter" && d.tag === "skill")
        assert.equal(hits.length,
            2,
            "2 đạn")
        near(hits[0].amount,
            gm(s).f(u(s,
                "A",
                "twistedfate"),
            "40 + 21% AD + 25% AP") * 100 / 130,
            1)
        const e0 = mk({
            A: {
                twistedfate: 2
            }, B: {
                bm_fighter: 2
            }
        })
        e0.players.A.deck = e0.players.A.deck.slice(0,
            2)
        const e = cast(e0,
            "twistedfate",
            "E")
        assert.equal(e.s.players.A.hand.length,
            2,
            "bộ còn 2: rút 2, không đẩy đáy")
        assert.equal(e.s.players.A.deck.length,
            0)
    })

// ======================================================================
test("Vel'Koz: Q 1 tia phụ; R 6 tia dừng khi mục tiêu chết; Phân Rã cũ mất hiệu lực sau khi mục tiêu chết",
    () => {
        assert.equal(VK.RAYS,
            6)
        assert.equal(VK.Q_SIDE_TARGETS,
            1)
        const s = mk({
            A: {
                velkoz: 2
            }, B: {
                bm_fighter: 2, bm_tank: 1
            }
        })
        u(s,
            "B",
            "bm_fighter").hp = 60
        const r = cast(s,
            "velkoz",
            "R",
            {
                target: "B:bm_fighter"
            })
        const rays = evs(r.ev,
            "damage").filter((d) => d.tag === "skill")
        assert.ok(rays.length < VK.RAYS,
            "mục tiêu chết thì dừng")
        assert.ok(rays.every((d) => d.target === "B:bm_fighter"),
            "không đổi đích")
        // dấu cũ trước khi chết không còn hiệu lực dù Vel'Koz vắng mặt lúc đó
        const d0 = mk({
            A: {
                velkoz: 2
            }, B: {
                bm_fighter: 2
            }
        })
        const t = u(d0,
            "B",
            "bm_fighter")
        t.stacks[VK.DECAY] = 2
        t.stacks["aura:velkoz_decay_life"] = t.deaths
        t.deaths += 1
        assert.equal(VK.decayOf(gm(d0),
            t),
        0)
    })

// ======================================================================
test("Viktor: Tiến Hoá không trần; Q có lựa chọn không bỏ lá nào; mỗi lá bỏ +1 Tiến Hoá + Khiên",
    () => {
        assert.equal(VIK.MAX_EVOLVE,
            Infinity)
        const s = mk({
            A: {
                viktor: 2
            }, B: {
                bm_fighter: 2
            }
        })
        u(s,
            "A",
            "viktor").stacks[VIK.EVOLVE] = 10
        const q = give(s,
            "A",
            skill(s,
                "viktor",
                "A",
                "Q"))
        const opts = cg.legalActions(s,
            "A").filter((a) => a.t === "play" && a.uid === q.uid) as Extract<Act, { t: "play" }>[]
        assert.ok(opts.some((a) => (a.args?.discard ?? []).length === 0),
            "được chọn không bỏ lá")
        for (let i = 0; i < 3; i++) give(s,
            "A",
            gm(s).supportCard("basic"))
        const others = s.players.A.hand.filter((c) => c.uid !== q.uid).map((c) => c.uid)
        const r = play(s,
            "A",
            q,
            {
                discard: others
            })
        assert.equal(u(r.s,
            "A",
            "viktor").stacks[VIK.EVOLVE],
        13,
        "10 + 3, không trần")
        assert.ok(u(r.s,
            "A",
            "viktor").shield > 0)
    })

// ======================================================================
test("Bản EN giữ đúng công thức {…} như VI cho 8 pháp sư",
    () => {
        cg.applyCardLocale("en")
        cg.applyCardLocale("vi")
        const mine = ["ahri",
            "annie",
            "brand",
            "lissandra",
            "lux",
            "twistedfate",
            "velkoz",
            "viktor"]
        const errs = cg.checkTranslations().filter((e) => mine.some((id) => e.startsWith(`${id}.`)))
        assert.deepEqual(errs,
            [])
    })

const pad = (x: string, n: number) => (x.length >= n ? x : x + " ".repeat(n - x.length))
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${pad(r.name,
    100)}${r.note ? `\n        -> ${r.note}` : ""}`)
const fails = results.filter((r) => !r.ok).length
console.log(`\nTỔNG: ${results.length} test | PASS ${results.length - fails} | FAIL ${fails}`)
process.exit(fails ? 1 : 0)
