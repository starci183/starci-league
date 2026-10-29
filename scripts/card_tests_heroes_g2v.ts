// Test cơ chế đặc trưng V2 của 6 tướng nhóm G2V: Blitzcrank, Braum, Leona, Malphite, Renata, Janna.
// Chạy: npx tsx scripts/card_tests_heroes_g2v.ts [--only=chuỗi] [--verbose]. Khung test chép từ scripts/card_tests.ts.
// Lưu ý: runner scripts/card_tests.ts chỉ quét card_tests_(g\d+|items|bot|v2).ts nên file này chạy riêng.
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

// ======================================================================
G("Blitzcrank")
// ======================================================================
test("Q cướp lá chung về tay Blitz; lá chiêu bị Đốt vào mộ chủ và tướng đó Choáng",
    () => {
        let s = mk({
            A: {
                blitzcrank: 2
            }, B: {
                braum: 1
            }
        })
        const b = give(s,
            "B",
            basic(s))
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "blitzcrank",
                    "A",
                    "Q")),
            {
            }).s
        assert.ok(inHand(s,
            "A",
            b),
        "lá chung về tay Blitz")
        assert.equal(s.players.B.hand.length,
            0)
        const sk = give(s,
            "B",
            skill(s,
                "braum",
                "B",
                "Q"))
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "blitzcrank",
                    "A",
                    "Q")),
            {
            }).s
        assert.ok(!inHand(s,
            "A",
            sk),
        "lá chiêu không về tay Blitz")
        assert.ok(s.players.B.grave.some((c) => c.uid === sk.uid),
            "lá chiêu bị Đốt vào mộ chủ")
        assert.ok(has(s,
            "B",
            "braum",
            "stun"),
        "Braum Choáng")
    })
test("R lộ tay địch, Choáng tướng có chiêu trên tay; Q khi tay lộ cho chọn lá",
    () => {
        let s = mk({
            A: {
                blitzcrank: 2
            }, B: {
                braum: 1, g2v_nuker: 3
            }
        })
        const b = give(s,
            "B",
            basic(s))
        give(s,
            "B",
            skill(s,
                "braum",
                "B",
                "Q"))
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "blitzcrank",
                    "A",
                    "R")),
            {
            }).s
        assert.ok(gm(s).handRevealed("B"),
            "tay B đang lộ")
        assert.ok(has(s,
            "B",
            "braum",
            "stun"),
        "Braum có chiêu trên tay nên Choáng")
        assert.ok(!has(s,
            "B",
            "g2v_nuker",
            "stun"),
        "tướng không có chiêu trên tay thì không Choáng")
        const q = give(s,
            "A",
            skill(s,
                "blitzcrank",
                "A",
                "Q"))
        const opts = cg.legalActions(s,
            "A").filter((a) => a.t === "play" && a.uid === q.uid)
        assert.equal(opts.length,
            2,
            "mỗi loại lá trên tay địch là 1 lựa chọn")
        s = play(s,
            "A",
            q,
            {
                pick: b.uid
            }).s
        assert.ok(inHand(s,
            "A",
            b),
        "cướp đúng lá chọn")
    })
test("E (Quick) giật lá Đánh thường của địch: đòn bị huỷ, Blitz nhận lá",
    () => {
        let s = mk({
            A: {
                blitzcrank: 1, g2v_tank: 2
            }, B: {
                g2v_fighter: 2
            }
        })
        const e = give(s,
            "A",
            skill(s,
                "blitzcrank",
                "A",
                "E"))
        s = toTurn(s,
            "B")
        s.players.A.hand = [e]
        s.players.B.hand = []
        const strike = give(s,
            "B",
            basic(s))
        let r = play(s,
            "B",
            strike,
            {
                actor: "B:g2v_fighter", target: "A:g2v_tank"
            })
        assert.equal(r.s.phase,
            "chain")
        r = settle(chainWith(r.s,
            "A",
            e))
        assert.equal(dmgTo(r.ev,
            "A:g2v_tank"),
        0,
        "đòn bị huỷ")
        assert.ok(r.s.players.A.hand.some((c) => c.uid === strike.uid),
            "Blitz nhận chính lá Đánh thường đó")
    })
