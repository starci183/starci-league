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

import * as ZED from "../packages/shared/src/cardgame/heroes/zed"
import * as KATARINA from "../packages/shared/src/cardgame/heroes/katarina"
import * as KHAZIX from "../packages/shared/src/cardgame/heroes/khazix"
import * as QIYANA from "../packages/shared/src/cardgame/heroes/qiyana"
import * as SORAKA from "../packages/shared/src/cardgame/heroes/soraka"
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

// ======================================================================
G("Zed")
// ======================================================================
test("Liên Hoàn: phát đầu chỉ cộng 5% máu đã mất, phát sau cộng thêm (8 + 8% AD + 2% AP) mỗi phát trước; hết lượt đếm lại",
    () => {
        const s = mk({
            A: {
                zed: 2
            }, B: {
                g3v_tank: 2
            }
        })
        const zed = u(s,
            "A",
            "zed")
        const tank = "B:g3v_tank"
        const r1 = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "zed",
                    "A",
                    "Q")))
        const q = Math.round(gm(s).f(zed,
            ZED.F_Q) * (100 / 130))
        assert.equal(dmgTo(r1.ev,
            tank,
            "skill"),
        q)
        assert.equal(dmgTo(r1.ev,
            tank,
            "effect"),
        Math.round(q * 0.05 * (100 / 130)),
        "phát đầu: chỉ 5% máu đã mất")
        assert.equal(gm(r1.s).statusV(u(r1.s,
            "A",
            "zed"),
        "zed_chain"),
        1)
        const r2 = strike(r1.s,
            "A",
            "A:zed",
            tank)
        const hit = evs(r2.ev,
            "damage").find((d) => d.tag === "attack" && d.target === tank)!
        const flat = gm(s).f(zed,
            ZED.F_CHAIN)
        assert.equal(dmgTo(r2.ev,
            tank,
            "effect"),
        Math.round((flat + (u(r2.s,
            "B",
            "g3v_tank").maxHp - hit.hp) * 0.05) * (100 / 130)),
        "phát sau: thêm 1 × (8 + 8% AD) và 5% máu đã mất")
        assert.equal(gm(r2.s).statusV(u(r2.s,
            "A",
            "zed"),
        "zed_chain"),
        2)
        const e = end(r2.s,
            "A")
        assert.equal(gm(e.s).has(u(e.s,
            "A",
            "zed"),
        "zed_chain"),
        false,
        "sang lượt mới đếm lại từ 0")
    })
test("R: đánh ngay rồi cuối lượt nổ thêm một lần nữa (phát nổ cũng tính Liên Hoàn)",
    () => {
        const s = mk({
            A: {
                zed: 2
            }, B: {
                g3v_tank: 2
            }
        })
        const zed = u(s,
            "A",
            "zed")
        const tank = "B:g3v_tank"
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "zed",
                    "A",
                    "R")),
            {
                target: tank
            })
        const now = Math.round(gm(s).f(zed,
            ZED.F_R) * (100 / 130))
        assert.equal(dmgTo(r.ev,
            tank,
            "skill"),
        now)
        assert.ok(gm(r.s).has(u(r.s,
            "B",
            "g3v_tank"),
        "zed_mark"),
        "tướng bị đánh dấu")
        const e = end(r.s,
            "A")
        const later = evs(e.ev,
            "damage").filter((d) => d.target === tank && d.tag === "skill")
        assert.equal(later.length,
            1,
            "cuối lượt nổ đúng 1 lần")
        assert.equal(later[0].amount,
            now)
        assert.ok(dmgTo(e.ev,
            tank,
            "effect") > 0,
        "phát nổ là phát thứ 2 trong lượt nên có Liên Hoàn")
        assert.equal(gm(e.s).has(u(e.s,
            "B",
            "g3v_tank"),
        "zed_mark"),
        false)
    })
