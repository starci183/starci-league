// Test cơ chế đặc trưng 6 tướng V2 nhóm G1: Darius, Garen, Aatrox, Gangplank, Yorick, Ornn.
// Chạy: npx tsx scripts/card_tests_heroes_g1.ts [--only=chuỗi] [--verbose]. Khung test chép từ scripts/card_tests.ts.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    kegsOf
} from "../packages/shared/src/cardgame/heroes/gangplank"

import * as DARIUS from "../packages/shared/src/cardgame/heroes/darius"
import * as GAREN from "../packages/shared/src/cardgame/heroes/garen"
import * as AATROX from "../packages/shared/src/cardgame/heroes/aatrox"
import * as YORICK from "../packages/shared/src/cardgame/heroes/yorick"
import * as ORNN from "../packages/shared/src/cardgame/heroes/ornn"
type St = ReturnType<typeof cg.newGame>
type Act = Parameters<typeof cg.applyAction>[1]
type Ev = ReturnType<typeof cg.applyAction>["events"]
type S = "A" | "B"
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

// Tướng giả: không có chiêu, không phản ứng
const noSkill = (key: "Q" | "E" | "R") => ({
    key, name: "-", desc: "-", target: "none" as const, canPlay: () => false, resolve: () => {}
})
for (const [id,
    role] of [["g1_tank",
        "tank"],
    ["g1_fighter",
        "fighter"],
    ["g1_mage",
        "mage"],
    ["g1_mark",
        "marksman"],
    ["g1_sup",
        "support"]] as const) {
    cg.defineHero({
        id, name: id, role, damage: "physical", hp: 1000, atk: 50, armor: 30, mr: 30, passive: {
            name: "-", desc: "-"
        }, skills: {
            Q: noSkill("Q"), E: noSkill("E"), R: noSkill("R")
        }
    })
}
const DUMMIES = ["g1_tank",
    "g1_fighter",
    "g1_mage",
    "g1_mark",
    "g1_sup"]

const SEED = 20261030
type Setup = { A?: Record<string, number>; B?: Record<string, number> }
/** Ván round 8 (mở hết đường), tướng đặt thẳng vào đường; đội bù bằng tướng giả; tay hai bên rỗng */
function mk(o: Setup = {
}): St {
    const fill = (x: string[]) => [...x,
        ...DUMMIES.filter((h) => !x.includes(h))].slice(0,
        Math.max(5,
            x.length))
    const s = cg.newGame(SEED,
        fill(Object.keys(o.A ?? {
        })),
        fill(Object.keys(o.B ?? {
        })))
    s.round = 8
    const g = new Game(s)
    for (const side of ["A",
        "B"] as const) for (const [h,
        lane] of Object.entries(o[side] ?? {
        })) g.summon(side,
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
function give(s: St, side: S, card: cg.Card) { s.players[side].hand.push(card); return card }
/** Nếu Chuỗi mở ra (đấu sĩ có đòn Quick) thì cả hai bỏ qua cho tới khi giải quyết xong */
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
/** Đánh 1 lá rồi giải quyết hết Chuỗi */
function play(s: St, side: S, card: { uid: string }, args: cg.PlayArgs = {
}) {
    const r = cg.applyAction(s,
        {
            t: "play", side, uid: card.uid, args
        })
    return settle({
        s: r.state, ev: r.events
    })
}
/** Đánh thường bằng lá Đánh thường */
function strike(s: St, side: S, actor: string, target: string) {
    return play(s,
        side,
        give(s,
            side,
            sup(s,
                "basic")),
        {
            actor, target
        })
}
const evs = <T extends cg.GameEvent["t"]>(ev: Ev, t: T) => ev.filter((e) => e.t === t) as Extract<cg.GameEvent, { t: T }>[]
const dmgTo = (ev: Ev, target: string, tag?: string) => evs(ev,
    "damage").filter((d) => d.target === target && d.src && (!tag || d.tag === tag)).reduce((x, d) => x + d.amount,
    0)
const inHand = (s: St, side: S, card: { uid: string }) => s.players[side].hand.some((c) => c.uid === card.uid)
/** Sát thương sau giáp 30 của tướng giả */
const afterArmor = (raw: number) => Math.round(raw * 100 / 130)
const playable = (s: St, side: S, card: { uid: string }) => cg.legalActions(s,
    side).filter((a) => a.t === "play" && a.uid === card.uid) as Extract<Act, { t: "play" }>[]

// ======================================================================
G("Darius")
// ======================================================================
test("đòn đánh trúng cắm 1 Chảy Máu cộng dồn; đầu lượt kẻ chảy máu mỗi Chảy Máu gây (3 + 5% AD)",
    () => {
        let s = mk({
            A: {
                darius: 2
            }, B: {
                g1_fighter: 2
            }
        })
        s = strike(s,
            "A",
            "A:darius",
            "B:g1_fighter").s
        s = strike(s,
            "A",
            "A:darius",
            "B:g1_fighter").s
        const foe = u(s,
            "B",
            "g1_fighter")
        assert.equal(gm(s).statusV(foe,
            "bleed"),
        2)
        const hp0 = foe.hp
        gm(s).hook("onTurnStart",
            {
                side: "B"
            })
        assert.equal(hp0 - foe.hp,
            afterArmor(2 * gm(s).f(u(s,
                "A",
                "darius"),
            DARIUS.F_TICK)))
        const a0 = foe.hp
        gm(s).hook("onTurnStart",
            {
                side: "A"
            })
        assert.equal(foe.hp,
            a0,
            "đầu lượt của Darius thì không chảy máu")
    })
test("Q gây (30 + 100% AD + 20% AP) vật lý, +2 Chảy Máu và hồi (6 + 8% AD + 2% AP) mỗi Chảy Máu trên nó",
    () => {
        let s = mk({
            A: {
                darius: 2
            }, B: {
                g1_fighter: 2
            }
        })
        const me = u(s,
            "A",
            "darius")
        me.hp = 100
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "darius",
                    "A",
                    "Q")))
        s = r.s
        assert.equal(dmgTo(r.ev,
            "B:g1_fighter",
            "skill"),
        afterArmor(gm(s).f(u(s,
            "A",
            "darius"),
        DARIUS.F_Q)))
        assert.equal(gm(s).statusV(u(s,
            "B",
            "g1_fighter"),
        "bleed"),
        2)
        assert.equal(u(s,
            "A",
            "darius").hp - 100,
        Math.round(2 * gm(s).f(u(s,
            "A",
            "darius"),
        DARIUS.F_Q_HEAL)))
    })