test("E giật lá chiêu: lá bị Đốt vào mộ chủ, không có sát thương, tướng tung bị Choáng",
    () => {
        let s = mk({
            A: {
                blitzcrank: 1, g2v_tank: 2
            }, B: {
                g2v_nuker: 2
            }
        })
        const e = give(s,
            "A",
            skill(s,
                "blitzcrank",
                "A",
                "E"))
        s = toTurn(s,
            "B")
        s.players.A.hand = [e]
        s.players.B.hand = []
        const nuke = give(s,
            "B",
            skill(s,
                "g2v_nuker",
                "B",
                "Q"))
        let r = play(s,
            "B",
            nuke,
            {
                target: "A:g2v_tank"
            })
        assert.equal(r.s.phase,
            "chain")
        r = settle(chainWith(r.s,
            "A",
            e))
        assert.equal(dmgTo(r.ev,
            "A:g2v_tank"),
        0)
        assert.ok(!r.s.players.A.hand.some((c) => c.uid === nuke.uid),
            "lá chiêu không về tay Blitz")
        assert.ok(r.s.players.B.grave.some((c) => c.uid === nuke.uid),
            "lá chiêu vào mộ chủ")
        assert.ok(has(r.s,
            "B",
            "g2v_nuker",
            "stun"))
    })

// ======================================================================
G("Braum")
// ======================================================================
test("Nội tại: đòn đánh trúng Braum +1 Vững; mỗi Vững giảm 10% sát thương (tối đa 6)",
    () => {
        let s = mk({
            A: {
                braum: 2
            }, B: {
                g2v_fighter: 2
            }
        })
        s = toTurn(s,
            "B")
        const t = u(s,
            "A",
            "braum")
        gm(s).setStack(t,
            "braum_steady",
            6)
        s.players.B.hand = []
        const r = settle(play(s,
            "B",
            give(s,
                "B",
                basic(s)),
            {
                actor: "B:g2v_fighter", target: "A:braum"
            }))
        assert.equal(dmgTo(r.ev,
            "A:braum"),
        phys(s,
            t,
            50,
            0.4),
        "6 Vững = −60%")
        assert.equal(u(r.s,
            "A",
            "braum").stacks.braum_steady,
        6,
        "đã tối đa 6")
        const s2 = mk({
            A: {
                braum: 2
            }, B: {
                g2v_fighter: 2
            }
        })
        const s3 = toTurn(s2,
            "B")
        s3.players.B.hand = []
        const r2 = settle(play(s3,
            "B",
            give(s3,
                "B",
                basic(s3)),
            {
                actor: "B:g2v_fighter", target: "A:braum"
            }))
        assert.equal(u(r2.s,
            "A",
            "braum").stacks.braum_steady,
        1,
        "trúng 1 đòn = +1 Vững")
    })
test("Q (Quick) Đỡ Thay chiêu nhắm đồng minh: Braum nhận chiêu đó, +2 Vững",
    () => {
        let s = mk({
            A: {
                braum: 1, g2v_tank: 2
            }, B: {
                g2v_nuker: 2
            }
        })
        const q = give(s,
            "A",
            skill(s,
                "braum",
                "A",
                "Q"))
        s = toTurn(s,
            "B")
        s.players.A.hand = [q]
        s.players.B.hand = []
        let r = play(s,
            "B",
            give(s,
                "B",
                skill(s,
                    "g2v_nuker",
                    "B",
                    "Q")),
            {
                target: "A:g2v_tank"
            })
        assert.equal(r.s.phase,
            "chain")
        r = settle(chainWith(r.s,
            "A",
            q))
        assert.equal(dmgTo(r.ev,
            "A:g2v_tank"),
        0,
        "đồng minh không bị trúng")
        assert.ok(dmgTo(r.ev,
            "A:braum") > 0,
        "Braum hứng")
        assert.equal(u(r.s,
            "A",
            "braum").stacks.braum_steady,
        2,
        "chiêu không nạp Vững, chỉ +2 từ Q")
    })