test("E: Zed đổi chỗ đứng đối diện tướng chọn rồi nó nhận sát thương",
    () => {
        const s = mk({
            A: {
                zed: 1
            }, B: {
                g3v_mage: 3, g3v_tank: 1
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
                target: "B:g3v_mage"
            })
        assert.equal(u(r.s,
            "A",
            "zed").lane,
        3)
        assert.equal(r.s.lanes.A[3],
            "A:zed")
        assert.equal(dmgTo(r.ev,
            "B:g3v_mage",
            "skill"),
        Math.round(gm(s).f(u(s,
            "A",
            "zed"),
        ZED.F_E) * (100 / 130)))
    })

// ======================================================================
G("Katarina")
// ======================================================================
test("Q gắn Dao; R gây thêm 60% lên tướng có Dao",
    () => {
        const s = mk({
            A: {
                katarina: 2
            }, B: {
                g3v_tank: 2, g3v_mark: 1
            }
        })
        const kat = u(s,
            "A",
            "katarina")
        assert.equal(gm(s).ap(kat),
            0,
            "AP gốc 0")
        const rq = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "katarina",
                    "A",
                    "Q")),
            {
                target: "B:g3v_tank"
            })
        assert.equal(dmgTo(rq.ev,
            "B:g3v_tank"),
        Math.round(gm(s).f(kat,
            KATARINA.F_Q) * (100 / 130)))
        assert.ok(gm(rq.s).has(u(rq.s,
            "B",
            "g3v_tank"),
        "kat_dagger"),
        "có Dao")
        const rr = play(rq.s,
            "A",
            give(rq.s,
                "A",
                skill(rq.s,
                    "katarina",
                    "A",
                    "R")))
        const base = gm(s).f(kat,
            KATARINA.F_R)
        assert.equal(dmgTo(rr.ev,
            "B:g3v_tank"),
        Math.round(base * 1.6 * (100 / 130)))
        assert.equal(dmgTo(rr.ev,
            "B:g3v_mark"),
        Math.round(base * (100 / 130)))
    })
test("Tham Lam: Katarina tự hạ gục thì mọi lá Katarina đã dùng lượt này về tay, kể cả lá đang dùng",
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
            "g3v_tank").hp = 150
        const q1 = give(s,
            "A",
            skill(s,
                "katarina",
                "A",
                "Q"))
        const q2 = give(s,
            "A",
            skill(s,
                "katarina",
                "A",
                "Q"))
        s = play(s,
            "A",
            q1,
            {
                target: "B:g3v_tank"
            }).s
        assert.ok(inGrave(s,
            "A",
            q1),
        "chưa hạ được thì vào mộ")
        s = play(s,
            "A",
            q2,
            {
                target: "B:g3v_tank"
            }).s
        assert.equal(u(s,
            "B",
            "g3v_tank").status,
        "dead")
        assert.ok(inHand(s,
            "A",
            q1),
        "lá đã dùng trước đó về tay")
        assert.ok(inHand(s,
            "A",
            q2),
        "lá đang dùng cũng về tay")
    })
test("Tham Lam: ai hạ cũng được nhưng chỉ tính địch Katarina đã gây sát thương lên",
    () => {
        const setup = () => mk({
            A: {
                katarina: 2, g3v_fighter: 1
            }, B: {
                g3v_tank: 2, g3v_mark: 1
            }
        })
        // địch Katarina đã chạm: đồng đội hạ gục thì lá về tay
        let s = setup()
        const q = give(s,
            "A",
            skill(s,
                "katarina",
                "A",
                "Q"))
        s = play(s,
            "A",
            q,
            {
                target: "B:g3v_mark"
            }).s
        u(s,
            "B",
            "g3v_mark").hp = 5
        s = strike(s,
            "A",
            "A:g3v_fighter",
            "B:g3v_mark").s
        assert.equal(u(s,
            "B",
            "g3v_mark").status,
        "dead")
        assert.ok(inHand(s,
            "A",
            q),
        "đã chạm: lá về tay")
        // địch chưa chạm chết: lá ở lại mộ
        s = setup()
        const q2 = give(s,
            "A",
            skill(s,
                "katarina",
                "A",
                "Q"))
        s = play(s,
            "A",
            q2,
            {
                target: "B:g3v_tank"
            }).s
        u(s,
            "B",
            "g3v_mark").hp = 5
        s = strike(s,
            "A",
            "A:g3v_fighter",
            "B:g3v_mark").s
        assert.equal(u(s,
            "B",
            "g3v_mark").status,
        "dead")
        assert.ok(inGrave(s,
            "A",
            q2),
        "chưa chạm: lá vẫn ở mộ")
    })
