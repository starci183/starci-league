// Test cơ chế đặc trưng 3 tướng mới: Tristana, Miss Fortune, Vel'Koz.
// Chạy: npx tsx scripts/card_tests_heroes_new.ts [--only=chuỗi] [--verbose]. Khung test chép từ scripts/card_tests_heroes_g1.ts.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"

import * as TRI from "../packages/shared/src/cardgame/heroes/tristana"
import * as MF from "../packages/shared/src/cardgame/heroes/missfortune"
import * as VK from "../packages/shared/src/cardgame/heroes/velkoz"
type St = ReturnType<typeof cg.newGame>
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
/** Sát thương sau giáp 30 của tướng giả */
const afterArmor = (raw: number) => Math.round(raw * 100 / 130)

// ======================================================================
G("Tristana")
// ======================================================================
const bombs = (s: St, side: S, hero: string) => gm(s).statusV(u(s,
    side,
    hero),
"tri_bomb")

test("E gắn Bom (1 Nạp); 3 đòn đánh lên nó đủ 4 Nạp thì Bom nổ",
    () => {
        let s = mk({
            A: {
                tristana: 2
            }, B: {
                g1_fighter: 2
            }
        })
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "tristana",
                    "A",
                    "E")),
            {
                target: "B:g1_fighter"
            }).s
        assert.equal(bombs(s,
            "B",
            "g1_fighter"),
        1)
        s = strike(s,
            "A",
            "A:tristana",
            "B:g1_fighter").s
        assert.equal(bombs(s,
            "B",
            "g1_fighter"),
        2)
        s = strike(s,
            "A",
            "A:tristana",
            "B:g1_fighter").s
        assert.equal(bombs(s,
            "B",
            "g1_fighter"),
        3)
        const r = strike(s,
            "A",
            "A:tristana",
            "B:g1_fighter")
        assert.equal(bombs(r.s,
            "B",
            "g1_fighter"),
        0)
        assert.ok(dmgTo(r.ev,
            "B:g1_fighter",
            "effect") > 0,
        "Bom phải nổ")
    })

test("Bom tự nổ ở cuối lượt địch kế; nổ hạ được địch thì lá E về tay",
    () => {
        let s = mk({
            A: {
                tristana: 2
            }, B: {
                g1_fighter: 2
            }
        })
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "tristana",
                    "A",
                    "E")),
            {
                target: "B:g1_fighter"
            }).s
        const foe = u(s,
            "B",
            "g1_fighter")
        foe.hp = 1
        assert.ok(!s.players.A.hand.some((c) => c.id === "tristana_e"))
        gm(s).fireDelayed("turnEnd",
            "B")
        assert.equal(foe.status,
            "dead")
        assert.ok(s.players.A.hand.some((c) => c.id === "tristana_e"),
            "E phải về tay")
    })

test("R: sát thương, kích nổ Bom ngay và Choáng",
    () => {
        let s = mk({
            A: {
                tristana: 2
            }, B: {
                g1_fighter: 2
            }
        })
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "tristana",
                    "A",
                    "E")),
            {
                target: "B:g1_fighter"
            }).s
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "tristana",
                    "A",
                    "R")),
            {
                target: "B:g1_fighter"
            })
        const foe = u(r.s,
            "B",
            "g1_fighter")
        assert.equal(bombs(r.s,
            "B",
            "g1_fighter"),
        0)
        assert.ok(gm(r.s).has(foe,
            "stun"))
        assert.ok(dmgTo(r.ev,
            "B:g1_fighter",
            "effect") > 0)
        assert.ok(dmgTo(r.ev,
            "B:g1_fighter",
            "skill") > 0)
    })

test("Q: mỗi đòn đánh thêm (20 + 40% AD) sát thương vật lý",
    () => {
        let s = mk({
            A: {
                tristana: 2
            }, B: {
                g1_fighter: 2
            }
        })
        const plain = dmgTo(strike(s,
            "A",
            "A:tristana",
            "B:g1_fighter").ev,
        "B:g1_fighter")
        s = mk({
            A: {
                tristana: 2
            }, B: {
                g1_fighter: 2
            }
        })
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "tristana",
                    "A",
                    "Q"))).s
        const withQ = dmgTo(strike(s,
            "A",
            "A:tristana",
            "B:g1_fighter").ev,
        "B:g1_fighter")
        const extra = afterArmor(gm(s).f(u(s,
            "A",
            "tristana"),
        TRI.F_Q))
        assert.ok(Math.abs(withQ - plain - extra) <= 2,
            `${withQ} - ${plain} != ${extra}`)
    })

