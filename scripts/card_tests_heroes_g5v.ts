// Test cơ chế đặc trưng V2 nhóm G5V: Viktor, Ashe, Jinx, Kog'Maw, Teemo, Vayne.
// Chạy: npx tsx scripts/card_tests_heroes_g5v.ts [--only=chuỗi] [--verbose]. Khung chép từ scripts/card_tests.ts.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import * as VAYNE from "../packages/shared/src/cardgame/heroes/vayne"
import {
    HF
} from "./card_tests_formulas"

type St = ReturnType<typeof cg.newGame>;
type Act = Parameters<typeof cg.applyAction>[1];
type Ev = ReturnType<typeof cg.applyAction>["events"];
type S = "A" | "B";
const { Game } = cg
/** AD gốc của tướng (đọc từ định nghĩa để test không vỡ khi cân bằng chỉ số) */
const AD = (h: string) => cg.getHero(h)!.atk

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
    // Dedicated skill-cost fixtures use a known shared budget of 100.
    s.teamMana = {
        A: 100, B: 100
    }
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
/** Giá trị công thức `name` (hằng trong heroes/<hero>.ts) theo chỉ số tướng A:<hero> */
const FV = (s: St, hero: string, name: string) => gm(s).f(u(s,
    "A",
    hero),
HF(hero,
    name))
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
test(`Q: bỏ 2 lá => +2 Tiến Hoá, mỗi lá 1 Khiên (${HF("viktor",
    "F_SHIELD")}), trừ 10 mana, 2 lá vào mộ; AP gốc 0`,
() => {
    let s = mk({
        A: {
            viktor: 2
        }
    })
    assert.equal(gm(s).ap(u(s,
        "A",
        "viktor")),
    0,
    "AP gốc = 0 (luật chủ)")
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
    const mana = s.teamMana.A ?? 0
    const per = Math.round(gm(s).f(u(s,
        "A",
        "viktor"),
    HF("viktor",
        "F_SHIELD")))
    s = play(s,
        "A",
        q,
        {
            discard: [d1.uid,
                d2.uid]
        }).s
    assert.equal(stack(s,
        "A",
        "viktor",
        "evolve"),
    2)
    assert.equal(u(s,
        "A",
        "viktor").shield,
    2 * per,
    "mỗi lá bỏ một Khiên")
    assert.equal(s.teamMana.A,
        mana - 10)
    assert.ok(s.players.A.grave.some((c) => c.uid === d1.uid) && s.players.A.grave.some((c) => c.uid === d2.uid))
})
test("E: sát thương phép mọi địch (35 mana), mỗi Tiến Hoá thêm 8% (5 nấc = ×1.4)",
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
            assert.equal(r.s.teamMana.A,
                (s.teamMana.A ?? 0) - 35)
            return r.ev
        }
        const s0 = mk({
            A: {
                viktor: 2
            }
        })
        const base = run(0)
        const evolved = run(5)
        const raw = FV(s0,
            "viktor",
            "F_E")
        for (const f of ["B:g5v_tank",
            "B:g5v_fighter",
            "B:g5v_mage",
            "B:g5v_mark",
            "B:g5v_sup"]) assert.equal(dmgTo(base,
            f),
        Math.round(raw * 100 / 130),
        `${f} trúng E`)
        assert.equal(dmgTo(evolved,
            "B:g5v_tank"),
        Math.round(raw * 1.4 * 100 / 130),
        "5 nấc = +40%")
    })
