// Test cơ chế đặc trưng 6 tướng V2 nhóm G1: Darius, Garen, Aatrox, Gangplank, Yorick, Ornn.
// Chạy: npx tsx scripts/card_tests_heroes_g1.ts [--only=chuỗi] [--verbose]. Khung test chép từ scripts/card_tests.ts.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    kegsOf
} from "../packages/shared/src/cardgame/heroes/gangplank"

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
const hasCard = (s: St, side: S, id: string) => s.players[side].hand.find((c) => c.id === id)
/** Sát thương sau giáp 30 của tướng giả */
const afterArmor = (raw: number) => Math.round(raw * 100 / 130)
const playable = (s: St, side: S, card: { uid: string }) => cg.legalActions(s,
    side).filter((a) => a.t === "play" && a.uid === card.uid) as Extract<Act, { t: "play" }>[]

// ======================================================================
G("Darius")
// ======================================================================
test("đòn đánh trúng cắm 1 Chảy Máu và cộng dồn",
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
        assert.equal(gm(s).statusV(u(s,
            "B",
            "g1_fighter"),
        "bleed"),
        1)
        s = strike(s,
            "A",
            "A:darius",
            "B:g1_fighter").s
        assert.equal(gm(s).statusV(u(s,
            "B",
            "g1_fighter"),
        "bleed"),
        2)
    })
test("Q gây sát thương vật lý lớn và +2 Chảy Máu",
    () => {
        let s = mk({
            A: {
                darius: 2
            }, B: {
                g1_fighter: 2
            }
        })
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
        "20 + 110% AD")))
        assert.equal(gm(s).statusV(u(s,
            "B",
            "g1_fighter"),
        "bleed"),
        2)
    })
test("R xả Chảy Máu thành sát thương chuẩn; hạ gục thì lá R về tay",
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
        "20 + 30% AD") >= 100)
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
test("E kéo 1 địch về đối diện khi trống; đối diện có người thì chỉ đánh người đó",
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
        s = play(s,
            "A",
            e,
            {
                target: "B:g1_fighter"
            }).s
        assert.equal(u(s,
            "B",
            "g1_fighter").lane,
        2)
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

// ======================================================================
G("Garen")
// ======================================================================
test("kẻ đối diện tấn công thì +1 Tội, kẻ không đối diện thì không",
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
    })
test("Q gây thêm sát thương theo Tội và không tiêu Tội",
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
        assert.equal(dmgTo(r.ev,
            "B:g1_fighter",
            "skill"),
        afterArmor(gm(s).f(me,
            "20 + 90% AD") + 3 * gm(s).f(me,
            "20% AD")))
        assert.equal(gm(s).statusV(u(s,
            "B",
            "g1_fighter"),
        "guilt"),
        3)
    })
test("E chém 3 nhát (sát thương chiêu) và +3 Tội, không tính vào 3 đòn",
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
        assert.equal(evs(r.ev,
            "damage").filter((d) => d.target === "B:g1_fighter" && d.tag === "skill").length,
        3)
        assert.equal(gm(s).statusV(u(s,
            "B",
            "g1_fighter"),
        "guilt"),
        3)
        assert.equal(gm(s).turnAttacks("A").used,
            0)
    })
test("R xả toàn bộ Tội thành sát thương chuẩn",
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
            v: 5
        })
        const before = u(s,
            "B",
            "g1_fighter").hp
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "garen",
                    "A",
                    "R"))).s
        assert.equal(before - u(s,
            "B",
            "g1_fighter").hp,
        Math.round(5 * gm(s).f(u(s,
            "A",
            "garen"),
        "25 + 60% AD")))
        assert.equal(gm(s).statusV(u(s,
            "B",
            "g1_fighter"),
        "guilt"),
        0)
    })

// ======================================================================
G("Aatrox")
// ======================================================================
test("Q trả 25% máu tối đa, địch nhận gấp 2 lượng đó; máu 1 thì không đánh được",
    () => {
        let s = mk({
            A: {
                aatrox: 2
            }, B: {
                g1_fighter: 2
            }
        })
        const max = u(s,
            "A",
            "aatrox").maxHp
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "aatrox",
                    "A",
                    "Q")))
        s = r.s
        const paid = Math.round(max * 0.25)
        assert.equal(max - u(s,
            "A",
            "aatrox").hp,
        paid)
        assert.equal(dmgTo(r.ev,
            "B:g1_fighter",
            "skill"),
        afterArmor(paid * 2))
        u(s,
            "A",
            "aatrox").hp = 1
        assert.equal(playable(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "aatrox",
                    "A",
                    "Q"))).length,
        0)
    })