test("E (Quick): né đòn đánh, kẻ đánh nhận sát thương phép, gấp đôi nếu có Dao",
    () => {
        const run = (dagger: boolean) => {
            const s = mk({
                A: {
                    katarina: 2
                }, B: {
                    g3v_fighter: 2
                }
            })
            s.active = "B"
            const foe = u(s,
                "B",
                "g3v_fighter")
            if (dagger) gm(s).status(foe,
                "kat_dagger",
                2)
            const e = give(s,
                "A",
                skill(s,
                    "katarina",
                    "A",
                    "E"))
            const atk = give(s,
                "B",
                basic(s))
            let r = act(s,
                {
                    t: "play", side: "B", uid: atk.uid, args: {
                        actor: "B:g3v_fighter", target: "A:katarina"
                    }
                })
            assert.ok(cg.legalActions(r.s,
                "A").some((a) => a.t === "chain" && a.uid === e.uid),
            "E nối được lên đòn đánh")
            r = settle(chainWith(r.s,
                "A",
                e))
            const kat = u(r.s,
                "A",
                "katarina")
            assert.equal(kat.hp,
                kat.maxHp,
                "đòn trượt")
            assert.equal(evs(r.ev,
                "chainCancel").length,
            1)
            return dmgTo(r.ev,
                "B:g3v_fighter",
                "skill")
        }
        const s0 = mk({
            A: {
                katarina: 2
            }
        })
        const base = Math.round(gm(s0).f(u(s0,
            "A",
            "katarina"),
        KATARINA.F_E) * (100 / 130))
        assert.equal(run(false),
            base)
        assert.equal(run(true),
            Math.round(gm(s0).f(u(s0,
                "A",
                "katarina"),
            KATARINA.F_E) * 2 * (100 / 130)))
    })

// ======================================================================
G("Kha'Zix")
// ======================================================================
test("Nội tại: tướng Cô Lập nhận thêm (20 + 50% AD + 10% AP) từ đòn đánh và (40 + 90% AD + 15% AP) từ Q",
    () => {
        const iso = mk({
            A: {
                khazix: 2
            }, B: {
                g3v_tank: 2
            }
        })
        const kin = mk({
            A: {
                khazix: 2
            }, B: {
                g3v_tank: 2, g3v_mage: 1
            }
        })
        const kz = u(iso,
            "A",
            "khazix")
        // Cô Lập chỉ là trạng thái (không còn luật "không có đồng minh ở đường kề")
        assert.equal(gm(iso).isolated(u(iso,
            "B",
            "g3v_tank")),
        false,
        "đứng lẻ nhưng chưa bị gắn thì không Cô Lập")
        gm(iso).status(u(iso,
            "B",
            "g3v_tank"),
        "isolated",
        1,
        {
            until: 1_000
        })
        assert.equal(gm(iso).isolated(u(iso,
            "B",
            "g3v_tank")),
        true)
        assert.equal(gm(kin).isolated(u(kin,
            "B",
            "g3v_tank")),
        false)
        const atk = (s: St) => dmgTo(strike(s,
            "A",
            "A:khazix",
            "B:g3v_tank").ev,
        "B:g3v_tank",
        "attack")
        const diff = atk(iso) - atk(kin)
        assert.ok(Math.abs(diff - Math.round(gm(iso).f(kz,
            KHAZIX.F_ATK) * (100 / 130))) <= 1,
        `đòn đánh thêm ${diff}`)
        const q = (s: St) => dmgTo(play(s,
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
        assert.equal(q(kin),
            Math.round(gm(kin).f(kz,
                KHAZIX.F_Q) * (100 / 130)))
        assert.equal(q(iso),
            Math.round((gm(iso).f(kz,
                KHAZIX.F_Q) + gm(iso).f(kz,
                KHAZIX.F_Q_ISO)) * (100 / 130)))
    })
test("E: chọn 1 địch bất kỳ (không đổi đường): nó Cô Lập tới hết lượt và nhận sát thương",
    () => {
        const s = mk({
            A: {
                khazix: 1, g3v_tank: 3
            }, B: {
                g3v_mage: 3, g3v_mark: 4, g3v_fighter: 1
            }
        })
        assert.equal(gm(s).isolated(u(s,
            "B",
            "g3v_mage")),
        false,
        "chưa bị gắn nên chưa Cô Lập")
        const lane0 = u(s,
            "A",
            "khazix").lane
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "khazix",
                    "A",
                    "E")),
            {
                target: "B:g3v_mage"
            })
        assert.equal(u(r.s,
            "A",
            "khazix").lane,
        lane0,
        "không đổi đường")
        const mage = u(r.s,
            "B",
            "g3v_mage")
        assert.ok(gm(r.s).has(mage,
            "isolated"),
        "Cô Lập")
        assert.equal(dmgTo(r.ev,
            "B:g3v_mage",
            "skill"),
        Math.round(gm(s).f(u(s,
            "A",
            "khazix"),
        KHAZIX.F_E) * (100 / 130)))
        const e = end(r.s,
            "A")
        assert.equal(gm(e.s).has(u(e.s,
            "B",
            "g3v_mage"),
        "isolated"),
        false,
        "hết lượt thì hết Cô Lập")
    })