test("R: sát thương mọi địch, tướng nhiều máu nhất thử Choáng d = 0,9 + 0,001 AD + 0,002 AP, Viktor +2 Tiến Hoá (không trần), Tiến Hoá giữ khi chết",
    () => {
        let s = mk({
            A: {
                viktor: 2
            }, B: {
                g5v_tank: 0, g5v_fighter: 1, g5v_mage: 2, g5v_mark: 3, g5v_sup: 4
            }
        })
        for (const h of ["g5v_fighter",
            "g5v_mage",
            "g5v_mark",
            "g5v_sup"]) u(s,
            "B",
            h).hp = 800
        s.units["A:viktor"].stacks.evolve = 9
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "viktor",
                    "A",
                    "R")))
        s = r.s
        const raw = FV(s,
            "viktor",
            "F_R") * (1 + 0.08 * 9)
        for (const f of ["g5v_tank",
            "g5v_fighter",
            "g5v_sup"]) assert.equal(dmgTo(r.ev,
            `B:${f}`),
        Math.round(raw * 100 / 130),
        f)
        assert.ok(u(s,
            "B",
            "g5v_tank").statuses.stun,
        "nhiều máu nhất bị Choáng")
        for (const h of ["g5v_fighter",
            "g5v_mage",
            "g5v_mark",
            "g5v_sup"]) assert.ok(!u(s,
            "B",
            h).statuses.stun,
        `${h} không Choáng`)
        assert.equal(stack(s,
            "A",
            "viktor",
            "evolve"),
        11,
        "9 + 2 = 11, không trần")
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
        11,
        "Tiến Hoá giữ khi chết")
    })

// ======================================================================
G("Ashe")
// ======================================================================
const FOREVER = 1_000_000
/** Các mục tiêu lá Đánh thường của `side` đánh được cho tướng `actor` */
function basicTargets(s: St, side: S, actor: string): string[] {
    s.active = side
    const c = give(s,
        side,
        sup(s,
            "basic"))
    const out = cg.legalActions(s,
        side).filter((a) => a.t === "play" && a.uid === c.uid && a.args?.actor === `${side}:${actor}`).map((a) => (a as { args: cg.PlayArgs }).args.target as string)
    s.players[side].hand = s.players[side].hand.filter((x) => x.uid !== c.uid)
    return out
}
test("Nội tại: đòn đánh gắn Buốt (không tự hết); mỗi Buốt làm sát thương địch gây ra giảm 2.5%",
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
        const t = u(s,
            "B",
            "g5v_mark")
        assert.equal(gm(s).statusV(t,
            "frost"),
        1)
        assert.ok(t.statuses.frost.until >= FOREVER,
            "Buốt không tự hết")
        const hit = (st: St) => dmgTo(strike(st,
            "B",
            "g5v_mark",
            "A:ashe").ev,
        "A:ashe",
        "attack")
        const clean = hit(mk({
            A: {
                ashe: 2
            }, B: {
                g5v_mark: 2
            }
        }))
        gm(s).status(t,
            "frost",
            1,
            {
                v: 4, add: true, until: FOREVER
            })
        assert.equal(gm(s).statusV(t,
            "frost"),
        5)
        const frosted = hit(s)
        assert.ok(Math.abs(frosted - clean * (1 - 0.025 * 5)) <= 1,
            `${frosted} vs ${clean} giảm 12.5%`)
    })
test("Nội tại: đánh được địch có Buốt bỏ qua đỡ đòn; đòn lên tướng có Buốt không chí mạng",
    () => {
        const s = mk({
            A: {
                ashe: 2
            }, B: {
                g5v_tank: 2, g5v_mage: 1
            }
        })
        assert.deepEqual(basicTargets(s,
            "A",
            "ashe"),
        ["B:g5v_tank"],
        "đỡ đòn khiêu khích lá Đánh thường")
        gm(s).status(u(s,
            "B",
            "g5v_mage"),
        "frost",
        1,
        {
            until: FOREVER
        })
        const t = basicTargets(s,
            "A",
            "ashe")
        assert.ok(t.includes("B:g5v_tank") && t.includes("B:g5v_mage"),
            `đánh được cả tướng có Buốt: ${t.join()}`)
        // Chí mạng: lần đầu lên tướng chưa Buốt thì chí mạng, các lần sau (đã Buốt) thì không
        gm(s).status(u(s,
            "A",
            "ashe"),
        "alwaysCrit",
        1)
        const first = strike(s,
            "A",
            "ashe",
            "B:g5v_tank")
        assert.equal(evs(first.ev,
            "attack")[0].crit,
        true,
        "chưa Buốt thì chí mạng")
        const second = strike(first.s,
            "A",
            "ashe",
            "B:g5v_tank")
        assert.equal(evs(second.ev,
            "attack")[0].crit,
        false,
        "đã Buốt thì không chí mạng")
    })