test("nội tại: đòn đánh gây thêm 25% máu đã mất",
    () => {
        const s0 = mk({
            A: {
                aatrox: 2
            }, B: {
                g1_fighter: 2
            }
        })
        const me = u(s0,
            "A",
            "aatrox")
        me.hp = me.maxHp - 200
        const r = strike(s0,
            "A",
            "A:aatrox",
            "B:g1_fighter")
        assert.equal(dmgTo(r.ev,
            "B:g1_fighter",
            "attack"),
        afterArmor(gm(r.s).atk(u(r.s,
            "A",
            "aatrox"))) + afterArmor(50))
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
        u(s,
            "A",
            "aatrox").hp = u(s,
            "A",
            "aatrox").maxHp - 300
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "aatrox",
                    "A",
                    "E"))).s
        const hp0 = u(s,
            "A",
            "aatrox").hp
        const r = strike(s,
            "A",
            "A:aatrox",
            "B:g1_fighter")
        const dealt = dmgTo(r.ev,
            "B:g1_fighter",
            "attack")
        assert.ok(dealt > 0)
        assert.equal(u(r.s,
            "A",
            "aatrox").hp - hp0,
        dealt)
    })
test("R: địch nhận 2 lần máu đã mất, Aatrox hồi đúng lượng đó (đầy máu)",
    () => {
        const s0 = mk({
            A: {
                aatrox: 2
            }, B: {
                g1_fighter: 2
            }
        })
        u(s0,
            "A",
            "aatrox").hp = u(s0,
            "A",
            "aatrox").maxHp - 150
        const out = play(s0,
            "A",
            give(s0,
                "A",
                skill(s0,
                    "aatrox",
                    "A",
                    "R")))
        assert.equal(dmgTo(out.ev,
            "B:g1_fighter",
            "skill"),
        afterArmor(300))
        assert.equal(u(out.s,
            "A",
            "aatrox").hp,
        u(out.s,
            "A",
            "aatrox").maxHp)
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
    "100 + 60% AD")
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
test("đòn đánh của Gangplank vào Thùng thật: mọi tướng địch nhận sát thương theo Thuốc Súng (cả Đánh nhanh)",
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
            "15 + 30% AD"))
        assert.equal(hp0 - u(s,
            "B",
            "g1_fighter").hp,
        dmg)
        assert.equal(1000 - u(s,
            "B",
            "g1_tank").hp,
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
test("Xạ thủ địch phá Thùng: giả thường hồi 30% H, Thùng giả là lá Cam hồi 100% H, Thùng thật vỡ không nổ không hồi",
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
        1)
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
test("Gangplank tự đánh Thùng giả là lá Cam: ăn nó, hồi 60% H, lá vào mộ",
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
        assert.ok(Math.abs(gpOf(s).hp - (100 + h * 0.6)) < 1)
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
const fillGrave = (s: St, side: S, n: number) => { for (let i = 0; i < n; i++) s.players[side].grave.push(sup(s,
    "gold")) }
test("nội tại: mỗi lá trong mộ +1.5 AD và +8 máu tối đa",
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
        const atk0 = gm(s).atk(me)
        const max0 = me.maxHp
        fillGrave(s,
            "A",
            10)
        assert.equal(gm(s).atk(me) - atk0,
            15)
        s = strike(s,
            "A",
            "A:yorick",
            "B:g1_fighter").s
        assert.ok(u(s,
            "A",
            "yorick").maxHp - max0 >= 80)
    })
test("Q bỏ 1 lá trên tay vào mộ rồi rút 1 lá",
    () => {
        let s = mk({
            A: {
                yorick: 2
            }, B: {
                g1_fighter: 2
            }
        })
        const junk = give(s,
            "A",
            sup(s,
                "gold"))
        const q = give(s,
            "A",
            skill(s,
                "yorick",
                "A",
                "Q"))
        const deck0 = s.players.A.deck.length
        assert.ok(playable(s,
            "A",
            q).length >= 1)
        s = play(s,
            "A",
            q,
            {
                discard: [junk.uid]
            }).s
        assert.ok(s.players.A.grave.some((c) => c.uid === junk.uid))
        assert.ok(s.players.A.grave.some((c) => c.uid === q.uid))
        assert.equal(s.players.A.deck.length,
            deck0 - 1)
        assert.equal(s.players.A.hand.length,
            1)
    })
test("E lấy về tay chiêu (không R) của đồng minh khác trong mộ, không lấy chiêu của chính Yorick",
    () => {
        let s = mk({
            A: {
                yorick: 2, darius: 1
            }, B: {
                g1_fighter: 2
            }
        })
        const dq = skill(s,
            "darius",
            "A",
            "Q")
        const dr = skill(s,
            "darius",
            "A",
            "R")
        const yq = skill(s,
            "yorick",
            "A",
            "Q")
        s.players.A.grave.push(dq,
            dr,
            yq)
        const e = give(s,
            "A",
            skill(s,
                "yorick",
                "A",
                "E"))
        const opts = playable(s,
            "A",
            e)
        assert.equal(opts.length,
            1,
            "chỉ Q của Darius hợp lệ")
        s = play(s,
            "A",
            e,
            opts[0].args).s
        assert.ok(inHand(s,
            "A",
            dq))
        assert.ok(!inHand(s,
            "A",
            dr))
        assert.ok(!inHand(s,
            "A",
            yq))
    })
test("R: đòn đánh gây thêm theo số lá trong mộ và hút máu",
    () => {
        let s = mk({
            A: {
                yorick: 2
            }, B: {
                g1_fighter: 2
            }
        })
        u(s,
            "A",
            "yorick").hp = u(s,
            "A",
            "yorick").maxHp - 100
        fillGrave(s,
            "A",
            10)
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "yorick",
                    "A",
                    "R"))).s
        const hp0 = u(s,
            "A",
            "yorick").hp
        const out = strike(s,
            "A",
            "A:yorick",
            "B:g1_fighter")
        const atk = gm(out.s).atk(u(out.s,
            "A",
            "yorick"))
        assert.ok(dmgTo(out.ev,
            "B:g1_fighter",
            "attack") >= afterArmor(atk + 3 * 11) - 2,
        "gồm 3 sát thương mỗi lá trong mộ")
        assert.ok(u(out.s,
            "A",
            "yorick").hp > hp0,
        "hút máu")
    })