test("E: đối diện trống thì kéo 1 địch về và +1 Chảy Máu; đối diện có người thì chỉ đánh người đó",
    () => {
        let s = mk({
            A: {
                darius: 2
            }, B: {
                g1_fighter: 4, g1_tank: 0
            }
        })
        const e = give(s,
            "A",
            skill(s,
                "darius",
                "A",
                "E"))
        assert.ok(playable(s,
            "A",
            e).length >= 2,
        "đối diện trống: chọn được địch bất kỳ")
        const r = play(s,
            "A",
            e,
            {
                target: "B:g1_fighter"
            })
        s = r.s
        assert.equal(u(s,
            "B",
            "g1_fighter").lane,
        2)
        assert.equal(gm(s).statusV(u(s,
            "B",
            "g1_fighter"),
        "bleed"),
        1)
        assert.equal(dmgTo(r.ev,
            "B:g1_fighter",
            "skill"),
        afterArmor(gm(s).f(u(s,
            "A",
            "darius"),
        DARIUS.F_E)))
        const e2 = give(s,
            "A",
            skill(s,
                "darius",
                "A",
                "E"))
        assert.equal(playable(s,
            "A",
            e2).length,
        1,
        "đối diện có người: chỉ đánh người đó")
    })
test("R xả Chảy Máu thành (12 + 20% AD + 5% AP) sát thương chuẩn mỗi dấu; hạ gục thì lá R về tay",
    () => {
        let s = mk({
            A: {
                darius: 2
            }, B: {
                g1_fighter: 2
            }
        })
        const foe = u(s,
            "B",
            "g1_fighter")
        gm(s).status(foe,
            "bleed",
            2,
            {
                v: 4
            })
        foe.hp = 100
        assert.ok(4 * gm(s).f(u(s,
            "A",
            "darius"),
        DARIUS.F_R_STACK) >= 100)
        const r = give(s,
            "A",
            skill(s,
                "darius",
                "A",
                "R"))
        s = play(s,
            "A",
            r).s
        assert.equal(u(s,
            "B",
            "g1_fighter").status,
        "dead")
        assert.ok(inHand(s,
            "A",
            r),
        "R về tay vì hạ gục")
    })

// ======================================================================
G("Garen")
// ======================================================================
test("kẻ đối diện tấn công thì +1 Tội, kẻ không đối diện thì không; đòn đánh Garen thêm (6% AD + 2% AP) mỗi Tội",
    () => {
        let s = mk({
            B: {
                garen: 2
            }, A: {
                g1_fighter: 2, g1_mark: 0
            }
        })
        s = strike(s,
            "A",
            "A:g1_fighter",
            "B:garen").s
        assert.equal(gm(s).statusV(u(s,
            "A",
            "g1_fighter"),
        "guilt"),
        1)
        s = strike(s,
            "A",
            "A:g1_mark",
            "B:garen").s
        assert.equal(gm(s).statusV(u(s,
            "A",
            "g1_mark"),
        "guilt"),
        0)
        // Garen đánh kẻ có 2 Tội
        let t = mk({
            A: {
                garen: 2
            }, B: {
                g1_fighter: 2
            }
        })
        gm(t).status(u(t,
            "B",
            "g1_fighter"),
        "guilt",
        3,
        {
            v: 2
        })
        const me = u(t,
            "A",
            "garen")
        const r = strike(t,
            "A",
            "A:garen",
            "B:g1_fighter")
        t = r.s
        assert.equal(1000 - u(t,
            "B",
            "g1_fighter").hp,
        afterArmor(gm(t).atk(me)) + afterArmor(2 * gm(t).f(me,
            GAREN.F_PASSIVE)))
    })