test("E (Quick) tính Vững ×2 tới hết lượt (tối đa giảm 80%)",
    () => {
        let s = mk({
            A: {
                braum: 2
            }, B: {
                g2v_fighter: 2
            }
        })
        const e = give(s,
            "A",
            skill(s,
                "braum",
                "A",
                "E"))
        s = toTurn(s,
            "B")
        s.players.A.hand = [e]
        s.players.B.hand = []
        const t = u(s,
            "A",
            "braum")
        gm(s).setStack(t,
            "braum_steady",
            5)
        let r = play(s,
            "B",
            give(s,
                "B",
                basic(s)),
            {
                actor: "B:g2v_fighter", target: "A:braum"
            })
        assert.equal(r.s.phase,
            "chain")
        r = settle(chainWith(r.s,
            "A",
            e))
        assert.equal(dmgTo(r.ev,
            "A:braum"),
        phys(s,
            t,
            50,
            0.2),
        "5 Vững ×2 = trần −80%")
    })
test("R (Quick) giảm sát thương mọi đồng minh theo Vững của Braum tới hết lượt địch",
    () => {
        let s = mk({
            A: {
                braum: 1, g2v_tank: 2
            }, B: {
                g2v_fighter: 2
            }
        })
        const r0 = give(s,
            "A",
            skill(s,
                "braum",
                "A",
                "R"))
        gm(s).setStack(u(s,
            "A",
            "braum"),
        "braum_steady",
        4)
        s = settle(play(s,
            "A",
            r0)).s
        s = toTurn(s,
            "B")
        s.players.A.hand = []
        s.players.B.hand = []
        const t = u(s,
            "A",
            "g2v_tank")
        const r = settle(play(s,
            "B",
            give(s,
                "B",
                basic(s)),
            {
                actor: "B:g2v_fighter", target: "A:g2v_tank"
            }))
        assert.equal(dmgTo(r.ev,
            "A:g2v_tank"),
        phys(s,
            t,
            50,
            0.6),
        "4 Vững = đồng minh −40%")
    })

// ======================================================================
G("Leona")
// ======================================================================
test("Nội tại: đòn đánh của Leona +1 Nắng; đủ 3 Nắng thì Choáng 1 lượt và mất hết Nắng",
    () => {
        let s = mk({
            A: {
                leona: 2
            }, B: {
                g2v_tank: 2
            }
        })
        for (let i = 1; i <= 3; i++) {
            s = settle(play(s,
                "A",
                give(s,
                    "A",
                    basic(s)),
                {
                    actor: "A:leona", target: "B:g2v_tank"
                })).s
            if (i < 3) assert.equal(gm(s).statusV(u(s,
                "B",
                "g2v_tank"),
            "sun"),
            i)
        }
        assert.ok(!has(s,
            "B",
            "g2v_tank",
            "sun"),
        "mất hết Nắng")
        assert.ok(has(s,
            "B",
            "g2v_tank",
            "stun"),
        "Choáng")
    })
test("Q đặt 2 Nắng lên 1 địch: thêm 1 đòn đánh là Choáng",
    () => {
        let s = mk({
            A: {
                leona: 2
            }, B: {
                g2v_tank: 2
            }
        })
        s = settle(play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "leona",
                    "A",
                    "Q")),
            {
                target: "B:g2v_tank"
            })).s
        assert.equal(gm(s).statusV(u(s,
            "B",
            "g2v_tank"),
        "sun"),
        2)
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
            "stun"))
    })
test("E: lượt này đòn đánh của đồng minh +1 Nắng lên mục tiêu (Leona không tính đôi)",
    () => {
        let s = mk({
            A: {
                leona: 2, g2v_mark: 0
            }, B: {
                g2v_tank: 2, g2v_mage: 3
            }
        })
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
        s = settle(play(s,
            "A",
            give(s,
                "A",
                basic(s)),
            {
                actor: "A:g2v_mark", target: "B:g2v_tank"
            })).s
        assert.equal(gm(s).statusV(u(s,
            "B",
            "g2v_tank"),
        "sun"),
        1,
        "đòn của đồng minh +1 Nắng")
        s = settle(play(s,
            "A",
            give(s,
                "A",
                basic(s)),
            {
                actor: "A:leona", target: "B:g2v_tank"
            })).s
        assert.equal(gm(s).statusV(u(s,
            "B",
            "g2v_tank"),
        "sun"),
        2,
        "đòn của Leona chỉ +1")
    })