// ======================================================================
G("Miss Fortune")
// ======================================================================
const trio = {
    g1_sup: 1, g1_fighter: 2, g1_mage: 3
}

test("nội tại: đòn đầu lên mỗi địch khác nhau thêm sát thương, đòn hai lên cùng đứa thì không",
    () => {
        const s2 = mk({
            A: {
                missfortune: 2
            }, B: trio
        })
        const first = strike(s2,
            "A",
            "A:missfortune",
            "B:g1_fighter")
        const second = strike(first.s,
            "A",
            "A:missfortune",
            "B:g1_fighter")
        const other = strike(second.s,
            "A",
            "A:missfortune",
            "B:g1_mage")
        const extra = afterArmor(gm(s2).f(u(s2,
            "A",
            "missfortune"),
        MF.F_PASSIVE))
        const d1 = dmgTo(first.ev,
            "B:g1_fighter")
        const d2 = dmgTo(second.ev,
            "B:g1_fighter")
        const d3 = dmgTo(other.ev,
            "B:g1_mage")
        assert.ok(d1 - d2 >= extra - 2,
            `${d1} ${d2} ${extra}`)
        assert.ok(d3 - d2 >= extra - 2,
            `${d3} ${d2} ${extra}`)
    })

test("Q: nảy sang 1 địch khác ×1.5; phát đầu hạ gục thì ×2",
    () => {
        let s = mk({
            A: {
                missfortune: 2
            }, B: trio
        })
        const raw = gm(s).f(u(s,
            "A",
            "missfortune"),
        MF.F_Q)
        let r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "missfortune",
                    "A",
                    "Q")),
            {
                target: "B:g1_fighter"
            })
        const main = dmgTo(r.ev,
            "B:g1_fighter")
        const side = dmgTo(r.ev,
            "B:g1_sup") + dmgTo(r.ev,
            "B:g1_mage")
        assert.ok(Math.abs(main - afterArmor(raw)) <= 1)
        assert.ok(Math.abs(side - afterArmor(raw * 1.5)) <= 2,
            `${side}`)
        s = mk({
            A: {
                missfortune: 2
            }, B: trio
        })
        u(s,
            "B",
            "g1_fighter").hp = 1
        r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "missfortune",
                    "A",
                    "Q")),
            {
                target: "B:g1_fighter"
            })
        const side2 = dmgTo(r.ev,
            "B:g1_sup") + dmgTo(r.ev,
            "B:g1_mage")
        assert.ok(Math.abs(side2 - afterArmor(raw * 2)) <= 2,
            `${side2}`)
    })

test("E (Quick): mọi địch nhận sát thương và Vết Thương Sâu",
    () => {
        const s = mk({
            A: {
                missfortune: 2
            }, B: trio
        })
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "missfortune",
                    "A",
                    "E")))
        for (const h of Object.keys(trio)) {
            assert.ok(gm(r.s).has(u(r.s,
                "B",
                h),
            "grievous"),
            h)
            assert.ok(dmgTo(r.ev,
                `B:${h}`) > 0)
        }
    })

test("R: bắn ngay, nhịp hai nổ cuối lượt địch; bị Choáng trước đó thì huỷ nhịp hai",
    () => {
        let s = mk({
            A: {
                missfortune: 2
            }, B: trio
        })
        let r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "missfortune",
                    "A",
                    "R")))
        assert.ok(dmgTo(r.ev,
            "B:g1_fighter") > 0)
        assert.equal(u(r.s,
            "A",
            "missfortune").stacks[MF.RAIN],
        1)
        const hp = u(r.s,
            "B",
            "g1_fighter").hp
        gm(r.s).fireDelayed("turnEnd",
            "B")
        assert.ok(u(r.s,
            "B",
            "g1_fighter").hp < hp,
        "nhịp hai phải nổ")
        s = mk({
            A: {
                missfortune: 2
            }, B: trio
        })
        r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "missfortune",
                    "A",
                    "R")))
        gm(r.s).status(u(r.s,
            "A",
            "missfortune"),
        "stun",
        1)
        assert.equal(u(r.s,
            "A",
            "missfortune").stacks[MF.RAIN],
        0)
        const hp2 = u(r.s,
            "B",
            "g1_fighter").hp
        gm(r.s).fireDelayed("turnEnd",
            "B")
        assert.equal(u(r.s,
            "B",
            "g1_fighter").hp,
        hp2)
    })

