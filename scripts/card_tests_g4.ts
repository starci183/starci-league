// Test cơ chế đặc trưng nhóm G4: Kog'Maw, Jinx, Ashe, Lux, Ahri, Annie, Lissandra, Gangplank.
// Chạy: npx tsx scripts/card_tests_g4.ts [--only=chuỗi] [--verbose]. Khung test chép từ scripts/card_tests.ts.
import assert from "node:assert/strict"
import {
    cg, combine
} from "@starci/shared"

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
// Trợ giúp dựng tình huống
// ======================================================================
const SEED = 20260404
const FILL = ["kogmaw",
    "jinx",
    "ashe",
    "lux",
    "ahri",
    "annie",
    "lissandra",
    "gangplank"]
/** Dựng ván: tướng chỉ định ra sân thẳng vào đường, vòng 8 (mở hết đường). Đội bù bằng tướng G4 khác (để dự bị). */
function mk(A: Record<string, number>, B: Record<string, number>): St {
    const fill = (x: string[]) => [...x,
        ...FILL.filter((h) => !x.includes(h))].slice(0,
        5)
    const s = cg.newGame(SEED,
        fill(Object.keys(A)),
        fill(Object.keys(B)))
    s.round = 8
    const g = new Game(s)
    for (const [side,
        m] of [["A",
            A],
        ["B",
            B]] as const) for (const [h,
        lane] of Object.entries(m)) g.summon(side,
        h,
        lane)
    s.players.A.hand = []
    s.players.B.hand = []
    s.phase = "main"; s.opened = {
        A: true, B: true
    } // bỏ qua bước gọi tướng + tay đầu: test tự dựng tay
    return s
}
const gm = (s: St) => new Game(s)
const u = (s: St, side: S, hero: string) => s.units[`${side}:${hero}`]
const skill = (s: St, hero: string, side: S, k: cg.SkillKey) => gm(s).skillCard(hero,
    side,
    k)
const sup = (s: St, id: cg.SupportId) => gm(s).supportCard(id)
function give(s: St, side: S, ...cards: cg.Card[]) { s.players[side].hand.push(...cards); return cards[0] }
function act(s: St, a: Act): { s: St; ev: Ev } { const r = cg.applyAction(s,
    a); return {
    s: r.state, ev: r.events
} }
function play(s: St, side: S, card: { uid: string }, args: cg.PlayArgs = {
}) { return act(s,
    {
        t: "play", side, uid: card.uid, args
    }) }
const end = (s: St) => {
    // kết thúc lượt; lượt mới bắt đầu ở bước gọi tướng: test tự bấm "rút bài" (không gọi thêm tướng)
    const r = act(s,
        {
            t: "end", side: s.active
        })
    if (r.s.phase !== "summon") return r
    const d = act(r.s,
        {
            t: "draw", side: r.s.active
        })
    return {
        s: d.s, ev: [...r.ev,
            ...d.ev]
    }
}
const toTurn = (s: St, side: S) => { while (s.active !== side) s = end(s).s; return s }
const evs = <T extends cg.GameEvent["t"]>(ev: Ev, t: T) => ev.filter((e) => e.t === t) as Extract<cg.GameEvent, { t: T }>[]
const dmgTo = (ev: Ev, target: string, tag?: string) => evs(ev,
    "damage").filter((d) => d.target === target && (!tag || d.tag === tag)).reduce((x, d) => x + d.amount,
    0)
const item = () => combine("kiem_dai",
    "kiem_dai")!
/** Bỏ qua cho tới khi chuỗi giải quyết xong */
function passAll(s: St): { s: St; ev: Ev } {
    const ev: Ev = []
    for (let i = 0; s.phase === "chain" && s.chain && i < 20; i++) { const r = act(s,
        {
            t: "pass", side: s.chain.priority
        }); s = r.s; ev.push(...r.ev) }
    return {
        s, ev
    }
}