test("R (Quick): Tàng Hình ngay, địch đối diện Cô Lập tới hết lượt kế của bạn, thêm 1 lá Q lên tay",
    () => {
        let s = mk({
            A: {
                khazix: 2
            }, B: {
                g3v_tank: 2, g3v_mage: 1
            }
        })
        const r = give(s,
            "A",
            skill(s,
                "khazix",
                "A",
                "R"))
        s = play(s,
            "A",
            r).s
        assert.ok(gm(s).has(u(s,
            "A",
            "khazix"),
        "stealth"),
        "Tàng Hình")
        assert.ok(gm(s).has(u(s,
            "B",
            "g3v_tank"),
        "isolated"),
        "địch đối diện Cô Lập")
        assert.equal(s.players.A.hand.filter((c) => c.id === "khazix_q").length,
            1,
            "thêm 1 lá Q")
        s = end(s,
            "A").s
        s = end(s,
            "B").s
        assert.equal(s.active,
            "A")
        assert.ok(gm(s).has(u(s,
            "B",
            "g3v_tank"),
        "isolated"),
        "còn Cô Lập tới hết lượt kế của bạn")
    })

// ======================================================================
G("Qiyana")
// ======================================================================
test("Nguyên tố: nhận khi ra sân và đầu mỗi lượt của bạn, đúng một nguyên tố",
    () => {
        const s = mk({
            A: {
                qiyana: 2
            }, B: {
                g3v_tank: 2
            }
        })
        const q = u(s,
            "A",
            "qiyana")
        const has = () => [1,
            2,
            3].filter((n) => gm(s).stackOf(q,
            "element") === n)
        assert.equal(has().length,
            1,
            "ra sân có 1 nguyên tố")
        const seen = new Set<string>()
        for (let i = 0; i < 40; i++) {
            gm(s).hook("onTurnStart",
                {
                    side: "A"
                })
            assert.equal(has().length,
                1)
            seen.add(String(has()[0]))
        }
        assert.equal(seen.size,
            3,
            "đủ ba nguyên tố")
        gm(s).hook("onTurnStart",
            {
                side: "B"
            })
        assert.equal(has().length,
            1)
    })
test("Q Đỏ: gây sát thương, rồi mỗi lần Qiyana gây sát thương lên nó, đòn sau +15% (cộng dồn) tới hết lượt",
    () => {
        const setup = () => {
            const s = mk({
                A: {
                    qiyana: 2
                }, B: {
                    g3v_tank: 2
                }
            })
            QIYANA.setElement(gm(s),
                u(s,
                    "A",
                    "qiyana"),
                "red")
            return s
        }
        const tank = "B:g3v_tank"
        const base = dmgTo(strike(setup(),
            "A",
            "A:qiyana",
            tank).ev,
        tank,
        "attack")
        let s = setup()
        const rq = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "qiyana",
                    "A",
                    "Q")),
            {
                target: tank
            })
        assert.equal(dmgTo(rq.ev,
            tank),
        Math.round(gm(s).f(u(s,
            "A",
            "qiyana"),
        QIYANA.F_Q_RED) * (100 / 130)))
        assert.equal(gm(rq.s).statusV(u(rq.s,
            "B",
            "g3v_tank"),
        "qiyana_mark"),
        15)
        const r1 = strike(rq.s,
            "A",
            "A:qiyana",
            tank)
        assert.ok(Math.abs(dmgTo(r1.ev,
            tank,
            "attack") - base * 1.15) <= 1.5,
        `+15%: ${dmgTo(r1.ev,
            tank,
            "attack")} so với ${base}`)
        const r2 = strike(r1.s,
            "A",
            "A:qiyana",
            tank)
        assert.ok(Math.abs(dmgTo(r2.ev,
            tank,
            "attack") - base * 1.3) <= 1.5,
        "+30%")
        s = end(r2.s,
            "A").s
        assert.equal(gm(s).has(u(s,
            "B",
            "g3v_tank"),
        "qiyana_mark"),
        false,
        "hết lượt thì mất dấu")
    })
