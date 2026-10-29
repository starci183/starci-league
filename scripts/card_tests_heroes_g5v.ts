// Test cơ chế đặc trưng V2 nhóm G5V: Viktor, Ashe, Jinx, Kog'Maw, Teemo, Vayne.
// Chạy: npx tsx scripts/card_tests_heroes_g5v.ts [--only=chuỗi] [--verbose]. Khung chép từ scripts/card_tests.ts.
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
    role] of [["g5v_tank",
        "tank"],
    ["g5v_fighter",
        "fighter"],
    ["g5v_mage",
        "mage"],
    ["g5v_mark",
        "marksman"],
    ["g5v_sup",
        "support"]] as const) {
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
const DUMMIES = ["g5v_tank",
    "g5v_fighter",
    "g5v_mage",
    "g5v_mark",
    "g5v_sup"]

// ======================================================================
// Trợ giúp dựng tình huống
// ======================================================================
const SEED = 20261030
type Setup = { A?: Record<string, number>; B?: Record<string, number>; seed?: number; round?: number };
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
    s.round = o.round ?? 8
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
const skill = (s: St, hero: string, side: S, k: cg.SkillKey) => gm(s).skillCard(hero,
    side,
    k)
const sup = (s: St, id: cg.SupportId) => gm(s).supportCard(id)
function give(s: St, side: S, card: cg.Card) {
    s.players[side].hand.push(card)
    return card
}
/** Hai bên bỏ qua cho tới khi chuỗi giải quyết xong */
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
    return settle({
        s: r.state, ev: r.events
    })
}
function play(s: St, side: S, card: { uid: string }, args: cg.PlayArgs = {
}) {
    return act(s,
        {
            t: "play", side, uid: card.uid, args
        })
}
/** Đánh thường bằng lá Đánh thường */
function strike(s: St, side: S, actor: string, target: string) {
    s.active = side
    const c = give(s,
        side,
        sup(s,
            "basic"))
    return play(s,
        side,
        c,
        {
            actor: `${side}:${actor}`, target
        })
}
const evs = <T extends cg.GameEvent["t"]>(ev: Ev, t: T) => ev.filter((e) => e.t === t) as Extract<cg.GameEvent, { t: T }>[]
const dmgTo = (ev: Ev, target: string, tag?: string) => evs(ev,
    "damage").filter((d) => d.target === target && (!tag || d.tag === tag)).reduce((x, d) => x + d.amount,
    0)
const stack = (s: St, side: S, hero: string, key: string) => u(s,
    side,
    hero).stacks[key] ?? 0
/** Bắn hook đầu lượt của phe (không chạy cả luồng lượt) */
const turnStart = (s: St, side: S) => {
    const g = gm(s)
    g.hook("onTurnStart",
        {
            side
        })
    g.hook("onTurnStartAway",
        {
            side
        })
}

// ======================================================================
G("Viktor")
// ======================================================================
test("Q: bỏ 2 lá => +2 Tiến Hoá, trừ 10 mana, 2 lá vào mộ",
    () => {
        let s = mk({
            A: {
                viktor: 2
            }
        })
        const q = give(s,
            "A",
            skill(s,
                "viktor",
                "A",
                "Q"))
        const d1 = give(s,
            "A",
            sup(s,
                "gold"))
        const d2 = give(s,
            "A",
            sup(s,
                "gold"))
        const mana = u(s,
            "A",
            "viktor").mana ?? 0
        const r = play(s,
            "A",
            q,
            {
                discard: [d1.uid,
                    d2.uid]
            })
        s = r.s
        assert.equal(stack(s,
            "A",
            "viktor",
            "evolve"),
        2)
        assert.equal(u(s,
            "A",
            "viktor").mana,
        mana - 10)
        assert.ok(s.players.A.grave.some((c) => c.uid === d1.uid) && s.players.A.grave.some((c) => c.uid === d2.uid))
    })
