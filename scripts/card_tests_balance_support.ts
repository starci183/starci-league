// Test bản cân bằng starci-33 (support v7) cho 4 Trợ thủ: Nami, Soraka, Janna, Renata.
// Chạy: npx tsx scripts/card_tests_balance_support.ts [--only=chữ] [--verbose]
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    checkTranslations
} from "../packages/shared/src/cardgame/i18n_en"
import * as NAMI from "../packages/shared/src/cardgame/heroes/nami"
import * as SORAKA from "../packages/shared/src/cardgame/heroes/soraka"
import * as JANNA from "../packages/shared/src/cardgame/heroes/janna"
import * as RENATA from "../packages/shared/src/cardgame/heroes/renata"
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
const notes: string[] = []
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

// Tướng giả không chiêu, 1000 máu, Giáp/Kháng 0 cho dễ tính
const noSkill = (key: "Q" | "E" | "R") => ({
    key, name: "-", desc: "-", target: "none" as const, canPlay: () => false, resolve: () => {}
})
for (const [id,
    role] of [["bs_tank",
        "tank"],
    ["bs_fighter",
        "fighter"],
    ["bs_mark",
        "marksman"],
    ["bs_sup",
        "support"],
    ["bs_mage",
        "mage"]] as const) {
    cg.defineHero({
        id, name: id, role, damage: "physical", hp: 1000, atk: 50, armor: 0, mr: 0,
        passive: {
            name: "-", desc: "-"
        },
        skills: {
            Q: noSkill("Q"), E: noSkill("E"), R: noSkill("R")
        },
    })
}
// Tướng giả có chiêu chỉ định 1 địch gây sát thương (để test phản ứng)
cg.defineHero({
    id: "bs_caster", name: "bs_caster", role: "mage", damage: "magic", hp: 1000, atk: 50, armor: 0, mr: 0,
    passive: {
        name: "-", desc: "-"
    },
    skills: {
        Q: {
            key: "Q", name: "Bolt", desc: "Deal 100.", target: "enemy", mana: 0,
            resolve(c) { c.g.damage(c.self,
                c.target!,
                100,
                "magic",
                {
                    tag: "skill"
                }) }
        },
        E: noSkill("E"), R: noSkill("R")
    },
})
const DUMMIES = ["bs_tank",
    "bs_fighter",
    "bs_mark",
    "bs_sup",
    "bs_mage"]

const SEED = 20261031
type Setup = { A?: Record<string, number>; B?: Record<string, number> };
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
    }
    s.active = "A"
    s.teamMana = {
        A: 200, B: 200
    }
    return s
}
const gm = (s: St) => new Game(s)
const u = (s: St, side: S, hero: string) => s.units[`${side}:${hero}`]
const skill = (s: St, hero: string, side: S, k: cg.SkillKey) => gm(s).skillCard(hero,
    side,
    k)
