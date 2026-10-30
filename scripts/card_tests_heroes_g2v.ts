// Test bộ chiêu V3 của 6 tướng nhóm G2V: Blitzcrank, Braum, Leona, Malphite, Renata, Janna.
// Chạy: npx tsx scripts/card_tests_heroes_g2v.ts [--only=chuỗi] [--verbose]. Khung test chép từ scripts/card_tests.ts.
// Lưu ý: runner scripts/card_tests.ts chỉ quét card_tests_(g\d+|items|bot|v2).ts nên file này chạy riêng.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import * as BLITZ from "../packages/shared/src/cardgame/heroes/blitzcrank"
import * as BRAUM from "../packages/shared/src/cardgame/heroes/braum"
import * as LEONA from "../packages/shared/src/cardgame/heroes/leona"
import * as MALPHITE from "../packages/shared/src/cardgame/heroes/malphite"

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
// Tướng giả: không có chiêu (tank/fighter/marksman/support) + một "pháo" tung chiêu nhắm 1 tướng
// ======================================================================
const noSkill = (key: "Q" | "E" | "R") => ({
    key, name: "-", desc: "-", target: "none" as const, canPlay: () => false, resolve: () => {}
})
const NUKE = 300
for (const [id,
    role] of [["g2v_tank",
        "tank"],
    ["g2v_fighter",
        "fighter"],
    ["g2v_mark",
        "marksman"],
    ["g2v_sup",
        "support"],
    ["g2v_mage",
        "mage"]] as const) {
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
cg.defineHero({
    id: "g2v_nuker", name: "g2v_nuker", role: "fighter", damage: "physical", hp: 1000, atk: 50, armor: 30, mr: 30,
    passive: {
        name: "-", desc: "-"
    },
    skills: {
        Q: {
            key: "Q", name: "Nuke", desc: "-", target: "enemy",
            resolve(c) {
                c.g.damage(c.self,
                    c.target!,
                    NUKE,
                    "physical",
                    {
                        tag: "skill"
                    })
            },
        },
        E: noSkill("E"), R: noSkill("R"),
    },
})
const DUMMIES = ["g2v_tank",
    "g2v_fighter",
    "g2v_mark",
    "g2v_sup",
    "g2v_mage"]

// ======================================================================
// Trợ giúp dựng tình huống
// ======================================================================
const SEED = 20261030
type Setup = { A?: Record<string, number>; B?: Record<string, number>; seed?: number };
/** Ván round 8 (mở hết đường), tướng đặt thẳng vào đường; đội bù bằng tướng giả; tay và mộ hai bên rỗng */
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
    for (const side of ["A",
        "B"] as const) { s.players[side].hand = []; s.players[side].grave = [] }
    s.phase = "main"; s.opened = {
        A: true, B: true
    }
    s.firstTurnDone = {
        A: true, B: true
    } // bỏ qua bước gọi tướng + tay đầu: test tự dựng tay
    return s
}
const gm = (s: St) => new Game(s)
const u = (s: St, side: S, hero: string) => s.units[`${side}:${hero}`]
const skill = (s: St, hero: string, side: S, k: cg.SkillKey) => gm(s).skillCard(hero,
    side,
    k)
const basic = (s: St) => gm(s).supportCard("basic")
function give(s: St, side: S, ...cards: cg.Card[]) { s.players[side].hand.push(...cards); return cards[0] }
function act(s: St, a: Act): { s: St; ev: Ev } {
    const r = cg.applyAction(s,
        a)
    return {
        s: r.state, ev: r.events
    }
}
function play(s: St, side: S, card: { uid: string }, args: cg.PlayArgs = {
}) {
    return act(s,
        {
            t: "play", side, uid: card.uid, args
        })
}
/** Nối lá Quick lên chuỗi đang mở */
const chainWith = (s: St, side: S, card: { uid: string }, args: cg.PlayArgs = {
}) => act(s,
    {
        t: "chain", side, uid: card.uid, args
    })
/** Cả hai bỏ qua cho tới khi chuỗi giải quyết xong */
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
/** Bước gọi tướng úp đầu vòng (V2): chốt hết, test không gọi thêm */
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
const end = (s: St, side: S) => skipBlind(act(s,
    {
        t: "end", side
    }))
/** Chuyển sang lượt của `side` (tay hai bên bị rút thêm; test tự dọn tay sau đó) */
const toTurn = (s: St, side: S) => { while (s.active !== side) s = end(s,
    s.active).s; return s }