test("Q gây (20 + 90% AD + 15% AP) + (15% AD + 3% AP) mỗi Tội, giữ nguyên Tội và Garen hồi 30% sát thương gây ra",
    () => {
        let s = mk({
            A: {
                garen: 2
            }, B: {
                g1_fighter: 2
            }
        })
        gm(s).status(u(s,
            "B",
            "g1_fighter"),
        "guilt",
        3,
        {
            v: 3
        })
        u(s,
            "A",
            "garen").hp = 100
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "garen",
                    "A",
                    "Q")))
        s = r.s
        const me = u(s,
            "A",
            "garen")
        const dealt = dmgTo(r.ev,
            "B:g1_fighter",
            "skill")
        assert.equal(dealt,
            afterArmor(gm(s).f(me,
                GAREN.F_Q) + 3 * gm(s).f(me,
                GAREN.F_Q_GUILT)))
        assert.equal(gm(s).statusV(u(s,
            "B",
            "g1_fighter"),
        "guilt"),
        3)
        assert.equal(me.hp - 100,
            Math.round(dealt * GAREN.Q_HEAL))
    })
test("E gây (20 + 100% AD + 20% AP) vật lý và +3 Tội (một nhát, không tính vào 3 đòn)",
    () => {
        let s = mk({
            A: {
                garen: 2
            }, B: {
                g1_fighter: 2
            }
        })
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "garen",
                    "A",
                    "E")))
        s = r.s
        assert.equal(dmgTo(r.ev,
            "B:g1_fighter",
            "skill"),
        afterArmor(gm(s).f(u(s,
            "A",
            "garen"),
        GAREN.F_E)))
        assert.equal(gm(s).statusV(u(s,
            "B",
            "g1_fighter"),
        "guilt"),
        3)
        assert.equal(gm(s).turnAttacks("A").used,
            0)
    })
test("R gây (80 + 70% AD + 20% AP) + 15 mỗi Tội sát thương chuẩn và Tội giữ nguyên",
    () => {
        let s = mk({
            A: {
                garen: 2
            }, B: {
                g1_fighter: 2
            }
        })
        gm(s).status(u(s,
            "B",
            "g1_fighter"),
        "guilt",
        3,
        {
            v: 4
        })
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "garen",
                    "A",
                    "R")))
        s = r.s
        assert.equal(dmgTo(r.ev,
            "B:g1_fighter",
            "skill"),
        Math.round(gm(s).f(u(s,
            "A",
            "garen"),
        GAREN.F_R) + 4 * GAREN.R_PER_GUILT))
        assert.equal(gm(s).statusV(u(s,
            "B",
            "g1_fighter"),
        "guilt"),
        4)
    })

// ======================================================================
G("Aatrox")
// ======================================================================
test("nội tại: đòn đánh gây thêm (15% máu đã mất + 5% AD + 2% AP)",
    () => {
        let s = mk({
            A: {
                aatrox: 2
            }, B: {
                g1_fighter: 2
            }
        })
        const me = u(s,
            "A",
            "aatrox")
        me.hp = me.maxHp - 100
        const r = strike(s,
            "A",
            "A:aatrox",
            "B:g1_fighter")
        s = r.s
        assert.equal(1000 - u(s,
            "B",
            "g1_fighter").hp,
        afterArmor(gm(s).atk(me)) + afterArmor(100 * AATROX.PASSIVE_PCT + gm(s).f(me,
            AATROX.F_PASSIVE)))
    })
test("Q trả 25% máu tối đa, địch nhận 120% lượng đó + (60% AD + 10% AP); máu 1 thì không đánh được",
    () => {
        let s = mk({
            A: {
                aatrox: 2
            }, B: {
                g1_fighter: 2
            }
        })
        const me = u(s,
            "A",
            "aatrox")
        const paid = Math.round(me.maxHp * AATROX.Q_PAY_PCT)
        const q = give(s,
            "A",
            skill(s,
                "aatrox",
                "A",
                "Q"))
        const r = play(s,
            "A",
            q)
        s = r.s
        assert.equal(me.maxHp - u(s,
            "A",
            "aatrox").hp,
        paid)
        assert.equal(dmgTo(r.ev,
            "B:g1_fighter",
            "skill"),
        afterArmor(paid * AATROX.Q_MULT + gm(s).f(u(s,
            "A",
            "aatrox"),
        AATROX.F_Q)))
        u(s,
            "A",
            "aatrox").hp = 1
        const q2 = give(s,
            "A",
            skill(s,
                "aatrox",
                "A",
                "Q"))
        assert.equal(playable(s,
            "A",
            q2).length,
        0)
    })
test("E (Quick): đòn đánh hồi máu bằng 100% sát thương gây ra",
    () => {
        let s = mk({
            A: {
                aatrox: 2
            }, B: {
                g1_fighter: 2
            }
        })
        const me = u(s,
            "A",
            "aatrox")
        me.hp = 100
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "aatrox",
                    "A",
                    "E"))).s
        const r = strike(s,
            "A",
            "A:aatrox",
            "B:g1_fighter")
        const dealt = 1000 - u(r.s,
            "B",
            "g1_fighter").hp
        assert.equal(u(r.s,
            "A",
            "aatrox").hp - 100,
        dealt)
    })
