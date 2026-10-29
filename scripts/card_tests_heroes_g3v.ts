// Test V2 cho nhóm G3V: Zed, Katarina, Kha'Zix, Qiyana, Soraka, Nami.
// Chạy: npx tsx scripts/card_tests_heroes_g3v.ts [--only=chữ] [--verbose]. Khung chép từ scripts/card_tests.ts.
// LƯU Ý runner: scripts/card_tests.ts chỉ tự gom /^card_tests_(g\d+|items|bot|v2)\.ts$/, tên file này cần thêm "heroes_g3v" vào mẫu đó.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    HERO_EN_V2_G3V, KEYWORDS_V2_G3V
} from "../packages/shared/src/cardgame/i18n/v2_g3v"

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
// Tướng giả: không có chiêu, 1000 máu (để test không bị chuỗi của tướng khác chen vào)
// ======================================================================
const noSkill = (key: "Q" | "E" | "R") => ({
    key, name: "-", desc: "-", target: "none" as const, canPlay: () => false, resolve: () => {}
})
for (const [id,
    role] of [["g3v_tank",
        "tank"],
    ["g3v_fighter",
        "fighter"],
    ["g3v_mark",
        "marksman"],
    ["g3v_sup",
        "support"],
    ["g3v_mage",
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
const DUMMIES = ["g3v_tank",
    "g3v_fighter",
    "g3v_mark",
    "g3v_sup",
    "g3v_mage"]

// ======================================================================
// Trợ giúp dựng tình huống
// ======================================================================
const SEED = 20261030
type Setup = { A?: Record<string, number>; B?: Record<string, number> };
/** Ván round 8 (mở hết đường), tướng đặt thẳng vào đường; đội bù bằng tướng giả; tay, mộ hai bên rỗng */
function mk(o: Setup = {
}): St {
    const a = Object.keys(o.A ?? {
        }), b = Object.keys(o.B ?? {
        })
    const fill = (x: string[]) => [...x,
        ...DUMMIES.filter((h) => !x.includes(h))].slice(0,
        Math.max(5,
            x.length))
    const s = cg.newGame(SEED,
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
function give(s: St, side: S, card: cg.Card) { s.players[side].hand.push(card); return card }
function act(s: St, a: Act): { s: St; ev: Ev } {
    const r = cg.applyAction(s,
        a)
    return {
        s: r.state, ev: r.events
    }
}
/** Bỏ qua tới khi chuỗi giải quyết xong */
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
/** Đánh 1 lá và để chuỗi tự giải quyết */
function play(s: St, side: S, card: { uid: string }, args: cg.PlayArgs = {
}) {
    return settle(act(s,
        {
            t: "play", side, uid: card.uid, args
        }))
}
const chainWith = (s: St, side: S, card: { uid: string }, args: cg.PlayArgs = {
}) => act(s,
    {
        t: "chain", side, uid: card.uid, args
    })
/** Đánh thường bằng lá Đánh thường: actor đánh target */
function strike(s: St, side: S, actor: string, target: string) {
    const c = give(s,
        side,
        basic(s))
    return play(s,
        side,
        c,
        {
            actor, target
        })
}
/** Bước gọi tướng úp đầu vòng (V2): chốt hết */
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
const evs = <T extends cg.GameEvent["t"]>(ev: Ev, t: T) => ev.filter((e) => e.t === t) as Extract<cg.GameEvent, { t: T }>[]
const dmgTo = (ev: Ev, target: string, tag?: string) => evs(ev,
    "damage").filter((d) => d.target === target && (!tag || d.tag === tag)).reduce((x, d) => x + d.amount,
    0)
const inHand = (s: St, side: S, card: { uid: string }) => s.players[side].hand.some((c) => c.uid === card.uid)
const inGrave = (s: St, side: S, card: { uid: string }) => s.players[side].grave.some((c) => c.uid === card.uid)
const FOREVER = 1_000_000

// ======================================================================
G("Zed")
// ======================================================================
test("đòn đánh thường và Q mỗi đòn trúng +1 Dồn lên mục tiêu",
    () => {
        let s = mk({
            A: {
                zed: 2
            }, B: {
                g3v_tank: 2
            }
        })
        s = strike(s,
            "A",
            "A:zed",
            "B:g3v_tank").s
        assert.equal(gm(s).statusV(u(s,
            "B",
            "g3v_tank"),
        "zed_stack"),
        1)
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "zed",
                    "A",
                    "Q"))).s
        assert.equal(gm(s).statusV(u(s,
            "B",
            "g3v_tank"),
        "zed_stack"),
        2)
    })
test("R gây sát thương theo số Dồn rồi gỡ Dồn (không tự cộng Dồn mới)",
    () => {
        const s = mk({
            A: {
                zed: 2
            }, B: {
                g3v_tank: 2
            }
        })
        gm(s).status(u(s,
            "B",
            "g3v_tank"),
        "zed_stack",
        1,
        {
            v: 3, until: FOREVER
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
                target: "B:g3v_tank"
            })
        const per = 30 + 0.5 * gm(s).atk(u(s,
            "A",
            "zed"))
        assert.equal(dmgTo(r.ev,
            "B:g3v_tank"),
        Math.round(3 * per * (100 / 130)))
        assert.equal(gm(r.s).statusV(u(r.s,
            "B",
            "g3v_tank"),
        "zed_stack"),
        0)
    })
test("R từ 6 Dồn Kết Liễu mục tiêu 1000 máu; chưa đủ ngưỡng thì không chết",
    () => {
        for (const [n,
            dead] of [[6,
                true],
            [5,
                false]] as const) {
            let s = mk({
                A: {
                    zed: 2
                }, B: {
                    g3v_tank: 2
                }
            })
            gm(s).status(u(s,
                "B",
                "g3v_tank"),
            "zed_stack",
            1,
            {
                v: n, until: FOREVER
            })
            s = play(s,
                "A",
                give(s,
                    "A",
                    skill(s,
                        "zed",
                        "A",
                        "R")),
                {
                    target: "B:g3v_tank"
                }).s
            assert.equal(u(s,
                "B",
                "g3v_tank").status === "dead",
            dead,
            `Dồn ${n}`)
        }
    })
test("E: Zed chí mạng tới hết lượt, Q chí mạng gấp 1.5 lần và R không chọn được tướng chưa có Dồn",
    () => {
        let s = mk({
            A: {
                zed: 2
            }, B: {
                g3v_tank: 2
            }
        })
        assert.equal(cg.legalActions(s,
            "A").filter((a) => a.t === "play").length,
        0)
        const q1 = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "zed",
                    "A",
                    "Q")))
        const base = dmgTo(q1.ev,
            "B:g3v_tank")
        s = mk({
            A: {
                zed: 2
            }, B: {
                g3v_tank: 2
            }
        })
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "zed",
                    "A",
                    "E"))).s
        assert.ok(gm(s).statusV(u(s,
            "A",
            "zed"),
        "alwaysCrit") > 0)
        const q2 = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "zed",
                    "A",
                    "Q")))
        assert.ok(Math.abs(dmgTo(q2.ev,
            "B:g3v_tank") / base - 1.5) < 0.05,
        `${dmgTo(q2.ev,
            "B:g3v_tank")} / ${base}`)
    })