const evs = <T extends cg.GameEvent["t"]>(ev: Ev, t: T) => ev.filter((e) => e.t === t) as Extract<cg.GameEvent, { t: T }>[]
const dmgTo = (ev: Ev, target: string, tag?: string) => evs(ev,
    "damage").filter((d) => d.target === target && (!tag || d.tag === tag)).reduce((x, d) => x + d.amount,
    0)
const has = (s: St, side: S, hero: string, id: string) => !!u(s,
    side,
    hero).statuses[id]
const inHand = (s: St, side: S, card: { uid: string }) => s.players[side].hand.some((c) => c.uid === card.uid)
/** Sát thương vật lý mong đợi của raw lên tướng t với hệ số m */
const phys = (s: St, t: cg.Unit, raw: number, m = 1) => Math.round(raw * m * (100 / (100 + gm(s).armor(t))))
const magic = (s: St, t: cg.Unit, raw: number, m = 1) => Math.round(raw * m * (100 / (100 + gm(s).mr(t))))

/** Giá trị công thức theo chỉ số hiện tại của tướng */
const fx = (s: St, side: S, hero: string, expr: string) => gm(s).f(u(s,
    side,
    hero),
expr)
const clear = (s: St) => { for (const side of ["A",
    "B"] as const) s.players[side].hand = [] }
/** Chuyển lượt và dọn tay (lượt mới rút bài) */
const turn = (s: St, side: S) => { s = toTurn(s,
    side); clear(s); return s }
const fresh = (s: St, side: S, hero: string) => { const x = u(s,
    side,
    hero); x.hp = x.maxHp = 100000 }

// ======================================================================
G("Blitzcrank")
// ======================================================================
test("Q cướp lá chung: về tay Blitz, Blitz nhận Khiên, không gây sát thương",
    () => {
        let s = mk({
            A: {
                blitzcrank: 2
            }, B: {
                leona: 1
            }
        })
        const b = give(s,
            "B",
            basic(s))
        const want = Math.round(fx(s,
            "A",
            "blitzcrank",
            BLITZ.F_SHIELD))
        s = settle(play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "blitzcrank",
                    "A",
                    "Q")),
            {
            })).s
        assert.ok(inHand(s,
            "A",
            b))
        assert.equal(u(s,
            "A",
            "blitzcrank").shield,
        want)
        assert.equal(u(s,
            "B",
            "leona").hp,
        u(s,
            "B",
            "leona").maxHp)
    })
test("Q cướp lá chiêu: Đốt vào mộ chủ, thành Q/E của tướng mình, chủ lá nhận sát thương phép; chủ chưa ra sân thì địch ngẫu nhiên",
    () => {
        let s = mk({
            A: {
                blitzcrank: 2
            }, B: {
                leona: 1
            }
        })
        const lq = give(s,
            "B",
            skill(s,
                "leona",
                "B",
                "Q"))
        const raw = fx(s,
            "A",
            "blitzcrank",
            BLITZ.F_Q)
        s = settle(play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "blitzcrank",
                    "A",
                    "Q")),
            {
            })).s
        assert.ok(s.players.B.grave.some((c) => c.uid === lq.uid))
        const got = s.players.A.hand[0]
        assert.ok(got && got.kind === "skill" && got.hero === "blitzcrank" && /_(q|e)$/.test(got.id))
        const l = u(s,
            "B",
            "leona")
        assert.equal(l.maxHp - l.hp,
            magic(s,
                l,
                raw))
        // chủ lá (Braum) chưa ra sân: sát thương vào tướng địch còn sống (Leona)
        let s2 = mk({
            A: {
                blitzcrank: 2
            }, B: {
                leona: 1
            }
        })
        give(s2,
            "B",
            skill(s2,
                "braum",
                "B",
                "Q"))
        s2 = settle(play(s2,
            "A",
            give(s2,
                "A",
                skill(s2,
                    "blitzcrank",
                    "A",
                    "Q")),
            {
            })).s
        assert.ok(u(s2,
            "B",
            "leona").hp < u(s2,
            "B",
            "leona").maxHp)
    })
