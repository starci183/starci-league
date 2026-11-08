// Test bộ chiêu Azir, Lính Cát và cặp tương tác với Malphite, Sylas, Mel. Chạy: npx tsx scripts/card_tests_kits_azir.ts [--only=lính] [--verbose]
// Mọi kỳ vọng tính từ cg.kit(id).p và chỉ số engine, nên sửa balance/heroes/*.json không làm vỡ test.
import assert from "node:assert/strict"
import {
    cg
} from "@starci/shared"
import {
    G, act, basic, cast, dmgOn, gm, mk, report, skill, sup, test, u,
    type Act, type Ev, type S, type St
} from "./kit_test_util"

Object.assign(cg.kit("sylas").raw.flags,
    {
        stealOnlyR: false, stealToHand: true
    }) // các test này phủ đường đoạt Q, E và lá lên tay
const kz = cg.kit("azir"), p = kz.p
const SOLDIERS = "azir_soldiers"
const mit = (raw: number, def: number) => Math.round(raw * 100 / (100 + def))
const mr = (s: St, side: S, h: string) => gm(s).mr(u(s,
    side,
    h))
const tank = (s: St, side: S, hero: string) => { const x = u(s,
    side,
    hero); x.maxHp = x.hp = 9000 }
const boost = (s: St, side: S, hero: string, ap: number) => gm(s).status(u(s,
    side,
    hero),
"ap_up",
30,
{
    v: ap, of: side
})
const put = (s: St, side: S, hero: string, n: number) => gm(s).setLaneStack(side,
    u(s,
        side,
        hero).lane,
    SOLDIERS,
    n)
const held = (s: St, side: S, hero: string) => gm(s).laneStackOf(side,
    u(s,
        side,
        hero).lane,
    SOLDIERS)
type ChainAct = Extract<Act, { t: "chain" }>
type PlayAct = Extract<Act, { t: "play" }>
function passAll(s0: St, ev0: Ev = []): { s: St; ev: Ev } {
    let s = s0
    const ev = [...ev0]
    while (s.phase === "chain" && s.chain) {
        const r = act(s,
            {
                t: "pass", side: s.chain.priority
            })
        s = r.s
        ev.push(...r.ev)
    }
    return {
        s, ev
    }
}
const stabs = (ev: Ev) => ev.filter((e) => e.t === "damage" && e.visuals?.includes("azirStab"))
const playable = (s: St, c: cg.Card) => cg.legalActions(s,
    "A").some((a) => a.t === "play" && a.uid === c.uid)
/** Azir đường 2, Ashe đường 1, Ornn đường 3; mọi đường địch có người nhiều Máu */
function line() {
    const s = mk({
        A: {
            azir: 2, ashe: 1, ornn: 3
        }, B: {
            garen: 2, braum: 1, zed: 3, teemo: 4, viktor: 0
        }
    })
    for (const h of ["garen",
        "braum",
        "zed",
        "teemo",
        "viktor"]) tank(s,
        "B",
        h)
    return s
}

G("Azir E: Lính Cát")
test("gọi 1 Lính lên ô đồng minh là stack, không có token",
    () => {
        const s = line()
        const r = cast(s,
            "A",
            skill(s,
                "azir",
                "A",
                "E"),
            {
                target: "A:ashe"
            })
        assert.equal(held(r.s,
            "A",
            "ashe"),
        1)
        assert.equal(gm(r.s).tokenOf("A"),
            undefined)
    })
test("gọi lên chính Azir được, nhiều Lính trên 1 ô được",
    () => {
        const s = line()
        let t = cast(s,
            "A",
            skill(s,
                "azir",
                "A",
                "E"),
            {
                target: "A:azir"
            }).s
        t = cast(t,
            "A",
            skill(t,
                "azir",
                "A",
                "E"),
            {
                target: "A:azir"
            }).s
        assert.equal(held(t,
            "A",
            "azir"),
        2)
    })
