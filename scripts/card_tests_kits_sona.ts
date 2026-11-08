// Test bộ chiêu Sona: hồi mana cho đội, buff vĩnh viễn lan sang tướng kề. Chạy: npx tsx scripts/card_tests_kits_sona.ts [--only=chuỗi] [--verbose]
// Mọi kỳ vọng tính từ cg.kit("sona").p nên sửa balance/heroes/sona.json không làm vỡ test.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    G, act, cast, gm, mk, report, skill, test, u, type Act, type St
} from "./kit_test_util"

const p = cg.kit("sona").p
type ChainAct = Extract<Act, { t: "chain" }>
function board(): St {
    const s = mk({
        A: {
            sona: 2, garen: 1, ashe: 3, zed: 4
        }, B: {
            braum: 2, annie: 1
        }
    })
    for (const x of Object.values(s.units)) x.maxHp = x.hp = 9000
    s.teamMana.A = 100
    return s
}
const fromCast = (s: St, amount: number) => Math.round(amount * p.p1 / 100 + gm(s).f(u(s,
    "A",
    "sona"),
cg.kit("sona").x("p2·Máu tối đa")))

G("Sona nội tại")
test("lá chiêu phe mình trả mana: đội hồi p1% mana lá + p2·Máu tối đa",
    () => {
        const s = board()
        const c = skill(s,
            "sona",
            "A",
            "Q")
        const r = cast(s,
            "A",
            c,
            {
                target: "A:sona"
            })
        const paid = 100 - r.ev.reduce((m, e) => (e.t === "teamManaChange" && e.reason === "spend" ? e.mana : m),
            100)
        assert.equal(r.s.teamMana.A,
            100 - paid + fromCast(s,
                paid))
    })
test("địch dùng chiêu và lá không phải chiêu không hồi",
    () => {
        const s = board()
        const g = gm(s)
        g.hook("onManaSpent",
            {
                unit: u(s,
                    "B",
                    "braum"), amount: 20, card: g.skillCard("braum",
                    "B",
                    "Q")
            })
        g.hook("onManaSpent",
            {
                unit: u(s,
                    "A",
                    "garen"), amount: 20, card: g.supportCard("gold")
            })
        assert.equal(s.teamMana.A,
            100)
    })
test("mỗi p3 Máu phe mình mất: đội hồi p4 + p5·AP, phần lẻ dồn lại, cả tướng khác Sona",
    () => {
        const s = board()
        const g = gm(s)
        g.damage(undefined,
            u(s,
                "A",
                "garen"),
            p.p3 - 1,
            "true",
            {
                tag: "effect"
            })
        assert.equal(s.teamMana.A,
            100)
        g.damage(undefined,
            u(s,
                "A",
                "ashe"),
            1,
            "true",
            {
                tag: "effect"
            })
        assert.equal(s.teamMana.A,
            100 + Math.round(p.p4))
    })
test("địch mất Máu không hồi; đòn nhiều nhát hồi theo tổng Máu mất",
    () => {
        const s = board()
        const g = gm(s)
        g.damage(undefined,
            u(s,
                "B",
                "braum"),
            500,
            "true",
            {
                tag: "effect"
            })
        assert.equal(s.teamMana.A,
            100)
        for (let i = 0; i < 4; i++) g.damage(undefined,
            u(s,
                "A",
                "garen"),
            p.p3 / 2,
            "true",
            {
                tag: "effect"
            })
        assert.equal(s.teamMana.A,
            100 + 2 * Math.round(p.p4))
    })

G("Sona Q, E")
test("Q: tướng chọn nhận AD và AP vĩnh viễn, cộng dồn, 1 tướng kề nhận q2%",
    () => {
        const s = board()
        const g0 = gm(s), garen = u(s,
            "A",
            "sona")
        const ad = g0.atk(u(s,
                "A",
                "sona")), near = g0.atk(u(s,
                "A",
                "ashe"))
        u(s,
            "A",
            "garen").hp = 8000
        let t = cast(s,
            "A",
            skill(s,
                "sona",
                "A",
                "Q"),
            {
                target: "A:sona"
            }).s
        assert.equal(gm(t).atk(u(t,
            "A",
            "sona")),
        ad + Math.round(p.q1))
        assert.ok(gm(t).atk(u(t,
            "A",
            "ashe")) === near,
        "Ashe Máu cao hơn Garen nên không nhận")
        assert.equal(u(t,
            "A",
            "garen").stacks.buff_atk,
        Math.round(p.q1 * p.q2 / 100))
        t = cast(t,
            "A",
            skill(t,
                "sona",
                "A",
                "Q"),
            {
                target: "A:sona"
            }).s
        assert.ok(u(t,
            "A",
            "sona").stacks.buff_atk >= 2 * Math.round(p.q1),
        "cộng dồn, lần sau còn ăn AP vừa nhận")
        assert.ok(garen)
    })