test("E (Quick): huỷ chiêu địch, giật lá, tướng tung chiêu Choáng; chiêu không gây sát thương",
    () => {
        let s = mk({
            A: {
                blitzcrank: 2
            }, B: {
                g2v_nuker: 2
            }
        })
        s = turn(s,
            "B")
        const q = give(s,
            "B",
            skill(s,
                "g2v_nuker",
                "B",
                "Q"))
        const e = give(s,
            "A",
            skill(s,
                "blitzcrank",
                "A",
                "E"))
        let r = play(s,
            "B",
            q,
            {
                target: "A:blitzcrank"
            })
        assert.equal(r.s.phase,
            "chain")
        r = settle(chainWith(r.s,
            "A",
            e,
            {
            }))
        s = r.s
        assert.equal(u(s,
            "A",
            "blitzcrank").hp,
        u(s,
            "A",
            "blitzcrank").maxHp - 0)
        assert.ok(s.players.B.grave.some((c) => c.uid === q.uid),
            "lá bị Đốt vào mộ chủ")
        assert.ok(has(s,
            "B",
            "g2v_nuker",
            "stun"),
        "kẻ tung chiêu bị Choáng")
        assert.ok(u(s,
            "A",
            "blitzcrank").shield > 0,
        "Khiên nội tại")
        assert.ok(s.players.A.hand.some((c) => c.kind === "skill" && c.hero === "blitzcrank"),
            "thành lá Q/E của Blitz")
    })
test("R: Xem Tay + tướng có chiêu trên tay địch nhận sát thương phép và Choáng; tướng khác không",
    () => {
        let s = mk({
            A: {
                blitzcrank: 2
            }, B: {
                g2v_nuker: 2, leona: 1
            }
        })
        give(s,
            "B",
            skill(s,
                "g2v_nuker",
                "B",
                "Q"))
        const raw = fx(s,
            "A",
            "blitzcrank",
            BLITZ.F_R)
        s = settle(play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "blitzcrank",
                    "A",
                    "R")),
            {
            })).s
        const n = u(s,
            "B",
            "g2v_nuker")
        assert.equal(n.maxHp - n.hp,
            magic(s,
                n,
                raw))
        assert.ok(has(s,
            "B",
            "g2v_nuker",
            "stun"))
        assert.ok(gm(s).handRevealed("B"))
        assert.equal(u(s,
            "B",
            "leona").hp,
        u(s,
            "B",
            "leona").maxHp)
        assert.ok(!has(s,
            "B",
            "leona",
            "stun"))
    })

// ======================================================================
G("Braum")
// ======================================================================
test("Nội tại: đòn đánh trúng Braum +1 Song Giáp (+1.5 Giáp/Kháng Phép); chiêu thì không",
    () => {
        let s = mk({
            A: {
                braum: 2, g2v_tank: 1
            }, B: {
                g2v_mark: 3, g2v_nuker: 1
            }
        })
        s = turn(s,
            "B")
        const a = give(s,
            "B",
            basic(s))
        s = settle(play(s,
            "B",
            a,
            {
                actor: "B:g2v_mark", target: "A:braum"
            })).s
        assert.equal(u(s,
            "A",
            "braum").stacks.braum_dual,
        1)
        assert.equal(gm(s).stats(u(s,
            "A",
            "braum")).armor,
        1.5)
        assert.equal(gm(s).stats(u(s,
            "A",
            "braum")).mr,
        1.5)
        s = settle(play(s,
            "B",
            give(s,
                "B",
                skill(s,
                    "g2v_nuker",
                    "B",
                    "Q")),
            {
                target: "A:braum"
            })).s
        assert.equal(u(s,
            "A",
            "braum").stacks.braum_dual,
        1)
    })
test("Q: sát thương phép + Dấu Băng tới hết lượt hiện tại; đòn thật đồng minh khác tiêu dấu: Choáng và Braum +2 Song Giáp, lần hai không",
    () => {
        let s = mk({
            A: {
                braum: 2, g2v_mark: 3
            }, B: {
                g2v_tank: 3
            }
        })
        fresh(s,
            "B",
            "g2v_tank")
        const raw = fx(s,
            "A",
            "braum",
            BRAUM.F_Q)
        s = settle(play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "braum",
                    "A",
                    "Q")),
            {
                target: "B:g2v_tank"
            })).s
        const t = u(s,
            "B",
            "g2v_tank")
        assert.equal(t.maxHp - t.hp,
            magic(s,
                t,
                raw))
        assert.equal(gm(s).marksOn(t,
            "braum_mark").length,
        1)
        s = settle(play(s,
            "A",
            give(s,
                "A",
                basic(s)),
            {
                actor: "A:g2v_mark", target: "B:g2v_tank"
            })).s
        assert.ok(has(s,
            "B",
            "g2v_tank",
            "stun"))
        assert.equal(u(s,
            "A",
            "braum").stacks.braum_dual,
        2)
        s = settle(play(s,
            "A",
            give(s,
                "A",
                basic(s)),
            {
                actor: "A:g2v_mark", target: "B:g2v_tank"
            })).s
        assert.equal(u(s,
            "A",
            "braum").stacks.braum_dual,
        2)
    })