test("R: biến hình +30% AD, +30% máu tối đa; hạ gục kéo dài thêm 1 lượt; bị hạ thì hồi sinh tại chỗ một lần",
    () => {
        let s = mk({
            A: {
                aatrox: 2
            }, B: {
                g1_fighter: 2
            }
        })
        const me = () => u(s,
            "A",
            "aatrox")
        const atk0 = gm(s).atk(me())
        const max0 = me().maxHp
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "aatrox",
                    "A",
                    "R"))).s
        assert.ok(gm(s).isTransformed(me(),
            "aatrox_r"))
        assert.equal(gm(s).atk(me()),
            Math.round(atk0 * 1.3))
        assert.equal(me().maxHp,
            max0 + Math.round(max0 * AATROX.R_HP_PCT))
        assert.equal(me().hp,
            me().maxHp,
            "hồi ngay lượng máu tối đa cộng thêm")
        // hạ gục: kéo dài thêm 1 lượt của bạn
        const foe = u(s,
            "B",
            "g1_fighter")
        foe.hp = 1
        const until0 = me().transform!.until
        s = strike(s,
            "A",
            "A:aatrox",
            "B:g1_fighter").s
        assert.equal(u(s,
            "B",
            "g1_fighter").status,
        "dead")
        assert.equal(me().transform!.until,
            until0 + 2)
        // bị hạ: hồi sinh tại chỗ, hết biến hình, không mất mạng
        const lives = s.players.A.lives
        const g = gm(s)
        g.damage(undefined,
            me(),
            99999,
            "true")
        assert.equal(me().status,
            "board")
        assert.ok(me().hp > 0)
        assert.ok(!g.isTransformed(me()))
        assert.equal(s.players.A.lives,
            lives)
        g.damage(undefined,
            me(),
            99999,
            "true")
        assert.equal(me().status,
            "dead",
            "chỉ hồi sinh một lần mỗi lần R")
    })

// ======================================================================
G("Gangplank")

// ======================================================================
const fakeOf = (s: St, side: S, card: cg.Card) => play(s,
    side,
    give(s,
        side,
        card),
    {
        pick: "gp_fake"
    }).s
const placeE = (s: St) => play(s,
    "A",
    give(s,
        "A",
        skill(s,
            "gangplank",
            "A",
            "E"))).s
const startTurn = (s: St) => { gm(s).hook("onTurnStart",
    {
        side: "A"
    }) }
const gpOf = (s: St) => u(s,
    "A",
    "gangplank")
const mkGp = () => mk({
    A: {
        gangplank: 2
    }, B: {
        g1_fighter: 2, g1_tank: 1, g1_mark: 0
    }
})
/** Marksman địch đánh vào Thùng (duy nhất) của A */
const enemyShoot = (s: St) => {
    s.active = "B"
    s.turnNo++
    return strike(s,
        "B",
        "B:g1_mark",
        gm(s).tokenOf("A")!.id).s
}
const Hq = (s: St) => gm(s).f(gpOf(s),
    "100 + 60% AD + 15% AP")
test("E đặt Thùng thật vào ô phụ úp; Thuốc Súng +1 mỗi đầu lượt, không hết hạn; tối đa 1 Thùng",
    () => {
        const s = placeE(mkGp())
        const gp = gpOf(s)
        assert.ok(gm(s).tokenOf("A")!.token?.hidden)
        assert.equal(gm(s).tokenOf("A")!.stacks.kegs,
            1)
        assert.equal(kegsOf(gm(s),
            gp)[0].powder,
        1)
        for (let i = 0; i < 5; i++) startTurn(s)
        assert.equal(kegsOf(gm(s),
            gp)[0].powder,
        6)
        const e2 = give(s,
            "A",
            skill(s,
                "gangplank",
                "A",
                "E"))
        const legal = cg.legalActions(s,
            "A")
        assert.ok(!legal.some((a) => a.t === "play" && a.uid === e2.uid && !a.args?.pick),
            "đã có 1 Thùng: E không đặt thêm")
        assert.ok(!legal.some((a) => a.t === "play" && a.args?.pick === "gp_fake"),
            "đã có 1 Thùng: không úp Thùng giả")
    })
test("đòn đánh của Gangplank vào Thùng thật: 1 tướng địch ngẫu nhiên nhận sát thương theo Thuốc Súng (cả Đánh nhanh)",
    () => {
        let s = placeE(mkGp())
        startTurn(s)
        startTurn(s)
        const gp = gpOf(s)
        const hp0 = u(s,
            "B",
            "g1_fighter").hp
        const tok = gm(s).tokenOf("A")!
        s = strike(s,
            "A",
            "A:gangplank",
            tok.id).s
        const dmg = afterArmor(3 * gm(s).f(gp,
            "40 + 60% AD + 10% AP"))
        void hp0
        const lost = ["g1_fighter",
            "g1_tank",
            "g1_mark"].map((h) => 1000 - u(s,
            "B",
            h).hp)
        assert.equal(lost.filter((x) => x > 0).length,
            1,
            "chỉ 1 tướng địch nhận sát thương")
        assert.equal(Math.max(...lost),
            dmg)
        assert.equal(gm(s).tokenOf("A"),
            undefined,
            "thùng duy nhất đã nổ")
        // nút Đánh nhanh cũng kích nổ được
        const s2 = placeE(mkGp())
        assert.ok(cg.legalActions(s2,
            "A").some((a) => a.t === "attack" && !!a.cardless && a.target === gm(s2).tokenOf("A")!.id))
    })
