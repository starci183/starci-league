// Test cơ chế chữ ký của nhóm G3 (braum, blitzcrank, leona, malphite, ornn, janna, soraka, yorick).
// Chạy: npx tsx scripts/card_tests_g3.ts [--only=chữ] [--verbose]. Khung test chép từ scripts/card_tests.ts.
import assert from "node:assert/strict"
import {
    cg, combine as cgCombine
} from "@starci/shared"
import {
    HERO_EN_G3
} from "../packages/shared/src/cardgame/i18n/en_g3"

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
const SEED = 20261029
type Setup = { A?: Record<string, number>; B?: Record<string, number>; seed?: number };
const FILL = ["garen",
    "ashe",
    "lux",
    "nami",
    "zed",
    "teemo",
    "viktor"]
/** Đội 5 tướng, đặt tướng ra sân thẳng vào đường, round 8 (mở hết đường) */
function mk(o: Setup = {
}): St {
    const a = Object.keys(o.A ?? {
        }), b = Object.keys(o.B ?? {
        })
    const fill = (x: string[]) => [...x,
        ...FILL.filter((h) => !x.includes(h))].slice(0,
        Math.max(5,
            x.length))
    const s = cg.newGame(o.seed ?? SEED,
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
    } // bỏ qua bước gọi tướng + tay đầu: test tự dựng tay
    return s
}
const gm = (s: St) => new Game(s)
const u = (s: St, side: S, hero: string) => s.units[`${side}:${hero}`]
const sup = (s: St, id: cg.SupportId, item?: string) => { const c = gm(s).supportCard(id); if (item) c.item = item; return c }
const skill = (s: St, hero: string, side: S, k: cg.SkillKey) => gm(s).skillCard(hero,
    side,
    k)
const give = (s: St, side: S, ...cards: cg.Card[]) => { s.players[side].hand.push(...cards); return cards[0] }
function act(s: St, a: Act): { s: St; ev: Ev } { const r = cg.applyAction(s,
    a); return {
    s: r.state, ev: r.events
} }
function play(s: St, side: S, card: { uid: string }, args: cg.PlayArgs = {
}) { return act(s,
    {
        t: "play", side, uid: card.uid, args
    }) }