test("E (Quick): Đỡ Thay đòn lên đồng minh, +2 Song Giáp, nhận Khiên",
    () => {
        let s = mk({
            A: {
                braum: 2, g2v_tank: 1
            }, B: {
                g2v_mark: 3
            }
        })
        s = turn(s,
            "B")
        const e = give(s,
            "A",
            skill(s,
                "braum",
                "A",
                "E"))
        const shield = Math.round(fx(s,
            "A",
            "braum",
            BRAUM.F_E_SHIELD))
        let r = play(s,
            "B",
            give(s,
                "B",
                basic(s)),
            {
                actor: "B:g2v_mark", target: "A:g2v_tank"
            })
        assert.equal(r.s.phase,
            "chain")
        r = settle(chainWith(r.s,
            "A",
            e,
            {
            }))
        s = r.s
        assert.equal(u(s,
            "A",
            "g2v_tank").hp,
        u(s,
            "A",
            "g2v_tank").maxHp)
        const b = u(s,
            "A",
            "braum")
        assert.equal(b.stacks.braum_dual,
            3,
            "+2 từ E, +1 vì bị đánh")
        assert.equal(b.hp,
            b.maxHp)
        assert.equal(b.shield,
            shield - dmgTo(r.ev,
                "A:braum"))
    })
test("R: không chọn tay; tâm là địch đối diện (Choáng ≥ 1 đơn vị); d phụ = 0,25 + 0,015/100 Máu + 0,015/10 Giáp + 0,1% AP, đủ ≥ 1 thì Choáng cả đội địch",
    () => {
        let s = mk({
            A: {
                braum: 2
            }, B: {
                g2v_tank: 2, g2v_mark: 3
            }
        })
        const card = (st: St) => give(st,
            "A",
            skill(st,
                "braum",
                "A",
                "R"))
        const r0 = card(s)
        const opts = cg.legalActions(s,
            "A").filter((x) => x.t === "play" && x.uid === r0.uid)
        s.players.A.hand = []
        assert.equal(opts.length,
            1,
            "chỉ một cách đánh, không chọn mục tiêu")
        const c1 = structuredClone(s)
        const s1 = settle(play(c1,
            "A",
            card(c1),
            {
            })).s
        assert.ok(has(s1,
            "B",
            "g2v_tank",
            "stun"),
        "tâm = địch đối diện luôn Choáng")
        u(s,
            "A",
            "braum").maxHp = 100000 // d phụ ≥ 1: chắc chắn Choáng
        s = settle(play(s,
            "A",
            card(s),
            {
            })).s
        assert.ok(has(s,
            "B",
            "g2v_tank",
            "stun") && has(s,
            "B",
            "g2v_mark",
            "stun"))
    })

// ======================================================================
G("Leona")
// ======================================================================
test("Q: sát thương vật lý + Choáng + Nắng; R: sát thương mọi địch + Nắng, kẻ đã có Nắng thì Choáng",
    () => {
        let s = mk({
            A: {
                leona: 2
            }, B: {
                g2v_tank: 2, g2v_mark: 3, g2v_sup: 1
            }
        })
        for (const h of ["g2v_tank",
            "g2v_mark",
            "g2v_sup"]) fresh(s,
            "B",
            h)
        const rawQ = fx(s,
            "A",
            "leona",
            LEONA.F_Q)
        s = settle(play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "leona",
                    "A",
                    "Q")),
            {
            })).s
        const t = u(s,
            "B",
            "g2v_tank")
        assert.equal(t.maxHp - t.hp,
            phys(s,
                t,
                rawQ))
        assert.ok(has(s,
            "B",
            "g2v_tank",
            "stun") && has(s,
            "B",
            "g2v_tank",
            "sun"))
        delete t.statuses.stun
        s = settle(play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "leona",
                    "A",
                    "R")),
            {
            })).s
        assert.ok(has(s,
            "B",
            "g2v_tank",
            "stun"),
        "đã có Nắng thì Choáng")
        assert.ok(!has(s,
            "B",
            "g2v_mark",
            "stun") && !has(s,
            "B",
            "g2v_sup",
            "stun"))
        assert.ok(has(s,
            "B",
            "g2v_mark",
            "sun") && has(s,
            "B",
            "g2v_sup",
            "sun"))
    })