test("úp BẤT KỲ lá trên tay làm Thùng giả: lá mất, địch thấy token úp; không hết chỗ thì không úp thêm",
    () => {
        let s = mkGp()
        const gold = sup(s,
            "gold")
        s = fakeOf(s,
            "A",
            gold)
        assert.ok(!s.players.A.hand.some((c) => c.uid === gold.uid))
        assert.equal(kegsOf(gm(s),
            gpOf(s))[0].real,
        false)
        assert.equal(kegsOf(gm(s),
            gpOf(s))[0].card?.uid,
        gold.uid)
        assert.ok(gm(s).tokenOf("A")!.token?.hidden)
        const extra = give(s,
            "A",
            sup(s,
                "gold"))
        assert.ok(!cg.legalActions(s,
            "A").some((a) => a.t === "play" && a.uid === extra.uid && a.args?.pick === "gp_fake"),
        "đã có 1 Thùng: không úp thêm")
        // chỉ có Thùng giả: không có ngòi nổ thật, nhưng vẫn "ăn" được (đòn bị phí)
        const s3 = fakeOf(mkGp(),
            "A",
            sup(mkGp(),
                "gold"))
        const gold3 = s3.players.A.grave.length
        const s4 = strike(s3,
            "A",
            "A:gangplank",
            gm(s3).tokenOf("A")!.id).s
        assert.equal(gm(s4).tokenOf("A"),
            undefined)
        assert.equal(s4.players.A.grave.length,
            gold3 + 1,
            "lá Thùng giả vào mộ")
        assert.equal(u(s4,
            "B",
            "g1_fighter").hp,
        1000,
        "không ai bị sát thương")
    })
test("R thêm 1 lá Q + 1 lá E của Gangplank lên tay; Q hồi máu cho riêng Gangplank",
    () => {
        let s = mkGp()
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "gangplank",
                    "A",
                    "R"))).s
        const hand = s.players.A.hand
        assert.equal(hand.filter((c) => c.id === "gangplank_q").length,
            1)
        assert.equal(hand.filter((c) => c.id === "gangplank_e").length,
            1)
        s.units["A:gangplank"].hp = 100
        const h = Hq(s)
        s = play(s,
            "A",
            hand.find((c) => c.id === "gangplank_q")!).s
        assert.ok(Math.abs(gpOf(s).hp - (100 + h)) < 1)
    })
test("Xạ thủ địch phá Thùng: giả thường hồi 30% H, Thùng giả là lá Cam hồi 160% H, Thùng thật vỡ không nổ không hồi",
    () => {
        const heal = (mkCard: (s: St) => cg.Card, expectPct: number) => {
            let s = mkGp()
            s = fakeOf(s,
                "A",
                mkCard(s))
            s.units["A:gangplank"].hp = 100
            const h = Hq(s)
            s = enemyShoot(s)
            assert.equal(gm(s).tokenOf("A"),
                undefined)
            assert.ok(Math.abs(gpOf(s).hp - (100 + h * expectPct)) < 1,
                `hồi ${expectPct}`)
            assert.equal(s.players.A.grave.length,
                1,
                "lá lật vào mộ")
        }
        heal((s) => sup(s,
            "gold"),
        0.3)
        heal((s) => skill(s,
            "gangplank",
            "A",
            "Q"),
        1.6)
        let s = placeE(mkGp())
        s.units["A:gangplank"].hp = 100
        const hpB = u(s,
            "B",
            "g1_fighter").hp
        s = enemyShoot(s)
        assert.equal(gpOf(s).hp,
            100)
        assert.equal(u(s,
            "B",
            "g1_fighter").hp,
        hpB)
        assert.equal(gm(s).tokenOf("A"),
            undefined)
    })
test("Gangplank tự đánh Thùng giả là lá Cam: ăn nó, hồi 40% H, lá vào mộ",
    () => {
        let s = fakeOf(mkGp(),
            "A",
            skill(mkGp(),
                "gangplank",
                "A",
                "Q"))
        s.units["A:gangplank"].hp = 100
        const h = Hq(s)
        s = strike(s,
            "A",
            "A:gangplank",
            gm(s).tokenOf("A")!.id).s
        assert.ok(Math.abs(gpOf(s).hp - (100 + h * 0.4)) < 1)
        assert.equal(s.players.A.grave.length,
            1)
        assert.equal(gm(s).tokenOf("A"),
            undefined)
    })