function give(s: St, side: S, card: cg.Card) { s.players[side].hand.push(card); return card }
function act(s: St, a: Act): { s: St; ev: Ev } {
    const r = cg.applyAction(s,
        a)
    return {
        s: r.state, ev: r.events
    }
}
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
function strike(s: St, side: S, actor: string, target: string) {
    s.turnAttacks = {
        used: 0, cardless: []
    } // test dựng nhiều đòn trong 1 lượt: bỏ qua giới hạn 3 đòn/lượt
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
const inGrave = (s: St, side: S, card: { uid: string }) => s.players[side].grave.some((c) => c.uid === card.uid)
const huge = (s: St, side: S, hero: string) => { const x = u(s,
    side,
    hero); x.hp = 1_000_000; x.maxHp = 1_000_000 }
const magic = (s: St, raw: number, t: cg.Unit) => Math.round(raw * 100 / (100 + gm(s).mr(t)))
/** Engine đã áp HeroDef.shieldGivenMult chưa (thăm dò bằng 1 Khiên thử trên bản sao) */
function engineShieldAmp(): boolean {
    const s = mk({
        A: {
            janna: 0, bs_tank: 2
        }
    })
    const g = gm(s)
    const t = u(s,
        "A",
        "bs_tank")
    g.shield(undefined,
        t,
        100)
    return t.shield === 120
}

// ======================================================================
G("Nami")
// ======================================================================
function mkNami(): St {
    const s = mk({
        A: {
            nami: 0, bs_fighter: 2
        }, B: {
            bs_tank: 2, bs_mark: 1
        }
    })
    huge(s,
        "B",
        "bs_tank")
    huge(s,
        "B",
        "bs_mark")
    return s
}
const rhythm = (s: St) => gm(s).stackOf(u(s,
    "A",
    "nami"),
NAMI.RHYTHM)
test("P: mỗi hành động gốc hữu ích +1 Nhịp, 3 Nhịp rút 1 lá; tối đa 2 lá mỗi chu kỳ, chạm trần thì ngừng nhận Nhịp",
    () => {
        let s = mkNami()
        const seen: [number, number][] = []
        for (let i = 0; i < 7; i++) {
            s = strike(s,
                "A",
                "A:bs_fighter",
                "B:bs_tank").s
            seen.push([rhythm(s),
                s.players.A.hand.length])
        }
        assert.deepEqual(seen,
            [[1,
                0],
            [2,
                0],
            [0,
                1],
            [1,
                1],
            [2,
                1],
            [0,
                2],
            [0,
                2]],
            "đòn 3 và 6 rút; đòn 7 chạm trần không nhận Nhịp")
        assert.equal(NAMI.namiDrawsThisCycle(gm(s),
            u(s,
                "A",
                "nami")),
        2)
    })
test("P: Nhịp dang dở giữ qua lượt; Draw Phase của Nami chỉ đặt lại trần rút",
    () => {
        let s = mkNami()
        for (let i = 0; i < 7; i++) s = strike(s,
            "A",
            "A:bs_fighter",
            "B:bs_tank").s
        s = strike(mkNami(),
            "A",
            "A:bs_fighter",
            "B:bs_tank").s // ván mới: 1 Nhịp dang dở
        assert.equal(rhythm(s),
            1)
        s = end(s,
            "A").s
        s = end(s,
            "B").s
        assert.equal(s.active,
            "A")
        assert.equal(rhythm(s),
            1,
            "giữ Nhịp dang dở")
        assert.equal(NAMI.namiDrawsThisCycle(gm(s),
            u(s,
                "A",
                "nami")),
        0)
    })
test("P: 1 hành động trúng nhiều địch/hồi nhiều người chỉ tính 1 Nhịp; lá hỗ trợ (Bình Máu) không tính; hồi máu cho địch không tính",
    () => {
        let s = mkNami()
        u(s,
            "A",
            "nami").hp = 100
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "nami",
                    "A",
                    "R"))).s
        assert.equal(rhythm(s),
            1,
            "R: sát thương 2 địch + hồi = 1 Nhịp")
        u(s,
            "A",
            "bs_fighter").hp = 100
        s = play(s,
            "A",
            give(s,
                "A",
                gm(s).supportCard("potion")),
            {
                target: "A:bs_fighter"
            }).s
        assert.equal(rhythm(s),
            1,
            "Bình Máu không phải hành động gốc hợp lệ")
        const g = gm(s)
        const foe = u(s,
            "B",
            "bs_tank")
        foe.hp = 100
        g.heal(foe,
            foe,
            50)
        assert.equal(rhythm(s),
            1)
    })
test("P: hành động do địch ép (Renata R) không cho Nhịp",
    () => {
        const s = mk({
            A: {
                nami: 0, bs_fighter: 2, bs_mark: 3
            }, B: {
                renata: 2
            }
        })
        s.active = "B"
        const r = play(s,
            "B",
            give(s,
                "B",
                skill(s,
                    "renata",
                    "B",
                    "R")))
        assert.ok(evs(r.ev,
            "attack").length >= 2,
        "đội A bị ép đánh nhau")
        assert.equal(gm(r.s).stackOf(u(r.s,
            "A",
            "nami"),
        NAMI.RHYTHM),
        0)
    })
test(`Q: 10 mana; {${NAMI.F_Q}} phép, rồi Choáng phân số (${NAMI.F_Q_STUN}, tối đa ${NAMI.STUN_CAP})`,
    () => {
        assert.equal(cg.getHero("nami")!.skills.Q.mana,
            10)
        const s = mkNami()
        const g = gm(s)
        const nami = u(s,
            "A",
            "nami")
        const t = u(s,
            "B",
            "bs_tank")
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "nami",
                    "A",
                    "Q")),
            {
                target: t.id
            })
        assert.equal(dmgTo(r.ev,
            t.id,
            "skill"),
        magic(s,
            g.f(nami,
                NAMI.F_Q),
            t))
        assert.equal(r.s.teamMana.A,
            190)
        const stun = u(r.s,
            "B",
            "bs_tank").statuses.stun
        const d = g.f(nami,
            NAMI.F_Q_STUN)
        assert.ok(d > 0 && d < 1,
            `d = ${d}`)
        if (stun) assert.equal(stun.until,
            gm(s).turnsUntil("B",
                1),
            "1 đơn vị: tới hết lượt B kế tiếp")
        assert.ok(!u(r.s,
            "B",
            "bs_tank").marks?.length,
        "không còn dấu Q cũ")
        // phần lẻ: tần suất ~ d qua nhiều lần roll; phần nguyên chắc chắn; trần 1,5
        // engine tung phần lẻ trong g.status (CC_STATUSES): d < 1 → có Choáng với tần suất ~ d
        let hits = 0
        for (let i = 0; i < 2000; i++) {
            g.removeStatus(t,
                "stun")
            g.status(t,
                "stun",
                d,
                {
                    of: "B"
                })
            if (g.has(t,
                "stun")) hits++
        }
        g.removeStatus(t,
            "stun")
        assert.ok(Math.abs(hits / 2000 - d) < 0.05,
            `tần suất ${hits / 2000}`)
        assert.equal(NAMI.stunDuration(1),
            1)
        assert.equal(NAMI.stunDuration(3,
            NAMI.STUN_CAP),
        NAMI.STUN_CAP)
        assert.equal(NAMI.stunDuration(-1),
            0)
    })