test(`Q: (${HF("ashe",
    "F_Q")}) + 3 Buốt; E: đòn đánh gây thêm (${HF("ashe",
    "F_E_BONUS")}) và gắn 2 Buốt`,
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
    Math.round(FV(s,
        "ashe",
        "F_Q") * 100 / 130))
    assert.equal(gm(s).statusV(u(s,
        "B",
        "g5v_tank"),
    "frost"),
    3)
    s = play(s,
        "A",
        give(s,
            "A",
            skill(s,
                "ashe",
                "A",
                "E"))).s
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
    assert.equal(dmgTo(r.ev,
        "B:g5v_tank",
        "attack"),
    Math.round(AD("ashe") * 100 / 130) + Math.round(FV(s,
        "ashe",
        "F_E_BONUS") * 100 / 130),
    "đòn thường + phần thêm của E")
})
test(`R: (${HF("ashe",
    "F_R")}) + Choáng + 5 Buốt lên 1 địch, không cần có Buốt, Buốt không bị xoá`,
() => {
    let s = mk({
        A: {
            ashe: 2
        }, B: {
            g5v_tank: 2, g5v_mage: 1
        }
    })
    const r = play(s,
        "A",
        give(s,
            "A",
            skill(s,
                "ashe",
                "A",
                "R")),
        {
            target: "B:g5v_tank"
        })
    s = r.s
    assert.equal(dmgTo(r.ev,
        "B:g5v_tank"),
    Math.round(FV(s,
        "ashe",
        "F_R") * 100 / 130))
    assert.ok(u(s,
        "B",
        "g5v_tank").statuses.stun)
    assert.equal(gm(s).statusV(u(s,
        "B",
        "g5v_tank"),
    "frost"),
    5)
    assert.equal(dmgTo(r.ev,
        "B:g5v_mage"),
    0,
    "chỉ 1 mục tiêu")
    const r2 = play(s,
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
    assert.equal(gm(r2.s).statusV(u(r2.s,
        "B",
        "g5v_tank"),
    "frost"),
    8,
    "chiêu của Ashe không bao giờ xoá Buốt")
})

// ======================================================================
G("Jinx")
// ======================================================================
test("Nội tại: đánh trúng địch dưới 75% máu +1 Điên, dưới 25% máu +2, đầy máu 0; hạ gục +10",
    () => {
        const run = (hp: number) => {
            const s = mk({
                A: {
                    jinx: 2
                }, B: {
                    g5v_tank: 2
                }
            })
            u(s,
                "B",
                "g5v_tank").hp = hp
            return stack(strike(s,
                "A",
                "jinx",
                "B:g5v_tank").s,
            "A",
            "jinx",
            "frenzy")
        }
        assert.equal(run(1000),
            0,
            "đầy máu")
        assert.equal(run(700),
            1,
            "dưới 75%")
        assert.equal(run(200),
            2,
            "dưới 25%")
        assert.equal(run(50),
            12,
            "hạ gục: +2 bậc máu thấp và +10")
    })
test(`Nội tại: mỗi Điên đòn đánh thêm (${HF("jinx",
    "F_PER")}); Điên vô hạn; Jinx chết giữ nguyên Điên`,
() => {
    const hit = (n: number) => {
        const s = mk({
            A: {
                jinx: 2
            }, B: {
                g5v_tank: 2
            }
        })
        s.units["A:jinx"].stacks.frenzy = n
        return dmgTo(strike(s,
            "A",
            "jinx",
            "B:g5v_tank").ev,
        "B:g5v_tank",
        "attack")
    }
    const per = FV(mk({
        A: {
            jinx: 2
        }
    }),
    "jinx",
    "F_PER")
    assert.equal(hit(10),
        Math.round(AD("jinx") * 100 / 130) + Math.round(10 * per * 100 / 130))
    assert.ok(hit(10) > hit(0))
    const s = mk({
        A: {
            jinx: 2
        }, B: {
            g5v_tank: 2
        }
    })
    s.units["A:jinx"].stacks.frenzy = 29
    gm(s).stack(u(s,
        "A",
        "jinx"),
    "frenzy",
    10)
    assert.equal(stack(s,
        "A",
        "jinx",
        "frenzy"),
    39,
    "không trần")
    gm(s).kill(u(s,
        "A",
        "jinx"),
    u(s,
        "B",
        "g5v_tank"))
    assert.equal(stack(s,
        "A",
        "jinx",
        "frenzy"),
    39,
    "chết giữ nguyên")
})
test(`Q: đòn đánh kế gây (${HF("jinx",
    "F_Q")}) lên mục tiêu, 25% lên mọi địch còn lại, mỗi đứa trúng đều tính Điên`,
() => {
    let s = mk({
        A: {
            jinx: 2
        }, B: {
            g5v_tank: 2, g5v_mage: 1, g5v_sup: 3, g5v_fighter: 0
        }
    })
    u(s,
        "B",
        "g5v_mage").hp = 200
    u(s,
        "B",
        "g5v_sup").hp = 600
    s = play(s,
        "A",
        give(s,
            "A",
            skill(s,
                "jinx",
                "A",
                "Q"))).s
    assert.ok(gm(s).has(u(s,
        "A",
        "jinx"),
    "jinx_q"))
    const r = strike(s,
        "A",
        "jinx",
        "B:g5v_tank")
    const base = FV(s,
        "jinx",
        "F_Q")
    assert.equal(dmgTo(r.ev,
        "B:g5v_tank"),
    Math.round(base * 100 / 130),
    "phát chính thay đòn thường")
    for (const h of ["g5v_mage",
        "g5v_sup",
        "g5v_fighter"]) assert.equal(dmgTo(r.ev,
        `B:${h}`),
    Math.round(base * 0.25 * 100 / 130),
    `${h} nhận 25%`)
    assert.equal(stack(r.s,
        "A",
        "jinx",
        "frenzy"),
    3,
    "mage dưới 25% (+2) và sup dưới 75% (+1)")
    assert.ok(!gm(r.s).has(u(r.s,
        "A",
        "jinx"),
    "jinx_q"),
    "Q dùng một lần")
    const again = strike(r.s,
        "A",
        "jinx",
        "B:g5v_tank")
    assert.equal(dmgTo(again.ev,
        "B:g5v_sup"),
    0,
    "đòn sau không lan")
})
test("E (Quick, Chỉ Nối Chuỗi): địch đánh Jinx => Jinx nhận ít hơn 20% sát thương và lấy 1 lá Q từ bộ bài lên tay",
    () => {
        const run = (react: boolean) => {
            const s = mk({
                A: {
                    jinx: 2
                }, B: {
                    g5v_fighter: 2
                }
            })
            s.active = "B"
            const e = give(s,
                "A",
                skill(s,
                    "jinx",
                    "A",
                    "E"))
            const c = give(s,
                "B",
                sup(s,
                    "basic"))
            const o = cg.applyAction(s,
                {
                    t: "play", side: "B", uid: c.uid, args: {
                        actor: "B:g5v_fighter", target: "A:jinx"
                    }
                })
            assert.equal(o.state.phase,
                "chain")
            let state = o.state
            const ev: Ev = [...o.events]
            if (react) {
                const o2 = cg.applyAction(state,
                    {
                        t: "chain", side: "A", uid: e.uid, args: {
                        }
                    })
                state = o2.state
                ev.push(...o2.events)
            }
            const done = settle({
                s: state, ev
            })
            return {
                s: done.s, dmg: dmgTo(done.ev,
                    "A:jinx")
            }
        }
        const plain = run(false)
        const reacted = run(true)
        assert.ok(plain.dmg > 0)
        assert.equal(reacted.dmg,
            Math.round(plain.dmg * 0.8),
            `${reacted.dmg} = 80% của ${plain.dmg}`)
        assert.ok(reacted.s.players.A.hand.some((c) => c.kind === "skill" && c.id === "jinx_q"),
            "có 1 lá Q của Jinx trên tay")
    })
test(`R: (${HF("jinx",
    "F_R")}) + 5 mỗi Điên + 20% máu đã mất của mục tiêu`,
() => {
    const s = mk({
        A: {
            jinx: 2
        }, B: {
            g5v_tank: 2
        }
    })
    s.units["A:jinx"].stacks.frenzy = 10
    u(s,
        "B",
        "g5v_tank").hp = 600
    const r = play(s,
        "A",
        give(s,
            "A",
            skill(s,
                "jinx",
                "A",
                "R")),
        {
            target: "B:g5v_tank"
        })
    const raw = FV(s,
        "jinx",
        "F_R") + 5 * 10 + 0.2 * 400
    assert.equal(dmgTo(r.ev,
        "B:g5v_tank"),
    Math.round(raw * 100 / 130))
})

// ======================================================================
G("Kog'Maw")
// ======================================================================
test("Nội tại: +1 Đói mỗi lượt Kog sống, +1 khi có tướng chết; Kog chết +3 Đói; AP gốc 0",
    () => {
        const s = mk({
            A: {
                kogmaw: 2
            }, B: {
                g5v_tank: 2
            }
        })
        assert.equal(gm(s).ap(u(s,
            "A",
            "kogmaw")),
        0)
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
        2,
        "có tướng chết +1")
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
        9 + 3,
        "Kog chết +3 Đói, không mất Đói")
    })