test("Đấu sĩ địch cũng đánh vỡ được Thùng (đánh thường lẫn Đánh nhanh), giả hay thật đều như Xạ thủ",
    () => {
        let s = fakeOf(mkGp(),
            "A",
            sup(mkGp(),
                "gold"))
        const tok = gm(s).tokenOf("A")!
        s.active = "B"
        s.turnNo++
        const legal = cg.legalActions(s,
            "B")
        assert.ok(legal.some((a) => a.t === "attack" && !!a.cardless && a.actor === "B:g1_fighter" && a.target === tok.id),
            "Đánh nhanh của Đấu sĩ nhắm được Thùng")
        s.units["A:gangplank"].hp = 100
        const h = Hq(s)
        s = strike(s,
            "B",
            "B:g1_fighter",
            tok.id).s
        assert.equal(gm(s).tokenOf("A"),
            undefined)
        assert.ok(Math.abs(gpOf(s).hp - (100 + h * 0.3)) < 1)
        assert.equal(s.players.A.grave.length,
            1)
    })

// ======================================================================
G("Yorick")
// ======================================================================
test("nội tại: đòn đánh gây (50% + 2%/lá mộ, tối đa 130%), vứt 1 lá trên cùng bộ bài vào mộ và rút 1 lá (tối đa 2 lá/lượt)",
    () => {
        let s = mk({
            A: {
                yorick: 2
            }, B: {
                g1_fighter: 2
            }
        })
        const me = u(s,
            "A",
            "yorick")
        const deck0 = s.players.A.deck.length
        const grave0 = s.players.A.grave.length
        const hand0 = s.players.A.hand.length
        s = strike(s,
            "A",
            "A:yorick",
            "B:g1_fighter").s
        assert.equal(s.players.A.deck.length,
            deck0 - 2,
            "1 lá vứt + 1 lá rút")
        assert.equal(s.players.A.grave.length,
            grave0 + 1,
            "1 lá vứt từ bộ vào mộ")
        assert.equal(s.players.A.hand.length,
            hand0 + 1,
            "rút bù 1 lá (lá Đánh thường được tạo rồi dùng ngay)")
        assert.equal(1000 - u(s,
            "B",
            "g1_fighter").hp,
        afterArmor(gm(s).atk(me) * YORICK.attackMult(grave0)))
        // đòn 2 và 3 cùng lượt: chỉ đòn 2 còn rút
        const deck1 = s.players.A.deck.length
        s = strike(s,
            "A",
            "A:yorick",
            "B:g1_fighter").s
        assert.equal(s.players.A.deck.length,
            deck1 - 2)
        const deck2 = s.players.A.deck.length
        s = strike(s,
            "A",
            "A:yorick",
            "B:g1_fighter").s
        assert.equal(s.players.A.deck.length,
            deck2 - 1,
            "đòn thứ 3 chỉ vứt, không rút (tối đa 2 lá/lượt)")
        assert.equal(YORICK.attackMult(0),
            YORICK.ATTACK_BASE)
        assert.equal(YORICK.attackMult(1000),
            YORICK.ATTACK_MAX)
    })
test("Q bỏ 1 lá trên tay vào mộ, rút 1 lá và Yorick hồi (35 + 30% AD + 5% AP)",
    () => {
        let s = mk({
            A: {
                yorick: 2
            }, B: {
                g1_fighter: 2
            }
        })
        const me = () => u(s,
            "A",
            "yorick")
        me().hp = 100
        const junk = give(s,
            "A",
            sup(s,
                "basic"))
        const q = give(s,
            "A",
            skill(s,
                "yorick",
                "A",
                "Q"))
        const grave0 = s.players.A.grave.length
        s = play(s,
            "A",
            q,
            {
                discard: [junk.uid]
            }).s
        assert.ok(!inHand(s,
            "A",
            junk))
        assert.equal(s.players.A.hand.length,
            1,
            "rút bù 1 lá")
        assert.equal(s.players.A.grave.length,
            grave0 + 2)
        assert.equal(me().hp - 100,
            Math.round(gm(s).f(me(),
                "35 + 30% AD + 5% AP")))
    })
test("E vứt 3 lá trên cùng bộ bài vào mộ rồi chọn 1 lá trong 3 lá đó về tay",
    () => {
        let s = mk({
            A: {
                yorick: 2
            }, B: {
                g1_fighter: 2
            }
        })
        const top3 = s.players.A.deck.slice(0,
            3).map((c) => c.uid)
        const deck0 = s.players.A.deck.length
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "yorick",
                    "A",
                    "E"))).s
        assert.equal(s.players.A.deck.length,
            deck0 - 3)
        const picks = s.players.A.hand.filter((c) => c.id === "pick_card")
        assert.equal(picks.length,
            3,
            "3 lá chọn tạm trên tay")
        const choose = picks.find((c) => c.data?.uid === top3[1])!
        s = play(s,
            "A",
            choose).s
        assert.ok(s.players.A.hand.some((c) => c.uid === top3[1]),
            "lá được chọn về tay")
        assert.ok(s.players.A.grave.some((c) => c.uid === top3[0]))
        assert.ok(s.players.A.grave.some((c) => c.uid === top3[2]))
        assert.equal(s.players.A.hand.filter((c) => c.id === "pick_card").length,
            0,
            "các lá chọn còn lại biến mất")
    })