// ======================================================================
G("Ornn")
// ======================================================================
test("đầu lượt nhận lá Lò Rèn: chọn tướng mình +1 Rèn (vĩnh viễn, tối đa 10)",
    () => {
        let s = mk({
            A: {
                ornn: 2, g1_fighter: 1
            }, B: {
                g1_tank: 2
            }
        })
        gm(s).hook("onTurnStart",
            {
                side: "A"
            })
        assert.ok(hasCard(s,
            "A",
            "ornn_forge"))
        s = play(s,
            "A",
hasCard(s,
    "A",
    "ornn_forge")!,
{
    target: "A:g1_fighter"
}).s
        assert.equal(gm(s).stackOf(u(s,
            "A",
            "g1_fighter"),
        "forge"),
        1)
        gm(s).setStack(u(s,
            "A",
            "g1_fighter"),
        "forge",
        10)
        gm(s).hook("onTurnStart",
            {
                side: "A"
            })
        s = play(s,
            "A",
hasCard(s,
    "A",
    "ornn_forge")!,
{
    target: "A:g1_fighter"
}).s
        assert.equal(gm(s).stackOf(u(s,
            "A",
            "g1_fighter"),
        "forge"),
        10,
        "trần 10")
    })
test("Q bỏ 1 lá: +3 Rèn; R nhân đôi Rèn mọi đồng minh (kẹp 10)",
    () => {
        let s = mk({
            A: {
                ornn: 2, g1_fighter: 1
            }, B: {
                g1_tank: 2
            }
        })
        const junk = give(s,
            "A",
            sup(s,
                "gold"))
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "ornn",
                    "A",
                    "Q")),
            {
                target: "A:g1_fighter", discard: [junk.uid]
            }).s
        assert.equal(gm(s).stackOf(u(s,
            "A",
            "g1_fighter"),
        "forge"),
        3)
        assert.ok(s.players.A.grave.some((c) => c.uid === junk.uid))
        gm(s).setStack(u(s,
            "A",
            "ornn"),
        "forge",
        7)
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "ornn",
                    "A",
                    "R"))).s
        assert.equal(gm(s).stackOf(u(s,
            "A",
            "g1_fighter"),
        "forge"),
        6)
        assert.equal(gm(s).stackOf(u(s,
            "A",
            "ornn"),
        "forge"),
        10)
    })
test("Rèn tăng sát thương vật lý của chủ; E nhân đôi Rèn tới hết lượt",
    () => {
        const run = (forge: number, withE: boolean) => {
            let s = mk({
                A: {
                    ornn: 2, g1_fighter: 1
                }, B: {
                    g1_tank: 1
                }
            })
            gm(s).setStack(u(s,
                "A",
                "g1_fighter"),
            "forge",
            forge)
            if (withE) s = play(s,
                "A",
                give(s,
                    "A",
                    skill(s,
                        "ornn",
                        "A",
                        "E")),
                {
                    target: "A:g1_fighter"
                }).s
            return dmgTo(strike(s,
                "A",
                "A:g1_fighter",
                "B:g1_tank").ev,
            "B:g1_tank",
            "attack")
        }
        assert.equal(run(0,
            false),
        Math.round(50 * 100 / 130))
        assert.equal(run(4,
            false),
        Math.round(50 * 1.2 * 100 / 130))
        assert.equal(run(4,
            true),
        Math.round(50 * 1.4 * 100 / 130))
    })
test("Rèn cho Giáp: đồng minh nhận ít sát thương vật lý hơn; mất Ornn thì hết hiệu lực",
    () => {
        const hit = (forge: number, ornnAlive: boolean) => {
            const s = mk({
                A: {
                    ornn: 2, g1_fighter: 1
                }, B: {
                    g1_tank: 1
                }
            })
            gm(s).setStack(u(s,
                "A",
                "g1_fighter"),
            "forge",
            forge)
            if (!ornnAlive) gm(s).kill(u(s,
                "A",
                "ornn"))
            s.active = "B"
            s.turnNo++
            return dmgTo(strike(s,
                "B",
                "B:g1_tank",
                "A:g1_fighter").ev,
            "A:g1_fighter",
            "attack")
        }
        const base = hit(0,
            true)
        assert.ok(hit(10,
            true) < base,
        "có Rèn nhận ít hơn")
        assert.equal(hit(10,
            false),
        base,
        "Ornn không còn trên sân thì Rèn không có tác dụng")
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