test("R: mọi địch +2 Nắng; địch đã có Nắng thì Choáng ngay",
    () => {
        let s = mk({
            A: {
                leona: 2
            }, B: {
                g2v_tank: 2, g2v_mage: 3
            }
        })
        gm(s).status(u(s,
            "B",
            "g2v_tank"),
        "sun",
        1,
        {
            v: 1, until: cg.FOREVER
        })
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
        assert.equal(gm(s).statusV(u(s,
            "B",
            "g2v_mage"),
        "sun"),
        2,
        "địch khác +2 Nắng")
    })

// ======================================================================
G("Malphite")
// ======================================================================
test("Nội tại: nhận ít hơn 5% sát thương cho mỗi lá trên tay bạn (10 lá = −50%)",
    () => {
        let s = mk({
            A: {
                malphite: 2
            }, B: {
                g2v_fighter: 2
            }
        })
        s = toTurn(s,
            "B")
        s.players.A.hand = []
        for (let i = 0; i < 10; i++) give(s,
            "A",
            basic(s))
        s.players.B.hand = []
        const t = u(s,
            "A",
            "malphite")
        const r = settle(play(s,
            "B",
            give(s,
                "B",
                basic(s)),
            {
                actor: "B:g2v_fighter", target: "A:malphite"
            }))
        assert.equal(dmgTo(r.ev,
            "A:malphite"),
        phys(s,
            t,
            50,
            0.5))
    })
test("Q: sát thương phép theo số lá còn trên tay bạn",
    () => {
        const s = mk({
            A: {
                malphite: 2
            }, B: {
                g2v_tank: 2
            }
        })
        const q = give(s,
            "A",
            skill(s,
                "malphite",
                "A",
                "Q"))
        for (let i = 0; i < 4; i++) give(s,
            "A",
            basic(s))
        const me = u(s,
            "A",
            "malphite")
        const per = gm(s).f(me,
            "12 + 18% AD")
        const r = settle(play(s,
            "A",
            q,
            {
                target: "B:g2v_tank"
            }))
        assert.equal(dmgTo(r.ev,
            "B:g2v_tank"),
        magic(s,
            u(s,
                "B",
                "g2v_tank"),
            4 * per))
        assert.equal(r.s.players.A.hand.length,
            4,
            "không mất lá nào trên tay")
    })
test("E (Quick): khi Malphite bị đánh, rút 2 lá trước khi tính sát thương",
    () => {
        let s = mk({
            A: {
                malphite: 2
            }, B: {
                g2v_fighter: 2
            }
        })
        const e = skill(s,
            "malphite",
            "A",
            "E")
        s = toTurn(s,
            "B")
        s.players.A.hand = [e,
            basic(s),
            basic(s),
            basic(s)]
        s.players.B.hand = []
        const t = u(s,
            "A",
            "malphite")
        let r = play(s,
            "B",
            give(s,
                "B",
                basic(s)),
            {
                actor: "B:g2v_fighter", target: "A:malphite"
            })
        assert.equal(r.s.phase,
            "chain")
        r = settle(chainWith(r.s,
            "A",
            e))
        assert.equal(r.s.players.A.hand.length,
            5,
            "3 lá còn lại + rút 2")
        assert.equal(dmgTo(r.ev,
            "A:malphite"),
        phys(s,
            t,
            50,
            0.75),
        "đã tính 5 lá trên tay")
    })
test("R: bỏ toàn bộ tay vào mộ, mọi địch nhận sát thương ×2 theo số lá đã bỏ",
    () => {
        const s = mk({
            A: {
                malphite: 2
            }, B: {
                g2v_tank: 2, g2v_mage: 3
            }
        })
        const r0 = give(s,
            "A",
            skill(s,
                "malphite",
                "A",
                "R"))
        for (let i = 0; i < 4; i++) give(s,
            "A",
            basic(s))
        const per = gm(s).f(u(s,
            "A",
            "malphite"),
        "12 + 18% AD")
        const r = settle(play(s,
            "A",
            r0,
            {
            }))
        assert.equal(r.s.players.A.hand.length,
            0)
        assert.ok(r.s.players.A.grave.length >= 5,
            "tay + lá R vào mộ")
        for (const id of ["g2v_tank",
            "g2v_mage"]) assert.equal(dmgTo(r.ev,
            `B:${id}`),
        magic(s,
            u(s,
                "B",
                id),
            4 * 2 * per))
    })