test("E: sát thương phép mọi địch (35 mana), lớn hơn khi có Tiến Hoá",
    () => {
        const run = (evo: number) => {
            const s = mk({
                A: {
                    viktor: 2
                }, B: {
                    g5v_tank: 0, g5v_fighter: 1, g5v_mage: 2, g5v_mark: 3, g5v_sup: 4
                }
            })
            s.units["A:viktor"].stacks.evolve = evo
            const e = give(s,
                "A",
                skill(s,
                    "viktor",
                    "A",
                    "E"))
            const r = play(s,
                "A",
                e)
            assert.equal(u(r.s,
                "A",
                "viktor").mana,
            (u(s,
                "A",
                "viktor").mana ?? 0) - 35 + 0)
            return r.ev
        }
        const base = run(0)
        const evolved = run(6)
        const foes = ["B:g5v_tank",
            "B:g5v_fighter",
            "B:g5v_mage",
            "B:g5v_mark",
            "B:g5v_sup"]
        for (const f of foes) assert.ok(dmgTo(base,
            f) > 0,
        `${f} trúng E`)
        assert.ok(dmgTo(evolved,
            "B:g5v_tank") > dmgTo(base,
            "B:g5v_tank") * 1.5,
        "6 nấc = +90%")
    })
test("R: nhân đôi Tiến Hoá (trần 10), Tiến Hoá giữ khi Viktor chết",
    () => {
        let s = mk({
            A: {
                viktor: 2
            }
        })
        s.units["A:viktor"].stacks.evolve = 4
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "viktor",
                    "A",
                    "R"))).s
        assert.equal(stack(s,
            "A",
            "viktor",
            "evolve"),
        8)
        s.units["A:viktor"].mana = 100
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "viktor",
                    "A",
                    "R"))).s
        assert.equal(stack(s,
            "A",
            "viktor",
            "evolve"),
        10,
        "trần 10")
        gm(s).kill(u(s,
            "A",
            "viktor"),
        u(s,
            "B",
            "g5v_tank"))
        assert.equal(stack(s,
            "A",
            "viktor",
            "evolve"),
        10)
    })

// ======================================================================
G("Ashe")
// ======================================================================
test("Nội tại: đòn đánh trúng gắn 1 Buốt; Buốt làm đòn đánh của địch yếu đi",
    () => {
        let s = mk({
            A: {
                ashe: 2
            }, B: {
                g5v_mark: 2
            }
        })
        s = strike(s,
            "A",
            "ashe",
            "B:g5v_mark").s
        assert.equal(gm(s).statusV(u(s,
            "B",
            "g5v_mark"),
        "frost"),
        1)
        const hit = (st: St) => dmgTo(strike(st,
            "B",
            "g5v_mark",
            "A:ashe").ev,
        "A:ashe",
        "attack")
        const frosted = hit(s)
        const s2 = mk({
            A: {
                ashe: 2
            }, B: {
                g5v_mark: 2
            }
        })
        const clean = hit(s2)
        assert.ok(frosted < clean,
            `${frosted} < ${clean}`)
    })
test("Q: +3 Buốt không gây sát thương; E: đòn đánh gây thêm và gắn 2 Buốt",
    () => {
        let s = mk({
            A: {
                ashe: 2
            }, B: {
                g5v_tank: 2
            }
        })
        let r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "ashe",
                    "A",
                    "Q")),
            {
                target: "B:g5v_tank"
            })
        s = r.s
        assert.equal(dmgTo(r.ev,
            "B:g5v_tank"),
        0)
        assert.equal(gm(s).statusV(u(s,
            "B",
            "g5v_tank"),
        "frost"),
        3)
        r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "ashe",
                    "A",
                    "E")))
        s = r.s
        r = strike(s,
            "A",
            "ashe",
            "B:g5v_tank")
        assert.equal(gm(r.s).statusV(u(r.s,
            "B",
            "g5v_tank"),
        "frost"),
        5,
        "3 + 2")
    })