test("Xanh: Q Choáng 1 lượt; R Choáng tướng máu cao nhất và Xạ thủ (không có Xạ thủ thì thêm 1 tướng khác)",
    () => {
        const blue = (s: St) => QIYANA.setElement(gm(s),
            u(s,
                "A",
                "qiyana"),
            "blue")
        const s0 = mk({
            A: {
                qiyana: 2
            }, B: {
                g3v_tank: 2
            }
        })
        blue(s0)
        const rq = play(s0,
            "A",
            give(s0,
                "A",
                skill(s0,
                    "qiyana",
                    "A",
                    "Q")),
            {
                target: "B:g3v_tank"
            })
        assert.ok(gm(rq.s).has(u(rq.s,
            "B",
            "g3v_tank"),
        "stun"))
        assert.equal(dmgTo(rq.ev,
            "B:g3v_tank"),
        Math.round(gm(s0).f(u(s0,
            "A",
            "qiyana"),
        QIYANA.F_Q_BLUE) * (100 / 130)))
        const withMark = mk({
            A: {
                qiyana: 2
            }, B: {
                g3v_tank: 2, g3v_mark: 1, g3v_sup: 3
            }
        })
        blue(withMark)
        u(withMark,
            "B",
            "g3v_mark").hp = 900
        u(withMark,
            "B",
            "g3v_sup").hp = 900
        const r1 = play(withMark,
            "A",
            give(withMark,
                "A",
                skill(withMark,
                    "qiyana",
                    "A",
                    "R")))
        const stunned = (s: St) => ["g3v_tank",
            "g3v_mark",
            "g3v_sup",
            "g3v_fighter"].filter((h) => s.units[`B:${h}`] && gm(s).has(s.units[`B:${h}`],
            "stun"))
        assert.deepEqual(stunned(r1.s).sort(),
            ["g3v_mark",
                "g3v_tank"],
            "máu cao nhất + Xạ thủ")
        assert.equal(dmgTo(r1.ev,
            "B:g3v_sup"),
        Math.round(gm(withMark).f(u(withMark,
            "A",
            "qiyana"),
        QIYANA.F_R_BLUE) * (100 / 130)))
        const noMark = mk({
            A: {
                qiyana: 2
            }, B: {
                g3v_tank: 2, g3v_sup: 3, g3v_fighter: 1
            }
        })
        blue(noMark)
        u(noMark,
            "B",
            "g3v_sup").hp = 900
        u(noMark,
            "B",
            "g3v_fighter").hp = 900
        const r2 = play(noMark,
            "A",
            give(noMark,
                "A",
                skill(noMark,
                    "qiyana",
                    "A",
                    "R")))
        assert.equal(stunned(r2.s).length,
            2,
            "không có Xạ thủ: máu cao nhất + 1 tướng ngẫu nhiên")
        assert.ok(stunned(r2.s).includes("g3v_tank"))
    })
test("Lục: Q đổi chỗ đứng đối diện; R đổi chỗ tự do rồi lấy 1 lá Q lên tay",
    () => {
        const s = mk({
            A: {
                qiyana: 0, g3v_tank: 2
            }, B: {
                g3v_mage: 4, g3v_fighter: 0
            }
        })
        QIYANA.setElement(gm(s),
            u(s,
                "A",
                "qiyana"),
            "green")
        const rq = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "qiyana",
                    "A",
                    "Q")),
            {
                target: "B:g3v_mage"
            })
        assert.equal(u(rq.s,
            "A",
            "qiyana").lane,
        4)
        assert.equal(dmgTo(rq.ev,
            "B:g3v_mage"),
        Math.round(gm(s).f(u(s,
            "A",
            "qiyana"),
        QIYANA.F_Q_GREEN) * (100 / 130)))
        u(rq.s,
            "B",
            "g3v_fighter").hp = 400
        const rr = play(rq.s,
            "A",
            give(rq.s,
                "A",
                skill(rq.s,
                    "qiyana",
                    "A",
                    "R")))
        assert.equal(u(rr.s,
            "A",
            "qiyana").lane,
        0,
        "đứng đối diện tướng ít máu nhất")
        assert.equal(rr.s.players.A.hand.filter((c) => c.id === "qiyana_q").length,
            1,
            "thêm 1 lá Q")
    })