test(`E: chọn 20 hoặc 30 mana; hồi người chọn {${NAMI.F_E}} + M, rồi cùng lượng cho 1 người thiếu máu khác ngẫu nhiên`,
    () => {
        const s = mkNami()
        for (const h of ["nami",
            "bs_fighter"]) u(s,
            "A",
            h).hp = 100
        const e = give(s,
            "A",
            skill(s,
                "nami",
                "A",
                "E"))
        const opts = cg.playOptions(gm(s),
            "A",
            e)
        assert.deepEqual(opts.map((o) => `${o.target}:${o.manaSpent}`).sort(),
            ["A:bs_fighter:20",
                "A:bs_fighter:30",
                "A:nami:20",
                "A:nami:30"])
        const base = gm(s).f(u(s,
            "A",
            "nami"),
        NAMI.F_E)
        const r = play(s,
            "A",
            e,
            {
                target: "A:bs_fighter", manaSpent: 30
            })
        const paid = 200 - r.s.teamMana.A
        assert.ok(paid === 20 || paid === 30,
            `paid ${paid}`)
        if (paid !== 30) notes.push("Nami E: engine chưa truyền args.manaSpent vào chi phí (payMana/manaCost) và Game.argsKey; lựa chọn 30 đang trả 20.")
        const heals = evs(r.ev,
            "heal")
        assert.equal(heals.length,
            2)
        assert.equal(heals[0].target,
            "A:bs_fighter")
        assert.equal(heals[1].target,
            "A:nami")
        for (const h of heals) assert.equal(h.amount,
            Math.round(base + paid))
        // không có người thứ hai thiếu máu: chỉ hồi người đầu
        const s2 = mkNami()
        u(s2,
            "A",
            "bs_fighter").hp = 100
        const r2 = play(s2,
            "A",
            give(s2,
                "A",
                skill(s2,
                    "nami",
                    "A",
                    "E")),
            {
                target: "A:bs_fighter", manaSpent: 20
            })
        assert.equal(evs(r2.ev,
            "heal").length,
        1)
        // không ai thiếu máu: không đánh được; bể < 30 chỉ còn lựa chọn 20
        const s3 = mkNami()
        assert.equal(cg.playOptions(gm(s3),
            "A",
            give(s3,
                "A",
                skill(s3,
                    "nami",
                    "A",
                    "E"))).length,
        0)
        u(s3,
            "A",
            "nami").hp = 10
        s3.teamMana.A = 25
        assert.deepEqual(cg.playOptions(gm(s3),
            "A",
            s3.players.A.hand[0]).map((o) => o.manaSpent),
        [20])
    })
test("R: 25 mana; phép mọi địch → Cường Hoá cả đội 1 đơn vị → hồi 1 tướng mình tỉ lệ máu thấp nhất",
    () => {
        const s = mkNami()
        u(s,
            "A",
            "nami").hp = 300
        u(s,
            "A",
            "bs_fighter").hp = 200
        const g = gm(s)
        const nami = u(s,
            "A",
            "nami")
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "nami",
                    "A",
                    "R")))
        assert.equal(r.s.teamMana.A,
            175)
        for (const id of ["B:bs_tank",
            "B:bs_mark"]) assert.equal(dmgTo(r.ev,
            id,
            "skill"),
        magic(s,
            g.f(nami,
                NAMI.F_R),
            s.units[id]))
        for (const h of ["nami",
            "bs_fighter"]) assert.equal(u(r.s,
            "A",
            h).statuses.empower?.until,
        g.turnsUntil("B",
            1))
        const heals = evs(r.ev,
            "heal")
        assert.equal(heals.length,
            1)
        assert.equal(heals[0].target,
            "A:bs_fighter",
            "200/1000 thấp hơn 300/350")
        assert.equal(heals[0].amount,
            Math.round(g.f(nami,
                NAMI.F_R_HEAL)))
        assert.ok(evs(r.ev,
            "status").every((e) => e.id !== "stun"),
        "không còn Choáng toàn địch")
    })