test("Nội tại: đồng minh khác đánh trúng địch có Nắng gây thêm sát thương rồi Nắng tan; Leona tự đánh không dùng Nắng",
    () => {
        let s = mk({
            A: {
                leona: 2, g2v_mark: 3
            }, B: {
                g2v_tank: 2
            }
        })
        fresh(s,
            "B",
            "g2v_tank")
        s = settle(play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "leona",
                    "A",
                    "Q")),
            {
            })).s
        s = settle(play(s,
            "A",
            give(s,
                "A",
                basic(s)),
            {
                actor: "A:leona", target: "B:g2v_tank"
            })).s
        assert.ok(has(s,
            "B",
            "g2v_tank",
            "sun"),
        "Leona tự đánh: Nắng còn")
        const bonus = fx(s,
            "A",
            "leona",
            LEONA.F_SUN)
        const r = settle(play(s,
            "A",
            give(s,
                "A",
                basic(s)),
            {
                actor: "A:g2v_mark", target: "B:g2v_tank"
            }))
        assert.ok(!has(r.s,
            "B",
            "g2v_tank",
            "sun"))
        const extra = evs(r.ev,
            "damage").filter((d) => d.src === "A:leona" && d.tag === "effect").reduce((x, d) => x + d.amount,
            0)
        assert.equal(extra,
            phys(r.s,
                u(r.s,
                    "B",
                    "g2v_tank"),
                bonus))
    })
test("E (Quick) Nhật Thực: +60 Giáp/Kháng Phép, hứng sát thương lên đồng đội, cuối lượt địch trả 40% + công thức và gắn Nắng",
    () => {
        let s = mk({
            A: {
                leona: 2, g2v_tank: 1
            }, B: {
                g2v_mark: 3
            }
        })
        fresh(s,
            "B",
            "g2v_mark")
        const before = gm(s).armor(u(s,
            "A",
            "leona"))
        s = settle(play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "leona",
                    "A",
                    "E")),
            {
            })).s
        assert.equal(gm(s).armor(u(s,
            "A",
            "leona")),
        before + 60)
        s = turn(s,
            "B")
        const r = settle(play(s,
            "B",
            give(s,
                "B",
                basic(s)),
            {
                actor: "B:g2v_mark", target: "A:g2v_tank"
            }))
        s = r.s
        assert.equal(u(s,
            "A",
            "g2v_tank").hp,
        u(s,
            "A",
            "g2v_tank").maxHp,
        "đồng đội không mất máu")
        const l = u(s,
            "A",
            "leona")
        assert.ok(l.hp < l.maxHp,
            "Leona hứng")
        const stored = gm(s).guardStored(l)
        assert.ok(stored > 0)
        const m = u(s,
            "B",
            "g2v_mark")
        const hp0 = m.hp
        const e = end(s,
            "B")
        const lost = hp0 - u(e.s,
            "B",
            "g2v_mark").hp
        assert.equal(lost,
            phys(e.s,
                u(e.s,
                    "B",
                    "g2v_mark"),
                stored * 0.4 + fx(e.s,
                    "A",
                    "leona",
                    LEONA.F_E_BACK)))
        assert.ok(has(e.s,
            "B",
            "g2v_mark",
            "sun"))
    })

// ======================================================================
G("Malphite")
// ======================================================================
test("Nội tại: đầu lượt nhận Khiên (5% máu tối đa + 100% Giáp), không cộng dồn",
    () => {
        let s = mk({
            A: {
                malphite: 2
            }, B: {
                g2v_tank: 2
            }
        })
        s = turn(turn(s,
            "B"),
        "A")
        const m = u(s,
            "A",
            "malphite")
        const want = Math.round(0.05 * m.maxHp + gm(s).armor(m))
        assert.equal(m.shield,
            want)
        s = turn(turn(s,
            "B"),
        "A")
        assert.equal(u(s,
            "A",
            "malphite").shield,
        want)
    })