test("E (Quick): Đỏ đánh trả, Xanh Choáng kẻ đánh và huỷ đòn, Lục đổi chỗ với đồng minh và đòn trượt",
    () => {
        const run = (el: QIYANA.Element) => {
            const s = mk({
                A: {
                    qiyana: 2, g3v_tank: 3
                }, B: {
                    g3v_fighter: 2
                }
            })
            s.active = "B"
            QIYANA.setElement(gm(s),
                u(s,
                    "A",
                    "qiyana"),
                el)
            const e = give(s,
                "A",
                skill(s,
                    "qiyana",
                    "A",
                    "E"))
            const atk = give(s,
                "B",
                basic(s))
            let r = act(s,
                {
                    t: "play", side: "B", uid: atk.uid, args: {
                        actor: "B:g3v_fighter", target: "A:qiyana"
                    }
                })
            assert.ok(cg.legalActions(r.s,
                "A").some((a) => a.t === "chain" && a.uid === e.uid),
            `E ${el} nối được`)
            r = settle(chainWith(r.s,
                "A",
                e))
            return r
        }
        const base = mk({
            A: {
                qiyana: 2
            }
        })
        const red = run("red")
        assert.equal(dmgTo(red.ev,
            "B:g3v_fighter",
            "skill"),
        Math.round(gm(base).f(u(base,
            "A",
            "qiyana"),
        QIYANA.F_E_RED) * (100 / 130)))
        assert.ok(u(red.s,
            "A",
            "qiyana").hp < u(red.s,
            "A",
            "qiyana").maxHp,
        "Đỏ: đòn vẫn trúng")
        const blue = run("blue")
        assert.ok(gm(blue.s).has(u(blue.s,
            "B",
            "g3v_fighter"),
        "stun"),
        "Xanh: kẻ đánh Choáng")
        assert.equal(u(blue.s,
            "A",
            "qiyana").hp,
        u(blue.s,
            "A",
            "qiyana").maxHp,
        "Xanh: đòn bị huỷ")
        const green = run("green")
        assert.equal(u(green.s,
            "A",
            "qiyana").lane,
        3,
        "Lục: đổi chỗ với đồng minh")
        assert.equal(u(green.s,
            "A",
            "qiyana").hp,
        u(green.s,
            "A",
            "qiyana").maxHp,
        "Lục: đòn trượt")
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
test("Q: gây sát thương, Soraka hồi; phần hồi thừa thành Khiên cho đồng minh máu thấp nhất",
    () => {
        const s = mk({
            A: {
                soraka: 0, g3v_tank: 2
            }, B: {
                g3v_fighter: 0
            }
        })
        const so = u(s,
            "A",
            "soraka")
        const heal = gm(s).f(so,
            SORAKA.F_HEAL)
        so.hp = so.maxHp - 20
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "soraka",
                    "A",
                    "Q")),
            {
                target: "B:g3v_fighter"
            })
        assert.equal(dmgTo(r.ev,
            "B:g3v_fighter"),
        Math.round(gm(s).f(so,
            SORAKA.F_Q) * (100 / 130)))
        assert.equal(u(r.s,
            "A",
            "soraka").hp,
        so.maxHp)
        assert.equal(u(r.s,
            "A",
            "g3v_tank").shield,
        Math.round(heal - 20))
    })
test("E (Quick): huỷ lá chiêu địch nhắm vào đồng minh và Câm Lặng kẻ tung chiêu",
    () => {
        const s = mk({
            A: {
                qiyana: 2
            }, B: {
                soraka: 0, g3v_tank: 2
            }
        })
        QIYANA.setElement(gm(s),
            u(s,
                "A",
                "qiyana"),
            "red")
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
        assert.ok(gm(r.s).has(u(r.s,
            "A",
            "qiyana"),
        "silence"),
        "kẻ tung chiêu bị Câm Lặng")
    })
test("R hồi cả đội kể cả Soraka",
    () => {
        const s = mk({
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
        assert.equal(gm(s).ap(so),
            0,
            "AP gốc 0")
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "soraka",
                    "A",
                    "R"))).s
        const heal = Math.round(gm(s).f(so,
            SORAKA.F_R))
        assert.equal(u(r,
            "A",
            "soraka").hp,
        100 + heal)
        assert.equal(u(r,
            "A",
            "g3v_tank").hp,
        100 + heal)
    })

