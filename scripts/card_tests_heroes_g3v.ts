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
test("E: Zed swap với đồng minh đứng đối diện tướng chọn rồi nó nhận sát thương",
    () => {
        const s = mk({
            A: {
                zed: 1, g3v_fighter: 3
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
        assert.equal(r.s.lanes.A[1],
            "A:g3v_fighter",
            "đồng minh về ô cũ của Zed (swap nguyên tử)")
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
            // E Quick tự lấy kẻ đánh làm đích (đã đối diện: không cần swap)
            r = settle(chainWith(r.s,
                "A",
                e,
                {
                    target: "B:g3v_fighter"
                }))
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
                    "Q"))).ev,
        "B:g3v_tank")
        assert.equal(q(kin),
            Math.round(gm(kin).f(kz,
                KHAZIX.F_Q) * (100 / 130)))
        assert.equal(q(iso),
            Math.round((gm(iso).f(kz,
                KHAZIX.F_Q) + gm(iso).f(kz,
                KHAZIX.F_Q_ISO)) * (100 / 130)))
    })
test("E: nhảy tới con mồi, tự đổi chỗ với đồng minh, gắn Cô Lập rồi gây sát thương",
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
        3,
        "nhảy tới đường đối diện mục tiêu")
        assert.equal(u(r.s,
            "A",
            "g3v_tank").lane,
        lane0,
        "đồng minh về đường cũ Kha'Zix")
        const movement = evs(r.ev,
            "move")
        assert.equal(movement.length,
            1,
            "một thay đổi vị trí nguyên tử")
        assert.deepEqual(movement[0],
            {
                t: "move", unit: "A:khazix", from: lane0, to: 3, with: "A:g3v_tank"
            })
        assert.ok(r.ev.indexOf(movement[0]) < r.ev.findIndex(e => e.t === "status" && e.id === "isolated"))
        assert.ok(r.ev.indexOf(movement[0]) < r.ev.findIndex(e => e.t === "damage"))
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

test("E: ô đối diện con mồi trống (bên kia chưa gọi tướng) thì engine dời thẳng tới; đang đối diện thì đánh tại chỗ, không phát move giả",
    () => {
        for (const targetLane of [1,
            3]) {
            const s = mk({
                A: {
                    khazix: 1
                }, B: {
                    g3v_mage: targetLane
                }
            })
            const card = give(s,
                "A",
                skill(s,
                    "khazix",
                    "A",
                    "E"))
            const r = play(s,
                "A",
                card,
                {
                    target: "B:g3v_mage"
                })
            assert.equal(u(r.s,
                "A",
                "khazix").lane,
            targetLane)
            assert.equal(evs(r.ev,
                "move").length,
            targetLane === 1 ? 0 : 1)
            if (targetLane === 3) assert.equal(r.s.lanes.A[1],
                null,
                "ô cũ bỏ trống, không ai bị kéo theo")
            assert.ok(gm(r.s).isolated(u(r.s,
                "B",
                "g3v_mage")))
            assert.ok(dmgTo(r.ev,
                "B:g3v_mage") > 0)
        }
    })

test("E: ô giữ cho đồng minh đã chết không chặn: swap với tướng chết rồi mới Cô Lập + gây sát thương",
    () => {
        const s = mk({
            A: {
                khazix: 1, g3v_tank: 3
            }, B: {
                g3v_mage: 3
            }
        })
        gm(s).kill(u(s,
            "A",
            "g3v_tank"))
        const card = give(s,
            "A",
            skill(s,
                "khazix",
                "A",
                "E"))
        assert.equal(s.lanes.A[3],
            "A:g3v_tank",
            "ô được giữ cho tướng chết")
        assert.ok(cg.legalActions(s,
            "A").some(a => a.t === "play" && a.uid === card.uid))
        const r = play(s,
            "A",
            card,
            {
                target: "B:g3v_mage"
            })
        assert.equal(u(r.s,
            "A",
            "khazix").lane,
        3)
        assert.equal(r.s.lanes.A[1],
            "A:g3v_tank",
            "tướng chết đi theo ô về đường cũ của Kha'Zix")
        assert.ok(gm(r.s).isolated(u(r.s,
            "B",
            "g3v_mage")))
        assert.ok(dmgTo(r.ev,
            "B:g3v_mage") > 0)
    })