// ======================================================================
G("Soraka")
// ======================================================================
test(`P: đồng minh sắp bị hạ → Soraka trả {${SORAKA.F_P_COST}}, giữ nó ở 1 Máu rồi hồi {${SORAKA.F_P_HEAL}}; 1 lần/đội/chu kỳ`,
    () => {
        let s = mk({
            A: {
                soraka: 0, bs_tank: 2
            }, B: {
                bs_fighter: 2
            }
        })
        s.active = "B"
        const so = u(s,
            "A",
            "soraka")
        const cost = Math.round(gm(s).f(so,
            SORAKA.F_P_COST))
        const heal = Math.round(gm(s).f(so,
            SORAKA.F_P_HEAL))
        const soHp = cg.getHero("soraka")!.hp
        assert.equal(cost,
            Math.round(20 + 0.1 * soHp))
        assert.ok(heal > 0)
        u(s,
            "A",
            "bs_tank").hp = 10
        const lives = s.players.A.lives
        let r = strike(s,
            "B",
            "B:bs_fighter",
            "A:bs_tank")
        s = r.s
        assert.equal(u(s,
            "A",
            "bs_tank").status,
        "board")
        assert.equal(u(s,
            "A",
            "bs_tank").hp,
        1 + heal)
        assert.equal(u(s,
            "A",
            "soraka").hp,
        soHp - cost)
        assert.equal(s.players.A.lives,
            lives)
        assert.equal(evs(r.ev,
            "kill").length,
        0)
        // cùng chu kỳ: lần 2 không cứu
        u(s,
            "A",
            "bs_tank").hp = 5
        const s0 = structuredClone(s)
        r = strike(s,
            "B",
            "B:bs_fighter",
            "A:bs_tank")
        assert.equal(u(r.s,
            "A",
            "bs_tank").status,
        "dead")
        // chu kỳ mới (Draw Phase của phe Soraka đã qua thêm 1 lần): cứu lại được
        s0.ownTurns = {
            ...s0.ownTurns, A: (s0.ownTurns?.A ?? 0) + 1
        }
        r = strike(s0,
            "B",
            "B:bs_fighter",
            "A:bs_tank")
        assert.equal(u(r.s,
            "A",
            "bs_tank").status,
        "board")
    })
test("P: Soraka có thể ngã vì giá Máu nhưng việc cứu vẫn hoàn tất; không tự cứu chính mình",
    () => {
        const s = mk({
            A: {
                soraka: 0, bs_tank: 2
            }, B: {
                bs_fighter: 2
            }
        })
        s.active = "B"
        u(s,
            "A",
            "soraka").hp = 30
        u(s,
            "A",
            "bs_tank").hp = 10
        const r = strike(s,
            "B",
            "B:bs_fighter",
            "A:bs_tank")
        assert.equal(u(r.s,
            "A",
            "soraka").status,
        "dead")
        assert.equal(u(r.s,
            "A",
            "bs_tank").status,
        "board")
        assert.ok(u(r.s,
            "A",
            "bs_tank").hp > 1,
        "vẫn được hồi")
        // Soraka tự bị hạ: không tự cứu
        const s2 = mk({
            A: {
                soraka: 0, bs_tank: 2
            }, B: {
                bs_fighter: 0
            }
        })
        s2.active = "B"
        u(s2,
            "A",
            "soraka").hp = 10
        const r2 = strike(s2,
            "B",
            "B:bs_fighter",
            "A:soraka")
        assert.equal(u(r2.s,
            "A",
            "soraka").status,
        "dead")
    })
test(`Q: 10 mana; {${SORAKA.F_Q}} phép rồi Soraka tự hồi {${SORAKA.F_HEAL}}; không chuyển hồi thừa thành Khiên`,
    () => {
        const s = mk({
            A: {
                soraka: 0, bs_tank: 2
            }, B: {
                bs_fighter: 0
            }
        })
        const so = u(s,
            "A",
            "soraka")
        so.hp = so.maxHp - 5
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "soraka",
                    "A",
                    "Q")),
            {
                target: "B:bs_fighter"
            })
        assert.equal(dmgTo(r.ev,
            "B:bs_fighter"),
        Math.round(gm(s).f(so,
            SORAKA.F_Q)))
        assert.equal(u(r.s,
            "A",
            "soraka").hp,
        so.maxHp)
        assert.equal(u(r.s,
            "A",
            "bs_tank").shield,
        0)
        assert.equal(r.s.teamMana.A,
            190)
        assert.ok(Math.round(gm(s).f(so,
            SORAKA.F_HEAL)) > 5,
        "hồi đủ lấp 5 Máu thiếu")
    })
test("E (Quick, chỉ nối chuỗi): chiêu địch chỉ định đúng 1 tướng mình → trả 5% máu tối đa, vô hiệu lá; không Câm Lặng; cần Máu > giá",
    () => {
        const s = mk({
            A: {
                bs_caster: 2
            }, B: {
                soraka: 0, bs_tank: 2
            }
        })
        const q = give(s,
            "A",
            skill(s,
                "bs_caster",
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
                    target: "B:bs_tank"
                }
            })
        assert.ok(cg.legalActions(r.s,
            "B").some((a) => a.t === "chain" && a.uid === e.uid))
        r = settle(chainWith(r.s,
            "B",
            e))
        assert.equal(u(r.s,
            "B",
            "bs_tank").hp,
        1000)
        assert.equal(evs(r.ev,
            "chainCancel").length,
        1)
        assert.ok(inGrave(r.s,
            "A",
            q))
        assert.equal(u(r.s,
            "B",
            "soraka").hp,
        cg.getHero("soraka")!.hp - SORAKA.eCost(u(s,
            "B",
            "soraka")))
        assert.equal(SORAKA.eCost(u(s,
            "B",
            "soraka")),
        Math.round(cg.getHero("soraka")!.hp * SORAKA.E_HP_PCT))
        assert.ok(!u(r.s,
            "A",
            "bs_caster").statuses.silence,
        "không Câm Lặng")
        assert.equal(r.s.teamMana.B,
            180)
        // Máu = giá: không nối được
        const s2 = mk({
            A: {
                bs_caster: 2
            }, B: {
                soraka: 0, bs_tank: 2
            }
        })
        u(s2,
            "B",
            "soraka").hp = SORAKA.eCost(u(s2,
            "B",
            "soraka"))
        const q2 = give(s2,
            "A",
            skill(s2,
                "bs_caster",
                "A",
                "Q"))
        const e2 = give(s2,
            "B",
            skill(s2,
                "soraka",
                "B",
                "E"))
        const r2 = act(s2,
            {
                t: "play", side: "A", uid: q2.uid, args: {
                    target: "B:bs_tank"
                }
            })
        assert.ok(!cg.legalActions(r2.s,
            "B").some((a) => a.t === "chain" && a.uid === e2.uid))
    })