test("mộ đạt 20 (rồi 40...) lá: lá R Thiếu Nữ tự lên tay (từ bộ, không có thì từ mộ); bỏ qua nếu tay đã có R",
    () => {
        const setup = () => {
            const s = mk({
                A: {
                    yorick: 2
                }, B: {
                    g1_fighter: 2
                }
            })
            s.players.A.hand = s.players.A.hand.filter((c) => c.id !== "yorick_r")
            s.players.A.grave = Array.from({
                length: YORICK.R_GRAVE_STEP - 1
            },
            () => sup(s,
                "basic"))
            return s
        }
        const rIn = (cards: cg.Card[]) => cards.filter((c) => c.id === "yorick_r").length
        // từ bộ bài
        let s = setup()
        const deckR = rIn(s.players.A.deck)
        assert.ok(deckR > 0)
        s = strike(s,
            "A",
            "A:yorick",
            "B:g1_fighter").s
        assert.equal(rIn(s.players.A.hand),
            1,
            "mộ đủ 20: lá R lên tay")
        assert.equal(rIn(s.players.A.deck),
            deckR - 1)
        // không còn trong bộ: lấy từ mộ
        s = setup()
        const rCard = s.players.A.deck.find((c) => c.id === "yorick_r")!
        s.players.A.deck = s.players.A.deck.filter((c) => c.id !== "yorick_r")
        s.players.A.grave.push(rCard)
        s.players.A.grave.shift()
        s = strike(s,
            "A",
            "A:yorick",
            "B:g1_fighter").s
        assert.equal(rIn(s.players.A.hand),
            1,
            "lấy lá R từ mộ")
        // tay đã có R: bỏ qua
        s = setup()
        give(s,
            "A",
            skill(s,
                "yorick",
                "A",
                "R"))
        const deck0 = rIn(s.players.A.deck)
        s = strike(s,
            "A",
            "A:yorick",
            "B:g1_fighter").s
        assert.equal(rIn(s.players.A.hand),
            1)
        assert.equal(rIn(s.players.A.deck),
            deck0,
            "tay đã có R: không lấy thêm")
    })
test("R: Thiếu Nữ đánh ngay + Yorick nhận Ma Sương vĩnh viễn (cộng dồn); đầu lượt Thiếu Nữ đánh, Yorick hồi, đào 1 lá; Yorick nhận ít sát thương hơn",
    () => {
        let s = mk({
            A: {
                yorick: 2
            }, B: {
                g1_fighter: 2
            }
        })
        s.players.A.grave = Array.from({
            length: 10
        },
        () => sup(s,
            "basic"))
        const me = () => u(s,
            "A",
            "yorick")
        const foe = () => u(s,
            "B",
            "g1_fighter")
        const hp0 = foe().hp
        me().hp = me().maxHp - 200
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "yorick",
                    "A",
                    "R")))
        s = r.s
        assert.equal(gm(s).tokenOf("A"),
            undefined,
            "không còn token")
        assert.equal(gm(s).statusV(me(),
            YORICK.MIST),
        1)
        const n0 = Math.floor(10 / YORICK.GRAVE_STEP)
        assert.equal(hp0 - foe().hp,
            afterArmor(foe().maxHp * YORICK.MAIDEN_PCT_PER_STEP * n0 + gm(s).f(me(),
                YORICK.F_MAIDEN)),
            "Thiếu Nữ đánh ngay khi dùng R")
        assert.ok(me().hp > me().maxHp - 200,
            "Yorick hồi")
        // giảm sát thương
        const cut = YORICK.mistCut(gm(s),
            me())
        assert.ok(Math.abs(cut - Math.min(YORICK.MIST_CUT_MAX,
            YORICK.MIST_CUT_BASE + YORICK.MIST_CUT_PER_ARMOR * gm(s).armor(me()))) < 1e-9)
        // cộng dồn
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "yorick",
                    "A",
                    "R"))).s
        assert.equal(gm(s).statusV(me(),
            YORICK.MIST),
        2)
        assert.ok(YORICK.mistCut(gm(s),
            me()) > cut && YORICK.mistCut(gm(s),
            me()) <= YORICK.MIST_CUT_TOTAL_MAX)
        // đầu lượt: mỗi tầng Thiếu Nữ đánh 1 lần và đào 1 lá
        const g = gm(s)
        const deck0 = s.players.A.deck.length
        const f0 = foe().hp
        g.hook("onTurnStart",
            {
                side: "A"
            })
        assert.equal(s.players.A.deck.length,
            deck0 - 2,
            "2 tầng: đào 2 lá")
        assert.ok(foe().hp < f0 || foe().status !== "board",
            "Thiếu Nữ đánh")
    })