test(`Đòn đánh thêm (0.8% máu tối đa mục tiêu mỗi Đói + ${HF("kogmaw",
    "F_ATTACK")}) phép; E nhân đôi phần % máu`,
() => {
    const hit = (hunger: number, e: boolean) => {
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
    const flat = FV(mk({
        A: {
            kogmaw: 2
        }
    }),
    "kogmaw",
    "F_ATTACK")
    const exp = (n: number, k: number) => Math.round(AD("kogmaw") * 100 / 130) + Math.round((1000 * 0.008 * n * k + flat) * 100 / 130)
    assert.equal(hit(0,
        false),
    exp(0,
        1),
    "0 Đói vẫn có phần AD/AP")
    assert.equal(hit(10,
        false),
    exp(10,
        1))
    assert.equal(hit(10,
        true),
    exp(10,
        2),
    "E nhân đôi phần % máu")
})
test(`Q: (${HF("kogmaw",
    "F_Q")}) phép + 3 Đói; R: mọi địch nhận 1.5% máu tối đa mỗi Đói + (${HF("kogmaw",
    "F_R")})`,
() => {
    let s = mk({
        A: {
            kogmaw: 2
        }, B: {
            g5v_tank: 0, g5v_fighter: 1, g5v_mage: 2, g5v_mark: 3, g5v_sup: 4
        }
    })
    let r = play(s,
        "A",
        give(s,
            "A",
            skill(s,
                "kogmaw",
                "A",
                "Q")),
        {
            target: "B:g5v_tank"
        })
    s = r.s
    assert.equal(dmgTo(r.ev,
        "B:g5v_tank"),
    Math.round(FV(s,
        "kogmaw",
        "F_Q") * 100 / 130))
    assert.equal(stack(s,
        "A",
        "kogmaw",
        "hunger"),
    3)
    s.units["A:kogmaw"].stacks.hunger = 10
    r = play(s,
        "A",
        give(s,
            "A",
            skill(s,
                "kogmaw",
                "A",
                "R")))
    for (const h of ["g5v_tank",
        "g5v_fighter",
        "g5v_mage",
        "g5v_mark",
        "g5v_sup"]) assert.equal(dmgTo(r.ev,
        `B:${h}`),
    Math.round((1000 * 0.015 * 10 + FV(s,
        "kogmaw",
        "F_R")) * 100 / 130),
    h)
})

// ======================================================================
G("Teemo")
// ======================================================================
const mushrooms = (s: St, side: S) => s.players[side].deck.filter((c) => c.kind === "special" && c.id === "mushroom").length
test("Nội tại: mỗi đòn đánh xáo 1 Nấm vào bộ bài địch; Q xáo 3; AP gốc 0",
    () => {
        let s = mk({
            A: {
                teemo: 2
            }, B: {
                g5v_tank: 2
            }
        })
        assert.equal(gm(s).ap(u(s,
            "A",
            "teemo")),
        0)
        const m0 = mushrooms(s,
            "B")
        s = strike(s,
            "A",
            "teemo",
            "B:g5v_tank").s
        assert.equal(mushrooms(s,
            "B"),
        m0 + 1)
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
        m0 + 4)
    })