// ======================================================================
G("Katarina")
// ======================================================================
test("Q hạ gục thì lá Q quay về tay, không hạ thì vào mộ",
    () => {
        let s = mk({
            A: {
                katarina: 2
            }, B: {
                g3v_tank: 2
            }
        })
        u(s,
            "B",
            "g3v_tank").hp = 20
        const q = give(s,
            "A",
            skill(s,
                "katarina",
                "A",
                "Q"))
        let r = play(s,
            "A",
            q,
            {
                target: "B:g3v_tank"
            })
        assert.equal(u(r.s,
            "B",
            "g3v_tank").status,
        "dead")
        assert.ok(inHand(r.s,
            "A",
            q))
        s = mk({
            A: {
                katarina: 2
            }, B: {
                g3v_tank: 2
            }
        })
        const q2 = give(s,
            "A",
            skill(s,
                "katarina",
                "A",
                "Q"))
        r = play(s,
            "A",
            q2,
            {
                target: "B:g3v_tank"
            })
        assert.ok(inGrave(r.s,
            "A",
            q2) && !inHand(r.s,
            "A",
            q2))
    })
test("E gấp đôi sát thương khi mục tiêu dưới 50% máu",
    () => {
        const run = (hp: number) => {
            const s = mk({
                A: {
                    katarina: 2
                }, B: {
                    g3v_tank: 2
                }
            })
            u(s,
                "B",
                "g3v_tank").hp = hp
            return dmgTo(play(s,
                "A",
                give(s,
                    "A",
                    skill(s,
                        "katarina",
                        "A",
                        "E")),
                {
                    target: "B:g3v_tank"
                }).ev,
            "B:g3v_tank")
        }
        const full = run(900)
        const low = run(400)
        assert.ok(Math.abs(low / full - 2) < 0.05,
            `${low} / ${full}`)
    })