// ======================================================================
G("Nami")
// ======================================================================
// Đồng minh có AD rất lớn: tỉ lệ rút của nội tại bị kẹp về 100% (g.chance), để test không phụ thuộc xúc xắc
cg.defineHero({
    id: "g3v_big", name: "g3v_big", role: "fighter", damage: "physical", hp: 1000, atk: 3000, armor: 30, mr: 30,
    passive: {
        name: "-", desc: "-"
    },
    skills: {
        Q: noSkill("Q"), E: noSkill("E"), R: noSkill("R")
    },
})
/** Ván có Nami + đồng minh g3v_big, địch có máu cực lớn để đòn 3000 AD không hạ gục */
function mkNami(): St {
    const s = mk({
        A: {
            nami: 0, g3v_big: 2
        }, B: {
            g3v_fighter: 2, g3v_tank: 1
        }
    })
    for (const h of ["g3v_fighter",
        "g3v_tank"]) {
        u(s,
            "B",
            h).hp = 1_000_000
        u(s,
            "B",
            h).maxHp = 1_000_000
    }
    s.active = "A"
    return s
}
test("nội tại: đồng minh ra đòn là có cơ hội rút bài (tỉ lệ theo chỉ số đồng minh đó), tối đa 2 lá mỗi lượt",
    () => {
        let s = mkNami()
        assert.equal(gm(s).chance(u(s,
            "A",
            "g3v_big"),
        {
            base: 0.05, ad: 0.05, ap: 0.05
        }),
        1,
        "AD 3000 => kẹp 100%")
        // Đồng minh thường: 5% + 0.05% mỗi điểm AD/AP (AD 88, AP gốc 0 của Nami)
        const nami = u(s,
            "A",
            "nami")
        assert.ok(Math.abs(gm(s).chance(nami,
            {
                base: 0.05, ad: 0.05, ap: 0.05
            }) - (0.05 + 0.0005 * 88)) < 1e-9)
        const hits: number[] = []
        for (let i = 0; i < 3; i++) {
            const r = strike(s,
                "A",
                "A:g3v_big",
                "B:g3v_fighter")
            s = r.s
            hits.push(s.players.A.hand.length)
        }
        assert.deepEqual(hits,
            [1,
                2,
                2],
            "đòn 1 và 2 rút mỗi đòn 1 lá, đòn 3 chạm trần 2 lá/lượt")
    })
test("Q: (76 + 25% AD + 55% AP) + Choáng 1 lượt + đánh dấu 3 đòn của đồng minh, mỗi đòn thêm (23 + 10% AD + 20% AP) phép",
    () => {
        let s = mkNami()
        const q = give(s,
            "A",
            skill(s,
                "nami",
                "A",
                "Q"))
        const nami = u(s,
            "A",
            "nami")
        const g = gm(s)
        const qRaw = g.f(nami,
            "76 + 25% AD + 55% AP")
        const markRaw = g.f(nami,
            "23 + 10% AD + 20% AP")
        const r = play(s,
            "A",
            q,
            {
                target: "B:g3v_fighter"
            })
        s = r.s
        assert.equal(dmgTo(r.ev,
            "B:g3v_fighter"),
        Math.round(qRaw * 100 / 130))
        assert.ok(u(s,
            "B",
            "g3v_fighter").statuses.stun,
        "Choáng")
        assert.equal(gm(s).marksOn(u(s,
            "B",
            "g3v_fighter"),
        "nami_q")[0]?.hits,
        3)
        for (let i = 0; i < 3; i++) {
            const left = gm(s).marksOn(u(s,
                "B",
                "g3v_fighter"),
            "nami_q")[0]?.hits ?? 0
            assert.equal(left,
                3 - i)
            const hit = strike(s,
                "A",
                "A:g3v_big",
                "B:g3v_fighter")
            s = hit.s
            assert.equal(dmgTo(hit.ev,
                "B:g3v_fighter",
                "effect"),
            Math.round(Math.round(markRaw) * 100 / 130),
            `đòn ${i + 1} có phần đánh dấu`)
        }
        assert.equal(gm(s).marksOn(u(s,
            "B",
            "g3v_fighter"),
        "nami_q").length,
        0,
        "hết 3 nấc")
    })
test("E: Nami hồi (58 + 15% AD + 35% AP), rồi nảy 5 lần giữa các đồng minh, mỗi lần hồi (58 + 15% AD + 35% AP)",
    () => {
        const s = mkNami()
        for (const h of ["nami",
            "g3v_big"]) {
            u(s,
                "A",
                h).hp = 100
            u(s,
                "A",
                h).maxHp = 5000
        }
        const e = give(s,
            "A",
            skill(s,
                "nami",
                "A",
                "E"))
        const per = Math.round(gm(s).f(u(s,
            "A",
            "nami"),
        "58 + 15% AD + 35% AP"))
        const r = play(s,
            "A",
            e)
        const heals = evs(r.ev,
            "heal")
        assert.equal(heals.length,
            6,
            "1 lần hồi đầu + 5 lần nảy")
        assert.ok(heals.every((h) => h.amount === per),
            `mỗi lần hồi ${per}: ${heals.map((h) => h.amount).join()}`)
        assert.ok(heals.every((h) => h.target.startsWith("A:")))
    })