test("đủ p1 Lính cả phe thì E không dùng được",
    () => {
        const s = line()
        put(s,
            "A",
            "ashe",
            p.p1)
        const c = skill(s,
            "azir",
            "A",
            "E")
        s.players.A.hand.push(c)
        assert.ok(!playable(s,
            c))
    })
test("Lính không hết hạn",
    () => {
        const s = line()
        put(s,
            "A",
            "ashe",
            2)
        let t = s
        for (let i = 0; i < 8; i++) t = act(t,
            {
                t: "end", side: t.active
            }).s
        assert.equal(held(t,
            "A",
            "ashe"),
        2)
    })
test("tướng giữ ô chết không mất Lính; Azir chết mất nửa tổng, ưu tiên ô số nhỏ",
    () => {
        const s = line()
        put(s,
            "A",
            "ashe",
            3)
        put(s,
            "A",
            "ornn",
            2)
        gm(s).kill(u(s,
            "A",
            "ashe"))
        assert.equal(held(s,
            "A",
            "ashe"),
        3)
        gm(s).kill(u(s,
            "A",
            "azir"))
        assert.equal(held(s,
            "A",
            "ashe"),
        1)
        assert.equal(held(s,
            "A",
            "ornn"),
        1)
    })

test("Lính ở nguyên ô khi tướng đổi chỗ; ô đồng minh trống vẫn đâm",
    () => {
        const s = line(), g = gm(s), ashe = u(s,
            "A",
            "ashe")
        put(s,
            "A",
            "ashe",
            2)
        g.moveTo(ashe,
            0)
        assert.equal(g.laneStackOf("A",
            1,
            SOLDIERS),
        2)
        assert.equal(g.laneStackOf("A",
            0,
            SOLDIERS),
        0)
        assert.ok(stabs(basic(s,
            "A",
            "A:azir",
            "B:garen").ev).some(e => e.t === "damage" && e.target === "B:braum"))
    })

test("Azir chết: tổng Lính lẻ ở nhiều ô chỉ làm tròn một lần",
    () => {
        const s = line(), g = gm(s)
        for (let lane = 0; lane < 5; lane++) g.setLaneStack("A",
            lane,
            SOLDIERS,
            1)
        g.kill(u(s,
            "A",
            "azir"))
        assert.deepEqual([0,
            1,
            2,
            3,
            4].map(lane => g.laneStackOf("A",
            lane,
            SOLDIERS)),
        [1,
            1,
            0,
            0,
            0])
    })

test("mỗi Lính cả phe cho Azir p3 Tốc Đánh",
    () => {
        const s = line()
        put(s,
            "A",
            "ashe",
            2)
        put(s,
            "A",
            "ornn",
            1)
        assert.equal(gm(s).attackSpeed(u(s,
            "A",
            "azir")),
        cg.RULES.baseAttackSpeed + 3 * p.p3)
    })

G("Lính đâm khi Azir đánh")
test("đòn thường của Azir gây phép và thêm p8·AP",
    () => {
        const hit = (ap: number) => {
            const s = line()
            boost(s,
                "A",
                "azir",
                ap)
            gm(s).status(u(s,
                "A",
                "azir"),
            "attack_speed",
            30,
            {
                v: 100 - gm(s).attackSpeed(u(s,
                    "A",
                    "azir")), of: "A"
            })
            return {
                dealt: dmgOn(basic(s,
                    "A",
                    "A:azir",
                    "B:garen").ev,
                "B:garen"), def: mr(s,
                    "B",
                    "garen")
            }
        }
        const a = hit(0), b = hit(200)
        assert.ok(Math.abs(b.dealt - a.dealt - mit(p.p8 * 200,
            a.def)) <= 1)
    })