// ======================================================================
G("Kog'Maw")
// ======================================================================
test("Đồng đội gục +1 Kog Stack; Kog gục +2 và nổ sát thương chuẩn lên mọi tướng địch",
    () => {
        const s = mk({
            kogmaw: 2, jinx: 1
        },
        {
            ashe: 2, lux: 1
        })
        const g = gm(s)
        g.kill(u(s,
            "A",
            "jinx"),
        u(s,
            "B",
            "ashe"))
        assert.equal(u(s,
            "A",
            "kogmaw").stacks.kog,
        1)
        const before = u(s,
            "B",
            "lux").hp
        g.kill(u(s,
            "A",
            "kogmaw"),
        u(s,
            "B",
            "ashe"))
        assert.equal(u(s,
            "A",
            "kogmaw").stacks.kog,
        3)
        const burst = evs(g.events,
            "damage").filter((d) => d.target === "B:lux" && d.kind === "true")
        assert.ok(burst.length === 1 && u(s,
            "B",
            "lux").hp < before,
        "Lux phải trúng vụ nổ")
    })
test("Q: đội ít mạng hơn thì Rã giáp mọi tướng địch; R nạp lại khi mục tiêu Rã giáp",
    () => {
        let s = mk({
            kogmaw: 2
        },
        {
            ashe: 2, lux: 1
        })
        s.players.A.lives = 5
        const q = give(s,
            "A",
            skill(s,
                "kogmaw",
                "A",
                "Q"))
        s = play(s,
            "A",
            q,
            {
                target: "B:ashe"
            }).s
        assert.ok(u(s,
            "B",
            "lux").statuses.shred && u(s,
            "B",
            "ashe").statuses.shred)
        const r = give(s,
            "A",
            skill(s,
                "kogmaw",
                "A",
                "R"))
        s = play(s,
            "A",
            r,
            {
                target: "B:lux"
            }).s
        assert.ok(s.players.A.hand.some((c) => c.uid === r.uid),
            "R phải về tay")
        assert.ok(!u(s,
            "B",
            "lux").statuses.shred,
        "Rã giáp bị tiêu")
    })

// ======================================================================
G("Jinx")
// ======================================================================
test("Hạ gục trong lượt mình: Phấn Khích, rút 1, đòn kế miễn phí",
    () => {
        let s = mk({
            jinx: 2
        },
        {
            ashe: 2, lux: 1
        })
        u(s,
            "B",
            "ashe").hp = 1
        const q = give(s,
            "A",
            skill(s,
                "jinx",
                "A",
                "Q"))
        const r = play(s,
            "A",
            q,
            {
                target: "B:ashe"
            })
        s = r.s
        assert.ok(u(s,
            "A",
            "jinx").statuses.excited,
        "Phấn Khích")
        assert.ok(evs(r.ev,
            "draw").some((d) => d.reason === "skill"),
        "rút 1")
        assert.ok(cg.legalActions(s,
            "A").some((a) => a.t === "attack" && a.actor === "A:jinx"),
        "có đòn miễn phí")
    })
test("Q: mỗi món đồ thêm 1 tên lửa lên tướng địch khác; E tìm lá Đánh thường",
    () => {
        let s = mk({
            jinx: 2
        },
        {
            ashe: 2, lux: 1, annie: 3
        })
        u(s,
            "A",
            "jinx").items = [item(),
            item()]
        const q = give(s,
            "A",
            skill(s,
                "jinx",
                "A",
                "Q"))
        const r = play(s,
            "A",
            q,
            {
                target: "B:ashe"
            })
        assert.ok(dmgTo(r.ev,
            "B:lux") > 0 && dmgTo(r.ev,
            "B:annie") > 0,
        "2 tên lửa phụ")
        s = r.s
        const e = give(s,
            "A",
            skill(s,
                "jinx",
                "A",
                "E"))
        const n = s.players.A.hand.filter((c) => c.id === "basic").length
        s = play(s,
            "A",
            e).s
        assert.equal(s.players.A.hand.filter((c) => c.id === "basic").length,
            n + 2)
    })

// ======================================================================
G("Ashe")
// ======================================================================
test("Đòn đánh gây Buốt; cuối lượt mỗi tướng địch Buốt đẩy lá chiêu trên cùng bộ địch xuống đáy",
    () => {
        let s = mk({
            ashe: 2
        },
        {
            lux: 2
        })
        const st = give(s,
            "A",
            sup(s,
                "basic"))
        s = play(s,
            "A",
            st,
            {
                actor: "A:ashe", target: "B:lux"
            }).s
        assert.ok(u(s,
            "B",
            "lux").statuses.chill,
        "Buốt")
        const top = skill(s,
            "lux",
            "B",
            "Q")
        s.players.B.deck.unshift(top)
        s = end(s).s
        assert.equal(s.players.B.deck.at(-1)?.uid,
            top.uid)
        assert.ok(!s.players.B.hand.some((c) => c.uid === top.uid))
    })