// ======================================================================
G("Renata")
// ======================================================================
test("Nội tại: đồng minh sắp bị hạ hồi sinh 25% máu, Điên + Đòn Miễn Phí; chỉ 1 lần mỗi đồng minh",
    () => {
        let s = mk({
            A: {
                renata: 1, g2v_tank: 2
            }, B: {
                g2v_fighter: 2
            }
        })
        s = toTurn(s,
            "B")
        s.players.B.hand = []
        const t = u(s,
            "A",
            "g2v_tank")
        t.hp = 1
        s = settle(play(s,
            "B",
            give(s,
                "B",
                basic(s)),
            {
                actor: "B:g2v_fighter", target: "A:g2v_tank"
            })).s
        const t1 = u(s,
            "A",
            "g2v_tank")
        assert.equal(t1.status,
            "board",
            "không bị hạ")
        assert.equal(t1.hp,
            Math.round(t1.maxHp * 0.25))
        assert.ok(t1.statuses.frenzy,
            "Điên")
        assert.ok(t1.nextAttack.some((b) => b.free),
            "1 Đòn Miễn Phí")
        t1.hp = 1
        s = settle(play(s,
            "B",
            give(s,
                "B",
                basic(s)),
            {
                actor: "B:g2v_fighter", target: "A:g2v_tank"
            })).s
        assert.notEqual(u(s,
            "A",
            "g2v_tank").status,
        "board",
        "lần hai thì bị hạ")
    })
test("Q (Quick): Khiên lớn + Giáp Phản; Khiên vỡ thì kẻ phá nhận sát thương phép và Choáng",
    () => {
        let s = mk({
            A: {
                renata: 1, g2v_tank: 2
            }, B: {
                g2v_nuker: 2
            }
        })
        const me = u(s,
            "A",
            "renata")
        s = settle(play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "renata",
                    "A",
                    "Q")),
            {
                target: "A:g2v_tank"
            })).s
        const t = u(s,
            "A",
            "g2v_tank")
        assert.equal(t.shield,
            Math.round(gm(s).f(me,
                "110 + 90% AD")))
        assert.ok(t.statuses.renata_ward)
        s = toTurn(s,
            "B")
        s.players.B.hand = []
        const hp0 = u(s,
            "B",
            "g2v_nuker").hp
        s = settle(play(s,
            "B",
            give(s,
                "B",
                skill(s,
                    "g2v_nuker",
                    "B",
                    "Q")),
            {
                target: "A:g2v_tank"
            })).s
        assert.equal(u(s,
            "A",
            "g2v_tank").shield,
        0,
        "Khiên đã vỡ")
        assert.ok(u(s,
            "B",
            "g2v_nuker").hp < hp0,
        "kẻ phá nhận sát thương")
        assert.ok(has(s,
            "B",
            "g2v_nuker",
            "stun"),
        "kẻ phá Choáng")
    })
test("E (Quick): phản 60% sát thương của đòn địch lên kẻ đánh",
    () => {
        let s = mk({
            A: {
                renata: 1, g2v_tank: 2
            }, B: {
                g2v_fighter: 2
            }
        })
        const e = skill(s,
            "renata",
            "A",
            "E")
        s = toTurn(s,
            "B")
        s.players.A.hand = [e]
        s.players.B.hand = []
        let r = play(s,
            "B",
            give(s,
                "B",
                basic(s)),
            {
                actor: "B:g2v_fighter", target: "A:g2v_tank"
            })
        assert.equal(r.s.phase,
            "chain")
        r = settle(chainWith(r.s,
            "A",
            e))
        const hit = dmgTo(r.ev,
            "A:g2v_tank")
        assert.ok(hit > 0)
        assert.equal(dmgTo(r.ev,
            "B:g2v_fighter"),
        Math.round(hit * 0.6))
    })