test("R: Choáng + sát thương theo Buốt lên mọi địch có Buốt, Buốt tan; cần có Buốt",
    () => {
        let s = mk({
            A: {
                ashe: 2
            }, B: {
                g5v_tank: 2, g5v_mage: 1, g5v_sup: 3
            }
        })
        const g = gm(s)
        const r0 = give(s,
            "A",
            skill(s,
                "ashe",
                "A",
                "R"))
        assert.equal(cg.legalActions(s,
            "A").filter((a) => a.t === "play" && a.uid === r0.uid).length,
        0,
        "không có Buốt thì không đánh được")
        g.status(u(s,
            "B",
            "g5v_tank"),
        "frost",
        2,
        {
            v: 4
        })
        g.status(u(s,
            "B",
            "g5v_mage"),
        "frost",
        2,
        {
            v: 1
        })
        const r = play(s,
            "A",
            r0)
        s = r.s
        assert.ok(dmgTo(r.ev,
            "B:g5v_tank") > dmgTo(r.ev,
            "B:g5v_mage") * 2,
        "4 Buốt đau hơn 1 Buốt")
        assert.equal(dmgTo(r.ev,
            "B:g5v_sup"),
        0,
        "không có Buốt thì không trúng")
        assert.ok(u(s,
            "B",
            "g5v_tank").statuses.stun && u(s,
            "B",
            "g5v_mage").statuses.stun)
        assert.equal(gm(s).statusV(u(s,
            "B",
            "g5v_tank"),
        "frost"),
        0)
    })

// ======================================================================
G("Jinx")
// ======================================================================
test("Nội tại: đánh trúng địch dưới 50% máu +1 Điên; địch đầy máu thì không",
    () => {
        let s = mk({
            A: {
                jinx: 2
            }, B: {
                g5v_tank: 2
            }
        })
        s = strike(s,
            "A",
            "jinx",
            "B:g5v_tank").s
        assert.equal(stack(s,
            "A",
            "jinx",
            "frenzy"),
        0)
        u(s,
            "B",
            "g5v_tank").hp = 400
        s = strike(s,
            "A",
            "jinx",
            "B:g5v_tank").s
        assert.equal(stack(s,
            "A",
            "jinx",
            "frenzy"),
        1)
    })
test("Hạ gục +10 Điên; Điên làm đòn đánh đau hơn",
    () => {
        let s = mk({
            A: {
                jinx: 2
            }, B: {
                g5v_tank: 2
            }
        })
        const plain = dmgTo(strike(s,
            "A",
            "jinx",
            "B:g5v_tank").ev,
        "B:g5v_tank",
        "attack")
        s = mk({
            A: {
                jinx: 2
            }, B: {
                g5v_tank: 2
            }
        })
        u(s,
            "B",
            "g5v_tank").hp = 10
        s = strike(s,
            "A",
            "jinx",
            "B:g5v_tank").s
        assert.equal(u(s,
            "B",
            "g5v_tank").status,
        "dead")
        assert.ok(stack(s,
            "A",
            "jinx",
            "frenzy") >= 10,
        "kill +10")
        const s2 = mk({
            A: {
                jinx: 2
            }, B: {
                g5v_tank: 2
            }
        })
        s2.units["A:jinx"].stacks.frenzy = 10
        const mad = dmgTo(strike(s2,
            "A",
            "jinx",
            "B:g5v_tank").ev,
        "B:g5v_tank",
        "attack")
        assert.ok(mad > plain,
            `${mad} > ${plain}`)
    })
test("R: dưới ngưỡng thì chết luôn (ngưỡng tăng theo Điên), trên ngưỡng thì chịu sát thương",
    () => {
        let s = mk({
            A: {
                jinx: 2
            }, B: {
                g5v_tank: 2, g5v_mage: 1
            }
        })
        u(s,
            "B",
            "g5v_tank").hp = 140 // 14% < 15%
        u(s,
            "B",
            "g5v_mage").hp = 200 // 20%
        let r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "jinx",
                    "A",
                    "R")),
            {
                target: "B:g5v_mage"
            })
        assert.equal(u(r.s,
            "B",
            "g5v_mage").status,
        "board",
        "20% > 15% ngưỡng gốc")
        assert.ok(dmgTo(r.ev,
            "B:g5v_mage") > 0)
        s = mk({
            A: {
                jinx: 2
            }, B: {
                g5v_tank: 2, g5v_mage: 1
            }
        })
        u(s,
            "B",
            "g5v_mage").hp = 200
        s.units["A:jinx"].stacks.frenzy = 10 // ngưỡng 30%
        r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "jinx",
                    "A",
                    "R")),
            {
                target: "B:g5v_mage"
            })
        assert.equal(u(r.s,
            "B",
            "g5v_mage").status,
        "dead",
        "20% < 30%")
    })