test(`R: 25 mana; hồi {${SORAKA.F_R}} cho mọi tướng mình kể cả Soraka`,
    () => {
        const s = mk({
            A: {
                soraka: 0, bs_tank: 2
            }, B: {
                bs_fighter: 2
            }
        })
        u(s,
            "A",
            "soraka").hp = 100
        u(s,
            "A",
            "bs_tank").hp = 100
        const heal = Math.round(gm(s).f(u(s,
            "A",
            "soraka"),
        SORAKA.F_R))
        assert.equal(heal,
            Math.round(gm(s).f(u(s,
                "A",
                "soraka"),
            SORAKA.F_R)))
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "soraka",
                    "A",
                    "R"))).s
        assert.equal(u(r,
            "A",
            "soraka").hp,
        100 + heal)
        assert.equal(u(r,
            "A",
            "bs_tank").hp,
        100 + heal)
        assert.equal(r.teamMana.A,
            175)
    })

// ======================================================================
G("Janna")
// ======================================================================
test("P ①: Khiên mới lên tướng mình +20% (shieldGivenMult) khi Janna trên sân",
    () => {
        const s = mk({
            A: {
                janna: 0, bs_tank: 2
            }, B: {
                bs_fighter: 2
            }
        })
        const h = cg.getHero("janna")!
        const g = gm(s)
        assert.equal(h.shieldGivenMult!(g,
            u(s,
                "A",
                "janna"),
            undefined,
            u(s,
                "A",
                "bs_tank")),
        1.2)
        assert.equal(h.shieldGivenMult!(g,
            u(s,
                "A",
                "janna"),
            undefined,
            u(s,
                "B",
                "bs_fighter")),
        1)
        if (!engineShieldAmp()) notes.push("Janna P①: engine chưa gọi HeroDef.shieldGivenMult trong g.shield; +20% Khiên chưa có hiệu lực trong trận.")
    })
test("P ②: tướng mình còn Khiên giảm 10% sát thương địch; Tốc Đánh +50% Khiên (tối đa +150)",
    () => {
        const s = mk({
            A: {
                janna: 0, bs_tank: 2
            }, B: {
                bs_caster: 2
            }
        })
        const t = u(s,
            "A",
            "bs_tank")
        s.active = "B"
        const r = play(s,
            "B",
            give(s,
                "B",
                skill(s,
                    "bs_caster",
                    "B",
                    "Q")),
            {
                target: t.id
            })
        assert.equal(dmgTo(r.ev,
            t.id),
        100,
        "không Khiên: đủ 100")
        const s2 = mk({
            A: {
                janna: 0, bs_tank: 2
            }, B: {
                bs_caster: 2
            }
        })
        s2.active = "B"
        u(s2,
            "A",
            "bs_tank").shield = 500
        const r2 = play(s2,
            "B",
            give(s2,
                "B",
                skill(s2,
                    "bs_caster",
                    "B",
                    "Q")),
            {
                target: "A:bs_tank"
            })
        assert.equal(dmgTo(r2.ev,
            "A:bs_tank"),
        90)
        const g = gm(s2)
        const tank = u(s2,
            "A",
            "bs_tank")
        tank.shield = 100
        assert.equal(JANNA.jannaAttackSpeedBonus(g,
            tank),
        50)
        tank.shield = 1000
        assert.equal(JANNA.jannaAttackSpeedBonus(g,
            tank),
        150)
        tank.shield = 0
        assert.equal(JANNA.jannaAttackSpeedBonus(g,
            tank),
        0)
        notes.push("Janna P②: engine chưa có chỉ số Tốc Đánh/đòn nhiều hit; phần +Tốc Đánh chỉ có qua jannaAttackSpeedBonus().")
    })