test("R hạ 2 tướng: lấy 2 lá Katarina gần nhất từ mộ về tay và R quay về tay",
    () => {
        let s = mk({
            A: {
                katarina: 2
            }, B: {
                g3v_tank: 2, g3v_fighter: 3, g3v_mark: 1
            }
        })
        u(s,
            "B",
            "g3v_tank").hp = 10
        u(s,
            "B",
            "g3v_fighter").hp = 10
        const old1 = skill(s,
            "katarina",
            "A",
            "Q")
        const old2 = skill(s,
            "katarina",
            "A",
            "E")
        const old3 = skill(s,
            "katarina",
            "A",
            "Q")
        s.players.A.grave.push(old1,
            old2,
            old3)
        const r = give(s,
            "A",
            skill(s,
                "katarina",
                "A",
                "R"))
        s = play(s,
            "A",
            r).s
        assert.equal(u(s,
            "B",
            "g3v_tank").status,
        "dead")
        assert.equal(u(s,
            "B",
            "g3v_fighter").status,
        "dead")
        assert.equal(u(s,
            "B",
            "g3v_mark").status,
        "board")
        assert.ok(inHand(s,
            "A",
            old3) && inHand(s,
            "A",
            old2),
        "2 lá gần nhất về tay")
        assert.ok(inGrave(s,
            "A",
            old1),
        "lá cũ nhất còn trong mộ")
        assert.ok(inHand(s,
            "A",
            r),
        "R hạ gục nên cũng về tay")
    })

// ======================================================================
G("Kha'Zix")
// ======================================================================
test("Q lên tướng Cô Lập gây ×2 so với tướng có đồng minh kề",
    () => {
        const run = (b: Record<string, number>) => {
            const s = mk({
                A: {
                    khazix: 2
                }, B: b
            })
            return dmgTo(play(s,
                "A",
                give(s,
                    "A",
                    skill(s,
                        "khazix",
                        "A",
                        "Q")),
                {
                    target: "B:g3v_tank"
                }).ev,
            "B:g3v_tank")
        }
        const alone = run({
            g3v_tank: 2
        })
        const packed = run({
            g3v_tank: 2, g3v_fighter: 1
        })
        assert.ok(Math.abs(alone / packed - 2) < 0.05,
            `${alone} / ${packed}`)
    })
test("E làm 1 tướng đứng kín thành Cô Lập tới hết lượt rồi hết",
    () => {
        let s = mk({
            A: {
                khazix: 2
            }, B: {
                g3v_tank: 2, g3v_fighter: 1
            }
        })
        assert.equal(gm(s).isolated(u(s,
            "B",
            "g3v_tank")),
        false)
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "khazix",
                    "A",
                    "E")),
            {
                target: "B:g3v_tank"
            }).s
        assert.equal(gm(s).isolated(u(s,
            "B",
            "g3v_tank")),
        true)
        assert.equal(gm(s).isolated(u(s,
            "B",
            "g3v_fighter")),
        false)
        s = end(s,
            "A").s
        assert.equal(gm(s).isolated(u(s,
            "B",
            "g3v_tank")),
        false)
    })