test("Q: sát thương phép theo Giáp, lấy 15 Giáp của địch (Malphite +15, địch chịu vật lý nặng hơn) tới hết lượt sau",
    () => {
        let s = mk({
            A: {
                malphite: 2
            }, B: {
                g2v_nuker: 2
            }
        })
        fresh(s,
            "B",
            "g2v_nuker")
        const raw = fx(s,
            "A",
            "malphite",
            MALPHITE.F_Q)
        const a0 = gm(s).armor(u(s,
            "A",
            "malphite"))
        const foeArmor0 = gm(s).armor(u(s,
            "B",
            "g2v_nuker"))
        s = settle(play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "malphite",
                    "A",
                    "Q")),
            {
                target: "B:g2v_nuker"
            })).s
        const n = u(s,
            "B",
            "g2v_nuker")
        assert.equal(n.maxHp - n.hp,
            magic(s,
                n,
                raw))
        assert.equal(gm(s).armor(u(s,
            "A",
            "malphite")),
        a0 + 15)
        const A = gm(s).armor(n)
        // Giáp thật của nó giảm 15 (status armor_down), sát thương vật lý tính theo Giáp đã giảm
        assert.equal(A,
            foeArmor0 - 15)
        const g = gm(s)
        g.damage(u(s,
            "A",
            "malphite"),
        n,
        1000,
        "physical",
        {
            tag: "effect"
        })
        const dealt = evs(g.events,
            "damage").pop()!.amount
        assert.equal(dealt,
            Math.round(1000 * 100 / (100 + A)))
        s = end(end(s,
            "A").s,
        "B").s
        assert.equal(gm(s).armor(u(s,
            "A",
            "malphite")),
        a0,
        "hết hiệu lực")
    })
test(`E (Quick): bị đánh thì +(${MALPHITE.F_E_ARMOR}) Giáp tới hết lượt và kẻ đánh nhận sát thương phép theo Giáp`,
    () => {
        let s = mk({
            A: {
                malphite: 2
            }, B: {
                g2v_mark: 3
            }
        })
        fresh(s,
            "B",
            "g2v_mark")
        s = turn(s,
            "B")
        const a0 = gm(s).armor(u(s,
            "A",
            "malphite"))
        const eArmor = fx(s,
            "A",
            "malphite",
            MALPHITE.F_E_ARMOR)
        const e = give(s,
            "A",
            skill(s,
                "malphite",
                "A",
                "E"))
        let r = play(s,
            "B",
            give(s,
                "B",
                basic(s)),
            {
                actor: "B:g2v_mark", target: "A:malphite"
            })
        assert.equal(r.s.phase,
            "chain")
        r = settle(chainWith(r.s,
            "A",
            e,
            {
            }))
        s = r.s
        const m = u(s,
            "A",
            "malphite")
        assert.equal(gm(s).armor(m),
            Math.round(a0 + eArmor))
        const hit = u(s,
            "B",
            "g2v_mark")
        assert.equal(hit.maxHp - hit.hp,
            magic(s,
                hit,
                fx(s,
                    "A",
                    "malphite",
                    MALPHITE.F_E_DMG)))
    })
test("R: mọi địch nhận sát thương phép theo Giáp; xác suất Choáng 15% + 1% mỗi 10 Giáp (đủ 100% thì Choáng hết)",
    () => {
        let s = mk({
            A: {
                malphite: 2
            }, B: {
                g2v_tank: 2, g2v_mark: 3
            }
        })
        fresh(s,
            "B",
            "g2v_tank"); fresh(s,
            "B",
            "g2v_mark")
        u(s,
            "A",
            "malphite").stacks.bonusRes = 900
        const raw = fx(s,
            "A",
            "malphite",
            MALPHITE.F_R)
        s = settle(play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "malphite",
                    "A",
                    "R")),
            {
            })).s
        for (const h of ["g2v_tank",
            "g2v_mark"]) {
            const t = u(s,
                "B",
                h)
            assert.equal(t.maxHp - t.hp,
                magic(s,
                    t,
                    raw))
            assert.ok(has(s,
                "B",
                h,
                "stun"))
        }
    })

// ======================================================================
// Renata, Janna: kit cân bằng starci-33 (support v7) được kiểm thử trong scripts/card_tests_balance_support.ts
// ======================================================================

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