// ======================================================================
G("Vel'Koz")
// ======================================================================
const decay = (s: St, hero: string) => u(s,
    "B",
    hero).stacks[VK.DECAY] ?? 0

test("chiêu trúng +1 Phân Rã; đủ 3 thì nổ sát thương chuẩn rồi về 0",
    () => {
        let s = mk({
            A: {
                velkoz: 2
            }, B: {
                g1_fighter: 2
            }
        })
        for (let i = 1; i <= 2; i++) {
            s = play(s,
                "A",
                give(s,
                    "A",
                    skill(s,
                        "velkoz",
                        "A",
                        "Q")),
                {
                    target: "B:g1_fighter"
                }).s
            assert.equal(decay(s,
                "g1_fighter"),
            i)
        }
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "velkoz",
                    "A",
                    "Q")),
            {
                target: "B:g1_fighter"
            })
        assert.equal(decay(r.s,
            "g1_fighter"),
        0)
        assert.ok(evs(r.ev,
            "damage").some((d) => d.target === "B:g1_fighter" && d.kind === "true" && d.amount > 0),
        "phải có sát thương chuẩn")
    })

test("Q: đứa chính nhận gấp đôi, 1 địch ngẫu nhiên khác cũng +1 Phân Rã",
    () => {
        const s = mk({
            A: {
                velkoz: 2
            }, B: {
                g1_sup: 1, g1_fighter: 2, g1_mage: 3, g1_mark: 0
            }
        })
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "velkoz",
                    "A",
                    "Q")),
            {
                target: "B:g1_fighter"
            })
        const hit = ["g1_sup",
            "g1_mage",
            "g1_mark"].filter((h) => decay(r.s,
            h) === 1)
        assert.equal(hit.length,
            VK.Q_SIDE_TARGETS)
        const mainRaw = gm(r.s).f(u(r.s,
            "A",
            "velkoz"),
        VK.F_Q_MAIN,
        u(r.s,
            "B",
            "g1_fighter"))
        const sideRaw = gm(r.s).f(u(r.s,
            "A",
            "velkoz"),
        VK.F_Q_SIDE,
        u(r.s,
            "B",
            hit[0]))
        assert.ok(mainRaw > sideRaw * 1.9)
    })

test("E: sát thương ngay và nhịp hai cuối lượt, mỗi nhịp +1 Phân Rã",
    () => {
        const s = mk({
            A: {
                velkoz: 2
            }, B: {
                g1_fighter: 2
            }
        })
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "velkoz",
                    "A",
                    "E")),
            {
                target: "B:g1_fighter"
            })
        assert.equal(decay(r.s,
            "g1_fighter"),
        1)
        const hp = u(r.s,
            "B",
            "g1_fighter").hp
        gm(r.s).fireDelayed("turnEnd",
            "A")
        assert.ok(u(r.s,
            "B",
            "g1_fighter").hp < hp)
        assert.equal(decay(r.s,
            "g1_fighter"),
        2)
    })

test("R: 6 tia vào 1 mục tiêu chọn, mỗi tia là một lần trúng, đủ 6 tia = 2 chu kỳ Phân Rã",
    () => {
        const s = mk({
            A: {
                velkoz: 2
            }, B: {
                g1_sup: 1, g1_fighter: 2, g1_mage: 3
            }
        })
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "velkoz",
                    "A",
                    "R")),
            {
                target: "B:g1_fighter"
            })
        const rays = evs(r.ev,
            "damage").filter((d) => d.tag === "skill" && d.kind === "magic")
        assert.equal(rays.length,
            VK.RAYS)
        assert.ok(rays.every((d) => d.target === "B:g1_fighter"),
            "mọi tia vào đúng mục tiêu chọn")
        assert.equal(evs(r.ev,
            "damage").filter((d) => d.tag === "effect" && d.kind === "true" && d.target === "B:g1_fighter").length,
        2,
        "6 tia = 2 lần nổ Phân Rã")
        assert.equal(decay(r.s,
            "g1_fighter"),
        0)
    })

test("chủ 30/10: không còn lá tạm Phân Rã Hữu Cơ đầu lượt (nội tại chỉ cộng Phân Rã khi chiêu trúng)",
    () => {
        const s = mk({
            A: {
                velkoz: 2
            }, B: {
                g1_fighter: 2
            }
        })
        const before = s.players.A.hand.length
        gm(s).hook("onTurnStart",
            {
                side: "A"
            })
        assert.equal(s.players.A.hand.length,
            before)
        assert.ok(!s.players.A.hand.some((c) => c.id === "velkoz_decay"))
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