test("Azir đánh trúng: Lính đâm địch đối diện ô, scale AP và Tốc Đánh, Lính cùng ô gộp",
    () => {
        const s = line()
        put(s,
            "A",
            "ashe",
            2)
        put(s,
            "A",
            "ornn",
            1)
        boost(s,
            "A",
            "azir",
            100)
        const me = u(s,
            "A",
            "azir")
        const expected = gm(s).f(me,
            kz.x("p4 + p5·AP + p6·Tốc Đánh"))
        const hits = Math.floor(gm(s).attackSpeed(me) / 100)
        const r = basic(s,
            "A",
            "A:azir",
            "B:garen")
        assert.ok(stabs(r.ev).length >= 2 * hits)
        const one = stabs(r.ev).find((e) => e.t === "damage" && e.target === "B:zed")
        assert.equal(one?.t === "damage" && one.amount,
            mit(expected,
                mr(s,
                    "B",
                    "zed")))
        const two = stabs(r.ev).find((e) => e.t === "damage" && e.target === "B:braum")
        assert.equal(two?.t === "damage" && two.amount,
            mit(expected * 2,
                mr(s,
                    "B",
                    "braum")))
        assert.ok(stabs(r.ev).every((e) => e.t === "damage" && e.tag === "effect" && e.kind === "magic"),
            "sát thương hiệu ứng phép")
    })
test("đòn đánh của Azir gây phép; đồng minh đánh thì Lính không đâm",
    () => {
        const s = line()
        put(s,
            "A",
            "azir",
            1)
        const r = basic(s,
            "A",
            "A:azir",
            "B:garen")
        assert.ok(r.ev.some((e) => e.t === "damage" && e.target === "B:garen" && e.tag === "attack" && e.kind === "magic"))
        const s2 = line()
        put(s2,
            "A",
            "ornn",
            1)
        assert.equal(stabs(basic(s2,
            "A",
            "A:ashe",
            "B:braum").ev).length,
        0)
    })
test("ô không có địch đối diện thì không đâm; tướng giữ ô chết Lính vẫn đâm",
    () => {
        const s = line()
        put(s,
            "A",
            "ornn",
            2)
        put(s,
            "A",
            "ashe",
            2)
        gm(s).kill(u(s,
            "B",
            "zed"))
        gm(s).kill(u(s,
            "A",
            "ashe"))
        assert.equal(stabs(basic(s,
            "A",
            "A:azir",
            "B:garen").ev).length,
        1)
    })
test("đòn trượt không đâm; Azir Mù không có lựa chọn đánh",
    () => {
        const s = line()
        put(s,
            "A",
            "ashe",
            1)
        gm(s).status(u(s,
            "A",
            "azir"),
        "blind",
        1,
        {
            of: "A"
        })
        const c = sup(s,
            "basic")
        s.players.A.hand.push(c)
        assert.ok(!cg.legalActions(s,
            "A").some((a) => a.t === "play" && a.uid === c.uid && a.args?.actor === "A:azir"))
        const s2 = line()
        put(s2,
            "A",
            "ashe",
            1)
        const g = gm(s2)
        cg.getHero("azir")!.hooks!.onAttackHit!(g,
            u(s2,
                "A",
                "azir"),
            {
                attacker: u(s2,
                    "A",
                    "azir"), target: u(s2,
                    "B",
                    "garen"), dealt: 0, info: {
                        miss: true
                    } as cg.AttackInfo
            })
        assert.equal(stabs(g.events).length,
            0)
    })
test("nhát đâm không kích hiệu ứng trúng đòn của đồ",
    () => {
        const s = line()
        put(s,
            "A",
            "ashe",
            1)
        put(s,
            "A",
            "ornn",
            1)
        gm(s).status(u(s,
            "A",
            "azir"),
        "attack_speed",
        30,
        {
            v: -100, of: "A"
        })
        gm(s).equip(u(s,
            "A",
            "azir"),
        "cuong_dao")
        const r = basic(s,
            "A",
            "A:azir",
            "B:garen")
        const key = Object.keys(u(r.s,
            "A",
            "azir").stacks).find((x) => x.includes("cuong_dao"))
        assert.ok(key,
            "đồ có bộ đếm")
        assert.ok(u(r.s,
            "A",
            "azir").stacks[key] <= r.ev.filter((e) => e.t === "damage" && e.tag === "attack").length,
        "chỉ đòn đánh cộng")
    })