test("E: bẫy Choáng tướng địch được gọi ra sân đúng đường đối diện, chỉ một lần",
    () => {
        let s = mk({
            A: {
                jinx: 2
            }
        })
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "jinx",
                    "A",
                    "E"))).s
        assert.ok(u(s,
            "A",
            "jinx").statuses.jinx_trap,
        "bẫy gài")
        const g = gm(s)
        g.summon("B",
            "g5v_tank",
            1)
        assert.equal(u(s,
            "B",
            "g5v_tank").statuses.stun,
        undefined,
        "sai đường")
        g.summon("B",
            "g5v_mage",
            2)
        assert.ok(u(s,
            "B",
            "g5v_mage").statuses.stun,
        "đúng đường: Choáng")
        assert.equal(u(s,
            "A",
            "jinx").statuses.jinx_trap,
        undefined)
        g.summon("B",
            "g5v_mark",
            3)
        assert.equal(u(s,
            "B",
            "g5v_mark").statuses.stun,
        undefined)
    })

// ======================================================================
G("Kog'Maw")
// ======================================================================
test("Nội tại: +1 Đói mỗi lượt Kog sống, +1 khi có tướng chết; Kog chết mất nửa",
    () => {
        const s = mk({
            A: {
                kogmaw: 2
            }, B: {
                g5v_tank: 2
            }
        })
        turnStart(s,
            "A")
        assert.equal(stack(s,
            "A",
            "kogmaw",
            "hunger"),
        1)
        turnStart(s,
            "B")
        assert.equal(stack(s,
            "A",
            "kogmaw",
            "hunger"),
        1,
        "lượt địch không cộng")
        gm(s).kill(u(s,
            "B",
            "g5v_tank"),
        u(s,
            "A",
            "kogmaw"))
        assert.equal(stack(s,
            "A",
            "kogmaw",
            "hunger"),
        2)
        s.units["A:kogmaw"].stacks.hunger = 9
        gm(s).kill(u(s,
            "A",
            "kogmaw"),
        u(s,
            "B",
            "g5v_fighter"))
        assert.equal(stack(s,
            "A",
            "kogmaw",
            "hunger"),
        4,
        "mất nửa (làm tròn xuống)")
    })
test("Đòn đánh gây thêm % máu tối đa theo Đói; E nhân đôi phần đó",
    () => {
        const hit = (hunger: number, e = false) => {
            let s = mk({
                A: {
                    kogmaw: 2
                }, B: {
                    g5v_tank: 2
                }
            })
            s.units["A:kogmaw"].stacks.hunger = hunger
            if (e) s = play(s,
                "A",
                give(s,
                    "A",
                    skill(s,
                        "kogmaw",
                        "A",
                        "E"))).s
            return dmgTo(strike(s,
                "A",
                "kogmaw",
                "B:g5v_tank").ev,
            "B:g5v_tank",
            "attack")
        }
        const h0 = hit(0), h10 = hit(10), h10e = hit(10,
            true)
        assert.ok(h10 > h0,
            "Đói tăng sát thương")
        // 10 Đói x 1.5% x 1000 = 150 thô; E thêm 150 thô nữa
        assert.ok(h10e - h10 > 80,
            `E gấp đôi phần % máu (${h10e} vs ${h10})`)
    })
test("Q +3 Đói; R: % máu tối đa mọi địch theo Đói",
    () => {
        let s = mk({
            A: {
                kogmaw: 2
            }, B: {
                g5v_tank: 2, g5v_mage: 1
            }
        })
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "kogmaw",
                    "A",
                    "Q"))).s
        assert.equal(stack(s,
            "A",
            "kogmaw",
            "hunger"),
        3)
        s.units["A:kogmaw"].stacks.hunger = 10
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "kogmaw",
                    "A",
                    "R")))
        const d = dmgTo(r.ev,
            "B:g5v_tank")
        assert.ok(d > 200 && d < 360,
            `10 Đói x 3.5% x 1000 máu = 350 thô, nhận ${d}`)
        assert.ok(dmgTo(r.ev,
            "B:g5v_mage") > 200)
    })