const end = (s: St, side: S) => {
    // kết thúc lượt; lượt mới bắt đầu ở bước gọi tướng: test tự bấm "rút bài" (không gọi thêm tướng)
    const r = act(s,
        {
            t: "end", side: side
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
const toTurn = (s: St, side: S) => { while (s.active !== side) s = end(s,
    s.active).s; return s }
/** Đang có chuỗi: bên có quyền nối lá `uid` */
const chainWith = (s: St, side: S, card: { uid: string }, args: cg.PlayArgs = {
}) => act(s,
    {
        t: "chain", side, uid: card.uid, args
    })
/** Bỏ qua tới khi chuỗi giải quyết xong */
function settle(r: { s: St; ev: Ev }): { s: St; ev: Ev } {
    let { s } = r
    const ev = [...r.ev]
    for (let i = 0; s.phase === "chain" && s.chain && i < 20; i++) { const x = act(s,
        {
            t: "pass", side: s.chain.priority
        }); s = x.s; ev.push(...x.ev) }
    return {
        s, ev
    }
}
const evs = <T extends cg.GameEvent["t"]>(ev: Ev, t: T) => ev.filter((e) => e.t === t) as Extract<cg.GameEvent, { t: T }>[]
const dmgTo = (ev: Ev, target: string, tag?: string) => evs(ev,
    "damage").filter((d) => d.target === target && (!tag || d.tag === tag)).reduce((x, d) => x + d.amount,
    0)

// ======================================================================
// Tướng thử nghiệm (không phụ thuộc tướng thật)
// ======================================================================
const noSkill = (key: cg.SkillKey) => ({
    key, name: "-", desc: "-", target: "none" as const, canPlay: () => false, resolve: () => {}
})
cg.defineHero({
    id: "g3_spark", name: "G3Spark", role: "mage", damage: "magic", hp: 1000, atk: 50, armor: 30, mr: 30,
    passive: {
        name: "-", desc: "-"
    },
    skills: {
        Q: {
            key: "Q", name: "Spark", desc: "100 sát thương chuẩn lên 1 tướng địch, Choáng 1 lượt.", target: "enemy", resolve: (c) => {
                c.g.damage(c.self,
c.target!,
100,
"true",
{
    tag: "skill"
})
                c.g.status(c.target!,
                    "stun",
                    1)
            }
        },
        E: {
            key: "E", name: "Storm", desc: "100 sát thương chuẩn lên mọi tướng địch.", target: "all_enemies", resolve: (c) => { for (const t of c.g.enemies(c.self)) c.g.damage(c.self,
                t,
                100,
                "true",
                {
                    tag: "skill"
                }) }
        },
        R: noSkill("R"),
    },
})

// ======================================================================
G("Braum: bức tường phản ứng")
// ======================================================================
test("Q nối chuỗi: đòn đơn nhắm đồng minh đổi sang Braum, Braum có Khiên, rút 1 lá",
    () => {
        let s = mk({
            A: {
                g3_spark: 2
            }, B: {
                braum: 1, garen: 2
            }
        })
        const q = give(s,
            "A",
            skill(s,
                "g3_spark",
                "A",
                "Q"))
        const bq = give(s,
            "B",
            skill(s,
                "braum",
                "B",
                "Q"))
        let r = play(s,
            "A",
            q,
            {
                target: "B:garen"
            })
        assert.equal(r.s.phase,
            "chain",
            "phải mở cửa sổ nối chuỗi")
        r = settle(chainWith(r.s,
            "B",
            bq))
        s = r.s
        assert.equal(dmgTo(r.ev,
            "B:garen"),
        0,
        "Garen không bị trúng")
        assert.ok(dmgTo(r.ev,
            "B:braum") > 0,
        "Braum nhận đòn")
        assert.ok(u(s,
            "B",
            "braum").shield > 0 || evs(r.ev,
            "shield").some((e) => e.target === "B:braum"))
        assert.equal(evs(r.ev,
            "draw").filter((e) => e.side === "B").length,
        1,
        "nội tại rút 1 lá")
    })
test("Q chỉ nối chuỗi: không đánh chủ động trong lượt mình",
    () => {
        const s = mk({
            A: {
                braum: 2
            }, B: {
                garen: 2
            }
        })
        const bq = give(s,
            "A",
            skill(s,
                "braum",
                "A",
                "Q"))
        assert.ok(!cg.legalActions(s,
            "A").some((a) => a.t === "play" && a.uid === bq.uid))
    })
test("E nối chuỗi lên chiêu mọi tướng: giảm 40% sát thương",
    () => {
        const s = mk({
            A: {
                g3_spark: 2
            }, B: {
                braum: 1, garen: 2
            }
        })
        const e = give(s,
            "A",
            skill(s,
                "g3_spark",
                "A",
                "E"))
        const be = give(s,
            "B",
            skill(s,
                "braum",
                "B",
                "E"))
        const r = settle(chainWith(play(s,
            "A",
            e).s,
        "B",
        be))
        assert.equal(dmgTo(r.ev,
            "B:garen"),
        Math.round(100 * (1 + cg.RULES.mageSkillBonus) * 0.6),
        "100 chuẩn x(1 + thưởng pháp sư) x0,6")
    })
test("R nối chuỗi: đồng minh không nhận sát thương/Choáng, kẻ tung trúng sát thương + Buốt",
    () => {
        const s = mk({
            A: {
                g3_spark: 2
            }, B: {
                braum: 1, garen: 2
            }
        })
        const q = give(s,
            "A",
            skill(s,
                "g3_spark",
                "A",
                "Q"))
        const br = give(s,
            "B",
            skill(s,
                "braum",
                "B",
                "R"))
        const r = settle(chainWith(play(s,
            "A",
            q,
            {
                target: "B:garen"
            }).s,
        "B",
        br))
        assert.equal(dmgTo(r.ev,
            "B:garen"),
        0)
        assert.ok(!r.s.units["B:garen"].statuses.stun,
            "Garen không bị Choáng")
        assert.ok(dmgTo(r.ev,
            "A:g3_spark") > 0)
        assert.ok(r.s.units["A:g3_spark"].statuses.chill)
    })

// ======================================================================
G("Blitzcrank: cướp bài")
// ======================================================================
test("Q cướp lá chiêu của tướng địch: lá thành lá Đánh thường, kéo tướng đó về đối diện, +5 giáp/kháng",
    () => {
        const s = mk({
            A: {
                blitzcrank: 2
            }, B: {
                garen: 0, ashe: 2
            }
        })
        give(s,
            "B",
            skill(s,
                "garen",
                "B",
                "Q"))
        const q = give(s,
            "A",
            skill(s,
                "blitzcrank",
                "A",
                "Q"))
        const r = settle(play(s,
            "A",
            q))
        assert.equal(r.s.players.B.hand.length,
            0)
        assert.ok(r.s.players.A.hand.some((c) => c.kind === "support" && c.id === "basic"),
            "lá chiêu cướp được thành lá Đánh thường")
        assert.equal(r.s.units["B:garen"].lane,
            2,
            "Garen bị kéo về đường 3")
        assert.ok(dmgTo(r.ev,
            "B:garen") > 0)
        assert.equal(r.s.units["A:blitzcrank"].stacks.bonusRes,
            5)
    })
test("R: đối thủ bỏ 2 lá; còn ≤2 lá thì Choáng, nhiều hơn thì Câm Lặng",
    () => {
        for (const [n,
            cc] of [[5,
                "silence"],
            [4,
                "stun"]] as const) {
            const s = mk({
                A: {
                    blitzcrank: 2
                }, B: {
                    garen: 2
                }
            })
            for (let i = 0; i < n; i++) give(s,
                "B",
                sup(s,
                    "gold"))
            const rr = give(s,
                "A",
                skill(s,
                    "blitzcrank",
                    "A",
                    "R"))
            const r = settle(play(s,
                "A",
                rr))
            assert.equal(r.s.players.B.hand.length,
                n - 2)
            assert.ok(r.s.units["B:garen"].statuses[cc],
                `phải ${cc}`)
        }
    })
test("Soraka khắc Blitzcrank: lá bị ép bỏ hồi máu cho đội Soraka",
    () => {
        const s = mk({
            A: {
                blitzcrank: 2
            }, B: {
                soraka: 2, garen: 1
            }
        })
        s.units["B:garen"].hp = 300
        for (let i = 0; i < 4; i++) give(s,
            "B",
            sup(s,
                "gold"))
        const rr = give(s,
            "A",
            skill(s,
                "blitzcrank",
                "A",
                "R"))
        const r = settle(play(s,
            "A",
            rr))
        assert.equal(evs(r.ev,
            "heal").filter((h) => h.src === "B:soraka").length,
        2)
    })

// ======================================================================
G("Leona: Ánh Dương cho đồng đội kích nổ")
// ======================================================================
test("R chất 3 Ánh Dương; đồng minh đánh trúng thì nổ 3 dấu + Choáng",
    () => {
        let s = mk({
            A: {
                leona: 1, g3_spark: 2
            }, B: {
                garen: 2
            }
        })
        const rr = give(s,
            "A",
            skill(s,
                "leona",
                "A",
                "R"))
        s = settle(play(s,
            "A",
            rr,
            {
                targets: ["B:garen"]
            })).s
        assert.equal(s.units["B:garen"].statuses.sunlight?.v,
            3)
        s.units["B:garen"].statuses = {
            sunlight: s.units["B:garen"].statuses.sunlight
        }
        const g = gm(s)
        const per = g.f(s.units["A:leona"],
            "45 + 60% Giáp + 20% AP")
        const q = give(s,
            "A",
            skill(s,
                "g3_spark",
                "A",
                "Q"))
        const r = settle(play(s,
            "A",
            q,
            {
                target: "B:garen"
            }))
        const boom = evs(r.ev,
            "damage").find((d) => d.src === "A:leona" && d.target === "B:garen" && d.tag === "effect")
        assert.ok(boom,
            "phải có sát thương nổ")
        const mr = g.mr(s.units["B:garen"])
        assert.equal(boom.amount,
            Math.round(per * 3 * 100 / (100 + mr)))
        assert.ok(!r.s.units["B:garen"].statuses.sunlight)
        assert.ok(r.s.units["B:garen"].statuses.stun)
    })
test("Đòn của chính Leona không kích nổ; E đổi Leona sang đường đối diện mục tiêu",
    () => {
        const s = mk({
            A: {
                leona: 2
            }, B: {
                garen: 0
            }
        })
        const e = give(s,
            "A",
            skill(s,
                "leona",
                "A",
                "E"))
        const r = settle(play(s,
            "A",
            e,
            {
                target: "B:garen"
            }))
        assert.equal(r.s.units["A:leona"].lane,
            0)
        assert.equal(r.s.units["B:garen"].statuses.sunlight?.v,
            1)
        assert.equal(evs(r.ev,
            "damage").filter((d) => d.tag === "effect").length,
        0)
    })
test("Leona không còn lá Quick",
    () => {
        for (const k of ["Q",
            "E",
            "R"] as const) assert.ok(!cg.getHero("leona")!.skills[k].quick)
    })

// ======================================================================
G("Malphite: giáp là tất cả")
// ======================================================================
test("E nuốt 1 lá Đồ: +10 giáp/kháng vĩnh viễn, Khiên = 120% Giáp (sau khi tăng)",
    () => {
        const s = mk({
            A: {
                malphite: 2
            }, B: {
                garen: 2
            }
        })
        const comp = give(s,
            "A",
            sup(s,
                "item",
                "giap_luoi"))
        const e = give(s,
            "A",
            skill(s,
                "malphite",
                "A",
                "E"))
        const opts = cg.legalActions(s,
            "A").filter((a) => a.t === "play" && a.uid === e.uid)
        assert.equal(opts.length,
            2,
            "có lựa chọn bỏ và không bỏ")
        const before = s.units["A:malphite"].shield
        const r = settle(play(s,
            "A",
            e,
            {
                discard: [comp.uid]
            }))
        const m = r.s.units["A:malphite"]
        assert.equal(m.stacks.bonusRes,
            10)
        assert.equal(m.shield - before,
            Math.round(1.2 * gm(r.s).armor(m)))
        assert.ok(!r.s.players.A.hand.some((c) => c.uid === comp.uid))
    })
test("Nội tại: đầu lượt không có Khiên thì Khiên = 200% Giáp",
    () => {
        let s = mk({
            A: {
                malphite: 2
            }, B: {
                garen: 2
            }
        })
        s.units["A:malphite"].shield = 0
        s = toTurn(end(s,
            "A").s,
        "A")
        assert.ok(s.units["A:malphite"].shield >= Math.round(2 * gm(s).armor(s.units["A:malphite"])) - 1)
    })
test("R không thể bị nối chuỗi (Braum R trên tay không mở cửa sổ)",
    () => {
        const s = mk({
            A: {
                malphite: 2
            }, B: {
                braum: 2
            }
        })
        give(s,
            "B",
            skill(s,
                "braum",
                "B",
                "R"))
        const rr = give(s,
            "A",
            skill(s,
                "malphite",
                "A",
                "R"))
        const r = play(s,
            "A",
            rr)
        assert.equal(r.s.phase,
            "main")
        assert.ok(r.s.units["B:braum"].statuses.stun)
    })

// ======================================================================
G("Ornn: lò rèn của đội")
// ======================================================================
test("E bỏ 1 Vàng: Kiệt Tác +30% mỗi lần, tối đa +100% (gấp đôi chỉ số đồ)",
    () => {
        let s = mk({
            A: {
                ornn: 2, garen: 1
            }, B: {
                ashe: 2
            }
        })
        s.units["A:garen"].items = [findAtkItem()]
        const g0 = gm(s)
        const base = g0.stats(s.units["A:garen"]).atk
        assert.ok(base > 0,
            "cần món có AD")
        for (let i = 0; i < 4; i++) {
            give(s,
                "A",
                sup(s,
                    "gold"))
            const e = give(s,
                "A",
                skill(s,
                    "ornn",
                    "A",
                    "E"))
            s = settle(play(s,
                "A",
                e,
                {
                    target: "A:garen"
                })).s
        }
        assert.equal(s.units["A:garen"].stacks.itemAmp,
            100)
        assert.equal(Math.round(gm(s).stats(s.units["A:garen"]).atk),
            Math.round(base * 2))
        assert.equal(s.players.A.hand.filter((c) => c.id === "gold").length,
            0)
        give(s,
            "A",
            sup(s,
                "gold"))
        const e3 = give(s,
            "A",
            skill(s,
                "ornn",
                "A",
                "E"))
        assert.ok(!cg.legalActions(s,
            "A").some((a) => a.t === "play" && a.uid === e3.uid),
        "đã Kiệt Tác tối đa thì không chọn được")
    })
test("R rèn ngay 1 món cho đồng minh chưa đủ đồ; nội tại tạo lá Đồ đầu lượt",
    () => {
        let s = mk({
            A: {
                ornn: 2, garen: 1
            }, B: {
                ashe: 2
            }
        })
        const rr = give(s,
            "A",
            skill(s,
                "ornn",
                "A",
                "R"))
        s = settle(play(s,
            "A",
            rr,
            {
                targets: ["A:garen"]
            })).s
        assert.equal(s.units["A:garen"].items.length,
            1)
        s.players.A.hand = [sup(s,
            "gold")]
        s.players.A.deck = s.players.A.deck.filter((c) => c.id !== "item")
        s = toTurn(end(s,
            "A").s,
        "A")
        assert.ok(s.players.A.hand.some((c) => c.kind === "support" && c.id === "item"),
            "cầm Vàng, không có Đồ: Ornn tạo 1 lá Đồ")
    })

// ======================================================================
G("Janna: làm chủ đòn đánh")
// ======================================================================
test("Q làm Mù; đòn đánh của địch trượt và tướng bị nhắm nhận Khiên",
    () => {
        let s = mk({
            A: {
                janna: 2
            }, B: {
                braum: 2
            }
        })
        const q = give(s,
            "A",
            skill(s,
                "janna",
                "A",
                "Q"))
        s = settle(play(s,
            "A",
            q,
            {
                target: "B:braum"
            })).s
        assert.equal(s.units["B:braum"].statuses.blind?.v,
            1)
        s = toTurn(end(s,
            "A").s,
        "B")
        const sh0 = s.units["A:janna"].shield
        const basic = give(s,
            "B",
            sup(s,
                "basic"))
        const r = settle(play(s,
            "B",
            basic,
            {
                actor: "B:braum", target: "A:janna"
            }))
        assert.ok(evs(r.ev,
            "attack").some((a) => a.miss))
        assert.equal(dmgTo(r.ev,
            "A:janna"),
        0)
        assert.ok(r.s.units["A:janna"].shield > sh0)
    })
test("E: Khiên + đòn đánh miễn phí; Janna không còn lá Quick",
    () => {
        const s = mk({
            A: {
                janna: 2, garen: 1
            }, B: {
                ashe: 2
            }
        })
        const e = give(s,
            "A",
            skill(s,
                "janna",
                "A",
                "E"))
        const r = settle(play(s,
            "A",
            e,
            {
                target: "A:janna"
            }))
        assert.ok(cg.legalActions(r.s,
            "A").some((a) => a.t === "attack" && a.actor === "A:janna"))
        for (const k of ["Q",
            "E",
            "R"] as const) assert.ok(!cg.getHero("janna")!.skills[k].quick)
    })

// ======================================================================
G("Soraka: bền bài")
// ======================================================================
test("Q xáo 3 lá trên cùng mộ vào bộ, hồi mỗi lá; bộ ít hơn mộ thì rút 1",
    () => {
        const s = mk({
            A: {
                soraka: 2, garen: 1
            }, B: {
                ashe: 2
            }
        })
        s.units["A:garen"].hp = 200
        for (let i = 0; i < 5; i++) s.players.A.grave.push(sup(s,
            "gold"))
        s.players.A.deck = s.players.A.deck.slice(0,
            3)
        const q = give(s,
            "A",
            skill(s,
                "soraka",
                "A",
                "Q"))
        const r = settle(play(s,
            "A",
            q))
        assert.equal(r.s.players.A.grave.length,
            3,
            "còn 2 lá cũ + lá Q")
        assert.equal(r.s.players.A.deck.length,
            3 + 3 - 1)
        assert.equal(evs(r.ev,
            "heal").filter((h) => h.src === "A:soraka").length,
        3)
    })
test("R xáo cả mộ vào bộ; bộ dưới 10 lá thì thêm Khiên",
    () => {
        const s = mk({
            A: {
                soraka: 2
            }, B: {
                ashe: 2
            }
        })
        for (let i = 0; i < 8; i++) s.players.A.grave.push(sup(s,
            "gold"))
        s.players.A.deck = s.players.A.deck.slice(0,
            4)
        const rr = give(s,
            "A",
            skill(s,
                "soraka",
                "A",
                "R"))
        const r = settle(play(s,
            "A",
            rr))
        assert.equal(r.s.players.A.deck.length,
            12)
        assert.ok(evs(r.ev,
            "shield").some((e) => e.target === "A:soraka"))
    })

// ======================================================================
G("Yorick: linh hồn + Thây Ma Sương Mù")
// ======================================================================
test("R: máu Thây Ma theo số lá mộ, sức đánh theo Linh Hồn, ≥4 Linh Hồn thì làm máu ảo",
    () => {
        let s = mk({
            A: {
                yorick: 2
            }, B: {
                garen: 2
            }
        })
        for (let i = 0; i < 4; i++) s.players.A.grave.push(skill(s,
            "yorick",
            "A",
            "Q"))
        for (let i = 0; i < 6; i++) s.players.A.grave.push(sup(s,
            "gold"))
        const rr = give(s,
            "A",
            skill(s,
                "yorick",
                "A",
                "R"))
        s = settle(play(s,
            "A",
            rr)).s
        const w = gm(s).tokenOf("A")!
        assert.ok(w,
            "có token ở ô phụ")
        assert.equal(w.maxHp,
            150 + 20 * 10)
        assert.equal(w.token!.atk,
            30 + 10 * 4)
        assert.equal(w.token!.soak,
            true)
        assert.equal(w.stacks.turns,
            3)
    })
test("Thây Ma đánh cuối lượt, lớn thêm theo Linh Hồn, tan sau 3 lượt của bạn",
    () => {
        let s = mk({
            A: {
                yorick: 2
            }, B: {
                garen: 2
            }
        })
        s.players.A.grave.push(skill(s,
            "yorick",
            "A",
            "E"))
        const rr = give(s,
            "A",
            skill(s,
                "yorick",
                "A",
                "R"))
        s = settle(play(s,
            "A",
            rr)).s
        const id = gm(s).tokenOf("A")!.id
        const atk0 = s.units[id].token!.atk
        const r = end(s,
            "A")
        assert.ok(evs(r.ev,
            "attack").some((a) => a.attacker === id))
        s = r.s
        assert.equal(s.units[id].token!.atk,
            atk0 + 2,
            "2 Linh Hồn: lá E + chính lá R vừa vào mộ")
        assert.equal(s.units[id].stacks.turns,
            2)
        s.units["A:yorick"].hp = 99999; s.units["A:yorick"].maxHp = 99999
        s = toTurn(s,
            "A"); s = end(s,
            "A").s
        s = toTurn(s,
            "A"); s = end(s,
            "A").s
        assert.ok(!gm(s).tokenOf("A"),
            "Thây Ma đã tan")
    })
test("Q đào 2 lá bộ của mình vào mộ; lá Yorick đào lên thì hồi máu",
    () => {
        const s = mk({
            A: {
                yorick: 2
            }, B: {
                garen: 2
            }
        })
        s.units["A:yorick"].hp = 300
        s.players.A.deck.unshift(skill(s,
            "yorick",
            "A",
            "E"),
        sup(s,
            "gold"))
        const q = give(s,
            "A",
            skill(s,
                "yorick",
                "A",
                "Q"))
        const r = settle(play(s,
            "A",
            q))
        assert.equal(evs(r.ev,
            "burn").filter((b) => b.side === "A").length,
        2)
        assert.equal(evs(r.ev,
            "heal").filter((h) => h.target === "A:yorick").length,
        1)
    })

// ======================================================================
G("Bản dịch & bot")
// ======================================================================
const TOKEN: [RegExp, string][] = [[/max HP/gi,
    "máu tối đa"],
[/bonus HP/gi,
    "máu cộng thêm"],
[/\bArmor\b/g,
    "Giáp"],
[/\bMR\b/g,
    "Kháng phép"]]
const formulas = (t: string) => [...t.matchAll(/\{([^{}]+)\}/g)].map((m) => TOKEN.reduce((x, [re,
    to]) => x.replace(re,
    to),
m[1]).replace(/\s+/g,
    " ").trim().toLowerCase()).join("|")
test("EN có đủ 8 tướng và công thức khớp bản Việt",
    () => {
        for (const id of ["braum",
            "blitzcrank",
            "leona",
            "malphite",
            "ornn",
            "janna",
            "soraka",
            "yorick"]) {
            const h = cg.getHero(id)!, en = HERO_EN_G3[id]
            assert.ok(en,
                `thiếu EN ${id}`)
            assert.equal(formulas(en.passive.desc),
                formulas(h.passive.desc),
                `${id}.passive`)
            for (const k of ["Q",
                "E",
                "R"] as const) assert.equal(formulas(en.skills[k].desc),
                formulas(h.skills[k].desc),
                `${id}.${k}`)
        }
    })
test("Bot tự chơi đội G3 vs G3 200 bước không lỗi",
    () => {
        for (const seed of [1,
            2,
            3]) {
            let s = cg.newGame(seed,
                ["braum",
                    "leona",
                    "ornn",
                    "soraka",
                    "yorick"],
                ["blitzcrank",
                    "malphite",
                    "janna",
                    "garen",
                    "ashe"])
            for (let i = 0; i < 400 && s.phase !== "over"; i++) {
                const side = cg.whoseMove(s)
                s = cg.applyAction(s,
                    cg.chooseAction(s,
                        side)).state
            }
        }
    })

/** Món đồ bất kỳ có AD (để thử Kiệt Tác) */
function findAtkItem(): string {
    const comps = ["kiem_dai",
        "gay_qua_kho",
        "cung_go",
        "gang_tay",
        "giap_luoi",
        "ao_choang",
        "dai_khong_lo",
        "nuoc_mat"]
    const s = mk()
    const g = gm(s)
    const probe = s.units["A:garen"]
    for (const a of comps) for (const b of comps) {
        const id = cgCombine(a,
            b)
        if (!id) continue
        probe.items = [id]
        if (g.stats(probe).atk > 0) return id
    }
    return ""
}

// ======================================================================
// Bảng kết quả
// ======================================================================
const pad = (x: string, n: number) => (x.length >= n ? x : x + " ".repeat(n - x.length))
let lastGroup = ""
for (const r of results) {
    if (r.group !== lastGroup) { console.log(`\n== ${r.group} ==`); lastGroup = r.group }
    console.log(`${r.res}  ${pad(r.name,
        100)}${r.note ? `\n        -> ${r.note}` : ""}`)
}
const c = (k: string) => results.filter((r) => r.res === k).length
console.log(`\nTỔNG: ${results.length} test | PASS ${c("PASS")} | FAIL ${c("FAIL")}`)
process.exit(c("FAIL") ? 1 : 0)