test("E soi 3 lá: lá chiêu xuống đáy, lá khác ở trên; đẩy 2 lá thì rút 1. R Choáng 2 lượt khi Buốt",
    () => {
        let s = mk({
            ashe: 2
        },
        {
            lux: 2
        })
        const a = skill(s,
                "lux",
                "B",
                "Q"), b = sup(s,
                "gold"), c = skill(s,
                "lux",
                "B",
                "E")
        s.players.B.deck.unshift(a,
            b,
            c)
        const e = give(s,
            "A",
            skill(s,
                "ashe",
                "A",
                "E"))
        const r = play(s,
            "A",
            e,
            {
                target: "B:lux"
            })
        s = r.s
        assert.equal(s.players.B.deck[0].uid,
            b.uid)
        assert.deepEqual(s.players.B.deck.slice(-2).map((x) => x.uid),
            [a.uid,
                c.uid])
        assert.ok(evs(r.ev,
            "draw").length === 1)
        const rr = give(s,
            "A",
            skill(s,
                "ashe",
                "A",
                "R"))
        give(s,
            "B",
            skill(s,
                "lux",
                "B",
                "Q"))
        s = play(s,
            "A",
            rr,
            {
                target: "B:lux"
            }).s
        assert.equal(u(s,
            "B",
            "lux").statuses.stun.until,
        gm(s).turnsUntil("B",
            2))
        assert.ok(!s.players.B.hand.some((x) => x.kind === "skill"),
            "lá chiêu trên tay bị đẩy xuống đáy bộ")
    })

// ======================================================================
G("Lux")
// ======================================================================
test("Chiêu gắn dấu; đồng minh đánh trúng thì dấu nổ (Lux gây thêm)",
    () => {
        let s = mk({
            lux: 2, jinx: 1
        },
        {
            ashe: 2
        })
        const q = give(s,
            "A",
            skill(s,
                "lux",
                "A",
                "Q"))
        s = play(s,
            "A",
            q,
            {
                targets: ["B:ashe"]
            }).s
        assert.ok(u(s,
            "B",
            "ashe").statuses.illum)
        const st = give(s,
            "A",
            sup(s,
                "basic"))
        const r = play(s,
            "A",
            st,
            {
                actor: "A:jinx", target: "B:ashe"
            })
        assert.ok(evs(r.ev,
            "damage").some((d) => d.src === "A:lux" && d.tag === "effect"),
        "dấu nổ")
        assert.ok(!u(r.s,
            "B",
            "ashe").statuses.illum)
    })
test("Q lên tướng đã có dấu thì Choáng; R kích nổ gấp đôi mọi dấu",
    () => {
        let s = mk({
            lux: 2
        },
        {
            ashe: 2, annie: 1
        })
        gm(s).status(u(s,
            "B",
            "ashe"),
        "illum",
        2)
        const q = give(s,
            "A",
            skill(s,
                "lux",
                "A",
                "Q"))
        s = play(s,
            "A",
            q,
            {
                targets: ["B:ashe"]
            }).s
        assert.ok(u(s,
            "B",
            "ashe").statuses.stun)
        gm(s).status(u(s,
            "B",
            "annie"),
        "illum",
        2)
        const r = give(s,
            "A",
            skill(s,
                "lux",
                "A",
                "R"))
        const x = play(s,
            "A",
            r)
        const pops = evs(x.ev,
            "damage").filter((d) => d.tag === "effect" && d.src === "A:lux")
        assert.equal(pops.length,
            2)
    })

// ======================================================================
G("Ahri")
// ======================================================================
test("E Quyến Rũ: kéo về đối diện Ahri, lộ tay đối thủ",
    () => {
        let s = mk({
            ahri: 2
        },
        {
            jinx: 1, lux: 2
        })
        const e = give(s,
            "A",
            skill(s,
                "ahri",
                "A",
                "E"))
        const r = play(s,
            "A",
            e,
            {
                target: "B:jinx"
            })
        s = r.s
        assert.ok(u(s,
            "B",
            "jinx").statuses.charm)
        assert.equal(u(s,
            "B",
            "jinx").lane,
        2)
        assert.ok(evs(r.ev,
            "reveal").length === 1)
    })
