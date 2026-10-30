// Test tuning v1 (starci-33-implementation-tuning-v1) nhóm Xạ thủ: Ashe, Jinx, Kog'Maw, Tristana, Miss Fortune, Teemo.
// Chạy: npx tsx scripts/card_tests_balance_marksman.ts [--only=chuỗi] [--verbose]. Khung chép từ scripts/card_tests_heroes_g5v.ts.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import * as ASHE from "../packages/shared/src/cardgame/heroes/ashe"
import * as MF from "../packages/shared/src/cardgame/heroes/missfortune"
import {
    HF, HN
} from "./card_tests_formulas"

type St = ReturnType<typeof cg.newGame>;
type Act = Parameters<typeof cg.applyAction>[1];
type Ev = ReturnType<typeof cg.applyAction>["events"];
type S = "A" | "B";
const { Game } = cg
const AD = (h: string) => cg.getHero(h)!.atk

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

// Tướng giả: không có chiêu
const noSkill = (key: "Q" | "E" | "R") => ({
    key, name: "-", desc: "-", target: "none" as const, canPlay: () => false, resolve: () => {}
})
for (const [id,
    role] of [["bm_tank",
        "tank"],
    ["bm_fighter",
        "fighter"],
    ["bm_mage",
        "mage"],
    ["bm_mark",
        "marksman"],
    ["bm_sup",
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
const DUMMIES = ["bm_tank",
    "bm_fighter",
    "bm_mage",
    "bm_mark",
    "bm_sup"]

const SEED = 20261031
type Setup = { A?: Record<string, number>; B?: Record<string, number>; seed?: number };
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
    s.teamMana = {
        A: 200, B: 200
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
    s.active = "A"
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
/** Giá trị công thức `name` (hằng trong heroes/<hero>.ts) theo chỉ số tướng A:<hero> */
const FV = (s: St, hero: string, name: string) => gm(s).f(u(s,
    "A",
    hero),
HF(hero,
    name))
const skill = (s: St, hero: string, side: S, k: cg.SkillKey) => gm(s).skillCard(hero,
    side,
    k)
function give(s: St, side: S, card: cg.Card) {
    s.players[side].hand.push(card)
    return card
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
function act(s: St, a: Act) {
    const r = cg.applyAction(s,
        a)
    return settle({
        s: r.state, ev: r.events
    })
}
function cast(s: St, side: S, hero: string, k: cg.SkillKey, args: cg.PlayArgs = {
}) {
    s.active = side
    const c = give(s,
        side,
        skill(s,
            hero,
            side,
            k))
    return act(s,
        {
            t: "play", side, uid: c.uid, args
        })
}
function strike(s: St, side: S, actor: string, target: string) {
    s.active = side
    const c = give(s,
        side,
        gm(s).supportCard("basic"))
    return act(s,
        {
            t: "play", side, uid: c.uid, args: {
                actor: `${side}:${actor}`, target
            }
        })
}
const evs = <T extends cg.GameEvent["t"]>(ev: Ev, t: T) => ev.filter((e) => e.t === t) as Extract<cg.GameEvent, { t: T }>[]
const dmgList = (ev: Ev, target: string, tag?: string) => evs(ev,
    "damage").filter((d) => d.target === target && (!tag || d.tag === tag)).map((d) => d.amount)
const after = (raw: number, armor = 30) => Math.round(raw * 100 / (100 + armor))
/** Ép đòn đánh của u luôn chí mạng */
const forceCrit = (s: St, side: S, hero: string) => gm(s).status(u(s,
    side,
    hero),
"alwaysCrit",
1,
{
    v: 1
})
const CRIT = 2.25

// ======================================================================
G("Mana chung")
// ======================================================================
/** Bảng mana chung của Xạ thủ (đọc từ Ashe; cả 6 phải giống nhau) */
const MK_MANA = (["Q",
    "E",
    "R"] as const).map((k) => cg.getHero("ashe")!.skills[k].mana ?? 0)
test(`Q/E/R của 6 Xạ thủ tốn ${MK_MANA.join("/")} mana đội`,
    () => {
        for (const id of ["ashe",
            "jinx",
            "kogmaw",
            "tristana",
            "missfortune",
            "teemo"]) {
            const h = cg.getHero(id)!
            assert.deepEqual([h.skills.Q.mana,
                h.skills.E.mana,
                h.skills.R.mana],
            MK_MANA,
            id)
        }
        const s = mk({
            A: {
                ashe: 2
            }, B: {
                bm_tank: 2
            }
        })
        const before = s.teamMana.A ?? 0
        const r = cast(s,
            "A",
            "ashe",
            "R",
            {
                target: "B:bm_tank"
            })
        assert.equal((r.s.teamMana.A ?? 0),
            before - MK_MANA[2],
            `R trừ ${MK_MANA[2]} từ bể đội`)
    })

// ======================================================================
G("Ashe")
// ======================================================================
test("Buốt vô hạn; hệ số sát thương 1 / (1 + Buốt / 30) (10/30/60 → 75%/50%/33,33%)",
    () => {
        assert.equal(ASHE.frostMult(10),
            0.75)
        assert.equal(ASHE.frostMult(30),
            0.5)
        assert.ok(Math.abs(ASHE.frostMult(60) - 1 / 3) < 1e-12)
        const s = mk({
            A: {
                ashe: 2
            }, B: {
                bm_fighter: 2
            }
        })
        const g = gm(s)
        ASHE.addFrost(g,
            u(s,
                "B",
                "bm_fighter"),
            45)
        ASHE.addFrost(g,
            u(s,
                "B",
                "bm_fighter"),
            15)
        assert.equal(g.statusV(u(s,
            "B",
            "bm_fighter"),
        "frost"),
        60,
        "không trần 10")
        // kẻ mang 60 Buốt đánh Ashe: sát thương còn 1/3
        const r = strike(s,
            "B",
            "bm_fighter",
            "A:ashe")
        const raw = AD("bm_fighter") * cg.RULES.roleAttack.fighter
        assert.equal(dmgList(r.ev,
            "A:ashe",
            "attack")[0],
        Math.round(raw / 3 * 100 / 126))
    })
test("E: bonus không nhân chí mạng của đòn chính; đòn mở (chưa Buốt) vẫn chí mạng",
    () => {
        let s = mk({
            A: {
                ashe: 2
            }, B: {
                bm_tank: 2
            }
        })
        s = cast(s,
            "A",
            "ashe",
            "E").s
        forceCrit(s,
            "A",
            "ashe")
        const r = strike(s,
            "A",
            "ashe",
            "B:bm_tank")
        const d = dmgList(r.ev,
            "B:bm_tank",
            "attack")
        assert.equal(d[0],
            after(AD("ashe") * CRIT),
            "đòn chính chí mạng")
        assert.equal(d[1],
            after(FV(s,
                "ashe",
                "F_E_BONUS")),
            "E bonus không ×2.25")
        assert.equal(gm(r.s).statusV(u(r.s,
            "B",
            "bm_tank"),
        "frost"),
        2)
    })
test("R: Choáng d = 0,70 + 0,005·AD + 0,005·AP; 80 AD, 0 AP = đúng 1 đơn vị",
    () => {
        const s = mk({
            A: {
                ashe: 2
            }, B: {
                bm_tank: 2
            }
        })
        const turn = s.turnNo
        const r = cast(s,
            "A",
            "ashe",
            "R",
            {
                target: "B:bm_tank"
            })
        const st = u(r.s,
            "B",
            "bm_tank").statuses.stun
        assert.ok(st,
            "bị Choáng")
        assert.equal(st.until,
            turn + 1,
            "hết cuối lượt địch kế")
        assert.equal(gm(r.s).statusV(u(r.s,
            "B",
            "bm_tank"),
        "frost"),
        5)
    })
test("Danh sách mục tiêu thêm của Ashe chỉ gồm tướng chọn được có Buốt",
    () => {
        const s = mk({
            A: {
                ashe: 2
            }, B: {
                bm_tank: 0, bm_mage: 4
            }
        })
        const g = gm(s)
        ASHE.addFrost(g,
            u(s,
                "B",
                "bm_tank"),
            1)
        ASHE.addFrost(g,
            u(s,
                "B",
                "bm_mage"),
            1)
        g.stealth(u(s,
            "B",
            "bm_mage"))
        const ids = cg.getHero("ashe")!.extraAttackTargets!(g,
            u(s,
                "A",
                "ashe")).map((x) => x.id)
        assert.deepEqual(ids,
            ["B:bm_tank"])
    })

// ======================================================================
G("Jinx")
// ======================================================================
test("Điên vô hạn, giữ nguyên khi Jinx chết",
    () => {
        const s = mk({
            A: {
                jinx: 2
            }
        })
        const g = gm(s)
        u(s,
            "A",
            "jinx").stacks.frenzy = 50
        g.stack(u(s,
            "A",
            "jinx"),
        "frenzy",
        10)
        g.kill(u(s,
            "A",
            "jinx"),
        u(s,
            "B",
            "bm_tank"))
        assert.equal(u(s,
            "A",
            "jinx").stacks.frenzy,
        60)
    })
test("P bonus Điên và lan Q không chí mạng; phát chính Q vẫn chí mạng",
    () => {
        let s = mk({
            A: {
                jinx: 2
            }, B: {
                bm_tank: 2, bm_mage: 3
            }
        })
        u(s,
            "A",
            "jinx").stacks.frenzy = 10
        s = cast(s,
            "A",
            "jinx",
            "Q").s
        forceCrit(s,
            "A",
            "jinx")
        const r = strike(s,
            "A",
            "jinx",
            "B:bm_tank")
        const q = FV(s,
            "jinx",
            "F_Q") + HN("jinx",
            "Q_PER") * 10
        const d = dmgList(r.ev,
            "B:bm_tank",
            "attack")
        assert.equal(d[0],
            after(q * CRIT),
            "phát chính chí mạng")
        assert.equal(d[1],
            after(10 * FV(s,
                "jinx",
                "F_PER")),
            "P không chí mạng")
        assert.equal(dmgList(r.ev,
            "B:bm_mage")[0],
        after(q * 0.25),
        "lan 25% trước chí mạng")
    })

// ======================================================================
G("Kog'Maw")
// ======================================================================
test("Đói vô hạn: 25 + đầu lượt = 26; Kog chết thật +3 (không thành +4)",
    () => {
        const s = mk({
            A: {
                kogmaw: 2
            }
        })
        const g = gm(s)
        u(s,
            "A",
            "kogmaw").stacks.hunger = 25
        g.hook("onTurnStart",
            {
                side: "A"
            })
        assert.equal(u(s,
            "A",
            "kogmaw").stacks.hunger,
        26)
        g.kill(u(s,
            "A",
            "kogmaw"),
        u(s,
            "B",
            "bm_tank"))
        assert.equal(u(s,
            "A",
            "kogmaw").stacks.hunger,
        29)
    })
test("Bonus Đói không nhân chí mạng của đòn chính",
    () => {
        const s = mk({
            A: {
                kogmaw: 2
            }, B: {
                bm_tank: 2
            }
        })
        u(s,
            "A",
            "kogmaw").stacks.hunger = 30
        forceCrit(s,
            "A",
            "kogmaw")
        const r = strike(s,
            "A",
            "kogmaw",
            "B:bm_tank")
        const d = dmgList(r.ev,
            "B:bm_tank",
            "attack")
        assert.equal(d[1],
            after(1000 * HN("kogmaw",
                "ATTACK_PCT") * 30 + FV(s,
                "kogmaw",
                "F_ATTACK")),
            "bonus phép không ×2.25")
    })

// ======================================================================
G("Tristana")
// ======================================================================
test("R: Bom nổ trước; Bom hạ đích thì hoàn E và không bắn phát R",
    () => {
        let s = mk({
            A: {
                tristana: 2
            }, B: {
                bm_tank: 2
            }
        })
        s = cast(s,
            "A",
            "tristana",
            "E",
            {
                target: "B:bm_tank"
            }).s
        u(s,
            "B",
            "bm_tank").hp = 10
        s.players.A.deck = s.players.A.deck.filter((c) => !(c.kind === "skill" && c.id === "tristana_e"))
        const r = cast(s,
            "A",
            "tristana",
            "R",
            {
                target: "B:bm_tank"
            })
        assert.equal(u(r.s,
            "B",
            "bm_tank").status,
        "dead")
        assert.equal(evs(r.ev,
            "damage").filter((d) => d.target === "B:bm_tank" && d.tag === "skill").length,
        0,
        "không có phát R")
        assert.ok(r.s.players.A.hand.some((c) => c.kind === "skill" && c.id === "tristana_e"),
            "hoàn E")
    })
test("R không có Bom: bắn rồi Choáng đúng 1 đơn vị ở 80 AD; Q bonus không chí mạng",
    () => {
        let s = mk({
            A: {
                tristana: 2
            }, B: {
                bm_tank: 2
            }
        })
        const turn = s.turnNo
        s = cast(s,
            "A",
            "tristana",
            "R",
            {
                target: "B:bm_tank"
            }).s
        assert.equal(u(s,
            "B",
            "bm_tank").statuses.stun?.until,
        turn + 1)
        s = cast(s,
            "A",
            "tristana",
            "Q").s
        forceCrit(s,
            "A",
            "tristana")
        const r = strike(s,
            "A",
            "tristana",
            "B:bm_tank")
        assert.equal(dmgList(r.ev,
            "B:bm_tank",
            "attack")[1],
        after(FV(s,
            "tristana",
            "F_Q")))
    })
test("Bom mới không bị hẹn giờ của Bom cũ (cùng lượt) kích nổ",
    () => {
        let s = mk({
            A: {
                tristana: 2
            }, B: {
                bm_tank: 2
            }
        })
        // Bom 1: đủ 4 Nạp nổ ngay trong lượt; Bom 2 đặt lại cùng lượt
        for (let i = 0; i < 4; i++) s = cast(s,
            "A",
            "tristana",
            "E",
            {
                target: "B:bm_tank"
            }).s
        assert.equal(gm(s).statusV(u(s,
            "B",
            "bm_tank"),
        "tri_bomb"),
        0,
        "Bom 1 đã nổ")
        s = cast(s,
            "A",
            "tristana",
            "E",
            {
                target: "B:bm_tank"
            }).s
        const g = gm(s)
        g.fireDelayed("turnEnd",
            "B")
        // cả hai hẹn giờ cùng tới hạn: chỉ hẹn giờ của Bom 2 kích Bom 2 (một lần nổ), Bom 1 bỏ qua
        assert.equal(g.statusV(u(s,
            "B",
            "bm_tank"),
        "tri_bomb"),
        0)
        assert.equal(g.events.filter((e) => e.t === "damage" && e.target === "B:bm_tank" && e.tag === "effect").length,
            1)
    })

// ======================================================================
G("Miss Fortune")
// ======================================================================
test("Mỗi R có lịch riêng; Choáng thật huỷ mọi nhịp chờ",
    () => {
        let s = mk({
            A: {
                missfortune: 2
            }, B: {
                bm_tank: 2
            }
        })
        s = cast(s,
            "A",
            "missfortune",
            "R").s
        s = cast(s,
            "A",
            "missfortune",
            "R").s
        assert.equal(u(s,
            "A",
            "missfortune").stacks[MF.RAIN],
        2)
        const g = gm(s)
        g.status(u(s,
            "A",
            "missfortune"),
        "stun",
        1)
        assert.equal(u(s,
            "A",
            "missfortune").stacks[MF.RAIN],
        0)
        g.removeStatus(u(s,
            "A",
            "missfortune"),
        "stun")
        g.fireDelayed("turnEnd",
            "B")
        assert.equal(g.events.filter((e) => e.t === "damage" && e.src === "A:missfortune").length,
            0,
            "không nhịp nào nổ")
    })
test("Hai lá R không bị huỷ thì nổ hai nhịp hai riêng",
    () => {
        let s = mk({
            A: {
                missfortune: 2
            }, B: {
                bm_tank: 2
            }
        })
        s = cast(s,
            "A",
            "missfortune",
            "R").s
        s = cast(s,
            "A",
            "missfortune",
            "R").s
        const g = gm(s)
        g.fireDelayed("turnEnd",
            "B")
        assert.equal(g.events.filter((e) => e.t === "damage" && e.src === "A:missfortune" && e.target === "B:bm_tank").length,
            2)
    })
test("P: đòn thật đầu tiên trúng từng địch; bonus không chí mạng",
    () => {
        const s = mk({
            A: {
                missfortune: 2
            }, B: {
                bm_tank: 2
            }
        })
        forceCrit(s,
            "A",
            "missfortune")
        const r = strike(s,
            "A",
            "missfortune",
            "B:bm_tank")
        assert.equal(dmgList(r.ev,
            "B:bm_tank",
            "attack")[1],
        after(gm(s).f(u(s,
            "A",
            "missfortune"),
        MF.F_PASSIVE)))
        const r2 = strike(r.s,
            "A",
            "missfortune",
            "B:bm_tank")
        assert.equal(dmgList(r2.ev,
            "B:bm_tank",
            "attack").length,
        1,
        "A → A không thưởng lại")
    })

// ======================================================================
G("Teemo")
// ======================================================================
const mushIn = (s: St, side: S) => s.players[side].deck.filter((c) => c.kind === "special" && c.id === "mushroom").length
test("R: chọn N = 2 trong kho 5 → nổ 2, giữ 3; kho trống thì gài 3 rồi dùng N",
    () => {
        let s = mk({
            A: {
                teemo: 2
            }, B: {
                bm_tank: 2
            }
        })
        s.players.B.deck = s.players.B.deck.filter((c) => !(c.kind === "special" && c.id === "mushroom"))
        for (let i = 0; i < 5; i++) s.players.B.deck.push(gm(s).newCard({
            kind: "special", id: "mushroom", hero: "teemo", side: "A"
        }))
        let r = cast(s,
            "A",
            "teemo",
            "R",
            {
                amount: 2, pick: "2"
            })
        assert.equal(mushIn(r.s,
            "B"),
        3)
        assert.equal(evs(r.ev,
            "damage").filter((d) => d.src === "A:teemo").length,
        2)
        s = r.s
        s.players.B.deck = s.players.B.deck.filter((c) => !(c.kind === "special" && c.id === "mushroom"))
        r = cast(s,
            "A",
            "teemo",
            "R",
            {
                amount: 2, pick: "2"
            })
        assert.equal(mushIn(r.s,
            "B"),
        1,
        "gài 3, tiêu 2, giữ 1")
    })
test("E chủ động: chọn tướng địch bất kỳ; Mù 1 đòn thật",
    () => {
        const s = mk({
            A: {
                teemo: 2
            }, B: {
                bm_tank: 4
            }
        })
        const r = cast(s,
            "A",
            "teemo",
            "E",
            {
                target: "B:bm_tank"
            })
        assert.equal(gm(r.s).statusV(u(r.s,
            "B",
            "bm_tank"),
        "blind"),
        1)
        assert.ok(dmgList(r.ev,
            "B:bm_tank").length > 0)
    })
test("Nấm rút trúng vẫn nổ khi Teemo đã chết (chỉ số đơn vị Teemo)",
    () => {
        const s = mk({
            A: {
                teemo: 2
            }, B: {
                bm_tank: 2
            }
        })
        const g = gm(s)
        g.kill(u(s,
            "A",
            "teemo"),
        u(s,
            "B",
            "bm_tank"))
        s.players.B.deck.unshift(g.newCard({
            kind: "special", id: "mushroom", hero: "teemo", side: "A"
        }))
        g.drawOne("B",
            "turn")
        assert.ok(g.events.some((e) => e.t === "damage" && e.src === "A:teemo"))
    })

// ======================================================================
const pad = (x: string, n: number) => (x.length >= n ? x : x + " ".repeat(n - x.length))
let last = ""
for (const r of results) {
    if (r.group !== last) { console.log(`\n== ${r.group} ==`); last = r.group }
    console.log(`${pad(r.res,
        5)} ${r.name}${r.note ? `\n        -> ${r.note}` : ""}`)
}
const c = (k: string) => results.filter((r) => r.res === k).length
console.log(`\nTỔNG: ${results.length} test | PASS ${c("PASS")} | FAIL ${c("FAIL")}`)
if (c("FAIL")) process.exit(1)