test("Q: 10 mana; Thanh Tẩy 1 tướng mình có hiệu ứng xấu; không Quick; không có ai cần Thanh Tẩy thì không đánh được",
    () => {
        const s = mk({
            A: {
                janna: 0, bs_tank: 2
            }, B: {
                bs_fighter: 2
            }
        })
        const q = give(s,
            "A",
            skill(s,
                "janna",
                "A",
                "Q"))
        assert.equal(cg.getHero("janna")!.skills.Q.quick,
            undefined)
        assert.equal(cg.playOptions(gm(s),
            "A",
            q).length,
        0)
        const g = gm(s)
        g.status(u(s,
            "A",
            "bs_tank"),
        "silence",
        2)
        g.status(u(s,
            "A",
            "bs_tank"),
        "grievous",
        2)
        assert.deepEqual(cg.playOptions(gm(s),
            "A",
            q).map((o) => o.target),
        ["A:bs_tank"])
        const r = play(s,
            "A",
            q,
            {
                target: "A:bs_tank"
            })
        assert.ok(!u(r.s,
            "A",
            "bs_tank").statuses.silence && !u(r.s,
            "A",
            "bs_tank").statuses.grievous)
        assert.equal(r.s.teamMana.A,
            190)
    })
test(`E: 20 mana; Khiên {${JANNA.F_E}} cho 1 tướng mình; không còn miễn khống chế`,
    () => {
        const s = mk({
            A: {
                janna: 0, bs_tank: 2
            }, B: {
                bs_fighter: 2
            }
        })
        const f = gm(s).f(u(s,
            "A",
            "janna"),
        JANNA.F_E)
        assert.ok(f > 0,
            `f = ${f}`)
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "janna",
                    "A",
                    "E")),
            {
                target: "A:bs_tank"
            })
        const amp = engineShieldAmp() ? 1.2 : 1
        assert.equal(u(r.s,
            "A",
            "bs_tank").shield,
        Math.round(f * amp))
        assert.equal(r.s.teamMana.A,
            180)
        const g = gm(r.s)
        g.status(u(r.s,
            "A",
            "bs_tank"),
        "stun",
        1)
        assert.ok(u(r.s,
            "A",
            "bs_tank").statuses.stun,
        "Khiên không chặn Choáng")
    })
test(`R (Quick): đáp đòn đánh hoặc lá chiêu địch nhắm tướng mình; Khiên {${JANNA.F_R}} cả đội + giảm 15% sát thương 1 đơn vị (nhân 0,9 của P = 0,765)`,
    () => {
        const s = mk({
            A: {
                bs_caster: 2
            }, B: {
                janna: 0, bs_tank: 2
            }
        })
        const q = give(s,
            "A",
            skill(s,
                "bs_caster",
                "A",
                "Q"))
        const rr = give(s,
            "B",
            skill(s,
                "janna",
                "B",
                "R"))
        let r = act(s,
            {
                t: "play", side: "A", uid: q.uid, args: {
                    target: "B:bs_tank"
                }
            })
        assert.ok(cg.legalActions(r.s,
            "B").some((a) => a.t === "chain" && a.uid === rr.uid),
        "R đáp lá chiêu gây sát thương")
        r = settle(chainWith(r.s,
            "B",
            rr))
        const amp = engineShieldAmp() ? 1.2 : 1
        const sh = Math.round(gm(s).f(u(s,
            "B",
            "janna"),
        JANNA.F_R) * amp)
        assert.equal(u(r.s,
            "B",
            "janna").shield,
        sh)
        // bolt 100 → x0.9 (còn Khiên) x0.85 (R) = 76.5 → 77 (làm tròn), Khiên hấp thụ trước
        assert.equal(dmgTo(r.ev,
            "B:bs_tank"),
        Math.round(100 * 0.9 * 0.85))
        const st = u(r.s,
            "B",
            "bs_tank").statuses.dmgCut
        assert.equal(st?.v,
            0.15)
        assert.equal(st?.until,
            r.s.turnNo,
            "nối trong lượt địch: hết chính lượt đó")
        assert.equal(r.s.teamMana.B,
            200 - (cg.getHero("janna")!.skills.R.mana ?? 0))
    })

// ======================================================================
G("Renata")
// ======================================================================
test(`P: đồng minh khác sắp bị hạ → đặt Máu = {${RENATA.F_REVIVE}} (không phải hồi máu), Cuồng Bạo chốt chỉ số; 1 lần mỗi đồng minh mỗi trận`,
    () => {
        let s = mk({
            A: {
                renata: 0, bs_tank: 2
            }, B: {
                bs_fighter: 2
            }
        })
        s.active = "B"
        u(s,
            "A",
            "bs_tank").hp = 10
        const ren = u(s,
            "A",
            "renata")
        const expect = Math.round(Math.min(1000,
            gm(s).f(ren,
                RENATA.F_REVIVE,
                u(s,
                    "A",
                    "bs_tank"))))
        let r = strike(s,
            "B",
            "B:bs_fighter",
            "A:bs_tank")
        s = r.s
        const t = u(s,
            "A",
            "bs_tank")
        assert.equal(t.status,
            "board")
        assert.equal(t.hp,
            expect)
        assert.equal(gm(s).statusV(t,
            RENATA.FRENZY),
        Math.round(gm(s).f(ren,
            RENATA.F_FRENZY)))
        assert.equal(evs(r.ev,
            "kill").length,
        0)
        // Cuồng Bạo: đòn đánh của nó +sát thương chốt
        s.active = "A"
        huge(s,
            "B",
            "bs_fighter")
        r = strike(s,
            "A",
            "A:bs_tank",
            "B:bs_fighter")
        assert.equal(dmgTo(r.ev,
            "B:bs_fighter",
            "attack"),
        50 + Math.round(gm(s).f(ren,
            RENATA.F_FRENZY)))
        // lần 2 trong trận: không cứu
        s = r.s
        s.active = "B"
        u(s,
            "A",
            "bs_tank").hp = 5
        u(s,
            "B",
            "bs_fighter").hp = 1000
        r = strike(s,
            "B",
            "B:bs_fighter",
            "A:bs_tank")
        assert.equal(u(r.s,
            "A",
            "bs_tank").status,
        "dead")
    })