test("Tướng bị Quyến Rũ đánh vào phe Ahri: sát thương bẻ sang đồng đội của chính nó",
    () => {
        let s = mk({
            ahri: 2
        },
        {
            jinx: 2, lux: 1
        })
        gm(s).status(u(s,
            "B",
            "jinx"),
        "charm",
        1)
        s = toTurn(s,
            "B")
        s.players.B.hand = []
        const q = give(s,
            "B",
            skill(s,
                "jinx",
                "B",
                "Q"))
        const hpAhri = u(s,
                "A",
                "ahri").hp, hpLux = u(s,
                "B",
                "lux").hp
        s = play(s,
            "B",
            q,
            {
                target: "A:ahri"
            }).s
        assert.equal(u(s,
            "A",
            "ahri").hp,
        hpAhri)
        assert.ok(u(s,
            "B",
            "lux").hp < hpLux,
        "đồng đội của Jinx nhận đòn")
    })
test("Q lên tướng bị Quyến Rũ: đối thủ bỏ 1 lá chiêu",
    () => {
        let s = mk({
            ahri: 2
        },
        {
            jinx: 2
        })
        gm(s).status(u(s,
            "B",
            "jinx"),
        "charm",
        1)
        give(s,
            "B",
            skill(s,
                "jinx",
                "B",
                "R"),
            sup(s,
                "gold"))
        const q = give(s,
            "A",
            skill(s,
                "ahri",
                "A",
                "Q"))
        s = play(s,
            "A",
            q,
            {
                target: "B:jinx"
            }).s
        assert.deepEqual(s.players.B.hand.map((c) => c.id),
            ["gold"])
        assert.ok(s.players.B.grave.some((c) => c.id === "jinx_r"))
    })

// ======================================================================
G("Annie")
// ======================================================================
test("E gọi Tibbers; đòn nhắm Annie đánh vào Tibbers và Annie Bốc Lửa",
    () => {
        let s = mk({
            annie: 2
        },
        {
            jinx: 2
        })
        const e = give(s,
            "A",
            skill(s,
                "annie",
                "A",
                "E"))
        s = play(s,
            "A",
            e).s
        const tb = s.units[s.extra.A!]
        assert.equal(tb.token?.id,
            "tibbers")
        s = toTurn(s,
            "B")
        s.players.B.hand = []
        const st = give(s,
            "B",
            sup(s,
                "basic"))
        const hp = u(s,
            "A",
            "annie").hp
        const r = play(s,
            "B",
            st,
            {
                actor: "B:jinx", target: "A:annie"
            })
        s = r.s
        assert.equal(u(s,
            "A",
            "annie").hp,
        hp)
        assert.ok(dmgTo(r.ev,
            tb.id) > 0)
        assert.equal(u(s,
            "A",
            "annie").stacks.blaze,
        1)
    })
test("Q tiêu 3 Bốc Lửa: thêm sát thương và Choáng",
    () => {
        let s = mk({
            annie: 2
        },
        {
            jinx: 2
        })
        u(s,
            "A",
            "annie").stacks.blaze = 3
        const q = give(s,
            "A",
            skill(s,
                "annie",
                "A",
                "Q"))
        s = play(s,
            "A",
            q,
            {
                target: "B:jinx"
            }).s
        assert.ok(u(s,
            "B",
            "jinx").statuses.stun)
        assert.equal(u(s,
            "A",
            "annie").stacks.blaze,
        0)
    })

// ======================================================================
G("Lissandra")
// ======================================================================
test("E Quick: tướng Buốt đánh lá thì bị Choáng, mắt xích của nó bị huỷ",
    () => {
        let s = mk({
            lissandra: 2
        },
        {
            jinx: 2
        })
        s = toTurn(s,
            "B")
        s.players.A.hand = []
        s.players.B.hand = []
        gm(s).status(u(s,
            "B",
            "jinx"),
        "chill",
        1)
        give(s,
            "A",
            skill(s,
                "lissandra",
                "A",
                "E"))
        const q = give(s,
            "B",
            skill(s,
                "jinx",
                "B",
                "Q"))
        const hp = u(s,
            "A",
            "lissandra").hp
        s = play(s,
            "B",
            q,
            {
                target: "A:lissandra"
            }).s
        assert.equal(s.phase,
            "chain")
        const ch = cg.legalActions(s,
            "A").find((a) => a.t === "chain")
        assert.ok(ch && ch.t === "chain" && ch.args?.target === "B:jinx")
        const r = act(s,
            ch)
        const done = passAll(r.s)
        const all = [...r.ev,
            ...done.ev]
        assert.ok(evs(all,
            "log").some((l) => l.text.includes("fizzles")),
        "mắt xích bị huỷ")
        assert.equal(u(done.s,
            "A",
            "lissandra").hp,
        hp)
        assert.ok(u(done.s,
            "B",
            "jinx").statuses.stun)
    })