test("R làm mọi tướng địch Cô Lập: đòn đánh thường cũng ×2",
    () => {
        const run = (withR: boolean) => {
            let s = mk({
                A: {
                    khazix: 2
                }, B: {
                    g3v_tank: 2, g3v_fighter: 1, g3v_mark: 3
                }
            })
            if (withR) s = play(s,
                "A",
                give(s,
                    "A",
                    skill(s,
                        "khazix",
                        "A",
                        "R"))).s
            return dmgTo(strike(s,
                "A",
                "A:khazix",
                "B:g3v_tank").ev,
            "B:g3v_tank")
        }
        const plain = run(false)
        const hunt = run(true)
        assert.ok(Math.abs(hunt / plain - 2) < 0.05,
            `${hunt} / ${plain}`)
    })

// ======================================================================
G("Qiyana")
// ======================================================================
test("nhát đầu lên mỗi tướng địch ×2, nhát sau cùng lượt không ×2",
    () => {
        let s = mk({
            A: {
                qiyana: 2
            }, B: {
                g3v_tank: 2
            }
        })
        const r1 = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "qiyana",
                    "A",
                    "Q")),
            {
                target: "B:g3v_tank"
            })
        const first = dmgTo(r1.ev,
            "B:g3v_tank")
        assert.ok(gm(r1.s).has(u(r1.s,
            "B",
            "g3v_tank"),
        "privilege_lost"))
        s = r1.s
        const second = dmgTo(play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "qiyana",
                    "A",
                    "Q")),
            {
                target: "B:g3v_tank"
            }).ev,
        "B:g3v_tank")
        assert.ok(Math.abs(first / second - 2) < 0.05,
            `${first} / ${second}`)
    })
test("đòn đánh thường tiêu Đặc Quyền; E trả lại Đặc Quyền cho mọi địch; hết lượt cũng có lại",
    () => {
        let s = mk({
            A: {
                qiyana: 2
            }, B: {
                g3v_tank: 2, g3v_fighter: 3
            }
        })
        const q = () => give(s,
            "A",
            skill(s,
                "qiyana",
                "A",
                "Q"))
        s = strike(s,
            "A",
            "A:qiyana",
            "B:g3v_tank").s
        const noPriv = dmgTo(play(s,
            "A",
            q(),
            {
                target: "B:g3v_tank"
            }).ev,
        "B:g3v_tank")
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "qiyana",
                    "A",
                    "E"))).s
        assert.ok(!gm(s).has(u(s,
            "B",
            "g3v_tank"),
        "privilege_lost"))
        const again = dmgTo(play(s,
            "A",
            q(),
            {
                target: "B:g3v_tank"
            }).ev,
        "B:g3v_tank")
        assert.ok(Math.abs(again / noPriv - 2) < 0.05,
            `${again} / ${noPriv}`)
        s = end(s,
            "A").s
        assert.ok(!gm(s).has(u(s,
            "B",
            "g3v_tank"),
        "privilege_lost"))
    })
test("R chém mọi tướng địch, mỗi tướng ×2 một lần (Q ngay sau đó không ×2)",
    () => {
        const s = mk({
            A: {
                qiyana: 2
            }, B: {
                g3v_tank: 2, g3v_fighter: 3
            }
        })
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "qiyana",
                    "A",
                    "R")))
        const raw = 40 + gm(s).atk(u(s,
            "A",
            "qiyana"))
        for (const t of ["B:g3v_tank",
            "B:g3v_fighter"]) assert.equal(dmgTo(r.ev,
            t),
        Math.round(raw * 2 * (100 / 130)))
        const q = dmgTo(play(r.s,
            "A",
            give(r.s,
                "A",
                skill(r.s,
                    "qiyana",
                    "A",
                    "Q")),
            {
                target: "B:g3v_tank"
            }).ev,
        "B:g3v_tank")
        assert.equal(q,
            Math.round((55 + 1.3 * gm(s).atk(u(s,
                "A",
                "qiyana"))) * (100 / 130)))
    })