test("Thứ tự cứu: Soraka P trước Renata P (Renata không bị tiêu lượt cứu khi Soraka cứu được)",
    () => {
        const s = mk({
            A: {
                renata: 0, soraka: 1, bs_tank: 2
            }, B: {
                bs_fighter: 2
            }
        })
        s.active = "B"
        u(s,
            "A",
            "bs_tank").hp = 10
        let r = strike(s,
            "B",
            "B:bs_fighter",
            "A:bs_tank")
        const t = u(r.s,
            "A",
            "bs_tank")
        assert.equal(t.status,
            "board")
        assert.equal(gm(r.s).stackOf(t,
            RENATA.REVIVED),
        0,
        "Renata chưa dùng")
        assert.ok(u(r.s,
            "A",
            "soraka").hp < 380,
        "Soraka đã trả")
        // Soraka đã dùng trong chu kỳ: lần sau Renata cứu
        t.hp = 5
        r = strike(r.s,
            "B",
            "B:bs_fighter",
            "A:bs_tank")
        assert.equal(u(r.s,
            "A",
            "bs_tank").status,
        "board")
        assert.equal(gm(r.s).stackOf(u(r.s,
            "A",
            "bs_tank"),
        RENATA.REVIVED),
        1)
    })
test(`Q: 10 mana; 1 tướng mình +{${RENATA.F_Q_ARMOR}} Giáp 1 đơn vị; không cộng dồn, giữ giá trị cao hơn`,
    () => {
        const s = mk({
            A: {
                renata: 0, bs_tank: 2
            }, B: {
                bs_fighter: 2
            }
        })
        const v = Math.round(gm(s).f(u(s,
            "A",
            "renata"),
        RENATA.F_Q_ARMOR))
        let r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "renata",
                    "A",
                    "Q")),
            {
                target: "A:bs_tank"
            })
        assert.equal(gm(r.s).armor(u(r.s,
            "A",
            "bs_tank")),
        v)
        assert.equal(u(r.s,
            "A",
            "bs_tank").statuses.armor_up.until,
        gm(s).turnsUntil("B",
            1))
        assert.equal(u(r.s,
            "A",
            "renata").statuses.armor_up,
        undefined,
        "chỉ 1 tướng")
        r = play(r.s,
            "A",
            give(r.s,
                "A",
                skill(r.s,
                    "renata",
                    "A",
                    "Q")),
            {
                target: "A:bs_tank"
            })
        assert.equal(gm(r.s).armor(u(r.s,
            "A",
            "bs_tank")),
        v,
        "không cộng dồn")
        assert.equal(dmgTo(r.ev,
            "B:bs_fighter"),
        0,
        "không gây sát thương")
    })