test(`Địch rút trúng Nấm: nổ (${HF("teemo",
    "F_MUSH")}) lên tướng máu thấp nhất, rồi vẫn rút 1 lá như thường`,
() => {
    const s = mk({
        A: {
            teemo: 2
        }, B: {
            g5v_tank: 0, g5v_fighter: 1, g5v_mage: 2
        }
    })
    const m = gm(s).newCard({
        kind: "special", id: "mushroom", hero: "teemo", side: "A"
    })
    s.players.B.deck = [m,
        sup(s,
            "gold"),
        sup(s,
            "gold")]
    u(s,
        "B",
        "g5v_mage").hp = 400
    const hp0 = u(s,
        "B",
        "g5v_mage").hp
    gm(s).draw("B",
        1)
    const raw = gm(s).f(u(s,
        "A",
        "teemo"),
    HF("teemo",
        "F_MUSH"))
    assert.equal(hp0 - u(s,
        "B",
        "g5v_mage").hp,
    Math.round(raw * 100 / 130))
    assert.equal(s.players.B.hand.length,
        1,
        "vẫn rút 1 lá")
    assert.ok(!s.players.B.hand.some((c) => c.id === "mushroom"),
        "Nấm không vào tay")
    assert.equal(s.players.B.deck.length,
        1,
        "Nấm và lá bù đều rời bộ")
})
test(`E (Quick): địch đánh Teemo => kẻ đó Mù (đòn trượt) và nhận (${HF("teemo",
    "F_E")}) + (${HF("teemo",
    "F_E_PER")}) mỗi Nấm`,
() => {
    const s = mk({
        A: {
            teemo: 2
        }, B: {
            g5v_fighter: 2
        }
    })
    for (let i = 0; i < 4; i++) s.players.B.deck.push(gm(s).newCard({
        kind: "special", id: "mushroom", hero: "teemo", side: "A"
    }))
    const n = mushrooms(s,
        "B")
    s.active = "B"
    const e = give(s,
        "A",
        skill(s,
            "teemo",
            "A",
            "E"))
    const c = give(s,
        "B",
        sup(s,
            "basic"))
    const o = cg.applyAction(s,
        {
            t: "play", side: "B", uid: c.uid, args: {
                actor: "B:g5v_fighter", target: "A:teemo"
            }
        })
    assert.equal(o.state.phase,
        "chain")
    const o2 = cg.applyAction(o.state,
        {
            t: "chain", side: "A", uid: e.uid, args: {
                target: "B:g5v_fighter"
            }
        })
    const done = settle({
        s: o2.state, ev: [...o.events,
            ...o2.events]
    })
    const g = gm(done.s)
    const raw = g.f(u(done.s,
        "A",
        "teemo"),
    HF("teemo",
        "F_E")) + g.f(u(done.s,
        "A",
        "teemo"),
    HF("teemo",
        "F_E_PER")) * n
    assert.equal(dmgTo(done.ev,
        "B:g5v_fighter"),
    Math.round(raw * 100 / 130),
    "sát thương theo số Nấm")
    assert.equal(dmgTo(done.ev,
        "A:teemo"),
    0,
    "đòn đánh Teemo trượt")
    assert.ok(evs(done.ev,
        "attack").some((a) => a.miss))
})
test("R: mọi Nấm trong bộ bài địch nổ cùng lúc, mỗi Nấm lên tướng máu thấp nhất lúc đó, rồi biến mất",
    () => {
        let s = mk({
            A: {
                teemo: 2
            }, B: {
                g5v_tank: 0, g5v_fighter: 1, g5v_mage: 2
            }
        })
        for (let i = 0; i < 3; i++) s.players.B.deck.push(gm(s).newCard({
            kind: "special", id: "mushroom", hero: "teemo", side: "A"
        }))
        const n = mushrooms(s,
            "B")
        assert.ok(n >= 3)
        u(s,
            "B",
            "g5v_mage").hp = 50
        const r = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "teemo",
                    "A",
                    "R")),
            {
                amount: n, pick: String(n)
            })
        s = r.s
        assert.equal(mushrooms(s,
            "B"),
        0,
        "Nấm biến mất")
        assert.equal(evs(r.ev,
            "damage").filter((d) => d.src === "A:teemo").length,
        n,
        "mỗi Nấm một lần nổ")
        assert.equal(u(s,
            "B",
            "g5v_mage").status,
        "dead",
        "Nấm đầu hạ tướng yếu nhất")
    })