test("E: chọn con mồi tôn trọng Khiêu Khích và không nhắm tướng Tàng Hình",
    () => {
        const s = mk({
            A: {
                khazix: 1, g3v_fighter: 3, g3v_tank: 4
            }, B: {
                g3v_mage: 3, g3v_tank: 4
            }
        })
        const g = gm(s), card = give(s,
            "A",
            skill(s,
                "khazix",
                "A",
                "E"))
        g.status(u(s,
            "B",
            "g3v_tank"),
        "taunt",
        1)
        const targets = () => cg.legalActions(s,
            "A").filter((a): a is Extract<Act, { t: "play" }> => a.t === "play" && a.uid === card.uid).map(a => a.args?.target)
        assert.deepEqual(targets(),
            ["B:g3v_tank"])
        g.status(u(s,
            "B",
            "g3v_tank"),
        "stealth",
        1)
        assert.deepEqual(targets(),
            [],
            "Khiêu Khích không cho bỏ qua tướng đó khi nó không thể bị chỉ định")
    })

test("E: đồng minh ở ô đích chết lúc chờ Chuỗi thì Kha'Zix vẫn swap với tướng chết rồi mới Cô Lập + gây sát thương",
    () => {
        const s = mk({
            A: {
                khazix: 1, g3v_tank: 3
            }, B: {
                g3v_mage: 3, leona: 4
            }
        })
        give(s,
            "B",
            skill(s,
                "leona",
                "B",
                "E"))
        const card = give(s,
            "A",
            skill(s,
                "khazix",
                "A",
                "E"))
        const queued = act(s,
            {
                t: "play", side: "A", uid: card.uid, args: {
                    target: "B:g3v_mage"
                }
            })
        assert.equal(queued.s.phase,
            "chain")
        gm(queued.s).kill(u(queued.s,
            "A",
            "g3v_tank"))
        const r = settle(queued)
        assert.equal(u(r.s,
            "A",
            "khazix").lane,
        3)
        assert.equal(r.s.lanes.A[1],
            "A:g3v_tank")
        assert.ok(dmgTo(r.ev,
            "B:g3v_mage") > 0)
        assert.ok(gm(r.s).isolated(u(r.s,
            "B",
            "g3v_mage")))
    })

test("E: đồng minh rời ô đích lúc chờ Chuỗi (ô trống) thì engine dời thẳng Kha'Zix tới rồi mới gây sát thương",
    () => {
        const s = mk({
            A: {
                khazix: 1, g3v_tank: 3
            }, B: {
                g3v_mage: 3, leona: 4
            }
        })
        give(s,
            "B",
            skill(s,
                "leona",
                "B",
                "E"))
        const card = give(s,
            "A",
            skill(s,
                "khazix",
                "A",
                "E"))
        const queued = act(s,
            {
                t: "play", side: "A", uid: card.uid, args: {
                    target: "B:g3v_mage"
                }
            })
        assert.equal(queued.s.phase,
            "chain")
        gm(queued.s).moveTo(u(queued.s,
            "A",
            "g3v_tank"),
        0)
        assert.equal(queued.s.lanes.A[3],
            null)
        const r = settle(queued)
        assert.equal(u(r.s,
            "A",
            "khazix").lane,
        3)
        assert.ok(dmgTo(r.ev,
            "B:g3v_mage") > 0)
        assert.ok(gm(r.s).isolated(u(r.s,
            "B",
            "g3v_mage")))
    })

test("E: con mồi Tàng Hình trong lúc chờ Chuỗi thì không nhảy, không gắn dấu và không gây sát thương",
    () => {
        const s = mk({
            A: {
                khazix: 1, g3v_tank: 3
            }, B: {
                g3v_mage: 3, leona: 4
            }
        })
        give(s,
            "B",
            skill(s,
                "leona",
                "B",
                "E"))
        const card = give(s,
            "A",
            skill(s,
                "khazix",
                "A",
                "E"))
        const queued = act(s,
            {
                t: "play", side: "A", uid: card.uid, args: {
                    target: "B:g3v_mage"
                }
            })
        assert.equal(queued.s.phase,
            "chain")
        gm(queued.s).status(u(queued.s,
            "B",
            "g3v_mage"),
        "stealth",
        1)
        const r = settle(queued)
        assert.equal(u(r.s,
            "A",
            "khazix").lane,
        1)
        assert.equal(evs(r.ev,
            "move").length,
        0)
        assert.equal(dmgTo(r.ev,
            "B:g3v_mage"),
        0)
        assert.ok(!gm(r.s).isolated(u(r.s,
            "B",
            "g3v_mage")))
    })