test("Malphite Liên Kết: nhát đâm chia đều như sát thương đơn mục tiêu",
    () => {
        const s = mk({
            A: {
                azir: 2, ashe: 1
            }, B: {
                malphite: 2, garen: 1
            }
        })
        for (const h of ["malphite",
            "garen"]) tank(s,
            "B",
            h)
        put(s,
            "A",
            "ashe",
            1)
        const g = gm(s)
        for (const h of ["malphite",
            "garen"]) g.status(u(s,
            "B",
            h),
        "stone_link",
        1,
        {
            until: cg.FOREVER, src: "B:malphite"
        })
        const stab = stabs(basic(s,
            "A",
            "A:azir",
            "B:malphite").ev)
        assert.deepEqual(new Set(stab.map((e) => e.t === "damage" ? e.target : "")),
            new Set(["B:malphite",
                "B:garen"]))
    })

G("Azir Q")
test("mọi Lính đâm 1 kẻ, sát thương theo số Lính và AP",
    () => {
        const s = line()
        put(s,
            "A",
            "ashe",
            2)
        put(s,
            "A",
            "ornn",
            1)
        boost(s,
            "A",
            "azir",
            100)
        gm(s).status(u(s,
            "A",
            "azir"),
        "attack_speed",
        30,
        {
            v: 100 - gm(s).attackSpeed(u(s,
                "A",
                "azir")), of: "A"
        })
        const r = cast(s,
            "A",
            skill(s,
                "azir",
                "A",
                "Q"),
            {
                target: "B:teemo"
            })
        assert.equal(dmgOn(r.ev,
            "B:teemo"),
        mit((p.q1 + p.q2 * 100) * 3,
            mr(s,
                "B",
                "teemo")))
    })
test("số nhát theo Tốc Đánh: 300 Tốc Đánh đâm 3 nhát",
    () => {
        const s = line()
        put(s,
            "A",
            "azir",
            1)
        gm(s).status(u(s,
            "A",
            "azir"),
        "attack_speed",
        30,
        {
            v: 300 - gm(s).attackSpeed(u(s,
                "A",
                "azir")), of: "A"
        })
        const r = cast(s,
            "A",
            skill(s,
                "azir",
                "A",
                "Q"),
            {
                target: "B:teemo"
            })
        assert.equal(r.ev.filter((e) => e.t === "damage" && e.target === "B:teemo").length,
            3)
    })
test("không có Lính trên sân thì Q, R không dùng được",
    () => {
        const s = line()
        for (const key of ["Q",
            "R"] as const) {
            const c = skill(s,
                "azir",
                "A",
                key)
            s.players.A.hand.push(c)
            assert.ok(!playable(s,
                c),
            key)
        }
    })

G("Azir R")
test("mọi Lính đâm 1 nhát địch trước mặt ô, đúng số Lính, địch khác không dính",
    () => {
        const s = line()
        put(s,
            "A",
            "ashe",
            2)
        put(s,
            "A",
            "azir",
            1)
        boost(s,
            "A",
            "azir",
            100)
        const r = cast(s,
            "A",
            skill(s,
                "azir",
                "A",
                "R"))
        const raw = p.r1 + p.r2 * 100
        assert.equal(dmgOn(r.ev,
            "B:braum"),
        mit(raw * 2,
            mr(s,
                "B",
                "braum")))
        assert.equal(dmgOn(r.ev,
            "B:garen"),
        mit(raw,
            mr(s,
                "B",
                "garen")))
        assert.equal(dmgOn(r.ev,
            "B:zed"),
        0)
    })

G("Azir nội tại")
const freeE = (s: St) => s.players.A.hand.filter((c) => c.id === "azir_e" && c.temp)
const hitOnce = (s: St) => basic(s,
    "A",
    "A:ashe",
    "B:braum")