test("E không nối được khi kẻ tung không Buốt",
    () => {
        let s = mk({
            lissandra: 2
        },
        {
            jinx: 2
        })
        s = toTurn(s,
            "B")
        s.players.A.hand = []
        s.players.B.hand = []
        give(s,
            "A",
            skill(s,
                "lissandra",
                "A",
                "E"))
        const q = give(s,
            "B",
            skill(s,
                "jinx",
                "B",
                "Q"))
        s = play(s,
            "B",
            q,
            {
                target: "A:lissandra"
            }).s
        assert.equal(s.phase,
            "main")
    })
test("R Quan Tài Băng: đồng minh bị nhắm không mất máu, kẻ tung bị Buốt",
    () => {
        let s = mk({
            lissandra: 2, annie: 1
        },
        {
            jinx: 2
        })
        s = toTurn(s,
            "B")
        s.players.A.hand = []
        s.players.B.hand = []
        give(s,
            "A",
            skill(s,
                "lissandra",
                "A",
                "R"))
        const q = give(s,
            "B",
            skill(s,
                "jinx",
                "B",
                "Q"))
        const hp = u(s,
            "A",
            "annie").hp
        s = play(s,
            "B",
            q,
            {
                target: "A:annie"
            }).s
        const ch = cg.legalActions(s,
            "A").find((a) => a.t === "chain")!
        const done = passAll(act(s,
            ch).s)
        assert.equal(u(done.s,
            "A",
            "annie").hp,
        hp)
        assert.ok(u(done.s,
            "B",
            "jinx").statuses.chill)
    })
test("Tướng địch Buốt bị hạ: lật thêm 1 lá thưởng",
    () => {
        let s = mk({
            lissandra: 2
        },
        {
            jinx: 2
        })
        gm(s).status(u(s,
            "B",
            "jinx"),
        "chill",
        1)
        u(s,
            "B",
            "jinx").hp = 1
        const q = give(s,
            "A",
            skill(s,
                "lissandra",
                "A",
                "Q"))
        const before = s.prizes.A
        s = play(s,
            "A",
            q,
            {
                target: "B:jinx"
            }).s
        assert.equal(u(s,
            "B",
            "jinx").status,
        "dead")
        assert.equal(s.prizes.A,
            before - 2)
    })

// ======================================================================
G("Gangplank")
// ======================================================================
const kegOf = (s: St) => (s.extra.A ? s.units[s.extra.A] : undefined)
function placeKeg(s: St, real: boolean): St {
    const e = give(s,
        "A",
        skill(s,
            "gangplank",
            "A",
            "E"))
    const set = give(s,
        "A",
        real ? skill(s,
            "gangplank",
            "A",
            "R") : sup(s,
            "gold"))
    return play(s,
        "A",
        e,
        {
            pick: set.uid
        }).s
}
test("E úp lá: lá Gangplank = thùng thật, lá khác = thùng giả; thùng úp mặt",
    () => {
        const s1 = placeKeg(mk({
            gangplank: 2
        },
        {
            jinx: 2
        }),
        true)
        const k1 = kegOf(s1)!
        assert.ok(k1.token?.hidden && k1.token.secret?.real === 1 && k1.token.card?.id === "gangplank_r")
        const s2 = placeKeg(mk({
            gangplank: 2
        },
        {
            jinx: 2
        }),
        false)
        assert.equal(kegOf(s2)!.token?.secret?.real,
            0)
        assert.ok(!s2.players.A.hand.some((c) => c.id === "gold"),
            "lá úp rời tay")
    })
test("Thuốc Súng +1 mỗi lượt của Gangplank; thùng tự xịt sau 3 lượt, lá úp vào mộ",
    () => {
        let s = placeKeg(mk({
            gangplank: 2
        },
        {
            jinx: 2
        }),
        true)
        const id = kegOf(s)!.id
        s = toTurn(end(s).s,
            "A")
        assert.equal(s.units[id].stacks.powder,
            1)
        s = toTurn(end(s).s,
            "A")
        assert.equal(s.units[id].stacks.powder,
            2)
        s = end(s).s
        assert.ok(!s.units[id],
            "thùng xịt")
        assert.ok(s.players.A.grave.some((c) => c.id === "gangplank_r"))
    })