// ======================================================================
G("Ornn")
// ======================================================================
test("nội tại: đồ phe mình +(10% + 2%/100 AD + 2%/100 AP + 1% mỗi vòng đã mặc); gỡ ra đếm lại; Ornn chết thì tắt",
    () => {
        const s = mk({
            A: {
                ornn: 2, g1_fighter: 1
            }, B: {
                g1_tank: 2
            }
        })
        const g = gm(s)
        const ornn = u(s,
            "A",
            "ornn")
        const ally = u(s,
            "A",
            "g1_fighter")
        assert.ok(g.equip(ally,
            "kiem_dai"))
        const aura = (rounds: number) => (12 + 2 * g.atk(ornn) / 100 + 2 * g.ap(ornn) / 100 + rounds) / 100
        const withOrnn0 = g.stats(ally).atk
        assert.equal(g.ap(ornn),
            0,
            "AP gốc = 0 (luật chủ)")
        s.round += 3
        const withOrnn3 = g.stats(ally).atk
        // gỡ ra mặc lại: đếm lại từ đầu
        ally.itemSince = [s.round]
        assert.ok(Math.abs(g.stats(ally).atk - withOrnn0) < 0.01,
            "mặc lại thì đếm lại từ 0 vòng")
        g.kill(ornn)
        const base = g.stats(ally).atk
        assert.ok(base > 0)
        assert.ok(Math.abs(withOrnn0 - base * (1 + aura(0))) < 0.01,
            `vòng 0: ${withOrnn0} vs ${base * (1 + aura(0))}`)
        assert.ok(Math.abs(withOrnn3 - base * (1 + aura(3))) < 0.01,
            "mặc 3 vòng thì mạnh hơn")
    })
test("Q gây (56 + 6% máu tối đa + 50% Giáp + 20% AP) sát thương phép và Giảm Giáp 20 đến hết lượt sau",
    () => {
        let s = mk({
            A: {
                ornn: 2
            }, B: {
                g1_fighter: 2
            }
        })
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "ornn",
                    "A",
                    "Q")),
            {
                target: "B:g1_fighter"
            })
        s = r.s
        assert.equal(dmgTo(r.ev,
            "B:g1_fighter",
            "skill"),
        afterArmor(gm(s).f(u(s,
            "A",
            "ornn"),
        ORNN.F_Q)))
        const foe = u(s,
            "B",
            "g1_fighter")
        assert.equal(gm(s).statusV(foe,
            ORNN.SHRED),
        ORNN.Q_SHRED)
        const hp0 = foe.hp
        gm(s).damage(u(s,
            "A",
            "ornn"),
        foe,
        100,
        "physical")
        assert.equal(hp0 - foe.hp,
            Math.round(100 * 100 / 110),
            "Giáp 30 giảm còn 10")
    })
test("E (Quick, nối chuỗi): địch đánh 1 đồng minh thì kẻ đánh nhận sát thương phép + Choáng 1 lượt",
    () => {
        let s = mk({
            A: {
                ornn: 1, g1_tank: 2
            }, B: {
                g1_fighter: 2
            }
        })
        const e = give(s,
            "A",
            skill(s,
                "ornn",
                "A",
                "E"))
        s.active = "B"
        s.turnNo++
        const b = give(s,
            "B",
            sup(s,
                "basic"))
        let r = cg.applyAction(s,
            {
                t: "play", side: "B", uid: b.uid, args: {
                    actor: "B:g1_fighter", target: "A:g1_tank"
                }
            })
        assert.equal(r.state.phase,
            "chain")
        const opt = cg.legalActions(r.state,
            "A").find((a) => a.t === "chain" && a.uid === e.uid)
        assert.ok(opt,
            "Lao Húc nối được lên đòn đánh 1 đồng minh")
        r = cg.applyAction(r.state,
            opt)
        const out = settle({
            s: r.state, ev: r.events
        })
        s = out.s
        const foe = u(s,
            "B",
            "g1_fighter")
        assert.ok(gm(s).has(foe,
            "stun"))
        assert.equal(dmgTo(out.ev,
            "B:g1_fighter",
            "skill"),
        afterArmor(gm(s).f(u(s,
            "A",
            "ornn"),
        ORNN.F_E)))
    })
test("R: Ornn và 1 đồng minh khác mỗi người nhận 1 món hoàn chỉnh (mặc ngay nếu còn ô, không thì vào tay)",
    () => {
        let s = mk({
            A: {
                ornn: 2, g1_fighter: 1
            }, B: {
                g1_tank: 2
            }
        })
        const ally = () => u(s,
            "A",
            "g1_fighter")
        const ornn = () => u(s,
            "A",
            "ornn")
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "ornn",
                    "A",
                    "R")),
            {
                target: "A:g1_fighter"
            }).s
        assert.equal(ornn().items.length,
            1)
        assert.equal(ally().items.length,
            1)
        // ô đầy: món vào tay
        ally().items = ["kiem_dai",
            "kiem_dai",
            "kiem_dai"]
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "ornn",
                    "A",
                    "R")),
            {
                target: "A:g1_fighter"
            }).s
        assert.equal(ally().items.length,
            3)
        assert.equal(s.players.A.hand.filter((c) => c.id === "legend").length,
            1)
    })

// ======================================================================
G("Smoke")
// ======================================================================
test("6 tướng G1 chơi bot-vs-bot vài ván không lỗi",
    () => {
        const A = ["darius",
            "garen",
            "aatrox",
            "gangplank",
            "yorick"]
        const B = ["ornn",
            "garen",
            "darius",
            "yorick",
            "gangplank"]
        for (let k = 0; k < 3; k++) {
            let s = cg.newGame(SEED + k,
                k % 2 ? A : B,
                k % 2 ? B : A)
            for (let i = 0; i < 600 && s.phase !== "over"; i++) s = cg.applyAction(s,
                cg.chooseAction(s,
                    cg.actorsOf(s)[0])).state
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