test("R: mọi tướng địch đánh một đồng đội của chính nó, đội mình không nhận sát thương",
    () => {
        let s = mk({
            A: {
                renata: 1, g2v_tank: 2
            }, B: {
                g2v_fighter: 2, g2v_tank: 1
            }
        })
        const r = settle(play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "renata",
                    "A",
                    "R")),
            {
            }))
        s = r.s
        const atks = evs(r.ev,
            "attack")
        assert.equal(atks.length,
            gm(s).heroes("B").length,
            "mỗi tướng địch đánh 1 lần")
        assert.ok(atks.every((a) => a.attacker.startsWith("B:") && a.target.startsWith("B:")))
        assert.equal(dmgTo(r.ev,
            "A:g2v_tank"),
        0)
    })

// ======================================================================
G("Janna")
// ======================================================================
test("Nội tại: đầu lượt bạn, tướng mình có máu thấp nhất nhận Khiên nhỏ",
    () => {
        let s = mk({
            A: {
                janna: 1, g2v_tank: 2
            }, B: {
                g2v_fighter: 2
            }
        })
        u(s,
            "A",
            "g2v_tank").hp = 100
        s = toTurn(s,
            "B")
        s = end(s,
            "B").s
        assert.equal(s.active,
            "A")
        assert.equal(u(s,
            "A",
            "g2v_tank").shield,
        Math.round(gm(s).f(u(s,
            "A",
            "janna"),
        "30 + 30% AD")))
    })
test("Q (Quick) huỷ 1 đòn đánh của địch lên đồng minh",
    () => {
        let s = mk({
            A: {
                janna: 1, g2v_tank: 2
            }, B: {
                g2v_fighter: 2
            }
        })
        const q = skill(s,
            "janna",
            "A",
            "Q")
        s = toTurn(s,
            "B")
        s.players.A.hand = [q]
        s.players.B.hand = []
        let r = play(s,
            "B",
            give(s,
                "B",
                basic(s)),
            {
                actor: "B:g2v_fighter", target: "A:g2v_tank"
            })
        assert.equal(r.s.phase,
            "chain")
        r = settle(chainWith(r.s,
            "A",
            q))
        assert.equal(dmgTo(r.ev,
            "A:g2v_tank"),
        0)
        assert.ok(evs(r.ev,
            "chainCancel").length > 0)
    })
test("E (Quick): Khiên cho 1 đồng minh; còn Khiên thì miễn Khống Chế, hết Khiên thì hết miễn",
    () => {
        let s = mk({
            A: {
                janna: 1, g2v_tank: 2
            }, B: {
                g2v_fighter: 2
            }
        })
        const me = u(s,
            "A",
            "janna")
        s = settle(play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "janna",
                    "A",
                    "E")),
            {
                target: "A:g2v_tank"
            })).s
        const t = u(s,
            "A",
            "g2v_tank")
        assert.equal(t.shield,
            Math.round(gm(s).f(me,
                "90 + 70% AD")))
        gm(s).status(t,
            "stun",
            1)
        assert.ok(!t.statuses.stun,
            "còn Khiên thì miễn Choáng")
        t.shield = 0
        gm(s).status(t,
            "stun",
            1)
        assert.ok(t.statuses.stun,
            "hết Khiên thì Choáng được")
    })
test("R (Quick): đội mình nhận −50% tới hết lượt địch, cuối lượt đó hồi bằng lượng đã chặn",
    () => {
        let s = mk({
            A: {
                janna: 1, g2v_tank: 2
            }, B: {
                g2v_fighter: 2
            }
        })
        s = settle(play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "janna",
                    "A",
                    "R")),
            {
            })).s
        s = toTurn(s,
            "B")
        s.players.A.hand = []
        s.players.B.hand = []
        const t = u(s,
            "A",
            "g2v_tank")
        t.hp = 500
        const r = settle(play(s,
            "B",
            give(s,
                "B",
                basic(s)),
            {
                actor: "B:g2v_fighter", target: "A:g2v_tank"
            }))
        const hit = dmgTo(r.ev,
            "A:g2v_tank")
        assert.equal(hit,
            phys(s,
                t,
                50,
                0.5))
        assert.equal(u(r.s,
            "A",
            "g2v_tank").hp,
        500 - hit)
        const e = end(r.s,
            "B")
        assert.equal(u(e.s,
            "A",
            "g2v_tank").hp,
        500,
        "hồi đúng lượng đã chặn")
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