function rally() {
    const s = line()
    gm(s).status(u(s,
        "A",
        "ashe"),
    "attack_speed",
    30,
    {
        v: 100 - gm(s).attackSpeed(u(s,
            "A",
            "ashe")), of: "A"
    })
    return s
}
test("đồng đội đánh trúng đủ p2 phát: nhận 1 lá E tạm, không tốn mana, đếm lại từ đầu",
    () => {
        let s = rally()
        for (let i = 1; i < p.p2; i++) {
            s = hitOnce(s).s
            assert.equal(freeE(s).length,
                0)
        }
        s = hitOnce(s).s
        const cards = freeE(s)
        assert.equal(cards.length,
            1)
        assert.equal(u(s,
            "A",
            "azir").stacks.azir_call,
        0)
        const before = s.teamMana.A
        const r = cast(s,
            "A",
            cards[0],
            {
                target: "A:ashe"
            })
        assert.equal(r.s.teamMana.A,
            before,
            "không tốn mana")
        assert.equal(held(r.s,
            "A",
            "ashe"),
        1)
    })
test("đòn của chính Azir không tính",
    () => {
        const s = line()
        const r = basic(s,
            "A",
            "A:azir",
            "B:garen")
        assert.equal(u(r.s,
            "A",
            "azir").stacks.azir_call ?? 0,
        0)
    })
test("Azir không còn đỡ chết bằng Lính",
    () => {
        const s = line()
        put(s,
            "A",
            "ashe",
            2)
        gm(s).damage(undefined,
            u(s,
                "A",
                "azir"),
            99999,
            "true",
            {
                tag: "effect"
            })
        assert.equal(u(s,
            "A",
            "azir").status,
        "dead")
        assert.equal(held(s,
            "A",
            "ashe"),
        1)
    })

G("Cặp với Sylas và Mel")
/** Sylas (A) dùng R đoạt `key` của Azir bên B */
function steal(s0: St, key: "Q" | "E" | "R"): { s: St; card: cg.Card } {
    const c = skill(s0,
        "sylas",
        "A",
        "R")
    s0.players.A.hand.push(c)
    const opt = (cg.legalActions(s0,
        "A").filter((a) => a.t === "play" && a.uid === c.uid) as PlayAct[]).find((a) => a.args?.pick === `steal:azir:${key}`)
    assert.ok(opt,
        `không có Azir ${key}`)
    const { s } = passAll(act(s0,
        opt).s)
    const card = s.players.A.hand.find((x) => x.id === `azir_${key.toLowerCase()}` && x.data?.stolen)
    assert.ok(card)
    return {
        s, card
    }
}
const sylasBoard = () => {
    const s = mk({
        A: {
            sylas: 2, soraka: 1
        }, B: {
            azir: 2, garen: 1
        }
    })
    tank(s,
        "B",
        "azir")
    tank(s,
        "B",
        "garen")
    return s
}
test("Sylas đoạt Azir E: Lính lên đồng minh Sylas, đâm theo đòn của Sylas, Azir địch không đâm",
    () => {
        const st = steal(sylasBoard(),
            "E")
        const r = passAll(act(st.s,
            {
                t: "play", side: "A", uid: st.card.uid, args: {
                    target: "A:soraka"
                }
            }).s)
        assert.equal(held(r.s,
            "A",
            "soraka"),
        1)
        const b = basic(r.s,
            "A",
            "A:sylas",
            "B:azir")
        assert.ok(stabs(b.ev).length >= 1,
            "Lính của Sylas đâm Garen")
        assert.equal(stabs(b.ev)[0].t === "damage" && stabs(b.ev)[0].src,
            "A:sylas")
    })