// ======================================================================
G("Teemo")
// ======================================================================
const mushrooms = (s: St, side: S) => s.players[side].deck.filter((c) => c.kind === "special" && c.id === "mushroom").length
test("Nội tại: mỗi đòn đánh xáo 1 Nấm vào bộ bài địch; Q xáo 3",
    () => {
        let s = mk({
            A: {
                teemo: 2
            }, B: {
                g5v_tank: 2
            }
        })
        const before = s.players.B.deck.length
        s = strike(s,
            "A",
            "teemo",
            "B:g5v_tank").s
        assert.equal(mushrooms(s,
            "B"),
        1)
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "teemo",
                    "A",
                    "Q"))).s
        assert.equal(mushrooms(s,
            "B"),
        4)
        assert.equal(s.players.B.deck.length,
            before + 4)
    })
test("Địch rút trúng Nấm: nổ lên tướng máu thấp nhất bên đó, Nấm chiếm lượt rút",
    () => {
        const s = mk({
            A: {
                teemo: 2
            }, B: {
                g5v_tank: 2, g5v_mage: 1
            }
        })
        u(s,
            "B",
            "g5v_mage").hp = 500
        const g = gm(s)
        const card = g.newCard({
            kind: "special", id: "mushroom", hero: "teemo", side: "A"
        })
        s.players.B.deck.unshift(card)
        const hand = s.players.B.hand.length
        g.drawOne("B",
            "draw")
        assert.ok(u(s,
            "B",
            "g5v_mage").hp < 500,
        "tướng ít máu nhất ăn nấm")
        assert.equal(u(s,
            "B",
            "g5v_tank").hp,
        1000)
        assert.equal(s.players.B.hand.length,
            hand,
            "nấm thay lá rút")
        assert.ok(!s.players.B.deck.some((c) => c.uid === card.uid))
    })
test("E: sát thương tăng theo số Nấm, Nấm ở nguyên; R: mọi địch theo số Nấm, Nấm ở nguyên",
    () => {
        const s = mk({
            A: {
                teemo: 2
            }, B: {
                g5v_tank: 2, g5v_mage: 1
            }
        })
        const e0 = dmgTo(play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "teemo",
                    "A",
                    "E")),
            {
                target: "B:g5v_tank"
            }).ev,
        "B:g5v_tank")
        const s2 = mk({
            A: {
                teemo: 2
            }, B: {
                g5v_tank: 2, g5v_mage: 1
            }
        })
        cg.getHero("teemo")
        for (let i = 0; i < 5; i++) s2.players.B.deck.push(gm(s2).newCard({
            kind: "special", id: "mushroom", hero: "teemo", side: "A"
        }))
        const r = play(s2,
            "A",
            give(s2,
                "A",
                skill(s2,
                    "teemo",
                    "A",
                    "E")),
            {
                target: "B:g5v_tank"
            })
        assert.ok(dmgTo(r.ev,
            "B:g5v_tank") > e0,
        "5 Nấm đau hơn 0 Nấm")
        assert.equal(mushrooms(r.s,
            "B"),
        5,
        "E không gỡ Nấm")
        const r2 = play(r.s,
            "A",
            give(r.s,
                "A",
                skill(r.s,
                    "teemo",
                    "A",
                    "R")))
        assert.ok(dmgTo(r2.ev,
            "B:g5v_tank") > 0 && dmgTo(r2.ev,
            "B:g5v_mage") > 0,
        "R trúng mọi địch")
        assert.equal(mushrooms(r2.s,
            "B"),
        5,
        "R không gỡ Nấm")
    })

// ======================================================================
G("Vayne")
// ======================================================================
test("Nội tại: +2 Đêm mỗi lượt của bạn khi Vayne không trên sân (tối đa 10), không cộng khi trên sân",
    () => {
        const s = mk({
            A: {
                vayne: 2
            }, B: {
                g5v_tank: 2
            }
        })
        s.units["A:vayne"].status = "reserve"
        for (let i = 0; i < 7; i++) turnStart(s,
            "A")
        assert.equal(stack(s,
            "A",
            "vayne",
            "night"),
        10)
        const s2 = mk({
            A: {
                vayne: 2
            }
        })
        turnStart(s2,
            "A")
        assert.equal(stack(s2,
            "A",
            "vayne",
            "night"),
        0)
    })