// ======================================================================
G("Vayne")
// ======================================================================
test("Nội tại: nhịn trọn lượt trên bàn +2 Đêm (không trần); ngoài sân hoặc đã tuyên bố đòn đánh thì không cộng",
    () => {
        const s = mk({
            A: {
                vayne: 2
            }, B: {
                g5v_tank: 2
            }
        })
        s.active = "A"
        s.units["A:vayne"].stacks.night = 10
        gm(s).hook("onTurnEnd",
            {
                side: "A"
            })
        assert.equal(stack(s,
            "A",
            "vayne",
            "night"),
        12,
        "không trần 10")
        const away = mk({
            A: {
                vayne: 2
            }
        })
        away.units["A:vayne"].status = "reserve"
        for (let i = 0; i < 3; i++) turnStart(away,
            "A")
        assert.equal(stack(away,
            "A",
            "vayne",
            "night"),
        0,
        "ngoài sân không tích")
        const r = strike(mk({
            A: {
                vayne: 2
            }, B: {
                g5v_tank: 2
            }
        }),
        "A",
        "vayne",
        "B:g5v_tank")
        gm(r.s).hook("onTurnEnd",
            {
                side: "A"
            })
        assert.equal(stack(r.s,
            "A",
            "vayne",
            "night"),
        0,
        "đã đánh thì không được thưởng nhịn")
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
test("Q: swap với đồng minh, thành công mới Tàng Hình + 2 Đêm và không mất thưởng nhịn; E: bắn nền + tiêu tối đa 2 Đêm × 1,5",
    () => {
        let s = mk({
            A: {
                vayne: 2, g5v_tank: 4
            }, B: {
                g5v_tank: 2
            }
        })
        s.active = "A"
        s = play(s,
            "A",
            give(s,
                "A",
                skill(s,
                    "vayne",
                    "A",
                    "Q")),
            {
                target: "A:g5v_tank"
            }).s
        assert.equal(u(s,
            "A",
            "vayne").lane,
        4)
        assert.equal(u(s,
            "A",
            "g5v_tank").lane,
        2)
        assert.ok(u(s,
            "A",
            "vayne").statuses.stealth)
        assert.equal(stack(s,
            "A",
            "vayne",
            "night"),
        2)
        gm(s).hook("onTurnEnd",
            {
                side: "A"
            })
        assert.equal(stack(s,
            "A",
            "vayne",
            "night"),
        4,
        "Q không chặn thưởng nhịn")
        const sE = mk({
            A: {
                vayne: 2
            }, B: {
                g5v_tank: 2
            }
        })
        sE.active = "A"
        sE.units["A:vayne"].stacks.night = 5
        const v = u(sE,
            "A",
            "vayne")
        const r = play(sE,
            "A",
            give(sE,
                "A",
                skill(sE,
                    "vayne",
                    "A",
                    "E")))
        assert.equal(stack(r.s,
            "A",
            "vayne",
            "night"),
        3,
        "E tiêu 2 Đêm")
        assert.equal(dmgTo(r.ev,
            "B:g5v_tank",
            "skill"),
        Math.round(gm(sE).f(v,
            VAYNE.F_E_BASE) * (100 / 130)))
        assert.equal(evs(r.ev,
            "damage").filter((d) => d.kind === "true" && d.target === "B:g5v_tank").reduce((x, d) => x + d.amount,
            0),
        Math.round(2 * 1.5 * gm(sE).f(v,
            VAYNE.F_NIGHT)))
        gm(r.s).hook("onTurnEnd",
            {
                side: "A"
            })
        assert.equal(stack(r.s,
            "A",
            "vayne",
            "night"),
        3,
        "E là chiêu gây sát thương: mất thưởng nhịn")
    })
test("R: bắn nền vật lý + tiêu hết Đêm, mỗi Đêm (30 + 73% AD + 10% AP) chuẩn; không cần Đêm để dùng",
    () => {
        const s = mk({
            A: {
                vayne: 2
            }, B: {
                g5v_tank: 2
            }
        })
        s.active = "A"
        const r0 = give(s,
            "A",
            skill(s,
                "vayne",
                "A",
                "R"))
        assert.ok(cg.legalActions(s,
            "A").some((a) => a.t === "play" && a.uid === r0.uid),
        "không Đêm vẫn dùng được R")
        s.units["A:vayne"].stacks.night = 3
        const v = u(s,
            "A",
            "vayne")
        const r = play(s,
            "A",
            r0)
        assert.equal(stack(r.s,
            "A",
            "vayne",
            "night"),
        0)
        assert.equal(dmgTo(r.ev,
            "B:g5v_tank",
            "skill"),
        Math.round(gm(s).f(v,
            VAYNE.F_R) * (100 / 130)))
        assert.equal(evs(r.ev,
            "damage").filter((d) => d.kind === "true").reduce((x, d) => x + d.amount,
            0),
        Math.round(3 * gm(s).f(v,
            VAYNE.F_R_NIGHT)))
    })

test("Vayne là Sát thủ vật lý với chỉ số V3; đòn đánh tiêu Đêm cộng (24 + 59% AD + 8% AP) sát thương chuẩn",
    () => {
        const h = cg.getHero("vayne")!
        assert.equal(h.role,
            "assassin")
        assert.equal(h.atk,
            AD("vayne"))
        assert.equal(h.hp,
            cg.getHero("vayne")!.hp)
        const s = mk({
            A: {
                vayne: 2
            }, B: {
                g5v_tank: 2
            }
        })
        s.units["A:vayne"].stacks.night = 2
        const r = strike(s,
            "A",
            "vayne",
            "B:g5v_tank")
        const v = u(s,
            "A",
            "vayne")
        assert.equal(evs(r.ev,
            "damage").filter((d) => d.kind === "true" && d.target === "B:g5v_tank").reduce((x, d) => x + d.amount,
            0),
        Math.round(gm(s).f(v,
            VAYNE.F_NIGHT)))
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