// ======================================================================
G("Soraka")
// ======================================================================
test("đồng minh nhận đòn chí mạng: Soraka chịu thay, đồng minh sống và không mất mạng",
    () => {
        let s = mk({
            A: {
                soraka: 0, g3v_tank: 2
            }, B: {
                g3v_fighter: 2
            }
        })
        s.active = "B"
        u(s,
            "A",
            "g3v_tank").hp = 10
        const lives = s.players.A.lives
        const hp0 = u(s,
            "A",
            "soraka").hp
        s = strike(s,
            "B",
            "B:g3v_fighter",
            "A:g3v_tank").s
        assert.equal(u(s,
            "A",
            "g3v_tank").status,
        "board")
        assert.equal(u(s,
            "A",
            "g3v_tank").hp,
        10)
        assert.ok(u(s,
            "A",
            "soraka").hp < hp0,
        "Soraka mất máu thay")
        assert.equal(s.players.A.lives,
            lives)
    })
test("E (Quick) huỷ lá chiêu địch nhắm vào đồng minh",
    () => {
        const s = mk({
            A: {
                qiyana: 2
            }, B: {
                soraka: 0, g3v_tank: 2
            }
        })
        const q = give(s,
            "A",
            skill(s,
                "qiyana",
                "A",
                "Q"))
        const e = give(s,
            "B",
            skill(s,
                "soraka",
                "B",
                "E"))
        let r = act(s,
            {
                t: "play", side: "A", uid: q.uid, args: {
                    target: "B:g3v_tank"
                }
            })
        assert.ok(cg.legalActions(r.s,
            "B").some((a) => a.t === "chain" && a.uid === e.uid),
        "Soraka E nối được")
        r = settle(chainWith(r.s,
            "B",
            e))
        assert.equal(u(r.s,
            "B",
            "g3v_tank").hp,
        u(r.s,
            "B",
            "g3v_tank").maxHp)
        assert.equal(evs(r.ev,
            "chainCancel").length,
        1)
        assert.ok(inGrave(r.s,
            "A",
            q),
        "lá bị huỷ vẫn vào mộ")
    })
test("Q tự hồi, R hồi cả đội kể cả Soraka",
    () => {
        let s = mk({
            A: {
                soraka: 0, g3v_tank: 2
            }, B: {
                g3v_fighter: 2
            }
        })
        const so = u(s,
            "A",
            "soraka")
        const tank = u(s,
            "A",
            "g3v_tank")
        so.hp = 100
        tank.hp = 100
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "soraka",
                    "A",
                    "Q"))).s
        assert.equal(u(s,
            "A",
            "soraka").hp,
        250)
        assert.equal(u(s,
            "A",
            "g3v_tank").hp,
        100)
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "soraka",
                    "A",
                    "R"))).s
        assert.equal(u(s,
            "A",
            "soraka").hp,
        480)
        assert.equal(u(s,
            "A",
            "g3v_tank").hp,
        330)
    })

// ======================================================================
G("Nami")
// ======================================================================
test("nội tại: đòn đánh đầu tiên của mỗi đồng minh trúng địch trong lượt rút 1 lá; đòn sau của cùng tướng thì không",
    () => {
        const s = mk({
            A: {
                nami: 0, g3v_fighter: 2
            }, B: {
                g3v_fighter: 2
            }
        })
        const h0 = s.players.A.hand.length
        let r = strike(s,
            "A",
            "A:g3v_fighter",
            "B:g3v_fighter")
        assert.equal(r.s.players.A.hand.length,
            h0 + 1)
        r = strike(r.s,
            "A",
            "A:g3v_fighter",
            "B:g3v_fighter")
        assert.equal(r.s.players.A.hand.length,
            h0 + 1,
            "đòn thứ 2 cùng tướng không rút")
    })