test("Mỗi đòn đánh tiêu 1 Đêm, gây thêm sát thương chuẩn; hết Đêm thì đòn thường",
    () => {
        let s = mk({
            A: {
                vayne: 2
            }, B: {
                g5v_tank: 2
            }
        })
        const none = evs(strike(s,
            "A",
            "vayne",
            "B:g5v_tank").ev,
        "damage").filter((d) => d.kind === "true").length
        assert.equal(none,
            0)
        s = mk({
            A: {
                vayne: 2
            }, B: {
                g5v_tank: 2
            }
        })
        s.units["A:vayne"].stacks.night = 3
        const r = strike(s,
            "A",
            "vayne",
            "B:g5v_tank")
        assert.equal(stack(r.s,
            "A",
            "vayne",
            "night"),
        2)
        assert.equal(evs(r.ev,
            "damage").filter((d) => d.kind === "true" && d.target === "B:g5v_tank").length,
        1)
    })
test("Q (Quick): Tàng Hình + 2 Đêm; E: mỗi đòn tiêu 2 Đêm, sát thương gấp đôi mỗi Đêm",
    () => {
        let s = mk({
            A: {
                vayne: 2
            }, B: {
                g5v_tank: 2
            }
        })
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "vayne",
                    "A",
                    "Q"))).s
        assert.ok(u(s,
            "A",
            "vayne").statuses.stealth)
        assert.equal(stack(s,
            "A",
            "vayne",
            "night"),
        2)
        const trueOf = (st: St) => evs(strike(st,
            "A",
            "vayne",
            "B:g5v_tank").ev,
        "damage").filter((d) => d.kind === "true").reduce((x, d) => x + d.amount,
            0)
        const sA = mk({
            A: {
                vayne: 2
            }, B: {
                g5v_tank: 2
            }
        })
        sA.units["A:vayne"].stacks.night = 4
        const normal = trueOf(sA)
        const sB = mk({
            A: {
                vayne: 2
            }, B: {
                g5v_tank: 2
            }
        })
        sB.units["A:vayne"].stacks.night = 4
        const sE = play(sB,
            "A",
            give(sB,
                "A",
                skill(sB,
                    "vayne",
                    "A",
                    "E"))).s
        const r = strike(sE,
            "A",
            "vayne",
            "B:g5v_tank")
        const boosted = evs(r.ev,
            "damage").filter((d) => d.kind === "true").reduce((x, d) => x + d.amount,
            0)
        assert.equal(stack(r.s,
            "A",
            "vayne",
            "night"),
        2,
        "E tiêu 2 Đêm")
        assert.ok(boosted > normal * 3,
            `${boosted} > 3 x ${normal} (2 Đêm x2 so với 1 Đêm)`)
    })
test("R: đòn đánh kế tiêu hết Đêm vào một phát; cần có Đêm",
    () => {
        let s = mk({
            A: {
                vayne: 2
            }, B: {
                g5v_tank: 2
            }
        })
        const r0 = give(s,
            "A",
            skill(s,
                "vayne",
                "A",
                "R"))
        assert.equal(cg.legalActions(s,
            "A").filter((a) => a.t === "play" && a.uid === r0.uid).length,
        0,
        "không Đêm thì không đánh được R")
        s.units["A:vayne"].stacks.night = 6
        s = play(s,
            "A",
            r0).s
        const r = strike(s,
            "A",
            "vayne",
            "B:g5v_tank")
        assert.equal(stack(r.s,
            "A",
            "vayne",
            "night"),
        0)
        const burst = evs(r.ev,
            "damage").filter((d) => d.kind === "true").reduce((x, d) => x + d.amount,
            0)
        assert.ok(burst > 300,
            `6 Đêm x 2.5 x ~27 = 400 thô, nhận ${burst}`)
        const next = strike(r.s,
            "A",
            "vayne",
            "B:g5v_tank")
        assert.equal(evs(next.ev,
            "damage").filter((d) => d.kind === "true").length,
        0,
        "buff chỉ dùng một lần")
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