test("Q: chỉ đánh đối diện, E mở đường cho Q và đòn thường hưởng nội tại Cô Lập",
    () => {
        const s = mk({
            A: {
                khazix: 1, g3v_tank: 3
            }, B: {
                g3v_mage: 3
            }
        })
        const q = give(s,
            "A",
            skill(s,
                "khazix",
                "A",
                "Q"))
        assert.ok(!cg.legalActions(s,
            "A").some(a => a.t === "play" && a.uid === q.uid))
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
        assert.ok(cg.legalActions(r.s,
            "A").some(a => a.t === "play" && a.uid === q.uid))
        assert.equal(gm(r.s).opposite(u(r.s,
            "A",
            "khazix"))?.id,
        "B:g3v_mage")
        const hit = strike(r.s,
            "A",
            "A:khazix",
            "B:g3v_mage")
        assert.ok(dmgTo(hit.ev,
            "B:g3v_mage",
            "attack") > Math.round(gm(r.s).stats(u(r.s,
            "A",
            "khazix")).atk * 100 / 130))
        const qHit = play(r.s,
            "A",
            q)
        const g = gm(r.s), kha = u(r.s,
            "A",
            "khazix")
        assert.equal(dmgTo(qHit.ev,
            "B:g3v_mage"),
        Math.round((g.f(kha,
            KHAZIX.F_Q) + g.f(kha,
            KHAZIX.F_Q_ISO)) * 100 / 130))
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
test("Sông: Q Choáng; R một tướng chọn + một tướng ngẫu nhiên khác, mỗi người bị Choáng",
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
        // R Sông: một tướng chọn + tối đa một tướng khác ngẫu nhiên, mỗi người nhận sát thương và Choáng
        const r3 = mk({
            A: {
                qiyana: 2
            }, B: {
                g3v_tank: 2, g3v_mark: 1, g3v_sup: 3
            }
        })
        blue(r3)
        const r1 = play(r3,
            "A",
            give(r3,
                "A",
                skill(r3,
                    "qiyana",
                    "A",
                    "R")),
            {
                target: "B:g3v_sup"
            })
        const hit = ["g3v_tank",
            "g3v_mark",
            "g3v_sup"].filter((h) => dmgTo(r1.ev,
            `B:${h}`) > 0)
        assert.equal(hit.length,
            2,
            "đúng 2 nạn nhân")
        assert.ok(hit.includes("g3v_sup"),
            "có tướng được chọn")
        assert.equal(dmgTo(r1.ev,
            "B:g3v_sup"),
        Math.round(gm(r3).f(u(r3,
            "A",
            "qiyana"),
        QIYANA.F_R_BLUE) * (100 / 130)))
        for (const h of hit) assert.ok(gm(r1.s).has(r1.s.units[`B:${h}`],
            "stun"),
        `${h} Choáng`)
    })
test("Lục: Q swap đứng đối diện + Tàng Hình; R swap đối diện địch ít máu nhất rồi lấy 1 lá Q lên tay",
    () => {
        const s = mk({
            A: {
                qiyana: 0, g3v_tank: 4
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
        assert.equal(u(rq.s,
            "A",
            "g3v_tank").lane,
        0,
        "đồng minh về ô cũ của Qiyana")
        assert.ok(gm(rq.s).has(u(rq.s,
            "A",
            "qiyana"),
        "stealth"),
        "Cỏ: Tàng Hình")
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
G("Vị trí: ô đối diện có tướng đã chết")
// ======================================================================
// Luật gọi tướng dần: đường đã mở luôn có người giữ, nhưng người giữ có thể là tướng ĐÃ CHẾT (giữ ô chờ hồi sinh).
// Sát thủ nhảy tới con mồi = swap với người giữ ô đối diện nó, kể cả đồng minh đã chết; tướng chết đi theo ô (homeLane đổi).
const playableArgs = (s: St, side: S, card: { uid: string }) => (cg.legalActions(s,
    side).filter((a) => a.t === "play" && a.uid === card.uid) as Extract<Act, { t: "play" }>[]).map((a) => a.args?.target)
for (const [hero,
    key] of [["zed",
        "E"],
    ["katarina",
        "E"],
    ["khazix",
        "E"],
    ["qiyana",
        "Q"]] as const) {
    test(`${hero} ${key}: đồng minh giữ ô đối diện con mồi đã chết thì vẫn swap tới (tướng chết về ô cũ) rồi mới gây sát thương`,
        () => {
            const s = mk({
                A: {
                    [hero]: 1, g3v_fighter: 3
                }, B: {
                    g3v_mage: 3, g3v_tank: 1
                }
            })
            gm(s).kill(u(s,
                "A",
                "g3v_fighter"))
            const card = give(s,
                "A",
                skill(s,
                    hero,
                    "A",
                    key))
            assert.ok(playableArgs(s,
                "A",
                card).includes("B:g3v_mage"),
            "lựa chọn hợp lệ có con mồi ở đường có đồng minh chết (bot thấy được)")
            const r = play(s,
                "A",
                card,
                {
                    target: "B:g3v_mage"
                })
            assert.equal(u(r.s,
                "A",
                hero).lane,
            3)
            assert.equal(r.s.lanes.A[1],
                "A:g3v_fighter",
                "tướng chết bị dời về ô cũ của sát thủ")
            assert.equal(u(r.s,
                "A",
                "g3v_fighter").homeLane,
            1)
            assert.equal(u(r.s,
                "A",
                "g3v_fighter").status,
            "dead",
            "không hồi sinh vì bị dời")
            assert.ok(dmgTo(r.ev,
                "B:g3v_mage",
                "skill") > 0,
            "tới đối diện rồi mới gây sát thương")
            if (hero === "khazix") assert.ok(gm(r.s).isolated(u(r.s,
                "B",
                "g3v_mage")))
        })
}
test("Zed Q / Kha'Zix Q: địch đối diện đã chết thì không đánh được (không bắn xa)",
    () => {
        for (const hero of ["zed",
            "khazix"]) {
            const s = mk({
                A: {
                    [hero]: 1
                }, B: {
                    g3v_tank: 1, g3v_mage: 3
                }
            })
            gm(s).kill(u(s,
                "B",
                "g3v_tank"))
            const q = give(s,
                "A",
                skill(s,
                    hero,
                    "A",
                    "Q"))
            assert.equal(playableArgs(s,
                "A",
                q).length,
            0,
            hero)
        }
    })
test("Kha'Zix R: địch đối diện đã chết thì bỏ phần Cô Lập (không chọn xa, không đổi chỗ) nhưng vẫn Tàng Hình và nhận Q",
    () => {
        const s = mk({
            A: {
                khazix: 1
            }, B: {
                g3v_tank: 1, g3v_mage: 3
            }
        })
        gm(s).kill(u(s,
            "B",
            "g3v_tank"))
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "khazix",
                    "A",
                    "R")))
        assert.equal(u(r.s,
            "A",
            "khazix").lane,
        1)
        assert.ok(!gm(r.s).isolated(u(r.s,
            "B",
            "g3v_mage")))
        assert.ok(gm(r.s).has(u(r.s,
            "A",
            "khazix"),
        "stealth"))
        assert.ok(r.s.players.A.hand.some((c) => c.id === "khazix_q"))
    })
test("Qiyana R Cỏ: địch ít Máu nhất ở đường có đồng minh chết thì vẫn swap tới đối diện nó",
    () => {
        const s = mk({
            A: {
                qiyana: 1, g3v_fighter: 3
            }, B: {
                g3v_mage: 3, g3v_tank: 1
            }
        })
        gm(s).kill(u(s,
            "A",
            "g3v_fighter"))
        const q = u(s,
            "A",
            "qiyana")
        gm(s).setStack(q,
            "element",
            3)
        u(s,
            "B",
            "g3v_mage").hp = 2000
        u(s,
            "B",
            "g3v_mage").maxHp = 2000
        u(s,
            "B",
            "g3v_tank").hp = 2500
        u(s,
            "B",
            "g3v_tank").maxHp = 2500
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "qiyana",
                    "A",
                    "R")))
        assert.equal(u(r.s,
            "A",
            "qiyana").lane,
        3)
        assert.equal(r.s.lanes.A[1],
            "A:g3v_fighter")
    })

// ======================================================================
// Soraka, Nami: kit cân bằng starci-33 (support v7) được kiểm thử trong scripts/card_tests_balance_support.ts
// ======================================================================

// ======================================================================
G("Chữ V2")
// ======================================================================
test("công thức EN khớp bản Việt của 6 tướng; từ khoá có đủ tên dùng trong chữ Việt",
    () => {
        const norm = (t: string) => [...t.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1].replace(/\s+/g,
            " ").trim()).join("|")
        for (const [id,
            en] of Object.entries(HERO_EN_V2_G3V)) {
            if (id === "soraka" || id === "nami") continue // kiểm trong card_tests_balance_support.ts (EN dùng "max HP")
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