test("R: mọi đồng minh hồi (146 + 30% AD + 70% AP), mọi địch Choáng 1 lượt",
    () => {
        const s = mkNami()
        for (const h of ["nami",
            "g3v_big"]) {
            u(s,
                "A",
                h).hp = 100
            u(s,
                "A",
                h).maxHp = 5000
        }
        const rr = give(s,
            "A",
            skill(s,
                "nami",
                "A",
                "R"))
        const per = Math.round(gm(s).f(u(s,
            "A",
            "nami"),
        "146 + 30% AD + 70% AP"))
        const r = play(s,
            "A",
            rr)
        for (const h of ["nami",
            "g3v_big"]) assert.equal(u(r.s,
            "A",
            h).hp,
        100 + per,
        h)
        for (const h of ["g3v_fighter",
            "g3v_tank"]) assert.ok(u(r.s,
            "B",
            h).statuses.stun,
        `${h} Choáng`)
    })

test("nội tại: đồng minh khác hồi máu bằng chiêu cũng có cơ hội rút bài cho chủ Nami",
    () => {
        cg.defineHero({
            id: "g3v_healer", name: "g3v_healer", role: "support", damage: "physical", hp: 1000, atk: 3000, armor: 30, mr: 30,
            passive: {
                name: "-", desc: "-"
            },
            skills: {
                Q: {
                    key: "Q", name: "-", desc: "-", target: "none", resolve(c) { c.g.heal(c.self,
                        c.self,
                        10) }
                }, E: noSkill("E"), R: noSkill("R")
            },
        })
        const s = mk({
            A: {
                nami: 0, g3v_healer: 2
            }, B: {
                g3v_fighter: 2
            }
        })
        s.active = "A"
        u(s,
            "A",
            "g3v_healer").hp = 100
        const q = give(s,
            "A",
            skill(s,
                "g3v_healer",
                "A",
                "Q"))
        const r = play(s,
            "A",
            q)
        assert.equal(evs(r.ev,
            "heal").length,
        1)
        assert.equal(r.s.players.A.hand.length,
            1,
            "lá Q đã dùng, hồi máu kích nội tại rút 1 lá")
    })

test("nội tại (onHeal): hút máu của đồng minh cũng là một lần kích, 1 đòn hút máu = 2 lần (sát thương + hồi)",
    () => {
        cg.defineHero({
            id: "g3v_vamp", name: "g3v_vamp", role: "fighter", damage: "physical", hp: 1000, atk: 3000, armor: 30, mr: 30,
            passive: {
                name: "-", desc: "-"
            },
            bonusStats: () => ({
                lifesteal: 0.5
            }),
            skills: {
                Q: noSkill("Q"), E: noSkill("E"), R: noSkill("R")
            },
        })
        let s = mk({
            A: {
                nami: 0, g3v_vamp: 2
            }, B: {
                g3v_fighter: 2
            }
        })
        u(s,
            "B",
            "g3v_fighter").hp = 1_000_000
        u(s,
            "B",
            "g3v_fighter").maxHp = 1_000_000
        s.active = "A"
        u(s,
            "A",
            "g3v_vamp").hp = 100
        const r = strike(s,
            "A",
            "A:g3v_vamp",
            "B:g3v_fighter")
        s = r.s
        assert.ok(evs(r.ev,
            "heal").some((e) => e.target === "A:g3v_vamp" && e.amount > 0),
        "có hút máu")
        assert.equal(s.players.A.hand.length,
            2,
            "sát thương rút 1 lá, hút máu rút thêm 1 lá")
    })
test("nội tại (onHeal): hồi máu của địch không kích",
    () => {
        let s = mkNami()
        const foe = u(s,
            "B",
            "g3v_fighter")
        foe.hp = 100
        const g = gm(s)
        g.heal(foe,
            foe,
            50)
        s = g.s
        assert.equal(s.players.A.hand.length,
            0)
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
        for (const n of ["Liên Hoàn",
            "Dao",
            "Nguyên Tố"]) assert.ok(names.includes(n),
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