test(`E (Quick): sau hành động đánh, kẻ đánh nhận ${RENATA.REFLECT * 100}% D + {${RENATA.F_REFLECT}} chuẩn; D = Khiên + Máu thực mất (không overkill)`,
    () => {
        const s = mk({
            A: {
                bs_fighter: 2
            }, B: {
                renata: 0, bs_tank: 2
            }
        })
        u(s,
            "B",
            "bs_tank").shield = 20
        const atk = give(s,
            "A",
            gm(s).supportCard("basic"))
        const e = give(s,
            "B",
            skill(s,
                "renata",
                "B",
                "E"))
        let r = act(s,
            {
                t: "play", side: "A", uid: atk.uid, args: {
                    actor: "A:bs_fighter", target: "B:bs_tank"
                }
            })
        r = settle(chainWith(r.s,
            "B",
            e))
        const flat = gm(s).f(u(s,
            "B",
            "renata"),
        RENATA.F_REFLECT)
        // D = 50 (20 Khiên + 30 Máu)
        assert.equal(u(r.s,
            "B",
            "bs_tank").hp,
        970)
        assert.equal(dmgTo(r.ev,
            "A:bs_fighter"),
        Math.round(0.4 * 50 + flat))
        assert.equal(evs(r.ev,
            "damage").filter((d) => d.target === "A:bs_fighter").length,
        1,
        "phần cố định 1 lần")
        assert.equal(r.s.teamMana.B,
            180)
        // overkill không tính: mục tiêu 10 Máu → D = 10
        const s2 = mk({
            A: {
                bs_fighter: 2
            }, B: {
                renata: 0, bs_tank: 2
            }
        })
        u(s2,
            "B",
            "bs_tank").hp = 10
        u(s2,
            "B",
            "bs_tank").deaths = 0
        const atk2 = give(s2,
            "A",
            gm(s2).supportCard("basic"))
        const e2 = give(s2,
            "B",
            skill(s2,
                "renata",
                "B",
                "E"))
        let r2 = act(s2,
            {
                t: "play", side: "A", uid: atk2.uid, args: {
                    actor: "A:bs_fighter", target: "B:bs_tank"
                }
            })
        r2 = settle(chainWith(r2.s,
            "B",
            e2))
        // tank được Renata P cứu (setHP), D vẫn chỉ là 10 Máu thực mất
        assert.equal(dmgTo(r2.ev,
            "A:bs_fighter"),
        Math.round(0.4 * 10 + flat))
        // Renata là người được bảo vệ và bị hạ: phản đòn vẫn chốt
        const s3 = mk({
            A: {
                bs_fighter: 2
            }, B: {
                renata: 2
            }
        })
        u(s3,
            "B",
            "renata").hp = 10
        const atk3 = give(s3,
            "A",
            gm(s3).supportCard("basic"))
        const e3 = give(s3,
            "B",
            skill(s3,
                "renata",
                "B",
                "E"))
        let r3 = act(s3,
            {
                t: "play", side: "A", uid: atk3.uid, args: {
                    actor: "A:bs_fighter", target: "B:renata"
                }
            })
        r3 = settle(chainWith(r3.s,
            "B",
            e3))
        assert.equal(u(r3.s,
            "B",
            "renata").status,
        "dead")
        assert.equal(dmgTo(r3.ev,
            "A:bs_fighter"),
        Math.round(0.4 * 10 + flat))
    })
test("R: 25 mana; mọi tướng địch (danh sách chốt, trái → phải) đánh 1 hành động vào 1 đồng đội khác ngẫu nhiên; đội mình không mất máu",
    () => {
        const s = mk({
            A: {
                renata: 2
            }, B: {
                bs_fighter: 0, bs_mark: 1, bs_tank: 3
            }
        })
        const g = gm(s)
        g.status(u(s,
            "B",
            "bs_tank"),
        "stun",
        1)
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "renata",
                    "A",
                    "R")))
        const atks = evs(r.ev,
            "attack")
        assert.deepEqual(atks.map((a) => a.attacker),
            ["B:bs_fighter",
                "B:bs_mark"],
            "bị Choáng thì bỏ qua; mỗi người 1 hành động, trái → phải")
        for (const a of atks) {
            assert.ok(a.target.startsWith("B:") && a.target !== a.attacker)
        }
        for (const x of Object.values(r.s.units).filter((x) => x.side === "A" && x.status === "board")) assert.equal(x.hp,
            x.maxHp)
        assert.ok(evs(r.ev,
            "status").every((e) => e.id !== "berserk"),
        "không gắn trạng thái Nổi Điên")
        assert.equal(r.s.teamMana.A,
            175)
    })

// ======================================================================
G("Chữ")
// ======================================================================
test("công thức EN khớp bản Việt (checkTranslations) cho 4 Trợ thủ; mana Q/E/R = 10/20/25 (Janna R 20)",
    () => {
        const errs = checkTranslations().filter((e) => /^(nami|soraka|janna|renata)\./.test(e))
        assert.deepEqual(errs,
            [])
        for (const id of ["nami",
            "soraka",
            "janna",
            "renata"]) {
            const h = cg.getHero(id)!
            assert.equal(h.skills.Q.mana,
                10,
                `${id} Q`)
            assert.equal(h.skills.R.mana,
                id === "janna" ? 20 : 25,
                `${id} R`)
            if (id !== "nami") assert.equal(h.skills.E.mana,
                20,
                `${id} E`)
        }
    })
test("ván bot có đủ 4 Trợ thủ chạy không lỗi",
    () => {
        for (let k = 0; k < 4; k++) {
            const A = ["nami",
                "soraka",
                "bs_tank",
                "bs_fighter",
                "bs_mark"]
            const B = ["janna",
                "renata",
                "bs_tank",
                "bs_fighter",
                "bs_mage"]
            let s = cg.newGame(SEED + k,
                k % 2 ? B : A,
                k % 2 ? A : B)
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
if (notes.length) console.log(`\nGHI CHÚ ENGINE:\n${[...new Set(notes)].map((n) => `  - ${n}`).join("\n")}`)
const c = (k: string) => results.filter((r) => r.res === k).length
console.log(`\nTỔNG: ${results.length} test | PASS ${c("PASS")} | FAIL ${c("FAIL")}`)
process.exit(c("FAIL") ? 1 : 0)