test("E: Giáp và Kháng phép vĩnh viễn, lan e2%",
    () => {
        const s = board()
        const armor = gm(s).armor(u(s,
                "A",
                "sona")), mr = gm(s).mr(u(s,
                "A",
                "sona"))
        const t = cast(s,
            "A",
            skill(s,
                "sona",
                "A",
                "E"),
            {
                target: "A:sona"
            }).s
        assert.equal(gm(t).armor(u(t,
            "A",
            "sona")),
        armor + Math.round(p.e1))
        assert.equal(gm(t).mr(u(t,
            "A",
            "sona")),
        mr + Math.round(p.e4))
    })
test("không có tướng kề thì không lan; Sona chết buff vẫn còn; tướng mang chết mất một nửa",
    () => {
        const s = mk({
            A: {
                sona: 0, garen: 3
            }, B: {
                braum: 2
            }
        })
        const r = cast(s,
            "A",
            skill(s,
                "sona",
                "A",
                "Q"),
            {
                target: "A:garen"
            })
        assert.equal(u(r.s,
            "A",
            "sona").stacks.buff_atk ?? 0,
        0)
        const g = gm(r.s), garen = u(r.s,
            "A",
            "garen")
        const n = garen.stacks.buff_atk
        g.kill(u(r.s,
            "A",
            "sona"))
        assert.equal(garen.stacks.buff_atk,
            n)
        g.kill(garen)
        assert.equal(garen.stacks.buff_atk,
            Math.floor(n / 2))
    })

G("Sona R")
test("R: mọi tướng mình hồi Máu, đội hồi r3 + r4·AP mana",
    () => {
        const s = board()
        for (const h of ["sona",
            "garen"]) u(s,
            "A",
            h).hp = 100
        const before = s.teamMana.A
        const r = cast(s,
            "A",
            skill(s,
                "sona",
                "A",
                "R"))
        assert.equal(u(r.s,
            "A",
            "garen").hp,
        100 + p.r1)
        assert.equal(u(r.s,
            "A",
            "sona").hp,
        100 + p.r1)
        assert.equal(r.s.teamMana.A,
            before - p.r0 + Math.round(p.r0 * p.p1 / 100) + Math.round(gm(s).f(u(s,
                "A",
                "sona"),
            cg.kit("sona").x("p2·Máu tối đa"))) + Math.round(p.r3))
    })
test("R Quick: nối Chuỗi khi địch dùng chiêu",
    () => {
        const s = board()
        s.active = "B"
        s.players.A.hand.push(skill(s,
            "sona",
            "A",
            "R"))
        const open = cast(s,
            "B",
            skill(s,
                "annie",
                "B",
                "Q"),
            {
                target: "A:garen"
            },
            false)
        assert.equal(open.s.phase,
            "chain")
        const opt = cg.legalActions(open.s,
            "A").filter((a) => a.t === "chain") as ChainAct[]
        assert.equal(opt.length,
            1)
        assert.equal(act(open.s,
            opt[0]).s.players.A.hand.some((c) => c.id === "sona_r"),
        false,
        "đã dùng lá R")
    })

test("E Quick: nối Chuỗi khi địch dùng chiêu, chọn được tướng mình",
    () => {
        const s = board()
        s.active = "B"
        s.players.A.hand.push(skill(s,
            "sona",
            "A",
            "E"))
        const open = cast(s,
            "B",
            skill(s,
                "annie",
                "B",
                "Q"),
            {
                target: "A:garen"
            },
            false)
        const opt = cg.legalActions(open.s,
            "A").filter((a) => a.t === "chain") as ChainAct[]
        assert.ok(opt.some((a) => a.args?.target === "A:garen"))
    })

report()