test("Q bắn thùng thật: nổ lên mọi tướng địch theo Thuốc Súng; thùng giả: không gì",
    () => {
        let s = placeKeg(mk({
            gangplank: 2
        },
        {
            jinx: 2, lux: 1
        }),
        true)
        gm(s).stack(kegOf(s)!,
            "powder",
            2)
        const q = give(s,
            "A",
            skill(s,
                "gangplank",
                "A",
                "Q"))
        let r = play(s,
            "A",
            q,
            {
                pick: "keg"
            })
        assert.ok(dmgTo(r.ev,
            "B:jinx") > 0 && dmgTo(r.ev,
            "B:lux") > 0)
        assert.ok(evs(r.ev,
            "tokenFlip").length === 1)
        s = placeKeg(mk({
            gangplank: 2
        },
        {
            jinx: 2, lux: 1
        }),
        false)
        const q2 = give(s,
            "A",
            skill(s,
                "gangplank",
                "A",
                "Q"))
        r = play(s,
            "A",
            q2,
            {
                pick: "keg"
            })
        assert.equal(dmgTo(r.ev,
            "B:jinx") + dmgTo(r.ev,
            "B:lux"),
        0)
        assert.ok(r.s.players.A.grave.some((c) => c.id === "gold"),
            "lá giả vào mộ")
    })
test("Chỉ đòn Đánh thường của xạ thủ đập được thùng; đập thùng thật không nổ",
    () => {
        let s = placeKeg(mk({
            gangplank: 2
        },
        {
            jinx: 1, lux: 2
        }),
        true)
        const id = kegOf(s)!.id
        s = toTurn(s,
            "B")
        s.players.B.hand = []
        give(s,
            "B",
            sup(s,
                "basic"),
            skill(s,
                "lux",
                "B",
                "Q"))
        const plays = cg.legalActions(s,
            "B").filter((a) => a.t === "play") as Extract<Act, { t: "play" }>[]
        assert.ok(plays.some((a) => a.args?.actor === "B:jinx" && a.args.target === id),
            "xạ thủ nhắm được thùng")
        assert.ok(!plays.some((a) => a.args?.actor === "B:lux" && a.args.target === id),
            "pháp sư không nhắm được")
        assert.ok(!plays.some((a) => a.args?.targets?.includes(id) || (a.args?.target === id && !a.args.actor)),
            "chiêu không nhắm được thùng")
        const st = s.players.B.hand.find((c) => c.id === "basic")!
        const r = play(s,
            "B",
            st,
            {
                actor: "B:jinx", target: id
            })
        assert.ok(!r.s.units[id],
            "thùng vỡ")
        assert.equal(dmgTo(r.ev,
            "B:jinx") + dmgTo(r.ev,
            "B:lux"),
        0)
        assert.ok(r.s.players.A.grave.some((c) => c.id === "gangplank_r"))
    })
test("Gangplank không có lá Quick (mọi thứ trong lượt của hắn)",
    () => {
        const h = cg.getHero("gangplank")!
        assert.ok(!h.skills.Q.quick && !h.skills.E.quick && !h.skills.R.quick)
    })

// ======================================================================
G("Bot")
// ======================================================================
test("Bot tự chơi 3 ván nhóm G4 không lỗi",
    () => {
        for (let k = 0; k < 3; k++) {
            let s = cg.newGame(SEED + k,
                ["kogmaw",
                    "jinx",
                    "ashe",
                    "lux",
                    "ahri"],
                ["annie",
                    "lissandra",
                    "gangplank",
                    "lux",
                    "jinx"])
            for (let i = 0; i < 3000 && s.phase !== "over"; i++) s = cg.applyAction(s,
                cg.chooseAction(s,
                    cg.whoseMove(s))).state
        }
    })

// ======================================================================
// Bảng kết quả
// ======================================================================
let lastGroup = ""
for (const r of results) {
    if (r.group !== lastGroup) { console.log(`\n== ${r.group} ==`); lastGroup = r.group }
    console.log(`${r.res}  ${r.name}${r.note ? `\n        -> ${r.note}` : ""}`)
}
const n = (k: string) => results.filter((r) => r.res === k).length
console.log(`\nTỔNG: ${results.length} test | PASS ${n("PASS")} | FAIL ${n("FAIL")}`)
process.exit(n("FAIL") ? 1 : 0)