test("E: lượt này mỗi đòn trúng của đồng minh được chọn rút 1 lá (cộng nội tại ở đòn đầu)",
    () => {
        let s = mk({
            A: {
                nami: 0, g3v_fighter: 2
            }, B: {
                g3v_fighter: 2
            }
        })
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "nami",
                    "A",
                    "E")),
            {
                target: "A:g3v_fighter"
            }).s
        assert.ok(gm(s).has(u(s,
            "A",
            "g3v_fighter"),
        "nami_draw"))
        const h0 = s.players.A.hand.length
        let r = strike(s,
            "A",
            "A:g3v_fighter",
            "B:g3v_fighter")
        assert.equal(r.s.players.A.hand.length,
            h0 + 2,
            "đòn đầu: nội tại + E")
        r = strike(r.s,
            "A",
            "A:g3v_fighter",
            "B:g3v_fighter")
        assert.equal(r.s.players.A.hand.length,
            h0 + 3,
            "đòn sau: chỉ E")
    })
test("Q rút 2 lá",
    () => {
        const s = mk({
            A: {
                nami: 0
            }, B: {
                g3v_fighter: 2
            }
        })
        const q = give(s,
            "A",
            skill(s,
                "nami",
                "A",
                "Q"))
        const h0 = s.players.A.hand.length
        const r = play(s,
            "A",
            q)
        assert.equal(r.s.players.A.hand.length,
            h0 - 1 + 2)
    })
test("R rút tới khi tay đủ 5 lá; tay từ 5 lá trở lên thì không rút",
    () => {
        const s = mk({
            A: {
                nami: 0
            }, B: {
                g3v_fighter: 2
            }
        })
        s.players.A.hand.length = 0
        const r = give(s,
            "A",
            skill(s,
                "nami",
                "A",
                "R"))
        const r1 = play(s,
            "A",
            r)
        assert.equal(r1.s.players.A.hand.length,
            5)
        const s2 = mk({
            A: {
                nami: 0
            }, B: {
                g3v_fighter: 2
            }
        })
        const r2 = give(s2,
            "A",
            skill(s2,
                "nami",
                "A",
                "R"))
        while (s2.players.A.hand.length < 7) give(s2,
            "A",
            basic(s2))
        const h = s2.players.A.hand.length
        assert.equal(play(s2,
            "A",
            r2).s.players.A.hand.length,
        h - 1)
    })

// ======================================================================
G("Chữ V2")
// ======================================================================
test("công thức EN khớp bản Việt của 6 tướng; từ khoá có đủ tên dùng trong chữ Việt",
    () => {
        const norm = (t: string) => [...t.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1].replace(/\s+/g,
            " ").trim()).join("|")
        for (const [id,
            en] of Object.entries(HERO_EN_V2_G3V)) {
            const h = cg.getHero(id)!
            assert.equal(norm(en.passive.desc),
                norm(h.passive.desc),
                `${id} passive`)
            for (const k of ["Q",
                "E",
                "R"] as const) assert.equal(norm(en.skills[k].desc),
                norm(h.skills[k].desc),
                `${id} ${k}`)
        }
        const names = Object.values(KEYWORDS_V2_G3V).map((k) => k.vi)
        for (const n of ["Dồn",
            "Đặc Quyền"]) assert.ok(names.includes(n),
            n)
    })
test("6 ván bot, mỗi ván có 1 tướng nhóm G3V mỗi bên, chạy không lỗi",
    () => {
        const heroes = ["zed",
            "katarina",
            "khazix",
            "qiyana",
            "soraka",
            "nami"]
        for (let k = 0; k < heroes.length; k++) {
            const A = [heroes[k],
                "g3v_tank",
                "g3v_fighter",
                "g3v_mark",
                "g3v_sup"]
            const B = [heroes[(k + 1) % 6],
                "g3v_tank",
                "g3v_fighter",
                "g3v_mark",
                "g3v_mage"]
            let s = cg.newGame(SEED + k,
                A,
                B)
            for (let i = 0; i < 400 && s.phase !== "over"; i++) {
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