test("Sylas không nhận Tốc Đánh theo Lính; chưa có Lính thì không đoạt được Q, R",
    () => {
        const s = sylasBoard()
        assert.throws(() => steal(structuredClone(s),
            "Q"),
        /không có Azir Q/)
        assert.throws(() => steal(structuredClone(s),
            "R"),
        /không có Azir R/)
        put(s,
            "A",
            "soraka",
            2)
        assert.equal(gm(s).attackSpeed(u(s,
            "A",
            "sylas")),
        cg.RULES.baseAttackSpeed)
    })
test("Sylas luật hiện tại chỉ đoạt R và tung ngay từ Lính thuộc ô của phe mình",
    () => {
        const flags = cg.kit("sylas").raw.flags
        const oldOnly = flags.stealOnlyR, oldHand = flags.stealToHand
        Object.assign(flags,
            {
                stealOnlyR: true, stealToHand: false
            })
        try {
            const s = sylasBoard(), g = gm(s)
            g.setLaneStack("A",
                1,
                SOLDIERS,
                2)
            const c = skill(s,
                "sylas",
                "A",
                "R")
            s.players.A.hand.push(c)
            const choices = cg.legalActions(s,
                "A").filter((a): a is PlayAct => a.t === "play" && a.uid === c.uid && a.args?.target === "B:azir")
            assert.equal(choices.length,
                1)
            assert.equal(choices[0].args?.pick,
                "steal:azir:R")
            const r = act(s,
                    choices[0]), resolved = passAll(r.s,
                    r.ev)
            assert.ok(dmgOn(resolved.ev,
                "B:garen") > 0)
            assert.equal(resolved.s.players.A.hand.some(card => card.id === "azir_r"),
                false)
            assert.equal(gm(resolved.s).laneStackOf("A",
                1,
                SOLDIERS),
            2)
        } finally { Object.assign(flags,
            {
                stealOnlyR: oldOnly, stealToHand: oldHand
            }) }
    })

test("Mel E phản Azir Q: Q nhắm đơn, sát thương giảm, Azir nhận lại",
    () => {
        const km = cg.kit("mel").p
        const s = mk({
            A: {
                azir: 2
            }, B: {
                mel: 1, garen: 2
            }
        })
        tank(s,
            "B",
            "mel")
        tank(s,
            "B",
            "garen")
        tank(s,
            "A",
            "azir")
        put(s,
            "A",
            "azir",
            1)
        s.players.B.hand.push(skill(s,
            "mel",
            "B",
            "E"))
        gm(s).status(u(s,
            "A",
            "azir"),
        "attack_speed",
        30,
        {
            v: 100 - gm(s).attackSpeed(u(s,
                "A",
                "azir")), of: "A"
        })
        const open = cast(s,
            "A",
            skill(s,
                "azir",
                "A",
                "Q"),
            {
                target: "B:garen"
            },
            false)
        const opt = cg.legalActions(open.s,
            "B").filter((a) => a.t === "chain") as ChainAct[]
        assert.equal(opt.length,
            1,
            "Mel E nối được")
        const r0 = act(open.s,
            opt[0])
        const r = passAll(r0.s,
            r0.ev)
        assert.equal(dmgOn(r.ev,
            "B:garen"),
        mit(p.q1 * (1 - km.e1 / 100),
            mr(s,
                "B",
                "garen")))
        assert.ok(dmgOn(r.ev,
            "A:azir") > 0,
        "Azir nhận lại")
    })
test("Azir R đánh cả phe nên Mel E không nối",
    () => {
        const s = mk({
            A: {
                azir: 2
            }, B: {
                mel: 1, garen: 2
            }
        })
        put(s,
            "A",
            "azir",
            1)
        s.players.B.hand.push(skill(s,
            "mel",
            "B",
            "E"))
        const r = cast(s,
            "A",
            skill(s,
                "azir",
                "A",
                "R"),
            {
            },
            false)
        assert.equal(r.s.phase === "chain" ? (cg.legalActions(r.s,
            "B").filter((a) => a.t === "chain")).length : 0,
        0)
    })

report()
